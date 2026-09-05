/** Live Format Background on the running Slides canvas. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_FORMAT_BG_PORT || 8844);
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
function isRed(color) {
  const value = String(color || "").toLowerCase();
  return value.includes("#dc2626") || value.includes("220, 38, 38") || value.includes("220,38,38");
}

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.locator(".vno-slide-canvas").waitFor();

  await page.locator("#vno-ribbon-tab-design").click();
  const bgBtn = page.locator('[data-command-id="slides.design.formatBackground"]').first();
  assert(await bgBtn.isVisible(), "Nút Định dạng nền không hiện trên tab Thiết kế");
  await bgBtn.click();

  const dialog = page.locator('.vno-format-background-dialog[data-dialog="slides-format-background"]');
  await dialog.waitFor({ state: "visible", timeout: 4000 });
  await dialog.locator('input[name="vno-bg-type"][value="solid"]').check();
  await dialog.locator("#vno-bg-solid").evaluate((input) => {
    input.value = "#dc2626";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await dialog.locator("#vno-bg-apply").click();
  await dialog.waitFor({ state: "detached", timeout: 3000 });

  const applied = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const el = document.querySelector(".vno-slide-canvas");
    return {
      model: canvas.slides[0].background,
      other: canvas.slides[1]?.background || null,
      theme: canvas.masterTheme.bgColor,
      css: el?.style?.backgroundColor || "",
      undoType: canvas.undoStack.at(-1)?.type || ""
    };
  });
  assert(applied.model?.type === "solid" && isRed(applied.model.color), `Model chưa solid đỏ: ${JSON.stringify(applied.model)}`);
  assert(!applied.other, "Không được đổi nền slide khác");
  assert(applied.theme !== "#dc2626", "Không được đổi theme");
  assert(isRed(applied.css) || isRed(applied.model.color), `Canvas CSS chưa đỏ: ${applied.css}`);
  assert(applied.undoType === "slide-background", `Undo type sai: ${applied.undoType}`);

  await page.locator('.vno-quick-btn[data-cmd="common.edit.undo"]').click();
  const undone = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.canvas.slides[0].background || null;
  });
  assert(!undone, `Undo chưa gỡ nền: ${JSON.stringify(undone)}`);

  if (pageErrors.length) throw new Error(pageErrors.join(" | "));
  console.log("PASS: live Slides Format Background — click Design ribbon, solid fill trang hiện tại, Undo");
} finally {
  await browser?.close();
  server.close();
}
