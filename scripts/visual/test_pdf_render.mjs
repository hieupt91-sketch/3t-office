import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
const pdfUrl = `file:///${path.resolve(root, "docs/screenshots/word_d07_page1.pdf").replace(/\\/g, "/")}`;
console.log("Navigating to:", pdfUrl);
await page.goto(pdfUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(root, "docs/screenshots/test_pdf_edge.png") });
console.log("Saved test_pdf_edge.png");
await browser.close();
