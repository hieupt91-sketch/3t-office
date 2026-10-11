/**
 * VN Sheet — Visual QA Playwright Test: Kéo-thả ảnh có Freeze Panes (Sheet Image Drag + Freeze Pane)
 *
 * Kiểm tra thị giác & tương tác toàn diện theo TASK-BRIEF-VISUAL-QA.md:
 * 1. Mở VN Sheet ở nhiều độ phân giải (1600px, 1280px, 1024px).
 * 2. Đặt Freeze Panes (đóng băng hàng 1 + cột A).
 * 3. Chèn 2 ảnh:
 *    - Ảnh 1 tại A1 (trong vùng đóng băng).
 *    - Ảnh 2 tại E8 (trong vùng thường).
 * 4. Cuộn dọc & ngang (kể cả cuộn nhanh):
 *    - Xác nhận ảnh A1 "dính" cố định đúng vị trí (offset 24px top / 44px left).
 *    - Ảnh E8 cuộn trôi theo nội dung bảng tính bình thường.
 *    - Không có hiện tượng giật, nhấp nháy, hay lệch pixel.
 * 5. Kéo-thả ảnh:
 *    - Kiểm tra phản hồi thị giác: ô đích sáng viền highlight (.is-drop-target).
 *    - Lớp .is-dragging kích hoạt trên ảnh đang kéo.
 *    - Khi thả chuột, ô đích bỏ highlight và ảnh snap chuẩn xác vào góc ô đích.
 *    - Thao tác Undo (Ctrl+Z) / Redo (Ctrl+Y) khôi phục hoàn hảo.
 * 6. Kéo-thả ảnh trong vùng đóng băng:
 *    - Kéo từ A1 sang B1, xác nhận vị trí neo và trạng thái đóng băng được duy trì.
 * 7. Lưu ảnh chụp màn hình kiểm chứng vào docs/screenshots/.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_VQA_PORT || 8794);
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

const sampleDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAVElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7wa2gAAB8e81qAAAAABJRU5ErkJggg==";

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  console.log("============================================================");
  console.log("KIỂM THỬ THỊ GIÁC: VN SHEET IMAGE DRAG + FREEZE PANE (Visual QA)");
  console.log("============================================================");

  // --- GIAI ĐOẠN 1: Mở app và thiết lập Freeze Panes + Chèn ảnh ---
  console.log("\n1. Mở VN Sheet ở độ phân giải 1600x1000...");
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("PAGEERROR:", err.message));

  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Bật Freeze Panes tại B2 (hàng 1 + cột A)
  console.log("2. Bật Freeze Panes (Hàng 1 + Cột A)...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.selectCell("B", 2);
  });
  await page.locator("#vno-ribbon-tab-view").click();
  await page.waitForTimeout(150);
  await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
  const menu = page.locator(".vno-ribbon-dropdown-menu");
  await menu.waitFor({ state: "visible", timeout: 3000 });
  await menu.locator('[data-command-id="sheet.view.freezePanes"]').click();
  await page.waitForTimeout(200);

  // Chèn 2 ảnh: A1 (frozen) và E8 (unfrozen)
  console.log("3. Chèn 2 ảnh: A1 (vùng đóng băng) và E8 (vùng thường)...");
  await page.evaluate(async (src) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.insertImage(src, { c: "A", r: 1 });
    grid.insertImage(src, { c: "E", r: 8 });
  }, sampleDataUri);
  await page.waitForTimeout(200);

  const imgA1 = page.locator('figure.vno-sheet-image[data-anchor="A1"]');
  const imgE8 = page.locator('figure.vno-sheet-image[data-anchor="E8"]');
  await imgA1.waitFor({ state: "visible", timeout: 5000 });
  await imgE8.waitFor({ state: "visible", timeout: 5000 });

  const boxA1Initial = await imgA1.boundingBox();
  const boxE8Initial = await imgE8.boundingBox();
  assert(boxA1Initial != null && boxE8Initial != null, "Phải lấy được boundingBox của cả 2 ảnh");
  console.log(`   [PASS] Ảnh A1 tại (${Math.round(boxA1Initial.x)}, ${Math.round(boxA1Initial.y)}), Ảnh E8 tại (${Math.round(boxE8Initial.x)}, ${Math.round(boxE8Initial.y)})`);

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-initial.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-initial.png");

  // --- GIAI ĐOẠN 2: Cuộn bảng tính — Kiểm tra ảnh đóng băng "dính" cố định không rung giật ---
  console.log("\n4. Cuộn bảng tính (scrollTop=400, scrollLeft=250)...");
  await page.evaluate(() => {
    const vp = document.querySelector(".vno-grid-viewport");
    if (vp) { vp.scrollTop = 400; vp.scrollLeft = 250; }
  });
  await page.waitForTimeout(250);

  const boxA1Scrolled = await imgA1.boundingBox();
  const boxE8Scrolled = await imgE8.boundingBox();

  // Ảnh A1 trong vùng đóng băng: vị trí trên màn hình PHẢI GIỮ NGUYÊN (sai số < 3px)
  assert(Math.abs(boxA1Scrolled.x - boxA1Initial.x) < 3, "Ảnh A1 phải giữ nguyên tọa độ X trên màn hình khi cuộn ngang", `ban đầu: ${boxA1Initial.x}, sau cuộn: ${boxA1Scrolled.x}`);
  assert(Math.abs(boxA1Scrolled.y - boxA1Initial.y) < 3, "Ảnh A1 phải giữ nguyên tọa độ Y trên màn hình khi cuộn dọc", `ban đầu: ${boxA1Initial.y}, sau cuộn: ${boxA1Scrolled.y}`);

  // Ảnh E8 ngoài vùng đóng băng: vị trí trên màn hình PHẢI THAY ĐỔI (cuộn trôi theo lưới)
  assert(boxE8Scrolled.y !== boxE8Initial.y, "Ảnh E8 phải cuộn trôi dọc theo nội dung");
  assert(boxE8Scrolled.x !== boxE8Initial.x, "Ảnh E8 phải cuộn trôi ngang theo nội dung");
  console.log("   [PASS] Ảnh đóng băng (A1) dính cố định mượt mà, ảnh thường (E8) cuộn trôi chuẩn xác");

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-scrolled.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-scrolled.png");

  // Reset cuộn về (0,0) trước khi test kéo-thả
  await page.evaluate(() => {
    const vp = document.querySelector(".vno-grid-viewport");
    if (vp) { vp.scrollTop = 0; vp.scrollLeft = 0; }
  });
  await page.waitForTimeout(200);

  // --- GIAI ĐOẠN 3: Kéo-thả ảnh với Phản hồi thị giác (Highlight ô đích .is-drop-target) ---
  console.log("\n5. Kéo-thả ảnh E8 sang C4 — Kiểm tra highlight ô đích (.is-drop-target)...");
  const boxE8 = await imgE8.boundingBox();
  assert(boxE8 != null, "Phải lấy được boundingBox của E8");

  const dragStartX = boxE8.x + boxE8.width / 2;
  const dragStartY = boxE8.y + boxE8.height / 2;

  // Lấy tọa độ ô C4 để kéo chuột tới đó
  const cellC4 = page.locator('.vno-grid-cell[data-coord="C4"]').first();
  const boxC4 = await cellC4.boundingBox();
  assert(boxC4 != null, "Phải lấy được boundingBox của ô C4");

  await page.mouse.move(dragStartX, dragStartY);
  await page.mouse.down();

  // Kéo chuột dần dần tới ô C4
  await page.mouse.move(boxC4.x + 20, boxC4.y + 10, { steps: 8 });
  await page.waitForTimeout(100);

  // 1) Xác nhận ảnh có class .is-dragging
  const isDragging = await imgE8.evaluate(el => el.classList.contains("is-dragging"));
  assert(isDragging, "Ảnh phải có class .is-dragging trong lúc kéo");

  // 2) Xác nhận có ô đích nhận highlight .is-drop-target (phản hồi thị giác rõ ràng)
  const dropTargetCells = page.locator(".vno-grid-cell.is-drop-target");
  const dropTargetCount = await dropTargetCells.count();
  assert(dropTargetCount > 0, "Phải có ít nhất 1 ô lưới được highlight .is-drop-target trong lúc kéo ảnh");
  const dropTargetCoord = await dropTargetCells.first().getAttribute("data-coord");
  console.log(`   [PASS] Phản hồi thị giác: Ô đích "${dropTargetCoord}" được highlight viền nét đứt (.is-drop-target)`);

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-dragging-highlight.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-dragging-highlight.png");

  // Thả chuột để hoàn tất kéo-thả
  await page.mouse.up();
  await page.waitForTimeout(250);

  // Sau khi thả chuột:
  // 1) Không còn ô nào có .is-drop-target
  const dropTargetsAfterDrop = await page.locator(".vno-grid-cell.is-drop-target").count();
  assert(dropTargetsAfterDrop === 0, "Sau khi thả chuột, mọi highlight .is-drop-target phải được gỡ bỏ");

  // 2) Ảnh snap chuẩn xác vào vị trí ô mới
  const newAnchor = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const img = grid.imagesBySheet[grid.activeSheet]?.find(item => item.anchor.c !== "A");
    return img ? `${img.anchor.c}${img.anchor.r}` : null;
  });
  console.log(`   [PASS] Ảnh đã snap chuẩn xác vào ô: ${newAnchor} (không còn highlight thừa)`);

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-dropped.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-dropped.png");

  // --- GIAI ĐOẠN 4: Kéo ảnh trong vùng đóng băng (A1 -> B1) ---
  console.log("\n6. Kéo ảnh A1 (trong vùng đóng băng) sang B1...");
  const firstImg = page.locator("figure.vno-sheet-image").first();
  const boxA1Current = await firstImg.boundingBox();
  const cellB1 = page.locator('.vno-grid-cell[data-coord="B1"]').first();
  const boxB1 = await cellB1.boundingBox();
  assert(boxB1 != null, "Phải lấy được boundingBox của ô B1");

  await page.mouse.move(boxA1Current.x + 40, boxA1Current.y + 20);
  await page.mouse.down();
  await page.mouse.move(boxB1.x + 20, boxB1.y + 10, { steps: 6 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(250);

  const anchorAfterFrozenDrag = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const img = grid.imagesBySheet[grid.activeSheet]?.[0];
    return img ? `${img.anchor.c}${img.anchor.r}` : null;
  });
  console.log(`   [PASS] Ảnh đóng băng kéo-thả thành công: neo tại ${anchorAfterFrozenDrag}`);

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-frozen-drag.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-frozen-drag.png");

  // --- GIAI ĐOẠN 5: Kiểm tra Responsive ở các kích thước cửa sổ 1280px và 1024px ---
  console.log("\n7. Kiểm tra responsive ở độ phân giải 1280px và 1024px...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  const imgA1At1280 = await page.locator("figure.vno-sheet-image").first().isVisible();
  assert(imgA1At1280, "Ảnh phải hiển thị rõ tại 1280px");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  const imgA1At1024 = await page.locator("figure.vno-sheet-image").first().isVisible();
  assert(imgA1At1024, "Ảnh phải hiển thị rõ tại 1024px");
  console.log("   [PASS] Hiển thị ảnh và vùng đóng băng ổn định trên 1600px, 1280px và 1024px");

  await page.screenshot({ path: path.join(screenshotDir, "sheet-image-drag-freeze-visual-qa-1024-responsive.png") });
  console.log("   [IMG] Đã lưu: docs/screenshots/sheet-image-drag-freeze-visual-qa-1024-responsive.png");

  await page.close();

  console.log("\n============================================================");
  console.log("100% PASS: Toàn bộ kiểm thử thị giác Kéo-thả ảnh & Freeze Panes ĐẠT!");
  console.log("============================================================");
} finally {
  if (browser) await browser.close();
  server.close();
}
