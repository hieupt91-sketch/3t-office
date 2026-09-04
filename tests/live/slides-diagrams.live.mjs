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

  const firstNode = page.locator('.vno-slide-shape-item.is-diagram-node').first();
  const nodeBox = await firstNode.boundingBox();
  if (!nodeBox) throw new Error("Không lấy được bounding box node để kéo chuột thật");
  const beforeDrag = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const node = canvas.slides[0].shapes.find(s => s.diagramRole === "node");
    const connector = canvas.slides[0].shapes.find(s => s.sourceId === node.id || s.targetId === node.id);
    const connectorEl = document.querySelector(`[data-shape-id="${connector.id}"]`);
    return { nodeId: node.id, connectorId: connector.id, nodeX: node.x, nodeY: node.y, x1: connector.x1, y1: connector.y1, left: connectorEl.style.left, top: connectorEl.style.top };
  });
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 70, nodeBox.y + nodeBox.height / 2 + 45, { steps: 8 });
  const duringDrag = await page.evaluate(async ({ nodeId, connectorId }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const node = canvas.slides[0].shapes.find(s => s.id === nodeId);
    const connector = canvas.slides[0].shapes.find(s => s.id === connectorId);
    const connectorEl = document.querySelector(`[data-shape-id="${connectorId}"]`);
    const endpointX = connector.sourceId === nodeId ? connector.x1 : connector.x2;
    const endpointY = connector.sourceId === nodeId ? connector.y1 : connector.y2;
    return { nodeX: node.x, nodeY: node.y, endpointX, endpointY, centerX: node.x + node.w / 2, centerY: node.y + node.h / 2, left: connectorEl.style.left, top: connectorEl.style.top };
  }, { nodeId: beforeDrag.nodeId, connectorId: beforeDrag.connectorId });
  if (duringDrag.nodeX === beforeDrag.nodeX || duringDrag.nodeY === beforeDrag.nodeY) throw new Error("Node chưa di chuyển khi đang giữ chuột");
  if (duringDrag.endpointX !== duringDrag.centerX || duringDrag.endpointY !== duringDrag.centerY) throw new Error("Connector chưa bám node ngay trong pointermove");
  if (duringDrag.left === beforeDrag.left && duringDrag.top === beforeDrag.top) throw new Error("DOM connector chưa render lại ngay khi kéo");
  await page.mouse.up();

  await page.keyboard.press("Control+Z");
  const afterMoveUndo = await page.evaluate(async ({ nodeId, connectorId }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    const node = shapes.find(s => s.id === nodeId), connector = shapes.find(s => s.id === connectorId);
    return { nodeX: node.x, nodeY: node.y, x1: connector.x1, y1: connector.y1 };
  }, { nodeId: beforeDrag.nodeId, connectorId: beforeDrag.connectorId });
  if (afterMoveUndo.nodeX !== beforeDrag.nodeX || afterMoveUndo.nodeY !== beforeDrag.nodeY || afterMoveUndo.x1 !== beforeDrag.x1 || afterMoveUndo.y1 !== beforeDrag.y1) throw new Error("Undo kéo chưa khôi phục node + connector");
  await page.keyboard.press("Control+Y");

  await firstNode.click();
  await firstNode.locator('.vno-shape-delete-btn').dispatchEvent("click");
  const afterDelete = await page.evaluate(async ({ nodeId }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    return { nodeExists: shapes.some(s => s.id === nodeId), orphanCount: shapes.filter(s => s.sourceId === nodeId || s.targetId === nodeId).length, nodes: shapes.filter(s => s.diagramRole === "node").length, connectors: shapes.filter(s => s.diagramRole === "connector").length };
  }, { nodeId: beforeDrag.nodeId });
  if (afterDelete.nodeExists || afterDelete.orphanCount || afterDelete.nodes !== 3 || afterDelete.connectors !== 2) throw new Error(`Xóa node sai: ${JSON.stringify(afterDelete)}`);
  await page.keyboard.press("Control+Z");
  if (await page.locator('.vno-slide-shape-item').count() !== 7) throw new Error("Undo xóa node không khôi phục đủ node + connector");
  await page.keyboard.press("Control+Y");
  if (await page.locator('.vno-slide-shape-item').count() !== 5) throw new Error("Redo xóa node không loại lại đúng node + connector");
  await page.keyboard.press("Control+Z");

  // Undo move, text edit, then diagram insertion.
  await page.keyboard.press("Control+Z");
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
  console.log(JSON.stringify({ pass: true, browser: "Microsoft Edge", url: page.url(), interactions: "mouse ribbon/dialog + real mouse.down/move/up drag + delete + Ctrl+Z/Ctrl+Y + Slide Sorter + F5/Escape", inserted, savedText, beforeDrag, duringDrag, afterMoveUndo, afterDelete, afterUndo, afterRedo, pageErrors: errors.length }));
} finally {
  await browser.close();
}
