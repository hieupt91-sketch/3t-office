import { FormulaEngine, FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";

export async function runSheetLookupConditionalFunctionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const assertEqual = (actual, expected) => { if (actual !== expected) throw new Error(`Mong đợi ${expected}, nhận ${actual}`); };
  const cells = new Map();
  const put = (coord, val) => cells.set(coord, { val, formula: "", style: {} });
  [["A1","Mã"],["B1","Tên"],["C1","Doanh số"],["D1","Vùng"],["A2",100],["B2","An"],["C2",8],["D2","Bắc"],["A3",200],["B3","Bình"],["C3",15],["D3","Nam"],["A4",300],["B4","Chi Anh"],["C4",25],["D4","Bắc"],["A5",400],["B5","Dũng"],["C5",40],["D5","Nam"]].forEach(([coord,val]) => put(coord,val));
  [["F1",100],["G1",200],["H1",300],["I1",400],["F2","An"],["G2","Bình"],["H2","Chi Anh"],["I2","Dũng"]].forEach(([coord,val]) => put(coord,val));
  [["J1",40],["J2",30],["J3",20],["J4",10]].forEach(([coord,val]) => put(coord,val));
  const engine = new FormulaEngine(cells);

  test("Formula catalog có đủ 8 hàm lookup/conditional", () => {
    for (const name of ["VLOOKUP","HLOOKUP","INDEX","MATCH","COUNTIF","SUMIF","COUNTIFS","SUMIFS"]) if (!FUNCTION_CATALOG.some(item => item.name === name)) throw new Error(`Thiếu ${name}`);
  });
  test("VLOOKUP exact trả chuỗi chính xác và #N/A khi không thấy", () => { assertEqual(engine.evaluate("=VLOOKUP(300,A2:C5,2,FALSE)"), "Chi Anh"); assertEqual(engine.evaluate("=VLOOKUP(350,A2:C5,2,FALSE)"), "#N/A"); });
  test("VLOOKUP approximate mặc định lấy khóa lớn nhất <= lookup", () => assertEqual(engine.evaluate("=VLOOKUP(350,A2:C5,3)"), 25));
  test("HLOOKUP exact và approximate đọc đúng theo hàng", () => { assertEqual(engine.evaluate("=HLOOKUP(200,F1:I2,2,FALSE)"), "Bình"); assertEqual(engine.evaluate("=HLOOKUP(350,F1:I2,2)"), "Chi Anh"); });
  test("INDEX trả đúng giao điểm hàng/cột", () => assertEqual(engine.evaluate("=INDEX(B2:C5,3,2)"), 25));
  test("MATCH hỗ trợ exact, tăng dần và giảm dần", () => { assertEqual(engine.evaluate("=MATCH(300,A2:A5,0)"), 3); assertEqual(engine.evaluate("=MATCH(350,A2:A5,1)"), 3); assertEqual(engine.evaluate("=MATCH(25,J1:J4,-1)"), 2); });
  test("COUNTIF hỗ trợ so sánh số và wildcard không phân biệt hoa thường", () => { assertEqual(engine.evaluate('=COUNTIF(C2:C5,">10")'), 3); assertEqual(engine.evaluate('=COUNTIF(B2:B5,"*anh*")'), 1); });
  test("SUMIF dùng sum_range tương ứng", () => assertEqual(engine.evaluate('=SUMIF(D2:D5,"Bắc",C2:C5)'), 33));
  test("COUNTIFS áp dụng nhiều điều kiện AND", () => assertEqual(engine.evaluate('=COUNTIFS(D2:D5,"Nam",C2:C5,">20")'), 1));
  test("SUMIFS tổng hợp đúng nhiều điều kiện", () => assertEqual(engine.evaluate('=SUMIFS(C2:C5,D2:D5,"Bắc",C2:C5,">10")'), 25));
  return results;
}
