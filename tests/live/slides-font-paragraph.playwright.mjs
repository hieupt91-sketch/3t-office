/** Live Font/Paragraph proof on the running Slides canvas. Playwright locators only — never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_FONT_PORT || 8831);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = path.join(rootDir, path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\]*\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) { response.writeHead(404); response.end("404"); return; }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(response);
  });
});

function assert(condition, message) { if (!condition) throw new Error(message); }

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.waitForTimeout(500);

  const homeGroups = await page.evaluate(() => {
    return [...document.querySelectorAll("#vno-ribbon-tabpanel-home .vno-ribbon-group")].map(el => ({
      id: el.dataset.groupId || "",
      label: el.getAttribute("aria-label") || el.querySelector(".vno-ribbon-group-label")?.textContent || ""
    }));
  });
  const labels = homeGroups.map(item => item.label);
  const fontAt = labels.findIndex(label => /Phông chữ|Font/i.test(label));
  const paraAt = labels.findIndex(label => /Đoạn văn|Paragraph/i.test(label));
  const clipAt = labels.findIndex(label => /Bảng nhớ tạm|Clipboard/i.test(label));
  const drawAt = labels.findIndex(label => /Đối tượng vẽ|Drawing/i.test(label));
  assert(fontAt >= 0 && paraAt >= 0, `Home thiếu Font/Paragraph: ${labels.join(" | ")}`);
  assert(clipAt < fontAt && fontAt < paraAt && paraAt < drawAt, `Thứ tự Home sai: ${labels.join(" → ")}`);

  const title = page.locator(".vno-slide-title");
  await title.click();
  const titleBoldState = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-title");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return {
      cssBold: getComputedStyle(el).fontWeight,
      queryBold: document.queryCommandState("bold"),
      checked: document.querySelector('[data-command-id="slides.text.bold"]')?.classList.contains("is-checked")
    };
  });
  assert(Number(titleBoldState.cssBold) >= 700 || titleBoldState.queryBold, `Title mặc định phải đậm. ${JSON.stringify(titleBoldState)}`);

  const body = page.locator(".vno-slide-body").first();
  await body.click();
  await body.fill("Van ban dam nghieng");
  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  const boldBtn = page.locator('[data-command-id="slides.text.bold"]');
  await boldBtn.waitFor({ state: "visible" });
  await boldBtn.click();

  const afterBold = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    return {
      html: el.innerHTML,
      text: el.innerText,
      bold: document.queryCommandState("bold"),
      checked: document.querySelector('[data-command-id="slides.text.bold"]')?.classList.contains("is-checked"),
      pressed: document.querySelector('[data-command-id="slides.text.bold"]')?.getAttribute("aria-pressed")
    };
  });
  assert(/Van ban dam nghieng/i.test(afterBold.text), `Body text sai: ${afterBold.text}`);
  assert(afterBold.bold || /<(b|strong)\b/i.test(afterBold.html) || /font-weight:\s*(bold|[7-9]00)/i.test(afterBold.html), `Bold không áp dụng. html=${afterBold.html} state=${afterBold.bold}`);
  assert(afterBold.checked || afterBold.pressed === "true" || afterBold.bold, `Nút Đậm chưa is-checked/aria-pressed. checked=${afterBold.checked} pressed=${afterBold.pressed}`);

  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.locator('[data-command-id="slides.text.italic"]').click();
  await page.locator('[data-command-id="slides.text.underline"]').click();
  const afterIU = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    return {
      html: el.innerHTML,
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline")
    };
  });
  assert(afterIU.italic || /<(i|em)\b/i.test(afterIU.html) || /font-style:\s*italic/i.test(afterIU.html), `Italic không áp dụng. html=${afterIU.html}`);
  assert(afterIU.underline || /<u\b/i.test(afterIU.html) || /underline/i.test(afterIU.html), `Underline không áp dụng. html=${afterIU.html}`);

  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.locator('select[data-command-id="slides.font.family"]').selectOption("Arial");
  await page.locator('select[data-command-id="slides.font.size"]').selectOption("6");
  const afterFont = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    return { html: el.innerHTML, font: document.queryCommandValue("fontName") };
  });
  assert(/arial/i.test(afterFont.html + afterFont.font), `Font Arial không áp dụng. html=${afterFont.html} value=${afterFont.font}`);

  await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.locator('[data-command-id="slides.list.bullet"]').click();
  await page.locator('[data-command-id="slides.para.alignCenter"]').click();
  const afterPara = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-body");
    return {
      html: el.innerHTML,
      list: document.queryCommandState("insertUnorderedList"),
      center: document.queryCommandState("justifyCenter"),
      hasUl: !!el.querySelector("ul,ol"),
      align: getComputedStyle(el).textAlign
    };
  });
  assert(afterPara.list || afterPara.hasUl || /<ul|<ol|<li/i.test(afterPara.html), `Bullet không áp dụng. html=${afterPara.html}`);
  assert(afterPara.center || /center/i.test(afterPara.align + afterPara.html), `Căn giữa không áp dụng. html=${afterPara.html} align=${afterPara.align}`);

  const persist = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas._syncEditableFieldsFromDom();
    const first = {
      titleHtml: canvas.slides[0].titleHtml,
      bodyHtml: canvas.slides[0].bodyHtml
    };
    canvas.addNewSlide();
    canvas.selectSlide(0);
    return {
      first,
      restoredTitle: canvas.titleEl.innerHTML,
      restoredBody: canvas.bodyEl.innerHTML
    };
  });
  const bodyHtml = persist.first.bodyHtml || persist.restoredBody || "";
  assert(/<(b|strong|i|em|u|font|span|ul|ol)\b/i.test(bodyHtml), `bodyHtml không persist định dạng: ${bodyHtml}`);
  assert(/<(ul|ol|li)\b|text-align|justify|center/i.test(bodyHtml), `bodyHtml không persist list/căn lề: ${bodyHtml}`);

  assert(pageErrors.length === 0, `pageerror: ${pageErrors.join(" | ")}`);
  console.log("LIVE PASS: Slides Font/Paragraph ribbon + execCommand B/I/U + font + bullet/align + persist HTML");
} finally {
  await browser?.close();
  server.close();
}
