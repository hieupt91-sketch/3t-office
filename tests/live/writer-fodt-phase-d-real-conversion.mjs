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

  const tocBody = `<div data-vno-toc="true" class="vno-toc-block" contenteditable="false"><div class="vno-toc-header"><span class="vno-toc-title">MỤC LỤC</span><div class="vno-toc-actions"><button type="button" class="vno-toc-btn vno-toc-btn-update">🔄 Cập nhật</button><button type="button" class="vno-toc-btn vno-toc-btn-delete">&times;</button></div></div><div class="vno-toc-entries"><div class="vno-toc-item vno-toc-level-1"><a class="vno-toc-link"><span class="vno-toc-text">Báo cáo thẩm định</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div><div class="vno-toc-item vno-toc-level-2"><a class="vno-toc-link"><span class="vno-toc-text">Căn cứ pháp lý</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div><div class="vno-toc-item vno-toc-level-3"><a class="vno-toc-link"><span class="vno-toc-text">Nghị định 15/2021</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div></div></div><h1>Báo cáo thẩm định</h1><p>Đoạn mở đầu TOC_BODY_INTRO.</p><h2>Căn cứ pháp lý</h2><p>Đoạn căn cứ TOC_BODY_LEGAL.</p><h3>Nghị định 15/2021</h3><p>Đoạn nghị định TOC_BODY_DECREE.</p>`;
  const tocAdapter = adapterWithZones({ body: tocBody });
  const tocFodtXml = tocAdapter.serializeToFodt();
  const tocPath = path.join(tempRoot, "toc.fodt");
  fs.writeFileSync(tocPath, tocFodtXml, "utf8");
  const tocDocx = convertWithSoffice(tocPath, "docx", path.join(tempRoot, "toc-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-toc-docx")
  });
  const tocDocumentXml = readZipEntry(tocDocx, "word/document.xml")?.toString("utf8") || "";
  assert.match(tocDocumentXml, /<w:sdt>/);
  assert.match(tocDocumentXml, /<w:docPartGallery w:val="Table of Contents"\/>/);
  assert.match(tocDocumentXml, /<w:instrText[^>]*>\s*TOC\b/);
  assert.match(xmlText(tocDocumentXml), /MỤC LỤC/);
  assert.match(xmlText(tocDocumentXml), /Báo cáo thẩm định/);
  assert.match(xmlText(tocDocumentXml), /Căn cứ pháp lý/);
  assert.match(xmlText(tocDocumentXml), /Nghị định 15\/2021/);
  const tocParsed = adapterWithZones({ body: "<p>x</p>" });
  tocParsed.parseFodt(tocFodtXml);
  assert.equal(tocParsed.serializeToFodt(), tocFodtXml);
  console.log("PASS writer-fodt-phase-d-real-conversion toc");
  console.log(`TOC_DOCX=${tocDocx}`);
} finally {
  // Keep temp dir for Word visual check scripts; tests/scripts copies out.
}
