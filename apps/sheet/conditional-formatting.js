/** Conditional-formatting model and grid-side evaluation helpers. */

export const CONDITIONAL_FORMAT_TYPES = Object.freeze([
  "greaterThan", "lessThan", "between", "equal", "blank", "textContains",
  "dateOccurs", "duplicate", "top", "bottom", "aboveAverage", "belowAverage",
  "dataBar", "colorScale2", "colorScale3", "iconSet", "formula"
]);

const TYPE_SET = new Set(CONDITIONAL_FORMAT_TYPES);
const DEFAULT_COLORS = Object.freeze({
  fill: "#fff2cc",
  dataBar: "#638ec6",
  colorScale2: ["#f8696b", "#63be7b"],
  colorScale3: ["#f8696b", "#ffeb84", "#63be7b"]
});

export const CONDITIONAL_ICON_SETS = Object.freeze([
  "3Arrows", "3TrafficLights1", "3Symbols", "4Arrows", "4Rating", "5Arrows", "5Rating"
]);

export const CONDITIONAL_DATE_PERIODS = Object.freeze([
  "yesterday", "today", "tomorrow", "last7Days", "lastWeek", "thisWeek",
  "nextWeek", "lastMonth", "thisMonth", "nextMonth"
]);

function color(value, fallback) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : fallback;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeConditionalRule(config) {
  if (!config || !TYPE_SET.has(config.type)) return null;
  const rule = { type: config.type };
  if (["greaterThan", "lessThan"].includes(rule.type)) {
    rule.value = finite(config.value);
    if (rule.value === null) return null;
  } else if (rule.type === "between") {
    rule.value = finite(config.value);
    rule.value2 = finite(config.value2);
    if (rule.value === null || rule.value2 === null || rule.value > rule.value2) return null;
  } else if (rule.type === "equal") {
    const raw = String(config.value ?? "").trim();
    if (!raw) return null;
    const number = finite(raw);
    rule.value = number === null ? raw : number;
  } else if (rule.type === "textContains") {
    rule.text = String(config.text ?? config.value ?? "").trim();
    if (!rule.text) return null;
  } else if (rule.type === "dateOccurs") {
    rule.timePeriod = CONDITIONAL_DATE_PERIODS.includes(config.timePeriod) ? config.timePeriod : "today";
  } else if (["top", "bottom"].includes(rule.type)) {
    rule.rank = Math.max(1, Math.min(1000, Math.trunc(Number(config.rank) || 10)));
  } else if (rule.type === "formula") {
    const raw = String(config.formula || "").trim();
    if (!raw || raw === "=") return null;
    rule.formula = raw.startsWith("=") ? raw : `=${raw}`;
  } else if (rule.type === "dataBar") {
    rule.color = color(config.color, DEFAULT_COLORS.dataBar);
    rule.showValue = config.showValue !== false;
    return rule;
  } else if (rule.type === "colorScale2" || rule.type === "colorScale3") {
    const defaults = DEFAULT_COLORS[rule.type];
    const count = rule.type === "colorScale2" ? 2 : 3;
    rule.colors = Array.from({ length: count }, (_, index) => color(config.colors?.[index], defaults[index]));
    return rule;
  } else if (rule.type === "iconSet") {
    rule.iconSet = CONDITIONAL_ICON_SETS.includes(config.iconSet) ? config.iconSet : "3TrafficLights1";
    rule.reverse = !!config.reverse;
    rule.showValue = config.showValue !== false;
    return rule;
  }
  rule.color = color(config.color, DEFAULT_COLORS.fill);
  return rule;
}

function parseDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30) + Math.trunc(value) * 86400000;
    return new Date(utc);
  }
  const raw = String(value ?? "").trim();
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!dmy && !ymd) return null;
  const y = Number(ymd ? ymd[1] : dmy[3]);
  const m = Number(ymd ? ymd[2] : dmy[2]);
  const d = Number(ymd ? ymd[3] : dmy[1]);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function monday(date) { const day = date.getDay() || 7; return addDays(startOfDay(date), 1 - day); }

function dateMatches(value, period, now = new Date()) {
  const date = parseDate(value);
  if (!date) return false;
  const target = startOfDay(date).getTime();
  const today = startOfDay(now);
  const oneDay = 86400000;
  if (period === "yesterday") return target === today.getTime() - oneDay;
  if (period === "today") return target === today.getTime();
  if (period === "tomorrow") return target === today.getTime() + oneDay;
  if (period === "last7Days") return target >= today.getTime() - 6 * oneDay && target <= today.getTime();
  const thisMonday = monday(today);
  if (period === "lastWeek") return target >= addDays(thisMonday, -7).getTime() && target < thisMonday.getTime();
  if (period === "thisWeek") return target >= thisMonday.getTime() && target < addDays(thisMonday, 7).getTime();
  if (period === "nextWeek") return target >= addDays(thisMonday, 7).getTime() && target < addDays(thisMonday, 14).getTime();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  if (period === "lastMonth") return target >= new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime() && target < thisMonth.getTime();
  if (period === "thisMonth") return target >= thisMonth.getTime() && target < nextMonth.getTime();
  return target >= nextMonth.getTime() && target < new Date(today.getFullYear(), today.getMonth() + 2, 1).getTime();
}

function numericRangeValues(rule, context) {
  return context.values(rule.range).map(context.numeric).filter(Number.isFinite);
}

export function conditionalRuleMatches(rule, value, col, row, context) {
  if (!rule || !context.contains(rule.range, col, row)) return false;
  const text = String(value ?? "").trim();
  if (rule.type === "blank") return text === "";
  if (rule.type === "textContains") return text.toLocaleLowerCase().includes(String(rule.text || "").toLocaleLowerCase());
  if (rule.type === "dateOccurs") return dateMatches(value, rule.timePeriod, context.now?.());
  if (rule.type === "duplicate") {
    if (!text) return false;
    const normalized = text.toLocaleLowerCase();
    return context.values(rule.range).filter(item => String(item ?? "").trim().toLocaleLowerCase() === normalized).length > 1;
  }
  if (rule.type === "formula") return !!context.formula(rule, col, row);
  if (rule.type === "equal" && typeof rule.value !== "number") return text === String(rule.value);
  const numeric = context.numeric(value);
  if (!Number.isFinite(numeric)) return false;
  if (rule.type === "greaterThan") return numeric > rule.value;
  if (rule.type === "lessThan") return numeric < rule.value;
  if (rule.type === "between") return numeric >= rule.value && numeric <= rule.value2;
  if (rule.type === "equal") return numeric === rule.value;
  const values = numericRangeValues(rule, context);
  if (!values.length) return false;
  if (rule.type === "aboveAverage" || rule.type === "belowAverage") {
    const average = values.reduce((sum, item) => sum + item, 0) / values.length;
    return rule.type === "aboveAverage" ? numeric > average : numeric < average;
  }
  if (rule.type === "top" || rule.type === "bottom") {
    const sorted = [...values].sort((a, b) => rule.type === "top" ? b - a : a - b);
    return numeric >= Math.min(...sorted.slice(0, rule.rank || 10)) && rule.type === "top"
      || numeric <= Math.max(...sorted.slice(0, rule.rank || 10)) && rule.type === "bottom";
  }
  return ["dataBar", "colorScale2", "colorScale3", "iconSet"].includes(rule.type);
}

function mixColor(start, end, ratio) {
  const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
  const result = [1, 3, 5].map(offset => Math.round(channel(start, offset) + (channel(end, offset) - channel(start, offset)) * ratio));
  return `#${result.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

const ICONS = Object.freeze({
  "3Arrows": ["▼", "▶", "▲"], "3TrafficLights1": ["●", "●", "●"], "3Symbols": ["✕", "!", "✓"],
  "4Arrows": ["▼", "↘", "↗", "▲"], "4Rating": ["●", "●●", "●●●", "●●●●"],
  "5Arrows": ["▼", "↘", "→", "↗", "▲"], "5Rating": ["●", "●●", "●●●", "●●●●", "●●●●●"]
});

export function conditionalVisual(rule, value, context) {
  const numeric = context.numeric(value);
  if (!Number.isFinite(numeric)) return {};
  const values = numericRangeValues(rule, context);
  if (!values.length) return {};
  const min = Math.min(...values), max = Math.max(...values);
  const ratio = max === min ? 1 : Math.max(0, Math.min(1, (numeric - min) / (max - min)));
  if (rule.type === "dataBar") return { dataBar: { color: rule.color, percent: Math.max(1, Math.round(ratio * 100)) } };
  if (rule.type === "colorScale2") return { fill: mixColor(rule.colors[0], rule.colors[1], ratio) };
  if (rule.type === "colorScale3") return { fill: ratio <= 0.5 ? mixColor(rule.colors[0], rule.colors[1], ratio * 2) : mixColor(rule.colors[1], rule.colors[2], (ratio - 0.5) * 2) };
  if (rule.type === "iconSet") {
    const icons = ICONS[rule.iconSet] || ICONS["3TrafficLights1"];
    let index = Math.min(icons.length - 1, Math.floor(ratio * icons.length));
    if (rule.reverse) index = icons.length - 1 - index;
    const palette = index === 0 ? "#dc2626" : index === icons.length - 1 ? "#16a34a" : "#ca8a04";
    return { icon: icons[index], iconColor: palette };
  }
  return {};
}
