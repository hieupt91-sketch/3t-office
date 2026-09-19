#!/usr/bin/env node
/**
 * Compare the original XLSX OOXML with the workbook produced by parseFods().
 * No external package is used: ZIP access reuses VN Office's OOXML helper and
 * XML is deliberately parsed with namespace-tolerant regular expressions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../adapters/libreoffice/sheet/sheet-adapter.js";
import { readZipEntry } from "../adapters/libreoffice/common/ooxml-zip-patch.js";

const BUILTIN_FORMATS = new Map([
  [0, "General"], [1, "0"], [2, "0.00"], [3, "#,##0"], [4, "#,##0.00"],
  [9, "0%"], [10, "0.00%"], [11, "0.00E+00"], [12, "# ?/?"], [13, "# ??/??"],
  [14, "mm-dd-yy"], [15, "d-mmm-yy"], [16, "d-mmm"], [17, "mmm-yy"],
  [18, "h:mm AM/PM"], [19, "h:mm:ss AM/PM"], [20, "h:mm"], [21, "h:mm:ss"],
  [22, "m/d/yy h:mm"], [37, "#,##0 ;(#,##0)"], [38, "#,##0 ;[Red](#,##0)"],
  [39, "#,##0.00;(#,##0.00)"], [40, "#,##0.00;[Red](#,##0.00)"],
  [45, "mm:ss"], [46, "[h]:mm:ss"], [47, "mmss.0"], [48, "##0.0E+0"], [49, "@"]
]);

function decodeXml(value = "") {
  return value.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function normalizeFontName(value = "") {
  const font = decodeXml(String(value)).trim();
  const wrapped = font.match(/^(["'])([\s\S]*)\1$/);
  return (wrapped ? wrapped[2] : font).trim();
}

function attrs(text = "") {
  const result = {};
  text.replace(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g, (_, key, _q, value) => { result[key] = decodeXml(value); return ""; });
  return result;
}

function xmlEntry(xlsx, name, required = false) {
  const data = readZipEntry(xlsx, name);
  if (!data && required) throw new Error(`XLSX thiếu ${name}`);
  return stripMainNamespacePrefix(data?.toString("utf8") || "");
}

// Một số file (lan23, xuất từ phần mềm khác) ghi SpreadsheetML với tiền tố (`<x:workbook xmlns:x="…/spreadsheetml/2006/main">
// <x:sheet …>`): auditor cũ đọc được 0 sheet nguồn → 627 lệch dữ liệu bị che (codex đo 19/9). Bỏ tiền tố của
// namespace chính để mọi regex `<sheet\b`, `<c\b`… nhìn thấy; các namespace khác (r:, mc:, x14ac:) giữ nguyên.
function stripMainNamespacePrefix(xml) {
  const m = /xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/.exec(xml);
  if (!m) return xml;
  const p = m[1];
  return xml.replace(new RegExp(`<(/?)${p}:`, "g"), "<$1");
}

function resolveTarget(base, target) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = `${base}/${target}`.split("/");
  const out = [];
  for (const part of parts) part === ".." ? out.pop() : part !== "." && out.push(part);
  return out.join("/");
}

function parseSharedStrings(xml) {
  const strings = [];
  strings.richIndexes = new Set();
  xml.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/gi, (_, body) => {
    const pieces = [];
    body.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi, (_m, text) => { pieces.push(decodeXml(text)); return ""; });
    if (/<r\b/i.test(body)) strings.richIndexes.add(strings.length);
    strings.push(pieces.join(""));
    return "";
  });
  return strings;
}

function parseStyles(xml) {
  const childBlocks = (tag) => {
    const body = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "";
    return [...body.matchAll(new RegExp(`<${tag.slice(0, -1)}\\b[^>]*>[\\s\\S]*?<\\/${tag.slice(0, -1)}>|<${tag.slice(0, -1)}\\b[^>]*/>`, "gi"))].map(match => match[0]);
  };
  // Bảng màu indexed chuẩn của Excel (0–63); <colors><indexedColors> trong styles.xml ghi đè (lan15, lan23).
  const indexed = [...INDEXED_PALETTE];
  const customIndexed = xml.match(/<indexedColors\b[^>]*>([\s\S]*?)<\/indexedColors>/i)?.[1] || "";
  if (customIndexed) [...customIndexed.matchAll(/<rgbColor\b[^>]*rgb="([0-9A-Fa-f]{6,8})"/gi)].forEach((m, i) => { indexed[i] = `#${m[1].slice(-6).toUpperCase()}`; });
  const color = block => {
    const a = attrs(block.match(/<(?:color|fgColor)\b([^>]*)\/?\s*>/i)?.[1] || "");
    if (a.rgb) return `#${a.rgb.slice(-6).toUpperCase()}`;
    if (a.indexed !== undefined) { const n = Number(a.indexed); return n === 64 || n === 65 ? "" : (indexed[n] ?? `indexed:${a.indexed}`); }
    return a.theme ? `theme:${a.theme}${a.tint ? `:${a.tint}` : ""}` : "";
  };
  const fonts = childBlocks("fonts").map(block => ({
    name: normalizeFontName(attrs(block.match(/<name\b([^>]*)\/?\s*>/i)?.[1] || "").val || ""),
    size: Number(attrs(block.match(/<sz\b([^>]*)\/?\s*>/i)?.[1] || "").val || 0),
    bold: /<b\b/i.test(block), italic: /<i\b/i.test(block), color: color(block),
    underline: /<u\b(?![^>]*val=["']none["'])/i.test(block), strike: /<strike\b(?![^>]*val=["'](?:0|false)["'])/i.test(block)
  }));
  const fills = childBlocks("fills").map(block => ({ pattern: attrs(block.match(/<patternFill\b([^>]*)>/i)?.[1] || "").patternType || "", color: color(block) }));
  const borders = childBlocks("borders").map(block => ["left", "right", "top", "bottom"].map(side => {
    const part = block.match(new RegExp(`<${side}\\b([^>]*)>([\\s\\S]*?)<\\/${side}>|<${side}\\b([^>]*)/>`, "i"));
    return `${side}:${attrs(part?.[1] || part?.[3] || "").style || ""}:${color(part?.[2] || "")}`;
  }).join("|"));
  const custom = new Map();
  xml.replace(/<numFmt\b([^>]*)\/?\s*>/gi, (_, raw) => {
    const a = attrs(raw); custom.set(Number(a.numFmtId), a.formatCode || "General"); return "";
  });
  const xfsBody = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i)?.[1] || "";
  const xfs = [];
  xfsBody.replace(/<xf\b([^>]*?)(?:>([\s\S]*?)<\/xf>|\/\s*>)/gi, (_, raw, body = "") => {
    const a = attrs(raw); const id = Number(a.numFmtId || 0);
    const alignment = attrs(body.match(/<alignment\b([^>]*)\/?\s*>/i)?.[1] || "");
    xfs.push({ numFmtId: id, formatCode: custom.get(id) || BUILTIN_FORMATS.get(id) || `builtin:${id}`,
      font: fonts[Number(a.fontId || 0)] || {}, fill: fills[Number(a.fillId || 0)] || {},
      border: borders[Number(a.borderId || 0)] || "", alignment: {
        horizontal: alignment.horizontal || "", vertical: alignment.vertical || "",
        wrapText: alignment.wrapText === "1" || alignment.wrapText === "true",
        textRotation: Number(alignment.textRotation || 0)
      }
    });
    return "";
  });
  // Đơn vị chiều rộng cột = max digit width (px) của font Normal (fonts[0]); đo Excel 2016 COM
  // (_excel_mdw.ps1): Calibri 11 / Arial 10 / Tahoma 10 → 7; Calibri 12 / Arial 11 / Times New Roman 12 / Verdana 10 → 8.
  xfs.mdw = maxDigitWidth(fonts[0] || {});
  return xfs;
}

const INDEXED_PALETTE = ["000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF", "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
  "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080", "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
  "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF", "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99",
  "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696", "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333"].map(v => `#${v}`);

function maxDigitWidth(font) {
  const name = String(font.name || "calibri").toLowerCase(); const size = Number(font.size || 11);
  if (/times/.test(name)) return size >= 13 ? 9 : size >= 12 ? 8 : 7;
  if (/arial/.test(name)) return size >= 11 ? 8 : 7;
  if (/verdana/.test(name)) return size >= 10 ? 8 : 7;
  return size >= 12 ? 8 : 7; // Calibri, Tahoma và font chưa đo
}

// px của cột: thuộc tính width đã gồm lề 5px (Excel ghi 9.140625 = 64/7 cho cột hiển thị "8.43");
// cột không có <col> = defaultColWidth×MDW, hoặc (baseColWidth|8)×MDW + 8 (đo: 64/72/80px cho MDW 7/8/9).
function columnPx(width, mdw) { return Math.round(Number(width) * mdw); }
function defaultColumnPx(formatPr, mdw) {
  if (formatPr.defaultColWidth !== undefined) return columnPx(formatPr.defaultColWidth, mdw);
  return Number(formatPr.baseColWidth || 8) * mdw + 8;
}

function normalizeFormatCode(code = "General") {
  return decodeXml(String(code)).replace(/\\([ _*\-])/g, "$1").replace(/\s+/g, " ").trim().toLowerCase();
}

function formatCategory(code = "General") {
  const clean = code.replace(/"[^"]*"|\\.|\[[^\]]*\]/g, "").toLowerCase();
  if (/[ymd]|h+[:]/.test(clean)) return "date";
  if (/%/.test(clean)) return "percentage";
  if (/[$€£¥₫]|\b(vnd|usd|eur)\b/i.test(code)) return "currency";
  if (/e[+-]0/i.test(clean)) return "scientific";
  if (/[/][?#0]/.test(clean)) return "fraction";
  if (code === "@") return "text";
  return clean === "general" ? "general" : "number";
}

function decimalsFromFormat(code = "") {
  const first = code.split(";")[0].replace(/"[^"]*"|\\.|\[[^\]]*\]/g, "");
  // OOXML formatCode always uses '.' for the decimal placeholder; ',' is a
  // grouping/scaling token even when the user's locale displays a comma.
  return (first.match(/\.([0#?]+)/)?.[1] || "").length;
}

function normalizeFormula(value = "") {
  return decodeXml(String(value)).replace(/^of:=/i, "=").replace(/^=/, "")
    .replace(/\$|\s+/g, "").replace(/\[\.?([^\]]+)\]/g, "$1").replace(/;/g, ",").toUpperCase();
}

function shiftSharedFormula(formula, fromCoord, toCoord) {
  const split = coord => { const m = String(coord).match(/^([A-Z]+)(\d+)$/i); return m ? [m[1].toUpperCase(), Number(m[2])] : ["A", 1]; };
  const colNumber = name => [...name].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const [fromCol, fromRow] = split(fromCoord); const [toCol, toRow] = split(toCoord);
  const dc = colNumber(toCol) - colNumber(fromCol); const dr = toRow - fromRow;
  return formula.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/gi, (all, absCol, col, absRow, row) => {
    const shiftedCol = absCol ? col.toUpperCase() : columnName(Math.max(1, colNumber(col.toUpperCase()) + dc));
    const shiftedRow = absRow ? Number(row) : Math.max(1, Number(row) + dr);
    return `${absCol}${shiftedCol}${absRow}${shiftedRow}`;
  });
}

function excelSerialToIso(serial, date1904) {
  if (!Number.isFinite(serial)) return "";
  const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30);
  return new Date(epoch + serial * 86400000).toISOString().replace(/\.000Z$/, "Z");
}

function normalizeValue(cell, item, date1904) {
  if (!item) return { expected: cell.value, actual: undefined };
  if (cell.category === "date" && typeof cell.value === "number") {
    const expectedIso = excelSerialToIso(cell.value, date1904);
    const actualText = String(item.val ?? item.formatted ?? "");
    const actualDate = Date.parse(actualText);
    return { expected: expectedIso, actual: Number.isFinite(actualDate) ? new Date(actualDate).toISOString().replace(/\.000Z$/, "Z") : actualText };
  }
  const expected = typeof cell.value === "string" ? cell.value.replace(/\r\n/g, "\n") : cell.value;
  const actual = typeof item.val === "string" ? item.val.replace(/\r\n/g, "\n") : item.val;
  return { expected, actual };
}

function valuesEqual(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= Math.max(1e-9, Math.abs(a) * 1e-12);
  if (typeof a === "boolean" || typeof b === "boolean") return Boolean(a) === Boolean(b);
  return String(a ?? "").replace(/\r\n/g, "\n") === String(b ?? "").replace(/\r\n/g, "\n");
}

function parseSheetXml(xml, sharedStrings, styles) {
  const mdw = styles.mdw || 7;
  const formatPr = attrs(xml.match(/<sheetFormatPr\b([^>]*)\/?\s*>/i)?.[1] || "");
  const result = { cells: new Map(), merges: [], columns: new Map(), rows: new Map(), hiddenRows: new Set(), hiddenCols: new Set(), freeze: { rows: 0, cols: 0 }, autoFilter: "", maxDataColumn: 0,
    defaultColumnPx: defaultColumnPx(formatPr, mdw) };
  xml.replace(/<col\b([^>]*)\/?\s*>/gi, (_, raw) => {
    const a = attrs(raw); const min = Number(a.min); const max = Number(a.max || a.min);
    for (let col = min; col <= max; col++) {
      if (a.width !== undefined) result.columns.set(columnName(col), columnPx(a.width, mdw));
      if (a.hidden === "1" || a.hidden === "true") result.hiddenCols.add(columnName(col));
    }
    return "";
  });
  xml.replace(/<row\b([^>]*)>/gi, (_, raw) => {
    const a = attrs(raw); const row = Number(a.r);
    if (a.ht !== undefined) result.rows.set(row, Number(a.ht) * 96 / 72);
    if (a.hidden === "1" || a.hidden === "true") result.hiddenRows.add(row);
    return "";
  });
  const sharedFormula = new Map();
  xml.replace(/<c\b([^>]*?)(?:>([\s\S]*?)<\/c>|\/\s*>)/gi, (_, raw, pairedBody) => {
    const body = pairedBody || "";
    const a = attrs(raw); const coord = a.r; if (!coord) return "";
    const style = styles[Number(a.s || 0)] || { numFmtId: 0, formatCode: "General" };
    const fMatch = body.match(/<f\b([^>]*)>([\s\S]*?)<\/f>|<f\b([^>]*)\/>/i);
    let formula = fMatch ? decodeXml(fMatch[2] || "") : "";
    const fa = attrs(fMatch?.[1] || fMatch?.[3] || "");
    if (fa.t === "shared" && formula) sharedFormula.set(fa.si, { formula, coord });
    if (fa.t === "shared" && !formula) {
      const base = sharedFormula.get(fa.si);
      formula = base ? shiftSharedFormula(base.formula, base.coord, coord) : "";
    }
    const rawValue = decodeXml(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] || "");
    let value = rawValue;
    const sharedIndex = a.t === "s" ? Number(rawValue) : -1;
    if (a.t === "s") value = sharedStrings[sharedIndex] ?? "";
    else if (a.t === "inlineStr") {
      const pieces = []; body.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi, (_m, text) => { pieces.push(decodeXml(text)); return ""; }); value = pieces.join("");
    } else if (a.t === "b") value = rawValue === "1";
    else if (a.t === "str" || a.t === "e") value = rawValue;
    else if (rawValue !== "") value = Number(rawValue);
    // A self-closing <c/> only carries style/used-range metadata, not data. A cell whose
    // string resolves to "" IS kept: an empty-string cell differs from a blank one in
    // Excel (COUNTA, ISBLANK, Ctrl+End) — lan09.xlsx save once produced 21,930 of them.
    if (rawValue !== "" || formula || a.t === "inlineStr") {
      // Ô công thức không có <v> (lan23: `<c t="e"><f>…</f></c>`, 21 ô): Excel tự tính khi mở, không có giá trị
      // gốc để so → bỏ so giá trị, vẫn so công thức/style.
      result.cells.set(coord, { coord, value, formula, noCache: Boolean(formula) && rawValue === "", ...style, category: formatCategory(style.formatCode), richText: sharedStrings.richIndexes?.has(sharedIndex) || (a.t === "inlineStr" && /<r\b/i.test(body)) });
      const col = coord.match(/^([A-Z]+)/i)?.[1] || "";
      const colNumber = [...col.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
      result.maxDataColumn = Math.max(result.maxDataColumn, colNumber);
    }
    return "";
  });
  xml.replace(/<mergeCell\b([^>]*)\/?\s*>/gi, (_, raw) => { const ref = attrs(raw).ref; if (ref) result.merges.push(ref); return ""; });
  const pane = attrs(xml.match(/<pane\b([^>]*)\/?\s*>/i)?.[1] || "");
  if (/frozen/i.test(pane.state || "")) result.freeze = { rows: Number(pane.ySplit || 0), cols: Number(pane.xSplit || 0) };
  result.autoFilter = attrs(xml.match(/<autoFilter\b([^>]*)[\s\S]*?(?:<\/autoFilter>|\/\s*>)/i)?.[1] || "").ref || "";
  return result;
}

function columnName(number) {
  let name = ""; for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function rangeFromMerge(merge) { return `${merge.start.c}${merge.start.r}:${merge.end.c}${merge.end.r}`; }
function setDiff(expected, actual) { return [...expected].filter(value => !actual.has(value)); }
function closePx(a, b) { return Math.abs(a - b) <= 1.01; }

function actualFormat(item) {
  const nf = item?.style?.numberFormat;
  if (!nf) return { category: "general", decimals: 0 };
  return { category: nf.category || "number", decimals: Number(nf.decimals || 0), currencySymbol: nf.currencySymbol || "" };
}

function mismatch(bucket, detail, limit) { bucket.count++; if (bucket.items.length < limit) bucket.items.push(detail); }

export function auditSheetImport(xlsxPath, fodsPath, { maxDetails = 20 } = {}) {
  const xlsx = fs.readFileSync(xlsxPath);
  const workbookXml = xmlEntry(xlsx, "xl/workbook.xml", true);
  const relsXml = xmlEntry(xlsx, "xl/_rels/workbook.xml.rels", true);
  const sharedStrings = parseSharedStrings(xmlEntry(xlsx, "xl/sharedStrings.xml"));
  const styles = parseStyles(xmlEntry(xlsx, "xl/styles.xml"));
  const relationships = new Map();
  relsXml.replace(/<Relationship\b([^>]*)\/?\s*>/gi, (_, raw) => { const a = attrs(raw); relationships.set(a.Id, resolveTarget("xl", a.Target || "")); return ""; });
  const sheets = [];
  workbookXml.replace(/<sheet\b([^>]*)\/?\s*>/gi, (_, raw) => { const a = attrs(raw); sheets.push({ name: a.name, state: a.state || "visible", entry: relationships.get(a["r:id"]) }); return ""; });
  const view = attrs(workbookXml.match(/<workbookView\b([^>]*)\/?\s*>/i)?.[1] || "");
  const date1904 = attrs(workbookXml.match(/<workbookPr\b([^>]*)\/?\s*>/i)?.[1] || "").date1904 === "1";
  const parsed = new SheetAdapter(null).parseFods(fs.readFileSync(fodsPath, "utf8"));
  const report = { files: { xlsx: path.resolve(xlsxPath), fods: path.resolve(fodsPath) }, expectedSheets: sheets.length, actualSheets: parsed.sheets.length, expectedActiveSheet: sheets[Number(view.activeTab || 0)]?.name || sheets[0]?.name || "", actualActiveSheet: parsed.activeSheet, sheetOrderMatch: sheets.map(s => s.name).join("\0") === parsed.sheets.join("\0"), totals: { cells: 0, cellMatches: 0, mismatches: 0 }, sheets: [] };

  for (const sheet of sheets) {
    // Some real workbooks contain a metadata-only veryHidden sheet with an
    // empty r:id. Excel accepts it; treat it as an empty sheet, not a bad ZIP.
    const source = parseSheetXml(sheet.entry ? xmlEntry(xlsx, sheet.entry, true) : "", sharedStrings, styles);
    const actualData = parsed.sheetsData[sheet.name] || new Map();
    const kinds = Object.fromEntries(["value", "formula", "numberFormat", "merge", "columnWidth", "rowHeight", "hiddenColumn", "hiddenRow", "freeze", "autoFilter", "visibility"].map(key => [key, { count: 0, items: [] }]));
    let matches = 0;
    for (const [coord, cell] of source.cells) {
      const item = actualData.get(coord);
      const values = normalizeValue(cell, item, date1904);
      let cellOk = true;
      if (!valuesEqual(values.expected, values.actual)) { mismatch(kinds.value, { coord, expected: values.expected, actual: values.actual }, maxDetails); cellOk = false; }
      if (normalizeFormula(cell.formula) !== normalizeFormula(item?.formula || "")) { mismatch(kinds.formula, { coord, expected: cell.formula, actual: item?.formula || "" }, maxDetails); cellOk = false; }
      if (typeof cell.value === "number" && cell.category !== "general" && cell.category !== "text") {
        const af = actualFormat(item); const expectedDecimals = decimalsFromFormat(cell.formatCode);
        const categoryMatches = af.category === cell.category || (cell.category === "currency" && af.category === "accounting");
        if (!categoryMatches || (cell.category !== "date" && af.decimals !== expectedDecimals)) {
          mismatch(kinds.numberFormat, { coord, expected: `${cell.category}/${expectedDecimals} (${cell.formatCode})`, actual: af }, maxDetails); cellOk = false;
        }
      }
      if (cellOk) matches++;
    }
    const actualMerges = new Set((parsed.mergedRangesBySheet[sheet.name] || []).map(rangeFromMerge));
    for (const ref of setDiff(new Set(source.merges), actualMerges)) mismatch(kinds.merge, { ref, expected: true, actual: false }, maxDetails);
    for (const ref of setDiff(actualMerges, new Set(source.merges))) mismatch(kinds.merge, { ref, expected: false, actual: true }, maxDetails);
    const actualCols = parsed.colWidthsBySheet[sheet.name] || new Map();
    // Model của app giữ px theo LibreOffice (= width×MDW + 5, overlay Python) nên cộng lề 5px khi so.
    for (const [coord, px] of source.columns) if (!closePx(px + 5, actualCols.get(coord) ?? 100)) mismatch(kinds.columnWidth, { coord, expected: px + 5, actual: actualCols.get(coord) ?? 100 }, maxDetails);
    const actualRows = parsed.rowHeightsBySheet[sheet.name] || new Map();
    for (const [coord, px] of source.rows) if (!closePx(px, actualRows.get(coord) ?? 26)) mismatch(kinds.rowHeight, { coord, expected: px, actual: actualRows.get(coord) ?? 26 }, maxDetails);
    for (const coord of setDiff(source.hiddenCols, parsed.userHiddenColsBySheet[sheet.name] || new Set())) mismatch(kinds.hiddenColumn, { coord }, maxDetails);
    for (const coord of setDiff(source.hiddenRows, parsed.userHiddenRowsBySheet[sheet.name] || new Set())) mismatch(kinds.hiddenRow, { coord }, maxDetails);
    const actualFreeze = parsed.freezePanesBySheet?.[sheet.name] || { rows: 0, cols: 0 };
    if (source.freeze.rows !== actualFreeze.rows || source.freeze.cols !== actualFreeze.cols) mismatch(kinds.freeze, { expected: source.freeze, actual: actualFreeze }, maxDetails);
    const actualFilter = parsed.autoFilterBySheet?.[sheet.name] || "";
    if (source.autoFilter !== actualFilter) mismatch(kinds.autoFilter, { expected: source.autoFilter, actual: actualFilter }, maxDetails);
    const actualVisibility = parsed.sheetVisibilityBySheet?.[sheet.name] || "visible";
    if (sheet.state !== actualVisibility) mismatch(kinds.visibility, { expected: sheet.state, actual: actualVisibility }, maxDetails);
    const mismatchCount = Object.values(kinds).reduce((sum, bucket) => sum + bucket.count, 0);
    report.sheets.push({ name: sheet.name, cells: source.cells.size, cellMatches: matches, mismatchCount, mismatches: kinds });
    report.totals.cells += source.cells.size; report.totals.cellMatches += matches; report.totals.mismatches += mismatchCount;
  }
  report.activeSheetMatch = report.expectedActiveSheet === report.actualActiveSheet;
  return report;
}

export function printAuditReport(report, stream = process.stdout) {
  stream.write(`AUDIT XLSX -> FODS -> parseFods (${report.expectedSheets} sheet)\n`);
  stream.write(`Thu tu sheet: ${report.sheetOrderMatch ? "KHOP" : "LECH"}; active: ${report.expectedActiveSheet} -> ${report.actualActiveSheet} ${report.activeSheetMatch ? "KHOP" : "LECH"}\n`);
  for (const sheet of report.sheets) {
    stream.write(`\n[${sheet.name}] o khop ${sheet.cellMatches}/${sheet.cells}; sai lech ${sheet.mismatchCount}\n`);
    for (const [kind, bucket] of Object.entries(sheet.mismatches)) if (bucket.count) {
      stream.write(`  ${kind}: ${bucket.count}\n`);
      for (const detail of bucket.items) stream.write(`    ${JSON.stringify(detail)}\n`);
    }
  }
  stream.write(`\nTONG: o khop ${report.totals.cellMatches}/${report.totals.cells}; sai lech ${report.totals.mismatches}\n`);
}

function parseXlsxWorkbook(xlsxPath) {
  const xlsx = fs.readFileSync(xlsxPath);
  const workbookXml = xmlEntry(xlsx, "xl/workbook.xml", true);
  const relsXml = xmlEntry(xlsx, "xl/_rels/workbook.xml.rels", true);
  const relationships = new Map();
  relsXml.replace(/<Relationship\b([^>]*)\/?\s*>/gi, (_, raw) => { const a = attrs(raw); relationships.set(a.Id, resolveTarget("xl", a.Target || "")); return ""; });
  const sharedStrings = parseSharedStrings(xmlEntry(xlsx, "xl/sharedStrings.xml"));
  const styles = parseStyles(xmlEntry(xlsx, "xl/styles.xml"));
  const sheetDefs = [];
  workbookXml.replace(/<sheet\b([^>]*)\/?\s*>/gi, (_, raw) => { const a = attrs(raw); sheetDefs.push({ name: a.name, state: a.state || "visible", entry: relationships.get(a["r:id"]) }); return ""; });
  const view = attrs(workbookXml.match(/<workbookView\b([^>]*)\/?\s*>/i)?.[1] || "");
  const sheets = new Map();
  for (const def of sheetDefs) {
    const xml = def.entry ? xmlEntry(xlsx, def.entry, true) : "";
    const data = parseSheetXml(xml, sharedStrings, styles);
    const sheetRelsEntry = def.entry ? `${path.posix.dirname(def.entry)}/_rels/${path.posix.basename(def.entry)}.rels` : "";
    const sheetRels = xmlEntry(xlsx, sheetRelsEntry);
    const drawingId = attrs(xml.match(/<drawing\b([^>]*)\/?\s*>/i)?.[1] || "")["r:id"];
    let drawingTarget = "";
    sheetRels.replace(/<Relationship\b([^>]*)\/?\s*>/gi, (_, raw) => { const a = attrs(raw); if (a.Id === drawingId) drawingTarget = resolveTarget(path.posix.dirname(def.entry), a.Target || ""); return ""; });
    const drawing = drawingTarget ? xmlEntry(xlsx, drawingTarget) : "";
    data.images = [];
    drawing.replace(/<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/gi, (_, body) => {
      const from = body.match(/<(?:xdr:)?from>([\s\S]*?)<\/(?:xdr:)?from>/i)?.[1] || "";
      const n = tag => Number(from.match(new RegExp(`<(?:xdr:)?${tag}>(\\d+)<\\/(?:xdr:)?${tag}>`, "i"))?.[1] || 0);
      data.images.push(`${columnName(n("col") + 1)}${n("row") + 1}`);
      return "";
    });
    data.state = def.state;
    sheets.set(def.name, data);
  }
  const theme = parseThemePalette(xmlEntry(xlsx, "xl/theme/theme1.xml"));
  return { names: sheetDefs.map(s => s.name), active: sheetDefs[Number(view.activeTab || 0)]?.name || sheetDefs[0]?.name || "", sheets, theme };
}

// Bảng màu theme (clrScheme) theo chỉ số Excel: 0 lt1, 1 dk1, 2 lt2, 3 dk2, 4–9 accent1–6, 10 hlink, 11 folHlink.
function parseThemePalette(themeXml = "") {
  const order = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const scheme = themeXml.match(/<a:clrScheme\b[^>]*>([\s\S]*?)<\/a:clrScheme>/i)?.[1] || "";
  return order.map(name => {
    const body = scheme.match(new RegExp(`<a:${name}>([\\s\\S]*?)<\\/a:${name}>`, "i"))?.[1] || "";
    const srgb = body.match(/<a:srgbClr\b[^>]*val="([0-9A-Fa-f]{6})"/i)?.[1];
    const sys = body.match(/<a:sysClr\b[^>]*lastClr="([0-9A-Fa-f]{6})"/i)?.[1];
    return srgb || sys ? `#${(srgb || sys).toUpperCase()}` : "";
  });
}

// Excel áp tint lên độ sáng HSL: tint < 0 → L·(1+tint); tint > 0 → L·(1−tint)+tint.
function applyTint(hex, tint) {
  const m = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(hex);
  if (!m || !tint) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6; else if (max === g) h = ((b - r) / d + 2) / 6; else h = ((r - g) / d + 4) / 6;
  }
  l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  let out;
  if (s === 0) out = [l, l, l];
  else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; out = [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]; }
  return `#${out.map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

// "theme:1", "theme:0:-0.15", "" (tự động) → RGB thật mà Excel vẽ; các giá trị khác giữ nguyên.
function resolveColor(color, theme, autoColor) {
  if (!color) return autoColor;
  const m = /^theme:(\d+)(?::(-?[\d.]+))?$/.exec(color);
  if (!m) return color;
  const base = theme?.[Number(m[1])] || "";
  if (!base) return color;
  return applyTint(base, Number(m[2] || 0));
}

// Hai màu coi như bằng nhau khi mỗi kênh lệch ≤ 2/255 (tint Excel làm tròn theo HLS 0–255).
function colorsClose(a, b) {
  const pa = /^#([0-9A-F]{6})$/i.exec(a || ""), pb = /^#([0-9A-F]{6})$/i.exec(b || "");
  if (!pa || !pb) return a === b;
  for (let i = 0; i < 3; i++) if (Math.abs(parseInt(pa[1].slice(i * 2, i * 2 + 2), 16) - parseInt(pb[1].slice(i * 2, i * 2 + 2), 16)) > 2) return false;
  return true;
}

// Ngữ nghĩa Excel: font/viền không màu = tự động (dk1, thường đen); căn ngang trống = general, dọc trống = bottom;
// màu theme(+tint) so bằng RGB thật. Đo lan09.xlsx 2026-09-15: 22.7k lệch alignment ""/general và 25k lệch font
// theme:1/#000000 là cùng một hiển thị trong Excel.
function comparableStyle(style = {}, theme = null) {
  const auto = theme?.[1] || "#000000";
  const font = { ...(style.font || {}) };
  if ("color" in font || Object.keys(font).length) font.color = resolveColor(font.color, theme, auto);
  const fill = { ...(style.fill || {}) };
  if (fill.pattern && fill.pattern !== "none") fill.color = resolveColor(fill.color, theme, auto); else { delete fill.pattern; delete fill.color; }
  const alignment = { ...(style.alignment || {}) };
  if (Object.keys(alignment).length) {
    alignment.horizontal = alignment.horizontal || "general";
    alignment.vertical = alignment.vertical || "bottom";
  }
  const border = String(style.border || "").split("|").filter(Boolean).map(part => {
    const [side, lineStyle, color] = part.split(":");
    return `${side}:${lineStyle || ""}:${lineStyle ? resolveColor(color, theme, auto) : ""}`;
  }).join("|");
  return { numFmt: normalizeFormatCode(style.formatCode), font, fill, border, alignment, wrap: Boolean(style.alignment?.wrapText) };
}

// Cạnh chung giữa hai ô: Excel vẽ đường kẻ nếu MỘT trong hai ô khai báo. LibreOffice ghi lại viền của ô kề
// (A6 bottom "" + A7 top thin → A6 bottom thin): cùng hình vẽ. So sánh cạnh "hiệu dụng" = ô này hoặc ô kề.
function effectiveBorder(cells, coord, border, theme) {
  const m = /^([A-Z]+)(\d+)$/.exec(coord);
  if (!m) return border;
  const col = [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0), row = Number(m[2]);
  const name = n => { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const neighbor = { left: col > 1 ? `${name(col - 1)}${row}` : null, right: `${name(col + 1)}${row}`, top: row > 1 ? `${name(col)}${row - 1}` : null, bottom: `${name(col)}${row + 1}` };
  const opposite = { left: "right", right: "left", top: "bottom", bottom: "top" };
  const own = Object.fromEntries(String(border || "").split("|").filter(Boolean).map(part => [part.split(":")[0], part]));
  return ["left", "right", "top", "bottom"].map(side => {
    const mine = own[side] || `${side}::`;
    if (mine.split(":")[1]) return mine;
    const other = neighbor[side] ? cells.get(neighbor[side]) : null;
    if (!other) return mine;
    const theirs = comparableStyle(other, theme).border.split("|").find(part => part.startsWith(`${opposite[side]}:`)) || "";
    const [, lineStyle, color] = theirs.split(":");
    return lineStyle ? `${side}:${lineStyle}:${color || ""}` : mine;
  }).join("|");
}

// So sánh từng loại style: màu (font/fill/viền) dung sai ±2/kênh, phần còn lại so chuỗi ổn định.
function styleKindEqual(kind, a, b) {
  if (kind === "font") {
    const { color: ca, ...ra } = a || {}; const { color: cb, ...rb } = b || {};
    return stable(ra) === stable(rb) && colorsClose(ca, cb);
  }
  if (kind === "fill") return (a?.pattern || "") === (b?.pattern || "") && colorsClose(a?.color, b?.color);
  if (kind === "border") {
    const pa = String(a || "").split("|"), pb = String(b || "").split("|");
    if (pa.length !== pb.length) return false;
    return pa.every((part, i) => {
      const [sa, la, xa] = part.split(":"); const [sb, lb, xb] = pb[i].split(":");
      return sa === sb && la === lb && (!la || colorsClose(xa, xb));
    });
  }
  return stable(a) === stable(b);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function auditSheetRoundtrip(expectedPath, actualPath, { maxDetails = 20 } = {}) {
  const expected = parseXlsxWorkbook(expectedPath); const actual = parseXlsxWorkbook(actualPath);
  const kindNames = ["value", "formula", "numberFormat", "font", "fill", "border", "alignment", "wrap", "merge", "columnWidth", "rowHeight", "hiddenColumn", "hiddenRow", "freeze", "autoFilter", "visibility", "image"];
  const report = { files: { expected: path.resolve(expectedPath), actual: path.resolve(actualPath) },
    expectedSheets: expected.names.length, actualSheets: actual.names.length,
    sheetOrderMatch: expected.names.join("\0") === actual.names.join("\0"), expectedActiveSheet: expected.active,
    actualActiveSheet: actual.active, activeSheetMatch: expected.active === actual.active, totals: { mismatches: 0 }, sheets: [] };
  const compareSet = (kinds, kind, a, b) => {
    for (const item of setDiff(new Set(a), new Set(b))) mismatch(kinds[kind], { expected: item, actual: false }, maxDetails);
    for (const item of setDiff(new Set(b), new Set(a))) mismatch(kinds[kind], { expected: false, actual: item }, maxDetails);
  };
  for (const name of [...new Set([...expected.names, ...actual.names])]) {
    const left = expected.sheets.get(name); const right = actual.sheets.get(name);
    const kinds = Object.fromEntries(kindNames.map(key => [key, { count: 0, items: [] }]));
    if (!left || !right) { mismatch(kinds.visibility, { sheet: name, expected: Boolean(left), actual: Boolean(right) }, maxDetails); }
    else {
      for (const coord of [...new Set([...left.cells.keys(), ...right.cells.keys()])]) {
        const a = left.cells.get(coord); const b = right.cells.get(coord);
        if (!a?.noCache && !valuesEqual(a?.value, b?.value)) mismatch(kinds.value, { coord, expected: a?.value, actual: b?.value }, maxDetails);
        if (normalizeFormula(a?.formula) !== normalizeFormula(b?.formula)) mismatch(kinds.formula, { coord, expected: a?.formula || "", actual: b?.formula || "" }, maxDetails);
        const as = comparableStyle(a || {}, expected.theme); const bs = comparableStyle(b || {}, actual.theme);
        as.border = effectiveBorder(left.cells, coord, as.border, expected.theme);
        bs.border = effectiveBorder(right.cells, coord, bs.border, actual.theme);
        for (const [kind, key] of [["numberFormat", "numFmt"], ["font", "font"], ["fill", "fill"], ["border", "border"], ["alignment", "alignment"], ["wrap", "wrap"]]) {
          // Cell XF font is not the effective font of a fully rich shared
          // string; each run carries its own rPr. Calc commonly derives that
          // unused XF from the first run, so compare run-based semantics.
          if (kind === "font" && (a?.richText || b?.richText)) continue;
          if (!styleKindEqual(kind, as[key], bs[key])) mismatch(kinds[kind], { coord, expected: as[key], actual: bs[key] }, maxDetails);
        }
      }
      compareSet(kinds, "merge", left.merges, right.merges);
      compareSet(kinds, "hiddenColumn", left.hiddenCols, right.hiddenCols); compareSet(kinds, "hiddenRow", left.hiddenRows, right.hiddenRows);
      compareSet(kinds, "image", left.images, right.images);
      // LibreOffice commonly emits an explicit default-width range through
      // XFD. Ignore declarations beyond both workbooks' used data range.
      const maxMeaningfulColumn = Math.max(left.maxDataColumn, right.maxDataColumn);
      const columnNumber = coord => [...coord].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
      for (const coord of new Set([...left.columns.keys(), ...right.columns.keys()])) {
        if (columnNumber(coord) > maxMeaningfulColumn) continue;
        const width = left.columns.get(coord) ?? left.defaultColumnPx; const actualWidth = right.columns.get(coord) ?? right.defaultColumnPx;
        if (!closePx(width, actualWidth)) mismatch(kinds.columnWidth, { coord, expected: width, actual: actualWidth }, maxDetails);
      }
      for (const [coord, height] of left.rows) if (!closePx(height, right.rows.get(coord) ?? 26)) mismatch(kinds.rowHeight, { coord, expected: height, actual: right.rows.get(coord) ?? 26 }, maxDetails);
      if (stable(left.freeze) !== stable(right.freeze)) mismatch(kinds.freeze, { expected: left.freeze, actual: right.freeze }, maxDetails);
      if (left.autoFilter !== right.autoFilter) mismatch(kinds.autoFilter, { expected: left.autoFilter, actual: right.autoFilter }, maxDetails);
      if (left.state !== right.state) mismatch(kinds.visibility, { expected: left.state, actual: right.state }, maxDetails);
    }
    const mismatchCount = Object.values(kinds).reduce((sum, bucket) => sum + bucket.count, 0);
    report.sheets.push({ name, mismatchCount, mismatches: kinds }); report.totals.mismatches += mismatchCount;
  }
  return report;
}

export function printRoundtripReport(report, stream = process.stdout) {
  stream.write(`AUDIT XLSX -> XLSX (${report.expectedSheets} -> ${report.actualSheets} sheet)\n`);
  stream.write(`Thu tu sheet: ${report.sheetOrderMatch ? "KHOP" : "LECH"}; active: ${report.expectedActiveSheet} -> ${report.actualActiveSheet} ${report.activeSheetMatch ? "KHOP" : "LECH"}\n`);
  for (const sheet of report.sheets) {
    stream.write(`\n[${sheet.name}] sai lech ${sheet.mismatchCount}\n`);
    for (const [kind, bucket] of Object.entries(sheet.mismatches)) if (bucket.count) {
      stream.write(`  ${kind}: ${bucket.count}\n`); for (const detail of bucket.items) stream.write(`    ${JSON.stringify(detail)}\n`);
    }
  }
  stream.write(`\nTONG sai lech: ${report.totals.mismatches}\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const roundtrip = args.includes("--xlsx-vs-xlsx");
  const positional = args.filter(arg => arg !== "--json" && arg !== "--xlsx-vs-xlsx");
  if (positional.length !== 2) {
    console.error("Usage: node scripts/audit-sheet-import.mjs [--json] [--xlsx-vs-xlsx] <expected.xlsx> <actual.fods|actual.xlsx>"); process.exit(2);
  }
  try {
    const report = roundtrip ? auditSheetRoundtrip(positional[0], positional[1]) : auditSheetImport(positional[0], positional[1]);
    if (json) console.log(JSON.stringify(report, null, 2)); else (roundtrip ? printRoundtripReport(report) : printAuditReport(report));
  } catch (error) { console.error(`Audit thất bại: ${error.message}`); process.exit(1); }
}
