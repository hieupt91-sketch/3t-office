/**
 * One-shot Word visual check. Writes FODT -> soffice DOCX into a temp dir,
 * then prints the DOCX path for Start-Process. Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

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

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-d-word-"));
fs.mkdirSync(outDir, { recursive: true });

const notesBody = `<p>Căn cứ Nghị định 15/2021/NĐ-CP<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup> về quản lý đầu tư xây dựng, đơn vị đề xuất phương án kênh chính.</p><p>Kết luận kèm phụ lục kỹ thuật<sup data-vno-endnote-ref="edn1" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">i</sup> được lưu tại hồ sơ gốc phòng Kế hoạch.</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-num">1</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_ONE Nghị định 15/2021 có hiệu lực từ 03/3/2021.</span><button type="button" class="vno-note-delete-btn">&times;</button></div></div><div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div><div class="vno-endnote-item" data-vno-endnote-id="edn1"><span class="vno-note-num">i</span><span class="vno-note-text" contenteditable="true">ENDNOTE_ONE Phụ lục kỹ thuật gồm bản vẽ mặt cắt Đăk Bla.</span><button type="button" class="vno-note-delete-btn">&times;</button></div></div>`;

const notesFodt = path.join(outDir, "phase-d-notes.fodt");
fs.writeFileSync(notesFodt, adapterWithZones({ body: notesBody }).serializeToFodt(), "utf8");
const notesDocx = convertWithSoffice(notesFodt, "docx", path.join(outDir, "notes-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-notes")
});
const notesOut = path.join(outDir, "phase-d-notes.docx");
fs.copyFileSync(notesDocx, notesOut);

const commentFodt = path.join(outDir, "phase-d-comments.fodt");
fs.writeFileSync(commentFodt, adapterWithZones({
  body: '<p>Đề nghị phê duyệt <mark class="vno-comment-anchor" data-comment-id="writer-comment-1" tabindex="0" role="button" data-vno-comment-author="Tran Thi Hoa" title="Tran Thi Hoa" aria-label="Mở ghi chú cho: dự toán năm 2026">dự toán năm 2026</mark> theo phương án đã thống nhất.</p>',
  comments: [{
    id: "writer-comment-1",
    anchorText: "dự toán năm 2026",
    content: "Cần đối chiếu số liệu quý II trước khi trình.",
    createdAt: "2026-09-05T09:10:00",
    author: "Tran Thi Hoa"
  }]
}).serializeToFodt(), "utf8");
const commentDocx = convertWithSoffice(commentFodt, "docx", path.join(outDir, "comments-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-comments")
});
const commentOut = path.join(outDir, "phase-d-comments.docx");
fs.copyFileSync(commentDocx, commentOut);

console.log(`WORD_DIR=${outDir}`);
console.log(`NOTES_DOCX=${notesOut}`);
console.log(`COMMENTS_DOCX=${commentOut}`);
