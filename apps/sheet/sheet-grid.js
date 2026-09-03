/**
 * VN Sheet — Enterprise Grid Controller & Microsoft Formula Calculation Engine
 */

import { FormulaEngine, FUNCTION_CATALOG } from "./formula-engine.js";
import { SheetChartBuilder } from "./sheet-chart.js";

export class SheetGridController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    this.rowCount = 35;

    /** @type {Map<string, {val: string|number, formula: string, style: Object}>} */
    this.cellsData = new Map();
    this.formulaEngine = new FormulaEngine(this.cellsData);

    this.selectedCoord = { r: 1, c: "A" };
    this.sheets = ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"];
    this.activeSheet = "Dự toán chi phí";
  }

  mount() {
    this.container.innerHTML = "";
    this.container.className = "vno-sheet-container";

    // 1. Formula Bar
    const fBar = document.createElement("div");
    fBar.className = "vno-formula-bar";
    fBar.innerHTML = `
      <div class="vno-name-box" id="vno-cell-name">A1</div>
      <div class="vno-formula-actions">
        <button class="vno-formula-btn" title="Hủy bỏ (Esc)" id="vno-fx-cancel">✕</button>
        <button class="vno-formula-btn" title="Nhập (Enter)" id="vno-fx-ok">✓</button>
        <button class="vno-formula-btn vno-formula-btn-fx" title="Chèn hàm tính toán (fx)" id="vno-fx-insert">fx</button>
      </div>
      <input type="text" class="vno-formula-input" id="vno-formula-val" placeholder="Nhập giá trị hoặc công thức (ví dụ: =SUM(F4:F7), =AVERAGE(E4:E7)...)" />
    `;
    this.nameBox = fBar.querySelector("#vno-cell-name");
    this.formulaInput = fBar.querySelector("#vno-formula-val");

    this.formulaInput.addEventListener("input", (e) => {
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, e.target.value);
    });

    this.formulaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.selectCell(this.selectedCoord.c, this.selectedCoord.r + 1);
      } else if (e.key === "Escape") {
        const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
        const cur = this.cellsData.get(key);
        this.formulaInput.value = cur ? cur.val : "";
      }
    });

    fBar.querySelector("#vno-fx-cancel").addEventListener("click", () => {
      const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
      const cur = this.cellsData.get(key);
      this.formulaInput.value = cur ? cur.val : "";
    });

    fBar.querySelector("#vno-fx-ok").addEventListener("click", () => {
      this.selectCell(this.selectedCoord.c, this.selectedCoord.r + 1);
    });

    fBar.querySelector("#vno-fx-insert").addEventListener("click", () => {
      this.showFunctionDialog();
    });

    this.container.appendChild(fBar);

    // 2. Grid Table Viewport
    const vp = document.createElement("div");
    vp.className = "vno-grid-viewport";

    const table = document.createElement("table");
    table.className = "vno-grid-table";

    // Column Headers
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    trHead.innerHTML = `<th class="vno-grid-corner-header" title="Chọn tất cả (Ctrl+A)"></th>`;
    this.cols.forEach(col => {
      const th = document.createElement("th");
      th.className = "vno-col-header";
      th.textContent = col;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Rows
    const tbody = document.createElement("tbody");
    for (let r = 1; r <= this.rowCount; r++) {
      const tr = document.createElement("tr");
      const thRow = document.createElement("th");
      thRow.className = "vno-row-header";
      thRow.textContent = r;
      tr.appendChild(thRow);

      this.cols.forEach(c => {
        const td = document.createElement("td");
        td.className = "vno-grid-cell";
        td.dataset.coord = `${c}${r}`;

        td.addEventListener("click", () => {
          this.selectCell(c, r);
        });

        td.addEventListener("dblclick", () => {
          this.focusFormulaInput();
        });

        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    vp.appendChild(table);
    this.container.appendChild(vp);

    // 3. Sheet Tab Bar dưới đáy
    const tabBar = document.createElement("div");
    tabBar.className = "vno-sheet-tab-bar";
    tabBar.innerHTML = `
      <div class="vno-sheet-tab-scroll">
        <button class="vno-sheet-scroll-btn" title="Cuộn trái">◀</button>
        <button class="vno-sheet-scroll-btn" title="Cuộn phải">▶</button>
      </div>
      <div id="vno-sheet-tabs-list" style="display:flex;gap:3px;"></div>
      <button class="vno-sheet-add-btn" title="Thêm trang tính mới">+</button>
    `;

    const tabsListEl = tabBar.querySelector("#vno-sheet-tabs-list");
    this.sheets.forEach(s => {
      const tab = document.createElement("div");
      tab.className = `vno-sheet-tab-item ${s === this.activeSheet ? "is-active" : ""}`;
      tab.textContent = s;
      tab.addEventListener("click", () => {
        this.activeSheet = s;
        tabBar.querySelectorAll(".vno-sheet-tab-item").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
      });
      tabsListEl.appendChild(tab);
    });

    this.container.appendChild(tabBar);

    this._populateInitialData();
    this.selectCell("A", 1);
    this._bindGridKeyboardNavigation();
  }

  _bindGridKeyboardNavigation() {
    this.container.addEventListener("keydown", (e) => {
      if (document.activeElement === this.formulaInput) return;

      const colIdx = this.cols.indexOf(this.selectedCoord.c);
      let nextCol = this.selectedCoord.c;
      let nextRow = this.selectedCoord.r;

      if (e.key === "ArrowUp") nextRow = Math.max(1, nextRow - 1);
      else if (e.key === "ArrowDown" || e.key === "Enter") nextRow = Math.min(this.rowCount, nextRow + 1);
      else if (e.key === "ArrowLeft") nextCol = this.cols[Math.max(0, colIdx - 1)];
      else if (e.key === "ArrowRight" || e.key === "Tab") nextCol = this.cols[Math.min(this.cols.length - 1, colIdx + 1)];
      else if (e.key === "F2") {
        e.preventDefault();
        this.focusFormulaInput();
        return;
      } else return;

      e.preventDefault();
      this.selectCell(nextCol, nextRow);
    });
  }

  focusFormulaInput() {
    if (this.formulaInput) {
      this.formulaInput.focus();
      this.formulaInput.select();
    }
  }

  _populateInitialData() {
    this.setCellValue("A", 1, "BẢNG DỰ TOÁN KINH PHÍ PHÁT TRIỂN VN OFFICE 2026");
    this.setStyle("fontWeight", "bold");
    this.setStyle("fontSize", "14px");
    this.setStyle("color", "#0f6d38");

    const headers = [
      { col: "A", val: "STT" },
      { col: "B", val: "Hạng mục nhiệm vụ" },
      { col: "C", val: "Khối lượng" },
      { col: "D", val: "Đơn vị tính" },
      { col: "E", val: "Đơn giá (VNĐ)" },
      { col: "F", val: "Thành tiền (VNĐ)" }
    ];

    headers.forEach(h => {
      this.setCellValue(h.col, 3, h.val);
      this.selectedCoord = { c: h.col, r: 3 };
      this.setStyle("fontWeight", "bold");
      this.setStyle("backgroundColor", "#f1f5f9");
    });

    const rows = [
      ["1", "Thiết kế giao diện thuần Việt & UI Kit", "1", "Gói", "25.000.000 ₫", "25.000.000 ₫"],
      ["2", "Tích hợp lõi xử lý văn bản LibreOffice Core", "1", "Hệ thống", "45.000.000 ₫", "45.000.000 ₫"],
      ["3", "Xây dựng cầu nối UNO Bridge & Command Bus", "1", "Module", "30.000.000 ₫", "30.000.000 ₫"],
      ["4", "Bộ kiểm thử tương thích chuẩn OOXML", "2", "Đợt", "10.000.000 ₫", "20.000.000 ₫"]
    ];

    rows.forEach((rData, idx) => {
      const r = 4 + idx;
      this.setCellValue("A", r, rData[0]);
      this.setCellValue("B", r, rData[1]);
      this.setCellValue("C", r, rData[2]);
      this.setCellValue("D", r, rData[3]);
      this.setCellValue("E", r, rData[4]);
      this.setCellValue("F", r, rData[5]);
    });

    this.setCellValue("B", 8, "TỔNG CỘNG:");
    this.setCellValue("F", 8, "=SUM(F4:F7)");
    this.selectedCoord = { c: "B", r: 8 };
    this.setStyle("fontWeight", "bold");
    this.selectedCoord = { c: "F", r: 8 };
    this.setStyle("fontWeight", "bold");
    this.setStyle("color", "#0f6d38");
  }

  selectCell(col, row) {
    if (row < 1 || row > this.rowCount) return;
    const old = this.container.querySelector(`.vno-grid-cell.is-selected`);
    if (old) {
      old.classList.remove("is-selected");
      const handle = old.querySelector(".vno-cell-autofill-handle");
      if (handle) handle.remove();
    }

    this.selectedCoord = { c: col, r: row };
    const coordKey = `${col}${row}`;
    const target = this.container.querySelector(`.vno-grid-cell[data-coord="${coordKey}"]`);
    if (target) {
      target.classList.add("is-selected");
      const handle = document.createElement("div");
      handle.className = "vno-cell-autofill-handle";
      target.appendChild(handle);
    }

    if (this.nameBox) this.nameBox.textContent = coordKey;

    const data = this.cellsData.get(coordKey);
    const displayVal = data ? (data.formula || data.val) : "";
    if (this.formulaInput) this.formulaInput.value = displayVal;

    if (this.options.onSelect) {
      this.options.onSelect(coordKey, data, this._calculateStats());
    }
  }

  setCellValue(col, row, val) {
    const key = `${col}${row}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };

    if (typeof val === "string" && val.startsWith("=")) {
      item.formula = val;
      const calculated = this.formulaEngine.evaluate(val);
      if (typeof calculated === "number" && !val.toLowerCase().includes("count") && !val.toLowerCase().includes("len")) {
        item.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(calculated);
      } else {
        item.val = calculated;
      }
    } else {
      item.formula = "";
      item.val = val;
    }

    this.cellsData.set(key, item);

    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) {
      cell.textContent = item.val;
      this._applyStylesToDom(cell, item.style);
    }

    // Tự động tính toán lại các ô có công thức khác
    this._recalculateAllFormulas(key);
  }

  _recalculateAllFormulas(excludeKey) {
    for (const [k, itm] of this.cellsData.entries()) {
      if (k !== excludeKey && itm.formula) {
        const res = this.formulaEngine.evaluate(itm.formula);
        if (typeof res === "number" && !itm.formula.toLowerCase().includes("count")) {
          itm.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(res);
        } else {
          itm.val = res;
        }
        const dom = this.container.querySelector(`.vno-grid-cell[data-coord="${k}"]`);
        if (dom) dom.textContent = itm.val;
      }
    }
  }

  insertFormula(funcName = "SUM") {
    const col = this.selectedCoord.c;
    const r = this.selectedCoord.r;
    const startR = Math.max(1, r - 4);
    const endR = Math.max(1, r - 1);
    const formulaStr = `=${funcName}(${col}${startR}:${col}${endR})`;
    this.setCellValue(col, r, formulaStr);
    if (this.formulaInput) this.formulaInput.value = formulaStr;
    return true;
  }

  showFunctionDialog() {
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay";

    let selectedCat = "Tất cả";
    let selectedFunc = FUNCTION_CATALOG[0];

    const renderFuncList = () => {
      const listEl = modal.querySelector("#vno-func-list");
      listEl.innerHTML = "";

      const filtered = selectedCat === "Tất cả" 
        ? FUNCTION_CATALOG 
        : FUNCTION_CATALOG.filter(f => f.category === selectedCat);

      filtered.forEach((f, idx) => {
        const item = document.createElement("div");
        item.className = `vno-func-item ${f.name === selectedFunc.name ? "is-selected" : ""}`;
        item.style.cssText = `padding:6px 12px; cursor:pointer; font-size:12px; font-weight:600; font-family:monospace; border-radius:3px; background:${f.name === selectedFunc.name ? "#e7f4ec" : "transparent"}; color:${f.name === selectedFunc.name ? "#0f6d38" : "#0f172a"};`;
        item.textContent = f.name;

        item.addEventListener("click", () => {
          selectedFunc = f;
          renderFuncList();
          renderDesc();
        });
        listEl.appendChild(item);
      });
    };

    const renderDesc = () => {
      modal.querySelector("#vno-func-syntax").textContent = `=${selectedFunc.syntax}`;
      modal.querySelector("#vno-func-desc").textContent = selectedFunc.desc;
    };

    modal.innerHTML = `
      <div class="vno-dialog-box" style="width:580px;">
        <div class="vno-dialog-header">
          <span>Chèn Hàm (Insert Function fx)</span>
          <button class="vno-btn" id="vno-fx-close" style="font-size:16px;">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;font-weight:600;">Danh mục hàm:</span>
            <select class="vno-select" id="vno-func-cat-select" style="flex:1;">
              <option value="Tất cả">Tất cả các hàm</option>
              <option value="Toán học">Toán học & Lượng giác</option>
              <option value="Thống kê">Thống kê (AVERAGE, COUNT...)</option>
              <option value="Logic">Logic (IF, AND, OR...)</option>
              <option value="Văn bản">Văn bản (CONCAT, LEN...)</option>
              <option value="Ngày tháng">Ngày & Giờ (TODAY, NOW...)</option>
            </select>
          </div>

          <div style="display:flex;gap:12px;height:180px;">
            <div id="vno-func-list" style="width:180px;border:1px solid #cbd5e1;border-radius:4px;overflow-y:auto;padding:4px;"></div>
            <div style="flex:1;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:12px;display:flex;flex-direction:column;gap:8px;">
              <strong id="vno-func-syntax" style="font-family:monospace;color:#0f6d38;font-size:13px;"></strong>
              <p id="vno-func-desc" style="font-size:12px;color:#334155;line-height:1.5;"></p>
            </div>
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn" id="vno-fx-cancel-btn">Hủy bỏ</button>
          <button class="vno-btn vno-btn-primary" id="vno-fx-insert-btn">Chèn hàm vào ô</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    renderFuncList();
    renderDesc();

    const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    modal.querySelector("#vno-fx-close").addEventListener("click", close);
    modal.querySelector("#vno-fx-cancel-btn").addEventListener("click", close);

    modal.querySelector("#vno-func-cat-select").addEventListener("change", (e) => {
      selectedCat = e.target.value;
      const filtered = selectedCat === "Tất cả" 
        ? FUNCTION_CATALOG 
        : FUNCTION_CATALOG.filter(f => f.category === selectedCat);
      if (filtered[0]) selectedFunc = filtered[0];
      renderFuncList();
      renderDesc();
    });

    modal.querySelector("#vno-fx-insert-btn").addEventListener("click", () => {
      close();
      const template = `=${selectedFunc.syntax.replace(/\s*\[.*?\]/g, "")}`;
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, template);
      this.focusFormulaInput();
    });
  }

  openChartBuilder() {
    const dataItems = [
      { label: "Giao diện UI Kit", value: 25000000 },
      { label: "LibreOffice Core", value: 45000000 },
      { label: "UNO Bridge Bus", value: 30000000 },
      { label: "OOXML Test Suite", value: 20000000 }
    ];

    SheetChartBuilder.showChartModal(dataItems, (chartType) => {
      alert(`Đã tạo thành công ${chartType === "bar" ? "Biểu đồ Cột" : "Biểu đồ Tròn"} cho bảng tính!`);
    });
  }

  insertCurrentDate() {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, dateStr);
    return true;
  }

  formatCurrentCellCurrencyVND() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;

    const num = parseFloat(data.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
    if (!isNaN(num)) {
      data.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  formatCurrentCellPercent() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;
    const num = parseFloat(data.val.toString().replace(/[^\d.]/g, ""));
    if (!isNaN(num)) {
      data.val = `${num}%`;
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  formatCurrentCellStandard() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;
    const num = parseFloat(data.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
    if (!isNaN(num)) {
      data.val = new Intl.NumberFormat("vi-VN").format(num);
      this.cellsData.set(key, data);
      const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
      if (cell) cell.textContent = data.val;
    }
    return true;
  }

  setStyle(prop, val) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    item.style[prop] = val;
    this.cellsData.set(key, item);

    const cell = this.container.querySelector(`.vno-grid-cell[data-coord="${key}"]`);
    if (cell) cell.style[prop] = val;
    return true;
  }

  toggleStyle(prop, valOn, valOff) {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };
    const cur = item.style[prop];
    const next = cur === valOn ? valOff : valOn;
    return this.setStyle(prop, next);
  }

  _calculateStats() {
    let total = 0;
    let count = 0;
    for (const [k, itm] of this.cellsData.entries()) {
      if (itm.val && !itm.formula) {
        count++;
        const num = parseFloat(itm.val.toString().replace(/\./g, "").replace(/[^\d-]/g, ""));
        if (!isNaN(num)) total += num;
      }
    }
    const avg = count > 0 ? Math.round(total / count) : 0;
    return {
      count: count,
      sum: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total),
      avg: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(avg)
    };
  }

  _applyStylesToDom(dom, styles) {
    for (const [k, v] of Object.entries(styles)) {
      dom.style[k] = v;
    }
  }
}
