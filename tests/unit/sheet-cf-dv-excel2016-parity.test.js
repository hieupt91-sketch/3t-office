import { CONDITIONAL_FORMAT_TYPES, conditionalRuleMatches } from "../../apps/sheet/conditional-formatting.js";
import { dateToSerial } from "../../apps/sheet/sheet-data-rules.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function container() {
  return {
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  };
}

function gridWithValues(values) {
  const grid = createSheetGridWithSheets(container(), ["Đối chiếu"]);
  values.forEach((value, index) => grid.setCellValue("A", index + 1, value));
  return grid;
}

export async function runSheetCfDvExcel2016ParityTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Excel 2016 CF: Top/Bottom N và phần trăm là bốn loại riêng, giữ quy tắc đồng hạng", () => {
    assert(CONDITIONAL_FORMAT_TYPES.includes("topPercent") && CONDITIONAL_FORMAT_TYPES.includes("bottomPercent"), "Thiếu loại phần trăm");
    const grid = gridWithValues([10, 40, 30, 20, 50]);
    const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 5 } };
    const top = grid.addConditionalFormattingRule(range, { type: "topPercent", rank: 40, color: "#fff2cc" });
    const bottom = grid.addConditionalFormattingRule(range, { type: "bottomPercent", rank: 40, color: "#fff2cc" });
    const context = grid._conditionalContext();
    const matched = rule => [1, 2, 3, 4, 5].filter(row => conditionalRuleMatches(rule, grid.cellsData.get(`A${row}`).val, "A", row, context));
    assert(matched(top).join(",") === "2,5", `Top 40% phải là A2,A5: ${matched(top)}`);
    assert(matched(bottom).join(",") === "1,4", `Bottom 40% phải là A1,A4: ${matched(bottom)}`);
  });

  test("Excel 2016 CF: thang 2 màu nội suy đúng từng kênh RGB", () => {
    const grid = gridWithValues([0, 25, 50, 75, 100]);
    grid.addConditionalFormattingRule({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, {
      type: "colorScale2", colors: ["#f8696b", "#63be7b"]
    });
    const colors = [1, 2, 3, 4, 5].map(row => grid._conditionalCellVisual("A", row).fill);
    assert(colors.join(",") === "#f8696b,#d37e6f,#ae9373,#89a877,#63be7b", `Màu thực tế: ${colors}`);
  });

  test("Excel 2016 CF: thang 3 màu dùng percentile 50, thanh dữ liệu bắt đầu 0%", () => {
    const grid = gridWithValues([0, 1, 2, 3, 100]);
    const range = { start: { c: "A", r: 1 }, end: { c: "A", r: 5 } };
    grid.addConditionalFormattingRule(range, { type: "colorScale3", colors: ["#f8696b", "#ffeb84", "#63be7b"] });
    grid.addConditionalFormattingRule(range, { type: "dataBar", color: "#638ec6" });
    const colors = [1, 2, 3, 4, 5].map(row => grid._conditionalCellVisual("A", row).fill);
    assert(colors.join(",") === "#f8696b,#fbaa77,#ffeb84,#feeb84,#63be7b", `Màu thực tế: ${colors}`);
    assert(grid._conditionalCellVisual("A", 1).dataBar.percent === 0, "Giá trị nhỏ nhất phải có thanh 0%");
    assert(grid._conditionalCellVisual("A", 5).dataBar.percent === 100, "Giá trị lớn nhất phải có thanh 100%");
  });

  test("Excel 2016 CF: bộ 3 biểu tượng đổi mức tại đúng 33% và 67%", () => {
    const grid = gridWithValues([0, 32, 33, 66, 67, 100]);
    grid.addConditionalFormattingRule({ start: { c: "A", r: 1 }, end: { c: "A", r: 6 } }, { type: "iconSet", iconSet: "3Arrows" });
    const icons = [1, 2, 3, 4, 5, 6].map(row => grid._conditionalCellVisual("A", row).icon);
    assert(icons.join("") === "▼▼▶▶▲▲", `Ngưỡng biểu tượng sai: ${icons.join("")}`);
  });

  test("Excel 2016 DV: đủ 7 kiểu, 8 toán tử, ô trống và ba mức cảnh báo", () => {
    const grid = createSheetGridWithSheets(container(), ["Đối chiếu"]);
    const one = col => ({ start: { c: col, r: 1 }, end: { c: col, r: 1 } });
    const typeCases = [
      ["A", { type: "whole", operator: "between", formula1: 1, formula2: 10 }, 5, 11],
      ["B", { type: "decimal", operator: "greaterThan", formula1: 1.5 }, 2.25, 1],
      ["C", { type: "list", values: "Đạt,Không đạt" }, "Đạt", "Khác"],
      ["D", { type: "date", operator: "between", formula1: "2026-10-16", formula2: "2026-10-26" }, dateToSerial(new Date(2026, 9, 18)), dateToSerial(new Date(2026, 10, 1))],
      ["E", { type: "time", operator: "lessThan", formula1: "12:00" }, "06:00", "18:00"],
      ["F", { type: "textLength", operator: "lessThanOrEqual", formula1: 4 }, "Bốn", "Năm ký"],
      ["G", { type: "custom", formula1: "=MOD(G1,2)=0" }, 2, 3]
    ];
    grid.formulaEngine.evaluate = formula => formula === "=MOD(G1,2)=0" && Number(grid._validationProbe) % 2 === 0;
    for (const [col, config, good, bad] of typeCases) {
      const style = col < "D" ? "stop" : col < "F" ? "warning" : "information";
      const rule = grid.addDataValidation(one(col), {
        ...config, allowBlank: true, showInputMessage: true, inputTitle: "Gợi ý", inputMessage: "Nhập đúng",
        showErrorMessage: true, errorStyle: style, errorTitle: "Chưa đúng", errorMessage: "Kiểm tra lại"
      });
      grid._validationProbe = good;
      assert(rule && grid.validateCellValue(col, 1, good).valid, `${config.type} từ chối giá trị đúng`);
      grid._validationProbe = bad;
      assert(!grid.validateCellValue(col, 1, bad).valid, `${config.type} nhận giá trị sai`);
      assert(grid.validateCellValue(col, 1, "").valid, `${config.type} không bỏ qua ô trống`);
      assert(rule.errorStyle === style && rule.inputTitle === "Gợi ý" && rule.errorMessage === "Kiểm tra lại", `${config.type} mất thông báo`);
    }
    const operators = [
      ["between", 1.5, 1, 2], ["notBetween", 3, 1, 2], ["equal", 2, 2], ["notEqual", 3, 2],
      ["greaterThan", 3, 2], ["lessThan", 1, 2], ["greaterThanOrEqual", 2, 2], ["lessThanOrEqual", 2, 2]
    ];
    operators.forEach(([operator, value, formula1, formula2], index) => {
      const col = grid._columnLabel(index + 8);
      grid.addDataValidation(one(col), { type: "decimal", operator, formula1, formula2 });
      assert(grid.validateCellValue(col, 1, value).valid, `Toán tử ${operator} sai`);
    });
    grid.addDataValidation(one("P"), { type: "whole", operator: "greaterThan", formula1: 0, allowBlank: false });
    assert(!grid.validateCellValue("P", 1, "").valid, "IgnoreBlank=false vẫn nhận ô trống");
  });

  return results;
}
