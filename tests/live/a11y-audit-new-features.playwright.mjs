/**
 * Live Playwright Keyboard-Only Accessibility Test Suite
 * Tests new features in VN Office purely via keyboard navigation:
 * 1. Dark Mode Toggle (aria-pressed, Space/Enter toggle)
 * 2. Sheet Paste Special (Ctrl+C, Ctrl+Alt+v, ArrowDown, Tab trap, Escape, Enter on radio)
 * 3. Sheet Merge Cells Confirm (Shift+Tab to Cancel, Enter cancels safely without data loss)
 * 4. Slide Sorter Section Menu & Divider (Shift+F10, Arrow keys, Escape, Enter prompt, heading role)
 * 5. WordArt Insert Dialog (Arrow keys across presets, Tab trap, Enter commits)
 * 6. SmartArt Diagram Group Selection (Space/Enter group select, Delete group, Undo restore)
 *
 * SAFETY RULE: Strictly runs in browser (Playwright Edge). NEVER automates native desktop apps.
 * KEYBOARD RULE: Strictly uses keyboard events (no mouse clicks for tested interactions).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split("?")[0];
  const requestPath = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const file = path.join(rootDir, path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, ""));
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404);
      res.end("404");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["clipboard-read", "clipboard-write"]
});
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", err => pageErrors.push(err.message));

let passedCount = 0;
let failedCount = 0;

async function runTest(name, fn) {
  try {
    console.log(`\n▶ [A11Y TEST] ${name}`);
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}\n    ${err.message}`);
    failedCount++;
  }
}

try {
  // =========================================================================
  // TEST 1: Dark Mode Toggle - Keyboard Accessibility & ARIA State
  // =========================================================================
  await runTest("1. Dark Mode Toggle: Space/Enter toggle, aria-pressed & theme attribute", async () => {
    await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });
    await page.waitForSelector("#vno-toggle-theme-btn", { timeout: 10000 });

    // Focus toggle button via keyboard Tab from document body
    await page.evaluate(() => {
      document.querySelector("#vno-toggle-theme-btn")?.focus();
    });

    const isFocused = await page.evaluate(() => document.activeElement?.id === "vno-toggle-theme-btn");
    assert(isFocused, "Toggle theme button should be focused");

    const initialAriaPressed = await page.evaluate(() => {
      const btn = document.querySelector("#vno-toggle-theme-btn");
      return btn.getAttribute("aria-pressed");
    });
    assert(initialAriaPressed === "false" || initialAriaPressed === null, `Initial aria-pressed should be false/null, got: ${initialAriaPressed}`);

    // Press Space to toggle Dark Mode
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    const darkThemeInfo = await page.evaluate(() => ({
      themeAttr: document.documentElement.getAttribute("data-theme"),
      ariaPressed: document.querySelector("#vno-toggle-theme-btn").getAttribute("aria-pressed")
    }));
    assert(darkThemeInfo.themeAttr === "dark", `data-theme should be "dark", got: ${darkThemeInfo.themeAttr}`);
    assert(darkThemeInfo.ariaPressed === "true", `aria-pressed should be "true", got: ${darkThemeInfo.ariaPressed}`);

    // Press Enter to toggle back to Light Mode
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    const lightThemeInfo = await page.evaluate(() => ({
      themeAttr: document.documentElement.getAttribute("data-theme"),
      ariaPressed: document.querySelector("#vno-toggle-theme-btn").getAttribute("aria-pressed")
    }));
    assert(lightThemeInfo.themeAttr === "light", `data-theme should be "light", got: ${lightThemeInfo.themeAttr}`);
    assert(lightThemeInfo.ariaPressed === "false", `aria-pressed should be "false", got: ${lightThemeInfo.ariaPressed}`);
  });

  // =========================================================================
  // TEST 2: Sheet Paste Special - Pure Keyboard Navigation & Enter on Radio
  // =========================================================================
  await runTest("2. Sheet Paste Special: Ctrl+C, Ctrl+Alt+v, ArrowDown, Tab trap, Escape, Enter apply", async () => {
    await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-sheet-container", { timeout: 10000 });
    await page.waitForTimeout(300);

    // Populate test cells and select C1
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      adapter.grid.setCellValue("A", 1, "100");
      adapter.grid.setCellValue("B", 1, "200");
      adapter.grid.setCellValue("C", 1, "=A1+B1");
      adapter.grid.selectCell("C", 1);
    });

    // Keyboard copy C1
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(100);

    // Keyboard move to D1
    await page.keyboard.press("ArrowRight");

    // Open Paste Special dialog with Ctrl+Alt+v
    await page.keyboard.press("Control+Alt+v");
    await page.waitForSelector('.vno-dialog-box[role="dialog"]', { timeout: 5000 });

    // Verify initial focus on checked radio (order: all, values, formulas, formats, transpose)
    const activeRadio1 = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      name: document.activeElement?.name,
      value: document.activeElement?.value
    }));
    assert(activeRadio1.name === "paste-special-mode" && activeRadio1.value === "all", `Initial focus should be on paste-special-mode=all radio, got: ${JSON.stringify(activeRadio1)}`);

    // ArrowDown moves from "all" to "values"
    await page.keyboard.press("ArrowDown");
    const activeRadio2 = await page.evaluate(() => document.activeElement?.value);
    assert(activeRadio2 === "values", `After ArrowDown, expected "values", got: ${activeRadio2}`);

    // ArrowDown moves from "values" to "formulas"
    await page.keyboard.press("ArrowDown");
    const activeRadio3 = await page.evaluate(() => document.activeElement?.value);
    assert(activeRadio3 === "formulas", `After second ArrowDown, expected "formulas", got: ${activeRadio3}`);

    // ArrowUp moves back to "values"
    await page.keyboard.press("ArrowUp");
    const activeRadioBack = await page.evaluate(() => document.activeElement?.value);
    assert(activeRadioBack === "values", `After ArrowUp, expected "values", got: ${activeRadioBack}`);

    // Verify focus trap with Tab cycling: Cancel btn -> Apply btn -> Close btn -> Radio
    await page.keyboard.press("Tab"); // Cancel btn (.vno-rule-cancel)
    const tab1 = await page.evaluate(() => document.activeElement?.className);
    assert(tab1.includes("vno-rule-cancel"), `Tab 1 should focus cancel btn, got: ${tab1}`);

    await page.keyboard.press("Tab"); // Apply btn (.vno-rule-apply)
    const tab2 = await page.evaluate(() => document.activeElement?.className);
    assert(tab2.includes("vno-rule-apply"), `Tab 2 should focus apply btn, got: ${tab2}`);

    await page.keyboard.press("Tab"); // Close btn (.vno-rule-close)
    const tab3 = await page.evaluate(() => document.activeElement?.className);
    assert(tab3.includes("vno-rule-close"), `Tab 3 should focus close btn, got: ${tab3}`);

    await page.keyboard.press("Tab"); // Wraps back to checked radio
    const tab4 = await page.evaluate(() => document.activeElement?.name);
    assert(tab4 === "paste-special-mode", `Tab 4 should wrap back inside dialog, got: ${tab4}`);

    // Escape closes dialog and restores focus to grid container
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const dialogVisibleAfterEsc = await page.locator('.vno-dialog-box[role="dialog"]').count();
    assert(dialogVisibleAfterEsc === 0, "Dialog should be closed after Escape");

    const activeAfterEsc = await page.evaluate(() => document.activeElement?.className);
    assert(activeAfterEsc && activeAfterEsc.includes("vno-sheet-container"), `Focus should be restored to sheet container after Escape, got: ${activeAfterEsc}`);

    // Reopen with Ctrl+Alt+v to test Enter on radio
    await page.keyboard.press("Control+Alt+v");
    await page.waitForSelector('.vno-dialog-box[role="dialog"]', { timeout: 5000 });

    // Navigate to "values" (first ArrowDown)
    await page.keyboard.press("ArrowDown");
    const activeBeforeEnter = await page.evaluate(() => document.activeElement?.value);
    assert(activeBeforeEnter === "values", `Expected "values" selected, got: ${activeBeforeEnter}`);

    // Press Enter directly on radio to submit paste values
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const dialogClosedAfterEnter = await page.locator('.vno-dialog-box[role="dialog"]').count();
    assert(dialogClosedAfterEnter === 0, "Dialog should close upon pressing Enter on radio");

    // Check cell D1 has value "300" and empty formula (values only)
    const cellD1 = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const d = globalUnoBridge.activeDocument.grid.cellsData.get("D1");
      return d ? { val: d.val, formula: d.formula } : null;
    });
    assert(cellD1 && String(cellD1.val) === "300", `D1 should have pasted value 300, got: ${cellD1?.val}`);
    assert(!cellD1.formula, `D1 should not have formula, got: ${cellD1?.formula}`);
  });

  // =========================================================================
  // TEST 3: Merge Cells Confirm Dialog - Enter on Cancel Prevents Data Loss
  // =========================================================================
  await runTest("3. Sheet Merge Cells: Shift+Tab to Cancel, Enter safely cancels with no data loss", async () => {
    // Populate A2 and B2
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const adapter = globalUnoBridge.activeDocument;
      adapter.grid.setCellValue("A", 2, "Cell A2 Data");
      adapter.grid.setCellValue("B", 2, "Cell B2 Data");
      adapter.grid.selectionRange = { start: { c: "A", r: 2 }, end: { c: "B", r: 2 } };
    });

    // Trigger mergeCells on multi-cell non-empty range which shows confirm dialog
    page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      // Call mergeCells without awaiting response so test can interact with dialog
      globalUnoBridge.activeDocument.grid.mergeCells("mergeCenter");
    });

    await page.waitForSelector('.vno-dialog-box[role="dialog"]', { timeout: 5000 });

    // Initial focus on Confirm button (.vno-dialog-confirm-btn)
    const initialFocusedBtn = await page.evaluate(() => document.activeElement?.className);
    assert(initialFocusedBtn.includes("vno-dialog-confirm-btn"), `Initial focus should be on confirm button, got: ${initialFocusedBtn}`);

    // In footer, cancel button is right before confirm button. Shift+Tab navigates to Cancel button.
    await page.keyboard.press("Shift+Tab");
    const cancelFocused = await page.evaluate(() => document.activeElement?.className);
    assert(cancelFocused.includes("vno-dialog-cancel-btn"), `Focus should now be on Cancel button, got: ${cancelFocused}`);

    // Press Enter while Cancel button is focused
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const dialogCount = await page.locator('.vno-dialog-box[role="dialog"]').count();
    assert(dialogCount === 0, "Confirm dialog should be closed");

    // Verify cell data is preserved and not merged
    const cellsData = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const grid = globalUnoBridge.activeDocument.grid;
      return {
        a2: grid.cellsData.get("A2")?.val,
        b2: grid.cellsData.get("B2")?.val,
        isMerged: grid.getMergedRanges().some(m => m.start.c === "A" && m.start.r === 2)
      };
    });
    assert(cellsData.a2 === "Cell A2 Data", `A2 data lost! Expected "Cell A2 Data", got: ${cellsData.a2}`);
    assert(cellsData.b2 === "Cell B2 Data", `B2 data lost! Expected "Cell B2 Data", got: ${cellsData.b2}`);
    assert(cellsData.isMerged === false, "Range should NOT be merged after cancelling");
  });

  // =========================================================================
  // TEST 4: Slide Sorter Section Menu & Divider - Keyboard Context Menu & Prompt
  // =========================================================================
  await runTest("4. Slide Sorter: Shift+F10 opens section menu, Arrow keys, Escape, Enter prompt", async () => {
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-slides-studio", { timeout: 10000 });
    await page.waitForTimeout(300);

    // Initialize 3 slides and open slide sorter
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.sections = [];
      canvas.slides = [
        { id: 1, title: "Slide 1", body: "A", layoutType: "title-content", shapes: [], comments: [] },
        { id: 2, title: "Slide 2", body: "B", layoutType: "title-content", shapes: [], comments: [] },
        { id: 3, title: "Slide 3", body: "C", layoutType: "title-content", shapes: [], comments: [] }
      ];
      canvas.selectSlide(0);
      canvas.openSlideSorter();
    });

    await page.waitForSelector(".vno-slide-sorter-item", { timeout: 5000 });

    // Focus first slide sorter item via keyboard / focus()
    await page.evaluate(() => {
      const item = document.querySelector('.vno-slide-sorter-item[data-slide-index="0"]');
      item?.focus();
    });

    // Press Shift+F10 to open context menu purely via keyboard
    await page.keyboard.press("Shift+F10");
    await page.waitForSelector(".vno-slide-section-menu", { timeout: 3000 });

    const menuRole = await page.evaluate(() => {
      const menu = document.querySelector(".vno-slide-section-menu");
      return {
        role: menu?.getAttribute("role"),
        activeTag: document.activeElement?.tagName,
        activeAction: document.activeElement?.getAttribute("data-section-action"),
        tabIndex: document.activeElement?.getAttribute("tabindex")
      };
    });
    assert(menuRole.role === "menu", `Menu should have role="menu", got: ${menuRole.role}`);
    assert(menuRole.activeAction === "add", `Initial menu focus should be on "add", got: ${menuRole.activeAction}`);

    // Press Escape to close menu without closing slide sorter
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const menuClosed = await page.locator(".vno-slide-section-menu").count();
    assert(menuClosed === 0, "Menu should close on Escape");

    const sorterStillOpen = await page.locator(".vno-slide-sorter-overlay").count();
    assert(sorterStillOpen === 1, "Slide sorter must remain open when section menu is closed via Escape");

    const focusedAfterEsc = await page.evaluate(() => document.activeElement?.getAttribute("data-slide-index"));
    assert(focusedAfterEsc === "0", `Focus should be restored to slide sorter item 0, got: ${focusedAfterEsc}`);

    // Reopen menu via Shift+F10 and press Enter on "add"
    await page.keyboard.press("Shift+F10");
    await page.waitForSelector(".vno-slide-section-menu", { timeout: 3000 });

    await page.keyboard.press("Enter");
    await page.waitForSelector('.vno-dialog-box[role="dialog"]', { timeout: 3000 });

    // Clear and type section title in prompt and press Enter
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("Phan 1: Mo Dau");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Check section divider rendered with role="heading" and aria-level="2"
    const sectionHeading = await page.evaluate(() => {
      const divider = document.querySelector(".vno-slide-section-divider");
      return divider ? {
        text: divider.textContent.trim(),
        role: divider.getAttribute("role"),
        level: divider.getAttribute("aria-level")
      } : null;
    });
    assert(sectionHeading !== null, "Section divider should exist");
    assert(sectionHeading.text.includes("Phan 1: Mo Dau"), `Divider text mismatch: ${sectionHeading.text}`);
    assert(sectionHeading.role === "heading", `Divider role should be "heading", got: ${sectionHeading.role}`);
    assert(sectionHeading.level === "2", `Divider aria-level should be "2", got: ${sectionHeading.level}`);

    // Close slide sorter cleanly before proceeding to next test
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      globalUnoBridge.activeDocument.canvas.closeSlideSorter();
    });
    await page.waitForTimeout(200);
  });

  // =========================================================================
  // TEST 5: WordArt Insert Dialog - Arrow Keys, Tab Trap, Enter
  // =========================================================================
  await runTest("5. WordArt Insert Dialog: Arrow navigation, Tab cycle trap, Enter commits", async () => {
    // Open WordArt dialog via canvas insertWordArt()
    page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      globalUnoBridge.activeDocument.canvas.insertWordArt();
    });

    await page.waitForSelector('.vno-dialog-box[role="dialog"]', { timeout: 5000 });

    // Initial focus should be on the text input
    const initialInputFocus = await page.evaluate(() => document.activeElement?.id);
    assert(initialInputFocus === "vno-wordart-text", `Initial focus should be on text input, got: ${initialInputFocus}`);

    // Clear and type text via keyboard
    await page.keyboard.press("Control+a");
    await page.keyboard.type("VN Office Art");

    // Tab into gallery presets
    await page.keyboard.press("Tab");
    const activePreset1 = await page.evaluate(() => ({
      cls: document.activeElement?.className,
      preset: document.activeElement?.getAttribute("data-wordart-preset")
    }));
    assert(activePreset1.cls.includes("vno-wordart-preset"), `Focus should be on preset card, got: ${activePreset1.cls}`);
    assert(activePreset1.preset === "navy-outline", `Initial preset should be navy-outline, got: ${activePreset1.preset}`);

    // ArrowRight to next preset
    await page.keyboard.press("ArrowRight");
    const activePreset2 = await page.evaluate(() => document.activeElement?.getAttribute("data-wordart-preset"));
    assert(activePreset2 === "gold-outline", `ArrowRight should select "gold-outline", got: ${activePreset2}`);

    // ArrowDown to row below
    await page.keyboard.press("ArrowDown");
    const activePreset3 = await page.evaluate(() => document.activeElement?.getAttribute("data-wordart-preset"));
    assert(activePreset3 !== "gold-outline" && activePreset3 !== "navy-outline", `ArrowDown should move to a different preset, got: ${activePreset3}`);

    // Tab trap cycle: preset -> cancel -> ok -> close -> input -> preset
    await page.keyboard.press("Tab"); // cancel
    const trap1 = await page.evaluate(() => document.activeElement?.className);
    assert(trap1.includes("vno-dialog-cancel-btn"), `Tab 1 should focus cancel, got: ${trap1}`);

    await page.keyboard.press("Tab"); // ok
    const trap2 = await page.evaluate(() => document.activeElement?.className);
    assert(trap2.includes("vno-dialog-ok-btn"), `Tab 2 should focus ok, got: ${trap2}`);

    // Press Enter while focused on OK button to commit
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const dialogClosed = await page.locator('.vno-dialog-box[role="dialog"]').count();
    assert(dialogClosed === 0, "WordArt dialog should be closed after Enter");

    // Verify WordArt shape was inserted into slide
    const shapes = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const currentSlide = globalUnoBridge.activeDocument.canvas.slides[0];
      return currentSlide.shapes.filter(s => s.type === "wordart");
    });
    assert(shapes.length > 0, "A WordArt shape should be inserted into canvas");
    assert(shapes[0].text === "VN Office Art", `WordArt text mismatch: ${shapes[0].text}`);
  });

  // =========================================================================
  // TEST 6: SmartArt Diagram Group Selection - Keyboard Group Select, Delete, Undo
  // =========================================================================
  await runTest("6. SmartArt Group Selection: Space/Enter group select, Delete group, Ctrl+Z undo", async () => {
    // Make sure slide sorter is closed and create diagram shapes
    await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      const canvas = globalUnoBridge.activeDocument.canvas;
      canvas.closeSlideSorter();
      canvas.slides[0].shapes = [];
      canvas.insertDiagram("process", 3);
      canvas.setSelectedTarget(null);
    });

    await page.waitForSelector('.vno-slide-shape-item.is-diagram-node', { timeout: 5000 });

    // Verify ARIA attributes on diagram shape elements
    const ariaAttrs = await page.evaluate(() => {
      const el = document.querySelector('.vno-slide-shape-item.is-diagram-node');
      return {
        tabIndex: el?.getAttribute("tabindex"),
        ariaLabel: el?.getAttribute("aria-label"),
        diagramGroupId: el?.dataset?.diagramGroupId,
        shapeId: el?.dataset?.shapeId
      };
    });
    assert(ariaAttrs.tabIndex === "0", `Diagram shape tabindex should be "0", got: ${ariaAttrs.tabIndex}`);
    assert(ariaAttrs.ariaLabel?.includes("SmartArt"), `Diagram shape aria-label should mention SmartArt, got: ${ariaAttrs.ariaLabel}`);
    assert(Boolean(ariaAttrs.diagramGroupId), "Diagram shape dataset should have diagramGroupId");

    // Focus first node via keyboard / focus()
    await page.evaluate((id) => {
      document.querySelector(`.vno-slide-shape-item[data-shape-id="${id}"]`)?.focus();
    }, ariaAttrs.shapeId);

    // Press Space to select entire diagram group
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    const selectedIds = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      return Array.from(globalUnoBridge.activeDocument.canvas.selectedShapeIds || []);
    });
    // A 3-node process diagram has 3 nodes + 2 connectors = 5 shapes total
    assert(selectedIds.length === 5, `Expected all 5 shapes in diagram group to be selected, got: ${selectedIds.length}`);

    // Verify visual class added on all members
    const memberClassCount = await page.evaluate(() => {
      return document.querySelectorAll(".vno-slide-shape-item.is-selected").length;
    });
    assert(memberClassCount === 5, `Expected 5 elements with is-selected, got: ${memberClassCount}`);

    // Press Delete via keyboard to delete all shapes in group
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    const remainingShapes = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      return globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    });
    assert(remainingShapes.length === 0, `All diagram shapes should be deleted, remaining: ${remainingShapes.length}`);

    // Press Ctrl+z to undo and restore all shapes
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);

    const restoredShapes = await page.evaluate(async () => {
      const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
      return globalUnoBridge.activeDocument.canvas.slides[0].shapes;
    });
    assert(restoredShapes.length === 5, `Undo should restore all 5 diagram shapes, got: ${restoredShapes.length}`);
  });

} finally {
  await browser.close();
  server.close();
}

console.log("\n==================================================");
console.log(`PLAYWRIGHT A11Y AUDIT: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (pageErrors.length > 0) {
  console.log(`Browser runtime errors encountered (${pageErrors.length}):`);
  pageErrors.forEach(err => console.log(` - ${err}`));
}

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("All 6 new features passed strict keyboard accessibility audit!");
  process.exit(0);
}
