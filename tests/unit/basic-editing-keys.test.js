import {
  captureSelectionBookmark,
  restoreSelectionBookmark
} from "../../platform/text/spellcheck-dom-controller.js";
import { resolveWriterTabBehavior, WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { ShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeElement(tagName) {
  const element = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: [],
    parentNode: null,
    parentElement: null,
    append(...nodes) {
      for (const node of nodes) {
        node.parentNode = this;
        node.parentElement = this;
        this.childNodes.push(node);
      }
    },
    replaceChildren(...nodes) {
      this.childNodes = [];
      this.append(...nodes);
    },
    contains(target) {
      for (let node = target; node; node = node.parentNode) if (node === this) return true;
      return false;
    },
    closest(selector) {
      const tags = selector.split(",").map(value => value.trim().toUpperCase());
      for (let node = this; node; node = node.parentElement) if (tags.includes(node.tagName)) return node;
      return null;
    }
  };
  return element;
}

function fakeText(data) {
  return { nodeType: 3, data, parentNode: null, parentElement: null };
}

function mockGridContainer() {
  let focusCount = 0;
  return {
    dataset: {},
    setAttribute() {},
    style: {},
    innerHTML: "",
    className: "",
    appendChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    focus() { focusCount++; },
    get focusCount() { return focusCount; }
  };
}

async function test(name, fn) {
  try { return { name, pass: true, detail: await fn() }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}

export async function runBasicEditingKeysTests() {
  const results = [];

  results.push(await test("Writer spell-check caret bookmark stays in the same paragraph after marker wrapping", () => {
    const oldDocument = globalThis.document;
    const oldGetSelection = globalThis.getSelection;
    const root = fakeElement("div");
    const first = fakeElement("p");
    const second = fakeElement("p");
    const firstText = fakeText("abc");
    const secondText = fakeText("Dong mot");
    first.append(firstText);
    second.append(secondText);
    root.append(first, second);
    const selection = {
      rangeCount: 1,
      isCollapsed: true,
      anchorNode: secondText,
      anchorOffset: 6,
      focusNode: secondText,
      focusOffset: 6,
      setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset) {
        this.anchorNode = anchorNode;
        this.anchorOffset = anchorOffset;
        this.focusNode = focusNode;
        this.focusOffset = focusOffset;
      }
    };
    globalThis.document = { activeElement: root };
    globalThis.getSelection = () => selection;
    try {
      const bookmark = captureSelectionBookmark(root);
      const markerA = fakeElement("span");
      markerA.append(fakeText("abc"));
      first.replaceChildren(markerA);
      const markerWord = fakeElement("span");
      markerWord.append(fakeText("mot"));
      second.replaceChildren(fakeText("Dong "), markerWord);
      restoreSelectionBookmark(root, bookmark);
      assert(selection.anchorNode.parentElement === markerWord, "con trỏ phải còn trong đoạn thứ hai sau khi bọc từ");
      assert(selection.anchorOffset === 1, `offset trong từ phải là 1, thực tế ${selection.anchorOffset}`);
    } finally {
      globalThis.document = oldDocument;
      if (oldGetSelection === undefined) delete globalThis.getSelection;
      else globalThis.getSelection = oldGetSelection;
    }
  }));

  results.push(await test("Writer Tab maps normal text, list indentation, table traversal and the final table cell", () => {
    assert(resolveWriterTabBehavior() === "insertTab", "Tab outside lists/tables inserts a tab character");
    assert(resolveWriterTabBehavior({ shiftKey: true }) === "ignore", "Shift+Tab ngoài bảng/danh sách phải vô hại");
    assert(resolveWriterTabBehavior({ inListAtStart: true }) === "listIndent", "Tab đầu mục phải tăng cấp danh sách");
    assert(resolveWriterTabBehavior({ inListAtStart: true, shiftKey: true }) === "listOutdent", "Shift+Tab đầu mục phải giảm cấp danh sách");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 1, cellCount: 3 }) === "nextCell", "Tab trong bảng phải sang ô kế tiếp");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 1, cellCount: 3, shiftKey: true }) === "previousCell", "Shift+Tab trong bảng phải về ô trước");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 2, cellCount: 3 }) === "appendTableRow", "Tab ở ô cuối phải thêm hàng");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 0, cellCount: 3, shiftKey: true }) === "ignore", "Shift+Tab ở ô đầu phải không thoát bảng");
  }));

  results.push(await test("Writer paste event uses clipboard HTML/text and the plain-text command selects text only", async () => {
    const adapter = Object.create(WriterAdapter.prototype);
    const captured = [];
    adapter._readClipboardFromSystem = async () => ({ status: "ok", html: "<b>định dạng</b>", text: "định dạng" });
    adapter._insertClipboardContent = data => { captured.push(data); return true; };
    assert(await adapter._pasteFromSystemClipboard(false), "Dán định dạng phải thành công");
    assert(captured.at(-1).html === "<b>định dạng</b>", "Dán thường phải giữ HTML clipboard");
    assert(await adapter._pastePlainText(), "Dán văn bản thuần phải thành công");
    assert(captured.at(-1).html === "" && captured.at(-1).text === "định dạng", "Dán thuần không được chèn HTML");

    const root = { listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } };
    adapter.headerDom = null;
    adapter.bodyDom = root;
    adapter.footerDom = null;
    adapter._clipboardEventRoots = null;
    adapter._insertClipboardContent = data => { captured.push(data); };
    adapter._bindClipboardEvents();
    let prevented = false;
    root.listeners.paste({
      clipboardData: { getData(type) { return type === "text/html" ? "<strong>giữ kiểu</strong>" : "giữ kiểu"; } },
      preventDefault() { prevented = true; }
    });
    assert(prevented && captured.at(-1).html === "<strong>giữ kiểu</strong>", "paste event phải dùng HTML đã có trong clipboard");
  }));

  results.push(await test("Sheet Enter after a Tab sequence returns to its starting column and focus target is callable", () => {
    const container = mockGridContainer();
    const grid = new SheetGridController(container);
    grid.selectedCoord = { c: "A", r: 2 };
    grid._beginTabSequence();
    grid.selectedCoord = { c: "C", r: 2 };
    const next = grid._enterDestination(false);
    assert(next.c === "A" && next.r === 3, `Enter sau Tab phải chọn A3, thực tế ${next.c}${next.r}`);
    grid.selectedCoord = { c: "D", r: 4 };
    const ordinary = grid._enterDestination(false);
    assert(ordinary.c === "D" && ordinary.r === 5, "Enter bình thường phải giữ cột đang chọn");
    assert(grid.focusGrid() && container.focusCount === 1, "lưới phải có focus target chủ động");
  }));

  results.push(await test("Writer clipboard keys keep native events and Sheet keys route to the grid command", () => {
    const manager = new ShortcutManager();
    manager.bind("Ctrl+C", "common.edit.copy");
    manager.bind("Ctrl+X", "common.edit.cut");
    manager.bind("Ctrl+V", "common.edit.paste");
    const sheetRoot = { isContentEditable: false, classList: { contains: name => name === "vno-sheet-container" } };
    let sheetPrevented = false;
    manager._handleKeyDown({
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      target: { closest: selector => selector === "[data-vno-native-clipboard]" ? sheetRoot : null, matches: () => false },
      preventDefault() { sheetPrevented = true; }, stopPropagation() {}
    });
    assert(sheetPrevented, "Sheet clipboard shortcut must use its grid adapter command");
    const before = globalCommandBus.getHistory().length;
    for (const key of ["c", "x", "v"]) {
      let prevented = false;
      const target = {
        isContentEditable: true,
        closest: selector => selector === "[data-vno-native-clipboard]" ? { isContentEditable: true } : null,
        matches: () => false
      };
      manager._handleKeyDown({ key, ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, target, preventDefault() { prevented = true; }, stopPropagation() {} });
      assert(!prevented, `Ctrl+${key.toUpperCase()} không được hủy trước ClipboardEvent`);
    }
    assert(globalCommandBus.getHistory().length === before, "shortcut capture không được chạy command thay clipboard event");
  }));

  results.push(await test("Sheet clipboard parses outside text and defers Cut until paste", async () => {
    const values = new Map([["A1", { val: "move me", formula: "", style: {} }]]);
    let mark = null;
    let pasteArgs = null;
    let cleared = false;
    const grid = {
      selectedCoord: { c: "A", r: 1 },
      activeSheet: "Sheet1",
      selectionRange: { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      cellsData: values,
      setCellValue() {},
      _normalizeRange: range => range,
      _rangeContains: (_range, c, r) => c === "A" && r === 1,
      _columnNumber: col => col === "A" ? 1 : col === "B" ? 2 : 3,
      _columnLabel: n => n === 1 ? "A" : n === 2 ? "B" : "C",
      setClipboardRange: (range, mode, sheet) => { mark = { range, mode, sheet }; },
      clearClipboardRange: () => { cleared = true; },
      applyPasteSpecial: (model, mode, destination, options) => { pasteArgs = { model, mode, destination, options }; return true; }
    };
    const adapter = new SheetAdapter(grid);
    const model = adapter._clipboardModelFromText("123\tabc\r\nx\ty\r\n");
    assert(model.cells.length === 2 && model.cells[0].length === 2, "clipboard TSV phải tạo đúng ma trận 2×2");
    assert(model.cells[0][0].val === "123" && model.cells[0][1].val === "abc", "clipboard TSV phải giữ nội dung ô theo cột");

    const payload = adapter._captureSelectedClipboard();
    adapter._rememberClipboard(payload, "cut");
    assert(values.get("A1").val === "move me", "Ctrl+X phải giữ giá trị nguồn cho tới khi dán");
    assert(mark?.mode === "cut", "vùng Cắt phải được đánh dấu để người dùng thấy trạng thái");
    adapter._clipboardText = "move me";
    adapter._clipboardSourceSheet = "Sheet1";
    grid._clipboardRange = mark;
    await adapter._pasteModelIntoGrid(adapter._clipboardModel, "move me", true);
    assert(pasteArgs.options.moveRange.start.c === "A", "dán nội bộ sau Cắt phải gửi vùng nguồn để di chuyển trong một thao tác");
    assert(cleared, "viền Cắt phải biến mất sau khi dán");
    grid.selectedCoord = { c: "B", r: 2 };
    adapter._readClipboardData = async () => ({ status: "ok", text: "", html: "" });
    await adapter._pasteIntoSelectedCell();
    assert(pasteArgs.destination.c === "B" && pasteArgs.destination.r === 2,
      "an empty system clipboard read falls back to the cached Sheet cut/copy range");
  }));

  return results;
}
