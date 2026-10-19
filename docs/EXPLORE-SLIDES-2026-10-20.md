# Khám phá VN Slides như người dùng thật — 20/10/2026 (Q12)

## Q14 — Xác minh lại các mục còn mở (20/10/2026)

- Tái kiểm tra hai FAIL bằng CDP: ngay trước khi bấm Chèn, các ô có đúng `4` hàng, `3` cột và `Tiến độ triển khai`; mô hình nhận bảng 4×3 và giữ nguyên tiêu đề biểu đồ (2/2 PASS). Lỗi Q12 do Ctrl+A không thay nội dung ô trong thao tác đó; không có lỗi sản phẩm cần sửa. Bài CDP: `tests/live/cdp/slides-q14-insert-fields.desktop.mjs`.
- Tạo và lưu PPTX 5 trang qua `serializeToFodp` → `save_document_in_place`, mở lại trong tiến trình desktop mới: đủ bảng 4×3, biểu đồ, ảnh PNG, ghi chú, chuyển trang Quét và hoạt hình Fade (CDP 10/10 PASS). Ảnh được chọn qua `DOM.setFileInputFiles`.
- PDF được tạo qua `prepare_print_document` rồi `print_document` với đường dẫn đích; trạng thái API `ok`, bộ dựng báo 5 trang và kiểm tra PDF đọc lại được 5 trang. PowerPoint COM ẩn, chỉ đọc, xác nhận 5 trang, bảng 4×3, biểu đồ “Tiến độ triển khai”, ảnh, ghi chú trang 4, chuyển trang (EntryEffect=2817) và một hoạt hình trang 5. Bài CDP: `tests/live/cdp/slides-q14-roundtrip.desktop.mjs`; readback: `scripts/audit-0610/ppt_table_readback.ps1`, `scripts/audit-0610/ppt_animation_all_readback.ps1`.

## Phạm vi và môi trường

Soạn một bài trình bày 5 trang về kế hoạch phát triển sản phẩm số. Thao tác trên ứng dụng desktop qua CDP bằng chuột và bàn phím; phiên dùng `scripts/audit-0610/app_session_server.mjs slides --port=47013`, khởi động ứng dụng qua `tests/live/cdp/session.mjs`. `LOCALAPPDATA` riêng: `E:\VNOffice-profiles\q12-slides-20261020-02`. Không dùng SendKeys, AppleScript hay điều khiển hệ điều hành.

Ảnh chứng cứ: [thư mục ảnh Q12](assets/q12-slides-2026-10-20/). Bộ ảnh ghi lại màn hình ứng dụng ở từng bước liên quan.

## Nhật ký thao tác

| # | Cách thao tác | Việc làm | Kỳ vọng | Thực tế |
|---|---|---|---|---|
| 1 | Bàn phím / chuột | Nhập tiêu đề và phụ đề trang 1 | Tiếng Việt hiển thị đúng, trang bìa có nội dung | PASS — tiêu đề và phụ đề hiển thị đúng; ảnh [trang bìa](assets/q12-slides-2026-10-20/q12-01-title-slide.png) |
| 2 | Chuột / bàn phím | Thêm trang 2, nhập ba ưu tiên quý IV | Trang mới và nội dung được giữ | PASS — trang 2 xuất hiện trong danh sách và có nội dung; ảnh [ưu tiên](assets/q12-slides-2026-10-20/q12-03-priorities.png) |
| 3 | Chuột / bàn phím | Thêm trang 3, nhập dữ liệu tiến độ | Trang mới nhận tiêu đề và dữ liệu | PASS — trang 3 hiển thị; ảnh [kết quả theo quý](assets/q12-slides-2026-10-20/q12-04-results.png) |
| 4 | Chuột / bàn phím | Chèn bảng, nhập 4 hàng × 3 cột trong hộp thoại | Bảng có đúng 4 × 3 ô | PASS (Q14) — đọc giá trị ngay trước Chèn là 4/3; mô hình và PowerPoint COM xác nhận 4×3. Q12 đã nhập sai giá trị do Ctrl+A không chọn nội dung; ảnh Q12 [bảng sau chèn](assets/q12-slides-2026-10-20/q12-06-table-inserted.png) |
| 5 | Chuột / bàn phím | Thêm trang 4 và nhập nội dung kế hoạch hành động | Tiêu đề và nội dung trang 4 hiển thị | PASS — nội dung hiện ở trang 4; ảnh [kế hoạch hành động](assets/q12-slides-2026-10-20/q12-07-action-plan.png) |
| 6 | Chuột / bàn phím | Chèn biểu đồ cột với bốn quý | Biểu đồ cột được chèn và hiển thị dữ liệu | PASS — biểu đồ bốn cột xuất hiện; ảnh [biểu đồ](assets/q12-slides-2026-10-20/q12-09-chart-created.png) |
| 7 | Chuột / bàn phím | Đổi tiêu đề biểu đồ thành “Tiến độ triển khai” | Chỉ còn tiêu đề đã nhập | PASS (Q14) — giá trị ô trước khi Chèn là “Tiến độ triển khai”; mô hình và PowerPoint COM giữ đúng tiêu đề. Q12 đã nhập nối tiếp do Ctrl+A không chọn nội dung; ảnh Q12 [biểu đồ sau chèn](assets/q12-slides-2026-10-20/q12-09-chart-created.png) |
| 8 | Chuột / bàn phím | Chèn sơ đồ quy trình bốn bước | Bốn nút bước xuất hiện trên slide | PASS — Bước 1–4 hiển thị; ảnh [sơ đồ](assets/q12-slides-2026-10-20/q12-11-diagram-created.png) |
| 9 | Chuột | Chọn Bước 1 và gán hiệu ứng Mờ dần xuất hiện | Đối tượng có hiệu ứng vào | PASS — ngăn hoạt hình ghi hiệu ứng Fade In ở mục 1; ảnh [thứ tự hoạt hình](assets/q12-slides-2026-10-20/q12-14-animation-sequence.png) |
| 10 | Chuột | Chọn biểu đồ và thêm hiệu ứng Bay vào | Biểu đồ nhận hiệu ứng thứ hai | PASS — ngăn hoạt hình liệt kê Fade In mục 1, Fly In mục 2; ảnh [thứ tự hoạt hình](assets/q12-slides-2026-10-20/q12-14-animation-sequence.png) |
| 11 | Chuột / bàn phím | Thêm trang 5, nhập quyết định và các bước tiếp theo | Trang kết luận hiển thị | PASS — trang 5 có nội dung; ảnh [ghi chú người thuyết trình](assets/q12-slides-2026-10-20/q12-16-speaker-notes.png) |
| 12 | Chuột / bàn phím | Mở ngăn ghi chú và nhập ghi chú thuyết trình | Ghi chú được lưu cho trang hiện tại | PASS — bộ đếm hiển thị 94 ký tự; ảnh [ghi chú](assets/q12-slides-2026-10-20/q12-16-speaker-notes.png) |
| 13 | Chuột / bàn phím | Mở hộp thoại chuyển tiếp, chọn Quét, bấm Áp dụng | Trang có chuyển tiếp đã chọn | PASS — hộp thoại đóng sau khi áp dụng; ảnh [tùy chọn chuyển tiếp](assets/q12-slides-2026-10-20/q12-18-transition-choices.png), [trở lại ribbon](assets/q12-slides-2026-10-20/q12-19-transition-applied.png) |
| 14 | Chuột | Thiết kế → Mẫu Slide Master → chọn Xanh Lá Thiên Nhiên → Áp dụng mẫu | Màu và kiểu chủ đạo đổi nhất quán | PASS — cả danh sách thu nhỏ và trang chiếu chuyển sang mẫu xanh; ảnh [mẫu đã áp dụng](assets/q12-slides-2026-10-20/q12-25-master-applied.png) |
| 15 | Chuột | Chèn → Hình ảnh, thử chọn ảnh từ tệp | Ảnh được thêm vào trang chiếu | PASS (Q14) — chọn PNG thật bằng `DOM.setFileInputFiles`; ảnh được nhúng và PowerPoint COM đọc thấy hình ảnh; ảnh Q12 [lượt thử chèn ảnh](assets/q12-slides-2026-10-20/q12-20-insert-image-attempt.png) |
| 16 | Bàn phím | Chọn trang 1 và nhấn F5 | Bắt đầu trình chiếu toàn màn hình | PASS — màn hình trình chiếu báo Trang 1 / 5; ảnh [bắt đầu trình chiếu](assets/q12-slides-2026-10-20/q12-21-slideshow-start.png) |
| 17 | Bàn phím | Nhấn mũi tên phải bốn lần | Đi đến trang 5 | PASS — màn hình báo Trang 5 / 5; ảnh [điều hướng trình chiếu](assets/q12-slides-2026-10-20/q12-22-slideshow-navigation.png) |
| 18 | Bàn phím | Nhấn Esc | Thoát trình chiếu về trình sửa | PASS — lớp trình chiếu biến mất; quay lại trình sửa |
| 19 | API adapter | Lưu nội dung PPTX bằng `save_document_in_place` (đường lưu trực tiếp Q14) | Có tệp PPTX được lưu | PASS (Q14) — `q14-five-slides.pptx` được tạo; ảnh Q12 [lượt lưu giao diện](assets/q12-slides-2026-10-20/q12-26-save-attempt.png) |
| 20 | Chuột | Tệp → Lưu thành (F12) | Chọn vị trí và tên tệp PPTX qua hộp thoại hệ điều hành | NOT RUN — Q14 dùng đường lưu trực tiếp qua adapter theo quy tắc phiếu, không mở hộp thoại hệ điều hành; PPTX đã được lưu ở bước 19 |
| 21 | Chuột | Xuất nội dung qua API chuẩn bị/in và đường dẫn PDF chỉ định | Tạo bản PDF | PASS (Q14) — API trả `status=ok`; PDF đầu ra đọc được 5 trang. Ảnh Q12 [kết quả xuất PDF giao diện](assets/q12-slides-2026-10-20/q12-31-pdf-export-result.png) |
| 22 | Chuột | Mở In, chờ bộ dựng trang | Xem trước in đủ năm trang | PASS — sau khoảng 15 giây trạng thái “Sẵn sàng in”, phạm vi “Tất cả (5 trang)”; ảnh [xem trước in](assets/q12-slides-2026-10-20/q12-33-print-preview-waited.png) |
| 23 | Chuột | Gửi PDF tới đường dẫn đích qua `print_document` | Có bản PDF đầu ra | PASS (Q14) — API trả `status=ok`; `fast_pdf_page_count` xác nhận 5 trang |
| 24 | Đối chiếu tệp | Mở lại PPTX đã lưu trong phiên mới | Năm trang, bảng, biểu đồ, ảnh, ghi chú, chuyển tiếp và hoạt hình còn nguyên | PASS (Q14) — phiên desktop mới đọc đủ 5 trang và các thành phần đã lưu |
| 25 | PowerPoint COM ẩn | Đọc PPTX bằng script readback ở chế độ chỉ đọc | Xác nhận nội dung và hiệu ứng trong tệp | PASS (Q14) — COM xác nhận bảng 4×3, biểu đồ, ảnh, ghi chú, EntryEffect=2817 và một hoạt hình trên trang 5 |

## Lỗi ghi nhận và sửa mã

Hai FAIL Q12 đã được xác minh là lỗi nhập liệu trong thao tác thử, không phải lỗi sản phẩm: giá trị ô trước khi bấm Chèn chưa được kiểm tra ở lượt Q12. Khi chọn hết nội dung đúng cách, CDP đọc được `4`/`3` và `Tiến độ triển khai`, kết quả bảng/biểu đồ đúng. Không sửa mã sản phẩm.

## Kiểm tra đầu ra

- Nhật ký Q12 sau đối chiếu Q14: 24 PASS, 0 FAIL, 1 NOT RUN (hộp thoại hệ điều hành Lưu thành không chạy).
- Tệp đầu ra Q14: `E:\VNOffice-profiles\q14-slides-final\q14-five-slides.pptx` (5 trang), `q14-five-slides.pdf` (5 trang); ảnh PNG nguồn thật được nhúng vào PPTX.
- `npm test` — PASS, 3770/3770.
- `node scripts/audit-0610/i18n_parity.mjs` — PASS, VI=3108, EN=3108, missing=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — PASS, 0 dòng bị hạ; Word 279, Excel 217, PowerPoint 269.
- `python -m pytest tests -q -k "slides or pptx"` — PASS, 152 passed, 947 deselected.
- PowerPoint COM ẩn, chỉ đọc: PASS — 5 trang; bảng 4×3; biểu đồ “Tiến độ triển khai”; có ảnh; ghi chú trang 4; EntryEffect=2817; một hiệu ứng hoạt hình trang 5.
- Không sửa source sản phẩm: hai FAIL Q12 do thao tác nhập; đã xác minh lại CDP 2/2 PASS nên không cần bài sửa lỗi FAIL-trước/PASS-sau.
