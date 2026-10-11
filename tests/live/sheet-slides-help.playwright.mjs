import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_SLIDES_HELP_PORT || 8843);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "domcontentloaded" });
  await page.locator(".vno-sheet-container").waitFor({ state: "visible", timeout: 20000 });

  await page.locator("#vno-ribbon-tab-help").click();
  await page.locator('[data-command-id="sheet.help.open"]').waitFor({ state: "visible", timeout: 5000 });
  check(await page.locator('[data-command-id="sheet.help.open"]').isVisible(), "Sheet: nút Trợ giúp hiện trên tab Trợ giúp");
  await page.locator('[data-command-id="sheet.help.open"]').click();
  const sheetHelp = page.locator("#vno-help-panel");
  await sheetHelp.waitFor({ state: "visible", timeout: 5000 });
  check(await sheetHelp.isVisible(), "Sheet: panel Trợ giúp mở được từ ribbon");

  await page.locator("#vno-help-search").fill("bảng tổng hợp");
  await page.waitForTimeout(120);
  await page.locator('#vno-help-panel [data-help-id="sheet.data.pivotTable"]').click();
  const pivotArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(pivotArticle.includes("Bảng tổng hợp") && pivotArticle.includes("Dữ liệu"), "Sheet: tìm 'bảng tổng hợp' ra đúng bài và tab", pivotArticle.slice(0, 200));
  check(pivotArticle.includes("Đọc tên cột") && pivotArticle.includes("Tạo Pivot Table"), "Sheet: bài Pivot mô tả đúng hộp thoại hiện có", pivotArticle.slice(0, 280));

  await page.locator("#vno-help-search").fill("dinh dang o");
  await page.waitForTimeout(120);
  await page.locator('#vno-help-panel [data-help-id="sheet.format.cellsDialog"]').click();
  const formatArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(formatArticle.includes("Định dạng ô (Format Cells)") && formatArticle.includes("Ctrl+1"), "Sheet: tìm không dấu 'dinh dang o' ra Format Cells", formatArticle.slice(0, 200));

  const sheetErrors = [...pageErrors];
  pageErrors.length = 0;

  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "domcontentloaded" });
  await page.locator(".vno-slides-studio").waitFor({ state: "visible", timeout: 20000 });

  await page.locator("#vno-ribbon-tab-help").click();
  await page.locator('[data-command-id="slides.help.open"]').waitFor({ state: "visible", timeout: 5000 });
  check(await page.locator('[data-command-id="slides.help.open"]').isVisible(), "Slides: nút Trợ giúp hiện trên tab Trợ giúp");
  await page.locator('[data-command-id="slides.help.open"]').click();
  const slidesHelp = page.locator("#vno-help-panel");
  await slidesHelp.waitFor({ state: "visible", timeout: 5000 });
  check(await slidesHelp.isVisible(), "Slides: panel Trợ giúp mở được từ ribbon");

  await page.locator("#vno-help-search").fill("sơ đồ");
  await page.waitForTimeout(120);
  await page.locator('#vno-help-panel [data-help-id="slides.diagram.insert"]').click();
  const diagramArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(diagramArticle.includes("sơ đồ") && diagramArticle.includes("Chèn"), "Slides: tìm 'sơ đồ' ra đúng bài SmartArt", diagramArticle.slice(0, 200));
  check(diagramArticle.includes("Danh sách theo bước") && diagramArticle.includes("Minh họa"), "Slides: bài Sơ đồ ghi đúng nhóm ribbon và kiểu dialog", diagramArticle.slice(0, 280));

  await page.locator("#vno-help-search").fill("an trang");
  await page.waitForTimeout(120);
  await page.locator('#vno-help-panel [data-help-id="slides.slide.toggleHidden"]').click();
  const hideArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(hideArticle.includes("Ẩn trang chiếu") && hideArticle.includes("Trình chiếu"), "Slides: tìm không dấu 'an trang' ra Hide Slide", hideArticle.slice(0, 200));

  check(sheetErrors.length === 0, "Sheet: không có lỗi runtime trang", sheetErrors.join(" | "));
  check(pageErrors.length === 0, "Slides: không có lỗi runtime trang", pageErrors.join(" | "));
} catch (error) {
  check(false, "Live Playwright chạy được", error.message);
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`FAILED ${failures.length}: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("LIVE PASS sheet-slides-help");
