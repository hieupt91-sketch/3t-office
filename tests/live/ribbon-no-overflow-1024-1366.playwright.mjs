/**
 * VN Office — Ribbon No-Overflow Automated Playwright Test at 1024px & 1366px
 * Verifies scrollWidth <= clientWidth (0px overflow, no horizontal scrollbar)
 * across all ribbon tabs for VN Writer, VN Sheet, and VN Slides in both Vietnamese and English.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8896;

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
  if (reqPath === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
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
    { id: "ai", label: "VN AI" }
  ],
  sheet: [
    { id: "home", label: "Trang đầu" },
    { id: "formulas", label: "Công thức" },
    { id: "data", label: "Dữ liệu" },
    { id: "insert", label: "Chèn" },
    { id: "pageLayout", label: "Bố trí trang" },
    { id: "review", label: "Xem xét" },
    { id: "view", label: "Chế độ xem" },
    { id: "help", label: "Trợ giúp" },
    { id: "ai", label: "VN AI" }
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
    { id: "ai", label: "VN AI" }
  ]
};

const VIEWPORTS = [
  { width: 1366, height: 768, desc: "1366x768 (Tiêu chuẩn màn hình văn phòng phổ biến)" },
  { width: 1024, height: 768, desc: "1024x768 (Tiêu chuẩn màn hình nhỏ / tablet)" }
];

let browser;
let totalTests = 0;
let totalFailures = 0;

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n============================================================`);
    console.log(`ĐỘ PHÂN GIẢI KIỂM THỬ: ${vp.width}x${vp.height} — ${vp.desc}`);
    console.log(`============================================================`);

    for (const locale of ["vi", "en"]) {
      console.log(`\n--- Ngôn ngữ: ${locale.toUpperCase()} ---`);
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, locale: locale === "vi" ? "vi-VN" : "en-US" });

      await page.addInitScript((l) => localStorage.setItem("vno-locale", l), locale);

      for (const [appKey, tabs] of Object.entries(APPS)) {
        await page.goto(`http://127.0.0.1:${PORT}/?app=${appKey}`, { waitUntil: "load", timeout: 20000 });
        await page.waitForSelector(".vno-ribbon-tab", { timeout: 15000 });
        await page.waitForTimeout(250);

        for (const tab of tabs) {
          totalTests++;
          const tabSelector = `#vno-ribbon-tab-${tab.id}`;
          await page.click(tabSelector, { timeout: 3000 });
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

          const isPass = !metrics?.hasOverflow;
          const statusText = isPass ? "PASS (0px)" : `FAIL (+${metrics?.overflowPx}px)`;
          if (!isPass) totalFailures++;

          console.log(`[${statusText.padEnd(14)}] ${appKey.padEnd(7)} | ${tab.id.padEnd(12)} (${tab.label.padEnd(14)}) | scrollWidth: ${metrics?.scrollWidth}px / clientWidth: ${metrics?.clientWidth}px`);
        }
      }
      await page.close();
    }
  }

  console.log(`\n============================================================`);
  console.log(`TỔNG KẾT KIỂM THỬ RIBBON NO-OVERFLOW (1024px & 1366px)`);
  console.log(`- Tổng số lượt kiểm tra tab: ${totalTests}`);
  console.log(`- Số lượt thất bại: ${totalFailures}`);
  console.log(`============================================================`);

  if (totalFailures === 0) {
    console.log(`\n100% PASS: Toàn bộ các tab trên cả 3 ứng dụng đều không bị tràn ngang ở 1024px và 1366px!\n`);
    process.exit(0);
  } else {
    console.error(`\nFAIL: Có ${totalFailures} tab bị tràn ngang!\n`);
    process.exit(1);
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
