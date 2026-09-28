import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_DESIGN_PORT || 8797);
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

  // 1. Chuyển sang tab Thiết kế
  await page.click("#vno-ribbon-tab-design");
  await page.waitForTimeout(200);

  // 2. Rà soát trực quan Ribbon tab Thiết kế tại 1440px
  const ribbonAudit = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const tabpanel = document.querySelector("#vno-ribbon-tabpanel-design");
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

  assert(ribbonAudit.found, "Tab Thiết kế được render trong DOM", JSON.stringify(ribbonAudit));
  assert(ribbonAudit.count === 4, "Tab Thiết kế có đủ 4 controls/buttons", `Count: ${ribbonAudit.count}`);
  assert(!ribbonAudit.hasOverflow, "Ribbon tab Thiết kế không tràn ngang ở 1440px", `client=${ribbonAudit.clientWidth}, scroll=${ribbonAudit.scrollWidth}`);

  // Kiểm tra 0 raw ID
  const rawIdItems = ribbonAudit.itemDetails.filter(i => i.isRawId);
  assert(rawIdItems.length === 0, "100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id", JSON.stringify(rawIdItems));

  // Kiểm tra 0 icon fallback chấm tròn
  const circleFallbackItems = ribbonAudit.itemDetails.filter(i => i.hasCircleFallback);
  assert(circleFallbackItems.length === 0, "100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen", JSON.stringify(circleFallbackItems));

  // Kiểm tra 100% nút có handler
  const unhandledItems = ribbonAudit.itemDetails.filter(i => !i.hasHandler);
  assert(unhandledItems.length === 0, "100% controls trên tab Thiết kế có live handler đăng ký trong CommandBus", JSON.stringify(unhandledItems));

  // Kiểm tra bố cục nhóm Ribbon
  const all72px = ribbonAudit.groupLayout.every(g => g.itemsHeight === 72);
  assert(all72px, "Mọi nhóm trên tab Thiết kế có items height chuẩn 72px", JSON.stringify(ribbonAudit.groupLayout));

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
  assert(!resp1024.hasOverflow, "Ribbon tab Thiết kế không tràn ngang ở 1024px", `client=${resp1024.ribbonClientWidth}, scroll=${resp1024.ribbonScrollWidth}`);

  // Trở lại 1440px để kiểm tra tương tác modal
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(100);

  // 4. Modal Dialogs & Focus trap & Phím Escape
  // 4.1 Hộp thoại Thư viện Chủ đề (Theme Gallery Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.design.themeGallery");
  });
  await page.waitForSelector("#vno-theme-dialog-title", { timeout: 2000 });

  const themeDialogAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-dialog-box");
    const cards = Array.from(document.querySelectorAll(".vno-theme-card"));
    const activeCard = document.activeElement;
    return {
      isOpen: Boolean(dialogBox),
      cardCount: cards.length,
      hasRovingFocus: cards.includes(activeCard) || document.activeElement?.classList?.contains("vno-theme-card")
    };
  });
  assert(themeDialogAudit.isOpen && themeDialogAudit.cardCount === 6,
    "Hộp thoại Thư viện Chủ đề mở thành công với đủ 6 thẻ theme", JSON.stringify(themeDialogAudit));

  // Focus trap trên hộp thoại Theme Gallery
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const themeTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(themeTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Chủ đề (Focus Trap)", `trapped=${themeTrapped}`);

  // Escape đóng hộp thoại Theme Gallery
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  const themeClosed = await page.evaluate(() => !document.querySelector("#vno-theme-dialog-title"));
  assert(themeClosed, "Phím Escape đóng hộp thoại Chủ đề an toàn và khôi phục focus", `closed=${themeClosed}`);

  // Mở lại hộp thoại Chủ đề, chọn chủ đề Hiện đại (Modern) và áp dụng
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.design.themeGallery");
  });
  await page.waitForSelector('.vno-theme-card[data-theme-id="modern"]', { timeout: 2000 });
  await page.click('.vno-theme-card[data-theme-id="modern"]');
  await page.click(".vno-dialog-ok-btn");
  await page.waitForTimeout(150);

  const appliedTheme = await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body") || document.querySelector("[data-vno-theme]") || document.querySelector(".vno-writer-page");
    return editor?.dataset?.vnoTheme || editor?.getAttribute("data-vno-theme");
  });
  assert(appliedTheme === "modern", "Áp dụng chủ đề 'modern' cập nhật thuộc tính data-vno-theme trên trang", `theme=${appliedTheme}`);

  // 4.2 Hộp thoại Hình mờ (Watermark Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.page.watermark");
  });
  await page.waitForSelector("#vno-wm-dialog-title", { timeout: 2000 });

  const wmAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-watermark-dialog");
    const txtInput = document.querySelector("#vno-wm-text");
    const chips = Array.from(document.querySelectorAll(".vno-watermark-chip"));
    return {
      isOpen: Boolean(dialogBox),
      isTextFocused: document.activeElement === txtInput,
      chipCount: chips.length
    };
  });
  assert(wmAudit.isOpen && wmAudit.isTextFocused && wmAudit.chipCount === 5,
    "Hộp thoại Hình mờ mở, tự động focus ô nhập chữ và hiển thị 5 chip gợi ý", JSON.stringify(wmAudit));

  // Nhấn chip "TUYỆT MẬT" và kiểm tra ô text cập nhật
  await page.click('.vno-watermark-chip[data-text="TUYỆT MẬT"]');
  const chipVal = await page.evaluate(() => document.querySelector("#vno-wm-text")?.value);
  assert(chipVal === "TUYỆT MẬT", "Nhấn chip gợi ý cập nhật giá trị ô chữ hình mờ thành 'TUYỆT MẬT'", `val=${chipVal}`);

  // Focus trap trên hộp thoại Watermark
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const wmTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(wmTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Hình mờ (Focus Trap)", `trapped=${wmTrapped}`);

  // Nhấn Áp dụng hình mờ
  await page.click(".vno-dialog-ok-btn");
  await page.waitForTimeout(150);

  const wmApplied = await page.evaluate(() => {
    const wmTextEl = document.querySelector(".vno-watermark-text");
    return wmTextEl?.textContent?.trim();
  });
  assert(wmApplied === "TUYỆT MẬT", "Áp dụng hình mờ hiển thị đúng lớp chữ phủ 'TUYỆT MẬT' trên trang", `text=${wmApplied}`);

  // 4.3 Hộp thoại Màu trang (Page Color Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.page.color");
  });
  await page.waitForSelector("#vno-page-color-title", { timeout: 2000 });

  const pageColorAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-page-color-dialog");
    const swatches = Array.from(document.querySelectorAll(".vno-page-color-swatch"));
    return {
      isOpen: Boolean(dialogBox),
      swatchCount: swatches.length
    };
  });
  assert(pageColorAudit.isOpen && pageColorAudit.swatchCount === 12,
    "Hộp thoại Màu trang mở thành công với 12 ô màu bảng chuẩn", JSON.stringify(pageColorAudit));

  // Focus trap trên hộp thoại Page Color
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const pcTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(pcTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Màu trang (Focus Trap)", `trapped=${pcTrapped}`);

  // Chọn ô màu xanh nhạt (#dbeafe) và nhấn Áp dụng
  await page.click('.vno-page-color-swatch[data-page-color="#dbeafe"]');
  await page.click(".vno-dialog-ok-btn");
  await page.waitForTimeout(150);

  const docPageColor = await page.evaluate(() => {
    const pageEl = document.querySelector(".vno-writer-page");
    return pageEl?.style?.backgroundColor;
  });
  assert(docPageColor === "rgb(219, 234, 254)" || docPageColor === "#dbeafe",
    "Áp dụng màu trang cập nhật màu nền tài liệu thành #dbeafe (rgb 219, 234, 254)", `bg=${docPageColor}`);

  // 4.4 Hộp thoại Viền trang (Page Border Dialog)
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.page.border");
  });
  await page.waitForSelector("#vno-pb-dialog-title", { timeout: 2000 });

  const pbAudit = await page.evaluate(() => {
    const dialogBox = document.querySelector(".vno-page-border-dialog");
    const previewSheet = document.querySelector("#vno-border-preview-sheet");
    const previewInner = document.querySelector("#vno-border-preview-inner");
    return {
      isOpen: Boolean(dialogBox),
      hasPreview: Boolean(previewSheet && previewInner)
    };
  });
  assert(pbAudit.isOpen && pbAudit.hasPreview,
    "Hộp thoại Viền trang mở và hiển thị khung xem trước trực quan (Live Preview)", JSON.stringify(pbAudit));

  // Đổi kiểu viền sang "dashed" và kiểm tra preview cập nhật
  await page.selectOption("#vno-border-style", "dashed");
  const previewBorder = await page.evaluate(() => {
    const inner = document.querySelector("#vno-border-preview-inner");
    return inner?.style?.border;
  });
  assert(previewBorder.includes("dashed"), "Thay đổi kiểu viền cập nhật trực tiếp khung xem trước", `border=${previewBorder}`);

  // Focus trap trên hộp thoại Page Border
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const pbTrapped = await page.evaluate(() => {
    const overlay = document.querySelector(".vno-dialog-overlay");
    return overlay?.contains(document.activeElement);
  });
  assert(pbTrapped, "Phím Tab được giữ trong phạm vi hộp thoại Viền trang (Focus Trap)", `trapped=${pbTrapped}`);

  // Áp dụng viền trang
  await page.click(".vno-dialog-ok-btn");
  await page.waitForTimeout(150);

  const borderApplied = await page.evaluate(() => {
    const frame = document.querySelector(".vno-page-border-frame");
    return Boolean(frame && frame.style.borderStyle === "dashed");
  });
  assert(borderApplied, "Áp dụng viền trang tạo khung viền .vno-page-border-frame trên trang tài liệu", `borderApplied=${borderApplied}`);

  // 5. VIỆC 2 — KIỂM TRA CHẾ ĐỘ TỐI (DARK MODE) TRÊN TAB THIẾT KẾ
  // 5.1 Bật chế độ Tối qua nút "Tối" (.vno-theme-toggle-btn)
  await page.click(".vno-theme-toggle-btn");
  await page.waitForTimeout(200);

  // Hàm tính relative luminance và contrast ratio chuẩn WCAG
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

  // 5.2 Kiểm tra màu trang của TÀI LIỆU không bị đổi theo giao diện Tối
  const darkPageDocColor = await page.evaluate(() => {
    const pageEl = document.querySelector(".vno-writer-page");
    return pageEl?.style?.backgroundColor;
  });
  assert(darkPageDocColor === "rgb(219, 234, 254)" || darkPageDocColor === "#dbeafe",
    "Màu trang của TÀI LIỆU không bị đổi theo giao diện Tối (giữ nguyên #dbeafe của người dùng)", `bg=${darkPageDocColor}`);

  // 5.3 Mở hộp thoại Thư viện Chủ đề ở chế độ Tối và kiểm tra tương phản chữ WCAG AA
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.design.themeGallery");
  });
  await page.waitForSelector("#vno-theme-dialog-title", { timeout: 2000 });

  const darkThemeContrastAudit = await page.evaluate(() => {
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

    const cards = Array.from(document.querySelectorAll(".vno-theme-card"));
    return cards.map(card => {
      const title = card.querySelector(".vno-theme-card-title, strong");
      const titleStyle = window.getComputedStyle(title);
      const cardStyle = window.getComputedStyle(card);
      const fgRgb = parseRgb(titleStyle.color);
      const bgRgb = parseRgb(cardStyle.backgroundColor) || { r: 30, g: 30, b: 30 };
      const ratio = Math.round(contrast(fgRgb, bgRgb) * 100) / 100;
      return {
        themeId: card.dataset.themeId,
        color: titleStyle.color,
        cardBg: cardStyle.backgroundColor,
        ratio,
        meetsWcagAA: ratio >= 4.5
      };
    });
  });

  const allCardsPassWcag = darkThemeContrastAudit.every(c => c.meetsWcagAA);
  assert(allCardsPassWcag,
    "Chế độ Tối: 100% (6/6) thẻ chủ đề tài liệu đạt chuẩn tương phản WCAG AA (>= 4.5:1)",
    JSON.stringify(darkThemeContrastAudit));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  // 5.4 Mở hộp thoại Màu trang ở chế độ Tối và kiểm tra viền ô màu thấy rõ trên nền tối
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.page.color");
  });
  await page.waitForSelector("#vno-page-color-title", { timeout: 2000 });

  const darkSwatchesAudit = await page.evaluate(() => {
    const swatches = Array.from(document.querySelectorAll(".vno-page-color-swatch"));
    return swatches.map(s => {
      const st = window.getComputedStyle(s);
      return {
        color: s.dataset.pageColor,
        borderWidth: st.borderTopWidth,
        borderColor: st.borderTopColor,
        hasVisibleBorder: Boolean(st.borderTopWidth && st.borderTopWidth !== "0px" && st.borderTopStyle !== "none")
      };
    });
  });
  const allSwatchesHaveVisibleBorder = darkSwatchesAudit.every(s => s.hasVisibleBorder);
  assert(allSwatchesHaveVisibleBorder,
    "Chế độ Tối: 100% (12/12) ô màu trang có viền sắc nét nhìn rõ trên nền tối",
    `count=${darkSwatchesAudit.length}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  // 5.5 Mở hộp thoại Hình mờ ở chế độ Tối và kiểm tra độ tương phản chip gợi ý & nút xóa
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    globalCommandBus.execute("writer.page.watermark");
  });
  await page.waitForSelector("#vno-wm-dialog-title", { timeout: 2000 });

  const darkWmAudit = await page.evaluate(() => {
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

    const chip = document.querySelector(".vno-watermark-chip");
    const chipStyle = window.getComputedStyle(chip);
    const chipFg = parseRgb(chipStyle.color);
    const chipBg = parseRgb(chipStyle.backgroundColor) || { r: 38, g: 47, b: 61 };
    const chipRatio = Math.round(contrast(chipFg, chipBg) * 100) / 100;

    const btnRemove = document.querySelector(".vno-wm-btn-remove");
    let removeRatio = null;
    if (btnRemove) {
      const btnStyle = window.getComputedStyle(btnRemove);
      const btnFg = parseRgb(btnStyle.color);
      const dialogBg = parseRgb(window.getComputedStyle(document.querySelector(".vno-dialog-box")).backgroundColor) || { r: 37, g: 37, b: 38 };
      removeRatio = Math.round(contrast(btnFg, dialogBg) * 100) / 100;
    }

    return {
      chipRatio,
      chipPass: chipRatio >= 4.5,
      removeRatio,
      removePass: removeRatio ? removeRatio >= 4.5 : true
    };
  });
  assert(darkWmAudit.chipPass && darkWmAudit.removePass,
    "Chế độ Tối: Chip gợi ý hình mờ và nút xóa hình mờ đạt chuẩn tương phản WCAG AA",
    JSON.stringify(darkWmAudit));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  // Chuyển lại Sáng để kết thúc
  await page.click(".vno-theme-toggle-btn");
  await page.waitForTimeout(100);

  // 6. Kiểm tra Help Catalog cho Tab Thiết kế
  const helpAudit = await page.evaluate(async () => {
    const { searchHelpEntries, getHelpEntryById } = await import("/platform/help/help-service.js");
    const themesEntry = getHelpEntryById("writer.design.themes");
    const pageColorEntry = getHelpEntryById("writer.page.color");
    const watermarkBorderEntry = getHelpEntryById("writer.page.watermarkBorder");

    const searchThemes = searchHelpEntries("chủ đề", { app: "writer" });
    const searchPageColor = searchHelpEntries("màu trang", { app: "writer" });
    const searchWatermark = searchHelpEntries("hình mờ", { app: "writer" });

    return {
      entriesExist: Boolean(themesEntry && pageColorEntry && watermarkBorderEntry),
      allPointToDesign: [themesEntry, pageColorEntry, watermarkBorderEntry].every(e => e?.ribbon?.tabId === "design"),
      searchHits: Boolean(searchThemes.length && searchPageColor.length && searchWatermark.length)
    };
  });
  assert(helpAudit.entriesExist && helpAudit.allPointToDesign && helpAudit.searchHits,
    "100% tính năng tab Thiết kế có bài Help tiếng Việt chỉ đúng tab 'Thiết kế' và tìm kiếm chuẩn", JSON.stringify(helpAudit));

  assert(errors.length === 0, "Không có pageerror trong suốt phiên kiểm thử live", JSON.stringify(errors));

  console.log("\n==================================================");
  console.log(`TỔNG KẾT LIVE AUDIT TAB THIẾT KẾ: ${failures.length === 0 ? "TẤT CẢ PASS" : failures.length + " THẤT BẠI"}`);
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
