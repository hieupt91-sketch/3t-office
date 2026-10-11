import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = http.createServer((req, res) => {
  const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(root, path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ""));
  const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" }[path.extname(file)] || "application/octet-stream";
  fs.stat(file, (error, stat) => { if (error || !stat.isFile()) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": mime }); fs.createReadStream(file).pipe(res); });
});
await new Promise(resolve => server.listen(8798, resolve));
const playwright = await import(pathToFileURL("C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs"));
const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8798/", { waitUntil: "networkidle" });
  if (await page.locator('.vno-shell[data-app="sheet"]').count() === 0) {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
  }
  await page.locator('.vno-shell[data-app="sheet"] .vno-grid-cell[data-coord="A1"]').waitFor({ state: "visible" });
  const formulaBar = page.locator('.vno-shell[data-app="sheet"] #vno-formula-val');
  await page.locator('.vno-shell[data-app="sheet"] [data-coord="A1"]').click();
  await formulaBar.fill("5");
  await page.locator('.vno-shell[data-app="sheet"] [data-coord="A2"]').click();
  await formulaBar.fill("=A1*2+10");

  await page.locator('.vno-shell[data-app="sheet"] #vno-ribbon-tab-data').click();
  const command = page.locator('.vno-shell[data-app="sheet"] [data-command-id="sheet.data.goalSeek"]');
  if (await command.count() !== 1 || !(await command.locator("svg").count())) throw new Error("Ribbon thiếu Goal Seek hoặc SVG riêng");
  await command.click();
  const dialog = page.locator('.vno-dialog-box[aria-label="Dò tìm mục tiêu"]');
  await dialog.waitFor();
  await dialog.locator("#vno-goal-set-cell").fill("A2");
  await dialog.locator("#vno-goal-value").fill("50");
  await dialog.locator("#vno-goal-changing-cell").fill("A1");
  await dialog.locator(".vno-rule-apply").click();
  await dialog.locator(".vno-goal-result").waitFor({ state: "visible" });
  const beforeConfirm = (await page.locator('.vno-shell[data-app="sheet"] [data-coord="A1"]').textContent()).trim();
  if (beforeConfirm !== "5") throw new Error(`Preview đã đổi A1 trước xác nhận: ${beforeConfirm}`);
  await dialog.locator(".vno-rule-apply").click();
  const a1 = (await page.locator('.vno-shell[data-app="sheet"] [data-coord="A1"]').textContent()).trim();
  const a2 = (await page.locator('.vno-shell[data-app="sheet"] [data-coord="A2"]').textContent()).trim();
  if (Math.abs(Number(a1) - 20) > 0.001 || Math.abs(Number(a2) - 50) > 0.001) throw new Error(`Kết quả canvas sai: A1=${a1}, A2=${a2}`);

  // Invoke the real command bus for a second preview, then cancel by clicking its button.
  await command.click();
  const cancelDialog = page.locator('.vno-dialog-box[aria-label="Dò tìm mục tiêu"]');
  await cancelDialog.locator("#vno-goal-value").fill("70");
  await cancelDialog.locator("#vno-goal-changing-cell").fill("A1");
  await cancelDialog.locator(".vno-rule-apply").click();
  await cancelDialog.locator(".vno-rule-cancel").click();
  const afterCancel = (await page.locator('.vno-shell[data-app="sheet"] [data-coord="A1"]').textContent()).trim();
  if (Math.abs(Number(afterCancel) - 20) > 0.001) throw new Error(`Cancel đã đổi A1: ${afterCancel}`);
  if (errors.length) throw new Error(errors.join("; "));
  console.log("PASS: Edge Playwright — Goal Seek ribbon/dialog/canvas/apply/cancel, không dùng SendKeys");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
