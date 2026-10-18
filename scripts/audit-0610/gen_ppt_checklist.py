# -*- coding: utf-8 -*-
"""Sinh docs/POWERPOINT2016-FEATURE-CHECKLIST.md: danh sách tính năng PowerPoint 2016 và trạng thái trong VN Slides.

Chạy: python scripts/audit-0610/gen_ppt_checklist.py
Trạng thái:
  V = Có, ĐÃ đối chiếu với PowerPoint 2016 thật (đọc lại bằng COM chỉ-đọc / test CDP trên app desktop / bộ golden tests)
  A = Có trong app, CHƯA đối chiếu với PowerPoint 2016 (có mã lệnh và giao diện hoạt động)
  P = Có một phần (ghi rõ thiếu gì)
  N = Chưa có
  X = Ngoài phạm vi (cần dịch vụ đám mây Microsoft / không áp dụng cho bản chạy offline)
Ưu tiên của mục thiếu: 1 = người dùng văn phòng dùng thường xuyên, 2 = dùng khá thường, 3 = hiếm.
Mỗi dòng: Tab|Nhóm|Lệnh PowerPoint 2016|Trạng thái|Ưu tiên|Ghi chú (lệnh/đường dẫn trong VN Slides hoặc phần thiếu)
Nguồn trạng thái: quét ribbon PowerPoint COM (docs/ribbon-scan-ppt-1710.json), ma trận nút ribbon (docs/SLIDES-BUTTON-MATRIX-1011.md), kết quả đo 15 tính năng ưu tiên 1 (docs/POWERPOINT2016-FINDINGS-1710.md, docs/ppt-oracle-1710.json), đối chiếu FIX-L4/L6/L7/L8/L10/L12/L14, đọc mã (grep) và kiểm thực tế 17/10/2026.
"""
import collections
import re
import pathlib

DATA = """
Tệp (Backstage)|Tệp|Mới (Ctrl+N)|A|-|common.file.new; tạo bản trình bày trống mới
Tệp (Backstage)|Tệp|Mở (Ctrl+O): PPTX, PPT, ODP, FODP|A|-|Mở các định dạng trình chiếu qua LibreOffice adapter (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9; chưa đối chiếu riêng cho nút Backstage)
Tệp (Backstage)|Tệp|Mở gần đây (danh sách tệp)|A|-|Danh sách tệp gần đây trong Backstage menu (platform/shell/app-shell.js:960-985)
Tệp (Backstage)|Tệp|Lưu (Ctrl+S)|V|-|Lưu PPTX khứ hồi không lỗi (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9-10; docs/SLIDES-BUTTON-MATRIX-1011.md:20)
Tệp (Backstage)|Tệp|Lưu bản sao / Lưu thành (F12): PPTX, PPT 97-2003, ODP, FODP, PDF|A|-|common.file.saveAs; lưu thành các định dạng bản trình chiếu
Tệp (Backstage)|Tệp|Xuất PDF|A|-|common.file.exportPdf; xuất toàn bộ slide sang PDF
Tệp (Backstage)|Tệp|Xuất và chuyển đổi định dạng (giữ bố cục)|A|-|common.file.exportConvert; chuyển đổi giữ nguyên bố cục
Tệp (Backstage)|Tệp|In (Ctrl+P) & Xem trước khi in (Ctrl+F2)|V|-|slides.file.printPreview xem trước bản in (docs/SLIDES-BUTTON-MATRIX-1011.md:89)
Tệp (Backstage)|Tệp|Đóng (Ctrl+W)|A|-|common.file.close; đóng bản trình bày hiện tại
Tệp (Backstage)|Thông tin|Bảo vệ bản trình bày: Đánh dấu là cuối cùng (Mark as Final / Read-only)|V|-|Backstage > Thông tin > Đánh dấu là cuối cùng ghi contentStatus=Final; PowerPoint COM đọc lại Content status = Final ({{L:adapters/libreoffice/slides/slides-adapter.js|markAsFinal(enable = true)}}, scripts/audit-0610/ppt_docprops_readback.ps1:2)
Tệp (Backstage)|Thông tin|Bảo vệ bản trình bày: Mật khẩu mở file (mã hóa PPTX)|N|1|Chưa có cơ chế mã hóa mật khẩu mở file PPTX
Tệp (Backstage)|Thông tin|Kiểm tra bản trình bày (Inspect Document - loại bỏ metadata ẩn)|A|-|Backstage > Thông tin > Kiểm tra bản trình bày: 5 nhóm (thuộc tính, nhận xét, ghi chú, slide ẩn, ngoài vùng slide), xóa từng nhóm ({{L:adapters/libreoffice/slides/slides-adapter.js|async openDocumentInspectorDialog()}} openDocumentInspectorDialog; apps/slides/document-inspector-dialog.js:1; tests/live/cdp/slides-file-info.desktop.mjs:1); chưa đối chiếu Inspect Document của PowerPoint
Tệp (Backstage)|Thông tin|Quản lý bản trình bày: Tự động khôi phục (AutoRecover)|A|-|Tự động khôi phục bản trình bày (platform/help/entries-autorecover.js:28-34)
Tệp (Backstage)|Thông tin|Thuộc tính bản trình bày (Title, Author, Subject, Tags...)|V|-|Backstage > Thông tin > Thuộc tính (Title/Author/Subject/Keywords/Comments) lưu docProps/core.xml; PowerPoint COM BuiltInDocumentProperties khớp (adapters/libreoffice/slides/slides-adapter.js:169, scripts/audit-0610/ppt_docprops_readback.ps1:2)
Tệp (Backstage)|Tùy chọn|Tùy chọn PowerPoint (Hộp thoại Options)|N|2|Chưa có hộp thoại Tùy chọn (Options) riêng cho VN Slides
Tệp (Backstage)|Tùy chọn|Tùy biến Thanh công cụ truy nhanh (Quick Access Toolbar)|A|-|Thanh truy nhanh tùy biến (platform/shell/quick-access.js:46-60)
Tệp (Backstage)|Chia sẻ|Chia sẻ / OneDrive / Gửi Email đính kèm|X|-|Cần dịch vụ đám mây Microsoft
Trang đầu|Bảng nhớ tạm|Dán (Ctrl+V)|V|-|FIX-L8: common.edit.paste dán vào textbox khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:16)
Trang đầu|Bảng nhớ tạm|Tùy chọn dán: Giữ định dạng nguồn / Chỉ giữ văn bản thuần|A|-|common.edit.pastePlain; hỗ trợ dán văn bản thuần không giữ định dạng (Ctrl+Shift+V)
Trang đầu|Bảng nhớ tạm|Dán đặc biệt... (Ctrl+Alt+V) hộp thoại|A|-|slides.edit.pasteSpecial; bốn lựa chọn clipboard cục bộ (apps/slides/slides-ribbon.js; adapters/libreoffice/slides/slides-adapter.js; tests/unit/slides-paste-special.test.js)
Trang đầu|Bảng nhớ tạm|Cắt (Ctrl+X)|V|-|FIX-L8: common.edit.cut cắt nội dung khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:17)
Trang đầu|Bảng nhớ tạm|Sao chép (Ctrl+C)|V|-|FIX-L8: common.edit.copy sao chép văn bản (docs/SLIDES-BUTTON-MATRIX-1011.md:18)
Trang đầu|Bảng nhớ tạm|Sao chép định dạng (Format Painter, Ctrl+Shift+C)|V|-|FIX-L10: slides.edit.formatPainter đối chiếu PowerPoint COM (docs/SLIDES-BUTTON-MATRIX-1011.md:19)
Trang đầu|Bảng nhớ tạm|Ngăn Clipboard (Office Clipboard đa mục)|N|3|Chưa có ngăn lưu trữ nhiều mục clipboard lịch sử
Trang đầu|Trang chiếu|Trang chiếu mới (Ctrl+M)|V|-|FIX-L8: slides.slide.new tăng số slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20, docs/ppt-oracle-1710.json:9-15)
Trang đầu|Trang chiếu|Bố cục (Layout)|V|-|FIX-L12: slides.layout.apply áp Hai nội dung Slide.Layout=3 khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:21, docs/POWERPOINT2016-FINDINGS-1710.md:13)
Trang đầu|Trang chiếu|Đặt lại bố cục (Reset)|V|-|FIX-L12: slides.layout.reset đặt lại bố cục và placeholder (docs/SLIDES-BUTTON-MATRIX-1011.md:24)
Trang đầu|Trang chiếu|Phần (Section: Thêm, Đổi tên, Xóa phần)|A|-|slides.section.add, slides.section.rename, slides.section.remove; quản lý các section trong deck
Trang đầu|Trang chiếu|Nhân đôi trang chiếu (Duplicate, Ctrl+D)|V|-|FIX-L7: slides.slide.duplicate nhân đôi slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:22, docs/ppt-oracle-1710.json:16-22)
Trang đầu|Trang chiếu|Xóa trang chiếu (Delete)|V|-|FIX-L8: slides.slide.delete xóa trang đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:23, docs/ppt-oracle-1710.json:30-36)
Trang đầu|Phông chữ|Tên phông chữ (Font Family)|V|-|FIX-L4: slides.font.family đối chiếu PowerPoint COM phông Calibri (docs/SLIDES-BUTTON-MATRIX-1011.md:25, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9)
Trang đầu|Phông chữ|Cỡ chữ (Font Size 8–96 pt)|V|-|FIX-L4: slides.font.size chuỗi đổi cỡ chữ đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:26, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:10)
Trang đầu|Phông chữ|Tăng cỡ chữ (Ctrl+Shift+>)|V|-|FIX-L4: slides.font.grow tăng cỡ chữ theo thang chuẩn đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:27)
Trang đầu|Phông chữ|Giảm cỡ chữ (Ctrl+Shift+<)|V|-|FIX-L4: slides.font.shrink giảm cỡ chữ theo thang chuẩn đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:28)
Trang đầu|Phông chữ|Xóa định dạng (Clear All Formatting, Ctrl+Space)|V|-|FIX-L7: slides.text.clearFormat xóa định dạng Bold/Italic/Underline đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:33)
Trang đầu|Phông chữ|Đậm (Ctrl+B / Bold)|V|-|FIX-L4: slides.text.bold đối chiếu PowerPoint COM Bold=true (docs/SLIDES-BUTTON-MATRIX-1011.md:29, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:17)
Trang đầu|Phông chữ|Nghiêng (Ctrl+I / Italic)|V|-|FIX-L7: slides.text.italic đối chiếu TextRange2.Font.Italic=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:30)
Trang đầu|Phông chữ|Gạch chân (Ctrl+U / Underline)|V|-|FIX-L7: slides.text.underline đối chiếu Font.Underline=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:31)
Trang đầu|Phông chữ|Đổ bóng chữ (Text Shadow)|V|-|17/10: slides.text.shadow (nút trên ribbon Trang đầu, bật/tắt); CDP 7/7; lưu PPTX khôi phục outerShdw, PowerPoint 2016 COM đọc Shadow.Visible=-1 cho đúng đoạn chữ (docs/AUDIT-SLIDES-SHADOW-1710.md:11)
Trang đầu|Phông chữ|Gạch ngang (Strikethrough)|V|-|FIX-L7: slides.text.strike đối chiếu TextFrame2.Font.Strike=1 (docs/SLIDES-BUTTON-MATRIX-1011.md:32)
Trang đầu|Phông chữ|Khoảng cách ký tự (Character Spacing: Very Tight, Tight, Normal, Loose, Very Loose)|A|-|slides.font.spacing: 5 mức -3/-1,5/0/3/6 pt qua nút Khoảng cách ký tự và hộp thoại Phông chữ; CDP 8/8; lưu PPTX spc=300 đúng (platform/commands/command-definitions.js:732, adapters/libreoffice/slides/slides-adapter.js:982); chưa đối chiếu giá trị mức dựng sẵn với PowerPoint
Trang đầu|Phông chữ|Đổi chữ hoa/thường (Change Case, Shift+F3)|A|-|slides.text.changeCase (5 kiểu + Shift+F3 xoay vòng); test CDP tests/live/cdp/slides-change-case.desktop.mjs 9/9; logic dùng chung platform/text/change-case.js; chưa đối chiếu PowerPoint COM
Trang đầu|Phông chữ|Màu chữ (Font Color)|V|-|FIX-L7/FIX-L5: slides.color.text đối chiếu RGB=255 (docs/SLIDES-BUTTON-MATRIX-1011.md:34)
Trang đầu|Phông chữ|Màu nền chữ (Highlight Color)|V|-|FIX-L8: slides.color.highlight đối chiếu Highlight.RGB=52735 (docs/SLIDES-BUTTON-MATRIX-1011.md:35)
Trang đầu|Phông chữ|Hộp thoại Phông chữ (Font Dialog)|V|-|slides.font.dialog (Ctrl+T): phông, cỡ, màu, gạch chân đôi, chỉ số trên, giãn ký tự; PowerPoint COM đọc lại Georgia 28 pt đậm đỏ gạch chân baseline 0.33 ({{L:platform/commands/command-definitions.js|id: "slides.font.dialog"}}, scripts/audit-0610/ppt_font_runs_readback.ps1:2)
Trang đầu|Đoạn văn|Dấu đầu dòng (Bullets)|V|-|FIX-L7: slides.list.bullet bật Bullet.Visible=-1, Type=1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:36)
Trang đầu|Đoạn văn|Đánh số thứ tự (Numbering)|V|-|FIX-L7: slides.list.numbered bật đánh số Type=2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:37)
Trang đầu|Đoạn văn|Giảm thụt lề (Decrease Indent)|V|-|FIX-L8: slides.para.indentDec giảm thụt lề về 0 pt đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:38)
Trang đầu|Đoạn văn|Tăng thụt lề (Increase Indent)|V|-|FIX-L7: slides.para.indentInc tăng thụt lề LeftIndent=36 pt đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:39)
Trang đầu|Đoạn văn|Giãn dòng (Line Spacing 1.0, 1.5, 2.0)|V|-|FIX-L14: slides.para.lineSpacing đổi 1.0->1.5 đối chiếu COM SpaceWithin=1.5 (docs/SLIDES-BUTTON-MATRIX-1011.md:40)
Trang đầu|Đoạn văn|Căn trái (Ctrl+L / Align Left)|V|-|FIX-L8: slides.para.alignLeft đối chiếu Paragraph.Alignment=1 (docs/SLIDES-BUTTON-MATRIX-1011.md:41)
Trang đầu|Đoạn văn|Căn giữa (Ctrl+E / Center)|V|-|FIX-L4: slides.para.alignCenter đối chiếu Alignment=2 (docs/SLIDES-BUTTON-MATRIX-1011.md:42, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:17)
Trang đầu|Đoạn văn|Căn phải (Ctrl+R / Align Right)|V|-|FIX-L7: slides.para.alignRight đối chiếu Paragraph.Alignment=3 (docs/SLIDES-BUTTON-MATRIX-1011.md:43)
Trang đầu|Đoạn văn|Căn đều (Ctrl+J / Justify)|V|-|FIX-L7: slides.para.justify đối chiếu Paragraph.Alignment=4 (docs/SLIDES-BUTTON-MATRIX-1011.md:44)
Trang đầu|Đoạn văn|Cột văn bản trong khung (Columns: 1, 2, 3 cột)|V|-|17/10: slides.text.columns, slides.text.columnsOne, slides.text.columnsTwo, slides.text.columnsThree (nút Cột, Trang đầu > Đoạn văn); CDP 9/9; PowerPoint 2016 COM đọc TextFrame2.Column = 2 cột, 18 pt; mở lại đúng (docs/AUDIT-SLIDES-COLUMNS-1710.md:9)
Trang đầu|Đoạn văn|Hướng chữ (Text Direction: Ngang, Xoay 90°, Xoay 270°, Xếp chồng)|A|-|slides.text.directionHorizontal, slides.text.directionVertical, slides.text.directionVertical270, slides.text.directionStacked; đổi hướng hiển thị chữ trong shape
Trang đầu|Đoạn văn|Căn lề dọc (Align Text: Top, Middle, Bottom)|A|-|slides.text.vAlignTop, slides.text.vAlignMiddle, slides.text.vAlignBottom; căn văn bản theo chiều dọc khung chữ
Trang đầu|Đoạn văn|Chuyển sang SmartArt (Convert to SmartArt Graphic)|N|2|Chưa hỗ trợ chuyển đổi trực tiếp văn bản thành sơ đồ SmartArt
Trang đầu|Vẽ|Hộp văn bản (Text Box)|V|-|FIX-L6: slides.text.insert chèn textbox đối chiếu msoTextBox (docs/SLIDES-BUTTON-MATRIX-1011.md:45)
Trang đầu|Vẽ|Hình khối (Shapes Gallery)|V|-|FIX-L6: slides.shape.insert chèn shape đối chiếu fill/line RGB và rotation; thư viện 18 hình slides.shape.gallery (tam giác, thoi, sao, mũi tên, tim...) PowerPoint COM AutoShapeType khớp (apps/slides/slides-canvas.js:2862 insertPresetShape, docs/SLIDES-BUTTON-MATRIX-1011.md:46)
Trang đầu|Vẽ|Sắp xếp: Thứ tự lớp (Bring to Front, Send to Back)|A|-|slides.arrange.bringToFront, slides.arrange.sendToBack, slides.arrange.bringForward, slides.arrange.sendBackward; sắp xếp thứ tự lớp
Trang đầu|Vẽ|Sắp xếp: Nhóm đối tượng (Group, Ctrl+G)|V|-|FIX-L12: sơ đồ nhóm 7 đối tượng Shape.Type=6 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:53, docs/POWERPOINT2016-FINDINGS-1710.md:23)
Trang đầu|Vẽ|Sắp xếp: Rã nhóm (Ungroup, Ctrl+Shift+G)|A|-|slides.shape.ungroup; tách các đối tượng trong nhóm
Trang đầu|Vẽ|Sắp xếp: Căn lề đối tượng (Align Objects)|V|-|Đo thực tế PowerPoint COM ShapeRange.Align đối chiếu hệ thống lệnh slides.arrange.alignLeft, slides.arrange.alignCenter (docs/ppt-oracle-1710.json:86-92, docs/POWERPOINT2016-FINDINGS-1710.md:24)
Trang đầu|Vẽ|Sắp xếp: Phân phối đều ngang/dọc (Distribute)|A|-|slides.arrange.distributeHorizontal, slides.arrange.distributeVertical; phân phối đều khoảng cách
Trang đầu|Vẽ|Sắp xếp: Xoay và lật hình (Rotate & Flip)|V|-|slides.arrange.rotate, slides.arrange.flipHorizontal, slides.arrange.flipVertical; PowerPoint COM đọc lại rotation/hflip/vflip (adapters/libreoffice/slides/slides-adapter.js:278, adapters/libreoffice/slides/slides-adapter.js:287, adapters/libreoffice/slides/slides-adapter.js:288; scripts/audit-0610/ppt_shape_format_readback.ps1:4)
Trang đầu|Vẽ|Kiểu nhanh hình dạng (Quick Styles Gallery)|P|2|Có thư viện kiểu màu cơ bản; chưa có gallery đầy đủ hiệu ứng 3D như PowerPoint
Trang đầu|Vẽ|Tô nền hình (Shape Fill: Màu đơn, Chuyển sắc, Ảnh)|P|2|slides.shape.fill: bảng 15 màu, không tô, màu khác (PowerPoint COM đọc lại đúng màu); chưa có chuyển sắc / ảnh trên nút này
Trang đầu|Vẽ|Viền hình (Shape Outline: Màu, Độ dày nét, Nét đứt)|V|-|slides.shape.outline: màu, độ dày ½–6 pt, nét liền/gạch/chấm/gạch chấm; PowerPoint COM đọc lại line đỏ 3 pt nét gạch (adapters/libreoffice/slides/slides-adapter.js:1601; scripts/audit-0610/ppt_shape_format_readback.ps1:1)
Trang đầu|Vẽ|Hiệu ứng hình (Shape Effects: Bóng, Phát sáng, Mềm cạnh)|P|2|slides.shape.effects: đổ bóng 4 hướng (PowerPoint COM đọc lại Shadow.Visible); chưa có phát sáng / mềm cạnh / tùy chỉnh
Trang đầu|Chỉnh sửa|Tìm kiếm (Ctrl+F / Find)|V|-|FIX-L8: common.edit.find tìm chuỗi ROAD TRIP đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:48)
Trang đầu|Chỉnh sửa|Thay thế (Ctrl+H / Replace)|V|-|FIX-L8: common.edit.replace thay thế văn bản đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:49)
Trang đầu|Chỉnh sửa|Chọn: Chọn tất cả (Ctrl+A)|A|-|common.edit.selectAll; chọn toàn bộ đối tượng trên slide
Trang đầu|Chỉnh sửa|Chọn: Chọn đối tượng / Ngăn chọn (Selection Pane)|P|2|slides.edit.selectionPane (Alt+F10): danh sách, chọn, đổi thứ tự lớp (CDP 6/6); chưa có đổi tên và ẩn/hiện từng đối tượng
Chèn|Trang chiếu|Trang chiếu mới (Insert New Slide)|V|-|FIX-L8: slides.slide.new tăng số slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20, docs/ppt-oracle-1710.json:9-15)
Chèn|Bảng|Bảng (Table Grid)|V|-|FIX-L6: slides.insert.table chèn bảng 3x3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:50, docs/ppt-oracle-1710.json:65-71)
Chèn|Bảng|Vẽ bảng tự do (Draw Table)|N|3|Chưa có công cụ vẽ lưới bảng biểu tự do bằng bút
Chèn|Bảng|Bảng tính Excel nhúng (Excel Spreadsheet)|N|2|Chưa hỗ trợ nhúng trang tính Excel trực tiếp vào slide
Chèn|Hình ảnh|Hình ảnh từ tệp (Pictures)|V|-|FIX-L6: slides.image.insert chèn ảnh đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:51)
Chèn|Hình ảnh|Hình ảnh trực tuyến (Online Pictures)|X|-|Cần dịch vụ tìm kiếm hình ảnh đám mây
Chèn|Hình ảnh|Ảnh chụp màn hình (Screenshot / Screen Clipping)|N|3|Chưa có tính năng chụp cửa sổ màn hình nhúng vào slide
Chèn|Hình ảnh|Album ảnh trình chiếu (Photo Album)|N|3|Chưa có wizard tạo album ảnh hàng loạt từ thư mục
Chèn|Minh họa|Hình khối (Shapes Gallery)|V|-|FIX-L6: slides.shape.insert chèn shape đối chiếu fill/line RGB và rotation (docs/SLIDES-BUTTON-MATRIX-1011.md:52)
Chèn|Minh họa|SmartArt (Danh sách, Quy trình, Chu trình, Phân cấp)|N|1|Chưa hỗ trợ tạo mới SmartArt native chuẩn DrawingML diagram; hiện dùng sơ đồ nhóm shape (docs/SLIDES-BUTTON-MATRIX-1011.md:53)
Chèn|Minh họa|Sơ đồ (Diagram)|V|-|FIX-L12: slides.diagram.insert sơ đồ nhóm 7 shape đối chiếu COM Shape.Type=6 (docs/SLIDES-BUTTON-MATRIX-1011.md:53)
Chèn|Minh họa|Biểu đồ (Chart: Cột, Đường, Tròn, Thanh)|V|-|FIX-L6: slides.insert.chart chèn biểu đồ ChartType 51 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:54)
Chèn|Phần bổ trợ|Cửa hàng Office Store / Add-in của tôi|X|-|Cần kết nối dịch vụ cửa hàng Microsoft Office
Chèn|Liên kết|Siêu liên kết (Hyperlink, Ctrl+K)|A|-|common.edit.hyperlink; gắn liên kết URL hoặc liên kết tới slide khác
Chèn|Liên kết|Tác vụ (Action: Chuyển slide khi click/hover)|A|-|slides.insert.action; hộp thoại và điều hướng khi nhấp lúc trình chiếu (apps/slides/slides-canvas.js; adapters/libreoffice/slides/slides-adapter.js)
Chèn|Nhận xét|Nhận xét mới (New Comment)|V|-|FIX-L10: slides.review.commentInsert chèn nhận xét đối chiếu Slide.Comments (docs/SLIDES-BUTTON-MATRIX-1011.md:55)
Chèn|Văn bản|Hộp văn bản (Text Box)|V|-|FIX-L6: slides.text.insert chèn textbox đối chiếu msoTextBox (docs/SLIDES-BUTTON-MATRIX-1011.md:56)
Chèn|Văn bản|Đầu trang & Chân trang (Header & Footer)|V|-|FIX-L12: slides.insert.headerFooter bật footer đối chiếu Footer.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:58)
Chèn|Văn bản|Chữ nghệ thuật (WordArt)|P|1|FIX-L14: có lệnh slides.insert.wordart nhưng PowerPoint COM nhận dạng Type=17 PresetTextEffect=-2 chưa chuẩn native Type=15 (docs/SLIDES-BUTTON-MATRIX-1011.md:57)
Chèn|Văn bản|Ngày & Giờ (Date & Time)|V|-|FIX-L12: slides.insert.dateTime định dạng dd/MM/yyyy DateAndTime.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:59)
Chèn|Văn bản|Số trang chiếu (Slide Number)|V|-|FIX-L12: slides.insert.slideNumber bật số trang SlideNumber.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:60)
Chèn|Văn bản|Đối tượng nhúng OLE (Object)|N|3|Chưa hỗ trợ nhúng đối tượng OLE bên ngoài
Chèn|Ký hiệu|Phương trình toán học (Equation)|N|2|Chưa có thanh công cụ gõ phương trình toán học MathML/OMML
Chèn|Ký hiệu|Ký hiệu (Symbol)|V|-|FIX-L12: slides.insert.symbol chèn ký hiệu TM đối chiếu nội dung shape (docs/SLIDES-BUTTON-MATRIX-1011.md:61)
Chèn|Phương tiện|Video từ tệp|V|-|FIX-L12: slides.media.insertVideo chèn video đối chiếu COM Type=16 MediaType=3 (docs/SLIDES-BUTTON-MATRIX-1011.md:62)
Chèn|Phương tiện|Video trực tuyến (Online Video)|N|3|Chưa hỗ trợ nhúng video trực tuyến YouTube/Vimeo
Chèn|Phương tiện|Âm thanh từ tệp (Audio)|V|-|FIX-L12: slides.media.insertAudio chèn âm thanh đối chiếu COM MediaType=2 (docs/SLIDES-BUTTON-MATRIX-1011.md:63)
Chèn|Phương tiện|Ghi âm giọng nói (Record Audio)|N|3|Chưa có micro ghi âm trực tiếp vào slide
Chèn|Phương tiện|Ghi màn hình (Screen Recording)|N|3|Chưa có công cụ quay màn hình nhúng vào slide
Thiết kế|Chủ đề|Chủ đề (Themes Gallery)|V|-|FIX-L12: slides.design.themeGallery chọn chủ đề Than Chì Hiện Đại đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:64)
Thiết kế|Chủ đề|Mẫu Slide Master|V|-|FIX-L12: slides.master.apply chọn theme palette và font scheme đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:65)
Thiết kế|Chủ đề|Duyệt tìm chủ đề (Browse for Themes: .thmx)|N|2|Chưa hỗ trợ nạp tệp chủ đề bên ngoài (.thmx)
Thiết kế|Chủ đề|Lưu chủ đề hiện tại (Save Current Theme)|N|3|Chưa có chức năng lưu chủ đề tùy chỉnh thành tệp .thmx
Thiết kế|Biến thể|Bảng màu biến thể (Theme Colors)|V|-|slides.design.themeColors: 7 bảng màu; PowerPoint COM ThemeColorScheme accent1/nền/tiêu đề khớp (apps/slides/slides-canvas.js:9382, scripts/audit-0610/ppt_theme_readback.ps1:2)
Thiết kế|Biến thể|Bộ phông chữ biến thể (Theme Fonts)|V|-|slides.design.themeFonts: 6 bộ phông; PowerPoint COM MajorFont/MinorFont = Georgia (apps/slides/slides-canvas.js:9382, scripts/audit-0610/ppt_theme_readback.ps1:2)
Thiết kế|Biến thể|Hiệu ứng biến thể (Theme Effects)|P|3|Có áp dụng hiệu ứng chung; chưa có bộ sưu tập hiệu ứng biến thể rời
Thiết kế|Biến thể|Kiểu nền trang chiếu (Background Styles)|N|2|Chưa có thư viện kiểu nền mẫu (Background Styles gallery)
Thiết kế|Tùy chỉnh|Cỡ trang chiếu (Slide Size 4:3 / 16:9)|V|-|FIX-L8: slides.design.slideSize đổi tỷ lệ đối chiếu PageSetup 720x540 pt (docs/SLIDES-BUTTON-MATRIX-1011.md:66, docs/ppt-oracle-1710.json:37-43)
Thiết kế|Tùy chỉnh|Kích thước trang chiếu tùy chỉnh (Custom Slide Size)|V|-|17/10: slides.design.slideSize có mục Tùy chỉnh (cm, 2,54-142,24); CDP 10/10; PowerPoint 2016 COM đọc SlideWidth/Height 842x595 pt, ppSlideSizeCustom; mở lại đúng (docs/AUDIT-SLIDES-SIZE-1710.md:7)
Thiết kế|Tùy chỉnh|Định dạng nền: Màu đơn sắc (Solid Fill)|V|-|FIX-L8: slides.design.formatBackground nền gradient ngang Fill.Type=3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:67)
Thiết kế|Tùy chỉnh|Định dạng nền: Chuyển sắc (Gradient Fill)|V|-|FIX-L8: slides.design.formatBackground nền gradient ngang Fill.Type=3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:67)
Thiết kế|Tùy chỉnh|Định dạng nền: Hình ảnh hoặc họa tiết (Picture or Texture Fill)|P|2|slides.design.formatBackground: nền hình ảnh theo từng trang hoặc cả bài, lưu PPTX; PowerPoint COM đọc lại Background.Fill.Type = 6 (picture), nền màu đơn = 1, chuyển sắc = 3 (apps/slides/slides-canvas.js:9522 applySlideBackground, scripts/audit-0610/ppt_bg_fill_readback.ps1:2); chưa có họa tiết lặp (texture)
Thiết kế|Tùy chỉnh|Định dạng nền: Hoa văn (Pattern Fill)|N|3|Chưa có thư viện mẫu hoa văn pattern cho nền
Thiết kế|Tùy chỉnh|Ẩn đồ họa nền (Hide Background Graphics)|V|-|slides.design.hideBackground; PowerPoint COM đọc lại DisplayMasterShapes (ppt_hide_bg_readback.ps1) (apps/slides/slides-canvas.js:6837; scripts/audit-0610/ppt_hide_bg_readback.ps1:1)
Chuyển tiếp|Xem trước|Xem trước hiệu ứng chuyển tiếp (Preview)|A|-|slides.transition.preview chạy hiệu ứng trên khung soạn (CDP slides-transition-tab 9/9)
Chuyển tiếp|Chuyển tiếp sang slide|Hiệu ứng chuyển tiếp (Transitions Gallery)|V|-|FIX-L4/L7: slides.transition.apply áp Push Right (3854) và Fade (3849) đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:68, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20)
Chuyển tiếp|Chuyển tiếp sang slide|Hiệu ứng Morph (Biến đổi hình thái)|P|1|Đã có xử lý chuyển đổi Morph sơ bộ; chưa hoàn thiện mapping đối tượng khớp định danh như PowerPoint 2016 Office 365
Chuyển tiếp|Chuyển tiếp sang slide|Hiệu ứng Fade / Push / Wipe / Split|V|-|FIX-L4/L7: slides.transition.apply áp Push Right (3854) và Fade (3849) đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:68, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20)
Chuyển tiếp|Chuyển tiếp sang slide|Hiệu ứng 3D phức tạp (Curtains, Wind, Fracture, Origami)|N|2|Chưa hỗ trợ các hiệu ứng chuyển tiếp 3D dựng hình chuyên sâu
Chuyển tiếp|Chuyển tiếp sang slide|Tùy chọn hiệu ứng (Effect Options: Hướng chuyển động)|A|-|slides.transition.apply; apps/slides/slides-canvas.js lưu hướng (apps/slides/slides-canvas.js:10187); adapters/libreoffice/slides/slides-adapter.js ghi smil:subtype (adapters/libreoffice/slides/slides-adapter.js:1925, adapters/libreoffice/slides/slides-adapter.js:2246); PPTX dir (adapters/libreoffice/common/ooxml_zip_patch.py:12466)
Chuyển tiếp|Thời gian|Âm thanh chuyển tiếp (Sound)|N|3|Chưa hỗ trợ gán âm thanh khi chuyển tiếp trang chiếu
Chuyển tiếp|Thời gian|Thời lượng chuyển tiếp (Duration)|V|-|FIX-L4/L7: PowerPoint COM đọc Duration=0.8 s khớp thời lượng chuyển tiếp (docs/SLIDES-BUTTON-MATRIX-1011.md:68, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20)
Chuyển tiếp|Thời gian|Áp dụng cho tất cả trang chiếu (Apply to All)|A|-|slides.transition.applyAll, hoàn tác một bước (CDP 9/9)
Chuyển tiếp|Thời gian|Chuyển khi nhấp chuột (On Mouse Click)|V|-|slides.transition.advanceClick; PowerPoint COM đọc lại AdvanceOnClick (ppt_transition_readback.ps1) (apps/slides/slides-canvas.js:10235; scripts/audit-0610/ppt_transition_readback.ps1:1)
Chuyển tiếp|Thời gian|Chuyển tự động sau thời gian (After X seconds)|V|-|slides.transition.advanceAfter (3/5/10/30 s); PowerPoint COM đọc lại AdvanceOnTime/AdvanceTime (apps/slides/slides-canvas.js:10235; scripts/audit-0610/ppt_transition_readback.ps1:1)
Hoạt ảnh|Xem trước|Xem trước hoạt ảnh (Preview)|A|-|slides.animation.preview chạy theo timeline (CDP slides-animation-tab 9/9)
Hoạt ảnh|Hoạt ảnh|Hiệu ứng đối tượng (Animations Gallery)|V|-|FIX-L6: slides.animation.apply hiệu ứng Fade, Fly EffectType 10, 2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:69)
Hoạt ảnh|Hoạt ảnh|Nhóm Xuất hiện (Entrance Effects: Appear, Fade, Fly In, Float In, Zoom)|V|-|FIX-L6: slides.animation.apply hiệu ứng Fade, Fly EffectType 10, 2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:69)
Hoạt ảnh|Hoạt ảnh|Nhóm Nhấn mạnh (Emphasis Effects: Pulse, Spin, Grow/Shrink)|V|-|slides.animation.apply; Xoay tròn (EffectType 61), Phóng to/thu nhỏ (59) và Nhịp đập (75) lưu PPTX rồi PowerPoint 2016 COM đọc đúng (docs/AUDIT-SLIDES-ANIM-1710.md:12; tests/live/cdp/slides-pulse-effect.desktop.mjs; {{L:apps/slides/slide-animation-classes.js|id: "pulse"}} pulse)
Hoạt ảnh|Hoạt ảnh|Nhóm Thoát (Exit Effects: Disappear, Fade, Fly Out)|V|-|slides.animation.apply; Mờ dần ra, Bay ra, Thu nhỏ ra, Biến mất lưu PPTX rồi PowerPoint 2016 COM đọc đúng EffectType và Exit=-1 (docs/AUDIT-SLIDES-ANIM-1710.md:15)
Hoạt ảnh|Hoạt ảnh|Đường chuyển động (Motion Paths: Line, Arc, Custom Path)|N|2|Chưa hỗ trợ vẽ và chạy hoạt ảnh theo đường cong tự do Motion Path
Hoạt ảnh|Hoạt ảnh|Tùy chọn hiệu ứng (Effect Options: Hướng, Theo đoạn/khung)|A|-|slides.animation.effectOptions; direction được lưu qua preset-sub-type/presetSubtype (apps/slides/slides-canvas.js; adapters/libreoffice/slides/slides-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py)
Hoạt ảnh|Hoạt ảnh nâng cao|Thêm hoạt ảnh (Add Animation)|V|-|slides.animation.add / slides.animation.addEffect: vào + thoát trên cùng một hình, lưu PPTX rồi PowerPoint 2016 COM đọc đủ cả hai (Exit=0 và -1; tests/live/cdp/slides-add-animation.desktop.mjs; {{L:apps/slides/slides-canvas.js|  addObjectAnimation(patch) {}} addObjectAnimation)
Hoạt ảnh|Hoạt ảnh nâng cao|Ngăn hoạt ảnh (Animation Pane)|V|-|FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70)
Hoạt ảnh|Hoạt ảnh nâng cao|Kích hoạt (Trigger: On Click of Object)|V|-|slides.animation.trigger: hộp thoại chọn hình kích hoạt; lưu PPTX rồi PowerPoint 2016 COM đọc InteractiveSequences=1 và TriggerShape đúng (tests/live/cdp/slides-animation-trigger.desktop.mjs; {{L:apps/slides/slides-canvas.js|  openAnimationTriggerDialog() {}} openAnimationTriggerDialog)
Hoạt ảnh|Hoạt ảnh nâng cao|Sao chép hoạt ảnh (Animation Painter)|V|-|slides.animation.painter: lấy hiệu ứng ở lần nhấn 1, dán ở lần 2; PowerPoint COM đọc lại hai hiệu ứng Bay vào cùng hướng trái, sau hiệu ứng trước, 1,5 giây, trễ 0,5 giây ({{L:apps/slides/slides-canvas.js|  animationPainter() {}} animationPainter, scripts/audit-0610/ppt_animation_all_readback.ps1:2)
Hoạt ảnh|Thời gian|Bắt đầu (Start: On Click, With Previous, After Previous)|V|-|slides.animation.startMenu; PowerPoint COM đọc lại TriggerType=AfterPrevious, Duration, Delay (ppt_anim_readback.ps1) (apps/slides/slides-canvas.js:2117; scripts/audit-0610/ppt_anim_readback.ps1:2)
Hoạt ảnh|Thời gian|Thời lượng hoạt ảnh (Duration)|V|-|FIX-L6: PowerPoint COM đọc duration 0.8/0.8/0.5 s khớp timeline (docs/SLIDES-BUTTON-MATRIX-1011.md:69)
Hoạt ảnh|Thời gian|Độ trễ hoạt ảnh (Delay)|A|-|slides.animation.apply; cấu hình độ trễ (delay) trong hộp thoại Hiệu ứng đối tượng
Hoạt ảnh|Thời gian|Đổi thứ tự: Lên trước (Move Earlier)|V|-|FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70)
Hoạt ảnh|Thời gian|Đổi thứ tự: Xuống sau (Move Later)|V|-|FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70)
Trình chiếu|Bắt đầu trình chiếu|Từ đầu (From Beginning, F5)|A|-|slides.show.startFromBegin; mở overlay trình chiếu toàn màn hình từ slide 1 (docs/SLIDES-BUTTON-MATRIX-1011.md:71)
Trình chiếu|Bắt đầu trình chiếu|Từ trang hiện tại (From Current Slide, Shift+F5)|A|-|slides.show.startFromCurrent; mở trình chiếu từ slide đang chọn (docs/SLIDES-BUTTON-MATRIX-1011.md:72)
Trình chiếu|Bắt đầu trình chiếu|Trình chiếu trực tuyến (Present Online)|X|-|Cần dịch vụ phát trực tuyến của Microsoft
Trình chiếu|Bắt đầu trình chiếu|Trình chiếu tùy chỉnh (Custom Slide Show)|N|3|Chưa có tính năng tạo bản trình chiếu tùy chỉnh (Custom Slide Show)
Trình chiếu|Thiết lập|Thiết lập trình chiếu (Set Up Slide Show)|V|-|FIX-L10: slides.show.setupShow lặp liên tục LoopUntilStopped=-1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:74)
Trình chiếu|Thiết lập|Lặp lại liên tục cho đến khi nhấn Esc (Loop)|V|-|FIX-L10: slides.show.setupShow lặp liên tục LoopUntilStopped=-1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:74)
Trình chiếu|Thiết lập|Ẩn trang chiếu (Hide Slide)|V|-|FIX-L5/L6: slides.slide.toggleHidden ẩn slide đối chiếu Hidden=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:75, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:22)
Trình chiếu|Thiết lập|Tập dượt hẹn giờ (Rehearse Timings)|A|-|slides.show.rehearseTimings; chế độ tập dượt đo thời gian từng slide (docs/SLIDES-BUTTON-MATRIX-1011.md:76)
Trình chiếu|Thiết lập|Ghi lại trình chiếu (Record Slide Show)|N|2|Chưa hỗ trợ thu âm và lưu timeline trình diễn vào deck
Trình chiếu|Thiết lập|Phát thuyết minh (Play Narrations)|N|3|Chưa có tùy chọn bật/tắt phát thuyết minh
Trình chiếu|Thiết lập|Sử dụng thời gian tập dượt (Use Timings)|N|2|Chưa có tùy chọn sử dụng thời gian đã tập dượt khi chiếu
Trình chiếu|Thiết lập|Hiện thanh điều khiển phương tiện (Show Media Controls)|N|3|Chưa có tùy chọn ẩn/hiện thanh điều khiển phương tiện khi chiếu
Trình chiếu|Màn hình|Chọn màn hình phát (Monitors)|N|2|Chưa có menu chọn màn hình hiển thị trình chiếu ngoài Presenter View
Trình chiếu|Màn hình|Chế độ Presenter (Presenter View, Alt+F5)|A|-|slides.show.presenterMode; giao diện người thuyết trình xem trước slide kế tiếp và ghi chú (docs/SLIDES-BUTTON-MATRIX-1011.md:73)
Trình chiếu|Diễn giả|Ghi chú thuyết trình (Speaker Notes)|V|-|FIX-L4/L6: slides.notes.toggle ghi chú diễn giả đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:77, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:19)
Trình chiếu|Điều khiển chiếu|Bút vẽ và con trỏ Laser khi đang chiếu|A|-|Ctrl+P bút, Ctrl+L laser, Ctrl+A mũi tên, tẩy nét: laser đo đúng vị trí chuột, bút để lại nét nhìn thấy (200x80 px khi kéo 200x80), một lần kéo một nét, tẩy xóa hết; sửa lỗi Ctrl+P mở Xem trước khi in phủ lên bài chiếu và nét vẽ tạo sai namespace SVG nên không hiện (tests/live/cdp/slides-show-pen-laser.desktop.mjs 7/7, {{L:apps/slides/slides-canvas.js|"Ctrl+L", () => setPointerMode("laser")}}); thoát chiếu và Giữ chú thích thì nét thành hình tự do, lưu PPTX rồi PowerPoint 2016 COM đọc Type=5 (freeform) 183.8x60.9 pt, nét 3 pt màu #DC2626 đúng (tests/live/cdp/slides-ink-keep.desktop.mjs, scripts/audit-0610/ppt_ink_readback.ps1)
Xem lại|Kiểm lỗi|Chính tả (Spelling, F7)|A|-|slides.review.spellCheck; kiểm tra chính tả tiếng Việt (docs/SLIDES-BUTTON-MATRIX-1011.md:78)
Xem lại|Kiểm lỗi|Bật/tắt gạch chân kiểm lỗi chính tả|A|-|slides.review.toggleSpellCheck; ẩn hiện đường lượn sóng đỏ (docs/SLIDES-BUTTON-MATRIX-1011.md:79)
Xem lại|Kiểm lỗi|Từ điển đồng nghĩa (Thesaurus, Shift+F7)|N|3|Chưa tích hợp từ điển đồng nghĩa chuyên sâu
Xem lại|Thông tin chuyên sâu|Tra cứu thông minh (Smart Lookup)|X|-|Cần dịch vụ tìm kiếm thông minh Bing
Xem lại|Ngôn ngữ|Dịch văn bản (Translate)|X|-|Cần dịch vụ dịch máy đám mây
Xem lại|Ngôn ngữ|Chọn ngôn ngữ kiểm lỗi (Language)|N|2|Chưa có hộp thoại chọn ngôn ngữ kiểm tra chính tả (Language)
Xem lại|Nhận xét|Nhận xét mới (New Comment)|V|-|FIX-L10: slides.review.commentInsert chèn nhận xét đối chiếu Slide.Comments (docs/SLIDES-BUTTON-MATRIX-1011.md:80)
Xem lại|Nhận xét|Xóa nhận xét (Delete Comment)|V|-|FIX-L10: slides.review.commentDelete xóa nhận xét đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:81)
Xem lại|Nhận xét|Nhận xét trước (Previous Comment)|A|-|slides.review.commentPrevious; điều hướng tới nhận xét trước (docs/SLIDES-BUTTON-MATRIX-1011.md:82)
Xem lại|Nhận xét|Nhận xét sau (Next Comment)|A|-|slides.review.commentNext; điều hướng tới nhận xét kế tiếp (docs/SLIDES-BUTTON-MATRIX-1011.md:83)
Xem lại|Nhận xét|Đánh dấu đã xử lý (Resolve Comment)|A|-|slides.review.commentResolve; đánh dấu nhận xét đã giải quyết (docs/SLIDES-BUTTON-MATRIX-1011.md:84)
Xem lại|Nhận xét|Hiện/ẩn ngăn nhận xét (Show Comments)|N|2|Chưa có nút riêng mở/đóng ngăn nhận xét (Comments Pane)
Xem lại|So sánh|So sánh bản trình bày (Compare Presentations)|N|3|Chưa có công cụ so sánh song song hai tệp PPTX
Xem lại|So sánh|Chấp nhận / Từ chối thay đổi (Accept / Reject Revision)|N|3|Chưa có quy trình duyệt thay đổi revision trong slide
Chế độ xem|Chế độ xem bản trình bày|Bình thường (Normal View)|V|-|FIX-L14: slides.view.normal chuyển chế độ ppViewNormal ViewType=9 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:85)
Chế độ xem|Chế độ xem bản trình bày|Bộ sắp xếp trang (Slide Sorter View)|V|-|FIX-L14: slides.view.slideSorter bộ sắp xếp trang ppViewSlideSorter ViewType=7 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:86)
Chế độ xem|Chế độ xem bản trình bày|Chế độ dàn bài (Outline View)|A|-|slides.view.outline: sửa tiêu đề/nội dung mọi trang, Ctrl+Enter thêm trang, hoàn tác (apps/slides/slides-canvas.js:8063; CDP 7/8 mục tests/live/cdp/slides-outline-view.desktop.mjs:1); chưa đối chiếu PowerPoint
Chế độ xem|Chế độ xem bản trình bày|Trang ghi chú (Notes Page View)|A|-|slides.view.notesPage: trang thu nhỏ kèm ô ghi chú, ghi chú lưu notesSlide1.xml (apps/slides/slides-canvas.js:7964; CDP 7/7 tests/live/cdp/slides-notes-page.desktop.mjs:1); chưa đối chiếu PowerPoint
Chế độ xem|Chế độ xem bản trình bày|Chế độ đọc (Reading View)|A|-|slides.view.reading; hiển thị trình chiếu trong cửa sổ ứng dụng (docs/SLIDES-BUTTON-MATRIX-1011.md:88)
Chế độ xem|Chế độ xem bản cái|Slide Master (Trang chiếu cái)|N|2|Chưa có giao diện thiết kế và chỉnh sửa Slide Master (chỉ có áp dụng qua slides.master.apply)
Chế độ xem|Chế độ xem bản cái|Handout Master (Bản phát tài liệu cái)|N|3|Chưa có giao diện thiết kế bố cục in bản phát tài liệu
Chế độ xem|Chế độ xem bản cái|Notes Master (Ghi chú cái)|N|3|Chưa có giao diện thiết kế bố trí trang in ghi chú
Chế độ xem|Hiển thị|Thước (Ruler)|A|-|slides.view.ruler; hiển thị thước đo ngang và dọc (docs/SLIDES-BUTTON-MATRIX-1011.md:90)
Chế độ xem|Hiển thị|Đường lưới (Gridlines)|A|-|slides.view.gridlines; hiển thị lưới tọa độ căn hình (docs/SLIDES-BUTTON-MATRIX-1011.md:91)
Chế độ xem|Hiển thị|Đường dẫn hướng (Guides)|A|-|slides.view.guides; hiển thị đường guide căn chỉnh thông minh (docs/SLIDES-BUTTON-MATRIX-1011.md:92)
Chế độ xem|Hiển thị|Ghi chú (Notes Pane toggle)|V|-|FIX-L4/L6: slides.notes.toggle bật tắt vùng ghi chú diễn giả (docs/SLIDES-BUTTON-MATRIX-1011.md:87)
Chế độ xem|Thu phóng|Thu phóng (Zoom Dialog)|N|2|Chưa có hộp thoại chọn mức thu phóng tùy biến (Zoom Dialog)
Chế độ xem|Thu phóng|Phóng to (Zoom In)|V|-|FIX-L14: slides.view.zoomIn bước tăng 10 điểm phần trăm đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:93)
Chế độ xem|Thu phóng|Thu nhỏ (Zoom Out)|V|-|FIX-L14: slides.view.zoomOut bước giảm 10 điểm phần trăm đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:94)
Chế độ xem|Thu phóng|100% (Zoom Reset)|V|-|FIX-L14: slides.view.zoomReset đặt lại 100% đối chiếu View.Zoom=100 (docs/SLIDES-BUTTON-MATRIX-1011.md:95)
Chế độ xem|Thu phóng|Vừa cửa sổ (Fit to Window)|V|-|FIX-L14: slides.view.fitToWindow bật View.ZoomToFit=true đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:96)
Chế độ xem|Màu sắc|Màu / Thang độ xám / Đen trắng (Color, Grayscale, B&W)|P|2|Chế độ hiển thị màn hình luôn là màu; chưa có bộ lọc xem thử thang độ xám trước khi in
Chế độ xem|Cửa sổ|Cửa sổ mới (New Window)|P|2|FIX-L13: desktop WebView đơn phiên bản trình chiếu; chưa mở nhiều cửa sổ độc lập cho cùng 1 deck (docs/SLIDES-BUTTON-MATRIX-1011.md:97)
Chế độ xem|Cửa sổ|Sắp xếp tất cả / Xếp tầng (Arrange All / Cascade)|N|3|Chưa có tính năng sắp xếp nhiều cửa sổ song song
Chế độ xem|Cửa sổ|Di chuyển thanh chia (Move Split)|N|3|Chưa có phím tắt di chuyển thanh chia ngăn (Move Split)
Chế độ xem|Macro|Ghi Macro (Record Macro)|A|-|common.macro.recordToggle; bộ ghi macro cục bộ VN Office (docs/SLIDES-BUTTON-MATRIX-1011.md:98)
Chế độ xem|Macro|Xem và chạy Macro (Alt+F8)|A|-|common.macro.manager; quản lý danh sách macro cục bộ (docs/SLIDES-BUTTON-MATRIX-1011.md:99)
Chế độ xem|Trợ giúp|Trợ giúp (Help, F1)|A|-|slides.help.open; hướng dẫn sử dụng tiếng Việt trong ứng dụng (docs/SLIDES-BUTTON-MATRIX-1011.md:100)
Chế độ xem|Trợ giúp|Giới thiệu bản quyền (About)|A|-|common.help.about; thông tin phiên bản VN Slides (docs/SLIDES-BUTTON-MATRIX-1011.md:101)
Công cụ vẽ > Định dạng|Chèn hình|Sửa điểm vẽ tự do (Edit Points)|P|2|Có vẽ hình tự do Bezier; chưa có giao diện kéo điểm nút trực quan
Công cụ vẽ > Định dạng|Chèn hình|Đổi hình dạng (Change Shape)|V|-|slides.shape.changeType: đổi giữa chữ nhật, elip và 16 hình dựng sẵn, giữ vị trí/kích thước/màu; PowerPoint COM AutoShapeType elip=9, sao=92, mũi tên phải=33, tim=21 ({{L:apps/slides/slides-canvas.js|  changeShapeType(presetId) {}} changeShapeType, scripts/audit-0610/ppt_autoshape_readback.ps1:2)
Công cụ vẽ > Định dạng|Kiểu chữ WordArt|Tô màu chữ nghệ thuật (Text Fill)|N|2|Chưa có công cụ đổi màu tô chữ nghệ thuật độc lập trên ribbon
Công cụ vẽ > Định dạng|Kiểu chữ WordArt|Viền chữ nghệ thuật (Text Outline)|N|2|Chưa có công cụ đổi màu viền chữ nghệ thuật trên ribbon
Công cụ vẽ > Định dạng|Kiểu chữ WordArt|Hiệu ứng chữ nghệ thuật (Text Effects: Warp, Shadow, 3D)|P|1|FIX-L14: có textFadeRight nhưng PowerPoint COM nhận dạng PresetTextEffect=-2 chưa chuẩn native (docs/SLIDES-BUTTON-MATRIX-1011.md:57)
Công cụ vẽ > Định dạng|Sắp xếp|Lên trên một lớp (Bring Forward)|A|-|slides.arrange.bringForward; đưa đối tượng lên 1 bậc
Công cụ vẽ > Định dạng|Sắp xếp|Lên trên cùng (Bring to Front)|A|-|slides.arrange.bringToFront; đưa đối tượng lên đỉnh lớp vẽ
Công cụ vẽ > Định dạng|Sắp xếp|Xuống dưới một lớp (Send Backward)|A|-|slides.arrange.sendBackward; hạ đối tượng xuống 1 bậc
Công cụ vẽ > Định dạng|Sắp xếp|Xuống dưới cùng (Send to Back)|A|-|slides.arrange.sendToBack; hạ đối tượng xuống đáy lớp vẽ
Công cụ vẽ > Định dạng|Sắp xếp|Căn lề đối tượng (Align Left/Center/Right/Top/Middle/Bottom)|V|-|Đo thực tế PowerPoint COM ShapeRange.Align đối chiếu hệ thống lệnh slides.arrange.alignLeft, slides.arrange.alignCenter (docs/ppt-oracle-1710.json:86-92, docs/POWERPOINT2016-FINDINGS-1710.md:24)
Công cụ vẽ > Định dạng|Sắp xếp|Phân phối đều khoảng cách (Distribute Horizontally / Vertically)|A|-|slides.arrange.distributeHorizontal, slides.arrange.distributeVertical; phân phối đều khoảng cách
Công cụ vẽ > Định dạng|Sắp xếp|Nhóm đối tượng (Group, Ctrl+G)|V|-|FIX-L12: sơ đồ nhóm 7 đối tượng Shape.Type=6 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:53, docs/POWERPOINT2016-FINDINGS-1710.md:23)
Công cụ vẽ > Định dạng|Sắp xếp|Rã nhóm đối tượng (Ungroup, Ctrl+Shift+G)|A|-|slides.shape.ungroup; giải phóng nhóm thành các hình riêng
Công cụ vẽ > Định dạng|Sắp xếp|Xoay và lật đối tượng (Rotate 90°, Flip)|V|-|slides.arrange.rotateRight90, slides.arrange.rotateLeft90, slides.arrange.flipHorizontal, slides.arrange.flipVertical; PowerPoint COM đọc lại rotation/hflip/vflip (adapters/libreoffice/slides/slides-adapter.js:285, adapters/libreoffice/slides/slides-adapter.js:286, adapters/libreoffice/slides/slides-adapter.js:287, adapters/libreoffice/slides/slides-adapter.js:288; scripts/audit-0610/ppt_shape_format_readback.ps1:4)
Công cụ vẽ > Định dạng|Kích thước|Chiều cao đối tượng (Shape Height)|A|-|slides.shape.sizeDialog (Định dạng hình > Kích thước và vị trí…): đặt rộng, cao, góc xoay chính xác, hoàn tác/làm lại; lưu PPTX rồi PowerPoint 2016 COM đọc Width=320, Height=120, Rotation=30, Left/Top=100 đúng (tests/live/cdp/slides-shape-size-dialog.desktop.mjs, scripts/audit-0610/ppt_shape_size_readback.ps1, {{L:platform/commands/command-definitions.js|id: "slides.shape.sizeDialog"}}); nhập trong hộp thoại chứ chưa có ô nhập ngay trên ruy-băng
Công cụ vẽ > Định dạng|Kích thước|Chiều rộng đối tượng (Shape Width)|A|-|slides.shape.sizeDialog (Định dạng hình > Kích thước và vị trí…): đặt rộng, cao, góc xoay chính xác, hoàn tác/làm lại; lưu PPTX rồi PowerPoint 2016 COM đọc Width=320, Height=120, Rotation=30, Left/Top=100 đúng (tests/live/cdp/slides-shape-size-dialog.desktop.mjs, scripts/audit-0610/ppt_shape_size_readback.ps1, {{L:platform/commands/command-definitions.js|id: "slides.shape.sizeDialog"}}); nhập trong hộp thoại chứ chưa có ô nhập ngay trên ruy-băng
Công cụ vẽ > Định dạng|Kích thước|Khóa tỷ lệ khung hình (Lock Aspect Ratio)|N|2|Chưa có tùy chọn khóa tỷ lệ khung hình (Lock Aspect Ratio)
Công cụ hình ảnh > Định dạng|Điều chỉnh|Xóa nền ảnh tự động (Remove Background)|N|2|Chưa tích hợp thuật toán AI/canvas bóc tách nền ảnh tự động
Công cụ hình ảnh > Định dạng|Điều chỉnh|Hiệu chỉnh độ sáng và tương phản (Corrections)|P|2|Có bộ lọc CSS brightness/contrast; chưa lưu native vào DrawingML blip
Công cụ hình ảnh > Định dạng|Điều chỉnh|Màu sắc ảnh (Color Tone / Recolor)|P|2|Có grayscale/sepia; chưa có bộ lọc màu sắc phong phú như Office
Công cụ hình ảnh > Định dạng|Điều chỉnh|Hiệu ứng nghệ thuật (Artistic Effects)|N|3|Chưa có bộ lọc hiệu ứng tranh vẽ/kính mờ
Công cụ hình ảnh > Định dạng|Điều chỉnh|Nén ảnh (Compress Pictures)|N|3|Chưa có công cụ giảm độ phân giải DPI ảnh để tối ưu dung lượng deck
Công cụ hình ảnh > Định dạng|Điều chỉnh|Đổi ảnh khác (Change Picture)|N|2|Chưa có lệnh thay thế ảnh giữ nguyên vị trí/kích thước
Công cụ hình ảnh > Định dạng|Điều chỉnh|Đặt lại ảnh (Reset Picture)|N|2|Chưa có lệnh đặt lại kích thước/định dạng ảnh ban đầu
Công cụ hình ảnh > Định dạng|Kiểu ảnh|Kiểu khung viền ảnh (Picture Styles Gallery)|P|2|Có viền và bóng cơ bản; chưa có thư viện khung viền mỹ thuật
Công cụ hình ảnh > Định dạng|Kiểu ảnh|Viền ảnh (Picture Border)|N|2|Chưa có công cụ viền ảnh trên ribbon
Công cụ hình ảnh > Định dạng|Kiểu ảnh|Hiệu ứng ảnh (Picture Effects: Shadow, Glow, Soft Edges)|P|2|Hỗ trợ đổ bóng và phát sáng; chưa có 3D rotation
Công cụ hình ảnh > Định dạng|Kiểu ảnh|Bố cục ảnh sang SmartArt (Picture Layout)|N|3|Chưa hỗ trợ chuyển đổi ảnh vào sơ đồ SmartArt
Công cụ hình ảnh > Định dạng|Kích thước|Cắt xén ảnh (Crop to Shape / Aspect Ratio)|V|-|slides.picture.cropDrag kéo tay cầm cắt trực tiếp, slides.picture.cropRatio theo tỉ lệ, slides.picture.cropDialog theo số đo; lưu PPTX rồi PowerPoint 2016 COM đọc CropRight 37.5 pt, CropTop 22.5 pt, khung 300×180 (tests/live/cdp/slides-crop-drag.desktop.mjs; {{L:apps/slides/slides-canvas.js|  toggleCropMode(force) {}} toggleCropMode)
Công cụ bảng > Thiết kế|Tùy chọn kiểu|Hàng tiêu đề (Header Row)|A|-|slides.table.optHeaderRow bật tắt hàng tiêu đề: chữ đậm và tô màu theo kiểu; màu được lưu thành màu nền ô, chưa ghi cờ firstRow của PowerPoint (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Tùy chọn kiểu|Hàng tổng cộng (Total Row)|A|-|slides.table.optTotalRow làm hàng cuối nổi bật; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Tùy chọn kiểu|Hàng sọc xen kẽ (Banded Rows)|A|-|slides.table.optBandedRows tô xen kẽ hàng; lưu thành màu nền ô, PowerPoint COM đọc đúng màu từng ô (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Tùy chọn kiểu|Cột đầu tiên / Cột cuối cùng (First/Last Column)|A|-|slides.table.optFirstCol và slides.table.optLastCol tô màu cột đầu hoặc cuối; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Tùy chọn kiểu|Cột sọc xen kẽ (Banded Columns)|A|-|slides.table.optBandedCols tô xen kẽ cột; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Kiểu bảng|Thư viện kiểu dáng bảng (Table Styles Gallery)|A|-|slides.table.style có 6 bảng màu nhạt cộng Không kiểu; màu lưu thành màu nền ô, chưa ghi tableStyleId của PowerPoint nên mở lại trong PowerPoint không đổi kiểu theo (tests/live/cdp/slides-table-design.desktop.mjs)
Công cụ bảng > Thiết kế|Kiểu bảng|Tô màu nền ô (Table Shading)|V|-|slides.table.shading tô ô, vùng ô hoặc cả bảng; lưu PPTX rồi PowerPoint 2016 COM đọc đúng màu nền từng ô FFFF00 và BDD7EE, ô không tô là FFFFFF (tests/live/cdp/slides-table-design.desktop.mjs; {{L:apps/slides/slides-canvas.js|  setTableShading(color) {}} setTableShading, {{L:platform/commands/command-definitions.js|id: "slides.table.shading"}})
Công cụ bảng > Thiết kế|Kiểu bảng|Đường viền bảng (Table Borders: Tất cả, Viền ngoài, Không viền)|A|-|bốn lệnh slides.table.bordersAll, slides.table.bordersOutside, slides.table.bordersInside, slides.table.bordersNone cho vùng chọn hoặc cả bảng; lưu PPTX rồi PowerPoint 2016 COM đọc đúng từng cạnh có viền hoặc không viền nhưng độ dày đọc ra 1,47 pt thay vì 0,75 pt đặt (tests/live/cdp/slides-table-borders.desktop.mjs; {{L:apps/slides/slides-canvas.js|  setTableBorders(mode) {}} setTableBorders)
Công cụ bảng > Bố trí|Hàng & Cột|Chèn hàng trên / dưới (Insert Above / Below)|V|-|17/10: slides.table.insertRowAbove, slides.table.insertRowBelow; CDP 17/17, hoàn tác một bước, vùng gộp dài thêm (docs/AUDIT-SLIDES-TABLE-1710.md:8)
Công cụ bảng > Bố trí|Hàng & Cột|Chèn cột trái / phải (Insert Left / Right)|V|-|17/10: slides.table.insertColLeft, slides.table.insertColRight; CDP 17/17, hoàn tác một bước (docs/AUDIT-SLIDES-TABLE-1710.md:9)
Công cụ bảng > Bố trí|Hàng & Cột|Xóa hàng / Xóa cột / Xóa bảng (Delete)|V|-|17/10: slides.table.deleteRow, slides.table.deleteCol, slides.table.deleteTable; CDP 17/17, không mất chữ ô neo (docs/AUDIT-SLIDES-TABLE-1710.md:10)
Công cụ bảng > Bố trí|Gộp ô|Gộp ô (Merge Cells)|V|-|17/10: slides.table.mergeCells; lưu PPTX rồi PowerPoint 2016 COM đọc đúng 2 vùng gộp, mở lại VN Slides đọc đúng (docs/AUDIT-SLIDES-TABLE-1710.md:11)
Công cụ bảng > Bố trí|Gộp ô|Tách ô (Split Cells)|V|-|17/10: slides.table.splitCell; CDP 17/17, hoàn tác một bước (docs/AUDIT-SLIDES-TABLE-1710.md:12)
Công cụ bảng > Bố trí|Kích thước ô|Chiều cao hàng / Chiều rộng cột bảng|V|-|slides.table.cellSize đặt chiều cao hàng và bề rộng cột theo cm; lưu PPTX rồi PowerPoint 2016 COM đọc đúng hàng 40, 71, 40 pt và cột 140, 227, 140 pt, mở lại giữ đúng tỉ lệ (tests/live/cdp/slides-table-sizes.desktop.mjs; {{L:apps/slides/slides-canvas.js|  openTableSizeDialog() {}} openTableSizeDialog, {{L:platform/commands/command-definitions.js|id: "slides.table.cellSize"}})
Công cụ bảng > Bố trí|Kích thước ô|Phân phối đều hàng / cột (Distribute Rows / Columns)|V|-|slides.table.distributeRows và slides.table.distributeCols cho cả bảng hoặc vùng chọn; lưu PPTX rồi PowerPoint 2016 COM đọc hàng 50,3 pt bằng nhau và cột 169 pt bằng nhau (tests/live/cdp/slides-table-sizes.desktop.mjs; {{L:apps/slides/slides-canvas.js|  distributeTable(kind) {}} distributeTable, {{L:platform/commands/command-definitions.js|id: "slides.table.distributeRows"}})
Công cụ bảng > Bố trí|Căn chỉnh ô|Căn lề ô: Trái, Giữa, Phải, Trên, Giữa dọc, Dưới|V|-|sáu lệnh slides.table.alignLeft đến slides.table.alignBottom; lưu PPTX rồi PowerPoint 2016 COM đọc halign 2 giữa, 3 phải và valign 3 giữa dọc đúng từng ô (tests/live/cdp/slides-table-align.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "slides.table.alignLeft"}}, {{L:platform/commands/command-definitions.js|id: "slides.table.alignBottom"}})
Công cụ biểu đồ > Thiết kế|Bố cục|Thêm thành phần biểu đồ (Trục, Tiêu đề, Nhãn, Chú giải)|N|2|Chưa có menu Thêm thành phần biểu đồ (Add Chart Element)
Công cụ biểu đồ > Thiết kế|Bố cục|Bố cục nhanh (Quick Layout)|N|2|Chưa có thư viện bố cục dựng sẵn Quick Layout cho biểu đồ
Công cụ biểu đồ > Thiết kế|Kiểu biểu đồ|Đổi bảng màu chuỗi dữ liệu (Change Colors)|N|2|Chưa có menu đổi bảng màu chuỗi dữ liệu biểu đồ trên ribbon
Công cụ biểu đồ > Thiết kế|Kiểu biểu đồ|Thư viện kiểu biểu đồ (Chart Styles Gallery)|N|2|Chưa có thư viện kiểu dáng biểu đồ Chart Styles trên ribbon
Công cụ biểu đồ > Thiết kế|Dữ liệu|Chuyển hàng và cột dữ liệu (Switch Row/Column)|N|2|Chưa hỗ trợ chuyển đổi nhanh hàng/cột ma trận số liệu biểu đồ
Công cụ biểu đồ > Thiết kế|Dữ liệu|Chọn dữ liệu nguồn (Select Data)|A|-|slides.chart.editData mở hộp thoại sửa tiêu đề, nhãn và giá trị (một chuỗi dữ liệu), cùng slides.chart.setType đổi kiểu cột, đường, tròn, miền; lưu PPTX rồi PowerPoint 2016 COM đọc ChartType 4 cho biểu đồ đường, tiêu đề và giá trị 10,20,15 đúng; chưa chọn lại dải ô nguồn hay nhiều chuỗi (tests/live/cdp/slides-chart-design.desktop.mjs; {{L:apps/slides/slides-canvas.js|  async editChart(shapeId = this.selectedTarget) {}} editChart)
Công cụ biểu đồ > Thiết kế|Dữ liệu|Chỉnh sửa dữ liệu nguồn (Edit Data in Excel/Grid)|A|-|tab Thiết kế biểu đồ > Sửa dữ liệu mở bảng số liệu của biểu đồ để sửa nhãn và giá trị; hoàn tác; lưu PPTX (tests/live/cdp/slides-chart-design.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "slides.chart.editData"}}); chưa mở sửa trong Excel (không liên kết sổ tính ngoài)
Công cụ biểu đồ > Thiết kế|Loại|Thay đổi loại biểu đồ (Change Chart Type)|A|-|tab Thiết kế biểu đồ > Đổi kiểu: cột, đường, tròn, miền; giữ dữ liệu, vẽ lại, Ctrl+Z trả về; lưu PPTX rồi PowerPoint 2016 COM đọc ChartType (scripts/audit-0610/ppt_chart_readback.ps1; tests/live/cdp/slides-chart-design.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "slides.chart.setType"}})
Công cụ phương tiện > Phát lại|Xem trước|Phát thử media (Play Video / Audio)|P|2|Phát video/audio qua thanh điều khiển native controls của thẻ media trên canvas (apps/slides/slides-canvas.js:4312); chưa có tab ribbon Phát lại riêng
Công cụ phương tiện > Phát lại|Chỉnh sửa|Cắt tỉa thời lượng media (Trim Video / Audio)|N|2|Chưa có công cụ cắt ngắn điểm đầu và điểm kết thúc video/audio
Công cụ phương tiện > Phát lại|Tùy chọn|Mức âm lượng media (Low, Medium, High, Mute)|P|2|Điều chỉnh âm lượng qua thanh trượt volume native của media trên canvas (apps/slides/slides-canvas.js:4312); chưa có nút âm lượng trên ribbon
Công cụ phương tiện > Phát lại|Tùy chọn|Bắt đầu phát: Tự động / Khi nhấp chuột|A|-|slides.media.autoplay bật tắt tự phát; lưu thành lệnh play trong dãy chính như PowerPoint ghi (COM đọc 1 hiệu ứng chính), mở lại nhận đúng; chưa đọc được PlayOnEntry của tệp do LibreOffice ghi (tests/live/cdp/slides-media-playback.desktop.mjs; {{L:apps/slides/slides-canvas.js|  toggleMediaOption(option) {}} toggleMediaOption)
Công cụ phương tiện > Phát lại|Tùy chọn|Lặp lại cho đến khi dừng (Loop until Stopped)|A|-|slides.media.loop; lưu thêm p:audio cMediaNode repeatCount indefinite đúng cấu trúc PowerPoint (bù phần LibreOffice bỏ), mở lại nhận đúng; COM chưa đọc được LoopUntilStopped của tệp này (tests/test_slides_media_loops.py; {{L:adapters/libreoffice/common/ooxml_zip_patch.py|def _apply_slides_media_loops}} media loops)
Không thuộc ribbon|Bàn phím|Điều hướng slide (PageUp, PageDown, Home, End)|A|-|slides.nav.prevSlide, slides.nav.nextSlide, slides.nav.firstSlide, slides.nav.lastSlide; phím tắt điều hướng slide
Không thuộc ribbon|Bàn phím|Phím tắt định dạng chữ (Ctrl+B/I/U, Ctrl+Shift+>/<, Ctrl+Space)|V|-|FIX-L4: Ctrl+B/I/U và thang tăng giảm cỡ chữ đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:27-31)
Không thuộc ribbon|Bàn phím|Phím tắt trình chiếu (F5 Từ đầu, Shift+F5 Từ trang hiện tại, Esc Thoát)|A|-|slides.show.startFromBegin, startFromCurrent; phím tắt điều khiển trình diễn
Không thuộc ribbon|Bàn phím|Phím tắt chỉnh sửa slide (Ctrl+M Thêm, Ctrl+D Nhân đôi, Delete Xóa)|V|-|FIX-L8: slides.slide.new, duplicate, delete đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20,22,23)
Không thuộc ribbon|Chuột|Kéo thả thay đổi thứ tự trang trong danh sách thumbnail|A|-|Kéo thả trực tiếp slide thumbnail để sắp xếp thứ tự ({{L:apps/slides/slides-canvas.js|      item.className = `vno-slide-thumb-item}}, {{L:apps/slides/slides-canvas.js|      item.addEventListener("drop", (event) => {}})
Không thuộc ribbon|Chuột|Kéo các góc/chốt đối tượng để đổi kích thước và xoay|A|-|Chốt điều khiển 8 hướng và xoay đối tượng (apps/slides/slides-canvas.js:190-200)
Không thuộc ribbon|Chuột|Menu ngữ cảnh chuột phải trên slide, hình vẽ, ảnh, bảng|A|-|Menu chuột phải trên slide và hình vẽ ({{L:apps/slides/slides-canvas.js|menu.setAttribute("aria-label", `Tùy chọn hình vẽ}}, {{L:apps/slides/slides-canvas.js|el.addEventListener("contextmenu"}})
Không thuộc ribbon|Tính tương thích|Mở và Lưu PPTX giữ nguyên bố cục đối tượng|V|-|Lưu PPTX và mở lại đối chiếu PowerPoint COM không mất đối tượng (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9-10)
Không thuộc ribbon|Tính tương thích|Giữ nguyên hiệu ứng chuyển tiếp và timeline hoạt ảnh khi lưu|V|-|FIX-L6/L7: transition và animation giữ nguyên timeline khi mở bằng PowerPoint COM (docs/SLIDES-BUTTON-MATRIX-1011.md:68-70)
Không thuộc ribbon|Tính tương thích|Khứ hồi các định dạng ODP, FODP chuẩn mở|A|-|Hỗ trợ ODP/FODP qua LibreOffice adapter (adapters/libreoffice/common/ooxml_zip_patch.py:16-25)
Không thuộc ribbon|Hiệu năng|Tải deck lớn mượt mà, chuyển trang không trễ|A|-|Kiến trúc render DOM tối ưu kiểm thử với deck nhiều trang (tests/live/slides-print-preview.playwright.mjs:55-60)
"""

ORDER = ["V", "A", "P", "N", "X"]
ICON = {"V": "✅", "A": "🟢", "P": "🟡", "N": "🔴", "X": "⚪"}
LABEL = {
    "V": "Đã đối chiếu PowerPoint 2016",
    "A": "Có, chưa đối chiếu",
    "P": "Có một phần",
    "N": "Chưa có",
    "X": "Ngoài phạm vi"
}


def parse():
    rows = []
    def _resolve_refs(text):
        root = pathlib.Path(__file__).resolve().parents[2]

        def one(match):
            rel, needle = match.group(1), match.group(2)
            for number, content in enumerate((root / rel).read_text(encoding="utf-8").splitlines(), 1):
                if needle in content:
                    return f"{rel}:{number}"
            raise SystemExit(f"Không thấy '{needle}' trong {rel} (trích dẫn {{{{L:...}}}})")
        return re.sub(r"\{\{L:([^|}]+)\|([^}]+)\}\}", one, text)

    for line in _resolve_refs(DATA).strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 6:
            continue
        rows.append(parts[:6])
    return rows


def pct(n, d):
    return f"{(100.0 * n / d):.0f}%" if d else "-"


def main():
    rows = parse()
    by_tab = collections.OrderedDict()
    for row in rows:
        by_tab.setdefault(row[0], []).append(row)
    total = collections.Counter(r[3] for r in rows)
    applicable = len(rows) - total["X"]
    coverage = (total["V"] + total["A"] + 0.5 * total["P"]) / applicable * 100 if applicable else 0
    verified = total["V"] / applicable * 100 if applicable else 0

    out = []
    out.append("# Danh sách tính năng PowerPoint 2016 và trạng thái trong VN Slides\n")
    out.append("Chuẩn: Microsoft PowerPoint 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 17/10/2026 từ quét ribbon PowerPoint thật "
               "(`docs/ribbon-scan-ppt-1710.json`), ma trận đối chiếu từng nút ribbon (`docs/SLIDES-BUTTON-MATRIX-1011.md`), kết quả đo kiểm 15 tính năng ưu tiên 1 "
               "(`docs/POWERPOINT2016-FINDINGS-1710.md`, `docs/ppt-oracle-1710.json`), ma trận Hoàn tác (`docs/AUDIT-DOC-UNDO-FULL-1610.md`), đọc mã và kiểm thực tế. "
               "Sinh bằng `scripts/audit-0610/gen_ppt_checklist.py` (sửa dữ liệu trong script rồi chạy lại).\n")
    out.append("## Cách đọc\n")
    for key in ORDER:
        out.append(f"- {ICON[key]} **{LABEL[key]}**")
    out.append("\nƯu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.\n")
    out.append("## Tổng hợp\n")
    out.append("| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |\n|---|---|---|")
    for key in ORDER:
        out.append(f"| {ICON[key]} {LABEL[key]} | {total[key]} | {pct(total[key], applicable) if key != 'X' else '-'} |")
    out.append(f"| **Tổng** | **{len(rows)}** (áp dụng: {applicable}) | |\n")
    out.append(f"- **Độ phủ so với PowerPoint 2016 (có hoặc có một phần, một phần tính 0,5): {coverage:.0f}%**")
    out.append(f"- **Đã xác minh bằng đối chiếu PowerPoint 2016 thật: {verified:.0f}%** các mục áp dụng\n")
    out.append("Lưu ý: số mục chia đều cho mỗi dòng nên một dòng lớn chỉ tính một mục; đo kiểu ghi-rồi-đọc-lại trên PowerPoint COM chỉ xác nhận ngữ nghĩa thuộc tính của PowerPoint, KHÔNG tự nhận là parity hoàn chỉnh nếu chưa có kiểm chứng khứ hồi.\n")
    out.append("## Theo tab\n")
    out.append("| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |\n|---|---|---|---|---|---|---|---|")
    for tab, items in by_tab.items():
        c = collections.Counter(i[3] for i in items)
        app = len(items) - c["X"]
        cov = (c["V"] + c["A"] + 0.5 * c["P"]) / app * 100 if app else 0
        out.append(f"| {tab} | {len(items)} | {c['V']} | {c['A']} | {c['P']} | {c['N']} | {c['X']} | {cov:.0f}% |")
    out.append("")
    out.append("## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1)\n")
    gaps1 = [r for r in rows if r[3] in ("N", "P") and r[4] == "1"]
    out.append("| Tab | Nhóm | Tính năng | Trạng thái | Ghi chú |\n|---|---|---|---|---|")
    for r in gaps1:
        out.append(f"| {r[0]} | {r[1]} | {r[2]} | {ICON[r[3]]} | {r[5]} |")
    out.append(f"\nTổng: {len(gaps1)} mục ưu tiên 1.\n")

    # Danh sách 15 mục ưu tiên 1 thiếu nhất và đề xuất 10 phiếu việc kế tiếp
    out.append("## Danh sách 15 mục ưu tiên 1 thiếu nhất & Đề xuất 10 phiếu việc kế tiếp\n")
    out.append("### 15 mục ưu tiên 1 cần bổ sung sớm nhất cho người dùng văn phòng:")
    out.append("1. **Chèn > SmartArt**: Tạo SmartArt native (DrawingML diagram data/layout/colors) cho các mẫu quy trình, phân cấp, chu trình.")
    out.append("2. **Công cụ bảng > Bố trí > Chèn hàng**: Thao tác chèn hàng trên/dưới trong bảng biểu slide.")
    out.append("3. **Công cụ bảng > Bố trí > Chèn cột**: Thao tác chèn cột trái/phải trong bảng biểu slide.")
    out.append("4. **Công cụ bảng > Bố trí > Xóa hàng/cột/bảng**: Thao tác xóa hàng, xóa cột hoặc xóa toàn bộ bảng đang chọn.")
    out.append("5. **Công cụ bảng > Bố trí > Gộp ô (Merge Cells)**: Gộp các ô đang chọn thành một ô duy nhất.")
    out.append("6. **Chèn > Chữ nghệ thuật (WordArt)**: Chuẩn hóa xuất DrawingML WordArt native Type=15 (presetTextWarp) thay vì shape Type=17.")
    out.append("7. **Chuyển tiếp > Morph**: Hoàn thiện thuật toán ánh xạ đối tượng cùng tên `!!name` giữa các slide cho chuyển tiếp Morph mượt mà.")
    out.append("8. **Tệp > Thông tin > Mật khẩu**: Cơ chế mã hóa và thiết lập mật khẩu bảo vệ file PPTX.")
    out.append("9. **Trang đầu > Phông chữ > Đổ bóng chữ (Text Shadow)**: Nút Text Shadow trực tiếp trên ribbon Trang đầu.")
    out.append("10. **Công cụ vẽ > Hiệu ứng chữ WordArt**: Thư viện hiệu ứng uốn cong chữ nghệ thuật (Warp gallery).")
    out.append("11. **Trang đầu > Đoạn văn > Cột văn bản (Columns)**: Chia 2-3 cột văn bản bên trong khung chữ (Text Box).")
    out.append("12. **Hoạt ảnh > Nhóm Nhấn mạnh (Emphasis Effects)**: Các hiệu ứng chuyển động xoay, đổi cỡ chữ, nhấp nháy khi thuyết trình.")
    out.append("13. **Hoạt ảnh > Nhóm Thoát (Exit Effects)**: Các hiệu ứng biến mất đối tượng (Disappear, Fade Out, Fly Out).")
    out.append("14. **Thiết kế > Kích thước trang chiếu tùy chỉnh (Custom Slide Size)**: Hộp thoại đặt chiều rộng/chiều cao slide theo cm/pt.")
    out.append("15. **Công cụ hình ảnh > Cắt xén ảnh (Crop)**: Công cụ kéo chốt cắt xén ảnh trực quan trên canvas.")
    out.append("")
    out.append("### Đề xuất 10 phiếu việc kế tiếp cho VN Slides:")
    out.append("- **FIX-S1-TABLE-STRUCTURE**: Thêm lệnh chèn/xóa hàng, cột và gộp ô trong bảng biểu slide.")
    out.append("- **FIX-S2-SMARTART**: Thiết kế engine sinh SmartArt native Diagram (danh sách, quy trình, phân cấp) chuẩn DrawingML.")
    out.append("- **FIX-S3-WORDART**: Chuẩn hóa WordArt native DrawingML `a:prstTxWarp` (PresetTextEffect 15) tương thích hoàn toàn PowerPoint.")
    out.append("- **FIX-S4-MORPH**: Nâng cấp hiệu ứng chuyển tiếp Morph nhận diện và biến đổi hình thái đối tượng giữa 2 slide kế tiếp.")
    out.append("- **FIX-S5-PPTX-PASSWORD**: Mã hóa mật khẩu bảo vệ file PPTX mở đọc/chỉnh sửa.")
    out.append("- **FIX-S6-TEXT-SHADOW**: Thêm nút Đổ bóng chữ (Text Shadow) vào nhóm Phông chữ ribbon Trang đầu và phím tắt.")
    out.append("- **FIX-S7-TEXT-COLUMNS**: Hỗ trợ chia 2-3 cột văn bản bên trong textbox.")
    out.append("- **FIX-S8-ANIMATION-EMPHASIS-EXIT**: Bổ sung nhóm hoạt ảnh Nhấn mạnh (Spin, Pulse) và Biến mất (Fade Out, Fly Out).")
    out.append("- **FIX-S9-CUSTOM-SLIDE-SIZE**: Hộp thoại thiết lập kích thước trang chiếu tùy biến theo kích thước cm/pt.")
    out.append("- **FIX-S10-IMAGE-CROP-UI**: Công cụ kéo chốt tương tác cắt xén ảnh (Crop) trực tiếp trên canvas.")
    out.append("")

    out.append("## Chi tiết từng tab\n")
    for tab, items in by_tab.items():
        out.append(f"### {tab}\n")
        out.append("| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |\n|---|---|---|---|---|")
        for r in items:
            out.append(f"| {r[1]} | {r[2]} | {ICON[r[3]]} | {r[4]} | {r[5]} |")
        out.append("")

    path = pathlib.Path(__file__).resolve().parents[2] / "docs" / "POWERPOINT2016-FEATURE-CHECKLIST.md"
    path.write_text("\n".join(out), encoding="utf-8")
    print(f"mục={len(rows)} áp dụng={applicable} V={total['V']} A={total['A']} P={total['P']} N={total['N']} X={total['X']}")
    print(f"độ phủ={coverage:.1f}% đã xác minh={verified:.1f}% ưu tiên-1 thiếu={len(gaps1)}")
    print(path)


if __name__ == "__main__":
    main()
