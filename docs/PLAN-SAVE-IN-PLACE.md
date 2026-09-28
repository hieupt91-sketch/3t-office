# Kế hoạch thực hiện: Writer + Sheet — Ctrl+S lưu thẳng vào tệp đang mở và tôn trọng định dạng .doc/.xls (Save In Place)

Worktree: `E:\VNOffice-agy-save-in-place`  
Nhánh: `fix/save-in-place-agy`  
Tác giả: agy (coding agent)  
Ngày lập: 28/09/2026  
Tuân thủ: `AGENTS.md` (Mục 6 - Plan gate, Mục 2 - Non-negotiable, Mục 10 - Hướng dẫn sử dụng)

---

## 1. Mục tiêu (Objective)

1. **Ctrl+S / nút Lưu nhanh**:
   - Đối với tài liệu đã có đường dẫn (`sourcePath` ở Writer, `sourceFilePath` ở Sheet): lưu thẳng vào đường dẫn đó mà **không mở hộp thoại**, không làm gián đoạn người dùng bằng popup OK.
   - Hiển thị phản hồi nhẹ nhàng trên thanh trạng thái ("Đã lưu") thông qua `setStatus("Đã lưu")`.
   - Đặt lại cờ `isDirty = false`.
   - Nếu là tài liệu mới (chưa có đường dẫn / rỗng): tự động chuyển sang luồng **Lưu thành (Save As)**, mở hộp thoại chọn nơi lưu.

2. **Lưu thành / Lưu bản sao (Save As / F12 / Tệp → Lưu bản sao)**:
   - Luôn luôn mở hộp thoại lưu tệp native của hệ điều hành.
   - Nhận diện đúng loại tệp và filter theo phần mở rộng người dùng chọn hoặc gõ:
     - Writer: `.docx` (`MS Word 2007 XML`), `.doc` (`MS Word 97`), `.odt` (`writer8`), `.rtf` (`Rich Text Format`).
     - Sheet: `.xlsx` (`Calc MS Excel 2007 XML`), `.xls` (`MS Excel 97`), `.ods` (`calc8`), `.csv` (`Text - txt - csv (StarCalc)`).
     - Slides (ghi nhận): `.pptx` (`Impress MS PowerPoint 2007 XML`), `.odp` (`impress8`).
   - Đuôi tệp và byte nội dung **PHẢI khớp**: file `.doc` và `.xls` phải có magic bytes OLE2 `D0 CF 11 E0`, không được ghi byte ZIP PK của DOCX/XLSX.
   - Sau khi lưu thành công sang đường dẫn mới: cập nhật đường dẫn đang mở (`sourcePath` / `sourceFilePath`), tên hiển thị trên tab và tiêu đề cửa sổ, đặt `isDirty = false`.

3. **Tôn trọng tệp định dạng cũ (`.doc`/`.xls` — Chế độ tương thích)**:
   - Khi mở tệp `.doc` hoặc `.xls`, hệ thống lưu giữ định dạng gốc.
   - Khi bấm Ctrl+S, hệ thống lưu lại đúng định dạng cũ vào chính tệp đó (byte `D0 CF 11 E0`), không âm thầm chuyển đổi sang `.docx`/`.xlsx`.

4. **An toàn dữ liệu khi ghi đè (Atomic Replace)**:
   - Quy trình ghi tệp: convert ra tệp tạm trong thư mục tạm, thực hiện đầy đủ quy trình hậu kỳ độ trung thực (`_apply_native_export_postprocess`), sau đó thay thế nguyên tử bằng `os.replace` vào tệp đích.
   - Nếu LibreOffice convert lỗi hoặc tiến trình bị gián đoạn, tệp gốc không bị ảnh hưởng hay hư hỏng.
   - Nếu tệp bị khóa (đang mở bởi Word/Excel) hoặc chỉ đọc (read-only): bắt ngoại lệ, không làm sập ứng dụng, hiển thị thông báo lỗi tiếng Việt rõ ràng và đề xuất người dùng Lưu thành tệp khác.

5. **Giữ nguyên độ trung thực và tính tương thích**:
   - Mọi luồng lưu (lưu tại chỗ và lưu thành) đều phải đi qua `_apply_native_export_postprocess` với đầy đủ `source_path` để bảo toàn độ trung thực bố cục Word/Excel (khóa workbook, freeze panes, font theme, section headers/footers).
   - Cập nhật các script đo `_batch_writer.py` và `_roundtrip_save_sheet.py` để tương thích với hành vi mới (chuyển sang gọi `common.file.saveAs` khi script giả lập chọn file lưu `OUT`).

6. **Hướng dẫn sử dụng tiếng Việt (AGENTS.md mục 10)**:
   - Cập nhật bài Trợ giúp cho VN Writer và VN Sheet về Ctrl+S (Lưu tại chỗ), F12 (Lưu bản sao), và Chế độ tương thích định dạng cũ `.doc`/`.xls`.

---

## 2. Năng lực hiện tại & Hạn chế (Current Capability)

- `WriterAdapter.save()`: Luôn mở hộp thoại chọn nơi lưu (`globalUnoBridge.saveRealFile` -> `main.py:save_document_dialog`), luôn ép `target_format = "docx"`, luôn hiện dialog OK `showAlertDialog("Đã lưu")`. Chưa cập nhật `this._sourcePath` sau khi lưu.
- `SheetAdapter.save()`: Tương tự Writer, luôn mở hộp thoại lưu, luôn ép `target_format = "xlsx"`, luôn hiện `showAlertDialog`. `newDocument()` chưa xóa sạch `this.sourceFilePath`.
- `main.py`:
  - `FORMAT_FILTERS` thiếu `doc`, `rtf`, `xls`.
  - Chưa có hàm suy luận filter/định dạng từ phần mở rộng thực tế của đường dẫn đích.
  - `save_document_dialog` dùng `shutil.copyfile` ghi đè trực tiếp, chưa bảo vệ nguyên tử và chưa xử lý lỗi tệp chỉ đọc / bị khóa.
  - Chưa có API endpoint `save_document_in_place` cho pywebview.

---

## 3. Các tệp và mô-đun bị ảnh hưởng (Files & Modules)

1. `main.py`:
   - Cập nhật `FORMAT_FILTERS` bổ sung `"doc": "MS Word 97"`, `"rtf": "Rich Text Format"`, `"xls": "MS Excel 97"`.
   - Thêm `SAVE_FILE_TYPES` với các bộ lọc phần mở rộng phù hợp cho từng ứng dụng.
   - Thêm hàm `_detect_export_format_and_filter(dest_path, app_kind)`.
   - Thêm hàm `_atomic_replace_file(src_temp, dest_path)`.
   - Thêm method `save_document_in_place(content, app_kind, target_path, source_path)` trên `VnOfficeApi`.
   - Cập nhật `save_document_dialog` để xác định đúng định dạng đích từ extension người dùng đã chọn và áp dụng `_atomic_replace_file`.
2. `adapters/libreoffice/common/uno-bridge.js`:
   - Bổ sung `saveRealFileInPlace(appKind, content, targetPath, sourcePath)`.
   - Cập nhật `saveRealFile(appKind, content, targetFormat, suggestedName, sourcePath)`.
3. `adapters/libreoffice/writer/writer-adapter.js`:
   - Sửa `save()`: Nếu có `this._sourcePath`, gọi `saveRealFileInPlace`, đặt `isDirty = false`, cập nhật status bar "Đã lưu". Nếu chưa có đường dẫn, gọi `saveAs()`.
   - Sửa `saveAs()`: Luôn gọi `saveRealFile`, cập nhật `this._sourcePath = result.path`, cập nhật `this.sourceFileName`, `this.shell?.resetDocumentChrome`, `isDirty = false`.
   - Đảm bảo `this._sourcePath` được reset khi tạo mới tài liệu.
4. `adapters/libreoffice/sheet/sheet-adapter.js`:
   - Sửa `save()`: Nếu có `this.sourceFilePath`, gọi `saveRealFileInPlace`, đặt `isDirty = false`, cập nhật status bar "Đã lưu". Nếu chưa có, gọi `saveAs()`.
   - Sửa `saveAs()`: Luôn gọi `saveRealFile`, cập nhật `this.sourceFilePath = result.path`, `this.sourceFileName`, `resetDocumentChrome`, `isDirty = false`.
   - Sửa `newDocument()`: Reset `this.sourceFilePath = ""`.
5. `scripts/layout-audit/_batch_writer.py` & `scripts/layout-audit/_roundtrip_save_sheet.py`:
   - Cập nhật trigger lưu sang `common.file.saveAs` để khớp với mock `create_file_dialog = lambda *a, **k: OUT`.
6. `platform/help/entries-writer.js` & `platform/help/entries-sheet.js`:
   - Cập nhật hướng dẫn lưu tại chỗ Ctrl+S, lưu bản sao F12, định dạng .doc/.xls.
7. `tests/test_save_in_place.py`:
   - Unit tests kiểm tra:
     - Map đuôi tệp sang filter chính xác.
     - Cơ chế ghi đè an toàn `_atomic_replace_file`.
     - Lỗi convert không làm hỏng tệp gốc.
     - Xử lý tệp bị đặt quyền Read-Only (báo lỗi tiếng Việt, không hỏng tệp).

---

## 4. Phụ thuộc (Dependency)

- Không thêm thư viện ngoài (zero external dependencies).
- Tận dụng chuẩn có sẵn của Python (`os`, `stat`, `shutil`, `tempfile`, `pathlib`).
- LibreOffice headless engine (`soffice.exe`).

---

## 5. Rủi ro & Biện pháp giảm thiểu (Risks & Mitigations)

| Rủi ro | Mức độ | Biện pháp giảm thiểu |
|---|---|---|
| Mất nội dung tệp gốc nếu tiến trình convert/postprocess bị lỗi giữa chừng | Cao | Luôn convert và hậu kỳ trên thư mục tạm. Chỉ khi tệp đầu ra hợp lệ mới dùng `os.replace` thay thế nguyên tử. Tệp gốc không bị chạm tới nếu có lỗi. |
| Tệp đang bị khóa bởi Word/Excel hoặc có thuộc tính Read-Only | Trung bình | Bắt `PermissionError`/`OSError`, trả về mã lỗi và thông điệp tiếng Việt cụ thể, nhắc nhở người dùng đóng ứng dụng khác hoặc dùng Lưu bản sao (Save As). |
| Gãy luồng batch audit tự động | Cao | Đã phân tích chi tiết `_batch_writer.py` và `_roundtrip_save_sheet.py`: cập nhật sang `common.file.saveAs` khi kiểm tra ghi ra file `OUT` mới. |
| Người dùng lưu tệp không nhập đuôi mở rộng | Thấp | Tự động bổ sung đuôi mặc định (`.docx` cho Writer, `.xlsx` cho Sheet) nếu đường dẫn chưa có phần mở rộng. |

---

## 6. Kế hoạch kiểm thử (Test Plan)

1. **Python Unit Tests**:
   - `python -m unittest tests/test_save_in_place.py` (chạy độc lập, kiểm tra mọi nhánh logic lưu và an toàn dữ liệu).
2. **Suite Unit Tests**:
   - `node tests/run-tests.js` (1839 tests hiện hành đảm bảo không hồi quy).
   - `python -m unittest discover -s tests` (359 tests hiện hành đảm bảo không hồi quy).
3. **Live App Manual & Automation Verification**:
   - Writer: Mở file `.docx` thật -> chỉnh sửa -> nhấn Ctrl+S -> xác nhận không có dialog popup, status bar hiện "Đã lưu", tệp được cập nhật, Word COM mở thành công và có nội dung sửa.
   - Writer: Mở file copy `.doc` thật (`file test/lan-legacy/legacy02.doc`) -> sửa -> nhấn Ctrl+S -> kiểm tra byte đầu `D0 CF 11 E0`, Word mở được và có nội dung sửa.
   - Writer: Tạo tài liệu mới -> nhấn Ctrl+S -> xác nhận mở hộp thoại Lưu thành.
   - Sheet: Mở file `.xlsx` thật -> chỉnh sửa ô -> nhấn Ctrl+S -> xác nhận lưu tại chỗ không dialog, Excel mở được.
   - Sheet: Mở file copy `.xls` -> sửa ô -> Ctrl+S -> kiểm tra byte đầu `D0 CF 11 E0`, Excel mở được.
   - Sheet: Tạo bảng tính mới -> Lưu thành sang `.xls` -> kiểm tra byte đầu `D0 CF 11 E0`.
4. **Fidelity Regression Check**:
   - Chạy `python scripts/layout-audit/_batch_writer.py` trên 23 file docx (`E:\VN OFice\file test\landocx`).
   - Chạy `python scripts/layout-audit/_batch_audit.py` trên 26 file xlsx (`E:\VN OFice\file test\lan`).

---

## 7. Kế hoạch hoàn tác (Rollback Plan)

- Mọi thay đổi được commit theo từng bước nhỏ độc lập với tiền tố `fix(save): ...` trên nhánh riêng `fix/save-in-place-agy`.
- Nếu có lỗi phát sinh không thể khắc phục, có thể `git revert` từng commit cụ thể mà không ảnh hưởng tới các thành phần khác.
