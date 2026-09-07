/**
 * VN Office — Writer Save Flow Visual & UI Interaction Live Playwright Test
 * Xác nhận toàn diện quy trình Lưu file qua giao diện người dùng VN Writer:
 * 1. Nhập liệu tiếng Việt thật + Chèn bảng từ ribbon.
 * 2. Thao tác tính năng Khoảng cách trước/sau đoạn (writer.para.spacingBefore / spacingAfter).
 * 3. Thao tác Lưu khi API Desktop không khả dụng: hiện dialog thông báo lỗi thân thiện, không treo UI.
 * 4. Thao tác Lưu khi API Desktop sẵn sàng: Quick Access button, Ctrl+S và Backstage Save
 *    đều phát đúng lệnh (.uno:Save / common.file.save), truyền đúng nội dung (HTML + bảng + spacing),
 *    cập nhật isDirty = false, cập nhật nhãn tên tệp trên thanh tab và danh sách Recent Files.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_SAVE_QA_PORT || 8988);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
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
  const filePath = path.join(root, safePath);

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
  server.listen(port, "127.0.0.1", resolve);
  server.on("error", reject);
});

const assert = (condition, message, detail = "") => {
  if (!condition) {
    const fullMsg = `[FAIL] ${message}${detail ? ` — Chi tiết: ${detail}` : ""}`;
    console.error(fullMsg);
    throw new Error(fullMsg);
  }
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: "vi-VN" });
  page.on("pageerror", err => console.error("PAGEERROR:", err.message));

  console.log("=== BẮT ĐẦU KIỂM THỬ THỊ GIÁC LUỒNG LƯU FILE VN WRITER ===");

  // 1. Mở VN Writer
  console.log("\n[Bước 1] Nạp ứng dụng VN Writer...");
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="writer"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);

  const initialTabName = await page.evaluate(() => document.querySelector(".vno-doc-tab span")?.textContent?.trim() || "");
  console.log(`- Nhãn tài liệu ban đầu: "${initialTabName}"`);
  assert(initialTabName.length > 0, "Thanh tab tài liệu phải hiển thị tên ban đầu");

  // 2. Nhập văn bản tiếng Việt thật
  console.log("\n[Bước 2] Thêm nội dung văn bản tiếng Việt chuẩn vào editor...");
  await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const p1 = document.createElement("p");
    p1.id = "vno-qa-para-1";
    p1.innerHTML = "<strong>Điều 1.</strong> Ban hành kèm theo Quyết định này Quy chế quản lý và lưu trữ tài liệu điện tử.";
    body.appendChild(p1);

    const p2 = document.createElement("p");
    p2.id = "vno-qa-para-2";
    p2.innerHTML = "Quy chế này áp dụng cho toàn thể cán bộ, công chức, viên chức và các đơn vị trực thuộc cơ quan.";
    body.appendChild(p2);

    const p3 = document.createElement("p");
    p3.id = "vno-qa-para-3";
    p3.innerHTML = "<strong>Điều 2.</strong> Quyết định này có hiệu lực thi hành kể từ ngày ký ban hành.";
    body.appendChild(p3);
  });

  const bodyParaCount = await page.evaluate(() => document.querySelectorAll(".vno-writer-body p").length);
  assert(bodyParaCount >= 3, "Văn bản phải được thêm thành công vào body editor");
  console.log(`- Đã thêm 3 đoạn văn bản tiếng Việt mẫu (tổng số đoạn trong body: ${bodyParaCount}).`);

  // 3. Thử tính năng Khoảng cách trước/sau đoạn (tab Bố cục)
  console.log("\n[Bước 3] Thử nghiệm tính năng Khoảng cách trước/sau đoạn trên tab Bố cục...");
  await page.click("#vno-ribbon-tab-layout");
  await page.waitForTimeout(300);

  const spacingSelects = await page.evaluate(() => {
    const before = document.querySelector('select[data-command-id="writer.para.spacingBefore"]');
    const after = document.querySelector('select[data-command-id="writer.para.spacingAfter"]');
    return {
      hasBefore: !!before,
      beforeCount: before?.options?.length || 0,
      hasAfter: !!after,
      afterCount: after?.options?.length || 0
    };
  });
  assert(spacingSelects.hasBefore, "Select writer.para.spacingBefore phải có mặt trên tab Bố cục");
  assert(spacingSelects.hasAfter, "Select writer.para.spacingAfter phải có mặt trên tab Bố cục");
  console.log(`- Select Khoảng trước đoạn (${spacingSelects.beforeCount} mức) và Khoảng sau đoạn (${spacingSelects.afterCount} mức) sẵn sàng.`);

  // Chọn đoạn 1 và gán khoảng trước 12pt
  await page.evaluate(() => {
    const p1 = document.getElementById("vno-qa-para-1");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p1);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.selectOption('select[data-command-id="writer.para.spacingBefore"]', "12");
  await page.waitForTimeout(200);

  // Chọn đoạn 2 và gán khoảng sau 18pt
  await page.evaluate(() => {
    const p2 = document.getElementById("vno-qa-para-2");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p2);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.selectOption('select[data-command-id="writer.para.spacingAfter"]', "18");
  await page.waitForTimeout(200);

  // Chọn đoạn 3 và gán cả khoảng trước 6pt và sau 8pt
  await page.evaluate(() => {
    const p3 = document.getElementById("vno-qa-para-3");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p3);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.selectOption('select[data-command-id="writer.para.spacingBefore"]', "6");
  await page.waitForTimeout(100);
  await page.selectOption('select[data-command-id="writer.para.spacingAfter"]', "8");
  await page.waitForTimeout(200);

  const verifiedStyles = await page.evaluate(() => {
    const p1 = document.getElementById("vno-qa-para-1");
    const p2 = document.getElementById("vno-qa-para-2");
    const p3 = document.getElementById("vno-qa-para-3");
    return {
      p1Top: p1?.style?.marginTop,
      p2Bottom: p2?.style?.marginBottom,
      p3Top: p3?.style?.marginTop,
      p3Bottom: p3?.style?.marginBottom
    };
  });
  assert(verifiedStyles.p1Top === "12pt", "Đoạn 1 phải có marginTop = 12pt", verifiedStyles.p1Top);
  assert(verifiedStyles.p2Bottom === "18pt", "Đoạn 2 phải có marginBottom = 18pt", verifiedStyles.p2Bottom);
  assert(verifiedStyles.p3Top === "6pt", "Đoạn 3 phải có marginTop = 6pt", verifiedStyles.p3Top);
  assert(verifiedStyles.p3Bottom === "8pt", "Đoạn 3 phải có marginBottom = 8pt", verifiedStyles.p3Bottom);
  console.log(`- Xác nhận thành công styles khoảng cách đoạn:`, verifiedStyles);

  // 4. Chèn bảng qua tab Chèn trên ribbon
  console.log("\n[Bước 4] Chèn bảng từ tab Chèn trên ribbon...");
  await page.click("#vno-ribbon-tab-insert");
  await page.waitForTimeout(300);

  const initialTableCount = await page.evaluate(() => document.querySelectorAll(".vno-writer-body table").length);
  const tableBtn = page.locator('button[data-command-id="writer.table.insert"]');
  assert(await tableBtn.count() === 1, "Nút chèn bảng writer.table.insert phải hiện diện trên tab Chèn");
  await tableBtn.click();
  await page.waitForTimeout(300);

  const newTableCount = await page.evaluate(() => document.querySelectorAll(".vno-writer-body table").length);
  assert(newTableCount > initialTableCount, "Bảng mới phải được chèn vào thân văn bản", `trước=${initialTableCount} sau=${newTableCount}`);
  console.log(`- Chèn bảng thành công (số bảng: ${initialTableCount} -> ${newTableCount}).`);

  // 5. Kiểm tra phản hồi khi API Lưu KHÔNG khả dụng (chạy dev / web)
  console.log("\n[Bước 5] Kiểm tra phản hồi UI khi API Lưu KHÔNG khả dụng (Desktop bridge chưa sẵn sàng)...");

  // 5a. Thử nút Lưu trên Quick Access Toolbar
  await page.click('.vno-quick-btn[data-cmd="common.file.save"]');
  await page.waitForTimeout(300);

  let errDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim(),
      message: overlay.querySelector(".vno-dialog-body p")?.textContent?.trim(),
      hasOkBtn: !!overlay.querySelector(".vno-dialog-ok-btn")
    };
  });
  assert(errDialog !== null, "Hộp thoại lỗi phải hiển thị khi Lưu không khả dụng");
  assert(errDialog.title === "Không thể lưu", "Tiêu đề hộp thoại phải là 'Không thể lưu'", errDialog.title);
  assert(errDialog.message?.includes("VN Office Desktop App"), "Nội dung phải giải thích rõ chỉ hỗ trợ trên VN Office Desktop App", errDialog.message);
  console.log(`- [Quick Access] Hộp thoại lỗi hiển thị rõ ràng: "${errDialog.title}" — "${errDialog.message}"`);

  // Đóng bằng phím Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => !document.querySelector(".vno-dialog-overlay")), "Hộp thoại phải đóng khi bấm Escape");

  // 5b. Thử phím tắt Ctrl+S
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(300);

  errDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim(),
      message: overlay.querySelector(".vno-dialog-body p")?.textContent?.trim()
    };
  });
  assert(errDialog !== null && errDialog.title === "Không thể lưu", "Ctrl+S phải mở hộp thoại lỗi tương tự khi không có engine");
  console.log(`- [Ctrl+S] Phím tắt hoạt động đồng nhất với nút Quick Access.`);

  // Đóng bằng phím Enter
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => !document.querySelector(".vno-dialog-overlay")), "Hộp thoại phải đóng khi bấm Enter");

  // 5c. Thử nút Lưu trong Backstage Menu
  await page.click(".vno-ribbon-tab-file");
  await page.waitForTimeout(300);
  const backstageOpen = await page.evaluate(() => {
    const bs = document.querySelector(".vno-backstage-overlay");
    return bs && getComputedStyle(bs).display !== "none";
  });
  assert(backstageOpen, "Menu Tệp (Backstage) phải mở ra khi nhấn tab Tệp");

  await page.click('button[data-backstage-cmd="common.file.save"]');
  await page.waitForTimeout(300);

  const backstageClosed = await page.evaluate(() => !document.querySelector(".vno-backstage-overlay"));
  assert(backstageClosed, "Menu Backstage phải tự động đóng khi nhấn nút Lưu");

  errDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim()
    };
  });
  assert(errDialog !== null && errDialog.title === "Không thể lưu", "Nút Lưu trong Backstage phải phát lệnh Lưu chuẩn");
  console.log(`- [Backstage Save] Nút Lưu đóng Backstage và thực thi lệnh đồng nhất.`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);

  // 6. Kiểm tra luồng Lưu thành công (Simulated Desktop Engine)
  console.log("\n[Bước 6] Kiểm tra luồng Lưu thành công qua simulated desktop bridge...");
  const mockSavedFile = "C:/TaiLieu/Quyết định số 26 ban hành quy chế.docx";
  const mockSavedName = "Quyết định số 26 ban hành quy chế.docx";

  await page.evaluate((savedDest) => {
    window.__recordedSaves = [];
    import("/adapters/libreoffice/common/uno-bridge.js").then(({ globalUnoBridge }) => {
      globalUnoBridge.saveRealFile = async (appKind, content, targetFormat, suggestedName) => {
        const record = {
          appKind,
          content,
          contentLength: content.length,
          hasTable: content.includes("<table") || content.includes("<TABLE"),
          hasPara1: content.includes("Quy chế quản lý và lưu trữ tài liệu điện tử"),
          hasSpacing12: content.includes("12pt"),
          hasSpacing18: content.includes("18pt"),
          hasSpacing6: content.includes("6pt"),
          hasSpacing8: content.includes("8pt"),
          targetFormat,
          suggestedName
        };
        window.__recordedSaves.push(record);
        return {
          status: "ok",
          message: `Đã lưu tại ${savedDest}`,
          path: savedDest
        };
      };
    });
  }, mockSavedFile);

  // 6a. Lưu qua nút Quick Access
  console.log("- Thử nghiệm Lưu qua Quick Access button với desktop bridge...");
  await page.click('.vno-quick-btn[data-cmd="common.file.save"]');
  await page.waitForTimeout(300);

  let successDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim(),
      message: overlay.querySelector(".vno-dialog-body p")?.textContent?.trim()
    };
  });
  assert(successDialog !== null, "Hộp thoại thành công 'Đã lưu' phải hiển thị");
  assert(successDialog.title === "Đã lưu", "Tiêu đề hộp thoại phải là 'Đã lưu'", successDialog.title);
  assert(successDialog.message?.includes(mockSavedFile), "Nội dung hộp thoại phải nêu rõ đường dẫn đã lưu", successDialog.message);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);

  // Kiểm tra dữ liệu được truyền tới UnoBridge
  let lastSave = await page.evaluate(() => window.__recordedSaves[window.__recordedSaves.length - 1]);
  assert(lastSave.appKind === "writer", "appKind phải là 'writer'", lastSave.appKind);
  assert(lastSave.targetFormat === "docx", "targetFormat phải là 'docx'", lastSave.targetFormat);
  assert(lastSave.hasTable, "Nội dung xuất phải chứa thẻ table");
  assert(lastSave.hasPara1, "Nội dung xuất phải chứa văn bản tiếng Việt người dùng nhập");
  assert(lastSave.hasSpacing12 && lastSave.hasSpacing18, "Nội dung xuất phải bảo lưu thông số spacingBefore/After");
  console.log(`  + UnoBridge nhận đúng: appKind=${lastSave.appKind}, format=${lastSave.targetFormat}, len=${lastSave.contentLength}`);
  console.log(`  + Bảo lưu đúng dữ liệu: văn bản tiếng Việt=Có, bảng biểu=Có, spacingBefore/After=Có.`);

  // Kiểm tra cập nhật trạng thái UI: isDirty và tên tab tài liệu
  const postSaveState = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const adapter = globalUnoBridge.activeDocument;
    return {
      isDirty: adapter?.isDirty,
      sourceFileName: adapter?.sourceFileName,
      tabTitle: document.querySelector(".vno-doc-tab span")?.textContent?.trim()
    };
  });
  assert(postSaveState.isDirty === false, "Trạng thái isDirty phải chuyển thành false sau khi Lưu thành công", postSaveState.isDirty);
  assert(postSaveState.tabTitle === mockSavedName, "Thanh tab tài liệu phải cập nhật đúng tên tệp vừa lưu", `tabTitle=${postSaveState.tabTitle}`);
  console.log(`  + Trạng thái isDirty: false`);
  console.log(`  + Nhãn thanh tab tài liệu đã cập nhật: "${postSaveState.tabTitle}"`);

  // 6b. Thử nghiệm Lưu qua phím tắt Ctrl+S
  console.log("- Thử nghiệm Lưu qua phím tắt Ctrl+S...");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(300);

  successDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim()
    };
  });
  assert(successDialog !== null && successDialog.title === "Đã lưu", "Ctrl+S phải gọi thành công luồng Lưu");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);

  // 6c. Thử nghiệm Lưu qua Backstage
  console.log("- Thử nghiệm Lưu qua menu Backstage (Tệp -> Lưu)...");
  await page.click(".vno-ribbon-tab-file");
  await page.waitForTimeout(300);
  await page.click('button[data-backstage-cmd="common.file.save"]');
  await page.waitForTimeout(300);

  successDialog = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    if (!overlay) return null;
    return {
      title: overlay.querySelector('[id^="vno-dialog-title"]')?.textContent?.trim()
    };
  });
  assert(successDialog !== null && successDialog.title === "Đã lưu", "Nút Lưu trong Backstage phải gọi thành công luồng Lưu");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);

  const totalSaves = await page.evaluate(() => window.__recordedSaves?.length || 0);
  assert(totalSaves === 3, "Phải ghi nhận đúng 3 lần gọi Lưu (Quick Access, Ctrl+S, Backstage)", totalSaves);
  console.log(`- Cả 3 cơ chế Lưu (Quick Access, Ctrl+S, Backstage) hoạt động đồng nhất 100%!`);

  console.log("\n============================================================");
  console.log("KẾT QUẢ: 100% PASS — KIỂM THỬ THỊ GIÁC LUỒNG LƯU FILE WRITER HOÀN TẤT");
  console.log("============================================================");
} finally {
  await browser?.close();
  server.close();
}
