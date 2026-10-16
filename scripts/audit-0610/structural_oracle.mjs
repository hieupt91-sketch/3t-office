// Doi chieu thao tac cau truc (chen/xoa dong-cot, dien, sap xep) cua VN Sheet voi Excel 2016 that.
// Dung: node scripts/audit-0610/structural_oracle.mjs <scenarios.json> [--out ket-qua.json]
// scenarios.json: { "scenarios": [ { "name": "...", "cells": { "A1": 1, "B1": "=SUM(A1:A3)" }, "ops": [ { "type": "deleteRow", "at": 2 } ] } ] }
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const specPath = path.resolve(argv[0] || "");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const work = mkdtempSync(path.join(tmpdir(), "vno-struct-"));
const output = path.join(work, "out.json");

let excel = null;
for (let attempt = 0; attempt < 5 && !excel; attempt++) {
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve("scripts/audit-0610/structural_oracle.ps1"), "-InputJson", specPath, "-OutputJson", output], { encoding: "utf8", timeout: 600000 });
    excel = JSON.parse(readFileSync(output, "utf8").replace(/^﻿/, ""));
  } catch (error) { console.error("Excel oracle loi lan", attempt + 1, String(error.message).slice(0, 200)); }
}
if (!excel) { console.error("BLOCKED: khong lay duoc ket qua Excel"); process.exit(2); }

const { SheetGridController } = await import(pathToFileURL(path.resolve("apps/sheet/sheet-grid.js")).href);
const mockContainer = () => ({
  setAttribute() {}, style: {}, innerHTML: "", className: "", appendChild() {}, insertBefore() {},
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent() {},
  classList: { add() {}, remove() {}, toggle() {} }, focus() {}
});
const split = ref => { const m = ref.match(/^_?([A-Z]+)(\d+)$/); return [m[1], Number(m[2])]; };
const colNumber = name => [...name].reduce((v, ch) => v * 26 + ch.charCodeAt(0) - 64, 0);
const colLetter = n => { let s = ""; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const parseRange = text => { const [a, b] = text.split(":"); const s = split(a); const e = split(b || a); return { start: { c: s[0], r: s[1] }, end: { c: e[0], r: e[1] } }; };
const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const normFormula = f => String(f ?? "").replace(/\s+/g, "").toUpperCase();

let pass = 0; let total = 0; const failures = [];
for (const scenario of spec.scenarios) {
  const grid = new SheetGridController(mockContainer());
  if (scenario.colWidths) {
    for (const [col, width] of Object.entries(scenario.colWidths)) {
      const widthPx = typeof width === "number" && width <= 60 ? Math.round(width * 7 + 5) : width;
      grid.setColumnWidths(widthPx, [col], false);
    }
  }
  for (const [ref, rawValue] of Object.entries(scenario.cells)) {
    const [c, r] = split(ref);
    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      const v = rawValue.f || rawValue.formula || (rawValue.v !== undefined ? rawValue.v : (rawValue.val !== undefined ? rawValue.val : ""));
      grid.setCellValue(c, r, v);
      const coord = `${c}${r}`;
      const item = grid.cellsData.get(coord) || { val: "", formula: "", style: {} };
      if (!item.style) item.style = {};
      if (rawValue.bold) item.style.fontWeight = "bold";
      const col = rawValue.color || rawValue.backgroundColor;
      if (col) item.style.backgroundColor = String(col).toUpperCase();
      const fmt = rawValue.format || rawValue.numberFormat;
      if (fmt) item.style.numberFormat = typeof fmt === "string" ? { code: fmt, formatCode: fmt } : fmt;
      grid.cellsData.set(coord, item);
    } else {
      grid.setCellValue(c, r, rawValue);
    }
  }
  let opError = "";
  try {
    for (const op of scenario.ops) {
      switch (op.type) {
        case "setColWidth": {
          const widthPx = typeof op.width === "number" && op.width <= 60 ? Math.round(op.width * 7 + 5) : op.width;
          grid.setColumnWidths(widthPx, [op.col], false);
          break;
        }
        case "justify": {
          if (op.colWidth) {
            const col = op.col || op.range.match(/^[A-Z]+/)[0];
            const widthPx = typeof op.colWidth === "number" && op.colWidth <= 60 ? Math.round(op.colWidth * 7 + 5) : op.colWidth;
            grid.setColumnWidths(widthPx, [col], false);
          }
          grid.fillJustify(parseRange(op.range), false);
          break;
        }
        case "deleteRow": grid.deleteRow(op.at); break;
        case "insertRow": grid.insertRow(op.at); break;
        case "deleteCol": grid.deleteColumn(op.at); break;
        case "insertCol": grid.insertColumn(op.at); break;
        case "fillDown": grid.fillDown(parseRange(op.range)); break;
        case "fillRight": grid.fillRight(parseRange(op.range)); break;
        case "fillUp": grid.fillUp(parseRange(op.range)); break;
        case "fillLeft": grid.fillLeft(parseRange(op.range)); break;
        case "sort": { const [kc] = split(op.key); grid.selectionRange = parseRange(op.range); grid.selectedCoord = { ...grid.selectionRange.start }; grid.sort(kc, Number(op.order) === 1); break; }
        case "filterEq": grid.isFilterActive = true; grid.sheetStates[grid.activeSheet].filterRange = op.range; grid.applyFilter(op.col, new Set([String(op.value)])); break;
        case "hideRow": grid.hideRows([op.at]); break;
        case "autoFill": {
          const s = parseRange(op.src); const d = parseRange(op.dest);
          const down = d.end.r > s.end.r; const right = colNumber(d.end.c) > colNumber(s.end.c);
          grid._executeAutofill(s, down ? { direction: "down", startCol: s.start.c, endCol: s.end.c, startRow: s.end.r + 1, endRow: d.end.r } : right ? { direction: "right", startColNum: colNumber(s.end.c) + 1, endColNum: colNumber(d.end.c), startRow: s.start.r, endRow: s.end.r } : (() => { throw new Error("autoFill chi ho tro xuong/phai"); })());
          break;
        }
        case "advancedFilter": grid.advancedFilter({ listRange: op.list, criteriaRange: op.criteria, action: op.copyTo ? "copy" : "inplace", copyTo: op.copyTo, unique: Boolean(op.unique) }); break;
        case "deleteRows": for (let i = op.from; i <= op.to; i++) grid.deleteRow(op.from); break;
        case "insertRows": for (let i = 0; i < op.count; i++) grid.insertRow(op.at); break;
        case "copyPaste": case "cutPaste": {
          grid.selectionRange = parseRange(op.from); grid.selectedCoord = { ...grid.selectionRange.start };
          grid.copySelection(op.type === "cutPaste");
          const [dc, dr] = split(op.to.split(":")[0]);
          grid.selectedCoord = { c: dc, r: dr }; grid.selectionRange = { start: { c: dc, r: dr }, end: { c: dc, r: dr } };
          grid.pasteClipboard();
          break;
        }
        case "pasteSpecial": {
          grid.selectionRange = parseRange(op.from);
          grid.selectedCoord = { ...grid.selectionRange.start };
          grid.copySelection(false);
          const cb = grid._clipboardRange;
          const startCol = grid._columnNumber(cb.range.start.c);
          const endCol = grid._columnNumber(cb.range.end.c);
          const startRow = Number(cb.range.start.r);
          const endRow = Number(cb.range.end.r);
          const cells = [];
          for (let r = startRow; r <= endRow; r++) {
            const row = [];
            for (let c = startCol; c <= endCol; c++) {
              const item = grid.cellsData.get(`${grid._columnLabel(c)}${r}`) || { val: "", formula: "", style: {} };
              row.push(structuredClone(item));
            }
            cells.push(row);
          }
          const model = { range: structuredClone(cb.range), cells, sourceSheet: grid.activeSheet };
          const [dc, dr] = split(op.to.split(":")[0]);
          grid.selectedCoord = { c: dc, r: dr };
          grid.selectionRange = { start: { c: dc, r: dr }, end: { c: dc, r: dr } };
          const mode = op.mode || op.paste || "source";
          const options = {
            operation: op.operation || "none",
            skipBlanks: !!op.skipBlanks,
            transpose: !!op.transpose || op.mode === "transpose"
          };
          grid.applyPasteSpecial(model, mode, { c: dc, r: dr }, options);
          break;
        }
        default: throw new Error(`op chua ho tro: ${op.type}`);
      }
    }
    grid._recalculateAllFormulas();
  } catch (error) { opError = String(error.message || error); }
  const want = excel[scenario.name] || {};
  const got = {};
  for (const [coord, item] of grid.cellsData.entries()) {
    const text = item.formula || (item.val !== "" && item.val !== undefined && item.val !== null ? String(item.val) : "");
    const style = item.style || {};
    const bold = style.fontWeight === "bold" || style.fontWeight === "700" || Number(style.fontWeight) >= 600;
    const color = style.backgroundColor ? style.backgroundColor.toUpperCase() : "";
    let format = "";
    if (style.numberFormat) {
      if (typeof style.numberFormat === "string") format = style.numberFormat;
      else format = style.numberFormat.formatCode || style.numberFormat.code || "";
      if (!format && style.numberFormat.category === "percentage") format = "0.00%";
      if (!format && style.numberFormat.category === "date") format = "dd/mm/yyyy";
    }
    const hasFmt = scenario.compareFormat && (bold || color || format);
    if (text === "" && !hasFmt) continue;
    const cellGot = { f: item.formula ? (item.formula.startsWith("=") ? item.formula : `=${item.formula}`) : String(item.val), v: item.val };
    if (scenario.compareFormat) {
      const fmt = {};
      if (bold) fmt.bold = true;
      if (color) fmt.color = color;
      if (format) fmt.format = format;
      cellGot.fmt = fmt;
    }
    got[coord] = cellGot;
  }
  for (const r of [...(grid.hiddenRows || []), ...(grid._userHiddenRows?.() || [])]) got[`_H${r}`] = { f: "hidden", v: true };
  const coords = new Set([...Object.keys(want), ...Object.keys(got)]);
  const bad = [];
  for (const coord of [...coords].sort((a, b) => split(a)[1] - split(b)[1] || colNumber(split(a)[0]) - colNumber(split(b)[0]))) {
    total++;
    const w = want[coord]; const g = got[coord];
    let ok = false;
    if (w && g) {
      const fOk = normFormula(w.f) === normFormula(g.f);
      let vOk;
      if (typeof w.v === "number") vOk = typeof g.v === "number" ? near(w.v, g.v) : (String(g.v) !== "" && near(w.v, Number(g.v)));
      else if (w.v === "" || w.v === null || w.v === undefined) vOk = (g.v === "" || g.v === null || g.v === undefined);
      else vOk = String(w.v ?? "") === String(g.v ?? "");
      let fmtOk = true;
      if (scenario.compareFormat) {
        const wFmt = w.fmt || {};
        const gFmt = g.fmt || {};
        const boldOk = (!!wFmt.bold) === (!!gFmt.bold);
        const colorOk = String(wFmt.color || "").toUpperCase() === String(gFmt.color || "").toUpperCase();
        const normFmt = s => String(s || "").toLowerCase().replace(/[\s_"\\]/g, "");
        const formatOk = !wFmt.format && !gFmt.format ? true : normFmt(wFmt.format) === normFmt(gFmt.format);
        fmtOk = boldOk && colorOk && formatOk;
        if (!fmtOk) bad.push(`${coord} [fmt]: Excel ${JSON.stringify(wFmt)} | VN ${JSON.stringify(gFmt)}`);
      }
      ok = fOk && vOk && fmtOk;
      if (!ok && !bad.some(b => b.startsWith(coord))) bad.push(`${coord}: Excel ${w.f} = ${JSON.stringify(w.v)} | VN ${g.f} = ${JSON.stringify(g.v)}`);
    } else bad.push(`${coord}: Excel ${w ? `${w.f} = ${JSON.stringify(w.v)}` : "(trong)"} | VN ${g ? `${g.f} = ${JSON.stringify(g.v)}` : "(trong)"}`);
    if (ok) pass++;
  }
  if (opError) bad.push(`LOI THAO TAC: ${opError}`);
  if (bad.length) { failures.push({ name: scenario.name, bad }); console.log(`FAIL | ${scenario.name}`); bad.slice(0, 8).forEach(line => console.log("   " + line)); } else console.log(`PASS | ${scenario.name}`);
}
console.log(`SUMMARY ${pass}/${total} o khop Excel 2016; ${spec.scenarios.length - failures.length}/${spec.scenarios.length} kich ban`);
const outIndex = argv.indexOf("--out");
if (outIndex >= 0) writeFileSync(path.resolve(argv[outIndex + 1]), JSON.stringify({ excel, failures }, null, 1));
if (failures.length) process.exitCode = 1;
