import { createServer } from "node:net";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const repo = process.cwd();
const scratch = path.join(repo, ".scratch-ch2");
const install = path.join(scratch, "scratch with spaces", "app-install");
const appDir = path.join(install, "app");
const userData = path.join(scratch, "user-data");
const source = path.join(scratch, "update-source");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [];
const report = (pass, label, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures.push(label + (detail ? `: ${detail}` : ""));
};
const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});
const debugPort = await freePort();
const endpoint = `http://127.0.0.1:${debugPort}`;
const endpointUrl = `${endpoint}/json/version`;
const doc1 = path.join(appDir, "scratch-doc-1.txt");
const doc2 = path.join(appDir, "scratch-doc-2.txt");
const executable = path.join(install, "python", "pythonw.exe");
const child = spawn(executable, ["-s", "-E", path.join(appDir, "main.py"), "--app=writer", doc1], {
  cwd: appDir,
  env: {
    ...process.env,
    LOCALAPPDATA: userData,
    TEMP: path.join(scratch, "temp"),
    TMP: path.join(scratch, "temp"),
    VNO_CDP_DEBUG_PORT: String(debugPort),
    VNOFFICE_DISABLE_UNO: "1"
  },
  stdio: "ignore"
});
let browser = null;
let context = null;
let pages = [];
let appClosed = false;
child.once("exit", () => { appClosed = true; });

async function getPageList(candidateBrowser) {
  return candidateBrowser.contexts().flatMap(candidate => candidate.pages())
    .filter(page => /127\\.0\\.0\\.1|localhost/.test(page.url()));
}
async function connectInitial() {
  for (let n = 0; n < 120; n += 1) {
    if (child.exitCode !== null) throw new Error(`Scratch app exited before CDP was ready (${child.exitCode})`);
    try {
      const response = await fetch(endpointUrl);
      if (response.ok) {
        browser = await chromium.connectOverCDP(endpoint);
        context = browser.contexts()[0];
        for (let i = 0; i < 80; i += 1) {
          pages = await getPageList(browser);
          const page = pages[0];
          if (page && page.url() !== "about:blank") {
            await page.locator(".vno-writer-body").waitFor({ timeout: 20000 });
            return page;
          }
          await sleep(250);
        }
      }
    } catch (error) {
      if (n === 119) throw error;
    }
    await sleep(250);
  }
  throw new Error("Scratch WebView2 CDP endpoint did not become ready");
}
async function closePages(candidatePages) {
  for (const page of [...candidatePages].reverse()) {
    try {
      if (!page.isClosed()) await page.evaluate(async () => await window.pywebview?.api?.close_current_window?.());
    } catch { }
  }
}
async function readStatus(page) {
  return await page.evaluate(async () => await window.pywebview?.api?.get_update_status?.());
}

try {
  const firstPage = await connectInitial();
  const consent = firstPage.locator(".vno-error-reporting-overlay");
  try {
    await consent.waitFor({ state: "visible", timeout: 2500 });
    await consent.locator('[data-dialog-action="deny"]').click();
    await consent.waitFor({ state: "detached", timeout: 5000 });
  } catch { }
  await firstPage.locator(".vno-writer-body").waitFor({ state: "visible", timeout: 20000 });
  await firstPage.waitForFunction(() => document.querySelector(".vno-writer-body")?.innerText.includes("Tài liệu scratch thứ nhất"), null, { timeout: 30000 });
  report(true, "scratch 0.9.5 Writer opened its first text document through WebView2");

  const opened = await firstPage.evaluate(async path => await window.pywebview.api.open_file_in_new_window(path, "writer"), doc2);
  if (opened?.status !== "ok") throw new Error(`Could not open second scratch document: ${JSON.stringify(opened)}`);
  for (let n = 0; n < 60; n += 1) {
    pages = await getPageList(browser);
    if (pages.length >= 2 && pages.some(page => page.url() !== "about:blank")) break;
    await sleep(250);
  }
  if (pages.length < 2) throw new Error(`Expected two app windows, found ${pages.length}`);
  for (let n = 0; n < 80; n += 1) {
    pages = await getPageList(browser);
    const texts = await Promise.all(pages.map(async page => page.locator(".vno-writer-body").innerText().catch(() => "")));
    if (texts.some(text => text.includes("Tài liệu scratch thứ hai"))) break;
    await sleep(250);
  }
  report(pages.length >= 2, "two document windows are open before update");

  const deadline = Date.now() + 120000;
  let state = null;
  while (Date.now() < deadline) {
    pages = await getPageList(browser);
    for (const page of pages) {
      try {
        state = await readStatus(page);
        if (state?.ready && state.available_version === "0.9.6") break;
      } catch { }
    }
    if (state?.ready && state.available_version === "0.9.6") break;
    await sleep(500);
  }
  report(state?.ready === true && state?.available_version === "0.9.6", "signed local 0.9.6 update is staged within two minutes", JSON.stringify(state));
  if (!state?.ready) throw new Error("0.9.6 update did not become ready in 120 seconds");

  let updatePage = null;
  for (const page of pages) {
    if (await page.locator(".vno-notification-bar").count()) { updatePage = page; break; }
  }
  if (!updatePage) updatePage = pages[0];
  const restartButton = updatePage.locator(".vno-notification-bar-action-btn").filter({ hasText: "Khởi động lại ngay" }).first();
  await restartButton.waitFor({ state: "visible", timeout: 10000 });
  await restartButton.click();
  report(true, "update action was clicked through CDP");

  const oldExitDeadline = Date.now() + 60000;
  while (!appClosed && Date.now() < oldExitDeadline) await sleep(250);
  report(appClosed, "all original app windows closed the 0.9.5 process");

  const nextDeadline = Date.now() + 150000;
  let updatedBrowser = null;
  let updatedPages = [];
  let updatedStatus = null;
  let candidateBrowser = null;
  while (Date.now() < nextDeadline) {
    try {
      if (!candidateBrowser) {
        const targetsResponse = await fetch(`${endpoint}/json/list`);
        if (targetsResponse.ok) {
          const targets = await targetsResponse.json();
          if (targets.some(target => target.type === "page" && /127\.0\.0\.1|localhost/.test(target.url || ""))) {
            candidateBrowser = await chromium.connectOverCDP(endpoint);
          }
        }
      }
      if (candidateBrowser) {
        const candidatePages = await getPageList(candidateBrowser);
        for (const page of candidatePages) {
          try {
            const status = await readStatus(page);
            if (status?.current_version === "0.9.6") {
              updatedBrowser = candidateBrowser;
              updatedPages = candidatePages;
              updatedStatus = status;
              break;
            }
          } catch { }
        }
        if (updatedBrowser) break;
      }
    } catch { candidateBrowser = null; }
    await sleep(500);
  }
  report(Boolean(updatedBrowser), "scratch app relaunched and reports APP_VERSION 0.9.6", JSON.stringify(updatedStatus));
  if (!updatedBrowser) throw new Error("0.9.6 scratch app did not relaunch through the updater");

  for (let n = 0; n < 60; n += 1) {
    const texts = await Promise.all(updatedPages.map(async page => page.locator(".vno-writer-body").innerText().catch(() => "")));
    if (texts.some(text => text.includes("Tài liệu scratch thứ nhất")) && texts.some(text => text.includes("Tài liệu scratch thứ hai"))) break;
    await sleep(300);
  }
  const restoredTexts = await Promise.all(updatedPages.map(async page => page.locator(".vno-writer-body").innerText().catch(() => "")));
  const restored = restoredTexts.some(text => text.includes("Tài liệu scratch thứ nhất")) && restoredTexts.some(text => text.includes("Tài liệu scratch thứ hai"));
  report(restored && updatedPages.length >= 2, "both open documents were restored after update", JSON.stringify(restoredTexts));

  const logPath = path.join(userData, "VNOffice", "updates", "update-log.txt");
  const log = fs.readFileSync(logPath, "utf8");
  report(log.includes("STEP old-app-exited"), "helper logged old app and windows exiting");
  report(log.includes("STEP health-check-passed version=0.9.6"), "helper logged health verification");
  report(log.includes("STEP relaunch-start version=0.9.6"), "helper logged new app relaunch");

  pages = updatedPages;
  browser = updatedBrowser;
  await closePages(pages);
  await sleep(1000);
  await browser.close().catch(() => {});
} catch (error) {
  console.error(`ERROR\t${error?.stack || error}`);
  failures.push(String(error?.message || error));
  try { pages = browser ? await getPageList(browser) : []; await closePages(pages); } catch { }
  try { await browser?.close(); } catch { }
}

if (failures.length) {
  console.error(`RESULT\tFAIL (${failures.length})`);
  process.exitCode = 1;
} else {
  console.log("RESULT\tPASS");
}
