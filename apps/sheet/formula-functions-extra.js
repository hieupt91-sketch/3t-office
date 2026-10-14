/**
 * Hàm bổ sung cho FormulaEngine (EXCEL-E1c/G4): mỗi hàm nhận (engine, args, tên) với args là chuỗi thô chưa tính.
 * Mọi hàm ở đây được đối chiếu với Excel 2016 thật bằng scripts/audit-0610/function_oracle.mjs
 * (bộ ca trong tests/functions/*.json); không thêm hàm nào mà chưa có ca đối chiếu.
 */

import { isErr, scalar, num, nums, finite, unary } from "./formula-function-helpers.js";
import { STAT_FUNCTIONS } from "./formula-functions-stats.js";
import { MISC_FUNCTIONS } from "./formula-functions-misc.js";
import { FINANCIAL_FUNCTIONS } from "./formula-functions-financial.js";
import { ENGINEERING_FUNCTIONS } from "./formula-functions-engineering.js";
import { SECURITIES_FUNCTIONS } from "./formula-functions-securities.js";

/** Giá trị số của một vùng (bỏ ô trống/chuỗi, giữ lỗi để báo). */
function rangeNumbers(engine, arg) {
  const values = engine.collectValues([arg]);
  const error = values.find(isErr);
  if (error) return { error };
  return { values: engine.collectNumericValues([arg]) };
}

const gcd2 = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };

function roman(n) {
  const table = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [value, symbol] of table) while (n >= value) { out += symbol; n -= value; }
  return out;
}

function ceilingMath(x, significance, mode) {
  if (significance === 0) return 0;
  const sig = Math.abs(significance);
  if (x >= 0) return Math.ceil(x / sig - 1e-12) * sig;
  return mode ? -Math.ceil(Math.abs(x) / sig - 1e-12) * sig : -Math.floor(Math.abs(x) / sig + 1e-12) * sig;
}

function floorMath(x, significance, mode) {
  if (significance === 0) return 0;
  const sig = Math.abs(significance);
  if (x >= 0) return Math.floor(x / sig + 1e-12) * sig;
  return mode ? -Math.floor(Math.abs(x) / sig + 1e-12) * sig : -Math.ceil(Math.abs(x) / sig - 1e-12) * sig;
}

const round15 = value => Number(Number(value).toPrecision(15));

const BASE_FUNCTIONS = {
  // ---- Lượng giác / hyperbolic
  ACOS: unary(x => (x < -1 || x > 1 ? "#NUM!" : Math.acos(x))),
  ASIN: unary(x => (x < -1 || x > 1 ? "#NUM!" : Math.asin(x))),
  ATAN: unary(Math.atan),
  ACOSH: unary(x => (x < 1 ? "#NUM!" : Math.acosh(x))),
  ASINH: unary(Math.asinh),
  ATANH: unary(x => (x <= -1 || x >= 1 ? "#NUM!" : Math.atanh(x))),
  ACOT: unary(x => (Math.PI / 2 - Math.atan(x))),
  ACOTH: unary(x => (Math.abs(x) <= 1 ? "#NUM!" : 0.5 * Math.log((x + 1) / (x - 1)))),
  COSH: unary(Math.cosh),
  SINH: unary(Math.sinh),
  TANH: unary(Math.tanh),
  COT: unary(x => (x === 0 ? "#DIV/0!" : 1 / Math.tan(x))),
  COTH: unary(x => (x === 0 ? "#DIV/0!" : 1 / Math.tanh(x))),
  CSC: unary(x => (x === 0 ? "#DIV/0!" : 1 / Math.sin(x))),
  CSCH: unary(x => (x === 0 ? "#DIV/0!" : 1 / Math.sinh(x))),
  SEC: unary(x => 1 / Math.cos(x)),
  SECH: unary(x => 1 / Math.cosh(x)),
  ATAN2(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const y = num(engine, args[1]); if (isErr(y)) return y;
    if (x === 0 && y === 0) return "#DIV/0!";
    return Math.atan2(y, x);
  },

  // ---- La Mã / cơ số
  ROMAN(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    const value = Math.trunc(n);
    if (value < 0 || value > 3999) return "#VALUE!";
    return value === 0 ? "" : roman(value);
  },
  ARABIC(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    let source = String(text ?? "").trim().toUpperCase();
    if (source === "") return 0;
    let sign = 1;
    if (source.startsWith("-")) { sign = -1; source = source.slice(1); }
    if (!/^[MDCLXVI]+$/.test(source)) return "#VALUE!";
    const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let i = 0; i < source.length; i++) {
      const value = map[source[i]];
      const next = map[source[i + 1]] || 0;
      total += value < next ? -value : value;
    }
    return sign * total;
  },
  BASE(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    const radix = num(engine, args[1]); if (isErr(radix)) return radix;
    const minLength = args[2] === undefined ? 0 : num(engine, args[2]); if (isErr(minLength)) return minLength;
    if (n < 0 || n >= 2 ** 53 || Math.trunc(radix) < 2 || Math.trunc(radix) > 36 || minLength < 0 || minLength > 255) return "#NUM!";
    return Math.trunc(n).toString(Math.trunc(radix)).toUpperCase().padStart(Math.trunc(minLength), "0");
  },
  DECIMAL(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    const radix = num(engine, args[1]); if (isErr(radix)) return radix;
    const base = Math.trunc(radix);
    if (base < 2 || base > 36) return "#NUM!";
    const source = String(text ?? "").trim().toUpperCase();
    if (!source) return 0;
    let total = 0;
    for (const ch of source) {
      const digit = parseInt(ch, 36);
      if (Number.isNaN(digit) || digit >= base) return "#NUM!";
      total = total * base + digit;
    }
    return total;
  },

  // ---- Số học
  FACTDOUBLE(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    const k = Math.trunc(n);
    if (k < -1) return "#NUM!";
    let result = 1;
    for (let i = k; i > 1; i -= 2) result *= i;
    return result;
  },
  GCD(engine, args) {
    if (!args.length) return "#VALUE!";
    const { values, error } = (() => { const collected = engine.collectValues(args); const e = collected.find(isErr); if (e) return { error: e }; return { values: collected.map(v => engine._parseNumberOrCurrency?.(v) ?? Number(v)) }; })();
    if (error) return error;
    if (values.some(v => !Number.isFinite(v) || v < 0 || v >= 2 ** 53)) return values.some(v => !Number.isFinite(v)) ? "#VALUE!" : "#NUM!";
    return values.map(Math.trunc).reduce((a, b) => gcd2(a, b), 0);
  },
  LCM(engine, args) {
    if (!args.length) return "#VALUE!";
    const collected = engine.collectValues(args);
    const e = collected.find(isErr); if (e) return e;
    const values = collected.map(v => engine._parseNumberOrCurrency?.(v) ?? Number(v));
    if (values.some(v => !Number.isFinite(v))) return "#VALUE!";
    if (values.some(v => v < 0 || v >= 2 ** 53)) return "#NUM!";
    let result = 1;
    for (const raw of values) {
      const v = Math.trunc(raw);
      if (v === 0) return 0;
      result = result / gcd2(result, v) * v;
    }
    return result;
  },
  QUOTIENT(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = num(engine, args[0]); if (isErr(a)) return a;
    const b = num(engine, args[1]); if (isErr(b)) return b;
    return b === 0 ? "#DIV/0!" : Math.trunc(a / b);
  },
  MULTINOMIAL(engine, args) {
    const { values, error } = nums(engine, args);
    if (error) return error;
    if (!values.length) return "#VALUE!";
    if (values.some(v => v < 0)) return "#NUM!";
    const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    const ints = values.map(Math.trunc);
    return Math.round(fact(ints.reduce((a, b) => a + b, 0)) / ints.reduce((p, v) => p * fact(v), 1));
  },
  COMBINA(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    const k = num(engine, args[1]); if (isErr(k)) return k;
    const N = Math.trunc(n); const K = Math.trunc(k);
    if (N < 0 || K < 0 || (N === 0 && K > 0)) return "#NUM!";
    if (N === 0 && K === 0) return 1;
    const total = N + K - 1; const choose = K;
    let result = 1;
    for (let i = 1; i <= choose; i++) result = result * (total - choose + i) / i;
    return Math.round(result);
  },
  SQRTPI: unary(x => (x < 0 ? "#NUM!" : Math.sqrt(x * Math.PI))),

  // ---- Làm tròn đến bội số
  "CEILING.MATH"(engine, args) {
    if (args.length < 1 || args.length > 3) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const sig = args[1] === undefined ? (x < 0 ? -1 : 1) : num(engine, args[1]); if (isErr(sig)) return sig;
    const mode = args[2] === undefined ? 0 : num(engine, args[2]); if (isErr(mode)) return mode;
    return round15(ceilingMath(x, sig, mode));
  },
  "CEILING.PRECISE"(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const sig = args[1] === undefined ? 1 : num(engine, args[1]); if (isErr(sig)) return sig;
    if (sig === 0) return 0;
    return round15(Math.ceil(x / Math.abs(sig) - 1e-12) * Math.abs(sig));
  },
  "ISO.CEILING"(engine, args) { return EXTRA_FUNCTIONS["CEILING.PRECISE"](engine, args); },
  "FLOOR.MATH"(engine, args) {
    if (args.length < 1 || args.length > 3) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const sig = args[1] === undefined ? (x < 0 ? -1 : 1) : num(engine, args[1]); if (isErr(sig)) return sig;
    const mode = args[2] === undefined ? 0 : num(engine, args[2]); if (isErr(mode)) return mode;
    return round15(floorMath(x, sig, mode));
  },
  "FLOOR.PRECISE"(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const sig = args[1] === undefined ? 1 : num(engine, args[1]); if (isErr(sig)) return sig;
    if (sig === 0) return 0;
    return round15(Math.floor(x / Math.abs(sig) + 1e-12) * Math.abs(sig));
  },

  // ---- Tổng bình phương và chuỗi lũy thừa
  SUMSQ(engine, args) {
    if (!args.length) return "#VALUE!";
    const collected = engine.collectValues(args);
    const e = collected.find(isErr); if (e) return e;
    return engine.collectNumericValues(args).reduce((sum, v) => sum + v * v, 0);
  },
  SUMX2MY2(engine, args) { return pairSum(engine, args, (x, y) => x * x - y * y); },
  SUMX2PY2(engine, args) { return pairSum(engine, args, (x, y) => x * x + y * y); },
  SUMXMY2(engine, args) { return pairSum(engine, args, (x, y) => (x - y) * (x - y)); },
  SERIESSUM(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const n = num(engine, args[1]); if (isErr(n)) return n;
    const m = num(engine, args[2]); if (isErr(m)) return m;
    const coefficients = engine.collectValues([args[3]]);
    const e = coefficients.find(isErr); if (e) return e;
    const parsed = coefficients.map(v => (typeof v === "number" ? v : engine._parseNumberOrCurrency?.(v)));
    if (parsed.some(v => v === null || v === undefined || !Number.isFinite(v))) return "#VALUE!";
    return parsed.reduce((sum, c, i) => sum + c * Math.pow(x, n + i * m), 0);
  },

  // ---- Định thức
  MDETERM(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const matrix = engine._rangeMatrix(args[0]);
    const size = matrix.length;
    if (!size || matrix.some(row => row.length !== size)) return "#VALUE!";
    const a = matrix.map(row => row.map(v => (typeof v === "number" ? v : engine._parseNumberOrCurrency?.(v))));
    if (a.some(row => row.some(v => v === null || v === undefined || !Number.isFinite(v)))) return "#VALUE!";
    let det = 1;
    for (let col = 0; col < size; col++) {
      let pivot = col;
      for (let r = col + 1; r < size; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
      if (a[pivot][col] === 0) return 0;
      if (pivot !== col) { [a[pivot], a[col]] = [a[col], a[pivot]]; det = -det; }
      det *= a[col][col];
      for (let r = col + 1; r < size; r++) {
        const factor = a[r][col] / a[col][col];
        for (let c = col; c < size; c++) a[r][c] -= factor * a[col][c];
      }
    }
    return round15(det);
  },

  // ---- SUBTOTAL / AGGREGATE
  SUBTOTAL(engine, args) {
    if (args.length < 2) return "#VALUE!";
    const code = num(engine, args[0]); if (isErr(code)) return code;
    const fn = Math.trunc(code);
    if (!((fn >= 1 && fn <= 11) || (fn >= 101 && fn <= 111))) return "#VALUE!";
    const ignoreHidden = fn > 100;
    const base = fn % 100;
    const collected = [];
    for (const arg of args.slice(1)) {
      const part = collectCellValues(engine, arg, { ignoreHidden, ignoreNestedAggregates: true });
      if (part.error) return part.error;
      collected.push(...part.cells);
    }
    return aggregateBasic(engine, base, collected, null);
  },
  AGGREGATE(engine, args) {
    if (args.length < 3) return "#VALUE!";
    const fnRaw = num(engine, args[0]); if (isErr(fnRaw)) return fnRaw;
    const optRaw = num(engine, args[1]); if (isErr(optRaw)) return optRaw;
    const fn = Math.trunc(fnRaw); const option = Math.trunc(optRaw);
    if (fn < 1 || fn > 19 || option < 0 || option > 7) return "#VALUE!";
    const ignoreErrors = [2, 3, 6, 7].includes(option);
    const ignoreHidden = [1, 3, 5, 7].includes(option);
    const ignoreNested = true;
    const needsK = fn >= 14;
    if (needsK && args.length < 4) return "#VALUE!";
    const refs = needsK ? [args[2]] : args.slice(2);
    const collected = [];
    for (const arg of refs) {
      const part = collectCellValues(engine, arg, { ignoreHidden, ignoreNestedAggregates: ignoreNested, keepErrors: true });
      if (part.error) return part.error;
      collected.push(...part.cells);
    }
    const usable = ignoreErrors ? collected.filter(cell => !isErr(cell.value)) : collected;
    let k = null;
    if (needsK) { k = num(engine, args[3]); if (isErr(k)) return k; }
    return aggregateBasic(engine, fn, usable, k, { aggregate: true });
  },
  MUNIT(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    if (n < 1) return "#VALUE!";
    return 1;
  }
};

export const EXTRA_FUNCTIONS = { ...BASE_FUNCTIONS, ...STAT_FUNCTIONS, ...MISC_FUNCTIONS, ...FINANCIAL_FUNCTIONS, ...ENGINEERING_FUNCTIONS, ...SECURITIES_FUNCTIONS };

function pairSum(engine, args, fn) {
  if (args.length !== 2) return "#VALUE!";
  const left = engine._rangeMatrix(args[0]).flat();
  const right = engine._rangeMatrix(args[1]).flat();
  if (left.length !== right.length) return "#N/A";
  const e = [...left, ...right].find(isErr); if (e) return e;
  let total = 0;
  for (let i = 0; i < left.length; i++) {
    const x = typeof left[i] === "number" ? left[i] : engine._parseNumberOrCurrency?.(left[i]);
    const y = typeof right[i] === "number" ? right[i] : engine._parseNumberOrCurrency?.(right[i]);
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    total += fn(x, y);
  }
  return total;
}

/**
 * Lấy từng ô của một tham chiếu kèm tọa độ (để bỏ hàng ẩn và các ô SUBTOTAL/AGGREGATE lồng nhau).
 * engine.rowVisibilityResolver(sheet, row) -> { hidden, filtered } là tùy chọn do lưới cung cấp.
 */
function collectCellValues(engine, arg, options) {
  const reference = engine._parseReference(String(arg).trim());
  if (reference.error || reference.sheets) return { error: "#REF!" };
  if (!/^[$]?[A-Z]+[$]?\d+(?::[$]?[A-Z]+[$]?\d+)?$/i.test(String(reference.ref || "")) && !/^[A-Z]+:[A-Z]+$/i.test(String(reference.ref || ""))) {
    // Không phải tham chiếu ô (giá trị trực tiếp hoặc biểu thức): coi như một giá trị.
    const value = scalar(engine, arg);
    return { cells: [{ value, coord: null }] };
  }
  const coords = engine.expandRange(reference.ref);
  const map = reference.sheet && typeof engine.sheetResolver === "function" ? engine.sheetResolver(reference.sheet) : engine.cellsMap;
  const sheetName = reference.sheet || (typeof engine.currentSheetResolver === "function" ? engine.currentSheetResolver() : "");
  const cells = [];
  for (const coord of coords) {
    const item = map?.get?.(coord);
    const row = Number(String(coord).match(/(\d+)$/)?.[1]);
    if (options.ignoreNestedAggregates && /^=\s*(?:SUBTOTAL|AGGREGATE)\s*\(/i.test(String(item?.formula || ""))) continue;
    if (typeof engine.rowVisibilityResolver === "function") {
      const state = engine.rowVisibilityResolver(sheetName, row) || {};
      if (state.filtered) continue;
      if (options.ignoreHidden && state.hidden) continue;
    }
    const raw = engine._getRangeCellValue(coord, reference.sheet);
    cells.push({ value: raw instanceof String ? String(raw) : raw, coord, isTextCell: Boolean(raw && raw.isTextCell) });
  }
  return { cells };
}

function toNumberValue(engine, cell) {
  const value = cell.value;
  if (typeof value === "number") return value;
  if (cell.isTextCell || typeof value === "boolean" || value === "" || value === null || value === undefined) return null;
  const parsed = engine?._parseNumberOrCurrency?.(value);
  return parsed !== null && parsed !== undefined && Number.isFinite(parsed) ? parsed : null;
}

const percentileInc = (sorted, k) => {
  const rank = k * (sorted.length - 1);
  const lower = Math.floor(rank); const upper = Math.ceil(rank);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};
const percentileExc = (sorted, k) => {
  const n = sorted.length;
  const rank = k * (n + 1);
  if (rank < 1 || rank > n) return "#NUM!";
  const lower = Math.floor(rank); const upper = Math.ceil(rank);
  return sorted[lower - 1] + (sorted[upper - 1] - sorted[lower - 1]) * (rank - lower);
};

function aggregateBasic(engine, fn, cells, k, { aggregate = false } = {}) {
  const errors = cells.map(cell => cell.value).filter(isErr);
  if (errors.length && fn !== 3 && fn !== 2) return errors[0];
  const numbers = cells.map(cell => toNumberValue(engine, cell)).filter(v => v !== null);
  const mean = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  const sumSq = numbers.reduce((s, v) => s + (v - mean) ** 2, 0);
  switch (fn) {
    case 1: return numbers.length ? mean : "#DIV/0!";
    case 2: return numbers.length;
    case 3: return cells.filter(cell => cell.value !== "" && cell.value !== null && cell.value !== undefined).length;
    case 4: return numbers.length ? Math.max(...numbers) : 0;
    case 5: return numbers.length ? Math.min(...numbers) : 0;
    case 6: return numbers.length ? numbers.reduce((p, v) => p * v, 1) : 0;
    case 7: return numbers.length > 1 ? Math.sqrt(sumSq / (numbers.length - 1)) : "#DIV/0!";
    case 8: return numbers.length ? Math.sqrt(sumSq / numbers.length) : "#DIV/0!";
    case 9: return numbers.reduce((a, b) => a + b, 0);
    case 10: return numbers.length > 1 ? sumSq / (numbers.length - 1) : "#DIV/0!";
    case 11: return numbers.length ? sumSq / numbers.length : "#DIV/0!";
    default: break;
  }
  if (!aggregate) return "#VALUE!";
  const sorted = [...numbers].sort((a, b) => a - b);
  switch (fn) {
    case 12: {
      if (!sorted.length) return "#NUM!";
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    case 13: {
      const counts = new Map();
      for (const v of numbers) counts.set(v, (counts.get(v) || 0) + 1);
      let best = null; let bestCount = 1;
      for (const v of numbers) if (counts.get(v) > bestCount) { best = v; bestCount = counts.get(v); }
      return best === null ? "#N/A" : best;
    }
    case 14: { const kk = Math.trunc(k); return kk >= 1 && kk <= sorted.length ? sorted[sorted.length - kk] : "#NUM!"; }
    case 15: { const kk = Math.trunc(k); return kk >= 1 && kk <= sorted.length ? sorted[kk - 1] : "#NUM!"; }
    case 16: return sorted.length && k >= 0 && k <= 1 ? percentileInc(sorted, k) : "#NUM!";
    case 17: { const q = Math.trunc(k); return sorted.length && q >= 0 && q <= 4 ? percentileInc(sorted, q / 4) : "#NUM!"; }
    case 18: return sorted.length && k > 0 && k < 1 ? percentileExc(sorted, k) : "#NUM!";
    case 19: { const q = Math.trunc(k); return sorted.length && q >= 1 && q <= 3 ? percentileExc(sorted, q / 4) : "#NUM!"; }
    default: return "#VALUE!";
  }
}
