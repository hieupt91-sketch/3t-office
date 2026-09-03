/**
 * VN Office Platform — Danh mục định nghĩa toàn bộ Command IDs
 * Tiếng Việt chuẩn hóa, phím tắt thống nhất
 */

export const COMMON_COMMANDS = [
  // Tệp (File)
  { id: "common.file.new", category: "file", label: "Tạo mới", shortcut: "Ctrl+N", tooltip: "Tạo tài liệu mới (Ctrl+N)" },
  { id: "common.file.open", category: "file", label: "Mở tệp", shortcut: "Ctrl+O", tooltip: "Mở tài liệu có sẵn (Ctrl+O)" },
  { id: "common.file.save", category: "file", label: "Lưu", shortcut: "Ctrl+S", tooltip: "Lưu tài liệu hiện tại (Ctrl+S)" },
  { id: "common.file.saveAs", category: "file", label: "Lưu thành bản sao", shortcut: "F12", tooltip: "Lưu tài liệu dưới tên khác (F12)" },
  { id: "common.file.exportPdf", category: "file", label: "Xuất tệp PDF", tooltip: "Xuất nội dung sang định dạng PDF tiêu chuẩn" },
  { id: "common.file.print", category: "file", label: "In tài liệu", shortcut: "Ctrl+P", tooltip: "In tài liệu (Ctrl+P)" },
  { id: "common.file.close", category: "file", label: "Đóng", shortcut: "Ctrl+W", tooltip: "Đóng tài liệu (Ctrl+W)" },

  // Chỉnh sửa (Edit)
  { id: "common.edit.undo", category: "edit", label: "Hoàn tác", shortcut: "Ctrl+Z", tooltip: "Hoàn tác thao tác vừa thực hiện (Ctrl+Z)" },
  { id: "common.edit.redo", category: "edit", label: "Làm lại", shortcut: "Ctrl+Y", tooltip: "Làm lại thao tác vừa hoàn tác (Ctrl+Y)" },
  { id: "common.edit.cut", category: "edit", label: "Cắt", shortcut: "Ctrl+X", tooltip: "Cắt vùng chọn vào bộ nhớ tạm (Ctrl+X)" },
  { id: "common.edit.copy", category: "edit", label: "Sao chép", shortcut: "Ctrl+C", tooltip: "Sao chép vùng chọn (Ctrl+C)" },
  { id: "common.edit.paste", category: "edit", label: "Dán", shortcut: "Ctrl+V", tooltip: "Dán nội dung từ bộ nhớ tạm (Ctrl+V)" },
  { id: "common.edit.selectAll", category: "edit", label: "Chọn tất cả", shortcut: "Ctrl+A", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
  { id: "common.edit.find", category: "edit", label: "Tìm kiếm", shortcut: "Ctrl+F", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
  { id: "common.edit.replace", category: "edit", label: "Thay thế", shortcut: "Ctrl+H", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },

  // Hiển thị (View)
  { id: "common.view.zoomIn", category: "view", label: "Phóng to", shortcut: "Ctrl++", tooltip: "Tăng tỉ lệ hiển thị" },
  { id: "common.view.zoomOut", category: "view", label: "Thu nhỏ", shortcut: "Ctrl+-", tooltip: "Giảm tỉ lệ hiển thị" },
  { id: "common.view.zoomReset", category: "view", label: "100%", shortcut: "Ctrl+0", tooltip: "Đặt tỉ lệ hiển thị về 100%" },
  { id: "common.view.fullScreen", category: "view", label: "Toàn màn hình", shortcut: "F11", tooltip: "Bật/tắt chế độ toàn màn hình (F11)", isToggle: true },

  // Trợ lý AI (AI Assistant)
  { id: "ai.assistant.toggle", category: "ai", label: "Trợ lý VN AI", shortcut: "Ctrl+J", tooltip: "Mở bảng trợ lý VN AI (Ctrl+J)", isToggle: true },
  { id: "ai.assistant.summarize", category: "ai", label: "Tóm tắt nhanh", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
  { id: "ai.assistant.rewrite", category: "ai", label: "Viết lại trau chuốt", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
  { id: "ai.assistant.grammarCheck", category: "ai", label: "Soát lỗi chính tả", tooltip: "Kiểm tra ngữ pháp và lỗi chính tả tiếng Việt" }
];

export const WRITER_COMMANDS = [
  // Định dạng ký tự (Font / Character)
  { id: "writer.text.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "writer.text.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "writer.text.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", tooltip: "Gạch chân chữ (Ctrl+U)", isToggle: true },
  { id: "writer.text.strike", category: "format", label: "Gạch ngang", tooltip: "Gạch ngang chữ", isToggle: true },
  { id: "writer.text.clearFormat", category: "format", label: "Xóa định dạng", shortcut: "Ctrl+Space", tooltip: "Xóa toàn bộ định dạng về mặc định" },
  { id: "writer.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ" },
  { id: "writer.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
  { id: "writer.color.text", category: "format", label: "Màu chữ", tooltip: "Đổi màu phông chữ" },
  { id: "writer.color.highlight", category: "format", label: "Màu nền chữ", tooltip: "Tô màu nền văn bản" },

  // Định dạng đoạn văn (Paragraph)
  { id: "writer.para.alignLeft", category: "paragraph", label: "Căn trái", shortcut: "Ctrl+L", tooltip: "Căn lề trái (Ctrl+L)", isToggle: true },
  { id: "writer.para.alignCenter", category: "paragraph", label: "Căn giữa", shortcut: "Ctrl+E", tooltip: "Căn lề giữa (Ctrl+E)", isToggle: true },
  { id: "writer.para.alignRight", category: "paragraph", label: "Căn phải", shortcut: "Ctrl+R", tooltip: "Căn lề phải (Ctrl+R)", isToggle: true },
  { id: "writer.para.justify", category: "paragraph", label: "Căn đều", shortcut: "Ctrl+J", tooltip: "Căn đều hai bên (Ctrl+J)", isToggle: true },
  { id: "writer.para.lineSpacing", category: "paragraph", label: "Khoảng cách dòng", tooltip: "Giãn khoảng cách dòng (1.0, 1.15, 1.5, 2.0)" },
  { id: "writer.list.bullet", category: "paragraph", label: "Danh sách dấu đầu dòng", tooltip: "Tạo danh sách dấu chấm tròn", isToggle: true },
  { id: "writer.list.numbered", category: "paragraph", label: "Danh sách đánh số", tooltip: "Tạo danh sách đánh số thứ tự", isToggle: true },
  { id: "writer.para.indentInc", category: "paragraph", label: "Tăng thụt lề", tooltip: "Tăng khoảng cách thụt lề đoạn văn" },
  { id: "writer.para.indentDec", category: "paragraph", label: "Giảm thụt lề", tooltip: "Giảm khoảng cách thụt lề đoạn văn" },

  // Chèn (Insert)
  { id: "writer.table.insert", category: "insert", label: "Bảng biểu", tooltip: "Chèn bảng mới vào văn bản" },
  { id: "writer.image.insert", category: "insert", label: "Hình ảnh", tooltip: "Chèn hình ảnh từ máy tính" },
  { id: "writer.page.break", category: "insert", label: "Ngắt trang", shortcut: "Ctrl+Enter", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
  { id: "writer.header.insert", category: "insert", label: "Đầu trang (Header)", tooltip: "Chèn tiêu đề đầu trang" },
  { id: "writer.footer.insert", category: "insert", label: "Chân trang (Footer)", tooltip: "Chèn tiêu đề chân trang và số trang" },

  // Bố trí trang (Layout)
  { id: "writer.page.orientation", category: "layout", label: "Hướng giấy", tooltip: "Khổ giấy dọc hoặc ngang" },
  { id: "writer.page.margins", category: "layout", label: "Căn lề trang", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
  { id: "writer.page.size", category: "layout", label: "Kích thước giấy", tooltip: "Chọn khổ A4, Letter, v.v." }
];

export const SHEET_COMMANDS = [
  // Ô và phạm vi (Cell & Range)
  { id: "sheet.cell.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "sheet.cell.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "sheet.cell.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", tooltip: "Gạch chân (Ctrl+U)", isToggle: true },
  { id: "sheet.cell.alignLeft", category: "format", label: "Căn trái", tooltip: "Căn lề trái", isToggle: true },
  { id: "sheet.cell.alignCenter", category: "format", label: "Căn giữa", tooltip: "Căn lề giữa", isToggle: true },
  { id: "sheet.cell.alignRight", category: "format", label: "Căn phải", tooltip: "Căn lề phải", isToggle: true },
  { id: "sheet.cell.merge", category: "cell", label: "Trộn & Căn giữa", tooltip: "Trộn các ô đã chọn và căn giữa", isToggle: true },
  { id: "sheet.cell.wrapText", category: "cell", label: "Tự xuống dòng", tooltip: "Tự động xuống dòng khi chữ dài", isToggle: true },
  { id: "sheet.cell.borders", category: "cell", label: "Viền ô", tooltip: "Kẻ đường viền khung ô" },
  { id: "sheet.cell.fillColor", category: "format", label: "Màu nền ô", tooltip: "Tô màu nền ô tính" },
  { id: "sheet.cell.textColor", category: "format", label: "Màu chữ", tooltip: "Đổi màu chữ trong ô" },

  // Định dạng số (Number Format)
  { id: "sheet.format.currencyVND", category: "number", label: "Tiền tệ VNĐ", tooltip: "Định dạng số tiền Việt Nam Đồng (vd: 1.000.000 ₫)" },
  { id: "sheet.format.percent", category: "number", label: "Phần trăm %", tooltip: "Định dạng số theo tỷ lệ phần trăm" },
  { id: "sheet.format.comma", category: "number", label: "Dấu phân cách", tooltip: "Thêm dấu phẩy phân cách hàng nghìn" },
  { id: "sheet.format.decimalInc", category: "number", label: "Thêm chữ số thập phân", tooltip: "Tăng số chữ số sau dấu thập phân" },
  { id: "sheet.format.decimalDec", category: "number", label: "Bớt chữ số thập phân", tooltip: "Giảm số chữ số sau dấu thập phân" },

  // Công thức & Dữ liệu (Formulas & Data)
  { id: "sheet.formula.sum", category: "formula", label: "Tổng (AutoSum)", tooltip: "Hàm tính tổng các ô lân cận" },
  { id: "sheet.formula.average", category: "formula", label: "Trung bình", tooltip: "Hàm tính trung bình cộng" },
  { id: "sheet.formula.count", category: "formula", label: "Đếm số", tooltip: "Hàm đếm số lượng ô có dữ liệu" },
  { id: "sheet.data.sortAsc", category: "data", label: "Sắp xếp A-Z", tooltip: "Sắp xếp dữ liệu tăng dần" },
  { id: "sheet.data.sortDesc", category: "data", label: "Sắp xếp Z-A", tooltip: "Sắp xếp dữ liệu giảm dần" },
  { id: "sheet.data.filter", category: "data", label: "Bộ lọc (Filter)", tooltip: "Bật/tắt chế độ lọc dữ liệu cột", isToggle: true },

  // Chèn hàng/cột & Biểu đồ (Insert & Chart)
  { id: "sheet.row.insert", category: "insert", label: "Chèn hàng", tooltip: "Chèn thêm hàng mới lên trên" },
  { id: "sheet.col.insert", category: "insert", label: "Chèn cột", tooltip: "Chèn thêm cột mới sang trái" },
  { id: "sheet.chart.insert", category: "insert", label: "Biểu đồ", tooltip: "Tạo biểu đồ (cột, tròn, đường) từ vùng dữ liệu" }
];

export const SLIDES_COMMANDS = [
  // Quản lý Trang chiếu (Slide Management)
  { id: "slides.slide.new", category: "slide", label: "Trang mới", shortcut: "Ctrl+M", tooltip: "Chèn trang chiếu mới (Ctrl+M)" },
  { id: "slides.slide.duplicate", category: "slide", label: "Nhân đôi trang", tooltip: "Nhân đôi trang chiếu đang chọn" },
  { id: "slides.slide.delete", category: "slide", label: "Xóa trang", tooltip: "Xóa trang chiếu đang chọn" },
  { id: "slides.layout.apply", category: "slide", label: "Bố cục trang", tooltip: "Thay đổi kiểu bố cục trang chiếu" },

  // Chèn đối tượng (Insert Objects)
  { id: "slides.text.insert", category: "insert", label: "Hộp văn bản", tooltip: "Vẽ hộp chứa chữ mới" },
  { id: "slides.shape.insert", category: "insert", label: "Hình khối", tooltip: "Chèn hình chữ nhật, tròn, mũi tên, biểu tượng" },
  { id: "slides.image.insert", category: "insert", label: "Hình ảnh", tooltip: "Chèn ảnh minh họa từ máy tính" },

  // Hiệu ứng & Trình chiếu (Transitions & Show)
  { id: "slides.transition.apply", category: "transition", label: "Chuyển tiếp trang", tooltip: "Hiệu ứng khi chuyển từ trang này sang trang khác" },
  { id: "slides.animation.apply", category: "animation", label: "Hoạt ảnh đối tượng", tooltip: "Hiệu ứng xuất hiện cho chữ và hình ảnh" },
  { id: "slides.show.startFromBegin", category: "show", label: "Từ đầu (F5)", shortcut: "F5", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" },
  { id: "slides.show.startFromCurrent", category: "show", label: "Từ trang hiện tại", shortcut: "Shift+F5", tooltip: "Trình chiếu từ trang đang mở (Shift+F5)" }
];

/**
 * Đăng ký tất cả các lệnh chuẩn vào Command Bus
 * @param {import('./command-bus.js').CommandBus} bus 
 */
export function registerAllStandardCommands(bus) {
  for (const cmd of COMMON_COMMANDS) bus.register(cmd);
  for (const cmd of WRITER_COMMANDS) bus.register(cmd);
  for (const cmd of SHEET_COMMANDS) bus.register(cmd);
  for (const cmd of SLIDES_COMMANDS) bus.register(cmd);
}
