/**
 * Real soffice round-trip proof for Writer Page Color + Section Breaks.
 *
 * Confirms, by byte-level inspection of an actual converted PDF (not just
 * the in-app canvas), that:
 *  - Page Color genuinely renders as a real fill rectangle in the PDF.
 *  - A Section Break genuinely produces a real second PDF page (not just a
 *    visual marker in the editor).
 *  - KNOWN LIMITATION (documented, not silently claimed as working): the
 *    per-section page geometry (orientation/size/margins) does NOT survive
 *    real export. LibreOffice's Writer HTML import filter applies only the
 *    single document-level `@page {}` rule; named per-section `@page <id> {}`
 *    rules assigned via `.class { page: <id> }` are ignored. Both exported
 *    pages therefore share one page size (whatever the last-edited section's
 *    setup was) even though the in-app canvas correctly previews distinct
 *    per-section orientation/size. Fixing this for real would require direct
 *    OOXML/ODF section-properties (w:sectPr / ODF) XML surgery post-convert,
 *    which is out of scope here — tracked as a follow-up, not silently faked.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

assert.ok(findSoffice(), "LibreOffice soffice is required");

function pdfMediaBoxes(pdfPath) {
  const text = fs.readFileSync(pdfPath).toString("latin1");
  return [...text.matchAll(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g)]
    .map((m) => ({ w: Number(m[3]) - Number(m[1]), h: Number(m[4]) - Number(m[2]) }));
}
function pdfPageCount(pdfPath) {
  return (fs.readFileSync(pdfPath).toString("latin1").match(/\/Type\s*\/Page(?!s)\b/g) || []).length;
}
function pdfFillColors(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const text = bytes.toString("latin1");
  const streams = [];
  for (const match of text.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) continue;
    try { streams.push(zlib.inflateSync(bytes.subarray(start, end).subarray(0, -1)).toString("latin1")); } catch (_) {}
  }
  return streams.join("\n").match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+rg/g) || [];
}

function createAdapter() {
  const body = { innerHTML: "<p>Muc mot noi dung.</p>", innerText: "Muc mot noi dung.", contains: () => true, querySelectorAll: () => [], querySelector: () => null, classList: { add() {}, remove() {}, toggle() {} }, style: {} };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const editor = {
    style: { setProperty() {} }, innerHTML: "",
    querySelector(sel) { if (sel === ".vno-writer-body") return body; if (sel === ".vno-writer-header") return header; if (sel === ".vno-writer-footer") return footer; return null; },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {}, removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), body };
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-section-pagecolor-"));
try {
  const { adapter, body } = createAdapter();
  adapter.setPageColor("#dbeafe");
  adapter.insertSectionBreak("nextPage");
  adapter.setPageSetup({ orientation: "landscape" });
  body.innerHTML += "<p>Muc hai noi dung ngang.</p>";

  const html = adapter._contentForExport();
  const src = path.join(temp, "doc.html");
  fs.writeFileSync(src, html, "utf8");
  const pdf = convertWithSoffice(src, "pdf", path.join(temp, "pdf"), { appKind: "writer" });

  const pageCount = pdfPageCount(pdf);
  assert.equal(pageCount, 2, `Section Break must produce a real second PDF page, got ${pageCount}`);

  const fills = pdfFillColors(pdf);
  const hasPageColorFill = fills.some((op) => {
    const [r, g, b] = op.split(/\s+/).map(Number);
    return Math.abs(r - 0.8588) < 0.01 && Math.abs(g - 0.9176) < 0.01 && Math.abs(b - 0.9961) < 0.01;
  });
  assert.ok(hasPageColorFill, `Page Color #dbeafe must render as a real fill rectangle in the PDF, found: ${JSON.stringify(fills)}`);

  const boxes = pdfMediaBoxes(pdf);
  const distinctGeometry = boxes.length === 2 && Math.abs(boxes[0].w - boxes[1].w) > 1;
  console.log(`PASS: real page break (2 pages) and real Page Color fill confirmed in exported PDF.`);
  console.log(`${distinctGeometry ? "PASS" : "KNOWN LIMIT"}: per-section distinct page geometry ${distinctGeometry ? "survived" : "did NOT survive"} real export (mediaBoxes=${JSON.stringify(boxes)}) — canvas preview only today, tracked as follow-up.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
