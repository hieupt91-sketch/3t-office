import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

function assert(condition, message) { if (!condition) throw new Error(message); }
function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } };
}
class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.dataset = {}; this.style = {}; this.attributes = {}; }
  set innerHTML(_value) { this.children = []; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(_name, handler) { this.handler = handler; }
}
function layer() {
  return { children: [], set innerHTML(_value) { this.children = []; }, appendChild(child) { this.children.push(child); return child; } };
}

export async function runSheetImageTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: tagName => new FakeElement(tagName) };
  try {
    test("Sheet Image: command, mapping, ribbon group và SVG icon đều tồn tại", () => {
      const insertTab = SHEET_RIBBON_TABS.find(tab => tab.id === "insert");
      const illustrations = insertTab.groups.find(group => group.labelKey === "sheetRibbon.group.illustrations");
      const groupIndex = insertTab.groups.indexOf(illustrations);
      assert(illustrations?.items.some(item => item.commandId === "sheet.insert.image"), "Thiếu nút Pictures trong nhóm Illustrations");
      assert(groupIndex >= 0 && groupIndex < insertTab.groups.findIndex(group => group.labelKey === "sheetRibbon.group.charts"), "Illustrations phải đứng trước Charts");
      assert(VN_TO_UNO_MAP["sheet.insert.image"] === ".uno:InsertGraphic", "Mapping InsertGraphic sai");
      assert(ICONS.image?.includes("<svg"), "Thiếu icon SVG image thật");
    });

    test("Sheet Image: chèn tại anchor, render, xóa và Undo/Redo đối xứng", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const image = grid.insertImage("data:image/png;base64,AA==", { c: "C", r: 5 });
      assert(image.anchor.c === "C" && image.anchor.r === 5, "Anchor C5 không được lưu");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "C5", "Overlay không render tại C5");
      grid.deleteImage(image.id);
      assert(grid.imagesBySheet[grid.activeSheet].length === 0, "Xóa ảnh không cập nhật state");
      assert(grid.undo() && grid.imagesBySheet[grid.activeSheet].length === 1, "Undo xóa không khôi phục ảnh");
      assert(grid.redo() && grid.imagesBySheet[grid.activeSheet].length === 0, "Redo xóa không loại ảnh");
    });

    test("Sheet Image: state và DOM cô lập theo sheet", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const firstSheet = grid.activeSheet;
      grid.insertImage("data:image/png;base64,AA==", { c: "A", r: 1 });
      grid.switchSheet("Kế hoạch Q3");
      assert(grid.imagesBySheet[grid.activeSheet].length === 0 && grid.imageLayer.children.length === 0, "Ảnh rò sang sheet thứ hai");
      grid.switchSheet(firstSheet);
      assert(grid.imagesBySheet[firstSheet].length === 1 && grid.imageLayer.children.length === 1, "Ảnh sheet đầu không được phục hồi");
    });

    test("Sheet Image: _getAnchorFromPixel tính ngược pixel sang tọa độ ô gần nhất", () => {
      const grid = new SheetGridController(container());
      // Header offset: left=46, top=28, colWidth=100, rowHeight=28
      // Ô A1: left=46, top=28
      const a1 = grid._getAnchorFromPixel(46, 28);
      assert(a1.c === "A" && a1.r === 1, `A1 sai: ${JSON.stringify(a1)}`);

      // Ô B1: left=146, top=28
      const b1 = grid._getAnchorFromPixel(146, 28);
      assert(b1.c === "B" && b1.r === 1, `B1 sai: ${JSON.stringify(b1)}`);

      // Kéo sang D5: col D = 46 + 3*100 = 346, row 5 = 28 + 4*28 = 140
      const d5 = grid._getAnchorFromPixel(346, 140);
      assert(d5.c === "D" && d5.r === 5, `D5 sai: ${JSON.stringify(d5)}`);

      // Snap điểm gần nhất: left=120 nằm giữa 46 và 146 nhưng gần 146 hơn -> B
      const snapB = grid._getAnchorFromPixel(120, 30);
      assert(snapB.c === "B" && snapB.r === 1, `Snap B sai: ${JSON.stringify(snapB)}`);

      // Clamp biên trên/trái: left <= 0, top <= 0 -> A1
      const clamped = grid._getAnchorFromPixel(-50, -20);
      assert(clamped.c === "A" && clamped.r === 1, `Clamped sai: ${JSON.stringify(clamped)}`);
    });

    test("Sheet Image: di chuyển ảnh (move) cập nhật anchor, DOM và Undo/Redo đối xứng", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const image = grid.insertImage("data:image/png;base64,AA==", { c: "B", r: 2 });
      assert(grid.imageLayer.children[0]?.dataset.anchor === "B2", "Ảnh ban đầu không neo tại B2");

      // Mô phỏng chốt vị trí sau khi kéo-thả tới E6
      const oldAnchor = { c: image.anchor.c, r: Number(image.anchor.r) };
      const newAnchor = grid._getAnchorFromPixel(46 + 4 * 100, 28 + 5 * grid.rowHeight);
      assert(newAnchor.c === "E" && newAnchor.r === 6, `Tọa độ kéo tới phải là E6: ${JSON.stringify(newAnchor)}`);

      image.anchor = { c: newAnchor.c, r: newAnchor.r };
      grid._recordHistory({
        type: "collection",
        sheet: grid.activeSheet,
        collection: "imagesBySheet",
        operation: "update",
        id: image.id,
        before: { anchor: structuredClone(oldAnchor) },
        after: { anchor: structuredClone(image.anchor) },
        item: structuredClone(image)
      });
      grid.renderImages();

      assert(image.anchor.c === "E" && image.anchor.r === 6, "Anchor không cập nhật sang E6");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "E6", "DOM không re-render tại E6");

      // Undo -> quay về B2
      assert(grid.undo(), "Undo di chuyển ảnh thất bại");
      assert(image.anchor.c === "B" && image.anchor.r === 2, "Undo không đưa anchor về B2");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "B2", "DOM không phục hồi về B2 sau Undo");

      // Redo -> nhảy lại E6
      assert(grid.redo(), "Redo di chuyển ảnh thất bại");
      assert(image.anchor.c === "E" && image.anchor.r === 6, "Redo không đưa anchor lại E6");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "E6", "DOM không re-render tại E6 sau Redo");
    });

    test("Sheet Image: render đúng kích thước widthCm/heightCm và vị trí tích lũy hàng/cột + offset (mock getRowHeight hàng 1 = 198px, ảnh B5 không đè hàng 1)", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      // Mock getRowHeight: hàng 1 cao 198px (như file Dahua thật), các hàng khác 28px
      grid.getRowHeight = (r) => Number(r) === 1 ? 198 : 28;
      grid.getColumnWidth = () => 100;

      // 1. Banner A1: 41.872cm x 5.245cm, offset 0
      const banner = {
        id: "Picture 7",
        src: "data:image/png;base64,AA==",
        anchor: { c: "A", r: 1 },
        widthCm: 41.872,
        heightCm: 5.245,
        offsetXCm: 0,
        offsetYCm: 0
      };
      // 2. Camera B5: 6.27cm x 6.251cm, offset x=1.334cm, y=0.552cm
      const camera = {
        id: "Picture 2",
        src: "data:image/png;base64,AA==",
        anchor: { c: "B", r: 5 },
        widthCm: 6.27,
        heightCm: 6.251,
        offsetXCm: 1.334,
        offsetYCm: 0.552
      };
      grid.imagesBySheet[grid.activeSheet] = [banner, camera];
      grid.selectedImageId = null;
      grid.renderImages();

      const bannerPanel = grid.imageLayer.children[0];
      const cameraPanel = grid.imageLayer.children[1];
      assert(bannerPanel, "Banner panel phải tồn tại");
      assert(cameraPanel, "Camera panel phải tồn tại");

      // Banner A1: top = 24px, left = 44px
      assert(parseFloat(bannerPanel.style.top) === 24, `Top banner phải là 24, thực tế: ${bannerPanel.style.top}`);
      assert(parseFloat(bannerPanel.style.left) === 44, `Left banner phải là 44, thực tế: ${bannerPanel.style.left}`);
      // Banner width: 41.872 * 37.795 = ~1583px, height: 5.245 * 37.795 = ~198px (tràn ngang hàng 1)
      const bannerW = parseFloat(bannerPanel.style.width);
      const bannerH = parseFloat(bannerPanel.style.height);
      assert(bannerW > 1500, `Banner phải vẽ tràn ngang (>1500px), thực tế: ${bannerW}px`);
      assert(Math.abs(bannerH - 198) <= 2, `Banner cao ~198px bằng hàng 1, thực tế: ${bannerH}px`);

      // Camera B5:
      // top = 24 (header) + 198 (hàng 1) + 28*3 (hàng 2,3,4) + 0.552*37.795 (offsetY ~21px) = 24 + 198 + 84 + 21 = 327px
      const cameraTop = parseFloat(cameraPanel.style.top);
      assert(cameraTop >= 320 && cameraTop <= 335, `Camera B5 top phải nằm trong ô B5 (~327px), thực tế: ${cameraTop}px`);
      // Chứng minh không đè hàng 1: hàng 1 kết thúc tại 24 + 198 = 222px. cameraTop = 327px >> 222px
      assert(cameraTop > 222, `Camera B5 top (${cameraTop}px) phải nằm dưới hoàn toàn hàng 1 (kết thúc tại 222px)`);

      // Camera left: 44 (header) + 100 (cột A) + 1.334*37.795 (offsetX ~50px) = 194px
      const cameraLeft = parseFloat(cameraPanel.style.left);
      assert(cameraLeft >= 190 && cameraLeft <= 200, `Camera B5 left phải là ~194px, thực tế: ${cameraLeft}px`);

      // Camera kích thước: ~237px x ~236px
      const cameraW = parseFloat(cameraPanel.style.width);
      const cameraH = parseFloat(cameraPanel.style.height);
      assert(Math.abs(cameraW - 237) <= 2, `Camera B5 width phải ~237px, thực tế: ${cameraW}px`);
      assert(Math.abs(cameraH - 236) <= 2, `Camera B5 height phải ~236px, thực tế: ${cameraH}px`);
    });

    test("Sheet Image: bỏ khung thẻ mặc định khi chưa chọn, hiện viền chọn + 8 handles khi được chọn", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.imagesBySheet[grid.activeSheet] = [{
        id: "img-1",
        src: "data:image/png;base64,AA==",
        anchor: { c: "B", r: 3 },
        widthCm: 5,
        heightCm: 5
      }];
      grid.selectedImageId = null;
      grid.renderImages();

      const panel = grid.imageLayer.children[0];
      assert(panel, "Panel ảnh phải tồn tại");
      assert(!panel.className.includes("is-selected"), "Ảnh chưa chọn không được có class is-selected");

      // Kiểm tra 8 handles tồn tại trong DOM
      const handles = panel.children.filter(child => child.className?.includes("vno-handle-"));
      assert(handles.length === 8, `Phải có đủ 8 resize handles, thực tế: ${handles.length}`);

      // Khi chọn ảnh:
      grid.selectedImageId = "img-1";
      grid.renderImages();
      const selectedPanel = grid.imageLayer.children[0];
      assert(selectedPanel.className.includes("is-selected"), "Ảnh được chọn phải có class is-selected");

      // selectCell deselects ảnh:
      grid.selectCell("A", 1);
      assert(grid.selectedImageId === null, "selectCell phải hủy chọn ảnh");
    });
  } finally { globalThis.document = originalDocument; }
  return results;
}
