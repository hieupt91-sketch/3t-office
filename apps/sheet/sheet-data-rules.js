/**
 * Pure data-rule helpers for Sheet validation, advanced filters and colour sort.
 * This module deliberately has no DOM or adapter dependency.
 */

export const VALIDATION_TYPES = Object.freeze([
  "list", "whole", "decimal", "date", "time", "textLength", "custom"
]);

export const VALIDATION_OPERATORS = Object.freeze([
  "between", "notBetween", "equal", "notEqual",
  "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"
]);

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

export function dateToSerial(date) {
  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EXCEL_EPOCH_UTC) / 86400000;
}

export function parseDateValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return NaN;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const vi = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const parts = vi ? [Number(vi[3]), Number(vi[2]), Number(vi[1])] : iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : null;
  if (!parts) return NaN;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2]
    ? dateToSerial(date)
    : NaN;
}

export function parseTimeValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return ((value % 1) + 1) % 1;
  const text = String(value ?? "").trim();
  if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) return ((Number(text) % 1) + 1) % 1;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match) return NaN;
  const hours = Number(match[1]), minutes = Number(match[2]), seconds = Number(match[3] || 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return NaN;
  return (hours * 3600 + minutes * 60 + seconds) / 86400;
}

function finite(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/,/g, ".");
  return normalized && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

function compare(operator, actual, first, second) {
  switch (operator) {
    case "between": return actual >= first && actual <= second;
    case "notBetween": return actual < first || actual > second;
    case "equal": return actual === first;
    case "notEqual": return actual !== first;
    case "greaterThan": return actual > first;
    case "lessThan": return actual < first;
    case "greaterThanOrEqual": return actual >= first;
    case "lessThanOrEqual": return actual <= first;
    default: return false;
  }
}

export function normalizeValidationConfig(config) {
  if (!config || typeof config !== "object") return null;
  if (config.type === "numberRange") {
    const min = finite(config.min), max = finite(config.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
    return { ...config, type: "numberRange", operator: "between", formula1: min, formula2: max, min, max };
  }
  if (!VALIDATION_TYPES.includes(config.type)) return null;
  const common = {
    allowBlank: config.allowBlank !== false,
    showInputMessage: !!config.showInputMessage,
    inputTitle: String(config.inputTitle || ""),
    inputMessage: String(config.inputMessage || ""),
    showErrorMessage: config.showErrorMessage !== false,
    errorStyle: ["stop", "warning", "information"].includes(config.errorStyle) ? config.errorStyle : "stop",
    errorTitle: String(config.errorTitle || ""),
    errorMessage: String(config.errorMessage || "")
  };
  if (config.type === "list") {
    const values = Array.isArray(config.values)
      ? config.values.map(String).map(value => value.trim()).filter(Boolean)
      : String(config.values ?? config.formula1 ?? "").split(/[,;]/).map(value => value.trim()).filter(Boolean);
    if (!values.length) return null;
    return { ...common, type: "list", values: [...new Set(values)], formula1: [...new Set(values)].join(",") };
  }
  if (config.type === "custom") {
    const formula1 = String(config.formula1 || "").trim();
    if (!formula1) return null;
    return { ...common, type: "custom", operator: "equal", formula1: formula1.startsWith("=") ? formula1 : `=${formula1}` };
  }
  const operator = VALIDATION_OPERATORS.includes(config.operator) ? config.operator : "between";
  const convert = config.type === "date" ? parseDateValue : config.type === "time" ? parseTimeValue : finite;
  const formula1 = convert(config.formula1 ?? config.min);
  const formula2 = convert(config.formula2 ?? config.max);
  if (!Number.isFinite(formula1)) return null;
  if (["between", "notBetween"].includes(operator) && (!Number.isFinite(formula2) || (operator === "between" && formula1 > formula2))) return null;
  return { ...common, type: config.type, operator, formula1, formula2: Number.isFinite(formula2) ? formula2 : undefined };
}

export function validateDataRule(rule, value, evaluateFormula) {
  if (!rule) return { valid: true, rule };
  const blank = String(value ?? "").trim() === "";
  if (blank && rule.allowBlank !== false) return { valid: true, rule };
  let valid = false;
  if (rule.type === "list") {
    valid = (rule.values || []).includes(String(value ?? "").trim());
  } else if (rule.type === "custom") {
    try { valid = !!evaluateFormula?.(rule.formula1); } catch { valid = false; }
  } else {
    const type = rule.type === "numberRange" ? "whole" : rule.type;
    const actual = type === "date" ? parseDateValue(value)
      : type === "time" ? parseTimeValue(value)
        : type === "textLength" ? String(value ?? "").length
          : finite(value);
    const first = finite(rule.formula1 ?? rule.min);
    const second = finite(rule.formula2 ?? rule.max);
    valid = Number.isFinite(actual) && (type !== "whole" || Number.isInteger(actual))
      && compare(rule.operator || "between", actual, first, second);
  }
  return { valid, rule };
}

export function defaultValidationMessage(rule) {
  if (rule?.errorMessage) return rule.errorMessage;
  if (rule?.type === "list") return `Giá trị phải thuộc danh sách: ${(rule.values || []).join(", ")}`;
  if (rule?.type === "custom") return "Giá trị không thỏa công thức kiểm tra.";
  const labels = { whole: "số nguyên", numberRange: "số nguyên", decimal: "số", date: "ngày", time: "giờ", textLength: "độ dài văn bản" };
  const operators = {
    between: `từ ${rule?.formula1 ?? rule?.min} đến ${rule?.formula2 ?? rule?.max}`,
    notBetween: `không nằm giữa ${rule?.formula1} và ${rule?.formula2}`,
    equal: `bằng ${rule?.formula1}`, notEqual: `khác ${rule?.formula1}`,
    greaterThan: `lớn hơn ${rule?.formula1}`, lessThan: `nhỏ hơn ${rule?.formula1}`,
    greaterThanOrEqual: `lớn hơn hoặc bằng ${rule?.formula1}`,
    lessThanOrEqual: `nhỏ hơn hoặc bằng ${rule?.formula1}`
  };
  return `Giá trị phải là ${labels[rule?.type] || "dữ liệu"} ${operators[rule?.operator || "between"] || "hợp lệ"}.`;
}

export function cellColor(cell, colorType = "fill") {
  const style = cell?.style || {};
  const raw = colorType === "font" ? style.color : (style.backgroundColor || style.fillColor);
  return String(raw || "").trim().toLowerCase();
}

export function cellDate(cell) {
  const serial = parseDateValue(cell?.val);
  if (!Number.isFinite(serial)) return null;
  const millis = EXCEL_EPOCH_UTC + Math.floor(serial) * 86400000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function matchesFilterCriterion(cell, criterion, context = {}) {
  if (!criterion) return true;
  const value = cell?.val ?? "";
  const text = String(value).toLocaleLowerCase("vi-VN");
  const query = String(criterion.value ?? "").toLocaleLowerCase("vi-VN");
  if (criterion.type === "text") {
    if (criterion.operator === "contains") return text.includes(query);
    if (criterion.operator === "notContains") return !text.includes(query);
    if (criterion.operator === "startsWith") return text.startsWith(query);
    if (criterion.operator === "endsWith") return text.endsWith(query);
    if (criterion.operator === "equal") return text === query;
    if (criterion.operator === "notEqual") return text !== query;
  }
  if (criterion.type === "number") {
    const actual = finite(value);
    if (!Number.isFinite(actual)) return false;
    if (criterion.operator === "top10") return Number.isFinite(context.topThreshold) && actual >= context.topThreshold;
    return compare(criterion.operator, actual, finite(criterion.value), finite(criterion.value2));
  }
  if (criterion.type === "date") {
    const date = cellDate(cell);
    if (!date) return false;
    const today = context.today || new Date();
    if (criterion.operator === "today") return date.getUTCFullYear() === today.getFullYear() && date.getUTCMonth() === today.getMonth() && date.getUTCDate() === today.getDate();
    if (criterion.operator === "thisMonth") return date.getUTCFullYear() === today.getFullYear() && date.getUTCMonth() === today.getMonth();
    if (criterion.operator === "thisYear") return date.getUTCFullYear() === today.getFullYear();
    return compare(criterion.operator, dateToSerial(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), parseDateValue(criterion.value), parseDateValue(criterion.value2));
  }
  if (criterion.type === "color") return cellColor(cell, criterion.colorType) === String(criterion.color || "").toLowerCase();
  return true;
}

