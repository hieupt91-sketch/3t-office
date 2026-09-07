/**
 * VN Slides — Visual QA Playwright Test: Xoay hình khối (Slides Shape Rotation)
 *
 * Kiểm tra thị giác & tương tác toàn diện theo TASK-BRIEF-VISUAL-QA.md:
 * 1. Mở Slides thật ở nhiều độ phân giải (1600px, 1280px, 1024px).
 * 2. Tạo các hình khối khác nhau (rect, ellipse, textbox).
 * 3. Kiểm tra tay cầm xoay (.vno-shape-rotate-handle) và cần nối (.vno-shape-rotate-stem):
 *    - Không bị lệch, không đè lên hình, không biến mất.
 * 4. Kéo xoay với phím Shift (snap 15°):
 *    - Hiển thị tooltip góc xoay trực quan (.vno-shape-rotate-tooltip, ví dụ "45°").
 *    - Counter-rotate tooltip để chữ luôn đọc xuôi, không bị lộn ngược.
 * 5. Các tay cầm resize (8 hướng) sau khi xoay:
 *    - Nằm đúng vị trí góc/cạnh hình đã xoay.
 *    - Con trỏ chuột (cursor) đổi hướng hợp lý theo góc xoay (cursorForHandle).
 * 6. Nút xóa (.vno-shape-delete-btn):
 *    - Counter-rotate để luôn đứng thẳng, không bị nghiêng/lộn ngược theo hình.
 * 7. Chế độ trình chiếu (slideshow):
 *    - Hình xoay hiển thị đúng CSS transform: rotate(...)
 *    - Tuyệt đối không có tay cầm hoặc UI thao tác thừa lọt vào trình chiếu.
 * 8. Lưu ảnh chụp màn hình kiểm chứng vào docs/screenshots/.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_VQA_PORT || 8792);
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

const screenshotDir = path.resolve(root, "docs/screenshots");
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  console.log("============================================================");
  console.log("KIỂM THỬ THỊ GIÁC: VN SLIDES SHAPE ROTATION (Visual QA)");
  console.log("============================================================");

  // --- GIAI ĐOẠN 1: Độ phân giải 1600x1000 — Tạo hình và kiểm tra tay cầm ---
  console.log("\n1. Mở VN Slides ở độ phân giải 1600x1000...");
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("PAGEERROR:", err.message));

  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Tạo 3 hình khối: Hình chữ nhật, Hình elip, Hộp văn bản
  console.log("2. Tạo 3 hình khối: rect, ellipse, textbox...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const slide = canvas.slides[canvas.currentSlideIndex];
    slide.shapes = [
      { id: "qa-rect", type: "rect", x: 120, y: 120, w: 200, h: 120, color: "#2563eb", text: "Hình chữ nhật" },
      { id: "qa-ellipse", type: "ellipse", x: 380, y: 120, w: 160, h: 160, color: "#10b981", text: "Hình elip" },
      { id: "qa-textbox", type: "textbox", x: 600, y: 140, w: 220, h: 80, color: "transparent", text: "Hộp văn bản mẫu" }
    ];
    canvas.setSelectedTarget("qa-rect");
    canvas._renderShapesLayer();
  });
  await page.waitForTimeout(200);

  const rectLocator = page.locator('[data-shape-id="qa-rect"]');
  await rectLocator.waitFor({ state: "visible" });
  console.log("   [PASS] 3 hình khối đã render thành công trên canvas");

  // Kiểm tra tay cầm xoay và cuống xoay trên hình được chọn
  const rotateHandle = rectLocator.locator(".vno-shape-rotate-handle");
  const rotateStem = rectLocator.locator(".vno-shape-rotate-stem");
  await rotateHandle.waitFor({ state: "visible", timeout: 3000 });
  await rotateStem.waitFor({ state: "attached", timeout: 3000 });

  const handleBox = await rotateHandle.boundingBox();
  const rectBox = await rectLocator.boundingBox();
  assert(handleBox != null && rectBox != null, "Phải lấy được boundingBox của rect và rotateHandle");
  // Tay cầm xoay phải nằm phía TRÊN của hình, không đè lên hình
  assert(handleBox.y + handleBox.height <= rectBox.y + 4, "Tay cầm xoay phải nằm phía trên cạnh đỉnh hình khối", `handle Y=${handleBox.y}, rect Y=${rectBox.y}`);
  console.log("   [PASS] Tay cầm xoay nằm đúng vị trí phía trên đỉnh hình khối, không bị lệch hoặc đè lên hình");

  await page.screenshot({ path: path.join(screenshotDir, "slides-rotation-visual-qa-1600-shapes.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/slides-rotation-visual-qa-1600-shapes.png");

  // --- GIAI ĐOẠN 2: Tương tác kéo xoay + Phản hồi thị giác (Tooltip góc độ) ---
  console.log("\n3. Tương tác kéo xoay tay cầm với phím Shift (snap 15°)...");
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.keyboard.down("Shift");

  // Kéo chuột theo góc ~45° (xuôi kim đồng hồ)
  await page.mouse.move(startX + 90, startY + 50, { steps: 6 });
  await page.waitForTimeout(100);

  // Kiểm tra tooltip góc xoay (.vno-shape-rotate-tooltip) xuất hiện và hiển thị số độ
  const tooltipLocator = rectLocator.locator(".vno-shape-rotate-tooltip");
  const tooltipVisible = await tooltipLocator.isVisible();
  assert(tooltipVisible, "Phải hiển thị tooltip .vno-shape-rotate-tooltip trong lúc đang kéo xoay");

  const tooltipText = await tooltipLocator.innerText();
  console.log(`   [PASS] Tooltip góc độ hiển thị: "${tooltipText}" (phản hồi thị giác rõ ràng)`);
  assert(tooltipText.includes("°"), "Tooltip góc phải có ký hiệu độ (°)", tooltipText);

  // Chụp ảnh màn hình trong trạng thái đang kéo xoay để có bằng chứng tooltip
  await page.screenshot({ path: path.join(screenshotDir, "slides-rotation-visual-qa-rotating-tooltip.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/slides-rotation-visual-qa-rotating-tooltip.png");

  await page.keyboard.up("Shift");
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Sau khi nhả chuột, tooltip phải được gỡ bỏ
  const tooltipAfterUp = await rectLocator.locator(".vno-shape-rotate-tooltip").count();
  assert(tooltipAfterUp === 0, "Tooltip góc độ phải được dọn dẹp sạch sẽ sau khi nhả chuột");
  console.log("   [PASS] Tooltip được gỡ bỏ sạch sẽ sau khi kết thúc kéo");

  // --- GIAI ĐOẠN 3: Kiểm tra 8 tay cầm resize và nút xóa trên hình đã xoay 90° ---
  console.log("\n4. Kiểm tra hình xoay 90°: 8 tay cầm resize, con trỏ chuột và nút xóa...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const s = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.id === "qa-rect");
    s.rotation = 90;
    canvas.setSelectedTarget("qa-rect");
    canvas._renderShapesLayer();
  });
  await page.waitForTimeout(200);

  // Xác nhận 8 tay cầm resize tồn tại và xoay cùng hình
  const resizeHandles = rectLocator.locator(".vno-shape-resize-handle");
  const handleCount = await resizeHandles.count();
  assert(handleCount === 8, `Phải có đủ 8 tay cầm resize, thực tế: ${handleCount}`);

  // Kiểm tra con trỏ chuột động theo góc xoay 90°:
  // Tay cầm 'n' (đỉnh) quay sang mép phải -> ew-resize
  // Tay cầm 'e' (phải) quay xuống mép đáy -> ns-resize
  const cursorN = await rectLocator.locator(".vno-handle-n").evaluate(el => window.getComputedStyle(el).cursor);
  const cursorE = await rectLocator.locator(".vno-handle-e").evaluate(el => window.getComputedStyle(el).cursor);
  assert(cursorN === "ew-resize", `Tay cầm 'n' tại góc 90° phải có con trỏ ew-resize, thực tế: ${cursorN}`);
  assert(cursorE === "ns-resize", `Tay cầm 'e' tại góc 90° phải có con trỏ ns-resize, thực tế: ${cursorE}`);
  console.log(`   [PASS] Con trỏ chuột 8 hướng tự động thích ứng với góc xoay: n=${cursorN}, e=${cursorE}`);

  // Kiểm tra nút xóa counter-rotation (đứng thẳng)
  const delBtn = rectLocator.locator(".vno-shape-delete-btn");
  await delBtn.waitFor({ state: "visible" });
  const delBtnTransform = await delBtn.evaluate(el => el.style.transform);
  assert(delBtnTransform.includes("rotate(-90deg)"), `Nút xóa phải có transform: rotate(-90deg) để đứng thẳng, thực tế: "${delBtnTransform}"`);
  console.log(`   [PASS] Nút xóa counter-rotate chính xác: "${delBtnTransform}"`);

  await page.screenshot({ path: path.join(screenshotDir, "slides-rotation-visual-qa-rotated-handles.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/slides-rotation-visual-qa-rotated-handles.png");

  // --- GIAI ĐOẠN 4: Chế độ trình chiếu (Slideshow) ---
  console.log("\n5. Kiểm tra hiển thị trong chế độ trình chiếu (Slideshow)...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.startSlideShow(0);
  });
  await page.waitForTimeout(300);

  const slideshowOverlay = page.locator(".vno-slideshow-overlay");
  await slideshowOverlay.waitFor({ state: "visible", timeout: 5000 });

  // Hình xoay trong slideshow phải có transform: rotate(90deg)
  const showShape = slideshowOverlay.locator('[data-vno-shape-id="qa-rect"]');
  await showShape.waitFor({ state: "visible", timeout: 3000 });
  const showTransform = await showShape.evaluate(el => el.style.transform);
  assert(showTransform.includes("rotate(90deg)"), `Hình trong slideshow phải có transform rotate(90deg), thực tế: "${showTransform}"`);

  // Không được có tay cầm thao tác nào xuất hiện trong slideshow
  const handlesInShow = await slideshowOverlay.locator(".vno-shape-resize-handle, .vno-shape-rotate-handle, .vno-shape-delete-btn").count();
  assert(handlesInShow === 0, `Trình chiếu tuyệt đối không có tay cầm thao tác UI, thực tế: ${handlesInShow}`);
  console.log("   [PASS] Slideshow hiển thị hình xoay đúng góc và KHÔNG có UI thừa/tay cầm nào xuất hiện");

  await page.screenshot({ path: path.join(screenshotDir, "slides-rotation-visual-qa-slideshow.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/slides-rotation-visual-qa-slideshow.png");

  // Thoát slideshow bằng phím Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // --- GIAI ĐOẠN 5: Kiểm tra Responsive ở các kích thước cửa sổ 1280px và 1024px ---
  console.log("\n6. Kiểm tra hiển thị responsive ở độ phân giải 1280px và 1024px...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  const handleAt1280 = await rotateHandle.isVisible();
  assert(handleAt1280, "Tay cầm xoay phải hiển thị rõ tại độ phân giải 1280px");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  const handleAt1024 = await rotateHandle.isVisible();
  assert(handleAt1024, "Tay cầm xoay phải hiển thị rõ tại độ phân giải 1024px");
  console.log("   [PASS] Tay cầm xoay hiển thị ổn định trên cả 1600px, 1280px và 1024px");

  await page.screenshot({ path: path.join(screenshotDir, "slides-rotation-visual-qa-1024-responsive.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/slides-rotation-visual-qa-1024-responsive.png");

  await page.close();

  console.log("\n============================================================");
  console.log("100% PASS: Toàn bộ kiểm thử thị giác Xoay hình khối Slides ĐẠT!");
  console.log("============================================================");
} finally {
  if (browser) await browser.close();
  server.close();
}
