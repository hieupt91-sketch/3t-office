import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

class FakeElement {
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.listeners = {}; this.className = ""; this.dataset = {}; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener() {}
  closest() { return null; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ""; }
  get offsetWidth() { return 960; }
  focus() {}
}

async function withFakeDocument(fn) {
  const original = globalThis.document;
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    body: new FakeElement("body")
  };
  try { return await fn(); } finally { globalThis.document = original; }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.shapesLayer = new FakeElement();
  canvas._renderThumbnails = () => {};
  canvas._renderSlideSorterGrid = () => {};
  canvas.slides = [
    { shapes: [
      { id: "s1", type: "rect", x: 10, y: 10, w: 100, h: 50 },
      { id: "s2", type: "rect", x: 200, y: 10, w: 100, h: 50 }
    ] }
  ];
  canvas.currentSlideIndex = 0;
  canvas.selectedTarget = null;
  canvas.selectedShapeIds = new Set();
  return canvas;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesMouseShortcutsTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const newCommandIds = [
    "slides.shape.group", "slides.shape.ungroup",
    "slides.nav.firstSlide", "slides.nav.lastSlide", "slides.nav.prevSlide", "slides.nav.nextSlide"
  ];

  await test("Slides Parity: 6 lệnh mới (group/ungroup/nav) có đủ command, mapping UNO, i18n VI/EN", () => {
    newCommandIds.forEach(id => {
      const command = SLIDES_COMMANDS.find(item => item.id === id);
      assert(command, `Thiếu khai báo command ${id}`);
      assert(mapVnCommandToUno(id), `Thiếu UNO mapping cho ${id} — không có mapping thì CommandBus không tự bind handler được (UnoBridge chỉ auto-bind command có mapVnCommandToUno trả về giá trị thật)`);
      assert(viStrings.commands[id], `Thiếu chuỗi tiếng Việt cho ${id}`);
      assert(enStrings.commands[id], `Thiếu chuỗi tiếng Anh cho ${id}`);
    });
  });

  await test("Slides Parity: Ctrl+G/Ctrl+Shift+G/Ctrl+Home/Ctrl+End/PageUp/PageDown khai báo đúng chuẩn PowerPoint", () => {
    const expected = {
      "slides.shape.group": "Ctrl+G",
      "slides.shape.ungroup": "Ctrl+Shift+G",
      "slides.nav.firstSlide": "Ctrl+Home",
      "slides.nav.lastSlide": "Ctrl+End",
      "slides.nav.prevSlide": "PageUp",
      "slides.nav.nextSlide": "PageDown"
    };
    Object.entries(expected).forEach(([id, shortcut]) => {
      const command = SLIDES_COMMANDS.find(item => item.id === id);
      assert(command.shortcut === shortcut, `${id} phải có phím tắt ${shortcut}, hiện là ${command.shortcut}`);
    });
  });

  await test("Slides Parity: handleDispatch groupSelectedShapes/ungroupSelectedShapes gọi đúng canvas", async () => {
    await withFakeDocument(async () => {
      const canvas = createController();
      canvas.selectedShapeIds = new Set(["s1", "s2"]);
      const adapter = new SlidesAdapter(canvas);
      const groupOk = await adapter.handleDispatch(mapVnCommandToUno("slides.shape.group"), null, "slides.shape.group");
      assert(groupOk === true, "handleDispatch group phải trả về true");
      assert(canvas.slides[0].shapes[0].groupId && canvas.slides[0].shapes[0].groupId === canvas.slides[0].shapes[1].groupId, "Cả 2 shape phải cùng groupId sau khi nhóm");

      const ungroupOk = await adapter.handleDispatch(mapVnCommandToUno("slides.shape.ungroup"), null, "slides.shape.ungroup");
      assert(ungroupOk === true, "handleDispatch ungroup phải trả về true");
      assert(!canvas.slides[0].shapes[0].groupId && !canvas.slides[0].shapes[1].groupId, "Cả 2 shape phải hết groupId sau khi bỏ nhóm");
    });
  });

  await test("Slides Parity: handleDispatch điều hướng trang firstSlide/lastSlide/prevSlide/nextSlide", async () => {
    const canvas = createController();
    canvas.slides = [{ shapes: [] }, { shapes: [] }, { shapes: [] }];
    canvas.currentSlideIndex = 1;
    const adapter = new SlidesAdapter(canvas);

    await adapter.handleDispatch(mapVnCommandToUno("slides.nav.firstSlide"), null, "slides.nav.firstSlide");
    assert(canvas.currentSlideIndex === 0, "Ctrl+Home phải về trang đầu tiên (index 0)");

    await adapter.handleDispatch(mapVnCommandToUno("slides.nav.lastSlide"), null, "slides.nav.lastSlide");
    assert(canvas.currentSlideIndex === 2, "Ctrl+End phải đến trang cuối cùng (index 2)");

    await adapter.handleDispatch(mapVnCommandToUno("slides.nav.prevSlide"), null, "slides.nav.prevSlide");
    assert(canvas.currentSlideIndex === 1, "PageUp phải lùi 1 trang");

    await adapter.handleDispatch(mapVnCommandToUno("slides.nav.nextSlide"), null, "slides.nav.nextSlide");
    assert(canvas.currentSlideIndex === 2, "PageDown phải tiến 1 trang");
  });

  await test("Slides Parity: nudgeSelected di chuyển đối tượng đang chọn theo pixel", () => {
    const canvas = createController();
    canvas.selectedShapeIds = new Set(["s1"]);
    const before = { x: canvas.slides[0].shapes[0].x, y: canvas.slides[0].shapes[0].y };
    canvas.nudgeSelected(5, 10);
    const after = canvas.slides[0].shapes[0];
    assert(after.x === before.x + 5 && after.y === before.y + 10, "nudgeSelected phải cộng đúng dx/dy vào vị trí shape");
  });

  await test("Slides Parity: selectNextObject (Tab) chuyển đổi shape đang chọn theo thứ tự", () => {
    const canvas = createController();
    canvas.setSelectedTarget("s1");
    canvas.selectNextObject(false);
    assert(String(canvas.selectedTarget) === "s2", "Tab phải chuyển sang shape kế tiếp (s2)");
    canvas.selectNextObject(true);
    assert(String(canvas.selectedTarget) === "s1", "Shift+Tab phải quay lại shape trước (s1)");
  });

  await test("Slides Parity: ShortcutManager scope 'slides' đăng ký đúng phím Ctrl+G không xung đột common", () => {
    globalShortcutManager.setActiveScope("slides");
    const combo = globalShortcutManager._normalizeCombo("Ctrl+G");
    assert(globalShortcutManager._shortcuts.get(combo) === "slides.shape.group", "Ctrl+G scope slides phải trỏ đúng slides.shape.group");
  });

  await test("Slides Parity: _renderShapesLayer dựng lại đầy đủ DOM cho mọi shape (khôi phục sau lỗi mất hàm)", async () => {
    await withFakeDocument(() => {
      const canvas = createController();
      const appended = [];
      canvas.shapesLayer = {
        innerHTML: "",
        appendChild(el) { appended.push(el); },
        querySelectorAll() { return []; }
      };
      canvas._renderShapesLayer();
      assert(appended.length === 2, `_renderShapesLayer phải tạo đúng 2 phần tử DOM cho 2 shape, tạo được ${appended.length}`);
    });
  });

  return results;
}
