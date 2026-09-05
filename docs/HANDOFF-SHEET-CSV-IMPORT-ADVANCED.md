# Agent Handoff

TASK: VN Sheet — CSV import nâng cao cho dữ liệu Excel vi-VN  
AGENT/ROLE: Codex / Sheet + LibreOffice integration  
BRANCH: `feature/sheet-csv-import-advanced`  
WORKTREE: `E:\VNOffice-codex-csv-import-advanced`  
OBJECTIVE: Tự nhận delimiter comma/semicolon/tab và UTF-8/BOM/Windows-1258 khi mở CSV; nhập số `1.234,56` thành numeric; không thay đổi đường XLSX/ODS; không làm kết nối DB.

FINDINGS:

- Worktree được xác nhận sạch ở HEAD `b95a1603`, branch feature tách đúng commit đang được `main` trỏ tới lúc bắt đầu.
- Baseline được đo bằng LibreOffice thật qua `_run_soffice_convert(..., "fods")`, tức đúng filter hiện hữu nhưng không có `FilterOptions`:
  - UTF-8 BOM + semicolon: header 3 trường bị dính vào 1 ô; dòng dữ liệu thành 2 ô vì dấu phẩy trong `1.234,56` bị hiểu nhầm là delimiter. Chữ Việt còn đúng.
  - Windows-1258 + semicolon: cùng lỗi cột; chữ Việt thành ký tự thay thế/mojibake, kiểm tra nội dung thất bại.
  - UTF-8 + tab: header/dữ liệu tab bị dính; số thập phân tiếp tục bị tách ở dấu phẩy.
- Sau thay đổi, cả ba mẫu đều cho đúng 3 cột, chữ Việt đúng sau chuẩn hóa Unicode NFC, và `1.234,56` được ghi trong FODS dưới dạng `office:value-type="float"`, `office:value="1234.56"`.
- Cú pháp lấy từ [LibreOffice Help — CSV Filter Options](https://help.libreoffice.org/latest/en-US/text/shared/guide/csv_params.html): separator ASCII `44`/`59`/`9`, charset UTF-8 `76`, Windows-1258 `40`, language token và detect-special-numbers token 8. Import dùng `--infilter=Text - txt - csv (StarCalc):...`.

IMPLEMENTATION SUMMARY:

- `main.py` chỉ đọc tối đa 64 KiB đầu CSV; nhận UTF-8 BOM, strict UTF-8, nếu không hợp lệ thì fallback strict cp1258; dùng `csv.Sniffer` giới hạn ở `,`, `;`, tab.
- Chỉ nguồn có suffix `.csv` mới nhận `--infilter`; XLSX/ODS và mọi đường convert khác giữ nguyên command.
- Filter options đặt locale Microsoft LCID `1066` (vi-VN) và bật detect special numbers, nên số nhóm-nghìn/dấu-phẩy-thập-phân được LibreOffice lưu thành số thật.
- Sheet adapter nhận cùng ba delimiter, bỏ BOM đầu chuỗi và chuyển mẫu số vi-VN rõ ràng thành JavaScript `number` trong đường `loadFromCsv`.
- Không dùng SendKeys, dependency ngoài, API/DB, cloud, LibreOffice Core patch, Writer hoặc Slides.

FILES CHANGED:

- `main.py`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/unit/sheet-file-io.test.js`
- `tests/test_sheet_csv_import_advanced.py`
- `docs/HANDOFF-SHEET-CSV-IMPORT-ADVANCED.md`

COMMANDS RUN:

- Baseline Python harness tạo byte thật UTF-8 BOM/cp1258/UTF-8 tab, gọi `_run_soffice_convert`, đọc FODS XML.
- `python -m unittest tests.test_sheet_csv_import_advanced -v`
- `node tests/run-tests.js` với Stopwatch PowerShell.
- `git diff --check`

BUILD RESULT: NOT RUN — task không thay build system và repository không yêu cầu build riêng trong acceptance; syntax/import nằm trong full Node suite.  
TEST RESULTS: PASS — Python `3/3` trong `9.723s`; Node `770/770`, `0 FAIL` trong `51.348s`.  
KNOWN FAILURES: Không có trong các lệnh đã chạy.  
RISKS: Không thể tự nhận encoding 8-bit bất kỳ một cách chắc chắn chỉ từ bytes. Mọi byte stream không hợp lệ UTF-8 hiện được coi là Windows-1258; CSV dùng Windows-1252/encoding hiếm có thể giải mã sai hoặc báo lỗi. File một cột hoặc sample delimiter không đủ rõ fallback về comma. cp1258 có thể xuất Unicode tổ hợp (NFD-like), nội dung vẫn đúng khi chuẩn hóa NFC.  
DEPENDENCIES/BLOCKERS: Không có. Kết nối DB vẫn ngoài phạm vi và cần chủ dự án duyệt riêng.  
CORE PATCH ID (if any): Không có — adapter/CLI filter giải quyết đầy đủ.  
NEXT ACTION: Review/cherry-pick các commit feature nếu được duyệt; không merge vào `main` trong task này.
