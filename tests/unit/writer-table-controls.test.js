/**
 * VN Writer — Table Controls & Contextual Ribbon Tabs
 * Tests for table move handle, column resize, cell selection,
 * insert/delete rows/cols, merge/split cells, formatting, and help entries.
 */
import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WriterTableController } from "../../apps/writer/writer-table.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const TABLE_COMMAND_IDS = [
  "writer.table.toggleHeaderRow",
  "writer.table.toggleBandedRows",
  "writer.table.cellBg",
  "writer.table.borders",
  "writer.table.selectCell",
  "writer.table.selectRow",
  "writer.table.selectCol",
  "writer.table.selectTable",
  "writer.table.deleteTable",
  "writer.table.insertRowAbove",
  "writer.table.insertRowBelow",
  "writer.table.deleteRow",
  "writer.table.insertColLeft",
  "writer.table.insertColRight",
  "writer.table.deleteCol",
  "writer.table.mergeCells",
  "writer.table.splitCells",
  "writer.table.distributeRows",
  "writer.table.distributeCols",
  "writer.table.alignTop",
  "writer.table.alignMiddle",
  "writer.table.alignBottom"
];

class MockClassList {
  constructor(owner) { this.owner = owner; }
  _set() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(n) { const s = this._set(); s.add(n); this.owner.className = [...s].join(" "); }
  remove(n) { const s = this._set(); s.delete(n); this.owner.className = [...s].join(" "); }
  contains(n) { return this._set().has(n); }
  toggle(n) {
    if (this.contains(n)) { this.remove(n); return false; }
    this.add(n); return true;
  }
}

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.className = "";
    this.classList = new MockClassList(this);
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.id = "";
    this._innerHTML = "";
    this.colSpan = 1;
    this.rowSpan = 1;
  }

  get isConnected() { return true; }

  get nextSibling() {
    if (!this.parentElement) return null;
    const idx = this.parentElement.children.indexOf(this);
    return idx >= 0 && idx < this.parentElement.children.length - 1 ? this.parentElement.children[idx + 1] : null;
  }

  get textContent() {
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(v) {
    this._innerHTML = String(v);
    this.children = [];
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }

  get cellIndex() {
    if (!this.parentElement || !this.parentElement.cells) return 0;
    return this.parentElement.cells.indexOf(this);
  }

  get rowIndex() {
    const table = this.closest("table");
    if (!table) return 0;
    return table.rows.indexOf(this);
  }

  get rows() {
    if (this.tagName === "TABLE") {
      const list = [];
      for (const child of this.children) {
        if (child.tagName === "TR") list.push(child);
        else if (child.tagName === "TBODY" || child.tagName === "THEAD" || child.tagName === "TFOOT") {
          for (const sub of child.children) {
            if (sub.tagName === "TR") list.push(sub);
          }
        }
      }
      return list;
    }
    return [];
  }

  get cells() {
    if (this.tagName === "TR") {
      return this.children.filter(c => c.tagName === "TD" || c.tagName === "TH");
    }
    return [];
  }

  closest(sel) {
    const targetTag = sel.toUpperCase();
    let cur = this;
    while (cur) {
      if (cur.tagName === targetTag || (targetTag.includes("TD") && (cur.tagName === "TD" || cur.tagName === "TH"))) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  contains(node) {
    let cur = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    newChild.parentElement = this;
    newChild.parentNode = this;
    const idx = this.children.indexOf(refChild);
    if (idx >= 0) {
      this.children.splice(idx, 0, newChild);
    } else {
      this.children.push(newChild);
    }
    return newChild;
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx >= 0) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
      this.parentNode = null;
    }
  }

  addEventListener(type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== fn);
    }
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (sel.startsWith("#") && child.id === sel.slice(1)) results.push(child);
        else if (sel.startsWith(".") && child.classList.contains(sel.slice(1))) results.push(child);
        else if (child.tagName.toLowerCase() === sel.toLowerCase()) results.push(child);
        else if (sel === "td, th" && (child.tagName === "TD" || child.tagName === "TH")) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  getBoundingClientRect() { return { left: 50, top: 50, right: 250, bottom: 150, width: 200, height: 100 }; }
}

function setupMockEnvironment() {
  const root = new MockElement("div");
  root.id = "root";
  const page = new MockElement("div");
  page.className = "vno-writer-page";
  const body = new MockElement("div");
  body.className = "vno-writer-body";

  root.appendChild(page);
  page.appendChild(body);

  // Global document mock
  global.document = {
    createElement(tag) { return new MockElement(tag); },
    body: root,
    addEventListener() {},
    removeEventListener() {}
  };
  global.window = {
    getSelection() { return null; }
  };

  const table = new MockElement("table");
  for (let r = 0; r < 3; r++) {
    const tr = new MockElement("tr");
    for (let c = 0; c < 3; c++) {
      const td = new MockElement("td");
      td.textContent = `R${r}C${c}`;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  body.appendChild(table);

  const adapter = new WriterAdapter(page);
  adapter.bodyDom = body;
  adapter.editorDom = page;

  const tableController = new WriterTableController({
    body,
    page,
    adapter,
    mountElement: root
  }).attach();
  adapter.tableController = tableController;

  return { root, page, body, table, adapter, tableController };
}

export async function runWriterTableControlsTests() {
  const __savedGlobalDocument = global.document; const __savedGlobalWindow = global.window;
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Table commands: 22 lệnh bảng có đầy đủ định nghĩa, category table, i18n VI/EN", () => {
    for (const id of TABLE_COMMAND_IDS) {
      const cmd = WRITER_COMMANDS.find((item) => item.id === id);
      assert.ok(cmd, `Thiếu lệnh ${id} trong WRITER_COMMANDS`);
      assert.equal(cmd.category, "table", `Lệnh ${id} phải có category=table`);
      assert.ok(viStrings.commands[id]?.label, `Thiếu label VI cho ${id}`);
      assert.ok(viStrings.commands[id]?.tooltip, `Thiếu tooltip VI cho ${id}`);
      assert.ok(enStrings.commands[id]?.label, `Thiếu label EN cho ${id}`);
      assert.ok(enStrings.commands[id]?.tooltip, `Thiếu tooltip EN cho ${id}`);
    }
  });

  await test("Table ribbon tabs: có 2 tab ngữ cảnh tableDesign và tableLayout với đầy đủ các nhóm chức năng", () => {
    const designTab = WRITER_RIBBON_TABS.find((tab) => tab.id === "tableDesign");
    assert.ok(designTab, "Thiếu tab tableDesign");
    assert.equal(designTab.contextual, true, "tableDesign phải có contextual=true");
    const styleOptionsGroup = designTab.groups.find((g) => g.id === "tableStyleOptions");
    const bordersGroup = designTab.groups.find((g) => g.id === "tableBordersShading");
    assert.ok(styleOptionsGroup, "Thiếu nhóm tableStyleOptions trên tableDesign");
    assert.ok(bordersGroup, "Thiếu nhóm tableBordersShading trên tableDesign");

    const layoutTab = WRITER_RIBBON_TABS.find((tab) => tab.id === "tableLayout");
    assert.ok(layoutTab, "Thiếu tab tableLayout");
    assert.equal(layoutTab.contextual, true, "tableLayout phải có contextual=true");
    const tableGroup = layoutTab.groups.find((g) => g.id === "tableSelectGroup");
    const rowsColsGroup = layoutTab.groups.find((g) => g.id === "tableRowsColsGroup");
    const mergeGroup = layoutTab.groups.find((g) => g.id === "tableMergeGroup");
    const cellGroup = layoutTab.groups.find((g) => g.id === "tableSizeGroup");
    const alignmentGroup = layoutTab.groups.find((g) => g.id === "tableAlignGroup");

    assert.ok(tableGroup, "Thiếu nhóm tableSelectGroup trên tableLayout");
    assert.ok(rowsColsGroup, "Thiếu nhóm tableRowsColsGroup trên tableLayout");
    assert.ok(mergeGroup, "Thiếu nhóm tableMergeGroup trên tableLayout");
    assert.ok(cellGroup, "Thiếu nhóm tableSizeGroup trên tableLayout");
    assert.ok(alignmentGroup, "Thiếu nhóm tableAlignGroup trên tableLayout");
  });

  await test("Table help coverage: 4 bài help chuẩn bao phủ toàn bộ 22 lệnh bảng, ít nhất 3 bước cụ thể", () => {
    const tableEntries = WRITER_HELP_ENTRIES.filter((e) =>
      e.commandIds?.some((cid) => cid.startsWith("writer.table."))
    );
    assert.ok(tableEntries.length >= 4, `Cần ít nhất 4 bài help bảng, có ${tableEntries.length}`);

    const covered = new Set(tableEntries.flatMap((e) => e.commandIds));
    for (const id of TABLE_COMMAND_IDS) {
      assert.ok(covered.has(id), `Lệnh ${id} chưa được phủ trong bài Help`);
    }

    for (const entry of tableEntries) {
      assert.ok(entry.steps && entry.steps.length >= 3, `Bài ${entry.id} phải có ít nhất 3 bước`);
      assert.ok(entry.title && entry.summary, `Bài ${entry.id} thiếu title hoặc summary`);
    }
  });

  await test("Table controller: tạo tay cầm move handle và quản lý chọn ô / bôi đen bảng", () => {
    const { table, tableController, page } = setupMockEnvironment();
    const handle = page.querySelector("#vno-table-move-handle");
    assert.ok(handle, "Phải sinh ra phần tử #vno-table-move-handle");

    // Chọn ô đầu tiên
    const firstCell = table.rows[0].cells[0];
    tableController.selectCell(firstCell);
    assert.equal(tableController.selectedCells.size, 1);
    assert.ok(firstCell.classList.contains("is-vno-cell-selected"));

    // Chọn hàng
    tableController.selectRow(firstCell);
    assert.equal(tableController.selectedCells.size, 3);
    for (const c of table.rows[0].cells) {
      assert.ok(c.classList.contains("is-vno-cell-selected"));
    }

    // Chọn cột
    tableController.selectCol(firstCell);
    assert.equal(tableController.selectedCells.size, 3);
    for (const r of table.rows) {
      assert.ok(r.cells[0].classList.contains("is-vno-cell-selected"));
    }

    // Chọn toàn bộ bảng
    tableController.selectTable(table);
    assert.equal(tableController.selectedCells.size, 9);

    // Xóa chọn
    tableController.clearCellSelection();
    assert.equal(tableController.selectedCells.size, 0);
  });

  await test("Table selection: chọn hàng tạo vùng văn bản và Shift+Space chọn hàng hiện tại", () => {
    const { table, tableController } = setupMockEnvironment();
    const ranges = [];
    const selection = {
      anchorNode: { nodeType: 1, closest: () => table.rows[0].cells[1] },
      rangeCount: 0,
      removeAllRanges() { this.rangeCount = 0; },
      addRange(range) { ranges.push(range); this.rangeCount = 1; }
    };
    const previousDefaultView = global.document.defaultView;
    const previousCreateRange = global.document.createRange;
    const previousGetSelection = global.getSelection;
    global.document.defaultView = { getSelection: () => selection };
    global.getSelection = () => selection;
    global.document.createRange = () => ({ setStart(node, offset) { this.start = [node, offset]; }, setEnd(node, offset) { this.end = [node, offset]; } });
    try {
      tableController.selectRow(table.rows[0].cells[1]);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0].start[0], table.rows[0].cells[0]);
      assert.equal(ranges[0].end[0], table.rows[0].cells[2]);
      assert.equal(tableController.selectedCells.size, 3);

      let prevented = false;
      tableController._handleKeyDown({
        key: " ", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false,
        preventDefault() { prevented = true; }
      });
      assert.equal(prevented, true);
      assert.equal(ranges.length, 2);
      assert.equal(ranges[1].start[0], table.rows[0].cells[0]);
      assert.equal(ranges[1].end[0], table.rows[0].cells[2]);
    } finally {
      global.document.defaultView = previousDefaultView;
      global.document.createRange = previousCreateRange;
      if (previousGetSelection === undefined) delete global.getSelection; else global.getSelection = previousGetSelection;
    }
  });

  await test("Merge cells: chưa chọn ít nhất hai ô thì báo cách khắc phục", () => {
    const { adapter, table, tableController } = setupMockEnvironment();
    let notification = null;
    adapter.shell = { showNotification(options) { notification = options; } };
    tableController.activeTable = table;
    tableController.selectedCells.clear();
    assert.equal(adapter.mergeTableCells(), false);
    assert.equal(notification?.type, "info");
    assert.match(notification?.message || "", /ít nhất hai ô liền kề/i);
  });

  await test("Table editing: chèn hàng phía trên và phía dưới", () => {
    const { table, adapter, tableController } = setupMockEnvironment();
    assert.equal(table.rows.length, 3);

    tableController.activeCell = table.rows[1].cells[1];
    tableController.activeTable = table;

    // Chèn hàng trên
    const okAbove = adapter.insertTableRowAbove();
    assert.ok(okAbove);
    assert.equal(table.rows.length, 4);
    assert.equal(table.rows[1].cells.length, 3);

    // Chèn hàng dưới
    tableController.activeCell = table.rows[1].cells[1];
    const okBelow = adapter.insertTableRowBelow();
    assert.ok(okBelow);
    assert.equal(table.rows.length, 5);
  });

  await test("Table editing: chèn cột bên trái và bên phải", () => {
    const { table, adapter, tableController } = setupMockEnvironment();
    assert.equal(table.rows[0].cells.length, 3);

    tableController.activeCell = table.rows[0].cells[1];
    tableController.activeTable = table;

    // Chèn cột trái
    const okLeft = adapter.insertTableColLeft();
    assert.ok(okLeft);
    assert.equal(table.rows[0].cells.length, 4);

    // Chèn cột phải
    const okRight = adapter.insertTableColRight();
    assert.ok(okRight);
    assert.equal(table.rows[0].cells.length, 5);
  });

  await test("Table editing: xóa hàng và xóa cột", () => {
    const { table, adapter, tableController } = setupMockEnvironment();
    assert.equal(table.rows.length, 3);
    assert.equal(table.rows[0].cells.length, 3);

    tableController.activeCell = table.rows[1].cells[1];
    tableController.activeTable = table;

    // Xóa hàng
    adapter.deleteTableRow();
    assert.equal(table.rows.length, 2);

    // Xóa cột
    tableController.activeCell = table.rows[0].cells[0];
    adapter.deleteTableCol();
    assert.equal(table.rows[0].cells.length, 2);
  });

  await test("Table editing: gộp ô và tách ô", () => {
    const { table, adapter, tableController } = setupMockEnvironment();
    const cell1 = table.rows[0].cells[0];
    const cell2 = table.rows[0].cells[1];

    tableController.activeTable = table;
    tableController.activeCell = cell1;
    tableController.selectedCells = new Set([cell1, cell2]);

    const okMerge = adapter.mergeTableCells();
    assert.ok(okMerge);
    assert.equal(cell1.colSpan, 2);
    assert.equal(table.rows[0].cells.length, 2);

    // Tách ô
    tableController.activeCell = cell1;
    const okSplit = adapter.splitTableCells();
    assert.ok(okSplit);
    assert.equal(cell1.colSpan, 1);
  });

  await test("Table insertion: ô mới để trống, không có chữ mẫu", () => {
    const { adapter, body } = setupMockEnvironment();
    adapter.insertTable(3, 4);
    assert.equal((body.innerHTML.match(/<td\b/g) || []).length, 12);
    assert.equal((body.innerHTML.match(/<br><\/td>/g) || []).length, 12);
    assert.doesNotMatch(body.innerHTML, /Tiêu đề|Dữ liệu/);
  });

  await test("Table split: khôi phục cột đã gộp ngang và hàng đã gộp dọc", () => {
    const { table, adapter, tableController } = setupMockEnvironment();

    const firstRow = table.rows[0];
    tableController.activeTable = table;
    tableController.activeCell = firstRow.cells[0];
    tableController.selectedCells = new Set([firstRow.cells[0], firstRow.cells[1], firstRow.cells[2]]);
    assert.equal(adapter.mergeTableCells(), true);
    assert.equal(firstRow.cells.length, 1);
    assert.equal(firstRow.cells[0].colSpan, 3);
    tableController.activeCell = firstRow.cells[0];
    assert.equal(adapter.splitTableCells(), true);
    assert.equal(firstRow.cells.length, 3);
    assert.equal(firstRow.cells[0].colSpan, 1);

    const row0Cell = table.rows[0].cells[0];
    const row1Cell = table.rows[1].cells[0];
    tableController.activeCell = row0Cell;
    tableController.selectedCells = new Set([row0Cell, row1Cell]);
    assert.equal(adapter.mergeTableCells(), true);
    assert.equal(table.rows[0].cells[0].rowSpan, 2);
    assert.equal(table.rows[1].cells.length, 2);
    tableController.activeCell = table.rows[0].cells[0];
    assert.equal(adapter.splitTableCells(), true);
    assert.equal(table.rows[0].cells.length, 3);
    assert.equal(table.rows[1].cells.length, 3);
    assert.equal(table.rows[0].cells[0].rowSpan, 1);
  });

  await test("Table formatting: căn lề, màu nền, đường viền, hàng tiêu đề và hàng xen kẽ", () => {
    const { table, adapter, tableController } = setupMockEnvironment();
    const cell = table.rows[0].cells[0];
    tableController.activeTable = table;
    tableController.activeCell = cell;

    // Căn giữa dọc
    adapter.setTableCellAlign("middle");
    assert.equal(cell.style.verticalAlign, "middle");

    // Màu nền
    adapter.setTableCellBackground("#fee2e2");
    assert.equal(cell.style.backgroundColor, "#fee2e2");

    // Viền bảng
    adapter.setTableBorders("none");
    assert.equal(cell.style.border, "none");
    adapter.setTableBorders("all");
    assert.equal(cell.style.border, "1px solid #94a3b8");

    // Hàng tiêu đề toggle
    adapter.toggleTableHeaderRow();
    assert.ok(table.rows[0].classList.contains("vno-table-header-row"));

    // Hàng xen kẽ toggle
    adapter.toggleTableBandedRows();
    assert.ok(table.classList.contains("vno-table-banded-rows"));
    assert.equal(table.rows[1].cells[0].style.backgroundColor, "#dbeafe", "Giữ màu nền xuất tài liệu; CSS theme tối chỉ ghi đè khi hiển thị trong ứng dụng");
    adapter.toggleTableBandedRows();
    assert.equal(table.classList.contains("vno-table-banded-rows"), false);
  });

  await test("Table editing: xóa toàn bộ bảng và dọn dẹp controller", () => {
    const { table, adapter, tableController, body } = setupMockEnvironment();
    assert.ok(body.contains(table));

    tableController.activeTable = table;
    adapter.deleteTable();

    assert.equal(body.contains(table), false);
    assert.equal(tableController.activeTable, null);
    assert.equal(tableController.selectedCells.size, 0);
  });

  global.document = __savedGlobalDocument; global.window = __savedGlobalWindow; // tra lai moi truong cho cac bo test sau
  return results;
}
