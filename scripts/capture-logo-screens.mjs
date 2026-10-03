import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("server/3t-web");
const outDir = path.resolve("docs/screens-web-logo");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const server = http.createServer((req, res) => {
  let reqUrl = (req.url || "/").split("?")[0].split("#")[0];
  if (reqUrl === "/") reqUrl = "/index.html";

  const filePath = path.normalize(path.join(root, reqUrl));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

const port = 8899;
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
console.log(`Test server running at http://127.0.0.1:${port}`);

const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});

const pagesToCapture = [
  { name: "index", url: `http://127.0.0.1:${port}/index.html` },
  { name: "lien-he", url: `http://127.0.0.1:${port}/lien-he.html` },
  { name: "ban-quyen", url: `http://127.0.0.1:${port}/ban-quyen.html` },
  { name: "404", url: `http://127.0.0.1:${port}/404.html` }
];

// 1. Desktop 1366px - Light mode
const desktopContext = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  deviceScaleFactor: 1
});
const desktopPage = await desktopContext.newPage();

for (const p of pagesToCapture) {
  await desktopPage.goto(p.url, { waitUntil: "networkidle" });
  await desktopPage.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await desktopPage.waitForTimeout(200);

  // Header close-up (Light)
  const headerElem = await desktopPage.$(".site-header");
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(outDir, `${p.name}-header-desktop-1366.png`) });
  }

  // Full page view
  await desktopPage.screenshot({ path: path.join(outDir, `${p.name}-desktop-1366.png`), fullPage: false });

  // Footer close-up
  const footerElem = await desktopPage.$(".site-footer");
  if (footerElem) {
    await footerElem.screenshot({ path: path.join(outDir, `${p.name}-footer-desktop-1366.png`) });
  }

  // Header close-up (Dark)
  await desktopPage.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await desktopPage.waitForTimeout(200);
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(outDir, `${p.name}-header-desktop-1366-dark.png`) });
  }
  if (p.name === "index") {
    await desktopPage.screenshot({ path: path.join(outDir, `index-desktop-1366-dark.png`), fullPage: false });
    if (footerElem) {
      await footerElem.screenshot({ path: path.join(outDir, `index-footer-desktop-1366-dark.png`) });
    }
  }
}
await desktopContext.close();

// 2. Mobile 390px - Light & Dark
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true
});
const mobilePage = await mobileContext.newPage();

for (const p of pagesToCapture) {
  await mobilePage.goto(p.url, { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await mobilePage.waitForTimeout(200);

  // Header close-up (Light)
  const headerElem = await mobilePage.$(".site-header");
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(outDir, `${p.name}-header-mobile-390.png`) });
  }

  // Full page view
  await mobilePage.screenshot({ path: path.join(outDir, `${p.name}-mobile-390.png`), fullPage: false });

  // Footer close-up
  const footerElem = await mobilePage.$(".site-footer");
  if (footerElem) {
    await footerElem.screenshot({ path: path.join(outDir, `${p.name}-footer-mobile-390.png`) });
  }

  // Header close-up (Dark)
  await mobilePage.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await mobilePage.waitForTimeout(200);
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(outDir, `${p.name}-header-mobile-390-dark.png`) });
  }
  if (p.name === "index") {
    await mobilePage.screenshot({ path: path.join(outDir, `index-mobile-390-dark.png`), fullPage: false });
    if (footerElem) {
      await footerElem.screenshot({ path: path.join(outDir, `index-footer-mobile-390-dark.png`) });
    }
  }
}
await mobileContext.close();

await browser.close();
server.close();
console.log("Screenshots captured successfully in docs/screens-web-logo/");
