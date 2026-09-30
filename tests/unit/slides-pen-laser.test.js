/**
 * Unit tests — Slides Pen and Laser pointer in F5 presentation mode.
 * PowerPoint parity: Ctrl+P (Pen), Ctrl+L (Laser), Ctrl+A (Arrow), E (Erase ink).
 * Pen color selection in Setup Show & context menu.
 * Keep/Discard ink dialog on show exit -> save ink as shapes on slides & serialize to FODP/PPTX.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { t, setLocale } from "../../platform/i18n/i18n.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter((v) => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.hidden = false;
    this._innerHTML = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    if (String(value).includes("vno-dialog-close-btn") || String(value).includes("vno-setup-show-title")) {
      const close = new FakeElement("button");
      close.className = "vno-dialog-close-btn";
      this.appendChild(close);
    }
    ["vno-setup-loop", "vno-setup-narration", "vno-setup-pointer-color", "vno-setup-ok", "vno-setup-cancel", "vno-setup-pointer-hex", "vno-ink-keep-btn", "vno-ink-discard-btn"].forEach((id) => {
      if (String(value).includes(`id="${id}"`)) {
        const el = new FakeElement(id.includes("color") ? "input" : "button");
        el.id = id;
        el.attributes.id = id;
        this.appendChild(el);
      }
    });
  }
  get innerHTML() { return this._innerHTML || ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    if (child) child.parentNode = null;
    return child;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter((h) => h !== handler); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const match = (el) => {
      if (selector.startsWith(".")) return el.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return el.id === selector.slice(1) || el.attributes.id === selector.slice(1);
      if (selector.startsWith("[")) {
        const body = selector.slice(1, -1);
        const [rawName, rawVal] = body.split("=");
        const name = rawName.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (rawVal == null) return el.attributes[rawName] != null || el.dataset?.[name] != null;
        const expected = rawVal.replace(/['"]/g, "");
        return el.attributes[rawName] === expected || el.dataset?.[name] === expected || el.id === expected;
      }
      return el.tagName.toLowerCase() === selector.toLowerCase();
    };
    const result = [];
    for (const child of this.children) {
      if (match(child)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  closest(selector) {
    let node = this;
    const cls = selector.startsWith(".") ? selector.slice(1) : "";
    while (node) {
      if (cls && node.classList?.contains?.(cls)) return node;
      node = node.parentNode;
    }
    return null;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540 };
  }
  focus() {}
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
    this.listeners = {};
    this.activeElement = null;
  }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler); }
  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const handler of list) handler(event);
  }
}

function container() {
  return { innerHTML: "", className: "", appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
}

function createTestCanvas() {
  const canvas = new SlidesCanvasController(container());
  canvas.slides = [
    { id: 1, title: "Trang 1", body: "Noi dung 1", layoutType: "title-content", shapes: [], comments: [], hidden: false },
    { id: 2, title: "Trang 2", body: "Noi dung 2", layoutType: "title-content", shapes: [], comments: [], hidden: false }
  ];
  canvas.currentSlideIndex = 0;
  return canvas;
}

export async function runSlidesPenLaserTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  await test("Chế độ F5: phím tắt Ctrl+P bật bút vẽ, Ctrl+L bật laser, Ctrl+A trở về mũi tên", () => {
    const originalDoc = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createTestCanvas();
      const show = canvas.startSlideShow(0);
      assert(show, "Khởi tạo trình chiếu F5");
      assert(show.getPointerMode() === "arrow", `Chế độ ban đầu phải là arrow, thực tế: ${show.getPointerMode()}`);

      // Gửi sự kiện phím Ctrl+P
      globalThis.document.dispatchEvent({
        type: "keydown",
        key: "p",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      });
      assert(show.getPointerMode() === "pen", `Ctrl+P phải chuyển sang pen, thực tế: ${show.getPointerMode()}`);

      // Gửi sự kiện phím Ctrl+L
      globalThis.document.dispatchEvent({
        type: "keydown",
        key: "l",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      });
      assert(show.getPointerMode() === "laser", `Ctrl+L phải chuyển sang laser, thực tế: ${show.getPointerMode()}`);

      // Gửi sự kiện phím Ctrl+A
      globalThis.document.dispatchEvent({
        type: "keydown",
        key: "a",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      });
      assert(show.getPointerMode() === "arrow", `Ctrl+A phải trở lại arrow, thực tế: ${show.getPointerMode()}`);

      show.close(false);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  await test("Bút vẽ: vẽ nét trên trang chiếu, phím E xóa nét vẽ trên trang hiện tại", () => {
    const originalDoc = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createTestCanvas();
      const show = canvas.startSlideShow(0);

      show.setPointerMode("pen");
      assert(show.getPointerMode() === "pen", "Chuyển sang chế độ bút vẽ");

      // Vẽ 1 nét trên slide 0
      show.drawStroke([{ x: 100, y: 100 }, { x: 120, y: 110 }, { x: 150, y: 130 }]);
      let strokes = show.getStrokes();
      assert(strokes.length === 1, `Phải có 1 nét vẽ, thực tế: ${strokes.length}`);
      assert(strokes[0].points.length === 3, "Nét vẽ có 3 điểm");

      // Nhấn phím 'e' để xóa nét vẽ
      globalThis.document.dispatchEvent({
        type: "keydown",
        key: "e",
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      });
      strokes = show.getStrokes();
      assert(strokes.length === 0, `Phím E phải xóa hết nét vẽ trên trang hiện tại, thực tế: ${strokes.length}`);

      show.close(false);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  await test("Chọn màu bút: màu mặc định từ thiết lập trình chiếu và menu chuột phải", () => {
    const originalDoc = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createTestCanvas();
      canvas.applySlideShowSettings({ pointerColor: "#EAB308" });

      const show = canvas.startSlideShow(0);
      assert(show.getPenColor() === "#EAB308", `Màu bút ban đầu phải lấy từ thiết lập trình chiếu (#EAB308), thực tế: ${show.getPenColor()}`);

      // Đổi màu bút trong lúc trình chiếu (menu chuột phải)
      show.setPenColor("#2563EB");
      assert(show.getPenColor() === "#2563EB", `Đổi sang màu xanh (#2563EB), thực tế: ${show.getPenColor()}`);

      show.setPointerMode("pen");
      show.drawStroke([{ x: 50, y: 50 }, { x: 80, y: 80 }]);
      const strokes = show.getStrokes();
      assert(strokes[0].color === "#2563EB", `Nét vẽ phải mang màu mới (#2563EB), thực tế: ${strokes[0].color}`);

      show.close(false);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  await test("Kết thúc trình chiếu: Giữ nét vẽ lưu thành hình vẽ (type: ink) trên trang chiếu", () => {
    const originalDoc = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createTestCanvas();
      const show = canvas.startSlideShow(0);

      show.setPointerMode("pen");
      show.setPenColor("#DC2626");
      show.drawStroke([{ x: 100, y: 150 }, { x: 200, y: 250 }]);

      // Kết thúc trình chiếu với tùy chọn Giữ nét vẽ (keepInk = true)
      show.close(true);

      const slide0 = canvas.slides[0];
      assert(slide0.shapes.length === 1, `Slide 0 phải có 1 shape mới sau khi giữ nét vẽ, thực tế: ${slide0.shapes.length}`);
      const inkShape = slide0.shapes[0];
      assert(inkShape.type === "ink", `Shape phải có type='ink', thực tế: ${inkShape.type}`);
      assert(inkShape.stroke === "#DC2626", `Màu nét vẽ phải là #DC2626, thực tế: ${inkShape.stroke}`);
      assert(inkShape.x >= 90 && inkShape.x <= 110, `Tọa độ x của nét vẽ hợp lý: ${inkShape.x}`);
      assert(inkShape.w >= 90 && inkShape.w <= 110, `Chiều rộng w của nét vẽ hợp lý: ${inkShape.w}`);
      assert(inkShape.d && inkShape.d.startsWith("M"), `Nét vẽ có chuỗi svg path d hợp lệ: ${inkShape.d}`);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  await test("Kết thúc trình chiếu: Bỏ nét vẽ không lưu thêm shape nào vào slide", () => {
    const originalDoc = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createTestCanvas();
      const show = canvas.startSlideShow(0);

      show.setPointerMode("pen");
      show.drawStroke([{ x: 50, y: 50 }, { x: 100, y: 100 }]);

      // Kết thúc trình chiếu với tùy chọn Bỏ nét vẽ (keepInk = false)
      show.close(false);

      const slide0 = canvas.slides[0];
      assert(slide0.shapes.length === 0, `Slide 0 không được có thêm shape nào khi Bỏ nét vẽ, thực tế: ${slide0.shapes.length}`);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  await test("FODP & PPTX: serializeToFodp và parseFodp giữ nguyên hình vẽ nét bút (type: ink)", () => {
    const canvas = createTestCanvas();
    canvas.slides[0].shapes = [{
      id: "ink-shape-1",
      type: "ink",
      x: 100,
      y: 120,
      w: 200,
      h: 150,
      color: "#DC2626",
      stroke: "#DC2626",
      strokeWidth: 3,
      fill: "none",
      d: "M 0 0 L 100 80 L 200 150",
      viewBox: "0 0 200 150"
    }];

    const adapter = new SlidesAdapter(canvas);
    const fodpXml = adapter.serializeToFodp();
    assert(fodpXml.includes("<draw:path") || fodpXml.includes("<draw:custom-shape"), "FODP phải chứa draw:path hoặc draw:custom-shape cho nét vẽ");
    assert(fodpXml.includes("svg:d=") || fodpXml.includes("draw:enhanced-path="), "FODP phải lưu tọa độ đường dẫn path nét vẽ");

    const parsed = adapter.parseFodp(fodpXml);
    assert(parsed[0].shapes.length === 1, `parseFodp phải đọc được shape nét vẽ, thực tế: ${parsed[0].shapes.length}`);
    const parsedInk = parsed[0].shapes[0];
    assert(parsedInk.type === "ink", `parsedInk.type phải là 'ink', thực tế: ${parsedInk.type}`);
    assert(parsedInk.d.includes("M 0 0"), `parsedInk.d phải chứa tọa độ nét vẽ, thực tế: ${parsedInk.d}`);
  });

  await test("Bỏ thông báo đang hoàn thiện và cập nhật Trợ giúp", () => {
    setLocale("vi");
    const viHint = t("slidesDialogs.setupShowHint");
    assert(!viHint.includes("chưa có bút/laser trên màn hình chiếu"), `Thông báo đang hoàn thiện chưa được gỡ khỏi tiếng Việt: ${viHint}`);

    const helpEntry = SLIDES_HELP_ENTRIES.find((entry) => entry.id === "slides.show.setupShow");
    assert(helpEntry, "Phải có entry Trợ giúp cho slides.show.setupShow");
    const helpText = helpEntry.steps.join(" ");
    assert(helpText.includes("Ctrl+P") && helpText.includes("Ctrl+L"), "Trợ giúp phải hướng dẫn phím tắt Ctrl+P và Ctrl+L");
    assert(helpText.includes("Giữ nét vẽ") || helpText.includes("nét vẽ"), "Trợ giúp phải hướng dẫn nét vẽ và lưu nét vẽ");
  });

  return results;
}

if (process.argv[1]?.endsWith("slides-pen-laser.test.js")) {
  runSlidesPenLaserTests().then((results) => {
    let failCount = 0;
    for (const r of results) {
      if (r.pass) {
        console.log(`PASS: ${r.name}`);
      } else {
        console.log(`FAIL: ${r.name} - ${r.error}`);
        failCount++;
      }
    }
    console.log(`Total: ${results.length}, Failed: ${failCount}`);
    process.exit(failCount > 0 ? 1 : 0);
  });
}
