/**
 * Live soffice: Lỗi thật đã xác nhận — hình (ảnh) bị XOAY trong file PPTX
 * thật (rất phổ biến: ảnh chụp xoay/khối trang trí chéo) khi soffice
 * convert sang FODP ghi vị trí qua draw:transform="rotate(...)
 * translate(...)" thay vì svg:x/svg:y (2 thuộc tính này vắng mặt hoàn
 * toàn). SlidesAdapter._parseFrameShape() trước đây chỉ đọc svg:x/svg:y,
 * khiến MỌI hình bị xoay luôn hiển thị sai vị trí — dồn về góc (0,0).
 * Lỗi thứ 2, sâu hơn: hàm dùng chung _parseDrawTranslate() (đọc translate()
 * từ draw:transform, vốn đã tồn tại và dùng cho <draw:g> SmartArt) có regex
 * yêu cầu "translate(" liền nhau, nhưng soffice thật ghi CÓ khoảng trắng
 * ("translate (5.318cm 1.726cm)") nên không bao giờ khớp.
 *
 * Test này đi hết vòng thật: tạo PPTX chuẩn OOXML có ảnh xoay 45° + cắt
 * (crop) → convert qua soffice thật sang FODP → gọi parseFodp() trực tiếp
 * trên FODP đó (KHÔNG qua VN Office serialize trước) → xác nhận vị trí ảnh
 * khớp đúng offset thật (không phải 0,0).
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

const PNG_1X1_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_1X1_BASE64, "base64");

/** PPTX tối thiểu, thật, có 1 ảnh xoay 45° (rot=2700000, đơn vị 1/60000 độ) + cắt 10% mỗi cạnh. */
function createPptxWithRotatedCroppedImage() {
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
      <p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="Picture 1"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId1"/>
          <a:srcRect l="10000" t="10000" r="10000" b="10000"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm rot="2700000">
            <a:off x="1000000" y="1000000"/>
            <a:ext cx="1828800" cy="1828800"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
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

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/_rels/presentation.xml.rels", data: presRels },
    { name: "ppt/slides/slide1.xml", data: slideXml },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: slideRels },
    { name: "ppt/media/image1.png", data: PNG_BYTES }
  ]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides-rotated-image-"));

try {
  console.log("Step 1: Tạo PPTX thật có ảnh xoay 45° + cắt (crop) 10% mỗi cạnh...");
  const pptxPath = path.join(tempRoot, "slides-rotated-image.pptx");
  fs.writeFileSync(pptxPath, createPptxWithRotatedCroppedImage());
  assert.ok(fs.existsSync(pptxPath), "PPTX phải được tạo thành công");

  console.log("Step 2: Convert PPTX → FODP qua soffice thật...");
  const profileDir = path.join(tempRoot, "profile");
  const fodpPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, timeoutMs: 60000 });
  assert.ok(fs.existsSync(fodpPath), "FODP phải được tạo thành công");

  console.log("Step 3: Đọc FODP output và kiểm tra draw:transform ODF...");
  const fodpXml = fs.readFileSync(fodpPath, "utf8");
  // Soffice cũng tự thêm các draw:frame placeholder khác (header/footer...)
  // trước ảnh thật — phải tìm ĐÚNG frame chứa draw:image, không lấy frame
  // đầu tiên tìm thấy trong tài liệu.
  const frameRegex = /<draw:frame\b[^>]*>[\s\S]*?<\/draw:frame>/gi;
  let frameMatch = null;
  let candidate;
  while ((candidate = frameRegex.exec(fodpXml)) !== null) {
    if (/<draw:image\b/i.test(candidate[0])) { frameMatch = [candidate[0]]; break; }
  }
  const hasTransform = /draw:transform=["']rotate/i.test(frameMatch?.[0] || "");
  console.log(`  soffice ghi draw:transform (rotate/translate) cho ảnh xoay: ${hasTransform}`);
  assert.ok(hasTransform, "Probe phải xác nhận draw:transform xuất hiện — nếu không, soffice đã đổi hành vi so với lần xác nhận trước");
  assert.ok(!/svg:x=/i.test(frameMatch[0]), "svg:x không được xuất hiện khi có draw:transform — xác nhận đúng cơ chế gây lỗi");

  console.log("Step 4: Gọi SlidesAdapter.parseFodp() trên FODP thật (KHÔNG qua VN Office serialize)...");
  const slides = new SlidesAdapter(null).parseFodp(fodpXml);
  const image = (slides[0]?.shapes || []).find(s => s.type === "image");
  assert.ok(image, "Phải parse được shape type=image");

  console.log(`  image.x=${image.x} image.y=${image.y} image.w=${image.w} image.h=${image.h}`);
  assert.notEqual(image.x, 0, "x không được là 0 (offset thật khác 0) — 0 nghĩa là bug cũ (rơi về svg:x vắng mặt)");
  assert.notEqual(image.y, 0, "y không được là 0 (offset thật khác 0)");

  console.log("\nPASS: SlidesAdapter.parseFodp() đọc đúng vị trí ảnh xoay từ file FODP thật do soffice tạo ra.");
  console.log(JSON.stringify({ x: image.x, y: image.y, w: image.w, h: image.h }));
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
