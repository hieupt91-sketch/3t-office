# Q75: mở tài liệu khi máy in mạng mặc định mất kết nối

Ngày: 2026-11-02. Nhánh: `codex/q75`; `git merge main` trả về `Already up to date`.

## Plan gate trước khi sửa mã

- **Mục tiêu:** bỏ chờ liệt kê máy in mặc định khi tiến trình xử lý tài liệu khởi động, để app mở tài liệu offline; giữ nguyên hồ sơ trang và khả năng xem trước/in khi người dùng yêu cầu.
- **Năng lực hiện tại:** LibreOffice chạy từ worker UNO lâu dài và CLI ngắn hạn, đều kế thừa môi trường tiến trình app. Hồ sơ riêng theo ứng dụng đã tồn tại. Nhánh Windows của app có thể liệt kê máy in riêng khi mở hộp thoại In.
- **Tệp dự kiến:** `main.py` (thiết lập môi trường chỉ cho tiến trình LibreOffice tạo bởi app); `tests/test_soffice_uno_worker_startup.py` và/hoặc kiểm thử tương ứng cho hợp đồng môi trường. Không sửa Core, UI, hồ sơ Windows hay thuật toán dàn trang.
- **Rủi ro:** `SAL_DISABLE_DEFAULTPRINTER` và `SAL_DISABLE_PRINTERLIST` cố ý tắt chọn máy in mặc định/danh sách bên trong tiến trình LibreOffice. Cần xác nhận xử lý tài liệu nhanh, số trang d03 không đổi, luồng xem trước/in hiện hữu không bị ảnh hưởng; hộp thoại app tiếp tục truy vấn hàng đợi Windows chỉ khi người dùng mở hộp thoại.
- **Kiểm thử:** unit/contract trước và sau; đo d03, DOCX 8/8 qua CDP, một XLSX và PPTX qua app; kiểm tra đường xem trước/in có sẵn; các gate Node, i18n, checklist và pytest liên quan.
- **Rollback:** revert commit triển khai độc lập; thay đổi không ghi cấu hình hệ thống hay dữ liệu người dùng.

## Tái hiện và cơ sở chọn hướng

Q74 đo d03: app/UI còn trạng thái tải sau 147 giây và chưa hoàn tất sau 180 giây; CLI DOCX→HTML mất 67,138 giây. Ảnh Q74 tại 1366×768: `E:\VNOffice-briefs\logs\Q74-work\run1-current.png`.

Đo CLI độc lập ngày 2026-11-02, hồ sơ LibreOffice mới mỗi lượt, cùng máy in mặc định Windows `\\http://192.168.1.252:631\LBP2900`:

| Tài liệu / bộ lọc | Mặc định | Hai biến printer-disable | Đầu ra |
|---|---:|---:|---|
| d03.docx → HTML | timeout >135 s | 16,783 s | 11.538 byte |
| lan05.xlsx → FODS | 18,397 s | 16,379 s | 365.242 byte |
| sample-3.pptx → PDF | 57,722 s | 23,216 s | 9.306.085 byte |

Hai biến được đối chiếu từ báo cáo lỗi LibreOffice #42673 và mã VCL upstream: `SAL_DISABLE_DEFAULTPRINTER=1`, `SAL_DISABLE_PRINTERLIST=1`. Chúng phải chỉ nằm trong môi trường của tiến trình LibreOffice do app khởi chạy; không đặt trong registry hoặc môi trường Windows. Kết quả sau sửa và các giới hạn kiểm thử sẽ được bổ sung bên dưới.
