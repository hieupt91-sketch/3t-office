/**
 * VN Office — Behavioral & Unit Tests: VN Writer Columns (Chia cột văn bản)
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { COLUMN_PRESETS, showColumnsDialog } from "../../apps/writer/columns-dialog.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno, getVnCommand } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WRITER_COMMANDS, registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

// Khởi tạo các command definitions trên Command Bus
registerAllStandardCommands(globalCommandBus);

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(...names) { const items = this._items(); names.forEach(n => items.add(n)); this.owner.className = [...items].join(" "); }
  remove(...names) { const items = this._items(); names.forEach(n => items.delete(n)); this.owner.className = [...items].join(" "); }
  contains(name) { return this._items().has(name); }
  toggle(name, force) {
    const shouldAdd = typeof force === "boolean" ? force : !this.contains(name);
    if (shouldAdd) this.add(name);
    else this.remove(name);
    return shouldAdd;
  }
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
    this.checked = false;
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
        const idAttr = c.attributes.id ? ` id="${c.attributes.id}"` : "";
        const styleVal = c.getAttribute("style") || (c.style && Object.keys(c.style).length > 0 ? Object.entries(c.style).map(([k,v]) => `${k}:${v}`).join(";") : "");
        const styleAttr = styleVal ? ` style="${styleVal}"` : "";
        const dataKeys = Object.keys(c.dataset || {});
        let dataAttrs = "";
        for (const k of dataKeys) {
          const attrName = "data-" + k.replace(/([A-Z])/g, "-$1").toLowerCase();
          dataAttrs += ` ${attrName}="${c.dataset[k]}"`;
        }
        if (tag === "input") {
          return `<${tag}${idAttr}${cls}${styleAttr}${dataAttrs} />`;
        }
        return `<${tag}${idAttr}${cls}${styleAttr}${dataAttrs}>${c.innerHTML}</${tag}>`;
      }).join("");
    }
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._textContent = "";
    this.children = [];
    this._parseChildTags(val);
  }

  _parseChildTags(html) {
    const blockRegex = /<(p|h1|h2|h3|blockquote|div|span|table|tr|td|th|button|label)\b([^>]*)>([\s\S]*?)<\/\1>|<(input)\b([^>]*?)\/?>/gi;
    let match;
    while ((match = blockRegex.exec(html)) !== null) {
      const tag = match[1] || match[4];
      const attrStr = match[2] || match[5] || "";
      const inner = match[3] || "";
      const child = new FakeElement(tag);
      const classMatch = attrStr.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const idMatch = attrStr.match(/id=["']([^"']+)["']/i);
      if (idMatch) child.attributes.id = idMatch[1];
      const valMatch = attrStr.match(/value=["']([^"']+)["']/i);
      if (valMatch) child.value = valMatch[1];
      const checkedMatch = attrStr.match(/\bchecked\b/i);
      if (checkedMatch) child.checked = true;
      const styleMatch = attrStr.match(/style=["']([^"']+)["']/i);
      if (styleMatch) child.setAttribute("style", styleMatch[1]);
      const dataMatch = attrStr.match(/data-([a-zA-Z0-9_-]+)=["']([^"']+)["']/g);
      if (dataMatch) {
        for (const dm of dataMatch) {
          const m = dm.match(/data-([a-zA-Z0-9_-]+)=["']([^"']+)["']/);
          if (m) {
            const camelKey = m[1].replace(/-([a-z])/g, (_, l) => l.toUpperCase());
            child.dataset[camelKey] = m[2];
          }
        }
      }
      if (inner) child.innerHTML = inner;
      child.parentNode = this;
      this.children.push(child);
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
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

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }

  dispatchEvent(event) {
    const list = this.listeners[event?.type || event] || [];
    list.forEach(fn => fn(event));
    return true;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === "class") this.className = String(val);
    if (name === "style") {
      const parts = String(val).split(";");
      for (const p of parts) {
        const [k, v] = p.split(":").map(s => s.trim());
        if (k && v) {
          const camel = k.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          this.style[camel] = v;
        }
      }
    }
  }

  getAttribute(name) {
    if (name === "class") return this.className || null;
    if (name === "style") {
      if (!this.style || Object.keys(this.style).length === 0) return null;
      return Object.entries(this.style).map(([k,v]) => `${k}:${v}`).join(";");
    }
    return this.attributes[name] || null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  querySelector(sel) {
    return this._queryInternal(sel, false);
  }

  querySelectorAll(sel) {
    const res = [];
    this._queryInternal(sel, true, res);
    return res;
  }

  _queryInternal(sel, all = false, results = []) {
    for (const c of this.children) {
      let match = false;
      if (sel.startsWith(".")) {
        const cls = sel.slice(1);
        if (c.classList.contains(cls)) match = true;
      } else if (sel.startsWith("#")) {
        const id = sel.slice(1);
        if (c.attributes.id === id) match = true;
      } else if (sel.includes("[data-")) {
        const keyMatch = sel.match(/\[data-([a-zA-Z0-9_-]+)(?:=["']?([^"']+)["']?)?\]/);
        if (keyMatch) {
          const camelKey = keyMatch[1].replace(/-([a-z])/g, (_, l) => l.toUpperCase());
          const val = keyMatch[2];
          if (val !== undefined) {
            if (c.dataset[camelKey] === val) match = true;
          } else if (c.dataset[camelKey] !== undefined) {
            match = true;
          }
        }
      } else if (c.tagName.toLowerCase() === sel.toLowerCase()) {
        match = true;
      }

      if (match) {
        if (!all) return c;
        results.push(c);
      }
      const sub = c._queryInternal(sel, all, results);
      if (!all && sub) return sub;
    }
    return all ? results : null;
  }

  focus() {}
  click() {
    this.dispatchEvent("click");
  }
}

function setupMockEnvironment() {
  const originalDoc = globalThis.document;
  const originalWindow = globalThis.window;
  const originalEvent = globalThis.Event;

  const mockBody = new FakeElement("body");
  const eventListeners = {};

  globalThis.document = {
    body: mockBody,
    createElement: (tag) => new FakeElement(tag),
    addEventListener: (type, fn) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      if (!eventListeners[type]) return;
      eventListeners[type] = eventListeners[type].filter(l => l !== fn);
    },
    dispatchEvent: (evt) => {
      const list = eventListeners[evt.type] || [];
      list.forEach(f => f(evt));
      return true;
    },
    querySelector: (sel) => mockBody.querySelector(sel),
    querySelectorAll: (sel) => mockBody.querySelectorAll(sel)
  };

  globalThis.window = {
    document: globalThis.document,
    getSelection: () => ({ rangeCount: 0 })
  };

  globalThis.Event = class {
    constructor(type, opts = {}) {
      this.type = type;
      this.bubbles = Boolean(opts.bubbles);
    }
  };

  return () => {
    globalThis.document = originalDoc;
    globalThis.window = originalWindow;
    globalThis.Event = originalEvent;
  };
}

function createMockEditor(bodyContentHtml = "<p>Đoạn văn bản mẫu kiểm thử số 1.</p><p>Đoạn văn bản mẫu kiểm thử số 2.</p>") {
  const page = new FakeElement("div");
  page.className = "vno-writer-page";

  const header = new FakeElement("div");
  header.className = "vno-writer-header";
  header.innerHTML = "<p>Header test</p>";

  const body = new FakeElement("div");
  body.className = "vno-writer-body";
  body.innerHTML = bodyContentHtml;

  const footer = new FakeElement("div");
  footer.className = "vno-writer-footer";
  footer.innerHTML = "<p>Trang 1 / 1</p>";

  page.appendChild(header);
  page.appendChild(body);
  page.appendChild(footer);

  return { editor: page, header, body, footer };
}

export async function runWriterColumnsTests() {
  const results = [];
  const assert = (name, pass, error = "") => results.push({ name, pass, error });

  // TEST 1: Commands declaration in command-definitions.js
  (() => {
    const colMain = WRITER_COMMANDS.find(c => c.id === "writer.page.columns");
    const col1 = WRITER_COMMANDS.find(c => c.id === "writer.page.columns1");
    const col2 = WRITER_COMMANDS.find(c => c.id === "writer.page.columns2");
    const col3 = WRITER_COMMANDS.find(c => c.id === "writer.page.columns3");

    const ok = Boolean(
      colMain && colMain.icon === "pageColumns" &&
      col1 && col1.icon === "columnsOne" &&
      col2 && col2.icon === "columnsTwo" &&
      col3 && col3.icon === "columnsThree"
    );

    assert(
      "Writer Columns: 4 commands được khai báo chuẩn xác trong WRITER_COMMANDS",
      ok,
      `Thiếu khai báo: main=${Boolean(colMain)}, col1=${Boolean(col1)}, col2=${Boolean(col2)}, col3=${Boolean(col3)}`
    );
  })();

  // TEST 2: UNO command mapping in command-dispatch-mapper.js
  (() => {
    const unoMain = mapVnCommandToUno("writer.page.columns");
    const unoCol1 = mapVnCommandToUno("writer.page.columns1");
    const unoCol2 = mapVnCommandToUno("writer.page.columns2");
    const unoCol3 = mapVnCommandToUno("writer.page.columns3");
    const vnFromUno = getVnCommand(".uno:FormatColumns");

    const ok = (
      unoMain === ".uno:FormatColumns" &&
      unoCol1 === ".uno:FormatColumns" &&
      unoCol2 === ".uno:FormatColumns" &&
      unoCol3 === ".uno:FormatColumns" &&
      vnFromUno === "writer.page.columns"
    );

    assert(
      "Writer Columns: Ánh xạ 2 chiều chuẩn xác sang lệnh UNO .uno:FormatColumns",
      ok,
      `UNO mapping sai: unoMain=${unoMain}, reverse=${vnFromUno}`
    );
  })();

  // TEST 3: High precision multi-tone vector SVG icons in ICONS
  (() => {
    const svgMain = ICONS.pageColumns;
    const svgCol1 = ICONS.columnsOne;
    const svgCol2 = ICONS.columnsTwo;
    const svgCol3 = ICONS.columnsThree;

    const validSvg = (svg) => typeof svg === "string" && svg.includes("<svg") && svg.includes("</svg>") && !svg.includes("circle cx=\"12\" cy=\"12\" r=\"4\"");

    const ok = validSvg(svgMain) && validSvg(svgCol1) && validSvg(svgCol2) && validSvg(svgCol3);

    assert(
      "Writer Columns: 4 icon SVG vector đa sắc chuẩn sắc nét hiện diện trong ICONS (không generic circle)",
      ok,
      "Icon bị thiếu hoặc dùng fallback generic circle"
    );
  })();

  // TEST 4: Ribbon integration on Layout tab
  (() => {
    const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");
    const pageSetupGroup = layoutTab?.groups.find(g => g.label === "Thiết lập trang");

    const hasMainBtn = Boolean(pageSetupGroup?.items.some(i => i.commandId === "writer.page.columns"));
    const colGroup = pageSetupGroup?.items.find(i => i.type === "column");
    const hasCol1 = Boolean(colGroup?.items.some(i => i.commandId === "writer.page.columns1"));
    const hasCol2 = Boolean(colGroup?.items.some(i => i.commandId === "writer.page.columns2"));
    const hasCol3 = Boolean(colGroup?.items.some(i => i.commandId === "writer.page.columns3"));

    const ok = Boolean(hasMainBtn && hasCol1 && hasCol2 && hasCol3);

    assert(
      "Writer Columns: Hiện diện đầy đủ trên Ribbon tab Bố cục với nút chính và 3 nút chọn nhanh",
      ok,
      `Thiếu trên Ribbon: main=${hasMainBtn}, col1=${hasCol1}, col2=${hasCol2}, col3=${hasCol3}`
    );
  })();

  // TEST 5: COLUMN_PRESETS structure in columns-dialog.js
  (() => {
    const p1 = COLUMN_PRESETS.find(p => p.count === 1);
    const p2 = COLUMN_PRESETS.find(p => p.count === 2);
    const p3 = COLUMN_PRESETS.find(p => p.count === 3);

    const ok = Boolean(
      COLUMN_PRESETS.length === 3 &&
      p1 && p1.label.includes("Một") &&
      p2 && p2.label.includes("Hai") && p2.gap === 10 &&
      p3 && p3.label.includes("Ba") && p3.gap === 10
    );

    assert(
      "Writer Columns Dialog: 3 presets chuẩn (1 cột, 2 cột, 3 cột) với icon minh họa đầy đủ",
      ok,
      `Presets không chuẩn: length=${COLUMN_PRESETS?.length}`
    );
  })();

  // TEST 6: Apply 2 Columns via setColumns() updates DOM & CSS styles
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor();
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setColumns({ count: 2, gap: 10, rule: false });

      const countApplied = body.style.columnCount === "2";
      const gapApplied = body.style.columnGap === "10mm";
      const datasetApplied = body.dataset.vnoColumnCount === "2";
      const classApplied = body.classList.contains("vno-columns-active") && body.classList.contains("vno-columns-2");

      assert(
        "Writer Columns: Áp dụng 2 cột thiết lập đúng column-count:2, column-gap:10mm và class trên bodyDom",
        countApplied && gapApplied && datasetApplied && classApplied,
        `Chi tiết: count=${body.style.columnCount}, gap=${body.style.columnGap}, dataset=${body.dataset.vnoColumnCount}, class=${body.className}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 7: Apply 3 Columns with custom gap (15mm) and column rule
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor();
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setColumns({ count: 3, gap: 15, rule: true });

      const countApplied = body.style.columnCount === "3";
      const gapApplied = body.style.columnGap === "15mm";
      const ruleApplied = typeof body.style.columnRule === "string" && body.style.columnRule.includes("solid");
      const classApplied = body.classList.contains("vno-columns-active") && body.classList.contains("vno-columns-3");

      assert(
        "Writer Columns: Áp dụng 3 cột với khoảng cách 15mm và đường kẻ phân cách column-rule thành công",
        countApplied && gapApplied && ruleApplied && classApplied,
        `Chi tiết: count=${body.style.columnCount}, gap=${body.style.columnGap}, rule=${body.style.columnRule}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 8: Reset to 1 Column clears column CSS styles and removes active classes
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor();
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setColumns({ count: 2, gap: 10, rule: false });
      adapter.clearColumns();

      const countCleared = body.style.columnCount === "";
      const gapCleared = body.style.columnGap === "";
      const ruleCleared = body.style.columnRule === "";
      const datasetCleared = body.dataset.vnoColumnCount === undefined;
      const classCleared = !body.classList.contains("vno-columns-active") && !body.classList.contains("vno-columns-2");

      assert(
        "Writer Columns: Về 1 cột gỡ bỏ triệt để CSS column-count, column-gap và class khỏi bodyDom",
        countCleared && gapCleared && ruleCleared && datasetCleared && classCleared,
        `Chưa làm sạch: count=${body.style.columnCount}, class=${body.className}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 9: Deep Undo / Redo Symmetry across Column transitions
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor, body } = createMockEditor();
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      // Ban đầu 1 cột
      adapter.setColumns({ count: 2, gap: 10, rule: false });
      adapter.setColumns({ count: 3, gap: 12, rule: true });

      // Hoàn tác bước 1: quay lại 2 cột
      adapter.undo();
      const step1Ok = adapter.columns.count === 2 && body.style.columnCount === "2";

      // Hoàn tác bước 2: quay về 1 cột ban đầu
      adapter.undo();
      const step2Ok = adapter.columns.count === 1 && body.style.columnCount === "";

      // Làm lại bước 1: khôi phục 2 cột
      adapter.redo();
      const redo1Ok = adapter.columns.count === 2 && body.style.columnCount === "2";

      // Làm lại bước 2: khôi phục 3 cột
      adapter.redo();
      const redo2Ok = adapter.columns.count === 3 && body.style.columnCount === "3";

      const symmetric = Boolean(step1Ok && step2Ok && redo1Ok && redo2Ok);

      assert(
        "Writer Columns: Hoàn tác (Undo) và Làm lại (Redo) phục hồi chính xác số cột và định dạng CSS",
        symmetric,
        `Lỗi Undo/Redo: step1=${step1Ok}, step2=${step2Ok}, redo1=${redo1Ok}, redo2=${redo2Ok}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 10: Print Preview replicates Multi-column styling on EVERY preview sheet
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      // Nội dung dài nhiều đoạn để phân trang thành nhiều trang in
      let longHtml = "";
      for (let i = 1; i <= 20; i++) {
        longHtml += `<p>Đoạn văn bản số ${i}: VN Office hỗ trợ đa cột báo chí chuyên nghiệp chuẩn Microsoft Word.</p>`;
      }

      const { editor } = createMockEditor(longHtml);
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setColumns({ count: 2, gap: 10, rule: true });

      const overlay = adapter.openPrintPreview();
      const sheets = overlay?.querySelectorAll?.(".vno-print-preview-sheet") || [];

      let allSheetsHaveColumns = sheets.length > 0;
      for (const sheet of sheets) {
        const pBody = sheet.querySelector?.(".vno-print-preview-body");
        const styleStr = pBody?.getAttribute?.("style") || "";
        const classStr = pBody?.className || "";

        const hasCount = (pBody?.style?.columnCount === "2") || styleStr.includes("column-count:2") || styleStr.includes("columnCount:2");
        if (!classStr.includes("vno-columns-active") || !classStr.includes("vno-columns-2") || !hasCount) {
          allSheetsHaveColumns = false;
          break;
        }
      }

      adapter.closePrintPreview();

      assert(
        "Writer Print Preview: Chia cột (Multi-column) xuất hiện đúng chuẩn trên MỌI trang in xem trước",
        allSheetsHaveColumns && sheets.length > 0,
        `Số trang: ${sheets.length}, allHaveColumns=${allSheetsHaveColumns}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 11: Command Bus & handleDispatch safely handle args = null (Lesson 3)
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor();
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      let noCrash = true;
      try {
        globalCommandBus.execute("writer.page.columns1", null);
        globalCommandBus.execute("writer.page.columns2", null);
        globalCommandBus.execute("writer.page.columns3", null);

        adapter.handleDispatch("writer.page.columns1", null);
        adapter.handleDispatch("writer.page.columns2", null);
        adapter.handleDispatch("writer.page.columns3", null);
      } catch (e) {
        noCrash = false;
      }

      assert(
        "Writer Columns: Command Bus và handleDispatch xử lý an toàn tuyệt đối khi args là null (Lesson 3)",
        noCrash,
        "Gặp lỗi crash khi gọi execute với args = null"
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 12: Content Export preserves CSS columns for LibreOffice Headless Bridge
  (() => {
    const cleanup = setupMockEnvironment();
    try {
      const { editor } = createMockEditor("<p>Nội dung cần xuất DOCX/PDF dạng 2 cột</p>");
      const adapter = new WriterAdapter(editor);
      adapter.attach();

      adapter.setColumns({ count: 2, gap: 10, rule: true });

      const exportHtml = adapter._contentForExport();

      const hasColumnsStyle = exportHtml.includes("column-count: 2") || exportHtml.includes("column-count:2");
      const hasColumnGap = exportHtml.includes("column-gap: 10mm") || exportHtml.includes("column-gap:10mm");
      const hasColumnWrapper = exportHtml.includes("vno-writer-columns-content");

      assert(
        "Writer Export: _contentForExport giữ nguyên cấu hình CSS columns và wrapper cho LibreOffice HTML bridge",
        hasColumnsStyle && hasColumnGap && hasColumnWrapper,
        `Thiếu CSS export: style=${hasColumnsStyle}, gap=${hasColumnGap}, wrapper=${hasColumnWrapper}`
      );
    } finally {
      cleanup();
    }
  })();

  // TEST 13: Columns Dialog interactive showColumnsDialog resolves with correct parameters
  await (async () => {
    const cleanup = setupMockEnvironment();
    try {
      const promise = showColumnsDialog({ count: 1, gap: 10, rule: false });

      const overlay = document.body.querySelector(".vno-dialog-overlay");
      const countInput = overlay?.querySelector("#vno-col-count-input");
      const gapInput = overlay?.querySelector("#vno-col-gap-input");
      const ruleInput = overlay?.querySelector("#vno-col-rule-input");
      const okBtn = overlay?.querySelector(".vno-dialog-ok-btn");

      if (countInput) countInput.value = "3";
      if (gapInput) gapInput.value = "15";
      if (ruleInput) ruleInput.checked = true;

      okBtn?.click();

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("showColumnsDialog timed out")), 1000));
      const result = await Promise.race([promise, timeoutPromise]);

      const ok = (
        result &&
        result.count === 3 &&
        result.gap === 15 &&
        result.rule === true
      );

      assert(
        "Writer Columns Dialog: Tương tác hộp thoại trả về đầy đủ tham số count:3, gap:15mm, rule:true khi nhấn Áp dụng",
        ok,
        `Kết quả dialog không khớp: ${JSON.stringify(result)}`
      );
    } finally {
      cleanup();
    }
  })();

  await (async () => {
    const cleanup = setupMockEnvironment();
    try {
      const promise = showColumnsDialog({ count: 1, gap: 10, rule: false });
      const overlay = document.body.querySelector(".vno-dialog-overlay");
      const countInput = overlay?.querySelector("#vno-col-count-input");
      const errorBox = overlay?.querySelector("#vno-col-error");
      const okBtn = overlay?.querySelector(".vno-dialog-ok-btn");
      countInput.value = "0";
      okBtn.click();
      assert(
        "Writer Columns Dialog: giá trị 0 báo lỗi tiếng Việt và giữ dialog mở",
        Boolean(document.body.querySelector(".vno-dialog-overlay")) && /1 đến 4/.test(errorBox?.textContent || ""),
        `Không thấy lỗi hợp lệ: ${errorBox?.textContent || ""}`
      );
      countInput.value = "2";
      okBtn.click();
      const result = await promise;
      assert("Writer Columns Dialog: sửa giá trị rồi áp dụng được", result?.count === 2, JSON.stringify(result));
    } finally {
      cleanup();
    }
  })();

  return results;
}
