/**
 * VN Office — Ribbon Audit 1280px Live Playwright Test
 * Tests all 26 ribbon tabs across Writer, Sheet, and Slides at 1280px resolution.
 * Verifies 0px horizontal overflow, DOM preservation, and interactive clickability.
 * Uses Edge + Playwright only. TUYỆT ĐỐI KHÔNG SendKeys / desktop automation.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8893;

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
    { id: "ai", label: "VN AI" }
  ]
};

const VIEWPORTS = [
  { width: 1280, height: 800, desc: "1280x800 (Chuẩn laptop / máy chiếu VN)" },
  { width: 1280, height: 720, desc: "1280x720 (Chuẩn HD phổ biến)" }
];

let browser;
const fullResults = [];
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
      const pageErrors = [];
      page.on("pageerror", err => pageErrors.push(err.message));

      await page.addInitScript((l) => localStorage.setItem("vno-locale", l), locale);

      for (const [appKey, tabs] of Object.entries(APPS)) {
        await page.goto(`http://127.0.0.1:${PORT}/?app=${appKey}`, { waitUntil: "load", timeout: 20000 });
        await page.waitForSelector(".vno-ribbon-tab", { timeout: 15000 });
        await page.waitForTimeout(250);

        for (const tab of tabs) {
          const tabSelector = `#vno-ribbon-tab-${tab.id}`;
          await page.click(tabSelector, { timeout: 3000 });
          await page.waitForTimeout(100);

          const metrics = await page.evaluate(() => {
            const content = document.querySelector(".vno-ribbon-content");
            if (!content) return null;
            const groups = Array.from(document.querySelectorAll(".vno-ribbon-group")).map(g => {
              const label = g.querySelector(".vno-ribbon-group-label")?.textContent?.trim() || "";
              const id = g.dataset.groupId || "";
              const width = Math.round(g.getBoundingClientRect().width);
              const overflow = g.scrollWidth > g.clientWidth + 1;
              return { id, label, width, scrollWidth: g.scrollWidth, clientWidth: g.clientWidth, overflow };
            });

            return {
              scrollWidth: content.scrollWidth,
              clientWidth: content.clientWidth,
              hasOverflow: content.scrollWidth > content.clientWidth + 1,
              overflowPx: Math.max(0, content.scrollWidth - content.clientWidth),
              groups,
              totalGroupsWidth: groups.reduce((acc, g) => acc + g.width, 0)
            };
          });

          const isPass = !metrics.hasOverflow;
          const statusText = isPass ? "PASS (0px)" : `FAIL (+${metrics.overflowPx}px)`;
          if (!isPass) totalFailures++;

          fullResults.push({
            viewport: `${vp.width}x${vp.height}`,
            locale,
            app: appKey,
            tabId: tab.id,
            tabLabel: tab.label,
            scrollWidth: metrics.scrollWidth,
            clientWidth: metrics.clientWidth,
            overflowPx: metrics.overflowPx,
            sumGroups: metrics.totalGroupsWidth,
            isPass
          });

          console.log(`[${statusText.padEnd(14)}] ${appKey.padEnd(7)} | ${tab.id.padEnd(12)} (${tab.label}) | scrollWidth: ${metrics.scrollWidth}px / clientWidth: ${metrics.clientWidth}px | sum: ${metrics.totalGroupsWidth}px`);
        }
      }

      if (pageErrors.length > 0) {
        console.error("Page errors detected:", pageErrors);
        totalFailures += pageErrors.length;
      }
      await page.close();
    }
  }

  // Interactive Clickability Test on Condensed Tabs
  console.log(`\n============================================================`);
  console.log(`KIỂM TRA TƯƠNG TÁC CLICK CÁC NÚT ĐƯỢC THU GỌN Ở 1280px`);
  console.log(`============================================================`);

  const clickTestPage = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "vi-VN" });
  await clickTestPage.addInitScript(() => localStorage.setItem("vno-locale", "vi"));
  await clickTestPage.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "load" });
  await clickTestPage.waitForSelector(".vno-ribbon-content", { timeout: 10000 });

  // 1. Sheet Home interactive buttons
  const sheetHomeButtons = [
    "common.edit.paste", "common.edit.cut", "common.edit.copy", "sheet.edit.pasteSpecial",
    "sheet.cell.bold", "sheet.cell.italic", "sheet.cell.underline",
    "sheet.cell.alignCenter", "sheet.cell.mergeCenter", "sheet.cell.mergeAcross", "sheet.cell.mergeCells", "sheet.cell.unmerge",
    "sheet.format.conditional", "sheet.style.formatAsTable", "sheet.style.cellStyles",
    "sheet.row.insert", "sheet.col.insert", "sheet.row.delete", "sheet.col.delete",
    "sheet.formula.sum", "sheet.data.sortAsc", "sheet.data.sortDesc", "sheet.data.filter"
  ];

  console.log(`Testing ${sheetHomeButtons.length} command buttons in Sheet Home...`);
  for (const cmd of sheetHomeButtons) {
    const btn = clickTestPage.locator(`[data-command-id="${cmd}"]`).first();
    if (!await btn.isVisible()) {
      throw new Error(`Button ${cmd} is not visible!`);
    }
    await btn.click({ timeout: 2000 });
    await clickTestPage.keyboard.press("Escape");
    await clickTestPage.waitForTimeout(30);
    await clickTestPage.evaluate(() => {
      const d = document.querySelector(".vno-dialog-overlay");
      if (d) d.remove();
    });
    console.log(`  [OK] Clicked: ${cmd}`);
  }

  // 2. Sheet Formulas interactive buttons
  await clickTestPage.click("#vno-ribbon-tab-formulas");
  await clickTestPage.waitForTimeout(200);

  const sheetFormulasButtons = [
    "sheet.formula.insertFunction", "sheet.formula.sum", "sheet.formula.average", "sheet.formula.countNumbers",
    "sheet.formula.categoryFinancial", "sheet.formula.categoryLogical", "sheet.formula.categoryText",
    "sheet.formula.nameManager", "sheet.formula.defineName", "sheet.formula.createFromSelection",
    "sheet.formula.tracePrecedents", "sheet.formula.traceDependents", "sheet.formula.removeArrows",
    "sheet.formula.showFormulas", "sheet.formula.errorChecking", "sheet.formula.watchWindow",
    "sheet.formula.recalculate", "sheet.calc.calculateSheet"
  ];

  console.log(`\nTesting ${sheetFormulasButtons.length} command buttons in Sheet Formulas...`);
  for (const cmd of sheetFormulasButtons) {
    const btn = clickTestPage.locator(`[data-command-id="${cmd}"]`).first();
    if (!await btn.isVisible()) {
      throw new Error(`Button ${cmd} is not visible!`);
    }
    await btn.click({ timeout: 2000 });
    await clickTestPage.keyboard.press("Escape");
    await clickTestPage.waitForTimeout(30);
    await clickTestPage.evaluate(() => {
      const d = document.querySelector(".vno-dialog-overlay");
      if (d) d.remove();
    });
    console.log(`  [OK] Clicked: ${cmd}`);
  }

  await clickTestPage.close();

} finally {
  if (browser) await browser.close();
  server.close();
}

console.log(`\n============================================================`);
console.log(`TỔNG KẾT KIỂM THỬ RIBBON AUDIT 1280px`);
console.log(`- Tổng số lượt kiểm tra tab: ${fullResults.length} (26 tabs x 2 độ phân giải x 2 ngôn ngữ)`);
console.log(`- Số lượt thất bại: ${totalFailures}`);
console.log(`============================================================\n`);

if (totalFailures > 0) {
  process.exit(1);
} else {
  console.log("100% PASS: Toàn bộ 26 tab trên cả 3 app đều 0px tràn ngang tại 1280px!");
}
