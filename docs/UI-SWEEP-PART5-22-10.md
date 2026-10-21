# Q50 — Sweep giao diện phần 5 (22-10)

## Trạng thái

**Chưa hoàn tất toàn bộ phiếu.** Các phát hiện trung bình/cao được xác nhận trong phạm vi Q50 đã sửa; còn các ma trận NOT RUN ở cuối báo cáo. Vì vậy chưa tạo `E:\VNOffice-briefs\logs\Q50.DONE`.

Worktree/branch: `E:\VNOffice-codex-queue`, `codex/queue-19-10`. Đã đồng bộ `main` trước khi sửa. Không đổi tệp `tests/unit/writer-tables-import.test.js` đang có sẵn thay đổi của người dùng.

## Phát hiện và sửa

| Mức | Phát hiện | Kết quả |
|---|---|---|
| Cao — đã sửa | Slides có lệnh `slides.insert.hyperlink` và hướng dẫn Help, nhưng thiếu lối vào trên tab Chèn. | Thêm nút Liên kết vào nhóm Liên kết, tên trợ năng/tooltip có Ctrl+K; Ctrl+K mở đúng hộp. Giữ bộ đếm Help ở 193 lệnh. CDP trước FAIL, sau PASS; ảnh sáng/tối. |
| Trung bình — đã sửa | Pivot báo vùng nguồn sai nhưng nút tạo vẫn bật; Enter không được chặn. | Khóa nút khi nguồn không hợp lệ hoặc nhỏ hơn 2 hàng × 1 cột; công bố `aria-disabled` và lời giải thích; hợp lệ thì mở lại. CDP trước/sau kiểm tra A1, Enter và A1:A2. |
| Trung bình — đã sửa | Trường Pivot bị tràn ngang trong hộp. | Thu gọn lưới trường để vừa chiều rộng khả dụng. CDP trước: 416/466 px, tràn; sau: 416/416 px. |
| Trung bình — đã sửa | F5 không có thanh điều khiển khi rê chuột. | Thêm điều khiển trước/sau, số trang, bút/laser và kết thúc; tự ẩn sau 2 giây. Điều khiển cách chân trang 5 px, không chồng lấp; kiểm tra điều hướng bằng phím/mouse và số + Enter. |
| Trung bình — đã sửa | Hộp Sheet báo lỗi nhưng vẫn để Áp dụng bật; lỗi trong hộp dài bị cuộn khỏi tầm nhìn. | Hộp Sheet khóa Áp dụng khi thông báo lỗi đang hiện, cập nhật `aria-disabled`/tooltip, cuộn lỗi vào vùng nhìn; sửa trường thì xóa lỗi để thử lại. CDP Kiểm tra dữ liệu với danh sách rỗng: FAIL trước, PASS sau ở sáng/tối; Enter giữ hộp mở. |

Các mức đếm dưới đây chỉ tính lỗi đã tái hiện và xác nhận trong phiên này: **cao 1/1 đã sửa, trung bình 4/4 đã sửa, thấp 0**. Các mục chưa chạy không được xem là đã đạt hoặc là lỗi đã xác nhận.

## Ma trận còn NOT RUN

- Enter ở 23 hộp thoại đã liệt kê của Writer, Sheet và Slides: **PASS — 23/23**. Bài CDP `tests/live/cdp/q50-dialog-enter-matrix.desktop.mjs` đưa focus vào nút chính, gửi Enter rồi kiểm tra hộp đóng, giữ mở khi nút bị khóa, báo lỗi hoặc cập nhật nội dung. Riêng Trộn thư dùng bộ dữ liệu mẫu cục bộ để tránh mở hộp chọn tệp hệ điều hành.
- Nhập sai trên mọi hộp có trường số/tên (rỗng, số âm, >1e9, chữ, 5000 ký tự, `<>&"`): **NOT RUN**. Đã kiểm riêng danh sách rỗng trong hộp Kiểm tra dữ liệu; chưa chạy các giá trị còn lại và hộp khác.
- Tooltip ba nút đầu mọi tab ribbon × ba ứng dụng: **PASS — 107/107**. Đã kiểm tra title, phím tắt trong title/aria-label và vị trí trong viewport; đã chụp 38 ảnh theo tab ở 1366×768 và xem contact sheet của Writer/Sheet/Slides. Tooltip HTML native không được vẽ vào ảnh chụp trang; nội dung được xác nhận qua thuộc tính title/ARIA.
- Thông báo lưu thành công/lỗi/sao chép: **PASS một phần — 6/6** qua `NotificationBar` của Writer, sáng/tối × success/error/info. Ảnh `toast-{light,dark}-{success,error,info}-1366x768.png`; đã xem ảnh lỗi sáng và sao chép tối. Thanh ở y=177–214, trong viewport, không che ribbon; có role=status/aria-live=polite. Thanh vẫn hiện sau 2,2 giây và có nút đóng: đây là InfoBar bền, không phải toast tự tắt. Chưa kích hoạt ba thông báo bằng thao tác lưu/sao chép thật trên từng app.
- Rà CDP từng hộp Sheet còn lại để tìm lỗi “có thông báo nhưng vẫn cho Áp dụng”: **chưa hoàn tất**. Bộ xử lý chung đã sửa theo trạng thái `role=alert`; CDP xác nhận riêng hộp Kiểm tra dữ liệu.
- Focus: `_createSheetDialog` lưu phần tử đang hoạt động và gọi lại `.focus()` khi đóng. Theo tiêu chí Q50, focus trở về lưới/tài liệu khi mở bằng chuột được chấp nhận. Trường hợp mở bằng Tab từ ribbon và cần quay về nút mở: **NOT RUN — bài CDP thử 3 lệnh bằng phím nhưng không mở được hộp (0/3); không đủ bằng chứng để kết luận hành vi focus**. Ảnh trạng thái thử `focus-{writer,sheet,slides}-{dialog,return}-1366x768.png` đã xem; chúng cho thấy màn hình tài liệu và không có hộp mở.

## Giao diện đã xem

Tất cả ảnh được chụp ở 1366×768; các ảnh được xem trực tiếp sau khi chụp.

| Màn hình | Kết luận |
|---|---|
| Sheet — Pivot nguồn A1 invalid, sáng/tối, trước/sau | Trước: cảnh báo nhưng nút bật. Sau: nút khóa, trạng thái trợ năng đúng; Enter không tạo Pivot và không đóng hộp. Ảnh `docs/assets/q50-ui/sheet-pivot-invalid-{light,dark}-{before,after}-1366x768.png`. |
| Sheet — Pivot nguồn A1:A2 hợp lệ, sáng/tối | Nút được bật lại; các trường vừa hộp, không còn cuộn/tràn ngang. Ảnh `sheet-pivot-valid-{light,dark}-after-1366x768.png`. |
| Sheet — Kiểm tra dữ liệu, danh sách rỗng, sáng/tối, trước/sau | Sau sửa, thông báo nằm trong vùng nhìn phía trên chân hộp; Áp dụng bị khóa, hộp và thanh nút vẫn trong cửa sổ. Ảnh `sheet-dialog-invalid-{light,dark}-{before,after}-1366x768.png`. |
| Slides — tab Chèn và nút Liên kết, sáng/tối | Nút ở nhóm Liên kết; không chen lấn nhóm kế bên. Tooltip và tên truy cập hiển thị Ctrl+K. Ảnh `slides-hyperlink-entry-{light,dark}-after-1366x768.png`. |
| Slides — hộp Chèn liên kết, sáng/tối | Hai trường và nút nằm gọn trong hộp 480×300; nội dung rõ ở cả hai theme. Ảnh `slides-hyperlink-dialog-{light,dark}-after-1366x768.png`. |
| Slides — F5 không hoạt động chuột và có thanh điều khiển, sáng/tối | Màn chiếu phủ cửa sổ; hướng dẫn còn ở chân màn. Điều khiển hiện khi rê chuột, có số trang và nút, không chồng chân trang; tự ẩn sau 2 giây. Ảnh `slides-show-{idle,controls}-{light,dark}-after-1366x768.png`. |
| Writer — màn hình tài liệu mặc định, sáng/tối | Ribbon, thước, trang và thanh trạng thái hiển thị trong cửa sổ; không thấy chữ tràn/chồng. Ảnh `writer-smoke-{light,dark}-1366x768.png`. |
| Sheet — lưới mặc định, sáng/tối | Ribbon, thanh công thức, lưới và trạng thái hiển thị trong cửa sổ; không thấy chữ tràn/chồng. Ảnh `sheet-smoke-{light,dark}-1366x768.png`. |
| Slides — màn tác giả mặc định, sáng/tối | Ribbon, khung thumbnail, canvas và trạng thái hiển thị trong cửa sổ; không thấy chữ tràn/chồng. Ảnh `slides-smoke-{light,dark}-1366x768.png`. |
| Writer/Sheet/Slides — 23 hộp thoại khi nhấn Enter | 6 Writer, 10 Sheet, 7 Slides; mỗi hộp có ảnh trước/sau trong `docs/assets/q50-ui/enter-*-1366x768.png`. Đã xem các contact sheet của toàn bộ 46 ảnh; hộp không bị cắt khỏi viewport. 23/23 hành vi khớp trạng thái nút và nội dung. |
| Writer — thanh thông báo kiểu InfoBar | Đã đo success/error/info ở theme sáng/tối, sau 2,2 giây còn hiện; nằm trong viewport, không che ribbon. Ảnh `toast-*`; hiện không phải toast tự tắt. |
| Writer/Sheet/Slides — ba nút đầu mỗi tab ribbon | 107/107 kiểm tra title, shortcut và viewport; 38 ảnh tab đã chụp, contact sheets ba app đã xem. |
| Focus mở hộp từ ribbon bằng Tab | Bài thử 0/3 mở được hộp; không kết luận focus. Sáu ảnh trạng thái đã xem, không có hộp mở. Giữ NOT RUN. |

## Kiểm thử và gate

- `npm test`: **PASS — 3792/3792, 0 lỗi**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS — VI 3166, EN 3166, thiếu 0/0, placeholder mismatch 0**; 21 khóa nghi ngờ giống VI/EN được công cụ liệt kê.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ** (Writer 279, Excel 217, Slides 269).
- Sinh lại ba checklist: **PASS — Writer 279, Excel 217, Slides 269 mục**.
- `python -m pytest tests -q -k "writer or sheet or slides or dialog or ribbon or show"`: **PASS — 795 passed, 345 deselected, 553.02s**.
- CDP Pivot, dialog lỗi Sheet, Liên kết Slides, F5, smoke ba ứng dụng và Enter 23 hộp thoại: **PASS** theo số liệu chi tiết trong log phiên; các script ở `tests/live/cdp/q50-*.desktop.mjs`.

## Commit trong phiếu

- `9ab1d0de` — plan Q50.
- `d60a1c12`, `93c48c1d` — kiểm tra nguồn Pivot và bố cục trường.
- `4b5ac43a`, `f68d6af8` — lối vào Liên kết trên tab Chèn, shortcut/nhãn trợ năng và bộ đếm Help.
- `355e5f9b`, `e7cf48f3`, `1dcd742` — điều khiển trình chiếu và tương thích DOM kiểm thử.
- `3ec980b3` — khóa Áp dụng khi hộp Sheet có lỗi.
- `468312cb`, `17c36979`, `98b16ae4` — cập nhật bằng chứng checklist và ảnh smoke.

## Handoff

Phiếu vẫn mở vì các ma trận trong “Ma trận còn NOT RUN” chưa được thực hiện. Không tạo tệp Q50.DONE trước khi hoàn tất chúng, ghi số liệu pytest cuối, chạy lại gate sau mọi sửa đổi, rồi cập nhật báo cáo và handoff.

### Xác nhận lại trong lượt tiếp nối — 22/10/2026

- `git merge main`: **PASS — Already up to date**. Giữ nguyên thay đổi có trước của `tests/unit/writer-tables-import.test.js` và `.tmp/`.
- Lần chạy CDP đầu thiếu `--experimental-websocket` nên dừng trước khi kết nối app (**FAIL môi trường chạy, không phải lỗi giao diện**). Chạy lại với cờ này: Pivot **5/5 PASS**; Kiểm tra dữ liệu lỗi **3/3 PASS**; Liên kết Slides **5/5 PASS**; trình chiếu F5 **14/14 PASS**. Mỗi lần chạy dùng `VNO_CDP_LOCALAPPDATA` riêng và chỉ đóng PID do `launchApp` tạo.
- Chụp lại và xem ảnh Pivot invalid/valid, Kiểm tra dữ liệu, tab Chèn/hộp Liên kết, F5 idle/controls ở theme sáng/tối tại 1366×768. Hộp và nút không bị cắt; điều khiển F5 cách chân trang 5 px. Không phát hiện lỗi UI mới trong các ảnh này.
- Gate vừa chạy: `npm test` **3792/3792 PASS**; i18n **3166/3166 VI/EN, missing 0/0, placeholder mismatch 0**; checklist evidence **0 dòng bị hạ** (279/217/269); pytest **795 passed, 345 deselected, 544.79s**.
- Các mục chưa hoàn tất vẫn là **NOT RUN**: Enter trên toàn bộ hộp thoại, ma trận nhập sai toàn bộ trường số/tên, tooltip ba nút đầu mỗi tab × ba app, toast lưu/lỗi/sao chép, focus khi mở hộp bằng Tab, và rà từng hộp Sheet có xử lý thông báo lỗi. Chưa tạo `Q50.DONE`.
- Enter matrix vừa hoàn tất: **23/23 PASS**; đã chụp/xem 46 ảnh trước/sau. Vì vậy Enter không còn thuộc nhóm NOT RUN.

### Kết quả bổ sung sau ma trận Enter — 22/10/2026

- Tooltip: **107/107 PASS**, 38 ảnh tab. Shortcut xuất hiện đúng trong tooltip title và nhãn truy cập khi định nghĩa có shortcut. Không thấy chữ bị cắt trong các contact sheet đã xem.
- Thông báo kiểu InfoBar: **6/6 PASS về hiển thị** (Writer light/dark × success/error/info). Cả ba loại vẫn hiện sau 2,2 giây; đây là thanh thông báo bền, không tự tắt. Không có toast tạm thời để đo; chưa kích hoạt thông báo bằng các thao tác lưu/sao chép thật ở cả ba app.
- Focus qua Tab: **0/3 hộp mở trong bài thử**, do đó focus-return chưa được kiểm chứng; không tính là lỗi sản phẩm hoặc PASS. Sáu ảnh trạng thái đã xem, không có dialog nào mở.
- NOT RUN còn lại: bộ giá trị nhập sai trên tất cả trường/hộp; sweep CDP từng dialog Sheet có alert nhưng còn cho Áp dụng; focus restore sau khi mở đúng dialog bằng Tab; toast tạm thời theo luồng lưu/sao chép thật trên từng app.
- Giao diện đã xem bổ sung: mọi tab ribbon trong ma trận tooltip; thanh thông báo success/error/info sáng/tối; các màn hình Writer, Sheet, Slides trong thử focus. Không thấy cắt/tràn ở các ảnh này; thông báo nằm dưới ribbon, không che nút ribbon.
