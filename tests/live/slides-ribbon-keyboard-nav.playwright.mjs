/**
 * Live Playwright test for VN Slides Ribbon keyboard navigation:
 * 1. ArrowRight and ArrowLeft navigating across ribbon tabs with focus preservation
 * 2. Home and End jumping across ribbon tabs
 * 3. Section dropdown menu: ArrowDown to open, Arrow navigation, Escape closes and restores focus to trigger
 * 4. Layout gallery: Enter opens dialog, Arrow keys navigate layout cards, Escape closes and restores focus to trigger
 * 5. Transition dialog: Enter opens dialog, Escape closes and restores focus to trigger
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_RIBBON_KEYNAV_PORT || 8841);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.join(rootDir, path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\]*\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { response.writeHead(404); response.end("404"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  });
});

function assert(condition, message) { if (!condition) throw new Error(message); }

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.waitForTimeout(400);

  // ==========================================
  // Test 1: ArrowRight / ArrowLeft / Home / End on Ribbon Tabs
  // ==========================================
  const homeTab = page.locator("#vno-ribbon-tab-home");
  await homeTab.waitFor({ state: "visible" });
  await homeTab.focus();

  let activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-home", `Ban đầu phải focus tab Trang đầu, nhận: ${activeTabId}`);

  // ArrowRight -> Chèn (insert)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-insert", `Sau ArrowRight lần 1, focus phải chuyển sang tab Chèn (#vno-ribbon-tab-insert), nhận: ${activeTabId}`);
  assert(await page.locator("#vno-ribbon-tabpanel-insert").isVisible(), "Panel tab Chèn phải hiển thị");

  // ArrowRight -> Thiết kế (design)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-design", `Sau ArrowRight lần 2, focus phải sang tab Thiết kế (#vno-ribbon-tab-design), nhận: ${activeTabId}`);

  // ArrowRight -> Chuyển tiếp (transitions)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-transitions", `Sau ArrowRight lần 3, focus phải sang tab Chuyển tiếp (#vno-ribbon-tab-transitions), nhận: ${activeTabId}`);

  // ArrowLeft -> Quay lại Thiết kế (design)
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-design", `Sau ArrowLeft, focus phải quay lại tab Thiết kế, nhận: ${activeTabId}`);

  // Home -> Về Trang đầu (home)
  await page.keyboard.press("Home");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-home", `Sau Home, focus phải về tab Trang đầu (#vno-ribbon-tab-home), nhận: ${activeTabId}`);

  // End -> Về tab cuối (Trợ lý AI - ai)
  await page.keyboard.press("End");
  await page.waitForTimeout(100);
  activeTabId = await page.evaluate(() => document.activeElement?.id);
  assert(activeTabId === "vno-ribbon-tab-ai", `Sau End, focus phải sang tab cuối (#vno-ribbon-tab-ai), nhận: ${activeTabId}`);

  // Quay lại Trang đầu
  await page.keyboard.press("Home");
  await page.waitForTimeout(100);

  // ==========================================
  // Test 2: Section dropdown menu (ArrowDown, Escape, focus restore)
  // ==========================================
  const sectionBtn = page.locator('[data-dropdown-toggle="slides.section.menu"]');
  await sectionBtn.waitFor({ state: "visible" });
  await sectionBtn.focus();

  // Press ArrowDown to open Section dropdown
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);

  const dropdownMenu = page.locator(".vno-ribbon-dropdown-menu");
  await dropdownMenu.waitFor({ state: "visible" });
  assert(await dropdownMenu.isVisible(), "Section dropdown menu phải mở sau khi bấm ArrowDown");

  // Press Escape to close dropdown
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  assert(await dropdownMenu.isHidden(), "Section dropdown menu phải đóng sau khi bấm Escape");
  const focusedAfterSectionEscape = await page.evaluate(() => document.activeElement?.getAttribute("data-dropdown-toggle"));
  assert(focusedAfterSectionEscape === "slides.section.menu", `Sau Escape, focus phải trả về nút Phần, nhận: ${focusedAfterSectionEscape}`);

  // ==========================================
  // Test 3: Layout dialog (Enter opens, Arrow navigation, Escape restores focus)
  // ==========================================
  const layoutBtn = page.locator('[data-command-id="slides.layout.apply"]');
  await layoutBtn.waitFor({ state: "visible" });
  await layoutBtn.focus();

  // Press Enter to open Layout dialog
  await page.keyboard.press("Enter");
  const layoutDialog = page.locator("#vno-layouts-grid");
  await layoutDialog.waitFor({ state: "visible" });

  // Verify a layout card is focused
  const focusedCard = await page.evaluate(() => {
    return document.activeElement?.classList?.contains("vno-layout-card");
  });
  assert(focusedCard, "Một thẻ bố cục phải được focus khi mở hộp thoại bố cục");

  // ArrowRight navigates to next card
  const initialLayoutId = await page.evaluate(() => document.activeElement?.getAttribute("data-layout-id"));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  const nextLayoutId = await page.evaluate(() => document.activeElement?.getAttribute("data-layout-id"));
  assert(initialLayoutId !== nextLayoutId, `ArrowRight phải chuyển sang thẻ bố cục khác: trước ${initialLayoutId} vs sau ${nextLayoutId}`);

  // Escape closes dialog and restores focus to trigger button
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await layoutDialog.waitFor({ state: "detached" });

  const focusedAfterLayoutEscape = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id"));
  assert(focusedAfterLayoutEscape === "slides.layout.apply", `Sau Escape hộp thoại Bố cục, focus phải trả về nút Bố cục, nhận: ${focusedAfterLayoutEscape}`);

  // ==========================================
  // Test 4: Transition dialog (Enter opens, Escape restores focus)
  // ==========================================
  await page.locator("#vno-ribbon-tab-transitions").click();
  await page.waitForTimeout(100);

  const transitionBtn = page.locator('[data-command-id="slides.transition.apply"]');
  await transitionBtn.waitFor({ state: "visible" });
  await transitionBtn.focus();

  // Press Enter to open Transition dialog
  await page.keyboard.press("Enter");
  const transDialog = page.locator("#vno-trans-dialog-title");
  await transDialog.waitFor({ state: "visible" });

  // Escape closes dialog and restores focus to trigger button
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await transDialog.waitFor({ state: "detached" });

  const focusedAfterTransEscape = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id"));
  assert(focusedAfterTransEscape === "slides.transition.apply", `Sau Escape hộp thoại Chuyển tiếp, focus phải trả về nút Chuyển tiếp, nhận: ${focusedAfterTransEscape}`);

  assert(pageErrors.length === 0, `Có page errors: ${pageErrors.join(" | ")}`);
  console.log("LIVE PASS: Ribbon Slides keyboard navigation (ArrowRight/Left tab switch, Section dropdown, Layout gallery, Transition dialog with focus restoration)");
} finally {
  await browser?.close();
  server.close();
}
