import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function adapterWithZones({ body = "", header = null, footer = null, comments = [] } = {}) {
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
  adapter.comments = comments.map(item => ({ ...item }));
  return { adapter, body: bodyEl, header: headerEl, footer: footerEl };
}

function footnoteHtml({
  before = "Căn cứ Nghị định 15/2021/NĐ-CP",
  after = " về quản lý đầu tư xây dựng.",
  id = "ftn1",
  citation = "1",
  text = "Nghị định này có hiệu lực từ ngày 03 tháng 3 năm 2021."
} = {}) {
  return `<p>${before}<sup data-vno-footnote-ref="${id}" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">${citation}</sup>${after}</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="${id}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${citation}</span><span class="vno-note-text" contenteditable="true">${text}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div>`;
}

function endnoteHtml({
  before = "Kết luận kèm phụ lục kỹ thuật",
  after = " được lưu tại hồ sơ gốc.",
  id = "edn1",
  citation = "i",
  text = "Phụ lục kỹ thuật gồm bản vẽ mặt cắt Đăk Bla."
} = {}) {
  return `<p>${before}<sup data-vno-endnote-ref="${id}" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">${citation}</sup>${after}</p><div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div><div class="vno-endnote-item" data-vno-endnote-id="${id}"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">${citation}</span><span class="vno-note-text" contenteditable="true">${text}</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div>`;
}

export async function runWriterFodtPhaseDTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase D serializes footnote as text:note with citation and note-body", () => {
    const { adapter } = adapterWithZones({ body: footnoteHtml() });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<office:styles><text:notes-configuration text:note-class="footnote" style:num-format="1"/);
    assert.match(fodt, /<text:notes-configuration text:note-class="endnote" style:num-format="i"/);
    assert.match(fodt, /<text:note text:id="ftn1" text:note-class="footnote"><text:note-citation>1<\/text:note-citation><text:note-body><text:p>Nghị định này có hiệu lực từ ngày 03 tháng 3 năm 2021\.<\/text:p><\/text:note-body><\/text:note>/);
    assert.doesNotMatch(fodt, /vno-writer-footnotes-container/);
    assert.doesNotMatch(fodt, /vno-note-delete-btn/);
  });

  await test("Writer FODT Phase D serializes endnote as text:note-class=endnote with Roman citation", () => {
    const { adapter } = adapterWithZones({ body: endnoteHtml() });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:note text:id="edn1" text:note-class="endnote"><text:note-citation>i<\/text:note-citation><text:note-body><text:p>Phụ lục kỹ thuật gồm bản vẽ mặt cắt Đăk Bla\.<\/text:p><\/text:note-body><\/text:note>/);
    assert.doesNotMatch(fodt, /CHÚ THÍCH CUỐI TÀI LIỆU/);
  });

  await test("Writer FODT Phase D serializes mixed footnotes and endnote in document order", () => {
    const body = `<p>Căn cứ Nghị định 15/2021/NĐ-CP<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup> và Thông tư 10/2021/TT-BXD<sup data-vno-footnote-ref="ftn2" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">2</sup>.</p><p>Kết luận kèm phụ lục kỹ thuật<sup data-vno-endnote-ref="edn1" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">i</sup>.</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-num">1</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_ONE Nghị định 15/2021.</span><button type="button" class="vno-note-delete-btn">&times;</button></div><div class="vno-footnote-item" data-vno-footnote-id="ftn2"><span class="vno-note-num">2</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_TWO Thông tư 10/2021.</span><button type="button" class="vno-note-delete-btn">&times;</button></div></div><div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div><div class="vno-endnote-item" data-vno-endnote-id="edn1"><span class="vno-note-num">i</span><span class="vno-note-text" contenteditable="true">ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla.</span><button type="button" class="vno-note-delete-btn">&times;</button></div></div>`;
    const { adapter } = adapterWithZones({ body });
    const fodt = adapter.serializeToFodt();
    const first = fodt.indexOf('text:id="ftn1"');
    const second = fodt.indexOf('text:id="ftn2"');
    const third = fodt.indexOf('text:id="edn1"');
    assert.ok(first >= 0 && second > first && third > second, "notes must follow document order");
    assert.match(fodt, /text:note-class="footnote"><text:note-citation>1<\/text:note-citation><text:note-body><text:p>FOOTNOTE_ONE Nghị định 15\/2021\.<\/text:p>/);
    assert.match(fodt, /text:note-class="endnote"><text:note-citation>i<\/text:note-citation><text:note-body><text:p>ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla\.<\/text:p>/);
  });

  await test("Writer FODT Phase D footnote/endnote round-trip is exactly idempotent", () => {
    const body = `<p>Căn cứ Nghị định 15/2021/NĐ-CP<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup> và Thông tư 10/2021/TT-BXD<sup data-vno-footnote-ref="ftn2" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">2</sup>.</p><p>Kết luận kèm phụ lục kỹ thuật<sup data-vno-endnote-ref="edn1" class="vno-endnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích cuối">i</sup>.</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">1</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_ONE Nghị định 15/2021.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div><div class="vno-footnote-item" data-vno-footnote-id="ftn2"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">2</span><span class="vno-note-text" contenteditable="true">FOOTNOTE_TWO Thông tư 10/2021.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div><div data-vno-endnotes="true" class="vno-writer-endnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-notes-title">CHÚ THÍCH CUỐI TÀI LIỆU</div><div class="vno-endnote-item" data-vno-endnote-id="edn1"><span class="vno-note-num" title="Chuyển tới vị trí tham chiếu">i</span><span class="vno-note-text" contenteditable="true">ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla.</span><button type="button" class="vno-note-delete-btn" title="Xóa chú thích">&times;</button></div></div>`;
    const initial = adapterWithZones({ body });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    parsed.adapter.parseFodt(first);
    assert.match(parsed.body.innerHTML, /data-vno-footnote-ref="ftn1"/);
    assert.match(parsed.body.innerHTML, /data-vno-endnote-ref="edn1"/);
    assert.match(parsed.body.innerHTML, /FOOTNOTE_ONE Nghị định 15\/2021\./);
    assert.match(parsed.body.innerHTML, /ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla\./);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase D reuses inline formatting inside note-body", () => {
    const body = `<p>Neo<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup>.</p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-notes-separator"></div><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-num">1</span><span class="vno-note-text" contenteditable="true">Có <strong>đậm</strong> và <em>nghiêng</em>.</span><button type="button" class="vno-note-delete-btn">&times;</button></div></div>`;
    const { adapter } = adapterWithZones({ body });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:note-body><text:p>Có <text:span text:style-name="T1">đậm<\/text:span> và <text:span text:style-name="T2">nghiêng<\/text:span>\.<\/text:p><\/text:note-body>/);
    assert.match(fodt, /fo:font-weight="bold"/);
    assert.match(fodt, /fo:font-style="italic"/);
  });

  await test("Writer FODT Phase D rejects footnote marker without body and bare superscript", () => {
    const missingBody = adapterWithZones({
      body: '<p>Nội dung<sup data-vno-footnote-ref="fn-1" class="vno-footnote-ref">1</sup></p>'
    });
    assert.throws(() => missingBody.adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    const bareSup = adapterWithZones({ body: "<p>Nội dung<sup>1</sup></p>" });
    assert.throws(() => bareSup.adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase D rejects imported note-body that is not a single paragraph", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ nguyên</p>" });
    const unsupported = '<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><text:p>Neo<text:note text:id="ftn1" text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>một</text:p><text:p>hai</text:p></text:note-body></text:note></text:p></office:text></office:body></office:document>';
    assert.throws(() => adapter.parseFodt(unsupported), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ nguyên</p>");
  });

  await test("Writer FODT Phase D serializes comment range as office:annotation plus annotation-end", () => {
    const { adapter } = adapterWithZones({
      body: '<p>Đề nghị phê duyệt <mark class="vno-comment-anchor" data-comment-id="writer-comment-1" tabindex="0" role="button" data-vno-comment-author="Tran Thi Hoa" title="Tran Thi Hoa" aria-label="Mở ghi chú cho: dự toán năm 2026">dự toán năm 2026</mark> theo phương án đã thống nhất.</p>',
      comments: [{
        id: "writer-comment-1",
        anchorText: "dự toán năm 2026",
        content: "Cần đối chiếu số liệu quý II trước khi trình.",
        createdAt: "2026-09-05T09:10:00",
        author: "Tran Thi Hoa"
      }]
    });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /xmlns:dc="http:\/\/purl.org\/dc\/elements\/1.1\/"/);
    assert.match(fodt, /<office:annotation office:name="writer-comment-1"><dc:creator>Tran Thi Hoa<\/dc:creator><dc:date>2026-09-05T09:10:00<\/dc:date><text:p>Cần đối chiếu số liệu quý II trước khi trình\.<\/text:p><\/office:annotation>dự toán năm 2026<office:annotation-end office:name="writer-comment-1"\/>/);
  });

  await test("Writer FODT Phase D comment round-trip is exactly idempotent and restores this.comments", () => {
    const comments = [{
      id: "writer-comment-1",
      anchorText: "dự toán năm 2026",
      content: "Cần đối chiếu số liệu quý II trước khi trình.",
      createdAt: "2026-09-05T09:10:00",
      author: "Tran Thi Hoa"
    }];
    const initial = adapterWithZones({
      body: '<p>Đề nghị phê duyệt <mark class="vno-comment-anchor" data-comment-id="writer-comment-1" tabindex="0" role="button" data-vno-comment-author="Tran Thi Hoa" title="Tran Thi Hoa" aria-label="Mở ghi chú cho: dự toán năm 2026">dự toán năm 2026</mark> theo phương án đã thống nhất.</p>',
      comments
    });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>", comments: [] });
    parsed.adapter.parseFodt(first);
    assert.equal(parsed.adapter.comments.length, 1);
    assert.equal(parsed.adapter.comments[0].id, "writer-comment-1");
    assert.equal(parsed.adapter.comments[0].content, "Cần đối chiếu số liệu quý II trước khi trình.");
    assert.equal(parsed.adapter.comments[0].author, "Tran Thi Hoa");
    assert.equal(parsed.adapter.comments[0].createdAt, "2026-09-05T09:10:00");
    assert.match(parsed.body.innerHTML, /data-comment-id="writer-comment-1"/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase D rejects comment mark without this.comments entry", () => {
    const { adapter } = adapterWithZones({
      body: '<p><mark class="vno-comment-anchor" data-comment-id="missing">neo</mark></p>'
    });
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase D serializes TOC as text:table-of-content with filled index-body", () => {
    const body = `<div data-vno-toc="true" class="vno-toc-block" contenteditable="false"><div class="vno-toc-header"><span class="vno-toc-title">MỤC LỤC</span><div class="vno-toc-actions"><button type="button" class="vno-toc-btn vno-toc-btn-update" title="Cập nhật mục lục">🔄 Cập nhật</button><button type="button" class="vno-toc-btn vno-toc-btn-delete" title="Xóa mục lục">&times;</button></div></div><div class="vno-toc-entries"><div class="vno-toc-item vno-toc-level-1"><a href="#h1" class="vno-toc-link" data-target-id="h1"><span class="vno-toc-text">Báo cáo thẩm định</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div><div class="vno-toc-item vno-toc-level-2"><a href="#h2" class="vno-toc-link" data-target-id="h2"><span class="vno-toc-text">Căn cứ pháp lý</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div><div class="vno-toc-item vno-toc-level-3"><a href="#h3" class="vno-toc-link" data-target-id="h3"><span class="vno-toc-text">Nghị định 15/2021</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div></div></div><h1>Báo cáo thẩm định</h1><p>Đoạn mở đầu.</p><h2>Căn cứ pháp lý</h2><p>Đoạn căn cứ.</p><h3>Nghị định 15/2021</h3><p>Đoạn nghị định.</p>`;
    const { adapter } = adapterWithZones({ body });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:table-of-content text:name="Table of Contents1">/);
    assert.match(fodt, /<text:table-of-content-source text:outline-level="3">/);
    assert.match(fodt, /<text:index-title-template text:style-name="Contents_20_Heading">MỤC LỤC<\/text:index-title-template>/);
    assert.match(fodt, /<text:index-body><text:index-title text:name="Table of Contents1_Head"><text:p text:style-name="Contents_20_Heading">MỤC LỤC<\/text:p><\/text:index-title><text:p text:style-name="Contents_20_1">Báo cáo thẩm định<text:tab\/>1<\/text:p><text:p text:style-name="Contents_20_2">Căn cứ pháp lý<text:tab\/>1<\/text:p><text:p text:style-name="Contents_20_3">Nghị định 15\/2021<text:tab\/>1<\/text:p><\/text:index-body>/);
    assert.match(fodt, /<text:h text:outline-level="1">Báo cáo thẩm định<\/text:h>/);
    assert.doesNotMatch(fodt, /vno-toc-btn/);
  });

  await test("Writer FODT Phase D TOC round-trip is exactly idempotent", () => {
    const body = `<div data-vno-toc="true" class="vno-toc-block" contenteditable="false"><div class="vno-toc-header"><span class="vno-toc-title">MỤC LỤC</span><div class="vno-toc-actions"><button type="button" class="vno-toc-btn vno-toc-btn-update" title="Cập nhật mục lục">🔄 Cập nhật</button><button type="button" class="vno-toc-btn vno-toc-btn-delete" title="Xóa mục lục">&times;</button></div></div><div class="vno-toc-entries"><div class="vno-toc-item vno-toc-level-1"><a class="vno-toc-link"><span class="vno-toc-text">Báo cáo thẩm định</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div><div class="vno-toc-item vno-toc-level-2"><a class="vno-toc-link"><span class="vno-toc-text">Căn cứ pháp lý</span><span class="vno-toc-leader"></span><span class="vno-toc-page">1</span></a></div></div></div><h1>Báo cáo thẩm định</h1><h2>Căn cứ pháp lý</h2>`;
    const initial = adapterWithZones({ body });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    parsed.adapter.parseFodt(first);
    assert.match(parsed.body.innerHTML, /data-vno-toc="true"/);
    assert.match(parsed.body.innerHTML, /vno-toc-level-1/);
    assert.match(parsed.body.innerHTML, /Báo cáo thẩm định/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  return results;
}
