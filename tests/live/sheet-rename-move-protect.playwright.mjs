import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SHEET_RENAME_PORT || 8911);

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

  console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE: SHEET RENAME / MOVE-COPY / PROTECT ===");
  await page.goto(`http://127.0.0.1:${PORT}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="sheet"]', { timeout: 10000 });
  await page.waitForSelector(".vno-grid-cell[data-coord=\"A1\"]", { timeout: 10000 });
  await page.waitForTimeout(250);
  const diskRibbon = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-ribbon.js"), "utf8");
  assert(diskRibbon.includes("sheet.sheet.rename"), "File trên đĩa phải có sheet.sheet.rename");
  const ribbonSrc = await page.evaluate(async () => (await fetch("/apps/sheet/sheet-ribbon.js?v=rename")).text());
  if (!ribbonSrc.includes("sheet.sheet.rename")) {
    const around = ribbonSrc.split("sheet.col.unhide")[1]?.slice(0, 180) || ribbonSrc.slice(0, 200);
    throw new Error(`Browser fetch thiếu sheet.sheet.rename. Disk has it (${diskRibbon.includes("sheet.sheet.rename")}). Around unhide: ${around}`);
  }

  const formatBtn = page.locator('[data-dropdown-id="sheet.cells.format"]');
  await formatBtn.scrollIntoViewIfNeeded();
  await formatBtn.waitFor({ state: "visible", timeout: 5000 });

  async function openFormatItem(commandId) {
    await formatBtn.scrollIntoViewIfNeeded();
    await formatBtn.click();
    const menu = page.locator(".vno-ribbon-dropdown-menu");
    await menu.waitFor({ state: "attached", timeout: 3000 });
    const ids = await menu.locator(".vno-ribbon-dropdown-item").evaluateAll(els => els.map(el => el.getAttribute("data-command-id")));
    if (!ids.includes(commandId)) {
      throw new Error(`Dropdown Định dạng không có ${commandId}. Có: ${ids.join(", ")}`);
    }
    const item = menu.locator(`.vno-ribbon-dropdown-item[data-command-id="${commandId}"]`);
    await item.scrollIntoViewIfNeeded();
    await item.click({ force: true });
    await page.waitForTimeout(120);
  }

  const setup = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const source = grid.activeSheet;
    grid.setCellValue("Z", 1, 77, false);
    const other = grid.sheets.find(name => name !== source);
    grid.switchSheet(other);
    grid.setCellValue("Y", 1, `='${source.replace(/'/g, "''")}'!Z1`, false);
    grid.switchSheet(source);
    return { source, other, formula: grid.sheetsData[other].get("Y1")?.formula, val: grid.sheetsData[other].get("Y1")?.val };
  });
  assert(setup.val === 77, "Setup công thức liên-sheet phải = 77", String(setup.val));

  await openFormatItem("sheet.sheet.rename");
  const renameDialog = page.locator('[role="dialog"]').filter({ hasText: "Đổi tên trang tính" });
  await renameDialog.waitFor({ state: "visible", timeout: 3000 });
  const renameInput = renameDialog.locator("#vno-rename-sheet");
  await renameInput.fill("NganSachLive");
  await renameDialog.locator(".vno-rule-apply").click();
  await renameDialog.waitFor({ state: "detached" });
  await page.waitForTimeout(150);

  const afterRename = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const other = grid.sheets.find(name => name !== grid.activeSheet);
    return {
      active: grid.activeSheet,
      sheets: [...grid.sheets],
      formula: grid.sheetsData[other].get("Y1")?.formula,
      val: grid.sheetsData[other].get("Y1")?.val,
      tab: document.querySelector(".vno-sheet-tab-item.is-active")?.textContent?.trim()
    };
  });
  assert(afterRename.active === "NganSachLive", "Active sheet phải là NganSachLive", afterRename.active);
  assert(afterRename.tab === "NganSachLive", "Tab active phải hiện NganSachLive", afterRename.tab);
  assert(afterRename.formula === "='NganSachLive'!Z1", "Công thức liên-sheet phải đổi tên", afterRename.formula);
  assert(afterRename.val === 77, "Giá trị sau đổi tên vẫn 77", String(afterRename.val));
  console.log("  ✓ Đổi tên qua dropdown Định dạng + công thức 'NganSachLive'!Z1 = 77");

  await openFormatItem("sheet.sheet.moveOrCopy");
  const moveDialog = page.locator('[role="dialog"]').filter({ hasText: "Di chuyển hoặc Sao chép" });
  await moveDialog.waitFor({ state: "visible", timeout: 3000 });
  await moveDialog.locator("#vno-move-copy").check();
  await moveDialog.locator("#vno-move-before").selectOption({ value: "__end__" });
  await moveDialog.locator(".vno-rule-apply").click();
  await moveDialog.waitFor({ state: "detached" });
  await page.waitForTimeout(150);

  const afterCopy = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const copyName = "NganSachLive (2)";
    return {
      active: grid.activeSheet,
      sheets: [...grid.sheets],
      copyVal: grid.sheetsData[copyName]?.get("Z1")?.val,
      originalVal: grid.sheetsData.NganSachLive?.get("Z1")?.val,
      lastTab: grid.sheets[grid.sheets.length - 1]
    };
  });
  assert(afterCopy.active === "NganSachLive (2)", "Phải chuyển sang bản sao", afterCopy.active);
  assert(afterCopy.lastTab === "NganSachLive (2)", "Bản sao phải ở cuối", afterCopy.lastTab);
  assert(afterCopy.copyVal === 77 && afterCopy.originalVal === 77, "Bản sao phải giữ Z1=77", JSON.stringify(afterCopy));
  console.log("  ✓ Sao chép trang tính NganSachLive (2) ở cuối, Z1=77");

  await page.locator('.vno-sheet-tab-item[data-sheet="NganSachLive"]').click();
  await page.waitForTimeout(80);
  await openFormatItem("sheet.sheet.moveOrCopy");
  const moveOnly = page.locator('[role="dialog"]').filter({ hasText: "Di chuyển hoặc Sao chép" });
  await moveOnly.waitFor({ state: "visible", timeout: 3000 });
  const endValue = await moveOnly.locator("#vno-move-before option").last().getAttribute("value");
  assert(endValue === "__end__", "Option cuối phải là chuyển đến cuối", endValue);
  await moveOnly.locator("#vno-move-before").selectOption({ value: "__end__" });
  await moveOnly.locator(".vno-rule-apply").click();
  await moveOnly.waitFor({ state: "detached" });

  const afterMove = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return { last: grid.sheets[grid.sheets.length - 1], sheets: [...grid.sheets] };
  });
  assert(afterMove.last === "NganSachLive", "NganSachLive phải ở cuối sau move", afterMove.sheets.join(" | "));
  console.log("  ✓ Di chuyển NganSachLive đến cuối");

  await openFormatItem("sheet.sheet.protect");
  const protectDialog = page.locator('[role="dialog"]').filter({ hasText: "Bảo vệ trang tính" });
  await protectDialog.waitFor({ state: "visible", timeout: 3000 });
  const checkbox = protectDialog.locator("#vno-protect-enable");
  assert(await checkbox.isChecked(), "Checkbox bảo vệ phải được tick sẵn");
  await protectDialog.locator(".vno-rule-apply").click();
  await protectDialog.waitFor({ state: "detached" });
  await page.waitForTimeout(120);

  const blocked = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const before = grid.cellsData.get("Z1")?.val;
    const result = grid.setCellValue("Z", 1, 1);
    return { before, result, after: grid.cellsData.get("Z1")?.val, protected: grid.isSheetProtected() };
  });
  assert(blocked.protected === true, "Sheet phải đang bảo vệ");
  assert(blocked.result === false, "setCellValue phải bị từ chối");
  assert(blocked.after === 77, "Z1 không được đổi khi đang khóa", String(blocked.after));
  const alertBox = page.locator(".vno-dialog-overlay").filter({ hasText: "Bảo vệ trang tính" });
  if (await alertBox.count()) {
    await alertBox.locator(".vno-dialog-ok-btn, .vno-btn-primary").first().click();
    await alertBox.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  }
  console.log("  ✓ Protect chặn sửa ô Z1 (vẫn 77)");

  await formatBtn.click();
  const protectMenu = page.locator(".vno-ribbon-dropdown-menu");
  await protectMenu.waitFor({ state: "visible", timeout: 3000 });
  const protectItem = protectMenu.locator('.vno-ribbon-dropdown-item[data-command-id="sheet.sheet.protect"]');
  const protectItemLabel = ((await protectItem.textContent()) || "").trim();
  assert(protectItemLabel.includes("Bỏ bảo vệ"), "Mục dropdown phải đổi thành Bỏ bảo vệ", protectItemLabel);
  console.log("  ✓ Nhãn lệnh đổi thành Bỏ bảo vệ trang tính");
  await protectItem.click();
  await page.waitForTimeout(200);
  const stillProtected = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.isSheetProtected();
  });
  assert(stillProtected === false, "Bỏ bảo vệ không mật khẩu phải mở khóa ngay");
  console.log("  ✓ Bỏ bảo vệ thành công");

  await page.locator(".vno-ribbon-tab").filter({ hasText: "Trợ giúp" }).click();
  await page.locator('[data-command-id="sheet.help.open"]').click();
  await page.locator(".vno-help-panel:not([hidden])").waitFor({ state: "visible" });
  await page.locator(".vno-help-search").fill("đổi tên trang tính");
  await page.waitForTimeout(150);
  const helpHit = await page.locator(".vno-help-panel").innerText();
  assert(helpHit.toLowerCase().includes("đổi tên"), "Help phải tìm được bài Đổi tên trang tính", helpHit.slice(0, 200));
  console.log("  ✓ Help tìm được Đổi tên trang tính");

  assert(pageErrors.length === 0, "Không được có pageerror", pageErrors.join(" | "));
  console.log("=== PASS: SHEET RENAME / MOVE-COPY / PROTECT LIVE ===");
} finally {
  await browser.close();
  server.close();
}
