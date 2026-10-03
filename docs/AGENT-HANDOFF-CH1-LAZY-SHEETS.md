TASK: CH-1 — mở file Sheet lớn theo sheet, Pha 2 WIP.
AGENT/ROLE: Codex / VN Sheet performance.
BRANCH: perf/ch1-lazy-sheets-codex
WORKTREE: E:\VNOffice-codex-lan14c
OBJECTIVE: lan14 mở và thao tác được <60 giây, WebView2 peak <1,5 GB, không treo >2 giây; save đủ và đúng 10 sheet.
FINDINGS: Pha 1 đo 180,203 giây và WebView2 peak 2.685,3 MB nên cả hai mục tiêu FAIL. `switchSheet()` hiện đồng bộ và được nhiều consumer gọi; `serializeToFods()` dựng lại toàn workbook từ model WebView2. Bật stub trước khi có ensure-load/save-merge có thể tính công thức từ sheet rỗng và ghi mất sheet chưa nạp.
IMPLEMENTATION SUMMARY: Đã thêm wire-format Pha 2 sau cờ tắt: builder nhận `included_sheets`, chỉ phát row record của sheet được chọn, giữ các sheet còn lại dưới dạng stub gồm tên/trạng thái ẩn/màu tab/used range/số ô; support XML giữ cấu trúc workbook nhưng bỏ row của stub. Parser kiểm tra chặt stub/deferred sheet, dựng model rỗng có đánh dấu để bước sau nạp theo yêu cầu. Production chưa truyền `included_sheets`, nên hành vi Pha 1 không đổi và safety gate chưa bị vượt qua.
FILES CHANGED: adapters/libreoffice/sheet/sheet_open_payload.py; adapters/libreoffice/sheet/sheet-payload-parser.js; tests/test_sheet_open_payload.py; tests/unit/sheet-open-payload.test.js; docs/PLAN-CH1-LAZY-SHEETS.md; file này.
COMMANDS RUN: `python -s -m unittest tests.test_sheet_open_payload`; runner JS hẹp gọi `runSheetOpenPayloadTests`; `git diff --check`.
BUILD RESULT: NOT RUN — WIP chưa bật production.
TEST RESULTS: Python focused 6/6 PASS; JS payload focused 7/7 PASS; diff check PASS. Full Node, desktop 27 ca, legacy audit, probe lan14, save lan14: NOT RUN trong WIP này.
KNOWN FAILURES: Mục tiêu mở <60 giây FAIL theo số Pha 1 180,203 giây; WebView2 <1,5 GB FAIL theo số Pha 1 2,685 GB. Pha 2 production, first sheet-switch, save lan14, công thức xuyên sheet và consumer toàn-workbook chưa hiện thực/chưa đo.
RISKS: Stub chưa được phép đi vào grid production. Builder scaffold vẫn đọc metadata XF toàn workbook trước khi lọc record, nên chưa loại hotspot 65,8 giây. Session Pha 1 vẫn được release sau mở; bước tiếp theo phải giữ session tới khi đóng tài liệu.
DEPENDENCIES/BLOCKERS: Không thêm dependency, không sửa Core. Cần thiết kế API ensureSheetLoaded bất đồng bộ nhưng tương thích các caller đồng bộ, và save-merge phía Python từ FODS/session hoặc nguồn XLSX.
CORE PATCH ID (if any): None.
NEXT ACTION: Thêm session API trả payload một sheet; adapter điều phối ensure-load cho tab/formula/search/Ctrl+End/thống kê; save gửi delta các sheet đã sửa và giữ nguyên sheet chưa nạp. Chỉ sau test công thức xuyên sheet + audit save mới bật lazy mặc định cho FODS >20 MiB, chạy full gate một lần và probe lan14 ba lần.
