/**
 * Live soffice probe: Xác minh connector (đường nối) và draw:line (đường thẳng)
 * trong file thật khi bị XOAY có bị soffice ghi draw:transform hay không.
 *
 * Câu hỏi:
 * - Connector trong PPTX thật có BAO GIỜ bị draw:transform bọc quanh không?
 * - draw:line trong DOCX/XLSX thật có BAO GIỜ bị draw:transform bọc quanh không?
 * - Nếu KHÔNG, thì đọc svg:x1/y1/x2/y2 thẳng là AN TOÀN (không phải bug).
 * - Nếu CÓ, thì cần fix thêm.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live probe");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-rotation-probe-"));

try {
  // ================================================================
  // PROBE 1: Writer — draw:line bị xoay có draw:transform không?
  // ================================================================
  console.log("=== PROBE 1: draw:line trong DOCX xoay → soffice ghi draw:transform? ===");

  const lineDocxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="3000000" cy="1000000"/>
        <wp:docPr id="1" name="Rotated Line"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wsp:wsp xmlns:wsp="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
            <wsp:cNvCnPr/>
            <wsp:spPr>
              <a:xfrm rot="1800000">
                <a:off x="1000000" y="500000"/>
                <a:ext cx="3000000" cy="1000000"/>
              </a:xfrm>
              <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
              <a:ln w="36000"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln>
            </wsp:spPr>
            <wsp:bodyPr/>
          </wsp:wsp>
        </a:graphicData></a:graphic>
      </wp:inline>
    </w:drawing></w:r></w:p>
  </w:body>
</w:document>`;

  const lineContentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const lineRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const lineDocx = createZip([
    { name: "[Content_Types].xml", data: lineContentTypes },
    { name: "_rels/.rels", data: lineRels },
    { name: "word/document.xml", data: lineDocxXml },
    { name: "word/_rels/document.xml.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>" }
  ]);

  const lineDocxPath = path.join(tempRoot, "rotated-line.docx");
  fs.writeFileSync(lineDocxPath, lineDocx);
  const lineFodtPath = convertWithSoffice(lineDocxPath, "fodt", path.join(tempRoot, "line-fodt"), { profileDir: path.join(tempRoot, "profile1"), appKind: "writer" });
  const lineFodtXml = fs.readFileSync(lineFodtPath, "utf8");

  // Tìm draw:line trong FODP
  const lineMatch = lineFodtXml.match(/<draw:line\b[^>]*>/gi);
  console.log(`  Số draw:line tìm thấy trong FODT: ${lineMatch?.length || 0}`);
  if (lineMatch) {
    for (const m of lineMatch) {
      console.log(`  draw:line: ${m.substring(0, 300)}`);
      const hasTransform = /draw:transform/i.test(m);
      const hasSvgX = /svg:x1=/i.test(m);
      console.log(`    draw:transform present: ${hasTransform}`);
      console.log(`    svg:x1 present: ${hasSvgX}`);
    }
  }

  // Cũng kiểm tra tất cả draw:frame chứa đường thẳng
  const allDrawLines = lineFodtXml.match(/<draw:(line|connector)\b[^>]*>/gi);
  console.log(`  Tất cả draw:line/draw:connector: ${JSON.stringify(allDrawLines)}`);

  // ================================================================
  // PROBE 2: Slides — connector trong PPTX xoay có draw:transform không?
  // ================================================================
  console.log("\n=== PROBE 2: draw:connector trong PPTX xoay → soffice ghi draw:transform? ===");

  const connectorPptxPres = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;

  // Connector xoay 30° (rot = 30*60000 = 1800000)
  const connectorSlideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:cxnSp>
        <p:nvCxnSpPr><p:cNvPr id="2" name="Connector 1"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm rot="1800000">
            <a:off x="1000000" y="1000000"/>
            <a:ext cx="3000000" cy="2000000"/>
          </a:xfrm>
          <a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="0000FF"/></a:solidFill></a:ln>
        </p:spPr>
      </p:cxnSp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const connectorSlideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  const connectorContentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

  const connectorPresRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;

  const connectorPptx = createZip([
    { name: "[Content_Types].xml", data: connectorContentTypes },
    { name: "_rels/.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"ppt/presentation.xml\"/></Relationships>" },
    { name: "ppt/presentation.xml", data: connectorPptxPres },
    { name: "ppt/_rels/presentation.xml.rels", data: connectorPresRels },
    { name: "ppt/slides/slide1.xml", data: connectorSlideXml },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: connectorSlideRels }
  ]);

  const connectorPptxPath = path.join(tempRoot, "rotated-connector.pptx");
  fs.writeFileSync(connectorPptxPath, connectorPptx);
  const connectorFodpPath = convertWithSoffice(connectorPptxPath, "fodp", path.join(tempRoot, "connector-fodp"), { profileDir: path.join(tempRoot, "profile2") });
  const connectorFodpXml = fs.readFileSync(connectorFodpPath, "utf8");

  // Tìm draw:connector trong FODP
  const connectorMatch = connectorFodpXml.match(/<draw:connector\b[^>]*>/gi);
  console.log(`  Số draw:connector tìm thấy trong FODP: ${connectorMatch?.length || 0}`);
  if (connectorMatch) {
    for (const m of connectorMatch) {
      console.log(`  draw:connector: ${m.substring(0, 500)}`);
      const hasTransform = /draw:transform/i.test(m);
      const hasSvgX = /svg:x=/i.test(m);
      const hasSvgX1 = /svg:x1=/i.test(m);
      console.log(`    draw:transform present: ${hasTransform}`);
      console.log(`    svg:x present: ${hasSvgX}`);
      console.log(`    svg:x1 present: ${hasSvgX1}`);
    }
  }

  // ================================================================
  // PROBE 3: Connector không xoay (baseline) — soffice ghi gì?
  // ================================================================
  console.log("\n=== PROBE 3: Connector KHÔNG xoay (baseline) ===");

  const baseConnectorSlide = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:cxnSp>
        <p:nvCxnSpPr><p:cNvPr id="3" name="Connector 2"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1000000" y="3000000"/>
            <a:ext cx="4000000" cy="1000000"/>
          </a:xfrm>
          <a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></a:ln>
        </p:spPr>
      </p:cxnSp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const basePptx = createZip([
    { name: "[Content_Types].xml", data: connectorContentTypes },
    { name: "_rels/.rels", data: "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"ppt/presentation.xml\"/></Relationships>" },
    { name: "ppt/presentation.xml", data: connectorPptxPres },
    { name: "ppt/_rels/presentation.xml.rels", data: connectorPresRels },
    { name: "ppt/slides/slide1.xml", data: baseConnectorSlide },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: connectorSlideRels }
  ]);

  const basePptxPath = path.join(tempRoot, "base-connector.pptx");
  fs.writeFileSync(basePptxPath, basePptx);
  const baseFodpPath = convertWithSoffice(basePptxPath, "fodp", path.join(tempRoot, "base-fodp"), { profileDir: path.join(tempRoot, "profile3") });
  const baseFodpXml = fs.readFileSync(baseFodpPath, "utf8");

  const baseConnectorMatch = baseFodpXml.match(/<draw:connector\b[^>]*>/gi);
  console.log(`  Số draw:connector (baseline, không xoay): ${baseConnectorMatch?.length || 0}`);
  if (baseConnectorMatch) {
    for (const m of baseConnectorMatch) {
      console.log(`  draw:connector: ${m.substring(0, 500)}`);
    }
  }

  // ================================================================
  // TÓM TẮT KẾT QUẢ
  // ================================================================
  console.log("\n=== TÓM TẮT ===");
  const lineHasTransform = /draw:transform/i.test(lineMatch?.[0] || "");
  const connectorHasTransform = /draw:transform/i.test(connectorMatch?.[0] || "");
  console.log(`draw:line (writer) + rotation: draw:transform = ${lineHasTransform}`);
  console.log(`draw:connector (slides) + rotation: draw:transform = ${connectorHasTransform}`);
  console.log(`Kết luận:`);
  if (lineHasTransform) {
    console.log(`  ⚠ draw:line CÓ draw:transform khi xoay → CẦN FIX writer-adapter.js`);
  } else {
    console.log(`  ✓ draw:line KHÔNG có draw:transform khi xoay → AN TOÀN (x1/y1/x2/y2 luôn tuyệt đối)`);
  }
  if (connectorHasTransform) {
    console.log(`  ⚠ draw:connector CÓ draw:transform khi xoay → CẦN FIX slides-adapter.js _parseConnectorShape`);
  } else {
    console.log(`  ✓ draw:connector KHÔNG có draw:transform khi xoay → AN TOÀN (x1/y1/x2/y2 luôn tuyệt đối)`);
  }

  console.log("\nPASS: Probe hoàn thành.");

} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
