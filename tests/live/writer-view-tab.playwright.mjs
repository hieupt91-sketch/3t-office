import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_VIEW_PORT || 8793);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": path.extname(file) === ".css" ? "text/css" : path.extname(file) === ".js" ? "text/javascript" : "text/html" });
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

  const result = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const pageEl = document.querySelector(".vno-writer-page");
    const container = document.querySelector(".vno-writer-container");
    const ruler = document.querySelector(".vno-writer-ruler");
    const states = {};

    states.webResult = await globalCommandBus.execute("writer.view.webLayout");
    states.web = container.classList.contains("vno-writer-web-layout") && getComputedStyle(pageEl).width === getComputedStyle(document.querySelector(".vno-writer-viewport")).width;
    states.printResult = await globalCommandBus.execute("writer.view.printLayout");
    states.print = !container.classList.contains("vno-writer-web-layout");

    states.rulerOffResult = await globalCommandBus.execute("writer.view.ruler");
    states.rulerOff = ruler.hidden && globalCommandBus.getState("writer.view.ruler").checked === false;
    states.rulerOnResult = await globalCommandBus.execute("writer.view.ruler");
    states.rulerOn = !ruler.hidden && globalCommandBus.getState("writer.view.ruler").checked === true;

    states.gridResult = await globalCommandBus.execute("writer.view.gridlines");
    states.grid = container.classList.contains("vno-writer-gridlines");
    states.zoomIn = await globalCommandBus.execute("writer.view.zoomIn");
    states.zoomTransform = pageEl.style.transform;
    states.zoomOut = await globalCommandBus.execute("writer.view.zoomOut");
    states.zoom100 = await globalCommandBus.execute("writer.view.zoom100");
    states.pageWidth = await globalCommandBus.execute("writer.view.pageWidth");
    states.pageWidthClass = container.classList.contains("vno-writer-page-width");

    states.readResult = await globalCommandBus.execute("writer.view.readMode");
    states.read = document.querySelector(".vno-shell")?.classList.contains("vno-writer-read-mode") &&
      Boolean(document.querySelector(".vno-writer-read-toolbar"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    states.escaped = !document.querySelector(".vno-shell")?.classList.contains("vno-writer-read-mode") &&
      globalCommandBus.getState("writer.view.printLayout").checked === true;

    const originalOpen = window.open;
    window.open = () => ({});
    states.newWindow = await globalCommandBus.execute("writer.view.newWindow");
    window.open = originalOpen;
    states.history = globalCommandBus.getHistory().filter(item => item.commandId.startsWith("writer.view.")).map(item => item.commandId);
    return states;
  });

  assert(result.webResult === "webLayout" && result.web, "Web Layout chạy qua globalCommandBus", JSON.stringify(result));
  assert(result.printResult === "printLayout" && result.print, "Print Layout khôi phục trang", JSON.stringify(result));
  assert(result.rulerOffResult === false && result.rulerOff && result.rulerOnResult === true && result.rulerOn, "Ruler toggle và checked state", JSON.stringify(result));
  assert(result.gridResult === true && result.grid, "Gridlines toggle chỉ đổi view class", JSON.stringify(result));
  assert(result.zoomIn === 1.1 && result.zoomTransform === "scale(1.1)" && result.zoomOut === 1 && result.zoom100 === 1, "Zoom In/Out/100 dùng CSS scale", JSON.stringify(result));
  assert(result.pageWidth >= 0.5 && result.pageWidth <= 2 && result.pageWidthClass, "Page Width tính zoom theo viewport", JSON.stringify(result));
  assert(result.readResult === "readMode" && result.read && result.escaped, "Read Mode ẩn chrome và Esc về Print Layout", JSON.stringify(result));
  assert(result.newWindow === true, "New Window gọi API cửa sổ thật", JSON.stringify(result));
  assert(result.history.length >= 11, "Mọi thao tác được ghi nhận qua globalCommandBus.execute", JSON.stringify(result.history));

  // 2. Chuyển sang tab Chế độ xem để kiểm tra trực quan Ribbon (LOI 1 & LOI 2)
  await page.click("#vno-ribbon-tab-view");
  await page.waitForTimeout(200);

  // Kiểm tra nhóm Hiển thị (Show) của Writer: checkbox chuẩn Office 2016
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

  assert(showAudit.found && showAudit.count === 2, "Writer - Nhóm Hiển thị có đủ 2 mục Thước kẻ & Đường lưới", JSON.stringify(showAudit));
  const nonCheckbox = showAudit.details.filter(d => d.role !== "checkbox");
  assert(nonCheckbox.length === 0, "Writer - 100% mục trong nhóm Hiển thị có role='checkbox'", JSON.stringify(nonCheckbox));
  const nonTransparent = showAudit.details.filter(d => !d.isTransparentBg);
  assert(nonTransparent.length === 0, "Writer - Mục trong nhóm Hiển thị có nền trong suốt ở trạng thái nghỉ (không bị nền xám nhạt)", JSON.stringify(nonTransparent));

  // Kiểm tra click đổi aria-checked trên checkbox Thước kẻ
  const rulerBtn = page.locator('button[data-command-id="writer.view.ruler"]');
  const prevAriaChecked = await rulerBtn.getAttribute("aria-checked");
  await rulerBtn.click();
  await page.waitForTimeout(200);
  const nextAriaChecked = await rulerBtn.getAttribute("aria-checked");
  assert(nextAriaChecked !== prevAriaChecked, "Writer - Click vào checkbox Thước kẻ đổi aria-checked", `${prevAriaChecked} -> ${nextAriaChecked}`);

  // Kiểm tra phím Space kích hoạt checkbox
  await rulerBtn.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  const spaceAriaChecked = await rulerBtn.getAttribute("aria-checked");
  assert(spaceAriaChecked === prevAriaChecked, "Writer - Bấm phím Space trên checkbox Thước kẻ đổi lại aria-checked", `${nextAriaChecked} -> ${spaceAriaChecked}`);

  // Kiểm tra phím Enter kích hoạt checkbox
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const enterAriaChecked = await rulerBtn.getAttribute("aria-checked");
  assert(enterAriaChecked === nextAriaChecked, "Writer - Bấm phím Enter trên checkbox Thước kẻ đổi tiếp aria-checked", `${spaceAriaChecked} -> ${enterAriaChecked}`);

  // 3. Kiểm tra bố cục nhóm Thu phóng và căn hàng nhãn nhóm (LOI 2)
  const layoutAudit = await page.evaluate(() => {
    const panel = document.getElementById("vno-ribbon-tabpanel-view");
    const panelRect = panel.getBoundingClientRect();
    const groups = Array.from(panel.querySelectorAll(".vno-ribbon-group"));
    const details = groups.map(g => {
      const id = g.getAttribute("data-group-id");
      const labelEl = g.querySelector(".vno-ribbon-group-label");
      const rect = labelEl?.getBoundingClientRect();
      const itemsEl = g.querySelector(".vno-ribbon-group-items");
      const itemsH = itemsEl ? Math.round(itemsEl.getBoundingClientRect().height) : null;
      return {
        id,
        label: labelEl?.textContent?.trim(),
        top: rect ? Math.round(rect.top) : null,
        bottom: rect ? Math.round(rect.bottom) : null,
        panelBottom: Math.round(panelRect.bottom),
        itemsH,
        overlapsBottom: rect ? rect.bottom > panelRect.bottom : false
      };
    });
    const overlapping = details.filter(d => d.overlapsBottom);
    const tops = details.map(d => d.top).filter(t => t !== null);
    const maxDiff = Math.max(...tops) - Math.min(...tops);
    const zoomGroup = details.find(d => d.id === "zoom");
    return { details, overlapping, maxDiff, zoomGroup, hasOverflow: panel.scrollWidth > panel.clientWidth + 2 };
  });

  assert(layoutAudit.overlapping.length === 0, "Writer - Không có nhãn nhóm nào bị đè hoặc chạm mép dưới ribbon (1440px)", JSON.stringify(layoutAudit.overlapping));
  assert(layoutAudit.maxDiff <= 1, "Writer - Mọi nhãn nhóm nằm thẳng hàng trên cùng một đường chân (baseline diff <= 1px)", `maxDiff=${layoutAudit.maxDiff}px`);
  assert(layoutAudit.zoomGroup?.itemsH === 72, "Writer - Nhóm Thu phóng có items height chuẩn 72px như các nhóm khác", `itemsH=${layoutAudit.zoomGroup?.itemsH}`);
  assert(!layoutAudit.hasOverflow, "Writer - Ribbon View Tab không tràn ngang ở 1440px");

  // 4. Kiểm tra Chế độ Tối (Dark mode)
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(200);
  const darkModeAudit = await page.evaluate(() => {
    const showGroup = document.querySelector('.vno-ribbon-group[data-group-id="show"]');
    const btn = showGroup?.querySelector('button[data-command-id="writer.view.ruler"]');
    const style = btn ? window.getComputedStyle(btn) : null;
    return {
      isTransparent: style?.backgroundColor === 'rgba(0, 0, 0, 0)' || style?.backgroundColor === 'transparent'
    };
  });
  assert(darkModeAudit.isTransparent, "Writer - Checkbox ở Dark mode giữ nền trong suốt ở trạng thái nghỉ");

  // Khôi phục Light mode
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await page.waitForTimeout(100);

  // 5. Kiểm tra responsive ở 1024px
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
  assert(!audit1024.hasOverflow, "Writer - Ribbon View Tab không tràn ngang ở 1024px", `client=${audit1024.clientWidth} scroll=${audit1024.scrollWidth}`);

  assert(errors.length === 0, "Không có pageerror", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
