import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_SECTION_PORT || 8851);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(pathname === "/" ? "/index.html" : pathname).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": path.extname(file) === ".js" ? "text/javascript; charset=UTF-8" : path.extname(file) === ".css" ? "text/css; charset=UTF-8" : "text/html; charset=UTF-8" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const failures = [];
const check = (condition, label, detail = "") => { console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`); if (!condition) failures.push(label); };
let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "domcontentloaded" });
  await page.locator(".vno-writer-body").waitFor({ state: "visible", timeout: 20000 });

  await page.locator("#vno-ribbon-tab-design").click();
  await page.locator('[data-command-id="writer.page.color"]').click();
  const colorDialog = page.locator(".vno-page-color-dialog");
  await colorDialog.waitFor();
  await colorDialog.locator('[data-page-color="#dbeafe"]').click();
  await colorDialog.locator('[data-action="apply"]').click();
  const colorState = await page.locator(".vno-writer-page").evaluate((el) => ({ inline: el.style.backgroundColor, computed: getComputedStyle(el).backgroundColor }));
  check(colorState.computed === "rgb(219, 234, 254)", "Page Color đổi computed CSS thật", JSON.stringify(colorState));

  await page.locator("#vno-ribbon-tab-layout").click();
  await page.locator('[data-dropdown-id="writer.layout.breaks"]').click();
  await page.locator('.vno-ribbon-dropdown-item[data-command-id="writer.section.nextPage"]').click();
  check(await page.locator('.vno-writer-body [data-vno-section-break="nextPage"]').count() === 1, "Next Page chèn marker section thật");

  const widthBefore = await page.locator(".vno-writer-page").evaluate((el) => parseFloat(el.style.width));
  await page.locator('[data-command-id="writer.page.orientation"]').click();
  await page.locator("#vno-pagesetup-orientation").selectOption("landscape");
  await page.locator(".vno-dialog-ok-btn").click();
  const widthAfter = await page.locator(".vno-writer-page").evaluate((el) => parseFloat(el.style.width));
  check(widthAfter > widthBefore, "Section sau đổi sang landscape trên canvas", `${widthBefore} -> ${widthAfter}`);

  await page.locator('[data-dropdown-id="writer.layout.breaks"]').click();
  await page.locator('.vno-ribbon-dropdown-item[data-command-id="writer.break.column"]').click();
  check(await page.locator('.vno-writer-body [data-vno-column-break="true"]').count() === 1, "Column Break chèn marker thật");
  check(errors.length === 0, "Không có pageerror", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) { console.error(`FAILURES: ${failures.join(", ")}`); process.exit(1); }
