/**
 * Live regression: Shift+Click chuột thật 3 ô rồi Ctrl+D (Fill Down).
 * Tái hiện bug: selectionRange bị reset về 1 ô vì _startRangeSelect bỏ qua shiftKey.
 */
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8791;

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

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  const appAttr = await page.locator(".vno-shell").getAttribute("data-app");
  if (appAttr !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }

  async function clickCell(coord) {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await page.waitForTimeout(60);
  }

  await clickCell("F2");
  await page.keyboard.type("100");
  await page.keyboard.press("Enter");
  await clickCell("F3");
  await page.keyboard.type("200");
  await page.keyboard.press("Enter");
  await clickCell("F4");
  await page.keyboard.type("300");
  await page.keyboard.press("Enter");
  await clickCell("G2");
  await page.keyboard.type("=F2*2");
  await page.keyboard.press("Enter");

  const g2Text = (await page.locator('.vno-grid-cell[data-coord="G2"]').textContent() || "").trim();
  assert.strictEqual(g2Text, "200", `G2 phải hiện 200 trước Fill Down, nhận: "${g2Text}"`);

  await clickCell("G2");
  await page.keyboard.down("Shift");
  await clickCell("G4");
  await page.keyboard.up("Shift");

  const before = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return {
      label: grid.getSelectedRangeLabel(),
      selectionRange: structuredClone(grid.selectionRange),
      selectedCoord: structuredClone(grid.selectedCoord)
    };
  });
  assert.strictEqual(before.label, "G2:G4", `Shift+Click G2→G4 phải chọn G2:G4, nhận: ${before.label}`);
  assert.strictEqual(before.selectionRange.start.c, "G");
  assert.strictEqual(before.selectionRange.start.r, 2);
  assert.strictEqual(before.selectionRange.end.c, "G");
  assert.strictEqual(before.selectionRange.end.r, 4);
  assert.strictEqual(before.selectedCoord.c, "G");
  assert.strictEqual(before.selectedCoord.r, 2);

  await page.keyboard.press("Control+d");
  await page.waitForTimeout(150);

  const g3Text = (await page.locator('.vno-grid-cell[data-coord="G3"]').textContent() || "").trim();
  const g4Text = (await page.locator('.vno-grid-cell[data-coord="G4"]').textContent() || "").trim();
  assert.strictEqual(g3Text, "400", `G3 sau Ctrl+D phải là 400, nhận: "${g3Text}"`);
  assert.strictEqual(g4Text, "600", `G4 sau Ctrl+D phải là 600, nhận: "${g4Text}"`);

  const formulas = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return {
      G3: grid.cellsData.get("G3")?.formula || "",
      G4: grid.cellsData.get("G4")?.formula || ""
    };
  });
  assert.strictEqual(formulas.G3, "=F3*2");
  assert.strictEqual(formulas.G4, "=F4*2");

  console.log("PASS: Shift+Click G2:G4 rồi Ctrl+D → G3=400 (=F3*2), G4=600 (=F4*2)");
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
