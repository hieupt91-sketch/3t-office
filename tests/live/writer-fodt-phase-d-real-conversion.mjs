/**
 * Phase D acceptance: footnote/endnote/comment/TOC FODT -> real soffice
 * DOCX/PDF. Assertions follow measured engine behavior in
 * docs/HANDOFF-WRITER-FODT-PHASE-D-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase D live test");

function adapterWithZones({ body = "", comments = [] } = {}) {
  const bodyEl = { innerHTML: body };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      return null;
    }
  });
  adapter.comments = comments.map(item => ({ ...item }));
  return adapter;
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

const mixedBody = `<p>Căn cứ Nghị định 15/2021/NĐ-CP<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup> và Thông tư 10/2021/TT-BXD<sup data-vno-footnote-ref="ftn2" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">2</sup>.</p><p>Kết luận kèm phụ lục kỹ thuật<sup data-vno-endnote-ref="edn1" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">i</sup>.</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">1</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_ONE Nghị định 15/2021.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div><div class="vno-footnote-item" data-vno-footnote-id="ftn2"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">2</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_TWO Thông tư 10/2021.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div><div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div><div class="vno-endnote-item" data-vno-endnote-id="edn1"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">i</span><span class="vno-note-text" contenteditable="true">ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div>`;

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-d-"));
try {
  const notesAdapter = adapterWithZones({ body: mixedBody });
  const notesFodt = notesAdapter.serializeToFodt();
  const notesPath = path.join(tempRoot, "notes.fodt");
  fs.writeFileSync(notesPath, notesFodt, "utf8");
  const notesDocx = convertWithSoffice(notesPath, "docx", path.join(tempRoot, "notes-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-notes-docx")
  });
  const notesPdf = convertWithSoffice(notesPath, "pdf", path.join(tempRoot, "notes-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-notes-pdf")
  });
  const zipNames = listZipEntries(notesDocx).map(entry => entry.name);
  assert.ok(zipNames.includes("word/footnotes.xml"), "DOCX must contain word/footnotes.xml");
  assert.ok(zipNames.includes("word/endnotes.xml"), "DOCX must contain word/endnotes.xml");
  const documentXml = readZipEntry(notesDocx, "word/document.xml")?.toString("utf8") || "";
  const footnotesXml = readZipEntry(notesDocx, "word/footnotes.xml")?.toString("utf8") || "";
  const endnotesXml = readZipEntry(notesDocx, "word/endnotes.xml")?.toString("utf8") || "";
  assert.equal((documentXml.match(/<w:footnoteReference\b/g) || []).length, 2, "two footnoteReference");
  assert.equal((documentXml.match(/<w:endnoteReference\b/g) || []).length, 1, "one endnoteReference");
  assert.match(documentXml, /<w:footnoteReference w:id="2"\/>/);
  assert.match(documentXml, /<w:footnoteReference w:id="3"\/>/);
  assert.match(documentXml, /<w:endnoteReference w:id="2"\/>/);
  assert.match(documentXml, /<w:endnotePr>[\s\S]*<w:numFmt w:val="lowerRoman"\/>/);
  assert.match(xmlText(footnotesXml), /FOOTNOTE_ONE Nghị định 15\/2021/);
  assert.match(xmlText(footnotesXml), /FOOTNOTE_TWO Thông tư 10\/2021/);
  assert.match(xmlText(endnotesXml), /ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla/);
  const pdfBytes = fs.readFileSync(notesPdf);
  assert.equal(pdfBytes.subarray(0, 5).toString("latin1"), "%PDF-");

  const parsed = adapterWithZones({ body: "<p>x</p>" });
  parsed.parseFodt(notesFodt);
  assert.equal(parsed.serializeToFodt(), notesFodt);

  console.log("PASS writer-fodt-phase-d-real-conversion notes");
  console.log(`NOTES_DOCX=${notesDocx}`);
  console.log(`NOTES_PDF=${notesPdf}`);

  const commentAdapter = adapterWithZones({
    body: '<p>Đề nghị phê duyệt <mark class="vno-comment-anchor" data-comment-id="writer-comment-1" tabindex="0" role="button" data-vno-comment-author="Tran Thi Hoa" title="Tran Thi Hoa" aria-label="Mở ghi chú cho: dự toán năm 2026">dự toán năm 2026</mark> theo phương án đã thống nhất.</p>',
    comments: [{
      id: "writer-comment-1",
      anchorText: "dự toán năm 2026",
      content: "COMMENT_BODY đối chiếu số liệu quý II.",
      createdAt: "2026-09-05T09:10:00",
      author: "Tran Thi Hoa"
    }]
  });
  const commentFodt = commentAdapter.serializeToFodt();
  const commentPath = path.join(tempRoot, "comments.fodt");
  fs.writeFileSync(commentPath, commentFodt, "utf8");
  const commentDocx = convertWithSoffice(commentPath, "docx", path.join(tempRoot, "comments-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-comments-docx")
  });
  const commentZip = listZipEntries(commentDocx).map(entry => entry.name);
  assert.ok(commentZip.includes("word/comments.xml"), "DOCX must contain word/comments.xml");
  const commentDocumentXml = readZipEntry(commentDocx, "word/document.xml")?.toString("utf8") || "";
  const commentsXml = readZipEntry(commentDocx, "word/comments.xml")?.toString("utf8") || "";
  assert.match(commentDocumentXml, /<w:commentRangeStart w:id="0"\/>/);
  assert.match(commentDocumentXml, /<w:commentRangeEnd w:id="0"\/>/);
  assert.match(commentDocumentXml, /<w:commentReference w:id="0"\/>/);
  assert.match(commentsXml, /w:author="Tran Thi Hoa"/);
  assert.match(xmlText(commentsXml), /COMMENT_BODY đối chiếu số liệu quý II/);
  const commentParsed = adapterWithZones({ body: "<p>x</p>" });
  commentParsed.parseFodt(commentFodt);
  assert.equal(commentParsed.serializeToFodt(), commentFodt);
  console.log("PASS writer-fodt-phase-d-real-conversion comments");
  console.log(`COMMENTS_DOCX=${commentDocx}`);
} finally {
  // Keep temp dir for Word visual check scripts; tests/scripts copies out.
}
