/** Conditional-formatting model and grid-side evaluation helpers. */

export const CONDITIONAL_FORMAT_TYPES = Object.freeze([
  "greaterThan", "lessThan", "between", "equal", "blank", "textContains",
  "dateOccurs", "duplicate", "top", "bottom", "topPercent", "bottomPercent", "aboveAverage", "belowAverage",
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
  } else if (["top", "bottom", "topPercent", "bottomPercent"].includes(rule.type)) {
    const maximum = rule.type.endsWith("Percent") ? 100 : 1000;
    rule.rank = Math.max(1, Math.min(maximum, Math.trunc(Number(config.rank) || 10)));
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

/**
 * Thống kê của một vùng quy tắc (tính MỘT lần rồi dùng cho mọi ô): tránh quét và sắp xếp lại cả vùng cho từng ô được vẽ.
 * Không dùng Math.min(...values): spread quá vài chục nghìn phần tử gây RangeError ở bảng lớn.
 */
export function computeRangeStats(values, numeric, needCounts = false) {
  const nums = [];
  let sum = 0, min = Infinity, max = -Infinity;
  const counts = needCounts ? new Map() : null;
  for (const raw of values) {
    const n = numeric(raw);
    if (Number.isFinite(n)) {
      nums.push(n);
      sum += n;
      if (n < min) min = n;
      if (n > max) max = n;
    }
    if (counts) {
      const text = String(raw ?? "").trim().toLocaleLowerCase();
      if (text) counts.set(text, (counts.get(text) || 0) + 1);
    }
  }
  return { nums, count: nums.length, sum, average: nums.length ? sum / nums.length : 0, min, max, counts, sortedDesc: null, sortedAsc: null };
}

function rangeStats(rule, context) {
  if (typeof context.stats === "function") return context.stats(rule);
  return computeRangeStats(context.values(rule.range), context.numeric, rule.type === "duplicate");
}

function rankThreshold(stats, top, rank) {
  const size = Math.min(Math.max(1, rank || 10), stats.count);
  if (top) {
    stats.sortedDesc ||= [...stats.nums].sort((a, b) => b - a);
    return stats.sortedDesc[size - 1];
  }
  stats.sortedAsc ||= [...stats.nums].sort((a, b) => a - b);
  return stats.sortedAsc[size - 1];
}

export function conditionalRuleMatches(rule, value, col, row, context) {
  if (!rule || !context.contains(rule.range, col, row)) return false;
  const text = String(value ?? "").trim();
  if (rule.type === "blank") return text === "";
  if (rule.type === "textContains") return text.toLocaleLowerCase().includes(String(rule.text || "").toLocaleLowerCase());
  if (rule.type === "dateOccurs") return dateMatches(value, rule.timePeriod, context.now?.());
  if (rule.type === "duplicate") {
    if (!text) return false;
    const stats = rangeStats(rule, context);
    return (stats.counts?.get(text.toLocaleLowerCase()) || 0) > 1;
  }
  if (rule.type === "formula") return !!context.formula(rule, col, row);
  if (rule.type === "equal" && typeof rule.value !== "number") return text === String(rule.value);
  const numeric = context.numeric(value);
  if (!Number.isFinite(numeric)) return false;
  if (rule.type === "greaterThan") return numeric > rule.value;
  if (rule.type === "lessThan") return numeric < rule.value;
  if (rule.type === "between") return numeric >= rule.value && numeric <= rule.value2;
  if (rule.type === "equal") return numeric === rule.value;
  const stats = rangeStats(rule, context);
  if (!stats.count) return false;
  if (rule.type === "aboveAverage" || rule.type === "belowAverage") {
    return rule.type === "aboveAverage" ? numeric > stats.average : numeric < stats.average;
  }
  if (["top", "bottom", "topPercent", "bottomPercent"].includes(rule.type)) {
    const top = rule.type === "top" || rule.type === "topPercent";
    const count = rule.type.endsWith("Percent")
      ? Math.max(1, Math.ceil(stats.count * rule.rank / 100))
      : rule.rank;
    const threshold = rankThreshold(stats, top, count);
    return top ? numeric >= threshold : numeric <= threshold;
  }
  return ["dataBar", "colorScale2", "colorScale3", "iconSet"].includes(rule.type);
}

function mixColor(start, end, ratio) {
  const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
  // Excel 2016 truncates the signed channel delta before adding it to the
  // start colour (rather than rounding the final channel value).
  const result = [1, 3, 5].map(offset => channel(start, offset) + Math.trunc((channel(end, offset) - channel(start, offset)) * ratio));
  return `#${result.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

function percentile(stats, percentage) {
  if (!stats.count) return NaN;
  stats.sortedAsc ||= [...stats.nums].sort((a, b) => a - b);
  const position = Math.max(0, Math.min(100, percentage)) / 100 * (stats.count - 1);
  const lower = Math.floor(position), upper = Math.ceil(position);
  if (lower === upper) return stats.sortedAsc[lower];
  return stats.sortedAsc[lower] + (stats.sortedAsc[upper] - stats.sortedAsc[lower]) * (position - lower);
}

function defaultThresholds(rule, count) {
  if (rule.type === "colorScale3") return [{ type: "min" }, { type: "percentile", val: 50 }, { type: "max" }];
  if (rule.type === "iconSet") return Array.from({ length: count }, (_, index) => ({ type: "percent", val: Math.round(index * 100 / count) }));
  return [{ type: "min" }, { type: "max" }];
}

function thresholdValue(item, stats, context, rule) {
  const kind = String(item?.type || "percent");
  if (kind === "min") return stats.min;
  if (kind === "max") return stats.max;
  const value = Number(item?.val);
  if (kind === "num") return value;
  if (kind === "percentile") return percentile(stats, Number.isFinite(value) ? value : 50);
  if (kind === "formula") {
    const evaluated = context.thresholdFormula?.(item?.val, rule);
    return Number.isFinite(Number(evaluated)) ? Number(evaluated) : stats.min;
  }
  const percentage = Number.isFinite(value) ? value : 0;
  return stats.min + (stats.max - stats.min) * percentage / 100;
}

function visualThresholds(rule, count, stats, context) {
  const configured = Array.isArray(rule.thresholds) && rule.thresholds.length === count
    ? rule.thresholds
    : defaultThresholds(rule, count);
  return configured.map(item => ({ value: thresholdValue(item, stats, context, rule), gte: item?.gte !== false }));
}

const ICONS = Object.freeze({
  "3Arrows": ["▼", "▶", "▲"], "3TrafficLights1": ["●", "●", "●"], "3Symbols": ["✕", "!", "✓"],
  "4Arrows": ["▼", "↘", "↗", "▲"], "4Rating": ["●", "●●", "●●●", "●●●●"],
  "5Arrows": ["▼", "↘", "→", "↗", "▲"], "5Rating": ["●", "●●", "●●●", "●●●●", "●●●●●"]
});

export function conditionalVisual(rule, value, context) {
  const numeric = context.numeric(value);
  if (!Number.isFinite(numeric)) return {};
  const stats = rangeStats(rule, context);
  if (!stats.count) return {};
  const clampRatio = (value, low, high) => high === low ? 1 : Math.max(0, Math.min(1, (value - low) / (high - low)));
  if (rule.type === "dataBar") {
    const thresholds = visualThresholds(rule, 2, stats, context);
    return { dataBar: { color: rule.color, percent: Math.round(clampRatio(numeric, thresholds[0].value, thresholds[1].value) * 100) } };
  }
  if (rule.type === "colorScale2") {
    const thresholds = visualThresholds(rule, 2, stats, context);
    return { fill: mixColor(rule.colors[0], rule.colors[1], clampRatio(numeric, thresholds[0].value, thresholds[1].value)) };
  }
  if (rule.type === "colorScale3") {
    const thresholds = visualThresholds(rule, 3, stats, context);
    const midpoint = thresholds[1].value;
    return { fill: numeric <= midpoint
      ? mixColor(rule.colors[0], rule.colors[1], clampRatio(numeric, thresholds[0].value, midpoint))
      : mixColor(rule.colors[1], rule.colors[2], clampRatio(numeric, midpoint, thresholds[2].value)) };
  }
  if (rule.type === "iconSet") {
    const icons = ICONS[rule.iconSet] || ICONS["3TrafficLights1"];
    const thresholds = visualThresholds(rule, icons.length, stats, context);
    let index = 0;
    for (let candidate = 1; candidate < thresholds.length; candidate++) {
      const threshold = thresholds[candidate];
      if (threshold.gte ? numeric >= threshold.value : numeric > threshold.value) index = candidate;
    }
    if (rule.reverse) index = icons.length - 1 - index;
    const palette = index === 0 ? "#dc2626" : index === icons.length - 1 ? "#16a34a" : "#ca8a04";
    return { icon: icons[index], iconColor: palette };
  }
  return {};
}
