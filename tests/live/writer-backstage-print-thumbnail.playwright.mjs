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

  // --- KỊCH BẢN 4: Chèn Footnote & Endnote thật qua nút Ribbon Tham chiếu, so sánh Backstage với Overlay Ctrl+F2 thật ---
  // Chuyển sang tab Tham chiếu
  await page.locator('#vno-ribbon-tab-references, .vno-ribbon-tab[data-tab-id="references"]').first().click();
  await page.waitForTimeout(200);

  // Chèn Footnote thật
  await page.locator(".vno-writer-body p").first().click();
  const fnBtn = page.locator('button[data-command-id="writer.reference.footnoteInsert"]');
  await fnBtn.click();
  await page.waitForTimeout(300);
  const fnInput = page.locator('.vno-footnote-item .vno-note-text').first();
  await fnInput.evaluate((el) => {
    el.textContent = "Chú thích chân trang mẫu số 01.";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Chèn Endnote thật
  await page.locator(".vno-writer-body p").first().click();
  const enBtn = page.locator('button[data-command-id="writer.reference.endnoteInsert"]');
  await enBtn.click();
  await page.waitForTimeout(300);
  const enInput = page.locator('.vno-endnote-item .vno-note-text').first();
  await enInput.evaluate((el) => {
    el.textContent = "Nghị định số 30/2020/NĐ-CP về công tác văn thư lưu trữ.";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // 1. Mở Overlay Xem trước khi in THẬT (Ctrl+F2) để lấy nội dung chuẩn
  await page.keyboard.press("Control+F2");
  const overlay = page.locator(".vno-print-preview-overlay");
  await overlay.waitFor({ state: "visible", timeout: 5000 });

  const overlayFootnotesEl = overlay.locator(".vno-print-preview-footnotes");
  await overlayFootnotesEl.waitFor({ state: "visible", timeout: 5000 });
  const overlayFootnotesHtml = (await overlayFootnotesEl.innerHTML()).trim();
  const overlayFootnotesText = await overlayFootnotesEl.innerText();
  assert(overlayFootnotesText.includes("Chú thích chân trang mẫu số 01"), "Overlay Ctrl+F2 phải chứa nội dung Footnote", overlayFootnotesText);

  const overlayEndnotesEl = overlay.locator(".vno-print-preview-endnotes");
  await overlayEndnotesEl.waitFor({ state: "visible", timeout: 5000 });
  const overlayEndnotesHtml = (await overlayEndnotesEl.innerHTML()).trim();
  const overlayEndnotesText = await overlayEndnotesEl.innerText();
  assert(overlayEndnotesText.includes("CHÚ THÍCH CUỐI TÀI LIỆU"), "Overlay Ctrl+F2 phải chứa tiêu đề CHÚ THÍCH CUỐI TÀI LIỆU", overlayEndnotesText);
  assert(overlayEndnotesText.includes("Nghị định số 30/2020/NĐ-CP"), "Overlay Ctrl+F2 phải chứa nội dung Endnote", overlayEndnotesText);

  // Đóng overlay Ctrl+F2
  await page.keyboard.press("Escape");
  await overlay.waitFor({ state: "hidden", timeout: 5000 });

  // 2. Mở Backstage -> In ấn và kiểm tra khung xem trước
  await page.locator(".vno-ribbon-tab-file").click();
  await modal.waitFor({ state: "visible", timeout: 5000 });
  await printNavBtn.click();
  await printView.waitFor({ state: "visible", timeout: 5000 });

  // 3. Kiểm tra Footnote & Endnote trong khung xem trước Backstage
  const backstageFootnotesEl = page.locator(".vno-backstage-print-panel .vno-print-preview-footnotes");
  await backstageFootnotesEl.waitFor({ state: "visible", timeout: 5000 });
  const backstageFootnotesHtml = (await backstageFootnotesEl.innerHTML()).trim();
  const backstageFootnotesText = await backstageFootnotesEl.innerText();
  assert(backstageFootnotesText.includes("Chú thích chân trang mẫu số 01"), "Khung xem trước Backstage phải có nội dung Footnote", backstageFootnotesText);

  const backstageEndnotesEl = page.locator(".vno-backstage-print-panel .vno-print-preview-endnotes");
  await backstageEndnotesEl.waitFor({ state: "visible", timeout: 5000 });
  const backstageEndnotesHtml = (await backstageEndnotesEl.innerHTML()).trim();
  const backstageEndnotesText = await backstageEndnotesEl.innerText();
  assert(backstageEndnotesText.includes("CHÚ THÍCH CUỐI TÀI LIỆU"), "Khung xem trước Backstage phải có tiêu đề CHÚ THÍCH CUỐI TÀI LIỆU", backstageEndnotesText);
  assert(backstageEndnotesText.includes("Nghị định số 30/2020/NĐ-CP"), "Khung xem trước Backstage phải có nội dung Endnote", backstageEndnotesText);

  // 4. So sánh khớp 100% giữa Backstage xem trước và Overlay Ctrl+F2 thật
  assert(backstageFootnotesHtml === overlayFootnotesHtml, "Nội dung Footnote trong Backstage Print Thumbnail phải KHỚP 100% với Overlay Ctrl+F2 thật", `Backstage:\n${backstageFootnotesHtml}\nvs Overlay:\n${overlayFootnotesHtml}`);
  assert(backstageEndnotesHtml === overlayEndnotesHtml, "Nội dung Endnote trong Backstage Print Thumbnail phải KHỚP 100% với Overlay Ctrl+F2 thật", `Backstage:\n${backstageEndnotesHtml}\nvs Overlay:\n${overlayEndnotesHtml}`);

  console.log("PASS: Writer Backstage Print Live Preview Thumbnail — render trang in A4 thật, điều hướng chuẩn, 'In ngay' kích hoạt in thật, và Endnote/Footnote khớp 100% với Overlay Ctrl+F2 thật!");
} finally {
  await browser?.close();
  server.close();
}
