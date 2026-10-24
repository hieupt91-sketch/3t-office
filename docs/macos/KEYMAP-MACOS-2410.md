# Bảng phím macOS — KEYS-1 (24–25/10/2026)

Sinh từ `platform/commands/keymap-macos.js` (`MACOS_KEYMAP`). Đây là nơi duy nhất ghi cột nguồn; Trợ giúp trong app không hiển thị nguồn.

Tổng **141** dòng: office-mac 5, apple 32 (đã có nguồn: 37), pending 104. Mac không gán phím: 3 dòng. Tổ hợp hệ thống được bảo lưu: 37.

Trạng thái: `office-mac` = chuỗi đọc được trong gói ứng dụng Office for Mac 16.114.1 trên máy này (grep chỉ đọc, `plutil -convert xml1`, không automation); `apple` = Apple HIG / tài liệu phím tắt Mac của Apple; `pending` = **nguồn: chờ xác minh bằng Office for Mac** (tự động hóa Office bị chặn: AppleEvents -1712, quyền Automation chưa cấp). Dòng `apple` có tổ hợp do quy ước Apple (vd Option+Shift+← chọn theo từ) giải thích *vì sao* tổ hợp Windows không dùng được; tổ hợp thay thế của 3T trong các dòng đó vẫn chờ xác minh nếu ghi `pending`.

## Trích dẫn gói ứng dụng (OM-n)

| Mã | Tệp (chỉ đọc) | Chuỗi |
|---|---|---|
| OM-1 | `/Applications/Microsoft Word.app/Contents/Resources/en.lproj/strman_28bb.strings` | «Use CMD SHIFT V to paste text without formatting / Use CMD OPTION C/V for format painter» |
| OM-2 | `/Applications/Microsoft Word.app/Contents/Resources/en.lproj/strman_d4b1.strings` | «Help &Key (F1)» |
| OM-3 | `/Applications/Microsoft Excel.app/Contents/Resources/en.lproj/strman_0010.strings` | «Expand Formula Bar (Ctrl+Shift+U)» (bảng chuỗi Excel Mac phân biệt `Ctrl` = Control và `Cmd` = Command) |
| OM-4 | `/Applications/Microsoft Excel.app/Contents/Resources/en.lproj/strman_0023.strings` | «Calculate Now (F9)» |
| OM-5 | `/Applications/Microsoft Excel.app/Contents/Resources/en.lproj/scenchg.strings` | «Cmd+click cells to select non-adjacent changing cells.» |

Các bảng `strman_000a.strings` (Excel) và `Word_Client_Shared_Commanding_cdskeys_usa.bin` (Word) có danh sách tổ hợp nhưng không kèm tên lệnh → không dùng làm nguồn. `Base.lproj/MainMenu.nib` của Word chỉ có app delegate (thực đơn dựng động) → không đọc được phím thực đơn.

## Chung

| Lệnh | Tác vụ | Windows | macOS | Trạng thái | Nguồn | Ghi chú |
|---|---|---|---|---|---|---|
| `common.file.backstage` | Mở menu Tệp | Alt+F | — (không gán) | apple | Apple — phím tắt văn bản | Option+F gõ ký tự «ƒ» trên Mac; dùng F10 rồi T (KeyTips) hoặc nhấp tab Tệp. |
| `common.file.new` | Tạo tài liệu mới | Ctrl+N | Cmd+N | apple | Apple HIG |  |
| `common.file.open` | Mở tệp | Ctrl+O | Cmd+O | apple | Apple HIG |  |
| `common.file.save` | Lưu | Ctrl+S | Cmd+S | apple | Apple HIG |  |
| `common.file.saveAs` | Lưu bản sao (Lưu thành) | F12 | F12 | pending | nguồn: chờ xác minh bằng Office for Mac | Trên Mac giữ Fn khi bấm F12; tổ hợp chính là Cmd+Shift+S. |
| `common.file.saveAs` | Lưu bản sao (Lưu thành) | Ctrl+Shift+S | Cmd+Shift+S | apple | Apple HIG |  |
| `common.file.print` | In | Ctrl+P | Cmd+P | apple | Apple HIG |  |
| `common.file.close` | Đóng tài liệu | Ctrl+W | Cmd+W | apple | Apple HIG |  |
| `common.edit.undo` | Hoàn tác | Ctrl+Z | Cmd+Z | apple | Apple HIG |  |
| `common.edit.redo` | Làm lại | Ctrl+Y | Cmd+Shift+Z / Cmd+Y | apple | Apple HIG | Cmd+Shift+Z theo HIG; Cmd+Y chờ xác minh bằng Office for Mac. |
| `common.edit.repeat` | Lặp lại thao tác | F4 | F4 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F4. |
| `common.edit.cut` | Cắt | Ctrl+X | Cmd+X | apple | Apple HIG |  |
| `common.edit.copy` | Sao chép | Ctrl+C | Cmd+C | apple | Apple HIG |  |
| `common.edit.paste` | Dán | Ctrl+V | Cmd+V | apple | Apple HIG |  |
| `common.edit.pastePlain` | Dán văn bản thuần (không định dạng) | Ctrl+Shift+V | Cmd+Shift+V / Cmd+Option+Shift+V | office-mac | OM-1 | Cmd+Option+Shift+V là «Dán và khớp kiểu» theo HIG. |
| `common.edit.formatPainter` | Sao chép định dạng (cọ định dạng) | Ctrl+Shift+C | Cmd+Option+C | office-mac | OM-1 |  |
| `common.edit.selectAll` | Chọn tất cả | Ctrl+A | Cmd+A | apple | Apple HIG |  |
| `common.edit.find` | Tìm kiếm | Ctrl+F | Cmd+F | apple | Apple HIG |  |
| `common.edit.replace` | Thay thế | Ctrl+H | Ctrl+H | pending | nguồn: chờ xác minh bằng Office for Mac | Dùng phím Control: Cmd+H là phím hệ thống «Ẩn ứng dụng». |
| `common.edit.hyperlink` | Chèn liên kết | Ctrl+K | Cmd+K | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `common.view.ribbonToggle` | Thu gọn/mở rộng Ribbon | Ctrl+F1 | Cmd+Option+R | pending | nguồn: chờ xác minh bằng Office for Mac | Control+F1 là phím hệ thống macOS (điều hướng bàn phím). |
| `common.view.zoomIn` | Phóng to | Ctrl++ | Cmd++ | apple | Apple HIG |  |
| `common.view.zoomIn` | Phóng to | Ctrl+= | Cmd+= | apple | Apple HIG |  |
| `common.view.zoomOut` | Thu nhỏ | Ctrl+- | Cmd+- | apple | Apple HIG |  |
| `common.view.zoomReset` | Về tỉ lệ 100 % | Ctrl+0 | Cmd+0 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `common.view.fullScreen` | Toàn màn hình | F11 | Cmd+Ctrl+F | apple | Apple HIG | F11 trên Mac là phím hệ thống «Hiện màn hình nền». |
| `ai.assistant.toggle` | Mở/đóng Trợ lý 3T AI | Alt+J | Cmd+Option+J | pending | nguồn: chờ xác minh bằng Office for Mac | Option+J gõ ký tự «∆» trên Mac nên 3T dùng Cmd+Option+J. |
| `ai.assistant.grammarCheck` | Soát lỗi chính tả | F7 | F7 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F7. |
| `common.macro.recordToggle` | Bắt đầu/dừng ghi macro | Ctrl+Shift+R | Cmd+Shift+R | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `common.macro.manager` | Xem danh sách macro | Alt+F8 | Option+F8 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F8. |

## Doc

| Lệnh | Tác vụ | Windows | macOS | Trạng thái | Nguồn | Ghi chú |
|---|---|---|---|---|---|---|
| `writer.outline.promote` | Nâng cấp tiêu đề (dàn ý) | Alt+Shift+Left | Ctrl+Shift+Left | pending | Apple — phím tắt văn bản | Option+Shift+← chọn theo từ trên Mac nên dùng Control. |
| `writer.outline.demote` | Hạ cấp tiêu đề (dàn ý) | Alt+Shift+Right | Ctrl+Shift+Right | pending | Apple — phím tắt văn bản | Option+Shift+→ chọn theo từ trên Mac nên dùng Control. |
| `writer.outline.expand` | Mở rộng dàn ý | Alt+Shift++ | Ctrl+Shift++ | pending | Apple — phím tắt văn bản | Option+Shift+= gõ ký tự «±» trên Mac. |
| `writer.outline.collapse` | Thu gọn dàn ý | Alt+Shift+- | Ctrl+Shift+- | pending | Apple — phím tắt văn bản | Option+Shift+- gõ ký tự «—» trên Mac. |
| `writer.view.navigationPane` | Mở Ngăn dẫn hướng | Ctrl+Alt+N | Cmd+Option+N | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.nav.docStart` | Về đầu tài liệu | Ctrl+Home | Cmd+Home | pending | nguồn: chờ xác minh bằng Office for Mac | Bàn phím không có Home: Fn+Cmd+←. |
| `writer.nav.docEnd` | Về cuối tài liệu | Ctrl+End | Cmd+End | pending | nguồn: chờ xác minh bằng Office for Mac | Bàn phím không có End: Fn+Cmd+→. |
| `writer.edit.goTo` | Đi đến trang/mục | Ctrl+G | Cmd+G | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.edit.goTo` | Đi đến trang/mục | F5 | F5 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F5. |
| `writer.edit.pasteSpecial` | Dán đặc biệt | Ctrl+Alt+V | Cmd+Ctrl+V | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+V là «Dán định dạng» trên Mac nên Dán đặc biệt dùng Cmd+Control+V. |
| `writer.text.bold` | Chữ đậm | Ctrl+B | Cmd+B | apple | Apple HIG |  |
| `writer.text.italic` | Chữ nghiêng | Ctrl+I | Cmd+I | apple | Apple HIG |  |
| `writer.text.underline` | Gạch chân | Ctrl+U | Cmd+U | apple | Apple HIG |  |
| `writer.font.grow` | Tăng cỡ chữ | Ctrl+Shift+> | Cmd+Shift+> | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.font.shrink` | Giảm cỡ chữ | Ctrl+Shift+< | Cmd+Shift+< | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.font.grow1pt` | Tăng cỡ chữ 1 điểm | Ctrl+] | Cmd+] | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.font.shrink1pt` | Giảm cỡ chữ 1 điểm | Ctrl+[ | Cmd+[ | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.text.subscript` | Chỉ số dưới | Ctrl+= | Cmd+= | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.text.superscript` | Chỉ số trên | Ctrl+Shift++ | Cmd+Shift++ | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.text.clearFormat` | Xóa định dạng ký tự | Ctrl+Space | — (không gán) | apple | Apple — phím tắt Mac | Control+Space (đổi bộ gõ) và Cmd+Space (Spotlight) là phím hệ thống; dùng nút Xóa định dạng ở Trang đầu ▸ Phông chữ. |
| `writer.style.normal` | Kiểu Thường | Ctrl+Shift+N | Cmd+Shift+N | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.style.heading1` | Tiêu đề 1 | Ctrl+Alt+1 | Cmd+Option+1 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.style.heading2` | Tiêu đề 2 | Ctrl+Alt+2 | Cmd+Option+2 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.style.heading3` | Tiêu đề 3 | Ctrl+Alt+3 | Cmd+Option+3 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.text.changeCase` | Đổi chữ hoa/thường | Shift+F3 | Shift+F3 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F3. |
| `writer.font.family` | Chọn phông chữ | Ctrl+Shift+F | Cmd+Shift+F | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.format.fontDialog` | Hộp thoại Phông chữ | Ctrl+D | Cmd+D | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.font.size` | Chọn cỡ chữ | Ctrl+Shift+P | Cmd+Shift+P | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.styles.pane` | Mở Ngăn Kiểu | Ctrl+Alt+Shift+S | Cmd+Option+Shift+S | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.color.highlight` | Tô màu nền chữ | Ctrl+Alt+H | Cmd+Shift+H | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+H là phím hệ thống «Ẩn ứng dụng khác». |
| `writer.para.alignLeft` | Căn trái | Ctrl+L | Cmd+L | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.alignCenter` | Căn giữa | Ctrl+E | Cmd+E | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.alignRight` | Căn phải | Ctrl+R | Cmd+R | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.justify` | Căn đều hai bên | Ctrl+J | Cmd+J | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.spacing1` | Giãn dòng 1,0 | Ctrl+1 | Cmd+1 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.spacing15` | Giãn dòng 1,5 | Ctrl+5 | Cmd+5 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.spacing2` | Giãn dòng 2,0 | Ctrl+2 | Cmd+2 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.list.bullet` | Bật/tắt dấu đầu dòng | Ctrl+Shift+L | Cmd+Shift+L | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.indentInc` | Tăng thụt lề | Ctrl+M | Ctrl+Shift+M | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+M là phím hệ thống «Thu nhỏ cửa sổ» nên dùng Control+Shift+M. |
| `writer.para.indentDec` | Giảm thụt lề | Ctrl+Shift+M | Cmd+Shift+M | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.para.moveUp` | Di chuyển đoạn lên | Alt+Shift+Up | Ctrl+Shift+Up | pending | Apple — phím tắt văn bản | Option+Shift+↑ chọn theo đoạn trên Mac nên dùng Control. |
| `writer.para.moveDown` | Di chuyển đoạn xuống | Alt+Shift+Down | Ctrl+Shift+Down | pending | Apple — phím tắt văn bản | Option+Shift+↓ chọn theo đoạn trên Mac nên dùng Control. |
| `writer.para.showFormattingMarks` | Hiện/ẩn ký tự định dạng | Ctrl+* | Cmd+* | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+* = Cmd+Shift+8. |
| `writer.arrange.ungroup` | Bỏ nhóm đối tượng | Ctrl+Shift+G | Cmd+Shift+G | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.page.break` | Ngắt trang | Ctrl+Enter | Cmd+Enter | pending | nguồn: chờ xác minh bằng Office for Mac | Enter = phím Return. |
| `writer.insert.equation` | Chèn phương trình | Alt+= | Ctrl+= | pending | Apple — phím tắt văn bản | Option+= gõ ký tự «≠» trên Mac nên dùng Control+=. |
| `writer.comment.insert` | Thêm ghi chú | Ctrl+Alt+M | Cmd+Option+A | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+M là phím hệ thống «Thu nhỏ mọi cửa sổ». |
| `writer.trackChanges.toggle` | Bật/tắt Theo dõi thay đổi | Ctrl+Shift+E | Cmd+Shift+E | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.help.open` | Mở Trợ giúp | F1 | F1 / Cmd+Shift+/ | office-mac | OM-2 | Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG. |
| `writer.file.printPreview` | Xem trước khi in | Ctrl+F2 | Cmd+F2 | pending | nguồn: chờ xác minh bằng Office for Mac | Control+F2 là phím hệ thống macOS (chuyển tới thanh menu). |
| `writer.reference.footnoteInsert` | Chèn chú thích cuối trang | Ctrl+Alt+F | Cmd+Option+F | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `writer.reference.endnoteInsert` | Chèn chú thích cuối tài liệu | Ctrl+Alt+D | Cmd+Option+E | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+D là phím hệ thống «Hiện/ẩn Dock». |

## Sheet

| Lệnh | Tác vụ | Windows | macOS | Trạng thái | Nguồn | Ghi chú |
|---|---|---|---|---|---|---|
| `sheet.edit.pasteSpecial` | Dán đặc biệt | Ctrl+Alt+V | Cmd+Ctrl+V | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+V là «Dán định dạng» trên Mac. |
| `sheet.nav.home` | Về ô A1 | Ctrl+Home | Cmd+Home | pending | nguồn: chờ xác minh bằng Office for Mac | Fn+Cmd+← trên bàn phím không có Home. |
| `sheet.nav.end` | Tới ô cuối có dữ liệu | Ctrl+End | Cmd+End | pending | nguồn: chờ xác minh bằng Office for Mac | Fn+Cmd+→ trên bàn phím không có End. |
| `sheet.cell.edit` | Sửa nội dung ô | F2 | F2 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F2. |
| `sheet.cell.insertLineBreak` | Xuống dòng trong ô | Alt+Enter | Option+Enter | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.select.column` | Chọn cả cột | Ctrl+Space | — (không gán) | apple | Apple — phím tắt Mac | Control+Space là phím hệ thống đổi bộ gõ; nhấp tiêu đề cột để chọn cột. |
| `sheet.select.row` | Chọn cả hàng | Shift+Space | Shift+Space | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.cell.bold` | Chữ đậm | Ctrl+B | Cmd+B | apple | Apple HIG |  |
| `sheet.cell.italic` | Chữ nghiêng | Ctrl+I | Cmd+I | apple | Apple HIG |  |
| `sheet.cell.underline` | Gạch chân | Ctrl+U | Cmd+U | apple | Apple HIG |  |
| `sheet.format.cellsDialog` | Hộp thoại Định dạng ô | Ctrl+1 | Cmd+1 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.format.currencyVND` | Định dạng tiền tệ VNĐ | Ctrl+Shift+4 | Ctrl+Shift+4 | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Shift+4 là phím hệ thống chụp màn hình. |
| `sheet.format.percent` | Định dạng phần trăm | Ctrl+Shift+5 | Ctrl+Shift+5 | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Shift+5 là phím hệ thống chụp/quay màn hình. |
| `sheet.format.standard` | Định dạng số có phân cách hàng nghìn | Ctrl+Shift+1 | Ctrl+Shift+1 | pending | nguồn: chờ xác minh bằng Office for Mac | Dùng Control cho cả nhóm định dạng số (thống nhất với tiền tệ/phần trăm). |
| `sheet.insert.date` | Chèn ngày hiện tại | Ctrl+; | Ctrl+; | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.insert.time` | Chèn giờ hiện tại | Ctrl+Shift+; | Ctrl+Shift+; | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.formula.insertFunction` | Chèn hàm | Shift+F3 | Shift+F3 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F3. |
| `sheet.formula.sum` | Tự động tính tổng | Alt+= | Cmd+Shift+T | pending | nguồn: chờ xác minh bằng Office for Mac | Option+= gõ ký tự «≠» trên Mac. |
| `sheet.formula.createFromSelection` | Tạo tên từ vùng chọn | Ctrl+Shift+F3 | Cmd+Shift+F3 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.calc.calculateSheet` | Tính lại trang hiện tại | Shift+F9 | Shift+F9 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.formula.arrayEnter` | Nhập công thức mảng | Ctrl+Shift+Enter | Cmd+Shift+Enter | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.formula.recalculate` | Tính lại toàn bộ | F9 | F9 | office-mac | OM-4 | Giữ Fn khi bấm F9. |
| `sheet.data.refreshAll` | Làm mới tất cả liên kết dữ liệu | Ctrl+Alt+F5 | Cmd+Ctrl+F5 | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+F5 là phím hệ thống (bảng Phím tắt Trợ năng). |
| `sheet.data.filter` | Bật/tắt bộ lọc | Ctrl+Shift+L | Cmd+Shift+L | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.view.expandFormulaBar` | Mở rộng/thu gọn thanh công thức | Ctrl+Shift+U | Ctrl+Shift+U | office-mac | OM-3 |  |
| `sheet.view.toggleFormulas` | Hiện công thức thay cho kết quả | Ctrl+` | Ctrl+` | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+` là phím hệ thống chuyển cửa sổ. |
| `sheet.file.printPreview` | Xem trước khi in | Ctrl+F2 | Cmd+F2 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.insert.cells` | Chèn ô/hàng/cột | Ctrl+Shift++ | Cmd+Shift++ | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.sheet.insertBefore` | Chèn trang tính mới | Shift+F11 | Shift+F11 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F11. |
| `sheet.row.insert` | Chèn hàng | Ctrl+Shift+= | Cmd+Shift+= | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.edit.goTo` | Đến ô/vùng | Ctrl+G | Cmd+G | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.edit.fillDown` | Điền xuống | Ctrl+D | Cmd+D | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.edit.fillRight` | Điền sang phải | Ctrl+R | Cmd+R | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `sheet.help.open` | Mở Trợ giúp | F1 | F1 / Cmd+Shift+/ | apple | Apple HIG | Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG. |

## Slide

| Lệnh | Tác vụ | Windows | macOS | Trạng thái | Nguồn | Ghi chú |
|---|---|---|---|---|---|---|
| `slides.slide.new` | Thêm trang chiếu mới | Ctrl+M | Cmd+Shift+N | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+M là phím hệ thống «Thu nhỏ cửa sổ». |
| `slides.slide.duplicate` | Nhân đôi trang chiếu | Ctrl+D | Cmd+D | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.slide.delete` | Xóa trang chiếu đang chọn | Delete | Delete | pending | nguồn: chờ xác minh bằng Office for Mac | Trên bàn phím Mac, phím Delete xóa lùi; xóa trang dùng Fn+Delete (xóa tới). |
| `slides.edit.pasteSpecial` | Dán đặc biệt | Ctrl+Alt+V | Cmd+Ctrl+V | pending | nguồn: chờ xác minh bằng Office for Mac | Cmd+Option+V là «Dán định dạng» trên Mac. |
| `slides.file.printPreview` | Xem trước khi in | Ctrl+F2 | Cmd+F2 | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.show.startFromBegin` | Trình chiếu từ đầu | F5 | F5 / Cmd+Shift+Enter | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F5. |
| `slides.show.startFromCurrent` | Trình chiếu từ trang hiện tại | Shift+F5 | Shift+F5 / Cmd+Enter | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F5. |
| `slides.show.presenterMode` | Chế độ người thuyết trình | Alt+F5 | Option+F5 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F5. |
| `slides.shape.group` | Nhóm đối tượng | Ctrl+G | Cmd+G | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.shape.ungroup` | Bỏ nhóm đối tượng | Ctrl+Shift+G | Cmd+Shift+G | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.nav.firstSlide` | Về trang chiếu đầu | Ctrl+Home | Cmd+Home | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.nav.lastSlide` | Tới trang chiếu cuối | Ctrl+End | Cmd+End | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.nav.prevSlide` | Trang chiếu trước | PageUp | PageUp | pending | nguồn: chờ xác minh bằng Office for Mac | Fn+↑ trên bàn phím không có Page Up. |
| `slides.nav.nextSlide` | Trang chiếu sau | PageDown | PageDown | pending | nguồn: chờ xác minh bằng Office for Mac | Fn+↓ trên bàn phím không có Page Down. |
| `slides.text.bold` | Chữ đậm | Ctrl+B | Cmd+B | apple | Apple HIG |  |
| `slides.text.italic` | Chữ nghiêng | Ctrl+I | Cmd+I | apple | Apple HIG |  |
| `slides.text.underline` | Gạch chân | Ctrl+U | Cmd+U | apple | Apple HIG |  |
| `slides.font.dialog` | Hộp thoại Phông chữ | Ctrl+T | Cmd+T | apple | Apple HIG |  |
| `slides.text.changeCase` | Đổi chữ hoa/thường | Shift+F3 | Shift+F3 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F3. |
| `slides.edit.selectionPane` | Mở Ngăn chọn | Alt+F10 | Option+F10 | pending | nguồn: chờ xác minh bằng Office for Mac | Giữ Fn khi bấm F10. |
| `slides.para.alignLeft` | Căn trái | Ctrl+L | Cmd+L | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.para.alignCenter` | Căn giữa | Ctrl+E | Cmd+E | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.para.alignRight` | Căn phải | Ctrl+R | Cmd+R | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.para.justify` | Căn đều hai bên | Ctrl+J | Cmd+J | pending | nguồn: chờ xác minh bằng Office for Mac |  |
| `slides.help.open` | Mở Trợ giúp | F1 | F1 / Cmd+Shift+/ | apple | Apple HIG | Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG. |

## Chuột / bàn di chuột

| Thao tác | Windows | macOS | Trạng thái | Nguồn |
|---|---|---|---|---|
| contextMenu | Nhấp chuột phải / Shift+F10 / phím Menu | Control+nhấp, nhấp hoặc chạm hai ngón trên bàn di chuột, hoặc Shift+F10 (Fn) | apple | Apple — nhấp phụ |
| additiveSelect | Ctrl+nhấp (chọn thêm ô/đối tượng không liền kề) | Cmd+nhấp | office-mac | OM-5 |
| sheetGroup | Ctrl+nhấp tab trang tính (nhóm trang) | Cmd+nhấp tab trang tính | pending | nguồn: chờ xác minh bằng Office for Mac |
| copyDrag | Ctrl+kéo (sao chép) | Option+kéo (sao chép) | pending | nguồn: chờ xác minh bằng Office for Mac |
| insertDrag | Shift+kéo (chèn, đẩy ô khác) | Shift+kéo (chèn); Option+Shift+kéo = chèn bản sao | pending | nguồn: chờ xác minh bằng Office for Mac |
| keyTips | Bấm và thả Alt, hoặc F10 | F10 (Fn+F10); Option đơn KHÔNG bật KeyTips vì Option dùng nhập ký tự | pending | nguồn: chờ xác minh bằng Office for Mac |

## Tổ hợp hệ thống macOS (app không chặn)

| Tổ hợp | Chức năng | Nguồn |
|---|---|---|
| Cmd+H | Ẩn ứng dụng | Apple HIG |
| Cmd+Option+H | Ẩn ứng dụng khác | Apple HIG |
| Cmd+M | Thu nhỏ cửa sổ | Apple HIG |
| Cmd+Option+M | Thu nhỏ mọi cửa sổ | Apple HIG |
| Cmd+Q | Thoát ứng dụng | Apple HIG |
| Cmd+, | Cài đặt của ứng dụng (menu ứng dụng) | Apple HIG |
| Cmd+Tab | Chuyển ứng dụng | Apple HIG |
| Cmd+Shift+Tab | Chuyển ứng dụng ngược | Apple HIG |
| Cmd+` | Chuyển cửa sổ trong ứng dụng | Apple HIG |
| Cmd+Space | Spotlight | Apple HIG |
| Cmd+Option+Space | Tìm kiếm Finder | Apple — phím tắt Mac |
| Ctrl+Space | Đổi nguồn nhập (bộ gõ) | Apple — phím tắt Mac |
| Ctrl+Option+Space | Nguồn nhập kế tiếp | Apple — phím tắt Mac |
| Cmd+Ctrl+Space | Bảng Biểu tượng cảm xúc & Ký hiệu | Apple HIG |
| Cmd+Option+D | Hiện/ẩn Dock | Apple HIG |
| Cmd+Option+Escape | Buộc thoát ứng dụng | Apple HIG |
| Cmd+Shift+3 | Chụp màn hình | Apple HIG |
| Cmd+Shift+4 | Chụp một phần màn hình | Apple HIG |
| Cmd+Shift+5 | Công cụ chụp/quay màn hình | Apple HIG |
| Cmd+Shift+6 | Chụp Touch Bar | Apple — phím tắt Mac |
| Cmd+Ctrl+Q | Khóa màn hình | Apple — phím tắt Mac |
| Cmd+Shift+Q | Đăng xuất | Apple — phím tắt Mac |
| Ctrl+Left | Mission Control: sang không gian trái | Apple — phím tắt Mac |
| Ctrl+Right | Mission Control: sang không gian phải | Apple — phím tắt Mac |
| Ctrl+Up | Mission Control | Apple — phím tắt Mac |
| Ctrl+Down | Cửa sổ của ứng dụng | Apple — phím tắt Mac |
| F11 | Hiện màn hình nền | Apple — phím tắt Mac |
| Ctrl+F1 | Bật/tắt điều hướng bàn phím | Apple — phím tắt Mac |
| Ctrl+F2 | Chuyển tới thanh menu | Apple — phím tắt Mac |
| Ctrl+F3 | Chuyển tới Dock | Apple — phím tắt Mac |
| Ctrl+F4 | Chuyển tới cửa sổ kế tiếp | Apple — phím tắt Mac |
| Ctrl+F5 | Chuyển tới thanh công cụ cửa sổ | Apple — phím tắt Mac |
| Ctrl+F6 | Chuyển tới cửa sổ nổi | Apple — phím tắt Mac |
| Ctrl+F7 | Đổi chế độ điều hướng bàn phím | Apple — phím tắt Mac |
| Ctrl+F8 | Chuyển tới menu trạng thái | Apple — phím tắt Mac |
| Cmd+F5 | Bật/tắt VoiceOver | Apple — phím tắt Mac |
| Cmd+Option+F5 | Bảng Phím tắt Trợ năng | Apple — phím tắt Mac |
