/**
 * Live: VN Sheet Find/Replace — click ribbon Thay thế, dialog Replace-active,
 * thay thật trên ô. Cổng riêng để không đụng ribbon-audit 8893.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_FIND_REPLACE_PORT || 8917);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("403");
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise((resolve, reject) => {
  server.listen(port, "127.0.0.1", resolve);
  server.on("error", reject);
});

const assert = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  const a1 = page.locator('.vno-grid-cell[data-coord="A1"]');
  await a1.click();
  await page.keyboard.type("chi phí quý 1");
  await page.keyboard.press("Enter");
  await page.locator('.vno-grid-cell[data-coord="B1"]').click();
  await page.keyboard.type("chi phí nhân sự");
  await page.keyboard.press("Enter");

  const replaceBtn = page.locator('[data-command-id="common.edit.replace"]').first();
  await replaceBtn.scrollIntoViewIfNeeded();
  assert(await replaceBtn.isVisible(), "Nút Thay thế phải hiện trên ribbon Sheet Home");
  await replaceBtn.click();
  await page.locator("#vno-fr-find-input").waitFor({ state: "visible", timeout: 5000 });
  const replaceShown = await page.locator("#vno-fr-replace-group").evaluate(el => getComputedStyle(el).display !== "none");
  assert(replaceShown, "Replace phải mở hộp thoại với ô Thay thế bằng hiện sẵn");
  assert(await page.locator("#vno-fr-replace-btn").isVisible(), "Thiếu nút Thay thế trong dialog");
  assert(await page.locator("#vno-fr-replace-all-btn").isVisible(), "Thiếu nút Thay thế tất cả");

  await page.locator("#vno-fr-find-input").fill("chi phí");
  await page.locator("#vno-fr-replace-input").fill("ngân sách");
  await page.locator("#vno-fr-replace-all-btn").click();
  await page.waitForTimeout(80);

  const values = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return {
      a1: grid.cellsData.get("A1")?.val,
      b1: grid.cellsData.get("B1")?.val
    };
  });
  assert(values.a1 === "ngân sách quý 1", "A1 phải được thay thật", JSON.stringify(values));
  assert(values.b1 === "ngân sách nhân sự", "B1 phải được thay thật", JSON.stringify(values));

  await page.locator(".vno-fr-close").first().click();
  await page.locator('[data-command-id="common.edit.find"]').first().click();
  await page.locator("#vno-fr-find-input").waitFor({ state: "visible", timeout: 3000 });
  const replaceHidden = await page.locator("#vno-fr-replace-group").evaluate(el => getComputedStyle(el).display === "none");
  assert(replaceHidden, "Find không hiện ô thay thế mặc định");

  console.log("PASS: Sheet Replace mở dialog đúng chế độ và thay thật trên ô");
} finally {
  await browser?.close();
  server.close();
}
