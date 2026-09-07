/**
 * Live soffice: Lỗi thật đã xác nhận — file DOCX thật (Word thật) có ảnh
 * NEO NỔI (floating, wp:anchor + wrapSquare — cách Word thường dùng cho
 * logo/letterhead có chữ chạy quanh, KHÁC với ảnh inline thường wp:inline)
 * khi convert qua soffice thật sang FODT có text:anchor-type="char" (không
 * phải "as-char" mà VN Office tự ghi khi chèn ảnh qua UI của chính mình).
 * Trước đây WriterAdapter.parseFodt() ném lỗi ngay khi gặp anchor-type
 * khác "as-char" — khiến TOÀN BỘ file DOCX không mở được, không chỉ mất 1
 * ảnh. Test này đi hết vòng thật: tạo DOCX chuẩn OOXML có ảnh neo nổi →
 * convert qua soffice thật sang FODT → gọi parseFodt() trực tiếp trên FODT
 * đó (KHÔNG qua VN Office serialize trước) → xác nhận file mở được, ảnh
 * hiển thị, văn bản trước/sau ảnh không mất.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live test");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
void rootDir;

const PNG_1X1_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_1X1_BASE64, "base64");

/**
 * DOCX tối thiểu, thật, có 1 đoạn văn với ảnh neo nổi (wp:anchor,
 * wrapSquare) — cấu trúc OOXML chuẩn mà Word thật ghi ra cho logo/hình
 * minh họa có chữ chạy quanh (khác wp:inline của ảnh chèn thẳng vào dòng).
 */
function createDocxWithFloatingImage() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:drawing>
      <wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="1" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
        <wp:simplePos x="0" y="0"/>
        <wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH>
        <wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>
        <wp:extent cx="914400" cy="914400"/>
        <wp:wrapSquare wrapText="bothSides"/>
        <wp:docPr id="1" name="Picture 1"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr><pic:cNvPr id="1" name="Picture 1"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData></a:graphic>
      </wp:anchor>
    </w:drawing></w:r>
    <w:r><w:t>Cong ty TNHH ABC - dia chi mau, chu chay quanh logo neo noi.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Doan van ban tiep theo, khong duoc mat.</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: documentRels },
    { name: "word/media/image1.png", data: PNG_BYTES }
  ]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-float-image-"));

try {
  console.log("Step 1: Tạo DOCX thật có ảnh neo nổi (wp:anchor + wrapSquare)...");
  const docxPath = path.join(tempRoot, "writer-float-image.docx");
  fs.writeFileSync(docxPath, createDocxWithFloatingImage());
  assert.ok(fs.existsSync(docxPath), "DOCX phải được tạo thành công");

  console.log("Step 2: Convert DOCX → FODT qua soffice thật...");
  const profileDir = path.join(tempRoot, "profile");
  const fodtPath = convertWithSoffice(docxPath, "fodt", path.join(tempRoot, "fodt"), { profileDir, appKind: "writer" });
  assert.ok(fs.existsSync(fodtPath), "FODT phải được tạo thành công");

  console.log("Step 3: Đọc FODT output và kiểm tra anchor-type ODF...");
  const fodtXml = fs.readFileSync(fodtPath, "utf8");
  const anchorMatch = fodtXml.match(/<draw:frame\b[^>]*text:anchor-type=["']([^"']+)["']/i);
  console.log(`  soffice ghi text:anchor-type="${anchorMatch?.[1]}" cho ảnh neo nổi (khác "as-char")`);
  assert.ok(anchorMatch && anchorMatch[1] !== "as-char", "Probe phải xác nhận anchor-type KHÁC as-char — nếu không, soffice đã đổi hành vi so với lần xác nhận trước");

  console.log("Step 4: Gọi WriterAdapter.parseFodt() trên FODT thật (KHÔNG qua VN Office serialize)...");
  const body = { innerHTML: "" };
  const adapter = new WriterAdapter({
    innerHTML: "",
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });

  const html = adapter.parseFodt(fodtXml);
  assert.match(html, /<img\b[^>]*src="data:image\/png;base64,/, "Ảnh phải hiển thị (không bị bỏ qua âm thầm)");
  assert.ok(html.includes("Cong ty TNHH ABC"), "Văn bản trước ảnh không được mất");
  assert.ok(html.includes("Doan van ban tiep theo"), "Đoạn văn bản sau không được mất");

  console.log("\nPASS: WriterAdapter.parseFodt() mở đúng file DOCX thật có ảnh neo nổi, không ném lỗi làm hỏng cả file.");
  console.log(JSON.stringify({ anchorType: anchorMatch[1], hasImg: /<img\b/i.test(html) }));
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
