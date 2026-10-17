# Kết quả đo kiểm đối chiếu tính năng ưu tiên 1: Word 2016 và VN Writer (17/10/2026)

Tài liệu này ghi nhận kết quả đo kiểm thực tế bằng Microsoft Word 2016 (bản 16.0.4266 x86/x64 cài đặt cục bộ, giao tiếp qua Word COM tự động hóa chỉ-đọc) đối chiếu với VN Writer (mô hình DOM/canvas, command bus và bộ xuất nhập DOCX/FODT).

Phương pháp đo: Khởi động Word COM ẩn, mở tài liệu kiểm thử, thao tác các thuộc tính đối tượng Word (`ParagraphFormat`, `Table`, `PageSetup`, `Fields`, `Footnotes`, `Endnotes`, `Revisions`, `DropCap`, `TextColumns`), đọc giá trị số đo chuẩn xác theo đơn vị point (pt) và enum chuẩn của Word 2016. Sau đó đối chiếu với mã lệnh VN Writer trong `apps/writer/`, `platform/commands/command-definitions.js`, và các bài audit thực tế (`docs/AUDIT-DOC-*.md`).

## Bảng tổng hợp đối chiếu 15 tính năng ưu tiên 1

| STT | Tính năng | Word 2016 (COM) | VN Writer | Kết luận |
|---|---|---|---|---|
| 1 | Căn lề đoạn văn | `Paragraph.Alignment` nhận 0 (Trái), 1 (Giữa), 2 (Phải), 3 (Căn đều hai bên). Đo thực tế: 3 | Lệnh `writer.para.alignLeft`, `alignCenter`, `alignRight`, `alignJustify`. Xuất DOCX `w:jc val="left/center/right/both"` | ✅ **KHỚP HOÀN TOÀN** (20/20 phép thử AUDIT-DOC-WORD-PARALLEL-1011) |
| 2 | Giãn dòng đoạn | `LineSpacingRule`: Single=0, 1.5=1, Double=2, Exactly=4. Đo thực tế: rule 1 (1.5 dòng) và exact 18 pt | Lệnh `writer.para.lineSpacing` (1.0, 1.15, 1.5, 2.0). OOXML `w:spacing w:line="240/276/360/480"` | ✅ **KHỚP HOÀN TOÀN** (SpaceAfter 8pt/160twips và 1.5 dòng đã xác minh COM) |
| 3 | Thụt lề đoạn | `FirstLineIndent` = 36 pt (0.5 inch / 1.27 cm), `LeftIndent` = 36 pt. Thụt lề âm tạo Hanging Indent | Lệnh `writer.para.indentInc/Dec` (Ctrl+M, Ctrl+Shift+M), `writer.para.firstLineIndent` (14.15 pt / 0.5 cm) | ✅ **KHỚP HOÀN TOÀN** (FIX-T11 nhóm 3 xác nhận thụt đầu dòng 14.15 pt khớp COM) |
| 4 | Danh sách đa cấp | `ListFormat.ListLevelNumber` đọc 1..9. `ListIndent()` và `ListOutdent()` dịch chuyển cấp độ | Phím Tab/Shift+Tab và thụt lề lồng thẻ `<ol>/<ul>`, ánh xạ sang OOXML `w:numPr/w:ilvl` (0, 1, 2) | ✅ **KHỚP CƠ BẢN** (Đạt cấp độ lồng nhau; chưa có hộp thoại Define New Multilevel List) |
| 5 | Bảng: Cấu trúc & Căn dọc ô | `Tables.Add(rows, cols)`, `Cell.VerticalAlignment`: Top=0, Center=1, Bottom=2. Padding ô đọc chuẩn pt | Lệnh `writer.table.insert`, căn giữa dọc (`VerticalAlignment=1`), AutoFit, viền bảng và nền ô | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận số ô, gộp/tách, căn dọc, AutoFit khớp Word COM) |
| 6 | Điểm dừng Tab | `DefaultTabStop` = 36 pt (1.27 cm / 0.5 in). Thêm Custom TabStop Left=0, Center=1, Right=2 | Thước ngang hiển thị mốc 1.27 cm; phím Tab thụt lề; chưa có hộp thoại Tabs và tab leaders (dấu chấm) | 🟡 **MỘT PHẦN — LỆCH** (Giữ đúng khoảng cách mặc định 36 pt, nhưng thiếu UI đặt tab tùy chỉnh) |
| 7 | Đầu & Chân trang | `PageSetup.HeaderDistance` = 35.4–36 pt (1.27 cm), `DifferentFirstPageHeaderFooter` = -1 | Lệnh `writer.header.insert`, `writer.footer.insert`. Lưu/đọc lại cờ `DifferentFirstPage=-1` | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 và AUDIT-DOC-WORD-PARALLEL-1011 xác nhận cờ và khoảng cách) |
| 8 | Trường số trang | Đối tượng `Field.Type` = 33 (`wdFieldPage`), Type = 26 (`wdFieldNumPages`) | Writer chèn thẻ trường PAGE và NUMPAGES, xuất OOXML `w:fldSimple w:instr="PAGE/NUMPAGES"` | ✅ **KHỚP HOÀN TOÀN** (Word COM mở DOCX đọc đúng Type 33 và 26, cập nhật số trang động) |
| 9 | Mục lục tự động | `TablesOfContents.Add()`, trường `TOC \o "1-3" \h \z \u`. Nhận diện Heading 1–3 | Lệnh `writer.reference.tocInsert`, `writer.reference.tocUpdate`. Tạo TOC và cập nhật khi sửa Heading | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận tạo/cập nhật TOC khớp Word COM) |
| 10 | Chú thích chân trang & cuối | `Footnotes.Add()` (Location=1, BottomOfPage), `Endnotes.Add()` (Location=2, EndOfDocument) | Lệnh `writer.reference.footnoteInsert` (Ctrl+Alt+F), `writer.reference.endnoteInsert` (Ctrl+Alt+D) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận Word COM đọc lại đúng 1 footnote và 1 endnote) |
| 11 | Theo dõi thay đổi | `TrackRevisions` = True, `Revisions.Count` = 1, `Revision.Type` = 1 (`wdRevisionInsert`) | Lệnh `writer.trackChanges.toggle` (Ctrl+Shift+E), `acceptOne/All`, `rejectOne/All` | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận deletion Type 2, insertion Type 1, điều hướng khớp COM) |
| 12 | Ngắt phần & Hướng trang | `Sections.Add()`, `PageSetup.Orientation` = 1 (Landscape), `SectionStart` = 2 (Next Page) | Lệnh `writer.page.orientation`, `writer.page.break` (NextPage, Continuous, EvenPage, OddPage) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận 5 section với sectionStart 2,2,0,3,4 khớp Word COM) |
| 13 | Đánh số dòng | `LineNumbering.Active` = -1, `CountBy` = 1, `RestartMode` = 0 (Continuous) | Lệnh `writer.layout.lineNumbers` (Liên tục, Mỗi trang, Mỗi mục). OOXML xuất `w:lnNumType` | ✅ **KHỚP HOÀN TOÀN** (FIX-T12 xác nhận Word COM đọc LineNumbering Active=-1, CountBy=1) |
| 14 | Chữ lớn đầu đoạn | `DropCap.Position` = 1 (`wdDropNormal`), `DropCap.LinesToDrop` = 3 | Lệnh `writer.format.dropCap` (Chữ đầu đoạn chìm/ngoài lề). OOXML xuất `w:dropCap` | ✅ **KHỚP HOÀN TOÀN** (FIX-T11 nhóm 2 xác nhận CDP và Word COM khớp về đầu ra DOCX) |
| 15 | Chia cột báo | `TextColumns.SetCount(2)`, `TextColumns.Spacing` = 36 pt (0.5 in / 1.27 cm) | Lệnh `writer.page.columns`, `writer.page.columns1/2/3`. OOXML xuất `w:cols w:num="2" w:space="720"` | ✅ **KHỚP HOÀN TOÀN** (AUDIT-DOC-WORD-PARALLEL-1011 xác nhận 3/3 cột TextColumns.Count khớp COM) |

## Chi tiết đo kiểm và phân tích chuyên sâu

### 1. Căn lề đoạn văn (Align Left, Center, Right, Justify)
- **Đo Word COM:** Khi gán lần lượt `Alignment` từ 0 đến 3, Word lưu trữ giá trị số nguyên tương ứng trong mô hình OM (`wdAlignParagraphLeft=0`, `wdAlignParagraphCenter=1`, `wdAlignParagraphRight=2`, `wdAlignParagraphJustify=3`). Khi mở tài liệu DOCX từ VN Writer có `<w:jc w:val="both"/>`, Word COM đọc `Alignment = 3`.
- **Đánh giá VN Writer:** Giao diện ribbon và phím tắt `Ctrl+L/E/R/J` hoạt động đồng nhất giữa DOM và tệp DOCX xuất ra. Đã có 20/20 bài thử đối chiếu trong `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 2. Giãn dòng đoạn (Line Spacing)
- **Đo Word COM:** Khi chọn 1.5 dòng, Word thiết lập `LineSpacingRule = 1` (wdLineSpace1pt5) và `LineSpacing = 18 pt`. Khi chọn Exactly, `LineSpacingRule = 4` và giá trị `LineSpacing` nhận điểm số tuyệt đối (18 pt).
- **Đánh giá VN Writer:** Hỗ trợ các mốc chuẩn 1.0, 1.15, 1.5, 2.0 và khoảng cách đoạn văn SpaceBefore/SpaceAfter. Word COM đọc SpaceAfter 8 pt / 160 twips khớp chuẩn mặc định.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 3. Thụt lề đoạn (Indentation)
- **Đo Word COM:** `FirstLineIndent = 36 pt` đẩy dòng đầu thụt vào 1.27 cm. `LeftIndent = 36 pt` đẩy toàn bộ khối đoạn thụt vào. Thụt lề treo (Hanging indent) trong Word là sự kết hợp của `LeftIndent > 0` và `FirstLineIndent < 0`.
- **Đánh giá VN Writer:** Hỗ trợ tăng/giảm thụt lề bằng nút ribbon và phím tắt `Ctrl+M` / `Ctrl+Shift+M`. Lệnh thụt đầu dòng `writer.para.firstLineIndent` (14.15 pt = 0.5 cm theo thể thức văn bản hành chính Việt Nam) đã được đo trong FIX-T11 nhóm 3 và khớp Word COM.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 4. Danh sách đa cấp (Multilevel List)
- **Đo Word COM:** Cấu trúc phân cấp danh sách trong Word dựa trên `ListTemplate` và `ListLevelNumber` (1 đến 9). Mỗi cấp có định dạng số, thụt lề số và thụt lề chữ riêng biệt.
- **Đánh giá VN Writer:** Trong DOM, VN Writer biểu diễn danh sách đa cấp thông qua các phần tử `<ul>` và `<ol>` lồng nhau. Khi lưu DOCX, bộ chuyển đổi ánh xạ đúng `w:numId` và `w:ilvl` (cấp 0, 1, 2).
- **Hạn chế:** VN Writer chưa có giao diện hộp thoại "Define New Multilevel List" cho phép tùy biến chuỗi tiền tố cấp cha (ví dụ: 1.1, 1.1.1) một cách trực quan như Word.
- **Kết luận:** **PASS cơ bản (✅ Đã đối chiếu cấu trúc lồng)**.

### 5. Bảng biểu (Tables)
- **Đo Word COM:** Bảng Word hỗ trợ đệm lề ô (`TopPadding`, `BottomPadding`, `LeftPadding`, `RightPadding`), căn chỉnh nội dung ô theo chiều dọc (`VerticalAlignment`: 0=Top, 1=Center, 2=Bottom), viền 6 cạnh (`Borders`), và chế độ tự khớp `AutoFitBehavior`.
- **Đánh giá VN Writer:** Đầy đủ thao tác chèn bảng, thêm/xóa hàng/cột, gộp/tách ô ngang dọc, căn giữa dọc (`VerticalAlignment=1`), lặp hàng tiêu đề trang sau (`HeadingFormat=-1`), và AutoFit. Kết quả đối chiếu với file `sample-writer-tables.docx` đạt 100% khớp số hàng, cột và căn lề.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 6. Điểm dừng Tab (Tab Stops)
- **Đo Word COM:** Mặc định `DefaultTabStop = 36 pt` (0.5 inch = 1.27 cm). Word cho phép đặt tab dừng tùy ý trên thước hoặc qua hộp thoại Tabs, hỗ trợ 5 kiểu căn lề (Left, Center, Right, Decimal, Bar) và 3 kiểu ký tự dẫn đường (Leader dots `...`, dashes `---`, underline `___`).
- **Đánh giá VN Writer:** Thước ngang có vạch chia tab 1.27 cm, phím Tab trong văn bản thụt đoạn. Tuy nhiên, **chưa có giao diện nhấp đúp đặt tab dừng tùy chỉnh trên thước** và **chưa có hộp thoại Tabs**.
- **Kết luận:** **PARTIAL (🟡 Có một phần — Lệch chức năng nâng cao)**. Cần lập phiếu việc bổ sung hộp thoại Tabs và tab stops tùy biến trên thước.

### 7. Đầu trang & Chân trang (Header & Footer)
- **Đo Word COM:** Khoảng cách lề đầu trang `HeaderDistance = 35.4–36 pt` (1.27 cm), chân trang `FooterDistance = 35.4–36 pt`. Hỗ trợ tùy chọn `DifferentFirstPageHeaderFooter = -1` (Trang đầu khác biệt) và `OddAndEvenPagesHeaderFooter = -1` (Trang chẵn lẻ khác biệt).
- **Đánh giá VN Writer:** Đầy đủ vùng nhập Header/Footer, các cờ `differentFirstPage` và `differentOddEven` được lưu và khứ hồi chính xác trong DOCX (xác nhận trong FIX-T8 và `tests/unit/writer-headerfooter-import.test.js`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 8. Trường số trang (Page Numbers)
- **Đo Word COM:** Trường số trang sử dụng mã trường OOXML `w:fldSimple` hoặc `w:instrText` với từ khóa `PAGE` (Field Type 33) và tổng số trang `NUMPAGES` (Field Type 26).
- **Đánh giá VN Writer:** Khi chèn số trang qua Chân trang, VN Writer chèn cặp field PAGE / NUMPAGES còn sống (dynamic fields), xuất ra OOXML chuẩn để khi Word mở lên sẽ tự tính toán số trang hiện tại của tài liệu.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 9. Mục lục tự động (Table of Contents)
- **Đo Word COM:** Đối tượng `TableOfContents` sinh trường `TOC \o "1-3" \h \z \u`, quét tự động các đoạn văn có kiểu dáng `Heading 1`, `Heading 2`, `Heading 3` và hiển thị số trang tương ứng bên phải kèm dấu chấm dẫn đường.
- **Đánh giá VN Writer:** Lệnh `writer.reference.tocInsert` quét cấu trúc tiêu đề Heading 1–3 trong tài liệu, sinh bảng mục lục có liên kết nội bộ. Lệnh `writer.reference.tocUpdate` làm mới nội dung khi các tiêu đề thay đổi. FIX-T8 đã xác minh Word COM đọc lại DOCX hiển thị TOC chính xác.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 10. Chú thích chân trang & cuối tài liệu (Footnotes & Endnotes)
- **Đo Word COM:** `Footnotes` đặt ở đáy trang (`wdBottomOfPage=1`), đánh số 1, 2, 3... `Endnotes` đặt ở cuối tài liệu (`wdEndOfDocument=2`), đánh số La Mã i, ii, iii...
- **Đánh giá VN Writer:** Phím tắt `Ctrl+Alt+F` chèn footnote, `Ctrl+Alt+D` chèn endnote. Khi lưu DOCX, hệ thống sinh file `word/footnotes.xml` và `word/endnotes.xml` đúng chuẩn OOXML. FIX-T8 xác nhận Word COM đọc lại đủ cả hai loại chú thích và giữ nguyên nội dung.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 11. Theo dõi thay đổi (Track Changes)
- **Đo Word COM:** Thuộc tính `TrackRevisions = True` kích hoạt chế độ ghi nhận sửa đổi. Khi có chỉnh sửa, Word tạo các đối tượng `Revision` với `Type = 1` (Chèn nội dung mới - wdRevisionInsert) và `Type = 2` (Xóa nội dung - wdRevisionDelete).
- **Đánh giá VN Writer:** Lệnh `writer.trackChanges.toggle` (Ctrl+Shift+E) kích hoạt theo dõi. Hỗ trợ đầy đủ các lệnh duyệt: `next`, `previous`, `acceptOne`, `acceptAll`, `rejectOne`, `rejectAll`. Đối chiếu trong FIX-T8 và fixture `sample-writer-trackchanges.docx` đạt kết quả khớp hoàn toàn với Word COM.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 12. Ngắt phần & Hướng trang (Section Breaks & Orientation)
- **Đo Word COM:** Một tài liệu có thể chứa nhiều `Section`. Mỗi Section có thể cấu hình hướng giấy riêng (`Orientation`: Portrait=0, Landscape=1), khổ giấy riêng, và kiểu ngắt phần (`SectionStart`: Continuous=0, NextPage=2, EvenPage=3, OddPage=4).
- **Đánh giá VN Writer:** Đầy đủ 4 loại ngắt mục trong ribbon **Bố cục > Ngắt**. Khứ hồi DOCX giữ nguyên các section và cho phép trang 1 dọc, trang 2 ngang xen kẽ (xác nhận trong FIX-T8 với 5 section).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 13. Đánh số dòng (Line Numbering)
- **Đo Word COM:** Cấu hình qua `PageSetup.LineNumbering`: `Active = -1` (True), `CountBy = 1`, `RestartMode = 0` (Liên tục).
- **Đánh giá VN Writer:** Nhóm Thiết lập trang có dropdown 4 chế độ: Không đánh số, Liên tục, Mỗi trang, Mỗi mục. OOXML xuất ra thẻ `<w:lnNumType w:countBy="1" w:restart="continuous"/>`. FIX-T12 xác nhận Word COM đọc đúng cấu trúc này.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 14. Chữ lớn đầu đoạn (Drop Cap)
- **Đo Word COM:** Đối tượng `DropCap.Position = 1` (wdDropNormal: chữ cái chìm trong đoạn 3 dòng), `LinesToDrop = 3`.
- **Đánh giá VN Writer:** Lệnh `writer.format.dropCap` hỗ trợ chữ lớn đầu đoạn văn theo đúng thể thức trình bày báo chí / văn bản. FIX-T11 nhóm 2 xác nhận đầu ra DOCX khớp Word COM.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 15. Chia cột báo (Columns Layout)
- **Đo Word COM:** Cấu hình qua `PageSetup.TextColumns`: `SetCount(2)` chia 2 cột đều nhau, khoảng cách mặc định `Spacing = 36 pt` (1.27 cm).
- **Đánh giá VN Writer:** Lệnh chia 1, 2, 3 cột trong ribbon **Bố cục > Cột**. OOXML xuất `<w:cols w:num="2" w:space="720"/>`. AUDIT-DOC-WORD-PARALLEL-1011 xác nhận `TextColumns.Count` khớp Word COM 3/3 trường hợp.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

---
**Tóm tắt kết quả đo kiểm 15 tính năng ưu tiên 1:**
- **14/15 tính năng đạt KHỚP (✅ ĐÃ ĐỐI CHIẾU THỰC TẾ BẰNG WORD COM)**.
- **1/15 tính năng đạt MỘT PHẦN (🟡 Tab Stops - thiếu hộp thoại Tabs và tab leaders)**: Đã ghi nhận rõ nguyên nhân kỹ thuật và đưa vào danh sách đề xuất phiếu việc kế tiếp.
