import assert from "node:assert/strict";
import { launchApp } from "./session.mjs";

const session = await launchApp("sheet");
try {
  const result = await session.cdp.evaluate(`(async () => {
    const { SheetAdapter } = await import('/adapters/libreoffice/sheet/sheet-adapter.js');
    const xml = '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">'
      + '<office:body><office:spreadsheet><table:table table:name="Data">'
      + '<table:table-row table:number-rows-repeated="3"><table:table-cell table:number-columns-repeated="2" office:value-type="float" office:value="7"><text:p>7</text:p></table:table-cell>'
      + '<table:table-cell office:value-type="string"><text:p>Tiếng Việt</text:p></table:table-cell></table:table-row>'
      + '<table:table-row><table:table-cell table:formula="of:=SUM([.A1:.B3])" office:value-type="float" office:value="42"><text:p>42</text:p></table:table-cell></table:table-row>'
      + '<table:named-expressions><table:named-range table:name="LocalTotal" table:cell-range-address="$Data.$A$1:.$B$3"/></table:named-expressions>'
      + '</table:table></office:spreadsheet></office:body></office:document>';
    const OriginalParser = window.DOMParser;
    let parsedDocument;
    window.DOMParser = class extends OriginalParser {
      parseFromString(...args) { parsedDocument = super.parseFromString(...args); return parsedDocument; }
    };
    try {
      const model = new SheetAdapter({}).parseFods(xml);
      const cells = model.sheetsData.Data;
      return {
        sheets: model.sheets,
        numbers: ['A1','B1','A2','B2','A3','B3'].map(c => cells.get(c).val),
        text: ['C1','C2','C3'].map(c => cells.get(c).val),
        formula: cells.get('A4').formula,
        formulaValue: cells.get('A4').val,
        names: model.namedRangesBySheet.Data.map(n => ({name:n.name,ref:n.ref})),
        retainedXmlCells: parsedDocument.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0','table-cell').length,
      };
    } finally { window.DOMParser = OriginalParser; }
  })()`);
  assert.deepEqual(result.sheets, ["Data"]);
  assert.deepEqual(result.numbers, [7, 7, 7, 7, 7, 7]);
  assert.deepEqual(result.text, ["Tiếng Việt", "Tiếng Việt", "Tiếng Việt"]);
  assert.equal(result.formula, "=SUM(A1:B3)");
  assert.equal(result.formulaValue, 42);
  assert.deepEqual(result.names, [{ name: "LocalTotal", ref: "A1:B3" }]);
  assert.equal(result.retainedXmlCells, 0);
  console.log("PASS 7/7: repeated rows/cells, text, formula, cached value, local name and XML release.");
} finally {
  await session.close();
}
