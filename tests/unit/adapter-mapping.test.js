/**
 * Test Suite: Adapter UNO Mapping & Real Dispatch Behavior Verification
 * Kiểm thử hành vi thực thi (dispatch) thật của tầng Adapter, không chỉ so khớp tĩnh
 * Tuân thủ 01-architecture/COMMAND-ARCHITECTURE.md & AGENTS.md mục 8
 */

import { mapVnCommandToUno, getVnCommand, VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

export async function runAdapterMappingTests() {
  const results = [];

  const mockWriterDom = {
    innerHTML: "<p>Nội dung ban đầu</p>",
    focus() {}
  };

  // Thiết lập môi trường DOM tối thiểu cho môi trường kiểm thử Node.js
  globalThis.document = {
    execCommand: (cmd, showUI, val) => {
      if (cmd === "insertHTML" && val) {
        mockWriterDom.innerHTML += val;
      }
      return true;
    },
    queryCommandState: () => true
  };

  // =========================================================================
  // PHẦN 1: Kiểm thử ánh xạ 2 chiều Command Bus <-> UNO URL (Mapping Contract)
  // =========================================================================
  const contractChecks = [
    { vn: "writer.text.bold", expectedUno: ".uno:Bold" },
    { vn: "writer.table.insert", expectedUno: ".uno:InsertTable" },
    { vn: "sheet.formula.sum", expectedUno: ".uno:AutoSum" },
    { vn: "sheet.format.currencyVND", expectedUno: ".uno:NumberFormatCurrency" },
    { vn: "slides.slide.new", expectedUno: ".uno:InsertPage" },
    { vn: "common.edit.undo", expectedUno: ".uno:Undo" },
    { vn: "common.edit.redo", expectedUno: ".uno:Redo" },
    { vn: "common.file.save", expectedUno: ".uno:Save" }
  ];

  for (const check of contractChecks) {
    const uno = mapVnCommandToUno(check.vn);
    const reverseVn = getVnCommand(check.expectedUno);
    if (uno === check.expectedUno && reverseVn) {
      results.push({ name: `Mapping 2 chiều: ${check.vn} <-> ${check.expectedUno}`, pass: true });
    } else {
      results.push({ name: `Mapping 2 chiều ${check.vn} thất bại`, pass: false });
    }
  }

  // =========================================================================
  // PHẦN 2: Kiểm thử hành vi Dispatch thật trên SheetAdapter
  // =========================================================================
  const mockGrid = {
    cellStyles: {},
    cellValues: {},
    undoHistory: [],
    redoHistory: [],
    selectedCoord: { c: "A", r: 1 },
    formulaInserted: null,
    dateInserted: false,
    toggleStyle(prop, onVal, offVal) {
      const cur = this.cellStyles[prop];
      this.cellStyles[prop] = cur === onVal ? offVal : onVal;
      return true;
    },
    setStyle(prop, val) {
      this.cellStyles[prop] = val;
      return true;
    },
    formatCurrentCellCurrencyVND() {
      this.cellValues["A1"] = "100.000.000 ₫";
      return true;
    },
    insertFormula(name) {
      this.formulaInserted = name;
      return true;
    },
    insertCurrentDate() {
      this.dateInserted = true;
      return true;
    },
    freezePanesCalled: false,
    toggleFreezePanes() {
      this.freezePanesCalled = true;
      return true;
    },
    sortCalled: null,
    sort(col, asc) {
      this.sortCalled = { col, asc };
      return true;
    },
    filterCalled: false,
    toggleFilter() {
      this.filterCalled = true;
      return true;
    },
    undo() {
      this.undoHistory.push("undo_called");
      return true;
    },
    redo() {
      this.redoHistory.push("redo_called");
      return true;
    }
  };

  const sheetAdapter = new SheetAdapter(mockGrid);

  // Test toggle bold
  const boldRes = await sheetAdapter.handleDispatch(".uno:Bold", null, "sheet.cell.bold");
  if (boldRes && mockGrid.cellStyles.fontWeight === "bold") {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.cell.bold chuyển đúng style fontWeight: bold", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.cell.bold thất bại", pass: false });
  }

  // Test formula SUM
  const sumRes = await sheetAdapter.handleDispatch(".uno:AutoSum", null, "sheet.formula.sum");
  if (sumRes && mockGrid.formulaInserted === "SUM") {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.formula.sum chèn đúng hàm SUM vào lưới", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.formula.sum thất bại", pass: false });
  }

  // Test insert date
  const dateRes = await sheetAdapter.handleDispatch(".uno:InsertCurrentDate", null, "sheet.insert.date");
  if (dateRes && mockGrid.dateInserted) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.insert.date chèn ngày hiện tại", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.insert.date thất bại", pass: false });
  }

  // Test format currency VND
  const currRes = await sheetAdapter.handleDispatch(".uno:NumberFormatCurrency", null, "sheet.format.currencyVND");
  if (currRes && mockGrid.cellValues["A1"] === "100.000.000 ₫") {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.format.currencyVND định dạng tiền tệ VNĐ", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.format.currencyVND thất bại", pass: false });
  }

  // Test Freeze Panes
  const freezeRes = await sheetAdapter.handleDispatch(".uno:FreezePanes", null, "sheet.view.freezePanes");
  if (freezeRes && mockGrid.freezePanesCalled) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.view.freezePanes kích hoạt toggleFreezePanes() thật", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.view.freezePanes thất bại", pass: false });
  }

  // Test Sort Ascending
  const sortAscRes = await sheetAdapter.handleDispatch(".uno:Sortup", null, "sheet.data.sortAsc");
  if (sortAscRes && mockGrid.sortCalled && mockGrid.sortCalled.asc === true) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.data.sortAsc kích hoạt sort(col, true) tăng dần thật", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.data.sortAsc thất bại", pass: false });
  }

  // Test Sort Descending
  const sortDescRes = await sheetAdapter.handleDispatch(".uno:Sortdown", null, "sheet.data.sortDesc");
  if (sortDescRes && mockGrid.sortCalled && mockGrid.sortCalled.asc === false) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.data.sortDesc kích hoạt sort(col, false) giảm dần thật", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.data.sortDesc thất bại", pass: false });
  }

  // Test Filter
  const filterRes = await sheetAdapter.handleDispatch(".uno:DataFilterAutoFilter", null, "sheet.data.filter");
  if (filterRes && mockGrid.filterCalled) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh sheet.data.filter kích hoạt toggleFilter() thật", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: sheet.data.filter thất bại", pass: false });
  }

  // Test Sheet undo/redo
  const sheetUndoRes = await sheetAdapter.handleDispatch(".uno:Undo", null, "common.edit.undo");
  const sheetRedoRes = await sheetAdapter.handleDispatch(".uno:Redo", null, "common.edit.redo");
  if (sheetUndoRes && sheetRedoRes && mockGrid.undoHistory.length === 1 && mockGrid.redoHistory.length === 1) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh common.edit.undo và redo kích hoạt đúng lịch sử bảng tính", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: Undo/Redo thất bại", pass: false });
  }

  // =========================================================================
  // PHẦN 2B: Kiểm thử hành vi thực tế trên SheetGridController
  // =========================================================================
  const dummyContainer = {
    innerHTML: "",
    className: "",
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  };
  const realGrid = new SheetGridController(dummyContainer);

  if (realGrid.cols.length === 26 && realGrid.cols[0] === "A" && realGrid.cols[25] === "Z") {
    results.push({ name: "SheetGrid Controller: Lưới mở rộng thành công 26 cột (A-Z)", pass: true });
  } else {
    results.push({ name: `SheetGrid Controller: Số cột sai (${realGrid.cols.length})`, pass: false });
  }

  if (realGrid.rowCount === 200) {
    results.push({ name: "SheetGrid Controller: Lưới mở rộng thành công 200 hàng dữ liệu", pass: true });
  } else {
    results.push({ name: `SheetGrid Controller: Số hàng sai (${realGrid.rowCount})`, pass: false });
  }

  // Freeze Panes toggle
  const freeze1 = realGrid.toggleFreezePanes();
  const freeze2 = realGrid.toggleFreezePanes();
  if (freeze1 === true && freeze2 === false) {
    results.push({ name: "SheetGrid Freeze Panes: Chuyển đổi trạng thái cố định hàng 1 / cột A thành công", pass: true });
  } else {
    results.push({ name: "SheetGrid Freeze Panes: Lỗi toggleFreezePanes()", pass: false });
  }

  // Sort & Undo
  realGrid.cellsData.set("A4", { val: 3, formula: "" });
  realGrid.cellsData.set("B4", { val: "Cam", formula: "" });
  realGrid.cellsData.set("A5", { val: 1, formula: "" });
  realGrid.cellsData.set("B5", { val: "Bưởi", formula: "" });
  realGrid.cellsData.set("A6", { val: 2, formula: "" });
  realGrid.cellsData.set("B6", { val: "Táo", formula: "" });

  realGrid.sort("A", true);
  const vA4 = realGrid.cellsData.get("A4")?.val;
  const vA5 = realGrid.cellsData.get("A5")?.val;
  const vA6 = realGrid.cellsData.get("A6")?.val;
  if (vA4 === 1 && vA5 === 2 && vA6 === 3) {
    results.push({ name: "SheetGrid Sort: Sắp xếp số tăng dần A-Z thành công (A4=1, A5=2, A6=3)", pass: true });
  } else {
    results.push({ name: `SheetGrid Sort: Lỗi sort số tăng dần (${vA4}, ${vA5}, ${vA6})`, pass: false });
  }

  realGrid.sort("B", false);
  const vB4 = realGrid.cellsData.get("B4")?.val;
  const vB6 = realGrid.cellsData.get("B6")?.val;
  if (vB4 === "Táo" && vB6 === "Bưởi") {
    results.push({ name: "SheetGrid Sort: Sắp xếp chữ giảm dần Z-A thành công (Táo -> Bưởi)", pass: true });
  } else {
    results.push({ name: `SheetGrid Sort: Lỗi sort chữ giảm dần (${vB4}, ${vB6})`, pass: false });
  }

  const undoSortRes = realGrid.undo();
  if (undoSortRes && realGrid.cellsData.get("A4")?.val === 1) {
    results.push({ name: "SheetGrid Sort Undo: Hoàn tác sắp xếp khôi phục đúng thứ tự ban đầu", pass: true });
  } else {
    results.push({ name: "SheetGrid Sort Undo: Lỗi hoàn tác", pass: false });
  }

  // Filter toggle
  const filt1 = realGrid.toggleFilter();
  const filt2 = realGrid.toggleFilter();
  if (filt1 === true && filt2 === false) {
    results.push({ name: "SheetGrid Filter: Bật/tắt chế độ lọc AutoFilter thành công", pass: true });
  } else {
    results.push({ name: "SheetGrid Filter: Lỗi toggleFilter()", pass: false });
  }

  // =========================================================================
  // PHẦN 3: Kiểm thử hành vi Dispatch thật trên SlidesAdapter
  // =========================================================================
  const mockCanvas = {
    slides: [
      { id: 1, title: "Trang 1", body: "Nội dung 1" },
      { id: 2, title: "Trang 2", body: "Nội dung 2" }
    ],
    bodyEl: { innerText: "Nội dung slide hiện tại" },
    _renderThumbnails() {},
    addNewSlide() {
      this.slides.push({ id: Date.now(), title: "Trang mới", body: "Nội dung mới" });
      return true;
    },
    duplicateCurrentSlide() {
      const cur = this.slides[0];
      this.slides.push({ id: Date.now(), title: `${cur.title} (Bản sao)`, body: cur.body });
      return true;
    },
    deleteCurrentSlide() {
      if (this.slides.length > 1) {
        this.slides.pop();
        return true;
      }
      return false;
    },
    undoCalled: false,
    redoCalled: false,
    undo() {
      this.undoCalled = true;
      return true;
    },
    redo() {
      this.redoCalled = true;
      return true;
    },
    masterDialogCalled: false,
    showSlideMasterDialog() {
      this.masterDialogCalled = true;
      return true;
    },
    transitionDialogCalled: false,
    showTransitionDialog() {
      this.transitionDialogCalled = true;
      return true;
    }
  };

  const slidesAdapter = new SlidesAdapter(mockCanvas);

  // Test thêm slide
  const initialSlideCount = mockCanvas.slides.length;
  const newSlideRes = await slidesAdapter.handleDispatch(".uno:InsertPage", null, "slides.slide.new");
  if (newSlideRes && mockCanvas.slides.length === initialSlideCount + 1) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.slide.new tạo thêm trang chiếu mới", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.slide.new thất bại", pass: false });
  }

  // Test nhân đôi slide
  const dupRes = await slidesAdapter.handleDispatch(".uno:DuplicatePage", null, "slides.slide.duplicate");
  const lastSlide = mockCanvas.slides[mockCanvas.slides.length - 1];
  if (dupRes && lastSlide.title.includes("(Bản sao)")) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.slide.duplicate tạo bản sao chính xác", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.slide.duplicate thất bại", pass: false });
  }

  // Test xóa slide
  const beforeDelCount = mockCanvas.slides.length;
  const delRes = await slidesAdapter.handleDispatch(".uno:DeletePage", null, "slides.slide.delete");
  if (delRes && mockCanvas.slides.length === beforeDelCount - 1) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.slide.delete xóa trang chiếu thành công", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.slide.delete thất bại", pass: false });
  }

  // Test Slide Master Dispatch
  const masterRes = await slidesAdapter.handleDispatch(".uno:MasterLayouts", null, "slides.master.apply");
  if (masterRes && mockCanvas.masterDialogCalled) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.master.apply kích hoạt showSlideMasterDialog() thật", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.master.apply thất bại", pass: false });
  }

  // Test Slide Transition Dispatch
  const transRes = await slidesAdapter.handleDispatch(".uno:SlideTransition", null, "slides.transition.apply");
  if (transRes && mockCanvas.transitionDialogCalled) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.transition.apply kích hoạt showTransitionDialog() thật", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.transition.apply thất bại", pass: false });
  }

  // Test Slides undo/redo
  const slidesUndoRes = await slidesAdapter.handleDispatch(".uno:Undo", null, "common.edit.undo");
  const slidesRedoRes = await slidesAdapter.handleDispatch(".uno:Redo", null, "common.edit.redo");
  if (slidesUndoRes && slidesRedoRes && mockCanvas.undoCalled && mockCanvas.redoCalled) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh common.edit.undo và redo điều phối đúng vào Canvas trình chiếu", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: Undo/Redo trình chiếu thất bại", pass: false });
  }

  // Test chèn hộp văn bản
  const textRes = await slidesAdapter.handleDispatch(".uno:Text", null, "slides.text.insert");
  if (textRes && mockCanvas.bodyEl.innerText.includes("Khung văn bản mới bổ sung")) {
    results.push({ name: "SlidesAdapter Dispatch: Lệnh slides.text.insert bổ sung văn bản vào slide", pass: true });
  } else {
    results.push({ name: "SlidesAdapter Dispatch: slides.text.insert thất bại", pass: false });
  }

  // =========================================================================
  // PHẦN 3B: Kiểm thử hành vi thực tế trên SlidesCanvasController
  // =========================================================================
  const dummySlidesContainer = {
    innerHTML: "",
    className: "",
    appendChild() {},
    querySelector() { return null; }
  };
  const realCanvas = new SlidesCanvasController(dummySlidesContainer);

  // Test applySlideMaster
  const masterApplyRes = realCanvas.applySlideMaster("corporate-red");
  if (masterApplyRes && realCanvas.masterTheme.accentColor === "#b53818" && realCanvas.masterTheme.fontFamily.includes("Times New Roman")) {
    results.push({ name: "SlidesCanvas Master: Áp dụng thành công Slide Master 'corporate-red' đồng bộ font và màu", pass: true });
  } else {
    results.push({ name: "SlidesCanvas Master: applySlideMaster thất bại", pass: false });
  }

  // Test setTransition
  const transSetRes = realCanvas.setTransition("zoom", 800, true);
  if (transSetRes && realCanvas.transitionConfig.type === "zoom" && realCanvas.slides[0].transition.duration === 800) {
    results.push({ name: "SlidesCanvas Transitions: Cấu hình kiểu chuyển trang 'zoom' và thời gian 800ms thành công", pass: true });
  } else {
    results.push({ name: "SlidesCanvas Transitions: setTransition thất bại", pass: false });
  }

  // =========================================================================
  // PHẦN 4: Kiểm thử hành vi Dispatch thật trên WriterAdapter
  // =========================================================================
  mockWriterDom.innerHTML = "<p>Nội dung ban đầu</p>";

  const writerAdapter = new WriterAdapter(mockWriterDom);

  // Test chèn bảng
  await writerAdapter.handleDispatch(".uno:InsertTable", null, "writer.table.insert");
  if (writerAdapter.isDirty && mockWriterDom.innerHTML.includes("<table") && mockWriterDom.innerHTML.includes("Tiêu đề")) {
    results.push({ name: "WriterAdapter Dispatch: Lệnh writer.table.insert chèn bảng HTML chuẩn vào DOM", pass: true });
  } else {
    results.push({ name: "WriterAdapter Dispatch: writer.table.insert thất bại", pass: false });
  }

  // Test phân tách trang (Page Break)
  await writerAdapter.handleDispatch(".uno:InsertPagebreak", null, "writer.page.break");
  if (mockWriterDom.innerHTML.includes("page-break-before")) {
    results.push({ name: "WriterAdapter Dispatch: Lệnh writer.page.break chèn phần tử ngắt trang chuẩn", pass: true });
  } else {
    results.push({ name: "WriterAdapter Dispatch: writer.page.break thất bại", pass: false });
  }

  // Test lưu tài liệu
  writerAdapter.isDirty = true;
  const origDesktop = globalUnoBridge.desktopApi;
  const origHasEngine = globalUnoBridge.hasRealEngine;
  globalUnoBridge.desktopApi = {
    save_document_dialog: async () => ({ status: "ok", message: "Đã lưu vào tệp kiểm thử" })
  };
  globalUnoBridge.hasRealEngine = true;

  await writerAdapter.handleDispatch(".uno:Save", null, "common.file.save");
  if (!writerAdapter.isDirty && writerAdapter.documentContent === mockWriterDom.innerHTML) {
    results.push({ name: "WriterAdapter Dispatch: Lệnh common.file.save lưu đồng bộ nội dung và xóa dirty flag", pass: true });
  } else {
    results.push({ name: "WriterAdapter Dispatch: common.file.save thất bại", pass: false });
  }

    globalUnoBridge.desktopApi = origDesktop;
    globalUnoBridge.hasRealEngine = origHasEngine;

    // Test Header / Footer / Styles / Format Painter trên DOM có đầy đủ các vùng zone
    const mockHeaderEl = { innerHTML: "", innerText: "", focus: () => {} };
    const mockBodyEl = { innerHTML: "<p>Nội dung chính</p>", innerText: "Nội dung chính", focus: () => {} };
    const mockFooterEl = { innerHTML: "", innerText: "", focus: () => {} };

    const structuredWriterDom = {
      innerHTML: "",
      querySelector: (sel) => {
        if (sel === ".vno-writer-header") return mockHeaderEl;
        if (sel === ".vno-writer-body") return mockBodyEl;
        if (sel === ".vno-writer-footer") return mockFooterEl;
        return null;
      },
      focus: () => {}
    };

    const structuredAdapter = new WriterAdapter(structuredWriterDom);

    // Test chèn Header
    await structuredAdapter.handleDispatch(".uno:InsertPageHeader", null, "writer.header.insert");
    if (mockHeaderEl.innerHTML.includes("Tiêu đề đầu trang")) {
      results.push({ name: "WriterAdapter Header: Lệnh writer.header.insert kích hoạt và điền nội dung vào header zone", pass: true });
    } else {
      results.push({ name: "WriterAdapter Header: writer.header.insert thất bại", pass: false });
    }

    // Test chèn Footer
    await structuredAdapter.handleDispatch(".uno:InsertPageFooter", null, "writer.footer.insert");
    if (mockFooterEl.innerHTML.includes("Trang 1 / 1")) {
      results.push({ name: "WriterAdapter Footer: Lệnh writer.footer.insert kích hoạt và điền nội dung vào footer zone", pass: true });
    } else {
      results.push({ name: "WriterAdapter Footer: writer.footer.insert thất bại", pass: false });
    }

    // Test _contentForExport() bao bọc title="header" và title="footer" cho LibreOffice
    mockHeaderEl.innerText = "Tiêu đề đầu trang";
    mockFooterEl.innerText = "Trang 1 / 1";
    const exportContent = structuredAdapter._contentForExport();
    if (exportContent.includes('<div title="header">') && exportContent.includes('<div title="footer">') && exportContent.includes("@page")) {
      results.push({ name: "WriterAdapter Export: _contentForExport đóng gói thẻ title='header', title='footer' và CSS @page", pass: true });
    } else {
      results.push({ name: "WriterAdapter Export: _contentForExport thiếu thẻ header/footer hoặc @page", pass: false });
    }

    // Test Styles nhanh
    let styleAppliedTag = null;
    const origExec = globalThis.document ? globalThis.document.execCommand : null;
    if (!globalThis.document) globalThis.document = {};
    globalThis.document.execCommand = (cmd, show, val) => {
      if (cmd === "formatBlock") styleAppliedTag = val;
      return true;
    };

    await structuredAdapter.handleDispatch(".uno:StyleApply", "h2", "writer.style.apply");
    if (styleAppliedTag === "<h2>") {
      results.push({ name: "WriterAdapter Styles: Lệnh writer.style.apply áp dụng định dạng Heading 2 (formatBlock <h2>)", pass: true });
    } else {
      results.push({ name: "WriterAdapter Styles: writer.style.apply thất bại", pass: false });
    }

    if (origExec) globalThis.document.execCommand = origExec;

    // Test Format Painter
    let painterToggled = false;
    structuredAdapter.copiedFormat = null;
    structuredAdapter._toggleFormatPainter = () => {
      structuredAdapter.copiedFormat = { fontWeight: "bold", color: "rgb(255, 0, 0)" };
      painterToggled = true;
      return true;
    };
    await structuredAdapter.handleDispatch(".uno:FormatPainter", null, "common.edit.formatPainter");
    if (painterToggled && structuredAdapter.copiedFormat.fontWeight === "bold") {
      results.push({ name: "WriterAdapter FormatPainter: Lệnh common.edit.formatPainter kích hoạt và lưu trữ định dạng", pass: true });
    } else {
      results.push({ name: "WriterAdapter FormatPainter: common.edit.formatPainter thất bại", pass: false });
    }

  // =========================================================================
  // PHẦN 5: Kiểm thử điều phối qua UNO Bridge (End-to-End Bridge Dispatch)
  // =========================================================================
  globalUnoBridge.attachDocument(sheetAdapter);
  const bridgeRes = await globalUnoBridge.dispatch(".uno:Bold", null, "sheet.cell.bold");
  if (bridgeRes && mockGrid.cellStyles.fontWeight === "normal") { // Toggle ngược lại từ "bold" -> "normal"
    results.push({ name: "UnoBridge E2E Dispatch: Bridge điều phối thành công lệnh tới tài liệu Sheet đang active", pass: true });
  } else {
    results.push({ name: "UnoBridge E2E Dispatch thất bại", pass: false });
  }

  globalUnoBridge.attachDocument(slidesAdapter);
  const beforeCountBridge = mockCanvas.slides.length;
  await globalUnoBridge.dispatch(".uno:InsertPage", null, "slides.slide.new");
  if (mockCanvas.slides.length === beforeCountBridge + 1) {
    results.push({ name: "UnoBridge E2E Dispatch: Chuyển active doc sang Slides điều phối đúng lệnh thêm slide", pass: true });
  } else {
    results.push({ name: "UnoBridge E2E Slides Dispatch thất bại", pass: false });
  }

  return results;
}
