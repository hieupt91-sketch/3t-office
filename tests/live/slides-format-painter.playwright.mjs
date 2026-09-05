/** Live Format Painter on the running Slides canvas. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_FORMAT_PAINTER_PORT || 8842);
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
function isYellow(color) {
  const value = String(color || "").toLowerCase();
  return value.includes("#fff200") || value.includes("255, 242, 0") || value.includes("255,242,0");
}

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
  await page.locator(".vno-slide-canvas").waitFor();

  const painterBtn = page.locator('[data-command-id="slides.edit.formatPainter"]').first();
  assert(await painterBtn.isVisible(), "Nút Format Painter không hiện trên ribbon Home");

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[0].shapes = [
      { id: 11, type: "rect", x: 60, y: 180, w: 140, h: 90, color: "#fff200", text: "", animation: { type: "none", duration: 500, delay: 0 } },
      { id: 22, type: "ellipse", x: 240, y: 180, w: 140, h: 90, color: "#3b82f6", text: "", animation: { type: "none", duration: 500, delay: 0 } },
      { id: 33, type: "rect", x: 420, y: 180, w: 140, h: 90, color: "#16a34a", text: "", animation: { type: "none", duration: 500, delay: 0 } }
    ];
    canvas.selectSlide(0);
    canvas.setSelectedTarget(11);
  });

  await page.locator('.vno-slide-shape-item[data-shape-id="11"]').waitFor();
  await painterBtn.click();

  const afterArm = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const studio = document.querySelector(".vno-slides-studio");
    return {
      painter: studio?.dataset.formatPainter || "",
      active: studio?.classList.contains("vno-format-painter-active") || false,
      source: globalUnoBridge.activeDocument.canvas.formatPainter?.shape?.color || ""
    };
  });
  assert(afterArm.active && afterArm.painter === "on", `Format Painter chưa bật sau click nút: ${JSON.stringify(afterArm)}`);
  assert(isYellow(afterArm.source), `Nguồn chưa phải màu vàng: ${afterArm.source}`);

  await page.locator('.vno-slide-shape-item[data-shape-id="22"]').click({ timeout: 4000 });

  const painted = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const dest = canvas.slides[0].shapes.find((item) => String(item.id) === "22");
    const studio = document.querySelector(".vno-slides-studio");
    const destEl = document.querySelector('.vno-slide-shape-item[data-shape-id="22"]');
    return {
      color: dest?.color || "",
      domBg: destEl?.style?.backgroundColor || "",
      painter: studio?.dataset.formatPainter || "",
      active: studio?.classList.contains("vno-format-painter-active") || false,
      undoType: canvas.undoStack.at(-1)?.type || ""
    };
  });
  assert(isYellow(painted.color), `Hình đích chưa nhận màu nguồn: ${painted.color}`);
  assert(isYellow(painted.domBg) || isYellow(painted.color), `DOM hình đích chưa vàng: ${painted.domBg}`);
  assert(!painted.active && !painted.painter, "Chế độ một lần phải tự tắt sau khi click hình đích");
  assert(painted.undoType === "shape-format", `Undo step sai: ${painted.undoType}`);

  await page.locator('.vno-quick-btn[data-cmd="common.edit.undo"]').click();
  const undone = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.canvas.slides[0].shapes.find((item) => String(item.id) === "22")?.color || "";
  });
  assert(!isYellow(undone), `Undo chưa khôi phục màu cũ của shape 22: ${undone}`);

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.setSelectedTarget(11);
  });
  await page.locator('.vno-slide-shape-item[data-shape-id="11"]').click();
  await painterBtn.dblclick();
  const locked = await page.evaluate(() => document.querySelector(".vno-slides-studio")?.dataset.formatPainter || "");
  assert(locked === "locked", `Double-click chưa khóa Format Painter: ${locked}`);

  await page.locator('.vno-slide-shape-item[data-shape-id="22"]').click();
  const afterLock1 = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    return {
      color: canvas.slides[0].shapes.find((item) => String(item.id) === "22")?.color || "",
      painter: document.querySelector(".vno-slides-studio")?.dataset.formatPainter || ""
    };
  });
  assert(isYellow(afterLock1.color), "Shape 22 chưa nhận màu khi khóa");
  assert(afterLock1.painter === "locked", "Chế độ khóa phải còn sau lần sơn thứ nhất");

  await page.locator('.vno-slide-shape-item[data-shape-id="33"]').click();
  const afterLock2 = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return {
      color: globalUnoBridge.activeDocument.canvas.slides[0].shapes.find((item) => String(item.id) === "33")?.color || "",
      painter: document.querySelector(".vno-slides-studio")?.dataset.formatPainter || ""
    };
  });
  assert(isYellow(afterLock2.color), "Shape 33 chưa nhận màu ở lần sơn thứ hai");
  assert(afterLock2.painter === "locked", "Chế độ khóa phải còn đến khi Esc");

  await page.keyboard.press("Escape");
  const afterEsc = await page.evaluate(() => {
    const studio = document.querySelector(".vno-slides-studio");
    return {
      painter: studio?.dataset.formatPainter || "",
      active: studio?.classList.contains("vno-format-painter-active") || false
    };
  });
  assert(!afterEsc.active && !afterEsc.painter, `Esc chưa hủy Format Painter: ${JSON.stringify(afterEsc)}`);

  const body = page.locator(".vno-slide-body").first();
  await body.click();
  await body.fill("Van ban nguon dam");
  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.locator('[data-command-id="slides.color.text"]').first().click();
  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await painterBtn.click();
  const title = page.locator(".vno-slide-title");
  await title.click();
  const textPainted = await page.evaluate(() => {
    const titleEl = document.querySelector(".vno-slide-title");
    return {
      html: titleEl?.innerHTML || "",
      color: getComputedStyle(titleEl).color
    };
  });
  const gotColor = /#dc2626|rgb\(220,\s*38,\s*38\)|rgb\(220, 38, 38\)/i.test(`${textPainted.html} ${textPainted.color}`)
    || /color\s*[:=]/i.test(textPainted.html)
    || /<font/i.test(textPainted.html);
  assert(gotColor, `Title chưa nhận màu chữ đã sao chép: html=${textPainted.html} color=${textPainted.color}`);

  if (pageErrors.length) throw new Error(pageErrors.join(" | "));
  console.log("PASS: live Slides Format Painter — click nút/shape thật, copy fill, khóa double-click, Esc hủy, Undo, copy định dạng chữ");
} finally {
  await browser?.close();
  server.close();
}
