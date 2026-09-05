import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = http.createServer((req, res) => {
  const pathname = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(root, path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ""));
  const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" }[path.extname(file)] || "application/octet-stream";
  fs.stat(file, (error, stat) => { if (error || !stat.isFile()) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": mime }); fs.createReadStream(file).pipe(res); });
});
await new Promise(resolve => server.listen(8807, resolve));
const playwright = await import(pathToFileURL("C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs"));
const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, locale: "vi-VN" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function setCell(coord, value) {
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  await shell.locator(`[data-coord="${coord}"]`).click();
  const formulaBar = shell.locator("#vno-formula-val");
  await formulaBar.fill(String(value));
}

try {
  await page.goto("http://127.0.0.1:8807/", { waitUntil: "networkidle" });
  if (await page.locator('.vno-shell[data-app="sheet"]').count() === 0) {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
  }
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  await shell.locator('.vno-grid-cell[data-coord="A1"]').waitFor({ state: "visible" });

  await setCell("A1", "5");
  await setCell("A2", "4");
  await setCell("A3", "3");
  await setCell("B1", "2");
  await setCell("C1", "3");
  await setCell("D1", "1");
  await setCell("E1", "1");
  await setCell("F1", "=IF(SUM(A1:A3)>10,B1*C1,D1+E1)");
  await shell.locator('[data-coord="F2"]').click();
  await shell.locator('[data-coord="F1"]').click();
  const f1Value = (await shell.locator('[data-coord="F1"]').textContent()).trim();
  if (f1Value !== "6") throw new Error(`F1 trên lưới phải là 6 trước khi mở dialog, thực tế: ${f1Value}`);

  await shell.locator("#vno-ribbon-tab-formulas").click();
  const command = shell.locator('[data-command-id="sheet.formula.evaluateFormula"]');
  if (await command.count() < 1) throw new Error("Ribbon thiếu nút Ước lượng công thức");
  if (!(await command.locator("svg").count())) throw new Error("Nút Ước lượng công thức thiếu SVG");
  await command.first().click();

  const dialog = page.locator(".vno-evaluate-formula-dialog .vno-dialog-box");
  await dialog.waitFor();
  const underline = dialog.locator(".vno-eval-underline");
  await underline.waitFor();
  const firstPart = (await underline.textContent()).trim();
  if (firstPart !== "SUM(A1:A3)") throw new Error(`Bước 1 phải gạch chân SUM(A1:A3), thực tế: ${firstPart}`);

  const evaluateBtn = dialog.locator(".vno-eval-btn-evaluate");
  await evaluateBtn.click();
  const afterSum = (await underline.textContent()).trim();
  const formulaAfterSum = (await dialog.locator("#vno-eval-formula").textContent()).replace(/\s/g, "");
  if (afterSum !== "12>10") throw new Error(`Bước 2 phải gạch chân 12>10, thực tế: ${afterSum}`);
  if (!formulaAfterSum.includes("12>10")) throw new Error(`Sau SUM, công thức phải chứa 12, thực tế: ${formulaAfterSum}`);
  const stepValue1 = (await dialog.locator("#vno-eval-step-value").textContent()).trim();
  if (!stepValue1.includes("12")) throw new Error(`Giá trị bước SUM phải hiện 12, thực tế: ${stepValue1}`);

  await evaluateBtn.click();
  const afterCmp = (await underline.textContent()).trim();
  if (afterCmp !== "B1*C1") throw new Error(`Bước 3 phải gạch chân B1*C1, thực tế: ${afterCmp}`);
  const stepValue2 = (await dialog.locator("#vno-eval-step-value").textContent()).trim();
  if (!/TRUE/i.test(stepValue2)) throw new Error(`Giá trị bước so sánh phải TRUE, thực tế: ${stepValue2}`);

  await evaluateBtn.click();
  const stepValue3 = (await dialog.locator("#vno-eval-step-value").textContent()).trim();
  if (!stepValue3.includes("6")) throw new Error(`Giá trị nhánh B1*C1 phải 6, thực tế: ${stepValue3}`);

  await evaluateBtn.click();
  const doneText = (await dialog.locator("#vno-eval-final").textContent()).trim();
  if (!doneText.includes("6") || !/khớp/i.test(doneText)) throw new Error(`Kết quả cuối phải 6 và khớp ô, thực tế: ${doneText}`);
  if (await underline.count()) throw new Error("Sau khi xong không còn phần gạch chân");

  const f1After = (await shell.locator('[data-coord="F1"]').textContent()).trim();
  if (f1After !== "6") throw new Error(`Dialog đã làm thay đổi F1: ${f1After}`);

  await dialog.locator(".vno-eval-btn-restart").click();
  const restarted = (await underline.textContent()).trim();
  if (restarted !== "SUM(A1:A3)") throw new Error(`Khởi động lại phải về SUM(A1:A3), thực tế: ${restarted}`);
  await dialog.locator(".vno-rule-cancel").click();

  if (errors.length) throw new Error(errors.join("; "));
  console.log("PASS: Edge Playwright — Evaluate Formula ribbon/dialog/từng bước engine thật, không dùng SendKeys");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
