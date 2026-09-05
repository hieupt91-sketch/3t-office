import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8798;
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

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end("Not Found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`[Audit Server] Serving at http://127.0.0.1:${port}`);

let browser;
const results = {
  area1_formatCells: {},
  area2_sheetStylesEditing: {},
  area3_ribbonGroups: {},
  area4_insertGaps: {},
  area5_dataTools: {},
  area6_slidesDialogs: {}
};

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });

  console.log("\n=======================================================");
  console.log("=== BAT DAU KIEM TRA MICRO-INTERACTION TOAN BO SUITE ===");
  console.log("=======================================================\n");

  // =========================================================================
  // AREA 1: Format Cells Dialog
  // =========================================================================
  console.log("▶ [AREA 1] Kiem tra Format Cells Dialog...");
  // Switch to Sheet
  if (await page.locator('.vno-shell[data-app="sheet"]').count() === 0) {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }

  const launcher = page.locator('.vno-ribbon-dialog-launcher[data-command="sheet.format.cellsDialog"]');
  await launcher.waitFor({ state: "visible" });
  
  // Check launcher resting style
  const launcherResting = await launcher.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      opacity: cs.opacity,
      transition: cs.transition,
      classList: Array.from(el.classList)
    };
  });
  results.area1_formatCells.launcherResting = launcherResting;
  console.log("  - Launcher resting:", launcherResting);

  // Hover launcher
  await launcher.hover();
  await page.waitForTimeout(100);
  const launcherHover = await launcher.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      opacity: cs.opacity,
      transition: cs.transition
    };
  });
  results.area1_formatCells.launcherHover = launcherHover;
  console.log("  - Launcher hover:", launcherHover);

  // Click launcher to open Format Cells dialog
  await launcher.click();
  const fcDialog = page.locator(".vno-format-cells-box");
  await fcDialog.waitFor({ state: "visible" });
  console.log("  - Format Cells dialog da mo");

  // Check category list items transition & hover
  const catItems = page.locator(".vno-fc-cat-item");
  const catCount = await catItems.count();
  console.log(`  - So luong categories: ${catCount}`);

  const firstCat = catItems.first();
  const catResting = await firstCat.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cursor: cs.cursor
    };
  });
  results.area1_formatCells.catResting = catResting;
  console.log("  - Category resting style:", catResting);

  // Hover category 2 (number)
  const numCat = page.locator('.vno-fc-cat-item[data-cat="number"]');
  await numCat.hover();
  await page.waitForTimeout(100);
  const catHover = await numCat.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      backgroundColor: cs.backgroundColor,
      color: cs.color
    };
  });
  results.area1_formatCells.catHover = catHover;
  console.log("  - Category hover style:", catHover);

  // Check disabled tabs in Format Cells
  const disabledTab = page.locator('.vno-fc-tab[aria-disabled="true"]').first();
  const disabledTabStyle = await disabledTab.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      cursor: cs.cursor,
      transition: cs.transition,
      opacity: cs.opacity
    };
  });
  results.area1_formatCells.disabledTabStyle = disabledTabStyle;
  console.log("  - Disabled tab style:", disabledTabStyle);

  // Close dialog via Close button (&times;)
  const fcCloseBtn = page.locator(".vno-fc-close-btn");
  await fcCloseBtn.click();
  await fcDialog.waitFor({ state: "hidden" });
  console.log("  - Dialog da dong");

  // Move mouse away to neutral area
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);

  // Check launcher after close & mouse move away
  const launcherAfterClose = await launcher.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      opacity: cs.opacity,
      classList: Array.from(el.classList),
      isFocused: document.activeElement === el
    };
  });
  results.area1_formatCells.launcherAfterClose = launcherAfterClose;
  console.log("  - Launcher sau khi dong & di chuot ra:", launcherAfterClose);


  // =========================================================================
  // AREA 2: Sheet Styles & Editing group
  // =========================================================================
  console.log("\n▶ [AREA 2] Kiem tra Sheet Styles & Editing Group...");
  // Cell Styles gallery button
  const cellStylesBtn = page.locator('[data-command-id="sheet.style.cellStyles"]');
  await cellStylesBtn.waitFor({ state: "visible" });

  const cellStylesBtnResting = await cellStylesBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor,
      classList: Array.from(el.classList)
    };
  });
  results.area2_sheetStylesEditing.cellStylesBtnResting = cellStylesBtnResting;
  console.log("  - Cell Styles btn resting:", cellStylesBtnResting);

  // Open Cell Styles dialog
  await cellStylesBtn.click();
  const cellStylesDialog = page.locator(".vno-cell-styles-dialog .vno-dialog-box");
  await cellStylesDialog.waitFor({ state: "visible" });
  console.log("  - Cell Styles gallery da mo");

  // Inspect cell style card transition & hover
  const styleCard = page.locator(".vno-cell-style-card").first();
  const cardResting = await styleCard.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      borderColor: cs.borderColor,
      boxShadow: cs.boxShadow
    };
  });
  results.area2_sheetStylesEditing.cardResting = cardResting;
  console.log("  - Cell style card resting:", cardResting);

  await styleCard.hover();
  await page.waitForTimeout(100);
  const cardHover = await styleCard.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      borderColor: cs.borderColor,
      boxShadow: cs.boxShadow
    };
  });
  results.area2_sheetStylesEditing.cardHover = cardHover;
  console.log("  - Cell style card hover:", cardHover);

  // Close Cell Styles dialog
  await page.locator(".vno-cell-styles-dialog .vno-dialog-close-btn").click();
  await cellStylesDialog.waitFor({ state: "hidden" });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);

  const cellStylesBtnAfterClose = await cellStylesBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor,
      classList: Array.from(el.classList)
    };
  });
  results.area2_sheetStylesEditing.cellStylesBtnAfterClose = cellStylesBtnAfterClose;
  console.log("  - Cell Styles btn sau khi dong:", cellStylesBtnAfterClose);

  // Format as Table button
  const formatTableBtn = page.locator('[data-command-id="sheet.style.formatAsTable"]');
  await formatTableBtn.click();
  const tableDialog = page.locator(".vno-format-table-dialog .vno-dialog-box");
  await tableDialog.waitFor({ state: "visible" });
  console.log("  - Format as Table dialog da mo");

  const tableCard = page.locator(".vno-table-style-card").first();
  const tableCardResting = await tableCard.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      borderColor: cs.borderColor
    };
  });
  results.area2_sheetStylesEditing.tableCardResting = tableCardResting;
  console.log("  - Table card resting:", tableCardResting);

  await page.locator(".vno-format-table-dialog .vno-dialog-close-btn").click();
  await tableDialog.waitFor({ state: "hidden" });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);


  // =========================================================================
  // AREA 3: Ribbon Groups Mới & Rapid Clicks
  // =========================================================================
  console.log("\n▶ [AREA 3] Kiem tra Ribbon Groups Moi & Decimal Rapid Clicks...");
  const incDecBtn = page.locator('[data-command-id="sheet.format.increaseDecimal"]');
  await incDecBtn.waitFor({ state: "visible" });

  // Rapid click decimal 5 times
  console.log("  - Thuc hien rapid click 5 lan vao Increase Decimal...");
  for (let i = 0; i < 5; i++) {
    await incDecBtn.click();
  }
  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);

  const incDecAfterRapid = await incDecBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      classList: Array.from(el.classList),
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor
    };
  });
  results.area3_ribbonGroups.incDecAfterRapid = incDecAfterRapid;
  console.log("  - Increase Decimal sau rapid click & di chuot ra:", incDecAfterRapid);

  // Check toggle button rapid toggle (Bold)
  const boldBtn = page.locator('[data-command-id="sheet.cell.bold"]');
  console.log("  - Rapid double-click toggle vao nút Bold...");
  await boldBtn.click();
  await boldBtn.click();
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);

  const boldAfterToggle = await boldBtn.evaluate(el => {
    return {
      classList: Array.from(el.classList),
      ariaPressed: el.getAttribute("aria-pressed")
    };
  });
  results.area3_ribbonGroups.boldAfterToggle = boldAfterToggle;
  console.log("  - Bold sau double-click toggle:", boldAfterToggle);

  // Check Selects transition
  const fontFamSelect = page.locator('select[data-command-id="sheet.font.family"]');
  const selectTransition = await fontFamSelect.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      borderColor: cs.borderColor
    };
  });
  results.area3_ribbonGroups.selectTransition = selectTransition;
  console.log("  - Font family select transition:", selectTransition);


  // =========================================================================
  // AREA 4: Insert-Tab Items (Symbol Picker, Date & Time, Text Box)
  // =========================================================================
  console.log("\n▶ [AREA 4] Kiem tra Insert-Tab Moi tren Writer...");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="writer"]').click();
  await page.locator('.vno-shell[data-app="writer"]').waitFor();

  await page.locator("#vno-ribbon-tab-insert").click();
  const symbolBtn = page.locator('[data-command-id="writer.insert.symbol"]');
  await symbolBtn.waitFor({ state: "visible" });

  const symbolBtnResting = await symbolBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      classList: Array.from(el.classList),
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor
    };
  });
  results.area4_insertGaps.symbolBtnResting = symbolBtnResting;
  console.log("  - Symbol button resting:", symbolBtnResting);

  // Click symbol button to open dialog
  await symbolBtn.click();
  const symbolPicker = page.locator('[data-vno-dialog="symbol-picker"] .vno-dialog-box');
  await symbolPicker.waitFor({ state: "visible" });
  console.log("  - Symbol picker da mo");

  // Inspect symbol cell transition
  const symbolCell = page.locator(".vno-symbol-cell").first();
  const symbolCellResting = await symbolCell.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      borderColor: cs.borderColor,
      backgroundColor: cs.backgroundColor
    };
  });
  results.area4_insertGaps.symbolCellResting = symbolCellResting;
  console.log("  - Symbol cell resting:", symbolCellResting);

  // Hover symbol cell
  await symbolCell.hover();
  await page.waitForTimeout(100);
  const symbolCellHover = await symbolCell.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      borderColor: cs.borderColor,
      backgroundColor: cs.backgroundColor
    };
  });
  results.area4_insertGaps.symbolCellHover = symbolCellHover;
  console.log("  - Symbol cell hover:", symbolCellHover);

  // Pick a character to close dialog
  await symbolCell.click();
  await symbolPicker.waitFor({ state: "hidden" });
  console.log("  - Da chon 1 ky tu, symbol picker da dong");

  // Move mouse away to neutral area
  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);

  const symbolBtnAfterClose = await symbolBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      classList: Array.from(el.classList),
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor,
      isFocused: document.activeElement === el
    };
  });
  results.area4_insertGaps.symbolBtnAfterClose = symbolBtnAfterClose;
  console.log("  - Symbol button sau khi dong & chuot di ra:", symbolBtnAfterClose);

  // Date & Time dialog
  const dateTimeBtn = page.locator('[data-command-id="writer.insert.dateTime"]');
  await dateTimeBtn.click();
  const dtDialog = page.locator('[data-vno-dialog="datetime-picker"] .vno-dialog-box');
  await dtDialog.waitFor({ state: "visible" });
  console.log("  - DateTime dialog da mo");

  const dtPreset = page.locator(".vno-datetime-preset").first();
  const dtPresetResting = await dtPreset.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      borderColor: cs.borderColor
    };
  });
  results.area4_insertGaps.dtPresetResting = dtPresetResting;
  console.log("  - DateTime preset resting:", dtPresetResting);

  await page.locator('[data-vno-dialog="datetime-picker"] .vno-dialog-close-btn').click();
  await dtDialog.waitFor({ state: "hidden" });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);


  // =========================================================================
  // AREA 5: Data Tools Sheet (Remove Duplicates, Subtotal, Text to Columns)
  // =========================================================================
  console.log("\n▶ [AREA 5] Kiem tra Data Tools Sheet Dialogs...");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  await page.locator("#vno-ribbon-tab-data").click();

  const rdBtn = page.locator('[data-command-id="sheet.data.removeDuplicates"]');
  await rdBtn.waitFor({ state: "visible" });
  
  await rdBtn.click();
  const rdDialog = page.locator('.vno-sheet-rule-dialog .vno-dialog-box');
  await rdDialog.waitFor({ state: "visible" });
  console.log("  - Remove Duplicates dialog da mo");

  // Check buttons and close button inside dialog
  const applyBtn = page.locator(".vno-rule-apply");
  const cancelBtn = page.locator(".vno-rule-cancel");
  const closeBtn = page.locator(".vno-rule-close");
  const rdButtonsStyle = await applyBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      cursor: cs.cursor
    };
  });
  const rdCloseBtnStyle = await closeBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      transition: cs.transition,
      cursor: cs.cursor,
      backgroundColor: cs.backgroundColor,
      color: cs.color
    };
  });
  results.area5_dataTools.rdButtonsStyle = rdButtonsStyle;
  results.area5_dataTools.rdCloseBtnStyle = rdCloseBtnStyle;
  console.log("  - Dialog button style:", rdButtonsStyle);
  console.log("  - Dialog close button style:", rdCloseBtnStyle);

  // Hover close button
  await closeBtn.hover();
  await page.waitForTimeout(80);
  const rdCloseBtnHover = await closeBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      color: cs.color
    };
  });
  results.area5_dataTools.rdCloseBtnHover = rdCloseBtnHover;
  console.log("  - Dialog close button hover:", rdCloseBtnHover);

  // Close dialog via cancel
  await cancelBtn.click();
  await rdDialog.waitFor({ state: "hidden" });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);

  const rdBtnAfterClose = await rdBtn.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      classList: Array.from(el.classList),
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderColor
    };
  });
  results.area5_dataTools.rdBtnAfterClose = rdBtnAfterClose;
  console.log("  - Remove Duplicates button sau khi dong:", rdBtnAfterClose);


  // =========================================================================
  // AREA 6: Slides Dialogs (SmartArt, Theme Gallery, Slide Size...)
  // =========================================================================
  console.log("\n▶ [AREA 6] Kiem tra Slides Dialogs...");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator('.vno-shell[data-app="slides"]').waitFor();

  // SmartArt (Insert -> Diagram)
  await page.locator("#vno-ribbon-tab-insert").click();
  const diagramBtn = page.locator('[data-command-id="slides.diagram.insert"]');
  if (await diagramBtn.count() > 0) {
    await diagramBtn.click();
    const diagramDialog = page.locator(".vno-diagram-dialog .vno-dialog-box");
    await diagramDialog.waitFor({ state: "visible" });
    console.log("  - SmartArt diagram dialog da mo bang chuot that");

    // Check non-selected diagram type (2nd type)
    const diagramTypes = page.locator(".vno-diagram-type");
    const secondType = diagramTypes.nth(1);
    const diagramTypeResting = await secondType.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        transition: cs.transition,
        borderColor: cs.borderColor,
        cursor: cs.cursor
      };
    });
    results.area6_slidesDialogs.diagramTypeResting = diagramTypeResting;
    console.log("  - Diagram type resting:", diagramTypeResting);

    await secondType.hover();
    await page.waitForTimeout(100);
    const diagramTypeHover = await secondType.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        borderColor: cs.borderColor,
        transform: cs.transform
      };
    });
    results.area6_slidesDialogs.diagramTypeHover = diagramTypeHover;
    console.log("  - Diagram type hover:", diagramTypeHover);

    // Close with cancel button
    await page.locator("#vno-diagram-cancel").click();
    await diagramDialog.waitFor({ state: "hidden" });
    console.log("  - SmartArt diagram dialog da dong bang click chuot that");
  }

  // Theme Gallery (Design -> Themes)
  await page.locator("#vno-ribbon-tab-design").click();
  const themeGalleryBtn = page.locator('[data-command-id="slides.design.themeGallery"]');
  if (await themeGalleryBtn.count() > 0) {
    await themeGalleryBtn.click();
    const themeDialog = page.locator(".vno-dialog-box");
    await themeDialog.waitFor({ state: "visible" });
    console.log("  - Theme Gallery dialog da mo");

    const themeCard = page.locator(".vno-theme-card").nth(1);
    const themeCardResting = await themeCard.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        transition: cs.transition,
        borderColor: cs.borderColor
      };
    });
    results.area6_slidesDialogs.themeCardResting = themeCardResting;
    console.log("  - Theme card resting:", themeCardResting);

    await themeCard.hover();
    await page.waitForTimeout(100);
    const themeCardHover = await themeCard.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        borderColor: cs.borderColor,
        transform: cs.transform
      };
    });
    results.area6_slidesDialogs.themeCardHover = themeCardHover;
    console.log("  - Theme card hover:", themeCardHover);

    await page.locator(".vno-dialog-close-btn").click();
    await page.waitForTimeout(100);
    console.log("  - Theme Gallery dialog da dong");
  }

  // Slide Size (Design -> Slide Size)
  await page.locator("#vno-ribbon-tab-design").click();
  const slideSizeBtn = page.locator('[data-command-id="slides.design.slideSize"]');
  if (await slideSizeBtn.count() > 0) {
    await slideSizeBtn.click();
    const slideSizeDialog = page.locator(".vno-dialog-box");
    await slideSizeDialog.waitFor({ state: "visible" });
    console.log("  - Slide Size dialog da mo");

    const wideCard = page.locator('.vno-theme-card[data-slide-size="wide"]');
    const wideCardResting = await wideCard.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        transition: cs.transition,
        borderColor: cs.borderColor,
        backgroundColor: cs.backgroundColor,
        ariaChecked: el.getAttribute("aria-checked")
      };
    });
    results.area6_slidesDialogs.slideSizeWideResting = wideCardResting;
    console.log("  - Slide size wide (active preset) resting:", wideCardResting);

    await page.locator(".vno-dialog-close-btn").click();
    await page.waitForTimeout(100);
    console.log("  - Slide Size dialog da dong");
  }

  console.log("\n=======================================================");
  console.log("=== KET QUA AUDIT BAN DAU HOAN TAT THU THAP DU LIEU ===");
  console.log("=======================================================\n");
  console.log(JSON.stringify(results, null, 2));

} catch (err) {
  console.error("LOI TRONG QUA TRINH AUDIT:", err);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
