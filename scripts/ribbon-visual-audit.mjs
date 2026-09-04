/**
 * VN Office — Ribbon visual consistency audit
 * Playwright + installed Edge only. No OS SendKeys.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "ribbon-audit-screenshots");
const port = Number(process.env.VNO_RIBBON_AUDIT_PORT || 8795);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

fs.mkdirSync(outDir, { recursive: true });

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const APPS = [
  {
    id: "writer",
    switch: "writer",
    shell: '.vno-shell[data-app="writer"]',
    requestedTabs: ["Trang đầu", "Chèn", "Thiết kế", "Bố trí trang", "Bố cục", "Tham chiếu", "Thư tín", "Trộn thư", "Xem xét", "Đánh giá", "Chế độ xem"]
  },
  {
    id: "sheet",
    switch: "sheet",
    shell: '.vno-shell[data-app="sheet"]',
    requestedTabs: ["Trang đầu", "Công thức", "Dữ liệu", "Chèn", "Bố trí trang", "Xem xét", "Chế độ xem"]
  },
  {
    id: "slides",
    switch: "slides",
    shell: '.vno-shell[data-app="slides"]',
    requestedTabs: ["Trang đầu", "Chèn", "Thiết kế", "Chuyển tiếp", "Hoạt hình", "Trình chiếu", "Xem xét", "Đánh giá", "Chế độ xem"]
  }
];

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let browser;
const report = { viewport: { width: 1600, height: 1000 }, apps: [] };

try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("vno-locale", "vi"));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });

  for (const app of APPS) {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator(`[data-switch="${app.switch}"]`).click();
    await page.locator(app.shell).waitFor();
    await page.waitForTimeout(250);

    const tabLabels = await page.locator(".vno-ribbon-tab").allTextContents();
    const appReport = {
      id: app.id,
      actualTabs: tabLabels,
      requestedTabs: app.requestedTabs,
      missingRequested: app.requestedTabs.filter(label => !tabLabels.includes(label)),
      tabs: []
    };

    for (const label of tabLabels) {
      const tabBtn = page.locator(".vno-ribbon-tab").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
      await tabBtn.click();
      await page.waitForTimeout(120);

      const fileName = `${app.id}-${slug(label)}.png`;
      const filePath = path.join(outDir, fileName);
      await page.locator(".vno-ribbon").screenshot({ path: filePath });

      const metrics = await page.evaluate(() => {
        const ribbon = document.querySelector(".vno-ribbon");
        const content = document.querySelector(".vno-ribbon-content");
        const groups = [...document.querySelectorAll(".vno-ribbon-group")].map(group => {
          const labelEl = group.querySelector(".vno-ribbon-group-label");
          const buttons = [...group.querySelectorAll("[data-command-id]")].map(btn => {
            const labelNode = btn.querySelector(".vno-btn-label");
            const iconSvg = btn.querySelector("svg");
            return {
              commandId: btn.getAttribute("data-command-id"),
              aria: btn.getAttribute("aria-label") || "",
              visibleText: (labelNode?.textContent || "").trim(),
              classes: btn.className,
              width: Math.round(btn.getBoundingClientRect().width),
              height: Math.round(btn.getBoundingClientRect().height),
              labelOverflow: labelNode ? labelNode.scrollWidth > labelNode.clientWidth + 1 : false,
              labelHeight: labelNode ? Math.round(labelNode.getBoundingClientRect().height) : 0,
              iconViewBox: iconSvg?.getAttribute("viewBox") || "",
              iconMarkupHash: iconSvg ? iconSvg.outerHTML.length + ":" + (iconSvg.innerHTML || "").slice(0, 80) : ""
            };
          });
          const rect = group.getBoundingClientRect();
          return {
            label: (labelEl?.textContent || "").trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            labelOverflow: labelEl ? labelEl.scrollWidth > labelEl.clientWidth + 1 : false,
            buttonCount: buttons.length,
            buttons
          };
        });

        const commandIds = groups.flatMap(g => g.buttons.map(b => b.commandId));
        const dupInTab = commandIds.filter((id, i) => commandIds.indexOf(id) !== i);
        return {
          ribbonWidth: Math.round(ribbon.getBoundingClientRect().width),
          contentWidth: content ? Math.round(content.getBoundingClientRect().width) : 0,
          contentScrollWidth: content ? content.scrollWidth : 0,
          overflowsX: content ? content.scrollWidth > content.clientWidth + 1 : false,
          groupCount: groups.length,
          groups,
          duplicateCommandsInTab: [...new Set(dupInTab)]
        };
      });

      appReport.tabs.push({
        label,
        screenshot: `docs/ribbon-audit-screenshots/${fileName}`,
        ...metrics
      });
      console.log(`SHOT\t${app.id}\t${label}\t${fileName}\toverflow=${metrics.overflowsX}\tgroups=${metrics.groupCount}\twidth=${metrics.contentScrollWidth}`);
    }

    const allCmds = appReport.tabs.flatMap(tab =>
      tab.groups.flatMap(group => group.buttons.map(btn => ({ tab: tab.label, group: group.label, commandId: btn.commandId, text: btn.visibleText || btn.aria })))
    );
    const byCmd = new Map();
    for (const item of allCmds) {
      if (!byCmd.has(item.commandId)) byCmd.set(item.commandId, []);
      byCmd.get(item.commandId).push(item);
    }
    appReport.commandsShownInMultiplePlaces = [...byCmd.entries()]
      .filter(([, places]) => new Set(places.map(p => p.tab + "/" + p.group)).size > 1)
      .map(([commandId, places]) => ({ commandId, places }));

    report.apps.push(appReport);
  }

  report.pageErrors = pageErrors;
  fs.writeFileSync(path.join(outDir, "_metrics.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("DONE\tmetrics written");
} finally {
  if (browser) await browser.close();
  server.close();
}
