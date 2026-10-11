/**
 * Probe: tạo DOCX có hình chữ nhật xoay 30° rồi convert qua soffice thật
 * sang FODT để xác nhận draw:transform xuất hiện đúng.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

if (!findSoffice()) { console.log("SKIP: soffice not found"); process.exit(0); }

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

const docx = createZip([
  { name: "[Content_Types].xml", data: contentTypes },
  { name: "_rels/.rels", data: rels },
  { name: "word/document.xml", data: documentXml },
  { name: "word/_rels/document.xml.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>" }
]);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-rotate-probe-"));
const docxPath = path.join(tempRoot, "rotated.docx");
fs.writeFileSync(docxPath, docx);
const fodtPath = convertWithSoffice(docxPath, "fodt", path.join(tempRoot, "fodt"), { profileDir: path.join(tempRoot, "profile"), appKind: "writer" });
const fodtXml = fs.readFileSync(fodtPath, "utf8");

const lines = fodtXml.split("\n");
for (const line of lines) {
  if (line.includes("draw:custom-shape") || line.includes("draw:transform") || line.includes("svg:x=") || line.includes("svg:y=")) {
    console.log(line.trim());
  }
}
console.log("---PROBE DONE---");
console.log("FODT size:", fodtXml.length);

fs.rmSync(tempRoot, { recursive: true, force: true });
