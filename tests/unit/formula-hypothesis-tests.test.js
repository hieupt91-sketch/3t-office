import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { PivotTableEngine } from "../../apps/sheet/pivot-table.js";
import { parseInternalLink, formatInternalLink, toFodsHref, fromFodsHref } from "../../apps/sheet/sheet-internal-link.js";

/**
 * T.TEST / F.TEST / CHISQ.TEST (và tên cũ TTEST, FTEST, CHITEST) và GAMMA.
 * Giá trị tham chiếu tính bằng LibreOffice (scripts/audit-0610/lo_hypothesis_reference.py) vì Excel COM không dùng được;
 * chưa phải bộ vàng Excel 2016 (BLOCKED: cần Excel thật để thêm vào tests/functions/golden-*.json).
 */
const DATA = {
  A: [3, 5, 7, 9, 11, 14], B: [2, 6, 8, 8, 12, 13], C: [4, 7, 9],
  E: [10, 30], F: [20, 40], G: [12, 28], H: [18, 42], I: [5, 7, 9, 11], J: [7, 7, 9, 9]
};
const REFERENCE = [
  ["=T.TEST(A1:A6,B1:B6,2,1)", 1],
  ["=T.TEST(A1:A6,B1:B6,1,1)", 0.5],
  ["=T.TEST(A1:A6,C1:C3,2,2)", 0.579821766206743],
  ["=T.TEST(A1:A6,C1:C3,1,2)", 0.289910883103372],
  ["=T.TEST(A1:A6,C1:C3,2,3)", 0.518274455715406],
  ["=T.TEST(A1:A6,C1:C3,1,3)", 0.259137227857703],
  ["=TTEST(A1:A6,C1:C3,2,3)", 0.518274455715406],
  ["=F.TEST(A1:A6,C1:C3)", 0.610120373021096],
  ["=F.TEST(C1:C3,A1:A6)", 0.610120373021096],
  ["=FTEST(A1:A6,C1:C3)", 0.610120373021096],
  ["=CHISQ.TEST(E1:F2,G1:H2)", 0.372998483613487],
  ["=CHISQ.TEST(I1:I4,J1:J4)", 0.797411231756371],
  ["=CHITEST(E1:F2,G1:H2)", 0.372998483613487],
  ["=GAMMA(4.5)", 11.6317283965675],
  ["=GAMMA(-1.5)", 2.36327180120735],
  ["=GAMMA(0.5)", 1.77245385090552],
  ["=GAMMA(10)", 362880],
  ["=GAMMA(0.1)", 9.51350769866873],
  ["=GAMMA(-0.5)", -3.54490770181103]
];

export async function runFormulaHypothesisTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const cells = new Map();
  for (const [col, values] of Object.entries(DATA)) values.forEach((value, i) => cells.set(`${col}${i + 1}`, { val: value }));
  const engine = new FormulaEngine(cells);
  const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

  test("Kiểm định giả thuyết và GAMMA khớp giá trị tham chiếu LibreOffice (19 ca)", () => {
    const bad = [];
    for (const [formula, expected] of REFERENCE) {
      const value = engine.evaluate(formula);
      if (typeof value !== "number" || !close(value, expected)) bad.push(`${formula} = ${value}, mong ${expected}`);
    }
    if (bad.length) throw new Error(bad.join(" | "));
  });

  test("Lỗi đúng chuẩn: số mẫu thiếu, tham số sai, kích thước lệch, GAMMA tại số nguyên không dương", () => {
    const cases = [
      ["=T.TEST(A1:A6,C1:C3,3,2)", "#NUM!"], ["=T.TEST(A1:A6,C1:C3,2,4)", "#NUM!"], ["=T.TEST(A1:A6,C1:C3,2,1)", "#N/A"],
      ["=F.TEST(A1:A1,C1:C3)", "#DIV/0!"], ["=CHISQ.TEST(E1:F2,I1:I4)", "#N/A"], ["=GAMMA(0)", "#NUM!"], ["=GAMMA(-3)", "#NUM!"]
    ];
    const bad = cases.filter(([formula, expected]) => engine.evaluate(formula) !== expected).map(([formula, expected]) => `${formula}: ${engine.evaluate(formula)} (mong ${expected})`);
    if (bad.length) throw new Error(bad.join(" | "));
  });

  test("CELL và INFO trả đúng loại thông tin cơ bản", () => {
    const info = new Map([
      ["A1", { val: "chu" }],
      ["B2", { val: 42, style: { numberFormat: { category: "percent", decimals: 1 } } }],
      ["C3", { val: 1234.5, style: { numberFormat: { category: "number", decimals: 2, useThousands: true } } }]
    ]);
    const e = new FormulaEngine(info, null, null, () => "S1", () => ["S1", "S2", "S3"]);
    const cases = [
      ['=CELL("address",B2)', "$B$2"], ['=CELL("col",C3)', 3], ['=CELL("row",C3)', 3], ['=CELL("contents",B2)', 42],
      ['=CELL("type",A1)', "l"], ['=CELL("type",B2)', "v"], ['=CELL("type",D9)', "b"],
      ['=CELL("format",B2)', "P1"], ['=CELL("format",C3)', ",2"], ['=CELL("format",A1)', "G"], ['=CELL("prefix",A1)', "'"],
      ['=CELL("nope",A1)', "#VALUE!"], ['=INFO("numfile")', 3], ['=INFO("release")', "16.0"], ['=INFO("memavail")', "#N/A"], ['=INFO("x")', "#VALUE!"]
    ];
    const bad = cases.filter(([formula, expected]) => e.evaluate(formula) !== expected).map(([formula, expected]) => `${formula}: ${e.evaluate(formula)} (mong ${expected})`);
    if (bad.length) throw new Error(bad.join(" | "));
  });

  test("Liên kết nội bộ Sheet: tách, định dạng, đổi qua lại với dạng FODS", () => {
    const eq = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
    eq(parseInternalLink("#Sheet2!b3"), { sheet: "Sheet2", ref: "B3" });
    eq(parseInternalLink("#'Số liệu'!A1:C3"), { sheet: "Số liệu", ref: "A1:C3" });
    eq(parseInternalLink("#$'Trang 2'.$D$4"), { sheet: "Trang 2", ref: "D4" });
    eq(parseInternalLink("https://x.vn"), null);
    eq(parseInternalLink("#Sheet2!ZZZ"), null);
    eq(formatInternalLink("Trang 2", "c5"), "#'Trang 2'!C5");
    eq(toFodsHref("#'Trang 2'!C5"), "#'Trang 2'.C5");
    eq(fromFodsHref("#Sheet2.B3"), "#Sheet2!B3");
    eq(fromFodsHref("#'Trang 2'.C5"), "#'Trang 2'!C5");
  });

  test("GETPIVOTDATA đọc đúng ô của bảng PivotTable (hàng, cột, tổng chung, không thấy => #REF!)", () => {
    const src = [["Vung", "Sp", "Tien"], ["Bac", "A", 10], ["Bac", "B", 20], ["Nam", "A", 5], ["Nam", "A", 7]];
    const cells = new Map();
    src.forEach((row, r) => row.forEach((v, c) => cells.set(`${"ABC"[c]}${r + 1}`, { val: v })));
    const pivot = { sourceRange: "A1:C5", rows: ["Vung"], columns: ["Sp"], values: [{ field: "Tien", aggregate: "SUM" }], showGrandTotal: true, targetCoord: "E1" };
    const table = PivotTableEngine.aggregate(cells, pivot);
    for (const [k, v] of PivotTableEngine.toCells(table, "E1")) cells.set(k, v);
    pivot.resultRange = PivotTableEngine.resultRange(table, "E1");
    const e = new FormulaEngine(cells);
    e.pivotResolver = () => pivot;
    const cases = [
      ['=GETPIVOTDATA("Tien",E1,"Vung","Bac","Sp","B")', 20],
      ['=GETPIVOTDATA("Tien",E1,"Vung","Nam","Sp","A")', 12],
      ['=GETPIVOTDATA("Tien",E1,"vung","bac","sp","a")', 10],
      ['=GETPIVOTDATA("Sum of Tien",E1,"Vung","Bac","Sp","A")', 10],
      ['=GETPIVOTDATA("Tien",E1,"Vung","Dong","Sp","A")', "#REF!"],
      ['=GETPIVOTDATA("Tien",E1,"Khong","Bac")', "#REF!"],
      ['=GETPIVOTDATA("Tien")', "#VALUE!"]
    ];
    const bad = cases.filter(([formula, expected]) => e.evaluate(formula) !== expected).map(([formula, expected]) => `${formula}: ${e.evaluate(formula)} (mong ${expected})`);
    if (bad.length) throw new Error(bad.join(" | "));
  });

  return results;
}
