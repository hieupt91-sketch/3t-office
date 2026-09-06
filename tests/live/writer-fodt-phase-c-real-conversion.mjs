/**
 * Phase C acceptance: page-layout / master-page / header-footer / mixed
 * geometry FODT -> real soffice DOCX/PDF. Assertions follow measured
 * engine behavior in docs/HANDOFF-WRITER-FODT-PHASE-C-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase C live test");

function adapterWithZones({ body = "", header = "", footer = "", pageSetup, sections } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const footerEl = {
    innerHTML: footer,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      if (selector === ".vno-writer-footer") return footerEl;
      return null;
    }
  });
  if (pageSetup) {
    adapter.pageSetup = JSON.parse(JSON.stringify(pageSetup));
    adapter.sectionPageSetups["section-1"] = JSON.parse(JSON.stringify(pageSetup));
  }
  if (sections) {
    adapter.sectionPageSetups = JSON.parse(JSON.stringify(sections));
    adapter._sectionSequence = Math.max(
      ...Object.keys(sections).map(key => Number(String(key).replace(/^section-/, "")) || 1)
    );
  }
  return adapter;
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function sectPrBlocks(documentXml) {
  return String(documentXml || "").match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g) || [];
}

function pdfMediaBoxes(pdfBytes) {
  return pdfBytes.toString("latin1").match(/\/MediaBox\s*\[[^\]]+\]/g) || [];
}

const A4 = { size: "a4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 30, right: 15 } };
const LETTER_L = { size: "letter", orientation: "landscape", margins: { top: 25, bottom: 25, left: 25, right: 25 } };
const DL = { size: "dl", orientation: "portrait", margins: { top: 8, bottom: 8, left: 10, right: 10 } };

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-c-"));
try {
  const a4Adapter = adapterWithZones({
    body: "<p>BODY_A4_VN</p>",
    header: "<p style='text-align: center; font-size: 10pt; margin: 0;'>HEADER_A4_VN</p>",
    footer: "<p style='text-align: center; font-size: 10pt; margin: 0;'>FOOTER_A4_VN</p>",
    pageSetup: A4
  });
  const a4Fodt = a4Adapter.serializeToFodt();
  const a4Path = path.join(tempRoot, "a4-header-footer.fodt");
  fs.writeFileSync(a4Path, a4Fodt, "utf8");
  const a4Docx = convertWithSoffice(a4Path, "docx", path.join(tempRoot, "a4-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-a4-docx")
  });
  const a4Pdf = convertWithSoffice(a4Path, "pdf", path.join(tempRoot, "a4-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-a4-pdf")
  });
  const a4Xml = readZipEntry(a4Docx, "word/document.xml")?.toString("utf8") || "";
  const a4Sect = sectPrBlocks(a4Xml);
  assert.equal(a4Sect.length, 1, "A4 document must have one w:sectPr");
  assert.match(a4Sect[0], /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(a4Sect[0], /<w:pgMar\b[^>]*w:left="1701"[^>]*w:right="850"/);
  assert.match(a4Sect[0], /<w:headerReference w:type="default"/);
  assert.match(a4Sect[0], /<w:footerReference w:type="default"/);
  const a4Zip = listZipEntries(a4Docx).map(entry => entry.name);
  assert.ok(a4Zip.includes("word/header1.xml"), "A4 DOCX must contain word/header1.xml");
  assert.ok(a4Zip.includes("word/footer1.xml"), "A4 DOCX must contain word/footer1.xml");
  assert.match(xmlText(readZipEntry(a4Docx, "word/header1.xml")?.toString("utf8")), /HEADER_A4_VN/);
  assert.match(xmlText(readZipEntry(a4Docx, "word/footer1.xml")?.toString("utf8")), /FOOTER_A4_VN/);
  assert.match(xmlText(a4Xml), /BODY_A4_VN/);
  const a4PdfBytes = fs.readFileSync(a4Pdf);
  assert.equal(a4PdfBytes.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.ok(pdfMediaBoxes(a4PdfBytes).some(box => /595\.3/.test(box) && /841\.8/.test(box)), `A4 PDF MediaBox, got ${pdfMediaBoxes(a4PdfBytes).join(" | ")}`);
  const a4Parsed = adapterWithZones({ body: "", header: "", footer: "" });
  a4Parsed.parseFodt(a4Fodt);
  assert.equal(a4Parsed.serializeToFodt(), a4Fodt, "A4+header/footer VN round-trip must be exactly idempotent");

  const letterAdapter = adapterWithZones({
    body: "<p>BODY_LETTER_LANDSCAPE</p>",
    header: "<p style='margin: 0;'>HEADER_LETTER_L</p>",
    pageSetup: LETTER_L
  });
  const letterFodt = letterAdapter.serializeToFodt();
  const letterPath = path.join(tempRoot, "letter-landscape.fodt");
  fs.writeFileSync(letterPath, letterFodt, "utf8");
  const letterDocx = convertWithSoffice(letterPath, "docx", path.join(tempRoot, "letter-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-letter-docx")
  });
  const letterPdf = convertWithSoffice(letterPath, "pdf", path.join(tempRoot, "letter-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-letter-pdf")
  });
  const letterXml = readZipEntry(letterDocx, "word/document.xml")?.toString("utf8") || "";
  const letterSect = sectPrBlocks(letterXml);
  assert.equal(letterSect.length, 1);
  assert.match(letterSect[0], /<w:pgSz w:orient="landscape"/);
  const letterSize = letterSect[0].match(/<w:pgSz w:orient="landscape" w:w="(\d+)" w:h="(\d+)"\/>/);
  assert.ok(letterSize, `Letter landscape pgSz, got ${letterSect[0]}`);
  assert.ok(Math.abs(Number(letterSize[1]) - 15817) < 40, `Letter landscape width twips ${letterSize[1]}`);
  assert.ok(Math.abs(Number(letterSize[2]) - 12246) < 40, `Letter landscape height twips ${letterSize[2]}`);
  const letterPdfBytes = fs.readFileSync(letterPdf);
  assert.equal(letterPdfBytes.subarray(0, 5).toString("latin1"), "%PDF-");
  const letterBoxes = pdfMediaBoxes(letterPdfBytes);
  assert.ok(letterBoxes.some(box => {
    const nums = box.match(/[\d.]+/g) || [];
    return nums.length >= 4 && Math.abs(Number(nums[2]) - 791) < 5 && Math.abs(Number(nums[3]) - 612) < 5;
  }), `Letter landscape MediaBox, got ${letterBoxes.join(" | ")}`);

  const mixedAdapter = adapterWithZones({
    body: '<p>BODY_A4_BEFORE_ENVELOPE</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>BODY_ENVELOPE_AFTER_A4</p>',
    header: "<p style='margin: 0;'>HEADER_SHARED_VN</p>",
    footer: "<p style='margin: 0;'>FOOTER_SHARED_VN</p>",
    sections: { "section-1": A4, "section-2": DL }
  });
  const mixedFodt = mixedAdapter.serializeToFodt();
  const mixedPath = path.join(tempRoot, "mixed-a4-envelope.fodt");
  fs.writeFileSync(mixedPath, mixedFodt, "utf8");
  const mixedDocx = convertWithSoffice(mixedPath, "docx", path.join(tempRoot, "mixed-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-mixed-docx")
  });
  const mixedPdf = convertWithSoffice(mixedPath, "pdf", path.join(tempRoot, "mixed-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-mixed-pdf")
  });
  const mixedXml = readZipEntry(mixedDocx, "word/document.xml")?.toString("utf8") || "";
  const mixedSect = sectPrBlocks(mixedXml);
  assert.equal(mixedSect.length, 2, `mixed geometry must create two w:sectPr, got ${mixedSect.length}`);
  assert.match(mixedSect[0], /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(mixedSect[1], /<w:pgSz w:w="12472" w:h="6236"\/>/);
  assert.match(mixedXml, /<w:br\b[^>]*w:type="page"/);
  assert.match(xmlText(mixedXml), /BODY_A4_BEFORE_ENVELOPE/);
  assert.match(xmlText(mixedXml), /BODY_ENVELOPE_AFTER_A4/);
  const mixedPdfBytes = fs.readFileSync(mixedPdf);
  assert.equal(mixedPdfBytes.subarray(0, 5).toString("latin1"), "%PDF-");
  const mixedBoxes = pdfMediaBoxes(mixedPdfBytes);
  assert.ok(mixedBoxes.some(box => /595\.3/.test(box) && /841\.8/.test(box)), `mixed PDF must keep A4 MediaBox, got ${mixedBoxes.join(" | ")}`);
  assert.ok(mixedBoxes.some(box => /623\.5/.test(box) && /311\.8/.test(box)), `mixed PDF must keep envelope MediaBox, got ${mixedBoxes.join(" | ")}`);
  const mixedParsed = adapterWithZones({ body: "", header: "", footer: "" });
  mixedParsed.parseFodt(mixedFodt);
  assert.equal(mixedParsed.serializeToFodt(), mixedFodt, "mixed A4+envelope VN round-trip must be exactly idempotent");

  console.log("Writer FODT Phase C real conversion: PASS");
  console.log(`A4_DOCX=${a4Docx}`);
  console.log(`LETTER_DOCX=${letterDocx}`);
  console.log(`MIXED_DOCX=${mixedDocx}`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
