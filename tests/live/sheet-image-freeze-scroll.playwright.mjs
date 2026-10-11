/**
 * Live: VN Sheet Anh neo tai ô đóng băng (Freeze Panes) không bị cuộn trôi mất.
 * 1. Bật Freeze Panes: đóng băng hàng 1 + cột A.
 * 2. Chèn ảnh vào ô A1 (trong vùng đóng băng).
 * 3. Cuộn bảng tính xuống / sang phải — ảnh VẪN HIỂN THỊ ở đúng vị trí góc trên-trái.
 * 4. Chèn thêm 1 ảnh khác vào ô F10 (ngoài vùng đóng băng).
 * 5. Cuộn lên — ảnh F10 CUỘN THEO (không bị dính cứng).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_IMAGE_FREEZE_PORT || 8956);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
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

const assert = (condition, message, detail = "") => { if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`); };

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));

  console.log("1. Mo VN Sheet...");
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // 2) Bật Freeze Panes: đóng băng hàng 1 + cột A (chọn ô B2 rồi freeze)
  console.log("2. Bat Freeze Panes (hang 1 + cot A)...");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.selectCell("B", 2);
  });
  await page.locator("#vno-ribbon-tab-view").click();
  await page.waitForTimeout(150);
  await page.locator('[data-dropdown-id="sheet.view.freezePanesMenu"]').click();
  const menu = page.locator(".vno-ribbon-dropdown-menu");
  await menu.waitFor({ state: "visible", timeout: 3000 });
  await menu.locator('[data-command-id="sheet.view.freezePanes"]').click();
  await page.waitForTimeout(200);

  const freezeState = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  });
  assert(freezeState.frozenRows === 1 && freezeState.frozenCols === 1, "Freeze Panes phai dong bang hang 1 + cot A", JSON.stringify(freezeState));

  // 3) Chen anh vao o A1 (trong vung dong bang)
  console.log("3. Chen anh vao o A1 (trong vung dong bang)...");
  const sampleDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAVElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7wa2gAAB8e81qAAAAABJRU5ErkJggg==";
  await page.evaluate(async (src) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.insertImage(src, { c: "A", r: 1 });
  }, sampleDataUri);
  await page.waitForTimeout(200);

  const imageA1 = page.locator('figure.vno-sheet-image[data-anchor="A1"]');
  await imageA1.waitFor({ state: "visible", timeout: 5000 });

  // 4) Lay vi tri truoc khi cuon
  console.log("4. Lay vi tri anh A1 truoc khi cuon...");
  const posBeforeScroll = await imageA1.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
  console.log(`   Vi tri truoc cuon: top=${posBeforeScroll.top}, left=${posBeforeScroll.left}`);

  // 5) Cuon xuong duoi (viewport scrollTop tang len)
  console.log("5. Cuon xuong duoi...");
  await page.evaluate(() => {
    const viewport = document.querySelector(".vno-grid-viewport");
    if (viewport) viewport.scrollTop = 500;
  });
  await page.waitForTimeout(300);

  const posAfterScrollDown = await imageA1.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
  console.log(`   Vi tri sau cuon xuong: top=${posAfterScrollDown.top}, left=${posAfterScrollDown.left}`);
  assert(Math.abs(posAfterScrollDown.top - posBeforeScroll.top) < 5, "Anh A1 (trong vung dong bang) PHAI giu nguyen vi tri top khi cuon xuong", `truoc: ${posBeforeScroll.top}, sau: ${posAfterScrollDown.top}`);
  assert(Math.abs(posAfterScrollDown.left - posBeforeScroll.left) < 5, "Anh A1 (trong vung dong bang) PHAI giu nguyen vi tri left khi cuon xuong", `truoc: ${posBeforeScroll.left}, sau: ${posAfterScrollDown.left}`);

  // 6) Cuon sang phai
  console.log("6. Cuon sang phai...");
  await page.evaluate(() => {
    const viewport = document.querySelector(".vno-grid-viewport");
    if (viewport) viewport.scrollLeft = 300;
  });
  await page.waitForTimeout(300);

  const posAfterScrollRight = await imageA1.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
  console.log(`   Vi tri sau cuon phai: top=${posAfterScrollRight.top}, left=${posAfterScrollRight.left}`);
  assert(Math.abs(posAfterScrollRight.top - posBeforeScroll.top) < 5, "Anh A1 PHAI giu nguyen vi tri top khi cuon phai", `truoc: ${posBeforeScroll.top}, sau: ${posAfterScrollRight.top}`);
  assert(Math.abs(posAfterScrollRight.left - posBeforeScroll.left) < 5, "Anh A1 PHAI giu nguyen vi tri left khi cuon phai", `truoc: ${posBeforeScroll.left}, sau: ${posAfterScrollRight.left}`);

  // 7) Reset scroll
  await page.evaluate(() => {
    const viewport = document.querySelector(".vno-grid-viewport");
    if (viewport) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
  });
  await page.waitForTimeout(200);

  // 8) Chen anh thu 2 vao o F10 (NGOAI vung dong bang)
  console.log("7. Chen anh vao o F10 (ngoai vung dong bang)...");
  await page.evaluate(async (src) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.insertImage(src, { c: "F", r: 10 });
  }, sampleDataUri);
  await page.waitForTimeout(200);

  const imageF10 = page.locator('figure.vno-sheet-image[data-anchor="F10"]');
  await imageF10.waitFor({ state: "visible", timeout: 5000 });

  // 9) Lay vi tri anh F10 truoc khi cuon
  const posF10Before = await imageF10.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
  console.log(`   Anh F10 truoc cuon: top=${posF10Before.top}, left=${posF10Before.left}`);

  // 10) Cuon xuong — anh F10 PHAI cuon theo (vi tri top thay doi)
  console.log("8. Cuon xuong — anh F10 phai cuon theo...");
  await page.evaluate(() => {
    const viewport = document.querySelector(".vno-grid-viewport");
    if (viewport) viewport.scrollTop = 300;
  });
  await page.waitForTimeout(300);

  const posF10After = await imageF10.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  });
  console.log(`   Anh F10 sau cuon: top=${posF10After.top}, left=${posF10After.left}`);
  assert(posF10After.top !== posF10Before.top, "Anh F10 (ngoai vung dong bang) PHAI cuon theo — vi tri top phai thay doi", `truoc: ${posF10Before.top}, sau: ${posF10After.top}`);

  // 11) Kiem tra position CSS cua anh A1 la absolute (giu dong bang bang JS transform), anh F10 la absolute
  console.log("9. Kiem tra CSS position...");
  const cssA1 = await imageA1.evaluate(el => window.getComputedStyle(el).position);
  const cssF10 = await imageF10.evaluate(el => window.getComputedStyle(el).position);
  assert(cssA1 === "absolute", "Anh A1 (trong vung dong bang) PHAI co position:absolute (giu dong bang bang JS transform)", `thuc te: ${cssA1}`);
  assert(cssF10 === "absolute", "Anh F10 (ngoai vung dong bang) PHAI co position:absolute", `thuc te: ${cssF10}`);

  // 12) Kiem tra anh A1 co data-frozen="true" va anh F10 khong
  const frozenA1 = await imageA1.getAttribute("data-frozen");
  const frozenF10 = await imageF10.getAttribute("data-frozen");
  assert(frozenA1 === "true", "Anh A1 phai co data-frozen=true", `thuc te: ${frozenA1}`);
  assert(frozenF10 === null || frozenF10 === undefined, "Anh F10 khong duoc co data-frozen", `thuc te: ${frozenF10}`);

  console.log("==================================================");
  console.log("PASS: Anh neo tai ô đóng bang van hien thi dung vi tri khi cuon, anh ngoai vung dong bang cuon binh thuong!");
  console.log("==================================================");
} finally {
  if (browser) await browser.close();
  server.close();
}
