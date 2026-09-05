/** Live Slides Chart proof. Uses Playwright APIs only; never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_CHART_PORT || 8813);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
const server = http.createServer((request, response) => {
  const requestPath = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.join(rootDir, path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\]*\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { response.writeHead(404); response.end("404"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  });
});
const assert = (condition, message) => { if (!condition) throw new Error(message); };

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.locator("#vno-ribbon-tab-insert").click();
  await page.locator('[data-command-id="slides.insert.chart"]').click();

  const dialog = page.locator('[data-vno-dialog="slides-chart"]');
  await dialog.waitFor();
  await dialog.locator("[data-chart-title-input]").fill("Doanh thu 2026");
  const rows = dialog.locator("tbody tr");
  await rows.nth(0).locator("[data-chart-label]").fill("Tháng 1");
  await rows.nth(0).locator("[data-chart-value]").fill("120");
  await rows.nth(1).locator("[data-chart-label]").fill("Tháng 2");
  await rows.nth(1).locator("[data-chart-value]").fill("185");
  assert(await dialog.locator('.vno-chart-preview svg[data-chart-type="bar"] rect[data-point-index="1"]').count() === 1, "Preview không render cột dữ liệu");
  await dialog.locator("[data-chart-apply]").click();

  const canvasChart = page.locator('.vno-slide-shape-item.is-chart svg[data-chart-type="bar"]');
  await canvasChart.waitFor();
  assert(await canvasChart.locator('rect[data-point-index="1"][data-value="185"]').count() === 1, "Canvas thiếu SVG chart/data thật");
  console.log("PASS: chart SVG appears on the running edit canvas");

  await page.keyboard.press("F5");
  const showChart = page.locator('.vno-slideshow-overlay .vno-show-chart svg[data-chart-type="bar"]');
  await showChart.waitFor();
  assert(await showChart.locator('rect[data-value="185"]').count() === 1, "F5 thiếu chart/data");
  console.log("PASS: chart SVG appears in F5 slideshow");
  await page.keyboard.press("Escape");

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.openSlideSorter();
  });
  const sorterChart = page.locator('.vno-slide-sorter-grid .vno-sorter-chart svg[data-chart-type="bar"]');
  await sorterChart.waitFor();
  assert(await sorterChart.locator('rect[data-value="185"]').count() === 1, "Slide Sorter thiếu chart/data");
  console.log("PASS: chart SVG appears in Slide Sorter thumbnail");
  await page.keyboard.press("Escape");

  const history = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const chart = canvas.slides[canvas.currentSlideIndex].shapes.find(item => item.type === "chart");
    canvas.updateChart(chart.id, { chartType: "line", title: "Đã sửa", labels: ["A", "B"], data: [7, 9] });
    const edited = chart.chartType === "line" && chart.data[1] === 9;
    canvas.undo(); const undone = chart.chartType === "bar" && chart.data[1] === 185;
    canvas.redo(); const redone = chart.chartType === "line" && chart.data[1] === 9;
    canvas.deleteShape(chart.id); const deleted = !canvas.slides[canvas.currentSlideIndex].shapes.some(item => item.type === "chart");
    canvas.undo(); const restored = canvas.slides[canvas.currentSlideIndex].shapes.some(item => item.type === "chart");
    return { edited, undone, redone, deleted, restored };
  });
  assert(Object.values(history).every(Boolean), `Edit/delete/undo/redo sai: ${JSON.stringify(history)}`);
  console.log("PASS: edit/delete/undo/redo use Slides shape history");
  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
