/**
 * VN Office — Dark Mode Theme Live Playwright Test
 * Tests:
 * 1. Default light theme rendering and theme toggle button presence in topbar
 * 2. Live toggle to Dark Mode: data-theme="dark", localStorage persistence, icon swap
 * 3. Computed CSS token styling across Writer, Sheet, Slides (surfaces, headers, canvas, borders)
 * 4. High-resolution screenshots of Writer, Sheet, Slides in both Dark and Light modes
 * 5. Page reload persistence (retains dark mode from localStorage)
 * 6. Live toggle back to Light Mode and command bus integration
 *
 * Strictly adheres to safety rules: Playwright / Edge browser only. No SendKeys or OS automation.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const screenshotsDir = path.join(root, "docs", "screenshots");
const port = Number(process.env.VNO_THEME_TEST_PORT || 8798);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

fs.mkdirSync(screenshotsDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204).end();
    return;
  }
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.warn(`[HTTP 404] ${req.url}`);
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`[HTTP] Server listening on http://127.0.0.1:${port}`);

let browser;
let failures = 0;

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    locale: "vi-VN"
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", err => pageErrors.push(err.message));
  page.on("console", msg => {
    if (msg.type() === "error") {
      pageErrors.push(msg.text());
    }
  });

  // Ensure clean initial state for first run without clearing on reload
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("vno-test-initialized")) {
      sessionStorage.setItem("vno-test-initialized", "true");
      localStorage.removeItem("vno-theme");
      localStorage.setItem("vno-locale", "vi");
    }
  });

  console.log("\n▶ Test 1: Khởi động VN Office ở chế độ Mặc định (Light Mode)");
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator('.vno-shell[data-app="writer"]').waitFor();

  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(!initialTheme || initialTheme === "light", `Giao diện ban đầu phải là light, nhận được: ${initialTheme}`);
  console.log("  [PASS] data-theme ban đầu là null/light");

  const toggleBtn = page.locator("#vno-toggle-theme-btn");
  expect(await toggleBtn.count() === 1, "Nút chuyển đổi theme #vno-toggle-theme-btn phải hiển thị trên thanh công cụ");
  console.log("  [PASS] Nút toggle theme hiển thị trên thanh công cụ topbar");

  // Writer Light Screenshot
  const lightWriterPath = path.join(screenshotsDir, "light-mode-writer-home.png");
  await page.screenshot({ path: lightWriterPath });
  console.log(`  [PASS] Đã chụp ảnh Writer Light Mode: ${lightWriterPath}`);

  console.log("\n▶ Test 2: Bấm nút Toggle Theme để chuyển sang Dark Mode");
  await toggleBtn.click();
  await page.waitForTimeout(300);

  const darkThemeAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(darkThemeAttr === "dark", `data-theme phải là 'dark', nhận được: ${darkThemeAttr}`);
  console.log("  [PASS] documentElement có data-theme=\"dark\"");

  const storedTheme = await page.evaluate(() => localStorage.getItem("vno-theme"));
  expect(storedTheme === "dark", `localStorage vno-theme phải là 'dark', nhận được: ${storedTheme}`);
  console.log("  [PASS] localStorage.getItem(\"vno-theme\") lưu giá trị \"dark\"");

  // Kiểm tra computed styles của Writer trong Dark Mode
  const writerStyles = await page.evaluate(() => {
    const topbar = document.querySelector(".vno-topbar");
    const ribbon = document.querySelector(".vno-ribbon");
    const pageEl = document.querySelector(".vno-writer-page");
    return {
      topbarBg: window.getComputedStyle(topbar).backgroundColor,
      ribbonBg: window.getComputedStyle(ribbon).backgroundColor,
      pageBg: pageEl ? window.getComputedStyle(pageEl).backgroundColor : null,
      textColor: pageEl ? window.getComputedStyle(pageEl).color : null
    };
  });
  console.log(`  Writer Dark Styles: Topbar=${writerStyles.topbarBg}, Ribbon=${writerStyles.ribbonBg}, Page=${writerStyles.pageBg}, Text=${writerStyles.textColor}`);
  // RGB(30, 30, 30) = #1e1e1e, RGB(37, 37, 38) = #252526
  expect(writerStyles.ribbonBg === "rgb(37, 37, 38)", `Ribbon background phải là #252526, nhận được: ${writerStyles.ribbonBg}`);
  expect(writerStyles.pageBg === "rgb(30, 30, 30)", `Writer page background phải là #1e1e1e, nhận được: ${writerStyles.pageBg}`);
  console.log("  [PASS] Computed styles của Writer khớp chính xác bảng màu Dark Mode");

  // Writer Dark Screenshot
  const darkWriterPath = path.join(screenshotsDir, "dark-mode-writer-home.png");
  await page.screenshot({ path: darkWriterPath });
  console.log(`  [PASS] Đã chụp ảnh Writer Dark Mode: ${darkWriterPath}`);

  console.log("\n▶ Test 3: Chuyển sang VN Sheet trong Dark Mode");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await page.waitForTimeout(400);

  const sheetStyles = await page.evaluate(() => {
    const formulaBar = document.querySelector(".vno-formula-bar");
    const colHeader = document.querySelector(".vno-col-header");
    const gridViewport = document.querySelector(".vno-grid-viewport");
    return {
      formulaBarBg: formulaBar ? window.getComputedStyle(formulaBar).backgroundColor : null,
      colHeaderBg: colHeader ? window.getComputedStyle(colHeader).backgroundColor : null,
      gridBg: gridViewport ? window.getComputedStyle(gridViewport).backgroundColor : null
    };
  });
  console.log(`  Sheet Dark Styles: FormulaBar=${sheetStyles.formulaBarBg}, ColHeader=${sheetStyles.colHeaderBg}, Grid=${sheetStyles.gridBg}`);
  expect(sheetStyles.formulaBarBg === "rgb(31, 31, 31)", `Formula bar background phải là #1f1f1f (rgb(31, 31, 31)), nhận được: ${sheetStyles.formulaBarBg}`);
  expect(sheetStyles.colHeaderBg === "rgb(31, 31, 31)", `Col header background phải là #1f1f1f (rgb(31, 31, 31)), nhận được: ${sheetStyles.colHeaderBg}`);
  expect(sheetStyles.gridBg === "rgb(30, 30, 30)", `Grid background phải là #1e1e1e (rgb(30, 30, 30)), nhận được: ${sheetStyles.gridBg}`);
  console.log("  [PASS] VN Sheet hiển thị đúng token Dark Mode cho thanh công thức, tiêu đề cột và lưới");

  // Sheet Dark Screenshot
  const darkSheetPath = path.join(screenshotsDir, "dark-mode-sheet-home.png");
  await page.screenshot({ path: darkSheetPath });
  console.log(`  [PASS] Đã chụp ảnh Sheet Dark Mode: ${darkSheetPath}`);

  console.log("\n▶ Test 4: Chuyển sang VN Slides trong Dark Mode");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();
  await page.waitForTimeout(400);

  const slidesStyles = await page.evaluate(() => {
    const studio = document.querySelector(".vno-slides-studio");
    const stage = document.querySelector(".vno-slide-stage");
    const navigator = document.querySelector(".vno-slide-navigator");
    const canvas = document.querySelector(".vno-slide-canvas");
    return {
      studioBg: studio ? window.getComputedStyle(studio).backgroundColor : null,
      stageBg: stage ? window.getComputedStyle(stage).backgroundColor : null,
      navBg: navigator ? window.getComputedStyle(navigator).backgroundColor : null,
      canvasBg: canvas ? window.getComputedStyle(canvas).backgroundColor : null
    };
  });
  console.log(`  Slides Dark Styles: Studio=${slidesStyles.studioBg}, Stage=${slidesStyles.stageBg}, Nav=${slidesStyles.navBg}, Canvas=${slidesStyles.canvasBg}`);
  expect(slidesStyles.studioBg === "rgb(24, 24, 24)", `Slides studio background phải là #181818 (rgb(24, 24, 24)), nhận được: ${slidesStyles.studioBg}`);
  expect(slidesStyles.stageBg === "rgb(24, 24, 24)", `Slides stage backdrop phải là #181818 (rgb(24, 24, 24)), nhận được: ${slidesStyles.stageBg}`);
  expect(slidesStyles.navBg === "rgb(31, 31, 31)", `Slides navigator background phải là #1f1f1f (rgb(31, 31, 31)), nhận được: ${slidesStyles.navBg}`);
  expect(slidesStyles.canvasBg === "rgb(248, 250, 252)", `Slides canvas giữ nguyên màu thiết kế slide master (#f8fafc), nhận được: ${slidesStyles.canvasBg}`);
  console.log("  [PASS] VN Slides hiển thị đúng token Dark Mode cho studio, stage, navigator và bảo toàn màu slide master");

  // Slides Dark Screenshot
  const darkSlidesPath = path.join(screenshotsDir, "dark-mode-slides-home.png");
  await page.screenshot({ path: darkSlidesPath });
  console.log(`  [PASS] Đã chụp ảnh Slides Dark Mode: ${darkSlidesPath}`);

  console.log("\n▶ Test 5: Reload trang để xác thực tính bền vững (localStorage Persistence)");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.vno-shell').waitFor();
  const themeAfterReload = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(themeAfterReload === "dark", `Sau khi reload, data-theme vẫn phải là dark, nhận được: ${themeAfterReload}`);
  console.log("  [PASS] Trạng thái Dark Mode được bảo toàn thành công sau khi reload trang");

  console.log("\n▶ Test 6: Bấm Toggle Theme để quay lại Light Mode");
  await page.locator("#vno-toggle-theme-btn").click();
  await page.waitForTimeout(300);
  const themeBackToLight = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(themeBackToLight === "light", `data-theme phải trở lại 'light', nhận được: ${themeBackToLight}`);
  const storedThemeLight = await page.evaluate(() => localStorage.getItem("vno-theme"));
  expect(storedThemeLight === "light", `localStorage vno-theme phải là 'light', nhận được: ${storedThemeLight}`);
  console.log("  [PASS] Chuyển đổi thành công về Light Mode và cập nhật localStorage");

  console.log("\n▶ Test 7: Chụp ảnh Sheet và Slides ở Light Mode để đối chiếu");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await page.waitForTimeout(300);
  const lightSheetPath = path.join(screenshotsDir, "light-mode-sheet-home.png");
  await page.screenshot({ path: lightSheetPath });
  console.log(`  [PASS] Đã chụp ảnh Sheet Light Mode: ${lightSheetPath}`);

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();
  await page.waitForTimeout(300);
  const lightSlidesPath = path.join(screenshotsDir, "light-mode-slides-home.png");
  await page.screenshot({ path: lightSlidesPath });
  console.log(`  [PASS] Đã chụp ảnh Slides Light Mode: ${lightSlidesPath}`);

  console.log("\n▶ Test 8: Lệnh common.view.toggleTheme qua Command Bus");
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("common.view.toggleTheme");
  });
  await page.waitForTimeout(200);
  const themeBusDark = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(themeBusDark === "dark", `Gọi command bus phải toggle sang dark, nhận được: ${themeBusDark}`);
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("common.view.toggleTheme");
  });
  await page.waitForTimeout(200);
  const themeBusLight = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(themeBusLight === "light", `Gọi command bus lần 2 phải toggle về light, nhận được: ${themeBusLight}`);
  console.log("  [PASS] Command bus 'common.view.toggleTheme' hoạt động chính xác cả 2 chiều");

  expect(pageErrors.length === 0, `Phát hiện lỗi console/page: ${pageErrors.join(", ")}`);
  console.log("  [PASS] Không có bất kỳ lỗi console hoặc runtime exception nào");

} catch (err) {
  failures++;
  console.error(`\n❌ THẤT BẠI: ${err.message}`);
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise(resolve => server.close(resolve));
  console.log("[HTTP] Server stopped.");
}

if (failures > 0) {
  process.exit(1);
} else {
  console.log("\n==================================================");
  console.log("TẤT CẢ CÁC BÀI KIỂM TRA DARK MODE ĐỀU ĐẠT CHUẨN!");
  console.log("==================================================");
  process.exit(0);
}
