/**
 * VN Slides — live Playwright: click một node SmartArt/diagram phải chọn cả nhóm,
 * kéo một node phải dịch cả nhóm, Delete xóa cả nhóm trong 1 bước Undo.
 * Chuột/phím Playwright thật trên canvas đang chạy. Không SendKeys.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SLIDES_GROUP_SELECT_PORT || 8794);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(ROOT_DIR, path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  await new Promise(resolve => server.listen(PORT, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newContext({ viewport: { width: 1600, height: 950 } }).then(c => c.newPage());
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));

  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForTimeout(800);
    await page.locator("#vno-switcher-toggle").click();
    await page.waitForTimeout(150);
    await page.locator('.vno-switcher-item[data-switch="slides"]').click();
    await page.waitForSelector(".vno-slides-studio");

    await page.locator(".vno-ribbon-tab").filter({ hasText: /^(Chèn|Insert)$/ }).click();
    await page.click('[data-command-id="slides.diagram.insert"]');
    await page.locator("#vno-diagram-count").fill("4");
    await page.click("#vno-diagram-insert");
    await page.waitForSelector(".vno-slide-shape-item.is-diagram-node");

    const nodes = page.locator(".vno-slide-shape-item.is-diagram-node");
    assert(await nodes.count() === 4, "Phải chèn đúng 4 node");

    const third = nodes.nth(2);
    await third.click();
    await page.waitForTimeout(120);

    const afterClick = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
      const groupId = canvas.diagramGroupSelectionId;
      const group = shapes.filter(s => s.diagramGroupId === groupId);
      const bounds = document.querySelector(".vno-diagram-group-bounds");
      const box = bounds ? bounds.getBoundingClientRect() : null;
      return {
        groupId,
        selected: canvas.selectedShapeIds.size,
        groupSize: group.length,
        nodes: group.filter(s => s.diagramRole === "node").length,
        connectors: group.filter(s => s.type === "connector").length,
        hasBounds: !!bounds,
        bounds: box ? { w: box.width, h: box.height } : null,
        memberClass: document.querySelectorAll(".vno-slide-shape-item.is-diagram-group-member").length
      };
    });
    assert(afterClick.groupId, "Click node phải bật diagramGroupSelectionId");
    assert(afterClick.selected === afterClick.groupSize, `Phải chọn cả nhóm (${afterClick.selected}/${afterClick.groupSize})`);
    assert(afterClick.nodes === 4 && afterClick.connectors === 3, `Nhóm phải gồm 4 node + 3 connector, thực tế ${JSON.stringify(afterClick)}`);
    assert(afterClick.hasBounds && afterClick.bounds.w > 100 && afterClick.bounds.h > 40, "Phải hiện khung bounding box bao cả nhóm");
    assert(afterClick.memberClass >= 4, "Node trong nhóm phải có class is-diagram-group-member");

    const beforeDrag = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
      return shapes.map(s => ({
        id: s.id, role: s.diagramRole, type: s.type,
        x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2
      }));
    });

    const box = await third.boundingBox();
    assert(box, "Không lấy được bounding box node để kéo chuột thật");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2 + 36, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    const afterDrag = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
      const last = canvas.undoStack[canvas.undoStack.length - 1];
      const groupId = canvas.diagramGroupSelectionId;
      const group = shapes.filter(s => s.diagramGroupId === groupId);
      return {
        shapes: shapes.map(s => ({
          id: s.id, role: s.diagramRole, type: s.type,
          x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2
        })),
        undoType: last?.type,
        undoCount: last?.shapes?.length || 0,
        undoIds: (last?.shapes || []).map(s => s.id),
        groupSize: group.length,
        groupId,
        stackTypes: canvas.undoStack.map(item => item.type)
      };
    });

    const beforeById = Object.fromEntries(beforeDrag.map(s => [s.id, s]));
    const nodeDeltas = afterDrag.shapes.filter(s => s.role === "node").map(s => ({
      id: s.id,
      dx: s.x - beforeById[s.id].x,
      dy: s.y - beforeById[s.id].y
    }));
    assert(nodeDeltas.every(d => Math.abs(d.dx) > 20 && Math.abs(d.dy) > 10), `Node chưa dịch đủ khi kéo: ${JSON.stringify(nodeDeltas)}`);
    const dx0 = nodeDeltas[0].dx;
    const dy0 = nodeDeltas[0].dy;
    assert(nodeDeltas.every(d => d.dx === dx0 && d.dy === dy0), `Các node không cùng offset: ${JSON.stringify(nodeDeltas)}`);
    const connectorDeltas = afterDrag.shapes.filter(s => s.type === "connector").map(s => ({
      id: s.id,
      dx1: s.x1 - beforeById[s.id].x1,
      dy1: s.y1 - beforeById[s.id].y1,
      dx2: s.x2 - beforeById[s.id].x2,
      dy2: s.y2 - beforeById[s.id].y2
    }));
    assert(connectorDeltas.every(d => d.dx1 === dx0 && d.dy1 === dy0 && d.dx2 === dx0 && d.dy2 === dy0),
      `Connector không dịch cùng offset node: ${JSON.stringify({ dx0, dy0, connectorDeltas })}`);
    assert(afterDrag.undoType === "diagram-group-move", `Undo type sau kéo phải là diagram-group-move, thực tế ${JSON.stringify({ type: afterDrag.undoType, stack: afterDrag.stackTypes })}`);
    assert(afterDrag.undoCount === afterDrag.groupSize && afterDrag.undoCount === beforeDrag.length,
      `Một bước Undo phải ghi đủ mọi shape trong nhóm: undoCount=${afterDrag.undoCount} groupSize=${afterDrag.groupSize} before=${beforeDrag.length} ids=${JSON.stringify(afterDrag.undoIds)} stack=${JSON.stringify(afterDrag.stackTypes)}`);

    await page.keyboard.press("Control+Z");
    const afterMoveUndo = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      return globalUnoBridge.activeDocument.canvas.slides[0].shapes.map(s => ({ id: s.id, x: s.x, y: s.y, x1: s.x1, y1: s.y1 }));
    });
    for (const shape of beforeDrag) {
      const restored = afterMoveUndo.find(s => s.id === shape.id);
      assert(restored.x === shape.x && restored.y === shape.y, `Undo move chưa trả ${shape.id} về (${shape.x},${shape.y})`);
    }

    const textEl = third.locator(".vno-diagram-node-text");
    await textEl.dblclick();
    await textEl.fill("Phê duyệt hồ sơ");
    await page.locator(".vno-slide-canvas").click({ position: { x: 24, y: 24 } });
    await third.click();
    const afterEdit = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const node = canvas.slides[0].shapes.find(s => s.text === "Phê duyệt hồ sơ");
      return {
        textOk: !!node,
        groupId: canvas.diagramGroupSelectionId,
        selected: canvas.selectedShapeIds.size
      };
    });
    assert(afterEdit.textOk, "Double-click chưa lưu text riêng node");
    assert(afterEdit.groupId && afterEdit.selected === 7, "Sửa text xong click lại phải chọn cả nhóm");

    const beforeDelete = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const shapes = canvas.slides[canvas.currentSlideIndex].shapes;
      return {
        count: shapes.length,
        slides: canvas.slides.length,
        slideIndex: canvas.currentSlideIndex,
        positions: shapes.map(s => ({ id: s.id, x: s.x, y: s.y }))
      };
    });
    await third.click();
    await page.keyboard.press("Delete");
    await page.waitForTimeout(120);
    const afterDelete = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const last = canvas.undoStack[canvas.undoStack.length - 1];
      return {
        remaining: canvas.slides[canvas.currentSlideIndex]?.shapes?.length || 0,
        slides: canvas.slides.length,
        slideIndex: canvas.currentSlideIndex,
        undoType: last?.type,
        undoShapes: last?.shapes?.length || 0
      };
    });
    assert(afterDelete.slides === beforeDelete.slides, `Delete nhóm không được xóa trang chiếu (trước ${beforeDelete.slides}, sau ${afterDelete.slides})`);
    assert(afterDelete.slideIndex === beforeDelete.slideIndex, "Delete nhóm không được đổi slide hiện tại");
    assert(afterDelete.remaining === 0, `Delete phải xóa cả nhóm, còn ${afterDelete.remaining}`);
    assert(afterDelete.undoType === "diagram-group-delete", `Undo type phải là diagram-group-delete, thực tế ${afterDelete.undoType}`);
    assert(afterDelete.undoShapes === beforeDelete.count, "Một bước Undo xóa phải chứa đủ shape");

    await page.keyboard.press("Control+Z");
    const afterDeleteUndo = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
      return shapes.map(s => ({ id: s.id, x: s.x, y: s.y }));
    });
    assert(afterDeleteUndo.length === beforeDelete.count, "Undo xóa nhóm chưa trả đủ shape");
    for (const shape of beforeDelete.positions) {
      const restored = afterDeleteUndo.find(s => s.id === shape.id);
      assert(restored && restored.x === shape.x && restored.y === shape.y, `Undo xóa chưa trả đúng vị trí ${shape.id}`);
    }

    const first = page.locator(".vno-slide-shape-item.is-diagram-node").first();
    await first.click({ modifiers: ["Control"] });
    const childSelect = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      return { groupId: canvas.diagramGroupSelectionId, selected: canvas.selectedShapeIds.size };
    });
    assert(childSelect.groupId == null && childSelect.selected === 1, `Ctrl+Click phải chọn lẻ 1 shape, thực tế ${JSON.stringify(childSelect)}`);

    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
    console.log(JSON.stringify({
      pass: true,
      browser: "Microsoft Edge",
      url: page.url(),
      afterClick,
      nodeDeltas,
      connectorDeltas,
      undoMove: afterDrag.undoType,
      afterDelete,
      childSelect,
      pageErrors: pageErrors.length
    }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
