# Kế hoạch FIX-P1 — Mở, sửa và hoàn tác workbook lớn trong VN Sheet

## Mục tiêu

- Với workbook `.xlsx` đến 10 MB, hiển thị dữ liệu có thể cuộn trong ≤5 giây kể từ khi người dùng mở tệp, không khóa giao diện.
- Cho phép lần sửa đầu (gõ nội dung và Enter) trong ≤1 giây khi dữ liệu đang nạp nền; chỉnh sửa đã nhận phải còn nguyên sau khi mô hình đầy đủ thay thế mô hình tạm.
- Ctrl+Z/Ctrl+Y giữ đúng thứ tự và trạng thái trước/sau khi nạp nền kết thúc, cho thao tác gõ, xóa, dán và định dạng.
- Xem lại Xem trước khi in/In trên workbook lớn, giữ fidelity XLSX hiện tại: batch LAN phải mở bằng Excel và `diffs=0`.
- Giữ LibreOffice làm engine mở/chuyển đổi/in; UI chỉ dùng Sheet Adapter/bridge. App hoạt động offline.

## Năng lực hiện có và baseline trước sửa

- `main.py` gọi `_open_sheet_quick_view_if_enabled()` trước khi chạy đường XLSX→FODS đầy đủ. Hàm này mở workbook qua persistent soffice worker (`view_open`/`view_window`) và gửi một cửa sổ đầu tiên sang WebView2.
- `apps/sheet/sheet-quick-view.js` dựng cửa sổ đọc riêng, hiện chặn mọi lệnh sửa/lưu và điều hướng sửa cho đến khi mô hình đầy đủ sẵn sàng. `adapters/libreoffice/sheet/sheet-adapter.js` nạp mô hình đầy đủ rồi gán `grid.undoStack=[]` và `grid.redoStack=[]`.
- Đường đầy đủ hiện có payload Sheet và FODS fallback; `save()`/`saveAs()` serialize mô hình hiện hành, còn Xem nhanh chặn lưu.
- Tài liệu lịch sử: `docs/HANDOFF-SHEET-OPEN-PERF-PLAN-FINDINGS.md`, `docs/PLAN-SHEET-OPEN-PERF.md`, `docs/HANDOFF-SHEET-OPEN-PHASE1-FINDINGS.md`, `docs/HANDOFF-SHEET-VIEWFIRST-DEFAULT-VERIFY.md`, `docs/perf-measure/viewfirst-default-28.md`, `docs/SPEC-PERF-OPEN.md`.
- Baseline CDP app desktop worktree trên lan01 với profile `E:\VNOffice-profiles\codex-fp1`, phép đo đúng lấy sự kiện `vno:sheet-quick-view-ready` trước khi chờ source path: Xem nhanh hiện dữ liệu sau 5.08 s kể từ `__vnoSheetOpenStartedAt`; màn hình cuộn được và hiển thị dữ liệu đầu. Một lượt lạnh khác ghi 6.40 s. Cả hai vượt mốc 5 s; lượt đo gồm app launch.
- Trace desktop có `VNO_PERF_DEBUG=1`: worker sẵn sàng 3.65–3.78 s (chạy song song với app), `view_open` khoảng 2.00 s, truy vấn vùng đầu `view_window` 0.80 s. Mở đầy đủ: UNO conversion 3.88 s, metadata-prefetch wait 10.99–11.17 s, native overlay 17.34–17.73 s, optimize 5.08–5.94 s; parse/model đầy đủ JS 1.90–2.12 s và vẽ grid 1.74–1.92 s. `selection-to-first-grid` 42.67–45.53 s. Kết luận đo: Xem nhanh sẵn có đã cho xem/cuộn trong vài giây; điểm nghẽn người dùng là không thể sửa cho tới khi full model hoàn tất. Harness đầu tiên đã chờ `sourcePath` trước khi hỏi selector quick view, nên số 50 s trước đây là full-model latency, không phải first paint.
- Baseline tách pipeline `scripts/layout-audit/_time_sheet_open_stages.py` trên lan01: LibreOffice XLSX→FODS 22.90 s; layout overlay 13.50 s; cell metadata overlay 26.21 s; optimize 6.50 s; XF reoverlay 1.07 s; tổng Python 71.50 s, FODS cuối 7.65 triệu ký tự. Phép đo pipeline riêng, không cộng trực tiếp với CDP.
- Ticket cung cấp số liệu app desktop 0.9.10: lan01 46 s mở + 100 s lần sửa đầu; lan04 9.6 s và undo hỏng; lan06 60 s mở. Phải đo lại trên worktree trước/sau và ghi riêng theo đúng mốc sự kiện.

## Phạm vi và module dự kiến

1. `apps/sheet/sheet-quick-view.js`, `apps/sheet/sheet-quick-view.css`: truy vấn/render cửa sổ đầu theo viewport; journal sửa ô, xóa, dán và định dạng với Ctrl+Z/Ctrl+Y.
2. `adapters/libreoffice/sheet/sheet-adapter.js`: trả quyền điều khiển UI sau khi quick view render, tiếp tục hydrate nền, replay thao tác một lần lên lưới thật và giữ nhánh undo/redo; save/print đợi hydrate.
3. `main.py`: phát vùng đầu đủ viewport qua bridge hiện có cho mọi `.xlsx` (ngưỡng 5 MiB hiện tại bỏ sót lan02/lan04 dù phiếu đặt mục tiêu cho toàn bộ workbook ≤10 MB), đồng thời đưa đường dẫn nguồn vào quick-view payload để báo lỗi/retry. Giữ `VNO_OPEN_VIEWFIRST=0` làm đường lui.
4. `apps/sheet/sheet-app.js`, `platform/help/entries-gaps-0410.js`: nối đường dẫn retry và hướng dẫn tiếng Việt cụ thể trong Trợ giúp.
5. `tests/unit/sheet-quick-view.test.js` và CDP desktop hiện có: kiểm chứng journal/replay, undo/redo, độ trễ và fidelity; không sửa fixture hoặc expected output để làm xanh.
6. `docs/PERF-SHEET-OPEN-1012.md` và `/09-templates/AGENT-HANDOFF.md`: ghi kết quả đo trước/sau và handoff.

Không sửa `upstream/**`, không thêm dependency, không đổi semantics file format. Không có dữ liệu tài liệu nào gửi ra cloud.

## Phụ thuộc và cổng quyết định

- Dùng persistent soffice worker/UNO và Sheet Adapter hiện tại; không gọi LibreOffice internals từ UI. Dùng CDP desktop hiện có và pywebview bridge nội bộ.
- Không mở rộng cơ chế lưu để ghi partial workbook. Nếu chưa hydrate đủ, lưu/In phải đợi với tiến độ rõ và có thể hủy; nếu app dừng/hydrate lỗi thì giữ bản Xem nhanh, giữ hàng đợi sửa và cho thử lại.
- Mọi thay đổi có thể ảnh hưởng fidelity chỉ bật sau cờ canary có mặc định an toàn; giữ đường mở đầy đủ hiện tại để fallback.

## Rủi ro và cách kiểm soát

- **Mất/sửa đè dữ liệu khi hydrate:** hàng đợi edit có workbook/session ID, tọa độ ô và lệnh; chỉ replay một lần lên mô hình đầy đủ, thứ tự undo/redo dựa trên cùng journal. Kiểm tra giá trị sau gõ, undo, redo trước/sau hydration.
- **Tính năng phạm vi workbook:** công thức liên sheet, tìm kiếm, lọc/sắp xếp, dán vùng, định dạng vùng, merge, và lệnh cấu trúc cần toàn workbook. Chúng phải yêu cầu hydration hoặc có triển khai vùng được chứng minh; không trả kết quả thiếu mà không báo.
- **Mô hình tạm và lưu/in:** cấm serialize bản tạm như workbook hoàn chỉnh. Lưu/In đợi mô hình đầy đủ; thông báo rõ sửa tạm đang được giữ.
- **Worker/UNO đồng thời hoặc treo:** đo hàng đợi và timeout; gọi view trước full conversion như hiện có; mọi lỗi quick view phải rơi về đường đầy đủ, lỗi full load hiển thị retry/error rõ.
- **Chi phí quick view với workbook nhỏ:** bắt đầu thêm một lượt `view_open` UNO cho các `.xlsx` nhỏ; đo lan02/lan04 và batch 28 tệp. Nếu làm chậm hoặc đổi dữ liệu, đặt `VNO_OPEN_VIEWFIRST=0` để trở về luồng cũ.
- **Worker sẵn sàng muộn khi mở bằng đường dẫn khởi chạy:** phát lệnh khởi động UNO nền sớm hơn trong bootstrap để phần khởi động chồng lấp với việc dựng giao diện; không chờ worker trên UI thread. Đo lại cold desktop launch và quick-view timing trước khi giữ thay đổi.
- **Undo history:** nạp file mới vẫn phải tạo journal mới; chỉ quá trình hydrate cùng một document giữ history. Các thao tác gõ/xóa/dán/format phải khôi phục đúng trước/sau qua Ctrl+Z/Ctrl+Y.
- **In workbook lớn:** dùng cùng document/session LibreOffice nếu worker đã mở; tránh chuyển đổi đồng bộ trùng lặp ở UI thread; xác minh trang xem trước, thao tác in và không treo.

## Kế hoạch kiểm chứng

- **Đo app desktop/CDP trước và sau:** lan01, lan04, lan06, lan09, lan14, lan16; time-to-first-data + scroll, lần sửa đầu (gõ + Enter), full hydration, UI responsiveness, lưu và Xem trước khi in/In. Dùng `VNO_APP_ROOT=E:\VNOffice-codex-fp1`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fp1`; CDP chuột/phím thật, không SendKeys/OS input; PID chỉ do harness tạo.
- **Undo/redo CDP:** mỗi file kiểm gõ, xóa, dán và định dạng; chụp trạng thái trước/sau Ctrl+Z và Ctrl+Y, cả trước lẫn sau khi full hydration hoàn tất.
- **Fidelity:** batch lan01,02,04,06,09,11,22,26 với `VNO_AUDIT_MARK_DIRTY=1`, app root worktree; xác nhận mở bằng Excel, `diffs=0`. Chạy regression trên 28 file LAN: không ô sai.
- **Bộ kiểm tra repo:** `npm test`; `python -m unittest discover -s tests`; nếu có lỗi chập chờn chạy riêng ba lượt. Quét mã hóa UTF-8 không BOM và `git diff --check`.
- **In:** mở preview và kiểm tra tiến độ/khả năng phản hồi trên các workbook lớn; hoàn tất thao tác In chỉ trong môi trường đo an toàn, không gửi ra máy in vật lý.
- Chỉ ghi **PASS** khi đã chạy và qua; nếu không thì ghi FAIL/NOT RUN/BLOCKED đúng tình trạng.

## Rollback

- Giữ nguyên loader FODS/payload đầy đủ và bật edit-while-loading bằng cờ canary; tắt cờ để trở về Xem nhanh chỉ đọc + loader hiện tại.
- Nếu replay/history/fidelity/lưu/in sai, không cho lưu partial; tắt cờ ngay và giữ legacy path.
- Không xóa history/loader cũ hoặc đổi mặc định toàn cục cho tới khi đủ các cổng desktop, fidelity và 28-file LAN.

## Trình tự thay đổi

1. Ghi và commit baseline này cùng plan trước khi sửa luồng mở/lưu.
2. Baseline Xem nhanh 5.08–6.40 s; giảm kích thước truy vấn first-window và render theo viewport để đạt ≤5 s.
3. Thêm edit journal trong quick view; phát lại từng nhóm thao tác trước sự kiện `full-model-ready`, khôi phục cả undo/redo tail.
4. Rà lệnh lưu/in, chỉ bật sau full hydration; sửa tiến độ/lỗi và Help tiếng Việt theo UI thật.
5. Chạy các cổng desktop, fidelity, unit và batch; ghi số liệu trước/sau và handoff.
