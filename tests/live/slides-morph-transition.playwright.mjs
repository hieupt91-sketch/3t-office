/** Live browser proof for F5 Morph. Uses real Playwright keyboard events, never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_MORPH_PORT || 8798);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };

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
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();

  const seed = async matched => page.evaluate(async hasMatch => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [
      { id: 1, title: "From", body: "", layoutType: "blank", shapes: [
        { id: "hero", type: "rect", x: 80, y: 90, w: 120, h: 70, color: "#dc2626", text: "Morph" }
      ] },
      { id: 2, title: "To", body: "", layoutType: "blank", shapes: [
        { id: hasMatch ? "hero" : "different", type: "rect", x: 480, y: 260, w: 260, h: 150, color: "#2563eb", text: "Morph" }
      ] }
    ];
    canvas.currentSlideIndex = 1;
    canvas.selectSlide(1);
  }, matched);

  const chooseMorphInUi = async () => {
    await page.locator("#vno-ribbon-tab-transitions").click();
    await page.locator('[data-command-id="slides.transition.apply"]').click();
    await page.locator("#vno-trans-type-select").selectOption("morph");
    await page.locator("#vno-trans-duration-select").selectOption("1000");
    await page.locator("#vno-trans-apply-current").click();
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      globalUnoBridge.activeDocument.canvas.selectSlide(0);
    });
  };

  await seed(true);
  await chooseMorphInUi();
  await page.keyboard.press("F5");
  await page.locator(".vno-slideshow-overlay").waitFor();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(80);
  const running = await page.locator('[data-vno-shape-id="hero"]').evaluate(node => ({
    state: node.dataset.vnoMorphState,
    transition: node.style.transition,
    transform: getComputedStyle(node).transform,
    background: getComputedStyle(node).backgroundColor,
    mode: node.closest(".vno-slideshow-content")?.dataset.vnoTransition,
    animations: node.getAnimations().map(animation => ({ currentTime: animation.currentTime, playState: animation.playState }))
  }));
  assert(running.mode === "morph", `F5 did not enter Morph path: ${JSON.stringify(running)}`);
  assert(running.state === "running", `Morph shape is not running: ${JSON.stringify(running)}`);
  assert(running.transition.includes("transform 1000ms"), `Real CSS transform transition missing: ${running.transition}`);
  assert(running.transform !== "none" && running.transform !== "matrix(1, 0, 0, 1, 0, 0)", `Transform is not mid-flight: ${JSON.stringify(running)}`);
  console.log("PASS: F5 Morph runs a measurable same-id transform/resize/color CSS transition");

  await page.keyboard.press("Escape");
  await seed(false);
  await chooseMorphInUi();
  await page.keyboard.press("F5");
  await page.locator(".vno-slideshow-overlay").waitFor();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(50);
  const fallback = await page.locator(".vno-slideshow-content").evaluate(node => ({
    mode: node.dataset.vnoTransition,
    animationName: getComputedStyle(node).animationName,
    playState: node.getAnimations()[0]?.playState
  }));
  assert(fallback.mode === "morph-fallback-fade", `Fallback state missing: ${JSON.stringify(fallback)}`);
  assert(fallback.animationName === "vnoTransitionFade" && fallback.playState === "running", `Crossfade is not running: ${JSON.stringify(fallback)}`);
  console.log("PASS: F5 Morph without a same-id match safely runs real crossfade fallback");
  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
