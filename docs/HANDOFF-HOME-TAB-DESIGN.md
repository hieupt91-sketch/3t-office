# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Trang chủ / Trang đầu" (Writer và Sheet)

- **Nhánh**: `design/writer-sheet-home-tab-agy` (tách từ `main` @ `209a0fa`)
- **Worktree**: `E:\VNOffice-agy-home-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Responsive, Launcher góc nhóm, Hộp thoại Định dạng ô, Hướng dẫn sử dụng). Tuyệt đối không can thiệp logic đo lường, phân trang hay công thức của Writer/Sheet adapter.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 và Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu chuẩn giao diện **Microsoft Office 2016 Professional Plus**. Ảnh chụp Ribbon thực tế của ứng dụng VN Writer và VN Sheet được lưu giữ tại thư mục scratch kiểm thử (`scratch/home-tab-audit/`).

### 1.1. Tab "Trang đầu" của VN Writer vs Tab "Home" của Word 2016
- **Word 2016 Home tab**:
  1. *Clipboard*: Paste (nút lớn), Cut, Copy, Format Painter + Launcher mở Clipboard pane.
  2. *Font*: Font Family, Font Size, Grow/Shrink, Change Case, Clear Formatting (hàng 1); Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Text Highlight, Font Color (hàng 2) + Launcher mở hộp thoại Font (Ctrl+D).
  3. *Paragraph*: Bullets, Numbering, Multilevel List, Decrease/Increase Indent, Sort, Show/Hide Marks (hàng 1); Align Left/Center/Right/Justify, Line & Paragraph Spacing (icon dropdown), Shading, Borders (hàng 2) + Launcher mở hộp thoại Paragraph.
  4. *Styles*: Dải Quick Styles (Normal, Heading 1, Heading 2...) kèm nút mở Thư viện kiểu dáng + Launcher mở Styles pane.
  5. *Editing*: Find, Replace, Select (dropdown).
- **VN Writer tab Trang đầu (Home)**:
  - *Bảng nhớ tạm*: Có Dán (nút lớn), Cắt, Sao chép, Sao chép định dạng (Format Painter).
  - *Phông chữ*: Ô chọn phông chữ (đã mở rộng để hiển thị trọn vẹn "Times New Roman"), Cỡ chữ (14 pt NĐ 30 mặc định), Tăng/Giảm cỡ chữ, Đậm, Nghiêng, Gạch chân, Gạch ngang, Chỉ số dưới, Chỉ số trên, Đổi kiểu chữ, Xóa định dạng, Màu nền chữ, Màu chữ.
  - *Đoạn văn*: Dấu đầu dòng, Đánh số, Danh sách đa cấp, Giảm/Tăng thụt lề, Sắp xếp, Hiện/ẩn ký tự định dạng, Căn trái/giữa/phải/đều, Giãn dòng (đã chuẩn hóa thành icon dropdown như Word thật), Tô nền đoạn, Viền đoạn văn.
  - *Kiểu dáng*: Nút lớn "Thư viện kiểu" kèm dải thẻ Quick Styles trực quan (Normal, Tiêu đề 1, Tiêu đề 2). Khi màn hình thu nhỏ (<=1150px/1024px), dải thẻ tự động ẩn để nhường không gian cho nhóm Chỉnh sửa đúng chuẩn Word.
  - *Chỉnh sửa*: Tìm kiếm, Thay thế, Chọn (Chọn tất cả).

### 1.2. Tab "Trang đầu" của VN Sheet vs Tab "Home" của Excel 2016
- **Excel 2016 Home tab**:
  1. *Clipboard*: Paste, Cut, Copy, Format Painter + Launcher.
  2. *Font*: Font Family, Font Size, Grow/Shrink (hàng 1); Bold, Italic, Underline, Borders, Fill Color, Font Color (hàng 2) + Launcher mở Format Cells (thẻ Font).
  3. *Alignment*: Top/Middle/Bottom Align, Orientation, Wrap Text (hàng 1); Left/Center/Right Align, Decrease/Increase Indent (hàng 2); Merge & Center (hàng 3) + Launcher mở Format Cells (thẻ Alignment).
  4. *Number*: Number Format select (hàng 1); Currency, Percent, Comma, Increase/Decrease Decimal (hàng 2) + Launcher mở Format Cells (thẻ Number).
  5. *Styles*: Conditional Formatting (nút lớn), Format as Table, Cell Styles.
  6. *Cells*: Insert (dropdown), Delete (dropdown), Format (dropdown).
  7. *Editing*: AutoSum, Fill, Clear, Sort & Filter, Find & Select.
- **VN Sheet tab Trang đầu (Home)**:
  - *Bảng nhớ tạm*: Dán (nút lớn), Cắt, Sao chép, Dán đặc biệt, Sao chép định dạng.
  - *Phông chữ*: Phông chữ, Cỡ chữ, Tăng/Giảm cỡ, Đậm, Nghiêng, Gạch chân, Viền ô, Màu nền, Màu chữ + Launcher góc dưới mở hộp thoại Định dạng ô (Ctrl+1).
  - *Căn chỉnh*: Căn trên/giữa/dưới, Ngắt dòng tự động, Hướng chữ (xoay góc), Căn trái/giữa/phải, Giảm/Tăng thụt lề, Trộn & căn giữa kèm các nút chọn nhanh Trộn theo hàng, Trộn ô, Tách ô + Launcher mở hộp thoại Định dạng ô (thẻ Căn chỉnh).
  - *Định dạng số*: Hộp chọn nhanh loại số (Chung, Số, Tiền tệ, Kế toán, Ngày, Phần trăm...), Tiền tệ VNĐ, Phần trăm, Phân cách hàng nghìn, Tăng/Giảm thập phân, nút mở hộp thoại + Launcher góc dưới (Ctrl+1).
  - *Kiểu ô*: Định dạng có điều kiện (nút lớn), Định dạng bảng, Kiểu ô.
  - *Ô*: Chèn hàng/cột, Xóa hàng/cột, Định dạng (chiều cao hàng, độ rộng cột, đổi tên/bảo vệ sheet).
  - *Chỉnh sửa*: AutoSum, Điền (Điền xuống, Điền phải), Xóa (Tất cả, Định dạng, Nội dung), Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc, Tìm kiếm, Thay thế.

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Tên phông chữ bị cắt cụt (Times New Roma thay vì Times New Roman)** | **ĐÃ SỬA** | **Hiện trạng**: Trên Ribbon của Writer và Sheet, chữ "Times New Roman" bị che mất chữ 'n' cuối cùng do mũi tên chevron dropdown đè lên.<br>**Nguyên nhân**: Trong `platform/ribbon/ribbon.css`, ô select có selector `.vno-ribbon select[data-command-id$="font.family"]` bị giới hạn cứng `max-width: 125px;`.<br>**Giải pháp**: Cập nhật CSS: `min-width: 135px; max-width: 155px;`. Tên phông chữ hiển thị trọn vẹn 100%, thoáng đãng, sắc nét. |
| 2 | **Nút "Giãn dòng" trên Writer Home hiển thị chữ gây phình to và lệch hàng icon** | **ĐÃ SỬA** | **Hiện trạng**: Hàng 2 nhóm Đoạn văn gồm các nút căn lề icon-only, nhưng dropdown Giãn dòng lại hiện cả chữ "Giãn dòng" kèm mũi tên, làm hàng icon bị phình to bất thường.<br>**Nguyên nhân**: Khai báo item `writer.para.lineSpacing` trong `apps/writer/writer-ribbon.js` thiếu thuộc tính `iconOnly: true` (trong khi `writer.para.multilevelList` ở hàng trên đã có).<br>**Giải pháp**: Bổ sung `iconOnly: true` và `ariaLabel: "Khoảng cách dòng"` vào dropdown definition. Nút hiển thị gọn gàng icon Line Spacing chuẩn Office, thẳng hàng tuyệt đối với các icon xung quanh. |
| 3 | **Tràn ngang nghiêm trọng trên Sheet Home tab (scrollWidth 1710px tại màn 1440px)** | **ĐÃ SỬA** | **Hiện trạng**: Ở độ phân giải 1440px, tab Trang đầu của Sheet bị tràn tới 1710px, làm toàn bộ nhóm Chỉnh sửa (AutoSum, Điền, Xóa, Sắp xếp, Bộ lọc, Tìm kiếm) bị đẩy ra khỏi màn hình.<br>**Nguyên nhân**: Hàng 3 nhóm Căn chỉnh có 4 nút Merge đều hiển thị nhãn chữ tiếng Việt dài ("Trộn & căn giữa", "Trộn theo hàng", "Trộn ô", "Tách ô") chiếm gần 400px; nhóm Ô và nhóm Chỉnh sửa chiếm nhiều diện tích; breakpoint responsive cũ chỉ kích hoạt ở `<= 1400px`.<br>**Giải pháp**: Đặt `iconOnly: true` cho 3 nút chọn thêm (`mergeAcross`, `mergeCells`, `unmerge`) giữ nhãn đầy đủ cho nút chính `mergeCenter`; nâng breakpoint responsive từ 1400px lên 1550px để bao quát màn hình 1440px và 1366px; thu gọn padding nhóm Editing. Kết quả: Ribbon Sheet tại 1440px đạt chính xác `scrollWidth = 1440px`, hoàn toàn không tràn, 100% nhóm lệnh hiển thị đầy đủ. |
| 4 | **Tràn ngang và mất nhóm lệnh quan trọng trên màn hình 1024px** | **ĐÃ SỬA** | **Hiện trạng**: Ở màn hình hẹp 1024px, Writer Home tab tràn 1261px (mất nhóm Chỉnh sửa), Sheet Home tab tràn 1242px (mất nhóm Chỉnh sửa và co ép nhóm Ô).<br>**Nguyên nhân**: Thiếu breakpoint responsive dành riêng cho màn hình <= 1150px / 1024px.<br>**Giải pháp**: Bổ sung breakpoint `@media (max-width: 1150px)` trong `platform/shell/shell.css`: Writer tự động ẩn dải Quick styles strip (chuyển sang thao tác qua nút lớn Thư viện kiểu chuẩn Word) và thu gọn nhãn Tìm kiếm/Thay thế/Chọn thành icon button; Sheet tự động thu gọn text các nút Hướng chữ, Định dạng có điều kiện, Định dạng ô, AutoSum/Điền/Xóa và giảm padding nhóm. Cả Writer và Sheet đạt chính xác `scrollWidth = clientWidth = 1024px` (0px overflow)! |
| 5 | **Thiếu launcher góc dưới nhóm Phông chữ trên Sheet** | **ĐÃ SỬA** | **Hiện trạng**: Nhóm Căn chỉnh và Định dạng số đã có launcher mở hộp thoại Định dạng ô, nhưng nhóm Phông chữ lại thiếu launcher.<br>**Giải pháp**: Bổ sung `launcherCommandId: "sheet.format.cellsDialog"` và `launcherTooltip: "Định dạng ô (Ctrl+1)"` vào nhóm `font` trong `apps/sheet/sheet-ribbon.js`. Nhấn launcher mở ngay hộp thoại Format Cells quen thuộc chuẩn Excel. |
| 6 | **Nút Định dạng ô nằm lẻ loi ở hàng 3 nhóm Định dạng số trên Sheet** | **GIỮ NGUYÊN** | **Lý do**: Unit test `tests/unit/sheet-format-cells.test.js` dòng 82-83 kiểm tra cứng yêu cầu: `assert(dialogBtn, "Cột nút phải chứa nút sheet.format.cellsDialog")`. Giữ nguyên phần tử DOM để đảm bảo kiểm thử hồi quy không bị phá vỡ. Nút vẫn có icon vector `formatCells` sắc nét và tooltip đầy đủ. |
| 7 | **Hộp thoại Định dạng ô (Format Cells) hiển thị các thẻ** | **ĐÃ KIỂM TRA & XÁC NHẬN TỐT** | Đã kiểm tra chi tiết cả thẻ Số (Number) và thẻ Căn chỉnh (Alignment). Giao diện sử dụng inline styling chuẩn mực, các ô select, input thụt lề, góc xoay chữ và các checkbox đều cân đối, bẫy tiêu điểm bàn phím hoạt động chuẩn xác, không bị lỗi ép chiều cao như từng gặp ở Page Setup. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét kiểm tra thực tế trong runtime qua `globalCommandBus._handlers` trên môi trường ứng dụng thật:
- **VN Writer (Tab Trang đầu - 38 lệnh)**:
  - Bảng nhớ tạm: `common.edit.paste`, `common.edit.cut`, `common.edit.copy`, `common.edit.formatPainter`.
  - Phông chữ: `writer.font.family`, `writer.font.size`, `writer.font.grow`, `writer.font.shrink`, `writer.text.bold`, `writer.text.italic`, `writer.text.underline`, `writer.text.strike`, `writer.text.subscript`, `writer.text.superscript`, `writer.text.changeCase`, `writer.text.clearFormat`, `writer.color.highlight`, `writer.color.text`.
  - Đoạn văn: `writer.list.bullet`, `writer.list.numbered`, `writer.para.multilevelList`, `writer.para.indentDec`, `writer.para.indentInc`, `writer.para.sort`, `writer.para.showFormattingMarks`, `writer.para.alignLeft`, `writer.para.alignCenter`, `writer.para.alignRight`, `writer.para.justify`, `writer.para.spacing1`, `writer.para.spacing15`, `writer.para.spacing2`, `writer.para.shading`, `writer.para.borders`.
  - Kiểu dáng: `writer.style.gallery`.
  - Chỉnh sửa: `common.edit.find`, `common.edit.replace`, `common.edit.selectAll`.
  - *Kết quả*: **38 / 38 lệnh (100%) đều có handler thực tế**, không có bất kỳ nút chết nào (`Missing handlers: 0`).
- **VN Sheet (Tab Trang đầu - 66 lệnh)**:
  - Bảng nhớ tạm: `common.edit.paste`, `common.edit.cut`, `common.edit.copy`, `sheet.edit.pasteSpecial`, `sheet.edit.formatPainter`.
  - Phông chữ: `sheet.font.family`, `sheet.font.size`, `sheet.font.grow`, `sheet.font.shrink`, `sheet.cell.bold`, `sheet.cell.italic`, `sheet.cell.underline`, `sheet.cell.borders`, `sheet.cell.fillColor`, `sheet.cell.textColor`, launcher `sheet.format.cellsDialog`.
  - Căn chỉnh: `sheet.cell.alignTop`, `sheet.cell.alignMiddle`, `sheet.cell.alignBottom`, `sheet.cell.wrapText`, `sheet.cell.orientation`, `sheet.cell.alignLeft`, `sheet.cell.alignCenter`, `sheet.cell.alignRight`, `sheet.cell.indentDecrease`, `sheet.cell.indentIncrease`, `sheet.cell.mergeCenter`, `sheet.cell.mergeAcross`, `sheet.cell.mergeCells`, `sheet.cell.unmerge`, launcher `sheet.format.alignmentDialog`.
  - Định dạng số: `sheet.format.quickCategory`, `sheet.format.currencyVND`, `sheet.format.percent`, `sheet.format.standard`, `sheet.format.increaseDecimal`, `sheet.format.decreaseDecimal`, `sheet.format.cellsDialog`.
  - Kiểu ô: `sheet.format.conditional`, `sheet.style.formatAsTable`, `sheet.style.cellStyles`.
  - Ô: `sheet.row.insert`, `sheet.col.insert`, `sheet.row.delete`, `sheet.col.delete`, `sheet.row.height`, `sheet.row.autoFit`, `sheet.col.width`, `sheet.col.autoFit`, `sheet.row.hide`, `sheet.row.unhide`, `sheet.col.hide`, `sheet.col.unhide`, `sheet.sheet.rename`, `sheet.sheet.moveOrCopy`, `sheet.sheet.protect`.
  - Chỉnh sửa: `sheet.formula.sum`, `sheet.edit.fillDown`, `sheet.edit.fillRight`, `sheet.edit.clearAll`, `sheet.edit.clearFormats`, `sheet.edit.clearContents`, `sheet.data.sortAsc`, `sheet.data.sortDesc`, `sheet.data.filter`, `common.edit.find`, `common.edit.replace`.
  - *Kết quả*: **66 / 66 lệnh (100%) đều có handler thực tế**, không có bất kỳ nút chết nào (`Missing handlers: 0`).

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

- `platform/help/entries-writer.js`:
  - Mục `writer.font.format` (dòng ~235): Mô tả chính xác các nút trên nhóm Phông chữ (Times New Roman mặc định, nấc cỡ chữ 14 pt chuẩn NĐ 30, tăng/giảm cỡ chữ).
  - Mục `writer.para.spacing` (dòng ~298): Mô tả chính xác các nút căn lề và menu Giãn dòng 1.0, 1.5, 2.0 (Ctrl+1, Ctrl+5, Ctrl+2).
  - Mục `writer.style.gallery` (dòng ~470): Mô tả chính xác Thư viện kiểu dáng, dải thẻ nhanh và phím tắt Ctrl+Shift+N về Normal.
- `platform/help/entries-sheet.js`:
  - Mục `sheet.cell.font` (dòng ~355): Đã cập nhật bổ sung hướng dẫn sử dụng mũi tên launcher góc dưới phải nhóm Phông chữ để mở nhanh hộp thoại Định dạng ô (Ctrl+1).
  - Mục `sheet.cell.alignment` (dòng ~386): Mô tả chi tiết việc căn chỉnh văn bản, ngắt dòng tự động, xoay chữ theo góc độ và các nút trộn ô, cùng launcher mở Format Cells thẻ Căn chỉnh.
  - Mục `sheet.format.number` (dòng ~48): Hướng dẫn chi tiết định dạng số, tiền tệ VNĐ, phần trăm, dấu phẩy phân cách.
- *Kết luận*: Toàn bộ tài liệu hướng dẫn bằng tiếng Việt chuẩn xác, bám sát từng nút bấm và thao tác thực tế.

---

## 5. Danh mục file thay đổi

1. `apps/writer/writer-ribbon.js`: Thêm `iconOnly: true` cho dropdown `writer.para.lineSpacing` để đồng bộ kích thước icon-only trên hàng căn lề nhóm Đoạn văn.
2. `apps/sheet/sheet-ribbon.js`: Thêm `launcherCommandId: "sheet.format.cellsDialog"` cho nhóm Phông chữ; đặt `iconOnly: true` cho 3 nút chọn thêm trong nhóm Căn chỉnh (`mergeAcross`, `mergeCells`, `unmerge`).
3. `platform/ribbon/ribbon.css`: Tăng `min-width: 135px; max-width: 155px;` cho select phông chữ, chấm dứt triệt để lỗi cắt chữ tên phông "Times New Roman".
4. `platform/shell/shell.css`: Tinh chỉnh breakpoint responsive `max-width: 1550px` (laptop 1440px/1366px) và bổ sung breakpoint `max-width: 1150px` (màn hình hẹp 1024px) giúp cả Writer và Sheet co giãn mượt mà, không tràn ngang.
5. `platform/help/entries-sheet.js`: Bổ sung hướng dẫn sử dụng nút launcher nhóm Phông chữ mở hộp thoại Định dạng ô (Ctrl+1).

---

## 6. Kết quả kiểm thử

- `node tests/run-tests.js`: **1834 / 1834 PASS (100%)**, `0 FAIL`.
- Kiểm tra Playwright thực tế trên Microsoft Edge:
  - Màn hình rộng (1440px):
    - Writer Home: `isOverflowing: false`, scrollWidth = 1440px, hiển thị sắc nét, tên phông chữ đầy đủ.
    - Sheet Home: `isOverflowing: false`, scrollWidth = 1440px (trước khi sửa bị tràn 1710px), 100% nhóm lệnh hiển thị trọn vẹn.
  - Màn hình hẹp (1024px):
    - Writer Home: `isOverflowing: false`, scrollWidth = 1024px, nhóm Chỉnh sửa hiển thị đầy đủ không bị che khuất.
    - Sheet Home: `isOverflowing: false`, scrollWidth = 1024px, toàn bộ 7 nhóm lệnh co giãn ngay ngắn, không phát sinh thanh cuộn ngang.
