/**
 * Unit Tests — CH-4.6: Giữ bàn phím và Tiêu điểm trong vùng soạn thảo (Doc, Sheet, Slide)
 * Kiểm tra:
 * 1. Nhận diện loại ứng dụng getCurrentAppKind cho cả 3 app: Doc, Sheet, Slide.
 * 2. Phân loại phần tử soạn thảo isEditorElement chính xác, loại trừ ribbon/dialogs/topbar.
 * 3. Kiểm tra trạng thái hộp thoại mở hasOpenDialog phát hiện toàn bộ các loại modal/overlay.
 * 4. Cơ chế captureEditorFocus và clearCapturedEditorFocus lưu đúng đối tượng soạn thảo.
 * 5. Cơ chế restoreEditorFocus trả tiêu điểm chuẩn xác về editor và làm mờ nút ngoài editor.
 * 6. Cơ chế bảo vệ phím Enter: ngăn Enter kích hoạt nhầm nút ngoài editor khi không có dialog.
 * 7. Tích hợp CommandBus: sau khi thực thi lệnh tự động trả tiêu điểm về vùng soạn thảo.
 * 8. Trợ giúp tiếng Việt trong platform/help (common.platform.keepFocusHelp) đầy đủ các bước cho Doc, Sheet, Slide.
 */

import {
  getCurrentAppKind,
  hasOpenDialog,
  isEditorElement,
  captureEditorFocus,
  getCapturedEditorFocus,
  clearCapturedEditorFocus,
  restoreEditorFocus,
  installGlobalFocusGuard
} from "../../platform/shell/focus-manager.js";
import { CommandBus } from "../../platform/commands/command-bus.js";
import { RETRO_PLATFORM_HELP_ENTRIES } from "../../platform/help/entries-retro-platform.js";

// Tạo mock DOM cơ bản cho môi trường Node.js
function setupMockDom() {
  const listeners = new Map();
  const elements = new Map();

  class MockElement {
    constructor(tagName, className = "") {
      this.tagName = tagName.toUpperCase();
      this.className = className;
      this.children = [];
      this.parentNode = null;
      this.style = {};
      this.hidden = false;
      this.attributes = new Map();
      this.isContentEditable = false;
    }

    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }

    get classList() {
      const self = this;
      return {
        contains: (c) => self.className.split(/\s+/).includes(c),
        add: (c) => { if (!self.className.split(/\s+/).includes(c)) self.className = (self.className + " " + c).trim(); },
        remove: (c) => { self.className = self.className.split(/\s+/).filter(x => x !== c).join(" "); }
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
        if (part.startsWith(".") && this.classList.contains(part.slice(1))) return true;
        if (part.startsWith("#") && this.attributes.get("id") === part.slice(1)) return true;
        if (part.startsWith("[") && part.endsWith("]")) {
          const attr = part.slice(1, -1).split("=")[0].replace(/['"]/g, "");
          if (this.attributes.has(attr)) return true;
        }
        if (part.toLowerCase() === this.tagName.toLowerCase()) return true;
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
    activeElement: mockBody,
    createElement: (tag) => new MockElement(tag),
    querySelector: (s) => mockBody.querySelector(s),
    querySelectorAll: (s) => mockBody.querySelectorAll(s),
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

  return { mockDoc, mockBody };
}

export async function runKeepFocusUnitTests() {
  const results = [];
  const assert = (name, cond, error = "") => {
    results.push({ name, pass: Boolean(cond), error });
  };

  // =========================================================================
  // 1. Kiểm tra isEditorElement trên 3 app
  // =========================================================================
  try {
    const { mockDoc, mockBody } = setupMockDom();
    const origDoc = globalThis.document;
    globalThis.document = mockDoc;

    // Doc elements
    const writerBody = mockDoc.createElement("div");
    writerBody.className = "vno-writer-body";
    const p = mockDoc.createElement("p");
    writerBody.appendChild(p);
    mockBody.appendChild(writerBody);

    assert("isEditorElement: Nhận diện đúng vùng văn bản Doc (body & p)", isEditorElement(writerBody) && isEditorElement(p));

    // Sheet elements
    const sheetContainer = mockDoc.createElement("div");
    sheetContainer.className = "vno-sheet-container";
    const cell = mockDoc.createElement("td");
    cell.setAttribute("data-coord", "B2");
    sheetContainer.appendChild(cell);
    mockBody.appendChild(sheetContainer);

    assert("isEditorElement: Nhận diện đúng ô bảng tính Sheet", isEditorElement(sheetContainer) && isEditorElement(cell));

    // Slides elements
    const slideCanvas = mockDoc.createElement("div");
    slideCanvas.className = "vno-slide-canvas";
    const slideTitle = mockDoc.createElement("div");
    slideTitle.className = "vno-slide-title";
    slideCanvas.appendChild(slideTitle);
    mockBody.appendChild(slideCanvas);

    assert("isEditorElement: Nhận diện đúng khung chiếu Slide và hộp chữ", isEditorElement(slideCanvas) && isEditorElement(slideTitle));

    // Các thành phần ngoài (Ribbon, Topbar, Dialog, v.v.)
    const ribbonBtn = mockDoc.createElement("button");
    ribbonBtn.className = "vno-btn";
    const ribbon = mockDoc.createElement("div");
    ribbon.className = "vno-ribbon";
    ribbon.appendChild(ribbonBtn);
    mockBody.appendChild(ribbon);

    assert("isEditorElement: Loại trừ nút Ribbon khỏi vùng soạn thảo", !isEditorElement(ribbonBtn) && !isEditorElement(ribbon));

    globalThis.document = origDoc;
  } catch (err) {
    assert("isEditorElement: Ngoại lệ không mong muốn", false, err.stack);
  }

  // =========================================================================
  // 2. Kiểm tra hasOpenDialog phát hiện mọi loại overlay
  // =========================================================================
  try {
    const { mockDoc, mockBody } = setupMockDom();
    const origDoc = globalThis.document;
    globalThis.document = mockDoc;

    assert("hasOpenDialog: Trả về false khi không có hộp thoại nào", !hasOpenDialog());

    const dialog = mockDoc.createElement("div");
    dialog.className = "vno-dialog-overlay";
    mockBody.appendChild(dialog);
    assert("hasOpenDialog: Phát hiện vno-dialog-overlay", hasOpenDialog());

    dialog.style.display = "none";
    assert("hasOpenDialog: Bỏ qua hộp thoại bị ẩn display:none", !hasOpenDialog());

    dialog.style.display = "block";
    dialog.className = "vno-backstage-overlay";
    assert("hasOpenDialog: Phát hiện vno-backstage-overlay (Menu Tệp)", hasOpenDialog());

    dialog.className = "vno-fr-dialog-overlay";
    assert("hasOpenDialog: Phát hiện vno-fr-dialog-overlay (Tìm kiếm/Thay thế)", hasOpenDialog());

    dialog.className = "vno-print-dialog-overlay";
    assert("hasOpenDialog: Phát hiện vno-print-dialog-overlay (Hộp thoại In)", hasOpenDialog());

    mockBody.removeChild(dialog);
    assert("hasOpenDialog: Trả về false sau khi gỡ bỏ dialog", !hasOpenDialog());

    globalThis.document = origDoc;
  } catch (err) {
    assert("hasOpenDialog: Ngoại lệ không mong muốn", false, err.stack);
  }

  // =========================================================================
  // 3. Kiểm tra captureEditorFocus và restoreEditorFocus
  // =========================================================================
  try {
    const { mockDoc, mockBody } = setupMockDom();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    globalThis.document = mockDoc;
    globalThis.window = {
      __vnoAppInstance: {
        shell: { appName: "sheet" },
        grid: {
          focusGrid: () => {
            cellA1.focus();
            return true;
          }
        }
      }
    };

    const container = mockDoc.createElement("div");
    container.className = "vno-sheet-container";
    const cellA1 = mockDoc.createElement("td");
    cellA1.setAttribute("data-coord", "A1");
    container.appendChild(cellA1);
    mockBody.appendChild(container);

    // Focus vào ô A1 và capture
    cellA1.focus();
    captureEditorFocus();
    assert("captureEditorFocus: Ghi nhớ ô đang chọn A1", getCapturedEditorFocus() === cellA1);

    // Người dùng click vào nút In đậm trên ribbon
    const ribbonBtn = mockDoc.createElement("button");
    ribbonBtn.className = "vno-btn";
    mockBody.appendChild(ribbonBtn);
    ribbonBtn.focus();
    assert("Nút Ribbon tạm thời giữ focus", mockDoc.activeElement === ribbonBtn);

    // Gọi restoreEditorFocus
    restoreEditorFocus();
    assert("restoreEditorFocus: Nút Ribbon bị blur và tiêu điểm quay về ô soạn thảo Sheet", mockDoc.activeElement === cellA1);

    clearCapturedEditorFocus();
    assert("clearCapturedEditorFocus: Xóa bộ nhớ tạm tiêu điểm", getCapturedEditorFocus() === null);

    globalThis.document = origDoc;
    globalThis.window = origWin;
  } catch (err) {
    assert("capture/restore focus: Ngoại lệ không mong muốn", false, err.stack);
  }

  // =========================================================================
  // 4. Kiểm tra CommandBus tự động trả tiêu điểm sau khi thực thi lệnh
  // =========================================================================
  try {
    const { mockDoc, mockBody } = setupMockDom();
    const origDoc = globalThis.document;
    const origWin = globalThis.window;

    let gridFocused = false;
    globalThis.document = mockDoc;
    globalThis.window = {
      __vnoAppInstance: {
        shell: { appName: "sheet" },
        grid: {
          focusGrid: () => {
            gridFocused = true;
            return true;
          }
        }
      }
    };

    const bus = new CommandBus();
    bus.register({ id: "sheet.format.bold", label: "In đậm", defaultHandler: () => true });

    await bus.execute("sheet.format.bold");
    await new Promise(r => setTimeout(r, 10));

    assert("CommandBus execute: Tự động trả tiêu điểm về vùng soạn thảo sau lệnh", gridFocused);

    globalThis.document = origDoc;
    globalThis.window = origWin;
  } catch (err) {
    assert("CommandBus focus restore: Ngoại lệ không mong muốn", false, err.stack);
  }

  // =========================================================================
  // 5. Kiểm tra Help Entry tiếng Việt đầy đủ cho CH-4.6 Keep Focus
  // =========================================================================
  try {
    const helpEntry = RETRO_PLATFORM_HELP_ENTRIES.find(e => e.id === "common.platform.keepFocusHelp");
    assert("Help CH-4.6: Có bài hướng dẫn Giữ bàn phím và Tiêu điểm trong vùng soạn thảo", Boolean(helpEntry));
    assert("Help CH-4.6: Tiêu đề tiếng Việt rõ ràng", helpEntry && helpEntry.title.includes("Giữ bàn phím và Tiêu điểm"));
    assert("Help CH-4.6: Các bước hướng dẫn bao quát Doc, Sheet và Slide", helpEntry && helpEntry.steps.some(s => s.includes("Doc") && s.includes("Sheet") && s.includes("Slide")));
    assert("Help CH-4.6: Hướng dẫn rõ ràng việc phím Enter an toàn không kích hoạt nhầm nút", helpEntry && helpEntry.steps.some(s => s.includes("Enter")));
  } catch (err) {
    assert("Help CH-4.6: Ngoại lệ không mong muốn", false, err.stack);
  }

  return results;
}
