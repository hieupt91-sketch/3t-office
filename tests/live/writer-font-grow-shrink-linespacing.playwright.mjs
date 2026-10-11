import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_FONT_GROW_PORT || 8816);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });

  const body = page.locator(".vno-writer-body");
  await body.click();
  await page.keyboard.type("Kiem tra tang giam co chu va gian dong");
  await page.keyboard.press("Control+a");

  const growBtn = page.locator('[data-command-id="writer.font.grow"]');
  const shrinkBtn = page.locator('[data-command-id="writer.font.shrink"]');
  check(await growBtn.isVisible(), "Nút Tăng cỡ chữ hiện trên ribbon Font (trước đây có lệnh nhưng không có nút)");
  check(await shrinkBtn.isVisible(), "Nút Giảm cỡ chữ hiện trên ribbon Font");

  const getFontSize = el => window.getComputedStyle(el.querySelector("font, span, b, i, u") || el).fontSize;
  const before = await body.evaluate(getFontSize);
  await growBtn.click();
  const after = await body.evaluate(getFontSize);
  check(before !== after, "Bấm Tăng cỡ chữ thực sự đổi font-size trên canvas", `${before} -> ${after}`);

  const lineSpacingBtn = page.locator('[data-dropdown-toggle="writer.para.lineSpacing"]');
  check(await lineSpacingBtn.isVisible(), "Dropdown Giãn dòng hiện trên ribbon Paragraph (trước đây có lệnh nhưng không có nút)");
  await lineSpacingBtn.click();
  await page.waitForTimeout(200);
  const spacing2Item = page.locator('[data-command-id="writer.para.spacing2"]');
  check(await spacing2Item.isVisible(), "Menu Giãn dòng mở ra và có mục 2.0");
  const lineHeightBefore = await body.evaluate(el => window.getComputedStyle(el.querySelector("p, div") || el).lineHeight);
  await spacing2Item.click();
  await page.waitForTimeout(200);
  const lineHeightAfter = await body.evaluate(el => window.getComputedStyle(el.querySelector("p, div") || el).lineHeight);
  check(lineHeightBefore !== lineHeightAfter, "Chọn Giãn dòng 2.0 thực sự đổi line-height trên canvas", `${lineHeightBefore} -> ${lineHeightAfter}`);

  check(pageErrors.length === 0, "Không có lỗi JavaScript nào trong console", pageErrors.join(" | "));
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll Writer Font Grow/Shrink & Line Spacing live checks passed.");
