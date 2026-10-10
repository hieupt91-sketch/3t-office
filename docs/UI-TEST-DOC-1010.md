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
| U19 | TRUNG BÌNH | Trang đầu > Đổi hoa/thường (Aa) | Sau khi đổi, vùng chọn bị mất (0 ký tự được chọn) và cỡ chữ 14pt đã đặt bị mất; Word giữ nguyên vùng chọn và định dạng. Hệ quả: bấm tiếp "Xóa định dạng" không có tác dụng. | Đo `getSelection().toString().length` = 0, `<font style="font-size:14pt">` biến mất. |
| U20 | CAO | Trang đầu > Sao chép định dạng | Chế độ chổi định dạng bị KẸT bật (class `vno-format-painter-active` trên trang): Esc không hủy, chuyển tab/gõ/bấm nút khác không hủy; người dùng thấy cửa sổ "không thao tác được". Word tự tắt chổi sau 1 lần dán định dạng hoặc khi bấm Esc. Chỉ thoát khi bấm lại đúng nút. Phát hiện 10/10 khi chủ dự án báo không thao tác được cửa sổ test. | Đo `document.querySelector(".vno-writer-page").className` chứa format-painter-active; bấm lại nút thì tắt. Ảnh 23–26. |
| U21 | THẤP | Trang đầu > Sắp xếp (A-Z) trên một đoạn | Không có hộp thoại hay thông báo nào khi không đủ đoạn để sắp xếp; người dùng không biết nút có hoạt động không. | Ảnh 26. |
| U22 | CẦN XÁC MINH | Trang đầu > Tô nền đoạn, Viền | Bấm nút chỉ thấy nút sáng, không thấy bảng chọn màu/kiểu viền (giống U9). Chưa xác nhận có áp dụng hay không. | Ảnh 24, 25. Giao agy kiểm bằng ảnh đoạn đang chọn. |
Ghi chú kết quả ĐẠT (đo bằng số, chuột thật qua CDP): In đậm/nghiêng/gạch chân/gạch ngang/chỉ số dưới/trên bật-tắt đúng; căn trái/giữa/phải/đều; danh sách dấu đầu dòng và số bật-tắt đúng; Tăng/giảm cỡ chữ (14↔16pt); màu chữ và tô sáng; Thư viện kiểu mở đúng; Tìm kiếm/Thay thế; Dán đặc biệt; Hình mờ/Màu trang/Viền trang/Chủ đề; Chế độ hiện ký tự định dạng.
| U23 | RẤT CAO | Hoàn tác (Ctrl+Z) | Sau Ctrl+Z, con trỏ nhảy về ĐẦU TÀI LIỆU: gõ tiếp thì chữ chèn vào tiêu đề đầu tiên ("ZChương 1…"). Word giữ con trỏ tại chỗ vừa hoàn tác. Tái hiện: cuối tài liệu gõ " ABC", Ctrl+Z, gõ "Z". | `getSelection().anchorNode` = DIV.vno-writer-body (container) sau Ctrl+Z; phím thật qua CDP. Báo cáo undo cũ của agy chỉ kiểm nội dung, không kiểm vị trí con trỏ. |
| U24 | THẤP | Phím tắt Ctrl+= / Ctrl+Shift+= | Hoạt động (chỉ số dưới/trên), Ctrl+E/R/L/J, Ctrl+M/Shift+M, Ctrl+B/I/U đều đạt khi đo bằng số. | Ghi nhận ĐẠT. |
| U25 | TRUNG BÌNH | Tab Chèn ở 1366 px | Ribbon quá rộng: xuất hiện thanh cuộn ngang ngay trong ribbon, nút "Ký hiệu" bị cắt mép phải. Word thu gọn nhóm thành menu thay vì cuộn. | Ảnh 27. |
| U26 | THẤP | Chèn > Hộp văn bản | Hộp văn bản chèn ở đỉnh trang 1, đè lên vùng đầu trang thay vì tại vị trí con trỏ; chữ mẫu "Nhập văn bản" không được chọn sẵn. | Ảnh 27. |
Ghi chú ĐẠT (Chèn): Trang trắng, Ngắt trang, Đánh dấu, Chữ nghệ thuật, Ngày & Giờ, Phương trình, Ký hiệu, Sơ đồ, Biểu đồ, Hình khối, Liên kết, Đầu/Chân trang mở đúng hộp thoại/chèn đúng; "Hình ảnh" mở hộp chọn tệp hệ thống (chưa kiểm bằng ảnh).
| U27 | THẤP | Tham chiếu > Mục lục tự động | Khoảng trống lớn (~90 px) giữa đường kẻ tiêu đề "MỤC LỤC" và dòng đầu tiên; hộp văn bản nổi (U26) đè lên tiêu đề mục lục (không có thứ tự lớp rõ ràng). | Ảnh 31. |
Ghi chú ĐẠT (Tham chiếu): Mục lục tự động liệt kê đủ 4 tiêu đề kèm số trang; Chú thích trang (số 1) và Chú thích cuối (số i) chèn đúng, có vùng chú thích.
| U28 | RẤT CAO (ĐÃ SỬA) | Tệp > Lưu thành (Ctrl+Shift+S) | Báo 'Không thể lưu tài liệu — Không mở được hộp thoại lưu: ... (*.doc) is not a valid file filter'. Nguyên nhân: pywebview từ chối tên bộ lọc có dấu '-' ('97-2003'). Đã sửa 10/10 (đổi thành '97 đến 2003') kèm test dùng đúng bộ kiểm của pywebview. | Ảnh/log phiên live; test tests/test_save_as_filter_names.py. |
| U29 | TRUNG BÌNH | Phím Ctrl+D | Không mở hộp thoại Phông chữ như Word (Ctrl+D). | Đo: không có hộp thoại sau Ctrl+D. Ctrl+P mở hộp in, Ctrl+H/F/K đúng. |
