/**
 * Real soffice proof that Insert Page Break and Mail Merge "Finish & Merge"
 * produce genuine page breaks in an exported PDF/DOCX, not just a visual
 * marker in the live canvas.
 *
 * Root cause found during review: both markers used a <div style="page-break-
 * before:always;...">, which LibreOffice's Writer HTML-import filter silently
 * ignores (it only honors page-break-before on a real <p>). Browsers DO honor
 * break-before on a div, so the live canvas looked correct while real export
 * produced zero page breaks - the same bug class already found and fixed for
 * Section Breaks and Labels multi-sheet export.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

assert.ok(findSoffice(), "LibreOffice soffice is required");

function createAdapter(html) {
  const body = {
    innerHTML: html, innerText: "x", contains: () => true, querySelectorAll: () => [], querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {} }, style: {}
  };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const editor = {
    style: { setProperty() {} }, innerHTML: html,
    querySelector(sel) { if (sel === ".vno-writer-body") return body; if (sel === ".vno-writer-header") return header; if (sel === ".vno-writer-footer") return footer; return null; },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {}, removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), body };
}

function pdfPageCount(pdfPath) {
  return (fs.readFileSync(pdfPath).toString("latin1").match(/\/Type\s*\/Page(?!s)\b/g) || []).length;
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-pagebreak-export-"));
try {
  // Plain Insert Page Break (writer.file / Layout > Breaks > Page Break)
  const { adapter: pbAdapter, body: pbBody } = createAdapter("<p>Trang mot.</p>");
  pbAdapter._insertPageBreak();
  pbBody.innerHTML += "<p>Trang hai.</p>";
  const pbHtml = pbAdapter._contentForExport();
  const pbSrc = path.join(temp, "pagebreak.html");
  fs.writeFileSync(pbSrc, pbHtml, "utf8");
  const pbPdf = convertWithSoffice(pbSrc, "pdf", path.join(temp, "pb-pdf"), { appKind: "writer" });
  const pbPages = pdfPageCount(pbPdf);
  assert.equal(pbPages, 2, `Insert Page Break must produce a real second PDF page, got ${pbPages}`);
  console.log(`PASS: Insert Page Break -> real PDF page count = ${pbPages}`);

  // Mail Merge "Finish & Merge" (3 records must land on 3 separate pages)
  const { adapter: mmAdapter } = createAdapter(`<p><span class="vno-merge-field" data-field="Ten">«Ten»</span></p>`);
  mmAdapter.mailMergeData = { fields: ["Ten"], records: [{ Ten: "Mot" }, { Ten: "Hai" }, { Ten: "Ba" }], rawCsv: "" };
  mmAdapter.finishMailMerge();
  const mmHtml = mmAdapter._contentForExport();
  const mmSrc = path.join(temp, "mailmerge.html");
  fs.writeFileSync(mmSrc, mmHtml, "utf8");
  const mmPdf = convertWithSoffice(mmSrc, "pdf", path.join(temp, "mm-pdf"), { appKind: "writer" });
  const mmPages = pdfPageCount(mmPdf);
  assert.equal(mmPages, 3, `Mail Merge Finish must produce 3 real separate PDF pages (one per record), got ${mmPages}`);
  console.log(`PASS: Mail Merge Finish & Merge (3 records) -> real PDF page count = ${mmPages}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
