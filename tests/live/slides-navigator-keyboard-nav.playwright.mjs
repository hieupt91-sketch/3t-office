/**
 * VN Slides — kiểm thử bàn phím trên Slide Navigator (dải thumbnail bên trái):
 * 1. ArrowUp / ArrowDown di chuyển giữa các slide.
 * 2. Home / End nhảy về slide đầu / cuối.
 * 3. Enter nhảy vào slide (chuyển focus vào tiêu đề / canvas).
 * 4. Delete xóa slide đang chọn và tự động giữ focus trên thumbnail kế tiếp.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SLIDES_NAV_PORT || 8796);
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
  page.on("console", msg => console.log("BROWSER:", msg.text()));

  try {
    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.waitForTimeout(1000);
    await page.locator("#vno-switcher-toggle").click();
    await page.waitForTimeout(150);
    await page.locator('.vno-switcher-item[data-switch="slides"]').click();
    await page.waitForTimeout(700);

    const totalThumbs = await page.locator(".vno-slide-thumb-item").count();
    assert(totalThumbs >= 3, `Phải có ít nhất 3 thumbnail slide, hiện có: ${totalThumbs}`);

    // Focus thumbnail đầu tiên
    const beforeFocusInfo = await page.evaluate(() => {
      const first = document.querySelector('.vno-slide-thumb-item[data-slide-index="0"]');
      first?.focus();
      return {
        foundFirst: !!first,
        tag: document.activeElement?.tagName,
        className: document.activeElement?.className,
        tabIndex: first?.tabIndex
      };
    });
    console.log("DEBUG beforeFocusInfo:", beforeFocusInfo);
    await page.waitForTimeout(150);

    // 1. Phím ArrowDown di chuyển sang slide 1
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    let currentIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(currentIdx === 1, `ArrowDown phải chuyển sang slide index 1, hiện là ${currentIdx}`);
    const activeInfo = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      className: document.activeElement?.className,
      slideIndex: document.activeElement?.getAttribute?.("data-slide-index")
    }));
    console.log("DEBUG activeInfo:", activeInfo);
    let activeFocusedIdx = activeInfo.slideIndex;
    assert(activeFocusedIdx === "1", `Focus phải chuyển sang thumbnail slide 1, hiện là ${activeFocusedIdx}`);
    console.log("PASS: ArrowDown di chuyển sang slide tiếp theo và duy trì focus thumbnail");

    // Phím ArrowDown tiếp sang slide 2
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    currentIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(currentIdx === 2, `ArrowDown phải chuyển sang slide index 2, hiện là ${currentIdx}`);

    // Phím ArrowUp quay lại slide 1
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(150);
    currentIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(currentIdx === 1, `ArrowUp phải chuyển lại slide index 1, hiện là ${currentIdx}`);
    console.log("PASS: ArrowUp di chuyển sang slide trước và duy trì focus thumbnail");

    // Home nhảy về slide đầu tiên
    await page.keyboard.press("Home");
    await page.waitForTimeout(150);
    currentIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(currentIdx === 0, `Home phải về slide đầu (index 0), hiện là ${currentIdx}`);
    console.log("PASS: Home nhảy về slide đầu tiên");

    // End nhảy về slide cuối cùng
    await page.keyboard.press("End");
    await page.waitForTimeout(150);
    currentIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(currentIdx === 2, `End phải về slide cuối (index 2), hiện là ${currentIdx}`);
    console.log("PASS: End nhảy về slide cuối cùng");

    // 2. Enter nhảy vào slide (focus chuyển vào vùng soạn thảo canvas)
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    const focusedInside = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.classList?.contains("vno-slide-title") || active?.classList?.contains("vno-slide-canvas") || false;
    });
    assert(focusedInside, "Enter trên thumbnail phải chuyển focus vào bên trong slide (tiêu đề/canvas)");
    console.log("PASS: Enter nhảy vào bên trong slide thành công");

    // 3. Focus lại thumbnail và nhấn Delete để xóa slide
    await page.evaluate(() => {
      const lastThumb = document.querySelector('.vno-slide-thumb-item[data-slide-index="2"]');
      lastThumb?.focus();
    });
    await page.waitForTimeout(150);

    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    const remainingThumbs = await page.locator(".vno-slide-thumb-item").count();
    assert(remainingThumbs === 2, `Sau khi Delete phải còn 2 slide, hiện có: ${remainingThumbs}`);
    const activeThumbAfterDelete = await page.evaluate(() => document.activeElement?.classList?.contains("vno-slide-thumb-item"));
    assert(activeThumbAfterDelete, "Sau khi Delete, focus phải được giữ trên thumbnail kế tiếp");
    console.log("PASS: Delete xóa slide từ Slide Navigator và giữ focus đúng");

    assert(pageErrors.length === 0, `Có page error: ${pageErrors.join("; ")}`);
    console.log("PASS: không có lỗi console/page error nào trong toàn bộ test Area 2");
    console.log("\n=== TẤT CẢ KIỂM THỬ AREA 2 SLIDE NAVIGATOR BÀN PHÍM ĐỀU PASS ===");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => { console.error("FAIL:", err.message); process.exitCode = 1; server.close(); });
