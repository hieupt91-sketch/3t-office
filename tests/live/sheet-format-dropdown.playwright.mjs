import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8898;

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
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);
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

await new Promise(resolve => server.listen(PORT, resolve));
console.log(`[Test Server] Đang chạy tại http://127.0.0.1:${PORT}`);

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

function assert(condition, message, extra) {
  if (!condition) throw new Error(extra ? `${message}: ${extra}` : message);
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN"
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", err => pageErrors.push(err.message));

  console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE: SHEET FORMAT DROPDOWN ===");
  await page.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="sheet"]', { timeout: 10000 });
  await page.waitForSelector(".vno-grid-cell[data-coord=\"A1\"]", { timeout: 10000 });
  await page.waitForTimeout(250);

  const formatBtn = page.locator('[data-dropdown-id="sheet.cells.format"]');
  await formatBtn.scrollIntoViewIfNeeded();
  await formatBtn.waitFor({ state: "visible", timeout: 5000 });
  const formatLabel = (await formatBtn.innerText()).trim();
  assert(formatLabel.includes("Định dạng"), "Nút dropdown phải mang nhãn Định dạng", formatLabel);
  console.log("  ✓ Dropdown Định dạng hiện trên nhóm Ô");

  async function clickCell(coord) {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(80);
  }

  async function openFormatItem(commandId) {
    await formatBtn.click();
    const menu = page.locator(".vno-ribbon-dropdown-menu");
    await menu.waitFor({ state: "visible", timeout: 3000 });
    const item = page.locator(`.vno-ribbon-dropdown-item[data-command-id="${commandId}"]`);
    await item.waitFor({ state: "visible", timeout: 2000 });
    await item.click();
    await page.waitForTimeout(120);
  }

  await clickCell("A2");
  await openFormatItem("sheet.row.height");
  const heightInput = page.locator(".vno-dialog-input");
  await heightInput.waitFor({ state: "visible", timeout: 3000 });
  await heightInput.fill("48");
  await page.locator(".vno-dialog-ok-btn").click();
  await page.waitForTimeout(200);
  const rowHeight = await page.locator('tr[data-row="2"]').evaluate(el => el.getBoundingClientRect().height);
  assert(rowHeight >= 46, "Chiều cao hàng 2 phải ~48px sau dialog", String(rowHeight));
  console.log(`  ✓ Chiều cao hàng 2 = ${rowHeight.toFixed(1)}px`);

  await clickCell("D1");
  await openFormatItem("sheet.col.width");
  const widthInput = page.locator(".vno-dialog-input");
  await widthInput.waitFor({ state: "visible", timeout: 3000 });
  await widthInput.fill("150");
  await page.locator(".vno-dialog-ok-btn").click();
  await page.waitForTimeout(200);
  const modelWidth = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.getColumnWidth("D");
  });
  assert(modelWidth === 150, "Model độ rộng cột D phải là 150px", String(modelWidth));
  const colWidthAfter = await page.locator('.vno-col-header[data-col="D"]').evaluate(el => el.getBoundingClientRect().width);
  assert(colWidthAfter >= 140 && colWidthAfter <= 170, "Header cột D phải ~150px", String(colWidthAfter));
  console.log(`  ✓ Độ rộng cột D model=${modelWidth}px DOM=${colWidthAfter.toFixed(1)}px`);

  await clickCell("B1");
  await page.locator("#vno-formula-val").click();
  await page.locator("#vno-formula-val").fill("Chuỗi rất dài để AutoFit cột B trong kiểm thử live");
  await page.locator("#vno-formula-val").press("Enter");
  await page.waitForTimeout(150);
  await clickCell("B1");
  await openFormatItem("sheet.col.autoFit");
  const colWidth = await page.locator('.vno-col-header[data-col="B"]').evaluate(el => el.getBoundingClientRect().width);
  const modelAuto = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.getColumnWidth("B");
  });
  assert(modelAuto > 120 && colWidth > 120, "AutoFit cột B phải giãn > 120px", `model=${modelAuto} DOM=${colWidth}`);
  console.log(`  ✓ AutoFit cột B model=${modelAuto}px DOM=${colWidth.toFixed(1)}px`);

  await clickCell("A4");
  await openFormatItem("sheet.row.hide");
  const hiddenRow = await page.locator('tr[data-row="4"]').count();
  assert(hiddenRow === 0, "Hàng 4 phải biến khỏi DOM sau Ẩn hàng", String(hiddenRow));
  console.log("  ✓ Ẩn hàng 4: không còn tr[data-row=4]");

  await clickCell("A3");
  await clickCell("A5");
  await page.keyboard.down("Shift");
  await clickCell("A3");
  await page.keyboard.up("Shift");
  await openFormatItem("sheet.row.unhide");
  const shownRow = await page.locator('tr[data-row="4"]').count();
  assert(shownRow === 1, "Hàng 4 phải hiện lại sau Hiện hàng", String(shownRow));
  console.log("  ✓ Hiện hàng 4: tr[data-row=4] trở lại");

  await clickCell("C1");
  await openFormatItem("sheet.col.hide");
  const hiddenCol = await page.locator('.vno-col-header[data-col="C"]').evaluate(el => el.hidden || getComputedStyle(el).display === "none");
  assert(hiddenCol, "Cột C phải bị ẩn");
  console.log("  ✓ Ẩn cột C");

  await clickCell("B1");
  await page.keyboard.down("Shift");
  await clickCell("D1");
  await page.keyboard.up("Shift");
  await openFormatItem("sheet.col.unhide");
  const shownCol = await page.locator('.vno-col-header[data-col="C"]').evaluate(el => !el.hidden && getComputedStyle(el).display !== "none");
  assert(shownCol, "Cột C phải hiện lại");
  console.log("  ✓ Hiện cột C");

  await clickCell("A6");
  await openFormatItem("sheet.row.autoFit");
  const autoHeight = await page.locator('tr[data-row="6"]').evaluate(el => el.getBoundingClientRect().height);
  assert(autoHeight >= 24, "AutoFit hàng 6 phải cho chiều cao hợp lệ", String(autoHeight));
  console.log(`  ✓ AutoFit hàng 6 = ${autoHeight.toFixed(1)}px`);

  await page.keyboard.press("Control+Z");
  await page.waitForTimeout(150);
  await page.keyboard.press("Control+Y");
  await page.waitForTimeout(150);
  console.log("  ✓ Undo/Redo phím tắt không làm sập trang");

  assert(pageErrors.length === 0, "Không được có pageerror", pageErrors.join(" | "));
  console.log("=== PASS: SHEET FORMAT DROPDOWN LIVE ===");
} finally {
  await browser.close();
  server.close();
}
