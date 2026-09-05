/** Live Hide Slide proof on the running canvas. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_HIDE_PORT || 8827);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8"
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

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.waitForTimeout(400);

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [
      { id: 1, title: "Slide một", body: "A", layoutType: "title-content", shapes: [], comments: [], hidden: false },
      { id: 2, title: "Slide hai ẩn", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false },
      { id: 3, title: "Slide ba", body: "C", layoutType: "title-content", shapes: [], comments: [], hidden: false }
    ];
    canvas.selectSlide(1);
  });

  await page.locator("#vno-ribbon-tab-slideshow").click();
  const hideBtn = page.locator('[data-command-id="slides.slide.toggleHidden"]');
  await hideBtn.waitFor({ state: "visible" });
  await hideBtn.click();

  const hiddenAfterClick = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return !!globalUnoBridge.activeDocument.canvas.slides[1].hidden;
  });
  assert(hiddenAfterClick, "Click nút Ẩn trang chiếu trên ribbon phải đặt slide 2 hidden=true");

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.openSlideSorter();
  });

  const sorterItem = page.locator(".vno-slide-sorter-item").nth(1);
  await sorterItem.waitFor({ state: "visible" });
  const sorterClass = await sorterItem.getAttribute("class");
  assert(sorterClass.includes("is-hidden"), `Slide Sorter item 2 phải có is-hidden, class=${sorterClass}`);
  const opacity = await sorterItem.locator(".vno-slide-sorter-preview").evaluate(el => Number(getComputedStyle(el).opacity));
  assert(opacity > 0 && opacity < 0.7, `Preview slide ẩn phải mờ, opacity=${opacity}`);
  const numberDecor = await sorterItem.locator(".vno-slide-sorter-number").evaluate(el => getComputedStyle(el).textDecorationLine || getComputedStyle(el).textDecoration);
  assert(/line-through/i.test(numberDecor), `Số thứ tự slide ẩn phải gạch chéo, decoration=${numberDecor}`);
  assert(await sorterItem.locator(".vno-slide-sorter-hidden-mark").count() === 1, "Thiếu icon ẩn trên số thứ tự");

  await page.locator(".vno-slide-sorter-close").click();

  const showPath = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const show = canvas.startSlideShow(0);
    const start = { index: show.getIndex(), title: show.getTitle(), empty: show.isEmpty };
    show.next();
    const afterNext = { index: show.getIndex(), title: show.getTitle() };
    const overlayTitle = document.querySelector(".vno-slideshow-overlay h1")?.textContent || "";
    show.close();
    canvas.selectSlide(1);
    canvas.toggleCurrentSlideHidden();
    const restored = canvas.startSlideShow(0);
    restored.next();
    const afterUnhide = { index: restored.getIndex(), title: restored.getTitle() };
    restored.close();
    return { start, afterNext, overlayTitle, afterUnhide, hiddenNow: !!canvas.slides[1].hidden };
  });

  assert(showPath.start.index === 0 && showPath.start.title === "Slide một", `F5 phải bắt đầu slide 1: ${JSON.stringify(showPath.start)}`);
  assert(showPath.afterNext.index === 2 && showPath.afterNext.title === "Slide ba", `Next phải nhảy 1→3: ${JSON.stringify(showPath.afterNext)}`);
  assert(showPath.afterUnhide.index === 1 && showPath.afterUnhide.title === "Slide hai ẩn", `Hiện lại thì Next tới slide 2: ${JSON.stringify(showPath.afterUnhide)}`);
  assert(!showPath.hiddenNow, "toggle lần hai phải hiện lại slide 2");

  const allHidden = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides.forEach(slide => { slide.hidden = true; });
    const show = canvas.startSlideShow(0);
    const html = document.querySelector(".vno-slideshow-empty-hidden")?.textContent || "";
    const result = { empty: show.isEmpty, html };
    show.close();
    return result;
  });
  assert(allHidden.empty, "Tất cả ẩn phải isEmpty");
  assert(/Không có trang chiếu|No slides to present|ẩn|hidden/i.test(allHidden.html), `Thông báo tất cả ẩn không rõ: ${allHidden.html}`);

  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  console.log("LIVE PASS: Hide Slide ribbon + sorter dim/strikethrough + F5 skip 1→3 + unhide + all-hidden message");
} finally {
  await browser?.close();
  server.close();
}
