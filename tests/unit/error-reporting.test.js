import { createFrontendErrorReporter } from "../../platform/error_reporting/frontend-reporter.js";
import { ErrorReportingUI, handleDialogKeydown } from "../../platform/error_reporting/error-reporting-ui.js";
import { getHelpEntriesForApp } from "../../platform/help/help-catalog.js";
import "../../platform/help/entries-sheet.js";
import "../../platform/help/entries-slides.js";

export async function runErrorReportingTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error?.message || String(error) }); }
  };

  await test("Error hooks capture window errors and unhandled rejections through the Python bridge", () => {
    const listeners = new Map();
    const target = {
      onerror: null,
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type) { listeners.delete(type); }
    };
    const sent = [];
    let now = 1000;
    const hooks = createFrontendErrorReporter({
      target,
      getApi: () => ({ report_frontend_error: (payload) => sent.push(payload) }),
      now: () => now
    });
    if (!hooks.install()) throw new Error("hook installation failed");
    target.onerror("fallback", "C:/private/file.js", 12, 4, new Error("Cannot read property"));
    listeners.get("unhandledrejection")({ reason: new Error("Promise failed") });
    if (sent.length !== 2) throw new Error(`expected two reports, got ${sent.length}`);
    if (sent[0].type !== "Error" || !sent[0].stack.includes("Error: Cannot read property")) throw new Error("window error fields were not forwarded");
    if (sent[1].operation !== "frontend") throw new Error("frontend operation was not normalized");
    hooks.uninstall();
    if (listeners.has("unhandledrejection") || target.onerror !== null) throw new Error("hooks were not removed cleanly");
    now += 1;
  });

  await test("Error hooks deduplicate repeats, rate-limit bursts and swallow bridge failures", () => {
    const target = { addEventListener() {}, removeEventListener() {} };
    let calls = 0;
    const hooks = createFrontendErrorReporter({
      target, getApi: () => ({ report_frontend_error() { calls += 1; throw new Error("offline"); } }),
      now: () => 5000, maxPerWindow: 2
    });
    if (!hooks.report({ type: "TypeError", message: "same", stack: "at a" })) throw new Error("first event should pass");
    if (hooks.report({ type: "TypeError", message: "same", stack: "at a" })) throw new Error("duplicate should be ignored");
    if (!hooks.report({ type: "TypeError", message: "different", stack: "at b" })) throw new Error("second unique event should pass");
    if (hooks.report({ type: "TypeError", message: "third", stack: "at c" })) throw new Error("rate limit should reject third event");
    if (calls !== 2) throw new Error(`bridge should be invoked twice, got ${calls}`);
  });

  await test("Consent dialog explains data, focuses local-only choice, and stores Esc-safe decisions", async () => {
    let dialogOptions;
    const consents = [];
    const ui = new ErrorReportingUI({
      api: () => ({ set_error_reporting_consent: async (value) => { consents.push(value); return { enabled: true, consent: value ? "granted" : "denied" }; } }),
      hooks: { install() {}, uninstall() {} },
      dialogFactory: (options) => { dialogOptions = options; return { opened: true }; }
    });
    ui.state = { endpoint_configured: false, enabled: true };
    ui.showConsentDialog();
    if (!dialogOptions.body.includes("Không bao giờ được gửi tự động")) throw new Error("privacy exclusions are missing");
    const copy = dialogOptions.body.toLocaleLowerCase("vi");
    if (!copy.includes("nội dung tài liệu") || !copy.includes("tên người dùng windows")) throw new Error("sensitive field list is incomplete");
    if (dialogOptions.focusSelector !== "[data-dialog-action='deny']") throw new Error("decline should receive initial focus");
    if (!dialogOptions.body.includes("chưa có địa chỉ máy chủ")) throw new Error("offline state is unclear");
    let closed = null;
    await dialogOptions.onSubmit("deny", {}, (value) => { closed = value; });
    if (consents[0] !== false || closed !== "deny") throw new Error("decline did not persist");
  });

  await test("First launch asks once when consent is unknown and each app has Vietnamese Help steps", async () => {
    let dialogCount = 0;
    let reads = 0;
    const ui = new ErrorReportingUI({
      api: () => ({ get_error_reporting_state: async () => { reads += 1; return { enabled: true, consent: "unknown", endpoint_configured: false }; } }),
      hooks: { install() {}, uninstall() {} },
      dialogFactory: () => { dialogCount += 1; return {}; }
    });
    await ui.initialize();
    await ui.initialize();
    if (dialogCount !== 1 || reads !== 2) throw new Error(`expected one first-launch dialog, got ${dialogCount}`);
    for (const app of ["writer", "sheet", "slides"]) {
      const entry = getHelpEntriesForApp(app).find((item) => item.id === `${app}.help.errorReporting`);
      if (!entry || entry.steps.length < 3 || !entry.summary.includes(app === "writer" ? "3T Doc" : app === "sheet" ? "3T Sheet" : "3T Slide")) {
        throw new Error(`missing specific Vietnamese Help for ${app}`);
      }
    }
  });

  await test("Desktop startup keeps the editor usable before consent is selected in Help", async () => {
    let dialogCount = 0;
    let savedConsent = null;
    const ui = new ErrorReportingUI({
      api: () => ({
        get_error_reporting_state: async () => ({ enabled: true, consent: "unknown", endpoint_configured: false }),
        set_error_reporting_consent: async (value) => { savedConsent = value; return { enabled: true, consent: value ? "granted" : "denied" }; }
      }),
      hooks: { install() {}, uninstall() {} },
      dialogFactory: () => { dialogCount += 1; return {}; }
    });
    await ui.initialize({ deferConsentPrompt: true });
    if (dialogCount !== 0) throw new Error("startup consent modal blocked the editor");
    if (ui.state?.consent !== "unknown" || savedConsent !== null) throw new Error("startup changed the user's consent choice");
  });

  await test("Feedback dialog leaves attachment unchecked, warns clearly, and submits explicit choices", async () => {
    let options;
    const calls = [];
    const previousDocument = globalThis.document;
    globalThis.document = { querySelector: () => ({ getAttribute: () => "writer" }) };
    const ui = new ErrorReportingUI({
      api: () => ({ submit_user_feedback: async (...args) => { calls.push(args); return { queued: true, status: "saved_local" }; } }),
      hooks: { install() {}, uninstall() {} },
      dialogFactory: (value) => { options = value; return { opened: true }; }
    });
    ui.state = { consent: "denied" };
    ui.showFeedbackDialog();
    if (!options.body.includes("toàn bộ nội dung tệp hiện đang mở sẽ được gửi riêng")) throw new Error("attachment warning is missing");
    if (options.body.includes('id="vno-report-attach" type="checkbox" checked')) throw new Error("attachment must be unchecked by default");
    const elements = {
      "#vno-report-description": { value: "Lỗi lưu tệp", focus() {} },
      "#vno-report-attach": { checked: true },
      ".vno-report-dialog-status": { textContent: "" },
      "[data-dialog-action='submit']": { disabled: false }
    };
    let closed = null;
    try {
      await options.onSubmit("submit", { querySelector: (selector) => elements[selector] }, (value) => { closed = value; });
      if (calls.length !== 1 || calls[0][0] !== "Lỗi lưu tệp" || calls[0][1] !== true || calls[0][2] !== "writer") throw new Error("explicit feedback choices were not passed to Python");
      if (elements[".vno-report-dialog-status"].textContent !== "Đã lưu cục bộ. Bật gửi tự động trong tab Trợ giúp để gửi khi có máy chủ.") throw new Error("offline status was not shown");
      if (closed !== null) throw new Error("feedback should remain visible long enough to read status");
    } finally { globalThis.document = previousDocument; }
  });

  await test("Custom dialog traps focus and closes on Escape", () => {
    const first = { focus() { globalThis.document.activeElement = first; }, hidden: false, getAttribute: () => null };
    const last = { focus() { globalThis.document.activeElement = last; }, hidden: false, getAttribute: () => null };
    const dialog = { querySelectorAll: () => [first, last], focus() {} };
    const previous = globalThis.document;
    globalThis.document = { activeElement: first };
    try {
      let prevented = false;
      handleDialogKeydown({ key: "Tab", shiftKey: true, preventDefault() { prevented = true; } }, dialog, () => {});
      if (!prevented || globalThis.document.activeElement !== last) throw new Error("Shift+Tab did not wrap focus");
      let closed = false;
      handleDialogKeydown({ key: "Escape", preventDefault() {} }, dialog, () => { closed = true; });
      if (!closed) throw new Error("Escape did not dismiss dialog");
    } finally { globalThis.document = previous; }
  });

  return results;
}
