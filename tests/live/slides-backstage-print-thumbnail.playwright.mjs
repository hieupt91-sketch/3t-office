/**
 * Live Playwright Test: VN Slides Backstage Print Live Preview Thumbnail
 * 
 * Kiểm tra trải nghiệm thực tế trên trình duyệt thật (Edge/Chromium):
 * 1. Mở Slides, nạp deck gồm nhiều trang chiếu (có trang ẩn).
 * 2. Mở File (Backstage) -> chọn tab "In ấn".
 * 3. Hiển thị panel In trong Backstage với khung xem trước THẬT (live thumbnail DOM của Slide).
 * 4. Kiểm tra phân trang và loại bỏ slide ẩn (3 slide, 1 ẩn -> hiển thị 2 trang).
 * 5. Thanh điều hướng hiển thị đúng (1 / 2), nút Trước/Sau hoạt động chuẩn.
 * 6. Bấm "Trang sau" -> chuyển sang slide 3 thật, không hiển thị slide ẩn.
 * 7. Chuyển đổi qua lại giữa tab Trang chủ và In ấn dọn dẹp sạch sẽ, không lỗi DOM.
 * 8. Bấm "In ngay" -> Backstage đóng lại và lệnh in thật (window.print) được kích hoạt.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_BACKSTAGE_PRINT_PORT || 8937);
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
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) { res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("403"); return; }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("404 Not Found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise((resolve, reject) => { server.listen(port, "127.0.0.1", resolve); server.on("error", reject); });

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
  page.on("pageerror", error => console.error("PAGEERROR", error.message));

  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls++; };
  });

  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Cấu hình deck 3 trang, 1 trang ẩn
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [
      { id: 1, title: "Chiến lược số 2026", body: "Nội dung mở đầu thật", layoutType: "title-content", shapes: [], comments: [], hidden: false },
      { id: 2, title: "Slide nháp bí mật", body: "Không in trang này", layoutType: "title-content", shapes: [], comments: [], hidden: true },
      { id: 3, title: "Kết quả kinh doanh", body: "Tăng trưởng vượt bậc", layoutType: "title-content", shapes: [], comments: [], hidden: false }
    ];
    canvas.selectSlide(0);
    canvas._renderThumbnails?.();
  });

  // --- KỊCH BẢN 1: Mở Backstage, chọn In ấn ---
  await page.locator(".vno-ribbon-tab-file").click();
  const modal = page.locator(".vno-backstage-overlay");
  await modal.waitFor({ state: "visible", timeout: 5000 });

  const printNavBtn = page.locator("#vno-backstage-nav-print");
  await printNavBtn.waitFor({ state: "visible", timeout: 5000 });
  await printNavBtn.click();

  // Kiểm tra view chuyển sang Print
  const printView = page.locator("#vno-backstage-print-view");
  await printView.waitFor({ state: "visible", timeout: 5000 });
  assert(await page.locator("#vno-backstage-home-view").isHidden(), "Home view phải bị ẩn khi chọn tab In");

  // Kiểm tra thumbnail slide thật hiển thị
  const surface = page.locator(".vno-backstage-print-panel .vno-slides-print-surface");
  await surface.waitFor({ state: "visible", timeout: 5000 });
  const surfaceText = await surface.innerText();
  assert(surfaceText.includes("Chiến lược số 2026"), "Thumbnail xem trước phải hiển thị tiêu đề slide thật", surfaceText);

  // Kiểm tra số trang in: 3 slide nhưng 1 ẩn => chỉ có 2 trang
  const indicator = page.locator(".vno-backstage-print-page-indicator");
  const indicatorText = await indicator.innerText();
  assert(indicatorText.includes("1 / 2"), "Chỉ số trang phải là 1 / 2 vì slide 2 bị ẩn", indicatorText);

  // Nút Trước bị vô hiệu hóa ở slide đầu
  const prevBtn = page.locator("#vno-backstage-print-prev");
  const nextBtn = page.locator("#vno-backstage-print-next");
  assert(await prevBtn.isDisabled(), "Nút Trang trước phải disabled ở trang 1");
  assert(!(await nextBtn.isDisabled()), "Nút Trang sau phải khả dụng");

  // --- KỊCH BẢN 2: Điều hướng trang sau ---
  await nextBtn.click();
  const indicatorText2 = await indicator.innerText();
  assert(indicatorText2.includes("2 / 2"), "Chỉ số trang phải cập nhật lên 2 / 2", indicatorText2);
  assert(!(await prevBtn.isDisabled()), "Nút Trang trước phải khả dụng ở trang 2");
  assert(await nextBtn.isDisabled(), "Nút Trang sau phải disabled ở trang cuối");

  const surfaceText2 = await surface.innerText();
  assert(surfaceText2.includes("Kết quả kinh doanh"), "Trang 2 phải hiển thị slide 3 thật", surfaceText2);
  assert(!surfaceText2.includes("Slide nháp bí mật"), "Slide bị ẩn không được xuất hiện trong bản in", surfaceText2);

  // Bấm quay lại trang 1
  await prevBtn.click();
  const indicatorText1 = await indicator.innerText();
  assert(indicatorText1.includes("1 / 2"), "Chỉ số trang phải quay lại 1 / 2", indicatorText1);
  const surfaceText1 = await surface.innerText();
  assert(surfaceText1.includes("Chiến lược số 2026"), "Trang 1 phải hiển thị lại slide 1", surfaceText1);

  // --- KỊCH BẢN 3: Chuyển đổi tab Backstage ---
  const homeNavBtn = page.locator("#vno-backstage-nav-home");
  await homeNavBtn.click();
  assert(await page.locator("#vno-backstage-home-view").isVisible(), "Home view phải hiển thị khi bấm tab Trang chủ");
  assert(await printView.isHidden(), "Print view phải bị ẩn khi chọn tab Trang chủ");

  await printNavBtn.click();
  assert(await printView.isVisible(), "Print view phải hiển thị trở lại");
  const reloadedSurface = page.locator(".vno-backstage-print-panel .vno-slides-print-surface");
  assert(await reloadedSurface.isVisible(), "Thumbnail slide phải được render lại nguyên vẹn");

  // --- KỊCH BẢN 4: Bấm nút 'In ngay' (Print Now) ---
  const printNowBtn = page.locator(".vno-backstage-print-now-btn");
  await printNowBtn.waitFor({ state: "visible", timeout: 5000 });
  await printNowBtn.click();

  // Modal Backstage phải tự động đóng
  await modal.waitFor({ state: "hidden", timeout: 5000 });

  // Lệnh in thật được kích hoạt
  await page.waitForTimeout(200);
  const printCalls = await page.evaluate(() => window.__printCalls);
  assert(printCalls >= 1, "Bấm 'In ngay' trong Slides Backstage phải kích hoạt window.print", String(printCalls));

  console.log("PASS: Slides Backstage Print Live Preview Thumbnail — render slide DOM thật, loại slide ẩn, điều hướng chuẩn, và 'In ngay' kích hoạt in thật thành công!");
} finally {
  await browser?.close();
  server.close();
}
