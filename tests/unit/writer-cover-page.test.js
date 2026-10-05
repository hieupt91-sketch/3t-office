/**
 * VN Office — Unit & Behavioral Tests cho Trang Bìa (Cover Page)
 */

import assert from "node:assert";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { COVER_PAGE_TEMPLATES, generateCoverPageHtml } from "../../apps/writer/cover-page.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { CommandBus } from "../../platform/commands/command-bus.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function createMockWriterDoc(initialHtml = "<p>Nội dung chính của tài liệu phía sau trang bìa</p>") {
  const datasetObj = {};
  const childrenList = [];

  const parseNodes = (htmlStr) => {
    const nodes = [];
    const matches = htmlStr.match(/<[^>]+>|[^<]+/g) || [];
    for (const token of matches) {
      if (token.startsWith("<p data-vno-page-break")) {
        const el = {
          nodeType: 1,
          tagName: "P",
          getAttribute(attr) { if (attr === "data-vno-page-break") return "true"; return null; },
          style: { pageBreakBefore: "always", breakBefore: "page" },
          remove() {
            const idx = bodyEl.children.indexOf(el);
            if (idx !== -1) bodyEl.children.splice(idx, 1);
          },
          nextElementSibling: null
        };
        nodes.push(el);
      } else if (token.startsWith("<div class=\"vno-cover-page\"")) {
        const el = {
          nodeType: 1,
          tagName: "DIV",
          className: "vno-cover-page",
          getAttribute(attr) { if (attr === "data-vno-cover-page") return "true"; return null; },
          style: {},
          remove() {
            const idx = bodyEl.children.indexOf(el);
            if (idx !== -1) bodyEl.children.splice(idx, 1);
          },
          nextElementSibling: null
        };
        nodes.push(el);
      } else if (token.startsWith("<p>")) {
        const text = token.replace(/<[^>]*>/g, "");
        const el = {
          nodeType: 1,
          tagName: "P",
          textContent: text,
          innerHTML: token,
          style: {},
          getAttribute() { return null; },
          remove() {
            const idx = bodyEl.children.indexOf(el);
            if (idx !== -1) bodyEl.children.splice(idx, 1);
          },
          nextElementSibling: null
        };
        nodes.push(el);
      }
    }
    return nodes;
  };

  const initialNodes = parseNodes(initialHtml);
  childrenList.push(...initialNodes);

  const updateSiblings = () => {
    for (let i = 0; i < childrenList.length; i++) {
      childrenList[i].nextElementSibling = childrenList[i + 1] || null;
    }
  };
  updateSiblings();

  const bodyEl = {
    children: childrenList,
    get innerHTML() {
      return childrenList.map(c => c.innerHTML || c.textContent || "").join("\n");
    },
    set innerHTML(htmlStr) {
      childrenList.length = 0;
      childrenList.push(...parseNodes(htmlStr));
      updateSiblings();
    },
    prepend(...elements) {
      childrenList.unshift(...elements);
      updateSiblings();
    },
    querySelector(sel) {
      if (sel === '[data-vno-cover-page="true"]' || sel === '.vno-cover-page') {
        return childrenList.find(c => c.className === "vno-cover-page" || c.getAttribute?.("data-vno-cover-page") === "true") || null;
      }
      if (sel === '[data-vno-page-break="true"]') {
        return childrenList.find(c => c.getAttribute?.("data-vno-page-break") === "true") || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-vno-cover-page="true"]' || sel === '.vno-cover-page') {
        return childrenList.filter(c => c.className === "vno-cover-page" || c.getAttribute?.("data-vno-cover-page") === "true");
      }
      if (sel === '[data-vno-page-break="true"]') {
        return childrenList.filter(c => c.getAttribute?.("data-vno-page-break") === "true");
      }
      return [];
    },
    focus() {},
    contains() { return true; }
  };

  const mockDoc = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        children: [],
        _innerHTML: "",
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) {
          this._innerHTML = val;
          this.children = parseNodes(val);
        },
        style: {},
        getAttribute() { return null; },
        setAttribute() {}
      };
      Object.defineProperty(el, "firstElementChild", {
        get() { return el.children[0] || null; }
      });
      return el;
    }
  };

  const pageEl = {
    ownerDocument: mockDoc,
    querySelector(sel) {
      if (sel === ".vno-writer-body") return bodyEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".vno-writer-body") return [bodyEl];
      return [];
    }
  };

  return { page: pageEl, body: bodyEl, mockDoc };
}

export async function runWriterCoverPageTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Cover Page: Khai báo lệnh writer.insert.coverPage và writer.insert.removeCoverPage chuẩn trong WRITER_COMMANDS", () => {
    const coverCmd = WRITER_COMMANDS.find(c => c.id === "writer.insert.coverPage");
    const removeCmd = WRITER_COMMANDS.find(c => c.id === "writer.insert.removeCoverPage");
    assert(coverCmd, "Thiếu command definition writer.insert.coverPage");
    assert(removeCmd, "Thiếu command definition writer.insert.removeCoverPage");
    assert.strictEqual(coverCmd.category, "insert");
    assert.strictEqual(removeCmd.category, "insert");
    assert(coverCmd.label && coverCmd.tooltip, "Thiếu label/tooltip cho writer.insert.coverPage");
    assert(removeCmd.label && removeCmd.tooltip, "Thiếu label/tooltip cho writer.insert.removeCoverPage");
  });

  await test("Cover Page: Ribbon tab Chèn nhóm Trang văn bản có lệnh Trang bìa và Gỡ trang bìa", () => {
    const insertTab = WRITER_RIBBON_TABS.find(t => t.id === "insert");
    assert(insertTab, "Thiếu tab insert trên Ribbon");
    const pagesGroup = insertTab.groups.find(g => g.id === "pages");
    assert(pagesGroup, "Thiếu nhóm pages trên tab Chèn");

    const cmdIds = [];
    const walk = (items) => {
      for (const item of items) {
        if (item.commandId) cmdIds.push(item.commandId);
        if (item.items) walk(item.items);
      }
    };
    walk(pagesGroup.items);

    assert(cmdIds.includes("writer.insert.coverPage"), "Nhóm pages thiếu lệnh writer.insert.coverPage");
    assert(cmdIds.includes("writer.insert.removeCoverPage"), "Nhóm pages thiếu lệnh writer.insert.removeCoverPage");
  });

  await test("Cover Page: Thư viện 4 mẫu trang bìa 3T (gov_simple, bordered_report, modern_band, contract_big)", () => {
    assert.strictEqual(COVER_PAGE_TEMPLATES.length, 4, "Phải có đúng 4 mẫu trang bìa");
    const ids = COVER_PAGE_TEMPLATES.map(t => t.id);
    assert(ids.includes("gov_simple"), "Thiếu mẫu gov_simple");
    assert(ids.includes("bordered_report"), "Thiếu mẫu bordered_report");
    assert(ids.includes("modern_band"), "Thiếu mẫu modern_band");
    assert(ids.includes("contract_big"), "Thiếu mẫu contract_big");

    COVER_PAGE_TEMPLATES.forEach(tpl => {
      assert(tpl.name && tpl.description && tpl.thumbnailSvg, `Mẫu ${tpl.id} thiếu name/description/thumbnailSvg`);
      const html = tpl.generateHtml({
        title: "DỰ THẢO BÁO CÁO TỔNG KẾT",
        subtitle: "NĂM 2026",
        organization: "CÔNG TY 3T DOC",
        author: "NGUYỄN VĂN A",
        date: "06/10/2026"
      });
      assert(html.includes("vno-cover-page"), `Mẫu ${tpl.id} hỏng class vno-cover-page`);
      assert(html.includes("DỰ THẢO BÁO CÁO TỔNG KẾT"), `Mẫu ${tpl.id} không chứa tiêu đề`);
      assert(html.includes("CÔNG TY 3T DOC"), `Mẫu ${tpl.id} không chứa tên đơn vị`);
      assert(html.includes("Times New Roman"), `Mẫu ${tpl.id} không dùng font Times New Roman an toàn`);
    });
  });

  await test("Cover Page: Hàm generateCoverPageHtml tạo HTML chuẩn gồm trang bìa + ngắt trang ngay phía sau", () => {
    const html = generateCoverPageHtml("gov_simple", { title: "TIÊU ĐỀ THỬ NGHIỆM" });
    assert(html.includes('data-vno-cover-page="true"'), "HTML thiếu data-vno-cover-page");
    assert(html.includes('data-vno-page-break="true"'), "HTML thiếu ngắt trang data-vno-page-break ngay phía sau");
    assert(html.includes('page-break-before:always'), "Ngắt trang phải có style page-break-before:always");
  });

  await test("Cover Page: WriterAdapter chèn trang bìa vào ĐẦU tài liệu và lưu Undo snapshot", () => {
    const adapter = new WriterAdapter();
    const mock = createMockWriterDoc("<p>Văn bản chính ban đầu</p>");
    adapter.editorDom = mock.page;
    adapter.attach();

    const origDoc = globalThis.document;
    globalThis.document = mock.mockDoc;

    try {
      const ok = adapter.insertCoverPage("gov_simple", {
        title: "TIÊU ĐỀ ĐẦU TÀI LIỆU",
        author: "TÁC GIẢ B"
      });
      assert.strictEqual(ok, true, "insertCoverPage phải trả về true");

      const coverEl = mock.body.querySelector('[data-vno-cover-page="true"]');
      assert(coverEl, "Phải có phần tử trang bìa trong DOM");
      assert.strictEqual(mock.body.children[0], coverEl, "Trang bìa phải nằm ở ĐẦU tài liệu (vị trí index 0)");

      const pageBreakEl = mock.body.querySelector('[data-vno-page-break="true"]');
      assert(pageBreakEl, "Phải có ngắt trang ngay sau trang bìa");
      assert.strictEqual(mock.body.children[1], pageBreakEl, "Ngắt trang phải nằm ngay sau trang bìa (vị trí index 1)");
    } finally {
      globalThis.document = origDoc;
    }
  });

  await test("Cover Page: Chèn lại mẫu mới sẽ THAY THẾ trang bìa cũ, không tạo 2 trang bìa", () => {
    const adapter = new WriterAdapter();
    const mock = createMockWriterDoc("<p>Nội dung</p>");
    adapter.editorDom = mock.page;
    adapter.attach();

    const origDoc = globalThis.document;
    globalThis.document = mock.mockDoc;

    try {
      adapter.insertCoverPage("gov_simple", { title: "BÌA THỨ NHẤT" });
      assert.strictEqual(mock.body.querySelectorAll('[data-vno-cover-page="true"]').length, 1);

      adapter.insertCoverPage("bordered_report", { title: "BÌA THỨ HAI THAY THẾ" });
      const covers = mock.body.querySelectorAll('[data-vno-cover-page="true"]');
      assert.strictEqual(covers.length, 1, "Chỉ được phép có duy nhất 1 trang bìa trong tài liệu");
      const breaks = mock.body.querySelectorAll('[data-vno-page-break="true"]');
      assert.strictEqual(breaks.length, 1, "Chỉ được phép có 1 ngắt trang của trang bìa");
    } finally {
      globalThis.document = origDoc;
    }
  });

  await test("Cover Page: Lệnh writer.insert.removeCoverPage gỡ trang bìa và ngắt trang kèm theo", () => {
    const adapter = new WriterAdapter();
    const mock = createMockWriterDoc("<p>Nội dung</p>");
    adapter.editorDom = mock.page;
    adapter.attach();

    const origDoc = globalThis.document;
    globalThis.document = mock.mockDoc;

    try {
      adapter.insertCoverPage("modern_band", { title: "BÌA CẦN GỠ" });
      assert(mock.body.querySelector('[data-vno-cover-page="true"]'));

      const removed = adapter.removeCoverPage();
      assert.strictEqual(removed, true, "removeCoverPage phải trả về true khi xóa thành công");
      assert.strictEqual(mock.body.querySelector('[data-vno-cover-page="true"]'), null, "Trang bìa đã bị xóa khỏi DOM");
      assert.strictEqual(mock.body.querySelector('[data-vno-page-break="true"]'), null, "Ngắt trang kèm theo trang bìa đã bị xóa");
    } finally {
      globalThis.document = origDoc;
    }
  });

  await test("Cover Page: Hoàn tác Ctrl+Z một bước gỡ cả trang bìa vừa chèn và ngắt trang kèm theo", () => {
    const adapter = new WriterAdapter();
    const mock = createMockWriterDoc("<p>Đoạn văn gốc ban đầu</p>");
    adapter.editorDom = mock.page;
    adapter.attach();

    const origDoc = globalThis.document;
    globalThis.document = mock.mockDoc;

    try {
      adapter.insertCoverPage("contract_big", { title: "HỢP ĐỒNG MỚI" });
      assert(mock.body.querySelector('[data-vno-cover-page="true"]'));

      // Hoàn tác 1 bước
      adapter.undo();
      assert.strictEqual(mock.body.querySelector('[data-vno-cover-page="true"]'), null, "Ctrl+Z 1 bước phải xóa trang bìa");
      assert.strictEqual(mock.body.querySelector('[data-vno-page-break="true"]'), null, "Ctrl+Z 1 bước phải xóa ngắt trang kèm theo");
    } finally {
      globalThis.document = origDoc;
    }
  });

  await test("Cover Page: Bài Hướng dẫn tiếng Việt phủ đầy đủ bài viết và 5 bước thực hiện", () => {
    const helpEntry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.insert.coverPage");
    assert(helpEntry, "Thiếu bài Help cho writer.insert.coverPage trong entries-writer.js");
    assert(helpEntry.commandIds.includes("writer.insert.coverPage"));
    assert(helpEntry.commandIds.includes("writer.insert.removeCoverPage"));
    assert(helpEntry.steps.length >= 5, "Bài Help phải có ít nhất 5 bước chi tiết");

    const viHas = Boolean(viStrings.commands?.["writer.insert.coverPage"] || viStrings["writer.insert.coverPage"]);
    const enHas = Boolean(enStrings.commands?.["writer.insert.coverPage"] || enStrings["writer.insert.coverPage"]);
    assert(viHas, "Thiếu i18n tiếng Việt cho writer.insert.coverPage");
    assert(enHas, "Thiếu i18n tiếng Anh cho writer.insert.coverPage");
  });

  console.log("==================================================");
  console.log("  WRITER COVER PAGE UNIT TESTS PASSED            ");
  console.log("==================================================");
  return results;
}
