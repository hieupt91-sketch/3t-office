import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createZip } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { auditSheetImport } from "../../scripts/audit-sheet-import.mjs";

const WORKBOOK = `<?xml version="1.0"?><workbook xmlns:r="r"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const RELS = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`;
const STYLES = `<?xml version="1.0"?><styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00%"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>`;
const SHEET = `<?xml version="1.0"?><worksheet><sheetViews><sheetView><pane ySplit="1" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="13.5714285714" customWidth="1"/></cols><sheetData><row r="1" ht="15" customHeight="1"><c r="A1" t="s"><v>0</v></c><c r="B1" s="1"><f>SUM(B2:B2)</f><v>0.25</v></c></row><row r="2" hidden="1"><c r="B2"><v>0.25</v></c></row></sheetData><mergeCells><mergeCell ref="A1:A2"/></mergeCells><autoFilter ref="A1:B2"/></worksheet>`;
const SHARED = `<?xml version="1.0"?><sst><si><t>A &amp; B</t></si></sst>`;
const FODS = `<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:automatic-styles><number:percentage-style style:name="N1"><number:number number:decimal-places="2"/><number:text>%</number:text></number:percentage-style><style:style style:name="ce1" style:family="table-cell" style:data-style-name="N1"/><style:style style:name="ro1" style:family="table-row"><style:table-row-properties style:row-height="0.529167cm"/></style:style></office:automatic-styles><office:settings><config:config-item-set xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><config:config-item config:name="ActiveTable">Data</config:config-item></config:config-item-set></office:settings><office:body><office:spreadsheet><table:table table:name="Data" vno:frozen-rows="1"><table:table-column/><table:table-row table:style-name="ro1"><table:table-cell table:number-rows-spanned="2" office:value-type="string" office:string-value="A &amp;amp; B"><text:p>A &amp;amp; B</text:p></table:table-cell><table:table-cell table:style-name="ce1" table:formula="of:=SUM([.B2:.B2])" office:value-type="percentage" office:value="0.25"><text:p>25.00%</text:p></table:table-cell></table:table-row><table:table-row table:visibility="collapse"><table:covered-table-cell/><table:table-cell office:value-type="float" office:value="0.25"><text:p>0.25</text:p></table:table-cell></table:table-row></table:table><table:database-ranges><table:database-range table:name="Filter_Data" table:target-range-address="Data.A1:B2" table:display-filter-buttons="true"/></table:database-ranges></office:spreadsheet></office:body></office:document>`;

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-audit-"));
  const xlsx = path.join(dir, "fixture.xlsx"); const fods = path.join(dir, "fixture.fods");
  fs.writeFileSync(xlsx, createZip([
    { name: "xl/workbook.xml", data: WORKBOOK }, { name: "xl/_rels/workbook.xml.rels", data: RELS },
    { name: "xl/styles.xml", data: STYLES }, { name: "xl/sharedStrings.xml", data: SHARED },
    { name: "xl/worksheets/sheet1.xml", data: SHEET }
  ]));
  fs.writeFileSync(fods, FODS);
  return { dir, xlsx, fods };
}

export async function runSheetImportAuditTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  await test("parseFods regex: giải mã đúng text bị soffice escape hai lớp", () => {
    const parsed = new SheetAdapter(null).parseFods(FODS);
    assert.equal(parsed.sheetsData.Data.get("A1").val, "A & B");
  });
  await test("audit engine: đối chiếu value/formula/format/merge/layout/hidden/freeze/filter", () => {
    const f = fixture();
    try { const report = auditSheetImport(f.xlsx, f.fods); assert.equal(report.totals.mismatches, 0, JSON.stringify(report.sheets[0].mismatches)); }
    finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
  });
  await test("audit CLI chạy trên fixture nhỏ và in tổng hợp", () => {
    const f = fixture();
    try {
      const cli = spawnSync(process.execPath, ["scripts/audit-sheet-import.mjs", f.xlsx, f.fods], { cwd: path.resolve("."), encoding: "utf8" });
      assert.equal(cli.status, 0, cli.stderr); assert.match(cli.stdout, /TONG: o khop 3\/3; sai lech 0/);
    } finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
  });
  await test("Python overlay giữ kích thước XLSX chính xác cho cả parser regex", () => {
    const f = fixture(); const overlaid = path.join(f.dir, "overlaid.fods");
    try {
      const run = spawnSync("python", ["adapters/libreoffice/common/ooxml_zip_patch.py", "--xlsx", f.xlsx, "--overlay-fods", f.fods, "--out", overlaid], { cwd: path.resolve("."), encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr);
      const parsed = new SheetAdapter(null).parseFods(fs.readFileSync(overlaid, "utf8"));
      assert.equal(parsed.colWidthsBySheet.Data.get("A"), 99.9999999998);
      assert.equal(parsed.rowHeightsBySheet.Data.get(1), 20);
    } finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
  });
  return results;
}
