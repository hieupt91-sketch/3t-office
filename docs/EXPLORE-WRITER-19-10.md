# Soạn thử VN Writer như người dùng thật (19/10/2026) — phát hiện và việc còn lại

Cách làm: mở app desktop thật (CDP, không điều khiển hệ điều hành), gõ bàn phím và bấm chuột như người soạn báo cáo; đọc lại DOCX bằng Word 2016 thật (ẩn).
Công cụ: `scripts/audit-0610/app_session_server.mjs` (phiên sống, lệnh `size` đổi cỡ cửa sổ), `scripts/audit-0610/word_author_report_readback.ps1`.

## Đã sửa và đã commit (mỗi lỗi có bài CDP/đơn vị)
1. **Bật danh sách (đầu dòng/đánh số/Ctrl+Shift+L) làm con trỏ nhảy sai** — chữ gõ tiếp dính vào đoạn trước hoặc nằm trước danh sách. `e0430e9f`, `tests/live/cdp/writer-list-caret.desktop.mjs`.
2. **Thoát danh sách bằng Enter hai lần rồi dừng gõ vài giây, con trỏ nhảy về mục cuối** (lượt kiểm tra chính tả đặt lại vùng chọn trong `<div>`). `454541e4`.
3. **Hàng bảng thêm bằng Tab cao hơn hàng cũ và mất canh phải cột số.** `b6dd98f2`, `writer-table-tab-rows.desktop.mjs`.
4. **Chân trang luôn ghi "Trang 1 / 1" dù tài liệu nhiều trang** (trường NUMPAGES). `e2acd944`, `writer-footer-numpages.desktop.mjs`.
5. **Kiểm tra chính tả gạch đỏ nhầm từ thông dụng** (thuế, kênh, trực, tuyến, mại, nhuận...): từ điển chỉ có ~2.800 âm tiết. Thêm bộ kiểm tra âm tiết theo quy tắc chính tả (tự biên soạn, CC0). `dde1ee2c`, `tests/unit/vi-syllable.test.js`.

## Phát hiện CHƯA sửa (xếp theo mức ảnh hưởng)
- **Đầu trang/chân trang chỉ hiện ở trang 1** trong khung soạn thảo (trang 2 trở đi trống); chế độ xem trước khi in thì đúng. Word hiện ở mọi trang. Cần thiết kế lại cách vẽ trang (lớn).
- **Kiểu "Tiêu đề 1": bản xem trước trong thư viện (đen, đậm, chữ hoa) khác kết quả áp dụng (xanh, chữ thường, 16 pt).**
- **Nút "Hàng tiêu đề" (Thiết kế Bảng) không hiện trạng thái đang bật** dù hàng đã đậm và có màu nền.
- **"Bảng biểu" chèn ngay bảng 4×3 cố định**, không có lưới/hộp thoại chọn số hàng, cột như Word.
- Nhãn "Normal" tiếng Anh trong thư viện kiểu; nhãn "ĐẦU TRANG (HEADER)" / "CHÂN TRANG (FOOTER)" lẫn tiếng Anh.
- Thư viện kiểu bảng: nhiều nhãn bị cắt giống hệt nhau ("Lưới 1 Nhẹ - ...") nên khó phân biệt màu.
- Hộp thoại "Khôi phục tài liệu chưa lưu" vẫn nằm đó sau khi bỏ bản cuối ("Không còn bản khôi phục nào"), nút ghi "Để sau" thay vì "Đóng".
- Nhóm "Thu phóng" trên ribbon Chế độ xem bị cắt ở nút "Đặt lại" (cửa sổ 1366 px).
- Cửa sổ hẹp (1024 px): nhiều nút ribbon gom vào menu, thư viện kiểu thu thành một nút — kiểm tra lại cách hiển thị.
- Sau khi thoát danh sách bằng Enter hai lần, đoạn mới là `<div>` (không phải `<p>`); lưu DOCX vẫn đúng nhưng nên thống nhất.
- Lớp lưu: `serializeToFodt()` ném lỗi "marker data-vno-* chưa có ánh xạ Phase A..." khi gọi trực tiếp (đường lưu thật `_contentForExport()` vẫn lưu được) — xem lại xem có còn dùng không.

## Đã kiểm tra, hoạt động đúng
Gõ tiếng Việt có dấu; Ctrl+E/Ctrl+B; Ctrl+Alt+1 (Tiêu đề 1) và Enter sau tiêu đề về đoạn thường; Tab di chuyển ô bảng và thêm hàng ở ô cuối; tùy chọn hàng tiêu đề/hàng xen kẽ; thư viện kiểu bảng; canh phải ô; chèn đầu trang/chân trang; ngắt trang Ctrl+Enter; thanh trạng thái Trang X / Y; lưu DOCX rồi Word 2016 đọc lại khớp (tiêu đề căn giữa đậm, Heading 1, danh sách thật, bảng, đầu/chân trang có trường số trang, ngắt trang).

## Chưa thử (làm tiếp)
Tìm/thay thế, nhận xét và theo dõi thay đổi, chú thích cuối trang, mục lục, hình ảnh và hình khối, hộp văn bản, chèn ký hiệu/phương trình, bố cục trang (lề, hướng, cột), sao chép định dạng, dán đặc biệt, trộn thư, xuất PDF, in.