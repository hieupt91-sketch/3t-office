import { launchApp } from "./session.mjs";
import { click, mouseClick, mouseDoubleClick, mouseDrag, mouseRightClick, press, typeText, sleep } from "./actions.mjs";
import path from "node:path";

const session = await launchApp("sheet", {
  root: process.env.VNO_APP_ROOT,
  localAppData: process.env.VNO_CDP_LOCALAPPDATA,
});
const { cdp } = session;
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const state = () => cdp.evaluate(`(() => {
  const grid = window.__vnoAppInstance?.sheetGrid || window.__vnoAppInstance?.grid;
  const cells = Object.fromEntries(["A1","A2","B2","C2","E2","E8","F8","A6","A7","D3","D4","F1","G1","G2","G3","A4","B4","H1","H2","H3","H4","A10","A11","C1","C2","C3","C4","D1","D2","J1","E10","F10"].map(key => [key, grid.cellsData.get(key) || null]));
  const coord = grid.selectedCoord;
  const range = grid.selectionRange;
  return { coord: String(coord.c)+String(coord.r), range: String(range.start.c)+String(range.start.r)+":"+String(range.end.c)+String(range.end.r), ranges: (grid.selectionRanges || []).map(r => String(r.start.c)+String(r.start.r)+":"+String(r.end.c)+String(r.end.r)), cells, rowCount: grid.rowCount, maxCol: grid.cols.at(-1),
    colKWidth: grid.getColumnWidth("K"), row1Height: grid.getRowHeight(1), endMode: !!grid._endModeActive, edit: !!grid.formulaEntry, input: grid.formulaInput?.value, undo: grid.undoStack.length, redo: grid.redoStack.length };
})()`);
const select = coord => click(cdp, `.vno-grid-cell[data-coord="${coord}"]`);
const pressSemicolon = async shift => {
  const modifiers = 2 | (shift ? 8 : 0);
  const key = shift ? ":" : ";";
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: "Semicolon", windowsVirtualKeyCode: 186, modifiers, text: "", unmodifiedText: "" });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: "Semicolon", windowsVirtualKeyCode: 186, modifiers });
  await sleep(250);
};

try {
  await sleep(700);
  await select("A1");
  await typeText(cdp, "E3_ALPHA");
  await press(cdp, "Enter");
  let s = await state();
  check("direct entry and Enter move down", s.cells.A1?.val === "E3_ALPHA" && s.coord === "A2", JSON.stringify(s));
  await typeText(cdp, "E3_ALPHA_2");
  await press(cdp, "Enter");
  s = await state();
  check("second direct entry seeds a contiguous range", s.cells.A2?.val === "E3_ALPHA_2" && s.coord === "A3", JSON.stringify(s));
  await select("A2");
  await press(cdp, "Tab");
  s = await state();
  check("Tab moves right", s.coord === "B2", JSON.stringify(s));
  await select("C2");
  await press(cdp, "Tab", { shift: true });
  s = await state();
  check("Shift+Tab moves left", s.coord === "B2", JSON.stringify(s));

  await select("A1");
  const undoBeforeEdit = (await state()).undo;
  await press(cdp, "F2");
  const editStart = await state();
  check("F2 starts editing in formula bar", editStart.edit && editStart.input === "E3_ALPHA", JSON.stringify(editStart));
  await press(cdp, "End");
  await typeText(cdp, "_EDIT");
  await press(cdp, "Escape");
  s = await state();
  check("Escape cancels edit without adding undo", s.cells.A1?.val === "E3_ALPHA" && !s.edit && s.undo === undoBeforeEdit, JSON.stringify(s));

  await select("A1");
  await press(cdp, "ArrowRight", { shift: true });
  s = await state();
  check("Shift+Arrow extends selection", s.coord === "B1" && s.range === "A1:B1", JSON.stringify(s));
  await select("A4");
  await typeText(cdp, "1");
  await press(cdp, "Enter");
  await select("B4");
  await typeText(cdp, "=A4");
  await press(cdp, "Enter");
  await select("B4");
  await press(cdp, "F2");
  await press(cdp, "End");
  await press(cdp, "F4");
  const f4Value = await cdp.evaluate("document.querySelector('#vno-formula-val')?.value || ''");
  check("F4 cycles the formula reference at the caret", f4Value === "=$A$4", f4Value);
  await press(cdp, "Escape");
  await select("H4");
  await typeText(cdp, "UP");
  await press(cdp, "Enter", { shift: true });
  s = await state();
  check("Shift+Enter commits and moves up", s.cells.H4?.val === "UP" && s.coord === "H3", JSON.stringify(s));
  await press(cdp, "Home", { ctrl: true });
  s = await state();
  check("Ctrl+Home selects A1", s.coord === "A1", JSON.stringify(s));
  await select("C3");
  await press(cdp, "Home");
  s = await state();
  check("Home selects first column in current row", s.coord === "A3", JSON.stringify(s));
  await press(cdp, "F5");
  await typeText(cdp, "A40");
  await press(cdp, "Enter");
  s = await state();
  check("Name Box can position the PageDown test cell", s.coord === "A40", s.coord);
  await press(cdp, "PageDown");
  s = await state();
  check("PageDown moves the active cell down by a viewport", Number(s.coord.match(/\d+$/)?.[0]) > 40, JSON.stringify(s));
  const pageDownRow = Number(s.coord.match(/\d+$/)?.[0]);
  await press(cdp, "PageUp");
  s = await state();
  check("PageUp moves the active cell back by a viewport", Number(s.coord.match(/\d+$/)?.[0]) < pageDownRow, JSON.stringify(s));
  await press(cdp, "Home", { ctrl: true });
  await select("A10");
  await typeText(cdp, "EDGE_ONE");
  await press(cdp, "Enter");
  await typeText(cdp, "EDGE_TWO");
  await press(cdp, "Enter");
  await select("A10");
  await press(cdp, "ArrowDown", { ctrl: true });
  s = await state();
  check("Ctrl+Down reaches the edge of a contiguous data block", s.coord === "A11", JSON.stringify(s));
  await select("A10");
  await press(cdp, "End");
  s = await state();
  check("End activates end-navigation mode", s.endMode, JSON.stringify(s));
  await press(cdp, "ArrowDown");
  s = await state();
  check("End then ArrowDown moves to the data edge", s.coord === "A11" && !s.endMode, JSON.stringify(s));
  await select("A10");
  await press(cdp, "ArrowDown", { ctrl: true, shift: true });
  s = await state();
  check("Ctrl+Shift+Down extends selection to the data edge", s.range === "A10:A11", JSON.stringify(s));
  await select("B4");
  await press(cdp, " ", { ctrl: true });
  s = await state();
  check("Ctrl+Space selects the active column", s.range.startsWith("B1:B"), JSON.stringify(s));
  await select("B4");
  await press(cdp, " ", { shift: true });
  s = await state();
  check("Shift+Space selects the active row", s.range.startsWith("A4:"), JSON.stringify(s));

  await press(cdp, "g", { ctrl: true });
  let active = await cdp.evaluate("document.activeElement?.id || ''");
  check("Ctrl+G focuses the address box", active === "vno-cell-name", active);
  await typeText(cdp, "D7");
  await press(cdp, "Enter");
  s = await state();
  check("Ctrl+G address entry navigates", s.coord === "D7", JSON.stringify(s));
  await press(cdp, "F5");
  active = await cdp.evaluate("document.activeElement?.id || ''");
  check("F5 focuses the address box", active === "vno-cell-name", active);
  await typeText(cdp, "E8");
  await press(cdp, "Enter");
  s = await state();
  check("F5 address entry navigates", s.coord === "E8", JSON.stringify(s));
  await select("E8");
  await pressSemicolon(false);
  s = await state();
  check("Ctrl+semicolon inserts a date", s.cells.E8?.style?.numberFormat?.category === "date", JSON.stringify(s.cells.E8));
  await select("F8");
  await pressSemicolon(true);
  s = await state();
  check("Ctrl+Shift+semicolon inserts an HH:mm:ss text value", /^\d{2}:\d{2}:\d{2}$/.test(s.cells.F8?.val || "") && !s.cells.F8?.style?.numberFormat, JSON.stringify(s.cells.F8));

  await select("G1");
  await press(cdp, "ArrowDown", { shift: true });
  await press(cdp, "ArrowDown", { shift: true });
  const undoBeforeCtrlEnter = (await state()).undo;
  await typeText(cdp, "BROADCAST");
  await press(cdp, "Enter", { ctrl: true });
  s = await state();
  check("Ctrl+Enter fills each selected cell with the entered value", [s.cells.G1,s.cells.G2,s.cells.G3].every(cell => cell?.val === "BROADCAST") && s.range === "G1:G3" && s.undo === undoBeforeCtrlEnter + 1, JSON.stringify(s));
  await press(cdp, "z", { ctrl: true });
  s = await state();
  check("Ctrl+Z reverses the full Ctrl+Enter fill in one step", [s.cells.G1,s.cells.G2,s.cells.G3].every(cell => !cell?.val), JSON.stringify(s));
  await press(cdp, "y", { ctrl: true });
  s = await state();
  check("Ctrl+Y restores the full Ctrl+Enter fill in one step", [s.cells.G1,s.cells.G2,s.cells.G3].every(cell => cell?.val === "BROADCAST"), JSON.stringify(s));

  await press(cdp, "F5");
  await typeText(cdp, "H1:H3");
  await press(cdp, "Enter");
  s = await state();
  check("Name Box selects the formula fill range", s.range === "H1:H3", JSON.stringify(s));
  await typeText(cdp, '=A4+$B$1&" A4"');
  await press(cdp, "Enter", { ctrl: true });
  s = await state();
  const broadcastFormulas = '=A4+$B$1&" A4"|=A5+$B$1&" A4"|=A6+$B$1&" A4"';
  check("Ctrl+Enter translates relative references, keeps absolute references and leaves string literals intact", [s.cells.H1?.formula,s.cells.H2?.formula,s.cells.H3?.formula].join("|") === broadcastFormulas, JSON.stringify([s.cells.H1,s.cells.H2,s.cells.H3]));
  await press(cdp, "z", { ctrl: true });
  s = await state();
  check("Ctrl+Z undoes formula broadcast across the entire selection", [s.cells.H1,s.cells.H2,s.cells.H3].every(cell => !cell?.formula), JSON.stringify([s.cells.H1,s.cells.H2,s.cells.H3]));
  await press(cdp, "y", { ctrl: true });
  s = await state();
  check("Ctrl+Y restores the translated formula broadcast", [s.cells.H1?.formula,s.cells.H2?.formula,s.cells.H3?.formula].join("|") === broadcastFormulas, JSON.stringify([s.cells.H1,s.cells.H2,s.cells.H3]));

  await select("A1");
  await press(cdp, "c", { ctrl: true });
  await select("C2");
  await press(cdp, "v", { ctrl: true });
  s = await state();
  check("Ctrl+C and Ctrl+V copy cell", s.cells.C2?.val === "E3_ALPHA", JSON.stringify(s));
  await press(cdp, "z", { ctrl: true });
  s = await state();
  check("Ctrl+Z undoes one paste", (s.cells.C2?.val ?? "") === "" && s.cells.A1?.val === "E3_ALPHA", JSON.stringify(s));
  await press(cdp, "y", { ctrl: true });
  s = await state();
  check("Ctrl+Y redoes", s.cells.C2?.val === "E3_ALPHA", JSON.stringify(s));
  await select("C2");
  await press(cdp, "x", { ctrl: true });
  await select("E2");
  await press(cdp, "v", { ctrl: true });
  s = await state();
  check("Ctrl+X and Ctrl+V move cell", (s.cells.C2?.val ?? "") === "" && s.cells.E2?.val === "E3_ALPHA", JSON.stringify(s));

  await select("A1");
  await press(cdp, "ArrowDown", { shift: true });
  await press(cdp, "d", { ctrl: true });
  s = await state();
  check("Ctrl+D fills selected range down", s.cells.A2?.val === "E3_ALPHA", JSON.stringify(s));

  await select("A6");
  await typeText(cdp, "CLEAR_ONE");
  await press(cdp, "Enter");
  await typeText(cdp, "CLEAR_TWO");
  await press(cdp, "Enter");
  await select("A6");
  await press(cdp, "ArrowDown", { shift: true });
  await press(cdp, "Delete");
  s = await state();
  check("Delete clears the full selected range", !s.cells.A6?.val && !s.cells.A7?.val, JSON.stringify(s));
  await select("A6");
  await press(cdp, "Backspace");
  s = await state();
  check("Backspace clears the active cell contents", !s.cells.A6?.val, JSON.stringify(s));

  await select("E10");
  await typeText(cdp, "4");
  await press(cdp, "Enter");
  await select("E10");
  await press(cdp, "ArrowRight", { shift: true });
  await press(cdp, "r", { ctrl: true });
  s = await state();
  check("Ctrl+R fills the selected range to the right", Number(s.cells.F10?.val) === 4, JSON.stringify(s));

  await select("A1");
  const dragPoints = await cdp.evaluate(`(() => {
    const a=document.querySelector('.vno-grid-cell[data-coord="A1"]')?.getBoundingClientRect();
    const b=document.querySelector('.vno-grid-cell[data-coord="B2"]')?.getBoundingClientRect();
    return a && b ? {x1:a.left+a.width/2,y1:a.top+a.height/2,x2:b.left+b.width/2,y2:b.top+b.height/2} : null;
  })()`);
  await mouseDrag(cdp, dragPoints.x1, dragPoints.y1, dragPoints.x2, dragPoints.y2);
  s = await state();
  check("mouse drag selects a rectangular range", s.range === "A1:B2", JSON.stringify(s));

  await select("D1");
  await typeText(cdp, "1");
  await press(cdp, "Enter");
  await typeText(cdp, "2");
  await press(cdp, "Enter");
  await select("D1");
  await press(cdp, "ArrowDown", { shift: true });
  const fillPoints = await cdp.evaluate(`(() => {
    const h=document.querySelector('.vno-grid-cell[data-coord="D2"] .vno-cell-autofill-handle')?.getBoundingClientRect();
    const t=document.querySelector('.vno-grid-cell[data-coord="D4"]')?.getBoundingClientRect();
    return h && t ? {x1:h.left+h.width/2,y1:h.top+h.height/2,x2:t.left+t.width/2,y2:t.top+t.height/2} : null;
  })()`);
  if (!fillPoints) throw new Error("Autofill handle or target cell is not visible.");
  await mouseDrag(cdp, fillPoints.x1, fillPoints.y1, fillPoints.x2, fillPoints.y2);
  s = await state();
  check("dragging fill handle continues a numeric series", Number(s.cells.D3?.val) === 3 && Number(s.cells.D4?.val) === 4, JSON.stringify(s));

  for (const [coord, value] of [["C1","N1"],["C2","N2"],["C3","N3"],["C4","N4"]]) {
    await select(coord);
    await typeText(cdp, value);
    await press(cdp, "Enter");
  }
  await select("D1");
  await press(cdp, "ArrowDown", { shift: true });
  const doubleFillPoints = await cdp.evaluate(`(() => {
    const h=document.querySelector('.vno-grid-cell[data-coord="D2"] .vno-cell-autofill-handle')?.getBoundingClientRect();
    return h ? {x:h.left+h.width/2,y:h.top+h.height/2} : null;
  })()`);
  if (!doubleFillPoints) throw new Error("Autofill handle for double-click was not visible.");
  await mouseDoubleClick(cdp, doubleFillPoints.x, doubleFillPoints.y);
  s = await state();
  check("double-clicking the fill handle fills alongside adjacent data", Number(s.cells.D3?.val) === 3 && Number(s.cells.D4?.val) === 4, JSON.stringify(s));

  await select("A1");
  const shiftClickPoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="A2"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseClick(cdp, shiftClickPoint.x, shiftClickPoint.y, { shift: true });
  s = await state();
  check("Shift+click extends from the active cell", s.range === "A1:A2", JSON.stringify(s));
  await select("A1");
  const ctrlClickPoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="C2"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseClick(cdp, ctrlClickPoint.x, ctrlClickPoint.y, { ctrl: true });
  s = await state();
  check("Ctrl+click adds a separate cell range", s.ranges.length === 2, JSON.stringify(s.ranges));

  await click(cdp, '.vno-col-header[data-col="C"]');
  s = await state();
  check("clicking a column header selects the full column", s.range === `C1:C${s.rowCount}`, s.range);
  await click(cdp, '.vno-row-header[data-row="5"]');
  s = await state();
  check("clicking a row header selects the full row", s.range === `A5:${s.maxCol}5`, s.range);

  await select("J1");
  await typeText(cdp, "LINE1");
  await press(cdp, "Enter", { alt: true });
  await typeText(cdp, "LINE2");
  await press(cdp, "Enter");
  s = await state();
  check("Alt+Enter inserts a newline inside a cell", s.cells.J1?.val === "LINE1\nLINE2", JSON.stringify(s.cells.J1));
  await select("K1");
  await typeText(cdp, "A_VERY_LONG_VALUE_FOR_AUTOFIT");
  await press(cdp, "Enter");
  s = await state();
  const originalKWidth = s.colKWidth;
  const colResizePoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-col-resizer[data-col="K"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseDoubleClick(cdp, colResizePoint.x, colResizePoint.y);
  s = await state();
  check("double-clicking a column edge auto-fits its width", s.colKWidth > originalKWidth, `${originalKWidth} -> ${s.colKWidth}`);
  const autofitKWidth = s.colKWidth;
  const colDragPoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-col-resizer[data-col="K"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseDrag(cdp, colDragPoint.x, colDragPoint.y, colDragPoint.x+35, colDragPoint.y);
  s = await state();
  check("dragging a column edge changes its width", s.colKWidth > autofitKWidth, `${autofitKWidth} -> ${s.colKWidth}`);
  const originalRowHeight = s.row1Height;
  const rowResizePoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-row-resizer[data-row="1"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseDoubleClick(cdp, rowResizePoint.x, rowResizePoint.y);
  s = await state();
  check("double-clicking a row edge auto-fits its height", s.row1Height >= originalRowHeight, `${originalRowHeight} -> ${s.row1Height}`);
  const autofitRowHeight = s.row1Height;
  const rowDragPoint = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-row-resizer[data-row="1"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseDrag(cdp, rowDragPoint.x, rowDragPoint.y, rowDragPoint.x, rowDragPoint.y+18);
  s = await state();
  check("dragging a row edge changes its height", s.row1Height > autofitRowHeight, `${autofitRowHeight} -> ${s.row1Height}`);
  const point = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="B2"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseRightClick(cdp, point.x, point.y);
  const menuText = await cdp.evaluate(`document.querySelector('.vno-sheet-context-menu')?.innerText || ""`);
  check("right-click opens cell context menu", menuText.includes("Ctrl+C") && menuText.includes("Ctrl+V"), menuText.replace(/\s+/g," ").trim());
  await press(cdp, "Escape");

  await select("A1");
  await press(cdp, "End", { ctrl: true });
  s = await state();
  check("Ctrl+End moves to the used-range bottom-right", s.coord === "K11", s.coord);
  await press(cdp, "F10", { shift: true });
  const keyboardMenuText = await cdp.evaluate(`document.querySelector('.vno-sheet-context-menu')?.innerText || ""`);
  check("Shift+F10 opens the keyboard context menu", keyboardMenuText.includes("Ctrl+C") && keyboardMenuText.includes("Ctrl+V"), keyboardMenuText.replace(/\s+/g," ").trim());
  await press(cdp, "Escape");
  await press(cdp, "v", { ctrl: true, alt: true });
  const pasteSpecialOpen = await cdp.evaluate("!!document.querySelector('.vno-paste-special-dialog')");
  check("Ctrl+Alt+V opens the Paste Special dialog", pasteSpecialOpen);
  await press(cdp, "Escape");

  await press(cdp, "F1");
  await cdp.waitFor("!!document.querySelector('#vno-help-panel:not([hidden])')");
  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('sheet.help.open', {entryId:'sheet.input.navigationFillClipboard'}))`);
  await sleep(400);
  const helpText = await cdp.evaluate("document.querySelector('.vno-help-article')?.innerText || ''");
  check("F1 Help contains concrete address-box, fill-command and clipboard guidance", ["Hộp tên", "Điền xuống", "Ctrl+Z", "Ctrl+V"].every(term => helpText.includes(term)), helpText.slice(0, 220).replace(/\s+/g," ").trim());

  await select("A1");
  await press(cdp, "a", { ctrl: true });
  s = await state();
  const ctrlARegion = s.range;
  await press(cdp, "a", { ctrl: true });
  s = await state();
  check("Ctrl+A selects the current region then the full sheet", ctrlARegion === "A1:A2" && s.range === `A1:${s.maxCol}${s.rowCount}`, `${ctrlARegion} -> ${s.range}`);

  const outputPath = path.join(process.env.VNO_CDP_LOCALAPPDATA, "e3-input-readback.xlsx");
  const saveResult = await cdp.evaluate(
    "(async () => { const [{globalUnoBridge}, {globalCommandBus}] = await Promise.all(["
    + "import('/adapters/libreoffice/common/uno-bridge.js'), import('/platform/commands/command-bus.js')]);"
    + "const original = globalUnoBridge.saveRealFile;"
    + "globalUnoBridge.saveRealFile = async (kind, content, format, name, source) => globalUnoBridge.saveRealFileInPlace(kind, content, "
    + JSON.stringify(outputPath) + ", source || " + JSON.stringify(outputPath) + ");"
    + "try { return await globalCommandBus.execute('common.file.saveAs'); }"
    + "finally { globalUnoBridge.saveRealFile = original; } })()",
    { timeoutMilliseconds: 180000 },
  );
  check("VN Sheet Save As writes an XLSX for Excel read-only verification", saveResult === true || saveResult?.status === "ok" || saveResult?.status === "success" || saveResult?.status === "saved", `${outputPath} ${JSON.stringify(saveResult)}`);

  const failed = checks.filter(item => !item.ok);
  console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL`);
  if (failed.length) process.exitCode = 1;
} finally {
  await session.close();
}
