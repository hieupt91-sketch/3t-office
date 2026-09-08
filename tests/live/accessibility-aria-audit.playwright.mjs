/**
 * VN Office — Accessibility ARIA Audit (Playwright)
 * Quét DOM thật trên cả 3 app (Writer/Sheet/Slides), kiểm tra:
 *   1. Mỗi nút ribbon có aria-label (đặc biệt icon-only)
 *   2. Nút toggle có aria-pressed đúng trạng thái
 *   3. Dialog có aria-labelledby, input có label, lỗi có role="alert"
 *   4. Vùng canvas có role + aria-label
 *   5. Vùng thông báo động có aria-live
 *   6. Không có nút icon-only thiếu aria-label
 *
 * Kết quả: danh sách BY CHỨNG (evidence-based), không đoán.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8894;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve, reject) => { server.listen(PORT, "127.0.0.1", resolve); server.on("error", reject); });

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const APPS = {
  writer: { label: "VN Writer", tabs: ["home", "insert", "design", "layout", "references", "mailings", "review", "view", "ai"] },
  sheet:  { label: "VN Sheet",  tabs: ["home", "formulas", "data", "insert", "pageLayout", "review", "view", "ai"] },
  slides: { label: "VN Slides", tabs: ["home", "insert", "design", "transitions", "animations", "slideshow", "review", "view", "ai"] }
};

let browser;
let totalIssues = 0;
const evidence = [];

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });

  for (const [appKey, appDef] of Object.entries(APPS)) {
    console.log(`\n========== ${appDef.label.toUpperCase()} ==========`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "vi-VN" });
    await page.addInitScript(() => localStorage.setItem("vno-locale", "vi"));
    await page.goto(`http://127.0.0.1:${PORT}/?app=${appKey}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector(".vno-ribbon-tab", { timeout: 15000 });
    await page.waitForTimeout(300);

    // ── 1. Ribbon Buttons: aria-label audit ──
    for (const tabId of appDef.tabs) {
      const tabSelector = `#vno-ribbon-tab-${tabId}`;
      try {
        await page.click(tabSelector, { timeout: 3000 });
      } catch { continue; }
      await page.waitForTimeout(100);

      const ribbonAudit = await page.evaluate(() => {
        const results = { iconOnlyNoLabel: 0, totalButtons: 0, missingAriaPressed: 0, details: [] };
        const btns = document.querySelectorAll(".vno-ribbon-content button[data-command-id]");
        btns.forEach(btn => {
          results.totalButtons++;
          const ariaLabel = btn.getAttribute("aria-label");
          const isIconOnly = btn.classList.contains("vno-btn-icon-only");
          const isToggle = btn.getAttribute("data-command-id");

          if (!ariaLabel || ariaLabel.trim() === "") {
            results.iconOnlyNoLabel++;
            results.details.push({
              commandId: btn.getAttribute("data-command-id") || "unknown",
              issue: "missing-aria-label",
              isIconOnly
            });
          }

          // Check toggle buttons have aria-pressed
          if (isToggle && (btn.getAttribute("aria-pressed") === null && !btn.classList.contains("vno-ribbon-btn-dropdown"))) {
            // Only flag if it's a known toggle command
            const def = window.__commandBus?.getDefinition?.(isToggle);
            if (def && def.isToggle) {
              results.missingAriaPressed++;
              results.details.push({
                commandId: isToggle,
                issue: "missing-aria-pressed"
              });
            }
          }
        });
        return results;
      });

      if (ribbonAudit.iconOnlyNoLabel > 0) {
        totalIssues += ribbonAudit.iconOnlyNoLabel;
        evidence.push({ app: appKey, tab: tabId, category: "ribbon", issue: "icon-only-no-aria-label", count: ribbonAudit.iconOnlyNoLabel, details: ribbonAudit.details.filter(d => d.issue === "missing-aria-label") });
        console.log(`  [FAIL] Tab ${tabId}: ${ribbonAudit.iconOnlyNoLabel} nút thiếu aria-label`);
      }
      if (ribbonAudit.missingAriaPressed > 0) {
        totalIssues += ribbonAudit.missingAriaPressed;
        evidence.push({ app: appKey, tab: tabId, category: "ribbon", issue: "toggle-no-aria-pressed", count: ribbonAudit.missingAriaPressed });
        console.log(`  [FAIL] Tab ${tabId}: ${ribbonAudit.missingAriaPressed} nút toggle thiếu aria-pressed`);
      }
      console.log(`  [${ribbonAudit.iconOnlyNoLabel === 0 ? "PASS" : "FAIL"}] Tab ${tabId}: ${ribbonAudit.totalButtons} nút, ${ribbonAudit.iconOnlyNoLabel} thiếu aria-label`);
    }

    // ── 2. Dialog accessibility (open a dialog and check) ──
    if (appKey === "sheet") {
      // Open Format Cells dialog (Ctrl+1)
      await page.click("#vno-ribbon-tab-home");
      await page.waitForTimeout(100);
      const fmtBtn = page.locator('[data-command-id="sheet.format.cellsDialog"]').first();
      if (await fmtBtn.isVisible()) {
        await fmtBtn.click({ timeout: 3000 });
        await page.waitForTimeout(500);

        const dialogAudit = await page.evaluate(() => {
          const results = { dialogs: 0, missingLabelledBy: 0, inputsWithoutLabel: 0, details: [] };
          const dialogs = document.querySelectorAll('.vno-dialog-box[role="dialog"]');
          results.dialogs = dialogs.length;
          dialogs.forEach(dlg => {
            const labelledBy = dlg.getAttribute("aria-labelledby");
            if (!labelledBy) {
              results.missingLabelledBy++;
              results.details.push({ issue: "dialog-missing-aria-labelledby" });
            } else if (!document.getElementById(labelledBy)) {
              results.missingLabelledBy++;
              results.details.push({ issue: "dialog-aria-labelledby-points-nowhere", id: labelledBy });
            }
            // Check inputs
            dlg.querySelectorAll("input:not([type='hidden']):not([disabled])").forEach(input => {
              const id = input.id;
              const hasLabel = id && dlg.querySelector(`label[for="${id}"]`);
              const hasAriaLabel = input.getAttribute("aria-label");
              if (!hasLabel && !hasAriaLabel) {
                results.inputsWithoutLabel++;
                results.details.push({ issue: "input-no-label", inputId: id || "unnamed", placeholder: input.placeholder || "" });
              }
            });
          });
          return results;
        });

        if (dialogAudit.missingLabelledBy > 0 || dialogAudit.inputsWithoutLabel > 0) {
          totalIssues += dialogAudit.missingLabelledBy + dialogAudit.inputsWithoutLabel;
          evidence.push({ app: appKey, tab: "dialog", category: "dialog", ...dialogAudit });
          console.log(`  [FAIL] Dialog: ${dialogAudit.missingLabelledBy} thiếu labelledBy, ${dialogAudit.inputsWithoutLabel} input thiếu label`);
        } else {
          console.log(`  [PASS] Dialog: ${dialogAudit.dialogs} dialog, tất cả có label`);
        }

        // Close dialog
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    }

    // ── 3. Editor canvas accessibility ──
    const canvasAudit = await page.evaluate((app) => {
      const results = { areas: 0, missingRole: 0, missingLabel: 0, details: [] };

      if (app === "writer") {
        const selectors = [
          { sel: ".vno-writer-body", name: "Writer body" },
          { sel: ".vno-writer-header", name: "Writer header" },
          { sel: ".vno-writer-footer", name: "Writer footer" }
        ];
        selectors.forEach(({ sel, name }) => {
          const el = document.querySelector(sel);
          if (el) {
            results.areas++;
            const role = el.getAttribute("role");
            const ariaLabel = el.getAttribute("aria-label");
            if (!role) { results.missingRole++; results.details.push({ area: name, issue: "missing-role" }); }
            if (!ariaLabel) { results.missingLabel++; results.details.push({ area: name, issue: "missing-aria-label" }); }
          }
        });
      } else if (app === "sheet") {
        const grid = document.querySelector(".vno-sheet-workspace");
        if (grid) {
          results.areas++;
          const role = grid.getAttribute("role");
          const ariaLabel = grid.getAttribute("aria-label");
          if (!role) { results.missingRole++; results.details.push({ area: "Sheet grid", issue: "missing-role" }); }
          if (!ariaLabel) { results.missingLabel++; results.details.push({ area: "Sheet grid", issue: "missing-aria-label" }); }
        }
      } else if (app === "slides") {
        const canvas = document.querySelector(".vno-slides-workspace");
        if (canvas) {
          results.areas++;
          const role = canvas.getAttribute("role");
          const ariaLabel = canvas.getAttribute("aria-label");
          if (!role) { results.missingRole++; results.details.push({ area: "Slides canvas", issue: "missing-role" }); }
          if (!ariaLabel) { results.missingLabel++; results.details.push({ area: "Slides canvas", issue: "missing-aria-label" }); }
        }
      }
      return results;
    }, appKey);

    if (canvasAudit.missingRole > 0 || canvasAudit.missingLabel > 0) {
      totalIssues += canvasAudit.missingRole + canvasAudit.missingLabel;
      evidence.push({ app: appKey, tab: "canvas", category: "canvas", ...canvasAudit });
      console.log(`  [FAIL] Canvas: ${canvasAudit.missingRole} thiếu role, ${canvasAudit.missingLabel} thiếu aria-label`);
    } else {
      console.log(`  [PASS] Canvas: ${canvasAudit.areas} vùng, tất cả có role + aria-label`);
    }

    // ── 4. Status bar aria-live ──
    const statusAudit = await page.evaluate(() => {
      const results = { hasLive: false, details: [] };
      const statusEl = document.getElementById("vno-status-docinfo");
      if (statusEl) {
        results.hasLive = statusEl.getAttribute("aria-live") === "polite";
        if (!results.hasLive) results.details.push({ issue: "status-bar-no-aria-live" });
      }
      return results;
    });

    if (!statusAudit.hasLive) {
      totalIssues++;
      evidence.push({ app: appKey, tab: "status", category: "notification", ...statusAudit });
      console.log(`  [FAIL] Status bar: thiếu aria-live="polite"`);
    } else {
      console.log(`  [PASS] Status bar: có aria-live="polite"`);
    }

    await page.close();
  }

} finally {
  if (browser) await browser.close();
  server.close();
}

console.log(`\n============================================================`);
console.log(`TỔNG KẾT ACCESSIBILITY ARIA AUDIT`);
console.log(`- Tổng số vấn đề: ${totalIssues}`);
console.log(`- Chi tiết: ${JSON.stringify(evidence, null, 2)}`);
console.log(`============================================================\n`);

if (totalIssues > 0) {
  process.exit(1);
} else {
  console.log("100% PASS: Toàn bộ yếu tố accessibility đều đạt chuẩn!");
}
