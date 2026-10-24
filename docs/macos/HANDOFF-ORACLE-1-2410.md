# Handoff ORACLE-1 — Office for Mac làm chuẩn đo độ tương đương (24/10/2026)

Báo cáo số liệu: [`PARITY-OFFICE-MAC-2410.md`](PARITY-OFFICE-MAC-2410.md).

# Agent Handoff
TASK: ORACLE-1 — Lấy Microsoft Office for Mac 16.114.1 làm chuẩn, đo 3T (Sheet 1.500 ca hàm, Doc số trang, Slide số slide)
AGENT/ROLE: Claude (`claude-oracle`, thay Grok theo chỉ đạo của lead) / công cụ đo + đo, không sửa mã sản phẩm
BRANCH: mac/oracle-cl-2410 (từ origin/vn-main 0c931aa2)
WORKTREE: /Volumes/Data/Worktrees/mac-oracle-cl-2410
OBJECTIVE: Bộ công cụ lặp lại được để hỏi Word/Excel/PowerPoint for Mac ra kết quả chuẩn + bảng số liệu 3T khớp Office Mac.
FINDINGS:
- Office for Mac BLOCKED: cả ba ứng dụng (đã chạy sẵn khoảng 16 giờ, agent không mở) không trả lời mọi Apple Event thật; lỗi chính xác `execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`, tương tự `Microsoft Word gặp lỗi: …(-1712)`, `Microsoft PowerPoint gặp lỗi: …(-1712)`. Không có `-1743`. Nhiều khả năng một hộp thoại xin quyền Automation (hoặc hộp thoại modal trong ứng dụng) đang chờ người dùng. `get version` trả 16.114.1 (đọc cục bộ, không phải sự kiện).
- Đặt bản sao vào container Office như phiếu gợi ý gây hộp thoại quyền "dữ liệu ứng dụng khác" của macOS 15 (`mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/tmp/3t-oracle` treo hơn 3 phút, đã dừng theo PID 12258). Công cụ chuyển sang: Excel dựng sổ tính mới trong bộ nhớ (không mở tệp); Word/PowerPoint đọc bản sao chỉ-đọc trong `~/Pictures/3t-oracle-staging` (Office có quyền `assets.pictures.read-only`; ghi vào đó từ terminal không gây hộp thoại — đã thử).
- 3T ↔ Excel 2016 Windows: 1.500/1.500 khớp (16/16 lô). Số ca thật là 1.500 (phiếu ghi 1.470).
- 3T (LibreOffice pilot 26.8.0.3): 7 docx đều 1 trang; pptx 2/2/3/1 slide, khớp số slide cấu trúc, 0 slide ẩn.
- Phông thiếu cho 3T: Lucida Sans, NSimSun (6 docx), Segoe UI (1 docx). Thiếu cho Office: DejaVu Sans (mọi tệp), Segoe UI. Office Mac tự mang 238 họ phông (DFonts: Calibri, Cambria, Aptos…) mà LibreOffice của 3T không thấy → nguồn lệch trang chính cần đo cho MAC-9.
IMPLEMENTATION SUMMARY: Thêm `tests/macos/oracle/`: `oracle_common.py` (phân tích kết quả `osascript -s s`, khôi phục số thực đủ độ chính xác từ `{hi, r−hi}`, chặn kịch bản nhắm ứng dụng khác Word/Excel/PowerPoint hoặc có System Events/keystroke, chép bản chỉ-đọc, chỉ thoát ứng dụng do chính lần chạy mở), `excel_eval.py` (`evaluate` + `ERROR.TYPE`, ra `golden-mac/golden-*.json` cùng cấu trúc golden Windows), `word_stats.py`, `ppt_stats.py`, `lo_pages.py` (phía 3T, cùng cờ/bộ lọc như `main.py _run_soffice_convert`, tái dùng `fast_pdf_page_count`), `font_audit.py`, `compare_functions.mjs` + `compare-lib.mjs` (so 3 chiều, tái dùng cách dựng FormulaEngine của `tests/unit/function-golden.test.js`), unit test Python và Node. Báo cáo + handoff trong `docs/macos/`. Không sửa mã sản phẩm, không đụng `tests/functions/golden-*.json`, không có golden-mac giả.
FILES CHANGED: tests/macos/oracle/{oracle_common.py, excel_eval.py, word_stats.py, ppt_stats.py, lo_pages.py, font_audit.py, compare-lib.mjs, compare_functions.mjs, test_oracle_tools.py, test_compare_functions.mjs}; docs/macos/PARITY-OFFICE-MAC-2410.md; docs/macos/HANDOFF-ORACLE-1-2410.md.
COMMITS: 9df14d6f test(macos): add Office for Mac oracle tooling (ORACLE-1); commit tài liệu (báo cáo + handoff) ngay sau commit này trên cùng nhánh.
COMMANDS RUN:
- `heavy-lock.sh claude-oracle -- osascript -e 'tell application "Microsoft Excel" to get name of every workbook'` → -1712 sau 2 phút 05 giây
- `heavy-lock.sh claude-oracle -- osascript` thăm dò `get version` (3 ứng dụng, OK), `count of workbooks/documents/presentations`, `evaluate name "=1+2"`, `activate` → -1712
- `heavy-lock.sh claude-oracle -- python tests/macos/oracle/excel_eval.py cases-smoke.json --timeout 150` → BLOCKED -1712; `word_stats.py sample-writer.docx --timeout 150` → BLOCKED (hết 150 s); `ppt_stats.py sample-slides.pptx --timeout 200` → BLOCKED -1712
- `heavy-lock.sh claude-oracle -- python tests/macos/oracle/lo_pages.py <11 tệp> --work-dir <scratch>` → 11/11 OK, 10,9 s
- `python tests/macos/oracle/font_audit.py <11 tệp>` → OK
- `node tests/macos/oracle/compare_functions.mjs --out-json … --out-md …` → 1.500 ca, 3T=Win 1.500, 0,26 s
- `python -m pytest tests/macos/oracle -q -p no:cacheprovider` → 16 passed; `node --test tests/macos/oracle/test_compare_functions.mjs` → 7 pass
- `osacompile` cả 16 kịch bản Excel + kịch bản Word/PowerPoint sinh ra → biên dịch được (chỉ kiểm cú pháp, không gửi sự kiện)
- `heavy-lock.sh claude-oracle -- npm test` → 3762/3781 PASS, 19 FAIL
- Không cần `npm ci` (package.json không có dependency).
BUILD RESULT: NOT RUN — phiếu không đổi build.
TEST RESULTS:
- Unit test oracle: PASS (pytest 16/16, node --test 7/7).
- So 3T ↔ Excel Win: PASS 1.500/1.500.
- 3T số trang/slide qua LibreOffice: PASS 11/11 tệp đo được.
- Excel Mac 1.500 ca: BLOCKED (-1712), 0 golden-mac.
- Word Mac 7 docx / PowerPoint Mac 4 pptx: BLOCKED (-1712 / hết giờ).
- npm test: FAIL 19/3781 — có sẵn từ trước, không do phiếu này (`tests/run-tests.js` không nạp `tests/macos/**`, phiếu chỉ thêm tệp mới trong `tests/macos/oracle/` và `docs/macos/`; số lượng 3781 không đổi). Cả 16 bài "Hàm đối chiếu Excel 2016" PASS.
KNOWN FAILURES: 19 FAIL npm test có sẵn: Lưu .xltx; bộ kiểm Python bóng chữ/hoạt ảnh Slides; parseFods snapshots; FODS↔XLSX CF/validation, DataPilot, height/width; Python twin overlay FODS/FODP/ActiveTable/presProps/GUID; textRotation; overlay kích thước XLSX; CH-9.4, CH-9.5 (phần lớn là bài gọi Python/soffice).
RISKS:
- Sự kiện đã hết giờ phía gửi vẫn có thể được ứng dụng xử lý khi hết bị chặn: Excel có thể tự mở một sổ tính trống chưa lưu (từ `make new workbook`), Word có thể báo không tìm thấy bản sao đã xóa `~/Pictures/3t-oracle-staging/…-sample-writer.docx`. Chỉ cần đóng, không lưu. Thư mục staging đã được xóa.
- Mã `excel_eval.py`/`word_stats.py`/`ppt_stats.py` mới chỉ được kiểm cú pháp (`osacompile`) và unit test phần phân tích; chưa chạy thật với Office. Các điểm cần xem khi chạy lần đầu: kiểu trả về của `evaluate` cho tham chiếu ô/mảng/lỗi trên Excel Mac, tên trang tính mặc định của sổ mới khi giao diện tiếng Việt (script luôn đổi tên thành "Sheet1"), lệnh xuất PDF (thư mục đích phải ghi được với ứng dụng sandbox).
- Excel 365 Mac có thể trả lỗi mới (#SPILL!, #CALC!) hoặc mảng động ở chỗ Excel 2016 trả vô hướng → dự kiến xuất hiện như ExcelMac≠ExcelWin.
DEPENDENCIES/BLOCKERS:
- BLOCKED chờ người phụ trách (mục 7.3 kế hoạch tổng): cấp quyền System Settings ▸ Privacy & Security ▸ Automation cho terminal/agent điều khiển Microsoft Word/Excel/PowerPoint, hoặc đóng hộp thoại đang chờ trong ba ứng dụng. Lỗi chính xác: `execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)`.
NEXT ACTION:
1. Sau khi gỡ chặn: chạy mục 6 của báo cáo (smoke → 16 lô `excel_eval.py` theo lô qua khóa → `compare_functions.mjs` → `word_stats.py`/`ppt_stats.py`), commit `tests/macos/oracle/golden-mac/*.json`, điền các cột Mac trong báo cáo.
2. MAC-9: quyết định cách cho 3T dùng phông tương thích (Carlito/Caladea đã có trong pilot; Calibri/Cambria/Aptos chỉ có trong gói Office) — đo bằng corpus tạo bằng Office Mac thật.
3. Lead: mọi ca 3T≠ExcelMac (khi có số liệu) giao sửa ở đợt sau; không sửa golden Windows.
