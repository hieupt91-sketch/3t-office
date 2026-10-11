import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const port = 8998;
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
process.env.PLAYWRIGHT_BROWSERS_PATH = "C:/Users/3T Computer/AppData/Local/ms-playwright";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".htm": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".mjs": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
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
console.log(`Static test server running at http://127.0.0.1:${port}`);

const outDir = "E:/VNOffice-firstrun-screenshots";
fs.mkdirSync(outDir, { recursive: true });

async function runAudit() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--lang=en-US", "--window-size=1366,768"] // Giả lập máy tính Windows thông thường có navigator.language là en-US
  });

  const auditLog = [];

  try {
    // ==========================================
    // 1. KIỂM THỬ KHỞI ĐỘNG LẦN ĐẦU (FIRST RUN)
    // ==========================================
    console.log("--- BƯỚC 1: Khởi động lần đầu (Fresh Profile, navigator.language = en-US) ---");
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.on("console", msg => {
      if (msg.type() === "error") console.log("[Console ERROR]:", msg.text());
    });
    page.on("pageerror", err => console.log("[Page ERROR]:", err.message));
    
    // Mở trang chủ lần đầu không có bất kỳ localStorage nào
    await page.goto(`http://127.0.0.1:${port}/?app=writer&singleApp=1`);
    await page.waitForSelector(".vno-ribbon", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Chụp màn hình khởi động lần đầu (có consent dialog nếu chưa chọn)
    await page.screenshot({ path: path.join(outDir, "01_writer_first_run_dialog.png") });

    // Kiểm tra ngôn ngữ ribbon hiện tại
    const firstTabLabel = await page.evaluate(() => {
      const tab = document.querySelector(".vno-ribbon-tab");
      return tab ? tab.textContent.trim() : "";
    });
    const allTabs = await page.evaluate(() => {
      return [...document.querySelectorAll(".vno-ribbon-tab")].map(t => t.textContent.trim());
    });
    console.log("Nhãn các tab trên Ribbon:", allTabs);
    const isEnRibbon = allTabs.some(t => /^(File|Home|Insert|Layout)$/i.test(t));
    auditLog.push({
      step: "1. Ngôn ngữ Ribbon khởi động lần đầu",
      status: isEnRibbon ? "SAI - Đang hiển thị tiếng Anh do navigator.language" : "ĐÚNG - Tiếng Việt",
      details: allTabs.join(", ")
    });

    // Kiểm tra hộp thoại consent có đang che màn hình không
    const consentOverlayState = await page.evaluate(() => {
      const overlay = document.querySelector(".vno-error-reporting-overlay");
      if (!overlay) return { exists: false };
      const dialog = overlay.querySelector(".vno-dialog-box");
      const dRect = dialog ? dialog.getBoundingClientRect() : null;
      const oRect = overlay.getBoundingClientRect();
      const style = window.getComputedStyle(overlay);
      return {
        exists: true,
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter,
        overlayWidth: oRect.width,
        overlayHeight: oRect.height,
        dialogWidth: dRect?.width,
        dialogHeight: dRect?.height,
        coversWholeScreen: oRect.width >= window.innerWidth && oRect.height >= window.innerHeight,
        hasBlurBackdrop: style.backdropFilter && style.backdropFilter !== "none"
      };
    });
    console.log("Consent overlay state:", consentOverlayState);
    if (consentOverlayState.exists && consentOverlayState.coversWholeScreen) {
      auditLog.push({
        step: "2. Hộp thoại xin đồng ý báo lỗi",
        status: "LỖI UX",
        details: "Hộp thoại consent dùng modal fullscreen với nền mờ che kín toàn bộ màn hình và tài liệu phía sau (" + consentOverlayState.backgroundColor + ", blur: " + consentOverlayState.backdropFilter + ")"
      });
    }

    // Đóng consent dialog nếu có để tiếp tục thao tác
    await page.evaluate(() => {
      const denyBtn = document.querySelector(".vno-error-reporting-overlay [data-dialog-action='deny']");
      if (denyBtn) denyBtn.click();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, "02_writer_blank_document.png") });

    // ==========================================
    // 2. SOẠN THẢO VĂN BẢN TRÊN VN WRITER
    // ==========================================
    console.log("--- BƯỚC 2: Soạn thảo cơ bản trên VN Writer ---");
    // Thử gõ văn bản vào trang trắng
    await page.evaluate(() => {
      const editor = document.querySelector(".vno-writer-body") || document.querySelector("[contenteditable='true']");
      if (editor) {
        editor.focus();
        document.execCommand("insertText", false, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nĐƠN XIN NGHỈ PHÉP\n\nKính gửi: Ban Giám đốc Công ty.\nTôi tên là Nguyễn Văn A, nhân viên phòng Kỹ thuật.");
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "03_writer_typing_text.png") });

    // Chọn chữ và định dạng Đậm, Nghiêng, Cỡ chữ, Phông chữ, Căn giữa
    await page.evaluate(() => {
      const editor = document.querySelector(".vno-writer-body") || document.querySelector("[contenteditable='true']");
      if (editor) {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes("CỘNG HÒA")) {
            const range = document.createRange();
            range.selectNodeContents(node.parentElement);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand("bold");
            document.execCommand("justifyCenter");
            break;
          }
        }
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, "04_writer_format_bold_center.png") });

    // Cuộn trang & Thước đo
    await page.evaluate(() => {
      const scroller = document.querySelector(".vno-writer-workspace") || document.querySelector(".vno-editor-container");
      if (scroller) scroller.scrollTop = 200;
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, "05_writer_scroll_and_ruler.png") });

    // Chèn bảng
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("writer.insert.table", { rows: 3, cols: 3 });
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, "06_writer_insert_table.png") });

    // Mở Backstage / In
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("common.file.print");
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, "07_writer_print_preview.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);

    // Mở hộp thoại Lưu thành (Save As)
    await page.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("common.file.saveAs");
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, "08_writer_save_as_dialog.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ==========================================
    // 3. KIỂM THỬ VN SHEET
    // ==========================================
    console.log("--- BƯỚC 3: Mở VN Sheet & thao tác cơ bản ---");
    const sheetPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await sheetPage.goto(`http://127.0.0.1:${port}/?app=sheet&singleApp=1`);
    await sheetPage.waitForSelector(".vno-ribbon", { timeout: 15000 });
    await sheetPage.waitForTimeout(1000);

    // Chụp VN Sheet lúc mới mở
    await sheetPage.screenshot({ path: path.join(outDir, "09_sheet_startup.png") });

    // Chọn ô A1, gõ số và công thức
    await sheetPage.evaluate(() => {
      const grid = window.__vnoAppInstance?.grid;
      if (grid) {
        grid.selectCell(0, 0); // A1
        grid.setCellValue(0, 0, "1500000");
        grid.selectCell(0, 1); // B1
        grid.setCellValue(0, 1, "2500000");
        grid.selectCell(0, 2); // C1
        grid.setCellValue(0, 2, "=SUM(A1:B1)");
        grid.render();
      }
    });
    await sheetPage.waitForTimeout(500);
    await sheetPage.screenshot({ path: path.join(outDir, "10_sheet_cell_edit_formula.png") });

    // Định dạng số: Tiền tệ
    await sheetPage.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("sheet.format.currency");
    });
    await sheetPage.waitForTimeout(500);
    await sheetPage.screenshot({ path: path.join(outDir, "11_sheet_format_currency.png") });

    // Bật bộ lọc AutoFilter
    await sheetPage.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("sheet.data.filter");
    });
    await sheetPage.waitForTimeout(500);
    await sheetPage.screenshot({ path: path.join(outDir, "12_sheet_autofilter.png") });

    // Chèn hàng / Chèn cột
    await sheetPage.evaluate(async () => {
      const { globalCommandBus } = await import("./platform/commands/command-bus.js");
      await globalCommandBus.execute("sheet.row.insertAbove");
    });
    await sheetPage.waitForTimeout(500);
    await sheetPage.screenshot({ path: path.join(outDir, "13_sheet_insert_row.png") });

    await sheetPage.close();
    await page.close();

  } finally {
    await browser.close();
    server.close();
  }

  console.log("Audit log tóm tắt:", JSON.stringify(auditLog, null, 2));
}

runAudit().catch(err => {
  console.error("Lỗi audit:", err);
  process.exit(1);
});
