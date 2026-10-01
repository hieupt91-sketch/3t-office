import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "../tests/live/cdp/session.mjs";

async function dumpFile(filePath) {
  console.log(`Dumping ${path.basename(filePath)}...`);
  const session = await launchApp("sheet", { filePath });
  try {
    const cdp = session.cdp;
    await cdp.waitFor(
      "(() => { const a = window.__vnoAppInstance?.adapter; return !!(a?.grid?.sheets?.length && a?.grid?.cellsData); })()",
      { timeoutMilliseconds: 90000, intervalMilliseconds: 500 }
    );
    // Give it a moment to ensure all sheets and data are loaded
    await new Promise(r => setTimeout(r, 2000));
    
    const dump = await cdp.evaluate(`
      (() => {
        const grid = window.__vnoAppInstance.adapter.grid;
        const result = {};
        for (const sheetName of grid.sheets) {
          const map = grid.sheetsData[sheetName];
          const rowsData = {};
          if (map) {
            for (const [coord, item] of map.entries()) {
              const m = coord.match(/^([A-Z]+)(\\d+)$/);
              if (m) {
                const r = parseInt(m[2], 10);
                if (r <= 50) {
                  const val = item ? (item.val !== undefined && item.val !== null ? String(item.val) : "") : "";
                  if (val !== "") {
                    if (!rowsData[r]) rowsData[r] = {};
                    rowsData[r][m[1]] = val;
                  }
                }
              }
            }
          }
          result[sheetName] = rowsData;
        }
        return result;
      })()
    `);
    return dump;
  } finally {
    await session.close();
  }
}

async function main() {
  const lan02 = path.join(repoRoot, "scratch", "lan02.xlsx");
  const lan11 = path.join(repoRoot, "scratch", "lan11.xlsx");

  const dump02 = await dumpFile(lan02);
  await fs.writeFile(path.join(repoRoot, "scratch", "baseline_lan02.json"), JSON.stringify(dump02, null, 2));
  console.log("Saved baseline_lan02.json");

  const dump11 = await dumpFile(lan11);
  await fs.writeFile(path.join(repoRoot, "scratch", "baseline_lan11.json"), JSON.stringify(dump11, null, 2));
  console.log("Saved baseline_lan11.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
