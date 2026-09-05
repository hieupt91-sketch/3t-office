/**
 * VN Sheet — Evaluate Formula stepper & dialog wiring.
 * Intermediate values must come from FormulaEngine, not hardcoded display strings.
 */

import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import {
  createEvaluateFormulaSession,
  createEvaluateFormulaSessionFromGrid,
  findNextEvaluationSpan,
  formatFormulaValue,
  renderFormulaHtml,
  valuesMatch
} from "../../apps/sheet/evaluate-formula.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const container = () => ({
  querySelector() { return null; },
  querySelectorAll() { return []; },
  classList: { add() {}, remove() {}, toggle() {} }
});

const assert = (value, message) => { if (!value) throw new Error(message); };

function nestedIfCells() {
  return new Map([
    ["A1", { val: 5, formula: "" }],
    ["A2", { val: 4, formula: "" }],
    ["A3", { val: 3, formula: "" }],
    ["B1", { val: 2, formula: "" }],
    ["C1", { val: 3, formula: "" }],
    ["D1", { val: 1, formula: "" }],
    ["E1", { val: 1, formula: "" }]
  ]);
}

function runAllSteps(session) {
  const seen = [];
  let guard = 0;
  while (session.getState().canEvaluate && guard < 20) {
    const before = session.getState();
    session.evaluate();
    const last = session.getState().steps.at(-1);
    seen.push({
      underlined: before.underlinedText,
      kind: before.underline?.kind,
      value: last.value,
      token: last.token,
      after: last.after
    });
    guard++;
  }
  return seen;
}

export async function runSheetEvaluateFormulaTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Evaluate Formula: IF(SUM(...)) bước SUM, so sánh, nhánh được chọn — giá trị engine thật", () => {
    const cells = nestedIfCells();
    const engine = new FormulaEngine(cells);
    const formula = "=IF(SUM(A1:A3)>10,B1*C1,D1+E1)";
    const handSum = 5 + 4 + 3;
    const handCompare = handSum > 10;
    const handTrue = 2 * 3;
    const handFalse = 1 + 1;
    const engineSum = engine.evaluate("=SUM(A1:A3)");
    const engineTrue = engine.evaluate("=B1*C1");
    const engineFalse = engine.evaluate("=D1+E1");
    const engineFinal = engine.evaluate(formula);
    assert(engineSum === handSum, `Engine SUM=${engineSum}, tính tay ${handSum}`);
    assert(engineTrue === handTrue, `Engine B1*C1=${engineTrue}`);
    assert(engineFalse === handFalse, `Engine D1+E1=${engineFalse}`);
    assert(engineFinal === handTrue, `Engine IF final=${engineFinal}, cần ${handTrue}`);

    const session = createEvaluateFormulaSession({
      formula,
      coord: "F1",
      engine,
      cellValue: engineFinal,
      getCell: coord => cells.get(coord) || null
    });
    const first = findNextEvaluationSpan(formula);
    assert(first?.text === "SUM(A1:A3)", `Bước đầu phải là SUM, thực tế ${first?.text}`);

    const steps = runAllSteps(session);
    assert(steps[0].underlined === "SUM(A1:A3)", `Bước 1 gạch chân ${steps[0].underlined}`);
    assert(valuesMatch(steps[0].value, engineSum), `Bước 1 phải = engine SUM (${engineSum}), được ${steps[0].value}`);
    assert(valuesMatch(steps[0].value, handSum), `Bước 1 phải = 12 tính tay, được ${steps[0].value}`);
    assert(steps[1].underlined.replace(/\s/g, "") === "12>10", `Bước 2 so sánh, được ${steps[1].underlined}`);
    assert(valuesMatch(steps[1].value, handCompare), `Bước 2 phải TRUE, được ${steps[1].value}`);
    assert(steps[2].underlined === "B1*C1", `Bước 3 nhánh TRUE, được ${steps[2].underlined}`);
    assert(valuesMatch(steps[2].value, engineTrue), `Bước 3 phải = engine B1*C1, được ${steps[2].value}`);
    assert(!steps.some(step => step.underlined === "D1+E1"), "Không được tính nhánh FALSE khi điều kiện TRUE");
    const done = session.getState();
    assert(done.done, "Phải kết thúc sau khi IF còn giá trị");
    assert(valuesMatch(done.finalValue, engineFinal), `Final ${done.finalValue} khác engine ${engineFinal}`);
    assert(valuesMatch(done.finalValue, done.cellValue), "Final phải khớp giá trị ô");
  });

  await test("Evaluate Formula: IF FALSE đi nhánh D1+E1, không tính B1*C1", () => {
    const cells = new Map([
      ["A1", { val: 1, formula: "" }],
      ["A2", { val: 1, formula: "" }],
      ["A3", { val: 1, formula: "" }],
      ["B1", { val: 9, formula: "" }],
      ["C1", { val: 9, formula: "" }],
      ["D1", { val: 4, formula: "" }],
      ["E1", { val: 5, formula: "" }]
    ]);
    const engine = new FormulaEngine(cells);
    const formula = "=IF(SUM(A1:A3)>10,B1*C1,D1+E1)";
    const session = createEvaluateFormulaSession({ formula, engine, cellValue: engine.evaluate(formula), getCell: coord => cells.get(coord) });
    const steps = runAllSteps(session);
    assert(valuesMatch(steps[0].value, 3), `SUM phải = 3, được ${steps[0].value}`);
    assert(valuesMatch(steps[1].value, false), `3>10 phải FALSE, được ${steps[1].value}`);
    assert(steps[2].underlined === "D1+E1", `Nhánh FALSE, được ${steps[2].underlined}`);
    assert(valuesMatch(steps[2].value, engine.evaluate("=D1+E1")), "Nhánh FALSE phải tính bằng engine");
    assert(!steps.some(step => step.underlined === "B1*C1"), "Không tính nhánh TRUE khi FALSE");
    assert(valuesMatch(session.getState().finalValue, 9), `Final phải 9, được ${session.getState().finalValue}`);
  });

  await test("Evaluate Formula: Bước vào ô có công thức rồi Bước ra / Khởi động lại", () => {
    const cells = nestedIfCells();
    cells.set("G1", { val: 12, formula: "=SUM(A1:A3)" });
    const engine = new FormulaEngine(cells);
    const session = createEvaluateFormulaSession({
      formula: "=G1",
      coord: "H1",
      engine,
      cellValue: 12,
      getCell: coord => cells.get(coord) || null
    });
    assert(session.getState().canStepIn, "G1 có công thức thì phải Bước vào được");
    session.stepIn();
    assert(session.getState().formula === "=SUM(A1:A3)", "Bước vào phải mở công thức G1");
    assert(session.getState().underlinedText === "SUM(A1:A3)", "Trong G1 phải gạch chân SUM");
    session.evaluate();
    assert(valuesMatch(session.getState().finalValue, engine.evaluate("=SUM(A1:A3)")), "Step-in SUM phải ra 12");
    session.stepOut();
    assert(session.getState().formula === "=G1", "Bước ra phải về =G1");
    session.restart();
    assert(session.getState().formula === "=G1" && session.getState().steps.length === 0, "Khởi động lại phải xóa bước");
  });

  await test("Evaluate Formula: view-only — không đổi dữ liệu / undo trên lưới", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, 5, false);
    grid.setCellValue("A", 2, 4, false);
    grid.setCellValue("A", 3, 3, false);
    grid.setCellValue("B", 1, 2, false);
    grid.setCellValue("C", 1, 3, false);
    grid.setCellValue("D", 1, 1, false);
    grid.setCellValue("E", 1, 1, false);
    grid.setCellValue("F", 1, "=IF(SUM(A1:A3)>10,B1*C1,D1+E1)", false);
    const undoBefore = grid.undoStack.length;
    const snapshot = JSON.stringify([...grid.cellsData.entries()]);
    grid.selectCell("F", 1);
    const session = createEvaluateFormulaSessionFromGrid(grid);
    runAllSteps(session);
    assert(valuesMatch(session.getState().finalValue, grid.cellsData.get("F1").val), "Final phải khớp val ô F1");
    assert(grid.undoStack.length === undoBefore, "Không được đẩy history");
    assert(JSON.stringify([...grid.cellsData.entries()]) === snapshot, "Không được sửa Map ô");
  });

  await test("Evaluate Formula: ô thường báo not-formula; HTML gạch chân escape", () => {
    const cells = new Map([["A1", { val: 5, formula: "" }]]);
    const engine = new FormulaEngine(cells);
    const session = createEvaluateFormulaSession({ formula: "5", engine, getCell: () => null });
    assert(session.getState().error === "not-formula", "Ô không có = phải error");
    const html = renderFormulaHtml("=IF(A1>0,1,2)", { start: 4, end: 8, text: "A1>0" });
    assert(html.includes('class="vno-eval-underline"'), "Phải bọc span gạch chân");
    assert(html.includes("A1&gt;0"), "Phải escape dấu > trong công thức");
    assert(!html.includes("A1>0"), "Không được để raw < > trong HTML công thức");
    assert(formatFormulaValue(true) === "TRUE" && formatFormulaValue(false) === "FALSE", "Boolean Excel-style");
  });

  await test("Evaluate Formula: ribbon, icon, i18n, UNO và SheetAdapter", async () => {
    const formulasTab = SHEET_RIBBON_TABS.find(tab => tab.id === "formulas");
    const auditing = formulasTab?.groups.find(group => group.labelKey === "sheetRibbon.group.formulaAuditing");
    const found = JSON.stringify(auditing?.items || []).includes("sheet.formula.evaluateFormula");
    assert(found, "Ribbon nhóm Kiểm tra công thức phải có Ước lượng công thức");
    assert(ICONS.evaluateFormula?.includes("<svg"), "Thiếu icon evaluateFormula");
    assert(viStrings.commands["sheet.formula.evaluateFormula"]?.label === "Ước lượng công thức", "Thiếu i18n VI");
    assert(enStrings.commands["sheet.formula.evaluateFormula"]?.label === "Evaluate Formula", "Thiếu i18n EN");
    assert(viStrings.sheetDialogs.evaluateFormulaEvaluate === "Ước lượng", "Thiếu nhãn nút Ước lượng");
    assert(VN_TO_UNO_MAP["sheet.formula.evaluateFormula"] === ".uno:EvaluateFormula", "Thiếu UNO mapping");
    let calls = 0;
    const mock = new Proxy({}, { get(target, key) { if (key in target) return target[key]; return () => { if (key === "showEvaluateFormulaDialog") calls++; return true; }; } });
    new SheetAdapter(mock).attach();
    assert(await globalCommandBus.execute("sheet.formula.evaluateFormula"), "Command bus không chạy evaluateFormula");
    assert(calls === 1, "Adapter không gọi showEvaluateFormulaDialog đúng một lần");
  });

  return results;
}
