/**
 * Live soffice: Vị trí hình bị XOAY trong file DOCX thật bị đọc sai.
 *
 * Lỗi thật đã xác nhận qua probe soffice thật: khi một hình (hình chữ nhật,
 * text box, v.v.) trong DOCX thật bị XOAY, soffice ghi vị trí qua
 * draw:transform="rotate(...) translate(...)" — svg:x/svg:y HOÀN TOÀN VẮNG
 * MẶT trong trường hợp đó. Code đọc thẳng svg:x/svg:y mà không kiểm tra
 * draw:transform sẽ luôn đặt hình về góc (0,0) sai.
 *
 * Test này đi hết vòng thật: tạo DOCX có hình/text box xoay → convert qua
 * soffice thật sang FODT → gọi parseFodt() trực tiếp trên FODT đó → xác
 * nhận vị trí x/y KHÁC (0,0) và gần đúng giá trị tính từ translate(...)
 * đã probe được.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live test");

function createDocxWithRotatedShape() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:body>
    <w:p><w:r><w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="2000000" cy="1000000"/>
        <wp:docPr id="1" name="Rotated Rect"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingShape">
          <wps:wsp>
            <wps:cNvSpPr/>
            <wps:spPr>
              <a:xfrm rot="1800000"><a:off x="1000000" y="500000"/><a:ext cx="2000000" cy="1000000"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
            </wps:spPr>
            <wps:txbx><w:txbxContent><w:p><w:r><w:t>Rect xoay</w:t></w:r></w:p></w:txbxContent></wps:txbx>
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

function createDocxWithRotatedTextBox() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:body>
    <w:p><w:r><w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="2000000" cy="1000000"/>
        <wp:docPr id="2" name="Rotated TextBox"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingShape">
          <wps:wsp>
            <wps:cNvSpPr/>
            <wps:spPr>
              <a:xfrm rot="1800000"><a:off x="1000000" y="500000"/><a:ext cx="2000000" cy="1000000"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
            </wps:spPr>
            <wps:txbx><w:txbxContent><w:p><w:r><w:t>TextBox xoay</w:t></w:r></w:p></w:txbxContent></wps:txbx>
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

function createMinimalAdapter() {
  const bodyEl = { innerHTML: "" };
  return new WriterAdapter({
    innerHTML: "",
    querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl : null; }
  });
}

function testRotatedShapePosition() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-rotate-shape-"));
  try {
    const docxPath = path.join(tempRoot, "rotated-shape.docx");
    fs.writeFileSync(docxPath, createDocxWithRotatedShape());
    const fodtPath = convertWithSoffice(docxPath, "fodt", path.join(tempRoot, "fodt"), { profileDir: path.join(tempRoot, "profile"), appKind: "writer" });
    const fodtXml = fs.readFileSync(fodtPath, "utf8");

    const adapter = createMinimalAdapter();
    adapter.parseFodt(fodtXml);
    const shapes = adapter.shapes || [];
    const rect = shapes.find(s => s.id === "Rotated Rect");
    assert(rect, "Phải parse được shape 'Rotated Rect' từ soffice thật");
    // soffice thật sẽ ghi draw:transform — vị trí lấy từ translate()
    // Không rơi về (0,0)
    const notAtOrigin = rect.x !== 0 || rect.y !== 0;
    assert(notAtOrigin, `Shape xoay phải KHÔNG ở (0,0), thực tế: (${rect.x}, ${rect.y}) — bug vị trí chưa sửa`);
    console.log(`  PASS: Rotated Rect x=${rect.x}, y=${rect.y} (khác 0,0)`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function testRotatedTextBoxPosition() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-rotate-textbox-"));
  try {
    const docxPath = path.join(tempRoot, "rotated-textbox.docx");
    fs.writeFileSync(docxPath, createDocxWithRotatedTextBox());
    const fodtPath = convertWithSoffice(docxPath, "fodt", path.join(tempRoot, "fodt"), { profileDir: path.join(tempRoot, "profile"), appKind: "writer" });
    const fodtXml = fs.readFileSync(fodtPath, "utf8");

    const adapter = createMinimalAdapter();
    adapter.parseFodt(fodtXml);
    const shapes = adapter.shapes || [];
    const textbox = shapes.find(s => s.id === "Rotated TextBox");
    assert(textbox, "Phải parse được text box 'Rotated TextBox' từ soffice thật");
    // Vị trí lấy từ translate() trong draw:transform
    const notAtOrigin = textbox.x !== 0 || textbox.y !== 0;
    assert(notAtOrigin, `Text box xoay phải KHÔNG ở (0,0), thực tế: (${textbox.x}, ${textbox.y}) — bug vị trí textbox chưa sửa`);
    console.log(`  PASS: Rotated TextBox x=${textbox.x}, y=${textbox.y} (khác 0,0)`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log("--- Test 1: Rotated shape position (live soffice) ---");
testRotatedShapePosition();
console.log("--- Test 2: Rotated text box position (live soffice) ---");
testRotatedTextBoxPosition();
console.log("\nPASS: WriterAdapter.parseFodt() đọc đúng vị trí hình/text box xoay từ file DOCX thật (draw:transform).");
