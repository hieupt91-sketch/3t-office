/**
 * Test Suite: Adapter UNO Mapping & Real Dispatch Behavior Verification
 * Kiểm thử hành vi thực thi (dispatch) thật của tầng Adapter, không chỉ so khớp tĩnh
 * Tuân thủ 01-architecture/COMMAND-ARCHITECTURE.md & AGENTS.md mục 8
 */

import { mapVnCommandToUno, getVnCommand, VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
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

  // Test Sheet undo/redo
  const sheetUndoRes = await sheetAdapter.handleDispatch(".uno:Undo", null, "common.edit.undo");
  const sheetRedoRes = await sheetAdapter.handleDispatch(".uno:Redo", null, "common.edit.redo");
  if (sheetUndoRes && sheetRedoRes && mockGrid.undoHistory.length === 1 && mockGrid.redoHistory.length === 1) {
    results.push({ name: "SheetAdapter Dispatch: Lệnh common.edit.undo và redo kích hoạt đúng lịch sử bảng tính", pass: true });
  } else {
    results.push({ name: "SheetAdapter Dispatch: Undo/Redo thất bại", pass: false });
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
