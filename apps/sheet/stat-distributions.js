/**
 * Toán thống kê thuần (không DOM) cho các hàm phân phối của VN Sheet.
 * Độ chính xác mục tiêu ~1e-13 để khớp Excel 2016 trong dung sai tương đối 1e-9.
 */

const EPS = 1e-16;
const MAX_ITER = 1000;

// ---------- Hàm gamma / beta ----------
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

export function lnGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function lnBeta(a, b) { return lnGamma(a) + lnGamma(b) - lnGamma(a + b); }

/** Hàm gamma chính quy dưới P(a, x). */
export function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a; let term = sum; let n = a;
    for (let i = 0; i < MAX_ITER; i++) { n += 1; term *= x / n; sum += term; if (Math.abs(term) < Math.abs(sum) * EPS) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  return 1 - gammaQcf(a, x);
}

export function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaP(a, x);
  return gammaQcf(a, x);
}

function gammaQcf(a, x) {
  const tiny = 1e-300;
  let b = x + 1 - a; let c = 1 / tiny; let d = 1 / b; let h = d;
  for (let i = 1; i < MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Hàm beta chính quy không đầy đủ I_x(a, b). */
export function betaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta(a, b));
  if (x < (a + 1) / (a + b + 2)) return front * betaCf(x, a, b) / a;
  return 1 - front * betaCf(1 - x, b, a) / b;
}

function betaCf(x, a, b) {
  const tiny = 1e-300;
  let c = 1; let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h;
}

// ---------- Chuẩn ----------
export function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x === 0) return 1;
  return gammaQ(0.5, x * x);
}
export function erf(x) { return x < 0 ? -(1 - erfc(-x)) : 1 - erfc(x); }
export function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
export function normPdf(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }

export function normInv(p) {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const low = 0.02425;
  let x;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - low) {
    const q = p - 0.5; const r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  for (let i = 0; i < 3; i++) {
    const e = normCdf(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    x -= u / (1 + x * u / 2);
  }
  return x;
}

// ---------- Nghịch đảo tổng quát (bracket + bisection/secant trên CDF tăng) ----------
export function invertIncreasing(cdf, target, lo, hi, { tolerance = 1e-14, maxIter = 400 } = {}) {
  let a = lo; let b = hi;
  let fa = cdf(a) - target; let fb = cdf(b) - target;
  let guard = 0;
  while (fa > 0 && guard++ < 200) { b = a; fb = fa; a = a > 0 ? a / 2 : a * 2 - 1; fa = cdf(a) - target; }
  guard = 0;
  while (fb < 0 && guard++ < 200) { a = b; fa = fb; b = b > 0 ? b * 2 : b / 2 + 1; fb = cdf(b) - target; }
  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const fm = cdf(mid) - target;
    if (fm === 0 || Math.abs(b - a) < tolerance * Math.max(1, Math.abs(mid))) return mid;
    if (fm < 0) { a = mid; fa = fm; } else { b = mid; fb = fm; }
  }
  return (a + b) / 2;
}

// ---------- Phân phối liên tục ----------
export const gammaCdf = (x, alpha, beta) => (x <= 0 ? 0 : gammaP(alpha, x / beta));
export const gammaPdf = (x, alpha, beta) => (x < 0 ? 0 : Math.exp((alpha - 1) * Math.log(x) - x / beta - lnGamma(alpha) - alpha * Math.log(beta)));
export const betaCdf = (x, alpha, beta, A = 0, B = 1) => betaI((x - A) / (B - A), alpha, beta);
export const betaPdf = (x, alpha, beta, A = 0, B = 1) => {
  const t = (x - A) / (B - A);
  if (t <= 0 || t >= 1) return 0;
  return Math.exp((alpha - 1) * Math.log(t) + (beta - 1) * Math.log(1 - t) - lnBeta(alpha, beta)) / (B - A);
};
export const chisqCdf = (x, df) => gammaCdf(x, df / 2, 2);
export const chisqPdf = (x, df) => gammaPdf(x, df / 2, 2);
export const tCdf = (t, df) => {
  const x = df / (df + t * t);
  const tail = 0.5 * betaI(x, df / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
};
export const tPdf = (t, df) => Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
export const fCdf = (x, d1, d2) => (x <= 0 ? 0 : betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2));
export const fPdf = (x, d1, d2) => (x < 0 ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - lnBeta(d1 / 2, d2 / 2)));

// ---------- Phân phối rời rạc ----------
export const lnChoose = (n, k) => lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
export const binomPmf = (k, n, p) => {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lnChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
};
export const binomCdf = (k, n, p) => {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += binomPmf(i, n, p);
  return Math.min(1, sum);
};
export const poissonPmf = (k, lambda) => Math.exp(-lambda + k * Math.log(lambda) - lnGamma(k + 1));
export const poissonCdf = (k, lambda) => (k < 0 ? 0 : gammaQ(k + 1, lambda));
