/** Behavioral tests — Sheet conditional formatting and data validation. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { dateToSerial } from "../../apps/sheet/sheet-data-rules.js";
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
    // Excel coi ô trống là 0 nên "nhỏ hơn 5" cũng khớp ô trống (đo 16/10); giới hạn quy tắc này ở A11 để ý định test (ô trống khớp quy tắc ô trống) không bị che bởi quy tắc thêm trước.
    grid.addConditionalFormattingRule({ start: { c: "A", r: 11 }, end: { c: "A", r: 11 } }, { type: "lessThan", value: 5, color: "#00ff00" });
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

  test("EXCEL-G1: đủ nhóm quy tắc, sửa và đổi thứ tự ưu tiên", () => {
    const grid = createSheetGridWithSheets(container(), ["Báo cáo"]);
    const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 5 } };
    [10, 20, 20, 40, 50].forEach((value, index) => grid.setCellValue("A", index + 1, value));
    const configs = [
      { type: "between", value: 15, value2: 25 }, { type: "equal", value: 40 },
      { type: "textContains", text: "20" }, { type: "dateOccurs", timePeriod: "today" },
      { type: "duplicate" }, { type: "top", rank: 2 }, { type: "bottom", rank: 2 },
      { type: "aboveAverage" }, { type: "belowAverage" }, { type: "dataBar", color: "#638ec6" },
      { type: "colorScale2", colors: ["#f8696b", "#63be7b"] },
      { type: "colorScale3", colors: ["#f8696b", "#ffeb84", "#63be7b"] },
      { type: "iconSet", iconSet: "3TrafficLights1" }, { type: "formula", formula: "=A1>=40" }
    ];
    const rules = configs.map(config => grid.addConditionalFormattingRule(range, config));
    assert(rules.every(Boolean), "mọi loại quy tắc phải tạo được qua model UI");
    assert(grid.getConditionalFormattingRules().length === configs.length, "phải giữ đủ mọi quy tắc");
    assert(grid._matchingConditionalRule("A", 2)?.type === "between", "20 phải khớp quy tắc giữa ưu tiên đầu");
    const visual = grid._conditionalCellVisual("A", 5);
    assert(visual.dataBar?.percent === 100 && visual.fill && visual.icon, "ô lớn nhất phải có thanh, thang màu và biểu tượng");
    const edited = grid.updateConditionalFormattingRule(rules[0].id, { type: "greaterThan", value: 45, color: "#ff0000" }, range);
    assert(edited?.type === "greaterThan", "quản lý quy tắc phải sửa được rule");
    assert(grid.moveConditionalFormattingRule(rules[1].id, "up"), "phải tăng được mức ưu tiên");
    assert(grid.getConditionalFormattingRules()[0].id === rules[1].id, "thứ tự mảng phải phản ánh ưu tiên");
    assert(grid.undo(), "đổi ưu tiên phải hoàn tác được");
    assert(grid.getConditionalFormattingRules()[0].id === rules[0].id, "hoàn tác phải trả lại ưu tiên cũ");
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

  test("Data Validation đủ kiểu, toán tử và mức cảnh báo", () => {
    const grid = createSheetGridWithSheets(container(), ["Dữ liệu"]);
    const one = { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } };
    const cases = [
      [{ type: "whole", operator: "greaterThan", formula1: 5 }, 6, 5],
      [{ type: "decimal", operator: "notBetween", formula1: 1.5, formula2: 2.5 }, 3.1, 2],
      [{ type: "date", operator: "between", formula1: "2026-10-01", formula2: "2026-10-31" }, dateToSerial(new Date(2026, 9, 13)), dateToSerial(new Date(2026, 10, 1))],
      [{ type: "time", operator: "lessThan", formula1: "12:00" }, "08:30", "13:00"],
      [{ type: "textLength", operator: "lessThanOrEqual", formula1: 4 }, "Bốn", "Năm ký"]
    ];
    cases.forEach(([config, good, bad], index) => {
      const col = grid._columnLabel(index + 1);
      const range = { start: { c: col, r: 1 }, end: { c: col, r: 1 } };
      const rule = grid.addDataValidation(range, { ...config, inputTitle: "Gợi ý", inputMessage: "Nhập đúng", showInputMessage: true, errorStyle: "warning", errorTitle: "Chưa đúng", errorMessage: "Kiểm tra lại" });
      assert(rule && grid.validateCellValue(col, 1, good).valid, `${config.type} phải nhận giá trị hợp lệ`);
      const invalid = grid.validateCellValue(col, 1, bad);
      assert(!invalid.valid && invalid.message === "Kiểm tra lại" && invalid.rule.errorStyle === "warning", `${config.type} phải giữ thông báo/mức cảnh báo`);
    });
    grid.formulaEngine.evaluate = formula => formula === "=A1>0";
    grid.addDataValidation({ start: { c: "F", r: 1 }, end: { c: "F", r: 1 } }, { type: "custom", formula1: "=A1>0" });
    assert(grid.validateCellValue("F", 1, "x").valid, "công thức tùy chỉnh phải được đánh giá qua formula engine");
    assert(grid.clearDataValidations(one), "Xóa tất cả phải gỡ validation đúng vùng chọn");
    assert(grid.getValidationForCell("A", 1) === null && grid.getValidationForCell("B", 1), "Xóa vùng A1 không được gỡ quy tắc ở B1");
  });

  test("Bộ lọc điều kiện và màu ẩn đúng hàng, kể cả giá trị trùng màu khác", () => {
    const grid = createSheetGridWithSheets(container(), ["Lọc"]);
    grid.sheetStates[grid.activeSheet].filterRange = "A1:C6";
    [[2, "An", 5], [3, "Bình", 12], [4, "Anh", 20], [5, "Chi", 8], [6, "An", 30]].forEach(([row, name, amount]) => {
      grid.setCellValue("A", row, name); grid.setCellValue("B", row, amount);
    });
    grid.cellsData.get("A2").style.backgroundColor = "#ff0000";
    grid.cellsData.get("A6").style.backgroundColor = "#00ff00";
    grid.applyAdvancedFilter("A", { type: "text", operator: "startsWith", value: "An" });
    assert(!grid.hiddenRows.has(2) && !grid.hiddenRows.has(4) && !grid.hiddenRows.has(6) && grid.hiddenRows.has(3) && grid.hiddenRows.has(5), "lọc bắt đầu bằng phải ẩn đúng hàng");
    grid.clearAllFilters();
    grid.applyAdvancedFilter("B", { type: "number", operator: "top10", count: 2 });
    assert(!grid.hiddenRows.has(4) && !grid.hiddenRows.has(6) && grid.hiddenRows.has(2), "Top N phải giữ hai số lớn nhất");
    grid.clearAllFilters();
    grid.applyAdvancedFilter("A", { type: "color", colorType: "fill", color: "#ff0000" });
    assert(!grid.hiddenRows.has(2) && grid.hiddenRows.has(6), "lọc màu phải phân biệt hai ô cùng chữ nhưng khác màu");
  });

  return results;
}
