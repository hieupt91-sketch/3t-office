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
  const chartData = extractSheetChartData(cellsData, range, columns);
  return { labels: chartData.labels, data: chartData.series[0]?.values || [] };
}

/**
 * Read a rectangular source as chart categories plus numeric series. The first
 * row/column is treated as labels when it contains text. switchRowsColumns
 * makes each data row a series, matching the familiar chart command.
 */
export function extractSheetChartData(cellsData, range, columns, switchRowsColumns = false) {
  const left = Math.min(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
  const right = Math.max(columns.indexOf(range.start.c), columns.indexOf(range.end.c));
  const top = Math.min(range.start.r, range.end.r);
  const bottom = Math.max(range.start.r, range.end.r);
  const valueAt = (col, row) => cellsData.get(`${columns[col]}${row}`)?.val ?? "";
  const isChartNumber = value => typeof value === "number"
    ? Number.isFinite(value)
    : Boolean(String(value ?? "").trim()) && !/[\p{L}]/u.test(String(value)) && numberValue(value) !== null;
  const firstColHasText = Array.from({ length: bottom - top + 1 }, (_, offset) => valueAt(left, top + offset))
    .some(value => String(value).trim() && !isChartNumber(value));
  const dataLeft = firstColHasText && left < right ? left + 1 : left;
  const firstRowHasText = Array.from({ length: right - dataLeft + 1 }, (_, offset) => valueAt(dataLeft + offset, top))
    .some(value => String(value).trim() && !isChartNumber(value));
  const dataTop = firstRowHasText && top < bottom ? top + 1 : top;
  const labels = [];
  const series = [];

  if (switchRowsColumns) {
    for (let col = dataLeft; col <= right; col++) {
      const raw = valueAt(col, top);
      labels.push(firstRowHasText && String(raw).trim() ? String(raw) : columns[col]);
    }
    for (let row = dataTop; row <= bottom; row++) {
      const values = [];
      for (let col = dataLeft; col <= right; col++) values.push(numberValue(valueAt(col, row)) ?? 0);
      if (!values.length) continue;
      const rawName = valueAt(left, row);
      series.push({
        name: firstColHasText && String(rawName).trim() ? String(rawName) : `Series ${series.length + 1}`,
        values,
        orientation: "row",
        start: { c: columns[dataLeft], r: row },
        end: { c: columns[right], r: row },
        labelCell: firstColHasText ? { c: columns[left], r: row } : null
      });
    }
  } else {
    for (let row = dataTop; row <= bottom; row++) {
      const raw = valueAt(left, row);
      labels.push(firstColHasText && String(raw).trim() ? String(raw) : `${columns[dataLeft]}${row}`);
    }
    for (let col = dataLeft; col <= right; col++) {
      const values = [];
      let hasNumeric = false;
      for (let row = dataTop; row <= bottom; row++) {
        const value = numberValue(valueAt(col, row));
        if (value !== null) hasNumeric = true;
        values.push(value ?? 0);
      }
      if (!hasNumeric) continue;
      const rawName = valueAt(col, top);
      series.push({
        name: firstRowHasText && String(rawName).trim() ? String(rawName) : `Series ${series.length + 1}`,
        values,
        orientation: "column",
        start: { c: columns[col], r: dataTop },
        end: { c: columns[col], r: bottom },
        labelCell: firstRowHasText ? { c: columns[col], r: top } : null
      });
    }
  }
  return {
    labels,
    series,
    categoryStart: switchRowsColumns
      ? { c: columns[dataLeft], r: top }
      : (firstColHasText ? { c: columns[left], r: dataTop } : null),
    categoryEnd: switchRowsColumns
      ? { c: columns[right], r: top }
      : (firstColHasText ? { c: columns[left], r: bottom } : null),
    dataTop,
    dataLeft
  };
}

export { SHEET_CHART_TYPES };
