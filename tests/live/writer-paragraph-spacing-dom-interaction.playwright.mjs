/**
 * VN Writer — Paragraph Spacing Before/After: live DOM interaction test
 * Verifies ribbon selects set correct inline CSS margin-top/margin-bottom
 * on .vno-writer-body p elements without needing soffice.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SPACING_PORT || 8787);
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

  const writer = page.locator(".vno-writer-body");

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await writer.waitFor({ state: "visible" });
  await writer.click();
  await page.keyboard.type("Đoạn đầu tiên");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Đoạn thứ hai");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Đoạn thứ ba");
  await page.waitForTimeout(300);

  await page.locator("#vno-ribbon-tab-layout").click();
  await page.waitForTimeout(300);

  await page.locator(".vno-writer-body p").first().click();
  await page.waitForTimeout(200);

  await page.locator('select[data-command-id="writer.para.spacingBefore"]').selectOption("12");
  const marginTopBefore = await page.locator(".vno-writer-body p").first().evaluate(el => el.style.marginTop);
  assert(marginTopBefore === "12pt", "Spacing Before sets margin-top:12pt on selected paragraph", JSON.stringify({ marginTopBefore }));

  await page.locator('select[data-command-id="writer.para.spacingAfter"]').selectOption("6");
  const marginBottomAfter = await page.locator(".vno-writer-body p").first().evaluate(el => el.style.marginBottom);
  assert(marginBottomAfter === "6pt", "Spacing After sets margin-bottom:6pt on selected paragraph", JSON.stringify({ marginBottomAfter }));

  await page.locator('select[data-command-id="writer.para.spacingBefore"]').selectOption("0");
  const marginTopReset = await page.locator(".vno-writer-body p").first().evaluate(el => el.style.marginTop);
  assert(marginTopReset === "0pt", "Spacing Before 0pt sets explicit margin-top:0pt (overrides CSS 6pt)", JSON.stringify({ marginTopReset }));

  await page.locator('select[data-command-id="writer.para.spacingAfter"]').selectOption("18");
  const marginBottomLarge = await page.locator(".vno-writer-body p").first().evaluate(el => el.style.marginBottom);
  assert(marginBottomLarge === "18pt", "Spacing After 18pt sets margin-bottom:18pt", JSON.stringify({ marginBottomLarge }));

  await page.locator(".vno-writer-body p").nth(1).click();
  await page.waitForTimeout(200);
  await page.locator('select[data-command-id="writer.para.spacingBefore"]').selectOption("8");
  await page.locator('select[data-command-id="writer.para.spacingAfter"]').selectOption("8");
  const secondStyle = await page.locator(".vno-writer-body p").nth(1).evaluate(el => ({
    marginTop: el.style.marginTop,
    marginBottom: el.style.marginBottom
  }));
  assert(secondStyle.marginTop === "8pt" && secondStyle.marginBottom === "8pt",
    "Different paragraph gets independent spacing (8pt before/after)", JSON.stringify(secondStyle));

  const firstStyleStill = await page.locator(".vno-writer-body p").first().evaluate(el => ({
    marginTop: el.style.marginTop,
    marginBottom: el.style.marginBottom
  }));
  assert(firstStyleStill.marginTop === "0pt" && firstStyleStill.marginBottom === "18pt",
    "First paragraph spacing unchanged after selecting second paragraph", JSON.stringify(firstStyleStill));

  const nonSelectedStyle = await page.locator(".vno-writer-body p").nth(2).evaluate(el => ({
    marginTop: el.style.marginTop,
    marginBottom: el.style.marginBottom
  }));
  assert(nonSelectedStyle.marginTop === "" && nonSelectedStyle.marginBottom === "",
    "Unselected paragraph has no inline margin (stylesheet default applies)", JSON.stringify(nonSelectedStyle));

  assert(errors.length === 0, "No browser page errors during paragraph spacing DOM test", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(`\nParagraph spacing DOM test: ${failures.length === 0 ? "ALL PASS" : `${failures.length} FAIL`}`);
if (failures.length) process.exitCode = 1;
