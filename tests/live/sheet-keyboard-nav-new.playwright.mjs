/**
 * Test: Sheet Keyboard Navigation moi (fix/keyboard-navigation-sheet)
 * Xac nhan: PageUp/PageDown di chuyen o, Shift+F10 mo context menu bang ban phim
 */
import { pathToFileURL } from "node:url";
import path from "node:path";

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"]
});
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", err => consoleErrors.push(err.message));
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

await page.goto("http://127.0.0.1:8769/", { waitUntil: "networkidle" });

await page.locator("#vno-switcher-toggle").click();
await page.locator('[data-switch="sheet"]').click();
await page.locator('.vno-shell[data-app="sheet"]').waitFor();

async function getSelectedCoord() {
  return await page.evaluate(async () => {
    const uno = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge;
    const g = uno.activeDocument.grid;
    return { c: g.selectedCoord.c, r: g.selectedCoord.r };
  });
}

async function clickCell(coord) {
  const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
}

console.log("=== KIEM TRA KEYBOARD NAVIGATION MOI - SHEET ===");
const results = [];

async function testStep(stt, name, fn) {
  try {
    await fn();
    console.log(`[PASS] Buoc ${stt}: ${name}`);
    results.push({ stt, name, pass: true });
  } catch (err) {
    console.error(`[FAIL] Buoc ${stt}: ${name}\n       Loi: ${err.message}`);
    results.push({ stt, name, pass: false, error: err.message });
  }
}

// Area 1: PageDown
await testStep(1, "PageDown di chuyen o xuong nhieu hang (khong Ctrl)", async () => {
  await clickCell("A1");
  const before = await getSelectedCoord();
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(100);
  const after = await getSelectedCoord();
  if (after.c !== "A") throw new Error(`Sau PageDown cot thay doi: ${after.c}`);
  if (after.r <= before.r + 4) throw new Error(`Sau PageDown row tang ${after.r - before.r} (mong muon >= 5), sau: row ${after.r}`);
});

// Area 1: PageUp
await testStep(2, "PageUp di chuyen o len nhieu hang (khong Ctrl)", async () => {
  const before = await getSelectedCoord();
  await page.keyboard.press("PageUp");
  await page.waitForTimeout(100);
  const after = await getSelectedCoord();
  if (after.c !== before.c) throw new Error(`Sau PageUp cot thay doi: ${after.c}`);
  if (after.r >= before.r - 4) throw new Error(`Sau PageUp row chi giam ${before.r - after.r} (mong muon >= 5)`);
});

// Area 1: PageUp at A1 boundary
await testStep(3, "PageUp tu A1 khong vuot bien (dung lai A1)", async () => {
  await clickCell("A1");
  await page.keyboard.press("PageUp");
  await page.waitForTimeout(100);
  const coord = await getSelectedCoord();
  if (coord.r !== 1) throw new Error(`Sau PageUp tu A1, mong muon row 1, thuc te row ${coord.r}`);
});

// Area 3: Shift+F10 opens context menu
await testStep(4, "Shift+F10 mo context menu bang ban phim", async () => {
  await clickCell("C5");
  await page.waitForTimeout(100);
  await page.keyboard.press("Shift+F10");
  await page.waitForTimeout(300);
  const menuVisible = await page.evaluate(() => {
    const m = document.querySelector(".vno-sheet-context-menu");
    return m !== null;
  });
  if (!menuVisible) throw new Error("Shift+F10 khong mo context menu (khong tim thay .vno-sheet-context-menu)");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
});

// Area 3: After close, grid still navigable
await testStep(5, "Sau Escape tu context menu, Arrow key van hoat dong", async () => {
  await clickCell("D10");
  await page.waitForTimeout(100);
  await page.keyboard.press("Shift+F10");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const coordBefore = await getSelectedCoord();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  const coordAfter = await getSelectedCoord();
  if (coordAfter.r !== coordBefore.r + 1) {
    throw new Error(`Sau Escape, ArrowDown khong hoat dong: ${coordBefore.c}${coordBefore.r} -> ${coordAfter.c}${coordAfter.r}`);
  }
});

// Area 2: Ribbon tab navigation
await testStep(6, "Ribbon tab ArrowRight chuyen tab", async () => {
  const firstTab = page.locator(".vno-ribbon-tab").first();
  await firstTab.focus();
  const beforeLabel = await firstTab.evaluate(el => el.textContent.trim());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  const activeLabel = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (activeLabel === beforeLabel) throw new Error(`Sau ArrowRight, focus van o tab "${beforeLabel}"`);
});

// Area 2: Ribbon buttons focusable
await testStep(7, "Ribbon tabpanel co button tuong tac duoc bang ban phim", async () => {
  const hasBtn = await page.evaluate(() => {
    const panel = document.querySelector("[role='tabpanel']");
    if (!panel) return false;
    return panel.querySelectorAll("button:not([disabled])").length > 0;
  });
  if (!hasBtn) throw new Error("Ribbon tabpanel khong co button nao");
});

console.log("\n=== TONG KET ===");
let passed = 0, failed = 0;
for (const r of results) { if (r.pass) passed++; else failed++; }
console.log(`Ket qua: ${passed}/${results.length} PASS | ${failed} FAIL`);
if (consoleErrors.length > 0) console.log("Console errors:", consoleErrors.slice(0, 5));
await browser.close();
process.exit(failed > 0 ? 1 : 0);
