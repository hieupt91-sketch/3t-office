/**
 * Test Suite: hàm bổ sung đối chiếu Excel 2016 (EXCEL-E1c/G4).
 * Giá trị mong đợi lấy từ Excel 2016 thật qua scripts/audit-0610/function_oracle.mjs (tests/functions/golden-*.json).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { EN_LOCALE } from "../../apps/sheet/excel-format-code.js";

const dir = path.resolve("tests/functions");

export async function runFunctionGoldenTests() {
  const results = [];
  let tol = 1e-9;
  const near = (a, b) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
  for (const file of readdirSync(dir).filter(name => name.startsWith("golden-") && name.endsWith(".json")).sort()) {
    const golden = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    if (!Array.isArray(golden?.cases)) continue;
    const toMap = obj => { const map = new Map(); for (const [key, value] of Object.entries(obj || {})) map.set(key, { val: value, formula: "", style: {} }); return map; };
    const cells = toMap(golden.cells);
    const sheetMaps = { Sheet1: cells, ...Object.fromEntries(Object.entries(golden.sheets || {}).map(([name, obj]) => [name, toMap(obj)])) };
    const engine = new FormulaEngine(() => cells, null, name => sheetMaps[String(name).trim()] || null, () => "Sheet1", () => Object.keys(sheetMaps));
    engine.textLocale = EN_LOCALE;
    const failures = [];
    for (const item of golden.cases) {
      let mine;
      tol = item.tol ?? 1e-9;
      const arrayFormula = item.array === true || item.type === "array" || /^\s*=\s*(?:MMULT|MINVERSE|MUNIT|TRANSPOSE|FREQUENCY|LINEST|TREND|GROWTH|LOGEST)\s*\(/i.test(item.formula);
      try { mine = arrayFormula ? engine.evaluateArray(item.formula) : engine.evaluate(item.formula); } catch (error) { mine = `#THROW ${error.message}`; }
      if (mine instanceof String) mine = String(mine);
      let pass = false;
      if (item.type === "number") pass = typeof mine === "number" && near(mine, item.excel);
      else if (item.type === "string") pass = String(mine) === item.excel;
      else if (item.type === "boolean") pass = mine === item.excel;
      else if (item.type === "error") pass = String(mine).split(" ")[0] === item.excel;
      else if (item.type === "array") pass = Array.isArray(mine) && mine.length === item.excel.length && item.excel.every((v, i) => (typeof v === "number" ? near(Number(mine[i]), v) : String(mine[i]) === String(v)));
      if (!pass) failures.push(`${item.formula}: Excel=${JSON.stringify(item.excel)} VN=${JSON.stringify(mine)}`);
    }
    results.push({
      name: `Hàm đối chiếu Excel 2016 (${file}): ${golden.cases.length - failures.length}/${golden.cases.length} khớp`,
      pass: failures.length === 0,
      error: failures.slice(0, 5).join(" | ")
    });
  }
  if (!results.length) results.push({ name: "Hàm đối chiếu Excel 2016: có ít nhất một bộ giá trị vàng", pass: false, error: "thiếu tests/functions/golden-*.json" });
  return results;
}
