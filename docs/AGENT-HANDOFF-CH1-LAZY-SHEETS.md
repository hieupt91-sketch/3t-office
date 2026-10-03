TASK: CH-1 — mở file Sheet lớn nhanh và không đóng băng giao diện.
AGENT/ROLE: Codex / VN Sheet performance.
BRANCH: perf/ch1-lazy-sheets-codex
WORKTREE: E:\VNOffice-codex-lan14c
OBJECTIVE: lan14 mở và thao tác được <60 giây, WebView2 peak <1,5 GB, không treo >2 giây.
FINDINGS: Baseline chính thức 247,97 giây trung bình; compact payload có sẵn nhưng mặc định tắt và lần đo cũ vẫn 156–158 giây. cProfile thật trên raw FODS lan14: 143.349.988 calls / 87,091 giây; `_overlay_sheet_cell_metadata_from_xlsx` 65,816 giây, `_xlsx_cells_with_metadata` 33,224 giây, `apply_row` 29,050 giây. Pha 1 tái sử dụng compact payload cho file lớn và chia parser thành lát có nhường main thread.
IMPLEMENTATION SUMMARY: Pha 1 tự chọn compact payload với FODS >20 MiB (cờ môi trường vẫn ép bật được), giữ nguyên đường cũ cho file nhỏ; thêm timing read/overlay/optimize/build; parser WebView2 nhường event loop mỗi 128 row-record và cập nhật phần trăm trên status bar. Fallback FODS, commit đầy đủ model và đường save hiện hữu không đổi.
FILES CHANGED: main.py; adapters/libreoffice/sheet/sheet-payload-parser.js; adapters/libreoffice/sheet/sheet-adapter.js; tests/test_sheet_open_payload.py; platform/help/entries-sheet.js; docs/diag-lan14/probe-lan14.mjs; docs/PLAN-CH1-LAZY-SHEETS.md; file này; artifact đo lan14 20261003-111118.
COMMANDS RUN: cProfile `native_overlay_profile.py` trên lan14; focused Python/JS; `node tests/run-tests.js`; desktop regression CDP; `_batch_audit_legacy.py` lan01–03; `probe-lan14.mjs ch1-phase1`.
BUILD RESULT: NOT RUN.
TEST RESULTS: Focused Python 5/5 PASS; focused JS payload 6/6 PASS; Node 2670/2670 PASS; desktop 27 PASS, 0 FAIL, 0 BLOCKED; legacy lan01/02/03 đều saved, total 0, lint clean. Probe lan14: selection-to-first-grid 180,203 giây; WebView2 peak 2.685,3 MB; tree WS peak 4.157,6 MB; Python peak 3.552,6 MB; 51/51 mẫu CDP phản hồi, cadence 4.984–5.011 ms, 0 timeout. Stage: UNO 12,431 giây; read 0,264; native overlay 41,809; optimize 29,267; payload build 36,430; payload hydrate 52,427 giây.
KNOWN FAILURES: Mục tiêu <60 giây FAIL (180,203); WebView2 <1,5 GB FAIL (2,685 GB). Mức treo tối đa >2 giây NOT MEASURED: CDP không timeout ở nhịp 5 giây nhưng probe chưa có PerformanceObserver LongTask. Pha 2 lazy-sheet và Pha 3 RAM chưa làm; save lan14 sau sửa NOT RUN.
RISKS: Pha 1 vẫn dựng đủ model của mọi sheet; save lớn vẫn có nguy cơ renderer hết bộ nhớ như baseline.
DEPENDENCIES/BLOCKERS: Không có dependency mới. Cần RAM trống >6 GB để chạy probe lan14.
CORE PATCH ID (if any): None.
NEXT ACTION: Pha 2 tách payload theo sheet và giữ fallback phiên đến khi công thức/search/named range/save của sheet chưa nạp có test an toàn; bổ sung LongTask observer vào probe rồi đo lại.
