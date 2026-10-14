/**
 * Hàm chứng khoán / khấu hao Pháp (EXCEL-E1c): COUP*, PRICE, YIELD, DURATION, MDURATION, ACCRINT, AMOR*.
 * Đối chiếu Excel 2016: tests/functions/cases-batch7-securities.json.
 */
import { isErr, num } from "./formula-function-helpers.js";
import { dateArg } from "./formula-functions-misc.js";

const DAY_MS = 86400000;
const EPOCH = Date.UTC(1899, 11, 30);
const toDate = serial => new Date(EPOCH + Math.floor(serial) * DAY_MS);
const toSerial = date => Math.round((date.getTime() - EPOCH) / DAY_MS);
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function addMonths(serial, months, eom) {
  const d = toDate(serial);
  let y = d.getUTCFullYear(); let m = d.getUTCMonth() + months;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const last = dim(y, m + 1);
  const day = eom ? last : Math.min(d.getUTCDate(), last);
  return toSerial(new Date(Date.UTC(y, m, day)));
}
const isEom = serial => { const d = toDate(serial); return d.getUTCDate() === dim(d.getUTCFullYear(), d.getUTCMonth() + 1); };

function days30(a, b, european) {
  const A = toDate(a); const B = toDate(b);
  let d1 = A.getUTCDate(); let d2 = B.getUTCDate();
  const m1 = A.getUTCMonth() + 1; const m2 = B.getUTCMonth() + 1;
  if (european) { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30; }
  else {
    const aLastFeb = m1 === 2 && d1 === dim(A.getUTCFullYear(), 2);
    const bLastFeb = m2 === 2 && d2 === dim(B.getUTCFullYear(), 2);
    if (aLastFeb && bLastFeb) d2 = 30;
    if (aLastFeb) d1 = 30;
    if (d2 === 31 && d1 >= 30) d2 = 30;
    if (d1 === 31) d1 = 30;
  }
  return (B.getUTCFullYear() - A.getUTCFullYear()) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

/** Thông tin kỳ phiếu lãi quanh ngày thanh toán. */
function coupon(settle, maturity, freq, basis) {
  const step = 12 / freq; const eom = isEom(maturity);
  let k = 0; let ncd = maturity; let pcd = maturity;
  while (pcd > settle) { k++; ncd = pcd; pcd = addMonths(maturity, -k * step, eom); }
  const num = k === 0 ? 0 : k;
  let daybs;
  daybs = basis === 0 ? days30(pcd, settle, false) : basis === 4 ? days30(pcd, settle, true) : settle - pcd;
  const days = basis === 1 ? ncd - pcd : basis === 3 ? 365 / freq : 360 / freq;
  const daysnc = basis === 0 || basis === 4 ? days - daybs : ncd - settle;
  return { pcd, ncd, num, daybs, days, daysnc };
}

function common(engine, args, { min, max, withFreq = true }) {
  if (args.length < min || args.length > max) return { error: "#VALUE!" };
  const s = dateArg(engine, args[0]); if (isErr(s)) return { error: s };
  const m = dateArg(engine, args[1]); if (isErr(m)) return { error: m };
  return { s: Math.floor(s), m: Math.floor(m) };
}

function freqBasis(engine, freqArg, basisArg) {
  const f = num(engine, freqArg); if (isErr(f)) return { error: f };
  const freq = Math.trunc(f);
  if (freq !== 1 && freq !== 2 && freq !== 4) return { error: "#NUM!" };
  let basis = 0;
  if (basisArg !== undefined) { const b = num(engine, basisArg); if (isErr(b)) return { error: b }; basis = Math.trunc(b); }
  if (basis < 0 || basis > 4) return { error: "#NUM!" };
  return { freq, basis };
}

function coupFn(pick) {
  return (engine, args) => {
    const d = common(engine, args, { min: 3, max: 4 }); if (d.error) return d.error;
    const fb = freqBasis(engine, args[2], args[3]); if (fb.error) return fb.error;
    if (d.s >= d.m) return "#NUM!";
    return pick(coupon(d.s, d.m, fb.freq, fb.basis));
  };
}

function priceOf(c, freq, rate, yld, redemption) {
  const { num: N, daybs: A, days: E } = c; const DSC = E - A;
  const coupAmt = 100 * rate / freq;
  if (N === 1) return (redemption + coupAmt) / (1 + DSC / E * yld / freq) - coupAmt * A / E;
  let price = redemption / (1 + yld / freq) ** (N - 1 + DSC / E);
  for (let k = 1; k <= N; k++) price += coupAmt / (1 + yld / freq) ** (k - 1 + DSC / E);
  return price - coupAmt * A / E;
}

function priceArgs(engine, args) {
  const d = common(engine, args, { min: 6, max: 7 }); if (d.error) return d;
  const n = [];
  for (const i of [2, 3, 4]) { const v = num(engine, args[i]); if (isErr(v)) return { error: v }; n.push(v); }
  const fb = freqBasis(engine, args[5], args[6]); if (fb.error) return fb;
  return { ...d, ...fb, rate: n[0], second: n[1], redemption: n[2] };
}

function durationOf(c, freq, rate, yld) {
  const { num: N, daybs: A, days: E } = c; const DSC = E - A;
  const coupAmt = 100 * rate / freq;
  let pv = 0; let weighted = 0;
  for (let k = 1; k <= N; k++) {
    const t = (k - 1 + DSC / E) / freq;
    const cash = k === N ? coupAmt + 100 : coupAmt;
    const v = cash / (1 + yld / freq) ** (k - 1 + DSC / E);
    pv += v; weighted += v * t;
  }
  return { duration: weighted / pv, accrued: coupAmt * A / E };
}

function yfrac(engine, a, b, basis) {
  return engine._executeFunction("YEARFRAC", [String(a), String(b), String(basis)]);
}

function amorArgs(engine, args) {
  if (args.length < 6 || args.length > 7) return { error: "#VALUE!" };
  const cost = num(engine, args[0]); if (isErr(cost)) return { error: cost };
  const purchase = dateArg(engine, args[1]); if (isErr(purchase)) return { error: purchase };
  const first = dateArg(engine, args[2]); if (isErr(first)) return { error: first };
  const salvage = num(engine, args[3]); if (isErr(salvage)) return { error: salvage };
  const period = num(engine, args[4]); if (isErr(period)) return { error: period };
  const rate = num(engine, args[5]); if (isErr(rate)) return { error: rate };
  let basis = 0;
  if (args[6] !== undefined) { const b = num(engine, args[6]); if (isErr(b)) return { error: b }; basis = Math.trunc(b); }
  if (cost < 0 || salvage < 0 || salvage > cost || period < 0 || rate <= 0 || basis < 0 || basis > 4 || basis === 2 || Math.floor(first) < Math.floor(purchase)) return { error: "#NUM!" };
  return { cost, purchase: Math.floor(purchase), first: Math.floor(first), salvage, period: Math.trunc(period), rate, basis };
}

const round = x => Math.round(x);

export const SECURITIES_FUNCTIONS = {
  COUPPCD: coupFn(c => c.pcd),
  COUPNCD: coupFn(c => c.ncd),
  COUPNUM: coupFn(c => c.num),
  COUPDAYBS: coupFn(c => c.daybs),
  COUPDAYS: coupFn(c => c.days),
  COUPDAYSNC: coupFn(c => c.daysnc),

  PRICE(engine, args) {
    const a = priceArgs(engine, args); if (a.error) return a.error;
    if (a.s >= a.m || a.rate < 0 || a.second < 0 || a.redemption <= 0) return "#NUM!";
    return priceOf(coupon(a.s, a.m, a.freq, a.basis), a.freq, a.rate, a.second, a.redemption);
  },
  YIELD(engine, args) {
    const a = priceArgs(engine, args); if (a.error) return a.error;
    if (a.s >= a.m || a.rate < 0 || a.second <= 0 || a.redemption <= 0) return "#NUM!";
    const c = coupon(a.s, a.m, a.freq, a.basis);
    const target = a.second;
    const f = y => priceOf(c, a.freq, a.rate, y, a.redemption) - target;
    // Newton + chặn
    let y = a.rate > 0 ? a.rate : 0.05;
    for (let i = 0; i < 100; i++) {
      const h = 1e-7;
      const fy = f(y); const d = (f(y + h) - fy) / h;
      if (!Number.isFinite(d) || d === 0) break;
      let next = y - fy / d;
      if (next <= -a.freq * 0.999) next = (y - a.freq * 0.999) / 2;
      if (Math.abs(next - y) < 1e-13) { y = next; break; }
      y = next;
    }
    if (!Number.isFinite(y) || Math.abs(f(y)) > 1e-6) return "#NUM!";
    return y;
  },
  DURATION(engine, args) {
    const d = common(engine, args, { min: 5, max: 6 }); if (d.error) return d.error;
    const rate = num(engine, args[2]); if (isErr(rate)) return rate;
    const yld = num(engine, args[3]); if (isErr(yld)) return yld;
    const fb = freqBasis(engine, args[4], args[5]); if (fb.error) return fb.error;
    if (d.s >= d.m || rate < 0 || yld < 0) return "#NUM!";
    return durationOf(coupon(d.s, d.m, fb.freq, fb.basis), fb.freq, rate, yld).duration;
  },
  MDURATION(engine, args) {
    const d = common(engine, args, { min: 5, max: 6 }); if (d.error) return d.error;
    const rate = num(engine, args[2]); if (isErr(rate)) return rate;
    const yld = num(engine, args[3]); if (isErr(yld)) return yld;
    const fb = freqBasis(engine, args[4], args[5]); if (fb.error) return fb.error;
    if (d.s >= d.m || rate < 0 || yld < 0) return "#NUM!";
    return durationOf(coupon(d.s, d.m, fb.freq, fb.basis), fb.freq, rate, yld).duration / (1 + yld / fb.freq);
  },
  ACCRINT(engine, args) {
    if (args.length < 6 || args.length > 8) return "#VALUE!";
    const issue = dateArg(engine, args[0]); if (isErr(issue)) return issue;
    const first = dateArg(engine, args[1]); if (isErr(first)) return first;
    const settle = dateArg(engine, args[2]); if (isErr(settle)) return settle;
    const rate = num(engine, args[3]); if (isErr(rate)) return rate;
    const par = num(engine, args[4]); if (isErr(par)) return par;
    const fb = freqBasis(engine, args[5], args[6]); if (fb.error) return fb.error;
    let method = true;
    if (args[7] !== undefined) { const m = num(engine, args[7]); if (isErr(m)) return m; method = m !== 0; }
    const I = Math.floor(issue); const F = Math.floor(first); const S = Math.floor(settle);
    if (rate <= 0 || par <= 0 || I >= S) return "#NUM!";
    void method; const start = I;
    if (fb.basis === 0 || fb.basis === 4 || fb.basis === 2 || fb.basis === 3) {
      const days = fb.basis === 0 ? days30(start, S, false) : fb.basis === 4 ? days30(start, S, true) : S - start;
      const year = fb.basis === 3 ? 365 : 360;
      return par * rate * days / year;
    }
    // basis 1: các kỳ giả định tính tiến từ ngày phát hành; phần lẻ chia cho độ dài kỳ đầu (đối chiếu Excel)
    const step = 12 / fb.freq;
    const firstEnd = addMonths(I, step, false);
    const firstLength = firstEnd - I;
    let full = 0; let periodStart = I;
    while (addMonths(I, (full + 1) * step, false) <= S && full < 5000) full++;
    periodStart = addMonths(I, full * step, false);
    return par * rate / fb.freq * (full + (S - periodStart) / firstLength);
  },
  AMORLINC(engine, args) {
    const a = amorArgs(engine, args); if (a.error) return a.error;
    const oneRate = a.cost * a.rate;
    const frac = yfrac(engine, a.purchase, a.first, a.basis); if (isErr(frac)) return frac;
    const firstDep = frac * a.rate * a.cost;
    const full = Math.trunc((a.cost - a.salvage - firstDep) / oneRate);
    if (a.period === 0) return firstDep;
    if (a.period <= full) return oneRate;
    if (a.period === full + 1) return a.cost - a.salvage - oneRate * full - firstDep;
    return 0;
  },
  AMORDEGRC(engine, args) {
    const a = amorArgs(engine, args); if (a.error) return a.error;
    const life = 1 / a.rate;
    const coeff = life < 3 ? 1 : life < 4 ? 1.5 : life <= 6 ? 2 : 2.5;
    const rate = a.rate * coeff;
    const frac = yfrac(engine, a.purchase, a.first, a.basis); if (isErr(frac)) return frac;
    let nRate = round(frac * rate * a.cost);
    if (a.period === 0) return nRate;
    let cost = a.cost - nRate; let rest = cost - a.salvage;
    for (let n = 0; n < a.period; n++) {
      nRate = round(rate * cost);
      rest -= nRate;
      if (rest < 0) return a.period - n <= 1 ? round(cost * 0.5) : 0;
      cost -= nRate;
    }
    return nRate;
  }
};
