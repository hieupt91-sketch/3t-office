/**
 * Integration Tests — VN Sheet: loadFromFods after isBlank MUST populate data
 *
 * Verifies the data layer and DOM rendering after loadFromFods on an isBlank grid.
 * Uses a minimal DOM mock sufficient for mount() + loadFromFods rendering.
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
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
        if (sel === ".vno-sheet-tab-item" && c.className?.includes?.("vno-sheet-tab-item")) acc.push(c);
        if (sel.startsWith("[") && sel.includes("is-selected") && c.classList?.contains?.("is-selected")) acc.push(c);
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
const FODS = `<?xml version="1.0" encoding="UTF-8"?>
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
        <config:config-item config:name="ActiveTable" config:type="string">Doanh thu</config:config-item>
      </config:config-item-set>
      <table:table table:name="Doanh thu">
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="San pham"><text:p>San pham</text:p></table:table-cell>
          <table:table-cell office:value-type="string" office:string-value="So lieu"><text:p>So lieu</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Thang 7"><text:p>Thang 7</text:p></table:table-cell>
          <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
        </table:table-row>
      </table:table>
      <table:table table:name="Chi phi">
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Khoan muc"><text:p>Khoan muc</text:p></table:table-cell>
          <table:table-cell office:value-type="string" office:string-value="So tien"><text:p>So tien</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="string" office:string-value="Van phong pham"><text:p>Van phong pham</text:p></table:table-cell>
          <table:table-cell office:value-type="float" office:value="1250000"><text:p>1250000</text:p></table:table-cell>
        </table:table>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>`;

export async function runSheetLoadFodsBlankTests() {
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;
  patchDocument();
  const results = [];
  function test(name, fn) {
    try { fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  }

  test("loadFromFods trên grid isBlank: cellsData phải có dữ liệu thật", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    const result = adapter.loadFromFods(FODS);
    if (!result) throw new Error("loadFromFods trả về false");
    if (grid.cellsData.size === 0) throw new Error("cellsData.size === 0");
  });

  test("loadFromFods trên grid isBlank: ô A1 = 'San pham'", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    const cell = grid.cellsData.get("A1");
    if (!cell) throw new Error("A1 undefined");
    if (cell.val !== "San pham") throw new Error(`A1.val = "${cell.val}"`);
  });

  test("loadFromFods trên grid isBlank: activeSheet = 'Doanh thu'", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    if (grid.activeSheet !== "Doanh thu") throw new Error(`activeSheet = "${grid.activeSheet}"`);
  });

  test("loadFromFods trên grid isBlank: sheets chứa cả 2 sheet thật", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    if (!grid.sheets.includes("Doanh thu")) throw new Error(`sheets: ${grid.sheets}`);
    if (!grid.sheets.includes("Chi phi")) throw new Error(`sheets: ${grid.sheets}`);
  });

  test("loadFromFods trên grid isBlank: không còn sheet mặc định cũ", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    if (grid.sheetsData["Dự toán chi phí"]) throw new Error("vẫn còn 'Dự toán chi phí'");
    if (grid.sheetsData["Kế hoạch Q3"]) throw new Error("vẫn còn 'Kế hoạch Q3'");
  });

  test("loadFromFods trên grid isBlank: switchSheet → data đúng", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    grid.switchSheet("Chi phi");
    const cell = grid.cellsData.get("A1");
    if (!cell) throw new Error("Chi phi: A1 undefined");
    if (cell.val !== "Khoan muc") throw new Error(`Chi phi: A1.val = "${cell.val}"`);
  });

  test("loadFromFods trên grid isBlank: B2 = 120 (number)", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    const cell = grid.cellsData.get("B2");
    if (!cell) throw new Error("B2 undefined");
    if (cell.val !== 120) throw new Error(`B2.val = "${cell.val}"`);
  });

  test("loadFromFods trên grid isBlank: cellsData getter trả Map đúng sheet", () => {
    const grid = new SheetGridController(makeEl(), { isBlank: true });
    const adapter = new SheetAdapter(grid);
    adapter.loadFromFods(FODS);
    const data = grid.cellsData;
    if (!(data instanceof Map)) throw new Error("cellsData không phải Map");
    if (data.size === 0) throw new Error("cellsData rỗng");
    if (data.get("A1")?.val !== "San pham") throw new Error("cellsData trả sai Map");
  });

  globalThis.document = originalDocument;
  globalThis.MutationObserver = originalMutationObserver;
  return results;
}
