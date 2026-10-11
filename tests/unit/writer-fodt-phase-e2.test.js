import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function adapterWithZones({ body = "", header = null, watermark = null, sections } = {}) {
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
  if (watermark) adapter.watermark = JSON.parse(JSON.stringify(watermark));
  if (sections) {
    adapter.sectionPageSetups = JSON.parse(JSON.stringify(sections));
    adapter._sectionSequence = Math.max(
      ...Object.keys(sections).map(key => Number(String(key).replace(/^section-/, "")) || 1)
    );
  }
  return { adapter, body: bodyEl, header: headerEl };
}

const ROTATE_45 = (45 * Math.PI / 180).toFixed(15);
const ROTATE_NEG45 = (-45 * Math.PI / 180).toFixed(15);
const defaultWm = { text: "DỰ THẢO", color: "#dc2626", opacity: 0.2, angle: 45, fontSize: 72 };

function wrapFodt({ automatic = "", master, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>${automatic}</office:automatic-styles>
<office:master-styles>${master}</office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

const a4Layout = `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>`;

export async function runWriterFodtPhaseE2Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase E.2 serializes text watermark as header draw:frame/text-box with rotate(45)", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Công văn mật</p>",
      watermark: defaultWm
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<style:style style:name="grWm" style:family="graphic">/);
    assert.match(fodt, /draw:opacity="20%"/);
    assert.match(fodt, /style:wrap="run-through"/);
    assert.match(fodt, /style:run-through="background"/);
    assert.match(fodt, /style:vertical-rel="page"/);
    assert.match(fodt, /style:horizontal-rel="page"/);
    assert.match(fodt, /<style:header><text:p><draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm" draw:transform="rotate \(0\.785398163397448\)">/);
    assert.match(fodt, /<draw:text-box><text:p><text:span text:style-name="T1">DỰ THẢO<\/text:span><\/text:p><\/draw:text-box>/);
    assert.match(fodt, /fo:color="#dc2626"/);
    assert.match(fodt, /fo:font-size="72pt"/);
    assert.doesNotMatch(fodt, /<style:background-image\b/);
    assert.doesNotMatch(fodt, /PowerPlusWaterMark/);
    assert.doesNotMatch(fodt, /svg:transform=/);
  });

  await test("Writer FODT Phase E.2 omits draw:transform at angle 0 and uses negative radians at -45", () => {
    const zero = adapterWithZones({
      body: "<p>Ngang</p>",
      watermark: { ...defaultWm, angle: 0, text: "BẢN SAO" }
    });
    const zeroFodt = zero.adapter.serializeToFodt();
    assert.match(zeroFodt, /draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm"><draw:text-box>/);
    assert.doesNotMatch(zeroFodt, /draw:transform=/);
    assert.match(zeroFodt, />BẢN SAO</);

    const neg = adapterWithZones({
      body: "<p>Chéo kia</p>",
      watermark: { ...defaultWm, angle: -45, text: "KHẨN" }
    });
    const negFodt = neg.adapter.serializeToFodt();
    assert.match(negFodt, new RegExp(`draw:transform="rotate \\(${ROTATE_NEG45.replace("-", "\\-")}\\)"`));
    assert.match(negFodt, />KHẨN</);
    assert.equal(ROTATE_45, "0.785398163397448");
  });

  await test("Writer FODT Phase E.2 writes color, opacity and fontSize from this.watermark", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Nội dung</p>",
      watermark: { text: "MẬT", color: "#94a3b8", opacity: 0.35, angle: 45, fontSize: 60 }
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:opacity="35%"/);
    assert.match(fodt, /fo:color="#94a3b8"/);
    assert.match(fodt, /fo:font-size="60pt"/);
    assert.match(fodt, />MẬT</);
  });

  await test("Writer FODT Phase E.2 watermark round-trip is exactly idempotent", () => {
    const initial = adapterWithZones({
      body: "<p>Thân công văn</p>",
      header: "<p style='text-align: center;'>Công ty TNHH Sao Việt</p>",
      watermark: defaultWm
    });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>", header: "<p>cũ</p>" });
    parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, "<p>Thân công văn</p>");
    assert.match(parsed.header.innerHTML, /Công ty TNHH Sao Việt/);
    assert.doesNotMatch(parsed.header.innerHTML, /DỰ THẢO/);
    assert.deepEqual(parsed.adapter.watermark, {
      text: "DỰ THẢO",
      color: "#dc2626",
      opacity: 0.2,
      angle: 45,
      fontSize: 72
    });
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase E.2 keeps user header beside the watermark frame", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Body</p>",
      header: "<p>HEADER_USER_TEXT</p>",
      watermark: { ...defaultWm, text: "DU_THAO_WITH_HF" }
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<style:header><text:p><draw:frame draw:style-name="grWm" draw:name="Watermark"/);
    assert.match(fodt, /<\/draw:frame><\/text:p><text:p>HEADER_USER_TEXT<\/text:p><\/style:header>/);
  });

  await test("Writer FODT Phase E.2 documents without watermark do not emit grWm or Watermark frame", () => {
    const { adapter } = adapterWithZones({ body: "<p>Không hình mờ</p>" });
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /style:name="grWm"/);
    assert.doesNotMatch(fodt, /draw:name="Watermark"/);
    assert.doesNotMatch(fodt, /<style:header>/);
    assert.doesNotMatch(fodt, /<style:background-image\b/);
  });

  await test("Writer FODT Phase E.2 rejects page-layout background-image without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"><style:background-image xlink:href="" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" style:repeat="no-repeat"><office:binary-data>AAAA</office:binary-data></style:background-image></style:page-layout-properties></style:page-layout>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: "<text:p>Ảnh nền</text:p>"
    });
    assert.throws(() => adapter.parseFodt(xml), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /background-image/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
    assert.equal(adapter.watermark, null);
  });

  await test("Writer FODT Phase E.2 rejects non-watermark drawings in header without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:fill="none" draw:stroke="none"/></style:style>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p><draw:frame draw:style-name="gr1" draw:name="Logo" text:anchor-type="paragraph" svg:width="2cm" svg:height="1cm"><draw:text-box><text:p>LOGO</text:p></draw:text-box></draw:frame></text:p></style:header></style:master-page>`,
      body: "<text:p>Logo</text:p>"
    });
    assert.throws(() => adapter.parseFodt(xml), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ</p>");
    assert.equal(adapter.watermark, null);
  });

  await test("Writer FODT Phase E.2 accepts different watermarks across master-pages (uses first master-page watermark)", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}<style:page-layout style:name="pm2"><style:page-layout-properties fo:page-width="22cm" fo:page-height="11cm" fo:margin-top="0.8cm" fo:margin-bottom="0.8cm" fo:margin-left="1cm" fo:margin-right="1cm" style:print-orientation="portrait"/></style:page-layout>
<style:style style:name="grWm" style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="none" draw:opacity="20%" style:wrap="run-through" style:run-through="background" style:vertical-pos="middle" style:vertical-rel="page" style:horizontal-pos="center" style:horizontal-rel="page" style:flow-with-text="false"/></style:style>
<style:style style:name="T1" style:family="text"><style:text-properties fo:color="#dc2626" fo:font-size="72pt" fo:font-weight="bold"/></style:style>
<style:style style:name="P1" style:family="paragraph" style:master-page-name="section-2"><style:paragraph-properties fo:break-before="page"/></style:style>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p><draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm"><draw:text-box><text:p><text:span text:style-name="T1">DỰ THẢO</text:span></text:p></draw:text-box></draw:frame></text:p></style:header></style:master-page>
<style:master-page style:name="section-2" style:page-layout-name="pm2"><style:header><text:p><draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm"><draw:text-box><text:p><text:span text:style-name="T1">MẬT</text:span></text:p></draw:text-box></draw:frame></text:p></style:header></style:master-page>`,
      body: `<text:p>A4</text:p><text:p text:style-name="P1">ENV</text:p>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml), "parseFodt không được ném lỗi khi watermark khác nhau giữa các master-page");
    assert.ok(body.innerHTML.includes("A4"), "Nội dung body phải được giữ lại");
  });

  await test("Writer FODT Phase E.2 parses Word Fontwork PowerPlusWaterMark header into this.watermark", () => {
    const { adapter } = adapterWithZones({ body: "<p>cũ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:stroke="none" draw:fill="solid" draw:fill-color="#c0c0c0" draw:opacity="50%" style:wrap="run-through" style:run-through="background" style:vertical-pos="middle" style:vertical-rel="page-content" style:horizontal-pos="center" style:horizontal-rel="page-content" style:flow-with-text="false"/></style:style>
<style:style style:name="P1" style:family="paragraph"><style:text-properties fo:font-size="1pt"/></style:style>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p><draw:custom-shape text:anchor-type="char" draw:name="PowerPlusWaterMarkObject357476642" draw:style-name="gr1" svg:width="18.622cm" svg:height="2.227cm" draw:transform="rotate (0.785398163397448) translate (0.589cm 18.106cm)"><text:p text:style-name="P1">CONFIDENTIAL_VML</text:p><draw:enhanced-geometry draw:text-path="true" draw:type="fontwork-plain-text" svg:viewBox="0 0 21600 21600"/></draw:custom-shape></text:p></style:header></style:master-page>`,
      body: "<text:p>BODY_TEXT_BEHIND_WORD_WATERMARK</text:p>"
    });
    adapter.parseFodt(xml);
    assert.equal(adapter.watermark?.text, "CONFIDENTIAL_VML");
    assert.equal(adapter.watermark?.color, "#c0c0c0");
    assert.equal(adapter.watermark?.opacity, 0.5);
    assert.equal(adapter.watermark?.angle, 45);
    assert.equal(adapter.watermark?.fontSize, 72);
    assert.match(adapter.serializeToFodt(), /draw:name="Watermark"/);
    assert.match(adapter.serializeToFodt(), />CONFIDENTIAL_VML</);
  });

  return results;
}
