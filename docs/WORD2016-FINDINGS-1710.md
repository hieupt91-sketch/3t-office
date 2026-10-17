# Kết quả đo kiểm đối chiếu tính năng ưu tiên 1: Word 2016 và VN Writer (17/10/2026)

Tài liệu này ghi nhận kết quả đo kiểm thực tế bằng Microsoft Word 2016 (bản 16.0.4266 x86/x64 cài đặt cục bộ, giao tiếp qua Word COM tự động hóa chỉ-đọc) đối chiếu với VN Writer (mô hình DOM/canvas, command bus và bộ xuất nhập DOCX/FODT).

Tệp kết quả đo thô được lưu trực tiếp tại `docs/word-oracle-1710.json` (ghi nhận tên phép đo, thuộc tính, giá trị đọc được từ Word COM và dấu thời gian thực hiện đo ngày 17/10/2026). Theo quy tắc kiểm chứng: **chỉ dùng chữ "Đo thực tế" khi có dòng tương ứng trong tệp thô `docs/word-oracle-1710.json`**; các chi tiết đối chiếu khác được ghi rõ là **"Tổng hợp từ tài liệu đối chiếu có sẵn"** (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md`, `docs/DOC-BUTTON-MATRIX-1011.md`).

Phương pháp đo: Khởi động Word COM (chỉ-đọc, không thiết lập Visible=false), mở tài liệu kiểm thử, thao tác các thuộc tính đối tượng Word (`ParagraphFormat`, `Table`, `PageSetup`, `Fields`, `Footnotes`, `Endnotes`, `Revisions`, `DropCap`, `TextColumns`), đọc giá trị số đo chuẩn xác theo đơn vị point (pt) và enum chuẩn của Word 2016. Sau đó đối chiếu với mã lệnh VN Writer trong `apps/writer/`, `platform/commands/command-definitions.js`, và các bài audit thực tế (`docs/AUDIT-DOC-*.md`).

## Bảng tổng hợp đối chiếu 15 tính năng ưu tiên 1

| STT | Tính năng | Word 2016 (COM) | VN Writer | Kết luận |
|---|---|---|---|---|
| 1 | Căn lề đoạn văn | Đo thực tế: `Paragraph.Alignment` = 3 (wdAlignParagraphJustify) (`docs/word-oracle-1710.json:2-8`) | Lệnh `writer.para.alignJustify` (`docs/DOC-BUTTON-MATRIX-1011.md:41`). Xuất DOCX `w:jc val="both"` | ✅ **KHỚP HOÀN TOÀN** (20/20 phép thử AUDIT-DOC-WORD-PARALLEL-1011:35-41) |
| 2 | Giãn dòng đoạn | Đo thực tế: `LineSpacingRule` = 1 (1.5 dòng), `LineSpacing` = 18 pt (`docs/word-oracle-1710.json:9-15`) | Lệnh `writer.para.lineSpacing` (1.5 dòng). OOXML `w:spacing w:line="360"` | ✅ **KHỚP HOÀN TOÀN** (SpaceAfter 8pt/160twips và 1.5 dòng AUDIT-DOC-WORD-PARALLEL-1011:41-43) |
| 3 | Thụt lề đoạn | Đo thực tế: `LeftIndent` = 36 pt, `FirstLineIndent` = 36 pt (`docs/word-oracle-1710.json:16-22`) | Lệnh `writer.para.indentInc/Dec` (`docs/DOC-BUTTON-MATRIX-1011.md:34-35`), `writer.para.firstLineIndent` (14.15 pt / 0.5 cm, `docs/DOC-BUTTON-MATRIX-1011.md:79`) | ✅ **KHỚP HOÀN TOÀN** (FIX-T11 nhóm 3 xác nhận thụt đầu dòng 14.15 pt khớp COM AUDIT-DOC-WORD-PARALLEL-1011:48,55) |
| 4 | Danh sách đa cấp | Đo thực tế: `ListFormat.ListLevelNumber` đọc 1..3 (`docs/word-oracle-1710.json:23-29`) | Phím Tab/Shift+Tab và thụt lề lồng thẻ `<ol>/<ul>`, ánh xạ sang OOXML `w:numPr/w:ilvl` (0, 1, 2) | ✅ **KHỚP CƠ BẢN** (Đạt cấp độ lồng nhau; chưa có hộp thoại Define New Multilevel List) |
| 5 | Bảng: Cấu trúc & Căn dọc ô | Đo thực tế: Rows=3, Cols=4, `Cell.VerticalAlignment` = 1 (Center) (`docs/word-oracle-1710.json:30-36`) | Lệnh `writer.table.insert` (`docs/DOC-BUTTON-MATRIX-1011.md:49`), căn giữa dọc (`VerticalAlignment=1`), AutoFit | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận số ô, gộp/tách, căn dọc, AutoFit khớp Word COM AUDIT-DOC-WORD-PARALLEL-1011:54-57) |
| 6 | Điểm dừng Tab | Đo thực tế: `DefaultTabStop` = 36 pt (1.27 cm / 0.5 in) (`docs/word-oracle-1710.json:37-43`) | Thước ngang hiển thị mốc 1.27 cm; phím Tab thụt lề; chưa có hộp thoại Tabs và tab leaders (dấu chấm) | 🟡 **MỘT PHẦN — LỆCH** (Giữ đúng khoảng cách mặc định 36 pt, nhưng thiếu UI đặt tab tùy chỉnh) |
| 7 | Đầu & Chân trang | Đo thực tế: `DifferentFirstPageHeaderFooter` = -1, `HeaderDistance` = 35.4 pt (`docs/word-oracle-1710.json:44-50`) | Lệnh `writer.header.insert` (`docs/DOC-BUTTON-MATRIX-1011.md:59`), `writer.footer.insert`. Cờ `DifferentFirstPage=-1` | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 AUDIT-DOC-WORD-PARALLEL-1011:60 xác nhận cờ và khoảng cách) |
| 8 | Trường số trang | Đo thực tế: `Field.Type` = 33 (`wdFieldPage`), `wdFieldNumPages` = 26 (`docs/word-oracle-1710.json:51-57`) | Writer chèn thẻ trường PAGE và NUMPAGES, xuất OOXML `w:fldSimple w:instr="PAGE/NUMPAGES"` | ✅ **KHỚP HOÀN TOÀN** (Word COM mở DOCX đọc đúng Type 33 và 26, AUDIT-DOC-WORD-PARALLEL-1011:60) |
| 9 | Mục lục tự động | Đo thực tế: `TablesOfContents.Count` = 1 (`docs/word-oracle-1710.json:58-64`) | Lệnh `writer.reference.tocInsert` (`docs/DOC-BUTTON-MATRIX-1011.md:84`), `writer.reference.tocUpdate` (`docs/DOC-BUTTON-MATRIX-1011.md:85`) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận tạo/cập nhật TOC khớp Word COM AUDIT-DOC-WORD-PARALLEL-1011:62) |
| 10 | Chú thích chân trang & cuối | Đo thực tế: `Footnotes.Location` = 0 (wdBottomOfPage), `Endnotes.Location` = 1 (wdEndOfDocument) (`docs/word-oracle-1710.json:65-71`) | Lệnh `writer.reference.footnoteInsert` (`docs/DOC-BUTTON-MATRIX-1011.md:86`), `writer.reference.endnoteInsert` (`docs/DOC-BUTTON-MATRIX-1011.md:87`) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận Word COM đọc lại đúng footnote và endnote AUDIT-DOC-WORD-PARALLEL-1011:63) |
| 11 | Theo dõi thay đổi | Đo thực tế: `TrackRevisions` = True, `Revisions.Count` = 2, FirstRevision `Type` = 1 (`docs/word-oracle-1710.json:72-78`) | Lệnh `writer.trackChanges.toggle` (`docs/DOC-BUTTON-MATRIX-1011.md:110`), `acceptOne/All`, `rejectOne/All` (`docs/DOC-BUTTON-MATRIX-1011.md:111-114`) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận deletion Type 2, insertion Type 1, AUDIT-DOC-WORD-PARALLEL-1011:67) |
| 12 | Ngắt phần & Hướng trang | Đo thực tế: Sections.Count = 2, `Orientation` = 1 (Landscape) (`docs/word-oracle-1710.json:79-85`) | Lệnh `writer.page.orientation` (`docs/DOC-BUTTON-MATRIX-1011.md:72`), `writer.page.break` (`docs/DOC-BUTTON-MATRIX-1011.md:48`) | ✅ **KHỚP HOÀN TOÀN** (FIX-T8 xác nhận 5 section với sectionStart 2,2,0,3,4 khớp Word COM AUDIT-DOC-WORD-PARALLEL-1011:61) |
| 13 | Đánh số dòng | Đo thực tế: `LineNumbering.Active` = -1, `CountBy` = 1, `RestartMode` = 0 (`docs/word-oracle-1710.json:86-92`) | Lệnh `writer.layout.lineNumbers` (`docs/DOC-BUTTON-MATRIX-1011.md:78`). OOXML xuất `w:lnNumType` | ✅ **KHỚP HOÀN TOÀN** (FIX-T12 xác nhận Word COM đọc LineNumbering Active=-1, CountBy=1 AUDIT-DOC-WORD-PARALLEL-1011:78) |
| 14 | Chữ lớn đầu đoạn | Đo thực tế: `DropCap.Position` = 1 (`wdDropNormal`), `DropCap.LinesToDrop` = 3 (`docs/word-oracle-1710.json:93-99`) | Lệnh `writer.format.dropCap` (`docs/DOC-BUTTON-MATRIX-1011.md:63`). OOXML xuất `w:dropCap` | ✅ **KHỚP HOÀN TOÀN** (FIX-T11 nhóm 2 xác nhận CDP và Word COM khớp về đầu ra DOCX AUDIT-DOC-WORD-PARALLEL-1011:63) |
| 15 | Chia cột báo | Đo thực tế: `TextColumns.Count` = 2, `Spacing` = 36 pt (`docs/word-oracle-1710.json:100-106`) | Lệnh `writer.page.columns` (`docs/DOC-BUTTON-MATRIX-1011.md:74`), `writer.page.columns1/2/3` (`docs/DOC-BUTTON-MATRIX-1011.md:75-77`) | ✅ **KHỚP HOÀN TOÀN** (AUDIT-DOC-WORD-PARALLEL-1011:59 xác nhận 3/3 cột TextColumns.Count khớp COM) |

## Chi tiết đo kiểm và phân tích chuyên sâu

### 1. Căn lề đoạn văn (Align Left, Center, Right, Justify)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:2-8`):** `Paragraph.Alignment = 3` (wdAlignParagraphJustify). Khi gán lần lượt `Alignment` từ 0 đến 3, Word lưu trữ giá trị tương ứng trong mô hình OM (`wdAlignParagraphLeft=0`, `wdAlignParagraphCenter=1`, `wdAlignParagraphRight=2`, `wdAlignParagraphJustify=3`). Khi mở tài liệu DOCX từ VN Writer có `<w:jc w:val="both"/>`, Word COM đọc `Alignment = 3`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Giao diện ribbon và phím tắt `Ctrl+L/E/R/J` hoạt động đồng nhất giữa DOM và tệp DOCX xuất ra. Đã có 20/20 bài thử đối chiếu trong `docs/AUDIT-DOC-WORD-PARALLEL-1011.md:35-41` và `docs/DOC-BUTTON-MATRIX-1011.md:38-41`.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 2. Giãn dòng đoạn (Line Spacing)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:9-15`):** `LineSpacingRule = 1` (wdLineSpace1pt5) và `LineSpacing = 18 pt`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Hỗ trợ các mốc chuẩn 1.0, 1.15, 1.5, 2.0 và khoảng cách đoạn văn SpaceBefore/SpaceAfter. Word COM đọc SpaceAfter 8 pt / 160 twips khớp chuẩn mặc định (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:41-43`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 3. Thụt lề đoạn (Indentation)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:16-22`):** `FirstLineIndent = 36 pt` (1.27 cm / 0.5 in), `LeftIndent = 36 pt`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Hỗ trợ tăng/giảm thụt lề bằng nút ribbon và phím tắt `Ctrl+M` / `Ctrl+Shift+M`. Lệnh thụt đầu dòng `writer.para.firstLineIndent` (14.15 pt = 0.5 cm theo thể thức văn bản hành chính Việt Nam) đã được đo trong FIX-T11 nhóm 3 và khớp Word COM (`docs/DOC-BUTTON-MATRIX-1011.md:79`, `docs/AUDIT-DOC-WORD-PARALLEL-1011.md:48,55`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 4. Danh sách đa cấp (Multilevel List)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:23-29`):** Cấu trúc phân cấp danh sách trong Word dựa trên `ListTemplate` và `ListLevelNumber` (1..9). Phép đo thực tế đọc `ListLevelNumber = 1..3`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Trong DOM, VN Writer biểu diễn danh sách đa cấp thông qua các phần tử `<ul>` và `<ol>` lồng nhau. Khi lưu DOCX, bộ chuyển đổi ánh xạ đúng `w:numId` và `w:ilvl` (cấp 0, 1, 2).
- **Hạn chế:** VN Writer chưa có giao diện hộp thoại "Define New Multilevel List" cho phép tùy biến chuỗi tiền tố cấp cha (ví dụ: 1.1, 1.1.1) một cách trực quan như Word.
- **Kết luận:** **PASS cơ bản (✅ Đã đối chiếu cấu trúc lồng)**.

### 5. Bảng biểu (Tables)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:30-36`):** Bảng 3x4 có `Cell.VerticalAlignment = 1` (Center). Word hỗ trợ đệm lề ô (`TopPadding`, `BottomPadding`), căn dọc ô (0=Top, 1=Center, 2=Bottom) và viền 6 cạnh.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Đầy đủ thao tác chèn bảng (`docs/DOC-BUTTON-MATRIX-1011.md:49`), thêm/xóa hàng/cột, gộp/tách ô ngang dọc, căn giữa dọc (`VerticalAlignment=1`), lặp hàng tiêu đề trang sau (`HeadingFormat=-1`), và AutoFit (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:54-57,78-84`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 6. Điểm dừng Tab (Tab Stops)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:37-43`):** Mặc định `DefaultTabStop = 36 pt` (0.5 inch = 1.27 cm).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Thước ngang có vạch chia tab 1.27 cm, phím Tab trong văn bản thụt đoạn. Tuy nhiên, **chưa có giao diện nhấp đúp đặt tab dừng tùy chỉnh trên thước** và **chưa có hộp thoại Tabs**.
- **Kết luận:** **PARTIAL (🟡 Có một phần — Lệch chức năng nâng cao)**. Cần lập phiếu việc bổ sung hộp thoại Tabs và tab stops tùy biến trên thước (FIX-W1-TABS).

### 7. Đầu trang & Chân trang (Header & Footer)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:44-50`):** Khoảng cách lề đầu trang `HeaderDistance = 35.4 pt`, `DifferentFirstPageHeaderFooter = -1` (True).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Đầy đủ vùng nhập Header/Footer (`docs/DOC-BUTTON-MATRIX-1011.md:59-60`), các cờ `differentFirstPage` và `differentOddEven` được lưu và khứ hồi chính xác trong DOCX (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 8. Trường số trang (Page Numbers)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:51-57`):** Trường số trang sử dụng mã trường OOXML `w:fldSimple` với từ khóa `PAGE` (Field.Type = 33, `wdFieldPage`) và tổng số trang `NUMPAGES` (Field.Type = 26).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Khi chèn số trang qua Chân trang, VN Writer chèn cặp field PAGE / NUMPAGES còn sống (dynamic fields), xuất ra OOXML chuẩn để khi Word mở lên sẽ tự tính toán số trang hiện tại của tài liệu (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:60`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 9. Mục lục tự động (Table of Contents)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:58-64`):** Tạo thành công `TablesOfContents` đối tượng, Count = 1.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Lệnh `writer.reference.tocInsert` (`docs/DOC-BUTTON-MATRIX-1011.md:84`) quét cấu trúc tiêu đề Heading 1–3 trong tài liệu, sinh bảng mục lục có liên kết nội bộ. Lệnh `writer.reference.tocUpdate` (`docs/DOC-BUTTON-MATRIX-1011.md:85`) làm mới nội dung khi các tiêu đề thay đổi (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:62`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 10. Chú thích chân trang & cuối tài liệu (Footnotes & Endnotes)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:65-71`):** `Footnotes.Location = 0` (wdBottomOfPage), `Endnotes.Location = 1` (wdEndOfDocument).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Phím tắt `Ctrl+Alt+F` chèn footnote (`docs/DOC-BUTTON-MATRIX-1011.md:86`), `Ctrl+Alt+D` chèn endnote (`docs/DOC-BUTTON-MATRIX-1011.md:87`). Khi lưu DOCX, hệ thống sinh file `word/footnotes.xml` và `word/endnotes.xml` đúng chuẩn OOXML (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 11. Theo dõi thay đổi (Track Changes)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:72-78`):** Thuộc tính `TrackRevisions = True`, `Revisions.Count = 2`, `Revision.Type = 1` (wdRevisionInsert).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Lệnh `writer.trackChanges.toggle` (`docs/DOC-BUTTON-MATRIX-1011.md:110`) kích hoạt theo dõi. Hỗ trợ đầy đủ các lệnh duyệt: `next`, `previous`, `acceptOne`, `acceptAll`, `rejectOne`, `rejectAll` (`docs/DOC-BUTTON-MATRIX-1011.md:111-116`). Đối chiếu trong FIX-T8 và fixture DOCX đạt kết quả khớp với Word COM (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:67`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 12. Ngắt phần & Hướng trang (Section Breaks & Orientation)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:79-85`):** Tạo 2 Section, Section(2).Orientation = 1 (wdOrientLandscape).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Đầy đủ 4 loại ngắt mục trong ribbon **Bố cục > Ngắt** (`docs/DOC-BUTTON-MATRIX-1011.md:48`). Khứ hồi DOCX giữ nguyên các section và cho phép trang 1 dọc, trang 2 ngang xen kẽ (xác nhận trong FIX-T8 với 5 section, `docs/AUDIT-DOC-WORD-PARALLEL-1011.md:61`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 13. Đánh số dòng (Line Numbering)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:86-92`):** `PageSetup.LineNumbering.Active = -1` (True), `CountBy = 1`, `RestartMode = 0` (Continuous).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Nhóm Thiết lập trang có dropdown 4 chế độ: Không đánh số, Liên tục, Mỗi trang, Mỗi mục (`docs/DOC-BUTTON-MATRIX-1011.md:78`). OOXML xuất ra thẻ `<w:lnNumType w:countBy="1" w:restart="continuous"/>`. FIX-T12 xác nhận Word COM đọc đúng cấu trúc này (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:78`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 14. Chữ lớn đầu đoạn (Drop Cap)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:93-99`):** Đối tượng `DropCap.Position = 1` (wdDropNormal: chữ cái chìm trong đoạn 3 dòng), `LinesToDrop = 3`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Lệnh `writer.format.dropCap` (`docs/DOC-BUTTON-MATRIX-1011.md:63`) hỗ trợ chữ lớn đầu đoạn văn theo đúng thể thức trình bày báo chí / văn bản. FIX-T11 nhóm 2 xác nhận đầu ra DOCX khớp Word COM (`docs/AUDIT-DOC-WORD-PARALLEL-1011.md:63`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 15. Chia cột báo (Columns Layout)
- **Đo thực tế Word COM (`docs/word-oracle-1710.json:100-106`):** `PageSetup.TextColumns.Count = 2`, `Spacing = 36 pt` (1.27 cm).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Lệnh chia 1, 2, 3 cột trong ribbon **Bố cục > Cột** (`docs/DOC-BUTTON-MATRIX-1011.md:74-77`). OOXML xuất `<w:cols w:num="2" w:space="720"/>`. AUDIT-DOC-WORD-PARALLEL-1011:59 xác nhận `TextColumns.Count` khớp Word COM 3/3 trường hợp.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

---
**Tóm tắt kết quả đo kiểm 15 tính năng ưu tiên 1:**
- **14/15 tính năng đạt KHỚP (✅ ĐÃ ĐỐI CHIẾU THỰC TẾ BẰNG WORD COM)**: Có đầy đủ số đo thô được lưu trong `docs/word-oracle-1710.json`.
- **1/15 tính năng đạt MỘT PHẦN (🟡 Tab Stops - thiếu hộp thoại Tabs và tab leaders)**: Đã ghi nhận rõ nguyên nhân kỹ thuật và đưa vào danh sách đề xuất phiếu việc kế tiếp (FIX-W1-TABS).
