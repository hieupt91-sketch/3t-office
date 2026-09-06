/**
 * Live Playwright test for VN Slides Animation Pane keyboard navigation:
 * 1. Open Animation Pane via keyboard Enter on trigger button
 * 2. Roving tabindex & ArrowUp/Down navigation between animation items
 * 3. Alt+Shift+Up and Alt+Shift+Down reordering via keyboard with focus preservation
 * 4. Delete key removing animation with focus preservation
 * 5. Escape key closing Animation Pane and restoring focus to trigger element
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SLIDES_ANIM_KEYNAV_PORT || 8839);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
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

await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (msg) => console.log("PAGE:", msg.text()));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="slides"]').click();
  await page.waitForTimeout(400);

  // Set up slide with 3 animations
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const canvas = globalUnoBridge.activeDocument.canvas;
    canvas.slides = [{
      id: 1,
      title: "Tiêu đề số 1",
      body: "Nội dung số 2",
      layoutType: "title-content",
      shapes: [{
        id: "rect-77",
        type: "rect",
        x: 40,
        y: 120,
        w: 160,
        h: 70,
        color: "#2563eb",
        text: "Hình vẽ số 3",
        animation: { type: "zoomIn", duration: 400, delay: 0, order: 2, start: "onClick" }
      }],
      comments: [],
      hidden: false,
      titleAnimation: { type: "fadeIn", duration: 500, delay: 0, order: 0, start: "onClick" },
      bodyAnimation: { type: "flyIn", duration: 300, delay: 0, order: 1, start: "afterPrevious" }
    }];
    canvas.selectSlide(0);
  });

  // Switch to Animations ribbon tab
  await page.locator("#vno-ribbon-tab-animations").click();
  const paneBtn = page.locator('[data-command-id="slides.animation.pane"]');
  await paneBtn.waitFor({ state: "visible" });

  // 1. Focus trigger button and press Enter to open panel
  await paneBtn.focus();
  await page.keyboard.press("Enter");
  const pane = page.locator(".vno-animation-pane");
  await pane.waitFor({ state: "visible" });

  // Verify 3 items rendered
  const items = pane.locator(".vno-anim-pane-item");
  assert(await items.count() === 3, `Pane phải có 3 items, có ${await items.count()}`);

  // Verify roving tabindex: first item has tabindex 0, others -1
  assert(await items.nth(0).getAttribute("tabindex") === "0", "Item 0 phải có tabindex='0'");
  assert(await items.nth(1).getAttribute("tabindex") === "-1", "Item 1 phải có tabindex='-1'");
  assert(await items.nth(2).getAttribute("tabindex") === "-1", "Item 2 phải có tabindex='-1'");

  // Focus item 0 if not already focused
  await items.nth(0).focus();
  const focusedIndex1 = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute?.("data-anim-index");
  });
  assert(focusedIndex1 === "0", `Item 0 phải có focus, đang là ${focusedIndex1}`);

  // 2. ArrowDown moves to item 1
  await page.keyboard.press("ArrowDown");
  const focusedIndex2 = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute?.("data-anim-index");
  });
  assert(focusedIndex2 === "1", `Sau ArrowDown, item 1 phải có focus, nhận ${focusedIndex2}`);
  assert(await items.nth(1).getAttribute("tabindex") === "0", "Item 1 roving tabindex thành '0'");
  assert(await items.nth(0).getAttribute("tabindex") === "-1", "Item 0 roving tabindex thành '-1'");
  assert(await items.nth(1).getAttribute("aria-selected") === "true", "Item 1 aria-selected='true'");

  // ArrowDown moves to item 2
  await page.keyboard.press("ArrowDown");
  const focusedIndex3 = await page.evaluate(() => document.activeElement?.getAttribute?.("data-anim-index"));
  assert(focusedIndex3 === "2", `Sau ArrowDown lần 2, item 2 phải có focus, nhận ${focusedIndex3}`);

  // ArrowUp moves back to item 1
  await page.keyboard.press("ArrowUp");
  const focusedIndex4 = await page.evaluate(() => document.activeElement?.getAttribute?.("data-anim-index"));
  assert(focusedIndex4 === "1", `Sau ArrowUp, item 1 phải có focus, nhận ${focusedIndex4}`);

  // 3. Alt+Shift+ArrowUp: moves item 1 up to index 0
  const labelsBefore = await items.locator(".vno-anim-pane-object").allTextContents();
  assert(/Tiêu đề/i.test(labelsBefore[0]), `Item 0 ban đầu là Tiêu đề: ${labelsBefore[0]}`);
  assert(/Nội dung/i.test(labelsBefore[1]), `Item 1 ban đầu là Nội dung: ${labelsBefore[1]}`);

  await page.keyboard.press("Alt+Shift+ArrowUp");
  await page.waitForTimeout(100);

  const labelsAfterUp = await items.locator(".vno-anim-pane-object").allTextContents();
  assert(/Nội dung/i.test(labelsAfterUp[0]), `Sau Alt+Shift+Up, Item 0 phải là Nội dung: ${labelsAfterUp[0]}`);
  assert(/Tiêu đề/i.test(labelsAfterUp[1]), `Sau Alt+Shift+Up, Item 1 phải là Tiêu đề: ${labelsAfterUp[1]}`);

  // Focus must remain on the moved item (now at index 0)
  const focusedAfterUp = await page.evaluate(() => document.activeElement?.getAttribute?.("data-anim-index"));
  assert(focusedAfterUp === "0", `Sau Alt+Shift+Up, focus phải theo đối tượng lên index 0, nhận ${focusedAfterUp}`);

  // 4. Alt+Shift+ArrowDown: moves item 0 back down to index 1
  await page.keyboard.press("Alt+Shift+ArrowDown");
  await page.waitForTimeout(100);

  const labelsAfterDown = await items.locator(".vno-anim-pane-object").allTextContents();
  assert(/Tiêu đề/i.test(labelsAfterDown[0]), `Sau Alt+Shift+Down, Item 0 phải là Tiêu đề: ${labelsAfterDown[0]}`);
  assert(/Nội dung/i.test(labelsAfterDown[1]), `Sau Alt+Shift+Down, Item 1 phải là Nội dung: ${labelsAfterDown[1]}`);

  const focusedAfterDown = await page.evaluate(() => document.activeElement?.getAttribute?.("data-anim-index"));
  assert(focusedAfterDown === "1", `Sau Alt+Shift+Down, focus phải theo đối tượng xuống index 1, nhận ${focusedAfterDown}`);

  // 5. Delete key removes current animation (item 1)
  await page.keyboard.press("Delete");
  await page.waitForTimeout(100);

  assert(await items.count() === 2, `Sau khi bấm Delete, số items còn 2, nhận ${await items.count()}`);
  const labelsAfterDelete = await items.locator(".vno-anim-pane-object").allTextContents();
  assert(/Tiêu đề/i.test(labelsAfterDelete[0]), `Item 0 còn lại là Tiêu đề: ${labelsAfterDelete[0]}`);
  assert(/Hình vẽ/i.test(labelsAfterDelete[1]), `Item 1 còn lại là Hình vẽ: ${labelsAfterDelete[1]}`);

  // Focus must not be lost to body after Delete
  const activeTagAfterDelete = await page.evaluate(() => document.activeElement?.tagName);
  assert(activeTagAfterDelete !== "BODY", `Focus không được rơi về BODY sau Delete, hiện tại là: ${activeTagAfterDelete}`);

  // 6. Escape key closes panel and restores focus to trigger element
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  const isHidden = await pane.isHidden();
  assert(isHidden, "Animation Pane phải đóng lại sau khi bấm Escape");

  const activeCommandAfterEscape = await page.evaluate(() => {
    return document.activeElement?.getAttribute?.("data-command-id");
  });
  assert(activeCommandAfterEscape === "slides.animation.pane", `Focus phải trả về trigger button slides.animation.pane, nhận ${activeCommandAfterEscape}`);

  assert(pageErrors.length === 0, `Có page errors: ${pageErrors.join(" | ")}`);
  console.log("LIVE PASS: Animation Pane keyboard navigation (Tab, ArrowUp/Down roving tabindex, Alt+Shift+Up/Down reorder, Delete remove, Escape restore focus)");
} finally {
  await browser?.close();
  server.close();
}
