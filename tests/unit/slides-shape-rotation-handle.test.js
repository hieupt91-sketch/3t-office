/**
 * VN Slides — Tay cầm xoay tương tác (rotation handle) cho hình khối / ảnh.
 *
 * Kiểm tra:
 * 1. _ensureShapeSelectionHandles gắn đủ .vno-shape-rotate-handle và .vno-shape-rotate-stem.
 * 2. _removeShapeSelectionHandles dọn sạch tay cầm và cần xoay.
 * 3. _attachRotateHandle:
 *    - Kéo chuột tính đúng góc atan2 (+90° bù trừ vị trí đỉnh).
 *    - Giữ Shift snap về bội số 15°.
 *    - Gần 0° (hoặc 360°) xóa shape.rotation (về undefined).
 * 4. Undo / Redo cho action "shape-rotate":
 *    - Undo khôi phục đúng góc ban đầu (kể cả undefined).
 *    - Redo khôi phục góc mới.
 * 5. resetShapeRotation():
 *    - Đặt lại góc về 0/undefined, lưu vào undo stack.
 *    - Undo khôi phục góc xoay trước đó.
 * 6. _shapePresentationHtml() xuất transform:rotate(...) khi hình có góc xoay.
 */
import { SlidesCanvasController, cursorForHandle, CURSOR_CYCLE, BASE_ANGLE } from "../../apps/slides/slides-canvas.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

export async function runSlidesShapeRotationHandleTests() {
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
  const docListeners = {};
  const mockDoc = {
    body: new FakeDomNode("body"),
    createElement: (tag) => new FakeDomNode(tag),
    addEventListener: (evt, fn) => { (docListeners[evt] ||= []).push(fn); },
    removeEventListener: (evt, fn) => {
      if (docListeners[evt]) docListeners[evt] = docListeners[evt].filter(f => f !== fn);
    }
  };
  globalThis.document = mockDoc;

  const triggerMove = (evt) => {
    const fn = docListeners["pointermove"]?.[docListeners["pointermove"].length - 1];
    if (fn) fn(evt);
  };
  const triggerUp = () => {
    const fn = docListeners["pointerup"]?.[docListeners["pointerup"].length - 1];
    if (fn) fn();
  };

  try {
    test("_ensureShapeSelectionHandles: tạo đủ tay cầm xoay (.vno-shape-rotate-handle) và cần (.vno-shape-rotate-stem)", () => {
      const canvas = createTestCanvas();
      const el = new FakeDomNode("div");
      const shape = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };
      canvas._ensureShapeSelectionHandles(el, shape);

      const stem = el.querySelector(".vno-shape-rotate-stem");
      const handle = el.querySelector(".vno-shape-rotate-handle");
      assert(stem, "Phải tạo phần tử .vno-shape-rotate-stem");
      assert(handle, "Phải tạo phần tử .vno-shape-rotate-handle");
      assert(handle.title && handle.title.includes("Xoay"), "Tay cầm xoay phải có tooltip hướng dẫn");
    });

    test("_ensureShapeSelectionHandles: không tạo tay cầm xoay cho connector", () => {
      const canvas = createTestCanvas();
      const el = new FakeDomNode("div");
      const shape = { id: "c1", type: "connector", x1: 0, y1: 0, x2: 100, y2: 100 };
      canvas._ensureShapeSelectionHandles(el, shape);

      assert(!el.querySelector(".vno-shape-rotate-handle"), "Connector không được có tay cầm xoay");
    });

    test("_removeShapeSelectionHandles: dọn dẹp sạch cả tay cầm và cần xoay", () => {
      const canvas = createTestCanvas();
      const el = new FakeDomNode("div");
      const shape = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };
      canvas._ensureShapeSelectionHandles(el, shape);
      assert(el.querySelector(".vno-shape-rotate-handle"), "Phải có tay cầm trước khi xóa");

      canvas._removeShapeSelectionHandles(el);
      assert(!el.querySelector(".vno-shape-rotate-handle"), "Tay cầm xoay phải được gỡ bỏ");
      assert(!el.querySelector(".vno-shape-rotate-stem"), "Cần xoay phải được gỡ bỏ");
    });

    test("_attachRotateHandle: kéo chuột tính đúng góc atan2 và cập nhật shape.rotation", () => {
      const canvas = createTestCanvas();
      const shapeEl = new FakeDomNode("div");
      const handleEl = new FakeDomNode("div");
      const shape = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };

      canvas._attachRotateHandle(handleEl, shapeEl, shape);

      // Tâm shape: left:100, top:100, width:200, height:100 -> center=(200, 150)
      // 1. pointerdown
      handleEl.listeners["pointerdown"][0]({
        stopPropagation() {},
        preventDefault() {}
      });

      // 2. pointermove: chuột ở vị trí (300, 150) -> dx = 100, dy = 0 (hướng 3 giờ / góc phải)
      // atan2(0, 100) = 0 rad = 0°. +90° = 90° xuôi kim đồng hồ.
      triggerMove({
        clientX: 300,
        clientY: 150,
        shiftKey: false
      });

      assert(shape.rotation === 90, `Kéo sang phải phải cho góc 90°, thực tế: ${shape.rotation}`);
      assert(shapeEl.style.transform === "rotate(90deg)", `CSS transform phải là rotate(90deg), thực tế: ${shapeEl.style.transform}`);

      // 3. pointerup: kết thúc và lưu undo
      triggerUp();
      const lastUndo = canvas.undoStack[canvas.undoStack.length - 1];
      assert(lastUndo && lastUndo.type === "shape-rotate", "Undo stack phải ghi nhận action shape-rotate");
      assert(lastUndo.from === undefined, "from ban đầu phải là undefined");
      assert(lastUndo.to === 90, "to phải là 90");
    });

    test("_attachRotateHandle: giữ Shift SNAP về bội số 15° (PowerPoint parity)", () => {
      const canvas = createTestCanvas();
      const shapeEl = new FakeDomNode("div");
      const handleEl = new FakeDomNode("div");
      const shape = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100 };

      canvas._attachRotateHandle(handleEl, shapeEl, shape);

      // Tâm: (200, 150)
      handleEl.listeners["pointerdown"][0]({ stopPropagation() {}, preventDefault() {} });

      // Chuột ở (250, 78): dx = 50, dy = -72
      // atan2(-72, 50) = -55.2° -> +90° = 34.8°
      // Shift snap: Math.round(34.8 / 15) * 15 = 30°
      triggerMove({
        clientX: 250,
        clientY: 78,
        shiftKey: true
      });

      assert(shape.rotation === 30, `Shift snap 34.8° phải về 30°, thực tế: ${shape.rotation}`);
      triggerUp();
    });

    test("_attachRotateHandle: kéo về gần 0° tự động xóa trường shape.rotation (về undefined)", () => {
      const canvas = createTestCanvas();
      const shapeEl = new FakeDomNode("div");
      const handleEl = new FakeDomNode("div");
      const shape = { id: "s1", type: "rect", x: 100, y: 100, w: 200, h: 100, rotation: 45 };

      canvas._attachRotateHandle(handleEl, shapeEl, shape);

      // Tâm: (200, 150). Kéo lên thẳng đứng: (200, 50) -> dx = 0, dy = -100
      // atan2(-100, 0) = -90° -> +90° = 0°
      handleEl.listeners["pointerdown"][0]({ stopPropagation() {}, preventDefault() {} });
      triggerMove({
        clientX: 200,
        clientY: 50,
        shiftKey: false
      });

      assert(shape.rotation === undefined, `Kéo về thẳng đứng (0°) shape.rotation phải là undefined, thực tế: ${shape.rotation}`);
      assert(shapeEl.style.transform === "", "CSS transform phải được xóa rỗng khi góc là 0");
      triggerUp();
    });

    test("Undo / Redo action 'shape-rotate': khôi phục góc xoay và xóa trường khi undo về ban đầu", () => {
      const canvas = createTestCanvas();
      const slide = canvas.slides[0];
      const shape = { id: "s1", type: "rect", x: 50, y: 50, w: 100, h: 80 };
      slide.shapes = [shape];

      // Ban đầu không xoay (shape.rotation === undefined)
      // Thực hiện xoay thành 60°
      shape.rotation = 60;
      canvas.undoStack.push({
        type: "shape-rotate",
        slideIndex: 0,
        shapeId: "s1",
        from: undefined,
        to: 60
      });

      // Undo -> phải khôi phục về undefined
      const undone = canvas.undo();
      assert(undone === true, "undo() phải trả về true");
      assert(shape.rotation === undefined, `Sau undo, shape.rotation phải về undefined, thực tế: ${shape.rotation}`);

      // Redo -> phải khôi phục lại 60°
      const redone = canvas.redo();
      assert(redone === true, "redo() phải trả về true");
      assert(shape.rotation === 60, `Sau redo, shape.rotation phải là 60, thực tế: ${shape.rotation}`);
    });

    test("resetShapeRotation(): đặt lại góc xoay về undefined và hỗ trợ Undo khôi phục", () => {
      const canvas = createTestCanvas();
      const slide = canvas.slides[0];
      const shape = { id: "s1", type: "rect", x: 50, y: 50, w: 100, h: 80, rotation: 45 };
      slide.shapes = [shape];

      const resetSuccess = canvas.resetShapeRotation("s1");
      assert(resetSuccess === true, "resetShapeRotation phải trả về true khi shape có rotation");
      assert(shape.rotation === undefined, "Sau khi reset, shape.rotation phải bị xóa (undefined)");

      // Undo reset -> khôi phục lại 45°
      canvas.undo();
      assert(shape.rotation === 45, `Undo resetShapeRotation phải khôi phục lại 45°, thực tế: ${shape.rotation}`);
    });

    test("_shapePresentationHtml: xuất CSS transform:rotate khi hình có góc xoay", () => {
      const canvas = createTestCanvas();
      const shapeRotated = { id: "s1", type: "rect", x: 10, y: 20, w: 100, h: 80, rotation: 35 };
      const htmlRotated = canvas._shapePresentationHtml(shapeRotated);
      assert(htmlRotated.includes("transform:rotate(35deg)"), `HTML trình chiếu phải có transform:rotate(35deg), thực tế: ${htmlRotated}`);

      const shapePlain = { id: "s2", type: "rect", x: 10, y: 20, w: 100, h: 80 };
      const htmlPlain = canvas._shapePresentationHtml(shapePlain);
      assert(!htmlPlain.includes("transform:rotate"), "Hình không xoay không được chứa transform:rotate trong HTML trình chiếu");
    });

    test("cursorForHandle: tính đúng con trỏ CSS cho 8 hướng ở mọi góc xoay", () => {
      // 0° (không xoay)
      assert(cursorForHandle("n", 0) === "ns-resize", "0° n phải là ns-resize");
      assert(cursorForHandle("ne", 0) === "nesw-resize", "0° ne phải là nesw-resize");
      assert(cursorForHandle("e", 0) === "ew-resize", "0° e phải là ew-resize");
      assert(cursorForHandle("se", 0) === "nwse-resize", "0° se phải là nwse-resize");
      assert(cursorForHandle("s", 0) === "ns-resize", "0° s phải là ns-resize");
      assert(cursorForHandle("sw", 0) === "nesw-resize", "0° sw phải là nesw-resize");
      assert(cursorForHandle("w", 0) === "ew-resize", "0° w phải là ew-resize");
      assert(cursorForHandle("nw", 0) === "nwse-resize", "0° nw phải là nwse-resize");
      assert(cursorForHandle("n", undefined) === "ns-resize", "undefined rotation phải giống 0°");

      // 90° (xoay vuông góc)
      // Cạnh 'n' ban đầu quay sang cạnh phải màn hình -> hiển thị ew-resize
      assert(cursorForHandle("n", 90) === "ew-resize", "90° n phải chuyển thành ew-resize");
      // Cạnh 'e' ban đầu quay xuống cạnh đáy màn hình -> hiển thị ns-resize
      assert(cursorForHandle("e", 90) === "ns-resize", "90° e phải chuyển thành ns-resize");
      assert(cursorForHandle("ne", 90) === "nwse-resize", "90° ne phải chuyển thành nwse-resize");
      assert(cursorForHandle("se", 90) === "nesw-resize", "90° se phải chuyển thành nesw-resize");
      assert(cursorForHandle("s", 90) === "ew-resize", "90° s phải chuyển thành ew-resize");
      assert(cursorForHandle("w", 90) === "ns-resize", "90° w phải chuyển thành ns-resize");

      // 45° và 135°
      assert(cursorForHandle("n", 45) === "nesw-resize", "45° n phải là nesw-resize");
      assert(cursorForHandle("e", 45) === "nwse-resize", "45° e phải là nwse-resize");
      assert(cursorForHandle("n", 135) === "nwse-resize", "135° n phải là nwse-resize");
      assert(cursorForHandle("e", 135) === "nesw-resize", "135° e phải là nesw-resize");

      // 180° và 270°
      assert(cursorForHandle("n", 180) === "ns-resize", "180° n đối xứng phải là ns-resize");
      assert(cursorForHandle("n", 270) === "ew-resize", "270° n phải là ew-resize");

      // Góc âm (-90°)
      assert(cursorForHandle("n", -90) === "ew-resize", "-90° n phải là ew-resize");
      assert(cursorForHandle("e", -90) === "ns-resize", "-90° e phải là ns-resize");
    });

    test("_ensureShapeSelectionHandles: gán cursor động và xoay ngược nút xóa theo shape.rotation", () => {
      const canvas = createTestCanvas();

      // Hình không xoay (0°)
      const el0 = new FakeDomNode("div");
      const shape0 = { id: "s0", type: "rect", x: 100, y: 100, w: 200, h: 100 };
      canvas._ensureShapeSelectionHandles(el0, shape0);

      const delBtn0 = el0.querySelector(".vno-shape-delete-btn");
      assert(delBtn0, "Phải có nút xóa .vno-shape-delete-btn");
      assert(!delBtn0.style.transform, "Hình 0° nút xóa không có transform");

      const handleN0 = el0.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "n");
      const handleE0 = el0.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "e");
      assert(handleN0.style.cursor === "ns-resize", `Handle 'n' của hình 0° phải có cursor ns-resize, thực tế: ${handleN0.style.cursor}`);
      assert(handleE0.style.cursor === "ew-resize", `Handle 'e' của hình 0° phải có cursor ew-resize, thực tế: ${handleE0.style.cursor}`);

      // Hình xoay 90°
      const el90 = new FakeDomNode("div");
      const shape90 = { id: "s90", type: "rect", x: 100, y: 100, w: 200, h: 100, rotation: 90 };
      canvas._ensureShapeSelectionHandles(el90, shape90);

      const delBtn90 = el90.querySelector(".vno-shape-delete-btn");
      assert(delBtn90.style.transform === "rotate(-90deg)", `Nút xóa phải có transform: rotate(-90deg), thực tế: ${delBtn90.style.transform}`);

      const handleN90 = el90.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "n");
      const handleE90 = el90.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "e");
      assert(handleN90.style.cursor === "ew-resize", `Handle 'n' của hình 90° phải có cursor ew-resize, thực tế: ${handleN90.style.cursor}`);
      assert(handleE90.style.cursor === "ns-resize", `Handle 'e' của hình 90° phải có cursor ns-resize, thực tế: ${handleE90.style.cursor}`);
    });

    test("_attachRotateHandle: cập nhật cursor 8 tay cầm và nút xóa trong thời gian thực khi kéo", () => {
      const canvas = createTestCanvas();
      const shapeEl = new FakeDomNode("div");
      const shape = { id: "s-rot-live", type: "rect", x: 100, y: 100, w: 200, h: 100 };

      // Tạo các handle và delete button trên shapeEl
      canvas._ensureShapeSelectionHandles(shapeEl, shape);

      const rotateHandle = shapeEl.querySelector(".vno-shape-rotate-handle");
      const delBtn = shapeEl.querySelector(".vno-shape-delete-btn");
      const handleN = shapeEl.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "n");
      const handleE = shapeEl.querySelectorAll(".vno-shape-resize-handle").find(h => h.dataset.handleDir === "e");

      // Tâm shape: center=(200, 150)
      // 1. pointerdown
      rotateHandle.listeners["pointerdown"][0]({
        stopPropagation() {},
        preventDefault() {}
      });

      // 2. pointermove tới vị trí góc 90° (dx = 100, dy = 0) -> Math.atan2(0, 100) + 90° = 90°
      triggerMove({ clientX: 300, clientY: 150, shiftKey: false });

      assert(shape.rotation === 90, `shape.rotation phải là 90, thực tế: ${shape.rotation}`);
      assert(shapeEl.style.transform === "rotate(90deg)", "shapeEl phải transform rotate(90deg)");
      assert(delBtn.style.transform === "rotate(-90deg)", `delBtn phải được xoay ngược rotate(-90deg), thực tế: ${delBtn.style.transform}`);
      assert(handleN.style.cursor === "ew-resize", `Handle 'n' phải cập nhật thời gian thực thành ew-resize, thực tế: ${handleN.style.cursor}`);
      assert(handleE.style.cursor === "ns-resize", `Handle 'e' phải cập nhật thời gian thực thành ns-resize, thực tế: ${handleE.style.cursor}`);

      // 3. pointermove về gần 0° (dx = 0, dy = -100) -> atan2(-100, 0) + 90° = 0°
      triggerMove({ clientX: 200, clientY: 50, shiftKey: false });
      assert(shape.rotation === undefined, "shape.rotation phải là undefined khi về 0°");
      assert(delBtn.style.transform === "", `delBtn transform phải được xóa khi về 0°, thực tế: ${delBtn.style.transform}`);
      assert(handleN.style.cursor === "ns-resize", `Handle 'n' phải khôi phục về ns-resize, thực tế: ${handleN.style.cursor}`);

      // 4. pointerup
      triggerUp();
    });

    test("_attachRotateHandle: hiển thị tooltip góc xoay (.vno-shape-rotate-tooltip) trong lúc kéo và dọn dẹp khi nhả chuột", () => {
      const canvas = createTestCanvas();
      const shapeEl = new FakeDomNode("div");
      const shape = { id: "s-rot-tip", type: "rect", x: 100, y: 100, w: 200, h: 100 };
      canvas._ensureShapeSelectionHandles(shapeEl, shape);

      const rotateHandle = shapeEl.querySelector(".vno-shape-rotate-handle");
      assert(rotateHandle, "Phải có rotateHandle");

      // Trước khi kéo: chưa có tooltip
      assert(!shapeEl.querySelector(".vno-shape-rotate-tooltip"), "Chưa kéo không được có tooltip");

      // 1. pointerdown
      rotateHandle.listeners["pointerdown"][0]({ stopPropagation() {}, preventDefault() {} });
      const tooltipDown = shapeEl.querySelector(".vno-shape-rotate-tooltip");
      assert(tooltipDown, "pointerdown phải tạo .vno-shape-rotate-tooltip");
      assert(tooltipDown.textContent === "0°", `Tooltip ban đầu phải là 0°, thực tế: ${tooltipDown.textContent}`);

      // 2. pointermove tới 90°
      triggerMove({ clientX: 300, clientY: 150, shiftKey: false });
      assert(tooltipDown.textContent === "90°", `Tooltip sau khi xoay 90° phải là 90°, thực tế: ${tooltipDown.textContent}`);
      assert(tooltipDown.style.transform === "translateX(-50%) rotate(-90deg)", `Tooltip phải được counter-rotate, thực tế: ${tooltipDown.style.transform}`);

      // 3. pointermove giữ Shift snap về 45°
      // atan2(100, 100) = 45° -> +90° = 135°
      triggerMove({ clientX: 300, clientY: 250, shiftKey: true });
      assert(tooltipDown.textContent === "135°", `Tooltip khi snap Shift 135° phải là 135°, thực tế: ${tooltipDown.textContent}`);

      // 4. pointerup -> tooltip được dọn sạch
      triggerUp();
      assert(!shapeEl.querySelector(".vno-shape-rotate-tooltip"), "Sau pointerup tooltip phải được gỡ bỏ");
    });
  } finally {
    globalThis.document = oldDoc;
  }

  return results;
}
