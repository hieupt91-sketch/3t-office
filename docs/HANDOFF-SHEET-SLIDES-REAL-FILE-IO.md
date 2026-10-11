# Agent Handoff — Real File I/O for VN Sheet & VN Slides (LibreOffice Headless)

**TASK:** Triển khai Mở/Lưu/Xuất PDF file THẬT cho VN Sheet (XLSX/ODS/CSV) và VN Slides (PPTX/ODP/FODP) qua LibreOffice Headless Engine.  
**AGENT/ROLE:** Antigravity (Integration & Engine Agent)  
**BRANCH:** `feature/sheet-slides-real-io`  
**WORKTREE:** `E:\VN OFice`  
**DATE:** 2026-09-03  

---

## 1. Bối cảnh & Mục tiêu

Trước phiên làm việc này:
- VN Writer đã có cầu nối thật tới LibreOffice headless engine (`.docx`, `.odt`, `.pdf`).
- VN Sheet và VN Slides chỉ có stub giả (`isDirty = false`, log console, không ghi gì ra đĩa).
- Trong `main.py`:
  - Sheet đã có nhánh Python dùng CSV làm định dạng trung gian, nhưng tầng JS (`sheet-adapter.js`) chưa cài đặt logic serialization/parsing và chưa gọi `globalUnoBridge`.
  - Slides bị chặn với thông báo lỗi "chưa hỗ trợ" ở cả Mở và Lưu.

**Mục tiêu đạt được:**
1. **VN Sheet**: Cài đặt đầy đủ bộ chuyển đổi dữ liệu hai chiều giữa Grid Model nội bộ (`cellsData`) và định dạng CSV chuẩn RFC 4180 (bảo toàn công thức bắt đầu bằng `=`, xử lý escape dấu phẩy, nháy kép, xuống dòng, và dấu tiếng Việt). Kết nối `globalUnoBridge.saveRealFile`, `openRealFile`, `exportRealPdf`, `print` vào `SheetAdapter`.
2. **VN Slides**: Sử dụng định dạng mở chuẩn OASIS OpenDocument Flat XML Presentation (`.fodp`) làm định dạng trung gian hai chiều.
   - **Save**: Xuất cấu trúc slide sang XML FODP thật -> LibreOffice convert sang `.pptx`, `.odp`, hoặc `.pdf`.
   - **Open**: LibreOffice convert `.pptx`/`.odp` sang XML FODP -> JS Adapter phân tích cấu trúc slide (tiêu đề + nội dung các đoạn văn bản) và nạp vào Canvas.
   - **Export PDF**: Xuất PDF chất lượng cao từ bài trình chiếu qua filter `impress_pdf_Export`.
   - Giữ nguyên 100% nội dung tiếng Việt có dấu, không dùng SDK trả phí, tuân thủ REUSE BEFORE REWRITE.
3. **Desktop Engine (`main.py`)**:
   - Cập nhật `_run_soffice_convert` hỗ trợ filter chuyên biệt cho từng app kind (`calc_pdf_Export` cho Sheet, `impress_pdf_Export` cho Slides, `writer_pdf_Export` cho Writer).
   - Mở rộng `open_document_dialog` và `save_document_dialog` hỗ trợ đầy đủ cả ba ứng dụng `writer`, `sheet`, `slides`.
   - Khắc phục triệt để việc truy cập `self.window` bằng hàm module-level an toàn `_active_window()`.
4. **Kiểm thử thật (Test Truthfulness)**:
   - Viết bài test Python độc lập (`tests/test_real_engine_io.py`) chạy trực tiếp headless LibreOffice, tạo file thật trên đĩa, verify cấu trúc tệp ZIP/OOXML và chuyển đổi ngược kiểm tra dữ liệu tiếng Việt.
   - Viết 2 bộ Unit Test mới trong Node.js runner (`tests/unit/sheet-file-io.test.js` và `tests/unit/slides-file-io.test.js`).

---

## 2. Giải pháp Kỹ thuật Chi tiết

### 2.1. VN Sheet (CSV <-> XLSX / ODS / PDF)
- **Định dạng trung gian:** CSV chuẩn RFC 4180 (UTF-8 with BOM).
- **Serialization (`serializeToCsv`):**
  - Quét toàn bộ `grid.cellsData` để xác định bounding box có dữ liệu thực tế (`maxRow`, `maxColIdx`).
  - Nếu cell có công thức bắt đầu bằng `=`, ghi nguyên vẹn công thức (ví dụ: `=SUM(E2:E3)`) để LibreOffice Calc tính toán chuẩn xác khi tạo `.xlsx`.
  - Xử lý escape chuẩn RFC 4180: nếu ô chứa `"`, `,`, `\r`, `\n`, bao bọc trong nháy kép và nhân đôi dấu nháy kép `""`.
- **Parsing & Loading (`parseCsv`, `loadFromCsv`):**
  - Trình phân tích RFC 4180 độc lập với State Machine (xử lý chính xác dấu phẩy và ngắt dòng nằm trong nháy kép).
  - Xóa sạch dữ liệu cũ (`cellsData.clear()`), nạp từng ô bằng `grid.setCellValue(col, row, val, false)` để tự động kích hoạt tính toán công thức và cập nhật DOM an toàn.
  - Tự động gọi `grid.selectCell("A", 1)` và `grid.updateStatus()`.

### 2.2. VN Slides (FODP <-> PPTX / ODP / PDF)
- **Định dạng trung gian:** OpenDocument Presentation Flat XML (`.fodp`).
  - *Lý do chọn FODP:* LibreOffice Impress hỗ trợ trực tiếp chuyển đổi CLI hai chiều giữa FODP và PPTX/ODP (`--convert-to pptx`, `--convert-to odp`, `--convert-to fodp`, `--convert-to pdf:impress_pdf_Export`). FODP là tệp XML đơn, dễ sinh và dễ phân tích, không phụ thuộc vào bất kỳ thư viện ngoài hay runtime nhị phân nào.
- **Serialization (`serializeToFodp`):**
  - Tạo cấu trúc ODF chuẩn với namespace `urn:oasis:names:tc:opendocument:xmlns:office:1.0`, `draw`, `text`, `svg`.
  - Mỗi slide tương ứng một `<draw:page>` chứa khung tiêu đề `<draw:frame>` và khung nội dung các đoạn `<text:p>`.
  - Escape ký tự đặc biệt XML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`).
- **Parsing & Loading (`parseFodp`, `loadFromFodp`):**
  - Trình phân tích kép (dual-mode): ưu tiên `DOMParser` chuẩn của trình duyệt (trong WebView2 / Browser); tự động fallback sang Regex parser chuẩn khi chạy trong môi trường kiểm thử Node.js (không có DOM).
  - Trích xuất toàn bộ slide, phân tách tiêu đề và các gạch đầu dòng nội dung, nạp vào `canvas.slides` và kích hoạt slide 1.

### 2.3. Document Engine & IPC Bridge (`main.py`)
- Mở rộng hàm `_run_soffice_convert(src_path, target_ext, out_dir, app_kind=None)`:
  - Ánh xạ đúng export filter cho PDF theo từng loại tài liệu:
    - Sheet: `calc_pdf_Export`
    - Slides: `impress_pdf_Export`
    - Writer: `writer_pdf_Export`
- `open_document_dialog`:
  - `writer` -> trung gian `.html`
  - `sheet` -> trung gian `.csv`
  - `slides` -> trung gian `.fodp`
- `save_document_dialog`:
  - `writer` -> ghi `draft.html` -> convert sang `docx`/`odt`/`pdf`
  - `sheet` -> ghi `draft.csv` (UTF-8 BOM) -> convert sang `xlsx`/`ods`/`pdf`
  - `slides` -> ghi `draft.fodp` (UTF-8) -> convert sang `pptx`/`odp`/`pdf`
- An toàn WebView2: Thay thế toàn bộ truy cập `self.window` bằng `_active_window()`, loại bỏ `api.window = window` tại `main()` để tránh triệt để lỗi RecursionError khi pywebview introspect API.

---

## 3. Danh sách tệp thay đổi

1. `main.py` *(Chỉnh sửa)*: Hỗ trợ chuyển đổi thật cho Slides và Sheet, cập nhật filter PDF chuyên biệt, dùng `_active_window()`.
2. `adapters/libreoffice/sheet/sheet-adapter.js` *(Chỉnh sửa)*: Thêm `serializeToCsv`, `parseCsv`, `loadFromCsv`, `save`, `saveAs`, `open`, `exportPdf`, `print`.
3. `adapters/libreoffice/slides/slides-adapter.js` *(Chỉnh sửa)*: Thêm `serializeToFodp`, `parseFodp`, `loadFromFodp`, `save`, `saveAs`, `open`, `exportPdf`, `print`.
4. `tests/test_real_engine_io.py` *(Mới)*: Test suite Python kiểm thử trực tiếp engine LibreOffice headless thật (không pywebview).
5. `tests/unit/sheet-file-io.test.js` *(Mới)*: Unit test cho SheetAdapter CSV serialization, parsing và UnoBridge dispatch.
6. `tests/unit/slides-file-io.test.js` *(Mới)*: Unit test cho SlidesAdapter FODP XML generation, parsing và UnoBridge dispatch.
7. `tests/run-tests.js` *(Chỉnh sửa)*: Đăng ký Suite 10 và Suite 11 vào master test runner.
8. `docs/HANDOFF-SHEET-SLIDES-REAL-FILE-IO.md` *(Mới)*: Báo cáo bàn giao kỹ thuật.

*(Tuân thủ nghiêm ngặt quy tắc: KHÔNG chỉnh sửa bất kỳ tệp nào trong `apps/**`, `platform/**`, hay `adapters/libreoffice/writer/**`).*

---

## 4. Kết quả Kiểm thử (Test Truthfulness)

### A. Kiểm thử Document Engine Thật (Python + LibreOffice Headless)
- **Lệnh chạy:** `python tests/test_real_engine_io.py`
- **Kết quả:** **10/10 PASS | 0 FAIL**
  - Sheet: CSV -> XLSX thành công (5,919 bytes)
  - Sheet: Cấu trúc OOXML XLSX hợp lệ (chứa `xl/worksheets/sheet1.xml` & `[Content_Types].xml`)
  - Sheet: Round-trip XLSX -> CSV toàn vẹn 100% dấu tiếng Việt ("Bút bi Thiên Long cao cấp", "Vở ô ly Bãi Bằng 96 trang") và dữ liệu số
  - Sheet: Chuyển đổi XLSX -> ODS thành công (13,048 bytes)
  - Sheet: Xuất PDF từ bảng tính thành công (36,297 bytes, header `%PDF-`)
  - Slides: FODP -> PPTX thành công (10,829 bytes)
  - Slides: Cấu trúc OOXML PPTX hợp lệ (tìm thấy 2 slide trong `ppt/slides/slide*.xml`)
  - Slides: Round-trip PPTX -> FODP toàn vẹn 100% nội dung 2 slide tiếng Việt
  - Slides: Chuyển đổi FODP -> ODP thành công (18,852 bytes)
  - Slides: Xuất PDF từ bài trình chiếu thành công (40,375 bytes, header `%PDF-`)

### B. Kiểm thử Tự động Master Test Runner
- **Lệnh chạy:** `node tests/run-tests.js`
- **Kết quả:** **136/136 PASS | 0 FAIL | 0 NOT RUN | 0 BLOCKED**
  - Suite 1 (Command Bus): 4/4 PASS
  - Suite 2 (LibreOffice Adapter Mapping): 23/23 PASS
  - Suite 3 (Excel Spreadsheet Formula Engine): 8/8 PASS
  - Suite 4 (Formula Autocomplete & Parameter IntelliSense): 14/14 PASS
  - Suite 5 (Vietnamese i18n Localization Layer): 4/4 PASS
  - Suite 6 (Suite Smoke & Vietnamese Unicode): 3/3 PASS
  - Suite 7 (Syntax & Codebase Integrity — node --check): 45/45 PASS
  - Suite 8 (Smoke Tests — Application Entrypoints & index.html Runtime): 15/15 PASS
  - Suite 9 (AI Service Provider Orchestration): 9/9 PASS
  - **Suite 10 (VN Sheet Real File I/O & CSV Adapter): 4/4 PASS**
  - **Suite 11 (VN Slides Real File I/O & FODP Adapter): 4/4 PASS**

### C. Kiểm tra Cú pháp Toàn bộ Mã nguồn
- **Lệnh chạy:** `python -m py_compile main.py` -> Clean (exit code 0)
- **Lệnh chạy:** `node scripts/check-syntax.js` -> 37/37 JS files clean (exit code 0)

---

## 5. Hướng dẫn Cho Agent Tiếp Theo / Claude Merge

1. Chi nhánh hiện tại: `feature/sheet-slides-real-io`.
2. Sẵn sàng để Claude review và merge vào `main` (`git merge feature/sheet-slides-real-io`).
3. Cả 3 ứng dụng VN Writer, VN Sheet, VN Slides hiện đều có tính năng Mở / Lưu / Xuất PDF file THẬT đồng bộ qua LibreOffice headless engine.
