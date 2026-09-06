import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";

function adapterWithZones({ body = "", header = null } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = header == null ? null : {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const editor = {
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  };
  const adapter = new WriterAdapter(editor);
  return { adapter, body: bodyEl, header: headerEl };
}

function wrapFodt({ automatic = "", master, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>${automatic}</office:automatic-styles>
<office:master-styles>${master}</office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

const a4Layout = `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>`;
const graphic = `<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="solid" svg:stroke-color="#ffffff" svg:stroke-width="0.053cm"/></style:style>`;
const textStyle = `<style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold" fo:color="#1e3a8a" fo:font-family="Impact" fo:font-size="36pt"/></style:style>`;

function fontworkBody({ name = "WordArt-navy-outline", type = "fontwork-plain-text", text = "KHAI_GIANG" } = {}) {
  return `<text:p>Truoc <draw:custom-shape draw:style-name="gr1" draw:name="${name}" text:anchor-type="as-char" svg:width="10cm" svg:height="2.2cm"><text:p><text:span text:style-name="T1">${text}</text:span></text:p><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-mode="shape" draw:type="${type}" draw:enhanced-path="M 0 10800 L 21600 10800 Z N"/></draw:custom-shape> sau.</text:p>`;
}

export async function runWriterFodtPhaseE3WordArtTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase E.3 serializes WordArt as Fontwork fontwork-fade-right as-char", () => {
    const html = `<p>Truoc ${buildWriterWordArtHtml("KHAI_GIANG", { presetId: "navy-outline" })} sau.</p>`;
    const { adapter } = adapterWithZones({ body: html });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:name="WordArt-navy-outline"/);
    assert.match(fodt, /text:anchor-type="as-char"/);
    assert.match(fodt, /draw:type="fontwork-fade-right"/);
    assert.match(fodt, /draw:text-path="true"/);
    assert.match(fodt, /draw:enhanced-path="M 0 10800 L 21600 10800 Z N"/);
    assert.match(fodt, />KHAI_GIANG</);
    assert.match(fodt, /draw:fill-color="#1e3a8a"/);
    assert.match(fodt, /draw:stroke="none"/);
    assert.match(fodt, /fo:font-family="Impact"/);
    assert.doesNotMatch(fodt, /draw:type="fontwork-plain-text"/);
    assert.doesNotMatch(fodt, /draw:type="fontwork-wave"/);
    assert.doesNotMatch(fodt, /vno:wordart/);
  });

  await test("Writer FODT Phase E.3 gradient preset uses gradient.from as Fontwork fill", () => {
    const html = `<p>${buildWriterWordArtHtml("BIEN", { presetId: "ocean-gradient" })}</p>`;
    const { adapter } = adapterWithZones({ body: html });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:name="WordArt-ocean-gradient"/);
    assert.match(fodt, /draw:fill-color="#38bdf8"/);
    assert.match(fodt, />BIEN</);
  });

  await test("Writer FODT Phase E.3 WordArt round-trip is exactly idempotent", () => {
    const html = `<p>Truoc ${buildWriterWordArtHtml("KHAI_GIANG", { presetId: "navy-outline" })} sau.</p>`;
    const initial = adapterWithZones({ body: html });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    const out = parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, out);
    assert.match(parsed.body.innerHTML, /data-vno-wordart="true"/);
    assert.match(parsed.body.innerHTML, /data-vno-wordart-preset="navy-outline"/);
    assert.match(parsed.body.innerHTML, /KHAI_GIANG/);
    assert.equal(parsed.adapter.shapes.length, 0);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase E.3 parse Fontwork without VN name as default navy-outline WordArt, not this.shapes", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>xóa</p>" });
    adapter.parseFodt(wrapFodt({
      automatic: `${a4Layout}${graphic}${textStyle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: fontworkBody({ name: "WordArt 2", text: "WORDART_BODY_VML" })
    }));
    assert.match(body.innerHTML, /data-vno-wordart="true"/);
    assert.match(body.innerHTML, /data-vno-wordart-preset="navy-outline"/);
    assert.match(body.innerHTML, /WORDART_BODY_VML/);
    assert.equal(adapter.shapes.length, 0);
  });

  await test("Writer FODT Phase E.3 parse fontwork-wave keeps the letters as WordArt HTML", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>xóa</p>" });
    adapter.parseFodt(wrapFodt({
      automatic: `${a4Layout}${graphic}${textStyle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: fontworkBody({ name: "WordArtWave", type: "fontwork-wave", text: "WORDART_WAVE" })
    }));
    assert.match(body.innerHTML, /WORDART_WAVE/);
    assert.match(body.innerHTML, /data-vno-wordart="true"/);
    assert.equal(adapter.shapes.length, 0);
  });

  await test("Writer FODT Phase E.3 documents without WordArt do not emit Fontwork", () => {
    const { adapter } = adapterWithZones({ body: "<p>Không chữ nghệ thuật</p>" });
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /fontwork-plain-text/);
    assert.doesNotMatch(fodt, /draw:text-path="true"/);
    assert.doesNotMatch(fodt, /WordArt-/);
  });

  await test("Writer FODT Phase E.3 rejects WordArt in header without mutating body", () => {
    const html = `<p>${buildWriterWordArtHtml("HEADER_WA", { presetId: "gold-outline" })}</p>`;
    const { adapter, body } = adapterWithZones({
      body: "<p>Giữ</p>",
      header: html
    });
    assert.throws(() => adapter.serializeToFodt(), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /header\/footer/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
  });

  await test("Writer FODT Phase E.3 rejects unknown WordArt preset without mutating body", () => {
    const { adapter, body } = adapterWithZones({
      body: '<p><span class="vno-writer-wordart" data-vno-wordart="true" data-vno-wordart-preset="microsoft-glow" data-vno-wordart-text="X"><span class="vno-wordart-text">X</span></span></p>'
    });
    assert.throws(() => adapter.serializeToFodt(), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /preset/.test(error.message)
    ));
    assert.match(body.innerHTML, /microsoft-glow/);
  });

  await test("Writer FODT Phase E.3 rejects non-arrow non-fontwork custom-shape without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}${graphic}${textStyle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: `<text:p><draw:custom-shape draw:style-name="gr1" draw:name="Star" text:anchor-type="as-char" svg:width="2cm" svg:height="2cm"><text:p/><draw:enhanced-geometry draw:type="star6" draw:enhanced-path="M 0 0 L 1 1 Z"/></draw:custom-shape></text:p>`
    });
    assert.throws(() => adapter.parseFodt(xml), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /star6/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
    assert.equal(adapter.shapes.length, 0);
  });

  await test("Writer FODT Phase E.3 still serializes B.2 right-arrow as this.shapes, not WordArt", () => {
    const { adapter } = adapterWithZones({ body: "<p>Mũi tên</p>" });
    adapter.shapes = [{
      id: "shape-arrow",
      type: "arrow",
      x: 10, y: 20, w: 140, h: 70,
      fill: "#f59e0b",
      stroke: "#d97706",
      strokeWidth: 2
    }];
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:type="right-arrow"/);
    assert.doesNotMatch(fodt, /fontwork-plain-text/);
    const parsed = adapterWithZones({ body: "<p>x</p>" });
    parsed.adapter.parseFodt(fodt);
    assert.equal(parsed.adapter.shapes[0].type, "arrow");
    assert.doesNotMatch(parsed.body.innerHTML, /data-vno-wordart/);
  });

  return results;
}
