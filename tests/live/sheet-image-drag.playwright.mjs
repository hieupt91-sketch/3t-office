/**
 * Live: VN Sheet Keo-tha di chuyen anh (drag-to-move) tren canvas bang tinh:
 * 1. Chen 1 anh vao o B2 that.
 * 2. Xac nhan con tro chuot hover la cursor: move.
 * 3. Dung Playwright mouse (move, down, move voi steps, up) keo anh tu B2 sang E7.
 * 4. Xac nhan lop .is-dragging kich hoat trong luc keo.
 * 5. Xac nhan khi tha chuot (pointerup), anh tu dong snap chuan xac ve goc o E7 ({ c: "E", r: 7 }).
 * 6. Gui Ctrl+Z (Undo): xac nhan anh quay ve dung o B2 ban dau ({ c: "B", r: 2 }).
 * 7. Gui Ctrl+Y (Redo): xac nhan anh nhay lai dung o E7.
 * 8. Bam nut xoa [data-image-delete] khong gay kich hoat keo anh, anh bi xoa dung chuan.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_IMAGE_DRAG_PORT || 8955);
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
  if (reqPath === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const assert = (condition, message, detail = "") => {
  if (!condition) {
    throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  }
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));

  console.log("1. Mo VN Sheet...");
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // 1) Chen 1 anh vao o B2 that
  console.log("2. Chen anh vao o B2...");
  const sampleDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAVElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7wa2gAAB8e81qAAAAABJRU5ErkJggg==";
  await page.evaluate(async (src) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.insertImage(src, { c: "B", r: 2 });
  }, sampleDataUri);
  await page.waitForTimeout(200);

  const imageLocator = page.locator("figure.vno-sheet-image");
  await imageLocator.waitFor({ state: "visible", timeout: 5000 });

  // 2) Kiem tra thuoc tinh anchor ban dau va cursor: move
  const initialAnchor = await imageLocator.getAttribute("data-anchor");
  assert(initialAnchor === "B2", `Anh ban dau phai neo tai B2, thuc te: ${initialAnchor}`);

  const cursorStyle = await imageLocator.evaluate(el => window.getComputedStyle(el).cursor);
  assert(cursorStyle === "move", `Con tro hover anh phai la move, thuc te: ${cursorStyle}`);

  // 3) Keo tha anh tu B2 sang E7
  console.log("3. Keo anh tu B2 sang E7 bang chuot...");
  const box = await imageLocator.boundingBox();
  assert(box != null, "Khong lay duoc boundingBox cua anh");

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  const targetX = startX + 300;
  const targetY = startY + 140;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 150, startY + 70, { steps: 5 });

  const isDraggingDuringMove = await imageLocator.evaluate(el => el.classList.contains("is-dragging"));
  assert(isDraggingDuringMove, "Anh phai co class .is-dragging trong luc keo");

  await page.mouse.move(targetX, targetY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(250);

  // 4) Xac nhan vi tri sau khi tha: neo ve E7
  console.log("4. Xac minh anh da snap ve o E7...");
  const movedAnchor = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const img = grid.imagesBySheet[grid.activeSheet]?.[0];
    return img ? { c: img.anchor.c, r: Number(img.anchor.r) } : null;
  });
  assert(movedAnchor?.c === "E" && movedAnchor?.r === 7, `Data model anchor phai la E7, thuc te: ${JSON.stringify(movedAnchor)}`);

  const movedDomAnchor = await imageLocator.getAttribute("data-anchor");
  assert(movedDomAnchor === "E7", `DOM anchor phai la E7, thuc te: ${movedDomAnchor}`);

  // 5) Hoan tac (Ctrl+Z)
  console.log("5. Hoan tac (Ctrl+Z) dua anh ve B2...");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(250);

  const undoneAnchor = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const img = grid.imagesBySheet[grid.activeSheet]?.[0];
    return img ? { c: img.anchor.c, r: Number(img.anchor.r) } : null;
  });
  assert(undoneAnchor?.c === "B" && undoneAnchor?.r === 2, `Sau Undo anchor phai ve B2, thuc te: ${JSON.stringify(undoneAnchor)}`);

  const undoneDomAnchor = await imageLocator.getAttribute("data-anchor");
  assert(undoneDomAnchor === "B2", `Sau Undo DOM anchor phai ve B2, thuc te: ${undoneDomAnchor}`);

  // 6) Lam lai (Ctrl+Y)
  console.log("6. Lam lai (Ctrl+Y) dua anh tro lai E7...");
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(250);

  const redoneAnchor = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const img = grid.imagesBySheet[grid.activeSheet]?.[0];
    return img ? { c: img.anchor.c, r: Number(img.anchor.r) } : null;
  });
  assert(redoneAnchor?.c === "E" && redoneAnchor?.r === 7, `Sau Redo anchor phai la E7, thuc te: ${JSON.stringify(redoneAnchor)}`);

  // 7) Nut xoa anh [data-image-delete] hoat dong doc lap
  console.log("7. Bam nut xoa anh...");
  const deleteBtn = imageLocator.locator("button[data-image-delete]");
  const deleteCursor = await deleteBtn.evaluate(el => window.getComputedStyle(el).cursor);
  assert(deleteCursor === "pointer", `Nut xoa phai co cursor pointer, thuc te: ${deleteCursor}`);

  await deleteBtn.click();
  await page.waitForTimeout(200);

  const imageCountAfterDelete = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return (grid.imagesBySheet[grid.activeSheet] || []).length;
  });
  assert(imageCountAfterDelete === 0, "Anh phai duoc xoa sau khi click nut xoa");

  console.log("==================================================");
  console.log("PASS: Toan bo kiem thu Keo-tha anh VN Sheet thanh cong 100%!");
  console.log("==================================================");
} finally {
  if (browser) await browser.close();
  server.close();
}
