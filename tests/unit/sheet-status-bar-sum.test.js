/**
 * VN Office — Unit Tests: VN Sheet thanh trạng thái (status bar) Sum/Average/
 * Count tính SAI khi mở file thật.
 *
 * Lỗi thật đã xác nhận (mở file thật "Sữa chữa UB quảng trạch.xlsx", thanh
 * trạng thái hiện TỔNG CỘNG: 226.479.494.916.838.460 đ — trong khi giá trị
 * lớn nhất trong toàn bộ sheet chỉ khoảng vài chục triệu). Đối chiếu code
 * `_calculateStats()` phát hiện 3 lỗi cộng dồn:
 *
 * 1. Duyệt TOÀN BỘ this.cellsData (cả sheet) thay vì chỉ vùng đang CHỌN —
 *    Excel thật chỉ tính Sum/Average/Count trên vùng/ô đang bôi đen.
 * 2. Gọi `itm.val.toString().replace(/\./g, "")` vô điều kiện — nếu itm.val
 *    là SỐ THỰC (number) có phần thập phân thật (ví dụ 23814000.5), dấu
 *    chấm thập phân bị xóa nhầm thành dấu phân cách nghìn, biến 23814000.5
 *    thành 238140005 (sai gấp ~10 lần) — cùng lớp lỗi "xén dấu thập phân"
 *    đã sửa trước đây ở formula engine (xem project_formula_precision_bug_fixed).
 * 3. Loại bỏ hẳn ô có công thức (itm.formula) dù itm.val đã là kết quả tính
 *    toán mới nhất — Excel thật vẫn cộng ô công thức vào Sum/Average.
 *
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

function container() {
  return {
    style: {}, className: "", classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
}

function parseVndSum(formatted) {
  // "23.814.000,5 ₫" -> 23814000.5 (chỉ dùng trong test, không phải code sản phẩm)
  return Number(String(formatted).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}

export async function runSheetStatusBarSumTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("_calculateStats(): CHỈ tính trong vùng đang chọn, không cộng dồn toàn bộ sheet (bug thật: file có 5 sheet dữ liệu, thanh trạng thái cộng nhầm hàng trăm ô ngoài vùng chọn)", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: 100, formula: "", style: {} });
    grid.cellsData.set("B1", { val: 200, formula: "", style: {} });
    // Ô NGOÀI vùng chọn dự kiến — KHÔNG được tính vào tổng.
    grid.cellsData.set("Z50", { val: 999999999, formula: "", style: {} });
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } };
    const stats = grid._calculateStats();
    assert(stats.count === 2, `count phải là 2 (chỉ A1,B1 trong vùng chọn), thực tế: ${stats.count}`);
    const sum = parseVndSum(stats.sum);
    assert(sum === 300, `sum phải là 300 (100+200, KHÔNG cộng Z50=999999999), thực tế: ${sum}`);
  });

  test("_calculateStats(): số thực (number) có phần thập phân KHÔNG bị xén nhầm dấu chấm thành hàng nghìn (bug thật: 23814000.5 -> 238140005)", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: 23814000.5, formula: "", style: {} });
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    const stats = grid._calculateStats();
    const sum = parseVndSum(stats.sum);
    // Thanh trạng thái phải giữ nguyên phần thập phân của cả Sum lẫn Average.
    assert(sum === 23814000.5, `sum phải giữ đúng 23814000.5, KHÔNG được xén dấu thập phân thành 238140005, thực tế: ${sum}`);
    assert(parseVndSum(stats.avg) === 23814000.5, `average ô đơn phải giữ đúng 23814000.5, thực tế: ${stats.avg}`);
  });

  test("_calculateStats(): ô có CÔNG THỨC vẫn được cộng vào Sum/Count (dùng kết quả itm.val đã tính, khớp hành vi Excel thật)", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: 100, formula: "", style: {} });
    grid.cellsData.set("B1", { val: 250, formula: "=A1+150", style: {} });
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } };
    const stats = grid._calculateStats();
    assert(stats.count === 2, `count phải là 2 (kể cả ô công thức B1), thực tế: ${stats.count}`);
    const sum = parseVndSum(stats.sum);
    assert(sum === 350, `sum phải là 350 (100+250, ô công thức B1 phải được cộng), thực tế: ${sum}`);
  });

  test("_calculateStats(): chỉ chọn 1 ô số duy nhất thì sum = giá trị ô đó, count = 1 (giống Excel thật khi bôi đen 1 ô)", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("C3", { val: 5000000, formula: "", style: {} });
    grid.selectedCoord = { c: "C", r: 3 };
    grid.selectionRange = { start: { c: "C", r: 3 }, end: { c: "C", r: 3 } };
    const stats = grid._calculateStats();
    assert(stats.count === 1, `count phải là 1, thực tế: ${stats.count}`);
    assert(parseVndSum(stats.sum) === 5000000, `sum phải là 5000000, thực tế: ${parseVndSum(stats.sum)}`);
  });

  test("_calculateStats(): ô chữ (text) trong vùng chọn bị bỏ qua khỏi Sum/Count, không làm hỏng tổng", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: 100, formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Ghi chú", formula: "", style: {} });
    grid.cellsData.set("A3", { val: 200, formula: "", style: {} });
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 3 } };
    const stats = grid._calculateStats();
    assert(stats.count === 2, `count phải là 2 (chỉ A1,A3 là số), thực tế: ${stats.count}`);
    assert(parseVndSum(stats.sum) === 300, `sum phải là 300, thực tế: ${parseVndSum(stats.sum)}`);
  });

  test("_calculateStats(): tái tạo đúng quy mô lỗi thật đã báo cáo — nhiều ô rải rác NGOÀI vùng chọn không được cộng dồn thành số khổng lồ", () => {
    const grid = new SheetGridController(container());
    // Mô phỏng 1 sheet lớn nhiều dữ liệu số rải khắp nơi (như file thật nhiều dòng/cột).
    for (let r = 1; r <= 50; r++) {
      for (const col of ["A", "B", "C", "D", "E"]) {
        grid.cellsData.set(`${col}${r}`, { val: 1000000 + r, formula: "", style: {} });
      }
    }
    // Người dùng chỉ chọn 1 ô A1 (mặc định khi mở file).
    grid.selectedCoord = { c: "A", r: 1 };
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    const stats = grid._calculateStats();
    assert(stats.count === 1, `count phải là 1 (chỉ A1), thực tế: ${stats.count}`);
    assert(parseVndSum(stats.sum) === 1000001, `sum phải là 1000001 (chỉ giá trị A1), KHÔNG được cộng cả 250 ô, thực tế: ${parseVndSum(stats.sum)}`);
  });

  return results;
}
