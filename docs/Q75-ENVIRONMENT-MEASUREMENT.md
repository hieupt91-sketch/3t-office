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

## Thay đổi

`main.py` tạo bản sao môi trường cho tiến trình con LibreOffice, thêm hai biến printer-disable vào bản sao đó, rồi dùng cho worker UNO lâu dài và CLI chuyển đổi/tự-đối-chiếu. Môi trường tiến trình app không đổi. Lệnh CLI in tệp đích không nhận hai biến này để giữ chọn máy in tường minh. Không sửa Core, registry, spooler, hồ sơ người dùng hay dàn trang.

Kiểm thử contract `tests/test_soffice_printer_environment.py` được chạy trước sửa và FAIL vì helper chưa tồn tại; sau sửa PASS và xác nhận biến không rò sang môi trường app. LibreOffice VCL upstream xác nhận danh sách hàng đợi và truy vấn máy in mặc định được bỏ qua khi đặt các biến này. Hộp thoại In VN vẫn lấy danh sách từ hàng đợi Windows khi người dùng mở hộp thoại.

## Kết quả sau sửa

- **Mở lạnh qua app thật/CDP, mỗi lượt `VNO_CDP_LOCALAPPDATA` riêng:** d03.docx 20,298 ms tổng (12,760 ms sau renderer); lan05.xlsx 20,817 ms (13,262 ms sau renderer); sample-3.pptx 28,677 ms (22,817 ms sau renderer; 10 trang). Cả ba dưới mục tiêu 60 giây.
- **DOCX batch audit/CDP, Word ẩn, 8/8 PASS:** d01 19→19; d02 11→11; d03 1→1; d06 3→3; d07 23→23; d13 10→10; d20 3→3; d24 16→16. Mỗi tệp sửa bằng thao tác CDP; page delta bằng 0.
- **Xem trước khi in:** d03 dựng 1/1 trang, không còn trạng thái tải hoặc lỗi. Ảnh xem trước được chụp và xem thủ công.
- **Kiểm thử:** `node tests/run-tests.js` PASS 3886/3886; i18n PASS VI=3229/EN=3229, missing=0; checklist PASS, 0 dòng hạ; pytest liên quan PASS 27, 1193 deselected.
- **Máy in thật:** không gửi lệnh in vật lý. Máy in hiện khả năng truy vấn của Windows vẫn là hàng đợi mạng ngoại tuyến đã nêu ở Q74; in ra máy vật lý trong trạng thái này BLOCKED, không thay đổi máy in hoặc spooler.

## Giao diện đã xem

Các ảnh nằm trong `E:\VNOffice-briefs\logs\Q75-work` và đều chụp ở 1366×768. Writer d03: `d03-cold-start.png` (đang mở), `d03-cold-loaded.png` (đủ nội dung, trạng thái 1/3 ở canvas); kết luận: đạt, trang/toolbar không tràn. Xem trước Writer: `d03-print-preview.png` (1/1); đạt, nút và điều hướng rõ, trang cuộn được.

Sheet lan05: `lan05-start.png`, `lan05-loaded.png`, `lan05-stable.png`; kết luận: đạt sau render ổn định, không tràn. Ảnh `lan05-loaded.png` có bóng chữ trùng thoáng qua ngay khi hoàn tất nạp; đã tự hết sau 5 giây (`lan05-stable.png`), không phát sinh lỗi dai dẳng. Slides sample-3: `sample-3-start.png`, `sample-3-loaded.png`; kết luận: đạt, đủ 10 trang, ảnh/tiêu đề rõ, không bị che.
