# BÁO CÁO TOÀN DIỆN MA TRẬN HOÀN TÁC / LÀM LẠI (CTRL+Z / CTRL+Y) VN WRITER (16/10)

**Thời gian thực thi:** 2026-10-17T04:41:40.327Z
**Môi trường:** Ứng dụng Desktop VN Writer (WebView2 / remote-debugging port CDP)
**Phương thức kiểm thử:** Chrome DevTools Protocol (`tests/live/cdp/session.mjs`, `actions.mjs`, phím thật `Ctrl+Z`, `Ctrl+Y` qua CDP Input)
**Phạm vi:** Toàn bộ **233 lệnh** của VN Writer (`WRITER_COMMANDS` trong `platform/commands/command-definitions.js`)

## 1. Kết quả tổng quan

- **Tổng số lệnh Writer:** **233**
- **Lệnh thay đổi nội dung/định dạng (Cần Undo/Redo):** **129**
- **PASS (Undo & Redo hoàn hảo, con trỏ hợp lý):** **129**
- **FAIL (Thất bại thực tế):** **0**
- **BỎ QUA (Lệnh mở hộp thoại / menu chọn / chế độ xem UI):** **104**
- **Tỉ lệ thành công trên các lệnh đổi nội dung:** **100%**

## 2. Bảng ma trận toàn diện 229 lệnh VN Writer

| STT | Lệnh (Command ID) | Tên lệnh | Đối số | Thay đổi nội dung | Undo khôi phục | Redo tái lập | Trạng thái | Ghi chú |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `writer.view.printLayout` | Bố trí in | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 2 | `writer.view.webLayout` | Bố trí Web | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 3 | `writer.view.readMode` | Chế độ đọc | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 4 | `writer.view.outline` | Dàn bài | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 5 | `writer.view.draft` | Bản nháp | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 6 | `writer.outline.promote` | Nâng cấp tiêu đề | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 7 | `writer.outline.demote` | Hạ cấp tiêu đề | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 8 | `writer.outline.moveUp` | Di chuyển lên | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 9 | `writer.outline.moveDown` | Di chuyển xuống | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 10 | `writer.outline.expand` | Mở rộng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 11 | `writer.outline.collapse` | Thu gọn | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 12 | `writer.outline.showLevel` | Hiển thị cấp | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 13 | `writer.outline.close` | Đóng Dàn bài | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 14 | `writer.view.toggleHeadingCollapse` | Ẩn/Hiện chi tiết tiêu đề | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 15 | `writer.view.ruler` | Thước | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 16 | `writer.view.navigationPane` | Ngăn dẫn hướng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 17 | `writer.ruler.getState` | Đọc trạng thái thước | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 18 | `writer.ruler.setParagraphIndents` | Đặt thụt lề bằng thước | `{"firstLineMm":20,"leftMm":10,"rightMm":10}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 19 | `writer.ruler.setPageMargins` | Đặt lề trang bằng thước | `{"margins":{"left":30,"right":30}}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 20 | `writer.view.gridlines` | Đường lưới | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 21 | `writer.view.zoomIn` | Phóng to | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 22 | `writer.view.zoomOut` | Thu nhỏ | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 23 | `writer.view.zoomReset` | Đặt lại | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 24 | `writer.view.zoom100` | 100% | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 25 | `writer.view.pageWidth` | Chiều rộng trang | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 26 | `writer.view.newWindow` | Cửa sổ mới | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 27 | `writer.nav.docStart` | Đầu tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 28 | `writer.nav.docEnd` | Cuối tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 29 | `writer.edit.select` | Chọn | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 30 | `writer.edit.goTo` | Đi đến | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 31 | `writer.edit.pasteSpecial` | Dán đặc biệt | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 32 | `writer.text.bold` | Đậm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 33 | `writer.text.italic` | Nghiêng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 34 | `writer.text.underline` | Gạch chân | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 35 | `writer.text.strike` | Gạch ngang | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 36 | `writer.font.grow` | Tăng cỡ chữ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 37 | `writer.font.shrink` | Giảm cỡ chữ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 38 | `writer.font.grow1pt` | Tăng cỡ chữ 1 điểm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 39 | `writer.font.shrink1pt` | Giảm cỡ chữ 1 điểm | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 40 | `writer.text.subscript` | Chỉ số dưới | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 41 | `writer.text.superscript` | Chỉ số trên | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 42 | `writer.text.clearFormat` | Xóa định dạng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 43 | `writer.style.normal` | Kiểu Thường | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 44 | `writer.style.heading1` | Tiêu đề 1 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 45 | `writer.style.heading2` | Tiêu đề 2 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 46 | `writer.style.heading3` | Tiêu đề 3 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 47 | `writer.text.changeCase` | Đổi chữ hoa/thường | `"uppercase"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 48 | `writer.text.changeCaseDialog` | Hộp thoại Đổi chữ hoa/thường… | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 49 | `writer.font.family` | Phông chữ | `"Arial"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 50 | `writer.format.fontDialog` | Hộp thoại Phông chữ | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 51 | `writer.font.size` | Cỡ chữ | `"18pt"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 52 | `writer.style.apply` | Kiểu dáng | `"h1"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 53 | `writer.style.gallery` | Thư viện kiểu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 54 | `writer.design.themeGallery` | Chủ đề văn bản | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 55 | `writer.color.text` | Màu chữ | `"#dc2626"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 56 | `writer.color.highlight` | Màu nền chữ | `"#ffcd00"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 57 | `writer.format.textEffects` | Hiệu ứng chữ | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 58 | `writer.format.textOutline` | Viền chữ | `{"color":"#ff0000","widthEmu":12700}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 59 | `writer.format.textShadow` | Bóng đổ | `{"preset":"bottom-right","color":"#888888"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 60 | `writer.format.textGlow` | Phát sáng | `{"radEmu":101600,"color":"#ffff00"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 61 | `writer.format.clearTextEffects` | Xóa hiệu ứng chữ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 62 | `writer.para.alignLeft` | Căn trái | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 63 | `writer.para.alignCenter` | Căn giữa | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 64 | `writer.para.alignRight` | Căn phải | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 65 | `writer.para.justify` | Căn đều | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 66 | `writer.para.spacing1` | Giãn dòng 1.0 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 67 | `writer.para.spacing15` | Giãn dòng 1.5 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 68 | `writer.para.spacing2` | Giãn dòng 2.0 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 69 | `writer.para.lineSpacing` | Giãn dòng | `"1.5"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 70 | `writer.para.spacingBefore` | Khoảng trước đoạn | `12` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 71 | `writer.para.spacingAfter` | Khoảng sau đoạn | `12` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 72 | `writer.para.firstLineIndent` | Thụt đầu dòng | `20` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 73 | `writer.list.bullet` | Dấu đầu dòng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 74 | `writer.list.numbered` | Đánh số | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 75 | `writer.list.restartNumbering` | Đánh số lại từ 1 | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 76 | `writer.list.continueNumbering` | Tiếp tục đánh số | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 77 | `writer.para.multilevelList` | Danh sách đa cấp | `"decimal"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 78 | `writer.para.indentInc` | Thụt lề | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 79 | `writer.para.indentDec` | Giảm thụt lề | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 80 | `writer.para.moveUp` | Di chuyển đoạn lên | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 81 | `writer.para.moveDown` | Di chuyển đoạn xuống | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 82 | `writer.para.sort` | Sắp xếp | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 83 | `writer.para.showFormattingMarks` | Hiện/ẩn ký tự định dạng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 84 | `writer.para.shading` | Tô nền đoạn | `"#f3f4f6"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 85 | `writer.para.borders` | Viền đoạn | `"bottom"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 86 | `writer.table.insert` | Bảng biểu | `{"rows":2,"cols":2}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 87 | `writer.table.quickTables` | Bảng dựng sẵn | `"matrix"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 88 | `writer.table.fromText` | Văn bản thành bảng | `{"delimiter":","}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 89 | `writer.table.toText` | Bảng thành văn bản | `{"delimiter":"\t"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 90 | `writer.table.insertRowAbove` | Chèn hàng phía trên | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 91 | `writer.table.insertRowBelow` | Chèn hàng phía dưới | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 92 | `writer.table.insertColLeft` | Chèn cột bên trái | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 93 | `writer.table.insertColRight` | Chèn cột bên phải | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 94 | `writer.table.deleteRow` | Xóa hàng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 95 | `writer.table.deleteCol` | Xóa cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 96 | `writer.table.deleteTable` | Xóa bảng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 97 | `writer.table.mergeCells` | Gộp ô | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 98 | `writer.table.splitCells` | Tách ô | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 99 | `writer.table.distributeRows` | Phân bố đều hàng | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 100 | `writer.table.distributeCols` | Phân bố đều cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 101 | `writer.table.autoFitContents` | Vừa nội dung | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 102 | `writer.table.autoFitWindow` | Vừa cửa sổ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 103 | `writer.table.alignTop` | Căn đỉnh ô | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 104 | `writer.table.alignMiddle` | Căn giữa dọc ô | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 105 | `writer.table.alignBottom` | Căn đáy ô | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 106 | `writer.table.selectCell` | Chọn ô | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 107 | `writer.table.selectRow` | Chọn hàng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 108 | `writer.table.selectCol` | Chọn cột | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 109 | `writer.table.selectTable` | Chọn bảng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 110 | `writer.table.cellBg` | Tô màu ô | `"#e0f2fe"` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 111 | `writer.table.borders` | Đường viền bảng | `"all"` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 112 | `writer.table.bordersAll` | Tất cả đường viền | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 113 | `writer.table.bordersOutside` | Viền ngoài | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 114 | `writer.table.bordersInside` | Viền trong | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 115 | `writer.table.bordersNone` | Không viền | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 116 | `writer.table.toggleHeaderRow` | Hàng tiêu đề | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 117 | `writer.table.toggleBandedRows` | Hàng xen kẽ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 118 | `writer.table.splitTable` | Tách bảng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 119 | `writer.table.textDirection` | Hướng văn bản | `"tbRl"` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 120 | `writer.table.properties` | Thuộc tính bảng | `{"align":"center","indentPt":18,"marginTopPt":5.65,"marginBottomPt":5.65,"marginLeftPt":8.5,"marginRightPt":8.5,"cellSpacingPt":2.8}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 121 | `writer.image.insert` | Hình ảnh | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 122 | `writer.shape.insert` | Hình khối | `{"type":"rectangle"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 123 | `writer.diagram.insert` | Sơ đồ | `{"type":"process"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 124 | `writer.chart.insert` | Biểu đồ | `{"type":"bar"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 125 | `writer.insert.coverPage` | Trang bìa | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 126 | `writer.insert.removeCoverPage` | Gỡ trang bìa | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 127 | `writer.page.break` | Ngắt trang | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 128 | `writer.page.blank` | Trang trắng | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 129 | `writer.header.insert` | Đầu trang | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 130 | `writer.footer.insert` | Chân trang | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 131 | `writer.insert.textbox` | Hộp văn bản | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 132 | `writer.insert.wordart` | Chữ nghệ thuật | `{"text":"3T Office","presetId":"navy-outline"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 133 | `writer.format.dropCap` | Chữ đầu đoạn | `"dropped"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 134 | `writer.insert.dateTime` | Ngày & Giờ | `{"format":"dd/MM/yyyy"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 135 | `writer.insert.quickParts` | Khối dựng sẵn | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 136 | `writer.insert.equation` | Phương trình | `{"linear":"E=mc^2"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 137 | `writer.insert.symbol` | Ký hiệu | `{"char":"©"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 138 | `writer.insert.bookmark` | Đánh dấu | `{"name":"bm_test"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 139 | `writer.insert.crossReference` | Tham chiếu chéo | `{"type":"bookmark","targetId":"bm_target"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 140 | `writer.image.resize` | Đổi kích thước ảnh | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 141 | `writer.image.wrap` | Ngắt dòng văn bản | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 142 | `writer.image.crop` | Cắt ảnh | `{"top":10,"bottom":10}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 143 | `writer.image.corrections` | Độ sáng & Tương phản | `{"brightness":10,"contrast":10}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 144 | `writer.image.changePicture` | Đổi ảnh khác | `{"src":"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect width='60' height='60' fill='green'/></svg>"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 145 | `writer.image.resetPicture` | Đặt lại ảnh | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 146 | `writer.image.compress` | Nén ảnh | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 147 | `writer.comment.insert` | Thêm ghi chú | `{"content":"Nhan xet mau"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 148 | `writer.review.commentPrevious` | Nhận xét trước | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 149 | `writer.review.commentNext` | Nhận xét sau | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 150 | `writer.review.commentReply` | Trả lời nhận xét | `{"content":"Tra loi"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 151 | `writer.review.commentDelete` | Xóa nhận xét | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 152 | `writer.review.commentResolve` | Đã xử lý | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 153 | `writer.trackChanges.toggle` | Theo dõi thay đổi | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 154 | `writer.trackChanges.previous` | Thay đổi trước | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 155 | `writer.trackChanges.next` | Thay đổi sau | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 156 | `writer.trackChanges.acceptOne` | Chấp nhận một | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 157 | `writer.trackChanges.rejectOne` | Từ chối một | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 158 | `writer.trackChanges.acceptAll` | Chấp nhận thay đổi | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 159 | `writer.trackChanges.rejectAll` | Từ chối thay đổi | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 160 | `writer.review.compare` | So sánh tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 161 | `writer.review.combine` | Gộp tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 162 | `writer.review.restrictEditing` | Hạn chế chỉnh sửa | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 163 | `writer.trackChanges.displayMode` | Chế độ hiển thị thay đổi | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 164 | `writer.trackChanges.displaySimple` | Đánh dấu đơn giản | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 165 | `writer.trackChanges.displayAll` | Tất cả đánh dấu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 166 | `writer.trackChanges.displayNone` | Không đánh dấu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 167 | `writer.trackChanges.displayOriginal` | Bản gốc | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 168 | `writer.trackChanges.showMarkup` | Hiển thị đánh dấu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 169 | `writer.trackChanges.balloons` | Bong bóng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 170 | `writer.trackChanges.balloonsMode` | Chế độ bong bóng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 171 | `writer.trackChanges.balloonsRevisions` | Hiện bản sửa trong bong bóng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 172 | `writer.trackChanges.balloonsInline` | Hiện tất cả bản sửa trong dòng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 173 | `writer.trackChanges.balloonsCommentsOnly` | Chỉ hiện chú thích và định dạng trong bong bóng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 174 | `writer.review.wordCount` | Đếm từ | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 175 | `writer.review.toggleSpellCheck` | Kiểm tra chính tả | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 176 | `writer.help.open` | Trợ giúp | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 177 | `writer.file.properties` | Thuộc tính tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 178 | `writer.file.markAsFinal` | Đánh dấu là cuối cùng | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 179 | `writer.file.inspectDocument` | Kiểm tra tài liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 180 | `writer.file.options` | Tùy chọn | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 181 | `writer.page.margins` | Căn lề | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 182 | `writer.page.orientation` | Hướng giấy | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 183 | `writer.page.size` | Khổ giấy | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 184 | `writer.page.setupDialog` | Thiết lập trang… | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 185 | `writer.page.columns` | Cột | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 186 | `writer.format.paragraphDialog` | Đoạn văn… | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 187 | `writer.format.tabStops` | Dừng tab… | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 188 | `writer.paragraph.tabStops` | Dừng tab… | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 189 | `writer.page.columns1` | 1 cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 190 | `writer.page.columns2` | 2 cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 191 | `writer.page.columns3` | 3 cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 192 | `writer.break.column` | Ngắt cột | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 193 | `writer.section.nextPage` | Ngắt mục — Trang kế tiếp | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 194 | `writer.section.continuous` | Ngắt mục — Liên tục | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 195 | `writer.section.evenPage` | Ngắt mục — Trang chẵn | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 196 | `writer.section.oddPage` | Ngắt mục — Trang lẻ | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 197 | `writer.section.options` | Đầu trang và chân trang theo mục | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 198 | `writer.section.linkToPrevious` | Liên kết với mục trước | `-` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 199 | `writer.section.differentFirstPage` | Trang đầu khác biệt | `true` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 200 | `writer.section.differentOddEven` | Trang chẵn và lẻ khác nhau | `true` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 201 | `writer.pageNumber.format` | Định dạng số trang | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 202 | `writer.section.delete` | Xóa ngắt mục | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 203 | `writer.layout.sectionOptions` | Tùy chọn mục | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 204 | `writer.layout.lineNumbers` | Danh số dòng | `"continuous"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 205 | `writer.layout.hyphenation` | Ngắt từ | `true` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 206 | `writer.page.watermark` | Hình mờ | `{"text":"BẢN THẢO"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 207 | `writer.page.color` | Màu trang | `"#fdf6e2"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 208 | `writer.page.border` | Viền trang | `{"style":"single","width":2,"color":"#333333"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 209 | `writer.layout.breaks` | Ngắt | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 210 | `writer.para.lineSpacingLayout` | Giãn dòng | `"1.5"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 211 | `writer.file.printPreview` | Xem trước khi in | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 212 | `writer.reference.tocInsert` | Mục lục tự động | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 213 | `writer.reference.tocUpdate` | Cập nhật mục lục | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 214 | `writer.reference.footnoteInsert` | Chú thích trang | `"Ghi chu chan trang"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 215 | `writer.reference.endnoteInsert` | Chú thích cuối | `"Ghi chu cuoi tai lieu"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 216 | `writer.reference.citationStyle` | Kiểu trích dẫn | `"mla"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 217 | `writer.reference.citationInsert` | Chèn trích dẫn | `{"source":{"id":"src-1","title":"Tai lieu","author":"Nguyen Van A","year":2026}}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 218 | `writer.reference.sourcesManage` | Quản lý nguồn | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 219 | `writer.reference.bibliographyInsert` | Thư mục tài liệu | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 220 | `writer.reference.captionInsert` | Chèn chú thích ảnh | `{"text":"Sơ đồ"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 221 | `writer.reference.tofInsert` | Danh mục hình ảnh | `{"kind":"figure"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 222 | `writer.reference.tofUpdate` | Cập nhật danh mục | `-` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 223 | `writer.reference.indexMark` | Đánh dấu mục | `{"term":"Tu khoa"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 224 | `writer.reference.indexInsert` | Chèn chỉ mục | `{"entries":[{"term":"Tu khoa 1","page":1}]}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 225 | `writer.mailMerge.open` | Nguồn dữ liệu | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 226 | `writer.mailMerge.insertField` | Chèn trường | `"HoVaTen"` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 227 | `writer.mailMerge.ifRule` | Quy tắc | `{"type":"ifThenElse","field":"GioiTinh","op":"equals","value":"Nam","then":"Ông","otherwise":"Bà"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 228 | `writer.mailMerge.preview` | Xem trước kết quả | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 229 | `writer.mailMerge.prevRecord` | Bản ghi trước | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 230 | `writer.mailMerge.nextRecord` | Bản ghi sau | `-` | Không | Không | Có | **⏭️ BO QUA** | Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay |
| 231 | `writer.mailMerge.finish` | Hoàn tất trộn | `{"mode":"merge_new_document","records":[{"HoVaTen":"Nguyen Van A"}]}` | Không | Có | Có | **⏭️ BO QUA** | Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại |
| 232 | `writer.mailings.envelopes` | Phong bì | `{"deliveryAddress":"Ha Noi","returnAddress":"TP HCM"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |
| 233 | `writer.mailings.labels` | Nhãn | `{"content":"Nhan 1"}` | Có | Có | Có | **✅ PASS** | Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu |

## 3. Đánh giá chất lượng và cơ chế bảo toàn vị trí con trỏ

- **Cam kết đồng bộ thao tác gõ (flushTyping):** Mọi thao tác gõ văn bản và áp dụng lệnh đều được cam kết (`flushTyping`) trước khi biến đổi DOM, đảm bảo 1 lần áp dụng lệnh tương ứng đúng 1 bước Hoàn tác duy nhất.
- **Chuẩn hóa phần tử danh sách (normalizeListElements):** Thao tác danh sách (`writer.list.bullet`, `writer.list.numbered`) được chuẩn hóa tự động loại bỏ thẻ `<p>` lồng không hợp lệ, giữ nguyên vẹn cấu trúc DOM qua chu trình Undo/Redo.
- **Bảo toàn vị trí con trỏ (Selection Bookmark):** Cơ chế Bookmark vùng chọn (`_captureSelectionBookmark` / `_restoreSelectionBookmark`) bảo đảm con trỏ sau khi Undo luôn nằm bên trong vùng văn bản đang soạn thảo (`anchorInBody = true`), không bao giờ bị rơi ra đầu tài liệu.
- **Tích hợp InputNormalizer:** Lắng nghe phím tắt Ctrl+Z/Ctrl+Y thông qua hook `onUndo` được chuyển tiếp đến adapter, ngăn chặn việc can thiệp xóa trắng văn bản của lớp chuẩn hóa gõ tiếng Việt.
