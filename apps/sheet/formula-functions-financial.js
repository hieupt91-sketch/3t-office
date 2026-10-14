/**
 * Hàm tài chính bổ sung (EXCEL-E1c). Đối chiếu Excel 2016: tests/functions/cases-batch5-financial*.json.
 */
import { isErr, scalar, num } from "./formula-function-helpers.js";
import { dateArg } from "./formula-functions-misc.js";

const DAY_MS = 86400000;
const EPOCH = Date.UTC(1899, 11, 30);
const utcOf = serial => EPOCH + Math.floor(serial) * DAY_MS;
const serialOf = utc => Math.round((utc - EPOCH) / DAY_MS);
const parts = serial => { const d = new Date(utcOf(serial)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const lastDayOfMonth = (y, m, d) => d === daysInMonth(y, m);

function numbers(engine, args) {
  const out = [];
  for (const arg of args) {
    if (arg === undefined) { out.push(undefined); continue; }
    const v = num(engine, arg);
    if (isErr(v)) return { error: v };
    out.push(v);
  }
  return { values: out };
}

// ---------- Hàm dòng tiền cơ bản ----------
const fvOf = (r, n, pmt, pv, type) => (r === 0 ? -(pv + pmt * n) : -(pv * (1 + r) ** n + pmt * (1 + r * type) * ((1 + r) ** n - 1) / r));
const pmtOf = (r, n, pv, fv, type) => (r === 0 ? -(pv + fv) / n : -(pv * (1 + r) ** n + fv) * r / ((1 + r * type) * ((1 + r) ** n - 1)));
const ipmtOf = (r, per, n, pv, fv, type) => {
  const pmt = pmtOf(r, n, pv, fv, type);
  if (type === 1) return per === 1 ? 0 : ipmtOf(r, per - 1, n, pv, fv, 0) / (1 + r);
  return fvOf(r, per - 1, pmt, pv, 0) * r;
};

// ---------- Cơ sở đếm ngày ----------
/** Số ngày giữa hai ngày theo cơ sở basis (0 US 30/360, 1 thực/thực, 2 thực/360, 3 thực/365, 4 châu Âu 30/360). */
function days30(a, b, european, usFeb = true) {
  const A = parts(a); const B = parts(b);
  let d1 = A.d; let d2 = B.d;
  if (european) { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30; }
  else {
    if (usFeb && lastDayOfMonth(A.y, A.m, A.d) && A.m === 2 && lastDayOfMonth(B.y, B.m, B.d) && B.m === 2) d2 = 30;
    if (usFeb && A.m === 2 && lastDayOfMonth(A.y, A.m, A.d)) d1 = 30;
    if (d2 === 31 && d1 >= 30) d2 = 30;
    if (d1 === 31) d1 = 30;
  }
  return (B.y - A.y) * 360 + (B.m - A.m) * 30 + (d2 - d1);
}

function yearLengthActual(a, b) {
  const A = parts(a); const B = parts(b);
  if (A.y === B.y) return isLeap(A.y) ? 366 : 365;
  const sameOrNextYear = B.y === A.y + 1 && (B.m < A.m || (B.m === A.m && B.d <= A.d));
  if (sameOrNextYear) {
    // Cùng khoảng một năm: 366 nếu chứa 29/02
    if (isLeap(A.y) && (A.m < 2 || (A.m === 2 && A.d <= 29))) return 366;
    if (isLeap(B.y) && (B.m > 2 || (B.m === 2 && B.d === 29))) return 366;
    return 365;
  }
  let total = 0; let count = 0;
  for (let y = A.y; y <= B.y; y++) { total += isLeap(y) ? 366 : 365; count++; }
  return total / count;
}

function dayBasis(a, b, basis) {
  switch (basis) {
    case 0: return { days: days30(a, b, false), year: 360 };
    case 1: return { days: b - a, year: yearLengthActual(a, b) };
    case 2: return { days: b - a, year: 360 };
    case 3: return { days: b - a, year: 365 };
    case 4: return { days: days30(a, b, true), year: 360 };
    default: return null;
  }
}

/**
 * PRICEMAT/YIELDMAT: Excel dùng MỘT độ dài năm cho mọi khoảng khi basis = 1:
 * lấy theo khoảng (ngày phát hành, ngày thanh toán). Các basis khác như dayBasis().
 */
function maturityDayBasis(a, b, issue, settle, basis) {
  const base = dayBasis(a, b, basis);
  if (basis === 1) return { days: base.days, year: yearLengthActual(issue, settle) };
  return base;
}

function basisArg(engine, arg) {
  if (arg === undefined) return 0;
  const v = num(engine, arg); if (isErr(v)) return v;
  const b = Math.trunc(v);
  return b >= 0 && b <= 4 ? b : "#NUM!";
}

function twoDates(engine, args) {
  const s = dateArg(engine, args[0]); if (isErr(s)) return { error: s };
  const m = dateArg(engine, args[1]); if (isErr(m)) return { error: m };
  return { s: Math.floor(s), m: Math.floor(m) };
}

const flat = (engine, arg) => engine._rangeMatrix(arg).flat();

export const FINANCIAL_FUNCTIONS = {
  CUMIPMT(engine, args) { return cumulative(engine, args, false); },
  CUMPRINC(engine, args) { return cumulative(engine, args, true); },
  DDB(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const t = numbers(engine, args); if (t.error) return t.error;
    const [cost, salvage, life, periodRaw, factorRaw] = t.values;
    const factor = factorRaw === undefined ? 2 : factorRaw;
    if (cost < 0 || salvage < 0 || life <= 0 || periodRaw <= 0 || periodRaw > life || factor <= 0) return "#NUM!";
    return ddbPeriod(cost, salvage, life, Math.ceil(periodRaw), factor);
  },
  EFFECT(engine, args) {
    const t = numbers(engine, args.length === 2 ? args : []); if (t.error) return t.error; if (args.length !== 2) return "#VALUE!";
    const rate = t.values[0]; const n = Math.trunc(t.values[1]);
    if (rate <= 0 || n < 1) return "#NUM!";
    return (1 + rate / n) ** n - 1;
  },
  NOMINAL(engine, args) {
    const t = numbers(engine, args.length === 2 ? args : []); if (t.error) return t.error; if (args.length !== 2) return "#VALUE!";
    const eff = t.values[0]; const n = Math.trunc(t.values[1]);
    if (eff <= 0 || n < 1) return "#NUM!";
    return n * ((1 + eff) ** (1 / n) - 1);
  },
  FVSCHEDULE(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const principal = num(engine, args[0]); if (isErr(principal)) return principal;
    const rates = flat(engine, args[1]);
    const err = rates.find(isErr); if (err) return err;
    let result = principal;
    for (const r of rates) {
      const v = typeof r === "number" ? r : engine._parseNumberOrCurrency?.(r);
      if (typeof v !== "number" || !Number.isFinite(v)) { if (r === "" || r === null) continue; return "#VALUE!"; }
      result *= 1 + v;
    }
    return result;
  },
  ISPMT(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const t = numbers(engine, args); if (t.error) return t.error;
    const [rate, per, nper, pv] = t.values;
    if (nper === 0) return "#DIV/0!";
    return pv * rate * (per / nper - 1);
  },
  MIRR(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const values = flat(engine, args[0]).filter(v => v !== "" && v !== null && !(v && v.isTextCell)).map(v => (typeof v === "number" ? v : engine._parseNumberOrCurrency?.(v))).filter(v => typeof v === "number");
    const fr = num(engine, args[1]); if (isErr(fr)) return fr;
    const rr = num(engine, args[2]); if (isErr(rr)) return rr;
    const n = values.length;
    if (n < 2 || !values.some(v => v > 0) || !values.some(v => v < 0)) return "#DIV/0!";
    const npv = (rate, list) => list.reduce((s, v, i) => s + v / (1 + rate) ** (i + 1), 0);
    const pos = values.map(v => (v > 0 ? v : 0)); const neg = values.map(v => (v < 0 ? v : 0));
    const fvPos = -npv(rr, pos) * (1 + rr) ** n;
    const pvNeg = npv(fr, neg) * (1 + fr);
    return (fvPos / pvNeg) ** (1 / (n - 1)) - 1;
  },
  PDURATION(engine, args) {
    const t = numbers(engine, args.length === 3 ? args : []); if (t.error) return t.error; if (args.length !== 3) return "#VALUE!";
    const [rate, pv, fv] = t.values;
    if (rate <= 0 || pv <= 0 || fv <= 0) return "#NUM!";
    return (Math.log(fv) - Math.log(pv)) / Math.log(1 + rate);
  },
  RRI(engine, args) {
    const t = numbers(engine, args.length === 3 ? args : []); if (t.error) return t.error; if (args.length !== 3) return "#VALUE!";
    const [nper, pv, fv] = t.values;
    if (nper <= 0) return "#NUM!";
    if (pv === 0) return "#NUM!";
    const rri = (fv / pv) ** (1 / nper) - 1;
    return Number.isFinite(rri) ? rri : "#NUM!";
  },
  SYD(engine, args) {
    const t = numbers(engine, args.length === 4 ? args : []); if (t.error) return t.error; if (args.length !== 4) return "#VALUE!";
    const [cost, salvage, life, per] = t.values;
    if (life <= 0 || per <= 0 || per > life || salvage < 0 || cost < 0) return "#NUM!";
    return (cost - salvage) * (life - per + 1) * 2 / (life * (life + 1));
  },
  VDB(engine, args) {
    if (args.length < 5 || args.length > 7) return "#VALUE!";
    const t = numbers(engine, args.slice(0, 6)); if (t.error) return t.error;
    const [cost, salvage, life, start, end, factorRaw] = t.values;
    const factor = factorRaw === undefined ? 2 : factorRaw;
    let noSwitch = false;
    if (args[6] !== undefined) { const v = scalar(engine, args[6]); if (isErr(v)) return v; noSwitch = typeof v === "boolean" ? v : Number(v) !== 0; }
    if (cost < 0 || salvage < 0 || life <= 0 || start < 0 || end < start || end > life || factor <= 0) return "#NUM!";
    return vdb(cost, salvage, life, start, end, factor, noSwitch);
  },
  XNPV(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const rate = num(engine, args[0]); if (isErr(rate)) return rate;
    const values = flat(engine, args[1]); const dates = flat(engine, args[2]);
    if (values.length !== dates.length) return "#NUM!";
    if (rate <= 0) return "#NUM!";
    const cash = []; const when = [];
    for (let i = 0; i < values.length; i++) {
      const v = typeof values[i] === "number" ? values[i] : engine._parseNumberOrCurrency?.(values[i]);
      const d = typeof dates[i] === "number" ? dates[i] : engine._parseNumberOrCurrency?.(dates[i]);
      if (typeof v !== "number" || typeof d !== "number") return "#VALUE!";
      cash.push(v); when.push(Math.floor(d));
    }
    if (when.some(d => d < when[0])) return "#NUM!";
    return cash.reduce((s, v, i) => s + v / (1 + rate) ** ((when[i] - when[0]) / 365), 0);
  },
  XIRR(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const values = flat(engine, args[0]); const dates = flat(engine, args[1]);
    if (values.length !== dates.length) return "#NUM!";
    const guess = args[2] === undefined ? 0.1 : num(engine, args[2]); if (isErr(guess)) return guess;
    const cash = []; const when = [];
    for (let i = 0; i < values.length; i++) {
      const v = typeof values[i] === "number" ? values[i] : engine._parseNumberOrCurrency?.(values[i]);
      const d = typeof dates[i] === "number" ? dates[i] : engine._parseNumberOrCurrency?.(dates[i]);
      if (typeof v !== "number" || typeof d !== "number") return "#VALUE!";
      cash.push(v); when.push(Math.floor(d));
    }
    if (!cash.some(v => v > 0) || !cash.some(v => v < 0)) return "#NUM!";
    if (when.some(d => d < when[0])) return "#NUM!";
    const f = r => cash.reduce((s, v, i) => s + v / (1 + r) ** ((when[i] - when[0]) / 365), 0);
    const df = r => cash.reduce((s, v, i) => s - ((when[i] - when[0]) / 365) * v / (1 + r) ** ((when[i] - when[0]) / 365 + 1), 0);
    let r = guess;
    for (let i = 0; i < 200; i++) {
      const fv = f(r); const d = df(r);
      if (!Number.isFinite(fv) || !Number.isFinite(d) || d === 0) break;
      const next = r - fv / d;
      if (next <= -1) { r = (r - 1) / 2 + 0; continue; }
      if (Math.abs(next - r) < 1e-12) return next;
      r = next;
    }
    // Dự phòng: chia đôi
    let lo = -0.999999; let hi = 10;
    let flo = f(lo); const fhi = f(hi);
    if (flo * fhi > 0) return "#NUM!";
    for (let i = 0; i < 300; i++) { const mid = (lo + hi) / 2; const fm = f(mid); if (fm * flo < 0) hi = mid; else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  },
  DOLLARDE(engine, args) {
    const t = numbers(engine, args.length === 2 ? args : []); if (t.error) return t.error; if (args.length !== 2) return "#VALUE!";
    const [price, fractionRaw] = t.values; const fraction = Math.trunc(fractionRaw);
    if (fraction < 0) return "#NUM!"; if (fraction === 0) return "#DIV/0!";
    const integer = Math.trunc(price); const frac = Math.abs(price - integer);
    const digits = Math.ceil(Math.log10(fraction));
    return integer + Math.sign(price || 1) * (frac * 10 ** digits) / fraction;
  },
  DOLLARFR(engine, args) {
    const t = numbers(engine, args.length === 2 ? args : []); if (t.error) return t.error; if (args.length !== 2) return "#VALUE!";
    const [price, fractionRaw] = t.values; const fraction = Math.trunc(fractionRaw);
    if (fraction < 0) return "#NUM!"; if (fraction === 0) return "#DIV/0!";
    const integer = Math.trunc(price); const frac = Math.abs(price - integer);
    const digits = Math.ceil(Math.log10(fraction));
    return integer + Math.sign(price || 1) * (frac * fraction) / 10 ** digits;
  },
  DISC(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const pr = num(engine, args[2]); if (isErr(pr)) return pr;
    const red = num(engine, args[3]); if (isErr(red)) return red;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || pr <= 0 || red <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return (red - pr) / red * c.year / c.days;
  },
  INTRATE(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const inv = num(engine, args[2]); if (isErr(inv)) return inv;
    const red = num(engine, args[3]); if (isErr(red)) return red;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || inv <= 0 || red <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return (red - inv) / inv * c.year / c.days;
  },
  RECEIVED(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const inv = num(engine, args[2]); if (isErr(inv)) return inv;
    const disc = num(engine, args[3]); if (isErr(disc)) return disc;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || inv <= 0 || disc <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return inv / (1 - disc * c.days / c.year);
  },
  PRICEDISC(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const disc = num(engine, args[2]); if (isErr(disc)) return disc;
    const red = num(engine, args[3]); if (isErr(red)) return red;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || disc <= 0 || red <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return red - disc * red * c.days / c.year;
  },
  YIELDDISC(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const pr = num(engine, args[2]); if (isErr(pr)) return pr;
    const red = num(engine, args[3]); if (isErr(red)) return red;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || pr <= 0 || red <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return (red - pr) / pr * c.year / c.days;
  },
  TBILLPRICE(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const disc = num(engine, args[2]); if (isErr(disc)) return disc;
    const dsm = d.m - d.s;
    if (d.s >= d.m || disc <= 0 || dsm > 365) return "#NUM!";
    return 100 * (1 - disc * dsm / 360);
  },
  TBILLYIELD(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const pr = num(engine, args[2]); if (isErr(pr)) return pr;
    const dsm = d.m - d.s;
    if (d.s >= d.m || pr <= 0 || dsm > 365) return "#NUM!";
    return (100 - pr) / pr * 360 / dsm;
  },
  TBILLEQ(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const disc = num(engine, args[2]); if (isErr(disc)) return disc;
    const dsm = d.m - d.s;
    if (d.s >= d.m || disc <= 0 || dsm > 365) return "#NUM!";
    if (dsm <= 182) return 365 * disc / (360 - disc * dsm);
    const price = (100 - disc * 100 * dsm / 360) / 100;
    const a = dsm / 365 - 0.5;
    const radicand = (dsm / 365) ** 2 - (2 * dsm / 365 - 1) * (1 - 1 / price);
    if (radicand < 0) return "#NUM!";
    return (-dsm / 365 + Math.sqrt(radicand)) / (dsm / 365 - 0.5);
  },
  ACCRINTM(engine, args) {
    if (args.length < 4 || args.length > 5) return "#VALUE!";
    const d = twoDates(engine, args); if (d.error) return d.error;
    const rate = num(engine, args[2]); if (isErr(rate)) return rate;
    const par = args[3] === undefined ? 1000 : num(engine, args[3]); if (isErr(par)) return par;
    const basis = basisArg(engine, args[4]); if (isErr(basis)) return basis;
    if (d.s >= d.m || rate <= 0 || par <= 0) return "#NUM!";
    const c = dayBasis(d.s, d.m, basis);
    return par * rate * c.days / c.year;
  },
  PRICEMAT(engine, args) {
    if (args.length < 5 || args.length > 6) return "#VALUE!";
    const settle = dateArg(engine, args[0]); if (isErr(settle)) return settle;
    const mat = dateArg(engine, args[1]); if (isErr(mat)) return mat;
    const issue = dateArg(engine, args[2]); if (isErr(issue)) return issue;
    const rate = num(engine, args[3]); if (isErr(rate)) return rate;
    const yld = num(engine, args[4]); if (isErr(yld)) return yld;
    const basis = basisArg(engine, args[5]); if (isErr(basis)) return basis;
    const s = Math.floor(settle); const m = Math.floor(mat); const i = Math.floor(issue);
    if (s >= m || i > s || rate < 0 || yld < 0) return "#NUM!";
    const im = maturityDayBasis(i, m, i, s, basis); const is = maturityDayBasis(i, s, i, s, basis); const sm = maturityDayBasis(s, m, i, s, basis);
    return (100 + im.days / im.year * rate * 100) / (1 + sm.days / sm.year * yld) - is.days / is.year * rate * 100;
  },
  YIELDMAT(engine, args) {
    if (args.length < 5 || args.length > 6) return "#VALUE!";
    const settle = dateArg(engine, args[0]); if (isErr(settle)) return settle;
    const mat = dateArg(engine, args[1]); if (isErr(mat)) return mat;
    const issue = dateArg(engine, args[2]); if (isErr(issue)) return issue;
    const rate = num(engine, args[3]); if (isErr(rate)) return rate;
    const pr = num(engine, args[4]); if (isErr(pr)) return pr;
    const basis = basisArg(engine, args[5]); if (isErr(basis)) return basis;
    const s = Math.floor(settle); const m = Math.floor(mat); const i = Math.floor(issue);
    if (s >= m || i > s || rate < 0 || pr <= 0) return "#NUM!";
    const im = maturityDayBasis(i, m, i, s, basis); const is = maturityDayBasis(i, s, i, s, basis); const sm = maturityDayBasis(s, m, i, s, basis);
    const left = (1 + im.days / im.year * rate) - (pr / 100 + is.days / is.year * rate);
    return left / (pr / 100 + is.days / is.year * rate) * sm.year / sm.days;
  }
};

function cumulative(engine, args, principal) {
  if (args.length !== 6) return "#VALUE!";
  const t = numbers(engine, args); if (t.error) return t.error;
  const [rate, nper, pv, startRaw, endRaw, typeRaw] = t.values;
  const start = Math.trunc(startRaw); const end = Math.trunc(endRaw); const type = Math.trunc(typeRaw);
  const n = Math.trunc(nper);
  if (rate <= 0 || n <= 0 || pv <= 0 || start < 1 || end < start || end > n || (type !== 0 && type !== 1)) return "#NUM!";
  let total = 0;
  for (let per = start; per <= end; per++) {
    const call = name => engine._executeFunction(name, [String(rate), String(per), String(n), String(pv), "0", String(type)]);
    const interest = call("IPMT");
    if (isErr(interest)) return interest;
    if (principal) {
      const payment = engine._executeFunction("PMT", [String(rate), String(n), String(pv), "0", String(type)]);
      if (isErr(payment)) return payment;
      total += payment - interest;
    } else total += interest;
  }
  return total;
}

/** Khấu hao số dư giảm dần cho một kỳ nguyên (dạng đóng). */
function ddbClosed(cost, salvage, life, period, factor) {
  let rate = factor / life;
  let oldValue;
  if (rate >= 1) { rate = 1; oldValue = period === 1 ? cost : 0; } else oldValue = cost * (1 - rate) ** (period - 1);
  const newValue = cost * (1 - rate) ** period;
  const ddb = newValue < salvage ? oldValue - salvage : oldValue - newValue;
  return ddb < 0 ? 0 : ddb;
}

function ddbPeriod(cost, salvage, life, period, factor) { return ddbClosed(cost, salvage, life, period, factor); }

function vdbCore(cost, salvage, life, life1, period, factor) {
  const intEnd = Math.ceil(period);
  let result = 0; let straightLine = 0; let remaining = cost - salvage; let switched = false;
  for (let i = 1; i <= intEnd; i++) {
    let term;
    if (!switched) {
      const declining = ddbClosed(cost, salvage, life, i, factor);
      straightLine = remaining / (life1 - (i - 1));
      if (straightLine > declining) { term = straightLine; switched = true; } else { term = declining; remaining -= declining; }
    } else term = straightLine;
    if (i === intEnd) term *= period + 1 - intEnd;
    result += term;
  }
  return result;
}

function vdb(cost, salvage, life, start, end, factor, noSwitch) {
  const intStart = Math.floor(start);
  const intEnd = Math.ceil(end);
  let total = 0;
  if (noSwitch) {
    for (let i = intStart + 1; i <= intEnd; i++) {
      let term = ddbClosed(cost, salvage, life, i, factor);
      if (i === intStart + 1) term *= Math.min(end, intStart + 1) - start;
      else if (i === intEnd) term *= end + 1 - intEnd;
      total += term;
    }
    return total;
  }
  let life1 = life;
  let s = start; let e = end;
  if (Math.abs(s - Math.floor(s)) > 1e-12 && factor > 1 && s >= life / 2) {
    const part = s - life / 2;
    s = life / 2; e -= part; life1 += 1;
  }
  const costAfter = cost - vdbCore(cost, salvage, life, life1, s, factor);
  return vdbCore(costAfter, salvage, life, life - s, e - s, factor);
}
