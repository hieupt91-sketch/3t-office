/**
 * VN Office — Behavioral & Unit Tests: VN Writer Table of Contents & Footnotes/Endnotes
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter, toRoman } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
  contains(name) { return this._items().has(name); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentNode = null;
    this.parentElement = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this._textContent = "";
    this._innerHTML = "";
    this.style = {};
    this.disabled = false;
    this.value = "";
    this.scrolled = false;
    this.focused = false;
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(val) {
    this._textContent = String(val);
    this._innerHTML = String(val);
    this.children = [];
  }

  get innerText() { return this.textContent; }
  set innerText(val) { this.textContent = val; }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const styleAttr = Object.entries(this.style).map(([k, v]) => `${k}:${v}`).join("; ");
    const attrs = Object.entries(this.attributes).map(([k, v]) => `${k}="${v}"`).join(" ");
    const styleStr = styleAttr ? ` style="${styleAttr}"` : "";
    const classStr = this.className ? ` class="${this.className}"` : "";
    const attrStr = attrs ? ` ${attrs}` : "";
    return `<${tag}${classStr}${styleStr}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  get innerHTML() {
    if (this.children.length > 0) {
      if (this._textContent) {
        return this._textContent + " " + this.children.map(c => c.outerHTML).join("\n");
      }
      return this.children.map(c => c.outerHTML).join("\n");
    }
    return this._innerHTML || this._textContent || "";
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._parseChildHtml(this._innerHTML);
  }

  _parseChildHtml(html) {
    this.children = [];
    if (!html || typeof html !== "string") return;

    const tokenRegex = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z0-9\-]+)([^>]*)(\/)?>|([^<]+)/g;
    const stack = [this];
    let match;

    while ((match = tokenRegex.exec(html)) !== null) {
      if (match[0].startsWith("<!--")) continue;
      const isClosing = Boolean(match[1]);
      const tagName = match[2];
      const rawAttrs = match[3] || "";
      const isSelfClosing = Boolean(match[4]) || ["IMG", "BR", "HR", "INPUT"].includes((tagName || "").toUpperCase());
      const text = match[5];

      const current = stack[stack.length - 1];

      if (text) {
        const trimmed = text.trim();
        if (trimmed && current && current !== this) {
          current._textContent = (current._textContent || "") + (current._textContent ? " " : "") + trimmed;
          current._innerHTML = current._textContent;
        }
        continue;
      }

      if (isClosing) {
        if (stack.length > 1) {
          const upper = tagName.toUpperCase();
          for (let i = stack.length - 1; i >= 1; i--) {
            if (stack[i].tagName === upper) {
              stack.splice(i);
              break;
            }
          }
        }
        continue;
      }

      if (tagName) {
        const child = new FakeElement(tagName);
        const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
        if (classMatch) child.className = classMatch[1];
        const idMatch = rawAttrs.match(/id=["']([^"']+)["']/i);
        if (idMatch) {
          child.attributes.id = idMatch[1];
          child.id = idMatch[1];
        }
        const dataRegex = /data-([a-zA-Z0-9\-]+)=["']([^"']+)["']/g;
        let dMatch;
        while ((dMatch = dataRegex.exec(rawAttrs)) !== null) {
          const camelKey = dMatch[1].replace(/-([a-z])/g, (_, l) => l.toUpperCase());
          child.dataset[camelKey] = dMatch[2];
          child.attributes[`data-${dMatch[1]}`] = dMatch[2];
        }
        const hrefMatch = rawAttrs.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) child.attributes.href = hrefMatch[1];

        const styleMatch = rawAttrs.match(/style=["']([^"']+)["']/i);
        if (styleMatch) {
          child.attributes.style = styleMatch[1];
          styleMatch[1].split(";").forEach(rule => {
            const [k, v] = rule.split(":");
            if (k && v) child.style[k.trim()] = v.trim();
          });
        }

        current.appendChild(child);

        if (!isSelfClosing) {
          stack.push(child);
        }
      }
    }
  }

  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.children[0] || null; }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.parentElement = this;
    this.children.unshift(child);
    return child;
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.children.indexOf(reference);
    child.parentNode = this;
    child.parentElement = this;
    if (index >= 0) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    child.parentElement = null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
    if (name === "id") this.id = String(value);
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      this.dataset[camelKey] = String(value);
    }
  }

  getAttribute(name) {
    if (name === "class") return this.className || null;
    if (name === "id") return this.attributes.id || this.id || null;
    if (name === "style") {
      return this.attributes.style || (Object.keys(this.style).length > 0 ? Object.entries(this.style).map(([k, v]) => `${k}:${v}`).join("; ") : null);
    }
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      return this.dataset[camelKey] !== undefined ? this.dataset[camelKey] : (this.attributes[name] || null);
    }
    return this.attributes[name] || null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      delete this.dataset[camelKey];
    }
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(h => h !== handler);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    let cur = this;
    let stopped = false;
    event.stopPropagation = () => { stopped = true; };
    while (cur && !stopped) {
      const handlers = cur.listeners[event.type] || [];
      for (const h of handlers) {
        h(event);
        if (stopped) break;
      }
      cur = cur.parentNode;
    }
  }

  click() {
    this.dispatchEvent({
      type: "click",
      target: this,
      stopPropagation: () => {},
      preventDefault: () => {}
    });
  }

  contains(node) {
    return node === this || this.children.some(child => child.contains?.(node));
  }

  closest(selector) {
    if (this._matches(selector)) return this;
    return this.parentNode?.closest?.(selector) || null;
  }

  _matches(selector) {
    if (!selector) return false;
    if (selector.includes(",")) {
      return selector.split(",").some(s => this._matches(s.trim()));
    }

    let remaining = selector;
    const tagMatch = remaining.match(/^([a-zA-Z0-9\-]+)/);
    if (tagMatch) {
      if (this.tagName !== tagMatch[1].toUpperCase()) return false;
      remaining = remaining.slice(tagMatch[1].length);
      if (!remaining) return true;
    }

    if (remaining.startsWith(".")) {
      const className = remaining.slice(1);
      return this.classList.contains(className);
    }
    if (remaining.startsWith("#")) {
      return (this.attributes.id || this.id) === remaining.slice(1);
    }
    if (remaining.startsWith("[")) {
      const attrMatch = remaining.match(/\[([a-zA-Z0-9\-]+)(?:=["']?([^"'\]]+)["']?)?\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const attrVal = attrMatch[2];
        const actual = this.getAttribute(attrName);
        if (attrVal !== undefined) return actual === attrVal;
        return actual !== null;
      }
    }
    return false;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    for (const child of this.children) {
      if (child._matches(selector)) results.push(child);
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

function createMockWriterDoc(initialHtml = "") {
  const page = new FakeElement("div");
  page.className = "vno-writer-page";

  const header = new FakeElement("div");
  header.className = "vno-writer-header";
  header.innerHTML = "<p>Header Test</p>";

  const body = new FakeElement("div");
  body.className = "vno-writer-body";
  body.innerHTML = initialHtml;

  const footer = new FakeElement("div");
  footer.className = "vno-writer-footer";
  footer.innerHTML = "<p>Trang 1 / 1</p>";

  page.appendChild(header);
  page.appendChild(body);
  page.appendChild(footer);

  page.querySelector = (sel) => {
    if (sel === ".vno-writer-header") return header;
    if (sel === ".vno-writer-body") return body;
    if (sel === ".vno-writer-footer") return footer;
    return FakeElement.prototype.querySelector.call(page, sel);
  };

  return { page, header, body, footer };
}

export async function runWriterTocFootnotesTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // Test 1: Command Definitions
  await test("Writer References: 4 command mới được khai báo chuẩn trong WRITER_COMMANDS", async () => {
    const ids = [
      "writer.reference.tocInsert",
      "writer.reference.tocUpdate",
      "writer.reference.footnoteInsert",
      "writer.reference.endnoteInsert"
    ];
    for (const id of ids) {
      const cmd = WRITER_COMMANDS.find(c => c.id === id);
      if (!cmd) throw new Error(`Lệnh ${id} chưa được khai báo trong WRITER_COMMANDS`);
      if (cmd.category !== "reference") throw new Error(`Lệnh ${id} có category '${cmd.category}', kỳ vọng 'reference'`);
      if (!cmd.label || typeof cmd.label !== "string") throw new Error(`Lệnh ${id} thiếu nhãn tiếng Việt`);
      if (!cmd.icon || typeof cmd.icon !== "string") throw new Error(`Lệnh ${id} thiếu icon`);
    }

    const fnCmd = WRITER_COMMANDS.find(c => c.id === "writer.reference.footnoteInsert");
    if (fnCmd.shortcut !== "Ctrl+Alt+F") throw new Error(`Footnote shortcut kỳ vọng 'Ctrl+Alt+F', nhận '${fnCmd.shortcut}'`);

    const enCmd = WRITER_COMMANDS.find(c => c.id === "writer.reference.endnoteInsert");
    if (enCmd.shortcut !== "Ctrl+Alt+D") throw new Error(`Endnote shortcut kỳ vọng 'Ctrl+Alt+D', nhận '${enCmd.shortcut}'`);
  });

  // Test 2: UNO Mapping
  await test("Writer References: Ánh xạ đúng chuẩn UNO trong command-dispatch-mapper.js", async () => {
    const expectations = {
      "writer.reference.tocInsert": ".uno:InsertMultiIndex",
      "writer.reference.tocUpdate": ".uno:UpdateCurIndex",
      "writer.reference.footnoteInsert": ".uno:InsertFootnote",
      "writer.reference.endnoteInsert": ".uno:InsertEndnote"
    };
    for (const [vnId, unoUrl] of Object.entries(expectations)) {
      const mapped = mapVnCommandToUno(vnId);
      if (mapped !== unoUrl) {
        throw new Error(`Ánh xạ ${vnId} trả về '${mapped}', kỳ vọng '${unoUrl}'`);
      }
    }
  });

  // Test 3: Icons Vector SVG
  await test("Writer References: 4 icon SVG chuẩn sắc nét hiện diện trong ICONS, không dùng fallback", async () => {
    const iconKeys = ["tocInsert", "tocUpdate", "footnoteInsert", "endnoteInsert"];
    for (const key of iconKeys) {
      const svg = ICONS[key];
      if (!svg || typeof svg !== "string") throw new Error(`Thiếu icon '${key}' trong ICONS`);
      if (!svg.includes("<svg") || !svg.includes("</svg>")) throw new Error(`Icon '${key}' không phải SVG hợp lệ`);
      if (svg.length < 50) throw new Error(`Icon '${key}' quá ngắn, nghi ngờ là placeholder generic`);
    }
  });

  // Test 4: Ribbon Placement
  await test("Writer References: Hiện diện trong Ribbon tab 'Tham chiếu' và 'Chèn'", async () => {
    const refTab = WRITER_RIBBON_TABS.find(t => t.id === "references");
    if (!refTab) throw new Error("Chưa có tab 'Tham chiếu' (id: 'references') trên thanh Ribbon");
    if (refTab.label !== "Tham chiếu") throw new Error(`Nhãn tab kỳ vọng 'Tham chiếu', nhận '${refTab.label}'`);

    const tocGroup = refTab.groups?.find(g => g.label === "Mục lục");
    if (!tocGroup) throw new Error("Thiếu nhóm 'Mục lục' trong tab Tham chiếu");
    const hasTocInsert = tocGroup.items?.some(i => i.commandId === "writer.reference.tocInsert");
    const hasTocUpdate = tocGroup.items?.some(i => i.commandId === "writer.reference.tocUpdate");
    if (!hasTocInsert || !hasTocUpdate) throw new Error("Nhóm Mục lục thiếu lệnh chèn hoặc cập nhật");

    const noteGroup = refTab.groups?.find(g => g.label === "Chú thích");
    if (!noteGroup) throw new Error("Thiếu nhóm 'Chú thích' trong tab Tham chiếu");
    const hasFootnote = noteGroup.items?.some(i => i.commandId === "writer.reference.footnoteInsert");
    const hasEndnote = noteGroup.items?.some(i => i.commandId === "writer.reference.endnoteInsert");
    if (!hasFootnote || !hasEndnote) throw new Error("Nhóm Chú thích thiếu lệnh footnote hoặc endnote");

    const insertTab = WRITER_RIBBON_TABS.find(t => t.id === "insert");
    const insertRefGroup = insertTab?.groups?.find(g => g.label?.includes("Mục lục"));
    if (!insertRefGroup) throw new Error("Thiếu nhóm Mục lục & Chú thích trên tab 'Chèn'");
  });

  // Test 5: TOC Insertion from Headings (H1, H2, H3)
  await test("Writer TOC: Quét toàn bộ bodyDom sinh mục lục lồng cấp (H1, H2, H3), leader dots và link thật", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = {
      createElement: (tag) => new FakeElement(tag),
      createRange: () => ({ selectNodeContents() {}, collapse() {} })
    };

    try {
      const initialHtml = `
        <h1>1. Giới thiệu chung</h1>
        <p>Nội dung phần mở đầu về hệ thống phần mềm.</p>
        <h2>1.1. Bối cảnh ra đời</h2>
        <p>Chi tiết về bối cảnh chuyển đổi số.</p>
        <h3>1.1.1. Yêu cầu hành chính</h3>
        <p>Quy chuẩn theo Nghị định 30/2020/NĐ-CP.</p>
        <h1>2. Kiến trúc kỹ thuật</h1>
        <p>Mô hình ba tầng ứng dụng.</p>
      `;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();

      const success = adapter.insertTableOfContents();
      if (!success) throw new Error("Lệnh insertTableOfContents trả về false");

      const tocBlock = body.querySelector('[data-vno-toc="true"]');
      if (!tocBlock) throw new Error("Không tìm thấy thẻ div[data-vno-toc='true'] trong bodyDom");

      const items = tocBlock.querySelectorAll(".vno-toc-item");
      if (items.length !== 4) throw new Error(`Mục lục sinh ra ${items.length} mục, kỳ vọng 4 mục`);

      if (!items[0].classList.contains("vno-toc-level-1")) throw new Error("Mục 1 không có class vno-toc-level-1");
      if (!items[1].classList.contains("vno-toc-level-2")) throw new Error("Mục 2 không có class vno-toc-level-2");
      if (!items[2].classList.contains("vno-toc-level-3")) throw new Error("Mục 3 không có class vno-toc-level-3");
      if (!items[3].classList.contains("vno-toc-level-1")) throw new Error("Mục 4 không có class vno-toc-level-1");

      const leader = tocBlock.querySelector(".vno-toc-leader");
      if (!leader) throw new Error("Thiếu phần tử dấu chấm dóng hàng (.vno-toc-leader)");

      const link1 = items[0].querySelector(".vno-toc-link");
      if (!link1) throw new Error("Mục trong TOC thiếu thẻ liên kết .vno-toc-link");
      const targetId = link1.getAttribute("data-target-id") || link1.getAttribute("href")?.replace(/^#/, "");
      if (!targetId) throw new Error("Link TOC thiếu định danh targetId");

      const heading1 = body.querySelector(`#${targetId}`);
      if (!heading1) throw new Error(`Heading tương ứng với anchor '${targetId}' không tồn tại trong body`);
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 6: TOC Click Navigation
  await test("Writer TOC: Nhấp link trong mục lục cuộn và nhảy đúng tới tiêu đề tương ứng", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const initialHtml = `
        <h1>Tổng quan dự án</h1>
        <p>Chi tiết dự án văn phòng số.</p>
        <h2>Mục tiêu 2026</h2>
        <p>Đạt chuẩn toàn diện so với MS Office.</p>
      `;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();
      adapter.insertTableOfContents();

      const tocBlock = body.querySelector('[data-vno-toc="true"]');
      const links = tocBlock.querySelectorAll(".vno-toc-link");
      if (links.length < 2) throw new Error("TOC không có đủ link để kiểm thử");

      const linkTargetId = links[1].getAttribute("data-target-id");
      const targetHeading = body.querySelector(`#${linkTargetId}`);
      if (!targetHeading) throw new Error("Không tìm thấy heading mục tiêu");

      targetHeading.scrolled = false;
      targetHeading.focused = false;

      // Mô phỏng nhấp vào link trong TOC
      links[1].click();

      if (!targetHeading.scrolled) {
        throw new Error("Nhấp link TOC không kích hoạt scrollIntoView trên tiêu đề mục tiêu");
      }
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 7: TOC Update and Delete
  await test("Writer TOC: Cập nhật mục lục khi thêm tiêu đề mới và xóa mục lục hoạt động chuẩn", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const initialHtml = `
        <h1>Chương 1</h1>
        <p>Nội dung 1</p>
      `;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();
      adapter.insertTableOfContents();

      let tocBlock = body.querySelector('[data-vno-toc="true"]');
      let items = tocBlock.querySelectorAll(".vno-toc-item");
      if (items.length !== 1) throw new Error(`TOC ban đầu có ${items.length} mục, kỳ vọng 1`);

      // Người dùng gõ thêm tiêu đề mới
      const newHeading = new FakeElement("h2");
      newHeading.textContent = "Chương 1.1 Tiểu mục mới";
      body.appendChild(newHeading);

      // Cập nhật mục lục
      adapter.updateTableOfContents();

      tocBlock = body.querySelector('[data-vno-toc="true"]');
      items = tocBlock.querySelectorAll(".vno-toc-item");
      if (items.length !== 2) throw new Error(`Sau cập nhật TOC có ${items.length} mục, kỳ vọng 2`);

      // Xóa mục lục
      adapter.deleteTableOfContents();
      const removedToc = body.querySelector('[data-vno-toc="true"]');
      if (removedToc) throw new Error("Xóa mục lục thất bại, div[data-vno-toc] vẫn tồn tại");
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 8: Footnotes Continuous Numbering (1, 2, 3)
  await test("Writer Footnotes: Chèn 3 chú thích tự động đánh số liên tục 1, 2, 3 cả ở số mũ và phần nội dung", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const initialHtml = `<p>Đoạn văn bản cần chú thích các thuật ngữ chuyên ngành.</p>`;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();

      const fn1 = adapter.insertFootnote({ text: "Chú thích số một" });
      const fn2 = adapter.insertFootnote({ text: "Chú thích số hai" });
      const fn3 = adapter.insertFootnote({ text: "Chú thích số ba" });

      if (!fn1 || !fn2 || !fn3) throw new Error("Chèn footnote không trả về ID hợp lệ");

      const refs = body.querySelectorAll("sup[data-vno-footnote-ref]");
      if (refs.length !== 3) throw new Error(`Có ${refs.length} số mũ chú thích, kỳ vọng 3`);

      if (refs[0].textContent !== "1" || refs[1].textContent !== "2" || refs[2].textContent !== "3") {
        throw new Error(`Đánh số ở số mũ không đúng: ${refs[0].textContent}, ${refs[1].textContent}, ${refs[2].textContent}`);
      }

      const container = body.querySelector('[data-vno-footnotes="true"]');
      if (!container) throw new Error("Thiếu vùng chứa chú thích cuối trang [data-vno-footnotes='true']");

      const items = container.querySelectorAll(".vno-footnote-item");
      if (items.length !== 3) throw new Error(`Vùng chú thích có ${items.length} dòng, kỳ vọng 3`);

      const nums = items.map(item => item.querySelector(".vno-note-num")?.textContent);
      if (nums[0] !== "1" || nums[1] !== "2" || nums[2] !== "3") {
        throw new Error(`Đánh số ở dòng chú thích không đúng: ${nums.join(", ")}`);
      }

      const text1 = items[0].querySelector(".vno-note-text")?.textContent;
      if (!text1.includes("Chú thích số một")) throw new Error("Nội dung chú thích 1 không khớp");
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 9: Footnotes Renumbering After Deletion (No Skip)
  await test("Writer Footnotes: Xóa chú thích ở giữa tự động đánh số lại liên tục 1, 2 (không bị nhảy số 1, 3)", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const initialHtml = `<p>Tài liệu hành chính ba cấp chú thích.</p>`;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();

      const fn1 = adapter.insertFootnote({ text: "Ghi chú đầu" });
      const fn2 = adapter.insertFootnote({ text: "Ghi chú giữa cần xóa" });
      const fn3 = adapter.insertFootnote({ text: "Ghi chú cuối" });

      // Xóa chú thích thứ hai (ở giữa)
      adapter.deleteFootnote(fn2);

      const refs = body.querySelectorAll("sup[data-vno-footnote-ref]");
      if (refs.length !== 2) throw new Error(`Sau khi xóa còn ${refs.length} ref, kỳ vọng 2`);

      if (refs[0].textContent !== "1" || refs[1].textContent !== "2") {
        throw new Error(`Số mũ sau khi xóa bị sai: nhận [${refs[0].textContent}, ${refs[1].textContent}], kỳ vọng [1, 2] (bị nhảy số!)`);
      }

      const container = body.querySelector('[data-vno-footnotes="true"]');
      const items = container.querySelectorAll(".vno-footnote-item");
      if (items.length !== 2) throw new Error(`Sau khi xóa còn ${items.length} dòng chú thích, kỳ vọng 2`);

      const nums = items.map(item => item.querySelector(".vno-note-num")?.textContent);
      if (nums[0] !== "1" || nums[1] !== "2") {
        throw new Error(`Số ở dòng chú thích sau khi xóa bị sai: [${nums.join(", ")}]`);
      }

      const remainingIds = items.map(i => i.getAttribute("data-vno-footnote-id"));
      if (remainingIds.includes(fn2)) throw new Error("Chú thích đã xóa vẫn còn tồn tại trong container");
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 10: Endnotes Continuous Roman Numbering (i, ii, iii)
  await test("Writer Endnotes: Chèn chú thích cuối tài liệu đánh số La Mã liên tục (i, ii, iii) và đánh lại chuẩn", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const { page, body } = createMockWriterDoc("<p>Văn bản có endnotes.</p>");
      const adapter = new WriterAdapter(page);
      adapter.attach();

      const en1 = adapter.insertEndnote({ text: "Tài liệu tham khảo 1" });
      const en2 = adapter.insertEndnote({ text: "Tài liệu tham khảo 2" });
      const en3 = adapter.insertEndnote({ text: "Tài liệu tham khảo 3" });

      const refs = body.querySelectorAll("sup[data-vno-endnote-ref]");
      if (refs.length !== 3) throw new Error(`Có ${refs.length} endnote refs, kỳ vọng 3`);

      if (refs[0].textContent !== "i" || refs[1].textContent !== "ii" || refs[2].textContent !== "iii") {
        throw new Error(`Số mũ La Mã không đúng: [${refs[0].textContent}, ${refs[1].textContent}, ${refs[2].textContent}]`);
      }

      const container = body.querySelector('[data-vno-endnotes="true"]');
      if (!container) throw new Error("Thiếu vùng chứa endnotes");

      // Xóa endnote 2
      adapter.deleteEndnote(en2);

      const remainingRefs = body.querySelectorAll("sup[data-vno-endnote-ref]");
      if (remainingRefs.length !== 2) throw new Error("Còn sai số lượng endnotes sau khi xóa");
      if (remainingRefs[0].textContent !== "i" || remainingRefs[1].textContent !== "ii") {
        throw new Error(`Đánh số La Mã sau khi xóa bị lỗi: [${remainingRefs[0].textContent}, ${remainingRefs[1].textContent}]`);
      }
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 11: Deep Undo/Redo with Footnotes and TOC
  await test("Writer Undo/Redo: Hoàn tác chèn footnote làm biến mất cả số mũ và dòng chú thích; làm lại khôi phục cả hai", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = { createElement: (tag) => new FakeElement(tag) };

    try {
      const { page, body } = createMockWriterDoc("<p>Đoạn văn gốc chưa có chú thích.</p>");
      const adapter = new WriterAdapter(page);
      adapter.attach();

      // Chèn footnote
      const fnId = adapter.insertFootnote({ text: "Nội dung hoàn tác thử nghiệm" });
      if (!body.querySelector(`sup[data-vno-footnote-ref="${fnId}"]`)) throw new Error("Chèn footnote thất bại");

      // Hoàn tác (Undo)
      const undoSuccess = adapter.undo();
      if (!undoSuccess) throw new Error("Gọi undo() trả về false");

      if (body.querySelector(`sup[data-vno-footnote-ref="${fnId}"]`)) {
        throw new Error("Sau khi Undo, số mũ tham chiếu vẫn còn trong body!");
      }
      if (body.querySelector(`[data-vno-footnote-id="${fnId}"]`)) {
        throw new Error("Sau khi Undo, dòng nội dung chú thích vẫn còn trong body!");
      }

      // Làm lại (Redo)
      const redoSuccess = adapter.redo();
      if (!redoSuccess) throw new Error("Gọi redo() trả về false");

      if (!body.querySelector(`sup[data-vno-footnote-ref="${fnId}"]`)) {
        throw new Error("Sau khi Redo, số mũ tham chiếu không được khôi phục!");
      }
      if (!body.querySelector(`[data-vno-footnote-id="${fnId}"]`)) {
        throw new Error("Sau khi Redo, dòng nội dung chú thích không được khôi phục!");
      }
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 12: Print Preview Per-Page Footnotes Integration
  await test("Writer Print Preview: Footnote xuất hiện ở chân trang chứa chính nó thay vì dồn về cuối tài liệu", async () => {
    const originalDoc = globalThis.document;
    globalThis.document = {
      createElement: (tag) => new FakeElement(tag),
      body: new FakeElement("body"),
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    try {
      const page1Text = "Nội dung trang một với thuật ngữ A";
      const page2Text = "Nội dung trang hai với thuật ngữ B";
      const breakStyle = "page-break-before: always;";

      const initialHtml = `
        <p>${page1Text}</p>
        <p style="${breakStyle}">${page2Text}</p>
      `;
      const { page, body } = createMockWriterDoc(initialHtml);
      const adapter = new WriterAdapter(page);
      adapter.attach();

      // Thêm footnote 1 vào trang 1 và footnote 2 vào trang 2
      const fn1 = adapter.insertFootnote({ text: "Nghĩa của thuật ngữ A ở trang 1" });
      const fn2 = adapter.insertFootnote({ text: "Nghĩa của thuật ngữ B ở trang 2" });

      // Đặt số mũ ref đúng vị trí đoạn văn
      const pElements = body.querySelectorAll("p");
      const sup1 = body.querySelector(`sup[data-vno-footnote-ref="${fn1}"]`);
      const sup2 = body.querySelector(`sup[data-vno-footnote-ref="${fn2}"]`);

      pElements[0].appendChild(sup1);
      pElements[1].appendChild(sup2);

      const overlay = adapter.openPrintPreview();
      if (!overlay) throw new Error("openPrintPreview không mở được overlay");

      const sheets = overlay.querySelectorAll(".vno-print-preview-sheet");
      if (sheets.length < 2) throw new Error(`Preview chỉ có ${sheets.length} trang, kỳ vọng ít nhất 2 trang`);

      const page1Body = sheets[0].querySelector(".vno-print-preview-body");
      const page2Body = sheets[1].querySelector(".vno-print-preview-body");

      const page1Notes = page1Body.querySelector(".vno-print-preview-footnotes");
      const page2Notes = page2Body.querySelector(".vno-print-preview-footnotes");

      if (!page1Notes) throw new Error("Trang 1 thiếu phần chú thích chân trang");
      if (!page2Notes) throw new Error("Trang 2 thiếu phần chú thích chân trang");

      if (!page1Notes.innerHTML.includes("Nghĩa của thuật ngữ A ở trang 1")) {
        throw new Error("Trang 1 không chứa footnote của chính nó");
      }
      if (page1Notes.innerHTML.includes("Nghĩa của thuật ngữ B ở trang 2")) {
        throw new Error("Footnote của trang 2 bị rò rỉ sang trang 1!");
      }

      if (!page2Notes.innerHTML.includes("Nghĩa của thuật ngữ B ở trang 2")) {
        throw new Error("Trang 2 không chứa footnote của chính nó");
      }

      adapter.closePrintPreview();
    } finally {
      globalThis.document = originalDoc;
    }
  });

  // Test 13: Export Sanitation
  await test("Writer Export: _stripSessionMarkup loại bỏ nút thao tác nhưng giữ nguyên vẹn nội dung mục lục và chú thích", async () => {
    const rawHtml = `
      <div data-vno-toc="true" class="vno-toc-block">
        <div class="vno-toc-header">
          <span>MỤC LỤC</span>
          <button type="button" class="vno-toc-btn vno-toc-btn-update">Cập nhật</button>
          <button type="button" class="vno-toc-btn vno-toc-btn-delete">&times;</button>
        </div>
        <div class="vno-toc-entries">
          <div class="vno-toc-item"><a href="#h1" class="vno-toc-link">1. Tiêu đề chính</a></div>
        </div>
      </div>
      <p>Nội dung bài viết.<sup data-vno-footnote-ref="fn-1">1</sup></p>
      <div data-vno-footnotes="true">
        <div class="vno-footnote-item" data-vno-footnote-id="fn-1">
          <span class="vno-note-num">1</span>
          <span class="vno-note-text">Chú thích số một</span>
          <button type="button" class="vno-note-delete-btn">&times;</button>
        </div>
      </div>
    `;

    const { page } = createMockWriterDoc(rawHtml);
    const adapter = new WriterAdapter(page);
    const clean = adapter._stripSessionMarkup(rawHtml);

    if (clean.includes("vno-toc-btn")) throw new Error("Nút thao tác TOC chưa bị loại khỏi export");
    if (clean.includes("vno-note-delete-btn")) throw new Error("Nút xóa chú thích chưa bị loại khỏi export");
    if (!clean.includes("MỤC LỤC")) throw new Error("Tiêu đề mục lục bị xóa mất trong export");
    if (!clean.includes("1. Tiêu đề chính")) throw new Error("Mục lục bị xóa mất trong export");
    if (!clean.includes("Chú thích số một")) throw new Error("Nội dung chú thích bị xóa mất trong export");
  });

  // Test 14: Protected Zone Safety (_isInsideProtectedZone)
  await test("Writer Protected Zones: _isInsideProtectedZone ngăn chặn việc chèn lồng footnote/endnote/TOC vào bên trong container ghi chú", async () => {
    const rawHtml = `
      <p id="doc-p">Đoạn văn thông thường.</p>
      <div data-vno-footnotes="true" class="vno-writer-footnotes-container">
        <div class="vno-footnote-item" data-vno-footnote-id="fn-1">
          <span class="vno-note-num">1</span>
          <span class="vno-note-text" id="fn-text">Nội dung chú thích</span>
        </div>
      </div>
    `;
    const { page, body } = createMockWriterDoc(rawHtml);
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const normalP = body.querySelector("#doc-p");
    const fnText = body.querySelector("#fn-text");
    const fnContainer = body.querySelector('[data-vno-footnotes="true"]');

    if (adapter._isInsideProtectedZone(normalP)) {
      throw new Error("Đoạn văn bình thường không được tính là protected zone");
    }
    if (!adapter._isInsideProtectedZone(fnText)) {
      throw new Error("Node trong footnote text phải được nhận diện là protected zone");
    }
    if (!adapter._isInsideProtectedZone(fnContainer)) {
      throw new Error("Container footnotes phải được nhận diện là protected zone");
    }

    // Mô phỏng con trỏ selection đang nằm trong fnText
    const originalWindow = globalThis.window;
    const originalDoc = globalThis.document;
    try {
      // BẮT BUỘC mock lại globalThis.document (như mọi test khác trong file này) —
      // nếu không, document.createElement("sup") bên trong insertFootnote() sẽ dùng
      // globalThis.document còn sót lại từ test trước (hoặc undefined), tạo ra phần tử
      // không phải FakeElement thật, thiếu _matches() -> querySelectorAll() crash.
      globalThis.document = { createElement: (tag) => new FakeElement(tag) };
      globalThis.window = {
        getSelection: () => ({
          rangeCount: 1,
          getRangeAt: () => ({
            commonAncestorContainer: fnText,
            collapse: () => {},
            insertNode: (node) => fnText.appendChild(node)
          })
        })
      };

      // Gọi insertFootnote khi đang focus trong footnote text
      const newFnId = adapter.insertFootnote({ text: "Chú thích mới không được lồng" });
      if (!newFnId) throw new Error("insertFootnote thất bại");

      // sup phải KHÔNG nằm trong fnText hay fnContainer
      const sup = body.querySelector(`sup[data-vno-footnote-ref="${newFnId}"]`);
      if (!sup) throw new Error("Không tìm thấy thẻ sup của footnote mới");
      if (fnContainer.contains(sup)) {
        throw new Error("LỖI: Thẻ sup bị chèn lồng vào bên trong vùng container của footnote cũ!");
      }
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDoc;
    }
  });

  return results;
}
