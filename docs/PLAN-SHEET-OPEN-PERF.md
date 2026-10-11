# Kế hoạch tăng tốc mở workbook lớn trong VN Sheet

## Objective

Giảm thời gian từ lúc người dùng chọn XLSX tới lúc lưới hiển thị dữ liệu lan14 xuống **dưới 60 giây**, đồng thời giữ 26 workbook LAN còn lại có tổng sai lệch **0** khi round-trip. Giữ LibreOffice làm nền chuyển đổi XLSX/FODS/XLSX; UI chỉ gọi API/Adapter của VN Office. Ứng dụng và mọi xử lý mở file phải chạy offline.

Đo baseline hiện tại đã gồm Python stages, bridge Python→WebView2, JS parser/render và peak working set. lan14 hiện mất khoảng **263–265 giây** theo phép ghép các lần đo; lan06 **134–139 giây**; lan11 **14.2–14.8 giây**; lan12 **16.6–17.5 giây**. Số lan14 cũ 210–240 giây chưa tính khoảng 56 giây bridge vừa đo.

## Current capability

- `main.py` điều phối mở file: gọi LibreOffice chuyển XLSX→FODS, overlay dữ liệu OOXML qua adapter Python, tối ưu FODS và trả toàn bộ chuỗi cho pywebview.
- `adapters/libreoffice/common/ooxml_zip_patch.py` overlay metadata XLSX lên FODS, gồm kiểu ô, chuỗi, XF và thuộc tính workbook/sheet cần giữ.
- `adapters/libreoffice/sheet/sheet-adapter.js` nhận chuỗi FODS, dùng `DOMParser`, tạo workbook model, rồi dựng lưới qua Sheet grid. `parseFods` hiện nạp tất cả sheet trước khi thao tác.
- Bộ đọc đã xử lý row/cell lặp, giới hạn materialization vào used range, và giữ nhiều capability cần cho round-trip: công thức, styles, conditional formatting, validation, pivot, chart, names, protection, layout, visibility, freeze panes, filter và drawings.
- Unit snapshot hiện có trong `tests/unit/real-office-import-fidelity.test.js` xác nhận model `parseFods` của bốn fixture FODS. Round-trip 26 file LAN được chạy bởi `scripts/layout-audit/_batch_audit.py`.

## Đo baseline và nguyên mẫu

| Workbook | Python | Bridge Python→WebView2 | JS `loadFromFods` | FODS cuối (triệu ký tự) | Peak working set Python |
|---|---:|---:|---:|---:|---:|
| lan14 | 111.83–112.64 s | 55.72–55.95 s | 94.55–97.13 s | 316.01 | 4.92 GB |
| lan06 | 131.96–136.87 s | 0.24–0.30 s | 1.84–1.92 s | 4.44 | 3.81 GB |
| lan11 | 10.91–11.24 s | 1.10–1.24 s | 2.20–2.31 s | 20.20 | 0.36 GB |
| lan12 | 12.62–13.42 s | 1.54–1.63 s | 2.43 s | 27.39 | 0.44 GB |

Đây là các lần chạy foreground; stage Python và WebView được đo bằng harness riêng, nên tổng là ước lượng và không gồm app startup/file-dialog. Peak là process Python, không gồm tiến trình con WebView2.

Nguyên mẫu A trong `scripts/perf-proto/` đi qua lan14 FODS bằng `ElementTree.iterparse`, emit subset JSON mất 38.34 s, tạo payload 189.76 MB, WebView2 chuyển trong 37.43–38.37 s và `JSON.parse` trong 1.50–1.79 s. Subset chưa mang toàn bộ semantics workbook nên không thể dùng làm bằng chứng fidelity. Expat scan cho thấy active sheet `Sheet1` khoảng 305.24 MB trong FODS 322.64 MB; chỉ tách theo worksheet sẽ không giảm payload ban đầu đủ nhiều.

## Các phương án kiến trúc

| Phương án | Cơ sở đo / lợi ích dự kiến | Đánh đổi và rủi ro |
|---|---|---|
| **A. Python streaming parser tạo model gọn** | Thay `DOMParser` 38–42 s và một phần model-build 34–35 s. Prototype mất 38.34 s phía Python, bridge 37–38 s, JSON parse dưới 2 s. Nếu giữ nguyên Python conversion hiện có và vẫn phải dựng model JS, ước lượng ban đầu khoảng **180–195 s**; thấp hơn baseline nhưng chưa gần 60 s. Chỉ có upside lớn hơn khi serializer tạo đúng model cuối và payload giảm sâu. | Prototype bỏ styles/rules/chart/pivot/validation/names/protection nên chưa dùng được. Cần serializer và JS adapter mang đủ ngữ nghĩa; payload khổng lồ vẫn tốn bridge và bộ nhớ. JSON subset 623 MB không parse được bằng Node do giới hạn một chuỗi V8, bản compact 190 MB parse được nhưng không tương đương. Dùng Python chuẩn + JSON chuẩn, không thêm dependency. |
| **B. Gộp các lần quét/ghi FODS** | lan14 mất 29.5–29.8 s ở cell metadata overlay, 24.9–25.2 s optimize và 28.8–29.8 s XF reoverlay. Hợp nhất optimize + XF reoverlay có trần tiết kiệm lý thuyết khoảng 25–30 s nếu bỏ được một lượt đọc/ghi; ước lượng **233–250 s** toàn luồng, cần đo prototype thật. Kết quả FODS lan06 cho thấy overlay tạo 334 MB rồi optimize xuống 4.15 MB, nên thứ tự/hợp nhất có thể đem lại lợi ích lớn cho workbook khác. | Các bước hiện đổi thuộc tính tọa độ/format theo thứ tự; gộp sai có thể mất kiểu ô, giá trị, freeze panes, filter, tab color, image ID hoặc cấu trúc. Không thể cộng thẳng thời gian các stage thành mức tiết kiệm. Chỉ dùng thư viện chuẩn và code hiện có. |
| **C. Nạp theo vùng nhìn thấy trước, phần còn lại theo yêu cầu** | Giảm DOM/model khởi tạo trên vùng chưa nhìn thấy, cho phép grid sớm hơn. Worksheet-only không đủ: active sheet chiếm khoảng 95% lan14 FODS. Chia theo row/cell chunk mới có thể giảm phần payload khởi đầu; ước lượng ban đầu cho first view **5–15 s sau khi payload chunk sẵn sàng**, nhưng Python hiện vẫn mất 112 s và do đó tổng vẫn khoảng **120–135 s** nếu chưa xử lý pipeline server. | Công thức liên sheet cần dependency/evaluation khi sheet chưa hydrate; tìm kiếm toàn workbook phải nạp phần còn lại; lưu không được bỏ chunk chưa tải. Cần chunk store toàn workbook ở Python/session, hydrate đầy đủ hoặc copy nguyên nội dung gốc khi lưu; mọi thao tác mutation/save phải chờ dữ liệu cần thiết. Bản thân C không đạt mục tiêu tổng. |
| **D. Kết hợp streaming transform + chunked model transfer** | Kết hợp bỏ nhiều lượt Python FODS với việc chỉ gửi row chunk ban đầu. Để đạt <60 s cần giảm Python + bridge + first grid từ ~263 s xuống dưới 60 s; mục tiêu kỹ thuật cần chứng minh là Python <35 s, transfer/model ban đầu <20 s, grid <5 s. Ước lượng sớm **40–70 s**, mức bất định cao; chỉ được đặt mục tiêu <60 sau prototype đo được. | Phạm vi và fidelity risk cao nhất. Python phải giữ session workbook và trao đổi chunk offline; save/export cần dữ liệu đầy đủ. Không chuyển LibreOffice internals lên UI, không đổi semantics XLSX, không thêm dependency. |

### Đánh giá và hướng chọn

Không phương án đơn lẻ nào đã được chứng minh đạt mục tiêu. A có nguyên mẫu đo được nhưng chưa đủ tính năng; B là bước tối ưu có thể khoanh phạm vi song lợi ích đơn lẻ không đủ; C có thể cải thiện cảm giác hiển thị nhưng Python hiện vẫn là nút thắt. Hướng dài hạn cần phối hợp B với chunked transfer, sau đó đánh giá A như cách xây model cuối nếu dữ liệu cho thấy có thể bảo toàn đầy đủ semantics.

## Files/modules dự kiến

Thay đổi chỉ bắt đầu sau khi người phụ trách duyệt kế hoạch. Danh sách dự kiến, chưa phải quyết định thiết kế cuối:

- `main.py`: orchestration Python, API pywebview, trạng thái session mở file, đo conversion/overlay/serialization/bridge và cờ chọn đường mở cũ/mới.
- `adapters/libreoffice/common/ooxml_zip_patch.py`: overlay OOXML hiện có và prototype hợp nhất pass; không chuyển logic LO lên UI.
- `adapters/libreoffice/sheet/sheet-adapter.js`: tiếp nhận chunk/model, ghép workbook, giữ adapter boundary, xử lý hydration và serialize toàn workbook.
- `apps/sheet/sheet-grid.js`: render viewport và yêu cầu chunk khi cuộn; giữ keyboard navigation, selection, accessibility và trạng thái loading/error.
- `apps/sheet/sheet-app.js`: điều phối trạng thái session, search/formula/save khi workbook chưa hydrate hoàn chỉnh.
- `tests/unit/real-office-import-fidelity.test.js` và kiểm thử Sheet liên quan: snapshot/model compatibility và các regression theo feature.
- `scripts/perf-proto/**`: prototype và benchmark độc lập; bỏ hoặc giữ làm công cụ phát triển sau khi quyết định, không đưa dữ liệu workbook thật vào repo.

Không sửa `upstream/**` hoặc LibreOffice Core. Không thêm package/dependency ngoài thư viện Python chuẩn, JavaScript/WebView hiện có. LibreOffice tiếp tục là engine chuyển đổi/đọc ghi tài liệu.

## Risk controls

- **Cell values/types/styles:** xác nhận chuỗi shared string, boolean, date/number, error, formula/cached value, XF/style mapping và ô style-only trước/sau.
- **Conditional formatting, validation, pivot, chart, named ranges, protection, freeze panes, hidden/veryHidden, print layout, drawings:** không được loại khỏi chunk/model payload; snapshot fixtures hiện có chỉ là baseline đầu, cần thêm coverage từ LAN fixtures phù hợp.
- **Công thức liên sheet và recalculation:** giữ reference/dependency graph workbook-wide; các sheet chưa hydrate không được coi là trống. Trước khi sửa công thức hoặc recalculate toàn workbook phải nạp dependency cần thiết.
- **Find/search:** mặc định phải search toàn workbook; nếu chưa nạp đủ thì chạy trên Python store hoặc hydrate đầy đủ và báo tiến độ, không trả kết quả giả là “không tìm thấy”.
- **Save/export:** không serialize một model thiếu chunk. Save phải chờ full hydration hoặc dùng session store để ghép tất cả vùng cùng overlays; XLSX round-trip phải giữ độ trung thực hiện tại. Nếu không chứng minh được, đường save luôn hydrate toàn workbook trước khi chuyển FODS→XLSX.
- **Memory:** lan14 Python đạt 4.92 GB working set và lan06 3.81 GB. Thiết kế không được đồng thời giữ FODS string, DOM, model JSON và workbook model trùng lặp. Đo process Python và WebView2 renderer riêng; ghi tổng peak máy/renderer.
- **Failure/recovery/offline:** lỗi parse/chunk phải giữ workbook cũ mở, đưa lỗi rõ ràng, cho retry hoặc quay về legacy loader; không cần network.

## Test and performance plan

1. **Unit compatibility:** chạy `node tests/run-tests.js`, gồm snapshot `Sheet: parseFods workbook snapshots match pre-optimization results` trong `tests/unit/real-office-import-fidelity.test.js`; giữ snapshot equality cho fixture FODS hiện có. Thêm equality test giữa legacy/new path cho mọi field model, không chỉ value cells.
2. **Python overlay equivalence:** golden output checks trên FODS lan11/lan12 trước khi lan14; so sánh XML semantics và round-trip; không đổi expected output để làm test xanh.
3. **LAN regression:** stage bản sao 26 workbook từ corpus ngoài repo vào `file test/lan/` trong worktree (không commit workbook), rồi chạy `_batch_audit.py` foreground từng file. Danh sách: `lan01.xlsx lan02.xlsx lan03.xlsx lan04.xlsx lan05.xlsx lan07.xlsx lan08.xlsx lan09.xlsx lan10.xlsx lan11.xlsx lan12.xlsx lan13.xlsx lan15.xlsx lan16.xlsx lan17.xlsx lan18.xlsx lan19.xlsx lan20.xlsx lan21.xlsx lan22.xlsx lan23.xlsx lan24.xlsx lan25.xlsx lan26.xlsx lan27.xlsx lan28.xlsx`. Mỗi lệnh có dạng `python scripts/layout-audit/_batch_audit.py "E:\VNOffice-codex-sheet-open-perf" lanNN.xlsx`. Bắt buộc saved=yes, Excel COM mở được, lint clean và `TONG sai lech: 0` cho từng file. lan06/lan14 tiếp tục round-trip riêng bằng auditor + Excel COM do thời gian và RAM cao.
4. **Large-file correctness:** kiểm tra formulas (đặc biệt cross-sheet), styles/XF, CF, validation, pivot, chart, names, protection, hidden sheets, merges, filters, layout và save XLSX trên lan06/lan14.
5. **Performance:** trước/sau chạy ít nhất hai foreground lượt trên lan14/lan06/lan11/lan12 với cùng profile; đo Python từng stage, payload chars/bytes, bridge, JSON/DOM parse, model-build, first visible grid, first layout, process Python + WebView2 peak memory. Báo cả hai lượt, không dùng giá trị trung bình để che variance.
6. **Acceptance:** lan14 <60 s từ thời điểm API nhận lựa chọn file tới khi vùng grid đầu hiển thị dữ liệu, hai lượt liên tiếp; các file khác không hồi quy đáng kể; 26 LAN mỗi file TONG sai lệch 0 và Excel COM mở được.

## Rollback

- Giữ đường `parseFods` + `loadFromFods` hiện tại làm legacy implementation đến khi acceptance đạt.
- Bật đường mới bằng flag nội bộ cấu hình theo lần mở. Mặc định flag tắt trong các bước canary; nếu có lỗi hoặc vượt ngưỡng memory/time thì tắt ngay, giữ payload FODS đầy đủ và gọi legacy loader.
- Không xóa code cũ trong cùng change set với đường mới. Chỉ đề xuất dọn legacy sau khi chạy đầy đủ 26-file LAN regression và người phụ trách chấp nhận.
- Với lazy path, lỗi hydration hoặc thiếu chunk phải tự chuyển sang full hydration rồi legacy parse; nếu không khôi phục được thì hủy mở file, không cho save workbook thiếu dữ liệu.

## Staged implementation and estimates

Các ước lượng bên dưới cho lan14 là mục tiêu/giả thuyết từ baseline hiện tại, chưa phải cam kết. Mỗi giai đoạn có change set và review độc lập; không bước nào được claim PASS trước khi đo.

| Phase | Nội dung | Ước lượng lan14 sau phase | Điều kiện merge độc lập |
|---|---|---:|---|
| 0. Canary + instrumentation | Thêm timing cho Python, payload serialization/bridge, renderer process; không đổi file semantics. Baseline app hiện khoảng 263–265 s. | 260–270 s (instrument overhead cần kiểm soát) | Timer off mặc định; output logging opt-in; không thay model. |
| 1. Scratch prototype tối ưu Python pass | Trước tiên thử fuse optimizer + XF reoverlay, rồi metadata overlay nếu có diff-free prototype. So sánh FODS/output semantics và đo RAM. | 233–250 s nếu loại bỏ được một pass; ước lượng chưa xác nhận. | Golden comparison lan11/12/14; rollback chỉ bỏ prototype/flag. Đây là đề xuất bước đầu. |
| 2. Feature-flagged streaming import representation | Chỉ sau khi prototype chứng minh schema hoàn chỉnh. Giảm Python reparsing và gửi payload compact. | 120–195 s tùy mức Python work còn lại/model-build; chưa đủ target nếu đứng riêng. | Legacy path vẫn mặc định; full model field equality, save round-trip, low/high-memory profile. |
| 3. Chunked viewport + full-session backing | Grid nhận vùng nhìn thấy trước; Python/session giữ các chunk chưa gửi; search/formula/save gọi hydration theo nhu cầu. | 40–70 s cùng phase 1/2; C đơn lẻ 120–135 s. | Formula/search/save/export hydrate chính xác; keyboard/scroll/error states; offline; bật flag theo workbook. |
| 4. Canary, regression, default switch | Đo cả bộ files, tối ưu ngưỡng chunk, chỉ bật mặc định khi acceptance đạt. | <60 s yêu cầu, chưa được claim trước khi chạy | Hai lượt lan14 <60 s và 26 LAN lệch 0; Excel COM + lint sạch; rollback toggle kiểm chứng. |

## First step proposed for approval

Ưu tiên **phase 1: nguyên mẫu gộp optimize + XF reoverlay trong `scripts/perf-proto/`**, dùng thư viện chuẩn và output so sánh, chưa thay product code. Hai pass này tiêu tốn khoảng 54 giây trên lan14, là phần lớn nhất có thể nhắm riêng với phạm vi hẹp; bước này đo được lợi ích thực, giữ LibreOffice và UI boundary nguyên vẹn, đồng thời kiểm tra các rủi ro XF/format trước khi đầu tư vào streaming model/lazy loading. Prototype phải giữ nguyên hành vi và có số liệu trước/sau; nếu diff hoặc RAM xấu thì dừng nhánh B trước khi sửa app.

Ngay cả khi thành công, đây là cải thiện từng phần và chưa đạt mục tiêu 60 giây. Kết quả phase 1 sẽ quyết định có nên đầu tư tiếp vào tổ hợp streaming transform + chunked viewport.
