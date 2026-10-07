import assert from "node:assert/strict";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function mockContainer() {
  return {
    style: {},
    className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    setAttribute() {},
    removeAttribute() {},
    dataset: {},
    innerHTML: ""
  };
}

export async function runSheetCopyPasteFormatTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("CommandBus common.edit.copy -> common.edit.paste preserves formatting attributes (bold, color, alignment, numberFormat)", async () => {
    const container = mockContainer();
    const grid = new SheetGridController(container, { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.attach();
    
    // Prepare A1 with value and formatting
    grid.selectCell("A", 1);
    grid.setCellValue("A", 1, "HelloBold");
    grid.setStyle("fontWeight", "bold");
    grid.setStyle("color", "#123456");
    grid.setStyle("textAlign", "center");
    grid.applyQuickNumberCategory("currency");

    const a1Before = grid.cellsData.get("A1");
    assert.equal(a1Before.val, "HelloBold");
    assert.equal(a1Before.style?.fontWeight, "bold");
    assert.equal(a1Before.style?.color, "#123456");
    assert.equal(a1Before.style?.textAlign, "center");
    assert.equal(a1Before.style?.numberFormat?.category, "currency");

    // Copy A1 via CommandBus
    const copyResult = await globalCommandBus.execute("common.edit.copy");
    assert.equal(copyResult, true, "common.edit.copy must return true");

    // Select C1 and Paste via CommandBus
    grid.selectCell("C", 1);
    const pasteResult = await globalCommandBus.execute("common.edit.paste");
    assert.equal(pasteResult, true, "common.edit.paste must return true");

    const c1Model = grid.cellsData.get("C1");
    assert.ok(c1Model, "Cell C1 must exist in cellsData");
    assert.equal(c1Model.val, "HelloBold", "C1 must have copied value");
    assert.equal(c1Model.style?.fontWeight, "bold", "C1 must retain fontWeight bold");
    assert.equal(c1Model.style?.color, "#123456", "C1 must retain color");
    assert.equal(c1Model.style?.textAlign, "center", "C1 must retain textAlign");
    assert.equal(c1Model.style?.numberFormat?.category, "currency", "C1 must retain numberFormat");
  });

  await test("CommandBus common.edit.cut -> common.edit.paste moves value and formatting attributes", async () => {
    const container = mockContainer();
    const grid = new SheetGridController(container, { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.attach();

    // Prepare B1 with value and bold
    grid.selectCell("B", 1);
    grid.setCellValue("B", 1, "CutVal");
    grid.setStyle("fontWeight", "bold");
    grid.setStyle("backgroundColor", "#ffff00");

    // Cut B1 via CommandBus
    await globalCommandBus.execute("common.edit.cut");

    // Select D1 and Paste
    grid.selectCell("D", 1);
    await globalCommandBus.execute("common.edit.paste");

    const b1After = grid.cellsData.get("B1");
    const d1After = grid.cellsData.get("D1");

    assert.equal(b1After?.val || "", "", "Source B1 value must be cleared on cut");
    assert.deepEqual(b1After?.style || {}, {}, "Source B1 formatting must be cleared on cut");
    assert.equal(d1After?.val, "CutVal", "Destination D1 must receive cut value");
    assert.equal(d1After?.style?.fontWeight, "bold", "Destination D1 must retain fontWeight bold");
    assert.equal(d1After?.style?.backgroundColor, "#ffff00", "Destination D1 must retain background color");
  });

  await test("CommandBus common.edit.pastePlain (Paste Values Only) pastes value only without copying formatting", async () => {
    const container = mockContainer();
    const grid = new SheetGridController(container, { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.attach();

    // Prepare A2 with value and formatting
    grid.selectCell("A", 2);
    grid.setCellValue("A", 2, "PlainVal");
    grid.setStyle("fontWeight", "bold");
    grid.setStyle("color", "#00ff00");

    // Copy A2
    await globalCommandBus.execute("common.edit.copy");

    // Select E2 and Paste Plain
    grid.selectCell("E", 2);
    await globalCommandBus.execute("common.edit.pastePlain");

    const e2Model = grid.cellsData.get("E2");
    assert.ok(e2Model, "Cell E2 must exist in cellsData");
    assert.equal(e2Model.val, "PlainVal", "E2 must receive value");
    assert.notEqual(e2Model.style?.fontWeight, "bold", "E2 must NOT copy fontWeight bold on pastePlain");
    assert.notEqual(e2Model.style?.color, "#00ff00", "E2 must NOT copy color on pastePlain");
  });

  await test("CommandBus copy/paste preserves a merged range through the app-local clipboard cache", async () => {
    const grid = new SheetGridController(mockContainer(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.attach();
    grid.setCellValue("A", 1, "Merged");
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };
    grid.selectedCoord = { c: "A", r: 1 };
    grid.mergedRangesBySheet[grid.activeSheet] = [{ start: { c: "A", r: 1 }, end: { c: "B", r: 2 } }];

    await globalCommandBus.execute("common.edit.copy");
    grid.selectCell("D", 3);
    await globalCommandBus.execute("common.edit.paste");

    assert.equal(grid.cellsData.get("D3")?.val, "Merged");
    assert.ok(grid.getMergedRanges().some(range => range.start.c === "D" && range.start.r === 3 && range.end.c === "E" && range.end.r === 4), "D3:E4 must remain merged");
  });

  await test("Internal clipboard model wins over echoed bridge HTML so formulas use the real source range", async () => {
    const grid = new SheetGridController(mockContainer(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    grid.setCellValue("A", 10, 2);
    grid.setCellValue("B", 10, "=A10*2");
    grid.selectionRange = { start: { c: "A", r: 10 }, end: { c: "B", r: 10 } };
    grid.selectedCoord = { c: "A", r: 10 };
    const payload = adapter._captureSelectedClipboard();
    adapter._rememberClipboard(payload, "copy");
    adapter._readClipboardData = async () => ({ status: "ok", text: payload.text, html: payload.html });

    grid.selectCell("D", 3);
    await adapter._pasteIntoSelectedCell();

    assert.equal(grid.cellsData.get("D3")?.val, 2);
    assert.equal(grid.cellsData.get("E3")?.formula, "=D3*2", "Formula must shift from A10:B10 to D3:E3, not from parsed HTML A1:B1");
  });

  return results;
}
