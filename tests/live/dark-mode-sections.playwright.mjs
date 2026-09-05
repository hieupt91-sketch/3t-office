/** Live proof that Slide Sorter Section divider + context menu adopt Dark Mode
 * tokens (found hardcoded during Dark Mode round 2 review) - never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const screenshotsDir = path.join(root, "docs", "screenshots");
const port = Number(process.env.VNO_DARK_SECTIONS_PORT || 8930);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
fs.mkdirSync(screenshotsDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8", ".png": "image/png"
};
const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function assert(condition, message) { if (!condition) throw new Error(message); }
function toRgb(str) {
  const m = str.match(/\d+/g);
  return m ? m.slice(0, 3).map(Number) : null;
}
function luminance([r, g, b]) {
  const chan = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}
function contrastRatio(fg, bg) {
  const l1 = luminance(fg) + 0.05, l2 = luminance(bg) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem("vno-theme", "dark");
    localStorage.setItem("vno-locale", "vi");
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();

  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  assert(theme === "dark", `Dark Mode not active: data-theme="${theme}"`);

  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.sections = [];
    canvas.slides = [
      { id: 1, title: "Mở đầu", body: "A", layoutType: "title-content", shapes: [], comments: [] },
      { id: 2, title: "Kết luận", body: "B", layoutType: "title-content", shapes: [], comments: [] }
    ];
    canvas.selectSlide(0);
    canvas.addSection(0, "Phần Giới Thiệu");
    canvas.openSlideSorter();
  });

  const dividerStyle = await page.evaluate(() => {
    const el = document.querySelector(".vno-slide-section-divider");
    const cs = window.getComputedStyle(el);
    return { color: cs.color, borderColor: cs.borderBottomColor };
  });
  await page.screenshot({ path: path.join(screenshotsDir, "dark-mode-sections-divider.png"), fullPage: false });

  const sorterBg = await page.evaluate(() => {
    const grid = document.querySelector(".vno-slide-sorter-grid") || document.querySelector(".vno-slide-sorter-overlay");
    return window.getComputedStyle(grid).backgroundColor;
  });
  const bgRgb = toRgb(sorterBg) || [24, 24, 24];
  const dividerFgRgb = toRgb(dividerStyle.color);
  const ratio = contrastRatio(dividerFgRgb, bgRgb);
  console.log(`Divider color=${dividerStyle.color} border=${dividerStyle.borderColor} sorterBg=${sorterBg} contrast=${ratio.toFixed(2)}:1`);
  assert(ratio >= 3.0, `Section divider text contrast too low against sorter background: ${ratio.toFixed(2)}:1 (need >= 3.0:1 for large bold text)`);

  await page.locator(".vno-slide-sorter-item").first().click({ button: "right" });
  await page.locator('[data-section-action="add"]').waitFor();
  const menuStyle = await page.evaluate(() => {
    const menu = document.querySelector(".vno-slide-section-menu");
    return window.getComputedStyle(menu).backgroundColor;
  });
  await page.screenshot({ path: path.join(screenshotsDir, "dark-mode-sections-menu.png"), fullPage: false });
  console.log(`Section context menu background=${menuStyle}`);
  assert(menuStyle !== "rgb(255, 255, 255)", `Section context menu is still white in Dark Mode: ${menuStyle}`);

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
  console.log("PASS: Slide Sorter section divider and context menu are dark-themed with readable contrast");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
