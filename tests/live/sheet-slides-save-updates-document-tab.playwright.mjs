/**
 * Live: Sau khi Lưu file thật thành công trong Sheet và Slides, nhãn tên
 * tệp trên tab đầu cửa sổ PHẢI cập nhật đúng tên tệp vừa lưu — giống hành
 * vi đã sửa cho Writer (docs/HANDOFF-WRITER-SAVE-FLOW-UI-QA.md). Trước đây
 * SheetAdapter.save()/SlidesAdapter.save() không gọi resetDocumentChrome()
 * sau khi lưu thành công, nên nhãn tab vẫn giữ tên demo/mẫu cũ dù đã lưu ra
 * tệp khác.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_SLIDES_SAVE_TAB_PORT || 8952);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

const cases = [
  { app: "sheet", savedName: "Báo cáo doanh thu Q3.xlsx" },
  { app: "slides", savedName: "Kế hoạch phát triển 2026.pptx" }
];

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });

  for (const { app, savedName } of cases) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/?app=${app}`, { waitUntil: "load" });
    await page.locator(`.vno-shell[data-app="${app}"]`).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    const before = await page.locator(".vno-doc-tab span").textContent();
    const savedDest = `C:/TaiLieu/${savedName}`;

    // KHÔNG await adapter.save() bên trong evaluate() — save() nội bộ await
    // showAlertDialog() (hộp thoại "Đã lưu"), chỉ resolve khi người dùng bấm
    // nút trong hộp thoại đó. Nếu await ở đây, evaluate() không bao giờ trả
    // về được vì không ai bấm dialog cả -> deadlock. Gọi KHÔNG chờ, để
    // save() tự chạy nền, rồi xử lý dialog từ bên ngoài như thao tác thật.
    await page.evaluate(({ dest }) => {
      window.__lastSaveRecord = null;
      return import("/adapters/libreoffice/common/uno-bridge.js").then(({ globalUnoBridge }) => {
        globalUnoBridge.saveRealFile = async (appKind, content, targetFormat, suggestedName) => {
          window.__lastSaveRecord = { appKind, targetFormat, suggestedName };
          return { status: "ok", message: `Đã lưu tại ${dest}`, path: dest };
        };
        globalUnoBridge.activeDocument.save();
      });
    }, { dest: savedDest });
    await page.waitForTimeout(300);
    // Đóng hộp thoại "Đã lưu" nếu có.
    const dialogVisible = await page.locator(".vno-dialog-overlay").count();
    if (dialogVisible) await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const record = await page.evaluate(() => window.__lastSaveRecord);

    const after = await page.locator(".vno-doc-tab span").textContent();
    assert(after === savedName, `[${app}] Nhãn tab cập nhật đúng tên tệp sau khi Lưu`, `before="${before}" after="${after}" expected="${savedName}"`);
    assert(record?.appKind === app, `[${app}] saveRealFile nhận đúng appKind`, JSON.stringify(record));
    assert(errors.length === 0, `[${app}] Không có lỗi JS trong quá trình Lưu`, errors.join(" | "));
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`\nSheet/Slides cập nhật tab sau khi Lưu: ${failures.length === 0 ? "ALL PASS" : `${failures.length} FAIL`}`);
if (failures.length) process.exitCode = 1;
