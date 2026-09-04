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
    await page.locator(".vno-ribbon-tab").filter({ hasText: locale === "vi" ? /^Chèn$/ : /^Insert$/ }).click();
    await page.click('[data-command-id="slides.shape.insert"]');
    const shapeBefore = await page.evaluate(async () => {
      const canvas = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas;
      const shape = canvas.slides[canvas.currentSlideIndex].shapes.at(-1);
      return { x: shape.x, w: shape.w };
    });
    await page.locator(".vno-ribbon-tab").filter({ hasText: locale === "vi" ? /^Thiết kế$/ : /^Design$/ }).click();
    await page.click('[data-command-id="slides.design.slideSize"]');
    await page.click('[data-slide-size="standard"]');
    await page.waitForSelector('.vno-slide-canvas[data-slide-size="standard"]');
    const sizeApplied = await page.evaluate(async () => {
      const canvas = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas;
      const shape = canvas.slides[canvas.currentSlideIndex].shapes.at(-1);
      return { preset: canvas.slideSize.preset, width: canvas.canvasEl.getBoundingClientRect().width, x: shape.x, w: shape.w };
    });
    if (sizeApplied.preset !== "standard" || sizeApplied.width !== 720 || sizeApplied.x !== shapeBefore.x * 0.75 || sizeApplied.w !== shapeBefore.w * 0.75) throw new Error(`Slide Size chưa scale đúng: ${JSON.stringify({ shapeBefore, sizeApplied })}`);
    await page.keyboard.press("Control+Z");
    if (await page.locator('.vno-slide-canvas[data-slide-size="wide"]').count() !== 1) throw new Error("Undo Slide Size không về 16:9");
    await page.keyboard.press("Control+Y");
    if (await page.locator('.vno-slide-canvas[data-slide-size="standard"]').count() !== 1) throw new Error("Redo Slide Size không về 4:3");
    await page.click("#vno-switcher-toggle");
    await page.click('[data-switch="sheet"]');
    await page.waitForSelector(".vno-sheet-container");
    await page.click('.vno-grid-cell[data-coord="C5"]');
    await page.locator(".vno-ribbon-tab").filter({ hasText: locale === "vi" ? /^Chèn$/ : /^Insert$/ }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.click('[data-command-id="sheet.insert.image"]')
    ]);
    await chooser.setFiles({ name: "minh-hoa.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    await page.waitForSelector('.vno-sheet-image[data-anchor="C5"] img');
    const insertedImage = await page.evaluate(async () => {
      const grid = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return { count: grid.imagesBySheet[grid.activeSheet].length, anchor: grid.imagesBySheet[grid.activeSheet][0]?.anchor, history: grid.undoStack.at(-1)?.collection };
    });
    if (insertedImage.count !== 1 || insertedImage.anchor?.c !== "C" || insertedImage.anchor?.r !== 5 || insertedImage.history !== "imagesBySheet") throw new Error(`Insert image sai: ${JSON.stringify(insertedImage)}`);
    await page.click("[data-image-delete]");
    if (await page.locator(".vno-sheet-image").count()) throw new Error("Nút xóa ảnh không xóa overlay");
    await page.keyboard.press("Control+Z");
    if (await page.locator(".vno-sheet-image").count() !== 1) throw new Error("Undo xóa ảnh không khôi phục overlay");
    await page.keyboard.press("Control+Y");
    if (await page.locator(".vno-sheet-image").count() !== 0) throw new Error("Redo xóa ảnh không loại overlay");
    if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
    console.log(`PASS\t${locale}\tTheme Gallery + Slide Size + Sheet Pictures via real ribbon/dialog/keyboard`);
  } catch (error) {
    failures++;
    console.error(`FAIL\t${locale}\tTheme Gallery\t${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failures) process.exit(1);
