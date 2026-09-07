/**
 * Live: VN Writer — Placeholder gợi ý "Nhấp để nhập tiêu đề đầu/chân trang"
 * KHÔNG được rò rỉ vào bản in thật.
 *
 * Lỗi thật đã xác nhận: common.file.print gọi thẳng window.print() trên DOM
 * sống (writer-adapter.js's print()), chỉ dựa vào CSS @media print - không đi
 * qua getPageDimensions()'s hasHeader/hasFooter check như Print Preview
 * (Ctrl+F2) hay Backstage In (cả 2 nơi đó vốn đã đúng). CSS @media print
 * trước đây không ẩn khối .vno-writer-header:empty::before /
 * .vno-writer-footer:empty::before / .vno-note-text:empty::before, khiến
 * placeholder (chỉ để hỗ trợ soạn thảo) bị in thành nội dung thật khi header/
 * footer/chú thích còn để trống. Test dùng page.emulateMedia({media:"print"})
 * thay vì mở dialog in thật (không thể assert nội dung PDF hệ điều hành sinh
 * ra), nhưng đây chính xác là CSS engine mà window.print() áp dụng.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_PRINT_PLACEHOLDER_PORT || 8948);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
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

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="writer"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const header = document.querySelector(".vno-writer-header");
    const footer = document.querySelector(".vno-writer-footer");
    if (header) header.innerHTML = "";
    if (footer) footer.innerHTML = "";
  });

  const screenContent = await page.evaluate(() => {
    const header = document.querySelector(".vno-writer-header");
    return getComputedStyle(header, "::before").content;
  });
  assert(screenContent.includes("Nhấp để nhập tiêu đề"), "Màn hình soạn thảo phải còn thấy placeholder (đúng thiết kế hỗ trợ soạn thảo)", screenContent);

  await page.emulateMedia({ media: "print" });
  const printContent = await page.evaluate(() => {
    const header = document.querySelector(".vno-writer-header");
    const footer = document.querySelector(".vno-writer-footer");
    return {
      header: getComputedStyle(header, "::before").content,
      footer: getComputedStyle(footer, "::before").content
    };
  });
  assert(printContent.header === "none" || printContent.header === '""', "Khi in thật (window.print()) placeholder header phải bị ẩn tuyệt đối", printContent.header);
  assert(printContent.footer === "none" || printContent.footer === '""', "Khi in thật (window.print()) placeholder footer phải bị ẩn tuyệt đối", printContent.footer);

  console.log("PASS: Placeholder đầu/chân trang hiện đúng khi soạn thảo (screen), ẩn tuyệt đối khi in thật (print media) — không còn rò rỉ vào bản in.");
} finally {
  await browser?.close();
  server.close();
}
