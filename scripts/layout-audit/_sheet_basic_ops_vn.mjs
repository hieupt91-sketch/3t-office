import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [root, casesPath, outDir] = process.argv.slice(2);
if (!root || !casesPath || !outDir) {
  throw new Error("Usage: node _sheet_basic_ops_vn.mjs <worktree> <cases.json> <out-dir>");
}

const { SheetGridController } = await import(pathToFileURL(path.join(root, "apps/sheet/sheet-grid.js")));
const { SheetAdapter } = await import(pathToFileURL(path.join(root, "adapters/libreoffice/sheet/sheet-adapter.js")));
const { NumberFormatter } = await import(pathToFileURL(path.join(root, "apps/sheet/number-formatter.js")));
const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

function makeContainer() {
  const classes = new Set();
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, force) { force ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

function coord(address) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (!match) throw new Error("Invalid cell address: " + address);
  return { c: match[1].toUpperCase(), r: Number(match[2]) };
}

function range(grid, address) {
  const parts = address.split(":");
  const start = coord(parts[0]);
  const end = coord(parts[1] || parts[0]);
  grid.selectionRange = { start, end };
  grid.selectedCoord = { ...start };
  return grid._normalizeRange(grid.selectionRange);
}

function setNumberFormat(grid, address, format) {
  const target = range(grid, address);
  grid.applyNumberFormat(format, target, true);
}

function copyModel(grid, address) {
  const target = range(grid, address);
  const cells = [];
  for (let row = target.start.r; row <= target.end.r; row++) {
    const line = [];
    for (let col = grid._columnNumber(target.start.c); col <= grid._columnNumber(target.end.c); col++) {
      const key = grid._columnLabel(col) + row;
      line.push(structuredClone(grid.cellsData.get(key) || { val: "", formula: "", style: {} }));
    }
    cells.push(line);
  }
  return { range: target, cells };
}

function snapshot(grid, item) {
  const watched = {};
  for (const address of item.watch || []) {
    const cell = grid.cellsData.get(address) || { val: "", formula: "", style: {} };
    const formatted = NumberFormatter.formatValue(cell.val, {
      ...cell.style?.numberFormat,
      locale: grid.locale,
      dateLocale: grid.inputLocale
    });
    watched[address] = {
      value: cell.val ?? "",
      formula: cell.formula || "",
      text: formatted.text ?? "",
      numberFormat: cell.style?.numberFormat || null,
      alignment: cell.style?.textAlign || (typeof cell.val === "number" ? formatted.align || "right" : "left"),
      verticalAlignment: cell.style?.verticalAlign || "",
      wrapText: cell.style?.whiteSpace === "normal"
    };
  }
  const rows = {};
  for (const row of item.rows || []) rows[String(row)] = grid.getRowHeight(row);
  const columns = {};
  for (const col of item.columns || []) columns[col] = grid.getColumnWidth(col);
  return {
    cells: watched,
    rows,
    columns,
    mergedRanges: (grid.getMergedRanges?.() || []).map(entry =>
      grid._rangeLabel(entry)
    ).sort(),
    hiddenRows: [...(grid.hiddenRows || [])].sort((a, b) => a - b),
    frozen: { rows: grid.frozenRows || 0, columns: grid.frozenCols || 0 },
    filterActive: !!grid.isFilterActive
  };
}

function applyAction(grid, adapter, action) {
  switch (action.type) {
    case "format":
      setNumberFormat(grid, action.range, action.format);
      break;
    case "copyPaste": {
      range(grid, action.from);
      return adapter._copySelectedCell(false).then(() => {
        grid.selectCell(coord(action.to).c, coord(action.to).r);
        return adapter._pasteIntoSelectedCell();
      });
    }
    case "cutPaste": {
      range(grid, action.from);
      return adapter._copySelectedCell(true).then(() => {
        grid.selectCell(coord(action.to).c, coord(action.to).r);
        return adapter._pasteIntoSelectedCell();
      });
    }
    case "pasteSpecial":
      grid.applyPasteSpecial(copyModel(grid, action.from), action.mode, coord(action.to));
      break;
    case "fill": {
      const source = range(grid, action.source);
      grid._executeAutofill(source, action.target);
      break;
    }
    case "insertRow":
      grid.insertRow(action.row);
      break;
    case "deleteRow":
      grid.deleteRow(action.row);
      break;
    case "insertColumn":
      grid.insertColumn(action.column);
      break;
    case "deleteColumn":
      grid.deleteColumn(action.column);
      break;
    case "sort":
      range(grid, action.range);
      grid.sort(action.key, action.ascending !== false);
      break;
    case "filter":
      range(grid, action.range);
      grid.applyFilter(action.column, new Set(action.allowed), true, { activate: true, range: action.range });
      break;
    case "mergeCenter": {
      const target = range(grid, action.range);
      return grid.mergeCells("mergeCenter", target, { confirmDataLoss: false });
    }
    case "freeze":
      grid.selectCell(coord(action.cell).c, coord(action.cell).r);
      grid.toggleFreezePanes();
      break;
    case "findReplace":
      grid.replaceAll(action.find, action.replace);
      break;
    case "autoFitColumn":
      grid.autoFitColumn(action.column);
      break;
    case "wrapText":
      range(grid, action.range);
      grid.toggleWrapText();
      break;
    case "setRowHeight":
      grid.setRowHeights(action.heightPx, [action.row]);
      break;
    case "setColumnWidth":
      grid.setColumnWidths(action.widthPx, [action.column]);
      break;
    default:
      throw new Error("Unknown Sheet action: " + action.type);
  }
  return undefined;
}

const results = [];
for (const item of cases) {
  const grid = new SheetGridController(makeContainer(), {
    isBlank: true,
    locale: item.locale || "vi-VN",
    inputLocale: item.inputLocale || "vi-VN"
  });
  const adapter = new SheetAdapter(grid);
  for (const column of item.columns || []) grid.setColumnWidths(200, [column]);

  for (const input of item.inputs || []) {
    if (input.format) setNumberFormat(grid, input.cell, input.format);
    const target = coord(input.cell);
    grid.setCellValue(target.c, target.r, input.value);
  }
  grid.undoStack = [];
  grid.redoStack = [];

  const history = [];
  for (const action of item.actions || []) {
    const before = snapshot(grid, item);
    await applyAction(grid, adapter, action);
    const after = snapshot(grid, item);
    const undoResult = grid.undo();
    const undone = snapshot(grid, item);
    const redoResult = grid.redo();
    const redone = snapshot(grid, item);
    history.push({
      type: action.type,
      undoResult: !!undoResult,
      redoResult: !!redoResult,
      undoMatchesBefore: JSON.stringify(undone) === JSON.stringify(before),
      redoMatchesAfter: JSON.stringify(redone) === JSON.stringify(after),
      before,
      after,
      undone,
      redone
    });
  }

  const current = snapshot(grid, item);
  const fodsPath = path.join(outDir, item.id + ".fods");
  fs.writeFileSync(fodsPath, adapter.serializeToFods(), "utf8");
  results.push({ id: item.id, current, history, fodsPath });
}

process.stdout.write(JSON.stringify(results));
