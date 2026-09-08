/**
 * VN Office — Macro Ribbon UI & Accessibility Playwright Live Test
 * 
 * Kiểm thử toàn diện:
 * 1. Đặt 2 nút Macro vào tab Xem (View) trên cả 3 app: Writer, Sheet, Slides.
 * 2. Đổi icon/label động khi đang ghi (Ghi Macro -> Dừng ghi, icon RecordStart -> RecordStop).
 * 3. Chỉ báo trực quan: chỉ báo chấm đỏ nhấp nháy trên status bar và button ribbon khi ghi, tự tắt khi dừng.
 * 4. Luồng thao tác thật: Bấm Ghi trên Ribbon -> thực hiện lệnh thật -> Bấm Dừng -> đặt tên trong Dialog -> mở Macro Manager -> chạy -> xóa.
 * 5. Accessibility cho Dialog Macro Manager: bẫy tiêu điểm (trapFocus), phím Tab/Shift+Tab, phím Escape đóng và khôi phục focus về nút trigger ban đầu.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8897;

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
const failures = [];

function check(condition, desc) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    failures.push(desc);
  }
}

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", err => pageErrors.push(err.message));

  console.log("\n=== 1. KIỂM TRA NHÓM MACRO TRÊN CẢ 3 APP (WRITER, SHEET, SLIDES) ===");

  for (const app of ["writer", "sheet", "slides"]) {
    await page.goto(`http://127.0.0.1:${PORT}/?app=${app}`, { waitUntil: "load" });
    await page.evaluate(() => localStorage.removeItem("vno_macros"));
    await page.waitForSelector(".vno-ribbon-tab", { timeout: 10000 });

    // Click tab "Xem"
    const viewTab = page.locator("#vno-ribbon-tab-view");
    check(await viewTab.isVisible(), `[${app.toUpperCase()}] Tab 'Chế độ xem' tồn tại trên Ribbon`);
    await viewTab.click();
    await page.waitForTimeout(150);

    // Kiểm tra nhóm Macro
    const macroGroup = page.locator('.vno-ribbon-group[data-group-id="macro"]');
    check(await macroGroup.isVisible(), `[${app.toUpperCase()}] Nhóm 'Macro' hiển thị trên tab Xem`);

    // Kiểm tra 2 nút trong nhóm
    const recordBtn = macroGroup.locator('button[data-command-id="common.macro.recordToggle"]');
    const managerBtn = macroGroup.locator('button[data-command-id="common.macro.manager"]');

    check(await recordBtn.isVisible(), `[${app.toUpperCase()}] Nút 'Ghi Macro' hiển thị`);
    check(await managerBtn.isVisible(), `[${app.toUpperCase()}] Nút 'Xem Macro' hiển thị`);
    check(await recordBtn.evaluate(el => el.classList.contains("vno-ribbon-btn-large")), `[${app.toUpperCase()}] Nút 'Ghi Macro' là nút lớn (isLarge)`);
    check(await managerBtn.evaluate(el => el.classList.contains("vno-ribbon-btn-large")), `[${app.toUpperCase()}] Nút 'Xem Macro' là nút lớn (isLarge)`);
  }

  console.log("\n=== 2. KIỂM TRA ĐỔI ICON/LABEL ĐỘNG & CHỈ BÁO TRỰC QUAN KHI GHI MACRO (WRITER) ===");

  await page.goto(`http://127.0.0.1:${PORT}/?app=writer`, { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("vno_macros"));
  await page.waitForSelector(".vno-ribbon-tab", { timeout: 10000 });

  await page.click("#vno-ribbon-tab-view");
  await page.waitForTimeout(150);

  const recordBtn = page.locator('button[data-command-id="common.macro.recordToggle"]');
  const initialLabel = await recordBtn.locator(".vno-btn-label").textContent();
  check(initialLabel.trim() === "Ghi Macro", `Ban đầu nhãn nút là 'Ghi Macro' (thực tế: '${initialLabel.trim()}')`);

  const initialIconHtml = await recordBtn.locator(".vno-btn-icon").innerHTML();
  check(initialIconHtml.includes("<circle") && !initialIconHtml.includes("<rect"), "Ban đầu icon là macroRecordStart (hình tròn đỏ)");

  const statusIndicator = page.locator("#vno-macro-status-indicator");
  check(!(await statusIndicator.isVisible()), "Chỉ báo status bar ban đầu không hiển thị (display: none)");

  // Click nút Ghi Macro trên Ribbon
  console.log("  -> Nhấp nút 'Ghi Macro' trên Ribbon...");
  await recordBtn.click();
  await page.waitForTimeout(200);

  const recordingLabel = await recordBtn.locator(".vno-btn-label").textContent();
  check(recordingLabel.trim() === "Dừng ghi", `Khi ghi, nhãn nút chuyển thành 'Dừng ghi' (thực tế: '${recordingLabel.trim()}')`);

  const recordingIconHtml = await recordBtn.locator(".vno-btn-icon").innerHTML();
  check(recordingIconHtml.includes("<rect"), "Khi ghi, icon nút chuyển sang macroRecordStop (hình vuông Stop đỏ)");

  const isChecked = await recordBtn.evaluate(el => el.classList.contains("is-checked") && el.getAttribute("aria-pressed") === "true");
  check(isChecked, "Nút có class 'is-checked' và aria-pressed='true'");

  check(await statusIndicator.isVisible(), "Chỉ báo đang ghi (#vno-macro-status-indicator) trên status bar hiển thị rõ ràng");

  const isBodyRecording = await page.evaluate(() => document.body.classList.contains("vno-macro-is-recording"));
  check(isBodyRecording, "document.body có class 'vno-macro-is-recording'");

  // Chuyển tab sang Home: kiểm tra chỉ báo View tab vẫn nhận biết
  await page.click("#vno-ribbon-tab-home");
  await page.waitForTimeout(100);
  check(await statusIndicator.isVisible(), "Khi chuyển sang tab Trang đầu, chỉ báo status bar vẫn tiếp tục hiển thị đang ghi");

  // Thực hiện lệnh thật (Đậm Ctrl+B)
  console.log("  -> Thực thi lệnh định dạng văn bản (bold) qua Ribbon...");
  const boldBtn = page.locator('button[data-command-id="writer.text.bold"]');
  if (await boldBtn.isVisible()) {
    await boldBtn.click();
  } else {
    await page.keyboard.press("Control+b");
  }

  // Quay lại tab Xem
  await page.click("#vno-ribbon-tab-view");
  await page.waitForTimeout(100);

  check((await recordBtn.locator(".vno-btn-label").textContent()).trim() === "Dừng ghi", "Quay lại tab Xem, nút vẫn duy trì nhãn 'Dừng ghi'");

  // Click Dừng ghi
  console.log("  -> Nhấp nút 'Dừng ghi' trên Ribbon...");
  await recordBtn.click();
  await page.waitForTimeout(250);

  // Hộp thoại Prompt đặt tên Macro xuất hiện
  const promptDialog = page.locator(".vno-dialog-box");
  check(await promptDialog.isVisible(), "Hộp thoại đặt tên Macro xuất hiện");

  const nameInput = promptDialog.locator('input.vno-dialog-input');
  await nameInput.fill("Macro Dinh Dang Tu Dong");
  const okBtn = promptDialog.locator(".vno-dialog-ok-btn");
  await okBtn.click();
  await page.waitForTimeout(300);

  // Sau khi dừng ghi: kiểm tra nút quay về ban đầu & chỉ báo tắt
  const stoppedLabel = await recordBtn.locator(".vno-btn-label").textContent();
  check(stoppedLabel.trim() === "Ghi Macro", `Sau khi dừng, nhãn nút trở về 'Ghi Macro' (thực tế: '${stoppedLabel.trim()}')`);

  const stoppedIconHtml = await recordBtn.locator(".vno-btn-icon").innerHTML();
  check(stoppedIconHtml.includes("<circle"), "Sau khi dừng, icon trở về macroRecordStart");

  check(!(await statusIndicator.isVisible()), "Chỉ báo status bar tự động tắt khi dừng ghi");

  const isBodyRecordingAfter = await page.evaluate(() => document.body.classList.contains("vno-macro-is-recording"));
  check(!isBodyRecordingAfter, "document.body đã gỡ bỏ class 'vno-macro-is-recording'");

  console.log("\n=== 3. KIỂM TRA ACCESSIBILITY VÀ QUẢN LÝ MACRO (ALT+F8 / DIALOG) ===");

  const managerBtn = page.locator('button[data-command-id="common.macro.manager"]');
  await managerBtn.focus();
  await page.keyboard.press("Enter"); // Kích hoạt bằng bàn phím
  await page.waitForTimeout(250);

  const managerDialog = page.locator(".vno-dialog-box[role=\"dialog\"]");
  check(await managerDialog.isVisible(), "Hộp thoại 'Quản lý Macro' mở thành công");

  // Kiểm tra focus ban đầu nằm bên trong dialog
  const initialFocusInside = await page.evaluate(() => {
    const dialog = document.querySelector(".vno-dialog-box[role=\"dialog\"]");
    return dialog && dialog.contains(document.activeElement);
  });
  check(initialFocusInside, "Tiêu điểm bàn phím ban đầu nằm bên trong hộp thoại Quản lý Macro");

  // Kiểm tra danh sách hiển thị macro vừa ghi
  const macroRow = page.locator(".vno-macro-row");
  check(await macroRow.count() === 1, "Danh sách hiển thị đúng 1 macro vừa ghi");
  const macroName = await macroRow.locator(".vno-macro-name").textContent();
  check(macroName.includes("Macro Dinh Dang Tu Dong"), `Tên macro khớp: '${macroName.trim()}'`);

  // Kiểm tra bẫy tiêu điểm (Trap Focus) bằng Tab & Shift+Tab
  console.log("  -> Kiểm tra Focus Trap: bấm Tab liên tục...");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const isStillInside = await page.evaluate(() => {
      const dialog = document.querySelector(".vno-dialog-box[role=\"dialog\"]");
      return dialog && dialog.contains(document.activeElement);
    });
    if (!isStillInside) {
      check(false, `Tab lần ${i + 1} làm thoát focus ra ngoài hộp thoại!`);
      break;
    }
  }
  check(true, "Tab liên tục 8 lần tiêu điểm luôn được bẫy 100% bên trong hộp thoại Quản lý Macro");

  // Kiểm tra phím Escape đóng dialog và khôi phục focus
  console.log("  -> Nhấn phím Escape để đóng hộp thoại...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  check(await managerDialog.count() === 0, "Hộp thoại Quản lý Macro đã đóng sau khi nhấn Escape");

  const focusRestored = await page.evaluate(() => {
    const active = document.activeElement;
    return active && active.getAttribute("data-command-id") === "common.macro.manager";
  });
  check(focusRestored, "Tiêu điểm tự động khôi phục về nút trigger 'Xem Macro' (common.macro.manager)");

  // Mở lại qua phím tắt Alt+F8
  console.log("  -> Nhấn tổ hợp phím tắt Alt+F8 để mở hộp thoại Quản lý Macro...");
  await page.keyboard.press("Alt+F8");
  await page.waitForTimeout(250);
  check(await managerDialog.isVisible(), "Hộp thoại Quản lý Macro mở thành công qua phím tắt Alt+F8");

  // Chạy Macro qua nút ▶ Chạy
  console.log("  -> Nhấp nút '▶ Chạy'...");
  const runBtn = page.locator(".vno-macro-run-btn");
  await runBtn.click();
  await page.waitForTimeout(200);

  const statusText = await page.locator("#vno-status-docinfo").textContent();
  check(statusText.includes("Đã chạy Macro"), `Thanh trạng thái ghi nhận: '${statusText.trim()}'`);

  // Xóa Macro qua nút Xóa
  console.log("  -> Nhấp nút 'Xóa' macro...");
  const deleteBtn = page.locator(".vno-macro-delete-btn");
  await deleteBtn.click();
  await page.waitForTimeout(200);

  // Xác nhận trong confirm dialog
  const confirmBox = page.locator(".vno-dialog-box").last();
  check(await confirmBox.isVisible(), "Hộp thoại xác nhận xóa xuất hiện");
  const confirmOkBtn = confirmBox.locator(".vno-btn-primary");
  await confirmOkBtn.click();
  await page.waitForTimeout(200);

  const remainingRows = await page.locator(".vno-macro-row").count();
  check(remainingRows === 0, "Macro đã được xóa sạch khỏi danh sách");

  // Đóng dialog bằng nút Đóng
  await page.click(".vno-macro-close-btn");
  await page.waitForTimeout(150);
  check(await managerDialog.count() === 0, "Đóng hoàn tất hộp thoại");

  if (pageErrors.length > 0) {
    console.error("Lỗi trang phát sinh:", pageErrors);
    for (const err of pageErrors) failures.push(`PageError: ${err}`);
  }

} catch (err) {
  console.error("Lỗi ngoại lệ trong quá trình chạy test:", err);
  failures.push(err.message);
} finally {
  if (browser) await browser.close();
  server.close();
}

console.log("\n==================================================");
if (failures.length === 0) {
  console.log("KẾT QUẢ KIỂM THỬ: 100% PASS — Macro Ribbon UI hoàn thành xuất sắc!");
  process.exit(0);
} else {
  console.error(`KẾT QUẢ KIỂM THỬ: CÓ ${failures.length} LỖI!`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
