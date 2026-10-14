/**
 * Bộ định dạng theo MÃ định dạng của Excel (dùng cho TEXT, FIXED...). Module thuần, không DOM.
 * Hỗ trợ: nhiều phần (dương;âm;không;văn bản), điều kiện [>100], màu [Red] (bỏ qua), chữ trong "..." và \x,
 * 0 # ? , . % E+00, phân số # ?/?, ngày giờ (d m y h s AM/PM [h] [m] [s] .000), @ và General.
 * Đối chiếu với Excel 2016 bằng scripts/audit-0610/function_oracle.mjs (tests/functions/cases-batch3-*.json).
 */

export const EN_LOCALE = {
  decimal: ".", group: ",",
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  am: "AM", pm: "PM"
};

/** Tên tháng/thứ tiếng Việt (mặc định của VN Sheet; số vẫn dùng "," nghìn và "." thập phân như trước đây). */
export const VI_LOCALE = {
  decimal: ".", group: ",",
  months: ["tháng Một", "tháng Hai", "tháng Ba", "tháng Tư", "tháng Năm", "tháng Sáu", "tháng Bảy", "tháng Tám", "tháng Chín", "tháng Mười", "tháng Mười Một", "tháng Mười Hai"],
  monthsShort: ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6", "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"],
  days: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"],
  daysShort: ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"],
  am: "SA", pm: "CH"
};

// ---------- Tách phần ----------
function splitSections(code) {
  const sections = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') { inQuote = !inQuote; current += ch; continue; }
    if (!inQuote && ch === "\\") { current += ch + (code[i + 1] ?? ""); i++; continue; }
    if (!inQuote && ch === "[") {
      const end = code.indexOf("]", i);
      if (end > 0) { current += code.slice(i, end + 1); i = end; continue; }
    }
    if (!inQuote && ch === ";") { sections.push(current); current = ""; continue; }
    current += ch;
  }
  sections.push(current);
  return sections;
}

function parseCondition(section) {
  const match = section.match(/^\s*(?:\[(?:red|black|blue|green|white|yellow|magenta|cyan|color\s*\d+)\])?\s*\[(<=|>=|<>|=|<|>)\s*(-?[\d.]+)\]/i)
    || section.match(/^\s*\[(<=|>=|<>|=|<|>)\s*(-?[\d.]+)\]/i);
  if (!match) return null;
  return { op: match[1], value: Number(match[2]) };
}

function conditionHolds(condition, value) {
  const { op, value: limit } = condition;
  switch (op) {
    case "<": return value < limit;
    case ">": return value > limit;
    case "<=": return value <= limit;
    case ">=": return value >= limit;
    case "=": return value === limit;
    case "<>": return value !== limit;
    default: return false;
  }
}

/** Gỡ phần điều kiện/màu/locale ở đầu một phần, giữ phần mã định dạng thật. */
function stripPrefixes(section) {
  let text = section;
  let changed = true;
  while (changed) {
    changed = false;
    const match = text.match(/^\s*\[(?:red|black|blue|green|white|yellow|magenta|cyan|color\s*\d+|(?:<=|>=|<>|=|<|>)\s*-?[\d.]+)\]/i);
    if (match) { text = text.slice(match[0].length); changed = true; }
  }
  return text;
}

// ---------- Phân tích token ----------
function tokenize(section) {
  const tokens = [];
  let i = 0;
  const text = section;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      const end = text.indexOf('"', i + 1);
      const literal = text.slice(i + 1, end < 0 ? text.length : end);
      tokens.push({ type: "lit", text: literal });
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    if (ch === "\\") { tokens.push({ type: "lit", text: text[i + 1] ?? "" }); i += 2; continue; }
    if (ch === "_") { tokens.push({ type: "lit", text: " " }); i += 2; continue; }
    if (ch === "*") { i += 2; continue; }
    if (ch === "[") {
      const end = text.indexOf("]", i);
      const inner = end < 0 ? "" : text.slice(i + 1, end);
      if (/^[hms]+$/i.test(inner)) tokens.push({ type: "elapsed", unit: inner[0].toLowerCase(), width: inner.length });
      else if (/^\$/.test(inner)) { const currency = inner.slice(1).split("-")[0]; if (currency) tokens.push({ type: "lit", text: currency }); }
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    const rest = text.slice(i);
    let match;
    if ((match = rest.match(/^(?:AM\/PM|am\/pm|A\/P|a\/p)/))) { tokens.push({ type: "ampm", text: match[0] }); i += match[0].length; continue; }
    if ((match = rest.match(/^[Ee][+-]/))) { tokens.push({ type: "exp", sign: match[0][1] }); i += 2; continue; }
    if ((match = rest.match(/^General/i))) { tokens.push({ type: "general" }); i += 7; continue; }
    if ((match = rest.match(/^(?:yyyy|yy|y)/i)) && /^[yY]/.test(ch)) { tokens.push({ type: "date", unit: "y", width: match[0].length }); i += match[0].length; continue; }
    if ((match = rest.match(/^m+/i))) { tokens.push({ type: "m", width: Math.min(match[0].length, 5) }); i += match[0].length; continue; }
    if ((match = rest.match(/^d+/i))) { tokens.push({ type: "date", unit: "d", width: Math.min(match[0].length, 4) }); i += match[0].length; continue; }
    if ((match = rest.match(/^h+/i))) { tokens.push({ type: "time", unit: "h", width: Math.min(match[0].length, 2) }); i += match[0].length; continue; }
    if ((match = rest.match(/^s+/i))) { tokens.push({ type: "time", unit: "s", width: Math.min(match[0].length, 2) }); i += match[0].length; continue; }
    if (ch === "@") { tokens.push({ type: "at" }); i++; continue; }
    if (ch === "0" || ch === "#" || ch === "?") { tokens.push({ type: "digit", ch }); i++; continue; }
    if (ch === ".") { tokens.push({ type: "point" }); i++; continue; }
    if (ch === ",") { tokens.push({ type: "comma" }); i++; continue; }
    if (ch === "%") { tokens.push({ type: "percent" }); i++; continue; }
    if (ch === "/") { tokens.push({ type: "slash" }); i++; continue; }
    tokens.push({ type: "lit", text: ch });
    i++;
  }
  return tokens;
}

const isDateTime = tokens => tokens.some(t => t.type === "date" || t.type === "time" || t.type === "m" || t.type === "ampm" || t.type === "elapsed");

// ---------- Làm tròn / chữ số ----------
function roundHalfUp(value, decimals) {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const text = abs.toExponential(14);
  const [mantissa, exponent] = text.split("e");
  const shifted = Number(`${mantissa}e${Number(exponent) + decimals}`);
  return sign * Math.round(shifted + 1e-9 * (shifted < 1e9 ? 1 : 0)) / 10 ** decimals;
}

function groupDigits(intText, groupSep) {
  return intText.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
}

function formatNumberSection(tokens, value, locale, isOnlySection, negativeFromValue) {
  // Phân tích cấu trúc số
  let percent = 0;
  const pre = []; const post = [];
  let seenPoint = false;
  let hasExp = false;
  let expIndex = -1;
  const sequence = tokens.slice();
  for (let i = 0; i < sequence.length; i++) {
    const t = sequence[i];
    if (t.type === "percent") percent++;
    if (t.type === "exp") { hasExp = true; expIndex = i; }
  }
  const mainTokens = hasExp ? sequence.slice(0, expIndex) : sequence;
  const expTokens = hasExp ? sequence.slice(expIndex + 1) : [];
  const expDigits = expTokens.filter(t => t.type === "digit").length;
  const expSign = hasExp ? sequence[expIndex].sign : "";

  // Đếm placeholder số nguyên / thập phân trong mainTokens
  let intPlaceholders = 0; let decPlaceholders = 0; let minInt = 0; let minDec = 0;
  let grouping = false;
  let scaleCommas = 0;
  let lastDigitIndex = -1;
  mainTokens.forEach((t, idx) => { if (t.type === "digit") lastDigitIndex = idx; });
  mainTokens.forEach((t, idx) => {
    if (t.type === "point" && !seenPoint) { seenPoint = true; return; }
    if (t.type === "digit") {
      if (!seenPoint) { intPlaceholders++; if (t.ch === "0") minInt++; } else { decPlaceholders++; if (t.ch === "0") minDec++; }
    }
    if (t.type === "comma") {
      // dấu phẩy giữa các chỗ giữ chỗ chữ số = phân cách nghìn; ngay sau chữ số cuối = chia 1000
      const nextDigit = mainTokens.slice(idx + 1).some(n => n.type === "digit");
      const prevDigit = mainTokens.slice(0, idx).some(n => n.type === "digit");
      if (nextDigit && prevDigit) grouping = true;
      else if (!nextDigit && prevDigit) scaleCommas++;
    }
  });

  let work = Math.abs(value);
  work = work * 100 ** percent / 1000 ** scaleCommas;
  let integerText = ""; let decimalText = ""; let exponentText = "";

  if (hasExp) {
    let exponent = 0;
    if (work !== 0) {
      exponent = Math.floor(Math.log10(work));
      if (intPlaceholders > 1) exponent -= (((exponent % intPlaceholders) + intPlaceholders) % intPlaceholders);
    }
    let mantissa = work === 0 ? 0 : work / 10 ** exponent;
    mantissa = roundHalfUp(mantissa, decPlaceholders);
    if (intPlaceholders <= 1 && mantissa >= 10) { mantissa /= 10; exponent += 1; }
    const fixed = mantissa.toFixed(decPlaceholders);
    [integerText, decimalText = ""] = fixed.split(".");
    const expSignText = exponent < 0 ? "-" : (expSign === "+" ? "+" : "");
    exponentText = expSignText + String(Math.abs(exponent)).padStart(expDigits, "0");
  } else {
    const rounded = roundHalfUp(work, decPlaceholders);
    const fixed = rounded.toFixed(decPlaceholders);
    [integerText, decimalText = ""] = fixed.split(".");
    if (Number(integerText) === 0 && minInt === 0 && intPlaceholders > 0) integerText = "";
    if (intPlaceholders === 0 && !decPlaceholders && Number(fixed) === 0) integerText = "0";
  }
  // bỏ số 0 thừa ở phần thập phân với #
  let dec = decimalText;
  let optionalTail = decPlaceholders - minDec;
  while (optionalTail > 0 && dec.endsWith("0")) { dec = dec.slice(0, -1); optionalTail--; }

  // Xây chuỗi nguyên theo placeholder (có literal xen giữa, như 000-0000)
  const intTokens = []; const decTokens = [];
  seenPoint = false;
  for (const t of mainTokens) {
    if (t.type === "point" && !seenPoint) { seenPoint = true; intTokens.push({ marker: "point" }); continue; }
    (seenPoint ? decTokens : intTokens).push(t);
  }
  // Số nguyên: gán chữ số từ phải sang trái vào placeholder
  const intDigitSlots = intTokens.filter(t => t.type === "digit");
  let digits = integerText.replace(/^0+(?=\d)/, "");
  if (integerText === "0" && intDigitSlots.length) digits = minInt > 0 ? "0" : (intPlaceholders > 0 ? "" : "0");
  if (integerText === "" ) digits = "";
  let digitPos = digits.length;
  const slotsOutput = new Map();
  let slotIndex = intDigitSlots.length - 1;
  const intTokenList = intTokens.filter(t => !t.marker);
  for (let i = intTokenList.length - 1; i >= 0; i--) {
    const t = intTokenList[i];
    if (t.type !== "digit") continue;
    const isFirstSlot = slotIndex === 0;
    let out;
    if (digitPos > 0) {
      if (isFirstSlot) { out = digits.slice(0, digitPos); digitPos = 0; } else { out = digits[digitPos - 1]; digitPos--; }
    } else {
      out = t.ch === "0" ? "0" : (t.ch === "?" ? " " : "");
    }
    slotsOutput.set(t, out);
    slotIndex--;
  }
  const groupedDigitsText = grouping ? groupDigits(digits.padStart(minInt, "0"), locale.group) : null;
  let integerOutput = "";
  let firstSlotDone = false;
  for (const t of intTokenList) {
    if (t.type === "digit") {
      if (grouping && !firstSlotDone) { integerOutput += groupedDigitsText; firstSlotDone = true; continue; }
      if (grouping && firstSlotDone) continue;
      integerOutput += slotsOutput.get(t) ?? "";
    } else if (t.type === "lit") integerOutput += t.text;
    else if (t.type === "percent") integerOutput += "%";
    else if (t.type === "comma") { /* phân cách/chia 1000 không in */ }
    else if (t.type === "slash") integerOutput += "/";
    else if (t.type === "at") integerOutput += "";
  }
  // Phần thập phân
  let decimalOutput = "";
  if (seenPoint) {
    let pos = 0;
    let out = "";
    for (const t of decTokens) {
      if (t.type === "digit") {
        const digit = pos < dec.length ? dec[pos] : (t.ch === "0" ? "0" : (t.ch === "?" ? " " : ""));
        out += digit; pos++;
      } else if (t.type === "lit") out += t.text;
      else if (t.type === "percent") out += "%";
    }
    decimalOutput = out;
    const hasDecimalContent = /[0-9 ]/.test(decimalOutput.replace(/[^0-9 ]/g, "")) && decimalOutput.replace(/[^0-9 ]/g, "").trim() !== "" || minDec > 0 || /\?/.test(decTokens.map(t => t.ch || "").join(""));
    decimalOutput = hasDecimalContent || decTokens.some(t => t.type === "lit" || t.type === "percent") ? decimalOutput : "";
  }
  const decimalPart = seenPoint && (decimalOutput.replace(/%/g, "").length || minDec > 0 || decPlaceholders > 0 && dec.length) ? locale.decimal + decimalOutput : (seenPoint && decimalOutput ? locale.decimal + decimalOutput : "");
  let body = integerOutput + (seenPoint && (dec.length || minDec > 0 || decTokens.some(t => t.type === "digit" && t.ch === "?")) ? decimalPart : (seenPoint && decimalOutput ? decimalPart : ""));
  if (hasExp) body += "E" + exponentText;
  const trailingLits = expTokens.filter(t => t.type === "lit").map(t => t.text).join("");
  body += trailingLits;
  const isZeroDisplay = Number(roundHalfUp(work, decPlaceholders)) === 0;
  const negative = negativeFromValue && !isZeroDisplay && isOnlySection;
  return (negative ? "-" : "") + body;
}

function formatFractionSection(tokens, value, isOnlySection, negativeFromValue) {
  const slashIndex = tokens.findIndex(t => t.type === "slash");
  const left = tokens.slice(0, slashIndex);
  const right = tokens.slice(slashIndex + 1);
  // Nhóm chữ số bên trái dấu /: [phần nguyên][ ][tử số]
  const groups = [];
  let current = null;
  for (const token of left) {
    if (token.type === "digit") {
      if (!current) { current = { slots: [], before: "" }; groups.push(current); }
      current.slots.push(token);
    } else if (token.type === "lit") {
      if (current) current = null;
      if (groups.length) groups[groups.length - 1].after = (groups[groups.length - 1].after || "") + token.text;
    }
  }
  const numeratorGroup = groups[groups.length - 1];
  const wholeGroup = groups.length > 1 ? groups[0] : null;
  const separator = wholeGroup ? (wholeGroup.after || " ") : "";
  const denomSlots = right.filter(t => t.type === "digit");
  const fixedDenomText = right.filter(t => t.type === "lit").map(t => t.text).join("");
  const fixedDenom = /^\d+$/.test(fixedDenomText) ? Number(fixedDenomText) : null;

  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const target = wholeGroup ? abs - whole : abs;
  let best = { n: 0, d: fixedDenom || 1 };
  if (fixedDenom) best = { n: Math.round(target * fixedDenom), d: fixedDenom };
  else {
    const maxDen = 10 ** denomSlots.length - 1;
    let bestErr = Infinity;
    for (let d = 1; d <= maxDen; d++) {
      const n = Math.round(target * d);
      const err = Math.abs(target - n / d);
      if (err < bestErr - 1e-12) { bestErr = err; best = { n, d }; }
    }
  }
  let wholeValue = wholeGroup ? whole : 0;
  if (wholeGroup && best.n === best.d) { wholeValue += 1; best = { n: 0, d: fixedDenom || 1 }; }

  const padSlots = (text, slots, side) => {
    const need = slots.length;
    if (text.length >= need) return text;
    const first = slots[0];
    const filler = first.ch === "?" ? " " : (first.ch === "0" ? "0" : "");
    return side === "left" ? filler.repeat(need - text.length) + text : text + (first.ch === "?" ? " " : "").repeat(need - text.length);
  };
  const wholeText = wholeGroup
    ? (wholeValue === 0 && !wholeGroup.slots.some(s => s.ch === "0") ? padSlots("", wholeGroup.slots, "left") : padSlots(String(wholeValue), wholeGroup.slots, "left"))
    : "";
  const numeratorText = padSlots(String(best.n), numeratorGroup.slots, "left");
  const denominatorText = fixedDenom ? String(best.d) : padSlots(String(best.d), denomSlots, "right");
  let body;
  if (wholeGroup && best.n === 0) body = wholeText + " ".repeat(separator.length + numeratorGroup.slots.length + 1 + (fixedDenom ? String(fixedDenom).length : denomSlots.length));
  else body = (wholeGroup ? wholeText + separator : "") + numeratorText + "/" + denominatorText;
  const negative = negativeFromValue && isOnlySection && value !== 0;
  return (negative ? "-" : "") + body;
}

// ---------- Ngày giờ ----------
export function serialToParts(serial) {
  const total = Math.floor(serial);
  let day = total;
  let year; let month; let dayOfMonth; let weekday;
  if (total === 0) { year = 1900; month = 1; dayOfMonth = 0; weekday = 6; }
  else if (total === 60) { year = 1900; month = 2; dayOfMonth = 29; weekday = 3; }
  else {
    const adjust = total > 60 ? total : total + 1;
    const date = new Date(Date.UTC(1899, 11, 30) + adjust * 86400000);
    year = date.getUTCFullYear(); month = date.getUTCMonth() + 1; dayOfMonth = date.getUTCDate(); weekday = date.getUTCDay();
    day = adjust;
  }
  const fraction = serial - total;
  return { year, month, day: dayOfMonth, weekday, fraction, serialDays: total };
}

function formatDateTimeSection(tokens, value, locale) {
  // Làm tròn tới 1/1000 giây theo hiển thị giây (Excel làm tròn giây khi không có phần lẻ giây)
  const hasSubSecond = tokens.some((t, i) => t.type === "point" && tokens[i + 1]?.type === "digit");
  let serial = value;
  const subDigits = (() => { let n = 0; for (let i = 0; i < tokens.length; i++) if (tokens[i].type === "point" && tokens[i + 1]?.type === "digit") { n = tokens.slice(i + 1).filter(t => t.type === "digit").length; break; } return n; })();
  let totalSeconds = Math.round(serial * 86400 * 10 ** subDigits) / 10 ** subDigits;
  if (!hasSubSecond) totalSeconds = Math.round(serial * 86400);
  serial = totalSeconds / 86400;
  const parts = serialToParts(serial < 0 ? 0 : serial);
  const dayFraction = serial - Math.floor(serial);
  const secondsOfDay = Math.round(dayFraction * 86400 * 10 ** subDigits) / 10 ** subDigits;
  const hours = Math.floor(secondsOfDay / 3600);
  const minutes = Math.floor((secondsOfDay % 3600) / 60);
  const seconds = Math.floor(secondsOfDay % 60);
  const subsecond = secondsOfDay - Math.floor(secondsOfDay);
  const hasAmPm = tokens.some(t => t.type === "ampm");
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const elapsedTotalMinutes = Math.floor(totalSeconds / 60);
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "lit") { out += t.text; continue; }
    if (t.type === "date") {
      if (t.unit === "y") out += t.width <= 2 ? String(parts.year % 100).padStart(2, "0") : String(parts.year).padStart(4, "0");
      else if (t.unit === "d") out += t.width === 1 ? String(parts.day) : t.width === 2 ? String(parts.day).padStart(2, "0") : t.width === 3 ? locale.daysShort[parts.weekday] : locale.days[parts.weekday];
      continue;
    }
    if (t.type === "m") {
      // phút nếu ngay sau h hoặc ngay trước s
      let prev = null; for (let j = i - 1; j >= 0; j--) { if (["time", "elapsed", "date", "m", "ampm"].includes(tokens[j].type)) { prev = tokens[j]; break; } }
      let next = null; for (let j = i + 1; j < tokens.length; j++) { if (["time", "elapsed", "date", "m", "ampm"].includes(tokens[j].type)) { next = tokens[j]; break; } }
      const isMinute = (prev && ((prev.type === "time" && prev.unit === "h") || (prev.type === "elapsed" && prev.unit === "h"))) || (next && ((next.type === "time" && next.unit === "s") || (next.type === "elapsed" && next.unit === "s")));
      if (isMinute) out += t.width === 1 ? String(minutes) : String(minutes).padStart(2, "0");
      else if (t.width === 1) out += String(parts.month);
      else if (t.width === 2) out += String(parts.month).padStart(2, "0");
      else if (t.width === 3) out += locale.monthsShort[parts.month - 1];
      else if (t.width === 4) out += locale.months[parts.month - 1];
      else out += locale.months[parts.month - 1][0];
      continue;
    }
    if (t.type === "time") {
      if (t.unit === "h") { const h = hasAmPm ? hour12 : hours; out += t.width === 1 ? String(h) : String(h).padStart(2, "0"); }
      else if (t.unit === "s") out += t.width === 1 ? String(seconds) : String(seconds).padStart(2, "0");
      continue;
    }
    if (t.type === "elapsed") {
      const amount = t.unit === "h" ? Math.floor(totalSeconds / 3600) : t.unit === "m" ? elapsedTotalMinutes : Math.floor(totalSeconds);
      out += String(amount).padStart(t.width, "0");
      continue;
    }
    if (t.type === "ampm") {
      const pm = hours >= 12;
      out += /^A\/P$/i.test(t.text) ? (pm ? "P" : "A") : (pm ? locale.pm : locale.am);
      continue;
    }
    if (t.type === "point" && tokens[i + 1]?.type === "digit") {
      const count = tokens.slice(i + 1).filter(x => x.type === "digit").length;
      out += "." + subsecond.toFixed(count).slice(2);
      while (tokens[i + 1]?.type === "digit") i++;
      continue;
    }
    if (t.type === "point") out += ".";
    if (t.type === "comma") out += ",";
    if (t.type === "slash") out += "/";
    if (t.type === "percent") out += "%";
  }
  return out;
}

// ---------- Hàm chính ----------
/**
 * @param {number|string|boolean} value
 * @param {string} code mã định dạng Excel
 * @param {{locale?:object, general?:(n:number)=>string}} [options]
 */
export function formatByCode(value, code, options = {}) {
  const locale = options.locale || EN_LOCALE;
  const general = options.general || (n => (Number.isInteger(n) ? String(n) : String(parseFloat(n.toPrecision(11)))));
  const source = String(code ?? "");
  if (source === "" ) return "";
  const sections = splitSections(source);
  const isText = typeof value === "string" || typeof value === "boolean";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  const textSection = sections.length >= 4 ? sections[3] : null;
  if (isText) {
    const textCode = textSection ?? (sections.some(s => tokenize(stripPrefixes(s)).some(t => t.type === "at")) ? sections.find(s => tokenize(stripPrefixes(s)).some(t => t.type === "at")) : null);
    if (textCode === null) return String(value);
    return tokenize(stripPrefixes(textCode)).map(t => (t.type === "at" ? String(value) : t.type === "lit" ? t.text : "")).join("");
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return "#NUM!";
  // Mã chỉ có @ (không có chữ số/ngày): số được coi như văn bản.
  const onlyText = sections.length >= 1 && sections.every(section => {
    const toks = tokenize(stripPrefixes(section));
    return toks.some(t => t.type === "at") && !toks.some(t => ["digit", "date", "time", "m", "elapsed", "ampm", "general"].includes(t.type));
  });
  if (onlyText) {
    const textOf = general(number);
    return tokenize(stripPrefixes(sections[0])).map(t => (t.type === "at" ? textOf : t.type === "lit" ? t.text : "")).join("");
  }

  // chọn phần
  const parsed = sections.map(section => ({ raw: section, condition: parseCondition(section) }));
  let chosen = 0;
  let useAbs = false;
  const numeric = parsed.slice(0, Math.min(3, parsed.length));
  if (numeric.some(s => s.condition)) {
    chosen = numeric.findIndex((s, idx) => s.condition ? conditionHolds(s.condition, number) : (idx === numeric.length - 1 || !numeric.slice(idx + 1).some(x => x.condition) ));
    if (chosen < 0) chosen = numeric.length - 1;
    if (numeric.length === 2 && !numeric[1].condition && chosen === 1) useAbs = number < 0;
    if (numeric[chosen].condition && numeric[chosen].condition.op !== "<>" ) useAbs = number < 0 && numeric.length > 1;
  } else if (numeric.length === 1) chosen = 0;
  else if (numeric.length === 2) { chosen = number < 0 ? 1 : 0; useAbs = number < 0; }
  else { chosen = number > 0 ? 0 : number < 0 ? 1 : 2; useAbs = number < 0; }

  const sectionCode = stripPrefixes(parsed[chosen].raw);
  const tokens = tokenize(sectionCode);
  const isOnly = numeric.length === 1 || (numeric.length > 1 && numeric.every(s => s.condition) === false && false);
  const onlySection = numeric.length === 1;
  const effective = useAbs ? Math.abs(number) : number;

  if (tokens.some(t => t.type === "general") && !isDateTime(tokens)) {
    const text = general(effective);
    return tokens.map(t => (t.type === "general" ? text : t.type === "lit" ? t.text : "")).join("");
  }
  if (isDateTime(tokens)) {
    if (number < 0) return "#".repeat(10);
    return formatDateTimeSection(tokens, effective, locale);
  }
  if (tokens.some(t => t.type === "slash") && tokens.some(t => t.type === "digit") && !tokens.some(t => t.type === "exp")) {
    return formatFractionSection(tokens, effective, onlySection, number < 0 && !useAbs);
  }
  return formatNumberSection(tokens, effective, locale, onlySection || !useAbs, number < 0 && (onlySection || !useAbs));
}
