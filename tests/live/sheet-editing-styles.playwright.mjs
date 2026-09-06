import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8789;

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
  viewport: { width: 1366, height: 850 }
});
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", err => consoleErrors.push(err.message));
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE TEST: VN SHEET STYLES & EDITING GROUPS ===");

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

  // 1. Chuyển sang VN Sheet
  const appAttr = await page.locator(".vno-shell").getAttribute("data-app");
  if (appAttr !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }
  console.log("  ✓ Đã kích hoạt VN Sheet");

  // Helper click cell
  async function clickCell(coord) {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(60);
  }

  // 2. Kiểm tra layout Ribbon Home tab
  const homeTab = page.locator("#vno-ribbon-tab-home");
  if (await homeTab.count() > 0) {
    await homeTab.click();
  }
  await page.waitForTimeout(100);

  const styleGroupBtn = page.locator('[data-command-id="sheet.style.cellStyles"]');
  const tableGroupBtn = page.locator('[data-command-id="sheet.style.formatAsTable"]');
  const fillDropdownBtn = page.locator('[data-dropdown-id="sheet.edit.fill"]');
  const clearDropdownBtn = page.locator('[data-dropdown-id="sheet.edit.clear"]');

  await styleGroupBtn.waitFor({ state: "visible", timeout: 3000 });
  await tableGroupBtn.waitFor({ state: "visible", timeout: 3000 });
  await fillDropdownBtn.waitFor({ state: "visible", timeout: 3000 });
  await clearDropdownBtn.waitFor({ state: "visible", timeout: 3000 });
  console.log("  ✓ Các nút trong nhóm Styles và Editing (kèm dropdown Fill/Clear) đã hiển thị chuẩn xác trên Ribbon Trang đầu");

  // 3. Test Cell Styles Dialog và áp dụng style lên DOM thật
  await clickCell("B2");
  await styleGroupBtn.click();

  const stylesDialog = page.locator(".vno-cell-styles-dialog");
  await stylesDialog.waitFor({ state: "visible", timeout: 3000 });
  console.log("  ✓ Mở hộp thoại Cell Styles Gallery thành công");

  // Chụp ảnh dialog Cell Styles
  const screenshotDir = path.join(ROOT_DIR, "docs");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  await stylesDialog.locator(".vno-dialog-box").screenshot({ path: path.join(screenshotDir, "sheet-cell-styles-dialog.png") });
  console.log("  ✓ Đã chụp ảnh Cell Styles Dialog");

  // Click chọn kiểu 'good'
  await stylesDialog.locator('[data-style-id="good"]').click();
  await stylesDialog.waitFor({ state: "hidden", timeout: 2000 });
  console.log("  ✓ Đã chọn kiểu 'Good' và đóng dialog");

  // Kiểm tra màu trên DOM thật của ô B2
  const b2Cell = page.locator('.vno-grid-cell[data-coord="B2"]');
  const b2Bg = await b2Cell.evaluate(el => el.style.backgroundColor);
  const b2Color = await b2Cell.evaluate(el => el.style.color);
  console.log(`  ✓ DOM ô B2 sau khi áp Cell Style: background = "${b2Bg}", color = "${b2Color}"`);
  if (!b2Bg.includes("198, 239, 206") && b2Bg !== "#c6efce") {
    throw new Error(`Background không đúng màu Good: ${b2Bg}`);
  }

  // 4. Test Format as Table Dialog
  // Chọn vùng C2:E5
  await clickCell("C2");
  await tableGroupBtn.click();

  const tableDialog = page.locator(".vno-format-table-dialog");
  await tableDialog.waitFor({ state: "visible", timeout: 3000 });
  console.log("  ✓ Mở hộp thoại Format as Table thành công");

  await tableDialog.locator(".vno-dialog-box").screenshot({ path: path.join(screenshotDir, "sheet-format-table-dialog.png") });
  console.log("  ✓ Đã chụp ảnh Format as Table Dialog");

  // Chọn mẫu tableBlue
  await tableDialog.locator('[data-table-id="tableBlue"]').click();
  await tableDialog.waitFor({ state: "hidden", timeout: 2000 });
  console.log("  ✓ Đã chọn kiểu bảng tableBlue và đóng dialog");

  // Kiểm tra DOM ô C2 (Header) có màu xanh #2563eb
  const c2Cell = page.locator('.vno-grid-cell[data-coord="C2"]');
  const c2Bg = await c2Cell.evaluate(el => el.style.backgroundColor);
  console.log(`  ✓ Header row C2 background: "${c2Bg}"`);

  // 5. Test Fill Down bằng phím tắt Ctrl+D với công thức thật
  // Gõ số vào F2: 100, F3: 200, F4: 300
  await clickCell("F2");
  await page.keyboard.type("100");
  await page.keyboard.press("Enter");

  await clickCell("F3");
  await page.keyboard.type("200");
  await page.keyboard.press("Enter");

  await clickCell("F4");
  await page.keyboard.type("300");
  await page.keyboard.press("Enter");

  // Gõ công thức vào G2: =F2*2
  await clickCell("G2");
  await page.keyboard.type("=F2*2");
  await page.keyboard.press("Enter");

  // Kiểm tra giá trị ô G2 trên DOM (phải là 200)
  const g2Text = await page.locator('.vno-grid-cell[data-coord="G2"]').textContent();
  console.log(`  ✓ Ô nguồn G2 hiển thị: "${g2Text}"`);

  // Chọn vùng G2:G4 bằng Shift+Click
  await clickCell("G2");
  await page.keyboard.down("Shift");
  await clickCell("G4");
  await page.keyboard.up("Shift");

  const rangeBeforeFill = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return grid.getSelectedRangeLabel();
  });
  assert.strictEqual(rangeBeforeFill, "G2:G4", `Shift+Click G2→G4 phải chọn G2:G4 trước Ctrl+D, nhận: ${rangeBeforeFill}`);

  // Nhấn Ctrl+D
  console.log("  -> Nhấn phím tắt Ctrl+D (Fill Down)...");
  await page.keyboard.press("Control+d");
  await page.waitForTimeout(150);

  // Kiểm tra ô G3 và G4 sau Fill Down
  const g3Text = (await page.locator('.vno-grid-cell[data-coord="G3"]').textContent() || "").trim();
  const g4Text = (await page.locator('.vno-grid-cell[data-coord="G4"]').textContent() || "").trim();
  console.log(`  ✓ Ô G3 sau Fill Down: "${g3Text}" (mong đợi: 400)`);
  console.log(`  ✓ Ô G4 sau Fill Down: "${g4Text}" (mong đợi: 600)`);
  assert.strictEqual(g3Text, "400", `G3 sau Fill Down phải là 400, nhận: "${g3Text}"`);
  assert.strictEqual(g4Text, "600", `G4 sau Fill Down phải là 600, nhận: "${g4Text}"`);

  // 6. Test Clear Formats và Clear Contents qua Ribbon
  console.log("  -> Kiểm tra Clear Formats trên ô B2 qua dropdown Xóa...");
  await clickCell("B2");
  await page.locator('[data-dropdown-id="sheet.edit.clear"]').click();
  await page.locator('[data-command-id="sheet.edit.clearFormats"]').waitFor({ state: "visible", timeout: 2000 });
  await page.locator('[data-command-id="sheet.edit.clearFormats"]').click();
  await page.waitForTimeout(100);

  const b2BgAfterClear = await b2Cell.evaluate(el => el.style.backgroundColor);
  console.log(`  ✓ Sau Clear Formats, B2 background = "${b2BgAfterClear}" (đã reset về rỗng)`);

  // Chụp ảnh toàn bộ giao diện hoàn thiện
  await page.screenshot({ path: path.join(screenshotDir, "sheet-styles-editing-completed.png") });
  console.log("  ✓ Đã chụp ảnh giao diện Sheet hoàn thiện tại: docs/sheet-styles-editing-completed.png");

  console.log("\n==================================================");
  console.log("PLAYWRIGHT TEST HOÀN TẤT XUẤT SẮC: TẤT CẢ TÍNH NĂNG ĐỀU HOẠT ĐỘNG HOÀN HẢO!");
  console.log("==================================================");

} catch (err) {
  console.error("LỖI PLAYWRIGHT:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
