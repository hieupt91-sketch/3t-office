import { FormulaEngine } from "../../apps/sheet/formula-engine.js";

export async function runSheetExcel2016FunctionGapTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const equal = (actual, expected) => {
    if (actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`);
  };
  const cells = new Map([
    ["A1", { val: 1, formula: "", style: {} }],
    ["A2", { val: 2, formula: "", style: {} }],
    ["A3", { val: 2, formula: "", style: {} }],
    ["A4", { val: 4, formula: "", style: {} }],
    ["B1", { val: 10, formula: "=SUM(A1:A4)", style: {} }],
    ["C1", { val: "x", formula: "", style: {} }],
    ["C2", { val: "#N/A", formula: "", style: {} }],
  ]);
  const engine = new FormulaEngine(cells);

  test("MODE tìm mode thấp nhất khi hai giá trị có cùng tần suất", () => {
    equal(engine.evaluate("=MODE(A1:A4)"), 2);
    equal(engine.evaluate("=MODE(5,5,2,2)"), 2);
    equal(engine.evaluate("=MODE(1,2,3)"), "#N/A");
  });
  test("MODE bỏ qua văn bản và truyền lỗi từ tham chiếu", () => {
    equal(engine.evaluate("=MODE(A1:A4,C1)"), 2);
    equal(engine.evaluate("=MODE(C2,A1:A4)"), "#N/A");
  });
  test("PERCENTILE dùng nội suy inclusive và kiểm tra k", () => {
    equal(engine.evaluate("=PERCENTILE(A1:A4,0.5)"), 2);
    equal(engine.evaluate("=PERCENTILE(A1:A4,0.75)"), 2.5);
    equal(engine.evaluate("=PERCENTILE(A1:A4,1.1)"), "#NUM!");
    equal(engine.evaluate("=PERCENTILE(C1,0.5)"), "#NUM!");
  });
  test("ADDRESS tạo tham chiếu A1 và hỗ trợ sheet có dấu nháy", () => {
    equal(engine.evaluate("=ADDRESS(3,2)"), "$B$3");
    equal(engine.evaluate("=ADDRESS(3,2,2)"), "B$3");
    equal(engine.evaluate("=ADDRESS(3,2,3)"), "$B3");
    equal(engine.evaluate('=ADDRESS(3,2,1,TRUE,"Bảng O\'Brien")'), "'Bảng O''Brien'!$B$3");
    equal(engine.evaluate("=ADDRESS(0,1)"), "#VALUE!");
  });
  test("FORMULATEXT trả công thức, lỗi khi ô không có công thức", () => {
    equal(engine.evaluate("=FORMULATEXT(B1)"), "=SUM(A1:A4)");
    equal(engine.evaluate("=FORMULATEXT(A1)"), "#N/A");
    equal(engine.evaluate("=FORMULATEXT(Missing!A1)"), "#REF!");
  });
  test("YEARFRAC áp dụng các cơ sở 0 đến 4 và kiểm tra basis", () => {
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2021-01-01",1)'), 1);
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2020-07-02",2)'), 183 / 360);
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2020-07-02",3)'), 183 / 365);
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2020-02-01",0)'), 30 / 360);
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2020-02-01",4)'), 30 / 360);
    equal(engine.evaluate('=YEARFRAC("2020-01-01","2021-01-01",5)'), "#NUM!");
  });
  return results;
}
