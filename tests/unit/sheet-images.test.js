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
  } finally { globalThis.document = originalDocument; }
  return results;
}
