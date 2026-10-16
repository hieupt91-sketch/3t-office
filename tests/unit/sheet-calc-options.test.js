/**
 * Test Suite: VN Sheet Calculation Options & Formula Parity (AGY-CALC)
 * - Iterative Calculation (Application.Iteration, MaxIterations, MaxChange, circular reference)
 * - Precision as Displayed (ActiveWorkbook.PrecisionAsDisplayed, fullPrecision="0")
 * - 1904 Date System (ActiveWorkbook.Date1904, date1904="1", 1462-day serial shift)
 * - R1C1 Reference Style (Application.ReferenceStyle, formula bar, column headers, name box, conversion)
 * - Calculation Options (Automatic, Automatic Except Data Tables, Manual, Calculate Now, Calculate Sheet, Recalculate before save)
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import {
  a1ToR1C1,
  r1c1ToA1,
  isR1C1Formula,
  formatAddressAsR1C1,
  parseR1C1Address,
  colLetterToNumber,
  colNumberToLetter
} from "../../apps/sheet/r1c1-converter.js";
import { formatByCode, serialToParts } from "../../apps/sheet/excel-format-code.js";
import { NumberFormatter } from "../../apps/sheet/number-formatter.js";
import { CalcOptionsDialog } from "../../apps/sheet/calc-options-dialog.js";
import {
  parseCalculationOptionsFromWorkbook,
  applyCalculationOptionsToFods,
  parseCalculationOptionsFromFods,
  applyCalculationOptionsToWorkbook
} from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const mockContainer = () => {
  const el = {
    setAttribute() {},
    getAttribute() { return null; },
    style: {},
    innerHTML: "",
    className: "",
    appendChild(child) { return child; },
    insertBefore(child) { return child; },
    removeChild(child) { return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    focus() {}
  };
  return el;
};

export async function runSheetCalcOptionsTests() {
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

  // 1. R1C1 Converter
  test("R1C1: a1ToR1C1 chuyển đổi công thức tương đối và tuyệt đối", () => {
    const base = { c: "C", r: 5 }; // C5 -> R5C3
    eq(a1ToR1C1("=A1", base), "=R[-4]C[-2]", "Relative top-left");
    eq(a1ToR1C1("=$A$1", base), "=R1C1", "Absolute");
    eq(a1ToR1C1("=$A1", base), "=R[-4]C1", "Mixed absolute col");
    eq(a1ToR1C1("=A$1", base), "=R1C[-2]", "Mixed absolute row");
    eq(a1ToR1C1("=C5", base), "=RC", "Same cell RC");
    eq(a1ToR1C1("=SUM(B2:C4)", base), "=SUM(R[-3]C[-1]:R[-1]C)", "Range relative");
    eq(a1ToR1C1('="A1" & A1', base), '="A1" & R[-4]C[-2]', "Preserve string literals");
  });

  test("R1C1: r1c1ToA1 chuyển đổi R1C1 sang A1", () => {
    const base = { c: "C", r: 5 }; // C5
    eq(r1c1ToA1("=R[-4]C[-2]", base), "=A1", "Relative A1");
    eq(r1c1ToA1("=R1C1", base), "=$A$1", "Absolute A1");
    eq(r1c1ToA1("=R[-4]C1", base), "=$A1", "Mixed col abs");
    eq(r1c1ToA1("=R1C[-2]", base), "=A$1", "Mixed row abs");
    eq(r1c1ToA1("=RC", base), "=C5", "Same cell");
    eq(r1c1ToA1("=SUM(R[-3]C[-1]:R[-1]C)", base), "=SUM(B2:C4)", "Range to A1");
    eq(r1c1ToA1("=R[-10]C", base), "=#REF!", "Out of bounds top");
    eq(r1c1ToA1("=RC[-10]", base), "=#REF!", "Out of bounds left");
  });

  test("R1C1: isR1C1Formula nhận diện đúng công thức R1C1", () => {
    eq(isR1C1Formula("=R[-1]C+R[-2]C"), true, "Relative formula");
    eq(isR1C1Formula("=R1C1+R2C2"), true, "Absolute formula");
    eq(isR1C1Formula("=A1+B1"), false, "Standard A1 formula");
    eq(isR1C1Formula("=SUM(A1:B10)"), false, "Standard A1 range");
    eq(isR1C1Formula("=SUM(R1C1:R5C5)"), true, "R1C1 range");
  });

  test("R1C1: formatAddressAsR1C1 và parseR1C1Address", () => {
    eq(formatAddressAsR1C1("B2"), "R2C2", "Single cell");
    eq(formatAddressAsR1C1("A1:C10"), "R1C1:R10C3", "Range");
    eq(formatAddressAsR1C1("1:5"), "R1:R5", "Whole rows");
    eq(formatAddressAsR1C1("A:B"), "C1:C2", "Whole cols");

    const p1 = parseR1C1Address("R5C3");
    eq(p1.c, "C", "Parsed col");
    eq(p1.r, 5, "Parsed row");

    const pRange = parseR1C1Address("R2C2:R4C6");
    eq(pRange.start.c, "B", "Range start col");
    eq(pRange.start.r, 2, "Range start row");
    eq(pRange.end.c, "F", "Range end col");
    eq(pRange.end.r, 4, "Range end row");
  });

  // 2. 1904 Date System & Format Code
  test("1904 Date System: serialToParts và formatByCode lệch đúng 1462 ngày", () => {
    // 40000 in 1900 date system = 2009-07-06
    // 40000 in 1904 date system = 2013-07-07 (+1462 days)
    const p1900 = serialToParts(40000, false);
    const p1904 = serialToParts(40000, true);
    eq(p1900.year, 2009, "1900 year");
    eq(p1900.month, 7, "1900 month");
    eq(p1900.day, 6, "1900 day");

    eq(p1904.year, 2013, "1904 year");
    eq(p1904.month, 7, "1904 month");
    eq(p1904.day, 7, "1904 day");

    const fmt1900 = formatByCode(40000, "yyyy-mm-dd", { date1904: false });
    const fmt1904 = formatByCode(40000, "yyyy-mm-dd", { date1904: true });
    eq(fmt1900, "2009-07-06", "1900 formatted date");
    eq(fmt1904, "2013-07-07", "1904 formatted date");
  });

  // 3. Precision as Displayed
  test("Precision As Displayed: roundToFormatPrecision làm tròn theo số chữ số thập phân hiển thị", () => {
    eq(NumberFormatter.getFormatDecimals("0.00"), 2, "Decimals 0.00");
    eq(NumberFormatter.getFormatDecimals("#,##0.000"), 3, "Decimals 0.000");
    eq(NumberFormatter.getFormatDecimals("0"), 0, "Decimals integer");
    eq(NumberFormatter.getFormatDecimals("General"), null, "General decimals null");

    eq(NumberFormatter.roundToFormatPrecision(1.2345, "0.00"), 1.23, "Round to 2 decimals");
    eq(NumberFormatter.roundToFormatPrecision(1.2365, "0.00"), 1.24, "Round up 2 decimals");
    eq(NumberFormatter.roundToFormatPrecision(1.2345, "0.000"), 1.235, "Round to 3 decimals");
    eq(NumberFormatter.roundToFormatPrecision(1.9, "0"), 2, "Round to 0 decimals");
    eq(NumberFormatter.roundToFormatPrecision(1.2345, "General"), 1.2345, "General keeps precision");
  });

  // 4. SheetGrid Calculation Engine
  test("Grid: Chế độ tính toán Thủ công không tự động tính lại cho đến khi recalculateAll", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCalculationMode("manual");
    grid.setCellValue("A", 1, 10);
    grid.setCellValue("B", 1, "=A1*2");
    eq(grid.cellsData.get("B1").val, 20, "Initial value evaluated");

    // Change A1 without recalculating B1
    grid.setCellValue("A", 1, 50);
    eq(grid.cellsData.get("B1").val, 20, "Manual mode holds old value");

    // Calculate now
    grid.recalculateAll();
    eq(grid.cellsData.get("B1").val, 100, "Calculate now recalculates B1 to 100");
  });

  test("Grid: Tính lặp giải đúng công thức hội tụ và công thức lặp theo maxIterations", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setIterativeCalculation(true, 50, 0.001);
    eq(grid.iteration, true, "Iteration enabled");
    eq(grid.maxIterations, 50, "Max iterations 50");
    eq(grid.maxChange, 0.001, "Max change 0.001");

    // Circular convergence: A1 = 0.5*A1 + 1 -> 2
    grid.setCellValue("A", 1, "=0.5*A1+1");
    const valA1 = grid.cellsData.get("A1").val;
    if (Math.abs(valA1 - 2) > 0.002) {
      throw new Error(`Công thức hội tụ không tiệm cận 2: nhận ${valA1}`);
    }

    // Circular counter: B1 = B1 + 1 up to 50
    grid.setIterativeCalculation(true, 50, 0.00001);
    grid.setCellValue("B", 1, "=B1+1");
    eq(grid.cellsData.get("B1").val, 50, "Max iterations counter stops at 50");
  });

  test("Grid: Tắt tính lặp phát hiện tham chiếu vòng tròn, gán 0 và lưu circularReference", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setIterativeCalculation(false);
    grid.setCellValue("A", 1, "=A1+10");
    eq(grid.cellsData.get("A1").val, 0, "Circular reference returns 0 when iteration disabled");
    eq(grid.circularReference, "$A$1", "Circular reference coordinate tracked");
  });

  test("Grid: Độ chính xác như hiển thị làm tròn giá trị ô theo định dạng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setPrecisionAsDisplayed(true);
    eq(grid.precisionAsDisplayed, true, "Precision as displayed enabled");

    // Enter formatted numeric cell
    const itemA1 = { val: "", formula: "", style: { numberFormat: { code: "0.00" } } };
    grid.cellsData.set("A1", itemA1);
    grid.setCellValue("A", 1, 1.2345);
    eq(grid.cellsData.get("A1").val, 1.23, "A1 rounded to 1.23");

    const itemA2 = { val: "", formula: "", style: { numberFormat: { code: "0.00" } } };
    grid.cellsData.set("A2", itemA2);
    grid.setCellValue("A", 2, 1.2345);
    eq(grid.cellsData.get("A2").val, 1.23, "A2 rounded to 1.23");

    // Sum formula
    const itemA3 = { val: "", formula: "", style: { numberFormat: { code: "0.00" } } };
    grid.cellsData.set("A3", itemA3);
    grid.setCellValue("A", 3, "=A1+A2");
    eq(grid.cellsData.get("A3").val, 2.46, "A1+A2 = 2.46 (not 2.47)");
  });

  test("Grid: Chuyển đổi kiểu tham chiếu R1C1 và nhập công thức R1C1", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setReferenceStyle("R1C1");
    eq(grid.referenceStyle, "R1C1", "Reference style is R1C1");

    grid.setCellValue("A", 1, 10);
    grid.setCellValue("A", 2, 20);
    // Enter formula using R1C1 notation
    grid.setCellValue("A", 3, "=R[-2]C+R[-1]C");

    // Internal formula stored as A1
    eq(grid.cellsData.get("A3").formula, "=A1+A2", "Formula stored as A1");
    eq(grid.cellsData.get("A3").val, 30, "Formula evaluated to 30");

    // Formula bar displays R1C1
    eq(grid._formulaBarTextFor("A3"), "=R[-2]C+R[-1]C", "Formula bar displays R1C1");
    grid.selectCell("A", 3);
    eq(grid.getSelectionNameLabel(), "R3C1", "Selection name label in R1C1");
  });

  // 5. OOXML and FODS Round-Trip
  test("OOXML Postprocess: parse và apply calculation options giữa FODS và workbook.xml", () => {
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <workbookPr date1904="1"/>
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
  <calcPr calcMode="manual" calcOnSave="0" iterate="1" iterateCount="50" iterateDelta="0.0005" fullPrecision="0"/>
</workbook>`;

    const opts = parseCalculationOptionsFromWorkbook(workbookXml);
    eq(opts.calcMode, "manual", "Parsed calcMode");
    eq(opts.calcOnSave, false, "Parsed calcOnSave");
    eq(opts.iteration, true, "Parsed iteration");
    eq(opts.maxIterations, 50, "Parsed maxIterations");
    eq(opts.maxChange, 0.0005, "Parsed maxChange");
    eq(opts.precisionAsDisplayed, true, "Parsed precisionAsDisplayed");
    eq(opts.date1904, true, "Parsed date1904");

    const fodsIn = '<office:spreadsheet></office:spreadsheet>';
    const fodsOut = applyCalculationOptionsToFods(fodsIn, opts);
    if (!fodsOut.includes('vno:calculation-mode="manual"')) throw new Error("Missing vno:calculation-mode in FODS");
    if (!fodsOut.includes('vno:calculate-on-save="0"')) throw new Error("Missing vno:calculate-on-save in FODS");
    if (!fodsOut.includes('vno:iteration="1"')) throw new Error("Missing vno:iteration in FODS");
    if (!fodsOut.includes('vno:max-iterations="50"')) throw new Error("Missing vno:max-iterations in FODS");
    if (!fodsOut.includes('vno:max-change="0.0005"')) throw new Error("Missing vno:max-change in FODS");
    if (!fodsOut.includes('vno:precision-as-displayed="1"')) throw new Error("Missing vno:precision-as-displayed in FODS");
    if (!fodsOut.includes('vno:date1904="1"')) throw new Error("Missing vno:date1904 in FODS");

    const parsedFromFods = parseCalculationOptionsFromFods(fodsOut);
    eq(parsedFromFods.calcMode, "manual", "FODS parsed calcMode");
    eq(parsedFromFods.calcOnSave, false, "FODS parsed calcOnSave");
    eq(parsedFromFods.iteration, true, "FODS parsed iteration");
    eq(parsedFromFods.maxIterations, 50, "FODS parsed maxIterations");
    eq(parsedFromFods.maxChange, 0.0005, "FODS parsed maxChange");
    eq(parsedFromFods.precisionAsDisplayed, true, "FODS parsed precisionAsDisplayed");
    eq(parsedFromFods.date1904, true, "FODS parsed date1904");

    const cleanWbXml = '<workbook><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>';
    const reappliedWbXml = applyCalculationOptionsToWorkbook(cleanWbXml, parsedFromFods);
    if (!reappliedWbXml.includes('date1904="1"')) throw new Error("Missing date1904 in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('calcMode="manual"')) throw new Error("Missing calcMode in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('calcOnSave="0"')) throw new Error("Missing calcOnSave in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('iterate="1"')) throw new Error("Missing iterate in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('iterateCount="50"')) throw new Error("Missing iterateCount in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('iterateDelta="0.0005"')) throw new Error("Missing iterateDelta in reconstructed workbook.xml");
    if (!reappliedWbXml.includes('fullPrecision="0"')) throw new Error("Missing fullPrecision in reconstructed workbook.xml");
  });

  // 6. Help Entry & Strings
  test("Help & i18n: Bài hướng dẫn tiếng Việt đầy đủ và không chứa tên thương mại cấm", () => {
    const entry = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.calc.optionsHelp" || e.commandIds?.includes("sheet.calc.optionsDialog"));
    if (!entry) throw new Error("Thiếu Help entry cho sheet.calc.optionsDialog");
    eq(typeof entry.title, "string", "Help title");
    if (!entry.title || entry.title.trim() === "") throw new Error("Help title rỗng");
    const stepsText = (entry.steps || []).join("\n").toLowerCase();
    if (!stepsText.includes("tính toán lặp") || !stepsText.includes("độ chính xác như hiển thị") || !stepsText.includes("1904") || !stepsText.includes("r1c1")) {
      throw new Error("Help content thiếu các mục tính toán chính");
    }

    const forbidden = ["excel", "microsoft", "word", "powerpoint"];
    const fullText = (entry.title + " " + entry.summary + " " + stepsText + " " + (entry.keywords || []).join(" ")).toLowerCase();
    for (const brand of forbidden) {
      if (fullText.includes(brand)) throw new Error(`Help entry chứa tên thương mại cấm: ${brand}`);
    }

    // Check dialog i18n strings
    const viDialog = viStrings.sheetDialogs?.calcOptions;
    const enDialog = enStrings.sheetDialogs?.calcOptions;
    if (!viDialog || !enDialog) throw new Error("Thiếu sheetDialogs.calcOptions trong VI hoặc EN");
    eq(typeof viDialog.title, "string", "VI dialog title");
    eq(typeof enDialog.title, "string", "EN dialog title");
  });

  return results;
}
