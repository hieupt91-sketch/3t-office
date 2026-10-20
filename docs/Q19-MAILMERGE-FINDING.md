# Q19 — Trộn thư: kết quả và luồng lưu

## Xác minh

CDP nạp CSV có ba người nhận, chèn trường `HoTen`, xem trước, hoàn tất trộn và tạo được DOCX thật từ nội dung kết quả. Phiên Writer mới mở lại DOCX có đủ `Nguyen An`, `Tran Binh`, `Le Chi`; Word COM chạy ẩn ở chế độ chỉ đọc cũng xác nhận đủ ba tên.

## Sai khác còn lại

Hộp thoại Hoàn tất trộn ghi “Tạo tài liệu mới”, nhưng `finishMailMerge()` thay nội dung của tài liệu đang mở. Sau khi trộn, kết quả vẫn có thể lưu bằng lệnh Lưu thành, nhưng thao tác trộn không tự mở tài liệu mới hay tạo tệp đích. Bài CDP tạo tệp kiểm chứng qua bridge lưu của ứng dụng để kiểm tra round-trip.

## Đề xuất bước tiếp

Tạo kết quả trộn thành tài liệu Writer riêng qua lifecycle/API tài liệu hiện có, giữ tài liệu nguồn nguyên trạng và đưa kết quả vào trạng thái có thể lưu thành DOCX. Bổ sung CDP kiểm tra tài liệu nguồn không đổi, kết quả chứa đúng số bản ghi và DOCX mở lại được; xác nhận trong Word COM ẩn chỉ đọc. Giữ thao tác offline và không thêm dịch vụ ngoài.
