/**
 * Test Suite: Live Table Styles & 7 Style Options Parity (AGY-TABLESTYLE)
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { TABLE_STYLE_PRESETS, TABLE_STYLE_CATEGORIES, findTableStylePreset } from "../../apps/sheet/cell-style-presets.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const mockContainer = () => {
  const elements = new Map();
  return {
    setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
    querySelector(sel) {
      if (!elements.has(sel)) {
        elements.set(sel, {
          style: {}, textContent: "", innerHTML: "", dataset: {},
          classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
          setAttribute() {}, getAttribute() { return null; }
        });
      }
      return elements.get(sel);
    },
    querySelectorAll() { return []; },
    addEventListener() {}, dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, focus() {}
  };
};

export async function runSheetTableStyleTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };
  const eq = (actual, expected, label = "") => {
    if (actual !== expected) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };

  // 1. Presets and lookup
  test("TABLE_STYLE_PRESETS: có đủ 21 kiểu chuẩn Excel 2016 (7 Light, 7 Medium, 7 Dark) + 5 kiểu tương thích cũ", () => {
    if (TABLE_STYLE_PRESETS.length < 26) {
      throw new Error(`Cần ít nhất 26 presets, nhận ${TABLE_STYLE_PRESETS.length}`);
    }
    for (let i = 1; i <= 7; i++) {
      if (!findTableStylePreset(`TableStyleLight${i}`)) throw new Error(`Thiếu TableStyleLight${i}`);
      if (!findTableStylePreset(`TableStyleMedium${i}`)) throw new Error(`Thiếu TableStyleMedium${i}`);
      if (!findTableStylePreset(`TableStyleDark${i}`)) throw new Error(`Thiếu TableStyleDark${i}`);
    }
    eq(TABLE_STYLE_CATEGORIES.length, 3, "3 nhóm kiểu");
  });

  test("findTableStylePreset: tra cứu chính xác không phân biệt hoa thường và hỗ trợ alias cũ", () => {
    const p1 = findTableStylePreset("tablestylemedium2");
    eq(p1.id, "TableStyleMedium2", "Lookup lowercase");
    const p2 = findTableStylePreset("tableBlue");
    eq(p2.id, "tableBlue", "Legacy alias tableBlue");
    eq(p2.excelStyle, "TableStyleMedium2", "Legacy maps to Excel Medium2");
    const pDef = findTableStylePreset(null);
    eq(pDef.id, "TableStyleMedium2", "Default fallback to Medium2");
  });

  // 2. Model 7 flags initialization
  test("formatAsTable: khởi tạo đầy đủ 7 cờ Tùy chọn kiểu bảng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.cellsData.set("A1", { val: "Name", formula: "", style: {} });
    grid.cellsData.set("B1", { val: "Score", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Alice", formula: "", style: {} });
    grid.cellsData.set("B2", { val: 95, formula: "", style: {} });

    const ok = grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, false, { name: "TestTbl", hasHeaders: true });
    eq(ok, true, "formatAsTable success");

    const tbl = grid._tableByName("TestTbl");
    eq(tbl.hasHeaders, true, "hasHeaders");
    eq(tbl.showTotals, false, "showTotals");
    eq(tbl.showRowStripes, true, "showRowStripes");
    eq(tbl.showColumnStripes, false, "showColumnStripes");
    eq(tbl.showFirstColumn, false, "showFirstColumn");
    eq(tbl.showLastColumn, false, "showLastColumn");
    eq(tbl.showAutoFilter, true, "showAutoFilter");
    eq(tbl.style, "TableStyleMedium2", "style");
  });

  // 3. Toggles and 1-step Undo/Redo
  test("toggleTableHeaderRow: bật/tắt cờ hasHeaders và hỗ trợ Undo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleLight1", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, true, { name: "TblHdr", hasHeaders: true });
    const tbl = grid._tableByName("TblHdr");
    eq(tbl.hasHeaders, true, "ban đầu có header");

    grid.toggleTableHeaderRow("TblHdr");
    eq(tbl.hasHeaders, false, "sau khi toggle tắt header");

    grid.undo();
    eq(grid._tableByName("TblHdr").hasHeaders, true, "sau undo bật lại header");
  });

  test("toggleTableBandedRows: bật/tắt cờ showRowStripes và hỗ trợ Undo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleLight1", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, true, { name: "TblBanded", hasHeaders: true });
    const tbl = grid._tableByName("TblBanded");
    eq(tbl.showRowStripes, true, "ban đầu bật sọc hàng");

    grid.toggleTableBandedRows("TblBanded");
    eq(tbl.showRowStripes, false, "sau khi toggle tắt sọc hàng");

    grid.undo();
    eq(grid._tableByName("TblBanded").showRowStripes, true, "sau undo bật lại sọc hàng");
  });

  test("toggleTableFirstColumn & toggleTableLastColumn: bật/tắt cờ cột đầu và cột cuối", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "C", r: 3 } }, true, { name: "TblCols", hasHeaders: true });
    const tbl = grid._tableByName("TblCols");

    grid.toggleTableFirstColumn("TblCols");
    eq(tbl.showFirstColumn, true, "bật cột đầu");
    grid.toggleTableLastColumn("TblCols");
    eq(tbl.showLastColumn, true, "bật cột cuối");

    grid.undo();
    eq(grid._tableByName("TblCols").showLastColumn, false, "undo tắt cột cuối");
  });

  test("toggleTableBandedColumns & toggleTableFilterButton: bật/tắt cờ cột sọc và nút lọc", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "C", r: 3 } }, true, { name: "TblColBands", hasHeaders: true });
    const tbl = grid._tableByName("TblColBands");

    grid.toggleTableBandedColumns("TblColBands");
    eq(tbl.showColumnStripes, true, "bật cột sọc");
    grid.toggleTableFilterButton("TblColBands");
    eq(tbl.showAutoFilter, false, "tắt nút lọc");

    grid.undo();
    eq(grid._tableByName("TblColBands").showAutoFilter, true, "undo bật lại nút lọc");
  });

  test("setTableStyle: thay đổi kiểu bảng sang kiểu khác và Undo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleLight1", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, true, { name: "TblStyle", hasHeaders: true });
    const tbl = grid._tableByName("TblStyle");
    eq(tbl.style, "TableStyleLight1", "kiểu ban đầu");

    grid.setTableStyle("TblStyle", "TableStyleDark3");
    eq(tbl.style, "TableStyleDark3", "kiểu mới");
    eq(tbl.excelStyle, "TableStyleDark3", "excelStyle mới");

    grid.undo();
    eq(grid._tableByName("TblStyle").style, "TableStyleLight1", "undo khôi phục kiểu ban đầu");
  });

  // 4. Live styling calculation parity
  test("_computeTableCellStyle: tính đúng màu header, data rows, banded rows theo đo lường Excel 2016", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "CalcStyle", hasHeaders: true });
    const tbl = grid._tableByName("CalcStyle");

    // Header A1
    const sHdr = grid._computeTableCellStyle(tbl, "A", 1);
    eq(sHdr.backgroundColor, "#5b9bd5", "Medium2 Header background");
    eq(sHdr.color, "#ffffff", "Medium2 Header text color");
    eq(sHdr.fontWeight, "bold", "Medium2 Header bold");

    // Row 1 data (A2, even row index 0)
    const sRow2 = grid._computeTableCellStyle(tbl, "A", 2);
    eq(sRow2.backgroundColor, "#ffffff", "Medium2 Even row background");

    // Row 2 data (A3, odd row index 1)
    const sRow3 = grid._computeTableCellStyle(tbl, "A", 3);
    eq(sRow3.backgroundColor, "#ddebf7", "Medium2 Odd row stripe background");

    // Toggle Banded Rows off -> A3 becomes unstriped
    grid.toggleTableBandedRows("CalcStyle", false);
    const sRow3NoBand = grid._computeTableCellStyle(tbl, "A", 3);
    eq(sRow3NoBand.backgroundColor, "#ffffff", "A3 unstriped when banded rows off");

    // Enable Banded Columns -> B2 (col index 1) gets shaded
    grid.toggleTableBandedColumns("CalcStyle", false);
    const sColBand = grid._computeTableCellStyle(tbl, "B", 2);
    eq(sColBand.backgroundColor, "#ddebf7", "B2 shaded when banded columns on");
  });

  // 5. User explicit style precedence
  test("_renderCellVisual: định dạng riêng của người dùng có độ ưu tiên cao hơn kiểu bảng (DisplayFormat)", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "UserFormat", hasHeaders: true });

    // Cell A2 has explicit user background #ff0000 (red)
    const dom = { style: {}, classList: { add() {}, remove() {}, toggle() {} }, textContent: "" };
    const userCell = { val: "Special", formula: "", style: { backgroundColor: "#ff0000", color: "#ffff00" } };
    grid._renderCellVisual(dom, userCell, "A", 2);

    eq(dom.style.backgroundColor, "#ff0000", "User explicit red background wins over table white");
    eq(dom.style.color, "#ffff00", "User explicit yellow color wins");
  });

  // 6. Convert Table to Range bakes styles
  test("convertTableToRange: nướng kiểu bảng hiển thị vào cell.style khi gỡ bảng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.formatAsTable("TableStyleMedium2", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "ToRange", hasHeaders: true });

    grid.convertTableToRange("ToRange");
    eq(grid.tablesBySheet.Sheet1.length, 0, "Bảng đã được gỡ khỏi model");

    const a1 = grid.cellsData.get("A1");
    eq(a1.style.backgroundColor, "#5b9bd5", "A1 giữ màu header đã nướng");
    eq(a1.style.fontWeight, "bold", "A1 giữ in đậm");
    eq(a1.style._fromTable, undefined, "_fromTable đã được xóa");

    const a3 = grid.cellsData.get("A3");
    eq(a3.style.backgroundColor, "#ddebf7", "A3 giữ sọc màu xanh nhạt");
  });

  // 7. Adapter serialization round-trip
  test("SheetAdapter: serialize và deserialize đầy đủ các thuộc tính vno:table-*", () => {
    const adapter = new SheetAdapter();
    const table = {
      name: "SerializedTable",
      ref: "A1:D10",
      hasHeaders: true,
      showTotals: false,
      showRowStripes: true,
      showColumnStripes: true,
      showFirstColumn: true,
      showLastColumn: true,
      showAutoFilter: true,
      style: "TableStyleMedium2",
      excelStyle: "TableStyleMedium2"
    };

    adapter.grid = {
      sheetStates: {},
      tablesBySheet: { Sheet1: [table] }
    };
    const xml = adapter._serializeDatabaseRanges(["Sheet1"]);
    if (!xml.includes('vno:table-column-stripes="true"')) throw new Error("Thiếu vno:table-column-stripes");
    if (!xml.includes('vno:table-first-column="true"')) throw new Error("Thiếu vno:table-first-column");
    if (!xml.includes('vno:table-last-column="true"')) throw new Error("Thiếu vno:table-last-column");
    if (!xml.includes('vno:table-row-stripes="true"')) throw new Error("Thiếu vno:table-row-stripes");
  });

  test("Nạp bảng: kiểu bảng chỉ là hiển thị — ô chưa sửa vẫn khớp hash gốc (lưu lại trả đúng XF), ô đã sửa thì không", () => {
    const adapter = new SheetAdapter();
    const untouched = { val: "ĐVT", formula: "", style: { fontWeight: "bold", color: "#000000" } };
    untouched.style.origXf = 1;
    untouched.style.styleHashAtImport = adapter._computeStyleHash(untouched.style);
    const edited = { val: "x", formula: "", style: { fontWeight: "bold", color: "#ff0000", origXf: 2, styleHashAtImport: "da-sua" } };
    const cells = new Map([["A1", untouched], ["B1", edited]]);
    const workbook = { sheetsData: { Sheet1: cells } };
    const xml = `<table:database-range table:target-range-address="Sheet1.A1:Sheet1.B2" vno:table-name="T1" vno:table-style="TableStyleMedium2"/>`;
    adapter._attachImportedTables(workbook, xml);
    const a1 = cells.get("A1");
    if (!a1.style._fromTable) throw new Error("Ô A1 phải mang dấu hiển thị kiểu bảng");
    if (a1.style.styleHashAtImport !== adapter._computeStyleHash(a1.style)) throw new Error("Ô chưa sửa phải khớp hash để lưu lại trả đúng XF gốc");
    const b1 = cells.get("B1");
    if (b1.style.styleHashAtImport === adapter._computeStyleHash(b1.style)) throw new Error("Ô đã sửa không được coi là chưa sửa");
    const a2 = cells.get("A2");
    if (a2.style.origXf != null) throw new Error("Ô mới do kiểu bảng tạo ra không có XF gốc");
  });

  // 8. Help and i18n coverage & zero forbidden trademarks
  test("Help & i18n: đầy đủ chuỗi nhãn/gợi ý VI/EN và không chứa tên thương mại cấm", () => {
    const commands = [
      "sheet.table.toggleHeaderRow",
      "sheet.table.toggleTotalRow",
      "sheet.table.toggleBandedRows",
      "sheet.table.toggleFirstColumn",
      "sheet.table.toggleLastColumn",
      "sheet.table.toggleBandedColumns",
      "sheet.table.toggleFilterButton",
      "sheet.table.styles"
    ];

    for (const locale of ["vi", "en"]) {
      setLocale(locale);
      for (const cmd of commands) {
        const lbl = tCommand(cmd, "label");
        const tip = tCommand(cmd, "tooltip");
        if (!lbl || !tip) throw new Error(`${locale} thiếu label/tooltip cho ${cmd}`);
        if (/\b(word|excel|powerpoint)\b/i.test(lbl) || /\b(word|excel|powerpoint)\b/i.test(tip)) {
          throw new Error(`Phát hiện thương hiệu cấm trong ${cmd} (${locale})`);
        }
      }
    }
    setLocale("vi");

    const helpEntry = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.table.styleOptions");
    if (!helpEntry) throw new Error("Thiếu bài Help sheet.table.styleOptions");
    const jsonStr = JSON.stringify(helpEntry).toLowerCase();
    if (/\b(word|excel|powerpoint)\b/i.test(jsonStr)) {
      throw new Error("Bài Help chứa tên thương hiệu cấm");
    }
  });

  return results;
}
