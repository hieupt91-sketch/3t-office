import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

const makeFods = (name, setup) => {
  const sheet = "Sheet1";
  const grid = {
    sheets: [sheet], activeSheet: sheet,
    sheetsData: { [sheet]: new Map([["A1", { val: "VN Office Page Setup", formula: "", style: {} }]]) },
    commentsBySheet: { [sheet]: {} }, mergedRangesBySheet: { [sheet]: [] }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
    conditionalFormattingBySheet: { [sheet]: [] }, dataValidationsBySheet: { [sheet]: [] }, pivotTablesBySheet: {},
    printAreaBySheet: { [sheet]: "A1:A1" }, pageSetupBySheet: { [sheet]: setup }
  };
  const file = path.join(temp, `${name}.fods`);
  fs.writeFileSync(file, new SheetAdapter(grid).serializeToFods(), "utf8");
  return file;
};

try {
  const portrait = makeFods("a4-portrait", { size: "a4", orientation: "portrait", margins: { top: 1, bottom: 1.2, left: 1.4, right: 1.6 } });
  const landscape = makeFods("legal-landscape", { size: "legal", orientation: "landscape", margins: { top: 2.1, bottom: 2.2, left: 2.3, right: 2.4 } });
  const portraitPdf = convertWithSoffice(portrait, "pdf", path.join(temp, "pdf-a4"), { appKind: "sheet" });
  const landscapePdf = convertWithSoffice(landscape, "pdf", path.join(temp, "pdf-legal"), { appKind: "sheet" });
  const a4 = pdfSizePoints(portraitPdf);
  const legal = pdfSizePoints(landscapePdf);
  assert.ok(Math.abs(a4.width - 595.28) < 1 && Math.abs(a4.height - 841.89) < 1, `A4 portrait mismatch: ${JSON.stringify(a4)}`);
  assert.ok(Math.abs(legal.width - 1008) < 1 && Math.abs(legal.height - 612) < 1, `Legal landscape mismatch: ${JSON.stringify(legal)}`);

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
  fs.rmSync(temp, { recursive: true, force: true });
}
