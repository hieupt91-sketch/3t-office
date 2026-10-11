import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8992;
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const outDir = path.resolve(root, "docs/screenshots/visual-qa-images");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg"
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
console.log(`Server listening on port ${port}`);

const svgXml = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="8" fill="#2563eb"/><circle cx="65" cy="50" r="24" fill="#fbbf24"/><path d="M20 140 L85 75 L140 115 L175 90 L220 140 Z" fill="#10b981"/><text x="120" y="150" text-anchor="middle" fill="white" font-size="12" font-family="sans-serif">VN Office Visual QA</text></svg>';
const SAMPLE_IMG = `data:image/svg+xml;base64,${Buffer.from(svgXml).toString("base64")}`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("Page error:", err.message));
  page.on("console", msg => {
    if (msg.type() === "error") console.error("Console error:", msg.text());
  });

  // ==========================================
  // 1. VN SHEET QA
  // ==========================================
  console.log("\n=== 1. KIỂM TRA VN SHEET ===");
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Sheet Theme: ${theme} ---`);
    await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    // Apply theme
    await page.evaluate(async (t) => {
      document.documentElement.setAttribute("data-theme", t);
      const { themeManager } = await import("/platform/theme/theme-manager.js");
      if (themeManager) themeManager.setTheme(t);
    }, theme);
    await page.waitForTimeout(200);

    // Insert 2 images via grid API
    const sheetInfo = await page.evaluate(async (imgSrc) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const grid = globalUnoBridge.activeDocument.grid;
      
      // Image 1 at C3
      grid.insertImage(imgSrc, { c: "C", r: 3 });
      // Image 2 at H20
      grid.insertImage(imgSrc, { c: "H", r: 20 });

      const imgPanels = Array.from(document.querySelectorAll(".vno-sheet-image"));
      return {
        imageCount: imgPanels.length,
        anchors: imgPanels.map(p => p.dataset.anchor),
        styles: imgPanels.map(p => ({
          bg: window.getComputedStyle(p).backgroundColor,
          border: window.getComputedStyle(p).border,
          boxShadow: window.getComputedStyle(p).boxShadow
        })),
        deleteBtns: imgPanels.map(p => {
          const btn = p.querySelector("button[data-image-delete]");
          return btn ? {
            text: btn.textContent,
            title: btn.title,
            w: btn.offsetWidth,
            h: btn.offsetHeight,
            bg: window.getComputedStyle(btn).backgroundColor,
            color: window.getComputedStyle(btn).color
          } : null;
        })
      };
    }, SAMPLE_IMG);
    console.log("Sheet Image Info:", JSON.stringify(sheetInfo, null, 2));

    // Capture C3 image in viewport
    await page.screenshot({ path: path.join(outDir, `sheet-images-c3-${theme}.png`) });

    // Scroll to H20
    await page.evaluate(() => {
      const vp = document.querySelector(".vno-grid-viewport");
      if (vp) {
        vp.scrollTop = 400;
        vp.scrollLeft = 500;
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `sheet-images-h20-scrolled-${theme}.png`) });

    // Scroll back partially to check header overlap (C3 scrolling under headers)
    await page.evaluate(() => {
      const vp = document.querySelector(".vno-grid-viewport");
      if (vp) {
        vp.scrollTop = 50;
        vp.scrollLeft = 150;
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `sheet-images-header-overlap-${theme}.png`) });
  }

  // ==========================================
  // 2. VN WRITER QA
  // ==========================================
  console.log("\n=== 2. KIỂM TRA VN WRITER ===");
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Writer Theme: ${theme} ---`);
    await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="writer"]').waitFor({ timeout: 15000 });
    await page.locator(".vno-writer-body").waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    // Apply theme
    await page.evaluate(async (t) => {
      document.documentElement.setAttribute("data-theme", t);
      const { themeManager } = await import("/platform/theme/theme-manager.js");
      if (themeManager) themeManager.setTheme(t);
    }, theme);
    await page.waitForTimeout(200);

    // Populate Writer with long paragraphs and an image in between
    await page.evaluate(async (imgSrc) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      const body = adapter.bodyDom || document.querySelector(".vno-writer-body");
      body.innerHTML = `
        <h1>Báo cáo kết quả nghiên cứu giải pháp trực quan VN Office</h1>
        <p>Hệ thống VN Office được thiết kế hướng tới sự nhất quán cao về trải nghiệm thị giác và tuân thủ các nguyên tắc thiết kế hiện đại của Fluent Design System. Các thành phần như hình ảnh, hình khối, bảng tính đều có trạng thái hiển thị rõ ràng, hỗ trợ đầy đủ các chủ đề Sáng và Tối.</p>
        <p>Hình ảnh minh họa dưới đây hiển thị sơ đồ kiến trúc tích hợp hệ thống và cấu trúc các lớp:</p>
        <img id="qa-writer-img" src="${imgSrc}" data-vno-wrap="inline" tabindex="0" style="max-width:100%; height:auto; margin:10pt 0; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:inline; float:none; position:static; z-index:auto;" />
        <p>Sau khi chèn hình ảnh, người dùng có thể tùy chỉnh căn lề, kiểu chạy chữ (Wrap text), vị trí tuyệt đối hoặc nổi trên trang. Khi nhấp chọn hình ảnh, thanh công cụ Ribbon sẽ xuất hiện tab ngữ cảnh Định dạng Hình ảnh để hỗ trợ thao tác nhanh.</p>
        <p>Văn bản tiếp tục hiển thị sau hình ảnh mà không bị ngắt quãng hoặc xô lệch các dòng văn bản liền kề. Tỷ lệ khung hình của ảnh được giữ nguyên vẹn để chống méo hình.</p>
      `;
      adapter.isDirty = true;
    }, SAMPLE_IMG);
    await page.waitForTimeout(300);

    // Screenshot Writer before selection
    await page.screenshot({ path: path.join(outDir, `writer-image-layout-${theme}.png`) });

    // Click to select the image
    const imgLocator = page.locator("#qa-writer-img");
    await imgLocator.click();
    await page.waitForTimeout(300);

    // Inspect selection styles and contextual ribbon tab
    const writerSelectionInfo = await page.evaluate(() => {
      const img = document.querySelector("#qa-writer-img");
      const tab = document.querySelector("#vno-ribbon-tab-pictureFormat");
      const arrangeGroup = document.querySelector(".vno-writer-arrange-group");
      const labels = arrangeGroup ? Array.from(arrangeGroup.querySelectorAll("label")).map(l => ({
        text: l.innerText,
        color: window.getComputedStyle(l).color
      })) : [];
      const buttons = arrangeGroup ? Array.from(arrangeGroup.querySelectorAll("button")).map(b => ({
        text: b.innerText,
        bg: window.getComputedStyle(b).backgroundColor,
        color: window.getComputedStyle(b).color
      })) : [];
      const selects = arrangeGroup ? Array.from(arrangeGroup.querySelectorAll("select")).map(s => ({
        bg: window.getComputedStyle(s).backgroundColor,
        color: window.getComputedStyle(s).color
      })) : [];

      return {
        hasSelectedClass: img?.classList?.contains("is-vno-image-selected"),
        outline: img ? window.getComputedStyle(img).outline : null,
        tabHidden: tab ? tab.hidden : null,
        tabStyle: tab ? {
          color: window.getComputedStyle(tab).color,
          borderTop: window.getComputedStyle(tab).borderTop
        } : null,
        labels,
        buttons,
        selects
      };
    });
    console.log("Writer Image Selection Info:", JSON.stringify(writerSelectionInfo, null, 2));

    // Screenshot image with selection outline & Ribbon PictureFormat tab
    await page.screenshot({ path: path.join(outDir, `writer-image-selected-${theme}.png`) });

    // Open Print Preview (Ctrl+F2)
    console.log(`Testing Print Preview in Writer (${theme})...`);
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      await globalCommandBus.execute("writer.file.printPreview");
    });
    await page.waitForTimeout(500);

    const previewVisible = await page.locator(".vno-print-preview-overlay").isVisible();
    console.log(`Print preview visible (${theme}):`, previewVisible);
    if (previewVisible) {
      await page.screenshot({ path: path.join(outDir, `writer-print-preview-${theme}.png`) });
      // Close preview
      await page.locator(".vno-print-preview-close-btn").click();
      await page.waitForTimeout(200);
    }
  }

  // ==========================================
  // 3. VN SLIDES QA
  // ==========================================
  console.log("\n=== 3. KIỂM TRA VN SLIDES ===");
  for (const theme of ["light", "dark"]) {
    console.log(`\n--- Slides Theme: ${theme} ---`);
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
    await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    // Apply theme
    await page.evaluate(async (t) => {
      document.documentElement.setAttribute("data-theme", t);
      const { themeManager } = await import("/platform/theme/theme-manager.js");
      if (themeManager) themeManager.setTheme(t);
    }, theme);
    await page.waitForTimeout(200);

    // Insert Rectangle, Ellipse, and Image
    const slidesData = await page.evaluate(async (imgSrc) => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      const slide = canvas.slides[canvas.currentSlideIndex];
      slide.shapes = [
        { id: "rect1", type: "rect", x: 80, y: 70, w: 220, h: 120, color: "#2563eb", text: "Hình chữ nhật mẫu" },
        { id: "ellipse1", type: "ellipse", x: 340, y: 70, w: 180, h: 120, color: "#16a34a", text: "Hình Elip mẫu" },
        { id: "img1", type: "image", x: 560, y: 70, w: 220, h: 140, src: imgSrc, text: "" }
      ];
      canvas._renderShapesLayer();
      return { shapeCount: slide.shapes.length };
    }, SAMPLE_IMG);
    console.log("Slides Shapes Inserted:", slidesData);

    // Screenshot before selection
    await page.screenshot({ path: path.join(outDir, `slides-shapes-overview-${theme}.png`) });

    // Select Rectangle Shape
    const rectInspection = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.setSelectedShapes(["rect1"]);
      
      const el = document.querySelector('[data-shape-id="rect1"]');
      const handles = Array.from(el?.querySelectorAll(".vno-shape-resize-handle") || []).map(h => ({
        dir: h.dataset.handleDir,
        className: h.className,
        cursor: window.getComputedStyle(h).cursor,
        zIndex: window.getComputedStyle(h).zIndex
      }));
      const deleteBtn = el?.querySelector(".vno-shape-delete-btn");
      const deleteBtnInfo = deleteBtn ? {
        text: deleteBtn.textContent,
        title: deleteBtn.title,
        top: window.getComputedStyle(deleteBtn).top,
        left: window.getComputedStyle(deleteBtn).left,
        zIndex: window.getComputedStyle(deleteBtn).zIndex,
        bg: window.getComputedStyle(deleteBtn).backgroundColor,
        color: window.getComputedStyle(deleteBtn).color,
        border: window.getComputedStyle(deleteBtn).border
      } : null;

      // Check for rotation handle or rotation controls in UI
      const rotateHandle = el?.querySelector('[class*="rot"], [data-handle-dir*="rot"]');
      const ribbonRotateBtn = document.querySelector('[data-command-id*="rotate"], [data-command-id*="Rotate"]');

      return {
        isSelected: el?.classList?.contains("is-selected"),
        outline: el ? window.getComputedStyle(el).outline : null,
        boxShadow: el ? window.getComputedStyle(el).boxShadow : null,
        handles,
        deleteBtnInfo,
        hasRotateHandleOnCanvas: Boolean(rotateHandle),
        hasRotateButtonOnRibbon: Boolean(ribbonRotateBtn)
      };
    });
    console.log("Slides Rect Selection Inspection:", JSON.stringify(rectInspection, null, 2));

    // Screenshot rectangle selected
    await page.screenshot({ path: path.join(outDir, `slides-rect-selected-${theme}.png`) });

    // Select Ellipse Shape
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.setSelectedShapes(["ellipse1"]);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `slides-ellipse-selected-${theme}.png`) });

    // Select Image Shape
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.setSelectedShapes(["img1"]);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `slides-image-selected-${theme}.png`) });
  }

} finally {
  if (browser) await browser.close();
  server.close();
  console.log("\nVisual QA capture hoàn tất!");
}
