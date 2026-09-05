/**
 * Real soffice probe for Writer Envelopes/Labels page geometry.
 * Not part of node tests/run-tests.js. Documents the known HTML-filter limit:
 * mixed envelope + A4 page sizes do not survive LibreOffice HTML import.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildLabelSheetHtml } from "../../apps/writer/envelopes-labels.js";

function createAdapter(html) {
  const body = {
    innerHTML: html,
    innerText: "x",
    contains: () => true,
    querySelectorAll: () => [],
    querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}
  };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const editor = {
    style: { setProperty() {} },
    innerHTML: html,
    querySelector(sel) {
      if (sel === ".vno-writer-body") return body;
      if (sel === ".vno-writer-header") return header;
      if (sel === ".vno-writer-footer") return footer;
      return null;
    },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {},
    removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), body };
}

function pdfMediaBoxes(pdfPath) {
  const text = fs.readFileSync(pdfPath).toString("latin1");
  return [...text.matchAll(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g)]
    .map((m) => ({ w: Number(m[3]) - Number(m[1]), h: Number(m[4]) - Number(m[2]) }));
}

function ptsToMm(pt) {
  return pt * 25.4 / 72;
}

const soffice = findSoffice();
if (!soffice) {
  console.log("NO_SOFFICE");
  process.exit(0);
}
console.log("soffice", soffice);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-env-probe-"));

const mixed = createAdapter("<p>Cong van A4 goc.</p>");
mixed.adapter.insertEnvelope({
  size: "dl",
  deliveryAddress: "Nguyen Van An\n18 Pho Hue\nHa Noi",
  returnAddress: "So TTTT",
  position: "end"
});
const mixedHtml = mixed.adapter._contentForExport();
fs.writeFileSync(path.join(temp, "mixed.html"), mixedHtml, "utf8");
const mixedPdf = convertWithSoffice(path.join(temp, "mixed.html"), "pdf", path.join(temp, "mixed-pdf"), { appKind: "writer" });
const mixedBoxes = pdfMediaBoxes(mixedPdf).map((b) => ({
  wMm: +ptsToMm(b.w).toFixed(1),
  hMm: +ptsToMm(b.h).toFixed(1)
}));
console.log("MIXED_PAGES", mixedBoxes.length, JSON.stringify(mixedBoxes));
console.log("MIXED_HAS_NAMED_PAGE", mixedHtml.includes("@page vno-"));
console.log("MIXED_DEFAULT_PAGE", (mixedHtml.match(/@page \{[^}]+\}/) || [""])[0]);

const envOnly = createAdapter("<p></p>");
envOnly.adapter.insertEnvelope({ size: "dl", deliveryAddress: "Chi phong bi", position: "start" });
const envHtml = envOnly.adapter._contentForExport();
fs.writeFileSync(path.join(temp, "env.html"), envHtml, "utf8");
const envPdf = convertWithSoffice(path.join(temp, "env.html"), "pdf", path.join(temp, "env-pdf"), { appKind: "writer" });
const envBoxes = pdfMediaBoxes(envPdf).map((b) => ({
  wMm: +ptsToMm(b.w).toFixed(1),
  hMm: +ptsToMm(b.h).toFixed(1)
}));
console.log("ENV_ONLY_PAGES", envBoxes.length, JSON.stringify(envBoxes));
console.log("ENV_DEFAULT_PAGE", (envHtml.match(/@page \{[^}]+\}/) || [""])[0]);

const labels = createAdapter("<p>Goc</p>");
labels.adapter.insertLabels({ layout: "avery-l7160", content: "Nhan ABC\nHa Noi" });
const labHtml = labels.adapter._contentForExport();
fs.writeFileSync(path.join(temp, "labels.html"), labHtml, "utf8");
const labPdf = convertWithSoffice(path.join(temp, "labels.html"), "pdf", path.join(temp, "lab-pdf"), { appKind: "writer" });
const labBoxes = pdfMediaBoxes(labPdf).map((b) => ({
  wMm: +ptsToMm(b.w).toFixed(1),
  hMm: +ptsToMm(b.h).toFixed(1)
}));
console.log("LABELS_PAGES", labBoxes.length, JSON.stringify(labBoxes));
console.log("LABELS_DEFAULT_PAGE", (labHtml.match(/@page \{[^}]+\}/) || [""])[0]);

// Isolated real-page-break check for multi-sheet label runs: tiny content
// (no natural table-height overflow possible) so a real second PDF page can
// only come from the pageBreak:true marker actually working, not coincidence.
const tinyLayout = { id: "tiny", cols: 1, rows: 1, cellW: 20, cellH: 10, pageW: 210, hGap: 0, vGap: 0 };
const tinySheet1 = buildLabelSheetHtml({ layout: tinyLayout, contents: ["Sheet1"], pageBreak: false });
const tinySheet2 = buildLabelSheetHtml({ layout: tinyLayout, contents: ["Sheet2"], pageBreak: true });
const tinyHtml = `<html><body>${tinySheet1}${tinySheet2}</body></html>`;
fs.writeFileSync(path.join(temp, "labels-tiny.html"), tinyHtml, "utf8");
const tinyPdf = convertWithSoffice(path.join(temp, "labels-tiny.html"), "pdf", path.join(temp, "tiny-pdf"), { appKind: "writer" });
const tinyPageCount = tinyPdf ? pdfMediaBoxes(tinyPdf).length : 0;
assert.equal(tinyPageCount, 2, `Multi-sheet Labels must produce a real second PDF page from tiny content (no overflow), got ${tinyPageCount} — page-break-before on the label sheet <div> would be silently ignored by LibreOffice's HTML filter (same bug class as Section Breaks)`);
console.log("LABELS_MULTIPAGE_REAL_BREAK_PAGES", tinyPageCount, "(PASS: real page break confirmed independent of content height)");

console.log("TEMP", temp);
