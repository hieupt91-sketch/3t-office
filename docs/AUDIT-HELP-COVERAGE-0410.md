# BÁO CÁO RA SỌT BAO PHỦ TRỢ GIÚP (HELP COVERAGE AUDIT)
**Ngày:** 04/10/2026  
**Branch:** `docs/audit-help-0410-opencode` (từ `main`)  
**Phạm vi:** Ra soát tài liệu — **KHÔNG SỬA MÃ** (apps, adapters, platform, main.py, tests)

---

## 1. TỔNG QUAN SỐ LIỆU

| Ứng dụng | Tổng lệnh (command-definitions.js) | Có bài help | Thiếu bài | Tỷ lệ bao phủ |
|----------|-----------------------------------|-------------|-----------|---------------|
| **Common** | 39 | 36 | 3 | 92.3% |
| **VN Writer (Doc)** | 162 | 161 | 1 | 99.4% |
| **VN Sheet** | 164 | 160 | 4 | 97.6% |
| **VN Slides** | 112 | 111 | 1 | 99.1% |
| **TỔNG** | **477** | **468** | **9** | **98.1%** |

**Tổng bài hướng dẫn trong catalog:** 280 entries (writer: 94, sheet: 100, slides: 60, common: 26)  
**Tổng commandId được bao phủ bởi help entries:** 496 (có command trùng lặp giữa các bài)

---

## 2. LỆNH THIẾU BÀI HƯỚNG DẪN (KHÔNG CÓ commandIds TRONG HELP_ENTRIES)

| Ứng dụng | Command ID | Label | Tab/Ribbon Group | Mức độ ưu tiên |
|----------|------------|-------|------------------|----------------|
| **Common** | `common.edit.repeat` | Lặp lại (F4) | Trang đầu / Chỉnh sửa | Cao |
| **Common** | `common.view.fullScreen` | Toàn màn hình (F11) | Chế độ xem / Hiển thị | Trung bình |
| **Common** | `common.view.toggleTheme` | Chế độ Tối/Sáng | Chế độ xem / Hiển thị | Cao |
| **Doc** | `writer.ruler.getState` | Đọc trạng thái thước | Chế độ xem / Hiển thị | Thấp (internal) |
| **Sheet** | `sheet.cell.insertLineBreak` | Xuống dòng trong ô (Alt+Enter) | Trang đầu / Ô | **Cao** (hàng ngày) |
| **Sheet** | `sheet.cell.merge` | Trộn ô | Trang đầu / Căn chỉnh | Cao |
| **Sheet** | `sheet.calc.calculateNow` | Tính lại ngay (F9) | Công thức / Tính toán | Cao |
| **Sheet** | `sheet.cells.format` | Định dạng ô (menu) | Trang đầu / Ô | Trung bình |
| **Slides** | `slides.edit.select` | Chọn | Trang đầu / Chỉnh sửa | Trung bình |

> **Chú ý:** `writer.ruler.getState` là lệnh nội bộ (không hiển thị trên Ribbon), ưu tiên thấp.

---

## 3. LỆNH CÓ NHIỀU BÀI HƯỚNG DẪN (CẦN RÀ SOÁT TRÙNG LẶP/NỘI DUNG)

Các lệnh sau được tham chiếu bởi **≥2 help entries** — cần kiểm tra xem nội dung có trùng lặp, mâu thuẫn hoặc người dùng bị rối không:

### VN Writer (Doc)
| Command ID | Label | Số bài | Help Entry IDs |
|------------|-------|--------|----------------|
| `writer.text.bold` | Đậm | 2 | `writer.text.basicFormat`, `writer.shortcuts` |
| `writer.text.italic` | Nghiêng | 2 | `writer.text.basicFormat`, `writer.shortcuts` |
| `writer.text.underline` | Gạch chân | 2 | `writer.text.basicFormat`, `writer.shortcuts` |
| `writer.para.alignLeft` | Căn trái | 2 | `writer.para.alignAndList`, `writer.para.alignmentSpacing` |
| `writer.para.alignCenter` | Căn giữa | 2 | `writer.para.alignAndList`, `writer.para.alignmentSpacing` |
| `writer.para.alignRight` | Căn phải | 2 | `writer.para.alignAndList`, `writer.para.alignmentSpacing` |
| `writer.para.justify` | Căn đều | 2 | `writer.para.alignAndList`, `writer.para.alignmentSpacing` |
| `writer.para.spacing1/15/2` | Giãn dòng 1.0/1.5/2.0 | 2 | `writer.para.alignAndList`, `writer.para.alignmentSpacing` |
| `writer.para.lineSpacing` | Giãn dòng | 2 | `writer.para.alignmentSpacing`, `writer.para.lineSpacingHelp` |
| `writer.para.indentInc` | Thụt lề | 2 | `writer.para.alignAndList`, `writer.para.multilevelList` |
| `writer.para.indentDec` | Giảm thụt lề | 2 | `writer.para.alignAndList`, `writer.para.multilevelList` |
| `writer.section.continuous` | Ngắt mục — Liên tục | 2 | `writer.section.breaks`, `writer.differences` |
| `writer.insert.equation` | Phương trình | 2 | `writer.insert.equationHelp`, `writer.differences` |
| `writer.insert.symbol` | Ký hiệu | 2 | `writer.insert.symbol`, `common.dialog.symbolPickerHelp` |
| `writer.help.open` | Trợ giúp (F1) | 4 | `writer.help.guide`, `writer.help.about`, `common.platform.contextualF1Help`, `common.help.contextualF1` |

### VN Sheet
| Command ID | Label | Số bài | Help Entry IDs |
|------------|-------|--------|----------------|
| `sheet.edit.pasteSpecial` | Dán đặc biệt | 2 | `sheet.edit.pasteSpecialHelp`, `common.platform.pasteSpecialHelp` |
| `sheet.cell.bold` | Đậm | 2 | `sheet.cell.font`, `sheet.shortcuts` |
| `sheet.font.family/size/grow/shrink` | Phông/Cỡ chữ | 2 | `sheet.format.defaultWorkbook`, `sheet.cell.font` |
| `sheet.nav.home/end` | Ô đầu/cuối | 2 | `sheet.nav.keyboardSelect`, `sheet.shortcuts` |
| `sheet.cell.edit` | Chỉnh sửa ô (F2) | 2 | `sheet.nav.keyboardSelect`, `sheet.shortcuts` |
| `sheet.select.column/row` | Chọn cột/hàng | 2 | `sheet.nav.keyboardSelect`, `sheet.shortcuts` |

### VN Slides
| Command ID | Label | Số bài | Help Entry IDs |
|------------|-------|--------|----------------|
| *(không có lệnh nào ≥2 entries)* | | | |

---

## 4. KIỂM TRA THUẬT NGỮ (TERMINOLOGY CHECK)

### ✅ KHÔNG tìm thấy từ cấm trong nội dung hướng dẫn:
- `Word`, `Excel`, `PowerPoint`, `LibreOffice`, `Microsoft Word`, `Microsoft Excel`, `Microsoft PowerPoint`

### ⚠️ VẤN ĐỀ NAMING (43 entries dùng "3T Office" thay vì "Doc/Sheet/Slide")
Theo quy định AGENTS.md §10: *"Sản phẩm '3T Office', các ứng dụng viết ngắn gọn: Doc, Sheet, Slide (không tiền tố 3T)"*

**Các entry vi phạm (cần sửa tên ứng dụng trong nội dung):**

**Writer (7):** `writer.insert.wordart`, `writer.page.watermarkBorder`, `writer.file.printPreviewHelp`, `writer.gettingStarted`, `writer.shortcuts`, `writer.differences`, `writer.accessibility.keyboardNav`

**Sheet (16):** `sheet.file.basics`, `sheet.formula.externalLinks`, `sheet.sheet.protect`, `sheet.view.workbookViews`, `sheet.view.zoomWindowExtra`, `sheet.review.commentInsert`, `sheet.file.backstage`, `sheet.clipboard.cutCopyPaste`, `sheet.gettingStarted`, `sheet.shortcuts`, `sheet.differences`, `sheet.accessibility.keyboardNav`, `sheet.cell.font`, `sheet.nav.keyboardSelect`, `sheet.cell.alignment`, `sheet.page.setupRound2`

**Slides (20):** `slides.insert.wordart`, `slides.file.printPreview`, `slides.insert.headerFooterHelp`, `slides.view.readingAndGuides`, `slides.gettingStarted`, `slides.shortcuts`, `slides.differences`, `slides.mouse.operations`, `slides.accessibility.keyboardNav`, `slides.macro.basics`, `slides.help.about`, `slides.review.commentInsertHelp`, `slides.review.spellCheckHelp`, `slides.insert.drawing`, `slides.insert.table`, `slides.shape.groupUngroup`, `slides.show.start`, `slides.view.normal`, `slides.file.printPreview`, `slides.view.zoom`

> **Đề xuất:** Thay "3T Office" → "Doc"/"Sheet"/"Slide" trong các bước hướng dẫn (steps) và summary. Giữ "3T Office" chỉ khi nói về *bộ sản phẩm* (ví dụ: "bộ 3T Office", "3T Technology").

---

## 5. KIỂM TRA TÍNH NĂNG MỚI 03-04/10/2026

| Tính năng | Command ID | Help Entry | Trạng thái | Ghi chú |
|-----------|------------|------------|------------|---------|
| **Hộp Tệp > Tài khoản và bản quyền** | `common.file.backstage` (mở tab Tài khoản) | `writer.file.licenseAccount`, `sheet.file.licenseAccount`, `slides.file.licenseAccount` | ✅ **ĐÃ CÓ** | 3 entry riêng cho từng app, nội dung tiếng Việt chi tiết, đúng thuật ngữ "Doc/Sheet/Slide", "mã kích hoạt 3TO-XXXXX..." |
| **Xem nhanh tệp Excel lớn (Sheet)** | `common.file.open` (liên quan) | `sheet.file.largeExcelQuickView` | ✅ **ĐÃ CÓ** | Entry `sheet.file.largeExcelQuickView` trong `entries-sheet.js` có 4 bước cụ thể: mở file, xem nhanh chỉ đọc, chặn chỉnh sửa khi đang nạp, chuyển sang chỉnh sửa khi xong. **Đúng thuật ngữ "Sheet"**. |

---

## 6. ĐÁNH GIÁ CHẤT LƯỢNG NỘI DUNG (SAMPLE CHECK)

### Mẫu kiểm tra 20 lệnh hàng ngày quan trọng nhất per app:

#### VN Writer (Doc) — 20 lệnh ưu tiên cao
| # | Command | Label | Tab / Nhóm | Có bài? | Chất lượng | Đề xuất tiêu đề + 3-5 bước |
|---|---------|-------|------------|---------|------------|---------------------------|
| 1 | `common.file.new` | Tạo mới | Tệp / Tài liệu | ✅ | **Đúng** | *Đã có: `writer.file.basics`* |
| 2 | `common.file.open` | Mở tệp | Tệp / Tài liệu | ✅ | **Đúng** | *Đã có: `writer.file.basics`* |
| 3 | `common.file.save` | Lưu (Ctrl+S) | Tệp / Tài liệu | ✅ | **Đúng** | *Đã có: `writer.file.basics`* |
| 4 | `common.file.saveAs` | Lưu bản sao (F12) | Tệp / Tài liệu | ✅ | **Đúng** | *Đã có: `writer.file.basics`* |
| 5 | `common.file.print` | In (Ctrl+P) | Bố cục / In ấn | ✅ | **Đúng** | *Đã có: `writer.file.print`* |
| 6 | `common.edit.undo/redo` | Hoàn tác/Làm lại | Trang đầu / Bảng nhớ tạm | ✅ | **Đúng** | *Đã có: `writer.shortcuts`* |
| 7 | `writer.text.bold/italic/underline` | Đậm/Nghiêng/Gạch chân | Trang đầu / Phông chữ | ✅ | **Cần rà soát** | Gộp 3 bài `writer.text.basicFormat` + `writer.shortcuts` → **1 bài duy nhất** "Định dạng chữ cơ bản" với 5 bước: (1) Bôi chữ, (2) Tab Trang đầu > Phông chữ > nhấn Đậm/Nghiêng/Gạch chân, (3) Phím tắt Ctrl+B/I/U, (4) Nhấn lại để tắt, (5) Ctrl+Z hoàn tác. |
| 8 | `writer.font.family/size` | Phông chữ / Cỡ chữ | Trang đầu / Phông chữ | ✅ | **Đúng** | *Đã có trong `writer.text.basicFormat`* |
| 9 | `writer.color.text/highlight` | Màu chữ / Màu nền | Trang đầu / Phông chữ | ✅ | **Đúng** | *Đã có trong `writer.text.basicFormat`* |
| 10 | `writer.para.alignLeft/Center/Right/Justify` | Căn lề | Trang đầu / Đoạn văn | ✅ | **Cần rà soát** | Gộp `writer.para.alignAndList` + `writer.para.alignmentSpacing` → **1 bài** "Căn lề đoạn văn" 4 bước: (1) Đặt con trỏ/bôi đoạn, (2) Tab Trang đầu > Đoạn văn > chọn Căn trái/giữa/phải/đều, (3) Phím tắt Ctrl+L/E/R/J, (4) Căn đều cho văn bản hành chính. |
| 11 | `writer.para.spacing1/15/2` | Giãn dòng 1.0/1.5/2.0 | Trang đầu / Đoạn văn | ✅ | **Cần rà soát** | Cùng bài trên, thêm bước: (5) Mở menu Giãn dòng > chọn 1.0 (Ctrl+1) / 1.5 (Ctrl+5) / 2.0 (Ctrl+2). |
| 12 | `writer.list.bullet/numbered` | Dấu đầu dòng / Đánh số | Trang đầu / Đoạn văn | ✅ | **Đúng** | *Đã có trong `writer.para.alignAndList`* |
| 13 | `writer.para.indentInc/Dec` | Thụt/Giảm thụt lề | Trang đầu / Đoạn văn | ✅ | **Cần rà soát** | Gộp vào bài "Căn lề đoạn văn" hoặc bài riêng "Thụt lề đoạn văn" 3 bước: (1) Đặt con trỏ trong đoạn, (2) Tab Trang đầu > Đoạn văn > Thụt lề (Ctrl+M) / Giảm thụt (Ctrl+Shift+M), (3) Dùng thước kéo tam giác trái/phải. |
| 14 | `writer.table.insert` | Chèn bảng | Chèn / Bảng biểu | ✅ | **Đúng** | *Đã có: `writer.table.insert`* |
| 15 | `writer.image.insert` | Chèn hình ảnh | Chèn / Minh họa | ✅ | **Đúng** | *Đã có: `writer.image.insert`* |
| 16 | `writer.header.insert/footer.insert` | Đầu/Chân trang | Chèn / Đầu trang-Chân trang | ✅ | **Đúng** | *Đã có: `writer.headerFooter`* |
| 17 | `writer.review.wordCount` | Đếm từ | Đánh giá / Chính tả | ✅ | **Đúng** | *Đã có: `writer.review.wordCount`* |
| 18 | `writer.trackChanges.toggle` | Theo dõi thay đổi | Đánh giá / Theo dõi thay đổi | ✅ | **Đúng** | *Đã có: `writer.trackChanges`* |
| 19 | `common.edit.find/replace` | Tìm/Thay thế (Ctrl+F/H) | Trang đầu / Chỉnh sửa | ✅ | **Đúng** | *Đã có: `common.platform.findReplaceHelp`* |
| 20 | `writer.help.open` | Trợ giúp (F1) | Trợ giúp / Trợ giúp | ✅ | **Cần rà soát** | Gộp 4 bài → **1 bài** "Trợ giúp F1 theo ngữ cảnh" 4 bước: (1) Di chuột/Focus vào nút lệnh bất kỳ, (2) Nhấn F1, (3) Bảng Trợ giúp mở bên phải với bài phù hợp, (4) Gõ từ khóa tìm bài khác. |

#### VN Sheet — 20 lệnh ưu tiên cao
| # | Command | Label | Tab / Nhóm | Có bài? | Chất lượng | Đề xuất |
|---|---------|-------|------------|---------|------------|---------|
| 1 | `common.file.new/open/save/saveAs` | Tạo/Mở/Lưu/Lưu bản sao | Tệp / Sổ làm việc | ✅ | **Đúng** | `sheet.file.basics` |
| 2 | `common.file.print` | In (Ctrl+P) | Tệp / In | ✅ | **Đúng** | `sheet.file.basics` (bước 4) |
| 3 | `sheet.cell.edit` | Chỉnh sửa ô (F2) | — | ✅ | **Cần rà soát** | Gộp `sheet.nav.keyboardSelect` + `sheet.shortcuts` → bài "Chỉnh sửa ô" 3 bước: (1) Chọn ô, (2) Nhấn F2 hoặc click đúp, (3) Gõ sửa, Enter xác nhận/Esc hủy. |
| 4 | `sheet.cell.bold/italic/underline` | Đậm/Nghiêng/Gạch chân | Trang đầu / Phông chữ | ✅ | **Cần rà soát** | Gộp `sheet.cell.font` + `sheet.shortcuts` → bài "Định dạng chữ ô" 4 bước. |
| 5 | `sheet.cell.alignLeft/Center/Right/Top/Middle/Bottom` | Căn lề ô | Trang đầu / Căn chỉnh | ✅ | **Đúng** | `sheet.cell.alignment` |
| 6 | `sheet.cell.wrapText` | Ngắt dòng tự động | Trang đầu / Căn chỉnh | ✅ | **Đúng** | `sheet.cell.alignment` |
| 7 | `sheet.cell.mergeCenter/mergeCells/unmerge` | Trộn/Tách ô | Trang đầu / Căn chỉnh | ✅ / ❌ | **Thiếu `sheet.cell.merge`** | Cần thêm bài "Trộn và tách ô" 4 bước: (1) Chọn vùng, (2) Tab Trang đầu > Căn chỉnh > Trộn & căn giữa / Trộn ô / Tách ô, (3) Ctrl+Z hoàn tác, (4) Lưu ý: trộn chỉ giữ giá trị ô góc trên-trái. |
| 8 | `sheet.format.currencyVND/percent/standard` | VNĐ/%/Phân cách nghìn | Trang đầu / Số | ✅ | **Đúng** | `sheet.format.number` |
| 9 | `sheet.format.cellsDialog` | Định dạng ô (Ctrl+1) | Trang đầu / Số | ✅ | **Đúng** | `sheet.format.cellsDialog` |
| 10 | `sheet.formula.sum/average/count/max/min` | AutoSum/các hàm cơ bản | Công thức / Hàm tính toán | ✅ | **Đúng** | `sheet.formula.basic` |
| 11 | `sheet.formula.insertFunction` | Chèn hàm (Shift+F3) | Công thức / Hàm tính toán | ✅ | **Đúng** | `sheet.formula.basic` (bước 2) |
| 12 | `sheet.data.filter` | Bộ lọc (Ctrl+Shift+L) | Trang đầu / Chỉnh sửa | ✅ | **Đúng** | `sheet.data.validation` (khác nhóm) — **cần bài riêng "Bộ lọc AutoFilter"** |
| 13 | `sheet.data.sortAsc/Desc` | Sắp xếp A-Z/Z-A | Trang đầu / Chỉnh sửa | ✅ | **Đúng** | `sheet.data.pivotTable` (khác) — **cần bài riêng "Sắp xếp dữ liệu"** |
| 14 | `sheet.edit.fillDown/Right` | Điền xuống/phải (Ctrl+D/R) | Trang đầu / Chỉnh sửa | ✅ | **Đúng** | `sheet.edit.fillHelp` (retro) |
| 15 | `sheet.edit.clearAll/Formats/Contents` | Xóa tất cả/định dạng/nội dung | Trang đầu / Chỉnh sửa | ✅ | **Đúng** | `sheet.edit.clearHelp` (retro) |
| 16 | `sheet.view.freezePanes/TopRow/FirstColumn` | Cố định ô/hàng/cột | Chế độ xem / Cửa sổ | ✅ | **Đúng** | `sheet.view.freezePanes` + `sheet.view.freezePanesMenuHelp` |
| 17 | `sheet.page.margins/orientation/size` | Lề/Hướng/Khổ giấy | Bố trí trang / Thiết lập trang | ✅ | **Đúng** | `sheet.page.saveRoundTrip` |
| 18 | `sheet.page.setPrintArea/printTitles` | Đặt vùng in/Tiêu đề in | Bố trí trang / Thiết lập trang | ✅ | **Đúng** | `sheet.page.setupRound2` |
| 19 | `sheet.sheet.rename/moveOrCopy/protect` | Đổi tên/Di chuyển/Bảo vệ trang | Trang đầu / Ô (menu Định dạng) | ✅ | **Đúng** | `sheet.sheet.rename`, `sheet.sheet.moveOrCopy`, `sheet.sheet.protect` |
| 20 | `sheet.file.largeExcelQuickView` | Xem nhanh file lớn | Tệp / Mở | ✅ | **Đúng (MỚI)** | `sheet.file.largeExcelQuickView` — **giữ nguyên**, nội dung tốt. |

#### VN Slides — 20 lệnh ưu tiên cao
| # | Command | Label | Tab / Nhóm | Có bài? | Chất lượng | Đề xuất |
|---|---------|-------|------------|---------|------------|---------|
| 1 | `common.file.new/open/save/saveAs` | Tạo/Mở/Lưu/Lưu bản sao | Tệp / Bản trình chiếu | ✅ | **Đúng** | `slides.file.basics` |
| 2 | `common.file.print` | In (Ctrl+P) | Chế độ xem / Xem trước in | ✅ | **Đúng** | `slides.file.basics` + `slides.file.printPreview` |
| 3 | `slides.slide.new/duplicate/delete` | Trang mới/Nhân đôi/Xóa (Ctrl+M/D/Del) | Trang đầu / Trang chiếu | ✅ | **Đúng** | `slides.slide.manage` |
| 4 | `slides.layout.apply` | Bố cục | Trang đầu / Trang chiếu | ✅ | **Đúng** | `slides.slide.manage` (bước 5) |
| 5 | `slides.text.bold/italic/underline` | Đậm/Nghiêng/Gạch chân | Trang đầu / Phông chữ | ✅ | **Đúng** | `slides.text.fontParagraph` |
| 6 | `slides.font.family/size` | Phông/Cỡ chữ | Trang đầu / Phông chữ | ✅ | **Đúng** | `slides.text.fontParagraph` |
| 7 | `slides.para.alignLeft/Center/Right/Justify` | Căn lề đoạn | Trang đầu / Đoạn văn | ✅ | **Đúng** | `slides.text.fontParagraph` |
| 8 | `slides.list.bullet/numbered` | Dấu đầu dòng/Đánh số | Trang đầu / Đoạn văn | ✅ | **Đúng** | `slides.text.fontParagraph` |
| 9 | `slides.para.indentInc/Dec` | Thụt/Giảm thụt lề | Trang đầu / Đoạn văn | ✅ | **Đúng** | `slides.text.fontParagraph` |
| 10 | `slides.text.insert/shape.insert/image.insert` | Hộp chữ/Hình khối/Ảnh | Trang đầu / Đối tượng vẽ | ✅ | **Đúng** | `slides.insert.drawing` |
| 11 | `slides.insert.table` | Chèn bảng | Chèn / Bảng | ✅ | **Đúng** | `slides.insert.table` |
| 12 | `slides.insert.chart` | Chèn biểu đồ | Chèn / Minh họa | ✅ | **Đúng** | `slides.insert.chart` |
| 13 | `slides.diagram.insert` | Chèn sơ đồ (SmartArt) | Chèn / Minh họa | ✅ | **Đúng** | `slides.diagram.insert` |
| 14 | `slides.insert.wordart` | Chữ nghệ thuật | Chèn / Văn bản | ✅ | **Đúng** | `slides.insert.wordart` (sửa naming "3T Office"→"Slide") |
| 15 | `slides.design.themeGallery` | Chủ đề | Thiết kế / Chủ đề | ✅ | **Đúng** | `slides.design.themeAndSize` |
| 16 | `slides.design.formatBackground` | Định dạng nền | Thiết kế / Tùy chỉnh | ✅ | **Đúng** | `slides.design.formatBackground` |
| 17 | `slides.transition.apply` | Chuyển tiếp | Chuyển tiếp / Hiệu ứng chuyển trang | ✅ | **Đúng** | `slides.transition.apply` |
| 18 | `slides.animation.apply/pane` | Hiệu ứng đối tượng/Ngăn hoạt hình | Hoạt hình / Hiệu ứng đối tượng | ✅ | **Đúng** | `slides.animation.apply`, `slides.animation.pane` |
| 19 | `slides.show.startFromBegin/Current/PresenterMode` | Trình chiếu F5/Shift+F5/Alt+F5 | Trình chiếu / Khởi động chiếu | ✅ | **Đúng** | `slides.show.start` |
| 20 | `slides.review.spellCheck/toggleSpellCheck` | Chính tả (F7) | Đánh giá / Chứng minh | ✅ | **Đúng** | `slides.review.spellCheckHelp` |

---

## 7. KHUYẾN NGHỊ CHUNG

### 7.1. Gộp bài trùng lặp (Ưu tiên CAO)
- **Writer:** Gộp `writer.text.basicFormat` + `writer.shortcuts` (định dạng chữ); gộp `writer.para.alignAndList` + `writer.para.alignmentSpacing` (căn lề + giãn dòng); gộp 4 bài F1.
- **Sheet:** Gộp `sheet.cell.font` + `sheet.shortcuts` + `sheet.format.defaultWorkbook` (phông/cỡ chữ); tách bài "Bộ lọc" và "Sắp xếp" riêng khỏi Pivot/Validation.
- **Slides:** Ít trùng lặp hơn, chủ yếu sửa naming.

### 7.2. Sửa naming "3T Office" → "Doc/Sheet/Slide" (43 entries)
Áp dụng quy tắc: *Trong nội dung hướng dẫn người dùng, dùng tên ngắn gọn Doc/Sheet/Slide. Chỉ dùng "3T Office" khi nói về bộ sản phẩm hoặc công ty 3T Technology.*

### 7.3. Bổ sung 9 lệnh thiếu bài
Ưu tiên cao: `sheet.cell.insertLineBreak` (Alt+Enter), `sheet.cell.merge`, `sheet.calc.calculateNow` (F9), `common.view.toggleTheme`, `common.edit.repeat` (F4).

### 7.4. Kiểm tra UI thực tế cho mỗi bước
Mỗi bài mới/cập nhật phải tham chiếu đúng **Tab label** và **Group label** từ ribbon config hiện tại (ví dụ: Writer tab "Trang đầu" group "Phông chữ", Sheet tab "Trang đầu" group "Số", Slides tab "Trang đầu" group "Đối tượng vẽ").

---

## 8. PHÂN CÔNG ĐỀ XUẤT (CHO CLAUDE/CODEX LÀM SAU)

| Nhóm việc | Mô tả | Ưu tiên | Ghi chú |
|-----------|-------|---------|---------|
| **G1** | Gộp bài trùng lặp Writer (định dạng chữ, căn lề, F1) | Cao | Giảm từ ~15 entries → ~8 entries cho các lệnh cốt lõi |
| **G2** | Gộp bài trùng lặp Sheet (phông chữ, phím tắt) | Cao | Giữ bài chuyên sâu riêng (Pivot, What-If, Validation) |
| **G3** | Sửa naming 43 entries: "3T Office" → "Doc/Sheet/Slide" | Cao | Chỉ sửa chuỗi trong steps/summary, không đổi code logic |
| **G4** | Tạo 9 bài mới cho lệnh thiếu | Cao | Đặc biệt `sheet.cell.insertLineBreak`, `sheet.cell.merge`, `sheet.calc.calculateNow` |
| **G5** | Rà soát 20 lệnh ưu tiên mỗi app: cập nhật steps khớp UI thực tế | Trung bình | Dùng tab/group label từ ribbon config hiện tại |
| **G6** | Kiểm tra entries retro (ribbon/dialogs/platform) có còn phù hợp UI hiện tại | Trung bình | Một số entry retro có thể đã lỗi thời sau khi ribbon refactor |

---

## 9. KẾT LUẬN

- **Bao phủ help:** 98.1% (468/477 lệnh) — **RẤT TỐT**
- **Vấn đề chính:** (1) Trùng lặp bài gây rối người dùng, (2) 43 entries dùng sai tên ứng dụng ("3T Office" thay vì "Doc/Sheet/Slide"), (3) 9 lệnh thiếu bài (trong đó 4 lệnh Sheet hàng ngày).
- **Tính năng mới 03-04/10:** Đã có bài, nội dung tốt, đúng thuật ngữ.
- **Không phát hiện** từ cấm Word/Excel/PowerPoint/LibreOffice trong nội dung hướng dẫn.

**File báo cáo:** `docs/AUDIT-HELP-COVERAGE-0410.md` (file này)  
**Chỉ commit file này.** Không push, không merge.