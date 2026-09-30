# BÁO CÁO PHỦ SÓNG PHÍM TẮT MICROSOFT OFFICE — VN OFFICE

**Ngày lập:** 30/09/2026
**Nguồn kiểm chứng:** `platform/commands/command-definitions.js` (shortcut fields) + `apps/sheet/sheet-grid.js` (keydown handler trực tiếp)
**Test tự động:** `tests/unit/office-shortcut-coverage.test.js` (Regression Guard — chỉ FAIL nếu shortcut đã bind bị mất)

---

## 1. VN WRITER (Microsoft Word)

| Phím tắt | Hành động Office | Đã bind? | Command ID / Xử lý |
|:---|:---|:---:|:---|
| Ctrl+N | Tài liệu mới | ✅ | `common.file.new` |
| Ctrl+O | Mở tệp | ✅ | `common.file.open` |
| Ctrl+S | Lưu | ✅ | `common.file.save` |
| Ctrl+P | In | ✅ | `common.file.print` |
| Ctrl+Z | Hoàn tác | ✅ | `common.edit.undo` |
| Ctrl+Y | Làm lại | ✅ | `common.edit.redo` |
| Ctrl+X | Cắt | ✅ | `common.edit.cut` |
| Ctrl+C | Sao chép | ✅ | `common.edit.copy` |
| Ctrl+V | Dán | ✅ | `common.edit.paste` |
| Ctrl+A | Chọn tất cả | ✅ | `common.edit.selectAll` |
| Ctrl+F | Tìm kiếm | ✅ | `common.edit.find` |
| Ctrl+H | Thay thế | ✅ | `common.edit.replace` |
| Ctrl+B | Đậm | ✅ | `writer.text.bold` |
| Ctrl+I | Nghiêng | ✅ | `writer.text.italic` |
| Ctrl+U | Gạch chân | ✅ | `writer.text.underline` |
| Ctrl+L | Căn trái | ✅ | `writer.para.alignLeft` |
| Ctrl+E | Căn giữa | ✅ | `writer.para.alignCenter` |
| Ctrl+R | Căn phải | ✅ | `writer.para.alignRight` |
| Ctrl+J | Căn đều | ✅ | `writer.para.justify` |
| Ctrl+Shift+> | Tăng cỡ chữ | ✅ | `writer.font.grow` |
| Ctrl+Shift+< | Giảm cỡ chữ | ✅ | `writer.font.shrink` |
| Ctrl+Enter | Ngắt trang | ✅ | `writer.page.break` |
| Ctrl+M | Thụt lề | ✅ | `writer.para.indentInc` |
| Ctrl+Shift+M | Giảm thụt lề | ✅ | `writer.para.indentDec` |
| Ctrl+1 | Giãn dòng 1.0 | ✅ | `writer.para.spacing1` |
| Ctrl+2 | Giãn dòng 2.0 | ✅ | `writer.para.spacing2` |
| Ctrl+5 | Giãn dòng 1.5 | ✅ | `writer.para.spacing15` |
| F12 | Lưu thành | ✅ | `common.file.saveAs` |
| F7 | Kiểm tra chính tả | ✅ | `ai.assistant.grammarCheck` |
| Shift+F3 | Đổi chữ hoa/thường | ✅ | `writer.text.changeCase` |
| Ctrl+K | Liên kết | ✅ | `common.edit.hyperlink` |
| Ctrl+Home | Đầu tài liệu | ✅ | `writer.nav.docStart` |
| Ctrl+End | Cuối tài liệu | ✅ | `writer.nav.docEnd` |
| Ctrl+] | Tăng cỡ chữ (từng bước 1 pt) | ✅ | `writer.font.grow1pt` |
| Ctrl+[ | Giảm cỡ chữ (từng bước 1 pt) | ✅ | `writer.font.shrink1pt` |

**Tổng: 35/35 (100%)**

---

## 2. VN SHEET (Microsoft Excel)

| Phím tắt | Hành động Office | Đã bind? | Command ID / Xử lý |
|:---|:---|:---:|:---|
| Ctrl+N | Sổ làm việc mới | ✅ | `common.file.new` |
| Ctrl+O | Mở tệp | ✅ | `common.file.open` |
| Ctrl+S | Lưu | ✅ | `common.file.save` |
| Ctrl+P | In | ✅ | `common.file.print` |
| Ctrl+Z | Hoàn tác | ✅ | `common.edit.undo` |
| Ctrl+Y | Làm lại | ✅ | `common.edit.redo` |
| Ctrl+X | Cắt | ✅ | `common.edit.cut` |
| Ctrl+C | Sao chép | ✅ | `common.edit.copy` |
| Ctrl+V | Dán | ✅ | `common.edit.paste` |
| Ctrl+A | Chọn tất cả | ✅ | `common.edit.selectAll` |
| Ctrl+F | Tìm kiếm | ✅ | `common.edit.find` |
| Ctrl+H | Thay thế | ✅ | `common.edit.replace` |
| Ctrl+B | Đậm | ✅ | `sheet.cell.bold` |
| Ctrl+I | Nghiêng | ✅ | `sheet.cell.italic` |
| Ctrl+U | Gạch chân | ✅ | `sheet.cell.underline` |
| F2 | Chỉnh sửa ô | ✅ | `sheet.cell.edit` |
| F4 | Lặp lại thao tác cuối | ✅ | `common.edit.repeat` |
| Ctrl+1 | Định dạng ô | ✅ | `sheet.format.cellsDialog` |
| Ctrl+; | Chèn ngày | ✅ | `sheet.insert.date` |
| Ctrl+Shift+; | Chèn giờ | ✅ | `sheet.insert.time` |
| Ctrl+Shift+L | Bộ lọc | ✅ | `sheet.data.filter` |
| Alt+= | AutoSum | ✅ | `sheet.formula.sum` |
| Ctrl+D | Điền xuống | ✅ | `sheet.edit.fillDown` |
| Ctrl+R | Điền phải | ✅ | `sheet.edit.fillRight` |
| Ctrl+Space | Chọn cột | ✅ | `sheet.select.column` |
| Shift+Space | Chọn hàng | ✅ | `sheet.select.row` |
| Ctrl+- | Xóa ô/hàng/cột | ✅ | `sheet-grid.js` keydown handler (`handleDeleteShortcut`: xóa ngay khi chọn hàng/cột, hiện hộp thoại khi chọn ô) |
| Ctrl+Shift++ | Chèn ô/hàng/cột | ✅ | `sheet.insert.cells` / `sheet-grid.js` keydown handler (`handleInsertShortcut`: chèn ngay khi chọn hàng/cột, hiện hộp thoại khi chọn ô) |
| Ctrl+ArrowUp | Nhảy tới biên dữ liệu (lên) | ✅ | `sheet-grid.js` keydown handler |
| Ctrl+ArrowDown | Nhảy tới biên dữ liệu (xuống) | ✅ | `sheet-grid.js` keydown handler |
| Ctrl+ArrowLeft | Nhảy tới biên dữ liệu (trái) | ✅ | `sheet-grid.js` keydown handler |
| Ctrl+ArrowRight | Nhảy tới biên dữ liệu (phải) | ✅ | `sheet-grid.js` keydown handler |
| Ctrl+PageUp | Trang tính trước | ✅ | `sheet-grid.js` keydown handler |
| Ctrl+PageDown | Trang tính sau | ✅ | `sheet-grid.js` keydown handler |
| F11 | Chèn biểu đồ | ✅ | `sheet-grid.js` keydown handler (`sheet.chart.insert`) |
| Shift+F11 | Chèn trang tính mới (trước trang hiện tại) | ✅ | `sheet.sheet.insertBefore` / `sheet-grid.js` keydown handler (`addSheetBefore`) |
| Alt+Enter | Xuống dòng trong ô | ✅ | `sheet-grid.js` formulaInput handler |

**Tổng: 37/37 (100%)**

---

## 3. VN SLIDES (Microsoft PowerPoint)

| Phím tắt | Hành động Office | Đã bind? | Command ID / Xử lý |
|:---|:---|:---:|:---|
| Ctrl+N | Bản trình bày mới | ✅ | `common.file.new` |
| Ctrl+O | Mở tệp | ✅ | `common.file.open` |
| Ctrl+S | Lưu | ✅ | `common.file.save` |
| Ctrl+P | In | ✅ | `common.file.print` |
| Ctrl+Z | Hoàn tác | ✅ | `common.edit.undo` |
| Ctrl+Y | Làm lại | ✅ | `common.edit.redo` |
| Ctrl+X | Cắt | ✅ | `common.edit.cut` |
| Ctrl+C | Sao chép | ✅ | `common.edit.copy` |
| Ctrl+V | Dán | ✅ | `common.edit.paste` |
| Ctrl+A | Chọn tất cả | ✅ | `common.edit.selectAll` |
| Ctrl+F | Tìm kiếm | ✅ | `common.edit.find` |
| Ctrl+H | Thay thế | ✅ | `common.edit.replace` |
| Ctrl+B | Đậm | ✅ | `slides.text.bold` |
| Ctrl+I | Nghiêng | ✅ | `slides.text.italic` |
| Ctrl+U | Gạch chân | ✅ | `slides.text.underline` |
| Ctrl+M | Trang chiếu mới | ✅ | `slides.slide.new` |
| Ctrl+D | Nhân đôi trang | ✅ | `slides.slide.duplicate` |
| F5 | Trình chiếu từ đầu | ✅ | `slides.show.startFromBegin` |
| Shift+F5 | Trình chiếu từ trang này | ✅ | `slides.show.startFromCurrent` |
| Ctrl+G | Nhóm đối tượng | ✅ | `slides.shape.group` |
| Ctrl+Shift+G | Bỏ nhóm | ✅ | `slides.shape.ungroup` |
| Ctrl+E | Căn giữa | ✅ | `slides.para.alignCenter` |
| Ctrl+L | Căn trái | ✅ | `slides.para.alignLeft` |
| Ctrl+R | Căn phải | ✅ | `slides.para.alignRight` |
| Ctrl+J | Căn đều | ✅ | `slides.para.justify` |

**Tổng: 25/25 (100%)**

---

## TỔNG KẾT

| Ứng dụng | Đã bind | Tổng | Tỉ lệ |
|:---|:---:|:---:|:---:|
| VN Writer | 35 | 35 | 100% |
| VN Sheet | 37 | 37 | 100% |
| VN Slides | 25 | 25 | 100% |
| **TỔNG** | **97** | **97** | **100%** |

### Phím tắt còn thiếu (0)
Đã hoàn thành đầy đủ 97/97 phím tắt chuẩn Office.

### Phím tắt ngữ cảnh (Contextual Shortcuts)
- Trong VN Sheet, khi con trỏ đang trong vùng bảng tính (grid):
  - `Ctrl+-` ưu tiên gọi lệnh xóa ô/hàng/cột theo chuẩn Excel (`handleDeleteShortcut`) thay vì zoom out toàn cục.
  - `F11` ưu tiên gọi lệnh tạo biểu đồ theo chuẩn Excel thay vì toàn màn hình toàn cục.
  - Cả hai thao tác đều hỗ trợ hoàn tác đầy đủ qua `Ctrl+Z`.
