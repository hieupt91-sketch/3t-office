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
- `slides.insert.headerFooter`, `slides.insert.dateTime`, `slides.insert.slideNumber`: CDP đặt model ngày/footer/số trang cho 10 slide, nhưng PPTX lưu mở bằng PowerPoint COM có cả ba thuộc tính native `Visible=0`. Ghi nhận để chủ sở hữu duyệt, không sửa ngữ nghĩa trong lượt audit.
- Ma trận hiện có 40 KHỚP POWERPOINT, 39 CHƯA ĐỐI CHIẾU, 7 LỆCH ĐÃ BIẾT và 2 KHÁC CÓ CHỦ Ý. Các nút Trang đầu còn lại và những tab sau vẫn đang chờ đo.

**Chế độ xem và Trợ giúp — thao tác UI đã ghi nhận, chưa tính parity**

- CDP xác nhận Bộ sắp xếp, trở về Bình thường, Chế độ đọc/Esc, Thước, Đường lưới, Đường hướng dẫn, các nút zoom, xem trước khi in, Trợ giúp và Giới thiệu mở/đóng hoặc đổi state dự kiến; bằng chứng trong `evidence/fix-l8/view/`.
- PowerPoint COM mở lại bản đã lưu và xác nhận deck còn 10 slide, 5 shape. Vì đây là view/UI state không được lưu vào PPTX, phép COM đó không chứng minh tương đương view state; các hàng tương ứng vẫn `CHƯA ĐỐI CHIẾU`.

## Kiểm tra

- `runSlidesClipboardTests`: PASS, 8/8.
- `tests/live/cdp/slides-fix-l8-clipboard.desktop.mjs`: PASS; bôi đen, Sao chép, Dán, Cắt, lưu PPTX và chụp ảnh qua CDP.
- `tests/live/cdp/slides-fix-l8-highlight.desktop.mjs`: PASS; áp highlight qua ribbon và lưu PPTX.
- PowerPoint COM readback cho clipboard Dán/Cắt và màu highlight: PASS; JSON UTF-8 không BOM trong `evidence/fix-l8/home/`.
- `npm test`: PASS, 3084/3084.
- `python -m unittest discover -s tests`: PASS, 874 tests (`OK`; có `ResourceWarning` unclosed file handles nhưng không có lỗi test).
- CDP bắt buộc: `claude-slides-roundtrip.desktop.mjs` PASS 8/8; `slides-fix-l2.desktop.mjs` PASS 20/20; `slides-fix-l3.desktop.mjs` PASS (13 hành vi; exit 0).
- Quét 42 file đã commit từ mốc nhánh: PASS, không có UTF-8 BOM/lỗi UTF-8; 14 ảnh là binary.

## Giới hạn đã biết

- Kết quả đo chỉ áp dụng cho nội dung văn bản được chọn trong fixture và màu highlight mặc định.
- Không thay đổi native layout, theme, SmartArt hoặc transition Zoom.
