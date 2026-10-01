import assert from "node:assert/strict";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { applyPrintTitlesToFods, parsePrintTitlesFromWorkbook } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

const FODS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table" style:master-page-name="Page_Audit"><style:table-properties table:display="true"/></style:style>
  <style:page-layout style:name="pm3"><style:page-layout-properties fo:page-width="35.56cm" fo:page-height="21.59cm" style:print-orientation="landscape" fo:margin-top="2.54cm" fo:margin-bottom="2.1cm" fo:margin-left="1.27cm" fo:margin-right="1.5cm" style:scale-to-X="1" style:scale-to-Y="2"/></style:page-layout>
 </office:automatic-styles>
 <office:master-styles><style:master-page style:name="Page_Audit" style:page-layout-name="pm3"><style:header><text:p>Báo cáo quý</text:p></style:header><style:footer><text:p>Trang <text:page-number>1</text:page-number><text:s/>/ <text:page-count>9</text:page-count></text:p></style:footer></style:master-page></office:master-styles>
 <office:body><office:spreadsheet><table:table table:name="Audit" table:style-name="ta1" table:print-ranges="Audit.A1:Audit.B5"><table:table-row><table:table-cell office:value-type="string"><text:p>Name</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body>
</office:document>`;

const WORKBOOK = `<workbook><sheets><sheet name="Audit"/><sheet name="Data"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Audit'!$1:$2,'Audit'!$A:$B</definedName></definedNames></workbook>`;

export async function runSheetPrintSetupRoundTripTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("XLSX Print Titles overlay restores rows and columns before FODS parsing", () => {
    const titles = parsePrintTitlesFromWorkbook(WORKBOOK);
    assert.deepEqual(titles, { Audit: { rows: "1:2", cols: "A:B" } });
    const overlaid = applyPrintTitlesToFods(FODS, titles);
    assert.match(overlaid, /vno:print-title-rows="1:2"/);
    assert.match(overlaid, /xmlns:vno=/);
    const parsed = new SheetAdapter(null).parseFods(overlaid);
    assert.deepEqual(parsed.pageSetupBySheet.Audit.printTitles, { rows: "1:2", cols: "A:B" });
  });

  test("Standard FODS restores paper, orientation, margins, fit, print area and header/footer", () => {
    const parsed = new SheetAdapter(null).parseFods(applyPrintTitlesToFods(FODS, parsePrintTitlesFromWorkbook(WORKBOOK)));
    const setup = parsed.pageSetupBySheet.Audit;
    assert.equal(setup.size, "legal");
    assert.equal(setup.orientation, "landscape");
    assert.deepEqual(setup.margins, { top: 2.54, bottom: 2.1, left: 1.27, right: 1.5 });
    assert.deepEqual(setup.scale, { mode: "pages", percent: 100, pagesWide: 1, pagesTall: 2 });
    assert.equal(parsed.printAreaBySheet.Audit, "A1:B5");
    assert.equal(setup.headerFooter.header.center, "Báo cáo quý");
    assert.equal(setup.headerFooter.footer.center, "Trang &P / &N");
  });

  test("Vietnamese Help gives the exact Page Setup save and reopen path", () => {
    const entry = SHEET_HELP_ENTRIES.find(item => item.id === "sheet.page.saveRoundTrip");
    assert.ok(entry);
    const content = [entry.title, entry.summary, ...(entry.steps || [])].join(" ");
    for (const text of ["Bố trí trang", "Hướng", "Khổ", "vùng in", "Tiêu đề in", "Ctrl+S", "XLSX", "Excel"]) assert.ok(content.includes(text), `Missing ${text}`);
  });

  return results;
}
