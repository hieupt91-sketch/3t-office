import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_CITATIONS_PORT || 8813);
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

  const body = page.locator(".vno-writer-body");
  await body.click();
  await page.keyboard.type("Nghiên cứu trước đó đã chỉ ra kết quả tương tự.");

  await page.locator("#vno-ribbon-tab-references").click();
  check(await page.locator('[data-command-id="writer.reference.citationInsert"]').isVisible(), "Nút Chèn trích dẫn hiện trên tab Tham chiếu");
  check(await page.locator('[data-command-id="writer.reference.bibliographyInsert"]').isVisible(), "Nút Thư mục tài liệu hiện trên tab Tham chiếu");
  check(await page.locator('select[data-command-id="writer.reference.citationStyle"]').isVisible(), "Dropdown kiểu trích dẫn hiện trên tab Tham chiếu");

  // Chèn trích dẫn đầu tiên: dialog rỗng -> "Thêm nguồn mới" -> điền form -> Lưu (tự động chèn luôn)
  await page.locator('[data-command-id="writer.reference.citationInsert"]').click();
  await page.locator(".vno-new-source").click();
  await page.locator('.vno-citation-dialog input[name="author"]').fill("Nguyễn Văn A");
  await page.locator('.vno-citation-dialog input[name="title"]').fill("Giáo trình Vật lý");
  await page.locator('.vno-citation-dialog input[name="year"]').fill("2022");
  await page.locator(".vno-save-source").click();

  const field = body.locator(".vno-citation-field");
  await field.waitFor({ timeout: 5000 });
  check((await field.textContent()) === "(Nguyễn, 2022)", "Trích dẫn chèn đúng văn bản APA", await field.textContent());
  check((await field.getAttribute("contenteditable")) === "false", "Field trích dẫn không thể sửa trực tiếp");

  // Undo NGAY sau khi chèn phải là MỘT bước xóa nguyên field trích dẫn (không phải hai bước rời rạc)
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const fieldGoneAfterOneUndo = (await body.locator(".vno-citation-field").count()) === 0;
  check(fieldGoneAfterOneUndo, "Một lần Undo ngay sau khi chèn xóa hết trích dẫn (một bước lịch sử nguyên tử)");

  await page.keyboard.press("Control+y");
  await field.waitFor({ timeout: 5000 });
  check((await body.locator(".vno-citation-field").count()) === 1, "Redo khôi phục lại trích dẫn");

  // Chèn Bibliography
  await page.locator('[data-command-id="writer.reference.bibliographyInsert"]').click();
  const bib = body.locator('[data-vno-bibliography="true"]');
  await bib.waitFor({ timeout: 5000 });
  const bibText = await bib.textContent();
  check(bibText.includes("Nguyễn Văn A") && bibText.includes("Giáo trình Vật lý"), "Bibliography liệt kê đúng nguồn đã trích dẫn", bibText);

  // Đổi kiểu trích dẫn sang MLA -> field cập nhật tự động
  await page.locator('select[data-command-id="writer.reference.citationStyle"]').selectOption("mla");
  await page.waitForFunction(() => document.querySelector(".vno-citation-field")?.textContent === "(Nguyễn)");
  check((await field.textContent()) === "(Nguyễn)", "Đổi kiểu MLA cập nhật lại field trích dẫn thật trên canvas");

  check(pageErrors.length === 0, "Không có lỗi JavaScript nào trong console", pageErrors.join(" | "));
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll Writer Citations live checks passed.");
