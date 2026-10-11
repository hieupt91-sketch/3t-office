"""Generate the Slides ribbon button comparison matrix from the scan JSON.

Usage: python -X utf8 scripts/audit-0610/gen_slides_button_matrix.py \
    docs/ribbon-scan-slides-1011.json docs/SLIDES-BUTTON-MATRIX-1011.md
"""
import json
import sys
from collections import Counter
from pathlib import Path


MATCH = "KHỚP POWERPOINT"
INTENTIONAL = "KHÁC CÓ CHỦ Ý"
KNOWN_GAP = "LỆCH ĐÃ BIẾT"
UNCHECKED = "CHƯA ĐỐI CHIẾU"

# Each entry is scoped to what the cited COM and app evidence actually measured.
# A result for one value/fixture is not generalized to the entire feature.
EVIDENCE = {
    "slides.slide.new": (MATCH, "FIX-L8: CDP bấm Trang mới, model tăng 10→11; PowerPoint COM đọc 11 slide trong PPTX đã lưu. [Ảnh](tickets-0710/evidence/fix-l8/home/slide-new.png), [COM](tickets-0710/evidence/fix-l8/home/slide-new-readback.json)"),
    "slides.slide.delete": (MATCH, "FIX-L8: CDP xóa trang mới vừa tạo; model giảm 11→10; PowerPoint COM đọc 10 slide trong PPTX đã lưu. [Ảnh](tickets-0710/evidence/fix-l8/home/slide-delete.png), [COM](tickets-0710/evidence/fix-l8/home/slide-delete-readback.json)"),
    "slides.para.alignLeft": (MATCH, "FIX-L8: CDP chọn Căn phải rồi bấm Căn trái; PowerPoint COM đọc Paragraph.Alignment=1 (left). [Ảnh](tickets-0710/evidence/fix-l8/home/align-left.png), [COM](tickets-0710/evidence/fix-l8/home/align-left-readback.json)"),
    "common.edit.cut": (MATCH, "FIX-L8: CDP bôi đen toàn văn bản, bấm Cắt; PowerPoint COM đọc lại văn bản rỗng và số shape giữ nguyên 5. Nút giữ focus vùng chữ trước lệnh cắt. [CDP](tickets-0710/evidence/fix-l8/home/clipboard-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/home/clipboard-cut-readback.json)"),
    "common.edit.copy": (MATCH, "FIX-L8: CDP bôi đen toàn văn bản, bấm Sao chép; clipboard cục bộ giữ đúng văn bản/HTML và vùng chọn còn nguyên. [CDP](tickets-0710/evidence/fix-l8/home/clipboard-cdp-readback.json)"),
    "common.edit.paste": (MATCH, "FIX-L8: CDP sao chép rồi dán vào vùng chữ đang chọn; nội dung được thay đúng trong textbox, không thêm shape. PowerPoint COM đọc lại nguyên văn và 5 shape. Đã bỏ marker CF_HTML trước khi chèn HTML. [CDP](tickets-0710/evidence/fix-l8/home/clipboard-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/home/clipboard-paste-readback.json)"),
    "common.edit.find": (MATCH, "FIX-L8: CDP tìm ROAD TRIP trong tiêu đề; model có matchIndex=10, matchLength=9. PowerPoint COM Find trả về đúng chuỗi ROAD TRIP trên PPTX đã lưu. [CDP](tickets-0710/evidence/fix-l8/home/find-replace-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/home/find-replace-readback.json)"),
    "common.edit.replace": (MATCH, "FIX-L8: CDP Thay thế tất cả Your Name→Presenter báo 2 lần thay; PowerPoint COM đọc shape 2 là Presenter • Sept 20XX. [CDP](tickets-0710/evidence/fix-l8/home/find-replace-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/home/find-replace-readback.json)"),
    "slides.color.highlight": (MATCH, "FIX-L8: CDP bôi đen tiêu đề và bấm Màu nền chữ; PowerPoint COM đọc Highlight.RGB=52735 so với baseline 1894392. [Ảnh](tickets-0710/evidence/fix-l8/home/highlight.png), [COM](tickets-0710/evidence/fix-l8/home/highlight-readback.json), [no-op](tickets-0710/evidence/fix-l8/home/noop-readback.json)"),
    "slides.font.family": (MATCH, "FIX-L4: chỉnh sửa văn bản trong deck thật; tập font hiển thị trước/sau qua PowerPoint COM đều là Calibri, Calibri Light. Alias Arial1 được unit test, không có trong deck nguồn. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.size": (MATCH, "FIX-L4: chuỗi đổi cỡ chữ trong app; PowerPoint COM đọc cỡ cuối 18 pt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.grow": (MATCH, "FIX-L4: app chạy thang 18→20→24→28→32→36 pt; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.shrink": (MATCH, "FIX-L4: app chạy thang giảm theo điểm chuẩn PowerPoint; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.text.bold": (MATCH, "FIX-L4: thao tác trong app; PowerPoint COM đọc Bold=true trên textbox audit. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.text.italic": (MATCH, "FIX-L7: CDP chọn toàn văn bản, bấm Nghiêng; COM đọc TextRange2.Font.Italic=-1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/italic.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.text.underline": (MATCH, "FIX-L7: CDP chọn toàn văn bản, bấm Gạch chân; COM đọc Font.Underline=-1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/underline.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.text.strike": (MATCH, "FIX-L7: CDP chọn toàn văn bản, bấm Gạch ngang; PowerPoint COM TextFrame2.Font.Strike=1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/strike.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.text.clearFormat": (MATCH, "FIX-L7: CDP bấm Đậm rồi Xóa định dạng; PowerPoint COM đọc Bold=0, Italic=0, Underline=0, Strike=0. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/clearFormat.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.color.text": (MATCH, "FIX-L7/FIX-L5: CDP áp màu chữ mặc định; PowerPoint COM đọc RGB=255. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/colorDefault.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.para.alignCenter": (MATCH, "FIX-L4: thao tác trong app; PowerPoint COM đọc Alignment=2 (center). [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.para.alignRight": (MATCH, "FIX-L7: CDP bấm Căn phải; PowerPoint COM đọc Paragraph.Alignment=3. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/alignRight.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.para.justify": (MATCH, "FIX-L7: CDP bấm Căn đều; PowerPoint COM đọc Paragraph.Alignment=4. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/alignJustify.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.para.indentInc": (MATCH, "FIX-L7 sửa: CDP tăng thụt lề; lưu PPTX, PowerPoint COM đọc LeftIndent=36 pt và IndentLevel=2. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/indentInc.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.para.indentDec": (MATCH, "FIX-L8: CDP tăng thụt lề rồi giảm thụt lề trên cùng vùng chữ; PowerPoint COM đọc lại TextFrame2.LeftIndent=0 pt, khớp baseline 0 pt, và 5 shape giữ nguyên. [CDP](tickets-0710/evidence/fix-l8/home/indent-dec-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/home/indent-dec-readback.json)"),
    "slides.list.bullet": (MATCH, "FIX-L7: CDP bật dấu đầu dòng; PowerPoint COM đọc Bullet.Visible=-1, Type=1. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/bullet.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.list.numbered": (MATCH, "FIX-L7: CDP bật đánh số; PowerPoint COM đọc Bullet.Visible=-1, Type=2. [Ảnh CDP](tickets-0710/evidence/fix-l7/text/numbered.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.shape.insert": (MATCH, "FIX-L6: chèn shape trong app, lưu/mở bằng PowerPoint; COM đọc shape cùng fill/line RGB, kích thước và rotation được đo. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.text.insert": (MATCH, "FIX-L6: chèn textbox trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng msoTextBox. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.image.insert": (MATCH, "FIX-L6: chèn ảnh trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng ảnh. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.table": (MATCH, "FIX-L6: chèn bảng trong app, lưu/mở bằng PowerPoint COM; đọc được bảng 3×3. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.headerFooter": (KNOWN_GAP, "FIX-L8: CDP áp dụng ngày, số trang chiếu và footer cho cả 10 slide; PowerPoint COM mở PPTX đã lưu vẫn đọc SlideNumber.Visible=0, DateAndTime.Visible=0, Footer.Visible=0. Ghi nhận để chủ sở hữu duyệt, chưa đổi semantics. [CDP](tickets-0710/evidence/fix-l8/insert/insert-fields-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/insert/insert-fields-readback.json)"),
    "slides.insert.dateTime": (KNOWN_GAP, "FIX-L8: CDP chọn định dạng ngày và áp dụng; model giữ showDate=true trên 10 slide, nhưng PowerPoint COM đọc DateAndTime.Visible=0 trong PPTX đã lưu. Ghi nhận để chủ sở hữu duyệt, chưa đổi semantics. [CDP](tickets-0710/evidence/fix-l8/insert/insert-fields-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/insert/insert-fields-readback.json)"),
    "slides.insert.slideNumber": (KNOWN_GAP, "FIX-L8: CDP áp dụng số trang chiếu cho 10 slide; model giữ showSlideNumber=true nhưng PowerPoint COM đọc SlideNumber.Visible=0 trong PPTX đã lưu. Ghi nhận để chủ sở hữu duyệt, chưa đổi semantics. [CDP](tickets-0710/evidence/fix-l8/insert/insert-fields-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/insert/insert-fields-readback.json)"),
    "slides.insert.wordart": (KNOWN_GAP, "FIX-L8: CDP thêm WordArt model `type=wordart` với preset ocean-gradient; PowerPoint COM mở PPTX dưới dạng Shape.Type=17 (TextBox), không phải native WordArt/TextEffect. Văn bản còn nguyên; ghi nhận để chủ sở hữu duyệt, chưa đổi semantics. [CDP](tickets-0710/evidence/fix-l8/insert/insert-art-symbol-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/insert/insert-art-symbol-readback.json)"),
    "slides.design.slideSize": (MATCH, "FIX-L8: CDP đổi Wide 16:9 sang Standard 4:3; PowerPoint COM đọc PageSetup=720×540 pt (25.4×19.05 cm) sau khi mở PPTX, cùng model. [CDP](tickets-0710/evidence/fix-l8/design/design-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/design/design-readback.json)"),
    "slides.design.formatBackground": (MATCH, "FIX-L8: CDP chọn nền gradient ngang (#1e3a8a→#ffffff); PowerPoint COM đọc Fill.Type=3 và RGB=9058846 (#1e3a8a) sau khi mở PPTX. [CDP](tickets-0710/evidence/fix-l8/design/design-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/design/design-readback.json)"),
    "slides.insert.chart": (MATCH, "FIX-L6: chèn chart trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng chart (ChartType 51). [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.symbol": (UNCHECKED, "FIX-L10: CDP bấm Ký hiệu và chọn ™ khi con trỏ ở cuối tiêu đề; text/model không đổi. PowerPoint COM mở PPTX đã lưu, đọc 10 slide/6 shape và không thấy ký tự này trong văn bản. Chưa kết luận parity cho các ký hiệu khác. [CDP](tickets-0710/evidence/fix-l10/insert/insert-art-symbol-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/insert/insert-art-symbol-readback.json)"),
    "slides.edit.formatPainter": (MATCH, "FIX-L10: CDP chọn toàn văn bản tiêu đề, bấm Sao chép định dạng rồi nhấp đúp vào phụ đề. App áp Oswald 48 pt, màu và highlight; PowerPoint COM đọc lại textbox đích là Oswald 48 pt, RGB/highlight khớp nguồn, với 10 slide/5 shape. [CDP](tickets-0710/evidence/fix-l10/home/format-painter-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/home/format-painter-readback.json)"),
    "slides.layout.reset": (UNCHECKED, "FIX-L6: CDP áp Hai nội dung rồi bấm Đặt lại; ảnh ghi nhận placeholder được dựng lại. Chưa có COM so sánh native `Slide.Layout` sau reset; hàng Bố cục có lệch native đã biết nên mục này vẫn chờ đối chiếu. [FIX-L6 ảnh](tickets-0710/evidence/fix-l6/layout-reset.png), [FIX-L6 kết quả](tickets-0710/FIX-L6-RESULTS.md)"),
    "slides.para.lineSpacing": (UNCHECKED, "FIX-L10: CDP chọn 1.0 trong Giãn dòng; PowerPoint COM đọc `SpaceWithin=1`, bằng baseline 1.0. Thao tác chỉ đo lựa chọn mặc định, chưa xác nhận mức giãn khác; giữ CHƯA ĐỐI CHIẾU. [CDP](tickets-0710/evidence/fix-l10/home/lineSpacing.png), [COM](tickets-0710/evidence/fix-l10/home/line-spacing-readback.json), [FIX-L7 log](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.diagram.insert": (KNOWN_GAP, "FIX-L6: sơ đồ tạo trong app mở thành bảy shape riêng trong PowerPoint, không phải đối tượng SmartArt native. Chưa so sánh các thao tác/chủng loại sơ đồ khác. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.design.themeGallery": (KNOWN_GAP, "FIX-L4 ghi nhận theme chọn trong app không giữ giá trị qua mở lại (`minimal-dark` thành `modern-blue`); FIX-L6 COM thấy Design.Name=Office. Native theme chưa được xác nhận. Không sửa semantics nếu chưa được duyệt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#ma-trận-fix-l4-mở-rộng), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.layout.apply": (KNOWN_GAP, "FIX-L6: Hai nội dung được lưu nhưng PowerPoint COM đọc Layout=1; fixture Two-Column Text đọc Layout=3. Thay native layout semantics cần quyết định chủ sở hữu trước. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.transition.apply": (KNOWN_GAP, "FIX-L4 xác nhận Push Right/0.8 s; FIX-L7 Fade lưu/mở lại và COM đọc EntryEffect=3849/0.5 s; FIX-L6 đo Zoom thành EntryEffect=3073 (BoxOut), nên riêng nhãn Zoom vẫn lệch/chưa xác định mapping. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo), [L7 CDP](tickets-0710/evidence/fix-l7/powerpoint-roundtrip-readback.json), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.animation.apply": (MATCH, "FIX-L6 sau sửa adapter: PowerPoint COM đọc lại Fade, Fade, Fly đúng thứ tự; EffectType 10,10,2, TriggerType=click, duration 0.8/0.8/0.5 s. Chưa suy rộng tới mọi preset. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.slide.toggleHidden": (MATCH, "FIX-L5/L6: ẩn slide qua lệnh app; PowerPoint COM đọc Hidden=-1 và PPTX có show=0. [FIX-L5 handoff](AGENT-HANDOFF-FIX-L5-CODEX.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.slide.duplicate": (MATCH, "FIX-L7: CDP nhân đôi slide, thêm textbox/shape và Fade; sau mở lại, PowerPoint COM đọc 11 slide, nội dung mới trên slide 2 và transition EntryEffect=3849/0.5 s. [Ảnh trước lưu](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-before-save.png), [Ảnh mở lại](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-after-open.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-roundtrip-readback.json)"),
    "slides.notes.toggle": (MATCH, "FIX-L4/L6: ghi chú diễn giả nhập qua app; PowerPoint COM đọc lại đúng nội dung. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.animation.pane": (MATCH, "FIX-L7: CDP mở Ngăn hoạt hình, đổi thứ tự hai hiệu ứng; PowerPoint COM đọc lại Fly In trước Fade In, đúng model sau thao tác. [Ảnh trước](tickets-0710/evidence/fix-l7/animation-pane-before-order.png), [Ảnh sau](tickets-0710/evidence/fix-l7/animation-pane-after-order.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-controls-readback.json)"),
    "slides.master.apply": (KNOWN_GAP, "FIX-L6: CDP áp dụng mẫu `minimal-dark`; PPTX giữ marker VNOfficeTheme nhưng PowerPoint COM `Design.Name` vẫn là Office. Native theme/master semantics khác; ghi nhận để chủ sở hữu duyệt, không sửa trong FIX-L10. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.show.startFromBegin": (UNCHECKED, "FIX-L10: CDP bấm Từ đầu; overlay bắt đầu ở trang 1/10. PowerPoint COM chỉ đọc lại file sau thao tác và không xác nhận trạng thái slideshow đang chạy. [CDP](tickets-0710/evidence/fix-l10/show/show-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/show/show-readback.json)"),
    "slides.show.startFromCurrent": (UNCHECKED, "FIX-L10: CDP chọn trang 2 rồi bấm Từ trang này; overlay bắt đầu ở trang 2/10. COM đọc file đã lưu nhưng không xác nhận vị trí slideshow tạm thời. [CDP](tickets-0710/evidence/fix-l10/show/show-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/show/show-readback.json)"),
    "slides.show.presenterMode": (UNCHECKED, "FIX-L10: CDP bấm Chế độ Presenter; `.vno-presenter-overlay` mở ở trang 2. COM đọc lại file nhưng không đối chiếu cửa sổ Presenter/đồng hồ. [CDP](tickets-0710/evidence/fix-l10/show/show-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/show/show-readback.json)"),
    "slides.show.setupShow": (MATCH, "FIX-L10: CDP bật `Lặp lại liên tục đến khi nhấn Esc` trong Thiết lập trình chiếu và lưu PPTX. PowerPoint COM đọc `SlideShowSettings.LoopUntilStopped=-1`; `ShowWithNarration=-1` khớp trạng thái không tắt thuyết minh. [CDP](tickets-0710/evidence/fix-l10/show/show-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/show/show-readback.json)"),
    "slides.show.rehearseTimings": (UNCHECKED, "FIX-L10: CDP bấm Tập dượt hẹn giờ; overlay chạy ở trang hiện tại. COM đọc lại file nhưng không xác nhận thời gian của từng slide sau tập dượt. [CDP](tickets-0710/evidence/fix-l10/show/show-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/show/show-readback.json)"),
    "slides.review.commentInsert": (MATCH, "FIX-L10: CDP tạo hai nhận xét ở tab Đánh giá. PowerPoint COM đọc 2 `Slide.Comments` với đúng tác giả/nội dung; hàng cùng ID ở tab Chèn dùng chung kết quả. [CDP](tickets-0710/evidence/fix-l10/review/comments-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/comments-readback.json)"),
    "slides.review.commentDelete": (MATCH, "FIX-L10: CDP xóa Beta sau khi lưu bản 2 nhận xét; PowerPoint COM đọc bản sau xóa còn đúng Alpha (1 nhận xét), 10 slide/5 shape. [CDP](tickets-0710/evidence/fix-l10/review/comments-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/comments-readback.json)"),
    "slides.review.commentNext": (UNCHECKED, "FIX-L10: CDP bấm Nhận xét sau và active ID chuyển sang Alpha. COM xác nhận hai nhận xét được lưu nhưng không đọc trạng thái điều hướng đang chọn; parity chế độ xem còn chờ. [CDP](tickets-0710/evidence/fix-l10/review/comments-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/comments-readback.json)"),
    "slides.review.commentPrevious": (UNCHECKED, "FIX-L10: CDP bấm Nhận xét trước và active ID chuyển sang Beta. COM xác nhận hai nhận xét được lưu nhưng không đọc trạng thái điều hướng đang chọn; parity chế độ xem còn chờ. [CDP](tickets-0710/evidence/fix-l10/review/comments-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/comments-readback.json)"),
    "slides.review.commentResolve": (UNCHECKED, "FIX-L10: CDP đánh dấu Beta `resolved=true` trong model sau khi bấm Đã xử lý. COM vẫn đọc comment/native text, nhưng đối tượng PowerPoint COM `Comment` không có thuộc tính resolved để so sánh; chưa khẳng định trạng thái đó lưu tương đương. [CDP](tickets-0710/evidence/fix-l10/review/comments-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/comments-readback.json)"),
    "slides.review.spellCheck": (UNCHECKED, "FIX-L10: CDP mở tab Đánh giá > Chính tả; hộp thoại hoàn tất kiểm tra trang hiện tại và đóng được bằng Esc. COM đọc lại 10 slide/5 shape, nhưng không chạy lệnh kiểm lỗi tương ứng để so sánh kết quả. [CDP](tickets-0710/evidence/fix-l10/review/spellcheck-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/spellcheck-readback.json)"),
    "slides.review.toggleSpellCheck": (UNCHECKED, "FIX-L10: CDP bấm Kiểm tra chính tả để chuyển `enabled=true→false→true`. COM đọc lại 10 slide/5 shape; gạch đỏ là trạng thái giao diện nên chưa có phép so sánh COM. [CDP](tickets-0710/evidence/fix-l10/review/spellcheck-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/review/spellcheck-readback.json)"),
    "slides.view.newWindow": (UNCHECKED, "FIX-L10: CDP bấm Cửa sổ mới; WebView2 page count giữ nguyên 1. COM đọc lại 10 slide/5 shape nhưng không so sánh cửa sổ PowerPoint mới; hành vi còn chờ đối chiếu. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-macro-readback.json)"),
    "common.macro.recordToggle": (UNCHECKED, "FIX-L10: CDP bật ghi, thực hiện một lần Phóng to, dừng và lưu macro `FIX-L10 Macro`; trạng thái ghi và một dòng macro được thấy trong UI. COM đọc PPTX 10 slide/5 shape, không có phép so sánh macro PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-macro-readback.json)"),
    "common.macro.manager": (UNCHECKED, "FIX-L10: CDP mở Quản lý Macro và thấy macro vừa lưu trong danh sách. COM đọc lại PPTX 10 slide/5 shape, không đối chiếu thư viện VBA của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-macro-readback.json)"),
    "slides.view.normal": (UNCHECKED, "FIX-L10: CDP bấm Bình thường sau Bộ sắp xếp và Chế độ đọc; model trở về `presentationView=normal`. COM đọc lại PPTX với 10 slide/5 shape; trạng thái xem tạm thời không được đối chiếu bằng COM. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.slideSorter": (UNCHECKED, "FIX-L10: CDP bấm Bộ sắp xếp; model chuyển `presentationView=slideSorter`, Escape trở về Bình thường. COM đọc lại PPTX với 10 slide/5 shape nhưng không xác nhận ViewType. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.reading": (UNCHECKED, "FIX-L10: CDP bấm Chế độ đọc; model chuyển `presentationView=reading`, Escape trở về Bình thường. COM đọc lại PPTX với 10 slide/5 shape nhưng không xác nhận chế độ xem. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.file.printPreview": (UNCHECKED, "FIX-L10: CDP mở Xem trước khi in, xác nhận hộp xem trước hiện rồi đóng bằng Escape. COM đọc lại PPTX với 10 slide/5 shape; chưa đối chiếu giao diện xem trước tương ứng trong PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.ruler": (UNCHECKED, "FIX-L10: CDP bật `ruler=true`, bấm lại trở về `false`. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái thước. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.gridlines": (UNCHECKED, "FIX-L10: CDP bật rồi tắt đường lưới; trạng thái model được ghi trong JSON. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái đường lưới. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.guides": (UNCHECKED, "FIX-L10: CDP bật rồi tắt đường hướng dẫn; trạng thái model được ghi trong JSON. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái đường hướng dẫn. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomIn": (UNCHECKED, "FIX-L10: CDP Phóng to đưa model từ 100% lên 110%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomOut": (UNCHECKED, "FIX-L10: CDP Thu nhỏ đưa model từ 110% về 100%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomReset": (UNCHECKED, "FIX-L10: CDP bấm 100%; model ở mức 100%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.fitToWindow": (UNCHECKED, "FIX-L10: CDP Vừa cửa sổ đưa model về 70% trên màn hình audit. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu kết quả theo kích thước cửa sổ PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.help.open": (UNCHECKED, "FIX-L10: CDP bấm Trợ giúp và xác nhận panel mở; COM đọc lại PPTX với 10 slide/5 shape nhưng không so sánh Help của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "common.help.about": (UNCHECKED, "FIX-L10: CDP bấm Giới thiệu và xác nhận hộp thoại mở; COM đọc lại PPTX với 10 slide/5 shape nhưng không so sánh About của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
}


def main():
    source, output = map(Path, sys.argv[1:3])
    rows = json.loads(source.read_text(encoding="utf-8"))
    result = []
    for row in rows:
        feature_id = row["id"]
        state, note = EVIDENCE.get(feature_id, (UNCHECKED, ""))
        if row["tab"].startswith("Trợ lý 3T AI"):
            state = INTENTIONAL
            note = "Lệnh AI là năng lực riêng của VN Office, không có lệnh tương ứng trực tiếp trong ribbon PowerPoint cơ bản; không chạy lệnh AI trong lượt audit tài liệu này."
        elif row.get("reaction", "").startswith("disabled"):
            note = (note + " " if note else "") + "Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint."
        elif row.get("reaction", "").startswith("skipped(dangerous)"):
            note = (note + " " if note else "") + "Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm."
        result.append((row["tab"], feature_id, row["label"], state, note))

    counts = Counter(row[3] for row in result)
    lines = [
        "# Slides: ma trận đối chiếu từng nút ribbon với PowerPoint (11/10/2026)",
        "",
        "Nguồn danh sách nút: [`ribbon-scan-slides-1011.json`](ribbon-scan-slides-1011.json). Ma trận giữ đủ từng dòng scan (kể cả ID xuất hiện ở nhiều tab); trạng thái chỉ áp dụng tới thuộc tính/kịch bản ghi trong bằng chứng.",
        "",
        f"Tổng: {len(result)} dòng. " + ", ".join(f"**{key}**: {value}" for key, value in counts.items()) + ".",
        "",
        f"- **{MATCH}**: thao tác VN Slides được thực hiện; PowerPoint COM đọc lại cùng thuộc tính và kết quả khớp.",
        f"- **{INTENTIONAL}**: khác biệt sản phẩm có chủ ý hoặc không có nút đối ứng; nêu rõ lý do.",
        f"- **{KNOWN_GAP}**: có lệch/giới hạn đã đo; không ngụ ý đã sửa.",
        f"- **{UNCHECKED}**: chưa có phép đo app + PowerPoint đủ để kết luận.",
        "",
        "Các kết quả kế thừa được giới hạn theo báo cáo FIX-L4/L5/L6; lỗi harness, kết quả unit test hoặc giá trị mặc định COM không được tính là xác minh parity.",
        "",
        "| Tab | Lệnh | Nút | Trạng thái | Bằng chứng / ghi chú |",
        "|---|---|---|---|---|",
    ]
    for tab, feature_id, label, state, note in result:
        label = label.replace("|", "\\|")
        note = note.replace("|", "\\|")
        lines.append(f"| {tab} | `{feature_id}` | {label} | {state} | {note} |")
    output.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {output}: {len(result)} rows; " + ", ".join(f"{key}={value}" for key, value in counts.items()))


if __name__ == "__main__":
    main()
