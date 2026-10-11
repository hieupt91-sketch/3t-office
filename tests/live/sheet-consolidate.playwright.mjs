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
await new Promise(resolve => server.listen(8808, resolve));
const playwright = await import(pathToFileURL("C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs"));
const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, locale: "vi-VN" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

const S1 = "Dự toán chi phí";
const S2 = "Kế hoạch Q3";
const S3 = "Nhân sự";

async function setCell(coord, value) {
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  await shell.locator(`[data-coord="${coord}"]`).click();
  const formulaBar = shell.locator("#vno-formula-val");
  await formulaBar.fill(String(value));
}

async function switchSheet(name) {
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  await shell.locator(`.vno-sheet-tab-item[data-sheet="${name}"]`).click();
  await shell.locator('.vno-grid-cell[data-coord="A1"]').waitFor({ state: "visible" });
}

async function dragRange(startCoord, endCoord) {
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  const start = shell.locator(`[data-coord="${startCoord}"]`);
  const end = shell.locator(`[data-coord="${endCoord}"]`);
  await start.waitFor({ state: "visible" });
  const startBox = await start.boundingBox();
  const endBox = await end.boundingBox();
  if (!startBox || !endBox) throw new Error(`Không lấy được bounding box ${startCoord}:${endCoord}`);
  await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2, { steps: 8 });
  await page.mouse.up();
}

try {
  await page.goto("http://127.0.0.1:8808/", { waitUntil: "networkidle" });
  if (await page.locator('.vno-shell[data-app="sheet"]').count() === 0) {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
  }
  const shell = page.locator('.vno-shell[data-app="sheet"]');
  await shell.locator('.vno-grid-cell[data-coord="A1"]').waitFor({ state: "visible" });

  await switchSheet(S1);
  await setCell("A1", "10");
  await setCell("B1", "20");
  await setCell("A2", "3");
  await setCell("B2", "7");

  await switchSheet(S2);
  await setCell("A1", "1");
  await setCell("B1", "2");
  await setCell("A2", "4");
  await setCell("B2", "8");

  await switchSheet(S3);
  await shell.locator('[data-coord="A1"]').click();

  await shell.locator("#vno-ribbon-tab-data").click();
  const command = shell.locator('[data-command-id="sheet.data.consolidate"]');
  if (await command.count() < 1) throw new Error("Ribbon thiếu nút Hợp nhất dữ liệu");
  if (!(await command.locator("svg").count())) throw new Error("Nút Hợp nhất dữ liệu thiếu SVG");
  await command.first().click();

  const dialog = page.locator(".vno-consolidate-dialog .vno-dialog-box");
  await dialog.waitFor();
  const title = (await dialog.locator(".vno-dialog-header strong").textContent()).trim();
  if (title !== "Hợp nhất dữ liệu") throw new Error(`Tiêu đề dialog sai: ${title}`);

  await dialog.locator("#vno-consolidate-function").selectOption("SUM");

  await dialog.locator(".vno-consolidate-browse").click();
  const pickBar = page.locator(".vno-consolidate-dialog.is-picking-range .vno-consolidate-pick-bar");
  await pickBar.waitFor();
  await switchSheet(S1);
  await dragRange("A1", "B2");
  await pickBar.locator(".vno-consolidate-pick-ok").click();
  await dialog.waitFor();
  await dialog.locator(".vno-consolidate-add").click();
  const firstRef = await dialog.locator("#vno-consolidate-list option").nth(0).getAttribute("value");
  if (!firstRef || !firstRef.includes("A1") || !firstRef.includes("B2") || !firstRef.includes(S1)) {
    throw new Error(`Tham chiếu 1 phải là ${S1}!A1:B2, thực tế: ${firstRef}`);
  }

  await dialog.locator(".vno-consolidate-browse").click();
  await pickBar.waitFor();
  await switchSheet(S2);
  await dragRange("A1", "B2");
  await pickBar.locator(".vno-consolidate-pick-ok").click();
  await dialog.waitFor();
  await dialog.locator(".vno-consolidate-add").click();
  const optionCount = await dialog.locator("#vno-consolidate-list option").count();
  if (optionCount !== 2) throw new Error(`Phải có 2 tham chiếu, thực tế ${optionCount}`);
  const secondRef = await dialog.locator("#vno-consolidate-list option").nth(1).getAttribute("value");
  if (!secondRef || !secondRef.includes(S2)) throw new Error(`Tham chiếu 2 phải từ ${S2}, thực tế: ${secondRef}`);

  await dialog.locator(".vno-rule-apply").click();
  await page.locator(".vno-consolidate-dialog").waitFor({ state: "detached" });

  await switchSheet(S3);
  const a1 = (await shell.locator('[data-coord="A1"]').textContent()).trim();
  const b1 = (await shell.locator('[data-coord="B1"]').textContent()).trim();
  const a2 = (await shell.locator('[data-coord="A2"]').textContent()).trim();
  const b2 = (await shell.locator('[data-coord="B2"]').textContent()).trim();
  const hand = { A1: 10 + 1, B1: 20 + 2, A2: 3 + 4, B2: 7 + 8 };
  if (a1 !== String(hand.A1)) throw new Error(`A1 phải ${hand.A1} (10+1), thực tế: ${a1}`);
  if (b1 !== String(hand.B1)) throw new Error(`B1 phải ${hand.B1} (20+2), thực tế: ${b1}`);
  if (a2 !== String(hand.A2)) throw new Error(`A2 phải ${hand.A2} (3+4), thực tế: ${a2}`);
  if (b2 !== String(hand.B2)) throw new Error(`B2 phải ${hand.B2} (7+8), thực tế: ${b2}`);

  if (errors.length) throw new Error(errors.join("; "));
  console.log("PASS: Edge Playwright — Consolidate dialog/Duyệt 2 sheet khác nhau/SUM đúng tính tay, không dùng SendKeys");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
