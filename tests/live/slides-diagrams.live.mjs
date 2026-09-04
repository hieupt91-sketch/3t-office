import { pathToFileURL } from "node:url";

const playwrightPath = process.env.VNO_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("Thiếu VNO_PLAYWRIGHT_PATH");
const playwright = await import(pathToFileURL(playwrightPath).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8765", { waitUntil: "networkidle" });
  await page.click("#vno-switcher-toggle");
  await page.click('[data-switch="slides"]');
  await page.waitForSelector('.vno-slides-studio');
  await page.locator('.vno-ribbon-tab').filter({ hasText: /^(Chèn|Insert)$/ }).click();
  await page.click('[data-command-id="slides.diagram.insert"]');
  await page.locator('#vno-diagram-count').fill("4");
  await page.click('#vno-diagram-insert');
  await page.waitForSelector('.vno-slide-shape-item.is-diagram-node');

  const inserted = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
    return { nodes: shapes.filter(s => s.diagramRole === "node").length, connectors: shapes.filter(s => s.type === "connector").length };
  });
  if (inserted.nodes !== 4 || inserted.connectors !== 3) throw new Error(`Insert UI sai: ${JSON.stringify(inserted)}`);

  const firstText = page.locator('.vno-slide-shape-item.is-diagram-node .vno-diagram-node-text').first();
  await firstText.dblclick();
  await firstText.fill("Phê duyệt hồ sơ");
  await page.locator('.vno-slide-canvas').click({ position: { x: 30, y: 30 } });
  const savedText = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.canvas.slides[0].shapes.find(s => s.diagramRole === "node").text;
  });
  if (savedText !== "Phê duyệt hồ sơ") throw new Error(`Text chưa lưu: ${savedText}`);

  // Undo text edit, then Undo diagram insertion; one additional Ctrl+Z removes the whole group.
  await page.keyboard.press("Control+Z");
  await page.keyboard.press("Control+Z");
  const afterUndo = await page.locator('.vno-slide-shape-item').count();
  if (afterUndo !== 0) throw new Error(`Undo diagram còn ${afterUndo} shape`);
  await page.keyboard.press("Control+Y");
  const afterRedo = await page.locator('.vno-slide-shape-item').count();
  if (afterRedo !== 7) throw new Error(`Redo diagram chỉ có ${afterRedo}/7 shape`);

  await page.locator('.vno-ribbon-tab').filter({ hasText: /^(Chế độ xem|View)$/ }).click();
  await page.click('[data-command-id="slides.view.slideSorter"]');
  if (await page.locator('.vno-slide-sorter-preview .vno-sorter-shape-node').count() < 4) throw new Error("Slide Sorter thiếu diagram preview");
  await page.keyboard.press("Escape");

  await page.keyboard.press("F5");
  await page.waitForSelector('.vno-slideshow-overlay');
  if (await page.locator('.vno-slideshow-overlay .vno-show-shape-text').count() !== 4) throw new Error("F5 thiếu 4 node");
  if (await page.locator('.vno-slideshow-overlay .vno-show-connector').count() !== 3) throw new Error("F5 thiếu 3 connector");
  await page.keyboard.press("Escape");

  if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ pass: true, browser: "Microsoft Edge", url: page.url(), interactions: "mouse ribbon/dialog + double-click/type + Ctrl+Z/Ctrl+Y + Slide Sorter + F5/Escape", inserted, savedText, afterUndo, afterRedo, pageErrors: errors.length }));
} finally {
  await browser.close();
}
