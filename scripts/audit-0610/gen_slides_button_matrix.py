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
    "slides.insert.headerFooter": (MATCH, "FIX-L12: CDP bật ngày, số trang và footer chỉ cho trang 3; COM mở PPTX đọc SlideNumber.Visible=-1, DateAndTime.Visible=-1, Footer.Visible=-1 cùng chữ footer. Trang 1–2 giữ cả ba Visible=0. [L9 CDP](tickets-0710/evidence/fix-l12/cdp-fix-l9.json), [COM](tickets-0710/evidence/fix-l12/fix-l9-com-readback.json)"),
    "slides.insert.dateTime": (MATCH, "FIX-L12: CDP chọn dd/MM/yyyy cho riêng trang 3; COM đọc DateAndTime.Visible=-1, Format=14, ngày hiển thị 12/10/2026. Hai trang còn lại không có placeholder ngày. [L9 CDP](tickets-0710/evidence/fix-l12/cdp-fix-l9.json), [COM](tickets-0710/evidence/fix-l12/fix-l9-com-readback.json)"),
    "slides.insert.slideNumber": (MATCH, "FIX-L12: CDP bật số trang cho riêng trang 3; COM đọc SlideNumber.Visible=-1 và placeholder tự hiển thị số `3`. Trang 1–2 không bị thêm trường. [L9 CDP](tickets-0710/evidence/fix-l12/cdp-fix-l9.json), [COM](tickets-0710/evidence/fix-l12/fix-l9-com-readback.json)"),
    "slides.insert.wordart": (KNOWN_GAP, "FIX-L8: CDP thêm WordArt model `type=wordart` với preset ocean-gradient; PowerPoint COM mở PPTX dưới dạng Shape.Type=17 (TextBox), không phải native WordArt/TextEffect. Văn bản còn nguyên; ghi nhận để chủ sở hữu duyệt, chưa đổi semantics. [CDP](tickets-0710/evidence/fix-l8/insert/insert-art-symbol-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/insert/insert-art-symbol-readback.json)"),
    "slides.design.slideSize": (MATCH, "FIX-L8: CDP đổi Wide 16:9 sang Standard 4:3; PowerPoint COM đọc PageSetup=720×540 pt (25.4×19.05 cm) sau khi mở PPTX, cùng model. [CDP](tickets-0710/evidence/fix-l8/design/design-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/design/design-readback.json)"),
    "slides.design.formatBackground": (MATCH, "FIX-L8: CDP chọn nền gradient ngang (#1e3a8a→#ffffff); PowerPoint COM đọc Fill.Type=3 và RGB=9058846 (#1e3a8a) sau khi mở PPTX. [CDP](tickets-0710/evidence/fix-l8/design/design-cdp-readback.json), [COM](tickets-0710/evidence/fix-l8/design/design-readback.json)"),
    "slides.insert.chart": (MATCH, "FIX-L6: chèn chart trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng chart (ChartType 51). [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.symbol": (MATCH, "FIX-L12: nhấp ™ trong bộ chọn ký hiệu khi WordArt đang chọn; model và PPTX giữ nguyên văn bản kèm ™. PowerPoint COM đọc lại ký tự trong nội dung shape sau khi mở file đã lưu. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json)"),
    "slides.media.insertVideo": (MATCH, "FIX-L12: chọn tệp video bằng input của app qua CDP, lưu PPTX; PowerPoint COM đọc shape Type=16 (Media), MediaType=3 (video). [CDP](tickets-0710/evidence/fix-l12/cdp-media.json), [COM](tickets-0710/evidence/fix-l12/fix-l10-media-com-readback.json)"),
    "slides.media.insertAudio": (MATCH, "FIX-L12: chọn tệp âm thanh bằng input của app qua CDP, lưu PPTX; PowerPoint COM đọc shape Type=16 (Media), MediaType=2 (audio). [CDP](tickets-0710/evidence/fix-l12/cdp-media.json), [COM](tickets-0710/evidence/fix-l12/fix-l10-media-com-readback.json)"),
    "slides.edit.formatPainter": (MATCH, "FIX-L10: CDP chọn toàn văn bản tiêu đề, bấm Sao chép định dạng rồi nhấp đúp vào phụ đề. App áp Oswald 48 pt, màu và highlight; PowerPoint COM đọc lại textbox đích là Oswald 48 pt, RGB/highlight khớp nguồn, với 10 slide/5 shape. [CDP](tickets-0710/evidence/fix-l10/home/format-painter-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/home/format-painter-readback.json)"),
    "slides.layout.reset": (MATCH, "FIX-L12: sau khi áp Hai nội dung, bấm Đặt lại trong ribbon; model vẫn ở `two-content`, PowerPoint COM đọc Layout=3 và ba placeholder. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json)"),
    "slides.para.lineSpacing": (UNCHECKED, "FIX-L10: CDP chọn 1.0 trong Giãn dòng; PowerPoint COM đọc `SpaceWithin=1`, bằng baseline 1.0. Thao tác chỉ đo lựa chọn mặc định, chưa xác nhận mức giãn khác; giữ CHƯA ĐỐI CHIẾU. [CDP](tickets-0710/evidence/fix-l10/home/lineSpacing.png), [COM](tickets-0710/evidence/fix-l10/home/line-spacing-readback.json), [FIX-L7 log](tickets-0710/evidence/fix-l7/powerpoint-text-readback.json)"),
    "slides.diagram.insert": (INTENTIONAL, "FIX-L12: sơ đồ tạo thành nhóm 7 shape; CDP chọn cả nhóm bằng cách nhấp một node và kéo cả cụm, COM đọc Shape.Type=6/GroupItems.Count=7 sau lưu. SmartArt native không có mô hình tạo trong luồng ODF của LibreOffice Impress; tạo đối tượng đó cần các DrawingML diagram data/layout/style parts và relationships riêng. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json), [giới hạn](tickets-0710/evidence/fix-l12/smartart-com-readback.json)"),
    "slides.design.themeGallery": (MATCH, "FIX-L12: chọn `minimal-dark`; sau mở PPTX, PowerPoint COM đọc Design.Name=`Than Chì Hiện Đại`, Major/Minor font `system-ui` (fallback DejaVu Sans), và theme scheme có các màu #CBD5E1/#0F172A/#F8FAFC/#38BDF8 phù hợp mẫu. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json)"),
    "slides.layout.apply": (MATCH, "FIX-L12: áp Hai nội dung từ ribbon, sau lưu PowerPoint COM đọc `Slide.Layout=3`; bố cục và ba placeholder tiếp tục còn sau lệnh Đặt lại. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json)"),
    "slides.transition.apply": (KNOWN_GAP, "FIX-L12: app ghi `<p:zoom dir="out"/>` và COM đọc `EntryEffect=3073` (`ppEffectBoxOut`). COM thử các enum `ppEffectZoomIn/Out/Center` (3345–3350) đều từ chối vì không hợp lệ cho `EntryEffect`; chưa có enum COM khác được chấp nhận để thay mapping. Các hiệu ứng Fade/Push đã được đối chiếu riêng. [CDP+XML](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json), [enum probe](tickets-0710/evidence/fix-l12/transition-enum-com.json)"),
    "slides.animation.apply": (MATCH, "FIX-L6 sau sửa adapter: PowerPoint COM đọc lại Fade, Fade, Fly đúng thứ tự; EffectType 10,10,2, TriggerType=click, duration 0.8/0.8/0.5 s. Chưa suy rộng tới mọi preset. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.slide.toggleHidden": (MATCH, "FIX-L5/L6: ẩn slide qua lệnh app; PowerPoint COM đọc Hidden=-1 và PPTX có show=0. [FIX-L5 handoff](AGENT-HANDOFF-FIX-L5-CODEX.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.slide.duplicate": (MATCH, "FIX-L7: CDP nhân đôi slide, thêm textbox/shape và Fade; sau mở lại, PowerPoint COM đọc 11 slide, nội dung mới trên slide 2 và transition EntryEffect=3849/0.5 s. [Ảnh trước lưu](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-before-save.png), [Ảnh mở lại](tickets-0710/evidence/fix-l7/fix-l7-roundtrip-after-open.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-roundtrip-readback.json)"),
    "slides.notes.toggle": (MATCH, "FIX-L4/L6: ghi chú diễn giả nhập qua app; PowerPoint COM đọc lại đúng nội dung. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.animation.pane": (MATCH, "FIX-L7: CDP mở Ngăn hoạt hình, đổi thứ tự hai hiệu ứng; PowerPoint COM đọc lại Fly In trước Fade In, đúng model sau thao tác. [Ảnh trước](tickets-0710/evidence/fix-l7/animation-pane-before-order.png), [Ảnh sau](tickets-0710/evidence/fix-l7/animation-pane-after-order.png), [COM](tickets-0710/evidence/fix-l7/powerpoint-controls-readback.json)"),
    "slides.master.apply": (MATCH, "FIX-L12: qua hộp Mẫu Slide Master chọn Than Chì Hiện Đại; PowerPoint COM mở PPTX đọc đúng Design.Name, theme palette và font scheme. [CDP](tickets-0710/evidence/fix-l12/office-compare-cdp.json), [COM](tickets-0710/evidence/fix-l12/office-compare-com-readback.json)"),
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
    "slides.view.newWindow": (INTENTIONAL, "FIX-L12: lệnh mở URL bản trình chiếu trong cửa sổ WebView mới; profile desktop giữ một cửa sổ và lệnh báo khi host chặn popup. Luồng mở thêm tài liệu desktop dùng cửa sổ ứng dụng riêng, không nhân đôi cùng một deck như PowerPoint Window > New Window. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json)"),
    "common.macro.recordToggle": (INTENTIONAL, "FIX-L12: bộ ghi lưu lệnh VN Slides thành macro cục bộ của ứng dụng; không ghi VBA project vào PPTX và không chạy mã VBA trong PowerPoint. CDP xác nhận bật ghi, ghi lệnh Phóng to, dừng và thấy macro trong danh sách. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json)"),
    "common.macro.manager": (INTENTIONAL, "FIX-L12: Quản lý Macro liệt kê các macro cục bộ của VN Office; không quản lý thư viện VBA của PowerPoint. CDP mở danh sách và thấy macro vừa ghi trong ứng dụng. [CDP](tickets-0710/evidence/fix-l10/view/view-macro-cdp-readback.json)"),
    "slides.view.normal": (UNCHECKED, "FIX-L10: CDP bấm Bình thường sau Bộ sắp xếp và Chế độ đọc; model trở về `presentationView=normal`. COM đọc lại PPTX với 10 slide/5 shape; trạng thái xem tạm thời không được đối chiếu bằng COM. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.slideSorter": (UNCHECKED, "FIX-L10: CDP bấm Bộ sắp xếp; model chuyển `presentationView=slideSorter`, Escape trở về Bình thường. COM đọc lại PPTX với 10 slide/5 shape nhưng không xác nhận ViewType. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.reading": (UNCHECKED, "FIX-L10: CDP bấm Chế độ đọc; model chuyển `presentationView=reading`, Escape trở về Bình thường. COM đọc lại PPTX với 10 slide/5 shape nhưng không xác nhận chế độ xem. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.file.printPreview": (INTENTIONAL, "FIX-L12: app mở lớp xem trước in riêng và đóng bằng Esc; đây là bản xem trước trong WebView, không phải Backstage Print của PowerPoint với máy in/phạm vi/bố trí. CDP xác nhận hộp xem trước mở và đóng được. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json)"),
    "slides.view.ruler": (UNCHECKED, "FIX-L10: CDP bật `ruler=true`, bấm lại trở về `false`. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái thước. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.gridlines": (UNCHECKED, "FIX-L10: CDP bật rồi tắt đường lưới; trạng thái model được ghi trong JSON. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái đường lưới. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.guides": (UNCHECKED, "FIX-L10: CDP bật rồi tắt đường hướng dẫn; trạng thái model được ghi trong JSON. COM xác nhận PPTX vẫn có 10 slide/5 shape, không xác nhận trạng thái đường hướng dẫn. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomIn": (UNCHECKED, "FIX-L10: CDP Phóng to đưa model từ 100% lên 110%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomOut": (UNCHECKED, "FIX-L10: CDP Thu nhỏ đưa model từ 110% về 100%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.zoomReset": (UNCHECKED, "FIX-L10: CDP bấm 100%; model ở mức 100%. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu `View.Zoom` của PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.view.fitToWindow": (UNCHECKED, "FIX-L10: CDP Vừa cửa sổ đưa model về 70% trên màn hình audit. COM xác nhận PPTX vẫn có 10 slide/5 shape; chưa đối chiếu kết quả theo kích thước cửa sổ PowerPoint. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json), [COM](tickets-0710/evidence/fix-l10/view/view-help-readback.json)"),
    "slides.help.open": (INTENTIONAL, "FIX-L12: F1 mở hướng dẫn tiếng Việt trong ứng dụng cho các lệnh VN Slides. COM không áp dụng vì Help là giao diện ứng dụng, không thuộc nội dung PPTX. CDP xác nhận panel mở. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json)"),
    "common.help.about": (INTENTIONAL, "FIX-L12: Giới thiệu hiển thị thông tin phiên bản/nhà phát hành VN Office trong ứng dụng; COM không áp dụng vì đây không phải dữ liệu bản trình chiếu. CDP xác nhận hộp thoại mở và đóng được. [CDP](tickets-0710/evidence/fix-l10/view/view-help-cdp-readback.json)"),
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
