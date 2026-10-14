/**
 * Hàm văn bản / ngày / thông tin bổ sung (EXCEL-E1c). Đối chiếu Excel 2016: tests/functions/cases-batch4-*.json.
 */
import { isErr, scalar, num } from "./formula-function-helpers.js";

const DAY_MS = 86400000;
const EPOCH = Date.UTC(1899, 11, 30);

const serialToUtc = serial => EPOCH + Math.floor(serial) * DAY_MS;
const utcToSerial = utc => Math.round((utc - EPOCH) / DAY_MS);
const weekdayOf = serial => new Date(serialToUtc(serial)).getUTCDay(); // 0 = Chủ nhật

export function dateArg(engine, arg) {
  const value = scalar(engine, arg);
  if (isErr(value)) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const numeric = engine._parseNumberOrCurrency?.(value);
  if (typeof numeric === "number" && Number.isFinite(numeric)) return numeric;
  const date = engine._parseDate?.(value);
  return date ? engine._dateToSerial(date) : "#VALUE!";
}

/** Chuỗi ngày/giờ bất kỳ -> số serial (d/m/yyyy, yyyy-mm-dd, "5 March 2024", kèm giờ). */
function parseDateTimeText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const pickTime = value => {
    const match = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*(AM|PM|SA|CH)?$/i);
    if (!match) return { time: 0, rest: value };
    let h = Number(match[1]); const m = Number(match[2]); const s = Number(match[3] || 0);
    const mer = (match[4] || "").toUpperCase();
    if (mer === "PM" || mer === "CH") { if (h < 12) h += 12; } else if ((mer === "AM" || mer === "SA") && h === 12) h = 0;
    if (h > 9999 || m > 59 || s > 60) return { time: NaN, rest: value };
    return { time: (h * 3600 + m * 60 + s) / 86400, rest: value.slice(0, match.index).trim() };
  };
  const { time, rest } = pickTime(raw);
  if (Number.isNaN(time)) return null;
  if (!rest) return { date: null, time };
  let y; let mo; let d;
  let m;
  if ((m = rest.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = rest.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = rest.match(/^(\d{1,2})[-\s]+([A-Za-z]{3,9})[-\s,]+(\d{4})$/))) { d = +m[1]; mo = months.indexOf(m[2].slice(0, 3).toLowerCase()) + 1; y = +m[3]; }
  else return null;
  if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31) || y < 1900 || y > 9999) return null;
  const utc = Date.UTC(y, mo - 1, d);
  const check = new Date(utc);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return { date: utcToSerial(utc), time };
}

function holidaySet(engine, arg) {
  if (arg === undefined) return new Set();
  const values = /^[$]?[A-Z]+[$]?\d+(?::[$]?[A-Z]+[$]?\d+)?$/i.test(String(arg).trim()) || /!/.test(arg)
    ? engine._rangeMatrix(arg).flat()
    : [scalar(engine, arg)];
  const set = new Set();
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    if (isErr(value)) return value;
    let serial = value;
    if (typeof value !== "number") {
      const parsed = engine._parseNumberOrCurrency?.(value);
      serial = typeof parsed === "number" ? parsed : engine._parseDate?.(value) ? engine._dateToSerial(engine._parseDate(value)) : NaN;
    }
    if (!Number.isFinite(serial)) return "#VALUE!";
    set.add(Math.floor(serial));
  }
  return set;
}

/** Mã cuối tuần -> mảng 7 phần tử (Chủ nhật = 0) true nếu là ngày nghỉ. */
function weekendMask(engine, arg, allowAllOff = false) {
  if (arg === undefined) return [true, false, false, false, false, false, true];
  const value = scalar(engine, arg);
  if (isErr(value)) return value;
  if (typeof value === "string" && /^[01]{7}$/.test(value)) {
    if (value === "1111111" && !allowAllOff) return "#VALUE!";
    const mask = new Array(7).fill(false);
    for (let i = 0; i < 7; i++) mask[(i + 1) % 7] = value[i] === "1"; // chuỗi bắt đầu từ thứ Hai
    return mask;
  }
  const code = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(code)) return "#VALUE!";
  const mask = new Array(7).fill(false);
  if (code >= 1 && code <= 7) {
    // 1: Thứ Bảy+CN, 2: CN+Thứ Hai, 3: Thứ Hai+Ba ... 7: Thứ Sáu+Thứ Bảy
    const first = [6, 0, 1, 2, 3, 4, 5][code - 1];
    mask[first] = true; mask[(first + 1) % 7] = true;
    return mask;
  }
  if (code >= 11 && code <= 17) { mask[[0, 1, 2, 3, 4, 5, 6][code - 11]] = true; return mask; }
  return "#NUM!";
}

function countWorkdays(start, end, mask, holidays) {
  const step = start <= end ? 1 : -1;
  let count = 0;
  for (let serial = start; step > 0 ? serial <= end : serial >= end; serial += step) {
    if (!mask[weekdayOf(serial)] && !holidays.has(serial)) count++;
  }
  return step * count;
}

function offsetWorkdays(start, days, mask, holidays) {
  const direction = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let serial = start;
  let guard = 0;
  while (remaining > 0 && guard++ < 1e6) {
    serial += direction;
    if (!mask[weekdayOf(serial)] && !holidays.has(serial)) remaining--;
  }
  return serial;
}

const fullwidthToHalf = text => String(text).replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, " ").replace(/￥/g, "¥");

const delegate = name => (engine, args) => engine._executeFunction(name, args);

function roundHalfAwayFromZero(value, digits) {
  const factor = 10 ** digits;
  const scaled = Number((Math.abs(value) * factor).toPrecision(15));
  return Math.sign(value) * Math.round(scaled) / factor;
}

export const MISC_FUNCTIONS = {
  // ---- Văn bản
  ASC(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    return fullwidthToHalf(text ?? "");
  },
  UNICODE(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    const s = String(text ?? ""); return s ? s.codePointAt(0) : "#VALUE!";
  },
  UNICHAR(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const n = num(engine, args[0]); if (isErr(n)) return n;
    const code = Math.trunc(n);
    if (code < 1 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) return "#VALUE!";
    return String.fromCodePoint(code);
  },
  REPLACE(engine, args) {
    if (args.length !== 4) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    const start = num(engine, args[1]); if (isErr(start)) return start;
    const length = num(engine, args[2]); if (isErr(length)) return length;
    const replacement = scalar(engine, args[3]); if (isErr(replacement)) return replacement;
    const s = String(text ?? ""); const from = Math.trunc(start); const count = Math.trunc(length);
    if (from < 1 || count < 0) return "#VALUE!";
    return s.slice(0, from - 1) + String(replacement ?? "") + s.slice(from - 1 + count);
  },
  REPLACEB: delegate("REPLACE"),
  LEFTB: delegate("LEFT"),
  RIGHTB: delegate("RIGHT"),
  MIDB: delegate("MID"),
  LENB: delegate("LEN"),
  FINDB: delegate("FIND"),
  SEARCHB: delegate("SEARCH"),
  FIXED(engine, args) {
    if (args.length < 1 || args.length > 3) return "#VALUE!";
    const value = num(engine, args[0]); if (isErr(value)) return value;
    const decimals = args[1] === undefined ? 2 : Math.trunc(num(engine, args[1])); if (isErr(decimals)) return decimals;
    const noCommas = args[2] === undefined ? false : (() => { const v = scalar(engine, args[2]); return typeof v === "boolean" ? v : Number(v) !== 0; })();
    const rounded = roundHalfAwayFromZero(value, decimals);
    const digits = Math.max(0, decimals);
    const fixed = Math.abs(rounded).toFixed(digits);
    let [integer, fraction] = fixed.split(".");
    if (!noCommas) integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const sign = rounded < 0 ? "-" : "";
    return sign + integer + (fraction ? "." + fraction : "");
  },
  DOLLAR(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const value = num(engine, args[0]); if (isErr(value)) return value;
    const decimals = args[1] === undefined ? 2 : Math.trunc(num(engine, args[1])); if (isErr(decimals)) return decimals;
    const body = MISC_FUNCTIONS.FIXED(engine, [String(Math.abs(value)), String(decimals)]);
    return `${value < 0 ? "-" : ""}${body} ₫`;
  },
  NUMBERVALUE(engine, args) {
    if (args.length < 1 || args.length > 3) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    const decimalSep = args[1] === undefined ? "." : String(scalar(engine, args[1]) ?? "");
    const groupSep = args[2] === undefined ? "," : String(scalar(engine, args[2]) ?? "");
    if (decimalSep.length === 0) return "#VALUE!";
    let s = String(text ?? "").replace(/\s+/g, "");
    if (s === "") return 0;
    let percent = 0;
    while (s.endsWith("%")) { percent++; s = s.slice(0, -1); }
    if (groupSep) s = s.split(groupSep[0]).join("");
    if (decimalSep[0] !== ".") s = s.split(decimalSep[0]).join(".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return "#VALUE!";
    return Number(s) / 100 ** percent;
  },

  // ---- Ngày giờ
  DATEVALUE(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    if (typeof text === "number") return "#VALUE!";
    const parsed = parseDateTimeText(text);
    return parsed && parsed.date !== null ? parsed.date : "#VALUE!";
  },
  TIMEVALUE(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = scalar(engine, args[0]); if (isErr(text)) return text;
    const parsed = parseDateTimeText(text);
    if (!parsed) return "#VALUE!";
    return parsed.time - Math.floor(parsed.time);
  },
  DAYS360(engine, args) {
    if (args.length < 2 || args.length > 3) return "#VALUE!";
    const a = dateArg(engine, args[0]); if (isErr(a)) return a;
    const b = dateArg(engine, args[1]); if (isErr(b)) return b;
    const european = args[2] === undefined ? false : (() => { const v = scalar(engine, args[2]); return typeof v === "boolean" ? v : Number(v) !== 0; })();
    const da = new Date(serialToUtc(a)); const db = new Date(serialToUtc(b));
    let d1 = da.getUTCDate(); let d2 = db.getUTCDate();
    const m1 = da.getUTCMonth() + 1; const m2 = db.getUTCMonth() + 1;
    const y1 = da.getUTCFullYear(); const y2 = db.getUTCFullYear();
    const lastOfFeb = (y, m, d) => m === 2 && d === new Date(Date.UTC(y, 2, 0)).getUTCDate();
    if (european) { if (d1 === 31) d1 = 30; if (d2 === 31) d2 = 30; }
    else {
      if (lastOfFeb(y1, m1, d1) && lastOfFeb(y2, m2, d2)) d2 = 30;
      if (lastOfFeb(y1, m1, d1)) d1 = 30;
      if (d2 === 31 && d1 >= 30) d2 = 30;
      if (d1 === 31) d1 = 30;
    }
    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  },
  ISOWEEKNUM(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const serial = dateArg(engine, args[0]); if (isErr(serial)) return serial;
    const date = new Date(serialToUtc(serial));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  },
  WEEKNUM(engine, args) {
    if (args.length < 1 || args.length > 2) return "#VALUE!";
    const serial = dateArg(engine, args[0]); if (isErr(serial)) return serial;
    const type = args[1] === undefined ? 1 : Math.trunc(num(engine, args[1])); if (isErr(type)) return type;
    if (type === 21) return MISC_FUNCTIONS.ISOWEEKNUM(engine, [String(serial)]);
    const starts = { 1: 0, 2: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 };
    if (!(type in starts)) return "#NUM!";
    const date = new Date(serialToUtc(serial));
    const jan1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.round((date.getTime() - jan1.getTime()) / DAY_MS);
    const offset = (jan1.getUTCDay() - starts[type] + 7) % 7;
    return Math.floor((dayOfYear + offset) / 7) + 1;
  },
  "NETWORKDAYS.INTL"(engine, args) {
    if (args.length < 2 || args.length > 4) return "#VALUE!";
    const start = dateArg(engine, args[0]); if (isErr(start)) return start;
    const end = dateArg(engine, args[1]); if (isErr(end)) return end;
    const mask = weekendMask(engine, args[2], true); if (typeof mask === "string") return mask;
    const holidays = holidaySet(engine, args[3]); if (typeof holidays === "string") return holidays;
    return countWorkdays(Math.floor(start), Math.floor(end), mask, holidays);
  },
  "WORKDAY.INTL"(engine, args) {
    if (args.length < 2 || args.length > 4) return "#VALUE!";
    const start = dateArg(engine, args[0]); if (isErr(start)) return start;
    const days = num(engine, args[1]); if (isErr(days)) return days;
    const mask = weekendMask(engine, args[2]); if (typeof mask === "string") return mask;
    const holidays = holidaySet(engine, args[3]); if (typeof holidays === "string") return holidays;
    return offsetWorkdays(Math.floor(start), Math.trunc(days), mask, holidays);
  },

  // ---- Thông tin
  ISERR(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const v = scalar(engine, args[0]);
    return isErr(v) && !String(v).startsWith("#N/A");
  },
  ISEVEN(engine, args) { if (args.length !== 1) return "#VALUE!"; const n = num(engine, args[0]); if (isErr(n)) return n; return Math.trunc(Math.abs(n)) % 2 === 0; },
  ISODD(engine, args) { if (args.length !== 1) return "#VALUE!"; const n = num(engine, args[0]); if (isErr(n)) return n; return Math.trunc(Math.abs(n)) % 2 === 1; },
  ISREF(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = String(args[0]).trim();
    if (/^(?:(?:'[^']+'|[^!]+)!)?\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?$/i.test(text) || /^[$]?[A-Z]+:[$]?[A-Z]+$/i.test(text)) return true;
    return Boolean(engine._resolveNamedRange?.(text));
  },
  "ERROR.TYPE"(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const v = scalar(engine, args[0]);
    const map = { "#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7 };
    const key = String(v).split(" ")[0];
    return map[key] ?? "#N/A";
  },
  TYPE(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = String(args[0]).trim();
    if (/^\{/.test(text)) return 64;
    const isRange = /^(?:(?:'[^']+'|[^!]+)!)?\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+$/i.test(text);
    if (isRange) return 64;
    const v = scalar(engine, args[0]);
    if (isErr(v)) return 16;
    if (typeof v === "number") return 1;
    if (typeof v === "boolean") return 4;
    return 2;
  },
  SHEET(engine, args) {
    const names = typeof engine._sheetNames === "function" ? engine._sheetNames() : [];
    if (args.length === 0) { const current = typeof engine.currentSheetResolver === "function" ? engine.currentSheetResolver() : names[0]; const index = names.indexOf(current); return index >= 0 ? index + 1 : 1; }
    const text = String(args[0]).trim();
    const quoted = text.match(/^"(.*)"$/);
    if (quoted) { const index = names.indexOf(quoted[1]); return index >= 0 ? index + 1 : "#N/A"; }
    const sheetRef = text.match(/^(?:'((?:[^']|'')+)'|([^'!]+))!/);
    if (sheetRef) { const name = (sheetRef[1] ? sheetRef[1].replace(/''/g, "'") : sheetRef[2]).trim(); const index = names.indexOf(name); return index >= 0 ? index + 1 : "#REF!"; }
    const current = typeof engine.currentSheetResolver === "function" ? engine.currentSheetResolver() : names[0];
    const index = names.indexOf(current); return index >= 0 ? index + 1 : 1;
  },
  SHEETS(engine, args) {
    const names = typeof engine._sheetNames === "function" ? engine._sheetNames() : [];
    if (args.length === 0) return Math.max(1, names.length);
    const text = String(args[0]).trim();
    const three = text.match(/^(?:'((?:[^']|'')+)'|([^':!]+))\s*:\s*(?:'((?:[^']|'')+)'|([^'!]+))!/);
    if (three) {
      const first = (three[1] ? three[1].replace(/''/g, "'") : three[2]).trim(); const last = (three[3] ? three[3].replace(/''/g, "'") : three[4]).trim();
      const a = names.indexOf(first); const b = names.indexOf(last);
      return a < 0 || b < 0 ? "#REF!" : Math.abs(b - a) + 1;
    }
    return 1;
  },
  AREAS(engine, args) {
    if (args.length !== 1) return "#VALUE!";
    const text = String(args[0]).trim();
    const inner = text.replace(/^\((.*)\)$/, "$1");
    return inner.split(",").filter(part => part.trim()).length;
  }
};
