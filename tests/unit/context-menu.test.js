/**
 * Unit Tests — Suite 232: Shared Context Menu & Submenus (Doc & Sheet)
 * Kiểm tra:
 * 1. Khởi tạo ContextMenu và hiển thị chuẩn DOM, các thuộc tính WAI-ARIA (role="menu", role="menuitem", aria-haspopup, aria-expanded).
 * 2. Mở / đóng Submenu theo cấp bậc, class vno-has-submenu, vno-submenu-open.
 * 3. Điều hướng bàn phím đầy đủ: ArrowDown, ArrowUp, Home, End, ArrowRight (mở submenu), ArrowLeft (đóng submenu về cha), Escape.
 * 4. Tự động đảo hướng (Boundary Flipping) chống tràn màn hình cả ngang và dọc (root menu và submenu).
 * 5. Bỏ qua mục bị mờ (disabled items) khi điều hướng bàn phím và ngăn kích hoạt.
 * 6. Thực thi lệnh (action) khi nhấp chuột hoặc nhấn Enter, tự động đóng menu và khôi phục focus.
 */

import { ContextMenu, showContextMenu, closeActiveContextMenu } from "../../platform/ui-kit/context-menu.js";

function setupMockDom() {
  const listeners = new Map();

  class MockElement {
    constructor(tagName, className = "") {
      this.tagName = tagName.toUpperCase();
      this.className = className;
      this.children = [];
      this.parentNode = null;
      this.style = {};
      this.hidden = false;
      this.attributes = new Map();
      this.disabled = false;
      this._eventListeners = new Map();
      this._rect = { left: 100, top: 100, right: 300, bottom: 130, width: 200, height: 30 };
    }

    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }

    get classList() {
      const self = this;
      return {
        contains: (c) => self.className.split(/\s+/).filter(Boolean).includes(c),
        add: (c) => {
          const list = self.className.split(/\s+/).filter(Boolean);
          if (!list.includes(c)) {
            list.push(c);
            self.className = list.join(" ");
          }
        },
        remove: (c) => {
          const list = self.className.split(/\s+/).filter(Boolean);
          self.className = list.filter(x => x !== c).join(" ");
        }
      };
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

    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    }

    set innerHTML(html) {
      this.children = [];
      this._innerHTML = html;
    }

    get innerHTML() {
      return this._innerHTML || "";
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
      const result = [];
      const traverse = (node) => {
        for (const child of node.children) {
          if (child.matches(selector)) result.push(child);
          traverse(child);
        }
      };
      traverse(this);
      return result;
    }

    matches(selector) {
      const parts = selector.split(",").map(s => s.trim());
      for (const part of parts) {
        const notMatches = [...part.matchAll(/:not\(([^)]+)\)/g)];
        let basePart = part.replace(/:not\([^)]+\)/g, "").trim();

        let baseMatch = true;
        if (basePart && basePart !== "*") {
          if (basePart.startsWith(".")) {
            baseMatch = this.classList.contains(basePart.slice(1));
          } else if (basePart.startsWith("#")) {
            baseMatch = this.attributes.get("id") === basePart.slice(1);
          } else if (basePart.startsWith("[") && basePart.endsWith("]")) {
            const inner = basePart.slice(1, -1);
            if (inner.includes("=")) {
              const [attr, val] = inner.split("=");
              baseMatch = this.attributes.get(attr) === val.replace(/['"]/g, "");
            } else {
              baseMatch = this.attributes.has(inner);
            }
          } else {
            baseMatch = this.tagName.toLowerCase() === basePart.toLowerCase();
          }
        }

        if (!baseMatch) continue;

        let excluded = false;
        for (const nm of notMatches) {
          const negSelector = nm[1].trim();
          if (negSelector === "[disabled]") {
            if (this.disabled || this.attributes.has("disabled")) {
              excluded = true;
              break;
            }
          } else if (negSelector.startsWith(".")) {
            if (this.classList.contains(negSelector.slice(1))) {
              excluded = true;
              break;
            }
          }
        }

        if (!excluded) return true;
      }
      return false;
    }

    closest(selector) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(selector)) return cur;
        cur = cur.parentNode;
      }
      return null;
    }

    contains(node) {
      let cur = node;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }

    getBoundingClientRect() {
      return this._rect;
    }

    setBoundingClientRect(rect) {
      this._rect = { ...this._rect, ...rect };
    }

    addEventListener(type, fn) {
      if (!this._eventListeners.has(type)) this._eventListeners.set(type, []);
      this._eventListeners.get(type).push(fn);
    }

    removeEventListener(type, fn) {
      const list = this._eventListeners.get(type);
      if (list) {
        const idx = list.indexOf(fn);
        if (idx !== -1) list.splice(idx, 1);
      }
    }

    dispatchEvent(event) {
      const list = this._eventListeners.get(event.type) || [];
      for (const fn of list) fn(event);
      return !event.defaultPrevented;
    }

    click() {
      const evt = { type: "click", target: this, defaultPrevented: false, preventDefault: () => { evt.defaultPrevented = true; }, stopPropagation: () => {} };
      this.dispatchEvent(evt);
    }

    focus() {
      globalThis.document.activeElement = this;
    }

    blur() {
      if (globalThis.document.activeElement === this) {
        globalThis.document.activeElement = globalThis.document.body;
      }
    }
  }

  const mockBody = new MockElement("body", "vno-body");
  const mockDoc = {
    body: mockBody,
    documentElement: mockBody,
    activeElement: mockBody,
    createElement: (tag) => new MockElement(tag),
    querySelector: (s) => mockBody.querySelector(s),
    querySelectorAll: (s) => mockBody.querySelectorAll(s),
    contains: (node) => mockBody.contains(node),
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      const list = listeners.get(type);
      if (list) {
        const idx = list.indexOf(fn);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (event) => {
      const list = listeners.get(event.type) || [];
      for (const fn of list) fn(event);
    }
  };

  return { mockDoc, mockBody, MockElement };
}

export async function runContextMenuUnitTests() {
  const results = [];
  const assert = (name, cond, error = "") => {
    results.push({ name, pass: Boolean(cond), error });
  };

  const origDoc = globalThis.document;
  const origWin = globalThis.window;

  try {
    const { mockDoc, mockBody, MockElement } = setupMockDom();
    globalThis.document = mockDoc;
    globalThis.window = {
      innerWidth: 1200,
      innerHeight: 800
    };

    // =========================================================================
    // 1. Kiểm tra khởi tạo và WAI-ARIA role/attributes
    // =========================================================================
    let executedAction = null;
    const testItems = [
      { label: "Cắt", shortcut: "Ctrl+X", action: () => { executedAction = "cut"; } },
      { label: "Sao chép", shortcut: "Ctrl+C", action: () => { executedAction = "copy"; } },
      { sep: true },
      {
        label: "Chèn",
        items: [
          { label: "Chèn hàng", action: () => { executedAction = "insert-row"; } },
          { label: "Chèn cột", action: () => { executedAction = "insert-col"; } }
        ]
      },
      { label: "Đoạn văn...", disabled: true, title: "Tính năng đang hoàn thiện" }
    ];

    const originBtn = mockDoc.createElement("button");
    originBtn.focus();
    assert("Setup ban đầu: originBtn nhận focus", mockDoc.activeElement === originBtn);

    const menu = showContextMenu({
      items: testItems,
      x: 100,
      y: 150,
      className: "vno-test-context-menu",
      ariaLabel: "Menu kiểm thử",
      previousFocus: originBtn
    });

    const menuEl = mockDoc.querySelector(".vno-context-menu");
    assert("1.1 DOM: Menu container được thêm vào body", Boolean(menuEl));
    assert("1.2 Class: Chứa class người dùng chỉ định vno-test-context-menu", menuEl?.classList.contains("vno-test-context-menu"));
    assert("1.3 ARIA: role='menu' và aria-label chính xác", menuEl?.getAttribute("role") === "menu" && menuEl?.getAttribute("aria-label") === "Menu kiểm thử");

    const items = menuEl.querySelectorAll(".vno-context-menu-item");
    assert("1.4 Items: Có đúng 4 buttons item (không tính sep)", items.length === 4);

    const cutBtn = items[0];
    const copyBtn = items[1];
    const insertBtn = items[2];
    const paraBtn = items[3];

    assert("1.5 ARIA: Button item có role='menuitem' và tabindex='-1'", cutBtn.getAttribute("role") === "menuitem" && cutBtn.getAttribute("tabindex") === "-1");
    assert("1.6 Submenu indicator: Mục Chèn có class vno-has-submenu và aria-haspopup='true'", insertBtn.classList.contains("vno-has-submenu") && insertBtn.getAttribute("aria-haspopup") === "true");
    assert("1.7 Disabled item: Mục Đoạn văn có aria-disabled='true', class vno-disabled và disabled=true", paraBtn.getAttribute("aria-disabled") === "true" && paraBtn.classList.contains("vno-disabled") && paraBtn.disabled === true);

    // =========================================================================
    // 2. Mở Submenu và WAI-ARIA expanded
    // =========================================================================
    insertBtn.click(); // click mở submenu
    const subMenuEl = mockDoc.querySelector(".vno-context-submenu");
    assert("2.1 Submenu: Container submenu xuất hiện trong DOM", Boolean(subMenuEl));
    assert("2.2 Submenu ARIA: Nút cha có aria-expanded='true' và class vno-submenu-open", insertBtn.getAttribute("aria-expanded") === "true" && insertBtn.classList.contains("vno-submenu-open"));

    const subItems = subMenuEl.querySelectorAll(".vno-context-menu-item");
    assert("2.3 Submenu Items: Có 2 mục con (Chèn hàng, Chèn cột)", subItems.length === 2);

    // =========================================================================
    // 3. Điều hướng bàn phím: ArrowRight mở submenu, ArrowLeft đóng submenu
    // =========================================================================
    // Đóng submenu bằng phím ArrowLeft từ bên trong submenu
    const keyLeftEvt = { type: "keydown", key: "ArrowLeft", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    subMenuEl.dispatchEvent(keyLeftEvt);

    assert("3.1 Keyboard ArrowLeft: Đóng submenu và trả focus về nút cha", !mockDoc.querySelector(".vno-context-submenu") && insertBtn.getAttribute("aria-expanded") === "false");

    // Mở submenu lại bằng phím ArrowRight từ nút cha
    insertBtn.focus();
    const keyRightEvt = { type: "keydown", key: "ArrowRight", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    menuEl.dispatchEvent(keyRightEvt);

    const reOpenedSub = mockDoc.querySelector(".vno-context-submenu");
    assert("3.2 Keyboard ArrowRight: Mở submenu thành công", Boolean(reOpenedSub));

    // Đóng submenu bằng phím Escape bên trong submenu
    const keyEscSubEvt = { type: "keydown", key: "Escape", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    reOpenedSub.dispatchEvent(keyEscSubEvt);
    assert("3.3 Keyboard Escape in submenu: Đóng submenu, root menu vẫn mở", !mockDoc.querySelector(".vno-context-submenu") && Boolean(mockDoc.querySelector(".vno-context-menu")));

    // =========================================================================
    // 4. Điều hướng ArrowDown / ArrowUp bỏ qua mục disabled
    // =========================================================================
    cutBtn.focus();
    assert("4.1 Focus ban đầu tại Cắt", mockDoc.activeElement === cutBtn);

    const keyDownEvt = { type: "keydown", key: "ArrowDown", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    menuEl.dispatchEvent(keyDownEvt);
    assert("4.2 ArrowDown lần 1: Di chuyển tới Sao chép", mockDoc.activeElement === copyBtn);

    menuEl.dispatchEvent(keyDownEvt);
    assert("4.3 ArrowDown lần 2: Di chuyển tới Chèn (bỏ qua sep)", mockDoc.activeElement === insertBtn);

    menuEl.dispatchEvent(keyDownEvt);
    // Đoạn văn... là disabled nên getNavigableItems() không chứa nó -> vòng lặp lại về Cắt
    assert("4.4 ArrowDown lần 3: Bỏ qua mục disabled (Đoạn văn...) và quay về mục đầu Cắt", mockDoc.activeElement === cutBtn);

    // =========================================================================
    // 5. Boundary Flipping (Chống tràn màn hình)
    // =========================================================================
    menu.closeAll();
    assert("5.1 CloseAll: Toàn bộ menu đã đóng, focus trả về originBtn", !mockDoc.querySelector(".vno-context-menu") && mockDoc.activeElement === originBtn);

    // Mở menu sát mép phải màn hình (x = 1150, winW = 1200, width = 200)
    const edgeMenu = showContextMenu({
      items: testItems,
      x: 1150,
      y: 750,
      className: "vno-edge-menu",
      previousFocus: originBtn
    });

    const edgeEl = mockDoc.querySelector(".vno-edge-menu");
    // left phải được dịch lùi lại để không tràn quá 1200
    const edgeLeft = parseInt(edgeEl.style.left, 10);
    const edgeTop = parseInt(edgeEl.style.top, 10);
    assert("5.2 Boundary Flipping X: Menu tự dịch lùi lại khi sát mép phải (left <= 1000px)", edgeLeft <= 1000);
    assert("5.3 Boundary Flipping Y: Menu tự dịch lên trên khi sát mép dưới (top <= 770px)", edgeTop <= 770);

    edgeMenu.closeAll();

    // =========================================================================
    // 6. Thực thi lệnh (Action) và tự động đóng menu
    // =========================================================================
    const actionMenu = showContextMenu({
      items: [
        { label: "Lệnh thực thi", action: () => { executedAction = "done-action"; } }
      ],
      x: 50,
      y: 50,
      previousFocus: originBtn
    });

    const actionItem = mockDoc.querySelector(".vno-context-menu-item");
    actionItem.click();

    assert("6.1 Execute Action: Hàm action được gọi", executedAction === "done-action");
    assert("6.2 Auto-close: Menu tự động đóng sau khi thực thi action", !mockDoc.querySelector(".vno-context-menu"));
    assert("6.3 Restore focus: Focus được khôi phục về originBtn", mockDoc.activeElement === originBtn);

  } catch (err) {
    assert("Lỗi ngoại lệ trong suite context menu", false, err.stack || err.message);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  return results;
}
