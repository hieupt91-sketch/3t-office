import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";

const root = path.resolve(import.meta.dirname, "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const dataName = app => `VNOffice-Codex-CH9-${process.pid}-${app}`;
const bootstrap = [
  "import sys, webview, main",
  "webview.settings['REMOTE_DEBUGGING_PORT'] = int(sys.argv[1])",
  "main.APP_DATA_DIR_NAME = sys.argv[2]",
  "main.main(['--app=' + sys.argv[3]])"
].join("; ");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close(error => error ? reject(error) : resolve(value));
  });
});
const failures = [];

async function start(app) {
  const debugPort = await port();
  const child = spawn("python", ["-c", bootstrap, String(debugPort), dataName(app), app], {
    cwd: root, env: { ...process.env, VNOFFICE_DISABLE_UNO: "1" }, stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  let browser;
  try {
    for (let i = 0; i < 100; i += 1) {
      if (child.exitCode !== null) throw new Error(`app exited ${child.exitCode}: ${output}`);
      try { if ((await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok) break; } catch {}
      await sleep(200);
      if (i === 99) throw new Error(`CDP endpoint timeout: ${output}`);
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0];
    for (let i = 0; i < 80; i += 1) {
      const page = context.pages().find(candidate => candidate.url().includes("localhost")) || context.pages()[0];
      if (page && page.url() !== "about:blank") {
        await page.waitForSelector(app === "writer" ? ".vno-writer-body" : app === "sheet" ? ".vno-sheet-container" : ".vno-slide-canvas", { timeout: 20000 });
        return { child, browser, page };
      }
      await sleep(200);
    }
    throw new Error(`WebView page timeout: ${output}`);
  } catch (error) {
    await browser?.close().catch(() => {});
    stop(child);
    throw error;
  }
}

function stop(child) {
  if (child.exitCode !== null) return;
  try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 }); } catch { child.kill(); }
}

async function killAbruptly(session) {
  stop(session.child);
  await Promise.race([new Promise(resolve => session.child.once("exit", resolve)), sleep(5000)]);
  await session.browser.close().catch(() => {});
}

async function closeNormally(session) {
  try { await session.page.evaluate(() => window.pywebview?.api?.close_current_window?.()); } catch {}
  await Promise.race([new Promise(resolve => session.child.once("exit", resolve)), sleep(7000)]);
  stop(session.child);
  await session.browser.close().catch(() => {});
}

async function typeDraft(app, page, text) {
  if (app === "writer") {
    const editor = page.locator(".vno-writer-body");
    await editor.click();
    await page.keyboard.insertText(text);
  } else if (app === "sheet") {
    const grid = page.locator(".vno-sheet-container");
    await grid.click();
    await page.keyboard.type(text);
    await page.keyboard.press("Enter");
  } else {
    const title = page.locator(".vno-slide-title").first();
    await title.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText(text);
  }
  await page.evaluate(async () => {
    const manager = window.__vnoAppInstance?.autoRecoverManager;
    if (!manager) throw new Error("AutoRecover manager is not exposed by the app");
    manager.tick();
  });
  await page.waitForTimeout(1200);
}

for (const [app, text] of [["writer", "CH9 Doc recovery"], ["sheet", "CH9 Sheet recovery"], ["slides", "CH9 Slide recovery"]]) {
  let first;
  try {
    first = await start(app);
    await typeDraft(app, first.page, text);
    const written = await first.page.evaluate(async () => (await window.pywebview.api.list_autorecover_snapshots()).length === 0 ? "current-session" : "leftover-visible");
    console.log(`PASS\tCH-9.2 ${app}: CDP edit + local autosave trigger (${written})`);
    await killAbruptly(first);
    const second = await start(app);
    const dialog = second.page.locator(".vno-recovery-overlay");
    await dialog.waitFor({ state: "visible", timeout: 15000 });
    const title = await dialog.locator("#vno-recovery-title").textContent();
    await dialog.locator("[data-recovery-action='recover']").first().click();
    await second.page.waitForTimeout(800);
    const restored = await second.page.evaluate(expected => document.body.innerText.includes(expected), text);
    console.log(`${restored ? "PASS" : "FAIL"}\tCH-9.2 ${app}: dialog "${title}" + Khôi phục restores typed text`);
    if (!restored) failures.push(`${app} restored text missing`);
    await closeNormally(second);
  } catch (error) {
    console.log(`BLOCKED\tCH-9.2 ${app}: ${error?.message || error}`);
    failures.push(`${app}: ${error?.message || error}`);
    if (first) { stop(first.child); await first.browser?.close().catch(() => {}); }
  }
}
if (failures.length) process.exitCode = 1;
