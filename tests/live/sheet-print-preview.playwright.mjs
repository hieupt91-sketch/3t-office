/**
 * Live: VN Sheet Print Preview (Ctrl+F2) + in thật (Ctrl+P) — mở overlay thật,
 * xác nhận nội dung/số trang thật, điều hướng nhiều trang, và xác nhận print()
 * dựng lại #vno-sheet-print-only từ cellsData thay vì DOM ảo hóa đang hiển thị.
 * Cổng riêng để không đụng các cổng live test khác đang dùng (8930/8932...).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_PRINT_PREVIEW_PORT || 8933);
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

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.addInitScript(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  const typeCell = async (coord, value) => {
    await page.locator(`.vno-grid-cell[data-coord="${coord}"]`).click();
    await page.keyboard.type(String(value));
    await page.keyboard.press("Enter");
  };

  await typeCell("A1", "Tên");
  await typeCell("B1", "Điểm");
  await typeCell("A2", "Nguyễn Văn An");
  await typeCell("B2", "9.5");

  // Đặt vùng in tường minh A1:B2 - không dựa vào vùng in tự suy luận (mặc định
  // pad tới tối thiểu 8 cột x 25 hàng khi chưa đặt Print Area), để phép so sánh
  // "1 trang" bên dưới tất định thay vì phụ thuộc heuristic riêng.
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.printAreaBySheet[grid.activeSheet] = "A1:B2";
  });

  // 1) Ctrl+F2 mở Xem trước khi in — overlay thật, nội dung ô thật
  await page.keyboard.press("Control+F2");
  const overlay = page.locator(".vno-sheet-print-preview-overlay");
  await overlay.waitFor({ state: "visible", timeout: 5000 });
  const previewText = await overlay.innerText();
  assert(previewText.includes("Nguyễn Văn An"), "Preview phải hiển thị đúng dữ liệu ô thật vừa gõ", previewText.slice(0, 200));
  assert((await overlay.locator(".vno-sheet-pp-total").innerText()) === "1", "Vùng dữ liệu nhỏ phải chỉ có 1 trang");

  // 2) Nút In trong overlay gọi window.print() thật (đã stub đếm số lần gọi)
  await overlay.locator(".vno-sheet-pp-print").click();
  const callsAfterOverlayPrint = await page.evaluate(() => window.__printCalls);
  assert(callsAfterOverlayPrint === 1, "Nút In trong Preview phải gọi window.print() đúng 1 lần", String(callsAfterOverlayPrint));

  // 3) Đóng bằng Esc
  await page.keyboard.press("Escape");
  await overlay.waitFor({ state: "detached", timeout: 5000 });

  // 4) Dữ liệu vượt 1 trang: bơm 80 hàng thật vào grid rồi mở lại Preview, xác nhận nhiều trang + điều hướng
  const { totalPages: expectedPages, firstRowOfPage2 } = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    for (let r = 1; r <= 80; r++) {
      grid.cellsData.set(`A${r}`, { val: `Dòng ${r}`, formula: "", style: {} });
    }
    grid.printAreaBySheet[grid.activeSheet] = "A1:A80";
    const result = grid.computePrintPages();
    return { totalPages: result.totalPages, firstRowOfPage2: result.pages[1]?.rowNums[0] };
  });
  assert(expectedPages > 1, "Tiền đề: 80 hàng phải vượt quá 1 trang A4", String(expectedPages));

  await page.keyboard.press("Control+F2");
  await overlay.waitFor({ state: "visible", timeout: 5000 });
  assert((await overlay.locator(".vno-sheet-pp-total").innerText()) === String(expectedPages),
    "Overlay phải hiển thị đúng tổng số trang tính từ computePrintPages()");
  assert((await overlay.locator(".vno-sheet-pp-current").innerText()) === "1", "Phải bắt đầu ở trang 1");

  await overlay.locator(".vno-sheet-pp-next").click();
  assert((await overlay.locator(".vno-sheet-pp-current").innerText()) === "2", "Nút Trang sau phải chuyển sang trang 2");
  const page2Text = await overlay.locator(".vno-sheet-print-preview-page").innerText();
  assert(page2Text.includes(`Dòng ${firstRowOfPage2}`), "Trang 2 phải hiển thị đúng hàng dữ liệu thật đầu trang (từ computePrintPages)", page2Text.slice(0, 100));

  await overlay.locator(".vno-sheet-pp-prev").click();
  assert((await overlay.locator(".vno-sheet-pp-current").innerText()) === "1", "Nút Trang trước phải quay lại trang 1");

  await page.keyboard.press("Escape");
  await overlay.waitFor({ state: "detached", timeout: 5000 });

  // 5) Ctrl+P (in thật qua toolbar) phải dựng #vno-sheet-print-only với ĐÚNG số trang,
  //    không phải chỉ gọi window.print() suông trên DOM ảo hóa đang hiển thị dở dang.
  const printOnlyPageCount = await page.evaluate(async () => {
    document.querySelector(".vno-quick-btn[data-cmd='common.file.print']")?.click();
    await new Promise(r => setTimeout(r, 50));
    return document.querySelectorAll("#vno-sheet-print-only .vno-sheet-print-page").length;
  });
  assert(printOnlyPageCount === expectedPages, "common.file.print (Ctrl+P) phải render đủ số trang thật trước khi in", String(printOnlyPageCount));

  console.log("PASS: Sheet Print Preview (Ctrl+F2) mở overlay thật, phân trang đúng, điều hướng được, và in thật (Ctrl+P) dựng đủ trang từ cellsData");
} finally {
  await browser?.close();
  server.close();
}
