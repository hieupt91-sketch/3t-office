# Slides: ma trận đối chiếu từng nút ribbon với PowerPoint (11/10/2026)

Nguồn danh sách nút: [`ribbon-scan-slides-1011.json`](ribbon-scan-slides-1011.json). Ma trận giữ đủ từng dòng scan (kể cả ID xuất hiện ở nhiều tab); trạng thái chỉ áp dụng tới thuộc tính/kịch bản ghi trong bằng chứng.

Tổng: 88 dòng. **CHƯA ĐỐI CHIẾU**: 52, **LỆCH ĐÃ BIẾT**: 4, **KHỚP POWERPOINT**: 30, **KHÁC CÓ CHỦ Ý**: 2.

- **KHỚP POWERPOINT**: thao tác VN Slides được thực hiện; PowerPoint COM đọc lại cùng thuộc tính và kết quả khớp.
- **KHÁC CÓ CHỦ Ý**: khác biệt sản phẩm có chủ ý hoặc không có nút đối ứng; nêu rõ lý do.
- **LỆCH ĐÃ BIẾT**: có lệch/giới hạn đã đo; không ngụ ý đã sửa.
- **CHƯA ĐỐI CHIẾU**: chưa có phép đo app + PowerPoint đủ để kết luận.

Các kết quả kế thừa được giới hạn theo báo cáo FIX-L4/L5/L6; lỗi harness, kết quả unit test hoặc giá trị mặc định COM không được tính là xác minh parity.

| Tab | Lệnh | Nút | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|---|
| Trang đầu | `common.edit.paste` | Dán (Ctrl+V) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `common.edit.cut` | Cắt (Ctrl+X) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `common.edit.copy` | Sao chép (Ctrl+C) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.edit.formatPainter` | Sao chép định dạng | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.slide.new` | Trang mới (Ctrl+M) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.layout.apply` | Bố cục | LỆCH ĐÃ BIẾT | FIX-L6: Hai nội dung được lưu nhưng PowerPoint COM đọc Layout=1; fixture Two-Column Text đọc Layout=3. Thay native layout semantics cần quyết định chủ sở hữu trước. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Trang đầu | `slides.slide.duplicate` | Nhân đôi (Ctrl+D) | KHỚP POWERPOINT | FIX-L7: CDP nhân đôi slide, thêm textbox/shape và Fade; sau mở lại, PowerPoint COM đọc 11 slide, nội dung mới trên slide 2 và transition EntryEffect=3849/0.5 s. [Ảnh trước lưu](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-before-save.png), [Ảnh mở lại](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-after-open.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-roundtrip-readback.json) |
| Trang đầu | `slides.slide.delete` | Xóa trang (Delete) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.layout.reset` | Đặt lại | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.font.family` | Phông chữ | KHỚP POWERPOINT | FIX-L4: chỉnh sửa văn bản trong deck thật; tập font hiển thị trước/sau qua PowerPoint COM đều là Calibri, Calibri Light. Alias Arial1 được unit test, không có trong deck nguồn. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.font.size` | Cỡ chữ | KHỚP POWERPOINT | FIX-L4: chuỗi đổi cỡ chữ trong app; PowerPoint COM đọc cỡ cuối 18 pt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.font.grow` | Tăng cỡ chữ | KHỚP POWERPOINT | FIX-L4: app chạy thang 18→20→24→28→32→36 pt; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.font.shrink` | Giảm cỡ chữ | KHỚP POWERPOINT | FIX-L4: app chạy thang giảm theo điểm chuẩn PowerPoint; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.text.bold` | Đậm (Ctrl+B) | KHỚP POWERPOINT | FIX-L4: thao tác trong app; PowerPoint COM đọc Bold=true trên textbox audit. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.text.italic` | Nghiêng (Ctrl+I) | KHỚP POWERPOINT | FIX-L7: CDP chọn toàn văn bản, bấm Nghiêng; COM đọc TextRange2.Font.Italic=-1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/italic.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.text.underline` | Gạch chân (Ctrl+U) | KHỚP POWERPOINT | FIX-L7: CDP chọn toàn văn bản, bấm Gạch chân; COM đọc Font.Underline=-1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/underline.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.text.strike` | Gạch ngang | KHỚP POWERPOINT | FIX-L7: CDP chọn toàn văn bản, bấm Gạch ngang; PowerPoint COM TextFrame2.Font.Strike=1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/strike.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.text.clearFormat` | Xóa định dạng | KHỚP POWERPOINT | FIX-L7: CDP bấm Đậm rồi Xóa định dạng; PowerPoint COM đọc Bold=0, Italic=0, Underline=0, Strike=0. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/clearFormat.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.color.text` | Màu chữ | KHỚP POWERPOINT | FIX-L7/FIX-L5: CDP áp màu chữ mặc định; PowerPoint COM đọc RGB=255. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/colorDefault.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.color.highlight` | Màu nền chữ | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.list.bullet` | Dấu đầu dòng | KHỚP POWERPOINT | FIX-L7: CDP bật dấu đầu dòng; PowerPoint COM đọc Bullet.Visible=-1, Type=1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/bullet.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.list.numbered` | Đánh số | KHỚP POWERPOINT | FIX-L7: CDP bật đánh số; PowerPoint COM đọc Bullet.Visible=-1, Type=2. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/numbered.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.para.indentDec` | Giảm thụt lề | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.para.indentInc` | Thụt lề | KHỚP POWERPOINT | FIX-L7 sửa: CDP tăng thụt lề; lưu PPTX, PowerPoint COM đọc LeftIndent=36 pt và IndentLevel=2. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/indentInc.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.para.lineSpacing` | Giãn dòng | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.para.alignLeft` | Căn trái (Ctrl+L) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `slides.para.alignCenter` | Căn giữa (Ctrl+E) | KHỚP POWERPOINT | FIX-L4: thao tác trong app; PowerPoint COM đọc Alignment=2 (center). [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo) |
| Trang đầu | `slides.para.alignRight` | Căn phải (Ctrl+R) | KHỚP POWERPOINT | FIX-L7: CDP bấm Căn phải; PowerPoint COM đọc Paragraph.Alignment=3. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/alignRight.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.para.justify` | Căn đều (Ctrl+J) | KHỚP POWERPOINT | FIX-L7: CDP bấm Căn đều; PowerPoint COM đọc Paragraph.Alignment=4. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/alignJustify.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json) |
| Trang đầu | `slides.text.insert` | Hộp văn bản | KHỚP POWERPOINT | FIX-L6: chèn textbox trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng msoTextBox. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Trang đầu | `slides.shape.insert` | Hình khối | KHỚP POWERPOINT | FIX-L6: chèn shape trong app, lưu/mở bằng PowerPoint; COM đọc shape cùng fill/line RGB, kích thước và rotation được đo. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Trang đầu | `slides.image.insert` | Hình ảnh | KHỚP POWERPOINT | FIX-L6: chèn ảnh trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng ảnh. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Trang đầu | `common.edit.find` | Tìm kiếm (Ctrl+F) | CHƯA ĐỐI CHIẾU |  |
| Trang đầu | `common.edit.replace` | Thay thế (Ctrl+H) | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.insert.table` | Bảng | KHỚP POWERPOINT | FIX-L6: chèn bảng trong app, lưu/mở bằng PowerPoint COM; đọc được bảng 3×3. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.image.insert` | Hình ảnh | KHỚP POWERPOINT | FIX-L6: chèn ảnh trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng ảnh. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.shape.insert` | Hình khối | KHỚP POWERPOINT | FIX-L6: chèn shape trong app, lưu/mở bằng PowerPoint; COM đọc shape cùng fill/line RGB, kích thước và rotation được đo. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.diagram.insert` | Sơ đồ | LỆCH ĐÃ BIẾT | FIX-L6: sơ đồ tạo trong app mở thành bảy shape riêng trong PowerPoint, không phải đối tượng SmartArt native. Chưa so sánh các thao tác/chủng loại sơ đồ khác. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.insert.chart` | Biểu đồ | KHỚP POWERPOINT | FIX-L6: chèn chart trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng chart (ChartType 51). [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.review.commentInsert` | Nhận xét mới | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.text.insert` | Hộp văn bản | KHỚP POWERPOINT | FIX-L6: chèn textbox trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng msoTextBox. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chèn | `slides.insert.wordart` | Chữ nghệ thuật | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.insert.headerFooter` | Đầu trang & Chân trang | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.insert.dateTime` | Ngày & Giờ | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.insert.slideNumber` | Số trang chiếu | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.insert.symbol` | Ký hiệu | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.media.insertVideo` | Video | CHƯA ĐỐI CHIẾU |  |
| Chèn | `slides.media.insertAudio` | Âm thanh | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `slides.design.themeGallery` | Chủ đề | LỆCH ĐÃ BIẾT | FIX-L4 ghi nhận theme chọn trong app không giữ giá trị qua mở lại (`minimal-dark` thành `modern-blue`); FIX-L6 COM thấy Design.Name=Office. Native theme chưa được xác nhận. Không sửa semantics nếu chưa được duyệt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#ma-trận-fix-l4-mở-rộng), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Thiết kế | `slides.master.apply` | Mẫu Slide Master | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `slides.design.slideSize` | Cỡ trang chiếu | CHƯA ĐỐI CHIẾU |  |
| Thiết kế | `slides.design.formatBackground` | Định dạng nền | CHƯA ĐỐI CHIẾU |  |
| Chuyển tiếp | `slides.transition.apply` | Chuyển tiếp | LỆCH ĐÃ BIẾT | FIX-L4 xác nhận Push Right/0.8 s; FIX-L7 Fade lưu/mở lại và COM đọc EntryEffect=3849/0.5 s; FIX-L6 đo Zoom thành EntryEffect=3073 (BoxOut), nên riêng nhãn Zoom vẫn lệch/chưa xác định mapping. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo), [L7 CDP](tickets-0710/evidence/fix-l7/powerpoint-roundtrip-readback.json), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Hoạt hình | `slides.animation.apply` | Hiệu ứng đối tượng | KHỚP POWERPOINT | FIX-L6 sau sửa adapter: PowerPoint COM đọc lại Fade, Fade, Fly đúng thứ tự; EffectType 10,10,2, TriggerType=click, duration 0.8/0.8/0.5 s. Chưa suy rộng tới mọi preset. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Hoạt hình | `slides.animation.pane` | Ngăn hoạt hình | KHỚP POWERPOINT | FIX-L7: CDP mở Ngăn hoạt hình, đổi thứ tự hai hiệu ứng; PowerPoint COM đọc lại Fly In trước Fade In, đúng model sau thao tác. [Ảnh trước](tickets-0710/evidence/fix-l7/animation-pane-before-order.png), [Ảnh sau](tickets-0710/evidence/fix-l7/animation-pane-after-order.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-controls-readback.json) |
| Trình chiếu | `slides.show.startFromBegin` | Từ đầu (F5) | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Trình chiếu | `slides.show.startFromCurrent` | Từ trang này (Shift+F5) | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Trình chiếu | `slides.show.presenterMode` | Chế độ Presenter (Alt+F5) | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Trình chiếu | `slides.show.setupShow` | Thiết lập trình chiếu | CHƯA ĐỐI CHIẾU |  |
| Trình chiếu | `slides.slide.toggleHidden` | Ẩn trang chiếu | KHỚP POWERPOINT | FIX-L5/L6: ẩn slide qua lệnh app; PowerPoint COM đọc Hidden=-1 và PPTX có show=0. [FIX-L5 handoff](AGENT-HANDOFF-FIX-L5-CODEX.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Trình chiếu | `slides.show.rehearseTimings` | Tập dượt hẹn giờ | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Trình chiếu | `slides.notes.toggle` | Ghi chú thuyết trình | KHỚP POWERPOINT | FIX-L4/L6: ghi chú diễn giả nhập qua app; PowerPoint COM đọc lại đúng nội dung. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Đánh giá | `slides.review.spellCheck` | Chính tả | CHƯA ĐỐI CHIẾU |  |
| Đánh giá | `slides.review.toggleSpellCheck` | Kiểm tra chính tả | CHƯA ĐỐI CHIẾU |  |
| Đánh giá | `slides.review.commentInsert` | Nhận xét mới | CHƯA ĐỐI CHIẾU |  |
| Đánh giá | `slides.review.commentDelete` | Xóa nhận xét | CHƯA ĐỐI CHIẾU | Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint. |
| Đánh giá | `slides.review.commentPrevious` | Nhận xét trước | CHƯA ĐỐI CHIẾU | Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint. |
| Đánh giá | `slides.review.commentNext` | Nhận xét sau | CHƯA ĐỐI CHIẾU | Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint. |
| Đánh giá | `slides.review.commentResolve` | Đã xử lý | CHƯA ĐỐI CHIẾU | Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint. |
| Chế độ xem | `slides.view.normal` | Bình thường | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.slideSorter` | Bộ sắp xếp trang | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.notes.toggle` | Ghi chú thuyết trình | KHỚP POWERPOINT | FIX-L4/L6: ghi chú diễn giả nhập qua app; PowerPoint COM đọc lại đúng nội dung. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra) |
| Chế độ xem | `slides.view.reading` | Chế độ đọc | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.file.printPreview` | Xem trước khi in (Ctrl+F2) | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Chế độ xem | `slides.view.ruler` | Thước | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.gridlines` | Đường lưới | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.guides` | Đường hướng dẫn | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.zoomIn` | Phóng to | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.zoomOut` | Thu nhỏ | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.zoomReset` | 100% | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.fitToWindow` | Vừa cửa sổ | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `slides.view.newWindow` | Cửa sổ mới | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Chế độ xem | `common.macro.recordToggle` | Ghi Macro (Ctrl+Shift+R) | CHƯA ĐỐI CHIẾU |  |
| Chế độ xem | `common.macro.manager` | Xem Macro (Alt+F8) | CHƯA ĐỐI CHIẾU |  |
| Trợ giúp | `slides.help.open` | Trợ giúp (F1) | CHƯA ĐỐI CHIẾU |  |
| Trợ giúp | `common.help.about` | Giới thiệu | CHƯA ĐỐI CHIẾU | Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm. |
| Trợ lý 3T AI | `ai.assistant.toggle` | Trợ lý 3T AI (Alt+J) | KHÁC CÓ CHỦ Ý | Lệnh AI là năng lực riêng của VN Office, không có lệnh tương ứng trực tiếp trong ribbon PowerPoint cơ bản; không chạy lệnh AI trong lượt audit tài liệu này. |
| Trợ lý 3T AI | `ai.assistant.summarize` | Tóm tắt nhanh | KHÁC CÓ CHỦ Ý | Lệnh AI là năng lực riêng của VN Office, không có lệnh tương ứng trực tiếp trong ribbon PowerPoint cơ bản; không chạy lệnh AI trong lượt audit tài liệu này. |
