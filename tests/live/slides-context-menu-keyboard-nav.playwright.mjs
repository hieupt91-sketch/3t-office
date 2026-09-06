/**
 * VN Slides — kiểm thử bàn phím trên Context Menus (Menu ngữ cảnh):
 * 1. Dải thumbnail: Shift+F10 mở context menu section/slide -> Arrow nav -> Escape trả focus về thumbnail.
 * 2. Canvas shape: Shift+F10 mở shape context menu -> Arrow nav -> Escape trả focus về shape.
 * 3. Sau khi Escape, bàn phím điều hướng tiếp tục hoạt động bình thường.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_SLIDES_CTX_PORT || 8797);
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

    // ==========================================
    // PHẦN 1: Context menu trên thumbnail slide
    // ==========================================
    await page.evaluate(() => {
      const thumb = document.querySelector('.vno-slide-thumb-item[data-slide-index="0"]');
      thumb?.focus();
    });
    await page.waitForTimeout(150);

    // Bấm Shift+F10 để mở context menu trên thumbnail
    await page.keyboard.press("Shift+F10");
    await page.waitForTimeout(200);

    const sectionMenuVisible = await page.locator(".vno-slide-section-menu").isVisible();
    assert(sectionMenuVisible, "Shift+F10 trên thumbnail phải mở .vno-slide-section-menu");
    console.log("PASS: Shift+F10 mở context menu trên thumbnail thành công");

    // Di chuyển phím mũi tên trong menu
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    const focusedItemText = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert(focusedItemText === "Nhân đôi trang", `ArrowDown phải chọn 'Nhân đôi trang', hiện là '${focusedItemText}'`);
    console.log("PASS: ArrowDown điều hướng giữa các mục trong context menu thumbnail");

    // Đóng context menu bằng Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const sectionMenuClosed = (await page.locator(".vno-slide-section-menu").count()) === 0;
    assert(sectionMenuClosed, "Escape phải đóng .vno-slide-section-menu");

    // Kiểm tra focus đã được hoàn trả lại cho thumbnail ban đầu
    const activeIsThumb = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.classList?.contains("vno-slide-thumb-item") && active?.getAttribute("data-slide-index") === "0";
    });
    assert(activeIsThumb, "Sau khi Escape đóng context menu, focus PHẢI quay trở về thumbnail trigger");
    console.log("PASS: Escape đóng menu và phục hồi focus chính xác về thumbnail");

    // Thử dùng ArrowDown sau khi đóng menu -> chuyển sang slide 1
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    const curIdx = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument?.canvas?.currentSlideIndex);
    assert(curIdx === 1, `Sau khi đóng menu và bấm ArrowDown, slide phải chuyển sang 1, hiện là ${curIdx}`);
    console.log("PASS: Sau khi thoát menu, phím mũi tên trên thumbnail tiếp tục hoạt động trơn tru");

    // ==========================================
    // PHẦN 2: Context menu trên Canvas Shape
    // ==========================================
    // Thêm 1 shape hình chữ nhật vào slide
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("slides.shape.insert");
    });
    await page.waitForTimeout(300);

    // Focus vào shape vừa tạo
    await page.evaluate(() => {
      const shEl = document.querySelector('.vno-slide-shape-item');
      shEl?.focus();
    });
    await page.waitForTimeout(150);

    // Bấm Shift+F10 mở context menu của shape
    await page.keyboard.press("Shift+F10");
    await page.waitForTimeout(200);

    const shapeMenuVisible = await page.locator(".vno-shape-context-menu").isVisible();
    assert(shapeMenuVisible, "Shift+F10 trên shape phải mở .vno-shape-context-menu");
    console.log("PASS: Shift+F10 mở shape context menu thành công");

    // ArrowDown trong shape context menu
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);
    const shapeMenuItemText = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert(shapeMenuItemText?.includes("Xóa hình vẽ"), `ArrowDown phải chuyển tới 'Xóa hình vẽ', hiện là '${shapeMenuItemText}'`);
    console.log("PASS: ArrowDown điều hướng trong shape context menu");

    // Đóng shape context menu bằng Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const shapeMenuClosed = (await page.locator(".vno-shape-context-menu").count()) === 0;
    assert(shapeMenuClosed, "Escape phải đóng .vno-shape-context-menu");

    // Kiểm tra focus đã được phục hồi về shape
    const activeIsShape = await page.evaluate(() => document.activeElement?.classList?.contains("vno-slide-shape-item"));
    assert(activeIsShape, "Sau khi Escape đóng shape context menu, focus PHẢI quay trở lại shape");
    console.log("PASS: Escape đóng shape menu và phục hồi focus chính xác về shape");

    // Nudge shape bằng phím mũi tên sau khi thoát menu
    const beforeLeft = await page.evaluate(() => {
      const sh = document.querySelector('.vno-slide-shape-item');
      return parseInt(sh.style.left, 10);
    });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    const afterLeft = await page.evaluate(() => {
      const sh = document.querySelector('.vno-slide-shape-item');
      return parseInt(sh.style.left, 10);
    });
    assert(afterLeft === beforeLeft + 1, `Phím mũi tên sau khi thoát menu phải nudge shape +1px (${beforeLeft} -> ${afterLeft})`);
    console.log("PASS: Bàn phím điều hướng và nudge shape tiếp tục hoạt động hoàn hảo sau khi đóng menu");

    assert(pageErrors.length === 0, `Có page error: ${pageErrors.join("; ")}`);
    console.log("PASS: Không có lỗi page error nào trong toàn bộ kiểm thử Area 3");
    console.log("\n=== TẤT CẢ KIỂM THỬ AREA 3 CONTEXT MENUS BÀN PHÍM ĐỀU PASS ===");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => { console.error("FAIL:", err.message); process.exitCode = 1; server.close(); });
