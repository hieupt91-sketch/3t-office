# Rà soát từng nút ribbon VN Slides (13/10)

Công cụ: `tests/live/cdp/slides-ribbon-runtime-audit.desktop.mjs` (chạy mọi lệnh ribbon trong app desktop, so sánh DOM và thông báo) và `slides-ribbon-state-probe.desktop.mjs` (so sánh trạng thái bài trình bày chi tiết). `scripts/audit-0610/ribbon_command_audit.mjs slides` kiểm tra tĩnh lệnh nào chưa có handler.

Kết quả: 111 lệnh ribbon duy nhất; 0 lệnh thiếu handler; 3 lệnh bỏ qua có chủ đích (in/macro); 8 lệnh bị vô hiệu hóa có chủ đích (chưa có phần để đổi tên/xóa/di chuyển, chưa có nhận xét để xóa/chuyển tiếp/giải quyết); 0 lệnh ném ngoại lệ (THREW = 0); 0 nút im lặng còn lại (SILENT_FALSE = 0).

## Các nút đã được sửa để không còn im lặng (trả false phải có thông báo lý do)

| Nhóm chức năng / Lệnh | Trước | Sau |
|---|---|---|
| Sắp xếp thứ tự lớp hình khối (Lên đầu, Lên trên, Xuống dưới, Về cuối) | im lặng khi chưa chọn hình | thông báo lý do: Hãy chọn ít nhất một hình khối để sắp xếp thứ tự hiển thị |
| Căn lề hình khối (Trái, Giữa, Phải, Trên, Giữa dọc, Dưới) | im lặng khi chưa đủ hình chọn | thông báo lý do: Hãy chọn ít nhất hai hình khối (hoặc bật Căn theo trang) để căn lề |
| Phân phối đều khoảng cách hình khối (Ngang, Dọc) | im lặng khi chưa đủ hình chọn | thông báo lý do: Hãy chọn từ ba hình khối trở lên (hoặc hai hình khối khi căn theo trang) để phân phối |
| Nhóm / Bỏ nhóm hình khối (`slides.shape.group`, `slides.shape.ungroup`) | im lặng khi chưa đủ hình hoặc chưa chọn nhóm | thông báo lý do chọn từ hai hình khối / chọn một nhóm hình khối |
| Căn lề dọc khung chữ (`slides.text.vAlign`, Top, Middle, Bottom) | im lặng khi chưa chọn khung chữ/hình | thông báo lý do: Hãy chọn khung chữ hoặc hình khối có văn bản cần căn lề dọc |
| Xoay hướng chữ (`slides.text.direction`, Ngang, 90°, 270°, Xếp chồng) | im lặng khi chưa chọn khung chữ/hình | thông báo lý do: Hãy chọn khung chữ hoặc hình khối có văn bản cần xoay hướng chữ |
| Xóa trang chiếu (`slides.slide.delete`) | im lặng khi chỉ còn 1 trang | thông báo lý do: Bài trình bày cần có ít nhất một trang chiếu |
| Thao tác Phần slide (Đổi tên, Xóa, Di chuyển lên/xuống) | im lặng khi trang chưa thuộc phần nào | thông báo lý do trang chiếu hiện tại chưa thuộc phần nào |
| Thao tác Nhận xét (Xóa, Giải quyết, Trước, Sau) | im lặng khi bài chưa có nhận xét | thông báo lý do bài trình bày chưa có nhận xét / chưa chọn nhận xét |
| Định dạng chữ & đoạn (Đậm, Nghiêng, Gạch chân, Gạch ngang, Dấu đầu dòng, Đánh số, Căn lề, Thụt lề, Màu sắc) | trả false khi bỏ định dạng hoặc đổi căn lề | trả true thành công, cập nhật trạng thái UI và thuộc tính |
| Bật/tắt kiểm tra chính tả (`slides.review.toggleSpellCheck`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Thước đo / Đường lưới / Đường gióng (`slides.view.ruler/gridlines/guides`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Ngăn ghi chú (`slides.notes.toggle`) | trả false khi đóng | trả true, hiển thị thông báo trên thanh trạng thái |
| Ngăn hoạt hình (`slides.animation.pane`) | trả false khi đóng | trả true, hiển thị thông báo trên thanh trạng thái |
| Bật/tắt căn theo trang chiếu (`slides.arrange.alignToSlide`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Sao chép định dạng (`slides.edit.formatPainter`) | im lặng khi chưa có nguồn định dạng | thông báo lý do chọn hình khối/văn bản cần sao chép; thông báo khi hủy |
| Cửa sổ mới (`slides.view.newWindow`) | không có thông báo khi bị chặn | thông báo lý do khi không mở được trong app desktop |
| Đặt lại bố cục (`slides.layout.reset`) | thiếu handler nối Command Bus | đã nối handler và ánh xạ chuẩn UNO `.uno:RestoreDefaultLayout` |

## Còn thiếu thật (cần làm tiếp, không phải chỉ thông báo)
- **Cửa sổ mới (View > New Window)**: App desktop cần API mở cửa sổ thứ hai cùng xem một bài trình bày đang mở (multi-window sync view) — đã ghi vào `docs/RIBBON-BACKLOG.md`.

## Danh sách toàn bộ 111 lệnh ribbon

| Tab | Nhóm | Lệnh | Kết quả |
|---|---|---|---|
| home | clipboard | common.edit.paste | OK |
| home | clipboard | common.edit.cut | OK |
| home | clipboard | common.edit.copy | OK |
| home | clipboard | slides.edit.formatPainter | OK |
| home | slides | slides.slide.new | OK |
| home | slides | slides.layout.apply | OK |
| home | slides | slides.slide.duplicate | OK |
| home | slides | slides.slide.delete | OK |
| home | slides | slides.layout.reset | OK |
| home | slides | slides.section.add | OK |
| home | slides | slides.section.rename | DISABLED |
| home | slides | slides.section.remove | DISABLED |
| home | slides | slides.section.moveUp | DISABLED |
| home | slides | slides.section.moveDown | DISABLED |
| home | font | slides.font.family | OK |
| home | font | slides.font.size | OK |
| home | font | slides.font.grow | OK |
| home | font | slides.font.shrink | OK |
| home | font | slides.text.bold | OK |
| home | font | slides.text.italic | OK |
| home | font | slides.text.underline | OK |
| home | font | slides.text.strike | OK |
| home | font | slides.text.clearFormat | OK |
| home | font | slides.color.text | OK |
| home | font | slides.color.highlight | OK |
| home | paragraph | slides.list.bullet | OK |
| home | paragraph | slides.list.numbered | OK |
| home | paragraph | slides.para.indentDec | OK |
| home | paragraph | slides.para.indentInc | OK |
| home | paragraph | slides.para.lineSpacing | OK |
| home | paragraph | slides.para.alignLeft | OK |
| home | paragraph | slides.para.alignCenter | OK |
| home | paragraph | slides.para.alignRight | OK |
| home | paragraph | slides.para.justify | OK |
| home | paragraph | slides.text.vAlignTop | chỉ thông báo |
| home | paragraph | slides.text.vAlignMiddle | chỉ thông báo |
| home | paragraph | slides.text.vAlignBottom | chỉ thông báo |
| home | paragraph | slides.text.directionHorizontal | chỉ thông báo |
| home | paragraph | slides.text.directionVertical | chỉ thông báo |
| home | paragraph | slides.text.directionVertical270 | chỉ thông báo |
| home | paragraph | slides.text.directionStacked | chỉ thông báo |
| home | drawing | slides.text.insert | OK |
| home | drawing | slides.shape.insert | OK |
| home | drawing | slides.image.insert | OK |
| home | drawing | slides.arrange.bringToFront | chỉ thông báo |
| home | drawing | slides.arrange.bringForward | chỉ thông báo |
| home | drawing | slides.arrange.sendBackward | OK |
| home | drawing | slides.arrange.sendToBack | chỉ thông báo |
| home | drawing | slides.arrange.alignLeft | chỉ thông báo |
| home | drawing | slides.arrange.alignCenter | chỉ thông báo |
| home | drawing | slides.arrange.alignRight | chỉ thông báo |
| home | drawing | slides.arrange.alignTop | chỉ thông báo |
| home | drawing | slides.arrange.alignMiddle | chỉ thông báo |
| home | drawing | slides.arrange.alignBottom | chỉ thông báo |
| home | drawing | slides.arrange.distributeHorizontal | chỉ thông báo |
| home | drawing | slides.arrange.distributeVertical | chỉ thông báo |
| home | drawing | slides.arrange.alignToSlide | OK |
| home | drawing | slides.shape.group | chỉ thông báo |
| home | drawing | slides.shape.ungroup | chỉ thông báo |
| home | editing | common.edit.find | OK |
| home | editing | common.edit.replace | OK |
| home | editing | slides.edit.selectAll | OK |
| home | editing | slides.edit.selectObjects | OK |
| insert | tables | slides.insert.table | OK |
| insert | illustrations | slides.diagram.insert | OK |
| insert | illustrations | slides.insert.chart | OK |
| insert | comments | slides.review.commentInsert | OK |
| insert | text | slides.insert.wordart | OK |
| insert | text | slides.insert.headerFooter | OK |
| insert | text | slides.insert.dateTime | OK |
| insert | text | slides.insert.slideNumber | OK |
| insert | symbols | slides.insert.symbol | OK |
| insert | media | slides.media.insertVideo | OK |
| insert | media | slides.media.insertAudio | OK |
| design | themes | slides.design.themeGallery | OK |
| design | master | slides.master.apply | OK |
| design | customize | slides.design.slideSize | OK |
| design | customize | slides.design.formatBackground | OK |
| transitions | transitions | slides.transition.apply | OK |
| animations | animations | slides.animation.apply | OK |
| animations | animations | slides.animation.pane | OK |
| slideshow | startSlideshow | slides.show.startFromBegin | OK |
| slideshow | startSlideshow | slides.show.startFromCurrent | OK |
| slideshow | startSlideshow | slides.show.presenterMode | OK |
| slideshow | setup | slides.show.setupShow | OK |
| slideshow | setup | slides.slide.toggleHidden | OK |
| slideshow | setup | slides.show.rehearseTimings | OK |
| slideshow | presenter | slides.notes.toggle | OK |
| review | proofing | slides.review.spellCheck | OK |
| review | proofing | slides.review.toggleSpellCheck | OK |
| review | comments | slides.review.commentDelete | DISABLED |
| review | comments | slides.review.commentPrevious | DISABLED |
| review | comments | slides.review.commentNext | DISABLED |
| review | comments | slides.review.commentResolve | DISABLED |
| view | presentationViews | slides.view.normal | OK |
| view | presentationViews | slides.view.slideSorter | OK |
| view | presentationViews | slides.view.reading | OK |
| view | presentationViews | slides.file.printPreview | SKIPPED |
| view | show | slides.view.ruler | OK |
| view | show | slides.view.gridlines | OK |
| view | show | slides.view.guides | OK |
| view | zoom | slides.view.zoomIn | OK |
| view | zoom | slides.view.zoomOut | OK |
| view | zoom | slides.view.zoomReset | OK |
| view | zoom | slides.view.fitToWindow | OK |
| view | window | slides.view.newWindow | chỉ thông báo |
| view | macro | common.macro.recordToggle | SKIPPED |
| view | macro | common.macro.manager | SKIPPED |
| help | undefined | slides.help.open | OK |
| ai | undefined | ai.assistant.toggle | OK |
| ai | undefined | ai.assistant.summarize | OK |
