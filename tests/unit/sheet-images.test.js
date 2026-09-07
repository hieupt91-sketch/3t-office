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
  } finally { globalThis.document = originalDocument; }
  return results;
}
