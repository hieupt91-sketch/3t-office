/**
 * VN Office — Behavioral & Unit Tests: VN Writer Mail Merge (Trộn thư)
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { parseCsv, replaceMergeFields } from "../../apps/writer/mail-merge.js";
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
    this.children = [];
    this.parentNode = null;
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
    const attrs = Object.entries(this.attributes).filter(([k]) => k !== "style" && k !== "class").map(([k, v]) => `${k}="${v}"`).join(" ");
    const styleStr = styleAttr ? ` style="${styleAttr}"` : (this.attributes.style ? ` style="${this.attributes.style}"` : "");
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
    this.children.push(child);
    return child;
  }

  prepend(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.unshift(child);
    return child;
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.children.indexOf(reference);
    child.parentNode = this;
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

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }

  dispatchEvent(evt) {
    const handlers = this.listeners[evt.type] || [];
    for (const h of handlers) h(evt);
    let cur = this.parentNode;
    while (cur) {
      const parentHandlers = cur.listeners[evt.type] || [];
      for (const ph of parentHandlers) ph(evt);
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

export async function runWriterMailMergeTests() {
  const results = [];
  const originalDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag)
  };

  try {
    const test = async (name, fn) => {
      try {
        await fn();
        results.push({ name, pass: true });
      } catch (err) {
        results.push({ name, pass: false, error: err.message });
      }
    };

  // Test 1: Command Definitions
  await test("Writer Mail Merge: 6 command mới được khai báo chuẩn trong WRITER_COMMANDS", async () => {
    const ids = [
      "writer.mailMerge.open",
      "writer.mailMerge.insertField",
      "writer.mailMerge.preview",
      "writer.mailMerge.prevRecord",
      "writer.mailMerge.nextRecord",
      "writer.mailMerge.finish"
    ];
    for (const id of ids) {
      const found = WRITER_COMMANDS.find(cmd => cmd.id === id);
      if (!found) throw new Error(`Thiếu command definition cho ${id}`);
      if (!found.label) throw new Error(`Command ${id} thiếu nhãn tiếng Việt`);
      if (!found.icon) throw new Error(`Command ${id} thiếu icon`);
    }
  });

  // Test 2: UNO Dispatch Mapping
  await test("Writer Mail Merge: Ánh xạ đúng chuẩn UNO trong command-dispatch-mapper.js", async () => {
    const expected = {
      "writer.mailMerge.open": ".uno:MailMergeWizard",
      "writer.mailMerge.insertField": ".uno:InsertField",
      "writer.mailMerge.preview": ".uno:MailMergePreview",
      "writer.mailMerge.prevRecord": ".uno:MailMergePrev",
      "writer.mailMerge.nextRecord": ".uno:MailMergeNext",
      "writer.mailMerge.finish": ".uno:MailMergeFinish"
    };
    for (const [vnCmd, unoCmd] of Object.entries(expected)) {
      const mapped = mapVnCommandToUno(vnCmd);
      if (mapped !== unoCmd) {
        throw new Error(`Command ${vnCmd} phải ánh xạ sang ${unoCmd}, nhận được: ${mapped}`);
      }
    }
  });

  // Test 3: Multi-tone SVG Icons Check
  await test("Writer Mail Merge: 6 icon SVG vector chuẩn sắc nét hiện diện trong ICONS, không dùng fallback hay generic circle", async () => {
    const iconKeys = [
      "mailMerge",
      "mergeInsertField",
      "mergePreview",
      "mergePrev",
      "mergeNext",
      "mergeFinish"
    ];
    for (const key of iconKeys) {
      const svg = ICONS[key];
      if (!svg) throw new Error(`Thiếu định nghĩa icon: ${key}`);
      if (!svg.includes("<svg") || !svg.includes("</svg>")) {
        throw new Error(`Icon ${key} không phải mã SVG hợp lệ`);
      }
      if (svg.includes("<circle cx=\"12\" cy=\"12\" r=\"10\"") && !svg.includes("path")) {
        throw new Error(`Icon ${key} là fallback generic circle`);
      }
    }
  });

  // Test 4: Ribbon Tabs & Groups
  await test("Writer Mail Merge: Tab 'Trộn thư' (mailings) hiện diện trong WRITER_RIBBON_TABS với đầy đủ 4 nhóm chức năng", async () => {
    const mailingsTab = WRITER_RIBBON_TABS.find(t => t.id === "mailings");
    if (!mailingsTab) throw new Error("Thiếu tab 'mailings' trong WRITER_RIBBON_TABS");
    if (mailingsTab.label !== "Trộn thư") throw new Error(`Nhãn tab phải là 'Trộn thư', nhận được: ${mailingsTab.label}`);

    const groupLabels = mailingsTab.groups.map(g => g.label);
    if (!groupLabels.includes("Bắt đầu trộn")) throw new Error("Thiếu nhóm 'Bắt đầu trộn'");
    if (!groupLabels.includes("Viết & Chèn trường")) throw new Error("Thiếu nhóm 'Viết & Chèn trường'");
    if (!groupLabels.includes("Xem trước kết quả")) throw new Error("Thiếu nhóm 'Xem trước kết quả'");
    if (!groupLabels.includes("Hoàn tất")) throw new Error("Thiếu nhóm 'Hoàn tất'");

    const allCmds = [];
    for (const g of mailingsTab.groups) {
      for (const item of g.items) {
        if (item.commandId) allCmds.push(item.commandId);
        if (item.items) {
          for (const sub of item.items) {
            if (sub.commandId) allCmds.push(sub.commandId);
          }
        }
      }
    }

    if (!allCmds.includes("writer.mailMerge.open")) throw new Error("Ribbon thiếu nút writer.mailMerge.open");
    if (!allCmds.includes("writer.mailMerge.insertField")) throw new Error("Ribbon thiếu nút writer.mailMerge.insertField");
    if (!allCmds.includes("writer.mailMerge.preview")) throw new Error("Ribbon thiếu nút writer.mailMerge.preview");
    if (!allCmds.includes("writer.mailMerge.prevRecord")) throw new Error("Ribbon thiếu nút writer.mailMerge.prevRecord");
    if (!allCmds.includes("writer.mailMerge.nextRecord")) throw new Error("Ribbon thiếu nút writer.mailMerge.nextRecord");
    if (!allCmds.includes("writer.mailMerge.finish")) throw new Error("Ribbon thiếu nút writer.mailMerge.finish");
  });

  // Test 5: Pure JS CSV Parser
  await test("Writer Mail Merge CSV Parser: Phân tích chuẩn xác tiêu đề cột, nhiều dòng dữ liệu, chuỗi chứa dấu phẩy trong ngoặc kép và dấu ngoặc kép thoát", async () => {
    const rawCsv = `
HoTen, ChucVu, "DiaChi, NoiCongTac", GhiChu
Nguyễn Văn A, Trưởng phòng, "Số 10, Phố Lý Thường Kiệt, Hà Nội", "Đạt chuẩn ""Xuất sắc"""
Trần Thị B, "Phó Giám đốc", "Đà Nẵng, Việt Nam", "Hoàn thành tốt"
Lê Văn C, Chuyên viên, "Quận 1, TP. Hồ Chí Minh", "Khen thưởng"
    `.trim();

    const { fields, records } = parseCsv(rawCsv);
    if (fields.length !== 4) throw new Error(`Kỳ vọng 4 cột, nhận được: ${fields.length}`);
    if (fields[0] !== "HoTen" || fields[1] !== "ChucVu" || fields[2] !== "DiaChi, NoiCongTac" || fields[3] !== "GhiChu") {
      throw new Error(`Tiêu đề cột sai: ${JSON.stringify(fields)}`);
    }

    if (records.length !== 3) throw new Error(`Kỳ vọng 3 bản ghi, nhận được: ${records.length}`);

    // Dòng 1
    if (records[0].HoTen !== "Nguyễn Văn A") throw new Error(`Dòng 1 HoTen sai: ${records[0].HoTen}`);
    if (records[0]["DiaChi, NoiCongTac"] !== "Số 10, Phố Lý Thường Kiệt, Hà Nội") {
      throw new Error(`Dấu phẩy trong ngoặc kép bị tách sai: ${records[0]["DiaChi, NoiCongTac"]}`);
    }
    if (records[0].GhiChu !== 'Đạt chuẩn "Xuất sắc"') {
      throw new Error(`Dấu nháy kép thoát "" phân tích sai: ${records[0].GhiChu}`);
    }

    // Dòng 2 & 3
    if (records[1].HoTen !== "Trần Thị B" || records[1].ChucVu !== "Phó Giám đốc") throw new Error("Dòng 2 phân tích sai");
    if (records[2].HoTen !== "Lê Văn C" || records[2]["DiaChi, NoiCongTac"] !== "Quận 1, TP. Hồ Chí Minh") throw new Error("Dòng 3 phân tích sai");
  });

  // Test 6: Insert Field Marker & DOM Structure
  await test("Writer Mail Merge: Dán CSV 3 dòng dữ liệu, chèn field, assert field marker đúng định dạng trong DOM («FieldName»)", async () => {
    const { page, body } = createMockWriterDoc("<p>Kính gửi: </p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen,ChucVu,PhongBan",
      "Nguyễn Văn A,Trưởng phòng,Kinh doanh",
      "Trần Thị B,Phó phòng,Kế toán",
      "Lê Văn C,Chuyên viên,Kỹ thuật"
    ].join("\n");

    const loadRes = adapter.setMailMergeData(csvData);
    if (loadRes.records.length !== 3) throw new Error("Không nạp được 3 dòng dữ liệu");

    // Chèn trường HoTen
    adapter.insertMergeField({ field: "HoTen" });
    // Chèn trường ChucVu
    adapter.insertMergeField({ field: "ChucVu" });

    const html = body.innerHTML;
    if (!html.includes('data-field="HoTen"')) throw new Error("Thiếu data-field='HoTen' trong DOM");
    if (!html.includes('data-field="ChucVu"')) throw new Error("Thiếu data-field='ChucVu' trong DOM");
    if (!html.includes("«HoTen»")) throw new Error("Thiếu marker «HoTen» trong DOM");
    if (!html.includes("«ChucVu»")) throw new Error("Thiếu marker «ChucVu» trong DOM");
    if (!html.includes('class="vno-merge-field"')) throw new Error("Thiếu class vno-merge-field trong DOM");
  });

  // Test 7: Preview Record 2
  await test("Writer Mail Merge: Xem trước dòng 2 hiển thị đúng dữ liệu dòng 2 (không phải dòng 1) và khôi phục khi tắt xem trước", async () => {
    const { page, body } = createMockWriterDoc(
      '<p>Kính gửi: <span class="vno-merge-field" data-field="HoTen" contenteditable="false">«HoTen»</span> - Chức vụ: <span class="vno-merge-field" data-field="ChucVu" contenteditable="false">«ChucVu»</span></p>'
    );
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen,ChucVu",
      "Nguyễn Văn A,Trưởng phòng",
      "Trần Thị B,Phó Giám đốc",
      "Lê Văn C,Chuyên viên"
    ].join("\n");
    adapter.setMailMergeData(csvData);

    // Bật xem trước cho bản ghi index 1 (dòng 2: Trần Thị B)
    adapter.toggleMailMergePreview({ force: true, recordIndex: 1 });

    const previewHtml = body.innerHTML;
    if (!previewHtml.includes("Trần Thị B")) throw new Error("Xem trước dòng 2 không hiển thị tên 'Trần Thị B'");
    if (!previewHtml.includes("Phó Giám đốc")) throw new Error("Xem trước dòng 2 không hiển thị chức vụ 'Phó Giám đốc'");
    if (previewHtml.includes("Nguyễn Văn A")) throw new Error("LỖI: Xem trước dòng 2 bị rò rỉ dữ liệu của dòng 1 ('Nguyễn Văn A')");

    // Tắt xem trước -> Khôi phục marker ban đầu
    adapter.toggleMailMergePreview({ force: false });
    const restoredHtml = body.innerHTML;
    if (!restoredHtml.includes("«HoTen»") || !restoredHtml.includes("«ChucVu»")) {
      throw new Error("Khi tắt xem trước không khôi phục lại thẻ marker «HoTen» và «ChucVu»");
    }
  });

  // Test 8: Record Navigation (Prev / Next)
  await test("Writer Mail Merge: Điều hướng bản ghi trước / sau cập nhật chính xác dữ liệu hiển thị", async () => {
    const { page, body } = createMockWriterDoc(
      '<p>Chào <span class="vno-merge-field" data-field="HoTen">«HoTen»</span></p>'
    );
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen",
      "Người 1",
      "Người 2",
      "Người 3"
    ].join("\n");
    adapter.setMailMergeData(csvData);

    // Bắt đầu preview từ record 0
    adapter.toggleMailMergePreview({ force: true, recordIndex: 0 });
    if (!body.innerHTML.includes("Người 1")) throw new Error("Record 0 phải hiện Người 1");

    // Next -> record 1
    adapter.nextMailMergeRecord();
    if (!body.innerHTML.includes("Người 2")) throw new Error("Next record phải hiện Người 2");

    // Next -> record 2
    adapter.nextMailMergeRecord();
    if (!body.innerHTML.includes("Người 3")) throw new Error("Next record phải hiện Người 3");

    // Next vượt biên -> vẫn ở record 2
    adapter.nextMailMergeRecord();
    if (!body.innerHTML.includes("Người 3")) throw new Error("Vượt biên cuối không được nhảy lỗi");

    // Prev -> record 1
    adapter.prevMailMergeRecord();
    if (!body.innerHTML.includes("Người 2")) throw new Error("Prev record phải hiện Người 2");
  });

  // Test 9: Finish & Merge (Generate N copies with page breaks)
  await test("Writer Mail Merge: Hoàn tất trộn sinh ra đúng 3 bản sao nội dung thật với ngắt trang page-break-before giữa các bản", async () => {
    const initialHtml = '<p>Kính gửi đồng chí <span class="vno-merge-field" data-field="HoTen">«HoTen»</span> giữ chức <span class="vno-merge-field" data-field="ChucVu">«ChucVu»</span> tại <span class="vno-merge-field" data-field="DonVi">«DonVi»</span>.</p>';
    const { page, body } = createMockWriterDoc(initialHtml);
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen,ChucVu,DonVi",
      "Nguyễn Văn A,Trưởng phòng,Sở TTTT",
      "Trần Thị B,Phó Giám đốc,Sở KHĐT",
      "Lê Văn C,Chuyên viên,UBND TP"
    ].join("\n");
    adapter.setMailMergeData(csvData);

    const success = adapter.finishMailMerge();
    if (!success) throw new Error("finishMailMerge trả về false");

    const finalHtml = body.innerHTML;

    // Phải có đủ dữ liệu 3 người
    if (!finalHtml.includes("Nguyễn Văn A") || !finalHtml.includes("Trưởng phòng") || !finalHtml.includes("Sở TTTT")) {
      throw new Error("Bản 1 thiếu dữ liệu của Nguyễn Văn A");
    }
    if (!finalHtml.includes("Trần Thị B") || !finalHtml.includes("Phó Giám đốc") || !finalHtml.includes("Sở KHĐT")) {
      throw new Error("Bản 2 thiếu dữ liệu của Trần Thị B");
    }
    if (!finalHtml.includes("Lê Văn C") || !finalHtml.includes("Chuyên viên") || !finalHtml.includes("UBND TP")) {
      throw new Error("Bản 3 thiếu dữ liệu của Lê Văn C");
    }

    // Không còn marker thô «HoTen»
    if (finalHtml.includes("«HoTen»") || finalHtml.includes("«ChucVu»")) {
      throw new Error("Tài liệu đã hoàn tất vẫn còn sót field marker chưa được thay thế");
    }

    // Phải có đúng 2 dấu ngắt trang page-break-before giữa 3 bản
    const breaks = (finalHtml.match(/page-break-before\s*:\s*always/gi) || []).length;
    if (breaks !== 2) {
      throw new Error(`Kỳ vọng 2 ngắt trang giữa 3 bản ghi, tìm thấy: ${breaks}`);
    }
  });

  // Test 10: Undo/Redo of Finish Merge
  await test("Writer Mail Merge: Hoàn tác sau khi trộn đưa tài liệu quay về trạng thái có field marker và làm lại khôi phục bản trộn", async () => {
    const initialHtml = '<p>Kính gửi: <span class="vno-merge-field" data-field="HoTen">«HoTen»</span></p>';
    const { page, body } = createMockWriterDoc(initialHtml);
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen",
      "Bản 1",
      "Bản 2",
      "Bản 3"
    ].join("\n");
    adapter.setMailMergeData(csvData);

    // Hoàn tất trộn
    adapter.finishMailMerge();
    if (!body.innerHTML.includes("Bản 1") || !body.innerHTML.includes("Bản 2")) {
      throw new Error("Trộn thư không thành công");
    }

    // Hoàn tác (Undo) -> Phải quay lại template với marker «HoTen»
    const undone = adapter.undo();
    if (!undone) throw new Error("Undo thất bại");
    if (!body.innerHTML.includes("«HoTen»")) {
      throw new Error("Sau khi Undo không khôi phục lại thẻ field marker «HoTen»");
    }
    if (body.innerHTML.includes("Bản 2") || body.innerHTML.includes("page-break-before")) {
      throw new Error("Sau khi Undo vẫn còn sót nội dung đã trộn hoặc ngắt trang");
    }

    // Làm lại (Redo) -> Phải khôi phục lại 3 bản trộn
    const redone = adapter.redo();
    if (!redone) throw new Error("Redo thất bại");
    if (!body.innerHTML.includes("Bản 1") || !body.innerHTML.includes("Bản 2") || !body.innerHTML.includes("Bản 3")) {
      throw new Error("Sau khi Redo không khôi phục lại 3 bản trộn");
    }
  });

  // Test 11: Undo/Redo Insert Merge Field
  await test("Writer Mail Merge: Hoàn tác làm biến mất thẻ merge field, làm lại khôi phục thẻ trọn vẹn", async () => {
    const { page, body } = createMockWriterDoc("<p>Đoạn mở đầu.</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    adapter.insertMergeField({ field: "ChucVu" });
    if (!body.innerHTML.includes("«ChucVu»")) throw new Error("Chèn trường thất bại");

    // Undo -> Mất trường
    adapter.undo();
    if (body.innerHTML.includes("«ChucVu»")) throw new Error("Sau khi Undo trường vẫn còn tồn tại");

    // Redo -> Khôi phục trường
    adapter.redo();
    if (!body.innerHTML.includes("«ChucVu»")) throw new Error("Sau khi Redo không khôi phục trường");
  });

  // Test 12: Export DOCX/PDF Sanitation
  await test("Writer Mail Merge: Export DOCX/PDF ở chế độ xem trước xuất đúng nội dung đã trộn của dòng đó; khi chưa trộn giữ nguyên field marker", async () => {
    const rawTemplate = '<p>Chào <span class="vno-merge-field" data-field="HoTen" contenteditable="false">«HoTen»</span></p>';
    const { page, body } = createMockWriterDoc(rawTemplate);
    const adapter = new WriterAdapter(page);
    adapter.attach();

    const csvData = [
      "HoTen",
      "Nguyễn Văn A",
      "Trần Thị B"
    ].join("\n");
    adapter.setMailMergeData(csvData);

    // Khi chưa xem trước: export phải giữ nguyên «HoTen» (không giả vờ đã trộn)
    const exportUnmerged = adapter._contentForExport();
    if (!exportUnmerged.includes("«HoTen»")) {
      throw new Error("Khi chưa trộn/chưa xem trước, export phải giữ nguyên «HoTen»");
    }

    // Khi đang xem trước dòng 2 (Trần Thị B): export phải xuất đúng nội dung dòng 2
    adapter.toggleMailMergePreview({ force: true, recordIndex: 1 });
    const exportPreview = adapter._contentForExport();
    if (!exportPreview.includes("Trần Thị B")) {
      throw new Error("Khi đang xem trước dòng 2, export phải xuất đúng nội dung của Trần Thị B");
    }
    if (exportPreview.includes("«HoTen»")) {
      throw new Error("Khi đang xem trước dòng 2, export không được để sót marker «HoTen»");
    }
  });

  // Test 13: Command Bus & args = null Safety (Lesson #3 Bug Protection)
  await test("Writer Mail Merge: Command Bus & handleDispatch tích hợp đầy đủ và xử lý an toàn khi args là null", async () => {
    const { page } = createMockWriterDoc("<p>Thử nghiệm Command Bus</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    // Gọi lần lượt các lệnh qua Command Bus với args = null (chính xác như khi bấm nút Ribbon)
    // Phải KHÔNG ném ngoại lệ TypeError: Cannot read properties of null
    try {
      await globalCommandBus.execute("writer.mailMerge.open", null);
      await globalCommandBus.execute("writer.mailMerge.insertField", null);
      await globalCommandBus.execute("writer.mailMerge.preview", null);
      await globalCommandBus.execute("writer.mailMerge.prevRecord", null);
      await globalCommandBus.execute("writer.mailMerge.nextRecord", null);
      await globalCommandBus.execute("writer.mailMerge.finish", null);
    } catch (err) {
      throw new Error(`Command Bus crash khi args là null: ${err.message}`);
    }

    // Kiểm tra điều phối qua adapter.handleDispatch
    const handledInsert = adapter.handleDispatch("writer.mailMerge.insertField", null);
    if (!handledInsert) throw new Error("handleDispatch không xử lý writer.mailMerge.insertField");
  });

  // Test 14: Validation & Empty State Protection
  await test("Writer Mail Merge: Báo lỗi an toàn và từ chối trộn khi chưa có dữ liệu hoặc tài liệu không có merge field", async () => {
    const { page } = createMockWriterDoc("<p>Văn bản thuần không có field</p>");
    const adapter = new WriterAdapter(page);
    adapter.attach();

    // 1. Chưa có dữ liệu CSV -> finishMailMerge phải trả về false
    const resNoData = adapter.finishMailMerge();
    if (resNoData !== false) throw new Error("Chưa có CSV mà vẫn cho trộn");

    // 2. Có dữ liệu CSV nhưng văn bản không chứa trường merge nào -> finishMailMerge phải trả về false
    adapter.setMailMergeData("HoTen\nNguyễn Văn A");
    const resNoFields = adapter.finishMailMerge();
    if (resNoFields !== false) throw new Error("Văn bản không có merge field mà vẫn cho trộn");
  });
  } finally {
    globalThis.document = originalDoc;
  }

  return results;
}
