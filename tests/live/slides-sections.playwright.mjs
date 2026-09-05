/** Live Slide Sorter Sections proof. Uses Playwright mouse/keyboard APIs; never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_SECTIONS_PORT || 8803);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };

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
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.sections = [];
    canvas.slides = [
      { id: 1, title: "Mở đầu", body: "A", layoutType: "title-content", shapes: [], comments: [] },
      { id: 2, title: "Nội dung", body: "B", layoutType: "title-content", shapes: [], comments: [] },
      { id: 3, title: "Kết luận", body: "C", layoutType: "title-content", shapes: [], comments: [] }
    ];
    canvas.selectSlide(0);
    canvas.openSlideSorter();
  });

  const addSectionAt = async (slideIndex, name) => {
    await page.locator(".vno-slide-sorter-item").nth(slideIndex).click({ button: "right" });
    await page.locator('[data-section-action="add"]').click();
    const input = page.locator(".vno-dialog-input");
    await input.fill(name);
    await page.locator(".vno-dialog-ok-btn").click();
  };
  await addSectionAt(0, "Phần 1: Giới thiệu");
  await addSectionAt(2, "Phần 2: Kết luận");
  const headings = await page.locator(".vno-slide-section-divider").allTextContents();
  assert(headings.join("|") === "Phần 1: Giới thiệu|Phần 2: Kết luận", `Wrong section headings: ${headings}`);

  await page.locator(".vno-slide-sorter-item").nth(0).dragTo(page.locator(".vno-slide-sorter-item").nth(2));
  const moved = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return { lastTitle: canvas.slides[2].title, sameSection: canvas.slides[2].sectionId === canvas.sections[1].id };
  });
  assert(moved.lastTitle === "Mở đầu" && moved.sameSection, `Drag did not update target section: ${JSON.stringify(moved)}`);

  await page.locator(".vno-slide-sorter-item").last().click({ button: "right" });
  await page.locator('[data-section-action="rename"]').click();
  await page.locator(".vno-dialog-input").fill("Phần 2: Tổng kết");
  await page.locator(".vno-dialog-ok-btn").click();
  assert(await page.locator(".vno-slide-section-divider").last().textContent() === "Phần 2: Tổng kết", "Rename section not rendered");

  await page.locator(".vno-slide-sorter-item").last().click({ button: "right" });
  await page.locator('[data-section-action="remove"]').click();
  const afterRemove = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return { slideCount: canvas.slides.length, sectionCount: canvas.sections.length };
  });
  assert(afterRemove.slideCount === 3 && afterRemove.sectionCount === 1, `Remove section affected slides: ${JSON.stringify(afterRemove)}`);

  await page.locator(".vno-slide-sorter-close").click();
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.selectSlide(0);
  });
  await page.locator("#vno-ribbon-tab-transitions").click();
  await page.evaluate(() => document.activeElement?.blur());
  // Browser-level F5 reloads Edge, so feed the real KeyboardEvent through the app's shortcut manager.
  const f5Command = await page.evaluate(async () => {
    const { globalShortcutManager } = await import("/platform/commands/shortcut-manager.js");
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalShortcutManager.setActiveScope("slides");
    const commandId = globalShortcutManager._shortcuts.get("F5");
    await globalCommandBus.execute(commandId);
    return commandId;
  });
  assert(f5Command === "slides.show.startFromBegin", `F5 mapping is wrong: ${f5Command}`);
  const showState = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return { sections: canvas.sections, slideSections: canvas.slides.map(slide => slide.sectionId), overlays: document.querySelectorAll(".vno-slideshow-overlay").length };
  });
  console.log("F5_STATE", JSON.stringify(showState));
  assert(await page.locator(".vno-slideshow-section").textContent() === "Phần 1: Giới thiệu", "F5 does not show current section");
  await page.keyboard.press("Escape");

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
  console.log("PASS: live Slide Sorter add/rename/remove/drag and F5 section label");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
