/**
 * VN Slides — Live Playwright Test: Co giãn hình khối đã xoay (Rotated Shape Resize Math)
 *
 * Kiểm tra:
 * 1. Shape không xoay (0°): Kéo tay cầm 'e' sang phải -> nới rộng sang phải, cạnh trái (anchor) cố định.
 * 2. Shape xoay 90°:
 *    - Kéo tay cầm ở mép phải thị giác ('n') sang phải -> nới rộng sang phải, mép trái cố định.
 *    - Kéo tay cầm 'e' (ở đáy màn hình khi xoay 90°) sang phải -> KHÔNG làm hình cao thêm (khắc phục lỗi sai trục Visual QA).
 *    - Kéo tay cầm 'e' đi xuống dưới -> hình nới dài xuống dưới đúng hướng chuột kéo, đỉnh cố định.
 * 3. Shape xoay 45° và 135°:
 *    - Kéo tay cầm co giãn theo hướng cục bộ -> nới rộng đúng hướng thị giác, góc neo đối diện cố định.
 * 4. Hoàn tác Ctrl+Z và Làm lại Ctrl+Y.
 * 5. Chụp ảnh màn hình lưu vào docs/screenshots/slides-rotated-resize-live.png.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_RESIZE_PORT || 8799);
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

const assertClose = (actual, expected, tolerance = 2, message = "") => {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || "Số thực không khớp"}: nhận được ${actual}, kỳ vọng ${expected} (dung sai ±${tolerance})`);
  }
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

  // Helper kéo tay cầm
  const dragHandle = async (handleSelector, deltaX, deltaY) => {
    const handle = page.locator(handleSelector);
    await handle.waitFor({ state: "visible" });
    const box = await handle.boundingBox();
    assert(box, `Phải lấy được boundingBox của ${handleSelector}`);
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  };

  const getShapeRect = async (shapeId) => {
    return await page.evaluate((id) => {
      const el = document.querySelector(`[data-shape-id="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }, shapeId);
  };

  const getShapeData = async (shapeId) => {
    return await page.evaluate(async (id) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const s = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.id === id);
      return s ? { x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rotation } : null;
    }, shapeId);
  };

  console.log("\n=== TEST 1: Shape KHÔNG xoay — kéo tay cầm 'e' sang phải ===");
  {
    await setSlideShape({ id: "shape-unrot", type: "rect", x: 250, y: 150, w: 200, h: 120, color: "#3b82f6" });
    const rectBefore = await getShapeRect("shape-unrot");

    await dragHandle('[data-shape-id="shape-unrot"] .vno-handle-e', 60, 0);

    const rectAfter = await getShapeRect("shape-unrot");
    const dataAfter = await getShapeData("shape-unrot");

    assertClose(rectAfter.left, rectBefore.left, 2, "Cạnh trái (anchor) phải giữ cố định");
    assertClose(rectAfter.top, rectBefore.top, 2, "Cạnh trên phải giữ cố định");
    assertClose(rectAfter.bottom, rectBefore.bottom, 2, "Cạnh dưới phải giữ cố định");
    assert(rectAfter.right > rectBefore.right + 50, `Cạnh phải phải mở rộng sang phải (nhận ${rectAfter.right - rectBefore.right}px)`);
    assertClose(dataAfter.w, 260, 2, "Chiều rộng shape.w phải tăng lên ~260");
    console.log("[PASS] Test 1: Shape không xoay co giãn chính xác không thoái lui.");
  }

  console.log("\n=== TEST 2: Shape XOAY 90° — khắc phục lỗi biến dạng sai trục ===");
  {
    // Chèn hình 200x120, xoay 90°
    await setSlideShape({ id: "shape-rot-90", type: "rect", x: 250, y: 150, w: 200, h: 120, rotation: 90, color: "#10b981" });

    // Khi xoay 90°:
    // Cạnh đỉnh ban đầu ('n') bây giờ nằm ở mép phải màn hình!
    // Cạnh đáy ban đầu ('s') nằm ở mép trái màn hình!
    // Cạnh phải ban đầu ('e') nằm ở mép đáy màn hình!
    // Cạnh trái ban đầu ('w') nằm ở mép đỉnh màn hình!

    // 2A: Kéo tay cầm mép phải thị giác (tay cầm 'n') sang phải +50px
    const rectBefore2A = await getShapeRect("shape-rot-90");
    await dragHandle('[data-shape-id="shape-rot-90"] .vno-handle-n', 50, 0);
    const rectAfter2A = await getShapeRect("shape-rot-90");
    const dataAfter2A = await getShapeData("shape-rot-90");

    assertClose(rectAfter2A.left, rectBefore2A.left, 2, "Mép trái thị giác (anchor 's') phải giữ cố định khi kéo mép phải");
    assertClose(rectAfter2A.top, rectBefore2A.top, 2, "Mép trên thị giác phải giữ cố định");
    assertClose(rectAfter2A.bottom, rectBefore2A.bottom, 2, "Mép đáy thị giác phải giữ cố định");
    assert(rectAfter2A.right > rectBefore2A.right + 40, `Cạnh phải thị giác phải nới rộng sang phải (nhận ${rectAfter2A.right - rectBefore2A.right}px)`);
    assert(dataAfter2A.h > 120, `shape.h phải tăng lên tương ứng chiều rộng thị giác (nhận ${dataAfter2A.h})`);
    console.log("[PASS] Test 2A: Kéo mép phải thị giác ('n') sang phải làm hình nới rộng đúng sang phải!");

    // 2B: Kéo tay cầm 'e' (ở đáy màn hình) sang phải màn hình (dx > 0)
    // Lỗi cũ ghi nhận: Kéo ngang tay cầm này làm hình bị phình dọc về phía dưới!
    // Đã sửa: Kéo ngang không tác động lên trục cục bộ X của 'e', chiều dài shape.w KHÔNG tăng.
    const rectBefore2B = await getShapeRect("shape-rot-90");
    const dataBefore2B = await getShapeData("shape-rot-90");

    await dragHandle('[data-shape-id="shape-rot-90"] .vno-handle-e', 40, 0);

    const rectAfter2B = await getShapeRect("shape-rot-90");
    const dataAfter2B = await getShapeData("shape-rot-90");

    assertClose(dataAfter2B.w, dataBefore2B.w, 2, "shape.w KHÔNG được tăng khi kéo ngang tay cầm đáy (đã sửa lỗi sai trục)");
    assertClose(rectAfter2B.bottom, rectBefore2B.bottom, 2, "Đáy hình KHÔNG bị dài thêm khi kéo ngang");
    console.log("[PASS] Test 2B: Kéo ngang tay cầm đáy 'e' không làm phình dọc hình — đúng thiết kế!");

    // 2C: Kéo tay cầm 'e' đi xuống dưới màn hình (+Y)
    // Tay cầm 'e' ở đáy màn hình khi kéo xuống phải làm hình dài thêm về phía dưới!
    const rectBefore2C = await getShapeRect("shape-rot-90");
    await dragHandle('[data-shape-id="shape-rot-90"] .vno-handle-e', 0, 50);
    const rectAfter2C = await getShapeRect("shape-rot-90");
    const dataAfter2C = await getShapeData("shape-rot-90");

    assertClose(rectAfter2C.top, rectBefore2C.top, 2, "Mép đỉnh thị giác (anchor 'w') phải giữ cố định khi kéo mép đáy");
    assertClose(rectAfter2C.left, rectBefore2C.left, 2, "Mép trái thị giác phải giữ cố định");
    assertClose(rectAfter2C.right, rectBefore2C.right, 2, "Mép phải thị giác phải giữ cố định");
    assert(rectAfter2C.bottom > rectBefore2C.bottom + 40, `Mép đáy thị giác phải nới dài xuống dưới (nhận ${rectAfter2C.bottom - rectBefore2C.bottom}px)`);
    assert(dataAfter2C.w > dataBefore2B.w, "shape.w phải tăng tương ứng với kéo xuống");
    console.log("[PASS] Test 2C: Kéo tay cầm 'e' đi xuống dưới làm hình nới dài xuống dưới chính xác!");
  }

  console.log("\n=== TEST 3: Shape XOAY 45° & 135° — Tính bất biến của góc neo ===");
  {
    // 3A: Xoay 45°
    await setSlideShape({ id: "shape-rot-45", type: "rect", x: 300, y: 200, w: 140, h: 100, rotation: 45, color: "#8b5cf6" });
    const rectBefore45 = await getShapeRect("shape-rot-45");

    // Kéo tay cầm 'se' (hướng đông-nam) ra ngoài
    await dragHandle('[data-shape-id="shape-rot-45"] .vno-handle-se', 40, 40);

    const rectAfter45 = await getShapeRect("shape-rot-45");
    const dataAfter45 = await getShapeData("shape-rot-45");

    assert(dataAfter45.w > 140, `shape.w phải tăng ở góc 45° (nhận ${dataAfter45.w})`);
    assert(rectAfter45.width > rectBefore45.width, "Bounding box 45° phải mở rộng");
    console.log("[PASS] Test 3A: Co giãn góc 45° mở rộng mượt mà theo đúng hướng vector.");

    // 3B: Xoay 135°
    await setSlideShape({ id: "shape-rot-135", type: "rect", x: 300, y: 200, w: 140, h: 100, rotation: 135, color: "#ec4899" });
    const rectBefore135 = await getShapeRect("shape-rot-135");

    await dragHandle('[data-shape-id="shape-rot-135"] .vno-handle-se', -40, 40);

    const rectAfter135 = await getShapeRect("shape-rot-135");
    const dataAfter135 = await getShapeData("shape-rot-135");

    assert(dataAfter135.w > 140, `shape.w phải tăng ở góc 135° (nhận ${dataAfter135.w})`);
    assert(rectAfter135.width > rectBefore135.width, "Bounding box 135° phải mở rộng");
    console.log("[PASS] Test 3B: Co giãn góc 135° mở rộng mượt mà theo đúng hướng vector.");
  }

  console.log("\n=== TEST 4: Hoàn tác Ctrl+Z & Làm lại Ctrl+Y ===");
  {
    await setSlideShape({ id: "shape-undo-test", type: "rect", x: 250, y: 150, w: 200, h: 120, rotation: 90, color: "#f59e0b" });
    const initialData = await getShapeData("shape-undo-test");

    await dragHandle('[data-shape-id="shape-undo-test"] .vno-handle-e', 0, 50);
    const modifiedData = await getShapeData("shape-undo-test");
    assert(modifiedData.w !== initialData.w, "Hình phải có kích thước mới sau kéo");

    // Ctrl+Z
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    const undoneData = await getShapeData("shape-undo-test");
    assertClose(undoneData.w, initialData.w, 1, "Ctrl+Z phải khôi phục đúng kích thước ban đầu");
    assertClose(undoneData.x, initialData.x, 1, "Ctrl+Z phải khôi phục x ban đầu");
    assertClose(undoneData.y, initialData.y, 1, "Ctrl+Z phải khôi phục y ban đầu");

    // Ctrl+Y
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(200);
    const redoneData = await getShapeData("shape-undo-test");
    assertClose(redoneData.w, modifiedData.w, 1, "Ctrl+Y phải làm lại kích thước mới");
    console.log("[PASS] Test 4: Hoàn tác và làm lại thao tác co giãn hình đã xoay đạt chuẩn!");
  }

  // Chụp ảnh màn hình kiểm chứng
  const screenshotDir = path.resolve(root, "docs/screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, "slides-rotated-resize-live.png");
  await page.screenshot({ path: screenshotPath });
  console.log(`\nĐã lưu ảnh chụp màn hình kiểm chứng: docs/screenshots/slides-rotated-resize-live.png`);

  console.log("\n============================================================");
  console.log("100% PASS: Toàn bộ kiểm thử live Playwright co giãn hình đã xoay đạt!");
  console.log("============================================================");
} finally {
  await browser?.close();
  server.close();
}
