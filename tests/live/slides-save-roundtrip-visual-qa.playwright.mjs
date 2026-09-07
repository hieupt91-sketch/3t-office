/**
 * VN Slides — Visual QA Playwright Test: Round-trip Lưu & Mở lại tệp PPTX thật
 *
 * Kiểm tra toàn diện theo TASK-BRIEF-SLIDES-SAVE-ROUNDTRIP.md:
 * 1. Mở Slides thật bằng Playwright (port riêng biệt).
 * 2. Tạo 3 hình khối: rect, ellipse, textbox.
 * 3. Dùng tay cầm xoay thật (.vno-shape-rotate-handle) với mouse drag + Shift để xoay:
 *    - Rect: xoay 30°
 *    - Ellipse: xoay 90°
 *    - Textbox: xoay 135°
 * 4. Chụp ảnh màn hình trước Lưu (toàn cảnh canvas + hình được chọn).
 * 5. Gọi luồng Lưu THẬT: serializeToFodp() -> Python script -> main.py save_document_dialog()
 *    -> soffice headless convert PPTX -> OOXML patch -> file .pptx thật.
 * 6. Gọi luồng Mở THẬT: main.py open_document_dialog() -> soffice headless convert FODP
 *    -> OOXML overlay -> payload thật.
 * 7. Tiêm payload vào app qua globalUnoBridge.openRealFile và gọi common.file.open từ UI Ribbon.
 * 8. Chụp ảnh màn hình sau khi Mở lại và so sánh:
 *    - Góc xoay có giữ đúng không (30°, 90°, 135°)?
 *    - Vị trí (x, y) và kích thước (w, h) có được bảo toàn?
 *    - Các tay cầm rotate và resize có hoạt động bình thường trên hình vừa mở lại (không bị đơ/đông cứng)?
 * 9. Lưu các ảnh chụp màn hình vào docs/screenshots/.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ROUNDTRIP_PORT || 8796);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
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
console.log(`Test server running at http://127.0.0.1:${port}`);

const screenshotDir = path.resolve(root, "docs/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

const fixtureDir = path.resolve(root, "tests/fixtures/slides-roundtrip");
fs.mkdirSync(fixtureDir, { recursive: true });

const assert = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
};

const approx = (a, b, tol = 1.5) => Math.abs(Number(a) - Number(b)) <= tol;

let browser;
try {
  browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  console.log("======================================================================");
  console.log("KIỂM THỬ THỊ GIÁC ROUND-TRIP LƯU FILE SLIDES (FODP -> PPTX -> FODP)");
  console.log("======================================================================");

  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    locale: "vi-VN"
  });

  const pageErrors = [];
  page.on("pageerror", err => {
    console.error("PAGEERROR:", err.message);
    pageErrors.push(err.message);
  });

  console.log("\n1. Mở ứng dụng VN Slides trên Edge Playwright...");
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);

  // Bước 1: Tạo 3 hình khối trên canvas trống
  console.log("\n2. Tạo 3 hình khối: Hình chữ nhật, Hình elip, Hộp văn bản...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const slide = canvas.slides[canvas.currentSlideIndex];
    slide.shapes = [
      { id: "shape-rect-30", type: "rect", x: 120, y: 120, w: 220, h: 140, color: "#2563eb", text: "Chữ nhật 30°" },
      { id: "shape-ellipse-90", type: "ellipse", x: 420, y: 120, w: 180, h: 180, color: "#10b981", text: "Elip 90°" },
      { id: "shape-textbox-135", type: "textbox", x: 680, y: 140, w: 220, h: 100, color: "transparent", text: "Hộp văn bản 135°" }
    ];
    canvas.setSelectedTarget(null);
    canvas._renderShapesLayer();
  });
  await page.waitForTimeout(300);

  const rectLocator = page.locator('[data-shape-id="shape-rect-30"]');
  const ellipseLocator = page.locator('[data-shape-id="shape-ellipse-90"]');
  const textboxLocator = page.locator('[data-shape-id="shape-textbox-135"]');

  await rectLocator.waitFor({ state: "visible" });
  await ellipseLocator.waitFor({ state: "visible" });
  await textboxLocator.waitFor({ state: "visible" });
  console.log("   [PASS] 3 hình khối đã render thành công trên canvas");

  // Hàm xoay hình bằng tay cầm xoay thật (.vno-shape-rotate-handle)
  async function rotateShapeWithHandle(shapeLocator, shapeId, targetAngle) {
    console.log(`   -> Đang xoay [${shapeId}] tới góc ${targetAngle}° bằng tay cầm xoay thật...`);
    // Chọn hình để tay cầm xoay xuất hiện
    await page.evaluate(async (id) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      globalUnoBridge.activeDocument.canvas.setSelectedTarget(id);
    }, shapeId);
    await page.waitForTimeout(200);

    const rotateHandle = shapeLocator.locator(".vno-shape-rotate-handle");
    await rotateHandle.waitFor({ state: "visible", timeout: 3000 });
    const handleBox = await rotateHandle.boundingBox();
    const shapeBox = await shapeLocator.boundingBox();
    assert(handleBox && shapeBox, `Không lấy được boundingBox của ${shapeId}`);

    const centerX = shapeBox.x + shapeBox.width / 2;
    const centerY = shapeBox.y + shapeBox.height / 2;

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Tính vector đích để đạt targetAngle:
    // angle = atan2(dy, dx) * 180 / PI + 90 => atan2 = targetAngle - 90
    const rad = (targetAngle - 90) * (Math.PI / 180);
    const radius = 130;
    const targetX = centerX + radius * Math.cos(rad);
    const targetY = centerY + radius * Math.sin(rad);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.keyboard.down("Shift");
    await page.mouse.move(targetX, targetY, { steps: 8 });
    await page.waitForTimeout(150);
    await page.keyboard.up("Shift");
    await page.mouse.up();
    await page.waitForTimeout(200);

    const actualAngle = await page.evaluate(async (id) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const s = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.id === id);
      return s ? s.rotation : undefined;
    }, shapeId);

    console.log(`      Kết quả xoay [${shapeId}]: target=${targetAngle}°, actual=${actualAngle}°`);
    assert(approx(actualAngle, targetAngle, 1), `Góc xoay của ${shapeId} phải xấp xỉ ${targetAngle}°, thực tế: ${actualAngle}`);
  }

  // Bước 2: Xoay 3 hình khối bằng tay cầm thật
  console.log("\n3. Thao tác kéo tay cầm xoay cho từng hình khối...");
  await rotateShapeWithHandle(rectLocator, "shape-rect-30", 30);
  await rotateShapeWithHandle(ellipseLocator, "shape-ellipse-90", 90);
  await rotateShapeWithHandle(textboxLocator, "shape-textbox-135", 135);

  // Chọn rect để hiển thị tay cầm trước lưu
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.setSelectedTarget("shape-rect-30");
  });
  await page.waitForTimeout(200);

  // Bước 3: Chụp ảnh màn hình TRƯỚC LƯU
  console.log("\n4. Chụp ảnh màn hình TRƯỚC LƯU...");
  const beforeCanvasPath = path.join(screenshotDir, "slides-roundtrip-01-before-save-canvas.png");
  const beforeSelectedPath = path.join(screenshotDir, "slides-roundtrip-02-before-save-selected.png");

  await page.screenshot({ path: beforeSelectedPath });
  console.log(`   [IMG] Đã lưu ảnh trước lưu (selected): ${beforeSelectedPath}`);

  // Bỏ chọn để chụp toàn cảnh sạch
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.setSelectedTarget(null);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: beforeCanvasPath });
  console.log(`   [IMG] Đã lưu ảnh trước lưu (toàn cảnh): ${beforeCanvasPath}`);

  // Ghi nhận trạng thái trước lưu để so sánh
  const beforeData = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const slide = canvas.slides[canvas.currentSlideIndex];
    return slide.shapes.map(s => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      rotation: s.rotation,
      text: s.text,
      color: s.color
    }));
  });
  console.log("   Dữ liệu hình trước lưu:", JSON.stringify(beforeData, null, 2));

  // Bước 4: Kích hoạt luồng Lưu THẬT qua Python Bridge & soffice
  console.log("\n5. Kích hoạt luồng Lưu THẬT (FODP -> PPTX) và Mở lại (PPTX -> FODP)...");
  const fodpContent = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.serializeToFodp();
  });
  assert(fodpContent && fodpContent.length > 500, "FODP serialized từ canvas không được rỗng");

  const inputFodpPath = path.join(fixtureDir, "slides-draft-input.fodp");
  const outputPptxPath = path.join(fixtureDir, "slides-saved-roundtrip.pptx");
  const outputPayloadJsonPath = path.join(fixtureDir, "slides-open-payload.json");

  fs.writeFileSync(inputFodpPath, fodpContent, "utf8");
  console.log(`   Đã ghi FODP đầu vào (${fodpContent.length} bytes): ${inputFodpPath}`);

  console.log("   Chạy scripts/slides_save_roundtrip_bridge.py...");
  execFileSync("python", [
    path.join(root, "scripts/slides_save_roundtrip_bridge.py"),
    inputFodpPath,
    outputPptxPath,
    outputPayloadJsonPath
  ], { stdio: "inherit" });

  assert(fs.existsSync(outputPptxPath) && fs.statSync(outputPptxPath).size > 1000, "Tệp PPTX thật không tồn tại hoặc rỗng");
  assert(fs.existsSync(outputPayloadJsonPath), "Payload JSON Mở lại không tồn tại");

  const openPayload = JSON.parse(fs.readFileSync(outputPayloadJsonPath, "utf8"));
  assert(openPayload.status === "ok", "Trạng thái open_payload không phải 'ok'");
  console.log(`   [PASS] Tệp PPTX thật tạo thành công: ${fs.statSync(outputPptxPath).size} bytes`);
  console.log(`   [PASS] Chuyển đổi ngược PPTX -> FODP thành công: ${openPayload.content.length} ký tự`);

  // Bước 5: Mở lại file .pptx vừa lưu vào app qua Playwright
  console.log("\n6. Tiêm payload FODP thật vào app và kích hoạt File -> Mở từ UI Ribbon...");
  await page.evaluate((mockPayload) => {
    window.__vno_live_roundtrip_payload = mockPayload;
    if (window.vnoUnoBridge) {
      window.vnoUnoBridge.openRealFile = async () => window.__vno_live_roundtrip_payload;
    }
    import("/adapters/libreoffice/common/uno-bridge.js").then(({ globalUnoBridge }) => {
      globalUnoBridge.openRealFile = async () => window.__vno_live_roundtrip_payload;
    });
  }, openPayload);

  // Bấm menu Tệp -> Mở tệp trên Ribbon thật
  await page.locator(".vno-ribbon-tab-file").click();
  await page.waitForTimeout(200);
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(1000);

  // Chờ canvas tải xong hình mới
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".vno-slide-canvas");
    const shapes = canvas ? canvas.querySelectorAll('[data-shape-id]') : [];
    return shapes.length >= 3;
  }, { timeout: 10000 });

  await page.waitForTimeout(500);

  // Bước 6: Chụp ảnh màn hình SAU KHI MỞ LẠI
  console.log("\n7. Chụp ảnh màn hình SAU KHI MỞ LẠI và đánh giá độ trung thực...");
  const afterCanvasPath = path.join(screenshotDir, "slides-roundtrip-03-after-open-canvas.png");
  await page.screenshot({ path: afterCanvasPath });
  console.log(`   [IMG] Đã lưu ảnh sau khi mở lại (toàn cảnh): ${afterCanvasPath}`);

  // Lấy dữ liệu các hình sau khi mở lại
  const afterData = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const slide = canvas.slides[canvas.currentSlideIndex];
    return slide.shapes.map(s => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      rotation: s.rotation,
      text: s.text,
      color: s.color
    }));
  });
  console.log("   Dữ liệu hình sau khi mở lại:", JSON.stringify(afterData, null, 2));

  // Kiểm tra chi tiết từng hình:
  // 1. Rect xoay 30°
  const rectAfter = afterData.find(s => String(s.id).includes("rect") || (s.text && s.text.includes("30")));
  assert(rectAfter, "Hình chữ nhật phải tồn tại sau round-trip PPTX");
  assert(typeof rectAfter.rotation === "number" && approx(rectAfter.rotation, 30, 1.5),
    `Góc xoay Rect sau round-trip: kỳ vọng ~30°, thực tế: ${rectAfter.rotation}`);
  assert(approx(rectAfter.x, 120, 20), `Vị trí X Rect: kỳ vọng ~120, thực tế: ${rectAfter.x}`);
  assert(approx(rectAfter.y, 120, 20), `Vị trí Y Rect: kỳ vọng ~120, thực tế: ${rectAfter.y}`);
  assert(approx(rectAfter.w, 220, 25), `Chiều rộng W Rect: kỳ vọng ~220, thực tế: ${rectAfter.w}`);
  assert(approx(rectAfter.h, 140, 25), `Chiều cao H Rect: kỳ vọng ~140, thực tế: ${rectAfter.h}`);
  console.log(`   [PASS] Rect xoay 30°: góc xoay giữ đúng ~${rectAfter.rotation.toFixed(1)}°, vị trí và kích thước bảo toàn.`);

  // 2. Ellipse xoay 90°
  const ellipseAfter = afterData.find(s => String(s.id).includes("ellipse") || (s.text && s.text.includes("90")));
  assert(ellipseAfter, "Hình elip phải tồn tại sau round-trip PPTX");
  assert(typeof ellipseAfter.rotation === "number" && approx(ellipseAfter.rotation, 90, 1.5),
    `Góc xoay Ellipse sau round-trip: kỳ vọng ~90°, thực tế: ${ellipseAfter.rotation}`);
  assert(approx(ellipseAfter.x, 420, 20), `Vị trí X Ellipse: kỳ vọng ~420, thực tế: ${ellipseAfter.x}`);
  assert(approx(ellipseAfter.y, 120, 20), `Vị trí Y Ellipse: kỳ vọng ~120, thực tế: ${ellipseAfter.y}`);
  assert(approx(ellipseAfter.w, 180, 25), `Chiều rộng W Ellipse: kỳ vọng ~180, thực tế: ${ellipseAfter.w}`);
  assert(approx(ellipseAfter.h, 180, 25), `Chiều cao H Ellipse: kỳ vọng ~180, thực tế: ${ellipseAfter.h}`);
  console.log(`   [PASS] Ellipse xoay 90°: góc xoay giữ đúng ~${ellipseAfter.rotation.toFixed(1)}°, vị trí và kích thước bảo toàn.`);

  // 3. Textbox xoay 135°
  const textboxAfter = afterData.find(s => String(s.id).includes("textbox") || (s.text && s.text.includes("135")));
  assert(textboxAfter, "Hộp văn bản phải tồn tại sau round-trip PPTX");
  assert(typeof textboxAfter.rotation === "number" && approx(textboxAfter.rotation, 135, 1.5),
    `Góc xoay Textbox sau round-trip: kỳ vọng ~135°, thực tế: ${textboxAfter.rotation}`);
  assert(approx(textboxAfter.x, 680, 20), `Vị trí X Textbox: kỳ vọng ~680, thực tế: ${textboxAfter.x}`);
  assert(approx(textboxAfter.y, 140, 20), `Vị trí Y Textbox: kỳ vọng ~140, thực tế: ${textboxAfter.y}`);
  assert(approx(textboxAfter.w, 220, 25), `Chiều rộng W Textbox: kỳ vọng ~220, thực tế: ${textboxAfter.w}`);
  assert(approx(textboxAfter.h, 100, 25), `Chiều cao H Textbox: kỳ vọng ~100, thực tế: ${textboxAfter.h}`);
  console.log(`   [PASS] Textbox xoay 135°: góc xoay giữ đúng ~${textboxAfter.rotation.toFixed(1)}°, vị trí và kích thước bảo toàn.`);

  // Bước 7: Kiểm tra tương tác trên hình vừa mở lại (tay cầm xoay & resize)
  console.log("\n8. Kiểm tra tương tác trên hình vừa mở lại (không bị đông cứng)...");
  const rectAfterId = rectAfter.id;
  await page.evaluate(async (id) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.setSelectedTarget(id);
  }, rectAfterId);
  await page.waitForTimeout(300);

  const rectAfterLocator = page.locator(`[data-shape-id="${rectAfterId}"]`);
  const rotateHandleAfter = rectAfterLocator.locator(".vno-shape-rotate-handle");
  const rotateStemAfter = rectAfterLocator.locator(".vno-shape-rotate-stem");
  await rotateHandleAfter.waitFor({ state: "visible", timeout: 3000 });
  await rotateStemAfter.waitFor({ state: "attached", timeout: 3000 });

  const resizeHandlesAfter = rectAfterLocator.locator(".vno-shape-resize-handle");
  const handleCountAfter = await resizeHandlesAfter.count();
  assert(handleCountAfter === 8, `Phải có đủ 8 tay cầm resize sau khi mở lại, thực tế: ${handleCountAfter}`);
  console.log(`   [PASS] Tay cầm xoay và đủ 8 tay cầm resize xuất hiện bình thường trên hình vừa mở lại.`);

  const afterSelectedPath = path.join(screenshotDir, "slides-roundtrip-04-after-open-selected.png");
  await page.screenshot({ path: afterSelectedPath });
  console.log(`   [IMG] Đã lưu ảnh hình được chọn sau khi mở lại: ${afterSelectedPath}`);

  // Thử tương tác: Xoay tiếp hình rect từ 30° sang 60°
  console.log("   -> Thử xoay tiếp hình rect vừa mở lại từ 30° sang 60°...");
  await rotateShapeWithHandle(rectAfterLocator, rectAfterId, 60);

  const angleAfterSecondRotate = await page.evaluate(async (id) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const s = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.id === id);
    return s ? s.rotation : undefined;
  }, rectAfterId);
  assert(approx(angleAfterSecondRotate, 60, 1.5), `Góc xoay sau tương tác lần 2 phải là 60°, thực tế: ${angleAfterSecondRotate}`);
  console.log(`   [PASS] Tương tác xoay tiếp hoạt động hoàn hảo: góc mới = ${angleAfterSecondRotate}°`);

  // Thử tương tác co giãn (resize) bằng kéo tay cầm 'se'
  console.log("   -> Thử co giãn (resize) hình rect vừa mở lại...");
  const seHandle = rectAfterLocator.locator(".vno-handle-se");
  const seBox = await seHandle.boundingBox();
  assert(seBox, "Không tìm thấy tay cầm se");
  await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(seBox.x + seBox.width / 2 + 40, seBox.y + seBox.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const rectDimensionsAfterResize = await page.evaluate(async (id) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const s = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.id === id);
    return s ? { w: s.w, h: s.h } : null;
  }, rectAfterId);
  console.log(`   Kích thước sau khi co giãn: w=${rectDimensionsAfterResize.w}, h=${rectDimensionsAfterResize.h}`);
  assert(rectDimensionsAfterResize.w !== rectAfter.w || rectDimensionsAfterResize.h !== rectAfter.h,
    "Kích thước hình phải thay đổi sau khi kéo tay cầm resize");
  console.log(`   [PASS] Tương tác co giãn (resize) trên hình vừa mở lại hoạt động bình thường, không bị đông cứng.`);

  const afterInteractionPath = path.join(screenshotDir, "slides-roundtrip-05-after-open-interaction.png");
  await page.screenshot({ path: afterInteractionPath });
  console.log(`   [IMG] Đã lưu ảnh sau tương tác: ${afterInteractionPath}`);

  console.log("\n======================================================================");
  console.log("100% PASS: Toàn bộ kiểm thử thị giác Round-trip Lưu & Mở Slides ĐẠT!");
  console.log("======================================================================");

} finally {
  if (browser) await browser.close();
  server.close();
}
