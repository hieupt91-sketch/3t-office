/**
 * VN Office — Unit & Behavioral Tests: VN Sheet Watch Window (Cửa sổ theo dõi ô)
 * Tuân thủ quy chuẩn Microsoft Excel:
 * 1. Cửa sổ nổi có thể kéo (draggable floating window)
 * 2. 6 cột chuẩn Excel: Sổ làm việc / Trang tính / Tên / Ô / Giá trị / Công thức
 * 3. Thêm/xóa ô theo dõi (hỗ trợ cả ô ở trang tính khác và dải ô)
 * 4. Giá trị tự cập nhật khi sửa ô
 * 5. Điều hướng bàn phím (Delete xóa, ArrowUp/Down chọn hàng, Enter nhảy tới ô, Esc đóng)
 * 6. Nhãn tiếng Việt chuẩn hóa 100%
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    const classes = new Set();
    this._classes = classes;
    this.classList = {
      add: (...names) => names.forEach(n => n && classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: (n) => classes.has(n),
      toggle: (n, force) => {
        if (force !== undefined) {
          if (force) classes.add(n); else classes.delete(n);
          return force;
        }
        if (classes.has(n)) { classes.delete(n); return false; }
        classes.add(n); return true;
      }
    };
    this.dataset = {};
    this.tabIndex = 0;
    this._value = "";
    this._innerHTML = "";
    this._textContent = "";
  }

  get className() { return Array.from(this._classes || []).join(" "); }
  set className(v) {
    this._classes?.clear();
    String(v || "").split(/\s+/).forEach(c => c && this._classes?.add(c));
  }

  get value() { return this._value; }
  set value(v) { this._value = String(v ?? ""); }

  get textContent() { return this._textContent; }
  set textContent(v) {
    this._textContent = String(v ?? "");
    this.children = [];
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    this._textContent = html.replace(/<[^>]*>/g, "");
    this._parseSimpleHtml(html);
  }

  _parseSimpleHtml(html) {
    // Parser mini tạo các phần tử con đơn giản từ HTML template
    const tagRegex = /<([a-z0-9]+)([^>]*)>(.*?)<\/\1>|<([a-z0-9]+)([^>]*)\/>/gis;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1] || match[4];
      const attrsStr = match[2] || match[5] || "";
      const inner = match[3] || "";
      const child = new MockElement(tag);

      // Extract id
      const idMatch = attrsStr.match(/id=["']([^"']+)["']/i);
      if (idMatch) child.id = idMatch[1];

      // Extract class
      const classMatch = attrsStr.match(/class=["']([^"']+)["']/i);
      if (classMatch) {
        classMatch[1].split(/\s+/).forEach(c => c && child.classList.add(c));
      }

      // Extract dataset (data-*)
      const dataRegex = /data-([a-z0-9-]+)=["']([^"']+)["']/gi;
      let dMatch;
      while ((dMatch = dataRegex.exec(attrsStr)) !== null) {
        const camel = dMatch[1].replace(/-([a-z])/g, (_, g) => g.toUpperCase());
        child.dataset[camel] = dMatch[2];
      }

      if (inner && !inner.includes("<")) {
        child._textContent = inner;
      } else if (inner) {
        child.innerHTML = inner;
      }
      this.appendChild(child);
    }
  }

  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  removeAttribute(k) { this.attributes.delete(k); }
  hasAttribute(k) { return this.attributes.has(k); }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) fn(event);
    return !event.defaultPrevented;
  }

  focus() { this._focused = true; }
  blur() { this._focused = false; }
  select() { this._selected = true; }
  scrollIntoView() {}

  getBoundingClientRect() {
    return {
      left: 100,
      top: 100,
      right: 680,
      bottom: 380,
      width: 580,
      height: 280
    };
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (matchesSelector(child, selector)) {
          results.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return results;
  }
}

function matchesSelector(el, selector) {
  if (selector.startsWith("#")) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith(".")) {
    const cls = selector.slice(1).split(".")[0];
    return el.classList?.contains?.(cls) || false;
  }
  if (el.tagName && selector.toLowerCase() === el.tagName.toLowerCase()) {
    return true;
  }
  if (selector.includes(".is-selected") && el.classList?.contains?.("is-selected")) {
    return true;
  }
  return false;
}

function createMockDocument() {
  const root = new MockElement("html");
  const body = new MockElement("body");
  root.appendChild(body);

  const doc = {
    body,
    documentElement: root,
    createElement: (tag) => new MockElement(tag),
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    addEventListener: (type, fn) => body.addEventListener(type, fn),
    removeEventListener: (type, fn) => body.removeEventListener(type, fn)
  };
  return doc;
}

export async function runSheetWatchWindowTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  try {
    const mockDoc = createMockDocument();
    globalThis.document = mockDoc;
    globalThis.window = {
      innerWidth: 1280,
      innerHeight: 800,
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    const containerEl = new MockElement("div");
    mockDoc.body.appendChild(containerEl);

    // =========================================================================
    // 1. Cấu trúc 6 cột chuẩn Excel & giao diện cửa sổ nổi
    // =========================================================================
    await test("Watch Window: Giao diện nổi có thể kéo, vai trò dialog, và đủ 6 cột chuẩn Excel", () => {
      const grid = new SheetGridController(containerEl, {
        documentName: "Bảng tính kiểm thử.xlsx"
      });
      grid.activeSheet = "Dự toán chi phí";
      grid.selectedCoord = { c: "A", r: 1 };

      const opened = grid.showWatchWindow();
      assert(opened === true, "showWatchWindow() phải trả về true");

      const win = mockDoc.querySelector("#vno-watch-window");
      assert(win, "Phải tạo phần tử #vno-watch-window trong DOM");
      assert(win.getAttribute("role") === "dialog", "Cửa sổ phải có role='dialog'");

      // Header kéo thả
      const header = win.querySelector("#vno-watch-header");
      assert(header, "Phải có thanh tiêu đề #vno-watch-header");

      // Nút Thêm và Xóa
      const addBtn = win.querySelector("#vno-watch-add");
      const delBtn = win.querySelector("#vno-watch-del");
      const closeBtn = win.querySelector("#vno-watch-close");
      assert(addBtn, "Phải có nút thêm #vno-watch-add");
      assert(delBtn, "Phải có nút xóa #vno-watch-del");
      assert(closeBtn, "Phải có nút đóng #vno-watch-close");

      // Bảng 6 cột chuẩn Excel: Sổ làm việc / Trang tính / Tên / Ô / Giá trị / Công thức
      const table = win.querySelector("table");
      assert(table, "Phải có bảng table trong watch window");
      const ths = win.querySelectorAll("th");
      assert(ths.length === 6, `Bảng phải có đúng 6 cột tiêu đề chuẩn Excel, thực tế: ${ths.length}`);

      const headerTexts = ths.map(th => th.textContent.trim());
      assert(headerTexts.some(t => t.includes("Sổ làm việc") || t.includes("Workbook") || t.includes("Book")), "Thiếu cột Sổ làm việc");
      assert(headerTexts.some(t => t.includes("Trang tính") || t.includes("Sheet")), "Thiếu cột Trang tính");
      assert(headerTexts.some(t => t.includes("Tên") || t.includes("Name")), "Thiếu cột Tên");
      assert(headerTexts.some(t => t.includes("Ô") || t.includes("Cell")), "Thiếu cột Ô");
      assert(headerTexts.some(t => t.includes("Giá trị") || t.includes("Value")), "Thiếu cột Giá trị");
      assert(headerTexts.some(t => t.includes("Công thức") || t.includes("Formula")), "Thiếu cột Công thức");
    });

    // =========================================================================
    // 2. Thêm và Xóa ô theo dõi (kể cả ô ở trang tính khác và dải ô)
    // =========================================================================
    await test("Watch Window: Thêm/Xóa ô theo dõi linh hoạt, hỗ trợ đa trang tính và dải ô", () => {
      const grid = new SheetGridController(containerEl, {
        documentName: "Kế hoạch 2026.xlsx"
      });
      grid.clearWatchedCells();

      // Thêm ô đơn trên sheet hiện tại
      grid.addWatchedCell("B5");
      let list = grid.getWatchedCellsList();
      assert(list.length === 1, "Thêm B5 thất bại");
      assert(list[0].cell === "B5" && list[0].sheet === grid.activeSheet, "Thông tin ô B5 sai");

      // Thêm ô ở trang tính khác (Kế hoạch Q3!C10)
      grid.addWatchedCell("Kế hoạch Q3!C10");
      list = grid.getWatchedCellsList();
      assert(list.length === 2, "Thêm ô ở sheet khác thất bại");
      const crossCell = list.find(item => item.sheet === "Kế hoạch Q3" && item.cell === "C10");
      assert(crossCell, "Không tìm thấy ô Kế hoạch Q3!C10 trong danh sách theo dõi");

      // Thêm ô dạng công thức Excel ='Nhân sự'!$D$4
      grid.addWatchedCell("='Nhân sự'!$D$4");
      list = grid.getWatchedCellsList();
      assert(list.length === 3, "Thêm ô dạng ='Nhân sự'!$D$4 thất bại");
      const d4Cell = list.find(item => item.sheet === "Nhân sự" && item.cell === "D4");
      assert(d4Cell, "Không tìm thấy ô Nhân sự!D4");

      // Thêm dải ô A1:A3
      grid.addWatchedCell("A1:A3");
      list = grid.getWatchedCellsList();
      assert(list.length === 6, `Thêm dải A1:A3 phải thêm 3 ô, tổng phải là 6, thực tế: ${list.length}`);

      // Xóa ô theo dõi
      grid.removeWatchedCell("Kế hoạch Q3!C10");
      list = grid.getWatchedCellsList();
      assert(list.length === 5, "Xóa ô Kế hoạch Q3!C10 thất bại");
      assert(!list.some(item => item.sheet === "Kế hoạch Q3" && item.cell === "C10"), "Ô xóa vẫn còn tồn tại");
    });

    // =========================================================================
    // 3. Tự động nhận diện Tên vùng (Defined Name) trong cột Tên
    // =========================================================================
    await test("Watch Window: Cột Tên tự động hiển thị tên vùng xác định (Named Range) của ô", () => {
      const grid = new SheetGridController(containerEl);
      grid.clearWatchedCells();

      // Đặt tên vùng DonGia cho C1:C5 (workbook scope)
      grid.saveNamedRange({ name: "DonGia", ref: "C1:C5", scope: "workbook" });
      // Đặt tên ô TongChi cho F8
      grid.saveNamedRange({ name: "TongChi", ref: "F8", scope: "workbook" });

      grid.addWatchedCell("C3");
      grid.addWatchedCell("F8");
      grid.addWatchedCell("A1"); // Không đặt tên

      const list = grid.getWatchedCellsList();
      const c3 = list.find(it => it.cell === "C3");
      const f8 = list.find(it => it.cell === "F8");
      const a1 = list.find(it => it.cell === "A1");

      assert(c3 && c3.name === "DonGia", `C3 nằm trong C1:C5 phải có tên 'DonGia', thực tế: '${c3?.name}'`);
      assert(f8 && f8.name === "TongChi", `F8 phải có tên 'TongChi', thực tế: '${f8?.name}'`);
      assert(a1 && a1.name === "", `A1 không có tên phải rỗng, thực tế: '${a1?.name}'`);
    });

    // =========================================================================
    // 4. Giá trị tự động cập nhật khi sửa ô
    // =========================================================================
    await test("Watch Window: Giá trị trong cửa sổ theo dõi tự động cập nhật ngay khi sửa ô hoặc tính lại", () => {
      const grid = new SheetGridController(containerEl);
      grid.showWatchWindow();
      grid.clearWatchedCells();

      grid.setCellValue("A", 1, 100);
      grid.setCellValue("B", 1, "=A1*2");
      grid.addWatchedCell("A1");
      grid.addWatchedCell("B1");

      let list = grid.getWatchedCellsList();
      assert(list.find(it => it.cell === "A1")?.value === 100, "Giá trị ban đầu A1 sai");
      assert(list.find(it => it.cell === "B1")?.value === 200, "Giá trị ban đầu B1 sai");

      // Sửa ô A1 lên 500 -> B1 phải thành 1000 và Watch Window phải cập nhật
      grid.setCellValue("A", 1, 500);
      list = grid.getWatchedCellsList();

      assert(list.find(it => it.cell === "A1")?.value === 500, "Watch Window chưa cập nhật A1 thành 500");
      assert(list.find(it => it.cell === "B1")?.value === 1000, "Watch Window chưa cập nhật B1 thành 1000");

      // Cập nhật ô ở trang tính khác
      grid.switchSheet("Kế hoạch Q3");
      grid.setCellValue("D", 2, "Hoàn tất");
      grid.addWatchedCell("Kế hoạch Q3!D2");
      list = grid.getWatchedCellsList();
      assert(list.find(it => it.cell === "D2" && it.sheet === "Kế hoạch Q3")?.value === "Hoàn tất", "Giá trị sheet khác sai");

      grid.switchSheet("Dự toán chi phí");
      // Dù đang ở sheet khác, giá trị ô D2 của Kế hoạch Q3 vẫn được phản ánh chính xác
      list = grid.getWatchedCellsList();
      assert(list.find(it => it.cell === "D2" && it.sheet === "Kế hoạch Q3")?.value === "Hoàn tất", "Mất giá trị sheet khác khi đổi sheet");
    });

    // =========================================================================
    // 5. Thao tác bàn phím & Phím tắt (Delete, ArrowUp/Down, Enter, Esc)
    // =========================================================================
    await test("Watch Window: Điều hướng bàn phím đầy đủ (Delete xóa, ArrowUp/Down chọn, Enter nhảy tới ô, Esc đóng)", () => {
      mockDoc.querySelector("#vno-watch-window")?.remove();
      const grid = new SheetGridController(containerEl);
      grid.showWatchWindow();
      grid.clearWatchedCells();

      grid.addWatchedCell("A1");
      grid.addWatchedCell("B2");
      grid.addWatchedCell("C3");

      const win = mockDoc.querySelector("#vno-watch-window");
      assert(win, "Thiếu cửa sổ watch window");

      // Phím ArrowDown chuyển dòng được chọn
      win.dispatchEvent({ type: "keydown", key: "ArrowDown", preventDefault: () => {} });
      let rows = win.querySelectorAll(".vno-watch-row");
      assert(rows[1].classList.contains("is-selected"), "ArrowDown phải chọn hàng thứ 2");

      // Phím Delete xóa hàng được chọn (B2)
      win.dispatchEvent({ type: "keydown", key: "Delete", target: win, preventDefault: () => {} });
      const remaining = grid.getWatchedCellsList();
      assert(remaining.length === 2, "Phím Delete phải xóa 1 hàng");
      assert(!remaining.some(it => it.cell === "B2"), "Hàng B2 chưa bị xóa");

      // Phím Enter điều hướng tới ô (C3)
      let selectedCalled = false;
      grid.selectCell = (col, row) => {
        if (col === "C" && row === 3) selectedCalled = true;
      };
      win.dispatchEvent({ type: "keydown", key: "Enter", target: win, preventDefault: () => {} });
      assert(selectedCalled, "Phím Enter phải kích hoạt chuyển tới ô C3");

      // Phím Escape đóng cửa sổ
      win.dispatchEvent({ type: "keydown", key: "Escape", preventDefault: () => {} });
      assert(win.style.display === "none", "Phím Escape phải ẩn cửa sổ (display: none)");
    });

    // =========================================================================
    // 6. Kéo thả cửa sổ nổi (Draggable)
    // =========================================================================
    await test("Watch Window: Thanh tiêu đề hỗ trợ mousedown/mousemove kéo cửa sổ trên màn hình", () => {
      const grid = new SheetGridController(containerEl);
      grid.showWatchWindow();
      const win = mockDoc.querySelector("#vno-watch-window");
      const header = win.querySelector("#vno-watch-header");

      // Mô phỏng kéo cửa sổ
      header.dispatchEvent({
        type: "mousedown",
        clientX: 150,
        clientY: 120,
        target: header,
        preventDefault: () => {}
      });

      mockDoc.body.dispatchEvent({
        type: "mousemove",
        clientX: 250,
        clientY: 220
      });

      mockDoc.body.dispatchEvent({
        type: "mouseup"
      });

      assert(win.style.left && win.style.left.includes("px"), "Sau khi kéo, style.left phải được cập nhật pixel");
      assert(win.style.top && win.style.top.includes("px"), "Sau khi kéo, style.top phải được cập nhật pixel");
    });

    // =========================================================================
    // 7. Command Bus integration (sheet.formula.watchWindow)
    // =========================================================================
    await test("Watch Window: Command Bus 'sheet.formula.watchWindow' mở/tắt cửa sổ thành công", async () => {
      mockDoc.querySelector("#vno-watch-window")?.remove();
      registerAllStandardCommands(globalCommandBus);
      const grid = new SheetGridController(containerEl);
      const adapter = new SheetAdapter(grid);
      adapter.attach();

      const executed1 = await globalCommandBus.execute("sheet.formula.watchWindow");
      assert(executed1 !== false, "execute('sheet.formula.watchWindow') lần 1 phải thành công");
      const win = mockDoc.querySelector("#vno-watch-window");
      assert(win && win.style.display !== "none", "Cửa sổ phải đang hiển thị sau lần 1");

      const executed2 = await globalCommandBus.execute("sheet.formula.watchWindow");
      assert(executed2 !== false, "execute('sheet.formula.watchWindow') lần 2 phải thành công");
      assert(win && win.style.display === "none", "Cửa sổ phải bị ẩn sau lần 2");
    });

    // =========================================================================
    // 8. Hộp thoại Thêm ô theo dõi (Add Watch Dialog)
    // =========================================================================
    await test("Watch Window: Nút '+ Thêm ô theo dõi' mở hộp thoại nhập tọa độ ô/dải ô", () => {
      mockDoc.querySelector("#vno-watch-window")?.remove();
      const grid = new SheetGridController(containerEl);
      grid.showWatchWindow();
      grid.clearWatchedCells();

      const win = mockDoc.querySelector("#vno-watch-window");
      const addBtn = win.querySelector("#vno-watch-add");

      // Bấm nút Thêm
      addBtn.dispatchEvent({ type: "click" });

      const dialog = win.querySelector("#vno-watch-add-dialog");
      assert(dialog, "Phải mở hộp thoại #vno-watch-add-dialog");
      const input = dialog.querySelector("#vno-watch-add-input");
      assert(input, "Phải có ô nhập #vno-watch-add-input");

      // Nhập ô mới
      input.value = "Kế hoạch Q3!E10";
      const confirmBtn = dialog.querySelector("#vno-watch-add-confirm");
      confirmBtn.dispatchEvent({ type: "click" });

      // Hộp thoại phải đóng và danh sách có ô mới
      assert(!win.querySelector("#vno-watch-add-dialog"), "Hộp thoại phải đóng sau khi Thêm");
      const list = grid.getWatchedCellsList();
      assert(list.some(it => it.sheet === "Kế hoạch Q3" && it.cell === "E10"), "Chưa thêm được ô Kế hoạch Q3!E10 qua hộp thoại");
    });

  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }

  return results;
}
