# Nhật ký kiểm thử giao diện Doc (người dùng Word) — 10/10/2026

Cách làm: mở app Doc thật (WebView2) và giữ mở liên tục (`scripts/audit-0610/app_session_server.mjs`), tự gõ văn bản dài bằng bàn phím thật, thao tác từng icon ở từng tab, chụp ảnh xem trực quan. Lỗi chỉ ghi lại để xử lý sau; chưa sửa trong đợt này.
Ảnh minh chứng: `E:\VNOffice-profiles\ui-shots\live-writer\` (không commit).

## Lỗi đã ghi nhận

| # | Mức | Tab / chức năng | Mô tả (như người dùng thấy) | Bằng chứng / nguyên nhân nghi ngờ |
|---|---|---|---|---|
| U1 | CAO | Trang đầu — In đậm / In nghiêng / Gạch chân khi chưa chọn chữ | Bấm Ctrl+B (hoặc nút B) rồi gõ chữ: chữ gõ ra KHÔNG đậm. Người dùng Word làm thao tác này liên tục. | Chỉ xảy ra khi bật kiểm tra chính tả: kiểm tra chính tả bọc từ vào thẻ `span` sau khi gõ nên đặt lại con trỏ và mất trạng thái "gõ tiếp đậm". Tắt kiểm tra chính tả thì Ctrl+B đúng. Gợi ý sửa: dùng CSS Custom Highlight API thay vì sửa DOM. Ảnh 02, 03. |
| U2 | TRUNG BÌNH | Kiểm tra chính tả tiếng Việt | Gạch đỏ nhầm các từ đúng như "đạt", "tỷ". | Ảnh 02. Từ điển thiếu từ phổ biến. |
| U3 | THẤP | Trang đầu — Xóa định dạng (Ctrl+Space) tại con trỏ | Ở đoạn mới sau chữ đậm, Ctrl+Space không đưa trạng thái đậm về mặc định. | Phép đo `queryCommandState('bold')` vẫn true. |
| U4 | THẤP | Chèn > Văn bản — Chữ đầu đoạn, Ngày & Giờ | Nút chỉ có biểu tượng, không có nhãn chữ như các nút khác trong nhóm; người dùng khó đoán chức năng. | Chỉ có tooltip. |
| U5 | TRUNG BÌNH | Chèn > Bảng biểu | Bấm là chèn ngay bảng mặc định 3x4, không có lưới chọn số hàng/cột như Word. | Ảnh 07. |
| U6 | CAO | Chèn bảng rồi gõ + Tab | Chữ mẫu "Tiêu đề"/"Dữ liệu" không được chọn sẵn nên chữ gõ bị dính liền ("Hạng mụcTiêu đề", "28Dữ liệu"). Word chèn bảng trống. | Ảnh 08, 10. |
| U7 | THẤP | Bố cục Bảng > nhóm Bảng | Nhóm "Bảng" (Chọn ô/hàng/cột/bảng, Xóa bảng) bị cắt mép trên: nút "Chọn ô" sát/ra ngoài đỉnh vùng ribbon. | Ảnh 10. |
| U8 | CAO | Bố cục Bảng > Tách ô trên ô đã gộp | Gộp cả hàng thành 1 ô rồi bấm Tách ô: cờ gộp mất nhưng hàng vẫn chỉ 1 ô (không sinh lại 3 ô) — bảng bị lệch cấu trúc; Ctrl+Z 2 lần mới khôi phục. | Đo `rows[i].cells.length` = [5,4,1,4] sau Tách. |
| U9 | TRUNG BÌNH | Thiết kế Bảng > Tô màu ô | Bấm nút chỉ thấy nút sáng (active), không hiện bảng chọn màu như Word; không rõ đã tô hay chưa. | Ảnh 12; không có popup/menu trong DOM sau khi bấm. |
| U10 | TRUNG BÌNH | Thiết kế Bảng > Hàng xen kẽ | Bật xong thêm class `vno-table-banded-rows` nhưng không thấy hàng nào đổi màu nền trên màn hình. | Ảnh 12, nền ô rgba(0,0,0,0). Cần xác nhận trên bảng có dữ liệu. |
| U11 | THẤP | Bố cục Bảng > Gộp ô khi chưa chọn nhiều ô | Không có thông báo nào, người dùng không biết vì sao không có tác dụng. | Số hàng/cột không đổi, không có toast. |
| U12 | THẤP | Bố cục Bảng > Chọn hàng | Bấm "Chọn hàng" không thấy vùng chọn nổi bật trong DOM/ảnh. | Cần xác nhận bằng ảnh. |
| U13 | THẤP | Bố cục > Hướng giấy | Bấm mở cả hộp thoại Thiết lập trang thay vì chọn nhanh Dọc/Ngang như Word. | Ảnh 16. |
| U14 | THẤP | Thiết kế/Bố cục — nút vừa bấm | Nút (Tô màu ô, Viền trang, Căn lề) giữ nền "sáng" sau khi đóng hộp thoại, dễ tưởng đang bật. | Ảnh 12, 13, 15. |
| U15 | THẤP | Thiết kế > Chủ đề văn bản | Chữ "Ấn bản" ở thẻ Trang nhã hiển thị hở dấu ("Ấ n bản"). | Ảnh 14-themeGallery. |
| U16 | TRUNG BÌNH | Trợ giúp + Trợ lý AI mở cùng lúc | Hai panel bên phải cùng mở chiếm ~45% chiều rộng ở 1366 px: trang văn bản bị cắt mép phải, xuất hiện thanh cuộn ngang. Word chỉ cho 1 panel tác vụ. | Ảnh 17–19. |
| U17 | TRUNG BÌNH | Trợ giúp > Trợ giúp (panel) | Panel mở ra đã cuộn giữa chừng: thấy ô tìm kiếm rồi nhảy sang "Báo lỗi / Góp ý", không thấy danh sách chủ đề hướng dẫn đầu panel. | Ảnh 17. Cần kiểm tra danh sách chủ đề có hiển thị khi panel rộng hơn không. |
| U18 | CAO | Trợ lý AI > Tóm tắt nhanh | Báo "Phát hiện 1826 từ trong văn bản" trong khi thanh trạng thái ghi 416 từ (lần khác 432 vs 430). Hai nơi đếm theo hai cách khác nhau. | Ảnh 19. Nên dùng chung một hàm đếm từ. |
