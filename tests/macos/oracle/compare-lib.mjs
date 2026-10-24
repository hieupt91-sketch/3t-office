// ORACLE-1: pure comparison helpers + 3T evaluation, shared by compare_functions.mjs and its unit test.
// 3T evaluation is the SAME mechanism as tests/unit/function-golden.test.js (FormulaEngine over a
// Map of cells, EN_LOCALE, evaluateArray for array formulas). No new engine.
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_TOL = 1e-9;
export const ARRAY_FORMULA_RE = /^\s*=\s*(?:MMULT|MINVERSE|MUNIT|TRANSPOSE|FREQUENCY|LINEST|TREND|GROWTH|LOGEST)\s*\(/i;

/** Relative tolerance with an absolute floor of `tol` (same as function-golden.test.js). */
export function near(a, b, tol = DEFAULT_TOL) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Does the 3T value `mine` match a golden {type, value}? Rules copied from function-golden.test.js. */
export function matchesGolden(type, expected, mine, tol = DEFAULT_TOL) {
  if (mine instanceof String) mine = String(mine);
  if (type === "number") return typeof mine === "number" && near(mine, expected, tol);
  if (type === "string") return String(mine) === expected;
  if (type === "boolean") return mine === expected;
  if (type === "error") return String(mine).split(" ")[0] === expected;
  if (type === "array") {
    return Array.isArray(mine) && mine.length === expected.length &&
      expected.every((v, i) => (typeof v === "number" ? near(Number(mine[i]), v, tol) : String(mine[i]) === String(v)));
  }
  return false;
}

/** Two oracle answers (e.g. Excel Mac vs Excel Win) agree: same type and same value within tol. */
export function goldensAgree(a, b, tol = DEFAULT_TOL) {
  if (!a || !b || a.type !== b.type) return false;
  return matchesGolden(a.type, a.value, b.value, tol);
}

export const MEASURABLE = new Set(["number", "string", "boolean", "error", "array"]);

/**
 * Classify one case. win/mac are {type, value} or null (not measured). mine is the 3T value.
 * Returns flags + a short Vietnamese note for 3T≠Mac rows.
 */
export function classifyCase({ win, mac, mine, tol = DEFAULT_TOL }) {
  const macMeasured = !!mac && MEASURABLE.has(mac.type);
  const winMeasured = !!win && MEASURABLE.has(win.type);
  const tEqWin = winMeasured ? matchesGolden(win.type, win.value, mine, tol) : null;
  const tEqMac = macMeasured ? matchesGolden(mac.type, mac.value, mine, tol) : null;
  const macEqWin = macMeasured && winMeasured ? goldensAgree(mac, win, tol) : null;
  let note = "";
  if (tEqMac === false) {
    const mineText = String(mine);
    if (macEqWin === false && tEqWin === true) note = "khác biệt Mac-Win (3T theo Excel Win)";
    else if (/^#NAME\?/.test(mineText) || /^#THROW/.test(mineText)) note = "chưa hỗ trợ";
    else note = "lỗi 3T thật";
  }
  let unmeasuredReason = "";
  if (!macMeasured) unmeasuredReason = !mac ? "không có golden-mac" : `Excel Mac trả ${mac.type}: ${String(mac.value).slice(0, 80)}`;
  return { tEqWin, tEqMac, macEqWin, macMeasured, note, unmeasuredReason };
}

export function toCellMap(obj) {
  const map = new Map();
  for (const [key, value] of Object.entries(obj || {})) map.set(key, { val: value, formula: "", style: {} });
  return map;
}

/** Evaluate every formula of a cases/golden spec with the 3T formula engine. */
export async function evaluate3T(spec, formulas, repoRoot) {
  const { FormulaEngine } = await import(pathToFileURL(path.join(repoRoot, "apps/sheet/formula-engine.js")).href);
  const { EN_LOCALE } = await import(pathToFileURL(path.join(repoRoot, "apps/sheet/excel-format-code.js")).href);
  const cells = toCellMap(spec.cells);
  const sheetMaps = { Sheet1: cells, ...Object.fromEntries(Object.entries(spec.sheets || {}).map(([n, o]) => [n, toCellMap(o)])) };
  const engine = new FormulaEngine(() => cells, null, name => sheetMaps[String(name).trim()] || null, () => "Sheet1", () => Object.keys(sheetMaps));
  engine.textLocale = EN_LOCALE;
  return formulas.map(({ formula, array, type }) => {
    const arrayFormula = array === true || type === "array" || ARRAY_FORMULA_RE.test(formula);
    let mine;
    try { mine = arrayFormula ? engine.evaluateArray(formula) : engine.evaluate(formula); } catch (error) { mine = `#THROW ${error.message}`; }
    if (mine instanceof String) mine = String(mine);
    return mine;
  });
}

/** Summarise classified rows of one batch. */
export function summarise(rows) {
  const s = { cases: rows.length, tEqMac: 0, tNeMac: 0, macNeWin: 0, unmeasured: 0, tEqWin: 0, tNeWin: 0, reasons: {} };
  for (const r of rows) {
    if (r.tEqMac === true) s.tEqMac++;
    if (r.tEqMac === false) s.tNeMac++;
    if (r.macEqWin === false) s.macNeWin++;
    if (!r.macMeasured) { s.unmeasured++; const k = r.unmeasuredReason.split(":")[0]; s.reasons[k] = (s.reasons[k] || 0) + 1; }
    if (r.tEqWin === true) s.tEqWin++;
    if (r.tEqWin === false) s.tNeWin++;
  }
  return s;
}
