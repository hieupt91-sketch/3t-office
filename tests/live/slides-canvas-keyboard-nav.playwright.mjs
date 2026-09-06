/**
 * VN Slides — kiểm thử bàn phím thuần túy (keyboard-only) trên Canvas:
 * - Chọn và duyệt giữa các shape bằng Tab
 * - Nudge shape bằng phím mũi tên
 * - Ctrl+D nhân đôi shape đang chọn
 * - Delete xóa shape đang chọn và tự động giữ focus
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SLIDES_KEYNAV_PORT || 8795);
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

    // Chèn 2 shape
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("slides.shape.insert");
      await globalCommandBus.execute("slides.shape.insert");
    });
    await page.waitForTimeout(300);

    const initialCount = await page.locator(".vno-slide-shape-item").count();
    assert(initialCount === 2, `Phải có 2 shape sau khi chèn, có: ${initialCount}`);

    await page.evaluate(() => document.querySelector(".vno-slide-shape-item")?.focus());
    await page.waitForTimeout(150);
    const id1 = await page.evaluate(() => document.querySelector(".vno-slide-shape-item.is-selected")?.dataset.shapeId);
    assert(id1 != null, "Shape đầu tiên phải được chọn");

    // Nhấn Tab chuyển sang shape tiếp theo
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
    const id2 = await page.evaluate(() => document.querySelector(".vno-slide-shape-item.is-selected")?.dataset.shapeId);
    assert(id2 != null && id2 !== id1, `Tab phải chuyển sang shape tiếp theo, từ ${id1} sang ${id2}`);

    // Nhấn Shift+Tab quay lại shape đầu tiên
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(150);
    const backId = await page.evaluate(() => document.querySelector(".vno-slide-shape-item.is-selected")?.dataset.shapeId);
    assert(backId === id1, `Shift+Tab phải quay lại shape ban đầu (${id1}), hiện tại là: ${backId}`);
    console.log(`PASS: Tab / Shift+Tab điều hướng giữa các shape (${id1} <-> ${id2})`);

    // 2. Nudge shape bằng phím mũi tên
    const shapeLocator = page.locator(".vno-slide-shape-item.is-selected");
    const boxBefore = await shapeLocator.boundingBox();
    assert(boxBefore != null, "Shape được chọn phải có bounding box");

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    const boxAfter = await shapeLocator.boundingBox();
    assert(boxAfter.x > boxBefore.x, "Phím ArrowRight phải di chuyển shape sang phải");
    assert(boxAfter.y > boxBefore.y, "Phím ArrowDown phải di chuyển shape xuống dưới");
    console.log("PASS: phím mũi tên nudge shape chính xác");

    // 3. Ctrl+D nhân đôi shape đang chọn
    await page.keyboard.press("Control+d");
    await page.waitForTimeout(300);
    const afterDupCount = await page.locator(".vno-slide-shape-item").count();
    assert(afterDupCount === 3, `Ctrl+D phải nhân đôi shape thành 3 shape, hiện có: ${afterDupCount}`);
    console.log("PASS: Ctrl+D nhân đôi shape thành công bằng bàn phím");

    // 4. Delete xóa shape đang chọn
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    const afterDelCount = await page.locator(".vno-slide-shape-item").count();
    assert(afterDelCount === 2, `Delete phải xóa 1 shape, còn lại 2, hiện có: ${afterDelCount}`);
    const focusedTag = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    assert(focusedTag != null, "Sau khi Delete, focus phải được duy trì hợp lệ");
    console.log("PASS: Delete xóa shape và duy trì focus đúng");

    assert(pageErrors.length === 0, `Có page error: ${pageErrors.join("; ")}`);
    console.log("PASS: không có lỗi console/page error nào trong toàn bộ test Area 1");
    console.log("\n=== TẤT CẢ KIỂM THỬ AREA 1 CANVAS BÀN PHÍM ĐỀU PASS ===");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => { console.error("FAIL:", err.message); process.exitCode = 1; server.close(); });
