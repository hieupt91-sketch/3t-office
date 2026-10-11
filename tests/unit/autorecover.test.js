import { AutoRecoverManager } from "../../platform/autorecover/auto-recover.js";
import { handleRecoveryDialogKeydown } from "../../platform/autorecover/recovery-dialog.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeTimers {
  constructor() { this.nextId = 1; this.intervals = new Map(); this.cleared = []; }
  setInterval(callback, delay) {
    const id = this.nextId++;
    this.intervals.set(id, { callback, delay });
    return id;
  }
  clearInterval(id) { this.cleared.push(id); this.intervals.delete(id); }
  setTimeout(callback, delay) { return this.setInterval(callback, delay); }
  clearTimeout(id) { this.clearInterval(id); }
}

function createBridge() {
  const persisted = new Map();
  const deletedDocs = [];
  const deletedSnapshots = [];
  const attempts = [];
  let settings = { enabled: true, interval_minutes: 2 };
  let readResult = null;
  return {
    persisted, deletedDocs, deletedSnapshots, attempts,
    async getAutoRecoverSettings() { return settings; },
    async setAutoRecoverSettings(value) { settings = { ...value }; return settings; },
    async listAutoRecoverSnapshots() { return []; },
    async writeAutoRecoverSnapshot(value) {
      attempts.push(value);
      const previous = persisted.get(value.docId);
      if (previous === value.content) return { status: "ok", written: false, snapshot_id: `session/${value.docId}` };
      persisted.set(value.docId, value.content);
      return { status: "ok", written: true, snapshot_id: `session/${value.docId}` };
    },
    async deleteAutoRecoverDocument(docId) { deletedDocs.push(docId); persisted.delete(docId); return true; },
    async deleteAutoRecoverSnapshot(id) { deletedSnapshots.push(id); return true; },
    async readAutoRecoverSnapshot() { return readResult; },
    setReadResult(value) { readResult = value; }
  };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runAutoRecoverTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Dirty tracking: Sheet history edits and Slides document changes notify the shared adapter state", () => {
    let sheetChanges = 0;
    const container = {
      setAttribute() {}, style: {}, addEventListener() {}, querySelector() { return null; },
      querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} }
    };
    const grid = new SheetGridController(container, { onDocumentChange: () => { sheetChanges++; } });
    grid.setCellValue("A", 1, "changed");
    assert(sheetChanges === 1, "Sheet cell edit must mark the workbook dirty.");
    grid.undo();
    assert(sheetChanges === 2, "Sheet undo must mark the workbook dirty after reverting.");

    let slidesDirty = false;
    const slides = new SlidesCanvasController(null, { onDocumentChange: () => { slidesDirty = true; } });
    slides._syncUndoRedoState();
    assert(slidesDirty, "Slides document changes must reach the shared dirty flag.");
  });

  await test("AutoRecover: dirty flag gates serialization and default timer is two minutes", async () => {
    const timers = new FakeTimers();
    const idleQueue = [];
    const bridge = createBridge();
    const manager = new AutoRecoverManager({ bridge, timers, idleScheduler: (callback) => { idleQueue.push(callback); return () => {}; }, documentRef: null });
    const adapter = { isDirty: false, async save() { return true; } };
    let content = "<html>first</html>";
    let serializeCount = 0;
    await manager.register({ appKind: "writer", adapter, shell: { documentName: "Draft.docx" }, serialize: () => { serializeCount++; return content; }, restore: () => true });

    const timer = [...timers.intervals.values()][0];
    assert(timer?.delay === 120000, "Mặc định phải chạy mỗi 2 phút.");
    assert(manager.tick() === false && serializeCount === 0, "Tài liệu sạch không được tuần tự hóa.");
    adapter.isDirty = true;
    assert(manager.tick() === true && serializeCount === 0, "Tài liệu bẩn phải chờ lượt xử lý rảnh.");
    idleQueue.shift()();
    await settle();
    assert(serializeCount === 1 && bridge.persisted.size === 1, "Bản đầu phải được ghi sau lượt idle.");
    assert(bridge.attempts[0].format === "html", "Writer phải dùng định dạng HTML hiện có.");

    manager.tick();
    idleQueue.shift()();
    await settle();
    assert(bridge.attempts.length === 2 && bridge.persisted.size === 1, "Nội dung giống bản gần nhất không được ghi lại.");
    content = "<html>second</html>";
    manager.tick();
    idleQueue.shift()();
    await settle();
    assert(bridge.persisted.get(manager.context.docId) === content, "Thay đổi mới phải cập nhật bản khôi phục.");
  });

  await test("AutoRecover: settings stop/restart timer and clamp interval", async () => {
    const timers = new FakeTimers();
    const bridge = createBridge();
    const manager = new AutoRecoverManager({ bridge, timers, idleScheduler: () => () => {}, documentRef: null });
    await manager.register({ appKind: "sheet", adapter: { isDirty: false }, shell: {}, serialize: () => "<fods/>", restore: () => true });
    await manager.setSettings({ enabled: false, interval_minutes: 12 });
    assert(timers.intervals.size === 0, "Tắt phải dừng timer.");
    await manager.setSettings({ enabled: true, interval_minutes: 999 });
    const timer = [...timers.intervals.values()][0];
    assert(timer?.delay === 3600000, "Khoảng thời gian phải được giới hạn tối đa 60 phút.");
  });

  await test("Recovery dialog: Tab/Shift+Tab giữ tiêu điểm và Escape đóng hộp thoại", () => {
    let prevented = 0;
    const first = { focus() { this.focused = true; } };
    const last = { focus() { this.focused = true; } };
    const shiftTab = { key: "Tab", shiftKey: true, target: first, preventDefault() { prevented++; } };
    assert(handleRecoveryDialogKeydown(shiftTab, [first, last]) === "focus", "Shift+Tab phải giữ trong hộp thoại.");
    assert(last.focused && prevented === 1, "Shift+Tab ở nút đầu phải chuyển tới nút cuối.");
    const tab = { key: "Tab", shiftKey: false, target: last, preventDefault() { prevented++; } };
    handleRecoveryDialogKeydown(tab, [first, last]);
    assert(first.focused && prevented === 2, "Tab ở nút cuối phải quay về nút đầu.");
    let escapePrevented = false;
    const escape = { key: "Escape", preventDefault() { escapePrevented = true; } };
    assert(handleRecoveryDialogKeydown(escape, [first, last]) === "close" && escapePrevented, "Escape phải yêu cầu đóng hộp thoại.");
  });

  await test("Recovery dialog: corrupt snapshot shows an error and keeps the listed file", async () => {
    const bridge = createBridge();
    const manager = new AutoRecoverManager({ bridge, timers: new FakeTimers(), idleScheduler: () => () => {}, documentRef: null });
    const adapter = { isDirty: false };
    await manager.register({ appKind: "slides", adapter, shell: {}, serialize: () => "", restore: () => true });
    manager.leftovers = [{ snapshot_id: "old/doc", app_kind: "slides", title: "Broken.pptx" }];
    bridge.setReadResult({ status: "error", message: "Bản khôi phục bị hỏng. Tệp vẫn được giữ nguyên." });

    const result = await manager.recoverSnapshot("old/doc");
    assert(!result.ok && result.error.includes("vẫn được giữ"), "Lỗi phải giải thích rõ tệp vẫn còn.");
    assert(manager.leftovers.length === 1 && bridge.deletedSnapshots.length === 0, "Không được xóa tệp bị lỗi khi mở thất bại.");
  });

  await test("Recovery copy is dirty, unsaved, and saved through Save As before old snapshot removal", async () => {
    const bridge = createBridge();
    const manager = new AutoRecoverManager({ bridge, timers: new FakeTimers(), idleScheduler: () => () => {}, documentRef: null });
    let savedWithSourcePath = "unset";
    const adapter = {
      isDirty: false,
      _sourcePath: "C:\\Original\\draft.docx",
      async saveAs() { savedWithSourcePath = this._sourcePath; this.isDirty = false; return true; }
    };
    await manager.register({ appKind: "writer", adapter, shell: { documentName: "draft.docx" }, serialize: () => "<html/>", restore: (content, manifest) => {
      adapter._sourcePath = null;
      adapter.isDirty = true;
      adapter.recoveredTitle = `${manifest.title} (đã khôi phục)`;
      return true;
    } });
    manager.leftovers = [{ snapshot_id: "old-session/old-doc", app_kind: "writer", title: "draft.docx" }];
    bridge.setReadResult({ status: "ok", content: "<html/>", manifest: { title: "draft.docx" } });

    const opened = await manager.recoverSnapshot("old-session/old-doc");
    assert(opened.ok && adapter.isDirty && adapter._sourcePath === null, "Bản phục hồi phải là tài liệu bẩn không có đường dẫn gốc.");
    assert(adapter.recoveredTitle.includes("đã khôi phục"), "Tên bản phục hồi phải có nhãn.");
    await adapter.saveAs();
    assert(savedWithSourcePath === null, "Lưu bản phục hồi phải đi qua Save As.");
    assert(bridge.deletedSnapshots.includes("old-session/old-doc"), "Lưu thành công phải xóa bản cũ.");
  });

  return results;
}
