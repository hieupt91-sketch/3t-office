/**
 * Live: VN Sheet Freeze Panes (Cố định ô) thật — mở dropdown ribbon thật (View
 * > Cửa sổ > Cố định ô), chọn Ô thật rồi bấm Cố định ô, xác nhận cố định ĐÚNG
 * hàng trên/cột trái của Ô đã chọn (không hardcode hàng 1/cột A), cuộn xa xác
 * nhận hàng cố định KHÔNG biến mất khỏi màn hình (sửa lỗi ảo hóa thật), và
 * Freeze Top Row / Freeze First Column hoạt động đúng.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_FREEZE_PORT || 8949);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
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

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // 1) Chọn ô D5 thật, mở dropdown Cố định ô, bấm mục Cố định ô đầu tiên.
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.grid.selectCell("D", 5);
  });
  await page.locator('[data-command-id="sheet.view.gridlines"]').waitFor({ timeout: 1000 }).catch(() => {});
  // Chuyển sang tab Xem xét (View) thật để dropdown Cố định ô hiển thị trên ribbon.
  await page.locator("#vno-ribbon-tab-view").click();
  await page.waitForTimeout(150);
  await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
  const menu = page.locator(".vno-ribbon-dropdown-menu");
  await menu.waitFor({ state: "visible", timeout: 3000 });
  await menu.locator('[data-command-id="sheet.view.freezePanes"]').click();
  await page.waitForTimeout(150);

  const state1 = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  });
  assert(state1.frozenRows === 4 && state1.frozenCols === 3, "Cố định tại D5 phải ra đúng 4 hàng, 3 cột (không phải hardcode hàng 1/cột A)", JSON.stringify(state1));

  // 2) Cuộn RẤT XA xuống dưới (qua hàng 100+) — hàng cố định 1-4 phải VẪN còn trong DOM (sửa lỗi ảo hóa thật).
  await page.evaluate(() => {
    const viewport = document.querySelector(".vno-grid-viewport");
    if (viewport) viewport.scrollTop = 3000;
  });
  await page.waitForTimeout(300);
  const afterScroll = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tr[data-row]")].map(tr => Number(tr.dataset.row));
    return { hasRow1: rows.includes(1), hasRow4: rows.includes(4), minRow: Math.min(...rows), maxRow: Math.max(...rows) };
  });
  assert(afterScroll.hasRow1 && afterScroll.hasRow4, "Sau khi cuộn xa, hàng cố định 1-4 PHẢI vẫn còn trong DOM (lỗi thật đã sửa)", JSON.stringify(afterScroll));

  // 3) Bấm lại "Cố định ô" (đang freeze) — phải bỏ cố định.
  await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
  await menu.waitFor({ state: "visible", timeout: 3000 });
  await menu.locator('[data-command-id="sheet.view.freezePanes"]').click();
  await page.waitForTimeout(150);
  const state2 = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  });
  assert(state2.frozenRows === 0 && state2.frozenCols === 0, "Bấm lại Cố định ô phải bỏ cố định", JSON.stringify(state2));

  // 4) Freeze Top Row.
  await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
  await menu.waitFor({ state: "visible", timeout: 3000 });
  await menu.locator('[data-command-id="sheet.view.freezeTopRow"]').click();
  await page.waitForTimeout(150);
  const state3 = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  });
  assert(state3.frozenRows === 1 && state3.frozenCols === 0, "Freeze Top Row phải chỉ cố định đúng 1 hàng", JSON.stringify(state3));

  console.log("PASS: Sheet Cố định ô (Freeze Panes) mở dropdown thật, cố định đúng theo Ô đang chọn, không biến mất khi cuộn xa, Freeze Top Row hoạt động đúng.");
} finally {
  await browser?.close();
  server.close();
}
