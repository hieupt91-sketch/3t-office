import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_EDITING_PORT || 8796);
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
  if (reqPath === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";
  const relative = path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("403");
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`[Test Server] http://127.0.0.1:${port}`);

function assert(condition, message, extra) {
  if (!condition) throw new Error(extra ? `${message}: ${extra}` : message);
}

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--disable-http-cache", "--disk-cache-size=1"]
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  console.log("=== BẮT ĐẦU PLAYWRIGHT LIVE: SLIDES EDITING GROUP ===");
  await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vno-shell[data-app="slides"]', { timeout: 10000 });
  await page.waitForTimeout(250);

  const editingGroup = page.locator('.vno-ribbon-group[data-group-id="editing"]');
  await editingGroup.scrollIntoViewIfNeeded();
  await editingGroup.waitFor({ state: "visible", timeout: 5000 });
  const isLast = await editingGroup.evaluate(group => group === group.parentElement?.lastElementChild);
  assert(isLast, "Nhóm Chỉnh sửa phải nằm cuối tab Home");
  assert((await editingGroup.locator(".vno-ribbon-group-label").textContent())?.trim() === "Chỉnh sửa", "Nhãn nhóm Chỉnh sửa");
  assert(await editingGroup.locator('[data-command-id="common.edit.find"]').isVisible(), "Nút Tìm kiếm");
  assert(await editingGroup.locator('[data-command-id="common.edit.replace"]').isVisible(), "Nút Thay thế");
  assert(await editingGroup.locator('[data-dropdown-id="slides.edit.select"]').isVisible(), "Dropdown Chọn");
  console.log("  ✓ Nhóm Chỉnh sửa cuối Home: Tìm kiếm / Thay thế / Chọn");

  await editingGroup.locator('[data-command-id="common.edit.find"]').click();
  await page.locator("#vno-fr-find-input").waitFor({ state: "visible", timeout: 3000 });
  assert(await page.locator("#vno-fr-replace-group").isHidden() || getComputedStyle, "Dialog tìm đã mở");
  const replaceHidden = await page.locator("#vno-fr-replace-group").evaluate(el => getComputedStyle(el).display === "none");
  assert(replaceHidden, "Find không hiện ô thay thế mặc định");
  await page.locator(".vno-fr-close").first().click();
  await page.waitForTimeout(80);

  await editingGroup.locator('[data-command-id="common.edit.replace"]').click();
  await page.locator("#vno-fr-find-input").waitFor({ state: "visible", timeout: 3000 });
  const replaceShown = await page.locator("#vno-fr-replace-group").evaluate(el => getComputedStyle(el).display !== "none");
  assert(replaceShown, "Replace phải hiện ô thay thế");
  await page.locator(".vno-fr-close").first().click();
  console.log("  ✓ Click Tìm kiếm / Thay thế mở đúng hộp thoại (click thật, không SendKeys)");

  const replaced = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides[0].title = "Báo cáo chi phí A";
    canvas.slides[0].body = "Tổng chi phí ban đầu";
    canvas.slides[0].shapes = [{ id: 99, type: "rect", x: 40, y: 40, w: 80, h: 40, text: "ghi chú" }];
    if (!canvas.slides[1]) canvas.addNewSlide(false);
    canvas.slides[1].title = "Kế hoạch";
    canvas.slides[1].body = "chi phí nhân sự năm nay";
    canvas.slides[1].shapes = [{ id: 100, type: "ellipse", x: 20, y: 20, w: 60, h: 40, text: "nhân sự" }];
    canvas.selectSlide(0);
    const found = [];
    let hit = canvas.findNext("chi phí");
    while (hit && found.length < 5) {
      found.push({ slide: hit.slideIndex, field: hit.field, text: hit.text });
      hit = canvas.findNext("chi phí");
      if (found.some(item => item.slide === hit?.slideIndex && item.field === hit?.field && item.text === hit?.text)) break;
    }
    const count = canvas.replaceAll("chi phí", "ngân sách");
    const after = {
      t0: canvas.slides[0].title,
      b0: canvas.slides[0].body,
      b1: canvas.slides[1].body
    };
    const undone = canvas.undo();
    const restored = {
      t0: canvas.slides[0].title,
      b0: canvas.slides[0].body,
      b1: canvas.slides[1].body
    };
    canvas.selectAllShapes();
    const selected = [...canvas.selectedShapeIds];
    return { found, count, after, undone, restored, selected, indexAfterFind: found[found.length - 1]?.slide };
  });
  assert(replaced.found.length >= 2, "Phải tìm thấy chi phí trên nhiều slide", JSON.stringify(replaced.found));
  assert(replaced.found.some(item => item.slide === 0) && replaced.found.some(item => item.slide === 1), "Find phải xuyên suốt nhiều slide", JSON.stringify(replaced.found));
  assert(replaced.count >= 2, "Replace all phải đổi ít nhất 2 chỗ", String(replaced.count));
  assert(replaced.after.t0 === "Báo cáo ngân sách A", "Title slide 0 phải đổi", replaced.after.t0);
  assert(replaced.after.b0.includes("ngân sách"), "Body slide 0 phải đổi", replaced.after.b0);
  assert(replaced.after.b1.includes("ngân sách"), "Body slide 1 phải đổi", replaced.after.b1);
  assert(replaced.undone === true, "Undo phải chạy");
  assert(replaced.restored.t0 === "Báo cáo chi phí A", "Undo phải trả title", replaced.restored.t0);
  assert(replaced.restored.b1.includes("chi phí"), "Undo phải trả body slide 1", replaced.restored.b1);
  console.log("  ✓ Find xuyên suốt nhiều slide; Replace All đổi nội dung; Undo khôi phục");

  await editingGroup.locator('[data-dropdown-id="slides.edit.select"]').click();
  const menu = page.locator(".vno-ribbon-dropdown-menu");
  await menu.waitFor({ state: "visible", timeout: 3000 });
  const selectAll = menu.locator('[data-command-id="slides.edit.selectAll"]');
  await selectAll.click();
  const selected = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return [...globalUnoBridge.activeDocument.canvas.selectedShapeIds];
  });
  assert(selected.length >= 1, "Chọn tất cả phải chọn ít nhất 1 hình", JSON.stringify(selected));
  console.log("  ✓ Dropdown Chọn > Chọn tất cả chọn hình trên slide hiện tại");

  await page.locator(".vno-ribbon-tab").filter({ hasText: "Trợ giúp" }).click();
  await page.locator('[data-command-id="slides.help.open"]').click();
  await page.locator(".vno-help-panel:not([hidden])").waitFor({ state: "visible" });
  await page.locator(".vno-help-search").fill("tìm kiếm");
  await page.waitForTimeout(150);
  const helpHit = await page.locator(".vno-help-panel").innerText();
  assert(helpHit.toLowerCase().includes("thay thế") || helpHit.toLowerCase().includes("tìm"), "Help phải tìm được bài Tìm/Thay", helpHit.slice(0, 240));
  console.log("  ✓ Help tìm được Tìm kiếm và Thay thế");

  assert(pageErrors.length === 0, "Không được có pageerror", pageErrors.join(" | "));
  console.log("=== PASS: SLIDES EDITING GROUP LIVE ===");
} finally {
  await browser.close();
  server.close();
}
