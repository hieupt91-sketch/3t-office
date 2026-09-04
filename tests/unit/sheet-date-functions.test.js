import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";

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
  test("WORKDAY bỏ qua cuối tuần và ngày lễ", () => { eq(engine.evaluate('=WORKDAY("01/09/2026",3,A1:A2)'), "08/09/2026"); eq(engine.evaluate('=WORKDAY("01/09/2026",1.5)'), "#VALUE!"); });
  test("EOMONTH", () => { eq(engine.evaluate('=EOMONTH("15/01/2024",1)'), "29/02/2024"); eq(engine.evaluate('=EOMONTH("sai",1)'), "#VALUE!"); });
  test("DAYS", () => { eq(engine.evaluate('=DAYS("10/09/2026","01/09/2026")'), 9); eq(engine.evaluate('=DAYS("sai","01/09/2026")'), "#VALUE!"); });
  return results;
}
