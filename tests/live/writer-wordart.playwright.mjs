/** Live Writer WordArt proof. Uses Playwright mouse/keyboard APIs; never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_WORDART_PORT || 8821);
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
    fontSize: style.fontSize,
    display: style.display
  };
}

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="writer"]').click();
  await page.locator('.vno-shell[data-app="writer"]').waitFor();
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  const writer = page.locator(".vno-writer-body");
  await writer.click();

  await page.locator("#vno-ribbon-tab-insert").click();
  await page.locator('[data-command-id="writer.insert.wordart"]').click();
  const dialog = page.locator('[data-vno-dialog="wordart"]');
  await dialog.waitFor();
  await page.locator("#vno-wordart-text").fill("Khai giảng");
  await page.locator('[data-wordart-preset="ocean-gradient"]').click();
  await dialog.locator(".vno-dialog-ok-btn").click();
  await writer.locator(".vno-writer-wordart .vno-wordart-text").waitFor();

  const canvasStyle = await writer.locator(".vno-writer-wordart .vno-wordart-text").evaluate(readWordArtComputed);
  assert(canvasStyle.text.includes("Khai giảng"), `Canvas thiếu chữ: ${JSON.stringify(canvasStyle)}`);
  assert(canvasStyle.textShadow && canvasStyle.textShadow !== "none", `Canvas thiếu text-shadow: ${JSON.stringify(canvasStyle)}`);
  assert(parseFloat(canvasStyle.strokeWidth) > 0 || /px/.test(canvasStyle.stroke), `Canvas thiếu -webkit-text-stroke: ${JSON.stringify(canvasStyle)}`);
  assert(canvasStyle.backgroundClip === "text" || canvasStyle.webkitBackgroundClip === "text", `Canvas thiếu background-clip:text: ${JSON.stringify(canvasStyle)}`);
  assert(/linear-gradient/i.test(canvasStyle.backgroundImage), `Canvas thiếu gradient: ${JSON.stringify(canvasStyle)}`);
  console.log("PASS: Writer canvas WordArt applies measurable text-shadow / text-stroke / background-clip");

  await writer.locator(".vno-writer-wordart").click();
  const selected = await writer.locator(".vno-writer-wordart.is-selected").count();
  assert(selected === 1, "Click chưa chọn khối WordArt");
  console.log("PASS: click selects inline WordArt");

  const afterEdit = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const adapter = globalUnoBridge.activeDocument;
    const ok = adapter.updateWordArtText("Học kỳ mới");
    const edited = document.querySelector(".vno-writer-wordart .vno-wordart-text")?.textContent || "";
    adapter.undo();
    const undone = document.querySelector(".vno-writer-wordart .vno-wordart-text")?.textContent || "";
    adapter.redo();
    const redone = document.querySelector(".vno-writer-wordart .vno-wordart-text")?.textContent || "";
    adapter.deleteWordArt();
    const deleted = Boolean(document.querySelector(".vno-writer-wordart"));
    adapter.undo();
    const restored = Boolean(document.querySelector(".vno-writer-wordart"));
    const restoredText = document.querySelector(".vno-writer-wordart .vno-wordart-text")?.textContent || "";
    return { ok, edited, undone, redone, deleted, restored, restoredText };
  });
  assert(afterEdit.ok && afterEdit.edited.includes("Học kỳ mới"), `Đổi chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.undone.includes("Khai giảng"), `Undo chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.redone.includes("Học kỳ mới"), `Redo chữ sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.deleted === false && afterEdit.restored === true, `Xóa/Undo sai: ${JSON.stringify(afterEdit)}`);
  assert(afterEdit.restoredText.includes("Học kỳ mới"), `Undo xóa mất chữ: ${JSON.stringify(afterEdit)}`);
  console.log("PASS: Writer WordArt edit/delete/undo/redo uses snapshot history");

  await writer.locator(".vno-writer-wordart").click();
  await page.keyboard.press("Delete");
  const gone = await writer.locator(".vno-writer-wordart").count();
  assert(gone === 0, "Delete khi đang chọn chưa xóa WordArt");
  console.log("PASS: Delete removes selected WordArt");

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
