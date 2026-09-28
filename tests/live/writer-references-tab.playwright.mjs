import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_REF_PORT || 8795);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
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
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-page").waitFor();

  // 1. Chuyển sang tab Tham chiếu
  await page.click("#vno-ribbon-tab-references");
  await page.waitForTimeout(200);

  // 2. Rà soát trực quan Ribbon tab Tham chiếu tại 1440px
  const ribbonAudit = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const tabpanel = document.querySelector("#vno-ribbon-tabpanel-references");
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
      const hasCircleFallback = iconSpan ? iconSpan.innerHTML.includes('circle cx="12"') : false;
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

    const selectEl = tabpanel.querySelector("select[data-command-id='writer.reference.citationStyle']");
    const selectRect = selectEl?.getBoundingClientRect();
    const sourcesBtn = tabpanel.querySelector("button[data-command-id='writer.reference.sourcesManage']");
    const sourcesRect = sourcesBtn?.getBoundingClientRect();

    return {
      found: true,
      count: items.length,
      hasOverflow: (ribbonEl.scrollWidth > ribbonEl.clientWidth) || (tabpanel.scrollWidth > tabpanel.clientWidth),
      clientWidth: ribbonEl.clientWidth,
      scrollWidth: ribbonEl.scrollWidth,
      itemDetails,
      groupLayout,
      columnAlignment: {
        selectWidth: selectRect ? Math.round(selectRect.width) : 0,
        sourcesWidth: sourcesRect ? Math.round(sourcesRect.width) : 0,
        selectHeight: selectRect ? Math.round(selectRect.height) : 0
      }
    };
  });

  assert(ribbonAudit.found, "Tab Tham chiếu được render trong DOM", JSON.stringify(ribbonAudit));
  assert(ribbonAudit.count === 12, "Tab Tham chiếu có đủ 12 controls/buttons", `Count: ${ribbonAudit.count}`);
  assert(!ribbonAudit.hasOverflow, "Ribbon tab Tham chiếu không tràn ngang ở 1440px", `client=${ribbonAudit.clientWidth}, scroll=${ribbonAudit.scrollWidth}`);

  // Kiểm tra 0 raw ID
  const rawIdItems = ribbonAudit.itemDetails.filter(i => i.isRawId);
  assert(rawIdItems.length === 0, "100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id", JSON.stringify(rawIdItems));

  // Kiểm tra 0 icon fallback chấm tròn
  const circleFallbackItems = ribbonAudit.itemDetails.filter(i => i.hasCircleFallback);
  assert(circleFallbackItems.length === 0, "100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen", JSON.stringify(circleFallbackItems));

  // Kiểm tra 100% nút có handler
  const unhandledItems = ribbonAudit.itemDetails.filter(i => !i.hasHandler);
  assert(unhandledItems.length === 0, "100% controls trên tab có live handler đăng ký trong CommandBus", JSON.stringify(unhandledItems));

  // Kiểm tra bố cục nhóm Ribbon
  const all72px = ribbonAudit.groupLayout.every(g => g.itemsHeight === 72);
  assert(all72px, "Mọi nhóm trên tab Tham chiếu có items height chuẩn 72px", JSON.stringify(ribbonAudit.groupLayout));

  const labelTops = ribbonAudit.groupLayout.map(g => g.labelTop);
  const maxDiff = Math.max(...labelTops) - Math.min(...labelTops);
  assert(maxDiff <= 1, "Mọi nhãn nhóm nằm thẳng hàng trên cùng một baseline (maxDiff <= 1px)", `maxDiff=${maxDiff}px`);

  const noBottomOverlap = ribbonAudit.groupLayout.every(g => g.labelBottom <= g.panelBottom);
  assert(noBottomOverlap, "Không có nhãn nhóm nào bị đè hoặc chạm mép dưới ribbon", JSON.stringify(ribbonAudit.groupLayout));

  // Kiểm tra căn chỉnh cột nhóm Trích dẫn
  assert(ribbonAudit.columnAlignment.selectWidth === ribbonAudit.columnAlignment.sourcesWidth,
    "Hộp chọn Kiểu trích dẫn khớp độ rộng với nút Quản lý nguồn trong cùng cột",
    `select=${ribbonAudit.columnAlignment.selectWidth}px, sources=${ribbonAudit.columnAlignment.sourcesWidth}px`);

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
  assert(!resp1024.hasOverflow, "Ribbon tab Tham chiếu không tràn ngang ở 1024px", `client=${resp1024.ribbonClientWidth}, scroll=${resp1024.ribbonScrollWidth}`);

  // Trở lại 1440px để kiểm tra tương tác
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(100);

  // 4. Kiểm tra tương tác các lệnh trực tiếp (TOC, Footnote, Endnote, Citation Style)
  const execResults = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const pageBody = document.querySelector(".vno-writer-body");

    // Tạo heading mẫu để TOC có nội dung
    const h1 = document.createElement("h1");
    h1.textContent = "Chương 1: Giới thiệu";
    h1.className = "vno-heading-1";
    pageBody.prepend(h1);

    // Chèn Footnote
    await globalCommandBus.execute("writer.reference.footnoteInsert");
    const hasFootnote = Boolean(pageBody.querySelector("sup.vno-footnote-ref") || document.querySelector(".vno-writer-footnotes-container"));

    // Chèn Endnote
    await globalCommandBus.execute("writer.reference.endnoteInsert");
    const hasEndnote = Boolean(pageBody.querySelector("sup.vno-endnote-ref") || document.querySelector(".vno-writer-endnotes-container"));

    // Đổi citation style
    await globalCommandBus.execute("writer.reference.citationStyle", "mla");
    await globalCommandBus.execute("writer.reference.citationStyle", "apa");

    // Chèn TOC
    await globalCommandBus.execute("writer.reference.tocInsert");
    const hasToc = Boolean(pageBody.querySelector(".vno-toc-block, .vno-toc-container, [data-vno-toc='true']"));

    // Cập nhật TOC
    await globalCommandBus.execute("writer.reference.tocUpdate");

    return {
      hasFootnote,
      hasEndnote,
      hasToc
    };
  });

  assert(execResults.hasFootnote, "Chèn Chú thích trang (Footnote) thành công vào văn bản", JSON.stringify(execResults));
  assert(execResults.hasEndnote, "Chèn Chú thích cuối (Endnote) thành công vào văn bản", JSON.stringify(execResults));
  assert(execResults.hasToc, "Chèn Mục lục tự động (TOC) thành công từ các tiêu đề Heading", JSON.stringify(execResults));

  // 5. Kiểm tra Modal Dialogs & Phím Tab / Enter / Escape
  // 5.1 Dialog Chèn chú thích ảnh (Caption Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.reference.captionInsert");
  });
  await page.waitForSelector(".vno-caption-dialog-overlay", { timeout: 2000 });

  const captionDialogAudit = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-caption-dialog-overlay");
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && activeEl.classList.contains("vno-caption-text-input");
    const previewEl = overlay?.querySelector(".vno-caption-preview");
    return {
      isOpen: Boolean(overlay),
      isInputFocused,
      hasPreview: Boolean(previewEl)
    };
  });
  assert(captionDialogAudit.isOpen && captionDialogAudit.isInputFocused, "Hộp thoại Chèn chú thích ảnh mở ra và focus vào ô nhập nội dung", JSON.stringify(captionDialogAudit));

  // Nhấn Tab để kiểm tra focus trap
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const tabTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-caption-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(tabTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Chèn chú thích ảnh (Focus Trap)", `activeElement: ${tabTrapped}`);

  // Nhấn Escape để đóng dialog
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const captionDialogClosed = await page.evaluate(() => !document.querySelector(".vno-caption-dialog-overlay"));
  assert(captionDialogClosed, "Phím Escape đóng hộp thoại Chèn chú thích ảnh an toàn", `closed: ${captionDialogClosed}`);

  // 5.2 Dialog Chèn danh mục hình ảnh (TOF Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.reference.tofInsert");
  });
  await page.waitForSelector(".vno-caption-dialog-overlay", { timeout: 2000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const tofDialogClosed = await page.evaluate(() => !document.querySelector(".vno-caption-dialog-overlay"));
  assert(tofDialogClosed, "Hộp thoại Danh mục hình ảnh mở và đóng bằng Escape an toàn", `closed: ${tofDialogClosed}`);

  // 5.3 Dialog Quản lý nguồn (Sources Manager Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.reference.sourcesManage");
  });
  await page.waitForSelector(".vno-citation-dialog-overlay", { timeout: 2000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const sourcesDialogClosed = await page.evaluate(() => !document.querySelector(".vno-citation-dialog-overlay"));
  assert(sourcesDialogClosed, "Hộp thoại Quản lý nguồn mở và đóng bằng Escape an toàn", `closed: ${sourcesDialogClosed}`);

  // 5.4 Dialog Tham chiếu chéo (Cross-reference Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.insert.crossReference");
  });
  await page.waitForSelector("[data-vno-dialog='cross-reference']", { timeout: 2000 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const xrefDialogClosed = await page.evaluate(() => !document.querySelector("[data-vno-dialog='cross-reference']"));
  assert(xrefDialogClosed, "Hộp thoại Tham chiếu chéo mở và đóng bằng Escape an toàn", `closed: ${xrefDialogClosed}`);

  // 6. Kiểm tra Chế độ Tối (Dark mode)
  await page.click(".vno-theme-toggle-btn");
  await page.waitForTimeout(200);

  const darkModeAudit = await page.evaluate(() => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tabpanel = document.querySelector("#vno-ribbon-tabpanel-references");
    const style = tabpanel ? window.getComputedStyle(tabpanel) : null;
    return {
      isDark,
      bg: style?.backgroundColor
    };
  });
  assert(darkModeAudit.isDark, "Chuyển sang chế độ Tối (Dark mode) thành công", JSON.stringify(darkModeAudit));

  // Kiểm tra Help catalog cho Tab Tham chiếu
  const helpAudit = await page.evaluate(async () => {
    const { searchHelpEntries, getHelpEntryById } = await import("/platform/help/help-service.js");
    const tocEntry = getHelpEntryById("writer.reference.toc");
    const notesEntry = getHelpEntryById("writer.reference.notes");
    const citationsEntry = getHelpEntryById("writer.reference.citations");
    const captionsEntry = getHelpEntryById("writer.reference.captions");

    const searchToc = searchHelpEntries("mục lục", { app: "writer" });
    const searchNotes = searchHelpEntries("chú thích cuối", { app: "writer" });
    const searchCitations = searchHelpEntries("trích dẫn", { app: "writer" });
    const searchCaptions = searchHelpEntries("chú thích ảnh", { app: "writer" });

    return {
      entriesExist: Boolean(tocEntry && notesEntry && citationsEntry && captionsEntry),
      allPointToReferences: [tocEntry, notesEntry, citationsEntry, captionsEntry].every(e => e?.ribbon?.tabId === "references"),
      searchHits: Boolean(searchToc.length && searchNotes.length && searchCitations.length && searchCaptions.length)
    };
  });
  assert(helpAudit.entriesExist && helpAudit.allPointToReferences && helpAudit.searchHits,
    "100% tính năng tab Tham chiếu có bài Help tiếng Việt chỉ đúng tab 'Tham chiếu' và tìm kiếm chuẩn", JSON.stringify(helpAudit));

  assert(errors.length === 0, "Không có pageerror trong suốt phiên kiểm thử live", JSON.stringify(errors));

  console.log("\n==================================================");
  console.log(`TỔNG KẾT LIVE AUDIT: ${failures.length === 0 ? "TẤT CẢ PASS" : failures.length + " THẤT BẠI"}`);
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
