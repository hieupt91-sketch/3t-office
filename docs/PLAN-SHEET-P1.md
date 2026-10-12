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
3. `main.py` và `adapters/libreoffice/common/soffice_uno_worker.py`: phát vùng đầu đủ viewport qua bridge hiện có cho mọi `.xlsx` (ngưỡng 5 MiB hiện tại bỏ sót lan02/lan04 dù phiếu đặt mục tiêu cho toàn bộ workbook ≤10 MB); chỉ đo used range của trang tính đầu tiên trước first paint, lấy kích thước các trang còn lại khi người dùng mở chúng. Đưa đường dẫn nguồn vào payload lỗi/retry. Giữ `VNO_OPEN_VIEWFIRST=0` làm đường lui.
4. `apps/sheet/sheet-quick-view.js`, `apps/sheet/sheet-app.js`, `platform/help/entries-gaps-0410.js`: nhận kích thước sheet lười khi đổi tab, nối đường dẫn retry và hướng dẫn tiếng Việt cụ thể trong Trợ giúp.
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

## Bổ sung kế hoạch sau kiểm chứng batch 12/10

### Kết quả làm thay đổi kế hoạch

- Xem nhanh đạt 2.74–4.54 s trên các tệp LAN01/02/04/09/16 đã đo; lần gõ đầu + Enter đạt 0.79–0.86 s. LAN14 (9.74 MB) vẫn 6.26–6.97 s, vượt mục tiêu ≤5 s.
- Trên LAN14, `worker_ready` mất khoảng 3.4–3.5 s và UNO `view_open` khoảng 3.96–3.98 s. Giảm viewport và trì hoãn quét các sheet không hoạt động không làm giảm thời gian mở workbook trong LibreOffice.
- Batch 28 tệp: 25 PASS, 2 FAIL, 1 BLOCKED. LAN14 round-trip vượt timeout CDP 25 phút (đầu ra vẫn `diffs=0`, lint sạch, Excel mở được); LAN25 báo 9419 diff ở đường lưu XLSX→FODS. Chạy lại LAN25 với `VNO_OPEN_VIEWFIRST=0` vẫn 9419 diff, nên hiện là lỗi nền của luồng lưu, không phải hồi quy quick view. LAN04 bị BLOCKED khi Windows không khởi tạo Excel COM (CO_E_SERVER_EXEC_FAILURE).

### Objective bổ sung

- Đạt first paint + scroll ≤5 s cho LAN14 ≤10 MB mà không đổi file format semantics, không thay full-model engine và không để UI gọi LibreOffice implementation.
- Giữ LibreOffice UNO làm nguồn authoritative cho full workbook, chỉnh sửa, lưu và in. Bộ đọc OOXML mới chỉ cung cấp tạm thời các giá trị/công thức của viewport đầu; full UNO hydration vẫn thay thế preview và nhận journal sửa như hiện tại.

### Thiết kế và phạm vi

1. Trước khi triển khai, đo Python stdlib `zipfile`/`xml.etree.ElementTree` đọc workbook relationships, active sheet, shared strings và viewport 40×20 trên LAN14; ghi riêng thời gian đọc archive và parse.
2. Nếu phép đo dưới ngân sách còn lại (≤1.5 s), thêm module Python app/service cho Sheet để dựng payload preview chỉ đọc từ OOXML. Hỗ trợ shared/inline strings, cached values, công thức, sheet names, dimension và trạng thái lỗi có thể retry; không serialize hoặc sửa XLSX.
3. `main.py` bắt đầu UNO worker/full conversion song song, gửi payload OOXML tạm cho UI qua bridge hiện có ngay khi sẵn sàng; adapter nhận diện nguồn preview và chuyển sang view UNO/full model khi có. Replay edit journal đúng một lần; nếu đọc OOXML lỗi thì fallback sang UNO view-first hiện tại.
4. UI tiếp tục chỉ gọi Sheet Adapter/bridge. Cập nhật unit tests cho shared strings, inline strings, cached formula, sheet mapping, malformed package và replay sau thay thế; thêm phép đo CDP thật trên LAN14.
5. Chỉ thêm parser nếu payload khớp các giá trị hiển thị của UNO trên fixture LAN01/02/04/14 và first paint LAN14 ≤5 s. Nếu không đạt các điều kiện đó, bỏ thử nghiệm parser và ghi rõ giới hạn; không làm parser thành nguồn lưu.

### Phụ thuộc, rủi ro, rollback và kiểm chứng

- Chỉ dùng Python standard library có sẵn; không thêm dependency. Parser chỉ đọc OOXML để preview và không áp dụng file-format semantics mới.
- Rủi ro: shared strings lớn, relationship target tương đối, sheet active khác sheet1, công thức không có cached value, XML malformed và UI hiển thị thiếu style. Giới hạn preview ở viewport đầu; báo lỗi/fallback khi không parse được; style/layout authoritative sẽ đến từ UNO hydration.
- Không sửa upstream/Core. Không mở rộng parser sang lưu hoặc các thao tác toàn workbook.
- Rollback bằng cách gỡ fast preview producer/consumer và giữ UNO view-first cùng `VNO_OPEN_VIEWFIRST=0` fallback; journal/replay và full loader giữ nguyên.
- Kiểm chứng: đo zip/parse độc lập; so giá trị/công thức preview với UNO; CDP LAN14 first paint + scroll ≤5 s và gõ+Enter ≤1 s; undo/redo trước/sau hydration; rerun `npm test`, Python suite, fidelity LAN priority set và 28-file batch. Ghi PASS/FAIL/BLOCKED theo đúng kết quả.

### Files dự kiến

- `platform/sheet/xlsx-preview.py` (hoặc vị trí app-specific tương đương sau khi xác định ownership), `main.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `apps/sheet/sheet-quick-view.js`.
- Tests cho parser Python, quick view/replay và desktop CDP; cập nhật tài liệu hiệu năng và handoff.
- Không thêm dependency, không chạm `upstream/**`, không đổi semantics lưu/in.

### Bổ sung về cuộn trong lúc UNO đang khởi động

- Đo CDP sau parser cho thấy UNO view attach trên LAN14 mất khoảng 5.4 s, dù first paint đã dưới 0.2 s. Vì vậy, cuộn ra ngoài 40×20 đầu tiên trước khi attach không được phép gọi một `doc_id` giả rồi báo tạm gián đoạn.
- Mở rộng cùng parser local để đọc viewport theo tọa độ (sheet, hàng, cột) cho các lần cuộn/chuyển sheet trước khi có UNO session. Giữ giới hạn vùng tối đa 40×20; khi UNO attach, chuyển bridge trở lại `sheet_view_window` và giữ nguyên journal/state.
- CDP phải dùng chuột cuộn thật ngay sau first paint, trước UNO attach, xác nhận cửa sổ dữ liệu kế tiếp xuất hiện và first-scroll latency. Unit tests phải chứng minh route parser được chọn khi `doc_id` còn là preview, rồi route UNO sau khi attach.

### Kết quả triển khai

- Đã thêm `apps/sheet/xlsx_preview.py`: parser read-only dùng Python stdlib, đọc active sheet + shared/inline strings + cached formula values theo cửa sổ; API viewport trước UNO giới hạn 40×20. Không ghi lại XLSX và không thêm dependency.
- `main.py` gửi viewport local vào quick view trước khi chờ UNO. Worker tiếp tục mở workbook ở nền; khi có UNO doc id, quick view chuyển bridge sang `sheet_view_window` mà giữ selection, cuộn, pending history và editor đang gõ. Nếu parser không đọc được, đường UNO view-first cũ vẫn chạy; `VNO_OPEN_VIEWFIRST=0` tắt toàn bộ preview để về luồng legacy.
- Parser LAN14 đo riêng 32.7 ms (đo bằng perf log desktop: 53.7 ms). CDP mới: first paint 108–118 ms; scroll trước UNO attach tới hàng 41–80 trong 348 ms; attach UNO sau khoảng 5.4 s; gõ+Enter 404 ms; hydration 71.1 s. Ctrl+Z/Ctrl+Y qua cả trước và sau hydration giữ đúng giá trị.
- CDP matrix (first paint / gõ+Enter): LAN01 109/792 ms; LAN02 127/762 ms; LAN04 113/766 ms; LAN06 1536/801 ms; LAN09 171/799 ms; LAN14 142/824 ms; LAN16 119/787 ms. Tất cả lần gõ được giữ trong journal. Mốc open được lấy từ `__vnoSheetOpenStartedAt`, không gồm thời gian khởi động app.
- Xem trước khi in LAN01 trên desktop mở được, PDF preview hiện và trạng thái “Sẵn sàng in”; không gửi lệnh tới máy in vật lý. Lưu/In bị chặn khi quick view còn chờ hydration; sau hydration, luồng lưu/in LibreOffice hiện tại được dùng.
- `npm test`: PASS 3116/3116. `python -m unittest discover -s tests`: lần cuối trước route local scroll PASS 910 tests; đang chạy lại sau commit `dcc2beff` trước khi chốt handoff. Unit parser 5 tests và quick-view 18 tests đã PASS.
- Batch LAN 28 từ desktop: 25 PASS, 2 FAIL, 1 BLOCKED. LAN14 full round-trip vượt timeout CDP 25 phút ở save pipeline; output vẫn được tạo, `diffs=0`, lint sạch, Excel mở được. LAN25 có 9419 style/number-format diffs; chạy lại với `VNO_OPEN_VIEWFIRST=0` cũng 9419, nên không do preview P1. LAN04 Excel COM BLOCKED (`CO_E_SERVER_EXEC_FAILURE`), trong khi round-trip `diffs=0`, lint sạch.
- Kết luận: tiêu chí open/first paint, cuộn, lần sửa đầu và undo/redo qua hydration đạt trên các CDP case đã chạy. Cổng fidelity 28 file chưa PASS tổng thể do LAN25 legacy diff và LAN04 COM blocked; LAN14 saving còn vượt timeout dù XLSX đầu ra khớp. Không ghi nhận các cổng này là PASS.
