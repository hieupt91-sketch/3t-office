import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_VIEW_PORT || 8925);
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
  console.log((condition ? "PASS" : "FAIL") + "\t" + label + (detail ? " — " + detail : ""));
  if (!condition) failures.push(label + ": " + detail);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });

  // 1. Kiểm tra ở 1440px
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  // Chọn tab Chế độ xem
  await page.click("#vno-ribbon-tab-view");
  await page.waitForTimeout(200);

  const audit1440 = await page.evaluate(() => {
    const panel = document.getElementById("vno-ribbon-tabpanel-view");
    if (!panel) return { error: "Không tìm thấy tabpanel view" };
    const hasOverflow = panel.scrollWidth > panel.clientWidth + 2;
    const buttons = Array.from(panel.querySelectorAll("button"));
    const rawIds = buttons.filter(b => {
      const text = b.textContent || "";
      return text.includes("sheet.") || text.includes("common.") || text.includes("writer.");
    }).map(b => b.getAttribute("data-command-id") || b.textContent);

    const blackDots = buttons.filter(b => {
      const svg = b.querySelector("svg");
      return svg && svg.innerHTML.includes('circle cx="12" cy="12" r="4"');
    }).map(b => b.getAttribute("data-command-id") || b.getAttribute("data-dropdown-id") || "unknown");

    return {
      clientWidth: panel.clientWidth,
      scrollWidth: panel.scrollWidth,
      hasOverflow,
      rawIds,
      blackDots
    };
  });

  assert(!audit1440.hasOverflow, "Ribbon View Tab không tràn ngang ở 1440px", `client=${audit1440.clientWidth} scroll=${audit1440.scrollWidth}`);
  assert(audit1440.rawIds.length === 0, "Không có nút bị raw command ID trên tab View (1440px)", audit1440.rawIds.join(", "));
  assert(audit1440.blackDots.length === 0, "100% nút có vector icon thật, không có fallback chấm tròn đen (1440px)", audit1440.blackDots.join(", "));

  // 2. Mở dropdown "Cố định ô" và kiểm tra menu con
  await page.click('[data-dropdown-id="sheet.view.freezePanesMenu"]');
  await page.waitForTimeout(200);

  const menuAudit = await page.evaluate(() => {
    const menu = document.querySelector(".vno-ribbon-dropdown-menu");
    if (!menu) return { found: false };
    const items = Array.from(menu.querySelectorAll(".vno-ribbon-dropdown-item"));
    const details = items.map(it => ({
      commandId: it.getAttribute("data-command-id"),
      label: it.querySelector(".vno-menu-item-label")?.textContent?.trim(),
      hasBlackDot: it.innerHTML.includes('circle cx="12" cy="12" r="4"'),
      hasIcon: Boolean(it.querySelector("svg")),
      isChecked: it.classList.contains("is-checked")
    }));
    return { found: true, details };
  });

  assert(menuAudit.found && menuAudit.details.length === 3, "Menu thả xuống Cố định ô hiển thị đủ 3 tùy chọn", JSON.stringify(menuAudit.details));
  const blackDotInMenu = menuAudit.details.filter(d => d.hasBlackDot);
  assert(blackDotInMenu.length === 0, "Mọi mục trong menu Cố định ô có icon chuẩn, không bị fallback chấm tròn đen", JSON.stringify(blackDotInMenu));

  // Click vào Freeze Top Row
  await page.click('.vno-ribbon-dropdown-item[data-command-id="sheet.view.freezeTopRow"]');
  await page.waitForTimeout(200);

  // Mở lại menu để kiểm tra trạng thái checked
  await page.click('[data-dropdown-id="sheet.view.freezePanesMenu"]');
  await page.waitForTimeout(200);
  const checkedAudit = await page.evaluate(() => {
    const topRowItem = document.querySelector('.vno-ribbon-dropdown-item[data-command-id="sheet.view.freezeTopRow"]');
    return {
      topRowChecked: topRowItem?.classList.contains("is-checked") || topRowItem?.getAttribute("aria-checked") === "true"
    };
  });
  assert(checkedAudit.topRowChecked, "Lệnh Cố định hàng trên cùng cập nhật trạng thái checked", JSON.stringify(checkedAudit));

  // Đóng dropdown
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  // 3. Kiểm tra nhóm Hiển thị (Show) chuẩn Checkbox Office 2016 (LOI 1)
  const showAudit = await page.evaluate(() => {
    const showGroup = document.querySelector('.vno-ribbon-group[data-group-id="show"]');
    if (!showGroup) return { found: false };
    const items = Array.from(showGroup.querySelectorAll('button'));
    const details = items.map(btn => {
      const style = window.getComputedStyle(btn);
      const box = btn.querySelector('.vno-checkbox-box');
      const checkSvg = box?.querySelector('.vno-checkbox-check');
      return {
        id: btn.getAttribute('data-command-id'),
        role: btn.getAttribute('role'),
        ariaChecked: btn.getAttribute('aria-checked'),
        hasCheckboxBox: Boolean(box),
        hasCheckSvg: Boolean(checkSvg),
        backgroundColor: style.backgroundColor,
        isTransparentBg: style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent'
      };
    });
    return { found: true, count: items.length, details };
  });

  assert(showAudit.found && showAudit.count === 3, "Nhóm Hiển thị có đủ 3 mục checkbox", JSON.stringify(showAudit));
  const nonCheckbox = showAudit.details.filter(d => d.role !== "checkbox");
  assert(nonCheckbox.length === 0, "100% mục trong nhóm Hiển thị có role='checkbox'", JSON.stringify(nonCheckbox));
  const initialChecked = showAudit.details.find(d => d.id === "sheet.view.gridlines")?.ariaChecked;
  assert(initialChecked === "true" || initialChecked === "false", "Mục Đường lưới có aria-checked hợp lệ", `ariaChecked=${initialChecked}`);
  const nonTransparent = showAudit.details.filter(d => !d.isTransparentBg);
  assert(nonTransparent.length === 0, "Mục trong nhóm Hiển thị có nền trong suốt ở trạng thái nghỉ (không bị thanh nền xanh lá)", JSON.stringify(nonTransparent));

  // Kiểm tra click đổi aria-checked trên checkbox Đường lưới
  const gridBtn = page.locator('button[data-command-id="sheet.view.gridlines"]');
  const prevAriaChecked = await gridBtn.getAttribute("aria-checked");
  await gridBtn.click();
  await page.waitForTimeout(200);
  const nextAriaChecked = await gridBtn.getAttribute("aria-checked");
  assert(nextAriaChecked !== prevAriaChecked, "Click vào checkbox Đường lưới đổi aria-checked", `${prevAriaChecked} -> ${nextAriaChecked}`);

  // Kiểm tra phím Space kích hoạt checkbox (keyboard accessibility)
  await gridBtn.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  const spaceAriaChecked = await gridBtn.getAttribute("aria-checked");
  assert(spaceAriaChecked === prevAriaChecked, "Bấm phím Space trên checkbox Đường lưới đổi lại aria-checked", `${nextAriaChecked} -> ${spaceAriaChecked}`);

  // Kiểm tra phím Enter kích hoạt checkbox
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const enterAriaChecked = await gridBtn.getAttribute("aria-checked");
  assert(enterAriaChecked === nextAriaChecked, "Bấm phím Enter trên checkbox Đường lưới đổi tiếp aria-checked", `${spaceAriaChecked} -> ${enterAriaChecked}`);

  // Khôi phục lại trạng thái ban đầu
  if (enterAriaChecked !== prevAriaChecked) {
    await gridBtn.click();
    await page.waitForTimeout(100);
  }

  // 4. Kiểm tra căn hàng nhãn nhóm (Group labels baseline) không bị đẩy sát hay đè mép dưới ribbon (LOI 2)
  const labelsAudit = await page.evaluate(() => {
    const panel = document.getElementById("vno-ribbon-tabpanel-view");
    const panelRect = panel.getBoundingClientRect();
    const groups = Array.from(panel.querySelectorAll(".vno-ribbon-group"));
    const details = groups.map(g => {
      const id = g.getAttribute("data-group-id");
      const labelEl = g.querySelector(".vno-ribbon-group-label");
      const rect = labelEl?.getBoundingClientRect();
      return {
        id,
        label: labelEl?.textContent?.trim(),
        top: rect ? Math.round(rect.top) : null,
        bottom: rect ? Math.round(rect.bottom) : null,
        panelBottom: Math.round(panelRect.bottom),
        overlapsBottom: rect ? rect.bottom > panelRect.bottom : false
      };
    });
    const overlapping = details.filter(d => d.overlapsBottom);
    const tops = details.map(d => d.top).filter(t => t !== null);
    const maxDiff = Math.max(...tops) - Math.min(...tops);
    return { details, overlapping, maxDiff };
  });

  assert(labelsAudit.overlapping.length === 0, "Không có nhãn nhóm nào bị đè hoặc chạm mép dưới ribbon", JSON.stringify(labelsAudit.overlapping));
  assert(labelsAudit.maxDiff <= 1, "Mọi nhãn nhóm nằm thẳng hàng trên cùng một đường chân (baseline diff <= 1px)", `maxDiff=${labelsAudit.maxDiff}px`);

  // 5. Kiểm tra Chế độ Tối (Dark mode)
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(200);
  const darkModeAudit = await page.evaluate(() => {
    const showGroup = document.querySelector('.vno-ribbon-group[data-group-id="show"]');
    const btn = showGroup?.querySelector('button[data-command-id="sheet.view.gridlines"]');
    const box = btn?.querySelector('.vno-checkbox-box');
    const btnStyle = btn ? window.getComputedStyle(btn) : null;
    const boxStyle = box ? window.getComputedStyle(box) : null;
    return {
      btnBg: btnStyle?.backgroundColor,
      isTransparent: btnStyle?.backgroundColor === 'rgba(0, 0, 0, 0)' || btnStyle?.backgroundColor === 'transparent',
      boxBorderColor: boxStyle?.borderColor,
      boxBg: boxStyle?.backgroundColor
    };
  });
  assert(darkModeAudit.isTransparent, "Checkbox ở Dark mode giữ nền trong suốt ở trạng thái nghỉ", JSON.stringify(darkModeAudit));

  // Trở về Light mode
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-theme");
  });
  await page.waitForTimeout(100);

  // 6. Kiểm tra responsive ở 1024px
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);

  const audit1024 = await page.evaluate(() => {
    const panel = document.getElementById("vno-ribbon-tabpanel-view");
    return {
      clientWidth: panel.clientWidth,
      scrollWidth: panel.scrollWidth,
      hasOverflow: panel.scrollWidth > panel.clientWidth + 2
    };
  });
  assert(!audit1024.hasOverflow, "Ribbon View Tab không tràn ngang ở 1024px", `client=${audit1024.clientWidth} scroll=${audit1024.scrollWidth}`);

  // 7. Kiểm tra thực thi các lệnh View qua globalCommandBus
  const execAudit = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const results = {};
    results.normal = await globalCommandBus.execute("sheet.view.normal");
    results.pageBreak = await globalCommandBus.execute("sheet.view.pageBreakPreview");
    results.pageLayout = await globalCommandBus.execute("sheet.view.pageLayout");
    results.gridlines = await globalCommandBus.execute("sheet.view.gridlines");
    results.formulaBar = await globalCommandBus.execute("sheet.view.formulaBar");
    results.headings = await globalCommandBus.execute("sheet.view.headings");
    results.zoomIn = await globalCommandBus.execute("sheet.view.zoomIn");
    results.zoomOut = await globalCommandBus.execute("sheet.view.zoomOut");
    results.zoomReset = await globalCommandBus.execute("sheet.view.zoomReset");
    results.zoomSelection = await globalCommandBus.execute("sheet.view.zoomToSelection");
    return results;
  });

  assert(execAudit.normal !== false, "Lệnh sheet.view.normal thực thi thành công", String(execAudit.normal));
  assert(execAudit.pageBreak !== false, "Lệnh sheet.view.pageBreakPreview thực thi thành công", String(execAudit.pageBreak));
  assert(execAudit.pageLayout !== false, "Lệnh sheet.view.pageLayout thực thi thành công", String(execAudit.pageLayout));
  assert(typeof execAudit.gridlines === "boolean", "Lệnh sheet.view.gridlines thực thi thành công (toggle boolean)", String(execAudit.gridlines));
  assert(typeof execAudit.formulaBar === "boolean", "Lệnh sheet.view.formulaBar thực thi thành công (toggle boolean)", String(execAudit.formulaBar));
  assert(typeof execAudit.headings === "boolean", "Lệnh sheet.view.headings thực thi thành công (toggle boolean)", String(execAudit.headings));
  assert(execAudit.zoomIn !== false, "Lệnh sheet.view.zoomIn thực thi thành công", String(execAudit.zoomIn));

  assert(errors.length === 0, "Không phát sinh lỗi JavaScript (0 pageerror)", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) {
  console.error(`CÓ ${failures.length} KIỂM THỬ THẤT BẠI:`, failures);
  process.exitCode = 1;
} else {
  console.log("TOÀN BỘ KIỂM THỬ PLAYWRIGHT SHEET VIEW TAB ĐÃ ĐẠT (PASS)!");
}
