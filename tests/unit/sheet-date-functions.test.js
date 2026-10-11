import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { NumberFormatter } from "../../apps/sheet/number-formatter.js";

export async function runSheetDateFunctionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const eq = (actual, expected) => { if (actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`); };
  const cells = new Map([["A1",{val:"02/09/2026",formula:"",style:{}}],["A2",{val:"03/09/2026",formula:"",style:{}}]]);
  const engine = new FormulaEngine(cells);
  const names = ["WEEKDAY","NETWORKDAYS","WORKDAY","EOMONTH","DAYS"];
  test("Catalog có đủ hàm ngày tháng", () => names.forEach(name => { if (!FUNCTION_CATALOG.find(item => item.name === name)?.desc) throw new Error(`Thiếu ${name}`); }));
  test("WEEKDAY", () => { eq(engine.evaluate('=WEEKDAY("04/09/2026",2)'), 5); eq(engine.evaluate('=WEEKDAY("04/09/2026",99)'), "#NUM!"); });
  test("NETWORKDAYS loại cuối tuần và vùng ngày lễ", () => { eq(engine.evaluate('=NETWORKDAYS("01/09/2026","07/09/2026",A1:A2)'), 3); eq(engine.evaluate('=NETWORKDAYS("sai","07/09/2026")'), "#VALUE!"); });
  test("WORKDAY bỏ qua cuối tuần và ngày lễ trả serial Excel", () => { eq(engine.evaluate('=WORKDAY("01/09/2026",3,A1:A2)'), 46273); eq(engine.evaluate('=WORKDAY("01/09/2026",1.5)'), "#VALUE!"); });
  test("EOMONTH trả serial Excel", () => { eq(engine.evaluate('=EOMONTH("15/01/2024",1)'), 45351); eq(engine.evaluate('=EOMONTH("sai",1)'), "#VALUE!"); });
  test("DAYS", () => { eq(engine.evaluate('=DAYS("10/09/2026","01/09/2026")'), 9); eq(engine.evaluate('=DAYS("sai","01/09/2026")'), "#VALUE!"); });

  // SB4 — Mục 5.2: Kiểm tra hàm ngày tháng trả serial, cộng ngày và trích xuất thành phần
  test("SB4: DATE trả số serial Excel", () => {
    eq(engine.evaluate("=DATE(2026,12,31)"), 46387);
    eq(engine.evaluate("=DATE(2024,2,29)"), 45351);
    eq(engine.evaluate("=DATE(2026,13,1)"), 46388);
  });

  test("SB4: Cộng ngày từ ô chứa DATE serial", () => {
    cells.set("B1", { val: engine.evaluate("=DATE(2026,12,31)"), formula: "=DATE(2026,12,31)", style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } } });
    eq(engine.evaluate("=B1+1"), 46388);
  });

  test("SB4: YEAR, MONTH, DAY, WEEKDAY trên số serial", () => {
    eq(engine.evaluate("=YEAR(46387)"), 2026);
    eq(engine.evaluate("=MONTH(46387)"), 12);
    eq(engine.evaluate("=DAY(46387)"), 31);
    eq(engine.evaluate("=WEEKDAY(46387)"), 5);
  });

  test("SB4: Tích hợp lưới SheetGrid — tự gán numberFormat và hiển thị đúng", () => {
    const grid = new SheetGridController({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });
    grid.setCellValue("A", 1, "=DATE(2026,12,31)");
    const cellA1 = grid.cellsData.get("A1");
    eq(cellA1.val, 46387);
    eq(cellA1.formula, "=DATE(2026,12,31)");
    eq(cellA1.style?.numberFormat?.category, "date");
    eq(cellA1.style?.numberFormat?.dateFormat, "dd/mm/yyyy");
    const display = NumberFormatter.formatValue(cellA1.val, cellA1.style.numberFormat);
    eq(display.text, "31/12/2026");

    // NOW có giờ
    grid.setCellValue("A", 2, "=NOW()");
    const cellA2 = grid.cellsData.get("A2");
    eq(typeof cellA2.val, "number");
    eq(cellA2.style?.numberFormat?.category, "date");
    eq(cellA2.style?.numberFormat?.dateFormat, "dd/mm/yyyy hh:mm");
  });

  test("SB4: Lưu FODS ra office:value-type=\"date\" và office:date-value chuẩn", () => {
    const grid = new SheetGridController({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });
    grid.setCellValue("A", 1, "=DATE(2026,12,31)");
    const adapter = new SheetAdapter(grid);
    const xml = adapter.serializeToFods();
    if (!xml.includes('office:value-type="date"')) throw new Error('FODS thiếu office:value-type="date"');
    if (!xml.includes('office:date-value="2026-12-31"')) throw new Error('FODS thiếu office:date-value="2026-12-31"');
  });

  return results;
}
