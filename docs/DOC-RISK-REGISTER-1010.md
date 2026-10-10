# Sổ rủi ro Doc — 10/10/2026 (cập nhật liên tục)

Quy ước: ĐÃ SỬA = đã gộp vào main và có kiểm độc lập; MỚI = là tính năng mới/không có trong Word hiện tại → chờ chủ dự án; MỞ = còn việc.

## A. Lỗi đã ghi nhận
| Mã | Trạng thái | Ghi chú |
|---|---|---|
| U1 U2 U3 U6 U7 U8 U10 U11 U12 U14 U15 U17 U18 U19 U20 U21 U23 U25 U26 U27 U28 U29 U30 U31 U33 U35 U37 U38 U40 | ĐÃ SỬA | Commit và kiểm: xem các merge ngày 10/10 trong git log |
| U16 | ĐÃ SỬA | Panel Trợ lý/Trợ giúp thành lớp nổi (UI-P1) |
| U12 | ĐÃ SỬA, còn hạn chế | Chọn cột: vùng chọn là Range liên tục nên Ctrl+C/định dạng có thể tính cả ô nằm giữa — cần xử lý riêng |
| U4 | MỞ (nhỏ) | Nút chỉ icon, không nhãn (Chữ đầu đoạn, Ngày & Giờ) |
| U13 | MỚI | Hướng giấy mở cả hộp thoại thay vì menu Dọc/Ngang |
| U5 | MỚI | Lưới chọn số hàng/cột khi chèn bảng |
| U9 U22 | MỚI | Bảng chọn màu tô ô/tô nền đoạn, menu viền |
| U32 U34 U36 U39 U41 | MỚI | Chức năng Word còn thiếu (Thêm văn bản vào mục lục, Khối địa chỉ, Từ điển đồng nghĩa, So sánh...) |

## B. Rủi ro chưa kiểm hoặc cần kiểm lại sau đợt sửa (việc của đợt rà soát này)
| # | Rủi ro | Cách kiểm | Trạng thái |
|---|---|---|---|
| R1 | Gộp nhiều nhánh trong ngày làm hỏng lưu DOCX | Bộ kiểm DOCX 23 tệp so với Word trên main | ĐANG CHẠY |
| R2 | Mở tệp chậm hơn (luật sinh tồn: nhanh như Word) | Đo thời gian mở d07/d13 trước-sau | CHƯA |
| R3 | Gõ chậm trên tài liệu dài sau sửa chính tả (U1) và undo (U23) | Đo độ trễ gõ trên tài liệu dài | CHƯA |
| R4 | Undo/Redo giữ con trỏ đúng ở mọi thao tác (dán, Enter, xóa, cắt, đổi định dạng, bảng) | Kịch bản desktop mở rộng | CHƯA |
| R5 | Ctrl+D xung đột phím tắt khác (gạch chân kép? đánh dấu) | Quét keymap + kiểm tay | CHƯA |
| R6 | Lưu Thành (Save As) với bộ lọc mới trên hộp thoại hệ điều hành thật | Chỉ bản thật mới thử được (CDP không điều khiển được) | CẦN CHỦ DỰ ÁN |
| R7 | Chế độ Tối: mọi hộp thoại Doc đọc được | Chụp ảnh + đo tương phản toàn bộ hộp thoại | CHƯA |
| R8 | Cửa sổ nhỏ (1024x600) mọi tab + hộp thoại | Đo bằng số | MỘT PHẦN (tab ribbon đã sửa) |
| R9 | Định dạng cũ .doc/.rtf/.odt mở-lưu | Bộ kiểm legacy | CHƯA |
| R10 | Đếm từ khớp Word (từ, ký tự, đoạn, dòng) | Codex RB-D5b đối chiếu Word COM | ĐANG CHẠY |
| R11 | Code review độc lập toàn bộ thay đổi Doc hôm nay | Skill code-review | ĐANG CHẠY |
| R12 | Hộp văn bản và bảng trống lưu DOCX/mở lại bằng Word | Kiểm lưu thật + Word COM | ĐÃ KIỂM (Codex T4/T1) — kiểm lại bằng bộ 23 |