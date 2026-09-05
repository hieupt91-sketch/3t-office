import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_SPELLCHECK_PORT || 8799);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : decodeURIComponent(request.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("vno-spellcheck-vi-personal"));

  if (await page.locator(".vno-shell").getAttribute("data-app") !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
  }
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await page.locator(".vno-grid-cell").first().waitFor();

  await page.evaluate(async () => {
    const grid = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
    grid.cellsData.clear();
    grid.setCellValue("A", 20, "chínnh");
    grid.setCellValue("B", 20, "học sinh đọc sách");
    grid.setCellValue("C", 20, 12345);
    grid.setCellValue("D", 20, "=SUM(1,2)");
    grid.cellsData.set("E20", { val: "chínnh", formula: '="chínnh"', style: {} });
  });

  await page.locator("#vno-ribbon-tab-review").click();
  const spellBtn = page.locator('[data-command-id="sheet.review.spellCheck"]');
  await spellBtn.waitFor();
  assert(await spellBtn.isVisible(), "Nút Chính tả hiện trên tab Xem xét");
  await spellBtn.click();

  const dialog = page.locator('.vno-sheet-spellcheck-dialog[data-dialog="sheet-spellcheck"]');
  await dialog.waitFor();
  assert(await dialog.getAttribute("data-spellcheck-state") === "issue", "Dialog mở ở trạng thái có lỗi");
  assert(await dialog.getAttribute("data-spell-word") === "chínnh", "Dialog bắt đúng từ sai chínnh, không quét số/công thức trước");
  assert(await dialog.getAttribute("data-spell-coord") === "A20", "Dialog trỏ đúng ô văn bản A20");
  assert(await dialog.locator("#vno-spell-suggestions option", { hasText: "chính" }).count() > 0, "Có gợi ý chính");

  const screenshotPath = path.join(os.tmpdir(), "sheet-spellcheck-vi.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`INFO\tẢnh kiểm chứng: ${screenshotPath}`);

  await dialog.locator("#vno-spell-suggestions").selectOption("chính");
  await dialog.locator("#vno-spell-replace").click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector(".vno-sheet-spellcheck-dialog");
    return overlay?.dataset?.spellcheckState === "done";
  });
  assert(await dialog.getAttribute("data-spellcheck-state") === "done", "Sau khi thay thế, không còn lỗi vì số/công thức/ô đúng bị bỏ qua");
  const cellValue = await page.evaluate(async () => {
    const grid = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
    return {
      a20: grid.cellsData.get("A20")?.val,
      b20: grid.cellsData.get("B20")?.val,
      c20: grid.cellsData.get("C20")?.val,
      d20: grid.cellsData.get("D20"),
      e20: grid.cellsData.get("E20")
    };
  });
  assert(cellValue.a20 === "chính", "Ô A20 được thay thành chính", JSON.stringify(cellValue.a20));
  assert(cellValue.b20 === "học sinh đọc sách", "Ô đúng không bị sửa", JSON.stringify(cellValue.b20));
  assert(cellValue.c20 === 12345, "Ô số không bị đụng", JSON.stringify(cellValue.c20));
  assert(String(cellValue.d20?.formula || "").startsWith("="), "Ô công thức không bị đụng", JSON.stringify(cellValue.d20));
  assert(String(cellValue.e20?.formula || "").startsWith("=") && cellValue.e20?.val !== "chính", "Công thức ra chữ sai không bị quét/sửa", JSON.stringify(cellValue.e20));

  await dialog.locator("#vno-spell-close").click();
  await page.waitForFunction(() => !document.querySelector(".vno-sheet-spellcheck-dialog"));
  assert(pageErrors.length === 0, "Không có pageerror", pageErrors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
