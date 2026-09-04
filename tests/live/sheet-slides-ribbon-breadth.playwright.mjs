import { pathToFileURL } from "node:url";

const playwrightPath = process.env.VNO_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("Thiếu VNO_PLAYWRIGHT_PATH");
const playwright = await import(pathToFileURL(playwrightPath).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
let failures = 0;

for (const locale of ["vi", "en"]) {
  const context = await browser.newContext({ locale: locale === "vi" ? "vi-VN" : "en-US" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(value => localStorage.setItem("vno-locale", value), locale);
  try {
    await page.goto("http://127.0.0.1:8765", { waitUntil: "networkidle" });
    await page.click("#vno-switcher-toggle");
    await page.click('[data-switch="slides"]');
    await page.waitForSelector(".vno-slides-studio");
    await page.locator(".vno-ribbon-tab").filter({ hasText: locale === "vi" ? /^Thiết kế$/ : /^Design$/ }).click();
    await page.click('[data-command-id="slides.design.themeGallery"]');
    const cards = page.locator(".vno-theme-gallery-grid [data-theme-id]");
    if (await cards.count() < 6) throw new Error("Theme Gallery có ít hơn 6 chủ đề");
    await page.click('[data-theme-id="energetic-orange"]');
    await page.waitForSelector(".vno-theme-gallery-dialog", { state: "detached" });
    const applied = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      return { id: canvas.masterTheme.themeId, bg: getComputedStyle(canvas.canvasEl).backgroundColor, undo: canvas.undoStack.at(-1)?.type };
    });
    if (applied.id !== "energetic-orange" || applied.undo !== "master-theme") throw new Error(`Theme chưa áp dụng thật: ${JSON.stringify(applied)}`);
    await page.keyboard.press("Control+Z");
    const undone = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas.masterTheme.themeId);
    if (undone !== "modern-blue") throw new Error(`Undo theme sai: ${undone}`);
    await page.keyboard.press("Control+Y");
    const redone = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas.masterTheme.themeId);
    if (redone !== "energetic-orange") throw new Error(`Redo theme sai: ${redone}`);
    if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
    console.log(`PASS\t${locale}\tTheme Gallery click + apply + Undo/Redo`);
  } catch (error) {
    failures++;
    console.error(`FAIL\t${locale}\tTheme Gallery\t${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failures) process.exit(1);
