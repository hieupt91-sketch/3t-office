/**
 * VN Office — Behavioral & Unit Tests: VN Writer Citations & Bibliography
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import {
  CITATION_STYLES,
  SOURCE_TYPES,
  normalizeSource,
  authorSortKey,
  formatInTextCitation,
  formatBibliographyEntry,
  serializeCitationMetadata,
  parseCitationMetadata
} from "../../apps/writer/citations.js";

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
        if (stack.length > 1) stack.pop();
        continue;
      }

      const child = new FakeElement(tagName);
      const attrRegex = /([a-zA-Z0-9\-:]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const name = attrMatch[1];
        let value = attrMatch[2] || "";
        value = value.replace(/^["']|["']$/g, "");
        child.setAttribute(name, value);
      }

      current.appendChild(child);

      if (!isSelfClosing) {
        stack.push(child);
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
    if (remaining.startsWith("[")) {
      const attrMatch = remaining.match(/\[([a-zA-Z0-9\-]+)(?:=["']?([^"'\]]+)["']?)?\]/);
      if (attrMatch) {
        const actual = this.getAttribute(attrMatch[1]);
        if (attrMatch[2] !== undefined) return actual === attrMatch[2];
        return actual !== null;
      }
    }
    return false;
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

export async function runWriterCitationsTests() {
  const results = [];
  // Các suite khác trong tests/run-tests.js chạy chung một tiến trình Node và có thể
  // tạm gán globalThis.document rồi không khôi phục đúng trước khi ném lỗi — cô lập
  // các test dưới đây khỏi mọi globalThis.document còn sót lại từ suite trước.
  const originalDoc = globalThis.document;
  globalThis.document = undefined;
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  };

  await test("Writer Citations: 4 lệnh mới khai báo chuẩn trong WRITER_COMMANDS", () => {
    const ids = ["writer.reference.citationStyle", "writer.reference.citationInsert", "writer.reference.sourcesManage", "writer.reference.bibliographyInsert"];
    for (const id of ids) {
      const cmd = WRITER_COMMANDS.find(c => c.id === id);
      if (!cmd) throw new Error(`Thiếu lệnh ${id} trong WRITER_COMMANDS`);
      if (!ICONS[cmd.icon]) throw new Error(`Lệnh ${id} tham chiếu icon "${cmd.icon}" không tồn tại trong ICONS`);
    }
  });

  await test("Writer Citations: nhóm ribbon 'Trích dẫn & Thư mục tài liệu' nằm trên tab Tham chiếu", () => {
    const refTab = WRITER_RIBBON_TABS.find(tab => tab.id === "references");
    if (!refTab) throw new Error("Không tìm thấy tab references");
    const group = refTab.groups.find(g => /Trích dẫn/.test(g.label || ""));
    if (!group) throw new Error("Không tìm thấy nhóm Trích dẫn & Thư mục tài liệu trên tab Tham chiếu");
    const flatIds = JSON.stringify(group);
    for (const id of ["writer.reference.citationStyle", "writer.reference.citationInsert", "writer.reference.sourcesManage", "writer.reference.bibliographyInsert"]) {
      if (!flatIds.includes(id)) throw new Error(`Nhóm ribbon thiếu commandId ${id}`);
    }
  });

  await test("Writer Citations: formatInTextCitation đúng kiểu APA và MLA", () => {
    const source = normalizeSource({ author: "Nguyễn Văn A", year: "2024", title: "Giáo trình Mẫu" });
    const apa = formatInTextCitation(source, "apa");
    if (apa !== "(Nguyễn, 2024)") throw new Error(`APA sai: nhận được "${apa}"`);
    const mla = formatInTextCitation(source, "mla");
    if (mla !== "(Nguyễn)") throw new Error(`MLA sai: nhận được "${mla}"`);
  });

  await test("Writer Citations: formatBibliographyEntry đúng cấu trúc APA và MLA", () => {
    const source = normalizeSource({ author: "Trần Thị B", year: "2023", title: "Nghiên cứu X", publisher: "NXB Khoa Học" });
    const apa = formatBibliographyEntry(source, "apa");
    if (!apa.includes("Trần Thị B") || !apa.includes("(2023)") || !apa.includes("Nghiên cứu X") || !apa.includes("NXB Khoa Học")) {
      throw new Error(`Entry APA thiếu thành phần: ${apa}`);
    }
    const mla = formatBibliographyEntry(source, "mla");
    if (!mla.includes("Trần Thị B") || !mla.includes("Nghiên cứu X") || !mla.includes("2023")) {
      throw new Error(`Entry MLA thiếu thành phần: ${mla}`);
    }
  });

  await test("Writer Citations: authorSortKey sắp xếp đúng theo bảng chữ cái tiếng Việt", () => {
    const names = ["Đặng Văn C", "An Văn A", "Bùi Thị B"].map(author => normalizeSource({ author }));
    const sorted = [...names].sort((a, b) => authorSortKey(a).localeCompare(authorSortKey(b), "vi"));
    const order = sorted.map(s => s.author);
    if (JSON.stringify(order) !== JSON.stringify(["An Văn A", "Bùi Thị B", "Đặng Văn C"])) {
      throw new Error(`Thứ tự sai: ${order.join(" | ")}`);
    }
  });

  await test("Writer Citations: serializeCitationMetadata/parseCitationMetadata round-trip đúng dữ liệu", () => {
    const state = { style: "mla", sources: [normalizeSource({ author: "X", title: "Y", year: "2020" })] };
    const html = serializeCitationMetadata(state);
    const parsed = parseCitationMetadata(html);
    if (!parsed || parsed.style !== "mla" || parsed.sources.length !== 1 || parsed.sources[0].title !== "Y") {
      throw new Error(`Round-trip metadata sai: ${JSON.stringify(parsed)}`);
    }
    if (parseCitationMetadata("không có gì ở đây") !== null) throw new Error("parseCitationMetadata phải trả về null khi không có metadata");
  });

  await test("Writer Citations: chèn trích dẫn tạo field không-sửa-được với đúng văn bản APA", () => {
    const { page, body } = createMockWriterDoc("<p>Đoạn văn gốc.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const id = adapter.insertCitation({ author: "Lê Văn D", year: "2021", title: "Tài liệu D" });
    if (!id) throw new Error("insertCitation không trả về id nguồn");

    const field = body.querySelector(`[data-vno-citation-source-id="${id}"]`);
    if (!field) throw new Error("Không tìm thấy field trích dẫn trong bodyDom");
    if (field.getAttribute("contenteditable") !== "false") throw new Error("Field trích dẫn phải contenteditable=false");
    if (field.textContent !== "(Lê, 2021)") throw new Error(`Văn bản trích dẫn sai: "${field.textContent}"`);

    if (adapter.citationSources.length !== 1) throw new Error("citationSources phải có đúng 1 nguồn sau khi chèn");
  });

  await test("Writer Citations: đổi kiểu trích dẫn cập nhật lại toàn bộ field đã chèn", () => {
    const { page, body } = createMockWriterDoc("<p>Đoạn văn gốc.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const id = adapter.insertCitation({ author: "Phạm Văn E", year: "2019", title: "Tài liệu E" });
    adapter.setCitationStyle("mla");

    const field = body.querySelector(`[data-vno-citation-source-id="${id}"]`);
    if (field.textContent !== "(Phạm)") throw new Error(`Sau khi đổi MLA, field phải là "(Phạm)", nhận được "${field.textContent}"`);
    if (adapter.citationStyle !== "mla") throw new Error("adapter.citationStyle không cập nhật");
  });

  await test("Writer Citations: chèn Bibliography chỉ liệt kê nguồn đã dùng, sắp xếp alphabet", () => {
    const { page, body } = createMockWriterDoc("<p>Đoạn văn gốc.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    adapter.insertCitation({ author: "Vũ Văn G", year: "2020", title: "Tài liệu G" });
    adapter.addOrUpdateCitationSource({ author: "An Văn H", year: "2018", title: "Tài liệu H chưa dùng" });
    adapter.insertCitation({ author: "Bùi Văn F", year: "2022", title: "Tài liệu F" });

    adapter.insertBibliography();
    const bib = body.querySelector('[data-vno-bibliography="true"]');
    if (!bib) throw new Error("Không tìm thấy khối Bibliography");

    const entries = bib.querySelectorAll(".vno-bibliography-entry");
    if (entries.length !== 2) throw new Error(`Bibliography phải có đúng 2 mục (chỉ nguồn đã trích dẫn), nhận được ${entries.length}`);
    if (!/Bùi Văn F/.test(entries[0].textContent) || !/Vũ Văn G/.test(entries[1].textContent)) {
      throw new Error(`Thứ tự alphabet sai: ${entries.map(e => e.textContent).join(" | ")}`);
    }
    if (/Tài liệu H chưa dùng/.test(bib.textContent)) throw new Error("Bibliography không được liệt kê nguồn chưa từng trích dẫn");
  });

  await test("Writer Citations: quản lý nguồn qua options.sources (headless) thêm/sửa/xóa đúng", async () => {
    const { page } = createMockWriterDoc("<p>Đoạn văn gốc.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    adapter.addOrUpdateCitationSource({ author: "Ban đầu", year: "2015", title: "Nguồn ban đầu" });
    const existingId = adapter.citationSources[0].id;

    const ok = await adapter.openSourceManagerDialog({
      sources: [
        { ...adapter.citationSources[0], author: "Ban đầu (đã sửa)" },
        normalizeSource({ author: "Nguồn mới", year: "2024", title: "Thêm mới" })
      ]
    });
    if (!ok) throw new Error("openSourceManagerDialog(headless) phải trả về true");
    if (adapter.citationSources.length !== 2) throw new Error("Phải có 2 nguồn sau khi áp dụng danh sách mới");
    if (adapter.citationSources[0].author !== "Ban đầu (đã sửa)") throw new Error("Sửa nguồn qua Manage Sources không được áp dụng");

    const afterDelete = await adapter.openSourceManagerDialog({ sources: [adapter.citationSources[1]] });
    if (!afterDelete) throw new Error("Xóa nguồn qua Manage Sources thất bại");
    if (adapter.citationSources.length !== 1 || adapter.citationSources[0].author !== "Nguồn mới") {
      throw new Error("Danh sách nguồn sau khi xóa không đúng");
    }
  });

  await test("Writer Citations: Undo xóa field trích dẫn và reset citationSources; Redo khôi phục cả hai", () => {
    const { page, body } = createMockWriterDoc("<p>Đoạn văn gốc chưa có trích dẫn.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const id = adapter.insertCitation({ author: "Hoàng Văn K", year: "2017", title: "Tài liệu K" });
    if (!body.querySelector(`[data-vno-citation-source-id="${id}"]`)) throw new Error("Chèn trích dẫn thất bại");
    if (adapter.citationSources.length !== 1) throw new Error("citationSources phải có 1 phần tử ngay sau khi chèn");

    if (!adapter.undo()) throw new Error("undo() trả về false");
    if (body.querySelector(`[data-vno-citation-source-id="${id}"]`)) throw new Error("Sau Undo, field trích dẫn vẫn còn trong body");
    if (adapter.citationSources.length !== 0) throw new Error("Sau Undo, adapter.citationSources phải rỗng (đồng bộ với DOM đã hoàn tác)");

    if (!adapter.redo()) throw new Error("redo() trả về false");
    if (!body.querySelector(`[data-vno-citation-source-id="${id}"]`)) throw new Error("Sau Redo, field trích dẫn phải xuất hiện lại");
    if (adapter.citationSources.length !== 1) throw new Error("Sau Redo, adapter.citationSources phải được khôi phục lại 1 phần tử");
  });

  await test("Writer Citations: mở tài liệu có sẵn metadata khôi phục đúng citationStyle/citationSources", () => {
    const metaHtml = serializeCitationMetadata({ style: "mla", sources: [normalizeSource({ author: "Đỗ Văn L", year: "2016", title: "Tài liệu L" })] });
    const { page } = createMockWriterDoc(`<p>Nội dung có sẵn.</p><span data-vno-citation-metadata="true" style="display:none">${metaHtml}</span>`);
    const adapter = new WriterAdapter(page);
    adapter.attach();
    adapter._hydrateCitationsFromDom();
    if (adapter.citationStyle !== "mla") throw new Error(`citationStyle phải là mla, nhận được ${adapter.citationStyle}`);
    if (adapter.citationSources.length !== 1 || adapter.citationSources[0].author !== "Đỗ Văn L") {
      throw new Error("citationSources không được khôi phục đúng từ metadata có sẵn trong DOM");
    }
  });

  globalThis.document = originalDoc;
  return results;
}
