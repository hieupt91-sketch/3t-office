import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";

export async function runSheetReferenceFunctionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const equal = (actual, expected) => { if (actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`); };
  const sheets = ["Tổng hợp", "Tháng 1", "Tháng 2", "Tháng 3"];
  const data = Object.fromEntries(sheets.map(name => [name, new Map()]));
  const put = (sheet, coord, val) => data[sheet].set(coord, { val, formula: "", style: {} });
  put("Tổng hợp", "A1", 200);
  [["A1", 100], ["B1", "An"], ["A2", 200], ["B2", "Bình"], ["A3", 300], ["B3", "Chi"]].forEach(([c, v]) => put("Tháng 1", c, v));
  [["A1", 20], ["B1", "Hai"]].forEach(([c, v]) => put("Tháng 2", c, v));
  [["A1", 30], ["B1", "Ba"]].forEach(([c, v]) => put("Tháng 3", c, v));
  const engine = new FormulaEngine(() => data["Tổng hợp"], null, name => data[name] || null, () => "Tổng hợp", () => sheets);
  const names = ["IFERROR", "IFNA", "ISBLANK", "ISNUMBER", "ISTEXT", "ISERROR", "ISNA", "INDIRECT", "OFFSET", "XLOOKUP", "CHOOSE", "LOOKUP"];

  test("Catalog có đủ hàm tra cứu, xử lý lỗi và IS*", () => names.forEach(name => {
    const item = FUNCTION_CATALOG.find(entry => entry.name === name);
    if (!item?.syntax || !item?.desc || !item?.category) throw new Error(`Thiếu metadata ${name}`);
  }));
  test("IFERROR bắt lỗi tra cứu và giữ nguyên giá trị đúng", () => { equal(engine.evaluate('=IFERROR(XLOOKUP(999,\'Tháng 1\'!A:A,\'Tháng 1\'!B:B),"Không có")'), "Không có"); equal(engine.evaluate("=IFERROR(12,0)"), 12); equal(engine.evaluate("=IFERROR(1)"), "#VALUE!"); });
  test("IFNA chỉ bắt #N/A", () => { equal(engine.evaluate('=IFNA(XLOOKUP(999,\'Tháng 1\'!A:A,\'Tháng 1\'!B:B),"Thiếu")'), "Thiếu"); equal(engine.evaluate('=IFNA(INDIRECT("Sai!A1"),"Thiếu")'), "#REF!"); equal(engine.evaluate("=IFNA(1)"), "#VALUE!"); });
  test("ISBLANK phân biệt ô trống và kiểm tra arity", () => { equal(engine.evaluate("=ISBLANK(Z9)"), true); equal(engine.evaluate("=ISBLANK(A1,B1)"), "#VALUE!"); });
  test("ISNUMBER nhận số", () => { equal(engine.evaluate("=ISNUMBER(A1)"), true); equal(engine.evaluate("=ISNUMBER()"), "#VALUE!"); });
  test("ISTEXT nhận văn bản cross-sheet", () => { equal(engine.evaluate("=ISTEXT('Tháng 1'!B1)"), true); equal(engine.evaluate("=ISTEXT()"), "#VALUE!"); });
  test("ISERROR nhận mọi mã lỗi", () => { equal(engine.evaluate('=ISERROR(INDIRECT("Sai!A1"))'), true); equal(engine.evaluate("=ISERROR()"), "#VALUE!"); });
  test("ISNA chỉ nhận #N/A", () => { equal(engine.evaluate("=ISNA(XLOOKUP(999,'Tháng 1'!A:A,'Tháng 1'!B:B))"), true); equal(engine.evaluate("=ISNA()"), "#VALUE!"); });
  test("INDIRECT đọc ô và vùng xuyên sheet", () => { equal(engine.evaluate('=INDIRECT("Tháng 2!A1")'), 20); equal(engine.evaluate('=SUM(INDIRECT("Tháng 1!A1:A3"))'), 600); equal(engine.evaluate('=INDIRECT("Không có!A1")'), "#REF!"); });
  test("OFFSET dịch ô và vùng cross-sheet", () => { equal(engine.evaluate("=OFFSET('Tháng 1'!A1,1,1)"), "Bình"); equal(engine.evaluate("=SUM(OFFSET('Tháng 1'!A1,0,0,3,1))"), 600); equal(engine.evaluate("=OFFSET(A1,-2,0)"), "#REF!"); });
  test("XLOOKUP exact/full-column xuyên sheet và lỗi kích thước", () => { equal(engine.evaluate("=XLOOKUP(A1,'Tháng 1'!A:A,'Tháng 1'!B:B)"), "Bình"); equal(engine.evaluate("=XLOOKUP(A1,'Tháng 1'!A1:A3,'Tháng 1'!B1:B2)"), "#VALUE!"); });
  test("CHOOSE chọn giá trị ở sheet khác", () => { equal(engine.evaluate("=CHOOSE(2,'Tháng 2'!A1,'Tháng 3'!A1)"), 30); equal(engine.evaluate("=CHOOSE(3,1,2)"), "#VALUE!"); });
  test("LOOKUP trả vector kết quả xuyên sheet", () => { equal(engine.evaluate("=LOOKUP(250,'Tháng 1'!A1:A3,'Tháng 1'!B1:B3)"), "Bình"); equal(engine.evaluate("=LOOKUP(50,'Tháng 1'!A1:A3,'Tháng 1'!B1:B3)"), "#N/A"); });
  test("Tham chiếu 3D dùng đúng thứ tự tab cho 5 aggregate", () => {
    equal(engine.evaluate("=SUM('Tháng 1':'Tháng 3'!A1)"), 150);
    equal(engine.evaluate("=AVERAGE('Tháng 1':'Tháng 3'!A1)"), 50);
    equal(engine.evaluate("=COUNT('Tháng 1':'Tháng 3'!A1)"), 3);
    equal(engine.evaluate("=MAX('Tháng 1':'Tháng 3'!A1)"), 100);
    equal(engine.evaluate("=MIN('Tháng 1':'Tháng 3'!A1)"), 20);
    equal(engine.evaluate("=SUM('Tháng 1':'Không có'!A1)"), "#REF!");
  });
  return results;
}
