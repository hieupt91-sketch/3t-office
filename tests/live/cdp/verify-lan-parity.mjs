import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { launchApp, repoRoot } from "./session.mjs";
import { press } from "./actions.mjs";
import { sleep } from "./client.mjs";
import { platformOutputPath } from "./output-path.mjs";

const LAN_FILES = ["lan02.xlsx", "lan11.xlsx", "lan09.xlsx"];
const LAN_SOURCE_DIRS = [
  "E:\\VN OFice\\file test\\lan",
  path.join(repoRoot, "..", "VN OFice", "file test", "lan"),
];

const AUDIT_SCREENSHOT_DIR = platformOutputPath("E:\\VNOffice-dist\\audit-grid", { directory: true });
const REF_WORKTREE_DIR = "E:\\VNOffice-grid-ref";
const PARITY_REF_DIR = path.join(os.tmpdir(), "vno-grid-parity-ref");
const TEMP_LAN_DIR = path.join(os.tmpdir(), "vno-lan-live");

function colNumberToLabel(n) {
  let s = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

async function findSourceFile(fileName) {
  for (const dir of LAN_SOURCE_DIRS) {
    const candidate = path.join(dir, fileName);
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) return candidate;
    } catch {}
  }
  return null;
}

async function extractWorkbookDataAndScreenshots(session, fileKey, isMain = false) {
  const cdp = session.cdp;

  // 1. Wait for document open to complete
  console.log(`[${fileKey}] (${isMain ? "MAIN" : "BRANCH"}) Waiting for document_open_complete...`);
  const t0 = Date.now();
  let loaded = false;
  while (Date.now() - t0 < 120000) {
    const state = await cdp.evaluate(`(() => {
      const a = window.__vnoAppInstance?.adapter;
      const mark = window.__vnoStartupEvents?.some(e => e.name === "document_open_complete");
      const p = a?._sourcePath || a?.sourceFilePath || "";
      const sheets = a?.grid?.sheets || [];
      return { mark, path: String(p), sheetsCount: sheets.length };
    })()`).catch(() => null);

    if (state?.mark || (state?.path && state?.sheetsCount > 0)) {
      loaded = true;
      console.log(`[${fileKey}] (${isMain ? "MAIN" : "BRANCH"}) Loaded in ${Date.now() - t0}ms, sheets count: ${state.sheetsCount}`);
      break;
    }
    await sleep(500);
  }

  if (!loaded) {
    throw new Error(`Timeout waiting for ${fileKey} to load in ${isMain ? "MAIN" : "BRANCH"}`);
  }

  // Settle time for layout and initial render
  await sleep(fileKey === "lan09" ? 5000 : 1500);

  // 2. Screenshots: Top and Ctrl+End
  await cdp.send("Page.enable", {}, 30000);

  // Focus grid and select A1
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance?.adapter?.grid;
    if (grid && grid.container) {
      grid.container.focus();
      grid.selectCell("A", 1);
    }
  })()`);
  await sleep(500);

  // Top screenshot
  const prefix = isMain ? `${fileKey}_main` : `${fileKey}_branch`;
  const topShot = await cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
  const topBase64 = topShot.result?.data || topShot.data;
  if (!topBase64) throw new Error(`Failed to capture top screenshot: ${JSON.stringify(topShot)}`);
  await fs.writeFile(path.join(AUDIT_SCREENSHOT_DIR, `${prefix}_top.png`), Buffer.from(topBase64, "base64"));
  if (!isMain) {
    // Also save standard name requested by spec
    await fs.writeFile(path.join(AUDIT_SCREENSHOT_DIR, `${fileKey}_top.png`), Buffer.from(topBase64, "base64"));
  }

  // Ctrl+End jump
  await sleep(1000);
  await press(cdp, "End", { ctrl: true }, 1000, 60000);
  await sleep(1000);

  const ctrlEndInfo = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.adapter.grid;
    const coord = grid ? grid.selectedCoord : { c: "?", r: 0 };
    const cells = Array.from(document.querySelectorAll(".vno-grid-cell"));
    const nonEmptyCells = cells.filter(el => el.textContent.trim().length > 0).length;
    return {
      selectedCoord: coord,
      renderedCells: cells.length,
      visibleContentCells: nonEmptyCells
    };
  })()`);

  // Ctrl+End screenshot
  const endShot = await cdp.send("Page.captureScreenshot", { format: "png" }, 60000);
  const endBase64 = endShot.result?.data || endShot.data;
  if (!endBase64) throw new Error(`Failed to capture end screenshot: ${JSON.stringify(endShot)}`);
  await fs.writeFile(path.join(AUDIT_SCREENSHOT_DIR, `${prefix}_ctrl_end.png`), Buffer.from(endBase64, "base64"));
  if (!isMain) {
    await fs.writeFile(path.join(AUDIT_SCREENSHOT_DIR, `${fileKey}_ctrl_end.png`), Buffer.from(endBase64, "base64"));
  }

  // Return to A1
  await press(cdp, "Home", { ctrl: true }, 500, 60000);
  await sleep(500);

  // 3. Extract model data for all sheets: first 50 rows x 30 cols (value & displayed text) + whole sheet non-empty count
  const dump = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.adapter.grid;
    const sheetNames = grid.sheets || [];
    const sheetsResult = {};
    const dummyTd = document.createElement("td");

    function colLabel(num) {
      let s = "";
      let n = num;
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    }

    for (const sName of sheetNames) {
      const cells = grid.sheetsData?.[sName] || (sName === grid.activeSheet ? grid.cellsData : null) || new Map();
      
      // Total non-empty cells in the whole sheet
      let nonEmptyCount = 0;
      for (const [coord, itm] of cells.entries()) {
        const hasVal = itm && (
          (itm.val !== undefined && itm.val !== null && itm.val !== "") ||
          Boolean(itm.formula) ||
          (Array.isArray(itm.richText) && itm.richText.length > 0)
        );
        if (hasVal) nonEmptyCount++;
      }

      // First 50 rows x first 30 cols
      const sample = {};
      for (let r = 1; r <= 50; r++) {
        const rowData = {};
        for (let c = 1; c <= 30; c++) {
          const colStr = colLabel(c);
          const coord = colStr + r;
          const itm = cells.get(coord);
          if (itm) {
            grid._renderCellVisual(dummyTd, itm, colStr, r);
            const displayedText = dummyTd.textContent || "";
            const val = itm.val !== undefined && itm.val !== null ? itm.val : "";
            rowData[colStr] = {
              val,
              displayedText,
              formula: itm.formula || ""
            };
          } else {
            rowData[colStr] = {
              val: "",
              displayedText: "",
              formula: ""
            };
          }
        }
        sample[r] = rowData;
      }

      sheetsResult[sName] = {
        nonEmptyCount,
        sample
      };
    }

    return {
      sheets: sheetNames,
      sheetsResult
    };
  })()`);

  return {
    ...dump,
    ctrlEndInfo
  };
}

export async function runParityCheck() {
  console.log("================================================================================");
  console.log("STARTING LIVE PARITY CHECK: MAIN VS FIX/SHEET-GRID-EXTENT-AGY");
  console.log("================================================================================");

  await fs.mkdir(AUDIT_SCREENSHOT_DIR, { recursive: true });
  await fs.mkdir(PARITY_REF_DIR, { recursive: true });
  await fs.mkdir(TEMP_LAN_DIR, { recursive: true });

  // 1. Locate and copy LAN files to OS temp
  const tempFiles = {};
  for (const fileName of LAN_FILES) {
    const src = await findSourceFile(fileName);
    if (!src) {
      throw new Error(`Cannot find LAN file: ${fileName} in known directories: ${LAN_SOURCE_DIRS.join(", ")}`);
    }
    const dst = path.join(TEMP_LAN_DIR, fileName);
    await fs.copyFile(src, dst);
    const st = await fs.stat(dst);
    console.log(`Copied ${fileName} -> ${dst} (${st.size} bytes)`);
    tempFiles[fileName] = dst;
  }

  // 2. Ensure detached worktree for MAIN
  let createdWorktree = false;
  try {
    const st = await fs.stat(REF_WORKTREE_DIR);
    if (!st.isDirectory()) throw new Error("Not a directory");
    console.log(`Using existing worktree at ${REF_WORKTREE_DIR}`);
  } catch {
    console.log(`Creating detached git worktree at ${REF_WORKTREE_DIR} pointing to main...`);
    execSync(`git worktree add --detach "${REF_WORKTREE_DIR}" main`, { cwd: repoRoot, stdio: "inherit" });
    createdWorktree = true;
  }

  // 3. Extract dumps & screenshots on MAIN
  console.log("\n--------------------------------------------------------------------------------");
  console.log("STEP 1: EXTRACTING REFERENCE DATA FROM MAIN");
  console.log("--------------------------------------------------------------------------------");
  const mainDumps = {};
  for (const fileName of LAN_FILES) {
    const fileBase = path.basename(fileName, path.extname(fileName));
    console.log(`\n>>> Launching MAIN on ${fileName}...`);
    const session = await launchApp("sheet", { root: REF_WORKTREE_DIR, filePath: tempFiles[fileName] });
    try {
      mainDumps[fileName] = await extractWorkbookDataAndScreenshots(session, fileBase, true);
    } finally {
      await session.close().catch(() => {});
    }
  }

  // Save MAIN dumps in temp reference directory
  await fs.writeFile(path.join(PARITY_REF_DIR, "main_dumps.json"), JSON.stringify(mainDumps, null, 2), "utf8");
  for (const fileName of LAN_FILES) {
    const fileBase = path.basename(fileName, path.extname(fileName));
    await fs.writeFile(path.join(PARITY_REF_DIR, `ref_${fileBase}.json`), JSON.stringify(mainDumps[fileName], null, 2), "utf8");
  }

  // 4. Remove temporary worktree of main if we created it or as requested by spec
  console.log(`\nRemoving detached worktree ${REF_WORKTREE_DIR}...`);
  try {
    execSync(`git worktree remove --force "${REF_WORKTREE_DIR}"`, { cwd: repoRoot, stdio: "inherit" });
    console.log(`Successfully removed ${REF_WORKTREE_DIR}`);
  } catch (err) {
    console.warn(`Could not remove worktree automatically: ${err.message}`);
  }

  // 5. Extract dumps & screenshots on THIS BRANCH
  console.log("\n--------------------------------------------------------------------------------");
  console.log("STEP 2: EXTRACTING BRANCH DATA FROM FIX/SHEET-GRID-EXTENT-AGY");
  console.log("--------------------------------------------------------------------------------");
  const branchDumps = {};
  for (const fileName of LAN_FILES) {
    const fileBase = path.basename(fileName, path.extname(fileName));
    console.log(`\n>>> Launching THIS BRANCH on ${fileName}...`);
    const session = await launchApp("sheet", { root: repoRoot, filePath: tempFiles[fileName] });
    try {
      branchDumps[fileName] = await extractWorkbookDataAndScreenshots(session, fileBase, false);
    } finally {
      await session.close().catch(() => {});
    }
  }

  // Save BRANCH dumps in temp directory
  await fs.writeFile(path.join(PARITY_REF_DIR, "branch_dumps.json"), JSON.stringify(branchDumps, null, 2), "utf8");
  for (const fileName of LAN_FILES) {
    const fileBase = path.basename(fileName, path.extname(fileName));
    await fs.writeFile(path.join(PARITY_REF_DIR, `branch_${fileBase}.json`), JSON.stringify(branchDumps[fileName], null, 2), "utf8");
  }

  // 6. Compare MAIN vs BRANCH cell by cell
  console.log("\n--------------------------------------------------------------------------------");
  console.log("STEP 3: COMPARING MAIN VS BRANCH CELL-BY-CELL");
  console.log("--------------------------------------------------------------------------------");

  const parityResults = {};
  let grandTotalCompared = 0;
  let grandTotalDifferences = 0;

  for (const fileName of LAN_FILES) {
    const mainBook = mainDumps[fileName];
    const branchBook = branchDumps[fileName];

    const fileSummary = {
      sheetsCompared: mainBook.sheets.length,
      sheets: {},
      totalCellsCompared: 0,
      totalDifferingCells: 0,
      nonEmptyParity: true,
      ctrlEnd: {
        main: mainBook.ctrlEndInfo,
        branch: branchBook.ctrlEndInfo
      }
    };

    console.log(`\n--- Comparing ${fileName} ---`);
    console.log(`Sheets in MAIN: [${mainBook.sheets.join(", ")}]`);
    console.log(`Sheets in BRANCH: [${branchBook.sheets.join(", ")}]`);

    // Verify same sheet names
    const sameSheets = JSON.stringify(mainBook.sheets) === JSON.stringify(branchBook.sheets);
    if (!sameSheets) {
      console.error(`Sheet list mismatch for ${fileName}!`);
    }

    for (const sheetName of mainBook.sheets) {
      const mainSheet = mainBook.sheetsResult[sheetName];
      const branchSheet = branchBook.sheetsResult[sheetName];

      const diffs = [];
      let sheetCellsCompared = 0;

      for (let r = 1; r <= 50; r++) {
        for (let c = 1; c <= 30; c++) {
          sheetCellsCompared++;
          const colStr = colNumberToLabel(c);
          const coord = colStr + r;

          const mCell = mainSheet.sample[r]?.[colStr] || { val: "", displayedText: "", formula: "" };
          const bCell = branchSheet.sample[r]?.[colStr] || { val: "", displayedText: "", formula: "" };

          const valMatch = String(mCell.val) === String(bCell.val);
          const textMatch = mCell.displayedText === bCell.displayedText;

          if (!valMatch || !textMatch) {
            diffs.push({
              coord,
              main: { val: mCell.val, text: mCell.displayedText },
              branch: { val: bCell.val, text: bCell.displayedText }
            });
          }
        }
      }

      const nonEmptyMatch = mainSheet.nonEmptyCount === branchSheet.nonEmptyCount;
      if (!nonEmptyMatch) {
        fileSummary.nonEmptyParity = false;
      }

      fileSummary.sheets[sheetName] = {
        cellsCompared: sheetCellsCompared,
        differingCells: diffs.length,
        nonEmptyMain: mainSheet.nonEmptyCount,
        nonEmptyBranch: branchSheet.nonEmptyCount,
        diffs
      };

      fileSummary.totalCellsCompared += sheetCellsCompared;
      fileSummary.totalDifferingCells += diffs.length;

      console.log(`  Sheet "${sheetName}": ${sheetCellsCompared} cells compared, ${diffs.length} differing cells, non-empty: main=${mainSheet.nonEmptyCount}, branch=${branchSheet.nonEmptyCount}`);
      if (diffs.length > 0) {
        console.log(`    Sample differences:`, JSON.stringify(diffs.slice(0, 3)));
      }
    }

    console.log(`Total for ${fileName}: ${fileSummary.totalCellsCompared} cells compared, ${fileSummary.totalDifferingCells} differences`);
    console.log(`Ctrl+End info: MAIN=${JSON.stringify(mainBook.ctrlEndInfo.selectedCoord)}, BRANCH=${JSON.stringify(branchBook.ctrlEndInfo.selectedCoord)}`);

    grandTotalCompared += fileSummary.totalCellsCompared;
    grandTotalDifferences += fileSummary.totalDifferingCells;

    parityResults[fileName] = fileSummary;
  }

  const finalSummary = {
    timestamp: new Date().toISOString(),
    grandTotalCompared,
    grandTotalDifferences,
    files: parityResults
  };

  await fs.writeFile(path.join(PARITY_REF_DIR, "parity_summary.json"), JSON.stringify(finalSummary, null, 2), "utf8");

  console.log("\n================================================================================");
  console.log(`PARITY CHECK COMPLETE: ${grandTotalCompared} cells compared, ${grandTotalDifferences} differences`);
  console.log(`Screenshots saved to: ${AUDIT_SCREENSHOT_DIR}`);
  console.log(`Reference dumps saved to: ${PARITY_REF_DIR}`);
  console.log("================================================================================\n");

  return finalSummary;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  runParityCheck().catch(err => {
    console.error("FATAL PARITY CHECK ERROR:", err);
    process.exit(1);
  });
}
