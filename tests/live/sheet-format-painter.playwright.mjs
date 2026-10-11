import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 8798;
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};
const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(ROOT_DIR, path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, ""));
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
});
await new Promise(resolve => server.listen(PORT, resolve));

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

async function clickCell(coord) {
  const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click({ timeout: 4000 });
}

async function put(coord, value) {
  await clickCell(coord);
  await page.locator("#vno-formula-val").fill(value);
  await page.locator("#vno-formula-val").press("Enter");
}

function isYellow(color) {
  const value = String(color || "").toLowerCase();
  return value.includes("#fff200") || value.includes("255, 242, 0") || value.includes("255,242,0");
}

async function cellState(coord) {
  return page.evaluate((key) => {
    const td = document.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    const container = document.querySelector(".vno-sheet-container");
    return {
      text: td?.textContent || "",
      background: td?.style?.backgroundColor || "",
      border: td?.style?.border || "",
      formulaBar: document.querySelector("#vno-formula-val")?.value || "",
      painter: container?.dataset?.formatPainter || "",
      painterClass: container?.classList?.contains("vno-format-painter-active") || false
    };
  }, coord);
}

try {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  if (await page.locator(".vno-shell").getAttribute("data-app") !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }

  const painterBtn = page.locator('[data-command-id="sheet.edit.formatPainter"]').first();
  if (!(await painterBtn.isVisible())) throw new Error("Nút Format Painter không hiện trên ribbon Home");

  await put("A22", "1500");
  await clickCell("A22");
  await page.locator('[data-command-id="sheet.cell.fillColor"]').first().click();
  await page.locator('[data-command-id="sheet.cell.borders"]').first().click();
  await page.locator('[data-command-id="sheet.format.currencyVND"]').first().click();
  const source = await cellState("A22");
  if (!isYellow(source.background)) throw new Error(`Ô nguồn A22 chưa có màu nền: ${source.background}`);
  if (!source.border) throw new Error("Ô nguồn A22 chưa có viền");
  if (!source.text.includes("₫") && !source.text.includes("1.500")) {
    throw new Error(`Ô nguồn A22 chưa có định dạng số: "${source.text}"`);
  }

  await put("B22", "99");
  await put("C22", "hello");
  await put("D22", "world");

  await clickCell("A22");
  await painterBtn.click();
  const afterArm = await cellState("A22");
  if (!afterArm.painterClass || afterArm.painter !== "on") {
    throw new Error(`Format Painter chưa bật sau click nút: class=${afterArm.painterClass} data=${afterArm.painter}`);
  }

  await clickCell("B22");
  const painted = await cellState("B22");
  if (painted.formulaBar !== "99") throw new Error(`Giá trị B22 bị đổi (formula bar): "${painted.formulaBar}"`);
  if (!isYellow(painted.background)) throw new Error(`B22 chưa nhận màu nền nguồn: ${painted.background}`);
  if (!painted.border) throw new Error("B22 chưa nhận viền nguồn");
  if (!painted.text.includes("₫")) throw new Error(`B22 chưa nhận numberFormat (không thấy ₫): "${painted.text}"`);
  if (painted.painterClass) throw new Error("Chế độ một lần phải tự tắt sau khi click ô đích");

  await page.locator('.vno-quick-btn[data-cmd="common.edit.undo"]').click();
  await clickCell("B22");
  const undone = await cellState("B22");
  if (isYellow(undone.background) || undone.text.includes("₫")) {
    throw new Error(`Undo chưa khôi phục style cũ của B22: bg=${undone.background} text="${undone.text}"`);
  }
  if (undone.formulaBar !== "99") throw new Error("Undo làm mất giá trị B22");

  await clickCell("A22");
  await painterBtn.dblclick();
  const locked = await cellState("A22");
  if (locked.painter !== "locked") throw new Error(`Double-click chưa khóa Format Painter: ${locked.painter}`);

  await clickCell("C22");
  const c22 = await cellState("C22");
  if (c22.formulaBar !== "hello") throw new Error(`C22 bị đổi giá trị khi sơn: "${c22.formulaBar}"`);
  if (!isYellow(c22.background)) throw new Error("C22 chưa nhận màu nền khi khóa");
  if (c22.painter !== "locked") throw new Error("Chế độ khóa phải còn sau lần sơn thứ nhất");

  await clickCell("D22");
  const d22 = await cellState("D22");
  if (d22.formulaBar !== "world") throw new Error(`D22 bị đổi giá trị khi sơn lần 2: "${d22.formulaBar}"`);
  if (!isYellow(d22.background)) throw new Error("D22 chưa nhận màu nền ở lần sơn thứ hai");
  if (d22.painter !== "locked") throw new Error("Chế độ khóa phải còn đến khi Esc");

  await page.keyboard.press("Escape");
  const afterEsc = await cellState("D22");
  if (afterEsc.painterClass || afterEsc.painter) {
    throw new Error(`Esc chưa hủy Format Painter: class=${afterEsc.painterClass} data=${afterEsc.painter}`);
  }

  if (errors.length) throw new Error(errors.join(" | "));
  console.log("PASS: live Format Painter — click nút/ô thật, copy style không copy data, khóa double-click, Esc hủy, Undo khôi phục");
} finally {
  await browser.close();
  server.close();
}
