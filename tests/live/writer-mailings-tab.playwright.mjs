import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_MAILINGS_PORT || 8796);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = http.createServer((req, res) => {
  const cleanPath = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const file = path.resolve(root, "." + requestPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, {
    "Content-Type": path.extname(file) === ".css" ? "text/css" : path.extname(file) === ".js" ? "text/javascript" : "text/html"
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log((condition ? "PASS" : "FAIL") + "\t" + label + (detail ? " — " + detail : ""));
  if (!condition) failures.push(label + ": " + detail);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-page").waitFor();

  // 1. Chuyển sang tab Trộn thư
  await page.click("#vno-ribbon-tab-mailings");
  await page.waitForTimeout(200);

  // 2. Rà soát trực quan Ribbon tab Trộn thư tại 1440px
  const ribbonAudit = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const tabpanel = document.querySelector("#vno-ribbon-tabpanel-mailings");
    const ribbonEl = document.querySelector(".vno-ribbon");
    if (!tabpanel) return { found: false };

    const groups = Array.from(tabpanel.querySelectorAll(".vno-ribbon-group"));
    const items = Array.from(tabpanel.querySelectorAll("button, select"));

    const itemDetails = items.map(el => {
      const isSelect = el.tagName.toLowerCase() === "select";
      const cmdId = el.getAttribute("data-command-id");
      const label = isSelect
        ? el.getAttribute("aria-label")
        : (el.querySelector(".vno-btn-label")?.textContent.trim() || el.getAttribute("aria-label") || el.textContent.trim());
      const iconSpan = el.querySelector(".vno-btn-icon");
      const hasCircleFallback = iconSpan ? iconSpan.innerHTML.includes('circle cx="12" cy="12" r="4"') : false;
      const hasHandler = cmdId ? Boolean(globalCommandBus._handlers?.get(cmdId)) : false;
      const isRawId = label && (label.startsWith("writer.") || label.startsWith("common."));
      return {
        tag: el.tagName,
        cmdId,
        label,
        hasCircleFallback,
        hasHandler,
        isRawId
      };
    });

    const groupLayout = groups.map(g => {
      const rect = g.getBoundingClientRect();
      const labelEl = g.querySelector(".vno-ribbon-group-label");
      const labelRect = labelEl?.getBoundingClientRect();
      const itemsEl = g.querySelector(".vno-ribbon-group-items");
      const itemsRect = itemsEl?.getBoundingClientRect();
      return {
        id: g.dataset.groupId,
        height: Math.round(rect.height),
        itemsHeight: Math.round(itemsRect?.height || 0),
        labelTop: Math.round(labelRect?.top || 0),
        labelBottom: Math.round(labelRect?.bottom || 0),
        panelBottom: Math.round(tabpanel.getBoundingClientRect().bottom)
      };
    });

    return {
      found: true,
      count: items.length,
      hasOverflow: (ribbonEl.scrollWidth > ribbonEl.clientWidth) || (tabpanel.scrollWidth > tabpanel.clientWidth),
      clientWidth: ribbonEl.clientWidth,
      scrollWidth: ribbonEl.scrollWidth,
      itemDetails,
      groupLayout
    };
  });

  assert(ribbonAudit.found, "Tab Trộn thư được render trong DOM", JSON.stringify(ribbonAudit));
  assert(ribbonAudit.count === 8, "Tab Trộn thư có đủ 8 controls/buttons", `Count: ${ribbonAudit.count}`);
  assert(!ribbonAudit.hasOverflow, "Ribbon tab Trộn thư không tràn ngang ở 1440px", `client=${ribbonAudit.clientWidth}, scroll=${ribbonAudit.scrollWidth}`);

  // Kiểm tra 0 raw ID
  const rawIdItems = ribbonAudit.itemDetails.filter(i => i.isRawId);
  assert(rawIdItems.length === 0, "100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id", JSON.stringify(rawIdItems));

  // Kiểm tra 0 icon fallback chấm tròn
  const circleFallbackItems = ribbonAudit.itemDetails.filter(i => i.hasCircleFallback);
  assert(circleFallbackItems.length === 0, "100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen", JSON.stringify(circleFallbackItems));

  // Kiểm tra 100% nút có handler
  const unhandledItems = ribbonAudit.itemDetails.filter(i => !i.hasHandler);
  assert(unhandledItems.length === 0, "100% controls trên tab Trộn thư có live handler đăng ký trong CommandBus", JSON.stringify(unhandledItems));

  // Kiểm tra bố cục nhóm Ribbon
  const all72px = ribbonAudit.groupLayout.every(g => g.itemsHeight === 72);
  assert(all72px, "Mọi nhóm trên tab Trộn thư có items height chuẩn 72px", JSON.stringify(ribbonAudit.groupLayout));

  const labelTops = ribbonAudit.groupLayout.map(g => g.labelTop);
  const maxDiff = Math.max(...labelTops) - Math.min(...labelTops);
  assert(maxDiff <= 1, "Mọi nhãn nhóm nằm thẳng hàng trên cùng một baseline (maxDiff <= 1px)", `maxDiff=${maxDiff}px`);

  const noBottomOverlap = ribbonAudit.groupLayout.every(g => g.labelBottom <= g.panelBottom);
  assert(noBottomOverlap, "Không có nhãn nhóm nào bị đè hoặc chạm mép dưới ribbon", JSON.stringify(ribbonAudit.groupLayout));

  // 3. Responsive 1024px
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);

  const resp1024 = await page.evaluate(() => {
    const ribbonEl = document.querySelector(".vno-ribbon");
    const content = document.querySelector(".vno-ribbon-content");
    return {
      ribbonClientWidth: ribbonEl?.clientWidth,
      ribbonScrollWidth: ribbonEl?.scrollWidth,
      contentClientWidth: content?.clientWidth,
      contentScrollWidth: content?.scrollWidth,
      hasOverflow: (content ? content.scrollWidth > content.clientWidth : false) || (ribbonEl ? ribbonEl.scrollWidth > ribbonEl.clientWidth : false)
    };
  });
  assert(!resp1024.hasOverflow, "Ribbon tab Trộn thư không tràn ngang ở 1024px", `client=${resp1024.ribbonClientWidth}, scroll=${resp1024.ribbonScrollWidth}`);

  // Trở lại 1440px để kiểm tra tương tác
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(100);

  // 4. Kiểm tra Modal Dialogs & Focus trap & Phím Escape
  // 4.1 Hộp thoại Phong bì (Envelopes Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.mailings.envelopes");
  });
  await page.waitForSelector(".vno-envelope-dialog", { timeout: 2000 });

  const envelopeAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-envelope-dialog");
    const delivery = document.querySelector("#vno-envelope-delivery");
    const isDeliveryFocused = document.activeElement === delivery;
    return {
      isOpen: Boolean(dialogBox),
      isDeliveryFocused
    };
  });
  assert(envelopeAudit.isOpen && envelopeAudit.isDeliveryFocused, "Hộp thoại Phong bì mở và tự động focus ô địa chỉ người nhận", JSON.stringify(envelopeAudit));

  // Focus trap trên hộp thoại Phong bì
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const envelopeTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(envelopeTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Phong bì (Focus Trap)", `trapped=${envelopeTrapped}`);

  // Escape đóng hộp thoại Phong bì
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const envelopeClosed = await page.evaluate(() => !document.querySelector(".vno-envelope-dialog"));
  assert(envelopeClosed, "Phím Escape đóng hộp thoại Phong bì an toàn và khôi phục focus", `closed=${envelopeClosed}`);

  // 4.2 Hộp thoại Nhãn (Labels Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.mailings.labels");
  });
  await page.waitForSelector(".vno-labels-dialog", { timeout: 2000 });

  const labelsAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-labels-dialog");
    const content = document.querySelector("#vno-labels-content");
    const isContentFocused = document.activeElement === content;
    return {
      isOpen: Boolean(dialogBox),
      isContentFocused
    };
  });
  assert(labelsAudit.isOpen && labelsAudit.isContentFocused, "Hộp thoại Nhãn mở và tự động focus ô nội dung nhãn", JSON.stringify(labelsAudit));

  // Focus trap trên hộp thoại Nhãn
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const labelsTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(labelsTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Nhãn (Focus Trap)", `trapped=${labelsTrapped}`);

  // Escape đóng hộp thoại Nhãn
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const labelsClosed = await page.evaluate(() => !document.querySelector(".vno-labels-dialog"));
  assert(labelsClosed, "Phím Escape đóng hộp thoại Nhãn an toàn và khôi phục focus", `closed=${labelsClosed}`);

  // 4.3 Hộp thoại Nguồn dữ liệu (CSV Data Source Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.mailMerge.open");
  });
  await page.waitForSelector("#vno-merge-ds-title", { timeout: 2000 });

  // Kiểm tra trạng thái rỗng ban đầu & nút dán dữ liệu mẫu
  const dsAuditInitial = await page.evaluate(() => {
    const badge = document.querySelector(".vno-merge-status-badge");
    const textarea = document.querySelector("#vno-merge-csv-input");
    return {
      statusText: badge?.textContent.trim(),
      dataStatus: badge?.getAttribute("data-status"),
      isTextareaFocused: document.activeElement === textarea
    };
  });
  assert(dsAuditInitial.statusText === "Chưa có dữ liệu" && dsAuditInitial.dataStatus === "empty",
    "Hộp thoại Nguồn dữ liệu hiển thị đúng trạng thái rỗng ban đầu", JSON.stringify(dsAuditInitial));

  // Bấm nút Dán dữ liệu mẫu và kiểm tra trạng thái cập nhật
  await page.click(".vno-merge-sample-btn");
  const dsAuditSample = await page.evaluate(() => {
    const badge = document.querySelector(".vno-merge-status-badge");
    return {
      statusText: badge?.textContent.trim(),
      dataStatus: badge?.getAttribute("data-status")
    };
  });
  assert(dsAuditSample.dataStatus === "success" && dsAuditSample.statusText.includes("4 cột"),
    "Dán dữ liệu mẫu phân tích chính xác và hiển thị trạng thái hợp lệ", JSON.stringify(dsAuditSample));

  // Focus trap trên hộp thoại Nguồn dữ liệu
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const dsTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(dsTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Nguồn dữ liệu (Focus Trap)", `trapped=${dsTrapped}`);

  // Nhấn Lưu nguồn dữ liệu
  await page.click(".vno-dialog-save-btn");
  await page.waitForTimeout(100);
  const dsClosed = await page.evaluate(() => !document.querySelector("#vno-merge-ds-title"));
  assert(dsClosed, "Lưu nguồn dữ liệu đóng hộp thoại và nạp dữ liệu vào Adapter thành công", `closed=${dsClosed}`);

  // 4.4 Hộp thoại Chèn trường trộn thư (Insert Field Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.mailMerge.insertField");
  });
  await page.waitForSelector("#vno-merge-field-title", { timeout: 2000 });

  const insertFieldAudit = await page.evaluate(() => {
    const select = document.querySelector("#vno-merge-field-select");
    const options = Array.from(select?.querySelectorAll("option") || []).map(o => o.value);
    const isSelectFocused = document.activeElement === select;
    return {
      options,
      isSelectFocused
    };
  });
  assert(insertFieldAudit.options.length === 4 && insertFieldAudit.options.includes("HoTen"),
    "Hộp thoại Chèn trường nạp đầy đủ danh sách trường từ nguồn dữ liệu vừa lưu", JSON.stringify(insertFieldAudit));

  // Nhấn Chèn trường (Enter)
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const hasMergeField = await page.evaluate(() => {
    return Boolean(document.querySelector(".vno-merge-field"));
  });
  assert(hasMergeField, "Chèn trường trộn thư thành công vào văn bản (hiển thị span.vno-merge-field)", `hasMergeField=${hasMergeField}`);

  // 4.5 Tương tác Xem trước kết quả & Duyệt bản ghi
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    // Bật xem trước
    await globalCommandBus.execute("writer.mailMerge.preview");
    // Nhảy tới bản ghi sau
    await globalCommandBus.execute("writer.mailMerge.nextRecord");
    // Nhảy về bản ghi trước
    await globalCommandBus.execute("writer.mailMerge.prevRecord");
  });

  const previewAudit = await page.evaluate(() => {
    const field = document.querySelector(".vno-merge-field");
    return {
      isPreview: field?.classList.contains("vno-merge-preview"),
      text: field?.textContent.trim()
    };
  });
  assert(previewAudit.isPreview, "Lệnh Xem trước kết quả chuyển đổi trường sang dữ liệu bản ghi thật", JSON.stringify(previewAudit));

  // 4.6 Hoàn tất trộn thư
  const finishSuccess = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const res = await globalCommandBus.execute("writer.mailMerge.finish");
    return res !== false;
  });
  assert(finishSuccess, "Lệnh Hoàn tất trộn thư thực thi thành công", `res=${finishSuccess}`);

  // Đóng thông báo hoàn tất trộn thư nếu đang hiển thị
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // =========================================================================
  // 5. KIỂM TRA VIỆC 2 — TƯƠNG PHẢN TAB RIBBON ĐANG CHỌN Ở CHẾ ĐỘ TỐI
  // =========================================================================

  // Chuyển sang Dark Mode
  await page.click(".vno-theme-toggle-btn");
  await page.waitForTimeout(200);

  // 5.1 Kiểm tra độ tương phản tab đang chọn trên Writer Dark Mode
  const writerDarkContrast = await page.evaluate(() => {
    function lum(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function parseRgb(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null;
    }
    function contrast(rgb1, rgb2) {
      const l1 = lum(rgb1.r, rgb1.g, rgb1.b);
      const l2 = lum(rgb2.r, rgb2.g, rgb2.b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const activeTab = document.querySelector(".vno-ribbon-tab.is-active");
    const tabpanel = document.querySelector(".vno-ribbon-content");
    const tabStyle = window.getComputedStyle(activeTab);
    const bgStyle = window.getComputedStyle(tabpanel);

    const fgRgb = parseRgb(tabStyle.color);
    const bgRgb = parseRgb(tabStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ? tabStyle.backgroundColor : bgStyle.backgroundColor) || { r: 37, g: 37, b: 38 }; // #252526
    const ratio = contrast(fgRgb, bgRgb);

    return {
      fgColor: tabStyle.color,
      bgColor: tabStyle.backgroundColor,
      panelBg: bgStyle.backgroundColor,
      ratio: Math.round(ratio * 100) / 100,
      meetsWcagAA: ratio >= 4.5
    };
  });
  assert(writerDarkContrast.meetsWcagAA,
    `Writer Dark Mode: Tab ribbon đang chọn đạt chuẩn tương phản WCAG AA (${writerDarkContrast.ratio}:1 >= 4.5:1)`,
    JSON.stringify(writerDarkContrast));

  // 5.2 Kiểm tra độ tương phản tab đang chọn trên Sheet Dark Mode
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector(".vno-ribbon-tab.is-active", { timeout: 5000 });
  await page.waitForTimeout(200);

  const sheetDarkContrast = await page.evaluate(() => {
    function lum(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function parseRgb(str) {
      const m = str ? str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) : null;
      return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null;
    }
    function contrast(rgb1, rgb2) {
      if (!rgb1 || !rgb2) return 1;
      const l1 = lum(rgb1.r, rgb1.g, rgb1.b);
      const l2 = lum(rgb2.r, rgb2.g, rgb2.b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const activeTab = document.querySelector(".vno-ribbon-tab.is-active");
    const tabpanel = document.querySelector(".vno-ribbon-content");
    if (!activeTab || !tabpanel) {
      return { meetsWcagAA: false, error: "activeTab or tabpanel not found" };
    }
    const tabStyle = window.getComputedStyle(activeTab);
    const bgStyle = window.getComputedStyle(tabpanel);

    const fgRgb = parseRgb(tabStyle.color);
    const bgRgb = parseRgb(tabStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ? tabStyle.backgroundColor : bgStyle.backgroundColor) || { r: 37, g: 37, b: 38 };
    const ratio = contrast(fgRgb, bgRgb);

    return {
      fgColor: tabStyle.color,
      bgColor: tabStyle.backgroundColor,
      panelBg: bgStyle.backgroundColor,
      ratio: Math.round(ratio * 100) / 100,
      meetsWcagAA: ratio >= 4.5
    };
  });
  assert(sheetDarkContrast.meetsWcagAA,
    `Sheet Dark Mode: Tab ribbon đang chọn đạt chuẩn tương phản WCAG AA (${sheetDarkContrast.ratio}:1 >= 4.5:1)`,
    JSON.stringify(sheetDarkContrast));

  // 5.3 Chuyển lại Light Mode và kiểm tra độ tương phản không bị ảnh hưởng
  await page.click(".vno-theme-toggle-btn");
  await page.waitForTimeout(200);

  const sheetLightContrast = await page.evaluate(() => {
    function lum(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function parseRgb(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null;
    }
    function contrast(rgb1, rgb2) {
      const l1 = lum(rgb1.r, rgb1.g, rgb1.b);
      const l2 = lum(rgb2.r, rgb2.g, rgb2.b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const activeTab = document.querySelector(".vno-ribbon-tab.is-active");
    const tabpanel = document.querySelector(".vno-ribbon-content");
    const tabStyle = window.getComputedStyle(activeTab);
    const bgStyle = window.getComputedStyle(tabpanel);

    const fgRgb = parseRgb(tabStyle.color);
    const bgRgb = parseRgb(tabStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ? tabStyle.backgroundColor : bgStyle.backgroundColor) || { r: 255, g: 255, b: 255 };
    const ratio = contrast(fgRgb, bgRgb);

    return {
      fgColor: tabStyle.color,
      ratio: Math.round(ratio * 100) / 100,
      meetsWcagAA: ratio >= 4.5
    };
  });
  assert(sheetLightContrast.meetsWcagAA,
    `Sheet Light Mode: Tab ribbon đang chọn đạt chuẩn tương phản WCAG AA (${sheetLightContrast.ratio}:1 >= 4.5:1)`,
    JSON.stringify(sheetLightContrast));

  // 6. Kiểm tra Help Catalog cho Tab Trộn thư
  const helpAudit = await page.evaluate(async () => {
    const { searchHelpEntries, getHelpEntryById } = await import("/platform/help/help-service.js");
    const envelopesEntry = getHelpEntryById("writer.mailings.envelopes");
    const labelsEntry = getHelpEntryById("writer.mailings.labels");
    const mergeEntry = getHelpEntryById("writer.mailMerge");

    const searchMerge = searchHelpEntries("trộn thư", { app: "writer" });
    const searchEnvelopes = searchHelpEntries("phong bì", { app: "writer" });
    const searchLabels = searchHelpEntries("nhãn", { app: "writer" });

    return {
      entriesExist: Boolean(envelopesEntry && labelsEntry && mergeEntry),
      allPointToMailings: [envelopesEntry, labelsEntry, mergeEntry].every(e => e?.ribbon?.tabId === "mailings"),
      searchHits: Boolean(searchMerge.length && searchEnvelopes.length && searchLabels.length)
    };
  });
  assert(helpAudit.entriesExist && helpAudit.allPointToMailings && helpAudit.searchHits,
    "100% tính năng tab Trộn thư có bài Help tiếng Việt chỉ đúng tab 'Trộn thư' và tìm kiếm chuẩn", JSON.stringify(helpAudit));

  assert(errors.length === 0, "Không có pageerror trong suốt phiên kiểm thử live", JSON.stringify(errors));

  console.log("\n==================================================");
  console.log(`TỔNG KẾT LIVE AUDIT TAB TRỘN THƯ: ${failures.length === 0 ? "TẤT CẢ PASS" : failures.length + " THẤT BẠI"}`);
  console.log("==================================================");

  await browser.close();
} catch (err) {
  failures.push("Runtime error: " + err.message);
  console.error(err);
} finally {
  server.close();
}

if (failures.length > 0) {
  process.exit(1);
}
