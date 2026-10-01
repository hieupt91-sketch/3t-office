import {
  FUNCTION_CATALOG,
  SUPPORTED_FUNCTION_NAMES,
  getFunctionSuggestions,
  parseFormulaContext
} from "../../apps/sheet/formula-engine.js";
import {
  FormulaEntrySession,
  findFormulaReferences,
  insertFunctionSuggestion,
  insertPointReference,
  isFormulaReferenceInsertionPoint,
  makeCellReference
} from "../../apps/sheet/formula-entry.js";

export async function runSheetFormulaEntryTests() {
  const results = [];
  const supportedSuggestions = getFunctionSuggestions("SU");
  results.push({
    name: "Formula entry: autocomplete returns implemented functions with Vietnamese descriptions",
    pass: supportedSuggestions.length > 0 && supportedSuggestions.every(item => SUPPORTED_FUNCTION_NAMES.has(item.name) && item.desc.trim().length > 0) &&
      supportedSuggestions.some(item => item.name === "SUM") &&
      FUNCTION_CATALOG.every(item => SUPPORTED_FUNCTION_NAMES.has(item.name))
  });

  const tooltip = parseFormulaContext("=SUM(A1, ", 9);
  results.push({
    name: "Formula entry: argument tooltip advances its bold parameter after a comma",
    pass: tooltip.mode === "syntax_tooltip" && tooltip.activeParamIndex === 1 && tooltip.funcDef.name === "SUM"
  });

  const suggestion = insertFunctionSuggestion("=SU", 1, 3, "SUM");
  results.push({
    name: "Formula entry: accepting an autocomplete suggestion inserts NAME( and retains the formula prefix",
    pass: suggestion.formula === "=SUM(" && suggestion.caret === 5
  });

  results.push({
    name: "Formula entry: point mode is available after operators and inserted references, but not in text strings",
    pass: isFormulaReferenceInsertionPoint("=SUM(", 5) &&
      isFormulaReferenceInsertionPoint("=A1+", 4) &&
      isFormulaReferenceInsertionPoint("=SUM(A1", 7) &&
      !isFormulaReferenceInsertionPoint('="A1', 4)
  });

  const clicked = insertPointReference("=SUM(", 5, 5, "A1");
  results.push({
    name: "Formula entry: clicking a cell inserts the address at the formula caret",
    pass: clicked.formula === "=SUM(A1" && clicked.caret === 7
  });

  const drag = new FormulaEntrySession({ original: "", value: "=SUM(", caret: 5, mode: "enter" });
  drag.beginDrag("A1");
  drag.updateDrag("A3");
  const liveDragUpdated = drag.value === "=SUM(A1:A3";
  const dragRange = drag.updateDrag("A5");
  drag.endDrag();
  results.push({
    name: "Formula entry: dragging live-replaces the pointed cell with a range",
    pass: liveDragUpdated && dragRange.formula === "=SUM(A1:A5" && drag.lastReference?.end === dragRange.caret
  });

  const shift = new FormulaEntrySession({ value: "=SUM(", caret: 5 });
  shift.insertPoint("A1");
  const extended = shift.insertPoint("B5", { shift: true });
  results.push({
    name: "Formula entry: Shift+click extends the current reference",
    pass: extended.formula === "=SUM(A1:B5"
  });

  const ctrl = new FormulaEntrySession({ value: "=SUM(", caret: 5 });
  ctrl.insertPoint("A1");
  const additive = ctrl.insertPoint("C1", { ctrl: true });
  results.push({
    name: "Formula entry: Ctrl+click adds another comma-separated reference",
    pass: additive.formula === "=SUM(A1,C1"
  });

  results.push({
    name: "Formula entry: cross-sheet references use Excel sheet syntax and quote spaced names",
    pass: makeCellReference("A", 1, "Sheet2", "Sheet1") === "Sheet2!A1" &&
      makeCellReference("B", 5, "Doanh thu", "Sheet1") === "'Doanh thu'!B5" &&
      findFormulaReferences("=SUM(Sheet2!A1:A5)", "Sheet1")[0]?.sheet === "Sheet2" &&
      new FormulaEntrySession({ value: "=SUM(", caret: 5 }).insertPoint("Sheet2!A1").formula === "=SUM(Sheet2!A1"
  });

  const f4 = new FormulaEntrySession({ value: "=SUM($A$1)", caret: 9 });
  const cycle1 = f4.cycleReference();
  const cycle2 = f4.cycleReference();
  const cycle3 = f4.cycleReference();
  const cycle4 = f4.cycleReference();
  results.push({
    name: "Formula entry: F4 cycles $A$1, A$1, $A1, and A1",
    pass: cycle1.formula === "=SUM(A$1)" && cycle2.formula === "=SUM($A1)" &&
      cycle3.formula === "=SUM(A1)" && cycle4.formula === "=SUM($A$1)"
  });

  const cancelled = new FormulaEntrySession({ original: "original", value: "=SUM(A1", caret: 7 }).cancel();
  results.push({
    name: "Formula entry: Esc restores original cell content",
    pass: cancelled === "original"
  });

  const committed = new FormulaEntrySession({ value: "=SUM(A1", caret: 7 }).commit();
  const literalCommitted = new FormulaEntrySession({ value: "abc(", caret: 4 }).commit();
  results.push({
    name: "Formula entry: Enter auto-closes formula parentheses without changing plain text",
    pass: committed === "=SUM(A1)" && literalCommitted === "abc("
  });

  const moved = new FormulaEntrySession({ value: "=SUM(", caret: 5 });
  moved.insertPoint("B2");
  const movedRight = moved.moveReference(1, 0);
  const crossSheetMove = new FormulaEntrySession({ value: "=SUM(", caret: 5 });
  crossSheetMove.insertPoint("Sheet2!A1");
  const movedCrossSheet = crossSheetMove.moveReference(1, 0);
  results.push({
    name: "Formula entry: arrow movement advances relative references and keeps the sheet qualifier",
    pass: movedRight?.formula === "=SUM(C2" && movedCrossSheet?.formula === "=SUM(Sheet2!B1"
  });

  return results;
}
