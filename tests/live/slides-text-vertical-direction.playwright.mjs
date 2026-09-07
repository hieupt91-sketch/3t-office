/**
 * Live: VN Slides Text Vertical Align & Direction (Home > Đoạn văn)
 * mở 2 dropdown ribbon thật (Căn lề văn bản, Hướng văn bản), bấm đúng lệnh,
 * xác nhận thuộc tính hình thật đổi đúng, CSS render đúng (align-items,
 * writing-mode), và Ctrl+Z hoàn tác đúng.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_TEXTDIR_PORT || 8941);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[canvas.currentSlideIndex].shapes = [
      { id: "t1", type: "rect", x: 50, y: 50, w: 200, h: 100, color: "#3b82f6", text: "Văn bản kiểm thử" }
    ];
    canvas.selectedShapeIds = new Set(["t1"]);
    canvas._renderShapesLayer();
  });

  const openDropdown = async (id) => {
    await page.locator(`[data-dropdown-id="${id}"]`).click();
    const menu = page.locator(".vno-ribbon-dropdown-menu");
    await menu.waitFor({ state: "visible", timeout: 3000 });
    return menu;
  };

  // 1) Căn lề trên - shape.textVAlign phải đổi và DOM align-items phải phản ánh đúng
  let menu = await openDropdown("slides.text.vAlign");
  await menu.locator('[data-command-id="slides.text.vAlignTop"]').click();
  await page.waitForTimeout(100);
  let state = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shape = globalUnoBridge.activeDocument.canvas.slides[0].shapes[0];
    const el = document.querySelector('[data-shape-id="t1"]');
    return { textVAlign: shape.textVAlign, alignItems: el?.style.alignItems };
  });
  assert(state.textVAlign === "top", "shape.textVAlign phải là top", JSON.stringify(state));
  assert(state.alignItems === "flex-start", "DOM align-items phải là flex-start khi căn trên", JSON.stringify(state));

  // 2) Căn lề dưới
  menu = await openDropdown("slides.text.vAlign");
  await menu.locator('[data-command-id="slides.text.vAlignBottom"]').click();
  await page.waitForTimeout(100);
  state = await page.evaluate(() => {
    const el = document.querySelector('[data-shape-id="t1"]');
    return { alignItems: el?.style.alignItems };
  });
  assert(state.alignItems === "flex-end", "DOM align-items phải là flex-end khi căn dưới", JSON.stringify(state));

  // 3) Một lần Ctrl+Z phải hoàn tác về top (thao tác trước đó)
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  state = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.canvas.slides[0].shapes[0].textVAlign;
  });
  assert(state === "top", "Undo phải khôi phục về textVAlign=top", String(state));

  // 4) Chọn lại shape (undo có thể làm mất selection) rồi thử Hướng văn bản: Xoay chữ 90°
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.selectedShapeIds = new Set(["t1"]);
  });
  menu = await openDropdown("slides.text.direction");
  await menu.locator('[data-command-id="slides.text.directionVertical"]').click();
  await page.waitForTimeout(100);
  state = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shape = globalUnoBridge.activeDocument.canvas.slides[0].shapes[0];
    const textEl = document.querySelector('[data-shape-text-id="t1"]');
    return { textDirection: shape.textDirection, writingMode: textEl?.style.writingMode };
  });
  assert(state.textDirection === "vertical", "shape.textDirection phải là vertical", JSON.stringify(state));
  assert(state.writingMode === "vertical-rl", "DOM writing-mode phải là vertical-rl khi Xoay chữ 90°", JSON.stringify(state));

  // 5) Trở lại Ngang - writing-mode phải được gỡ bỏ hoàn toàn
  menu = await openDropdown("slides.text.direction");
  await menu.locator('[data-command-id="slides.text.directionHorizontal"]').click();
  await page.waitForTimeout(100);
  state = await page.evaluate(() => {
    const textEl = document.querySelector('[data-shape-text-id="t1"]');
    return { writingMode: textEl?.style.writingMode || "" };
  });
  assert(!state.writingMode, "writing-mode phải được gỡ bỏ khi chọn lại Ngang", JSON.stringify(state));

  console.log("PASS: Slides Căn lề văn bản & Hướng văn bản mở dropdown thật, đổi đúng CSS/thuộc tính hình thật, Undo hoạt động đúng.");
} finally {
  await browser?.close();
  server.close();
}
