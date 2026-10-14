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
      const key = JSON.stringify(keyColumns.map(col => this.value(col, row)));
      if (seen.has(key)) duplicateRows.push(row); else seen.add(key);
    }
    if (!duplicateRows.length) return { removed: 0, remaining: area.end.r - firstDataRow + 1 };
    return this.snapshotMutation(() => {
      const duplicates = new Set(duplicateRows);
      const shifted = new Map();
      for (const [coord, item] of this.grid.cellsData) {
        const [col, row] = this.grid._splitCoord(coord);
        if (duplicates.has(row)) continue;
        const offset = duplicateRows.filter(removed => removed < row).length;
        shifted.set(`${col}${row - offset}`, structuredClone(item));
      }
      this.grid.sheetsData[this.grid.activeSheet] = shifted;
      this.grid.rowCount -= duplicateRows.length;
      return { removed: duplicateRows.length, remaining: area.end.r - firstDataRow + 1 - duplicateRows.length };
    });
  }

  subtotal({ range = this.grid.selectionRange, groupColumn, valueColumns, operation = "SUM", hasHeader = true } = {}) {
    const area = this.range(range);
    const columns = this.columns(area);
    groupColumn ||= columns[0];
    valueColumns = (valueColumns?.length ? valueColumns : columns.slice(1)).filter(col => columns.includes(col) && col !== groupColumn);
    const firstDataRow = area.start.r + (hasHeader ? 1 : 0);
    if (!columns.includes(groupColumn) || !valueColumns.length || firstDataRow > area.end.r) return false;
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
      const totalStart = targetRow;
      for (const group of groups) {
        const groupStart = targetRow;
        for (const sourceRow of group.rows) {
          for (const col of this.grid.cols) {
            const item = source.get(`${col}${sourceRow}`);
            if (item) output.set(`${col}${targetRow}`, structuredClone(item));
          }
          targetRow++;
        }
        output.set(`${groupColumn}${targetRow}`, { val: `${group.key} Total`, formula: "", style: { fontWeight: "bold" } });
        for (const col of valueColumns) output.set(`${col}${targetRow}`, { val: "", formula: `=${operation}(${col}${groupStart}:${col}${targetRow - 1})`, style: { fontWeight: "bold" } });
        targetRow++;
      }
      output.set(`${groupColumn}${targetRow}`, { val: "Grand Total", formula: "", style: { fontWeight: "bold" } });
      for (const col of valueColumns) {
        const subtotalCells = groups.map((_, index) => {
          let row = firstDataRow;
          for (let i = 0; i <= index; i++) row += groups[i].rows.length + 1;
          return `${col}${row - 1}`;
        });
        output.set(`${col}${targetRow}`, { val: "", formula: `=SUM(${subtotalCells.join(",")})`, style: { fontWeight: "bold" } });
      }
      const inserted = groups.length + 1;
      for (const [coord, item] of source) {
        const [col, row] = this.grid._splitCoord(coord);
        if (row > area.end.r) output.set(`${col}${row + inserted}`, structuredClone(item));
      }
      this.grid.sheetsData[this.grid.activeSheet] = output;
      this.grid.rowCount += inserted;
      this.grid.selectionRange = { start: area.start, end: { c: area.end.c, r: targetRow } };
      return { groups: groups.length, insertedRows: inserted, grandTotalRow: targetRow };
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

  splitText(value, { mode = "delimiter", delimiter = ",", widths = [] } = {}) {
    const text = String(value ?? "");
    if (mode === "fixed") {
      const result = []; let offset = 0;
      for (const width of widths.map(Number).filter(n => n > 0)) { result.push(text.slice(offset, offset + width)); offset += width; }
      result.push(text.slice(offset));
      return result;
    }
    return text.split(delimiter === "space" ? /\s+/ : delimiter === "tab" ? "\t" : delimiter);
  }

  textToColumns(options = {}) {
    const area = this.range(options.range);
    if (area.start.c !== area.end.c) return false;
    const rows = [];
    for (let row = area.start.r; row <= area.end.r; row++) rows.push(this.splitText(this.value(area.start.c, row), options));
    const startCol = this.grid._columnNumber(area.start.c);
    return this.snapshotMutation(() => {
      const needed = startCol + Math.max(...rows.map(parts => parts.length)) - 1;
      while (this.grid.cols.length < needed) this.grid.cols.push(this.grid._columnLabel(this.grid.cols.length + 1));
      rows.forEach((parts, rowIndex) => parts.forEach((part, colIndex) => {
        this.grid.cellsData.set(`${this.grid._columnLabel(startCol + colIndex)}${area.start.r + rowIndex}`, { val: part, formula: "", style: {} });
      }));
      return { rows: rows.length, columns: Math.max(...rows.map(parts => parts.length)) };
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
    if (targetColNo >= 3) for (const sep of [" ", "-", " - ", ""]) candidates.push({ name: `join:${sep}`, apply: row => `${this.value(left2, row)}${sep}${this.value(left1, row)}` });
    const source = row => String(this.value(left1, row));
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
