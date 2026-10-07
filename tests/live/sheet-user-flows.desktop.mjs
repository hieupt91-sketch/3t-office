import assert from "node:assert/strict";
import { launchApp } from "./cdp/session.mjs";
import { press } from "./cdp/actions.mjs";

const results = [];
const record = (name, actual) => {
  results.push({ name, status: "PASS", actual });
  console.log(`PASS ${name}: ${JSON.stringify(actual)}`);
};

const selectCell = (cdp, col, row) => cdp.evaluate(`(() => {
  const grid = window.__vnoAppInstance.grid;
  grid.selectCell(${JSON.stringify(col)}, ${row});
  grid.container.focus();
  return grid.getSelectionNameLabel();
})()`);

const readState = (cdp, addresses = []) => cdp.evaluate(`(() => {
  const grid = window.__vnoAppInstance.grid;
  return {
    cells: Object.fromEntries(${JSON.stringify(addresses)}.map(key => [key, structuredClone(grid.cellsData.get(key) || null)])),
    merges: structuredClone(grid.getMergedRanges()),
    widths: Object.fromEntries(["A","B","C","D","E","F","G","H","I"].map(col => [col, grid.getColumnWidth(col)])),
    undo: grid.undoStack.length,
    redo: grid.redoStack.length
  };
})()`);

async function verifyUndoRedo(cdp, address, expected, name) {
  await press(cdp, "z", { ctrl: true });
  const undone = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get(${JSON.stringify(address)})?.val ?? ""`);
  assert.equal(undone, "", `${name}: Ctrl+Z must remove the pasted matrix in one step`);
  await press(cdp, "y", { ctrl: true });
  const redone = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get(${JSON.stringify(address)})?.val ?? ""`);
  assert.equal(redone, expected, `${name}: Ctrl+Y must restore the pasted matrix`);
}

async function runSheetMatrix() {
  const session = await launchApp("sheet");
  const { cdp } = session;
  console.log(`APP_PID=${session.child.pid}`);
  try {
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.grid;
      const seed = (address, cell) => grid.cellsData.set(address, structuredClone(cell));
      seed("A1", { val: 12, formula: "", style: { fontWeight: "bold", border: "2px solid #123456", numberFormat: { category: "number", decimals: 0 } } });
      seed("B1", { val: 24, formula: "=A1*2", style: { backgroundColor: "#ffeeaa" } });
      seed("C1", { val: 45230, formula: "", style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } } });
      seed("A2", { val: 25000000, formula: "", style: { numberFormat: { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true } } });
      seed("B2", { val: "Gộp", formula: "", style: { textAlign: "center" } });
      seed("C2", { val: "", formula: "", style: {} });
      grid.mergedRangesBySheet[grid.activeSheet] = [{ start: { c: "B", r: 2 }, end: { c: "C", r: 2 } }];
      grid.setColumnWidths(111, ["A"], false);
      grid.setColumnWidths(144, ["B"], false);
      grid.setColumnWidths(177, ["C"], false);
      grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "C", r: 2 } };
      grid.selectedCoord = { c: "A", r: 1 };
      grid.container.focus();
    })()`);

    await press(cdp, "c", { ctrl: true });
    await selectCell(cdp, "E", 1);
    await press(cdp, "v", { ctrl: true });
    const copied = await readState(cdp, ["E1", "F1", "G1", "E2", "F2", "G2"]);
    assert.equal(copied.cells.E1.val, 12);
    assert.equal(copied.cells.E1.style.fontWeight, "bold");
    assert.equal(copied.cells.E1.style.border, "2px solid #123456");
    assert.equal(copied.cells.E1.style.numberFormat.category, "number");
    assert.equal(copied.cells.F1.formula, "=E1*2");
    assert.equal(copied.cells.F1.val, 24);
    assert.equal(copied.cells.F1.style.backgroundColor, "#ffeeaa");
    assert.equal(copied.cells.G1.style.numberFormat.category, "date");
    assert.equal(copied.cells.E2.style.numberFormat.category, "currency");
    assert.ok(copied.merges.some(range => range.start.c === "F" && range.start.r === 2 && range.end.c === "G" && range.end.r === 2));
    assert.deepEqual([copied.widths.E, copied.widths.F, copied.widths.G], [111, 144, 177]);
    await verifyUndoRedo(cdp, "E1", 12, "Copy in Sheet");
    const copyRedo = await readState(cdp, ["E1", "F1", "G1", "E2", "F2", "G2"]);
    assert.deepEqual([copyRedo.widths.E, copyRedo.widths.F, copyRedo.widths.G], [111, 144, 177]);
    record("Copy in Sheet: values/formula/number/date/VND/bold/background/border/merge/column width + Undo/Redo", copyRedo);

    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.grid;
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) {
        const src = String.fromCharCode(64 + c) + r;
        const dst = String.fromCharCode(64 + c) + (r + 5);
        grid.cellsData.set(dst, structuredClone(grid.cellsData.get(src)));
      }
      grid.cellsData.get("B6").formula = "=A6*2";
      grid.mergedRangesBySheet[grid.activeSheet].push({ start: { c: "B", r: 7 }, end: { c: "C", r: 7 } });
      grid.selectionRange = { start: { c: "A", r: 6 }, end: { c: "C", r: 7 } };
      grid.selectedCoord = { c: "A", r: 6 };
      grid.container.focus();
    })()`);
    await press(cdp, "x", { ctrl: true });
    await selectCell(cdp, "E", 6);
    await press(cdp, "v", { ctrl: true });
    const cut = await readState(cdp, ["A6", "B6", "C6", "A7", "B7", "C7", "E6", "F6", "G6", "E7", "F7", "G7"]);
    assert.equal(cut.cells.A6.val, "");
    assert.deepEqual(cut.cells.A6.style, {});
    assert.equal(cut.cells.E6.val, 12);
    assert.equal(cut.cells.F6.formula, "=E6*2");
    assert.ok(cut.merges.some(range => range.start.c === "F" && range.start.r === 7 && range.end.c === "G" && range.end.r === 7));
    await press(cdp, "z", { ctrl: true });
    assert.equal((await readState(cdp, ["A6", "E6"])).cells.A6.val, 12);
    assert.equal((await readState(cdp, ["A6", "E6"])).cells.E6?.val ?? "", "");
    await press(cdp, "y", { ctrl: true });
    assert.equal((await readState(cdp, ["E6"])).cells.E6.val, 12);
    record("Cut in Sheet: matrix moved, source cleared, formula shifted, merge + Undo/Redo", cut);

    await selectCell(cdp, "E", 11);
    await press(cdp, "v", { ctrl: true, shift: true });
    const valuesOnly = await readState(cdp, ["E11", "F11", "G11", "E12", "F12", "G12"]);
    assert.equal(valuesOnly.cells.E11.val, 12);
    assert.equal(valuesOnly.cells.F11.formula, "");
    assert.equal(valuesOnly.cells.F11.val, 24);
    assert.deepEqual(valuesOnly.cells.E11.style, {});
    assert.ok(!valuesOnly.merges.some(range => range.start.c === "F" && range.start.r === 12));
    await verifyUndoRedo(cdp, "E11", 12, "Paste values only");
    record("Ctrl+Shift+V: values only, no formula/style/merge + Undo/Redo", valuesOnly);

    const excelHtml = `<html><style>
      .xlValue { font-weight:bold; border:2px solid #225588; }
      .xlFormula { background-color:#ddeeff; }
      .xlDate { mso-number-format:'dd/mm/yyyy'; }
      .xlVnd { mso-number-format:'#,##0 ₫'; color:#116611; }
    </style><table><colgroup><col width="123"><col width="156"><col width="189"></colgroup>
      <tr><td class="xlValue" x:num="7">7</td><td class="xlFormula" x:num="14" x:f="=A1*2">14</td><td class="xlDate" x:num="45230">01/11/2023</td></tr>
      <tr><td class="xlVnd" x:num="25000000">25.000.000 ₫</td><td colspan="2" style="text-align:center;border:1px solid #000">Excel merge</td></tr>
    </table></html>`;
    const excelText = "7\t14\t01/11/2023\n25.000.000 ₫\tExcel merge\t";
    assert.equal((await cdp.evaluate(`globalThis.globalUnoBridge.writeClipboardData(${JSON.stringify({ text: excelText, html: excelHtml })})`))?.status, "ok");
    await selectCell(cdp, "E", 16);
    await press(cdp, "v", { ctrl: true });
    const excel = await readState(cdp, ["E16", "F16", "G16", "E17", "F17", "G17"]);
    assert.equal(excel.cells.E16.val, 7);
    assert.equal(excel.cells.E16.style.fontWeight, "bold");
    assert.ok(excel.cells.E16.style.border || excel.cells.E16.style.borderTop);
    assert.equal(excel.cells.F16.formula, "=E16*2");
    assert.equal(excel.cells.F16.style.backgroundColor, "#ddeeff");
    assert.equal(excel.cells.G16.style.numberFormat.category, "date");
    assert.equal(excel.cells.E17.style.numberFormat.category, "currency");
    assert.ok(excel.merges.some(range => range.start.c === "F" && range.start.r === 17 && range.end.c === "G" && range.end.r === 17));
    assert.deepEqual([excel.widths.E, excel.widths.F, excel.widths.G], [123, 156, 189]);
    await verifyUndoRedo(cdp, "E16", 7, "Paste from Excel HTML");
    record("Paste from Excel: full matrix + Undo/Redo", excel);

    const webHtml = `<table><tr><td style="font-weight:bold;border:1px solid #444;background:#def">Web</td><td>42</td></tr></table>`;
    assert.equal((await cdp.evaluate(`globalThis.globalUnoBridge.writeClipboardData(${JSON.stringify({ text: "Web\t42", html: webHtml })})`))?.status, "ok");
    await selectCell(cdp, "E", 21);
    await press(cdp, "v", { ctrl: true });
    const web = await readState(cdp, ["E21", "F21"]);
    assert.equal(web.cells.E21.val, "Web");
    assert.equal(web.cells.E21.style.fontWeight, "bold");
    assert.equal(web.cells.E21.style.backgroundColor, "#def");
    assert.equal(web.cells.F21.val, 42);
    await verifyUndoRedo(cdp, "E21", "Web", "Paste from web table");
    record("Paste from web table: matrix/style + Undo/Redo", web);
  } finally {
    const pid = session.child.pid;
    await session.close();
    console.log(`APP_PID_CLOSED=${pid}:${session.child.exitCode !== null || session.child.signalCode !== null}`);
  }
}

await runSheetMatrix();

async function copyFromApp(app, setupExpression) {
  const session = await launchApp(app);
  console.log(`APP_PID=${session.child.pid}`);
  try {
    await session.cdp.evaluate(setupExpression);
    await session.cdp.evaluate(`window.globalCommandBus.execute("common.edit.copy")`);
    await press(session.cdp, "c", { ctrl: true });
    const clipboard = await session.cdp.evaluate(`globalThis.globalUnoBridge.readClipboardData()`);
    assert.equal(clipboard?.status, "ok");
    assert.ok(clipboard.text);
    return { text: clipboard.text, htmlLength: clipboard.html?.length || 0 };
  } finally {
    const pid = session.child.pid;
    await session.close();
    console.log(`APP_PID_CLOSED=${pid}:${session.child.exitCode !== null || session.child.signalCode !== null}`);
  }
}

async function pasteCrossAppRow(sourceName, expected, clipboardProof) {
  const session = await launchApp("sheet");
  console.log(`APP_PID=${session.child.pid}`);
  try {
    await selectCell(session.cdp, "B", 2);
    await press(session.cdp, "v", { ctrl: true });
    const pasted = await readState(session.cdp, ["B2", "C2", "B3", "C3"]);
    expected(pasted);
    const firstValue = pasted.cells.B2.val;
    await verifyUndoRedo(session.cdp, "B2", firstValue, `Paste from ${sourceName}`);
    record(`Paste from ${sourceName}: cross-app clipboard + Undo/Redo`, { clipboardProof, pasted });
  } finally {
    const pid = session.child.pid;
    await session.close();
    console.log(`APP_PID_CLOSED=${pid}:${session.child.exitCode !== null || session.child.signalCode !== null}`);
  }
}

const docClipboard = await copyFromApp("writer", `(() => {
  const body = document.querySelector(".vno-writer-body");
  body.innerHTML = '<table id="sc2-doc-table"><tr><td style="font-weight:bold;background-color:#ddeeff;border:1px solid #123456">Doc</td><td>42</td></tr><tr><td>Ngày</td><td>01/11/2023</td></tr></table>';
  const table = document.getElementById("sc2-doc-table");
  const range = document.createRange();
  range.selectNode(table);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  body.focus();
})()`);
await pasteCrossAppRow("Doc", pasted => {
  assert.equal(pasted.cells.B2.val, "Doc");
  assert.equal(pasted.cells.B2.style.fontWeight, "bold");
  assert.equal(pasted.cells.B2.style.backgroundColor, "#ddeeff");
  assert.ok(pasted.cells.B2.style.border || pasted.cells.B2.style.borderTop);
  assert.equal(pasted.cells.C2.val, 42);
  assert.equal(pasted.cells.C3.style.numberFormat.category, "date");
}, docClipboard);

const slideClipboard = await copyFromApp("slides", `(() => {
  const host = document.querySelector(".vno-slide-body") || document.querySelector(".vno-slide-title");
  host.innerHTML = '<table id="sc2-slide-table"><tr><td style="font-weight:bold;background-color:#ffe7a3;border:1px solid #654321">Slide</td><td>84</td></tr></table>';
  const table = document.getElementById("sc2-slide-table");
  const range = document.createRange();
  range.selectNode(table);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  host.focus();
})()`);
await pasteCrossAppRow("Slide", pasted => {
  assert.equal(pasted.cells.B2.val, "Slide");
  assert.equal(pasted.cells.B2.style.fontWeight, "bold");
  assert.ok(["#ffe7a3", "rgb(255, 231, 163)"].includes(pasted.cells.B2.style.backgroundColor));
  assert.ok(pasted.cells.B2.style.border || pasted.cells.B2.style.borderTop);
  assert.equal(pasted.cells.C2.val, 84);
}, slideClipboard);

console.log(JSON.stringify({ total: results.length, results }, null, 2));
