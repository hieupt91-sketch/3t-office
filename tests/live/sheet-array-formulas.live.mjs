import { pathToFileURL } from "node:url";

const playwrightPath = process.env.VNO_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("Thiếu VNO_PLAYWRIGHT_PATH");
const playwright = await import(pathToFileURL(playwrightPath).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.goto("http://127.0.0.1:8765", { waitUntil: "networkidle" });
await page.click("#vno-switcher-toggle");
await page.click('[data-switch="sheet"]');
await page.waitForSelector('.vno-grid-cell[data-coord="A1"]');

async function enterCell(coord, value) {
  await page.click(`.vno-grid-cell[data-coord="${coord}"]`);
  await page.click("#vno-formula-val");
  await page.locator("#vno-formula-val").fill(String(value));
  await page.keyboard.press("Enter");
}
for (let row = 1; row <= 5; row++) {
  await enterCell(`A${row}`, row);
  await enterCell(`B${row}`, row + 1);
}
const before = await page.locator('.vno-grid-cell[data-col="C"]').evaluateAll(cells => cells.slice(0, 5).map(cell => cell.textContent));
await page.click('.vno-grid-cell[data-coord="C1"]');
await page.click('.vno-grid-cell[data-coord="C5"]', { modifiers: ["Shift"] });
await page.click("#vno-formula-val");
await page.locator("#vno-formula-val").fill("=A1:A5*B1:B5");
await page.keyboard.press("Control+Shift+Enter");

const values = await page.locator('.vno-grid-cell[data-col="C"]').evaluateAll(cells => cells.slice(0, 5).map(cell => cell.textContent));
const metadata = await page.evaluate(async () => {
  const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
  const grid = globalUnoBridge.activeDocument?.grid;
  return ["C1", "C2", "C3", "C4", "C5"].map(coord => ({ coord, ...grid.cellsData.get(coord) }));
});
if (values.join(",") !== "2,6,12,20,30") throw new Error(`Sai kết quả UI: ${values.join(",")}`);
if (!metadata.every(item => item.isArrayFormula && item.arrayRange === "C1:C5")) throw new Error("Thiếu metadata array formula");
await page.keyboard.press("Control+Z");
const undone = await page.locator('.vno-grid-cell[data-col="C"]').evaluateAll(cells => cells.slice(0, 5).map(cell => cell.textContent));
if (undone.join(",") !== before.join(",")) throw new Error(`Undo không khôi phục cả vùng: ${undone.join(",")}`);

await page.click('.vno-sheet-tab-item[data-sheet="Kế hoạch Q3"]');
for (let row = 1; row <= 5; row++) await enterCell(`A${row}`, row);
await page.click('.vno-sheet-tab-item[data-sheet="Dự toán chi phí"]');
await enterCell("D1", "=SUM('Kế hoạch Q3'!A1:A5)");
const crossSheetValue = await page.locator('.vno-grid-cell[data-coord="D1"]').textContent();
if (crossSheetValue !== "15 ₫" && crossSheetValue !== "15 ₫" && crossSheetValue !== "15") throw new Error(`Sai tổng cross-sheet UI: ${crossSheetValue}`);
if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
console.log(JSON.stringify({ pass: true, interactions: "mouse sheet switching/range selection + formula bar input + Ctrl+Shift+Enter + Ctrl+Z", values, before, undone, crossSheetValue }));
await browser.close();
