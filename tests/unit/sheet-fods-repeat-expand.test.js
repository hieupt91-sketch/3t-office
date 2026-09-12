/**
 * Unit Tests — VN Sheet parseFods() repeat expansion fix
 *
 * Reproduces the bug where parseFods() physically materializes every row/column
 * for large number-rows-repeated / number-columns-repeated values, causing:
 * - Extreme parse time (hang)
 * - Bloated cellsData Map (millions of entries)
 * - serializeToFods() crash with RangeError: Invalid string length
 *
 * Test MUST fail before the fix is applied.
 */

import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function makeEl(tag) {
  const el = {
    tagName: tag || "div", innerHTML: "", textContent: "", className: "", style: {},
    dataset: {}, _parent: null, _children: [],
    setAttribute(k, v) { this.dataset[k] = v; },
    getAttribute(k) { return this.dataset[k]; },
    appendChild(c) { c._parent = this; this._children.push(c); return c; },
    removeChild(c) { c._parent = null; this._children = this._children.filter(x => x !== c); return c; },
    insertBefore(c, ref) { c._parent = this; const i = this._children.indexOf(ref); if (i >= 0) this._children.splice(i, 0, c); else this._children.push(c); return c; },
    querySelector(sel) { return this._query(sel); },
    querySelectorAll(sel) { return this._queryAll(sel); },
    _query(sel) {
      if (sel.startsWith("#")) { const id = sel.slice(1); return this._walk(c => c.dataset?.id === id || c.id === id); }
      if (sel.startsWith(".")) { const cls = sel.slice(1); return this._walk(c => (c.className || "").split(" ").includes(cls)); }
      if (sel.startsWith("[")) { const m = sel.match(/\[(\w[\w-]*)=(["']?)(.+?)\2\]/); if (m) return this._walk(c => c.dataset?.[m[1]] === m[3]); }
      return null;
    },
    _queryAll(sel) { const r = []; this._walkAll(sel, r); return r; },
    _walk(pred) { for (const c of this._children) { if (pred(c)) return c; } for (const c of this._children) { const r = c._walk?.(pred); if (r) return r; } return null; },
    _walkAll(sel, acc) {
      for (const c of this._children) {
        if (sel === ".vno-grid-cell" && c.className?.includes?.("vno-grid-cell")) acc.push(c);
      }
      for (const c of this._children) c._walkAll?.(sel, acc);
    },
    addEventListener() {}, removeEventListener() {}, focus() {},
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); }, remove(c) { this._c.delete(c); },
      contains(c) { return this._c.has(c); },
      toggle(c, f) { if (f === undefined) { if (this._c.has(c)) this._c.delete(c); else this._c.add(c); } else if (f) this._c.add(c); else this._c.delete(c); }
    },
    get offsetParent() { return this; }, get offsetWidth() { return 100; }, get offsetHeight() { return 20; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 20 }; },
    contains() { return false; }, scrollIntoView() {}
  };
  return el;
}

function patchDocument() {
  if (typeof globalThis.document !== "undefined" && globalThis.document._patched) return;
  const doc = {
    _patched: true,
    addEventListener() {}, removeEventListener() {},
    createElement(tag) { return makeEl(tag); },
    createDocumentFragment() { return makeEl("fragment"); },
    activeElement: null,
    body: makeEl("body")
  };
  globalThis.document = doc;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
}
patchDocument();

/**
 * FODS fixture: 1 row with real data, then 1 row with huge repeats
 * (simulates the real-world pattern from DSS_Bao gia Dahua file)
 *
 * Row 1: A1="Ten", B1="Gia" (real data)
 * Row 2: A2="San pham A", B2=100 (real data)
 * Row 3: number-rows-repeated=500000, with 1 cell having number-columns-repeated=10000
 *         and office:value-type="string" (but no actual value — the "empty formatted cell" pattern)
 */
function makeRepeatFods(opts = {}) {
  const rowRepeat = opts.rowRepeat || 5000;
  const colRepeat = opts.colRepeat || 1000;
  const dataRows = opts.dataRows || 2;
  const hasValueType = opts.hasValueType !== false; // default true — the bug trigger

  let dataPart = "";
  for (let r = 1; r <= dataRows; r++) {
    dataPart += `
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Row${r}A"><text:p>Row${r}A</text:p></table:table-cell>
          <table:table-cell office:value-type="float" office:value="${r * 10}"><text:p>${r * 10}</text:p></table:table-cell>
        </table:table-row>`;
  }

  const valueTypeAttr = hasValueType ? ` office:value-type="string"` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
  office:version="1.3"
  office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body>
    <office:spreadsheet>
      <config:config-item-set config:name="ooo:settings">
        <config:config-item config:name="ActiveTable" config:type="string">Sheet1</config:config-item>
      </config:config-item-set>
      <table:table table:name="Sheet1">
        ${dataPart}
        <table:table-row table:number-rows-repeated="${rowRepeat}">
          <table:table-cell${valueTypeAttr} table:number-columns-repeated="${colRepeat}"/>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>`;
}

/**
 * FODS fixture with real data cells mixed into repeated region
 * (tests that real data is NOT lost during optimization)
 */
function makeRepeatFodsWithDataInRepeat() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
  office:version="1.3"
  office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body>
    <office:spreadsheet>
      <config:config-item-set config:name="ooo:settings">
        <config:config-item config:name="ActiveTable" config:type="string">Sheet1</config:config-item>
      </config:config-item-set>
      <table:table table:name="Sheet1">
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Header"><text:p>Header</text:p></table:table-cell>
        </table:table-row>
        <table:table-row table:number-rows-repeated="100">
          <table:table-cell office:value-type="string" table:number-columns-repeated="50"/>
        </table:table-row>
        <table:table-row table:number-rows-repeated="100000">
          <table:table-cell office:value-type="string" office:string-value="DeepData" table:number-columns-repeated="2"><text:p>DeepData</text:p></table:table-cell>
          <table:table-cell office:value-type="string" table:number-columns-repeated="10000"/>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>`;
}

export async function runSheetFodsRepeatExpandTests() {
  const results = [];
  function test(name, fn) {
    try { fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  }

  // ── MUST FAIL BEFORE FIX: Performance ──────────────────────────────

  test("parseFods: huge repeat completes in <5s (not hanging)", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    const fods = makeRepeatFods({ rowRepeat: 5000, colRepeat: 1000 });

    const start = Date.now();
    const result = adapter.loadFromFods(fods);
    const elapsed = Date.now() - start;

    if (!result) throw new Error("loadFromFods returned false");
    if (elapsed > 5000) throw new Error(`parseFods took ${elapsed}ms (>5000ms = likely hanging). Without fix, 5000 rows × 1000 cols = 5M iterations materialized.`);
  });

  test("parseFods: huge repeat does NOT create >10000 Map entries for empty formatted region", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    // 5000 rows × 1000 cols = 5 million potential cells, but all empty
    const fods = makeRepeatFods({ rowRepeat: 5000, colRepeat: 1000 });

    adapter.loadFromFods(fods);
    const data = grid.sheetsData["Sheet1"];

    // Should only contain the real data rows (row 1 + row 2 = 2 rows × 2 cells = 4 entries)
    // NOT 5000 × 1000 = 5 million
    if (data.size > 100) throw new Error(`cellsData.size = ${data.size} — bloated! Expected <100 for empty repeat region`);
  });

  test("parseFods: real data from first rows is preserved after repeat optimization", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(makeRepeatFods({ rowRepeat: 5000, colRepeat: 1000 }));

    const a1 = grid.sheetsData["Sheet1"].get("A1");
    const b1 = grid.sheetsData["Sheet1"].get("B1");
    const a2 = grid.sheetsData["Sheet1"].get("A2");
    const b2 = grid.sheetsData["Sheet1"].get("B2");

    if (!a1 || a1.val !== "Row1A") throw new Error(`A1 = ${JSON.stringify(a1)} — real data lost`);
    if (!b1 || b1.val !== 10) throw new Error(`B1 = ${JSON.stringify(b1)} — real data lost`);
    if (!a2 || a2.val !== "Row2A") throw new Error(`A2 = ${JSON.stringify(a2)} — real data lost`);
    if (!b2 || b2.val !== 20) throw new Error(`B2 = ${JSON.stringify(b2)} — real data lost`);
  });

  test("parseFods: real data inside repeated region is preserved (DeepData)", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(makeRepeatFodsWithDataInRepeat());

    const data = grid.sheetsData["Sheet1"];
    // Row 1: Header
    const a1 = data.get("A1");
    if (!a1 || a1.val !== "Header") throw new Error(`A1 lost: ${JSON.stringify(a1)}`);

    // The "DeepData" cells should appear at the start of the 100000-repeat block
    // Row 102 (1 header + 100 empty repeat rows = row 102)
    // Actually row 102: 1 header row + 100 repeat rows → the DeepData is at row 102
    let foundDeepData = false;
    for (const [coord, cell] of data.entries()) {
      if (cell && cell.val === "DeepData") { foundDeepData = true; break; }
    }
    if (!foundDeepData) throw new Error("DeepData cell inside repeated region was lost");
  });

  // ── MUST FAIL BEFORE FIX: serializeToFods round-trip ──────────────

  test("serializeToFods on sheet with large data map does not throw RangeError", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(makeRepeatFods({ rowRepeat: 5000, colRepeat: 1000 }));

    let threw = false;
    try {
      adapter.serializeToFods();
    } catch (e) {
      if (e instanceof RangeError) threw = true;
      else throw e;
    }
    if (threw) throw new Error("serializeToFods threw RangeError — data map is bloated from parse");
  });

  // ── MUST FAIL BEFORE FIX: No-value-type repeat is cheap ───────────

  test("parseFods: repeat without office:value-type is always cheap", () => {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];

    const adapter = new SheetAdapter(grid);
    const fods = makeRepeatFods({ rowRepeat: 100000, colRepeat: 16384, hasValueType: false });

    const start = Date.now();
    adapter.loadFromFods(fods);
    const elapsed = Date.now() - start;

    if (elapsed > 2000) throw new Error(`No-value-type repeat took ${elapsed}ms — should be instant`);
    if (grid.sheetsData["Sheet1"].size > 100) throw new Error(`No-value-type created ${grid.sheetsData["Sheet1"].size} entries`);
  });

  // ── Column repeat expansion: the bug that caused 16384 colWidths ────

  function makeColRepeatFods(opts = {}) {
    const colRepeat = opts.colRepeat || 16376;
    const customWidth = opts.customWidth || "3.5cm";
    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
  office:version="1.3"
  office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:body>
    <office:spreadsheet>
      <config:config-item-set config:name="ooo:settings">
        <config:config-item config:name="ActiveTable" config:type="string">Sheet1</config:config-item>
      </config:config-item-set>
      <style:style style:name="co_custom" style:family="table-column">
        <style:table-column-properties fo:break-before="auto" style:column-width="${customWidth}"/>
      </style:style>
      <table:table table:name="Sheet1">
        <table:table-column table:style-name="co_custom" table:number-columns-repeated="5"/>
        <table:table-column table:style-name="co_custom" table:number-columns-repeated="${colRepeat}"/>
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="A"><text:p>A</text:p></table:table-cell>
          <table:table-cell office:value-type="string" office:string-value="B"><text:p>B</text:p></table:table-cell>
          <table:table-cell office:value-type="string" office:string-value="C"><text:p>C</text:p></table:table-cell>
        </table:table-row>
        <table:table-row table:number-rows-repeated="100000">
          <table:table-cell office:value-type="string" table:number-columns-repeated="16384"/>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>`;
  }

  function makeGrid() {
    const grid = new Proxy({ sheets: [], activeSheet: "", sheetsData: {}, cellsData: new Map(), rowHeight: 26, defaultColWidth: 100, pageSetupBySheet: {}, rowHeightsBySheet: {}, colWidthsBySheet: {}, userHiddenRowsBySheet: {}, userHiddenColsBySheet: {}, commentsBySheet: {}, mergedRangesBySheet: {}, namedRangesBySheet: {}, printAreaBySheet: {}, conditionalFormattingBySheet: {}, dataValidationsBySheet: {}, imagesBySheet: {} }, {
      set(target, prop, value) { target[prop] = value; if (prop === "activeSheet" && target.sheetsData[value]) target.cellsData = target.sheetsData[value]; return true; }
    });
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet1"] = new Map();
    grid.cellsData = grid.sheetsData["Sheet1"];
    return grid;
  }

  test("column repeat: parseFods with 16376 repeated columns is fast and colWidths is small", () => {
    const grid = makeGrid();
    const adapter = new SheetAdapter(grid);
    const fods = makeColRepeatFods({ colRepeat: 16376 });

    const start = Date.now();
    adapter.loadFromFods(fods);
    const elapsed = Date.now() - start;

    if (!grid.sheetsData["Sheet1"]) throw new Error("loadFromFods failed");
    const cw = grid.colWidthsBySheet["Sheet1"];
    if (!cw) throw new Error("colWidthsBySheet missing");
    if (cw.size > 100) throw new Error(`colWidths.size = ${cw.size} — expected ≤100 for 5+1 used columns, got bloated from 16376 repeat`);
    if (elapsed > 5000) throw new Error(`parseFods took ${elapsed}ms — too slow for column repeat`);
  });

  test("column repeat: serializeToFods does not throw and round-trip preserves used-range widths", () => {
    const grid = makeGrid();
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(makeColRepeatFods({ colRepeat: 16376 }));

    let threw = false;
    try {
      adapter.serializeToFods();
    } catch (e) {
      if (e instanceof RangeError) threw = true;
      else throw e;
    }
    if (threw) throw new Error("serializeToFods threw RangeError on column repeat fixture");

    const cw = grid.colWidthsBySheet["Sheet1"];
    const defaultWidth = 100;
    const customWidth = cw.get("A");
    if (!Number.isFinite(customWidth)) throw new Error(`Column A width not set after round-trip: ${customWidth}`);
    if (customWidth === defaultWidth) throw new Error(`Column A width ${customWidth} equals default ${defaultWidth} — custom width not preserved`);
  });

  test("column repeat: cells beyond used range are not materialized", () => {
    const grid = makeGrid();
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(makeColRepeatFods({ colRepeat: 16376 }));

    const data = grid.sheetsData["Sheet1"];
    const a1 = data.get("A1");
    const b1 = data.get("B1");
    const c1 = data.get("C1");
    if (!a1 || a1.val !== "A") throw new Error(`A1 lost: ${JSON.stringify(a1)}`);
    if (!b1 || b1.val !== "B") throw new Error(`B1 lost: ${JSON.stringify(b1)}`);
    if (!c1 || c1.val !== "C") throw new Error(`C1 lost: ${JSON.stringify(c1)}`);

    if (data.size > 100) throw new Error(`cellsData.size = ${data.size} — expected ~3 real cells, bloated`);
  });

  return results;
}
