/** Pure Pivot Table aggregation for 3T Sheet. */
export class PivotTableEngine {
  static parseRange(range) {
    const match = String(range).trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) throw new Error(t("sheetDialogs.sourceRangeFormat"));
    return { startCol: match[1], startRow: +match[2], endCol: match[3], endRow: +match[4] };
  }

  static columnIndex(name) {
    return [...name].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }

  static columnName(index) {
    let value = index + 1;
    let result = "";
    while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
    return result;
  }

  static readSource(cells, range) {
    const parsed = this.parseRange(range);
    const start = this.columnIndex(parsed.startCol);
    const end = this.columnIndex(parsed.endCol);
    const headers = [];
    for (let col = start; col <= end; col++) headers.push(String(cells.get(`${this.columnName(col)}${parsed.startRow}`)?.val ?? "").trim());
    if (headers.some(header => !header)) throw new Error(t("sheetDialogs.sourceNeedsHeaders"));
    if (new Set(headers).size !== headers.length) throw new Error(t("sheetDialogs.uniqueHeaders"));
    const records = [];
    for (let row = parsed.startRow + 1; row <= parsed.endRow; row++) {
      const record = {};
      let hasValue = false;
      headers.forEach((header, offset) => {
        const value = cells.get(`${this.columnName(start + offset)}${row}`)?.val ?? "";
        record[header] = value;
        if (value !== "") hasValue = true;
      });
      if (hasValue) records.push(record);
    }
    return { headers, records };
  }

  static aggregate(cells, config) {
    const { headers, records } = this.readSource(cells, config.sourceRange);
    const rows = config.rows || [];
    const columns = config.columns || [];
    const values = config.values || [];
    if (!values.length) throw new Error(t("sheetDialogs.selectValue"));
    for (const field of [...rows, ...columns, ...values.map(item => item.field)]) if (!headers.includes(field)) throw new Error(t("sheetDialogs.columnNotFound", { field }));
    const rowKeys = [...new Set(records.map(record => rows.map(field => String(record[field])).join("\u001f")))];
    const columnKeys = [...new Set(records.map(record => columns.map(field => String(record[field])).join("\u001f")))];
    if (!rows.length) rowKeys.splice(0, rowKeys.length, "");
    if (!columns.length) columnKeys.splice(0, columnKeys.length, "");
    const output = [[...rows]];
    for (const columnKey of columnKeys) for (const value of values) output[0].push([columnKey, `${value.aggregate} ${value.field}`].filter(Boolean).join(" — "));
    for (const rowKey of rowKeys) {
      const rowParts = rowKey ? rowKey.split("\u001f") : [];
      const outputRow = [...rowParts];
      for (const columnKey of columnKeys) {
        const columnParts = columnKey ? columnKey.split("\u001f") : [];
        const matching = records.filter(record => rows.every((field, index) => String(record[field]) === rowParts[index]) && columns.every((field, index) => String(record[field]) === columnParts[index]));
        for (const value of values) {
          const nums = matching.map(record => Number(record[value.field])).filter(Number.isFinite);
          const aggregate = String(value.aggregate || "SUM").toUpperCase();
          if (aggregate === "COUNT") outputRow.push(matching.length);
          else if (aggregate === "AVERAGE") outputRow.push(nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
          else if (aggregate === "MIN") outputRow.push(nums.length ? Math.min(...nums) : 0);
          else if (aggregate === "MAX") outputRow.push(nums.length ? Math.max(...nums) : 0);
          else outputRow.push(nums.reduce((a, b) => a + b, 0));
        }
      }
      output.push(outputRow);
    }
    return output;
  }

  static toCells(table) {
    const cells = new Map();
    table.forEach((row, rowIndex) => row.forEach((value, colIndex) => cells.set(`${this.columnName(colIndex)}${rowIndex + 1}`, { val: value, formula: "", style: rowIndex === 0 ? { fontWeight: "bold", backgroundColor: "#E7F4EC" } : {} })));
    return cells;
  }

  static resultRange(table) {
    const rowCount = Math.max(1, table?.length || 0);
    const columnCount = Math.max(1, ...(table || []).map(row => row.length));
    return { start: { c: "A", r: 1 }, end: { c: this.columnName(columnCount - 1), r: rowCount } };
  }
}
import { t } from "../../platform/i18n/i18n.js";
