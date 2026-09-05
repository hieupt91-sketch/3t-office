/** Live Slides Sections: ribbon add, thumbnail collapse/expand by real click. Never SendKeys. */
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
  await page.locator(".vno-slide-canvas").waitFor();

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.sections = [];
    canvas.collapsedSectionIds = new Set();
    canvas.slides = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      title: `Trang ${index + 1}`,
      body: `Nội dung ${index + 1}`,
      layoutType: "title-content",
      shapes: [],
      comments: [],
      hidden: false
    }));
    canvas.selectSlide(0);
  });
  await page.locator(".vno-slide-thumb-item").first().waitFor();

  const addSectionViaRibbon = async (name) => {
    await page.locator("#vno-ribbon-tab-home").click();
    await page.locator('[data-dropdown-id="slides.section.menu"]').click();
    await page.locator('.vno-ribbon-dropdown-menu [data-command-id="slides.section.add"]').click();
    const input = page.locator(".vno-dialog-input");
    await input.waitFor();
    await input.fill(name);
    await page.locator(".vno-dialog-ok-btn").click();
    await page.locator(".vno-dialog-input").waitFor({ state: "detached" });
  };

  await addSectionViaRibbon("Giới thiệu");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.selectSlide(3);
  });
  await addSectionViaRibbon("Nội dung chính");

  const model = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return {
      names: canvas.sections.map(item => item.name),
      membership: canvas.slides.map((slide, index) => canvas.getSectionForSlide(index)?.name || null),
      starts: canvas.sections.map(item => item.startSlideIndex)
    };
  });
  assert(model.names.join("|") === "Giới thiệu|Nội dung chính", `Sai tên phần: ${model.names}`);
  assert(model.membership.join("|") === "Giới thiệu|Giới thiệu|Giới thiệu|Nội dung chính|Nội dung chính|Nội dung chính", `Sai membership: ${model.membership}`);
  assert(model.starts.join(",") === "0,3", `Sai startSlideIndex: ${model.starts}`);

  const headerNames = await page.locator(".vno-slide-section-header .vno-slide-section-name").allTextContents();
  assert(headerNames.join("|") === "Giới thiệu|Nội dung chính", `Thumbnail header sai: ${headerNames}`);
  assert(await page.locator(".vno-slide-thumb-item").count() === 6, "Phải hiện 6 thumbnail trước khi thu gọn");

  await page.locator(".vno-slide-section-header .vno-slide-section-toggle").first().click();
  assert(await page.locator(".vno-slide-thumb-item").count() === 3, "Thu gọn phần 1 phải ẩn đúng 3 thumbnail");
  const remaining = await page.locator(".vno-slide-thumb-item").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-slide-index")));
  assert(remaining.join(",") === "3,4,5", `Thu gọn ẩn sai slide, còn ${remaining}`);
  const collapsedState = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return canvas.isSectionCollapsed(canvas.sections[0].id);
  });
  assert(collapsedState, "Model chưa đánh dấu phần 1 collapsed");
  assert(await page.locator(".vno-slide-section-header").count() === 2, "Thu gọn không được ẩn thanh tiêu đề");

  await page.locator(".vno-slide-section-header .vno-slide-section-toggle").first().click();
  assert(await page.locator(".vno-slide-thumb-item").count() === 6, "Mở rộng phải hiện lại 6 thumbnail");

  await page.locator("#vno-ribbon-tab-view").click();
  await page.locator('[data-command-id="slides.view.slideSorter"]').click();
  await page.locator(".vno-slide-sorter-overlay").waitFor();
  assert(await page.locator(".vno-slide-sorter-item").count() === 6, "Sorter phải hiện 6 slide khi mở rộng");
  await page.locator(".vno-slide-section-divider .vno-slide-section-toggle").first().click();
  assert(await page.locator(".vno-slide-sorter-item").count() === 3, "Sorter thu gọn phải ẩn đúng slide trong phần");
  await page.locator(".vno-slide-section-divider .vno-slide-section-toggle").first().click();
  assert(await page.locator(".vno-slide-sorter-item").count() === 6, "Sorter mở rộng phải hiện lại slide");
  await page.locator(".vno-slide-sorter-close").click();

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.selectSlide(0);
  });
  await page.locator("#vno-ribbon-tab-home").click();
  await page.locator('[data-dropdown-id="slides.section.menu"]').click();
  await page.locator('.vno-ribbon-dropdown-menu [data-command-id="slides.section.moveDown"]').click();
  const moved = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return canvas.slides.map(slide => slide.title);
  });
  assert(moved.join("|") === "Trang 4|Trang 5|Trang 6|Trang 1|Trang 2|Trang 3", `Ribbon moveDown sai thứ tự: ${moved}`);

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
  console.log("PASS: live ribbon add/collapse/expand/moveDown Sections");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
