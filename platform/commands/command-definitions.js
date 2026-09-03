/**
 * VN Office Platform — Danh mục định nghĩa toàn bộ Command IDs & Microsoft Shortcuts
 * Tiếng Việt chuẩn hóa, tích hợp 100% phím tắt Microsoft Office & LibreOffice
 */

import { globalShortcutManager } from "./shortcut-manager.js";

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
  { id: "common.edit.pastePlain", category: "edit", label: "Dán văn bản thuần", shortcut: "Ctrl+Shift+V", icon: "paste", tooltip: "Dán văn bản không giữ định dạng (Ctrl+Shift+V)" },
  { id: "common.edit.formatPainter", category: "edit", label: "Sao chép định dạng", shortcut: "Ctrl+Shift+C", icon: "formatPainter", tooltip: "Sao chép định dạng (Ctrl+Shift+C)" },
  { id: "common.edit.selectAll", category: "edit", label: "Chọn tất cả", shortcut: "Ctrl+A", icon: "search", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
  { id: "common.edit.find", category: "edit", label: "Tìm kiếm", shortcut: "Ctrl+F", icon: "search", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
  { id: "common.edit.replace", category: "edit", label: "Thay thế", shortcut: "Ctrl+H", icon: "search", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },
  { id: "common.edit.hyperlink", category: "edit", label: "Chèn liên kết", shortcut: "Ctrl+K", icon: "fileOpen", tooltip: "Chèn siêu liên kết (Ctrl+K)" },

  // Giao diện & Hiển thị (View & Shell)
  { id: "common.view.ribbonToggle", category: "view", label: "Thu gọn Ribbon", shortcut: "Ctrl+F1", icon: "chevronDown", tooltip: "Thu gọn hoặc mở rộng thanh Ribbon (Ctrl+F1)" },
  { id: "common.view.zoomIn", category: "view", label: "Phóng to", shortcut: "Ctrl++", icon: "search", tooltip: "Tăng tỉ lệ hiển thị (Ctrl++)" },
  { id: "common.view.zoomOut", category: "view", label: "Thu nhỏ", shortcut: "Ctrl+-", icon: "search", tooltip: "Giảm tỉ lệ hiển thị (Ctrl+-)" },
  { id: "common.view.fullScreen", category: "view", label: "Toàn màn hình", shortcut: "F11", icon: "slidePlay", tooltip: "Bật/tắt chế độ toàn màn hình (F11)", isToggle: true },

  // Trợ lý AI (AI Assistant)
  { id: "ai.assistant.toggle", category: "ai", label: "Trợ lý VN AI", shortcut: "Alt+J", icon: "aiSparkle", tooltip: "Mở bảng trợ lý VN AI (Alt+J)", isToggle: true },
  { id: "ai.assistant.summarize", category: "ai", label: "Tóm tắt nhanh", icon: "aiSparkle", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
  { id: "ai.assistant.rewrite", category: "ai", label: "Viết lại trau chuốt", icon: "aiSparkle", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
  { id: "ai.assistant.grammarCheck", category: "ai", label: "Soát lỗi chính tả", shortcut: "F7", icon: "aiSparkle", tooltip: "Kiểm tra chính tả và ngữ pháp tiếng Việt (F7)" }
];

export const WRITER_COMMANDS = [
  // Định dạng ký tự (Font / Character)
  { id: "writer.text.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "writer.text.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "writer.text.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân chữ (Ctrl+U)", isToggle: true },
  { id: "writer.text.strike", category: "format", label: "Gạch ngang", icon: "strike", tooltip: "Gạch ngang chữ", isToggle: true },
  { id: "writer.font.grow", category: "format", label: "Tăng cỡ chữ", shortcut: "Ctrl+]", icon: "indentInc", tooltip: "Tăng cỡ chữ nhanh (Ctrl+])" },
  { id: "writer.font.shrink", category: "format", label: "Giảm cỡ chữ", shortcut: "Ctrl+[", icon: "indentDec", tooltip: "Giảm cỡ chữ nhanh (Ctrl+[)" },
  { id: "writer.text.subscript", category: "format", label: "Chỉ số dưới", shortcut: "Ctrl+=", icon: "strike", tooltip: "Chỉ số dưới X₂ (Ctrl+=)", isToggle: true },
  { id: "writer.text.superscript", category: "format", label: "Chỉ số trên", shortcut: "Ctrl+Shift++", icon: "strike", tooltip: "Chỉ số trên X² (Ctrl+Shift++)", isToggle: true },
  { id: "writer.text.clearFormat", category: "format", label: "Xóa định dạng", shortcut: "Ctrl+Space", icon: "clearFormat", tooltip: "Xóa toàn bộ định dạng về mặc định (Ctrl+Space)" },
  { id: "writer.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ" },
  { id: "writer.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
  { id: "writer.style.apply", category: "format", label: "Kiểu dáng", tooltip: "Áp dụng kiểu đoạn văn (Normal, Heading 1, 2, 3)" },
  { id: "writer.color.text", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu phông chữ" },
  { id: "writer.color.highlight", category: "format", label: "Màu nền chữ", icon: "colorHighlight", tooltip: "Tô màu nền văn bản" },

  // Định dạng đoạn văn (Paragraph)
  { id: "writer.para.alignLeft", category: "paragraph", label: "Căn trái", shortcut: "Ctrl+L", icon: "alignLeft", tooltip: "Căn lề trái (Ctrl+L)", isToggle: true },
  { id: "writer.para.alignCenter", category: "paragraph", label: "Căn giữa", shortcut: "Ctrl+E", icon: "alignCenter", tooltip: "Căn lề giữa (Ctrl+E)", isToggle: true },
  { id: "writer.para.alignRight", category: "paragraph", label: "Căn phải", shortcut: "Ctrl+R", icon: "alignRight", tooltip: "Căn lề phải (Ctrl+R)", isToggle: true },
  { id: "writer.para.justify", category: "paragraph", label: "Căn đều", shortcut: "Ctrl+J", icon: "alignJustify", tooltip: "Căn đều hai bên (Ctrl+J)", isToggle: true },
  { id: "writer.para.spacing1", category: "paragraph", label: "Giãn dòng 1.0", shortcut: "Ctrl+1", icon: "alignLeft", tooltip: "Khoảng cách dòng 1.0 (Ctrl+1)" },
  { id: "writer.para.spacing15", category: "paragraph", label: "Giãn dòng 1.5", shortcut: "Ctrl+5", icon: "alignLeft", tooltip: "Khoảng cách dòng 1.5 (Ctrl+5)" },
  { id: "writer.para.spacing2", category: "paragraph", label: "Giãn dòng 2.0", shortcut: "Ctrl+2", icon: "alignLeft", tooltip: "Khoảng cách dòng 2.0 (Ctrl+2)" },
  { id: "writer.list.bullet", category: "paragraph", label: "Dấu đầu dòng", icon: "listBullet", tooltip: "Tạo danh sách dấu chấm tròn", isToggle: true },
  { id: "writer.list.numbered", category: "paragraph", label: "Đánh số", icon: "listNumber", tooltip: "Tạo danh sách đánh số thứ tự", isToggle: true },
  { id: "writer.para.indentInc", category: "paragraph", label: "Thụt lề", shortcut: "Ctrl+M", icon: "indentInc", tooltip: "Tăng khoảng cách thụt lề đoạn văn (Ctrl+M)" },
  { id: "writer.para.indentDec", category: "paragraph", label: "Giảm thụt lề", shortcut: "Ctrl+Shift+M", icon: "indentDec", tooltip: "Giảm khoảng cách thụt lề đoạn văn (Ctrl+Shift+M)" },

  // Chèn (Insert)
  { id: "writer.table.insert", category: "insert", label: "Bảng biểu", icon: "table", tooltip: "Chèn bảng mới vào văn bản" },
  { id: "writer.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn hình ảnh từ máy tính" },
  { id: "writer.page.break", category: "insert", label: "Ngắt trang", shortcut: "Ctrl+Enter", icon: "pageBreak", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
  { id: "writer.header.insert", category: "insert", label: "Đầu trang", icon: "headerFooter", tooltip: "Chèn tiêu đề đầu trang (Header)" },
  { id: "writer.footer.insert", category: "insert", label: "Chân trang", icon: "headerFooter", tooltip: "Chèn tiêu đề chân trang (Footer)" },

  // Đánh giá (Review)
  { id: "writer.comment.insert", category: "review", label: "Thêm ghi chú", icon: "textBox", tooltip: "Thêm ghi chú vào đoạn văn bản đang chọn" },
  { id: "writer.trackChanges.toggle", category: "review", label: "Theo dõi thay đổi", icon: "formatPainter", tooltip: "Bật/tắt đánh dấu nội dung thêm và xóa", isToggle: true },
  { id: "writer.trackChanges.acceptAll", category: "review", label: "Chấp nhận thay đổi", icon: "redo", tooltip: "Chấp nhận toàn bộ thay đổi trong tài liệu" },
  { id: "writer.trackChanges.rejectAll", category: "review", label: "Từ chối thay đổi", icon: "close", tooltip: "Từ chối toàn bộ thay đổi trong tài liệu" },

  // Bố trí trang (Layout)
  { id: "writer.page.margins", category: "layout", label: "Căn lề", icon: "margins", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
  { id: "writer.page.orientation", category: "layout", label: "Hướng giấy", icon: "orientation", tooltip: "Khổ giấy dọc hoặc ngang" },
  { id: "writer.page.size", category: "layout", label: "Kích thước giấy", icon: "pageBreak", tooltip: "Chọn khổ A4, Letter, v.v." },

  // In ấn & Xem trước (Print & Preview)
  { id: "writer.file.printPreview", category: "file", label: "Xem trước khi in", shortcut: "Ctrl+F2", icon: "filePrint", tooltip: "Xem trước khi in (Ctrl+F2)" }
];

export const SHEET_COMMANDS = [
  // Ô và phạm vi (Cell & Range)
  { id: "sheet.cell.edit", category: "cell", label: "Chỉnh sửa ô", shortcut: "F2", icon: "textBox", tooltip: "Chỉnh sửa ô đang chọn (F2)" },
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

  // Định dạng số & Tiền tệ (Number Format Shortcuts)
  { id: "sheet.format.currencyVND", category: "number", label: "Tiền tệ VNĐ", shortcut: "Ctrl+Shift+4", icon: "currencyVND", tooltip: "Định dạng tiền tệ VNĐ (Ctrl+Shift+4 hoặc Ctrl+Shift+$)" },
  { id: "sheet.format.percent", category: "number", label: "Phần trăm", shortcut: "Ctrl+Shift+5", icon: "currencyVND", tooltip: "Định dạng phần trăm % (Ctrl+Shift+5)" },
  { id: "sheet.format.standard", category: "number", label: "Phân cách hàng nghìn", shortcut: "Ctrl+Shift+1", icon: "currencyVND", tooltip: "Dấu phẩy phân cách hàng nghìn (Ctrl+Shift+1)" },
  { id: "sheet.insert.date", category: "number", label: "Chèn ngày hiện tại", shortcut: "Ctrl+;", icon: "pageBreak", tooltip: "Chèn ngày hôm nay (Ctrl+;)" },

  // Công thức & Dữ liệu
  { id: "sheet.formula.sum", category: "formula", label: "AutoSum", shortcut: "Alt+=", icon: "autoSum", tooltip: "Hàm tính tổng tự động AutoSum (Alt+=)" },
  { id: "sheet.formula.average", category: "formula", label: "Trung bình", icon: "autoSum", tooltip: "Hàm tính trung bình cộng" },
  { id: "sheet.data.sortAsc", category: "data", label: "Sắp xếp A-Z", icon: "sortAsc", tooltip: "Sắp xếp dữ liệu tăng dần" },
  { id: "sheet.data.sortDesc", category: "data", label: "Sắp xếp Z-A", icon: "sortDesc", tooltip: "Sắp xếp dữ liệu giảm dần" },
  { id: "sheet.data.filter", category: "data", label: "Bộ lọc", shortcut: "Ctrl+Shift+L", icon: "filter", tooltip: "Bật/tắt chế độ lọc AutoFilter (Ctrl+Shift+L)", isToggle: true },
  { id: "sheet.format.conditional", category: "format", label: "Định dạng có điều kiện", icon: "colorHighlight", tooltip: "Tô nổi bật các ô theo giá trị hoặc trạng thái trống" },
  { id: "sheet.data.validation", category: "data", label: "Kiểm tra dữ liệu", icon: "table", tooltip: "Tạo danh sách lựa chọn hoặc giới hạn số trong khoảng" },
  { id: "sheet.data.pivotTable", category: "data", label: "Bảng tổng hợp", icon: "pivotTable", tooltip: "Tạo Pivot Table từ vùng dữ liệu đang chọn" },
  { id: "sheet.data.pivotRefresh", category: "data", label: "Làm mới Pivot", icon: "refreshTable", tooltip: "Tính lại Pivot Table từ dữ liệu nguồn" },
  { id: "sheet.view.freezePanes", category: "view", label: "Cố định hàng/cột", icon: "table", tooltip: "Cố định hàng 1 và cột A khi cuộn (Freeze Panes)", isToggle: true },

  // Chèn hàng/cột & Biểu đồ
  { id: "sheet.row.insert", category: "insert", label: "Chèn hàng", icon: "table", tooltip: "Chèn thêm hàng mới" },
  { id: "sheet.col.insert", category: "insert", label: "Chèn cột", icon: "table", tooltip: "Chèn thêm cột mới" },
  { id: "sheet.chart.insert", category: "insert", label: "Biểu đồ", icon: "filePrint", tooltip: "Chèn biểu đồ phân tích dữ liệu" }
];

export const SLIDES_COMMANDS = [
  // Quản lý Trang chiếu
  { id: "slides.slide.new", category: "slide", label: "Trang mới", shortcut: "Ctrl+M", icon: "slideNew", tooltip: "Chèn trang chiếu mới (Ctrl+M)" },
  { id: "slides.layout.apply", category: "slide", label: "Bố cục", icon: "slideLayout", tooltip: "Thay đổi bố cục trang chiếu (Tiêu đề, Nội dung, Hai cột, Trống)" },
  { id: "slides.layout.select", category: "slide", label: "Chọn bố cục", icon: "slideLayout", tooltip: "Mở hộp thoại chọn bố cục trang chiếu" },
  { id: "slides.slide.duplicate", category: "slide", label: "Nhân đôi", shortcut: "Ctrl+D", icon: "copy", tooltip: "Nhân đôi trang chiếu đang chọn (Ctrl+D)" },
  { id: "slides.slide.delete", category: "slide", label: "Xóa trang", shortcut: "Delete", icon: "close", tooltip: "Xóa trang chiếu đang chọn (Delete)" },

  // Chèn đối tượng
  { id: "slides.text.insert", category: "insert", label: "Hộp văn bản", icon: "textBox", tooltip: "Chèn khung văn bản mới" },
  { id: "slides.shape.insert", category: "insert", label: "Hình khối", icon: "shape", tooltip: "Chèn hình chữ nhật, tròn, mũi tên" },
  { id: "slides.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn ảnh minh họa từ máy tính" },

  // Trình chiếu & Thiết kế
  { id: "slides.master.apply", category: "design", label: "Mẫu Slide Master", icon: "template", tooltip: "Áp dụng mẫu Slide Master đồng bộ font, màu, logo cho toàn bộ trang chiếu" },
  { id: "slides.transition.apply", category: "transition", label: "Chuyển tiếp", icon: "slidePlay", tooltip: "Hiệu ứng chuyển trang chiếu (Fade, Slide, Zoom, Flip)" },
  { id: "slides.animation.apply", category: "animation", label: "Hiệu ứng đối tượng", icon: "aiSparkle", tooltip: "Thiết lập hiệu ứng xuất hiện (Fade In, Fly In, Zoom In) cho đối tượng" },
  { id: "slides.notes.toggle", category: "view", label: "Ghi chú thuyết trình", icon: "textBox", tooltip: "Bật/tắt khung ghi chú người thuyết trình dưới trang chiếu", isToggle: true },
  { id: "slides.show.startFromBegin", category: "show", label: "Từ đầu", shortcut: "F5", icon: "slidePlay", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" },
  { id: "slides.show.startFromCurrent", category: "show", label: "Từ trang này", shortcut: "Shift+F5", icon: "slidePlay", tooltip: "Trình chiếu từ trang hiện tại (Shift+F5)" },
  { id: "slides.show.presenterMode", category: "show", label: "Chế độ Presenter", shortcut: "Alt+F5", icon: "slidePlay", tooltip: "Trình chiếu chế độ Người thuyết trình kèm ghi chú và đồng hồ (Alt+F5)" }
];

export function registerAllStandardCommands(bus) {
  const all = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];
  for (const cmd of all) {
    bus.register(cmd);
    if (cmd.shortcut) {
      globalShortcutManager.bind(cmd.shortcut, cmd.id);
    }
  }
}
