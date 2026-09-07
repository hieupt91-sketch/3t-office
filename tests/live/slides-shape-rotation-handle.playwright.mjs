/**
 * VN Slides — Live Playwright Test: Tay cầm xoay tương tác (Rotation Handle)
 *
 * Kịch bản:
 * 1. Khởi chạy HTTP server và mở VN Slides trên trình duyệt Edge.
 * 2. Đặt 1 hình chữ nhật trên canvas, chọn nó.
 * 3. Kiểm tra .vno-shape-rotate-handle và .vno-shape-rotate-stem xuất hiện.
 * 4. Kéo tay cầm xoay sang bên phải bằng Playwright mouse (down, move, up).
 * 5. Xác nhận shape.rotation tăng góc dương (> 0) và CSS transform phản ánh đúng rotate(...)deg.
 * 6. Bấm Ctrl+Z hoàn tác -> xác nhận shape.rotation khôi phục về undefined và CSS transform được gỡ.
 * 7. Bấm Ctrl+Y làm lại -> xác nhận shape.rotation khôi phục lại góc đã xoay.
 * 8. Chuột phải vào hình -> mở context menu -> bấm "Đặt lại góc xoay (0°)" -> xác nhận góc về undefined.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ROTATE_PORT || 8798);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

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

const assert = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("PAGEERROR:", err.message));

  console.log(`Đang tải VN Slides trên cổng ${port}...`);
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // 1. Chèn hình khối chữ nhật và chọn nó
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[canvas.currentSlideIndex].shapes = [
      { id: "test-rect-rot", type: "rect", x: 250, y: 150, w: 200, h: 120, color: "#3b82f6", text: "Hình chữ nhật xoay" }
    ];
    canvas.setSelectedTarget("test-rect-rot");
    canvas._renderShapesLayer();
  });
  await page.waitForTimeout(200);

  const shapeLocator = page.locator('[data-shape-id="test-rect-rot"]');
  await shapeLocator.waitFor({ state: "visible" });
  console.log("[PASS] Đã chèn hình khối và hiển thị trên canvas");

  // 2. Kiểm tra tay cầm xoay và cần xoay
  const handleLocator = shapeLocator.locator(".vno-shape-rotate-handle");
  const stemLocator = shapeLocator.locator(".vno-shape-rotate-stem");
  await handleLocator.waitFor({ state: "visible", timeout: 3000 });
  await stemLocator.waitFor({ state: "attached", timeout: 3000 });
  console.log("[PASS] Tay cầm xoay (.vno-shape-rotate-handle) và cần nối (.vno-shape-rotate-stem) hiển thị đúng");

  // 3. Kéo tay cầm xoay sang phải
  const handleBox = await handleLocator.boundingBox();
  assert(handleBox, "Phải lấy được boundingBox của tay cầm xoay");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Kéo sang phải +80px và xuống +30px (xoay xuôi kim đồng hồ)
  await page.mouse.move(startX + 80, startY + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  // 4. Xác nhận shape.rotation > 0 và CSS transform rotate(...)
  const rotAfterDrag = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "test-rect-rot");
    return s ? s.rotation : undefined;
  });
  assert(typeof rotAfterDrag === "number" && rotAfterDrag > 0, `Kéo sang phải phải tăng góc dương, thực tế: ${rotAfterDrag}`);

  const transformStyle = await page.evaluate(() => {
    const el = document.querySelector('[data-shape-id="test-rect-rot"]');
    return el ? el.style.transform : "";
  });
  assert(transformStyle.includes("rotate("), `CSS transform phải chứa rotate(...), thực tế: ${transformStyle}`);
  console.log(`[PASS] Kéo chuột xoay thành công: shape.rotation = ${rotAfterDrag}°, style.transform = "${transformStyle}"`);

  // 5. Kiểm tra hoàn tác Ctrl+Z
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(200);

  const rotAfterUndo = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "test-rect-rot");
    return s ? s.rotation : undefined;
  });
  assert(rotAfterUndo === undefined, `Ctrl+Z phải hoàn tác về undefined (không xoay), thực tế: ${rotAfterUndo}`);

  const transformAfterUndo = await page.evaluate(() => {
    const el = document.querySelector('[data-shape-id="test-rect-rot"]');
    return el ? el.style.transform : "";
  });
  assert(!transformAfterUndo || transformAfterUndo === "none", `CSS transform phải được gỡ sau khi hoàn tác, thực tế: "${transformAfterUndo}"`);
  console.log("[PASS] Hoàn tác Ctrl+Z khôi phục đúng góc xoay ban đầu (undefined) và xóa CSS transform");

  // 6. Kiểm tra làm lại Ctrl+Y
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(200);

  const rotAfterRedo = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "test-rect-rot");
    return s ? s.rotation : undefined;
  });
  assert(rotAfterRedo === rotAfterDrag, `Ctrl+Y phải làm lại góc xoay ${rotAfterDrag}°, thực tế: ${rotAfterRedo}`);
  console.log(`[PASS] Làm lại Ctrl+Y khôi phục góc xoay: ${rotAfterRedo}°`);

  // 7. Kiểm tra Context menu "Đặt lại góc xoay (0°)"
  await shapeLocator.click({ button: "right" });
  await page.waitForTimeout(200);

  const resetRotationBtn = page.locator('.vno-shape-context-menu [data-action="reset-rotation"]');
  await resetRotationBtn.waitFor({ state: "visible", timeout: 3000 });
  await resetRotationBtn.click();
  await page.waitForTimeout(200);

  const rotAfterReset = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "test-rect-rot");
    return s ? s.rotation : undefined;
  });
  assert(rotAfterReset === undefined, `Đặt lại góc xoay qua context menu phải đưa về undefined, thực tế: ${rotAfterReset}`);
  console.log("[PASS] Đặt lại góc xoay qua Context Menu (0°) thành công");

  console.log("\n============================================================");
  console.log("100% PASS: Toàn bộ kiểm thử live Playwright tay cầm xoay đạt!");
  console.log("============================================================");
} finally {
  await browser?.close();
  server.close();
}
