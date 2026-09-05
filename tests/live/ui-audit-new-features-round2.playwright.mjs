import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_UI_AUDIT_ROUND2_PORT || 8817);
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

  // ---- Writer Citations: focus trap, Escape, focus restoration, dark-mode contrast ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("vno-theme", "dark"));
    await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });
    await page.locator('.vno-shell[data-app="writer"]').waitFor();

    await page.locator("#vno-ribbon-tab-references").click();
    const citationInsertBtn = page.locator('[data-command-id="writer.reference.citationInsert"]');
    await citationInsertBtn.click();
    const dialog = page.locator(".vno-citation-dialog-overlay");
    await dialog.waitFor({ timeout: 5000 });

    check(await page.evaluate(() => !!document.activeElement?.closest(".vno-citation-dialog")), "Focus vào bên trong dialog khi mở (Chèn trích dẫn)");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(await page.locator(".vno-citation-dialog-overlay").count() === 0, "Escape đóng dialog Chèn trích dẫn");
    check(await citationInsertBtn.evaluate(el => el === document.activeElement), "Focus được khôi phục về nút đã mở dialog sau khi Escape");

    // Dark-mode contrast: citation field & hidden mark must not use the pre-fix
    // low-contrast values (text ~= background luminance) — spot check real computed colors.
    await citationInsertBtn.click();
    await dialog.waitFor({ timeout: 5000 });
    await page.locator(".vno-citation-dialog .vno-new-source").click();
    await page.locator('.vno-citation-dialog input[name="author"]').fill("Kiem Tra Tuong Phan");
    await page.locator('.vno-citation-dialog input[name="title"]').fill("Do tuong phan mau");
    await page.locator(".vno-citation-dialog .vno-save-source").click();
    await page.waitForTimeout(200);
    const fieldStyle = await page.evaluate(() => {
      const field = document.querySelector(".vno-citation-field");
      const s = field ? getComputedStyle(field) : null;
      return s ? { bg: s.backgroundColor, color: s.color } : null;
    });
    check(!!fieldStyle && fieldStyle.bg !== "rgba(0, 0, 0, 0)" && !fieldStyle.bg.startsWith("rgba"), "Citation field dark mode dùng nền đặc (không alpha) để đảm bảo tương phản thật", JSON.stringify(fieldStyle));

    check(pageErrors.length === 0, "Không có lỗi JavaScript nào (Writer Citations, dark mode)", pageErrors.join(" | "));
    await page.close();
  }

  // ---- Slides Insert Chart: roving tabindex + arrow-key radiogroup navigation ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("vno-theme", "dark"));
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "networkidle" });
    await page.locator('.vno-shell[data-app="slides"]').waitFor();

    await page.locator("#vno-ribbon-tab-insert").click();
    await page.locator('[data-command-id="slides.insert.chart"]').click();
    const chartDialog = page.locator(".vno-chart-dialog .vno-dialog-box");
    await chartDialog.waitFor({ timeout: 5000 });

    const tabIndexes = await page.evaluate(() => Array.from(document.querySelectorAll(".vno-chart-type")).map(b => b.getAttribute("tabindex")));
    check(tabIndexes.filter(t => t === "0").length === 1, "Chỉ đúng 1 nút loại biểu đồ có tabindex=0 (roving tabindex chuẩn radiogroup)", JSON.stringify(tabIndexes));

    await page.locator('.vno-chart-type[data-chart-type="bar"]').focus();
    await page.keyboard.press("ArrowRight");
    const checkedAfterArrow = await page.evaluate(() => document.querySelector('.vno-chart-type[aria-checked="true"]')?.dataset.chartType);
    check(checkedAfterArrow && checkedAfterArrow !== "bar", "Mũi tên phải chuyển lựa chọn loại biểu đồ trong radiogroup thật", checkedAfterArrow);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(await page.locator(".vno-chart-dialog").count() === 0, "Escape đóng dialog Insert Chart");

    check(pageErrors.length === 0, "Không có lỗi JavaScript nào (Slides Insert Chart, dark mode)", pageErrors.join(" | "));
    await page.close();
  }

  // ---- Slides Hide Slide: dark-mode hidden-mark contrast ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("vno-theme", "dark"));
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "networkidle" });
    await page.locator('.vno-shell[data-app="slides"]').waitFor();

    await page.locator("#vno-ribbon-tab-slideshow").click();
    await page.locator('[data-command-id="slides.slide.toggleHidden"]').click();
    await page.waitForTimeout(200);
    const markColor = await page.evaluate(() => {
      const mark = document.querySelector(".vno-slide-hidden-mark");
      return mark ? getComputedStyle(mark).color : null;
    });
    check(markColor === "rgb(251, 146, 60)", "Badge trang ẩn dark mode dùng đúng màu cam #fb923c đã đo đạt AA (7.37:1)", markColor);

    check(pageErrors.length === 0, "Không có lỗi JavaScript nào (Slides Hide Slide, dark mode)", pageErrors.join(" | "));
    await page.close();
  }
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll UI Audit Round 2 live checks passed.");
