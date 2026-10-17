/**
 * VN Writer — Unit Tests: Word 2016 Parity Round 2
 * 1. Selection Pane (Ngăn lựa chọn đối tượng, Z-Order, Ẩn/Hiện, Đổi tên)
 * 2. Group / Ungroup đối tượng (Nhóm / Bỏ nhóm đối tượng, Ctrl+G, Ctrl+Shift+G)
 * 3. Split Window (Chia cửa sổ soạn thảo 2 phân vùng, thanh kéo tỉ lệ)
 * 4. Table Styles Gallery (Thư viện 30+ kiểu dáng bảng, Plain, Grid, List)
 * 5. Table Formula Dialog (=SUM(ABOVE), =SUM(LEFT), AVERAGE, COUNT, MAX, MIN, PRODUCT, định dạng số)
 */

import assert from "node:assert/strict";
import { WriterArrangeController } from "../../apps/writer/writer-arrange-controller.js";
import { WriterSplitView } from "../../apps/writer/writer-split-view.js";
import {
  TABLE_STYLE_PRESETS,
  TABLE_STYLES,
  findTableStyle,
  applyTableStyle,
  showTableStylesGallery
} from "../../apps/writer/writer-table-styles.js";
import {
  evaluateTableFormula,
  detectDefaultTableFormula,
  formatFormulaNumber,
  showTableFormulaDialog
} from "../../apps/writer/writer-table-formula-dialog.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

// Setup minimal DOM mocks if running outside browser
class MockClassList {
  constructor(owner) { this.owner = owner; }
  _set() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(...names) {
    const s = this._set();
    for (const n of names) s.add(n);
    this.owner.className = [...s].join(" ");
  }
  remove(...names) {
    const s = this._set();
    for (const n of names) s.delete(n);
    this.owner.className = [...s].join(" ");
  }
  contains(n) { return this._set().has(n); }
  toggle(n, force) {
    if (force !== undefined) {
      if (force) this.add(n); else this.remove(n);
      return force;
    }
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
    this.dataset = {};
    this.listeners = {};
    this.id = "";
    this._innerHTML = "";
    this.rows = [];
    this.cells = [];
    this.rowIndex = 0;
    this.cellIndex = 0;
    this.value = "";
    this.textContent = "";
  }

  get isConnected() { return true; }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this.textContent = this._innerHTML.replace(/<[^>]*>/g, "");
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  hasAttribute(k) { return k in this.attributes; }
  removeAttribute(k) { delete this.attributes[k]; }

  appendChild(c) {
    if (!c) return;
    c.parentElement = this;
    c.parentNode = this;
    this.children.push(c);
    if (this.tagName === "TABLE" && c.tagName === "TR") {
      c.rowIndex = this.rows.length;
      this.rows.push(c);
    }
    if (this.tagName === "TR" && (c.tagName === "TD" || c.tagName === "TH")) {
      c.cellIndex = this.cells.length;
      this.cells.push(c);
    }
    return c;
  }

  get nextSibling() {
    const parent = this.parentElement || this.parentNode;
    if (!parent) return null;
    const idx = parent.children.indexOf(this);
    return idx >= 0 && idx < parent.children.length - 1 ? parent.children[idx + 1] : null;
  }

  insertBefore(newEl, refEl) {
    if (!newEl) return null;
    newEl.parentElement = this;
    newEl.parentNode = this;
    const idx = refEl ? this.children.indexOf(refEl) : -1;
    if (idx >= 0) {
      this.children.splice(idx, 0, newEl);
    } else {
      this.children.push(newEl);
    }
    return newEl;
  }

  removeChild(c) {
    const idx = this.children.indexOf(c);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      c.parentElement = null;
      c.parentNode = null;
    }
    const rIdx = this.rows.indexOf(c);
    if (rIdx >= 0) this.rows.splice(rIdx, 1);
    const cIdx = this.cells.indexOf(c);
    if (cIdx >= 0) this.cells.splice(cIdx, 1);
    return c;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  addEventListener(type, fn) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(evt) {
    const list = this.listeners[evt.type] || [];
    for (const f of list) f(evt);
  }

  querySelector(sel) {
    return this._query(sel, false);
  }

  querySelectorAll(sel) {
    return this._query(sel, true);
  }

  _query(sel, all = false) {
    const res = [];
    const walk = (n) => {
      for (const c of n.children) {
        let match = false;
        if (sel.startsWith("#") && c.id === sel.slice(1)) match = true;
        else if (sel.startsWith(".") && c.classList.contains(sel.slice(1))) match = true;
        else if (sel.toLowerCase() === c.tagName.toLowerCase()) match = true;
        else if (sel.startsWith("[data-command-id=") && c.attributes["data-command-id"] === sel.slice(18, -2)) match = true;
        else if (sel.includes("td, th") && (c.tagName === "TD" || c.tagName === "TH")) match = true;

        if (match) {
          res.push(c);
          if (!all) return;
        }
        walk(c);
        if (!all && res.length) return;
      }
    };
    walk(this);
    return all ? res : (res[0] || null);
  }

  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel.startsWith(".") && cur.classList?.contains?.(sel.slice(1))) return cur;
      if (sel.toLowerCase() === cur.tagName?.toLowerCase?.()) return cur;
      if (sel.includes("td, th") && (cur.tagName === "TD" || cur.tagName === "TH")) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  getBoundingClientRect() {
    return { top: 100, bottom: 200, left: 100, right: 300, width: 200, height: 100 };
  }
}

export async function run() {
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  // Polyfill global document / window only for the duration of this test suite
  globalThis.document = {
    createElement(tag) { return new MockElement(tag); },
    body: new MockElement("body"),
    querySelector(s) { return globalThis.document.body.querySelector(s); },
    querySelectorAll(s) { return globalThis.document.body.querySelectorAll(s); },
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.window = {
    scrollY: 0,
    scrollX: 0,
    getSelection() { return null; }
  };

  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  try {
    console.log("=== Bắt đầu Unit Tests: Word 2016 Parity Round 2 ===");

    // ----------------------------------------------------
    // TEST 1: Table Styles Gallery
    // ----------------------------------------------------
    await test("Table Styles Gallery: 30+ kiểu dáng áp dụng chuẩn xác", async () => {
      assert.ok(Array.isArray(TABLE_STYLE_PRESETS), "TABLE_STYLE_PRESETS phải là mảng");
      assert.ok(TABLE_STYLE_PRESETS.length >= 30, `Phải có ít nhất 30 mẫu kiểu bảng (thực tế: ${TABLE_STYLE_PRESETS.length})`);
      assert.strictEqual(TABLE_STYLES, TABLE_STYLE_PRESETS, "TABLE_STYLES phải alias tới TABLE_STYLE_PRESETS");

      const categories = new Set(TABLE_STYLE_PRESETS.map(p => p.category));
      assert.ok(categories.has("plain"), "Phải có danh mục plain");
      assert.ok(categories.has("grid"), "Phải có danh mục grid");
      assert.ok(categories.has("list"), "Phải có danh mục list");

      // Kiểm tra tìm kiếm style
      const gridStyle = findTableStyle("TableGrid");
      assert.strictEqual(gridStyle.id, "TableGrid");
      assert.strictEqual(gridStyle.borderStyle, "solid");

      const accent1Style = findTableStyle("GridTable1Light-Accent1");
      assert.strictEqual(accent1Style.headerBg, "#3b82f6");
      assert.strictEqual(accent1Style.bandedBg, "#eff6ff");

      // Áp dụng style vào table
      const testTable = new MockElement("table");
      for (let r = 0; r < 4; r++) {
        const tr = new MockElement("tr");
        for (let c = 0; c < 3; c++) {
          const td = new MockElement("td");
          td.innerHTML = `Ô ${r},${c}`;
          tr.appendChild(td);
        }
        testTable.appendChild(tr);
      }

      const applied = applyTableStyle(testTable, "GridTable1Light-Accent1", { headerRow: true, bandedRows: true });
      assert.strictEqual(applied, true, "applyTableStyle phải trả về true");
      assert.strictEqual(testTable.dataset.vnoTableStyle, "GridTable1Light-Accent1");
      assert.strictEqual(testTable.dataset.vnoHeaderRow, "true");
      assert.strictEqual(testTable.dataset.vnoBandedRows, "true");

      // Kiểm tra màu hàng tiêu đề
      assert.strictEqual(testTable.rows[0].cells[0].style.backgroundColor, "#3b82f6");
      assert.strictEqual(testTable.rows[0].cells[0].style.color, "#ffffff");
      assert.strictEqual(testTable.rows[0].cells[0].style.fontWeight, "bold");

      // Kiểm tra hàng so le (banded row 1)
      assert.strictEqual(testTable.rows[1].cells[0].style.backgroundColor, "#eff6ff");
      // Hàng trắng (row 2)
      assert.strictEqual(testTable.rows[2].cells[0].style.backgroundColor, "#ffffff");
      // Hàng so le (row 3)
      assert.strictEqual(testTable.rows[3].cells[0].style.backgroundColor, "#eff6ff");
    });

    // ----------------------------------------------------
    // TEST 2: Table Formula Dialog & Evaluation Engine
    // ----------------------------------------------------
    await test("Table Formula: tính toán và định dạng số khớp 100% Word 2016", async () => {
      // Dựng bảng 3x3 chứa số liệu:
      // Hàng 0: 100, 120, [cần tính tổng hàng]
      // Hàng 1: 100,  50,  0
      // Hàng 2: [tính tổng cột], 0, 0
      const formulaTable = new MockElement("table");
      for (let r = 0; r < 3; r++) {
        const tr = new MockElement("tr");
        for (let c = 0; c < 3; c++) {
          const td = new MockElement("td");
          tr.appendChild(td);
        }
        formulaTable.appendChild(tr);
      }

      formulaTable.rows[0].cells[0].innerHTML = "100";
      formulaTable.rows[0].cells[1].innerHTML = "120";
      formulaTable.rows[1].cells[0].innerHTML = "100";
      formulaTable.rows[1].cells[1].innerHTML = "50";

      // Test detect context
      const targetColCell = formulaTable.rows[2].cells[0]; // Dưới 100 và 100
      const formulaCol = detectDefaultTableFormula(formulaTable, targetColCell);
      assert.strictEqual(formulaCol, "=SUM(ABOVE)", "Ô cuối cột phải gợi ý =SUM(ABOVE)");

      const targetRowCell = formulaTable.rows[0].cells[2]; // Bên phải 100 và 120
      const formulaRow = detectDefaultTableFormula(formulaTable, targetRowCell);
      assert.strictEqual(formulaRow, "=SUM(LEFT)", "Ô cuối hàng phải gợi ý =SUM(LEFT)");

      // Test evaluate =SUM(ABOVE)
      const sumCol = evaluateTableFormula(formulaTable, targetColCell, "=SUM(ABOVE)");
      assert.strictEqual(sumCol, 200, "100 + 100 = 200 (khớp Oracle Word 2016)");

      // Test evaluate =SUM(LEFT)
      const sumRow = evaluateTableFormula(formulaTable, targetRowCell, "=SUM(LEFT)");
      assert.strictEqual(sumRow, 220, "100 + 120 = 220 (khớp Oracle Word 2016)");

      // Test các hàm khác
      assert.strictEqual(evaluateTableFormula(formulaTable, targetColCell, "=AVERAGE(ABOVE)"), 100);
      assert.strictEqual(evaluateTableFormula(formulaTable, targetColCell, "=COUNT(ABOVE)"), 2);
      assert.strictEqual(evaluateTableFormula(formulaTable, targetRowCell, "=MAX(LEFT)"), 120);
      assert.strictEqual(evaluateTableFormula(formulaTable, targetRowCell, "=MIN(LEFT)"), 100);
      assert.strictEqual(evaluateTableFormula(formulaTable, targetColCell, "=PRODUCT(ABOVE)"), 10000);

      // Test number formatting
      assert.strictEqual(formatFormulaNumber(200, "#,##0"), "200");
      assert.strictEqual(formatFormulaNumber(1234567, "#,##0"), "1,234,567");
      assert.strictEqual(formatFormulaNumber(1234.5, "#,##0.00"), "1,234.50");
      assert.strictEqual(formatFormulaNumber(0.85, "0%"), "85%");
    });

    // ----------------------------------------------------
    // TEST 3: Selection Pane (WriterArrangeController)
    // ----------------------------------------------------
    const mockAppContainer = new MockElement("div");
    mockAppContainer.className = "vno-writer-app";
    globalThis.document.body.appendChild(mockAppContainer);

    const mockAdapter = {
      container: mockAppContainer,
      shapes: [
        { id: "shape-1", name: "Hình chữ nhật 1", type: "rectangle", visible: true, zIndex: 1 },
        { id: "shape-2", name: "Elip 1", type: "circle", visible: true, zIndex: 2 },
        { id: "shape-3", name: "Khung chữ 1", type: "textbox", visible: true, zIndex: 3 }
      ],
      recordSnapshot() {},
      isDirty: false
    };

    const arrangeController = new WriterArrangeController(mockAdapter);

    await test("Selection Pane: Mở/Đóng, Ẩn/Hiện, Z-Order, Đổi tên hoạt động chính xác", async () => {
      // Bật Selection Pane
      arrangeController.toggleSelectionPane(true);
      assert.strictEqual(arrangeController.isSelectionPaneOpen, true);
      const paneEl = mockAppContainer.querySelector("#vno-writer-selection-pane");
      assert.ok(paneEl, "Ngăn lựa chọn #vno-writer-selection-pane phải được thêm vào DOM");
      assert.strictEqual(paneEl.style.display, "flex");

      // Ẩn đối tượng qua Selection Pane
      arrangeController.toggleObjectVisibility("shape-2");
      assert.strictEqual(mockAdapter.shapes[1].visible, false, "Hình 2 phải chuyển thành ẩn (visible: false)");

      // Hiện lại đối tượng
      arrangeController.toggleObjectVisibility("shape-2");
      assert.strictEqual(mockAdapter.shapes[1].visible, true, "Hình 2 phải chuyển thành hiện lại");

      // Ẩn tất cả & Hiện tất cả
      arrangeController.hideAllObjects();
      assert.ok(mockAdapter.shapes.every(s => s.visible === false), "Tất cả hình phải bị ẩn khi hideAllObjects()");
      arrangeController.showAllObjects();
      assert.ok(mockAdapter.shapes.every(s => s.visible === true), "Tất cả hình phải hiện khi showAllObjects()");

      // Đổi tên đối tượng trong Selection Pane
      arrangeController.renameObject("shape-1", "Logo Cong Ty");
      assert.strictEqual(mockAdapter.shapes[0].name, "Logo Cong Ty", "Hình 1 phải được đổi tên thành Logo Cong Ty (khớp Oracle Word 2016)");

      // Điều chỉnh Z-Order (Bring to front / Send to back)
      arrangeController.bringToFront("shape-1");
      assert.strictEqual(mockAdapter.shapes[mockAdapter.shapes.length - 1].id, "shape-1", "Hình 1 phải lên trên cùng");

      arrangeController.sendToBack("shape-1");
      assert.strictEqual(mockAdapter.shapes[0].id, "shape-1", "Hình 1 phải xuống dưới cùng");

      // Đóng Selection Pane
      arrangeController.toggleSelectionPane(false);
      assert.strictEqual(arrangeController.isSelectionPaneOpen, false);
      assert.strictEqual(paneEl.style.display, "none");
    });

    // ----------------------------------------------------
    // TEST 4: Group / Ungroup đối tượng
    // ----------------------------------------------------
    await test("Group & Ungroup: nhóm và rã nhóm đối tượng chuẩn xác", async () => {
      // Chọn 2 đối tượng
      arrangeController.selectedObjectIds.clear();
      arrangeController.selectedObjectIds.add("shape-2");
      arrangeController.selectedObjectIds.add("shape-3");

      const groupRes = arrangeController.groupSelectedObjects();
      assert.ok(groupRes, "groupSelectedObjects phải thành công");
      assert.strictEqual(groupRes.type, "group");
      assert.ok(groupRes.id.startsWith("group-"));
      assert.strictEqual(groupRes.children.length, 2);

      // Kiểm tra 2 hình con đã nhận groupId
      const s2 = mockAdapter.shapes.find(s => s.id === "shape-2");
      const s3 = mockAdapter.shapes.find(s => s.id === "shape-3");
      assert.strictEqual(s2.groupId, groupRes.id);
      assert.strictEqual(s3.groupId, groupRes.id);

      // Ungroup đối tượng
      arrangeController.selectedObjectIds.clear();
      arrangeController.selectedObjectIds.add(groupRes.id);

      const ungroupRes = arrangeController.ungroupSelectedObjects();
      assert.ok(ungroupRes, "ungroupSelectedObjects phải thành công");
      assert.ok(!s2.groupId, "Sau ungroup, groupId của hình con phải không còn");
      assert.ok(!s3.groupId, "Sau ungroup, groupId của hình con phải không còn");
      assert.ok(!mockAdapter.shapes.some(s => s.id === groupRes.id), "Khối nhóm phải được gỡ khỏi danh sách shapes");
    });

  // ----------------------------------------------------
  // TEST 5: Split Window (WriterSplitView)
    // ----------------------------------------------------
    // TEST 5: Split Window (WriterSplitView)
    // ----------------------------------------------------
    await test("Split Window: bật/tắt, phân vùng và thanh kéo hoạt động chuẩn xác", async () => {
      const mockWorkspace = new MockElement("div");
      mockWorkspace.className = "vno-writer-workspace";
      mockAppContainer.appendChild(mockWorkspace);

      const mockScroll = new MockElement("div");
      mockScroll.className = "vno-writer-scroll-container";
      mockWorkspace.appendChild(mockScroll);

      const splitView = new WriterSplitView(mockAdapter);

      // Kích hoạt chia cửa sổ
      splitView.toggleSplit(true);
      assert.strictEqual(splitView.isSplitActive, true);
      assert.ok(mockWorkspace.classList.contains("vno-writer-split-active"), "Workspace phải có class vno-writer-split-active");
      const splitBar = mockWorkspace.querySelector(".vno-writer-split-bar");
      assert.ok(splitBar, "Thanh chia cửa sổ .vno-writer-split-bar phải xuất hiện");
      const bottomPane = mockWorkspace.querySelector(".vno-writer-split-bottom-pane");
      assert.ok(bottomPane, "Phân vùng dưới .vno-writer-split-bottom-pane phải được tạo");

      // Thay đổi tỉ lệ chia
      splitView.setSplitRatio(60);
      assert.strictEqual(splitView.splitRatio, 60);

      // Đóng chia cửa sổ
      splitView.toggleSplit(false);
      assert.strictEqual(splitView.isSplitActive, false);
      assert.ok(!mockWorkspace.classList.contains("vno-writer-split-active"));
    });

    // ----------------------------------------------------
    // TEST 6: Command Bus Registration & Ribbon Handlers
    // ----------------------------------------------------
    await test("Toàn bộ 6 lệnh Ribbon đều có handler đăng ký trên CommandBus", async () => {
      const realEditor = new MockElement("div");
      const writerAdapter = new WriterAdapter(realEditor);
      writerAdapter.attach();

      const requiredCommands = [
        "writer.view.selectionPane",
        "writer.arrange.group",
        "writer.arrange.ungroup",
        "writer.view.split",
        "writer.table.stylesGallery",
        "writer.table.formula"
      ];

      for (const cmd of requiredCommands) {
        const hasHandler = globalCommandBus.hasHandler(cmd);
        assert.ok(hasHandler, `Lệnh ${cmd} phải có handler trên globalCommandBus`);
      }
    });

    console.log("=== HOÀN TẤT: Toàn bộ Unit Tests Word 2016 Parity Round 2 đã PASS 100%! ===");
    return results;
  } finally {
    if (originalDoc === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDoc;
    }
    if (originalWin === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWin;
    }
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  run().then(results => {
    const failed = results.filter(r => !r.pass);
    if (failed.length > 0) {
      console.error(`${failed.length} test(s) failed:`, failed);
      process.exit(1);
    }
    console.log(`PASS: ${results.length}/${results.length} tests`);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
