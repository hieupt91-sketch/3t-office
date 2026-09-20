import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(".");
const port = 8994;
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".htm": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Server listening on port ${port}`);

const outDir = path.resolve(root, "docs/screenshots");
let browser;

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });

  // 1. Capture Excel export HTML renderings:
  console.log("Capturing Excel HTML renderings...");

  // To bypass Excel's iframe redirect: window.name = "frSheet"
  await page.addInitScript(() => {
    window.name = "frSheet";
  });

  // Orig Sheet 2
  const origSheet2Url = `file:///${path.resolve(root, "docs/screenshots/orig_lan02_files/sheet002.htm").replace(/\\/g, "/")}`;
  await page.goto(origSheet2Url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "visual_excel_orig_sheet2.png"), fullPage: false });
  console.log("Saved visual_excel_orig_sheet2.png");

  // RT Sheet 2
  const rtSheet2Url = `file:///${path.resolve(root, "docs/screenshots/rt_lan02_files/sheet002.htm").replace(/\\/g, "/")}`;
  await page.goto(rtSheet2Url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "visual_excel_rt_sheet2.png"), fullPage: false });
  console.log("Saved visual_excel_rt_sheet2.png");

  // Orig Sheet 1 (UNC)
  const origSheet1Url = `file:///${path.resolve(root, "docs/screenshots/orig_lan02_files/sheet001.htm").replace(/\\/g, "/")}`;
  await page.goto(origSheet1Url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "visual_excel_orig_sheet1.png"), fullPage: false });
  console.log("Saved visual_excel_orig_sheet1.png");

  // RT Sheet 1 (UNC)
  const rtSheet1Url = `file:///${path.resolve(root, "docs/screenshots/rt_lan02_files/sheet001.htm").replace(/\\/g, "/")}`;
  await page.goto(rtSheet1Url, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "visual_excel_rt_sheet1.png"), fullPage: false });
  console.log("Saved visual_excel_rt_sheet1.png");

  // 2. Open VN Sheet app and load the document
  console.log("Opening VN Sheet app...");
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);

  const fodsXml = fs.readFileSync(path.resolve(root, "docs/screenshots/lan02.fods"), "utf8");
  const wbXml = fs.readFileSync(path.resolve(root, "docs/screenshots/lan02_wb.xml"), "utf8");

  console.log("Loading document into VN Sheet...");
  const loadResult = await page.evaluate(async ({ fods, wb }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const { SheetAdapter } = await import("/adapters/libreoffice/sheet/sheet-adapter.js");
    const adapter = new SheetAdapter(grid);
    const ok = adapter.loadFromFods(fods, wb);
    return { ok, activeSheet: grid.activeSheet, sheets: grid.sheets };
  }, { fods: fodsXml, wb: wbXml });

  console.log("Load result:", loadResult);
  await page.waitForTimeout(1000);

  // Switch to Sheet 2: DANH SÁCH CHI LƯƠNG
  console.log("Switching to DANH SÁCH CHI LƯƠNG...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.switchSheet("DANH SÁCH CHI LƯƠNG");
  });
  await page.waitForTimeout(1000);

  // Take screenshot of VN Sheet on Sheet 2
  await page.screenshot({ path: path.join(outDir, "visual_vnsheet_lan02_sheet2.png") });
  console.log("Saved visual_vnsheet_lan02_sheet2.png");

  // Switch to Sheet 1: UNC
  console.log("Switching to UNC...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.switchSheet("UNC");
  });
  await page.waitForTimeout(1000);

  // Take screenshot of VN Sheet on Sheet 1
  await page.screenshot({ path: path.join(outDir, "visual_vnsheet_lan02_sheet1.png") });
  console.log("Saved visual_vnsheet_lan02_sheet1.png");

} catch (err) {
  console.error("Error during capture:", err);
} finally {
  if (browser) await browser.close();
  server.close();
}
