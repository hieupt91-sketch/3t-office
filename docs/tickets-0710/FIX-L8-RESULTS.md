# FIX-L8 — Tiếp tục đối chiếu ribbon VN Slides

## Nhóm đã hoàn tất

**Trang đầu — clipboard và màu nền chữ**

- CDP thao tác bằng chuột/phím thật trên bản sao `sample-3.pptx`; PowerPoint COM mở lại PPTX đã lưu để đọc nội dung, màu highlight và số shape.
- `common.edit.copy`, `common.edit.paste`, `common.edit.cut`: sửa việc ribbon làm mất focus vùng chữ. Làm sạch marker `StartFragment`/`EndFragment` của CF_HTML trước khi chèn. COM xác nhận dán giữ nguyên văn bản và 5 shape; cắt xóa văn bản nhưng giữ nguyên shape count.
- `slides.color.highlight`: PowerPoint COM đọc `Highlight.RGB=52735`; baseline đọc `1894392`.
- Ma trận đã cập nhật 4 nút trên. Các nút Trang đầu còn lại và những tab sau vẫn đang chờ đo.

## Kiểm tra

- `runSlidesClipboardTests`: PASS, 8/8.
- `tests/live/cdp/slides-fix-l8-clipboard.desktop.mjs`: PASS; bôi đen, Sao chép, Dán, Cắt, lưu PPTX và chụp ảnh qua CDP.
- `tests/live/cdp/slides-fix-l8-highlight.desktop.mjs`: PASS; áp highlight qua ribbon và lưu PPTX.
- PowerPoint COM readback cho clipboard Dán/Cắt và màu highlight: PASS; JSON UTF-8 không BOM trong `evidence/fix-l8/home/`.
- `npm test`, `python -m unittest discover -s tests`, ba CDP suite bắt buộc và encoding scan: NOT RUN trong commit nhóm này; sẽ chạy ở lượt xác minh cuối.

## Giới hạn đã biết

- Kết quả đo chỉ áp dụng cho nội dung văn bản được chọn trong fixture và màu highlight mặc định.
- Không thay đổi native layout, theme, SmartArt hoặc transition Zoom.
