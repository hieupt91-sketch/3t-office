/** Live proof that Sheet/Writer/Slides dialog inputs/selects/textareas actually
 * adopt Dark Mode tokens (not just the dialog chrome) - never SendKeys, real clicks. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const screenshotsDir = path.join(root, "docs", "screenshots");
const port = Number(process.env.VNO_DARK_DIALOGS_PORT || 8929);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

fs.mkdirSync(screenshotsDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204).end(); return; }
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function assert(condition, message) { if (!condition) throw new Error(message); }

const WHITE = "rgb(255, 255, 255)";

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem("vno-theme", "dark");
    localStorage.setItem("vno-locale", "vi");
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator('.vno-shell[data-app="writer"]').waitFor();

  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  assert(theme === "dark", `Dark Mode was not active: data-theme="${theme}"`);

  async function checkDialog(name, filename, { execute }) {
    await execute();
    const dialogBox = page.locator(".vno-dialog-box").first();
    await dialogBox.waitFor({ timeout: 5000 });
    await page.waitForTimeout(150);
    await dialogBox.screenshot({ path: path.join(screenshotsDir, filename) });

    const report = await page.evaluate(() => {
      const box = document.querySelector(".vno-dialog-box");
      const cs = window.getComputedStyle(box);
      const inputs = [...box.querySelectorAll("input, select, textarea")]
        .filter(el => !["checkbox", "radio", "color", "range"].includes(el.type))
        .map(el => ({ tag: el.tagName.toLowerCase(), type: el.type || "", bg: window.getComputedStyle(el).backgroundColor }));
      return { boxBg: cs.backgroundColor, inputs };
    });

    assert(report.boxBg !== WHITE, `${name}: dialog chrome is still white (${report.boxBg})`);
    for (const input of report.inputs) {
      assert(input.bg !== WHITE, `${name}: ${input.tag}${input.type ? `[type=${input.type}]` : ""} kept a white background in Dark Mode (${input.bg})`);
    }
    console.log(`PASS: ${name} - dialog chrome + ${report.inputs.length} input(s) are dark-themed`);

    const closeBtn = page.locator(".vno-dialog-close-btn, .vno-rule-close, .vno-fc-close-btn, #vno-master-cancel, #vno-trans-cancel").first();
    if (await closeBtn.count()) await closeBtn.click();
    await page.waitForTimeout(200);
  }

  const execCmd = (id) => () => page.evaluate((cmdId) => {
    import("/platform/commands/command-bus.js").then(({ globalCommandBus }) => globalCommandBus.execute(cmdId));
  }, id);

  await checkDialog("Writer Watermark", "dark-dialogs-writer-watermark.png", { execute: execCmd("writer.page.watermark") });
  await checkDialog("Writer Page Border", "dark-dialogs-writer-page-border.png", { execute: execCmd("writer.page.border") });
  await checkDialog("Writer Mail Merge Data Source", "dark-dialogs-writer-mail-merge.png", { execute: execCmd("writer.mailMerge.open") });

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await page.waitForTimeout(300);

  await checkDialog("Sheet Format Cells", "dark-dialogs-sheet-format-cells.png", { execute: execCmd("sheet.format.cellsDialog") });
  await checkDialog("Sheet Paste Special", "dark-dialogs-sheet-paste-special.png", {
    execute: () => page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      adapter._clipboardModel = { cells: [[{ val: 123 }]] };
      adapter.grid.showPasteSpecialDialog(adapter._clipboardModel);
    })
  });
  await checkDialog("Sheet Merge Cells Confirm", "dark-dialogs-sheet-merge-confirm.png", {
    execute: () => page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      adapter.grid.setCellValue("A", 1, "Alpha");
      adapter.grid.setCellValue("A", 2, "Beta");
      adapter.grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 2 } };
      adapter.grid.mergeCells("mergeCenter", adapter.grid.selectionRange, { confirmDataLoss: true });
    })
  });
  await checkDialog("Sheet Name Manager", "dark-dialogs-sheet-name-manager.png", { execute: execCmd("sheet.formula.nameManager") });
  await checkDialog("Sheet Remove Duplicates", "dark-dialogs-sheet-remove-duplicates.png", { execute: execCmd("sheet.data.removeDuplicates") });
  await checkDialog("Sheet Subtotal", "dark-dialogs-sheet-subtotal.png", { execute: execCmd("sheet.data.subtotal") });
  await checkDialog("Sheet Text to Columns", "dark-dialogs-sheet-text-to-columns.png", { execute: execCmd("sheet.data.textToColumns") });
  await checkDialog("Sheet Conditional Formatting", "dark-dialogs-sheet-cond-formatting.png", { execute: execCmd("sheet.format.conditional") });
  await checkDialog("Sheet Data Validation", "dark-dialogs-sheet-data-validation.png", { execute: execCmd("sheet.data.validation") });
  await checkDialog("Sheet Pivot Table", "dark-dialogs-sheet-pivot-table.png", { execute: execCmd("sheet.data.pivotTable") });

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();
  await page.waitForTimeout(300);

  await checkDialog("Slides Theme Gallery", "dark-dialogs-slides-theme-gallery.png", { execute: execCmd("slides.design.themeGallery") });
  await checkDialog("Slides Slide Master", "dark-dialogs-slides-slide-master.png", { execute: execCmd("slides.master.apply") });
  await checkDialog("Slides Transitions", "dark-dialogs-slides-transitions.png", { execute: execCmd("slides.transition.apply") });

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
  console.log("\nALL DARK MODE DIALOG CHECKS PASSED");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
