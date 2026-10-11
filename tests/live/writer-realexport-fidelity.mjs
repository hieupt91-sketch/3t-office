/**
 * Permanent real-soffice audit for Writer HTML-import fidelity.
 *
 * This deliberately inspects the generated DOCX package rather than trusting
 * browser DOM/CSS. Each assertion describes a user-visible or document-level
 * promise that must survive `_contentForExport()` -> soffice.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assert.ok(findSoffice(), "LibreOffice soffice is required for Writer real-export fidelity audit");

function createAdapter(bodyHtml, { headerHtml = "", footerHtml = "" } = {}) {
  const body = {
    innerHTML: bodyHtml,
    innerText: bodyHtml.replace(/<[^>]+>/g, " "),
    contains: () => true,
    querySelectorAll: () => [],
    querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}
  };
  const header = { innerHTML: headerHtml, innerText: headerHtml.replace(/<[^>]+>/g, " ").trim() };
  const footer = { innerHTML: footerHtml, innerText: footerHtml.replace(/<[^>]+>/g, " ").trim() };
  const editor = {
    style: { setProperty() {} },
    innerHTML: bodyHtml,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return body;
      if (selector === ".vno-writer-header") return header;
      if (selector === ".vno-writer-footer") return footer;
      return null;
    },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {},
    removeEventListener() {}
  };
  return new WriterAdapter(editor);
}

function xmlText(xml) {
  return String(xml || "")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function packageXml(docx, entry) {
  return readZipEntry(docx, entry)?.toString("utf8") || "";
}

function convertAdapter(temp, name, adapter) {
  const source = path.join(temp, `${name}.html`);
  const outputDir = path.join(temp, `${name}-docx`);
  fs.writeFileSync(source, `<!doctype html><html><head><meta charset="utf-8"></head><body>${adapter._contentForExport()}</body></html>`, "utf8");
  const docxPath = convertWithSoffice(source, "docx", outputDir, {
    appKind: "writer",
    profileDir: path.join(temp, `${name}-profile`)
  });
  execFileSync("python", ["-c", "import main,sys; main._apply_native_export_postprocess(sys.argv[1],sys.argv[2],'writer','docx')", source, docxPath], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  return docxPath;
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-realexport-audit-"));
try {
  // Priority group: Header/Footer must be repeating native DOCX parts.
  const headerFooter = createAdapter("<p>BODY_UNIQUE</p>", {
    headerHtml: "<p>HEADER_UNIQUE</p>", footerHtml: "<p>FOOTER_UNIQUE</p>"
  });
  headerFooter.sectionHeadersFooters["section-1"].differentFirstPage = true;
  const headerFooterDocx = convertAdapter(temp, "header-footer", headerFooter);
  const entries = listZipEntries(headerFooterDocx).map((entry) => entry.name);
  const headerPart = entries.find((name) => /^word\/header\d+\.xml$/.test(name));
  const footerPart = entries.find((name) => /^word\/footer\d+\.xml$/.test(name));
  assert.ok(headerPart, "Header must be exported as a native repeating DOCX header part");
  assert.ok(footerPart, "Footer must be exported as a native repeating DOCX footer part");
  const headerDocumentXml = packageXml(headerFooterDocx, "word/document.xml");
  assert.match(headerDocumentXml, /<w:headerReference\b/, "Section properties must reference the native header part");
  assert.match(headerDocumentXml, /<w:footerReference\b/, "Section properties must reference the native footer part");
  assert.match(headerDocumentXml, /<w:titlePg\b/, "Different first page must survive in section properties");
  assert.match(xmlText(packageXml(headerFooterDocx, headerPart)), /HEADER_UNIQUE/, "Native DOCX header part must contain the header text");
  assert.match(xmlText(packageXml(headerFooterDocx, footerPart)), /FOOTER_UNIQUE/, "Native DOCX footer part must contain the footer text");

  // Priority group: inserted/deleted text and comments must be real Word review markup.
  const tracked = createAdapter('<p>BASE <ins data-vno-change="insert" data-vno-author="Tran Thi Hoa" data-vno-date="2026-10-01T10:00:00Z">INSERT_TRACKED <mark data-comment-id="comment-1">COMMENT_ANCHOR</mark></ins> <del data-vno-change="delete" data-vno-author="Tran Thi Hoa" data-vno-date="2026-10-01T10:01:00Z">DELETE_TRACKED</del></p>');
  tracked.trackChangesEnabled = true;
  tracked.comments = [{ id: "comment-1", content: "Comment body", author: "Tran Thi Hoa", createdAt: "2026-10-01T10:02:00Z" }];
  const trackedDocx = convertAdapter(temp, "track-changes", tracked);
  const trackedXml = packageXml(trackedDocx, "word/document.xml");
  const trackedText = xmlText(trackedXml);
  const commentsXml = packageXml(trackedDocx, "word/comments.xml");
  const relsXml = packageXml(trackedDocx, "word/_rels/document.xml.rels");
  const settingsXml = packageXml(trackedDocx, "word/settings.xml");
  assert.match(trackedXml, /<w:ins\b[^>]*w:author="Tran Thi Hoa"[^>]*w:date="2026-10-01T10:00:00Z"/, "Insert must be a native Word revision with author/date");
  assert.match(trackedXml, /<w:del\b[^>]*w:author="Tran Thi Hoa"[^>]*w:date="2026-10-01T10:01:00Z"/, "Deletion must be a native Word revision with author/date");
  assert.match(trackedXml, /<w:delText[^>]*>DELETE_TRACKED<\/w:delText>/, "Deleted text must remain in w:delText");
  assert.match(trackedXml, /<w:commentRangeStart\b[\s\S]*COMMENT_ANCHOR[\s\S]*<w:commentRangeEnd\b[\s\S]*<w:commentReference\b/, "Comment must retain its Word anchor range and reference inside tracked insertion");
  assert.match(commentsXml, /w:author="Tran Thi Hoa"[\s\S]*Comment body/, "Comment body/author must be in word/comments.xml");
  assert.match(relsXml, /relationships\/comments/, "Comments part must have a document relationship");
  assert.match(settingsXml, /<w:trackRevisions\b/, "Review tracking setting must be present in settings.xml");

  // Priority group: TOC is currently a static generated TOC; its visible entries and links must survive.
  const toc = createAdapter('<div data-vno-toc="true"><div class="vno-toc-header">MUC_LUC</div><div><a href="#chuong-1">CHUONG_MOT</a></div></div><h1 id="chuong-1">CHUONG_MOT</h1>');
  const tocDocx = convertAdapter(temp, "toc", toc);
  const tocXml = packageXml(tocDocx, "word/document.xml");
  assert.match(xmlText(tocXml), /MUC_LUC[\s\S]*CHUONG_MOT/, "TOC title and entry must be visible in the real DOCX");
  assert.match(tocXml, /<w:hyperlink\b/, "TOC entry must remain a real hyperlink in the DOCX");

  // Columns must become native section columns, not merely remain browser CSS.
  const columns = createAdapter("<p>COT_MOT noi dung thu nghiem.</p><p>COT_HAI noi dung thu nghiem.</p>");
  columns.columns = { count: 2, gap: 12, rule: true };
  const columnsDocx = convertAdapter(temp, "columns", columns);
  const columnsXml = packageXml(columnsDocx, "word/document.xml");
  assert.match(columnsXml, /<w:cols\b[^>]*w:num="2"/, "Two-column layout must become native DOCX w:cols w:num=2");

  // Drop Cap must become native drop-cap paragraph framing in DOCX.
  const dropCap = createAdapter('<p><span class="vno-drop-cap" data-drop-lines="3">D</span>ROP_CAP_BODY</p>');
  const dropCapDocx = convertAdapter(temp, "drop-cap", dropCap);
  const dropCapXml = packageXml(dropCapDocx, "word/document.xml");
  assert.match(xmlText(dropCapXml), /DROP_CAP_BODY/, "Drop Cap export must not lose its first letter");
  assert.match(dropCapXml, /<w:sz\b[^>]*w:val="(?:72|96)"[^>]*\/>[\s\S]{0,250}<w:t>D<\/w:t>/,
    "Drop Cap initial must become a visibly enlarged run in the real DOCX");

  // Gradient WordArt must never turn its text transparent when LO drops browser-only background clipping.
  const wordArt = createAdapter(`<p>${buildWriterWordArtHtml("WORDART_VISIBLE", { presetId: "ocean-gradient" })}</p>`);
  const wordArtDocx = convertAdapter(temp, "wordart", wordArt);
  const wordArtXml = packageXml(wordArtDocx, "word/document.xml");
  assert.match(xmlText(wordArtXml), /WORDART_VISIBLE/, "WordArt text must exist in the real DOCX");
  assert.doesNotMatch(wordArtXml, /<w:color\b[^>]*w:val="(?:FFFFFF|auto)"[^>]*\/>[\s\S]{0,300}<w:t>WORDART_VISIBLE<\/w:t>/i,
    "Gradient WordArt needs an opaque export fallback instead of browser-only transparent text");

  // Notes: visible reference and body are the minimum fidelity promise of the current HTML model.
  const notes = createAdapter('<p>NOI_DUNG<sup data-vno-footnote-ref="fn-1">1</sup><sup data-vno-endnote-ref="en-1">i</sup></p><div data-vno-footnotes="true"><div class="vno-footnote-item" data-vno-footnote-id="fn-1"><span class="vno-note-num">1</span><span class="vno-note-text">FOOTNOTE_BODY</span></div></div><div data-vno-endnotes="true"><div class="vno-endnote-item" data-vno-endnote-id="en-1"><span class="vno-note-num">i</span><span class="vno-note-text">ENDNOTE_BODY</span></div></div>');
  const notesDocx = convertAdapter(temp, "notes", notes);
  const notesText = xmlText(packageXml(notesDocx, "word/document.xml"));
  assert.match(notesText, /FOOTNOTE_BODY/, "Footnote body must remain visible in real DOCX export");
  assert.match(notesText, /ENDNOTE_BODY/, "Endnote body must remain visible in real DOCX export");

  // Citations and bibliography are static visible fields today; both must survive.
  const citations = createAdapter('<p>NGHIEN_CUU <span class="vno-citation-field" data-vno-citation-source-id="src-1">(Nguyen, 2026)</span></p><section data-vno-bibliography="true"><h2>TAI_LIEU_THAM_KHAO</h2><p>Nguyen. SACH_THU_NGHIEM. 2026.</p></section>');
  const citationsDocx = convertAdapter(temp, "citations", citations);
  const citationsText = xmlText(packageXml(citationsDocx, "word/document.xml"));
  assert.match(citationsText, /\(Nguyen, 2026\)/, "In-text citation must remain visible in real DOCX export");
  assert.match(citationsText, /TAI_LIEU_THAM_KHAO[\s\S]*SACH_THU_NGHIEM/, "Bibliography must remain visible in real DOCX export");

  console.log("PASS: Writer real-export fidelity assertions passed for header/footer section references, native revisions/comments, TOC, columns, Drop Cap, WordArt, notes, and citations.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
