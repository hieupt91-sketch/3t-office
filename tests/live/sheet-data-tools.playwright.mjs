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
await new Promise(resolve => server.listen(8796, resolve));
const playwright = await import(pathToFileURL("C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs"));
const browser = await playwright.chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:8796/", { waitUntil: "networkidle" });
  if (await page.locator('.vno-shell[data-app="sheet"]').count() === 0) { await page.locator("#vno-switcher-toggle").click(); await page.locator('[data-switch="sheet"]').click(); }
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  try { await page.locator('.vno-grid-cell[data-coord="A1"]').waitFor({ state: "visible", timeout: 5000 }); }
  catch { throw new Error(`Sheet grid không mount: ${errors.join("; ")}`); }
  await page.locator("#vno-ribbon-tab-data").click();
  for (const id of ["textToColumns", "flashFill", "removeDuplicates", "group", "ungroup", "subtotal"]) {
    const button = page.locator(`[data-command-id="sheet.data.${id}"]`);
    if (await button.count() !== 1) throw new Error(`Thiếu ribbon command ${id}`);
    if (!(await button.locator("svg").count())) throw new Error(`Thiếu SVG ${id}`);
  }
  const order = await page.locator("#vno-ribbon-tabpanel-data .vno-ribbon-group-footer").allTextContents();
  if (!["Sort & Filter|Data Tools|Outline", "Sắp xếp & Lọc|Công cụ dữ liệu|Dàn bài"].includes(order.slice(0, 3).join("|"))) throw new Error(`Sai thứ tự nhóm: ${order.join("|")}`);

  // Real keyboard entry and mouse drag selection.
  for (const [coord, value] of [["A1","Tên"],["B1","Số"],["A2","An"],["B2","10"],["A3","An"],["B3","10"],["A4","Bình"],["B4","20"]]) {
    await page.locator(`[data-coord="${coord}"]`).click(); await page.keyboard.type(value); await page.keyboard.press("Enter");
  }
  const a1 = page.locator('[data-coord="A1"]'), b4 = page.locator('[data-coord="B4"]');
  const from = await a1.boundingBox(), to = await b4.boundingBox();
  await page.mouse.move(from.x + 5, from.y + 5); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 10, { steps: 8 }); await page.mouse.up();
  const busResult = await page.evaluate(async () => { const { globalCommandBus } = await import("/platform/commands/command-bus.js"); return globalCommandBus.execute("sheet.data.removeDuplicates"); });
  if (!busResult) throw new Error("globalCommandBus.execute không mở dialog");
  await page.locator('.vno-dialog-box[aria-label="Xóa trùng lặp"]').waitFor();
  await page.locator(".vno-rule-apply").click();
  await page.getByText(/Đã xóa 1 hàng trùng lặp/).waitFor();
  await page.locator(".vno-rule-cancel").click();
  if ((await page.locator('[data-coord="A3"]').textContent()).trim() !== "Bình") throw new Error("Remove Duplicates không biến đổi lưới");
  await page.keyboard.press("Control+z");
  if ((await page.locator('[data-coord="A4"]').textContent()).trim() !== "Bình") throw new Error("Undo Remove Duplicates thất bại");
  if (errors.length) throw new Error(errors.join("; "));
  console.log("PASS: Edge Playwright — ribbon, SVG, keyboard/mouse, command bus, dialog, mutation, undo");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
