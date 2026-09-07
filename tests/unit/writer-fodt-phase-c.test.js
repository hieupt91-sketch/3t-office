import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function adapterWithZones({ body = "", header = null, footer = null, pageSetup, sections } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = header == null ? null : {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const footerEl = footer == null ? null : {
    innerHTML: footer,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const editor = {
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      if (selector === ".vno-writer-footer") return footerEl;
      return null;
    }
  };
  const adapter = new WriterAdapter(editor);
  if (pageSetup) {
    adapter.pageSetup = JSON.parse(JSON.stringify(pageSetup));
    adapter.sectionPageSetups["section-1"] = JSON.parse(JSON.stringify(pageSetup));
  }
  if (sections) {
    adapter.sectionPageSetups = JSON.parse(JSON.stringify(sections));
    adapter._sectionSequence = Math.max(
      ...Object.keys(sections).map(key => Number(String(key).replace(/^section-/, "")) || 1)
    );
  }
  return { adapter, body: bodyEl, header: headerEl, footer: footerEl };
}

const A4 = { size: "a4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 30, right: 15 } };
const LETTER_L = { size: "letter", orientation: "landscape", margins: { top: 25, bottom: 25, left: 25, right: 25 } };
const DL = { size: "dl", orientation: "portrait", margins: { top: 8, bottom: 8, left: 10, right: 10 } };

export async function runWriterFodtPhaseCTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase C serializes default A4 page-layout and Standard master-page", () => {
    const { adapter } = adapterWithZones({ body: "<p>Công văn</p>" });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<style:page-layout style:name="pm1">/);
    assert.match(fodt, /fo:page-width="21cm"/);
    assert.match(fodt, /fo:page-height="29.7cm"/);
    assert.match(fodt, /fo:margin-top="2cm"/);
    assert.match(fodt, /fo:margin-bottom="2cm"/);
    assert.match(fodt, /fo:margin-left="3cm"/);
    assert.match(fodt, /fo:margin-right="1.5cm"/);
    assert.match(fodt, /style:print-orientation="portrait"/);
    assert.match(fodt, /<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"><\/style:master-page><\/office:master-styles>/);
    assert.doesNotMatch(fodt, /<style:header>/);
    assert.doesNotMatch(fodt, /<style:footer>/);
  });

  await test("Writer FODT Phase C serializes Letter landscape from this.pageSetup, not from CSS @page", () => {
    const { adapter } = adapterWithZones({ body: "<p>Ngang</p>", pageSetup: LETTER_L });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /fo:page-width="27.9cm"/);
    assert.match(fodt, /fo:page-height="21.6cm"/);
    assert.match(fodt, /style:print-orientation="landscape"/);
    assert.match(fodt, /fo:margin-top="2.5cm"/);
    assert.match(fodt, /fo:margin-left="2.5cm"/);
  });

  await test("Writer FODT Phase C page setup round-trip is exactly idempotent", () => {
    const initial = adapterWithZones({ body: "<p>Trang</p>", pageSetup: LETTER_L });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    parsed.adapter.parseFodt(first);
    assert.deepEqual(parsed.adapter.pageSetup, LETTER_L);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase C envelope DL stays portrait even though width > height", () => {
    const { adapter } = adapterWithZones({ body: "<p>Phong bì</p>", pageSetup: DL });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /fo:page-width="22cm"/);
    assert.match(fodt, /fo:page-height="11cm"/);
    assert.match(fodt, /style:print-orientation="portrait"/);
    const parsed = adapterWithZones({ body: "<p>x</p>" });
    parsed.adapter.parseFodt(fodt);
    assert.equal(parsed.adapter.pageSetup.size, "dl");
    assert.equal(parsed.adapter.pageSetup.orientation, "portrait");
    assert.equal(parsed.adapter.serializeToFodt(), fodt);
  });

  await test("Writer FODT Phase C serializes header/footer via style:header/style:footer reusing paragraph XML", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Thân</p>",
      header: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Tiêu đề đầu trang</p>",
      footer: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>"
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<style:header><text:p text:style-name="P1"><text:span text:style-name="T1">Tiêu đề đầu trang<\/text:span><\/text:p><\/style:header>/);
    assert.match(fodt, /<style:footer><text:p text:style-name="P1"><text:span text:style-name="T1">Trang 1 \/ 1<\/text:span><\/text:p><\/style:footer>/);
    assert.match(fodt, /fo:text-align="center"/);
    assert.match(fodt, /fo:font-size="10pt"/);
  });

  await test("Writer FODT Phase C header/footer round-trip is exactly idempotent", () => {
    const initial = adapterWithZones({
      body: "<p>Thân</p>",
      header: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Công ty TNHH Sao Việt</p>",
      footer: "<p style='text-align: right; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>"
    });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>x</p>", header: "", footer: "" });
    parsed.adapter.parseFodt(first);
    assert.match(parsed.header.innerHTML, /Công ty TNHH Sao Việt/);
    assert.match(parsed.footer.innerHTML, /Trang 1 \/ 1/);
    assert.match(parsed.header.innerHTML, /text-align:center/);
    assert.match(parsed.footer.innerHTML, /text-align:right/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase C rejects table/image in header instead of dropping them", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Thân</p>",
      header: "<table><tr><td>Không</td></tr></table>"
    });
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase C accepts imported header page-number fields (skips unsupported header content)", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ nguyên</p>", header: "", footer: "" });
    const unsupported = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p>Trang <text:page-number/> / <text:page-count/></text:p></style:header></style:master-page>
</office:master-styles>
<office:body><office:text><text:p>Giữ nguyên</text:p></office:text></office:body>
</office:document>`;
    assert.doesNotThrow(() => adapter.parseFodt(unsupported), "parseFodt không được ném lỗi khi header chứa page-number field");
    assert.ok(body.innerHTML.includes("Giữ nguyên"), "Nội dung body phải được giữ lại");
  });

  await test("Writer FODT Phase C serializes mixed A4+envelope as two page-layouts and a paragraph master-page change", () => {
    const { adapter } = adapterWithZones({
      body: '<p>A4 trước</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>Phong bì sau</p>',
      sections: { "section-1": A4, "section-2": DL }
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<style:page-layout style:name="pm1">/);
    assert.match(fodt, /<style:page-layout style:name="pm2">/);
    assert.match(fodt, /fo:page-width="21cm"/);
    assert.match(fodt, /fo:page-width="22cm"/);
    assert.match(fodt, /fo:page-height="11cm"/);
    assert.match(fodt, /<style:master-page style:name="Standard" style:page-layout-name="pm1">/);
    assert.match(fodt, /<style:master-page style:name="section-2" style:page-layout-name="pm2">/);
    assert.match(fodt, /style:master-page-name="section-2"/);
    assert.match(fodt, /fo:break-before="page"/);
    assert.match(fodt, /<text:p>A4 trước<\/text:p><text:p text:style-name="P1">Phong bì sau<\/text:p>/);
    assert.doesNotMatch(fodt, /<text:p[^>]*style:master-page-name=/);
  });

  await test("Writer FODT Phase C mixed geometry round-trip is exactly idempotent and restores sectionPageSetups", () => {
    const initial = adapterWithZones({
      body: '<p>A4 trước</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>Phong bì sau</p>',
      header: "<p style='text-align: center; margin: 0;'>Đầu trang chung</p>",
      footer: "<p style='text-align: center; margin: 0;'>Chân trang chung</p>",
      sections: { "section-1": A4, "section-2": DL }
    });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>x</p>", header: "", footer: "" });
    parsed.adapter.parseFodt(first);
    assert.deepEqual(parsed.adapter.sectionPageSetups["section-1"], A4);
    assert.deepEqual(parsed.adapter.sectionPageSetups["section-2"], DL);
    assert.equal(parsed.adapter.pageSetup.size, "a4");
    assert.match(parsed.body.innerHTML, /data-vno-section-id="section-2"/);
    assert.match(parsed.header.innerHTML, /Đầu trang chung/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase C accepts different header content across master-pages (uses first master-page header)", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>", header: "", footer: "" });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
<style:page-layout style:name="pm2"><style:page-layout-properties fo:page-width="22cm" fo:page-height="11cm" fo:margin-top="0.8cm" fo:margin-bottom="0.8cm" fo:margin-left="1cm" fo:margin-right="1cm" style:print-orientation="portrait"/></style:page-layout>
<style:style style:name="P1" style:family="paragraph" style:master-page-name="section-2"><style:paragraph-properties fo:break-before="page"/></style:style>
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p>HEADER_A</text:p></style:header></style:master-page>
<style:master-page style:name="section-2" style:page-layout-name="pm2"><style:header><text:p>HEADER_B</text:p></style:header></style:master-page>
</office:master-styles>
<office:body><office:text><text:p>A4</text:p><text:p text:style-name="P1">ENV</text:p></office:text></office:body>
</office:document>`;
    assert.doesNotThrow(() => adapter.parseFodt(xml), "parseFodt không được ném lỗi khi header khác nhau giữa các master-page");
    assert.ok(body.innerHTML.includes("A4"), "Nội dung body phải được giữ lại");
  });

  return results;
}
