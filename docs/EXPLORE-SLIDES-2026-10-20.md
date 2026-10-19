# Khám phá VN Slides như người dùng thật — 20/10/2026 (Q12)

## Phạm vi và môi trường

Soạn một bài trình bày 5 trang về kế hoạch phát triển sản phẩm số. Thao tác trên ứng dụng desktop qua CDP bằng chuột và bàn phím; phiên dùng `scripts/audit-0610/app_session_server.mjs slides --port=47013`, khởi động ứng dụng qua `tests/live/cdp/session.mjs`. `LOCALAPPDATA` riêng: `E:\VNOffice-profiles\q12-slides-20261020-02`. Không dùng SendKeys, AppleScript hay điều khiển hệ điều hành.

Ảnh chứng cứ: [thư mục ảnh Q12](assets/q12-slides-2026-10-20/). Bộ ảnh ghi lại màn hình ứng dụng ở từng bước liên quan.

## Nhật ký thao tác

| # | Cách thao tác | Việc làm | Kỳ vọng | Thực tế |
|---|---|---|---|---|
| 1 | Bàn phím / chuột | Nhập tiêu đề và phụ đề trang 1 | Tiếng Việt hiển thị đúng, trang bìa có nội dung | PASS — tiêu đề và phụ đề hiển thị đúng; ảnh [trang bìa](assets/q12-slides-2026-10-20/q12-01-title-slide.png) |
| 2 | Chuột / bàn phím | Thêm trang 2, nhập ba ưu tiên quý IV | Trang mới và nội dung được giữ | PASS — trang 2 xuất hiện trong danh sách và có nội dung; ảnh [ưu tiên](assets/q12-slides-2026-10-20/q12-03-priorities.png) |
| 3 | Chuột / bàn phím | Thêm trang 3, nhập dữ liệu tiến độ | Trang mới nhận tiêu đề và dữ liệu | PASS — trang 3 hiển thị; ảnh [kết quả theo quý](assets/q12-slides-2026-10-20/q12-04-results.png) |
| 4 | Chuột / bàn phím | Chèn bảng, nhập 4 hàng × 3 cột trong hộp thoại | Bảng có đúng 4 × 3 ô | FAIL — bảng kết quả hiển thị 12 × 12 ô, phủ lên nội dung văn bản cũ; ảnh [bảng sau chèn](assets/q12-slides-2026-10-20/q12-06-table-inserted.png) |
| 5 | Chuột / bàn phím | Thêm trang 4 và nhập nội dung kế hoạch hành động | Tiêu đề và nội dung trang 4 hiển thị | PASS — nội dung hiện ở trang 4; ảnh [kế hoạch hành động](assets/q12-slides-2026-10-20/q12-07-action-plan.png) |
| 6 | Chuột / bàn phím | Chèn biểu đồ cột với bốn quý | Biểu đồ cột được chèn và hiển thị dữ liệu | PASS — biểu đồ bốn cột xuất hiện; ảnh [biểu đồ](assets/q12-slides-2026-10-20/q12-09-chart-created.png) |
| 7 | Chuột / bàn phím | Đổi tiêu đề biểu đồ thành “Tiến độ triển khai” | Chỉ còn tiêu đề đã nhập | FAIL — tiêu đề mặc định “Biểu đồ dữ liệu” dính liền với nội dung vừa nhập thành “Biểu đồ dữ liệuTiến độ triển khai”; ảnh [biểu đồ sau chèn](assets/q12-slides-2026-10-20/q12-09-chart-created.png) |
| 8 | Chuột / bàn phím | Chèn sơ đồ quy trình bốn bước | Bốn nút bước xuất hiện trên slide | PASS — Bước 1–4 hiển thị; ảnh [sơ đồ](assets/q12-slides-2026-10-20/q12-11-diagram-created.png) |
| 9 | Chuột | Chọn Bước 1 và gán hiệu ứng Mờ dần xuất hiện | Đối tượng có hiệu ứng vào | PASS — ngăn hoạt hình ghi hiệu ứng Fade In ở mục 1; ảnh [thứ tự hoạt hình](assets/q12-slides-2026-10-20/q12-14-animation-sequence.png) |
| 10 | Chuột | Chọn biểu đồ và thêm hiệu ứng Bay vào | Biểu đồ nhận hiệu ứng thứ hai | PASS — ngăn hoạt hình liệt kê Fade In mục 1, Fly In mục 2; ảnh [thứ tự hoạt hình](assets/q12-slides-2026-10-20/q12-14-animation-sequence.png) |
| 11 | Chuột / bàn phím | Thêm trang 5, nhập quyết định và các bước tiếp theo | Trang kết luận hiển thị | PASS — trang 5 có nội dung; ảnh [ghi chú người thuyết trình](assets/q12-slides-2026-10-20/q12-16-speaker-notes.png) |
| 12 | Chuột / bàn phím | Mở ngăn ghi chú và nhập ghi chú thuyết trình | Ghi chú được lưu cho trang hiện tại | PASS — bộ đếm hiển thị 94 ký tự; ảnh [ghi chú](assets/q12-slides-2026-10-20/q12-16-speaker-notes.png) |
| 13 | Chuột / bàn phím | Mở hộp thoại chuyển tiếp, chọn Quét, bấm Áp dụng | Trang có chuyển tiếp đã chọn | PASS — hộp thoại đóng sau khi áp dụng; ảnh [tùy chọn chuyển tiếp](assets/q12-slides-2026-10-20/q12-18-transition-choices.png), [trở lại ribbon](assets/q12-slides-2026-10-20/q12-19-transition-applied.png) |
| 14 | Chuột | Thiết kế → Mẫu Slide Master → chọn Xanh Lá Thiên Nhiên → Áp dụng mẫu | Màu và kiểu chủ đạo đổi nhất quán | PASS — cả danh sách thu nhỏ và trang chiếu chuyển sang mẫu xanh; ảnh [mẫu đã áp dụng](assets/q12-slides-2026-10-20/q12-25-master-applied.png) |
| 15 | Chuột | Chèn → Hình ảnh, thử chọn ảnh từ tệp | Bộ chọn tệp xuất hiện để chọn ảnh | BLOCKED — phiên CDP không có hộp thoại hoặc input tệp nào trong DOM; không điều khiển hộp thoại hệ điều hành theo quy tắc phiếu; ảnh [lượt thử chèn ảnh](assets/q12-slides-2026-10-20/q12-20-insert-image-attempt.png) |
| 16 | Bàn phím | Chọn trang 1 và nhấn F5 | Bắt đầu trình chiếu toàn màn hình | PASS — màn hình trình chiếu báo Trang 1 / 5; ảnh [bắt đầu trình chiếu](assets/q12-slides-2026-10-20/q12-21-slideshow-start.png) |
| 17 | Bàn phím | Nhấn mũi tên phải bốn lần | Đi đến trang 5 | PASS — màn hình báo Trang 5 / 5; ảnh [điều hướng trình chiếu](assets/q12-slides-2026-10-20/q12-22-slideshow-navigation.png) |
| 18 | Bàn phím | Nhấn Esc | Thoát trình chiếu về trình sửa | PASS — lớp trình chiếu biến mất; quay lại trình sửa |
| 19 | Bàn phím | Ctrl+S trên bản trình bày mới | Có tệp PPTX được lưu | BLOCKED — hồ sơ chỉ có bản phục hồi `.fodp`, không có `.pptx`; ảnh [lượt lưu](assets/q12-slides-2026-10-20/q12-26-save-attempt.png) |
| 20 | Chuột | Tệp → Lưu thành (F12) | Chọn vị trí và tên tệp PPTX | BLOCKED — không có hộp thoại lưu khả dụng qua CDP; không có PPTX xuất hiện trong hồ sơ; ảnh [lượt Lưu thành](assets/q12-slides-2026-10-20/q12-28-save-as.png) |
| 21 | Chuột | Tệp → Xuất PDF → PDF | Tạo bản PDF | BLOCKED — trang xuất trở lại trình sửa nhưng không có PDF trong hồ sơ thử; ảnh [kết quả xuất PDF](assets/q12-slides-2026-10-20/q12-31-pdf-export-result.png) |
| 22 | Chuột | Mở In, chờ bộ dựng trang | Xem trước in đủ năm trang | PASS — sau khoảng 15 giây trạng thái “Sẵn sàng in”, phạm vi “Tất cả (5 trang)”; ảnh [xem trước in](assets/q12-slides-2026-10-20/q12-33-print-preview-waited.png) |
| 23 | Chuột | Thử in ra tệp PDF từ luồng in | Có bản PDF đầu ra | BLOCKED — chưa gửi lệnh in vì cần hộp thoại/đích in ngoài CDP; không có PDF được tạo |
| 24 | Đối chiếu tệp | Mở lại PPTX đã lưu trong phiên mới | Năm trang, bảng, biểu đồ, ghi chú, chuyển tiếp và hoạt hình còn nguyên | BLOCKED — không tạo được PPTX để mở lại |
| 25 | PowerPoint COM ẩn | Đọc PPTX bằng script readback ở chế độ chỉ đọc | Xác nhận nội dung và hiệu ứng trong tệp | BLOCKED — không có PPTX đã lưu; không gọi COM |

## Lỗi ghi nhận và sửa mã

Ghi nhận hai sai khác giao diện để tái hiện tiếp: kích thước bảng sau xác nhận không khớp 4 × 3; tiêu đề biểu đồ bị nối với tiêu đề mặc định. Chưa sửa mã vì lượt thao tác chưa xác minh được giá trị thực tế trong hai ô nhập ngay trước khi bấm Chèn; chưa có phép thử CDP/đơn vị tái hiện FAIL độc lập để làm mốc trước sửa. Theo quy tắc phiếu, không coi đây là lỗi đã sửa.

## Kiểm tra đầu ra

- Tạo/chỉnh sửa qua chuột và bàn phím CDP: 25 thao tác được ghi; 16 PASS, 2 FAIL, 7 BLOCKED.
- Tệp đầu ra: chưa có PPTX/PDF; hồ sơ CDP có bản phục hồi `.fodp`.
- `npm test` — PASS, 3770/3770.
- `node scripts/audit-0610/i18n_parity.mjs` — PASS, VI=3108, EN=3108, missing=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — PASS, 0 dòng bị hạ; Word 279, Excel 217, PowerPoint 269.
- `python -m pytest tests -q -k "slides or pptx"` — PASS, 152 passed, 946 deselected.
- PowerPoint COM readback: BLOCKED vì không có PPTX đã lưu. Không sửa source code trong lượt này; không có bài kiểm tra FAIL-trước/PASS-sau vì không sửa lỗi.
