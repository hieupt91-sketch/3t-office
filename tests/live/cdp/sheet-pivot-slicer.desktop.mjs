// Desktop thật qua WebView2 CDP; không dùng SendKeys hay điều khiển hệ điều hành.
import { launchApp } from "./session.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and a dedicated VNO_CDP_LOCALAPPDATA profile.");

const session = await launchApp("sheet", { root, localAppData, startTimeoutMilliseconds: 180000 });
try {
  const result = await session.cdp.evaluate(`(async () => {
    const grid = window.__vnoAppInstance?.grid;
    if (!grid) return { ok: false, reason: "missing-grid" };
    await grid._loadPivotEngine();
    const rows = [
      ["Date", "Region", "Amount"],
      ["2025-01-05", "North", 10],
      ["2025-02-10", "South", 20],
      ["2025-03-15", "North", 30],
      ["2025-04-20", "East", 40]
    ];
    rows.forEach((row, r) => row.forEach((value, c) => grid.setCellValue(grid._columnLabel(c + 1), r + 1, value, false)));
    grid.createPivotTable({
      id: "cdp-pivot", name: "CDP Pivot", sourceSheet: grid.activeSheet, sourceRange: "A1:C5",
      targetSheet: grid.activeSheet, targetCoord: "F1", rows: ["Region"], columns: [],
      values: [{ field: "Amount", aggregate: "SUM" }]
    }, false);
    grid.selectedCoord = { c: "F", r: 1 };
    grid._syncFormatToggleUI();
    const pivot = grid._activePivot();
    const slicer = grid.tableSlicer.createPivot(pivot, "Region", { left: 500, top: 30 }, false);
    grid.tableSlicer.select(slicer.id, "North", {}, false);
    const timeline = grid.tableSlicer.createPivot(pivot, "Date", { kind: "timeline", left: 500, top: 270 }, false);
    grid.tableSlicer.setTimelineRange(timeline.id, "2025-01-01", "2025-03-31", false);
    grid.tableSlicer.setTimelineGranularity(timeline.id, "months", false);
    grid.tableSlicer.render();
    const panels = [...document.querySelectorAll(".vno-table-slicer")];
    const selected = panels.flatMap(panel => [...panel.querySelectorAll(".vno-slicer-item.is-selected")].map(item => item.textContent.trim()));
    const timelineInputs = document.querySelectorAll(".vno-timeline-body input[type=date]").length;
    const pivotTab = document.querySelector("#vno-ribbon-tab-pivotAnalyze");
    const filtered = grid._pivotFilterConditions(pivot);
    return {
      ok: panels.length === 2 && selected.includes("North") && timelineInputs === 2 && !pivotTab?.hidden
        && filtered.some(item => item.field === "Region") && filtered.some(item => item.kind === "timeline"),
      panels: panels.length, selected, timelineInputs, pivotTabHidden: pivotTab?.hidden, filtered
    };
  })()`, { awaitPromise: true, timeoutMilliseconds: 60000 });
  console.log(`${result.ok ? "PASS" : "FAIL"} | desktop CDP Pivot Slicer + Timeline | ${JSON.stringify(result)}`);
  if (!result.ok) process.exitCode = 1;
} finally {
  await session.close();
}
