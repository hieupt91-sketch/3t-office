# BÁO CÁO AUDIT MA TRẬN UNDO / REDO CHO CÁC LỆNH ĐỊNH DẠNG VN WRITER (LUỒNG THẬT)

**Thời gian thực thi:** 2026-10-05T23:49:00.409Z
**Phương thức kiểm thử:** CDP (Chrome DevTools Protocol) qua `tests/live/cdp/session.mjs` và `actions.mjs` (`insertText`, `press` phím `Ctrl+Z`, `Ctrl+Y`).
**Quy trình chuẩn:** Gõ văn bản thật ('Xin chao the gioi'), bôi đen nội dung, thực thi lệnh qua CommandBus, kiểm tra DOM (loại bỏ các phần tử phiên `vno-spelling-*`, `data-vno-spelling-*`, `vno-caret...`), thực hiện Ctrl+Z khôi phục và Ctrl+Y tái lập.

## 1. Kết quả tổng quan

- **Tổng số lệnh định dạng có handler:** **44**
- **PASS (Undo & Redo hoàn hảo):** **36**
- **FAIL (Thất bại thực tế):** **4**
- **BỎ QUA (Lệnh mở dialog/menu/UI, không đổi nội dung ngay):** **4**

## 2. Bảng ma trận chi tiết các lệnh định dạng

| STT | Lệnh (Command ID) | Tên lệnh | Đối số | Thay đổi nội dung | Undo khôi phục | Redo tái lập | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `writer.text.bold` | Đậm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 2 | `writer.text.italic` | Nghiêng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 3 | `writer.text.underline` | Gạch chân | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 4 | `writer.text.strike` | Gạch ngang | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 5 | `writer.font.grow` | Tăng cỡ chữ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 6 | `writer.font.shrink` | Giảm cỡ chữ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 7 | `writer.font.grow1pt` | Tăng cỡ chữ 1 điểm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 8 | `writer.font.shrink1pt` | Giảm cỡ chữ 1 điểm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 9 | `writer.text.subscript` | Chỉ số dưới | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 10 | `writer.text.superscript` | Chỉ số trên | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 11 | `writer.text.clearFormat` | Xóa định dạng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 12 | `writer.style.normal` | Kiểu Thường | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 13 | `writer.text.changeCase` | Đổi chữ hoa/thường | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 14 | `writer.font.family` | Phông chữ | `"Arial"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 15 | `writer.font.size` | Cỡ chữ | `"18pt"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 16 | `writer.style.apply` | Kiểu dáng | `"h1"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 17 | `writer.style.gallery` | Thư viện kiểu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI, không làm thay đổi DOM nội dung ngay |
| 18 | `writer.color.text` | Màu chữ | `"#dc2626"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 19 | `writer.color.highlight` | Màu nền chữ | `"#ffcd00"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 20 | `writer.para.alignLeft` | Căn trái | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 21 | `writer.para.alignCenter` | Căn giữa | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 22 | `writer.para.alignRight` | Căn phải | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 23 | `writer.para.justify` | Căn đều | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 24 | `writer.para.spacing1` | Giãn dòng 1.0 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 25 | `writer.para.spacing15` | Giãn dòng 1.5 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 26 | `writer.para.spacing2` | Giãn dòng 2.0 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 27 | `writer.para.lineSpacing` | Giãn dòng | `"1.5"` | Có | Không | Có | **❌ FAIL** | Undo (Ctrl+Z) không khôi phục HTML ban đầu trước khi áp dụng lệnh |
| 28 | `writer.para.spacingBefore` | Khoảng trước đoạn | `12` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 29 | `writer.para.spacingAfter` | Khoảng sau đoạn | `12` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 30 | `writer.para.firstLineIndent` | Thụt đầu dòng | `20` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 31 | `writer.list.bullet` | Dấu đầu dòng | `-` | Có | Có | Không | **❌ FAIL** | Redo (Ctrl+Y) không tái lập lại HTML sau khi áp dụng lệnh |
| 32 | `writer.list.numbered` | Đánh số | `-` | Có | Có | Không | **❌ FAIL** | Redo (Ctrl+Y) không tái lập lại HTML sau khi áp dụng lệnh |
| 33 | `writer.list.restartNumbering` | Đánh số lại từ 1 | `-` | Không | Không | Không | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI, không làm thay đổi DOM nội dung ngay |
| 34 | `writer.list.continueNumbering` | Tiếp tục đánh số | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI, không làm thay đổi DOM nội dung ngay |
| 35 | `writer.para.multilevelList` | Danh sách đa cấp | `"decimal"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 36 | `writer.para.indentInc` | Thụt lề | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 37 | `writer.para.indentDec` | Giảm thụt lề | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 38 | `writer.para.moveUp` | Di chuyển đoạn lên | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 39 | `writer.para.moveDown` | Di chuyển đoạn xuống | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 40 | `writer.para.sort` | Sắp xếp | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 41 | `writer.para.showFormattingMarks` | Hiện/ẩn ký tự định dạng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI, không làm thay đổi DOM nội dung ngay |
| 42 | `writer.para.shading` | Tô nền đoạn | `"#f3f4f6"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 43 | `writer.para.borders` | Viền đoạn | `"bottom"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML |
| 44 | `writer.para.lineSpacingLayout` | Giãn dòng | `"1.5"` | Có | Không | Có | **❌ FAIL** | Undo (Ctrl+Z) không khôi phục HTML ban đầu trước khi áp dụng lệnh |

## 3. Danh sách các lỗi FAIL thực tế và 3 bước tái hiện chi tiết

### 1. Lệnh `writer.para.lineSpacing` (Giãn dòng)

- **Mô tả lỗi:** Undo (Ctrl+Z) không khôi phục HTML ban đầu trước khi áp dụng lệnh
- **Thay đổi nội dung:** Có | **Undo khôi phục:** Không | **Redo tái lập:** Có
- **3 bước tái hiện:**
  1. Mở VN Writer qua CDP (`launchApp('writer')`), gõ nội dung 'Xin chao the gioi' bằng `insertText`, bôi đen đoạn văn.
  2. Gọi lệnh qua CommandBus: `window.__vnoGlobalCommandBus.execute('writer.para.lineSpacing', '1.5')`. Đoạn văn nhận style `--vno-lh: 1.5`.
  3. Nhấn tổ hợp phím `Ctrl+Z` (CDP `Input.dispatchKeyEvent` 'z' kèm `ctrl: true`). Kết quả: HTML không khôi phục về trạng thái ban đầu trước khi áp dụng giãn dòng.
- **File / Hàm nghi ngờ:** `adapters/libreoffice/writer/writer-adapter.js` — phương thức `_setLineHeight(val)` (dòng 10828).
  - *Lý do:* `_setLineHeight` thực hiện thay đổi thuộc tính CSS `node.style.setProperty('--vno-lh', ...)` trước rồi mới gọi `this.recordSnapshot('writer.para.lineSpacing')`, khiến snapshot lưu lại trạng thái đã bị thay đổi thay vì chụp trạng thái trước đó.

### 2. Lệnh `writer.list.bullet` (Dấu đầu dòng)

- **Mô tả lỗi:** Redo (Ctrl+Y) không tái lập lại HTML sau khi áp dụng lệnh
- **Thay đổi nội dung:** Có | **Undo khôi phục:** Có | **Redo tái lập:** Không
- **3 bước tái hiện:**
  1. Mở VN Writer qua CDP (`launchApp('writer')`), gõ nội dung 'Xin chao the gioi' bằng `insertText`, bôi đen đoạn văn.
  2. Thực thi lệnh qua CommandBus: `window.__vnoGlobalCommandBus.execute('writer.list.bullet')`. Đoạn văn chuyển thành danh sách `<ul><li>...`.
  3. Gửi phím `Ctrl+Z` (Undo khôi phục về đoạn văn `<p>`), sau đó gửi phím `Ctrl+Y` (Redo). Kết quả: HTML sau khi Redo bị biến đổi cấu trúc DOM (xuất hiện thêm thẻ `<p></p>` rỗng xung quanh `<ul>`) không khớp chính xác với HTML ngay sau khi áp dụng lệnh.
- **File / Hàm nghi ngờ:** `adapters/libreoffice/writer/writer-adapter.js` — phương thức `handleDispatch` (các dòng 6996, 7001) và `recordSnapshot`.
  - *Lý do:* Lệnh dùng `document.execCommand('insertUnorderedList'/'insertOrderedList')` rồi chụp snapshot ngay khi DOM trình duyệt ở trạng thái trung gian (`<p><ul>...`), dẫn đến bản ghi Redo snapshot bị lệch cấu trúc sau khi DOM được trình duyệt tự động chuẩn hóa.

### 3. Lệnh `writer.list.numbered` (Đánh số)

- **Mô tả lỗi:** Redo (Ctrl+Y) không tái lập lại HTML sau khi áp dụng lệnh
- **Thay đổi nội dung:** Có | **Undo khôi phục:** Có | **Redo tái lập:** Không
- **3 bước tái hiện:**
  1. Mở VN Writer qua CDP (`launchApp('writer')`), gõ nội dung 'Xin chao the gioi' bằng `insertText`, bôi đen đoạn văn.
  2. Thực thi lệnh qua CommandBus: `window.__vnoGlobalCommandBus.execute('writer.list.numbered')`. Đoạn văn chuyển thành danh sách `<ol><li>...`.
  3. Gửi phím `Ctrl+Z` (Undo khôi phục về đoạn văn `<p>`), sau đó gửi phím `Ctrl+Y` (Redo). Kết quả: HTML sau khi Redo bị biến đổi cấu trúc DOM (xuất hiện thêm thẻ `<p></p>` rỗng xung quanh `<ol>`) không khớp chính xác với HTML ngay sau khi áp dụng lệnh.
- **File / Hàm nghi ngờ:** `adapters/libreoffice/writer/writer-adapter.js` — phương thức `handleDispatch` (các dòng 6996, 7001) và `recordSnapshot`.
  - *Lý do:* Lệnh dùng `document.execCommand('insertUnorderedList'/'insertOrderedList')` rồi chụp snapshot ngay khi DOM trình duyệt ở trạng thái trung gian (`<p><ol>...`), dẫn đến bản ghi Redo snapshot bị lệch cấu trúc sau khi DOM được trình duyệt tự động chuẩn hóa.

### 4. Lệnh `writer.para.lineSpacingLayout` (Giãn dòng)

- **Mô tả lỗi:** Undo (Ctrl+Z) không khôi phục HTML ban đầu trước khi áp dụng lệnh
- **Thay đổi nội dung:** Có | **Undo khôi phục:** Không | **Redo tái lập:** Có
- **3 bước tái hiện:**
  1. Mở VN Writer qua CDP (`launchApp('writer')`), gõ nội dung 'Xin chao the gioi' bằng `insertText`, bôi đen đoạn văn.
  2. Gọi lệnh qua CommandBus: `window.__vnoGlobalCommandBus.execute('writer.para.lineSpacingLayout', '1.5')`. Đoạn văn nhận style `--vno-lh: 1.5`.
  3. Nhấn tổ hợp phím `Ctrl+Z` (CDP `Input.dispatchKeyEvent` 'z' kèm `ctrl: true`). Kết quả: HTML không khôi phục về trạng thái ban đầu trước khi áp dụng giãn dòng.
- **File / Hàm nghi ngờ:** `adapters/libreoffice/writer/writer-adapter.js` — phương thức `_setLineHeight(val)` (dòng 10828).
  - *Lý do:* `_setLineHeight` thực hiện thay đổi thuộc tính CSS `node.style.setProperty('--vno-lh', ...)` trước rồi mới gọi `this.recordSnapshot('writer.para.lineSpacing')`, khiến snapshot lưu lại trạng thái đã bị thay đổi thay vì chụp trạng thái trước đó.

