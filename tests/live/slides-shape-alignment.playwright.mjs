/**
 * Live: VN Slides Multi-Shape Align/Distribute (Home > Đối tượng vẽ > Sắp xếp)
 * mở dropdown ribbon thật, bấm đúng lệnh Căn/Phân phối, xác nhận vị trí hình
 * thật thay đổi đúng, và Ctrl+Z hoàn tác trọn vẹn cả nhóm bằng MỘT lần undo.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ALIGN_PORT || 8939);
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
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  // Dựng 3 hình thật trên slide hiện tại, chọn cả 3, để phân phối đều có ý nghĩa kiểm thử.
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[canvas.currentSlideIndex].shapes = [
      { id: "a1", type: "rect", x: 0, y: 0, w: 60, h: 60, color: "#3b82f6", text: "" },
      { id: "a2", type: "rect", x: 300, y: 40, w: 60, h: 60, color: "#3b82f6", text: "" },
      { id: "a3", type: "rect", x: 600, y: 80, w: 60, h: 60, color: "#3b82f6", text: "" }
    ];
    canvas.selectedShapeIds = new Set(["a1", "a2", "a3"]);
    canvas._renderShapesLayer();
  });

  const openArrangeDropdown = async () => {
    await page.locator('[data-dropdown-id="slides.drawing.arrange"]').click();
    const menu = page.locator(".vno-ribbon-dropdown-menu");
    await menu.waitFor({ state: "visible", timeout: 3000 });
    return menu;
  };

  // 1) Căn trên (Align Top) - cả 3 hình phải cùng y=0 (mép trên của khung 3 hình đang chọn)
  let menu = await openArrangeDropdown();
  await menu.locator('[data-command-id="slides.arrange.alignTop"]').click();
  await page.waitForTimeout(100);
  let positions = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    return shapes.map(s => ({ id: s.id, x: s.x, y: s.y }));
  });
  assert(positions.every(p => p.y === 0), "Cả 3 hình phải cùng y=0 sau Căn trên", JSON.stringify(positions));

  // 2) MỘT lần Ctrl+Z phải hoàn tác TRỌN VẸN cả 3 hình cùng lúc, không phải từng hình
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  positions = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    return shapes.map(s => ({ id: s.id, x: s.x, y: s.y }));
  });
  const originalYs = { a1: 0, a2: 40, a3: 80 };
  assert(positions.every(p => p.y === originalYs[p.id]), "Một lần Undo phải khôi phục ĐÚNG vị trí y gốc của cả 3 hình", JSON.stringify(positions));

  // 3) Phân phối đều ngang (Distribute Horizontally) - hình đầu/cuối giữ nguyên x, khoảng trống giữa bằng nhau
  menu = await openArrangeDropdown();
  await menu.locator('[data-command-id="slides.arrange.distributeHorizontal"]').click();
  await page.waitForTimeout(100);
  positions = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const shapes = globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    return shapes.map(s => ({ id: s.id, x: s.x, w: s.w }));
  });
  const byId = Object.fromEntries(positions.map(p => [p.id, p]));
  assert(byId.a1.x === 0, "Hình đầu (a1) phải giữ nguyên x=0", JSON.stringify(positions));
  assert(byId.a3.x === 600, "Hình cuối (a3) phải giữ nguyên x=600", JSON.stringify(positions));
  const gap1 = byId.a2.x - (byId.a1.x + byId.a1.w);
  const gap2 = byId.a3.x - (byId.a2.x + byId.a2.w);
  assert(Math.abs(gap1 - gap2) < 1, "Hai khoảng trống giữa 3 hình phải bằng nhau sau Phân phối đều ngang", `${gap1} vs ${gap2}`);

  // 4) Bật "Căn theo trang chiếu" rồi Căn giữa (dọc) - phải căn theo TOÀN BỘ trang chiếu, không phải khung 3 hình
  menu = await openArrangeDropdown();
  await menu.locator('[data-command-id="slides.arrange.alignToSlide"]').click();
  await page.waitForTimeout(150);
  const alignToSlideModeAfterToggle = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.canvas.alignToSlideMode;
  });
  assert(alignToSlideModeAfterToggle === true, "alignToSlideMode phải là true sau khi bấm Căn theo trang chiếu", String(alignToSlideModeAfterToggle));
  // Bấm nút bật cờ trên ribbon làm mất lựa chọn hình (hành vi focus riêng, không phải điều
  // đang kiểm thử ở bước này) - chọn lại 3 hình thật trước khi kiểm tra alignMiddle theo trang chiếu.
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.activeDocument.canvas.selectedShapeIds = new Set(["a1", "a2", "a3"]);
  });
  menu = await openArrangeDropdown();
  await menu.locator('[data-command-id="slides.arrange.alignMiddle"]').click();
  await page.waitForTimeout(100);
  const midResult = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const shapes = canvas.slides[0].shapes;
    return {
      shapes: shapes.map(s => ({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h })),
      selected: [...canvas.selectedShapeIds],
      slideHeight: canvas.slideSize.height
    };
  });
  midResult.shapes.forEach(s => {
    const midY = s.y + s.h / 2;
    assert(Math.abs(midY - midResult.slideHeight / 2) < 1, "Mỗi hình phải có tâm trùng giữa CHIỀU CAO TRANG CHIẾU khi bật Căn theo trang chiếu", `shape=${s.id} ${midY} vs ${midResult.slideHeight / 2}`);
  });

  console.log("PASS: Slides Sắp xếp (Align/Distribute) mở dropdown thật, căn/phân phối đúng vị trí hình thật, một lần Undo hoàn tác trọn vẹn cả nhóm, và Căn theo trang chiếu hoạt động đúng.");
} finally {
  await browser?.close();
  server.close();
}
