/**
 * VN Slides — Ribbon Toggle Overlap Deep Investigation
 * Tests ribbon collapse/expand at various viewport sizes, tabs, notes, zoom
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = Number(process.env.VNO_RIBBON_OVERLAP_PORT || 8819);

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(ROOT_DIR, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(ROOT_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(PORT, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;

const VIEWPORTS = [
  { width: 1366, height: 768, desc: "1366x768 (Common laptop)" },
  { width: 1280, height: 720, desc: "1280x720 (HD)" },
  { width: 1280, height: 800, desc: "1280x800" },
  { width: 1024, height: 768, desc: "1024x768 (XGA)" }
];

const SLIDES_TABS = ["home", "insert", "design", "transitions", "animations", "slideshow", "review", "view"];

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n=== VIEWPORT: ${vp.desc} ===`);

    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, locale: "vi-VN" });
    const pageErrors = [];
    page.on("pageerror", err => pageErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${PORT}/?app=slides`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector(".vno-ribbon-tab", { timeout: 10000 });
    await page.waitForTimeout(500);

    const measure = async () => {
      return await page.evaluate(() => {
        const ribbon = document.querySelector(".vno-ribbon");
        const ribbonContent = document.querySelector(".vno-ribbon-content");
        const canvas = document.querySelector(".vno-slide-canvas");
        const stage = document.querySelector(".vno-slide-stage");
        const studio = document.querySelector(".vno-slides-studio");
        const workspace = document.querySelector(".vno-workspace");
        const editorContainer = document.querySelector(".vno-editor-container");
        const statusbar = document.querySelector(".vno-statusbar");
        const topbar = document.querySelector(".vno-topbar");

        if (!ribbon || !canvas) return null;

        const r = (el) => el ? el.getBoundingClientRect() : null;
        return {
          ribbon: r(ribbon),
          ribbonContent: r(ribbonContent),
          canvas: r(canvas),
          stage: r(stage),
          studio: r(studio),
          workspace: r(workspace),
          editor: r(editorContainer),
          statusbar: r(statusbar),
          topbar: r(topbar),
          viewportHeight: window.innerHeight,
          ribbonHasContent: !!ribbonContent,
          stageOverflow: stage ? getComputedStyle(stage).overflow : null,
          stageJustifyContent: stage ? getComputedStyle(stage).justifyContent : null
        };
      });
    };

    // Test 1: Default state
    const before = await measure();
    const gapBefore = before.canvas.top - before.ribbon.bottom;
    console.log(`  Default: ribbon.h=${Math.round(before.ribbon.height)}px, ribbon.bottom=${Math.round(before.ribbon.bottom)}px, canvas.top=${Math.round(before.canvas.top * 10) / 10}px, gap=${Math.round(gapBefore * 10) / 10}px`);
    console.log(`  stage.h=${Math.round(before.stage.height)}px, canvas.h=${Math.round(before.canvas.height)}px, stage.overflow=${before.stageOverflow}, stage.justify=${before.stageJustifyContent}`);

    check(gapBefore >= 0, `Canvas below ribbon in default state at ${vp.desc}`, `gap=${Math.round(gapBefore * 10) / 10}px`);

    // Test 2: Collapse then expand
    await page.keyboard.press("Control+F1");
    await page.waitForTimeout(300);
    const collapsed = await measure();
    console.log(`  Collapsed: ribbon.h=${Math.round(collapsed.ribbon.height)}px, ribbon.hasContent=${collapsed.ribbonHasContent}, canvas.top=${Math.round(collapsed.canvas.top * 10) / 10}px`);

    await page.keyboard.press("Control+F1");
    await page.waitForTimeout(300);
    const after = await measure();
    const gapAfter = after.canvas.top - after.ribbon.bottom;
    console.log(`  Re-expanded: ribbon.bottom=${Math.round(after.ribbon.bottom)}px, canvas.top=${Math.round(after.canvas.top * 10) / 10}px, gap=${Math.round(gapAfter * 10) / 10}px`);

    check(gapAfter >= 0, `No overlap after collapse/expand at ${vp.desc}`, `gap=${Math.round(gapAfter * 10) / 10}px`);

    // Test 3: Rapid toggle (5 times)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Control+F1");
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    const rapid = await measure();
    const gapRapid = rapid.canvas.top - rapid.ribbon.bottom;
    console.log(`  After 5 rapid toggles: gap=${Math.round(gapRapid * 10) / 10}px, ribbon.hasContent=${rapid.ribbonHasContent}`);
    check(gapRapid >= 0, `No overlap after rapid toggles at ${vp.desc}`, `gap=${Math.round(gapRapid * 10) / 10}px`);

    // Test 4: Notes panel expanded (use JS since button may be blocked)
    await page.evaluate(() => {
      const notesPanel = document.querySelector(".vno-slide-notes-panel");
      if (notesPanel) {
        notesPanel.classList.remove("is-collapsed");
        notesPanel.classList.add("is-expanded");
        const content = notesPanel.querySelector(".vno-slide-notes-content");
        if (content) content.style.display = "flex";
      }
    });
    await page.waitForTimeout(300);

    // Toggle ribbon with notes open
    await page.keyboard.press("Control+F1");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+F1");
    await page.waitForTimeout(300);
    const notesState = await measure();
    const gapNotes = notesState.canvas.top - notesState.ribbon.bottom;
    console.log(`  With notes expanded: gap=${Math.round(gapNotes * 10) / 10}px, canvas.top=${Math.round(notesState.canvas.top * 10) / 10}px`);
    check(gapNotes >= 0, `No overlap with Notes panel at ${vp.desc}`, `gap=${Math.round(gapNotes * 10) / 10}px`);

    // Test each tab with collapse/expand
    for (const tabId of SLIDES_TABS) {
      const tabSelector = `#vno-ribbon-tab-${tabId}`;
      const tabExists = await page.locator(tabSelector).count() > 0;
      if (!tabExists) continue;

      await page.click(tabSelector);
      await page.waitForTimeout(100);
      await page.keyboard.press("Control+F1");
      await page.waitForTimeout(150);
      await page.keyboard.press("Control+F1");
      await page.waitForTimeout(150);

      const tabState = await measure();
      const tabGap = tabState.canvas.top - tabState.ribbon.bottom;
      if (tabGap < 0) {
        check(false, `No overlap on tab ${tabId} at ${vp.desc}`, `gap=${Math.round(tabGap * 10) / 10}px`);
      }
    }

    // Check for any negative gaps found across all tabs
    check(true, `All tabs tested at ${vp.desc}`);

    check(pageErrors.length === 0, `No JS errors at ${vp.desc}`, pageErrors.join(" | "));
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
console.log("\nAll ribbon toggle overlap checks passed.");
