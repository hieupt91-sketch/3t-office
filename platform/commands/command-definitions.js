/**
 * VN Office Platform — Danh mục định nghĩa toàn bộ Command IDs & Microsoft Shortcuts
 * Tiếng Việt chuẩn hóa, tích hợp 100% phím tắt Microsoft Office & LibreOffice
 */

import { globalShortcutManager } from "./shortcut-manager.js";
import { tCommand } from "../i18n/i18n.js";

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
  { id: "common.edit.repeat", category: "edit", label: "Lặp lại", shortcut: "F4", icon: "redo", tooltip: "Lặp lại thao tác cuối (F4)" },
  { id: "common.edit.cut", category: "edit", label: "Cắt", shortcut: "Ctrl+X", icon: "cut", tooltip: "Cắt vùng chọn vào bộ nhớ tạm (Ctrl+X)" },
  { id: "common.edit.copy", category: "edit", label: "Sao chép", shortcut: "Ctrl+C", icon: "copy", tooltip: "Sao chép vùng chọn (Ctrl+C)" },
  { id: "common.edit.paste", category: "edit", label: "Dán", shortcut: "Ctrl+V", icon: "paste", tooltip: "Dán nội dung từ bộ nhớ tạm (Ctrl+V)" },
  { id: "common.edit.pastePlain", category: "edit", label: "Dán văn bản thuần", shortcut: "Ctrl+Shift+V", icon: "paste", tooltip: "Dán văn bản không giữ định dạng (Ctrl+Shift+V)" },
  { id: "common.edit.formatPainter", category: "edit", label: "Sao chép định dạng", shortcut: "Ctrl+Shift+C", icon: "formatPainter", tooltip: "Sao chép định dạng (Ctrl+Shift+C)" },
  { id: "common.edit.selectAll", category: "edit", label: "Chọn tất cả", shortcut: "Ctrl+A", icon: "selectAll", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
  { id: "common.edit.find", category: "edit", label: "Tìm kiếm", shortcut: "Ctrl+F", icon: "search", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
  { id: "common.edit.replace", category: "edit", label: "Thay thế", shortcut: "Ctrl+H", icon: "replace", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },
  { id: "common.edit.hyperlink", category: "edit", label: "Liên kết", shortcut: "Ctrl+K", icon: "hyperlink", tooltip: "Chèn siêu liên kết (Ctrl+K)" },

  // Giao diện & Hiển thị (View & Shell)
  { id: "common.view.ribbonToggle", category: "view", label: "Thu gọn Ribbon", shortcut: "Ctrl+F1", icon: "chevronDown", tooltip: "Thu gọn hoặc mở rộng thanh Ribbon (Ctrl+F1)" },
  { id: "common.view.zoomIn", category: "view", label: "Phóng to", shortcut: "Ctrl++", icon: "search", tooltip: "Tăng tỉ lệ hiển thị (Ctrl++)" },
  { id: "common.view.zoomOut", category: "view", label: "Thu nhỏ", shortcut: "Ctrl+-", icon: "search", tooltip: "Giảm tỉ lệ hiển thị (Ctrl+-)" },
  { id: "common.view.fullScreen", category: "view", label: "Toàn màn hình", shortcut: "F11", icon: "slidePlay", tooltip: "Bật/tắt chế độ toàn màn hình (F11)", isToggle: true },
  { id: "common.view.toggleTheme", category: "view", label: "Chế độ Tối/Sáng", icon: "themeMoon", tooltip: "Chuyển đổi giao diện Tối/Sáng (Dark Mode)", isToggle: true },

  // Trợ lý AI (AI Assistant)
  { id: "ai.assistant.toggle", category: "ai", label: "Trợ lý VN AI", shortcut: "Alt+J", icon: "aiSparkle", tooltip: "Mở bảng trợ lý VN AI (Alt+J)", isToggle: true },
  { id: "ai.assistant.summarize", category: "ai", label: "Tóm tắt nhanh", icon: "aiSummarize", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
  { id: "ai.assistant.rewrite", category: "ai", label: "Viết lại", icon: "aiRewrite", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
  { id: "ai.assistant.grammarCheck", category: "ai", label: "Soát lỗi chính tả", shortcut: "F7", icon: "aiGrammar", tooltip: "Kiểm tra chính tả và ngữ pháp tiếng Việt (F7)" }
];

export const WRITER_COMMANDS = [
  { id: "writer.view.printLayout", category: "view", label: "Bố trí in", icon: "writerPrintLayout", tooltip: "Hiển thị ranh giới trang, đầu trang và chân trang", isToggle: true },
  { id: "writer.view.webLayout", category: "view", label: "Bố trí Web", icon: "writerWebLayout", tooltip: "Hiển thị nội dung liên tục theo chiều rộng cửa sổ", isToggle: true },
  { id: "writer.view.readMode", category: "view", label: "Chế độ đọc", icon: "writerReadMode", tooltip: "Ẩn ribbon và mở rộng vùng đọc; nhấn Esc để thoát", isToggle: true },
  { id: "writer.view.ruler", category: "view", label: "Thước", icon: "writerRuler", tooltip: "Ẩn hoặc hiện thước ngang theo thiết lập trang", isToggle: true },
  { id: "writer.view.gridlines", category: "view", label: "Đường lưới", icon: "writerGridlines", tooltip: "Ẩn hoặc hiện lưới căn chỉnh không in", isToggle: true },
  { id: "writer.view.zoomIn", category: "view", label: "Phóng to", icon: "zoomIn", tooltip: "Tăng tỉ lệ hiển thị tài liệu" },
  { id: "writer.view.zoomOut", category: "view", label: "Thu nhỏ", icon: "zoomOut", tooltip: "Giảm tỉ lệ hiển thị tài liệu" },
  { id: "writer.view.zoomReset", category: "view", label: "Đặt lại", icon: "zoomReset", tooltip: "Đặt lại tỉ lệ hiển thị 100%" },
  { id: "writer.view.zoom100", category: "view", label: "100%", icon: "zoom100", tooltip: "Hiển thị tài liệu ở tỉ lệ 100%" },
  { id: "writer.view.pageWidth", category: "view", label: "Chiều rộng trang", icon: "writerPageWidth", tooltip: "Thu phóng để trang vừa chiều rộng vùng làm việc" },
  { id: "writer.view.newWindow", category: "view", label: "Cửa sổ mới", icon: "writerNewWindow", tooltip: "Mở tài liệu trong một cửa sổ trình duyệt mới" },
  { id: "writer.nav.docStart", category: "nav", label: "Đầu tài liệu", shortcut: "Ctrl+Home", icon: "pageBreak", tooltip: "Đến đầu tài liệu (Ctrl+Home)" },
  { id: "writer.nav.docEnd", category: "nav", label: "Cuối tài liệu", shortcut: "Ctrl+End", icon: "pageBreak", tooltip: "Đến cuối tài liệu (Ctrl+End)" },
  // Định dạng ký tự (Font / Character)
  { id: "writer.text.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "writer.text.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "writer.text.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân chữ (Ctrl+U)", isToggle: true },
  { id: "writer.text.strike", category: "format", label: "Gạch ngang", icon: "strike", tooltip: "Gạch ngang chữ", isToggle: true },
  { id: "writer.font.grow", category: "format", label: "Tăng cỡ chữ", shortcut: "Ctrl+Shift+>", icon: "fontGrow", tooltip: "Tăng cỡ chữ nhanh (Ctrl+Shift+>)" },
  { id: "writer.font.shrink", category: "format", label: "Giảm cỡ chữ", shortcut: "Ctrl+Shift+<", icon: "fontShrink", tooltip: "Giảm cỡ chữ nhanh (Ctrl+Shift+<)" },
  { id: "writer.text.subscript", category: "format", label: "Chỉ số dưới", shortcut: "Ctrl+=", icon: "subscript", tooltip: "Chỉ số dưới X₂ (Ctrl+=)", isToggle: true },
  { id: "writer.text.superscript", category: "format", label: "Chỉ số trên", shortcut: "Ctrl+Shift++", icon: "superscript", tooltip: "Chỉ số trên X² (Ctrl+Shift++)", isToggle: true },
  { id: "writer.text.clearFormat", category: "format", label: "Xóa định dạng", shortcut: "Ctrl+Space", icon: "clearFormat", tooltip: "Xóa toàn bộ định dạng về mặc định (Ctrl+Space)" },
  { id: "writer.style.normal", category: "format", label: "Kiểu Thường", shortcut: "Ctrl+Shift+N", icon: "clearFormat", tooltip: "Áp dụng kiểu Normal chuẩn (Ctrl+Shift+N)" },
  { id: "writer.text.changeCase", category: "format", label: "Đổi chữ hoa/thường", shortcut: "Shift+F3", icon: "changeCase", tooltip: "Chuyển đổi chữ hoa / thường / Tiêu đề (Shift+F3)" },
  { id: "writer.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ" },
  { id: "writer.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
  { id: "writer.style.apply", category: "format", label: "Kiểu dáng", tooltip: "Áp dụng kiểu đoạn văn (Normal, Heading 1, 2, 3, Quote, Emphasis)" },
  { id: "writer.style.gallery", category: "format", label: "Thư viện kiểu", icon: "styleGallery", tooltip: "Mở thư viện kiểu định dạng trực quan (Styles Gallery)" },
  { id: "writer.design.themeGallery", category: "format", label: "Chủ đề văn bản", icon: "themeGallery", tooltip: "Mở thư viện chủ đề định dạng tài liệu (Document Themes)" },
  { id: "writer.color.text", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu phông chữ" },
  { id: "writer.color.highlight", category: "format", label: "Màu nền chữ", icon: "colorHighlight", tooltip: "Tô màu nền văn bản" },

  // Định dạng đoạn văn (Paragraph)
  { id: "writer.para.alignLeft", category: "paragraph", label: "Căn trái", shortcut: "Ctrl+L", icon: "alignLeft", tooltip: "Căn lề trái (Ctrl+L)", isToggle: true },
  { id: "writer.para.alignCenter", category: "paragraph", label: "Căn giữa", shortcut: "Ctrl+E", icon: "alignCenter", tooltip: "Căn lề giữa (Ctrl+E)", isToggle: true },
  { id: "writer.para.alignRight", category: "paragraph", label: "Căn phải", shortcut: "Ctrl+R", icon: "alignRight", tooltip: "Căn lề phải (Ctrl+R)", isToggle: true },
  { id: "writer.para.justify", category: "paragraph", label: "Căn đều", shortcut: "Ctrl+J", icon: "alignJustify", tooltip: "Căn đều hai bên (Ctrl+J)", isToggle: true },
  { id: "writer.para.spacing1", category: "paragraph", label: "Giãn dòng 1.0", shortcut: "Ctrl+1", icon: "lineSpacing1", tooltip: "Khoảng cách dòng 1.0 (Ctrl+1)" },
  { id: "writer.para.spacing15", category: "paragraph", label: "Giãn dòng 1.5", shortcut: "Ctrl+5", icon: "lineSpacing15", tooltip: "Khoảng cách dòng 1.5 (Ctrl+5)" },
  { id: "writer.para.spacing2", category: "paragraph", label: "Giãn dòng 2.0", shortcut: "Ctrl+2", icon: "lineSpacing2", tooltip: "Khoảng cách dòng 2.0 (Ctrl+2)" },
  { id: "writer.para.spacingBefore", category: "paragraph", label: "Khoảng trước đoạn", icon: "spacingBefore", tooltip: "Khoảng cách trước đoạn văn (đơn vị pt)" },
  { id: "writer.para.spacingAfter", category: "paragraph", label: "Khoảng sau đoạn", icon: "spacingAfter", tooltip: "Khoảng cách sau đoạn văn (đơn vị pt)" },
  { id: "writer.list.bullet", category: "paragraph", label: "Dấu đầu dòng", icon: "listBullet", tooltip: "Tạo danh sách dấu chấm tròn", isToggle: true },
  { id: "writer.list.numbered", category: "paragraph", label: "Đánh số", icon: "listNumber", tooltip: "Tạo danh sách đánh số thứ tự", isToggle: true },
  { id: "writer.para.multilevelList", category: "paragraph", label: "Danh sách đa cấp", icon: "listMultilevel", tooltip: "Danh sách nhiều cấp (1. / 1.1. / 1.1.1., 1. / a. / i., Điều / Khoản / Điểm)" },
  { id: "writer.para.indentInc", category: "paragraph", label: "Thụt lề", shortcut: "Ctrl+M", icon: "indentInc", tooltip: "Tăng khoảng cách thụt lề đoạn văn (Ctrl+M)" },
  { id: "writer.para.indentDec", category: "paragraph", label: "Giảm thụt lề", shortcut: "Ctrl+Shift+M", icon: "indentDec", tooltip: "Giảm khoảng cách thụt lề đoạn văn (Ctrl+Shift+M)" },
  { id: "writer.para.moveUp", category: "paragraph", label: "Di chuyển đoạn lên", shortcut: "Alt+Shift+Up", icon: "indentInc", tooltip: "Di chuyển đoạn văn lên trên (Alt+Shift+Up)" },
  { id: "writer.para.moveDown", category: "paragraph", label: "Di chuyển đoạn xuống", shortcut: "Alt+Shift+Down", icon: "indentDec", tooltip: "Di chuyển đoạn văn xuống dưới (Alt+Shift+Down)" },
  { id: "writer.para.sort", category: "paragraph", label: "Sắp xếp", icon: "paragraphSort", tooltip: "Sắp xếp danh sách hoặc đoạn văn theo A–Z" },
  { id: "writer.para.showFormattingMarks", category: "paragraph", label: "Hiện/ẩn ký tự định dạng", icon: "formattingMarks", tooltip: "Hiện hoặc ẩn dấu đoạn và xuống dòng", isToggle: true },
  { id: "writer.para.shading", category: "paragraph", label: "Tô nền đoạn", icon: "paragraphShading", tooltip: "Tô màu nền đoạn văn hoặc ô bảng" },
  { id: "writer.para.borders", category: "paragraph", label: "Viền đoạn", icon: "paragraphBorders", tooltip: "Chọn viền đoạn văn hoặc ô bảng" },

  // Chèn (Insert)
  { id: "writer.table.insert", category: "insert", label: "Bảng biểu", icon: "table", tooltip: "Chèn bảng mới vào văn bản" },
  { id: "writer.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn hình ảnh từ máy tính" },
  { id: "writer.shape.insert", category: "insert", label: "Hình khối", icon: "shape", tooltip: "Chèn hình khối cơ bản (chữ nhật, hình tròn, mũi tên, đường thẳng)" },
  { id: "writer.diagram.insert", category: "insert", label: "Sơ đồ", icon: "diagram", tooltip: "Chèn sơ đồ quy trình, chu trình hoặc phân cấp" },
  { id: "writer.chart.insert", category: "insert", label: "Biểu đồ", icon: "chart", tooltip: "Chèn biểu đồ minh họa dữ liệu" },
  { id: "writer.page.break", category: "insert", label: "Ngắt trang", shortcut: "Ctrl+Enter", icon: "pageBreak", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
  { id: "writer.header.insert", category: "insert", label: "Đầu trang", icon: "header", tooltip: "Chèn tiêu đề đầu trang (Header)" },
  { id: "writer.footer.insert", category: "insert", label: "Chân trang", icon: "footer", tooltip: "Chèn tiêu đề chân trang (Footer)" },
  { id: "writer.insert.textbox", category: "insert", label: "Hộp văn bản", icon: "textBox", tooltip: "Chèn khung văn bản độc lập, kéo-thả được" },
  { id: "writer.insert.wordart", category: "insert", label: "Chữ nghệ thuật", icon: "wordArt", tooltip: "Chèn chữ nghệ thuật với viền, đổ bóng hoặc gradient tại vị trí con trỏ" },
  { id: "writer.format.dropCap", category: "insert", label: "Chữ đầu đoạn", icon: "dropCap", tooltip: "Phóng to chữ cái đầu đoạn văn (Drop Cap)" },
  { id: "writer.insert.dateTime", category: "insert", label: "Ngày & Giờ", icon: "dateTime", tooltip: "Chèn ngày giờ hiện tại tại vị trí con trỏ" },
  { id: "writer.insert.equation", category: "insert", label: "Công thức", icon: "equation", tooltip: "Chèn hộp công thức toán học dạng chữ (bản rút gọn)" },
  { id: "writer.insert.symbol", category: "insert", label: "Ký hiệu", icon: "symbol", tooltip: "Chèn ký tự đặc biệt tại vị trí con trỏ" },
  { id: "writer.insert.bookmark", category: "insert", label: "Đánh dấu", icon: "bookmark", tooltip: "Đánh dấu vị trí trong tài liệu để nhảy tới sau" },
  { id: "writer.insert.crossReference", category: "insert", label: "Tham chiếu chéo", icon: "crossReference", tooltip: "Chèn liên kết nội bộ tới tiêu đề hoặc đánh dấu" },

  // Đánh giá (Review)
  { id: "writer.comment.insert", category: "review", label: "Thêm ghi chú", shortcut: "Ctrl+Alt+M", icon: "comment", tooltip: "Thêm ghi chú vào đoạn văn bản đang chọn (Ctrl+Alt+M)" },
  { id: "writer.review.commentPrevious", category: "review", label: "Nhận xét trước", icon: "commentPrevious", tooltip: "Nhảy tới nhận xét trước đó" },
  { id: "writer.review.commentNext", category: "review", label: "Nhận xét sau", icon: "commentNext", tooltip: "Nhảy tới nhận xét tiếp theo" },
  { id: "writer.review.commentDelete", category: "review", label: "Xóa nhận xét", icon: "commentDelete", tooltip: "Xóa nhận xét đang chọn" },
  { id: "writer.review.commentResolve", category: "review", label: "Đã xử lý", icon: "commentResolve", tooltip: "Đánh dấu hoặc mở lại nhận xét đang chọn" },
  { id: "writer.trackChanges.toggle", category: "review", label: "Theo dõi thay đổi", shortcut: "Ctrl+Shift+E", icon: "trackChanges", tooltip: "Bật/tắt đánh dấu nội dung thêm và xóa (Ctrl+Shift+E)", isToggle: true },
  { id: "writer.trackChanges.previous", category: "review", label: "Thay đổi trước", icon: "trackChangePrev", tooltip: "Nhảy tới thay đổi trước đó" },
  { id: "writer.trackChanges.next", category: "review", label: "Thay đổi sau", icon: "trackChangeNext", tooltip: "Nhảy tới thay đổi tiếp theo" },
  { id: "writer.trackChanges.acceptOne", category: "review", label: "Chấp nhận một", icon: "trackChangeAccept", tooltip: "Chấp nhận thay đổi đang chọn" },
  { id: "writer.trackChanges.rejectOne", category: "review", label: "Từ chối một", icon: "trackChangeReject", tooltip: "Từ chối thay đổi đang chọn" },
  { id: "writer.trackChanges.acceptAll", category: "review", label: "Chấp nhận thay đổi", icon: "trackChangeAcceptAll", tooltip: "Chấp nhận toàn bộ thay đổi trong tài liệu" },
  { id: "writer.trackChanges.rejectAll", category: "review", label: "Từ chối thay đổi", icon: "trackChangeRejectAll", tooltip: "Từ chối toàn bộ thay đổi trong tài liệu" },
  { id: "writer.review.wordCount", category: "review", label: "Đếm từ", icon: "wordCount", tooltip: "Xem số từ, ký tự, đoạn văn và dòng của tài liệu" },
  { id: "writer.help.open", category: "help", label: "Trợ giúp", shortcut: "F1", icon: "help", tooltip: "Mở hướng dẫn sử dụng (F1)", isToggle: true },

  // Bố trí trang (Layout)
  { id: "writer.page.margins", category: "layout", label: "Căn lề", icon: "margins", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
  { id: "writer.page.orientation", category: "layout", label: "Hướng giấy", icon: "orientation", tooltip: "Khổ giấy dọc hoặc ngang" },
  { id: "writer.page.size", category: "layout", label: "Khổ giấy", icon: "pageSize", tooltip: "Chọn khổ A4, Letter, v.v." },
  { id: "writer.page.columns", category: "layout", label: "Cột", icon: "pageColumns", tooltip: "Chia văn bản thành nhiều cột (1, 2, 3 cột hoặc tùy chỉnh)" },
  { id: "writer.page.columns1", category: "layout", label: "1 cột", icon: "columnsOne", tooltip: "Định dạng toàn bộ văn bản 1 cột (Normal mặc định)" },
  { id: "writer.page.columns2", category: "layout", label: "2 cột", icon: "columnsTwo", tooltip: "Chia nội dung văn bản thành 2 cột đều nhau" },
  { id: "writer.page.columns3", category: "layout", label: "3 cột", icon: "columnsThree", tooltip: "Chia nội dung văn bản thành 3 cột đều nhau" },
  { id: "writer.break.column", category: "layout", label: "Ngắt cột", icon: "columnBreak", tooltip: "Chuyển nội dung sau con trỏ sang cột kế tiếp" },
  { id: "writer.section.nextPage", category: "layout", label: "Ngắt mục — Trang kế tiếp", icon: "sectionBreak", tooltip: "Bắt đầu mục mới trên trang kế tiếp với Page Setup riêng" },
  { id: "writer.section.continuous", category: "layout", label: "Ngắt mục — Liên tục", icon: "sectionContinuous", tooltip: "Bắt đầu mục mới tại vị trí hiện tại với Page Setup riêng" },
  { id: "writer.section.evenPage", category: "layout", label: "Ngắt mục — Trang chẵn", icon: "sectionEvenPage", tooltip: "Bắt đầu mục mới trên trang chẵn kế tiếp" },
  { id: "writer.section.oddPage", category: "layout", label: "Ngắt mục — Trang lẻ", icon: "sectionOddPage", tooltip: "Bắt đầu mục mới trên trang lẻ kế tiếp" },
  { id: "writer.layout.lineNumbers", category: "layout", label: "Danh số dòng", icon: "lineNumbers", tooltip: "Bật danh số dòng cho file Word/LibreOffice (Không có, Liên tục, Mỗi trang, Mỗi mục)" },
  { id: "writer.page.watermark", category: "layout", label: "Hình mờ", icon: "pageWatermark", tooltip: "Thiết lập hoặc xóa hình mờ văn bản (Dự thảo, Mật, Khẩn...)" },
  { id: "writer.page.color", category: "layout", label: "Màu trang", icon: "pageColor", tooltip: "Đặt màu nền đặc cho trang tài liệu" },
  { id: "writer.page.border", category: "layout", label: "Viền trang", icon: "pageBorder", tooltip: "Thiết lập viền bao quanh trang tài liệu" },

  // In ấn & Xem trước (Print & Preview)
  { id: "writer.file.printPreview", category: "file", label: "Xem trước khi in", shortcut: "Ctrl+F2", icon: "printPreview", tooltip: "Xem trước khi in (Ctrl+F2)" },

  // Tham chiếu & Chú thích (References, TOC, Footnotes/Endnotes)
  { id: "writer.reference.tocInsert", category: "reference", label: "Mục lục tự động", icon: "tocInsert", tooltip: "Chèn mục lục tự động từ các tiêu đề Heading" },
  { id: "writer.reference.tocUpdate", category: "reference", label: "Cập nhật mục lục", icon: "tocUpdate", tooltip: "Cập nhật lại mục lục tài liệu" },
  { id: "writer.reference.footnoteInsert", category: "reference", label: "Chú thích trang", shortcut: "Ctrl+Alt+F", icon: "footnoteInsert", tooltip: "Chèn chú thích cuối trang (Footnote) (Ctrl+Alt+F)" },
  { id: "writer.reference.endnoteInsert", category: "reference", label: "Chú thích cuối", shortcut: "Ctrl+Alt+D", icon: "endnoteInsert", tooltip: "Chèn chú thích cuối tài liệu (Endnote) (Ctrl+Alt+D)" },
  { id: "writer.reference.citationStyle", category: "reference", label: "Kiểu trích dẫn", icon: "citationStyle", tooltip: "Chọn kiểu trích dẫn APA hoặc MLA" },
  { id: "writer.reference.citationInsert", category: "reference", label: "Chèn trích dẫn", icon: "citationInsert", tooltip: "Chèn trích dẫn từ danh sách nguồn" },
  { id: "writer.reference.sourcesManage", category: "reference", label: "Quản lý nguồn", icon: "sourcesManage", tooltip: "Thêm, sửa hoặc xóa nguồn tài liệu" },
  { id: "writer.reference.bibliographyInsert", category: "reference", label: "Thư mục tài liệu", icon: "bibliographyInsert", tooltip: "Chèn danh mục tự động từ các nguồn đã trích dẫn" },
  { id: "writer.reference.captionInsert", category: "reference", label: "Chèn chú thích ảnh", icon: "captionInsert", tooltip: "Chèn chú thích tự đánh số cho hình ảnh, bảng hoặc phương trình" },
  { id: "writer.reference.tofInsert", category: "reference", label: "Danh mục hình ảnh", icon: "tofInsert", tooltip: "Chèn danh mục hình ảnh/bảng tự động từ các chú thích đã chèn" },
  { id: "writer.reference.tofUpdate", category: "reference", label: "Cập nhật danh mục", icon: "tofUpdate", tooltip: "Cập nhật lại danh mục hình ảnh/bảng từ các chú thích hiện có" },

  // Trộn thư (Mail Merge)
  { id: "writer.mailMerge.open", category: "mailmerge", label: "Nguồn dữ liệu", icon: "mailMerge", tooltip: "Mở bảng nhập dữ liệu trộn thư (CSV)" },
  { id: "writer.mailMerge.insertField", category: "mailmerge", label: "Chèn trường", icon: "mergeInsertField", tooltip: "Chèn trường trộn thư tại vị trí con trỏ" },
  { id: "writer.mailMerge.preview", category: "mailmerge", label: "Xem trước bản ghi", icon: "mergePreview", tooltip: "Bật/tắt xem trước bản ghi trộn thư", isToggle: true },
  { id: "writer.mailMerge.prevRecord", category: "mailmerge", label: "Bản ghi trước", icon: "mergePrev", tooltip: "Chuyển tới bản ghi trước" },
  { id: "writer.mailMerge.nextRecord", category: "mailmerge", label: "Bản ghi sau", icon: "mergeNext", tooltip: "Chuyển tới bản ghi tiếp theo" },
  { id: "writer.mailMerge.finish", category: "mailmerge", label: "Hoàn tất trộn", icon: "mergeFinish", tooltip: "Hoàn tất trộn và tạo tài liệu kết quả cho toàn bộ bản ghi" },
  { id: "writer.mailings.envelopes", category: "mailmerge", label: "Phong bì", icon: "envelope", tooltip: "Tạo trang phong bì với địa chỉ người nhận và người gửi" },
  { id: "writer.mailings.labels", category: "mailmerge", label: "Nhãn", icon: "labels", tooltip: "Tạo trang nhãn — một nội dung hoặc hàng loạt từ Trộn thư" }
];

export const SHEET_COMMANDS = [
  { id: "sheet.edit.pasteSpecial", category: "edit", label: "Dán đặc biệt", shortcut: "Ctrl+Alt+V", icon: "paste", tooltip: "Chọn cách dán giá trị, công thức, định dạng hoặc chuyển vị (Ctrl+Alt+V)" },
  { id: "sheet.edit.formatPainter", category: "edit", label: "Sao chép định dạng", icon: "formatPainter", tooltip: "Sao chép định dạng ô nguồn sang ô hoặc vùng đích. Nhấp đúp để khóa và áp dụng nhiều lần. Esc để hủy.", isToggle: true },
  { id: "sheet.nav.home", category: "nav", label: "Ô đầu tiên", shortcut: "Ctrl+Home", icon: "table", tooltip: "Đến ô A1 của trang tính (Ctrl+Home)" },
  { id: "sheet.nav.end", category: "nav", label: "Ô cuối có dữ liệu", shortcut: "Ctrl+End", icon: "table", tooltip: "Đến ô cuối cùng có dữ liệu (Ctrl+End)" },
  // Ô và phạm vi (Cell & Range)
  { id: "sheet.cell.edit", category: "cell", label: "Chỉnh sửa ô", shortcut: "F2", icon: "textBox", tooltip: "Chỉnh sửa ô đang chọn (F2)" },
  { id: "sheet.select.column", category: "cell", label: "Chọn cột", shortcut: "Ctrl+Space", icon: "table", tooltip: "Chọn toàn bộ cột hiện tại (Ctrl+Space)" },
  { id: "sheet.select.row", category: "cell", label: "Chọn hàng", shortcut: "Shift+Space", icon: "table", tooltip: "Chọn toàn bộ hàng hiện tại (Shift+Space)" },
  { id: "sheet.cell.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "sheet.cell.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "sheet.cell.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân (Ctrl+U)", isToggle: true },
  { id: "sheet.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ cho ô" },
  { id: "sheet.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ cho ô" },
  { id: "sheet.font.grow", category: "format", label: "Tăng cỡ chữ", icon: "fontGrow", tooltip: "Tăng cỡ chữ theo nấc chuẩn" },
  { id: "sheet.font.shrink", category: "format", label: "Giảm cỡ chữ", icon: "fontShrink", tooltip: "Giảm cỡ chữ theo nấc chuẩn" },
  { id: "sheet.cell.alignLeft", category: "format", label: "Căn trái", icon: "alignLeft", tooltip: "Căn lề trái", isToggle: true },
  { id: "sheet.cell.alignCenter", category: "format", label: "Căn giữa", icon: "alignCenter", tooltip: "Căn lề giữa", isToggle: true },
  { id: "sheet.cell.alignRight", category: "format", label: "Căn phải", icon: "alignRight", tooltip: "Căn lề phải", isToggle: true },
  { id: "sheet.cell.alignTop", category: "format", label: "Căn trên", icon: "alignTop", tooltip: "Căn nội dung lên trên ô", isToggle: true },
  { id: "sheet.cell.alignMiddle", category: "format", label: "Căn giữa dọc", icon: "alignMiddle", tooltip: "Căn nội dung vào giữa ô theo chiều dọc", isToggle: true },
  { id: "sheet.cell.alignBottom", category: "format", label: "Căn dưới", icon: "alignBottom", tooltip: "Căn nội dung xuống dưới ô", isToggle: true },
  { id: "sheet.cell.wrapText", category: "format", label: "Ngắt dòng tự động", icon: "wrapText", tooltip: "Tự động xuống dòng theo độ rộng cột", isToggle: true },
  { id: "sheet.cell.orientation", category: "format", label: "Hướng chữ", icon: "textOrientation", tooltip: "Xoay chữ trong ô (0°, 45°, -45°, 90°, -90° hoặc dọc từ dưới lên)" },
  { id: "sheet.cell.indentIncrease", category: "format", label: "Tăng thụt lề", icon: "indentInc", tooltip: "Tăng thụt lề nội dung ô" },
  { id: "sheet.cell.indentDecrease", category: "format", label: "Giảm thụt lề", icon: "indentDec", tooltip: "Giảm thụt lề nội dung ô" },
  { id: "sheet.cell.mergeCenter", category: "cell", label: "Trộn & căn giữa", icon: "mergeCells", tooltip: "Trộn vùng chọn thành một ô và căn giữa" },
  { id: "sheet.cell.mergeAcross", category: "cell", label: "Trộn theo hàng", icon: "mergeAcross", tooltip: "Trộn riêng từng hàng trong vùng chọn" },
  { id: "sheet.cell.mergeCells", category: "cell", label: "Trộn ô", icon: "mergeCells", tooltip: "Trộn vùng chọn và giữ căn chỉnh hiện tại" },
  { id: "sheet.cell.unmerge", category: "cell", label: "Tách ô", icon: "unmergeCells", tooltip: "Tách các ô đã trộn" },
  { id: "sheet.cell.borders", category: "cell", label: "Viền ô", icon: "cellBorders", tooltip: "Kẻ đường viền khung ô" },
  { id: "sheet.cell.fillColor", category: "format", label: "Màu nền", icon: "colorHighlight", tooltip: "Tô màu nền ô tính" },
  { id: "sheet.cell.textColor", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu chữ trong ô" },

  // Định dạng số & Tiền tệ (Number Format Shortcuts)
  { id: "sheet.format.cellsDialog", category: "number", label: "Định dạng ô...", shortcut: "Ctrl+1", icon: "formatCells", tooltip: "Mở hộp thoại định dạng ô (Ctrl+1)" },
  { id: "sheet.format.currencyVND", category: "number", label: "Tiền tệ VNĐ", shortcut: "Ctrl+Shift+4", icon: "currencyVND", tooltip: "Định dạng tiền tệ VNĐ (Ctrl+Shift+4 hoặc Ctrl+Shift+$)" },
  { id: "sheet.format.percent", category: "number", label: "Phần trăm", shortcut: "Ctrl+Shift+5", icon: "percentFormat", tooltip: "Định dạng phần trăm % (Ctrl+Shift+5)" },
  { id: "sheet.format.standard", category: "number", label: "Phân cách hàng nghìn", shortcut: "Ctrl+Shift+1", icon: "commaStyle", tooltip: "Dấu phẩy phân cách hàng nghìn (Ctrl+Shift+1)" },
  { id: "sheet.format.quickCategory", category: "number", label: "Định dạng số", tooltip: "Chọn nhanh loại định dạng số" },
  { id: "sheet.format.increaseDecimal", category: "number", label: "Tăng số thập phân", icon: "increaseDecimal", tooltip: "Hiển thị thêm một chữ số thập phân" },
  { id: "sheet.format.decreaseDecimal", category: "number", label: "Giảm số thập phân", icon: "decreaseDecimal", tooltip: "Hiển thị bớt một chữ số thập phân" },
  { id: "sheet.insert.date", category: "number", label: "Chèn ngày hiện tại", shortcut: "Ctrl+;", icon: "pageBreak", tooltip: "Chèn ngày hôm nay (Ctrl+;)" },
  { id: "sheet.insert.time", category: "number", label: "Chèn giờ hiện tại", shortcut: "Ctrl+Shift+;", icon: "pageBreak", tooltip: "Chèn giờ hiện tại (Ctrl+Shift+;)" },

  // Công thức & Dữ liệu
  { id: "sheet.formula.insertFunction", category: "formula", label: "Chèn hàm", shortcut: "Shift+F3", icon: "insertFunction", tooltip: "Mở hộp thoại Chèn hàm fx (Shift+F3)" },
  { id: "sheet.formula.sum", category: "formula", label: "AutoSum", shortcut: "Alt+=", icon: "autoSum", tooltip: "Hàm tính tổng tự động AutoSum (Alt+=)" },
  { id: "sheet.formula.average", category: "formula", label: "Trung bình", icon: "average", tooltip: "Hàm tính trung bình cộng (AVERAGE)" },
  { id: "sheet.formula.countNumbers", category: "formula", label: "Đếm số", icon: "countNumbers", tooltip: "Hàm đếm các ô chứa số (COUNT)" },
  { id: "sheet.formula.max", category: "formula", label: "Lớn nhất", icon: "maxFunction", tooltip: "Hàm tìm giá trị lớn nhất (MAX)" },
  { id: "sheet.formula.min", category: "formula", label: "Nhỏ nhất", icon: "minFunction", tooltip: "Hàm tìm giá trị nhỏ nhất (MIN)" },
  { id: "sheet.formula.categoryFinancial", category: "formula", label: "Tài chính", icon: "categoryFinancial", tooltip: "Duyệt danh sách các hàm tài chính (PMT, FV, PV, NPV, IRR...)" },
  { id: "sheet.formula.categoryLogical", category: "formula", label: "Logic", icon: "categoryLogical", tooltip: "Duyệt danh sách các hàm logic (IF, AND, OR...)" },
  { id: "sheet.formula.categoryText", category: "formula", label: "Văn bản", icon: "categoryText", tooltip: "Duyệt danh sách các hàm xử lý văn bản (CONCAT, LEN, MID...)" },
  { id: "sheet.formula.categoryDateTime", category: "formula", label: "Ngày & Giờ", icon: "categoryDateTime", tooltip: "Duyệt danh sách các hàm ngày tháng (TODAY, NOW, DATE...)" },
  { id: "sheet.formula.categoryLookup", category: "formula", label: "Tra cứu & Tham chiếu", icon: "categoryLookup", tooltip: "Duyệt danh sách các hàm tra cứu (VLOOKUP, INDEX, MATCH...)" },
  { id: "sheet.formula.categoryMath", category: "formula", label: "Toán & Lượng giác", icon: "categoryMath", tooltip: "Duyệt danh sách các hàm toán học (ROUND, SUMPRODUCT...)" },
  { id: "sheet.formula.categoryMore", category: "formula", label: "Thêm hàm", icon: "categoryMore", tooltip: "Duyệt các hàm thống kê và nâng cao khác" },
  { id: "sheet.formula.nameManager", category: "formula", label: "Quản lý tên", icon: "nameManager", tooltip: "Tạo, sửa và xóa vùng được đặt tên" },
  { id: "sheet.formula.defineName", category: "formula", label: "Đặt tên vùng", icon: "defineName", tooltip: "Đặt tên cho ô hoặc vùng ô đang chọn" },
  { id: "sheet.formula.useInFormula", category: "formula", label: "Dùng trong công thức", icon: "useInFormula", tooltip: "Chèn tên đã đặt vào công thức đang soạn" },
  { id: "sheet.formula.createFromSelection", category: "formula", label: "Tạo từ vùng chọn", shortcut: "Ctrl+Shift+F3", icon: "createFromSelection", tooltip: "Tự động tạo tên từ tiêu đề hàng hoặc cột (Ctrl+Shift+F3)" },
  { id: "sheet.formula.tracePrecedents", category: "formula", label: "Tìm ô tiền lệ", icon: "tracePrecedents", tooltip: "Vẽ mũi tên chỉ đến các ô cung cấp giá trị cho công thức này" },
  { id: "sheet.formula.traceDependents", category: "formula", label: "Tìm ô phụ thuộc", icon: "traceDependents", tooltip: "Vẽ mũi tên chỉ đến các ô phụ thuộc vào giá trị ô này" },
  { id: "sheet.formula.removeArrows", category: "formula", label: "Xóa mũi tên", icon: "removeArrows", tooltip: "Xóa toàn bộ mũi tên kiểm tra công thức" },
  { id: "sheet.formula.showFormulas", category: "formula", label: "Hiện công thức", icon: "showFormulas", tooltip: "Hiển thị công thức thay vì kết quả trong toàn bộ sheet (Ctrl+`)", isToggle: true },
  { id: "sheet.formula.errorChecking", category: "formula", label: "Kiểm tra lỗi", icon: "errorChecking", tooltip: "Quét và kiểm tra các ô có công thức bị lỗi trong bảng tính" },
  { id: "sheet.formula.watchWindow", category: "formula", label: "Cửa sổ theo dõi", icon: "watchWindow", tooltip: "Mở cửa sổ theo dõi giá trị các ô quan trọng khi cuộn bảng tính" },
  { id: "sheet.formula.evaluateFormula", category: "formula", label: "Ước lượng công thức", icon: "evaluateFormula", tooltip: "Ước lượng từng phần của công thức đang chọn để xem giá trị trung gian" },
  { id: "sheet.calc.calculationOptions", category: "formula", label: "Tùy chọn tính toán", icon: "calculationOptions", tooltip: "Chọn chế độ tính toán tự động hoặc thủ công" },
  { id: "sheet.calc.modeAutomatic", category: "formula", label: "Tự động", icon: "calculationOptions", tooltip: "Tự động tính lại công thức khi dữ liệu thay đổi" },
  { id: "sheet.calc.modeManual", category: "formula", label: "Thủ công", icon: "calculationOptions", tooltip: "Chỉ tính lại công thức khi nhấn Tính lại (F9)" },
  { id: "sheet.calc.calculateSheet", category: "formula", label: "Tính trang hiện tại", shortcut: "Shift+F9", icon: "calculateSheet", tooltip: "Tính lại công thức trong trang tính hiện tại (Shift+F9)" },
  { id: "sheet.formula.arrayEnter", category: "formula", label: "Nhập công thức mảng", shortcut: "Ctrl+Shift+Enter", icon: "autoSum", tooltip: "Nhập công thức mảng cho vùng đã chọn (Ctrl+Shift+Enter)" },
  { id: "sheet.formula.recalculate", category: "formula", label: "Tính lại toàn bộ", shortcut: "F9", icon: "refreshTable", tooltip: "Tính lại toàn bộ công thức bảng tính (F9)" },
  { id: "sheet.data.sortAsc", category: "data", label: "Sắp xếp A-Z", icon: "sortAsc", tooltip: "Sắp xếp dữ liệu tăng dần" },
  { id: "sheet.data.sortDesc", category: "data", label: "Sắp xếp Z-A", icon: "sortDesc", tooltip: "Sắp xếp dữ liệu giảm dần" },
  { id: "sheet.data.filter", category: "data", label: "Bộ lọc", shortcut: "Ctrl+Shift+L", icon: "filter", tooltip: "Bật/tắt chế độ lọc AutoFilter (Ctrl+Shift+L)", isToggle: true },
  { id: "sheet.data.customSort", category: "data", label: "Sắp xếp tùy chỉnh", icon: "sortCustom", tooltip: "Sắp xếp theo nhiều cột (Sort by Column, Then by Column...)" },
  { id: "sheet.format.conditional", category: "format", label: "Định dạng có điều kiện", icon: "conditionalFormat", tooltip: "Tô nổi bật các ô theo giá trị hoặc trạng thái trống" },
  { id: "sheet.data.validation", category: "data", label: "Kiểm tra dữ liệu", icon: "dataValidation", tooltip: "Tạo danh sách lựa chọn hoặc giới hạn số trong khoảng" },
  { id: "sheet.data.textToColumns", category: "data", label: "Tách văn bản", icon: "table", tooltip: "Tách một cột theo dấu phân cách hoặc độ rộng cố định" },
  { id: "sheet.data.flashFill", category: "data", label: "Điền nhanh", icon: "autoSum", tooltip: "Điền theo mẫu từ ví dụ ở cột kế bên" },
  { id: "sheet.data.removeDuplicates", category: "data", label: "Xóa trùng lặp", icon: "clearFormat", tooltip: "Xóa hàng trùng theo các cột được chọn" },
  { id: "sheet.data.consolidate", category: "data", label: "Hợp nhất dữ liệu", icon: "consolidate", tooltip: "Gộp dữ liệu từ nhiều vùng hoặc trang tính thành một bảng tổng hợp" },
  { id: "sheet.data.group", category: "data", label: "Nhóm", icon: "indentInc", tooltip: "Nhóm các hàng hoặc cột liên tiếp đang chọn" },
  { id: "sheet.data.ungroup", category: "data", label: "Bỏ nhóm", icon: "indentDec", tooltip: "Bỏ nhóm hàng hoặc cột đang chọn" },
  { id: "sheet.data.subtotal", category: "data", label: "Tổng phụ", icon: "autoSum", tooltip: "Chèn tổng phụ theo nhóm và tổng cộng cuối bảng" },
  { id: "sheet.data.dataTable", category: "data", label: "Bảng dữ liệu", icon: "dataTable", tooltip: "Tính công thức với một hoặc hai dãy giá trị đầu vào thay thế" },
  { id: "sheet.data.scenarioManager", category: "data", label: "Trình quản lý kịch bản", icon: "scenarioManager", tooltip: "Lưu và chuyển đổi nhiều bộ giá trị giả định có tên" },
  { id: "sheet.data.pivotTable", category: "data", label: "Bảng tổng hợp", icon: "pivotTable", tooltip: "Tạo Pivot Table từ vùng dữ liệu đang chọn" },
  { id: "sheet.data.pivotRefresh", category: "data", label: "Làm mới Pivot", icon: "refreshTable", tooltip: "Tính lại Pivot Table từ dữ liệu nguồn" },
  { id: "sheet.view.normal", category: "view", label: "Bình thường", icon: "sheetNormalView", tooltip: "Xem bảng tính ở chế độ bình thường", isToggle: true },
  { id: "sheet.view.pageBreakPreview", category: "view", label: "Xem ngắt trang", icon: "sheetPageBreakPreview", tooltip: "Hiển thị vị trí các ngắt trang và vùng in", isToggle: true },
  { id: "sheet.view.pageLayout", category: "view", label: "Bố trí trang", icon: "sheetPageLayout", tooltip: "Xem bảng tính như khi in ra giấy kèm đầu/chân trang", isToggle: true },
  { id: "sheet.view.formulaBar", category: "view", label: "Thanh công thức", icon: "sheetFormulaBar", tooltip: "Ẩn hoặc hiện thanh công thức", isToggle: true },
  { id: "sheet.view.toggleFormulas", category: "view", label: "Hiện công thức", shortcut: "Ctrl+`", icon: "autoSum", tooltip: "Hiển thị công thức thay vì kết quả (Ctrl+`)", isToggle: true },
  { id: "sheet.view.freezePanes", category: "view", label: "Cố định hàng/cột", icon: "freezePanes", tooltip: "Cố định hàng 1 và cột A khi cuộn (Freeze Panes)", isToggle: true },
  { id: "sheet.view.zoomIn", category: "view", label: "Phóng to", icon: "zoomIn", tooltip: "Tăng tỉ lệ hiển thị bảng tính" },
  { id: "sheet.view.zoomOut", category: "view", label: "Thu nhỏ", icon: "zoomOut", tooltip: "Giảm tỉ lệ hiển thị bảng tính" },
  { id: "sheet.view.zoomReset", category: "view", label: "100%", icon: "zoomReset", tooltip: "Đặt lại tỉ lệ hiển thị 100%" },
  { id: "sheet.view.zoomToSelection", category: "view", label: "Thu phóng vùng chọn", icon: "sheetZoomSelection", tooltip: "Thu phóng bảng tính để vừa khít vùng ô đang chọn" },
  { id: "sheet.view.newWindow", category: "view", label: "Cửa sổ mới", icon: "newWindow", tooltip: "Mở tài liệu bảng tính trong một cửa sổ trình duyệt mới" },
  { id: "sheet.view.gridlines", category: "view", label: "Đường lưới", icon: "gridlines", tooltip: "Ẩn hoặc hiện đường viền ô", isToggle: true },
  { id: "sheet.view.headings", category: "view", label: "Tiêu đề", icon: "headings", tooltip: "Ẩn hoặc hiện tiêu đề hàng và cột", isToggle: true },
  { id: "sheet.review.spellCheck", category: "review", label: "Chính tả", icon: "sheetSpellCheck", tooltip: "Kiểm tra chính tả tiếng Việt trên các ô văn bản của trang tính hiện tại (F7)" },
  { id: "sheet.review.commentInsert", category: "review", label: "Ghi chú mới", icon: "cellComment", tooltip: "Thêm, sửa hoặc xóa ghi chú của ô đang chọn" },
  { id: "sheet.review.commentPrevious", category: "review", label: "Nhận xét trước", icon: "commentPrevious", tooltip: "Nhảy tới nhận xét trước đó" },
  { id: "sheet.review.commentNext", category: "review", label: "Nhận xét sau", icon: "commentNext", tooltip: "Nhảy tới nhận xét tiếp theo" },
  { id: "sheet.review.commentDelete", category: "review", label: "Xóa nhận xét", icon: "commentDelete", tooltip: "Xóa nhận xét tại ô đang chọn" },
  { id: "sheet.review.commentResolve", category: "review", label: "Đã xử lý", icon: "commentResolve", tooltip: "Đánh dấu hoặc mở lại nhận xét tại ô đang chọn" },
  { id: "sheet.page.setPrintArea", category: "page", label: "Đặt vùng in", icon: "printArea", tooltip: "Đặt vùng đang chọn làm vùng in" },
  { id: "sheet.page.clearPrintArea", category: "page", label: "Xóa vùng in", icon: "clearPrintArea", tooltip: "Xóa vùng in của trang tính hiện tại" },
  { id: "sheet.page.insertPageBreak", category: "page", label: "Chèn ngắt trang", icon: "sheetPageBreak", tooltip: "Chèn ngắt hàng và cột tại ô đang chọn" },
  { id: "sheet.page.removePageBreak", category: "page", label: "Xóa ngắt trang", icon: "removePageBreak", tooltip: "Xóa ngắt hàng và cột tại ô đang chọn" },
  { id: "sheet.page.scale", category: "page", label: "Tỷ lệ vừa trang", icon: "zoomReset", tooltip: "Thu phóng nội dung in theo phần trăm hoặc số trang" },
  { id: "sheet.page.headerFooter", category: "page", label: "Tiêu đề Đầu/Cuối trang", icon: "headerFooter", tooltip: "Đặt đầu trang và cuối trang khi in" },

  // Chèn hàng/cột & Biểu đồ
  { id: "sheet.row.insert", category: "insert", label: "Chèn hàng", shortcut: "Ctrl+Shift+=", icon: "insertRow", tooltip: "Chèn thêm hàng mới (Ctrl+Shift+=)" },
  { id: "sheet.col.insert", category: "insert", label: "Chèn cột", icon: "insertCol", tooltip: "Chèn thêm cột mới" },
  { id: "sheet.row.delete", category: "insert", label: "Xóa hàng", icon: "deleteRow", tooltip: "Xóa hàng chứa ô đang chọn" },
  { id: "sheet.col.delete", category: "insert", label: "Xóa cột", icon: "deleteCol", tooltip: "Xóa cột chứa ô đang chọn" },
  { id: "sheet.row.height", category: "format", label: "Chiều cao hàng...", icon: "rowHeight", tooltip: "Đặt chiều cao (pixel) cho các hàng đang chọn" },
  { id: "sheet.row.autoFit", category: "format", label: "Tự động vừa chiều cao hàng", icon: "autoFitRow", tooltip: "Tự động vừa chiều cao theo nội dung các hàng đang chọn" },
  { id: "sheet.col.width", category: "format", label: "Độ rộng cột...", icon: "colWidth", tooltip: "Đặt độ rộng (pixel) cho các cột đang chọn" },
  { id: "sheet.col.autoFit", category: "format", label: "Tự động vừa độ rộng cột", icon: "autoFitCol", tooltip: "Tự động vừa độ rộng theo nội dung các cột đang chọn" },
  { id: "sheet.row.hide", category: "format", label: "Ẩn hàng", icon: "hideRow", tooltip: "Ẩn các hàng đang chọn" },
  { id: "sheet.row.unhide", category: "format", label: "Hiện hàng", icon: "unhideRow", tooltip: "Hiện các hàng đã ẩn trong vùng chọn" },
  { id: "sheet.col.hide", category: "format", label: "Ẩn cột", icon: "hideCol", tooltip: "Ẩn các cột đang chọn" },
  { id: "sheet.col.unhide", category: "format", label: "Hiện cột", icon: "unhideCol", tooltip: "Hiện các cột đã ẩn trong vùng chọn" },
  { id: "sheet.sheet.rename", category: "format", label: "Đổi tên trang tính...", icon: "renameSheet", tooltip: "Đổi tên trang tính hiện tại (cùng hộp thoại với nhấp đúp tab dưới lưới)" },
  { id: "sheet.sheet.moveOrCopy", category: "format", label: "Di chuyển hoặc Sao chép trang tính...", icon: "moveCopySheet", tooltip: "Đổi thứ tự tab hoặc tạo bản sao trang tính (dữ liệu, định dạng, Page Setup)" },
  { id: "sheet.sheet.protect", category: "format", label: "Bảo vệ trang tính...", icon: "protectSheet", tooltip: "Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện, không phải bảo mật thật)" },
  { id: "sheet.workbook.protect", category: "review", label: "Bảo vệ workbook...", icon: "protectWorkbook", tooltip: "Khóa cấu trúc workbook: không thêm, xóa, đổi tên, di chuyển hay sao chép trang tính. Không khóa nội dung ô (khóa giao diện, không phải bảo mật thật)" },
  { id: "sheet.chart.insert", category: "insert", label: "Biểu đồ", icon: "chart", tooltip: "Chèn biểu đồ phân tích dữ liệu" },
  { id: "sheet.chart.pivotChart", category: "insert", label: "Biểu đồ Pivot", icon: "pivotChart", tooltip: "Chèn biểu đồ Cột hoặc Tròn liên kết với dữ liệu Pivot đã tổng hợp" },
  { id: "sheet.insert.image", category: "insert", label: "Chèn ảnh", icon: "image", tooltip: "Chèn ảnh vào ô đang chọn" },
  { id: "sheet.insert.sparklineLine", category: "insert", label: "Đường", icon: "sparklineLine", tooltip: "Chèn biểu đồ mini dạng đường từ vùng dữ liệu đã chọn" },
  { id: "sheet.insert.sparklineColumn", category: "insert", label: "Cột", icon: "sparklineColumn", tooltip: "Chèn biểu đồ mini dạng cột từ vùng dữ liệu đã chọn" },
  { id: "sheet.insert.hyperlink", category: "insert", label: "Liên kết", icon: "hyperlink", tooltip: "Chèn liên kết vào ô hiện tại (Ctrl+K)" },
  { id: "sheet.insert.textbox", category: "insert", label: "Hộp văn bản", icon: "textBox", tooltip: "Chèn hộp văn bản nổi trên trang tính" },

  // Kiểu dáng & Định dạng bảng (Styles)
  { id: "sheet.style.formatAsTable", category: "format", label: "Định dạng bảng", icon: "formatTable", tooltip: "Định dạng vùng chọn theo kiểu bảng có màu xen kẽ" },
  { id: "sheet.style.cellStyles", category: "format", label: "Kiểu ô", icon: "cellStyles", tooltip: "Mở thư viện kiểu ô định sẵn (Normal, Good, Bad, Neutral...)" },

  // Chỉnh sửa & Điền/Xóa (Editing: Fill & Clear)
  { id: "sheet.edit.fillDown", category: "edit", label: "Điền xuống", shortcut: "Ctrl+D", icon: "fillDown", tooltip: "Sao chép giá trị và công thức ô trên xuống các ô dưới (Ctrl+D)" },
  { id: "sheet.edit.fillRight", category: "edit", label: "Điền phải", shortcut: "Ctrl+R", icon: "fillRight", tooltip: "Sao chép giá trị và công thức ô bên trái sang phải (Ctrl+R)" },
  { id: "sheet.edit.clearAll", category: "edit", label: "Xóa tất cả", icon: "clearAll", tooltip: "Xóa toàn bộ nội dung, công thức và định dạng của các ô đã chọn" },
  { id: "sheet.edit.clearFormats", category: "edit", label: "Xóa định dạng", icon: "clearFormat", tooltip: "Xóa định dạng ô và đưa về mặc định nhưng giữ nguyên nội dung" },
  { id: "sheet.edit.clearContents", category: "edit", label: "Xóa nội dung", icon: "clearContents", tooltip: "Xóa nội dung và công thức của ô nhưng giữ nguyên định dạng" },
  { id: "sheet.help.open", category: "help", label: "Trợ giúp", shortcut: "F1", icon: "help", tooltip: "Mở hướng dẫn sử dụng (F1)", isToggle: true }
];

export const SLIDES_COMMANDS = [
  { id: "slides.review.commentInsert", category: "review", label: "Nhận xét mới", icon: "comment", tooltip: "Thêm nhận xét cho trang chiếu hiện tại" },
  { id: "slides.review.commentPrevious", category: "review", label: "Nhận xét trước", icon: "commentPrevious", tooltip: "Nhảy tới nhận xét trước đó" },
  { id: "slides.review.commentNext", category: "review", label: "Nhận xét sau", icon: "commentNext", tooltip: "Nhảy tới nhận xét tiếp theo" },
  { id: "slides.review.commentDelete", category: "review", label: "Xóa nhận xét", icon: "commentDelete", tooltip: "Xóa nhận xét đang chọn" },
  { id: "slides.review.commentResolve", category: "review", label: "Đã xử lý", icon: "commentResolve", tooltip: "Đánh dấu hoặc mở lại nhận xét đang chọn" },
  { id: "slides.review.spellCheck", category: "review", label: "Chính tả", icon: "slidesSpellCheck", tooltip: "Kiểm tra chính tả tiếng Việt trên trang chiếu hiện tại (F7)" },
  { id: "slides.edit.formatPainter", category: "edit", label: "Sao chép định dạng", icon: "formatPainter", tooltip: "Sao chép định dạng chữ hoặc hình đang chọn sang đối tượng khác. Nhấp đúp để khóa và áp dụng nhiều lần. Esc để hủy.", isToggle: true },
  { id: "slides.edit.selectAll", category: "edit", label: "Chọn tất cả", icon: "selectAll", tooltip: "Chọn tất cả hình trên trang chiếu hiện tại" },
  { id: "slides.edit.selectObjects", category: "edit", label: "Chọn đối tượng", icon: "selectObjects", tooltip: "Chọn các đối tượng vẽ trên trang chiếu hiện tại (không gồm đường nối)" },
  // Quản lý Trang chiếu
  { id: "slides.slide.new", category: "slide", label: "Trang mới", shortcut: "Ctrl+M", icon: "slideNew", tooltip: "Chèn trang chiếu mới (Ctrl+M)" },
  { id: "slides.layout.apply", category: "slide", label: "Bố cục", icon: "slideLayout", tooltip: "Thay đổi bố cục trang chiếu (Tiêu đề, Nội dung, Hai cột, Trống)" },
  { id: "slides.layout.select", category: "slide", label: "Chọn bố cục", icon: "slideLayout", tooltip: "Mở hộp thoại chọn bố cục trang chiếu" },
  { id: "slides.slide.duplicate", category: "slide", label: "Nhân đôi", shortcut: "Ctrl+D", icon: "copy", tooltip: "Nhân đôi trang chiếu đang chọn (Ctrl+D)" },
  { id: "slides.slide.delete", category: "slide", label: "Xóa trang", shortcut: "Delete", icon: "close", tooltip: "Xóa trang chiếu đang chọn (Delete)" },
  { id: "slides.slide.toggleHidden", category: "show", label: "Ẩn trang chiếu", icon: "hideSlide", tooltip: "Ẩn hoặc hiện trang chiếu đang chọn khi trình chiếu F5. Trang vẫn còn trong tệp và Slide Sorter.", isToggle: true },
  { id: "slides.section.add", category: "slide", label: "Thêm phần", icon: "slideSection", tooltip: "Thêm phần bắt đầu từ trang đang chọn để nhóm các trang chiếu liên tiếp" },
  { id: "slides.section.rename", category: "slide", label: "Đổi tên phần", icon: "slideSection", tooltip: "Đổi tên phần chứa trang chiếu đang chọn" },
  { id: "slides.section.remove", category: "slide", label: "Xóa phần", icon: "slideSection", tooltip: "Bỏ nhóm phần — không xóa các trang chiếu bên trong" },
  { id: "slides.section.moveUp", category: "slide", label: "Chuyển phần lên", icon: "slideSectionUp", tooltip: "Di chuyển cả nhóm trang của phần lên trên phần kề trước, giữ thứ tự trang bên trong" },
  { id: "slides.section.moveDown", category: "slide", label: "Chuyển phần xuống", icon: "slideSectionDown", tooltip: "Di chuyển cả nhóm trang của phần xuống dưới phần kề sau, giữ thứ tự trang bên trong" },

  // Chèn đối tượng
  { id: "slides.text.insert", category: "insert", label: "Hộp văn bản", icon: "textBox", tooltip: "Chèn khung văn bản mới" },
  { id: "slides.shape.insert", category: "insert", label: "Hình khối", icon: "shape", tooltip: "Chèn hình chữ nhật, tròn, mũi tên" },
  { id: "slides.diagram.insert", category: "insert", label: "Sơ đồ", icon: "diagram", tooltip: "Chèn sơ đồ quy trình, chu kỳ hoặc phân cấp" },
  { id: "slides.image.insert", category: "insert", label: "Hình ảnh", icon: "image", tooltip: "Chèn ảnh minh họa từ máy tính" },
  { id: "slides.media.insertVideo", category: "insert", label: "Video", icon: "videoInsert", tooltip: "Chèn video từ máy tính" },
  { id: "slides.media.insertAudio", category: "insert", label: "Âm thanh", icon: "audioInsert", tooltip: "Chèn âm thanh từ máy tính" },
  { id: "slides.insert.table", category: "insert", label: "Bảng", icon: "table", tooltip: "Chèn bảng vào trang chiếu, kéo-thả và đổi kích thước được" },
  { id: "slides.insert.headerFooter", category: "insert", label: "Đầu trang & Chân trang", icon: "headerFooter", tooltip: "Bật/tắt ngày tháng, số trang và chân trang" },
  { id: "slides.insert.dateTime", category: "insert", label: "Ngày & Giờ", icon: "dateTime", tooltip: "Chèn placeholder ngày giờ tự cập nhật" },
  { id: "slides.insert.slideNumber", category: "insert", label: "Số trang chiếu", icon: "slideNumber", tooltip: "Chèn placeholder số trang chiếu tự cập nhật" },
  { id: "slides.insert.symbol", category: "insert", label: "Ký hiệu", icon: "symbol", tooltip: "Chèn ký tự đặc biệt vào khung văn bản đang chọn" },
  { id: "slides.insert.wordart", category: "insert", label: "Chữ nghệ thuật", icon: "wordArt", tooltip: "Chèn chữ nghệ thuật với viền, đổ bóng hoặc gradient" },

  // Trình chiếu & Thiết kế
  { id: "slides.design.themeGallery", category: "design", label: "Chủ đề", icon: "themeGallery", tooltip: "Chọn chủ đề thiết kế cho toàn bộ bản trình chiếu" },
  { id: "slides.design.slideSize", category: "design", label: "Cỡ trang chiếu", icon: "slideSize", tooltip: "Chọn tỷ lệ trang chiếu 16:9 hoặc 4:3" },
  { id: "slides.design.formatBackground", category: "design", label: "Định dạng nền", icon: "formatBackground", tooltip: "Đổi nền trang chiếu hiện tại hoặc tất cả trang: màu đơn, gradient 2 màu, hoặc ảnh" },
  { id: "slides.master.apply", category: "design", label: "Mẫu Slide Master", icon: "template", tooltip: "Áp dụng mẫu Slide Master đồng bộ font, màu, logo cho toàn bộ trang chiếu" },
  { id: "slides.transition.apply", category: "transition", label: "Chuyển tiếp", icon: "slideTransition", tooltip: "Hiệu ứng chuyển trang chiếu (Fade, Slide, Zoom, Flip)" },
  { id: "slides.animation.apply", category: "animation", label: "Hiệu ứng đối tượng", icon: "objectAnimation", tooltip: "Thiết lập hiệu ứng xuất hiện (Fade In, Fly In, Zoom In) cho đối tượng" },
  { id: "slides.animation.pane", category: "animation", label: "Ngăn hoạt hình", icon: "animationPane", tooltip: "Hiện danh sách mọi hiệu ứng trên trang đang chọn, đổi thứ tự, cách bắt đầu hoặc xóa hiệu ứng", isToggle: true },
  { id: "slides.view.normal", category: "view", label: "Bình thường", icon: "slidesNormalView", tooltip: "Dạng xem bình thường để chỉnh sửa từng trang chiếu", isToggle: true },
  { id: "slides.view.slideSorter", category: "view", label: "Bộ sắp xếp trang", icon: "slideSorter", tooltip: "Xem toàn bộ trang chiếu dạng lưới và kéo thả để sắp xếp" },
  { id: "slides.notes.toggle", category: "view", label: "Ghi chú thuyết trình", icon: "speakerNotes", tooltip: "Bật/tắt khung ghi chú người thuyết trình dưới trang chiếu", isToggle: true },
  { id: "slides.view.reading", category: "view", label: "Chế độ đọc", icon: "slidesReadingView", tooltip: "Xem toàn bộ trang chiếu để đọc thuận tiện; nhấn Esc để thoát", isToggle: true },
  { id: "slides.view.ruler", category: "view", label: "Thước", icon: "slidesRuler", tooltip: "Ẩn hoặc hiện thước căn chỉnh trang chiếu", isToggle: true },
  { id: "slides.view.gridlines", category: "view", label: "Đường lưới", icon: "slidesGridlines", tooltip: "Ẩn hoặc hiện đường lưới căn chỉnh", isToggle: true },
  { id: "slides.view.guides", category: "view", label: "Đường hướng dẫn", icon: "slidesGuides", tooltip: "Ẩn hoặc hiện các đường hướng dẫn căn chỉnh shape kéo được", isToggle: true },
  { id: "slides.view.zoomIn", category: "view", label: "Phóng to", icon: "zoomIn", tooltip: "Tăng tỉ lệ hiển thị trang chiếu" },
  { id: "slides.view.zoomOut", category: "view", label: "Thu nhỏ", icon: "zoomOut", tooltip: "Giảm tỉ lệ hiển thị trang chiếu" },
  { id: "slides.view.zoomReset", category: "view", label: "100%", icon: "zoomReset", tooltip: "Đặt lại tỉ lệ hiển thị 100%" },
  { id: "slides.view.fitToWindow", category: "view", label: "Vừa cửa sổ", icon: "slidesFitWindow", tooltip: "Thu phóng trang chiếu vừa khít cửa sổ làm việc" },
  { id: "slides.view.newWindow", category: "view", label: "Cửa sổ mới", icon: "newWindow", tooltip: "Mở tài liệu trình chiếu trong cửa sổ mới" },
  { id: "slides.show.startFromBegin", category: "show", label: "Từ đầu", shortcut: "F5", icon: "slidePlayFromBegin", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" },
  { id: "slides.show.startFromCurrent", category: "show", label: "Từ trang này", shortcut: "Shift+F5", icon: "slidePlayFromCurrent", tooltip: "Trình chiếu từ trang hiện tại (Shift+F5)" },
  { id: "slides.show.presenterMode", category: "show", label: "Chế độ Presenter", shortcut: "Alt+F5", icon: "presenterMode", tooltip: "Trình chiếu chế độ Người thuyết trình kèm ghi chú và đồng hồ (Alt+F5)" },
  { id: "slides.show.rehearseTimings", category: "show", label: "Tập dượt hẹn giờ", icon: "rehearseTimings", tooltip: "Trình chiếu và đo thời gian thật ở mỗi trang, có thể lưu lại làm mốc thời gian" },
  { id: "slides.show.setupShow", category: "show", label: "Thiết lập trình chiếu", icon: "setupShow", tooltip: "Lặp liên tục đến Esc, trình chiếu không thuyết minh, màu bút/laser" },
  { id: "slides.shape.group", category: "arrange", label: "Nhóm đối tượng", shortcut: "Ctrl+G", icon: "shape", tooltip: "Nhóm các đối tượng đang chọn thành một khối (Ctrl+G)" },
  { id: "slides.shape.ungroup", category: "arrange", label: "Bỏ nhóm", shortcut: "Ctrl+Shift+G", icon: "shape", tooltip: "Tách nhóm đối tượng đang chọn (Ctrl+Shift+G)" },
  { id: "slides.nav.firstSlide", category: "nav", label: "Trang đầu tiên", shortcut: "Ctrl+Home", icon: "slideNew", tooltip: "Về trang chiếu đầu tiên (Ctrl+Home)" },
  { id: "slides.nav.lastSlide", category: "nav", label: "Trang cuối cùng", shortcut: "Ctrl+End", icon: "slideNew", tooltip: "Đến trang chiếu cuối cùng (Ctrl+End)" },
  { id: "slides.nav.prevSlide", category: "nav", label: "Trang trước", shortcut: "PageUp", icon: "slideNew", tooltip: "Về trang chiếu trước (Page Up)" },
  { id: "slides.nav.nextSlide", category: "nav", label: "Trang sau", shortcut: "PageDown", icon: "slideNew", tooltip: "Đến trang chiếu sau (Page Down)" },

  // Định dạng chữ trên slide (Font) — reuse document.execCommand như Writer
  { id: "slides.text.bold", category: "format", label: "Đậm", shortcut: "Ctrl+B", icon: "bold", tooltip: "Chữ đậm (Ctrl+B)", isToggle: true },
  { id: "slides.text.italic", category: "format", label: "Nghiêng", shortcut: "Ctrl+I", icon: "italic", tooltip: "Chữ nghiêng (Ctrl+I)", isToggle: true },
  { id: "slides.text.underline", category: "format", label: "Gạch chân", shortcut: "Ctrl+U", icon: "underline", tooltip: "Gạch chân chữ (Ctrl+U)", isToggle: true },
  { id: "slides.text.strike", category: "format", label: "Gạch ngang", icon: "strike", tooltip: "Gạch ngang chữ", isToggle: true },
  { id: "slides.text.clearFormat", category: "format", label: "Xóa định dạng", icon: "clearFormat", tooltip: "Xóa định dạng chữ, giữ nguyên nội dung" },
  { id: "slides.font.family", category: "format", label: "Phông chữ", tooltip: "Chọn phông chữ" },
  { id: "slides.font.size", category: "format", label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
  { id: "slides.font.grow", category: "format", label: "Tăng cỡ chữ", icon: "fontGrow", tooltip: "Tăng cỡ chữ" },
  { id: "slides.font.shrink", category: "format", label: "Giảm cỡ chữ", icon: "fontShrink", tooltip: "Giảm cỡ chữ" },
  { id: "slides.color.text", category: "format", label: "Màu chữ", icon: "colorText", tooltip: "Đổi màu chữ" },
  { id: "slides.color.highlight", category: "format", label: "Màu nền chữ", icon: "colorHighlight", tooltip: "Tô màu nền văn bản" },

  // Đoạn văn trên slide (Paragraph)
  { id: "slides.list.bullet", category: "paragraph", label: "Dấu đầu dòng", icon: "listBullet", tooltip: "Tạo danh sách dấu đầu dòng", isToggle: true },
  { id: "slides.list.numbered", category: "paragraph", label: "Đánh số", icon: "listNumber", tooltip: "Tạo danh sách đánh số thứ tự", isToggle: true },
  { id: "slides.para.alignLeft", category: "paragraph", label: "Căn trái", shortcut: "Ctrl+L", icon: "alignLeft", tooltip: "Căn lề trái (Ctrl+L)", isToggle: true },
  { id: "slides.para.alignCenter", category: "paragraph", label: "Căn giữa", shortcut: "Ctrl+E", icon: "alignCenter", tooltip: "Căn lề giữa (Ctrl+E)", isToggle: true },
  { id: "slides.para.alignRight", category: "paragraph", label: "Căn phải", shortcut: "Ctrl+R", icon: "alignRight", tooltip: "Căn lề phải (Ctrl+R)", isToggle: true },
  { id: "slides.para.justify", category: "paragraph", label: "Căn đều", shortcut: "Ctrl+J", icon: "alignJustify", tooltip: "Căn đều hai bên (Ctrl+J)", isToggle: true },
  { id: "slides.para.indentInc", category: "paragraph", label: "Thụt lề", icon: "indentInc", tooltip: "Tăng thụt lề đoạn văn" },
  { id: "slides.para.indentDec", category: "paragraph", label: "Giảm thụt lề", icon: "indentDec", tooltip: "Giảm thụt lề đoạn văn" },
  { id: "slides.para.lineSpacing", category: "paragraph", label: "Giãn dòng", icon: "alignLeft", tooltip: "Chọn khoảng cách dòng 1.0 / 1.5 / 2.0" },
  { id: "slides.help.open", category: "help", label: "Trợ giúp", shortcut: "F1", icon: "help", tooltip: "Mở hướng dẫn sử dụng (F1)", isToggle: true }
];

export function registerAllStandardCommands(bus) {
  const all = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];
  for (const cmd of all) {
    bus.register(cmd);
    if (cmd.shortcut) {
      const scope = cmd.id.startsWith("writer.") ? "writer"
        : cmd.id.startsWith("sheet.") ? "sheet"
          : cmd.id.startsWith("slides.") ? "slides"
            : "common";
      globalShortcutManager.bind(cmd.shortcut, cmd.id, scope);
    }
  }
  applyLocaleToCommandDefinitions(bus);
}

/**
 * Ghi đè label/tooltip của mọi command đã đăng ký theo ngôn ngữ hiện tại (i18n),
 * cho những command ĐÃ CÓ bản dịch trong `platform/i18n/strings-{vi,en}.js`'s
 * `commands` catalog. Command chưa có bản dịch giữ nguyên label/tooltip gốc
 * (an toàn — không cần dịch hết cùng lúc, migrate dần từng phần).
 * @param {import('./command-bus.js').CommandBus} bus
 */
export function applyLocaleToCommandDefinitions(bus) {
  const all = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];
  for (const cmd of all) {
    const label = tCommand(cmd.id, "label");
    const tooltip = tCommand(cmd.id, "tooltip");
    if (label) cmd.label = label;
    if (tooltip) cmd.tooltip = tooltip;
    if (bus && typeof bus.updateState === "function" && (label || tooltip)) {
      bus.updateState(cmd.id, { ...(label ? { label } : {}), ...(tooltip ? { tooltip } : {}) });
    }
  }
}
