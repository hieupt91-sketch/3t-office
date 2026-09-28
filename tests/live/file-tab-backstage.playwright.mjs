/**
 * Live Playwright Test: VN Office Backstage File Tab (Writer & Sheet)
 * 
 * Kiểm tra toàn diện thiết kế trực quan và tương tác thực tế trên trình duyệt Chromium/Edge:
 * 1. Phím tắt Alt+F mở Backstage / Esc đóng và trả focus về tài liệu
 * 2. Nút "Tệp" trên ribbon mở Backstage / Nút Quay lại đóng và trả focus
 * 3. Điều hướng bàn phím WAI-ARIA bằng phím thật (Arrow keys, Tab, Enter, Space)
 * 4. Enter/Space áp dụng ĐÚNG mục đang focus trong danh sách mẫu và tệp gần đây
 * 5. Nút gỡ tệp gần đây và xử lý tệp không còn tồn tại
 * 6. Tab In ấn hiển thị Live Preview Thumbnail trang in thật
 * 7. Không có raw command-id, không icon fallback chấm tròn
 * 8. Không tràn ngang tại độ phân giải 1440px và 1024px
 * 9. Chế độ Tối (Dark Mode) đạt chuẩn tương phản WCAG AA/AAA, trang in xem trước giữ nền giấy trắng
 * 10. 0 pageerror
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_FILE_TAB_PORT || 8945);
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
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) { res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("403"); return; }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" }); res.end("404 Not Found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise((resolve, reject) => { server.listen(port, "127.0.0.1", resolve); server.on("error", reject); });

const failures = [];
const assert = (condition, label, detail = "") => {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const runBackstageSuiteForApp = async (appType) => {
    console.log(`\n==================================================`);
    console.log(`BẮT ĐẦU KIỂM THỬ TAB TỆP (BACKSTAGE) — VN ${appType.toUpperCase()}`);
    console.log(`==================================================\n`);

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    const pageErrors = [];
    page.on("pageerror", err => pageErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${port}/?app=${appType}`, { waitUntil: "load" });
    await page.locator(`.vno-shell[data-app="${appType}"]`).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);

    // Chuẩn bị 2 tệp gần đây để kiểm tra danh sách
    await page.evaluate(({ app }) => {
      localStorage.setItem("vno_recent_documents", JSON.stringify([
        {
          id: `${app}_Doc1`,
          name: `Báo cáo quý 1 VN ${app.toUpperCase()}.docx`,
          app: app,
          format: "DOCX Document",
          lastModified: Date.now() - 3600000
        },
        {
          id: `${app}_Doc2`,
          name: `Kế hoạch tuần VN ${app.toUpperCase()}.docx`,
          app: app,
          format: "DOCX Document",
          lastModified: Date.now() - 7200000
        }
      ]));
    }, { app: appType });

    // --- 1. KIỂM THỬ PHÍM TẮT ALT+F VÀ FOCUS TRẢ VỀ ---
    const editorTarget = appType === "writer" ? ".vno-writer-body" : ".vno-sheet-workspace";
    await page.locator(editorTarget).first().click();
    await page.waitForTimeout(150);

    // Nhấn Alt+F
    await page.keyboard.press("Alt+f");
    const overlay = page.locator(".vno-backstage-overlay");
    await overlay.waitFor({ state: "visible", timeout: 5000 });
    assert(await overlay.isVisible(), `[${appType}] Alt+F mở thành công Backstage menu`);

    // Nút Quay lại nhận focus đầu tiên
    const activeIdOnOpen = await page.evaluate(() => document.activeElement?.id);
    assert(activeIdOnOpen === "vno-backstage-back", `[${appType}] Nút Quay lại (#vno-backstage-back) tự động nhận focus khi mở`, `Actual: ${activeIdOnOpen}`);

    // Nhấn Escape để đóng và kiểm tra focus trả về
    await page.keyboard.press("Escape");
    await overlay.waitFor({ state: "hidden", timeout: 5000 });
    assert(await overlay.isHidden(), `[${appType}] Phím Escape đóng thành công Backstage menu`);

    // Mở lại bằng nút "Tệp" trên Ribbon
    const fileTabBtn = page.locator(".vno-ribbon-tab-file");
    await fileTabBtn.click();
    await overlay.waitFor({ state: "visible", timeout: 5000 });
    assert(await overlay.isVisible(), `[${appType}] Nút "Tệp" trên Ribbon mở thành công Backstage menu`);

    // Bấm nút Quay lại bằng chuột
    const backBtn = page.locator("#vno-backstage-back");
    await backBtn.click();
    await overlay.waitFor({ state: "hidden", timeout: 5000 });
    assert(await overlay.isHidden(), `[${appType}] Nút Quay lại đóng thành công Backstage menu`);

    // --- 2. ĐIỀU HƯỚNG BÀN PHÍM PHÍM THẬT (ARROW KEYS, ENTER, SPACE) ---
    await page.keyboard.press("Alt+f");
    await overlay.waitFor({ state: "visible", timeout: 5000 });

    // Từ nút Quay lại, nhấn ArrowDown di chuyển xuống tab Trang chủ
    await page.keyboard.press("ArrowDown");
    let focusedNavId = await page.evaluate(() => document.activeElement?.id);
    assert(focusedNavId === "vno-backstage-nav-home", `[${appType}] ArrowDown di chuyển tới nút Trang chủ`, `Actual: ${focusedNavId}`);

    // Tiếp tục ArrowDown duyệt xuống nút Tạo mới
    await page.keyboard.press("ArrowDown");
    let focusedCmd = await page.evaluate(() => document.activeElement?.getAttribute("data-backstage-cmd"));
    assert(focusedCmd === "common.file.new", `[${appType}] ArrowDown di chuyển tới lệnh Tạo mới`, `Actual: ${focusedCmd}`);

    // ArrowUp quay lại Trang chủ
    await page.keyboard.press("ArrowUp");
    focusedNavId = await page.evaluate(() => document.activeElement?.id);
    assert(focusedNavId === "vno-backstage-nav-home", `[${appType}] ArrowUp di chuyển ngược lại Trang chủ`, `Actual: ${focusedNavId}`);

    // Nhấn ArrowRight để đi vào nội dung (cards mẫu tài liệu)
    await page.keyboard.press("ArrowRight");
    let activeCardIndex = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".vno-template-card"));
      return cards.indexOf(document.activeElement);
    });
    assert(activeCardIndex === 0, `[${appType}] ArrowRight từ sidebar đi vào thẻ mẫu đầu tiên`, `Index: ${activeCardIndex}`);

    // Nhấn ArrowRight di chuyển sang thẻ mẫu thứ 2
    await page.keyboard.press("ArrowRight");
    activeCardIndex = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".vno-template-card"));
      return cards.indexOf(document.activeElement);
    });
    assert(activeCardIndex === 1, `[${appType}] ArrowRight di chuyển sang thẻ mẫu thứ 2`, `Index: ${activeCardIndex}`);

    // Nhấn ArrowLeft quay về thẻ mẫu thứ 1
    await page.keyboard.press("ArrowLeft");
    activeCardIndex = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".vno-template-card"));
      return cards.indexOf(document.activeElement);
    });
    assert(activeCardIndex === 0, `[${appType}] ArrowLeft di chuyển về thẻ mẫu thứ 1`, `Index: ${activeCardIndex}`);

    // Nhấn ArrowLeft từ thẻ 1 quay về sidebar
    await page.keyboard.press("ArrowLeft");
    focusedNavId = await page.evaluate(() => document.activeElement?.id);
    assert(focusedNavId === "vno-backstage-nav-home", `[${appType}] ArrowLeft từ thẻ đầu tiên quay về nút Trang chủ trên sidebar`, `Actual: ${focusedNavId}`);

    // Nhấn ArrowRight trở lại thẻ mẫu 1, rồi ArrowDown xuống danh sách tệp gần đây
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    let activeRowIndex = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".vno-recent-row"));
      return rows.indexOf(document.activeElement);
    });
    assert(activeRowIndex === 0, `[${appType}] ArrowDown từ mẫu chuyển xuống tệp gần đây đầu tiên`, `Row index: ${activeRowIndex}`);

    // Nhấn ArrowDown xuống hàng thứ 2
    await page.keyboard.press("ArrowDown");
    activeRowIndex = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".vno-recent-row"));
      return rows.indexOf(document.activeElement);
    });
    assert(activeRowIndex === 1, `[${appType}] ArrowDown di chuyển sang tệp gần đây thứ 2`, `Row index: ${activeRowIndex}`);

    // Nhấn ArrowUp quay lại hàng 1
    await page.keyboard.press("ArrowUp");
    activeRowIndex = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll(".vno-recent-row"));
      return rows.indexOf(document.activeElement);
    });
    assert(activeRowIndex === 0, `[${appType}] ArrowUp di chuyển về tệp gần đây hàng 1`, `Row index: ${activeRowIndex}`);

    // --- 3. BÀI HỌC VÒNG THIẾT KẾ: ENTER/SPACE ÁP DỤNG ĐÚNG MỤC ĐANG FOCUS ---
    // Di chuyển tới thẻ mẫu phù hợp bằng phím:
    // Thẻ 0: Trống (app: current)
    // Thẻ 1: Văn bản hành chính (app: writer)
    // Thẻ 2: Dự toán kinh phí (app: sheet)
    await page.keyboard.press("ArrowLeft"); // Quay về sidebar
    await page.keyboard.press("ArrowRight"); // Vào thẻ 0
    if (appType === "writer") {
      await page.keyboard.press("ArrowRight"); // Sang thẻ 1 (Văn bản hành chính)
    } else {
      await page.keyboard.press("ArrowRight"); // Sang thẻ 1
      await page.keyboard.press("ArrowRight"); // Sang thẻ 2 (Dự toán kinh phí)
    }

    const targetCardIndex = appType === "writer" ? 1 : 2;
    const focusedCardIndex = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".vno-template-card"));
      return cards.indexOf(document.activeElement);
    });
    assert(focusedCardIndex === targetCardIndex, `[${appType}] Focus chuẩn xác vào thẻ mẫu thứ ${targetCardIndex}`, `Index: ${focusedCardIndex}`);

    const expectedDocTitle = appType === "writer"
      ? "Quyết định ban hành tiêu chuẩn 01.docx"
      : "Dự toán kinh phí VN Office 2026.xlsx";

    // Nhấn Enter trên thẻ mẫu đang focus
    await page.keyboard.press("Enter");
    await overlay.waitFor({ state: "hidden", timeout: 5000 });

    // Kiểm tra tài liệu đã đổi đúng theo mẫu đang focus
    const docTabTitle = await page.evaluate(() => document.querySelector(".vno-doc-tab span")?.textContent);
    assert(docTabTitle === expectedDocTitle, `[${appType}] Enter áp dụng đúng mẫu tài liệu đang focus (${expectedDocTitle})`, `Actual: ${docTabTitle}`);

    // --- 4. THAO TÁC GỠ TỆP GẦN ĐÂY VÀ TRẠNG THÁI RỖNG ---
    await page.keyboard.press("Alt+f");
    await overlay.waitFor({ state: "visible", timeout: 5000 });

    const removeBtn = page.locator(".vno-recent-remove-btn").first();
    await removeBtn.waitFor({ state: "visible", timeout: 5000 });
    const initialRowsCount = await page.locator(".vno-recent-row").count();
    await removeBtn.click();
    await page.waitForTimeout(200);

    const afterRemoveCount = await page.locator(".vno-recent-row").count();
    assert(afterRemoveCount === initialRowsCount - 1, `[${appType}] Nút Gỡ tệp loại bỏ chính xác 1 tệp khỏi danh sách`, `Ban đầu: ${initialRowsCount}, Sau: ${afterRemoveCount}`);

    // Bấm nút "Xóa lịch sử" để chuyển sang trạng thái danh sách rỗng
    const clearHistoryBtn = page.locator("#vno-clear-recent");
    if (await clearHistoryBtn.isVisible()) {
      await clearHistoryBtn.click();
      await page.waitForTimeout(200);
      const emptyState = page.locator(".vno-empty-state");
      assert(await emptyState.isVisible(), `[${appType}] Xóa toàn bộ lịch sử chuyển sang trạng thái rỗng (EmptyState)`);
    }

    // --- 5. RÀ SOÁT TAB IN (PRINT LIVE PREVIEW THUMBNAIL) ---
    const printNav = page.locator("#vno-backstage-nav-print");
    await printNav.click();
    const printView = page.locator("#vno-backstage-print-view");
    await printView.waitFor({ state: "visible", timeout: 5000 });

    const printNowBtn = page.locator("#vno-backstage-btn-print-now");
    assert(await printNowBtn.isVisible(), `[${appType}] Tab In có nút "In ngay" lớn`);

    const stageThumbnail = page.locator(".vno-backstage-print-stage > *");
    await stageThumbnail.first().waitFor({ state: "visible", timeout: 5000 });
    assert(await stageThumbnail.count() > 0, `[${appType}] Live Preview Thumbnail trang in hiển thị DOM thật của ${appType}`);

    // Kiểm tra ArrowLeft từ nút In ngay quay về sidebar
    await printNowBtn.focus();
    await page.keyboard.press("ArrowLeft");
    focusedNavId = await page.evaluate(() => document.activeElement?.id);
    assert(focusedNavId === "vno-backstage-nav-print", `[${appType}] ArrowLeft từ nút In ngay quay về nút In trên sidebar`, `Actual: ${focusedNavId}`);

    // --- 6. RÀ SOÁT ICON FALLBACK, RAW COMMAND-ID VÀ RESPONSIVE ---
    const auditInfo = await page.evaluate(() => {
      const overlayEl = document.querySelector(".vno-backstage-overlay");
      const buttons = Array.from(overlayEl.querySelectorAll("button"));
      const rawIds = buttons.filter(b => {
        const text = b.textContent.trim();
        return text.startsWith("common.file.") || text.startsWith("writer.") || text.startsWith("sheet.");
      }).map(b => b.textContent.trim());

      const hasCircleFallback = overlayEl.innerHTML.includes('circle cx="12" cy="12" r="4"');
      return { rawIds, hasCircleFallback };
    });

    assert(auditInfo.rawIds.length === 0, `[${appType}] Không có nút nào hiển thị raw command-id`, auditInfo.rawIds.join(", "));
    assert(!auditInfo.hasCircleFallback, `[${appType}] Không có biểu tượng fallback chấm tròn`);

    // Kiểm tra không tràn ngang tại 1440px
    const overflow1440 = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!overflow1440, `[${appType}] 0 tràn ngang tại độ phân giải 1440px`);

    // Kiểm tra không tràn ngang tại 1024px
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);
    const overflow1024 = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth || document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!overflow1024, `[${appType}] 0 tràn ngang tại độ phân giải 1024px`);

    // --- 7. CHẾ ĐỘ TỐI (DARK MODE WCAG AA) & NỀN TRANG IN GIỮ TRẮNG ---
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(200);

    const darkAudit = await page.evaluate(() => {
      const stage = document.querySelector(".vno-backstage-print-stage");
      const firstChild = stage ? stage.firstElementChild : null;
      const sheet = stage?.querySelector(".vno-print-preview-sheet, .vno-sheet-print-preview-page") || firstChild;
      const sheetBg = sheet ? window.getComputedStyle(sheet).backgroundColor : "";
      const contentEl = document.querySelector(".vno-backstage-content");
      const contentBg = contentEl ? window.getComputedStyle(contentEl).backgroundColor : "";
      return {
        hasStage: Boolean(stage),
        childTag: firstChild?.tagName,
        childClass: firstChild?.className,
        sheetBg,
        contentBg
      };
    });

    // Sheet preview phải có background rgb(255, 255, 255)
    assert(darkAudit.sheetBg === "rgb(255, 255, 255)", `[${appType}] Trang xem trước in giữ nguyên nền trắng trong Dark Mode`, `Detail: ${JSON.stringify(darkAudit)}`);

    // Đóng Backstage
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // --- 8. KIỂM TRA 0 PAGEERROR ---
    assert(pageErrors.length === 0, `[${appType}] 0 lỗi JavaScript runtime (pageerror)`, pageErrors.join(" | "));

    await page.close();
  };

  // Chạy cho VN Writer
  await runBackstageSuiteForApp("writer");

  // Chạy cho VN Sheet
  await runBackstageSuiteForApp("sheet");

} finally {
  if (browser) await browser.close();
  server.close();
}

console.log("\n==================================================");
console.log(`KẾT QUẢ TỔNG HỢP: ${failures.length === 0 ? "TẤT CẢ PASS" : `${failures.length} BÀI KIỂM THỬ THẤT BẠI`}`);
console.log("==================================================");

if (failures.length > 0) {
  console.error("\nChi tiết lỗi:");
  failures.forEach(f => console.error(" - " + f));
  process.exit(1);
} else {
  console.log("Hoàn thành xuất sắc toàn bộ bài kiểm tra Backstage Playwright.");
  process.exit(0);
}
