# Thời gian mở Doc trên bộ tệp Word mẫu (04/10/2026)

Nguồn số đo: agy (`doc-open-agy.md`, `doc-open-agy.json`), Claude đã đối chiếu mẫu (d04 ≈ 6,4 s, d24 ≈ 14,5–15,5 s khớp với số đo của Claude) và kiểm tra kết luận bất thường.

## Kết quả
- 23/24 tệp mở được trong **5–15 giây**; tệp nặng nhất d24 (22,7 MB) mất ≈ 15 giây. Đáy ≈ 5 giây là chi phí khởi động ứng dụng + LibreOffice, không phụ thuộc kích thước tệp.
- Cột "> 5 s/MB" trong báo cáo của agy **không có ý nghĩa** với tệp nhỏ (tệp 20 KB cũng mất đáy 5 giây). Chỉ dùng cột giây tuyệt đối.
- **Đính chính d10.docx:** agy ghi "chậm, quá 300 giây (lỗi)". Thực tế `d10.docx` là một **tệp PDF mang đuôi .docx** (đầu tệp `%PDF-1.7`). LibreOffice nhận diện là tài liệu Draw nên bộ lọc Writer báo lỗi trong 3,8 giây; ứng dụng không treo mà báo lỗi, nhưng công cụ đo chờ sự kiện "mở xong" không bao giờ đến nên tính là hết thời gian. Đã sửa thông báo: nay ứng dụng nói rõ "tệp có đuôi .docx nhưng thực chất là PDF" (có test cho cả 3 ứng dụng).

## Không có tệp Word nào chậm bất thường còn lại
MYTIME.docx (30 MB) đã sửa ở phase P3 (173 → 33 s). Không tìm thấy thêm tệp nào giống MYTIME trong bộ mẫu.
