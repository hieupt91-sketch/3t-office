/**
 * Hai lỗi thật phát hiện khi kiểm tra vòng chuyển đổi DOCX thật (FODT -> soffice
 * DOCX thật -> soffice FODT thật -> parseFodt()), không phải tự-round-trip nội
 * bộ của VN Office. parseFodt() hiện chưa nằm trên luồng Mở file thật production
 * (main.py dùng target_ext="html" cho Writer, không phải "fodt") nhưng LÀ hạ
 * tầng kiểm thử cốt lõi mà toàn bộ các bài test Phase A-E dựa vào để xác nhận
 * serializeToFodt()/parseFodt() round-trip đúng - một lỗi ẩn ở đây có thể khiến
 * cả bộ test tự-round-trip "may mắn" chưa từng chạm phải, và sẽ chặn bất kỳ
 * tính năng tương lai nào thật sự dùng parseFodt() để mở file ODF/DOCX thật.
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

// Rút gọn từ một FODT THẬT do LibreOffice tạo ra khi convert DOCX -> FODT:
// có một <style:page-layout-properties> đứng LẺ (không phải con của page-layout
// nào, style của một style:style khác) TRƯỚC block <style:page-layout style:name="pm1">
// thật - đúng thứ tự LibreOffice thật hay ghi ra, khác với FODT tự viết tay
// hoặc do chính VN Office serializeToFodt() phát ra.
function realDocxFodt({ orientation = "landscape", extraBoilerplate = true, sequenceDecls = true } = {}) {
  const boilerplate = extraBoilerplate
    ? `<style:style style:name="Standard" style:family="paragraph"><style:page-layout-properties style:layout-grid-standard-mode="true"/></style:style>`
    : "";
  const seq = sequenceDecls
    ? `<text:sequence-decls><text:sequence-decl text:display-outline-level="0" text:name="Illustration"/><text:sequence-decl text:display-outline-level="0" text:name="Table"/></text:sequence-decls>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.text">
 <office:automatic-styles>
  ${boilerplate}
  <style:page-layout style:name="pm1">
   <style:page-layout-properties fo:page-width="${orientation === "landscape" ? "27.94cm" : "21.59cm"}" fo:page-height="${orientation === "landscape" ? "21.59cm" : "27.94cm"}" style:print-orientation="${orientation}" fo:margin-top="2.5cm" fo:margin-bottom="2.5cm" fo:margin-left="3.2cm" fo:margin-right="1.8cm"/>
  </style:page-layout>
 </office:automatic-styles>
 <office:master-styles>
  <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
 </office:master-styles>
 <office:body>
  <office:text>
   ${seq}
   <text:p>Noi dung van ban DOCX that</text:p>
  </office:text>
 </office:body>
</office:document>`;
}

export async function runWriterFodtRealDocxParsingTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  await test("_fodtParsePageLayouts: không bị nhầm <style:page-layout-properties> đứng lẻ trước đó là <style:page-layout>", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = realDocxFodt({ orientation: "landscape", extraBoilerplate: true });
    const layouts = adapter._fodtParsePageLayouts(xml);
    assert.ok(layouts.has("pm1"), "Map phải chứa pm1 dù có style:page-layout-properties đứng lẻ trước đó");
    assert.equal(layouts.get("pm1").orientation, "landscape", "orientation đọc được phải đúng landscape");
  });

  await test("parseFodt: file thật có style:page-layout-properties đứng lẻ trước layout thật không bị báo lỗi 'master-page không biết'", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = realDocxFodt({ orientation: "landscape", extraBoilerplate: true });
    assert.doesNotThrow(() => adapter.parseFodt(xml), "parseFodt không được ném lỗi khi master-page tham chiếu đúng một page-layout thật sự tồn tại");
    assert.equal(adapter.pageSetup.orientation, "landscape", `orientation sai: ${adapter.pageSetup.orientation}`);
    assert.equal(adapter.pageSetup.size, "letter", `size sai: ${adapter.pageSetup.size}`);
  });

  await test("parseFodt: vẫn báo lỗi rõ ràng khi master-page tham chiếu MỘT page-layout THẬT SỰ không tồn tại (không nuốt lỗi thật)", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = realDocxFodt({ orientation: "landscape", extraBoilerplate: false }).replace(
      `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      `<style:master-page style:name="Standard" style:page-layout-name="pm-khong-ton-tai"/>`
    );
    assert.throws(() => adapter.parseFodt(xml), /không biết/, "Vẫn phải báo lỗi thật khi layout thực sự không tồn tại, không được im lặng bỏ qua");
  });

  await test("parseFodt: bỏ qua text:sequence-decls (khai báo chú thích chuẩn LibreOffice luôn ghi ra) thay vì báo lỗi chưa hỗ trợ", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = realDocxFodt({ sequenceDecls: true });
    adapter.parseFodt(xml);
    assert.ok(adapter.bodyDom.innerHTML.includes("Noi dung van ban DOCX that"), "Nội dung văn bản thật vẫn phải được giữ nguyên");
    assert.ok(!adapter.bodyDom.innerHTML.includes("sequence-decl"), "text:sequence-decls không được lọt vào nội dung hiển thị");
  });

  await test("parseFodt: tài liệu không có text:sequence-decls vẫn hoạt động bình thường (không phụ thuộc ngược vào nó)", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const xml = realDocxFodt({ sequenceDecls: false });
    assert.doesNotThrow(() => adapter.parseFodt(xml));
    assert.ok(adapter.bodyDom.innerHTML.includes("Noi dung van ban DOCX that"));
  });

  return results;
}
