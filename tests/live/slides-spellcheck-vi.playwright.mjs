import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_SPELLCHECK_PORT || 8798);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : decodeURIComponent(request.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("vno-spellcheck-vi-personal"));
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-slide-canvas[data-spellcheck-status="ready"]').waitFor();
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("slides.view.zoomOut");
  });

  const title = page.locator(".vno-slide-title");
  await title.fill("");
  await title.click();
  await page.keyboard.type("Giáo viên hướng dẫn chínnh tả tiếng Việt.");
  const marker = page.locator('.vno-slide-title [data-vno-spelling-uncertain="chínnh"]');
  await marker.waitFor({ timeout: 2500 });

  const geometry = await marker.evaluate(element => {
    const markerRect = element.getBoundingClientRect();
    const canvasRect = element.closest(".vno-slide-canvas").getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      decorationLine: style.textDecorationLine,
      decorationStyle: style.textDecorationStyle,
      decorationColor: style.textDecorationColor,
      marker: { left: markerRect.left, top: markerRect.top, right: markerRect.right, bottom: markerRect.bottom, width: markerRect.width },
      canvas: { left: canvasRect.left, top: canvasRect.top, right: canvasRect.right, bottom: canvasRect.bottom }
    };
  });
  assert(geometry.decorationLine.includes("underline") && geometry.decorationStyle === "wavy", "Marker CSS gạch chân lượn sóng xuất hiện thật", JSON.stringify(geometry));
  assert(geometry.marker.width > 0 && geometry.canvas.right - geometry.canvas.left < 960 && geometry.marker.left >= geometry.canvas.left && geometry.marker.right <= geometry.canvas.right && geometry.marker.top >= geometry.canvas.top && geometry.marker.bottom <= geometry.canvas.bottom, "Marker nằm đúng trong canvas tuyệt đối sau transform/scale", JSON.stringify(geometry));

  const screenshotPath = path.join(os.tmpdir(), "slides-spellcheck-vi.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`INFO\tẢnh kiểm chứng: ${screenshotPath}`);

  await marker.click({ button: "right" });
  const menu = page.locator('.vno-spellcheck-menu[role="menu"]');
  await menu.waitFor();
  assert(await menu.locator(".vno-spellcheck-suggestion", { hasText: "chính" }).count() > 0, "Menu chuột phải có gợi ý chính");
  await menu.getByRole("menuitem", { name: "Thêm vào từ điển", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-vno-spelling-uncertain="chínnh"]'));
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("vno-spellcheck-vi-personal") || "[]"));
  assert(persisted.includes("chínnh"), "Thêm vào từ điển lưu qua shared localStorage", JSON.stringify(persisted));

  await title.fill("saaai");
  const oldSlideMarker = page.locator('[data-vno-spelling-uncertain="saaai"]');
  await oldSlideMarker.waitFor({ timeout: 2500 });
  await page.locator(".vno-slide-thumb-item").nth(1).click();
  await page.waitForFunction(() => !document.querySelector('[data-vno-spelling-uncertain="saaai"]'));
  assert(await oldSlideMarker.count() === 0, "Chuyển slide tháo marker của slide trước, không rò rỉ DOM");

  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("slides.shape.insert");
  });
  const shape = page.locator(".vno-slide-shape-item").last();
  await shape.dblclick();
  const shapeText = shape.locator('.vno-diagram-node-text[contenteditable="true"]');
  await shapeText.fill("vănn bản");
  const shapeMarker = shape.locator('[data-vno-spelling-uncertain="vănn"]');
  await shapeMarker.waitFor({ timeout: 2500 });
  assert(await shapeMarker.count() === 1, "Text trong shape độc lập được controller mới bắt lỗi thật");
  assert(pageErrors.length === 0, "Không có pageerror", pageErrors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
