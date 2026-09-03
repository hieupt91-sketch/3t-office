/**
 * VN Office Platform — Danh mục định nghĩa toàn bộ Command IDs
 * Tiếng Việt chuẩn hóa, phím tắt thống nhất, gắn sẵn Icon Vector
 */

export const COMMON_COMMANDS = [
  // Tệp (File)
  { id: "common.file.new", category: "file", label: "Tạo mới", shortcut: "Ctrl+N", icon: "fileNew", tooltip: "Tạo tài liệu mới (Ctrl+N)" },
  { id: "common.file.open", category: "file", label: "Mở tệp", shortcut: "Ctrl+O", icon: "fileOpen", tooltip: "Mở tài liệu có sẵn (Ctrl+O)" },
  { id: "common.file.save", category: "file", label: "Lưu", shortcut: "Ctrl+S", icon: "fileSave", tooltip: "Lưu tài liệu hiện tại (Ctrl+S)" },
  { id: "common.file.saveAs", category: "file", label: "Lưu bản sao", shortcut: "F12", icon: "fileSave", tooltip: "Lưu tài liệu dưới tên khác (F12)" },
  { id: "common.file.exportPdf", category: "file", label: "Xuất PDF", icon: "filePdf", tooltip: "Xuất nội dung sang định dạng PDF tiêu chuẩn" },
  { id: "common.file.print", category: "file", label: "In tài liệu", shortcut: "Ctrl+P", icon: "filePrint", tooltip: "In tài liệu (Ctrl+P)" },
  { id: "common.file.close", category: "file", label: "Đóng", shortcut: "Ctrl+W", icon: "close", tooltip: "Đóng tài liệu (Ctrl+W)" },

  // Chỉnh sửa & Bảng nhớ tạm (Edit & Clipboard)
  { id: "common.edit.undo", category: "edit", label: "Hoàn tác", shortcut: "Ctrl+Z", icon: "undo", tooltip: "Hoàn tác thao tác vừa thực hiện (Ctrl+Z)" },
  { id: "common.edit.redo", category: "edit", label: "Làm lại", shortcut: "Ctrl+Y", icon: "redo", tooltip: "Làm lại thao tác vừa hoàn tác (Ctrl+Y)" },
  { id: "common.edit.cut", category: "edit", label: "Cắt", shortcut: "Ctrl+X", icon: "cut", tooltip: "Cắt vùng chọn vào bộ nhớ tạm (Ctrl+X)" },
  { id: "common.edit.copy", category: "edit", label: "Sao chép", shortcut: "Ctrl+C", icon: "copy", tooltip: "Sao chép vùng chọn (Ctrl+C)" },
  { id: "common.edit.paste", category: "edit", label: "Dán", shortcut: "Ctrl+V", icon: "paste", tooltip: "Dán nội dung từ bộ nhớ tạm (Ctrl+V)" },
  { id: "common.edit.formatPainter", category: "edit", label: "Sao chép định dạng", icon: "formatPainter", tooltip: "Sao chép định dạng văn bản" },
  { id: "common.edit.selectAll", category: "edit", label: "Chọn tất cả", shortcut: "Ctrl+A", icon: "search", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
  { id: "common.edit.find", category: "edit", label: "Tìm kiếm", shortcut: "Ctrl+F", icon: "search", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
  { id: "common.edit.replace", category: "edit", label: "Thay thế", shortcut: "Ctrl+H", icon: "search", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },

  // Hiển thị (View)
  { id: "common.view.zoomIn", category: "view", label: "Phóng to", shortcut: "Ctrl++", icon: "search", tooltip: "Tăng tỉ lệ hiển thị" },
  { id: "common.view.zoomOut", category: "view", label: "Thu nhỏ", shortcut: "Ctrl+-", icon: "search", tooltip: "Giảm tỉ lệ hiển thị" },
  { id: "common.view.zoomReset", category: "view", label: "100%", shortcut: "Ctrl+0", icon: "search", tooltip: "Đặt tỉ lệ hiển thị về 100%" },
  { id: "common.view.fullScreen", category: "view", label: "Toàn màn hình", shortcut: "F11", icon: "slidePlay", tooltip: "Bật/tắt chế độ toàn màn hình (F11)", isToggle: true },

  // Trợ lý AI (AI Assistant)
  { id: "ai.assistant.toggle", category: "ai", label: "Trợ lý VN AI", shortcut: "Alt+J", icon: "aiSparkle", tooltip: "Mở bảng trợ lý VN AI (Alt+J)", isToggle: true },
  { id: "ai.assistant.summarize", category: "ai", label: "Tóm tắt nhanh", icon: "aiSparkle", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
  { id: "ai.assistant.rewrite", category: "ai", label: "Viết lại trau chuốt", icon: "aiSparkle", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
  { id: "ai.assistant.grammarCheck", category: "ai", label: "Soát lỗi chính tả", icon: "aiSparkle", tooltip: "Kiểm tra ngữ pháp và lỗi chính tả tiếng Việt" }
];

export const WRITER_COMMANDS = [
  // Định dạng ký tự (Font / Character)
  { id: "writer.text.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "writer.text.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "writer.text.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân chữ (Ctrl+U)", isToggle: true },
  { id: "writer.text.strike", category: "format", label: "Gạch ngang", icon: "strike", tooltip: "Gạch ngang chữ", isToggle: true },
  { id: "writer.text.clearFormat", category: "format", label: "Xóa định dạng", shortcut: "Ctrl+Space", icon: "clearFormat", tooltip: "Xóa toàn bộ định dạng về mặc định" },
  { id: "writer.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ" },
  { id: "writer.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
  { id: "writer.color.text", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu phông chữ" },
  { id: "writer.color.highlight", category: "format", label: "Màu nền chữ", icon: "colorHighlight", tooltip: "Tô màu nền văn bản" },

  // Định dạng đoạn văn (Paragraph)
  { id: "writer.para.alignLeft", category: "paragraph", label: "Căn trái", shortcut: "Ctrl+L", icon: "alignLeft", tooltip: "Căn lề trái (Ctrl+L)", isToggle: true },
  { id: "writer.para.alignCenter", category: "paragraph", label: "Căn giữa", shortcut: "Ctrl+E", icon: "alignCenter", tooltip: "Căn lề giữa (Ctrl+E)", isToggle: true },
  { id: "writer.para.alignRight", category: "paragraph", label: "Căn phải", shortcut: "Ctrl+R", icon: "alignRight", tooltip: "Căn lề phải (Ctrl+R)", isToggle: true },
  { id: "writer.para.justify", category: "paragraph", label: "Căn đều", shortcut: "Ctrl+J", icon: "alignJustify", tooltip: "Căn đều hai bên (Ctrl+J)", isToggle: true },
  { id: "writer.list.bullet", category: "paragraph", label: "Dấu đầu dòng", icon: "listBullet", tooltip: "Tạo danh sách dấu chấm tròn", isToggle: true },
  { id: "writer.list.numbered", category: "paragraph", label: "Đánh số", icon: "listNumber", tooltip: "Tạo danh sách đánh số thứ tự", isToggle: true },
  { id: "writer.para.indentInc", category: "paragraph", label: "Tăng thụt lề", icon: "indentInc", tooltip: "Tăng khoảng cách thụt lề đoạn văn" },
  { id: "writer.para.indentDec", category: "paragraph", label: "Giảm thụt lề", icon: "indentDec", tooltip: "Giảm khoảng cách thụt lề đoạn văn" },

  // Chèn (Insert)
  { id: "writer.table.insert", category: "insert", label: "Bảng biểu", icon: "table", tooltip: "Chèn bảng mới vào văn bản" },
  { id: "writer.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn hình ảnh từ máy tính" },
  { id: "writer.page.break", category: "insert", label: "Ngắt trang", shortcut: "Ctrl+Enter", icon: "pageBreak", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
  { id: "writer.header.insert", category: "insert", label: "Đầu trang", icon: "headerFooter", tooltip: "Chèn tiêu đề đầu trang (Header)" },
  { id: "writer.footer.insert", category: "insert", label: "Chân trang", icon: "headerFooter", tooltip: "Chèn tiêu đề chân trang (Footer)" },

  // Bố trí trang (Layout)
  { id: "writer.page.margins", category: "layout", label: "Căn lề", icon: "margins", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
  { id: "writer.page.orientation", category: "layout", label: "Hướng giấy", icon: "orientation", tooltip: "Khổ giấy dọc hoặc ngang" },
  { id: "writer.page.size", category: "layout", label: "Kích thước giấy", icon: "pageBreak", tooltip: "Chọn khổ A4, Letter, v.v." }
];

export const SHEET_COMMANDS = [
  // Ô và phạm vi (Cell & Range)
  { id: "sheet.cell.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "sheet.cell.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "sheet.cell.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân (Ctrl+U)", isToggle: true },
  { id: "sheet.cell.alignLeft", category: "format", label: "Căn trái", icon: "alignLeft", tooltip: "Căn lề trái", isToggle: true },
  { id: "sheet.cell.alignCenter", category: "format", label: "Căn giữa", icon: "alignCenter", tooltip: "Căn lề giữa", isToggle: true },
  { id: "sheet.cell.alignRight", category: "format", label: "Căn phải", icon: "alignRight", tooltip: "Căn lề phải", isToggle: true },
  { id: "sheet.cell.merge", category: "cell", label: "Trộn ô", icon: "mergeCells", tooltip: "Trộn các ô đã chọn và căn giữa", isToggle: true },
  { id: "sheet.cell.borders", category: "cell", label: "Viền ô", icon: "table", tooltip: "Kẻ đường viền khung ô" },
  { id: "sheet.cell.fillColor", category: "format", label: "Màu nền", icon: "colorHighlight", tooltip: "Tô màu nền ô tính" },
  { id: "sheet.cell.textColor", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu chữ trong ô" },

  // Định dạng số & Tiền tệ
  { id: "sheet.format.currencyVND", category: "number", label: "Tiền tệ VNĐ", icon: "currencyVND", tooltip: "Định dạng số tiền Việt Nam Đồng (vd: 1.000.000 ₫)" },
  { id: "sheet.format.percent", category: "number", label: "Phần trăm", icon: "currencyVND", tooltip: "Định dạng số theo tỷ lệ phần trăm %" },

  // Công thức & Dữ liệu
  { id: "sheet.formula.sum", category: "formula", label: "AutoSum", icon: "autoSum", tooltip: "Hàm tính tổng tự động" },
  { id: "sheet.formula.average", category: "formula", label: "Trung bình", icon: "autoSum", tooltip: "Hàm tính trung bình cộng" },
  { id: "sheet.data.sortAsc", category: "data", label: "Sắp xếp A-Z", icon: "sortAsc", tooltip: "Sắp xếp dữ liệu tăng dần" },
  { id: "sheet.data.sortDesc", category: "data", label: "Sắp xếp Z-A", icon: "sortDesc", tooltip: "Sắp xếp dữ liệu giảm dần" },
  { id: "sheet.data.filter", category: "data", label: "Bộ lọc", icon: "filter", tooltip: "Bật/tắt chế độ lọc dữ liệu", isToggle: true },

  // Chèn hàng/cột & Biểu đồ
  { id: "sheet.row.insert", category: "insert", label: "Chèn hàng", icon: "table", tooltip: "Chèn thêm hàng mới" },
  { id: "sheet.col.insert", category: "insert", label: "Chèn cột", icon: "table", tooltip: "Chèn thêm cột mới" },
  { id: "sheet.chart.insert", category: "insert", label: "Biểu đồ", icon: "filePrint", tooltip: "Chèn biểu đồ phân tích dữ liệu" }
];

export const SLIDES_COMMANDS = [
  // Quản lý Trang chiếu
  { id: "slides.slide.new", category: "slide", label: "Trang mới", shortcut: "Ctrl+M", icon: "slideNew", tooltip: "Chèn trang chiếu mới (Ctrl+M)" },
  { id: "slides.slide.duplicate", category: "slide", label: "Nhân đôi", icon: "copy", tooltip: "Nhân đôi trang chiếu đang chọn" },
  { id: "slides.slide.delete", category: "slide", label: "Xóa trang", icon: "close", tooltip: "Xóa trang chiếu đang chọn" },

  // Chèn đối tượng
  { id: "slides.text.insert", category: "insert", label: "Hộp văn bản", icon: "textBox", tooltip: "Chèn khung văn bản mới" },
  { id: "slides.shape.insert", category: "insert", label: "Hình khối", icon: "shape", tooltip: "Chèn hình chữ nhật, tròn, mũi tên" },
  { id: "slides.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn ảnh minh họa từ máy tính" },

  // Trình chiếu
  { id: "slides.transition.apply", category: "transition", label: "Chuyển tiếp", icon: "slidePlay", tooltip: "Hiệu ứng chuyển trang chiếu" },
  { id: "slides.show.startFromBegin", category: "show", label: "Từ đầu (F5)", shortcut: "F5", icon: "slidePlay", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" },
  { id: "slides.show.startFromCurrent", category: "show", label: "Từ trang này", shortcut: "Shift+F5", icon: "slidePlay", tooltip: "Trình chiếu từ trang hiện tại (Shift+F5)" }
];

export function registerAllStandardCommands(bus) {
  for (const cmd of COMMON_COMMANDS) bus.register(cmd);
  for (const cmd of WRITER_COMMANDS) bus.register(cmd);
  for (const cmd of SHEET_COMMANDS) bus.register(cmd);
  for (const cmd of SLIDES_COMMANDS) bus.register(cmd);
}
