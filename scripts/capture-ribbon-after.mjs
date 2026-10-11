/**
 * Capture After Screenshots and Metrics for all tabs in Writer, Sheet, Slides
 * Viewports for screenshots: 1366x768, 1024x768
 * Viewports verified for no-overflow: 1024x768, 1280x720, 1366x768, 1600x900, 1920x1080
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = 8895;
const OUT_DIR = "C:/Users/3T Computer/AppData/Local/Temp/vno-ribbon-screenshots/after";

fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") { res.writeHead(204).end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" }).end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve, reject) => {
  server.listen(PORT, "127.0.0.1", resolve);
  server.on("error", reject);
});

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const APPS = {
  writer: [
    { id: "home", label: "Trang đầu" },
    { id: "insert", label: "Chèn" },
    { id: "design", label: "Thiết kế" },
    { id: "layout", label: "Bố trí trang" },
    { id: "references", label: "Tham chiếu" },
    { id: "mailings", label: "Thư tín" },
    { id: "review", label: "Xem xét" },
    { id: "view", label: "Chế độ xem" },
    { id: "help", label: "Trợ giúp" },
    { id: "ai", label: "Trợ lý VN AI" }
  ],
  sheet: [
    { id: "home", label: "Trang đầu" },
    { id: "insert", label: "Chèn" },
    { id: "pageLayout", label: "Bố trí trang" },
    { id: "formulas", label: "Công thức" },
    { id: "data", label: "Dữ liệu" },
    { id: "review", label: "Xem xét" },
    { id: "view", label: "Chế độ xem" },
    { id: "help", label: "Trợ giúp" },
    { id: "ai", label: "Trợ lý VN AI" }
  ],
  slides: [
    { id: "home", label: "Trang đầu" },
    { id: "insert", label: "Chèn" },
    { id: "design", label: "Thiết kế" },
    { id: "transitions", label: "Chuyển tiếp" },
    { id: "animations", label: "Hoạt hình" },
    { id: "slideshow", label: "Trình chiếu" },
    { id: "review", label: "Xem xét" },
    { id: "view", label: "Chế độ xem" },
    { id: "help", label: "Trợ giúp" },
    { id: "ai", label: "Trợ lý VN AI" }
  ]
};

const VIEWPORTS = [
  { width: 1366, height: 768, screenshot: true },
  { width: 1024, height: 768, screenshot: true },
  { width: 1280, height: 720, screenshot: false },
  { width: 1600, height: 900, screenshot: false },
  { width: 1920, height: 1080, screenshot: false }
];

const results = [];
let totalFailures = 0;

try {
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== VERIFYING & CAPTURING AT ${vp.width}x${vp.height} ===`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, locale: "vi-VN" });
    await page.addInitScript(() => localStorage.setItem("vno-locale", "vi"));

    for (const [appKey, tabs] of Object.entries(APPS)) {
      await page.goto(`http://127.0.0.1:${PORT}/?app=${appKey}`, { waitUntil: "load" });
      await page.waitForSelector(".vno-ribbon-tab", { timeout: 10000 });
      await page.waitForTimeout(300);

      for (const tab of tabs) {
        const tabSelector = `#vno-ribbon-tab-${tab.id}`;
        const tabEl = await page.$(tabSelector);
        if (!tabEl) {
          console.warn(`Tab not found: ${tabSelector}`);
          continue;
        }
        await tabEl.click();
        await page.waitForTimeout(100);

        const metrics = await page.evaluate(() => {
          const content = document.querySelector(".vno-ribbon-content");
          if (!content) return null;
          return {
            scrollWidth: content.scrollWidth,
            clientWidth: content.clientWidth,
            hasOverflow: content.scrollWidth > content.clientWidth + 1,
            overflowPx: Math.max(0, content.scrollWidth - content.clientWidth)
          };
        });

        let imgPath = null;
        if (vp.screenshot) {
          imgPath = path.join(OUT_DIR, `${appKey}-${tab.id}-${vp.width}x${vp.height}.png`);
          const ribbonEl = await page.$(".vno-ribbon");
          if (ribbonEl) {
            await ribbonEl.screenshot({ path: imgPath });
          }
        }

        if (metrics?.hasOverflow) {
          totalFailures++;
        }

        results.push({
          app: appKey,
          tab: tab.id,
          width: vp.width,
          metrics,
          imgPath
        });

        const status = metrics?.hasOverflow ? `OVERFLOW (+${metrics.overflowPx}px) [FAIL]` : "OK (0px) [PASS]";
        console.log(`[${vp.width}px] ${appKey.padEnd(7)} | ${tab.id.padEnd(12)} -> ${status} (scroll: ${metrics?.scrollWidth}, client: ${metrics?.clientWidth})`);
      }
    }
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, "after-metrics.json"), JSON.stringify(results, null, 2));
  console.log(`\nMetrics written to ${path.join(OUT_DIR, "after-metrics.json")}`);
  console.log(`TOTAL OVERFLOW FAILURES: ${totalFailures}`);
} finally {
  server.close();
}
