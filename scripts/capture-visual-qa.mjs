import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8990;
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const outDir = path.resolve(root, "docs/screenshots/visual-qa");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("Page error:", err.message));

  for (const theme of ["light", "dark"]) {
    console.log(`\n=== Chạy kiểm tra theme: ${theme} ===`);

    // --- 1. VN SHEET ---
    await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    // Apply theme
    await page.evaluate(async (t) => {
      document.documentElement.setAttribute("data-theme", t);
      const { themeManager } = await import("/platform/theme/theme-manager.js");
      if (themeManager) themeManager.setTheme(t);
    }, theme);
    await page.waitForTimeout(200);

    // Fill sample data into grid
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const grid = globalUnoBridge.activeDocument.grid;
      grid.cellsData.clear();
      const sample = [
        ["STT", "Họ và tên", "Chức vụ", "Phòng ban", "Lương cơ bản", "Hệ số", "Thực lĩnh"],
        [1, "Nguyễn Văn An", "Trưởng phòng", "Kế hoạch", 15000000, 1.5, 22500000],
        [2, "Trần Thị Bình", "Chuyên viên", "Kế toán", 12000000, 1.2, 14400000],
        [3, "Lê Hoàng Cúc", "Nhân viên", "Kỹ thuật", 10000000, 1.0, 10000000],
        [4, "Phạm Minh Dũng", "Phó phòng", "Kinh doanh", 14000000, 1.3, 18200000],
        [5, "Hoàng Lan Em", "Chuyên viên", "Nhân sự", 11000000, 1.1, 12100000],
        [6, "Vũ Đức Giang", "Kỹ sư", "Kỹ thuật", 13000000, 1.25, 16250000]
      ];
      const cols = ["A", "B", "C", "D", "E", "F", "G"];
      for (let r = 0; r < sample.length; r++) {
        for (let c = 0; c < sample[r].length; c++) {
          grid.setCellValue(cols[c], r + 1, sample[r][c], false);
        }
      }
      grid.selectCell("C", 3);
    });
    await page.waitForTimeout(200);

    // Screenshot grid with data
    const gridArea = page.locator(".vno-grid-viewport");
    if (await gridArea.count() > 0) {
      await gridArea.first().screenshot({ path: path.join(outDir, `sheet-grid-${theme}.png`) });
    }
    await page.screenshot({ path: path.join(outDir, `sheet-full-${theme}.png`) });

    // Open View tab -> Open Freeze Panes dropdown
    await page.locator("#vno-ribbon-tab-view").click();
    await page.waitForTimeout(200);
    await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
    const freezeMenu = page.locator(".vno-ribbon-dropdown-menu");
    await freezeMenu.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);

    // Screenshot dropdown menu
    await freezeMenu.screenshot({ path: path.join(outDir, `sheet-freeze-dropdown-${theme}.png`) });
    await page.screenshot({ path: path.join(outDir, `sheet-freeze-context-${theme}.png`) });

    // Click "Cố định hàng trên cùng"
    await freezeMenu.locator('[data-command-id="sheet.view.freezeTopRow"]').click();
    await page.waitForTimeout(200);

    // Re-open Freeze dropdown to verify checked state
    await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
    const freezeMenuChecked = page.locator(".vno-ribbon-dropdown-menu");
    await freezeMenuChecked.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);
    await freezeMenuChecked.screenshot({ path: path.join(outDir, `sheet-freeze-checked-${theme}.png`) });

    // Close menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Screenshot grid with freeze line
    if (await gridArea.count() > 0) {
      await gridArea.first().screenshot({ path: path.join(outDir, `sheet-grid-frozen-${theme}.png`) });
    }

    // --- 2. VN SLIDES ---
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
    await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
    await page.waitForTimeout(250);

    // Apply theme
    await page.evaluate(async (t) => {
      document.documentElement.setAttribute("data-theme", t);
      const { themeManager } = await import("/platform/theme/theme-manager.js");
      if (themeManager) themeManager.setTheme(t);
    }, theme);
    await page.waitForTimeout(200);

    // Create shape and select it
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.slides[canvas.currentSlideIndex].shapes = [
        { id: "s1", type: "rect", x: 80, y: 80, w: 260, h: 140, color: "#2563eb", text: "Văn bản mẫu kiểm tra thiết kế", textVAlign: "middle", textDirection: "horizontal" }
      ];
      canvas.setSelectedShapes(["s1"]);
      canvas._renderShapesLayer();
      if (canvas._syncCommandStates) canvas._syncCommandStates();
    });
    await page.waitForTimeout(200);

    // Check Căn lề văn bản (slides.text.vAlign) dropdown
    await page.locator('[data-dropdown-id="slides.text.vAlign"]').click();
    let slidesMenu = page.locator(".vno-ribbon-dropdown-menu");
    await slidesMenu.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);

    await slidesMenu.screenshot({ path: path.join(outDir, `slides-valign-dropdown-${theme}.png`) });
    await page.screenshot({ path: path.join(outDir, `slides-valign-context-${theme}.png`) });

    // Select "Căn lề trên"
    await slidesMenu.locator('[data-command-id="slides.text.vAlignTop"]').click();
    await page.waitForTimeout(200);

    // Re-open Căn lề văn bản dropdown to see checked state
    await page.locator('[data-dropdown-id="slides.text.vAlign"]').click();
    slidesMenu = page.locator(".vno-ribbon-dropdown-menu");
    await slidesMenu.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);

    await slidesMenu.screenshot({ path: path.join(outDir, `slides-valign-checked-${theme}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Check Hướng văn bản (slides.text.direction) dropdown
    await page.locator('[data-dropdown-id="slides.text.direction"]').click();
    slidesMenu = page.locator(".vno-ribbon-dropdown-menu");
    await slidesMenu.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);

    await slidesMenu.screenshot({ path: path.join(outDir, `slides-direction-dropdown-${theme}.png`) });
    await page.screenshot({ path: path.join(outDir, `slides-direction-context-${theme}.png`) });

    // Select "Xoay chữ 90°"
    await slidesMenu.locator('[data-command-id="slides.text.directionVertical"]').click();
    await page.waitForTimeout(200);

    // Re-open Hướng văn bản dropdown to see checked state
    await page.locator('[data-dropdown-id="slides.text.direction"]').click();
    slidesMenu = page.locator(".vno-ribbon-dropdown-menu");
    await slidesMenu.waitFor({ state: "visible", timeout: 3000 });
    await page.waitForTimeout(100);

    await slidesMenu.screenshot({ path: path.join(outDir, `slides-direction-checked-${theme}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }

  console.log("Toàn bộ screenshot đã được chụp và lưu vào docs/screenshots/visual-qa/");
} finally {
  if (browser) await browser.close();
  server.close();
}
