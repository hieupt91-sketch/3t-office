# Agent Handoff

TASK: Writer + Sheet: Ctrl+S lưu thẳng vào tệp đang mở như Word/Excel; tôn trọng định dạng .doc/.xls (TASK-BRIEF-SAVE-IN-PLACE-AGY.md)
AGENT/ROLE: agy (Antigravity Code Assistant)
BRANCH: fix/save-in-place-agy
WORKTREE: E:\VNOffice-agy-save-in-place
OBJECTIVE:
- Hiện thực hóa tính năng "Save-in-place" (Ctrl+S / Lưu) cho cả VN Writer và VN Sheet: khi tài liệu/bảng tính đã có đường dẫn gốc, lưu thẳng vào tệp đó mà không mở hộp thoại hay hỏi lại người dùng, đồng thời hiển thị thông báo nhẹ "Đã lưu" trên thanh trạng thái.
- Khi người dùng tạo tài liệu mới chưa có đường dẫn: Ctrl+S tự động chuyển tiếp sang "Lưu bản sao" (Save As) để hiển thị hộp thoại chọn vị trí và đặt tên tệp.
- Tôn trọng và bảo toàn tuyệt đối định dạng tệp cũ (.doc / Word 97-2003, .xls / Excel 97-2003): khi mở tệp .doc/.xls, phím Ctrl+S lưu lại đúng định dạng OLE2 nhị phân ban đầu (magic header `D0 CF 11 E0`), không âm thầm chuyển đổi sang OpenXML (.docx/.xlsx).
- Hỗ trợ Lưu bản sao (Save As / F12) sang các định dạng tương ứng: .docx, .doc (MS Word 97), .rtf (Rich Text Format), .odt cho Writer; .xlsx, .xls (MS Excel 97), .ods, .csv cho Sheet. Đảm bảo phần mở rộng và byte nội dung khớp 100%.
- Cơ chế ghi đè an toàn nguyên tử (atomic replace via staging file in destination folder): ghi ra tệp tạm trong cùng thư mục của tệp đích rồi thay thế nguyên tử (`os.replace`). Kiểm tra quyền ghi trước khi lưu, xử lý `PermissionError` (tệp đang bị khóa hoặc đặt thuộc tính Read-Only) và báo lỗi tiếng Việt rõ ràng, giữ nguyên tệp gốc không bị hỏng.
- Giữ nguyên toàn bộ pipeline độ trung thực hiện có (postprocess OOXML, source_path, header/footer/styles/drawing).

FINDINGS:
1. Trước khi sửa:
   - Cả `adapters/libreoffice/writer/writer-adapter.js` và `adapters/libreoffice/sheet/sheet-adapter.js` trong hàm `save()` đều gọi trực tiếp `this.saveAs()`, luôn mở hộp thoại lưu tệp mỗi lần bấm Ctrl+S.
   - Khi người dùng tự đặt tên đuôi `.doc` hoặc `.xls`, `main.py` chỉ có filter cho `docx`, `xlsx`, `html`, `pdf`, `fods`, `fodp`, `txt`. Mọi tệp `.doc` được lưu với filter DOCX (`MS Word 2007 XML`), sinh ra tệp ZIP mang magic `50 4B 03 04` nhưng có đuôi `.doc`, vi phạm chuẩn định dạng nhị phân Word 97-2003 (`D0 CF 11 E0`).
2. Tên filter LibreOffice chính xác trên Windows:
   - Word 97-2003 (.doc): `"MS Word 97"` -> sinh tệp OLE2 nhị phân magic `D0 CF 11 E0`.
   - Rich Text Format (.rtf): `"Rich Text Format"`.
   - Excel 97-2003 (.xls): `"MS Excel 97"` (chú ý: `"Calc MS Excel 97"` bị lỗi không nhận diện trên LibreOffice 25.2, filter chuẩn duy nhất là `"MS Excel 97"`) -> sinh tệp OLE2 nhị phân magic `D0 CF 11 E0`.
3. Kiểm thử với pywebview trên Windows:
   - `webview.start()` chỉ có thể khởi chạy một lần trên mỗi tiến trình Python do vòng lặp thông điệp giao diện Windows Forms/Edge WebView2. Khi thực hiện kiểm thử tự động nhiều kịch bản, mỗi phiên ứng dụng cần được chạy trong một tiến trình con (subprocess) độc lập để đảm bảo độ tin cậy tuyệt đối.
4. Trợ giúp trong ứng dụng:
   - Đã bổ sung đầy đủ hướng dẫn sử dụng tiếng Việt cho phím tắt Ctrl+S (Lưu tại chỗ), F12 (Lưu bản sao) và lưu ý chế độ tương thích cho tài liệu định dạng cũ (.doc, .xls) trong cả `platform/help/entries-writer.js` và `platform/help/entries-sheet.js`.

IMPLEMENTATION SUMMARY:
1. `docs/PLAN-SAVE-IN-PLACE.md`:
   - Lập kế hoạch chi tiết tuân thủ quy tắc AGENTS.md mục 6 (Plan gate) và commit trước khi can thiệp mã nguồn (`681b39d`).
2. `main.py`:
   - Bổ sung các bộ lọc vào `FORMAT_FILTERS`: `"doc": "MS Word 97"`, `"rtf": "Rich Text Format"`, `"xls": "MS Excel 97"`.
   - Cập nhật `SAVE_FILE_TYPES` cho Writer và Sheet bao gồm định dạng Word 97-2003 (*.doc) và Excel 97-2003 (*.xls).
   - Hàm `_infer_save_format_from_path(file_path, app_kind)` để suy đoán đúng định dạng từ phần mở rộng tệp.
   - Hàm `_atomic_replace_file(src_tmp, dest_path)`: kiểm tra thuộc tính Read-Only trước khi ghi, tạo tệp trung gian trong cùng thư mục đích để đảm bảo `os.replace` diễn ra trên cùng một phân vùng đĩa, xử lý ngoại lệ `PermissionError` kèm thông báo tiếng Việt.
   - Thêm API `save_document_in_place(self, content, app_kind="writer", target_path=None, source_path=None)` trên `VnOfficeApi`.
   - Cập nhật `save_document_dialog()` để suy luận định dạng từ đuôi tệp thực tế mà người dùng chọn hoặc nhập trong hộp thoại, sau đó ghi đè an toàn qua `_atomic_replace_file`.
3. `adapters/libreoffice/common/uno-bridge.js`:
   - Bổ sung phương thức `saveRealFileInPlace(appKind, content, targetPath, sourcePath)` giao tiếp với backend Python thông qua `window.pywebview.api.save_document_in_place`.
4. `adapters/libreoffice/writer/writer-adapter.js`:
   - Nâng cấp `save()`: nếu `this._sourcePath` tồn tại, gọi `globalUnoBridge.saveRealFileInPlace`, đặt trạng thái "Đã lưu", gán `isDirty = false`. Nếu chưa có đường dẫn gốc, chuyển tiếp sang `this.saveAs()`.
   - Nâng cấp `saveAs()`: gợi ý định dạng và đuôi tệp theo `this._sourcePath`, cập nhật lại `this._sourcePath`, cập nhật tab tài liệu và thanh trạng thái khi lưu thành công.
5. `adapters/libreoffice/sheet/sheet-adapter.js`:
   - Reset `this.sourceFilePath = ""` trong `newDocument()`.
   - Nâng cấp `save()` và `saveAs()` đồng bộ với Writer: lưu tại chỗ nếu có `this.sourceFilePath`, gọi `saveRealFileInPlace`, cập nhật trạng thái "Đã lưu", gán `isDirty = false`.
6. `scripts/layout-audit/_batch_writer.py` & `_roundtrip_save_sheet.py`:
   - Đổi lệnh gọi lưu từ `common.file.save` sang `common.file.saveAs` để mock `win.create_file_dialog` tiếp tục ghi vào đường dẫn `OUT` được chỉ định.
7. `platform/help/entries-writer.js` & `platform/help/entries-sheet.js`:
   - Bổ sung nội dung hướng dẫn chi tiết tiếng Việt về: Lưu nhanh tại chỗ (Ctrl+S), Lưu bản sao (F12), và Chế độ tương thích bảo toàn định dạng .doc/.xls.
8. `tests/test_save_in_place.py`:
   - Tạo bộ unit test Python bao phủ:
     + Ánh xạ định dạng .doc, .xls, .rtf.
     + Suy luận định dạng từ đường dẫn tệp.
     + Thay thế nguyên tử tệp tin.
     + Bảo vệ tệp chỉ đọc (Read-Only) và thông báo lỗi tiếng Việt.
     + Cô lập lỗi chuyển đổi: lỗi không làm mất hoặc thay đổi tệp gốc.
9. `scripts/test_live_save_in_place.py`:
   - Tạo bộ kiểm thử live tự động hóa 5 kịch bản thông qua giao diện thực tế (pywebview) và Microsoft Office COM:
     + Kịch bản 1: Live Writer lưu tại chỗ file .docx (không hiện dialog, mtime cập nhật, Word COM mở và tìm thấy nội dung sửa).
     + Kịch bản 2: Live Writer lưu tại chỗ file .doc cũ (không hiện dialog, OLE2 magic `D0 CF 11 E0` được bảo toàn, Word COM mở và tìm thấy nội dung sửa).
     + Kịch bản 3: Live Sheet lưu tại chỗ file .xlsx (không hiện dialog, mtime cập nhật, Excel COM mở và tìm thấy giá trị ô sửa).
     + Kịch bản 4: Live Sheet lưu tại chỗ file .xls cũ (không hiện dialog, OLE2 magic `D0 CF 11 E0` được bảo toàn, Excel COM mở và tìm thấy giá trị ô sửa).
     + Kịch bản 5: Lưu thành .doc và .xls từ tài liệu mới tạo (OLE2 magic `D0 CF 11 E0`, Word/Excel COM mở thành công).

FILES CHANGED:
- `docs/PLAN-SAVE-IN-PLACE.md` (tạo mới)
- `main.py` (chỉnh sửa hàm lưu, bổ sung filter, atomic replace, save_document_in_place)
- `adapters/libreoffice/common/uno-bridge.js` (bổ sung saveRealFileInPlace)
- `adapters/libreoffice/writer/writer-adapter.js` (cập nhật save và saveAs)
- `adapters/libreoffice/sheet/sheet-adapter.js` (cập nhật save, saveAs, newDocument)
- `scripts/layout-audit/_batch_writer.py` (cập nhật saveAs cho luồng batch audit)
- `scripts/layout-audit/_roundtrip_save_sheet.py` (cập nhật saveAs cho luồng batch audit)
- `platform/help/entries-writer.js` (hướng dẫn tiếng Việt Ctrl+S, F12, .doc)
- `platform/help/entries-sheet.js` (hướng dẫn tiếng Việt Ctrl+S, F12, .xls)
- `tests/test_save_in_place.py` (tạo mới unit test Python)
- `scripts/test_live_save_in_place.py` (tạo mới live test e2e script)
- `docs/HANDOFF-SAVE-IN-PLACE.md` (tạo mới handoff)

COMMANDS RUN:
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"; python -m unittest tests/test_save_in_place.py`
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"; python scripts/test_live_save_in_place.py`
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"; python scripts/layout-audit/_batch_writer.py "E:\VNOffice-agy-save-in-place" "E:\VN OFice\file test\landocx" "E:\VNOffice-agy-save-in-place\audit_writer_out" d01.docx ... d24.docx` (23 files omitting d10)
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"; python scripts/layout-audit/_batch_audit.py "E:\VNOffice-agy-save-in-place" lan01.xlsx ... lan28.xlsx` (26 files omitting lan06, lan14)
- `node tests/run-tests.js`
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"; python -m unittest discover -s tests`

BUILD RESULT:
- PASS (Clean working tree, không có build error hay linter error).

TEST RESULTS:
1. Python Unit Tests (`tests/test_save_in_place.py`):
   - 5/5 PASS (Filter mapping, extension inference, atomic replace, read-only protection, conversion error isolation).
2. Live End-to-End Suite (`scripts/test_live_save_in_place.py`):
   - [1/5] Writer .docx Save-in-place: PASS (No dialog, file mtime updated, Word COM verified).
   - [2/5] Writer .doc Legacy Save-in-place: PASS (No dialog, magic `D0 CF 11 E0`, Word COM verified).
   - [3/5] Sheet .xlsx Save-in-place: PASS (No dialog, file mtime updated, Excel COM verified).
   - [4/5] Sheet .xls Legacy Save-in-place: PASS (No dialog, magic `D0 CF 11 E0`, Excel COM verified).
   - [5/5] Save As new .doc and .xls: PASS (Magic `D0 CF 11 E0`, Word/Excel COM verified).
   - TỔNG: 5/5 PASS (100%).
3. Writer Layout Fidelity Audit (`_batch_writer.py` trên 23 docx `landocx`, bỏ d10):
   - 23/23 PASS (Tỷ lệ khớp số trang với Microsoft Word đạt 23/23, 100% không hồi quy):
     + d01.docx: 19/19
     + d02.docx: 11/11
     + d03.docx: 1/1
     + d04.docx: 5/5
     + d05.docx: 2/2
     + d06.docx: 3/3
     + d07.docx: 23/23
     + d08.docx: 1/1
     + d09.docx: 14/14
     + d11.docx: 5/5
     + d12.docx: 3/3
     + d13.docx: 10/10
     + d14.docx: 3/3
     + d15.docx: 10/10
     + d16.docx: 8/8
     + d17.docx: 5/5
     + d18.docx: 2/2
     + d19.docx: 2/2
     + d20.docx: 3/3
     + d21.docx: 9/9
     + d22.docx: 5/5
     + d23.docx: 1/1
     + d24.docx: 16/16
4. Sheet Audit (`_batch_audit.py` trên 26 file `lan*.xlsx`, bỏ lan06 và lan14):
   - 26/26 PASS:
     + Lưu thành công: 26/26 (100%).
     + Tổng sai lệch (total diffs): 0 trên toàn bộ 26 tệp.
     + Excel COM mở tệp: OK trên toàn bộ 26 tệp.
     + Lint XML: clean trên toàn bộ 26 tệp.
5. Node Unit Test Suite (`node tests/run-tests.js`):
   - 1839/1839 PASS (0 FAIL).
6. Full Python Unit Test Discovery (`python -m unittest discover -s tests`):
   - 364/364 PASS (0 FAIL).

KNOWN FAILURES:
- Không có (Zero failures).

RISKS:
- Rủi ro rất thấp: Toàn bộ pipeline xử lý hình ảnh, OOXML zip patch, và bộ lọc xuất gốc của LibreOffice được bảo tồn nguyên vẹn. Các bài audit độ trung thực xác nhận không có bất kỳ hồi quy nào.

DEPENDENCIES/BLOCKERS:
- Không có. Nhánh `fix/save-in-place-agy` hoàn toàn độc lập và đã sẵn sàng để người phụ trách review. Không merge vào `main`.

CORE PATCH ID (if any):
- Không có (giải pháp thuần Adapter + Platform layer theo quyết định AGENTS.md mục 3).

NEXT ACTION:
- Đề xuất bổ sung trong tương lai (đã ghi nhận trong Help/Brief): Có thể cân nhắc thêm tùy chọn hỏi người dùng khi bấm Lưu trên file .doc/.xls cũ ("Bạn có muốn nâng cấp lên định dạng .docx/.xlsx mới không?"), tuy nhiên mặc định hiện tại bảo toàn định dạng cũ hoàn toàn tương thích và thuận tiện cho người dùng.
- Bàn giao nhánh `fix/save-in-place-agy` cho người phụ trách kiểm tra và duyệt merge.
