# FIX-L10 — Tiếp tục đối chiếu 36 nút Slides

Nhánh `audit/slides-l10-codex`, tạo từ `main` tại `532780be`. Profile CDP: `E:\VNOffice-profiles\codex-fl10`.

## Kết quả theo nhóm (mỗi nhóm 3 dòng)

**Chế độ xem / Trợ giúp** — Commit `75d3499a`.
CDP thao tác chế độ Bình thường, Bộ sắp xếp, Chế độ đọc, thước, lưới, đường hướng dẫn, zoom, xem trước khi in, Trợ giúp và Giới thiệu.
COM chỉ xác nhận PPTX còn 10 slide/5 shape; state tạm thời chưa được đối chiếu nên các dòng vẫn `CHƯA ĐỐI CHIẾU`.

**Ký hiệu** — Commit `7c89b365`.
CDP bấm Ký hiệu và chọn ™; text/model không đổi. COM đọc lại 10 slide/6 shape và không thấy ký tự trong nội dung lưu.
Hàng `slides.insert.symbol` vẫn `CHƯA ĐỐI CHIẾU`; kết quả chỉ áp dụng phép thử ™ này.

**Trình chiếu** — Commit `652b6594`.
CDP kiểm tra Từ đầu, Từ trang này, Presenter, Thiết lập trình chiếu và Tập dượt; COM đọc `LoopUntilStopped=-1` khớp app.
`slides.show.setupShow` chuyển thành `KHỚP POWERPOINT`; state slideshow tạm thời còn `CHƯA ĐỐI CHIẾU`. Hàng `slides.master.apply` được ghi `LỆCH ĐÃ BIẾT` theo COM FIX-L6; không sửa.

**Sao chép định dạng** — Commit `82ada9bd`.
CDP tái hiện nút cọ áp fill hình thay vì kiểu chữ; sửa target text click để áp kiểu, gồm cỡ chữ và descendant có cỡ riêng. Thêm regression test.
CDP + COM xác nhận target Oswald 48 pt cùng màu/highlight nguồn; `slides.edit.formatPainter` thành `KHỚP POWERPOINT`. Hướng dẫn VI và tooltip VI/EN đã có trong Help/i18n.

**Nhận xét** — Commit `d9ffab88`.
CDP tạo Alpha/Beta và xóa Beta; PowerPoint COM đọc đúng 2 rồi còn 1 nhận xét với nội dung/tác giả.
`slides.review.commentInsert` và `slides.review.commentDelete` thành `KHỚP POWERPOINT`; Previous/Next/Resolve vẫn `CHƯA ĐỐI CHIẾU` do COM không xác nhận view selection/resolved.

**Chính tả** — Commit `635d8b9d`.
CDP bật/tắt kiểm tra chính tả, mở hộp thoại, chờ trạng thái hoàn tất và đóng bằng Esc; COM xác nhận deck 10 slide/5 shape.
`slides.review.spellCheck` và `slides.review.toggleSpellCheck` vẫn `CHƯA ĐỐI CHIẾU`; COM chưa chạy phép so sánh chính tả tương ứng.

**Cửa sổ / Macro** — Commit `80bbbb45`.
CDP bấm Cửa sổ mới (WebView page count vẫn 1), ghi một macro zoom, lưu và thấy macro trong Quản lý Macro.
COM đọc lại 10 slide/5 shape nhưng không đối chiếu cửa sổ hay macro native; ba hàng liên quan vẫn `CHƯA ĐỐI CHIẾU`.

**Video / Âm thanh** — Commit `a245d74e`.
CDP bật chặn file chooser nhưng không nhận `Page.fileChooserOpened` trong 15 giây; không chọn được media fixture. PPTX lưu vẫn 10 slide/5 shape.
COM không thấy media object; hai hàng vẫn `CHƯA ĐỐI CHIẾU`, vì luồng chọn file desktop chưa tới được.

## Ma trận cuối

Generator `scripts/audit-0610/gen_slides_button_matrix.py` tái sinh ma trận 88 hàng: **47 KHỚP POWERPOINT, 30 CHƯA ĐỐI CHIẾU, 9 LỆCH ĐÃ BIẾT, 2 KHÁC CÓ CHỦ Ý**. Trong 36 hàng được tiếp tục đo, 5 được xác nhận khớp, `slides.master.apply` được ghi là lệch đã biết, 30 còn chờ đối chiếu. Các sai khác native layout, SmartArt, theme, transition Zoom và WordArt không được sửa; không đổi semantics PPTX.

## Kiểm tra

- `npm test`: **PASS 3092/3092**.
- `python -m unittest discover -s tests`: **ERROR** khi dọn thư mục của `test_detached_helper_process_runs_from_a_path_with_spaces` (`WinError 32`, process còn giữ file). Suite ghi nhận 887 test; không có assertion failure trước lỗi cleanup.
- `python -m unittest discover -s tests -v`: **PASS 887/887**. Các test Sheet/Writer thất bại trong một lượt trước do app test orphan chạy `sample-sheet.xlsx`; sau khi dừng đúng PID, focused Sheet round-trip + Writer comments-import PASS 2/2. Updater helper cleanup retry PASS 1/1. Có `ResourceWarning` về file handle không đóng.
- Slides CDP: `claude-slides-roundtrip.desktop.mjs` **PASS 8/8**; `slides-fix-l2.desktop.mjs` **PASS 20/20**; `slides-fix-l3.desktop.mjs` **PASS**, exit 0 với 13 thao tác.
- Generator chạy thành công; `git diff --check` sạch. Ma trận UTF-8 không BOM.
- Build: **NOT RUN** (không được yêu cầu trong FIX-L7).

## Giới hạn / việc chờ chủ sở hữu

30 hàng còn `CHƯA ĐỐI CHIẾU` có lý do và artifact cụ thể trong `docs/SLIDES-BUTTON-MATRIX-1011.md`. Hàng `slides.master.apply` và các sai khác native đã biết được ghi nhận để chủ sở hữu duyệt, không sửa trong lượt này.
