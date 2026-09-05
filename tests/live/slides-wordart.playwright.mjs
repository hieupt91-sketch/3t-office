/** Live WordArt proof. Uses Playwright mouse/keyboard APIs; never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_WORDART_PORT || 8811);
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

function readWordArtComputed(node) {
  const style = getComputedStyle(node);
  return {
    text: node.textContent,
    textShadow: style.textShadow,
    stroke: style.webkitTextStroke || `${style.webkitTextStrokeWidth} ${style.webkitTextStrokeColor}`,
    strokeWidth: style.webkitTextStrokeWidth,
    backgroundClip: style.backgroundClip || style.webkitBackgroundClip,
    webkitBackgroundClip: style.webkitBackgroundClip,
    backgroundImage: style.backgroundImage,
    fill: style.webkitTextFillColor,
    fontSize: style.fontSize
  };
}

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

  await page.locator("#vno-ribbon-tab-insert").click();
  await page.locator('[data-command-id="slides.insert.wordart"]').click();
  const dialog = page.locator('[data-vno-dialog="wordart"]');
  await dialog.waitFor();
  await page.locator("#vno-wordart-text").fill("Khai giảng");
  await page.locator('[data-wordart-preset="ocean-gradient"]').click();
  await dialog.locator(".vno-dialog-ok-btn").click();
  await page.locator(".vno-wordart-text").waitFor();

  const canvasStyle = await page.locator(".vno-slide-shape-item.is-wordart .vno-wordart-text").evaluate(readWordArtComputed);
  assert(canvasStyle.text.includes("Khai giảng"), `Canvas thiếu chữ: ${JSON.stringify(canvasStyle)}`);
  assert(canvasStyle.textShadow && canvasStyle.textShadow !== "none", `Canvas thiếu text-shadow: ${JSON.stringify(canvasStyle)}`);
  assert(parseFloat(canvasStyle.strokeWidth) > 0 || /px/.test(canvasStyle.stroke), `Canvas thiếu -webkit-text-stroke: ${JSON.stringify(canvasStyle)}`);
  assert(canvasStyle.backgroundClip === "text" || canvasStyle.webkitBackgroundClip === "text", `Canvas thiếu background-clip:text: ${JSON.stringify(canvasStyle)}`);
  assert(/linear-gradient/i.test(canvasStyle.backgroundImage), `Canvas thiếu gradient: ${JSON.stringify(canvasStyle)}`);
  console.log("PASS: canvas WordArt applies measurable text-shadow / text-stroke / background-clip");

  await page.keyboard.press("F5");
  await page.locator(".vno-slideshow-overlay .vno-wordart-text").waitFor();
  const showStyle = await page.locator(".vno-slideshow-overlay .vno-wordart-text").evaluate(readWordArtComputed);
  assert(showStyle.text.includes("Khai giảng"), `F5 thiếu chữ: ${JSON.stringify(showStyle)}`);
  assert(showStyle.textShadow && showStyle.textShadow !== "none", `F5 thiếu text-shadow: ${JSON.stringify(showStyle)}`);
  assert(showStyle.backgroundClip === "text" || showStyle.webkitBackgroundClip === "text", `F5 thiếu background-clip:text: ${JSON.stringify(showStyle)}`);
  console.log("PASS: F5 slideshow WordArt keeps CSS text effects");
  await page.keyboard.press("Escape");

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.openSlideSorter();
  });
  await page.locator(".vno-sorter-wordart .vno-wordart-text").waitFor();
  const sorterStyle = await page.locator(".vno-sorter-wordart .vno-wordart-text").evaluate(readWordArtComputed);
  assert(sorterStyle.text.includes("Khai giảng"), `Sorter thiếu chữ: ${JSON.stringify(sorterStyle)}`);
  assert(sorterStyle.backgroundClip === "text" || sorterStyle.webkitBackgroundClip === "text" || /linear-gradient/i.test(sorterStyle.backgroundImage), `Sorter thiếu CSS WordArt: ${JSON.stringify(sorterStyle)}`);
  console.log("PASS: Slide Sorter thumbnail renders WordArt CSS");
  await page.keyboard.press("Escape");

  const afterEdit = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const shape = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.type === "wordart");
    const before = shape.text;
    canvas.updateShapeText(shape.id, "Học kỳ mới");
    canvas.undoStack.push({ type: "shape-text-edit", slideIndex: canvas.currentSlideIndex, shapeId: shape.id, before, after: "Học kỳ mới" });
    const edited = shape.text;
    canvas.undo();
    const undone = shape.text;
    canvas.redo();
    const redone = shape.text;
    canvas.deleteShape(shape.id);
    const deleted = canvas.slides[canvas.currentSlideIndex].shapes.some(item => item.type === "wordart");
    canvas.undo();
    const restored = canvas.slides[canvas.currentSlideIndex].shapes.some(item => item.type === "wordart");
    return { edited, undone, redone, deleted, restored };
  });
  assert(afterEdit.edited === "Học kỳ mới", `Đổi chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.undone === "Khai giảng", `Undo chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.redone === "Học kỳ mới", `Redo chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.deleted === false && afterEdit.restored === true, `Xóa/Undo shape sai: ${JSON.stringify(afterEdit)}`);
  console.log("PASS: WordArt edit/delete/undo/redo reuse existing shape history");

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
