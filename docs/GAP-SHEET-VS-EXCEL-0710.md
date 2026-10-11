# Ma trận khoảng cách chức năng VN Sheet và Microsoft Excel cho nhân viên văn phòng Việt Nam

**Phạm vi:** rà soát tĩnh mã nguồn/test và tổng hợp lại kết quả CDP desktop/Excel COM đã ghi trong các audit được giao; không sửa mã sản phẩm. Ma trận tập trung công việc bảng tính văn phòng phổ biến, không tuyên bố tương thích toàn bộ Excel.

**Quy ước:** mức quan trọng 3 là cao nhất, 1 là thấp nhất. `ĐẦY ĐỦ` nghĩa là capability chính đã có và có bằng chứng desktop hoặc test cụ thể; `MỘT PHẦN` nghĩa là còn thiếu fidelity, corpus, biến thể hoặc phép đo; `THIẾU` nghĩa là không tìm thấy capability. S/M/L là ước lượng đóng khoảng cách. Dẫn chứng audit là kết quả đã chạy trước đây, không phải test mới của task này.

**CDP trong task S1:** `NOT RUN` — không cần mở thêm phiên desktop vì `docs/AUDIT-SHEET-C3-C12.md:15-59` đã có kết quả CDP desktop thật và đối chiếu Excel COM cho các mục P1 chính. Không dùng SendKeys/OS input, không gọi `pywebview.evaluate_js`, không khởi động hay dừng tiến trình Office.

**Corpus:** kết quả gần nhất ghi 26/28 tệp XLSX đầy đủ và 2 tệp nặng chỉ đo pipeline (`docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md:24-57,102-106`); vì vậy không coi là 28/28 acceptance hoàn chỉnh. Không tìm thấy kết quả chạy đủ bộ 20 XLS trong phạm vi tài liệu được giao, nên các hàng XLS ghi `NOT RUN`/`MỘT PHẦN`.

## Ma trận chức năng

| Nhóm | Chức năng | Quan trọng | Trạng thái | Bằng chứng | Việc đóng khoảng cách |
|---|---|---:|---|---|---|
| Tệp | Tạo sổ tính trống | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:23-24` — desktop mở một Sheet1 trống; Ctrl+N chưa chạy riêng | S |
| Tệp | Mở XLSX bằng UI | 3 | MỘT PHẦN — bridge/pipeline có, hộp thoại OS chưa xác minh CDP | `docs/AUDIT-SHEET-RECHECK-0610.md:7,41` | M |
| Tệp | Mở XLS 97–2003 | 3 | MỘT PHẦN — có định dạng/đường chuyển đổi, chưa chạy đủ corpus 20 XLS | `tests/test_g7_save_as_dialog.py:20-50`; corpus 20 XLS: **NOT RUN** | L |
| Tệp | Mở ODS/FODS | 2 | ĐẦY ĐỦ | `tests/unit/sheet-file-io.test.js:171-206` | S |
| Tệp | Mở CSV | 2 | ĐẦY ĐỦ | `tests/unit/sheet-file-io.test.js:84-169` | S |
| Tệp | Lưu XLSX mới | 3 | ĐẦY ĐỦ | CDP bridge lưu file thật và đọc ZIP/XML: `docs/AUDIT-SHEET-RECHECK-0610.md:33-34` | S |
| Tệp | Ctrl+S lưu tại chỗ XLSX | 3 | MỘT PHẦN — có pipeline, chưa chạy lại trên đủ 28 tệp | `tests/test_sheet_save_roundtrip.py:82-99`; `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md:24-57` | M |
| Tệp | Ctrl+S giữ định dạng XLS | 3 | MỘT PHẦN — có unit/live script, corpus 20 XLS chưa chạy | `tests/test_save_in_place.py:81-84`; `scripts/test_live_save_in_place.py:361-450`; corpus 20 XLS: **NOT RUN** | L |
| Tệp | Lưu thành XLSX/XLS | 3 | MỘT PHẦN — filter và OLE2 có, luồng hộp thoại chưa chạy trong S1 | `tests/test_g7_save_as_dialog.py:20-50`; `docs/AUDIT-SHEET-RECHECK-0610.md:7` | M |
| Tệp | Xuất PDF | 2 | MỘT PHẦN — có luồng in/PDF, hộp thoại hệ điều hành chưa kiểm | `tests/unit/sheet-file-io.test.js:209-228`; `docs/AUDIT-SHEET-RECHECK-0610.md:7` | M |
| Tệp | Xem trước khi in | 3 | ĐẦY ĐỦ | `tests/unit/sheet-print-preview.test.js:139-165`; CDP DOM: `docs/AUDIT-SHEET-UI-0610.md:12` | S |
| Tệp | Cảnh báo ghi đè | 2 | MỘT PHẦN — chưa xác minh desktop Sheet | `docs/AUDIT-SHEET-RECHECK-0610.md:42` — BLOCKED/NOT RUN | M |
| Tệp | Đóng sổ chưa lưu: Lưu/Không lưu/Hủy | 3 | MỘT PHẦN — chưa xác minh desktop Sheet | `docs/AUDIT-SHEET-RECHECK-0610.md:43` — BLOCKED/NOT RUN | M |
| Tệp | Tự lưu/khôi phục | 2 | MỘT PHẦN — capability chung có, chưa có acceptance riêng Sheet | `docs/AUDIT-SHEET-BASICS.md:36` — NOT RUN | M |
| Tệp | Danh sách tệp gần đây | 1 | MỘT PHẦN — chưa kiểm trên Sheet | **NOT RUN** — không có kết quả Sheet cụ thể trong tài liệu được giao | S |
| Soạn thảo | Hoàn tác Ctrl+Z | 3 | ĐẦY ĐỦ | CDP Undo đổi 99 về 6: `docs/AUDIT-SHEET-RECHECK-0610.md:31` | S |
| Soạn thảo | Làm lại Ctrl+Y | 3 | ĐẦY ĐỦ | CDP Redo khôi phục 99: `docs/AUDIT-SHEET-RECHECK-0610.md:31` | S |
| Soạn thảo | Cắt/sao chép/dán trong Sheet | 3 | MỘT PHẦN — audit UI có kết quả mâu thuẫn/FAIL | `docs/AUDIT-SHEET-UI-0610.md:19`; `tests/unit/sheet-keyboard-audit.test.js:107-122` | M |
| Soạn thảo | Dán giữ định dạng từ Excel | 3 | MỘT PHẦN — unit có HTML Office, chưa có desktop corpus clipboard | `tests/unit/basic-editing-keys.test.js:450-520`; desktop: **NOT RUN** | M |
| Soạn thảo | Dán chỉ giá trị | 3 | ĐẦY ĐỦ | `tests/unit/sheet-paste-special.test.js:6-60` | S |
| Soạn thảo | Dán chỉ công thức | 2 | ĐẦY ĐỦ | `tests/unit/sheet-paste-special.test.js:6-60` | S |
| Soạn thảo | Dán chỉ định dạng | 2 | ĐẦY ĐỦ | `tests/unit/sheet-paste-special.test.js:6-60` | S |
| Soạn thảo | Dán chuyển vị | 2 | ĐẦY ĐỦ | `tests/unit/sheet-paste-special.test.js:6-60` | S |
| Soạn thảo | Format Painter | 2 | ĐẦY ĐỦ | `tests/unit/sheet-format-painter.test.js:57-136` | S |
| Soạn thảo | Tìm Ctrl+F | 3 | ĐẦY ĐỦ | CDP mở dialog: `docs/AUDIT-SHEET-RECHECK-0610.md:32`; model: `tests/unit/find-replace-shared.test.js:278-313` | S |
| Soạn thảo | Thay thế Ctrl+H | 3 | ĐẦY ĐỦ | `tests/unit/find-replace-shared.test.js:306-331` | S |
| Soạn thảo | Tìm trong công thức/giá trị | 2 | ĐẦY ĐỦ | `tests/unit/find-replace-shared.test.js:287-306` | S |
| Soạn thảo | Tìm/thay toàn bộ workbook | 2 | ĐẦY ĐỦ | `tests/unit/find-replace-shared.test.js:318-331` | S |
| Nhập liệu | Số thập phân | 3 | ĐẦY ĐỦ | CDP model 1234.56: `docs/AUDIT-SHEET-RECHECK-0610.md:9` | S |
| Nhập liệu | Ngày dd/mm/yyyy | 3 | ĐẦY ĐỦ | CDP serial 46387 và format ngày: `docs/AUDIT-SHEET-RECHECK-0610.md:10` | S |
| Nhập liệu | Giờ HH:mm | 2 | ĐẦY ĐỦ | CDP giá trị 0.572916… và format giờ: `docs/AUDIT-SHEET-RECHECK-0610.md:11` | S |
| Nhập liệu | Phần trăm | 3 | ĐẦY ĐỦ | CDP 25% thành 0.25: `docs/AUDIT-SHEET-RECHECK-0610.md:12` | S |
| Nhập liệu | Tiền tố ₫/VND/VNĐ thành số | 3 | MỘT PHẦN — mã hiện có nhưng audit 06/10 từng FAIL, chưa CDP lại trên nhánh này | `apps/sheet/number-formatter.js:583-598`; FAIL cũ `docs/AUDIT-SHEET-RECHECK-0610.md:13` | M |
| Nhập liệu | Định dạng tiền VND sau số | 3 | ĐẦY ĐỦ | desktop C6 đặt currency: `docs/AUDIT-SHEET-C3-C12.md:35`; formatter: `apps/sheet/number-formatter.js:178-185` | S |
| Nhập liệu | Chuỗi có số 0 đầu bằng dấu nháy | 2 | ĐẦY ĐỦ | CDP `'0123` giữ chuỗi: `docs/AUDIT-SHEET-RECHECK-0610.md:15` | S |
| Nhập liệu | Enter xuống hàng | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:48` | S |
| Nhập liệu | Tab sang cột | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:49` | S |
| Nhập liệu | Mũi tên di chuyển ô | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:50` | S |
| Nhập liệu | F2 sửa ô | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:51` | S |
| Nhập liệu | Alt+Enter xuống dòng trong ô | 2 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-BASICS.md:52` | S |
| Nhập liệu | Xóa vùng bằng Delete/Backspace, giữ style | 2 | ĐẦY ĐỦ | `tests/unit/sheet-keyboard-audit.test.js:68-87` | S |
| Nhập liệu | Chọn một ô | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:15` | S |
| Nhập liệu | Chọn vùng bằng chuột/Shift | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:16,19` | S |
| Nhập liệu | Chọn cả hàng/cột | 2 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:17` | S |
| Nhập liệu | Ctrl+A vùng hiện tại rồi toàn sheet | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:18` | S |
| Nhập liệu | Ctrl+Arrow nhảy biên vùng dữ liệu | 2 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:20` | S |
| Công thức | Nhập công thức qua thanh công thức | 3 | ĐẦY ĐỦ | CDP `=SUM(4,5)` cho 9 và lưu/mở lại: `docs/AUDIT-SHEET-BASICS.md:62` | S |
| Công thức | SUM | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:16`; unit `tests/unit/formula-engine.test.js:37-49` | S |
| Công thức | AVERAGE | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:17`; unit `tests/unit/formula-engine.test.js:51-56` | S |
| Công thức | MIN/MAX/COUNT | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:18-20` | S |
| Công thức | IF | 3 | ĐẦY ĐỦ | CDP trả `yes`: `docs/AUDIT-SHEET-RECHECK-0610.md:21`; unit `tests/unit/formula-engine.test.js:74-80` | S |
| Công thức | IFERROR | 3 | ĐẦY ĐỦ | `tests/unit/sheet-reference-functions.test.js:17-22` | S |
| Công thức | VLOOKUP exact | 3 | ĐẦY ĐỦ | CDP trả `A`: `docs/AUDIT-SHEET-RECHECK-0610.md:22`; unit `tests/unit/sheet-lookup-conditional-functions.test.js:17` | S |
| Công thức | VLOOKUP approximate | 3 | MỘT PHẦN — unit có, chưa có desktop/Excel parity | `tests/unit/sheet-lookup-conditional-functions.test.js:18`; desktop: **NOT RUN** | M |
| Công thức | HLOOKUP | 2 | MỘT PHẦN — unit có, chưa có desktop/Excel parity | `tests/unit/sheet-lookup-conditional-functions.test.js:19`; desktop: **NOT RUN** | M |
| Công thức | INDEX | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:23`; unit `tests/unit/sheet-lookup-conditional-functions.test.js:20` | S |
| Công thức | MATCH exact | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:24`; unit `tests/unit/sheet-lookup-conditional-functions.test.js:21` | S |
| Công thức | MATCH approximate | 2 | MỘT PHẦN — unit có, chưa có desktop/Excel parity | `tests/unit/sheet-lookup-conditional-functions.test.js:21`; desktop: **NOT RUN** | M |
| Công thức | SUMIF | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:25`; unit `tests/unit/sheet-lookup-conditional-functions.test.js:23` | S |
| Công thức | COUNTIF | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:26`; unit `tests/unit/sheet-lookup-conditional-functions.test.js:22` | S |
| Công thức | SUMIFS | 3 | MỘT PHẦN — unit có, chưa có desktop/Excel parity | `tests/unit/sheet-lookup-conditional-functions.test.js:25`; desktop: **NOT RUN** | M |
| Công thức | COUNTIFS | 3 | MỘT PHẦN — unit có, chưa có desktop/Excel parity | `tests/unit/sheet-lookup-conditional-functions.test.js:24`; desktop: **NOT RUN** | M |
| Công thức | ROUND | 3 | MỘT PHẦN — audit desktop cũ chưa đối chiếu Excel | `docs/AUDIT-SHEET-BASICS.md:70`; implementation `apps/sheet/formula-engine.js:988-1000` | M |
| Công thức | ROUNDUP/ROUNDDOWN | 2 | MỘT PHẦN — chỉ unit | `tests/unit/sheet-math-stat-functions.test.js:15-16`; desktop: **NOT RUN** | M |
| Công thức | TEXT định dạng số/ngày/VND | 3 | ĐẦY ĐỦ | CDP `1234.50`: `docs/AUDIT-SHEET-RECHECK-0610.md:28`; unit `tests/unit/formula-engine.test.js:224-246` | S |
| Công thức | DATE | 3 | ĐẦY ĐỦ | CDP `31/12/2026`: `docs/AUDIT-SHEET-RECHECK-0610.md:29` | S |
| Công thức | TODAY/NOW | 2 | MỘT PHẦN — TODAY quan sát được, chưa parity/volatile coverage | `docs/AUDIT-SHEET-BASICS.md:73`; Excel parity: **NOT RUN** | M |
| Công thức | CONCAT | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-RECHECK-0610.md:27`; unit `tests/unit/formula-engine.test.js:82-87` | S |
| Công thức | LEFT/RIGHT/MID | 2 | MỘT PHẦN — unit MID có, desktop audit bị IME | `tests/unit/sheet-text-functions.test.js:10-12`; `docs/AUDIT-SHEET-BASICS.md:81-83` | M |
| Công thức | SUMPRODUCT | 2 | ĐẦY ĐỦ | `tests/unit/sheet-math-stat-functions.test.js:12` | S |
| Công thức | AVERAGEIF/AVERAGEIFS | 2 | MỘT PHẦN — chỉ unit | `tests/unit/sheet-math-stat-functions.test.js:21-22`; desktop: **NOT RUN** | M |
| Công thức | Hàm ngày làm việc NETWORKDAYS/WORKDAY | 2 | MỘT PHẦN — chỉ unit | `tests/unit/sheet-date-functions.test.js:12-13`; desktop: **NOT RUN** | M |
| Công thức | XLOOKUP | 2 | MỘT PHẦN — unit có, chưa đánh giá fidelity Excel | `tests/unit/sheet-reference-functions.test.js:30`; desktop: **NOT RUN** | M |
| Công thức | Tham chiếu tuyệt đối F4 | 3 | MỘT PHẦN — audit desktop từng không đổi `=A1` | `docs/AUDIT-SHEET-BASICS.md:63,160` | M |
| Công thức | Tham chiếu 3D nhiều sheet | 1 | MỘT PHẦN — chỉ unit | `tests/unit/sheet-reference-functions.test.js:33-39`; desktop: **NOT RUN** | M |
| Công thức | Tính lại tự động/F9 | 3 | ĐẦY ĐỦ | CDP Undo/Redo/F9: `docs/AUDIT-SHEET-C3-C12.md:57` | S |
| Công thức | Lỗi #DIV/0!, #N/A, #VALUE!, #REF! | 2 | MỘT PHẦN — có engine, chưa corpus parity rộng | `docs/AUDIT-SHEET-BASICS.md:93-94`; `tests/unit/sheet-reference-functions.test.js:21-30` | M |
| Công thức | Công thức mảng động/spill | 1 | MỘT PHẦN — implementation/test riêng có, chưa so Excel trong audit này | `tests/unit/sheet-array-formulas.test.js:1-120`; desktop: **NOT RUN** | L |
| Định dạng | Dấu phân cách hàng nghìn | 3 | ĐẦY ĐỦ | CDP C6: `docs/AUDIT-SHEET-C3-C12.md:35` | S |
| Định dạng | Tăng/giảm chữ số thập phân | 3 | ĐẦY ĐỦ | CDP C6: `docs/AUDIT-SHEET-C3-C12.md:35` | S |
| Định dạng | Số phần trăm | 3 | ĐẦY ĐỦ | CDP C6 và save/reopen: `docs/AUDIT-SHEET-C3-C12.md:35,59` | S |
| Định dạng | Ngày Việt Nam | 3 | ĐẦY ĐỦ | CDP C6 và save/reopen: `docs/AUDIT-SHEET-C3-C12.md:35,59` | S |
| Định dạng | Tiền tệ VND | 3 | ĐẦY ĐỦ | CDP C6: `docs/AUDIT-SHEET-C3-C12.md:35` | S |
| Định dạng | Mã định dạng số tùy chỉnh | 2 | MỘT PHẦN — có dialog/test, fidelity corpus từng là điểm nóng | `tests/unit/sheet-format-cells.test.js:17-120`; `docs/HANDOFF-SHEET-NUMBER-FORMAT-CODES.md:5-50` | L |
| Định dạng | Phông và cỡ chữ | 3 | ĐẦY ĐỦ | CDP Arial 14 pt: `docs/AUDIT-SHEET-C3-C12.md:37` | S |
| Định dạng | Đậm/nghiêng/gạch chân/màu chữ | 3 | ĐẦY ĐỦ | `tests/unit/sheet-editing-styles.test.js:1-120` | S |
| Định dạng | Màu nền ô | 3 | ĐẦY ĐỦ | CDP màu vàng: `docs/AUDIT-SHEET-C3-C12.md:37` | S |
| Định dạng | Căn trái/giữa/phải | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:36` | S |
| Định dạng | Căn dọc | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:36` | S |
| Định dạng | Wrap Text | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:36` | S |
| Định dạng | Xoay chữ | 1 | ĐẦY ĐỦ | `tests/unit/sheet-cell-orientation.test.js:1-100` | S |
| Định dạng | Co chữ/fit text | 1 | ĐẦY ĐỦ | `tests/unit/sheet-cell-text-fit.test.js:1-100` | S |
| Định dạng | Gộp và căn giữa | 3 | ĐẦY ĐỦ | CDP F2:G2: `docs/AUDIT-SHEET-C3-C12.md:36`; source `apps/sheet/sheet-grid.js:8861-8911` | S |
| Định dạng | Bỏ gộp ô | 3 | ĐẦY ĐỦ | `apps/sheet/sheet-grid.js:8918-8927`; `tests/unit/sheet-merge-cells.test.js:10-120` | S |
| Định dạng | Kẻ viền ô/bảng | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:37` | S |
| Định dạng | Format as Table | 2 | MỘT PHẦN — có UI/style, chưa có Excel Table semantics/roundtrip evidence | `apps/sheet/cell-styles.js:138-186`; Excel table roundtrip: **NOT RUN** | L |
| Định dạng | Kiểu ô preset | 1 | ĐẦY ĐỦ | `apps/sheet/cell-style-presets.js:18-143` | S |
| Định dạng | Hoàn tác định dạng một bước | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:38` | S |
| Hàng/cột | Chèn hàng và chỉnh tham chiếu công thức | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:29` | S |
| Hàng/cột | Chèn cột và chỉnh tham chiếu công thức | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:30` | S |
| Hàng/cột | Xóa hàng/cột và hoàn tác | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:31` | S |
| Hàng/cột | Đổi chiều rộng cột/chiều cao hàng | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:32` | S |
| Hàng/cột | AutoFit hàng/cột | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:33` | S |
| Hàng/cột | Ẩn/hiện hàng/cột | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:34` | S |
| Điền | Kéo điền chuỗi số | 3 | ĐẦY ĐỦ | CDP + Undo/Redo: `docs/AUDIT-SHEET-C3-C12.md:22` | S |
| Điền | Kéo điền ngày | 3 | ĐẦY ĐỦ | CDP qua cuối tháng: `docs/AUDIT-SHEET-C3-C12.md:23` | S |
| Điền | Kéo điền thứ/tháng tiếng Việt | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:24` | S |
| Điền | Kéo điền công thức tương đối | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:25` | S |
| Điền | Nhấp đúp fill handle | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:26` | S |
| Trang tính | Thêm trang tính | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:39` | S |
| Trang tính | Đổi tên trang tính | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:39` | S |
| Trang tính | Di chuyển/sao chép trang tính | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:40` | S |
| Trang tính | Xóa trang tính có xác nhận | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:41` | S |
| Trang tính | Màu tab | 1 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:42` | S |
| Trang tính | Dữ liệu/công thức độc lập giữa sheet | 3 | ĐẦY ĐỦ | `tests/unit/sheet-multi-sheet.test.js:44-170` | S |
| Trang tính | Trạng thái lọc độc lập giữa sheet | 2 | ĐẦY ĐỦ | `tests/unit/sheet-multi-sheet.test.js:202-220` | S |
| Trang tính | Tên vùng workbook/sheet | 2 | ĐẦY ĐỦ | source `apps/sheet/sheet-grid.js:11189-11240`; test `tests/unit/sheet-named-ranges-text-date.test.js:12-90` | S |
| Dữ liệu | Sắp xếp tăng dần/giảm dần | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:43` | S |
| Dữ liệu | Sắp xếp nhiều cấp | 2 | ĐẦY ĐỦ | `tests/unit/sheet-data-tools.test.js:64-118` | S |
| Dữ liệu | AutoFilter đúng vùng và nút lọc | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:44` | S |
| Dữ liệu | Lọc nhiều điều kiện/kiểu dữ liệu | 3 | MỘT PHẦN — có AutoFilter cơ bản, chưa có acceptance đủ biến thể Excel | `docs/AUDIT-SHEET-C3-C12.md:44`; biến thể nâng cao: **NOT RUN** | L |
| Dữ liệu | Cố định hàng trên | 3 | ĐẦY ĐỦ | `docs/AUDIT-SHEET-UI-0610.md:17` | S |
| Dữ liệu | Cố định cột đầu | 3 | ĐẦY ĐỦ | source `apps/sheet/sheet-grid.js:9859-9885`; test `tests/unit/sheet-freeze-panes-real.test.js:21-100` | S |
| Dữ liệu | Cố định tại ô đang chọn | 3 | ĐẦY ĐỦ | CDP tại C3: `docs/AUDIT-SHEET-C3-C12.md:45` | S |
| Dữ liệu | Data Validation danh sách | 3 | ĐẦY ĐỦ | CDP chấp nhận/từ chối: `docs/AUDIT-SHEET-C3-C12.md:46` | S |
| Dữ liệu | Data Validation số/phạm vi | 2 | ĐẦY ĐỦ | `tests/unit/sheet-rules-validation.test.js:57-77` | S |
| Dữ liệu | Remove Duplicates | 3 | ĐẦY ĐỦ | CDP + Undo: `docs/AUDIT-SHEET-C3-C12.md:47` | S |
| Dữ liệu | Text to Columns theo dấu phân cách | 3 | ĐẦY ĐỦ | `tests/unit/sheet-data-tools.test.js:46-52` | S |
| Dữ liệu | Text to Columns fixed width | 2 | ĐẦY ĐỦ | `tests/unit/sheet-data-tools.test.js:46-52` | S |
| Dữ liệu | Flash Fill cơ bản | 1 | MỘT PHẦN — pattern hẹp, chưa parity Excel | `tests/unit/sheet-data-tools.test.js:54-62`; desktop: **NOT RUN** | M |
| Dữ liệu | Subtotal | 2 | ĐẦY ĐỦ | `tests/unit/sheet-data-tools.test.js:36-43` | S |
| Dữ liệu | Group/Ungroup/Outline | 1 | ĐẦY ĐỦ | `tests/unit/sheet-data-tools.test.js:121-126` | S |
| Định dạng có điều kiện | Quy tắc lớn hơn/nhỏ hơn | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:48`; unit `tests/unit/sheet-rules-validation.test.js:29-41` | S |
| Định dạng có điều kiện | Quy tắc độc lập theo sheet | 2 | ĐẦY ĐỦ | `tests/unit/sheet-rules-validation.test.js:44-54` | S |
| Định dạng có điều kiện | Color scales/data bars/icon sets | 2 | THIẾU — không thấy acceptance/implementation tương đương Excel | **NOT RUN** — không tìm thấy bằng chứng trong audit/test Sheet được rà soát | L |
| Biểu đồ | Biểu đồ cột | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:49` | S |
| Biểu đồ | Biểu đồ đường | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:49` | S |
| Biểu đồ | Biểu đồ tròn | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:49` | S |
| Biểu đồ | Undo/Redo chèn biểu đồ | 2 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-C3-C12.md:49` | S |
| Biểu đồ | Lưu XLSX và mở lại trong VN Sheet | 3 | ĐẦY ĐỦ | CDP giữ 3 chart SVG: `docs/AUDIT-SHEET-C3-C12.md:50` | S |
| Biểu đồ | Excel mở biểu đồ đã lưu | 3 | ĐẦY ĐỦ | Excel COM đọc 3 ChartObjects: `docs/AUDIT-SHEET-C3-C12.md:51` | S |
| Biểu đồ | Biểu đồ kết hợp/secondary axis | 2 | MỘT PHẦN — chưa có acceptance ngang Excel | `tests/unit/sheet-charts.test.js:6-145`; desktop parity: **NOT RUN** | L |
| Biểu đồ | Chỉnh tiêu đề/chú giải/nhãn dữ liệu | 2 | MỘT PHẦN — model có, chưa kiểm desktop đầy đủ | `tests/unit/sheet-charts.test.js:6-145`; desktop: **NOT RUN** | M |
| In ấn | Đặt vùng in | 3 | ĐẦY ĐỦ | CDP + Excel COM + reopen: `docs/AUDIT-SHEET-C3-C12.md:52` | S |
| In ấn | Fit to one page | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:53` | S |
| In ấn | Hàng tiêu đề lặp | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:54` | S |
| In ấn | Cột tiêu đề lặp | 2 | MỘT PHẦN — model hỗ trợ, chưa có CDP/COM cho cột | `apps/sheet/sheet-grid.js:9127-9138`; desktop: **NOT RUN** | M |
| In ấn | Header/Footer và số trang | 2 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:55` | S |
| In ấn | Ngắt trang ngang/dọc | 3 | ĐẦY ĐỦ | CDP + Excel COM: `docs/AUDIT-SHEET-C3-C12.md:56` | S |
| In ấn | Khổ A4 | 3 | ĐẦY ĐỦ | `apps/sheet/sheet-grid.js:75-78`; `tests/unit/sheet-print-preview.test.js:168-178` | S |
| In ấn | Hướng dọc/ngang | 3 | ĐẦY ĐỦ | `tests/unit/sheet-print-preview.test.js:181-188` | S |
| In ấn | Lề trang | 2 | ĐẦY ĐỦ | defaults/model `apps/sheet/sheet-grid.js:33-41`; roundtrip `tests/unit/sheet-print-setup-roundtrip.test.js:1-55` | S |
| In ấn | In đường lưới/tiêu đề hàng cột | 2 | ĐẦY ĐỦ | model `apps/sheet/sheet-grid.js:40`; roundtrip `tests/unit/sheet-print-setup-roundtrip.test.js:1-55` | S |
| In ấn | Phân trang bảng rộng/cao | 2 | ĐẦY ĐỦ | `tests/unit/sheet-print-preview.test.js:190-226` | S |
| In ấn | Chọn máy in/số bản/phạm vi | 2 | MỘT PHẦN — dialog OS chưa kiểm qua CDP | `docs/AUDIT-SHEET-RECHECK-0610.md:7,44` | M |
| Pivot | Tạo Pivot cơ bản Rows/Columns/Sum | 3 | ĐẦY ĐỦ | `tests/unit/sheet-pivot-table.test.js:17-22` | S |
| Pivot | Count/Average | 2 | ĐẦY ĐỦ | `tests/unit/sheet-pivot-table.test.js:24-28` | S |
| Pivot | Refresh Pivot | 3 | ĐẦY ĐỦ | `tests/unit/sheet-pivot-table.test.js:41-48` | S |
| Pivot | Undo/Redo tạo/xóa Pivot | 2 | ĐẦY ĐỦ | `tests/unit/sheet-pivot-table.test.js:30-56` | S |
| Pivot | Lưu/mở XLSX giữ Pivot fidelity | 3 | MỘT PHẦN — có import/save tests nhưng chưa corpus Excel desktop rộng | `tests/unit/sheet-pivot-import.test.js:85-180`; `tests/unit/sheet-pivot-save-fods.test.js:7-84` | L |
| Pivot | Pivot Chart | 1 | MỘT PHẦN — chỉ bar/pie và test tập trung | source `apps/sheet/sheet-grid.js:6839-6857`; `tests/unit/sheet-pivot-chart.test.js:7-43` | M |
| Phím tắt | Ctrl+C/X/V/Z/Y/F/H/P | 3 | MỘT PHẦN — đa số có, clipboard và dialog OS còn lỗ hổng desktop | `tests/unit/sheet-keyboard-audit.test.js:55-122`; `docs/AUDIT-SHEET-UI-0610.md:19` | M |
| Phím tắt | Ctrl+Shift+4/5 định dạng tiền/% | 3 | ĐẦY ĐỦ | CDP: `docs/AUDIT-SHEET-UI-0610.md:16` | S |
| Phím tắt | F1 mở Trợ giúp tiếng Việt | 2 | MỘT PHẦN — tab/search có, F1 context chưa chạy | `docs/AUDIT-SHEET-BASICS.md:35` | M |
| Phím tắt | Alt key tips và ribbon bằng bàn phím | 2 | MỘT PHẦN — chưa acceptance đầy đủ | `docs/AUDIT-SHEET-BASICS.md:34` | M |
| Giao diện | Ribbon tiếng Việt chuẩn nhóm công việc | 3 | ĐẦY ĐỦ | quan sát desktop: `docs/AUDIT-SHEET-BASICS.md:34` | S |
| Giao diện | Thanh trạng thái có tổng vùng chọn | 2 | ĐẦY ĐỦ | `tests/unit/sheet-status-bar-sum.test.js:1-100` | S |
| Giao diện | Zoom slider/Ctrl+wheel | 2 | MỘT PHẦN — chưa chạy desktop trong audit | `docs/AUDIT-SHEET-BASICS.md:33` — NOT RUN | S |
| Giao diện | Normal/Page Layout/Page Break Preview | 2 | MỘT PHẦN — model có, chưa fidelity Excel đầy đủ | `apps/sheet/sheet-grid.js:8994-9004`; desktop parity: **NOT RUN** | M |
| Giao diện | Lưới đủ 1.048.576 × 16.384 | 2 | ĐẦY ĐỦ | CDP 14/14 và 79.500 ô parity: `docs/AUDIT-SHEET-C3-C12.md:21` | S |
| Hiệu năng | Mở file lớn lan14 | 3 | MỘT PHẦN — đã tối ưu/đo pipeline nhưng chưa đạt acceptance trọn vẹn | `docs/HANDOFF-SHEET-OPEN-PHASE2-FINDINGS.md:35`; `docs/HANDOFF-SHEET-OPEN-PHASE2-INTEGRATION.md:45-48` | L |
| Hiệu năng | Cuộn/nhảy vùng cực lớn | 2 | ĐẦY ĐỦ | CDP 54 ms đến hàng 1.000.000, Ctrl+Down 297 ms: `docs/AUDIT-SHEET-C3-C12.md:21` | S |
| Tương thích | 28 XLSX mở/sửa/lưu/mở Excel | 3 | MỘT PHẦN — 26 file roundtrip đầy đủ, lan06/lan14 chỉ đo pipeline | `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md:24-57,102-106` | L |
| Tương thích | 20 XLS mở/sửa/lưu/mở Excel | 3 | MỘT PHẦN — đường XLS có nhưng bộ 20 chưa chạy | `scripts/test_live_save_in_place.py:361-450`; corpus 20 XLS: **NOT RUN** | L |
| Tương thích | Giữ công thức khi roundtrip XLSX | 3 | MỘT PHẦN — mẫu audit có, chưa bao phủ corpus đầy đủ | XML thật `docs/AUDIT-SHEET-RECHECK-0610.md:34`; corpus 28: chưa hoàn chỉnh | L |
| Tương thích | Giữ định dạng số/tiền/ngày XLSX | 3 | MỘT PHẦN — đường cơ bản đạt, custom format corpus còn rủi ro | `docs/AUDIT-SHEET-C3-C12.md:35,59`; `docs/HANDOFF-SHEET-NUMBER-FORMAT-CODES.md:5-50` | L |
| Tương thích | Giữ nhiều sheet khi roundtrip | 3 | ĐẦY ĐỦ | `tests/unit/sheet-file-io.test.js:171-206`; `tests/unit/sheet-multi-sheet.test.js:44-170` | S |
| Tương thích | External links | 1 | MỘT PHẦN — cache/lưu có nhưng recalculation từng lỗi | `docs/HANDOFF-SHEET-EXTLINKS-FINDINGS.md:142-143` | L |
| Trợ giúp | Bài hướng dẫn nhập và định dạng dữ liệu | 2 | ĐẦY ĐỦ | `tests/unit/help-getting-started.test.js:220-241`; coverage `tests/unit/help-coverage.test.js:47-61` | S |
| Trợ giúp | Hướng dẫn theo từng lệnh Sheet | 2 | MỘT PHẦN — coverage test có ngoại lệ backlog | `tests/unit/help-coverage.test.js:47-61,147-179` | M |
| Bảo vệ | Khóa sheet/vùng ô | 2 | MỘT PHẦN — capability có, chưa acceptance Excel đầy đủ | `tests/unit/sheet-rename-move-protect.test.js:1-180`; desktop parity: **NOT RUN** | M |
| Bảo vệ | Khóa cấu trúc workbook | 1 | ĐẦY ĐỦ | `tests/unit/sheet-protect-workbook.test.js:1-122` | S |

## Nhận định chính

- Nền tảng thao tác bảng tính thường ngày đã khá rộng: chọn/điền, định dạng, nhiều sheet, sort/filter/freeze, validation, biểu đồ cơ bản và thiết lập in đều có CDP desktop thật; đây là vùng gần Excel nhất.
- Khoảng cách lớn nhất không nằm ở số lượng nút mà ở **fidelity và cổng nghiệm thu corpus**: 28 XLSX chưa đủ 28 roundtrip hoàn chỉnh, 20 XLS chưa chạy, định dạng số tùy chỉnh/Pivot/external links chưa có bằng chứng ngang Excel đủ rộng.
- Công thức phổ biến cơ bản đã chạy; các biến thể approximate, nhiều điều kiện, tham chiếu tuyệt đối F4 và hàm nâng cao mới chủ yếu có unit test, chưa nên coi là ngang Excel ở mức desktop.
- Input tiền Việt đã có implementation nhận `₫/đ/VND/VNĐ`, nhưng audit 06/10 ghi FAIL trước đó và task S1 không chạy lại desktop; vì vậy vẫn là `MỘT PHẦN` cho đến khi nhánh sửa tiền tệ được tích hợp và CDP xác nhận.

## 25 mục ưu tiên

Sắp theo `điểm = Quan trọng × mức thiếu`, trong đó `THIẾU = 2`, `MỘT PHẦN = 1`; cùng điểm thì ưu tiên luồng dữ liệu người dùng và rủi ro mất fidelity trước. Danh sách này chỉ gồm khoảng cách chưa đóng.

| # | Mục | Quan trọng | Trạng thái | Điểm | Việc cần làm | Cỡ |
|---:|---|---:|---|---:|---|---|
| 1 | Color scales/data bars/icon sets | 2 | THIẾU | 4 | Thiết kế capability CF nâng cao, lưu/mở XLSX và hướng dẫn tiếng Việt | L |
| 2 | 28 XLSX mở/sửa/lưu/mở Excel | 3 | MỘT PHẦN | 3 | Chạy đủ 28/28, gồm lan06/lan14, kiểm Excel COM + XML + dữ liệu/công thức/style | L |
| 3 | 20 XLS mở/sửa/lưu/mở Excel | 3 | MỘT PHẦN | 3 | Chạy corpus 20 XLS thật; xác nhận OLE2, save-in-place và Excel reopen | L |
| 4 | Giữ định dạng số/tiền/ngày XLSX | 3 | MỘT PHẦN | 3 | So sánh number-format ID/code, ngày, VND, accounting trên đủ corpus | L |
| 5 | Giữ công thức roundtrip XLSX | 3 | MỘT PHẦN | 3 | So XML formula/cache và tính lại Excel trên đủ corpus | L |
| 6 | Mở XLS 97–2003 | 3 | MỘT PHẦN | 3 | Nghiệm thu đủ 20 XLS qua UI/app desktop | L |
| 7 | Ctrl+S giữ định dạng XLS | 3 | MỘT PHẦN | 3 | Xác nhận không đổi đuôi/format, không mất macro/định dạng được hỗ trợ | L |
| 8 | Ctrl+S lưu tại chỗ XLSX | 3 | MỘT PHẦN | 3 | Chạy lại đủ 28 file, kiểm nguồn không bị phá và bản lưu mở được | M |
| 9 | Lưu thành XLSX/XLS | 3 | MỘT PHẦN | 3 | Chạy luồng UI, ghi đè, hủy và reopen bằng Excel | M |
| 10 | Tiền tố ₫/VND/VNĐ thành số | 3 | MỘT PHẦN | 3 | Tích hợp nhánh sửa, CDP nhập các biến thể và kiểm XLSX numeric | M |
| 11 | Dán giữ định dạng từ Excel | 3 | MỘT PHẦN | 3 | Desktop clipboard matrix: value/formula/style/border/merge/date/VND | M |
| 12 | Cắt/sao chép/dán trong Sheet | 3 | MỘT PHẦN | 3 | Giải quyết audit mâu thuẫn và chạy Undo/Redo desktop | M |
| 13 | SUMIFS | 3 | MỘT PHẦN | 3 | CDP + Excel COM với nhiều vùng/criteria/wildcard/lỗi kích thước | M |
| 14 | COUNTIFS | 3 | MỘT PHẦN | 3 | CDP + Excel COM với nhiều vùng/criteria/wildcard | M |
| 15 | VLOOKUP approximate | 3 | MỘT PHẦN | 3 | So exact/approx, sorted/unsorted, lỗi biên với Excel | M |
| 16 | ROUND | 3 | MỘT PHẦN | 3 | CDP/Excel COM cho số âm, digits âm, midpoint và lỗi | M |
| 17 | Tham chiếu tuyệt đối F4 | 3 | MỘT PHẦN | 3 | Sửa/đóng candidate, kiểm chu kỳ A1→$A$1→A$1→$A1 | M |
| 18 | Lọc nhiều điều kiện/kiểu dữ liệu | 3 | MỘT PHẦN | 3 | Kiểm số/text/date/blanks/multiple selections và roundtrip XLSX | L |
| 19 | Pivot fidelity khi lưu/mở XLSX | 3 | MỘT PHẦN | 3 | Excel COM kiểm cache, fields, layout, refresh và source range | L |
| 20 | Mở file lớn lan14 | 3 | MỘT PHẦN | 3 | Chốt thời gian/RAM/UI responsiveness cho open-edit-save-reopen | L |
| 21 | Chọn máy in/số bản/phạm vi | 2 | MỘT PHẦN | 2 | Test desktop không SendKeys; xác nhận dialog và PDF/print settings | M |
| 22 | Công thức lỗi và propagation | 2 | MỘT PHẦN | 2 | Matrix #DIV/0/#N/A/#VALUE/#REF qua dependency và roundtrip | M |
| 23 | Mã định dạng số tùy chỉnh | 2 | MỘT PHẦN | 2 | Nghiệm thu custom codes trong corpus, gồm màu/điều kiện/accounting | L |
| 24 | Biểu đồ kết hợp/secondary axis | 2 | MỘT PHẦN | 2 | Bổ sung/kiểm combo, secondary axis và Excel reopen | L |
| 25 | F1/Alt key tips và keyboard ribbon | 2 | MỘT PHẦN | 2 | Chạy coverage desktop không input OS, sửa điểm không tới được | M |
