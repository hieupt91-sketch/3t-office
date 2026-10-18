/**
 * Hàm thống kê bổ sung của VN Sheet (EXCEL-E1c). Mỗi hàm được đối chiếu với Excel 2016 bằng
 * scripts/audit-0610/function_oracle.mjs; bộ giá trị vàng: tests/functions/golden-batch2-stats.json.
 */
import { isErr, scalar, num, numericArgs, pairedRanges, sum, mean } from "./formula-function-helpers.js";
import * as D from "./stat-distributions.js";

/** Lấy đúng `count` đối số số đầu tiên; trả { error } nếu thiếu/sai. */
function take(engine, args, min, max = min) {
  if (args.length < min || args.length > max) return { error: "#VALUE!" };
  const values = [];
  for (const arg of args) {
    const value = num(engine, arg);
    if (isErr(value)) return { error: value };
    values.push(value);
  }
  return { values };
}
const cumFlag = (engine, arg) => {
  const v = scalar(engine, arg);
  if (isErr(v)) return v;
  if (typeof v === "boolean") return v;
  const n = num(engine, arg);
  return isErr(n) ? n : n !== 0;
};
const trunc = Math.trunc;
const clean = value => (Number.isFinite(value) ? Number(value.toPrecision(15)) : "#NUM!");

/** Giá trị "kiểu A": văn bản trong vùng = 0, TRUE = 1, FALSE = 0, ô trống bỏ qua (AVERAGEA, STDEVA…). */
function aValues(engine, args) {
  const out = [];
  for (const arg of args) {
    const isRef = /^[$]?[A-Z]+[$]?\d+(?::[$]?[A-Z]+[$]?\d+)?$/i.test(String(arg).trim()) || /!/.test(arg) || /^[A-Z]+:[A-Z]+$/i.test(arg);
    if (isRef) {
      for (const v of engine.collectValues([arg])) {
        if (isErr(v)) return { error: v };
        if (v === "" || v === null || v === undefined) continue;
        if (typeof v === "number") out.push(v);
        else if (typeof v === "boolean") out.push(v ? 1 : 0);
        else if (v && v.isTextCell) out.push(0);
        else {
          const parsed = engine._parseNumberOrCurrency?.(v);
          out.push(typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0);
        }
      }
    } else {
      const v = num(engine, arg);
      if (isErr(v)) return { error: v };
      out.push(v);
    }
  }
  return { values: out };
}

const variance = (values, population) => {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - (population ? 0 : 1));
};

function percentileInc(sorted, k) {
  const rank = k * (sorted.length - 1);
  const lower = Math.floor(rank); const upper = Math.ceil(rank);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
}
function percentileExc(sorted, k) {
  const rank = k * (sorted.length + 1);
  if (rank < 1 || rank > sorted.length) return "#NUM!";
  const lower = Math.floor(rank); const upper = Math.ceil(rank);
  return sorted[lower - 1] + (sorted[upper - 1] - sorted[lower - 1]) * (rank - lower);
}

function sortedNumbers(engine, arg) {
  const r = numericArgs(engine, [arg]);
  if (r.error) return r;
  return { values: [...r.values].sort((a, b) => a - b) };
}

function percentRank(engine, args, exclusive) {
  if (args.length < 2 || args.length > 3) return "#VALUE!";
  const sorted = sortedNumbers(engine, args[0]);
  if (sorted.error) return sorted.error;
  const x = num(engine, args[1]); if (isErr(x)) return x;
  const significance = args[2] === undefined ? 3 : num(engine, args[2]); if (isErr(significance)) return significance;
  if (significance < 1) return "#NUM!";
  const values = sorted.values;
  const n = values.length;
  if (!n) return "#NUM!";
  if (x < values[0] || x > values[n - 1]) return "#N/A";
  let rank;
  const exact = values.indexOf(x);
  if (exact >= 0) {
    rank = exclusive ? (exact + 1) / (n + 1) : (n === 1 ? 1 : exact / (n - 1));
    // nhiều giá trị trùng: Excel dùng chỉ số đầu tiên
  } else {
    let lowerIndex = 0;
    while (values[lowerIndex + 1] < x) lowerIndex++;
    const lo = values[lowerIndex]; const hi = values[lowerIndex + 1];
    const fraction = (x - lo) / (hi - lo);
    rank = exclusive
      ? ((lowerIndex + 1) + fraction) / (n + 1)
      : (lowerIndex + fraction) / (n - 1);
  }
  const digits = trunc(significance);
  const factor = 10 ** digits;
  return Math.floor(rank * factor + 1e-9) / factor;
}

function pairStats(engine, args) {
  if (args.length !== 2) return { error: "#VALUE!" };
  const r = pairedRanges(engine, args[0], args[1]);
  if (r.error) return r;
  if (r.xs.length < 1) return { error: "#DIV/0!" };
  return r;
}

const covarianceOf = (xs, ys, population) => {
  const mx = mean(xs); const my = mean(ys);
  return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.length - (population ? 0 : 1));
};

function regression(xs, ys) {
  const mx = mean(xs); const my = mean(ys);
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const syy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return { mx, my, sxx, sxy, syy, slope: sxy / sxx, intercept: my - (sxy / sxx) * mx };
}

function binomInv(n, p, alpha) {
  let cumulative = 0;
  for (let k = 0; k <= n; k++) {
    cumulative += D.binomPmf(k, n, p);
    if (cumulative >= alpha - 1e-12) return k;
  }
  return n;
}

const dist = {
  // cumulative / pdf cho phân phối liên tục: (x, params..., cumulative)
  normal(x, mu, sigma, cum) { return cum ? D.normCdf((x - mu) / sigma) : D.normPdf((x - mu) / sigma) / sigma; }
};

function def(fn) { return fn; }

export const STAT_FUNCTIONS = {
  // ---- Phương sai / độ lệch chuẩn
  "STDEV.S": def((engine, args) => varianceFn(engine, args, false, true)),
  "STDEV.P": def((engine, args) => varianceFn(engine, args, true, true)),
  "VAR.S": def((engine, args) => varianceFn(engine, args, false, false)),
  "VAR.P": def((engine, args) => varianceFn(engine, args, true, false)),
  STDEVP: def((engine, args) => varianceFn(engine, args, true, true)),
  VARP: def((engine, args) => varianceFn(engine, args, true, false)),
  STDEVA: def((engine, args) => varianceA(engine, args, false, true)),
  STDEVPA: def((engine, args) => varianceA(engine, args, true, true)),
  VARA: def((engine, args) => varianceA(engine, args, false, false)),
  VARPA: def((engine, args) => varianceA(engine, args, true, false)),
  AVERAGEA(engine, args) {
    const r = aValues(engine, args); if (r.error) return r.error;
    return r.values.length ? mean(r.values) : "#DIV/0!";
  },
  MAXA(engine, args) { const r = aValues(engine, args); if (r.error) return r.error; return r.values.length ? Math.max(...r.values) : 0; },
  MINA(engine, args) { const r = aValues(engine, args); if (r.error) return r.error; return r.values.length ? Math.min(...r.values) : 0; },
  DEVSQ(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    if (!r.values.length) return "#NUM!";
    const m = mean(r.values); return clean(r.values.reduce((s, v) => s + (v - m) ** 2, 0));
  },
  AVEDEV(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    if (!r.values.length) return "#NUM!";
    const m = mean(r.values); return clean(r.values.reduce((s, v) => s + Math.abs(v - m), 0) / r.values.length);
  },
  GEOMEAN(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    if (!r.values.length || r.values.some(v => v <= 0)) return "#NUM!";
    return clean(Math.exp(mean(r.values.map(Math.log))));
  },
  HARMEAN(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    if (!r.values.length || r.values.some(v => v <= 0)) return "#NUM!";
    return clean(r.values.length / sum(r.values.map(v => 1 / v)));
  },
  TRIMMEAN(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const r = sortedNumbers(engine, args[0]); if (r.error) return r.error;
    const percent = num(engine, args[1]); if (isErr(percent)) return percent;
    if (percent < 0 || percent >= 1 || !r.values.length) return "#NUM!";
    const drop = Math.floor(r.values.length * percent / 2);
    const kept = r.values.slice(drop, r.values.length - drop);
    return kept.length ? clean(mean(kept)) : "#NUM!";
  },
  KURT(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    const n = r.values.length; if (n < 4) return "#DIV/0!";
    const m = mean(r.values); const s = Math.sqrt(variance(r.values, false));
    if (s === 0) return "#DIV/0!";
    const fourth = r.values.reduce((a, v) => a + ((v - m) / s) ** 4, 0);
    return clean(n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * fourth - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3)));
  },
  SKEW(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    const n = r.values.length; if (n < 3) return "#DIV/0!";
    const m = mean(r.values); const s = Math.sqrt(variance(r.values, false));
    if (s === 0) return "#DIV/0!";
    return clean(n / ((n - 1) * (n - 2)) * r.values.reduce((a, v) => a + ((v - m) / s) ** 3, 0));
  },
  "SKEW.P"(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    const n = r.values.length; if (n < 1) return "#DIV/0!";
    const m = mean(r.values); const s = Math.sqrt(variance(r.values, true));
    if (s === 0) return "#DIV/0!";
    return clean(r.values.reduce((a, v) => a + ((v - m) / s) ** 3, 0) / n);
  },
  STANDARDIZE(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error;
    const [x, m, s] = t.values; return s <= 0 ? "#NUM!" : (x - m) / s;
  },
  PERMUT(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error;
    const n = trunc(t.values[0]); const k = trunc(t.values[1]);
    if (n <= 0 || k < 0 || n < k) return "#NUM!";
    let r = 1; for (let i = 0; i < k; i++) r *= (n - i); return r;
  },
  PERMUTATIONA(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error;
    const n = trunc(t.values[0]); const k = trunc(t.values[1]);
    if (n < 0 || k < 0) return "#NUM!";
    return n ** k;
  },
  FISHER(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; const x = t.values[0]; return Math.abs(x) >= 1 ? "#NUM!" : clean(0.5 * Math.log((1 + x) / (1 - x))); },
  FISHERINV(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; const y = t.values[0]; return clean((Math.exp(2 * y) - 1) / (Math.exp(2 * y) + 1)); },
  GAUSS(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; return clean(D.normCdf(t.values[0]) - 0.5); },
  PHI(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; return clean(D.normPdf(t.values[0])); },

  // ---- Mode, xếp hạng, phân vị
  "MODE.SNGL"(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    const counts = new Map(); for (const v of r.values) counts.set(v, (counts.get(v) || 0) + 1);
    let best = null; let bestCount = 1;
    for (const v of r.values) if (counts.get(v) > bestCount) { best = v; bestCount = counts.get(v); }
    return best === null ? "#N/A" : best;
  },
  "MODE.MULT"(engine, args) {
    const r = numericArgs(engine, args); if (r.error) return r.error;
    const counts = new Map(); for (const v of r.values) counts.set(v, (counts.get(v) || 0) + 1);
    const top = Math.max(0, ...counts.values()); if (top < 2) return "#N/A";
    const seen = new Set(); const modes = [];
    for (const v of r.values) if (counts.get(v) === top && !seen.has(v)) { seen.add(v); modes.push(v); }
    return modes;
  },
  "PERCENTILE.INC"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const s = sortedNumbers(engine, args[0]); if (s.error) return s.error;
    const k = num(engine, args[1]); if (isErr(k)) return k;
    if (!s.values.length || k < 0 || k > 1) return "#NUM!"; return clean(percentileInc(s.values, k));
  },
  "PERCENTILE.EXC"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const s = sortedNumbers(engine, args[0]); if (s.error) return s.error;
    const k = num(engine, args[1]); if (isErr(k)) return k;
    if (!s.values.length || k <= 0 || k >= 1) return "#NUM!"; const r = percentileExc(s.values, k); return typeof r === "number" ? clean(r) : r;
  },
  "QUARTILE.INC"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const s = sortedNumbers(engine, args[0]); if (s.error) return s.error;
    const q = num(engine, args[1]); if (isErr(q)) return q;
    const quart = trunc(q); if (!s.values.length || quart < 0 || quart > 4) return "#NUM!"; return clean(percentileInc(s.values, quart / 4));
  },
  "QUARTILE.EXC"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const s = sortedNumbers(engine, args[0]); if (s.error) return s.error;
    const q = num(engine, args[1]); if (isErr(q)) return q;
    const quart = trunc(q); if (!s.values.length || quart < 1 || quart > 3) return "#NUM!"; const r = percentileExc(s.values, quart / 4); return typeof r === "number" ? clean(r) : r;
  },
  "PERCENTRANK.INC"(engine, args) { return percentRank(engine, args, false); },
  "PERCENTRANK.EXC"(engine, args) { return percentRank(engine, args, true); },
  PERCENTRANK(engine, args) { return percentRank(engine, args, false); },
  QUARTILE(engine, args) { return STAT_FUNCTIONS["QUARTILE.INC"](engine, args); },
  "RANK.AVG"(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const r = numericArgs(engine, [args[1]]); if (r.error) return r.error;
    const order = args[2] === undefined ? 0 : num(engine, args[2]); if (isErr(order)) return order;
    if (!r.values.includes(x)) return "#N/A";
    const better = r.values.filter(v => (order === 0 ? v > x : v < x)).length;
    const ties = r.values.filter(v => v === x).length;
    return better + (ties + 1) / 2;
  },

  // ---- Tương quan, hồi quy
  CORREL(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; const c = regression(r.xs, r.ys); return c.sxx === 0 || c.syy === 0 ? "#DIV/0!" : clean(c.sxy / Math.sqrt(c.sxx * c.syy)); },
  PEARSON(engine, args) { return STAT_FUNCTIONS.CORREL(engine, args); },
  RSQ(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; const c = regression(r.xs, r.ys); return c.sxx === 0 || c.syy === 0 ? "#DIV/0!" : clean(c.sxy * c.sxy / (c.sxx * c.syy)); },
  SLOPE(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; const c = regression(r.ys, r.xs); return c.sxx === 0 ? "#DIV/0!" : clean(c.slope); },
  INTERCEPT(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; const c = regression(r.ys, r.xs); return c.sxx === 0 ? "#DIV/0!" : clean(c.intercept); },
  "COVARIANCE.P"(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; return clean(covarianceOf(r.xs, r.ys, true)); },
  "COVARIANCE.S"(engine, args) { const r = pairStats(engine, args); if (r.error) return r.error; return r.xs.length < 2 ? "#DIV/0!" : clean(covarianceOf(r.xs, r.ys, false)); },
  COVAR(engine, args) { return STAT_FUNCTIONS["COVARIANCE.P"](engine, args); },
  STEYX(engine, args) {
    const r = pairStats(engine, args); if (r.error) return r.error;
    if (r.xs.length < 3) return "#DIV/0!";
    const c = regression(r.ys, r.xs);
    return c.sxx === 0 ? "#DIV/0!" : clean(Math.sqrt(Math.max(0, (c.syy - c.sxy * c.sxy / c.sxx) / (r.xs.length - 2))));
  },
  "FORECAST.LINEAR"(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const r = pairedRanges(engine, args[1], args[2]); if (r.error) return r.error;
    if (r.xs.length < 1) return "#DIV/0!";
    // known_y = args[1], known_x = args[2]: pairedRanges trả (xs = đối số 1, ys = đối số 2)
    const c = regression(r.ys, r.xs);
    return c.sxx === 0 ? "#DIV/0!" : clean(c.intercept + c.slope * x);
  },
  FORECAST(engine, args) { return STAT_FUNCTIONS["FORECAST.LINEAR"](engine, args); },
  PROB(engine, args) {
    if (args.length < 3 || args.length > 4) return "#VALUE!";
    const xs = engine._rangeMatrix(args[0]).flat().map(v => (typeof v === "number" ? v : engine._parseNumberOrCurrency?.(v)));
    const ps = engine._rangeMatrix(args[1]).flat().map(v => (typeof v === "number" ? v : engine._parseNumberOrCurrency?.(v)));
    if (xs.length !== ps.length) return "#N/A";
    if (xs.some(v => typeof v !== "number") || ps.some(v => typeof v !== "number")) return "#VALUE!";
    if (ps.some(p => p < 0 || p > 1) || Math.abs(sum(ps) - 1) > 1e-9) return "#NUM!";
    const lower = num(engine, args[2]); if (isErr(lower)) return lower;
    const upper = args[3] === undefined ? lower : num(engine, args[3]); if (isErr(upper)) return upper;
    return clean(xs.reduce((s, x, i) => s + (x >= lower && x <= upper ? ps[i] : 0), 0));
  },

  // ---- Phân phối chuẩn / log-chuẩn / mũ
  "NORM.DIST"(engine, args) {
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error; if (args.length !== 4) return "#VALUE!";
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const [x, mu, sigma] = t.values; if (sigma <= 0) return "#NUM!";
    return clean(dist.normal(x, mu, sigma, cum));
  },
  "NORM.S.DIST"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const z = num(engine, args[0]); if (isErr(z)) return z;
    const cum = cumFlag(engine, args[1]); if (isErr(cum)) return cum;
    return clean(cum ? D.normCdf(z) : D.normPdf(z));
  },
  "NORM.INV"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error;
    const [p, mu, sigma] = t.values; if (p <= 0 || p >= 1 || sigma <= 0) return "#NUM!";
    return clean(mu + sigma * D.normInv(p));
  },
  "NORM.S.INV"(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; const p = t.values[0]; return p <= 0 || p >= 1 ? "#NUM!" : clean(D.normInv(p)); },
  NORMDIST(engine, args) { return STAT_FUNCTIONS["NORM.DIST"](engine, args); },
  NORMSDIST(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; return clean(D.normCdf(t.values[0])); },
  NORMINV(engine, args) { return STAT_FUNCTIONS["NORM.INV"](engine, args); },
  NORMSINV(engine, args) { return STAT_FUNCTIONS["NORM.S.INV"](engine, args); },
  "LOGNORM.DIST"(engine, args) {
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error; if (args.length !== 4) return "#VALUE!";
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const [x, mu, sigma] = t.values; if (x <= 0 || sigma <= 0) return "#NUM!";
    return clean(cum ? D.normCdf((Math.log(x) - mu) / sigma) : D.normPdf((Math.log(x) - mu) / sigma) / (x * sigma));
  },
  LOGNORMDIST(engine, args) { const t = take(engine, args, 3); if (t.error) return t.error; const [x, mu, sigma] = t.values; return x <= 0 || sigma <= 0 ? "#NUM!" : clean(D.normCdf((Math.log(x) - mu) / sigma)); },
  "LOGNORM.INV"(engine, args) { const t = take(engine, args, 3); if (t.error) return t.error; const [p, mu, sigma] = t.values; return p <= 0 || p >= 1 || sigma <= 0 ? "#NUM!" : clean(Math.exp(mu + sigma * D.normInv(p))); },
  LOGINV(engine, args) { return STAT_FUNCTIONS["LOGNORM.INV"](engine, args); },
  "EXPON.DIST"(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const x = num(engine, args[0]); if (isErr(x)) return x;
    const lambda = num(engine, args[1]); if (isErr(lambda)) return lambda;
    const cum = cumFlag(engine, args[2]); if (isErr(cum)) return cum;
    if (x < 0 || lambda <= 0) return "#NUM!";
    return clean(cum ? 1 - Math.exp(-lambda * x) : lambda * Math.exp(-lambda * x));
  },
  EXPONDIST(engine, args) { return STAT_FUNCTIONS["EXPON.DIST"](engine, args); },
  "WEIBULL.DIST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const [x, alpha, beta] = t.values; if (x < 0 || alpha <= 0 || beta <= 0) return "#NUM!";
    return clean(cum ? 1 - Math.exp(-((x / beta) ** alpha)) : (alpha / beta ** alpha) * x ** (alpha - 1) * Math.exp(-((x / beta) ** alpha)));
  },
  WEIBULL(engine, args) { return STAT_FUNCTIONS["WEIBULL.DIST"](engine, args); },

  // ---- Gamma, beta, chi-bình phương, F, t
  GAMMALN(engine, args) { const t = take(engine, args, 1); if (t.error) return t.error; return t.values[0] <= 0 ? "#NUM!" : clean(D.lnGamma(t.values[0])); },
  "GAMMALN.PRECISE"(engine, args) { return STAT_FUNCTIONS.GAMMALN(engine, args); },
  "GAMMA.DIST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const [x, alpha, beta] = t.values; if (x < 0 || alpha <= 0 || beta <= 0) return "#NUM!";
    return clean(cum ? D.gammaCdf(x, alpha, beta) : D.gammaPdf(x, alpha, beta));
  },
  GAMMADIST(engine, args) { return STAT_FUNCTIONS["GAMMA.DIST"](engine, args); },
  "GAMMA.INV"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error;
    const [p, alpha, beta] = t.values; if (p < 0 || p >= 1 || alpha <= 0 || beta <= 0) return "#NUM!";
    if (p === 0) return 0;
    return clean(D.invertIncreasing(x => D.gammaCdf(x, alpha, beta), p, 0, alpha * beta + 10 * Math.sqrt(alpha) * beta));
  },
  GAMMAINV(engine, args) { return STAT_FUNCTIONS["GAMMA.INV"](engine, args); },
  "BETA.DIST"(engine, args) {
    if (args.length < 4 || args.length > 6) return "#VALUE!";
    const base = take(engine, [args[0], args[1], args[2]], 3); if (base.error) return base.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const A = args[4] === undefined ? 0 : num(engine, args[4]); if (isErr(A)) return A;
    const B = args[5] === undefined ? 1 : num(engine, args[5]); if (isErr(B)) return B;
    const [x, alpha, beta] = base.values; if (alpha <= 0 || beta <= 0 || x < A || x > B || A === B) return "#NUM!";
    return clean(cum ? D.betaCdf(x, alpha, beta, A, B) : D.betaPdf(x, alpha, beta, A, B));
  },
  BETADIST(engine, args) {
    if (args.length < 3 || args.length > 5) return "#VALUE!";
    const base = take(engine, args.slice(0, 3), 3); if (base.error) return base.error;
    const A = args[3] === undefined ? 0 : num(engine, args[3]); if (isErr(A)) return A;
    const B = args[4] === undefined ? 1 : num(engine, args[4]); if (isErr(B)) return B;
    const [x, alpha, beta] = base.values; if (alpha <= 0 || beta <= 0 || x < A || x > B || A === B) return "#NUM!";
    return clean(D.betaCdf(x, alpha, beta, A, B));
  },
  "BETA.INV"(engine, args) {
    if (args.length < 3 || args.length > 5) return "#VALUE!";
    const base = take(engine, args.slice(0, 3), 3); if (base.error) return base.error;
    const A = args[3] === undefined ? 0 : num(engine, args[3]); if (isErr(A)) return A;
    const B = args[4] === undefined ? 1 : num(engine, args[4]); if (isErr(B)) return B;
    const [p, alpha, beta] = base.values; if (p <= 0 || p > 1 || alpha <= 0 || beta <= 0 || A >= B) return "#NUM!";
    return clean(A + (B - A) * D.invertIncreasing(x => D.betaI(x, alpha, beta), p, 0, 1));
  },
  BETAINV(engine, args) { return STAT_FUNCTIONS["BETA.INV"](engine, args); },
  "CHISQ.DIST"(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const t = take(engine, args.slice(0, 2), 2); if (t.error) return t.error;
    const cum = cumFlag(engine, args[2]); if (isErr(cum)) return cum;
    const [x, df] = t.values; const k = trunc(df); if (x < 0 || k < 1 || k > 1e10) return "#NUM!";
    return clean(cum ? D.chisqCdf(x, k) : D.chisqPdf(x, k));
  },
  "CHISQ.DIST.RT"(engine, args) { const t = take(engine, args, 2); if (t.error) return t.error; const [x, df] = t.values; const k = trunc(df); return x < 0 || k < 1 ? "#NUM!" : clean(1 - D.chisqCdf(x, k)); },
  CHIDIST(engine, args) { return STAT_FUNCTIONS["CHISQ.DIST.RT"](engine, args); },
  "CHISQ.INV"(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error; const [p, df] = t.values; const k = trunc(df);
    if (p < 0 || p >= 1 || k < 1) return "#NUM!"; if (p === 0) return 0;
    return clean(D.invertIncreasing(x => D.chisqCdf(x, k), p, 0, k + 10 * Math.sqrt(2 * k)));
  },
  "CHISQ.INV.RT"(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error; const [p, df] = t.values; const k = trunc(df);
    if (p <= 0 || p > 1 || k < 1) return "#NUM!";
    return clean(D.invertIncreasing(x => D.chisqCdf(x, k), 1 - p, 0, k + 10 * Math.sqrt(2 * k)));
  },
  CHIINV(engine, args) { return STAT_FUNCTIONS["CHISQ.INV.RT"](engine, args); },
  "F.DIST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const [x, d1, d2] = t.values; const a = trunc(d1); const b = trunc(d2);
    if (x < 0 || a < 1 || b < 1) return "#NUM!";
    return clean(cum ? D.fCdf(x, a, b) : D.fPdf(x, a, b));
  },
  "F.DIST.RT"(engine, args) { const t = take(engine, args, 3); if (t.error) return t.error; const [x, d1, d2] = t.values; const a = trunc(d1); const b = trunc(d2); return x < 0 || a < 1 || b < 1 ? "#NUM!" : clean(1 - D.fCdf(x, a, b)); },
  FDIST(engine, args) { return STAT_FUNCTIONS["F.DIST.RT"](engine, args); },
  "F.INV"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const [p, d1, d2] = t.values; const a = trunc(d1); const b = trunc(d2);
    if (p < 0 || p >= 1 || a < 1 || b < 1) return "#NUM!"; if (p === 0) return 0;
    return clean(D.invertIncreasing(x => D.fCdf(x, a, b), p, 0, 10));
  },
  "F.INV.RT"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const [p, d1, d2] = t.values; const a = trunc(d1); const b = trunc(d2);
    if (p <= 0 || p > 1 || a < 1 || b < 1) return "#NUM!";
    return clean(D.invertIncreasing(x => D.fCdf(x, a, b), 1 - p, 0, 10));
  },
  FINV(engine, args) { return STAT_FUNCTIONS["F.INV.RT"](engine, args); },
  "T.DIST"(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const t = take(engine, args.slice(0, 2), 2); if (t.error) return t.error;
    const cum = cumFlag(engine, args[2]); if (isErr(cum)) return cum;
    const [x, df] = t.values; const k = trunc(df); if (k < 1) return "#NUM!";
    return clean(cum ? D.tCdf(x, k) : D.tPdf(x, k));
  },
  "T.DIST.2T"(engine, args) { const t = take(engine, args, 2); if (t.error) return t.error; const [x, df] = t.values; const k = trunc(df); return x < 0 || k < 1 ? "#NUM!" : clean(2 * (1 - D.tCdf(x, k))); },
  // ---- Kiểm định giả thuyết: T.TEST, F.TEST, CHISQ.TEST (và tên cũ TTEST, FTEST, CHITEST) và GAMMA
  "T.TEST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const options = take(engine, args.slice(2), 2); if (options.error) return options.error;
    const tails = trunc(options.values[0]); const type = trunc(options.values[1]);
    if ((tails !== 1 && tails !== 2) || type < 1 || type > 3) return "#NUM!";
    let t; let df;
    if (type === 1) {
      const pair = pairedRanges(engine, args[0], args[1]);
      if (pair.error) return pair.error;
      const n = pair.xs.length;
      if (n < 2) return "#DIV/0!";
      const diffs = pair.xs.map((x, i) => x - pair.ys[i]);
      const sd = Math.sqrt(variance(diffs, false));
      if (sd === 0) return "#DIV/0!";
      t = mean(diffs) / (sd / Math.sqrt(n)); df = n - 1;
    } else {
      const a = numericArgs(engine, [args[0]]); if (a.error) return a.error;
      const b = numericArgs(engine, [args[1]]); if (b.error) return b.error;
      const n1 = a.values.length; const n2 = b.values.length;
      if (n1 < 2 || n2 < 2) return "#DIV/0!";
      const v1 = variance(a.values, false); const v2 = variance(b.values, false);
      if (type === 2) {
        const pooled = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
        if (pooled === 0) return "#DIV/0!";
        t = (mean(a.values) - mean(b.values)) / Math.sqrt(pooled * (1 / n1 + 1 / n2)); df = n1 + n2 - 2;
      } else {
        const se2 = v1 / n1 + v2 / n2;
        if (se2 === 0) return "#DIV/0!";
        t = (mean(a.values) - mean(b.values)) / Math.sqrt(se2);
        df = se2 ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
      }
    }
    const twoTail = D.betaI(df / (df + t * t), df / 2, 0.5);
    return clean(tails === 2 ? twoTail : twoTail / 2);
  },
  TTEST(engine, args) { return STAT_FUNCTIONS["T.TEST"](engine, args); },
  "F.TEST"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = numericArgs(engine, [args[0]]); if (a.error) return a.error;
    const b = numericArgs(engine, [args[1]]); if (b.error) return b.error;
    if (a.values.length < 2 || b.values.length < 2) return "#DIV/0!";
    const v1 = variance(a.values, false); const v2 = variance(b.values, false);
    if (v1 === 0 || v2 === 0) return "#DIV/0!";
    const f = v1 / v2;
    const cdf = D.fCdf(f, a.values.length - 1, b.values.length - 1);
    return clean(2 * Math.min(cdf, 1 - cdf));
  },
  FTEST(engine, args) { return STAT_FUNCTIONS["F.TEST"](engine, args); },
  "CHISQ.TEST"(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const actual = engine._rangeMatrix(args[0]);
    const expected = engine._rangeMatrix(args[1]);
    const rows = actual.length; const cols = actual[0]?.length || 0;
    if (!rows || !cols || expected.length !== rows || (expected[0]?.length || 0) !== cols) return "#N/A";
    let stat = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const o = actual[r][c]; const e = expected[r][c];
        if (isErr(o)) return o;
        if (isErr(e)) return e;
        if (typeof o !== "number" || typeof e !== "number") return "#VALUE!";
        if (e === 0) return "#DIV/0!";
        stat += (o - e) ** 2 / e;
      }
    }
    const df = rows > 1 && cols > 1 ? (rows - 1) * (cols - 1) : rows * cols - 1;
    if (df < 1) return "#DIV/0!";
    return clean(1 - D.chisqCdf(stat, df));
  },
  CHITEST(engine, args) { return STAT_FUNCTIONS["CHISQ.TEST"](engine, args); },
  GAMMA(engine, args) {
    const t = take(engine, args, 1); if (t.error) return t.error;
    const x = t.values[0];
    if (x <= 0 && Number.isInteger(x)) return "#NUM!";
    const value = x > 0
      ? Math.exp(D.lnGamma(x))
      : Math.PI / (Math.sin(Math.PI * x) * Math.exp(D.lnGamma(1 - x)));
    return clean(value);
  },
  "T.DIST.RT"(engine, args) { const t = take(engine, args, 2); if (t.error) return t.error; const [x, df] = t.values; const k = trunc(df); return k < 1 ? "#NUM!" : clean(1 - D.tCdf(x, k)); },
  TDIST(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const [x, df, tails] = t.values; const k = trunc(df); const tl = trunc(tails);
    if (x < 0 || k < 1 || (tl !== 1 && tl !== 2)) return "#NUM!";
    return clean(tl * (1 - D.tCdf(x, k)));
  },
  "T.INV"(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error; const [p, df] = t.values; const k = trunc(df);
    if (p <= 0 || p >= 1 || k < 1) return "#NUM!";
    return clean(D.invertIncreasing(x => D.tCdf(x, k), p, -10, 10));
  },
  "T.INV.2T"(engine, args) {
    const t = take(engine, args, 2); if (t.error) return t.error; const [p, df] = t.values; const k = trunc(df);
    if (p <= 0 || p > 1 || k < 1) return "#NUM!";
    return clean(D.invertIncreasing(x => D.tCdf(x, k), 1 - p / 2, 0, 10));
  },
  TINV(engine, args) { return STAT_FUNCTIONS["T.INV.2T"](engine, args); },

  // ---- Phân phối rời rạc
  "BINOM.DIST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const k = trunc(t.values[0]); const n = trunc(t.values[1]); const p = t.values[2];
    if (k < 0 || k > n || n < 0 || p < 0 || p > 1) return "#NUM!";
    return clean(cum ? D.binomCdf(k, n, p) : D.binomPmf(k, n, p));
  },
  BINOMDIST(engine, args) { return STAT_FUNCTIONS["BINOM.DIST"](engine, args); },
  "BINOM.INV"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error;
    const n = trunc(t.values[0]); const p = t.values[1]; const alpha = t.values[2];
    if (n < 0 || p < 0 || p > 1 || alpha < 0 || alpha > 1) return "#NUM!";
    return binomInv(n, p, alpha);
  },
  CRITBINOM(engine, args) { return STAT_FUNCTIONS["BINOM.INV"](engine, args); },
  "BINOM.DIST.RANGE"(engine, args) {
    if (args.length < 3 || args.length > 4) return "#VALUE!";
    const t = take(engine, args, 3, 4); if (t.error) return t.error;
    const n = trunc(t.values[0]); const p = t.values[1]; const s1 = trunc(t.values[2]); const s2 = t.values[3] === undefined ? s1 : trunc(t.values[3]);
    if (n < 0 || p < 0 || p > 1 || s1 < 0 || s1 > n || s2 < s1 || s2 > n) return "#NUM!";
    let total = 0; for (let k = s1; k <= s2; k++) total += D.binomPmf(k, n, p);
    return clean(total);
  },
  "POISSON.DIST"(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const t = take(engine, args.slice(0, 2), 2); if (t.error) return t.error;
    const cum = cumFlag(engine, args[2]); if (isErr(cum)) return cum;
    const x = trunc(t.values[0]); const lambda = t.values[1]; if (x < 0 || lambda < 0) return "#NUM!";
    if (lambda === 0) return cum ? 1 : (x === 0 ? 1 : 0);
    return clean(cum ? D.poissonCdf(x, lambda) : D.poissonPmf(x, lambda));
  },
  POISSON(engine, args) { return STAT_FUNCTIONS["POISSON.DIST"](engine, args); },
  "NEGBINOM.DIST"(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = take(engine, args.slice(0, 3), 3); if (t.error) return t.error;
    const cum = cumFlag(engine, args[3]); if (isErr(cum)) return cum;
    const f = trunc(t.values[0]); const s = trunc(t.values[1]); const p = t.values[2];
    if (f < 0 || s < 1 || p < 0 || p > 1) return "#NUM!";
    const pmf = k => Math.exp(D.lnChoose(k + s - 1, k) + s * Math.log(p) + k * Math.log(1 - p));
    if (!cum) return clean(pmf(f));
    let total = 0; for (let k = 0; k <= f; k++) total += pmf(k); return clean(Math.min(1, total));
  },
  NEGBINOMDIST(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const f = trunc(t.values[0]); const s = trunc(t.values[1]); const p = t.values[2];
    if (f < 0 || s < 1 || p < 0 || p > 1) return "#NUM!";
    return clean(Math.exp(D.lnChoose(f + s - 1, f) + s * Math.log(p) + f * Math.log(1 - p)));
  },
  "HYPGEOM.DIST"(engine, args) {
    if (args.length !== 5) return "#VALUE!";
    const t = take(engine, args.slice(0, 4), 4); if (t.error) return t.error;
    const cum = cumFlag(engine, args[4]); if (isErr(cum)) return cum;
    const k = trunc(t.values[0]); const n = trunc(t.values[1]); const K = trunc(t.values[2]); const N = trunc(t.values[3]);
    if (n < 0 || n > N || K < 0 || K > N || N <= 0 || k < 0 || k > Math.min(n, K) || k < Math.max(0, n - N + K)) return "#NUM!";
    const pmf = i => Math.exp(D.lnChoose(K, i) + D.lnChoose(N - K, n - i) - D.lnChoose(N, n));
    if (!cum) return clean(pmf(k));
    let total = 0; for (let i = Math.max(0, n - N + K); i <= k; i++) total += pmf(i); return clean(Math.min(1, total));
  },
  HYPGEOMDIST(engine, args) {
    const t = take(engine, args, 4); if (t.error) return t.error;
    const k = trunc(t.values[0]); const n = trunc(t.values[1]); const K = trunc(t.values[2]); const N = trunc(t.values[3]);
    if (n < 0 || n > N || K < 0 || K > N || N <= 0 || k < 0 || k > Math.min(n, K) || k < Math.max(0, n - N + K)) return "#NUM!";
    return clean(Math.exp(D.lnChoose(K, k) + D.lnChoose(N - K, n - k) - D.lnChoose(N, n)));
  },

  // ---- Khoảng tin cậy và kiểm định z
  "CONFIDENCE.NORM"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const [alpha, sd, size] = t.values; const n = trunc(size);
    if (alpha <= 0 || alpha >= 1 || sd <= 0 || n < 1) return "#NUM!";
    return clean(-D.normInv(alpha / 2) * sd / Math.sqrt(n));
  },
  CONFIDENCE(engine, args) { return STAT_FUNCTIONS["CONFIDENCE.NORM"](engine, args); },
  "CONFIDENCE.T"(engine, args) {
    const t = take(engine, args, 3); if (t.error) return t.error; const [alpha, sd, size] = t.values; const n = trunc(size);
    if (alpha <= 0 || alpha >= 1 || sd <= 0 || n < 1) return "#NUM!"; if (n === 1) return "#DIV/0!";
    const tv = D.invertIncreasing(x => D.tCdf(x, n - 1), 1 - alpha / 2, 0, 10);
    return clean(tv * sd / Math.sqrt(n));
  },
  "Z.TEST"(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const r = numericArgs(engine, [args[0]]); if (r.error) return r.error;
    const x = num(engine, args[1]); if (isErr(x)) return x;
    const n = r.values.length; if (!n) return "#N/A";
    let sigma;
    if (args[2] === undefined) { if (n < 2) return "#DIV/0!"; sigma = Math.sqrt(variance(r.values, false)); } else { sigma = num(engine, args[2]); if (isErr(sigma)) return sigma; }
    if (sigma === 0) return "#DIV/0!"; if (sigma < 0) return "#NUM!";
    return clean(1 - D.normCdf((mean(r.values) - x) / (sigma / Math.sqrt(n))));
  },
  ZTEST(engine, args) { return STAT_FUNCTIONS["Z.TEST"](engine, args); }
};

function varianceFn(engine, args, population, std) {
  const r = numericArgs(engine, args); if (r.error) return r.error;
  const n = r.values.length;
  if (population ? n < 1 : n < 2) return "#DIV/0!";
  const v = variance(r.values, population);
  return clean(std ? Math.sqrt(v) : v);
}

function varianceA(engine, args, population, std) {
  const r = aValues(engine, args); if (r.error) return r.error;
  const n = r.values.length;
  if (population ? n < 1 : n < 2) return "#DIV/0!";
  const v = variance(r.values, population);
  return clean(std ? Math.sqrt(v) : v);
}
