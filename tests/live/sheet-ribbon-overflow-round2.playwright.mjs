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
  ".png": "image/png"
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

await new Promise(resolve => server.listen(PORT, resolve));
console.log(`[Test Server] Đang chạy tại http://127.0.0.1:${PORT}`);

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

try {
  for (const width of [1600, 1366]) {
    console.log(`\n========================================`);
    console.log(`Kiểm tra Ribbon Sheet Home ở ${width}px (vi-VN)`);
    console.log(`========================================`);

    const page = await browser.newPage({
      viewport: { width, height: 900 },
      locale: "vi-VN"
    });

    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(e.message));

    await page.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector(".vno-ribbon-content", { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // 1. Đo kích thước và kiểm tra tràn ngang
    const ribbonAudit = await page.evaluate(() => {
      const ribbon = document.querySelector(".vno-ribbon-content");
      if (!ribbon) return null;
      const groups = Array.from(document.querySelectorAll(".vno-ribbon-group"));
      const overflowingGroups = groups
        .filter(g => g.scrollWidth > g.clientWidth + 2)
        .map(g => ({
          label: g.querySelector(".vno-ribbon-group-label")?.textContent?.trim() || "?",
          scrollWidth: g.scrollWidth,
          clientWidth: g.clientWidth
        }));

      return {
        ribbonScrollWidth: ribbon.scrollWidth,
        ribbonClientWidth: ribbon.clientWidth,
        hasHorizontalOverflow: ribbon.scrollWidth > ribbon.clientWidth + 2,
        overflowingGroups,
        groups: groups.map(g => ({
          id: g.dataset.groupId || "",
          label: g.querySelector(".vno-ribbon-group-label")?.textContent?.trim() || "?",
          width: g.offsetWidth
        }))
      };
    });

    if (!ribbonAudit) throw new Error("Không tìm thấy .vno-ribbon-content!");

    console.log(`scrollWidth: ${ribbonAudit.ribbonScrollWidth}px | clientWidth: ${ribbonAudit.ribbonClientWidth}px`);
    console.log(`Tràn ngang: ${ribbonAudit.hasHorizontalOverflow ? "CÓ" : "KHÔNG"}`);
    for (const g of ribbonAudit.groups) {
      console.log(`  - [${g.id}] ${g.label.padEnd(16)}: ${g.width}px`);
    }

    if (ribbonAudit.hasHorizontalOverflow) {
      throw new Error(`Thất bại: Ribbon Sheet Home bị tràn ngang tại ${width}px! (scrollWidth: ${ribbonAudit.ribbonScrollWidth} > clientWidth: ${ribbonAudit.ribbonClientWidth})`);
    }
    if (ribbonAudit.overflowingGroups.length > 0) {
      throw new Error(`Thất bại: Có nhóm bị tràn: ${JSON.stringify(ribbonAudit.overflowingGroups)}`);
    }

    // 2. Kiểm tra tương tác click các nút lệnh Home
    const commandsToTest = [
      "common.edit.paste",
      "common.edit.cut",
      "common.edit.copy",
      "sheet.edit.pasteSpecial",
      "sheet.cell.bold",
      "sheet.cell.italic",
      "sheet.cell.underline",
      "sheet.cell.alignTop",
      "sheet.cell.alignLeft",
      "sheet.cell.alignCenter",
      "sheet.cell.mergeCenter",
      "sheet.cell.mergeAcross",
      "sheet.cell.mergeCells",
      "sheet.cell.unmerge",
      "sheet.format.conditional",
      "sheet.style.formatAsTable",
      "sheet.style.cellStyles",
      "sheet.row.insert",
      "sheet.col.insert",
      "sheet.row.delete",
      "sheet.col.delete",
      "sheet.formula.sum",
      "sheet.data.sortAsc"
    ];

    console.log(`\nKiểm tra khả năng tương tác của ${commandsToTest.length} lệnh:`);
    for (const cmd of commandsToTest) {
      const btn = page.locator(`[data-command-id="${cmd}"]`);
      if (await btn.count() === 0) {
        throw new Error(`Nút lệnh ${cmd} không tồn tại trong DOM!`);
      }
      if (!await btn.first().isVisible()) {
        throw new Error(`Nút lệnh ${cmd} không hiển thị (invisible)!`);
      }
      await btn.first().click({ timeout: 3000 });
      console.log(`  [OK] Click ${cmd}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(50);
      await page.evaluate(() => {
        const overlay = document.querySelector(".vno-dialog-overlay");
        if (overlay) overlay.remove();
      });
    }

    // 3. Kiểm tra chuyển tab không bị lỗi
    const otherTabs = ["formulas", "data", "insert", "review", "view"];
    for (const tabId of otherTabs) {
      const tabBtn = page.locator(`#vno-ribbon-tab-${tabId}`);
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(100);
        const tabAudit = await page.evaluate(() => {
          const r = document.querySelector(".vno-ribbon-content");
          return { scrollWidth: r?.scrollWidth, clientWidth: r?.clientWidth, hasOverflow: r?.scrollWidth > r?.clientWidth + 2 };
        });
        console.log(`  Tab [${tabId}] scrollWidth=${tabAudit.scrollWidth}px, clientWidth=${tabAudit.clientWidth}px, overflow=${tabAudit.hasOverflow}`);
        if (tabAudit.hasOverflow) {
          throw new Error(`Tab ${tabId} bị tràn ngang tại ${width}px!`);
        }
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Lỗi runtime trên trang: ${pageErrors.join(", ")}`);
    }

    console.log(`PASS: Ribbon Sheet Home hoàn hảo tại ${width}px, 0px tràn ngang, toàn bộ nút lệnh hoạt động tốt.`);
    await page.close();
  }

  console.log("\n==================================================");
  console.log("TẤT CẢ CÁC BÀI KIỂM TRA LIVE RIBBON ĐÃ PASS 100%!");
  console.log("==================================================");
} finally {
  await browser.close();
  server.close();
}
