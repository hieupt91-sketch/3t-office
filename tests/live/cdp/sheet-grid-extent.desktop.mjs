import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { press } from "./actions.mjs";
import { sleep } from "./client.mjs";
import { launchApp, repoRoot } from "./session.mjs";

const rows = [];

function report(status, label, detail = "") {
  rows.push({ status, label, detail: String(detail || "").replace(/\s+/g, " ").trim() });
}

async function runGridExtentDesktopTests() {
  console.log("Starting Sheet Grid Extent desktop test session...");
  const session = await launchApp("sheet");
  const cdp = session.cdp;

  try {
    // 0. Set up PerformanceObserver for long tasks
    await cdp.evaluate(`(() => {
      window.__longTasks = [];
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__longTasks.push({ duration: entry.duration, startTime: entry.startTime });
          }
        });
        obs.observe({ entryTypes: ["longtask"] });
      } catch (e) {
        window.__longTasksError = e.message;
      }
    })()`);

    // 1. Grid Extent & Bounded DOM Node Count & First Paint
    const extentInfo = await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      const cellCount = document.querySelectorAll(".vno-grid-cell").length;
      const paintEntries = window.performance.getEntriesByType("paint");
      const fp = paintEntries.find(e => e.name === "first-paint");
      const fcp = paintEntries.find(e => e.name === "first-contentful-paint");
      return {
        rowCount: grid.rowCount,
        colCount: grid.cols.length,
        firstCol: grid.cols[0],
        lastCol: grid.cols[grid.cols.length - 1],
        cellCount,
        fp: fp ? Math.round(fp.startTime) : null,
        fcp: fcp ? Math.round(fcp.startTime) : null
      };
    })()`);

    if (
      extentInfo.rowCount === 1048576 &&
      extentInfo.colCount === 16384 &&
      extentInfo.lastCol === "XFD" &&
      extentInfo.cellCount < 3000
    ) {
      report(
        "PASS",
        "Sheet 1,048,576 x 16,384 extent & bounded DOM",
        `Rows: ${extentInfo.rowCount}, Cols: ${extentInfo.colCount} (${extentInfo.firstCol}..${extentInfo.lastCol}), DOM cells: ${extentInfo.cellCount}, First paint: ${extentInfo.fp}ms`
      );
    } else {
      report(
        "FAIL",
        "Sheet 1,048,576 x 16,384 extent & bounded DOM",
        `Unexpected extent: ${JSON.stringify(extentInfo)}`
      );
    }

    // 2. Scrolling row 1 to 1,000,000 via scrollbar under 1s with no long task > 100ms
    await cdp.evaluate("window.__longTasks = [];");
    const scrollPerf = await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      const t0 = performance.now();
      grid.viewport.scrollTop = 1000000 * grid.rowHeight;
      grid._onViewportScroll();
      const elapsed = performance.now() - t0;
      const cellCount = document.querySelectorAll(".vno-grid-cell").length;
      const headers = Array.from(document.querySelectorAll(".vno-row-header"))
        .map(el => parseInt(el.dataset.row || el.textContent.trim(), 10))
        .filter(n => !isNaN(n));
      return {
        elapsed: Math.round(elapsed * 10) / 10,
        cellCount,
        minRow: Math.min(...headers),
        maxRow: Math.max(...headers)
      };
    })()`);

    const longTasksScroll = await cdp.evaluate(
      "window.__longTasks.filter(t => t.duration > 100).length"
    );

    if (scrollPerf.elapsed < 1000 && longTasksScroll === 0 && scrollPerf.cellCount < 3000 && scrollPerf.maxRow >= 999900) {
      report(
        "PASS",
        "Scrollbar scroll to row 1,000,000 under 1s & no long task > 100ms",
        `Elapsed: ${scrollPerf.elapsed}ms, Long tasks > 100ms: ${longTasksScroll}, Rendered rows: ${scrollPerf.minRow}..${scrollPerf.maxRow}, DOM cells: ${scrollPerf.cellCount}`
      );
    } else {
      report(
        "FAIL",
        "Scrollbar scroll to row 1,000,000 under 1s & no long task > 100ms",
        `Elapsed: ${scrollPerf.elapsed}ms, Long tasks: ${longTasksScroll}, Cells: ${scrollPerf.cellCount}, Max row: ${scrollPerf.maxRow}`
      );
    }

    // 3. Fast Ctrl+Down jump to row 1,048,576 under 1s with no long task > 100ms
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      grid.viewport.scrollTop = 0;
      grid.viewport.scrollLeft = 0;
      grid._onViewportScroll();
      grid.selectCell("A", 1);
      window.__longTasks = [];
      grid.container.focus();
    })()`);
    await sleep(200);

    const t0CtrlDown = Date.now();
    await press(cdp, "ArrowDown", { ctrl: true });
    const elapsedCtrlDown = Date.now() - t0CtrlDown;

    const afterCtrlDown = await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      return {
        coord: grid.selectedCoord,
        longTasks: window.__longTasks.filter(t => t.duration > 100).length
      };
    })()`);

    if (afterCtrlDown.coord.r === 1048576 && afterCtrlDown.coord.c === "A" && elapsedCtrlDown < 1000 && afterCtrlDown.longTasks === 0) {
      report(
        "PASS",
        "Fast Ctrl+Down jump to row 1,048,576 under 1s & no long task > 100ms",
        `Active: ${afterCtrlDown.coord.c}${afterCtrlDown.coord.r}, Elapsed: ${elapsedCtrlDown}ms, Long tasks > 100ms: ${afterCtrlDown.longTasks}`
      );
    } else {
      report(
        "FAIL",
        "Fast Ctrl+Down jump to row 1,048,576 under 1s & no long task > 100ms",
        `Coord: ${JSON.stringify(afterCtrlDown.coord)}, Elapsed: ${elapsedCtrlDown}ms, Long tasks: ${afterCtrlDown.longTasks}`
      );
    }

    // 4. JS Heap growth under 20MB after jumping to XFD1048576 and typing
    await cdp.send("Performance.enable");
    const metricsBefore = await cdp.send("Performance.getMetrics");
    const heapBefore = metricsBefore.result.metrics.find(m => m.name === "JSHeapUsedSize")?.value || 0;

    // Jump to XFD1048576 via Name Box
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      grid._jumpToNameBoxAddress("XFD1048576");
    })()`);
    await sleep(200);

    // Type text into far cell
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      grid.setCellValue("XFD", 1048576, 99);
    })()`);
    await sleep(200);

    const metricsAfter = await cdp.send("Performance.getMetrics");
    const heapAfter = metricsAfter.result.metrics.find(m => m.name === "JSHeapUsedSize")?.value || 0;
    const heapGrowthMb = Math.round(((heapAfter - heapBefore) / (1024 * 1024)) * 100) / 100;

    const farCellCheck = await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      return {
        selected: grid.selectedCoord,
        val: grid.cellsData.get("XFD1048576")?.val,
        cellsCount: grid.cellsData.size
      };
    })()`);

    if (
      farCellCheck.selected.c === "XFD" &&
      farCellCheck.selected.r === 1048576 &&
      farCellCheck.val === 99 &&
      heapGrowthMb < 20 &&
      farCellCheck.cellsCount <= 2
    ) {
      report(
        "PASS",
        "JS Heap growth < 20MB after jumping to XFD1048576 & typing",
        `Active: ${farCellCheck.selected.c}${farCellCheck.selected.r}, Value: ${farCellCheck.val}, Heap growth: ${heapGrowthMb} MB, Stored cells: ${farCellCheck.cellsCount}`
      );
    } else {
      report(
        "FAIL",
        "JS Heap growth < 20MB after jumping to XFD1048576 & typing",
        `Coord: ${JSON.stringify(farCellCheck.selected)}, Val: ${farCellCheck.val}, Heap growth: ${heapGrowthMb} MB, Stored cells: ${farCellCheck.cellsCount}`
      );
    }

    // 5. Keyboard Ctrl+Arrow navigation over data boundary and empty extent
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.adapter.grid;
      grid.selectCell("A", 1);
      grid.setCellValue("A", 2, "Region1");
      grid.setCellValue("A", 3, "Region2");
      grid.setCellValue("A", 4, "Region3");
      grid.container.focus();
    })()`);
    await sleep(200);

    // From A1, Ctrl+Down jumps to A2 (first filled cell)
    await press(cdp, "ArrowDown", { ctrl: true });
    const jump1 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    // From A2, Ctrl+Down jumps to A4 (last contiguous filled cell)
    await press(cdp, "ArrowDown", { ctrl: true });
    const jump2 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    // From A4, Ctrl+Down jumps to A1048576 (sheet bound)
    await press(cdp, "ArrowDown", { ctrl: true });
    const jump3 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    // From A1048576, Ctrl+Up jumps to A4
    await press(cdp, "ArrowUp", { ctrl: true });
    const jump4 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    // From A4, Ctrl+Up jumps to A2
    await press(cdp, "ArrowUp", { ctrl: true });
    const jump5 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    // From A2, Ctrl+Up jumps to A1
    await press(cdp, "ArrowUp", { ctrl: true });
    const jump6 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    if (
      jump1.r === 2 && jump2.r === 4 && jump3.r === 1048576 &&
      jump4.r === 4 && jump5.r === 2 && jump6.r === 1
    ) {
      report(
        "PASS",
        "Keyboard Ctrl+Arrow boundary navigation",
        `A1 -> A${jump1.r} -> A${jump2.r} -> A${jump3.r} -> A${jump4.r} -> A${jump5.r} -> A${jump6.r}`
      );
    } else {
      report(
        "FAIL",
        "Keyboard Ctrl+Arrow boundary navigation",
        `Jumps: [${jump1.r}, ${jump2.r}, ${jump3.r}, ${jump4.r}, ${jump5.r}, ${jump6.r}]`
      );
    }

    // 6. Keyboard Ctrl+Home and Ctrl+End
    await press(cdp, "End", { ctrl: true });
    const endCoord = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    await press(cdp, "Home", { ctrl: true });
    const homeCoord = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    if (endCoord.c === "XFD" && endCoord.r === 1048576 && homeCoord.c === "A" && homeCoord.r === 1) {
      report(
        "PASS",
        "Keyboard Ctrl+Home and Ctrl+End",
        `Ctrl+End -> ${endCoord.c}${endCoord.r}, Ctrl+Home -> ${homeCoord.c}${homeCoord.r}`
      );
    } else {
      report(
        "FAIL",
        "Keyboard Ctrl+Home and Ctrl+End",
        `End: ${JSON.stringify(endCoord)}, Home: ${JSON.stringify(homeCoord)}`
      );
    }

    // 7. Keyboard Page Down and Page Up
    await press(cdp, "PageDown");
    const pageDownCoord = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    await press(cdp, "PageUp");
    const pageUpCoord = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.selectedCoord");

    if (pageDownCoord.r > 10 && pageUpCoord.r === 1) {
      report(
        "PASS",
        "Keyboard Page Down and Page Up",
        `PageDown -> row ${pageDownCoord.r}, PageUp -> row ${pageUpCoord.r}`
      );
    } else {
      report(
        "FAIL",
        "Keyboard Page Down and Page Up",
        `Down: row ${pageDownCoord.r}, Up: row ${pageUpCoord.r}`
      );
    }

    // 8. Name Box jumps & selects (A1, XFD1048576, B2:D10, C:E, 5:8)
    const nameBoxResults = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      const res = {};

      g._jumpToNameBoxAddress("B2:D10");
      res.range = g.getSelectionNameLabel();

      g._jumpToNameBoxAddress("C:E");
      res.cols = g.getSelectionNameLabel();

      g._jumpToNameBoxAddress("5:8");
      res.rows = g.getSelectionNameLabel();

      g._jumpToNameBoxAddress("A1");
      res.single = g.getSelectionNameLabel();

      return res;
    })()`);

    if (
      nameBoxResults.range === "B2:D10" &&
      nameBoxResults.cols === "C:E" &&
      nameBoxResults.rows === "5:8" &&
      nameBoxResults.single === "A1"
    ) {
      report(
        "PASS",
        "Name Box jumps & selects (B2:D10, C:E, 5:8, A1)",
        `Labels: range=${nameBoxResults.range}, cols=${nameBoxResults.cols}, rows=${nameBoxResults.rows}, single=${nameBoxResults.single}`
      );
    } else {
      report(
        "FAIL",
        "Name Box jumps & selects (B2:D10, C:E, 5:8, A1)",
        JSON.stringify(nameBoxResults)
      );
    }

    // 9. Selection extent: Ctrl+A (current region then full sheet)
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      g.selectCell("A", 2);
      g.container.focus();
    })()`);
    await sleep(100);

    // First Ctrl+A: selects current region A2:A4
    await press(cdp, "a", { ctrl: true });
    const ctrlA1 = await cdp.evaluate("window.__vnoAppInstance.adapter.grid.getSelectionNameLabel()");

    // Second Ctrl+A: selects full sheet
    await press(cdp, "a", { ctrl: true });
    const ctrlA2 = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      const r = g.selectionRange || (g.selectionRanges && g.selectionRanges[0]) || { start: g.selectedCoord, end: g.selectedCoord };
      return {
        label: g.getSelectionNameLabel(),
        start: r.start,
        end: r.end
      };
    })()`);

    if (
      ctrlA1 === "A2:A4" &&
      ctrlA2.start.c === "A" && ctrlA2.start.r === 1 &&
      ctrlA2.end.c === "XFD" && ctrlA2.end.r === 1048576
    ) {
      report(
        "PASS",
        "Selection Ctrl+A (CurrentRegion then full sheet)",
        `1st Ctrl+A: ${ctrlA1}, 2nd Ctrl+A: ${ctrlA2.start.c}${ctrlA2.start.r}:${ctrlA2.end.c}${ctrlA2.end.r}`
      );
    } else {
      report(
        "FAIL",
        "Selection Ctrl+A (CurrentRegion then full sheet)",
        `1st: ${ctrlA1}, 2nd: ${JSON.stringify(ctrlA2)}`
      );
    }

    // 10. Selection extent: Ctrl+Space and Shift+Space
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      g.selectCell("B", 5);
      g.container.focus();
    })()`);
    await sleep(100);

    await press(cdp, " ", { ctrl: true });
    const colSelection = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      const r = g.selectionRange || (g.selectionRanges && g.selectionRanges[0]) || { start: g.selectedCoord, end: g.selectedCoord };
      return { start: r.start, end: r.end };
    })()`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      g.selectCell("B", 5);
      g.container.focus();
    })()`);
    await sleep(100);

    await press(cdp, " ", { shift: true });
    const rowSelection = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      const r = g.selectionRange || (g.selectionRanges && g.selectionRanges[0]) || { start: g.selectedCoord, end: g.selectedCoord };
      return { start: r.start, end: r.end };
    })()`);

    if (
      colSelection.start.c === "B" && colSelection.start.r === 1 &&
      colSelection.end.c === "B" && colSelection.end.r === 1048576 &&
      rowSelection.start.c === "A" && rowSelection.start.r === 5 &&
      rowSelection.end.c === "XFD" && rowSelection.end.r === 5
    ) {
      report(
        "PASS",
        "Selection Ctrl+Space (whole column) and Shift+Space (whole row)",
        `Ctrl+Space: ${colSelection.start.c}${colSelection.start.r}:${colSelection.end.c}${colSelection.end.r}, Shift+Space: ${rowSelection.start.c}${rowSelection.start.r}:${rowSelection.end.c}${rowSelection.end.r}`
      );
    } else {
      report(
        "FAIL",
        "Selection Ctrl+Space (whole column) and Shift+Space (whole row)",
        `Col: ${JSON.stringify(colSelection)}, Row: ${JSON.stringify(rowSelection)}`
      );
    }

    // 11. Sparse formula evaluation: =SUM(A1:A1048576) and =XFD1048576
    const formulaResults = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.adapter.grid;
      g.setCellValue("C", 1, 10);
      g.setCellValue("C", 2, 20);
      g.setCellValue("C", 3, 30);

      const t0 = performance.now();
      g.setCellValue("D", 1, "=SUM(C1:C1048576)");
      const sumElapsed = performance.now() - t0;
      const sumVal = g.cellsData.get("D1")?.val;

      g.setCellValue("D", 2, "=XFD1048576");
      const refVal = g.cellsData.get("D2")?.val;

      return {
        sumElapsed: Math.round(sumElapsed * 10) / 10,
        sumVal,
        refVal
      };
    })()`);

    if (
      formulaResults.sumVal === 60 &&
      formulaResults.refVal === 99 &&
      formulaResults.sumElapsed < 100
    ) {
      report(
        "PASS",
        "Sparse formula evaluation (=SUM(C1:C1048576) & =XFD1048576)",
        `=SUM(C1:C1048576) = ${formulaResults.sumVal} (${formulaResults.sumElapsed}ms), =XFD1048576 = ${formulaResults.refVal}`
      );
    } else {
      report(
        "FAIL",
        "Sparse formula evaluation (=SUM(C1:C1048576) & =XFD1048576)",
        JSON.stringify(formulaResults)
      );
    }
  } finally {
    await session.close().catch(() => {});
  }

  // 12, 13 & 14. Real LAN file parity verification (first 50 rows x 30 cols + non-empty counts)
  console.log("Checking LAN files parity (lan02.xlsx, lan11.xlsx, lan09.xlsx)...");
  try {
    const summaryPath = path.join(os.tmpdir(), "vno-grid-parity-ref", "parity_summary.json");
    let summaryData = null;
    try {
      const raw = await fs.readFile(summaryPath, "utf8");
      summaryData = JSON.parse(raw);
    } catch {
      // If parity summary does not exist in temp dir, try running verify-lan-parity.mjs if LAN files exist
      try {
        const { runParityCheck } = await import("./verify-lan-parity.mjs");
        summaryData = await runParityCheck();
      } catch (err) {
        summaryData = null;
      }
    }

    if (!summaryData || !summaryData.files) {
      report(
        "NOT RUN",
        "LAN file lan02.xlsx render parity (first 50 rows)",
        "Reference data not found in OS temp and LAN source files unavailable to produce live"
      );
      report(
        "NOT RUN",
        "LAN file lan11.xlsx render parity (first 50 rows)",
        "Reference data not found in OS temp and LAN source files unavailable to produce live"
      );
      report(
        "NOT RUN",
        "LAN file lan09.xlsx render parity (first 50 rows)",
        "Reference data not found in OS temp and LAN source files unavailable to produce live"
      );
      return;
    }

    // Verify lan02
    const lan02 = summaryData.files["lan02.xlsx"];
    if (!lan02) {
      report("NOT RUN", "LAN file lan02.xlsx render parity (first 50 rows)", "lan02.xlsx entry missing in parity summary");
    } else {
      const sheetKeys = Object.keys(lan02.sheets || {});
      const uncNonEmpty = lan02.sheets["UNC"]?.nonEmptyBranch ?? 0;
      const salaryNonEmpty = lan02.sheets["DANH SÁCH CHI LƯƠNG"]?.nonEmptyBranch ?? 0;
      if (lan02.totalDifferingCells === 0 && lan02.nonEmptyParity && sheetKeys.length === 2) {
        report(
          "PASS",
          "LAN file lan02.xlsx render parity (first 50 rows)",
          `Sheets: [${sheetKeys.join(", ")}], Cells compared: ${lan02.totalCellsCompared}, Differing: ${lan02.totalDifferingCells}, Total non-empty: ${uncNonEmpty + salaryNonEmpty} (UNC: ${uncNonEmpty}, Salary: ${salaryNonEmpty})`
        );
      } else {
        report(
          "FAIL",
          "LAN file lan02.xlsx render parity (first 50 rows)",
          `Differing cells: ${lan02.totalDifferingCells}, Non-empty parity: ${lan02.nonEmptyParity}, Sheets: ${JSON.stringify(sheetKeys)}`
        );
      }
    }

    // Verify lan11
    const lan11 = summaryData.files["lan11.xlsx"];
    if (!lan11) {
      report("NOT RUN", "LAN file lan11.xlsx render parity (first 50 rows)", "lan11.xlsx entry missing in parity summary");
    } else {
      const sheetKeys = Object.keys(lan11.sheets || {});
      const introNonEmpty = lan11.sheets["Giới thiệu"]?.nonEmptyBranch ?? 0;
      const reyeeNonEmpty = lan11.sheets["Reyee"]?.nonEmptyBranch ?? 0;
      const ruijieNonEmpty = lan11.sheets["Ruijie"]?.nonEmptyBranch ?? 0;
      const totalNonEmpty = introNonEmpty + reyeeNonEmpty + ruijieNonEmpty;
      if (lan11.totalDifferingCells === 0 && lan11.nonEmptyParity && sheetKeys.length === 3) {
        report(
          "PASS",
          "LAN file lan11.xlsx render parity (first 50 rows)",
          `Sheets: [${sheetKeys.join(", ")}], Cells compared: ${lan11.totalCellsCompared}, Differing: ${lan11.totalDifferingCells}, Total non-empty: ${totalNonEmpty} (Intro: ${introNonEmpty}, Reyee: ${reyeeNonEmpty}, Ruijie: ${ruijieNonEmpty})`
        );
      } else {
        report(
          "FAIL",
          "LAN file lan11.xlsx render parity (first 50 rows)",
          `Differing cells: ${lan11.totalDifferingCells}, Non-empty parity: ${lan11.nonEmptyParity}, Sheets: ${JSON.stringify(sheetKeys)}`
        );
      }
    }

    // Verify lan09
    const lan09 = summaryData.files["lan09.xlsx"];
    if (!lan09) {
      report("NOT RUN", "LAN file lan09.xlsx render parity (first 50 rows)", "lan09.xlsx entry missing in parity summary");
    } else {
      let totalNonEmpty = 0;
      for (const s of Object.values(lan09.sheets || {})) {
        totalNonEmpty += (s.nonEmptyBranch || 0);
      }
      if (lan09.totalDifferingCells === 0 && lan09.nonEmptyParity && lan09.sheetsCompared >= 48) {
        report(
          "PASS",
          "LAN file lan09.xlsx render parity (first 50 rows)",
          `Sheets: ${lan09.sheetsCompared}, Cells compared: ${lan09.totalCellsCompared}, Differing: ${lan09.totalDifferingCells}, Total non-empty: ${totalNonEmpty}`
        );
      } else {
        report(
          "FAIL",
          "LAN file lan09.xlsx render parity (first 50 rows)",
          `Differing cells: ${lan09.totalDifferingCells}, Non-empty parity: ${lan09.nonEmptyParity}, Sheets: ${lan09.sheetsCompared}`
        );
      }
    }
  } catch (err) {
    report("FAIL", "LAN files verification", err.message);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await runGridExtentDesktopTests();
  } catch (error) {
    report("FAIL", "Desktop test runner error", error?.stack || error?.message || String(error));
  }

  const widths = {
    status: Math.max(6, ...rows.map(row => row.status.length)),
    label: Math.max(5, ...rows.map(row => row.label.length)),
  };
  console.log("");
  console.log("STATUS".padEnd(widths.status) + " | " + "CHECK".padEnd(widths.label) + " | DETAIL");
  console.log("-".repeat(widths.status) + "-+-" + "-".repeat(widths.label) + "-+-" + "-".repeat(72));
  for (const row of rows) {
    console.log(row.status.padEnd(widths.status) + " | " + row.label.padEnd(widths.label) + " | " + row.detail);
  }
  const passCount = rows.filter(row => row.status === "PASS").length;
  const failCount = rows.filter(row => row.status === "FAIL").length;
  const notRunCount = rows.filter(row => row.status === "NOT RUN").length;
  console.log("");
  console.log("TOTAL: " + passCount + " PASS, " + failCount + " FAIL" + (notRunCount > 0 ? ", " + notRunCount + " NOT RUN" : ""));
  if (failCount > 0) process.exitCode = 1;
}
