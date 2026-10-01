import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8", ".svg": "image/svg+xml" };
const server = http.createServer((request, response) => {
  let requestPath = decodeURIComponent(request.url.split("?")[0]);
  if (requestPath === "/") requestPath = "/index.html";
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end("Not Found");
    return;
  }
  response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

await new Promise((resolve, reject) => {
  server.listen(0, "127.0.0.1", resolve);
  server.once("error", reject);
});
const address = server.address();
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
let browser;

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  await page.goto(`http://127.0.0.1:${address.port}/index.html?app=sheet`, { waitUntil: "networkidle" });
  await page.locator(".vno-sheet-container").waitFor({ timeout: 15000 });

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    for (let row = 1; row <= 5; row++) grid.setCellValue("A", row, row, false);
    grid.addSheet("Sheet2", false);
    grid.switchSheet("Sheet2");
    grid.setCellValue("A", 1, 10, false);
    grid.setCellValue("A", 2, 20, false);
    grid.switchSheet("Sheet1");
    grid.selectCell("B", 1);
  });

  await page.locator('.vno-grid-cell[data-coord="B1"]').click();
  await page.keyboard.type("=SUM");
  await page.locator(".vno-autocomplete-popup .vno-autocomplete-item").first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Tab");
  const accepted = await page.locator("#vno-formula-val").inputValue();
  if (accepted !== "=SUM(") throw new Error(`Tab did not insert SUM(: ${accepted}`);

  const start = await page.locator('.vno-grid-cell[data-coord="A1"]').boundingBox();
  const end = await page.locator('.vno-grid-cell[data-coord="A5"]').boundingBox();
  if (!start || !end) throw new Error("A1:A5 was not visible for the range drag");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.type(")");
  await page.keyboard.press("Enter");

  const committed = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const result = grid.cellsData.get("B1");
    return { formula: result?.formula, value: result?.val };
  });
  if (committed.formula !== "=SUM(A1:A5)" || committed.value !== 15) {
    throw new Error(`Formula entry result mismatch: ${JSON.stringify(committed)}`);
  }

  await page.locator("#vno-formula-val").click();
  await page.keyboard.type("=SUM");
  await page.locator(".vno-autocomplete-popup .vno-autocomplete-item").first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Tab");
  await page.locator('.vno-sheet-tab-item[data-sheet="Sheet2"]').click();
  const crossSheetStart = await page.locator('.vno-grid-cell[data-coord="A1"]').boundingBox();
  const crossSheetEnd = await page.locator('.vno-grid-cell[data-coord="A2"]').boundingBox();
  if (!crossSheetStart || !crossSheetEnd) throw new Error("Sheet2!A1:A2 was not visible for the range drag");
  await page.mouse.move(crossSheetStart.x + crossSheetStart.width / 2, crossSheetStart.y + crossSheetStart.height / 2);
  await page.mouse.down();
  await page.mouse.move(crossSheetEnd.x + crossSheetEnd.width / 2, crossSheetEnd.y + crossSheetEnd.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.type(")");
  await page.keyboard.press("Enter");
  const crossSheet = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const result = grid.sheetsData.Sheet1.get("B2");
    return { activeSheet: grid.activeSheet, formula: result?.formula, value: result?.val };
  });
  if (crossSheet.activeSheet !== "Sheet1" || crossSheet.formula !== "=SUM(Sheet2!A1:A2)" || crossSheet.value !== 30) {
    throw new Error(`Cross-sheet formula entry mismatch: ${JSON.stringify(crossSheet)}`);
  }
  console.log("PASS 3T Sheet formula entry: =SUM → Tab → drag A1:A5 → ) → Enter = 15");
  console.log("PASS 3T Sheet formula bar: cross-sheet drag returns to Sheet1 and calculates Sheet2!A1:A2 = 30");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
