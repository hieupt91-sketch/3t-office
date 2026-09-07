/**
 * Live soffice: Lỗi thật đã xác nhận — file DOCX thật (Word thật) có hình
 * cơ bản (hình chữ nhật, elip, bo góc — chèn qua "Insert Shapes" của Word,
 * RẤT PHỔ BIẾN) khi soffice convert sang FODT KHÔNG dùng
 * <draw:rect>/<draw:ellipse> chuẩn ODF như VN Writer tự ghi khi người dùng
 * chèn hình qua UI của chính mình, mà LUÔN dùng <draw:custom-shape> với
 * draw:enhanced-geometry draw:type="ooxml-<prstGeom>" — trước đây
 * parseFodt() ném lỗi với bất kỳ type nào khác "right-arrow", khiến TOÀN
 * BỘ file DOCX không mở được dù chỉ có 1 hình chữ nhật bình thường, không
 * cần xoay, không gì đặc biệt.
 *
 * Test này đi hết vòng thật cho cả 2 kiểu hình phổ biến nhất (rect, ellipse):
 * tạo DOCX chuẩn OOXML có 1 hình → convert qua soffice thật sang FODT →
 * gọi parseFodt() trực tiếp trên FODT đó → xác nhận file mở được, hình
 * được ánh xạ đúng sang type mà VN Writer render được.
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

function createDocxWithShape(prst, label) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="2000000" cy="1000000"/>
        <wp:docPr id="1" name="Shape 1"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingShape">
          <wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
            <wps:cNvSpPr/>
            <wps:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="2000000" cy="1000000"/></a:xfrm>
              <a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>
              <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
            </wps:spPr>
            <wps:txbx><w:txbxContent><w:p><w:r><w:t>${label}</w:t></w:r></w:p></w:txbxContent></wps:txbx>
            <wps:bodyPr/>
          </wps:wsp>
        </a:graphicData></a:graphic>
      </wp:inline>
    </w:drawing></w:r></w:p>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
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
    { name: "word/_rels/document.xml.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>" }
  ]);
}

async function checkShape(prst, label, expectedType) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `vno-writer-shape-${prst}-`));
  try {
    console.log(`\n--- prst="${prst}" (kỳ vọng ánh xạ sang type="${expectedType}") ---`);
    const docxPath = path.join(tempRoot, "writer-shape.docx");
    fs.writeFileSync(docxPath, createDocxWithShape(prst, label));
    const profileDir = path.join(tempRoot, "profile");
    const fodtPath = convertWithSoffice(docxPath, "fodt", path.join(tempRoot, "fodt"), { profileDir, appKind: "writer" });
    const fodtXml = fs.readFileSync(fodtPath, "utf8");
    const typeMatch = fodtXml.match(/draw:type=["']([^"']+)["']/i);
    console.log(`soffice ghi draw:enhanced-geometry draw:type="${typeMatch?.[1]}"`);
    assert.ok(typeMatch, `Phải tìm thấy draw:type trong FODT cho prst=${prst}`);

    const bodyEl = { innerHTML: "" };
    const adapter = new WriterAdapter({
      innerHTML: "",
      querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl : null; }
    });
    adapter.parseFodt(fodtXml);
    assert.equal(adapter.shapes.length, 1, `Phải parse được đúng 1 shape cho prst=${prst}`);
    assert.equal(adapter.shapes[0].type, expectedType, `type phải là "${expectedType}", thực tế: ${adapter.shapes[0].type}`);
    console.log(`PASS: adapter.shapes[0].type = "${adapter.shapes[0].type}"`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

await checkShape("rect", "Hinh chu nhat", "rectangle");
await checkShape("ellipse", "Hinh elip", "circle");
await checkShape("roundRect", "Bo goc", "round-rect");

console.log("\nPASS: WriterAdapter.parseFodt() mở đúng file DOCX thật có hình cơ bản (rect/ellipse/roundRect), ánh xạ đúng sang type VN Writer render được.");
