import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = path.join(root, path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, ""));
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  if (process.env.VNO_SHEET_SELECTION_BASELINE_REV) {
    const { execFileSync } = await import("node:child_process");
    const baselineGrid = execFileSync("git", ["show", `${process.env.VNO_SHEET_SELECTION_BASELINE_REV}:apps/sheet/sheet-grid.js`], {
      cwd: root,
      encoding: "utf8"
    });
    await page.route("**/apps/sheet/sheet-grid.js", route => route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=UTF-8",
      body: baselineGrid
    }));
  }
  const { port } = server.address();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  if (await page.locator(".vno-shell").getAttribute("data-app") !== "sheet") {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator('[data-switch="sheet"]').click();
    await page.locator('.vno-shell[data-app="sheet"]').waitFor();
  }

  const cell = coord => page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
  const box = async locator => {
    await locator.waitFor({ state: "visible" });
    return locator.boundingBox();
  };
  const center = rect => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const readState = () => page.evaluate(() => {
    const grid = window.__vnoAppInstance.grid;
    return {
      range: structuredClone(grid.selectionRange),
      active: { ...grid.selectedCoord },
      name: document.querySelector("#vno-cell-name")?.textContent || "",
      highlighted: document.querySelectorAll(".vno-grid-cell.is-range-selected").length,
      status: document.querySelector("#vno-status-docinfo")?.textContent || "",
      nativeSelection: window.getSelection()?.toString() || "",
      selectedAreas: grid.selectionRanges?.length || 1,
      scrollTop: grid.viewport.scrollTop,
      scrollLeft: grid.viewport.scrollLeft,
      frozenRows: grid.frozenRows,
      frozenCols: grid.frozenCols,
      editedBefore: grid._cellValueBeforeEdit
    };
  });
  const resetGrid = () => page.evaluate(() => {
    const grid = window.__vnoAppInstance.grid;
    if (grid.formatPainter) grid.cancelFormatPainter();
    if (grid.frozenRows || grid.frozenCols) grid._setFreezePanes(0, 0, false);
    grid.viewport.scrollTop = 0;
    grid.viewport.scrollLeft = 0;
    grid.cellsData.clear();
    let value = 1;
    for (let row = 3; row <= 10; row++) {
      for (const col of ["B", "C", "D", "E"]) {
        grid.cellsData.set(`${col}${row}`, { val: value++, formula: "", style: {} });
      }
    }
    grid._renderVirtualRows(1, 40);
    grid.selectCell("B", 3);
  });
  const drag = async (from, to, steps = 12) => {
    const start = await box(from);
    const end = await box(to);
    const startPoint = center(start);
    const endPoint = center(end);
    await page.mouse.move(startPoint.x, startPoint.y);
    await page.mouse.down();
    await page.mouse.move(endPoint.x, endPoint.y, { steps });
    await page.waitForTimeout(40);
    const during = await readState();
    await page.mouse.up();
    await page.waitForTimeout(40);
    return { during, after: await readState() };
  };

  await resetGrid();
  {
    const start = center(await box(cell("B3")));
    const middle = center(await box(cell("C4")));
    const end = center(await box(cell("E10")));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(middle.x, middle.y, { steps: 3 });
    const liveRange = await readState();
    await page.mouse.move(end.x, end.y, { steps: 9 });
    const fullRange = await readState();
    await page.mouse.up();
    const after = await readState();
    assert(liveRange.name === "B3:C4", "Selection box grows while mouse is held", liveRange.name);
    assert(fullRange.name === "B3:E10" && fullRange.highlighted === 32, "B3→E10 selects all 32 cells live", `${fullRange.name}; highlighted=${fullRange.highlighted}`);
    assert(fullRange.active.c === "E" && fullRange.active.r === 10, "Dragged endpoint becomes active cell", `${fullRange.active.c}${fullRange.active.r}`);
    assert(fullRange.status.includes("ĐẾM: 32") && fullRange.status.includes("TRUNG BÌNH: 16,5") && fullRange.status.includes("TỔNG CỘNG: 528"), "Status bar aggregates selected cells during drag", fullRange.status);
    assert(fullRange.nativeSelection === "", "Drag does not create native text selection", JSON.stringify(fullRange.nativeSelection));
    assert(after.name === "B3:E10" && after.highlighted === 32, "Mouseup preserves the selected range", after.name);
  }

  {
    const result = await drag(cell("E10"), cell("B3"));
    assert(result.after.name === "B3:E10", "Reverse drag normalizes the displayed range", result.after.name);
    assert(result.after.range.start.c === "E" && result.after.range.start.r === 10 && result.after.active.c === "B" && result.after.active.r === 3, "Reverse drag retains E10 anchor and B3 active endpoint", JSON.stringify({ range: result.after.range, active: result.after.active }));
  }

  {
    await page.evaluate(() => window.__vnoAppInstance.grid.selectCell("B", 3));
    const target = center(await box(cell("E10")));
    await page.keyboard.down("Shift");
    await page.mouse.click(target.x, target.y);
    await page.keyboard.up("Shift");
    const shifted = await readState();
    assert(shifted.name === "B3:E10" && shifted.active.c === "E" && shifted.active.r === 10, "Shift+click extends from the saved anchor", `${shifted.name}; active=${shifted.active.c}${shifted.active.r}`);
    await page.keyboard.press("Shift+ArrowRight");
    const keyboardExtended = await readState();
    assert(keyboardExtended.name === "B3:F10" && keyboardExtended.active.c === "F", "Shift+Arrow continues from the mouse endpoint", `${keyboardExtended.name}; active=${keyboardExtended.active.c}${keyboardExtended.active.r}`);
  }

  {
    await page.evaluate(() => window.__vnoAppInstance.grid.selectCell("B", 3));
    const target = center(await box(cell("E10")));
    await page.keyboard.down("Control");
    await page.mouse.click(target.x, target.y);
    await page.keyboard.up("Control");
    const multi = await readState();
    assert(multi.selectedAreas === 2 && multi.name === "B3,E10", "Ctrl+click adds a second selection area", `${multi.name}; areas=${multi.selectedAreas}`);
    assert(multi.highlighted === 2 && multi.status.includes("ĐẾM: 2") && multi.status.includes("TỔNG CỘNG: 33"), "Ctrl+click highlights and aggregates both areas", `${multi.highlighted} highlighted; ${multi.status}`);
  }

  {
    const result = await drag(page.locator('.vno-row-header[data-row="3"]'), page.locator('.vno-row-header[data-row="10"]'), 8);
    assert(result.after.name === "3:10" && result.after.range.start.c === "A" && result.after.range.end.c === "Z" && result.after.range.end.r === 10, "Row-header drag selects full rows 3–10 with Excel Name Box syntax", `${result.after.name}; ${JSON.stringify(result.after.range)}`);
    const columns = await drag(page.locator('.vno-col-header[data-col="B"]'), page.locator('.vno-col-header[data-col="E"]'), 8);
    assert(columns.after.name === "B:E" && columns.after.range.start.r === 1 && columns.after.range.end.r === 200 && columns.after.range.end.c === "E", "Column-header drag selects full columns B–E with Excel Name Box syntax", `${columns.after.name}; ${JSON.stringify(columns.after.range)}`);
  }

  {
    await resetGrid();
    await page.keyboard.press("Control+ArrowRight");
    const rightEdge = await readState();
    await page.keyboard.press("Control+ArrowDown");
    const bottomEdge = await readState();
    assert(rightEdge.active.c === "E" && rightEdge.active.r === 3, "Ctrl+Right moves to the contiguous data edge", `${rightEdge.active.c}${rightEdge.active.r}`);
    assert(bottomEdge.active.c === "E" && bottomEdge.active.r === 10, "Ctrl+Down moves to the contiguous data edge", `${bottomEdge.active.c}${bottomEdge.active.r}`);
    await page.keyboard.press("Control+a");
    const all = await readState();
    assert(all.name === "A1:Z200" && all.range.end.c === "Z" && all.range.end.r === 200, "Ctrl+A selects the sheet", `${all.name}; ${JSON.stringify(all.range)}`);
  }

  {
    await resetGrid();
    const viewport = await box(page.locator(".vno-grid-viewport"));
    const start = center(await box(cell("B3")));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(viewport.x + viewport.width - 4, viewport.y + viewport.height + 18, { steps: 30 });
    await page.waitForTimeout(1050);
    const scrolling = await readState();
    await page.mouse.up();
    const after = await readState();
    const end = after.range.end;
    assert(after.scrollTop > 400 && after.scrollLeft > 150, "Held pointer continuously scrolls down and right outside the viewport", `scrollTop=${after.scrollTop}; scrollLeft=${after.scrollLeft}`);
    assert(end.r >= 60 && end.c === "Z", "Edge drag extends through row 60 to column Z", `${end.c}${end.r}`);
    assert(after.name.startsWith("B3:") && after.name !== "B3", "Autoscrolled range remains selected after mouseup", after.name);
    assert(scrolling.status.includes("ĐẾM: 32"), "Status bar remains live while auto-scrolling", scrolling.status);
  }

  {
    await resetGrid();
    await page.evaluate(() => {
      const grid = window.__vnoAppInstance.grid;
      grid.cellsData.set("A22", { val: "source", formula: "", style: { backgroundColor: "#fff200", fontWeight: "bold" } });
      grid.cellsData.set("B22", { val: 99, formula: "", style: {} });
      grid.cellsData.set("C22", { val: "hello", formula: "", style: {} });
      grid.cellsData.set("D22", { val: "world", formula: "", style: {} });
      grid._renderVirtualRows(grid.currentStartRow, grid.currentEndRow);
      grid.selectCell("A", 22);
    });
    await page.locator('[data-command-id="sheet.edit.formatPainter"]').first().click();
    const result = await drag(cell("B22"), cell("D22"), 8);
    const painter = await page.evaluate(() => {
      const grid = window.__vnoAppInstance.grid;
      return {
        values: ["B22", "C22", "D22"].map(coord => grid.cellsData.get(coord)?.val),
        backgrounds: ["B22", "C22", "D22"].map(coord => grid.cellsData.get(coord)?.style?.backgroundColor),
        active: !!grid.formatPainter
      };
    });
    assert(result.after.name === "B22:D22", "Format Painter drag keeps target range selected", result.after.name);
    assert(painter.backgrounds.every(color => color === "#fff200") && !painter.active, "Format Painter applies source format across the dragged range", JSON.stringify(painter));
    assert(painter.values[0] === 99 && painter.values[1] === "hello" && painter.values[2] === "world", "Format Painter drag does not replace target values", JSON.stringify(painter.values));
  }

  {
    await resetGrid();
    await cell("B3").click();
    await page.keyboard.press("F2");
    await page.locator("#vno-formula-val").fill("777");
    const editBeforeDrag = await page.evaluate(() => ({
      focused: document.activeElement === document.querySelector("#vno-formula-val"),
      value: window.__vnoAppInstance.grid.cellsData.get("B3")?.val
    }));
    const result = await drag(cell("B3"), cell("E10"), 10);
    const edit = await page.evaluate(() => {
      const grid = window.__vnoAppInstance.grid;
      return {
        value: grid.cellsData.get("B3")?.val,
        selection: grid.selectionRange,
        active: grid.selectedCoord,
        editBefore: grid._cellValueBeforeEdit
      };
    });
    assert(editBeforeDrag.focused && String(editBeforeDrag.value) === "777", "Test begins with B3 actively edited in the formula bar", JSON.stringify(editBeforeDrag));
    assert(edit.value === "777", "Dragging out of a formula-bar edit commits the edited cell", String(edit.value));
    assert(edit.selection.end.c === "E" && edit.selection.end.r === 10 && edit.active.c === "E", "Edit commit is followed by the requested range drag", JSON.stringify(edit));
    assert(edit.editBefore === undefined, "Committed edit state is cleared before the next cell", String(edit.editBefore));
    assert(result.after.name === "B3:E10", "Edit-mode drag preserves the final range", result.after.name);
  }

  {
    await resetGrid();
    const frozen = await page.evaluate(() => {
      const grid = window.__vnoAppInstance.grid;
      grid.selectCell("C", 4);
      grid.toggleFreezePanes();
      grid.viewport.scrollTop = grid._rowTop(18) - grid._rowBottom(grid.frozenRows);
      grid.viewport.scrollLeft = 110;
      grid._onViewportScroll();
      return { rows: grid.frozenRows, cols: grid.frozenCols };
    });
    await page.waitForTimeout(80);
    const result = await drag(cell("B20"), cell("E40"), 10);
    assert(frozen.rows === 3 && frozen.cols === 2, "Freeze Panes is active while scrolled", JSON.stringify(frozen));
    assert(result.after.name === "B20:E40" && result.after.active.c === "E" && result.after.active.r === 40, "Drag selection crosses visible frozen-pane boundaries", `${result.after.name}; active=${result.after.active.c}${result.after.active.r}`);
  }

  assert(pageErrors.length === 0, "No browser runtime errors", pageErrors.join(" | "));
  if (failures.length) {
    console.error(`\n${failures.length} live selection assertion(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nPASS: Sheet range selection live mouse workflows");
  }
} finally {
  await browser.close();
  server.close();
}
