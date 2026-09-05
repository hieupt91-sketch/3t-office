/**
 * VN Office — Behavioral & Unit Tests: VN Writer Captions & Table of Figures
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import {
  CAPTION_KINDS,
  captionKindLabel,
  defaultCaptionPosition,
  formatCaptionVisibleText,
  parseCaptionMarker,
  parseCaptionVisibleText,
  serializeCaptionMarker,
  serializeTofMarker,
  parseTofMarker
} from "../../apps/writer/captions.js";

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
    if (this.children.length > 0) {
      const childText = this.children.map(c => c.textContent).join(" ");
      return this._textContent ? `${this._textContent} ${childText}` : childText;
    }
    if (this._textContent) return this._textContent;
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
        const contentMatch = rawAttrs.match(/contenteditable=["']([^"']+)["']/i);
        if (contentMatch) child.attributes.contenteditable = contentMatch[1];
        const tabMatch = rawAttrs.match(/tabindex=["']([^"']+)["']/i);
        if (tabMatch) child.attributes.tabindex = tabMatch[1];
        const srcMatch = rawAttrs.match(/src=["']([^"']+)["']/i);
        if (srcMatch) child.attributes.src = srcMatch[1];
        current.appendChild(child);
        if (!isSelfClosing) stack.push(child);
      }
    }
  }

  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.children[0] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 ? this.parentNode.children[idx + 1] || null : null;
  }
  get nextElementSibling() { return this.nextSibling; }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.children.indexOf(reference);
    child.parentNode = this;
    child.parentElement = this;
    if (index >= 0) this.children.splice(index, 0, child);
    else this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    child.parentElement = null;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  insertAdjacentHTML(position, html) {
    const temp = new FakeElement("div");
    temp.innerHTML = html;
    const nodes = [...temp.children];
    if (position === "beforeend") {
      nodes.forEach((n) => this.appendChild(n));
    } else if (position === "afterbegin") {
      for (let i = nodes.length - 1; i >= 0; i--) this.insertBefore(nodes[i], this.children[0] || null);
    } else if (position === "afterend" && this.parentNode) {
      const ref = this.nextSibling;
      nodes.forEach((n) => this.parentNode.insertBefore(n, ref));
    } else if (position === "beforebegin" && this.parentNode) {
      nodes.forEach((n) => this.parentNode.insertBefore(n, this));
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
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      return this.dataset[camelKey] !== undefined ? this.dataset[camelKey] : (this.attributes[name] || null);
    }
    return this.attributes[name] || null;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    let cur = this;
    let stopped = false;
    event.stopPropagation = () => { stopped = true; };
    while (cur && !stopped) {
      const handlers = cur.listeners[event.type] || [];
      for (const h of handlers) { h(event); if (stopped) break; }
      cur = cur.parentNode;
    }
  }

  click() {
    this.dispatchEvent({ type: "click", target: this, stopPropagation() {}, preventDefault() {} });
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
    if (selector.includes(",")) return selector.split(",").some(s => this._matches(s.trim()));
    let remaining = selector;
    const tagMatch = remaining.match(/^([a-zA-Z0-9\-]+)/);
    if (tagMatch) {
      if (this.tagName !== tagMatch[1].toUpperCase()) return false;
      remaining = remaining.slice(tagMatch[1].length);
      if (!remaining) return true;
    }
    if (remaining.startsWith(".")) return this.classList.contains(remaining.slice(1));
    if (remaining.startsWith("#")) return (this.attributes.id || this.id) === remaining.slice(1);
    while (remaining.startsWith("[")) {
      const attrMatch = remaining.match(/^\[([a-zA-Z0-9\-]+)(?:=["']?([^"'\]]+)["']?)?\]/);
      if (!attrMatch) return false;
      const actual = this.getAttribute(attrMatch[1]);
      if (attrMatch[2] !== undefined) {
        if (actual !== attrMatch[2]) return false;
      } else if (actual === null) return false;
      remaining = remaining.slice(attrMatch[0].length);
    }
    return remaining.length === 0;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
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
  header.innerHTML = "<p>Header</p>";
  const body = new FakeElement("div");
  body.className = "vno-writer-body";
  body.innerHTML = initialHtml;
  const footer = new FakeElement("div");
  footer.className = "vno-writer-footer";
  footer.innerHTML = "<p>Trang 1</p>";
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

function captionNumbers(body, kind) {
  return body.querySelectorAll('[data-vno-caption="true"]')
    .filter((el) => (el.getAttribute("data-vno-caption-kind") || el.dataset.vnoCaptionKind) === kind)
    .map((el) => (el.querySelector(".vno-caption-number")?.textContent || "").trim());
}

export async function runWriterCaptionsTests() {
  const results = [];
  const originalDoc = globalThis.document;
  globalThis.document = undefined;
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  };

  await test("Writer Captions: 3 lệnh mới khai báo chuẩn trong WRITER_COMMANDS kèm icon SVG", () => {
    const ids = ["writer.reference.captionInsert", "writer.reference.tofInsert", "writer.reference.tofUpdate"];
    for (const id of ids) {
      const cmd = WRITER_COMMANDS.find(c => c.id === id);
      if (!cmd) throw new Error(`Thiếu lệnh ${id}`);
      if (!ICONS[cmd.icon]) throw new Error(`Lệnh ${id} tham chiếu icon "${cmd.icon}" không tồn tại`);
      if (!String(ICONS[cmd.icon]).includes("<svg")) throw new Error(`Icon ${cmd.icon} không phải SVG`);
    }
    if (!CAPTION_KINDS.includes("figure") || !CAPTION_KINDS.includes("table")) {
      throw new Error("CAPTION_KINDS phải gồm figure và table");
    }
  });

  await test("Writer Captions: nhóm ribbon 'Chú thích ảnh' nằm trên tab Tham chiếu", () => {
    const refTab = WRITER_RIBBON_TABS.find(tab => tab.id === "references");
    if (!refTab) throw new Error("Không tìm thấy tab references");
    const group = refTab.groups.find(g => g.label === "Chú thích ảnh" || g.labelKey === "writerRibbon.group.captions");
    if (!group) throw new Error("Không tìm thấy nhóm Chú thích ảnh trên tab Tham chiếu");
    const flat = JSON.stringify(group);
    for (const id of ["writer.reference.captionInsert", "writer.reference.tofInsert", "writer.reference.tofUpdate"]) {
      if (!flat.includes(id)) throw new Error(`Nhóm ribbon thiếu commandId ${id}`);
    }
  });

  await test("Writer Captions: format/parse nhãn tiếng Việt và marker ẩn round-trip", () => {
    if (captionKindLabel("figure", "vi") !== "Hình") throw new Error("Nhãn figure vi phải là Hình");
    if (captionKindLabel("table", "vi") !== "Bảng") throw new Error("Nhãn table vi phải là Bảng");
    if (defaultCaptionPosition("table") !== "above") throw new Error("Mặc định chú thích bảng phải ở trên");
    if (defaultCaptionPosition("figure") !== "below") throw new Error("Mặc định chú thích hình phải ở dưới");
    const visible = formatCaptionVisibleText("figure", 2, "Biểu đồ doanh thu", "vi");
    if (visible !== "Hình 2: Biểu đồ doanh thu") throw new Error(`Visible sai: ${visible}`);
    const parsed = parseCaptionVisibleText("Hình 2: Biểu đồ doanh thu", "vi");
    if (!parsed || parsed.kind !== "figure" || parsed.number !== 2 || parsed.text !== "Biểu đồ doanh thu") {
      throw new Error(`parseCaptionVisibleText sai: ${JSON.stringify(parsed)}`);
    }
    const marker = serializeCaptionMarker({ kind: "table", id: "cap-1", index: 3 });
    const back = parseCaptionMarker(marker);
    if (!back || back.kind !== "table" || back.id !== "cap-1" || back.index !== 3) {
      throw new Error(`Caption marker round-trip sai: ${JSON.stringify(back)}`);
    }
    const tof = parseTofMarker(serializeTofMarker({ kind: "all" }));
    if (!tof || tof.kind !== "all") throw new Error("TOF marker round-trip sai");
  });

  await test("Writer Captions: chèn ảnh + 3 caption Hình và 1 caption Bảng, số độc lập theo loại", () => {
    const { page, body } = createMockWriterDoc(`
      <p>Báo cáo quý I</p>
      <img src="data:image/png;base64,aaa" data-id="i1" />
      <img src="data:image/png;base64,bbb" data-id="i2" />
      <img src="data:image/png;base64,ccc" data-id="i3" />
      <table><tr><td>Doanh thu</td></tr></table>
    `);
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const images = body.querySelectorAll("img");
    if (images.length !== 3) throw new Error(`Fixture phải có 3 ảnh, nhận ${images.length}`);
    adapter.insertCaption({ kind: "figure", text: "Doanh thu", target: images[0], position: "below" });
    adapter.insertCaption({ kind: "figure", text: "Chi phí", target: body.querySelectorAll("img")[1], position: "below" });
    adapter.insertCaption({ kind: "figure", text: "Lợi nhuận", target: body.querySelectorAll("img")[2], position: "below" });
    adapter.insertCaption({ kind: "table", text: "Tổng hợp", target: body.querySelector("table"), position: "above" });

    const figures = captionNumbers(body, "figure");
    const tables = captionNumbers(body, "table");
    if (figures.join(",") !== "1,2,3") throw new Error(`Số Hình phải 1,2,3 — nhận ${figures.join(",")}`);
    if (tables.join(",") !== "1") throw new Error(`Số Bảng phải 1 — nhận ${tables.join(",")}`);

    const figureTexts = body.querySelectorAll('[data-vno-caption="true"]')
      .filter((el) => el.getAttribute("data-vno-caption-kind") === "figure")
      .map((el) => el.querySelector(".vno-caption-text")?.textContent.trim());
    if (JSON.stringify(figureTexts) !== JSON.stringify(["Doanh thu", "Chi phí", "Lợi nhuận"])) {
      throw new Error(`Nội dung caption Hình sai: ${figureTexts.join(" | ")}`);
    }
    const tableCaption = body.querySelector('[data-vno-caption-kind="table"]');
    if (!tableCaption || tableCaption.querySelector(".vno-caption-text")?.textContent.trim() !== "Tổng hợp") {
      throw new Error("Caption Bảng không đúng nội dung");
    }
    if (tableCaption.querySelector(".vno-caption-label")?.textContent.trim() !== "Bảng") {
      throw new Error("Nhãn caption bảng phải là Bảng");
    }
  });

  await test("Writer Captions: xóa caption Hình giữa chừng thì các caption sau tự đánh lại số", () => {
    const { page, body } = createMockWriterDoc(`
      <img src="a" />
      <img src="b" />
      <img src="c" />
    `);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    adapter.insertCaption({ kind: "figure", text: "Một", target: body.querySelectorAll("img")[0] });
    adapter.insertCaption({ kind: "figure", text: "Hai", target: body.querySelectorAll("img")[1] });
    adapter.insertCaption({ kind: "figure", text: "Ba", target: body.querySelectorAll("img")[2] });

    const middle = body.querySelectorAll('[data-vno-caption="true"]')[1];
    const middleId = middle.getAttribute("data-vno-caption-id") || middle.id;
    if (!adapter.deleteCaption(middleId)) throw new Error("deleteCaption phải trả về true");

    const remaining = body.querySelectorAll('[data-vno-caption="true"]');
    if (remaining.length !== 2) throw new Error(`Sau khi xóa phải còn 2 caption, nhận ${remaining.length}`);
    const nums = remaining.map((el) => el.querySelector(".vno-caption-number")?.textContent.trim());
    if (nums.join(",") !== "1,2") throw new Error(`Sau xóa giữa, số phải 1,2 — nhận ${nums.join(",")}`);
    const texts = remaining.map((el) => el.querySelector(".vno-caption-text")?.textContent.trim());
    if (JSON.stringify(texts) !== JSON.stringify(["Một", "Ba"])) {
      throw new Error(`Nội dung còn lại sai: ${texts.join(" | ")}`);
    }
  });

  await test("Writer Captions: Table of Figures liệt kê đúng thứ tự và click nhảy tới caption", () => {
    const { page, body } = createMockWriterDoc(`
      <img src="a" />
      <img src="b" />
      <table><tr><td>X</td></tr></table>
    `);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    adapter.insertCaption({ kind: "figure", text: "Ảnh A", target: body.querySelectorAll("img")[0] });
    adapter.insertCaption({ kind: "figure", text: "Ảnh B", target: body.querySelectorAll("img")[1] });
    adapter.insertCaption({ kind: "table", text: "Bảng X", target: body.querySelector("table") });

    const ok = adapter.insertTableOfFigures({ kind: "figure" });
    if (!ok) throw new Error("insertTableOfFigures phải thành công");
    const tof = body.querySelector('[data-vno-tof="true"]');
    if (!tof) throw new Error("Thiếu khối data-vno-tof");
    const items = tof.querySelectorAll(".vno-tof-item");
    if (items.length !== 2) throw new Error(`TOF Hình phải có 2 mục, nhận ${items.length}`);
    const labels = items.map((item) => item.querySelector(".vno-tof-text")?.textContent.replace(/\s+/g, " ").trim());
    if (!labels[0].includes("Hình 1") || !labels[0].includes("Ảnh A")) throw new Error(`Mục 1 sai: ${labels[0]}`);
    if (!labels[1].includes("Hình 2") || !labels[1].includes("Ảnh B")) throw new Error(`Mục 2 sai: ${labels[1]}`);
    if (labels.some((t) => t.includes("Bảng"))) throw new Error("TOF kind=figure không được chứa caption Bảng");

    const firstCaption = body.querySelectorAll('[data-vno-caption="true"]')[0];
    firstCaption.scrolled = false;
    firstCaption.focused = false;
    const link = items[0].querySelector(".vno-tof-link");
    if (!link) throw new Error("TOF thiếu .vno-tof-link");
    link.click();
    if (!firstCaption.scrolled) throw new Error("Click mục TOF phải scroll tới caption tương ứng");

    adapter.insertTableOfFigures({ kind: "all" });
    const allTof = body.querySelectorAll('[data-vno-tof="true"]');
    if (allTof.length < 2) throw new Error("Phải chèn được TOF kind=all song song với TOF hình");
    const allItems = allTof[allTof.length - 1].querySelectorAll(".vno-tof-item");
    if (allItems.length !== 3) throw new Error(`TOF tất cả phải có 3 mục, nhận ${allItems.length}`);
  });

  await test("Writer Captions: Undo/Redo dùng snapshot sẵn có, không stack riêng", () => {
    const { page, body } = createMockWriterDoc(`<img src="a" /><p>Đoạn văn.</p>`);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    const id = adapter.insertCaption({ kind: "figure", text: "Sơ đồ", target: body.querySelector("img") });
    if (!body.querySelector(`[data-vno-caption-id="${id}"]`) && !body.querySelector(`#${id}`)) {
      throw new Error("Chèn caption thất bại trước Undo");
    }
    if (!adapter.undo()) throw new Error("undo() trả về false");
    if (body.querySelector('[data-vno-caption="true"]')) {
      throw new Error("Sau Undo, caption vẫn còn trong body");
    }
    if (!adapter.redo()) throw new Error("redo() trả về false");
    const restored = body.querySelector('[data-vno-caption="true"]');
    if (!restored) throw new Error("Sau Redo, caption phải xuất hiện lại");
    if (restored.querySelector(".vno-caption-text")?.textContent.trim() !== "Sơ đồ") {
      throw new Error("Redo không khôi phục đúng nội dung caption");
    }
  });

  await test("Writer Captions: cập nhật TOF sau khi thêm caption mới; export giữ nội dung, bỏ nút thao tác", () => {
    const { page, body } = createMockWriterDoc(`<img src="a" />`);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    adapter.insertCaption({ kind: "figure", text: "A", target: body.querySelector("img") });
    adapter.insertTableOfFigures({ kind: "figure" });
    const extra = new FakeElement("img");
    extra.setAttribute("src", "b");
    body.appendChild(extra);
    adapter.insertCaption({ kind: "figure", text: "B", target: extra });
    adapter.updateTableOfFigures({ kind: "figure" });
    const items = body.querySelector('[data-vno-tof="true"]').querySelectorAll(".vno-tof-item");
    if (items.length !== 2) throw new Error(`Sau cập nhật TOF phải có 2 mục, nhận ${items.length}`);

    const exported = adapter._stripSessionMarkup(body.innerHTML);
    if (/vno-caption-delete-btn/.test(exported) || /vno-tof-btn/.test(exported)) {
      throw new Error("Export phải loại nút thao tác caption/TOF");
    }
    if (!/Hình/.test(exported) || !/>A</.test(exported) && !/A/.test(exported)) {
      throw new Error("Export phải giữ nội dung caption");
    }
    if (!/data-vno-tof/.test(exported) && !/DANH MỤC HÌNH/.test(exported)) {
      throw new Error("Export phải giữ khối danh mục hình");
    }
  });

  await test("Writer Captions: hydrate từ đoạn văn 'Hình N:' khi mất data attribute", () => {
    const { page, body } = createMockWriterDoc(`<p>Hình 1: Biểu đồ doanh thu</p><p>Bảng 1: Tổng hợp</p>`);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    adapter._hydrateCaptionsFromDom();
    const caps = body.querySelectorAll('[data-vno-caption="true"]');
    if (caps.length !== 2) throw new Error(`Hydrate phải tạo 2 caption, nhận ${caps.length}`);
    const kinds = caps.map((el) => el.getAttribute("data-vno-caption-kind"));
    if (kinds.join(",") !== "figure,table") throw new Error(`Kind sau hydrate sai: ${kinds.join(",")}`);
  });

  globalThis.document = originalDoc;
  return results;
}
