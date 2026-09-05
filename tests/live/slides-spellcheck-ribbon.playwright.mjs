/** Live Review > Spelling button on the running Slides canvas. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_SPELLCHECK_RIBBON_PORT || 8843);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.join(rootDir, path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\]*\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { response.writeHead(404); response.end("404"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  });
});

function assert(condition, message) { if (!condition) throw new Error(message); }

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("vno-spellcheck-vi-personal"));
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.locator('.vno-slide-canvas[data-spellcheck-status="ready"]').waitFor();

  await page.locator("#vno-ribbon-tab-review").click();
  const spellBtn = page.locator('[data-command-id="slides.review.spellCheck"]').first();
  assert(await spellBtn.isVisible(), "Nút Chính tả không hiện trên tab Đánh giá");

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[0].title = "chínnh tả tiếng Việt";
    canvas.slides[0].body = "học sinh đọc sách";
    canvas.selectSlide(0);
  });

  await spellBtn.click();
  const dialog = page.locator('.vno-slides-spellcheck-dialog[data-dialog="slides-spellcheck"]');
  await dialog.waitFor({ state: "visible", timeout: 4000 });
  const flagged = await dialog.locator("#vno-slides-spell-not-in-dict").inputValue();
  assert(flagged === "chínnh", `Dialog phải hiện lỗi chínnh, nhận: ${flagged}`);
  const changeTo = await dialog.locator("#vno-slides-spell-word").inputValue();
  assert(changeTo === "chính", `Ô thay thế phải sẵn gợi ý chính, nhận: ${changeTo}`);
  const suggestions = await dialog.locator("#vno-slides-spell-suggestions").textContent();
  assert(/chính/i.test(suggestions || ""), `Thiếu gợi ý chính: ${suggestions}`);

  await dialog.locator("#vno-slides-spell-replace").click();
  const afterReplace = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const overlay = document.querySelector(".vno-slides-spellcheck-dialog");
    return {
      title: canvas.slides[0].title,
      state: overlay?.dataset.spellcheckState || "",
      remaining: canvas.collectSpellcheckIssues().map((item) => item.word)
    };
  });
  assert(afterReplace.title.includes("chính"), `Title chưa được sửa: ${afterReplace.title}`);
  assert(!afterReplace.title.includes("chínnh"), "Vẫn còn chínnh sau Thay thế");

  await dialog.locator("#vno-slides-spell-close").click();
  await dialog.waitFor({ state: "detached", timeout: 3000 });

  if (pageErrors.length) throw new Error(pageErrors.join(" | "));
  console.log("PASS: live Slides Review spellcheck — click nút ribbon, dialog quét thật, thay thế chínnh → chính");
} finally {
  await browser?.close();
  server.close();
}
