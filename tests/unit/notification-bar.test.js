/**
 * Test Suite: UI Kit — Notification Bar Component & WCAG AA Color Contrast
 */

import { NotificationBar, createNotificationBar } from "../../platform/ui-kit/notification-bar.js";
import { getContrastRatio, meetsWcagAA } from "../../platform/ui-kit/contrast-checker.js";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this._textContent = "";
    this.listeners = {};
    this.classList = {
      _classes: new Set(),
      add: (...tokens) => tokens.forEach(t => this.classList._classes.add(t)),
      remove: (...tokens) => tokens.forEach(t => this.classList._classes.delete(t)),
      contains: (token) => this.classList._classes.has(token)
    };
  }

  get className() { return Array.from(this.classList._classes).join(" "); }
  set className(val) {
    this.classList._classes.clear();
    String(val || "").split(/\s+/).filter(Boolean).forEach(c => this.classList._classes.add(c));
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    return this.children.map(c => c.textContent || "").join("");
  }
  set textContent(val) {
    this._textContent = String(val ?? "");
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || "";
  }
  set innerHTML(val) {
    this._innerHTML = String(val ?? "");
    if (this._innerHTML.includes("<svg")) {
      const svgChild = new FakeElement("svg");
      this.appendChild(svgChild);
    }
  }

  setAttribute(name, val) { this.attributes[name] = String(val); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  contains(child) {
    if (!child) return false;
    if (child === this) return true;
    for (const c of this.children) {
      if (c === child || c.contains(child)) return true;
    }
    return false;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) h(event);
    if (event.bubbles && this.parentNode) {
      this.parentNode.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: "click", defaultPrevented: false, preventDefault() {}, stopPropagation() {} });
  }

  _matches(selector) {
    if (!selector) return false;
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector) {
    const parts = selector.trim().split(/\s+/);
    if (parts.length === 1) return this.querySelectorAll(selector)[0] || null;
    let current = [this];
    for (const part of parts) {
      const next = [];
      for (const el of current) {
        next.push(...el.querySelectorAll(part));
      }
      current = next;
    }
    return current[0] || null;
  }

  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
  }
  createElement(tag) { return new FakeElement(tag); }
}

export async function runNotificationBarTests() {
  const results = [];
  const origDoc = globalThis.document;
  const origKeyboardEvent = globalThis.KeyboardEvent;

  globalThis.document = new FakeDocument();
  globalThis.KeyboardEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.key = init.key || "";
      this.bubbles = Boolean(init.bubbles);
      this.defaultPrevented = false;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() {}
  };

  try {
    // 1. Khởi tạo và render cơ bản
    const bar = createNotificationBar({
      message: "Tệp có 2 ô liên kết tới sổ làm việc khác. VN Office hiển thị giá trị lưu lần cuối và không tự cập nhật (ứng dụng chạy ngoại tuyến).",
      type: "warning"
    });

    const el = bar.render();
    results.push({
      name: "NotificationBar: render trả về HTMLElement với class vno-notification-bar",
      pass: Boolean(el && el.classList.contains("vno-notification-bar") && el.classList.contains("vno-notification-bar--warning")),
      error: el ? el.className : "null"
    });

    results.push({
      name: "NotificationBar: chuẩn accessibility role='status' và aria-live='polite'",
      pass: el.getAttribute("role") === "status" && el.getAttribute("aria-live") === "polite",
      error: `role=${el.getAttribute("role")}, aria-live=${el.getAttribute("aria-live")}`
    });

    const msgEl = el.querySelector(".vno-notification-bar-message");
    results.push({
      name: "NotificationBar: hiển thị đúng nội dung thông báo",
      pass: Boolean(msgEl && msgEl.textContent.includes("Tệp có 2 ô liên kết tới sổ làm việc khác")),
      error: msgEl ? msgEl.textContent : "null"
    });

    const iconEl = el.querySelector(".vno-notification-bar-icon svg");
    results.push({
      name: "NotificationBar: hiển thị biểu tượng SVG",
      pass: Boolean(iconEl),
      error: "Không tìm thấy icon svg"
    });

    // 2. Action button
    let actionClicked = false;
    const barWithAction = new NotificationBar({
      message: "Cảnh báo liên kết ngoài",
      action: {
        label: "Tìm hiểu thêm",
        ariaLabel: "Tìm hiểu thêm về liên kết ngoài",
        onClick: () => { actionClicked = true; }
      }
    });
    const elAction = barWithAction.render();
    const actionBtn = elAction.querySelector(".vno-notification-bar-action-btn");
    results.push({
      name: "NotificationBar: render nút hành động tùy chọn với nhãn và aria-label",
      pass: Boolean(actionBtn && actionBtn.textContent === "Tìm hiểu thêm" && actionBtn.getAttribute("aria-label") === "Tìm hiểu thêm về liên kết ngoài"),
      error: actionBtn ? actionBtn.textContent : "null"
    });

    actionBtn.click();
    results.push({
      name: "NotificationBar: click nút hành động gọi đúng hàm onClick",
      pass: actionClicked === true,
      error: `actionClicked = ${actionClicked}`
    });

    // 3. Close button & dismiss callback
    let dismissed = false;
    const barDismiss = new NotificationBar({
      message: "Thông báo có thể đóng",
      dismissible: true,
      onDismiss: () => { dismissed = true; }
    });
    const elDismiss = barDismiss.render();
    const closeBtn = elDismiss.querySelector(".vno-notification-bar-close-btn");
    results.push({
      name: "NotificationBar: có nút đóng với aria-label và title",
      pass: Boolean(closeBtn && closeBtn.getAttribute("aria-label") === "Đóng thông báo" && closeBtn.getAttribute("title") === "Đóng"),
      error: closeBtn ? closeBtn.attributes : "null"
    });

    // Mount vào container để test dismiss
    const container = document.createElement("div");
    document.body.appendChild(container);
    barDismiss.mount(container);
    results.push({
      name: "NotificationBar: mount() đưa element vào container",
      pass: container.contains(barDismiss.element),
      error: "Container does not contain bar element"
    });

    closeBtn.click();
    results.push({
      name: "NotificationBar: click nút đóng xóa element khỏi DOM và kích hoạt onDismiss",
      pass: dismissed === true && !container.contains(elDismiss),
      error: `dismissed=${dismissed}, contains=${container.contains(elDismiss)}`
    });
    container.remove();

    // 4. Keyboard: Phím Escape đóng thanh khi focus bên trong
    let escDismissed = false;
    const barEsc = new NotificationBar({
      message: "Thanh test Esc",
      onDismiss: () => { escDismissed = true; }
    });
    const elEsc = barEsc.render();
    const escContainer = document.createElement("div");
    document.body.appendChild(escContainer);
    barEsc.mount(escContainer);

    const escEvent = new globalThis.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    elEsc.dispatchEvent(escEvent);
    results.push({
      name: "NotificationBar: phím Escape đóng thanh khi focus bên trong",
      pass: escDismissed === true && !escContainer.contains(elEsc),
      error: `escDismissed=${escDismissed}`
    });
    escContainer.remove();

    // 5. setMessage cập nhật nội dung
    const barUpdate = new NotificationBar({ message: "Nội dung cũ" });
    barUpdate.render();
    barUpdate.setMessage("Nội dung mới đã cập nhật");
    const updatedMsg = barUpdate.element.querySelector(".vno-notification-bar-message").textContent;
    results.push({
      name: "NotificationBar: setMessage() cập nhật đúng text hiển thị",
      pass: updatedMsg === "Nội dung mới đã cập nhật",
      error: updatedMsg
    });

    // 6. WCAG 2.1 AA Color Contrast — Light Mode
    const lightBg = "#fff4ce";
    const lightText = "#1f2937";
    const lightRatio = getContrastRatio(lightText, lightBg);
    const lightPass = meetsWcagAA(lightText, lightBg);
    results.push({
      name: `WCAG AA Contrast (Light Mode): văn bản #${lightText} trên nền #${lightBg} >= 4.5:1 (thực tế ${lightRatio}:1)`,
      pass: lightPass && lightRatio >= 4.5,
      error: `Ratio: ${lightRatio}`
    });

    const lightBtnBg = "#ffffff";
    const lightBtnText = "#78350f";
    const lightBtnRatio = getContrastRatio(lightBtnText, lightBtnBg);
    results.push({
      name: `WCAG AA Contrast (Light Mode): nút hành động #${lightBtnText} trên #${lightBtnBg} >= 4.5:1 (thực tế ${lightBtnRatio}:1)`,
      pass: meetsWcagAA(lightBtnText, lightBtnBg) && lightBtnRatio >= 4.5,
      error: `Ratio: ${lightBtnRatio}`
    });

    // 7. WCAG 2.1 AA Color Contrast — Dark Mode
    const darkBg = "#3b2f0a";
    const darkText = "#fef3c7";
    const darkRatio = getContrastRatio(darkText, darkBg);
    const darkPass = meetsWcagAA(darkText, darkBg);
    results.push({
      name: `WCAG AA Contrast (Dark Mode): văn bản #${darkText} trên nền #${darkBg} >= 4.5:1 (thực tế ${darkRatio}:1)`,
      pass: darkPass && darkRatio >= 4.5,
      error: `Ratio: ${darkRatio}`
    });

    const darkBtnBg = "#4c3809";
    const darkBtnText = "#fde047";
    const darkBtnRatio = getContrastRatio(darkBtnText, darkBtnBg);
    results.push({
      name: `WCAG AA Contrast (Dark Mode): nút hành động #${darkBtnText} trên #${darkBtnBg} >= 4.5:1 (thực tế ${darkBtnRatio}:1)`,
      pass: meetsWcagAA(darkBtnText, darkBtnBg) && darkBtnRatio >= 4.5,
      error: `Ratio: ${darkBtnRatio}`
    });
  } finally {
    globalThis.document = origDoc;
    globalThis.KeyboardEvent = origKeyboardEvent;
  }

  return results;
}
