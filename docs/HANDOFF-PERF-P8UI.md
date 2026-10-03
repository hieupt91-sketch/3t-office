# Agent Handoff — P8 UI viewport-first

TASK: P8 giai đoạn A — màn hình xem nhanh chỉ đọc cho XLSX lớn, sau đó chuyển êm sang lưới đầy đủ.
AGENT/ROLE: Codex / Sheet UI
BRANCH: `perf/p8-ui-codex`
WORKTREE: `E:\VNOffice-codex-p8ui`
OBJECTIVE: Với `VNO_OPEN_VIEWFIRST=1`, tệp XLSX từ 5 MiB trở lên hiển thị cửa sổ dữ liệu đầu qua UNO trong mục tiêu <= 12 giây; đường FODS hiện hữu tiếp tục chạy và khi hoàn tất phải giữ sheet/ô/cuộn rồi trả nguyên trạng mọi chức năng hiện có. Khi cờ tắt, hành vi phải giữ 100% như cũ.

## Plan gate (04/10/2026 — phải có trước code)

### Current capability

- `soffice_uno_worker.py` đã có `view_open`, `view_window`, `view_close`; `main.py` đã bọc ba API này.
- Luồng đầy đủ vẫn là `open_document_dialog` → LibreOffice xuất FODS → overlay/optimize/payload → `SheetAdapter.loadFromPayload()` → `_commitWorkbook()`.
- Worker UNO tuần tự bằng `_PERSISTENT_SOFFICE._lock`; nếu export FODS giành lock trước thì truy vấn cửa sổ có thể chờ lâu.
- Lưới thật lưu toàn bộ ô trong `grid.sheetsData`; không dùng cấu trúc này cho xem nhanh để tránh thay đổi chức năng/chủ sở hữu hiện có.

### Thiết kế và lý do

- Ngưỡng chọn: XLSX **>= 5 MiB** (kích thước tệp nguồn, kiểm tra ở Python trước khi mở UNO). Đây là ngưỡng rõ ràng trong brief, bao phủ lan14 9 MiB và tránh thêm độ trễ cho tệp nhỏ/vừa. Không dùng kích thước FODS vì FODS chưa tồn tại ở thời điểm cần quyết định xem nhanh.
- `main.py` đưa `viewFirst=1` vào URL chỉ khi biến môi trường bật; API mở nhanh không nhận đường dẫn tùy ý từ UI mà dùng `_initial_file`, đồng thời tự kiểm tra phần mở rộng/ngưỡng. Nội dung tài liệu không ra mạng.
- Module mới `apps/sheet/sheet-quick-view.js` sở hữu lớp xem nhanh chỉ đọc, cache cửa sổ, debounce cuộn, ánh xạ block định dạng và bàn giao trạng thái. Không nhét thêm logic vào `sheet-grid.js` lớn.
- Điều chỉnh sau khi đọc luồng mở thật (trước khi sửa mã): ngay trong `open_document_dialog`, sau khi người dùng đã chọn/ứng dụng đã nhận đường dẫn và trước export FODS, Python gọi tuần tự `view_open` + cửa sổ đầu rồi đẩy payload vào callback JS. Cách này vẫn bảo đảm cửa sổ đầu không bị export xếp trước trên cùng worker, đồng thời hỗ trợ cả tệp khởi động lẫn Ctrl+O; phương án để `SheetApp.init()` tự mở chỉ giải quyết được tệp khởi động nên đã không dùng. Sau callback, đường đầy đủ chạy nguyên trạng.
- Xem nhanh dùng lớp phủ đúng vùng grid, có tiêu đề hàng/cột, tab sheet, chọn ô và cuộn ảo. Lớp phủ bắt sự kiện chỉnh sửa/dán/lưu và thông báo tiếng Việt; không ghi đệm thao tác.
- Sau `_commitWorkbook()` thành công, adapter phát sự kiện bàn giao. Quick view áp sheet/ô/cuộn vào API công khai hiện có của grid, chờ hai frame rồi mới ẩn lớp phủ để giảm nhấp nháy, sau đó gọi `view_close`. Nếu mở đầy đủ lỗi, lỗi hiện hữu vẫn hiển thị và quick view cũng đóng.
- Phần trăm là tiến độ theo các mốc thật sẵn có của pipeline (chọn tệp/chuyển đổi/tối ưu/đóng gói/dựng mô hình), không giả là phần trăm byte.

### Files/modules dự kiến

- `main.py`: cờ URL, kiểm tra ngưỡng, API mở nhanh theo tệp khởi động, dọn view khi đóng cửa sổ.
- `apps/sheet/sheet-quick-view.js`: model/cache/style/DOM/virtual viewport/transition/cleanup.
- `apps/sheet/sheet-quick-view.css` hoặc phần CSS Sheet chuyên biệt: giao diện, focus, trạng thái tải.
- `apps/sheet/sheet-app.js`: vòng đời controller và nối progress.
- `adapters/libreoffice/sheet/sheet-adapter.js`: chỉ thêm tín hiệu thành công/thất bại sau luồng hiện hữu; không đổi mô hình hay tính năng.
- `platform/help/entries-sheet.js`: hướng dẫn tiếng Việt “Mở tệp Excel lớn: màn hình xem nhanh và nạp đầy đủ”.
- `tests/unit/sheet-quick-view.test.js`, `tests/run-tests.js`: cache/window/style/transition.
- `tests/live/cdp/sheet-viewfirst.desktop.mjs`: bài desktop theo yêu cầu.

### Dependencies

- Chỉ dùng DOM/CSS/JS chuẩn, Python chuẩn và API pywebview/UNO đã có; không thêm thư viện.
- Phụ thuộc worker nền của Claude và `SheetGridController`/`SheetAdapter` hiện hữu, nhưng không sửa LibreOffice Core hay semantics định dạng tệp.

### Risks và giảm thiểu

- Tranh lock với export: lấy và vẽ cửa sổ đầu trước khi khởi động đường đầy đủ.
- Đơn vị UNO 1/100 mm khác CSS px: đổi theo 96 dpi và có giới hạn hợp lý; bản đầy đủ vẫn là nguồn cuối cùng.
- Cache/RAM: cache theo khóa cửa sổ có giới hạn LRU; không nhân bản toàn workbook.
- Tắt/thoát/LibreOffice sập: mọi nhánh transition, lỗi và destroy đều gọi close idempotent; Python giữ danh sách view theo cửa sổ để dọn cuối.
- Lệnh từ ribbon có nhiều đường: lớp phủ chặn tương tác chỉnh sửa và adapter chặn Save/Paste trong thời gian chỉ đọc; thông báo giải thích rõ khi nào sửa được.
- Rollback: bỏ `VNO_OPEN_VIEWFIRST=1`; URL không có cờ, module không mở UNO và đường cũ chạy nguyên trạng.

### Test plan

- Unit Node: logic cửa sổ/cache, block format → CSS, snapshot/bàn giao sheet + ô + scroll; chạy toàn bộ `node tests/run-tests.js` và chỉ claim theo kết quả thật.
- Desktop cờ tắt với profile riêng: 27 bài hồi quy.
- CDP cờ bật: lan14 thời gian tới A1, cuộn khoảng dòng 20.000, đổi sheet, chuyển đầy đủ giữ trạng thái, so 30x10 text/value; lặp hành vi lan03/16/26.
- CDP Sheet: `sheet-format-state`, `ctx-menu`, `ch4-6-keep-focus`, `formula-hints`.
- Đo peak RAM WebView2 lan14, đạt nếu <= 3,24 GB (2,7 GB + 20%).
- Gate đầy đủ chạy đúng một lượt cuối; ghi raw/tóm tắt vào tệp, báo PASS/FAIL/NOT RUN trung thực.

FINDINGS: Chưa hoàn tất triển khai.
IMPLEMENTATION SUMMARY: Chưa hoàn tất triển khai.
FILES CHANGED: `docs/HANDOFF-PERF-P8UI.md` (plan gate).
COMMANDS RUN: Xem phần kết quả cuối.
BUILD RESULT: NOT RUN.
TEST RESULTS: NOT RUN.
KNOWN FAILURES: Chưa có.
RISKS: Xem plan gate.
DEPENDENCIES/BLOCKERS: Không có tại thời điểm lập plan.
CORE PATCH ID (if any): Không có; không sửa Core.
NEXT ACTION: Triển khai module xem nhanh và các điểm tích hợp theo plan.
