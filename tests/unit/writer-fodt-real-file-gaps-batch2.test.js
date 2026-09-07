/**
 * Unit tests cho 3 lỗi thật phát hiện khi kiểm tra file .doc thật của người dùng:
 * 1. Header/footer khác nhau giữa các master-page — giờ dùng master-page[0] cho tất cả
 * 2. table:table-cell nhiều text:p — giờ chấp nhận nhiều đoạn
 * 3. draw:connector inline — giờ xử lý giống draw:line
 *
 * File thực tế bổ sung trong tests/live/writer-fodt-real-doc-files-batch2.mjs
 */
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

function wrapFodt({ master, body, automatic = "" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
${automatic}
</office:automatic-styles>
<office:master-styles>
${master}
</office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

export async function runWriterFodtRealFileGapsBatch2Tests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  await test("Lỗi 1: Header/footer khác nhau giữa master-page không ném lỗi (dùng master-page[0])", () => {
    const { adapter, body } = adapterWithBody("<p>Giữ</p>");
    const xml = wrapFodt({
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:header><text:p>HEADER_A</text:p></style:header></style:master-page>
<style:master-page style:name="section-2" style:page-layout-name="pm1"><style:header><text:p>HEADER_B</text:p></style:header></style:master-page>`,
      body: `<text:p>Nội dung chính</text:p>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml), "parseFodt không được ném lỗi khi header khác nhau");
    assert.ok(body.innerHTML.includes("Nội dung chính"), "Nội dung body phải được giữ");
  });

  await test("Lỗi 1: Footer khác nhau giữa master-page không ném lỗi", () => {
    const { adapter, body } = adapterWithBody("<p>Giữ</p>");
    const xml = wrapFodt({
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"><style:footer><text:p>FOOTER_A</text:p></style:footer></style:master-page>
<style:master-page style:name="section-2" style:page-layout-name="pm1"><style:footer><text:p>FOOTER_B</text:p></style:footer></style:master-page>`,
      body: `<text:p>Nội dung chính</text:p>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml), "parseFodt không được ném lỗi khi footer khác nhau");
    assert.ok(body.innerHTML.includes("Nội dung chính"), "Nội dung body phải được giữ");
  });

  await test("Lỗi 2: table:table-cell với nhiều text:p render tất cả", () => {
    const { adapter, body } = adapterWithBody("<p>x</p>");
    const xml = wrapFodt({
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: `<table:table><table:table-row><table:table-cell><text:p>Dòng 1</text:p><text:p>Dòng 2</text:p><text:p>Dòng 3</text:p></table:table-cell></table:table-row></table:table>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml));
    assert.ok(body.innerHTML.includes("Dòng 1"), "Phải có dòng 1");
    assert.ok(body.innerHTML.includes("Dòng 2"), "Phải có dòng 2");
    assert.ok(body.innerHTML.includes("Dòng 3"), "Phải có dòng 3");
  });

  await test("Lỗi 2: table:table-cell với text:h cũng chấp nhận", () => {
    const { adapter, body } = adapterWithBody("<p>x</p>");
    const xml = wrapFodt({
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: `<table:table><table:table-row><table:table-cell><text:h text:outline-level="1">Tiêu đề ô</text:h><text:p>Nội dung</text:p></table:table-cell></table:table-row></table:table>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml));
    assert.ok(body.innerHTML.includes("Tiêu đề ô"), "Phải có tiêu đề ô");
    assert.ok(body.innerHTML.includes("Nội dung"), "Phải có nội dung");
  });

  await test("Lỗi 3: draw:connector trong inline render thành shape type line", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = wrapFodt({
      automatic: `<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:stroke="solid" draw:stroke-color="#000000" draw:stroke-width="0.02cm" draw:fill="none"/></style:style>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: `<text:p><draw:connector draw:style-name="gr1" draw:name="Conn1" svg:x1="1cm" svg:y1="2cm" svg:x2="5cm" svg:y2="3cm" svg:width="4cm" svg:height="1cm"/></text:p>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml));
    const connector = adapter.shapes.find(s => s.id === "Conn1");
    assert.ok(connector, "Phải parse được draw:connector");
    assert.equal(connector.type, "line", "Connector phải có type 'line'");
    assert.equal(connector.shapeType, "line", "Connector phải có shapeType 'line'");
  });

  await test("Lỗi 3: draw:connector có svg:x1/y1/x2/y2 được convert đúng tọa độ", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = wrapFodt({
      automatic: `<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:stroke="solid" draw:stroke-color="#000000" draw:stroke-width="0.02cm" draw:fill="none"/></style:style>`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: `<text:p><draw:connector draw:style-name="gr1" draw:name="Conn2" svg:x1="0cm" svg:y1="0cm" svg:x2="3cm" svg:y2="4cm" svg:width="3cm" svg:height="4cm"/></text:p>`
    });
    assert.doesNotThrow(() => adapter.parseFodt(xml));
    const conn = adapter.shapes.find(s => s.id === "Conn2");
    assert.ok(conn);
    assert.equal(conn.type, "line");
    assert.ok(conn.w > 0, "width phải > 0");
    assert.ok(conn.h > 0, "height phải > 0");
  });

  return results;
}
