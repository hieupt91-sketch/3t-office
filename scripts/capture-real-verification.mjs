import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const port = 8993;
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
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
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Server listening on port ${port}`);

const fodsPath = "C:/Users/3T Computer/.gemini/antigravity-cli/scratch/DSS_Báo giá Dahua HN-T11.2023.fods";
const fodsXml = fs.readFileSync(fodsPath, "utf8");

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);

  // Load FODS into the app
  console.log("Nạp FODS vào VN Sheet...");
  const loadRes = await page.evaluate(async (xml) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const { SheetAdapter } = await import("/adapters/libreoffice/sheet/sheet-adapter.js");
    const adapter = new SheetAdapter(grid);
    const success = adapter.loadFromFods(xml);
    grid.switchSheet("Thông báo Sản phẩm mới");
    return { success, activeSheet: grid.activeSheet, sheets: grid.sheets };
  }, fodsXml);

  console.log("Load result:", loadRes);
  await page.waitForTimeout(1000);

  // Measure cells A1 to D5 on DOM
  const domCells = await page.evaluate(() => {
    const results = {};
    const coords = ["A1", "B1", "C1", "D1", "A2", "B2", "C2", "D2", "A3", "B3", "C3", "D3", "A4", "B4", "C4", "D4", "A5", "B5", "C5", "D5"];
    for (const c of coords) {
      const el = document.querySelector(`.vno-grid-cell[data-coord="${c}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        results[c] = {
          text: el.textContent.slice(0, 50),
          width: rect.width,
          height: rect.height,
          colSpan: el.colSpan,
          rowSpan: el.rowSpan,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          styleWidth: el.style.width,
          styleMaxWidth: el.style.maxWidth,
          styleHeight: el.style.height,
          fontSize: window.getComputedStyle(el).fontSize,
          padding: window.getComputedStyle(el).padding,
          overflow: window.getComputedStyle(el).overflow,
          textOverflow: window.getComputedStyle(el).textOverflow,
          canOverflow: el.classList.contains("can-overflow"),
          hasContent: el.classList.contains("has-content")
        };
      } else {
        results[c] = null;
      }
    }
    return results;
  });

  console.log("\n================ KẾT QUẢ ĐO DOM THỰC TẾ TRÊN VN SHEET ================");
  for (const [k, v] of Object.entries(domCells)) {
    if (!v) {
      console.log(`${k}: (không có trên DOM do merged cell)`);
    } else {
      console.log(`${k}: text="${v.text}", width=${v.width}px, height=${v.height}px, colSpan=${v.colSpan}, scrollW=${v.scrollWidth}, clientW=${v.clientWidth}, fontSize=${v.fontSize}, padding=${v.padding}, overflow=${v.overflow}, textOverflow=${v.textOverflow}`);
    }
  }

  // Chụp ảnh khu vực grid hiển thị A1:D5
  const outPath = path.join(root, "docs/screenshots/sheet-cell-text-fit.png");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  console.log(`\nĐã chụp ảnh xác minh thực tế lưu tại: ${outPath}`);

} finally {
  if (browser) await browser.close();
  server.close();
}
