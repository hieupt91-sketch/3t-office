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
| R1 | Gộp nhiều nhánh trong ngày làm hỏng lưu DOCX | Bộ kiểm DOCX 23 tệp so với Word trên main | ĐÃ KIỂM: 23/23 PASS (22:10); kiểm lại sau lô sửa rủi ro: d03/d13/d23/d24 PASS |
| R2 | Mở tệp chậm hơn (luật sinh tồn: nhanh như Word) | Đo thời gian mở d07/d13 trước-sau | CHƯA |
| R3 | Gõ chậm trên tài liệu dài sau sửa chính tả (U1) và undo (U23) | Đo độ trễ gõ trên d07 (38.842 ký tự): trước U23 12,3 ms/phím → sau 14,1 ms/phím | ĐÃ ĐO: +15%, vẫn rất nhanh. Còn ghi nhận: selectionchange tuần tự hóa DOM mỗi lần gõ — theo dõi trên tài liệu 160 trang |
| R4 | Undo/Redo giữ con trỏ đúng ở mọi thao tác | Gõ giữa dòng, Backspace, Enter, Cắt (Ctrl+X), định dạng, bảng, ÁP CỘT nhiều mục | ĐÃ KIỂM: đạt; phát hiện và SỬA lỗi áp cột làm rơi con trỏ |
| R5 | Ctrl+D xung đột phím tắt khác | Đo trên app thật | ĐÃ KIỂM: Doc mở hộp Phông chữ, Sheet Điền xuống ([5,5,5]), Slides Nhân đôi (1→2 trang) |
| R6 | Lưu Thành (Save As) với bộ lọc mới trên hộp thoại hệ điều hành thật | Chỉ bản thật mới thử được (CDP không điều khiển được) | CẦN CHỦ DỰ ÁN |
| R7 | Chế độ Tối: mọi hộp thoại Doc đọc được | Chụp ảnh + đo tương phản toàn bộ hộp thoại | CHƯA |
| R8 | Cửa sổ nhỏ (1024x600) mọi tab + hộp thoại | Đo bằng số | MỘT PHẦN (tab ribbon đã sửa) |
| R9 | Định dạng cũ .doc/.rtf/.odt mở-lưu | Bộ kiểm legacy | CHƯA |
| R10 | Đếm từ khớp Word (từ, ký tự, đoạn, dòng) | Codex RB-D5b đối chiếu Word COM | ĐANG CHẠY |
| R11 | Code review độc lập toàn bộ thay đổi Doc hôm nay | Skill code-review | ĐÃ CHẠY: 10 điểm; đã sửa 6 (đổi hoa/thường nhiều đoạn, chổi định dạng, hộp văn bản + hồi quy FIX-T3, tách ô theo cột lưới, áp cột giữ con trỏ, chống kẹt hoãn chính tả); 4 điểm ghi nhận rủi ro thấp (rò rỉ listener khi hủy adapter, MutationObserver ribbon, đồng bộ cột đơn mục, đặt tiêu điểm lặp ở tab) |
| R12 | Hộp văn bản và bảng trống lưu DOCX/mở lại bằng Word | Kiểm lưu thật + Word COM | ĐÃ KIỂM (Codex T4/T1) — kiểm lại bằng bộ 23 |
## C. Phát hiện trong đợt rà soát rủi ro (10/10 tối)
- HỒI QUY do lần gộp FIX-T3: hộp văn bản lại chèn ở góc trang thay vì tại con trỏ (nút ribbon lấy tiêu điểm nên tọa độ con trỏ = 0). Đã sửa bằng cách ghi nhớ tọa độ lúc bấm ribbon; kịch bản T4 của Codex bắt được và quay lại 4/4.
- Tách ô khi hàng dưới có ô gộp dọc của cột khác: ô dữ liệu bị đẩy sai cột. Đã sửa + test.
- Áp cột trong tài liệu nhiều mục làm con trỏ rơi về thẻ body (gõ tiếp vào sai chỗ). Đã sửa + test.
- Sao chép định dạng không sao chép cỡ chữ; bấm ribbon khi chổi bật có thể áp lên vùng nguồn. Đã sửa.
