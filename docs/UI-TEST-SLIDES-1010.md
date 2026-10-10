# Nhật ký kiểm thử giao diện Slides (người dùng PowerPoint) — 10/10/2026

Cách làm: mở app Slides thật (WebView2) và giữ mở liên tục (`scripts/audit-0610/app_session_server.mjs`), mở tệp pptx thật (`sample-3.pptx`), thao tác từng icon ở từng tab, đo bằng số (DOM/computed style) trước qua CDP và phím tắt/chuột thật, chụp ảnh xem trực quan. Lỗi chỉ ghi lại để xử lý sau; chưa sửa trong đợt này.
Ảnh minh chứng: `E:\VNOffice-profiles\ui-shots\live-slides\` (không commit).

## Lỗi đã ghi nhận

| # | Mức | Tab / chức năng | Mô tả (như người dùng thấy) | Bằng chứng / nguyên nhân nghi ngờ |
|---|---|---|---|---|
| U-L1 | THẤP | Trang đầu > Lặp ký tự biểu tượng nhóm Đối tượng vẽ | Nhãn nút "Hộp văn bản" hiển thị "A Hộp văn bản" do ký tự 'A' trong SVG/icon bị dính vào text hiển thị của nút. | Đã đo bằng số: DOM innerText của button chứa "A Hộp văn bản". Ảnh `tab-home.png`. |
| U-L2 | TRUNG BÌNH | Trang đầu > Màu chữ không mở bảng chọn màu | Bấm nút chỉ áp màu đỏ cố định #dc2626 (rgb(220, 38, 38)) vào chữ; nút KHÔNG mở bảng chọn màu (palette) nào như PowerPoint; người dùng không thể chọn màu chữ tùy biến. | Đã đo bằng số qua CDP: popupsCount = 0, text nhận rgb(220, 38, 38). Mã adapter `slides.color.text` gán cứng `#dc2626`. Ảnh `tab-home.png`. |
| U-L3 | TRUNG BÌNH | Trang đầu > Màu nền chữ không mở bảng chọn màu | Bấm nút chỉ áp màu vàng cố định #ffcd00 (rgb(255, 205, 0)) vào nền chữ; nút KHÔNG mở bảng chọn màu (highlight palette) nào; người dùng không thể tự chọn màu sắc mong muốn. | Đã đo bằng số qua CDP: popupsCount = 0. Mã adapter `slides.color.highlight` gán cứng `#ffcd00`. Ảnh `tab-home.png`. |
| U-L4 | THẤP | Trang đầu > Trạng thái nút In đậm / In nghiêng / Gạch chân | Khi chọn chữ có định dạng đậm/nghiêng/gạch chân hoặc sau khi bấm B/I/U, các nút trên ribbon KHÔNG cập nhật trạng thái bật sáng (class active/is-checked vẫn false, aria-pressed không đổi) khiến người dùng không biết định dạng đang bật hay tắt. | Đã đo bằng số: `btn.classList.contains('active')` = false, `aria-pressed` = false. Ảnh `tab-home.png`. |
| U-L5 | THẤP | Trang đầu > Thiếu menu chọn kiểu Dấu đầu dòng và Đánh số | Bấm nút Dấu đầu dòng (Bullets) và Đánh số (Numbered) chỉ áp dụng kiểu tròn/số mặc định, không có mũi tên xổ xuống để chọn các kiểu ký hiệu đầu dòng khác (tròn rỗng, vuông, La Mã, chữ cái...) như PowerPoint. | Đã đo bằng số: button không có dropdown arrow, không mở popup chọn kiểu list. Ảnh `tab-home.png`. |

Ghi chú kết quả ĐẠT (Trang đầu — đo bằng số, chuột thật qua CDP): Trang mới (Ctrl+M) chèn slide mới thành công; Nhân đôi (Ctrl+D) nhân bản slide hiện tại chuẩn; Xóa trang (Delete) xóa slide chuẩn; Bố cục mở hộp thoại "Chọn Bố Cục Trang Chiếu" hiển thị trực quan các mẫu bố cục và đóng được bằng Escape; Menu xổ xuống "Phần" mở đầy đủ 5 lệnh quản lý phần; Phím tắt Ctrl+B, Ctrl+I, Ctrl+U áp dụng định dạng vào văn bản; Chọn phông chữ và cỡ chữ qua dropdown; Các nút căn lề (Trái, Giữa, Phải, Căn đều); Giãn dòng (1.0, 1.5, 2.0); Menu Sắp xếp (15 lệnh: Lên trên, Xuống dưới, Nhóm, Căn chỉnh...); Tìm kiếm (Ctrl+F) và Thay thế (Ctrl+H) mở panel chuẩn.
