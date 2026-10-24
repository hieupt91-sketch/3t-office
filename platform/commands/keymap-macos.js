/**
 * Bảng phím theo nền tảng (KEYS-1, MAC-4/5/10/14).
 *
 * Đây là NƠI DUY NHẤT chứa khác biệt bàn phím/chuột giữa macOS và Windows/Linux.
 * - Command definitions giữ tổ hợp kiểu Windows (`Ctrl+…`, `Alt+…`) làm khóa chuẩn.
 * - `MACOS_KEYMAP` nói tổ hợp Windows đó được bấm thế nào trên Mac (Command là phím chính,
 *   Control/Option theo quy ước Mac, không chiếm phím hệ thống).
 * - Cờ capability + các hàm `isPrimaryModifier`, `isAdditiveSelect`, `isCopyDrag`,
 *   `isSecondaryClick`, `matchesShortcut`, `displayShortcut` cho app dùng — app KHÔNG tự
 *   kiểm tra hệ điều hành.
 *
 * Trường `source`/`status` chỉ phục vụ tài liệu `docs/macos/KEYMAP-MACOS-2410.md`
 * (không hiển thị trong Trợ giúp). status: "office-mac" = chuỗi trong gói ứng dụng văn phòng for
 * Mac đọc trên đĩa (mã OM-n, trích dẫn trong tài liệu); "apple" = Apple HIG / tài liệu phím tắt Mac của Apple; "pending" = chờ xác
 * minh bằng Office for Mac (tự động hóa Office đang bị chặn trên máy dựng).
 */

// ---------------------------------------------------------------------------
// Nguồn (chỉ dùng cho tài liệu)
// ---------------------------------------------------------------------------
export const KEYMAP_SOURCES = Object.freeze({
  HIG: "Apple Human Interface Guidelines — Keyboards: bảng phím tắt chuẩn macOS",
  APPLE_SHORTCUTS: "Apple — Phím tắt trên máy Mac (support.apple.com) và Cài đặt hệ thống ▸ Bàn phím ▸ Phím tắt (mặc định)",
  APPLE_TEXT: "Apple — Phím tắt tài liệu trên Mac: Option+Shift+mũi tên chọn theo từ/đoạn; Option+phím gõ ký tự đặc biệt",
  APPLE_POINTER: "Apple — Nhấp phụ: Control+nhấp, hoặc nhấp/chạm hai ngón trên bàn di chuột (Cài đặt hệ thống ▸ Bàn di chuột)",
  WORD_PASTE: "OM-1 — chuỗi trong gói ứng dụng soạn thảo văn bản for Mac (trích dẫn đầy đủ: docs/macos/KEYMAP-MACOS-2410.md)",
  WORD_HELP_F1: "OM-2 — chuỗi trong gói ứng dụng soạn thảo văn bản for Mac (trích dẫn đầy đủ: docs/macos/KEYMAP-MACOS-2410.md)",
  EXCEL_FORMULA_BAR: "OM-3 — chuỗi trong gói ứng dụng bảng tính for Mac (trích dẫn đầy đủ: docs/macos/KEYMAP-MACOS-2410.md)",
  EXCEL_F9: "OM-4 — chuỗi trong gói ứng dụng bảng tính for Mac (trích dẫn đầy đủ: docs/macos/KEYMAP-MACOS-2410.md)",
  EXCEL_CMD_CLICK: "OM-5 — chuỗi trong gói ứng dụng bảng tính for Mac (trích dẫn đầy đủ: docs/macos/KEYMAP-MACOS-2410.md)",
  PENDING: "chờ xác minh bằng Office for Mac"
});

const S = KEYMAP_SOURCES;

/**
 * Một dòng cho MỖI tổ hợp được khai báo trong platform/commands (command-definitions,
 * alias, tổ hợp mặc định của ShortcutManager). `macos: []` = Mac không gán phím (dùng ribbon).
 * Tổ hợp macOS dùng tên Cmd / Ctrl (phím Control) / Option / Shift.
 */
function row(commandId, scope, windows, macos, task, status, source, note = "") {
  return Object.freeze({ commandId, scope, windows, macos: Object.freeze([...macos]), task, status, source, note });
}

const P = "pending";
const A = "apple";
const O = "office-mac";

export const MACOS_KEYMAP = Object.freeze([
  // ---------------------------------------------------------------- Chung (Doc/Sheet/Slide)
  row("common.file.backstage", "common", "Alt+F", [], "Mở menu Tệp", A, S.APPLE_TEXT, "Option+F gõ ký tự «ƒ» trên Mac; dùng F10 rồi T (KeyTips) hoặc nhấp tab Tệp."),
  row("common.file.new", "common", "Ctrl+N", ["Cmd+N"], "Tạo tài liệu mới", A, S.HIG),
  row("common.file.open", "common", "Ctrl+O", ["Cmd+O"], "Mở tệp", A, S.HIG),
  row("common.file.save", "common", "Ctrl+S", ["Cmd+S"], "Lưu", A, S.HIG),
  row("common.file.saveAs", "common", "F12", ["F12"], "Lưu bản sao (Lưu thành)", P, S.PENDING, "Trên Mac giữ Fn khi bấm F12; tổ hợp chính là Cmd+Shift+S."),
  row("common.file.saveAs", "common", "Ctrl+Shift+S", ["Cmd+Shift+S"], "Lưu bản sao (Lưu thành)", A, S.HIG),
  row("common.file.print", "common", "Ctrl+P", ["Cmd+P"], "In", A, S.HIG),
  row("common.file.close", "common", "Ctrl+W", ["Cmd+W"], "Đóng tài liệu", A, S.HIG),
  row("common.edit.undo", "common", "Ctrl+Z", ["Cmd+Z"], "Hoàn tác", A, S.HIG),
  row("common.edit.redo", "common", "Ctrl+Y", ["Cmd+Shift+Z", "Cmd+Y"], "Làm lại", A, S.HIG, "Cmd+Shift+Z theo HIG; Cmd+Y chờ xác minh bằng Office for Mac."),
  row("common.edit.repeat", "common", "F4", ["F4"], "Lặp lại thao tác", P, S.PENDING, "Giữ Fn khi bấm F4."),
  row("common.edit.cut", "common", "Ctrl+X", ["Cmd+X"], "Cắt", A, S.HIG),
  row("common.edit.copy", "common", "Ctrl+C", ["Cmd+C"], "Sao chép", A, S.HIG),
  row("common.edit.paste", "common", "Ctrl+V", ["Cmd+V"], "Dán", A, S.HIG),
  row("common.edit.pastePlain", "common", "Ctrl+Shift+V", ["Cmd+Shift+V", "Cmd+Option+Shift+V"], "Dán văn bản thuần (không định dạng)", O, S.WORD_PASTE, "Cmd+Option+Shift+V là «Dán và khớp kiểu» theo HIG."),
  row("common.edit.formatPainter", "common", "Ctrl+Shift+C", ["Cmd+Option+C"], "Sao chép định dạng (cọ định dạng)", O, S.WORD_PASTE),
  row("common.edit.selectAll", "common", "Ctrl+A", ["Cmd+A"], "Chọn tất cả", A, S.HIG),
  row("common.edit.find", "common", "Ctrl+F", ["Cmd+F"], "Tìm kiếm", A, S.HIG),
  row("common.edit.replace", "common", "Ctrl+H", ["Ctrl+H"], "Thay thế", P, S.PENDING, "Dùng phím Control: Cmd+H là phím hệ thống «Ẩn ứng dụng»."),
  row("common.edit.hyperlink", "common", "Ctrl+K", ["Cmd+K"], "Chèn liên kết", P, S.PENDING),
  row("common.view.ribbonToggle", "common", "Ctrl+F1", ["Cmd+Option+R"], "Thu gọn/mở rộng Ribbon", P, S.PENDING, "Control+F1 là phím hệ thống macOS (điều hướng bàn phím)."),
  row("common.view.zoomIn", "common", "Ctrl++", ["Cmd++"], "Phóng to", A, S.HIG),
  row("common.view.zoomIn", "common", "Ctrl+=", ["Cmd+="], "Phóng to", A, S.HIG),
  row("common.view.zoomOut", "common", "Ctrl+-", ["Cmd+-"], "Thu nhỏ", A, S.HIG),
  row("common.view.zoomReset", "common", "Ctrl+0", ["Cmd+0"], "Về tỉ lệ 100 %", P, S.PENDING),
  row("common.view.fullScreen", "common", "F11", ["Cmd+Ctrl+F"], "Toàn màn hình", A, S.HIG, "F11 trên Mac là phím hệ thống «Hiện màn hình nền»."),
  row("ai.assistant.toggle", "common", "Alt+J", ["Cmd+Option+J"], "Mở/đóng Trợ lý 3T AI", P, S.PENDING, "Option+J gõ ký tự «∆» trên Mac nên 3T dùng Cmd+Option+J."),
  row("ai.assistant.grammarCheck", "common", "F7", ["F7"], "Soát lỗi chính tả", P, S.PENDING, "Giữ Fn khi bấm F7."),
  row("common.macro.recordToggle", "common", "Ctrl+Shift+R", ["Cmd+Shift+R"], "Bắt đầu/dừng ghi macro", P, S.PENDING),
  row("common.macro.manager", "common", "Alt+F8", ["Option+F8"], "Xem danh sách macro", P, S.PENDING, "Giữ Fn khi bấm F8."),

  // ---------------------------------------------------------------- Doc
  row("writer.outline.promote", "writer", "Alt+Shift+Left", ["Ctrl+Shift+Left"], "Nâng cấp tiêu đề (dàn ý)", P, S.APPLE_TEXT, "Option+Shift+← chọn theo từ trên Mac nên dùng Control."),
  row("writer.outline.demote", "writer", "Alt+Shift+Right", ["Ctrl+Shift+Right"], "Hạ cấp tiêu đề (dàn ý)", P, S.APPLE_TEXT, "Option+Shift+→ chọn theo từ trên Mac nên dùng Control."),
  row("writer.outline.expand", "writer", "Alt+Shift++", ["Ctrl+Shift++"], "Mở rộng dàn ý", P, S.APPLE_TEXT, "Option+Shift+= gõ ký tự «±» trên Mac."),
  row("writer.outline.collapse", "writer", "Alt+Shift+-", ["Ctrl+Shift+-"], "Thu gọn dàn ý", P, S.APPLE_TEXT, "Option+Shift+- gõ ký tự «—» trên Mac."),
  row("writer.view.navigationPane", "writer", "Ctrl+Alt+N", ["Cmd+Option+N"], "Mở Ngăn dẫn hướng", P, S.PENDING),
  row("writer.nav.docStart", "writer", "Ctrl+Home", ["Cmd+Home"], "Về đầu tài liệu", P, S.PENDING, "Bàn phím không có Home: Fn+Cmd+←."),
  row("writer.nav.docEnd", "writer", "Ctrl+End", ["Cmd+End"], "Về cuối tài liệu", P, S.PENDING, "Bàn phím không có End: Fn+Cmd+→."),
  row("writer.edit.goTo", "writer", "Ctrl+G", ["Cmd+G"], "Đi đến trang/mục", P, S.PENDING),
  row("writer.edit.goTo", "writer", "F5", ["F5"], "Đi đến trang/mục", P, S.PENDING, "Giữ Fn khi bấm F5."),
  row("writer.edit.pasteSpecial", "writer", "Ctrl+Alt+V", ["Cmd+Ctrl+V"], "Dán đặc biệt", P, S.PENDING, "Cmd+Option+V là «Dán định dạng» trên Mac nên Dán đặc biệt dùng Cmd+Control+V."),
  row("writer.text.bold", "writer", "Ctrl+B", ["Cmd+B"], "Chữ đậm", A, S.HIG),
  row("writer.text.italic", "writer", "Ctrl+I", ["Cmd+I"], "Chữ nghiêng", A, S.HIG),
  row("writer.text.underline", "writer", "Ctrl+U", ["Cmd+U"], "Gạch chân", A, S.HIG),
  row("writer.font.grow", "writer", "Ctrl+Shift+>", ["Cmd+Shift+>"], "Tăng cỡ chữ", P, S.PENDING),
  row("writer.font.shrink", "writer", "Ctrl+Shift+<", ["Cmd+Shift+<"], "Giảm cỡ chữ", P, S.PENDING),
  row("writer.font.grow1pt", "writer", "Ctrl+]", ["Cmd+]"], "Tăng cỡ chữ 1 điểm", P, S.PENDING),
  row("writer.font.shrink1pt", "writer", "Ctrl+[", ["Cmd+["], "Giảm cỡ chữ 1 điểm", P, S.PENDING),
  row("writer.text.subscript", "writer", "Ctrl+=", ["Cmd+="], "Chỉ số dưới", P, S.PENDING),
  row("writer.text.superscript", "writer", "Ctrl+Shift++", ["Cmd+Shift++"], "Chỉ số trên", P, S.PENDING),
  row("writer.text.clearFormat", "writer", "Ctrl+Space", [], "Xóa định dạng ký tự", A, S.APPLE_SHORTCUTS, "Control+Space (đổi bộ gõ) và Cmd+Space (Spotlight) là phím hệ thống; dùng nút Xóa định dạng ở Trang đầu ▸ Phông chữ."),
  row("writer.style.normal", "writer", "Ctrl+Shift+N", ["Cmd+Shift+N"], "Kiểu Thường", P, S.PENDING),
  row("writer.style.heading1", "writer", "Ctrl+Alt+1", ["Cmd+Option+1"], "Tiêu đề 1", P, S.PENDING),
  row("writer.style.heading2", "writer", "Ctrl+Alt+2", ["Cmd+Option+2"], "Tiêu đề 2", P, S.PENDING),
  row("writer.style.heading3", "writer", "Ctrl+Alt+3", ["Cmd+Option+3"], "Tiêu đề 3", P, S.PENDING),
  row("writer.text.changeCase", "writer", "Shift+F3", ["Shift+F3"], "Đổi chữ hoa/thường", P, S.PENDING, "Giữ Fn khi bấm F3."),
  row("writer.font.family", "writer", "Ctrl+Shift+F", ["Cmd+Shift+F"], "Chọn phông chữ", P, S.PENDING),
  row("writer.format.fontDialog", "writer", "Ctrl+D", ["Cmd+D"], "Hộp thoại Phông chữ", P, S.PENDING),
  row("writer.font.size", "writer", "Ctrl+Shift+P", ["Cmd+Shift+P"], "Chọn cỡ chữ", P, S.PENDING),
  row("writer.styles.pane", "writer", "Ctrl+Alt+Shift+S", ["Cmd+Option+Shift+S"], "Mở Ngăn Kiểu", P, S.PENDING),
  row("writer.color.highlight", "writer", "Ctrl+Alt+H", ["Cmd+Shift+H"], "Tô màu nền chữ", P, S.PENDING, "Cmd+Option+H là phím hệ thống «Ẩn ứng dụng khác»."),
  row("writer.para.alignLeft", "writer", "Ctrl+L", ["Cmd+L"], "Căn trái", P, S.PENDING),
  row("writer.para.alignCenter", "writer", "Ctrl+E", ["Cmd+E"], "Căn giữa", P, S.PENDING),
  row("writer.para.alignRight", "writer", "Ctrl+R", ["Cmd+R"], "Căn phải", P, S.PENDING),
  row("writer.para.justify", "writer", "Ctrl+J", ["Cmd+J"], "Căn đều hai bên", P, S.PENDING),
  row("writer.para.spacing1", "writer", "Ctrl+1", ["Cmd+1"], "Giãn dòng 1,0", P, S.PENDING),
  row("writer.para.spacing15", "writer", "Ctrl+5", ["Cmd+5"], "Giãn dòng 1,5", P, S.PENDING),
  row("writer.para.spacing2", "writer", "Ctrl+2", ["Cmd+2"], "Giãn dòng 2,0", P, S.PENDING),
  row("writer.list.bullet", "writer", "Ctrl+Shift+L", ["Cmd+Shift+L"], "Bật/tắt dấu đầu dòng", P, S.PENDING),
  row("writer.para.indentInc", "writer", "Ctrl+M", ["Ctrl+Shift+M"], "Tăng thụt lề", P, S.PENDING, "Cmd+M là phím hệ thống «Thu nhỏ cửa sổ» nên dùng Control+Shift+M."),
  row("writer.para.indentDec", "writer", "Ctrl+Shift+M", ["Cmd+Shift+M"], "Giảm thụt lề", P, S.PENDING),
  row("writer.para.moveUp", "writer", "Alt+Shift+Up", ["Ctrl+Shift+Up"], "Di chuyển đoạn lên", P, S.APPLE_TEXT, "Option+Shift+↑ chọn theo đoạn trên Mac nên dùng Control."),
  row("writer.para.moveDown", "writer", "Alt+Shift+Down", ["Ctrl+Shift+Down"], "Di chuyển đoạn xuống", P, S.APPLE_TEXT, "Option+Shift+↓ chọn theo đoạn trên Mac nên dùng Control."),
  row("writer.para.showFormattingMarks", "writer", "Ctrl+*", ["Cmd+*"], "Hiện/ẩn ký tự định dạng", P, S.PENDING, "Cmd+* = Cmd+Shift+8."),
  row("writer.arrange.ungroup", "writer", "Ctrl+Shift+G", ["Cmd+Shift+G"], "Bỏ nhóm đối tượng", P, S.PENDING),
  row("writer.page.break", "writer", "Ctrl+Enter", ["Cmd+Enter"], "Ngắt trang", P, S.PENDING, "Enter = phím Return."),
  row("writer.insert.equation", "writer", "Alt+=", ["Ctrl+="], "Chèn phương trình", P, S.APPLE_TEXT, "Option+= gõ ký tự «≠» trên Mac nên dùng Control+=."),
  row("writer.comment.insert", "writer", "Ctrl+Alt+M", ["Cmd+Option+A"], "Thêm ghi chú", P, S.PENDING, "Cmd+Option+M là phím hệ thống «Thu nhỏ mọi cửa sổ»."),
  row("writer.trackChanges.toggle", "writer", "Ctrl+Shift+E", ["Cmd+Shift+E"], "Bật/tắt Theo dõi thay đổi", P, S.PENDING),
  row("writer.help.open", "writer", "F1", ["F1", "Cmd+Shift+/"], "Mở Trợ giúp", O, S.WORD_HELP_F1, "Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG."),
  row("writer.file.printPreview", "writer", "Ctrl+F2", ["Cmd+F2"], "Xem trước khi in", P, S.PENDING, "Control+F2 là phím hệ thống macOS (chuyển tới thanh menu)."),
  row("writer.reference.footnoteInsert", "writer", "Ctrl+Alt+F", ["Cmd+Option+F"], "Chèn chú thích cuối trang", P, S.PENDING),
  row("writer.reference.endnoteInsert", "writer", "Ctrl+Alt+D", ["Cmd+Option+E"], "Chèn chú thích cuối tài liệu", P, S.PENDING, "Cmd+Option+D là phím hệ thống «Hiện/ẩn Dock»."),

  // ---------------------------------------------------------------- Sheet
  row("sheet.edit.pasteSpecial", "sheet", "Ctrl+Alt+V", ["Cmd+Ctrl+V"], "Dán đặc biệt", P, S.PENDING, "Cmd+Option+V là «Dán định dạng» trên Mac."),
  row("sheet.nav.home", "sheet", "Ctrl+Home", ["Cmd+Home"], "Về ô A1", P, S.PENDING, "Fn+Cmd+← trên bàn phím không có Home."),
  row("sheet.nav.end", "sheet", "Ctrl+End", ["Cmd+End"], "Tới ô cuối có dữ liệu", P, S.PENDING, "Fn+Cmd+→ trên bàn phím không có End."),
  row("sheet.cell.edit", "sheet", "F2", ["F2"], "Sửa nội dung ô", P, S.PENDING, "Giữ Fn khi bấm F2."),
  row("sheet.cell.insertLineBreak", "sheet", "Alt+Enter", ["Option+Enter"], "Xuống dòng trong ô", P, S.PENDING),
  row("sheet.select.column", "sheet", "Ctrl+Space", [], "Chọn cả cột", A, S.APPLE_SHORTCUTS, "Control+Space là phím hệ thống đổi bộ gõ; nhấp tiêu đề cột để chọn cột."),
  row("sheet.select.row", "sheet", "Shift+Space", ["Shift+Space"], "Chọn cả hàng", P, S.PENDING),
  row("sheet.cell.bold", "sheet", "Ctrl+B", ["Cmd+B"], "Chữ đậm", A, S.HIG),
  row("sheet.cell.italic", "sheet", "Ctrl+I", ["Cmd+I"], "Chữ nghiêng", A, S.HIG),
  row("sheet.cell.underline", "sheet", "Ctrl+U", ["Cmd+U"], "Gạch chân", A, S.HIG),
  row("sheet.format.cellsDialog", "sheet", "Ctrl+1", ["Cmd+1"], "Hộp thoại Định dạng ô", P, S.PENDING),
  row("sheet.format.currencyVND", "sheet", "Ctrl+Shift+4", ["Ctrl+Shift+4"], "Định dạng tiền tệ VNĐ", P, S.PENDING, "Cmd+Shift+4 là phím hệ thống chụp màn hình."),
  row("sheet.format.percent", "sheet", "Ctrl+Shift+5", ["Ctrl+Shift+5"], "Định dạng phần trăm", P, S.PENDING, "Cmd+Shift+5 là phím hệ thống chụp/quay màn hình."),
  row("sheet.format.standard", "sheet", "Ctrl+Shift+1", ["Ctrl+Shift+1"], "Định dạng số có phân cách hàng nghìn", P, S.PENDING, "Dùng Control cho cả nhóm định dạng số (thống nhất với tiền tệ/phần trăm)."),
  row("sheet.insert.date", "sheet", "Ctrl+;", ["Ctrl+;"], "Chèn ngày hiện tại", P, S.PENDING),
  row("sheet.insert.time", "sheet", "Ctrl+Shift+;", ["Ctrl+Shift+;"], "Chèn giờ hiện tại", P, S.PENDING),
  row("sheet.formula.insertFunction", "sheet", "Shift+F3", ["Shift+F3"], "Chèn hàm", P, S.PENDING, "Giữ Fn khi bấm F3."),
  row("sheet.formula.sum", "sheet", "Alt+=", ["Cmd+Shift+T"], "Tự động tính tổng", P, S.PENDING, "Option+= gõ ký tự «≠» trên Mac."),
  row("sheet.formula.createFromSelection", "sheet", "Ctrl+Shift+F3", ["Cmd+Shift+F3"], "Tạo tên từ vùng chọn", P, S.PENDING),
  row("sheet.calc.calculateSheet", "sheet", "Shift+F9", ["Shift+F9"], "Tính lại trang hiện tại", P, S.PENDING),
  row("sheet.formula.arrayEnter", "sheet", "Ctrl+Shift+Enter", ["Cmd+Shift+Enter"], "Nhập công thức mảng", P, S.PENDING),
  row("sheet.formula.recalculate", "sheet", "F9", ["F9"], "Tính lại toàn bộ", O, S.EXCEL_F9, "Giữ Fn khi bấm F9."),
  row("sheet.data.refreshAll", "sheet", "Ctrl+Alt+F5", ["Cmd+Ctrl+F5"], "Làm mới tất cả liên kết dữ liệu", P, S.PENDING, "Cmd+Option+F5 là phím hệ thống (bảng Phím tắt Trợ năng)."),
  row("sheet.data.filter", "sheet", "Ctrl+Shift+L", ["Cmd+Shift+L"], "Bật/tắt bộ lọc", P, S.PENDING),
  row("sheet.view.expandFormulaBar", "sheet", "Ctrl+Shift+U", ["Ctrl+Shift+U"], "Mở rộng/thu gọn thanh công thức", O, S.EXCEL_FORMULA_BAR),
  row("sheet.view.toggleFormulas", "sheet", "Ctrl+`", ["Ctrl+`"], "Hiện công thức thay cho kết quả", P, S.PENDING, "Cmd+` là phím hệ thống chuyển cửa sổ."),
  row("sheet.file.printPreview", "sheet", "Ctrl+F2", ["Cmd+F2"], "Xem trước khi in", P, S.PENDING),
  row("sheet.insert.cells", "sheet", "Ctrl+Shift++", ["Cmd+Shift++"], "Chèn ô/hàng/cột", P, S.PENDING),
  row("sheet.sheet.insertBefore", "sheet", "Shift+F11", ["Shift+F11"], "Chèn trang tính mới", P, S.PENDING, "Giữ Fn khi bấm F11."),
  row("sheet.row.insert", "sheet", "Ctrl+Shift+=", ["Cmd+Shift+="], "Chèn hàng", P, S.PENDING),
  row("sheet.edit.goTo", "sheet", "Ctrl+G", ["Cmd+G"], "Đến ô/vùng", P, S.PENDING),
  row("sheet.edit.fillDown", "sheet", "Ctrl+D", ["Cmd+D"], "Điền xuống", P, S.PENDING),
  row("sheet.edit.fillRight", "sheet", "Ctrl+R", ["Cmd+R"], "Điền sang phải", P, S.PENDING),
  row("sheet.help.open", "sheet", "F1", ["F1", "Cmd+Shift+/"], "Mở Trợ giúp", A, S.HIG, "Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG."),

  // ---------------------------------------------------------------- Slide
  row("slides.slide.new", "slides", "Ctrl+M", ["Cmd+Shift+N"], "Thêm trang chiếu mới", P, S.PENDING, "Cmd+M là phím hệ thống «Thu nhỏ cửa sổ»."),
  row("slides.slide.duplicate", "slides", "Ctrl+D", ["Cmd+D"], "Nhân đôi trang chiếu", P, S.PENDING),
  row("slides.slide.delete", "slides", "Delete", ["Delete"], "Xóa trang chiếu đang chọn", P, S.PENDING, "Trên bàn phím Mac, phím Delete xóa lùi; xóa trang dùng Fn+Delete (xóa tới)."),
  row("slides.edit.pasteSpecial", "slides", "Ctrl+Alt+V", ["Cmd+Ctrl+V"], "Dán đặc biệt", P, S.PENDING, "Cmd+Option+V là «Dán định dạng» trên Mac."),
  row("slides.file.printPreview", "slides", "Ctrl+F2", ["Cmd+F2"], "Xem trước khi in", P, S.PENDING),
  row("slides.show.startFromBegin", "slides", "F5", ["F5", "Cmd+Shift+Enter"], "Trình chiếu từ đầu", P, S.PENDING, "Giữ Fn khi bấm F5."),
  row("slides.show.startFromCurrent", "slides", "Shift+F5", ["Shift+F5", "Cmd+Enter"], "Trình chiếu từ trang hiện tại", P, S.PENDING, "Giữ Fn khi bấm F5."),
  row("slides.show.presenterMode", "slides", "Alt+F5", ["Option+F5"], "Chế độ người thuyết trình", P, S.PENDING, "Giữ Fn khi bấm F5."),
  row("slides.shape.group", "slides", "Ctrl+G", ["Cmd+G"], "Nhóm đối tượng", P, S.PENDING),
  row("slides.shape.ungroup", "slides", "Ctrl+Shift+G", ["Cmd+Shift+G"], "Bỏ nhóm đối tượng", P, S.PENDING),
  row("slides.nav.firstSlide", "slides", "Ctrl+Home", ["Cmd+Home"], "Về trang chiếu đầu", P, S.PENDING),
  row("slides.nav.lastSlide", "slides", "Ctrl+End", ["Cmd+End"], "Tới trang chiếu cuối", P, S.PENDING),
  row("slides.nav.prevSlide", "slides", "PageUp", ["PageUp"], "Trang chiếu trước", P, S.PENDING, "Fn+↑ trên bàn phím không có Page Up."),
  row("slides.nav.nextSlide", "slides", "PageDown", ["PageDown"], "Trang chiếu sau", P, S.PENDING, "Fn+↓ trên bàn phím không có Page Down."),
  row("slides.text.bold", "slides", "Ctrl+B", ["Cmd+B"], "Chữ đậm", A, S.HIG),
  row("slides.text.italic", "slides", "Ctrl+I", ["Cmd+I"], "Chữ nghiêng", A, S.HIG),
  row("slides.text.underline", "slides", "Ctrl+U", ["Cmd+U"], "Gạch chân", A, S.HIG),
  row("slides.font.dialog", "slides", "Ctrl+T", ["Cmd+T"], "Hộp thoại Phông chữ", A, S.HIG),
  row("slides.text.changeCase", "slides", "Shift+F3", ["Shift+F3"], "Đổi chữ hoa/thường", P, S.PENDING, "Giữ Fn khi bấm F3."),
  row("slides.edit.selectionPane", "slides", "Alt+F10", ["Option+F10"], "Mở Ngăn chọn", P, S.PENDING, "Giữ Fn khi bấm F10."),
  row("slides.para.alignLeft", "slides", "Ctrl+L", ["Cmd+L"], "Căn trái", P, S.PENDING),
  row("slides.para.alignCenter", "slides", "Ctrl+E", ["Cmd+E"], "Căn giữa", P, S.PENDING),
  row("slides.para.alignRight", "slides", "Ctrl+R", ["Cmd+R"], "Căn phải", P, S.PENDING),
  row("slides.para.justify", "slides", "Ctrl+J", ["Cmd+J"], "Căn đều hai bên", P, S.PENDING),
  row("slides.help.open", "slides", "F1", ["F1", "Cmd+Shift+/"], "Mở Trợ giúp", A, S.HIG, "Giữ Fn khi bấm F1; Cmd+? (Cmd+Shift+/) theo HIG.")
]);

/** Tổ hợp hệ thống macOS: app không bao giờ chặn (không preventDefault, không chạy lệnh). */
export const MACOS_RESERVED_SHORTCUTS = Object.freeze([
  { combo: "Cmd+H", owner: "Ẩn ứng dụng", source: S.HIG },
  { combo: "Cmd+Option+H", owner: "Ẩn ứng dụng khác", source: S.HIG },
  { combo: "Cmd+M", owner: "Thu nhỏ cửa sổ", source: S.HIG },
  { combo: "Cmd+Option+M", owner: "Thu nhỏ mọi cửa sổ", source: S.HIG },
  { combo: "Cmd+Q", owner: "Thoát ứng dụng", source: S.HIG },
  { combo: "Cmd+,", owner: "Cài đặt của ứng dụng (menu ứng dụng)", source: S.HIG },
  { combo: "Cmd+Tab", owner: "Chuyển ứng dụng", source: S.HIG },
  { combo: "Cmd+Shift+Tab", owner: "Chuyển ứng dụng ngược", source: S.HIG },
  { combo: "Cmd+`", owner: "Chuyển cửa sổ trong ứng dụng", source: S.HIG },
  { combo: "Cmd+Space", owner: "Spotlight", source: S.HIG },
  { combo: "Cmd+Option+Space", owner: "Tìm kiếm Finder", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Space", owner: "Đổi nguồn nhập (bộ gõ)", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Option+Space", owner: "Nguồn nhập kế tiếp", source: S.APPLE_SHORTCUTS },
  { combo: "Cmd+Ctrl+Space", owner: "Bảng Biểu tượng cảm xúc & Ký hiệu", source: S.HIG },
  { combo: "Cmd+Option+D", owner: "Hiện/ẩn Dock", source: S.HIG },
  { combo: "Cmd+Option+Escape", owner: "Buộc thoát ứng dụng", source: S.HIG },
  { combo: "Cmd+Shift+3", owner: "Chụp màn hình", source: S.HIG },
  { combo: "Cmd+Shift+4", owner: "Chụp một phần màn hình", source: S.HIG },
  { combo: "Cmd+Shift+5", owner: "Công cụ chụp/quay màn hình", source: S.HIG },
  { combo: "Cmd+Shift+6", owner: "Chụp Touch Bar", source: S.APPLE_SHORTCUTS },
  { combo: "Cmd+Ctrl+Q", owner: "Khóa màn hình", source: S.APPLE_SHORTCUTS },
  { combo: "Cmd+Shift+Q", owner: "Đăng xuất", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Left", owner: "Mission Control: sang không gian trái", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Right", owner: "Mission Control: sang không gian phải", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Up", owner: "Mission Control", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+Down", owner: "Cửa sổ của ứng dụng", source: S.APPLE_SHORTCUTS },
  { combo: "F11", owner: "Hiện màn hình nền", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F1", owner: "Bật/tắt điều hướng bàn phím", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F2", owner: "Chuyển tới thanh menu", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F3", owner: "Chuyển tới Dock", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F4", owner: "Chuyển tới cửa sổ kế tiếp", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F5", owner: "Chuyển tới thanh công cụ cửa sổ", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F6", owner: "Chuyển tới cửa sổ nổi", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F7", owner: "Đổi chế độ điều hướng bàn phím", source: S.APPLE_SHORTCUTS },
  { combo: "Ctrl+F8", owner: "Chuyển tới menu trạng thái", source: S.APPLE_SHORTCUTS },
  { combo: "Cmd+F5", owner: "Bật/tắt VoiceOver", source: S.APPLE_SHORTCUTS },
  { combo: "Cmd+Option+F5", owner: "Bảng Phím tắt Trợ năng", source: S.APPLE_SHORTCUTS }
]);

/** Thao tác chuột/bàn di chuột trên Mac (Trợ giúp + tài liệu). */
export const MACOS_POINTER_GESTURES = Object.freeze([
  { id: "contextMenu", windows: "Nhấp chuột phải / Shift+F10 / phím Menu", macos: "Control+nhấp, nhấp hoặc chạm hai ngón trên bàn di chuột, hoặc Shift+F10 (Fn)", status: "apple", source: S.APPLE_POINTER },
  { id: "additiveSelect", windows: "Ctrl+nhấp (chọn thêm ô/đối tượng không liền kề)", macos: "Cmd+nhấp", status: "office-mac", source: S.EXCEL_CMD_CLICK },
  { id: "sheetGroup", windows: "Ctrl+nhấp tab trang tính (nhóm trang)", macos: "Cmd+nhấp tab trang tính", status: "pending", source: S.PENDING },
  { id: "copyDrag", windows: "Ctrl+kéo (sao chép)", macos: "Option+kéo (sao chép)", status: "pending", source: S.PENDING },
  { id: "insertDrag", windows: "Shift+kéo (chèn, đẩy ô khác)", macos: "Shift+kéo (chèn); Option+Shift+kéo = chèn bản sao", status: "pending", source: S.PENDING },
  { id: "keyTips", windows: "Bấm và thả Alt, hoặc F10", macos: "F10 (Fn+F10); Option đơn KHÔNG bật KeyTips vì Option dùng nhập ký tự", status: "pending", source: S.PENDING }
]);

// ---------------------------------------------------------------------------
// Tương thích ca8e6280 (MAC-14): 7 tổ hợp mới được kiểm riêng.
// ---------------------------------------------------------------------------
const MAC14_COMMANDS = [
  "writer.style.heading1", "writer.style.heading2", "writer.style.heading3",
  "writer.list.bullet", "sheet.data.filter", "slides.edit.selectionPane", "writer.trackChanges.toggle"
];
export const MACOS_SHORTCUTS = Object.freeze(MAC14_COMMANDS.map((commandId) => {
  const entry = MACOS_KEYMAP.find((item) => item.commandId === commandId);
  return Object.freeze({ commandId, windows: entry.windows, macos: entry.macos[0], scope: entry.scope });
}));

export function getMacOSShortcut(commandId) {
  return MACOS_SHORTCUTS.find((entry) => entry.commandId === commandId) || null;
}

/** Mọi dòng bảng phím của một lệnh (một lệnh có thể có nhiều tổ hợp Windows). */
export function getMacOSKeymapRows(commandId) {
  return MACOS_KEYMAP.filter((entry) => entry.commandId === commandId);
}

// ---------------------------------------------------------------------------
// Phát hiện nền tảng + cờ capability
// ---------------------------------------------------------------------------
export function isMacOSRuntime(navigatorLike = globalThis.navigator) {
  const platform = String(navigatorLike?.userAgentData?.platform || navigatorLike?.platform || "").toLowerCase();
  const userAgent = String(navigatorLike?.userAgent || "").toLowerCase();
  // iPad/iPhone báo "iPad"/"iPhone" — không dùng bảng phím Mac ở đây.
  return platform.includes("mac") || userAgent.includes("macintosh");
}

/** "macos" | "windows" (Windows và Linux dùng chung quy ước Ctrl). */
export function detectKeyboardPlatform(navigatorLike = globalThis.navigator) {
  return isMacOSRuntime(navigatorLike) ? "macos" : "windows";
}

const CAPABILITIES = Object.freeze({
  windows: Object.freeze({
    platform: "windows",
    primaryModifier: "ctrl",
    controlClickIsSecondary: false,
    copyDragModifier: "ctrl",
    soloAltShowsKeyTips: true,
    keyTipsKey: "F10",
    helpAlternates: Object.freeze([]),
    functionKeysNeedFn: false
  }),
  macos: Object.freeze({
    platform: "macos",
    primaryModifier: "meta",
    controlClickIsSecondary: true,
    copyDragModifier: "alt",
    soloAltShowsKeyTips: false,
    keyTipsKey: "F10",
    helpAlternates: Object.freeze(["Cmd+Shift+/"]),
    functionKeysNeedFn: true
  })
});

// Mặc định "windows": môi trường không phát hiện được (Node test, máy chủ) giữ hành vi cũ.
let currentPlatform = "windows";

export function setKeyboardPlatform(platform) {
  currentPlatform = platform === "macos" ? "macos" : "windows";
  return currentPlatform;
}

export function getKeyboardPlatform() {
  return currentPlatform;
}

export function getKeyboardCapabilities(platform = currentPlatform) {
  return CAPABILITIES[platform === "macos" ? "macos" : "windows"];
}

// ---------------------------------------------------------------------------
// Hàm dùng chung cho app (không tự kiểm tra hệ điều hành trong apps/**)
// ---------------------------------------------------------------------------

/** Giữ API cũ (ca8e6280): Ctrl hoặc Cmd đều là phím chính ở chế độ tương thích. */
export function usesPrimaryModifier(event) {
  return Boolean(event?.ctrlKey || event?.metaKey);
}

/** Phím chính theo nền tảng: Mac = Command (không kèm Control); nơi khác = Ctrl (Meta giữ như cũ). */
export function isPrimaryModifier(event, platform = currentPlatform) {
  if (!event) return false;
  if (getKeyboardCapabilities(platform).primaryModifier === "meta") return Boolean(event.metaKey && !event.ctrlKey);
  return Boolean(event.ctrlKey || event.metaKey);
}

/** Nhấp chọn thêm (không liền kề), nhóm trang tính: Mac = Cmd+nhấp; nơi khác = Ctrl+nhấp. */
export function isAdditiveSelect(event, platform = currentPlatform) {
  return isPrimaryModifier(event, platform);
}

/** Kéo-thả để SAO CHÉP thay vì di chuyển: Mac = Option; nơi khác = Ctrl (hoặc Meta như cũ). */
export function isCopyDrag(event, platform = currentPlatform) {
  if (!event) return false;
  if (getKeyboardCapabilities(platform).copyDragModifier === "alt") return Boolean(event.altKey);
  return Boolean(event.ctrlKey || event.metaKey);
}

/** Tên phím (KeyboardEvent.key) bật chế độ sao chép khi đang kéo. */
export function isCopyDragKey(key, platform = currentPlatform) {
  if (getKeyboardCapabilities(platform).copyDragModifier === "alt") return key === "Alt";
  return key === "Control" || key === "Meta";
}

/** Nhấp phụ (mở menu ngữ cảnh): nút phải ở mọi nền tảng; Mac thêm Control+nhấp trái. */
export function isSecondaryClick(event, platform = currentPlatform) {
  if (!event) return false;
  if (event.button === 2) return true;
  return Boolean(getKeyboardCapabilities(platform).controlClickIsSecondary
    && event.button === 0 && event.ctrlKey && !event.metaKey);
}

// ---------------------------------------------------------------------------
// Chuẩn hóa tổ hợp
// ---------------------------------------------------------------------------
const CODE_KEYS = {
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'",
  Backquote: "`", Backslash: "\\", Comma: ",", Period: ".", Slash: "/", Space: "SPACE",
  Enter: "ENTER", NumpadEnter: "ENTER", Tab: "TAB", Escape: "ESCAPE", Backspace: "BACKSPACE", Delete: "DELETE",
  ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
  Home: "HOME", End: "END", PageUp: "PAGEUP", PageDown: "PAGEDOWN", NumpadAdd: "+", NumpadSubtract: "-"
};

const KEY_ALIASES = {
  ARROWUP: "UP", ARROWDOWN: "DOWN", ARROWLEFT: "LEFT", ARROWRIGHT: "RIGHT",
  RETURN: "ENTER", ESC: "ESCAPE", " ": "SPACE", DEL: "DELETE"
};

function normalizeKeyName(key) {
  if (key === "+") return "+";
  const upper = String(key || "").toUpperCase();
  return KEY_ALIASES[upper] || upper;
}

/**
 * Chuẩn hóa tổ hợp kiểu Mac thành chuỗi thứ tự cố định: CMD+CTRL+ALT+SHIFT+KEY.
 * Nhận Cmd/Command/Meta/⌘, Ctrl/Control/⌃, Option/Opt/Alt/⌥, Shift/⇧.
 */
export function normalizeMacCombo(combo) {
  const parts = String(combo || "").split("+").map((p) => p.trim());
  let cmd = false, ctrl = false, alt = false, shift = false, key = "";
  parts.forEach((part, index) => {
    if (part === "" && index === parts.length - 1) { key = "+"; return; }
    const lower = part.toLowerCase();
    if (["cmd", "command", "meta", "⌘"].includes(lower)) cmd = true;
    else if (["ctrl", "control", "⌃"].includes(lower)) ctrl = true;
    else if (["option", "opt", "alt", "⌥"].includes(lower)) alt = true;
    else if (["shift", "⇧"].includes(lower)) shift = true;
    else if (part !== "") key = normalizeKeyName(part);
  });
  return `${cmd ? "CMD+" : ""}${ctrl ? "CTRL+" : ""}${alt ? "ALT+" : ""}${shift ? "SHIFT+" : ""}${key}`;
}

/** Chuẩn hóa tổ hợp kiểu Windows giống ShortcutManager._normalizeCombo (không có Meta). */
export function normalizeWindowsCombo(combo) {
  const parts = String(combo || "").split("+").map((p) => p.trim());
  let ctrl = false, alt = false, shift = false, key = "";
  parts.forEach((part, index) => {
    if (part === "" && index === parts.length - 1) { key = "+"; return; }
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") ctrl = true;
    else if (lower === "alt") alt = true;
    else if (lower === "shift") shift = true;
    else if (part !== "") key = normalizeKeyName(part);
  });
  return `${ctrl ? "CTRL+" : ""}${alt ? "ALT+" : ""}${shift ? "SHIFT+" : ""}${key}`;
}

/** Quy tắc mặc định khi một tổ hợp Windows không có dòng riêng: Ctrl→Cmd, Alt→Option. */
export function deriveMacCombo(windowsCombo) {
  return formatShortcutForMac(windowsCombo);
}

export function formatShortcutForMac(shortcut) {
  return String(shortcut || "")
    .replace(/\bCtrl\b/gi, "Cmd")
    .replace(/\bAlt\b/gi, "Option");
}

const RESERVED_SET = new Set(MACOS_RESERVED_SHORTCUTS.map((item) => normalizeMacCombo(item.combo)));

export function isMacOSReservedCombo(combo) {
  return RESERVED_SET.has(normalizeMacCombo(combo));
}

/**
 * Các tổ hợp Mac (chuẩn hóa) có thể sinh ra từ một KeyboardEvent. Option trên Mac đổi `key`
 * thành ký tự đặc biệt (Option+1 → «¡») nên thử thêm tên phím vật lý từ `code` (bố cục US).
 */
export function macCombosFromEvent(event) {
  const mods = `${event.metaKey ? "CMD+" : ""}${event.ctrlKey ? "CTRL+" : ""}${event.altKey ? "ALT+" : ""}${event.shiftKey ? "SHIFT+" : ""}`;
  const out = [];
  const fromKey = normalizeKeyName(event.key === " " ? "SPACE" : event.key);
  if (fromKey && !["META", "CONTROL", "ALT", "SHIFT"].includes(fromKey)) out.push(mods + fromKey);
  const code = String(event.code || "");
  let fromCode = "";
  if (/^Key[A-Z]$/.test(code)) fromCode = code.slice(3);
  else if (/^Digit\d$/.test(code)) fromCode = code.slice(5);
  else if (/^Numpad\d$/.test(code)) fromCode = code.slice(6);
  else if (/^F\d{1,2}$/.test(code)) fromCode = code;
  else if (CODE_KEYS[code]) fromCode = CODE_KEYS[code];
  if (fromCode && !out.includes(mods + fromCode)) out.push(mods + fromCode);
  // Ký hiệu cần Shift (vd «*» = Shift+8) được khai báo không kèm Shift ("Cmd+*").
  if (event.shiftKey && fromKey.length === 1 && !/[A-Z0-9]/.test(fromKey)) {
    const withoutShift = mods.replace("SHIFT+", "") + fromKey;
    if (!out.includes(withoutShift)) out.push(withoutShift);
  }
  return out;
}

/**
 * Bảng tra ngược Mac → Windows cho các tổ hợp ĐANG được bind.
 * @param {Iterable<[string, string]>} bindings cặp [tổ hợp Windows chuẩn hóa, commandId]
 * @returns {Map<string, string>} tổ hợp Mac chuẩn hóa → tổ hợp Windows chuẩn hóa
 */
export function buildMacReverseMap(bindings) {
  const reverse = new Map();
  for (const [windowsNorm, commandId] of bindings) {
    for (const mac of macCombosForBinding(windowsNorm, commandId)) {
      const macNorm = normalizeMacCombo(mac);
      if (RESERVED_SET.has(macNorm)) continue;
      reverse.set(macNorm, windowsNorm);
    }
  }
  return reverse;
}

/** Tổ hợp Mac (chưa chuẩn hóa) cho một binding Windows của một lệnh. */
export function macCombosForBinding(windowsCombo, commandId) {
  const windowsNorm = normalizeWindowsCombo(windowsCombo);
  const rowMatch = MACOS_KEYMAP.find((entry) => entry.commandId === commandId && normalizeWindowsCombo(entry.windows) === windowsNorm)
    // Tổ hợp chung (vd Ctrl+B) được app bind cho command khác: dùng dòng cùng tổ hợp Windows.
    || MACOS_KEYMAP.find((entry) => normalizeWindowsCombo(entry.windows) === windowsNorm && entry.scope !== "common" && commandId?.startsWith?.(`${entry.scope}.`));
  if (rowMatch) return [...rowMatch.macos];
  return [deriveMacCombo(windowsCombo)];
}

/**
 * Sự kiện có khớp tổ hợp (viết kiểu Windows) theo nền tảng không. Dùng cho bộ xử lý phím
 * cục bộ của app thay vì tự kiểm tra ctrlKey/metaKey.
 */
export function matchesShortcut(event, windowsCombo, { commandId = null, platform = currentPlatform } = {}) {
  if (!event) return false;
  if (platform === "macos") {
    const wanted = new Set(macCombosForBinding(windowsCombo, commandId).map(normalizeMacCombo));
    return macCombosFromEvent(event).some((combo) => wanted.has(combo));
  }
  const key = normalizeKeyName(event.key);
  const combo = `${event.ctrlKey || event.metaKey ? "CTRL+" : ""}${event.altKey ? "ALT+" : ""}${event.shiftKey ? "SHIFT+" : ""}${key}`;
  return combo === normalizeWindowsCombo(windowsCombo);
}

const MAC_SYMBOLS = { CMD: "⌘", CTRL: "⌃", ALT: "⌥", SHIFT: "⇧" };
const MAC_KEY_LABELS = { ENTER: "↩", DELETE: "⌦", BACKSPACE: "⌫", ESCAPE: "⎋", UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→", SPACE: "Space", TAB: "⇥", PAGEUP: "PgUp", PAGEDOWN: "PgDn", HOME: "↖", END: "↘" };

/** Ký hiệu Mac (⌃⌥⇧⌘ theo thứ tự HIG) cho một tổ hợp Mac. */
export function formatMacSymbols(macCombo) {
  const norm = normalizeMacCombo(macCombo);
  const parts = norm.split("+");
  const key = norm.endsWith("++") ? "+" : parts[parts.length - 1];
  const has = (mod) => parts.slice(0, -1).includes(mod) || (norm.endsWith("++") && parts.includes(mod));
  // Thứ tự hiển thị chuẩn Mac: Control, Option, Shift, Command.
  const mods = ["CTRL", "ALT", "SHIFT", "CMD"].filter(has).map((mod) => MAC_SYMBOLS[mod]).join("");
  const label = MAC_KEY_LABELS[key] || (key.length === 1 ? key.toUpperCase() : key);
  return `${mods}${label}`;
}

/**
 * Nhãn phím để HIỂN THỊ (tooltip, menu ngữ cảnh, thanh truy nhanh) theo nền tảng.
 * Windows: trả nguyên. Mac: tổ hợp Mac đầu tiên dạng ký hiệu, rỗng nếu Mac không gán phím.
 */
export function displayShortcut(windowsCombo, commandId = null, platform = currentPlatform) {
  if (!windowsCombo) return "";
  if (platform !== "macos") return windowsCombo;
  const macs = macCombosForBinding(windowsCombo, commandId);
  return macs.length ? formatMacSymbols(macs[0]) : "";
}
