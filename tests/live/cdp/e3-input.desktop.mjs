import { launchApp } from "./session.mjs";
import { click, mouseDrag, mouseRightClick, press, typeText, sleep } from "./actions.mjs";

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
  const cells = Object.fromEntries(["A1","A2","B2","C2","E2","E8","F8","A6","A7","D3","D4","F1","G1","G2","G3","A4","B4","H4","A10","A11","E10","F10"].map(key => [key, grid.cellsData.get(key) || null]));
  const coord = grid.selectedCoord;
  const range = grid.selectionRange;
  return { coord: String(coord.c)+String(coord.r), range: String(range.start.c)+String(range.start.r)+":"+String(range.end.c)+String(range.end.r), cells, rowCount: grid.rowCount, maxCol: grid.cols.at(-1),
    edit: !!grid.formulaEntry, input: grid.formulaInput?.value, undo: grid.undoStack.length, redo: grid.redoStack.length };
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
  check("Ctrl+Shift+semicolon inserts a time", s.cells.F8?.style?.numberFormat?.category === "time", JSON.stringify(s.cells.F8));

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

  const point = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="B2"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseRightClick(cdp, point.x, point.y);
  const menuText = await cdp.evaluate(`document.querySelector('.vno-sheet-context-menu')?.innerText || ""`);
  check("right-click opens cell context menu", menuText.includes("Ctrl+C") && menuText.includes("Ctrl+V"), menuText.replace(/\s+/g," ").trim());
  await press(cdp, "Escape");

  await press(cdp, "F1");
  await cdp.waitFor("!!document.querySelector('#vno-help-panel:not([hidden])')");
  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('sheet.help.open', {entryId:'sheet.input.navigationFillClipboard'}))`);
  await sleep(400);
  const helpText = await cdp.evaluate("document.querySelector('.vno-help-article')?.innerText || ''");
  check("F1 Help contains concrete grid navigation, fill and clipboard guidance", ["Ctrl+G", "Ctrl+D", "Ctrl+Z", "Ctrl+V"].every(term => helpText.includes(term)), helpText.slice(0, 220).replace(/\s+/g," ").trim());

  await select("A1");
  await press(cdp, "a", { ctrl: true });
  s = await state();
  const ctrlARegion = s.range;
  await press(cdp, "a", { ctrl: true });
  s = await state();
  check("Ctrl+A selects the current region then the full sheet", ctrlARegion === "A1:A2" && s.range === `A1:${s.maxCol}${s.rowCount}`, `${ctrlARegion} -> ${s.range}`);

  const failed = checks.filter(item => !item.ok);
  console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL`);
  if (failed.length) process.exitCode = 1;
} finally {
  await session.close();
}
