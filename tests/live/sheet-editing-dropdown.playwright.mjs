import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8893;

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

try {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    locale: "vi-VN"
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", err => consoleErrors.push(err.message));
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE TEST: SHEET EDITING DROPDOWNS (FILL & CLEAR) ===");

  await page.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="sheet"]', { timeout: 10000 });
  await page.waitForSelector(".vno-ribbon-content", { timeout: 10000 });
  await page.waitForTimeout(300);

  // 1. Đo lường kích thước Ribbon và nhóm Editing tại 1366px
  const ribbonMetrics = await page.evaluate(() => {
    const ribbon = document.querySelector(".vno-ribbon-content");
    const groups = Array.from(document.querySelectorAll(".vno-ribbon-group"));
    const editGroup = groups.find(g => g.querySelector(".vno-ribbon-group-label")?.textContent?.trim() === "Chỉnh sửa");
    return {
      ribbonScrollWidth: ribbon?.scrollWidth || 0,
      ribbonClientWidth: ribbon?.clientWidth || 0,
      overflowAmount: (ribbon?.scrollWidth || 0) - (ribbon?.clientWidth || 0),
      editGroupWidth: editGroup ? editGroup.getBoundingClientRect().width : 0
    };
  });

  console.log(`  [Đo lường 1366px] Ribbon scrollWidth = ${ribbonMetrics.ribbonScrollWidth}px, clientWidth = ${ribbonMetrics.ribbonClientWidth}px`);
  console.log(`  [Đo lường 1366px] Nhóm 'Chỉnh sửa' hiện tại = ${ribbonMetrics.editGroupWidth.toFixed(2)}px (trước: ~414.81px, giảm ~${(414.81 - ribbonMetrics.editGroupWidth).toFixed(2)}px)`);

  // 2. Xác nhận sự hiện diện của 2 dropdown button lớn "Điền" và "Xóa"
  const fillBtn = page.locator('[data-dropdown-id="sheet.edit.fill"]');
  const clearBtn = page.locator('[data-dropdown-id="sheet.edit.clear"]');

  await fillBtn.waitFor({ state: "visible", timeout: 3000 });
  await clearBtn.waitFor({ state: "visible", timeout: 3000 });

  const fillText = (await fillBtn.innerText()).trim();
  const clearText = (await clearBtn.innerText()).trim();

  if (!fillText.includes("Điền")) throw new Error(`Nút Fill nhãn sai: "${fillText}"`);
  if (!clearText.includes("Xóa")) throw new Error(`Nút Clear nhãn sai: "${clearText}"`);

  // Xác nhận có mũi tên chevronDown
  const fillArrow = fillBtn.locator("[data-dropdown-arrow]");
  const clearArrow = clearBtn.locator("[data-dropdown-arrow]");
  if (await fillArrow.count() === 0) throw new Error("Nút Điền thiếu icon mũi tên dropdown");
  if (await clearArrow.count() === 0) throw new Error("Nút Xóa thiếu icon mũi tên dropdown");
  console.log("  ✓ Đã xác nhận 2 nút lớn 'Điền' và 'Xóa' có icon vector và mũi tên thả xuống chuẩn Office");

  // Helper click cell
  async function clickCell(coord) {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(50);
  }

  // 3. Test mở dropdown Fill qua click
  console.log("  -> Mở dropdown 'Điền'...");
  await fillBtn.click();
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "visible", timeout: 2000 });

  const fillMenuItems = await page.locator(".vno-ribbon-dropdown-item").allTextContents();
  console.log("  ✓ Danh sách mục trong dropdown Điền:", fillMenuItems.map(s => s.trim().replace(/\s+/g, " ")));

  const fillDownItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.edit.fillDown"]');
  const fillRightItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.edit.fillRight"]');
  await fillDownItem.waitFor({ state: "visible", timeout: 2000 });
  await fillRightItem.waitFor({ state: "visible", timeout: 2000 });

  // Chụp ảnh menu dropdown Điền
  const screenshotDir = path.join(ROOT_DIR, "docs");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "sheet-fill-dropdown-open.png") });
  console.log("  ✓ Đã chụp ảnh Dropdown Điền tại: docs/sheet-fill-dropdown-open.png");

  // Đóng dropdown Điền sau khi chụp ảnh
  await page.keyboard.press("Escape");
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "hidden", timeout: 2000 });

  // 4. Test thực thi Fill Down qua Dropdown
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCellValue("K", 10, "VN-OFFICE", false);
    grid.selectCell("K", 10);
    grid.selectCell("K", 12, true); // range K10:K12
  });
  await page.waitForTimeout(100);

  // Mở dropdown Điền và bấm "Điền xuống"
  await fillBtn.click();
  await fillDownItem.waitFor({ state: "visible", timeout: 2000 });
  await fillDownItem.click();
  await page.waitForTimeout(100);

  // Kiểm tra menu đã đóng
  if (await page.locator(".vno-ribbon-dropdown-menu").count() !== 0) {
    throw new Error("Dropdown menu không đóng sau khi click lựa chọn");
  }

  // Kiểm tra K11 và K12 có giá trị sau Fill Down
  const k11Val = (await page.locator('.vno-grid-cell[data-coord="K11"]').textContent()).trim();
  const k12Val = (await page.locator('.vno-grid-cell[data-coord="K12"]').textContent()).trim();
  console.log(`  ✓ Fill Down qua dropdown thành công: K11 = "${k11Val}", K12 = "${k12Val}"`);
  if (k11Val !== "VN-OFFICE" || k12Val !== "VN-OFFICE") {
    throw new Error(`Fill Down không điền đúng giá trị: K11="${k11Val}", K12="${k12Val}"`);
  }

  // 5. Test thực thi Fill Right qua Dropdown
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.selectCell("K", 10);
    grid.selectCell("M", 10, true); // range K10:M10
  });
  await page.waitForTimeout(100);

  await fillBtn.click();
  await fillRightItem.waitFor({ state: "visible", timeout: 2000 });
  await fillRightItem.click();
  await page.waitForTimeout(100);

  const l10Val = (await page.locator('.vno-grid-cell[data-coord="L10"]').textContent()).trim();
  const m10Val = (await page.locator('.vno-grid-cell[data-coord="M10"]').textContent()).trim();
  console.log(`  ✓ Fill Right qua dropdown thành công: L10 = "${l10Val}", M10 = "${m10Val}"`);
  if (l10Val !== "VN-OFFICE" || m10Val !== "VN-OFFICE") {
    throw new Error(`Fill Right không điền đúng giá trị: L10="${l10Val}", M10="${m10Val}"`);
  }

  // 6. Test Dropdown Xóa (Clear All, Clear Formats, Clear Contents)
  console.log("  -> Mở dropdown 'Xóa'...");
  await clearBtn.click();
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "visible", timeout: 2000 });

  const clearAllItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.edit.clearAll"]');
  const clearFormatsItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.edit.clearFormats"]');
  const clearContentsItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.edit.clearContents"]');

  await clearAllItem.waitFor({ state: "visible", timeout: 2000 });
  await clearFormatsItem.waitFor({ state: "visible", timeout: 2000 });
  await clearContentsItem.waitFor({ state: "visible", timeout: 2000 });

  const clearMenuItems = await page.locator(".vno-ribbon-dropdown-item").allTextContents();
  console.log("  ✓ Danh sách mục trong dropdown Xóa:", clearMenuItems.map(s => s.trim().replace(/\s+/g, " ")));

  await page.screenshot({ path: path.join(screenshotDir, "sheet-clear-dropdown-open.png") });
  console.log("  ✓ Đã chụp ảnh Dropdown Xóa tại: docs/sheet-clear-dropdown-open.png");

  // Đóng dropdown bằng phím Escape
  await page.keyboard.press("Escape");
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "hidden", timeout: 2000 });
  console.log("  ✓ Phím Escape đóng dropdown thành công");

  // Áp dụng định dạng lên K10 để test Clear Formats
  await clickCell("K10");
  await page.locator('[data-command-id="sheet.cell.bold"]').click();
  await page.waitForTimeout(50);

  // Mở dropdown Xóa và click "Xóa định dạng"
  await clearBtn.click();
  await clearFormatsItem.waitFor({ state: "visible", timeout: 2000 });
  await clearFormatsItem.click();
  await page.waitForTimeout(100);

  const k10TextAfterClearFormat = (await page.locator('.vno-grid-cell[data-coord="K10"]').textContent()).trim();
  console.log(`  ✓ Sau Clear Formats, nội dung K10 vẫn còn nguyên: "${k10TextAfterClearFormat}"`);
  if (k10TextAfterClearFormat !== "VN-OFFICE") throw new Error("Clear Formats làm mất nội dung ô");

  // Mở dropdown Xóa và click "Xóa nội dung"
  await clickCell("K10");
  await clearBtn.click();
  await clearContentsItem.waitFor({ state: "visible", timeout: 2000 });
  await clearContentsItem.click();
  await page.waitForTimeout(100);

  const k10TextAfterClearContents = (await page.locator('.vno-grid-cell[data-coord="K10"]').textContent()).trim();
  console.log(`  ✓ Sau Clear Contents, ô K10 đã xóa sạch: "${k10TextAfterClearContents}"`);
  if (k10TextAfterClearContents !== "") throw new Error("Clear Contents không xóa sạch nội dung ô");

  // 7. Test Keyboard Navigation mở menu bằng phím
  console.log("  -> Kiểm tra mở dropdown qua phím mũi tên...");
  await fillBtn.focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "visible", timeout: 2000 });
  console.log("  ✓ Mở dropdown bằng phím ArrowDown thành công");

  await page.keyboard.press("Escape");
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "hidden", timeout: 2000 });
  console.log("  ✓ Đóng dropdown qua Escape thành công");

  // 8. Test giao diện tiếng Anh (i18n)
  console.log("  -> Kiểm tra đa ngôn ngữ tiếng Anh (en)...");
  await page.evaluate(() => {
    localStorage.setItem("vno-locale", "en");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="sheet"]', { timeout: 10000 });
  await page.waitForSelector(".vno-ribbon-content", { timeout: 10000 });
  await page.waitForTimeout(300);

  const fillBtnEn = page.locator('[data-dropdown-id="sheet.edit.fill"]');
  const clearBtnEn = page.locator('[data-dropdown-id="sheet.edit.clear"]');
  const fillTextEn = (await fillBtnEn.innerText()).trim();
  const clearTextEn = (await clearBtnEn.innerText()).trim();
  console.log(`  ✓ Nhãn tiếng Anh: Fill = "${fillTextEn}", Clear = "${clearTextEn}"`);
  if (!fillTextEn.includes("Fill")) throw new Error(`Nhãn EN Fill sai: ${fillTextEn}`);
  if (!clearTextEn.includes("Clear")) throw new Error(`Nhãn EN Clear sai: ${clearTextEn}`);

  await fillBtnEn.click();
  await page.waitForSelector(".vno-ribbon-dropdown-menu", { state: "visible", timeout: 2000 });
  const enFillItems = await page.locator(".vno-ribbon-dropdown-item").allTextContents();
  console.log("  ✓ Các mục menu EN Fill:", enFillItems.map(s => s.trim().replace(/\s+/g, " ")));
  await page.keyboard.press("Escape");

  // Dọn dẹp localStorage về mặc định
  await page.evaluate(() => {
    localStorage.removeItem("vno-locale");
  });

  console.log("\n==================================================");
  console.log("PLAYWRIGHT LIVE TEST DROPDOWNS HOÀN TẤT XUẤT SẮC: 100% PASS!");
  console.log("==================================================");

} catch (err) {
  console.error("LỖI PLAYWRIGHT:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
