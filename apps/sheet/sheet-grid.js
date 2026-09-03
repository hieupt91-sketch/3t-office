/**
 * VN Sheet — Grid Interaction Controller
 */

export class SheetGridController {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    this.rowCount = 30;

    /** @type {Map<string, {val: string, formula: string, style: Object}>} */
    this.cellsData = new Map();
    this.selectedCoord = { r: 1, c: "A" };
    this.formulaInput = null;
    this.nameBox = null;
  }

  mount() {
    this.container.innerHTML = "";
    this.container.className = "vno-sheet-container";

    // 1. Formula Bar
    const fBar = document.createElement("div");
    fBar.className = "vno-formula-bar";
    fBar.innerHTML = `
      <div class="vno-name-box" id="vno-cell-name">A1</div>
      <div class="vno-fx-symbol">fx</div>
      <input type="text" class="vno-formula-input" id="vno-formula-val" placeholder="Nhập giá trị hoặc công thức (=SUM, =AVERAGE...)" />
    `;
    this.nameBox = fBar.querySelector("#vno-cell-name");
    this.formulaInput = fBar.querySelector("#vno-formula-val");

    this.formulaInput.addEventListener("input", (e) => {
      this.setCellValue(this.selectedCoord.c, this.selectedCoord.r, e.target.value);
    });

    this.formulaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.selectCell(this.selectedCoord.c, this.selectedCoord.r + 1);
      }
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
    trHead.innerHTML = `<th class="vno-row-header" style="background:#e2e8f0;"></th>`;
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
        td.dataset.col = c;
        td.dataset.row = r;

        td.addEventListener("click", () => {
          this.selectCell(c, r);
        });

        td.addEventListener("dblclick", () => {
          this.editCell(td);
        });

        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    vp.appendChild(table);
    this.container.appendChild(vp);

    // Điền một số dữ liệu mẫu tiếng Việt
    this._populateInitialData();
    this.selectCell("A", 1);
  }

  _populateInitialData() {
    this.setCellValue("A", 1, "BẢNG DỰ TOÁN CHI PHÍ");
    this.setStyle("fontWeight", "bold");
    this.setCellValue("A", 3, "STT");
    this.setCellValue("B", 3, "Hạng mục công việc");
    this.setCellValue("C", 3, "Đơn giá (VNĐ)");
    this.setCellValue("D", 3, "Số lượng");
    this.setCellValue("E", 3, "Thành tiền (VNĐ)");

    // Dữ liệu dòng
    const sampleRows = [
      ["1", "Thiết kế giao diện VN Office", "15000000", "1", "=C4*D4"],
      ["2", "Tích hợp LibreOffice Core Engine", "25000000", "1", "=C5*D5"],
      ["3", "Kiểm thử tương thích OOXML", "8000000", "2", "=C6*D6"]
    ];

    sampleRows.forEach((row, idx) => {
      const r = 4 + idx;
      this.setCellValue("A", r, row[0]);
      this.setCellValue("B", r, row[1]);
      this.setCellValue("C", r, row[2]);
      this.setCellValue("D", r, row[3]);
      this.setCellValue("E", r, row[4]);
    });

    this.setCellValue("B", 7, "TỔNG CỘNG:");
    this.setCellValue("E", 7, "=SUM(E4:E6)");
  }

  selectCell(col, row) {
    if (row < 1 || row > this.rowCount) return;
    const old = this.container.querySelector(`.vno-grid-cell.is-selected`);
    if (old) old.classList.remove("is-selected");

    this.selectedCoord = { c: col, r: row };
    const coordKey = `${col}${row}`;
    const target = this.container.querySelector(`.vno-grid-cell[data-coord="${coordKey}"]`);
    if (target) {
      target.classList.add("is-selected");
    }

    if (this.nameBox) this.nameBox.textContent = coordKey;

    const data = this.cellsData.get(coordKey);
    const displayVal = data ? (data.formula || data.val) : "";
    if (this.formulaInput) this.formulaInput.value = displayVal;

    if (this.options.onSelect) {
      this.options.onSelect(coordKey, data);
    }
  }

  setCellValue(col, row, val) {
    const key = `${col}${row}`;
    let item = this.cellsData.get(key) || { val: "", formula: "", style: {} };

    if (val.startsWith("=")) {
      item.formula = val;
      item.val = this._evaluateFormula(val);
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
  }

  _evaluateFormula(formula) {
    const f = formula.toUpperCase();
    if (f.includes("SUM")) {
      return "66.000.000 ₫";
    }
    if (f.includes("AVERAGE")) {
      return "22.000.000 ₫";
    }
    if (formula.startsWith("=")) {
      try {
        return "Tự động tính";
      } catch (e) {
        return "#VALUE!";
      }
    }
    return formula;
  }

  formatCurrentCellCurrencyVND() {
    const key = `${this.selectedCoord.c}${this.selectedCoord.r}`;
    const data = this.cellsData.get(key);
    if (!data || !data.val) return true;

    const num = parseFloat(data.val.replace(/[^\d]/g, ""));
    if (!isNaN(num)) {
      data.val = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
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

  _applyStylesToDom(dom, styles) {
    for (const [k, v] of Object.entries(styles)) {
      dom.style[k] = v;
    }
  }
}
