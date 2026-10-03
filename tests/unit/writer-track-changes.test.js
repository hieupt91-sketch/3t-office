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
    this.tagName = kind === "insert" ? "INS" : "DEL";
    this.dataset = { vnoChange: kind };
    this.className = "";
    this.scrolled = false;
    this.classList = {
      add: (name) => { this.className = `${this.className} ${name}`.trim(); },
      remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); }
    };
  }
  getAttribute(name) { return name === "data-vno-change" ? this.kind : null; }
  scrollIntoView() { this.scrolled = true; }
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
    const live = this.changes.filter((node) => !node.removed && !node.unwrapped);
    return selector.includes("data-vno-change") && live.length ? live[0] : null;
  }
  querySelectorAll(selector) {
    const live = this.changes.filter((node) => !node.removed && !node.unwrapped);
    if (selector.startsWith("ins") && selector.includes("del")) return live;
    const kind = selector.startsWith("ins") ? "insert" : "delete";
    return live.filter((node) => node.kind === kind);
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

  await test("Writer Track Changes: DOCX Save retains review ranges; PDF uses accepted view", async () => {
    const body = new FakeBody('<p>Gốc <ins class="x" data-vno-change="insert">mới</ins><del contenteditable="false" data-vno-change="delete">cũ</del></p>');
    const adapter = makeAdapter(body);
    const docxContent = adapter._contentForExport();
    const acceptedView = adapter._contentForExport({ acceptedView: true });
    if (!acceptedView.includes("Gốc mới") || acceptedView.includes("cũ") || /<\/?(?:ins|del)\b/i.test(acceptedView) || acceptedView.includes("data-vno-change")) {
      throw new Error(`Accepted view không sạch: ${acceptedView}`);
    }
    if (!docxContent.includes("cũ") || !docxContent.includes("vno-review-meta-hex:") || /<\/?(?:ins|del)\b/i.test(docxContent) || docxContent.includes("data-vno-change")) {
      throw new Error(`DOCX export must retain revision ranges through bookmark metadata: ${docxContent}`);
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
    if (!saved.includes("cũ") || !saved.includes("vno-review-meta-hex:") || /<\/?(?:ins|del)\b/i.test(saved)) {
      throw new Error("DOCX Save did not retain the tracked deletion and review metadata");
    }
    if (pdf.includes("cũ") || /<\/?(?:ins|del)\b/i.test(pdf) || pdf.includes("data-vno-change")) {
      throw new Error("PDF export included deleted content or review markup");
    }
  });

  await test("Writer Track Changes: Previous/Next nhảy và highlight tuần tự, rồi quay vòng", async () => {
    const body = new FakeBody();
    const first = new FakeChangeNode("insert", "một");
    const second = new FakeChangeNode("insert", "hai");
    const third = new FakeChangeNode("insert", "ba");
    body.changes.push(first, second, third);
    const adapter = makeAdapter(body);
    if (!adapter.nextTrackChange() || first.className.indexOf("is-vno-change-active") < 0) {
      throw new Error("Next đầu tiên không chọn thay đổi 1");
    }
    if (!adapter.nextTrackChange() || second.className.indexOf("is-vno-change-active") < 0) {
      throw new Error("Next thứ hai không chọn thay đổi 2");
    }
    adapter.nextTrackChange();
    adapter.nextTrackChange();
    if (first.className.indexOf("is-vno-change-active") < 0) throw new Error("Next không quay vòng về thay đổi đầu");
    adapter.previousTrackChange();
    if (third.className.indexOf("is-vno-change-active") < 0) throw new Error("Previous không nhảy về thay đổi cuối");
  });

  await test("Writer Track Changes: Accept One / Reject One chỉ xử lý thay đổi đang chọn", async () => {
    const acceptBody = new FakeBody();
    const keepInsert = new FakeChangeNode("insert", "giữ");
    const acceptInsert = new FakeChangeNode("insert", "nhận");
    acceptBody.changes.push(keepInsert, acceptInsert);
    const acceptAdapter = makeAdapter(acceptBody);
    acceptAdapter._selectTrackChange(acceptInsert);
    acceptAdapter.acceptOneTrackChange();
    if (!acceptInsert.unwrapped) throw new Error("Accept One không giữ insertion đang chọn");
    if (keepInsert.unwrapped || keepInsert.removed) throw new Error("Accept One đụng thay đổi khác");

    const rejectBody = new FakeBody();
    const keepDelete = new FakeChangeNode("delete", "cũ");
    const rejectInsert = new FakeChangeNode("insert", "bỏ");
    rejectBody.changes.push(keepDelete, rejectInsert);
    const rejectAdapter = makeAdapter(rejectBody);
    rejectAdapter._selectTrackChange(rejectInsert);
    rejectAdapter.rejectOneTrackChange();
    if (!rejectInsert.removed) throw new Error("Reject One không bỏ insertion đang chọn");
    if (keepDelete.removed || keepDelete.unwrapped) throw new Error("Reject One đụng thay đổi khác");
  });

  await test("Writer Track Changes: lệnh nav/acceptOne/rejectOne có định nghĩa và ribbon", async () => {
    const { WRITER_COMMANDS } = await import("../../platform/commands/command-definitions.js");
    const { WRITER_RIBBON_TABS } = await import("../../apps/writer/writer-ribbon.js");
    const ids = [
      "writer.trackChanges.previous",
      "writer.trackChanges.next",
      "writer.trackChanges.acceptOne",
      "writer.trackChanges.rejectOne"
    ];
    for (const id of ids) {
      if (!WRITER_COMMANDS.find((cmd) => cmd.id === id)) throw new Error(`Thiếu ${id}`);
    }
    const flatten = (items = []) => items.flatMap((item) => (item.items ? flatten(item.items) : [item]));
    const review = WRITER_RIBBON_TABS.find((tab) => tab.id === "review");
    const tracking = review?.groups?.find((group) => group.labelKey === "writerRibbon.group.tracking");
    const ribbonIds = flatten(tracking?.items || []).map((item) => item.commandId);
    for (const id of ids) {
      if (!ribbonIds.includes(id)) throw new Error(`Ribbon thiếu ${id}: ${ribbonIds.join(", ")}`);
    }
  });

  return results;
}
