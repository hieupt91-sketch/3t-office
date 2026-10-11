/**
 * Live Playwright Test: VN Sheet Backstage Print Live Preview Thumbnail
 * 
 * Kiểm tra trải nghiệm thực tế trên trình duyệt thật (Edge/Chromium):
 * 1. Mở Sheet, nhập dữ liệu bảng tính.
 * 2. Mở File (Backstage) -> chọn tab "In ấn".
 * 3. Hiển thị panel In trong Backstage với khung xem trước THẬT (live thumbnail DOM của Sheet).
 * 4. Kiểm tra tài liệu 1 trang: thanh điều hướng trang bị ẩn.
 * 5. Bơm dữ liệu nhiều trang: thanh điều hướng hiển thị đúng (1 / N), nút Trước/Sau hoạt động chuẩn.
 * 6. Bấm "Trang sau" -> trang 2 cập nhật nội dung thật tương ứng.
 * 7. Bấm "In ngay" -> Backstage đóng lại và lệnh in thật (window.print) được kích hoạt.
 * 8. Chuyển đổi qua lại giữa tab Trang chủ và In ấn dọn dẹp sạch sẽ, không lỗi DOM.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_BACKSTAGE_PRINT_PORT || 8936);
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

  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Nhập dữ liệu 1 trang
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.cellsData.set("A1", { val: "Tên", formula: "", style: {} });
    grid.cellsData.set("B1", { val: "Điểm", formula: "", style: {} });
    grid.cellsData.set("A2", { val: "Trần Văn Bình", formula: "", style: {} });
    grid.cellsData.set("B2", { val: "10.0", formula: "", style: {} });
    grid.printAreaBySheet[grid.activeSheet] = "A1:B2";
  });

  // --- KỊCH BẢN 1: Mở Backstage, chọn In ấn với tài liệu 1 trang ---
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

  // Kiểm tra bảng dữ liệu thật đã được render vào khung xem trước
  const previewTable = page.locator(".vno-backstage-print-panel .vno-sheet-print-table");
  await previewTable.waitFor({ state: "visible", timeout: 5000 });
  const previewText = await previewTable.innerText();
  assert(previewText.includes("Trần Văn Bình"), "Thumbnail xem trước phải hiển thị dữ liệu bảng tính thật", previewText);

  // Với tài liệu 1 trang, thanh điều hướng trang phải bị ẩn
  const navControls = page.locator(".vno-backstage-print-nav");
  const isNavHidden = await navControls.evaluate(el => el.style.display === "none");
  assert(isNavHidden, "Thanh điều hướng trang trước/sau phải ẩn đối với tài liệu chỉ có 1 trang");

  // Đóng Backstage
  await page.locator(".vno-backstage-back-btn").click();
  await modal.waitFor({ state: "hidden", timeout: 5000 });

  // --- KỊCH BẢN 2: Tài liệu nhiều trang (80 hàng) ---
  const { totalPages: expectedPages, firstRowOfPage2 } = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    for (let r = 1; r <= 80; r++) {
      grid.cellsData.set(`A${r}`, { val: `Mục dữ liệu ${r}`, formula: "", style: {} });
    }
    grid.printAreaBySheet[grid.activeSheet] = "A1:A80";
    const result = grid.computePrintPages();
    return { totalPages: result.totalPages, firstRowOfPage2: result.pages[1]?.rowNums[0] };
  });
  assert(expectedPages > 1, "Tiền đề: 80 hàng phải phân thành nhiều hơn 1 trang", String(expectedPages));

  // Mở lại Backstage và chọn In ấn
  await page.locator(".vno-ribbon-tab-file").click();
  await modal.waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#vno-backstage-nav-print").click();
  await printView.waitFor({ state: "visible", timeout: 5000 });

  // Thanh điều hướng phải hiển thị
  await navControls.waitFor({ state: "visible", timeout: 5000 });
  const indicator = page.locator(".vno-backstage-print-page-indicator");
  const indicatorText = await indicator.innerText();
  assert(indicatorText.includes(`1 / ${expectedPages}`), "Chỉ số trang phải hiển thị trang 1 trên tổng số trang", indicatorText);

  // Nút Trước bị vô hiệu hóa ở trang 1
  const prevBtn = page.locator(".vno-backstage-print-prev-btn");
  const nextBtn = page.locator(".vno-backstage-print-next-btn");
  assert(await prevBtn.isDisabled(), "Nút Trang trước phải bị disabled ở trang 1");
  assert(!(await nextBtn.isDisabled()), "Nút Trang sau phải khả dụng");

  // Bấm Trang sau -> chuyển sang trang 2
  await nextBtn.click();
  const indicatorText2 = await indicator.innerText();
  assert(indicatorText2.includes(`2 / ${expectedPages}`), "Chỉ số trang phải cập nhật lên trang 2", indicatorText2);
  assert(!(await prevBtn.isDisabled()), "Nút Trang trước phải khả dụng ở trang 2");

  const page2Content = await previewTable.innerText();
  assert(page2Content.includes(`Mục dữ liệu ${firstRowOfPage2}`), "Thumbnail trang 2 phải cập nhật hiển thị hàng đầu trang 2", page2Content.slice(0, 100));

  // Bấm Trang trước -> quay lại trang 1
  await prevBtn.click();
  const indicatorText1 = await indicator.innerText();
  assert(indicatorText1.includes(`1 / ${expectedPages}`), "Chỉ số trang phải quay lại trang 1", indicatorText1);
  const page1Content = await previewTable.innerText();
  assert(page1Content.includes("Mục dữ liệu 1"), "Thumbnail trang 1 phải hiển thị hàng đầu trang 1", page1Content.slice(0, 100));

  // --- KỊCH BẢN 3: Chuyển đổi qua lại tab trong Backstage ---
  const homeNavBtn = page.locator("#vno-backstage-nav-home");
  await homeNavBtn.click();
  assert(await page.locator("#vno-backstage-home-view").isVisible(), "Home view phải hiển thị khi bấm tab Trang chủ");
  assert(await printView.isHidden(), "Print view phải bị ẩn khi chọn tab Trang chủ");

  // Bấm lại tab In ấn
  await page.locator("#vno-backstage-nav-print").click();
  assert(await printView.isVisible(), "Print view phải hiển thị trở lại");
  const reloadedTable = page.locator(".vno-backstage-print-panel .vno-sheet-print-table");
  assert(await reloadedTable.isVisible(), "Thumbnail bảng in phải được dựng lại chuẩn xác");

  // --- KỊCH BẢN 4: Bấm nút 'In ngay' (Print Now) ---
  const printNowBtn = page.locator(".vno-backstage-print-now-btn");
  await printNowBtn.waitFor({ state: "visible", timeout: 5000 });
  await printNowBtn.click();

  // Modal Backstage phải tự động đóng
  await modal.waitFor({ state: "hidden", timeout: 5000 });

  // Lệnh in thật (window.print) được kích hoạt
  await page.waitForTimeout(200);
  const printCalls = await page.evaluate(() => window.__printCalls);
  assert(printCalls >= 1, "Bấm 'In ngay' trong Backstage phải kích hoạt lệnh in thật (window.print)", String(printCalls));

  console.log("PASS: Sheet Backstage Print Live Preview Thumbnail — hiển thị DOM thật, phân trang đúng, điều hướng chuẩn, và 'In ngay' kích hoạt in thật thành công!");
} finally {
  await browser?.close();
  server.close();
}
