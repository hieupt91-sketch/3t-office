/**
 * VN Office — Unit & Behavioral Tests for Sheet Print Preview
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { t } from "../../platform/i18n/i18n.js";

const container = () => ({ querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } });
const assert = (value, message) => { if (!value) throw new Error(message); };
const put = (grid, coord, val) => grid.cellsData.set(coord, { val, formula: "", style: {} });

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
  toggle(name, force) {
    const items = this._items();
    const has = items.has(name);
    const shouldHave = force === undefined ? !has : force;
    if (shouldHave) items.add(name); else items.delete(name);
    this.owner.className = [...items].join(" ");
  }
  contains(name) { return this._items().has(name); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this._textContent = "";
    this._innerHTML = "";
    this.style = {};
    this.disabled = false;
    this.value = "";
  }
  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(val) { this._textContent = String(val); this._innerHTML = String(val); this.children = []; }
  get innerHTML() { return this.children.length > 0 ? this.children.map(c => c.outerHTML || "").join("\n") : this._innerHTML; }
  set innerHTML(val) { this._innerHTML = String(val); this._parseChildHtml(this._innerHTML); }
  _parseChildHtml(html) {
    this.children = [];
    if (!html || typeof html !== "string") return;
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9\-]+)([^>]*)\/>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1] || match[4];
      const rawAttrs = match[2] || match[5] || "";
      const innerContent = match[3] || "";
      const child = new FakeElement(tagName);
      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
      if (idMatch) child.setAttribute("id", idMatch[1]);
      if (/disabled\b/i.test(rawAttrs)) child.disabled = true;
      child.innerHTML = innerContent;
      child.parentNode = this;
      this.children.push(child);
    }
  }
  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const classStr = this.className ? ` class="${this.className}"` : "";
    return `<${tag}${classStr}>${this.innerHTML}</${tag}>`;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  dispatchEvent(event) { (this.listeners[event.type] || []).forEach(h => h(event)); }
  click() { this.dispatchEvent({ type: "click", target: this, stopPropagation() {}, preventDefault() {} }); }
  contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
  _matches(selector) {
    if (!selector) return false;
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector.startsWith("#")) return this.attributes.id === selector.slice(1);
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  focus() {}
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  querySelector(selector) { return selector === "body" ? this.body : this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
  get activeElement() { return this.body; }
}

export async function runSheetPrintPreviewTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  // ---------- Phần 1: computePrintPages() — logic phân trang thuần, không cần document ----------

  await test("sheet.file.printPreview: lệnh chuẩn trong SHEET_COMMANDS + mapping .uno:PrintPreview + i18n VI/EN", () => {
    const def = SHEET_COMMANDS.find(c => c.id === "sheet.file.printPreview");
    assert(def, "Thiếu lệnh sheet.file.printPreview");
    assert(def.category === "file", `Category sai: ${def.category}`);
    assert(def.shortcut === "Ctrl+F2", `Shortcut sai: ${def.shortcut}`);
    assert(def.icon === "printPreview", `Icon sai: ${def.icon}`);
    assert(mapVnCommandToUno("sheet.file.printPreview") === ".uno:PrintPreview", "Thiếu mapping UNO thật");
    assert(t("commands.sheet.file.printPreview.label", "vi") !== undefined, "i18n VI phải resolve được (không throw)");
  });

  await test("sheet.file.printPreview: có mặt trong ribbon tab Chế độ xem, nhóm Chế độ xem bảng tính", () => {
    const viewTab = SHEET_RIBBON_TABS.find(tab => tab.id === "view");
    assert(viewTab, "Không tìm thấy tab view");
    const group = viewTab.groups.find(g => g.id === "workbookViews");
    assert(group, "Không tìm thấy nhóm workbookViews");
    assert(group.items.some(item => item.commandId === "sheet.file.printPreview"), "Thiếu nút sheet.file.printPreview trong nhóm");
  });

  await test("sheet.file.printPreview: lệnh xem trước dùng cùng luồng PDF để đếm trang và in", async () => {
    const adapter = new SheetAdapter(new SheetGridController(container()));
    let printCalls = 0;
    adapter.print = () => { printCalls += 1; return true; };
    adapter.attach();
    await globalCommandBus.execute("sheet.file.printPreview");
    const handled = await adapter.handleDispatch(".uno:PrintPreview", null, "sheet.file.printPreview");
    assert(handled === true, "UNO PrintPreview phải được xử lý");
    assert(printCalls === 2, `Ribbon và UNO phải mở cùng luồng xem PDF/in, nhận ${printCalls} lần gọi`);
  });

  await test("computePrintPages: vùng nhỏ vừa 1 trang A4 dọc mặc định", () => {
    const grid = new SheetGridController(container());
    put(grid, "A1", "x"); put(grid, "C5", "y");
    grid.printAreaBySheet[grid.activeSheet] = "A1:C5";
    const result = grid.computePrintPages();
    assert(result.totalPages === 1, `Mong 1 trang, nhận ${result.totalPages}`);
    assert(result.pageWidthPx === 794 && result.pageHeightPx === 1123, `Kích thước A4 px sai: ${result.pageWidthPx}x${result.pageHeightPx}`);
    assert(result.scale === 1, "Mặc định scale phải là 100%");
    const page = result.pages[0];
    assert(page.rowNums.join(",") === "1,2,3,4,5", `rowNums sai: ${page.rowNums}`);
    assert(page.colNums.join(",") === "1,2,3", `colNums sai: ${page.colNums}`);
  });

  await test("computePrintPages: khổ Letter Ngang hoán đổi đúng rộng/cao (không cố định A4)", () => {
    const grid = new SheetGridController(container());
    grid.setPageSetup({ size: "letter", orientation: "landscape" });
    grid.printAreaBySheet[grid.activeSheet] = "A1:A1";
    const result = grid.computePrintPages();
    assert(result.pageWidthPx > result.pageHeightPx, "Ngang phải rộng hơn cao");
    assert(result.sizeKey === "letter", `sizeKey sai: ${result.sizeKey}`);
  });

  await test("computePrintPages: vượt chiều cao in tạo nhiều trang, không mất/lặp hàng nào", () => {
    const grid = new SheetGridController(container());
    for (let r = 1; r <= 80; r++) put(grid, `A${r}`, r);
    grid.printAreaBySheet[grid.activeSheet] = "A1:A80";
    const result = grid.computePrintPages();
    const rowsPerPage = Math.floor(result.printableHeightPx / grid.rowHeight);
    const expectedPages = Math.ceil(80 / rowsPerPage);
    assert(result.totalPages === expectedPages, `Mong ${expectedPages} trang, nhận ${result.totalPages}`);
    const allRows = result.pages.flatMap(p => p.rowNums);
    assert(allRows.length === 80, `Tổng số hàng qua các trang sai: ${allRows.length}`);
    assert(new Set(allRows).size === 80, "Có hàng bị lặp giữa các trang");
    assert(result.pages[0].rowNums[0] === 1, "Trang đầu phải bắt đầu từ hàng 1");
    assert(result.pages[result.pages.length - 1].rowNums.at(-1) === 80, "Trang cuối phải kết thúc ở hàng 80");
  });

  await test("computePrintPages: 26 cột (A:Z) vượt chiều rộng in tạo nhiều trang theo thứ tự 'Xuống, rồi qua'", () => {
    const grid = new SheetGridController(container());
    grid.printAreaBySheet[grid.activeSheet] = "A1:Z1";
    const result = grid.computePrintPages();
    assert(result.totalPages > 1, "26 cột mặc định 100px/cột phải vượt 1 trang A4 dọc");
    const allCols = result.pages.flatMap(p => p.colNums);
    assert(allCols.length === 26, `Tổng số cột qua các trang sai: ${allCols.length}`);
    assert(new Set(allCols).size === 26, "Có cột bị lặp giữa các trang");
    assert(result.pages[0].colNums[0] === 1, "Trang đầu phải bắt đầu từ cột A (1)");
  });

  await test("computePrintPages: Vừa trong 1 trang ngang (Fit to 1 page wide) gộp 26 cột về đúng 1 trang", () => {
    const grid = new SheetGridController(container());
    grid.printAreaBySheet[grid.activeSheet] = "A1:Z1";
    const before = grid.computePrintPages();
    assert(before.totalPages > 1, "Tiền đề: phải >1 trang khi chưa bật Fit to Page");
    const applied = grid.setPageSetup({ scale: { mode: "pages", pagesWide: 1, pagesTall: 0 } });
    assert(applied !== false, "setPageSetup(scale pages) bị từ chối");
    const after = grid.computePrintPages();
    assert(after.totalPages === 1, `Fit to 1 page wide phải gộp về 1 trang, nhận ${after.totalPages}`);
    assert(after.scale < 1, `Tỷ lệ phải nhỏ hơn 100% để nhồi vừa, nhận ${after.scale}`);
    assert(after.pages[0].colNums.length === 26, "Trang duy nhất phải chứa đủ 26 cột");
  });

  await test("computePrintPages: Hàng lặp lại (Print Titles) xuất hiện đầu mỗi trang, không tính trùng vào phần thân", () => {
    const grid = new SheetGridController(container());
    for (let r = 1; r <= 10; r++) put(grid, `A${r}`, r);
    grid.printAreaBySheet[grid.activeSheet] = "A1:B10";
    grid.setPageSetup({ printTitles: { rows: "1" } });
    const result = grid.computePrintPages();
    const page = result.pages[0];
    assert(page.titleRowCount === 1, `titleRowCount sai: ${page.titleRowCount}`);
    assert(page.rowNums[0] === 1, "Hàng tiêu đề phải luôn ở đầu trang");
    assert(page.rowNums.filter(r => r === 1).length === 1, "Hàng tiêu đề không được lặp lại trong cùng 1 trang");
    assert(page.rowNums.join(",") === Array.from({ length: 10 }, (_, i) => i + 1).join(","), "Thiếu/thừa hàng thân");
  });

  await test("computePrintPages: Cột lặp lại (Print Titles cols) hoạt động tương tự cho cột", () => {
    const grid = new SheetGridController(container());
    grid.printAreaBySheet[grid.activeSheet] = "A1:C5";
    grid.setPageSetup({ printTitles: { cols: "A" } });
    const result = grid.computePrintPages();
    const page = result.pages[0];
    assert(page.titleColCount === 1, `titleColCount sai: ${page.titleColCount}`);
    assert(page.colNums.join(",") === "1,2,3", `colNums sai: ${page.colNums}`);
  });

  await test("computePrintPages: hàng/cột ẩn thủ công không được đưa vào trang in (giống Excel thật)", () => {
    const grid = new SheetGridController(container());
    grid.printAreaBySheet[grid.activeSheet] = "A1:C5";
    grid.userHiddenRowsBySheet[grid.activeSheet].add(3);
    grid.userHiddenColsBySheet[grid.activeSheet].add("B");
    const result = grid.computePrintPages();
    const page = result.pages[0];
    assert(!page.rowNums.includes(3), "Hàng 3 đang ẩn nhưng vẫn xuất hiện trong trang in");
    assert(!page.colNums.includes(2), "Cột B (2) đang ẩn nhưng vẫn xuất hiện trong trang in");
    assert(page.rowNums.join(",") === "1,2,4,5", `rowNums sai sau khi ẩn: ${page.rowNums}`);
  });

  await test("computePrintPages: Tỷ lệ phần trăm (vd 50%) tăng số hàng vừa một trang", () => {
    const grid = new SheetGridController(container());
    for (let r = 1; r <= 80; r++) put(grid, `A${r}`, r);
    grid.printAreaBySheet[grid.activeSheet] = "A1:A80";
    const full = grid.computePrintPages();
    grid.setPageSetup({ scale: { mode: "percent", percent: 50 } });
    const half = grid.computePrintPages();
    assert(half.scale === 0.5, `scale sai: ${half.scale}`);
    assert(half.totalPages < full.totalPages, `Thu nhỏ 50% phải giảm số trang: ${full.totalPages} -> ${half.totalPages}`);
  });

  // ---------- Phần 2: DOM thật (openPrintPreview/print/_syncSheetPrintOnlyDom) — dùng document giả ----------

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  try {
    const fakeDoc = new FakeDocument();
    globalThis.document = fakeDoc;
    let printCalled = 0;
    globalThis.window = { print: () => { printCalled++; } };

    await test("openPrintPreview: dựng overlay thật với đúng số trang và có thể đóng lại", () => {
      const grid = new SheetGridController(container());
      for (let r = 1; r <= 80; r++) put(grid, `A${r}`, r);
      grid.printAreaBySheet[grid.activeSheet] = "A1:A80";
      const expected = grid.computePrintPages().totalPages;
      const overlay = grid.openPrintPreview();
      assert(overlay, "openPrintPreview phải trả về overlay");
      const total = overlay.querySelector(".vno-sheet-pp-total");
      assert(total && total.textContent === String(expected), `Tổng số trang hiển thị sai: ${total?.textContent} vs ${expected}`);
      const table = overlay.querySelector(".vno-sheet-print-table");
      assert(table, "Trang xem trước phải chứa bảng dữ liệu thật");
      assert(grid.closePrintPreview() === true, "closePrintPreview phải trả về true khi đang mở");
      assert(fakeDoc.body.querySelector(".vno-sheet-print-preview-overlay") === null, "Overlay phải bị gỡ khỏi DOM sau khi đóng");
    });

    await test("openPrintPreview: nút In chuyển sang luồng in chung, không gọi trình duyệt", () => {
      const grid = new SheetGridController(container());
      put(grid, "A1", "x");
      grid.printAreaBySheet[grid.activeSheet] = "A1:A1";
      const overlay = grid.openPrintPreview();
      printCalled = 0;
      let printActionCalled = 0;
      grid.print = () => { printActionCalled++; };
      overlay.querySelector(".vno-sheet-pp-print").click();
      assert(printActionCalled === 1, "Nút In phải chuyển sang grid.print() dùng luồng in chung");
      assert(printCalled === 0, "Luồng in không được gọi window.print()");
      grid.closePrintPreview();
    });

    await test("print(): chuyển Ctrl+P sang common.file.print mà không gọi trình duyệt", () => {
      const grid = new SheetGridController(container());
      [["A1", "Tên"], ["B1", "Điểm"], ["A2", "An"], ["B2", 9]].forEach(([c, v]) => put(grid, c, v));
      grid.printAreaBySheet[grid.activeSheet] = "A1:B2";
      const originalExecute = globalCommandBus.execute;
      const executed = [];
      globalCommandBus.execute = (commandId, ...args) => { executed.push([commandId, ...args]); return false; };
      try { grid.print(); } finally { globalCommandBus.execute = originalExecute; }
      assert(executed[0]?.[0] === "common.file.print", "Sheet print phải dùng lệnh in chung của Platform");
      assert(printCalled === 0, "Luồng in không được gọi window.print()");
    });

    await test("common.file.print: adapter dùng nội dung hiện tại và không gọi window.print()", async () => {
      const grid = new SheetGridController(container());
      put(grid, "A1", "kiểm tra in thật");
      grid.printAreaBySheet[grid.activeSheet] = "A1:A1";
      const adapter = new SheetAdapter(grid);
      const originalDocumentValue = globalThis.document;
      globalThis.document = undefined;
      try { assert(await adapter.print() === false, "Không mở dialog khi DOM chưa sẵn sàng"); }
      finally { globalThis.document = originalDocumentValue; }
      assert(adapter.serializeToFods().includes("kiểm tra in thật"), "Lệnh in phải lấy workbook hiện tại trong bộ nhớ");
      assert(printCalled === 0, "common.file.print không được gọi window.print()");
    });

    await test("Ctrl+P common.file.print được SheetAdapter bind tới dialog in", async () => {
      const adapter = new SheetAdapter(new SheetGridController(container()));
      let printCalls = 0;
      adapter.print = () => { printCalls += 1; return true; };
      adapter.attach();
      await globalCommandBus.execute("common.file.print");
      assert(printCalls === 1, "Command Bus common.file.print phải gọi SheetAdapter.print()");
    });
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }

  return results;
}
