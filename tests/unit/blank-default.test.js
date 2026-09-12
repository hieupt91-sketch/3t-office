/**
 * VN Office — Unit tests: Mặc định trang trắng thật (Writer/Sheet/Slides)
 * Xác nhận: khởi động app KHÔNG truyền templateId → phải ra tài liệu/sheet/slide TRẮNG.
 * Xác nhận: templateId: "blank" → không seed nội dung mẫu.
 * Xác nhận: template demo vẫn tồn tại trong code (dùng khi người dùng chủ động chọn).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  test("Writer: writer-app.js có logic isBlank kiểm tra templateId === 'blank'", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/writer/writer-app.js"), "utf8");
    if (!src.includes('options.templateId === "blank"')) {
      throw new Error("writer-app.js thiếu kiểm tra templateId === 'blank'");
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
  test("Sheet: sheet-app.js truyền isBlank option cho SheetGridController", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-app.js"), "utf8");
    if (!src.includes("isBlank: options.templateId === \"blank\"")) {
      throw new Error("sheet-app.js không truyền isBlank cho grid");
    }
  });

  // ── Sheet: sheet-grid.js có cơ chế skip _populateInitialData ──
  test("Sheet: sheet-grid.js skip _populateInitialData khi isBlank=true", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/sheet/sheet-grid.js"), "utf8");
    if (!src.includes("this.isBlank = options.isBlank === true")) {
      throw new Error("sheet-grid.js thiếu thuộc tính isBlank");
    }
    if (!src.includes("if (!this.isBlank)")) {
      throw new Error("sheet-grid.js không skip _populateInitialData khi blank");
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
  test("Slides: slides-app.js có logic isBlank kiểm tra templateId === 'blank'", () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, "apps/slides/slides-app.js"), "utf8");
    if (!src.includes('options.templateId === "blank"')) {
      throw new Error("slides-app.js thiếu kiểm tra templateId === 'blank'");
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

  return results;
}
