/** Behavioral tests — Sheet conditional formatting and data validation. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetRulesValidationTests() {
  const results = [];
  const test = (name, callback) => {
    try {
      callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Conditional Formatting: đánh giá lại khi giá trị ô thay đổi", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const range = { start: { c: "A", r: 10 }, end: { c: "A", r: 12 } };
    grid.addConditionalFormattingRule(range, { type: "greaterThan", value: 10, color: "#ff0000" });
    grid.setCellValue("A", 10, 12);
    assert(grid._matchingConditionalRule("A", 10)?.color === "#ff0000", "12 phải khớp quy tắc > 10");
    grid.setCellValue("A", 10, 8);
    assert(grid._matchingConditionalRule("A", 10) === null, "8 không được tiếp tục giữ định dạng > 10");
    grid.addConditionalFormattingRule(range, { type: "lessThan", value: 5, color: "#00ff00" });
    grid.setCellValue("A", 11, 4);
    assert(grid._matchingConditionalRule("A", 11)?.color === "#00ff00", "4 phải khớp quy tắc < 5");
    grid.addConditionalFormattingRule(range, { type: "blank", color: "#ffff00" });
    assert(grid._matchingConditionalRule("A", 12)?.color === "#ffff00", "ô A12 trống phải khớp quy tắc cảnh báo");
  });

  test("Conditional Formatting: rules và kết quả không rò rỉ chéo sheet", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.addConditionalFormattingRule({ start: { c: "B", r: 2 }, end: { c: "B", r: 2 } }, { type: "greaterThan", value: 50, color: "#abc123" });
    grid.setCellValue("B", 2, 100);
    assert(grid._matchingConditionalRule("B", 2), "sheet đầu phải áp dụng rule");
    grid.switchSheet("Kế hoạch Q3");
    grid.setCellValue("B", 2, 100);
    assert(grid.getConditionalFormattingRules().length === 0, "sheet thứ hai phải có mảng rule riêng rỗng");
    assert(grid._matchingConditionalRule("B", 2) === null, "cùng tọa độ và giá trị không được dính rule sheet đầu");
    grid.switchSheet("Dự toán chi phí");
    assert(grid.getConditionalFormattingRules().length === 1, "rule sheet đầu phải được giữ nguyên khi quay lại");
  });

  test("Conditional Formatting: xóa một quy tắc khỏi trang hiện tại và có thể hoàn tác", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3"]);
    const rule = grid.addConditionalFormattingRule({ start: { c: "C", r: 2 }, end: { c: "C", r: 6 } }, { type: "greaterThan", value: 2000, color: "#fed7aa" });
    assert(grid.deleteConditionalFormattingRule(rule.id), "quy tắc hiện có phải xóa được");
    assert(grid.getConditionalFormattingRules().length === 0, "sau khi xóa, danh sách phải rỗng");
    assert(grid.undo(), "xóa quy tắc phải có thể hoàn tác");
    assert(grid.getConditionalFormattingRules().some(item => item.id === rule.id), "hoàn tác phải khôi phục đúng quy tắc");
  });

  test("Data Validation danh sách: cho qua giá trị hợp lệ và cảnh báo giá trị lạ", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const range = { start: { c: "C", r: 1 }, end: { c: "C", r: 3 } };
    grid.addDataValidation(range, { type: "list", values: "Mới, Đang làm, Hoàn tất" });
    assert(grid.validateCellValue("C", 2, "Hoàn tất").valid, "giá trị có trong danh sách phải hợp lệ");
    const invalid = grid.validateCellValue("C", 2, "Đã hủy");
    assert(!invalid.valid && invalid.message.includes("Mới"), "giá trị ngoài danh sách phải có cảnh báo rõ ràng");
    assert(grid.getValidationForCell("D", 2) === null, "validation không được áp dụng ngoài vùng C1:C3");
  });

  test("Data Validation số: giữ input nhưng phân loại đúng min-max và độc lập theo sheet", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const range = { start: { c: "D", r: 5 }, end: { c: "D", r: 6 } };
    grid.addDataValidation(range, { type: "numberRange", min: 10, max: 20 });
    grid.setCellValue("D", 5, 25);
    assert(grid.cellsData.get("D5").val === 25, "giá trị vi phạm vẫn phải được giữ để không phá luồng nhập liệu");
    assert(!grid.validateCellValue("D", 5).valid, "25 phải bị cảnh báo ngoài khoảng 10-20");
    grid.setCellValue("D", 5, 15);
    assert(grid.validateCellValue("D", 5).valid, "15 phải hợp lệ trong khoảng 10-20");
    grid.switchSheet("Nhân sự");
    assert(grid.getDataValidations().length === 0 && grid.validateCellValue("D", 5, 25).valid, "validation không được rò sang sheet Nhân sự");
  });

  return results;
}
