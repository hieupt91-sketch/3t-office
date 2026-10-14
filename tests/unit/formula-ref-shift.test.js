import { shiftFormulaRefs, translateFormulaRefs } from "../../apps/sheet/formula-ref-shift.js";

export async function runFormulaRefShiftTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => { if (actual !== expected) throw new Error(`${label} mong đợi ${expected} nhưng được ${actual}`); };
  const del = (f, at, extra = {}) => shiftFormulaRefs(f, { ownerSheet: "S1", targetSheet: "S1", axis: "row", at, delta: -1, ...extra });
  const ins = (f, at, extra = {}) => shiftFormulaRefs(f, { ownerSheet: "S1", targetSheet: "S1", axis: "row", at, delta: 1, ...extra });

  await test("Xóa hàng: tham chiếu ô bị xóa thành #REF!, ô sau dịch lên", () => {
    eq(del("=A2*10", 2), "=#REF!*10");
    eq(del("=A3+A1", 2), "=A2+A1");
    eq(del("=$A$3", 2), "=$A$2");
  });

  await test("Xóa hàng: vùng co lại như Excel (đầu, giữa, cuối), xóa hết vùng thành #REF!", () => {
    eq(del("=SUM(A1:A4)", 1), "=SUM(A1:A3)");
    eq(del("=SUM(A1:A4)", 2), "=SUM(A1:A3)");
    eq(del("=SUM(A1:A4)", 4), "=SUM(A1:A3)");
    eq(del("=SUM(A2:A2)", 2), "=SUM(#REF!)");
    eq(del("=SUM(A3:A5)", 1), "=SUM(A2:A4)");
    eq(del("=SUM(A1:A2)", 5), "=SUM(A1:A2)");
  });

  await test("Chèn hàng: vùng giãn nếu chèn bên trong, không giãn nếu chèn ngay sau vùng", () => {
    eq(ins("=SUM(A1:A3)", 2), "=SUM(A1:A4)");
    eq(ins("=SUM(A1:A3)", 1), "=SUM(A2:A4)");
    eq(ins("=SUM(A1:A3)", 4), "=SUM(A1:A3)");
    eq(ins("=$A$3*2", 2), "=$A$4*2");
  });

  await test("Chèn/xóa cột và vùng cả cột/cả hàng", () => {
    eq(shiftFormulaRefs("=SUM(A1:C1)", { ownerSheet: "S1", targetSheet: "S1", axis: "col", at: 2, delta: -1 }), "=SUM(A1:B1)");
    eq(shiftFormulaRefs("=B1*2", { ownerSheet: "S1", targetSheet: "S1", axis: "col", at: 2, delta: -1 }), "=#REF!*2");
    eq(shiftFormulaRefs("=SUM(B:C)", { ownerSheet: "S1", targetSheet: "S1", axis: "col", at: 1, delta: 1 }), "=SUM(C:D)");
    eq(del("=SUM(2:3)", 1), "=SUM(1:2)");
    eq(del("=SUM(B:C)", 1), "=SUM(B:C)");
  });

  await test("Chỉ đổi tham chiếu trỏ tới trang bị tác động", () => {
    eq(ins("=Sheet2!A5+A5", 2, { ownerSheet: "S1", targetSheet: "S1" }), "=Sheet2!A5+A6");
    eq(ins("=S1!A5+A5", 2, { ownerSheet: "Sheet2", targetSheet: "S1" }), "=S1!A6+A5");
    eq(ins("='Báo giá'!A5+A5", 2, { ownerSheet: "Sheet2", targetSheet: "Báo giá" }), "='Báo giá'!A6+A5");
    eq(del("=S1!A2+A2", 2, { ownerSheet: "Sheet2", targetSheet: "S1" }), "=#REF!+A2");
  });

  await test("Bỏ qua chuỗi, ngoặc vuông của bảng và tên hàm có số", () => {
    eq(ins('=LOG10(A5)&"A5"', 2), '=LOG10(A6)&"A5"');
    eq(ins("=SUM(Table1[Col2])+A5", 2), "=SUM(Table1[Col2])+A6");
    eq(ins("=ATAN2(A5,B7)", 2), "=ATAN2(A6,B8)");
  });

  await test("Tham chiếu 3-D không bị đổi nhầm thành tham chiếu thường", () => {
    eq(ins("=SUM(Sheet1:Sheet3!A5)", 2, { ownerSheet: "Sheet1", targetSheet: "Sheet3" }), "=SUM(Sheet1:Sheet3!A5)");
  });

  await test("Dịch khi sao chép/sắp xếp: thành phần tương đối đổi, tuyệt đối giữ, ra ngoài biên là #REF!", () => {
    eq(translateFormulaRefs("=A2*10", -1, 0), "=A1*10");
    eq(translateFormulaRefs("=$A2+B$1+$C$3", 2, 1), "=$A4+C$1+$C$3");
    eq(translateFormulaRefs("=SUM(A1:B2)", 1, 1), "=SUM(B2:C3)");
    eq(translateFormulaRefs("=A1", -1, 0), "=#REF!");
    eq(translateFormulaRefs("=Y1+AA1", 0, 3), "=AB1+AD1");
    eq(translateFormulaRefs('=LOG10(A1)&"A1"', 1, 0), '=LOG10(A2)&"A1"');
    eq(translateFormulaRefs("=Sheet2!A1+A1", 1, 0), "=Sheet2!A2+A2");
  });

  return results;
}
