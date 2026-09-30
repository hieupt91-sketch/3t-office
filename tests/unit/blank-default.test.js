/**
 * VN Office — Unit tests: Mặc định trang trắng thật (Writer/Sheet/Slides)
 * Xác nhận: khởi động app KHÔNG truyền templateId → phải ra tài liệu/sheet/slide TRẮNG.
 * Xác nhận: templateId: "blank" → không seed nội dung mẫu.
 * Xác nhận: template demo vẫn tồn tại trong code (dùng khi người dùng chủ động chọn).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const DEMO_KEYWORDS_WRITER = [
  "QUYẾT ĐỊNH",
  "ỦY BAN NHÂN DÂN",
  "UBND",
  "số 26/QĐ-UBND",
  "Trần Văn Nam"
];

const DEMO_KEYWORDS_SHEET = [
  "BẢNG DỰ TOÁN KINH PHÍ PHÁT TRIỂN VN OFFICE 2026",
  "Thiết kế giao diện thuần Việt",
  "Tích hợp lõi xử lý văn bản"
];

const DEMO_KEYWORDS_SLIDES = [
  "BÁO CÁO ĐỀ ÁN PHÁT TRIỂN VN OFFICE 2026",
  "KIẾN TRÚC HỆ THỐNG PHÂN TẦNG",
  "KẾ HOẠCH TRIỂN KHAI"
];

export async function runBlankDefaultTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // ── Writer: index.html phải truyền templateId: "blank" ──
  test("Writer: index.html passes templateId:blank to switchApp", () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    if (!html.includes('templateId: "blank"')) {
      throw new Error("index.html không truyền templateId: 'blank' cho switchApp");
    }
  });

  // ── Writer: writer-app.js xử lý isBlank đúng ──
  test("Writer: startup mặc định dùng tài liệu trống và đặt con trỏ ở đoạn đầu", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/writer/writer-app.js"), "utf8");
    if (!src.includes('options.templateId || "blank"') || !src.includes("body.innerHTML = `<p><br></p>`")) {
      throw new Error("Writer phải mặc định là trang trống với một đoạn văn đầu tiên");
    }
    if (!src.includes("range.collapse(true)")) {
      throw new Error("Con trỏ Writer phải được đặt ở đầu đoạn đầu tiên");
    }
    if (!src.includes('"Tài liệu 1.docx"')) {
      throw new Error("Tên mặc định của Writer phải là Tài liệu 1.docx");
    }
  });

  // ── Writer: nội dung mẫu vẫn tồn tại trong code (dùng khi user chọn template) ──
  test("Writer: demo content vẫn tồn tại trong nhánh else (template gallery)", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/writer/writer-app.js"), "utf8");
    if (!src.includes("QUYẾT ĐỊNH") || !src.includes("26/QĐ-UBND")) {
      throw new Error("Nội dung mẫu Writer đã bị xóa khỏi codebase");
    }
  });

  // ── Sheet: index.html phải truyền templateId: "blank" ──
  test("Sheet: index.html passes templateId:blank to switchApp", () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    if (!html.includes('templateId: "blank"')) {
      throw new Error("index.html không truyền templateId: 'blank' cho Sheet");
    }
  });

  // ── Sheet: sheet-app.js truyền isBlank cho grid ──
  test("Sheet: sheet-app.js mặc định mở sổ trắng và truyền template vào grid", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-app.js"), "utf8");
    if (!src.includes('options.templateId || "blank"') || !src.includes("isBlank,")) {
      throw new Error("sheet-app.js phải mặc định mở sổ trống và truyền isBlank cho grid");
    }
    if (!src.includes('"Bảng tính 1.xlsx"')) {
      throw new Error("Tên mặc định của Sheet phải là Bảng tính 1.xlsx");
    }
  });

  // ── Sheet: sheet-grid.js có cơ chế skip _populateInitialData ──
  test("Sheet: sheet-grid.js skip _populateInitialData khi isBlank=true", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-grid.js"), "utf8");
    if (!src.includes("this.isBlank = options.isBlank ?? (options.templateId !== \"budget_estimate\")")) {
      throw new Error("sheet-grid.js thiếu thuộc tính isBlank");
    }
    if (!src.includes("if (!this.isBlank)")) {
      throw new Error("sheet-grid.js không skip _populateInitialData khi blank");
    }
  });

  test("Sheet: workbook mới chỉ có Sheet1 trống, chọn A1; sheet thêm tự tăng số", () => {
    const container = { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
    const grid = new SheetGridController(container);
    if (grid.sheets.length !== 1 || grid.sheets[0] !== "Sheet1" || grid.activeSheet !== "Sheet1") {
      throw new Error(`Workbook mới phải chỉ có Sheet1; hiện có ${grid.sheets.join(", ")}`);
    }
    if (grid.cellsData.size !== 0 || grid.selectedCoord.c !== "A" || grid.selectedCoord.r !== 1) {
      throw new Error("Workbook mới phải rỗng và chọn ô A1");
    }
    if (grid.addSheet() !== "Sheet2" || grid.addSheet() !== "Sheet3") {
      throw new Error("Tên trang tính mới phải tăng từ Sheet2, Sheet3");
    }
  });

  // ── Sheet: không còn hack xóa DOM thủ công ──
  test("Sheet: sheet-app.js không còn hack cellsData.clear() + DOM textContent clear", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-app.js"), "utf8");
    if (src.includes("cellsData.clear()")) {
      throw new Error("sheet-app.js vẫn còn cellsData.clear() hack");
    }
    if (src.includes('querySelectorAll(".vno-grid-cell").forEach')) {
      throw new Error("sheet-app.js vẫn còn DOM textContent clear hack");
    }
  });

  // ── Slides: index.html phải truyền templateId: "blank" ──
  test("Slides: index.html passes templateId:blank to switchApp", () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    if (!html.includes('templateId: "blank"')) {
      throw new Error("index.html không truyền templateId: 'blank' cho Slides");
    }
  });

  // ── Slides: slides-app.js xử lý isBlank đúng ──
  test("Slides: slides-app.js mặc định mở bản trình chiếu trống và đánh số tài liệu", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/slides/slides-app.js"), "utf8");
    if (!src.includes('options.templateId || "blank"') || !src.includes('templateId === "blank"')) {
      throw new Error("Slides phải mặc định dùng nhánh trống");
    }
    if (!src.includes('"Bản trình chiếu 1.pptx"')) {
      throw new Error("Tên mặc định của Slides phải là Bản trình chiếu 1.pptx");
    }
    if (!src.includes("isBlankTemplate: isBlank")) {
      throw new Error("SlidesCanvasController phải nhận biết nhánh bản trình chiếu mới trống");
    }
    const canvasSource = fs.readFileSync(path.join(ROOT_DIR, "apps/slides/slides-canvas.js"), "utf8");
    if (!canvasSource.includes('title: ""') || !canvasSource.includes('body: ""')) {
      throw new Error("Slide mới chỉ được chứa khung tiêu đề và nội dung rỗng");
    }
    const css = fs.readFileSync(path.join(ROOT_DIR, "apps/slides/slides.css"), "utf8");
    if (!css.includes('content: attr(data-placeholder)')) {
      throw new Error("Gợi ý nhập liệu phải được vẽ bằng CSS, không lưu thành nội dung");
    }
    const canvasController = new SlidesCanvasController(null);
    if (canvasController.slides.length !== 1 || canvasController.slides[0].title || canvasController.slides[0].body || canvasController.slides[0].notes) {
      throw new Error("SlidesCanvasController mặc định phải có đúng một slide với nội dung rỗng");
    }
    if (canvasController.headerFooter.showSlideNumber || canvasController.headerFooter.showFooter || canvasController.masterTheme.showLogo || canvasController.masterTheme.showFooter) {
      throw new Error("Slide trống không được thêm số trang, chân trang hoặc logo mẫu vào bản in");
    }
  });

  // ── Slides: nội dung mẫu vẫn tồn tại trong code ──
  test("Slides: demo slide content vẫn tồn tại trong slides-canvas.js constructor (template gallery)", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/slides/slides-canvas.js"), "utf8");
    if (!src.includes("KIẾN TRÚC HỆ THỐNG") || !src.includes("KẾ HOẠCH TRIỂN KHAI")) {
      throw new Error("Nội dung mẫu Slides đã bị xóa khỏi slides-canvas.js");
    }
  });

  // ── index.html: truyền openInitialFile xuống app ──
  test("index.html: truyền openInitialFile info xuống switchApp", () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    if (!html.includes("openInitialFile: launchContext.openInitialFile")) {
      throw new Error("index.html không truyền openInitialFile info");
    }
  });

  // ── resetDocumentChrome đã được gọi sau Mở tệp thật cho cả 3 app ──
  test("Writer adapter: resetDocumentChrome được gọi sau Mở tệp thật", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "adapters/libreoffice/writer/writer-adapter.js"), "utf8");
    if (!src.includes("resetDocumentChrome")) {
      throw new Error("writer-adapter.js thiếu resetDocumentChrome");
    }
  });

  test("Sheet adapter: resetDocumentChrome được gọi sau Mở tệp thật", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "adapters/libreoffice/sheet/sheet-adapter.js"), "utf8");
    if (!src.includes("resetDocumentChrome")) {
      throw new Error("sheet-adapter.js thiếu resetDocumentChrome");
    }
  });

  test("Slides adapter: resetDocumentChrome được gọi sau Mở tệp thật", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "adapters/libreoffice/slides/slides-adapter.js"), "utf8");
    if (!src.includes("resetDocumentChrome")) {
      throw new Error("slides-adapter.js thiếu resetDocumentChrome");
    }
  });

  test("Save As: F12 và Ctrl+Shift+S đều được bind vào Lưu bản sao", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "platform/commands/command-definitions.js"), "utf8");
    if (!src.includes('shortcut: "F12"') || !src.includes('bind("Ctrl+Shift+S", "common.file.saveAs", "common")')) {
      throw new Error("Save As phải có cả F12 và Ctrl+Shift+S");
    }
  });

  return results;
}
