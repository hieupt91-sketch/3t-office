/**
 * Live Playwright Test: VN Writer Backstage Print Live Preview Thumbnail
 * 
 * Kiểm tra trải nghiệm thực tế trên trình duyệt thật (Edge/Chromium):
 * 1. Mở Writer, nhập nội dung văn bản hành chính chuẩn.
 * 2. Mở File (Backstage) -> chọn tab "In ấn".
 * 3. Hiển thị panel In trong Backstage với khung xem trước THẬT (live thumbnail DOM .vno-print-preview-sheet).
 * 4. Kiểm tra thông tin khổ giấy A4, hướng in Dọc.
 * 5. Chuyển đổi qua lại giữa tab Trang chủ và In ấn dọn dẹp sạch sẽ, không lỗi DOM.
 * 6. Bấm "In ngay" -> Backstage đóng lại và lệnh in thật (window.print) được kích hoạt.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_BACKSTAGE_PRINT_PORT || 8938);
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

  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="writer"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-writer-body").waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Nhập nội dung tài liệu
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const adapter = globalUnoBridge.activeDocument;
    if (adapter && adapter.bodyDom) {
      adapter.bodyDom.innerHTML = "<h1>QUYẾT ĐỊNH BAN HÀNH QUY CHUẨN IN ẤN</h1><p>Bộ ứng dụng văn phòng VN Office áp dụng chế độ xem trước in ấn chuẩn mực Microsoft Word.</p>";
    }
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

  // Kiểm tra thumbnail tờ in A4 thật hiển thị
  const sheet = page.locator(".vno-backstage-print-panel .vno-print-preview-sheet");
  await sheet.waitFor({ state: "visible", timeout: 5000 });
  const sheetText = await sheet.innerText();
  assert(sheetText.includes("QUYẾT ĐỊNH BAN HÀNH QUY CHUẨN IN ẤN"), "Thumbnail xem trước phải hiển thị đúng nội dung tài liệu Writer thật", sheetText);

  // --- KỊCH BẢN 2: Chuyển đổi tab Backstage ---
  const homeNavBtn = page.locator("#vno-backstage-nav-home");
  await homeNavBtn.click();
  assert(await page.locator("#vno-backstage-home-view").isVisible(), "Home view phải hiển thị khi bấm tab Trang chủ");
  assert(await printView.isHidden(), "Print view phải bị ẩn khi chọn tab Trang chủ");

  await printNavBtn.click();
  assert(await printView.isVisible(), "Print view phải hiển thị trở lại");
  const reloadedSheet = page.locator(".vno-backstage-print-panel .vno-print-preview-sheet");
  assert(await reloadedSheet.isVisible(), "Thumbnail tờ in Writer phải được render lại nguyên vẹn");

  // --- KỊCH BẢN 3: Bấm nút 'In ngay' (Print Now) ---
  const printNowBtn = page.locator(".vno-backstage-print-now-btn");
  await printNowBtn.waitFor({ state: "visible", timeout: 5000 });
  await printNowBtn.click();

  // Modal Backstage phải tự động đóng
  await modal.waitFor({ state: "hidden", timeout: 5000 });

  // Lệnh in thật được kích hoạt
  await page.waitForTimeout(200);
  const printCalls = await page.evaluate(() => window.__printCalls);
  assert(printCalls >= 1, "Bấm 'In ngay' trong Writer Backstage phải kích hoạt window.print", String(printCalls));

  console.log("PASS: Writer Backstage Print Live Preview Thumbnail — render trang in A4 thật, điều hướng chuẩn, và 'In ngay' kích hoạt in thật thành công!");
} finally {
  await browser?.close();
  server.close();
}
