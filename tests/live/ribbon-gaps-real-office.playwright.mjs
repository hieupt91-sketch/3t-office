import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_RIBBON_GAPS_PORT || 8786);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

let browser;
const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  const cell = page.locator('.vno-grid-cell[data-coord="A20"]');
  await cell.click();
  await page.keyboard.type("1234.567 long cell content for wrap text");
  await page.keyboard.press("Enter");
  await cell.click();

  await page.locator('select[data-command-id="sheet.font.family"]').selectOption("Calibri");
  await page.locator('select[data-command-id="sheet.font.size"]').selectOption("11");
  await page.locator('[data-command-id="sheet.font.grow"]').click();
  await page.locator('[data-command-id="sheet.cell.alignMiddle"]').click();
  await page.locator('[data-command-id="sheet.cell.wrapText"]').click();
  await page.locator('[data-command-id="sheet.cell.indentIncrease"]').click();
  const sheetStyle = await cell.evaluate(el => ({
    fontFamily: el.style.fontFamily, fontSize: el.style.fontSize, verticalAlign: el.style.verticalAlign,
    whiteSpace: el.style.whiteSpace, paddingLeft: el.style.paddingLeft, height: el.getBoundingClientRect().height
  }));
  assert(sheetStyle.fontFamily === "Calibri" && sheetStyle.fontSize === "12px", "Sheet font dropdowns and grow button apply through ribbon", JSON.stringify(sheetStyle));
  assert(sheetStyle.verticalAlign === "middle" && sheetStyle.whiteSpace === "normal" && sheetStyle.paddingLeft === "20px", "Sheet vertical/wrap/indent controls apply through mouse clicks", JSON.stringify(sheetStyle));
  assert(sheetStyle.height > 26, "Wrap Text increases rendered row height", String(sheetStyle.height));

  await page.locator('select[data-command-id="sheet.format.quickCategory"]').selectOption("number");
  await page.locator('[data-command-id="sheet.format.increaseDecimal"]').click();
  await page.locator('[data-command-id="sheet.format.decreaseDecimal"]').click();
  const numberState = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.cellsData.get("A20").style.numberFormat;
  });
  assert(numberState.category === "number" && numberState.decimals === 2, "Sheet quick category and decimal buttons preserve category", JSON.stringify(numberState));

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="writer"]').click();
  await page.locator('.vno-shell[data-app="writer"]').waitFor();
  const writer = page.locator(".vno-writer-body");
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await writer.selectText();
  await page.keyboard.press("Backspace");
  await writer.click();
  await page.locator('[data-command-id="writer.list.bullet"]').click();
  await page.keyboard.type("Zulu");
  await page.keyboard.press("Enter");
  await page.keyboard.type("alpha");
  await writer.selectText();
  await page.locator('[data-command-id="writer.para.sort"]').click();
  assert((await writer.innerText()).trim().toLowerCase().startsWith("alpha"), "Writer Sort reorders selected paragraphs A-Z");

  await writer.locator("li").first().selectText();
  await page.locator('[data-command-id="writer.text.changeCase"]').click();
  const changedText = await writer.innerText();
  assert(changedText.includes("ALPHA"), "Writer Change Case Aa button changes selected text", JSON.stringify(changedText));
  await page.locator('[data-command-id="writer.para.showFormattingMarks"]').click();
  assert(await writer.evaluate(el => el.classList.contains("vno-show-formatting-marks")), "Writer Show/Hide formatting marks toggles view state");
  await writer.locator("li").first().selectText();
  await page.locator('[data-command-id="writer.para.shading"]').click();
  await writer.locator("li").first().selectText();
  await page.locator('select[data-command-id="writer.para.borders"]').selectOption("all");
  const paraStyle = await writer.locator("li").first().evaluate(el => ({ backgroundColor: el.style.backgroundColor, border: el.style.border }));
  assert(Boolean(paraStyle.backgroundColor) && paraStyle.border.includes("solid"), "Writer Shading and Borders apply to selected paragraphs", JSON.stringify(paraStyle));
  assert(errors.length === 0, "No browser page errors", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
