import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

class FakeChangeNode {
  constructor(kind, text) {
    this.kind = kind;
    this.textContent = text;
    this.childNodes = [{ textContent: text }];
    this.removed = false;
    this.unwrapped = false;
  }
  remove() { this.removed = true; }
  replaceWith() { this.unwrapped = true; }
}

class FakeBody {
  constructor(html = "") {
    this.innerHTML = html;
    this.listeners = {};
    this.changes = [];
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  contains() { return true; }
  dispatchEvent() { return true; }
  querySelector(selector) {
    return selector === "[data-vno-change]" && this.changes.some((node) => !node.removed) ? this.changes[0] : null;
  }
  querySelectorAll(selector) {
    const kind = selector.startsWith("ins") ? "insert" : "delete";
    return this.changes.filter((node) => node.kind === kind && !node.removed);
  }
}

function makeAdapter(body) {
  const page = {
    style: {}, innerHTML: "", focus() {},
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  };
  return new WriterAdapter(page);
}

export async function runWriterTrackChangesTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Writer Track Changes: ba command có mapping UNO và toggle không register lại", async () => {
    const expected = {
      "writer.trackChanges.toggle": ".uno:TrackChanges",
      "writer.trackChanges.acceptAll": ".uno:AcceptAllTrackedChanges",
      "writer.trackChanges.rejectAll": ".uno:RejectAllTrackedChanges"
    };
    for (const [command, uno] of Object.entries(expected)) {
      if (mapVnCommandToUno(command) !== uno) throw new Error(`${command} thiếu mapping`);
      if (!globalCommandBus.getDefinition(command)) throw new Error(`${command} chưa được khai báo chuẩn`);
    }
  });

  await test("Writer Track Changes: beforeinput bật thì gõ và xóa đi qua marker, tắt thì để mặc định", async () => {
    const body = new FakeBody();
    const adapter = makeAdapter(body);
    adapter.attach();
    const range = { collapsed: true, commonAncestorContainer: body };
    const selection = { rangeCount: 1, getRangeAt: () => range };
    const originalWindow = globalThis.window;
    globalThis.window = { getSelection: () => selection };
    let inserted = "";
    let deleted = 0;
    adapter._insertTrackedText = (_range, text) => { inserted = text; };
    adapter._adjacentCharacterRange = () => ({ collapsed: false, commonAncestorContainer: body });
    adapter._markRangeDeleted = () => { deleted++; };
    try {
      const offEvent = { inputType: "insertText", data: "A", preventDefault() { throw new Error("Đang tắt nhưng chặn input"); } };
      if (body.listeners.beforeinput(offEvent) !== false) throw new Error("Trạng thái mặc định không tắt");
      adapter.toggleTrackChanges(true);
      let prevented = false;
      body.listeners.beforeinput({ inputType: "insertText", data: "ă", preventDefault() { prevented = true; } });
      if (!prevented || inserted !== "ă") throw new Error("Ký tự gõ không được tạo insertion marker");
      body.listeners.beforeinput({ inputType: "deleteContentBackward", data: null, preventDefault() {} });
      if (deleted !== 1) throw new Error("Backspace không được tạo deletion marker");
    } finally {
      globalThis.window = originalWindow;
    }
  });

  await test("Writer Track Changes: Accept All và Reject All áp dụng đúng toàn tài liệu", async () => {
    const acceptBody = new FakeBody();
    const acceptIns = new FakeChangeNode("insert", "mới");
    const acceptDel = new FakeChangeNode("delete", "cũ");
    acceptBody.changes.push(acceptIns, acceptDel);
    const acceptAdapter = makeAdapter(acceptBody);
    acceptAdapter.acceptAllTrackChanges();
    if (!acceptIns.unwrapped || !acceptDel.removed) throw new Error("Accept All không giữ insert/bỏ delete");

    const rejectBody = new FakeBody();
    const rejectIns = new FakeChangeNode("insert", "mới");
    const rejectDel = new FakeChangeNode("delete", "cũ");
    rejectBody.changes.push(rejectIns, rejectDel);
    const rejectAdapter = makeAdapter(rejectBody);
    rejectAdapter.rejectAllTrackChanges();
    if (!rejectIns.removed || !rejectDel.unwrapped) throw new Error("Reject All không bỏ insert/khôi phục delete");
  });

  await test("Writer Track Changes: state cô lập giữa hai tài liệu, không cross-leak", async () => {
    const first = makeAdapter(new FakeBody());
    const second = makeAdapter(new FakeBody());
    first.toggleTrackChanges(true);
    if (!first.trackChangesEnabled || second.trackChangesEnabled) throw new Error("Toggle rò rỉ qua WriterAdapter khác");
    second.toggleTrackChanges(true);
    first.toggleTrackChanges(false);
    if (!second.trackChangesEnabled) throw new Error("Tắt tài liệu đầu làm thay đổi tài liệu thứ hai");
  });

  await test("Writer Track Changes: save/PDF dùng accepted view sạch, không lẫn màu hay marker", async () => {
    const body = new FakeBody('<p>Gốc <ins class="x" data-vno-change="insert">mới</ins><del contenteditable="false" data-vno-change="delete">cũ</del></p>');
    const adapter = makeAdapter(body);
    const clean = adapter._contentForExport();
    if (!clean.includes("Gốc mới") || clean.includes("cũ") || /<\/?(?:ins|del)\b/i.test(clean) || clean.includes("data-vno-change")) {
      throw new Error(`Accepted view không sạch: ${clean}`);
    }
    const originalSave = globalUnoBridge.saveRealFile;
    const originalPdf = globalUnoBridge.exportRealPdf;
    let saved = "";
    let pdf = "";
    globalUnoBridge.saveRealFile = async (_kind, content) => { saved = content; return { status: "cancelled" }; };
    globalUnoBridge.exportRealPdf = async (_kind, content) => { pdf = content; return { status: "cancelled" }; };
    try {
      await adapter.save();
      await adapter.exportPdf();
    } finally {
      globalUnoBridge.saveRealFile = originalSave;
      globalUnoBridge.exportRealPdf = originalPdf;
    }
    if (saved !== clean || pdf !== clean) throw new Error("Save/PDF không dùng chung accepted view sạch");
  });

  return results;
}
