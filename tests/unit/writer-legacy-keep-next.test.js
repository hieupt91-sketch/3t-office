import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterLegacyKeepNextTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  test("DOCX import maps direct and inherited keepNext to body paragraphs", () => {
    const adapter = new WriterAdapter(null);
    const styles = '<w:styles><w:style w:styleId="Base"><w:pPr><w:keepNext/></w:pPr></w:style>'
      + '<w:style w:styleId="Child"><w:basedOn w:val="Base"/></w:style></w:styles>';
    const xml = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Child"/></w:pPr></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="Child"/><w:keepNext w:val="0"/></w:pPr></w:p>'
      + '<w:tbl><w:tr><w:tc><w:p><w:pPr><w:keepNext/></w:pPr></w:p></w:tc></w:tr></w:tbl>'
      + '<w:p><w:pPr><w:keepNext w:val="true"/></w:pPr></w:p></w:body></w:document>';
    const html = '<p>A</p><p>B</p><table><tr><td><p>Cell</p></td></tr></table><p>C</p>';

    const result = adapter._applyOoxmlKeepNextToHtml(html, xml, styles);

    assert.match(result, /<p data-vno-keep-next="true">A<\/p>/);
    assert.match(result, /<p>B<\/p>/);
    assert.match(result, /<table><tr><td><p>Cell<\/p><\/td><\/tr><\/table>/);
    assert.match(result, /<p data-vno-keep-next="true">C<\/p>/);
  });

  test("Print pagination moves a keepNext pair together when it cannot fit", () => {
    const adapter = new WriterAdapter(null);
    const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, "document");
    const priorDocument = globalThis.document;
    const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
    const priorWindow = globalThis.window;
    try {
      delete globalThis.document;
      delete globalThis.window;
      const pages = adapter.paginateContent(
        '<p>A</p><p data-vno-keep-next="true">B</p><p>C</p>',
        72,
        600,
      );
      assert.equal(pages.length, 2);
      assert.match(pages[0], /A/);
      assert.doesNotMatch(pages[0], /B|C/);
      assert.match(pages[1], /B/);
      assert.match(pages[1], /C/);
    } finally {
      if (hadDocument) globalThis.document = priorDocument;
      else delete globalThis.document;
      if (hadWindow) globalThis.window = priorWindow;
      else delete globalThis.window;
    }
  });

  test("Live pagination includes pixel rounding at the keepNext page edge", () => {
    const adapter = new WriterAdapter(null);
    assert.equal(adapter._keepNextGroupNeedsPageBreak(1691, 1917.8, 988.5, 991, 60), true);
    assert.equal(adapter._keepNextGroupNeedsPageBreak(1691, 1915, 988.5, 991, 60), false);
    assert.equal(adapter._keepNextGroupNeedsPageBreak(80, 1917.8, 988.5, 991, 60), false);
  });

  test("keepNext implementation attribute is removed from exported HTML", () => {
    const adapter = new WriterAdapter(null);
    assert.equal(adapter._stripSessionMarkup('<p data-vno-keep-next="true">A</p>'), "<p>A</p>");
  });

  return results;
}
