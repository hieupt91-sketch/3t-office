# Q50 — Sweep giao diện phần 5 (22-10)

## Kế hoạch bổ sung — ma trận nhập sai

- **Mục tiêu:** khóa thao tác Áp dụng/Chèn khi các trường nhập có validation HTML đang invalid; hiển thị lỗi tiếng Việt/Anh; giữ hộp mở khi Enter và cho thử lại sau khi sửa giá trị.
- **Khả năng hiện có:** Sheet có observer khóa nút theo `[role=alert]`, nhưng chưa xét validity của controls; Slides có min/max HTML và kiểm tra trong handler nhưng nút vẫn bật.
- **Tệp dự kiến:** `apps/sheet/sheet-grid.js`, `apps/sheet/page-setup-dialog.js`, `apps/slides/insert-dialogs.js`, `apps/slides/slides-canvas.js`, hai tệp i18n; bài CDP `q50-dialog-invalid-matrix.desktop.mjs` và ảnh trước/sau.
- **Phụ thuộc:** không thêm dependency; xác minh qua CDP app desktop, profile riêng; một app một lúc.
- **Rủi ro:** chỉ khóa theo controls đang enabled/visible và constraints đã khai báo; giữ giá trị hợp lệ tùy chọn như 0 = tự động; không áp dụng nội dung đang invalid.
- **Kiểm tra:** ma trận CDP trước/sau cho từng app; ảnh ở 1366×768; Enter khi khóa; xác nhận nút mở lại khi sửa về hợp lệ; sau đó chạy các gate Q50.
- **Rollback:** revert commit riêng của Sheet hoặc Slides; giữ nguyên thay đổi có trước của người dùng.

## Trạng thái

**Đã hoàn tất Q50.** Enter, giá trị nhập sai, tooltip và thông báo đã được rà soát; không có luồng toast tạm thời trong phiên bản hiện tại nên mục thời lượng tự tắt được ghi nhận là không áp dụng. Kết quả gate cuối ở phần dưới.

Worktree/branch: `E:\VNOffice-codex-queue`, `codex/queue-19-10`. Đã đồng bộ `main` trước khi sửa. Không đổi tệp `tests/unit/writer-tables-import.test.js` đang có sẵn thay đổi của người dùng.

## Phát hiện và sửa

| Mức | Phát hiện | Kết quả |
|---|---|---|
| Cao — đã sửa | Slides có lệnh `slides.insert.hyperlink` và hướng dẫn Help, nhưng thiếu lối vào trên tab Chèn. | Thêm nút Liên kết vào nhóm Liên kết, tên trợ năng/tooltip có Ctrl+K; Ctrl+K mở đúng hộp. Giữ bộ đếm Help ở 193 lệnh. CDP trước FAIL, sau PASS; ảnh sáng/tối. |
| Trung bình — đã sửa | Pivot báo vùng nguồn sai nhưng nút tạo vẫn bật; Enter không được chặn. | Khóa nút khi nguồn không hợp lệ hoặc nhỏ hơn 2 hàng × 1 cột; công bố `aria-disabled` và lời giải thích; hợp lệ thì mở lại. CDP trước/sau kiểm tra A1, Enter và A1:A2. |
| Trung bình — đã sửa | Trường Pivot bị tràn ngang trong hộp. | Thu gọn lưới trường để vừa chiều rộng khả dụng. CDP trước: 416/466 px, tràn; sau: 416/416 px. |
| Trung bình — đã sửa | F5 không có thanh điều khiển khi rê chuột. | Thêm điều khiển trước/sau, số trang, bút/laser và kết thúc; tự ẩn sau 2 giây. Điều khiển cách chân trang 5 px, không chồng lấp; kiểm tra điều hướng bằng phím/mouse và số + Enter. |
| Trung bình — đã sửa | Hộp Sheet báo lỗi nhưng vẫn để Áp dụng bật; lỗi trong hộp dài bị cuộn khỏi tầm nhìn. | Hộp Sheet khóa Áp dụng khi thông báo lỗi đang hiện, cập nhật `aria-disabled`/tooltip, cuộn lỗi vào vùng nhìn; sửa trường thì xóa lỗi để thử lại. CDP Kiểm tra dữ liệu với danh sách rỗng: FAIL trước, PASS sau ở sáng/tối; Enter giữ hộp mở. |
| Trung bình — đã sửa | Hộp kết quả Sắp xếp tùy chỉnh báo vùng không hợp lệ nhưng nút vẫn ghi Áp dụng. | Đổi nút thành Đóng, bỏ kiểu nút chính và giữ thao tác đóng hộp. CDP trước FAIL (Áp dụng bật), sau PASS (Đóng, cùng hộp/rect, nút đóng được); ảnh trước/sau sáng/tối. |
| Trung bình — đã sửa | Enter từ nút lệnh ribbon không mở hộp; focus bị đẩy khỏi nút gọi sau khi đóng. | Cho phép Enter trên ribbon và phối hợp focus guard/CommandBus/Sheet fallback để giữ nút gọi khi hộp mở từ bàn phím. CDP trước 0/3 hộp mở; sau Tab + Enter + Esc 3/3 focus trở về đúng nút. Ảnh trước/sau 1366×768. |
| Trung bình — đã sửa | Trường số ở Định dạng có điều kiện, Thiết lập trang, Chèn Bảng và Chèn Sơ đồ vẫn để nút thao tác bật khi giá trị ngoài giới hạn. | Sheet khóa nút và hiện cảnh báo theo validation controls; Slides khóa nút, hiện phạm vi chấp nhận và chặn Enter. Sửa giá trị hợp lệ mở lại nút. CDP trước 26 FAIL, sau 0 lỗi. 20 ảnh sáng/tối trước/sau. |
| Trung bình — đã sửa | Các trường số ở Định dạng có điều kiện, Thiết lập trang, Chèn Bảng và Chèn Sơ đồ vẫn để nút thao tác bật khi giá trị ngoài giới hạn. | Sheet khóa nút và hiện cảnh báo theo validation controls; Slides khóa nút, hiện phạm vi chấp nhận và chặn Enter. Sửa giá trị hợp lệ mở lại nút. CDP ma trận trước 26 FAIL, sau 0 lỗi. 20 ảnh sáng/tối trước/sau. |

Các mức đếm dưới đây chỉ tính lỗi đã tái hiện và xác nhận trong phiên này: **cao 1/1 đã sửa, trung bình 7/7 nhóm đã sửa, thấp 0**. Ma trận nhập sai có 26 trạng thái invalid không khóa nút trước sửa; sau sửa không còn trạng thái lỗi.

## Ma trận kiểm tra

- Enter ở 23 hộp thoại đã liệt kê của Writer, Sheet và Slides: **PASS — 23/23**. Bài CDP `tests/live/cdp/q50-dialog-enter-matrix.desktop.mjs` đưa focus vào nút chính, gửi Enter rồi kiểm tra hộp đóng, giữ mở khi nút bị khóa, báo lỗi hoặc cập nhật nội dung. Riêng Trộn thư dùng bộ dữ liệu mẫu cục bộ để tránh mở hộp chọn tệp hệ điều hành.
- Nhập sai trên hộp có trường số/tên: **PASS — 27 trường, 111 ca, 5 kiểm tra Enter trong trạng thái invalid, 0 lỗi sau sửa**. Rỗng/âm/>1e9/chữ/5.000 ký tự/ký tự đặc biệt giữ dialog mở; giá trị hợp lệ khôi phục nút thao tác. Trước sửa CDP **FAIL 26 trạng thái**; bài `tests/live/cdp/q50-dialog-invalid-matrix.desktop.mjs`.
- Tooltip ba nút đầu mọi tab ribbon × ba ứng dụng: **PASS — 107/107**. Đã kiểm tra title, phím tắt trong title/aria-label và vị trí trong viewport; đã chụp 38 ảnh theo tab ở 1366×768 và xem contact sheet của Writer/Sheet/Slides. Tooltip HTML native không được vẽ vào ảnh chụp trang; nội dung được xác nhận qua thuộc tính title/ARIA.
- Thông báo success/error/info mẫu: **PASS — 18/18 trạng thái hiển thị**, sáng/tối trên ba app; 18 ảnh `toast-{,sheet-,slides-}{light,dark}-{success,error,info}-1366x768.png` đã xem. Thanh ở y=177–214, trong viewport, có role=status/aria-live=polite, không che ribbon và vẫn hiện sau 2,2 giây. Rà soát call sites không thấy thông báo success/error từ thao tác Save/Copy, và `common.file.save` chưa được đăng ký handler; không có toast tạm thời trong sản phẩm để đo thời lượng tự tắt, ghi nhận **N/A**.
- Sweep hộp Sheet cùng mẫu: **PASS — 8/8** blank-Apply probes (Kiểm tra dữ liệu, Dò tìm mục tiêu, Bảng dữ liệu, Trình quản lý kịch bản, Định dạng có điều kiện, Sắp xếp tùy chỉnh, Bộ lọc nâng cao, Xóa trùng lặp). Dò tìm mục tiêu, Bảng dữ liệu và Bộ lọc nâng cao hiện alert thì khóa Áp dụng. Sắp xếp tùy chỉnh cho thấy nút Áp dụng trên hộp Kết quả; đã đổi thành Đóng và xác minh đóng được. Các hộp khác không có alert khi gửi cấu hình trống/mặc định. Ảnh trước/sau 16 trạng thái trong `sheet-sweep-*-1366x768.png`; ảnh sửa riêng `sheet-custom-sort-notice-{light,dark}-{before,after}-1366x768.png`.
- Focus sau mở hộp từ ribbon bằng bàn phím: **PASS — 3/3** (Tab tới lệnh, Enter mở hộp, Esc đóng và focus về đúng nút gọi) cho Writer, Sheet, Slides. Trước sửa, bộ bảo vệ Enter chặn nên 0/3 hộp mở; sau sửa không còn chặn và focus không bị các fallback đưa về editor. Ảnh `focus-{writer,sheet,slides}-{dialog,return}-1366x768.png` đã xem.

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
| Sheet — 8 hộp có xác thực/submit, ảnh trước/sau | Dò tìm mục tiêu, Bảng dữ liệu, Bộ lọc nâng cao khóa Áp dụng cùng thông báo; thông báo Sắp xếp tùy chỉnh dùng nút Đóng sau sửa. Contact sheet không tạo được vì Python PIL chưa cài nên đã xem đủ 16 ảnh riêng lẻ. Không thấy nội dung cắt khỏi viewport. |
| Sheet — thông báo Sắp xếp tùy chỉnh, sáng/tối trước/sau | Trước: hộp Kết quả báo vùng chưa đủ hàng nhưng nút xanh ghi Áp dụng. Sau: nút kiểu phụ ghi Đóng; hộp gọn, nút nằm trong hộp ở cả hai theme. |
| Writer/Sheet/Slides — thanh thông báo success/error/info | Đã xem 18 ảnh (mỗi app × theme sáng/tối × 3 trạng thái). Thanh nằm y=177–214, không che ribbon, chữ đọc rõ; vẫn hiện sau 2,2 giây. Đây là InfoBar bền; không có toast tạm thời từ thao tác lưu/sao chép trong sản phẩm hiện tại, nên thời lượng tự tắt ghi N/A. |
| Writer/Sheet/Slides — ba nút đầu mỗi tab ribbon | 107/107 kiểm tra title, shortcut và viewport; 38 ảnh tab đã chụp, contact sheets ba app đã xem. |
| Focus mở hộp bằng Tab + Enter từ ribbon | 3/3 hộp mở; Esc trả focus về nút gọi. 6 ảnh trước/sau đã xem; viền focus rõ, không che chữ/nút. |
| Sheet/Slides — nhập sai số trong dialog, sáng/tối, trước/sau | Trước: nút Áp dụng/Chèn bật dù số âm; sau: thông báo rõ, nút khóa, Enter giữ hộp. Khôi phục giá trị hợp lệ mở lại nút. 20 ảnh trong `docs/assets/q50-ui/invalid-{sheet-conditional-4,sheet-margins-0,sheet-size-2,slides-table-0,slides-insert-0}-{before,after}-{light,dark}-1366x768.png`. |

## Kiểm thử và gate

- `node tests/run-tests.js`: **PASS — 3792/3792, 0 lỗi**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS — VI 3170, EN 3170, thiếu 0/0, placeholder mismatch 0**; 21 khóa nghi ngờ giống VI/EN được công cụ liệt kê.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ** (Writer 279, Excel 217, Slides 269).
- Sinh lại ba checklist: **PASS — Writer 279, Excel 217, Slides 269 mục**.
- `python -m pytest tests -q -k "writer or sheet or slides or dialog or ribbon or show"`: **PASS — 795 passed, 345 deselected, 549.11s**.
- CDP ma trận nhập sai: **PASS — 27 trường, 111 ca, 5 kiểm tra Enter khi invalid, 0 lỗi**; baseline trước sửa FAIL (26 lỗi). 20 ảnh trước/sau ở theme sáng/tối đã xem.
- CDP Pivot, dialog lỗi Sheet, Liên kết Slides, F5, smoke ba ứng dụng và Enter 23 hộp thoại: **PASS** theo số liệu chi tiết trong log phiên; các script ở `tests/live/cdp/q50-*.desktop.mjs`.

## Commit trong phiếu

- `9ab1d0de` — plan Q50.
- `d60a1c12`, `93c48c1d` — kiểm tra nguồn Pivot và bố cục trường.
- `4b5ac43a`, `f68d6af8` — lối vào Liên kết trên tab Chèn, shortcut/nhãn trợ năng và bộ đếm Help.
- `355e5f9b`, `e7cf48f3`, `1dcd742` — điều khiển trình chiếu và tương thích DOM kiểm thử.
- `3ec980b3` — khóa Áp dụng khi hộp Sheet có lỗi.
- `468312cb`, `17c36979`, `98b16ae4` — cập nhật bằng chứng checklist và ảnh smoke.

## Handoff

Q50 hoàn tất sau khi cập nhật ma trận nhập sai và ghi nhận không có luồng toast tạm thời cần đo. Handoff và gate cuối ở cuối tài liệu.

### Xác nhận lại trong lượt tiếp nối — 22/10/2026

- `git merge main`: **PASS — Already up to date**. Giữ nguyên thay đổi có trước của `tests/unit/writer-tables-import.test.js` và `.tmp/`.
- Lần chạy CDP đầu thiếu `--experimental-websocket` nên dừng trước khi kết nối app (**FAIL môi trường chạy, không phải lỗi giao diện**). Chạy lại với cờ này: Pivot **5/5 PASS**; Kiểm tra dữ liệu lỗi **3/3 PASS**; Liên kết Slides **5/5 PASS**; trình chiếu F5 **14/14 PASS**. Mỗi lần chạy dùng `VNO_CDP_LOCALAPPDATA` riêng và chỉ đóng PID do `launchApp` tạo.
- Chụp lại và xem ảnh Pivot invalid/valid, Kiểm tra dữ liệu, tab Chèn/hộp Liên kết, F5 idle/controls ở theme sáng/tối tại 1366×768. Hộp và nút không bị cắt; điều khiển F5 cách chân trang 5 px. Không phát hiện lỗi UI mới trong các ảnh này.
- Gate vừa chạy: `npm test` **3792/3792 PASS**; i18n **3166/3166 VI/EN, missing 0/0, placeholder mismatch 0**; checklist evidence **0 dòng bị hạ** (279/217/269); pytest **795 passed, 345 deselected, 544.79s**.
- Trong lượt này, Enter 23 hộp, tooltip 107/107, focus 3/3, sweep 8 hộp Sheet và ma trận nhập sai 27 trường/111 ca đã hoàn tất. Toast tạm thời được ghi N/A vì app không phát sinh thông báo từ Save/Copy và `common.file.save` chưa có handler; InfoBar mẫu vẫn được kiểm 18/18.
- Enter matrix vừa hoàn tất: **23/23 PASS**; đã chụp/xem 46 ảnh trước/sau. Vì vậy Enter không còn thuộc nhóm NOT RUN.

### Kết quả bổ sung sau ma trận Enter — 22/10/2026

- Tooltip: **107/107 PASS**, 38 ảnh tab. Shortcut xuất hiện đúng trong tooltip title và nhãn truy cập khi định nghĩa có shortcut. Không thấy chữ bị cắt trong các contact sheet đã xem.
- Thông báo kiểu InfoBar: **18/18 PASS về hiển thị** (ba app × hai theme × success/error/info), vẫn hiện sau 2,2 giây. Không có luồng toast tạm thời từ Save/Copy trong code hiện tại; thời lượng tự tắt ghi N/A.
- Focus qua Tab/Enter: **3/3 PASS** sau sửa; bài CDP trước sửa bị bộ bảo vệ Enter chặn, 0/3 hộp mở. Sáu ảnh trước/sau đã xem, viền focus hiện rõ ở nút ribbon, không cắt/chồng.
- NOT RUN còn lại: **không còn mục nào trong phạm vi Q50**.
- Giao diện đã xem bổ sung: mọi tab ribbon trong ma trận tooltip; thanh thông báo success/error/info sáng/tối; 16 ảnh Sheet blank-Apply; thông báo Sắp xếp tùy chỉnh trước/sau sáng/tối; 6 ảnh hộp/focus trả về ba app. Không thấy cắt/tràn; viền focus rõ, thông báo nằm dưới ribbon và không che nút.


### Handoff cuối Q50 — 22/10/2026

- TASK: Q50 — hoàn tất rà soát Enter, dữ liệu nhập sai, tooltip, thông báo và lỗi trung bình từ Q49.
- AGENT/ROLE: Codex / Windows desktop CDP.
- BRANCH: `codex/queue-19-10`; WORKTREE: `E:\VNOffice-codex-queue`.
- OBJECTIVE: Hoàn thành các mục NOT RUN còn lại, xử lý lỗi nhập sai còn tồn tại, chụp/xem ảnh 1366×768 sáng/tối và chạy đủ gate.
- FINDINGS: Ma trận trước sửa thất bại 26 ca. Sau sửa, 27 trường / 111 ca / 5 kiểm tra Enter invalid đạt; lỗi cao 1/1 và trung bình 7/7 theo phạm vi Q50 đã xử lý. Kiểm tra tooltip 107/107, Enter 23/23, focus 3/3, F5 14/14, Liên kết Slides 5/5. Không phát hiện lỗi mới trong ảnh.
- IMPLEMENTATION SUMMARY: Dialog Sheet báo lỗi định dạng/range/required và khóa Áp dụng; dialog bảng/sơ đồ Slides kiểm tra giá trị nguyên trong phạm vi, báo lỗi và khóa Chèn; sửa giá trị hợp lệ sẽ mở lại nút. Enter không commit dữ liệu invalid. Không có luồng toast tạm thời từ Save/Copy hiện tại; thời lượng tự tắt N/A, InfoBar kiểm tra hiển thị 18/18.
- FILES CHANGED: `apps/sheet/page-setup-dialog.js`, `apps/sheet/sheet-grid.js`, `apps/slides/insert-dialogs.js`, `apps/slides/slides-canvas.js`, `platform/i18n/strings-{vi,en}.js`, `tests/live/cdp/q50-dialog-invalid-matrix.desktop.mjs`, `docs/assets/q50-ui/invalid-*.png`, `docs/POWERPOINT2016-FEATURE-CHECKLIST.md`, `docs/UI-SWEEP-PART5-22-10.md`.
- COMMITS: `9fecdcb0` implementation + CDP evidence; documentation/handoff commit is recorded by Git history.
- COMMANDS RUN: `git merge main` (Already up to date); CDP matrix before/after; `node tests/run-tests.js`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; all three checklist generators; `python -m pytest tests -q -k "writer or sheet or slides or dialog or ribbon or show"`; `git diff --check`.
- BUILD RESULT: NOT RUN — task changed app UI/dialog validation; build was not requested by Q50 gates.
- TEST RESULTS: PASS — Node 3792/3792; CDP invalid 27 fields/111 cases/5 Enter guards/0 failure; i18n 3170/3170 VI/EN, missing 0/0, placeholder mismatch 0; checklist 279/217/269 with 0 downgraded rows; pytest 795 passed, 345 deselected in 549.11s.
- KNOWN FAILURES: None among Q50 requirements. Real transient toast duration is N/A because Save/Copy currently emits no transient toast; persistent InfoBar is visible by design.
- RISKS: Numeric form constraints rely on browser native validity plus explicit range/integer checks. No core/upstream changes.
- DEPENDENCIES/BLOCKERS: None.
- CORE PATCH ID (if any): None.
- GIAO DIỆN ĐÃ XEM: 20 ảnh `docs/assets/q50-ui/invalid-{sheet-conditional-4,sheet-margins-0,sheet-size-2,slides-table-0,slides-insert-0}-{before,after}-{light,dark}-1366x768.png`; thêm 46 ảnh Enter, 38 ảnh ribbon, 18 ảnh InfoBar, 16 ảnh Sheet dialog lỗi và 6 ảnh focus trong `docs/assets/q50-ui/`. Đã xem ảnh ở hai theme, không thấy cắt/tràn/chồng/che nút trong các màn hình kiểm tra. Tổng lỗi: cao 1/1 đã sửa; trung bình 7/7 đã sửa; thấp 0 lỗi tồn; NOT RUN trong phạm vi: 0.
- NEXT ACTION: Phiếu Q50 hoàn tất; có thể chuyển phiếu tiếp theo.
