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

## Q18 — Soạn thử 8 trang và kiểm tra tính năng còn mở (20/10/2026)

### Cách chạy và đầu ra

- CDP desktop được mở bằng `tests/live/cdp/session.mjs` (tiến trình ứng dụng gọi `main.py`), với `LOCALAPPDATA` riêng cho từng phiên. Bài chạy: `tests/live/cdp/slides-q18-verification.desktop.mjs`; không dùng SendKeys hay điều khiển OS.
- Tệp cuối: `E:\VNOffice-profiles\q18-slides-20261020-r5\q18-eight-slides.pptx`. Tạo 8 trang, lưu và mở lại trong các phiên mới giữa từng cụm. COM PowerPoint mở tệp ẩn, chỉ đọc bằng `tests/live/cdp/slides-q18-com-readback.ps1`.
- CDP Q18: 17/17 PASS. COM đọc được 8 trang; trang 5 có chuyển trang tự động sau 5 giây. COM chỉ thấy hai hiệu ứng trên trang 5; hiệu ứng nhấn mạnh (pulse) có trong mô hình trước khi lưu nhưng không xuất hiện khi đọc lại PPTX. Đây là lỗi round-trip còn mở.
- `ppt_animation_all_readback.ps1` cũng được thử, nhưng thất bại khi gọi `ActionSettings(1)` trên một shape không hỗ trợ thao tác đó. Đối chiếu chỉ đọc an toàn bằng script Q18 ở trên đã hoàn tất.

### Nhật ký thao tác CDP (tối thiểu 25 bước)

| # | Thao tác | Kết quả |
|---|---|---|
| 1 | Mở VN Slides qua `main.py`, profile riêng | PASS |
| 2 | Soạn trang bìa “VN Office: Kế hoạch năm” | PASS |
| 3 | Thêm bảy trang, tổng cộng tám trang | PASS |
| 4 | Nhập tiêu đề và nội dung từng trang | PASS |
| 5 | Áp dụng master màu xanh, font Arial | PASS ở mô hình và sau mở lại |
| 6 | Đặt màu nền, tiêu đề, nội dung và màu nhấn master | PASS ở mô hình |
| 7 | Bật ngày tháng, số trang và chân trang trên master | PASS ở mô hình và sau mở lại |
| 8 | Chọn bố cục tiêu đề/nội dung | PASS khi đặt; nhãn không khớp sau mở lại |
| 9 | Chọn bố cục hai cột, điền hai placeholder | PASS khi đặt; nhãn không khớp sau mở lại |
| 10 | Chọn bố cục trống | PASS khi đặt; PowerPoint COM báo tên mẫu `Standard` cho mọi trang |
| 11 | Lưu cụm master/bố cục thành PPTX | PASS |
| 12 | Mở PPTX trong phiên desktop mới, xác nhận tám trang và master/header-footer | PASS |
| 13 | Chèn quy trình ba nút có hai connector | PASS |
| 14 | Chèn ba hình bổ sung | PASS |
| 15 | Nhóm các hình đã chọn | PASS |
| 16 | Tách nhóm | PASS |
| 17 | Căn giữa ngang | PASS |
| 18 | Phân bố đều theo chiều ngang | PASS |
| 19 | Đưa xuống dưới cùng rồi đưa lên trên cùng | PASS |
| 20 | Ghi chú thuyết trình cho trang quy trình | PASS và còn sau mở lại |
| 21 | Ẩn trang 7 | PASS và còn sau mở lại |
| 22 | Đổi khổ 16:9 sang 4:3 | PASS |
| 23 | Đổi khổ 4:3 về 16:9 | PASS và còn sau mở lại |
| 24 | Đặt hiệu ứng vào Fly In, thời lượng 0,7 giây, kích hoạt theo nhấp | PASS trong mô hình; COM thấy hiệu ứng |
| 25 | Đặt nhấn mạnh Pulse sau hiệu ứng trước, 0,5 giây | PASS trong mô hình; FAIL khi đọc PPTX, hiệu ứng mất |
| 26 | Đặt hiệu ứng thoát Fade Out, 0,6 giây, trễ 0,1 giây | PASS trong mô hình và COM đọc thấy |
| 27 | Đặt thứ tự ba hoạt ảnh 1–3 | PASS trong mô hình; COM chỉ đọc hai hiệu ứng |
| 28 | Đặt chuyển trang Wipe và tự chuyển sau 5 giây | PASS; COM xác nhận `AdvanceTime=5` |
| 29 | Lưu và mở lại cụm hình/khổ trang trong phiên mới | PASS |
| 30 | Lưu và mở lại cụm hoạt ảnh/chuyển trang trong phiên mới | PASS tệp mở; hiệu ứng Pulse thiếu |
| 31 | Kiểm tra nút chèn video và âm thanh trên tab Chèn | PASS — có cả hai nút; chưa thử chèn tệp media |
| 32 | Mở rồi đóng chế độ trang ghi chú | PASS |
| 33 | F5 để bắt đầu, mũi tên phải sang trang tiếp, Esc để thoát | PASS |
| 34 | Mở xem trước khi in và đếm trang | PASS — trang ẩn được loại nên còn 7 trang |

### கண்டறிந்த வரம்புகள்

- **FAIL — hoạt ảnh nhấn mạnh mất sau round-trip PPTX.** CDP model chứa 3 hiệu ứng theo thứ tự với `flyIn` (700 ms), `pulse` (500 ms), `fadeOut` (600 ms, trễ 100 ms). Sau lưu/mở, COM chỉ thấy hai hiệu ứng; Pulse không còn. Chưa sửa mã sản phẩm trong Q18.
- **NOT RUN — in 3 slide/trang và handout.** UI xem trước hiện có một slide trên mỗi trang; `computePrintPages()` trả 7 trang khi một slide bị ẩn. Không thấy tùy chọn 3 slide/trang hoặc handout ở màn hình in hiện hữu.
- **PARTIAL — ba bố cục tùy chỉnh.** Đổi bố cục trong mô hình thành `title-content`, `two-content`, `blank` được chấp nhận, nhưng sau round-trip các nhãn đọc lại là `blank`, `blank`, `title-content`; PowerPoint COM gán `Standard` cho cả tám trang. Chưa xác minh qua thao tác chọn từng layout card trên ribbon.
- Nút Video và Âm thanh có mặt trên tab Chèn; chưa có media fixture trong bài nên không chèn nội dung media.

### Phạm vi mã và kiểm tra

- Thêm hai bài kiểm tra Q18 trong `tests/live/cdp/`; không sửa source sản phẩm, Help hay i18n.
- Q18 CDP — PASS, 17/17. PowerPoint COM readback — PASS, 8 trang, 2 hiệu ứng, chuyển trang 5 giây. `ppt_animation_all_readback.ps1` — FAIL do `ActionSettings(1)` không hợp lệ trên một shape.
- `node tests/run-tests.js` — PASS, 3771/3771.
- `node scripts/audit-0610/i18n_parity.mjs` — PASS, VI=3110, EN=3110, missing=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — PASS, 0 dòng bị hạ.
- `python -m pytest tests -q -k "slides or pptx"` — PASS, 152 passed, 949 deselected.
- Cổng repo (npm test, i18n parity, checklist evidence, pytest) được chạy/ghi bên dưới sau khi hoàn tất.
