import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = http.createServer((req, res) => {
  const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(root, path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ""));
  const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" }[path.extname(file)] || "application/octet-stream";
  fs.stat(file, (error, stat) => { if (error || !stat.isFile()) return res.writeHead(404).end(); res.writeHead(200, { "Content-Type": mime }); fs.createReadStream(file).pipe(res); });
});
await new Promise(resolve => server.listen(8799, resolve));
const playwright = await import(pathToFileURL("C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs"));
const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = []; page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8799/", { waitUntil: "networkidle" });
  if (!await page.locator('.vno-shell[data-app="sheet"]').count()) { await page.locator("#vno-switcher-toggle").click(); await page.locator('[data-switch="sheet"]').click(); }
  const shell = page.locator('.vno-shell[data-app="sheet"]'); await shell.locator('[data-coord="A1"]').waitFor();
  const formula = shell.locator("#vno-formula-val");
  const enter = async (coord, value) => { await shell.locator(`[data-coord="${coord}"]`).click(); await formula.fill(value); await shell.locator('[data-coord="A10"]').click(); };
  await enter("D1", "7"); await enter("A1", "=D1*2"); await enter("B1", "1"); await enter("C1", "3");
  const startBox = await shell.locator('[data-coord="A1"]').boundingBox(), endBox = await shell.locator('[data-coord="D2"]').boundingBox();
  await page.mouse.move(startBox.x + 8, startBox.y + 8); await page.mouse.down(); await page.mouse.move(endBox.x + endBox.width - 8, endBox.y + endBox.height - 8, { steps: 8 }); await page.mouse.up();
  await shell.locator("#vno-ribbon-tab-data").click();
  const dropdown = shell.locator('[data-dropdown-id="sheet-what-if-analysis"]');
  if (await dropdown.count() !== 1 || !await dropdown.locator("svg").count()) throw new Error("Thiếu dropdown/icon What-If");
  await dropdown.click(); await page.locator('[role="menuitem"][data-command-id="sheet.data.dataTable"]').click();
  const tableDialog = page.locator("#vno-data-table-row-input").locator("xpath=ancestor::*[contains(@class,'vno-dialog-box')]"); await page.locator("#vno-data-table-row-input").waitFor();
  await tableDialog.locator("#vno-data-table-row-input").fill("D1"); await tableDialog.locator(".vno-rule-apply").click(); await page.locator("#vno-data-table-row-input").waitFor({ state: "detached" });
  const b2 = (await shell.locator('[data-coord="B2"]').textContent()).trim(), c2 = (await shell.locator('[data-coord="C2"]').textContent()).trim(), d2 = (await shell.locator('[data-coord="D2"]').textContent()).trim();
  if (b2 !== "2" || c2 !== "6" || d2 !== "14") throw new Error(`Data Table sai: ${b2},${c2},${d2}`);

  await enter("E1", "1"); await enter("E2", "2"); await enter("F1", "=E1+E2*2");
  await shell.locator("#vno-ribbon-tab-data").click(); await dropdown.click(); await page.locator('[role="menuitem"][data-command-id="sheet.data.scenarioManager"]').click();
  await page.locator("#vno-scenario-list").waitFor(); const scenario = page.locator("#vno-scenario-list").locator("xpath=ancestor::*[contains(@class,'vno-dialog-box')]");
  await scenario.locator("#vno-scenario-name").fill("Cơ sở"); await scenario.locator("#vno-scenario-cells").fill("E1, E2"); await scenario.locator("#vno-scenario-values").fill("10, 5"); await scenario.locator("[data-scenario-add]").click();
  await scenario.locator("#vno-scenario-name").fill("Tăng trưởng"); await scenario.locator("#vno-scenario-values").fill("20, 10"); await scenario.locator("[data-scenario-add]").click();
  await scenario.locator("#vno-scenario-list").selectOption({ label: "Tăng trưởng" }); await scenario.locator(".vno-rule-apply").click();
  const result = (await shell.locator('[data-coord="F1"]').textContent()).trim();
  if (result !== "40") throw new Error(`Scenario Hiển thị sai, F1=${result}`);
  if (errors.length) throw new Error(errors.join("; "));
  console.log("PASS: Edge Playwright — What-If dropdown, Data Table và Scenario Manager bằng click/fill thật; không SendKeys");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
