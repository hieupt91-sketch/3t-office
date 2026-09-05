import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_SPELLCHECK_PORT || 8797);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".dic": "text/plain; charset=utf-8" };

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
  await page.locator('.vno-writer-page[data-spellcheck-status="ready"]').waitFor();

  const editor = page.locator(".vno-writer-body");
  await editor.evaluate(element => { element.innerHTML = "<p><br></p>"; });
  await editor.click();
  await page.keyboard.type("Giáo viên hướng dẫn học sinh viết chínnh tả tiếng Việt.");
  const marker = page.locator('.vno-spelling-uncertain[data-vno-spelling-uncertain="chínnh"]');
  await marker.waitFor({ timeout: 2500 });

  const state = await page.evaluate(() => {
    const marked = document.querySelector('.vno-spelling-uncertain[data-vno-spelling-uncertain="chínnh"]');
    const style = getComputedStyle(marked);
    const rect = marked.getBoundingClientRect();
    return {
      markedWords: [...document.querySelectorAll(".vno-writer-body .vno-spelling-uncertain")].map(element => element.textContent),
      className: marked.className,
      decorationLine: style.textDecorationLine,
      decorationStyle: style.textDecorationStyle,
      decorationColor: style.textDecorationColor,
      rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }
    };
  });
  assert(state.markedWords.length === 1 && state.markedWords[0] === "chínnh", "Chỉ từ sai bị đánh dấu", JSON.stringify(state));
  assert(state.className.includes("vno-spelling-uncertain") && state.decorationLine.includes("underline") && state.decorationStyle === "wavy", "Gạch chân CSS đỏ dạng lượn sóng xuất hiện thật", JSON.stringify(state));
  assert(state.rect.width > 0 && state.rect.height > 0 && state.rect.left > 0 && state.rect.top > 0, "Marker nằm đúng trong layout Writer", JSON.stringify(state.rect));

  const screenshotPath = path.join(os.tmpdir(), "writer-spellcheck-vi.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`INFO\tẢnh kiểm chứng: ${screenshotPath}`);

  await marker.click({ button: "right" });
  const menu = page.locator('.vno-spellcheck-menu[role="menu"]');
  await menu.waitFor();
  assert(await menu.locator(".vno-spellcheck-suggestion", { hasText: "chính" }).count() > 0, "Menu chuột phải có gợi ý chính");
  assert(await menu.getByRole("menuitem", { name: "Bỏ qua", exact: true }).count() === 1, "Menu có Bỏ qua");
  assert(await menu.getByRole("menuitem", { name: "Thêm vào từ điển", exact: true }).count() === 1, "Menu có Thêm vào từ điển");
  await menu.getByRole("menuitem", { name: "Thêm vào từ điển", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-vno-spelling-uncertain="chínnh"]'));

  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("vno-spellcheck-vi-personal") || "[]"));
  assert(persisted.includes("chínnh"), "Thêm vào từ điển lưu thật trong localStorage", JSON.stringify(persisted));

  await editor.press("Control+A");
  await page.keyboard.type("chínnh");
  await page.waitForTimeout(650);
  assert(await editor.locator(".vno-spelling-uncertain").count() === 0, "Từ cá nhân không bị báo lại trong cùng phiên");
  assert(pageErrors.length === 0, "Không có pageerror", pageErrors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) process.exitCode = 1;
