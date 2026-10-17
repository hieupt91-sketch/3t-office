import { t } from "../../platform/i18n/i18n.js";

/** Pure Pivot Table aggregation for 3T Sheet with Parity for Excel 2016. */
export class PivotTableEngine {
  static parseRange(range) {
    let clean = String(range || "").trim().toUpperCase();
    if (clean.includes("!")) clean = clean.split("!").pop().trim();
    clean = clean.replace(/\$/g, "");
    const match = clean.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
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

  static parseDateValue(raw) {
    if (raw instanceof Date && !isNaN(raw)) return raw;
    if (typeof raw === "number" && raw > 0) {
      // Excel serial date: 1 = 1900-01-01 (treating 1900 leap day offset)
      const msPerDay = 86400000;
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(epoch.getTime() + Math.round(raw * msPerDay));
    }
    const str = String(raw || "").trim();
    if (!str) return null;
    const mIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (mIso) return new Date(Date.UTC(+mIso[1], +mIso[2] - 1, +mIso[3]));
    const mDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (mDmy) return new Date(Date.UTC(+mDmy[3], +mDmy[2] - 1, +mDmy[1]));
    const parsed = new Date(str);
    return isNaN(parsed) ? null : parsed;
  }

  static formatNumberGroup(val, group) {
    const num = Number(val);
    if (!Number.isFinite(num)) return String(val ?? "");
    const start = Number(group.start) || 0;
    const end = Number(group.end) || 0;
    const by = Math.max(1, Number(group.by) || 1);
    if (num < start) return `<${start}`;
    if (num > end) return `>${end}`;
    const bucketIndex = Math.floor((num - start) / by);
    const bStart = start + bucketIndex * by;
    let bEnd = bStart + by - 1;
    if (bStart + by >= end) bEnd = end;
    return bStart === bEnd ? String(bStart) : `${bStart}-${bEnd}`;
  }

  static formatDateGroup(val, period) {
    const d = this.parseDateValue(val);
    if (!d) return String(val ?? "");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (period === "months") return months[d.getUTCMonth()];
    if (period === "quarters") return "Qtr" + (Math.floor(d.getUTCMonth() / 3) + 1);
    if (period === "years") return String(d.getUTCFullYear());
    if (period === "days") return `${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}`;
    return String(val ?? "");
  }

  static evaluateCalculatedFieldFormula(formula, fieldValues) {
    let expr = String(formula || "").trim();
    if (expr.startsWith("=")) expr = expr.slice(1).trim();
    if (!expr) return 0;
    const sortedFields = Object.keys(fieldValues).sort((a, b) => b.length - a.length);
    for (const field of sortedFields) {
      const val = Number(fieldValues[field]) || 0;
      const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexQuoted = new RegExp(`['"\\[]${escaped}['"\\]]`, "gi");
      expr = expr.replace(regexQuoted, `(${val})`);
      const regexWord = new RegExp(`\\b${escaped}\\b`, "gi");
      expr = expr.replace(regexWord, `(${val})`);
    }
    try {
      const sanitized = expr.replace(/\^/g, "**");
      if (!/^[0-9eE.+\-*/%() \t\n\r]+$/.test(sanitized)) {
        return 0;
      }
      const fn = new Function(`return (${sanitized});`);
      const res = fn();
      return Number.isFinite(res) ? res : 0;
    } catch {
      return 0;
    }
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

  static changeSource(config, newHeaders) {
    const rows = (config.rows || []).filter(field => newHeaders.includes(field));
    const columns = (config.columns || []).filter(field => newHeaders.includes(field));
    const calcNames = (config.calculatedFields || []).map(item => item.name);
    let values = (config.values || []).filter(item => newHeaders.includes(item.field) || calcNames.includes(item.field));
    if (!values.length && newHeaders.length > 0) {
      // Pick first non-row/column field as default value field if all were dropped
      const available = newHeaders.find(h => !rows.includes(h) && !columns.includes(h)) || newHeaders[0];
      values = [{ field: available, aggregate: "SUM" }];
    }
    return { rows, columns, values };
  }

  static aggregate(cells, config) {
    const { headers, records } = this.readSource(cells, config.sourceRange);
    let rows = [...(config.rows || [])];
    const columns = [...(config.columns || [])];
    const values = config.values || [];
    const grouping = config.grouping || {};
    const calculatedFields = config.calculatedFields || [];
    const calcNames = calculatedFields.map(item => item.name);

    if (!values.length && !rows.length && !columns.length) throw new Error(t("sheetDialogs.selectValue"));
    for (const field of [...rows, ...columns, ...values.map(item => item.field)]) {
      if (!headers.includes(field) && !calcNames.includes(field)) {
        throw new Error(t("sheetDialogs.columnNotFound", { field }));
      }
    }

    // Process transformed records with grouping
    const transformedRecords = records.map(record => {
      const copy = { ...record };
      for (const [field, groupDef] of Object.entries(grouping)) {
        if (!groupDef || !headers.includes(field)) continue;
        if (groupDef.type === "number") {
          copy[field] = this.formatNumberGroup(record[field], groupDef);
        } else if (groupDef.type === "date") {
          const periods = Array.isArray(groupDef.periods) && groupDef.periods.length ? groupDef.periods : ["months"];
          if (periods.length === 1) {
            copy[field] = this.formatDateGroup(record[field], periods[0]);
          } else {
            // Multi-level date grouping (e.g., ["years", "quarters"] or ["years", "months"])
            periods.forEach((period, idx) => {
              const subField = idx === 0 ? `${field} (${period[0].toUpperCase() + period.slice(1)})` : (idx === 1 && periods.length > 2 ? `${field} (${period[0].toUpperCase() + period.slice(1)})` : field);
              copy[subField] = this.formatDateGroup(record[field], period);
            });
          }
        }
      }
      return copy;
    });

    // Expand rows for multi-period date grouping if needed
    for (const [field, groupDef] of Object.entries(grouping)) {
      if (groupDef?.type === "date" && Array.isArray(groupDef.periods) && groupDef.periods.length > 1) {
        const rowIndex = rows.indexOf(field);
        if (rowIndex !== -1) {
          const expanded = groupDef.periods.map((period, idx) => {
            return idx === 0 ? `${field} (${period[0].toUpperCase() + period.slice(1)})` : (idx === 1 && groupDef.periods.length > 2 ? `${field} (${period[0].toUpperCase() + period.slice(1)})` : field);
          });
          rows.splice(rowIndex, 1, ...expanded);
        }
      }
    }

    // Sort helper for grouped keys
    const sortGroupKeys = (keys, fields) => {
      return keys.sort((a, b) => {
        const partsA = a.split("\u001f");
        const partsB = b.split("\u001f");
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          const groupDef = grouping[field];
          const valA = partsA[i] ?? "";
          const valB = partsB[i] ?? "";
          if (groupDef?.type === "number") {
            const numVal = s => {
              if (s.startsWith("<")) return Number(s.slice(1)) - 0.5;
              if (s.startsWith(">")) return Number(s.slice(1)) + 0.5;
              const [from] = s.split("-");
              return Number(from) || 0;
            };
            const diff = numVal(valA) - numVal(valB);
            if (diff !== 0) return diff;
          } else if (groupDef?.type === "date") {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const idxA = months.indexOf(valA);
            const idxB = months.indexOf(valB);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (valA.startsWith("Qtr") && valB.startsWith("Qtr")) return valA.localeCompare(valB);
          }
          const comp = valA.localeCompare(valB, undefined, { numeric: true });
          if (comp !== 0) return comp;
        }
        return 0;
      });
    };

    let rowKeys = [...new Set(transformedRecords.map(record => rows.map(field => String(record[field] ?? "")).join("\u001f")))];
    let columnKeys = [...new Set(transformedRecords.map(record => columns.map(field => String(record[field] ?? "")).join("\u001f")))];

    if (Object.keys(grouping).length) {
      rowKeys = sortGroupKeys(rowKeys, rows);
      columnKeys = sortGroupKeys(columnKeys, columns);
    }

    if (!rows.length) rowKeys.splice(0, rowKeys.length, "");
    if (!columns.length) columnKeys.splice(0, columnKeys.length, "");

    const output = [[...(config.rowHeader ? [config.rowHeader] : rows)]];
    for (const columnKey of columnKeys) {
      for (const value of values) {
        const prefix = config.useSumOfPrefix ? "Sum of" : (value.aggregate || "SUM");
        output[0].push([columnKey, `${prefix} ${value.field}`].filter(Boolean).join(" — "));
      }
    }

    for (const rowKey of rowKeys) {
      const rowParts = rowKey ? rowKey.split("\u001f") : [];
      const outputRow = [...rowParts];
      for (const columnKey of columnKeys) {
        const columnParts = columnKey ? columnKey.split("\u001f") : [];
        const matching = transformedRecords.filter(record =>
          rows.every((field, index) => String(record[field] ?? "") === rowParts[index]) &&
          columns.every((field, index) => String(record[field] ?? "") === columnParts[index])
        );

        for (const value of values) {
          const calc = calculatedFields.find(c => c.name === value.field);
          if (calc) {
            // Excel parity: calculated fields evaluate the formula on the SUM of underlying fields
            const fieldValues = {};
            for (const h of headers) {
              fieldValues[h] = matching.reduce((sum, rec) => sum + (Number(rec[h]) || 0), 0);
            }
            const res = this.evaluateCalculatedFieldFormula(calc.formula, fieldValues);
            outputRow.push(res);
          } else {
            const nums = matching.map(record => Number(record[value.field])).filter(Number.isFinite);
            const aggregate = String(value.aggregate || "SUM").toUpperCase();
            if (aggregate === "COUNT") outputRow.push(matching.length);
            else if (aggregate === "AVERAGE") outputRow.push(nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
            else if (aggregate === "MIN") outputRow.push(nums.length ? Math.min(...nums) : 0);
            else if (aggregate === "MAX") outputRow.push(nums.length ? Math.max(...nums) : 0);
            else outputRow.push(nums.reduce((a, b) => a + b, 0));
          }
        }
      }
      output.push(outputRow);
    }

    if (config.showGrandTotal && values.length > 0) {
      const grandTotalRow = ["Grand Total"];
      for (const columnKey of columnKeys) {
        const columnParts = columnKey ? columnKey.split("\u001f") : [];
        const matching = transformedRecords.filter(record =>
          columns.every((field, index) => String(record[field] ?? "") === columnParts[index])
        );
        for (const value of values) {
          const calc = calculatedFields.find(c => c.name === value.field);
          if (calc) {
            const fieldValues = {};
            for (const h of headers) {
              fieldValues[h] = matching.reduce((sum, rec) => sum + (Number(rec[h]) || 0), 0);
            }
            grandTotalRow.push(this.evaluateCalculatedFieldFormula(calc.formula, fieldValues));
          } else {
            const nums = matching.map(record => Number(record[value.field])).filter(Number.isFinite);
            const aggregate = String(value.aggregate || "SUM").toUpperCase();
            if (aggregate === "COUNT") grandTotalRow.push(matching.length);
            else if (aggregate === "AVERAGE") grandTotalRow.push(nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
            else if (aggregate === "MIN") grandTotalRow.push(nums.length ? Math.min(...nums) : 0);
            else if (aggregate === "MAX") grandTotalRow.push(nums.length ? Math.max(...nums) : 0);
            else grandTotalRow.push(nums.reduce((a, b) => a + b, 0));
          }
        }
      }
      output.push(grandTotalRow);
    }
    return output;
  }

  static toCells(table, originCoord = "A1") {
    const cells = new Map();
    const match = String(originCoord || "A1").toUpperCase().match(/^([A-Z]+)(\d+)$/);
    const startColIndex = match ? this.columnIndex(match[1]) : 0;
    const startRowIndex = match ? +match[2] : 1;
    table.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
      const coord = `${this.columnName(startColIndex + colIndex)}${startRowIndex + rowIndex}`;
      cells.set(coord, {
        val: value,
        formula: "",
        style: rowIndex === 0 ? { fontWeight: "bold", backgroundColor: "#E7F4EC" } : {}
      });
    }));
    return cells;
  }

  static resultRange(table, originCoord = "A1") {
    const match = String(originCoord || "A1").toUpperCase().match(/^([A-Z]+)(\d+)$/);
    const startColIndex = match ? this.columnIndex(match[1]) : 0;
    const startRowIndex = match ? +match[2] : 1;
    const rowCount = Math.max(1, table?.length || 0);
    const columnCount = Math.max(1, ...(table || []).map(row => row.length));
    return {
      start: { c: this.columnName(startColIndex), r: startRowIndex },
      end: { c: this.columnName(startColIndex + columnCount - 1), r: startRowIndex + rowCount - 1 }
    };
  }
}
