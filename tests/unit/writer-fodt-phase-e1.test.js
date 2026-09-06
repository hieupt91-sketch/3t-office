import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

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

const sessionBody = '<p>Gốc <ins data-vno-change="insert">mới</ins> <del data-vno-change="delete" contenteditable="false">cũ</del> còn.</p>';
const importedBody = '<p>Kính gửi Ban Giám đốc. Phòng kế toán đã hoàn thành <del data-vno-change="delete" contenteditable="false" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:16:00" title="Nguyen Van An (2026-09-05T08:16:00)">bản nháp nội bộ </del><ins data-vno-change="insert" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:15:00" title="Nguyen Van An (2026-09-05T08:15:00)">theo yêu cầu khẩn </ins>báo cáo quý III.</p>';

export async function runWriterFodtPhaseE1Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase E.1 serializes insert as text:change-start/end plus insertion region", () => {
    const { adapter } = adapterWithZones({
      body: '<p>Đề nghị phê duyệt <ins data-vno-change="insert">INSERT_ONLY_TEXT</ins> theo phương án đã thống nhất.</p>'
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /xmlns:dc="http:\/\/purl.org\/dc\/elements\/1.1\/"/);
    assert.match(fodt, /<text:tracked-changes><text:changed-region xml:id="ct1" text:id="ct1"><text:insertion><office:change-info><dc:date>1970-01-01T00:00:00<\/dc:date><\/office:change-info><\/text:insertion><\/text:changed-region><\/text:tracked-changes>/);
    assert.match(fodt, /<text:change-start text:change-id="ct1"\/>INSERT_ONLY_TEXT<text:change-end text:change-id="ct1"\/>/);
    assert.doesNotMatch(fodt, /<dc:creator>/);
    assert.doesNotMatch(fodt, /<text:change text:change-id="ct1"\/>/);
  });

  await test("Writer FODT Phase E.1 serializes delete as empty text:change plus deletion region", () => {
    const { adapter } = adapterWithZones({
      body: '<p>Nội dung còn lại <del data-vno-change="delete" contenteditable="false">DELETE_ONLY_TEXT</del>sau chỗ xóa.</p>'
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:changed-region xml:id="ct1" text:id="ct1"><text:deletion><office:change-info><dc:date>1970-01-01T00:00:00<\/dc:date><\/office:change-info><text:p>DELETE_ONLY_TEXT<\/text:p><\/text:deletion><\/text:changed-region>/);
    assert.match(fodt, /Nội dung còn lại <text:change text:change-id="ct1"\/>sau chỗ xóa\./);
    assert.doesNotMatch(fodt, /<text:change-start text:change-id="ct1"\/>DELETE_ONLY_TEXT/);
  });

  await test("Writer FODT Phase E.1 writes creator/date from data-vno-author/date into office:change-info", () => {
    const { adapter } = adapterWithZones({ body: importedBody });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /xml:id="ct1" text:id="ct1"><text:deletion><office:change-info><dc:creator>Nguyen Van An<\/dc:creator><dc:date>2026-09-05T08:16:00<\/dc:date><\/office:change-info><text:p>bản nháp nội bộ <\/text:p><\/text:deletion>/);
    assert.match(fodt, /xml:id="ct2" text:id="ct2"><text:insertion><office:change-info><dc:creator>Nguyen Van An<\/dc:creator><dc:date>2026-09-05T08:15:00<\/dc:date><\/office:change-info><\/text:insertion>/);
    assert.match(fodt, /<text:change text:change-id="ct1"\/><text:change-start text:change-id="ct2"\/>theo yêu cầu khẩn <text:change-end text:change-id="ct2"\/>/);
  });

  await test("Writer FODT Phase E.1 session insert/delete round-trip is exactly idempotent", () => {
    const initial = adapterWithZones({ body: sessionBody });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    parsed.adapter.parseFodt(first);
    assert.match(parsed.body.innerHTML, /<ins data-vno-change="insert">mới<\/ins>/);
    assert.match(parsed.body.innerHTML, /<del data-vno-change="delete" contenteditable="false">cũ<\/del>/);
    assert.doesNotMatch(parsed.body.innerHTML, /data-vno-author/);
    assert.doesNotMatch(parsed.body.innerHTML, /data-vno-date/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase E.1 imported author/date round-trip is exactly idempotent", () => {
    const initial = adapterWithZones({ body: importedBody });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    parsed.adapter.parseFodt(first);
    assert.match(parsed.body.innerHTML, /data-vno-change="insert"[^>]*data-vno-author="Nguyen Van An"/);
    assert.match(parsed.body.innerHTML, /data-vno-date="2026-09-05T08:15:00"/);
    assert.match(parsed.body.innerHTML, /data-vno-change="delete"[^>]*data-vno-author="Nguyen Van An"/);
    assert.match(parsed.body.innerHTML, /theo yêu cầu khẩn /);
    assert.match(parsed.body.innerHTML, /bản nháp nội bộ /);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase E.1 reuses inline formatting inside insert and delete", () => {
    const { adapter } = adapterWithZones({
      body: '<p>Có <ins data-vno-change="insert">chèn <strong>INSERT_BOLD</strong> chữ</ins> và <del data-vno-change="delete" contenteditable="false"><em>DELETE_ITALIC</em></del>.</p>'
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:change-start text:change-id="ct1"\/>chèn <text:span text:style-name="T1">INSERT_BOLD<\/text:span> chữ<text:change-end text:change-id="ct1"\/>/);
    assert.match(fodt, /<text:deletion><office:change-info><dc:date>1970-01-01T00:00:00<\/dc:date><\/office:change-info><text:p><text:span text:style-name="T2">DELETE_ITALIC<\/text:span><\/text:p><\/text:deletion>/);
    assert.match(fodt, /fo:font-weight="bold"/);
    assert.match(fodt, /fo:font-style="italic"/);
    const parsed = adapterWithZones({ body: "<p>x</p>" });
    parsed.adapter.parseFodt(fodt);
    assert.equal(parsed.adapter.serializeToFodt(), fodt);
  });

  await test("Writer FODT Phase E.1 documents without Track Changes do not emit xmlns:dc or tracked-changes", () => {
    const { adapter } = adapterWithZones({ body: "<p>Không có sửa đổi.</p>" });
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /xmlns:dc=/);
    assert.doesNotMatch(fodt, /text:tracked-changes/);
    assert.doesNotMatch(fodt, /text:changed-region/);
  });

  await test("Writer FODT Phase E.1 rejects nested track changes and notes inside ins/del", () => {
    const nested = adapterWithZones({
      body: '<p><ins data-vno-change="insert">a<del data-vno-change="delete">b</del></ins></p>'
    });
    assert.throws(() => nested.adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    const note = adapterWithZones({
      body: '<p><ins data-vno-change="insert">a<sup data-vno-footnote-ref="ftn1">1</sup></ins></p>'
    });
    assert.throws(() => note.adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase E.1 rejects Track Changes in header", () => {
    const { adapter } = adapterWithZones({
      body: "<p>Thân.</p>",
      header: '<p>Đầu <ins data-vno-change="insert">trang</ins></p>'
    });
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase E.1 rejects format-change and mismatched markers on parse without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ nguyên</p>" });
    const formatChange = '<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><text:tracked-changes><text:changed-region text:id="ct1"><text:format-change><office:change-info><dc:date>2026-09-06T10:20:00</dc:date></office:change-info></text:format-change></text:changed-region></text:tracked-changes><text:p>Chữ <text:change-start text:change-id="ct1"/>đậm<text:change-end text:change-id="ct1"/>.</text:p></office:text></office:body></office:document>';
    assert.throws(() => adapter.parseFodt(formatChange), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ nguyên</p>");
    const wrappedDelete = '<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><text:tracked-changes><text:changed-region text:id="ct1"><text:deletion><office:change-info><dc:date>2026-09-06T10:10:00</dc:date></office:change-info><text:p>xóa</text:p></text:deletion></text:changed-region></text:tracked-changes><text:p><text:change-start text:change-id="ct1"/>xóa<text:change-end text:change-id="ct1"/></text:p></office:text></office:body></office:document>';
    assert.throws(() => adapter.parseFodt(wrappedDelete), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ nguyên</p>");
  });

  return results;
}
