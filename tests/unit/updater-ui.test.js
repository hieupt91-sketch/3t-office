import { connectUpdaterUi, renderUpdateNotification, restartWithSaveCheck } from "../../platform/updater/update-ui.js";
import { UPDATER_HELP_ENTRIES } from "../../platform/help/entries-updater.js";

export async function runUpdaterUiTests() {
  const results = [];
  const test = (name, pass, error = "") => results.push({ name, pass: Boolean(pass), error });

  const app = {
    appName: "writer",
    adapter: { isDirty: false },
    shell: {
      activeNotificationBar: null,
      showNotification(options) { this.lastOptions = options; this.activeNotificationBar = { options }; return this.activeNotificationBar; },
      clearNotification() { this.cleared = true; this.activeNotificationBar = null; }
    }
  };
  const state = {
    ready: true,
    current_version: "0.9.0",
    available_version: `0.9.${Math.floor(Math.random() * 900) + 100}`,
    release_notes: "Sửa lỗi và cải thiện tốc độ.",
    changed_files: 2,
    bytes_downloaded: 512
  };
  const request = { request_update_restart: async () => ({ started: true }) };
  const bar = renderUpdateNotification(app, state, request);
  const actions = app.shell.lastOptions?.actions || [];
  test(
    "Updater notification: có đủ Khởi động lại ngay, Để sau và Xem thay đổi",
    Boolean(bar) && actions.map((item) => item.label).join("|") === "Khởi động lại ngay|Để sau|Xem thay đổi",
    actions.map((item) => item.label).join(", ")
  );

  await actions[1]?.onClick();
  test("Updater notification: Để sau chỉ đóng thông báo", app.shell.cleared === true);

  const secondApp = { shell: { showNotification(options) { this.lastOptions = options; return options; } } };
  renderUpdateNotification(secondApp, state, request);
  test("Updater notification: bản cập nhật hiện ở shell của app thứ hai", secondApp.shell.lastOptions?.message?.includes(state.available_version));

  const originalDocument = globalThis.document;
  try {
    // The shared confirmation dialog returns its documented affirmative fallback without a DOM.
    globalThis.document = undefined;
    let restartCalls = 0;
    const dirtyApp = { adapter: { isDirty: true, async save() { throw new Error("save is coordinated per window"); } } };
    const dirtyApi = { async request_update_restart() { restartCalls++; return { started: true }; } };
    const restarted = await restartWithSaveCheck(dirtyApp, dirtyApi);
    test("Updater restart: giao việc lưu từng cửa sổ cho bộ điều phối", restarted && restartCalls === 1);

    const cancelled = await restartWithSaveCheck(dirtyApp, { async request_update_restart() { return { started: false, cancelled: true }; } });
    test("Updater restart: một cửa sổ hủy lưu thì không khởi động lại", !cancelled);
  } finally {
    globalThis.document = originalDocument;
  }

  test(
    "Updater Help: có hướng dẫn tiếng Việt cho Writer, Sheet và Slides",
    UPDATER_HELP_ENTRIES.length === 3 && ["writer", "sheet", "slides"].every((appName) => {
      const entry = UPDATER_HELP_ENTRIES.find((item) => item.app === appName);
      return entry && entry.ribbon.tab === "Trợ giúp" && entry.steps.length >= 5 && /Khởi động lại ngay/.test(entry.steps.join(" "));
    })
  );

  const originalWindow = globalThis.window;
  try {
    let healthCalls = 0;
    let startupChecks = 0;
    let healthResult = { healthy: true, pending: true };
    globalThis.window = {
      pywebview: { api: {
        async get_update_status() { return { current_version: "0.9.6", status: "up-to-date" }; },
        async confirm_update_health() { healthCalls++; return healthResult; },
        async start_update_checks() { startupChecks++; }
      } },
      addEventListener() {}
    };
    const connected = await connectUpdaterUi({ appName: "writer", shell: { showNotification() {} } });
    test("Updater health handshake: xác nhận sau khi cầu nối WebView sẵn sàng", connected && healthCalls === 1);
    test("Updater startup: khởi động kiểm tra trong nền khi kết nối UI hoàn tất", startupChecks === 1);
    const originalWarn = console.warn;
    let warnings = 0;
    console.warn = () => { warnings += 1; };
    healthResult = { healthy: false, pending: false };
    try {
      await connectUpdaterUi({ appName: "writer", shell: { showNotification() {} } });
    } finally {
      console.warn = originalWarn;
    }
    test("Updater health handshake: không cảnh báo khi không có cập nhật chờ xác nhận", warnings === 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
  return results;
}
