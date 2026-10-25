import assert from "node:assert/strict";
import { findDocumentBoundaryCaret } from "../../platform/text/caret-boundary.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { ShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

// Nút DOM giả tối thiểu (nodeType/nodeName/childNodes/parentNode/getAttribute) — đủ cho hàm dùng chung.
function text(data) {
  return { nodeType: 3, nodeName: "#text", data, childNodes: [], parentNode: null };
}
function el(tag, attrs = {}, children = []) {
  const node = {
    nodeType: 1, nodeName: tag.toUpperCase(), childNodes: [], parentNode: null,
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null),
  };
  for (const child of children) { child.parentNode = node; node.childNodes.push(child); }
  return node;
}
const nonEditable = { contenteditable: "false" };
const collapseButton = () => el("button", nonEditable, [el("svg")]);

/** Tài liệu như phiên soạn thử MAC-15: tiêu đề có nút thu gọn, đoạn cuối có chú thích, khung chú thích ở cuối thân. */
function documentWithFootnote() {
  const lastText = text("Đoạn có chú thích");
  const title = text("Tiêu đề tài liệu");
  const body = el("div", { contenteditable: "true" }, [
    el("h1", {}, [collapseButton(), title]),
    text("\n"),
    el("p", {}, [text("Đoạn một")]),
    el("p", {}, [lastText, el("sup", nonEditable, [text("1")])]),
    text("\n"),
    el("div", nonEditable, [
      el("div", {}, []),
      el("div", {}, [el("span", {}, [text("1")]), el("span", { contenteditable: "true" }, [text("Nội dung chú thích")])]),
    ]),
  ]);
  return { body, lastText, title };
}

/** Range/Selection giả ghi lại vị trí con trỏ cuối cùng. */
function installFakeSelection() {
  const state = { range: null };
  const previous = { window: globalThis.window, document: globalThis.document };
  const makeRange = () => {
    const range = {
      startContainer: null, startOffset: 0, endContainer: null, endOffset: 0,
      selectNodeContents(node) {
        range.startContainer = node; range.startOffset = 0;
        range.endContainer = node; range.endOffset = node.childNodes.length;
      },
      setStart(node, offset) { range.startContainer = node; range.startOffset = offset; },
      collapse(toStart) {
        if (toStart) { range.endContainer = range.startContainer; range.endOffset = range.startOffset; }
        else { range.startContainer = range.endContainer; range.startOffset = range.endOffset; }
      },
    };
    return range;
  };
  globalThis.document = { createRange: makeRange };
  globalThis.window = {
    getSelection: () => ({ removeAllRanges() { state.range = null; }, addRange(range) { state.range = range; } }),
  };
  return {
    state,
    restore() {
      if (previous.window === undefined) delete globalThis.window; else globalThis.window = previous.window;
      if (previous.document === undefined) delete globalThis.document; else globalThis.document = previous.document;
    },
  };
}

function runAdapterBoundary(body, toEnd) {
  const fake = installFakeSelection();
  try {
    const adapter = Object.create(WriterAdapter.prototype);
    adapter.bodyDom = body;
    body.focus = () => {};
    body.lastElementChild = body.childNodes.filter((n) => n.nodeType === 1).at(-1);
    body.firstElementChild = body.childNodes.find((n) => n.nodeType === 1);
    assert.equal(adapter.navigateDocumentBoundary(toEnd), true);
    const range = fake.state.range;
    assert.ok(range, "phải đặt một vùng chọn");
    assert.equal(range.startContainer, range.endContainer, "vùng chọn phải thu gọn");
    assert.equal(range.startOffset, range.endOffset, "vùng chọn phải thu gọn");
    return { node: range.startContainer, offset: range.startOffset };
  } finally {
    fake.restore();
  }
}

export async function runCaretBoundaryTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  test("D9: Writer Cmd+End/Ctrl+End khi cuối thân là khung chú thích → con trỏ ở cuối đoạn cuối, không về đầu tài liệu", () => {
    const { body, lastText } = documentWithFootnote();
    assert.ok(lastText.parentNode);
    const caret = runAdapterBoundary(body, true);
    assert.equal(caret.node, lastText.parentNode, "con trỏ phải nằm trong đoạn cuối (không ở biên thân tài liệu)");
    assert.equal(caret.offset, 2, "con trỏ đứng sau số tham chiếu chú thích, cuối đoạn");
  });

  test("D9: Writer Cmd+Home/Ctrl+Home bỏ qua nút thu gọn tiêu đề → con trỏ ở đầu chữ tiêu đề", () => {
    const { body, title } = documentWithFootnote();
    const caret = runAdapterBoundary(body, false);
    assert.equal(caret.node, title);
    assert.equal(caret.offset, 0);
  });

  test("Biên tài liệu: đoạn trống cuối (<p><br></p>) → con trỏ trước <br> trong đoạn đó", () => {
    const lastParagraph = el("p", {}, [el("br")]);
    const body = el("div", {}, [el("p", {}, [text("Đoạn")]), lastParagraph]);
    assert.deepEqual(findDocumentBoundaryCaret(body, true), { node: lastParagraph, offset: 0 });
  });

  test("Biên tài liệu: bảng cuối → cuối chữ ô cuối; danh sách cuối → cuối mục cuối; NBSP là chữ thật", () => {
    const cell = text("Ô cuối");
    const table = el("table", {}, [el("tbody", {}, [el("tr", {}, [el("td", {}, [text("a")]), el("td", {}, [cell])])])]);
    assert.deepEqual(findDocumentBoundaryCaret(el("div", {}, [el("p", {}, [text("x")]), table, text("\n  ")]), true), { node: cell, offset: 6 });
    const item = text("Mục cuối");
    assert.deepEqual(findDocumentBoundaryCaret(el("div", {}, [el("ul", {}, [el("li", {}, [text("Một")]), el("li", {}, [item])])]), true), { node: item, offset: 8 });
    const nbsp = text(" ");
    assert.deepEqual(findDocumentBoundaryCaret(el("div", {}, [el("p", {}, [nbsp])]), true), { node: nbsp, offset: 1 });
  });

  test("Biên tài liệu: ảnh cuối → con trỏ sau ảnh; thân rỗng → biên thân", () => {
    const img = el("img");
    const paragraph = el("p", {}, [text("Ảnh: "), img]);
    assert.deepEqual(findDocumentBoundaryCaret(el("div", {}, [paragraph]), true), { node: paragraph, offset: 2 });
    const empty = el("div", {}, [el("div", nonEditable, [text("không sửa được")])]);
    assert.deepEqual(findDocumentBoundaryCaret(empty, true), { node: empty, offset: 1 });
    assert.deepEqual(findDocumentBoundaryCaret(empty, false), { node: empty, offset: 0 });
  });

  test("D9 keymap: Cmd+End/Cmd+Home (= Fn+Cmd+→/←) chạy lệnh Writer cuối/đầu tài liệu và chặn mặc định; Cmd+↑/↓ để hệ thống xử lý", () => {
    const manager = new ShortcutManager({ platform: "macos" });
    manager.bind("Ctrl+Home", "writer.nav.docStart", "writer");
    manager.bind("Ctrl+End", "writer.nav.docEnd", "writer");
    manager.setActiveScope("writer");
    const executed = [];
    const originalExecute = globalCommandBus.execute;
    globalCommandBus.execute = (id) => { executed.push(id); return true; };
    try {
      const press = (key, code, mods) => {
        const event = { key, code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods, target: null, prevented: false,
          preventDefault() { event.prevented = true; }, stopPropagation() {} };
        manager._handleKeyDown(event);
        return event;
      };
      assert.equal(press("End", "End", { metaKey: true }).prevented, true);
      assert.equal(press("Home", "Home", { metaKey: true }).prevented, true);
      assert.deepEqual(executed, ["writer.nav.docEnd", "writer.nav.docStart"]);
      // Control+End trên Mac không phải phím chính → không chạy lệnh tài liệu.
      assert.equal(press("End", "End", { ctrlKey: true }).prevented, false);
      // Cmd+↑/↓ không có trong bảng KEYS-1: để hệ thống soạn thảo của macOS xử lý (không chặn).
      assert.equal(press("ArrowDown", "ArrowDown", { metaKey: true }).prevented, false);
      assert.equal(press("ArrowUp", "ArrowUp", { metaKey: true }).prevented, false);
      assert.deepEqual(executed, ["writer.nav.docEnd", "writer.nav.docStart"]);
    } finally {
      globalCommandBus.execute = originalExecute;
    }
  });

  return results;
}
