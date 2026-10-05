/** P2 payload parser equivalence and rollback selector. */

import { deflateSync, inflateSync } from "node:zlib";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { __parseAttrsP2ForTest, buildSheetPayloadModel, toPlain } from "../../adapters/libreoffice/sheet/sheet-payload-parser.js";

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

  await test("optimized XML unescape and attribute scan preserve legacy values", async () => {
    const adapter = new SheetAdapter(null);
    const legacyUnescape = value => !value ? "" : String(value)
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
      .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<").replace(/&amp;/g, "&");
    for (const value of ["plain text", "&amp; &#x41; &#65;", "'single' and \"double\"", "  spaced  ", "&amp;lt;"]) {
      assert(adapter._unescapeXml(value) === legacyUnescape(value), `unescape changed ${value}`);
    }
    const payload = fixture();
    const records = inflateSync(Buffer.from(payload.rowsDeflateBase64, "base64")).toString().trimEnd().split("\n").map(JSON.parse);
    records[1][1] = '<table:table-row a="first" a="last" b=\'single &amp; &#x41;\' c ="spaced" d="plain"><table:table-cell office:value-type="string" office:string-value="&quot;yes&quot;"/></table:table-row>';
    payload.rowsDeflateBase64 = deflateSync(Buffer.from(records.map(JSON.stringify).join("\n") + "\n")).toString("base64");
    const p2 = toPlain(await buildSheetPayloadModel(payload, adapter));
    const legacy = toPlain(await buildSheetPayloadModel(payload, new SheetAdapter(null), undefined, { legacy: true }));
    assert(JSON.stringify(p2) === JSON.stringify(legacy), "optimized attributes differ from legacy regex parser");
  });

  await test("attribute scanner equals the regex reference on random and malformed input", async () => {
    const alphabet = ["a", "b:c", "x-y", "_", "1", "=", "\"", "'", " ", "\n", "&amp;", "&#x41;", ">", "é", "=\"v\"", "='w'"];
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let n = 0; n < 4000; n++) {
      let s = "";
      for (let k = next() % 14; k > 0; k--) s += alphabet[next() % alphabet.length];
      const fast = JSON.stringify(__parseAttrsP2ForTest.fast(s));
      const regex = JSON.stringify(__parseAttrsP2ForTest.regex(s));
      assert(fast === regex, `attribute scan differs for ${JSON.stringify(s)}: ${fast} vs ${regex}`);
    }
  });
  return results;
}
