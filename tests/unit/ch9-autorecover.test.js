import { AutoRecoverManager } from "../../platform/autorecover/auto-recover.js";
import { AUTORECOVER_HELP_ENTRIES } from "../../platform/help/entries-autorecover.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runCh9AutoRecoverTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error?.message || String(error) }); }
  };

  await test("CH-9.2: AutoRecover mặc định bật và chạy mỗi 2 phút", async () => {
    const intervals = [];
    const timers = {
      setInterval(callback, delay) { intervals.push({ callback, delay }); return intervals.length; },
      clearInterval() {}, setTimeout() { return 1; }, clearTimeout() {}
    };
    const bridge = {
      desktopApi: {},
      async getAutoRecoverSettings() { return {}; },
      async listAutoRecoverSnapshots() { return []; }
    };
    const manager = new AutoRecoverManager({ bridge, timers, documentRef: null, idleScheduler: () => () => {} });
    await manager.register({
      appKind: "writer", adapter: { isDirty: false }, shell: {},
      serialize: () => "<html/>", restore: () => true
    });
    check(manager.settings.enabled === true, "AutoRecover phải bật mặc định.");
    check(manager.settings.interval_minutes === 2, `Khoảng mặc định sai: ${manager.settings.interval_minutes}`);
    check(intervals[0]?.delay === 120000, `Timer phải là 120000 ms, nhận ${intervals[0]?.delay}`);
  });

  await test("CH-9.2: hộp thoại dùng đúng tên và hành động Khôi phục/Bỏ", () => {
    check(viStrings.autoRecover.dialogTitle === "Khôi phục tài liệu chưa lưu", "Sai tiêu đề hộp thoại khôi phục.");
    check(viStrings.autoRecover.recover === "Khôi phục", "Thiếu nút Khôi phục.");
    check(viStrings.autoRecover.discard === "Bỏ", "Thiếu nút Bỏ.");
  });

  await test("CH-9.2: Help có hướng dẫn 2 phút cụ thể cho Doc/Sheet/Slide", () => {
    const names = { writer: "Doc", sheet: "Sheet", slides: "Slide" };
    for (const [app, name] of Object.entries(names)) {
      const entry = AUTORECOVER_HELP_ENTRIES.find(item => item.app === app);
      check(entry?.title.includes(name), `Thiếu Help AutoRecover cho ${name}.`);
      check(entry.steps.some(step => step.includes("2 phút")), `Help ${name} chưa ghi mặc định 2 phút.`);
      check(entry.steps.some(step => step.includes("Khôi phục tài liệu chưa lưu")), `Help ${name} chưa chỉ đúng hộp thoại.`);
    }
  });

  return results;
}
