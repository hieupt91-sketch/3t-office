/**
 * VN Sheet — Hợp nhất dữ liệu (Consolidate).
 *
 * Gộp nhiều vùng (có thể từ các trang tính khác nhau trong cùng workbook)
 * thành một bảng tại ô đang chọn. Phép tính gọi lại SUM / AVERAGE / COUNT /
 * MAX / MIN của FormulaEngine — không viết lại logic tính toán.
 *
 * Hai chế độ:
 * - Theo vị trí (không tick nhãn): mọi vùng phải cùng kích thước; ô (r,c)
 *   đích = hàm(các ô cùng offset trong từng vùng nguồn).
 * - Theo nhãn (tick hàng trên và/hoặc cột trái): khớp nhãn không phân biệt
 *   hoa thường sau trim. Trục không có nhãn vẫn theo vị trí và yêu cầu cùng
 *   số hàng/cột dữ liệu. Nhãn trùng trong một vùng: lần xuất hiện sau ghi đè.
 */

export const CONSOLIDATE_FUNCTIONS = ["SUM", "AVERAGE", "COUNT", "MAX", "MIN"];

export function quoteSheetName(name) {
  const sheet = String(name || "");
  if (/^[A-Za-z0-9_.]+$/.test(sheet)) return sheet;
  return `'${sheet.replace(/'/g, "''")}'`;
}

export function formatSheetRange(sheet, rangeLabel) {
  return `${quoteSheetName(sheet)}!${rangeLabel}`;
}

export function parseConsolidateReference(engine, text, fallbackSheet) {
  const raw = String(text || "").trim();
  if (!raw) return { error: "empty" };
  const parsed = engine._parseReference(raw);
  if (parsed.error) return { error: parsed.error };
  const sheet = parsed.sheet || fallbackSheet || null;
  if (!sheet) return { error: "#REF!" };
  if (typeof engine.sheetResolver === "function" && !engine.sheetResolver(sheet)) {
    return { error: "#REF!" };
  }
  const ref = String(parsed.ref || "").replace(/\$/g, "").toUpperCase();
  const ranged = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  const single = ref.match(/^([A-Z]+)(\d+)$/);
  const match = ranged || single;
  if (!match) return { error: "#REF!" };
  const startName = match[1];
  const startRow = Number(match[2]);
  const endName = match[3] || match[1];
  const endRow = Number(match[4] || match[2]);
  const startIndex = engine._columnIndex(startName);
  const endIndex = engine._columnIndex(endName);
  const col0 = Math.min(startIndex, endIndex);
  const col1 = Math.max(startIndex, endIndex);
  const row0 = Math.min(startRow, endRow);
  const row1 = Math.max(startRow, endRow);
  const startCol = engine._columnName(col0);
  const endCol = engine._columnName(col1);
  const label = startCol === endCol && row0 === row1 ? `${startCol}${row0}` : `${startCol}${row0}:${endCol}${row1}`;
  return {
    sheet,
    ref: `${startCol}${row0}:${endCol}${row1}`,
    startCol,
    startRow: row0,
    endCol,
    endRow: row1,
    width: col1 - col0 + 1,
    height: row1 - row0 + 1,
    display: `${quoteSheetName(sheet)}!${label}`
  };
}

function cellRef(engine, sheet, colIndex, row) {
  return `${quoteSheetName(sheet)}!${engine._columnName(colIndex)}${row}`;
}

export function evaluateConsolidateFunction(engine, functionName, refs) {
  if (!refs.length) return "";
  return engine.evaluate(`=${functionName}(${refs.join(",")})`);
}

function labelKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function readRawLabel(engine, sheet, colIndex, row) {
  const map = (sheet && typeof engine.sheetResolver === "function")
    ? engine.sheetResolver(sheet)
    : engine.cellsMap;
  const item = map?.get?.(`${engine._columnName(colIndex)}${row}`);
  if (!item) return "";
  const raw = item.val;
  if (raw == null || raw === "") return "";
  return String(raw).trim();
}

function readLabeledTable(engine, parsed, { topRow, leftColumn }) {
  const startCol = engine._columnIndex(parsed.startCol);
  const endCol = engine._columnIndex(parsed.endCol);
  const dataStartCol = startCol + (leftColumn ? 1 : 0);
  const dataStartRow = parsed.startRow + (topRow ? 1 : 0);
  if (dataStartCol > endCol || dataStartRow > parsed.endRow) return { error: "no-data" };

  const colKeys = [];
  const colLabels = {};
  for (let col = dataStartCol; col <= endCol; col++) {
    let key;
    if (topRow) {
      const label = readRawLabel(engine, parsed.sheet, col, parsed.startRow);
      key = labelKey(label);
      if (!key) continue;
      if (!colKeys.includes(key)) colKeys.push(key);
      if (!colLabels[key]) colLabels[key] = label;
    } else {
      key = `#c${col - dataStartCol}`;
      colKeys.push(key);
    }
  }

  const rowKeys = [];
  const rowLabels = {};
  for (let row = dataStartRow; row <= parsed.endRow; row++) {
    let key;
    if (leftColumn) {
      const label = readRawLabel(engine, parsed.sheet, startCol, row);
      key = labelKey(label);
      if (!key) continue;
      if (!rowKeys.includes(key)) rowKeys.push(key);
      if (!rowLabels[key]) rowLabels[key] = label;
    } else {
      key = `#r${row - dataStartRow}`;
      rowKeys.push(key);
    }
  }

  const lookup = new Map();
  for (let row = dataStartRow; row <= parsed.endRow; row++) {
    const rowKey = leftColumn
      ? labelKey(readRawLabel(engine, parsed.sheet, startCol, row))
      : `#r${row - dataStartRow}`;
    if (!rowKey || !rowKeys.includes(rowKey)) continue;
    for (let col = dataStartCol; col <= endCol; col++) {
      const colKey = topRow
        ? labelKey(readRawLabel(engine, parsed.sheet, col, parsed.startRow))
        : `#c${col - dataStartCol}`;
      if (!colKey || !colKeys.includes(colKey)) continue;
      lookup.set(`${rowKey}\0${colKey}`, cellRef(engine, parsed.sheet, col, row));
    }
  }

  return { colKeys, rowKeys, colLabels, rowLabels, lookup };
}

function uniqueKeys(tables, field) {
  const seen = new Set();
  const order = [];
  for (const table of tables) {
    for (const key of table[field]) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      order.push(key);
    }
  }
  return order;
}

/**
 * @param {object} options
 * @param {import("./formula-engine.js").FormulaEngine} options.engine
 * @param {string} options.functionName
 * @param {string[]} options.references
 * @param {boolean} [options.topRow]
 * @param {boolean} [options.leftColumn]
 * @param {string} [options.fallbackSheet]
 */
export function computeConsolidate({
  engine,
  functionName,
  references,
  topRow = false,
  leftColumn = false,
  fallbackSheet
} = {}) {
  const func = String(functionName || "SUM").toUpperCase();
  if (!CONSOLIDATE_FUNCTIONS.includes(func)) return { ok: false, error: "bad-function" };

  const list = Array.isArray(references) ? references.map(item => String(item || "").trim()).filter(Boolean) : [];
  if (!list.length) return { ok: false, error: "no-references" };

  const parsed = [];
  for (const text of list) {
    const item = parseConsolidateReference(engine, text, fallbackSheet);
    if (item.error) return { ok: false, error: "bad-reference", reference: text, code: item.error };
    parsed.push(item);
  }

  if (!topRow && !leftColumn) {
    const width = parsed[0].width;
    const height = parsed[0].height;
    if (parsed.some(item => item.width !== width || item.height !== height)) {
      return { ok: false, error: "size-mismatch" };
    }
    const cells = [];
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const refs = parsed.map(item =>
          cellRef(engine, item.sheet, engine._columnIndex(item.startCol) + col, item.startRow + row)
        );
        const formulaUsed = `=${func}(${refs.join(",")})`;
        cells.push({
          rowOffset: row,
          colOffset: col,
          value: evaluateConsolidateFunction(engine, func, refs),
          formulaUsed
        });
      }
    }
    return { ok: true, mode: "position", width, height, cells, functionName: func, sources: parsed };
  }

  const tables = parsed.map(item => readLabeledTable(engine, item, { topRow, leftColumn }));
  const failed = tables.find(item => item.error);
  if (failed) return { ok: false, error: failed.error };

  if (topRow && !leftColumn) {
    const rows = tables[0].rowKeys.length;
    if (!rows || tables.some(item => item.rowKeys.length !== rows)) {
      return { ok: false, error: "size-mismatch-rows" };
    }
  }
  if (leftColumn && !topRow) {
    const cols = tables[0].colKeys.length;
    if (!cols || tables.some(item => item.colKeys.length !== cols)) {
      return { ok: false, error: "size-mismatch-cols" };
    }
  }

  const colOrder = uniqueKeys(tables, "colKeys");
  const rowOrder = uniqueKeys(tables, "rowKeys");
  if (!colOrder.length || !rowOrder.length) return { ok: false, error: "no-data" };

  const cells = [];
  const colBase = leftColumn ? 1 : 0;
  const rowBase = topRow ? 1 : 0;
  if (topRow && leftColumn) cells.push({ rowOffset: 0, colOffset: 0, value: "", isLabel: true });
  if (topRow) {
    colOrder.forEach((key, index) => {
      const label = tables.map(item => item.colLabels[key]).find(Boolean) || key;
      cells.push({ rowOffset: 0, colOffset: colBase + index, value: label, isLabel: true });
    });
  }
  if (leftColumn) {
    rowOrder.forEach((key, index) => {
      const label = tables.map(item => item.rowLabels[key]).find(Boolean) || key;
      cells.push({ rowOffset: rowBase + index, colOffset: 0, value: label, isLabel: true });
    });
  }

  rowOrder.forEach((rowKey, rowIndex) => {
    colOrder.forEach((colKey, colIndex) => {
      const refs = [];
      for (const table of tables) {
        const ref = table.lookup.get(`${rowKey}\0${colKey}`);
        if (ref) refs.push(ref);
      }
      const formulaUsed = refs.length ? `=${func}(${refs.join(",")})` : "";
      cells.push({
        rowOffset: rowBase + rowIndex,
        colOffset: colBase + colIndex,
        value: refs.length ? evaluateConsolidateFunction(engine, func, refs) : "",
        formulaUsed
      });
    });
  });

  return {
    ok: true,
    mode: "label",
    width: colBase + colOrder.length,
    height: rowBase + rowOrder.length,
    cells,
    functionName: func,
    sources: parsed
  };
}
