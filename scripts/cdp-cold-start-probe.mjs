import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function readArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--verify-first-input") result.verify_first_input = true;
    else if (key.startsWith("--")) result[key.slice(2).replaceAll("-", "_")] = argv[++i];
  }
  return result;
}

const options = readArgs(process.argv.slice(2));
const port = Number(options.port);
const timeoutMs = Math.max(1000, Number(options.timeout_seconds || 240) * 1000);
const startedAt = performance.now();
const appNames = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

if (!Number.isInteger(port) || !options.trace || !options.app) {
  throw new Error("Usage: node --experimental-websocket cdp-cold-start-probe.mjs --port <port> --trace <timeline.jsonl> --app <writer|sheet|slides>");
}
if (typeof WebSocket === "undefined") {
  throw new Error("Node 20 WebSocket support is unavailable; run with --experimental-websocket.");
}

async function readTimeline() {
  let content = "";
  try { content = await fs.readFile(options.trace, "utf8"); } catch { return []; }
  return content.split(/\r?\n/).filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

async function waitForDebugger() {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not listening yet";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(800) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find(target => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page;
      lastError = "no page target advertised";
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await delay(100);
  }
  throw new Error(`WebView2 CDP endpoint did not become ready: ${lastError}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.diagnostics = [];
    this.networkUrls = new Map();
    socket.addEventListener("message", event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.method === "Runtime.exceptionThrown") {
        const details = message.params?.exceptionDetails || {};
        const exception = details.exception || {};
        this.diagnostics.push({
          kind: "javascript-exception",
          className: exception.className || "Error",
          description: options.open_file ? undefined : String(exception.description || details.text || "").slice(0, 400),
          url: details.url || "",
          line: details.lineNumber,
          column: details.columnNumber
        });
      } else if (message.method === "Network.requestWillBeSent") {
        const url = message.params?.request?.url || "";
        this.networkUrls.set(message.params?.requestId, url.startsWith("http://localhost") ? url : "");
      } else if (message.method === "Network.loadingFailed") {
        this.diagnostics.push({
          kind: "request-failed",
          url: this.networkUrls.get(message.params?.requestId) || "",
          error: message.params?.errorText || ""
        });
      } else if (message.method === "Network.responseReceived" && Number(message.params?.response?.status) >= 400) {
        this.diagnostics.push({
          kind: "request-error",
          url: message.params?.response?.url || "",
          status: Number(message.params.response.status)
        });
      }
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || "CDP command failed"));
      else pending.resolve(message.result || {});
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("CDP WebSocket closed"));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, timeout = 10000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, timeout = 10000) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }, timeout);
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Runtime.evaluate failed");
    }
    return response.result?.value;
  }
}

async function connectCdp(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out opening CDP WebSocket")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not open CDP WebSocket")); }, { once: true });
  });
  const cdp = new CdpClient(socket);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.evaluate("document.readyState");
  return cdp;
}

async function clickAndTypeableProbe(cdp) {
  const info = await cdp.evaluate(`(() => {
    const selectors = ${JSON.stringify(options.app === "writer"
      ? [".vno-writer-body[contenteditable='true']"]
      : options.app === "sheet"
        ? [".vno-grid-table[role='grid']"]
        : [".vno-slide-title[contenteditable='true']", ".vno-slide-body[contenteditable='true']"])};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect?.();
      const visible = rect && {
        left: Math.max(0, rect.left), top: Math.max(0, rect.top),
        right: Math.min(window.innerWidth, rect.right), bottom: Math.min(window.innerHeight, rect.bottom)
      };
      if (element && visible && visible.right > visible.left && visible.bottom > visible.top) {
        const x = (visible.left + visible.right) / 2;
        const y = (visible.top + visible.bottom) / 2;
        const hit = document.elementFromPoint(x, y);
        return { selector, x, y,
          tag: element.tagName, role: element.getAttribute('role'), active: document.activeElement === element,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          hitTargetIsSurface: !!hit && (hit === element || element.contains(hit)),
          hit: hit ? { tag: hit.tagName, id: hit.id, className: String(hit.className || ""), role: hit.getAttribute("role") } : null };
      }
    }
    return null;
  })()`);
  if (!info) throw new Error(`No visible editable surface was found for ${appNames[options.app] || options.app}.`);
  if (!info.hitTargetIsSurface) throw new Error(`The editable surface for ${appNames[options.app] || options.app} is covered by ${JSON.stringify(info.hit)}.`);

  // Queue the input sequence in protocol order; per-command round trips add avoidable launch latency.
  await Promise.all([
    cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: info.x, y: info.y }),
    cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: info.x, y: info.y, button: "left", buttons: 1, clickCount: 1 }),
    cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: info.x, y: info.y, button: "left", buttons: 0, clickCount: 1 }),
    cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "x", code: "KeyX", text: "x", unmodifiedText: "x",
    windowsVirtualKeyCode: 88, nativeVirtualKeyCode: 88
    }),
    cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "x", code: "KeyX", windowsVirtualKeyCode: 88, nativeVirtualKeyCode: 88 }),
    cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Backspace", code: "Backspace",
    windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8
    }),
    cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 })
  ]);
  await cdp.evaluate("window.__vnoFirstEditorKey === true");
  await delay(30);
  const state = await cdp.evaluate(`(() => {
    const app = window.__vnoAppInstance;
    const target = document.querySelector(${JSON.stringify(info.selector)});
    const active = document.activeElement;
    return {
      firstEditorKey: !!window.__vnoFirstEditorKey,
      focusInsideSurface: !!target && (active === target || target.contains(active)),
      activeTag: active?.tagName || "",
      activeRole: active?.getAttribute?.("role") || "",
      selectedCoord: app?.grid?.selectedCoord ? { ...app.grid.selectedCoord } : null,
      ribbonInteractive: !!document.querySelector(".vno-ribbon")
    };
  })()`);
  if (!state.firstEditorKey) throw new Error("CDP key event did not reach the editor key listener.");
  return { ...info, ...state };
}

async function saveScreenshot(cdp, label) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 15000);
  const screenshotPath = path.join(path.dirname(options.trace), `${label}-visible.png`);
  await fs.writeFile(screenshotPath, Buffer.from(result.data, "base64"));
  return screenshotPath;
}

async function closeViaCdp(cdp) {
  try {
    await cdp.evaluate(`(async () => {
      const app = window.__vnoAppInstance;
      if (app?.adapter) app.adapter.isDirty = false;
      return await window.pywebview?.api?.close_current_window?.();
    })()`, 10000);
  } catch { /* The page may close its WebSocket as soon as the native window closes. */ }
}

let cdp;
let screenshotPath = "";
let inputState = null;
let inputSent = false;
const traceFirstTargets = options.open_file
  ? ["initial_file_open_resolved", "lo_worker_ready"]
  : options.verify_first_input
    ? ["blank_document_first_paint", "editable_surface_ready", "ribbon_interactive", "first_editor_key", "lo_worker_ready"]
    : ["blank_document_first_paint", "lo_worker_ready"];
const deadline = Date.now() + timeoutMs;
let events = [];
let error = null;

try {
  const page = await waitForDebugger();
  cdp = await connectCdp(page);
  while (Date.now() < deadline) {
    events = await readTimeline();
    const stages = new Set(events.map(event => event.stage));

    if (options.verify_first_input && !inputSent && stages.has("editable_surface_ready") && stages.has("blank_document_first_paint")) {
      inputSent = true;
      inputState = await clickAndTypeableProbe(cdp);
    }
    if (!options.open_file && stages.has("blank_document_first_paint") && !screenshotPath) {
      screenshotPath = await saveScreenshot(cdp, "blank-document");
    }
    if (options.open_file && stages.has("initial_file_open_resolved") && !screenshotPath) {
      screenshotPath = await saveScreenshot(cdp, "opened-document");
    }
    if (traceFirstTargets.every(stage => stages.has(stage))) break;
    if (stages.has("lo_worker_failed")) {
      const failure = events.find(event => event.stage === "lo_worker_failed");
      error = new Error(`LibreOffice worker did not become ready: ${failure?.error || "unknown failure"}`);
      break;
    }
    await delay(50);
  }
  events = await readTimeline();
  const seen = new Set(events.map(event => event.stage));
  const missing = traceFirstTargets.filter(stage => !seen.has(stage));
  if (!error && missing.length) error = new Error(`Timed out before startup stages: ${missing.join(", ")}`);
} catch (caught) {
  error = caught;
  events = await readTimeline();
  if (cdp && !options.open_file && events.some(event => event.stage === "blank_document_first_paint") && !screenshotPath) {
    try { screenshotPath = await saveScreenshot(cdp, "blank-document"); } catch { /* Keep the CDP failure as the primary result. */ }
  }
} finally {
  if (cdp) await closeViaCdp(cdp);
  if (cdp?.socket?.readyState === WebSocket.OPEN) cdp.socket.close();
}

const elapsed = stage => events.find(event => event.stage === stage)?.elapsed_ms;
const pickedStages = [
  "process_start", "python_runtime_started", "python_imports_complete", "static_server_ready",
  "pywebview_window_created", "pywebview_ready", "renderer_entry", "ribbon_interactive",
  "blank_document_first_paint", "editable_surface_ready", "first_editor_key",
  "uno_bridge_ready", "lo_worker_start_requested", "lo_worker_ready",
  "initial_file_open_resolved", "document_open_complete", "background_services_ready"
];
console.log(`App: ${appNames[options.app] || options.app}`);
console.log(`Layout: ${options.layout || "unspecified"}`);
console.log(`Open file: ${options.open_file || "(blank document)"}`);
console.log("Milestone                              Elapsed from process start");
for (const stage of pickedStages) {
  const event = events.find(item => item.stage === stage);
  if (event) console.log(`${stage.padEnd(38)} ${`${Number(event.elapsed_ms).toFixed(1)} ms`.padStart(10)}`);
}
if (options.verify_first_input) {
  const inputMs = elapsed("first_editor_key");
  console.log(`Blank visible + editable target: ${Number.isFinite(inputMs) && inputMs < 3000 ? "PASS" : "FAIL"} (first editor key ${Number.isFinite(inputMs) ? `${inputMs.toFixed(1)} ms` : "not recorded"})`);
  console.log(`CDP input state: ${inputState ? JSON.stringify(inputState) : "not verified"}`);
}
if (screenshotPath) console.log(`CDP screenshot: ${screenshotPath}`);
if (cdp?.diagnostics.length) console.log(`CDP startup diagnostics: ${JSON.stringify(cdp.diagnostics)}`);
if (error) {
  console.error(`CDP probe: FAIL — ${error.message}`);
  process.exitCode = 1;
} else {
  console.log("CDP probe: PASS");
}
