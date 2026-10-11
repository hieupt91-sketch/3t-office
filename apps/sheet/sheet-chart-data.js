import { SHEET_CHART_TYPES } from "./sheet-chart-types.js";

export function numberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(/[₫%]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.+-]/g, "");
  if (!normalized || !/\d/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractSheetRangeData(cellsData, range, columns) {
  const left = Math.min(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
  const right = Math.max(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
  const top = Math.min(range.start.r, range.end.r);
  const bottom = Math.max(range.start.r, range.end.r);
  const labels = [], data = [];
  for (let row = top; row <= bottom; row++) {
    const values = [];
    for (let col = left; col <= right; col++) values.push(cellsData.get(`${columns[col]}${row}`)?.val ?? "");
    let valueIndex = values.findIndex((value, index) => index > 0 && numberValue(value) !== null);
    if (valueIndex < 0) valueIndex = values.findIndex(value => numberValue(value) !== null);
    if (valueIndex < 0) continue;
    labels.push(valueIndex > 0 && String(values[0]).trim() ? String(values[0]) : `${columns[left + valueIndex]}${row}`);
    data.push(numberValue(values[valueIndex]));
  }
  return { labels, data };
}

export { SHEET_CHART_TYPES };
