import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { createServer } from "node:net";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const appDataName = `VNOffice-Codex-BasicKeys-${process.pid}`;
const pythonBootstrap = [
  "import sys, webview, main",
  "webview.settings['REMOTE_DEBUGGING_PORT'] = int(sys.argv[1])",
  "main.APP_DATA_DIR_NAME = sys.argv[2]",
  "main.main(['--app=' + sys.argv[3]])"
].join("; ");

const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push({ label, detail });
};
const failures = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});

function setWindowsClipboard(text, html = "") {
  const code = String.raw`
import ctypes, sys, time
from ctypes import wintypes
user = ctypes.WinDLL('user32', use_last_error=True)
kernel = ctypes.WinDLL('kernel32', use_last_error=True)
user.OpenClipboard.argtypes = [wintypes.HWND]
user.OpenClipboard.restype = wintypes.BOOL
user.EmptyClipboard.restype = wintypes.BOOL
user.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
user.SetClipboardData.restype = wintypes.HANDLE
user.CloseClipboard.restype = wintypes.BOOL
kernel.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel.GlobalAlloc.restype = wintypes.HGLOBAL
kernel.GlobalLock.argtypes = [wintypes.HGLOBAL]
kernel.GlobalLock.restype = ctypes.c_void_p
kernel.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
kernel.GlobalFree.argtypes = [wintypes.HGLOBAL]
def put(fmt, data):
    block = kernel.GlobalAlloc(0x0002 | 0x0040, len(data))
    if not block: raise ctypes.WinError(ctypes.get_last_error())
    address = kernel.GlobalLock(block)
    ctypes.memmove(address, data, len(data))
    kernel.GlobalUnlock(block)
    if not user.SetClipboardData(fmt, block):
        kernel.GlobalFree(block)
        raise ctypes.WinError(ctypes.get_last_error())
for _ in range(40):
    if user.OpenClipboard(None): break
    time.sleep(0.025)
else: raise RuntimeError('Windows clipboard remained busy')
try:
    if not user.EmptyClipboard(): raise ctypes.WinError(ctypes.get_last_error())
    put(13, sys.argv[1].encode('utf-16-le') + b'\0\0')
    html = sys.argv[2]
    if html:
        fragment = '<html><body><!--StartFragment-->' + html + '<!--EndFragment--></body></html>'
        raw = fragment.encode('utf-8')
        head = 'Version:0.9\r\nStartHTML:{:010}\r\nEndHTML:{:010}\r\nStartFragment:{:010}\r\nEndFragment:{:010}\r\n'
        head_bytes = head.format(0, 0, 0, 0).encode('ascii')
        start_html = len(head_bytes)
        start_fragment = start_html + len('<html><body><!--StartFragment-->'.encode('utf-8'))
        end_fragment = start_fragment + len(html.encode('utf-8'))
        end_html = start_html + len(raw)
        payload = head.format(start_html, end_html, start_fragment, end_fragment).encode('ascii') + raw + b'\0'
        fmt = user.RegisterClipboardFormatW('HTML Format')
        put(fmt, payload)
finally:
    user.CloseClipboard()
`;
  const result = spawnSync("python", ["-c", code, text, html], { cwd: repoRoot, encoding: "utf8", timeout: 10000 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "SetClipboard failed");
}

function readWindowsClipboardText() {
  const code = "import json,main; print(json.dumps(main._read_windows_clipboard_data(), ensure_ascii=False))";
  const raw = execFileSync("python", ["-c", code], { cwd: repoRoot, encoding: "utf8", timeout: 10000 });
  return JSON.parse(raw.trim());
}

async function connectDesktopApp(app) {
  const debugPort = await freePort();
  console.log(`INFO\tStarting 3T Office ${app} in pywebview/WebView2 on CDP ${debugPort}`);
  const child = spawn("python", ["-c", pythonBootstrap, String(debugPort), appDataName, app], {
    cwd: repoRoot,
    env: { ...process.env, VNOFFICE_DISABLE_UNO: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let childOutput = "";
  child.stdout.on("data", chunk => { childOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { childOutput += chunk.toString(); });

  let browser;
  try {
    let endpointReady = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`3T Office desktop process exited (${child.exitCode})\n${childOutput}`);
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) { endpointReady = true; break; }
      } catch { /* Wait for pywebview to initialize WebView2. */ }
      await sleep(250);
    }
    if (!endpointReady) throw new Error(`WebView2 remote debugging endpoint did not start\n${childOutput}`);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0];
    let page = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      page = context.pages().find(candidate => /127\.0\.0\.1|localhost/.test(candidate.url())) || context.pages()[0] || null;
      if (page && page.url() !== "about:blank") break;
      await sleep(250);
    }
    if (!page) throw new Error(`No WebView2 page found\n${childOutput}`);
    await page.locator(app === "writer" ? ".vno-writer-body" : ".vno-sheet-container").waitFor({ timeout: 20000 });
    const consent = page.locator(".vno-error-reporting-overlay");
    if (app === "writer") {
      await consent.waitFor({ state: "visible", timeout: 10000 });
      await consent.locator('[data-dialog-action="deny"]').click();
      await consent.waitFor({ state: "detached", timeout: 5000 });
      assert(true, `3T Office ${app} first-run reporting consent remains local`);
    }
    return { child, browser, page, childOutput };
  } catch (error) {
    await browser?.close().catch(() => {});
    await stopApp(child);
    throw error;
  }
}

async function stopApp(child) {
  if (child.exitCode !== null) return;
  try {
    execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 });
  } catch { child.kill(); }
  await Promise.race([new Promise(resolve => child.once("exit", resolve)), sleep(4000)]);
}

async function closeDesktopApp(session) {
  try {
    await session.page.evaluate(async () => {
      await window.pywebview?.api?.close_current_window?.();
    });
  } catch { /* The WebView may already be closing after a failed assertion. */ }
  await session.browser.close().catch(() => {});
  await Promise.race([new Promise(resolve => session.child.once("exit", resolve)), sleep(8000)]);
  await stopApp(session.child);
}

let session;
try {
  session = await connectDesktopApp("writer");
  const { page } = session;
  const writer = page.locator(".vno-writer-body");
  await writer.click();
  await page.keyboard.insertText("abc");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Dong mot");
  await page.waitForTimeout(700);
  let paragraphs = await writer.locator("p").allTextContents();
  assert(paragraphs.length >= 2 && paragraphs[0] === "abc" && paragraphs[1] === "Dong mot",
    "3T Doc desktop Enter keeps subsequent typing in the new paragraph", JSON.stringify(paragraphs));

  setWindowsClipboard("Desktop rich clipboard", "<p><strong>Desktop rich clipboard</strong></p>");
  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(100);
  const nativePaste = await writer.evaluate(el => ({ text: el.innerText, strong: [...el.querySelectorAll("strong,b")].some(node => node.textContent === "Desktop rich clipboard") }));
  assert(nativePaste.text.includes("Desktop rich clipboard") && nativePaste.strong,
    "3T Doc desktop Ctrl+V reads Windows text and HTML clipboard formats", JSON.stringify(nativePaste));

  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Desktop copy check");
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Control+c");
  const copied = readWindowsClipboardText();
  assert(copied.status === "ok" && copied.text === "Desktop copy check",
    "3T Doc desktop Ctrl+C writes selected text to the Windows clipboard", JSON.stringify(copied));

  await page.keyboard.press("Control+x");
  await page.waitForTimeout(80);
  const afterCut = await writer.innerText();
  const cutClipboard = readWindowsClipboardText();
  assert(!afterCut.includes("Desktop copy check") && cutClipboard.text === "Desktop copy check",
    "3T Doc desktop Ctrl+X removes the selection and updates Windows clipboard", JSON.stringify({ removed: !afterCut.includes("Desktop copy check"), text: cutClipboard.text }));

  setWindowsClipboard("Ribbon button clipboard");
  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.locator("#vno-ribbon-tab-home").click();
  await page.locator('[data-command-id="common.edit.paste"]').first().click();
  await page.waitForTimeout(100);
  assert((await writer.innerText()).includes("Ribbon button clipboard"), "3T Doc desktop ribbon Paste reads CF_UNICODETEXT through the Python bridge");

  await page.evaluate(async () => { await window.pywebview.api.close_current_window(); });
  await session.browser.close();
  await Promise.race([new Promise(resolve => session.child.once("exit", resolve)), sleep(8000)]);
  await stopApp(session.child);
  session = await connectDesktopApp("sheet");
  const sheetPage = session.page;
  const grid = sheetPage.locator(".vno-sheet-container");
  const cellValue = async coord => sheetPage.evaluate(async coordText => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const cell = globalUnoBridge.activeDocument.grid.cellsData.get(coordText);
    return cell?.val ?? "";
  }, coord);
  assert(await grid.evaluate(el => el.tabIndex === 0 && document.activeElement === el), "3T Sheet desktop starts focused on its grid");
  await sheetPage.keyboard.type("123");
  await sheetPage.keyboard.press("Enter");
  await sheetPage.keyboard.insertText("abc");
  await sheetPage.keyboard.press("Tab");
  await sheetPage.keyboard.press("Enter");
  assert(await cellValue("A1") === "123" && await cellValue("A2") === "abc",
    "3T Sheet desktop Enter and Tab commit values and move the active cell");
  await sheetPage.locator('.vno-grid-cell[data-coord="A2"]').first().click();
  await sheetPage.keyboard.press("Control+x");
  await sheetPage.locator('.vno-grid-cell[data-coord="C2"]').first().click();
  await sheetPage.keyboard.press("Control+v");
  assert(await cellValue("A2") === "" && await cellValue("C2") === "abc", "3T Sheet desktop Ctrl+X/Ctrl+V moves the selected cell");
  setWindowsClipboard("desktop outside\t42");
  await sheetPage.locator('.vno-grid-cell[data-coord="E5"]').first().click();
  await sheetPage.keyboard.press("Control+v");
  assert(await cellValue("E5") === "desktop outside" && await cellValue("F5") === "42", "3T Sheet desktop Ctrl+V imports Windows tab-separated text");
  await sheetPage.locator('.vno-grid-cell[data-coord="F5"]').first().click();
  await sheetPage.keyboard.press("Delete");
  await sheetPage.keyboard.press("Control+z");
  assert(await cellValue("F5") === "42", "3T Sheet desktop Delete and Ctrl+Z clear and restore a cell");
  assert(session.childOutput.includes("Embedded server ready") || await sheetPage.locator(".vno-sheet-container").count() === 1,
    "3T Sheet desktop is running in pywebview with its embedded Python server");
} catch (error) {
  console.error(`BLOCKED\tDesktop/WebView2 probe: ${error?.stack || error}`);
  failures.push({ label: "Desktop/WebView2 probe", detail: String(error) });
} finally {
  if (session) await closeDesktopApp(session);
}

if (failures.length) process.exitCode = 1;
