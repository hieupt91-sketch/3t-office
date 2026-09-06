/**
 * Live: VN Sheet Custom Sort (Data tab) — mở dialog nhiều cấp thật, chọn cột
 * và thứ tự cho 2 cấp, Áp dụng, xác nhận dữ liệu thật trên ô đã sắp đúng.
 * Cổng riêng để không đụng ribbon-audit 8893 / find-replace 8917.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_CUSTOM_SORT_PORT || 8921);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
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
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) { res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("403"); return; }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("404 Not Found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise((resolve, reject) => { server.listen(port, "127.0.0.1", resolve); server.on("error", reject); });

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  const typeCell = async (coord, value) => {
    await page.locator(`.vno-grid-cell[data-coord="${coord}"]`).click();
    await page.keyboard.type(String(value));
    await page.keyboard.press("Enter");
  };

  const rows = [
    ["Team", "Amount"],
    ["B", "5"],
    ["A", "10"],
    ["A", "20"],
    ["B", "1"]
  ];
  for (let r = 0; r < rows.length; r++) {
    await typeCell(`A${r + 1}`, rows[r][0]);
    await typeCell(`B${r + 1}`, rows[r][1]);
  }

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 5 } };
  });

  await page.locator("#vno-ribbon-tab-data").click();
  await page.waitForTimeout(150);

  const customSortBtn = page.locator('[data-command-id="sheet.data.customSort"]').first();
  await customSortBtn.scrollIntoViewIfNeeded();
  assert(await customSortBtn.isVisible(), "Nút Sắp xếp tùy chỉnh phải hiện trên ribbon Data");
  await customSortBtn.click();
  await page.locator(".vno-cs-levels").waitFor({ state: "visible", timeout: 5000 });

  const levelRows = page.locator(".vno-cs-level");
  assert(await levelRows.count() >= 2, "Dialog phải mở sẵn ít nhất 2 cấp (Team, Amount)");

  await levelRows.nth(0).locator(".vno-cs-col").selectOption("A");
  await levelRows.nth(0).locator(".vno-cs-order").selectOption("asc");
  await levelRows.nth(1).locator(".vno-cs-col").selectOption("B");
  await levelRows.nth(1).locator(".vno-cs-order").selectOption("desc");

  await page.locator(".vno-rule-apply").click();
  await page.waitForTimeout(120);

  const dialogClosed = (await page.locator(".vno-cs-levels").count()) === 0;
  assert(dialogClosed, "Apply phải đóng dialog Sắp xếp tùy chỉnh");

  const after = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return {
      teams: [2, 3, 4, 5].map(r => grid.cellsData.get(`A${r}`)?.val),
      amounts: [2, 3, 4, 5].map(r => grid.cellsData.get(`B${r}`)?.val),
      header: grid.cellsData.get("A1")?.val
    };
  });
  assert(after.header === "Team", "Hàng tiêu đề không được bị sắp cùng dữ liệu", JSON.stringify(after));
  assert(after.teams.join(",") === "A,A,B,B", "Cấp 1 (Team A→Z) phải đúng thứ tự", JSON.stringify(after));
  assert(after.amounts.join(",") === "20,10,5,1", "Cấp 2 (Amount Z→A trong từng nhóm Team) phải đúng thứ tự", JSON.stringify(after));

  const undone = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.undo();
    return grid.cellsData.get("A2")?.val;
  });
  assert(undone === "B", "Ctrl+Z (undo) qua lệnh thật phải khôi phục thứ tự gốc", undone);

  console.log("PASS: Sheet Custom Sort mở dialog thật, sắp đúng 2 cấp, giữ header, undo được");
} finally {
  await browser?.close();
  server.close();
}
