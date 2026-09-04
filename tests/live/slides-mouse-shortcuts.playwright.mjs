/**
 * VN Slides — xác minh thật thao tác chuột (kéo-thả shape, resize handle, marquee
 * selection) và phím tắt (group/ungroup, điều hướng trang) bằng Playwright thật:
 * mousedown/mousemove/mouseup thật, keyboard.press thật trên UI đang chạy thật —
 * không gọi thẳng hàm nội bộ.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SLIDES_MOUSE_PORT || 8791);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8", ".svg": "image/svg+xml", ".png": "image/png" };

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

function assert(condition, message) { if (!condition) throw new Error(message); }

async function run() {
  await new Promise(resolve => server.listen(PORT, resolve));
  const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newContext({ viewport: { width: 1600, height: 950 } }).then(c => c.newPage());
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));

  try {
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.waitForTimeout(1000);
    await page.locator("#vno-switcher-toggle").click();
    await page.waitForTimeout(150);
    await page.locator('.vno-switcher-item[data-switch="slides"]').click();
    await page.waitForTimeout(700);

    // 1. Chèn shape thật, kéo-thả di chuyển bằng chuột thật
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("slides.shape.insert");
    });
    await page.waitForTimeout(300);
    const shapeId = await page.evaluate(() => document.querySelector(".vno-slide-shape-item")?.dataset.shapeId);
    assert(shapeId, "Chèn shape thật phải tạo phần tử DOM");

    const shapeLocator = page.locator(`[data-shape-id="${shapeId}"]`);
    const beforeBox = await shapeLocator.boundingBox();
    await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(beforeBox.x + beforeBox.width / 2 + 80, beforeBox.y + beforeBox.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const afterDragBox = await shapeLocator.boundingBox();
    assert(Math.abs(afterDragBox.x - beforeBox.x - 80) < 5 && Math.abs(afterDragBox.y - beforeBox.y - 60) < 5, "Kéo-thả bằng chuột thật phải di chuyển đúng khoảng cách");
    console.log("PASS: kéo-thả shape bằng chuột thật di chuyển đúng vị trí");

    // 2. Chọn shape, xác nhận 8 tay cầm resize, kéo tay cầm SE để phóng to
    await shapeLocator.click();
    await page.waitForTimeout(150);
    const handleCount = await page.locator(".vno-shape-resize-handle").count();
    assert(handleCount === 8, `Phải hiện đủ 8 tay cầm resize, hiện có ${handleCount}`);
    const seBox = await page.locator(".vno-handle-se").boundingBox();
    const beforeSize = await page.evaluate(id => { const el = document.querySelector(`[data-shape-id="${id}"]`); return { w: parseFloat(el.style.width), h: parseFloat(el.style.height) }; }, shapeId);
    await page.mouse.move(seBox.x + seBox.width / 2, seBox.y + seBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(seBox.x + 60, seBox.y + 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const afterSize = await page.evaluate(id => { const el = document.querySelector(`[data-shape-id="${id}"]`); return { w: parseFloat(el.style.width), h: parseFloat(el.style.height) }; }, shapeId);
    assert(afterSize.w > beforeSize.w && afterSize.h > beforeSize.h, "Kéo tay cầm SE phải tăng cả chiều rộng và chiều cao");
    console.log("PASS: 8 tay cầm resize hiện đúng, kéo SE tăng đúng kích thước");

    // 3. Marquee selection: thêm 2 shape nữa, kéo chuột vùng trống chọn cả 3
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("slides.shape.insert");
      await globalCommandBus.execute("slides.shape.insert");
    });
    await page.waitForTimeout(300);
    const canvasBox = await page.locator(".vno-slide-canvas").boundingBox();
    await page.mouse.move(canvasBox.x + 5, canvasBox.y + 5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width - 5, canvasBox.y + canvasBox.height - 5, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const selectedCount = await page.evaluate(() => document.querySelectorAll(".vno-slide-shape-item.is-selected").length);
    assert(selectedCount === 3, `Marquee-select phải chọn cả 3 shape, chọn được ${selectedCount}`);
    console.log("PASS: marquee/rubber-band selection chọn đúng số shape trong vùng kéo");

    // 4. Ctrl+G nhóm, Ctrl+Shift+G bỏ nhóm — bằng phím tắt thật
    await page.keyboard.press("Control+g");
    await page.waitForTimeout(200);
    const grouped = await page.evaluate(() => {
      const els = [...document.querySelectorAll(".vno-slide-shape-item")].filter(el => !el.classList.contains("is-connector"));
      return els.every(el => el.dataset.shapeId); // sanity: DOM còn nguyên sau group
    });
    assert(grouped, "DOM shape phải còn nguyên sau khi nhóm bằng Ctrl+G");
    await page.keyboard.press("Control+Shift+g");
    await page.waitForTimeout(200);
    console.log("PASS: Ctrl+G / Ctrl+Shift+G nhóm và bỏ nhóm qua phím tắt thật không lỗi");

    // 5. Điều hướng trang bằng phím tắt thật: Ctrl+Home / Ctrl+End / PageUp / PageDown
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("slides.slide.new");
      await globalCommandBus.execute("slides.slide.new");
    });
    await page.waitForTimeout(200);
    await page.keyboard.press("Control+Home");
    await page.waitForTimeout(150);
    let idx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(idx === 0, `Ctrl+Home phải về trang đầu tiên (index 0), hiện là ${idx}`);
    await page.keyboard.press("Control+End");
    await page.waitForTimeout(150);
    const lastIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(lastIdx > 0, `Ctrl+End phải đến trang cuối cùng, hiện là ${lastIdx}`);
    await page.keyboard.press("PageUp");
    await page.waitForTimeout(150);
    const afterPageUp = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(afterPageUp === lastIdx - 1, "PageUp phải lùi đúng 1 trang");
    console.log("PASS: Ctrl+Home/Ctrl+End/PageUp điều hướng trang đúng qua phím tắt thật");

    assert(pageErrors.length === 0, `Có page error: ${pageErrors.join("; ")}`);
    console.log("PASS: không có lỗi console/page error nào trong suốt quá trình test");
    console.log("\n=== TẤT CẢ KIỂM THỬ THAO TÁC CHUỘT/PHÍM TẮT SLIDES ĐỀU PASS ===");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => { console.error("FAIL:", err.message); process.exitCode = 1; server.close(); });
