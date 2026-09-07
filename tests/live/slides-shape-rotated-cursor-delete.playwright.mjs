/**
 * VN Slides — Live Playwright Test: Con trỏ co giãn động và Nút xóa không xoay trên hình đã xoay
 *
 * Kiểm tra:
 * 1. Shape không xoay (0°):
 *    - Tay cầm 'n' có cursor: ns-resize, tay cầm 'e' có cursor: ew-resize.
 *    - Nút xóa (.vno-shape-delete-btn) không có góc xoay ngược (transform: none hoặc "").
 * 2. Shape xoay 90°:
 *    - Tay cầm 'n' (ở cạnh phải màn hình) hiển thị cursor: ew-resize (trước đây bị lỗi ns-resize).
 *    - Tay cầm 'e' (ở cạnh đáy màn hình) hiển thị cursor: ns-resize (trước đây bị lỗi ew-resize).
 *    - Tay cầm 'ne' (góc đông-nam) hiển thị cursor: nwse-resize.
 *    - Tay cầm 'se' (góc tây-nam) hiển thị cursor: nesw-resize.
 *    - Nút xóa (.vno-shape-delete-btn) có transform: rotate(-90deg) (hoặc matrix tương đương biểu diễn -90°).
 * 3. Kéo chuột xoay tương tác thời gian thực:
 *    - Kéo tay cầm xoay bằng Playwright mouse -> xác nhận con trỏ và nút xóa cập nhật ngay trong lúc kéo.
 * 4. Hoàn tác Ctrl+Z khôi phục về trạng thái ban đầu.
 * 5. Chụp ảnh màn hình kiểm chứng lưu vào docs/screenshots/slides-rotated-cursor-delete-live.png.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ROT_CURSOR_PORT || 8801);
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

/**
 * Kiểm tra xem chuỗi CSS transform có tương đương với rotate(-90deg) hay không:
 * - rotate(-90deg) hoặc rotate(-1.5708rad)
 * - matrix(0, -1, 1, 0, 0, 0) (sai số thực máy tính)
 */
function isRotateMinus90Deg(transformStr) {
  if (!transformStr) return false;
  if (transformStr.includes("rotate(-90deg)")) return true;
  const m = transformStr.match(/matrix\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map(s => parseFloat(s.trim()));
    if (parts.length >= 4) {
      const [a, b, c, d] = parts;
      // cos(-90°) = 0, sin(-90°) = -1 -> matrix(0, -1, 1, 0, 0, 0)
      return Math.abs(a) < 0.05 && Math.abs(b - (-1)) < 0.05 && Math.abs(c - 1) < 0.05 && Math.abs(d) < 0.05;
    }
  }
  return false;
}

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

  // Helper đặt hình và chọn hình
  const setSlideShape = async (shapeData) => {
    await page.evaluate(async (data) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.slides[canvas.currentSlideIndex].shapes = [data];
      canvas.setSelectedTarget(data.id);
      canvas._renderShapesLayer();
    }, shapeData);
    await page.waitForTimeout(200);
  };

  console.log("\n=== TEST 1: Shape KHÔNG xoay (0°) — Kiểm tra baseline ===");
  {
    await setSlideShape({ id: "shape-unrot", type: "rect", x: 250, y: 150, w: 220, h: 140, color: "#3b82f6" });

    const handleNCursor = await page.locator('[data-shape-id="shape-unrot"] .vno-handle-n').evaluate(el => window.getComputedStyle(el).cursor);
    const handleECursor = await page.locator('[data-shape-id="shape-unrot"] .vno-handle-e').evaluate(el => window.getComputedStyle(el).cursor);
    const handleNECursor = await page.locator('[data-shape-id="shape-unrot"] .vno-handle-ne').evaluate(el => window.getComputedStyle(el).cursor);

    assert(handleNCursor === "ns-resize", `Tay cầm 'n' khi không xoay phải là ns-resize, thực tế: ${handleNCursor}`);
    assert(handleECursor === "ew-resize", `Tay cầm 'e' khi không xoay phải là ew-resize, thực tế: ${handleECursor}`);
    assert(handleNECursor === "nesw-resize", `Tay cầm 'ne' khi không xoay phải là nesw-resize, thực tế: ${handleNECursor}`);

    const delBtnTransform = await page.locator('[data-shape-id="shape-unrot"] .vno-shape-delete-btn').evaluate(el => el.style.transform);
    assert(!delBtnTransform || delBtnTransform === "none", `Nút xóa khi không xoay không được counter-rotate, thực tế: "${delBtnTransform}"`);
    console.log("[PASS] Test 1: Shape không xoay hiển thị đúng con trỏ chuẩn và nút xóa mặc định.");
  }

  console.log("\n=== TEST 2: Shape XOAY 90° — Con trỏ động & Nút xóa counter-rotate ===");
  {
    // Đặt hình chữ nhật xoay 90°
    await setSlideShape({ id: "shape-rot-90", type: "rect", x: 250, y: 150, w: 220, h: 140, rotation: 90, color: "#10b981" });

    // Khi hình xoay 90° theo chiều kim đồng hồ:
    // - Tay cầm 'n' (vốn ở đỉnh) nay xoay tới cạnh PHẢI của màn hình -> con trỏ thị giác PHẢI là ew-resize (kéo ngang)!
    // - Tay cầm 'e' (vốn ở cạnh phải) nay xoay tới cạnh ĐÁY của màn hình -> con trỏ thị giác PHẢI là ns-resize (kéo dọc)!
    // - Tay cầm 'ne' xoay tới góc dưới-phải (đông-nam) -> nwse-resize!
    // - Tay cầm 'se' xoay tới góc dưới-trái (tây-nam) -> nesw-resize!
    const handleNCursor = await page.locator('[data-shape-id="shape-rot-90"] .vno-handle-n').evaluate(el => window.getComputedStyle(el).cursor);
    const handleECursor = await page.locator('[data-shape-id="shape-rot-90"] .vno-handle-e').evaluate(el => window.getComputedStyle(el).cursor);
    const handleNECursor = await page.locator('[data-shape-id="shape-rot-90"] .vno-handle-ne').evaluate(el => window.getComputedStyle(el).cursor);
    const handleSECursor = await page.locator('[data-shape-id="shape-rot-90"] .vno-handle-se').evaluate(el => window.getComputedStyle(el).cursor);

    console.log(`  Handle 'n' cursor: ${handleNCursor} (kỳ vọng: ew-resize)`);
    console.log(`  Handle 'e' cursor: ${handleECursor} (kỳ vọng: ns-resize)`);
    console.log(`  Handle 'ne' cursor: ${handleNECursor} (kỳ vọng: nwse-resize)`);
    console.log(`  Handle 'se' cursor: ${handleSECursor} (kỳ vọng: nesw-resize)`);

    assert(handleNCursor === "ew-resize", `Tay cầm 'n' ở góc 90° PHẢI là ew-resize (không phải ns-resize cũ), thực tế: ${handleNCursor}`);
    assert(handleECursor === "ns-resize", `Tay cầm 'e' ở góc 90° PHẢI là ns-resize (không phải ew-resize cũ), thực tế: ${handleECursor}`);
    assert(handleNECursor === "nwse-resize", `Tay cầm 'ne' ở góc 90° PHẢI là nwse-resize, thực tế: ${handleNECursor}`);
    assert(handleSECursor === "nesw-resize", `Tay cầm 'se' ở góc 90° PHẢI là nesw-resize, thực tế: ${handleSECursor}`);

    // Nút xóa: phải counter-rotate -90deg để người dùng nhìn thẳng đứng
    const delBtnInlineTransform = await page.locator('[data-shape-id="shape-rot-90"] .vno-shape-delete-btn').evaluate(el => el.style.transform);
    const delBtnComputedTransform = await page.locator('[data-shape-id="shape-rot-90"] .vno-shape-delete-btn').evaluate(el => window.getComputedStyle(el).transform);

    console.log(`  Nút xóa style.transform: "${delBtnInlineTransform}"`);
    console.log(`  Nút xóa computed transform: "${delBtnComputedTransform}"`);

    assert(delBtnInlineTransform === "rotate(-90deg)", `Nút xóa style.transform phải là "rotate(-90deg)", thực tế: "${delBtnInlineTransform}"`);
    assert(isRotateMinus90Deg(delBtnComputedTransform), `getComputedStyle(nút xóa).transform phải biểu diễn -90° (rotate(-90deg) hoặc matrix tương đương), thực tế: "${delBtnComputedTransform}"`);

    console.log("[PASS] Test 2: Con trỏ 8 tay cầm và Nút xóa counter-rotate ở góc 90° hoàn toàn chính xác!");
  }

  console.log("\n=== TEST 3: Tương tác kéo xoay thời gian thực bằng chuột ===");
  {
    // Bắt đầu với hình không xoay (0°)
    await setSlideShape({ id: "shape-interactive", type: "rect", x: 300, y: 200, w: 200, h: 120, color: "#8b5cf6" });

    const handleRotate = page.locator('[data-shape-id="shape-interactive"] .vno-shape-rotate-handle');
    await handleRotate.waitFor({ state: "visible" });
    const rBox = await handleRotate.boundingBox();
    assert(rBox, "Phải lấy được boundingBox của tay cầm xoay");

    const startX = rBox.x + rBox.width / 2;
    const startY = rBox.y + rBox.height / 2;

    // Kéo chuột sang phải ngang tâm hình (xoay ~90°)
    // Tâm hình là (400, 260) trên canvas; startY của tay cầm xoay là ~172
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Giữ Shift để snap đúng 90° (PowerPoint parity)
    await page.keyboard.down("Shift");
    await page.mouse.move(startX + 120, startY + 100, { steps: 8 });
    await page.waitForTimeout(100);

    const rotWhileDragging = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "shape-interactive");
      return s ? s.rotation : undefined;
    });
    console.log(`  Góc xoay trong khi kéo: ${rotWhileDragging}°`);
    assert(typeof rotWhileDragging === "number" && rotWhileDragging > 0, "Góc xoay phải cập nhật trong khi kéo");

    // Kiểm tra tay cầm 'n' và nút xóa được cập nhật TRONG THỜI GIAN THỰC (trước mouse up)
    const cursorWhileDragging = await page.locator('[data-shape-id="shape-interactive"] .vno-handle-n').evaluate(el => window.getComputedStyle(el).cursor);
    const delBtnWhileDragging = await page.locator('[data-shape-id="shape-interactive"] .vno-shape-delete-btn').evaluate(el => el.style.transform);
    console.log(`  Cursor 'n' trong khi kéo: ${cursorWhileDragging}`);
    console.log(`  Nút xóa transform trong khi kéo: "${delBtnWhileDragging}"`);

    assert(delBtnWhileDragging.includes("rotate(-"), `Nút xóa phải counter-rotate trong khi kéo, thực tế: "${delBtnWhileDragging}"`);

    await page.keyboard.up("Shift");
    await page.mouse.up();
    await page.waitForTimeout(200);

    console.log("[PASS] Test 3: Kéo xoay tương tác cập nhật con trỏ và nút xóa thời gian thực thành công!");
  }

  console.log("\n=== TEST 4: Hoàn tác Ctrl+Z khôi phục đúng con trỏ và nút xóa ===");
  {
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    const rotAfterUndo = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const s = globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(item => item.id === "shape-interactive");
      return s ? s.rotation : undefined;
    });
    assert(rotAfterUndo === undefined, `Ctrl+Z phải đưa góc xoay về undefined, thực tế: ${rotAfterUndo}`);

    // Chọn lại hình để kiểm tra tay cầm và nút xóa sau hoàn tác
    await page.locator('[data-shape-id="shape-interactive"]').click();
    await page.waitForTimeout(200);

    const handleNCursorAfterUndo = await page.locator('[data-shape-id="shape-interactive"] .vno-handle-n').evaluate(el => window.getComputedStyle(el).cursor);
    const delBtnAfterUndo = await page.locator('[data-shape-id="shape-interactive"] .vno-shape-delete-btn').evaluate(el => el.style.transform);

    assert(handleNCursorAfterUndo === "ns-resize", `Sau Ctrl+Z, tay cầm 'n' phải khôi phục về ns-resize, thực tế: ${handleNCursorAfterUndo}`);
    assert(!delBtnAfterUndo || delBtnAfterUndo === "none", `Sau Ctrl+Z, nút xóa không được còn counter-rotate, thực tế: "${delBtnAfterUndo}"`);

    console.log("[PASS] Test 4: Hoàn tác Ctrl+Z khôi phục hoàn hảo con trỏ và kiểu dáng nút xóa!");
  }

  // Chụp ảnh màn hình kiểm chứng
  const screenshotDir = path.resolve(root, "docs/screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, "slides-rotated-cursor-delete-live.png");
  await page.screenshot({ path: screenshotPath });
  console.log(`\nĐã lưu ảnh chụp màn hình kiểm chứng: docs/screenshots/slides-rotated-cursor-delete-live.png`);

  console.log("\n============================================================");
  console.log("100% PASS: Toàn bộ kiểm thử live con trỏ động và nút xóa đạt!");
  console.log("============================================================");
} finally {
  await browser?.close();
  server.close();
}
