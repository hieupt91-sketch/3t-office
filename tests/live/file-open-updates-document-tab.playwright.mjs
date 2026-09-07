/**
 * Live: Sau khi Mở tệp thật (File → Mở) thành công, nhãn tên tệp trên tab đầu
 * cửa sổ (VÀ ribbon quay về tab Home) PHẢI cập nhật đúng tên tệp vừa mở —
 * KHÔNG được giữ nguyên tên tài liệu demo/mẫu cũ.
 *
 * Lỗi thật đã xác nhận bằng cách mở VN Office Desktop App thật với đối số
 * dòng lệnh trỏ tới một tệp XLSX thật: dữ liệu nạp đúng 100% (đã xác minh
 * qua log Python `open_document_dialog` trả về content thật), nhưng nhãn
 * tên tệp trên tab vẫn hiển thị "Dự toán kinh phí VN Office 2026.xlsx" (tài
 * liệu demo mặc định) vì `resetDocumentChrome()` (adapter cả 3 app đều có
 * sẵn hàm này, dùng cho File → Mới/Đóng) trước đây KHÔNG BAO GIỜ được gọi
 * sau khi `open()` thành công.
 *
 * Test này giả lập kết quả `openRealFile()` (stub `globalUnoBridge`, không
 * cần soffice/pywebview thật) và xác nhận tab cập nhật đúng cho cả 3 app.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_FILE_OPEN_TAB_PORT || 8950);
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

  const cases = [
    { app: "sheet", fileName: "Sữa chữa UB quảng trạch.xlsx", contentKey: "content", extra: {} },
    { app: "writer", fileName: "Hợp đồng sửa chữa.docx", contentKey: "content", extra: {} },
    { app: "slides", fileName: "Báo cáo quý.pptx", contentKey: "content", extra: {} }
  ];

  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
    page.on("pageerror", error => console.error("PAGEERROR", error.message));
    await page.goto(`http://127.0.0.1:${port}/?app=${testCase.app}`, { waitUntil: "load" });
    await page.locator(`.vno-shell[data-app="${testCase.app}"]`).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => document.querySelector(".vno-doc-tab span")?.textContent || "");

    // Giả lập File -> Mở thành công bằng cách stub globalUnoBridge.openRealFile
    // (không cần soffice/pywebview thật - chỉ kiểm tra UI cập nhật đúng sau khi
    // adapter.open() nhận được result.status === "ok").
    await page.evaluate(async ({ app, fileName, sampleContent }) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      globalUnoBridge.openRealFile = async () => ({ status: "ok", fileName, content: sampleContent });
      const adapter = globalUnoBridge.activeDocument;
      await adapter.open();
    }, { app: testCase.app, fileName: testCase.fileName, sampleContent: testCase.app === "writer" ? "<p>test</p>" : "<office:document/>" });
    await page.waitForTimeout(200);

    const after = await page.evaluate(() => document.querySelector(".vno-doc-tab span")?.textContent || "");
    assert(after === testCase.fileName, `[${testCase.app}] Tab phải cập nhật đúng tên tệp vừa mở`, `before=${before} after=${after} expected=${testCase.fileName}`);
    assert(after !== before, `[${testCase.app}] Tab không được giữ nguyên tên demo cũ sau khi mở tệp thật`, `before=${before}`);

    await page.close();
    console.log(`PASS [${testCase.app}]: tab cập nhật đúng "${before}" -> "${after}"`);
  }

  console.log("PASS: Cả 3 app (Writer/Sheet/Slides) đều cập nhật đúng nhãn tên tệp trên tab sau khi Mở tệp thật.");
} finally {
  await browser?.close();
  server.close();
}
