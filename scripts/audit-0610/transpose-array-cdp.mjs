import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, mouseDrag, press, sleep, typeText } from "../../tests/live/cdp/actions.mjs";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
const workFile = path.join(os.tmpdir(), `vno-e1-transposeArray-${process.pid}_e1transposeArray.xlsx`);
const session = await (async () => {
  await fs.copyFile(source, workFile);
  return launchApp("sheet", {
    root,
    filePath: workFile,
    localAppData: path.join(process.env.VNO_CDP_LOCALAPPDATA || os.tmpdir(), "e1-transpose-array"),
  });
})();

try {
  const { cdp } = session;
  const workName = path.basename(workFile).toLowerCase();
  await cdp.waitFor(
    `String(window.__vnoAppInstance?.adapter?.sourceFilePath || "").toLowerCase().endsWith(${JSON.stringify(workName)}) && window.__vnoAppInstance?.grid?.cellsData?.size > 0`,
    { timeoutMilliseconds: 60000 },
  );
  await cdp.waitFor("!!document.querySelector('.vno-grid-cell[data-coord=\"A1\"]')", { timeoutMilliseconds: 30000 });
  for (const [coord, value] of [["A1", "1"], ["B1", "2"], ["C1", "3"], ["A2", "4"], ["B2", "5"], ["C2", "6"]]) {
    await click(cdp, `.vno-grid-cell[data-coord="${coord}"]`);
    await click(cdp, "#vno-formula-val");
    await press(cdp, "Home", {}, 0);
    await press(cdp, "End", { shift: true }, 0);
    await press(cdp, "Backspace", {}, 0);
    await typeText(cdp, value, 0);
    await press(cdp, "Enter", {}, 50);
  }

  const points = await cdp.evaluate(`(() => {
    const point = coord => {
      const cell = document.querySelector('.vno-grid-cell[data-coord="' + coord + '"]');
      if (!cell) return null;
      const rect = cell.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    return { start: point("D1"), end: point("E3") };
  })()`);
  if (!points.start || !points.end) throw new Error(`TRANSPOSE target cells are not visible: ${JSON.stringify(points)}`);
  await mouseDrag(cdp, points.start.x, points.start.y, points.end.x, points.end.y, { steps: 3, settleMs: 150 });
  await click(cdp, "#vno-formula-val");
  await press(cdp, "Home", {}, 0);
  await press(cdp, "End", { shift: true }, 0);
  await press(cdp, "Backspace", {}, 0);
  await typeText(cdp, "=TRANSPOSE(A1:C2)", 0);
  await press(cdp, "Enter", { ctrl: true, shift: true }, 400);

  const result = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const coords = ["D1", "E1", "D2", "E2", "D3", "E3"];
    return {
      selection: grid.selectionRange,
      cells: coords.map(coord => {
        const item = grid.cellsData.get(coord);
        return { coord, val: item?.val, formula: item?.formula, isArrayFormula: item?.isArrayFormula, arrayRange: item?.arrayRange };
      })
    };
  })()`);
  const expected = [1, 4, 2, 5, 3, 6];
  if (!result.cells.every((cell, index) => cell.val === expected[index] && cell.isArrayFormula && cell.arrayRange === "D1:E3")) {
    throw new Error(`TRANSPOSE array CDP result did not match: ${JSON.stringify(result)}`);
  }
  if (await cdp.evaluate("window.__vnoAppInstance.adapter.save()") !== true) {
    throw new Error("VN Sheet did not save the TRANSPOSE array workbook.");
  }
  await sleep(500);
  const readback = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    path.join(root, "scripts/audit-0610/word_parallel/excel-read.ps1"), "-Files", workFile,
  ], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  const jsonLine = readback.split(/\r?\n/).find(line => line.startsWith("E1ARRAYJSON:"));
  if (!jsonLine) throw new Error("Excel read-only audit returned no TRANSPOSE array values.");
  const excelCells = JSON.parse(jsonLine.slice("E1ARRAYJSON:".length));
  const audit = {
    formula: "=TRANSPOSE(A1:C2)",
    targetRange: "D1:E3",
    source: [[1, 2, 3], [4, 5, 6]],
    cdpCells: result.cells,
    excelVersion: "16.0.4266.1001",
    excelReadOnly: true,
    excelCells,
    match: excelCells.every((cell, index) => Number(cell.value2) === expected[index]),
  };
  await fs.writeFile(path.join(root, "docs/EXCEL2016-TRANSPOSE-ARRAY-COM-RESULTS.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(audit, null, 2));
  if (!audit.match) process.exitCode = 1;
} finally {
  await session.close();
}
