import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { NumberFormatter } from "../../apps/sheet/number-formatter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

export async function runSheetLocaleInputTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label) => {
    if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  };
  const gridFor = numberLocale => {
    const grid = Object.create(SheetGridController.prototype);
    grid.options = { numberLocale };
    return grid;
  };

  test("vi-VN: 1.250 and 1.250,75 are numeric without losing precision", () => {
    const locale = { locale: "vi-VN", decimalSeparator: ",", thousandsSeparator: "." };
    const grid = gridFor(locale);
    const integer = grid._normalizeCellInput("1.250");
    const decimal = grid._normalizeCellInput("1.250,75");
    const decimalWithNoGroup = grid._normalizeCellInput("1250,5");
    const formattedCell = grid._normalizeCellInput("1.250,75", { numberFormat: { category: "number", useThousands: true, decimals: 0 } });
    const percentageCell = grid._normalizeCellInput("1.250,75%", { numberFormat: { category: "percentage", decimals: 2 } });
    eq(integer.value, 1250, "1.250 value");
    eq(decimal.value, 1250.75, "1.250,75 value");
    eq(decimalWithNoGroup.value, 1250.5, "1250,5 value");
    eq(formattedCell.value, 1250.75, "input in a preformatted number cell");
    eq(percentageCell.value, 12.5075, "input in a preformatted percentage cell");
    eq(NumberFormatter.formatValue(integer.value, integer.style.numberFormat, locale).text, "1.250", "integer display");
    eq(NumberFormatter.formatValue(decimal.value, decimal.style.numberFormat, locale).text, "1.250,75", "grouped decimal display");
    eq(NumberFormatter.formatGeneralNumber(decimalWithNoGroup.value, locale), "1250,5", "general decimal display");
    eq(NumberFormatter.formatValue(0.125, { category: "percentage", decimals: 2 }, locale).text, "12,50%", "percentage display");
  });

  test("en-US keeps the existing period decimal and comma grouping", () => {
    const locale = { locale: "en-US", decimalSeparator: ".", thousandsSeparator: "," };
    const grid = gridFor(locale);
    const parsed = grid._normalizeCellInput("1,250.75");
    eq(parsed.value, 1250.75, "en-US value");
    eq(NumberFormatter.formatValue(parsed.value, parsed.style.numberFormat, locale).text, "1,250.75", "en-US display");
  });

  test("Sheet formulas accept the regional semicolon argument separator", () => {
    const engine = new FormulaEngine(() => new Map());
    eq(engine.evaluate("=SUM(1;2)+3"), 6, "formula result");
  });
  return results;
}
