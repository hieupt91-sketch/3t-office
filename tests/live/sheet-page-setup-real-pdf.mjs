import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-page-setup-"));
const pdfSizePoints = pdfPath => {
  const text = fs.readFileSync(pdfPath).toString("latin1");
  const match = text.match(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/);
  assert.ok(match, `PDF MediaBox not found in ${pdfPath}`);
  return { width: Number(match[3]) - Number(match[1]), height: Number(match[4]) - Number(match[2]) };
};
const pdfPageCount = pdfPath => (fs.readFileSync(pdfPath).toString("latin1").match(/\/Type\s*\/Page(?!s)\b/g) || []).length;
const pdfInflatedText = pdfPath => {
  const bytes = fs.readFileSync(pdfPath);
  const source = bytes.toString("latin1");
  const texts = [source];
  for (const match of source.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const end = source.indexOf("endstream", start);
    if (end < 0) continue;
    try { texts.push(zlib.inflateSync(bytes.subarray(start, end).subarray(0, -1)).toString("latin1")); } catch (_) { }
  }
  const inflated = texts.join("\n");
  const cmap = new Map();
  for (const match of inflated.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
    try { cmap.set(match[1].toUpperCase(), (match[2].match(/.{4}/g) || []).map(code => String.fromCharCode(Number.parseInt(code, 16))).join("")); } catch (_) { }
  }
  const decoded = [...inflated.matchAll(/<([0-9A-Fa-f]{4,})>/g)].map(match => {
    const hex = match[1].toUpperCase();
    return (hex.match(/.{1,2}/g) || []).map(code => cmap.get(code) || "").join("");
  }).join("\n");
  return `${inflated}\n${decoded}`;
};
const pdfTextDrawCount = pdfPath => (pdfInflatedText(pdfPath).match(/\bTj\b/g) || []).length;

const makeFods = (name, setup) => {
  const sheet = "Sheet1";
  const grid = {
    sheets: [sheet], activeSheet: sheet,
    sheetsData: { [sheet]: new Map(Array.from({ length: 50 }, (_, row) => Array.from({ length: 26 }, (_, col) => [`${String.fromCharCode(65 + col)}${row + 1}`, { val: `R${row + 1}C${col + 1}`, formula: "", style: {} }])).flat()) },
    commentsBySheet: { [sheet]: {} }, mergedRangesBySheet: { [sheet]: [] }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
    conditionalFormattingBySheet: { [sheet]: [] }, dataValidationsBySheet: { [sheet]: [] }, pivotTablesBySheet: {},
    printAreaBySheet: { [sheet]: "A1:Z50" }, pageSetupBySheet: { [sheet]: setup }
  };
  const file = path.join(temp, `${name}.fods`);
  fs.writeFileSync(file, new SheetAdapter(grid).serializeToFods(), "utf8");
  return file;
};

try {
  const portrait = makeFods("a4-portrait", { size: "a4", orientation: "portrait", margins: { top: 1, bottom: 1.2, left: 1.4, right: 1.6 } });
  const landscape = makeFods("legal-landscape", { size: "legal", orientation: "landscape", margins: { top: 2.1, bottom: 2.2, left: 2.3, right: 2.4 } });
  const fit = makeFods("fit-one-page", { size: "a4", orientation: "landscape", margins: { top: 1, bottom: 1, left: 1, right: 1 }, scale: { mode: "pages", percent: 100, pagesWide: 1, pagesTall: 1 }, headerFooter: { header: { left: "", center: "VNHEADER", right: "" }, footer: { left: "", center: "Page &P of &N", right: "" } } });
  const normal = makeFods("normal-size", { size: "a4", orientation: "landscape", margins: { top: 1, bottom: 1, left: 1, right: 1 }, scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0 } });
  const noHeader = makeFods("fit-no-header", { size: "a4", orientation: "landscape", margins: { top: 1, bottom: 1, left: 1, right: 1 }, scale: { mode: "pages", percent: 100, pagesWide: 1, pagesTall: 1 }, headerFooter: { header: { left: "", center: "", right: "" }, footer: { left: "", center: "", right: "" } } });
  const portraitPdf = convertWithSoffice(portrait, "pdf", path.join(temp, "pdf-a4"), { appKind: "sheet" });
  const landscapePdf = convertWithSoffice(landscape, "pdf", path.join(temp, "pdf-legal"), { appKind: "sheet" });
  const fitPdf = convertWithSoffice(fit, "pdf", path.join(temp, "pdf-fit"), { appKind: "sheet" });
  const normalPdf = convertWithSoffice(normal, "pdf", path.join(temp, "pdf-normal"), { appKind: "sheet" });
  const noHeaderPdf = convertWithSoffice(noHeader, "pdf", path.join(temp, "pdf-no-header"), { appKind: "sheet" });
  const a4 = pdfSizePoints(portraitPdf);
  const legal = pdfSizePoints(landscapePdf);
  assert.ok(Math.abs(a4.width - 595.28) < 1 && Math.abs(a4.height - 841.89) < 1, `A4 portrait mismatch: ${JSON.stringify(a4)}`);
  assert.ok(Math.abs(legal.width - 1008) < 1 && Math.abs(legal.height - 612) < 1, `Legal landscape mismatch: ${JSON.stringify(legal)}`);
  assert.equal(pdfPageCount(fitPdf), 1, "Scale to Fit did not produce one PDF page");
  assert.ok(pdfPageCount(normalPdf) > pdfPageCount(fitPdf), "100% output should span more pages than Fit to 1 × 1");
  assert.ok(fs.readFileSync(fit, "utf8").includes("VNHEADER"), "Header text is missing from source FODS");
  assert.ok(pdfTextDrawCount(fitPdf) > pdfTextDrawCount(noHeaderPdf), "Header/Footer did not add rendered text to the real PDF");

  const ods = convertWithSoffice(landscape, "ods", path.join(temp, "ods"), { appKind: "sheet" });
  const roundTrip = convertWithSoffice(ods, "fods", path.join(temp, "roundtrip"), { appKind: "sheet" });
  const canonical = fs.readFileSync(roundTrip, "utf8");
  const toCm = value => value.endsWith("in") ? Number.parseFloat(value) * 2.54 : value.endsWith("mm") ? Number.parseFloat(value) / 10 : Number.parseFloat(value);
  const layoutBlocks = [...canonical.matchAll(/<style:page-layout\b[^>]*>[\s\S]*?<\/style:page-layout>/g)].map(match => match[0]);
  const legalLayout = layoutBlocks.find(block => {
    const width = block.match(/fo:page-width="([\d.]+(?:cm|mm|in))"/)?.[1];
    return width && Math.abs(toCm(width) - 35.56) < 0.02;
  });
  assert.ok(legalLayout, "LibreOffice canonical FODS lost Legal landscape page layout");
  for (const [side, expected] of [["top", 2.1], ["bottom", 2.2], ["left", 2.3], ["right", 2.4]]) {
    const actual = legalLayout.match(new RegExp(`fo:margin-${side}="([\\d.]+(?:cm|mm|in))"`))?.[1];
    assert.ok(actual && Math.abs(toCm(actual) - expected) < 0.01, `LibreOffice margin-${side} mismatch: ${actual}`);
  }
  console.log(`PASS: real soffice PDF A4 portrait=${a4.width.toFixed(2)}x${a4.height.toFixed(2)}pt; Legal landscape=${legal.width.toFixed(2)}x${legal.height.toFixed(2)}pt; custom margins preserved through FODS→ODS→FODS.`);
} finally {
  if (process.env.VNO_KEEP_PAGE_SETUP_TEMP) console.log(`TEMP: ${temp}`);
  else fs.rmSync(temp, { recursive: true, force: true });
}
