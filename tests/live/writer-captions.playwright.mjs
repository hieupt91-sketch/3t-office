import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_CAPTIONS_PORT || 8815);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

async function goToReferences(page) {
  await page.locator("#vno-ribbon-tab-references").click();
  await page.locator('[data-command-id="writer.reference.captionInsert"]').waitFor({ state: "visible", timeout: 5000 });
}

async function selectImage(page, index) {
  await page.evaluate((i) => {
    const editor = document.querySelector(".vno-writer-body");
    editor.querySelectorAll("img").forEach((img) => img.classList.remove("is-vno-image-selected"));
    const img = editor.querySelectorAll("img")[i];
    if (img) {
      img.classList.add("is-vno-image-selected");
      img.focus();
    }
  }, index);
  await goToReferences(page);
}

async function selectTable(page) {
  await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    editor.querySelectorAll("img").forEach((img) => img.classList.remove("is-vno-image-selected"));
    const table = editor.querySelector("table");
    const cell = table?.querySelector("td") || table;
    if (!cell) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await goToReferences(page);
}

async function insertCaptionViaRibbon(page, { kind, text }) {
  await goToReferences(page);
  await page.locator('[data-command-id="writer.reference.captionInsert"]').click();
  const dialog = page.locator(".vno-caption-dialog");
  await dialog.waitFor({ timeout: 5000 });
  await dialog.locator(".vno-caption-kind").selectOption(kind);
  await dialog.locator(".vno-caption-text-input").fill(text);
  await dialog.locator(".vno-insert-caption").click({ noWaitAfter: true });
  await dialog.waitFor({ state: "detached", timeout: 5000 });
}

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "domcontentloaded" });
  const body = page.locator(".vno-writer-body");
  await body.waitFor({ state: "visible", timeout: 20000 });
  await page.locator("#vno-ribbon-tab-references").waitFor({ state: "visible", timeout: 20000 });
  await body.click();

  await page.evaluate((pixel) => {
    const editor = document.querySelector(".vno-writer-body");
    editor.innerHTML = `
      <p>Báo cáo doanh thu quý I</p>
      <img src="${pixel}" alt="Doanh thu" data-vno-wrap="inline" tabindex="0" style="width:120px;height:80px;">
      <img src="${pixel}" alt="Chi phí" data-vno-wrap="inline" tabindex="0" style="width:120px;height:80px;">
      <img src="${pixel}" alt="Lợi nhuận" data-vno-wrap="inline" tabindex="0" style="width:120px;height:80px;">
      <table style="width:60%;border-collapse:collapse;"><tr><td style="border:1px solid #94a3b8;padding:6pt;">Tổng hợp</td></tr></table>
    `;
  }, PIXEL);

  await goToReferences(page);
  check(await page.locator('[data-command-id="writer.reference.captionInsert"]').isVisible(), "Nút Chèn chú thích ảnh hiện trên tab Tham chiếu");
  check(await page.locator('[data-command-id="writer.reference.tofInsert"]').isVisible(), "Nút Danh mục hình ảnh hiện trên tab Tham chiếu");
  check(await page.locator('[data-command-id="writer.reference.tofUpdate"]').isVisible(), "Nút Cập nhật danh mục hiện trên tab Tham chiếu");

  await selectImage(page, 0);
  await insertCaptionViaRibbon(page, { kind: "figure", text: "Doanh thu" });
  await selectImage(page, 1);
  await insertCaptionViaRibbon(page, { kind: "figure", text: "Chi phí" });
  await selectImage(page, 2);
  await insertCaptionViaRibbon(page, { kind: "figure", text: "Lợi nhuận" });
  await selectTable(page);
  await insertCaptionViaRibbon(page, { kind: "table", text: "Tổng hợp" });

  const captionState = await page.evaluate(() => {
    const caps = [...document.querySelectorAll(".vno-writer-body [data-vno-caption='true']")].map((el) => ({
      kind: el.getAttribute("data-vno-caption-kind"),
      number: el.querySelector(".vno-caption-number")?.textContent.trim(),
      label: el.querySelector(".vno-caption-label")?.textContent.trim(),
      text: el.querySelector(".vno-caption-text")?.textContent.trim(),
      visible: el.textContent.replace(/\s+/g, " ").trim()
    }));
    return caps;
  });
  const figures = captionState.filter(c => c.kind === "figure");
  const tables = captionState.filter(c => c.kind === "table");
  check(figures.length === 3 && figures.map(c => c.number).join(",") === "1,2,3", "Ba caption Hình đánh số 1, 2, 3", JSON.stringify(figures));
  check(figures[0].text === "Doanh thu" && figures[1].text === "Chi phí" && figures[2].text === "Lợi nhuận", "Nội dung caption Hình đúng trên canvas");
  check(tables.length === 1 && tables[0].number === "1" && tables[0].label === "Bảng" && tables[0].text === "Tổng hợp", "Caption Bảng độc lập là Bảng 1", JSON.stringify(tables));

  const middleId = await page.evaluate(() => {
    const caps = [...document.querySelectorAll(".vno-writer-body [data-vno-caption-kind='figure']")];
    return caps[1]?.getAttribute("data-vno-caption-id") || caps[1]?.id || "";
  });
  await page.locator(`.vno-writer-body [data-vno-caption-id="${middleId}"] .vno-caption-delete-btn`).click();
  await page.waitForTimeout(200);
  const afterDelete = await page.evaluate(() => {
    return [...document.querySelectorAll(".vno-writer-body [data-vno-caption-kind='figure']")].map((el) => ({
      number: el.querySelector(".vno-caption-number")?.textContent.trim(),
      text: el.querySelector(".vno-caption-text")?.textContent.trim()
    }));
  });
  check(afterDelete.map(c => c.number).join(",") === "1,2" && afterDelete.map(c => c.text).join("|") === "Doanh thu|Lợi nhuận", "Xóa caption giữa thì số Hình còn lại là 1, 2", JSON.stringify(afterDelete));

  await goToReferences(page);
  await page.locator('[data-command-id="writer.reference.tofInsert"]').click();
  const tofDialog = page.locator(".vno-caption-dialog");
  await tofDialog.waitFor({ timeout: 5000 });
  await tofDialog.locator(".vno-tof-kind").selectOption("figure");
  await tofDialog.locator(".vno-insert-tof").click({ noWaitAfter: true });
  const tof = body.locator('[data-vno-tof="true"]');
  await tof.waitFor({ timeout: 5000 });
  const tofItems = tof.locator(".vno-tof-item");
  check((await tofItems.count()) === 2, "Table of Figures liệt kê đúng 2 caption Hình còn lại");
  const tofText = await tof.textContent();
  check(tofText.includes("Doanh thu") && tofText.includes("Lợi nhuận") && !tofText.includes("Chi phí"), "TOF chứa đúng caption còn lại, không còn mục đã xóa", tofText.replace(/\s+/g, " ").trim());

  const firstCaption = body.locator('[data-vno-caption-kind="figure"]').first();
  await tof.locator(".vno-tof-link").first().click();
  const jumped = await firstCaption.evaluate((el) => el === document.activeElement || el.contains(document.activeElement) || el.classList.contains("vno-caption"));
  check(jumped, "Click mục TOF nhảy tới caption tương ứng trong tài liệu");

  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const tofGone = (await body.locator('[data-vno-tof="true"]').count()) === 0;
  check(tofGone, "Undo xóa khối Table of Figures vừa chèn");
  await page.keyboard.press("Control+y");
  await tof.waitFor({ timeout: 5000 });
  check((await body.locator('[data-vno-tof="true"]').count()) === 1, "Redo khôi phục Table of Figures");

  check(pageErrors.length === 0, "Không có lỗi JavaScript nào trong console", pageErrors.join(" | "));
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll Writer Captions live checks passed.");
