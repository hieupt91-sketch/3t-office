import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

class FakeElement {
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.style = {}; this.listeners = {}; this.className = ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  closest() { return null; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ""; }
  get offsetWidth() { return 960; }
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter(item => item !== handler); }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
  return canvas;
}

export async function runSlidesDiagramTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("SmartArt: command có dispatch, mapping, icon thật, ribbon và i18n VI/EN", async () => {
    const command = SLIDES_COMMANDS.find(item => item.id === "slides.diagram.insert");
    if (!command || !mapVnCommandToUno(command.id)) throw new Error("Thiếu command hoặc UNO mapping");
    if (!ICONS[command.icon]?.includes("<svg") || ICONS[command.icon].includes('circle cx="12" cy="12" r="4"')) throw new Error("Icon diagram không phải icon SVG riêng");
    if (!SLIDES_RIBBON_TABS.some(tab => tab.id === "insert" && tab.groups.some(group => group.items.some(item => item.commandId === command.id)))) throw new Error("Command chưa nằm trên tab Chèn");
    if (!viStrings.commands[command.id] || !enStrings.commands[command.id]) throw new Error("Thiếu chuỗi command VI/EN");
    const canvas = { showDiagramDialog: () => "dialog-opened" };
    const dispatched = await new SlidesAdapter(canvas).handleDispatch(mapVnCommandToUno(command.id), null, command.id);
    if (dispatched !== "dialog-opened") throw new Error("handleDispatch chưa gọi dialog thật");
  });

  await test("SmartArt Process 4 bước tạo đúng 4 node + 3 connector trong slide.shapes", () => {
    const canvas = createController();
    const result = canvas.insertDiagram("process", 4);
    const group = canvas.slides[0].shapes.filter(shape => shape.diagramGroupId === result.diagramGroupId);
    if (group.filter(shape => shape.diagramRole === "node").length !== 4) throw new Error("Không có đúng 4 node");
    if (group.filter(shape => shape.type === "connector").length !== 3) throw new Error("Không có đúng 3 connector");
    if (group.filter(shape => shape.type === "connector").some(shape => !shape.sourceId || !shape.targetId)) throw new Error("Connector thiếu sourceId/targetId");
    if (new Set(group.map(shape => shape.diagramGroupId)).size !== 1) throw new Error("Các shape không cùng group");
  });

  await test("SmartArt hỗ trợ đủ Process/Cycle/Hierarchy/List và giới hạn 3-6 node", () => {
    for (const type of ["process", "cycle", "hierarchy", "list"]) {
      const canvas = createController(); canvas.insertDiagram(type, 6);
      const nodes = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
      if (nodes.length !== 6) throw new Error(`${type} không tạo đủ 6 node`);
      if (!canvas.slides[0].shapes.some(shape => shape.type === "connector")) throw new Error(`${type} thiếu connector`);
    }
  });

  await test("SmartArt lưu text chỉnh trực tiếp vào đúng shape", () => {
    const canvas = createController(); canvas.insertDiagram("process", 4);
    const node = canvas.slides[0].shapes.find(shape => shape.diagramRole === "node");
    if (!canvas.updateShapeText(node.id, "Phê duyệt hồ sơ")) throw new Error("updateShapeText trả về false");
    if (node.text !== "Phê duyệt hồ sơ") throw new Error("Text chưa lưu vào slide.shapes");
  });

  await test("SmartArt Undo một lần xóa toàn bộ diagram và Redo khôi phục đầy đủ", () => {
    const canvas = createController(); const result = canvas.insertDiagram("process", 4);
    const total = result.shapes.length;
    if (canvas.undoStack.length !== 1 || canvas.undoStack[0].type !== "diagram-insert") throw new Error("Insert không tạo đúng một action diagram-insert");
    if (!canvas.undo() || canvas.slides[0].shapes.length !== 0) throw new Error("Undo một lần chưa xóa toàn bộ diagram");
    if (!canvas.redo() || canvas.slides[0].shapes.length !== total) throw new Error("Redo chưa khôi phục đầy đủ diagram");
  });

  await test("SmartArt xóa lẻ một node chỉ bỏ node đó, các node khác vẫn còn", () => {
    const canvas = createController(); canvas.insertDiagram("process", 4);
    const nodes = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
    const unrelatedConnector = canvas.slides[0].shapes.find(shape => shape.sourceId === nodes[1].id && shape.targetId === nodes[2].id);
    canvas.deleteShape(nodes[0].id);
    const remaining = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
    if (remaining.length !== 3 || !remaining.some(shape => shape.id === nodes[1].id)) throw new Error("Xóa lẻ ảnh hưởng node khác");
    if (canvas.slides[0].shapes.some(shape => shape.sourceId === nodes[0].id || shape.targetId === nodes[0].id)) throw new Error("Còn connector mồ côi");
    if (!canvas.slides[0].shapes.some(shape => shape.id === unrelatedConnector.id)) throw new Error("Xóa nhầm connector không liên quan");
    if (!canvas.undo() || !canvas.slides[0].shapes.some(shape => shape.id === nodes[0].id)) throw new Error("Undo không khôi phục node");
    if (canvas.slides[0].shapes.filter(shape => shape.sourceId === nodes[0].id || shape.targetId === nodes[0].id).length !== 1) throw new Error("Undo không khôi phục connector");
    if (!canvas.redo() || canvas.slides[0].shapes.some(shape => shape.id === nodes[0].id)) throw new Error("Redo không xóa lại node");
  });

  await test("SmartArt di chuyển node cập nhật hình học connector và Undo/Redo cả hai", () => {
    const canvas = createController(); canvas.insertDiagram("process", 4);
    const node = canvas.slides[0].shapes.find(shape => shape.diagramRole === "node");
    const connector = canvas.slides[0].shapes.find(shape => shape.sourceId === node.id);
    const from = { x: node.x, y: node.y };
    node.x += 40; node.y += 25;
    const to = { x: node.x, y: node.y };
    canvas._updateDiagramConnectorsForNode(node);
    if (connector.x1 !== node.x + node.w / 2 || connector.y1 !== node.y + node.h / 2) throw new Error("Connector chưa bám tâm node");
    canvas.undoStack.push({ type: "diagram-node-move", slideIndex: 0, shapeId: node.id, from, to });
    if (!canvas.undo() || connector.x1 !== from.x + node.w / 2 || connector.y1 !== from.y + node.h / 2) throw new Error("Undo move không hoàn tác connector");
    if (!canvas.redo() || connector.x1 !== to.x + node.w / 2 || connector.y1 !== to.y + node.h / 2) throw new Error("Redo move không áp dụng connector");
  });

  await test("SmartArt hiển thị node, text và connector trong Slide Show toàn màn hình", () => {
    const originalDocument = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = createController(); canvas.insertDiagram("process", 4);
      if (!canvas.startSlideShow(0)) throw new Error("startSlideShow trả về false");
      const overlay = globalThis.document.body.children[0];
      const html = overlay?.children[0]?.innerHTML || "";
      if (!html.includes("vno-show-shape-text") || !html.includes("vno-show-connector") || !html.includes("Bước 1")) throw new Error("Slide Show thiếu node/text/connector diagram");
    } finally { globalThis.document = originalDocument; }
  });

  return results;
}
