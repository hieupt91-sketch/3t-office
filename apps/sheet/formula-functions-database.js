/**
 * Hàm cơ sở dữ liệu D* (EXCEL-E1c). Đối chiếu Excel 2016: tests/functions/cases-batch8-database.json.
 */
import { isErr, scalar } from "./formula-function-helpers.js";

const blank = v => v === null || v === undefined || v === "";

function matchCell(engine, value, criterion) {
  if (blank(criterion)) return true;
  if (typeof criterion === "number" || typeof criterion === "boolean") return engine._equals(value, criterion);
  const text = String(criterion);
  if (/^(<=|>=|<>|!=|=|<|>)/.test(text)) {
    if (text === "=") return blank(value);
    if (/^(<>|!=)$/.test(text)) return !blank(value);
    return engine._matchesCriteria(value, text);
  }
  // Văn bản trần: khớp phần đầu (không phân biệt hoa thường), có hỗ trợ ? và *
  const escaped = text.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}`, "i").test(String(value ?? ""));
}

function select(engine, args) {
  if (args.length !== 3) return { error: "#VALUE!" };
  const db = engine._rangeMatrix(args[0]);
  const crit = engine._rangeMatrix(args[2]);
  if (!db || db.length < 1 || !crit || crit.length < 1) return { error: "#VALUE!" };
  const headers = db[0].map(h => String(h ?? "").toLowerCase());
  const fieldValue = scalar(engine, args[1]);
  if (isErr(fieldValue)) return { error: fieldValue };
  let column;
  if (typeof fieldValue === "number") {
    column = Math.trunc(fieldValue) - 1;
  } else {
    column = headers.indexOf(String(fieldValue ?? "").toLowerCase());
  }
  if (column < 0 || column >= headers.length || fieldValue === "" || fieldValue === null) return { error: "#VALUE!" };
  const critHeaders = crit[0].map(h => String(h ?? "").toLowerCase());
  const rows = [];
  for (let r = 1; r < db.length; r++) {
    let any = crit.length === 1; // không có dòng điều kiện: khớp tất cả
    for (let c = 1; c < crit.length && !any; c++) {
      let all = true; let used = false;
      for (let k = 0; k < critHeaders.length; k++) {
        const criterion = crit[c][k];
        if (blank(criterion)) continue;
        used = true;
        const dbCol = headers.indexOf(critHeaders[k]);
        if (dbCol < 0) { all = false; break; }
        if (!matchCell(engine, db[r][dbCol], criterion)) { all = false; break; }
      }
      if (all) any = true;
      void used;
    }
    if (any) rows.push(db[r][column]);
  }
  return { values: rows };
}

const numeric = values => values.filter(v => typeof v === "number" && Number.isFinite(v));

function dfn(fn) {
  return (engine, args) => {
    const s = select(engine, args); if (s.error) return s.error;
    for (const v of s.values) if (isErr(v)) return v;
    return fn(s.values, numeric(s.values));
  };
}

const variance = (xs, population) => {
  const n = xs.length; if (n < (population ? 1 : 2)) return "#DIV/0!";
  const m = xs.reduce((a, b) => a + b, 0) / n;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (population ? n : n - 1);
};

export const DATABASE_FUNCTIONS = {
  DSUM: dfn((_, n) => n.reduce((a, b) => a + b, 0)),
  DAVERAGE: dfn((_, n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : "#DIV/0!")),
  DCOUNT: dfn((_, n) => n.length),
  DCOUNTA: dfn(v => v.filter(x => !blank(x)).length),
  DMAX: dfn((_, n) => (n.length ? Math.max(...n) : 0)),
  DMIN: dfn((_, n) => (n.length ? Math.min(...n) : 0)),
  DPRODUCT: dfn((_, n) => (n.length ? n.reduce((a, b) => a * b, 1) : 0)),
  DGET: dfn(v => (v.length === 0 ? "#VALUE!" : v.length > 1 ? "#NUM!" : (blank(v[0]) ? 0 : v[0]))),
  DVAR: dfn((_, n) => variance(n, false)),
  DVARP: dfn((_, n) => variance(n, true)),
  DSTDEV: dfn((_, n) => { const v = variance(n, false); return typeof v === "number" ? Math.sqrt(v) : v; }),
  DSTDEVP: dfn((_, n) => { const v = variance(n, true); return typeof v === "number" ? Math.sqrt(v) : v; })
};
