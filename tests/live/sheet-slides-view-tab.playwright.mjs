import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_SLIDES_VIEW_PORT || 8794);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  const ext = path.extname(file);
  const contentType = ext === ".css" ? "text/css" : ext === ".js" || ext === ".mjs" ? "text/javascript" : ext === ".svg" ? "image/svg+xml" : "text/html";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log((condition ? "PASS" : "FAIL") + "\t" + label + (detail ? " — " + detail : ""));
  if (!condition) failures.push(label + ": " + detail);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vno-writer-page");

  // ==========================================
  // 1. KIỂM THỬ LIVE: VN SHEET VIEW TAB
  // ==========================================
  console.log("\n--- KIỂM TRA LIVE: VN SHEET VIEW TAB ---");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ state: "visible", timeout: 10000 });

  // Chuyển sang ribbon tab Chế độ xem
  await page.locator(".vno-ribbon-tab").filter({ hasText: /^Chế độ xem$/ }).click();

  const sheetResults = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument?.grid;
    const container = grid?.container;
    const res = {};

    // Page Break Preview
    res.pbpResult = await globalCommandBus.execute("sheet.view.pageBreakPreview");
    res.pbpClass = container?.classList?.contains("vno-sheet-page-break-preview");
    const watermark = container?.querySelector(".vno-sheet-page-break-watermark");
    res.watermarkText = watermark?.textContent?.trim();
    res.watermarkVisible = watermark && getComputedStyle(watermark).display !== "none";

    // Page Layout View
    res.plResult = await globalCommandBus.execute("sheet.view.pageLayout");
    res.plClass = container?.classList?.contains("vno-sheet-page-layout");
    res.pbpCleared = !container?.classList?.contains("vno-sheet-page-break-preview");
    const headerBand = container?.querySelector(".vno-sheet-page-header-band");
    res.headerBandExists = Boolean(headerBand);

    // Normal View
    res.normalResult = await globalCommandBus.execute("sheet.view.normal");
    res.normalClass = !container?.classList?.contains("vno-sheet-page-layout") && !container?.classList?.contains("vno-sheet-page-break-preview");

    // Formula Bar Toggle
    const formulaBar = grid?.formulaBarEl || container?.querySelector(".vno-formula-bar");
    await globalCommandBus.execute("sheet.view.formulaBar");
    res.formulaBarHidden = formulaBar && getComputedStyle(formulaBar).display === "none";
    await globalCommandBus.execute("sheet.view.formulaBar");
    res.formulaBarShown = formulaBar && getComputedStyle(formulaBar).display !== "none";

    // Zoom To Selection
    grid.selectCell("B", 3);
    grid.selectedRange = { start: { c: "B", r: 3 }, end: { c: "D", r: 6 } };
    res.zoomToSelectionResult = await globalCommandBus.execute("sheet.view.zoomToSelection");
    res.zoomLevelAfterSelection = grid.zoomLevel;

    // Zoom Reset
    res.zoomResetResult = await globalCommandBus.execute("sheet.view.zoomReset");
    res.zoomLevelReset = grid.zoomLevel;

    // New Window (mock)
    let openedUrl = null;
    const origOpen = window.open;
    window.open = (url) => { openedUrl = url; return { opener: null }; };
    res.newWindowResult = await globalCommandBus.execute("sheet.view.newWindow");
    window.open = origOpen;
    res.newWindowOpened = openedUrl !== null;

    return res;
  });

  assert(sheetResults.pbpResult === "pageBreakPreview" && sheetResults.pbpClass, "Sheet: Chuyển sang Page Break Preview thành công");
  assert(sheetResults.watermarkText === "Trang 1" && sheetResults.watermarkVisible, "Sheet: Watermark 'Trang 1' hiển thị rõ ràng");
  assert(sheetResults.plResult === "pageLayout" && sheetResults.plClass && sheetResults.headerBandExists, "Sheet: Chuyển sang Page Layout hiển thị thanh Header");
  assert(sheetResults.normalResult === "normal" && sheetResults.normalClass, "Sheet: Khôi phục chế độ Normal View");
  assert(sheetResults.formulaBarHidden && sheetResults.formulaBarShown, "Sheet: Bật/tắt thanh công thức (Formula Bar) hoạt động chuẩn");
  assert(typeof sheetResults.zoomToSelectionResult === "number" && sheetResults.zoomToSelectionResult > 0, "Sheet: Zoom to Selection tính toán scale tự động");
  assert(sheetResults.zoomLevelReset === 1.0, "Sheet: Zoom Reset về 100%");
  assert(sheetResults.newWindowResult === true && sheetResults.newWindowOpened, "Sheet: New Window mở cửa sổ mới");

  // ==========================================
  // 2. KIỂM THỬ LIVE: VN SLIDES VIEW TAB
  // ==========================================
  console.log("\n--- KIỂM TRA LIVE: VN SLIDES VIEW TAB ---");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ state: "visible", timeout: 10000 });

  // Chuyển sang ribbon tab Chế độ xem
  await page.locator(".vno-ribbon-tab").filter({ hasText: /^Chế độ xem$/ }).click();

  const slidesResults = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument?.canvas;
    const res = {};

    // Ruler Toggle
    res.rulerOn = await globalCommandBus.execute("slides.view.ruler");
    const rulerH = canvas?.rulerHEl;
    const rulerV = canvas?.rulerVEl;
    res.rulerHVisible = rulerH && getComputedStyle(rulerH).display !== "none";
    res.rulerVVisible = rulerV && getComputedStyle(rulerV).display !== "none";
    res.rulerHSvg = rulerH?.querySelector("svg") !== null;
    res.rulerVSvg = rulerV?.querySelector("svg") !== null;

    res.rulerOff = await globalCommandBus.execute("slides.view.ruler");
    res.rulerOffHidden = rulerH && getComputedStyle(rulerH).display === "none";

    // Gridlines Toggle
    res.gridlinesOn = await globalCommandBus.execute("slides.view.gridlines");
    const gridLayer = canvas?.gridlinesLayer;
    res.gridlinesVisible = gridLayer && getComputedStyle(gridLayer).display !== "none";
    res.gridlinesOff = await globalCommandBus.execute("slides.view.gridlines");
    res.gridlinesHidden = gridLayer && getComputedStyle(gridLayer).display === "none";

    // Guides Toggle
    res.guidesOn = await globalCommandBus.execute("slides.view.guides");
    const guidesLayer = canvas?.guidesLayer;
    res.guidesVisible = guidesLayer && getComputedStyle(guidesLayer).display !== "none";
    const guideLines = guidesLayer?.querySelectorAll(".vno-slide-guide");
    res.guideCount = guideLines?.length || 0;
    res.guidesOff = await globalCommandBus.execute("slides.view.guides");
    res.guidesHidden = guidesLayer && getComputedStyle(guidesLayer).display === "none";

    // Zoom In, Out, Reset, Fit To Window
    res.zoomInResult = await globalCommandBus.execute("slides.view.zoomIn");
    res.zoomInLevel = canvas.zoomLevel;
    res.zoomResetResult = await globalCommandBus.execute("slides.view.zoomReset");
    res.zoomResetLevel = canvas.zoomLevel;
    res.fitResult = await globalCommandBus.execute("slides.view.fitToWindow");
    res.fitLevel = canvas.zoomLevel;

    // Slide Sorter
    res.sorterResult = await globalCommandBus.execute("slides.view.slideSorter");
    res.sorterOverlay = Boolean(document.querySelector(".vno-slide-sorter-overlay"));
    await globalCommandBus.execute("slides.view.normal");
    res.sorterClosed = !document.querySelector(".vno-slide-sorter-overlay");

    // Reading View
    res.readingResult = await globalCommandBus.execute("slides.view.reading");
    const readingModeEl = document.querySelector(".vno-slides-reading-mode");
    res.readingModeExists = Boolean(readingModeEl);
    const counter = readingModeEl?.querySelector("#vno-reading-counter");
    res.counterText = counter?.textContent?.trim();

    return res;
  });

  assert(slidesResults.rulerOn === true && slidesResults.rulerHVisible && slidesResults.rulerHSvg, "Slides: Thước kẻ ngang (Ruler H) hiển thị với SVG vạch chia");
  assert(slidesResults.rulerVVisible && slidesResults.rulerVSvg, "Slides: Thước kẻ dọc (Ruler V) hiển thị với SVG vạch chia");
  assert(slidesResults.rulerOff === false && slidesResults.rulerOffHidden, "Slides: Tắt thước kẻ ẩn chính xác element");
  assert(slidesResults.gridlinesOn === true && slidesResults.gridlinesVisible, "Slides: Bật lưới căn chỉnh 20px (Gridlines)");
  assert(slidesResults.gridlinesOff === false && slidesResults.gridlinesHidden, "Slides: Tắt lưới căn chỉnh");
  assert(slidesResults.guidesOn === true && slidesResults.guidesVisible && slidesResults.guideCount >= 2, "Slides: Bật đường gióng (Guides) có ít nhất 2 đường ngang/dọc");
  assert(slidesResults.zoomInLevel > 1.0 && slidesResults.zoomResetLevel === 1.0, "Slides: Zoom In và Zoom Reset 100%");
  assert(typeof slidesResults.fitResult === "number" && slidesResults.fitResult > 0, "Slides: Fit to Window tính toán scale vừa khít khung làm việc");
  assert(slidesResults.sorterOverlay && slidesResults.sorterClosed, "Slides: Chuyển đổi Slide Sorter View và quay lại Normal");
  assert(slidesResults.readingModeExists && slidesResults.counterText.includes("Trang 1"), "Slides: Reading View mở chế độ đọc toàn màn hình với counter trang");

  // Thoát reading mode bằng phím Escape
  await page.keyboard.press("Escape");
  const escapedReading = await page.evaluate(() => !document.querySelector(".vno-slides-reading-mode"));
  assert(escapedReading, "Slides: Phím Escape đóng Reading View và trở về chế độ bình thường");

  assert(errors.length === 0, "Không có bất kỳ pageerror nào trong suốt phiên tương tác", errors.join(" | "));

  console.log("\n==================================================");
  console.log(`KẾT QUẢ LIVE PLAYWRIGHT: ${failures.length === 0 ? "TẤT CẢ ĐẠT CHUẨN (PASS)" : failures.length + " LỖI"}`);
  console.log("==================================================");
} catch (err) {
  console.error("LỖI NGOẠI LỆ TRONG PLAYWRIGHT RUNNER:", err);
  failures.push(err.message);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
