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

function attrs(text = "") {
  const result = {};
  text.replace(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g, (_, key, _q, value) => { result[key] = decodeXml(value); return ""; });
  return result;
}

function xmlEntry(xlsx, name, required = false) {
  const data = readZipEntry(xlsx, name);
  if (!data && required) throw new Error(`XLSX thiếu ${name}`);
  return data?.toString("utf8") || "";
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
  xml.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/gi, (_, body) => {
    const pieces = [];
    body.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi, (_m, text) => { pieces.push(decodeXml(text)); return ""; });
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
  const color = block => {
    const a = attrs(block.match(/<(?:color|fgColor)\b([^>]*)\/?\s*>/i)?.[1] || "");
    const indexed = { 8: "#000000", 9: "#FFFFFF", 64: "" };
    return a.rgb ? `#${a.rgb.slice(-6).toUpperCase()}` : (a.indexed ? (indexed[Number(a.indexed)] ?? `indexed:${a.indexed}`) : (a.theme ? `theme:${a.theme}${a.tint ? `:${a.tint}` : ""}` : ""));
  };
  const fonts = childBlocks("fonts").map(block => ({
    name: attrs(block.match(/<name\b([^>]*)\/?\s*>/i)?.[1] || "").val || "",
    size: Number(attrs(block.match(/<sz\b([^>]*)\/?\s*>/i)?.[1] || "").val || 0),
    bold: /<b\b/i.test(block), italic: /<i\b/i.test(block), color: color(block)
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
  return xfs;
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
  const result = { cells: new Map(), merges: [], columns: new Map(), rows: new Map(), hiddenRows: new Set(), hiddenCols: new Set(), freeze: { rows: 0, cols: 0 }, autoFilter: "", maxDataColumn: 0 };
  xml.replace(/<col\b([^>]*)\/?\s*>/gi, (_, raw) => {
    const a = attrs(raw); const min = Number(a.min); const max = Number(a.max || a.min);
    for (let col = min; col <= max; col++) {
      if (a.width !== undefined) result.columns.set(columnName(col), Number(a.width) * 7 + 5);
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
    if (a.t === "s") value = sharedStrings[Number(rawValue)] ?? "";
    else if (a.t === "inlineStr") {
      const pieces = []; body.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi, (_m, text) => { pieces.push(decodeXml(text)); return ""; }); value = pieces.join("");
    } else if (a.t === "b") value = rawValue === "1";
    else if (a.t === "str" || a.t === "e") value = rawValue;
    else if (rawValue !== "") value = Number(rawValue);
    // A self-closing <c/> only carries style/used-range metadata, not data.
    if (rawValue !== "" || formula || a.t === "inlineStr") {
      result.cells.set(coord, { coord, value, formula, ...style, category: formatCategory(style.formatCode) });
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
    for (const [coord, px] of source.columns) if (!closePx(px, actualCols.get(coord) ?? 100)) mismatch(kinds.columnWidth, { coord, expected: px, actual: actualCols.get(coord) ?? 100 }, maxDetails);
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
  return { names: sheetDefs.map(s => s.name), active: sheetDefs[Number(view.activeTab || 0)]?.name || sheetDefs[0]?.name || "", sheets };
}

function comparableStyle(style = {}) {
  return {
    numFmt: normalizeFormatCode(style.formatCode), font: style.font || {}, fill: style.fill || {},
    border: style.border || "", alignment: style.alignment || {}, wrap: Boolean(style.alignment?.wrapText)
  };
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
        if (!valuesEqual(a?.value, b?.value)) mismatch(kinds.value, { coord, expected: a?.value, actual: b?.value }, maxDetails);
        if (normalizeFormula(a?.formula) !== normalizeFormula(b?.formula)) mismatch(kinds.formula, { coord, expected: a?.formula || "", actual: b?.formula || "" }, maxDetails);
        const as = comparableStyle(a || {}); const bs = comparableStyle(b || {});
        for (const [kind, key] of [["numberFormat", "numFmt"], ["font", "font"], ["fill", "fill"], ["border", "border"], ["alignment", "alignment"], ["wrap", "wrap"]])
          if (stable(as[key]) !== stable(bs[key])) mismatch(kinds[kind], { coord, expected: as[key], actual: bs[key] }, maxDetails);
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
        const width = left.columns.get(coord) ?? 100; const actualWidth = right.columns.get(coord) ?? 100;
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
