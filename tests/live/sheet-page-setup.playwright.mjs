import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_PAGE_SETUP_PORT || 8797);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": ext === ".css" ? "text/css" : ext === ".js" || ext === ".mjs" ? "text/javascript" : "text/html" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "domcontentloaded" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ state: "visible" });
  await page.locator(".vno-ribbon-tab").filter({ hasText: "Bố trí trang" }).click();
  const group = page.locator(".vno-ribbon-group").filter({ hasText: "Thiết lập trang" });
  if (await group.count() !== 1) throw new Error("Page Setup ribbon group is missing");
  await page.locator('[data-command-id="sheet.page.margins"]').click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: "Thiết lập trang" });
  await dialog.waitFor({ state: "visible" });
  await dialog.locator("#vno-sheet-margin-preset").selectOption("narrow");
  await dialog.locator("#vno-sheet-margin-top").fill("2.25");
  await dialog.locator("#vno-sheet-orientation").selectOption("landscape");
  await dialog.locator("#vno-sheet-size").selectOption("letter");
  await dialog.locator("#vno-sheet-title-rows").fill("1:2");
  await dialog.locator("#vno-sheet-title-cols").fill("A:B");
  await dialog.locator('[name="vno-sheet-scale-mode"][value="pages"]').check();
  await dialog.locator("#vno-sheet-scale-wide").fill("1");
  await dialog.locator("#vno-sheet-scale-tall").fill("0");
  await dialog.locator("#vno-sheet-center-horizontal").check();
  await dialog.locator("#vno-sheet-center-vertical").check();
  await dialog.locator("#vno-sheet-print-gridlines").check();
  await dialog.locator("#vno-sheet-print-headings").check();
  await dialog.locator(".vno-rule-apply").click();
  await dialog.waitFor({ state: "detached" });
  const result = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const first = grid.activeSheet;
    const firstSetup = grid.getPageSetup();
    const second = grid.sheets.find(name => name !== first);
    grid.switchSheet(second);
    return { firstSetup, secondSetup: grid.getPageSetup(), first, second };
  });
  if (result.firstSetup.orientation !== "landscape" || result.firstSetup.size !== "letter" || result.firstSetup.margins.top !== 2.25 || result.firstSetup.margins.left !== 1.27) throw new Error(`UI model mismatch: ${JSON.stringify(result.firstSetup)}`);
  if (result.firstSetup.printTitles.rows !== "1:2" || result.firstSetup.printTitles.cols !== "A:B") throw new Error("Print Titles were not saved");
  if (result.firstSetup.scale.mode !== "pages" || result.firstSetup.scale.pagesWide !== 1 || !result.firstSetup.centerOnPage.horizontal || !result.firstSetup.printOptions.gridlines) throw new Error("Advanced Page Setup was not saved");
  if (result.secondSetup.orientation !== "portrait" || result.secondSetup.size !== "a4") throw new Error("Page Setup leaked to another sheet");
  await page.locator('[data-command-id="sheet.page.headerFooter"]').click();
  const hfDialog = page.locator('[role="dialog"]').filter({ has: page.locator("#vno-sheet-header-left") });
  await hfDialog.locator('#vno-sheet-header-center').fill("VN HEADER &A");
  await hfDialog.locator('#vno-sheet-footer-center').fill("Trang &P / &N");
  await hfDialog.locator(".vno-rule-apply").click();
  const header = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid.getPageSetup().headerFooter.header.center);
  if (header !== "VN HEADER &A") throw new Error("Header/Footer dialog did not update the active sheet");
  await page.locator(".vno-ribbon-tab").filter({ hasText: "Trợ giúp" }).click();
  await page.locator('[data-command-id="sheet.help.open"]').click();
  await page.locator(".vno-help-panel:not([hidden])").waitFor({ state: "visible" });
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(`PASS: live Sheet canvas Page Setup dialog changed margins/orientation/size/print titles and remained isolated (${result.first} -> ${result.second}).`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
