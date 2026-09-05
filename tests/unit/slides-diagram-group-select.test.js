import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    this.className = "";
    this.dataset = {};
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  closest() { return null; }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ""; }
}

function createController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.shapesLayer = null;
  canvas.canvasEl = null;
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = function () {};
  canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
  return canvas;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function snapshotPositions(shapes) {
  return shapes.map(shape => ({
    id: String(shape.id),
    x: shape.x,
    y: shape.y,
    x1: shape.x1,
    y1: shape.y1,
    x2: shape.x2,
    y2: shape.y2
  }));
}

export async function runSlidesDiagramGroupSelectTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Click một node trong diagram chọn toàn bộ shape cùng diagramGroupId (kể cả connector)", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    const nodes = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
    const group = canvas.slides[0].shapes.filter(shape => shape.diagramGroupId === inserted.diagramGroupId);
    canvas.setSelectedTarget(null);
    assert(!canvas.diagramGroupSelectionId, "Phải xóa group selection trước khi click");
    canvas.selectShapeFromUserClick(nodes[2], { shiftKey: false, ctrlKey: false });
    assert(canvas.diagramGroupSelectionId === inserted.diagramGroupId, "Phải ghi diagramGroupSelectionId");
    assert(canvas.selectedShapeIds.size === group.length, `Phải chọn ${group.length} shape, thực tế ${canvas.selectedShapeIds.size}`);
    for (const shape of group) {
      assert(canvas.selectedShapeIds.has(String(shape.id)), `Thiếu id ${shape.id} trong selection`);
    }
    assert(group.some(shape => shape.type === "connector"), "Nhóm phải gồm connector");
    assert(group.filter(shape => shape.diagramRole === "node").length === 4, "Nhóm phải gồm đủ 4 node");
  });

  await test("insertDiagram sau khi chèn tự chọn cả nhóm", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    assert(canvas.diagramGroupSelectionId === inserted.diagramGroupId, "Insert phải chọn cả nhóm");
    assert(canvas.selectedShapeIds.size === inserted.shapes.length, "Insert phải chọn đủ node + connector");
  });

  await test("Ctrl+Click chọn riêng một shape trong nhóm, không bung cả diagram", () => {
    const canvas = createController();
    canvas.insertDiagram("process", 4);
    const node = canvas.slides[0].shapes.find(shape => shape.diagramRole === "node");
    canvas.selectShapeFromUserClick(node, { ctrlKey: true, shiftKey: false, stopPropagation() {} });
    assert(canvas.diagramGroupSelectionId == null, "Ctrl+Click phải thoát group selection");
    assert(canvas.selectedShapeIds.size === 1, "Ctrl+Click chỉ được chọn 1 shape");
    assert(canvas.selectedShapeIds.has(String(node.id)), "Phải chọn đúng node vừa Ctrl+Click");
  });

  await test("Click shape thường không dính diagramGroupId chỉ chọn 1 shape", () => {
    const canvas = createController();
    canvas.slides[0].shapes = [{ id: "plain-1", type: "rect", x: 10, y: 10, w: 80, h: 40, color: "#2563eb" }];
    canvas.selectShapeFromUserClick(canvas.slides[0].shapes[0], { ctrlKey: false, shiftKey: false });
    assert(canvas.diagramGroupSelectionId == null, "Shape thường không được coi là nhóm diagram");
    assert(canvas.selectedShapeIds.size === 1 && canvas.selectedShapeIds.has("plain-1"), "Chỉ chọn đúng 1 shape thường");
  });

  await test("Hai diagram trên cùng slide: click nhóm A không chọn nhóm B", () => {
    const canvas = createController();
    const a = canvas.insertDiagram("process", 3);
    const b = canvas.insertDiagram("list", 3);
    const nodeB = canvas.slides[0].shapes.find(shape => shape.diagramGroupId === b.diagramGroupId && shape.diagramRole === "node");
    canvas.selectShapeFromUserClick(nodeB, {});
    const selected = canvas.slides[0].shapes.filter(shape => canvas.selectedShapeIds.has(String(shape.id)));
    assert(selected.every(shape => shape.diagramGroupId === b.diagramGroupId), "Chỉ được chọn shape của nhóm B");
    assert(!selected.some(shape => shape.diagramGroupId === a.diagramGroupId), "Không được chọn shape nhóm A");
  });

  await test("Bounding box bao quanh toàn bộ node + connector cùng diagramGroupId", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    const bounds = canvas.getDiagramGroupBounds(inserted.diagramGroupId);
    const group = canvas.slides[0].shapes.filter(shape => shape.diagramGroupId === inserted.diagramGroupId);
    assert(bounds && bounds.w > 0 && bounds.h > 0, "Phải có bounding box dương");
    for (const shape of group) {
      assert(shape.x >= bounds.x - 0.01, `shape ${shape.id} tràn trái box`);
      assert(shape.y >= bounds.y - 0.01, `shape ${shape.id} tràn trên box`);
      assert(shape.x + shape.w <= bounds.x + bounds.w + 0.01, `shape ${shape.id} tràn phải box`);
      assert(shape.y + shape.h <= bounds.y + bounds.h + 0.01, `shape ${shape.id} tràn dưới box`);
    }
  });

  await test("Kéo/move một node khi nhóm đang chọn dịch toàn bộ node+connector cùng offset", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    const before = snapshotPositions(canvas.slides[0].shapes.filter(shape => shape.diagramGroupId === inserted.diagramGroupId));
    const dx = 40;
    const dy = 25;
    assert(canvas.moveDiagramGroupBy(inserted.diagramGroupId, dx, dy), "moveDiagramGroupBy phải trả về true");
    const after = canvas.slides[0].shapes.filter(shape => shape.diagramGroupId === inserted.diagramGroupId);
    const nodes = after.filter(shape => shape.diagramRole === "node");
    const connectors = after.filter(shape => shape.type === "connector");
    for (const node of nodes) {
      const prev = before.find(item => item.id === String(node.id));
      assert(node.x === prev.x + dx && node.y === prev.y + dy, `Node ${node.id} không dịch đúng offset`);
    }
    for (const connector of connectors) {
      const prev = before.find(item => item.id === String(connector.id));
      assert(connector.x1 === prev.x1 + dx && connector.y1 === prev.y1 + dy, `Connector ${connector.id} x1/y1 lệch offset`);
      assert(connector.x2 === prev.x2 + dx && connector.y2 === prev.y2 + dy, `Connector ${connector.id} x2/y2 lệch offset`);
    }
    const relative = nodes[1].x - nodes[0].x;
    const relativeBefore = before.find(item => item.id === String(nodes[1].id)).x - before.find(item => item.id === String(nodes[0].id)).x;
    assert(relative === relativeBefore, "Phải giữ nguyên khoảng cách tương đối giữa các node");
    assert(canvas.undoStack.filter(item => item.type === "diagram-group-move").length === 1, "Move nhóm phải là đúng 1 action Undo");
  });

  await test("Undo/Redo di chuyển cả nhóm là 1 bước, khôi phục đúng vị trí node + connector", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    const before = snapshotPositions(canvas.slides[0].shapes);
    canvas.moveDiagramGroupBy(inserted.diagramGroupId, 30, -15);
    const moved = snapshotPositions(canvas.slides[0].shapes);
    assert(JSON.stringify(moved) !== JSON.stringify(before), "Phải thực sự đổi vị trí trước Undo");
    assert(canvas.undo(), "Undo group-move phải thành công");
    const undone = snapshotPositions(canvas.slides[0].shapes);
    assert(JSON.stringify(undone) === JSON.stringify(before), "Undo chưa khôi phục đúng vị trí ban đầu");
    assert(canvas.redo(), "Redo group-move phải thành công");
    const redone = snapshotPositions(canvas.slides[0].shapes);
    assert(JSON.stringify(redone) === JSON.stringify(moved), "Redo chưa áp lại đúng vị trí đã kéo");
  });

  await test("Delete khi nhóm đang chọn xóa toàn bộ diagram trong 1 bước Undo, khôi phục đúng vị trí", () => {
    const canvas = createController();
    canvas.addNewSlide(false);
    canvas.currentSlideIndex = 1;
    const inserted = canvas.insertDiagram("hierarchy", 4);
    const before = snapshotPositions(canvas.slides[1].shapes);
    const total = inserted.shapes.length;
    assert(total >= 5, "Hierarchy 4 node phải có node + connector");
    canvas.selectDiagramGroup(inserted.diagramGroupId);
    const slideCountBefore = canvas.slides.length;
    assert(canvas.deleteCurrentSlide(), "Delete khi đang chọn nhóm phải xóa shape, không thất bại");
    assert(canvas.slides.length === slideCountBefore, "Delete nhóm không được xóa cả slide");
    assert(canvas.slides[1].shapes.length === 0, "Phải xóa hết shape của nhóm");
    assert(canvas.undoStack.filter(item => item.type === "diagram-group-delete").length === 1, "Xóa nhóm phải là đúng 1 action");
    assert(canvas.undo(), "Undo xóa nhóm phải thành công");
    assert(canvas.slides[1].shapes.length === total, "Undo chưa trả đủ shape");
    const restored = snapshotPositions(canvas.slides[1].shapes);
    assert(JSON.stringify(restored) === JSON.stringify(before), "Undo xóa nhóm chưa trả đúng vị trí");
    assert(canvas.redo(), "Redo xóa nhóm phải thành công");
    assert(canvas.slides[1].shapes.length === 0, "Redo chưa xóa lại cả nhóm");
  });

  await test("deleteSelectedShapes trên nhóm imported-like (chỉ node, không connector) xóa đúng 1 bước", () => {
    const canvas = createController();
    canvas.slides[0].shapes = [
      { id: "QuyTrinhHoSo-node-1", type: "rect", x: 40, y: 80, w: 120, h: 60, text: "Tiếp nhận hồ sơ", diagramGroupId: "QuyTrinhHoSo", diagramRole: "node" },
      { id: "QuyTrinhHoSo-node-2", type: "rect", x: 200, y: 80, w: 120, h: 60, text: "Thẩm định", diagramGroupId: "QuyTrinhHoSo", diagramRole: "node" },
      { id: "plain-rect", type: "rect", x: 400, y: 300, w: 80, h: 40 }
    ];
    canvas.selectShapeFromUserClick(canvas.slides[0].shapes[1], {});
    assert(canvas.selectedShapeIds.size === 2, "Phải chọn đủ 2 node imported");
    assert(canvas.deleteSelectedShapes(), "deleteSelectedShapes phải xóa nhóm imported");
    assert(canvas.slides[0].shapes.length === 1, "Shape thường ngoài nhóm phải còn");
    assert(canvas.slides[0].shapes[0].id === "plain-rect", "Phải giữ đúng shape không thuộc nhóm");
    assert(canvas.undo(), "Undo xóa imported group phải thành công");
    assert(canvas.slides[0].shapes.some(shape => shape.id === "QuyTrinhHoSo-node-1"), "Undo phải trả node 1");
    assert(canvas.slides[0].shapes.some(shape => shape.id === "QuyTrinhHoSo-node-2"), "Undo phải trả node 2");
  });

  await test("Sửa text một node khi nhóm đang chọn không phá group selection", () => {
    const canvas = createController();
    const inserted = canvas.insertDiagram("process", 4);
    const node = canvas.slides[0].shapes.find(shape => shape.diagramRole === "node");
    canvas.selectDiagramGroup(inserted.diagramGroupId, node.id);
    assert(canvas.updateShapeText(node.id, "Phê duyệt hồ sơ"), "updateShapeText phải thành công");
    assert(node.text === "Phê duyệt hồ sơ", "Text chưa lưu vào node");
    assert(canvas.diagramGroupSelectionId === inserted.diagramGroupId, "Sửa text không được phá group selection");
    assert(canvas.selectedShapeIds.size === inserted.shapes.length, "Selection nhóm phải còn đủ shape");
  });

  await test("deleteShape lẻ một node (child-edit) vẫn chỉ xóa node đó + connector kề — không hồi quy", () => {
    const canvas = createController();
    canvas.insertDiagram("process", 4);
    const nodes = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
    canvas.diagramGroupSelectionId = null;
    canvas.selectedShapeIds = new Set([String(nodes[0].id)]);
    canvas.deleteShape(nodes[0].id);
    const remaining = canvas.slides[0].shapes.filter(shape => shape.diagramRole === "node");
    assert(remaining.length === 3, "Xóa lẻ không được nuốt cả nhóm");
    assert(!canvas.slides[0].shapes.some(shape => shape.sourceId === nodes[0].id || shape.targetId === nodes[0].id), "Phải gỡ connector mồ côi của node bị xóa");
  });

  return results;
}
