#!/usr/bin/env node
/** Desktop save probe. Starts 3T Office and drives it only through WebView2 CDP. */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, stat } from "node:fs/promises";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const args = process.argv.slice(2);
const app = args[0];
const sourcePath = path.resolve(args[1] || "");
const targetPath = path.resolve(args[2] || "");
const markerArg = args.find(arg => arg.startsWith("--marker="));
const marker = markerArg ? markerArg.slice("--marker=".length) : "";
const boldMarker = args.includes("--bold-marker");
const allowedApps = new Set(["writer", "sheet", "slides"]);
if (!allowedApps.has(app) || !args[1] || !args[2]) {
  console.error("Usage: node _cdp_roundtrip.mjs <writer|sheet|slides> <source> <target> [--marker=TEXT] [--bold-marker]");
  process.exit(2);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});
const safeStat = async file => { try { return await stat(file); } catch { return null; } };

let child;
let browser;
let page;
let finalResult;
try {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
  const debugPort = await freePort();
  const appDataName = `VNOffice-Codex-CH5-${process.pid}`;
  const bootstrap = "import sys,main; main.APP_DATA_DIR_NAME=sys.argv[1]; main.main(sys.argv[2:])";
  const env = { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debugPort}` };
  delete env.VNOFFICE_DISABLE_UNO;
  child = spawn("python", ["-c", bootstrap, appDataName, `--app=${app}`, sourcePath], {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let appOutput = "";
  child.stdout.on("data", chunk => { appOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { appOutput += chunk.toString(); });

  let endpointReady = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`3T Office exited (${child.exitCode})\n${appOutput.slice(-3000)}`);
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) { endpointReady = true; break; }
    } catch { /* Wait for WebView2 to publish its CDP endpoint. */ }
    await sleep(250);
  }
  if (!endpointReady) throw new Error(`WebView2 CDP endpoint did not start\n${appOutput.slice(-3000)}`);

  browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
  const context = browser.contexts()[0];
  for (let attempt = 0; attempt < 80; attempt += 1) {
    page = context.pages().find(candidate => /127\.0\.0\.1|localhost/.test(candidate.url())) || context.pages()[0] || null;
    if (page && page.url() !== "about:blank") break;
    await sleep(250);
  }
  if (!page) throw new Error(`No WebView2 page was exposed over CDP\n${appOutput.slice(-3000)}`);
  page.setDefaultTimeout(30000);

  const mainSelector = app === "writer" ? ".vno-writer-body" : app === "sheet" ? ".vno-sheet-container" : ".vno-slide-canvas";
  await page.waitForSelector(mainSelector, { timeout: 120000 });
  const consent = page.locator(".vno-error-reporting-overlay");
  if (await consent.count() && await consent.isVisible().catch(() => false)) {
    const deny = consent.locator('[data-dialog-action="deny"]');
    if (await deny.count()) await deny.click();
    await consent.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  }

  const stem = path.basename(sourcePath, path.extname(sourcePath));
  const loaded = await page.waitForFunction(
    expected => (document.querySelector(".vno-doc-tab span")?.textContent || "").toLowerCase().includes(expected.toLowerCase()),
    stem,
    { timeout: app === "sheet" ? 900000 : 300000 }
  ).then(() => true).catch(() => false);
  if (!loaded) throw new Error(`The desktop app did not finish opening ${path.basename(sourcePath)}\n${appOutput.slice(-3000)}`);
  console.log(`LOADED: ${path.basename(sourcePath)}`);

  let editResult = "no-edit";
  if (marker) {
    if (app === "slides") {
      const texts = page.locator("[data-shape-text-id]");
      const textCount = await texts.count();
      let chosen = null;
      for (let index = 0; index < textCount; index += 1) {
        const candidate = texts.nth(index);
        if ((await candidate.innerText().catch(() => "")).trim()) { chosen = candidate; break; }
      }
      if (!chosen) throw new Error("No text shape was available for the PPTX audit marker.");
      await chosen.dblclick();
      await chosen.evaluate(element => {
        if (element.contentEditable !== "true") throw new Error("Selected slide shape did not enter text-edit mode.");
        element.focus();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      await page.keyboard.insertText(` ${marker}`);
      await chosen.evaluate(element => element.blur());
      editResult = "slide-text-marker-inserted-via-cdp";
    } else if (app === "writer") {
      editResult = await page.evaluate(({ value, bold }) => {
        const body = document.querySelector(".vno-writer-body");
        if (!body) return "writer-body-not-found";
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) if (node.textContent.trim().length > 12) nodes.push(node);
        const target = nodes[2];
        if (!target) return "writer-text-sample-not-found";
        const editable = target.parentElement.closest("[contenteditable]");
        if (!editable) return "writer-editable-not-found";
        editable.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        if (bold) document.execCommand("bold");
        const insert = document.createRange();
        insert.setStart(target, 0);
        insert.collapse(true);
        selection.removeAllRanges();
        selection.addRange(insert);
        const inserted = document.execCommand("insertText", false, value);
        editable.blur();
        return inserted ? "writer-marker-inserted-via-cdp" : "writer-marker-insert-failed";
      }, { value: marker, bold: boldMarker });
      if (!editResult.endsWith("inserted-via-cdp")) throw new Error(`Writer marker edit failed: ${editResult}`);
    } else {
      throw new Error("Markers are supported for Writer batch editing and Slides fidelity audits only.");
    }
    console.log(`EDIT: ${editResult}`);
  }

  const queued = await page.evaluate(async target => {
    const api = window.pywebview?.api;
    if (!api?.save_document_in_place) throw new Error("Desktop save API is unavailable.");
    const originalSave = api.save_document_in_place.bind(api);
    api.save_document_in_place = async (content, appKind, _requestedPath, source) => {
      const result = await originalSave(content, appKind, target, source);
      window.__ch5BackendSaveResult = result;
      return result;
    };
    window.__ch5SaveDone = false;
    window.__ch5SaveError = "";
    import("/platform/commands/command-bus.js").then(module => module.globalCommandBus.execute("common.file.save"))
      .then(result => { window.__ch5CommandResult = String(result); window.__ch5SaveDone = true; })
      .catch(error => { window.__ch5SaveError = String(error?.stack || error); window.__ch5SaveDone = true; });
    return "queued";
  }, targetPath);
  if (queued !== "queued") throw new Error(`Could not queue the desktop save (${queued}).`);

  await page.waitForFunction(() => window.__ch5SaveDone === true, undefined, { timeout: app === "sheet" ? 900000 : 600000 });
  const saveState = await page.evaluate(() => ({
    error: window.__ch5SaveError || "",
    backend: window.__ch5BackendSaveResult || null,
    command: window.__ch5CommandResult || ""
  }));
  const outputStat = await safeStat(targetPath);
  if (saveState.error) throw new Error(`Desktop save failed: ${saveState.error}`);
  if (saveState.backend?.status !== "ok") throw new Error(`Desktop save did not succeed: ${JSON.stringify(saveState.backend)}`);
  if (!outputStat?.size) throw new Error(`Desktop save did not create ${path.basename(targetPath)}.`);
  const canvasStatus = app === "writer"
    ? await page.locator(".vno-statusbar-left").innerText().catch(() => "")
    : "";
  finalResult = { app, loaded, saved: true, edit: editResult, canvasStatus, bytes: outputStat.size };
  console.log(`SAVED: ${path.basename(targetPath)} bytes=${outputStat.size}`);
  console.log(`CH5_RESULT ${JSON.stringify(finalResult)}`);
} catch (error) {
  console.error(`FAIL: ${error?.stack || error}`);
  console.error(`CH5_RESULT ${JSON.stringify(finalResult || { app, loaded: false, saved: false, error: String(error?.message || error) })}`);
  process.exitCode = 1;
} finally {
  if (page) {
    try { await page.evaluate(async () => await window.pywebview?.api?.close_current_window?.()); } catch { /* App may already be closing. */ }
  }
  if (browser) await browser.close().catch(() => {});
  if (child && child.exitCode === null) {
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), sleep(12000)]);
    if (child.exitCode === null) child.kill();
  }
}
