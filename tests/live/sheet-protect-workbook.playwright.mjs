import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SHEET_PROTECT_WB_PORT || 8912);

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
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(ROOT_DIR, relative);
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("403");
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(PORT, resolve));
console.log(`[Test Server] Đang chạy tại http://127.0.0.1:${PORT}`);

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--disable-http-cache", "--disk-cache-size=1"]
});

function assert(condition, message, extra) {
  if (!condition) throw new Error(extra ? `${message}: ${extra}` : message);
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "vi-VN"
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", err => pageErrors.push(err.message));

  console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE: SHEET PROTECT WORKBOOK ===");
  await page.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="sheet"]', { timeout: 10000 });
  await page.waitForSelector(".vno-grid-cell[data-coord=\"A1\"]", { timeout: 10000 });
  await page.waitForTimeout(250);

  await page.locator(".vno-ribbon-tab").filter({ hasText: "Xem xét" }).click();
  const protectBtn = page.locator('[data-command-id="sheet.workbook.protect"]');
  await protectBtn.scrollIntoViewIfNeeded();
  await protectBtn.waitFor({ state: "visible", timeout: 5000 });
  const groupLabel = await page.locator('.vno-ribbon-group[data-group-id="protection"] .vno-ribbon-group-label').textContent();
  assert((groupLabel || "").trim() === "Bảo vệ", "Nhóm ribbon phải là Bảo vệ", groupLabel);

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.grid.setCellValue("Z", 1, 42, false);
  });

  await protectBtn.click();
  const protectDialog = page.locator('[role="dialog"]').filter({ hasText: "Bảo vệ workbook" });
  await protectDialog.waitFor({ state: "visible", timeout: 3000 });
  assert(await protectDialog.locator("#vno-protect-wb-enable").isChecked(), "Checkbox bảo vệ workbook phải được tick sẵn");
  await protectDialog.locator("#vno-protect-wb-password").fill("live-secret");
  await protectDialog.locator("#vno-protect-wb-password2").fill("live-secret");
  await protectDialog.locator(".vno-rule-apply").click();
  await protectDialog.waitFor({ state: "detached" });
  await page.waitForTimeout(120);

  const blocked = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const first = grid.activeSheet;
    const beforeSheets = [...grid.sheets];
    const rename = grid.renameSheet(first, "KhongDuoc");
    const added = grid.addSheet();
    const deleted = grid.deleteSheet(beforeSheets[1] || beforeSheets[0]);
    const moved = grid.moveSheet(first, null);
    const copied = grid.copySheet(first, null);
    const edit = grid.setCellValue("Z", 1, 99);
    return {
      protected: grid.isWorkbookProtected(),
      sheetProtected: grid.isSheetProtected(),
      rename,
      added,
      deleted,
      moved,
      copied,
      edit,
      z1: grid.cellsData.get("Z1")?.val,
      sheets: [...grid.sheets],
      first
    };
  });
  assert(blocked.protected === true, "Workbook phải đang bảo vệ");
  assert(blocked.sheetProtected === false, "Protect Workbook không được bật Protect Sheet");
  assert(blocked.rename === false, "renameSheet phải bị từ chối");
  assert(blocked.added === false, "addSheet phải bị từ chối");
  assert(blocked.deleted === false, "deleteSheet phải bị từ chối");
  assert(blocked.moved === false, "moveSheet phải bị từ chối");
  assert(blocked.copied === false, "copySheet phải bị từ chối");
  assert(blocked.edit !== false && blocked.z1 === 99, "Ô Z1 vẫn sửa được", JSON.stringify(blocked));
  assert(blocked.sheets[0] === blocked.first, "Tên trang đầu không đổi");
  await page.evaluate(() => {
    document.querySelectorAll(".vno-dialog-overlay").forEach(el => el.remove());
  });
  console.log("  ✓ Protect Workbook chặn rename/add/delete/move/copy; Z1 vẫn sửa thành 99");

  const btnLabel = ((await protectBtn.textContent()) || "").trim();
  assert(btnLabel.includes("Bỏ bảo vệ"), "Nút phải đổi thành Bỏ bảo vệ workbook", btnLabel);
  console.log("  ✓ Nhãn lệnh đổi thành Bỏ bảo vệ workbook");

  await protectBtn.click();
  const unprotectDialog = page.locator('[role="dialog"]').filter({ hasText: "Bỏ bảo vệ workbook" });
  await unprotectDialog.waitFor({ state: "visible", timeout: 3000 });
  await unprotectDialog.locator("#vno-unprotect-wb-password").fill("sai");
  await unprotectDialog.locator(".vno-rule-apply").click();
  const wrongMsg = await unprotectDialog.locator(".vno-rule-error").textContent();
  assert((wrongMsg || "").includes("không đúng"), "Sai mật khẩu phải hiện lỗi", wrongMsg);
  const stillLocked = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.isWorkbookProtected();
  });
  assert(stillLocked === true, "Sai mật khẩu không được mở");
  await unprotectDialog.locator("#vno-unprotect-wb-password").fill("live-secret");
  await unprotectDialog.locator(".vno-rule-apply").click();
  await unprotectDialog.waitFor({ state: "detached" });
  const unlocked = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const renamed = grid.renameSheet(grid.activeSheet, "DaMoLive");
    return { protected: grid.isWorkbookProtected(), renamed, active: grid.activeSheet };
  });
  assert(unlocked.protected === false, "Đúng mật khẩu phải mở khóa");
  assert(unlocked.renamed === "DaMoLive" && unlocked.active === "DaMoLive", "Sau bỏ bảo vệ được đổi tên", JSON.stringify(unlocked));
  console.log("  ✓ Sai mật khẩu bị từ chối; đúng mật khẩu mở khóa và đổi tên DaMoLive");

  await page.locator(".vno-ribbon-tab").filter({ hasText: "Trợ giúp" }).click();
  await page.locator('[data-command-id="sheet.help.open"]').click();
  await page.locator(".vno-help-panel:not([hidden])").waitFor({ state: "visible" });
  await page.locator(".vno-help-search").fill("bảo vệ workbook");
  await page.waitForTimeout(150);
  const helpHit = await page.locator(".vno-help-panel").innerText();
  assert(helpHit.toLowerCase().includes("workbook") || helpHit.toLowerCase().includes("cấu trúc"), "Help phải tìm được bài Bảo vệ workbook", helpHit.slice(0, 240));
  console.log("  ✓ Help tìm được Bảo vệ workbook");

  assert(pageErrors.length === 0, "Không được có pageerror", pageErrors.join(" | "));
  console.log("=== PASS: SHEET PROTECT WORKBOOK LIVE ===");
} finally {
  await browser.close();
  server.close();
}
