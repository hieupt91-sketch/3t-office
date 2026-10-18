# Danh sách tính năng Word 2016 và trạng thái trong VN Writer

Chuẩn: Microsoft Word 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 17/10/2026 từ quét ribbon Word thật (`docs/ribbon-scan-word-1710.json`), ma trận đối chiếu song song (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md`), kết quả đo kiểm 15 tính năng ưu tiên 1 (`docs/WORD2016-FINDINGS-1710.md`), ma trận Hoàn tác (`docs/AUDIT-DOC-UNDO-FULL-1610.md`), đọc mã và kiểm thực tế. Sinh bằng `scripts/audit-0610/gen_word_checklist.py` (sửa dữ liệu trong script rồi chạy lại).

## Cách đọc

- ✅ **Đã đối chiếu Word 2016**
- 🟢 **Có, chưa đối chiếu**
- 🟡 **Có một phần**
- 🔴 **Chưa có**
- ⚪ **Ngoài phạm vi**

Ưu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.

## Tổng hợp

| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |
|---|---|---|
| ✅ Đã đối chiếu Word 2016 | 157 | 58% |
| 🟢 Có, chưa đối chiếu | 71 | 26% |
| 🟡 Có một phần | 18 | 7% |
| 🔴 Chưa có | 26 | 10% |
| ⚪ Ngoài phạm vi | 7 | - |
| **Tổng** | **279** (áp dụng: 272) | |

- **Độ phủ so với Word 2016 (có hoặc có một phần, một phần tính 0,5): 87%**
- **Đã xác minh bằng đối chiếu Word 2016 thật: 58%** các mục áp dụng

Lưu ý: số mục chia đều cho mỗi dòng tính năng người dùng văn phòng; độ trung thực đối chiếu được xác nhận bằng Word COM thật.

## Theo tab

| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |
|---|---|---|---|---|---|---|---|
| Tệp (Backstage) | 17 | 1 | 14 | 0 | 1 | 1 | 94% |
| Trang đầu | 47 | 33 | 11 | 1 | 2 | 0 | 95% |
| Chèn | 34 | 23 | 3 | 0 | 5 | 3 | 84% |
| Thiết kế | 10 | 4 | 0 | 4 | 2 | 0 | 60% |
| Bố trí | 18 | 12 | 4 | 1 | 1 | 0 | 92% |
| Tham chiếu | 19 | 11 | 3 | 2 | 1 | 2 | 88% |
| Thư | 16 | 9 | 3 | 3 | 1 | 0 | 84% |
| Xem lại | 22 | 10 | 7 | 2 | 3 | 0 | 82% |
| Chế độ xem | 21 | 10 | 7 | 1 | 3 | 0 | 83% |
| Công cụ Bảng | 26 | 24 | 1 | 0 | 1 | 0 | 96% |
| Công cụ Hình ảnh | 12 | 3 | 5 | 2 | 2 | 0 | 75% |
| Công cụ Vẽ | 10 | 4 | 2 | 2 | 2 | 0 | 70% |
| Công cụ Đầu & Chân trang | 7 | 4 | 2 | 0 | 0 | 1 | 100% |
| Không thuộc ribbon | 20 | 9 | 9 | 0 | 2 | 0 | 90% |

## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1: danh sách 15 mục thiếu nhất)

| STT | Tab | Nhóm | Tính năng | Trạng thái | Ghi chú / Phần thiếu |
|---|---|---|---|---|---|
| 1 | Tệp (Backstage) | Thông tin | Bảo vệ tài liệu: Mật khẩu mở file (mã hóa DOCX) | 🔴 | Chưa có cơ chế mã hóa mật khẩu mở file DOCX |

Tổng: 1 mục ưu tiên 1 cần bổ sung/hoàn thiện.

## Đề xuất 10 phiếu việc kế tiếp

| Mã ticket | Mục tiêu & Phạm vi | Mức ưu tiên |
|---|---|---|
| **FIX-W1-TABS** | Bổ sung hộp thoại Điểm dừng Tab (Tabs Dialog) và tương tác đặt tab stops trên thước (căn trái, giữa, phải, thập phân kèm ký tự dẫn ...) | Ưu tiên 1 |
| **FIX-W2-PASSWORD** | Bổ sung mã hóa bảo vệ tài liệu DOCX bằng mật khẩu mở tệp chuẩn ECMA-376 / Standard Encryption | Ưu tiên 1 |
| **FIX-W4-SPLITVIEW** | Hỗ trợ chia cửa sổ soạn thảo (Split Window) cho tài liệu Writer dài (kế thừa cơ chế Split đã có của Sheet) | Ưu tiên 2 |
| **FIX-W5-SELECTIONPANE** | Tích hợp Ngăn lựa chọn đối tượng (Selection Pane) đầy đủ cho Writer để quản lý layer ảnh, hình khối, bảng và hộp văn bản | Ưu tiên 2 |
| **FIX-W6-TABLESTYLES** | Mở rộng thư viện kiểu dáng bảng biểu (Table Styles Gallery) với 30+ mẫu bảng phối màu chuẩn văn phòng | Ưu tiên 2 |
| **FIX-W7-GOTO** | Bổ sung hộp thoại Đi đến (Go To - Ctrl+G) hỗ trợ nhảy chính xác tới Trang, Dòng, Tiêu đề, Đánh dấu, Chú thích | Ưu tiên 2 |
| **FIX-W8-KEYTIPS** | Hỗ trợ chế độ phím tắt ký tự nổi Alt (KeyTips) trên toàn bộ thanh Ribbon của VN Writer | Ưu tiên 2 |
| **FIX-W9-TEXTBOXFLOW** | Hỗ trợ liên kết luồng văn bản giữa các hộp văn bản (TextBox Create Link / Text Flow) cho dàn trang báo chí | Ưu tiên 3 |
| **FIX-W10-AUTOTEXT** | Hoàn thiện trình quản lý khối dựng sẵn (Building Blocks Organizer) lưu trữ các mẫu văn bản hành chính Việt Nam | Ưu tiên 2 |

## Chi tiết từng tab

### Tệp (Backstage)

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Tệp | Mới (Ctrl+N) | 🟢 | - | common.file.new |
| Tệp | Mở (Ctrl+O): DOCX, DOC, ODT, RTF, TXT | 🟢 | - | Mở các định dạng văn bản qua LibreOffice adapter (docs/AUDIT-DOC-CORPUS-0610.md:3-7; chưa đối chiếu bằng Word COM) |
| Tệp | Mở gần đây (danh sách tệp) | 🟢 | - | Danh sách tệp gần đây (platform/recent/recent-manager.js:32-45) |
| Tệp | Lưu (Ctrl+S) | 🟢 | - | common.file.save; lưu DOCX khứ hồi trong các nhóm lệnh (chưa có phép đo Word COM riêng cho nút Lưu Backstage) |
| Tệp | Lưu bản sao / Lưu thành (F12): DOCX, DOC, ODT, FODT, HTML | 🟢 | - | common.file.saveAs |
| Tệp | Xuất PDF | 🟢 | - | common.file.exportPdf |
| Tệp | Xuất và chuyển đổi định dạng (giữ bố cục) | 🟢 | - | common.file.exportConvert |
| Tệp | In (Ctrl+P) & Xem trước khi in (Ctrl+F2) | ✅ | - | Hộp thoại in nội bộ và xem trước trang A4 khớp Word COM 595.35x841.95 pt (docs/DOC-BUTTON-MATRIX-1011.md:82-83) |
| Tệp | Đóng (Ctrl+W) | 🟢 | - | common.file.close |
| Thông tin | Bảo vệ tài liệu: Đánh dấu là cuối cùng (Mark as Final / Read-only) | 🟢 | - | writer.file.markAsFinal (platform/commands/command-definitions.js:243) |
| Thông tin | Bảo vệ tài liệu: Mật khẩu mở file (mã hóa DOCX) | 🔴 | 1 | Chưa có cơ chế mã hóa mật khẩu mở file DOCX |
| Thông tin | Kiểm tra tài liệu (Inspect Document - loại bỏ metadata, comment ẩn) | 🟢 | - | writer.file.inspectDocument (platform/commands/command-definitions.js:244) |
| Thông tin | Quản lý tài liệu: Tự động khôi phục (AutoRecover) | 🟢 | - | Tự động khôi phục AutoRecover (platform/autorecover/auto-recover.js:1-35) |
| Thông tin | Thuộc tính tài liệu (Title, Author, Subject, Keywords...) | 🟢 | - | writer.file.properties (platform/commands/command-definitions.js:242) |
| Tùy chọn | Tùy chọn Word (Hộp thoại Options) | 🟢 | - | writer.file.options (platform/commands/command-definitions.js:245) |
| Tùy chọn | Tùy biến Thanh công cụ truy nhanh (Quick Access Toolbar) | 🟢 | - | Thanh công cụ truy nhanh tùy biến (tests/unit/quick-access.test.js:1-25) |
| Chia sẻ | Chia sẻ / OneDrive / Gửi Email đính kèm | ⚪ | - | Cần dịch vụ đám mây Microsoft |

### Trang đầu

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Bảng nhớ tạm | Dán (Ctrl+V) | 🟢 | - | common.edit.paste |
| Bảng nhớ tạm | Tùy chọn dán: Giữ định dạng nguồn / Chỉ giữ văn bản thuần (Ctrl+Shift+V) | ✅ | - | Dán đặc biệt writer.edit.pasteSpecial đã so sánh định dạng nguồn và văn bản thuần bằng Word COM (docs/DOC-BUTTON-MATRIX-1011.md:17) |
| Bảng nhớ tạm | Dán đặc biệt... (Ctrl+Alt+V) hộp thoại | 🟢 | - | writer.edit.pasteSpecial |
| Bảng nhớ tạm | Cắt (Ctrl+X) / Sao chép (Ctrl+C) | ✅ | - | FIX-T11 nhóm 1: common.edit.cut và copy thao tác CDP và Word COM khớp (docs/DOC-BUTTON-MATRIX-1011.md:14-15) |
| Bảng nhớ tạm | Sao chép định dạng (Format Painter, Ctrl+Shift+C) | ✅ | - | FIX-T11 nhóm 1: common.edit.formatPainter đã đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:16) |
| Bảng nhớ tạm | Ngăn Clipboard (Office Clipboard đa mục) | 🔴 | 3 | Chưa có ngăn lưu nhiều mục clipboard lịch sử |
| Phông chữ | Tên phông chữ (Font Family) | ✅ | - | Phông chữ writer.font.family đối chiếu Word COM phông Arial (docs/DOC-BUTTON-MATRIX-1011.md:18, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:32) |
| Phông chữ | Cỡ chữ (Font Size 8–72 pt) | ✅ | - | Cỡ chữ writer.font.size đối chiếu Word COM cỡ chữ 16 pt (docs/DOC-BUTTON-MATRIX-1011.md:19, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:31) |
| Phông chữ | Tăng / Giảm cỡ chữ (Ctrl+Shift+> / Ctrl+Shift+<) | ✅ | - | FIX-T11 nhóm 1: writer.font.grow và shrink đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:20-21) |
| Phông chữ | Tăng / Giảm cỡ chữ 1 điểm (Ctrl+] / Ctrl+[) | 🟢 | - | writer.font.grow1pt / shrink1pt |
| Phông chữ | Đổi chữ hoa/thường (Shift+F3) | ✅ | - | Đổi chữ hoa/thường writer.text.changeCase đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:28, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:44) |
| Phông chữ | Hộp thoại Đổi chữ hoa/thường (Sentence case, UPPER, lower, Capitalize Each Word, tOGGLE) | 🟢 | - | writer.text.changeCaseDialog |
| Phông chữ | Xóa định dạng (Clear All Formatting, Ctrl+Space) | ✅ | - | FIX-T11 nhóm 1: writer.text.clearFormat đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:29) |
| Phông chữ | Đậm (Ctrl+B) / Nghiêng (Ctrl+I) | ✅ | - | Đậm và Nghiêng writer.text.bold/italic đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:22-23, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:25-26) |
| Phông chữ | Gạch chân đơn (Ctrl+U) | ✅ | - | Gạch chân đơn writer.text.underline đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:24, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:27) |
| Phông chữ | Gạch chân đôi, nét đứt, lượn sóng | 🟢 | - | writer.format.fontDialog (Ctrl+D) có Một nét, Hai nét, Nét đậm, Chấm, Gạch ngang, Lượn sóng + màu gạch chân; lưu DOCX rồi Word 2016 thật đọc Font.Underline = 3/6/4/7/11 đúng từng kiểu (tests/live/cdp/writer-underline-styles.desktop.mjs, scripts/audit-0610/word_underline_readback.ps1); chưa có các kiểu hiếm của Word (chấm-gạch, gạch dài, chỉ gạch dưới từ) |
| Phông chữ | Gạch ngang chữ (Strikethrough) | ✅ | - | Gạch ngang chữ writer.text.strike đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:25, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:28) |
| Phông chữ | Gạch ngang đôi (Double Strikethrough) | 🔴 | 3 | Chưa có gạch ngang đôi |
| Phông chữ | Chỉ số dưới (Subscript, Ctrl+=) / Chỉ số trên (Superscript, Ctrl+Shift++) | ✅ | - | Chỉ số dưới và trên writer.text.subscript/superscript đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:26-27, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:29-30) |
| Phông chữ | Hiệu ứng chữ & Nghệ thuật (Text Effects: Outline, Shadow, Glow) | 🟢 | - | writer.format.textEffects, textOutline, textShadow, textGlow |
| Phông chữ | Màu tô sáng văn bản (Highlight Color, Ctrl+Alt+H) | ✅ | - | Màu tô sáng writer.color.highlight đối chiếu Word COM w:highlight yellow (docs/DOC-BUTTON-MATRIX-1011.md:30, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:34,46) |
| Phông chữ | Màu chữ (Font Color) | ✅ | - | Màu chữ writer.color.text đỏ #dc2626 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:31, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:33) |
| Phông chữ | Hộp thoại Phông chữ (Ctrl+D) | 🟢 | - | writer.format.fontDialog |
| Đoạn văn | Dấu đầu dòng (Bullets, Ctrl+Shift+L) | ✅ | - | Dấu đầu dòng writer.list.bullet đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:32, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:38) |
| Đoạn văn | Đánh số thứ tự (Numbering) | ✅ | - | Đánh số thứ tự writer.list.numbered đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:33, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:39) |
| Đoạn văn | Khởi động lại số (Restart numbering at 1) / Tiếp tục đánh số | 🟢 | - | writer.list.restartNumbering / continueNumbering |
| Đoạn văn | Danh sách đa cấp (Multilevel List) | ✅ | - | Danh sách đa cấp lồng qua w:numPr/w:ilvl đối chiếu Word COM (docs/word-oracle-1710.json:23-29, docs/WORD2016-FINDINGS-1710.md:44-48) |
| Đoạn văn | Định nghĩa danh sách đa cấp mới (Define New Multilevel List) | 🟢 | - | writer.para.defineMultilevelList (apps/writer/writer-multilevel-dialog.js; adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py) |
| Đoạn văn | Giảm thụt lề (Ctrl+Shift+M) / Tăng thụt lề (Ctrl+M) | ✅ | - | Thụt lề writer.para.indentDec/Inc đối chiếu Word COM LeftIndent 36 pt (docs/DOC-BUTTON-MATRIX-1011.md:34-35, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:40,48) |
| Đoạn văn | Thụt đầu dòng (First Line Indent 14.15 pt / 0.5 cm) | ✅ | - | Thụt đầu dòng writer.para.firstLineIndent đối chiếu Word COM 14.15 pt (docs/DOC-BUTTON-MATRIX-1011.md:79, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:48,55) |
| Đoạn văn | Sắp xếp đoạn văn / danh sách A-Z (Sort) | ✅ | - | Sắp xếp đoạn văn writer.para.sort đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:36) |
| Đoạn văn | Hiện/ẩn ký tự định dạng (Show/Hide ¶, Ctrl+*) | ✅ | - | Hiện/ẩn ký tự định dạng writer.para.showFormattingMarks đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:37) |
| Đoạn văn | Căn trái (Ctrl+L) / Căn giữa (Ctrl+E) / Căn phải (Ctrl+R) | ✅ | - | Căn trái/giữa/phải writer.para.alignLeft/Center/Right đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:38-40, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:35-37) |
| Đoạn văn | Căn đều hai bên (Justify, Ctrl+J) | ✅ | - | Căn đều writer.para.justify đối chiếu Word COM Alignment=3 (docs/DOC-BUTTON-MATRIX-1011.md:41, docs/word-oracle-1710.json:2-8) |
| Đoạn văn | Giãn dòng (1.0, 1.15, 1.5, 2.0) & Khoảng cách trước/sau đoạn | ✅ | - | Giãn dòng 1.5 và SpaceAfter 8pt/160twips đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:41-43, docs/word-oracle-1710.json:9-15) |
| Đoạn văn | Tô nền đoạn văn (Shading) | ✅ | - | Tô nền đoạn văn writer.para.shading đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:42) |
| Đoạn văn | Đường viền đoạn văn (Borders) | ✅ | - | Viền đoạn văn writer.para.borders đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:43) |
| Đoạn văn | Hộp thoại Đoạn văn (Paragraph Dialog) | 🟢 | - | writer.format.paragraphDialog |
| Đoạn văn | Hộp thoại Điểm dừng Tab (Tabs Dialog: căn lề, ký tự dẫn leader) | ✅ | - | writer.format.tabStops mở hộp thoại Dừng tab; lưu DOCX rồi Word 2016 COM đọc TabStops 141.8 pt trái và 340.2 pt phải dẫn chấm (tests/live/cdp/writer-tabstops.desktop.mjs; apps/writer/tab-stops.js:26 parseTabStops, platform/commands/command-definitions.js:277) |
| Kiểu | Thư viện kiểu (Styles Gallery: Normal, Heading 1–3) | ✅ | - | Heading 1–3 đối chiếu thuộc tính Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:68,95) |
| Kiểu | Kiểu dáng tùy biến / Bộ kiểu mới | 🟡 | 2 | Có Normal, Heading 1-3, Title, Quote; chưa có giao diện New Style dialog đầy đủ |
| Kiểu | Ngăn kiểu dáng (Styles Pane, Alt+Ctrl+Shift+S) | ✅ | - | writer.styles.pane mở ngăn kiểu dáng hiển thị vno-writer-styles-pane (tests/live/cdp/writer-panes.desktop.mjs; platform/commands/command-definitions.js:123) |
| Chỉnh sửa | Tìm kiếm (Ctrl+F) & Tìm tiếp/trước | ✅ | - | Tìm kiếm common.edit.find MatchCase/toàn từ đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:45, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:70) |
| Chỉnh sửa | Thay thế (Ctrl+H) | ✅ | - | Thay thế common.edit.replace đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:46, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:70) |
| Chỉnh sửa | Đi đến (Go To, Ctrl+G) | ✅ | - | writer.edit.goTo: Ctrl+G mở hộp thoại Đi đến (trang, dòng, đề mục, dấu trang, bảng, chú thích); đi đến đề mục 3 rồi 1 đưa con trỏ đúng đoạn (tests/live/cdp/writer-goto.desktop.mjs; platform/commands/command-definitions.js:98, {{L:adapters/libreoffice/writer/writer-adapter.js |
| Chỉnh sửa | Chọn: Chọn tất cả (Ctrl+A) | 🟢 | - | common.edit.selectAll |
| Chỉnh sửa | Chọn: Chọn đối tượng / Ngăn chọn (Selection Pane) | ✅ | - | writer.view.selectionPane mở ngăn chọn hiển thị danh sách đối tượng (tests/live/cdp/writer-panes.desktop.mjs; platform/commands/command-definitions.js:94) |

### Chèn

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Trang | Trang bìa (Cover Page: 4 mẫu hành chính và báo cáo) | 🟢 | - | writer.insert.coverPage, removeCoverPage |
| Trang | Trang trắng (Blank Page) | ✅ | - | Trang trắng writer.page.blank đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:47) |
| Trang | Ngắt trang (Page Break, Ctrl+Enter) | ✅ | - | Ngắt trang writer.page.break đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:48, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:61) |
| Bảng | Chèn bảng (Table Grid & Insert Table) | ✅ | - | Bảng 3x4 writer.table.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:49, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79) |
| Bảng | Bảng mẫu nhanh (Quick Tables) | ✅ | - | writer.table.quickTables: chèn 3 mẫu Lịch, Danh sách công việc, SWOT matrix; đã đo kiểm đối chiếu Word 2016 COM (apps/writer/text-to-table-dialog.js:13-100, docs/word-oracle-tables-1710.json:66-96, tests/live/cdp/writer-table-parity.desktop.mjs:154-180) |
| Bảng | Chuyển văn bản thành bảng (Convert Text to Table) | ✅ | - | Chuyển văn bản thành bảng writer.table.fromText đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:50) |
| Bảng | Chuyển bảng thành văn bản (Convert Table to Text) | ✅ | - | writer.table.toText: chuyển bảng thành đoạn văn bản theo tab/dấu phẩy/chấm phẩy; đã đo kiểm đối chiếu Word 2016 COM ConvertToText(wdSeparateByTabs) (apps/writer/text-to-table-dialog.js:129-158, docs/word-oracle-tables-1710.json:17-27, tests/live/cdp/writer-table-parity.desktop.mjs:71-94) |
| Bảng | Bảng tính Excel nhúng | 🔴 | 2 | Chưa có nhúng bảng tính Excel trực tiếp vào văn bản |
| Minh họa | Hình ảnh từ tệp (Pictures) | ✅ | - | Hình ảnh writer.image.insert kích thước và wrap đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:51, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74) |
| Minh họa | Hình ảnh trực tuyến (Online Pictures) | ⚪ | - | Cần dịch vụ tìm kiếm hình ảnh trực tuyến |
| Minh họa | Hình khối (Shapes - Chữ nhật, elip, mũi tên, đường thẳng) | ✅ | - | Hình khối writer.shape.insert hình chữ nhật đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:52, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73) |
| Minh họa | Sơ đồ (Diagram) | ✅ | - | Sơ đồ writer.diagram.insert DrawingML 4 hình đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:53) |
| Minh họa | Biểu đồ (Chart) | ✅ | - | Biểu đồ writer.chart.insert kèm workbook nhúng đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:54) |
| Minh họa | Chụp ảnh màn hình (Screenshot / Screen Clipping) | 🔴 | 3 | Chưa có công cụ chụp cửa sổ màn hình chèn vào văn bản |
| Phần bổ trợ | Cửa hàng Add-in / Add-in của tôi | ⚪ | - | Cần dịch vụ cửa hàng Microsoft Office |
| Phần bổ trợ | Wikipedia Add-in | ⚪ | - | Cần dịch vụ kết nối trực tuyến Wikipedia |
| Phương tiện | Video trực tuyến (Online Video) | 🔴 | 3 | Chưa hỗ trợ nhúng video trực tuyến |
| Liên kết | Siêu liên kết (Hyperlink, Ctrl+K) | ✅ | - | Siêu liên kết common.edit.hyperlink đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:55) |
| Liên kết | Đánh dấu vị trí (Bookmark) | ✅ | - | Đánh dấu writer.insert.bookmark đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:56) |
| Liên kết | Tham chiếu chéo (Cross-reference) | ✅ | - | Tham chiếu chéo writer.insert.crossReference tới Heading đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:57, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:64) |
| Bình luận | Nhận xét / Bình luận (Comment, Ctrl+Alt+M) | ✅ | - | Bình luận writer.comment.insert tạo và resolve đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:66) |
| Bình luận | Trả lời bình luận (Reply to Comment) | ✅ | - | Trả lời bình luận writer.comment.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58) |
| Đầu trang & Chân trang | Đầu trang (Header) | ✅ | - | Đầu trang writer.header.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:59, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60) |
| Đầu trang & Chân trang | Chân trang (Footer) | ✅ | - | Chân trang writer.footer.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:60, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60) |
| Đầu trang & Chân trang | Số trang (Page Number) | ✅ | - | Số trang dynamic field PAGE/NUMPAGES đối chiếu Word COM (docs/word-oracle-1710.json:51-57, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60) |
| Văn bản | Hộp văn bản (Text Box) | ✅ | - | Hộp văn bản writer.insert.textbox đối chiếu Word COM kích thước/lề (docs/DOC-BUTTON-MATRIX-1011.md:61, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:72) |
| Văn bản | Chữ nghệ thuật (WordArt) | 🟢 | - | writer.insert.wordart; xuất DrawingML text shape trang trí riêng, khác WordArt native có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:62) |
| Văn bản | Chữ lớn đầu đoạn (Drop Cap) | ✅ | - | Chữ lớn đầu đoạn writer.format.dropCap đối chiếu Word COM DropCap=1 (docs/DOC-BUTTON-MATRIX-1011.md:63, docs/word-oracle-1710.json:93-99) |
| Văn bản | Khối dựng sẵn (Quick Parts / Building Blocks) | 🟢 | - | writer.insert.quickParts |
| Văn bản | Dòng chữ ký (Signature Line) | 🔴 | 3 | Chưa có dòng chữ ký số |
| Văn bản | Ngày & Giờ (Date & Time) | ✅ | - | Ngày & Giờ writer.insert.dateTime đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:64) |
| Văn bản | Đối tượng nhúng OLE (Object) | 🔴 | 2 | Chưa có hộp thoại chèn OLE object tùy ý |
| Ký hiệu | Phương trình toán học (Equation, Alt+=) | ✅ | - | Phương trình toán học writer.insert.equation đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:65) |
| Ký hiệu | Ký hiệu đặc biệt (Symbol) | ✅ | - | Ký hiệu writer.insert.symbol ©, ₫, ∑, → đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:66, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:71) |

### Thiết kế

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Định dạng tài liệu | Chủ đề tài liệu (Themes) | ✅ | - | Chủ đề văn bản writer.design.themeGallery đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:67) |
| Định dạng tài liệu | Bộ kiểu dáng (Style Sets) | 🟡 | 2 | Có chuyển đổi kiểu dáng qua Style Gallery; chưa có bộ Style Sets gộp đầy đủ |
| Định dạng tài liệu | Bảng màu chủ đề (Colors) | 🟡 | 2 | Có bảng màu theo chủ đề; chưa có hộp thoại chỉnh sửa Custom Theme Colors |
| Định dạng tài liệu | Phông chữ chủ đề (Fonts) | 🟡 | 2 | Hỗ trợ phông mặc định theo theme; chưa có hộp thoại tạo Font Scheme mới |
| Định dạng tài liệu | Khoảng cách đoạn văn chủ đề | 🟡 | 2 | Hỗ trợ giãn đoạn; chưa có menu preset khoảng cách đoạn cấp tài liệu |
| Định dạng tài liệu | Hiệu ứng chủ đề (Effects) | 🔴 | 3 | Chưa có theme effects riêng cho đối tượng đồ họa |
| Định dạng tài liệu | Đặt làm mặc định (Set as Default) | 🔴 | 3 | Chưa có nút lưu cấu hình chủ đề làm template mặc định |
| Nền trang | Đóng dấu chìm / Hình mờ (Watermark) | ✅ | - | Hình mờ writer.page.watermark đối chiếu Word COM header PowerPlusWaterMark (docs/DOC-BUTTON-MATRIX-1011.md:68) |
| Nền trang | Màu nền trang (Page Color) | ✅ | - | Màu trang writer.page.color đối chiếu Word COM màu #dbeafe (docs/DOC-BUTTON-MATRIX-1011.md:69) |
| Nền trang | Đường viền trang (Page Borders) | ✅ | - | Viền trang writer.page.border đối chiếu Word COM viền 3 pt (docs/DOC-BUTTON-MATRIX-1011.md:70) |

### Bố trí

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Thiết lập trang | Căn lề trang (Margins - Normal, Narrow, Moderate, Wide) | ✅ | - | Căn lề writer.page.margins 4 preset đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:71, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:58) |
| Thiết lập trang | Hướng giấy (Orientation - Dọc / Ngang) | ✅ | - | Hướng giấy writer.page.orientation đối chiếu Word COM Orientation=1 (docs/DOC-BUTTON-MATRIX-1011.md:72, docs/word-oracle-1710.json:79-85) |
| Thiết lập trang | Khổ giấy (Size - A4, Letter, A5, Legal) | ✅ | - | Khổ giấy writer.page.size A4/A5/Letter đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:73, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:58) |
| Thiết lập trang | Chia cột báo (Columns - 1, 2, 3 cột) | ✅ | - | Cột báo writer.page.columns 1/2/3 cột đối chiếu Word COM TextColumns.Count=2 (docs/DOC-BUTTON-MATRIX-1011.md:74-77, docs/word-oracle-1710.json:100-106) |
| Thiết lập trang | Ngắt cột (Column Break) | 🟢 | - | writer.break.column |
| Thiết lập trang | Ngắt phần (Section Breaks: Next Page, Continuous, Even, Odd) | ✅ | - | Ngắt phần 4 loại đối chiếu Word COM 5 section đúng sectionStart (docs/DOC-BUTTON-MATRIX-1011.md:48, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:61) |
| Thiết lập trang | Đánh số dòng (Line Numbers: Liên tục, Mỗi trang, Mỗi mục) | ✅ | - | Đánh số dòng writer.layout.lineNumbers Active=-1 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:78, docs/word-oracle-1710.json:86-92) |
| Thiết lập trang | Ngắt từ tự động (Hyphenation) | 🟢 | - | writer.layout.hyphenation |
| Thiết lập trang | Hộp thoại Thiết lập trang (Page Setup Dialog) | 🟢 | - | writer.page.setupDialog |
| Đoạn văn | Thụt lề trái / phải chính xác (pt/cm) | ✅ | - | Thụt lề trái/phải chính xác đối chiếu Word COM LeftIndent 36 pt (docs/DOC-BUTTON-MATRIX-1011.md:34-35, docs/word-oracle-1710.json:16-22) |
| Đoạn văn | Khoảng cách trước / sau đoạn chính xác (pt) | ✅ | - | Khoảng cách trước sau đoạn writer.para.spacingBefore/After đối chiếu Word COM 12 pt (docs/DOC-BUTTON-MATRIX-1011.md:80-81, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:42-43) |
| Sắp xếp | Vị trí đối tượng trên trang (Position) | ✅ | - | Vị trí đối tượng tọa độ Left/Top đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73-74) |
| Sắp xếp | Bao dòng chữ quanh hình (Wrap Text: Square, Tight, In Line) | ✅ | - | Bao dòng chữ quanh hình Wrap Square đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74) |
| Sắp xếp | Đưa lên trước / Đưa về sau (Bring Forward / Send Backward) | 🟢 | - | Điều khiển lớp đưa lên / đưa về (apps/writer/writer-arrange-controller.js:299-315) |
| Sắp xếp | Ngăn lựa chọn đối tượng (Selection Pane) | ✅ | - | writer.view.selectionPane: quản lý layer, ẩn/hiện, Z-Order, đổi tên đối tượng, đã đo kiểm đối chiếu Word COM (apps/writer/writer-arrange-controller.js:24-35, docs/word-oracle-writer2-1710.json:2-16) |
| Sắp xếp | Căn lề đối tượng đồ họa (Align Objects) | 🔴 | 2 | Chưa có công cụ căn lề đối tượng đồ họa trong Writer (mới có trên Sheet và Slides) |
| Sắp xếp | Nhóm / Bỏ nhóm đối tượng (Group / Ungroup) | ✅ | - | writer.arrange.group (Ctrl+G) & writer.arrange.ungroup (Ctrl+Shift+G): tạo msoGroup và rã nhóm đối tượng, đã đo kiểm đối chiếu Word COM (apps/writer/writer-arrange-controller.js:20-25, docs/word-oracle-writer2-1710.json:17-26) |
| Sắp xếp | Xoay / Lật đối tượng (Rotate / Flip) | 🟡 | 2 | Hỗ trợ xoay hình cơ bản; lật đối xứng chưa có |

### Tham chiếu

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Mục lục | Mục lục tự động (Table of Contents) | ✅ | - | Mục lục tự động writer.reference.tocInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:84, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:62) |
| Mục lục | Thêm văn bản vào cấp mục lục (Add Text to Level) | 🟡 | 2 | Qua việc đổi kiểu Heading 1–3 |
| Mục lục | Cập nhật mục lục (Update Table) | ✅ | - | Cập nhật mục lục writer.reference.tocUpdate đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:85) |
| Chú thích | Chú thích chân trang (Footnote, Ctrl+Alt+F) | ✅ | - | Chú thích chân trang writer.reference.footnoteInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:86, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63) |
| Chú thích | Chú thích cuối tài liệu (Endnote, Ctrl+Alt+D) | ✅ | - | Chú thích cuối writer.reference.endnoteInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:87, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63) |
| Chú thích | Điều hướng chú thích (Next Footnote / Show Notes) | 🟢 | - | writer.reference.nextNote, writer.reference.prevNote: chọn số chú thích kế tiếp/phía trước (trang và cuối), quay vòng; nhấp số chú thích nhảy tới nội dung (tests/live/cdp/writer-note-navigation.desktop.mjs 4/4); thao tác giao diện, không đi vào tệp nên không có đối chiếu Word thật |
| Chú thích | Hộp thoại Chú thích chân/cuối trang | 🟡 | 2 | Hỗ trợ qua thiết lập định dạng; chưa có hộp thoại gom chung |
| Nghiên cứu | Tra cứu thông minh (Smart Lookup) | ⚪ | - | Cần dịch vụ tìm kiếm Bing trực tuyến |
| Nghiên cứu | Nghiên cứu viên (Researcher) | ⚪ | - | Cần dịch vụ đám mây Microsoft Graph |
| Trích dẫn & Thư mục | Chèn trích dẫn (Insert Citation) | ✅ | - | Chèn trích dẫn writer.reference.citationInsert MLA đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:88) |
| Trích dẫn & Thư mục | Quản lý nguồn tài liệu (Manage Sources) | ✅ | - | Quản lý nguồn writer.reference.sourcesManage đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:89) |
| Trích dẫn & Thư mục | Kiểu trích dẫn (Citation Style: APA, MLA) | ✅ | - | Kiểu trích dẫn writer.reference.citationStyle APA/MLA đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:90) |
| Trích dẫn & Thư mục | Thư mục tài liệu tham khảo (Bibliography / Works Cited) | ✅ | - | Thư mục tài liệu writer.reference.bibliographyInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:91) |
| Tên chú thích | Chèn tên chú thích ảnh/bảng (Insert Caption) | ✅ | - | Chú thích ảnh writer.reference.captionInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:92, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65) |
| Tên chú thích | Danh mục hình ảnh/bảng (Table of Figures) | ✅ | - | Danh mục hình ảnh writer.reference.tofInsert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:93, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65) |
| Tên chú thích | Cập nhật danh mục hình ảnh (Update Table of Figures) | ✅ | - | Cập nhật danh mục writer.reference.tofUpdate đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:94, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:65) |
| Chỉ mục | Đánh dấu mục chỉ mục (Mark Index Entry) | 🟢 | - | writer.reference.indexMark (platform/commands/command-definitions.js:294) |
| Chỉ mục | Chèn bảng chỉ mục (Insert Index) | 🟢 | - | writer.reference.indexInsert (platform/commands/command-definitions.js:295) |
| Bảng pháp lý | Bảng trích dẫn pháp lý (Table of Authorities) | 🔴 | 3 | Chưa có bảng trích dẫn pháp lý chuyên ngành luật |

### Thư

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Tạo | Tạo phong bì thư (Envelopes) | ✅ | - | Phong bì writer.mailings.envelopes đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:95) |
| Tạo | Tạo nhãn địa chỉ (Labels) | ✅ | - | Nhãn writer.mailings.labels đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:96) |
| Bắt đầu trộn thư | Bắt đầu trộn thư (Start Mail Merge) | ✅ | - | Bắt đầu trộn thư writer.mailMerge.open đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:97) |
| Bắt đầu trộn thư | Nguồn dữ liệu người nhận (Select Recipients từ XLSX/CSV) | ✅ | - | Nguồn dữ liệu writer.mailMerge.open nạp 2 bản ghi đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:97) |
| Bắt đầu trộn thư | Sửa danh sách người nhận (Edit Recipient List) | 🟢 | - | writer.mailMerge.open: bảng người nhận có tìm/lọc, chọn hoặc bỏ chọn từng người, sắp xếp theo cột (chữ và số), lưu giữ thứ tự và lựa chọn (tests/live/cdp/writer-merge-recipients.desktop.mjs 7/7); không có đối chiếu Word thật vì là hộp thoại giao diện |
| Viết & Chèn trường | Chèn trường trộn thư (Insert Merge Field) | ✅ | - | Chèn trường writer.mailMerge.insertField đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:98) |
| Viết & Chèn trường | Quy tắc điều kiện (Rules: If...Then...Else) | ✅ | - | Quy tắc điều kiện writer.mailMerge.ifRule đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:99) |
| Viết & Chèn trường | Tô sáng trường trộn (Highlight Merge Fields) | 🟢 | - | writer.mailMerge.highlightFields: nút bật/tắt nền màu của trường trộn, không đổi nội dung và không lọt vào tệp lưu (tests/live/cdp/writer-merge-highlight.desktop.mjs 5/5); thao tác hiển thị, không có đối chiếu Word thật |
| Viết & Chèn trường | Khối địa chỉ (Address Block) & Lời chào (Greeting Line) | 🟡 | 2 | Có chèn trường riêng lẻ; chưa có wizard gộp khối địa chỉ |
| Viết & Chèn trường | Khớp trường dữ liệu (Match Fields) | 🟡 | 2 | Khớp theo tên cột trong file nguồn |
| Viết & Chèn trường | Cập nhật toàn bộ nhãn (Update Labels) | 🟡 | 2 | Đã hỗ trợ qua sinh hàng loạt nhãn từ nguồn |
| Xem trước kết quả | Xem trước kết quả (Preview Results) | ✅ | - | Xem trước kết quả writer.mailMerge.preview đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:100) |
| Xem trước kết quả | Điều hướng bản ghi (Previous / Next Record) | ✅ | - | Bản ghi trước/sau writer.mailMerge.prevRecord/nextRecord đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:101-102) |
| Xem trước kết quả | Tìm người nhận (Find Recipient) | 🟢 | - | writer.mailMerge.open: ô «Tìm kiếm / lọc người nhận» thu gọn danh sách theo từ khóa trên mọi cột (tests/live/cdp/writer-merge-recipients.desktop.mjs); chưa có hộp Find Recipient riêng khi xem trước từng bản ghi |
| Xem trước kết quả | Tự động kiểm tra lỗi trộn thư (Auto Check for Errors) | 🔴 | 3 | Chưa có wizard kiểm tra lỗi trộn thư |
| Hoàn tất | Hoàn tất & Trộn (Finish & Merge: tạo tài liệu mới / in) | ✅ | - | Hoàn tất & Trộn writer.mailMerge.finish đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:103) |

### Xem lại

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Soát lỗi | Kiểm tra chính tả tiếng Việt (F7 / gạch đỏ) | ✅ | - | Kiểm tra chính tả writer.review.toggleSpellCheck đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:104) |
| Soát lỗi | Từ điển từ đồng nghĩa (Thesaurus) | 🔴 | 3 | Chưa có từ điển từ đồng nghĩa tiếng Việt tích hợp |
| Soát lỗi | Đếm từ, ký tự, đoạn văn (Word Count) | ✅ | - | Đếm từ writer.review.wordCount đối chiếu Word COM lệch <=0.05% (docs/DOC-BUTTON-MATRIX-1011.md:105) |
| Trợ năng | Kiểm tra trợ năng (Accessibility Checker) | 🔴 | 3 | Chưa có công cụ kiểm tra độ tương phản/alt-text trợ năng |
| Ngôn ngữ | Dịch văn bản (Translate) | 🟢 | - | ai.assistant.translate (platform/commands/command-definitions.js:686, apps/writer/writer-ribbon.js:586) |
| Ngôn ngữ | Thiết lập ngôn ngữ soát lỗi (Language Preferences) | 🟡 | 2 | Mặc định tiếng Việt vi-VN; chưa có menu đổi ngôn ngữ đoạn văn |
| Bình luận | Nhận xét mới (New Comment, Ctrl+Alt+M) | ✅ | - | Thêm ghi chú writer.comment.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:58, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:66) |
| Bình luận | Xóa nhận xét (Delete Comment) | ✅ | - | Xóa nhận xét writer.review.commentDelete đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:106) |
| Bình luận | Đã xử lý nhận xét (Resolve Comment) | ✅ | - | Đã xử lý nhận xét writer.review.commentResolve đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:107) |
| Bình luận | Điều hướng nhận xét (Previous / Next Comment) | ✅ | - | Nhận xét trước/sau writer.review.commentPrevious/Next đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:108-109) |
| Theo dõi thay đổi | Theo dõi thay đổi (Track Changes, Ctrl+Shift+E) | ✅ | - | Theo dõi thay đổi writer.trackChanges.toggle đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:110, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:67) |
| Theo dõi thay đổi | Chế độ hiển thị đánh dấu (Simple / All / No Markup / Original) | 🟢 | - | writer.trackChanges.displaySimple/All/None/Original (platform/commands/command-definitions.js:228-232) |
| Theo dõi thay đổi | Bộ lọc hiển thị đánh dấu (Show Markup: Comments, Insertions, Deletions) | 🟢 | - | writer.trackChanges.showMarkup (platform/commands/command-definitions.js:233) |
| Theo dõi thay đổi | Chế độ bong bóng (Balloons: lề phải / trong dòng) | 🟢 | - | writer.trackChanges.balloons, balloonsRevisions, balloonsInline (platform/commands/command-definitions.js:234-238) |
| Theo dõi thay đổi | Ngăn xem lại (Reviewing Pane) | 🟡 | 2 | Danh sách thay đổi trong panel; chưa chia 2 chế độ dọc/ngang đầy đủ |
| Thay đổi | Chấp nhận thay đổi (Accept One / All) | ✅ | - | Chấp nhận thay đổi writer.trackChanges.acceptOne/acceptAll đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:111-112) |
| Thay đổi | Từ chối thay đổi (Reject One / All) | ✅ | - | Từ chối thay đổi writer.trackChanges.rejectOne/rejectAll đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:113-114) |
| Thay đổi | Điều hướng thay đổi (Previous / Next Change) | ✅ | - | Thay đổi trước/sau writer.trackChanges.previous/next đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:115-116) |
| So sánh | So sánh hai tài liệu (Compare) | 🟢 | - | writer.review.compare (platform/commands/command-definitions.js:225) |
| So sánh | Gộp tài liệu (Combine) | 🟢 | - | writer.review.combine (platform/commands/command-definitions.js:226) |
| Bảo vệ | Hạn chế chỉnh sửa (Restrict Editing) | 🟢 | - | writer.review.restrictEditing (platform/commands/command-definitions.js:227) |
| Mực vẽ | Vẽ tay / Mực cảm ứng (Inking) | 🔴 | 3 | Chưa có công cụ vẽ tay bút cảm ứng |

### Chế độ xem

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Chế độ xem sổ | Chế độ đọc (Read Mode) | ✅ | - | Chế độ đọc writer.view.readMode đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:117) |
| Chế độ xem sổ | Bố trí in (Print Layout) | ✅ | - | Bố trí in writer.view.printLayout đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:118) |
| Chế độ xem sổ | Bố trí Web (Web Layout) | ✅ | - | Bố trí Web writer.view.webLayout đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:119) |
| Chế độ xem sổ | Chế độ Dàn bài (Outline View) | 🟢 | - | writer.view.outline, promote, demote, moveUp, moveDown, expand, collapse (platform/commands/command-definitions.js:67-76) |
| Chế độ xem sổ | Chế độ Bản nháp (Draft View) | 🟢 | - | writer.view.draft (platform/commands/command-definitions.js:68) |
| Chuyển trang | Cuộn trang dọc (Vertical Page Movement) | 🟢 | - | Cuộn trang dọc mặc định trong viewport (apps/writer/writer-view-controller.js:8-35) |
| Chuyển trang | Cuộn trang song song cạnh nhau (Side to Side) | 🔴 | 3 | Chưa có chế độ cuộn lật trang ngang |
| Hiển thị | Thước ngang và dọc (Ruler) | ✅ | - | Thước writer.view.ruler đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:121) |
| Hiển thị | Đường lưới căn chỉnh (Gridlines) | ✅ | - | Đường lưới writer.view.gridlines đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:122) |
| Hiển thị | Ngăn dẫn hướng (Navigation Pane, Ctrl+Alt+N) | ✅ | - | Ngăn dẫn hướng writer.view.navigationPane đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:120) |
| Thu phóng | Hộp thoại Thu phóng (Zoom Dialog) | 🟢 | - | writer.view.zoomDialog (apps/writer/writer-zoom-dialog.js; apps/writer/writer-view-controller.js; platform/shell/app-shell.js) |
| Thu phóng | Thu phóng 100% | ✅ | - | Thu phóng 100% writer.view.zoom100 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:124) |
| Thu phóng | Vừa chiều rộng trang (Page Width) | ✅ | - | Chiều rộng trang writer.view.pageWidth đối chiếu Word COM PageFit=3 (docs/DOC-BUTTON-MATRIX-1011.md:126) |
| Thu phóng | Xem một trang (One Page) / Nhiều trang (Multiple Pages) | 🟢 | - | writer.view.fitPage, writer.view.multiplePages, writer.view.zoomDialog; đo trên app desktop: Vừa cả trang đặt zoom để cả chiều cao trang nằm trong khung nhìn, Nhiều trang thu nhỏ có lớp xếp nhiều trang, hộp Thu phóng 10–500% (tests/live/cdp/writer-zoom-dialog.desktop.mjs); không xem được so với Word thật vì là thao tác giao diện, không đi vào tệp |
| Thu phóng | Phóng to / Thu nhỏ (Zoom In / Zoom Out) | ✅ | - | Phóng to và thu nhỏ writer.view.zoomIn/zoomOut đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:123,125) |
| Cửa sổ | Cửa sổ mới (New Window) | 🟢 | - | writer.view.newWindow; mở WebView thứ hai độc lập, khác Word clone cửa sổ có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:128) |
| Cửa sổ | Sắp xếp tất cả cửa sổ (Arrange All) | 🔴 | 3 | Chưa có sắp xếp tile các cửa sổ app |
| Cửa sổ | Chia cửa sổ soạn thảo (Split Window) | ✅ | - | writer.view.split: chia 2 phân vùng cuộn độc lập, thanh kéo tỉ lệ, đã đo kiểm đối chiếu Word COM (apps/writer/writer-split-view.js:1-25, docs/word-oracle-writer2-1710.json:27-36) |
| Cửa sổ | Xem song song (View Side by Side) & Cuộn đồng bộ | 🔴 | 3 | Chưa có xem 2 tài liệu song song có cuộn đồng bộ |
| Cửa sổ | Chuyển cửa sổ (Switch Windows) | 🟡 | 3 | Hệ điều hành quản lý cửa sổ; chưa có menu trong app |
| Macro | Quản lý Macro & Ghi Macro (Alt+F8, Ctrl+Shift+R) | 🟢 | - | common.macro.recordToggle/manager; Command Bus macro engine cục bộ, khác VBA Word có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:129-130) |

### Công cụ Bảng

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Thiết kế | Tùy chọn kiểu bảng: Hàng tiêu đề (Header Row) | ✅ | - | Hàng tiêu đề HeadingFormat=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56,79) |
| Thiết kế | Tùy chọn kiểu bảng: Hàng xen kẽ (Banded Rows) | ✅ | - | writer.table.toggleBandedRows: bật/tắt màu nền xen kẽ giữa các hàng bảng; đã đo kiểm đối chiếu Word 2016 COM ApplyStyleRowBands (adapters/libreoffice/writer/writer-adapter.js:10117-10133, docs/word-oracle-tables-1710.json:43-47, tests/live/cdp/writer-table-parity.desktop.mjs:122-140) |
| Thiết kế | Tùy chọn kiểu bảng: Cột đầu, Cột cuối, Cột sọc | 🟢 | - | writer.table.toggleFirstColumn, writer.table.toggleLastColumn, writer.table.toggleBandedColumns; bật/tắt, cùng hàng xen kẽ không mất màu cột, lưu DOCX rồi Word 2016 thật đọc lại đúng chữ đậm và màu nền từng ô (tests/live/cdp/writer-table-column-options.desktop.mjs, scripts/audit-0610/word_table_cols_readback.ps1); là định dạng trực tiếp lên ô, chưa ghi cờ tblLook (ApplyStyleFirstColumn) của Word |
| Thiết kế | Thư viện kiểu bảng (Table Styles Gallery) | ✅ | - | writer.table.stylesGallery: 32 mẫu bảng Plain, Grid, List; xuất w:tblStyle và w:tblLook chuẩn DOCX, đã đo kiểm đối chiếu Word COM (apps/writer/writer-table-styles.js:1-25, docs/word-oracle-writer2-1710.json:37-48) |
| Thiết kế | Màu nền ô bảng (Shading) | ✅ | - | Bảng màu nền ô đối chiếu Word COM mã màu 15788258 (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83) |
| Thiết kế | Viền bảng (Borders dropdown: Tất cả, Viền ngoài, Viền trong, Không viền) | ✅ | - | Viền bảng 4 kiểu viền đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,84) |
| Thiết kế | Độ dày và kiểu đường viền bảng | ✅ | - | writer.table.bordersStyle: hộp thoại Kiểu viền… chọn nét liền, đứt, chấm, đôi, độ dày 0,25 đến 6 pt, màu và vùng áp dụng; lưu DOCX rồi Word 2016 COM đọc 4 cạnh ngoài LineStyle=4 LineWidth=18 là 2,25 pt Color=255; đồng thời sửa lỗi mất viền trái cột đầu khi lưu (tests/live/cdp/writer-table-borders-style.desktop.mjs; apps/writer/writer-table-borders-dialog.js:45 showTableBordersDialog, platform/commands/command-definitions.js:187) |
| Thiết kế | Vẽ bảng (Draw Table) & Tẩy viền (Eraser) | 🔴 | 2 | Chưa có công cụ vẽ viền tự do bằng chuột |
| Bố trí | Chọn ô, hàng, cột, bảng (Table Select) | ✅ | - | writer.table.selectCell, selectRow, selectCol, selectTable: chọn ô, hàng, cột, toàn bộ bảng; đã đo kiểm đối chiếu Word 2016 COM Selection (apps/writer/writer-table.js:410-454, docs/word-oracle-tables-1710.json:48-65, tests/live/cdp/writer-table-parity.desktop.mjs:141-164) |
| Bố trí | Xem đường lưới bảng (View Gridlines) | ✅ | - | writer.table.viewGridlines: bật/tắt đường viền lưới chấm mờ của bảng không viền; đã đo kiểm đối chiếu Word 2016 COM TableGridlines (adapters/libreoffice/writer/writer-adapter.js:10017-10026, docs/word-oracle-tables-1710.json:97-103, tests/live/cdp/writer-table-parity.desktop.mjs:181-197) |
| Bố trí | Thuộc tính bảng (Table Properties Dialog) | ✅ | - | writer.table.properties: hộp thoại Bảng/Hàng/Cột/Ô (căn, thụt lề, độ rộng %, cm, chiều cao hàng, căn dọc, lề ô); lưu DOCX và Word COM đọc lại đúng (platform/commands/command-definitions.js:192, tests/live/cdp/writer-table-properties.desktop.mjs:162) |
| Bố trí | Chèn hàng trên / Chèn hàng dưới | ✅ | - | Chèn hàng trên và dưới đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79) |
| Bố trí | Chèn cột trái / Chèn cột phải | ✅ | - | Chèn cột trái và phải đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,79) |
| Bố trí | Xóa hàng, xóa cột, xóa bảng | ✅ | - | Xóa hàng, xóa cột, xóa bảng đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54,83) |
| Bố trí | Gộp ô (Merge Cells) | ✅ | - | Gộp ô ngang và dọc đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:55,83) |
| Bố trí | Tách ô (Split Cells) | ✅ | - | Tách ô ngang và dọc đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:55,83) |
| Bố trí | Tách bảng (Split Table) | ✅ | - | writer.table.splitTable: tách tại hàng chọn thành hai w:tbl, Undo một bước, Word COM đọc Tables.Count=2 (platform/commands/command-definitions.js:190, tests/live/cdp/writer-table-properties.desktop.mjs:53) |
| Bố trí | Tự khớp kích thước (AutoFit to Contents / Window) | ✅ | - | Tự khớp kích thước AutoFit nội dung và cửa sổ đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83) |
| Bố trí | Chiều cao hàng & Chiều rộng cột chính xác | ✅ | - | Chiều cao hàng w:trHeight exact 840 và kéo cột đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:57,83) |
| Bố trí | Phân bố đều hàng & cột (Distribute Rows / Columns) | ✅ | - | writer.table.distributeRows, distributeCols: căn đều chiều cao các hàng theo chiều cao trung bình và chia đều bề rộng cột %; đã đo kiểm đối chiếu Word 2016 COM DistributeHeight/DistributeWidth (adapters/libreoffice/writer/writer-adapter.js:10004-10034, docs/word-oracle-tables-1710.json:2-16, tests/live/cdp/writer-table-parity.desktop.mjs:47-70) |
| Bố trí | Căn lề ô theo chiều dọc (Top, Center, Bottom) | ✅ | - | Căn giữa dọc ô bảng VerticalAlignment=1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56,79, docs/word-oracle-1710.json:30-36) |
| Bố trí | Xoay hướng chữ trong ô (Text Direction) | ✅ | - | writer.table.textDirection: Ngang/90°/270° lưu w:textDirection, Word COM đọc Orientation=3 (platform/commands/command-definitions.js:191, tests/live/cdp/writer-table-properties.desktop.mjs:134) |
| Bố trí | Khoảng cách lề ô bảng (Cell Margins) | ✅ | - | writer.table.properties tab Ô/Bảng: lề cm lưu w:tblCellMar/w:tcMar, Word COM đọc padding đúng (platform/commands/command-definitions.js:192, tests/live/cdp/writer-table-properties.desktop.mjs:134) |
| Bố trí | Lặp lại hàng tiêu đề qua các trang (Repeat Header Rows) | ✅ | - | Lặp lại hàng tiêu đề HeadingFormat=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:56) |
| Bố trí | Sắp xếp dữ liệu trong bảng (Sort Table) | ✅ | - | writer.table.sort: sắp xếp các hàng dữ liệu A-Z theo cột đang chọn, giữ nguyên hàng tiêu đề; đã đo kiểm đối chiếu Word 2016 COM Table.Sort(ExcludeHeader) (adapters/libreoffice/writer/writer-adapter.js:1816-1851, docs/word-oracle-tables-1710.json:28-42, tests/live/cdp/writer-table-parity.desktop.mjs:95-121) |
| Bố trí | Công thức tính toán trong bảng (=SUM(ABOVE)...) | ✅ | - | writer.table.formula: tính toán =SUM(ABOVE), =SUM(LEFT), AVERAGE, COUNT, MAX, MIN, PRODUCT, xuất w:fldSimple, đã đo kiểm đối chiếu Word COM (apps/writer/writer-table-formula-dialog.js:1-25, docs/word-oracle-writer2-1710.json:49-60) |

### Công cụ Hình ảnh

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Định dạng | Xóa nền ảnh tự động (Remove Background) | 🔴 | 3 | Chưa có thuật toán tách nền ảnh |
| Định dạng | Độ sáng & Tương phản (Corrections) | 🟢 | - | writer.image.corrections (platform/commands/command-definitions.js:206) |
| Định dạng | Màu sắc ảnh & Đổi màu (Color / Recolor) | 🟡 | 2 | Hỗ trợ qua CSS filter; chưa xuất bộ lọc sang OOXML |
| Định dạng | Hiệu ứng nghệ thuật (Artistic Effects) | 🔴 | 3 | Chưa có hiệu ứng bộ lọc tranh nghệ thuật |
| Định dạng | Nén ảnh (Compress Pictures) | 🟢 | - | writer.image.compress (platform/commands/command-definitions.js:209) |
| Định dạng | Thay đổi ảnh giữ nguyên kích thước (Change Picture) | 🟢 | - | writer.image.changePicture (platform/commands/command-definitions.js:207) |
| Định dạng | Đặt lại ảnh về gốc (Reset Picture) | 🟢 | - | writer.image.resetPicture (platform/commands/command-definitions.js:208) |
| Định dạng | Thư viện kiểu khung ảnh (Picture Styles Gallery) | 🟡 | 2 | Có bo góc, đổ bóng, viền ảnh; chưa có gallery preset phong phú |
| Định dạng | Viền ảnh & Màu viền (Picture Border) | ✅ | - | writer.image.border: hộp thoại Viền ảnh chọn nét liền, đứt, chấm, đôi, độ dày và màu; lưu DOCX rồi Word 2016 COM đọc Line.Visible, Weight 2,25 pt, DashStyle 4 và màu xanh (tests/live/cdp/writer-picture-border.desktop.mjs; adapters/libreoffice/writer/writer-adapter.js:10832 setPictureBorder, platform/commands/command-definitions.js:228) |
| Định dạng | Cắt xén ảnh (Crop) | 🟢 | - | writer.image.crop (platform/commands/command-definitions.js:205) |
| Định dạng | Kích thước ảnh chính xác (Chiều cao, Chiều rộng pt/cm) | ✅ | - | Kích thước ảnh PNG đối chiếu Word COM 23.9x13.6 pt (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74) |
| Định dạng | Tùy chọn ngắt dòng chữ (Wrap Text - In Line, Square, Tight, Behind, In Front) | ✅ | - | Tùy chọn ngắt dòng chữ ảnh Wrap Square đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:74) |

### Công cụ Vẽ

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Định dạng | Chèn hình khối cơ bản (Chữ nhật, tròn, mũi tên...) | ✅ | - | Hình khối chữ nhật writer.shape.insert Type 1 đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:52, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73) |
| Định dạng | Chỉnh sửa đỉnh hình dạng (Edit Points) | 🔴 | 3 | Chưa có chỉnh sửa node vector tự do |
| Định dạng | Vẽ hộp văn bản (Draw Text Box) | ✅ | - | Hộp văn bản writer.insert.textbox đối chiếu Word COM 53.6x19.5 pt (docs/DOC-BUTTON-MATRIX-1011.md:61, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:72) |
| Định dạng | Màu tô hình khối (Shape Fill) | ✅ | - | Màu tô hình khối fill đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73) |
| Định dạng | Viền hình khối (Shape Outline) | ✅ | - | Viền hình khối line 1.5 pt đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73) |
| Định dạng | Hiệu ứng hình khối (Bóng đổ, 3-D) | 🟡 | 2 | Có bóng đổ cơ bản; hiệu ứng 3-D nâng cao chưa hỗ trợ |
| Định dạng | Kiểu chữ nghệ thuật (WordArt Styles) | 🟢 | - | writer.insert.wordart; DrawingML text shape trang trí riêng, khác WordArt native có chủ ý (docs/DOC-BUTTON-MATRIX-1011.md:62) |
| Định dạng | Màu tô & Viền chữ nghệ thuật | 🟢 | - | writer.insert.wordart: Màu tô và viền chữ nghệ thuật (apps/writer/writer-wordart.js:240-256) |
| Định dạng | Hướng chữ trong hộp văn bản | 🟡 | 2 | Hỗ trợ qua CSS xoay; OOXML xuất cần kiểm tra |
| Định dạng | Liên kết luồng chữ giữa hai hộp văn bản (Create Link) | 🔴 | 3 | Chưa hỗ trợ chảy văn bản nối tiếp giữa 2 textbox |

### Công cụ Đầu & Chân trang

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Thiết kế | Chèn Đầu trang / Chân trang tiêu chuẩn | ✅ | - | Đầu trang và Chân trang writer.header/footer.insert đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:59-60, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60) |
| Thiết kế | Trang đầu khác biệt (Different First Page) | ✅ | - | Trang đầu khác biệt DifferentFirstPage=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60, docs/word-oracle-1710.json:44-50) |
| Thiết kế | Trang chẵn và lẻ khác nhau (Different Odd & Even) | ✅ | - | Trang chẵn và lẻ khác nhau OddAndEven=-1 đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60) |
| Thiết kế | Liên kết với mục trước (Link to Previous) | 🟢 | - | writer.section.linkToPrevious (platform/commands/command-definitions.js:265) |
| Thiết kế | Khoảng cách lề đầu/chân trang từ mép giấy | ✅ | - | Khoảng cách lề đầu trang HeaderDistance 35.4 pt đối chiếu Word COM (docs/word-oracle-1710.json:44-50) |
| Thiết kế | Chèn ngày giờ / thông tin tài liệu vào đầu/chân trang | 🟢 | - | writer.insert.dateTime (apps/writer/writer-ribbon.js:351) |
| Thiết kế | Đóng chế độ sửa Đầu & Chân trang | ⚪ | - | Không áp dụng: đầu và chân trang của VN Writer luôn là vùng sửa trực tiếp trên trang, không có chế độ riêng nên không cần nút Đóng |

### Không thuộc ribbon

| Nhóm | Tính năng Word 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Writer |
|---|---|---|---|---|
| Bàn phím | Bàn phím điều hướng (Mũi tên, Ctrl+mũi tên, Home/End, PgUp/PgDn) | 🟢 | - | writer.nav.docStart (platform/commands/command-definitions.js:92-93, platform/help/entries-writer.js:851-856) |
| Bàn phím | Bàn phím phím tắt định dạng (Ctrl+B, I, U, Space, Shift+F3, Ctrl+Shift+>, <) | ✅ | - | Phím tắt định dạng Ctrl+B/I/U/Space đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:22-24, docs/AUDIT-DOC-WORD-PARALLEL-1011.md:25-28) |
| Bàn phím | Phím tắt quản lý tệp & chỉnh sửa (Ctrl+S, O, N, P, Z, Y, C, V, X, A, F, H, K) | 🟢 | - | common.file.save, common.edit.undo (platform/commands/command-definitions.js:20-40, platform/help/entries-writer.js:1505-1510) |
| Bàn phím | Phím tắt phím Alt (KeyTips nổi) | 🔴 | 2 | Chưa có chế độ KeyTips đầy đủ như Word |
| Bàn phím | Phím Tab và phím thụt lề | ✅ | - | Phím Tab và thụt lề đoạn đối chiếu Word COM DefaultTabStop 36 pt (docs/word-oracle-1710.json:37-43, docs/WORD2016-FINDINGS-1710.md:39-43) |
| Chuột | Chuột bôi đen chọn từ, đoạn, dòng, khối | 🟢 | - | Bôi đen bằng chuột (tests/live/cdp/writer-mini-toolbar.desktop.mjs:1-5, apps/writer/writer-mini-toolbar.js:20-50) |
| Chuột | Thước căn lề tương tác (kéo lề, kéo thụt dòng đầu) | 🟢 | - | Thước kéo lề và thụt lề (tests/unit/writer-interactive-ruler.test.js:46-58, apps/writer/writer-ruler-controller.js:1-40) |
| Chuột | Đặt điểm dừng tab tùy chỉnh trên thước | ✅ | - | nút loại dừng tab ở góc thước (Trái/Giữa/Phải/Thập phân/Thanh) rồi nhấp thước; lưu DOCX rồi Word 2016 COM đọc TabStops 283.5 pt căn phải khi đặt 10 cm (tests/live/cdp/writer-ruler-tabs.desktop.mjs; apps/writer/writer-ruler-controller.js:114 điểm dừng tab) |
| Chuột | Thanh công cụ nổi mini khi bôi đen (Mini Toolbar) | ✅ | - | bôi đen chữ bằng chuột thì thanh nổi hiện, nút Đậm làm đậm đúng từ, gõ phím thì ẩn (tests/live/cdp/writer-mini-toolbar.desktop.mjs; apps/writer/writer-mini-toolbar.js:24 Mini Toolbar) |
| Chuột | Menu ngữ cảnh chuột phải trên văn bản | 🟢 | - | Menu ngữ cảnh văn bản chuột phải (apps/writer/writer-app.js:863-876) |
| Chuột | Menu ngữ cảnh chuột phải trong bảng | ✅ | - | Menu chuột phải trong bảng đối chiếu Word COM thêm/xóa hàng cột (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54-57) |
| Chuột | Menu ngữ cảnh chuột phải hình ảnh & hình khối | ✅ | - | Menu chuột phải hình ảnh/hình khối đối chiếu Word COM (docs/AUDIT-DOC-WORD-PARALLEL-1011.md:73-74) |
| Thanh trạng thái | Thanh trạng thái: Số trang & Tổng số trang (Trang X trên Y) | 🔴 | 3 | Writer chưa hiển thị số trang hiện tại trên thanh trạng thái |
| Thanh trạng thái | Thanh trạng thái: Đếm từ & số ký tự | ✅ | - | Đếm từ trên thanh trạng thái đối chiếu Word COM trong FIX-T15 (docs/DOC-BUTTON-MATRIX-1011.md:105) |
| Thanh trạng thái | Thanh trạng thái: Ngôn ngữ tài liệu & Kiểm tra chính tả | 🟢 | - | writer.review.toggleSpellCheck (apps/writer/writer-app.js:234, 570-577) |
| Thanh trạng thái | Thanh trạng thái: Nút chuyển chế độ xem (Bố trí in, Đọc, Web) | ✅ | - | Nút chuyển chế độ xem đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:117-119) |
| Thanh trạng thái | Thanh trạng thái: Thanh trượt thu phóng (Zoom Slider & %) | ✅ | - | Thanh trượt thu phóng đối chiếu Word COM (docs/DOC-BUTTON-MATRIX-1011.md:123-125) |
| Hộp thoại | Đủ bộ hộp thoại văn phòng (Phông, Đoạn văn, Bảng, Thiết lập trang, Tìm/Thay, Ký hiệu) | 🟢 | - | writer.format.fontDialog, writer.format.paragraphDialog, writer.page.setupDialog, writer.insert.symbol (apps/writer/font-dialog.js:1-30, apps/writer/paragraph-dialog.js:1-30) |
| Tính tương thích | Khứ hồi DOCX độ trung thực cao | 🟢 | - | Khứ hồi DOCX độ trung thực cao (tests/test_writer_save_roundtrip.py:1-10) |
| Hiệu năng | Hiệu năng mở tệp lớn và độ nhạy gõ chữ | 🟢 | - | Hiệu năng mở tệp lớn và độ nhạy gõ chữ (docs/AUDIT-DOC-STABILITY-0610.md:1-24) |
