/**
 * VN Office — Behavioral & Unit Tests: VN Writer Style Gallery & Watermark / Page Border
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { STYLE_PRESETS, showStyleGalleryDropdown, closeStyleGalleryDropdown, createStyleGalleryStrip } from "../../apps/writer/style-gallery.js";
import { showWatermarkDialog, showPageBorderDialog, WATERMARK_SUGGESTIONS } from "../../apps/writer/page-decorations.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno, getVnCommand } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
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

  get innerHTML() {
    if (this.children.length > 0) {
      return this.children.map(c => {
        const tag = c.tagName.toLowerCase();
        const cls = c.className ? ` class="${c.className}"` : "";
        const styleVal = c.getAttribute("style") || (c.style && Object.keys(c.style).length > 0 ? Object.entries(c.style).map(([k,v]) => `${k}:${v}`).join(";") : "");
        const styleAttr = styleVal ? ` style="${styleVal}"` : "";
        const dataKeys = Object.keys(c.dataset || {});
        let dataAttrs = "";
        for (const k of dataKeys) {
          const attrName = "data-" + k.replace(/([A-Z])/g, "-$1").toLowerCase();
          dataAttrs += ` ${attrName}="${c.dataset[k]}"`;
        }
        return `<${tag}${cls}${styleAttr}${dataAttrs}>${c.innerHTML}</${tag}>`;
      }).join("");
    }
    return this._innerHTML;
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const cls = this.className ? ` class="${this.className}"` : "";
    const styleVal = this.getAttribute("style") || (this.style && Object.keys(this.style).length > 0 ? Object.entries(this.style).map(([k,v]) => `${k}:${v}`).join(";") : "");
    const styleAttr = styleVal ? ` style="${styleVal}"` : "";
    return `<${tag}${cls}${styleAttr}>${this.innerHTML}</${tag}>`;
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._textContent = "";
    this.children = [];
    this._parseChildTags(val);
  }

  _parseChildTags(html) {
    const blockRegex = /<(p|h1|h2|h3|blockquote|div|span|table|tr|td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = blockRegex.exec(html)) !== null) {
      const tag = match[1];
      const attrStr = match[2];
      const inner = match[3];
      const child = new FakeElement(tag);
      const classMatch = attrStr.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const styleMatch = attrStr.match(/style=["']([^"']+)["']/i);
      if (styleMatch) child.setAttribute("style", styleMatch[1]);
      const dataMatch = attrStr.match(/data-([a-zA-Z0-9_-]+)=["']([^"']+)["']/g);
      if (dataMatch) {
        dataMatch.forEach(dm => {
          const parts = dm.match(/data-([a-zA-Z0-9_-]+)=["']([^"']+)["']/);
          if (parts) child.dataset[parts[1]] = parts[2];
        });
      }
      child.innerHTML = inner;
      child.parentNode = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    if (child) {
      child.parentNode = this;
      this.children.push(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      this.children[idx] = newChild;
      newChild.parentNode = this;
      oldChild.parentNode = null;
    }
    return oldChild;
  }

  setAttribute(name, val) { this.attributes[name] = String(val); }
  getAttribute(name) { return this.attributes[name] ?? null; }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const c of node.children) {
        let match = false;
        if (selector.startsWith(".") && c.classList.contains(selector.slice(1))) match = true;
        if (selector.toLowerCase() === c.tagName.toLowerCase()) match = true;
        if (selector.includes("[data-vno-watermark") && c.dataset.vnoWatermark) match = true;
        if (selector.includes("[data-vno-page-border") && c.dataset.vnoPageBorder) match = true;
        if (selector.includes("vno-print-preview-sheet") && c.classList.contains("vno-print-preview-sheet")) match = true;
        if (selector.includes("vno-print-preview-watermark") && c.classList.contains("vno-print-preview-watermark")) match = true;
        if (selector.includes("vno-print-preview-page-border") && c.classList.contains("vno-print-preview-page-border")) match = true;
        if (match) results.push(c);
        walk(c);
      }
    };
    walk(this);
    return results;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }
  dispatchEvent(event) {
    const fns = this.listeners[event?.type || event] || [];
    fns.forEach(fn => fn(event));
    return true;
  }

  focus() { this.focused = true; }
  click() { this.dispatchEvent({ type: "click", target: this }); }
}

function createMockEditor(bodyHtml = "<p>Nội dung thử nghiệm</p>") {
  const editor = new FakeElement("div");
  editor.className = "vno-writer-page";

  const header = new FakeElement("div");
  header.className = "vno-writer-header";
  header.innerHTML = "<p>Tiêu đề trang</p>";

  const body = new FakeElement("div");
  body.className = "vno-writer-body";
  body.innerHTML = bodyHtml;

  const footer = new FakeElement("div");
  footer.className = "vno-writer-footer";
  footer.innerHTML = "<p>Trang 1 / 1</p>";

  editor.appendChild(header);
  editor.appendChild(body);
  editor.appendChild(footer);

  return { editor, header, body, footer };
}

function setupMockEnvironment() {
  const origDoc = global.document;
  const origWin = global.window;

  const mockDoc = {
    createElement: (tag) => new FakeElement(tag),
    body: new FakeElement("body"),
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const mockWin = {
    innerWidth: 1200,
    innerHeight: 800,
    getSelection: () => null
  };

  global.document = mockDoc;
  global.window = mockWin;

  return () => {
    global.document = origDoc;
    global.window = origWin;
  };
}

export async function runWriterStyleGalleryWatermarkTests() {
  const results = [];
  const assert = (name, cond, msg = "") => {
    results.push({ name, pass: Boolean(cond), error: cond ? null : (msg || "Điều kiện kiểm thử không thỏa mãn") });
  };

  // TEST 1: Command declarations
  (() => {
    const cmdGallery = WRITER_COMMANDS.find(c => c.id === "writer.style.gallery");
    const cmdWatermark = WRITER_COMMANDS.find(c => c.id === "writer.page.watermark");
    const cmdBorder = WRITER_COMMANDS.find(c => c.id === "writer.page.border");

    assert(
      "Writer Style & Page: 3 command mới được khai báo chuẩn trong WRITER_COMMANDS",
      cmdGallery && cmdWatermark && cmdBorder &&
      cmdGallery.label === "Thư viện kiểu" &&
      cmdWatermark.label === "Hình mờ" &&
      cmdBorder.label === "Viền trang",
      "Thiếu khai báo command hoặc sai thông tin trong WRITER_COMMANDS"
    );
  })();

  // TEST 2: UNO command mapping
  (() => {
    const unoGallery = mapVnCommandToUno("writer.style.gallery");
    const unoWatermark = mapVnCommandToUno("writer.page.watermark");
    const unoBorder = mapVnCommandToUno("writer.page.border");

    const vnGallery = getVnCommand(".uno:DesignerDialog");
    const vnWatermark = getVnCommand(".uno:Watermark");
    const vnBorder = getVnCommand(".uno:BorderDialog");

    assert(
      "Writer Style & Page: Ánh xạ 2 chiều chuẩn xác sang các lệnh UNO của LibreOffice",
      unoGallery === ".uno:DesignerDialog" &&
      unoWatermark === ".uno:Watermark" &&
      unoBorder === ".uno:BorderDialog" &&
      vnGallery === "writer.style.gallery" &&
      vnWatermark === "writer.page.watermark" &&
      vnBorder === "writer.page.border",
      `Ánh xạ UNO không khớp: gallery=${unoGallery}, watermark=${unoWatermark}, border=${unoBorder}`
    );
  })();

  // TEST 3: Real SVG Icons
  (() => {
    const hasGalleryIcon = typeof ICONS.styleGallery === "string" && ICONS.styleGallery.includes("<svg");
    const hasWatermarkIcon = typeof ICONS.pageWatermark === "string" && ICONS.pageWatermark.includes("<svg");
    const hasBorderIcon = typeof ICONS.pageBorder === "string" && ICONS.pageBorder.includes("<svg");

    const isNonGeneric = !ICONS.styleGallery.includes('<circle cx="12" cy="12" r="4"/>') &&
                         !ICONS.pageWatermark.includes('<circle cx="12" cy="12" r="4"/>') &&
                         !ICONS.pageBorder.includes('<circle cx="12" cy="12" r="4"/>');

    assert(
      "Writer Style & Page: 3 icon SVG vector đa sắc chuẩn sắc nét hiện diện trong ICONS",
      hasGalleryIcon && hasWatermarkIcon && hasBorderIcon && isNonGeneric,
      "Icon bị thiếu hoặc dùng fallback generic circle"
    );
  })();

  // TEST 4: Ribbon Tabs integration
  (() => {
    const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
    const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");

    let hasGalleryInHome = false;
    let hasNoDuplicateStyleSelect = false;
    if (homeTab) {
      const stylesGroup = homeTab.groups.find(g => g.label === "Kiểu dáng");
      if (stylesGroup) {
        hasGalleryInHome = stylesGroup.items.some(it => it.commandId === "writer.style.gallery");
        // "Một tính năng, một cách hiển thị" (quy định chung 04/09/2026): nhóm Kiểu dáng
        // CHỈ được có nút mở thư viện + dải Quick Style tự chèn — KHÔNG được có thêm
        // dropdown <select> writer.style.apply song song (từng là lỗi UI thật, trùng
        // lặp 2 cách chọn cùng 1 việc). Đủ 6 style (kể cả quote/emphasis) đã được xác
        // nhận riêng ở TEST 5 qua STYLE_PRESETS — nguồn dữ liệu thật của dải Quick Style.
        hasNoDuplicateStyleSelect = !stylesGroup.items.some(it => it.type === "column" || it.type === "select");
      }
    }

    let hasWatermarkInLayout = false;
    let hasBorderInLayout = false;
    if (layoutTab) {
      const decGroup = layoutTab.groups.find(g => g.label === "Nền & Viền trang");
      if (decGroup) {
        hasWatermarkInLayout = decGroup.items.some(it => it.commandId === "writer.page.watermark");
        hasBorderInLayout = decGroup.items.some(it => it.commandId === "writer.page.border");
      }
    }

    assert(
      "Writer Style & Page: Hiện diện đầy đủ trên Ribbon tab Trang đầu (Kiểu dáng, không trùng lặp) và Bố cục (Nền & Viền trang)",
      hasGalleryInHome && hasNoDuplicateStyleSelect && hasWatermarkInLayout && hasBorderInLayout,
      "Ribbon structure chưa tích hợp đúng các command mới, hoặc nhóm Kiểu dáng bị trùng lặp cách hiển thị"
    );
  })();

  // TEST 5: Style Gallery Presets structure
  (() => {
    const ids = STYLE_PRESETS.map(p => p.id);
    const hasRequired6 = ["normal", "h1", "h2", "h3", "quote", "emphasis", "title"].every(id => ids.includes(id));
    const allHavePreviews = STYLE_PRESETS.every(p => Boolean(p.previewCss && p.previewSample && p.label));

    assert(
      "Writer Style Gallery: Tối thiểu 6 preset chuẩn Office với typography preview trực quan riêng biệt",
      hasRequired6 && allHavePreviews && STYLE_PRESETS.length >= 6,
      "Danh mục preset không đủ 6 loại hoặc thiếu thông số typography preview"
    );
  })();

  // TEST 6: Applying Presets (Heading 1, 2, 3, Quote, Emphasis, Normal)
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor("<p>Đoạn văn thử nghiệm phong cách</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      // Giả lập con trỏ ở đoạn văn đầu tiên
      global.window.getSelection = () => ({
        rangeCount: 1,
        anchorNode: body.children[0],
        getRangeAt: () => ({
          startContainer: body.children[0],
          collapsed: true,
          intersectsNode: node => node === body.children[0]
        })
      });

      // 1. Áp dụng Tiêu đề 2 (Heading 2)
      adapter._applyParagraphStyle("h2");
      const currentAfterH2 = body.children[0];
      const isH2 = currentAfterH2.tagName === "H2";

      // 2. Áp dụng Trích dẫn (Quote)
      adapter._applyParagraphStyle("quote");
      const currentAfterQuote = body.children[0];
      const isQuote = currentAfterQuote.tagName === "BLOCKQUOTE" && currentAfterQuote.classList.contains("vno-style-quote");

      // 3. Áp dụng Nhấn mạnh (Emphasis)
      adapter._applyParagraphStyle("emphasis");
      const currentAfterEmphasis = body.children[0];
      const isEmphasis = currentAfterEmphasis.classList.contains("vno-style-emphasis");

      // 4. Áp dụng quay về Normal
      adapter._applyParagraphStyle("normal");
      const currentAfterNormal = body.children[0];
      const isNormal = currentAfterNormal.tagName === "P" && !currentAfterNormal.classList.contains("vno-style-quote");

      // 5. 3T Doc Title remains a paragraph style, with visible Word-like title formatting.
      adapter._applyParagraphStyle("title");
      const currentAfterTitle = body.children[0];
      const isTitle = currentAfterTitle.tagName === "P"
        && currentAfterTitle.classList.contains("vno-style-title")
        && currentAfterTitle.style.fontSize === "26pt"
        && currentAfterTitle.style.textAlign === "center";

      assert(
        "Writer Style Gallery: Áp dụng trực tiếp đổi cấu trúc khối sang H2, Blockquote (Trích dẫn), Nhấn mạnh và Normal",
        isH2 && isQuote && isEmphasis && isNormal && isTitle,
        `Kết quả áp dụng style không khớp: h2=${isH2}, quote=${isQuote}, emphasis=${isEmphasis}, normal=${isNormal}, title=${isTitle}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 7: Style Gallery Active State detection
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor("<h1>Tiêu đề chính</h1><h2>Mục tiêu</h2><blockquote>Trích dẫn luật</blockquote>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      // Đặt con trỏ vào H1
      global.window.getSelection = () => ({ rangeCount: 1, anchorNode: body.children[0] });
      const style1 = adapter.getCurrentParagraphStyle();

      // Đặt con trỏ vào H2
      global.window.getSelection = () => ({ rangeCount: 1, anchorNode: body.children[1] });
      const style2 = adapter.getCurrentParagraphStyle();

      // Đặt con trỏ vào Blockquote
      global.window.getSelection = () => ({ rangeCount: 1, anchorNode: body.children[2] });
      const style3 = adapter.getCurrentParagraphStyle();

      assert(
        "Writer Style Gallery: Tự động nhận diện chính xác kiểu dáng đoạn văn tại vị trí con trỏ (H1, H2, Quote)",
        style1 === "h1" && style2 === "h2" && style3 === "quote",
        `Nhận diện style không khớp: s1=${style1}, s2=${style2}, s3=${style3}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 8: Style Gallery Undo & Redo
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor("<p>Nội dung ban đầu</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      global.window.getSelection = () => ({ rangeCount: 1, anchorNode: body.children[0] });

      // Đổi sang H2
      adapter._applyParagraphStyle("h2");
      assert(
        "Writer Style Gallery: Áp dụng H2 đổi thẻ khối sang H2 thành công",
        body.children[0].tagName === "H2"
      );

      // Hoàn tác (Undo)
      adapter.undo();
      assert(
        "Writer Style Gallery: Hoàn tác đưa đoạn văn trở lại thẻ P ban đầu",
        body.children[0].tagName === "P"
      );

      // Làm lại (Redo)
      adapter.redo();
      assert(
        "Writer Style Gallery: Làm lại khôi phục chuẩn xác thẻ H2",
        body.children[0].tagName === "H2"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 9: Watermark apply & DOM overlay
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Tài liệu hành chính</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setWatermark({
        text: "DỰ THẢO",
        color: "#dc2626",
        opacity: 0.25,
        angle: 45
      });

      const wmOverlay = editor.querySelector(".vno-page-watermark");
      const hasText = wmOverlay && wmOverlay.textContent.includes("DỰ THẢO");
      const stateMatches = adapter.watermark && adapter.watermark.text === "DỰ THẢO" && adapter.watermark.opacity === 0.25;

      assert(
        "Writer Watermark: Đặt hình mờ 'DỰ THẢO' tạo layer overlay mờ xoay chéo 45 độ trên trang soạn thảo",
        Boolean(wmOverlay && hasText && stateMatches),
        "Hình mờ không được tạo hoặc nội dung không khớp"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 10: Watermark Undo & Redo
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Văn bản bảo mật</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setWatermark({ text: "MẬT", color: "#dc2626" });
      assert(
        "Writer Watermark: Đặt hình mờ 'MẬT' thành công",
        Boolean(editor.querySelector(".vno-page-watermark"))
      );

      // Undo
      adapter.undo();
      assert(
        "Writer Watermark: Hoàn tác làm biến mất hình mờ trên DOM và đưa state về null",
        !editor.querySelector(".vno-page-watermark") && adapter.watermark === null
      );

      // Redo
      adapter.redo();
      assert(
        "Writer Watermark: Làm lại khôi phục hình mờ 'MẬT' trọn vẹn",
        Boolean(editor.querySelector(".vno-page-watermark")) && adapter.watermark?.text === "MẬT"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 11: Watermark Clear / Remove
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Văn bản hành chính</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setWatermark({ text: "KHẨN" });
      assert("Writer Watermark: Có watermark KHẨN", Boolean(editor.querySelector(".vno-page-watermark")));

      adapter.clearWatermark();
      assert(
        "Writer Watermark: Lệnh xóa hình mờ gỡ bỏ hoàn toàn khỏi DOM và hỗ trợ undo",
        !editor.querySelector(".vno-page-watermark") && adapter.watermark === null
      );

      adapter.undo();
      assert(
        "Writer Watermark: Hoàn tác xóa hình mờ khôi phục lại KHẨN",
        Boolean(editor.querySelector(".vno-page-watermark")) && adapter.watermark?.text === "KHẨN"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 12: Watermark repeated on EVERY page in Print Preview
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      // Giả lập văn bản dài nhiều trang
      let multiPageHtml = "";
      for (let i = 1; i <= 3; i++) {
        multiPageHtml += `<div style="page-break-before:always;"><p>Nội dung trang ${i}</p></div>`;
      }
      const { editor } = createMockEditor(multiPageHtml);
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setWatermark({ text: "DỰ THẢO", color: "#dc2626", opacity: 0.2 });

      // Mở Print Preview
      const previewOverlay = adapter.openPrintPreview();
      assert("Writer Print Preview: Mở overlay xem trước thành công", Boolean(previewOverlay));

      const sheets = previewOverlay ? previewOverlay.querySelectorAll(".vno-print-preview-sheet") : [];
      const totalSheets = sheets.length;

      let allSheetsHaveWatermark = totalSheets > 0;
      for (const sh of sheets) {
        const wm = sh.querySelector(".vno-print-preview-watermark");
        if (!wm || !wm.textContent.includes("DỰ THẢO")) {
          allSheetsHaveWatermark = false;
          break;
        }
      }

      assert(
        "Writer Print Preview: Watermark 'DỰ THẢO' lặp lại chính xác trên MỌI trang in (không chỉ trang 1)",
        totalSheets >= 2 && allSheetsHaveWatermark,
        `Tổng trang: ${totalSheets}, tất cả có watermark: ${allSheetsHaveWatermark}`
      );

      adapter.closePrintPreview();
    } finally {
      cleanup();
    }
  })();

  // TEST 13: Page Border apply, style & DOM frame
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Văn bản có viền trang</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setPageBorder({
        enabled: true,
        style: "double",
        width: 3,
        color: "#0f4c81"
      });

      const borderFrame = editor.querySelector(".vno-page-border-frame");
      const hasBorder = borderFrame && borderFrame.style.border.includes("double");
      const stateMatches = adapter.pageBorder && adapter.pageBorder.enabled && adapter.pageBorder.style === "double";

      assert(
        "Writer Page Border: Áp dụng viền đôi 3pt màu xanh tạo khung bao quanh mép trang in",
        Boolean(borderFrame && hasBorder && stateMatches),
        "Khung viền trang không được tạo hoặc thuộc tính border không khớp"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 14: Page Border Undo & Redo
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Văn bản viền trang</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setPageBorder({ enabled: true, style: "solid", width: 2, color: "#1e293b" });
      assert("Writer Page Border: Thiết lập viền thành công", Boolean(editor.querySelector(".vno-page-border-frame")));

      adapter.undo();
      assert(
        "Writer Page Border: Hoàn tác làm biến mất viền trang trên DOM và tắt trạng thái enabled",
        !editor.querySelector(".vno-page-border-frame") && adapter.pageBorder.enabled === false
      );

      adapter.redo();
      assert(
        "Writer Page Border: Làm lại khôi phục hoàn hảo khung viền trang",
        Boolean(editor.querySelector(".vno-page-border-frame")) && adapter.pageBorder.enabled === true
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 15: Page Border repeated on EVERY page in Print Preview
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      let multiPageHtml = "";
      for (let i = 1; i <= 3; i++) {
        multiPageHtml += `<div style="page-break-before:always;"><p>Đoạn văn trang ${i}</p></div>`;
      }
      const { editor } = createMockEditor(multiPageHtml);
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setPageBorder({ enabled: true, style: "solid", width: 2, color: "#0f4c81" });

      const previewOverlay = adapter.openPrintPreview();
      const sheets = previewOverlay ? previewOverlay.querySelectorAll(".vno-print-preview-sheet") : [];
      const totalSheets = sheets.length;

      let allSheetsHaveBorder = totalSheets > 0;
      for (const sh of sheets) {
        const border = sh.querySelector(".vno-print-preview-page-border");
        if (!border) {
          allSheetsHaveBorder = false;
          break;
        }
      }

      assert(
        "Writer Print Preview: Viền trang (Page Border) lặp lại chính xác trên MỌI trang in xem trước",
        totalSheets >= 2 && allSheetsHaveBorder,
        `Tổng trang preview: ${totalSheets}, tất cả có viền: ${allSheetsHaveBorder}`
      );

      adapter.closePrintPreview();
    } finally {
      cleanup();
    }
  })();

  // TEST 16: Null args safety via CommandBus (Lesson 3)
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Kiểm tra lệnh null args</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      let noCrash = true;
      try {
        // Khi ribbon button gọi globalCommandBus.execute(commandId) không tham số thứ 2
        globalCommandBus.execute("writer.style.gallery");
        globalCommandBus.execute("writer.page.watermark");
        globalCommandBus.execute("writer.page.border");
        adapter.handleDispatch("writer.style.gallery", null);
        adapter.handleDispatch("writer.page.watermark", null);
        adapter.handleDispatch("writer.page.border", null);
      } catch (err) {
        noCrash = false;
      }

      assert(
        "Writer Style & Page: Command Bus và handleDispatch xử lý an toàn tuyệt đối khi args là null (Lesson 3)",
        noCrash,
        "Gặp ngoại lệ khi gọi handler với args = null"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 17: Content Export retains Page Border in @page and Watermark layer
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Nội dung cần xuất DOCX/PDF</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setWatermark({ text: "MẬT", color: "#dc2626", opacity: 0.3, angle: 45 });
      adapter.setPageBorder({ enabled: true, style: "solid", width: 2, color: "#0f4c81" });

      const exportHtml = adapter._contentForExport();

      const hasPageBorderCss = exportHtml.includes("@page") && exportHtml.includes("border:") && exportHtml.includes("#0f4c81");
      const hasWatermarkFixed = exportHtml.includes("vno-export-watermark") && exportHtml.includes("MẬT") && exportHtml.includes("position:fixed");

      assert(
        "Writer Export: _contentForExport giữ nguyên cấu hình viền trong @page CSS và watermark fixed layer cho DOCX/PDF",
        hasPageBorderCss && hasWatermarkFixed,
        `Thiếu thành phần export: pageBorder=${hasPageBorderCss}, watermark=${hasWatermarkFixed}`
      );
    } finally {
      cleanup();
    }
  })();

  return results;
}
