import { execFileSync, spawn } from "node:child_process";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] || 9396);
const app = process.argv[3] || "sheet";
const action = process.argv[4] || "paste";
const root = new URL("../../", import.meta.url);
const worktree = fileURLToPath(root);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let officeHelper = null;
let officeReady = null;
let officeOutput = "";
let officeHelperExited = false;

const startOfficeClipboardHelper = async () => {
  const readyPath = new URL("tests/live/clipboard-office.ready.json", root);
  const stopPath = new URL("tests/live/clipboard-office.stop", root);
  const copyPath = new URL("tests/live/clipboard-office.copy", root);
  const donePath = new URL("tests/live/clipboard-office.copy-done", root);
  for (const file of [readyPath, stopPath, copyPath, donePath]) {
    try { await unlink(file); } catch { /* No stale helper marker. */ }
  }
  officeHelper = spawn("powershell.exe", [
    "-STA", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    fileURLToPath(new URL("tests/live/clipboard_hidden_office.ps1", root)), "-App", app
  ], { cwd: worktree, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  officeHelper.stdout.on("data", chunk => { officeOutput += chunk.toString(); });
  officeHelper.stderr.on("data", chunk => { officeOutput += chunk.toString(); });
  officeHelper.once("exit", () => { officeHelperExited = true; });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (officeHelper.exitCode !== null) throw new Error(`Hidden Office COM helper exited early: ${officeOutput}`);
    try {
      officeReady = JSON.parse(await readFile(readyPath, "utf8"));
      console.log(`OFFICE_COM_READY app=${app} officePid=${officeReady.officeProcessId} hidden=true`);
      return;
    } catch { /* Office is still creating the copied range. */ }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for hidden Office COM copy: ${officeOutput}`);
};

const stopOfficeClipboardHelper = async () => {
  if (!officeHelper) return;
  if (officeReady?.stopFile) await writeFile(officeReady.stopFile, "stop", "ascii");
  let exited = officeHelperExited;
  if (!exited) {
    exited = await Promise.race([
      new Promise(resolve => officeHelper.once("exit", () => resolve(true))),
      sleep(5000).then(() => false)
    ]);
  }
  if (!exited && officeReady?.officeProcessId) {
    const id = Number(officeReady.officeProcessId);
    const name = app === "sheet" ? "EXCEL" : "WINWORD";
    const start = String(officeReady.officeProcessStart).replaceAll("'", "''");
    const command = `$p=Get-Process -Id ${id} -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq '${name}' -and $p.Path -eq 'C:\\Program Files\\Microsoft Office\\Office16\\${name}.EXE' -and $p.StartTime.ToString('o') -eq '${start}') { Stop-Process -Id ${id} -Force }`;
    try { execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { cwd: worktree, stdio: "ignore", timeout: 5000 }); } catch { /* Only the Office PID recorded by this COM helper is targeted. */ }
    if (!officeHelperExited) {
      exited = await Promise.race([
        new Promise(resolve => officeHelper.once("exit", () => resolve(true))),
        sleep(3000).then(() => false)
      ]);
    }
  }
  if (!exited) console.error(`OFFICE_COM_CLEANUP_TIMEOUT app=${app} officePid=${officeReady?.officeProcessId} ${officeOutput}`);
  else console.log(`OFFICE_COM_CLOSED app=${app} officePid=${officeReady?.officeProcessId}`);
};

const waitForTarget = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find(item => item.type === "page" && item.webSocketDebuggerUrl && item.url !== "about:blank");
        if (target) return target;
      }
    } catch { /* WebView2 is still starting. */ }
    await sleep(250);
  }
  throw new Error(`No WebView2 page found on CDP port ${port}`);
};

const target = await waitForTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleLines = [];
let nextId = 0;
socket.addEventListener("message", event => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else if (message.method === "Runtime.consoleAPICalled") {
    const values = (message.params.args || []).map(arg => arg.value ?? arg.description ?? "");
    const line = values.map(String).join(" ");
    if (line.includes("__VNO_CLIPBOARD_DIAG__")) consoleLines.push(line);
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  return result.result?.value;
};

try {
  await send("Runtime.enable");
  await send("Page.enable");
  await evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const target = ${JSON.stringify(app)} === "writer" ? document.querySelector(".vno-writer-body") : document.querySelector(".vno-sheet-container");
      if (target) { window.__vnoClipboardDiagnostics = true; resolve(true); }
      else if (Date.now() - started > 30000) reject(new Error("Application editor did not load"));
      else setTimeout(poll, 100);
    };
    poll();
  })`);

  if (action === "paste-com") await startOfficeClipboardHelper();

  if (action === "inspect") {
    const clipboard = await evaluate(`Promise.all([
      import("/platform/clipboard/office-clipboard.js"),
      window.pywebview.api.read_clipboard_data()
    ]).then(([parser, data]) => JSON.stringify({
      status: data.status,
      textLength: (data.text || "").length,
      htmlLength: (data.html || "").length,
      html: data.html || "",
      parsed: parser.parseOfficeHtmlTable(data.html || "", data.text || "")?.cells || []
    }))`);
    const output = await evaluate(app === "writer"
      ? `(() => ({html: document.querySelector(".vno-writer-body")?.innerHTML || "", text: document.querySelector(".vno-writer-body")?.innerText || ""}))()`
      : `(() => ({cells: ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"].map(coord => {
        const el = document.querySelector('.vno-grid-cell[data-coord="' + coord + '"]');
        return {coord, text: el?.innerText || "", style: el?.getAttribute("style") || ""};
      })}))()`);
    console.log(JSON.stringify({ app, target: target.url, clipboard: JSON.parse(clipboard), output }, null, 2));
    process.exitCode = 0;
    socket.close();
    process.exit();
  }
  if (action === "close") {
    await evaluate("window.pywebview.api.close_current_window()");
    await sleep(1200);
    console.log(JSON.stringify({ app, closed: true, target: target.url }));
    socket.close();
    process.exit();
  }

  let box;
  if (app === "writer") {
    box = await evaluate(`(() => {
      const editor = document.querySelector(".vno-writer-body");
      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const rect = editor.getBoundingClientRect();
      return {x: rect.left + Math.min(rect.width / 2, 40), y: rect.top + Math.min(rect.height / 2, 40)};
    })()`);
  } else {
    box = await evaluate(`(() => {
      const cell = document.querySelector('.vno-grid-cell[data-coord="A1"]');
      if (!cell) throw new Error("A1 grid cell not found");
      const rect = cell.getBoundingClientRect();
      return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    })()`);
  }
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
  if (app === "writer") {
    await evaluate(`(() => {
      const editor = document.querySelector(".vno-writer-body");
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      editor.focus();
      return true;
    })()`);
  }

  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "v", code: "KeyV", windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, modifiers: 2, commands: ["paste"] });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "v", code: "KeyV", windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, modifiers: 2 });
  await sleep(1800);

  const output = await evaluate(app === "writer"
    ? `(() => ({html: document.querySelector(".vno-writer-body")?.innerHTML || "", text: document.querySelector(".vno-writer-body")?.innerText || ""}))()`
    : `(() => ({cells: ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"].map(coord => {
      const el = document.querySelector('.vno-grid-cell[data-coord="' + coord + '"]');
      return {coord, text: el?.innerText || "", style: el?.getAttribute("style") || ""};
    })}))()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2 });
  await sleep(700);
  const afterUndo = await evaluate(app === "writer"
    ? `(() => ({html: document.querySelector(".vno-writer-body")?.innerHTML || "", text: document.querySelector(".vno-writer-body")?.innerText || ""}))()`
    : `(() => ({cells: ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"].map(coord => {
      const el = document.querySelector('.vno-grid-cell[data-coord="' + coord + '"]');
      return {coord, text: el?.innerText || "", style: el?.getAttribute("style") || ""};
    })}))()`);
  console.log(JSON.stringify({ app, target: target.url, diagnostics: consoleLines, output, afterUndo }, null, 2));
} finally {
  try { await stopOfficeClipboardHelper(); }
  catch (error) { console.error(`OFFICE_COM_CLEANUP_ERROR ${error.message}`); process.exitCode = 1; }
  socket.close();
}
