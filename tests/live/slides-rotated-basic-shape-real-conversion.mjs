/**
 * Live soffice: Lỗi thật đã xác nhận — CÙNG lỗi vị trí-bị-xoay đã sửa cho
 * ảnh (xem tests/live/slides-rotated-shape-position-real-conversion.mjs),
 * nhưng xảy ra ĐỘC LẬP trong hàm _parseDrawShape() (xử lý
 * <draw:rect>/<draw:ellipse>/<draw:custom-shape> — KHÔNG dùng chung base
 * object với _parseFrameShape() nên phải sửa riêng). Rất phổ biến trong
 * sơ đồ/biểu trình bày thật (hình chữ nhật/mũi tên xoay chéo).
 *
 * Test này đi hết vòng thật: tạo PPTX chuẩn OOXML có 1 hình chữ nhật xoay
 * 30° → convert qua soffice thật sang FODP → gọi parseFodp() trực tiếp
 * trên FODP đó → xác nhận vị trí khớp đúng offset thật (không phải 0,0).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live test");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
void rootDir;

function createPptxWithRotatedRect() {
  const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;

  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Rectangle 1"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm rot="1800000">
            <a:off x="1500000" y="800000"/>
            <a:ext cx="2000000" cy="1000000"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
        </p:spPr>
        <p:txBody><a:bodyPr/><a:p><a:r><a:t>Hop xoay</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;

  const emptySlideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/_rels/presentation.xml.rels", data: presRels },
    { name: "ppt/slides/slide1.xml", data: slideXml },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: emptySlideRels }
  ]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides-rotated-rect-"));

try {
  console.log("Step 1: Tạo PPTX thật có 1 hình chữ nhật xoay 30°...");
  const pptxPath = path.join(tempRoot, "slides-rect.pptx");
  fs.writeFileSync(pptxPath, createPptxWithRotatedRect());
  assert.ok(fs.existsSync(pptxPath), "PPTX phải được tạo thành công");

  console.log("Step 2: Convert PPTX → FODP qua soffice thật...");
  const profileDir = path.join(tempRoot, "profile");
  const fodpPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, timeoutMs: 60000 });
  assert.ok(fs.existsSync(fodpPath), "FODP phải được tạo thành công");

  console.log("Step 3: Đọc FODP output và kiểm tra draw:transform ODF...");
  const fodpXml = fs.readFileSync(fodpPath, "utf8");
  const shapeMatch = fodpXml.match(/<draw:custom-shape\b[^>]*>[\s\S]{0,300}?Hop xoay/i);
  const hasTransform = /draw:transform=["']rotate/i.test(shapeMatch?.[0] || "");
  console.log(`  soffice ghi draw:transform (rotate/translate) cho hình xoay: ${hasTransform}`);
  assert.ok(hasTransform, "Probe phải xác nhận draw:transform xuất hiện — nếu không, soffice đã đổi hành vi so với lần xác nhận trước");

  console.log("Step 4: Gọi SlidesAdapter.parseFodp() trên FODP thật (KHÔNG qua VN Office serialize)...");
  const slides = new SlidesAdapter(null).parseFodp(fodpXml);
  const rect = (slides[0]?.shapes || []).find(s => s.text === "Hop xoay");
  assert.ok(rect, "Phải parse được hình chữ nhật xoay");

  console.log(`  rect.x=${rect.x} rect.y=${rect.y} rect.w=${rect.w} rect.h=${rect.h}`);
  assert.notEqual(rect.x, 0, "x không được là 0 (offset thật khác 0) — 0 nghĩa là bug _parseDrawShape chưa sửa");
  assert.notEqual(rect.y, 0, "y không được là 0 (offset thật khác 0)");

  console.log("\nPASS: SlidesAdapter.parseFodp() đọc đúng vị trí hình chữ nhật xoay (_parseDrawShape) từ file FODP thật.");
  console.log(JSON.stringify({ x: rect.x, y: rect.y, w: rect.w, h: rect.h }));
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
