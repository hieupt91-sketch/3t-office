/** 3T Sheet data transformations. All mutations stay local and are undoable. */
import { translateFormulaRefs } from "./formula-ref-shift.js";
export class SheetDataTools {
  constructor(grid) { this.grid = grid; }

  range(range = this.grid.selectionRange) { return this.grid._normalizeRange(range); }
  columns(range = this.range()) {
    const start = this.grid._columnNumber(range.start.c);
    const end = this.grid._columnNumber(range.end.c);
    return Array.from({ length: end - start + 1 }, (_, i) => this.grid._columnLabel(start + i));
  }
  value(col, row) { return this.grid.cellsData.get(`${col}${row}`)?.val ?? ""; }
  snapshotMutation(mutator) {
    const before = this.grid._snapshotGridStructure();
    const result = mutator();
    if (!result) return false;
    this.grid._renderColumnHeaders();
    this.grid._renderVirtualRows(this.grid.currentStartRow || 1, Math.min(this.grid.currentEndRow || 40, this.grid.rowCount));
    this.grid._recalculateAllFormulas();
    this.grid.refreshCharts();
    this.grid._recordHistory({ type: "grid-structure", sheet: this.grid.activeSheet, before, after: this.grid._snapshotGridStructure() });
    return result;
  }

  removeDuplicates({ range = this.grid.selectionRange, hasHeader = true, columns } = {}) {
    const area = this.range(range);
    const allColumns = this.columns(area);
    const keyColumns = (columns?.length ? columns : allColumns).filter(col => allColumns.includes(col));
    const firstDataRow = area.start.r + (hasHeader ? 1 : 0);
    if (!keyColumns.length || firstDataRow > area.end.r) return false;
    const seen = new Set();
    const duplicateRows = [];
    for (let row = firstDataRow; row <= area.end.r; row++) {
      const key = JSON.stringify(keyColumns.map(col => {
        const val = this.value(col, row);
        return typeof val === "string" ? val.toLowerCase() : (val === "" || val === null || val === undefined ? "" : String(val).toLowerCase());
      }));
      if (seen.has(key)) duplicateRows.push(row); else seen.add(key);
    }
    if (!duplicateRows.length) return { removed: 0, remaining: area.end.r - firstDataRow + 1 };
    return this.snapshotMutation(() => {
      const duplicates = new Set(duplicateRows);
      const isWholeSheetRows = area.start.c === this.grid.cols[0] && area.end.c === this.grid.cols[this.grid.cols.length - 1];
      if (isWholeSheetRows) {
        const shifted = new Map();
        for (const [coord, item] of this.grid.cellsData) {
          const [col, row] = this.grid._splitCoord(coord);
          if (duplicates.has(row)) continue;
          const offset = duplicateRows.filter(removed => removed < row).length;
          shifted.set(`${col}${row - offset}`, structuredClone(item));
        }
        this.grid.sheetsData[this.grid.activeSheet] = shifted;
        this.grid.rowCount = Math.max(1, this.grid.rowCount - duplicateRows.length);
      } else {
        const rowsToKeep = [];
        for (let row = firstDataRow; row <= area.end.r; row++) {
          if (!duplicates.has(row)) rowsToKeep.push(row);
        }
        allColumns.forEach(col => {
          rowsToKeep.forEach((srcRow, idx) => {
            const targetRow = firstDataRow + idx;
            const srcCoord = `${col}${srcRow}`;
            const targetCoord = `${col}${targetRow}`;
            const item = this.grid.cellsData.get(srcCoord);
            if (item) this.grid.cellsData.set(targetCoord, structuredClone(item));
            else this.grid.cellsData.delete(targetCoord);
          });
          for (let r = firstDataRow + rowsToKeep.length; r <= area.end.r; r++) {
            this.grid.cellsData.delete(`${col}${r}`);
          }
        });
      }
      return { removed: duplicateRows.length, remaining: area.end.r - firstDataRow + 1 - duplicateRows.length };
    });
  }

  subtotal({ range = this.grid.selectionRange, groupColumn, valueColumns, operation = "SUM", hasHeader = true, replace = true, summaryBelow = true } = {}) {
    if (replace) {
      this.removeSubtotal(range);
    }
    const area = this.range(range);
    const columns = this.columns(area);
    groupColumn ||= columns[0];
    valueColumns = (valueColumns?.length ? valueColumns : columns.slice(1)).filter(col => columns.includes(col) && col !== groupColumn);
    const firstDataRow = area.start.r + (hasHeader ? 1 : 0);
    if (!columns.includes(groupColumn) || !valueColumns.length || firstDataRow > area.end.r) return false;

    const opKey = String(operation || "SUM").toUpperCase();
    const SUBTOTAL_MAP = {
      SUM: { code: 9, suffix: "Total" },
      COUNT: { code: 3, suffix: "Count" },
      AVERAGE: { code: 1, suffix: "Average" },
      MAX: { code: 4, suffix: "Max" },
      MIN: { code: 5, suffix: "Min" }
    };
    const funcInfo = SUBTOTAL_MAP[opKey] || SUBTOTAL_MAP.SUM;

    const groups = [];
    for (let row = firstDataRow; row <= area.end.r; row++) {
      const key = this.value(groupColumn, row);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) groups.push({ key, rows: [row] }); else last.rows.push(row);
    }
    return this.snapshotMutation(() => {
      const source = this.grid.cellsData;
      const output = new Map();
      for (const [coord, item] of source) {
        const [, row] = this.grid._splitCoord(coord);
        if (row < firstDataRow) output.set(coord, structuredClone(item));
      }
      let targetRow = firstDataRow;
      const outlineGroups = [];

      let lastDetailRow = firstDataRow;
      for (const group of groups) {
        const groupStart = targetRow;
        for (const sourceRow of group.rows) {
          for (const col of this.grid.cols) {
            const item = source.get(`${col}${sourceRow}`);
            if (item) output.set(`${col}${targetRow}`, structuredClone(item));
          }
          targetRow++;
        }
        const groupEnd = targetRow - 1;
        lastDetailRow = groupEnd;
        outlineGroups.push({ id: `outline-${Date.now()}-${outlineGroups.length}`, axis: "row", start: groupStart, end: groupEnd, collapsed: false });

        output.set(`${groupColumn}${targetRow}`, { val: `${group.key} ${funcInfo.suffix}`, formula: "", style: { fontWeight: "bold" } });
        for (const col of valueColumns) {
          output.set(`${col}${targetRow}`, { val: "", formula: `=SUBTOTAL(${funcInfo.code},${col}${groupStart}:${col}${groupEnd})`, style: { fontWeight: "bold" } });
        }
        targetRow++;
      }
      output.set(`${groupColumn}${targetRow}`, { val: `Grand ${funcInfo.suffix}`, formula: "", style: { fontWeight: "bold" } });
      for (const col of valueColumns) {
        output.set(`${col}${targetRow}`, { val: "", formula: `=SUBTOTAL(${funcInfo.code},${col}${firstDataRow}:${col}${lastDetailRow})`, style: { fontWeight: "bold" } });
      }
      const inserted = groups.length + 1;
      for (const [coord, item] of source) {
        const [col, row] = this.grid._splitCoord(coord);
        if (row > area.end.r) output.set(`${col}${row + inserted}`, structuredClone(item));
      }
      this.grid.sheetsData[this.grid.activeSheet] = output;
      this.grid.rowCount += inserted;
      this.grid.selectionRange = { start: area.start, end: { c: area.end.c, r: targetRow } };

      const existingOutlines = this.grid.outlineGroupsBySheet[this.grid.activeSheet] || [];
      this.grid.outlineGroupsBySheet[this.grid.activeSheet] = [...existingOutlines, ...outlineGroups];

      return { groups: groups.length, insertedRows: inserted, grandTotalRow: targetRow };
    });
  }

  removeSubtotal(range = this.grid.selectionRange) {
    const area = this.range(range);
    const subtotalRows = [];
    for (const [coord, item] of this.grid.cellsData) {
      const [, row] = this.grid._splitCoord(coord);
      if (row >= area.start.r && row <= (area.end.r + 20)) {
        if (/^=SUBTOTAL\(/i.test(item?.formula || "") || /^Grand\s+/i.test(String(item?.val || "")) || String(item?.val || "").endsWith(" Total") || String(item?.val || "").endsWith(" Count") || String(item?.val || "").endsWith(" Average") || String(item?.val || "").endsWith(" Max") || String(item?.val || "").endsWith(" Min")) {
          if (!subtotalRows.includes(row)) subtotalRows.push(row);
        }
      }
    }
    if (!subtotalRows.length) return false;
    subtotalRows.sort((a, b) => a - b);
    return this.snapshotMutation(() => {
      const toRemove = new Set(subtotalRows);
      const shifted = new Map();
      for (const [coord, item] of this.grid.cellsData) {
        const [col, row] = this.grid._splitCoord(coord);
        if (toRemove.has(row)) continue;
        const offset = subtotalRows.filter(r => r < row).length;
        shifted.set(`${col}${row - offset}`, structuredClone(item));
      }
      this.grid.sheetsData[this.grid.activeSheet] = shifted;
      this.grid.rowCount = Math.max(1, this.grid.rowCount - subtotalRows.length);
      this.grid.outlineGroupsBySheet[this.grid.activeSheet] = [];
      return { removedRows: subtotalRows.length };
    });
  }

  /**
   * Multi-column sort (Excel "Sort" dialog / Data > Sort): sort by up to
   * a few columns in priority order, each with its own direction. Reuses
   * the same value-comparison rule as the single-column sortAsc/sortDesc
   * ribbon buttons (sheet-grid.js#sort) so results stay consistent
   * whichever entry point the user picks.
   */
  sortMultiLevel({ range = this.grid.selectionRange, hasHeader = true, levels = [] } = {}) {
    const area = this.range(range);
    const allColumns = this.columns(area);
    const validLevels = levels.filter(level => allColumns.includes(level.col)).slice(0, 4);
    const firstDataRow = area.start.r + (hasHeader ? 1 : 0);
    if (!validLevels.length || firstDataRow > area.end.r) return false;

    const compareOne = (a, b, ascending) => {
      const numA = typeof a === "number" ? a : parseFloat(String(a).replace(/\./g, "").replace(/[^\d-]/g, ""));
      const numB = typeof b === "number" ? b : parseFloat(String(b).replace(/\./g, "").replace(/[^\d-]/g, ""));
      if (!isNaN(numA) && !isNaN(numB) && String(a).trim() !== "" && String(b).trim() !== "") {
        return ascending ? numA - numB : numB - numA;
      }
      return ascending
        ? String(a).localeCompare(String(b), "vi-VN")
        : String(b).localeCompare(String(a), "vi-VN");
    };

    const sourceRows = [];
    for (let row = firstDataRow; row <= area.end.r; row++) sourceRows.push(row);
    const sortedRows = [...sourceRows].sort((rowA, rowB) => {
      for (const level of validLevels) {
        const cmp = compareOne(this.value(level.col, rowA), this.value(level.col, rowB), level.ascending !== false);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    if (sortedRows.every((row, index) => row === sourceRows[index])) return { sorted: 0 };

    return this.snapshotMutation(() => {
      // Chỉ các cột trong vùng sắp xếp được di chuyển; công thức dịch tham chiếu tương đối như Excel.
      const rowSnapshots = sortedRows.map(sourceRow => {
        const rowData = {};
        allColumns.forEach(col => {
          const item = this.grid.cellsData.get(`${col}${sourceRow}`);
          if (item) rowData[col] = structuredClone(item);
        });
        return rowData;
      });
      rowSnapshots.forEach((rowData, index) => {
        const targetRow = firstDataRow + index;
        const sourceRow = sortedRows[index];
        allColumns.forEach(col => {
          const key = `${col}${targetRow}`;
          if (rowData[col]) {
            if (rowData[col].formula && targetRow !== sourceRow) rowData[col].formula = translateFormulaRefs(rowData[col].formula, targetRow - sourceRow, 0);
            this.grid.cellsData.set(key, rowData[col]);
          } else this.grid.cellsData.delete(key);
        });
      });
      return { sorted: sortedRows.length };
    });
  }

  splitText(value, { mode = "delimiter", delimiter = ",", widths = [], consecutiveDelimiter = false, textQualifier = "doubleQuote" } = {}) {
    const text = String(value ?? "");
    if (mode === "fixed") {
      const result = []; let offset = 0;
      for (const width of widths.map(Number).filter(n => n > 0)) {
        result.push(text.slice(offset, offset + width));
        offset += width;
      }
      if (offset < text.length) result.push(text.slice(offset));
      return result;
    }
    const sep = delimiter === "space" ? " " : delimiter === "tab" ? "\t" : delimiter;
    if (consecutiveDelimiter && sep === " ") {
      return text.trim() ? text.trim().split(/\s+/) : [""];
    }
    const quoteChar = textQualifier === "singleQuote" ? "'" : textQualifier === "none" ? null : '"';
    if (!quoteChar || !text.includes(quoteChar)) {
      if (consecutiveDelimiter && sep) {
        const parts = text.split(sep);
        const filtered = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === "" && i > 0 && parts[i - 1] === "") continue;
          filtered.push(parts[i]);
        }
        return filtered;
      }
      return text.split(sep);
    }
    const parts = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === quoteChar) {
        if (inQuotes && text[i + 1] === quoteChar) {
          cur += quoteChar;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        if (consecutiveDelimiter && cur === "" && parts.length > 0 && parts[parts.length - 1] === "") {
          // skip duplicate empty
        } else {
          parts.push(cur);
          cur = "";
        }
      } else {
        cur += ch;
      }
    }
    parts.push(cur);
    return parts;
  }

  textToColumns(options = {}) {
    const area = this.range(options.range);
    if (area.start.c !== area.end.c) return false;
    const dest = options.destination
      ? (typeof options.destination === "string"
        ? this.grid._normalizeRange({ start: { c: this.grid._splitCoord(options.destination)[0], r: this.grid._splitCoord(options.destination)[1] }, end: { c: this.grid._splitCoord(options.destination)[0], r: this.grid._splitCoord(options.destination)[1] } }).start
        : options.destination)
      : area.start;
    const rows = [];
    for (let row = area.start.r; row <= area.end.r; row++) {
      rows.push(this.splitText(this.value(area.start.c, row), options));
    }
    const startCol = this.grid._columnNumber(dest.c);
    const destStartRow = dest.r;
    const skipIndices = new Set();
    if (Array.isArray(options.fieldInfo)) {
      options.fieldInfo.forEach(([colIdx, type]) => {
        if (type === 9) skipIndices.add(colIdx - 1);
      });
    }

    return this.snapshotMutation(() => {
      const maxCols = Math.max(...rows.map(parts => parts.filter((_, idx) => !skipIndices.has(idx)).length));
      const needed = startCol + maxCols - 1;
      while (this.grid.cols.length < needed) this.grid.cols.push(this.grid._columnLabel(this.grid.cols.length + 1));

      rows.forEach((parts, rowIndex) => {
        let writtenColOffset = 0;
        parts.forEach((part, origIndex) => {
          if (skipIndices.has(origIndex)) return;
          const targetCoord = `${this.grid._columnLabel(startCol + writtenColOffset)}${destStartRow + rowIndex}`;
          this.grid.cellsData.set(targetCoord, { val: part, formula: "", style: {} });
          writtenColOffset++;
        });
      });
      return { rows: rows.length, columns: maxCols };
    });
  }

  flashFill({ range = this.grid.selectionRange } = {}) {
    const area = this.range(range);
    if (area.start.c !== area.end.c) return false;
    const targetColNo = this.grid._columnNumber(area.start.c), targetCol = area.start.c;
    const left1 = this.grid._columnLabel(targetColNo - 1), left2 = this.grid._columnLabel(targetColNo - 2);
    const examples = [];
    for (let row = area.start.r; row <= area.end.r; row++) if (this.value(targetCol, row) !== "") examples.push({ row, result: String(this.value(targetCol, row)) });
    if (!examples.length || targetColNo < 2) return false;
    const candidates = [];
    if (targetColNo >= 3) {
      for (const sep of [" ", "-", " - ", "", ", "]) {
        candidates.push({ name: `join:${sep}`, apply: row => `${this.value(left2, row)}${sep}${this.value(left1, row)}` });
        candidates.push({ name: `joinRev:${sep}`, apply: row => `${this.value(left1, row)}${sep}${this.value(left2, row)}` });
      }
    }
    const source = row => String(this.value(left1, row));
    candidates.push({ name: "firstWord", apply: row => source(row).trim().split(/\s+/)[0] || "" });
    candidates.push({ name: "lastWord", apply: row => { const w = source(row).trim().split(/\s+/); return w[w.length - 1] || ""; } });
    candidates.push({ name: "firstTwoWords", apply: row => source(row).trim().split(/\s+/).slice(0, 2).join(" ") });
    candidates.push({ name: "titleCase", apply: row => source(row).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) });

    const ex1 = examples[0];
    const src1Digits = String(source(ex1.row)).replace(/\D/g, "");
    const res1Digits = String(ex1.result).replace(/\D/g, "");
    if (src1Digits && src1Digits === res1Digits) {
      const mask = String(ex1.result);
      candidates.push({
        name: "digitMask",
        apply: row => {
          const d = String(source(row)).replace(/\D/g, "");
          let di = 0;
          let out = "";
          for (let i = 0; i < mask.length; i++) {
            if (/\d/.test(mask[i])) {
              out += d[di++] || "";
            } else {
              out += mask[i];
            }
          }
          return out;
        }
      });
    }

    for (let n = 1; n <= 12; n++) {
      candidates.push({ name: `first:${n}`, apply: row => source(row).slice(0, n) });
      candidates.push({ name: `last:${n}`, apply: row => source(row).slice(-n) });
    }
    const pattern = candidates.find(candidate => examples.every(example => candidate.apply(example.row) === example.result));
    if (!pattern) return false;
    return this.snapshotMutation(() => {
      let filled = 0;
      for (let row = area.start.r; row <= area.end.r; row++) if (this.value(targetCol, row) === "") {
        this.grid.cellsData.set(`${targetCol}${row}`, { val: pattern.apply(row), formula: "", style: {} }); filled++;
      }
      return { filled, pattern: pattern.name };
    });
  }
}
