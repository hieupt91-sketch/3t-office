/**
 * Live: File > Mới (tài liệu trắng, chưa từng lưu ra đĩa) KHÔNG được ghi vào
 * Recent Files. Lỗi thật suýt lọt qua review: khi thêm resetDocumentChrome()
 * ghi Recent Files cho luồng Lưu (docs/HANDOFF-WRITER-SAVE-FLOW-UI-QA.md),
 * lời gọi bị đặt chung trong resetDocumentChrome() — hàm này CŨNG được gọi
 * bởi File > Mới (tài liệu trắng "Tài liệu 1.docx"), nên mỗi lần bấm Mới sẽ
 * đẩy một mục giả lên đầu Recent Files, đè lên tệp thật đã mở/lưu trước đó.
 * Test này xác nhận resetDocumentChrome(name, "home", false) — tham số thứ 3
 * — chặn đúng trường hợp này: bấm Mới nhiều lần liên tiếp KHÔNG được làm
 * Recent Files phình to hay đổi mục đầu danh sách.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_FILE_NEW_RECENT_PORT || 8951);
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

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await page.waitForTimeout(300);
  const tabAfterNew = await page.locator(".vno-doc-tab span").textContent();
  assert(tabAfterNew === "Tài liệu 1.docx", "File > Mới đổi đúng tên tab thành tài liệu trắng", tabAfterNew);

  // Chốt mốc SAU lần bấm Mới đầu tiên (đã ổn định, kể cả ghi chú nền không
  // liên quan như tài liệu demo) — từ đây trở đi, bấm Mới thêm KHÔNG ĐƯỢC
  // làm danh sách đổi khác, vì tài liệu trắng chưa từng lưu ra đĩa.
  const baseline = await page.evaluate(() => JSON.parse(localStorage.getItem("vno_recent_documents") || "[]"));
  assert(!baseline.some(r => r.name === "Tài liệu 1.docx"), "Không có mục 'Tài liệu 1.docx' giả nào lọt vào Recent Files", JSON.stringify(baseline));

  for (let i = 0; i < 2; i++) {
    await page.locator(".vno-ribbon-tab-file").click();
    await page.locator('[data-backstage-cmd="common.file.new"]').click();
    await page.waitForTimeout(200);
  }
  const afterRepeatedClicks = await page.evaluate(() => JSON.parse(localStorage.getItem("vno_recent_documents") || "[]"));
  assert(JSON.stringify(afterRepeatedClicks) === JSON.stringify(baseline),
    "Bấm Mới nhiều lần liên tiếp không làm đổi Recent Files so với mốc",
    `baseline=${JSON.stringify(baseline)} after=${JSON.stringify(afterRepeatedClicks)}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`\nFile > Mới không làm bẩn Recent Files: ${failures.length === 0 ? "ALL PASS" : `${failures.length} FAIL`}`);
if (failures.length) process.exitCode = 1;
