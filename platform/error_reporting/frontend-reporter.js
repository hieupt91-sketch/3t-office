/** Shared, rate-limited renderer error hooks for Writer, Sheet and Slides. */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 20;
const DEFAULT_DEDUPE_MS = 30_000;

function asErrorParts(value) {
  if (value instanceof Error) {
    return { type: value.name || "Error", message: value.message || "", stack: value.stack || "" };
  }
  if (value && typeof value === "object") {
    return {
      type: typeof value.name === "string" ? value.name : "UnhandledRejection",
      message: typeof value.message === "string" ? value.message : "Promise rejected",
      stack: typeof value.stack === "string" ? value.stack : ""
    };
  }
  return { type: "UnhandledRejection", message: String(value ?? "Promise rejected"), stack: "" };
}

export function createFrontendErrorReporter({
  target = typeof window === "undefined" ? null : window,
  getApi = () => target?.pywebview?.api,
  getApp = () => {
    const doc = target?.document;
    if (!doc || typeof doc.querySelector !== "function") return null;
    return doc.querySelector("#vno-app-root")?.getAttribute?.("data-app") || null;
  },
  now = () => Date.now(),
  maxPerWindow = DEFAULT_MAX_PER_WINDOW,
  windowMs = DEFAULT_WINDOW_MS,
  dedupeMs = DEFAULT_DEDUPE_MS
} = {}) {
  const recent = new Map();
  const sentAt = [];
  let previousOnError = null;
  let onUnhandled = null;

  const report = (payload) => {
    if (!payload || typeof payload !== "object") return false;
    const app = getApp?.();
    const normalized = {
      type: String(payload.type || "FrontendError").slice(0, 100),
      message: String(payload.message || "").slice(0, 2000),
      stack: String(payload.stack || "").slice(0, 10_000),
      operation: "frontend",
      app: ["writer", "sheet", "slides"].includes(app) ? app : undefined
    };
    const key = `${normalized.type}\n${normalized.message}\n${normalized.stack.split("\n").slice(0, 2).join("\n")}`;
    const timestamp = now();
    if (timestamp - (recent.get(key) ?? -Infinity) < dedupeMs) return false;
    while (sentAt.length && timestamp - sentAt[0] >= windowMs) sentAt.shift();
    if (sentAt.length >= maxPerWindow) return false;
    recent.set(key, timestamp);
    sentAt.push(timestamp);
    try {
      const api = getApi();
      const result = api?.report_frontend_error?.(normalized);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // Reporting must not create another unhandled renderer error.
    }
    if (recent.size > 200) {
      for (const [fingerprint, lastSeen] of recent) {
        if (timestamp - lastSeen > windowMs) recent.delete(fingerprint);
      }
    }
    return true;
  };

  const install = () => {
    if (!target || target.__vnoErrorHooksInstalled) return false;
    target.__vnoErrorHooksInstalled = true;
    previousOnError = target.onerror;
    target.onerror = (message, source, line, column, error) => {
      const details = asErrorParts(error || message);
      report({
        type: details.type,
        message: details.message || String(message || "Lỗi giao diện"),
        stack: details.stack || `${source || ""}:${line || 0}:${column || 0}`
      });
      if (typeof previousOnError === "function") {
        try { return previousOnError.call(target, message, source, line, column, error); } catch { return false; }
      }
      return false;
    };
    onUnhandled = (event) => report(asErrorParts(event?.reason));
    target.addEventListener?.("unhandledrejection", onUnhandled);
    return true;
  };

  const uninstall = () => {
    if (!target || !target.__vnoErrorHooksInstalled) return;
    target.onerror = previousOnError;
    target.removeEventListener?.("unhandledrejection", onUnhandled);
    delete target.__vnoErrorHooksInstalled;
  };

  return { install, uninstall, report, get sentCount() { return sentAt.length; } };
}
