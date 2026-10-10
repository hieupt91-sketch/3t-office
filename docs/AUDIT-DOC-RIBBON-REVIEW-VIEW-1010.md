# Audit Writer: Danh giá và Chế độ xem — 10/10/2026

## Kết quả

Đã chạy app desktop thật với d07 (`file test/landocx/d07.docx`) qua CDP; mỗi tab được chạy hai lượt riêng, mỗi lượt một app. DOM lúc mở có 37.874 ký tự; Writer tính 23 trang canvas và vùng cuộn tối đa đo được 50.571 px. Word COM xác nhận bản d07 thử nghiệm có ghi chú, revision và cờ theo dõi; kết quả chấp nhận/từ chối khớp với XML và văn bản sau khi mở lại.

Kết quả chưa phải PASS toàn tab: Ngăn dẫn hướng mở nhưng không liệt kê mục nào trên d07; XML nguồn không có `w:pStyle` hoặc `w:outlineLvl`, nên tài liệu không thỏa tiền điều kiện có heading để kết luận điều khiển này đúng/sai. Nhiều điều khiển Nhận xét chưa có ngữ cảnh đủ để xác nhận. New Window và hai nút Macro không chạy. Ticket dự kiến 14 mục Review/13 mục View, còn DOM thực tế có 15/14; chênh lần lượt do Soát lỗi chính tả AI và các mục Macro ở tab View. Không gửi nội dung cho AI, không chụp ảnh, không thêm nút.

## Danh giá — 15 điều khiển thấy trong DOM

| commandId | Nhãn | Ngữ cảnh test | Hiệu quả trong VN Writer | DOCX / Word COM | Kết luận | Phím tắt |
|---|---|---|---|---|---|---|
| `ai.assistant.grammarCheck` | Soát lỗi chính tả | d07, không gửi nội dung | Không chạy | Không đối chiếu | NOT RUN — ngoài phạm vi; không gửi tài liệu tới AI | — |
| `writer.review.toggleSpellCheck` | Kiểm tra chính tả | d07 lúc mở | `aria-pressed=true`; probe không xác nhận chuyển đổi bật/tắt | Không ghi DOCX | NOT RUN | — |
| `writer.review.wordCount` | Đếm từ | d07 | Mở hộp thoại “Đếm từ”; chưa đối chiếu số liệu | Không ghi DOCX | NOT RUN — chưa xác minh số liệu | — |
| `writer.comment.insert` | Thêm ghi chú | Bôi chọn đầu tài liệu, nhập ghi chú qua hộp thoại | Tạo 1 thẻ và 1 anchor | XML có `w:commentRangeStart/End`, `w:commentReference`; Word COM mở lại thấy 1 comment, tác giả `3T Office`, scope khớp vùng chọn | **PASS** | `Ctrl+Alt+M` — chưa thử phím |
| `writer.review.commentDelete` | Xóa nhận xét | d07 ban đầu không có nhận xét | Chưa thực hiện trên ghi chú đang tồn tại | Chưa lưu/đối chiếu | NOT RUN — thiếu lượt thao tác | — |
| `writer.review.commentResolve` | Đã xử lý | d07 ban đầu không có nhận xét | Chưa thực hiện trên ghi chú đang tồn tại | Chưa đối chiếu trạng thái resolved trong DOCX | NOT RUN — thiếu lượt thao tác | — |
| `writer.review.commentPrevious` | Nhận xét trước | d07 ban đầu không có nhận xét | Chưa có danh sách để điều hướng | Chưa đối chiếu | NOT RUN | — |
| `writer.review.commentNext` | Nhận xét sau | d07 ban đầu không có nhận xét | Chưa có danh sách để điều hướng | Chưa đối chiếu | NOT RUN | — |
| `writer.trackChanges.toggle` | Theo dõi thay đổi | Bật, thay vùng chọn, lưu DOCX | `aria-pressed`: `false → true`; tạo vùng xóa; nút xử lý revision bật | `word/settings.xml` có `<w:trackRevisions/>`; Word COM ở chế độ sửa thấy `TrackRevisions=True`, 1 revision | **PASS** | `Ctrl+Shift+E` — chưa thử phím |
| `writer.trackChanges.acceptOne` | Chấp nhận một | Bản có 1 vùng xóa | DOM revision: `1 → 0` | Lưu ra DOCX; Word COM: 0 revisions, comment còn; phần xóa bị loại khỏi nội dung | **PASS** | — |
| `writer.trackChanges.acceptAll` | Chấp nhận thay đổi | Bản có 1 vùng xóa | DOM revision: `1 → 0` | Lưu ra DOCX; Word COM: 0 revisions, comment còn; phần xóa bị loại khỏi nội dung | **PASS** | — |
| `writer.trackChanges.rejectOne` | Từ chối một | Bản có 1 vùng xóa | DOM revision: `1 → 0` | Lưu ra DOCX; Word COM: 0 revisions, comment còn; phần xóa được khôi phục | **PASS** | — |
| `writer.trackChanges.rejectAll` | Từ chối thay đổi | Bản có 1 vùng xóa | DOM revision: `1 → 0` | Lưu ra DOCX; Word COM: 0 revisions, comment còn; phần xóa được khôi phục | **PASS** | — |
| `writer.trackChanges.previous` | Thay đổi trước | Probe trên d07 nguyên bản, không có revision DOM | Chưa xác minh điều hướng giữa nhiều revision | Chưa lưu/đối chiếu | NOT RUN | — |
| `writer.trackChanges.next` | Thay đổi sau | Probe trên d07 nguyên bản, không có revision DOM | Chưa xác minh điều hướng giữa nhiều revision | Chưa lưu/đối chiếu | NOT RUN | — |

## Chế độ xem — 14 điều khiển thấy trong DOM

| commandId | Nhãn | Ngữ cảnh test | Hiệu quả trong VN Writer | DOCX / Word COM | Kết luận | Phím tắt |
|---|---|---|---|---|---|---|
| `writer.view.readMode` | Chế độ đọc | d07, bật rồi nhấn Escape qua CDP | Shell vào `vno-writer-read-mode`, toolbar đọc hiện; Escape về Print Layout và toolbar biến mất | Chỉ hiển thị | **PASS** | — |
| `writer.view.printLayout` | Bố trí in | Sau Read/Web | `aria-pressed=true`, bỏ class Web/Read | Chỉ hiển thị | **PASS** | — |
| `writer.view.webLayout` | Bố trí Web | d07 | `aria-pressed=true`, thêm class Web; bố cục reflow | Chỉ hiển thị | **PASS** | — |
| `writer.view.navigationPane` | Ngăn dẫn hướng | d07, mở pane | Pane mở và `aria-checked=true`, danh sách tiêu đề rỗng; XML d07 không có `w:pStyle`/`w:outlineLvl` | Chỉ hiển thị | NOT RUN — tài liệu test thiếu heading | `Ctrl+Alt+N` — chưa thử phím |
| `writer.view.ruler` | Thước | Bật/tắt | `aria-checked`: `true → false`; ruler chuyển sang hidden | Chỉ hiển thị | **PASS** | — |
| `writer.view.gridlines` | Đường lưới | Bật | `aria-checked=true`, container nhận class gridlines | Chỉ hiển thị | **PASS** | — |
| `writer.view.zoomIn` | Phóng to | d07 ở 100% | `data-zoom`: `1 → 1.1`; CSS scale đổi | Chỉ hiển thị | **PASS** | — |
| `writer.view.zoomOut` | Thu nhỏ | Sau 110% | `data-zoom`: `1 → 0.9` trong probe độc lập | Chỉ hiển thị | **PASS** | — |
| `writer.view.zoom100` | 100% | Từ 110% | `data-zoom`: `1.1 → 1` | Chỉ hiển thị | **PASS** | — |
| `writer.view.zoomReset` | Đặt lại | Từ Page Width | `data-zoom` trở về `1` | Chỉ hiển thị | **PASS** | — |
| `writer.view.pageWidth` | Chiều rộng trang | Viewport desktop hiện tại | `data-zoom=0.96` | Chỉ hiển thị | **PASS** | — |
| `writer.view.newWindow` | Cửa sổ mới | Không chạy | Không mở cửa sổ phụ trong lượt này | Chưa đối chiếu | NOT RUN | — |
| `common.macro.recordToggle` | Ghi Macro | Không chạy; không thuộc yêu cầu tab View | Chưa đo | Chưa đối chiếu | NOT RUN | `Ctrl+Shift+R` — chưa thử phím |
| `common.macro.manager` | Xem Macro | Không chạy; không thuộc yêu cầu tab View | Chưa đo | Chưa đối chiếu | NOT RUN | `Alt+F8` — chưa thử phím |

## XML, Word COM và tệp thử nghiệm

Các DOCX audit chỉ nằm ngoài repo trong `E:\VNOffice-profiles\codex-rbd5\`; d07 gốc không bị ghi đè. Bản có ghi chú và revision có 1 `w:comment`, 1 comment range, 1 `w:del`, cờ `w:trackRevisions`; Word COM mở bản cho phép sửa thấy 1 comment, 1 revision (tác giả `3T Office`; nội dung không đưa vào báo cáo) và `TrackRevisions=True`. Bản chấp nhận (một/tất cả) còn comment, không còn revision và bỏ phần bị xóa. Bản từ chối (một/tất cả) còn comment, không còn revision và khôi phục phần bị xóa. Đã mở cả năm bản bằng cùng một Word COM instance riêng; không lưu từ Word.

Hai lượt chạy mỗi tab cho cùng inventory 15/14 và cùng kết quả probe: Zoom đổi CSS scale; Print/Web đổi lớp bố cục; thao tác review probe mở hộp thoại Đếm từ/Thêm ghi chú. DOM view bổ sung xác nhận trạng thái aria và Read Mode/Escape. Không chạy bộ 28 XLSX, không chạy toàn bộ test suite và không build vì chỉ audit tài liệu.

### Chưa chạy / còn thiếu

- Chưa xác minh mọi điều khiển trong ba vị trí đầu/giữa/cuối, trong bảng và danh sách; chưa đo phím tắt bằng CDP.
- Chưa thử điều hướng nhiều nhận xét/nhiều revision, xóa/đánh dấu đã xử lý, hoặc mở cửa sổ mới. Ngăn dẫn hướng chưa được kết luận vì d07 không có heading ngữ nghĩa.
- Chưa có nút Split/side-by-side, Dark/Light, toàn màn hình, nhiều trang, hay hộp chọn phần trăm zoom trong inventory hiện tại; giữ đây là danh sách thiếu cho đợt sau, không thêm nút trong ticket này.
- d07 dài 37.874 ký tự; DOM Writer báo 23 trang canvas. Không coi con số này là tương đương phân trang Word.
- Không chụp ảnh.

## Kết quả follow-up RB-D5b — 10/10/2026

Lượt này dùng bản sao `d13.docx` trong `E:\VNOffice-profiles\codex-rd5b\artifacts\` (XML nguồn có 42 heading ngữ nghĩa). App chạy bằng `main.py`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-rd5b`; mỗi phiên do harness cấp cổng CDP riêng. Không gửi văn bản tài liệu tới AI/cloud. Các bản DOCX kết quả chỉ nằm ngoài repo.

### Chính tả và đếm từ

| Kiểm tra | VN Writer | Word `ComputeStatistics` | Kết quả |
|---|---:|---:|---|
| Chính tả bật/tắt bằng nút tab Đánh giá | `enabled`: true → false → true; marker: 0 → 0 → 686 | — | PASS — bật lại chạy kiểm tra và tạo marker thật; lần mở ban đầu chưa có marker |
| Từ | 2.761 | 2.764 | FAIL — lệch 3 |
| Ký tự không khoảng trắng | 13.256 | 13.376 | FAIL — lệch 120 |
| Ký tự có khoảng trắng | 15.655 | 16.004 | FAIL — lệch 349 |
| Đoạn văn | 326 sau sửa | 326 | PASS |
| Dòng | 1.093 | 485 | FAIL — lệch 608; bố cục canvas không cho cùng phép đo dòng với Word |

Chẩn đoán đoạn: XML có 335 thẻ `w:p`, trong đó 326 đoạn có chữ. DOM biểu diễn 120 mục danh sách bằng `<li><p>…</p></li>`; bộ đếm cũ cộng cả `<li>` và `<p>`, thành 446. Commit `c117112b` sửa đếm kép trong `apps/writer/word-count.js`; unit và CDP xác nhận hộp thoại hiện 326. Sai lệch từ/ký tự/dòng còn lại được chuyển vào backlog để điều tra riêng.

Lệnh `writer.review.toggleSpellCheck` không khai báo phím tắt riêng. `F7` của Writer được gán cho Soát lỗi chính tả AI, nên không chạy trong lượt audit này để tránh gửi tài liệu ra AI/cloud.

### Ghi chú và thay đổi

Ba ghi chú được tạo bằng thao tác chuột trên ba heading; từng thao tác có vùng neo. DOCX thật được lưu sau khi tạo, xóa và đánh dấu xử lý:

| Tệp thử | OOXML `comments.xml` / `document.xml` | Word COM mở lại |
|---|---|---|
| `comments-three.docx` | 3 `w:comment`; 3 `w:commentRangeStart`, 3 `w:commentRangeEnd`, 3 `w:commentReference` | 3 ghi chú; `Done=[false,false,false]` |
| `comments-after-delete.docx` | 2 ghi chú; 2 range start/end/reference | 2 ghi chú; `Done=[false,false]` |
| `comments-after-resolve.docx` | 2 ghi chú; 2 range start/end/reference; không có phần resolved OOXML | Word thấy 2 ghi chú nhưng `Done=[false,false]` |

Previous/Next chuyển active index 2 → 1 → 2 trong app. Xóa giảm comment/anchor 3 → 2. Đã xử lý đổi UI state lên 1 thẻ, nhưng Word roundtrip làm mất resolved state: FAIL. Đây là lỗi serialize OOXML thuộc `adapters/`; ghi nhận handoff cho owner thay vì sửa vùng adapter trong nhánh audit.

Hai thay đổi được chèn ở hai đoạn khác nhau khi Theo dõi thay đổi bật. Tệp `changes-two-paragraphs.docx` có 2 `w:ins`, không có `w:del`, và `word/settings.xml` có `w:trackRevisions`; Word COM mở lại thấy 2 revisions. App mở lại và điều hướng Next/Next/Previous chọn index -1 → 0 → 1 → 0. Nút và `Ctrl+Shift+E` bật/tắt Theo dõi thay đổi.

### Chế độ xem, cửa sổ và macro

- Ngăn dẫn hướng liệt kê 42 heading; bấm heading đặt con trỏ vào heading. `Ctrl+Alt+N` mở pane.
- Cửa sổ mới tăng số target CDP từ 1 lên 2.
- Ghi Macro bật bằng nút và dừng bằng `Ctrl+Shift+R`; dừng phiên không có thao tác báo không có macro để lưu. Xem Macro mở được trình quản lý rỗng. Không ghi macro có hành động và không chạy macro.
- Không chụp ảnh. Không chạy F7/Soát lỗi AI.

### Kết quả kiểm tra

- PASS — `npm test`: 3029/3029.
- PASS — `python -m unittest discover -s tests`: 811 tests, OK; có cảnh báo `ResourceWarning` về hai file descriptor chưa đóng.
- PASS — `git diff --check`.
- NOT RUN — build riêng; không đổi build system.

## Delta 3 dòng

- DOM d07: 37.874 ký tự, Writer 23 trang canvas; Read Mode/Escape hoạt động; scroll range đo được 50.571 px.
- DOCX/Word COM: 1 comment + 1 revision → chấp nhận: 0 revision/bỏ chữ xóa; từ chối: 0 revision/khôi phục chữ xóa; `TrackRevisions=True`.
- RAM trống: 8.709 MB trước → 8.465 MB sau các lượt audit đã đo (−244 MB); PID 9184 không bị tác động, Word COM do lượt audit tạo đã thoát theo PID.
