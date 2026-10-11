/**
 * VN Sheet — Unit & Behavioral Tests: Styles and Editing Groups
 * Kiểm thử bố cục Ribbon Home tab, Cell Styles, Format as Table, Fill Down/Right, Clear All/Formats/Contents
 */

import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS, COMMON_COMMANDS, registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { CommandBus } from "../../platform/commands/command-bus.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { mapVnCommandToUno, getVnCommand } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { CELL_STYLE_PRESETS, TABLE_STYLE_PRESETS } from "../../apps/sheet/cell-styles.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function createMockContainer() {
  const domMap = new Map();
  return {
    setAttribute() {},
    focus() {},
    querySelector(sel) {
      const coordMatch = sel.match(/data-coord="([^"]+)"/);
      if (coordMatch) {
        const coord = coordMatch[1];
        if (!domMap.has(coord)) {
          domMap.set(coord, {
            textContent: "",
            innerHTML: "",
            style: {},
            classList: {
              add() {},
              remove() {},
              toggle() {},
              contains() { return false; }
            },
            dataset: { coord }
          });
        }
        return domMap.get(coord);
      }
      return null;
    },
    querySelectorAll() { return []; },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetEditingStylesTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // TEST 1: Ribbon Group Layout & Ordering
  test("Sheet Ribbon: Thứ tự chuẩn Excel Number -> Styles -> Cells -> Editing", () => {
    const homeTab = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    assert(homeTab, "Thiếu tab Trang đầu (home)");

    const groupKeys = homeTab.groups.map(g => g.labelKey);
    const numIdx = groupKeys.indexOf("sheetRibbon.group.number");
    const stylesIdx = groupKeys.indexOf("sheetRibbon.group.styles");
    const cellsIdx = groupKeys.indexOf("sheetRibbon.group.cells");
    const editIdx = groupKeys.indexOf("sheetRibbon.group.editing");

    assert(numIdx !== -1, "Thiếu nhóm Number");
    assert(stylesIdx !== -1, "Thiếu nhóm Styles");
    assert(cellsIdx !== -1, "Thiếu nhóm Cells");
    assert(editIdx !== -1, "Thiếu nhóm Editing");

    assert(stylesIdx === numIdx + 1, "Nhóm Styles phải nằm NGAY SAU nhóm Number");
    assert(cellsIdx === stylesIdx + 1, "Nhóm Cells phải nằm NGAY SAU nhóm Styles");
    assert(editIdx === groupKeys.length - 1, "Nhóm Editing phải nằm ở vị trí cuối cùng bên phải");
  });

  // TEST 2: "One feature one display" - Conditional Formatting
  test("Sheet Ribbon: Conditional Formatting dời sang Styles, không trùng lặp ở Editing", () => {
    const homeTab = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    const stylesGroup = homeTab.groups.find(g => g.labelKey === "sheetRibbon.group.styles");
    // AutoSum/Sort/Filter đã gộp vào đúng 1 nhóm Editing duy nhất theo thứ tự Excel thật
    // (Excel không có nhóm "quickAnalysis" riêng — AutoSum/Fill/Clear/Sort/Find đều chung 1 nhóm Editing).
    const editingGroup = homeTab.groups.find(g => g.labelKey === "sheetRibbon.group.editing");

    const stylesJson = JSON.stringify(stylesGroup);
    const editingJson = JSON.stringify(editingGroup);

    assert(stylesJson.includes("sheet.format.conditional"), "Nhóm Styles phải chứa sheet.format.conditional");
    assert(!editingJson.includes("sheet.format.conditional"), "Nhóm Editing KHÔNG được còn sheet.format.conditional");
    assert(stylesJson.includes("sheet.style.formatAsTable"), "Nhóm Styles phải chứa sheet.style.formatAsTable");
    assert(stylesJson.includes("sheet.style.cellStyles"), "Nhóm Styles phải chứa sheet.style.cellStyles");
  });

  // TEST 3: Editing Group Buttons
  test("Sheet Ribbon: Nhóm Editing chứa Fill Down/Right, Clear All/Formats/Contents, Find/Replace", () => {
    const homeTab = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    const editingGroup = homeTab.groups.find(g => g.labelKey === "sheetRibbon.group.editing");
    assert(editingGroup, "Thiếu nhóm Editing");

    const editJson = JSON.stringify(editingGroup);
    assert(editJson.includes("sheet.edit.fillDown"), "Thiếu sheet.edit.fillDown");
    assert(editJson.includes("sheet.edit.fillRight"), "Thiếu sheet.edit.fillRight");
    assert(editJson.includes("sheet.edit.clearAll"), "Thiếu sheet.edit.clearAll");
    assert(editJson.includes("sheet.edit.clearFormats"), "Thiếu sheet.edit.clearFormats");
    assert(editJson.includes("sheet.edit.clearContents"), "Thiếu sheet.edit.clearContents");
    assert(editJson.includes("common.edit.find"), "Thiếu common.edit.find");
    assert(editJson.includes("common.edit.replace"), "Thiếu common.edit.replace");
  });

  // TEST 4: Shortcuts Scope Isolation (Ctrl+D và Ctrl+R)
  test("Sheet Shortcuts: Ctrl+D và Ctrl+R trong scope sheet không xung đột với slides", () => {
    const bus = new CommandBus();
    globalShortcutManager._shortcuts.clear();
    globalShortcutManager._scopedShortcuts = new Map([["common", new Map()]]);
    globalShortcutManager.setActiveScope(null);
    registerAllStandardCommands(bus);

    // Kích hoạt scope sheet
    globalShortcutManager.setActiveScope("sheet");
    const ctrlD_sheet = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+D"));
    const ctrlR_sheet = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+R"));
    assert(ctrlD_sheet === "sheet.edit.fillDown", `Scope sheet: Ctrl+D phải trỏ về sheet.edit.fillDown, nhận: ${ctrlD_sheet}`);
    assert(ctrlR_sheet === "sheet.edit.fillRight", `Scope sheet: Ctrl+R phải trỏ về sheet.edit.fillRight, nhận: ${ctrlR_sheet}`);

    // Kích hoạt scope slides
    globalShortcutManager.setActiveScope("slides");
    const ctrlD_slides = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+D"));
    assert(ctrlD_slides === "slides.slide.duplicate", `Scope slides: Ctrl+D phải trỏ về slides.slide.duplicate, nhận: ${ctrlD_slides}`);
  });

  // TEST 5: UNO Command Mapping
  test("Sheet Adapter: Ánh xạ 2 chiều chuẩn xác cho toàn bộ 7 command Styles & Editing mới", () => {
    const pairs = [
      ["sheet.style.formatAsTable", ".uno:AutoFormat"],
      ["sheet.style.cellStyles", ".uno:StyleCatalog"],
      ["sheet.edit.fillDown", ".uno:FillDown"],
      ["sheet.edit.fillRight", ".uno:FillRight"],
      ["sheet.edit.clearAll", ".uno:ClearAll"],
      ["sheet.edit.clearFormats", ".uno:DeleteFormat"],
      ["sheet.edit.clearContents", ".uno:ClearContents"]
    ];

    for (const [vnId, expectedUno] of pairs) {
      const uno = mapVnCommandToUno(vnId);
      assert(uno === expectedUno, `${vnId} ánh xạ sang UNO phải là ${expectedUno}, nhận: ${uno}`);
      const reverseVn = getVnCommand(expectedUno);
      assert(reverseVn === vnId, `${expectedUno} ánh xạ ngược lại phải là ${vnId}, nhận: ${reverseVn}`);
    }
  });

  // TEST 6: SVG Vector Icons Check
  test("Sheet UI Kit: Các icon mới (cellStyles, fillDown, fillRight, clearAll, clearContents, formatTable) đều là SVG đa sắc chuẩn", () => {
    const requiredIcons = ["cellStyles", "fillDown", "fillRight", "clearAll", "clearContents", "formatTable"];
    for (const name of requiredIcons) {
      const svg = ICONS[name];
      assert(typeof svg === "string" && svg.includes("<svg"), `Icon ${name} phải là chuỗi SVG`);
      assert(!svg.includes('<circle cx="12" cy="12" r="4"/>'), `Icon ${name} không được dùng circle fallback`);
    }
  });

  // TEST 7: i18n Localization
  test("Sheet i18n: Đầy đủ bản dịch song ngữ VI/EN cho tất cả các commands và ribbon groups", () => {
    const cmdKeys = [
      "sheet.style.formatAsTable", "sheet.style.cellStyles",
      "sheet.edit.fillDown", "sheet.edit.fillRight",
      "sheet.edit.clearAll", "sheet.edit.clearFormats", "sheet.edit.clearContents"
    ];

    for (const key of cmdKeys) {
      assert(viStrings.commands[key]?.label, `VI thiếu label cho ${key}`);
      assert(enStrings.commands[key]?.label, `EN thiếu label cho ${key}`);
      assert(viStrings.commands[key]?.tooltip, `VI thiếu tooltip cho ${key}`);
      assert(enStrings.commands[key]?.tooltip, `EN thiếu tooltip cho ${key}`);
    }

    assert(viStrings.sheetRibbon.group.styles === "Kiểu ô", "VI thiếu group.styles");
    assert(enStrings.sheetRibbon.group.styles === "Styles", "EN thiếu group.styles");
    assert(viStrings.sheetRibbon.group.editing === "Chỉnh sửa", "VI thiếu group.editing");
    assert(enStrings.sheetRibbon.group.editing === "Editing", "EN thiếu group.editing");
  });

  // TEST 8: Behavioral — Cell Styles Application & Undo/Redo
  test("Behavioral: Cell Styles áp dụng chính xác cho vùng chọn và hoàn tác (Undo/Redo) đối xứng", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };

    // Áp dụng Good style
    grid.applyCellStyle("good");
    const a1 = grid.cellsData.get("A1");
    const b2 = grid.cellsData.get("B2");
    assert(a1?.style?.backgroundColor === "#c6efce", `A1 background phải là #c6efce, nhận: ${a1?.style?.backgroundColor}`);
    assert(a1?.style?.color === "#006100", `A1 color phải là #006100, nhận: ${a1?.style?.color}`);
    assert(b2?.style?.backgroundColor === "#c6efce", `B2 background phải là #c6efce`);

    // Áp dụng Heading 1
    grid.applyCellStyle("heading1");
    const a1_h1 = grid.cellsData.get("A1");
    assert(a1_h1?.style?.fontWeight === "bold", "Heading 1 phải có fontWeight bold");
    assert(a1_h1?.style?.fontSize === "16px", "Heading 1 phải có fontSize 16px");

    // Undo -> quay lại Good style
    grid.undo();
    const a1_afterUndo = grid.cellsData.get("A1");
    assert(a1_afterUndo?.style?.backgroundColor === "#c6efce", "Sau Undo phải phục hồi style Good");

    // Undo lần nữa -> quay lại style rỗng ban đầu
    grid.undo();
    const a1_initial = grid.cellsData.get("A1");
    assert(!a1_initial?.style?.backgroundColor, "Sau Undo thứ hai phải về trạng thái ban đầu");

    // Redo -> khôi phục Good style
    grid.redo();
    assert(grid.cellsData.get("A1")?.style?.backgroundColor === "#c6efce", "Sau Redo phải khôi phục style Good");
  });

  // TEST 9: Behavioral — Format as Table Banded Rows
  test("Behavioral: Format as Table tạo hàng tiêu đề và hàng chẵn/lẻ xen kẽ (Banded Rows)", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "C", r: 4 } };

    grid.formatAsTable("tableBlue");
    assert(grid.tablesBySheet.Sheet1?.[0]?.name === "Table1", "Format as Table phải tạo model bảng có tên");
    assert(grid.tablesBySheet.Sheet1?.[0]?.ref === "A1:C4", "Model bảng phải lưu vùng đã chọn");

    // Hàng 1 là Header
    const a1 = grid.cellsData.get("A1");
    assert(a1?.style?.backgroundColor === "#2563eb", `Header row phải có nền xanh #2563eb, nhận: ${a1?.style?.backgroundColor}`);
    assert(a1?.style?.color === "#ffffff", "Header row phải có chữ trắng");
    assert(a1?.style?.fontWeight === "bold", "Header row phải in đậm");

    // Hàng 2 là hàng chẵn xen kẽ (Banded even row)
    const a2 = grid.cellsData.get("A2");
    assert(a2?.style?.backgroundColor === "#f0f7ff", `Banded row 2 phải có nền xen kẽ #f0f7ff, nhận: ${a2?.style?.backgroundColor}`);

    // Hàng 3 là hàng lẻ
    const a3 = grid.cellsData.get("A3");
    assert(a3?.style?.backgroundColor === "#ffffff", `Banded row 3 phải có nền trắng #ffffff, nhận: ${a3?.style?.backgroundColor}`);

    // Hàng 4 là hàng chẵn
    const a4 = grid.cellsData.get("A4");
    assert(a4?.style?.backgroundColor === "#f0f7ff", `Banded row 4 phải có nền xen kẽ #f0f7ff`);

    // Undo hoàn tác cả bảng trong 1 bước
    grid.undo();
    assert(!grid.cellsData.get("A1")?.style?.backgroundColor, "Sau Undo toàn bộ bảng phải trở về bình thường");
    assert(grid.tablesBySheet.Sheet1.length === 0, "Undo phải gỡ model bảng");
    assert(!grid.isFilterActive, "Undo phải khôi phục trạng thái lọc trước khi tạo bảng");
  });

  test("Behavioral: bảng hỗ trợ tên, tiêu đề tùy chọn, đổi tên và chuyển thành vùng", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.cellsData.set("A1", { val: "Data", formula: "", style: {} });
    grid.cellsData.set("A2", { val: 12, formula: "", style: {} });
    const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };
    assert(grid.formatAsTable("tableGreen", range, true, { name: "Sales_2026", hasHeaders: false }), "Bảng không tiêu đề phải tạo được");
    assert(grid.tablesBySheet.Sheet1[0].hasHeaders === false, "Model phải giữ cờ không có tiêu đề");
    assert(grid.renameTable("Sales_2026", "AnnualSales"), "Đổi tên bảng phải thành công");
    assert(grid.tablesBySheet.Sheet1[0].name === "AnnualSales", "Tên mới phải được lưu");
    assert(grid.convertTableToRange("AnnualSales"), "Chuyển thành vùng phải thành công");
    assert(grid.tablesBySheet.Sheet1.length === 0, "Chuyển thành vùng phải xóa cấu trúc bảng");
  });

  test("Behavioral: chặn vùng bảng chồng lấp và tên trùng", () => {
    const grid = new SheetGridController(createMockContainer());
    const first = { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } };
    const overlap = { start: { c: "B", r: 2 }, end: { c: "C", r: 4 } };
    assert(grid.formatAsTable("tableBlue", first, true, { name: "Orders" }), "Bảng đầu tiên phải tạo được");
    assert(!grid.formatAsTable("tableGreen", overlap, true, { name: "Other" }), "Không cho tạo bảng chồng lấp");
    assert(!grid.formatAsTable("tableGreen", { start: { c: "D", r: 1 }, end: { c: "E", r: 2 } }, true, { name: "Orders" }), "Không cho trùng tên bảng");
  });

  test("Behavioral: nhập ngay dưới bảng mở rộng vùng và Undo/Redo giữ cấu trúc", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.cellsData.set("A1", { val: "Name", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Mai", formula: "", style: {} });
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } });
    grid.setCellValue("A", 3, "Lan", true, { userInput: true, commit: true });
    assert(grid.tablesBySheet.Sheet1[0].ref === "A1:A3", "Bảng phải nới tới hàng vừa nhập");
    grid.undo();
    assert(grid.tablesBySheet.Sheet1[0].ref === "A1:A2", "Undo phải thu vùng về kích thước cũ");
    grid.redo();
    assert(grid.tablesBySheet.Sheet1[0].ref === "A1:A3", "Redo phải khôi phục vùng đã nới");
  });

  test("Adapter: bảng có tên được serialize thành database range riêng AutoFilter", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.cellsData.set("A1", { val: "Item", formula: "", style: {} });
    grid.cellsData.set("B1", { val: "Value", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Pen", formula: "", style: {} });
    grid.cellsData.set("B2", { val: 5, formula: "", style: {} });
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };
    grid.formatAsTable("tableGreen", grid.selectionRange, false, { name: "Inventory", hasHeaders: true });
    const adapter = new SheetAdapter(grid);
    const xml = adapter._serializeDatabaseRanges(["Sheet1"]);
    assert(xml.includes('table:name="Inventory"'), "Tên bảng phải nằm trong database range thật");
    assert(xml.includes('vno:table-style="TableStyleMedium4"'), "Kiểu bảng phải được serialize");
    assert(xml.includes('table:target-range-address="Sheet1.A1:Sheet1.B2"'), "Vùng bảng phải được serialize");
    assert(!xml.includes("__Anonymous_Sheet_DB__"), "Bảng thật không được serialize thành AutoFilter ẩn danh");
    const workbook = { sheetsData: { Sheet1: new Map([["A1", { val: "Item", style: {} }]]) } };
    adapter._attachImportedTables(workbook, xml);
    assert(workbook.tablesBySheet.Sheet1[0].name === "Inventory", "Adapter phải khôi phục bảng vào model mở tệp");
  });

  // TEST 10: Behavioral — Fill Down & Relative Formula Offsetting
  test("Behavioral: Fill Down sao chép giá trị và tự động dịch tham chiếu công thức tương đối", () => {
    const grid = new SheetGridController(createMockContainer());

    // Ô A1 có công thức tính toán tương đối và tuyệt đối
    grid.setCellValue("B1", 1, 10);
    grid.setCellValue("B2", 1, 20);
    grid.setCellValue("B3", 1, 30);
    grid.setCellValue("C1", 1, 5);

    // A1 = B1 + $C$1
    grid.setCellValue("A", 1, "=B1+$C$1");

    // Chọn vùng A1:A3 để Fill Down
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 3 } };
    grid.fillDown();

    const a2 = grid.cellsData.get("A2");
    const a3 = grid.cellsData.get("A3");

    assert(a2, "A2 phải được điền dữ liệu");
    assert(a2.formula === "=B2+$C$1", `A2 formula phải dịch thành =B2+$C$1, nhận: ${a2.formula}`);
    assert(a3.formula === "=B3+$C$1", `A3 formula phải dịch thành =B3+$C$1, nhận: ${a3.formula}`);

    // Undo
    grid.undo();
    assert(grid.cellsData.get("A2")?.formula === "", "Sau Undo, A2 phải trở về rỗng");
    assert(grid.cellsData.get("A3")?.formula === "", "Sau Undo, A3 phải trở về rỗng");
  });

  // TEST 11: Behavioral — Fill Right & Relative Column Offsetting
  test("Behavioral: Fill Right sao chép giá trị và tự động dịch tham chiếu cột tương đối", () => {
    const grid = new SheetGridController(createMockContainer());

    grid.setCellValue("A2", 2, 50);
    grid.setCellValue("B2", 2, 100);
    grid.setCellValue("C2", 2, 150);

    // A1 = =A2*2
    grid.setCellValue("A", 1, "=A2*2");

    // Chọn vùng A1:C1 để Fill Right
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "C", r: 1 } };
    grid.fillRight();

    const b1 = grid.cellsData.get("B1");
    const c1 = grid.cellsData.get("C1");

    assert(b1, "B1 phải được điền dữ liệu");
    assert(b1.formula === "=B2*2", `B1 formula phải dịch thành =B2*2, nhận: ${b1.formula}`);
    assert(c1.formula === "=C2*2", `C1 formula phải dịch thành =C2*2, nhận: ${c1.formula}`);
  });

  function createBareContainer() {
    return {
      setAttribute() {},
      focus() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      classList: { add() {}, remove() {}, toggle() {} }
    };
  }

  function simulateClick(grid, col, row, shiftKey = false) {
    grid._startRangeSelect({ shiftKey: !!shiftKey, button: 0 }, col, row);
    grid._isSelectingRange = false;
    grid.selectCell(col, row, !!shiftKey);
  }

  // TEST 10b: Bug thật — Shift+Click chuột (mousedown) rồi Ctrl+D Fill Down
  test("Behavioral: Shift+Click 3 ô (chuỗi mousedown/click) rồi Fill Down dịch công thức tương đối", () => {
    const grid = new SheetGridController(createBareContainer());
    grid.setCellValue("F", 2, "100");
    grid.setCellValue("F", 3, "200");
    grid.setCellValue("F", 4, "300");
    grid.setCellValue("G", 2, "=F2*2");

    simulateClick(grid, "G", 2, false);
    simulateClick(grid, "G", 4, true);

    assert(grid.getSelectedRangeLabel() === "G2:G4", `Shift+Click G2→G4 phải chọn G2:G4, nhận: ${grid.getSelectedRangeLabel()}`);
    assert(grid.selectionRange.start.c === "G" && grid.selectionRange.start.r === 2, "Neo start phải giữ G2");
    assert(grid.selectionRange.end.c === "G" && grid.selectionRange.end.r === 4, "End phải là G4");
    assert(grid._rangeAnchor.c === "G" && grid._rangeAnchor.r === 2, "Neo range phải giữ G2");
    assert(grid.selectedCoord.c === "G" && grid.selectedCoord.r === 4, "selectedCoord phải theo ô cuối G4");

    grid.fillDown();

    const g3 = grid.cellsData.get("G3");
    const g4 = grid.cellsData.get("G4");
    assert(g3, "G3 phải được điền sau Fill Down");
    assert(g3.formula === "=F3*2", `G3 formula phải là =F3*2, nhận: ${g3.formula}`);
    assert(String(g3.val) === "400", `G3 val phải là 400, nhận: ${g3.val}`);
    assert(g4, "G4 phải được điền sau Fill Down");
    assert(g4.formula === "=F4*2", `G4 formula phải là =F4*2, nhận: ${g4.formula}`);
    assert(String(g4.val) === "600", `G4 val phải là 600, nhận: ${g4.val}`);
  });

  // TEST 11b: Cùng root cause — Shift+Click rồi Fill Right
  test("Behavioral: Shift+Click 3 ô (chuỗi mousedown/click) rồi Fill Right dịch công thức tương đối", () => {
    const grid = new SheetGridController(createBareContainer());
    grid.setCellValue("F", 2, "100");
    grid.setCellValue("G", 2, "200");
    grid.setCellValue("H", 2, "300");
    grid.setCellValue("F", 3, "=F2*2");

    simulateClick(grid, "F", 3, false);
    simulateClick(grid, "H", 3, true);

    assert(grid.getSelectedRangeLabel() === "F3:H3", `Shift+Click F3→H3 phải chọn F3:H3, nhận: ${grid.getSelectedRangeLabel()}`);

    grid.fillRight();

    const g3 = grid.cellsData.get("G3");
    const h3 = grid.cellsData.get("H3");
    assert(g3?.formula === "=G2*2", `G3 formula phải là =G2*2, nhận: ${g3?.formula}`);
    assert(String(g3?.val) === "400", `G3 val phải là 400, nhận: ${g3?.val}`);
    assert(h3?.formula === "=H2*2", `H3 formula phải là =H2*2, nhận: ${h3?.formula}`);
    assert(String(h3?.val) === "600", `H3 val phải là 600, nhận: ${h3?.val}`);
  });

  // TEST 12: Behavioral — Clear All, Clear Formats, Clear Contents
  test("Behavioral: Clear All, Clear Formats và Clear Contents phân biệt rõ ràng nội dung vs định dạng", () => {
    const grid = new SheetGridController(createMockContainer());

    // Thiết lập ô A1 có cả giá trị và style
    grid.setCellValue("A", 1, "Dữ liệu thử nghiệm");
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    grid.setStyle("backgroundColor", "#fca5a5");
    grid.setStyle("fontWeight", "bold");

    // Kiểm tra ban đầu
    let item = grid.cellsData.get("A1");
    assert(item.val === "Dữ liệu thử nghiệm", "Giá trị ban đầu sai");
    assert(item.style.backgroundColor === "#fca5a5", "Style ban đầu sai");

    // 1. Clear Formats -> Giữ nguyên giá trị, xóa style
    grid.clearFormats();
    item = grid.cellsData.get("A1");
    assert(item.val === "Dữ liệu thử nghiệm", "Clear Formats phải GIỮ NGUYÊN giá trị");
    assert(Object.keys(item.style).length === 0, "Clear Formats phải XÓA TOÀN BỘ style");

    // Undo phục hồi style
    grid.undo();
    item = grid.cellsData.get("A1");
    assert(item.style.backgroundColor === "#fca5a5", "Undo phải phục hồi style");

    // 2. Clear Contents -> Giữ nguyên style, xóa giá trị
    grid.clearContents();
    item = grid.cellsData.get("A1");
    assert(item.val === "", "Clear Contents phải XÓA giá trị về rỗng");
    assert(item.style.backgroundColor === "#fca5a5", "Clear Contents phải GIỮ NGUYÊN style");

    // Undo phục hồi giá trị
    grid.undo();
    item = grid.cellsData.get("A1");
    assert(item.val === "Dữ liệu thử nghiệm", "Undo phải phục hồi giá trị");

    // 3. Clear All -> Xóa cả giá trị VÀ style
    grid.clearAll();
    item = grid.cellsData.get("A1");
    assert(item.val === "", "Clear All phải xóa giá trị");
    assert(Object.keys(item.style).length === 0, "Clear All phải xóa style");

    // Undo phục hồi cả hai
    grid.undo();
    item = grid.cellsData.get("A1");
    assert(item.val === "Dữ liệu thử nghiệm", "Undo Clear All phải phục hồi giá trị");
    assert(item.style.backgroundColor === "#fca5a5", "Undo Clear All phải phục hồi style");
  });

  test("Sheet Find/Replace: tìm tiếp, thay một ô, thay tất cả và Undo", () => {
    const grid = new SheetGridController(createMockContainer());
    grid.setCellValue("A", 1, "chi phí quý 1");
    grid.setCellValue("B", 1, "chi phí nhân sự");
    grid.setCellValue("C", 1, "=A1");
    grid.setCellValue("D", 1, "không khớp");

    const first = grid.findNext("chi phí");
    assert(first === "A1", `findNext phải ra A1, nhận: ${first}`);
    const second = grid.findNext("chi phí");
    assert(second === "B1", `findNext lần 2 phải ra B1, nhận: ${second}`);

    grid.selectCell("A", 1);
    assert(grid.replaceOne("chi phí", "ngân sách") === true, "replaceOne thất bại");
    assert(grid.cellsData.get("A1").val === "ngân sách quý 1", `A1 sau replaceOne: ${grid.cellsData.get("A1").val}`);
    assert(grid.cellsData.get("B1").val === "chi phí nhân sự", "replaceOne không được đụng B1");

    const count = grid.replaceAll("chi phí", "ngân sách");
    assert(count >= 1, `replaceAll phải đổi ít nhất 1 lần, nhận: ${count}`);
    assert(grid.cellsData.get("B1").val === "ngân sách nhân sự", `B1 sau replaceAll: ${grid.cellsData.get("B1").val}`);
    assert(String(grid.cellsData.get("C1").formula).includes("A1"), "Công thức =A1 không chứa 'chi phí' phải giữ nguyên");
    assert(grid.cellsData.get("D1").val === "không khớp", "Ô không khớp phải giữ nguyên");

    assert(grid.undo() === true, "Undo replaceAll");
    assert(grid.cellsData.get("B1").val === "chi phí nhân sự", `Undo replaceAll phải trả B1, nhận: ${grid.cellsData.get("B1").val}`);
  });

  test("Sheet Adapter: bind và dispatch common.edit.replace", () => {
    const grid = new SheetGridController(createMockContainer());
    const adapter = new SheetAdapter(grid);
    adapter.attach();
    assert(adapter._showFindReplaceDialog(false) === true, "find dialog");
    assert(adapter._showFindReplaceDialog(true) === true, "replace dialog");
  });

  return results;
}
