import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_INSERT_GAPS_PORT || 8787);
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

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="writer"]').click();
  await page.locator('.vno-shell[data-app="writer"]').waitFor();
  const writer = page.locator(".vno-writer-body");
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await writer.click();
  await page.keyboard.type("Alpha heading for bookmarks");

  await page.locator("#vno-ribbon-tab-insert").click();
  await page.locator('[data-command-id="writer.insert.symbol"]').click();
  await page.locator('[data-symbol-char="©"]').click();
  assert((await writer.innerHTML()).includes("©"), "Writer Symbol inserts copyright at the cursor");

  await writer.click();
  await page.locator('[data-command-id="writer.insert.dateTime"]').click();
  await page.locator('[data-vno-dialog="datetime-picker"]').waitFor();
  await page.locator('[data-vno-dialog="datetime-picker"] .vno-dialog-ok-btn').click();
  await writer.locator(".vno-datetime").waitFor({ timeout: 4000 });
  assert(await writer.locator(".vno-datetime").count() > 0, "Writer Date & Time inserts a live formatted span");

  await page.locator('[data-command-id="writer.insert.textbox"]').click();
  assert(await page.locator(".vno-writer-textbox").count() > 0, "Writer Text Box inserts a draggable text frame");

  await writer.click();
  await page.locator('[data-command-id="writer.format.dropCap"]').click();
  assert(await writer.locator(".vno-drop-cap").count() > 0, "Writer Drop Cap wraps the first letter");

  await page.locator('[data-command-id="writer.insert.equation"]').click();
  await page.locator("#vno-equation-input").fill("a² + b² = c²");
  await page.locator('[data-vno-dialog="equation"] .vno-dialog-ok-btn').click();
  assert((await writer.innerText()).includes("a² + b² = c²"), "Writer Equation inserts reduced math text");

  await page.locator('[data-command-id="writer.insert.bookmark"]').click();
  await page.locator("#vno-bookmark-input").fill("intro");
  await page.locator('[data-vno-dialog="bookmark"] .vno-dialog-ok-btn').click();
  assert(await writer.locator("a.vno-bookmark").count() > 0, "Writer Bookmark inserts an anchor");

  await page.locator('[data-command-id="writer.insert.crossReference"]').click();
  await page.locator('[data-vno-dialog="cross-reference"] .vno-dialog-ok-btn').click();
  assert(await writer.locator("a.vno-cross-ref").count() > 0, "Writer Cross-reference inserts an internal link");

  const busProbe = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const before = document.querySelector(".vno-writer-body")?.innerHTML || "";
    await globalCommandBus.execute("writer.insert.symbol", { char: "®" });
    const after = document.querySelector(".vno-writer-body")?.innerHTML || "";
    return { inserted: after.includes("®") && after !== before };
  });
  assert(busProbe.inserted, "Writer CommandBus.execute(symbol) is bound through UNO mapping");

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();
  await page.locator("#vno-ribbon-tab-insert").click();

  await page.locator('[data-command-id="slides.insert.table"]').click();
  await page.locator("#vno-slide-table-rows").fill("2");
  await page.locator("#vno-slide-table-cols").fill("3");
  await page.locator('[data-vno-dialog="slide-table"] .vno-dialog-ok-btn').click();
  assert(await page.locator(".vno-slide-table").count() > 0, "Slides Table inserts a real HTML table shape");

  await page.locator('[data-command-id="slides.insert.headerFooter"]').click();
  await page.locator("#vno-hf-date").check();
  await page.locator("#vno-hf-text").fill("VN Office footer");
  await page.locator('[data-vno-dialog="header-footer"] .vno-dialog-ok-btn').click();
  assert((await page.locator(".vno-slide-hf-footer").innerText()).includes("VN Office footer"), "Slides Header & Footer applies footer text");
  assert((await page.locator(".vno-slide-hf-date").innerText()).trim().length > 0, "Slides Header & Footer shows date placeholder");

  await page.locator('[data-command-id="slides.insert.slideNumber"]').click();
  assert((await page.locator(".vno-slide-hf-number").innerText()).toLowerCase().includes("trang"), "Slides Slide Number placeholder is visible");

  await page.locator('[data-command-id="slides.insert.symbol"]').click();
  await page.locator('[data-symbol-char="™"]').click();
  assert((await page.locator(".vno-slide-body").first().innerText()).includes("™"), "Slides Symbol inserts into the slide body");

  const slidesBus = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const result = await globalCommandBus.execute("slides.insert.table", { rows: 3, cols: 3 });
    return { ok: Boolean(result) };
  });
  assert(slidesBus.ok, "Slides CommandBus.execute(table) is bound through UNO mapping");
  assert(errors.length === 0, "No browser page errors", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
