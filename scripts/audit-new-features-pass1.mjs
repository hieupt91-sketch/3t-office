import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotsDir = path.join(root, "docs", "screenshots", "audit-round2");
const port = 8944;
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

fs.mkdirSync(screenshotsDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204).end(); return; }
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = (pathname === "/" || pathname === "") ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Server listening on http://127.0.0.1:${port}`);

const auditLog = [];
function logResult(category, title, details) {
  auditLog.push({ category, title, details });
  console.log(`[${category}] ${title}:`, JSON.stringify(details));
}

let browser;
try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });

  for (const theme of ["light", "dark"]) {
    console.log(`\n========== AUDITING THEME: ${theme.toUpperCase()} ==========`);
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
    const page = await context.newPage();

    await page.addInitScript((t) => {
      localStorage.setItem("vno-theme", t);
      localStorage.setItem("vno-locale", "vi");
    }, theme);

    // ==========================================
    // 1. SLIDES APP AUDIT
    // ==========================================
    console.log(`\n--- Auditing Slides in ${theme} mode ---`);
    await page.goto(`http://127.0.0.1:${port}/?app=slides`, { waitUntil: "networkidle" });
    await page.locator('.vno-shell[data-app="slides"]').waitFor();
    await page.waitForTimeout(500);

    // 1A. Slides Ribbon: Font & Paragraph groups on Home tab
    const fontGroup = page.locator('.vno-ribbon-group[data-group-id="font"]');
    if (await fontGroup.count() > 0) {
      await page.screenshot({ path: path.join(screenshotsDir, `slides-home-ribbon-${theme}.png`) });
      
      const boldBtn = page.locator('[data-command-id="slides.text.bold"]');
      const italicBtn = page.locator('[data-command-id="slides.text.italic"]');
      const underlineBtn = page.locator('[data-command-id="slides.text.underline"]');
      const growBtn = page.locator('[data-command-id="slides.font.grow"]');
      const shrinkBtn = page.locator('[data-command-id="slides.font.shrink"]');

      const boldPressed = await boldBtn.getAttribute("aria-pressed");
      const growSvg = await growBtn.locator("svg").innerHTML();
      const shrinkSvg = await shrinkBtn.locator("svg").innerHTML();

      logResult("Slides.Font", "Toggle button aria-pressed initial", {
        boldPressed,
        italicPressed: await italicBtn.getAttribute("aria-pressed"),
        underlinePressed: await underlineBtn.getAttribute("aria-pressed")
      });

      logResult("Slides.Font", "Font Grow / Shrink icon inspection", {
        growHasPolyline: growSvg.includes("<polyline"),
        shrinkHasPolyline: shrinkSvg.includes("<polyline"),
        growHasPath: growSvg.includes("<path"),
        isUsingIndentIcons: growSvg.includes("<line x1=\"21\"") || growSvg.includes("stroke=\"#2563EB\"")
      });
    }

    // 1B. Slides Insert Chart Dialog
    console.log("Opening Slides Insert Chart dialog...");
    // Switch to Insert tab
    const insertTab = page.locator("#vno-ribbon-tab-insert");
    await insertTab.click();
    await page.waitForTimeout(200);

    const chartBtn = page.locator('[data-command-id="slides.insert.chart"]');
    await chartBtn.click();
    await page.waitForTimeout(300);

    const chartDialog = page.locator(".vno-chart-dialog .vno-dialog-box");
    await chartDialog.waitFor({ timeout: 5000 });

    await page.screenshot({ path: path.join(screenshotsDir, `slides-chart-dialog-${theme}.png`) });

    const chartStyles = await page.evaluate(() => {
      const box = document.querySelector(".vno-chart-dialog .vno-dialog-box");
      const firstType = document.querySelector(".vno-chart-type:not(.is-selected)");
      const selectedType = document.querySelector(".vno-chart-type.is-selected");
      const th = document.querySelector(".vno-chart-data-table th");
      const inputs = Array.from(document.querySelectorAll(".vno-chart-dialog input")).map(el => {
        const s = window.getComputedStyle(el);
        return { name: el.getAttribute("aria-label") || el.dataset.chartTitleInput !== undefined ? "title" : "input", bg: s.backgroundColor, color: s.color };
      });
      const types = Array.from(document.querySelectorAll(".vno-chart-type")).map(b => ({
        text: b.textContent.trim(),
        tabIndex: b.getAttribute("tabindex"),
        ariaChecked: b.getAttribute("aria-checked"),
        role: b.getAttribute("role")
      }));
      const preview = document.querySelector(".vno-chart-preview");
      const removeBtn = document.querySelector(".vno-chart-data-table [data-chart-remove-row]");

      return {
        boxBg: box ? window.getComputedStyle(box).backgroundColor : null,
        boxColor: box ? window.getComputedStyle(box).color : null,
        firstTypeBg: firstType ? window.getComputedStyle(firstType).backgroundColor : null,
        firstTypeColor: firstType ? window.getComputedStyle(firstType).color : null,
        selectedTypeBg: selectedType ? window.getComputedStyle(selectedType).backgroundColor : null,
        selectedTypeColor: selectedType ? window.getComputedStyle(selectedType).color : null,
        selectedTypeBorder: selectedType ? window.getComputedStyle(selectedType).borderColor : null,
        thColor: th ? window.getComputedStyle(th).color : null,
        inputsSample: inputs.slice(0, 3),
        radiogroup: types,
        previewBg: preview ? window.getComputedStyle(preview).backgroundColor : null,
        removeBtnColor: removeBtn ? window.getComputedStyle(removeBtn).color : null
      };
    });

    logResult("Slides.Chart", "Chart dialog computed styles", chartStyles);

    // Test Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const dialogStillOpen = await page.locator(".vno-chart-dialog").count() > 0;
    logResult("Slides.Chart", "Escape closes dialog", { closed: !dialogStillOpen });

    // 1C. Slides Hide Slide
    console.log("Auditing Slides Hide Slide...");
    // Go to Trình chiếu tab
    const showTab = page.locator("#vno-ribbon-tab-slideshow");
    await showTab.click();
    await page.waitForTimeout(200);

    const hideSlideBtn = page.locator('[data-command-id="slides.slide.toggleHidden"]');
    const hideBtnPressedBefore = await hideSlideBtn.getAttribute("aria-pressed");
    
    // Click toggle hide slide
    await hideSlideBtn.click();
    await page.waitForTimeout(300);
    const hideBtnPressedAfter = await hideSlideBtn.getAttribute("aria-pressed");

    // Check filmstrip badge & number
    const filmstripDetails = await page.evaluate(() => {
      const activeThumb = document.querySelector(".vno-slide-thumb-item.is-active");
      const num = activeThumb?.querySelector(".vno-slide-thumb-num");
      const badge = activeThumb?.querySelector(".vno-slide-hidden-mark");
      return {
        hasIsHidden: activeThumb?.classList.contains("is-hidden"),
        numColor: num ? window.getComputedStyle(num).color : null,
        numDecoration: num ? window.getComputedStyle(num).textDecoration : null,
        badgeColor: badge ? window.getComputedStyle(badge).color : null,
        badgeText: badge?.textContent
      };
    });

    // Open Slide Sorter
    const viewTab = page.locator("#vno-ribbon-tab-view");
    if (await viewTab.count() > 0) {
      await viewTab.click();
      await page.waitForTimeout(200);
      const sorterBtn = page.locator('[data-command-id="slides.view.slideSorter"]');
      if (await sorterBtn.count() > 0) {
        await sorterBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(screenshotsDir, `slides-sorter-${theme}.png`) });

        const sorterDetails = await page.evaluate(() => {
          const item = document.querySelector(".vno-slide-sorter-item.is-hidden");
          const num = item?.querySelector(".vno-slide-sorter-number");
          const badge = item?.querySelector(".vno-slide-sorter-hidden-mark");
          return {
            hasHiddenItem: !!item,
            numColor: num ? window.getComputedStyle(num).color : null,
            badgeColor: badge ? window.getComputedStyle(badge).color : null
          };
        });
        logResult("Slides.HideSlide", "Slide Sorter styles", sorterDetails);
      }
    }

    logResult("Slides.HideSlide", "Toggle button and filmstrip", {
      hideBtnPressedBefore,
      hideBtnPressedAfter,
      filmstripDetails
    });

    // ==========================================
    // 2. WRITER APP AUDIT (Citations & Bibliography)
    // ==========================================
    console.log(`\n--- Auditing Writer Citations in ${theme} mode ---`);
    await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });
    await page.locator('.vno-shell[data-app="writer"]').waitFor();
    await page.waitForTimeout(500);

    // Switch to Tham chiếu tab
    const refTab = page.locator("#vno-ribbon-tab-references");
    await refTab.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(screenshotsDir, `writer-references-ribbon-${theme}.png`) });

    // Open Insert Citation dialog via button
    await page.locator('[data-command-id="writer.reference.citationInsert"]').click();
    await page.waitForTimeout(300);

    const insertCitationOverlay = page.locator(".vno-citation-dialog-overlay");
    if (await insertCitationOverlay.count() > 0) {
      await page.screenshot({ path: path.join(screenshotsDir, `writer-citation-insert-dialog-${theme}.png`) });
      const insertStyles = await page.evaluate(() => {
        const box = document.querySelector(".vno-citation-dialog");
        const select = box?.querySelector("select");
        const emptyP = box?.querySelector(".vno-empty-sources");
        return {
          boxBg: box ? window.getComputedStyle(box).backgroundColor : null,
          boxColor: box ? window.getComputedStyle(box).color : null,
          selectBg: select ? window.getComputedStyle(select).backgroundColor : null,
          selectColor: select ? window.getComputedStyle(select).color : null,
          emptyPColor: emptyP ? window.getComputedStyle(emptyP).color : null
        };
      });
      logResult("Writer.Citations", "Insert Citation dialog styles", insertStyles);

      // Check Escape key
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const stillOpen = await page.locator(".vno-citation-dialog-overlay").count() > 0;
      logResult("Writer.Citations", "Escape closes Insert Citation dialog", { closed: !stillOpen });

      // If Escape failed to close, click cancel button
      if (stillOpen) {
        await page.locator(".vno-citation-dialog .vno-cancel").click();
        await page.waitForTimeout(200);
      }
    }

    // Open Manage Sources dialog
    await page.locator('[data-command-id="writer.reference.sourcesManage"]').click();
    await page.waitForTimeout(300);

    const manageOverlay = page.locator(".vno-citation-dialog-overlay");
    if (await manageOverlay.count() > 0) {
      // Add a dummy source via Manage Sources
      const addBtn = page.locator(".vno-citation-dialog .vno-add-source");
      await addBtn.click();
      await page.waitForTimeout(300);

      // Now Source Editor dialog should be open
      await page.screenshot({ path: path.join(screenshotsDir, `writer-source-editor-dialog-${theme}.png`) });

      const editorStyles = await page.evaluate(() => {
        const overlays = document.querySelectorAll(".vno-citation-dialog-overlay");
        const topOverlay = overlays[overlays.length - 1];
        const box = topOverlay?.querySelector(".vno-citation-dialog");
        const inputs = Array.from(box?.querySelectorAll("input, select") || []).map(el => {
          const s = window.getComputedStyle(el);
          return { tag: el.tagName, name: el.getAttribute("name"), bg: s.backgroundColor, color: s.color };
        });
        return {
          boxBg: box ? window.getComputedStyle(box).backgroundColor : null,
          boxColor: box ? window.getComputedStyle(box).color : null,
          inputsSample: inputs.slice(0, 3)
        };
      });
      logResult("Writer.Citations", "Source Editor dialog styles", editorStyles);

      // Fill author and title, then save
      await page.locator('.vno-citation-dialog input[name="author"]').fill("Nguyen Van Test");
      await page.locator('.vno-citation-dialog input[name="title"]').fill("Kiem thu UI Dark Mode");
      await page.locator('.vno-citation-dialog input[name="year"]').fill("2026");
      await page.locator(".vno-citation-dialog .vno-save-source").click();
      await page.waitForTimeout(300);

      // Now back to Manage Sources dialog with 1 source
      await page.screenshot({ path: path.join(screenshotsDir, `writer-source-manager-with-data-${theme}.png`) });

      const rowStyles = await page.evaluate(() => {
        const row = document.querySelector(".vno-source-row");
        const editBtn = row?.querySelector(".vno-edit-source");
        const deleteBtn = row?.querySelector(".vno-delete-source");
        const small = row?.querySelector("small");
        return {
          rowBorder: row ? window.getComputedStyle(row).borderBottomColor : null,
          smallColor: small ? window.getComputedStyle(small).color : null,
          editBtnClass: editBtn?.className,
          editBtnBg: editBtn ? window.getComputedStyle(editBtn).backgroundColor : null,
          editBtnColor: editBtn ? window.getComputedStyle(editBtn).color : null,
          deleteBtnClass: deleteBtn?.className,
          deleteBtnBg: deleteBtn ? window.getComputedStyle(deleteBtn).backgroundColor : null,
          deleteBtnColor: deleteBtn ? window.getComputedStyle(deleteBtn).color : null
        };
      });
      logResult("Writer.Citations", "Source Manager row button styles", rowStyles);

      // Apply sources
      await page.locator(".vno-citation-dialog .vno-apply-sources").click();
      await page.waitForTimeout(300);
    }

    // Insert citation field and bibliography into document to check styling
    await page.locator('[data-command-id="writer.reference.citationInsert"]').click();
    await page.waitForTimeout(200);
    await page.locator(".vno-citation-dialog .vno-insert-citation").click();
    await page.waitForTimeout(300);

    // Insert bibliography
    await page.locator('[data-command-id="writer.reference.bibliographyInsert"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(screenshotsDir, `writer-doc-citations-${theme}.png`) });

    const docStyles = await page.evaluate(() => {
      const field = document.querySelector(".vno-citation-field");
      const bib = document.querySelector(".vno-bibliography");
      return {
        fieldBg: field ? window.getComputedStyle(field).backgroundColor : null,
        fieldColor: field ? window.getComputedStyle(field).color : null,
        bibBg: bib ? window.getComputedStyle(bib).backgroundColor : null,
        bibColor: bib ? window.getComputedStyle(bib).color : null,
        bibBorder: bib ? window.getComputedStyle(bib).borderLeftColor : null
      };
    });
    logResult("Writer.Citations", "Document Citation Field & Bibliography styles", docStyles);

    await context.close();
  }
} finally {
  if (browser) await browser.close();
  server.close();
}

fs.writeFileSync(path.join(screenshotsDir, "_audit-summary.json"), JSON.stringify(auditLog, null, 2));
console.log("\nAudit finished! Summary written to docs/screenshots/audit-round2/_audit-summary.json");
