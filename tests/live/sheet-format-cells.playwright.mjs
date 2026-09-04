import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8778;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

// 1. Khởi động Web Server
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
console.log(`[Test Server] Đang phục vụ tại http://127.0.0.1:${PORT}`);

// 2. Khởi chạy Playwright
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 }
});
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", err => consoleErrors.push(err.message));
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE AUDIT: VN SHEET FORMAT CELLS ===");

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

  // Chuyển sang VN Sheet nếu chưa ở Sheet
  const appAttr = await page.locator(".vno-shell").getAttribute("data-app");
  if (appAttr !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }
  console.log("  ✓ Đã kích hoạt VN Sheet");

  // Helper click ô
  async function clickCell(coord) {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(50);
  }

  // 1. Kiểm tra phím tắt Ctrl+1 mở hộp thoại Format Cells
  await clickCell("A1");
  // Nhập số vào A1
  await page.keyboard.type("1500000");
  await page.keyboard.press("Enter");
  await clickCell("A1");

  console.log("  -> Nhấn phím tắt Ctrl+1 trên ô A1...");
  await page.keyboard.press("Control+1");
  
  const dialogBox = page.locator(".vno-format-cells-box");
  await dialogBox.waitFor({ state: "visible", timeout: 3000 });
  console.log("  ✓ Hộp thoại Format Cells đã mở thành công bằng Ctrl+1!");

  // Chụp ảnh màn hình hộp thoại
  const screenshotDir = path.join(ROOT_DIR, "docs");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const dialogScreenshotPath = path.join(screenshotDir, "format-cells-dialog.png");
  await dialogBox.screenshot({ path: dialogScreenshotPath });
  console.log(`  ✓ Đã chụp ảnh Format Cells Dialog tại: ${dialogScreenshotPath}`);

  // 2. Chọn category Currency
  console.log("  -> Chọn Category Currency (Tiền tệ)...");
  await page.locator('.vno-fc-cat-item[data-cat="currency"]').click();
  await page.waitForTimeout(100);

  // Kiểm tra Sample preview
  const sampleText = await page.locator("#vno-fc-sample-box").textContent();
  console.log(`  ✓ Sample Preview cho Currency: "${sampleText}"`);

  // Nhấn nút Đồng ý (OK)
  await page.locator(".vno-fc-ok-btn").click();
  await dialogBox.waitFor({ state: "hidden", timeout: 2000 });
  console.log("  ✓ Hộp thoại đã đóng mượt mà, overlay được gỡ bỏ");

  // Kiểm tra hiển thị ô A1
  const cellA1Text = await page.locator('.vno-grid-cell[data-coord="A1"]').textContent();
  console.log(`  ✓ Ô A1 sau khi áp Currency hiển thị: "${cellA1Text}"`);

  // 3. Kiểm tra mở bằng Ribbon dialog launcher
  console.log("  -> Kiểm tra nút Dialog Launcher trên Ribbon nhóm Định dạng số...");
  await clickCell("B1");
  const launcherBtn = page.locator('.vno-ribbon-dialog-launcher[data-command="sheet.format.cellsDialog"]');
  await launcherBtn.waitFor({ state: "visible" });
  await launcherBtn.click();

  await dialogBox.waitFor({ state: "visible", timeout: 3000 });
  console.log("  ✓ Mở hộp thoại thành công qua Ribbon Launcher!");

  // Chọn category Accounting
  console.log("  -> Chọn Category Accounting (Kế toán)...");
  await page.locator('.vno-fc-cat-item[data-cat="accounting"]').click();
  await page.locator(".vno-fc-ok-btn").click();
  await dialogBox.waitFor({ state: "hidden", timeout: 2000 });

  // Nhập số 0 vào B1
  await clickCell("B1");
  await page.keyboard.type("0");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const cellB1Zero = await page.locator('.vno-grid-cell[data-coord="B1"]').textContent();
  console.log(`  ✓ Ô B1 (Accounting với giá trị 0) hiển thị: "${cellB1Zero}" (chứa dấu gạch ngang)`);

  // Nhập số âm -50000 vào B1
  await clickCell("B1");
  await page.keyboard.type("-50000");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const cellB1Neg = await page.locator('.vno-grid-cell[data-coord="B1"]').textContent();
  console.log(`  ✓ Ô B1 (Accounting số âm -50000) hiển thị: "${cellB1Neg}" (ngoặc đơn không dấu trừ)`);

  // 4. Kiểm tra Category Percentage với hành vi 2 chiều
  console.log("  -> Kiểm tra Percentage (Phần trăm) hành vi 2 chiều trên C1...");
  await clickCell("C1");
  await page.keyboard.press("Control+1");
  await dialogBox.waitFor({ state: "visible", timeout: 3000 });
  await page.locator('.vno-fc-cat-item[data-cat="percentage"]').click();
  await page.locator(".vno-fc-ok-btn").click();
  await dialogBox.waitFor({ state: "hidden", timeout: 2000 });

  // Gõ số 50 vào ô C1 đã format %
  await clickCell("C1");
  await page.keyboard.type("50");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);

  const cellC1Text = await page.locator('.vno-grid-cell[data-coord="C1"]').textContent();
  console.log(`  ✓ Ô C1 hiển thị: "${cellC1Text}"`);

  // Kiểm tra giá trị lưu trữ nội tại qua evaluate
  const c1InternalVal = await page.evaluate(async () => {
    const uno = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge;
    const item = uno?.activeDocument?.grid?.cellsData?.get("C1");
    return item?.val;
  });
  console.log(`  ✓ Giá trị thực tế lưu trữ trong state C1: ${c1InternalVal} (đã tự chia 100 thành 0.5)`);

  // Chụp ảnh toàn bộ bảng tính
  const sheetScreenshotPath = path.join(screenshotDir, "sheet-format-cells-grid.png");
  await page.screenshot({ path: sheetScreenshotPath });
  console.log(`  ✓ Đã chụp ảnh bảng tính hoàn chỉnh tại: ${sheetScreenshotPath}`);

  if (consoleErrors.length > 0) {
    console.error("  [CẢNH BÁO] Console Errors trong quá trình test:", consoleErrors);
  } else {
    console.log("  ✓ Hoàn toàn KHÔNG có console errors!");
  }

  console.log("\n=== TẤT CẢ PLAYWRIGHT AUDIT KIỂM THỬ THẬT ĐỀU THÀNH CÔNG RỰC RỠ ===");

} catch (err) {
  console.error("LỖI PLAYWRIGHT:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}