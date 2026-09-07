/**
 * Live: VN Slides Text Vertical Align & Direction Dropdown Checked State
 * Xác nhận trạng thái hiển thị (checked/aria-checked) cho 2 dropdown ribbon:
 * Căn lề văn bản (slides.text.vAlign) và Hướng văn bản (slides.text.direction).
 * Quy trình:
 * 1. Mở trình duyệt thật, tạo 1 hình thật, chọn hình.
 * 2. Mở dropdown Hướng văn bản, bấm "Xoay chữ 90°" (slides.text.directionVertical).
 * 3. Đóng dropdown, mở lại dropdown Hướng văn bản:
 *    - Xác nhận item "Xoay chữ 90°" có aria-checked="true" và class is-checked.
 *    - Xác nhận 3 item còn lại (Ngang, Xoay chữ 270°, Xếp chồng) có aria-checked="false".
 * 4. Mở dropdown Căn lề văn bản, bấm "Căn lề trên" (slides.text.vAlignTop).
 * 5. Đóng dropdown, mở lại dropdown Căn lề văn bản:
 *    - Xác nhận item "Căn lề trên" có aria-checked="true" và class is-checked.
 *    - Xác nhận 2 item còn lại (Căn giữa dọc, Căn lề dưới) có aria-checked="false".
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_CHECKED_PORT || 8946);
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
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const assert = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  page.on("pageerror", error => console.error("PAGEERROR", error.message));

  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "load" });
  await page.locator('.vno-shell[data-app="slides"]').waitFor({ timeout: 15000 });
  await page.locator(".vno-slide-canvas").waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);

  // Tạo 1 hình thật và chọn hình
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[canvas.currentSlideIndex].shapes = [
      { id: "t1", type: "rect", x: 60, y: 60, w: 220, h: 120, color: "#3b82f6", text: "Văn bản kiểm thử checked" }
    ];
    canvas.setSelectedShapes(["t1"]);
    canvas._renderShapesLayer();
  });

  const openDropdown = async (id) => {
    await page.locator(`[data-dropdown-id="${id}"]`).click();
    const menu = page.locator(".vno-ribbon-dropdown-menu");
    await menu.waitFor({ state: "visible", timeout: 3000 });
    return menu;
  };

  const closeDropdown = async () => {
    await page.keyboard.press("Escape");
    await page.locator(".vno-ribbon-dropdown-menu").waitFor({ state: "detached", timeout: 3000 });
  };

  // ========================================================
  // 1. Kiểm tra Dropdown Hướng văn bản (slides.text.direction)
  // ========================================================
  console.log("Bước 1: Mở dropdown Hướng văn bản và chọn 'Xoay chữ 90°'...");
  let menu = await openDropdown("slides.text.direction");
  await menu.locator('[data-command-id="slides.text.directionVertical"]').click();
  await page.waitForTimeout(150);

  // Mở lại dropdown Hướng văn bản và kiểm tra aria-checked của cả 4 item
  console.log("Bước 2: Mở lại dropdown Hướng văn bản và xác nhận checked state...");
  menu = await openDropdown("slides.text.direction");
  const dirItems = await menu.locator(".vno-ribbon-dropdown-item").evaluateAll(nodes => {
    return nodes.map(n => ({
      commandId: n.getAttribute("data-command-id"),
      role: n.getAttribute("role"),
      ariaChecked: n.getAttribute("aria-checked"),
      hasCheckedClass: n.classList.contains("is-checked")
    }));
  });

  const dirVertical = dirItems.find(i => i.commandId === "slides.text.directionVertical");
  assert(dirVertical, "Không tìm thấy item slides.text.directionVertical trong dropdown Hướng văn bản");
  assert(dirVertical.ariaChecked === "true", "Item 'Xoay chữ 90°' phải có aria-checked='true'", JSON.stringify(dirVertical));
  assert(dirVertical.hasCheckedClass === true, "Item 'Xoay chữ 90°' phải có class is-checked", JSON.stringify(dirVertical));

  const otherDirCommands = ["slides.text.directionHorizontal", "slides.text.directionVertical270", "slides.text.directionStacked"];
  for (const cmdId of otherDirCommands) {
    const item = dirItems.find(i => i.commandId === cmdId);
    assert(item, `Không tìm thấy item ${cmdId} trong dropdown Hướng văn bản`);
    assert(item.ariaChecked === "false", `Item ${cmdId} phải có aria-checked='false'`, JSON.stringify(item));
    assert(item.hasCheckedClass === false, `Item ${cmdId} không được có class is-checked`, JSON.stringify(item));
  }
  await closeDropdown();

  // ========================================================
  // 2. Kiểm tra Dropdown Căn lề văn bản (slides.text.vAlign)
  // ========================================================
  console.log("Bước 3: Mở dropdown Căn lề văn bản và chọn 'Căn lề trên'...");
  menu = await openDropdown("slides.text.vAlign");
  await menu.locator('[data-command-id="slides.text.vAlignTop"]').click();
  await page.waitForTimeout(150);

  // Mở lại dropdown Căn lề văn bản và kiểm tra aria-checked của cả 3 item
  console.log("Bước 4: Mở lại dropdown Căn lề văn bản và xác nhận checked state...");
  menu = await openDropdown("slides.text.vAlign");
  const vAlignItems = await menu.locator(".vno-ribbon-dropdown-item").evaluateAll(nodes => {
    return nodes.map(n => ({
      commandId: n.getAttribute("data-command-id"),
      role: n.getAttribute("role"),
      ariaChecked: n.getAttribute("aria-checked"),
      hasCheckedClass: n.classList.contains("is-checked")
    }));
  });

  const vAlignTop = vAlignItems.find(i => i.commandId === "slides.text.vAlignTop");
  assert(vAlignTop, "Không tìm thấy item slides.text.vAlignTop trong dropdown Căn lề văn bản");
  assert(vAlignTop.ariaChecked === "true", "Item 'Căn lề trên' phải có aria-checked='true'", JSON.stringify(vAlignTop));
  assert(vAlignTop.hasCheckedClass === true, "Item 'Căn lề trên' phải có class is-checked", JSON.stringify(vAlignTop));

  const otherVAlignCommands = ["slides.text.vAlignMiddle", "slides.text.vAlignBottom"];
  for (const cmdId of otherVAlignCommands) {
    const item = vAlignItems.find(i => i.commandId === cmdId);
    assert(item, `Không tìm thấy item ${cmdId} trong dropdown Căn lề văn bản`);
    assert(item.ariaChecked === "false", `Item ${cmdId} phải có aria-checked='false'`, JSON.stringify(item));
    assert(item.hasCheckedClass === false, `Item ${cmdId} không được có class is-checked`, JSON.stringify(item));
  }
  await closeDropdown();

  console.log("PASS: Cả 2 dropdown Căn lề văn bản và Hướng văn bản hiển thị chính xác trạng thái checked/aria-checked khi mở lại!");
} finally {
  await browser?.close();
  server.close();
}
