import assert from "node:assert/strict";
import { CommandBus } from "../../platform/commands/command-bus.js";
import { MacroManager } from "../../platform/commands/macro-manager.js";

function fakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}

function setupBus() {
  const bus = new CommandBus();
  const calls = [];
  const register = (id) => {
    bus.register({ id, category: "test", label: id });
    bus.bindHandler(id, (args) => { calls.push({ id, args }); return true; });
  };
  register("test.action.one");
  register("test.action.two");
  register("common.macro.recordToggle");
  register("common.macro.manager");
  return { bus, calls };
}

export async function runMacroManagerTests() {
  const results = [];
  const test = async (name, fn) => {
    const origWindow = global.window;
    const origLocalStorage = global.localStorage;
    try {
      // Trong trình duyệt thật, `localStorage` (biến toàn cục trần) và
      // `window.localStorage` LÀ CÙNG MỘT đối tượng — macro-manager.js kiểm
      // tra window.localStorage nhưng gọi localStorage trần (giống hệt
      // pattern RecentFilesManager có sẵn), nên mock Node phải gán CẢ HAI.
      const ls = fakeLocalStorage();
      global.window = { localStorage: ls };
      global.localStorage = ls;
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    } finally {
      global.window = origWindow;
      global.localStorage = origLocalStorage;
    }
  };

  await test("Ghi macro: chỉ ghi lệnh thật, KHÔNG tự ghi lệnh common.macro.* điều khiển", async () => {
    const { bus, calls } = setupBus();
    const mgr = new MacroManager(bus);
    mgr.startRecording("writer");
    await bus.execute("test.action.one", { x: 1 });
    await bus.execute("test.action.two", { y: 2 });
    const { app, steps } = mgr.stopRecording();
    assert.equal(app, "writer");
    assert.equal(steps.length, 2, "Không được lẫn lệnh common.macro.* vào chính macro đang ghi");
    assert.deepEqual(steps[0], { commandId: "test.action.one", args: { x: 1 } });
    assert.deepEqual(steps[1], { commandId: "test.action.two", args: { y: 2 } });
    assert.equal(calls.length, 2, "Cả 2 lệnh vẫn thực thi thật bình thường trong lúc ghi");
  });

  await test("Không ghi khi chưa startRecording", async () => {
    const { bus } = setupBus();
    await bus.execute("test.action.one");
    assert.equal(bus.isRecordingMacro(), false);
  });

  await test("saveMacro/getMacros: lưu và đọc lại đúng, cô lập theo app", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    const saved = mgr.saveMacro("writer", "Macro A", [{ commandId: "test.action.one", args: null }]);
    assert.ok(saved.id);
    assert.equal(saved.name, "Macro A");
    mgr.saveMacro("sheet", "Macro B", [{ commandId: "test.action.two", args: null }]);

    const writerMacros = mgr.getMacros("writer");
    const sheetMacros = mgr.getMacros("sheet");
    assert.equal(writerMacros.length, 1, "Macro Sheet không được lẫn vào danh sách Writer");
    assert.equal(writerMacros[0].name, "Macro A");
    assert.equal(sheetMacros.length, 1);
    assert.equal(sheetMacros[0].name, "Macro B");
  });

  await test("saveMacro: không lưu macro rỗng (0 bước)", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    const saved = mgr.saveMacro("writer", "Rỗng", []);
    assert.equal(saved, null);
    assert.equal(mgr.getMacros("writer").length, 0);
  });

  await test("renameMacro và deleteMacro hoạt động đúng", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    const macro = mgr.saveMacro("writer", "Tên cũ", [{ commandId: "test.action.one", args: null }]);
    assert.equal(mgr.renameMacro(macro.id, "Tên mới"), true);
    assert.equal(mgr.getMacroById(macro.id).name, "Tên mới");
    assert.equal(mgr.deleteMacro(macro.id), true);
    assert.equal(mgr.getMacroById(macro.id), null);
    assert.equal(mgr.deleteMacro("khong-ton-tai"), false);
  });

  await test("runMacro: phát lại đúng thứ tự, đúng tham số qua Command Bus thật", async () => {
    const { bus, calls } = setupBus();
    const mgr = new MacroManager(bus);
    const macro = mgr.saveMacro("writer", "Chạy thử", [
      { commandId: "test.action.one", args: { v: "a" } },
      { commandId: "test.action.two", args: { v: "b" } },
      { commandId: "test.action.one", args: { v: "c" } }
    ]);
    const result = await mgr.runMacro(macro.id);
    assert.deepEqual(result, { executed: 3, total: 3 });
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map(c => c.id), ["test.action.one", "test.action.two", "test.action.one"]);
    assert.deepEqual(calls.map(c => c.args.v), ["a", "b", "c"]);
  });

  await test("runMacro: ném lỗi rõ ràng nếu macro không tồn tại", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    await assert.rejects(() => mgr.runMacro("khong-ton-tai"), /Không tìm thấy macro/);
  });

  await test("startRecording: không cho ghi chồng 2 macro cùng lúc", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    mgr.startRecording("writer");
    assert.throws(() => mgr.startRecording("sheet"), /Đang ghi/);
    mgr.cancelRecording();
  });

  await test("cancelRecording: hủy ghi không lưu gì, không còn ở trạng thái ghi", async () => {
    const { bus } = setupBus();
    const mgr = new MacroManager(bus);
    mgr.startRecording("writer");
    await bus.execute("test.action.one");
    mgr.cancelRecording();
    assert.equal(mgr.isRecording(), false);
    assert.equal(mgr.getMacros("writer").length, 0);
  });

  return results;
}
