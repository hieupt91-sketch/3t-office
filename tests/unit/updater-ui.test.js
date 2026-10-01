import { renderUpdateNotification, restartWithSaveCheck } from "../../platform/updater/update-ui.js";
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
  return results;
}
