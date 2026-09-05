import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 8793;
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(ROOT_DIR, path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, ""));
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
});
await new Promise(resolve => server.listen(PORT, resolve));

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  if (await page.locator(".vno-shell").getAttribute("data-app") !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }
  await page.waitForTimeout(300);
  await page.locator("#vno-ribbon-tab-home").click();
  const a9 = page.locator('.vno-grid-cell[data-coord="A9"]');
  await a9.click();
  await page.locator("#vno-formula-val").fill("Báo cáo doanh thu");
  const startBox = await page.locator('.vno-grid-cell[data-coord="A9"]').boundingBox();
  const endBox = await page.locator('.vno-grid-cell[data-coord="C10"]').boundingBox();
  await page.mouse.move(startBox.x + 8, startBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(endBox.x + endBox.width - 8, endBox.y + endBox.height - 8, { steps: 5 });
  await page.mouse.up();
  console.log("Selected before merge:", await page.locator("#vno-cell-name").textContent());
  await page.locator('[data-command-id="sheet.cell.mergeCenter"]').click();

  const merged = page.locator('.vno-grid-cell[data-coord="A9"]');
  await merged.waitFor();
  const state = await merged.evaluate(cell => ({ colSpan: cell.colSpan, rowSpan: cell.rowSpan, range: cell.dataset.mergedRange, text: cell.textContent.trim(), align: cell.style.textAlign }));
  if (state.colSpan !== 3 || state.rowSpan !== 2 || state.range !== "A9:C10" || state.text !== "Báo cáo doanh thu" || state.align !== "center") throw new Error(`Merged DOM sai: ${JSON.stringify(state)}`);
  if (await page.locator('.vno-grid-cell[data-coord="B9"], .vno-grid-cell[data-coord="C10"]').count()) throw new Error("Covered cells vẫn còn trong DOM");

  const box = await merged.boundingBox();
  await page.mouse.click(box.x + box.width - 3, box.y + box.height - 3);
  const selectedRange = await page.locator("#vno-cell-name").textContent();
  if (selectedRange.trim() !== "A9:C10") throw new Error(`Click góc covered không chọn toàn vùng: ${selectedRange}`);

  await page.locator('[data-command-id="sheet.cell.unmerge"]').click();
  if (await page.locator('.vno-grid-cell[data-coord="B9"]').count() !== 1) throw new Error("Unmerge chưa trả lại ô B9");
  if ((await page.locator('.vno-grid-cell[data-coord="B9"]').textContent()).trim() !== "") throw new Error("Ô covered không rỗng sau unmerge");
  if (errors.length) throw new Error(errors.join(" | "));
  console.log("PASS: live UI merge/unmerge, DOM span, covered-cell click selection và dữ liệu top-left");
} finally {
  await browser.close();
  server.close();
}
