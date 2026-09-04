import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_COMMON_GAPS_PORT || 8792);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();

  const direct = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCellValue("X", 150, "LAST", false);
    grid.selectCell("B", 2);
    grid.selectCell("D", 7, true);
    const endResult = await globalCommandBus.execute("sheet.nav.end");
    const end = { ...grid.selectedCoord, range: grid.getSelectedRangeLabel() };
    const homeResult = await globalCommandBus.execute("sheet.nav.home");
    return { endResult, end, homeResult, home: { ...grid.selectedCoord, range: grid.getSelectedRangeLabel() } };
  });
  if (!direct.endResult || direct.end.c !== "X" || direct.end.r !== 150 || direct.end.range !== "X150") throw new Error(`Sheet CommandBus End sai: ${JSON.stringify(direct)}`);
  if (!direct.homeResult || direct.home.c !== "A" || direct.home.r !== 1 || direct.home.range !== "A1") throw new Error(`Sheet CommandBus Home sai: ${JSON.stringify(direct)}`);

  await page.locator('.vno-grid-cell[data-coord="C10"]').click();
  await page.keyboard.press("Control+End");
  if (await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid.getSelectedRangeLabel()) !== "X150") throw new Error("Ctrl+End keyboard không đi qua ShortcutManager");
  await page.keyboard.press("Control+Home");

  await page.evaluate(async () => {
    const grid = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
    grid.selectCell("A", 4);
    grid.selectCell("A", 7, true);
  });
  await page.locator('.vno-ribbon-tab').filter({ hasText: /^Chèn$/ }).click();
  await page.locator('[data-command-id="sheet.insert.sparklineLine"]').click();
  if (await page.locator('[data-coord="A4"] svg[data-sparkline="line"]').count() !== 1) throw new Error("Sparkline Line chưa render trong ô");

  await page.locator('.vno-grid-cell[data-coord="B10"]').click();
  await page.keyboard.press("Control+K");
  await page.locator(".vno-dialog-input").fill("https://example.com");
  await page.locator(".vno-dialog-ok-btn").click();
  await page.locator('[data-coord="B10"] a[href="https://example.com"]').waitFor();

  await page.locator('[data-command-id="sheet.insert.textbox"]').click();
  await page.locator(".vno-dialog-input").fill("Ghi chú nổi");
  await page.locator(".vno-dialog-ok-btn").click();
  await page.locator(".vno-sheet-textbox", { hasText: "Ghi chú nổi" }).waitFor();

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="writer"]').click();
  const writer = page.locator(".vno-writer-body");
  await writer.click();
  await page.keyboard.press("Control+End");
  let atEnd = await page.evaluate(() => { const s = getSelection(); return s?.rangeCount && s.getRangeAt(0).collapsed && s.getRangeAt(0).endOffset === document.querySelector('.vno-writer-body').childNodes.length; });
  if (!atEnd) throw new Error("Writer Ctrl+End không đặt Range ở cuối tài liệu");
  await page.keyboard.press("Control+Home");
  const atStart = await page.evaluate(() => { const r = getSelection()?.getRangeAt(0); return r?.collapsed && r.startOffset === 0; });
  if (!atStart) throw new Error("Writer Ctrl+Home không đặt Range ở đầu tài liệu");
  console.log("PASS common navigation and Sheet Insert gaps via Edge/CommandBus/keyboard");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
