/**
 * Hàm kỹ thuật bổ sung (EXCEL-E1c): đổi cơ số, bit, số phức, CONVERT, erf, Bessel.
 * Đối chiếu Excel 2016: tests/functions/cases-batch6-engineering.json.
 */
import { isErr, scalar, num } from "./formula-function-helpers.js";
import * as D from "./stat-distributions.js";

// ---------- Đổi cơ số ----------
const RADIX = { BIN: 2, OCT: 8, HEX: 16, DEC: 10 };
const BITS = { 2: 10, 8: 30, 16: 40 };
const DIGITS = "0123456789ABCDEF";

function parseRadix(text, radix) {
  let s = String(text ?? "").trim();
  if (radix === 10) return null;
  if (s === "") return 0;
  const pattern = radix === 2 ? /^[01]{1,10}$/ : radix === 8 ? /^[0-7]{1,10}$/ : /^[0-9A-Fa-f]{1,10}$/;
  if (!pattern.test(s)) return NaN;
  const bits = BITS[radix];
  const value = parseInt(s, radix);
  const limit = 2 ** bits;
  return value >= limit / 2 ? value - limit : value;
}

function formatRadix(value, radix, places) {
  const bits = BITS[radix];
  const limit = 2 ** bits;
  if (value < -limit / 2 || value >= limit / 2) return "#NUM!";
  if (value < 0) return (value + limit).toString(radix).toUpperCase().padStart(10, radix === 2 ? "1" : (radix === 8 ? "7" : "F"));
  const text = value.toString(radix).toUpperCase();
  if (places === undefined) return text;
  if (places < 1 || places > 10 || text.length > places) return "#NUM!";
  return text.padStart(places, "0");
}

function convertBase(from, to) {
  return (engine, args) => {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    let value;
    const raw = scalar(engine, args[0]);
    if (isErr(raw)) return raw;
    if (from === 10) {
      const n = num(engine, args[0]); if (isErr(n)) return n;
      value = Math.trunc(n);
    } else {
      const text = typeof raw === "number" ? String(raw) : String(raw ?? "");
      value = parseRadix(text, from);
      if (Number.isNaN(value)) return "#NUM!";
    }
    let places;
    if (args[1] !== undefined) { const p = num(engine, args[1]); if (isErr(p)) return p; places = Math.trunc(p); if (places < 0) return "#NUM!"; if (places === 0 && value >= 0) return "#NUM!"; }
    if (to === 10) return value;
    return formatRadix(value, to, places);
  };
}

const bitOperand = (engine, arg) => {
  const n = num(engine, arg); if (isErr(n)) return n;
  if (n < 0 || n !== Math.trunc(n) || n >= 2 ** 48) return "#NUM!";
  return n;
};
const bitOp = fn => (engine, args) => {
  if (args.length !== 2) return "#VALUE!";
  const a = bitOperand(engine, args[0]); if (isErr(a)) return a;
  const b = bitOperand(engine, args[1]); if (isErr(b)) return b;
  return fn(BigInt(a), BigInt(b));
};
const toNum = big => Number(big);

// ---------- Số phức ----------
function parseComplex(text) {
  const s = String(text ?? "").replace(/\s+/g, "");
  if (s === "") return { re: 0, im: 0, suffix: "i" };
  if (typeof text === "number") return { re: text, im: 0, suffix: "i" };
  const match = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)?(?:([+-])((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)?([ij]))?$/);
  if (match && (match[1] !== undefined || match[2] !== undefined)) {
    const re = match[1] !== undefined ? Number(match[1]) : 0;
    if (match[2] === undefined) return { re, im: 0, suffix: "i" };
    const mag = match[3] === undefined ? 1 : Number(match[3]);
    return { re, im: match[2] === "-" ? -mag : mag, suffix: match[4] };
  }
  const pureImag = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)?([ij])$/);
  if (pureImag) return { re: 0, im: pureImag[1] === undefined ? 1 : (pureImag[1] === "+" ? 1 : pureImag[1] === "-" ? -1 : Number(pureImag[1])), suffix: pureImag[2] };
  const signedI = s.match(/^([+-])([ij])$/);
  if (signedI) return { re: 0, im: signedI[1] === "-" ? -1 : 1, suffix: signedI[2] };
  return null;
}

const trim15 = x => {
  if (x === 0 || Object.is(x, -0)) return "0";
  let text = Number(x).toPrecision(15);
  if (text.includes("e")) {
    let [m, e] = text.split("e");
    if (m.includes(".")) m = m.replace(/0+$/, "").replace(/\.$/, "");
    const sign = e.startsWith("-") ? "-" : "+";
    const digits = e.replace(/^[+-]/, "").padStart(2, "0");
    return `${m}E${sign}${digits}`;
  }
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  return text;
};

function formatComplex(re, im, suffix = "i") {
  if (!Number.isFinite(re) || !Number.isFinite(im)) return "#NUM!";
  const r = Number(re.toPrecision(15)); const m = Number(im.toPrecision(15));
  if (m === 0) return trim15(r);
  const imText = m === 1 ? "" : (m === -1 ? "-" : trim15(m));
  const imPart = (m > 0 && r !== 0 ? "+" : "") + imText + suffix;
  if (r === 0) return imPart.replace(/^\+/, "");
  return trim15(r) + imPart;
}

const polar = z => ({ r: Math.hypot(z.re, z.im), t: Math.atan2(z.im, z.re) });
const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };
const cexp = z => ({ re: Math.exp(z.re) * Math.cos(z.im), im: Math.exp(z.re) * Math.sin(z.im) });
const clog = z => { const p = polar(z); return { re: Math.log(p.r), im: p.t }; };
const csin = z => ({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
const ccos = z => ({ re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) });
const csinh = z => ({ re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) });
const ccosh = z => ({ re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) });
const one = { re: 1, im: 0 };

function complexArg(engine, arg) {
  const v = scalar(engine, arg);
  if (isErr(v)) return { error: v };
  const z = parseComplex(v);
  return z ? z : { error: "#NUM!" };
}

function complexUnary(fn, { zeroError = false } = {}) {
  return (engine, args) => {
    if (args.length !== 1) return "#VALUE!";
    const z = complexArg(engine, args[0]); if (z.error) return z.error;
    const out = fn(z);
    if (typeof out === "string") return out;
    if (typeof out === "number") return Number.isFinite(out) ? out : "#NUM!";
    return formatComplex(out.re, out.im, z.suffix);
  };
}

// ---------- CONVERT ----------
// Đơn vị: [nhóm, hệ số về đơn vị cơ sở của nhóm, cho phép tiền tố SI]
const UNITS = (() => {
  const u = {};
  const add = (group, base, name, factor, prefix = false, binary = false) => { u[name] = { group, factor, prefix, binary }; };
  // Khối lượng (g)
  add("mass", "g", "g", 1, true); add("mass", "g", "sg", 14593.90293720636); add("mass", "g", "lbm", 453.59237); add("mass", "g", "u", 1.66053100460465e-24, true); add("mass", "g", "ozm", 28.349523125);
  add("mass", "g", "grain", 0.06479891); add("mass", "g", "cwt", 45359.237); add("mass", "g", "shweight", 45359.237); add("mass", "g", "uk_cwt", 50802.34544); add("mass", "g", "lcwt", 50802.34544);
  add("mass", "g", "hweight", 50802.34544); add("mass", "g", "stone", 6350.29318); add("mass", "g", "ton", 907184.74); add("mass", "g", "uk_ton", 1016046.9088); add("mass", "g", "LTON", 1016046.9088); add("mass", "g", "brton", 1016046.9088);
  // Khoảng cách (m)
  add("distance", "m", "m", 1, true); add("distance", "m", "mi", 1609.344); add("distance", "m", "Nmi", 1852); add("distance", "m", "in", 0.0254); add("distance", "m", "ft", 0.3048); add("distance", "m", "yd", 0.9144);
  add("distance", "m", "ang", 1e-10, true); add("distance", "m", "ell", 1.143); add("distance", "m", "ly", 9.4607304725808e15); add("distance", "m", "parsec", 3.08567758128155e16); add("distance", "m", "pc", 3.08567758128155e16);
  add("distance", "m", "Pica", 0.0254 / 6); add("distance", "m", "pica", 0.0254 / 6); add("distance", "m", "survey_mi", 1609.3472186944373);
  // Thời gian (s)
  add("time", "s", "yr", 31557600); add("time", "s", "day", 86400); add("time", "s", "d", 86400); add("time", "s", "hr", 3600); add("time", "s", "mn", 60); add("time", "s", "min", 60); add("time", "s", "sec", 1, true); add("time", "s", "s", 1, true);
  // Áp suất (Pa)
  add("pressure", "Pa", "Pa", 1, true); add("pressure", "Pa", "p", 1, true); add("pressure", "Pa", "atm", 101325, true); add("pressure", "Pa", "at", 101325, true); add("pressure", "Pa", "mmHg", 133.322, true); add("pressure", "Pa", "Torr", 133.322368421053, true);
  // Lực (N)
  add("force", "N", "N", 1, true); add("force", "N", "dyn", 1e-5, true); add("force", "N", "dy", 1e-5, true); add("force", "N", "lbf", 4.4482216152605); add("force", "N", "pond", 0.00980665, true);
  // Năng lượng (J)
  add("energy", "J", "J", 1, true); add("energy", "J", "e", 1e-7, true); add("energy", "J", "c", 4.184, true); add("energy", "J", "cal", 4.1868, true); add("energy", "J", "eV", 1.602176487e-19, true); add("energy", "J", "ev", 1.602176487e-19, true);
  add("energy", "J", "HPh", 2684519.5368856); add("energy", "J", "hh", 2684519.5368856); add("energy", "J", "Wh", 3600, true); add("energy", "J", "wh", 3600, true); add("energy", "J", "flb", 1.3558179483314); add("energy", "J", "BTU", 1055.05585262); add("energy", "J", "btu", 1055.05585262);
  // Công suất (W)
  add("power", "W", "HP", 745.69987158227); add("power", "W", "h", 745.69987158227); add("power", "W", "PS", 735.49875); add("power", "W", "W", 1, true); add("power", "W", "w", 1, true);
  // Từ trường (T)
  add("magnetism", "T", "T", 1, true); add("magnetism", "T", "ga", 1e-4, true);
  // Thể tích (l)
  add("volume", "l", "l", 1, true); add("volume", "l", "L", 1, true); add("volume", "l", "lt", 1, true); add("volume", "l", "tsp", 0.00492892159375); add("volume", "l", "tspm", 0.005); add("volume", "l", "tbs", 0.01478676478125);
  add("volume", "l", "oz", 0.0295735295625); add("volume", "l", "cup", 0.2365882365); add("volume", "l", "pt", 0.473176473); add("volume", "l", "us_pt", 0.473176473); add("volume", "l", "uk_pt", 0.56826125);
  add("volume", "l", "qt", 0.946352946); add("volume", "l", "uk_qt", 1.1365225); add("volume", "l", "gal", 3.785411784); add("volume", "l", "uk_gal", 4.54609);
  add("volume", "l", "m3", 1000, true); add("volume", "l", "mi3", 4168181825.440579584e3); add("volume", "l", "Nmi3", 6352182208e3); add("volume", "l", "in3", 0.016387064); add("volume", "l", "ft3", 28.316846592); add("volume", "l", "yd3", 764.554857984);
  add("volume", "l", "ang3", 1e-27, true); add("volume", "l", "ly3", 8.46786664623715e50);
  // Diện tích (m2)
  add("area", "m2", "m2", 1, true); add("area", "m2", "ar", 100, true); add("area", "m2", "ha", 10000); add("area", "m2", "in2", 0.00064516); add("area", "m2", "ft2", 0.09290304); add("area", "m2", "yd2", 0.83612736);
  add("area", "m2", "mi2", 2589988.110336); add("area", "m2", "Nmi2", 3429904); add("area", "m2", "uk_acre", 4046.8564224); add("area", "m2", "us_acre", 4046.87260987425);
  // Thông tin
  add("information", "bit", "bit", 1, true, true); add("information", "bit", "byte", 8, true, true);
  // Tốc độ (m/s)
  add("speed", "m/s", "m/s", 1, true); add("speed", "m/s", "m/sec", 1, true); add("speed", "m/s", "m/h", 1 / 3600, true); add("speed", "m/s", "m/hr", 1 / 3600, true); add("speed", "m/s", "mph", 0.44704); add("speed", "m/s", "kn", 1852 / 3600); add("speed", "m/s", "admkn", 1852 / 3600);
  return u;
})();
const SI_PREFIX = { Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, e: 1e1, da: 1e1, d: 1e-1, c: 1e-2, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24 };
const BIN_PREFIX = { Yi: 2 ** 80, Zi: 2 ** 70, Ei: 2 ** 60, Pi: 2 ** 50, Ti: 2 ** 40, Gi: 2 ** 30, Mi: 2 ** 20, ki: 2 ** 10 };
const TEMP = { C: "C", cel: "C", F: "F", fah: "F", K: "K", kel: "K", Rank: "Rank", Reau: "Reau" };

function resolveUnit(name) {
  if (UNITS[name] && !(UNITS[name].group === "time" && false)) return { ...UNITS[name], multiplier: 1 };
  if (TEMP[name]) return { group: "temperature", temp: TEMP[name], multiplier: 1 };
  // tiền tố 2 ký tự (da, Yi...) rồi 1 ký tự
  for (const len of [2, 1]) {
    const prefix = name.slice(0, len); const rest = name.slice(len);
    if (!rest) continue;
    const unit = UNITS[rest];
    if (!unit || !unit.prefix) continue;
    if (len === 2 && BIN_PREFIX[prefix] && unit.binary) return { ...unit, multiplier: BIN_PREFIX[prefix] };
    if (SI_PREFIX[prefix] !== undefined) return { ...unit, multiplier: SI_PREFIX[prefix] };
    if (len === 1 && BIN_PREFIX[prefix + "i"] && false) return null;
  }
  const t = TEMP[name.slice(1)];
  if (t && SI_PREFIX[name[0]] !== undefined) return { group: "temperature", temp: t, multiplier: SI_PREFIX[name[0]] };
  return null;
}

function toKelvin(value, unit) {
  switch (unit) { case "C": return value + 273.15; case "F": return (value - 32) * 5 / 9 + 273.15; case "K": return value; case "Rank": return value * 5 / 9; case "Reau": return value * 5 / 4 + 273.15; default: return NaN; }
}
function fromKelvin(kelvin, unit) {
  switch (unit) { case "C": return kelvin - 273.15; case "F": return (kelvin - 273.15) * 9 / 5 + 32; case "K": return kelvin; case "Rank": return kelvin * 9 / 5; case "Reau": return (kelvin - 273.15) * 4 / 5; default: return NaN; }
}

// ---------- Bessel (xấp xỉ A&S; độ chính xác ~1e-8) ----------
function besselJ(x, n) {
  const ax = Math.abs(x);
  const series = () => {
    let sum = 0; let term = (ax / 2) ** n / factorial(n);
    for (let k = 0; k < 200; k++) {
      sum += term;
      term *= -((ax / 2) ** 2) / ((k + 1) * (k + 1 + n));
      if (Math.abs(term) < 1e-18 * Math.abs(sum) && k > 5) break;
    }
    return sum;
  };
  const v = series();
  return x < 0 && n % 2 === 1 ? -v : v;
}
function factorial(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function besselI(x, n) {
  const ax = Math.abs(x);
  let sum = 0; let term = (ax / 2) ** n / factorial(n);
  for (let k = 0; k < 300; k++) {
    sum += term;
    term *= (ax / 2) ** 2 / ((k + 1) * (k + 1 + n));
    if (Math.abs(term) < 1e-18 * Math.abs(sum) && k > 5) break;
  }
  return x < 0 && n % 2 === 1 ? -sum : sum;
}
function besselY0(x) {
  // Y0(x) = (2/π)(ln(x/2)+γ)J0(x) + series
  const gamma = 0.5772156649015329;
  let sum = 0; let term = 1; let harmonic = 0;
  for (let k = 1; k < 200; k++) {
    term *= -(x * x / 4) / (k * k); harmonic += 1 / k;
    sum += term * harmonic;
    if (Math.abs(term * harmonic) < 1e-18) break;
  }
  return (2 / Math.PI) * ((Math.log(x / 2) + gamma) * besselJ(x, 0) - sum);
}
function besselY1(x) {
  const gamma = 0.5772156649015329;
  let sum = 0; let term = (x / 2); let h0 = 0; let h1 = 1;
  sum += term * (h0 + h1 - 2 * gamma - 2 * Math.log(x / 2) + 0) * 0; // placeholder (không dùng)
  const j1 = besselJ(x, 1);
  let s = 0; let t = x / 2; let psi0 = -gamma; let psi1 = 1 - gamma;
  s += t * (psi0 + psi1);
  for (let k = 1; k < 200; k++) {
    t *= -(x * x / 4) / (k * (k + 1));
    psi0 += 1 / k; psi1 += 1 / (k + 1);
    s += t * (psi0 + psi1);
    if (Math.abs(t * (psi0 + psi1)) < 1e-18) break;
  }
  return (2 / Math.PI) * Math.log(x / 2) * j1 - (2 / Math.PI) * (1 / x) - (1 / Math.PI) * s;
}
function besselYn(x, n) {
  if (n === 0) return besselY0(x);
  if (n === 1) return besselY1(x);
  let prev = besselY0(x); let curr = besselY1(x);
  for (let k = 1; k < n; k++) { const next = (2 * k / x) * curr - prev; prev = curr; curr = next; }
  return curr;
}
function besselK0(x) {
  const gamma = 0.5772156649015329;
  let sum = 0; let term = 1; let harmonic = 0;
  for (let k = 1; k < 200; k++) { term *= (x * x / 4) / (k * k); harmonic += 1 / k; sum += term * harmonic; if (term * harmonic < 1e-18) break; }
  return -(Math.log(x / 2) + gamma) * besselI(x, 0) + sum;
}
function besselK1(x) {
  const gamma = 0.5772156649015329;
  let s = 0; let t = x / 2; let psi0 = -gamma; let psi1 = 1 - gamma;
  s += t * (psi0 + psi1);
  for (let k = 1; k < 200; k++) { t *= (x * x / 4) / (k * (k + 1)); psi0 += 1 / k; psi1 += 1 / (k + 1); s += t * (psi0 + psi1); if (Math.abs(t * (psi0 + psi1)) < 1e-18) break; }
  return (1 / x) + Math.log(x / 2) * besselI(x, 1) - 0.5 * s;
}
function besselKn(x, n) {
  if (n === 0) return besselK0(x);
  if (n === 1) return besselK1(x);
  let prev = besselK0(x); let curr = besselK1(x);
  for (let k = 1; k < n; k++) { const next = (2 * k / x) * curr + prev; prev = curr; curr = next; }
  return curr;
}
const bessel = fn => (engine, args) => {
  if (args.length !== 2) return "#VALUE!";
  const x = num(engine, args[0]); if (isErr(x)) return x;
  const nRaw = num(engine, args[1]); if (isErr(nRaw)) return nRaw;
  const n = Math.trunc(nRaw);
  if (n < 0) return "#NUM!";
  const out = fn(x, n);
  return Number.isFinite(out) ? out : "#NUM!";
};

export const ENGINEERING_FUNCTIONS = {
  BIN2DEC: convertBase(2, 10), BIN2HEX: convertBase(2, 16), BIN2OCT: convertBase(2, 8),
  OCT2BIN: convertBase(8, 2), OCT2DEC: convertBase(8, 10), OCT2HEX: convertBase(8, 16),
  HEX2BIN: convertBase(16, 2), HEX2DEC: convertBase(16, 10), HEX2OCT: convertBase(16, 8),
  DEC2BIN: convertBase(10, 2), DEC2OCT: convertBase(10, 8), DEC2HEX: convertBase(10, 16),
  BITAND: bitOp((a, b) => toNum(a & b)),
  BITOR: bitOp((a, b) => toNum(a | b)),
  BITXOR: bitOp((a, b) => toNum(a ^ b)),
  BITLSHIFT(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = bitOperand(engine, args[0]); if (isErr(a)) return a;
    const s = num(engine, args[1]); if (isErr(s)) return s;
    const shift = Math.trunc(s); if (Math.abs(shift) > 53) return "#NUM!";
    const result = shift >= 0 ? BigInt(a) << BigInt(shift) : BigInt(a) >> BigInt(-shift);
    return result >= 2n ** 48n ? "#NUM!" : Number(result);
  },
  BITRSHIFT(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = bitOperand(engine, args[0]); if (isErr(a)) return a;
    const s = num(engine, args[1]); if (isErr(s)) return s;
    const shift = Math.trunc(s); if (Math.abs(shift) > 53) return "#NUM!";
    const result = shift >= 0 ? BigInt(a) >> BigInt(shift) : BigInt(a) << BigInt(-shift);
    return result >= 2n ** 48n ? "#NUM!" : Number(result);
  },
  DELTA(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const a = num(engine, args[0]); if (isErr(a)) return a;
    const b = args[1] === undefined ? 0 : num(engine, args[1]); if (isErr(b)) return b;
    return a === b ? 1 : 0;
  },
  GESTEP(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const a = num(engine, args[0]); if (isErr(a)) return a;
    const b = args[1] === undefined ? 0 : num(engine, args[1]); if (isErr(b)) return b;
    return a >= b ? 1 : 0;
  },
  ERF(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const a = num(engine, args[0]); if (isErr(a)) return a;
    if (args[1] === undefined) return D.erf(a);
    const b = num(engine, args[1]); if (isErr(b)) return b;
    return D.erf(b) - D.erf(a);
  },
  "ERF.PRECISE"(engine, args) { if (args.length !== 1) return "#VALUE!"; const a = num(engine, args[0]); return isErr(a) ? a : D.erf(a); },
  ERFC(engine, args) { if (args.length !== 1) return "#VALUE!"; const a = num(engine, args[0]); if (isErr(a)) return a; return D.erfc(a); },
  "ERFC.PRECISE"(engine, args) { if (args.length !== 1) return "#VALUE!"; const a = num(engine, args[0]); return isErr(a) ? a : D.erfc(a); },

  COMPLEX(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const re = num(engine, args[0]); if (isErr(re)) return re;
    const im = num(engine, args[1]); if (isErr(im)) return im;
    const suffix = args[2] === undefined ? "i" : String(scalar(engine, args[2]) ?? "");
    if (suffix !== "i" && suffix !== "j") return "#VALUE!";
    return formatComplex(re, im, suffix);
  },
  IMREAL: complexUnary(z => z.re),
  IMAGINARY: complexUnary(z => z.im),
  IMABS: complexUnary(z => Math.hypot(z.re, z.im)),
  IMARGUMENT: complexUnary(z => (z.re === 0 && z.im === 0 ? "#DIV/0!" : Math.atan2(z.im, z.re))),
  IMCONJUGATE: complexUnary(z => ({ re: z.re, im: -z.im })),
  IMEXP: complexUnary(cexp),
  IMLN: complexUnary(z => (z.re === 0 && z.im === 0 ? "#NUM!" : clog(z))),
  IMLOG10: complexUnary(z => { if (z.re === 0 && z.im === 0) return "#NUM!"; const l = clog(z); return { re: l.re / Math.LN10, im: l.im / Math.LN10 }; }),
  IMLOG2: complexUnary(z => { if (z.re === 0 && z.im === 0) return "#NUM!"; const l = clog(z); return { re: l.re / Math.LN2, im: l.im / Math.LN2 }; }),
  IMSQRT: complexUnary(z => { const p = polar(z); const r = Math.sqrt(p.r); return { re: r * Math.cos(p.t / 2), im: r * Math.sin(p.t / 2) }; }),
  IMSIN: complexUnary(csin),
  IMCOS: complexUnary(ccos),
  IMTAN: complexUnary(z => { const d = ccos(z); if (d.re === 0 && d.im === 0) return "#NUM!"; return cdiv(csin(z), d); }),
  IMSINH: complexUnary(csinh),
  IMCOSH: complexUnary(ccosh),
  IMSEC: complexUnary(z => cdiv(one, ccos(z))),
  IMCSC: complexUnary(z => { const s = csin(z); if (s.re === 0 && s.im === 0) return "#NUM!"; return cdiv(one, s); }),
  IMCOT: complexUnary(z => { const s = csin(z); if (s.re === 0 && s.im === 0) return "#NUM!"; return cdiv(ccos(z), s); }),
  IMSECH: complexUnary(z => cdiv(one, ccosh(z))),
  IMCSCH: complexUnary(z => { const s = csinh(z); if (s.re === 0 && s.im === 0) return "#NUM!"; return cdiv(one, s); }),
  IMPOWER(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const z = complexArg(engine, args[0]); if (z.error) return z.error;
    const n = num(engine, args[1]); if (isErr(n)) return n;
    if (z.re === 0 && z.im === 0) return n > 0 ? "0" : "#NUM!";
    const p = polar(z); const r = p.r ** n;
    return formatComplex(r * Math.cos(n * p.t), r * Math.sin(n * p.t), z.suffix);
  },
  IMDIV(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = complexArg(engine, args[0]); if (a.error) return a.error;
    const b = complexArg(engine, args[1]); if (b.error) return b.error;
    if (b.re === 0 && b.im === 0) return "#NUM!";
    const q = cdiv(a, b);
    return formatComplex(q.re, q.im, a.suffix);
  },
  IMSUB(engine, args) {
    if (args.length !== 2) return "#VALUE!";
    const a = complexArg(engine, args[0]); if (a.error) return a.error;
    const b = complexArg(engine, args[1]); if (b.error) return b.error;
    return formatComplex(a.re - b.re, a.im - b.im, a.suffix);
  },
  IMSUM(engine, args) {
    if (!args.length) return "#VALUE!";
    let re = 0; let im = 0; let suffix = "i";
    for (const [index, arg] of args.entries()) { const z = complexArg(engine, arg); if (z.error) return z.error; re += z.re; im += z.im; if (index === 0) suffix = z.suffix; }
    return formatComplex(re, im, suffix);
  },
  IMPRODUCT(engine, args) {
    if (!args.length) return "#VALUE!";
    let acc = { re: 1, im: 0 }; let suffix = "i";
    for (const [index, arg] of args.entries()) { const z = complexArg(engine, arg); if (z.error) return z.error; acc = cmul(acc, z); if (index === 0) suffix = z.suffix; }
    return formatComplex(acc.re, acc.im, suffix);
  },

  CONVERT(engine, args) {
    if (args.length !== 3) return "#VALUE!";
    const value = num(engine, args[0]); if (isErr(value)) return value;
    const fromName = String(scalar(engine, args[1]) ?? ""); const toName = String(scalar(engine, args[2]) ?? "");
    const from = resolveUnit(fromName); const to = resolveUnit(toName);
    if (!from || !to || from.group !== to.group) return "#N/A";
    if (from.group === "temperature") {
      const kelvin = toKelvin(value * 1, from.temp);
      // tiền tố áp dụng lên giá trị đơn vị gốc (hiếm); xử lý cơ bản
      const k = from.multiplier === 1 ? kelvin : toKelvin(value * from.multiplier, from.temp);
      const out = fromKelvin(k, to.temp);
      return to.multiplier === 1 ? out : out / to.multiplier;
    }
    let result = value * from.factor * from.multiplier / (to.factor * to.multiplier);
    if (from.group === "volume" || from.group === "area") {
      // tiền tố trên đơn vị mũ (m3, m2, ang3...): hệ số tiền tố được lũy thừa
      const power = (/3$/.test(fromName.replace(/^[A-Za-z]{1,2}/, "")) || /3$/.test(fromName)) ? 3 : (/2$/.test(fromName) ? 2 : 1);
      const toPower = /3$/.test(toName) ? 3 : (/2$/.test(toName) ? 2 : 1);
      result = value * from.factor * from.multiplier ** power / (to.factor * to.multiplier ** toPower);
    }
    return result;
  },

  BESSELJ: bessel((x, n) => besselJ(x, n)),
  BESSELI: bessel((x, n) => besselI(x, n)),
  BESSELY: bessel((x, n) => (x <= 0 ? NaN : besselYn(x, n))),
  BESSELK: bessel((x, n) => (x <= 0 ? NaN : besselKn(x, n)))
};
