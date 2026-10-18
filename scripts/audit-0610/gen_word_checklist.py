# -*- coding: utf-8 -*-
"""Sinh docs/WORD2016-FEATURE-CHECKLIST.md: danh sách tính năng Word 2016 và trạng thái trong VN Writer.

Chạy: python scripts/audit-0610/gen_word_checklist.py
Trạng thái:
  V = Có, ĐÃ đối chiếu với Word 2016 thật (đọc lại bằng COM chỉ-đọc / test CDP trên app desktop / bộ golden tests)
  A = Có trong app, CHƯA đối chiếu với Word 2016 (có mã lệnh và giao diện hoạt động)
  P = Có một phần (ghi rõ thiếu gì)
  N = Chưa có
  X = Ngoài phạm vi (cần dịch vụ đám mây Microsoft / không áp dụng cho bản chạy offline)
Ưu tiên của mục thiếu: 1 = người dùng văn phòng dùng thường xuyên, 2 = dùng khá thường, 3 = hiếm.
Mỗi dòng: Tab|Nhóm|Lệnh Word 2016|Trạng thái|Ưu tiên|Ghi chú (lệnh/đường dẫn trong VN Writer hoặc phần thiếu)
Nguồn trạng thái: quét ribbon Word COM (docs/ribbon-scan-word-1710.json), đối chiếu song song (docs/AUDIT-DOC-WORD-PARALLEL-1011.md), kết quả đo 15 tính năng ưu tiên 1 (docs/WORD2016-FINDINGS-1710.md), ma trận Hoàn tác (docs/AUDIT-DOC-UNDO-FULL-1610.md), đọc mã (grep) và kiểm thực tế 17/10/2026.
"""
import collections
import re
import pathlib

DATA = """
Tệp (Backstage)|Tệp|Mới (Ctrl+N)|A|-|common.file.new
Tệp (Backstage)|Tệp|Mở (Ctrl+O): DOCX, DOC, ODT, RTF, TXT|A|-|Mở các định dạng văn bản qua LibreOffice adapter (docs/AUDIT-DOC-CORPUS-0610.md:3-7; chưa đối chiếu bằng Word COM)
Tệp (Backstage)|Tệp|Mở gần đây (danh sách tệp)|A|-|Danh sách tệp gần đây (platform/recent/recent-manager.js:32-45)
Tệp (Backstage)|Tệp|Lưu (Ctrl+S)|A|-|common.file.save; lưu DOCX khứ hồi trong các nhóm lệnh (chưa có phép đo Word COM riêng cho nút Lưu Backstage)
Tệp (Backstage)|Tệp|Lưu bản sao / Lưu thành (F12): DOCX, DOC, ODT, FODT, HTML|A|-|common.file.saveAs
Tệp (Backstage)|Tệp|Xuất PDF|A|-|common.file.exportPdf
Tệp (Backstage)|Tệp|Xuất và chuyển đổi định dạng (giữ bố cục)|A|-|common.file.exportConvert
Tệp (Backstage)|Tệp|In (Ctrl+P) & Xem trước khi in (Ctrl+F2)|V|-|Hộp thoại in nội bộ và xem trước trang A4 khớp Word COM 595.35x841.95 pt (docs/DOC-BUTTON-MATRIX-1011.md:82-83)
Tệp (Backstage)|Tệp|Đóng (Ctrl+W)|A|-|common.file.close
Tệp (Backstage)|Thông tin|Bảo vệ tài liệu: Đánh dấu là cuối cùng (Mark as Final / Read-only)|A|-|writer.file.markAsFinal (platform/commands/command-definitions.js:243)
Tệp (Backstage)|Thông tin|Bảo vệ tài liệu: Mật khẩu mở file (mã hóa DOCX)|N|1|Chưa có cơ chế mã hóa mật khẩu mở file DOCX
Tệp (Backstage)|Thông tin|Kiểm tra tài liệu (Inspect Document - loại bỏ metadata, comment ẩn)|A|-|writer.file.inspectDocument (platform/commands/command-definitions.js:244)
Tệp (Backstage)|Thông tin|Quản lý tài liệu: Tự động khôi phục (AutoRecover)|A|-|Tự động khôi phục AutoRecover (platform/autorecover/auto-recover.js:1-35)
Tệp (Backstage)|Thông tin|Thuộc tính tài liệu (Title, Author, Subject, Keywords...)|A|-|writer.file.properties (platform/commands/command-definitions.js:242)
Tệp (Backstage)|Tùy chọn|Tùy chọn Word (Hộp thoại Options)|A|-|writer.file.options (platform/commands/command-definitions.js:245)
Tệp (Backstage)|Tùy chọn|Tùy biến Thanh công cụ truy nhanh (Quick Access Toolbar)|A|-|Thanh công cụ truy nhanh tùy biến (tests/unit/quick-access.test.js:1-25)
Tệp (Backstage)|Chia sẻ|Chia sẻ / OneDrive / Gửi Email đính kèm|X|-|Cần dịch vụ đám mây Microsoft
Trang đầu|Bảng nhớ tạm|Dán (Ctrl+V)|A|-|common.edit.paste
Trang đầu|Bảng nhớ tạm|Tùy chọn dán: Giữ định dạng nguồn / Chỉ giữ văn bản thuần (Ctrl+Shift+V)|V|-|Dán đặc biệt writer.edit.pasteSpecial đã so sánh định dạng nguồn và văn bản thuần bằng Word COM (docs/DOC-BUTTON-MATRIX-1011.md:17)
Trang đầu|Bảng nhớ tạm|Dán đặc biệt... (Ctrl+Alt+V) hộp thoại|A|-|writer.edit.pasteSpecial
Trang đầu|Bảng nhớ tạm|Cắt (Ctrl+X) / Sao chép (Ctrl+C)|V|-|FIX-T11 nhóm 1: common.edit.cut và copy thao tác CDP và Word COM khớp (docs/DOC-BUTTON-MATRIX-1011.md:14-15)
Trang đầu|Bảng nhớ tạm|Sao chép định dạng (Format Painter, Ctrl+Shift+C)|V|-|FIX-T11 nhóm 1: common.edit.formatPainter đã đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:16)
Trang đầu|Bảng nhớ tạm|Ngăn Clipboard (Office Clipboard đa mục)|N|3|Chưa có ngăn lưu nhiều mục clipboard lịch sử
Trang đầu|Phông chữ|Tên phông chữ (Font Family)|V|-|Phông chữ writer.font.family đối chiếu Word COM phông Arial (docs/DOC-BUTTON-MATRIX-1011.md:18, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:32)
Trang đầu|Phông chữ|Cỡ chữ (Font Size 8–72 pt)|V|-|Cỡ chữ writer.font.size đối chiếu Word COM cỡ chữ 16 pt (docs/DOC-BUTTON-MATRIX-1011.md:19, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:31)
Trang đầu|Phông chữ|Tăng / Giảm cỡ chữ (Ctrl+Shift+> / Ctrl+Shift+<)|V|-|FIX-T11 nhóm 1: writer.font.grow và shrink đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:20-21)
Trang đầu|Phông chữ|Tăng / Giảm cỡ chữ 1 điểm (Ctrl+] / Ctrl+[)|A|-|writer.font.grow1pt / shrink1pt
Trang đầu|Phông chữ|Đổi chữ hoa/thường (Shift+F3)|V|-|Đổi chữ hoa/thường writer.text.changeCase đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:28, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:44)
Trang đầu|Phông chữ|Hộp thoại Đổi chữ hoa/thường (Sentence case, UPPER, lower, Capitalize Each Word, tOGGLE)|A|-|writer.text.changeCaseDialog
Trang đầu|Phông chữ|Xóa định dạng (Clear All Formatting, Ctrl+Space)|V|-|FIX-T11 nhóm 1: writer.text.clearFormat đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:29)
Trang đầu|Phông chữ|Đậm (Ctrl+B) / Nghiêng (Ctrl+I)|V|-|Đậm và Nghiêng writer.text.bold/italic đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:22-23, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:25-26)
Trang đầu|Phông chữ|Gạch chân đơn (Ctrl+U)|V|-|Gạch chân đơn writer.text.underline đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:24, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:27)
Trang đầu|Phông chữ|Gạch chân đôi, nét đứt, lượn sóng|P|2|Có gạch chân đơn; thư viện kiểu gạch chân mở rộng chưa đầy đủ
Trang đầu|Phông chữ|Gạch ngang chữ (Strikethrough)|V|-|Gạch ngang chữ writer.text.strike đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:25, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:28)
Trang đầu|Phông chữ|Gạch ngang đôi (Double Strikethrough)|N|3|Chưa có gạch ngang đôi
Trang đầu|Phông chữ|Chỉ số dưới (Subscript, Ctrl+=) / Chỉ số trên (Superscript, Ctrl+Shift++)|V|-|Chỉ số dưới và trên writer.text.subscript/superscript đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:26-27, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:29-30)
Trang đầu|Phông chữ|Hiệu ứng chữ & Nghệ thuật (Text Effects: Outline, Shadow, Glow)|A|-|writer.format.textEffects, textOutline, textShadow, textGlow
Trang đầu|Phông chữ|Màu tô sáng văn bản (Highlight Color, Ctrl+Alt+H)|V|-|Màu tô sáng writer.color.highlight đối chiếu Word COM w:highlight yellow (docs/DOC-BUTTON-MATRIX-1011.md:30, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:34,46)
Trang đầu|Phông chữ|Màu chữ (Font Color)|V|-|Màu chữ writer.color.text đỏ #dc2626 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:31, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:33)
Trang đầu|Phông chữ|Hộp thoại Phông chữ (Ctrl+D)|A|-|writer.format.fontDialog
Trang đầu|Đoạn văn|Dấu đầu dòng (Bullets, Ctrl+Shift+L)|V|-|Dấu đầu dòng writer.list.bullet đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:32, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:38)
Trang đầu|Đoạn văn|Đánh số thứ tự (Numbering)|V|-|Đánh số thứ tự writer.list.numbered đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:33, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:39)
Trang đầu|Đoạn văn|Khởi động lại số (Restart numbering at 1) / Tiếp tục đánh số|A|-|writer.list.restartNumbering / continueNumbering
Trang đầu|Đoạn văn|Danh sách đa cấp (Multilevel List)|V|-|Danh sách đa cấp lồng qua w:numPr/w:ilvl đối chiếu Word COM (docs/word-oracle-1710.json:23-29, docs/WORD2016-FINDINGS-1710.md:44-48)
Trang đầu|Đoạn văn|Định nghĩa danh sách đa cấp mới (Define New Multilevel List)|A|-|writer.para.defineMultilevelList (apps/writer/writer-multilevel-dialog.js; adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py)
Trang đầu|Đoạn văn|Giảm thụt lề (Ctrl+Shift+M) / Tăng thụt lề (Ctrl+M)|V|-|Thụt lề writer.para.indentDec/Inc đối chiếu Word COM LeftIndent 36 pt (docs/DOC-BUTTON-MATRIX-1011.md:34-35, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:40,48)
Trang đầu|Đoạn văn|Thụt đầu dòng (First Line Indent 14.15 pt / 0.5 cm)|V|-|Thụt đầu dòng writer.para.firstLineIndent đối chiếu Word COM 14.15 pt (docs/DOC-BUTTON-MATRIX-1011.md:79, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:48,55)
Trang đầu|Đoạn văn|Sắp xếp đoạn văn / danh sách A-Z (Sort)|V|-|Sắp xếp đoạn văn writer.para.sort đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:36)
Trang đầu|Đoạn văn|Hiện/ẩn ký tự định dạng (Show/Hide ¶, Ctrl+*)|V|-|Hiện/ẩn ký tự định dạng writer.para.showFormattingMarks đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:37)
Trang đầu|Đoạn văn|Căn trái (Ctrl+L) / Căn giữa (Ctrl+E) / Căn phải (Ctrl+R)|V|-|Căn trái/giữa/phải writer.para.alignLeft/Center/Right đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:38-40, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:35-37)
Trang đầu|Đoạn văn|Căn đều hai bên (Justify, Ctrl+J)|V|-|Căn đều writer.para.justify đối chiếu Word COM Alignment=3 (docs/DOC-BUTTON-MATRIX-1011.md:41, docs/word-oracle-1710.json:2-8)
Trang đầu|Đoạn văn|Giãn dòng (1.0, 1.15, 1.5, 2.0) & Khoảng cách trước/sau đoạn|V|-|Giãn dòng 1.5 và SpaceAfter 8pt/160twips đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:41-43, docs/word-oracle-1710.json:9-15)
Trang đầu|Đoạn văn|Tô nền đoạn văn (Shading)|V|-|Tô nền đoạn văn writer.para.shading đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:42)
Trang đầu|Đoạn văn|Đường viền đoạn văn (Borders)|V|-|Viền đoạn văn writer.para.borders đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:43)
Trang đầu|Đoạn văn|Hộp thoại Đoạn văn (Paragraph Dialog)|A|-|writer.format.paragraphDialog
Trang đầu|Đoạn văn|Hộp thoại Điểm dừng Tab (Tabs Dialog: căn lề, ký tự dẫn leader)|V|-|writer.format.tabStops mở hộp thoại Dừng tab; lưu DOCX rồi Word 2016 COM đọc TabStops 141.8 pt trái và 340.2 pt phải dẫn chấm (tests/live/cdp/writer-tabstops.desktop.mjs; {{L:apps/writer/tab-stops.js|export function parseTabStops(value) {}} parseTabStops, {{L:platform/commands/command-definitions.js|id: "writer.format.tabStops"}})
Trang đầu|Kiểu|Thư viện kiểu (Styles Gallery: Normal, Heading 1–3)|V|-|Heading 1–3 đối chiếu thuộc tính Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:68,95)
Trang đầu|Kiểu|Kiểu dáng tùy biến / Bộ kiểu mới|P|2|Có Normal, Heading 1-3, Title, Quote; chưa có giao diện New Style dialog đầy đủ
Trang đầu|Kiểu|Ngăn kiểu dáng (Styles Pane, Alt+Ctrl+Shift+S)|V|-|writer.styles.pane mở ngăn kiểu dáng hiển thị vno-writer-styles-pane (tests/live/cdp/writer-panes.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "writer.styles.pane"}})
Trang đầu|Chỉnh sửa|Tìm kiếm (Ctrl+F) & Tìm tiếp/trước|V|-|Tìm kiếm common.edit.find MatchCase/toàn từ đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:45, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:70)
Trang đầu|Chỉnh sửa|Thay thế (Ctrl+H)|V|-|Thay thế common.edit.replace đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:46, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:70)
Trang đầu|Chỉnh sửa|Đi đến (Go To, Ctrl+G)|V|-|writer.edit.goTo: Ctrl+G mở hộp thoại Đi đến (trang, dòng, đề mục, dấu trang, bảng, chú thích); đi đến đề mục 3 rồi 1 đưa con trỏ đúng đoạn (tests/live/cdp/writer-goto.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "writer.edit.goTo"}}, {{L:adapters/libreoffice/writer/writer-adapter.js|  async openGoToDialog(options = {}) {}} openGoToDialog)
Trang đầu|Chỉnh sửa|Chọn: Chọn tất cả (Ctrl+A)|A|-|common.edit.selectAll
Trang đầu|Chỉnh sửa|Chọn: Chọn đối tượng / Ngăn chọn (Selection Pane)|V|-|writer.view.selectionPane mở ngăn chọn hiển thị danh sách đối tượng (tests/live/cdp/writer-panes.desktop.mjs; {{L:platform/commands/command-definitions.js|id: "writer.view.selectionPane"}})
Chèn|Trang|Trang bìa (Cover Page: 4 mẫu hành chính và báo cáo)|A|-|writer.insert.coverPage, removeCoverPage
Chèn|Trang|Trang trắng (Blank Page)|V|-|Trang trắng writer.page.blank đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:47)
Chèn|Trang|Ngắt trang (Page Break, Ctrl+Enter)|V|-|Ngắt trang writer.page.break đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:48, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:61)
Chèn|Bảng|Chèn bảng (Table Grid & Insert Table)|V|-|Bảng 3x4 writer.table.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:49, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79)
Chèn|Bảng|Bảng mẫu nhanh (Quick Tables)|V|-|writer.table.quickTables: chèn 3 mẫu Lịch, Danh sách công việc, SWOT matrix; đã đo kiểm đối chiếu Word 2016 COM (apps/writer/text-to-table-dialog.js:13-100, docs/word-oracle-tables-1710.json:66-96, tests/live/cdp/writer-table-parity.desktop.mjs:154-180)
Chèn|Bảng|Chuyển văn bản thành bảng (Convert Text to Table)|V|-|Chuyển văn bản thành bảng writer.table.fromText đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:50)
Chèn|Bảng|Chuyển bảng thành văn bản (Convert Table to Text)|V|-|writer.table.toText: chuyển bảng thành đoạn văn bản theo tab/dấu phẩy/chấm phẩy; đã đo kiểm đối chiếu Word 2016 COM ConvertToText(wdSeparateByTabs) (apps/writer/text-to-table-dialog.js:129-158, docs/word-oracle-tables-1710.json:17-27, tests/live/cdp/writer-table-parity.desktop.mjs:71-94)
Chèn|Bảng|Bảng tính Excel nhúng|N|2|Chưa có nhúng bảng tính Excel trực tiếp vào văn bản
Chèn|Minh họa|Hình ảnh từ tệp (Pictures)|V|-|Hình ảnh writer.image.insert kích thước và wrap đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:51, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74)
Chèn|Minh họa|Hình ảnh trực tuyến (Online Pictures)|X|-|Cần dịch vụ tìm kiếm hình ảnh trực tuyến
Chèn|Minh họa|Hình khối (Shapes - Chữ nhật, elip, mũi tên, đường thẳng)|V|-|Hình khối writer.shape.insert hình chữ nhật đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:52, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73)
Chèn|Minh họa|Sơ đồ (Diagram)|V|-|Sơ đồ writer.diagram.insert DrawingML 4 hình đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:53)
Chèn|Minh họa|Biểu đồ (Chart)|V|-|Biểu đồ writer.chart.insert kèm workbook nhúng đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:54)
Chèn|Minh họa|Chụp ảnh màn hình (Screenshot / Screen Clipping)|N|3|Chưa có công cụ chụp cửa sổ màn hình chèn vào văn bản
Chèn|Phần bổ trợ|Cửa hàng Add-in / Add-in của tôi|X|-|Cần dịch vụ cửa hàng Microsoft Office
Chèn|Phần bổ trợ|Wikipedia Add-in|X|-|Cần dịch vụ kết nối trực tuyến Wikipedia
Chèn|Phương tiện|Video trực tuyến (Online Video)|N|3|Chưa hỗ trợ nhúng video trực tuyến
Chèn|Liên kết|Siêu liên kết (Hyperlink, Ctrl+K)|V|-|Siêu liên kết common.edit.hyperlink đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:55)
Chèn|Liên kết|Đánh dấu vị trí (Bookmark)|V|-|Đánh dấu writer.insert.bookmark đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:56)
Chèn|Liên kết|Tham chiếu chéo (Cross-reference)|V|-|Tham chiếu chéo writer.insert.crossReference tới Heading đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:57, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:64)
Chèn|Bình luận|Nhận xét / Bình luận (Comment, Ctrl+Alt+M)|V|-|Bình luận writer.comment.insert tạo và resolve đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:66)
Chèn|Bình luận|Trả lời bình luận (Reply to Comment)|V|-|Trả lời bình luận writer.comment.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58)
Chèn|Đầu trang & Chân trang|Đầu trang (Header)|V|-|Đầu trang writer.header.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:59, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60)
Chèn|Đầu trang & Chân trang|Chân trang (Footer)|V|-|Chân trang writer.footer.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:60, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60)
Chèn|Đầu trang & Chân trang|Số trang (Page Number)|V|-|Số trang dynamic field PAGE/NUMPAGES đối chiếu Word COM (docs/word-oracle-1710.json:51-57, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60)
Chèn|Văn bản|Hộp văn bản (Text Box)|V|-|Hộp văn bản writer.insert.textbox đối chiếu Word COM kích thước/lề (docs/DOC-BUTTON-MATRIX-1011.md:61, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:72)
Chèn|Văn bản|Chữ nghệ thuật (WordArt)|A|-|writer.insert.wordart; xuất DrawingML text shape trang trí riêng, khác WordArt native có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:62)
Chèn|Văn bản|Chữ lớn đầu đoạn (Drop Cap)|V|-|Chữ lớn đầu đoạn writer.format.dropCap đối chiếu Word COM DropCap=1 (docs/DOC-BUTTON-MATRIX-1011.md:63, docs/word-oracle-1710.json:93-99)
Chèn|Văn bản|Khối dựng sẵn (Quick Parts / Building Blocks)|A|-|writer.insert.quickParts
Chèn|Văn bản|Dòng chữ ký (Signature Line)|N|3|Chưa có dòng chữ ký số
Chèn|Văn bản|Ngày & Giờ (Date & Time)|V|-|Ngày & Giờ writer.insert.dateTime đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:64)
Chèn|Văn bản|Đối tượng nhúng OLE (Object)|N|2|Chưa có hộp thoại chèn OLE object tùy ý
Chèn|Ký hiệu|Phương trình toán học (Equation, Alt+=)|V|-|Phương trình toán học writer.insert.equation đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:65)
Chèn|Ký hiệu|Ký hiệu đặc biệt (Symbol)|V|-|Ký hiệu writer.insert.symbol ©, ₫, ∑, → đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:66, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:71)
Thiết kế|Định dạng tài liệu|Chủ đề tài liệu (Themes)|V|-|Chủ đề văn bản writer.design.themeGallery đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:67)
Thiết kế|Định dạng tài liệu|Bộ kiểu dáng (Style Sets)|P|2|Có chuyển đổi kiểu dáng qua Style Gallery; chưa có bộ Style Sets gộp đầy đủ
Thiết kế|Định dạng tài liệu|Bảng màu chủ đề (Colors)|P|2|Có bảng màu theo chủ đề; chưa có hộp thoại chỉnh sửa Custom Theme Colors
Thiết kế|Định dạng tài liệu|Phông chữ chủ đề (Fonts)|P|2|Hỗ trợ phông mặc định theo theme; chưa có hộp thoại tạo Font Scheme mới
Thiết kế|Định dạng tài liệu|Khoảng cách đoạn văn chủ đề|P|2|Hỗ trợ giãn đoạn; chưa có menu preset khoảng cách đoạn cấp tài liệu
Thiết kế|Định dạng tài liệu|Hiệu ứng chủ đề (Effects)|N|3|Chưa có theme effects riêng cho đối tượng đồ họa
Thiết kế|Định dạng tài liệu|Đặt làm mặc định (Set as Default)|N|3|Chưa có nút lưu cấu hình chủ đề làm template mặc định
Thiết kế|Nền trang|Đóng dấu chìm / Hình mờ (Watermark)|V|-|Hình mờ writer.page.watermark đối chiếu Word COM header PowerPlusWaterMark (docs/DOC-BUTTON-MATRIX-1011.md:68)
Thiết kế|Nền trang|Màu nền trang (Page Color)|V|-|Màu trang writer.page.color đối chiếu Word COM màu #dbeafe (docs/DOC-BUTTON-MATRIX-1011.md:69)
Thiết kế|Nền trang|Đường viền trang (Page Borders)|V|-|Viền trang writer.page.border đối chiếu Word COM viền 3 pt (docs/DOC-BUTTON-MATRIX-1011.md:70)
Bố trí|Thiết lập trang|Căn lề trang (Margins - Normal, Narrow, Moderate, Wide)|V|-|Căn lề writer.page.margins 4 preset đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:71, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:58)
Bố trí|Thiết lập trang|Hướng giấy (Orientation - Dọc / Ngang)|V|-|Hướng giấy writer.page.orientation đối chiếu Word COM Orientation=1 (docs/DOC-BUTTON-MATRIX-1011.md:72, docs/word-oracle-1710.json:79-85)
Bố trí|Thiết lập trang|Khổ giấy (Size - A4, Letter, A5, Legal)|V|-|Khổ giấy writer.page.size A4/A5/Letter đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:73, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:58)
Bố trí|Thiết lập trang|Chia cột báo (Columns - 1, 2, 3 cột)|V|-|Cột báo writer.page.columns 1/2/3 cột đối chiếu Word COM TextColumns.Count=2 (docs/DOC-BUTTON-MATRIX-1011.md:74-77, docs/word-oracle-1710.json:100-106)
Bố trí|Thiết lập trang|Ngắt cột (Column Break)|A|-|writer.break.column
Bố trí|Thiết lập trang|Ngắt phần (Section Breaks: Next Page, Continuous, Even, Odd)|V|-|Ngắt phần 4 loại đối chiếu Word COM 5 section đúng sectionStart (docs/DOC-BUTTON-MATRIX-1011.md:48, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:61)
Bố trí|Thiết lập trang|Đánh số dòng (Line Numbers: Liên tục, Mỗi trang, Mỗi mục)|V|-|Đánh số dòng writer.layout.lineNumbers Active=-1 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:78, docs/word-oracle-1710.json:86-92)
Bố trí|Thiết lập trang|Ngắt từ tự động (Hyphenation)|A|-|writer.layout.hyphenation
Bố trí|Thiết lập trang|Hộp thoại Thiết lập trang (Page Setup Dialog)|A|-|writer.page.setupDialog
Bố trí|Đoạn văn|Thụt lề trái / phải chính xác (pt/cm)|V|-|Thụt lề trái/phải chính xác đối chiếu Word COM LeftIndent 36 pt (docs/DOC-BUTTON-MATRIX-1011.md:34-35, docs/word-oracle-1710.json:16-22)
Bố trí|Đoạn văn|Khoảng cách trước / sau đoạn chính xác (pt)|V|-|Khoảng cách trước sau đoạn writer.para.spacingBefore/After đối chiếu Word COM 12 pt (docs/DOC-BUTTON-MATRIX-1011.md:80-81, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:42-43)
Bố trí|Sắp xếp|Vị trí đối tượng trên trang (Position)|V|-|Vị trí đối tượng tọa độ Left/Top đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73-74)
Bố trí|Sắp xếp|Bao dòng chữ quanh hình (Wrap Text: Square, Tight, In Line)|V|-|Bao dòng chữ quanh hình Wrap Square đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74)
Bố trí|Sắp xếp|Đưa lên trước / Đưa về sau (Bring Forward / Send Backward)|A|-|Điều khiển lớp đưa lên / đưa về (apps/writer/writer-arrange-controller.js:299-315)
Bố trí|Sắp xếp|Ngăn lựa chọn đối tượng (Selection Pane)|V|-|writer.view.selectionPane: quản lý layer, ẩn/hiện, Z-Order, đổi tên đối tượng, đã đo kiểm đối chiếu Word COM (apps/writer/writer-arrange-controller.js:24-35, docs/word-oracle-writer2-1710.json:2-16)
Bố trí|Sắp xếp|Căn lề đối tượng đồ họa (Align Objects)|N|2|Chưa có công cụ căn lề đối tượng đồ họa trong Writer (mới có trên Sheet và Slides)
Bố trí|Sắp xếp|Nhóm / Bỏ nhóm đối tượng (Group / Ungroup)|V|-|writer.arrange.group (Ctrl+G) & writer.arrange.ungroup (Ctrl+Shift+G): tạo msoGroup và rã nhóm đối tượng, đã đo kiểm đối chiếu Word COM (apps/writer/writer-arrange-controller.js:20-25, docs/word-oracle-writer2-1710.json:17-26)
Bố trí|Sắp xếp|Xoay / Lật đối tượng (Rotate / Flip)|P|2|Hỗ trợ xoay hình cơ bản; lật đối xứng chưa có
Tham chiếu|Mục lục|Mục lục tự động (Table of Contents)|V|-|Mục lục tự động writer.reference.tocInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:84, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:62)
Tham chiếu|Mục lục|Thêm văn bản vào cấp mục lục (Add Text to Level)|P|2|Qua việc đổi kiểu Heading 1–3
Tham chiếu|Mục lục|Cập nhật mục lục (Update Table)|V|-|Cập nhật mục lục writer.reference.tocUpdate đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:85)
Tham chiếu|Chú thích|Chú thích chân trang (Footnote, Ctrl+Alt+F)|V|-|Chú thích chân trang writer.reference.footnoteInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:86, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63)
Tham chiếu|Chú thích|Chú thích cuối tài liệu (Endnote, Ctrl+Alt+D)|V|-|Chú thích cuối writer.reference.endnoteInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:87, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63)
Tham chiếu|Chú thích|Điều hướng chú thích (Next Footnote / Show Notes)|P|2|Có chèn; điều hướng bằng phím mũi tên
Tham chiếu|Chú thích|Hộp thoại Chú thích chân/cuối trang|P|2|Hỗ trợ qua thiết lập định dạng; chưa có hộp thoại gom chung
Tham chiếu|Nghiên cứu|Tra cứu thông minh (Smart Lookup)|X|-|Cần dịch vụ tìm kiếm Bing trực tuyến
Tham chiếu|Nghiên cứu|Nghiên cứu viên (Researcher)|X|-|Cần dịch vụ đám mây Microsoft Graph
Tham chiếu|Trích dẫn & Thư mục|Chèn trích dẫn (Insert Citation)|V|-|Chèn trích dẫn writer.reference.citationInsert MLA đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:88)
Tham chiếu|Trích dẫn & Thư mục|Quản lý nguồn tài liệu (Manage Sources)|V|-|Quản lý nguồn writer.reference.sourcesManage đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:89)
Tham chiếu|Trích dẫn & Thư mục|Kiểu trích dẫn (Citation Style: APA, MLA)|V|-|Kiểu trích dẫn writer.reference.citationStyle APA/MLA đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:90)
Tham chiếu|Trích dẫn & Thư mục|Thư mục tài liệu tham khảo (Bibliography / Works Cited)|V|-|Thư mục tài liệu writer.reference.bibliographyInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:91)
Tham chiếu|Tên chú thích|Chèn tên chú thích ảnh/bảng (Insert Caption)|V|-|Chú thích ảnh writer.reference.captionInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:92, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65)
Tham chiếu|Tên chú thích|Danh mục hình ảnh/bảng (Table of Figures)|V|-|Danh mục hình ảnh writer.reference.tofInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:93, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65)
Tham chiếu|Tên chú thích|Cập nhật danh mục hình ảnh (Update Table of Figures)|V|-|Cập nhật danh mục writer.reference.tofUpdate đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:94, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65)
Tham chiếu|Chỉ mục|Đánh dấu mục chỉ mục (Mark Index Entry)|A|-|writer.reference.indexMark (platform/commands/command-definitions.js:294)
Tham chiếu|Chỉ mục|Chèn bảng chỉ mục (Insert Index)|A|-|writer.reference.indexInsert (platform/commands/command-definitions.js:295)
Tham chiếu|Bảng pháp lý|Bảng trích dẫn pháp lý (Table of Authorities)|N|3|Chưa có bảng trích dẫn pháp lý chuyên ngành luật
Thư|Tạo|Tạo phong bì thư (Envelopes)|V|-|Phong bì writer.mailings.envelopes đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:95)
Thư|Tạo|Tạo nhãn địa chỉ (Labels)|V|-|Nhãn writer.mailings.labels đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:96)
Thư|Bắt đầu trộn thư|Bắt đầu trộn thư (Start Mail Merge)|V|-|Bắt đầu trộn thư writer.mailMerge.open đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:97)
Thư|Bắt đầu trộn thư|Nguồn dữ liệu người nhận (Select Recipients từ XLSX/CSV)|V|-|Nguồn dữ liệu writer.mailMerge.open nạp 2 bản ghi đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:97)
Thư|Bắt đầu trộn thư|Sửa danh sách người nhận (Edit Recipient List)|P|2|Nạp danh sách ngoài; chưa có bảng lọc/sắp xếp danh sách trực tiếp
Thư|Viết & Chèn trường|Chèn trường trộn thư (Insert Merge Field)|V|-|Chèn trường writer.mailMerge.insertField đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:98)
Thư|Viết & Chèn trường|Quy tắc điều kiện (Rules: If...Then...Else)|V|-|Quy tắc điều kiện writer.mailMerge.ifRule đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:99)
Thư|Viết & Chèn trường|Tô sáng trường trộn (Highlight Merge Fields)|P|2|Trường hiển thị có đánh dấu trực quan trong editor
Thư|Viết & Chèn trường|Khối địa chỉ (Address Block) & Lời chào (Greeting Line)|P|2|Có chèn trường riêng lẻ; chưa có wizard gộp khối địa chỉ
Thư|Viết & Chèn trường|Khớp trường dữ liệu (Match Fields)|P|2|Khớp theo tên cột trong file nguồn
Thư|Viết & Chèn trường|Cập nhật toàn bộ nhãn (Update Labels)|P|2|Đã hỗ trợ qua sinh hàng loạt nhãn từ nguồn
Thư|Xem trước kết quả|Xem trước kết quả (Preview Results)|V|-|Xem trước kết quả writer.mailMerge.preview đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:100)
Thư|Xem trước kết quả|Điều hướng bản ghi (Previous / Next Record)|V|-|Bản ghi trước/sau writer.mailMerge.prevRecord/nextRecord đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:101-102)
Thư|Xem trước kết quả|Tìm người nhận (Find Recipient)|P|2|Có thể tìm qua Find; chưa có hộp thoại lọc người nhận riêng
Thư|Xem trước kết quả|Tự động kiểm tra lỗi trộn thư (Auto Check for Errors)|N|3|Chưa có wizard kiểm tra lỗi trộn thư
Thư|Hoàn tất|Hoàn tất & Trộn (Finish & Merge: tạo tài liệu mới / in)|V|-|Hoàn tất & Trộn writer.mailMerge.finish đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:103)
Xem lại|Soát lỗi|Kiểm tra chính tả tiếng Việt (F7 / gạch đỏ)|V|-|Kiểm tra chính tả writer.review.toggleSpellCheck đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:104)
Xem lại|Soát lỗi|Từ điển từ đồng nghĩa (Thesaurus)|N|3|Chưa có từ điển từ đồng nghĩa tiếng Việt tích hợp
Xem lại|Soát lỗi|Đếm từ, ký tự, đoạn văn (Word Count)|V|-|Đếm từ writer.review.wordCount đối chiếu Word COM lệch <=0.05% (docs/DOC-BUTTON-MATRIX-1011.md:105)
Xem lại|Trợ năng|Kiểm tra trợ năng (Accessibility Checker)|N|3|Chưa có công cụ kiểm tra độ tương phản/alt-text trợ năng
Xem lại|Ngôn ngữ|Dịch văn bản (Translate)|A|-|ai.assistant.translate (platform/commands/command-definitions.js:686, apps/writer/writer-ribbon.js:586)
Xem lại|Ngôn ngữ|Thiết lập ngôn ngữ soát lỗi (Language Preferences)|P|2|Mặc định tiếng Việt vi-VN; chưa có menu đổi ngôn ngữ đoạn văn
Xem lại|Bình luận|Nhận xét mới (New Comment, Ctrl+Alt+M)|V|-|Thêm ghi chú writer.comment.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:66)
Xem lại|Bình luận|Xóa nhận xét (Delete Comment)|V|-|Xóa nhận xét writer.review.commentDelete đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:106)
Xem lại|Bình luận|Đã xử lý nhận xét (Resolve Comment)|V|-|Đã xử lý nhận xét writer.review.commentResolve đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:107)
Xem lại|Bình luận|Điều hướng nhận xét (Previous / Next Comment)|V|-|Nhận xét trước/sau writer.review.commentPrevious/Next đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:108-109)
Xem lại|Theo dõi thay đổi|Theo dõi thay đổi (Track Changes, Ctrl+Shift+E)|V|-|Theo dõi thay đổi writer.trackChanges.toggle đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:110, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:67)
Xem lại|Theo dõi thay đổi|Chế độ hiển thị đánh dấu (Simple / All / No Markup / Original)|A|-|writer.trackChanges.displaySimple/All/None/Original (platform/commands/command-definitions.js:228-232)
Xem lại|Theo dõi thay đổi|Bộ lọc hiển thị đánh dấu (Show Markup: Comments, Insertions, Deletions)|A|-|writer.trackChanges.showMarkup (platform/commands/command-definitions.js:233)
Xem lại|Theo dõi thay đổi|Chế độ bong bóng (Balloons: lề phải / trong dòng)|A|-|writer.trackChanges.balloons, balloonsRevisions, balloonsInline (platform/commands/command-definitions.js:234-238)
Xem lại|Theo dõi thay đổi|Ngăn xem lại (Reviewing Pane)|P|2|Danh sách thay đổi trong panel; chưa chia 2 chế độ dọc/ngang đầy đủ
Xem lại|Thay đổi|Chấp nhận thay đổi (Accept One / All)|V|-|Chấp nhận thay đổi writer.trackChanges.acceptOne/acceptAll đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:111-112)
Xem lại|Thay đổi|Từ chối thay đổi (Reject One / All)|V|-|Từ chối thay đổi writer.trackChanges.rejectOne/rejectAll đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:113-114)
Xem lại|Thay đổi|Điều hướng thay đổi (Previous / Next Change)|V|-|Thay đổi trước/sau writer.trackChanges.previous/next đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:115-116)
Xem lại|So sánh|So sánh hai tài liệu (Compare)|A|-|writer.review.compare (platform/commands/command-definitions.js:225)
Xem lại|So sánh|Gộp tài liệu (Combine)|A|-|writer.review.combine (platform/commands/command-definitions.js:226)
Xem lại|Bảo vệ|Hạn chế chỉnh sửa (Restrict Editing)|A|-|writer.review.restrictEditing (platform/commands/command-definitions.js:227)
Xem lại|Mực vẽ|Vẽ tay / Mực cảm ứng (Inking)|N|3|Chưa có công cụ vẽ tay bút cảm ứng
Chế độ xem|Chế độ xem sổ|Chế độ đọc (Read Mode)|V|-|Chế độ đọc writer.view.readMode đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:117)
Chế độ xem|Chế độ xem sổ|Bố trí in (Print Layout)|V|-|Bố trí in writer.view.printLayout đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:118)
Chế độ xem|Chế độ xem sổ|Bố trí Web (Web Layout)|V|-|Bố trí Web writer.view.webLayout đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:119)
Chế độ xem|Chế độ xem sổ|Chế độ Dàn bài (Outline View)|A|-|writer.view.outline, promote, demote, moveUp, moveDown, expand, collapse (platform/commands/command-definitions.js:67-76)
Chế độ xem|Chế độ xem sổ|Chế độ Bản nháp (Draft View)|A|-|writer.view.draft (platform/commands/command-definitions.js:68)
Chế độ xem|Chuyển trang|Cuộn trang dọc (Vertical Page Movement)|A|-|Cuộn trang dọc mặc định trong viewport (apps/writer/writer-view-controller.js:8-35)
Chế độ xem|Chuyển trang|Cuộn trang song song cạnh nhau (Side to Side)|N|3|Chưa có chế độ cuộn lật trang ngang
Chế độ xem|Hiển thị|Thước ngang và dọc (Ruler)|V|-|Thước writer.view.ruler đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:121)
Chế độ xem|Hiển thị|Đường lưới căn chỉnh (Gridlines)|V|-|Đường lưới writer.view.gridlines đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:122)
Chế độ xem|Hiển thị|Ngăn dẫn hướng (Navigation Pane, Ctrl+Alt+N)|V|-|Ngăn dẫn hướng writer.view.navigationPane đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:120)
Chế độ xem|Thu phóng|Hộp thoại Thu phóng (Zoom Dialog)|A|-|writer.view.zoomDialog (apps/writer/writer-zoom-dialog.js; apps/writer/writer-view-controller.js; platform/shell/app-shell.js)
Chế độ xem|Thu phóng|Thu phóng 100%|V|-|Thu phóng 100% writer.view.zoom100 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:124)
Chế độ xem|Thu phóng|Vừa chiều rộng trang (Page Width)|V|-|Chiều rộng trang writer.view.pageWidth đối chiếu Word COM PageFit=3 (docs/DOC-BUTTON-MATRIX-1011.md:126)
Chế độ xem|Thu phóng|Xem một trang (One Page) / Nhiều trang (Multiple Pages)|P|2|Tự co giãn theo kích thước màn hình; chưa có nút cố định 2-trang
Chế độ xem|Thu phóng|Phóng to / Thu nhỏ (Zoom In / Zoom Out)|V|-|Phóng to và thu nhỏ writer.view.zoomIn/zoomOut đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:123,125)
Chế độ xem|Cửa sổ|Cửa sổ mới (New Window)|A|-|writer.view.newWindow; mở WebView thứ hai độc lập, khác Word clone cửa sổ có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:128)
Chế độ xem|Cửa sổ|Sắp xếp tất cả cửa sổ (Arrange All)|N|3|Chưa có sắp xếp tile các cửa sổ app
Chế độ xem|Cửa sổ|Chia cửa sổ soạn thảo (Split Window)|V|-|writer.view.split: chia 2 phân vùng cuộn độc lập, thanh kéo tỉ lệ, đã đo kiểm đối chiếu Word COM (apps/writer/writer-split-view.js:1-25, docs/word-oracle-writer2-1710.json:27-36)
Chế độ xem|Cửa sổ|Xem song song (View Side by Side) & Cuộn đồng bộ|N|3|Chưa có xem 2 tài liệu song song có cuộn đồng bộ
Chế độ xem|Cửa sổ|Chuyển cửa sổ (Switch Windows)|P|3|Hệ điều hành quản lý cửa sổ; chưa có menu trong app
Chế độ xem|Macro|Quản lý Macro & Ghi Macro (Alt+F8, Ctrl+Shift+R)|A|-|common.macro.recordToggle/manager; Command Bus macro engine cục bộ, khác VBA Word có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:129-130)
Công cụ Bảng|Thiết kế|Tùy chọn kiểu bảng: Hàng tiêu đề (Header Row)|V|-|Hàng tiêu đề HeadingFormat=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56,79)
Công cụ Bảng|Thiết kế|Tùy chọn kiểu bảng: Hàng xen kẽ (Banded Rows)|V|-|writer.table.toggleBandedRows: bật/tắt màu nền xen kẽ giữa các hàng bảng; đã đo kiểm đối chiếu Word 2016 COM ApplyStyleRowBands (adapters/libreoffice/writer/writer-adapter.js:10117-10133, docs/word-oracle-tables-1710.json:43-47, tests/live/cdp/writer-table-parity.desktop.mjs:122-140)
Công cụ Bảng|Thiết kế|Tùy chọn kiểu bảng: Cột đầu, Cột cuối, Cột sọc|P|2|Đã có hàng tiêu đề và xen kẽ hàng; các tùy chọn cột cần bổ sung
Công cụ Bảng|Thiết kế|Thư viện kiểu bảng (Table Styles Gallery)|V|-|writer.table.stylesGallery: 32 mẫu bảng Plain, Grid, List; xuất w:tblStyle và w:tblLook chuẩn DOCX, đã đo kiểm đối chiếu Word COM (apps/writer/writer-table-styles.js:1-25, docs/word-oracle-writer2-1710.json:37-48)
Công cụ Bảng|Thiết kế|Màu nền ô bảng (Shading)|V|-|Bảng màu nền ô đối chiếu Word COM mã màu 15788258 (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83)
Công cụ Bảng|Thiết kế|Viền bảng (Borders dropdown: Tất cả, Viền ngoài, Viền trong, Không viền)|V|-|Viền bảng 4 kiểu viền đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,84)
Công cụ Bảng|Thiết kế|Độ dày và kiểu đường viền bảng|V|-|writer.table.bordersStyle: hộp thoại Kiểu viền… chọn nét liền, đứt, chấm, đôi, độ dày 0,25 đến 6 pt, màu và vùng áp dụng; lưu DOCX rồi Word 2016 COM đọc 4 cạnh ngoài LineStyle=4 LineWidth=18 là 2,25 pt Color=255; đồng thời sửa lỗi mất viền trái cột đầu khi lưu (tests/live/cdp/writer-table-borders-style.desktop.mjs; {{L:apps/writer/writer-table-borders-dialog.js|export function showTableBordersDialog}} showTableBordersDialog, {{L:platform/commands/command-definitions.js|id: "writer.table.bordersStyle"}})
Công cụ Bảng|Thiết kế|Vẽ bảng (Draw Table) & Tẩy viền (Eraser)|N|2|Chưa có công cụ vẽ viền tự do bằng chuột
Công cụ Bảng|Bố trí|Chọn ô, hàng, cột, bảng (Table Select)|V|-|writer.table.selectCell, selectRow, selectCol, selectTable: chọn ô, hàng, cột, toàn bộ bảng; đã đo kiểm đối chiếu Word 2016 COM Selection (apps/writer/writer-table.js:410-454, docs/word-oracle-tables-1710.json:48-65, tests/live/cdp/writer-table-parity.desktop.mjs:141-164)
Công cụ Bảng|Bố trí|Xem đường lưới bảng (View Gridlines)|V|-|writer.table.viewGridlines: bật/tắt đường viền lưới chấm mờ của bảng không viền; đã đo kiểm đối chiếu Word 2016 COM TableGridlines (adapters/libreoffice/writer/writer-adapter.js:10017-10026, docs/word-oracle-tables-1710.json:97-103, tests/live/cdp/writer-table-parity.desktop.mjs:181-197)
Công cụ Bảng|Bố trí|Thuộc tính bảng (Table Properties Dialog)|V|-|writer.table.properties: hộp thoại Bảng/Hàng/Cột/Ô (căn, thụt lề, độ rộng %, cm, chiều cao hàng, căn dọc, lề ô); lưu DOCX và Word COM đọc lại đúng (platform/commands/command-definitions.js:192, tests/live/cdp/writer-table-properties.desktop.mjs:162)
Công cụ Bảng|Bố trí|Chèn hàng trên / Chèn hàng dưới|V|-|Chèn hàng trên và dưới đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79)
Công cụ Bảng|Bố trí|Chèn cột trái / Chèn cột phải|V|-|Chèn cột trái và phải đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79)
Công cụ Bảng|Bố trí|Xóa hàng, xóa cột, xóa bảng|V|-|Xóa hàng, xóa cột, xóa bảng đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,83)
Công cụ Bảng|Bố trí|Gộp ô (Merge Cells)|V|-|Gộp ô ngang và dọc đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:55,83)
Công cụ Bảng|Bố trí|Tách ô (Split Cells)|V|-|Tách ô ngang và dọc đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:55,83)
Công cụ Bảng|Bố trí|Tách bảng (Split Table)|V|-|writer.table.splitTable: tách tại hàng chọn thành hai w:tbl, Undo một bước, Word COM đọc Tables.Count=2 (platform/commands/command-definitions.js:190, tests/live/cdp/writer-table-properties.desktop.mjs:53)
Công cụ Bảng|Bố trí|Tự khớp kích thước (AutoFit to Contents / Window)|V|-|Tự khớp kích thước AutoFit nội dung và cửa sổ đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83)
Công cụ Bảng|Bố trí|Chiều cao hàng & Chiều rộng cột chính xác|V|-|Chiều cao hàng w:trHeight exact 840 và kéo cột đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83)
Công cụ Bảng|Bố trí|Phân bố đều hàng & cột (Distribute Rows / Columns)|V|-|writer.table.distributeRows, distributeCols: căn đều chiều cao các hàng theo chiều cao trung bình và chia đều bề rộng cột %; đã đo kiểm đối chiếu Word 2016 COM DistributeHeight/DistributeWidth (adapters/libreoffice/writer/writer-adapter.js:10004-10034, docs/word-oracle-tables-1710.json:2-16, tests/live/cdp/writer-table-parity.desktop.mjs:47-70)
Công cụ Bảng|Bố trí|Căn lề ô theo chiều dọc (Top, Center, Bottom)|V|-|Căn giữa dọc ô bảng VerticalAlignment=1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56,79, docs/word-oracle-1710.json:30-36)
Công cụ Bảng|Bố trí|Xoay hướng chữ trong ô (Text Direction)|V|-|writer.table.textDirection: Ngang/90°/270° lưu w:textDirection, Word COM đọc Orientation=3 (platform/commands/command-definitions.js:191, tests/live/cdp/writer-table-properties.desktop.mjs:134)
Công cụ Bảng|Bố trí|Khoảng cách lề ô bảng (Cell Margins)|V|-|writer.table.properties tab Ô/Bảng: lề cm lưu w:tblCellMar/w:tcMar, Word COM đọc padding đúng (platform/commands/command-definitions.js:192, tests/live/cdp/writer-table-properties.desktop.mjs:134)
Công cụ Bảng|Bố trí|Lặp lại hàng tiêu đề qua các trang (Repeat Header Rows)|V|-|Lặp lại hàng tiêu đề HeadingFormat=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56)
Công cụ Bảng|Bố trí|Sắp xếp dữ liệu trong bảng (Sort Table)|V|-|writer.table.sort: sắp xếp các hàng dữ liệu A-Z theo cột đang chọn, giữ nguyên hàng tiêu đề; đã đo kiểm đối chiếu Word 2016 COM Table.Sort(ExcludeHeader) (adapters/libreoffice/writer/writer-adapter.js:1816-1851, docs/word-oracle-tables-1710.json:28-42, tests/live/cdp/writer-table-parity.desktop.mjs:95-121)
Công cụ Bảng|Bố trí|Công thức tính toán trong bảng (=SUM(ABOVE)...)|V|-|writer.table.formula: tính toán =SUM(ABOVE), =SUM(LEFT), AVERAGE, COUNT, MAX, MIN, PRODUCT, xuất w:fldSimple, đã đo kiểm đối chiếu Word COM (apps/writer/writer-table-formula-dialog.js:1-25, docs/word-oracle-writer2-1710.json:49-60)
Công cụ Hình ảnh|Định dạng|Xóa nền ảnh tự động (Remove Background)|N|3|Chưa có thuật toán tách nền ảnh
Công cụ Hình ảnh|Định dạng|Độ sáng & Tương phản (Corrections)|A|-|writer.image.corrections (platform/commands/command-definitions.js:206)
Công cụ Hình ảnh|Định dạng|Màu sắc ảnh & Đổi màu (Color / Recolor)|P|2|Hỗ trợ qua CSS filter; chưa xuất bộ lọc sang OOXML
Công cụ Hình ảnh|Định dạng|Hiệu ứng nghệ thuật (Artistic Effects)|N|3|Chưa có hiệu ứng bộ lọc tranh nghệ thuật
Công cụ Hình ảnh|Định dạng|Nén ảnh (Compress Pictures)|A|-|writer.image.compress (platform/commands/command-definitions.js:209)
Công cụ Hình ảnh|Định dạng|Thay đổi ảnh giữ nguyên kích thước (Change Picture)|A|-|writer.image.changePicture (platform/commands/command-definitions.js:207)
Công cụ Hình ảnh|Định dạng|Đặt lại ảnh về gốc (Reset Picture)|A|-|writer.image.resetPicture (platform/commands/command-definitions.js:208)
Công cụ Hình ảnh|Định dạng|Thư viện kiểu khung ảnh (Picture Styles Gallery)|P|2|Có bo góc, đổ bóng, viền ảnh; chưa có gallery preset phong phú
Công cụ Hình ảnh|Định dạng|Viền ảnh & Màu viền (Picture Border)|V|-|writer.image.border: hộp thoại Viền ảnh chọn nét liền, đứt, chấm, đôi, độ dày và màu; lưu DOCX rồi Word 2016 COM đọc Line.Visible, Weight 2,25 pt, DashStyle 4 và màu xanh (tests/live/cdp/writer-picture-border.desktop.mjs; {{L:adapters/libreoffice/writer/writer-adapter.js|  async setPictureBorder}} setPictureBorder, {{L:platform/commands/command-definitions.js|id: "writer.image.border"}})
Công cụ Hình ảnh|Định dạng|Cắt xén ảnh (Crop)|A|-|writer.image.crop (platform/commands/command-definitions.js:205)
Công cụ Hình ảnh|Định dạng|Kích thước ảnh chính xác (Chiều cao, Chiều rộng pt/cm)|V|-|Kích thước ảnh PNG đối chiếu Word COM 23.9x13.6 pt (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74)
Công cụ Hình ảnh|Định dạng|Tùy chọn ngắt dòng chữ (Wrap Text - In Line, Square, Tight, Behind, In Front)|V|-|Tùy chọn ngắt dòng chữ ảnh Wrap Square đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74)
Công cụ Vẽ|Định dạng|Chèn hình khối cơ bản (Chữ nhật, tròn, mũi tên...)|V|-|Hình khối chữ nhật writer.shape.insert Type 1 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:52, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73)
Công cụ Vẽ|Định dạng|Chỉnh sửa đỉnh hình dạng (Edit Points)|N|3|Chưa có chỉnh sửa node vector tự do
Công cụ Vẽ|Định dạng|Vẽ hộp văn bản (Draw Text Box)|V|-|Hộp văn bản writer.insert.textbox đối chiếu Word COM 53.6x19.5 pt (docs/DOC-BUTTON-MATRIX-1011.md:61, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:72)
Công cụ Vẽ|Định dạng|Màu tô hình khối (Shape Fill)|V|-|Màu tô hình khối fill đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73)
Công cụ Vẽ|Định dạng|Viền hình khối (Shape Outline)|V|-|Viền hình khối line 1.5 pt đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73)
Công cụ Vẽ|Định dạng|Hiệu ứng hình khối (Bóng đổ, 3-D)|P|2|Có bóng đổ cơ bản; hiệu ứng 3-D nâng cao chưa hỗ trợ
Công cụ Vẽ|Định dạng|Kiểu chữ nghệ thuật (WordArt Styles)|A|-|writer.insert.wordart; DrawingML text shape trang trí riêng, khác WordArt native có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:62)
Công cụ Vẽ|Định dạng|Màu tô & Viền chữ nghệ thuật|A|-|writer.insert.wordart: Màu tô và viền chữ nghệ thuật (apps/writer/writer-wordart.js:240-256)
Công cụ Vẽ|Định dạng|Hướng chữ trong hộp văn bản|P|2|Hỗ trợ qua CSS xoay; OOXML xuất cần kiểm tra
Công cụ Vẽ|Định dạng|Liên kết luồng chữ giữa hai hộp văn bản (Create Link)|N|3|Chưa hỗ trợ chảy văn bản nối tiếp giữa 2 textbox
Công cụ Đầu & Chân trang|Thiết kế|Chèn Đầu trang / Chân trang tiêu chuẩn|V|-|Đầu trang và Chân trang writer.header/footer.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:59-60, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60)
Công cụ Đầu & Chân trang|Thiết kế|Trang đầu khác biệt (Different First Page)|V|-|Trang đầu khác biệt DifferentFirstPage=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60, docs/word-oracle-1710.json:44-50)
Công cụ Đầu & Chân trang|Thiết kế|Trang chẵn và lẻ khác nhau (Different Odd & Even)|V|-|Trang chẵn và lẻ khác nhau OddAndEven=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60)
Công cụ Đầu & Chân trang|Thiết kế|Liên kết với mục trước (Link to Previous)|A|-|writer.section.linkToPrevious (platform/commands/command-definitions.js:265)
Công cụ Đầu & Chân trang|Thiết kế|Khoảng cách lề đầu/chân trang từ mép giấy|V|-|Khoảng cách lề đầu trang HeaderDistance 35.4 pt đối chiếu Word COM (docs/word-oracle-1710.json:44-50)
Công cụ Đầu & Chân trang|Thiết kế|Chèn ngày giờ / thông tin tài liệu vào đầu/chân trang|A|-|writer.insert.dateTime (apps/writer/writer-ribbon.js:351)
Công cụ Đầu & Chân trang|Thiết kế|Đóng chế độ sửa Đầu & Chân trang|X|-|Không áp dụng: đầu và chân trang của VN Writer luôn là vùng sửa trực tiếp trên trang, không có chế độ riêng nên không cần nút Đóng
Không thuộc ribbon|Bàn phím|Bàn phím điều hướng (Mũi tên, Ctrl+mũi tên, Home/End, PgUp/PgDn)|A|-|writer.nav.docStart (platform/commands/command-definitions.js:92-93, platform/help/entries-writer.js:851-856)
Không thuộc ribbon|Bàn phím|Bàn phím phím tắt định dạng (Ctrl+B, I, U, Space, Shift+F3, Ctrl+Shift+>, <)|V|-|Phím tắt định dạng Ctrl+B/I/U/Space đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:22-24, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:25-28)
Không thuộc ribbon|Bàn phím|Phím tắt quản lý tệp & chỉnh sửa (Ctrl+S, O, N, P, Z, Y, C, V, X, A, F, H, K)|A|-|common.file.save, common.edit.undo (platform/commands/command-definitions.js:20-40, platform/help/entries-writer.js:1505-1510)
Không thuộc ribbon|Bàn phím|Phím tắt phím Alt (KeyTips nổi)|N|2|Chưa có chế độ KeyTips đầy đủ như Word
Không thuộc ribbon|Bàn phím|Phím Tab và phím thụt lề|V|-|Phím Tab và thụt lề đoạn đối chiếu Word COM DefaultTabStop 36 pt (docs/word-oracle-1710.json:37-43, docs/WORD2016-FINDINGS-1710.md:39-43)
Không thuộc ribbon|Chuột|Chuột bôi đen chọn từ, đoạn, dòng, khối|A|-|Bôi đen bằng chuột (tests/live/cdp/writer-mini-toolbar.desktop.mjs:1-5, apps/writer/writer-mini-toolbar.js:20-50)
Không thuộc ribbon|Chuột|Thước căn lề tương tác (kéo lề, kéo thụt dòng đầu)|A|-|Thước kéo lề và thụt lề (tests/unit/writer-interactive-ruler.test.js:46-58, apps/writer/writer-ruler-controller.js:1-40)
Không thuộc ribbon|Chuột|Đặt điểm dừng tab tùy chỉnh trên thước|V|-|nút loại dừng tab ở góc thước (Trái/Giữa/Phải/Thập phân/Thanh) rồi nhấp thước; lưu DOCX rồi Word 2016 COM đọc TabStops 283.5 pt căn phải khi đặt 10 cm (tests/live/cdp/writer-ruler-tabs.desktop.mjs; {{L:apps/writer/writer-ruler-controller.js|/** Nút chọn loại dừng tab ở góc trái thước}} điểm dừng tab)
Không thuộc ribbon|Chuột|Thanh công cụ nổi mini khi bôi đen (Mini Toolbar)|V|-|bôi đen chữ bằng chuột thì thanh nổi hiện, nút Đậm làm đậm đúng từ, gõ phím thì ẩn (tests/live/cdp/writer-mini-toolbar.desktop.mjs; {{L:apps/writer/writer-mini-toolbar.js|export class WriterMiniToolbar}} Mini Toolbar)
Không thuộc ribbon|Chuột|Menu ngữ cảnh chuột phải trên văn bản|A|-|Menu ngữ cảnh văn bản chuột phải (apps/writer/writer-app.js:863-876)
Không thuộc ribbon|Chuột|Menu ngữ cảnh chuột phải trong bảng|V|-|Menu chuột phải trong bảng đối chiếu Word COM thêm/xóa hàng cột (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54-57)
Không thuộc ribbon|Chuột|Menu ngữ cảnh chuột phải hình ảnh & hình khối|V|-|Menu chuột phải hình ảnh/hình khối đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73-74)
Không thuộc ribbon|Thanh trạng thái|Thanh trạng thái: Số trang & Tổng số trang (Trang X trên Y)|N|3|Writer chưa hiển thị số trang hiện tại trên thanh trạng thái
Không thuộc ribbon|Thanh trạng thái|Thanh trạng thái: Đếm từ & số ký tự|V|-|Đếm từ trên thanh trạng thái đối chiếu Word COM trong FIX-T15 (docs/DOC-BUTTON-MATRIX-1011.md:105)
Không thuộc ribbon|Thanh trạng thái|Thanh trạng thái: Ngôn ngữ tài liệu & Kiểm tra chính tả|A|-|writer.review.toggleSpellCheck (apps/writer/writer-app.js:234, 570-577)
Không thuộc ribbon|Thanh trạng thái|Thanh trạng thái: Nút chuyển chế độ xem (Bố trí in, Đọc, Web)|V|-|Nút chuyển chế độ xem đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:117-119)
Không thuộc ribbon|Thanh trạng thái|Thanh trạng thái: Thanh trượt thu phóng (Zoom Slider & %)|V|-|Thanh trượt thu phóng đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:123-125)
Không thuộc ribbon|Hộp thoại|Đủ bộ hộp thoại văn phòng (Phông, Đoạn văn, Bảng, Thiết lập trang, Tìm/Thay, Ký hiệu)|A|-|writer.format.fontDialog, writer.format.paragraphDialog, writer.page.setupDialog, writer.insert.symbol (apps/writer/font-dialog.js:1-30, apps/writer/paragraph-dialog.js:1-30)
Không thuộc ribbon|Tính tương thích|Khứ hồi DOCX độ trung thực cao|A|-|Khứ hồi DOCX độ trung thực cao (tests/test_writer_save_roundtrip.py:1-10)
Không thuộc ribbon|Hiệu năng|Hiệu năng mở tệp lớn và độ nhạy gõ chữ|A|-|Hiệu năng mở tệp lớn và độ nhạy gõ chữ (docs/AUDIT-DOC-STABILITY-0610.md:1-24)
"""

ORDER = ["V", "A", "P", "N", "X"]
LABEL = {
    "V": "Đã đối chiếu Word 2016",
    "A": "Có, chưa đối chiếu",
    "P": "Có một phần",
    "N": "Chưa có",
    "X": "Ngoài phạm vi"
}
ICON = {"V": "✅", "A": "🟢", "P": "🟡", "N": "🔴", "X": "⚪"}

# 10 đề xuất phiếu việc kế tiếp theo mục 4 của brief
NEXT_TICKETS = [
    ("FIX-W1-TABS", "Bổ sung hộp thoại Điểm dừng Tab (Tabs Dialog) và tương tác đặt tab stops trên thước (căn trái, giữa, phải, thập phân kèm ký tự dẫn ...)", "Ưu tiên 1"),
    ("FIX-W2-PASSWORD", "Bổ sung mã hóa bảo vệ tài liệu DOCX bằng mật khẩu mở tệp chuẩn ECMA-376 / Standard Encryption", "Ưu tiên 1"),
    ("FIX-W4-SPLITVIEW", "Hỗ trợ chia cửa sổ soạn thảo (Split Window) cho tài liệu Writer dài (kế thừa cơ chế Split đã có của Sheet)", "Ưu tiên 2"),
    ("FIX-W5-SELECTIONPANE", "Tích hợp Ngăn lựa chọn đối tượng (Selection Pane) đầy đủ cho Writer để quản lý layer ảnh, hình khối, bảng và hộp văn bản", "Ưu tiên 2"),
    ("FIX-W6-TABLESTYLES", "Mở rộng thư viện kiểu dáng bảng biểu (Table Styles Gallery) với 30+ mẫu bảng phối màu chuẩn văn phòng", "Ưu tiên 2"),
    ("FIX-W7-GOTO", "Bổ sung hộp thoại Đi đến (Go To - Ctrl+G) hỗ trợ nhảy chính xác tới Trang, Dòng, Tiêu đề, Đánh dấu, Chú thích", "Ưu tiên 2"),
    ("FIX-W8-KEYTIPS", "Hỗ trợ chế độ phím tắt ký tự nổi Alt (KeyTips) trên toàn bộ thanh Ribbon của VN Writer", "Ưu tiên 2"),
    ("FIX-W9-TEXTBOXFLOW", "Hỗ trợ liên kết luồng văn bản giữa các hộp văn bản (TextBox Create Link / Text Flow) cho dàn trang báo chí", "Ưu tiên 3"),
    ("FIX-W10-AUTOTEXT", "Hoàn thiện trình quản lý khối dựng sẵn (Building Blocks Organizer) lưu trữ các mẫu văn bản hành chính Việt Nam", "Ưu tiên 2"),
]


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
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 5:
            raise SystemExit(f"Dòng sai định dạng: {line}")
        parts += [""] * (6 - len(parts))
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
    coverage = (total["V"] + total["A"] + 0.5 * total["P"]) / applicable * 100
    verified = total["V"] / applicable * 100

    out = []
    out.append("# Danh sách tính năng Word 2016 và trạng thái trong VN Writer\n")
    out.append("Chuẩn: Microsoft Word 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 17/10/2026 từ quét ribbon Word thật "
               "(`docs/ribbon-scan-word-1710.json`), ma trận đối chiếu song song (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md`), "
               "kết quả đo kiểm 15 tính năng ưu tiên 1 (`docs/WORD2016-FINDINGS-1710.md`), ma trận Hoàn tác (`docs/AUDIT-DOC-UNDO-FULL-1610.md`), "
               "đọc mã và kiểm thực tế. Sinh bằng `scripts/audit-0610/gen_word_checklist.py` (sửa dữ liệu trong script rồi chạy lại).\n")

    out.append("## Cách đọc\n")
    for key in ORDER:
        out.append(f"- {ICON[key]} **{LABEL[key]}**")
    out.append("\nƯu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.\n")

    out.append("## Tổng hợp\n")
    out.append("| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |\n|---|---|---|")
    for key in ORDER:
        out.append(f"| {ICON[key]} {LABEL[key]} | {total[key]} | {pct(total[key], applicable) if key != 'X' else '-'} |")
    out.append(f"| **Tổng** | **{len(rows)}** (áp dụng: {applicable}) | |\n")
    out.append(f"- **Độ phủ so với Word 2016 (có hoặc có một phần, một phần tính 0,5): {coverage:.0f}%**")
    out.append(f"- **Đã xác minh bằng đối chiếu Word 2016 thật: {verified:.0f}%** các mục áp dụng\n")
    out.append("Lưu ý: số mục chia đều cho mỗi dòng tính năng người dùng văn phòng; độ trung thực đối chiếu được xác nhận bằng Word COM thật.\n")

    out.append("## Theo tab\n")
    out.append("| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |\n|---|---|---|---|---|---|---|---|")
    for tab, items in by_tab.items():
        c = collections.Counter(i[3] for i in items)
        app = len(items) - c["X"]
        cov = (c["V"] + c["A"] + 0.5 * c["P"]) / app * 100 if app else 0
        out.append(f"| {tab} | {len(items)} | {c['V']} | {c['A']} | {c['P']} | {c['N']} | {c['X']} | {cov:.0f}% |")
    out.append("")

    out.append("## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1: danh sách 15 mục thiếu nhất)\n")
    gaps1 = [r for r in rows if r[3] in ("N", "P") and r[4] == "1"]
    out.append("| STT | Tab | Nhóm | Tính năng | Trạng thái | Ghi chú / Phần thiếu |\n|---|---|---|---|---|---|")
    for idx, r in enumerate(gaps1[:15], 1):
        out.append(f"| {idx} | {r[0]} | {r[1]} | {r[2]} | {ICON[r[3]]} | {r[5]} |")
    out.append(f"\nTổng: {len(gaps1)} mục ưu tiên 1 cần bổ sung/hoàn thiện.\n")

    out.append("## Đề xuất 10 phiếu việc kế tiếp\n")
    out.append("| Mã ticket | Mục tiêu & Phạm vi | Mức ưu tiên |\n|---|---|---|")
    for code, desc, prio in NEXT_TICKETS:
        out.append(f"| **{code}** | {desc} | {prio} |")
    out.append("")

    out.append("## Chi tiết từng tab\n")
    for tab, items in by_tab.items():
        out.append(f"### {tab}\n")
        out.append("| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |\n|---|---|---|---|---|")
        for r in items:
            out.append(f"| {r[1]} | {r[2]} | {ICON[r[3]]} | {r[4]} | {r[5]} |")
        out.append("")

    path = pathlib.Path(__file__).resolve().parents[2] / "docs" / "WORD2016-FEATURE-CHECKLIST.md"
    raw_bytes = "\n".join(out).encode("utf-8")
    assert not raw_bytes.startswith(b'\xef\xbb\xbf'), "Must not have BOM"
    path.write_bytes(raw_bytes)
    print(f"mục={len(rows)} áp dụng={applicable} V={total['V']} A={total['A']} P={total['P']} N={total['N']} X={total['X']}")
    print(f"độ phủ={coverage:.1f}% đã xác minh={verified:.1f}% ưu tiên-1 thiếu={len(gaps1)}")
    print(path)


if __name__ == "__main__":
    main()
