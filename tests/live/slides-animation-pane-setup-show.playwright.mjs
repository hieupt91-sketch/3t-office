/** Live Animation Pane + Set Up Slide Show. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ANIM_PANE_PORT || 8837);
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

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [{
      id: 1,
      title: "Tieu de fade",
      body: "Noi dung fly",
      layoutType: "title-content",
      shapes: [{
        id: 77,
        type: "rect",
        x: 40,
        y: 120,
        w: 160,
        h: 70,
        color: "#2563eb",
        text: "Hop van ban zoom",
        animation: { type: "zoomIn", duration: 400, delay: 0, order: 2, start: "onClick" }
      }],
      comments: [],
      hidden: false,
      titleAnimation: { type: "fadeIn", duration: 500, delay: 0, order: 0, start: "onClick" },
      bodyAnimation: { type: "flyIn", duration: 300, delay: 0, order: 1, start: "afterPrevious" }
    }, {
      id: 2,
      title: "Trang hai",
      body: "Ket thuc",
      layoutType: "title-content",
      shapes: [],
      comments: [],
      hidden: false
    }];
    canvas.selectSlide(0);
  });

  await page.locator("#vno-ribbon-tab-animations").click();
  const paneBtn = page.locator('[data-command-id="slides.animation.pane"]');
  await paneBtn.waitFor({ state: "visible" });
  await paneBtn.click();
  const pane = page.locator(".vno-animation-pane");
  await pane.waitFor({ state: "visible" });
  const rows = pane.locator(".vno-anim-pane-item");
  assert(await rows.count() === 3, `Pane phải có 3 dòng, nhận ${await rows.count()}`);
  const labels = await rows.locator(".vno-anim-pane-object").allTextContents();
  assert(/Tieu de fade/i.test(labels[0]), `dòng 1 ${labels[0]}`);
  assert(/Noi dung fly/i.test(labels[1]), `dòng 2 ${labels[1]}`);
  assert(/Hop van ban zoom/i.test(labels[2]), `dòng 3 ${labels[2]}`);

  await rows.nth(1).locator('[data-anim-action="up"]').click();
  const afterUp = await rows.locator(".vno-anim-pane-object").allTextContents();
  assert(/Noi dung fly/i.test(afterUp[0]) && /Tieu de fade/i.test(afterUp[1]), `sau ↑ ${afterUp.join(" | ")}`);

  const playback = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const show = canvas.startSlideShow(0);
    const timeline = show.getTimeline().map((item) => ({ target: String(item.target), delay: item.playDelay, type: item.type }));
    const html = document.querySelector(".vno-slideshow-content")?.innerHTML || "";
    const titleDelay = document.querySelector('[data-vno-anim-target="title"]')?.getAttribute("data-vno-anim-delay");
    const bodyDelay = document.querySelector('[data-vno-anim-target="body"]')?.getAttribute("data-vno-anim-delay");
    show.close();
    return { timeline, html, titleDelay: Number(titleDelay), bodyDelay: Number(bodyDelay) };
  });
  assert(playback.timeline[0].target === "body" && playback.timeline[1].target === "title", `timeline F5 ${JSON.stringify(playback.timeline)}`);
  assert(playback.bodyDelay < playback.titleDelay, `delay thật body ${playback.bodyDelay} vs title ${playback.titleDelay}`);

  await rows.nth(2).locator('[data-anim-action="remove"]').click();
  assert(await rows.count() === 2, `sau xóa còn ${await rows.count()}`);
  const afterRemove = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const shape = canvas.slides[0].shapes[0];
    const show = canvas.startSlideShow(0);
    const html = document.querySelector(".vno-slideshow-content")?.innerHTML || "";
    show.close();
    return { type: shape.animation?.type, stillThere: html.includes("Hop van ban zoom"), hasAnim: /data-vno-anim-target="77"/.test(html) };
  });
  assert(afterRemove.type === "none", `shape animation ${afterRemove.type}`);
  assert(afterRemove.stillThere, "Shape phải còn trên slideshow");
  assert(!afterRemove.hasAnim, "Shape không còn data-vno-anim sau khi xóa");

  await page.locator(".vno-anim-pane-close").click();
  await page.locator("#vno-ribbon-tab-slideshow").click();
  const setupBtn = page.locator('[data-command-id="slides.show.setupShow"]');
  await setupBtn.waitFor({ state: "visible" });
  await setupBtn.click();
  const dialog = page.locator("#vno-setup-show-title");
  await dialog.waitFor({ state: "visible" });
  await page.locator("#vno-setup-loop").check();
  await page.locator("#vno-setup-ok").click();
  await page.locator("#vno-setup-show-title").waitFor({ state: "detached" });

  const looped = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const show = canvas.startSlideShow(0);
    const start = { index: show.getIndex(), title: show.getTitle() };
    show.next();
    const mid = { index: show.getIndex(), title: show.getTitle() };
    show.next();
    const wrapped = { index: show.getIndex(), title: show.getTitle(), open: !!document.querySelector(".vno-slideshow-overlay") };
    show.close();
    return { start, mid, wrapped, loop: canvas.getSlideShowSettings().loopUntilEsc };
  });
  assert(looped.loop, "Phải lưu loopUntilEsc");
  assert(looped.start.index === 0 && looped.mid.index === 1, `đi 1→2 ${JSON.stringify(looped)}`);
  assert(looped.wrapped.index === 0 && looped.wrapped.title === "Tieu de fade" && looped.wrapped.open, `phải quay về slide 1: ${JSON.stringify(looped.wrapped)}`);

  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  console.log("LIVE PASS: Animation Pane list/reorder/delete + F5 delay order + Set Up loop to slide 1");
} finally {
  await browser?.close();
  server.close();
}
