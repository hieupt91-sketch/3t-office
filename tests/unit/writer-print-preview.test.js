/**
 * VN Office — Unit & Behavioral Tests for Writer Print Preview
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";

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
      return this.children.map(c => c.outerHTML).join("\n");
    }
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._parseChildHtml(this._innerHTML);
  }

  _parseChildHtml(html) {
    this.children = [];
    if (!html || typeof html !== "string") return;

    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1] || match[4];
      const rawAttrs = match[2] || match[5] || "";
      const innerContent = match[3] || "";

      const child = new FakeElement(tagName);

      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];

      const dataRegex = /data-([a-zA-Z0-9\-]+)=["']([^"']+)["']/g;
      let dMatch;
      while ((dMatch = dataRegex.exec(rawAttrs)) !== null) {
        const camelKey = dMatch[1].replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        child.dataset[camelKey] = dMatch[2];
      }

      const styleMatch = rawAttrs.match(/style=["']([^"']+)["']/i);
      if (styleMatch) {
        const styleParts = styleMatch[1].split(";");
        for (const part of styleParts) {
          const [k, v] = part.split(":");
          if (k && v) {
            const camelProp = k.trim().replace(/-([a-z])/g, (_, l) => l.toUpperCase());
            child.style[camelProp] = v.trim();
          }
        }
      }

      if (/disabled\b/i.test(rawAttrs)) child.disabled = true;

      const valMatch = rawAttrs.match(/value=["']([^"']+)["']/i);
      if (valMatch) child.value = valMatch[1];

      child.innerHTML = innerContent;
      child.parentNode = this;
      this.children.push(child);
    }
  }

  get firstChild() { return this.children[0] || null; }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      this.dataset[camelKey] = String(value);
    }
  }
  getAttribute(name) {
    if (name === "class") return this.className || null;
    if (name === "style") return Object.entries(this.style).map(([k, v]) => `${k}:${v}`).join("; ") || null;
    if (name.startsWith("data-")) {
      const camelKey = name.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
      return this.dataset[camelKey] || null;
    }
    return this.attributes[name] || null;
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
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) h(event);
  }
  click() {
    this.dispatchEvent({ type: "click", target: this, stopPropagation: () => {}, preventDefault: () => {} });
  }
  contains(node) {
    return node === this || this.children.some(child => child.contains?.(node));
  }
  _matches(selector) {
    if (!selector) return false;
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return this.classList.contains(className);
    }
    if (selector.startsWith("#")) {
      return this.attributes.id === selector.slice(1);
    }
    if (selector.startsWith("[")) {
      const attrMatch = selector.match(/\[([a-zA-Z0-9\-]+)(?:=["']?([^"'\]]+)["']?)?\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const attrVal = attrMatch[2];
        const actual = this.getAttribute(attrName);
        if (actual === null) return false;
        return attrVal === undefined || actual === attrVal;
      }
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results[0] || null;
  }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  focus() {}
  scrollIntoView() { this.scrolled = true; }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
    this.listeners = {};
  }
  createElement(tag) {
    return new FakeElement(tag);
  }
  addEventListener(type, handler, capture) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  removeEventListener(type, handler, capture) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(h => h !== handler);
  }
  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) h(event);
  }
  querySelector(selector) {
    return this.body.querySelector(selector);
  }
  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

export async function runWriterPrintPreviewTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  try {
    const fakeDoc = new FakeDocument();
    globalThis.document = fakeDoc;
    let windowPrintCalled = false;
    globalThis.window = {
      print: () => { windowPrintCalled = true; },
      getSelection: () => null
    };

    await test("Writer Print Preview: command được khai báo chuẩn trong command-definitions.js", async () => {
      const def = WRITER_COMMANDS.find(c => c.id === "writer.file.printPreview");
      if (!def) throw new Error("Không tìm thấy lệnh writer.file.printPreview trong WRITER_COMMANDS");
      if (def.category !== "file") throw new Error(`Category sai: ${def.category}`);
      if (!def.label.includes("Xem trước khi in")) throw new Error(`Label sai: ${def.label}`);
      if (def.shortcut !== "Ctrl+F2") throw new Error(`Shortcut sai: ${def.shortcut}`);
      if (def.icon !== "printPreview") throw new Error(`Icon sai: ${def.icon}`);
    });

    await test("Writer Print Preview: ánh xạ đúng .uno:PrintPreview trong command-dispatch-mapper.js", async () => {
      const unoCmd = mapVnCommandToUno("writer.file.printPreview");
      if (unoCmd !== ".uno:PrintPreview") {
        throw new Error(`Ánh xạ sai: mong đợi .uno:PrintPreview nhưng nhận được ${unoCmd}`);
      }
    });

    await test("Writer Print Preview: hiện diện trong ribbon tab 'Bố cục' nhóm 'In ấn'", async () => {
      const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");
      if (!layoutTab) throw new Error("Không tìm thấy tab 'layout'");
      const printGroup = layoutTab.groups.find(g => g.label === "In ấn");
      if (!printGroup) throw new Error("Không tìm thấy nhóm 'In ấn' trong tab Bố cục");
      const hasPreviewBtn = printGroup.items.some(item => item.commandId === "writer.file.printPreview");
      if (!hasPreviewBtn) throw new Error("Thiếu nút writer.file.printPreview trong nhóm In ấn");
      const hasPrintBtn = printGroup.items.some(item => item.commandId === "common.file.print");
      if (!hasPrintBtn) throw new Error("Thiếu nút common.file.print cạnh nút Xem trước");
    });

    await test("Writer Print Preview: getPageDimensions phản ánh đúng cấu hình A4 Portrait mặc định", async () => {
      const editorDom = new FakeElement("div");
      const adapter = new WriterAdapter(editorDom);
      const dims = adapter.getPageDimensions();

      if (dims.sizeKey !== "a4") throw new Error(`sizeKey sai: ${dims.sizeKey}`);
      if (dims.isLandscape !== false) throw new Error("Mặc định phải là portrait");
      if (dims.widthMm !== 210 || dims.heightMm !== 297) {
        throw new Error(`Kích thước mm sai: ${dims.widthMm}x${dims.heightMm}`);
      }
      if (dims.margins.top !== 20 || dims.margins.bottom !== 20 || dims.margins.left !== 30 || dims.margins.right !== 15) {
        throw new Error("Lề mặc định NĐ 30 sai");
      }
    });

    await test("Writer Print Preview: đổi Page Setup sang Letter Landscape phản ánh chính xác trong preview (không cố định A4)", async () => {
      const editorDom = new FakeElement("div");
      editorDom.className = "vno-writer-page";
      const body = new FakeElement("div");
      body.className = "vno-writer-body";
      body.innerHTML = "<p>Nội dung kiểm thử khổ giấy Letter Landscape</p>";
      editorDom.appendChild(body);

      const adapter = new WriterAdapter(editorDom);
      adapter.pageSetup = {
        size: "letter",
        orientation: "landscape",
        margins: { top: 15, bottom: 15, left: 25, right: 25 }
      };

      const overlay = adapter.openPrintPreview();
      if (!overlay) throw new Error("openPrintPreview không trả về overlay");

      if (overlay.dataset.paperSize !== "letter") {
        throw new Error(`paperSize sai: ${overlay.dataset.paperSize}, mong đợi 'letter'`);
      }
      if (overlay.dataset.paperOrientation !== "landscape") {
        throw new Error(`paperOrientation sai: ${overlay.dataset.paperOrientation}, mong đợi 'landscape'`);
      }
      if (overlay.dataset.widthMm !== "279.4" || overlay.dataset.heightMm !== "215.9") {
        throw new Error(`Kích thước mm sai: ${overlay.dataset.widthMm}x${overlay.dataset.heightMm}, mong đợi 279.4x215.9`);
      }

      const sheet = overlay.querySelector(".vno-print-preview-sheet");
      if (!sheet) throw new Error("Không tìm thấy .vno-print-preview-sheet trong overlay");
      if (sheet.dataset.paperSize !== "letter" || sheet.dataset.paperOrientation !== "landscape") {
        throw new Error("Sheet không lưu đúng data-paper-size hoặc orientation");
      }
      if (sheet.dataset.pageWidthMm !== "279.4" || sheet.dataset.pageHeightMm !== "215.9") {
        throw new Error("Sheet không lưu đúng kích thước mm Letter Landscape");
      }

      adapter.closePrintPreview();
    });

    await test("Writer Print Preview: hiển thị đúng nội dung thật từ header, body và footer", async () => {
      const editorDom = new FakeElement("div");
      editorDom.className = "vno-writer-page";

      const header = new FakeElement("div");
      header.className = "vno-writer-header";
      header.innerHTML = "<p>TIÊU ĐỀ ĐẦU TRANG XÁC THỰC</p>";

      const body = new FakeElement("div");
      body.className = "vno-writer-body";
      body.innerHTML = "<h1>QUYẾT ĐỊNH BAN HÀNH</h1><p>Nội dung văn bản chính thống.</p>";

      const footer = new FakeElement("div");
      footer.className = "vno-writer-footer";
      footer.innerHTML = "<p>Trang 1 / 1</p>";

      editorDom.appendChild(header);
      editorDom.appendChild(body);
      editorDom.appendChild(footer);

      const adapter = new WriterAdapter(editorDom);
      const overlay = adapter.openPrintPreview();

      const previewHeader = overlay.querySelector(".vno-print-preview-header");
      if (!previewHeader || !previewHeader.textContent.includes("TIÊU ĐỀ ĐẦU TRANG XÁC THỰC")) {
        throw new Error("Header không hiển thị trong bản xem trước");
      }

      const previewBody = overlay.querySelector(".vno-print-preview-body");
      if (!previewBody || !previewBody.textContent.includes("QUYẾT ĐỊNH BAN HÀNH")) {
        throw new Error("Body không hiển thị trong bản xem trước");
      }

      const previewFooter = overlay.querySelector(".vno-print-preview-footer");
      if (!previewFooter || !previewFooter.textContent.includes("Trang 1 / 1")) {
        throw new Error("Footer không hiển thị trong bản xem trước");
      }

      adapter.closePrintPreview();
    });

    await test("Writer Print Preview: phân trang nhiều trang khi có ngắt trang (Page Break) và điều hướng", async () => {
      const editorDom = new FakeElement("div");
      editorDom.className = "vno-writer-page";

      const body = new FakeElement("div");
      body.className = "vno-writer-body";
      body.innerHTML = `
        <p>Đoạn văn trang 1</p>
        <div style="page-break-before:always;">--- Phân tách trang (Page Break) ---</div>
        <p>Đoạn văn trang 2</p>
      `;
      editorDom.appendChild(body);

      const adapter = new WriterAdapter(editorDom);
      const overlay = adapter.openPrintPreview();

      if (overlay.dataset.pageCount !== "2") {
        throw new Error(`Tổng số trang sai: ${overlay.dataset.pageCount}, mong đợi 2`);
      }

      const sheets = overlay.querySelectorAll(".vno-print-preview-sheet");
      if (sheets.length !== 2) {
        throw new Error(`Số lượng sheets render sai: ${sheets.length}, mong đợi 2`);
      }

      // Kiểm tra trạng thái active ban đầu
      if (overlay.dataset.activePage !== "1") throw new Error("Trang khởi đầu phải là 1");
      if (!sheets[0].classList.contains("is-active")) throw new Error("Trang 1 phải có class is-active");

      // Điều hướng sang trang 2
      adapter.goToPreviewPage(2);
      if (overlay.dataset.activePage !== "2") throw new Error("dataset.activePage chưa cập nhật lên 2");
      if (!sheets[1].classList.contains("is-active")) throw new Error("Trang 2 phải có class is-active sau khi chuyển");
      if (sheets[0].classList.contains("is-active")) throw new Error("Trang 1 không được còn class is-active");

      // Nút điều hướng
      const btnPrev = overlay.querySelector(".vno-print-preview-nav-prev");
      const btnNext = overlay.querySelector(".vno-print-preview-nav-next");
      if (btnNext.disabled !== true) throw new Error("Tại trang cuối (2/2) nút Next phải bị disabled");
      if (btnPrev.disabled !== false) throw new Error("Tại trang 2/2 nút Prev phải enabled");

      // Quay về trang 1
      adapter.goToPreviewPage(1);
      if (overlay.dataset.activePage !== "1") throw new Error("Quay về trang 1 thất bại");
      if (btnPrev.disabled !== true) throw new Error("Tại trang 1/2 nút Prev phải disabled");

      adapter.closePrintPreview();
    });

    await test("Writer Print Preview: nút 'In tài liệu' kích hoạt window.print() thật", async () => {
      const editorDom = new FakeElement("div");
      const adapter = new WriterAdapter(editorDom);
      windowPrintCalled = false;

      const overlay = adapter.openPrintPreview();
      const printBtn = overlay.querySelector(".vno-print-preview-btn-print");
      if (!printBtn) throw new Error("Không tìm thấy nút In trong preview toolbar");

      printBtn.click();
      if (!windowPrintCalled) throw new Error("window.print() chưa được gọi khi click nút In");

      adapter.closePrintPreview();
    });

    await test("Writer Print Preview: đóng preview bằng phím Escape và nút X", async () => {
      const editorDom = new FakeElement("div");
      const adapter = new WriterAdapter(editorDom);

      // Đóng bằng nút X
      const overlay1 = adapter.openPrintPreview();
      if (!fakeDoc.body.contains(overlay1)) throw new Error("Overlay chưa được mount vào body");

      const closeBtn = overlay1.querySelector(".vno-print-preview-close-btn");
      if (!closeBtn) throw new Error("Không tìm thấy nút close");
      closeBtn.click();

      if (fakeDoc.body.contains(overlay1)) throw new Error("Overlay chưa được gỡ khỏi DOM sau khi bấm nút X");
      if (adapter.printPreviewOverlay !== null) throw new Error("printPreviewOverlay reference chưa được null hóa");

      // Đóng bằng phím Escape
      const overlay2 = adapter.openPrintPreview();
      fakeDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault: () => {}, stopPropagation: () => {} });

      if (fakeDoc.body.contains(overlay2)) throw new Error("Overlay chưa được gỡ khỏi DOM sau khi bấm phím Escape");
    });

    await test("Writer Print Preview: tích hợp đầy đủ qua handleDispatch và Command Bus", async () => {
      const editorDom = new FakeElement("div");
      const adapter = new WriterAdapter(editorDom);
      adapter.attach();

      // Dispatch qua UNO
      const handledUno = await adapter.handleDispatch(".uno:PrintPreview", null, "writer.file.printPreview");
      if (!handledUno) throw new Error("handleDispatch với .uno:PrintPreview trả về false");
      if (!adapter.printPreviewOverlay) throw new Error("Chưa mở overlay khi dispatch qua UNO");
      adapter.closePrintPreview();

      // Dispatch qua Command Bus
      const busResult = await globalCommandBus.execute("writer.file.printPreview");
      if (!adapter.printPreviewOverlay) throw new Error("Command Bus execute writer.file.printPreview không mở preview");
      adapter.closePrintPreview();
    });

    await test("Writer Print Preview: _normalizePreviewFooterTables chuẩn hóa tỷ lệ cột bảng footer Word có badge cam", async () => {
      const editorDom = new FakeElement("div");
      const adapter = new WriterAdapter(editorDom);
      const inputTable = '<table width="626"><colgroup><col width="209"><col width="209"><col width="209"></colgroup><tbody><tr><td style="background: #ed7c31">HƯỚNG DẪN SỬ DỤNG PHẦN MỀM CHẤM CÔNG MYTIME</td></tr></tbody></table>';
      const output = adapter._normalizePreviewFooterTables(inputTable);
      if (!output.includes('<col width="50">') || !output.includes('<col width="537">') || !output.includes('<col width="39">')) {
        throw new Error(`_normalizePreviewFooterTables không chuẩn hóa đúng 3 cột 50/537/39: ${output}`);
      }

      // Không đổi bảng thường
      const normalTable = '<table width="600"><colgroup><col width="200"><col width="200"><col width="200"></colgroup><tbody><tr><td>Bảng thường</td></tr></tbody></table>';
      const unchanged = adapter._normalizePreviewFooterTables(normalTable);
      if (unchanged !== normalTable) {
        throw new Error("Bảng thường không được phép bị thay đổi tỷ lệ");
      }
    });

  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }

  return results;
}
