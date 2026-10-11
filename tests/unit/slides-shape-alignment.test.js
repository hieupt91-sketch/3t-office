/**
 * VN Office — Unit & Behavioral Tests for Slides Multi-Shape Alignment/Distribute
 * Đóng GAP-SLIDES-01/02/03 từ đợt audit Alignment Parity trước đó.
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

const rect = (id, x, y, w, h) => ({ id, type: "rect", x, y, w, h, color: "#3b82f6", text: "" });

export async function runSlidesShapeAlignmentTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Khai báo đủ 9 lệnh Sắp xếp (6 căn + 2 phân phối + 1 căn theo trang chiếu), có mapping UNO thật", () => {
    const ids = ["alignLeft", "alignCenter", "alignRight", "alignTop", "alignMiddle", "alignBottom", "distributeHorizontal", "distributeVertical", "alignToSlide"];
    ids.forEach(id => {
      const full = `slides.arrange.${id}`;
      assert(SLIDES_COMMANDS.find(c => c.id === full), `Thiếu lệnh ${full}`);
    });
    assert(mapVnCommandToUno("slides.arrange.alignLeft") === ".uno:ObjectAlignLeft", "Thiếu mapping UNO alignLeft");
    assert(mapVnCommandToUno("slides.arrange.distributeHorizontal") === ".uno:DistributeSelectionHorizontal", "Thiếu mapping UNO distributeHorizontal");
  });

  await test("Ribbon: dropdown Sắp xếp (Home > Đối tượng vẽ) chứa đủ các lệnh căn chỉnh mới cạnh Group/Ungroup", () => {
    const homeTab = SLIDES_RIBBON_TABS.find(t => t.id === "home");
    let found = null;
    for (const group of homeTab.groups) {
      for (const item of group.items) {
        if (item.type === "dropdown" && item.id === "slides.drawing.arrange") found = item;
      }
    }
    assert(found, "Không tìm thấy dropdown slides.drawing.arrange");
    const ids = found.items.map(i => i.commandId);
    assert(ids.includes("slides.arrange.alignLeft"), "Thiếu alignLeft trong dropdown");
    assert(ids.includes("slides.arrange.distributeVertical"), "Thiếu distributeVertical trong dropdown");
    assert(ids.includes("slides.shape.group"), "Group phải vẫn còn trong dropdown");
  });

  await test("alignShapes('left'): căn theo mép trái của khung các đối tượng đang chọn (không phải mép trang)", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 50, 10, 100, 40), rect(2, 200, 100, 60, 60)]);
    canvas.selectedShapeIds = new Set(["1", "2"]);
    const result = canvas.alignShapes("left");
    assert(result.aligned === 1, `Chỉ shape 2 cần di chuyển (shape 1 đã ở mép trái), nhận ${result.aligned}`);
    assert(canvas.slides[0].shapes[1].x === 50, `Shape 2 phải dịch về x=50 (mép trái của khung chọn), nhận ${canvas.slides[0].shapes[1].x}`);
    assert(canvas.slides[0].shapes[0].x === 50, "Shape 1 (đã đúng vị trí) không được đổi");
  });

  await test("alignShapes('center'): căn giữa ngang theo khung các đối tượng đang chọn", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 100, 50), rect(2, 300, 0, 100, 50)]);
    canvas.selectedShapeIds = new Set(["1", "2"]);
    canvas.alignShapes("center");
    // Khung chọn: x từ 0 đến 400 (300+100), tâm = 200. Mỗi shape rộng 100 -> x mới = 200-50=150.
    assert(canvas.slides[0].shapes[0].x === 150, `Shape 1 sai: ${canvas.slides[0].shapes[0].x}`);
    assert(canvas.slides[0].shapes[1].x === 150, `Shape 2 sai: ${canvas.slides[0].shapes[1].x}`);
  });

  await test("alignShapes('middle', 'slide'): căn theo TOÀN BỘ trang chiếu khi bật Căn theo trang chiếu", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 10, 10, 100, 50), rect(2, 500, 300, 80, 40)]);
    canvas.selectedShapeIds = new Set(["1", "2"]);
    canvas.alignShapes("middle", "slide");
    const midY1 = canvas.slides[0].shapes[0].y + 50 / 2;
    const midY2 = canvas.slides[0].shapes[1].y + 40 / 2;
    assert(Math.abs(midY1 - canvas.slideSize.height / 2) < 0.01, `Shape 1 phải giữa trang chiếu theo dọc: ${midY1}`);
    assert(Math.abs(midY2 - canvas.slideSize.height / 2) < 0.01, `Shape 2 phải giữa trang chiếu theo dọc: ${midY2}`);
  });

  await test("alignShapes: đường nối (connector) không tham gia căn chỉnh, giống Group/Ungroup", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 100, 50), rect(2, 300, 0, 100, 50), { id: 3, type: "connector", x1: 0, y1: 0, x2: 100, y2: 100 }]);
    canvas.selectedShapeIds = new Set(["1", "2", "3"]);
    const result = canvas.alignShapes("left");
    assert(result.aligned === 1, `Chỉ 1 rect cần di chuyển (connector bị loại), nhận ${result.aligned}`);
    assert(canvas.slides[0].shapes[2].type === "connector", "Connector không được biến đổi thành shape khác");
  });

  await test("alignShapes: cần ít nhất 2 hình đang chọn, chỉ 1 hình trả về false", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 100, 50)]);
    canvas.selectedShapeIds = new Set(["1"]);
    assert(canvas.alignShapes("left") === false, "Chỉ 1 hình phải trả về false");
  });

  await test("alignShapes + Undo/Redo: MỘT lần Ctrl+Z hoàn tác TRỌN VẸN cả nhóm hình vừa căn (không phải từng hình)", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 100, 50), rect(2, 300, 20, 60, 30), rect(3, 500, 40, 40, 40)]);
    canvas.selectedShapeIds = new Set(["1", "2", "3"]);
    const originalPositions = canvas.slides[0].shapes.map(s => ({ x: s.x, y: s.y }));
    canvas.alignShapes("top");
    assert(canvas.slides[0].shapes.every((s, i) => s.y === 0), "Tất cả phải căn về y=0 sau alignShapes");
    canvas.undo();
    const afterUndo = canvas.slides[0].shapes.map(s => ({ x: s.x, y: s.y }));
    assert(JSON.stringify(afterUndo) === JSON.stringify(originalPositions), "Một lần Undo phải khôi phục TOÀN BỘ vị trí gốc của cả 3 hình cùng lúc");
    canvas.redo();
    assert(canvas.slides[0].shapes.every(s => s.y === 0), "Redo phải áp dụng lại đúng kết quả căn chỉnh");
  });

  await test("distributeShapes('horizontal'): giữ nguyên hình đầu/cuối, chia đều khoảng TRỐNG ở giữa", () => {
    const canvas = createController();
    // 3 hình rộng 50, đặt tại x=0, x=100, x=400 (khoảng trống không đều)
    slideWithShapes(canvas, [rect(1, 0, 0, 50, 50), rect(2, 100, 0, 50, 50), rect(3, 400, 0, 50, 50)]);
    canvas.selectedShapeIds = new Set(["1", "2", "3"]);
    const result = canvas.distributeShapes("horizontal");
    assert(result.distributed >= 1, "Phải có ít nhất 1 hình được di chuyển");
    const shapes = canvas.slides[0].shapes;
    assert(shapes[0].x === 0, "Hình đầu (x nhỏ nhất) phải giữ nguyên vị trí");
    assert(shapes[2].x === 400, "Hình cuối (x lớn nhất) phải giữ nguyên vị trí");
    // Khoảng trống tổng = (400+50) - 0 - 150(tổng rộng 3 hình) = 300, chia đều cho 2 khoảng = 150 mỗi khoảng.
    const gap1 = shapes[1].x - (shapes[0].x + shapes[0].w);
    const gap2 = shapes[2].x - (shapes[1].x + shapes[1].w);
    assert(Math.abs(gap1 - gap2) < 0.6, `Hai khoảng trống phải bằng nhau: ${gap1} vs ${gap2}`);
  });

  await test("distributeShapes('vertical', 'slide'): phân phối theo toàn bộ chiều cao trang chiếu khi Căn theo trang chiếu bật", () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 50, 40, 40), rect(2, 0, 200, 40, 40), rect(3, 0, 400, 40, 40)]);
    canvas.selectedShapeIds = new Set(["1", "2", "3"]);
    canvas.distributeShapes("vertical", "slide");
    const shapes = canvas.slides[0].shapes;
    assert(shapes[0].y === 0, `Hình đầu phải ở y=0 khi phân phối theo trang chiếu, nhận ${shapes[0].y}`);
    const lastBottom = shapes[2].y + shapes[2].h;
    assert(Math.abs(lastBottom - canvas.slideSize.height) < 1, `Hình cuối phải chạm đáy trang chiếu, nhận ${lastBottom} / ${canvas.slideSize.height}`);
  });

  await test("toggleAlignToSlide(): đảo trạng thái đúng, dispatch qua SlidesAdapter gọi đúng canvas thật", async () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 10, 10)]);
    const adapter = new SlidesAdapter(canvas);
    assert(canvas.alignToSlideMode === false, "Mặc định phải tắt (căn theo khung đang chọn, giống PowerPoint)");
    await adapter.handleDispatch(null, null, "slides.arrange.alignToSlide");
    assert(canvas.alignToSlideMode === true, "Sau khi bật phải là true");
    await adapter.handleDispatch(null, null, "slides.arrange.alignToSlide");
    assert(canvas.alignToSlideMode === false, "Bật lại lần nữa phải trở về false");
  });

  await test("SlidesAdapter.handleDispatch: cả 8 lệnh Căn/Phân phối đều gọi đúng canvas.alignShapes/distributeShapes thật", async () => {
    const canvas = createController();
    slideWithShapes(canvas, [rect(1, 0, 0, 50, 50), rect(2, 200, 0, 50, 50)]);
    canvas.selectedShapeIds = new Set(["1", "2"]);
    const adapter = new SlidesAdapter(canvas);
    const modes = ["alignLeft", "alignCenter", "alignRight", "alignTop", "alignMiddle", "alignBottom"];
    for (const mode of modes) {
      canvas.slides[0].shapes = [rect(1, 0, 0, 50, 50), rect(2, 200, 30, 50, 50)];
      const result = await adapter.handleDispatch(null, null, `slides.arrange.${mode}`);
      assert(result !== false, `${mode} phải thực thi thành công`);
    }
    const distResult = await adapter.handleDispatch(null, null, "slides.arrange.distributeHorizontal");
    assert(distResult !== false, "distributeHorizontal phải thực thi thành công");
  });

  return results;
}
