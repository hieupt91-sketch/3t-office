import assert from "node:assert/strict";
import {
  documentPropertiesMarker,
  normalizeDocumentProperties,
  parseCorePropertiesXml
} from "../../apps/writer/document-properties.js";

export async function runWriterDocumentPropertiesTests() {
  const xml = `<?xml version="1.0"?><cp:coreProperties xmlns:cp="urn:core" xmlns:dc="urn:dc">
    <dc:title>Kế hoạch &amp; dự toán</dc:title><dc:creator>Nguyễn Văn An</dc:creator>
    <dc:subject>Quý IV</dc:subject><cp:keywords>ngân sách; nội bộ</cp:keywords>
    <dc:description>Dòng 1&#10;Dòng 2</dc:description></cp:coreProperties>`;
  assert.deepEqual(parseCorePropertiesXml(xml), {
    title: "Kế hoạch & dự toán",
    creator: "Nguyễn Văn An",
    subject: "Quý IV",
    keywords: "ngân sách; nội bộ",
    description: "Dòng 1\nDòng 2"
  });

  const normalized = normalizeDocumentProperties({ title: "A".repeat(300), creator: null });
  assert.equal(normalized.title.length, 255);
  assert.equal(normalized.creator, "");

  const marker = documentPropertiesMarker({ title: "Tài liệu tiếng Việt", creator: "Trần Thị Hoa" });
  const hex = marker.match(/vno-document-properties-hex:([0-9a-f]+)/i)?.[1];
  assert.ok(hex);
  assert.deepEqual(JSON.parse(Buffer.from(hex, "hex").toString("utf8")), {
    title: "Tài liệu tiếng Việt",
    creator: "Trần Thị Hoa",
    subject: "",
    keywords: "",
    description: ""
  });

  return [{ name: "Writer parses and exports UTF-8 DOCX core properties metadata", pass: true }];
}
