# FIX-L8 — Tiếp tục đối chiếu ribbon VN Slides

## Nhóm đã hoàn tất

**Trang đầu — clipboard và màu nền chữ**

- CDP thao tác bằng chuột/phím thật trên bản sao `sample-3.pptx`; PowerPoint COM mở lại PPTX đã lưu để đọc nội dung, màu highlight và số shape.
- `common.edit.copy`, `common.edit.paste`, `common.edit.cut`: sửa việc ribbon làm mất focus vùng chữ. Làm sạch marker `StartFragment`/`EndFragment` của CF_HTML trước khi chèn. COM xác nhận dán giữ nguyên văn bản và 5 shape; cắt xóa văn bản nhưng giữ nguyên shape count.
- `slides.color.highlight`: PowerPoint COM đọc `Highlight.RGB=52735`; baseline đọc `1894392`.
- `slides.slide.new` / `slides.slide.delete`: CDP đo lần lượt 10→11→10; PowerPoint COM đọc lại 11 và 10 slide ở hai PPTX đã lưu.
- `slides.para.alignLeft`: CDP đặt Căn phải rồi Căn trái; COM đọc `Paragraph.Alignment=1` (left).
- `slides.para.indentDec`: CDP tăng rồi giảm thụt lề cùng vùng chữ; COM đọc lại `TextFrame2.LeftIndent=0 pt`, khớp baseline, số shape vẫn là 5.
- `common.edit.find` / `common.edit.replace`: CDP tìm `ROAD TRIP` tại vị trí 10, thay tất cả `Your Name` thành `Presenter` (2 lần); COM Find và đọc lại shape 2 cùng xác nhận.
- Ma trận hiện có 40 KHỚP POWERPOINT, 42 CHƯA ĐỐI CHIẾU, 4 LỆCH ĐÃ BIẾT và 2 KHÁC CÓ CHỦ Ý. Các nút Trang đầu còn lại và những tab sau vẫn đang chờ đo.

**Chế độ xem và Trợ giúp — thao tác UI đã ghi nhận, chưa tính parity**

- CDP xác nhận Bộ sắp xếp, trở về Bình thường, Chế độ đọc/Esc, Thước, Đường lưới, Đường hướng dẫn, các nút zoom, xem trước khi in, Trợ giúp và Giới thiệu mở/đóng hoặc đổi state dự kiến; bằng chứng trong `evidence/fix-l8/view/`.
- PowerPoint COM mở lại bản đã lưu và xác nhận deck còn 10 slide, 5 shape. Vì đây là view/UI state không được lưu vào PPTX, phép COM đó không chứng minh tương đương view state; các hàng tương ứng vẫn `CHƯA ĐỐI CHIẾU`.

## Kiểm tra

- `runSlidesClipboardTests`: PASS, 8/8.
- `tests/live/cdp/slides-fix-l8-clipboard.desktop.mjs`: PASS; bôi đen, Sao chép, Dán, Cắt, lưu PPTX và chụp ảnh qua CDP.
- `tests/live/cdp/slides-fix-l8-highlight.desktop.mjs`: PASS; áp highlight qua ribbon và lưu PPTX.
- PowerPoint COM readback cho clipboard Dán/Cắt và màu highlight: PASS; JSON UTF-8 không BOM trong `evidence/fix-l8/home/`.
- `npm test`, `python -m unittest discover -s tests`, ba CDP suite bắt buộc và encoding scan: NOT RUN trong commit nhóm này; sẽ chạy ở lượt xác minh cuối.

## Giới hạn đã biết

- Kết quả đo chỉ áp dụng cho nội dung văn bản được chọn trong fixture và màu highlight mặc định.
- Không thay đổi native layout, theme, SmartArt hoặc transition Zoom.
