/**
 * Live soffice: Tạo XLSX thật có Print Titles (_xlnm.Print_Titals) → convert
 * qua soffice → convert to FODS → gọi SheetAdapter.parseFods() trực tiếp
 * trên FODS đó (KHÔNG qua VN Office serialize trước) → xác nhận
 * printTitles.rows/cols được parse đúng.
 *
 * Mục đích: chứng minh parseFods() đọc được Print Titles từ BẤT KỲ file
 * XLSX thật nào (Excel, Google Sheets, LibreOffice Calc) đã set Print Titles.
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

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Tạo XLSX file có Print Titles thật (_xlnm.Print_Titles defined name).
 * Cấu trúc XLSX tối thiểu: [Content_Types].xml, xl/workbook.xml,
 * xl/worksheets/sheet1.xml, xl/sharedStrings.xml, xl/styles.xml, _rels/.rels, xl/_rels/workbook.xml.rels
 */
function createXlsxWithPrintTitles({ rows = "$1:$1", cols = "$A:$A", sheetName = "Sheet1" } = {}) {
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Header</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Data1</t></is></c></row>
  </sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${sheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
  <definedNames>
    <definedName name="_xlnm.Print_Titles" localSheetId="0">Sheet1!${rows},${cols}</definedName>
  </definedNames>
</workbook>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf/></cellXfs>
</styleSheet>`;

  const sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
  <si><t>Header</t></si>
  <si><t>Data1</t></si>
</sst>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml },
    { name: "xl/styles.xml", data: styles },
    { name: "xl/sharedStrings.xml", data: sharedStrings }
  ]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-print-titles-"));

try {
  console.log("Step 1: Tạo XLSX có Print Titles thật (_xlnm.Print_Titles)...");
  const xlsxBytes = createXlsxWithPrintTitles({ rows: "$1:$1", cols: "$A:$A", sheetName: "Sheet1" });
  const xlsxPath = path.join(tempRoot, "print-titles.xlsx");
  fs.writeFileSync(xlsxPath, xlsxBytes);
  assert.ok(fs.existsSync(xlsxPath), "XLSX phải được tạo thành công");

  console.log("Step 2: Convert XLSX → FODS qua soffice thật...");
  const profileDir = path.join(tempRoot, "profile");
  const fodsPath = convertWithSoffice(xlsxPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  assert.ok(fs.existsSync(fodsPath), "FODS phải được tạo thành công");

  console.log("Step 3: Đọc FODS output và kiểm tra Print Titles ODF...");
  const fodsXml = fs.readFileSync(fodsPath, "utf8");
  const hasNamedExpression = /table:name=["']_xlnm\.Print_Titles["']/.test(fodsXml);
  console.log(`  soffice FODS có table:named-expression _xlnm.Print_Titles: ${hasNamedExpression}`);

  console.log("Step 4: Gọi SheetAdapter.parseFods() trên FODS thật (KHÔNG qua VN Office serialize)...");
  const adapter = new SheetAdapter(null);
  const parsed = adapter.parseFods(fodsXml);
  assert.ok(parsed, "parseFods() phải trả về kết quả");

  const titles = parsed.pageSetupBySheet?.Sheet1?.printTitles;
  assert.ok(titles, "Phải có printTitles cho Sheet1");

  console.log(`  printTitles.rows = "${titles.rows}"`);
  console.log(`  printTitles.cols = "${titles.cols}"`);

  assert.ok(titles.rows !== "", "rows không được rỗng — Print Titles hàng phải được parse từ FODS thật");
  assert.ok(titles.cols !== "", "cols không được rỗng — Print Titles cột phải được parse từ FODS thật");

  console.log(`\nPASS: SheetAdapter.parseFods() đọc đúng Print Titles từ file FODS thật do soffice tạo ra.`);
  console.log(JSON.stringify({ rows: titles.rows, cols: titles.cols, hasNamedExpression }));
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
