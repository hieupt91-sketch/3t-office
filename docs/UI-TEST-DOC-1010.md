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
