# 3T Office 0.9.9 — ghi chú phát hành (BẢN NHÁP, chưa phát hành)

Trạng thái: nội dung đã nằm trong `main` (04/10/2026), chưa dựng gói, chưa đẩy lên kho cập nhật hay VPS. Chờ chủ sở hữu duyệt phát hành.

## Sửa lỗi quan trọng
- **Cửa sổ trắng khi mở ứng dụng.** Máy chủ giao diện nội bộ có hàng đợi kết nối quá nhỏ nên thỉnh thoảng giao diện không dựng được. Đo 60 lượt khởi động: trước sửa kẹt 22%, sau sửa 0%.
- **Lưu tệp Excel rất lớn làm ứng dụng sập.** Tệp lớn (như lan14, hơn 300 triệu ký tự khi lưu) nay được chuyển theo từng đoạn nhỏ; lưu lan14 mất khoảng 31 giây, không sai lệch.
- **Chuyển sheet trong tệp có nhiều dòng ẩn dùng quá nhiều bộ nhớ.** RAM đỉnh lan14 khi chuyển sheet giảm từ 4,8 GB còn 2,1 GB.
- **In: bản xem trước dựng nhanh hơn.** Mặc định dùng bộ máy tích hợp (12 giây thay vì 76 giây); phần mềm văn phòng cài sẵn chỉ dùng khi bạn bật.

## Nhanh hơn
- Doc: tài liệu nặng (30 MB, nhiều ngắt mục) mở 33 giây thay vì 173 giây.
- Sheet: dựng mô hình nhanh hơn (lan14 52 → 21 giây), xử lý dữ liệu nhanh hơn 15–25%.
- Slide: lần mở đầu tiên trên máy mới nhanh gần gấp đôi (27 → 15 giây).
- Sheet (tùy chọn, tắt mặc định): **xem nhanh** khi mở tệp lớn; màn hình đầu hiện sau 5–15 giây trong khi tệp nạp đầy đủ ở nền.

## Mới
- **Tệp ▸ Tài khoản và bản quyền** (Doc/Sheet/Slide): nhập mã kích hoạt (tự kiểm lỗi gõ, không cần Internet), kích hoạt ngoại tuyến, gỡ kích hoạt. Hiện chưa khóa tính năng nào; ứng dụng không bao giờ tự tắt chỉ vì mất mạng.
- Hướng dẫn tiếng Việt cho các lệnh còn thiếu (Toàn màn hình, Giao diện Tối/Sáng, Lặp lại F4, Xuống dòng trong ô, Tính lại ngay F9, Liên kết trong Sheet, Chọn trong Slide) và cho hộp bản quyền.
- Thao tác chuột đồng bộ giữa Doc, Sheet, Slide (kéo đổi cỡ hàng/cột, chọn, chữ tràn khi soạn ô).

## Cần quyết định trước khi phát hành
1. Có bật **xem nhanh** mặc định cho tệp Excel lớn không (trong lúc nạp, ô chỉ đọc)?
2. Chính sách sau 30 ngày dùng thử (hộp bản quyền đang hiển thị đếm ngược nhưng chưa khóa gì).
3. Có cần xác minh gì thêm trước khi phát hành lên kho LAN và Internet.

## Chưa nằm trong bản này
Trang bán hàng/quản trị trực tuyến (đã có mã, chưa triển khai), hỗ trợ macOS và di động (đã có đặc tả).

Số liệu và cách kiểm: `docs/SPEC-PERF-OPEN.md` mục 6.1b; `docs/HANDOFF-LICENSE-CLIENT.md`.
