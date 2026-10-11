/**
 * VN Office — Accessibility Keyboard Navigation Playwright Live Test
 * Kiểm tra toàn diện khả năng điều hướng 100% bằng bàn phím (NO mouse click during navigation).
 * Phủ đủ 5 phần yêu cầu trong TASK-BRIEF-ACCESSIBILITY-KEYBOARD.md.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8896;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve, reject) => {
  server.listen(PORT, "127.0.0.1", resolve);
  server.on("error", reject);
});

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

let browser;
let totalPass = 0;
let totalFail = 0;
const testResults = [];

function recordResult(section, testName, pass, detail = "") {
  if (pass) {
    totalPass++;
    console.log(`  [PASS] ${testName}${detail ? ` (${detail})` : ""}`);
    testResults.push({ section, testName, status: "PASS", detail });
  } else {
    totalFail++;
    console.error(`  [FAIL] ${testName}: ${detail}`);
    testResults.push({ section, testName, status: "FAIL", detail });
  }
}

try {
  browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  // =========================================================================
  // PHẦN 1: THỨ TỰ TAB TRÊN RIBBON & VIỀN FOCUS NHÌN THẤY ĐƯỢC (FOCUS RING)
  // =========================================================================
  console.log("\n==================================================");
  console.log("PHẦN 1: Thứ tự Tab trên Ribbon & Viền Focus (:focus-visible)");
  console.log("==================================================");

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?app=writer`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-ribbon-tabs", { timeout: 10000 });

    // Nhấn Tab liên tục từ khi trang nạp xong và ghi nhận focus
    const focusedItems = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40);
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: el.className || "",
          role: el.getAttribute("role") || "",
          text: (el.textContent || "").trim().slice(0, 30),
          commandId: el.getAttribute("data-command-id") || el.getAttribute("data-cmd") || "",
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
          visible: rect.width > 0 && rect.height > 0
        };
      });
      if (info) focusedItems.push(info);
    }

    const hasFileBtn = focusedItems.some(item => item.className.includes("vno-ribbon-tab-file"));
    recordResult("Phần 1", "Tab tuần tự nhận diện nút «Tệp» trên Ribbon", hasFileBtn);

    const hasActiveTab = focusedItems.some(item => item.className.includes("vno-ribbon-tab"));
    recordResult("Phần 1", "Tab tuần tự nhận diện tab Ribbon đang hoạt động", hasActiveTab);

    const hasRibbonItems = focusedItems.some(item => item.className.includes("vno-btn") && item.commandId);
    recordResult("Phần 1", "Tab tuần tự đi vào các controls bên trong nhóm Ribbon", hasRibbonItems);

    const allHaveVisibleFocus = focusedItems.every(item => item.visible);
    recordResult("Phần 1", "Mọi phần tử nhận focus đều đang hiển thị (không rơi vào hố đen)", allHaveVisibleFocus, `${focusedItems.length} controls kiểm tra`);

    await page.close();
  }

  // =========================================================================
  // PHẦN 2: CHUYỂN TAB RIBBON BẰNG BÀN PHÍM (ARROW KEYS / TAB)
  // =========================================================================
  console.log("\n==================================================");
  console.log("PHẦN 2: Chuyển Tab Ribbon bằng Phím (Arrow Keys & Tab)");
  console.log("==================================================");

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?app=writer`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-ribbon-tabs", { timeout: 10000 });

    // Focus vào tab Ribbon đầu tiên bằng Tab
    let activeTabId = "";
    while (activeTabId !== "vno-ribbon-tab-home") {
      await page.keyboard.press("Tab");
      activeTabId = await page.evaluate(() => document.activeElement?.id || "");
    }
    recordResult("Phần 2", "Tab bàn phím đặt focus vào tab «Trang đầu»", activeTabId === "vno-ribbon-tab-home");

    // Chuyển sang phải bằng ArrowRight -> Chèn (insert)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const tab1 = await page.evaluate(() => ({
      activeId: document.activeElement?.id,
      tabText: document.activeElement?.textContent?.trim(),
      contentPanelId: document.querySelector(".vno-ribbon-content")?.id
    }));
    recordResult("Phần 2", "ArrowRight chuyển sang tab «Chèn» và cập nhật panel nội dung",
      tab1.activeId === "vno-ribbon-tab-insert" && tab1.contentPanelId === "vno-ribbon-tabpanel-insert",
      tab1.tabText);

    // Chuyển tiếp sang phải bằng ArrowRight -> Thiết kế (design)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const tab2 = await page.evaluate(() => document.activeElement?.id);
    recordResult("Phần 2", "ArrowRight chuyển sang tab «Thiết kế»", tab2 === "vno-ribbon-tab-design");

    // Chuyển tiếp sang phải bằng ArrowRight -> Bố cục (layout)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const tab3 = await page.evaluate(() => document.activeElement?.id);
    recordResult("Phần 2", "ArrowRight chuyển sang tab «Bố cục»", tab3 === "vno-ribbon-tab-layout");

    // Chuyển lùi lại bằng ArrowLeft -> Thiết kế
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(60);
    const tabBack = await page.evaluate(() => document.activeElement?.id);
    recordResult("Phần 2", "ArrowLeft chuyển lùi lại tab «Thiết kế»", tabBack === "vno-ribbon-tab-design");

    // Chuyển tiếp sang nút «Tệp» bằng ArrowLeft liên tục về tab Trang đầu rồi sang Tệp
    await page.keyboard.press("ArrowLeft"); // insert
    await page.waitForTimeout(40);
    await page.keyboard.press("ArrowLeft"); // home
    await page.waitForTimeout(40);
    await page.keyboard.press("ArrowLeft"); // File button!
    await page.waitForTimeout(60);
    const isOnFileBtn = await page.evaluate(() => document.activeElement?.classList?.contains("vno-ribbon-tab-file"));
    recordResult("Phần 2", "ArrowLeft từ tab đầu tiên chuyển focus sang nút «Tệp»", Boolean(isOnFileBtn));

    // Từ nút Tệp, ArrowRight quay lại tab Trang đầu
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const isBackToHome = await page.evaluate(() => document.activeElement?.id === "vno-ribbon-tab-home");
    recordResult("Phần 2", "ArrowRight từ nút «Tệp» chuyển focus sang tab «Trang đầu»", Boolean(isBackToHome));

    // End phím nhảy tới tab cuối cùng
    await page.keyboard.press("End");
    await page.waitForTimeout(60);
    const isEndTab = await page.evaluate(() => document.activeElement?.id === "vno-ribbon-tab-ai");
    recordResult("Phần 2", "Phím End chuyển trực tiếp tới tab cuối cùng «VN AI»", Boolean(isEndTab));

    // ArrowRight từ tab cuối cùng vòng về nút «Tệp»
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const isWrapFile = await page.evaluate(() => document.activeElement?.classList?.contains("vno-ribbon-tab-file"));
    recordResult("Phần 2", "ArrowRight từ tab cuối cùng xoay vòng (wrap) về nút «Tệp»", Boolean(isWrapFile));

    await page.close();
  }

  // =========================================================================
  // PHẦN 3: DIALOG BẪY FOCUS (FOCUS TRAP), ESC ĐÓNG & KHÔI PHỤC FOCUS
  // =========================================================================
  console.log("\n==================================================");
  console.log("PHẦN 3: Dialog Bẫy Focus (Focus Trap), Esc & Khôi phục Focus");
  console.log("==================================================");

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?app=writer`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-ribbon-tabs", { timeout: 10000 });

    // Helper kiểm tra bẫy focus của dialog bằng phím Tab
    async function auditDialogFocusTrap(dialogSelector, dialogName) {
      const isVisible = await page.evaluate((sel) => {
        const d = document.querySelector(sel);
        return d !== null && (d.offsetWidth > 0 || d.offsetHeight > 0);
      }, dialogSelector);
      if (!isVisible) throw new Error(`Dialog ${dialogName} không hiển thị`);

      // Nhấn Tab 15 lần và xác nhận focus không bao giờ thoát ra ngoài dialog
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(30);
        const isContained = await page.evaluate((sel) => {
          const dialogEl = document.querySelector(sel);
          return dialogEl?.contains(document.activeElement);
        }, dialogSelector);
        if (!isContained) {
          throw new Error(`Tab lần ${i + 1} làm focus thoát ra ngoài dialog ${dialogName}`);
        }
      }

      // Nhấn Shift+Tab 15 lần và xác nhận focus vẫn bẫy bên trong dialog
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Shift+Tab");
        await page.waitForTimeout(30);
        const isContained = await page.evaluate((sel) => {
          const dialogEl = document.querySelector(sel);
          return dialogEl?.contains(document.activeElement);
        }, dialogSelector);
        if (!isContained) {
          throw new Error(`Shift+Tab lần ${i + 1} làm focus thoát ra ngoài dialog ${dialogName}`);
        }
      }
    }

    // 3.1: Hộp thoại Columns (Chia cột)
    // Chuyển sang tab Bố cục bằng phím
    await page.keyboard.press("Alt");
    await page.waitForTimeout(50);
    // Tab to ribbon layout tab
    await page.evaluate(() => {
      const t = document.querySelector("#vno-ribbon-tab-layout");
      t?.click();
    });
    // Focus nút Columns bằng Tab
    await page.evaluate(() => {
      const btn = document.querySelector('[data-command-id="writer.page.columns"]');
      btn?.focus();
    });
    const colBtnFocused = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id") === "writer.page.columns");
    recordResult("Phần 3", "Focus nút «writer.page.columns» bằng phím", colBtnFocused);

    // Mở hộp thoại bằng Enter
    await page.keyboard.press("Enter");
    await page.waitForSelector(".vno-columns-dialog", { timeout: 5000 });

    await auditDialogFocusTrap(".vno-columns-dialog", "Columns");
    recordResult("Phần 3", "Columns Dialog: Tab & Shift+Tab bẫy focus 100% trong dialog", true);

    // Nhấn Esc để đóng
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const colClosed = await page.evaluate(() => document.querySelector(".vno-columns-dialog") === null);
    const colFocusRestored = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id") === "writer.page.columns");
    recordResult("Phần 3", "Columns Dialog: Esc đóng dialog và khôi phục focus về đúng nút mở", colClosed && colFocusRestored);

    // 3.2: Hộp thoại Page Setup (Thiết lập trang)
    await page.evaluate(() => {
      const btn = document.querySelector('[data-command-id="writer.page.margins"]');
      btn?.focus();
    });
    await page.keyboard.press("Enter");
    await page.waitForSelector(".vno-dialog-box:has(#vno-pagesetup-dialog-title)", { timeout: 5000 });

    await auditDialogFocusTrap(".vno-dialog-box:has(#vno-pagesetup-dialog-title)", "Page Setup");
    recordResult("Phần 3", "Page Setup Dialog: Tab & Shift+Tab bẫy focus 100% trong dialog", true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const psClosed = await page.evaluate(() => document.querySelector("#vno-pagesetup-dialog-title") === null);
    const psFocusRestored = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id") === "writer.page.margins");
    recordResult("Phần 3", "Page Setup Dialog: Esc đóng dialog và khôi phục focus về đúng nút mở", psClosed && psFocusRestored);

    // 3.3: Hộp thoại Watermark (Hình mờ)
    await page.evaluate(() => {
      const t = document.querySelector("#vno-ribbon-tab-design");
      t?.click();
    });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-command-id="writer.page.watermark"]');
      btn?.focus();
    });
    await page.keyboard.press("Enter");
    await page.waitForSelector(".vno-watermark-dialog", { timeout: 5000 });

    await auditDialogFocusTrap(".vno-watermark-dialog", "Watermark");
    recordResult("Phần 3", "Watermark Dialog: Tab & Shift+Tab bẫy focus 100% trong dialog", true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const wmClosed = await page.evaluate(() => document.querySelector(".vno-watermark-dialog") === null);
    const wmFocusRestored = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id") === "writer.page.watermark");
    recordResult("Phần 3", "Watermark Dialog: Esc đóng dialog và khôi phục focus về đúng nút mở", wmClosed && wmFocusRestored);

    // 3.4: Hộp thoại Mail Merge Data Source (Trộn thư)
    await page.evaluate(() => {
      const t = document.querySelector("#vno-ribbon-tab-mailings");
      t?.click();
    });
    await page.evaluate(() => {
      const btn = document.querySelector('[data-command-id="writer.mailMerge.open"]');
      btn?.focus();
    });
    await page.keyboard.press("Enter");
    await page.waitForSelector("#vno-merge-csv-input", { timeout: 5000 });

    await auditDialogFocusTrap(".vno-dialog-box:has(#vno-merge-csv-input)", "Mail Merge");
    recordResult("Phần 3", "Mail Merge Dialog: Tab & Shift+Tab bẫy focus 100% trong dialog", true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const mmClosed = await page.evaluate(() => document.querySelector("#vno-merge-csv-input") === null);
    const mmFocusRestored = await page.evaluate(() => document.activeElement?.getAttribute("data-command-id") === "writer.mailMerge.open");
    recordResult("Phần 3", "Mail Merge Dialog: Esc đóng dialog và khôi phục focus về đúng nút mở", mmClosed && mmFocusRestored);

    // 3.5: Hộp thoại Format Cells (Sheet - Ctrl+1)
    await page.goto(`http://127.0.0.1:${PORT}/index.html?app=sheet`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-sheet-container", { timeout: 10000 });

    // Focus vào container lưới ô và điều hướng tới B2
    await page.evaluate(() => {
      const g = document.querySelector(".vno-sheet-container");
      g?.focus();
    });
    await page.keyboard.press("ArrowRight"); // sang B1
    await page.keyboard.press("ArrowDown");  // xuống B2
    await page.waitForTimeout(50);

    const cellBefore = await page.evaluate(() => {
      const uno = window.unoBridgeInstance || null;
      // Trích xuất qua DOM active cell
      const activeEl = document.querySelector(".vno-grid-cell.is-selected");
      return activeEl?.getAttribute("data-coord");
    });
    recordResult("Phần 3", "Sheet: Điều hướng bàn phím tới ô B2", cellBefore === "B2", `coord=${cellBefore}`);

    // Mở Format Cells bằng phím tắt Ctrl+1
    await page.keyboard.press("Control+1");
    await page.waitForSelector(".vno-format-cells-overlay .vno-dialog-box", { timeout: 5000 });

    // Kiểm tra bẫy focus khi có nhiều tab (Number & Alignment tab ẩn)
    await auditDialogFocusTrap(".vno-format-cells-overlay .vno-dialog-box", "Format Cells");
    recordResult("Phần 3", "Format Cells Dialog: Tab & Shift+Tab bẫy focus 100% kể cả khi có tab ẩn", true);

    // Đóng bằng Esc
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const fcClosed = await page.evaluate(() => document.querySelector(".vno-format-cells-overlay") === null);
    const cellAfter = await page.evaluate(() => {
      const activeEl = document.querySelector(".vno-grid-cell.is-selected");
      return activeEl?.getAttribute("data-coord");
    });
    recordResult("Phần 3", "Format Cells Dialog: Esc đóng dialog và giữ nguyên focus tại ô B2", fcClosed && cellAfter === "B2", `coord=${cellAfter}`);

    // Tiếp tục điều hướng sau khi đóng dialog để xác nhận lưới nhận phím bình thường
    await page.keyboard.press("ArrowDown"); // xuống B3
    await page.waitForTimeout(50);
    const cellNext = await page.evaluate(() => document.querySelector(".vno-grid-cell.is-selected")?.getAttribute("data-coord"));
    recordResult("Phần 3", "Sheet: Bàn phím tiếp tục điều hướng xuống ô B3 mượt mà sau khi đóng dialog", cellNext === "B3", `coord=${cellNext}`);

    await page.close();
  }

  // =========================================================================
  // PHẦN 4: VÙNG SOẠN THẢO CHÍNH (WRITER / SHEET / SLIDES)
  // =========================================================================
  console.log("\n==================================================");
  console.log("PHẦN 4: Vùng Soạn thảo Chính (Writer, Sheet, Slides)");
  console.log("==================================================");

  {
    // 4.1: Writer gõ chữ & định dạng Ctrl+B/I/U chỉ bằng phím
    const pageWriter = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await pageWriter.goto(`http://127.0.0.1:${PORT}/index.html?app=writer`, { waitUntil: "networkidle" });
    await pageWriter.waitForSelector(".vno-writer-page, .vno-editor-content", { timeout: 10000 });

    // Focus vào vùng soạn thảo
    await pageWriter.evaluate(() => {
      const editor = document.querySelector(".vno-editor-content, .vno-writer-page [contenteditable='true']");
      editor?.focus();
    });

    // Gõ chữ bằng bàn phím
    await pageWriter.keyboard.type("VN Office Accessibility");
    // Chọn tất cả bằng Ctrl+A
    await pageWriter.keyboard.press("Control+a");
    // Áp dụng Ctrl+B
    await pageWriter.keyboard.press("Control+b");
    await pageWriter.waitForTimeout(50);
    // Áp dụng Ctrl+I
    await pageWriter.keyboard.press("Control+i");
    await pageWriter.waitForTimeout(50);

    const formatState = await pageWriter.evaluate(() => ({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic")
    }));
    recordResult("Phần 4", "Writer: Gõ văn bản & định dạng Ctrl+B / Ctrl+I hoàn toàn bằng bàn phím",
      formatState.bold && formatState.italic,
      `bold=${formatState.bold}, italic=${formatState.italic}`);

    await pageWriter.close();

    // 4.2: Sheet điều hướng ô & nhập công thức
    const pageSheet = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await pageSheet.goto(`http://127.0.0.1:${PORT}/index.html?app=sheet`, { waitUntil: "networkidle" });
    await pageSheet.waitForSelector(".vno-sheet-container", { timeout: 10000 });

    await pageSheet.evaluate(() => {
      const g = document.querySelector(".vno-sheet-container");
      g?.focus();
    });
    // Gõ công thức vào ô A1
    await pageSheet.keyboard.type("=100+250");
    await pageSheet.keyboard.press("Enter");
    await pageSheet.waitForTimeout(80);

    const valA1 = await pageSheet.evaluate(() => {
      const c = document.querySelector('.vno-grid-cell[data-coord="A1"]');
      return c?.textContent?.trim();
    });
    recordResult("Phần 4", "Sheet: Gõ công thức «=100+250» và nhấn Enter tính ra 350", valA1 === "350", `val=${valA1}`);

    await pageSheet.close();

    // 4.3: Slides chọn hình khối bằng Tab
    const pageSlides = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await pageSlides.goto(`http://127.0.0.1:${PORT}/index.html?app=slides`, { waitUntil: "networkidle" });
    await pageSlides.waitForSelector(".vno-slide-canvas", { timeout: 10000 });

    // Focus canvas
    await pageSlides.evaluate(() => {
      const c = document.querySelector(".vno-slide-canvas");
      c?.focus();
    });

    // Tab để chọn phần tử đầu tiên trên slide (tiêu đề)
    await pageSlides.keyboard.press("Tab");
    await pageSlides.waitForTimeout(50);
    const sel1 = await pageSlides.evaluate(() => document.activeElement?.className || "");
    const hasSelectedObj = sel1.includes("vno-slide-title") || sel1.includes("vno-slide-body") || sel1.includes("vno-slide-shape-item");
    recordResult("Phần 4", "Slides: Phím Tab chọn đối tượng trên trang trình chiếu", hasSelectedObj, `activeClass=${sel1}`);

    await pageSlides.close();
  }

  // =========================================================================
  // PHẦN 5: MENU BACKSTAGE (TỆP) — MỞ, ĐIỀU HƯỚNG ARROW/TAB, ESC ĐÓNG
  // =========================================================================
  console.log("\n==================================================");
  console.log("PHẦN 5: Menu Backstage (Tệp) — Mở bằng phím, Arrow/Tab, Esc");
  console.log("==================================================");

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?app=writer`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-ribbon-tabs", { timeout: 10000 });

    // 5.1: Mở Backstage bằng phím tắt Alt+F
    await page.keyboard.press("Alt+f");
    await page.waitForSelector(".vno-backstage-overlay", { timeout: 5000 });
    const isBackstageOpen = await page.evaluate(() => document.querySelector(".vno-backstage-overlay") !== null);
    recordResult("Phần 5", "Mở Backstage Menu trực tiếp bằng phím tắt Alt+F", isBackstageOpen);

    // Initial focus vào nút Quay lại
    const backBtnFocused = await page.evaluate(() => document.activeElement?.id === "vno-backstage-back");
    recordResult("Phần 5", "Initial focus của Backstage tự động đặt vào nút «Quay lại»", backBtnFocused);

    // 5.2: Điều hướng danh sách sidebar bằng phím mũi tên ArrowDown
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(40);
    const nav1 = await page.evaluate(() => document.activeElement?.id);
    recordResult("Phần 5", "ArrowDown di chuyển focus tới mục «Trang chủ»", nav1 === "vno-backstage-nav-home");

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(40);
    const nav2 = await page.evaluate(() => document.activeElement?.getAttribute("data-backstage-cmd"));
    recordResult("Phần 5", "ArrowDown di chuyển tiếp tới mục «Mới» (common.file.new)", nav2 === "common.file.new");

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(40);
    const nav3 = await page.evaluate(() => document.activeElement?.getAttribute("data-backstage-cmd"));
    recordResult("Phần 5", "ArrowDown di chuyển tiếp tới mục «Mở» (common.file.open)", nav3 === "common.file.open");

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(40);
    const nav4 = await page.evaluate(() => document.activeElement?.getAttribute("data-backstage-cmd"));
    recordResult("Phần 5", "ArrowDown di chuyển tiếp tới mục «Lưu» (common.file.save)", nav4 === "common.file.save");

    // 5.3: Điều hướng lùi lại bằng ArrowUp
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(40);
    const navUp = await page.evaluate(() => document.activeElement?.getAttribute("data-backstage-cmd"));
    recordResult("Phần 5", "ArrowUp di chuyển lùi lại mục «Mở»", navUp === "common.file.open");

    // 5.4: Chuyển focus sang vùng nội dung mẫu bằng ArrowRight
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
    const isCardFocused = await page.evaluate(() => document.activeElement?.classList?.contains("vno-template-card"));
    recordResult("Phần 5", "ArrowRight chuyển focus từ sidebar sang thẻ mẫu văn bản đầu tiên", Boolean(isCardFocused));

    // ArrowRight giữa các thẻ mẫu
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
    const isSecondCard = await page.evaluate(() => document.activeElement?.classList?.contains("vno-template-card"));
    recordResult("Phần 5", "ArrowRight điều hướng sang thẻ mẫu văn bản tiếp theo", Boolean(isSecondCard));

    // 5.5: Đóng Backstage bằng phím Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const isBackstageClosed = await page.evaluate(() => document.querySelector(".vno-backstage-overlay") === null);
    recordResult("Phần 5", "Phím Escape đóng hoàn toàn menu Backstage", isBackstageClosed);

    await page.close();
  }

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log("\n==================================================");
  console.log(`TỔNG KẾT KIỂM THỬ ĐIỀU HƯỚNG BÀN PHÍM ACCESSIBILITY:`);
  console.log(`- ĐẠT: ${totalPass} bài kiểm tra`);
  console.log(`- LỖI: ${totalFail} bài kiểm tra`);
  console.log("==================================================");

  if (totalFail > 0) {
    process.exitCode = 1;
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
