import { launchApp } from "./session.mjs";
import { click, mouseRightClick, press, typeText, sleep } from "./actions.mjs";

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
  const cells = Object.fromEntries(["A1","A2","B2","C2"].map(key => [key, grid.cellsData.get(key) || null]));
  const coord = grid.selectedCoord;
  const range = grid.selectionRange;
  return { coord: String(coord.c)+String(coord.r), range: String(range.start.c)+String(range.start.r)+":"+String(range.end.c)+String(range.end.r), cells,
    edit: !!grid.formulaEntry, input: grid.formulaInput?.value, undo: grid.undoStack.length, redo: grid.redoStack.length };
})()`);
const select = coord => click(cdp, `.vno-grid-cell[data-coord="${coord}"]`);

try {
  await sleep(700);
  await select("A1");
  await typeText(cdp, "E3_ALPHA");
  await press(cdp, "Enter");
  let s = await state();
  check("direct entry and Enter move down", s.cells.A1?.val === "E3_ALPHA" && s.coord === "A2", JSON.stringify(s));
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
  await press(cdp, "Home", { ctrl: true });
  s = await state();
  check("Ctrl+Home selects A1", s.coord === "A1", JSON.stringify(s));

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

  await select("A1");
  await press(cdp, "ArrowDown", { shift: true });
  await press(cdp, "d", { ctrl: true });
  s = await state();
  check("Ctrl+D fills selected range down", s.cells.A2?.val === "E3_ALPHA", JSON.stringify(s));

  const point = await cdp.evaluate(`(() => { const e=document.querySelector('.vno-grid-cell[data-coord="B2"]'); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  await mouseRightClick(cdp, point.x, point.y);
  const menuText = await cdp.evaluate(`document.querySelector('.vno-sheet-context-menu')?.innerText || ""`);
  check("right-click opens cell context menu", menuText.includes("Ctrl+C") && menuText.includes("Ctrl+V"), menuText.replace(/\s+/g," ").trim());
  await press(cdp, "Escape");

  const failed = checks.filter(item => !item.ok);
  console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL`);
  if (failed.length) process.exitCode = 1;
} finally {
  await session.close();
}