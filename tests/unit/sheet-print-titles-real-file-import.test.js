/**
 * Unit Tests: VN Sheet Print Titles thật — đọc đúng Print Titles từ file FODS
 * do LibreOffice/Excel thật tạo ra (không có thuộc tính vno:print-title-rows/cols
 * riêng của VN Office). Khi LibreOffice convert XLSX→FODS, Print Titles được ghi
 * vào <table:named-expression table:name="_xlnm.Print_Titles"> chuẩn ODF, KHÔNG PHẢI
 * thuộc tính vno: riêng. Test này xác nhận parseFods() đọc đúng ODF chuẩn và vẫn ưu
 * tiên vno: khi file do chính VN Office ghi ra.
 */
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeContainer() {
  return {
    style: {}, className: "", classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
}

/**
 * Tạo FODS chuẩn ODF có Print Titles dạng table:named-expression
 * (mô phỏng đúng cấu trúc LibreOffice ghi ra khi convert XLSX→FODS)
 */
function realOdfFodsWithPrintTitles({ sheetName = "Sheet1", rows = "1", cols = "A", baseCellSheet = "Sheet1" } = {}) {
  const expression = [];
  if (rows) {
    if (rows.includes(":")) {
      const [s, e] = rows.split(":");
      expression.push(`[$${sheetName}.$${s}:.$${e}]`);
    } else {
      expression.push(`[$${sheetName}.$${rows}]`);
    }
  }
  if (cols) {
    if (cols.includes(":")) {
      const [s, e] = cols.split(":");
      expression.push(`[$${sheetName}.$${s}:.$${e}]`);
    } else {
      expression.push(`[$${sheetName}.$${cols}]`);
    }
  }
  const exprStr = expression.join(";");
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table">
   <style:table-properties table:display="true"/>
  </style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="${sheetName}" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="10"/>
    <table:table-row>
     <table:table-cell office:value-type="string"><text:p>Header</text:p></table:table-cell>
    </table:table-row>
    <table:table-row>
     <table:table-cell office:value-type="string"><text:p>Data1</text:p></table:table-cell>
    </table:table-row>
   </table:table>
   <table:named-expressions>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$${baseCellSheet}.$A$1" table:expression="${exprStr}"/>
   </table:named-expressions>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

/**
 * Tạo FODS có Print Titles cho NHIỀU sheet (mỗi sheet có named-expression riêng)
 */
function realOdfFodsMultiSheetPrintTitles() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H1</text:p></table:table-cell></table:table-row>
   </table:table>
   <table:table table:name="Sheet2" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H2</text:p></table:table-cell></table:table-row>
   </table:table>
   <table:named-expressions>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$Sheet1.$A$1" table:expression="[$Sheet1.$1:.$1];[$Sheet1.$A:.$A]"/>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$Sheet2.$A$1" table:expression="[$Sheet2.$2:.$3];[$Sheet2.$B:.$D]"/>
   </table:named-expressions>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

/**
 * Tạo FODS chỉ có Print Rows (không có Cols)
 */
function realOdfFodsRowsOnly() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H</text:p></table:table-cell></table:table-row>
   </table:table>
   <table:named-expressions>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$Sheet1.$A$1" table:expression="[$Sheet1.$1:.$1]"/>
   </table:named-expressions>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

/**
 * Tạo FODS chỉ có Print Cols (không có Rows)
 */
function realOdfFodsColsOnly() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H</text:p></table:table-cell></table:table-row>
   </table:table>
   <table:named-expressions>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$Sheet1.$A$1" table:expression="[$Sheet1.$A:.$B]"/>
   </table:named-expressions>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

/**
 * Tạo FODS không có Print Titles (không có table:named-expression _xlnm.Print_Titles)
 */
function realOdfFodsNoPrintTitles() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1" table:style-name="ta1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H</text:p></table:table-cell></table:table-row>
   </table:table>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

/**
 * Tạo FODS do VN Office ghi ra (có vno:print-title-rows/cols) — phải ưu tiên vno:
 */
function vnOfficeFodsWithPrintTitles() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:vno="https://vnoffice.vn/schema/vno" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table"><style:table-properties table:display="true"/></style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1" table:style-name="ta1" vno:print-title-rows="3:5" vno:print-title-cols="C:E">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H</text:p></table:table-cell></table:table-row>
   </table:table>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

export async function runSheetPrintTitlesRealFileImportTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("_parseStandardPrintTitles: đọc đúng hàng và cột từ FODS chuẩn ODF (rows=1, cols=A)", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsWithPrintTitles({ rows: "1", cols: "A" });
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "1", `rows phải là "1", nhận "${titles.rows}"`);
    assert(titles.cols === "A", `cols phải là "A", nhận "${titles.cols}"`);
  });

  test("_parseStandardPrintTitles: đọc đúng khoảng hàng và cột (rows=1:3, cols=A:C)", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsWithPrintTitles({ rows: "1:3", cols: "A:C" });
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "1:3", `rows phải là "1:3", nhận "${titles.rows}"`);
    assert(titles.cols === "A:C", `cols phải là "A:C", nhận "${titles.cols}"`);
  });

  test("_parseStandardPrintTitles: chỉ có hàng (không có cột), cols phải rỗng", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsRowsOnly();
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "1", `rows phải là "1", nhận "${titles.rows}"`);
    assert(titles.cols === "", `cols phải rỗng, nhận "${titles.cols}"`);
  });

  test("_parseStandardPrintTitles: chỉ có cột (không có hàng), rows phải rỗng", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsColsOnly();
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "", `rows phải rỗng, nhận "${titles.rows}"`);
    assert(titles.cols === "A:B", `cols phải là "A:B", nhận "${titles.cols}"`);
  });

  test("_parseStandardPrintTitles: không có Print Titles nào → rows/cols đều rỗng", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsNoPrintTitles();
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "", `rows phải rỗng, nhận "${titles.rows}"`);
    assert(titles.cols === "", `cols phải rỗng, nhận "${titles.cols}"`);
  });

  test("_parseStandardPrintTitles: nhiều sheet — đọc đúng Print Titles riêng cho từng sheet", () => {
    const adapter = new SheetAdapter(null);
    const fods = realOdfFodsMultiSheetPrintTitles();
    const parsed = adapter.parseFods(fods);
    const t1 = parsed.pageSetupBySheet.Sheet1.printTitles;
    const t2 = parsed.pageSetupBySheet.Sheet2.printTitles;
    assert(t1.rows === "1", `Sheet1 rows phải là "1", nhận "${t1.rows}"`);
    assert(t1.cols === "A", `Sheet1 cols phải là "A", nhận "${t1.cols}"`);
    assert(t2.rows === "2:3", `Sheet2 rows phải là "2:3", nhận "${t2.rows}"`);
    assert(t2.cols === "B:D", `Sheet2 cols phải là "B:D", nhận "${t2.cols}"`);
  });

  test("Ưu tiên vno: khi có cả vno: và ODF chuẩn — vno: phải thắng", () => {
    const adapter = new SheetAdapter(null);
    const fods = vnOfficeFodsWithPrintTitles();
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "3:5", `vno: rows phải là "3:5", nhận "${titles.rows}"`);
    assert(titles.cols === "C:E", `vno: cols phải là "C:E", nhận "${titles.cols}"`);
  });

  test("Round-trip: serialize → parse — printTitles phải giữ nguyên (không mất khi reload)", () => {
    const grid = {
      sheets: ["S1"], activeSheet: "S1",
      sheetsData: { S1: new Map([["A1", { val: "x", formula: "", style: {} }]]) },
      commentsBySheet: { S1: {} }, namedRangesBySheet: { S1: [] }, namedRangesWorkbook: [],
      printAreaBySheet: { S1: null },
      pageSetupBySheet: { S1: {
        margins: { top: 1.91, bottom: 1.91, left: 1.78, right: 1.78 },
        orientation: "portrait", size: "a4",
        scale: { mode: "percent", percent: 100, pagesWide: 1, pagesTall: 0 },
        headerFooter: { header: { left: "", center: "", right: "" }, footer: { left: "", center: "", right: "" } },
        centerOnPage: { horizontal: false, vertical: false },
        printOptions: { gridlines: false, headings: false },
        printTitles: { rows: "1:2", cols: "A:B" }
      } }
    };
    const fods = new SheetAdapter(grid).serializeToFods();
    const parsed = new SheetAdapter(null).parseFods(fods);
    const after = parsed.pageSetupBySheet.S1.printTitles;
    assert(after.rows === "1:2", `Round-trip rows phải là "1:2", nhận "${after.rows}"`);
    assert(after.cols === "A:B", `Round-trip cols phải là "A:B", nhận "${after.cols}"`);
  });

  test("_parseStandardPrintTitles: không crash khi base-cell-address không khớp sheet", () => {
    const fods = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:body>
  <office:spreadsheet>
   <table:table table:name="Sheet1">
    <table:table-column table:number-columns-repeated="5"/>
    <table:table-row><table:table-cell office:value-type="string"><text:p>H</text:p></table:table-cell></table:table-row>
   </table:table>
   <table:named-expressions>
    <table:named-expression table:name="_xlnm.Print_Titles" table:base-cell-address="$Sheet2.$A$1" table:expression="[$Sheet1.$1:.$1]"/>
   </table:named-expressions>
  </office:spreadsheet>
 </office:body>
</office:document>`;
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(fods);
    const titles = parsed.pageSetupBySheet.Sheet1.printTitles;
    assert(titles.rows === "1", `Phải đọc đúng từ expression dù base-cell-address khác sheet, nhận "${titles.rows}"`);
  });

  return results;
}
