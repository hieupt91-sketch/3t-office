/**
 * Test Suite: VN Sheet Table (ListObject) Parity & Operations (AGY-TABLE)
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import {
  renameTableInStructuredReferences,
  renameColumnInStructuredReferences,
  expandStructuredReferences
} from "../../apps/sheet/structured-references.js";

const mockContainer = () => ({
  setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
  classList: { add() {}, remove() {}, toggle() {} }, focus() {}
});

export async function runSheetTableTests() {
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

  // 1. Rename table in structured references
  test("renameTableInStructuredReferences: đổi tên bảng đúng trong công thức", () => {
    const f1 = "=SUM(OldTable[Amount]) + AVERAGE(OldTable[Qty])";
    const out1 = renameTableInStructuredReferences(f1, "OldTable", "NewTable");
    eq(out1, "=SUM(NewTable[Amount]) + AVERAGE(NewTable[Qty])", "Table rename");
  });

  test("renameTableInStructuredReferences: không đổi tên bảng khác", () => {
    const f2 = "=SUM(OtherTable[Amount]) + OldTable[Qty]";
    const out2 = renameTableInStructuredReferences(f2, "OldTable", "NewTable");
    eq(out2, "=SUM(OtherTable[Amount]) + NewTable[Qty]", "Leave other tables");
  });

  // 2. Rename column in structured references
  test("renameColumnInStructuredReferences: đổi tên cột trong Table[OldCol]", () => {
    const f3 = "=SUM(Tbl[OldCol]) + Tbl[OtherCol]";
    const out3 = renameColumnInStructuredReferences(f3, "Tbl", "OldCol", "NewCol", false);
    eq(out3, "=SUM(Tbl[NewCol]) + Tbl[OtherCol]", "Column rename");
  });

  test("renameColumnInStructuredReferences: đổi tên cột trong [@OldCol] khi isSameTable=true", () => {
    const f4 = "=[@OldCol] * 2 + [@Other]";
    const out4 = renameColumnInStructuredReferences(f4, "Tbl", "OldCol", "NewCol", true);
    eq(out4, "=[@NewCol] * 2 + [@Other]", "This row column rename");
  });

  // 3. expandStructuredReferences with mode unlist
  test("expandStructuredReferences: mode unlist chuyển Table[Col] thành Sheet1!$A$2:$A$3", () => {
    const resolver = {
      byName: name => ({ name: "Sales", sheet: "Sheet1", ref: "A1:B3", hasHeaders: true, totals: false }),
      at: (s, c) => ({ name: "Sales", sheet: "Sheet1", ref: "A1:B3", hasHeaders: true, totals: false }),
      headerValue: (s, c) => ({ A1: "Col1", B1: "Col2" })[c]
    };
    const expanded = expandStructuredReferences("SUM(Sales[Col1])", { sheet: "Sheet1", coord: "D1" }, resolver, { mode: "unlist" });
    eq(expanded, "SUM(Sheet1!$A$2:$A$3)", "Unlist whole column");
  });

  test("expandStructuredReferences: mode unlist chuyển [@Col] thành Sheet1!$A2", () => {
    const resolver = {
      byName: name => ({ name: "Sales", sheet: "Sheet1", ref: "A1:B3", hasHeaders: true, totals: false }),
      at: (s, c) => ({ name: "Sales", sheet: "Sheet1", ref: "A1:B3", hasHeaders: true, totals: false }),
      headerValue: (s, c) => ({ A1: "Col1", B1: "Col2" })[c]
    };
    const expanded = expandStructuredReferences("[@Col1]*2", { sheet: "Sheet1", coord: "B2" }, resolver, { mode: "unlist" });
    eq(expanded, "Sheet1!$A2*2", "Unlist this row");
  });

  // 4. Grid controller: formatAsTable with headers
  test("Grid: formatAsTable tạo bảng có tiêu đề đúng cấu trúc", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Ten"); grid.setCellValue("B", 1, "Tuoi");
    grid.setCellValue("A", 2, "An"); grid.setCellValue("B", 2, 20);
    grid.setCellValue("A", 3, "Binh"); grid.setCellValue("B", 3, 25);
    const ok = grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "Table1", hasHeaders: true });
    eq(ok, true, "formatAsTable success");
    const tbl = grid._tableByName("Table1");
    eq(!!tbl, true, "table exists");
    eq(tbl.ref, "A1:B3", "table ref");
  });

  // 5. Grid controller: formatAsTable without headers shifts cells down
  test("Grid: formatAsTable không tiêu đề chèn Column1, Column2 và dịch dữ liệu xuống", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 10); grid.setCellValue("B", 1, 20);
    grid.setCellValue("A", 2, 30); grid.setCellValue("B", 2, 40);
    const ok = grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, false, { name: "TableNoH", hasHeaders: false });
    eq(ok, true, "formatAsTable success");
    const tbl = grid._tableByName("TableNoH");
    eq(tbl.ref, "A1:B3", "table ref expanded by 1 row");
    eq(grid.cellsData.get("A1")?.val, "Column1", "header A1");
    eq(grid.cellsData.get("B1")?.val, "Column2", "header B1");
    eq(grid.cellsData.get("A2")?.val, 10, "data shifted to A2");
  });

  // 6. Grid controller: resizeTable
  test("Grid: resizeTable mở rộng vùng bảng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "H1"); grid.setCellValue("B", 1, "H2");
    grid.setCellValue("A", 2, 1); grid.setCellValue("B", 2, 2);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, false, { name: "TblRsz", hasHeaders: true });
    const ok = grid.resizeTable("TblRsz", "A1:C3", false);
    eq(ok, true, "resizeTable success");
    const tbl = grid._tableByName("TblRsz");
    eq(tbl.ref, "A1:C3", "new ref");
    eq(grid.cellsData.get("C1")?.val, "Column1", "new column header");
  });

  test("Grid: resizeTable từ chối thay đổi hàng tiêu đề", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 2, "H1"); grid.setCellValue("B", 2, "H2");
    grid.setCellValue("A", 3, 1); grid.setCellValue("B", 3, 2);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 2 }, end: { c: "B", r: 3 } }, false, { name: "TblBadRsz", hasHeaders: true });
    const ok = grid.resizeTable("TblBadRsz", "A1:B3", false);
    eq(ok, false, "header row changed rejected");
  });

  // 7. Grid controller: toggleTableTotalRow
  test("Grid: toggleTableTotalRow bật dòng tổng với SUBTOTAL(109) cho cột số", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Dept"); grid.setCellValue("B", 1, "Salary");
    grid.setCellValue("A", 2, "IT"); grid.setCellValue("B", 2, 1000);
    grid.setCellValue("A", 3, "HR"); grid.setCellValue("B", 3, 1500);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "TblTot", hasHeaders: true });
    grid.toggleTableTotalRow("TblTot");
    const tbl = grid._tableByName("TblTot");
    eq(tbl.showTotals, true, "showTotals active");
    eq(tbl.ref, "A1:B4", "range expanded to A1:B4");
    eq(grid.cellsData.get("A4")?.val, "Total", "A4 label Total");
    eq(grid.cellsData.get("B4")?.formula, "=SUBTOTAL(109,[Salary])", "B4 SUBTOTAL formula");
  });

  test("Grid: toggleTableTotalRow bật dòng tổng với SUBTOTAL(103) cho cột chữ", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "ID"); grid.setCellValue("B", 1, "Status");
    grid.setCellValue("A", 2, 1); grid.setCellValue("B", 2, "Active");
    grid.setCellValue("A", 3, 2); grid.setCellValue("B", 3, "Pending");
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "TblTotTxt", hasHeaders: true });
    grid.toggleTableTotalRow("TblTotTxt");
    eq(grid.cellsData.get("B4")?.formula, "=SUBTOTAL(103,[Status])", "B4 SUBTOTAL 103 for text");
  });

  test("Grid: toggleTableTotalRow tắt dòng tổng thu hồi dòng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Dept"); grid.setCellValue("B", 1, "Salary");
    grid.setCellValue("A", 2, "IT"); grid.setCellValue("B", 2, 1000);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }, false, { name: "TblTotTgl", hasHeaders: true });
    grid.toggleTableTotalRow("TblTotTgl");
    grid.toggleTableTotalRow("TblTotTgl");
    const tbl = grid._tableByName("TblTotTgl");
    eq(tbl.showTotals, false, "showTotals false");
    eq(tbl.ref, "A1:B2", "ref returned to A1:B2");
  });

  // 8. Grid controller: convertTableToRange
  test("Grid: convertTableToRange gỡ bỏ bảng và đổi công thức có cấu trúc", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Col1"); grid.setCellValue("B", 1, "Col2");
    grid.setCellValue("A", 2, 10); grid.setCellValue("B", 2, 20);
    grid.setCellValue("A", 3, 30); grid.setCellValue("B", 3, 40);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "TblUnlist", hasHeaders: true });
    grid.setCellValue("D", 1, "=SUM(TblUnlist[Col1])");
    const ok = grid.convertTableToRange("TblUnlist", false);
    eq(ok, true, "convertTableToRange success");
    eq(grid.tablesBySheet[grid.activeSheet].length, 0, "no tables remaining");
    eq(grid.cellsData.get("D1")?.formula, "=SUM(Sheet1!$A$2:$A$3)", "formula converted to A1");
  });

  // 9. Grid controller: renameTable updates formulas
  test("Grid: renameTable cập nhật công thức trong bảng tính", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Amt");
    grid.setCellValue("A", 2, 100);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, false, { name: "OldName", hasHeaders: true });
    grid.setCellValue("C", 1, "=SUM(OldName[Amt])");
    grid.renameTable("OldName", "NewName", false);
    eq(grid.cellsData.get("C1")?.formula, "=SUM(NewName[Amt])", "formula updated with new table name");
  });

  // 10. Grid controller: renameTableColumn updates formulas
  test("Grid: renameTableColumn cập nhật tiêu đề và công thức", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "OldCol");
    grid.setCellValue("A", 2, 50);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, false, { name: "TblRenC", hasHeaders: true });
    grid.setCellValue("C", 1, "=SUM(TblRenC[OldCol])");
    grid.renameTableColumn("TblRenC", "OldCol", "NewCol", false);
    eq(grid.cellsData.get("A1")?.val, "NewCol", "header renamed");
    eq(grid.cellsData.get("C1")?.formula, "=SUM(TblRenC[NewCol])", "formula updated with new column name");
  });

  // 11. Grid controller: auto-expand table and propagate calculated columns on typing below
  test("Grid: gõ ô ngay dưới bảng tự mở rộng và điền công thức cột", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "Qty"); grid.setCellValue("B", 1, "Price"); grid.setCellValue("C", 1, "Total");
    grid.setCellValue("A", 2, 2); grid.setCellValue("B", 2, 10);
    grid.setCellValue("A", 3, 3); grid.setCellValue("B", 3, 20);
    grid.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "C", r: 3 } }, false, { name: "TblProp", hasHeaders: true });
    grid.setCellValue("C", 2, "=[@Qty]*[@Price]");
    grid.setCellValue("C", 3, "=[@Qty]*[@Price]");
    grid.setCellValue("A", 4, 5, false, { userInput: true, commit: true });
    const tbl = grid._tableByName("TblProp");
    eq(tbl.ref, "A1:C4", "table auto-expanded to row 4");
    eq(grid.cellsData.get("C4")?.formula, "=[@Qty]*[@Price]", "calculated formula propagated to C4");
  });

  return results;
}
