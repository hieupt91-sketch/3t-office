# Khám phá soạn thảo VN Writer — 20/10/2026

## Môi trường và phạm vi

- Nhánh `codex/queue-19-10`; đã `git merge main` fast-forward từ `11d572a0` đến `afdb51a6`.
- Chạy Writer desktop qua `scripts/audit-0610/app_session_server.mjs` và CDP, kích thước cửa sổ 1366×850; hồ sơ riêng `E:\VNOffice-profiles\Q11-writer-20261020-0915`.
- Soạn thư mời kèm phụ lục, ngắt trang và thử các thao tác được giao. Thao tác qua chuột/bàn phím CDP; không dùng điều khiển hệ điều hành.
- Tài liệu còn ở phiên mặc định `Tài liệu 1.docx`; Ctrl+S không tạo hộp chọn vị trí và không tìm thấy DOCX trong hồ sơ riêng. Do chưa lưu được tệp, bước đọc lại tệp qua Word chạy ẩn bị BLOCKED. Không gọi COM.
- Ảnh chứng cứ: [thư mục ảnh](assets/q11-writer-2026-10-20/).

## Nhật ký thao tác

| # | Cách thao tác | Thao tác | Kỳ vọng | Thực tế |
|---|---|---|---|---|
| 1 | Chuột + bàn phím | Chọn vùng soạn thảo và nhập tiêu đề tiếng Việt | Văn bản xuất hiện đúng | PASS — chữ có dấu hiển thị đúng; [ảnh](assets/q11-writer-2026-10-20/02-enter-probe.png) |
| 2 | Bàn phím | Nhấn Enter sau tiêu đề | Tạo đoạn mới | PASS — Enter đúng tên phím tạo đoạn; lần đầu dùng nhãn `ENTER` không nhận xuống dòng, sau đó sửa cách thao tác, không phải sửa ứng dụng |
| 3 | Bàn phím | Nhập kính gửi, nội dung thư, thời gian, địa điểm và chương trình | Nội dung chia đoạn, dễ đọc | PASS — các đoạn tách riêng; [ảnh](assets/q11-writer-2026-10-20/03-two-page-draft.png) |
| 4 | Bàn phím | Nhấn Ctrl+Enter để sang phụ lục | Trang mới được tạo | PASS — thanh trạng thái hiển thị trang 1/2 và 2/2 |
| 5 | Chuột | Mở Chèn → Đầu trang | Có vùng đầu trang | PASS — hiện “Tiêu đề đầu trang”; [ảnh](assets/q11-writer-2026-10-20/11-current-state.png) |
| 6 | Chuột | Mở Chèn → Chân trang | Có vùng chân trang | PASS — vùng chân trang được thêm; cần mở lại tệp để xác nhận round-trip, hiện BLOCKED vì chưa lưu được |
| 7 | Chuột | Chèn Hộp văn bản | Có hộp để nhập nội dung | FAIL — tạo hộp có chữ mẫu “Nhập văn bản” nổi trên nội dung và che một phần dòng thư; ghi nhận, chưa sửa vì chưa khoanh vùng nguyên nhân nhỏ an toàn |
| 8 | Chuột + bàn phím | Mở Phương trình, nhập `S = v*t`, chèn | Phương trình xuất hiện trong văn bản | PASS — biểu thức hiển thị dạng toán học `x² S = v × t`; [ảnh](assets/q11-writer-2026-10-20/09-equation-inserted.png) |
| 9 | Chuột | Chèn Hình ảnh | Mở được nguồn ảnh để chọn tệp | BLOCKED — sau nhấp không có hộp chọn tệp hay input tệp trong trang; không dùng điều khiển hệ điều hành |
| 10 | Chuột | Mở Bố cục → 2 cột | Nội dung trình bày hai cột | PASS — trang hiển thị hai cột; nội dung được cân bằng giữa cột, khớp phát hiện đã biết; [ảnh](assets/q11-writer-2026-10-20/14-two-columns.png) |
| 11 | Chuột | Mở tab Chèn và kiểm tra lệnh Ngắt trang, Bảng biểu, Hình khối | Các lệnh cần dùng hiện trên ribbon | PASS — ba lệnh hiện diện; không chèn bảng/hình khối trong thư mời này |
| 12 | Chuột | Trang đầu → Thay thế | Hộp Tìm kiếm và Thay thế mở | PASS — có ô Tìm gì/Thay bằng và các tuỳ chọn; [ảnh](assets/q11-writer-2026-10-20/16-find-replace.png) |
| 13 | Chuột | Chọn Định dạng trong hộp tìm/thay | Hiện lọc theo định dạng | PASS — hiện lọc Đậm, Nghiêng, Phông và Màu; chưa áp dụng thay thế định dạng lên nội dung |
| 14 | Chuột | Mở tab Trộn thư | Hiện luồng tạo/trộn thư | PASS phần giao diện — có Nguồn dữ liệu, Chèn trường, Xem trước kết quả, Hoàn tất & Trộn; BLOCKED phần trộn vì chưa gắn nguồn người nhận |
| 15 | Bàn phím | Nhấn Ctrl+S | Lưu được tài liệu | BLOCKED — không thấy hộp lưu/đường dẫn; không có DOCX trong hồ sơ CDP, nên không thể kiểm tra round-trip |
| 16 | Bàn phím | Nhấn Ctrl+F2 để xem trước/in | Bản xem trước tài liệu sẵn sàng | FAIL — màn hình giữ trạng thái “Đang dựng trang thật…”; thanh trang xem trước hiện `1 / 1` trong khi vùng soạn thảo báo `Trang 1 / 2`; [ảnh](assets/q11-writer-2026-10-20/19-print-preview-loaded.png) |
| 17 | Chuột | Nhấn Soát lỗi chính tả | Hiển thị kết quả rà soát | PASS một phần — panel thông báo đã kiểm tra ngữ pháp/chính tả; panel trợ lý mở cạnh tài liệu, chưa kiểm tra độc lập từng từ; [ảnh](assets/q11-writer-2026-10-20/20-proofing.png) |
| 18 | Bàn phím | Thử mở tài liệu lưu để kiểm tra round-trip | Mở lại được DOCX đã lưu | BLOCKED — chưa có tệp DOCX do bước 15; không khởi chạy bộ đọc lại Word |
| 19 | Chuột | Kiểm tra tab Bố cục | Có điều khiển cột và ngắt | PASS — Căn lề, Hướng giấy, Khổ giấy, Cột và Ngắt hiện trên ribbon; [ảnh](assets/q11-writer-2026-10-20/13-layout-tab.png) |
| 20 | Chuột | Kiểm tra các lệnh trộn thư | Có bước nguồn dữ liệu và hoàn tất | PASS giao diện — các lệnh có sẵn; không thể xác nhận trộn đầu ra khi chưa tạo nguồn dữ liệu |

## Lỗi/giới hạn ghi nhận, chưa sửa

1. Hộp văn bản được chèn với nội dung mẫu “Nhập văn bản” và phủ lên dòng thư. Cần tái hiện có lưu/mở lại trước khi quyết định sửa.
2. Bản xem trước in bị kẹt ở bước dựng trang và số trang khác vùng soạn thảo (1/1 so với 1/2). Chưa xuất PDF được từ trạng thái này.
3. Luồng lưu Ctrl+S không đưa ra vị trí lưu có thể chọn qua CDP; không có DOCX để đối chiếu đọc lại.
4. Nút chèn ảnh chưa cho thấy bộ chọn tệp qua phiên CDP.
5. Hai cột cân bằng nội dung trên hai cột; cần thử với một trang văn bản dài chưa ngắt trang để so sánh hành vi chính xác.

Không sửa mã nguồn trong phiếu này. Các vấn đề trên cần tái hiện bổ sung; không có commit sửa lỗi nên không áp dụng số đo FAIL-trước/PASS-sau.

## Gate cuối

- `node tests/run-tests.js`: PASS — 3770/3770.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — VI=3108, EN=3108, thiếu 0 khóa mỗi ngôn ngữ.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng bị hạ; Word 279, Excel 217, PowerPoint 269.
- `python -m pytest tests -q -k "writer or docx or ooxml"`: PASS — 340 passed, 758 deselected (363.89s).
