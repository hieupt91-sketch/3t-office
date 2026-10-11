import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_RIBBON_COLLAPSE_PORT || 8814);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });

  const content = () => page.locator(".vno-ribbon-content");
  const activeTab = page.locator(".vno-ribbon-tab.is-active");

  await content().waitFor({ timeout: 5000 });
  check(await content().isVisible(), "Ribbon content hiện mặc định (chưa thu gọn)");

  // Nhấp đúp vào tab đang active -> thu gọn
  await activeTab.dblclick();
  check(await content().count() === 0, "Nhấp đúp vào tab đang mở thu gọn Ribbon (ẩn hết nhóm lệnh)");

  // Nhấp đúp lần nữa -> mở lại
  await page.locator(".vno-ribbon-tab.is-active").dblclick();
  check(await content().isVisible(), "Nhấp đúp lần nữa mở lại Ribbon");

  // Nút chevron góc phải cũng bật/tắt được (cho người dùng không biết mẹo nhấp đúp)
  const collapseBtn = page.locator(".vno-ribbon-collapse-btn");
  check(await collapseBtn.isVisible(), "Nút thu gọn Ribbon (chevron) hiện rõ ràng ở góc phải thanh tab");
  await collapseBtn.click();
  check(await content().count() === 0, "Bấm nút chevron thu gọn Ribbon");
  await collapseBtn.click();
  check(await content().isVisible(), "Bấm nút chevron lần nữa mở lại Ribbon");

  // Ctrl+F1 (đã có sẵn trong command-definitions.js, kiểm tra thật sự hoạt động)
  await page.keyboard.press("Control+F1");
  check(await content().count() === 0, "Phím tắt Ctrl+F1 thu gọn Ribbon");
  await page.keyboard.press("Control+F1");
  check(await content().isVisible(), "Phím tắt Ctrl+F1 lần nữa mở lại Ribbon");

  // Chuyển tab trong lúc đang thu gọn: vẫn giữ thu gọn (không tự bung ra)
  await collapseBtn.click();
  check(await content().count() === 0, "Bối cảnh: Ribbon đang thu gọn");
  await page.locator("#vno-ribbon-tab-insert").click();
  check(await content().count() === 0, "Chuyển sang tab khác trong lúc thu gọn vẫn giữ trạng thái thu gọn");
  await page.locator(".vno-ribbon-collapse-btn").click();
  check((await content().isVisible()) && (await page.locator("#vno-ribbon-tab-insert").getAttribute("class") || "").includes("is-active"),
    "Mở lại Ribbon hiện đúng nội dung của tab đã chọn lúc thu gọn");

  check(pageErrors.length === 0, "Không có lỗi JavaScript nào trong console", pageErrors.join(" | "));
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll Ribbon Collapse Toggle live checks passed.");
