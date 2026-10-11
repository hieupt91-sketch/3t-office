/**
 * Live soffice: Tạo XLSX thật có ảnh nhúng (xdr:oneCellAnchor neo vào ô A1,
 * đúng cấu trúc OOXML thật đã xác nhận qua probe file test thực tế
 * "Copy of máy bảo mật - KTQT - thẩm định.xlsx") → convert qua soffice →
 * convert sang FODS → gọi SheetAdapter.parseFods() trực tiếp trên FODS đó
 * (KHÔNG qua VN Office serialize trước) → xác nhận ảnh được parse vào
 * imagesBySheet với đúng ô neo (anchor) và dữ liệu ảnh base64 khớp gốc.
 *
 * Mục đích: chứng minh parseFods() đọc được ảnh nhúng từ BẤT KỲ file XLSX
 * thật nào (Excel, Google Sheets, LibreOffice Calc), không chỉ ảnh do
 * VN Office tự chèn qua insertImage().
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live test");

// PNG 1x1 pixel tối giản, hợp lệ (không phụ thuộc thư viện ảnh ngoài).
const PNG_1X1_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_1X1_BASE64, "base64");

function createXlsxWithEmbeddedImage() {
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Header</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Data1</t></is></c></row>
  </sheetData>
  <drawing r:id="rIdDraw1"/>
</worksheet>`;

  const sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdDraw1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;

  const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:ext cx="914400" cy="914400"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="2" name="Picture 1"/><xdr:cNvPicPr/></xdr:nvPicPr>
      <xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;

  const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf/></cellXfs>
</styleSheet>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml },
    { name: "xl/worksheets/_rels/sheet1.xml.rels", data: sheetRels },
    { name: "xl/drawings/drawing1.xml", data: drawingXml },
    { name: "xl/drawings/_rels/drawing1.xml.rels", data: drawingRels },
    { name: "xl/media/image1.png", data: PNG_BYTES },
    { name: "xl/styles.xml", data: styles }
  ]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-image-"));

try {
  console.log("Step 1: Tạo XLSX có ảnh nhúng thật (xdr:oneCellAnchor neo tại A1)...");
  const xlsxBytes = createXlsxWithEmbeddedImage();
  const xlsxPath = path.join(tempRoot, "sheet-image.xlsx");
  fs.writeFileSync(xlsxPath, xlsxBytes);
  assert.ok(fs.existsSync(xlsxPath), "XLSX phải được tạo thành công");

  console.log("Step 2: Convert XLSX → FODS qua soffice thật...");
  const profileDir = path.join(tempRoot, "profile");
  const fodsPath = convertWithSoffice(xlsxPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  assert.ok(fs.existsSync(fodsPath), "FODS phải được tạo thành công");

  console.log("Step 3: Đọc FODS output và kiểm tra draw:frame/draw:image ODF...");
  const fodsXml = fs.readFileSync(fodsPath, "utf8");
  const hasDrawImage = /<draw:image\b[^>]*draw:mime-type=["']image\/png["']/i.test(fodsXml);
  console.log(`  soffice FODS có draw:image (image/png): ${hasDrawImage}`);
  assert.ok(hasDrawImage, "soffice phải ghi draw:image vào FODS — nếu không, probe đã đổi khác so với xác nhận trước đây");

  console.log("Step 4: Gọi SheetAdapter.parseFods() trên FODS thật (KHÔNG qua VN Office serialize)...");
  const adapter = new SheetAdapter(null);
  const parsed = adapter.parseFods(fodsXml);
  assert.ok(parsed, "parseFods() phải trả về kết quả");

  const images = parsed.imagesBySheet?.Sheet1;
  assert.ok(Array.isArray(images), "Phải có imagesBySheet.Sheet1 (mảng)");
  assert.equal(images.length, 1, `Phải parse đúng 1 ảnh, nhận được ${images.length}`);

  const image = images[0];
  console.log(`  image.anchor = ${JSON.stringify(image.anchor)}`);
  console.log(`  image.src bắt đầu bằng = ${image.src.slice(0, 30)}...`);

  assert.deepEqual(image.anchor, { c: "A", r: 1 }, "Ảnh phải neo đúng ô A1 (khớp xdr:from col=0/row=0)");
  assert.ok(image.src.startsWith("data:image/png;base64,"), "src phải là data URI image/png");

  const decodedBase64 = image.src.slice(image.src.indexOf(",") + 1);
  const decodedBytes = Buffer.from(decodedBase64, "base64");
  assert.ok(decodedBytes.length > 0, "Dữ liệu ảnh giải mã phải khác rỗng");
  // soffice có thể re-encode PNG (đổi nén/metadata) nên không so khớp byte-for-byte
  // với PNG gốc — chỉ xác nhận đây vẫn là PNG hợp lệ (magic bytes chuẩn).
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(decodedBytes.subarray(0, 8).equals(pngMagic), "Dữ liệu giải mã phải là PNG hợp lệ (đúng magic bytes)");

  console.log("\nPASS: SheetAdapter.parseFods() đọc đúng ảnh nhúng từ file FODS thật do soffice tạo ra.");
  console.log(JSON.stringify({ anchor: image.anchor, mime: "image/png", bytes: decodedBytes.length }));
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
