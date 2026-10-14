/**
 * Test Suite: tham chiếu có cấu trúc Table1[Cột] (EXCEL-G4)
 */
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { expandStructuredReferences } from "../../apps/sheet/structured-references.js";

export async function runStructuredReferenceTests() {
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

  // Bảng Sales ở A1:C5 (tiêu đề + 4 dòng), có dòng tổng ở A6:C6 -> ref A1:C6, totals=true
  const sheet1 = new Map();
  const put = (map, coord, val, formula = "") => map.set(coord, { val, formula, style: {} });
  [["Tên", "SL", "Giá"], ["An", 2, 10], ["Bình", 3, 20], ["Chi", 4, 30], ["Dũng", 5, 40]].forEach((row, r) =>
    row.forEach((v, c) => put(sheet1, `${String.fromCharCode(65 + c)}${r + 1}`, v)));
  put(sheet1, "A6", "Tổng"); put(sheet1, "B6", 14); put(sheet1, "C6", 100);
  const sheet2 = new Map();
  put(sheet2, "A1", "Mã"); put(sheet2, "A2", "x"); put(sheet2, "A3", "y");

  const tables = {
    sales: { name: "Sales", sheet: "Sheet1", ref: "A1:C6", hasHeaders: true, totals: true },
    codes: { name: "Codes", sheet: "Sheet2", ref: "A1:A3", hasHeaders: true, totals: false }
  };
  const maps = { Sheet1: sheet1, Sheet2: sheet2 };
  const resolver = {
    byName: name => Object.values(tables).find(t => t.name.toLowerCase() === String(name).toLowerCase()) || null,
    at: (sheet, coord) => Object.values(tables).find(t => {
      if (t.sheet !== sheet) return false;
      const m = t.ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      const c = coord.match(/^([A-Z]+)(\d+)$/);
      return c && c[1] >= m[1] && c[1] <= m[3] && Number(c[2]) >= Number(m[2]) && Number(c[2]) <= Number(m[4]);
    }) || null,
    headerValue: (sheet, coord) => maps[sheet]?.get(coord)?.val
  };
  const ctx = { sheet: "Sheet1", coord: "E3" };
  const expand = (formula, context = ctx) => expandStructuredReferences(formula, context, resolver);

  test("Structured refs: Table[Cột] -> vùng dữ liệu của cột", () => eq(expand("SUM(Sales[SL])"), "SUM(B2:B5)"));
  test("Structured refs: tên bảng không phân biệt hoa thường", () => eq(expand("SUM(sales[Giá])"), "SUM(C2:C5)"));
  test("Structured refs: [#All] gồm tiêu đề và dòng tổng", () => eq(expand("Sales[[#All],[SL]]"), "B1:B6"));
  test("Structured refs: [#Headers] một ô tiêu đề", () => eq(expand("Sales[[#Headers],[Giá]]"), "C1"));
  test("Structured refs: [#Totals] ô dòng tổng", () => eq(expand("Sales[[#Totals],[Giá]]"), "C6"));
  test("Structured refs: [#Data] toàn bảng dữ liệu", () => eq(expand("Sales[#Data]"), "A2:C5"));
  test("Structured refs: Table[#All] toàn bảng", () => eq(expand("Sales[#All]"), "A1:C6"));
  test("Structured refs: nối cột [[SL]:[Giá]]", () => eq(expand("Sales[[SL]:[Giá]]"), "B2:C5"));
  test("Structured refs: [@Cột] lấy dòng của ô đang tính", () => eq(expand("Sales[@SL]*Sales[@Giá]", { sheet: "Sheet1", coord: "E3" }), "B3*C3"));
  test("Structured refs: [@[Cột]] dạng ngoặc kép", () => eq(expand("Sales[@[SL]]", { sheet: "Sheet1", coord: "E4" }), "B4"));
  test("Structured refs: [#This Row] tương đương @", () => eq(expand("Sales[[#This Row],[Giá]]", { sheet: "Sheet1", coord: "E2" }), "C2"));
  test("Structured refs: [@Cột] không tên bảng dùng bảng chứa ô đang tính", () => eq(expand("[@SL]", { sheet: "Sheet1", coord: "B4" }), "B4"));
  test("Structured refs: [@Cột] ngoài vùng dữ liệu của bảng -> #VALUE!", () => eq(expand("Sales[@SL]", { sheet: "Sheet1", coord: "B6" }), "#VALUE!"));
  test("Structured refs: bảng ở trang khác thêm tiền tố trang", () => eq(expand("COUNTA(Codes[Mã])"), "COUNTA(Sheet2!A2:A3)"));
  test("Structured refs: cột không có -> #REF!", () => eq(expand("Sales[Không có]"), "#REF!"));
  test("Structured refs: không đụng chuỗi và tên trang có ngoặc", () => eq(expand('"Sales[SL]"&\'Báo cáo [Q1]\'!A1'), '"Sales[SL]"&\'Báo cáo [Q1]\'!A1'));
  test("Structured refs: bảng lạ giữ nguyên văn bản", () => eq(expand("Other[Cột]"), "Other[Cột]"));

  // Tính thật qua FormulaEngine
  const engine = new FormulaEngine(() => sheet1, null, name => maps[name] || null, () => "Sheet1", () => ["Sheet1", "Sheet2"], resolver);
  test("Engine: SUM(Sales[SL]) = 14", () => eq(engine.evaluate("=SUM(Sales[SL])"), 14));
  test("Engine: AVERAGE(Sales[Giá]) = 25", () => eq(engine.evaluate("=AVERAGE(Sales[Giá])"), 25));
  test("Engine: [@SL]*[@Giá] theo dòng", () => eq(engine.evaluate("=Sales[@SL]*Sales[@Giá]", { sheet: "Sheet1", coord: "E3" }), 60));
  test("Engine: bảng ở trang khác COUNTA", () => eq(engine.evaluate("=COUNTA(Codes[Mã])"), 2));
  test("Engine: SUM(Sales[[#Totals],[SL]]) = 14", () => eq(engine.evaluate("=SUM(Sales[[#Totals],[SL]])"), 14));
  test("Engine: không có resolver thì bỏ qua (không lỗi)", () => {
    const plain = new FormulaEngine(() => sheet1);
    const v = plain.evaluate("=SUM(B2:B5)");
    eq(v, 14);
  });

  return results;
}
