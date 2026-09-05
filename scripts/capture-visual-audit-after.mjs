import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8816;
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json"
};

const server = http.createServer((req, res) => {
  const reqPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(root, path.normalize(reqPath).replace(/^[/\\]+/, ""));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404).end();
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Server started on port ${port}`);

const outDir = path.join(root, "docs", "audit-visual-parity-screenshots");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  async function createPage() {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".vno-writer-page", { state: "visible" });
    return p;
  }

  async function switchTo(p, app) {
    if (app === "writer") return;
    await p.locator("#vno-switcher-toggle").click();
    await p.waitForSelector("#vno-switcher-menu", { state: "visible" });
    await p.locator(`[data-switch="${app}"]`).click();
    if (app === "sheet") {
      await p.locator('.vno-shell[data-app="sheet"] .vno-grid-viewport').waitFor({ state: "visible", timeout: 10000 });
    } else if (app === "slides") {
      await p.locator('.vno-shell[data-app="slides"] .vno-slide-stage').waitFor({ state: "visible", timeout: 10000 });
    }
    await p.waitForTimeout(400);
  }

  // 1. Writer View Tab
  console.log("1. Capturing Writer View Tab...");
  {
    const page = await createPage();
    await page.locator(".vno-ribbon-tab").filter({ hasText: /^Chế độ xem$/ }).click();
    await page.waitForTimeout(300);
    await page.locator('.vno-shell[data-app="writer"] .vno-ribbon').screenshot({ path: path.join(outDir, "after-writer-view-ribbon.png") });
    await page.screenshot({ path: path.join(outDir, "after-writer-view-page.png") });
    await page.close();
  }

  // 2. Writer Spellcheck
  console.log("2. Capturing Writer Spellcheck...");
  {
    const page = await createPage();
    await page.locator('.vno-writer-page[data-spellcheck-status="ready"]').waitFor({ timeout: 5000 }).catch(() => {});
    const writerBody = page.locator(".vno-writer-body");
    await writerBody.evaluate(el => { el.innerHTML = "<p>Tài liệu kiểm tra lỗi chính tả tiếng Việt: đây là từ chínnh tả bị gõ sai và từ kỹ thuậtt.</p>"; });
    await writerBody.click();
    await page.keyboard.type(" ");
    await page.waitForTimeout(800);
    const writerMarker = page.locator(".vno-writer-body .vno-spelling-uncertain").first();
    if (await writerMarker.count() > 0) {
      await writerMarker.click({ button: "right" });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "after-writer-spellcheck-menu.png") });
    }
    await page.close();
  }

  // 3. Sheet View Tab
  console.log("3. Capturing Sheet View Tab...");
  {
    const page = await createPage();
    await switchTo(page, "sheet");
    await page.locator(".vno-ribbon-tab").filter({ hasText: /^Chế độ xem$/ }).click();
    await page.waitForTimeout(300);
    await page.locator('.vno-shell[data-app="sheet"] .vno-ribbon').screenshot({ path: path.join(outDir, "after-sheet-view-ribbon.png") });
    await page.screenshot({ path: path.join(outDir, "after-sheet-view-page.png") });
    await page.close();
  }

  // 4. Sheet Formulas Tab (Ribbon & Dialogs)
  console.log("4. Capturing Sheet Formulas Tab & Dialogs...");
  {
    const page = await createPage();
    await switchTo(page, "sheet");
    await page.locator(".vno-ribbon-tab").filter({ hasText: /^Công thức$/ }).click();
    await page.waitForTimeout(300);
    await page.locator('.vno-shell[data-app="sheet"] .vno-ribbon').screenshot({ path: path.join(outDir, "after-sheet-formulas-ribbon.png") });
    await page.screenshot({ path: path.join(outDir, "after-sheet-formulas-page.png") });

    // 4a. Insert Function Dialog
    console.log("  - Capturing Insert Function Dialog...");
    await page.locator('[data-command-id="sheet.formula.insertFunction"]').first().click();
    await page.waitForSelector(".vno-func-dialog", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator(".vno-func-dialog .vno-dialog-box").screenshot({ path: path.join(outDir, "after-sheet-dialog-insert-function.png") });
    await page.screenshot({ path: path.join(outDir, "after-sheet-dialog-insert-function-overlay.png") });
    await page.locator("#vno-fx-cancel-btn").click();
    await page.waitForTimeout(300);

    // 4b. Watch Window
    console.log("  - Capturing Watch Window...");
    await page.locator('[data-command-id="sheet.formula.watchWindow"]').first().click();
    await page.waitForSelector("#vno-watch-window", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator("#vno-watch-window").screenshot({ path: path.join(outDir, "after-sheet-watch-window.png") });
    await page.screenshot({ path: path.join(outDir, "after-sheet-watch-window-page.png") });
    await page.locator("#vno-watch-close").click();
    await page.waitForTimeout(300);

    // 4c. Error Checking Dialog
    console.log("  - Capturing Error Checking Dialog...");
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const grid = globalUnoBridge.activeDocument?.grid;
      if (grid) {
        grid.setCellValue("D", 5, "#DIV/0!");
      }
    });
    await page.locator('[data-command-id="sheet.formula.errorChecking"]').first().click();
    await page.waitForSelector(".vno-dialog-table", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(300);
    const errorModal = page.locator(".vno-dialog-box").filter({ has: page.locator(".vno-dialog-table") }).first();
    if (await errorModal.count() > 0) {
      await errorModal.screenshot({ path: path.join(outDir, "after-sheet-error-checking-dialog.png") });
    }
    await page.screenshot({ path: path.join(outDir, "after-sheet-error-checking-page.png") });
    await page.locator(".vno-rule-cancel").first().click();
    await page.waitForTimeout(300);

    await page.close();
  }

  // 5. Slides View Tab & Spellcheck
  console.log("5. Capturing Slides View Tab & Spellcheck...");
  {
    const page = await createPage();
    await switchTo(page, "slides");

    // 5a. Slides View Tab
    await page.locator(".vno-ribbon-tab").filter({ hasText: /^Chế độ xem$/ }).click();
    await page.waitForTimeout(300);
    await page.locator('.vno-shell[data-app="slides"] .vno-ribbon').screenshot({ path: path.join(outDir, "after-slides-view-ribbon.png") });
    await page.screenshot({ path: path.join(outDir, "after-slides-view-page.png") });

    // 5b. Slides Spellcheck
    console.log("  - Capturing Slides Spellcheck...");
    const slideTitle = page.locator('.vno-slide-text-title[contenteditable="true"]').first();
    if (await slideTitle.count() > 0) {
      await slideTitle.click();
      await slideTitle.evaluate(el => { el.innerText = "Báo cáo chínnh tả"; });
      await page.keyboard.type(" ");
      await page.waitForTimeout(800);
      const slidesMarker = page.locator(".vno-slide-stage .vno-spelling-uncertain").first();
      if (await slidesMarker.count() > 0) {
        await slidesMarker.click({ button: "right" });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outDir, "after-slides-spellcheck-menu.png") });
      }
    }

    await page.close();
  }

  console.log("ALL BEFORE SCREENSHOTS CAPTURED SUCCESSFULLY!");
} catch (err) {
  console.error("Screenshot capture error:", err);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  process.exit(0);
}
