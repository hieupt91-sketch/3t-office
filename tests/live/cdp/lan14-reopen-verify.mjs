import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node --experimental-websocket tests/live/cdp/lan14-reopen-verify.mjs <saved.xlsx>");
const filePath = path.resolve(inputPath);
const started = Date.now();
const session = await launchApp("sheet", { filePath });
try {
  const expected = filePath.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || "").replace(/\\\\/g, "/").toLowerCase(); return p === ${JSON.stringify(expected)} && !!a?.grid?.sheets?.length; })()`, { timeoutMilliseconds: 900000, intervalMilliseconds: 500 });
  const screenshot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
  await fs.writeFile(filePath + ".reopen-cdp.png", Buffer.from(screenshot.result.data, "base64"));
  const openMs = Date.now() - started;
  const snapshot = await session.cdp.evaluate(`(() => {
    const a = window.__vnoAppInstance.adapter;
    const grid = a.grid;
    const sheets = [...(grid.sheets || [])];
    const values = [];
    const counts = [];
    const colNumber = letters => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    for (const sheetName of sheets) {
      const cells = grid.sheetsData?.[sheetName] || (sheetName === grid.activeSheet ? grid.cellsData : null) || new Map();
      counts.push({ sheet: sheetName, cells: cells.size });
      const entries = [...cells.entries()].map(([coord, cell]) => ({ coord, cell }))
        .sort((left, right) => {
          const l = /^([A-Z]+)(\\d+)$/i.exec(left.coord); const r = /^([A-Z]+)(\\d+)$/i.exec(right.coord);
          if (!l || !r) return String(left.coord).localeCompare(String(right.coord));
          return Number(l[2]) - Number(r[2]) || colNumber(l[1].toUpperCase()) - colNumber(r[1].toUpperCase());
        });
      for (const { coord, cell } of entries) {
        if (values.length >= 5000) break;
        values.push([sheetName, coord, cell?.val ?? null, cell?.formula ?? null]);
      }
      if (values.length >= 5000) break;
    }
    return { sourcePath: a._sourcePath || a.sourceFilePath || null, activeSheet: grid.activeSheet, sheetCount: sheets.length, counts, totalCells: counts.reduce((sum, entry) => sum + entry.cells, 0), first5000: values };
  })()`);
  const hash5000 = createHash("sha256").update(JSON.stringify(snapshot.first5000), "utf8").digest("hex");
  const report = { status: snapshot.totalCells === 1435546 && snapshot.first5000.length === 5000 && openMs <= 93000 ? "PASS" : "FAIL", openMs, expectedOpenMaxMs: 93000, expectedCells: 1435546, actualCells: snapshot.totalCells, hashItems: snapshot.first5000.length, hash5000, sourcePath: snapshot.sourcePath, sheetCount: snapshot.sheetCount, perSheet: snapshot.counts, cdpPort: session.debugPort, profilePath: session.localAppData, screenshotPath: filePath + ".reopen-cdp.png" };
  await fs.writeFile(filePath + ".reopen-cdp.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "PASS") process.exitCode = 1;
} finally {
  await session.close();
}
