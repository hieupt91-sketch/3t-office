/** Live Writer illustration dialogs. Uses Playwright mouse clicks; never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_ILLUSTRATION_DIALOGS_PORT || 8834);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.join(root, path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\]*\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { response.writeHead(404); response.end("404"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  });
});

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?app=writer`, { waitUntil: "networkidle" });

  await page.locator('.vno-shell[data-app="writer"]').waitFor();
  const writer = page.locator(".vno-writer-body");
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await writer.click();
  await page.locator("#vno-ribbon-tab-insert").click();

  // Cancel: Hình khối opens dialog, Hủy inserts nothing
  await page.locator('[data-command-id="writer.shape.insert"]').click();
  const shapeDialog = page.locator(".vno-dialog-overlay").filter({ has: page.locator("#vno-shape-dialog-title") });
  await shapeDialog.waitFor();
  check(await shapeDialog.locator('[data-shape-type="circle"]').count() > 0, "Hộp Chèn hình khối liệt kê thẻ Hình tròn");
  await shapeDialog.locator(".vno-dialog-cancel-btn").click();
  await shapeDialog.waitFor({ state: "detached" });
  check(await page.locator(".vno-writer-shape-item").count() === 0, "Hủy Hình khối không chèn gì");

  // Shape: pick circle, confirm canvas type
  await page.locator('[data-command-id="writer.shape.insert"]').click();
  await shapeDialog.waitFor();
  await shapeDialog.locator('[data-shape-type="circle"]').click();
  await shapeDialog.locator(".vno-dialog-ok-btn").click();
  await page.locator('.vno-writer-shape-item[data-shape-type="circle"]').waitFor();
  const circleCount = await page.locator('.vno-writer-shape-item[data-shape-type="circle"]').count();
  const rectCount = await page.locator('.vno-writer-shape-item[data-shape-type="rectangle"]').count();
  check(circleCount === 1, "Chèn Hình khối → chọn circle → canvas có đúng hình tròn", `circle=${circleCount}`);
  check(rectCount === 0, "Không chèn chữ nhật mặc định khi đã chọn circle");
  check(await page.locator('.vno-writer-shape-item[data-shape-type="circle"] ellipse').count() > 0, "SVG circle dùng ellipse");

  // Diagram: pick cycle
  await writer.click();
  await page.locator('[data-command-id="writer.diagram.insert"]').click();
  const diagramDialog = page.locator(".vno-dialog-overlay").filter({ has: page.locator("#vno-diagram-dialog-title") });
  await diagramDialog.waitFor();
  await diagramDialog.locator('[data-diagram-type="cycle"]').click();
  await diagramDialog.locator("#vno-diagram-count-input").fill("5");
  await diagramDialog.locator(".vno-dialog-ok-btn").click();
  await writer.locator('.vno-writer-diagram[data-diagram-type="cycle"]').waitFor();
  const cycleHtml = await writer.locator('.vno-writer-diagram[data-diagram-type="cycle"]').innerHTML();
  const cycleNodes = await writer.locator('.vno-writer-diagram[data-diagram-type="cycle"] .vno-diagram-node').count();
  check(cycleNodes === 5, "Chèn Sơ đồ → chọn Chu trình 5 bước", `nodes=${cycleNodes}`);
  check(!cycleHtml.includes("data-diagram-type=\"process\""), "Không chèn Process mặc định");
  check(cycleHtml.includes("↻"), "Sơ đồ chu trình có dấu ↻");

  // Chart: pick pie with live data
  await writer.click();
  await page.locator('[data-command-id="writer.chart.insert"]').click();
  const chartDialog = page.locator(".vno-dialog-overlay").filter({ has: page.locator("#vno-chart-dialog-title") });
  await chartDialog.waitFor();
  await chartDialog.locator("#vno-chart-title-input").fill("Doanh thu");
  await chartDialog.locator("#vno-chart-type-select").selectOption("pie");
  await chartDialog.locator(".vno-dialog-ok-btn").click();
  await writer.locator(".vno-writer-chart").waitFor();
  const chartType = await writer.locator(".vno-writer-chart svg").getAttribute("data-chart-type");
  const chartText = await writer.locator(".vno-writer-chart").innerText();
  check(chartType === "pie", "Chèn Biểu đồ → chọn Tròn (pie)", `type=${chartType}`);
  check(chartText.includes("Doanh thu"), "Biểu đồ mang tiêu đề đã nhập");
  check(!chartText.includes("Không có dữ liệu"), "Không chèn biểu đồ cột trống mặc định");

  // Undo/Redo of last insert (chart)
  await page.keyboard.press("Control+z");
  check(await writer.locator(".vno-writer-chart").count() === 0, "Ctrl+Z gỡ biểu đồ vừa chèn qua dialog");
  await page.keyboard.press("Control+y");
  check(await writer.locator(".vno-writer-chart svg[data-chart-type='pie']").count() === 1, "Ctrl+Y khôi phục pie");

  check(pageErrors.length === 0, "Không có lỗi trang", pageErrors.join(" | "));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`FAILED ${failures.length}: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("PASS: Writer illustration dialogs live checks");
