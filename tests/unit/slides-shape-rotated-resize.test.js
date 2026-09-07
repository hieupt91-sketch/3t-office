/**
 * VN Slides — Unit Tests: Co giãn hình khối đã xoay (Rotated Shape Resize Math)
 *
 * Kiểm tra:
 * 1. Test hồi quy (không thoái lui): shape KHÔNG xoay (rotation = 0/undefined) co giãn theo mọi hướng
 *    (8 tay cầm nw, n, ne, e, se, s, sw, w) cho kết quả số học chính xác tuyệt đối.
 * 2. Giữ Shift (keepAspect) cho 4 góc khi shape không xoay.
 * 3. Tính bất biến của góc neo (Anchor Corner Invariance): Góc neo đối diện giữ nguyên vị trí trên màn hình
 *    với mọi góc xoay (0°, 30°, 45°, 60°, 90°, 135°, 180°, 270°, -45°).
 * 4. Góc xoay 90°: Kéo tay cầm "e" (ở đáy) đi xuống -> shape.w tăng (dài xuống dưới), góc neo đỉnh cố định.
 * 5. Góc xoay 90°: Kéo tay cầm "e" sang phải màn hình (dx > 0) -> shape.w KHÔNG tăng (sửa lỗi sai trục).
 * 6. Góc xoay 90°: Kéo tay cầm "n" (ở mép phải) sang phải màn hình -> shape.h tăng (mở rộng sang phải).
 * 7. Góc xoay 45° và 135°: Chiếu vector chính xác, góc neo cố định trên màn hình.
 * 8. Giới hạn kích thước tối thiểu: newW và newH không bao giờ nhỏ hơn 20px.
 * 9. Undo / Redo: Hoàn tác và làm lại chính xác hình dạng sau co giãn.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertClose(actual, expected, tolerance = 0.001, message = "") {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "Số thực không khớp"}: nhận được ${actual}, kỳ vọng ${expected} (dung sai ±${tolerance})`);
  }
}

class FakeDomNode {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    this._className = "";
    this.dataset = {};
    const classes = new Set();
    this.classList = {
      _classes: classes,
      add: (...cls) => { cls.forEach(c => classes.add(c)); this._className = Array.from(classes).join(" "); },
      remove: (...cls) => { cls.forEach(c => classes.delete(c)); this._className = Array.from(classes).join(" "); },
      contains: (c) => classes.has(c) || this._className.split(/\s+/).includes(c),
      toggle: (c, force) => {
        const has = classes.has(c);
        const next = force !== undefined ? !!force : !has;
        if (next) classes.add(c); else classes.delete(c);
        this._className = Array.from(classes).join(" ");
        return next;
      }
    };
  }

  get className() { return this._className; }
  set className(val) {
    this._className = String(val || "");
    this.classList._classes.clear();
    this._className.split(/\s+/).filter(Boolean).forEach(c => this.classList._classes.add(c));
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(c => c !== this);
      this.parentNode = null;
    }
  }

  querySelector(selector) {
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      return this._findRecursive(el => el.classList?.contains(cls) || el.className?.split(/\s+/).includes(cls));
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const classNames = selector.split(",").map(s => s.trim().replace(/^\./, "")).filter(Boolean);
    this._findAllRecursive(el => classNames.some(cls => el.classList?.contains(cls) || el.className?.split(/\s+/).includes(cls)), results);
    return results;
  }

  _findRecursive(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._findRecursive?.(predicate);
      if (found) return found;
    }
    return null;
  }

  _findAllRecursive(predicate, results) {
    for (const child of this.children) {
      if (predicate(child)) results.push(child);
      child._findAllRecursive?.(predicate, results);
    }
  }

  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  getBoundingClientRect() {
    return { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200 };
  }

  setAttribute(k, v) { this[k] = v; }
}

function createTestCanvas() {
  const container = new FakeDomNode("div");
  const canvas = new SlidesCanvasController(container);
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = () => {};
  canvas.selectSlide = (idx) => { canvas.currentSlideIndex = idx; };
  return canvas;
}

export async function runSlidesShapeRotatedResizeTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  const oldDoc = globalThis.document;
  let docListeners = {};
  const mockDoc = {
    body: new FakeDomNode("body"),
    createElement: (tag) => new FakeDomNode(tag),
    addEventListener: (evt, fn) => { (docListeners[evt] ||= []).push(fn); },
    removeEventListener: (evt, fn) => {
      if (docListeners[evt]) docListeners[evt] = docListeners[evt].filter(f => f !== fn);
    }
  };
  globalThis.document = mockDoc;

  const simulateDrag = (canvas, shape, dir, deltaX, deltaY, shiftKey = false) => {
    const shapeEl = new FakeDomNode("div");
    const handleEl = new FakeDomNode("div");
    canvas._attachResizeHandle(handleEl, shapeEl, shape, dir);

    const startX = 200;
    const startY = 200;

    // pointerdown
    handleEl.listeners["pointerdown"][0]({
      clientX: startX,
      clientY: startY,
      stopPropagation() {},
      preventDefault() {}
    });

    // pointermove
    const moveFn = docListeners["pointermove"]?.[docListeners["pointermove"].length - 1];
    if (moveFn) {
      moveFn({
        clientX: startX + deltaX,
        clientY: startY + deltaY,
        shiftKey
      });
    }

    // pointerup
    const upFn = docListeners["pointerup"]?.[docListeners["pointerup"].length - 1];
    if (upFn) upFn();

    return { shape, shapeEl };
  };

  try {
    // 1. Test hồi quy cho hình không xoay (rotation = undefined)
    test("Hồi quy: Hình không xoay (rotation = undefined) co giãn 8 hướng cho kết quả khớp chuẩn", () => {
      const canvas = createTestCanvas();

      // e: kéo sang phải +30
      {
        const s = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "e", 30, 0);
        assert(s.x === 100 && s.y === 100 && s.w === 230 && s.h === 100, `dir 'e': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // s: kéo xuống +20
      {
        const s = { id: "s2", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "s", 0, 20);
        assert(s.x === 100 && s.y === 100 && s.w === 200 && s.h === 120, `dir 's': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // w: kéo sang phải +30 (thu nhỏ từ mép trái)
      {
        const s = { id: "s3", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "w", 30, 0);
        assert(s.x === 130 && s.y === 100 && s.w === 170 && s.h === 100, `dir 'w': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // n: kéo xuống +20 (thu nhỏ từ mép trên)
      {
        const s = { id: "s4", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "n", 0, 20);
        assert(s.x === 100 && s.y === 120 && s.w === 200 && s.h === 80, `dir 'n': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // se: kéo sang phải +40, xuống +30
      {
        const s = { id: "s5", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "se", 40, 30);
        assert(s.x === 100 && s.y === 100 && s.w === 240 && s.h === 130, `dir 'se': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // nw: kéo sang trái -30, lên -20 (mở rộng về góc trên trái)
      {
        const s = { id: "s6", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "nw", -30, -20);
        assert(s.x === 70 && s.y === 80 && s.w === 230 && s.h === 120, `dir 'nw': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // ne: kéo sang phải +20, lên -15
      {
        const s = { id: "s7", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "ne", 20, -15);
        assert(s.x === 100 && s.y === 85 && s.w === 220 && s.h === 115, `dir 'ne': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }

      // sw: kéo sang trái -25, xuống +25
      {
        const s = { id: "s8", type: "rect", x: 100, y: 100, w: 200, h: 100 };
        simulateDrag(canvas, s, "sw", -25, 25);
        assert(s.x === 75 && s.y === 100 && s.w === 225 && s.h === 125, `dir 'sw': nhận x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);
      }
    });

    // 2. Test keepAspect với Shift khi không xoay
    test("Hồi quy: Giữ Shift (keepAspect) khi không xoay giữ đúng tỷ lệ ban đầu", () => {
      const canvas = createTestCanvas();
      // w=200, h=100 -> aspect = 2
      const s = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };
      // kéo se sang phải +40 -> newW = 240, newH phải là round(240 / 2) = 120
      simulateDrag(canvas, s, "se", 40, 999, true);
      assert(s.w === 240, `newW phải là 240, nhận được: ${s.w}`);
      assert(s.h === 120, `newH phải tỷ lệ với aspect=2 (120), nhận được: ${s.h}`);
      assert(s.x === 100 && s.y === 100, "Góc trên-trái (nw) phải giữ cố định");
    });

    // 3. Tính bất biến của góc neo trên màn hình (Anchor Invariance across Angles)
    test("Anchor Invariance: Góc neo trên màn hình cố định tuyệt đối ở các góc xoay (30°, 45°, 60°, 90°, 135°, 180°, 270°)", () => {
      const canvas = createTestCanvas();
      const testAngles = [0, 30, 45, 60, 90, 135, 180, 270, -45];
      const directions = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
      const anchorOffsetMap = {
        nw: [1, 1], n: [0, 1], ne: [-1, 1], e: [-1, 0],
        se: [-1, -1], s: [0, -1], sw: [1, -1], w: [1, 0]
      };

      for (const angle of testAngles) {
        for (const dir of directions) {
          const origX = 250, origY = 200, origW = 160, origH = 100;
          const s = { id: "test", type: "rect", x: origX, y: origY, w: origW, h: origH, rotation: angle };

          const theta = (angle || 0) * Math.PI / 180;
          const cosT = Math.cos(theta), sinT = Math.sin(theta);
          const [ox, oy] = anchorOffsetMap[dir];

          // Vị trí góc neo TRƯỚC khi kéo trên màn hình:
          const oldCenterX = origX + origW / 2;
          const oldCenterY = origY + origH / 2;
          const anchorLocalX = oldCenterX + ox * (origW / 2);
          const anchorLocalY = oldCenterY + oy * (origH / 2);
          const anchorOffsetX = anchorLocalX - oldCenterX;
          const anchorOffsetY = anchorLocalY - oldCenterY;
          const expectedScreenX = oldCenterX + (anchorOffsetX * cosT - anchorOffsetY * sinT);
          const expectedScreenY = oldCenterY + (anchorOffsetX * sinT + anchorOffsetY * cosT);

          // Kéo delta ngẫu nhiên/hợp lý
          simulateDrag(canvas, s, dir, 35, 25);

          // Vị trí góc neo SAU khi kéo trên màn hình:
          const newCenterX = s.x + s.w / 2;
          const newCenterY = s.y + s.h / 2;
          const newAnchorOffsetX = ox * (s.w / 2);
          const newAnchorOffsetY = oy * (s.h / 2);
          const actualScreenX = newCenterX + (newAnchorOffsetX * cosT - newAnchorOffsetY * sinT);
          const actualScreenY = newCenterY + (newAnchorOffsetX * sinT + newAnchorOffsetY * cosT);

          assertClose(actualScreenX, expectedScreenX, 0.001, `Góc neo X bị lệch ở góc ${angle}° dir ${dir}`);
          assertClose(actualScreenY, expectedScreenY, 0.001, `Góc neo Y bị lệch ở góc ${angle}° dir ${dir}`);
        }
      }
    });

    // 4. Góc xoay 90°: Kéo tay cầm 'e' đi xuống -> shape.w tăng
    test("Góc 90°: Kéo tay cầm 'e' (ở đáy màn hình) đi xuống (+Y) -> shape.w tăng đúng trục cục bộ", () => {
      const canvas = createTestCanvas();
      // rotation = 90
      // Handle 'e' ở trục cục bộ +X, khi xoay 90° nằm ở phía đáy màn hình (+Y).
      const s = { id: "s90-1", type: "rect", x: 200, y: 150, w: 160, h: 100, rotation: 90 };
      // Kéo chuột xuống +40 (dy = 40, dx = 0)
      simulateDrag(canvas, s, "e", 0, 40);

      // localDx = dx * cos(90) + dy * sin(90) = 0*0 + 40*1 = 40
      // localDy = -dx * sin(90) + dy * cos(90) = 0
      // newW = origW + localDx = 160 + 40 = 200
      // newH = origH = 100
      assert(s.w === 200, `shape.w phải tăng từ 160 lên 200, nhận được: ${s.w}`);
      assert(s.h === 100, `shape.h phải giữ nguyên 100, nhận được: ${s.h}`);
    });

    // 5. Góc xoay 90°: Kéo tay cầm 'e' sang phải màn hình -> KHÔNG làm tăng shape.w (sửa lỗi sai trục)
    test("Góc 90°: Kéo tay cầm 'e' sang phải màn hình (dx > 0) -> shape.w KHÔNG tăng (không phình dọc)", () => {
      const canvas = createTestCanvas();
      const s = { id: "s90-2", type: "rect", x: 200, y: 150, w: 160, h: 100, rotation: 90 };
      // Kéo chuột sang phải +50 (dx = 50, dy = 0)
      simulateDrag(canvas, s, "e", 50, 0);

      // localDx = dx * cos(90) + dy * sin(90) = 50*0 + 0*1 = 0
      // newW = origW + localDx = 160 + 0 = 160!
      // Ở code cũ bị lỗi: newW = 160 + 50 = 210 (làm hình dài thêm về phía dưới dù kéo ngang)
      assert(s.w === 160, `shape.w phải giữ nguyên 160 khi kéo ngang tay cầm đáy, nhận được: ${s.w}`);
    });

    // 6. Góc xoay 90°: Kéo tay cầm 'n' (ở mép phải) sang phải màn hình -> shape.h tăng (mở rộng sang phải)
    test("Góc 90°: Kéo tay cầm 'n' (ở mép phải màn hình) sang phải (dx > 0) -> shape.h tăng", () => {
      const canvas = createTestCanvas();
      const s = { id: "s90-3", type: "rect", x: 200, y: 150, w: 160, h: 100, rotation: 90 };
      // Tay cầm 'n' ở trục cục bộ -Y. Khi xoay 90°, hướng -Y nằm ở bên phải màn hình (+X).
      // Kéo sang phải +30 (dx = 30, dy = 0)
      simulateDrag(canvas, s, "n", 30, 0);

      // localDy = -dx * sin(90) + dy * cos(90) = -30*1 + 0 = -30
      // newH = origH - localDy = 100 - (-30) = 130
      assert(s.h === 130, `shape.h phải tăng từ 100 lên 130 (rộng sang phải), nhận được: ${s.h}`);
      assert(s.w === 160, `shape.w phải giữ nguyên 160, nhận được: ${s.w}`);
    });

    // 7. Góc 45° và 135°: Chiếu vector chính xác
    test("Góc 45°: Kéo góc 'se' theo hướng 45° tăng kích thước đều, góc neo nw giữ cố định", () => {
      const canvas = createTestCanvas();
      const s = { id: "s45", type: "rect", x: 200, y: 150, w: 100, h: 100, rotation: 45 };

      // Kéo dx = 40, dy = 40 (hướng 45° màn hình)
      // cos(45) = sin(45) = 1/sqrt(2) ~ 0.7071
      // localDx = 40 * cos45 + 40 * sin45 = 80 * 0.7071 ~ 56.568
      // localDy = -40 * sin45 + 40 * cos45 = 0
      simulateDrag(canvas, s, "se", 40, 40);

      assertClose(s.w, 100 + 40 * Math.SQRT2, 0.01, "newW ở góc 45°");
      assertClose(s.h, 100, 0.01, "newH ở góc 45° khi kéo theo trục local X");
    });

    // 8. Giới hạn kích thước tối thiểu 20px
    test("Giới hạn: Co giãn thu nhỏ không bao giờ khiến newW hoặc newH nhỏ hơn 20px", () => {
      const canvas = createTestCanvas();
      const s = { id: "s-min", type: "rect", x: 200, y: 200, w: 100, h: 80, rotation: 60 };
      // Thu nhỏ cực mạnh
      simulateDrag(canvas, s, "se", -500, -500);

      assert(s.w >= 20, `newW (${s.w}) phải >= 20`);
      assert(s.h >= 20, `newH (${s.h}) phải >= 20`);
    });

    // 9. Undo / Redo
    test("Undo / Redo cho thao tác co giãn hình đã xoay", () => {
      const canvas = createTestCanvas();
      const slide = canvas.slides[0];
      const s = { id: "s-undo", type: "rect", x: 200, y: 150, w: 160, h: 100, rotation: 45 };
      slide.shapes = [s];

      simulateDrag(canvas, s, "se", 30, 20);
      const afterW = s.w;
      const afterH = s.h;
      assert(afterW !== 160, "Hình phải được thay đổi kích thước");

      // Undo -> khôi phục x, y, w, h ban đầu
      canvas.undo();
      assert(s.w === 160 && s.h === 100 && s.x === 200 && s.y === 150, `Sau Undo: x=${s.x}, y=${s.y}, w=${s.w}, h=${s.h}`);

      // Redo -> khôi phục kích thước sau kéo
      canvas.redo();
      assert(s.w === afterW && s.h === afterH, `Sau Redo: w=${s.w}, h=${s.h}`);
    });
  } finally {
    globalThis.document = oldDoc;
  }

  return results;
}
