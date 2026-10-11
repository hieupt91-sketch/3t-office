import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL('C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs'));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0]; const file = path.join(process.cwd(), p === '/' ? 'index.html' : p);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) { res.writeHead(200); fs.createReadStream(file).pipe(res); } else res.writeHead(404).end();
});
await new Promise(r => server.listen(8955, r));
const ctx = await browser.newContext(); const page = await ctx.newPage();
await page.addInitScript(() => { localStorage.setItem('vno-theme', 'dark'); });
await page.goto('http://127.0.0.1:8955/?app=slides');
await page.locator('.vno-shell[data-app="slides"]').waitFor();
await page.locator('#vno-ribbon-tab-slideshow').click();
await page.locator('[data-command-id="slides.slide.toggleHidden"]').click();
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const mark = document.querySelector('.vno-slide-hidden-mark');
  return {
    outerHTML: mark ? mark.outerHTML : null,
    computedColor: mark ? getComputedStyle(mark).color : null,
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    htmlApp: document.documentElement.getAttribute('data-app'),
    shellApp: document.querySelector('.vno-shell')?.getAttribute('data-app')
  };
});
console.log('INFO:', JSON.stringify(info));
await browser.close(); server.close();
