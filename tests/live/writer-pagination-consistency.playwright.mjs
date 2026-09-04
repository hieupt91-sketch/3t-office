import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_PAGINATION_PORT || 8789);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

let browser;
const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-body").waitFor();

  const cases = [
    { name: "A4 Portrait", setup: { size: "a4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 30, right: 15 } } },
    { name: "Letter Landscape", setup: { size: "letter", orientation: "landscape", margins: { top: 15, bottom: 15, left: 25, right: 25 } } }
  ];

  for (const testCase of cases) {
    const result = await page.evaluate(async ({ setup }) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      const body = document.querySelector(".vno-writer-body");
      const paragraph = "Cộng hòa xã hội chủ nghĩa Việt Nam. Nội dung kiểm thử phân trang được hiển thị bằng phông chữ và khoảng cách dòng thật trong trình duyệt Edge để đối chiếu khung soạn thảo với bản xem trước khi in.";
      body.innerHTML = Array.from({ length: 50 }, (_, index) => `<p>Đoạn ${index + 1}. ${paragraph}</p>`).join("");
      adapter.setPageSetup(setup);
      body.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      await new Promise(resolve => setTimeout(resolve, 400));

      const statusText = document.querySelector("#vno-status-docinfo")?.textContent || "";
      const livePages = Number(statusText.match(/Trang\s+\d+\s*\/\s*(\d+)/)?.[1] || 0);
      adapter.openPrintPreview();
      const overlay = document.querySelector(".vno-print-preview-overlay");
      const previewPages = Number(overlay?.dataset.pageCount || 0);
      const details = {
        livePages,
        previewPages,
        statusText,
        usableHeightPx: adapter.getPageDimensions().printableHeightPx,
        renderedParagraphHeightPx: body.querySelector("p")?.offsetHeight || 0
      };
      adapter.closePrintPreview();
      return details;
    }, testCase);

    assert(result.livePages >= 2, `${testCase.name}: tài liệu thật tràn nhiều trang`, JSON.stringify(result));
    assert(result.livePages === result.previewPages, `${testCase.name}: live pagination khớp Print Preview`, JSON.stringify(result));
  }
  assert(errors.length === 0, "Không có lỗi JavaScript trong trình duyệt", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
