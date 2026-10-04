/** P2 payload parser equivalence and rollback selector. */

import { deflateSync } from "node:zlib";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { buildSheetPayloadModel, toPlain } from "../../adapters/libreoffice/sheet/sheet-payload-parser.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fixture() {
  const row = `<table:table-row table:style-name="ro1"><table:table-cell office:value-type="float" office:value="12.5" table:formula="of:=[.A1]*2" table:style-name="ce1" vno:number-format="{&quot;category&quot;:&quot;number&quot;,&quot;decimals&quot;:2}" vno:xf="7" table:number-columns-spanned="2"><text:p>12.50</text:p><office:annotation><dc:creator>QA</dc:creator><dc:date>2026-10-03</dc:date><text:p>Ghi chu</text:p></office:annotation></table:table-cell><table:covered-table-cell/><table:table-cell office:value-type="string" table:content-validation-name="valid1"><text:p><text:a xlink:href="https://example.test">Lien ket</text:a></text:p></table:table-cell></table:table-row>`;
  const records = [["sheet", "Data"], ["row-xml", row], ["end-sheet"]];
  const supportXml = `<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:automatic-styles><style:style style:name="ce1" style:family="table-cell"><style:table-cell-properties fo:background-color="#ffeeaa"/></style:style><style:style style:name="ro1" style:family="table-row"><style:table-row-properties style:row-height="0.7cm"/></style:style></office:automatic-styles><office:body><office:spreadsheet><table:content-validations><table:content-validation table:name="valid1" table:condition="cell-content-is-decimal-number()"/></table:content-validations><table:named-expressions><table:named-range table:name="Vung" table:cell-range-address="$Data.$A$1:$C$1"/></table:named-expressions><table:table table:name="Data"><table:table-column table:visibility="collapse"/><table:table-row/></table:table></office:spreadsheet></office:body></office:document>`;
  return {
    format: "vno.sheet.payload.v2", rowsEncoding: "deflate-base64-jsonl-row-xml",
    sourceBytes: Buffer.byteLength(supportXml), sheets: 1, rows: 1, supportXml, rawStyleXml: {},
    rowsDeflateBase64: deflateSync(Buffer.from(records.map(JSON.stringify).join("\n") + "\n")).toString("base64"),
  };
}

export async function runSheetPayloadP2EquivalenceTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("P2 model is deep-equal to the retained legacy parser", async () => {
    const payload = fixture();
    const legacy = toPlain(await buildSheetPayloadModel(payload, new SheetAdapter(null), undefined, { legacy: true }));
    const p2 = toPlain(await buildSheetPayloadModel(payload, new SheetAdapter(null)));
    assert(JSON.stringify(p2) === JSON.stringify(legacy), "P2 workbook differs from legacy workbook");
  });

  await test("global rollback selector keeps the legacy result", async () => {
    const payload = fixture();
    const expected = toPlain(await buildSheetPayloadModel(payload, new SheetAdapter(null), undefined, { legacy: true }));
    globalThis.__VNO_OPEN_LEGACY = true;
    try {
      const selected = toPlain(await buildSheetPayloadModel(payload, new SheetAdapter(null)));
      assert(JSON.stringify(selected) === JSON.stringify(expected), "global legacy selector did not select legacy parser");
    } finally {
      delete globalThis.__VNO_OPEN_LEGACY;
    }
  });

  return results;
}
