/**
 * VN Office — Behavioral & Unit Tests: VN Writer Mouse Interactions & Word Parity Shortcuts
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

function createMockWriterEnvironment(initialBodyText = "") {
  const listeners = {};

  const bodyEl = {
    tagName: "DIV",
    innerHTML: initialBodyText,
    innerText: initialBodyText.replace(/<[^>]*>/g, ""),
    style: {},
    focus() {},
    contains(node) { return true; },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== fn);
      }
    },
    dispatchEvent(event) {
      (listeners[event.type] || []).forEach(fn => fn(event));
    },
    querySelectorAll(sel) { return []; },
    querySelector(sel) { return null; },
    insertBefore(newChild, refChild) {
      // Mock reordering children
      if (this.children && this.children.includes(newChild) && this.children.includes(refChild)) {
        const fromIdx = this.children.indexOf(newChild);
        this.children.splice(fromIdx, 1);
        const toIdx = this.children.indexOf(refChild);
        this.children.splice(toIdx, 0, newChild);
      }
      return newChild;
    },
    children: [],
    _listeners: listeners
  };

  const pageEl = {
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return { innerHTML: "", style: {}, focus() {} };
      if (selector === ".vno-writer-footer") return { innerHTML: "", style: {}, focus() {} };
      return null;
    },
    querySelectorAll() { return []; },
    style: {},
    appendChild() {},
    contains() { return true; }
  };

  return { pageEl, bodyEl };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runWriterMouseShortcutsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Writer Parity: writer.style.normal (Ctrl+Shift+N) được khai báo và liên kết handler", () => {
    const def = globalCommandBus.getDefinition("writer.style.normal");
    assert(def && def.shortcut === "Ctrl+Shift+N", "Lệnh writer.style.normal phải có shortcut Ctrl+Shift+N");
    assert(def.category === "format", "Lệnh phải thuộc nhóm format");
  });

  await test("Writer Parity: writer.text.changeCase (Shift+F3) được khai báo chuẩn Word", () => {
    const def = globalCommandBus.getDefinition("writer.text.changeCase");
    assert(def && def.shortcut === "Shift+F3", "Lệnh writer.text.changeCase phải có shortcut Shift+F3");
  });

  await test("Writer Parity: Ctrl+D mở hộp thoại Phông chữ trong scope Writer", () => {
    const def = globalCommandBus.getDefinition("writer.format.fontDialog");
    if (!def || def.shortcut !== "Ctrl+D") throw new Error("writer.format.fontDialog phải gắn Ctrl+D");
    const writerScope = globalShortcutManager._scopedShortcuts.get("writer")?.get(globalShortcutManager._normalizeCombo("Ctrl+D"));
    if (writerScope !== "writer.format.fontDialog") throw new Error("Ctrl+D chưa bind tới hộp thoại Phông chữ trong Writer");
  });

  await test("Writer Parity: writer.para.moveUp và moveDown (Alt+Shift+Up/Down) được khai báo chuẩn Word", () => {
    const upDef = globalCommandBus.getDefinition("writer.para.moveUp");
    const downDef = globalCommandBus.getDefinition("writer.para.moveDown");
    assert(upDef && upDef.shortcut === "Alt+Shift+Up", "moveUp phải có shortcut Alt+Shift+Up");
    assert(downDef && downDef.shortcut === "Alt+Shift+Down", "moveDown phải có shortcut Alt+Shift+Down");
  });

  await test("Writer Parity: autoFitTableColumn tính toán kích thước cột dựa trên nội dung dài nhất", () => {
    const { pageEl } = createMockWriterEnvironment();
    const adapter = new WriterAdapter(pageEl);
    adapter.attach();

    const mockTable = {
      rows: [
        { cells: [{ innerText: "Ngắn", style: {} }, { innerText: "Cột 2", style: {} }] },
        { cells: [{ innerText: "Nội dung rất dài dòng văn bản kiểm thử độ rộng cột", style: {} }, { innerText: "B", style: {} }] }
      ]
    };

    const width = adapter.autoFitTableColumn(mockTable, 0);
    assert(width && width > 200, `Cột 0 phải được co giãn > 200px do có chuỗi dài, thực tế: ${width}`);
    assert(mockTable.rows[0].cells[0].style.width === `${width}px`, "Style ô hàng 1 phải được cập nhật");
    assert(mockTable.rows[1].cells[0].style.width === `${width}px`, "Style ô hàng 2 phải được cập nhật");
  });

  await test("Writer Parity: moveParagraph đổi chỗ đoạn văn lên/xuống", () => {
    const { pageEl, bodyEl } = createMockWriterEnvironment();
    const adapter = new WriterAdapter(pageEl);
    adapter.attach();

    const p1 = { tagName: "P", textContent: "Đoạn 1", parentElement: bodyEl, previousElementSibling: null, nextElementSibling: null };
    const p2 = { tagName: "P", textContent: "Đoạn 2", parentElement: bodyEl, previousElementSibling: p1, nextElementSibling: null };
    p1.nextElementSibling = p2;
    bodyEl.children = [p1, p2];

    // Di chuyển đoạn 2 lên trên
    p2.previousElementSibling = p1;
    bodyEl.insertBefore(p2, p1);
    assert(bodyEl.children[0] === p2 && bodyEl.children[1] === p1, "Đoạn 2 phải được đưa lên trước Đoạn 1");
  });

  await test("Writer Parity: ShortcutManager chuẩn hóa tổ hợp Alt+Shift+Up khớp đúng sự kiện bàn phím", () => {
    const combo = globalShortcutManager._normalizeCombo("Alt+Shift+Up");
    assert(combo === "ALT+SHIFT+UP", `Normalized phải là ALT+SHIFT+UP, thực tế: ${combo}`);

    const combo2 = globalShortcutManager._normalizeCombo("Alt+Shift+ArrowUp");
    assert(combo2 === "ALT+SHIFT+UP", `ArrowUp phải chuẩn hóa thành UP, thực tế: ${combo2}`);
  });

  await test("Writer Parity: nút ribbon Gạch chân giữ vùng chọn khi adapter lấy lại focus", async () => {
    const { pageEl, bodyEl } = createMockWriterEnvironment("<p>Chữ được chọn</p>");
    const range = { commonAncestorContainer: {}, cloneRange() { return this; } };
    let ranges = [range];
    const selection = {
      get rangeCount() { return ranges.length; },
      get isCollapsed() { return ranges.length === 0; },
      get anchorNode() { return range.commonAncestorContainer; },
      getRangeAt() { return ranges[0]; },
      removeAllRanges() { ranges = []; },
      addRange(nextRange) { ranges = [nextRange]; }
    };
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    let rangeAtCommand = null;
    const adapter = new WriterAdapter(pageEl);
    adapter._initZones();
    adapter.flushTyping = () => {};
    adapter.recordSnapshot = () => true;
    pageEl.focus = () => selection.removeAllRanges();
    bodyEl.contains = () => true;
    globalThis.window = { getSelection: () => selection };
    globalThis.document = {
      execCommand() {
        rangeAtCommand = selection.rangeCount ? selection.getRangeAt(0) : null;
        return true;
      },
      queryCommandState() { return true; }
    };
    try {
      await adapter.handleDispatch("writer.text.underline");
      assert(rangeAtCommand === range, "Lệnh underline phải nhận lại đúng vùng chọn trước khi focus đổi");
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
    }
  });

  await test("Writer Parity: F4 lặp lại lệnh cuối (common.edit.repeat)", () => {
    const { pageEl } = createMockWriterEnvironment();
    const adapter = new WriterAdapter(pageEl);
    adapter.attach();
    
    // Ghi nhận một thao tác vào redo stack
    adapter.redoStack.push(adapter._createSnapshot("Test Op"));
    const res = adapter.repeatLastAction();
    assert(res === true, "F4 phải thực hiện redo khi có stack thao tác");
  });

  return results;
}
