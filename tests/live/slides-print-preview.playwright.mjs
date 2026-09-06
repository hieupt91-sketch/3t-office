/**
 * Live: VN Slides Print Preview (Ctrl+F2) + in thật (Ctrl+P) — mở overlay thật,
 * xác nhận trang Ẩn (Hide Slide) không bị in, điều hướng nhiều trang, và xác
 * nhận print() dựng lại #vno-slides-print-only từ toàn bộ deck thật, không chỉ
 * slide đang active trên canvas. Cổng riêng, không đụng các live test khác.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_PRINT_PREVIEW_PORT || 8934);
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
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  // Dựng một deck thật 4 trang, 1 trang bị Ẩn, để xác nhận Print Preview/print()
  // loại đúng trang Ẩn - hành vi mặc định thật của PowerPoint.
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [
      { id: 1, title: "Mở đầu thật", body: "Nội dung mở đầu thật", layoutType: "title-content", shapes: [], comments: [], hidden: false },
      { id: 2, title: "Trang bị ẩn", body: "Không được xuất hiện khi in", layoutType: "title-content", shapes: [], comments: [], hidden: true },
      { id: 3, title: "Nội dung chính thật", body: "Số liệu quan trọng thật", layoutType: "title-content", shapes: [], comments: [], hidden: false }
    ];
    canvas.selectSlide(0);
    canvas._renderThumbnails?.();
  });

  // 1) Ctrl+F2 mở Xem trước khi in — overlay thật, nội dung thật, đúng 2 trang (loại slide ẩn)
  await page.keyboard.press("Control+F2");
  const overlay = page.locator(".vno-slides-print-preview-overlay");
  await overlay.waitFor({ state: "visible", timeout: 5000 });
  assert((await overlay.locator(".vno-slides-pp-total").innerText()) === "2", "Phải có đúng 2 trang (3 slide, 1 slide ẩn bị loại)");
  const page1Text = await overlay.innerText();
  assert(page1Text.includes("Mở đầu thật"), "Trang 1 phải hiển thị đúng nội dung thật", page1Text.slice(0, 200));

  // 2) Điều hướng sang trang 2 phải là "Nội dung chính thật", KHÔNG phải slide ẩn
  await overlay.locator(".vno-slides-pp-next").click();
  assert((await overlay.locator(".vno-slides-pp-current").innerText()) === "2", "Phải chuyển sang trang 2");
  const page2Text = await overlay.locator(".vno-slides-print-preview-page").innerText();
  assert(page2Text.includes("Nội dung chính thật"), "Trang 2 phải là slide thứ 3 thật (slide ẩn bị bỏ qua)", page2Text);
  assert(!page2Text.includes("Trang bị ẩn"), "Slide bị ẩn không được xuất hiện trong Preview", page2Text);

  // 3) Nút In trong overlay gọi window.print() thật
  await overlay.locator(".vno-slides-pp-print").click();
  const callsAfterOverlayPrint = await page.evaluate(() => window.__printCalls);
  assert(callsAfterOverlayPrint === 1, "Nút In trong Preview phải gọi window.print() đúng 1 lần", String(callsAfterOverlayPrint));

  await page.keyboard.press("Escape");
  await overlay.waitFor({ state: "detached", timeout: 5000 });

  // 4) Ctrl+P (in thật qua toolbar) phải dựng #vno-slides-print-only với ĐÚNG số trang
  //    từ TOÀN BỘ deck thật, không phải chỉ slide đang active trên canvas sống.
  const printOnlyInfo = await page.evaluate(async () => {
    document.querySelector(".vno-quick-btn[data-cmd='common.file.print']")?.click();
    await new Promise(r => setTimeout(r, 50));
    const printOnly = document.querySelector("#vno-slides-print-only");
    return {
      pageCount: printOnly?.querySelectorAll(".vno-slides-print-page").length ?? -1,
      text: printOnly?.textContent ?? ""
    };
  });
  assert(printOnlyInfo.pageCount === 2, "common.file.print (Ctrl+P) phải render đúng 2 trang thật (loại slide ẩn)", String(printOnlyInfo.pageCount));
  assert(printOnlyInfo.text.includes("Mở đầu thật") && printOnlyInfo.text.includes("Nội dung chính thật") && !printOnlyInfo.text.includes("Trang bị ẩn"),
    "Nội dung in thật phải đúng 2 slide không ẩn, không phải slide đang active trên canvas sống", printOnlyInfo.text.slice(0, 300));

  console.log("PASS: Slides Print Preview (Ctrl+F2) mở overlay thật, loại đúng slide Ẩn, điều hướng được, và in thật (Ctrl+P) dựng đủ deck từ dữ liệu thật");
} finally {
  await browser?.close();
  server.close();
}
