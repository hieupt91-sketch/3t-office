import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterReviewExportTests() {
  const adapter = new WriterAdapter(null);
  const imported = adapter._normalizeImportedHtml(
    "<p>Existing Word text</p>", "", "", "", "", "", "", {}, {}, {},
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:trackRevisions/></w:settings>'
  );
  assert.equal(imported.trackingEnabled, true, "Word's trackRevisions setting must initialize the session state");
  const sectionXml = '<w:document><w:body><w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:pPr><w:r><w:t>Base</w:t></w:r></w:p><w:p><w:ins w:author="Test" w:date="2026-10-01T10:00:00Z"><w:r><w:t>REOPEN_INSERT</w:t></w:r></w:ins></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>';
  const withSection = adapter._normalizeImportedHtml(
    '<p>Base</p><p style="page-break-before: always">REOPEN_INSERT</p>', sectionXml, ""
  );
  assert.match(withSection.body, /REOPEN_INSERT/, "Section import must retain the text in the paragraph carrying break-before");
  assert.match(withSection.body, /<ins\b[^>]*data-vno-change="insert"[^>]*>REOPEN_INSERT<\/ins>/);
  assert.match(withSection.body, /data-vno-section-break=/);
  assert.doesNotMatch(withSection.body, /<p[^>]*page-break-before:\s*always/);
  const footerFields = adapter._htmlFromHeaderFooterXml('<w:ftr><w:p><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>2</w:t></w:r></w:fldSimple></w:p></w:ftr>');
  assert.equal((footerFields.match(/data-vno-field="PAGE"/g) || []).length, 1);
  assert.equal((footerFields.match(/data-vno-field="NUMPAGES"/g) || []).length, 1);
  adapter.trackChangesEnabled = true;
  adapter.comments = [{
    id: "comment-1",
    content: "Kiểm tra số liệu quý II.",
    author: "Trần Thị Hoa",
    createdAt: "2026-10-01T10:30:00.000Z"
  }];
  const input = '<p>Giữ <ins data-vno-change="insert" data-vno-author="Nguyễn Văn An" data-vno-date="2026-10-01T10:00:00Z">nội dung mới</ins>; bỏ <del data-vno-change="delete" data-vno-author="Nguyễn Văn An" data-vno-date="2026-10-01T10:01:00Z">nội dung cũ</del>; <mark data-comment-id="comment-1">cụm được ghi chú</mark>.</p>';
  const serialized = adapter._serializeReviewRangesForExport(input);

  assert.match(serialized.html, /vno-review-start-00001/);
  assert.match(serialized.html, /vno-review-end-00003/);
  assert.doesNotMatch(serialized.html, /<ins\b|<del\b|<mark\b/i);
  assert.match(serialized.html, /nội dung cũ/, "Nội dung bị xóa vẫn phải tới bộ xuất OOXML để tạo w:del.");

  const match = serialized.metadataComment.match(/vno-review-meta-hex:([0-9a-f]+)/i);
  assert.ok(match, "Thiếu metadata local cho vùng sửa và comment.");
  const metadata = JSON.parse(Buffer.from(match[1], "hex").toString("utf8"));
  assert.equal(metadata.trackingEnabled, true);
  assert.deepEqual(metadata.records.map(item => item.kind || item.type), ["insert", "delete", "comment"]);
  assert.equal(metadata.records[0].author, "Nguyễn Văn An");
  assert.equal(metadata.records[0].date, "2026-10-01T10:00:00Z");
  assert.equal(metadata.records[2].content, "Kiểm tra số liệu quý II.");
  assert.equal(metadata.records[2].author, "Trần Thị Hoa");

  const cleanForOffice = adapter._stripSessionMarkup(serialized.html);
  assert.match(cleanForOffice, /nội dung mới/);
  assert.match(cleanForOffice, /nội dung cũ/);
  assert.match(cleanForOffice, /vno-review-start-00003/);

  const overlapping = adapter._serializeReviewRangesForExport(
    '<p><ins data-vno-change="insert">new <mark data-comment-id="comment-1">commented text</mark></ins></p>'
  );
  assert.match(overlapping.html, /<a name="vno-review-start-00001"><\/a>[\s\S]*<a name="vno-review-start-00002"><\/a>/,
    "Overlapping comment/revision ranges must use sibling bookmark points, not illegal nested anchors.");
  assert.doesNotMatch(overlapping.html, /<span id="vno-review-/i);
  assert.equal(JSON.parse(Buffer.from(overlapping.metadataComment.match(/vno-review-meta-hex:([0-9a-f]+)/i)[1], "hex").toString("utf8")).records.length, 2);
  return [{ name: "Writer export sends anchored review ranges and metadata to DOCX pipeline", pass: true }];
}
