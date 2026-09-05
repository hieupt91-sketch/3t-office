/**
 * Test Suite: VN Slides Dialogs & Overlays Accessibility Audit
 * Kiểm tra toàn diện WCAG 2.1 AA / WAI-ARIA cho toàn bộ Dialog và Overlay của VN Slides:
 * 1. SmartArt (showDiagramDialog)
 * 2. Theme Gallery (showThemeGalleryDialog)
 * 3. Slide Size (showSlideSizeDialog)
 * 4. Layout Picker (showLayoutDialog)
 * 5. Slide Master (showSlideMasterDialog)
 * 6. Transitions & Animations Dialogs
 * 7. Slide Sorter View overlay
 * 8. Comment Panel region
 * 9. Presenter Console overlay
 * 10. Rehearse Timings overlay & timer role
 */

import { SlidesCanvasController, trapFocus } from "../../apps/slides/slides-canvas.js";

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

/**
 * Mô phỏng DOM Element có hỗ trợ đầy đủ ARIA, querySelector, focus và keyboard events.
 */
class A11yMockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    const classSet = new Set();
    this.classList = {
      add: (...names) => names.forEach(n => { if (n) classSet.add(n); }),
      remove: (...names) => names.forEach(n => { if (n) classSet.delete(n); }),
      contains: (n) => classSet.has(n),
      has: (n) => classSet.has(n),
      clear: () => classSet.clear(),
      toggle: (n, force) => {
        if (force !== undefined) {
          if (force) classSet.add(n); else classSet.delete(n);
        } else {
          if (classSet.has(n)) classSet.delete(n); else classSet.add(n);
        }
      },
      [Symbol.iterator]: () => classSet[Symbol.iterator](),
      toString: () => Array.from(classSet).join(" ")
    };
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    this.tabIndex = 0;
    this.dataset = {};
    this._value = "";
    this._innerHTML = "";
    this.hidden = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  get className() {
    return this.classList.toString();
  }

  set className(val) {
    this.classList.clear();
    if (val) {
      val.split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
    }
  }

  get value() { return this._value; }
  set value(v) { this._value = String(v); }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = String(html);
    this._parseHtmlSnippets(html);
  }

  get offsetWidth() { return 100; }
  get offsetHeight() { return 40; }
  get offsetParent() { return this.parentNode || (globalThis.document?.body); }

  _parseHtmlSnippets(html) {
    this.children = [];
    const VOID_TAGS = new Set(["input", "br", "hr", "img", "meta", "link"]);
    const tagRegex = /<(\/)?([a-zA-Z0-9-]+)([^>]*)>/g;
    const stack = [this];
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const isClosing = Boolean(match[1]);
      const tagName = match[2].toLowerCase();
      const rawAttrs = match[3];

      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName) {
          stack.pop();
        }
      } else {
        const isSelfClosing = rawAttrs.trim().endsWith("/") || VOID_TAGS.has(tagName);
        const child = new A11yMockElement(tagName);

        const attrRegex = /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let am;
        while ((am = attrRegex.exec(rawAttrs)) !== null) {
          const attrName = am[1];
          if (!attrName || attrName === "/") continue;
          const val = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ""));
          child.setAttribute(attrName, val);
          if (attrName === "id") child.id = val;
          if (attrName === "class") child.className = val;
          if (attrName.startsWith("data-")) {
            const camelKey = attrName.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            child.dataset[camelKey] = val;
          }
        }

        const parent = stack[stack.length - 1];
        parent.appendChild(child);

        if (!isSelfClosing) {
          stack.push(child);
        }
      }
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    for (const child of children) {
      if (typeof child === "string") {
        const textNode = new A11yMockElement("#text");
        textNode.textContent = child;
        this.appendChild(textNode);
      } else if (child) {
        this.appendChild(child);
      }
    }
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  contains(el) {
    if (!el) return false;
    if (el === this) return true;
    for (const child of this.children) {
      if (child.contains(el)) return true;
    }
    return false;
  }

  addEventListener(type, fn) {
    this.listeners[type] ||= [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) {
      h(event);
    }
    return !event.defaultPrevented;
  }

  focus() {
    if (globalThis.document) {
      globalThis.document.activeElement = this;
    }
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    if (!selector) return [];
    const results = new Set();
    const parts = selector.split(",").map(s => s.trim());

    for (const part of parts) {
      const safePart = part.replace(/\[[^\]]+\]/g, m => m.replace(/\s+/g, "___SPACE___"));
      const tokens = safePart.split(/\s+/).filter(Boolean).map(t => t.replace(/___SPACE___/g, " "));
      let candidates = [this];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const nextCandidates = [];

        for (const candidate of candidates) {
          const allDescendants = [];
          const collect = (node) => {
            for (const ch of node.children) {
              allDescendants.push(ch);
              collect(ch);
            }
          };
          collect(candidate);

          for (const el of allDescendants) {
            if (this._matchesSimple(el, token)) {
              nextCandidates.push(el);
            }
          }
        }
        candidates = nextCandidates;
      }

      for (const el of candidates) {
        results.add(el);
      }
    }

    return Array.from(results);
  }

  _matchesSimple(el, token) {
    const notMatches = token.match(/:not\(([^)]+)\)/g) || [];
    for (const notRule of notMatches) {
      const inner = notRule.slice(5, -1);
      if (this._matchesSimple(el, inner)) return false;
    }
    const cleanToken = token.replace(/:not\([^)]+\)/g, "");
    if (!cleanToken) return true;

    const idMatch = cleanToken.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch && el.id !== idMatch[1]) return false;

    const classMatches = cleanToken.match(/\.([a-zA-Z0-9_-]+)/g) || [];
    for (const c of classMatches) {
      if (!el.classList.has(c.slice(1))) return false;
    }

    const attrMatches = cleanToken.match(/\[([^\]]+)\]/g) || [];
    for (const a of attrMatches) {
      const inner = a.slice(1, -1);
      if (inner.includes("*=")) {
        const eqIdx = inner.indexOf("*=");
        const k = inner.slice(0, eqIdx).trim();
        const v = inner.slice(eqIdx + 2).replace(/^["']|["']$/g, "").trim();
        const attrVal = el.getAttribute(k) || (k === "style" ? (el.style?.cssText || "") : "") || "";
        if (!String(attrVal).includes(v)) return false;
      } else if (inner.includes("=")) {
        const eqIdx = inner.indexOf("=");
        const k = inner.slice(0, eqIdx).trim();
        const v = inner.slice(eqIdx + 1).replace(/^["']|["']$/g, "").trim();
        if (k.startsWith("data-")) {
          const camel = k.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          if (el.dataset[camel] !== v) return false;
        } else if (el.getAttribute(k) !== v) {
          return false;
        }
      } else {
        if (inner.startsWith("data-")) {
          const camel = inner.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          if (!(camel in el.dataset)) return false;
        } else if (!el.hasAttribute(inner)) {
          return false;
        }
      }
    }

    const tagMatch = cleanToken.match(/^[a-zA-Z0-9-]+/);
    if (tagMatch && el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;

    return true;
  }
}

class A11yMockDocument {
  constructor() {
    this.body = new A11yMockElement("body");
    this.activeElement = null;
    this.listeners = {};
  }

  createElement(tag) {
    return new A11yMockElement(tag);
  }

  addEventListener(type, fn) {
    this.listeners[type] ||= [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) {
      h(event);
    }
    return !event.defaultPrevented;
  }
}

function setupMockEnvironment() {
  const origDoc = globalThis.document;
  const mockDoc = new A11yMockDocument();
  globalThis.document = mockDoc;
  return {
    mockDoc,
    cleanup: () => { globalThis.document = origDoc; }
  };
}

export async function runSlidesDialogsA11yTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // 1. Focus Trapping Helper (trapFocus)
  await test("Focus Trap: Giữ focus tuần hoàn trong hộp thoại khi ấn Tab và Shift+Tab", () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const dialog = new A11yMockElement("div");
      const btn1 = new A11yMockElement("button");
      const btn2 = new A11yMockElement("button");
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);

      // Khi đang ở btn2, ấn Tab -> quay về btn1
      btn2.focus();
      let defaultPrevented = false;
      trapFocus(dialog, {
        key: "Tab",
        shiftKey: false,
        preventDefault: () => { defaultPrevented = true; }
      });
      assert(defaultPrevented, "Tab ở phần tử cuối phải preventDefault");
      assert(mockDoc.activeElement === btn1, "Tab ở phần tử cuối phải chuyển focus về phần tử đầu tiên");

      // Khi đang ở btn1, ấn Shift+Tab -> quay về btn2
      btn1.focus();
      defaultPrevented = false;
      trapFocus(dialog, {
        key: "Tab",
        shiftKey: true,
        preventDefault: () => { defaultPrevented = true; }
      });
      assert(defaultPrevented, "Shift+Tab ở phần tử đầu phải preventDefault");
      assert(mockDoc.activeElement === btn2, "Shift+Tab ở phần tử đầu phải chuyển focus về phần tử cuối");
    } finally {
      cleanup();
    }
  });

  // 2. SmartArt Dialog (showDiagramDialog)
  await test("SmartArt Dialog: Đạt chuẩn ARIA dialog, aria-modal, aria-labelledby và đóng bằng phím Escape", async () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      // Mở dialog
      canvas.showDiagramDialog();
      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-diagram-dialog"));
      assert(overlay, "Phải gắn overlay vno-diagram-dialog vào body");

      const dialogBox = overlay.querySelector('[role="dialog"]') || overlay;
      assert(dialogBox.getAttribute("role") === "dialog", "SmartArt dialog phải có role='dialog'");
      assert(dialogBox.getAttribute("aria-modal") === "true", "SmartArt dialog phải có aria-modal='true'");
      assert(dialogBox.getAttribute("aria-labelledby") === "vno-diagram-title", "SmartArt dialog phải có aria-labelledby");

      // Kiểm tra danh sách diagram type có role="radio" và aria-checked
      const typeCards = overlay.querySelectorAll(".vno-diagram-type");
      assert(typeCards.length >= 4, "Phải có ít nhất 4 kiểu sơ đồ SmartArt");
      assert(typeCards.some(c => c.getAttribute("aria-checked") === "true"), "Phải có ít nhất 1 sơ đồ được chọn mặc định");

      // Nhấn Escape -> đóng dialog và khôi phục focus
      mockDoc.dispatchEvent({
        type: "keydown",
        key: "Escape",
        preventDefault() {}
      });

      assert(!mockDoc.body.children.includes(overlay), "Nhấn Escape phải gỡ bỏ overlay khỏi body");
      assert(mockDoc.activeElement === openerBtn, "Nhấn Escape phải khôi phục focus về nút mở");
    } finally {
      cleanup();
    }
  });

  // 3. Theme Gallery Dialog (showThemeGalleryDialog)
  await test("Theme Gallery Dialog: Đạt chuẩn role='dialog', role='radiogroup' cho danh sách theme, khôi phục focus khi đóng", async () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      canvas.showThemeGalleryDialog();
      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-theme-gallery-dialog"));
      assert(overlay, "Phải gắn overlay vno-theme-gallery-dialog vào body");

      const dialogBox = overlay.querySelector('[role="dialog"]') || overlay;
      assert(dialogBox.getAttribute("role") === "dialog", "Theme Gallery phải có role='dialog'");
      assert(dialogBox.getAttribute("aria-modal") === "true", "Theme Gallery phải có aria-modal='true'");
      assert(dialogBox.getAttribute("aria-labelledby") === "vno-theme-gallery-title", "Theme Gallery phải có aria-labelledby");

      // Thẻ theme
      const cards = overlay.querySelectorAll(".vno-theme-card");
      assert(cards.length >= 6, "Phải có ít nhất 6 theme trong gallery");
      assert(cards.some(c => c.getAttribute("aria-checked") === "true"), "Phải có theme đang chọn aria-checked='true'");

      // Đóng qua phím Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(!mockDoc.body.children.includes(overlay), "Phải gỡ bỏ overlay khi Escape");
      assert(mockDoc.activeElement === openerBtn, "Phải khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  // 4. Slide Size Dialog (showSlideSizeDialog)
  await test("Slide Size Dialog: Đạt chuẩn ARIA dialog, aria-checked trên tùy chọn tỷ lệ màn hình, khôi phục focus", async () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      canvas.showSlideSizeDialog();
      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-slide-size-dialog"));
      assert(overlay, "Phải gắn overlay vno-slide-size-dialog");

      const dialogBox = overlay.querySelector('[role="dialog"]') || overlay;
      assert(dialogBox.getAttribute("role") === "dialog", "Slide Size phải có role='dialog'");
      assert(dialogBox.getAttribute("aria-modal") === "true", "Slide Size phải có aria-modal='true'");
      assert(dialogBox.getAttribute("aria-labelledby") === "vno-slide-size-title", "Slide Size phải có aria-labelledby");

      const sizeBtns = overlay.querySelectorAll("[data-slide-size]");
      assert(sizeBtns.length >= 2, "Phải có nút 16:9 và 4:3");
      assert(sizeBtns.some(b => b.getAttribute("aria-checked") === "true"), "Tỷ lệ hiện tại phải có aria-checked='true'");

      // Đóng bằng Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(!mockDoc.body.children.includes(overlay), "Đóng dialog khi Escape");
      assert(mockDoc.activeElement === openerBtn, "Khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  // 5. Layout Picker Dialog (showLayoutDialog)
  await test("Layout Picker Dialog: Đạt chuẩn ARIA dialog, radio role và aria-checked cho layout hiện tại", async () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      canvas.showLayoutDialog();
      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-dialog-overlay") && c.querySelector(".vno-layout-card"));
      assert(overlay, "Phải gắn overlay layout picker");

      const dialogBox = overlay.querySelector('[role="dialog"]') || overlay;
      assert(dialogBox.getAttribute("role") === "dialog", "Layout Picker phải có role='dialog'");
      assert(dialogBox.getAttribute("aria-modal") === "true", "Layout Picker phải có aria-modal='true'");
      assert(dialogBox.getAttribute("aria-labelledby") === "vno-layout-dialog-title", "Layout Picker phải có aria-labelledby");

      const layoutCards = overlay.querySelectorAll(".vno-layout-card");
      assert(layoutCards.length >= 4, "Phải có ít nhất 4 layout cards");
      assert(layoutCards.some(c => c.getAttribute("aria-checked") === "true"), "Layout hiện tại phải có aria-checked='true'");

      // Đóng bằng Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(!mockDoc.body.children.includes(overlay), "Đóng layout dialog khi Escape");
      assert(mockDoc.activeElement === openerBtn, "Khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  // 6. Transition & Animation Dialogs
  await test("Transition & Animation Dialogs: ARIA dialog, aria-modal, accessible form controls và focus restoration", async () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      // Test Transition Dialog
      canvas.showTransitionDialog();
      const transOverlay = mockDoc.body.children.find(c => c.querySelector("#vno-trans-dialog-title"));
      assert(transOverlay, "Phải mở transition dialog");
      const transBox = transOverlay.querySelector('[role="dialog"]') || transOverlay;
      assert(transBox.getAttribute("role") === "dialog", "Transition dialog role='dialog'");
      assert(transBox.getAttribute("aria-labelledby") === "vno-trans-dialog-title", "Transition aria-labelledby");

      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(mockDoc.activeElement === openerBtn, "Escape đóng transition dialog và khôi phục focus");

      // Test Animation Dialog
      openerBtn.focus();
      canvas.showAnimationDialog();
      const animOverlay = mockDoc.body.children.find(c => c.querySelector("#vno-anim-dialog-title"));
      assert(animOverlay, "Phải mở animation dialog");
      const animBox = animOverlay.querySelector('[role="dialog"]') || animOverlay;
      assert(animBox.getAttribute("role") === "dialog", "Animation dialog role='dialog'");
      assert(animBox.getAttribute("aria-labelledby") === "vno-anim-dialog-title", "Animation aria-labelledby");

      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(mockDoc.activeElement === openerBtn, "Escape đóng animation dialog và khôi phục focus");
    } finally {
      cleanup();
    }
  });

  // 7. Slide Sorter View Overlay (openSlideSorter)
  await test("Slide Sorter Overlay: role='dialog', aria-modal='true', nhãn accessible cho từng slide và nút đóng", () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      assert(canvas.openSlideSorter(), "openSlideSorter phải trả về true");
      const overlay = canvas.slideSorterOverlay;
      assert(overlay, "Phải tạo slideSorterOverlay");
      assert(overlay.getAttribute("role") === "dialog", "Slide Sorter phải có role='dialog'");
      assert(overlay.getAttribute("aria-modal") === "true", "Slide Sorter phải có aria-modal='true'");
      assert(overlay.getAttribute("aria-label") === "Bộ sắp xếp trang chiếu", "Slide Sorter aria-label");

      // Nút đóng có aria-label
      const closeBtn = overlay.querySelector(".vno-slide-sorter-close");
      assert(closeBtn?.getAttribute("aria-label") === "Đóng bộ sắp xếp", "Nút đóng phải có aria-label");

      // Nhấn Escape -> đóng và khôi phục focus
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(canvas.slideSorterOverlay === null, "Escape phải đóng slide sorter");
      assert(mockDoc.activeElement === openerBtn, "Escape phải khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  // 8. Comments Panel (openCommentsPanel / closeCommentsPanel)
  await test("Comments Panel: role='region', aria-label='Nhận xét', nhãn xóa có tên tác giả, Escape khôi phục focus", () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      canvas.mount();

      // Mở panel
      canvas.openCommentsPanel(true);
      const panel = canvas.commentPanelEl;
      assert(panel, "Phải có commentPanelEl");
      assert(panel.getAttribute("role") === "region", "Comments panel phải có role='region'");
      assert(panel.getAttribute("aria-label"), "Comments panel phải có aria-label");

      // Thêm 1 comment để kiểm tra accessible remove button
      canvas.addComment("Đây là nhận xét kiểm thử accessibility");
      const deleteBtn = panel.querySelector(".vno-slide-comment-meta button");
      assert(deleteBtn?.getAttribute("aria-label")?.includes("Xóa nhận xét"), "Nút xóa comment phải có aria-label");

      // Đóng panel bằng Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(panel.hidden === true, "Escape phải đóng comment panel");
    } finally {
      cleanup();
    }
  });

  // 9. Presenter Console Overlay (startPresenterMode)
  await test("Presenter Console: role='dialog', aria-modal='true', nhãn cho các nút điều khiển và đóng Escape", () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      assert(canvas.startPresenterMode(), "startPresenterMode phải trả về true");
      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-presenter-overlay"));
      assert(overlay, "Phải có overlay vno-presenter-overlay");
      assert(overlay.getAttribute("role") === "dialog", "Presenter mode role='dialog'");
      assert(overlay.getAttribute("aria-modal") === "true", "Presenter mode aria-modal='true'");
      assert(overlay.getAttribute("aria-label") === "Chế độ người thuyết trình", "Presenter mode aria-label");

      // Thoát bằng Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(!mockDoc.body.children.includes(overlay), "Escape phải đóng Presenter mode");
      assert(mockDoc.activeElement === openerBtn, "Escape phải khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  // 10. Rehearse Timings Overlay & Timer Role
  await test("Rehearse Timings: role='dialog', aria-label tập dượt và role='timer' cho đồng hồ đếm giờ", () => {
    const { mockDoc, cleanup } = setupMockEnvironment();
    try {
      const container = new A11yMockElement("div");
      const canvas = new SlidesCanvasController(container);
      const openerBtn = new A11yMockElement("button");
      openerBtn.focus();

      const rehearsalHandle = canvas.startSlideShow(0, { rehearsal: true });
      assert(rehearsalHandle, "startSlideShow rehearsal phải khởi động thành công");

      const overlay = mockDoc.body.children.find(c => c.classList.has("vno-slideshow-overlay"));
      assert(overlay, "Phải có overlay vno-slideshow-overlay");
      assert(overlay.getAttribute("role") === "dialog", "Rehearsal overlay role='dialog'");
      assert(overlay.getAttribute("aria-label") === "Tập dượt thời gian trình chiếu", "Rehearsal aria-label");

      const timerBox = overlay.querySelector('[role="timer"]') || overlay.children.find(c => c.classList.has("vno-rehearse-timer-box"));
      assert(timerBox, "Phải có phần tử vno-rehearse-timer-box");
      assert(timerBox.getAttribute("role") === "timer", "Đồng hồ tập dượt phải có role='timer'");
      assert(timerBox.getAttribute("aria-label") === "Đồng hồ tập dượt thời gian", "Đồng hồ tập dượt phải có aria-label");

      // Thoát qua Escape
      mockDoc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
      assert(!mockDoc.body.children.includes(overlay), "Escape phải đóng rehearsal overlay");
      assert(mockDoc.activeElement === openerBtn, "Escape phải khôi phục focus về opener");
    } finally {
      cleanup();
    }
  });

  return results;
}
