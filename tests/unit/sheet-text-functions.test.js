import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";

export async function runSheetTextFunctionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const eq = (actual, expected) => { if (actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`); };
  const cells = new Map([["A1",{val:"An",formula:"",style:{}}],["A2",{val:"",formula:"",style:{}}],["A3",{val:"Bình",formula:"",style:{}}]]);
  const engine = new FormulaEngine(cells);
  const names = ["MID","VALUE","PROPER","TEXTJOIN","REPT","EXACT","SEARCH"];
  test("Catalog có đủ hàm văn bản", () => names.forEach(name => { if (!FUNCTION_CATALOG.find(item => item.name === name)?.desc) throw new Error(`Thiếu ${name}`); }));
  test("MID", () => { eq(engine.evaluate('=MID("VN Office",4,6)'), "Office"); eq(engine.evaluate('=MID("abc",0,2)'), "#VALUE!"); });
  test("VALUE", () => { eq(engine.evaluate('=VALUE("1,234.50")'), 1234.5); eq(engine.evaluate('=VALUE("không phải số")'), "#VALUE!"); });
  test("PROPER", () => { eq(engine.evaluate('=PROPER("văn PHÒNG việt nam")'), "Văn Phòng Việt Nam"); eq(engine.evaluate("=PROPER()"), "#VALUE!"); });
  test("TEXTJOIN", () => { eq(engine.evaluate('=TEXTJOIN(" - ",TRUE,A1:A3)'), "An - Bình"); eq(engine.evaluate('=TEXTJOIN(",",TRUE)'), "#VALUE!"); });
  test("REPT", () => { eq(engine.evaluate('=REPT("VN",3)'), "VNVNVN"); eq(engine.evaluate('=REPT("x",-1)'), "#VALUE!"); });
  test("EXACT", () => { eq(engine.evaluate('=EXACT("Excel","Excel")'), true); eq(engine.evaluate('=EXACT("Excel","excel")'), false); eq(engine.evaluate('=EXACT("a")'), "#VALUE!"); });
  test("SEARCH", () => { eq(engine.evaluate('=SEARCH("office","VN Office")'), 4); eq(engine.evaluate('=SEARCH("sheet","VN Office")'), "#VALUE!"); });
  return results;
}
