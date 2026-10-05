# BÁO CÁO KIỂM THỬ MA TRẬN UNDO / REDO ĐỊNH DẠNG WRITER (TICKET D8)

**Thời gian thực thi:** 2026-10-05T17:37:03.533Z
**Phương thức:** CDP (Chrome DevTools Protocol) qua `tests/live/cdp/session.mjs`
**Kết quả tổng quan:** **0 PASS** / **90 FAIL** (Tổng số 90 lệnh)

## 1. Bảng ma trận Undo / Redo cho các lệnh định dạng Writer

| Lệnh | Áp dụng đổi nội dung | Undo khôi phục đúng | Redo áp lại đúng | Ghi chú |
| :--- | :---: | :---: | :---: | :--- |
| `writer.text.bold` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.italic` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.underline` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.strike` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.subscript` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.superscript` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.text.clearFormat` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.text.changeCase` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.grow` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.shrink` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.grow1pt` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.shrink1pt` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.family` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.font.size` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.color.text` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.color.highlight` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.alignLeft` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.alignCenter` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.alignRight` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.justify` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.para.spacing1` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.spacing15` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.spacing2` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.lineSpacing` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.lineSpacingLayout` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.spacingBefore` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.spacingAfter` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.firstLineIndent` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.indentInc` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.indentDec` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.para.moveUp` | Không | Không | Không | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.para.moveDown` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.sort` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.para.showFormattingMarks` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.shading` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.borders` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.para.multilevelList` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.list.bullet` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.list.numbered` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.list.restartNumbering` | Không | Không | Không | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.list.continueNumbering` | Không | Không | Không | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.style.normal` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.style.apply` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.style.gallery` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.blank` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.break` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.watermark` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.page.color` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.border` | Không | Không | Không | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.page.columns1` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.page.columns2` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.columns3` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.columns` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.page.margins` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.page.orientation` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.page.size` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.coverPage` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.removeCoverPage` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.textbox` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.insert.wordart` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.symbol` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.dateTime` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.equation` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.insert.bookmark` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.insert.crossReference` | Có | Không | Có | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.image.insert` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.insert` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.break.column` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.insertRowAbove` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.insertRowBelow` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.insertColLeft` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.insertColRight` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.deleteRow` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.deleteCol` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.deleteTable` | Có | Không | Có | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.mergeCells` | Không | Không | Không | ❌ FAIL - Bus không có handler hoặc trả về lỗi |
| `writer.table.splitCells` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.distributeRows` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.table.distributeCols` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.alignTop` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.alignMiddle` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.alignBottom` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.selectCell` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.selectRow` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.selectCol` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.selectTable` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.cellBg` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.table.borders` | Không | Không | Không | ❌ FAIL - Không làm thay đổi DOM/nội dung |
| `writer.table.toggleHeaderRow` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |
| `writer.table.toggleBandedRows` | Có | Không | Không | ❌ FAIL - Undo không khôi phục về HTML trước khi áp lệnh |

## 2. Danh sách các lệnh FAIL và 3 bước tái hiện chi tiết

### 1. Lệnh `writer.text.bold` (Chữ đậm)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.bold')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 2. Lệnh `writer.text.italic` (Chữ nghiêng)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.italic')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 3. Lệnh `writer.text.underline` (Gạch chân)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.underline')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 4. Lệnh `writer.text.strike` (Gạch ngang)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.strike')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 5. Lệnh `writer.text.subscript` (Chỉ số dưới)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.subscript')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 6. Lệnh `writer.text.superscript` (Chỉ số trên)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.superscript')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 7. Lệnh `writer.text.clearFormat` (Xóa định dạng)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.clearFormat')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 8. Lệnh `writer.text.changeCase` (Đổi chữ hoa/thường)

- **Nhóm lệnh:** Định dạng ký tự
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.text.changeCase')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 9. Lệnh `writer.font.grow` (Tăng cỡ chữ)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.grow')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 10. Lệnh `writer.font.shrink` (Giảm cỡ chữ)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.shrink')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 11. Lệnh `writer.font.grow1pt` (Tăng cỡ chữ 1pt)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.grow1pt')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 12. Lệnh `writer.font.shrink1pt` (Giảm cỡ chữ 1pt)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.shrink1pt')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 13. Lệnh `writer.font.family` (Đổi phông chữ)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `"Arial"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.family', "Arial")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 14. Lệnh `writer.font.size` (Đổi cỡ chữ)

- **Nhóm lệnh:** Phông chữ
- **Đối số sử dụng:** `"4"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.font.size', "4")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 15. Lệnh `writer.color.text` (Màu chữ)

- **Nhóm lệnh:** Màu sắc
- **Đối số sử dụng:** `"#ff0000"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.color.text', "#ff0000")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 16. Lệnh `writer.color.highlight` (Màu nền chữ)

- **Nhóm lệnh:** Màu sắc
- **Đối số sử dụng:** `"#ffff00"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.color.highlight', "#ffff00")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 17. Lệnh `writer.para.alignLeft` (Căn trái)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.alignLeft')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 18. Lệnh `writer.para.alignCenter` (Căn giữa)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.alignCenter')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 19. Lệnh `writer.para.alignRight` (Căn phải)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.alignRight')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 20. Lệnh `writer.para.justify` (Căn đều)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.justify')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 21. Lệnh `writer.para.spacing1` (Giãn dòng 1.0)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.spacing1')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 22. Lệnh `writer.para.spacing15` (Giãn dòng 1.5)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.spacing15')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 23. Lệnh `writer.para.spacing2` (Giãn dòng 2.0)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.spacing2')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 24. Lệnh `writer.para.lineSpacing` (Khoảng cách dòng)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"1.15"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.lineSpacing', "1.15")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 25. Lệnh `writer.para.lineSpacingLayout` (Khoảng cách dòng (layout))

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"1.15"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.lineSpacingLayout', "1.15")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 26. Lệnh `writer.para.spacingBefore` (Khoảng trước đoạn)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `6` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.spacingBefore', 6)`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 27. Lệnh `writer.para.spacingAfter` (Khoảng sau đoạn)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `6` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.spacingAfter', 6)`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 28. Lệnh `writer.para.firstLineIndent` (Thụt đầu dòng)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"14.17"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.firstLineIndent', "14.17")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 29. Lệnh `writer.para.indentInc` (Tăng thụt lề)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.indentInc')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 30. Lệnh `writer.para.indentDec` (Giảm thụt lề)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.indentDec')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 31. Lệnh `writer.para.moveUp` (Di chuyển đoạn lên)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.moveUp')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 32. Lệnh `writer.para.moveDown` (Di chuyển đoạn xuống)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.moveDown')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 33. Lệnh `writer.para.sort` (Sắp xếp đoạn văn)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.sort')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 34. Lệnh `writer.para.showFormattingMarks` (Hiện/ẩn ký tự định dạng)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.showFormattingMarks')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 35. Lệnh `writer.para.shading` (Tô nền đoạn)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"#e2e8f0"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.shading', "#e2e8f0")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 36. Lệnh `writer.para.borders` (Viền đoạn văn)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"bottom"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.borders', "bottom")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 37. Lệnh `writer.para.multilevelList` (Danh sách đa cấp)

- **Nhóm lệnh:** Đoạn văn
- **Đối số sử dụng:** `"decimal"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.para.multilevelList', "decimal")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 38. Lệnh `writer.list.bullet` (Danh sách chấm tròn)

- **Nhóm lệnh:** Danh sách
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.list.bullet')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 39. Lệnh `writer.list.numbered` (Danh sách đánh số)

- **Nhóm lệnh:** Danh sách
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.list.numbered')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 40. Lệnh `writer.list.restartNumbering` (Đánh số lại từ 1)

- **Nhóm lệnh:** Danh sách
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.list.restartNumbering')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 41. Lệnh `writer.list.continueNumbering` (Tiếp tục đánh số)

- **Nhóm lệnh:** Danh sách
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.list.continueNumbering')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 42. Lệnh `writer.style.normal` (Áp dụng kiểu Normal)

- **Nhóm lệnh:** Kiểu dáng
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.style.normal')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 43. Lệnh `writer.style.apply` (Áp dụng kiểu Heading 1)

- **Nhóm lệnh:** Kiểu dáng
- **Đối số sử dụng:** `"h1"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.style.apply', "h1")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 44. Lệnh `writer.style.gallery` (Thư viện kiểu)

- **Nhóm lệnh:** Kiểu dáng
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.style.gallery')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 45. Lệnh `writer.page.blank` (Trang trắng)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.blank')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 46. Lệnh `writer.page.break` (Ngắt trang)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.break')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 47. Lệnh `writer.page.watermark` (Hình mờ (Watermark))

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `"BẢO MẬT"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.watermark', "BẢO MẬT")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 48. Lệnh `writer.page.color` (Màu nền trang)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `"#f8fafc"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.color', "#f8fafc")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 49. Lệnh `writer.page.border` (Viền trang)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `"box"` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.border', "box")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 50. Lệnh `writer.page.columns1` (Định dạng 1 cột)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.columns1')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 51. Lệnh `writer.page.columns2` (Định dạng 2 cột)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.columns2')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 52. Lệnh `writer.page.columns3` (Định dạng 3 cột)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.columns3')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 53. Lệnh `writer.page.columns` (Cấu hình cột)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `{"count":2,"gap":10,"rule":false}` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.columns', {"count":2,"gap":10,"rule":false})`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 54. Lệnh `writer.page.margins` (Căn lề trang)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `{"top":20,"bottom":20,"left":30,"right":15}` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.margins', {"top":20,"bottom":20,"left":30,"right":15})`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 55. Lệnh `writer.page.orientation` (Hướng giấy)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `"landscape"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.orientation', "landscape")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 56. Lệnh `writer.page.size` (Khổ giấy)

- **Nhóm lệnh:** Trang văn bản
- **Đối số sử dụng:** `"letter"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.page.size', "letter")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 57. Lệnh `writer.insert.coverPage` (Trang bìa)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"standard"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.coverPage', "standard")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 58. Lệnh `writer.insert.removeCoverPage` (Gỡ trang bìa)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.removeCoverPage')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 59. Lệnh `writer.insert.textbox` (Hộp văn bản)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"Văn bản mẫu"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.textbox', "Văn bản mẫu")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 60. Lệnh `writer.insert.wordart` (Chữ nghệ thuật)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"Nghệ thuật"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.wordart', "Nghệ thuật")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 61. Lệnh `writer.insert.symbol` (Ký hiệu đặc biệt)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"©"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.symbol', "©")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 62. Lệnh `writer.insert.dateTime` (Ngày & Giờ)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"06/10/2026"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.dateTime', "06/10/2026")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 63. Lệnh `writer.insert.equation` (Phương trình toán)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `{"linear":"x^2 + y^2 = z^2"}` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.equation', {"linear":"x^2 + y^2 = z^2"})`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 64. Lệnh `writer.insert.bookmark` (Đánh dấu (Bookmark))

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"Bookmark1"` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.bookmark', "Bookmark1")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 65. Lệnh `writer.insert.crossReference` (Tham chiếu chéo)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `{"target":"Bookmark1"}` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.insert.crossReference', {"target":"Bookmark1"})`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 66. Lệnh `writer.image.insert` (Chèn hình ảnh)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.image.insert', "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 67. Lệnh `writer.table.insert` (Chèn bảng biểu)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `{"rows":2,"cols":2}` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.insert', {"rows":2,"cols":2})`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 68. Lệnh `writer.break.column` (Ngắt cột)

- **Nhóm lệnh:** Chèn đối tượng
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.break.column')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 69. Lệnh `writer.table.insertRowAbove` (Chèn hàng phía trên)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.insertRowAbove')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 70. Lệnh `writer.table.insertRowBelow` (Chèn hàng phía dưới)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.insertRowBelow')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 71. Lệnh `writer.table.insertColLeft` (Chèn cột bên trái)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.insertColLeft')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 72. Lệnh `writer.table.insertColRight` (Chèn cột bên phải)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.insertColRight')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 73. Lệnh `writer.table.deleteRow` (Xóa hàng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.deleteRow')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 74. Lệnh `writer.table.deleteCol` (Xóa cột)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.deleteCol')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 75. Lệnh `writer.table.deleteTable` (Xóa bảng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Có**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.deleteTable')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 76. Lệnh `writer.table.mergeCells` (Gộp ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Bus không có handler hoặc trả về lỗi
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.mergeCells')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 77. Lệnh `writer.table.splitCells` (Tách ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.splitCells')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 78. Lệnh `writer.table.distributeRows` (Phân bố đều hàng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.distributeRows')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 79. Lệnh `writer.table.distributeCols` (Phân bố đều cột)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.distributeCols')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 80. Lệnh `writer.table.alignTop` (Căn đỉnh ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.alignTop')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 81. Lệnh `writer.table.alignMiddle` (Căn giữa dọc ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.alignMiddle')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 82. Lệnh `writer.table.alignBottom` (Căn đáy ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.alignBottom')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 83. Lệnh `writer.table.selectCell` (Chọn ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.selectCell')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 84. Lệnh `writer.table.selectRow` (Chọn hàng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.selectRow')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 85. Lệnh `writer.table.selectCol` (Chọn cột)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.selectCol')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 86. Lệnh `writer.table.selectTable` (Chọn bảng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.selectTable')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 87. Lệnh `writer.table.cellBg` (Màu nền ô)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `"#ff0000"` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.cellBg', "#ff0000")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 88. Lệnh `writer.table.borders` (Viền bảng)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `"all"` 
- **Hiện trạng:** Thay đổi nội dung: **Không** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Không làm thay đổi DOM/nội dung
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.borders', "all")`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 89. Lệnh `writer.table.toggleHeaderRow` (Bật/tắt hàng tiêu đề)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.toggleHeaderRow')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

### 90. Lệnh `writer.table.toggleBandedRows` (Bật/tắt hàng xen kẽ)

- **Nhóm lệnh:** Bảng biểu
- **Đối số sử dụng:** `-` 
- **Hiện trạng:** Thay đổi nội dung: **Có** | Undo đúng: **Không** | Redo đúng: **Không**
- **Lý do thất bại:** Undo không khôi phục về HTML trước khi áp lệnh
- **3 bước tái hiện:**
  1. Mở ứng dụng VN Writer bằng CDP (`launchApp('writer')`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu `beforeHtml`.
  2. Gọi lệnh qua Command Bus: `window.__vnoGlobalCommandBus.execute('writer.table.toggleBandedRows')`.
  3. Gửi phím `Ctrl+Z` (Input.dispatchKeyEvent) để kiểm tra Undo và `Ctrl+Y` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.

