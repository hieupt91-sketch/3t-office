import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 8797;
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(ROOT_DIR, path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, ""));
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
});
await new Promise(resolve => server.listen(PORT, resolve));

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  if (await page.locator(".vno-shell").getAttribute("data-app") !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }
  const put = async (coord, value) => {
    await page.locator(`.vno-grid-cell[data-coord="${coord}"]`).click();
    await page.locator("#vno-formula-val").fill(value);
    await page.locator("#vno-formula-val").press("Enter");
  };
  await put("A20", "2");
  await put("B20", "3");
  await put("C20", "=A20+B20");

  await page.locator('.vno-grid-cell[data-coord="C20"]').click();
  await page.keyboard.press("Control+c");
  await page.locator('.vno-grid-cell[data-coord="D20"]').click();
  await page.keyboard.press("Control+Alt+v");

  const dialog = page.locator('.vno-dialog-box[aria-label="Dán đặc biệt"]');
  await dialog.waitFor();
  await dialog.locator('input[value="values"]').check();
  await dialog.locator(".vno-rule-apply").click();
  await dialog.waitFor({ state: "detached" });

  const d20 = page.locator('.vno-grid-cell[data-coord="D20"]');
  if (!(await d20.textContent()).includes("5")) throw new Error(`D20 không có kết quả 5: ${await d20.textContent()}`);
  await d20.click();
  const formulaBar = await page.locator("#vno-formula-val").inputValue();
  if (formulaBar.startsWith("=")) throw new Error(`Paste Values Only vẫn giữ công thức: ${formulaBar}`);
  if (errors.length) throw new Error(errors.join(" | "));
  console.log("PASS: live UI copy thật, Ctrl+Alt+V, dialog radio và Paste Values Only không còn công thức");
} finally {
  await browser.close();
  server.close();
}
