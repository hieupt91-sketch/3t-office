/**
 * VN Office — Unit Tests cho VN Slides: Căn lề dọc khung chữ (GAP-SLIDES-05)
 * và Hướng văn bản (GAP-SLIDES-06) từ HANDOFF-ALIGNMENT-DIALOGS-PARITY-AUDIT.md.
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

class FakeElement {
  constructor() { this.style = {}; this.dataset = {}; }
  querySelector() { return null; }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.titleEl = { innerText: "", style: {}, classList: { add() {}, remove() {}, contains: () => false } };
  canvas.bodyEl = { innerText: "", style: {} };
  canvas.body2El = { innerText: "", style: {} };
  canvas.bodyRowEl = { style: {} };
  canvas.canvasEl = { style: {}, dataset: {} };
  canvas.shapesLayer = { querySelector: () => null };
  canvas._renderShapesLayer = () => {};
  canvas._renderThumbnails = () => {};
  return canvas;
}

function slideWithShapes(canvas, shapes) {
  canvas.slides = [{ id: 1, title: "S", body: "", layoutType: "blank", shapes, comments: [], hidden: false }];
  canvas.currentSlideIndex = 0;
}

const rect = (id, x, y, w, h, extra = {}) => ({ id, type: "rect", x, y, w, h, color: "#3b82f6", text: `text-${id}`, ...extra });

export async function runSlidesTextVerticalDirectionTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Khai báo đủ 7 lệnh (3 căn lề dọc + 4 hướng chữ), lệnh có UNO thật đều có mapping", () => {
    const ids = ["vAlignTop", "vAlignMiddle", "vAlignBottom", "directionHorizontal", "directionVertical", "directionVertical270", "directionStacked"];
    ids.forEach(id => {
      const full = `slides.text.${id}`;
      assert(SLIDES_COMMANDS.find(c => c.id === full), `Thiếu lệnh ${full}`);
    });
    assert(mapVnCommandToUno("slides.text.vAlignTop") === ".uno:TextVertAnchorTop", "Thiếu mapping UNO vAlignTop");
    assert(mapVnCommandToUno("slides.text.directionVertical") === ".uno:TextdirectionTopToBottom", "Thiếu mapping UNO directionVertical");
  });

  await test("Ribbon: 2 dropdown mới (Căn lề văn bản, Hướng văn bản) nằm trong nhóm Đoạn văn, cạnh alignLeft/Center/Right/Justify", () => {
    const homeTab = SLIDES_RIBBON_TABS.find(t => t.id === "home");
    const paraGroup = homeTab.groups.find(g => g.labelKey === "slidesRibbon.group.paragraph");
    assert(paraGroup, "Thiếu nhóm Đoạn văn");
    const flat = [];
    const walk = (items) => (items || []).forEach(it => { flat.push(it); if (it.items) walk(it.items); });
    walk(paraGroup.items);
    const vAlignDropdown = flat.find(it => it.type === "dropdown" && it.id === "slides.text.vAlign");
    const dirDropdown = flat.find(it => it.type === "dropdown" && it.id === "slides.text.direction");
    assert(vAlignDropdown, "Thiếu dropdown Căn lề văn bản");
    assert(dirDropdown, "Thiếu dropdown Hướng văn bản");
    assert(vAlignDropdown.items.map(i => i.commandId).join(",") === "slides.text.vAlignTop,slides.text.vAlignMiddle,slides.text.vAlignBottom");
    assert(dirDropdown.items.length === 4, "Dropdown Hướng văn bản phải có đủ 4 lựa chọn");
  });

  await test("setTextVerticalAlign: áp dụng cho tất cả hình đang chọn, bỏ qua hình không đủ điều kiện (chart/table/image)", () => {
    const canvas = createController();
    const media = { id: "img1", type: "image", x: 0, y: 0, w: 50, h: 50, src: "data:image/png;base64,x" };
    slideWithShapes(canvas, [rect("s1", 0, 0, 100, 50), rect("s2", 100, 0, 100, 50), media]);
    canvas.selectedShapeIds = new Set(["s1", "s2", "img1"]);
    const result = canvas.setTextVerticalAlign("top");
    assert(result && result.changed === 2, `Phải áp dụng đúng 2 hình, thực tế: ${JSON.stringify(result)}`);
    const [s1, s2] = canvas.slides[0].shapes;
    assert(s1.textVAlign === "top" && s2.textVAlign === "top", "2 hình rect phải có textVAlign=top");
  });

  await test("setTextDirection: đổi hướng chữ, Ctrl+Z hoàn tác đúng về hướng cũ (kể cả undefined ban đầu)", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect("s1", 0, 0, 100, 50)]);
    canvas.selectedShapeIds = new Set(["s1"]);
    const result = canvas.setTextDirection("vertical270");
    assert(result && result.changed === 1);
    assert(canvas.slides[0].shapes[0].textDirection === "vertical270");
    canvas.undo();
    assert(canvas.slides[0].shapes[0].textDirection === undefined, `Undo phải khôi phục về undefined, thực tế: ${canvas.slides[0].shapes[0].textDirection}`);
    canvas.redo();
    assert(canvas.slides[0].shapes[0].textDirection === "vertical270", "Redo phải áp dụng lại vertical270");
  });

  await test("setTextVerticalAlign/setTextDirection: không tạo undo entry khi giá trị không đổi (idempotent)", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect("s1", 0, 0, 100, 50, { textVAlign: "top" })]);
    canvas.selectedShapeIds = new Set(["s1"]);
    const result = canvas.setTextVerticalAlign("top");
    assert(result && result.changed === 0, "Đặt lại đúng giá trị hiện tại không được ghi undo");
    assert(canvas.undoStack.length === 0);
  });

  await test("_renderShapesLayer: align-items CSS khớp textVAlign (top→flex-start, bottom→flex-end, mặc định→center)", () => {
    const canvas = createController();
    const created = [];
    const realDoc = globalThis.document;
    globalThis.document = {
      createElement: (tag) => {
        const el = { tagName: tag, style: {}, dataset: {}, classList: { add() {}, remove() {}, contains: () => false }, children: [], appendChild(child) { this.children.push(child); }, addEventListener() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [] };
        created.push(el);
        return el;
      }
    };
    try {
      delete canvas._renderShapesLayer; // createController() stubs it out; restore the real prototype method for this test
      canvas.shapesLayer = { innerHTML: "", appendChild(el) { this.children = this.children || []; this.children.push(el); }, querySelector: () => null };
      canvas.slideSize = { width: 960, height: 540 };
      slideWithShapes(canvas, [
        rect("top1", 0, 0, 100, 50, { textVAlign: "top" }),
        rect("bot1", 0, 0, 100, 50, { textVAlign: "bottom" }),
        rect("mid1", 0, 0, 100, 50)
      ]);
      canvas.selectedShapeIds = new Set();
      canvas._renderShapesLayer();
      const els = canvas.shapesLayer.children;
      const byShapeId = (id) => els.find(e => e.dataset.shapeId === id);
      assert(byShapeId("top1").style.alignItems === "flex-start", `top sai: ${byShapeId("top1").style.alignItems}`);
      assert(byShapeId("bot1").style.alignItems === "flex-end", `bottom sai: ${byShapeId("bot1").style.alignItems}`);
      assert(byShapeId("mid1").style.alignItems === "center", `mặc định sai: ${byShapeId("mid1").style.alignItems}`);
    } finally {
      globalThis.document = realDoc;
    }
  });

  await test("Serialize FODP → Parse lại: textVAlign/textDirection round-trip chính xác cho cả 3+4 giá trị, mặc định không ghi thuộc tính thừa", () => {
    const canvas = {
      slideSize: { width: 960, height: 540 },
      slides: [{
        id: 1, title: "T", body: "B", layoutType: "title-content", notes: "", shapes: [
          { id: "s1", type: "rect", x: 10, y: 10, w: 100, h: 50, color: "#3b82f6", text: "a", textVAlign: "top" },
          { id: "s2", type: "rect", x: 200, y: 10, w: 100, h: 50, color: "#22c55e", text: "b", textVAlign: "bottom", textDirection: "vertical" },
          { id: "s3", type: "rect", x: 400, y: 10, w: 100, h: 50, color: "#ef4444", text: "c", textDirection: "stacked" },
          { id: "s4", type: "rect", x: 600, y: 10, w: 100, h: 50, color: "#a855f7", text: "d", textDirection: "vertical270" },
          { id: "s5", type: "rect", x: 10, y: 100, w: 100, h: 50, color: "#3b82f6", text: "e" }
        ]
      }]
    };
    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();
    const parsed = new SlidesAdapter(null).parseFodp(fodp);
    const byId = (id) => parsed[0].shapes.find(s => String(s.id) === id);
    assert(byId("s1").textVAlign === "top", `s1: ${byId("s1").textVAlign}`);
    assert(byId("s2").textVAlign === "bottom" && byId("s2").textDirection === "vertical", `s2: ${JSON.stringify(byId("s2"))}`);
    assert(byId("s3").textDirection === "stacked", `s3: ${byId("s3").textDirection}`);
    assert(byId("s4").textDirection === "vertical270", `s4: ${byId("s4").textDirection}`);
    assert(!byId("s5").textVAlign && !byId("s5").textDirection, `s5 mặc định không được có thuộc tính thừa: ${JSON.stringify(byId("s5"))}`);
    assert(!fodp.includes(`style:name="gr3b82f6_"`), "Style key hình mặc định không được có hậu tố thừa");
  });

  return results;
}
