/**
 * VN Office — Live Playwright Audit: Sheet External Links Notification Bar
 *
 * Kiểm chứng:
 * 1. Thanh hiện khi tệp có liên kết ngoài (externalLinkCells > 0).
 * 2. Thanh không hiện khi tệp không có liên kết ngoài.
 * 3. Nút "Tìm hiểu thêm" mở đúng bài Help sheet.formula.externalLinks.
 * 4. Nút đóng (×) đóng thanh.
 * 5. Phím Escape đóng thanh khi focus bên trong.
 * 6. Tự ẩn khi mở tệp khác hoặc tạo tệp mới.
 * 7. Đạt chuẩn tương phản màu WCAG 2.1 AA (>= 4.5:1) ở cả chế độ Sáng và Tối.
 * 8. Responsive không tràn chiều ngang tại 1024px.
 * 9. Không có bất kỳ pageerror nào.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_EXTLINK_PORT || 8798);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

// Tạo máy chủ HTTP tĩnh phục vụ trang test
const server = http.createServer((req, res) => {
  const cleanPath = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const file = path.resolve(root, "." + requestPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return res.writeHead(404).end();
  }
  const ext = path.extname(file);
  const contentType = ext === ".css" ? "text/css" : ext === ".js" || ext === ".mjs" ? "text/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log((condition ? "PASS" : "FAIL") + "\t" + label + (detail ? " — " + detail : ""));
  if (!condition) failures.push(label + ": " + detail);
};

// Mẫu FODS thử nghiệm (không dùng tài liệu công ty)
const FODS_WITH_LINKS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
 office:version="1.3"><office:body><office:spreadsheet>
<table:table table:name="Sheet1">
  <table:table-row>
    <table:table-cell table:formula="of:=[&apos;file:///E:/Data/B.xlsx&apos;#$Sheet1.A1]" office:value-type="float" office:value="15" calcext:value-type="float"><text:p>15</text:p></table:table-cell>
    <table:table-cell table:formula="of:=SUM([&apos;file:///E:/Data/B.xlsx&apos;#$Sheet1.A1:.A3])" office:value-type="float" office:value="45" calcext:value-type="float"><text:p>45</text:p></table:table-cell>
  </table:table-row>
</table:table>
</office:spreadsheet></office:body></office:document>`;

const FODS_WITHOUT_LINKS = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:version="1.3"><office:body><office:spreadsheet>
<table:table table:name="Sheet1">
  <table:table-row>
    <table:table-cell office:value-type="float" office:value="100"><text:p>100</text:p></table:table-cell>
  </table:table-row>
</table:table>
</office:spreadsheet></office:body></office:document>`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  console.log("Đang mở VN Sheet trên Edge...");
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "networkidle" });
  await page.locator(".vno-sheet-workspace").waitFor();

  // =========================================================================
  // 1. Kiểm tra ban đầu: Trang trắng không có thanh thông báo
  // =========================================================================
  const initialBar = await page.$(".vno-notification-bar");
  assert(initialBar === null, "Trang trắng ban đầu không hiện thanh cảnh báo");

  // =========================================================================
  // 2. Mở tệp có liên kết ngoài: Thanh thông báo xuất hiện
  // =========================================================================
  await page.evaluate((xml) => {
    window.__vnoAppInstance.adapter.loadFromFods(xml);
  }, FODS_WITH_LINKS);
  await page.waitForTimeout(200);

  const barInfo = await page.evaluate(() => {
    const bar = document.querySelector(".vno-notification-bar");
    if (!bar) return null;
    const msg = bar.querySelector(".vno-notification-bar-message")?.textContent || "";
    const role = bar.getAttribute("role");
    const live = bar.getAttribute("aria-live");
    const hasIcon = Boolean(bar.querySelector(".vno-notification-bar-icon svg"));
    const actionBtn = bar.querySelector(".vno-notification-bar-action-btn");
    const closeBtn = bar.querySelector(".vno-notification-bar-close-btn");
    return {
      exists: true,
      role,
      live,
      message: msg,
      hasIcon,
      actionText: actionBtn?.textContent?.trim() || "",
      hasCloseBtn: Boolean(closeBtn)
    };
  });

  assert(barInfo && barInfo.exists, "Thanh thông báo xuất hiện khi mở tệp có liên kết ngoài");
  assert(barInfo && barInfo.role === "status", "Thanh thông báo có role='status'", `role=${barInfo?.role}`);
  assert(barInfo && barInfo.live === "polite", "Thanh thông báo có aria-live='polite'", `aria-live=${barInfo?.live}`);
  assert(barInfo && barInfo.message.includes("Tệp có 2 ô liên kết tới sổ làm việc khác"),
    "Thông điệp hiển thị đúng số ô liên kết ngoài", barInfo?.message);
  assert(barInfo && barInfo.message.includes("không tự cập nhật (ứng dụng chạy ngoại tuyến)"),
    "Thông điệp nêu rõ giá trị lưu lần cuối và chạy ngoại tuyến", barInfo?.message);
  assert(barInfo && barInfo.hasIcon, "Thanh thông báo hiển thị biểu tượng thông tin/cảnh báo");
  assert(barInfo && barInfo.actionText === "Tìm hiểu thêm", "Có nút hành động 'Tìm hiểu thêm'");
  assert(barInfo && barInfo.hasCloseBtn, "Có nút đóng (×)");

  // =========================================================================
  // 3. Kiểm tra tương phản WCAG 2.1 AA ở chế độ Sáng (Light Mode)
  // =========================================================================
  const lightContrast = await page.evaluate(async () => {
    const { getContrastRatio, meetsWcagAA } = await import("/platform/ui-kit/contrast-checker.js");
    const bar = document.querySelector(".vno-notification-bar");
    const msg = bar.querySelector(".vno-notification-bar-message");
    const btn = bar.querySelector(".vno-notification-bar-action-btn");

    const barBg = window.getComputedStyle(bar).backgroundColor;
    const msgFg = window.getComputedStyle(msg).color;
    const btnBg = window.getComputedStyle(btn).backgroundColor;
    const btnFg = window.getComputedStyle(btn).color;

    const textRatio = getContrastRatio(msgFg, barBg);
    const textPass = meetsWcagAA(msgFg, barBg);

    const btnRatio = getContrastRatio(btnFg, btnBg);
    const btnPass = meetsWcagAA(btnFg, btnBg);

    return { barBg, msgFg, textRatio, textPass, btnBg, btnFg, btnRatio, btnPass };
  });

  assert(lightContrast.textPass && lightContrast.textRatio >= 4.5,
    "Chế độ Sáng: Tương phản văn bản đạt chuẩn WCAG AA (>= 4.5:1)",
    `ratio=${lightContrast.textRatio}:1 (text=${lightContrast.msgFg}, bg=${lightContrast.barBg})`);

  assert(lightContrast.btnPass && lightContrast.btnRatio >= 4.5,
    "Chế độ Sáng: Tương phản nút hành động đạt chuẩn WCAG AA (>= 4.5:1)",
    `ratio=${lightContrast.btnRatio}:1 (text=${lightContrast.btnFg}, bg=${lightContrast.btnBg})`);

  // =========================================================================
  // 4. Kiểm tra tương phản WCAG 2.1 AA ở chế độ Tối (Dark Mode)
  // =========================================================================
  await page.evaluate(async () => {
    const { themeManager } = await import("/platform/theme/theme-manager.js");
    themeManager.setTheme("dark");
  });
  await page.waitForTimeout(150);

  const darkContrast = await page.evaluate(async () => {
    const { getContrastRatio, meetsWcagAA } = await import("/platform/ui-kit/contrast-checker.js");
    const bar = document.querySelector(".vno-notification-bar");
    const msg = bar.querySelector(".vno-notification-bar-message");
    const btn = bar.querySelector(".vno-notification-bar-action-btn");

    const barBg = window.getComputedStyle(bar).backgroundColor;
    const msgFg = window.getComputedStyle(msg).color;
    const btnBg = window.getComputedStyle(btn).backgroundColor;
    const btnFg = window.getComputedStyle(btn).color;

    const textRatio = getContrastRatio(msgFg, barBg);
    const textPass = meetsWcagAA(msgFg, barBg);

    const btnRatio = getContrastRatio(btnFg, btnBg);
    const btnPass = meetsWcagAA(btnFg, btnBg);

    return { barBg, msgFg, textRatio, textPass, btnBg, btnFg, btnRatio, btnPass };
  });

  assert(darkContrast.textPass && darkContrast.textRatio >= 4.5,
    "Chế độ Tối: Tương phản văn bản đạt chuẩn WCAG AA (>= 4.5:1)",
    `ratio=${darkContrast.textRatio}:1 (text=${darkContrast.msgFg}, bg=${darkContrast.barBg})`);

  assert(darkContrast.btnPass && darkContrast.btnRatio >= 4.5,
    "Chế độ Tối: Tương phản nút hành động đạt chuẩn WCAG AA (>= 4.5:1)",
    `ratio=${darkContrast.btnRatio}:1 (text=${darkContrast.btnFg}, bg=${darkContrast.btnBg})`);

  // Trở lại chế độ Sáng
  await page.evaluate(async () => {
    const { themeManager } = await import("/platform/theme/theme-manager.js");
    themeManager.setTheme("light");
  });
  await page.waitForTimeout(100);

  // =========================================================================
  // 5. Kiểm tra responsive: Không tràn ngang tại viewport 1024px
  // =========================================================================
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(150);

  const overflow1024 = await page.evaluate(() => {
    const bar = document.querySelector(".vno-notification-bar");
    if (!bar) return { found: false };
    const bodyWidth = document.body.clientWidth;
    return {
      found: true,
      barClientWidth: bar.clientWidth,
      barScrollWidth: bar.scrollWidth,
      bodyWidth,
      hasOverflow: bar.scrollWidth > bar.clientWidth + 1
    };
  });

  assert(!overflow1024.hasOverflow,
    "Tại 1024px: Thanh thông báo không bị tràn chiều ngang",
    `client=${overflow1024.barClientWidth}, scroll=${overflow1024.barScrollWidth}, body=${overflow1024.bodyWidth}`);

  // Phục hồi lại viewport 1440px
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(100);

  // =========================================================================
  // 6. Kiểm tra nút "Tìm hiểu thêm" mở đúng bài Help
  // =========================================================================
  await page.click(".vno-notification-bar-action-btn");
  await page.waitForTimeout(200);

  const helpOpened = await page.evaluate(() => {
    const helpPanel = document.querySelector(".vno-help-panel");
    const isOpen = helpPanel ? !helpPanel.hidden : false;
    const title = helpPanel?.querySelector(".vno-help-article h3")?.textContent || "";
    return { isOpen, title };
  });

  assert(helpOpened.isOpen, "Click nút 'Tìm hiểu thêm' mở bảng Help");
  assert(helpOpened.title.includes("Liên kết tới sổ làm việc khác"),
    "Bảng Help hiển thị đúng bài 'Liên kết tới sổ làm việc khác'", helpOpened.title);

  // Đóng Help panel để tiếp tục test
  await page.evaluate(() => {
    window.__vnoAppInstance.helpPanel?.close();
  });
  await page.waitForTimeout(100);

  // =========================================================================
  // 7. Kiểm tra nút đóng (×) đóng thanh thông báo
  // =========================================================================
  await page.click(".vno-notification-bar-close-btn");
  await page.waitForTimeout(100);

  const closedByBtn = await page.$(".vno-notification-bar");
  assert(closedByBtn === null, "Click nút đóng (×) xóa thanh thông báo khỏi giao diện");

  // =========================================================================
  // 8. Nạp lại tệp có liên kết ngoài, kiểm tra đóng bằng phím Escape
  // =========================================================================
  await page.evaluate((xml) => {
    window.__vnoAppInstance.adapter.loadFromFods(xml);
  }, FODS_WITH_LINKS);
  await page.waitForTimeout(150);

  const reloadedBar = await page.$(".vno-notification-bar");
  assert(reloadedBar !== null, "Nạp lại tệp có liên kết ngoài: thanh thông báo xuất hiện lại");

  // Focus vào nút trong thanh thông báo và nhấn Escape
  await page.focus(".vno-notification-bar-action-btn");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  const closedByEsc = await page.$(".vno-notification-bar");
  assert(closedByEsc === null, "Phím Escape đóng thanh thông báo khi đang focus bên trong");

  // =========================================================================
  // 9. Kiểm tra tự ẩn khi tạo tệp mới hoặc nạp tệp không có liên kết ngoài
  // =========================================================================
  // 9.1 Nạp lại có liên kết -> gọi newDocument() -> tự ẩn
  await page.evaluate((xml) => {
    window.__vnoAppInstance.adapter.loadFromFods(xml);
  }, FODS_WITH_LINKS);
  await page.waitForTimeout(150);

  await page.evaluate(async () => {
    await window.__vnoAppInstance.adapter.newDocument();
  });
  await page.waitForTimeout(150);

  const closedByNewDoc = await page.$(".vno-notification-bar");
  assert(closedByNewDoc === null, "Tạo tệp mới (newDocument) tự ẩn thanh thông báo");

  // 9.2 Nạp tệp không có liên kết ngoài -> không hiện thanh
  await page.evaluate((xml) => {
    window.__vnoAppInstance.adapter.loadFromFods(xml);
  }, FODS_WITHOUT_LINKS);
  await page.waitForTimeout(150);

  const noLinksBar = await page.$(".vno-notification-bar");
  assert(noLinksBar === null, "Nạp tệp không có liên kết ngoài: không hiện thanh thông báo");

  // =========================================================================
  // 10. Kiểm tra không có pageerror nào
  // =========================================================================
  assert(errors.length === 0, "Không có pageerror nào trong suốt phiên kiểm thử", JSON.stringify(errors));

  console.log("\n==================================================");
  console.log(`TỔNG KẾT LIVE AUDIT THANH LIÊN KẾT NGOÀI: ${failures.length === 0 ? "TẤT CẢ PASS" : failures.length + " THẤT BẠI"}`);
  console.log("==================================================");

} catch (error) {
  console.error("Lỗi kiểm thử Playwright:", error);
  failures.push("Playwright exception: " + error.message);
} finally {
  if (browser) await browser.close();
  server.close();
  if (failures.length > 0) {
    process.exit(1);
  }
}
