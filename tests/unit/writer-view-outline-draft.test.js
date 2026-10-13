/**
 * Tests for WORD-W2: Chế độ xem Dàn bài (Outline), Bản nháp (Draft), và Ẩn/Hiện chi tiết tiêu đề.
 */

import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { WriterViewController } from "../../apps/writer/writer-view-controller.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export async function runWriterViewOutlineDraftTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  test("W2.1: Định nghĩa lệnh và phím tắt cho Outline, Draft và Thu gọn tiêu đề", () => {
    const requiredCommands = [
      "writer.view.outline",
      "writer.view.draft",
      "writer.outline.promote",
      "writer.outline.demote",
      "writer.outline.moveUp",
      "writer.outline.moveDown",
      "writer.outline.expand",
      "writer.outline.collapse",
      "writer.outline.showLevel",
      "writer.outline.close",
      "writer.view.toggleHeadingCollapse"
    ];
    const cmdMap = new Map(WRITER_COMMANDS.map(c => [c.id, c]));
    for (const cmdId of requiredCommands) {
      assert(cmdMap.has(cmdId), `Thiếu định nghĩa lệnh ${cmdId}`);
      assert(viStrings.commands?.[cmdId] || viStrings[cmdId], `Thiếu chuỗi i18n VI cho ${cmdId}`);
      assert(enStrings.commands?.[cmdId] || enStrings[cmdId], `Thiếu chuỗi i18n EN cho ${cmdId}`);
    }

    assert(cmdMap.get("writer.outline.promote")?.shortcut === "Alt+Shift+Left", "Phím tắt promote phải là Alt+Shift+Left");
    assert(cmdMap.get("writer.outline.demote")?.shortcut === "Alt+Shift+Right", "Phím tắt demote phải là Alt+Shift+Right");
    assert(cmdMap.get("writer.para.moveUp")?.shortcut === "Alt+Shift+Up", "Phím tắt para moveUp phải là Alt+Shift+Up");
    assert(cmdMap.get("writer.para.moveDown")?.shortcut === "Alt+Shift+Down", "Phím tắt para moveDown phải là Alt+Shift+Down");
    assert(cmdMap.get("writer.outline.expand")?.shortcut === "Alt+Shift++", "Phím tắt expand phải là Alt+Shift++");
    assert(cmdMap.get("writer.outline.collapse")?.shortcut === "Alt+Shift+-", "Phím tắt collapse phải là Alt+Shift+-");
  });

  test("W2.2: Ribbon View tab có nút Dàn bài, Bản nháp và nhóm Dàn bài", () => {
    const viewTab = WRITER_RIBBON_TABS.find(t => t.id === "view");
    assert(viewTab, "Thiếu tab View trong WRITER_RIBBON_TABS");
    const viewsGroup = viewTab.groups.find(g => g.id === "views");
    assert(viewsGroup, "Thiếu group views trong tab View");
    const flattenControls = (items) => {
      let list = [];
      for (const it of items || []) {
        if (it.commandId) list.push(it);
        if (it.items) list.push(...flattenControls(it.items));
      }
      return list;
    };
    const viewsControls = flattenControls(viewsGroup.items);
    assert(viewsControls.some(c => c.commandId === "writer.view.outline"), "Thiếu nút Dàn bài trong views group");
    assert(viewsControls.some(c => c.commandId === "writer.view.draft"), "Thiếu nút Bản nháp trong views group");

    const outlineGroup = viewTab.groups.find(g => g.id === "outline");
    assert(outlineGroup, "Thiếu group outline trong tab View");
    const outlineControls = flattenControls(outlineGroup.items);
    assert(outlineControls.some(c => c.commandId === "writer.outline.promote"), "Thiếu promote trong group outline");
    assert(outlineControls.some(c => c.commandId === "writer.outline.demote"), "Thiếu demote trong group outline");
    assert(outlineControls.some(c => c.commandId === "writer.outline.close"), "Thiếu close trong group outline");
  });

  test("W2.3: Hướng dẫn sử dụng trong ứng dụng đầy đủ và không chứa tên thương mại cấm", () => {
    const outlineHelp = WRITER_HELP_ENTRIES.find(e => e.id === "writer.view.outline.help");
    const draftHelp = WRITER_HELP_ENTRIES.find(e => e.id === "writer.view.draft.help");
    const collapseHelp = WRITER_HELP_ENTRIES.find(e => e.id === "writer.view.collapsibleHeadings.help");
    assert(outlineHelp, "Thiếu trợ giúp Dàn bài");
    assert(draftHelp, "Thiếu trợ giúp Bản nháp");
    assert(collapseHelp, "Thiếu trợ giúp Thu gọn tiêu đề");

    const forbidden = [/microsoft word/i, /\bms word\b/i, /\bexcel\b/i, /\bpowerpoint\b/i];
    for (const help of [outlineHelp, draftHelp, collapseHelp]) {
      const text = `${help.title} ${help.summary} ${help.steps.join(" ")}`;
      for (const re of forbidden) {
        assert(!re.test(text), `Trợ giúp ${help.id} chứa từ cấm ${re}`);
      }
    }
  });

  test("W2.4: ViewController chuyển đổi chế độ outline và draft chính xác", () => {
    const classList = new Set();
    const mockContainer = {
      classList: {
        toggle(cls, val) { if (val) classList.add(cls); else classList.delete(cls); },
        contains(cls) { return classList.has(cls); }
      },
      prepend() {},
      querySelector() { return null; }
    };
    const mockShell = { setStatus() {} };
    const vc = new WriterViewController({ container: mockContainer, shell: mockShell });

    vc.setMode("outline");
    assert(vc.mode === "outline", "Mode phải là outline");
    assert(mockContainer.classList.contains("vno-writer-outline-layout"), "Container phải có class vno-writer-outline-layout");

    vc.setMode("draft");
    assert(vc.mode === "draft", "Mode phải là draft");
    assert(mockContainer.classList.contains("vno-writer-draft-layout"), "Container phải có class vno-writer-draft-layout");
    assert(!mockContainer.classList.contains("vno-writer-outline-layout"), "Draft không được có outline class");

    vc.setMode("printLayout");
    assert(vc.mode === "printLayout", "Mode phải quay về printLayout");
    assert(!mockContainer.classList.contains("vno-writer-draft-layout"), "Print layout không có draft class");
  });

  test("W2.5: Thao tác nâng cấp/hạ cấp và thu gọn tiêu đề trong DOM", () => {
    // DOM giả lập
    class MockElement {
      constructor(tag, text = "", attrs = {}) {
        this.nodeType = 1;
        this.tagName = tag.toUpperCase();
        this.textContent = text;
        this.attributes = Object.entries(attrs).map(([name, value]) => ({ name, value }));
        this.attrs = { ...attrs };
        this.dataset = {};
        for (const [k, v] of Object.entries(attrs)) {
          if (k.startsWith("data-")) {
            const camel = k.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
            this.dataset[camel] = v;
          }
        }
        this.classes = new Set();
        this.classList = {
          add: (c) => this.classes.add(c),
          remove: (c) => this.classes.delete(c),
          contains: (c) => this.classes.has(c),
          toggle: (c, v) => (v ?? !this.classes.has(c)) ? this.classes.add(c) : this.classes.delete(c)
        };
        this.style = {};
        this.childNodes = [];
        this.parentNode = null;
        this.nextElementSibling = null;
        this.previousElementSibling = null;
      }
      getAttribute(name) { return this.attrs[name] ?? null; }
      setAttribute(name, val) { this.attrs[name] = String(val); }
      removeAttribute(name) { delete this.attrs[name]; }
      hasAttribute(name) { return name in this.attrs; }
      querySelector(sel) { return null; }
      querySelectorAll(sel) { return []; }
      replaceChild(newEl, oldEl) {
        newEl.parentNode = this;
      }
    }

    const mockBody = new MockElement("div");
    const h1 = new MockElement("h1", "Chương 1", { "data-vno-outline": "1" });
    const p1 = new MockElement("p", "Nội dung chương 1");
    const h2 = new MockElement("h2", "Mục 1.1", { "data-vno-outline": "2" });
    const p2 = new MockElement("p", "Nội dung mục 1.1");
    const h1_next = new MockElement("h1", "Chương 2", { "data-vno-outline": "1" });

    const nodes = [h1, p1, h2, p2, h1_next];
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].parentNode = mockBody;
      nodes[i].nextElementSibling = nodes[i + 1] || null;
      nodes[i].previousElementSibling = nodes[i - 1] || null;
    }

    const vc = new WriterViewController({ container: null, shell: { setStatus() {} } });
    vc._getBody = () => mockBody;

    // Test section nodes
    const h1_section = vc._getSectionNodes(h1);
    assert(h1_section.length === 4, `Chương 1 phải chứa 4 node (h1, p1, h2, p2), được: ${h1_section.length}`);
    assert(h1_section.includes(h1) && h1_section.includes(p1) && h1_section.includes(h2) && h1_section.includes(p2), "Các node con phải thuộc phần Chương 1");
    assert(!h1_section.includes(h1_next), "Chương 2 không được nằm trong phần Chương 1");

    // Test collapse
    vc.collapseHeading(h1);
    assert(h1.classList.contains("vno-heading-collapsed"), "H1 phải có class vno-heading-collapsed");
    assert(h1.getAttribute("data-vno-collapsed") === "true", "H1 phải có data-vno-collapsed=true");
    assert(p1.classList.contains("vno-heading-collapsed-body"), "P1 phải có class vno-heading-collapsed-body");
    assert(h2.classList.contains("vno-heading-collapsed-body"), "H2 phải có class vno-heading-collapsed-body");

    // Test expand
    vc.expandHeading(h1);
    assert(!h1.classList.contains("vno-heading-collapsed"), "H1 không còn vno-heading-collapsed sau khi mở rộng");
    assert(!h1.hasAttribute("data-vno-collapsed"), "H1 không còn data-vno-collapsed");
    assert(!p1.classList.contains("vno-heading-collapsed-body"), "P1 không còn class vno-heading-collapsed-body");
  });

  return results;
}
