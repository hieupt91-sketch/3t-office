/**
 * Round 2 live import of real OOXML files that were NEVER serialized by VN Office.
 * Writer embedded image, Sheet VLOOKUP/IF/$A$2, Sheet CF + data validation.
 * Does not drive Slides (covered in round 1).
 *
 * Same pipeline as main.py / round 1: soffice reverse-convert, stub openRealFile,
 * click File → Mở. HTML sidecar images are inlined as data URIs because main.py
 * currently returns only the HTML string and deletes the temp convert dir.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice, inlineHtmlImages } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = path.join(root, "tests", "fixtures", "real-office-samples");
const port = Number(process.env.VNO_REAL_OFFICE_IMPORT_R2_PORT || 8793);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-real-office-import-r2-"));
const profileDir = path.join(tmp, "lo-profile");

const htmlPath = convertWithSoffice(path.join(fixtureDir, "sample-writer-image.docx"), "html", path.join(tmp, "writer"), { profileDir });
const formulasPath = convertWithSoffice(path.join(fixtureDir, "sample-sheet-formulas.xlsx"), "fods", path.join(tmp, "formulas"), { profileDir });
const validationPath = convertWithSoffice(path.join(fixtureDir, "sample-sheet-validation.xlsx"), "fods", path.join(tmp, "validation"), { profileDir });

const rawWriterHtml = fs.readFileSync(htmlPath, "utf8");
const writerHtml = inlineHtmlImages(rawWriterHtml, htmlPath);
const formulasFods = fs.readFileSync(formulasPath, "utf8");
const validationFods = fs.readFileSync(validationPath, "utf8");

function pngSizeFromDataUri(uri) {
  const base64 = String(uri || "").split(",")[1];
  if (!base64) return null;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length < 24 || buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

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
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

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
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-body").waitFor();

  assert(/<img\b/i.test(rawWriterHtml) && /width="192"/i.test(rawWriterHtml) && /height="96"/i.test(rawWriterHtml),
    "soffice HTML (StarWriter) xuất img 192×96 (5,08×2,54 cm)",
    rawWriterHtml.match(/<img[\s\S]*?>/i)?.[0] || "no img");
  assert(/src="[^"]+\.png"/i.test(rawWriterHtml),
    "soffice HTML tham chiếu sidecar PNG (main.py hiện chỉ đọc chuỗi HTML, mất file này nếu không inline)",
    rawWriterHtml.match(/src="[^"]+"/i)?.[0] || "");

  await stubOpenAndClickFileMenu(page, { content: writerHtml, fileName: "sample-writer-image.docx" });
  const writer = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const img = body?.querySelector("img");
    return {
      heading: (body?.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim(),
      caption: (body?.innerText || "").includes("logo đỏ-xanh"),
      src: img?.getAttribute("src") || "",
      name: img?.getAttribute("name") || "",
      width: img?.getAttribute("width") || "",
      height: img?.getAttribute("height") || "",
      naturalWidth: img?.naturalWidth || 0,
      naturalHeight: img?.naturalHeight || 0
    };
  });
  const pngSize = pngSizeFromDataUri(writer.src);
  assert(writer.heading.toLocaleLowerCase("vi-VN").includes("logo đơn vị nhúng"), "Writer: Heading 1 còn đúng", JSON.stringify(writer));
  assert(writer.src.startsWith("data:image/png;base64,"), "Writer: ảnh được nạp dạng data URI", writer.src.slice(0, 40));
  assert(writer.width === "192" && writer.height === "96", "Writer: kích thước hiển thị 192×96 px", JSON.stringify(writer));
  assert(pngSize && pngSize.width === 80 && pngSize.height === 40, "Writer: PNG gốc còn 80×40 pixel", JSON.stringify(pngSize));
  assert(writer.name === "LogoDonVi" && writer.caption, "Writer: tên frame và chú thích còn", JSON.stringify(writer));

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await stubOpenAndClickFileMenu(page, { content: formulasFods, fileName: "sample-sheet-formulas.xlsx" });
  const formulas = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    const sheet = grid.sheetsData["Công thức"];
    const catalog = grid.sheetsData["Danh mục"];
    return {
      sheets: [...grid.sheets],
      lookupName: { formula: sheet?.get("C2")?.formula, val: sheet?.get("C2")?.val },
      lookupPrice: { formula: sheet?.get("D2")?.formula, val: sheet?.get("D2")?.val },
      absRef: { formula: sheet?.get("F2")?.formula, val: sheet?.get("F2")?.val },
      absRefRow3: { formula: sheet?.get("F3")?.formula, val: sheet?.get("F3")?.val },
      nestedIf: { formula: sheet?.get("G2")?.formula, val: sheet?.get("G2")?.val },
      nestedIfHigh: { formula: sheet?.get("G3")?.formula, val: sheet?.get("G3")?.val },
      catalogSp02: catalog?.get("B2")?.val,
      coefficient: sheet?.get("A2")?.val
    };
  });
  assert(formulas.sheets.join("|") === "Danh mục|Công thức", "Sheet formulas: đủ 2 sheet", JSON.stringify(formulas.sheets));
  assert(String(formulas.lookupName.formula || "").includes("VLOOKUP") && formulas.lookupName.val === "Vở",
    "Sheet: VLOOKUP tên còn là công thức và ra Vở", JSON.stringify(formulas.lookupName));
  assert(String(formulas.lookupPrice.formula || "").includes("VLOOKUP") && formulas.lookupPrice.val === 12000,
    "Sheet: VLOOKUP giá còn là công thức và ra 12000", JSON.stringify(formulas.lookupPrice));
  assert(formulas.absRef.formula === "=$A$2*E2" && formulas.absRef.val === 88,
    "Sheet: $A$2*E2 còn công thức và ra 88", JSON.stringify(formulas.absRef));
  assert(formulas.absRefRow3.formula === "=$A$2*E3" && formulas.absRefRow3.val === 132,
    "Sheet: $A$2*E3 còn công thức và ra 132", JSON.stringify(formulas.absRefRow3));
  assert(String(formulas.nestedIf.formula || "").includes("IF(") && formulas.nestedIf.val === "Trung bình",
    "Sheet: IF lồng còn công thức và ra Trung bình", JSON.stringify(formulas.nestedIf));
  assert(formulas.nestedIfHigh.val === "Cao", "Sheet: IF lồng hàng 3 ra Cao", JSON.stringify(formulas.nestedIfHigh));

  await stubOpenAndClickFileMenu(page, { content: validationFods, fileName: "sample-sheet-validation.xlsx" });
  const validation = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.switchSheet("Kiểm tra");
    const rules = grid.getConditionalFormattingRules("Kiểm tra");
    const validations = grid.getDataValidations("Kiểm tra");
    const cell = coord => {
      const dom = document.querySelector(`.vno-grid-cell[data-coord="${coord}"]`);
      const style = dom ? getComputedStyle(dom) : null;
      return {
        text: (dom?.innerText || "").trim(),
        bg: (dom?.style.backgroundColor || style?.backgroundColor || "").replace(/\s/g, ""),
        invalid: !!dom?.classList.contains("is-validation-invalid"),
        hasValidation: !!dom?.classList.contains("has-validation")
      };
    };
    return {
      sheets: [...grid.sheets],
      a2: grid.sheetsData["Kiểm tra"]?.get("A2")?.val,
      a3: grid.sheetsData["Kiểm tra"]?.get("A3")?.val,
      rules: rules.map(rule => ({ type: rule.type, value: rule.value, color: rule.color, start: rule.range?.start, end: rule.range?.end })),
      validations: validations.map(item => ({ type: item.type, values: item.values, min: item.min, max: item.max, start: item.range?.start, end: item.range?.end })),
      matchA2: grid._matchingConditionalRule("A", 2)?.color || null,
      matchA3: grid._matchingConditionalRule("A", 3)?.color || null,
      matchA4: grid._matchingConditionalRule("A", 4)?.color || null,
      validB2: grid.validateCellValue("B", 2).valid,
      validB3: grid.validateCellValue("B", 3).valid,
      validC2: grid.validateCellValue("C", 2).valid,
      validC3: grid.validateCellValue("C", 3).valid,
      domA2: cell("A2"),
      domA3: cell("A3"),
      domB3: cell("B3"),
      domC3: cell("C3")
    };
  });
  assert(validation.sheets.includes("Kiểm tra") && validation.a2 === 95 && validation.a3 === 45,
    "Sheet validation: dữ liệu điểm còn", JSON.stringify({ sheets: validation.sheets, a2: validation.a2, a3: validation.a3 }));
  assert(validation.rules.some(rule => rule.type === "greaterThan" && rule.value === 80 && rule.color === "#c6efce"),
    "Sheet: CF >80 xanh còn được nhận dạng", JSON.stringify(validation.rules));
  assert(validation.rules.some(rule => rule.type === "lessThan" && rule.value === 50 && rule.color === "#ffc7ce"),
    "Sheet: CF <50 đỏ còn được nhận dạng", JSON.stringify(validation.rules));
  assert(validation.rules.some(rule => rule.type === "blank" && rule.color === "#fff2cc"),
    "Sheet: CF ô trống vàng còn được nhận dạng", JSON.stringify(validation.rules));
  assert(validation.matchA2 === "#c6efce" && validation.matchA3 === "#ffc7ce" && validation.matchA4 === "#fff2cc",
    "Sheet: màu CF khớp 95/45/trống", JSON.stringify({ a2: validation.matchA2, a3: validation.matchA3, a4: validation.matchA4 }));
  const list = validation.validations.find(item => item.type === "list");
  const numeric = validation.validations.find(item => item.type === "numberRange");
  assert(list && list.values.join("|") === "Đạt|Không đạt|Đang xử lý",
    "Sheet: dropdown list validation còn", JSON.stringify(list));
  assert(numeric && numeric.min === 0 && numeric.max === 10,
    "Sheet: number range 0–10 còn", JSON.stringify(numeric));
  assert(validation.validB2 && !validation.validB3 && validation.validC2 && !validation.validC3,
    "Sheet: cảnh báo validation đúng Đạt / Sai giá trị / 8 / 15",
    JSON.stringify({ b2: validation.validB2, b3: validation.validB3, c2: validation.validC2, c3: validation.validC3 }));
  assert(validation.domB3.invalid && validation.domC3.invalid,
    "Sheet: DOM đánh dấu ô validation sai", JSON.stringify({ b3: validation.domB3, c3: validation.domC3 }));

  assert(errors.length === 0, "Không có lỗi JavaScript trong trình duyệt", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  if (!process.env.VNO_KEEP_FIXTURE_TMP) fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) process.exitCode = 1;
