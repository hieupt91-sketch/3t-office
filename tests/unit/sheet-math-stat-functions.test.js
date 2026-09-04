import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";

export async function runSheetMathStatFunctionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const eq = (actual, expected, epsilon = 0) => { if (typeof expected === "number" ? Math.abs(actual - expected) > epsilon : actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`); };
  const cells = new Map();
  [["A1",1],["A2",2],["A3",3],["A4",4],["B1",10],["B2",20],["B3",30],["B4",40],["C1","Bắc"],["C2","Nam"],["C3","Bắc"],["C4","Nam"],["D1",1],["D3",3]].forEach(([coord,val]) => cells.set(coord,{ val, formula:"", style:{} }));
  const engine = new FormulaEngine(cells);
  const names = ["SUMPRODUCT","SQRT","POWER","ROUNDUP","ROUNDDOWN","CEILING","FLOOR","TRUNC","SIGN","AVERAGEIF","AVERAGEIFS","MEDIAN","RANK","RANK.EQ","LARGE","SMALL","COUNTBLANK","STDEV","VAR"];
  test("Catalog có đủ hàm toán học và thống kê", () => names.forEach(name => { if (!FUNCTION_CATALOG.find(item => item.name === name)?.desc) throw new Error(`Thiếu ${name}`); }));
  test("SUMPRODUCT", () => { eq(engine.evaluate("=SUMPRODUCT(A1:A4,B1:B4)"), 300); eq(engine.evaluate("=SUMPRODUCT(A1:A4,B1:B3)"), "#VALUE!"); });
  test("SQRT", () => { eq(engine.evaluate("=SQRT(81)"), 9); eq(engine.evaluate("=SQRT(-1)"), "#NUM!"); });
  test("POWER", () => { eq(engine.evaluate("=POWER(2,10)"), 1024); eq(engine.evaluate('=POWER("x",2)'), "#VALUE!"); });
  test("ROUNDUP", () => { eq(engine.evaluate("=ROUNDUP(-3.141,2)"), -3.15); eq(engine.evaluate('=ROUNDUP(1,"x")'), "#VALUE!"); });
  test("ROUNDDOWN", () => { eq(engine.evaluate("=ROUNDDOWN(-3.149,2)"), -3.14); eq(engine.evaluate('=ROUNDDOWN(1,"x")'), "#VALUE!"); });
  test("CEILING", () => { eq(engine.evaluate("=CEILING(4.3,2)"), 6); eq(engine.evaluate("=CEILING(-4.3,2)"), "#NUM!"); });
  test("FLOOR", () => { eq(engine.evaluate("=FLOOR(4.3,2)"), 4); eq(engine.evaluate("=FLOOR(-4.3,2)"), "#NUM!"); });
  test("TRUNC", () => { eq(engine.evaluate("=TRUNC(123.456,2)"), 123.45); eq(engine.evaluate('=TRUNC(1,"x")'), "#VALUE!"); });
  test("SIGN", () => { eq(engine.evaluate("=SIGN(-8)"), -1); eq(engine.evaluate('=SIGN("x")'), "#VALUE!"); });
  test("AVERAGEIF", () => { eq(engine.evaluate('=AVERAGEIF(C1:C4,"Bắc",B1:B4)'), 20); eq(engine.evaluate('=AVERAGEIF(C1:C4,"Tây",B1:B4)'), "#DIV/0!"); });
  test("AVERAGEIFS", () => { eq(engine.evaluate('=AVERAGEIFS(B1:B4,C1:C4,"Nam",A1:A4,">2")'), 40); eq(engine.evaluate('=AVERAGEIFS(B1:B4,C1:C4,"Tây")'), "#DIV/0!"); });
  test("MEDIAN", () => { eq(engine.evaluate("=MEDIAN(A1:A4)"), 2.5); eq(engine.evaluate("=MEDIAN()"), "#NUM!"); });
  test("RANK và RANK.EQ", () => { eq(engine.evaluate("=RANK(3,A1:A4)"), 2); eq(engine.evaluate("=RANK.EQ(2,A1:A4,1)"), 2); eq(engine.evaluate("=RANK(9,A1:A4)"), "#N/A"); eq(engine.evaluate("=RANK.EQ(9,A1:A4)"), "#N/A"); });
  test("LARGE", () => { eq(engine.evaluate("=LARGE(A1:A4,2)"), 3); eq(engine.evaluate("=LARGE(A1:A4,9)"), "#NUM!"); });
  test("SMALL", () => { eq(engine.evaluate("=SMALL(A1:A4,2)"), 2); eq(engine.evaluate("=SMALL(A1:A4,0)"), "#NUM!"); });
  test("COUNTBLANK", () => { eq(engine.evaluate("=COUNTBLANK(D1:D4)"), 2); eq(engine.evaluate("=COUNTBLANK()"), "#VALUE!"); });
  test("STDEV", () => { eq(engine.evaluate("=STDEV(A1:A4)"), Math.sqrt(5/3), 1e-12); eq(engine.evaluate("=STDEV(1)"), "#DIV/0!"); });
  test("VAR", () => { eq(engine.evaluate("=VAR(A1:A4)"), 5/3, 1e-12); eq(engine.evaluate("=VAR(1)"), "#DIV/0!"); });
  return results;
}
