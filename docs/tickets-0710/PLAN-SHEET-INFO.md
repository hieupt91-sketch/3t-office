# KẾ HOẠCH TRIỂN KHAI: THUỘC TÍNH TỆP (FILE INFO) & ĐÁNH DẤU LÀ CUỐI CÙNG CHO VN SHEET
## Plan Gate (AGENTS.md mục 6) — Phiếu AGY-SHEET-INFO

---

## 1. Mục tiêu (Objective)

Trang bị đầy đủ năng lực quản lý thông tin tệp (Document Properties) và chế độ "Đánh dấu là cuối cùng" (Mark as Final) cho VN Sheet, tương thích chuẩn OOXML của Excel 2016:
1. **Giao diện Tệp > Thông tin (Backstage của VN Sheet)**:
   - Hiển thị trực quan và cho phép CHỈNH SỬA đầy đủ 7 thuộc tính tệp chuẩn văn phòng:
     + Tiêu đề (`Title` -> `docProps/core.xml` `<dc:title>`)
     + Chủ đề (`Subject` -> `docProps/core.xml` `<dc:subject>`)
     + Tác giả (`Author` / `Creator` -> `docProps/core.xml` `<dc:creator>`)
     + Quản lý (`Manager` -> `docProps/app.xml` `<Manager>`)
     + Công ty (`Company` -> `docProps/app.xml` `<Company>`)
     + Thẻ (`Keywords` -> `docProps/core.xml` `<cp:keywords>`)
     + Ghi chú (`Comments` / `Description` -> `docProps/core.xml` `<dc:description>`)
   - Khi lưu tệp sang XLSX, ghi các thuộc tính vào đúng các phần XML tương ứng theo chuẩn OOXML.
   - Khi mở lại tệp XLSX trên VN Sheet hoặc ứng dụng ngoài (Excel 2016), đọc và hiển thị chuẩn xác các giá trị đã lưu.
2. **Nút "Đánh dấu là cuối cùng" (Mark as Final)**:
   - Cơ chế chỉ-đọc mềm (Soft Read-Only): hiển thị thanh thông báo màu vàng trên đầu ứng dụng kèm nút "Vẫn chỉnh sửa" (Edit Anyway) để gỡ bỏ.
   - Khóa soạn thảo trên bảng tính (không cho gõ vào ô, không cho sửa thanh công thức).
   - Ghi `cp:contentStatus="Final"` trong `docProps/core.xml` và `_MarkAsFinal=true` trong `docProps/custom.xml`.
   - Excel COM đọc được `Workbook.Final = True`. Khi gỡ đánh dấu, khôi phục quyền soạn thảo và Excel COM nhận `Workbook.Final = False`.
3. **Trợ giúp & Ngôn ngữ (Help & i18n)**:
   - Bài hướng dẫn sử dụng tiếng Việt chi tiết trong ứng dụng: chỉ rõ đường dẫn Tệp > Thông tin, các bước chỉnh sửa thuộc tính và đánh dấu bản cuối cùng.
   - Hỗ trợ song ngữ tiếng Việt và tiếng Anh (VI/EN).
   - Tuyệt đối không chứa tên thương mại cấm (Word, Excel, PowerPoint, Microsoft).

---

## 2. Hiện trạng (Current Capability)

- **VN Writer**: Đã hoàn thành trong phiếu WORD-W7 (commit `1e244173`), hỗ trợ 5 thuộc tính cơ bản trong `apps/writer/document-properties.js`, ghi `core.xml` và `custom.xml` trong `adapters/libreoffice/common/ooxml_zip_patch.py`.
- **VN Sheet**: Chưa có (`docs/EXCEL2016-FEATURE-CHECKLIST.md` còn đánh dấu 🔴 cho "Thuộc tính tệp" và "Kiểm tra tài liệu / Đánh dấu là cuối cùng").
- **Hạ tầng lưu XLSX**: Hàm `postprocess_sheet_xlsx` trong `ooxml_zip_patch.py` hiện tại xử lý khóa cấu trúc workbook, cố định dòng/cột (Freeze Panes), ẩn sâu (veryHidden), AutoFilter, Data Validation, Scenarios, Tables, nhưng CHƯA xử lý `docProps/core.xml`, `docProps/app.xml` và `docProps/custom.xml`.

---

## 3. Các tệp sẽ sửa đổi & tạo mới (Files & Modules)

1. **`apps/sheet/document-properties.js`** (Tạo mới):
   - Quản lý danh mục 7 thuộc tính: `title`, `subject`, `creator`, `manager`, `company`, `keywords`, `description`, cùng `contentStatus`.
   - Hàm `normalizeDocumentProperties()` kiểm soát giới hạn độ dài ký tự và ký tự điều khiển.
   - Hàm `parseCorePropertiesXml()` và `parseAppPropertiesXml()` phân tích XML từ OOXML.
   - Hàm `documentPropertiesMarker()` sinh comment marker `<!--vno-document-properties-hex:...-->`.
   - Hộp thoại `showDocumentPropertiesDialog()` với đầy đủ 7 trường nhập liệu, phím tắt Esc/Enter, bẫy Tab trợ năng.
2. **`adapters/libreoffice/common/ooxml_zip_patch.py`** (Sửa đổi):
   - **CHỈ sửa nhánh XLSX**: thêm hàm `postprocess_sheet_document_properties()` được gọi từ bên trong `postprocess_sheet_xlsx()`.
   - Phân tích metadata từ `source_fods` (nếu không có marker thì trả về nguyên bản `xlsx_bytes`, không chạm vào bất kỳ byte nào).
   - Cập nhật/tạo mới `docProps/core.xml` (title, subject, creator, keywords, description, contentStatus).
   - Cập nhật/tạo mới `docProps/app.xml` (Manager, Company) và đăng ký Override trong `[Content_Types].xml`, Relationship trong `_rels/.rels`.
   - Cập nhật/tạo mới `docProps/custom.xml` (`_MarkAsFinal`) khi `contentStatus == "Final"`, hoặc xóa `_MarkAsFinal` khi gỡ.
   - **Tuyệt đối KHÔNG chạm vào các hàm DOCX/PPTX**.
3. **`main.py`** (Sửa đổi):
   - Trong luồng mở tệp XLSX cho Sheet (`app_kind == "sheet"`), trích xuất `docProps/core.xml`, `docProps/app.xml`, `docProps/custom.xml` gửi vào payload cho renderer.
4. **`adapters/libreoffice/sheet/sheet-adapter.js`** (Sửa đổi):
   - Khởi tạo và lưu giữ `documentProperties` và cờ `isFinal`.
   - Cập nhật hàm `loadFromFods` / mở tệp để nhận `ooxmlCorePropertiesXml`, `ooxmlAppPropertiesXml`, `ooxmlCustomPropertiesXml`.
   - Hàm `markAsFinal(enable)` và `unmarkFinal()`.
   - Hàm `openDocumentPropertiesDialog()`.
   - Trong `serializeToFods()`, gắn marker `documentPropertiesMarker(this.documentProperties)` vào FODS.
5. **`apps/sheet/sheet-grid.js`** (Sửa đổi):
   - Thêm kiểm tra `isFinal` trong `_guardProtectedMutation()` và cơ chế bảo vệ mềm: khi `isFinal = true`, chặn nhập ô, đặt `formulaInput.readOnly = true`.
6. **`platform/shell/app-shell.js`** (Sửa đổi):
   - Cập nhật `_renderBackstageInfoPanel()` để hiển thị đầy đủ 7 thuộc tính cho Sheet (Chủ đề, Quản lý, Công ty, Thẻ, Ghi chú bên cạnh Tiêu đề, Tác giả, Ngày tạo, Ngày sửa đổi).
7. **`platform/commands/command-definitions.js`** (Sửa đổi):
   - Đăng ký lệnh `sheet.file.properties` và `sheet.file.markAsFinal`.
8. **`platform/i18n/strings-vi.js` & `strings-en.js`** (Sửa đổi):
   - Bổ sung chuỗi song ngữ VI/EN cho thuộc tính tệp và đánh dấu cuối cùng của Sheet, không chứa từ cấm.
9. **`platform/help/entries-sheet.js`** (Sửa đổi):
   - Thêm bài hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng Thuộc tính tệp và Đánh dấu là cuối cùng trong Sheet.
10. **`docs/EXCEL2016-FEATURE-CHECKLIST.md`** (Sửa đổi):
    - Đổi trạng thái từ 🔴 sang 🟢/✅ cho 2 mục liên quan.
11. **`tests/unit/sheet-file-info.test.js` & `tests/run-tests.js`** (Tạo mới & đăng ký):
    - Kiểm thử unit test cho hàm chuẩn hóa, phân tích XML, kiểm tra đăng ký command, i18n, help.
12. **`tests/live/cdp/sheet-file-info.desktop.mjs`** (Tạo mới):
    - Kiểm thử desktop CDP trực tiếp trên ứng dụng: sửa thuộc tính, lưu XLSX, mở lại kiểm tra, xác thực Excel 2016 COM ReadOnly đọc `BuiltinDocumentProperties` và `Final = True/False`.

---

## 4. Phân tích Rủi ro & Giải pháp Kiểm soát (Risks & Mitigations)

| Rủi ro | Mức độ | Biện pháp kiểm soát |
|---|---|---|
| Làm lệch cấu trúc ZIP của các tệp XLSX hiện có trong lô audit 10 tệp LAN | Cao | Nếu `source_fods` không có marker thuộc tính thì `postprocess_sheet_document_properties` trả về ngay lập tức không can thiệp. Chạy linter `_xlsx_lint.py` và `_xlsx_parts_lint.py` để bảo đảm chuẩn hóa XML. |
| Thao tác COM Excel treo hoặc gây rò rỉ tiến trình | Trung bình | Sử dụng khối try/finally nghiêm ngặt với `FinalReleaseComObject`, gọi garbage collection `[GC]::Collect()`, không đóng/kill theo tên mà chỉ theo PID chính xác nếu cần. |
| Chứa tên thương mại bị cấm trong tài liệu/i18n | Thấp | Kiểm tra tự động bằng regex cấm `/(Microsoft|Word|Excel|PowerPoint)/i` trong unit test. |
| Xung đột phím tắt hoặc thanh công thức bị khóa cứng | Thấp | Gỡ khóa hoàn toàn khi người dùng nhấp "Vẫn chỉnh sửa" (`unmarkFinal`). |

---

## 5. Kế hoạch Kiểm định (Test & Verification Plan)

1. `npm test` đạt 100% (3360/3360 baseline + các test mới, không hồi quy).
2. Chạy bài CDP desktop `tests/live/cdp/sheet-file-info.desktop.mjs` đạt 100% PASS trên môi trường thật.
3. Chạy lô audit 10 tệp LAN:
   `$env:VNO_AUDIT_MARK_DIRTY="1"; python scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-agy-sinfo lan01 lan02 lan04 lan06 lan09 lan11 lan22 lan26 lan13 lan19 .xlsx`
   Yêu cầu: tất cả 10 tệp đạt `PASS diffs=0 excel=PASS`.
4. Chạy kiểm tra cache công thức:
   `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --file lan28` (≥ 98,18%), `lan01` (100%), `lan04` (100%).

---

## 6. Kế hoạch Hoàn tác (Rollback Plan)

Nếu phát sinh lỗi nghiêm trọng ảnh hưởng đến đường lưu XLSX của hệ thống, khôi phục lại mã nguồn thông qua Git:
`git checkout main -- adapters/libreoffice/common/ooxml_zip_patch.py main.py adapters/libreoffice/sheet/`
Xóa các tệp mới tạo và đưa codebase về trạng thái sạch ban đầu.
