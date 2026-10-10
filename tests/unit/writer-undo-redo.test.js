/**
 * VN Office — Behavioral & Unit Tests: VN Writer Deep Undo/Redo History
 * Kiểm thử toàn diện hệ thống hoàn tác / làm lại sâu chuẩn Microsoft Word
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

// Khởi tạo các command definitions trên Command Bus
registerAllStandardCommands(globalCommandBus);

/**
 * Tạo môi trường DOM giả lập đầy đủ cho một trang văn bản Writer
 */
function createMockWriterEnvironment(initialBodyText = "") {
  const listeners = {
    input: [],
    keydown: []
  };

  const styleObj = {
    width: "",
    minHeight: "",
    padding: ""
  };

  const headerEl = {
    innerHTML: "",
    innerText: "",
    focus() {}
  };

  const bodyEl = {
    innerHTML: initialBodyText,
    innerText: initialBodyText.replace(/<[^>]*>/g, ""),
    focus() {},
    contains() { return true; },
    dispatchEvent(event) {
      if (listeners.input) {
        listeners.input.forEach((fn) => fn(event));
      }
    },
    querySelectorAll(sel) {
      const results = [];
      if (sel.includes("ins") && bodyEl.innerHTML.includes("<ins")) {
        results.push({
          childNodes: [],
          replaceWith: (...nodes) => {
            bodyEl.innerHTML = bodyEl.innerHTML.replace(/<ins\b[^>]*>(.*?)<\/ins>/gi, "$1");
          },
          remove: () => {}
        });
      }
      if (sel.includes("del") && bodyEl.innerHTML.includes("<del")) {
        results.push({
          childNodes: [],
          remove: () => {
            bodyEl.innerHTML = bodyEl.innerHTML.replace(/<del\b[^>]*>.*?<\/del>/gi, "");
          }
        });
      }
      return results;
    },
    querySelector(sel) {
      if (sel === "[data-vno-change]" && (bodyEl.innerHTML.includes("<ins") || bodyEl.innerHTML.includes("<del"))) {
        return { nodeType: 1 };
      }
      return null;
    }
  };

  const footerEl = {
    innerHTML: "",
    innerText: "",
    focus() {}
  };

  const editorDom = {
    innerHTML: "",
    style: styleObj,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force !== undefined) {
          if (force) this._classes.add(c);
          else this._classes.delete(c);
        } else {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        }
      },
      contains(c) { return this._classes.has(c); }
    },
    querySelector(sel) {
      if (sel === ".vno-writer-header") return headerEl;
      if (sel === ".vno-writer-body") return bodyEl;
      if (sel === ".vno-writer-footer") return footerEl;
      return null;
    },
    querySelectorAll(sel) {
      return [];
    },
    focus() {},
    addEventListener(type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      if (!listeners[type]) return;
      const idx = listeners[type].indexOf(handler);
      if (idx >= 0) listeners[type].splice(idx, 1);
    },
    dispatchEvent(event) {
      if (listeners[event.type]) {
        listeners[event.type].forEach((fn) => fn(event));
      }
    }
  };

  return { editorDom, headerEl, bodyEl, footerEl, listeners, styleObj };
}

/**
 * Tạo mock document có Quick Access Toolbar buttons
 */
function setupMockDocumentButtons() {
  const mockUndoBtn = {
    disabled: true,
    _classes: new Set(["is-disabled"]),
    classList: {
      add(c) { mockUndoBtn._classes.add(c); },
      remove(c) { mockUndoBtn._classes.delete(c); },
      toggle(c, force) {
        if (force !== undefined) {
          if (force) mockUndoBtn._classes.add(c);
          else mockUndoBtn._classes.delete(c);
        } else {
          if (mockUndoBtn._classes.has(c)) mockUndoBtn._classes.delete(c);
          else mockUndoBtn._classes.add(c);
        }
      },
      contains(c) { return mockUndoBtn._classes.has(c); }
    },
    setAttribute(k, v) { if (k === "disabled") mockUndoBtn.disabled = true; },
    removeAttribute(k) { if (k === "disabled") mockUndoBtn.disabled = false; }
  };

  const mockRedoBtn = {
    disabled: true,
    _classes: new Set(["is-disabled"]),
    classList: {
      add(c) { mockRedoBtn._classes.add(c); },
      remove(c) { mockRedoBtn._classes.delete(c); },
      toggle(c, force) {
        if (force !== undefined) {
          if (force) mockRedoBtn._classes.add(c);
          else mockRedoBtn._classes.delete(c);
        } else {
          if (mockRedoBtn._classes.has(c)) mockRedoBtn._classes.delete(c);
          else mockRedoBtn._classes.add(c);
        }
      },
      contains(c) { return mockRedoBtn._classes.has(c); }
    },
    setAttribute(k, v) { if (k === "disabled") mockRedoBtn.disabled = true; },
    removeAttribute(k) { if (k === "disabled") mockRedoBtn.disabled = false; }
  };

  globalThis.document = {
    querySelectorAll: (sel) => {
      if (sel.includes("common.edit.undo")) return [mockUndoBtn];
      if (sel.includes("common.edit.redo")) return [mockRedoBtn];
      return [];
    },
    execCommand: () => true,
    queryCommandState: () => true
  };

  return { mockUndoBtn, mockRedoBtn };
}

export async function runWriterUndoRedoTests() {
  const results = [];

  // =========================================================================
  // TEST 1: Khởi tạo stack rỗng & Nút Undo/Redo bị disable đúng chuẩn Word
  // =========================================================================
  try {
    const { mockUndoBtn, mockRedoBtn } = setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Văn bản ban đầu</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    const isUndoEmpty = adapter.undoStack.length === 0;
    const isRedoEmpty = adapter.redoStack.length === 0;
    const canUndoInitial = adapter.canUndo();
    const canRedoInitial = adapter.canRedo();
    const undoCmdState = globalCommandBus.getState("common.edit.undo");
    const redoCmdState = globalCommandBus.getState("common.edit.redo");

    const passed =
      isUndoEmpty &&
      isRedoEmpty &&
      !canUndoInitial &&
      !canRedoInitial &&
      undoCmdState?.enabled === false &&
      redoCmdState?.enabled === false &&
      mockUndoBtn.disabled === true &&
      mockRedoBtn.disabled === true;

    results.push({
      name: "Writer Undo/Redo: Khởi tạo stack rỗng và vô hiệu hóa nút Undo/Redo trên Quick Access Toolbar",
      pass: passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 1 khởi tạo", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 2: Gõ chữ liên tục với debounce & Hoàn tác / Làm lại đúng thứ tự
  // =========================================================================
  try {
    const { mockUndoBtn, mockRedoBtn } = setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Đoạn 0</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    // 1. Gõ Đoạn 1
    env.bodyEl.innerHTML = "<p>Đoạn 0</p><p>Đoạn 1</p>";
    adapter._scheduleTypingSnapshot();
    adapter.flushTyping();

    // 2. Gõ Đoạn 2
    env.bodyEl.innerHTML = "<p>Đoạn 0</p><p>Đoạn 1</p><p>Đoạn 2</p>";
    adapter._scheduleTypingSnapshot();
    adapter.flushTyping();

    // 3. Gõ Đoạn 3
    env.bodyEl.innerHTML = "<p>Đoạn 0</p><p>Đoạn 1</p><p>Đoạn 2</p><p>Đoạn 3</p>";
    adapter._scheduleTypingSnapshot();
    adapter.flushTyping();

    const has3Steps = adapter.undoStack.length === 3;
    const canUndoAfterTyping = adapter.canUndo();

    // Undo lần 1 -> trở về Đoạn 2
    const undo1 = adapter.undo();
    const isAtStep2 = env.bodyEl.innerHTML.includes("Đoạn 2") && !env.bodyEl.innerHTML.includes("Đoạn 3");

    // Undo lần 2 -> trở về Đoạn 1
    const undo2 = adapter.undo();
    const isAtStep1 = env.bodyEl.innerHTML.includes("Đoạn 1") && !env.bodyEl.innerHTML.includes("Đoạn 2");

    // Undo lần 3 -> trở về Đoạn 0 (ban đầu)
    const undo3 = adapter.undo();
    const isAtStep0 = env.bodyEl.innerHTML.includes("Đoạn 0") && !env.bodyEl.innerHTML.includes("Đoạn 1");
    const canUndoAtStart = adapter.canUndo();
    const undoBtnDisabled = mockUndoBtn.disabled;

    // Undo lần 4 khi đã hết stack -> trả về false an toàn
    const undo4 = adapter.undo();

    // Redo lần 1 -> phục hồi Đoạn 1
    const redo1 = adapter.redo();
    const redoStep1 = env.bodyEl.innerHTML.includes("Đoạn 1") && !env.bodyEl.innerHTML.includes("Đoạn 2");

    // Redo lần 2 -> phục hồi Đoạn 2
    const redo2 = adapter.redo();
    const redoStep2 = env.bodyEl.innerHTML.includes("Đoạn 2") && !env.bodyEl.innerHTML.includes("Đoạn 3");

    // Redo lần 3 -> phục hồi Đoạn 3
    const redo3 = adapter.redo();
    const redoStep3 = env.bodyEl.innerHTML.includes("Đoạn 3");
    const canRedoAtEnd = adapter.canRedo();
    const redoBtnDisabled = mockRedoBtn.disabled;

    const test2Passed =
      has3Steps &&
      canUndoAfterTyping &&
      undo1 && isAtStep2 &&
      undo2 && isAtStep1 &&
      undo3 && isAtStep0 &&
      !canUndoAtStart && undoBtnDisabled &&
      undo4 === false &&
      redo1 && redoStep1 &&
      redo2 && redoStep2 &&
      redo3 && redoStep3 &&
      !canRedoAtEnd && redoBtnDisabled;

    results.push({
      name: "Writer Undo/Redo: Gõ nhiều đoạn văn, hoàn tác và làm lại chính xác tuyệt đối theo đúng thứ tự",
      pass: test2Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 2 gõ nhiều đoạn", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 3: Thao tác rời rạc — Chèn bảng rồi Undo phải mất bảng thật
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Văn bản trước khi chèn bảng</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    adapter.insertTable(3, 4);

    const hasBlankTable = () => env.bodyEl.innerHTML.includes("<table")
      && (env.bodyEl.innerHTML.match(/<td\b/g) || []).length === 12
      && (env.bodyEl.innerHTML.match(/<br><\/td>/g) || []).length === 12
      && !/Tiêu đề|Dữ liệu/.test(env.bodyEl.innerHTML);
    const hasTableBeforeUndo = hasBlankTable();
    const canUndoAfterTable = adapter.canUndo();

    const undoRes = adapter.undo();
    const noTableAfterUndo = !env.bodyEl.innerHTML.includes("<table") && env.bodyEl.innerHTML.includes("Văn bản trước khi chèn bảng");

    const redoRes = adapter.redo();
    const hasTableAfterRedo = hasBlankTable();

    const test3Passed = hasTableBeforeUndo && canUndoAfterTable && undoRes && noTableAfterUndo && redoRes && hasTableAfterRedo;

    results.push({
      name: "Writer Undo/Redo: Chèn bảng rồi hoàn tác làm mất bảng, làm lại khôi phục bảng trọn vẹn",
      pass: test3Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 3 chèn bảng", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 4: Đổi Page Setup rồi Undo phải khôi phục về khổ giấy & lề cũ
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Soạn thảo hợp đồng</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    adapter.setPageSetup({
      size: "letter",
      orientation: "landscape",
      margins: { top: 25, bottom: 25, left: 25, right: 25 }
    });

    const isLetterLandscape = adapter.pageSetup.size === "letter" && adapter.pageSetup.orientation === "landscape";
    const newTopMargin = adapter.pageSetup.margins.top === 25;

    const undoPageSetupRes = adapter.undo();
    const restoredSize = adapter.pageSetup.size === "a4";
    const restoredOrientation = adapter.pageSetup.orientation === "portrait";
    const restoredMargins = adapter.pageSetup.margins.top === 20;

    const redoPageSetupRes = adapter.redo();
    const redoneSize = adapter.pageSetup.size === "letter";
    const redoneOrientation = adapter.pageSetup.orientation === "landscape";

    const test4Passed =
      isLetterLandscape &&
      newTopMargin &&
      undoPageSetupRes &&
      restoredSize &&
      restoredOrientation &&
      restoredMargins &&
      redoPageSetupRes &&
      redoneSize &&
      redoneOrientation;

    results.push({
      name: "Writer Undo/Redo: Đổi Page Setup (khổ/hướng/lề) rồi hoàn tác khôi phục chuẩn xác cấu hình cũ",
      pass: test4Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 4 Page Setup", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 5: Phân tách trang (Page Break) & Áp dụng Kiểu dáng (Styles)
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Tiêu đề bài viết</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    adapter._insertPageBreak();
    const hasPageBreak = env.bodyEl.innerHTML.includes("page-break-before");

    adapter.undo();
    const noPageBreak = !env.bodyEl.innerHTML.includes("page-break-before");

    adapter.redo();
    const redonePageBreak = env.bodyEl.innerHTML.includes("page-break-before");

    const test5Passed = hasPageBreak && noPageBreak && redonePageBreak;
    results.push({
      name: "Writer Undo/Redo: Chèn ngắt trang (Page Break) hoàn tác và làm lại chuẩn xác",
      pass: test5Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 5 Page Break", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 6: Track Changes Accept/Reject & Comments có snapshot riêng
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment(
      `<p>Văn bản gốc <ins data-vno-change="insert">thêm mới</ins> <del data-vno-change="delete">bị xóa</del></p>`
    );
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    adapter.acceptAllTrackChanges();
    const hasAcceptedText = env.bodyEl.innerHTML.includes("thêm mới") && !env.bodyEl.innerHTML.includes("<ins") && !env.bodyEl.innerHTML.includes("bị xóa");

    adapter.undo();
    const hasRestoredMarkup = env.bodyEl.innerHTML.includes("<ins") && env.bodyEl.innerHTML.includes("<del");

    adapter.redo();
    const reaccepted = !env.bodyEl.innerHTML.includes("<ins") && !env.bodyEl.innerHTML.includes("<del");

    const test6Passed = hasAcceptedText && hasRestoredMarkup && reaccepted;
    results.push({
      name: "Writer Undo/Redo: Chấp nhận toàn bộ Track Changes có thể hoàn tác khôi phục lại thẻ đánh dấu",
      pass: test6Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 6 Track Changes", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 7: Nhánh lịch sử mới làm xóa sạch Redo Stack (Branching History)
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Khởi đầu</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    env.bodyEl.innerHTML = "<p>Khởi đầu</p><p>Hành động A</p>";
    adapter.recordSnapshot("Hành động A");

    env.bodyEl.innerHTML = "<p>Khởi đầu</p><p>Hành động A</p><p>Hành động B</p>";
    adapter.recordSnapshot("Hành động B");

    adapter.undo();
    const redoHasB = adapter.redoStack.length === 1 && adapter.canRedo();

    env.bodyEl.innerHTML = "<p>Khởi đầu</p><p>Hành động A</p><p>Hành động C mới</p>";
    adapter.recordSnapshot("Hành động C mới");

    const redoCleared = adapter.redoStack.length === 0;
    const canRedoAfterBranch = adapter.canRedo();

    const test7Passed = redoHasB && redoCleared && !canRedoAfterBranch;
    results.push({
      name: "Writer Undo/Redo: Phân nhánh lịch sử (thao tác mới sau khi hoàn tác) xóa sạch ngăn xếp làm lại",
      pass: test7Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 7 Branching History", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 8: Giới hạn ngăn xếp (maxUndoStack = 100) tránh tràn bộ nhớ
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Bắt đầu benchmark</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();
    adapter.maxUndoStack = 50;

    for (let i = 1; i <= 70; i++) {
      env.bodyEl.innerHTML = `<p>Bắt đầu benchmark</p><p>Thao tác số ${i}</p>`;
      adapter.recordSnapshot(`Thao tác ${i}`);
    }

    const stackBounded = adapter.undoStack.length === 50;

    results.push({
      name: "Writer Undo/Redo: Giới hạn hợp lý số bước trong ngăn xếp (maxUndoStack) ngăn ngừa phình bộ nhớ",
      pass: stackBounded
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 8 Stack Bound", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 9: Điều phối qua Command Bus & UNO URL (.uno:Undo / .uno:Redo)
  // =========================================================================
  try {
    const { mockUndoBtn, mockRedoBtn } = setupMockDocumentButtons();
    const env = createMockWriterEnvironment("<p>Soạn thảo hợp đồng</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    env.bodyEl.innerHTML = "<p>Soạn thảo hợp đồng</p><p>Điều 1: Trách nhiệm các bên</p>";
    adapter.recordSnapshot("Them Dieu 1");

    const executeUndoRes = await globalCommandBus.execute("common.edit.undo");
    const undoneViaBus = !env.bodyEl.innerHTML.includes("Điều 1");

    const executeRedoRes = await globalCommandBus.execute("common.edit.redo");
    const redoneViaBus = env.bodyEl.innerHTML.includes("Điều 1");

    const test9Passed = executeUndoRes && undoneViaBus && executeRedoRes && redoneViaBus;
    results.push({
      name: "Writer Undo/Redo: Tích hợp hoàn hảo qua Command Bus và ánh xạ lệnh .uno:Undo / .uno:Redo",
      pass: test9Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 9 Command Bus", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 10: Cô lập trạng thái giữa hai tài liệu độc lập (Document Isolation)
  // =========================================================================
  try {
    const envDoc1 = createMockWriterEnvironment("<p>Tài liệu 1</p>");
    const envDoc2 = createMockWriterEnvironment("<p>Tài liệu 2</p>");

    const adapter1 = new WriterAdapter(envDoc1.editorDom);
    const adapter2 = new WriterAdapter(envDoc2.editorDom);

    envDoc1.bodyEl.innerHTML = "<p>Tài liệu 1 sửa đổi</p>";
    adapter1.recordSnapshot("Sua Doc 1");

    const adapter2CanUndo = adapter2.canUndo();
    const adapter1CanUndo = adapter1.canUndo();

    adapter1.undo();
    const doc1Restored = envDoc1.bodyEl.innerHTML.includes("<p>Tài liệu 1</p>");
    const doc2Untouched = envDoc2.bodyEl.innerHTML === "<p>Tài liệu 2</p>";

    const test10Passed = adapter1CanUndo && !adapter2CanUndo && doc1Restored && doc2Untouched;
    results.push({
      name: "Writer Undo/Redo: Cô lập hoàn toàn trạng thái giữa các tài liệu khác nhau, không rò rỉ chéo stack",
      pass: test10Passed
    });
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 10 Document Isolation", pass: false, error: err.message });
  }

  // =========================================================================
  // TEST 11: Undo khôi phục caret vào text node thay vì body container
  // =========================================================================
  try {
    setupMockDocumentButtons();
    const oldDocument = globalThis.document;
    const oldWindow = globalThis.window;
    const textNode = { nodeType: 3, textContent: "Chapter 1" };
    const env = createMockWriterEnvironment("<p>Chapter 1</p>");
    const makeRange = () => ({
      startContainer: textNode,
      startOffset: 9,
      endContainer: textNode,
      endOffset: 9,
      selectNodeContents() { this.startContainer = env.bodyEl; this.startOffset = 0; },
      setEnd(node, offset) { this.endContainer = node; this.endOffset = offset; },
      setStart(node, offset) { this.startContainer = node; this.startOffset = offset; },
      toString() { return textNode.textContent.slice(0, this.endOffset); }
    });
    const liveRange = makeRange();
    const selection = {
      rangeCount: 1,
      anchorNode: textNode,
      getRangeAt: () => liveRange,
      removeAllRanges() { this.rangeCount = 0; },
      addRange(range) { this.rangeCount = 1; this.restoredRange = range; }
    };
    globalThis.document = {
      ...oldDocument,
      createRange: makeRange,
      createTreeWalker: () => ({ nextNode: (() => { let done = false; return () => done ? null : (done = true, textNode); })() }),
      querySelectorAll: oldDocument.querySelectorAll
    };
    globalThis.window = { getSelection: () => selection };

    const adapter = new WriterAdapter(env.editorDom);
    textNode.textContent = "Chapter 1 ABC";
    liveRange.startOffset = 13;
    liveRange.endOffset = 13;
    env.bodyEl.innerHTML = "<p>Chapter 1 ABC</p>";
    adapter.recordSnapshot("Typing");
    adapter.undo();
    const restored = selection.restoredRange;
    const passed = restored?.startContainer === textNode && restored.startOffset === 9
      && restored.endContainer === textNode && restored.endOffset === 9;
    results.push({
      name: "Writer Undo/Redo: Undo khôi phục caret tại text node và offset đã lưu",
      pass: passed
    });
    globalThis.document = oldDocument;
    globalThis.window = oldWindow;
  } catch (err) {
    results.push({ name: "Writer Undo/Redo: Lỗi Test 11 khôi phục caret", pass: false, error: err.message });
  }

  return results;
}
