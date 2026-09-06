import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function adapterWithBody(innerHTML) {
  const body = { innerHTML };
  const editor = {
    innerHTML,
    querySelector(selector) {
      return selector === ".vno-writer-body" ? body : null;
    }
  };
  return { adapter: new WriterAdapter(editor), body };
}

export async function runWriterFodtPhaseATests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase A serializes native text structure and deterministic styles", () => {
    const { adapter } = adapterWithBody(
      '<h2>Tiêu đề</h2><p style="text-align:center">Một <strong>đoạn đậm</strong>, <em>nghiêng</em>, <u>gạch chân</u> và <span style="color:#123456;background-color:#ffeeaa;font-family:Liberation Serif;font-size:16px">có màu</span>.</p><ul><li>Bullet một</li><li>Bullet hai</li></ul><ol><li>Số một</li><li>Số hai</li></ol>'
    );
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /office:mimetype="application\/vnd\.oasis\.opendocument\.text"/);
    assert.match(fodt, /<office:body><office:text>/);
    assert.match(fodt, /<text:h text:outline-level="2">Tiêu đề<\/text:h>/);
    assert.match(fodt, /fo:text-align="center"/);
    assert.match(fodt, /fo:font-weight="bold"/);
    assert.match(fodt, /fo:font-style="italic"/);
    assert.match(fodt, /style:text-underline-style="solid"/);
    assert.match(fodt, /fo:color="#123456"/);
    assert.match(fodt, /fo:background-color="#ffeeaa"/);
    assert.match(fodt, /fo:font-family="Liberation Serif"/);
    assert.match(fodt, /fo:font-size="12pt"/);
    assert.match(fodt, /<text:list text:style-name="LBullet">/);
    assert.match(fodt, /<text:list text:style-name="LNumber">/);
  });

  await test("Writer FODT Phase A round-trip is exactly idempotent", () => {
    const initial = adapterWithBody('<p>Khoảng  trắng\tvà<br>dòng mới &amp; đúng.</p><p style="text-align:justify"><span style="font-weight:bold;color:rgb(18, 52, 86);font-size:14pt">Nội dung</span></p><ol><li>Một</li><li>Hai<ul><li>Con</li></ul></li></ol>');
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không được giữ</p>");
    const html = parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, html, "parseFodt must load canonical HTML into bodyDom");
    const second = parsed.adapter.serializeToFodt();
    assert.equal(second, first);
    assert.match(html, /Khoảng  trắng\tvà<br>dòng mới &amp; đúng\./);
  });

  await test("Writer FODT Phase A/B refuses out-of-scope Writer content without silent loss", () => {
    for (const html of [
      '<table><tr><td colspan="2">Dữ liệu</td></tr></table>',
      '<p><img src="data:image/jpeg;base64,AAAA"></p>',
      '<p>Nội dung<sup data-vno-footnote-ref="fn-1">1</sup></p>'
    ]) {
      const { adapter } = adapterWithBody(html);
      assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    }
  });

  await test("Writer FODT Phase A rejects unsupported imported structures before mutating body", () => {
    const { adapter, body } = adapterWithBody("<p>Giữ nguyên</p>");
    const unsupported = '<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><table:table><table:table-row/></table:table></office:text></office:body></office:document>';
    assert.throws(() => adapter.parseFodt(unsupported), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ nguyên</p>");
  });

  return results;
}
