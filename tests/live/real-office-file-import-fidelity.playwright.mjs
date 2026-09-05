/**
 * Live import of real OOXML files that were NEVER serialized by VN Office.
 *
 * Desktop open() is: native file dialog → soffice convert (docx→html, xlsx→fods,
 * pptx→fodp) → adapter.load. Playwright cannot drive the OS file dialog (SendKeys
 * forbidden). This test runs the SAME soffice reverse-convert as main.py, then
 * stubs globalUnoBridge.openRealFile and clicks File → Mở (common.file.open) so
 * adapter.open() and the load path are real.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = path.join(root, "tests", "fixtures", "real-office-samples");
const port = Number(process.env.VNO_REAL_OFFICE_IMPORT_PORT || 8792);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-real-office-import-live-"));
const profileDir = path.join(tmp, "lo-profile");

const htmlPath = convertWithSoffice(path.join(fixtureDir, "sample-writer.docx"), "html", path.join(tmp, "writer"), { profileDir });
const fodsPath = convertWithSoffice(path.join(fixtureDir, "sample-sheet.xlsx"), "fods", path.join(tmp, "sheet"), { profileDir });
const fodpPath = convertWithSoffice(path.join(fixtureDir, "sample-slides.pptx"), "fodp", path.join(tmp, "slides"), { profileDir });

const writerHtml = fs.readFileSync(htmlPath, "utf8");
const sheetFods = fs.readFileSync(fodsPath, "utf8");
const slidesFodp = fs.readFileSync(fodpPath, "utf8");

const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

let browser;
const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

async function stubOpenAndClickFileMenu(page, { content, fileName }) {
  await page.evaluate(async ({ content: imported, fileName: name }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: imported, fileName: name });
  }, { content, fileName });
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);
}

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-body").waitFor();

  await stubOpenAndClickFileMenu(page, { content: writerHtml, fileName: "sample-writer.docx" });
  const writer = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const heading = body?.querySelector("h1");
    const bold = body?.querySelector("b, strong");
    const italic = body?.querySelector("i, em");
    const rows = [...(body?.querySelectorAll("table tr") || [])].map((row) =>
      [...row.querySelectorAll("td, th")].map((cell) => (cell.innerText || "").replace(/\s+/g, " ").trim())
    );
    const bullets = [...(body?.querySelectorAll("ul li") || [])].map((item) => (item.innerText || "").replace(/\s+/g, " ").trim());
    const headingInList = !!(heading && heading.closest("ol, ul"));
    return {
      headingTag: heading?.tagName || "",
      headingText: (heading?.innerText || "").replace(/\s+/g, " ").trim(),
      headingInList,
      boldText: (bold?.innerText || "").trim(),
      italicText: (italic?.innerText || "").trim(),
      rows,
      bullets,
      pageWidth: document.querySelector(".vno-writer-page")?.style.width || ""
    };
  });
  assert(
    writer.headingTag === "H1" && writer.headingText.toLocaleLowerCase("vi-VN").includes("báo cáo tổng hợp hoạt động quý iii"),
    "Writer: Heading 1 còn đúng kiểu và nội dung (CSS Heading 1 của Writer viết hoa khi hiển thị)",
    JSON.stringify(writer)
  );
  assert(!writer.headingInList, "Writer: Heading 1 không bị bọc numbered list", JSON.stringify(writer));
  assert(writer.boldText === "đảm bảo" && writer.italicText === "hoàn thành", "Writer: bold/italic đúng vị trí", JSON.stringify(writer));
  assert(writer.rows.length === 3 && writer.rows[0].join("|") === "STT|Hạng mục|Kết quả" && writer.rows[2][2].includes("Đạt có điều kiện"), "Writer: bảng 3x3 còn đủ dữ liệu", JSON.stringify(writer.rows));
  assert(writer.bullets.length === 3 && writer.bullets[0].includes("Rà soát định dạng"), "Writer: bullet list còn đúng", JSON.stringify(writer.bullets));

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await stubOpenAndClickFileMenu(page, { content: sheetFods, fileName: "sample-sheet.xlsx" });
  const sheet = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const revenue = grid.sheetsData["Doanh thu"];
    const cost = grid.sheetsData["Chi phí"];
    const tabs = [...document.querySelectorAll(".vno-sheet-tab-item")].map((tab) => tab.textContent.trim());
    return {
      sheets: [...grid.sheets],
      tabs,
      title: revenue?.get("A1")?.val,
      month7: revenue?.get("B2")?.val,
      sumFormula: revenue?.get("B5")?.formula,
      sumValue: revenue?.get("B5")?.val,
      currencyVal: cost?.get("B2")?.val,
      currencyFmt: cost?.get("B2")?.style?.numberFormat || null,
      stationery: cost?.get("A2")?.val
    };
  });
  assert(sheet.sheets.join("|") === "Doanh thu|Chi phí" && sheet.tabs.includes("Chi phí"), "Sheet: cả 2 sheet còn đủ", JSON.stringify(sheet));
  assert(sheet.month7 === 120 && sheet.sumFormula === "=SUM(B2:B4)" && sheet.sumValue === 450, "Sheet: SUM còn công thức và giá trị 450", JSON.stringify(sheet));
  assert(sheet.currencyVal === 1250000 && sheet.stationery === "Văn phòng phẩm", "Sheet: giá trị currency sheet 2 còn đúng", JSON.stringify(sheet));
  assert(sheet.currencyFmt?.category === "currency" && sheet.currencyFmt.currencySymbol === "₫", "Sheet: định dạng currency còn (không mất sau convert soffice)", JSON.stringify(sheet.currencyFmt));

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();
  await stubOpenAndClickFileMenu(page, { content: slidesFodp, fileName: "sample-slides.pptx" });
  const slides = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    const model = (canvas.slides || []).map((slide) => ({
      title: slide.title,
      body: slide.body,
      shapes: (slide.shapes || []).map((shape) => ({ type: shape.type, text: shape.text, x: shape.x, y: shape.y, w: shape.w, h: shape.h, color: shape.color }))
    }));
    canvas.selectSlide(1);
    const shapeDom = document.querySelector(".vno-slide-shape-item");
    return {
      count: model.length,
      model,
      visibleTitle: document.querySelector(".vno-slide-title")?.innerText || document.querySelector("[data-slide-title]")?.innerText || "",
      visibleBody: document.querySelector(".vno-slide-body")?.innerText || "",
      shapeText: shapeDom?.innerText?.trim() || "",
      shapeBox: shapeDom ? { left: shapeDom.style.left, top: shapeDom.style.top, width: shapeDom.style.width, height: shapeDom.style.height } : null
    };
  });
  assert(slides.count === 2, "Slides: cả 2 slide còn đủ", JSON.stringify(slides.model));
  assert(slides.model[0].title.includes("VN Office 2026") && slides.model[0].body.includes("Bộ ứng dụng văn phòng Việt"), "Slides: slide 1 giữ tiêu đề + phụ đề", JSON.stringify(slides.model[0]));
  assert(slides.model[1].body.includes("Kiến trúc nền tảng LibreOffice"), "Slides: text slide 2 còn đúng", JSON.stringify(slides.model[1]));
  const shape = slides.model[1].shapes[0];
  assert(shape && shape.text === "Khối kiến trúc" && shape.type === "rect", "Slides: shape slide 2 còn nội dung", JSON.stringify(shape));
  assert(shape && shape.x > 40 && shape.y > 80 && shape.w > 150 && shape.h > 80, "Slides: shape slide 2 còn vị trí tương đối", JSON.stringify(shape));
  assert(slides.shapeText.includes("Khối kiến trúc"), "Slides: shape được vẽ trên canvas", JSON.stringify(slides));

  assert(errors.length === 0, "Không có lỗi JavaScript trong trình duyệt", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  if (!process.env.VNO_KEEP_FIXTURE_TMP) fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) process.exitCode = 1;
