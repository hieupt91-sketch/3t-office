/**
 * VN Office Platform — Vietnamese Strings Catalog (ESM)
 */

export const viStrings = {
  app: {
    suiteName: "VN Office",
    writer: "VN Writer (Soạn thảo)",
    sheet: "VN Sheet (Bảng tính)",
    slides: "VN Slides (Trình chiếu)"
  },
  common: {
    save: "Lưu tài liệu",
    undo: "Hoàn tác",
    redo: "Làm lại",
    print: "In tài liệu",
    exportPdf: "Xuất tệp PDF",
    ready: "Sẵn sàng",
    ok: "Đồng ý",
    cancel: "Hủy bỏ",
    close: "Đóng",
    fileMenu: "Tệp",
    switchLanguage: "Ngôn ngữ"
  },
  aiAssistant: {
    title: "Trợ lý VN AI", provider: "Nhà cung cấp AI", local: "Cục bộ (mặc định)",
    activeProvider: "Đang dùng thực tế", configureKey: "Cấu hình API key", apiKey: "API key",
    showKey: "Hiện key", hideKey: "Ẩn key", saveConsent: "Đồng ý & Lưu key", removeKey: "Xóa key",
    send: "Gửi", stop: "Dừng", analyzing: "Đang phân tích...", stopped: "Đã dừng yêu cầu.",
    keySaved: "Đã lưu key trên máy này.", keyRemoved: "Đã xóa key khỏi máy này.",
    disclosureOpenai: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ OpenAI. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác.",
    disclosureGemini: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ Google. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác.",
    disclosureClaude: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ Anthropic. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác."
  },
  backstage: {
    home: "Trang chủ",
    new: "Tạo mới (Ctrl+N)",
    open: "Mở tệp (Ctrl+O)",
    save: "Lưu tài liệu (Ctrl+S)",
    saveAs: "Lưu bản sao (F12)",
    print: "In ấn (Ctrl+P)",
    exportPdf: "Xuất tệp PDF",
    about: "Giới thiệu VN Office",
    templateTitle: "Mẫu văn bản tiêu chuẩn Việt Nam",
    templateSubtitle: "Khởi tạo tài liệu mới nhanh chóng theo mẫu quy chuẩn hành chính và doanh nghiệp",
    recentTitle: "Tài liệu mở gần đây",
    recentColName: "TÊN TÀI LIỆU",
    recentColFormat: "VỊ TRÍ / ĐỊNH DẠNG",
    clearRecent: "Xóa lịch sử",
    emptyRecentTitle: "Chưa có tài liệu gần đây",
    emptyRecentDesc: "Các tài liệu bạn vừa khởi tạo hoặc chỉnh sửa sẽ tự động xuất hiện tại đây để truy cập nhanh."
  },
  dialog: {
    notice: "Thông báo",
    confirm: "Xác nhận",
    input: "Nhập dữ liệu",
    findReplace: "Tìm kiếm và Thay thế"
  },
  sheetRibbon: {
    tab: { home: "Trang đầu", formulas: "Công thức", data: "Dữ liệu", insert: "Chèn", pageLayout: "Bố trí trang", review: "Xem xét", view: "Chế độ xem", ai: "Trợ lý VN AI" },
    group: { clipboard: "Bảng nhớ tạm", font: "Phông chữ", alignment: "Căn chỉnh & Trộn ô", number: "Định dạng số", styles: "Kiểu ô", cells: "Ô", quickAnalysis: "Tính toán & Dữ liệu", editing: "Chỉnh sửa", functionLibrary: "Hàm tính toán", definedNames: "Tên đã xác định", sortFilter: "Sắp xếp & Lọc", dataTools: "Công cụ dữ liệu", pivotTable: "Bảng tổng hợp", illustrations: "Minh họa", charts: "Biểu đồ", printArea: "Vùng in", pageBreaks: "Ngắt trang", comments: "Ghi chú", show: "Hiển thị", zoom: "Thu phóng", window: "Cửa sổ", aiAnalysis: "Phân tích dữ liệu AI" }
  },
  slidesRibbon: {
    tab: { home: "Trang đầu", insert: "Chèn", design: "Thiết kế", transitions: "Chuyển tiếp", animations: "Hoạt hình", slideshow: "Trình chiếu", review: "Đánh giá", view: "Chế độ xem", ai: "Trợ lý VN AI" },
    group: { slides: "Trang chiếu", clipboard: "Bảng nhớ tạm", drawing: "Đối tượng vẽ", imagesObjects: "Hình ảnh & Đối tượng", media: "Đa phương tiện", themes: "Chủ đề", master: "Mẫu chủ đạo", customize: "Tùy chỉnh", transitions: "Hiệu ứng chuyển trang", animations: "Hiệu ứng đối tượng", startSlideshow: "Khởi động chiếu", presenter: "Người thuyết trình", comments: "Nhận xét", presentationViews: "Dạng xem bản trình chiếu", aiContent: "Tạo nội dung thuyết trình" }
  },
  sheetDialogs: {
    close: "Đóng", cancel: "Hủy", cancelLong: "Hủy bỏ", apply: "Áp dụng", range: "Phạm vi", value: "Giá trị",
    functionTitle: "Chèn Hàm (Insert Function fx)", functionCategory: "Danh mục hàm:", allCategory: "Tất cả", allFunctions: "Tất cả các hàm", mathFunctions: "Toán học & Lượng giác", statsFunctions: "Thống kê (AVERAGE, COUNT...)", logicFunctions: "Logic (IF, AND, OR...)", textFunctions: "Văn bản (CONCAT, LEN...)", dateFunctions: "Ngày & Giờ (TODAY, NOW...)", insertFunction: "Chèn hàm vào ô",
    newComment: "Ghi chú mới {coord}", editComment: "Sửa ghi chú {coord}", commentContent: "Nội dung ghi chú", commentPlaceholder: "Nhập ghi chú cho {coord}", author: "Tác giả", defaultAuthor: "Người dùng VN Office", saveChanges: "Lưu thay đổi", addComment: "Thêm ghi chú", deleteComment: "Xóa ghi chú", emptyComment: "Nội dung ghi chú không được để trống.",
    conditionalFormatting: "Định dạng có điều kiện", rule: "Quy tắc", greaterThan: "Giá trị lớn hơn", lessThan: "Giá trị nhỏ hơn", blankCell: "Ô trống", fillColor: "Màu nền", invalidNumber: "Vui lòng nhập một giá trị số hợp lệ.",
    dataValidation: "Kiểm tra dữ liệu", allow: "Cho phép", list: "Danh sách lựa chọn", numberRange: "Số trong khoảng", listValues: "Các giá trị (cách nhau bằng dấu phẩy)", listPlaceholder: "Đạt, Chưa đạt, Đang xử lý", minimum: "Tối thiểu", maximum: "Tối đa", invalidValidation: "Thông tin kiểm tra dữ liệu chưa hợp lệ.",
    pivotTitle: "Tạo Bảng tổng hợp", pivotSource: "Vùng dữ liệu nguồn (hàng đầu là tiêu đề)", loadFields: "Đọc tên cột", chooseFields: "Chọn trường cho từng vùng:", aggregateFor: "Phép tổng hợp cho {field}", sourceRangeFormat: "Vùng nguồn phải có dạng A1:D20.", sourceNeedsHeaders: "Hàng đầu tiên của vùng nguồn phải có tiêu đề.", uniqueHeaders: "Tiêu đề cột trong vùng nguồn phải là duy nhất.", selectValue: "Hãy chọn ít nhất một trường Values.", columnNotFound: "Không tìm thấy cột {field}.", sourceSheetNotFound: "Không tìm thấy sheet dữ liệu nguồn.",
    chartDefaultTitle: "Biểu đồ dữ liệu", chartUnsupported: "Kiểu biểu đồ không được hỗ trợ: {type}", chartItem: "Mục {number}", chartNoNumericData: "Vùng đã chọn không có dữ liệu số", chartPiePositive: "Biểu đồ tròn cần giá trị dương", chartInsertFrom: "Chèn biểu đồ từ {range}", selectedRange: "vùng đã chọn", chartType: "Kiểu biểu đồ", chartColumn: "Cột", chartLine: "Đường", chartPie: "Tròn", chartArea: "Miền", insertIntoSheet: "Chèn vào bảng tính", insertedImageAlt: "Ảnh được chèn trong trang tính", deleteImage: "Xóa ảnh",
    cellStylesTitle: "Thư viện kiểu ô (Cell Styles)", cellStylesHint: "Chọn một kiểu để áp dụng ngay lập tức cho các ô đang chọn:",
    formatAsTableTitle: "Định dạng theo bảng (Format as Table)", formatAsTableHint: "Chọn kiểu bảng để áp dụng màu tiêu đề và hàng xen kẽ (banded rows):"
  },
  slidesDialogs: {
    close: "Đóng", cancel: "Hủy bỏ", apply: "Áp dụng", preview: "Xem thử", delete: "Xóa",
    masterTitle: "Mẫu Slide Master", themeGalleryTitle: "Thư viện Chủ đề", themeGalleryHint: "Chọn một chủ đề để áp dụng ngay cho toàn bộ bản trình chiếu.", themePreviewTitle: "Tiêu đề bản trình chiếu", themeCorporateBlue: "Xanh Doanh Nghiệp", themeWarmTerracotta: "Terracotta Ấm Áp", themeMinimalMonochrome: "Đơn Sắc Tối Giản", themeNaturalGreen: "Xanh Lá Thiên Nhiên", themeModernCharcoal: "Than Chì Hiện Đại", themeEnergeticOrange: "Cam Năng Động", slideSizeTitle: "Kích thước trang chiếu", slideSizeHint: "Chọn tỷ lệ mới. Mọi hình và đối tượng hiện có sẽ được co giãn theo khung.", slideSizeWide: "Màn hình rộng", slideSizeStandard: "Tiêu chuẩn", layoutTitle: "Chọn Bố Cục Trang Chiếu", transitionTitle: "Hiệu Ứng Chuyển Trang", animationTitle: "Hiệu Ứng Đối Tượng (Object Animations)",
    applyMaster: "Áp dụng mẫu", applyLayout: "Áp dụng bố cục", applyTransition: "Áp dụng chuyển tiếp", applyAnimation: "Áp dụng hiệu ứng", removeTransition: "Xóa chuyển tiếp", removeAnimation: "Xóa hiệu ứng", previewTransition: "▶ Xem thử chuyển tiếp", previewAnimation: "▶ Xem thử hiệu ứng", previewObject: "Đối tượng xem thử",
    animationTarget: "Đối tượng áp dụng:", animationType: "Kiểu hiệu ứng xuất hiện (Entrance):", animationDuration: "Thời gian hiệu ứng:", animationDelay: "Độ trễ xuất hiện:", noAnimation: "Không có hiệu ứng", immediate: "Ngay lập tức (0s)",
    commentsLabel: "Nhận xét trang chiếu", newComment: "Nhận xét mới", commentPlaceholder: "Nhập nội dung nhận xét...", addComment: "Thêm nhận xét", rehearsalConfirm: "Tổng thời gian trình chiếu: {time}.\nLưu thời gian tập dượt cho từng trang?",
    diagramTitle: "Chèn sơ đồ", diagramHint: "Chọn kiểu sơ đồ và số lượng hộp. Bạn có thể sửa chữ trực tiếp sau khi chèn.", diagramNodeCount: "Số lượng hộp", diagramInsert: "Chèn sơ đồ", diagramProcess: "Danh sách theo bước", diagramCycle: "Quy trình theo chu kỳ", diagramHierarchy: "Phân cấp tổ chức", diagramList: "Danh sách phân cấp", diagramStep: "Bước {number}", diagramItem: "Mục {number}", diagramRoot: "Lãnh đạo", diagramChild: "Bộ phận {number}"
  },
  commands: {
    "writer.nav.docStart": { label: "Đầu tài liệu", tooltip: "Đến đầu tài liệu (Ctrl+Home)" },
    "writer.nav.docEnd": { label: "Cuối tài liệu", tooltip: "Đến cuối tài liệu (Ctrl+End)" },
    "sheet.nav.home": { label: "Ô đầu tiên", tooltip: "Đến ô A1 (Ctrl+Home)" },
    "sheet.nav.end": { label: "Ô cuối có dữ liệu", tooltip: "Đến ô cuối cùng có dữ liệu (Ctrl+End)" },
    "common.file.new": { label: "Tạo mới", tooltip: "Tạo tài liệu mới (Ctrl+N)" },
    "common.file.open": { label: "Mở tệp", tooltip: "Mở tài liệu có sẵn (Ctrl+O)" },
    "common.file.save": { label: "Lưu", tooltip: "Lưu tài liệu hiện tại (Ctrl+S)" },
    "common.file.saveAs": { label: "Lưu bản sao", tooltip: "Lưu tài liệu dưới tên khác (F12)" },
    "common.file.exportPdf": { label: "Xuất PDF", tooltip: "Xuất nội dung sang định dạng PDF tiêu chuẩn" },
    "common.file.print": { label: "In tài liệu", tooltip: "In tài liệu (Ctrl+P)" },
    "common.file.close": { label: "Đóng", tooltip: "Đóng tài liệu (Ctrl+W)" },
    "common.edit.undo": { label: "Hoàn tác", tooltip: "Hoàn tác thao tác vừa thực hiện (Ctrl+Z)" },
    "common.edit.redo": { label: "Làm lại", tooltip: "Làm lại thao tác vừa hoàn tác (Ctrl+Y)" },
    "common.edit.repeat": { label: "Lặp lại", tooltip: "Lặp lại thao tác cuối (F4)" },
    "common.edit.cut": { label: "Cắt", tooltip: "Cắt vùng chọn vào bộ nhớ tạm (Ctrl+X)" },
    "common.edit.copy": { label: "Sao chép", tooltip: "Sao chép vùng chọn (Ctrl+C)" },
    "common.edit.paste": { label: "Dán", tooltip: "Dán nội dung từ bộ nhớ tạm (Ctrl+V)" },
    "common.edit.pastePlain": { label: "Dán văn bản thuần", tooltip: "Dán văn bản không giữ định dạng (Ctrl+Shift+V)" },
    "common.edit.formatPainter": { label: "Sao chép định dạng", tooltip: "Sao chép định dạng (Ctrl+Shift+C)" },
    "common.edit.selectAll": { label: "Chọn tất cả", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
    "common.edit.find": { label: "Tìm kiếm", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
    "common.edit.replace": { label: "Thay thế", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },
    "common.edit.hyperlink": { label: "Chèn liên kết", tooltip: "Chèn siêu liên kết (Ctrl+K)" },
    "common.view.ribbonToggle": { label: "Thu gọn Ribbon", tooltip: "Thu gọn hoặc mở rộng thanh Ribbon (Ctrl+F1)" },
    "common.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị (Ctrl++)" },
    "common.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị (Ctrl+-)" },
    "common.view.fullScreen": { label: "Toàn màn hình", tooltip: "Bật/tắt chế độ toàn màn hình (F11)" },
    "ai.assistant.toggle": { label: "Trợ lý VN AI", tooltip: "Mở bảng trợ lý VN AI (Alt+J)" },
    "ai.assistant.summarize": { label: "Tóm tắt nhanh", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
    "ai.assistant.rewrite": { label: "Viết lại trau chuốt", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
    "ai.assistant.grammarCheck": { label: "Soát lỗi chính tả", tooltip: "Kiểm tra chính tả và ngữ pháp tiếng Việt (F7)" }
    ,"sheet.cell.edit": { label: "Chỉnh sửa ô", tooltip: "Chỉnh sửa ô đang chọn (F2)" }
    ,"sheet.select.column": { label: "Chọn cột", tooltip: "Chọn toàn bộ cột hiện tại (Ctrl+Space)" }
    ,"sheet.select.row": { label: "Chọn hàng", tooltip: "Chọn toàn bộ hàng hiện tại (Shift+Space)" }
    ,"sheet.cell.bold": { label: "Đậm", tooltip: "Chữ đậm (Ctrl+B)" }
    ,"sheet.font.family": { label: "Phông chữ", tooltip: "Chọn phông chữ cho ô" }
    ,"sheet.font.size": { label: "Cỡ chữ", tooltip: "Chọn cỡ chữ cho ô" }
    ,"sheet.font.grow": { label: "Tăng cỡ chữ", tooltip: "Tăng cỡ chữ theo nấc chuẩn" }
    ,"sheet.font.shrink": { label: "Giảm cỡ chữ", tooltip: "Giảm cỡ chữ theo nấc chuẩn" }
    ,"sheet.cell.alignTop": { label: "Căn trên", tooltip: "Căn nội dung lên trên ô" }
    ,"sheet.cell.alignMiddle": { label: "Căn giữa dọc", tooltip: "Căn nội dung vào giữa ô theo chiều dọc" }
    ,"sheet.cell.alignBottom": { label: "Căn dưới", tooltip: "Căn nội dung xuống dưới ô" }
    ,"sheet.cell.wrapText": { label: "Ngắt dòng tự động", tooltip: "Tự động xuống dòng theo độ rộng cột" }
    ,"sheet.cell.indentIncrease": { label: "Tăng thụt lề", tooltip: "Tăng thụt lề nội dung ô" }
    ,"sheet.cell.indentDecrease": { label: "Giảm thụt lề", tooltip: "Giảm thụt lề nội dung ô" }
    ,"sheet.format.quickCategory": { label: "Định dạng số", tooltip: "Chọn nhanh loại định dạng số" }
    ,"sheet.format.increaseDecimal": { label: "Tăng số thập phân", tooltip: "Hiển thị thêm một chữ số thập phân" }
    ,"sheet.format.decreaseDecimal": { label: "Giảm số thập phân", tooltip: "Hiển thị bớt một chữ số thập phân" }
    ,"sheet.cell.italic": { label: "Nghiêng", tooltip: "Chữ nghiêng (Ctrl+I)" }
    ,"sheet.cell.underline": { label: "Gạch chân", tooltip: "Gạch chân (Ctrl+U)" }
    ,"sheet.cell.alignLeft": { label: "Căn trái", tooltip: "Căn lề trái" }
    ,"sheet.cell.alignCenter": { label: "Căn giữa", tooltip: "Căn lề giữa" }
    ,"sheet.cell.alignRight": { label: "Căn phải", tooltip: "Căn lề phải" }
    ,"sheet.cell.merge": { label: "Trộn ô", tooltip: "Trộn các ô đã chọn và căn giữa" }
    ,"sheet.cell.borders": { label: "Viền ô", tooltip: "Kẻ đường viền khung ô" }
    ,"sheet.cell.fillColor": { label: "Màu nền", tooltip: "Tô màu nền ô tính" }
    ,"sheet.cell.textColor": { label: "Màu chữ", tooltip: "Đổi màu chữ trong ô" }
    ,"sheet.format.cellsDialog": { label: "Định dạng ô...", tooltip: "Mở hộp thoại định dạng ô (Ctrl+1)" }
    ,"sheet.format.currencyVND": { label: "Tiền tệ VNĐ", tooltip: "Định dạng tiền tệ VNĐ (Ctrl+Shift+4 hoặc Ctrl+Shift+$)" }
    ,"sheet.format.percent": { label: "Phần trăm", tooltip: "Định dạng phần trăm % (Ctrl+Shift+5)" }
    ,"sheet.format.standard": { label: "Phân cách hàng nghìn", tooltip: "Dấu phẩy phân cách hàng nghìn (Ctrl+Shift+1)" }
    ,"sheet.insert.date": { label: "Chèn ngày hiện tại", tooltip: "Chèn ngày hôm nay (Ctrl+;)" }
    ,"sheet.insert.time": { label: "Chèn giờ hiện tại", tooltip: "Chèn giờ hiện tại (Ctrl+Shift+;)" }
    ,"sheet.formula.sum": { label: "AutoSum", tooltip: "Hàm tính tổng tự động AutoSum (Alt+=)" }
    ,"sheet.formula.average": { label: "Trung bình", tooltip: "Hàm tính trung bình cộng" }
    ,"sheet.formula.nameManager": { label: "Quản lý tên", tooltip: "Tạo, sửa và xóa vùng được đặt tên" }
    ,"sheet.formula.arrayEnter": { label: "Nhập công thức mảng", tooltip: "Nhập công thức mảng cho vùng đã chọn (Ctrl+Shift+Enter)" }
    ,"sheet.formula.recalculate": { label: "Tính lại toàn bộ", tooltip: "Tính lại toàn bộ công thức bảng tính (F9)" }
    ,"sheet.data.sortAsc": { label: "Sắp xếp A-Z", tooltip: "Sắp xếp dữ liệu tăng dần" }
    ,"sheet.data.sortDesc": { label: "Sắp xếp Z-A", tooltip: "Sắp xếp dữ liệu giảm dần" }
    ,"sheet.data.filter": { label: "Bộ lọc", tooltip: "Bật/tắt chế độ lọc AutoFilter (Ctrl+Shift+L)" }
    ,"sheet.format.conditional": { label: "Định dạng có điều kiện", tooltip: "Tô nổi bật các ô theo giá trị hoặc trạng thái trống" }
    ,"sheet.data.validation": { label: "Kiểm tra dữ liệu", tooltip: "Tạo danh sách lựa chọn hoặc giới hạn số trong khoảng" }
    ,"sheet.data.pivotTable": { label: "Bảng tổng hợp", tooltip: "Tạo Pivot Table từ vùng dữ liệu đang chọn" }
    ,"sheet.data.pivotRefresh": { label: "Làm mới Pivot", tooltip: "Tính lại Pivot Table từ dữ liệu nguồn" }
    ,"sheet.view.toggleFormulas": { label: "Hiện công thức", tooltip: "Hiển thị công thức thay vì kết quả (Ctrl+`)" }
    ,"sheet.view.freezePanes": { label: "Cố định hàng/cột", tooltip: "Cố định hàng 1 và cột A khi cuộn (Freeze Panes)" }
    ,"sheet.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị bảng tính" }
    ,"sheet.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị bảng tính" }
    ,"sheet.view.zoomReset": { label: "100%", tooltip: "Đặt lại tỉ lệ hiển thị 100%" }
    ,"sheet.view.gridlines": { label: "Đường lưới", tooltip: "Ẩn hoặc hiện đường viền ô" }
    ,"sheet.view.headings": { label: "Tiêu đề", tooltip: "Ẩn hoặc hiện tiêu đề hàng và cột" }
    ,"sheet.review.commentInsert": { label: "Ghi chú mới", tooltip: "Thêm, sửa hoặc xóa ghi chú của ô đang chọn" }
    ,"sheet.page.setPrintArea": { label: "Đặt vùng in", tooltip: "Đặt vùng đang chọn làm vùng in" }
    ,"sheet.page.clearPrintArea": { label: "Xóa vùng in", tooltip: "Xóa vùng in của trang tính hiện tại" }
    ,"sheet.page.insertPageBreak": { label: "Chèn ngắt trang", tooltip: "Chèn ngắt hàng và cột tại ô đang chọn" }
    ,"sheet.page.removePageBreak": { label: "Xóa ngắt trang", tooltip: "Xóa ngắt hàng và cột tại ô đang chọn" }
    ,"sheet.row.insert": { label: "Chèn hàng", tooltip: "Chèn thêm hàng mới (Ctrl+Shift+=)" }
    ,"sheet.col.insert": { label: "Chèn cột", tooltip: "Chèn thêm cột mới" }
    ,"sheet.row.delete": { label: "Xóa hàng", tooltip: "Xóa hàng chứa ô đang chọn" }
    ,"sheet.col.delete": { label: "Xóa cột", tooltip: "Xóa cột chứa ô đang chọn" }
    ,"sheet.chart.insert": { label: "Biểu đồ", tooltip: "Chèn biểu đồ phân tích dữ liệu" }
    ,"sheet.insert.image": { label: "Chèn ảnh", tooltip: "Chèn ảnh vào ô đang chọn" }
    ,"sheet.style.formatAsTable": { label: "Định dạng bảng", tooltip: "Định dạng vùng chọn theo kiểu bảng có màu xen kẽ" }
    ,"sheet.style.cellStyles": { label: "Kiểu ô", tooltip: "Mở thư viện kiểu ô định sẵn (Normal, Good, Bad, Neutral...)" }
    ,"sheet.edit.fillDown": { label: "Điền xuống", tooltip: "Sao chép giá trị và công thức ô trên xuống các ô dưới (Ctrl+D)" }
    ,"sheet.edit.fillRight": { label: "Điền sang phải", tooltip: "Sao chép giá trị và công thức ô bên trái sang phải (Ctrl+R)" }
    ,"sheet.edit.clearAll": { label: "Xóa tất cả", tooltip: "Xóa toàn bộ nội dung, công thức và định dạng của các ô đã chọn" }
    ,"sheet.edit.clearFormats": { label: "Xóa định dạng", tooltip: "Xóa định dạng ô và đưa về mặc định nhưng giữ nguyên nội dung" }
    ,"sheet.edit.clearContents": { label: "Xóa nội dung", tooltip: "Xóa nội dung và công thức của ô nhưng giữ nguyên định dạng" }
    ,"slides.review.commentInsert": { label: "Nhận xét mới", tooltip: "Thêm nhận xét cho trang chiếu hiện tại" }
    ,"slides.slide.new": { label: "Trang mới", tooltip: "Chèn trang chiếu mới (Ctrl+M)" }
    ,"slides.layout.apply": { label: "Bố cục", tooltip: "Thay đổi bố cục trang chiếu (Tiêu đề, Nội dung, Hai cột, Trống)" }
    ,"slides.layout.select": { label: "Chọn bố cục", tooltip: "Mở hộp thoại chọn bố cục trang chiếu" }
    ,"slides.slide.duplicate": { label: "Nhân đôi", tooltip: "Nhân đôi trang chiếu đang chọn (Ctrl+D)" }
    ,"slides.slide.delete": { label: "Xóa trang", tooltip: "Xóa trang chiếu đang chọn (Delete)" }
    ,"slides.text.insert": { label: "Hộp văn bản", tooltip: "Chèn khung văn bản mới" }
    ,"slides.shape.insert": { label: "Hình khối", tooltip: "Chèn hình chữ nhật, tròn, mũi tên" }
    ,"slides.diagram.insert": { label: "Sơ đồ", tooltip: "Chèn sơ đồ quy trình, chu kỳ hoặc phân cấp" }
    ,"slides.image.insert": { label: "Hình ảnh", tooltip: "Chèn ảnh minh họa từ máy tính" }
    ,"slides.media.insertVideo": { label: "Video", tooltip: "Chèn video từ máy tính" }
    ,"slides.media.insertAudio": { label: "Âm thanh", tooltip: "Chèn âm thanh từ máy tính" }
    ,"slides.master.apply": { label: "Mẫu Slide Master", tooltip: "Áp dụng mẫu Slide Master đồng bộ font, màu, logo cho toàn bộ trang chiếu" }
    ,"slides.design.themeGallery": { label: "Chủ đề", tooltip: "Chọn chủ đề thiết kế cho toàn bộ bản trình chiếu" }
    ,"slides.design.slideSize": { label: "Kích thước trang chiếu", tooltip: "Chọn tỷ lệ trang chiếu 16:9 hoặc 4:3" }
    ,"slides.transition.apply": { label: "Chuyển tiếp", tooltip: "Hiệu ứng chuyển trang chiếu (Fade, Slide, Zoom, Flip)" }
    ,"slides.animation.apply": { label: "Hiệu ứng đối tượng", tooltip: "Thiết lập hiệu ứng xuất hiện (Fade In, Fly In, Zoom In) cho đối tượng" }
    ,"slides.notes.toggle": { label: "Ghi chú thuyết trình", tooltip: "Bật/tắt khung ghi chú người thuyết trình dưới trang chiếu" }
    ,"slides.view.slideSorter": { label: "Bộ sắp xếp trang", tooltip: "Xem toàn bộ trang chiếu dạng lưới và kéo thả để sắp xếp" }
    ,"slides.show.startFromBegin": { label: "Từ đầu", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" }
    ,"slides.show.startFromCurrent": { label: "Từ trang này", tooltip: "Trình chiếu từ trang hiện tại (Shift+F5)" }
    ,"slides.show.presenterMode": { label: "Chế độ Presenter", tooltip: "Trình chiếu chế độ Người thuyết trình kèm ghi chú và đồng hồ (Alt+F5)" }
    ,"slides.show.rehearseTimings": { label: "Tập dượt hẹn giờ", tooltip: "Trình chiếu và đo thời gian thật ở mỗi trang, có thể lưu lại làm mốc thời gian" }
    ,"slides.shape.group": { label: "Nhóm đối tượng", tooltip: "Nhóm các đối tượng đang chọn thành một khối (Ctrl+G)" }
    ,"slides.shape.ungroup": { label: "Bỏ nhóm", tooltip: "Tách nhóm đối tượng đang chọn (Ctrl+Shift+G)" }
    ,"slides.nav.firstSlide": { label: "Trang đầu tiên", tooltip: "Về trang chiếu đầu tiên (Ctrl+Home)" }
    ,"slides.nav.lastSlide": { label: "Trang cuối cùng", tooltip: "Đến trang chiếu cuối cùng (Ctrl+End)" }
    ,"slides.nav.prevSlide": { label: "Trang trước", tooltip: "Về trang chiếu trước (Page Up)" }
    ,"slides.nav.nextSlide": { label: "Trang sau", tooltip: "Đến trang chiếu sau (Page Down)" }

    ,// VN Writer Commands
    "writer.text.bold": { label: "Đậm", tooltip: "Chữ đậm (Ctrl+B)" },
    "writer.text.italic": { label: "Nghiêng", tooltip: "Chữ nghiêng (Ctrl+I)" },
    "writer.text.underline": { label: "Gạch chân", tooltip: "Gạch chân chữ (Ctrl+U)" },
    "writer.text.strike": { label: "Gạch ngang", tooltip: "Gạch ngang chữ" },
    "writer.font.grow": { label: "Tăng cỡ chữ", tooltip: "Tăng cỡ chữ nhanh (Ctrl+Shift+>)" },
    "writer.font.shrink": { label: "Giảm cỡ chữ", tooltip: "Giảm cỡ chữ nhanh (Ctrl+Shift+<)" },
    "writer.text.subscript": { label: "Chỉ số dưới", tooltip: "Chỉ số dưới X₂ (Ctrl+=)" },
    "writer.text.superscript": { label: "Chỉ số trên", tooltip: "Chỉ số trên X² (Ctrl+Shift++)" },
    "writer.text.clearFormat": { label: "Xóa định dạng", tooltip: "Xóa toàn bộ định dạng về mặc định (Ctrl+Space)" },
    "writer.font.family": { label: "Phông chữ", tooltip: "Chọn phông chữ" },
    "writer.font.size": { label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" },
    "writer.style.apply": { label: "Kiểu dáng", tooltip: "Áp dụng kiểu đoạn văn (Normal, Heading 1, 2, 3, Quote, Emphasis)" },
    "writer.style.gallery": { label: "Thư viện kiểu", tooltip: "Mở thư viện kiểu định dạng trực quan (Styles Gallery)" },
    "writer.design.themeGallery": { label: "Chủ đề văn bản", tooltip: "Mở thư viện chủ đề định dạng tài liệu (Document Themes)" },
    "writer.color.text": { label: "Màu chữ", tooltip: "Đổi màu phông chữ" },
    "writer.color.highlight": { label: "Màu nền chữ", tooltip: "Tô màu nền văn bản" },
    "writer.para.alignLeft": { label: "Căn trái", tooltip: "Căn lề trái (Ctrl+L)" },
    "writer.para.alignCenter": { label: "Căn giữa", tooltip: "Căn lề giữa (Ctrl+E)" },
    "writer.para.alignRight": { label: "Căn phải", tooltip: "Căn lề phải (Ctrl+R)" },
    "writer.para.justify": { label: "Căn đều", tooltip: "Căn đều hai bên (Ctrl+J)" },
    "writer.para.spacing1": { label: "Giãn dòng 1.0", tooltip: "Khoảng cách dòng 1.0 (Ctrl+1)" },
    "writer.para.spacing15": { label: "Giãn dòng 1.5", tooltip: "Khoảng cách dòng 1.5 (Ctrl+5)" },
    "writer.para.spacing2": { label: "Giãn dòng 2.0", tooltip: "Khoảng cách dòng 2.0 (Ctrl+2)" },
    "writer.list.bullet": { label: "Dấu đầu dòng", tooltip: "Tạo danh sách dấu chấm tròn" },
    "writer.list.numbered": { label: "Đánh số", tooltip: "Tạo danh sách đánh số thứ tự" },
    "writer.para.indentInc": { label: "Thụt lề", tooltip: "Tăng khoảng cách thụt lề đoạn văn (Ctrl+M)" },
    "writer.para.indentDec": { label: "Giảm thụt lề", tooltip: "Giảm khoảng cách thụt lề đoạn văn (Ctrl+Shift+M)" },
    "writer.para.moveUp": { label: "Di chuyển đoạn lên", tooltip: "Di chuyển đoạn văn lên trên (Alt+Shift+Up)" },
    "writer.para.moveDown": { label: "Di chuyển đoạn xuống", tooltip: "Di chuyển đoạn văn xuống dưới (Alt+Shift+Down)" },
    "writer.style.normal": { label: "Kiểu Thường", tooltip: "Áp dụng kiểu Normal chuẩn (Ctrl+Shift+N)" },
    "writer.text.changeCase": { label: "Đổi chữ hoa/thường", tooltip: "Chuyển đổi chữ hoa / thường / Tiêu đề (Shift+F3)" },
    "writer.para.sort": { label: "Sắp xếp", tooltip: "Sắp xếp danh sách hoặc đoạn văn theo A–Z" },
    "writer.para.showFormattingMarks": { label: "Hiện/ẩn ký tự định dạng", tooltip: "Hiện hoặc ẩn dấu đoạn và xuống dòng" },
    "writer.para.shading": { label: "Tô nền đoạn", tooltip: "Tô màu nền đoạn văn hoặc ô bảng" },
    "writer.para.borders": { label: "Viền đoạn", tooltip: "Chọn viền đoạn văn hoặc ô bảng" },
    "writer.table.insert": { label: "Bảng biểu", tooltip: "Chèn bảng mới vào văn bản" },
    "writer.image.insert": { label: "Hình ảnh", tooltip: "Chèn hình ảnh từ máy tính" },
    "writer.shape.insert": { label: "Hình khối", tooltip: "Chèn hình khối cơ bản (chữ nhật, hình tròn, mũi tên, đường thẳng)" },
    "writer.diagram.insert": { label: "Sơ đồ SmartArt", tooltip: "Chèn sơ đồ quy trình, chu trình hoặc phân cấp" },
    "writer.chart.insert": { label: "Biểu đồ", tooltip: "Chèn biểu đồ minh họa dữ liệu" },
    "writer.page.break": { label: "Ngắt trang", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
    "writer.header.insert": { label: "Đầu trang", tooltip: "Chèn tiêu đề đầu trang (Header)" },
    "writer.footer.insert": { label: "Chân trang", tooltip: "Chèn tiêu đề chân trang (Footer)" },
    "writer.comment.insert": { label: "Thêm ghi chú", tooltip: "Thêm ghi chú vào đoạn văn bản đang chọn (Ctrl+Alt+M)" },
    "writer.trackChanges.toggle": { label: "Theo dõi thay đổi", tooltip: "Bật/tắt đánh dấu nội dung thêm và xóa (Ctrl+Shift+E)" },
    "writer.trackChanges.acceptAll": { label: "Chấp nhận thay đổi", tooltip: "Chấp nhận toàn bộ thay đổi trong tài liệu" },
    "writer.trackChanges.rejectAll": { label: "Từ chối thay đổi", tooltip: "Từ chối toàn bộ thay đổi trong tài liệu" },
    "writer.page.margins": { label: "Căn lề", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
    "writer.page.orientation": { label: "Hướng giấy", tooltip: "Khổ giấy dọc hoặc ngang" },
    "writer.page.size": { label: "Kích thước giấy", tooltip: "Chọn khổ A4, Letter, v.v." },
    "writer.page.columns": { label: "Cột", tooltip: "Chia văn bản thành nhiều cột (1, 2, 3 cột hoặc tùy chỉnh)" },
    "writer.page.columns1": { label: "1 cột", tooltip: "Định dạng toàn bộ văn bản 1 cột (Normal mặc định)" },
    "writer.page.columns2": { label: "2 cột", tooltip: "Chia nội dung văn bản thành 2 cột đều nhau" },
    "writer.page.columns3": { label: "3 cột", tooltip: "Chia nội dung văn bản thành 3 cột đều nhau" },
    "writer.page.watermark": { label: "Hình mờ", tooltip: "Thiết lập hoặc xóa hình mờ văn bản (Dự thảo, Mật, Khẩn...)" },
    "writer.page.border": { label: "Viền trang", tooltip: "Thiết lập viền bao quanh trang tài liệu" },
    "writer.file.printPreview": { label: "Xem trước khi in", tooltip: "Xem trước khi in (Ctrl+F2)" },
    "writer.reference.tocInsert": { label: "Mục lục tự động", tooltip: "Chèn mục lục tự động từ các tiêu đề Heading" },
    "writer.reference.tocUpdate": { label: "Cập nhật mục lục", tooltip: "Cập nhật lại mục lục tài liệu" },
    "writer.reference.footnoteInsert": { label: "Chú thích trang", tooltip: "Chèn chú thích cuối trang (Footnote) (Ctrl+Alt+F)" },
    "writer.reference.endnoteInsert": { label: "Chú thích cuối", tooltip: "Chèn chú thích cuối tài liệu (Endnote) (Ctrl+Alt+D)" },
    "writer.mailMerge.open": { label: "Nguồn dữ liệu", tooltip: "Mở bảng nhập dữ liệu trộn thư (CSV)" },
    "writer.mailMerge.insertField": { label: "Chèn trường", tooltip: "Chèn trường trộn thư tại vị trí con trỏ" },
    "writer.mailMerge.preview": { label: "Xem trước kết quả", tooltip: "Bật/tắt xem trước bản ghi trộn thư" },
    "writer.mailMerge.prevRecord": { label: "Bản ghi trước", tooltip: "Chuyển tới bản ghi trước" },
    "writer.mailMerge.nextRecord": { label: "Bản ghi sau", tooltip: "Chuyển tới bản ghi tiếp theo" },
    "writer.mailMerge.finish": { label: "Hoàn tất & Tạo tài liệu", tooltip: "Hoàn tất trộn và tạo tài liệu kết quả cho toàn bộ bản ghi" }
  },
  writerRibbon: {
    tab: {
      home: "Trang đầu",
      insert: "Chèn",
      design: "Thiết kế",
      layout: "Bố cục",
      references: "Tham chiếu",
      mailings: "Trộn thư",
      review: "Đánh giá",
      ai: "Trợ lý VN AI"
    },
    group: {
      clipboard: "Bảng nhớ tạm",
      font: "Phông chữ",
      styles: "Kiểu dáng",
      paragraph: "Đoạn văn",
      quickInsert: "Chèn nhanh",
      pages: "Trang văn bản",
      tables: "Bảng biểu",
      tablesIllustrations: "Bảng biểu & Hình",
      illustrations: "Minh họa",
      links: "Liên kết",
      documentFormatting: "Định dạng tài liệu",
      headerFooter: "Đầu trang / Chân trang",
      tocNotes: "Mục lục & Chú thích",
      pageSetup: "Thiết lập trang",
      pageBackground: "Nền & Viền trang",
      print: "In ấn",
      tableOfContents: "Mục lục",
      footnotes: "Chú thích",
      startMerge: "Bắt đầu trộn",
      writeInsert: "Viết & Chèn trường",
      previewResults: "Xem trước kết quả",
      finishMerge: "Hoàn tất",
      proofread: "Chính tả & Ngữ pháp",
      comments: "Ghi chú",
      tracking: "Theo dõi thay đổi",
      aiFeatures: "Tính năng AI thuần Việt"
    }
  },
  writerDialogs: {
    pageSetup: {
      title: "Thiết lập trang",
      paperSize: "Khổ giấy",
      orientation: "Hướng giấy",
      portrait: "Dọc (Portrait)",
      landscape: "Ngang (Landscape)",
      marginTop: "Lề trên",
      marginBottom: "Lề dưới",
      marginLeft: "Lề trái",
      marginRight: "Lề phải",
      apply: "Áp dụng",
      cancel: "Hủy bỏ",
      close: "Đóng"
    },
    columns: {
      title: "Chia cột văn bản (Columns)",
      presetsTitle: "Mẫu chia cột chuẩn:",
      presetOne: "Một cột",
      presetTwo: "Hai cột",
      presetThree: "Ba cột",
      colCount: "Số cột (1 – 4):",
      colGap: "Khoảng cách giữa các cột (mm):",
      colRule: "Đường kẻ phân cách cột (Line between)",
      preview: "Xem trước",
      removeColumns: "Bỏ chia cột (1 cột)",
      apply: "Áp dụng",
      cancel: "Hủy bỏ"
    },
    watermark: {
      title: "Hình mờ (Watermark)",
      suggestionsTitle: "Gợi ý văn bản hành chính Việt Nam:",
      textLabel: "Nội dung hình mờ:",
      placeholder: "Nhập chữ hình mờ (VD: DỰ THẢO, MẬT)...",
      colorLabel: "Màu sắc:",
      angleLabel: "Góc xoay:",
      angleDiagonal: "Chéo 45° (Chuẩn)",
      angleDiagonalNeg: "Chéo −45°",
      angleHorizontal: "Nằm ngang 0°",
      opacityLabel: "Độ mờ (Opacity):",
      removeWatermark: "Xóa hình mờ",
      apply: "Áp dụng",
      cancel: "Hủy bỏ",
      suggestions: {
        draft: "DỰ THẢO",
        secret: "MẬT",
        topSecret: "TUYỆT MẬT",
        urgent: "KHẨN",
        copy: "BẢN SAO"
      },
      colors: {
        red: "Đỏ nhạt",
        gray: "Xám tiêu chuẩn",
        blue: "Xanh dương",
        amber: "Vàng hổ phách"
      }
    },
    pageBorder: {
      title: "Viền trang (Page Border)",
      styleLabel: "Kiểu đường viền:",
      widthLabel: "Độ dày viền:",
      colorLabel: "Màu sắc viền:",
      previewTitle: "Xem trước viền trang",
      sampleText: "Nội dung<br>văn bản<br>mẫu",
      removeBorder: "Xóa viền trang",
      apply: "Áp dụng",
      cancel: "Hủy bỏ",
      styles: {
        solid: "Đường nét liền (Solid)",
        dashed: "Đường nét đứt (Dashed)",
        double: "Đường nét đôi (Double)",
        none: "Không có viền (None)"
      },
      widths: {
        thin: "1 pt (Mỏng)",
        standard: "2 pt (Tiêu chuẩn)",
        bold: "3 pt (Đậm)",
        veryBold: "6 pt (Rất đậm)"
      },
      colors: {
        blueOffice: "Xanh VN Office",
        charcoal: "Đen than",
        gray: "Xám trung tính",
        adminRed: "Đỏ hành chính",
        green: "Xanh lá cây"
      }
    },
    mailMerge: {
      dataSourceTitle: "Trộn thư — Nguồn dữ liệu (CSV)",
      pastePrompt: "Dán dữ liệu bảng tính dạng <strong>CSV</strong> vào khung bên dưới (dòng đầu tiên là tiêu đề các cột):",
      pasteSampleBtn: "📋 Dán dữ liệu mẫu",
      noData: "Chưa có dữ liệu",
      invalidCsv: "CSV chưa hợp lệ (thiếu tiêu đề cột)",
      foundData: "Đã tìm thấy: {count} cột | {records} bản ghi",
      saveDataSource: "Lưu nguồn dữ liệu",
      insertFieldTitle: "Chèn trường trộn thư",
      selectFieldPrompt: "Chọn trường dữ liệu muốn chèn vào tài liệu:",
      insertBtn: "Chèn trường",
      noDataWarningTitle: "Xem trước trộn thư",
      noDataWarningMsg: "Chưa có nguồn dữ liệu trộn thư. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV trước.",
      finishTitle: "Hoàn tất trộn thư",
      finishNoData: "Chưa có nguồn dữ liệu trộn thư để tạo tài liệu. Vui lòng mở 'Nguồn dữ liệu' để dán bảng CSV.",
      finishNoFields: "Tài liệu hiện tại chưa chứa trường trộn thư nào. Hãy dùng lệnh 'Chèn trường' để chèn ít nhất một trường trộn.",
      finishSuccess: "Đã hoàn tất trộn thư thành công {count} bản ghi vào tài liệu. Bạn có thể xem trước khi in hoặc xuất tệp."
    },
    printPreview: {
      title: "Xem trước khi in",
      printBtn: "In tài liệu",
      printTooltip: "In tài liệu (Ctrl+P)",
      prevPage: "◀ Trang trước",
      nextPage: "Trang sau ▶",
      pagePrefix: "Trang ",
      fitPage: "Vừa trang",
      closeTooltip: "Đóng xem trước (Esc)",
      paperSize: "Khổ",
      margins: "Lề"
    },
    styleGallery: {
      title: "Thư viện Kiểu dáng (Styles Gallery)",
      hint: "Nhấp để áp dụng ngay",
      normal: { label: "Normal", sublabel: "Văn bản thường", desc: "Văn bản thường, phông chữ chuẩn 14pt căn đều hai bên (Nghị định 30/2020/NĐ-CP)" },
      h1: { label: "Tiêu đề 1", sublabel: "Heading 1", desc: "Tiêu đề cấp 1: Chữ hoa, in đậm, căn giữa, cỡ 16pt (QUYẾT ĐỊNH, CHỈ THỊ...)" },
      h2: { label: "Tiêu đề 2", sublabel: "Heading 2", desc: "Tiêu đề cấp 2: Chữ thường in đậm, cỡ 14pt (Điều 1, Mục I...)" },
      h3: { label: "Tiêu đề 3", sublabel: "Heading 3", desc: "Tiêu đề cấp 3: In đậm nghiêng, cỡ 13pt (Khoản 1, Điểm a...)" },
      quote: { label: "Trích dẫn", sublabel: "Quote", desc: "Khối trích dẫn: In nghiêng, thụt lề 24pt, viền xanh bên trái" },
      emphasis: { label: "Nhấn mạnh", sublabel: "Emphasis", desc: "Đoạn nhấn mạnh: In đậm, in nghiêng, màu sắc nổi bật" }
    },
    comments: {
      noSelectionTitle: "Chưa chọn văn bản",
      noSelectionMsg: "Hãy bôi đen đoạn văn bản trong nội dung tài liệu trước khi thêm ghi chú.",
      addCommentTitle: "Thêm ghi chú",
      addCommentPlaceholder: "Nhập nội dung ghi chú...",
      addCommentBtn: "Thêm ghi chú",
      panelLabel: "Ghi chú tài liệu",
      openCommentAria: "Mở ghi chú cho: {text}",
      placeholderHeader: "Nhấp để nhập tiêu đề đầu trang (Header)...",
      placeholderFooter: "Nhấp để nhập tiêu đề chân trang (Footer)..."
    },
    hyperlink: {
      title: "Chèn Liên Kết (Hyperlink)",
      message: "Nhập địa chỉ liên kết (URL):"
    },
    toc: {
      title: "MỤC LỤC",
      updateBtn: "🔄 Cập nhật",
      updateTooltip: "Cập nhật mục lục",
      deleteTooltip: "Xóa mục lục",
      empty: "Chưa có tiêu đề nào trong tài liệu. Hãy định dạng các đoạn văn bằng Kiểu dáng Heading 1, 2 hoặc 3 rồi cập nhật lại mục lục."
    },
    notes: {
      footnotePlaceholder: "Nhập nội dung chú thích...",
      endnotePlaceholder: "Nhập nội dung chú thích cuối...",
      endnotesTitle: "CHÚ THÍCH CUỐI TÀI LIỆU",
      deleteFootnote: "Xóa chú thích",
      deleteEndnote: "Xóa chú thích cuối",
      jumpToNote: "Nhấp để chuyển đến chú thích",
      jumpToEndnote: "Nhấp để chuyển đến chú thích cuối",
      jumpToRef: "Chuyển tới vị trí tham chiếu"
    }
  },
  sheetFormatCells: {
    dialogTitle: "Định dạng ô (Format Cells)",
    tabNumber: "Số",
    tabAlignment: "Căn chỉnh",
    tabFont: "Phông chữ",
    tabBorder: "Đường viền",
    tabFill: "Tô màu",
    tabProtection: "Bảo vệ",
    categoryLabel: "Thể loại:",
    sampleLabel: "Mẫu (Sample):",
    catGeneral: "Chung (General)",
    catNumber: "Số (Number)",
    catCurrency: "Tiền tệ (Currency)",
    catAccounting: "Kế toán (Accounting)",
    catDate: "Ngày tháng (Date)",
    catPercentage: "Phần trăm (Percentage)",
    catScientific: "Khoa học (Scientific)",
    catText: "Văn bản (Text)",
    catCustom: "Tùy chỉnh (Custom)",
    generalDesc: "Các ô định dạng Chung không có định dạng số cụ thể. Số và chữ sẽ được hiển thị như khi nhập.",
    decimalPlaces: "Số chữ số thập phân:",
    useThousands: "Sử dụng dấu phân cách hàng nghìn (1,000)",
    negativeNumbers: "Số âm:",
    currencySymbol: "Ký hiệu tiền tệ:",
    noSymbol: "(Không có)",
    accountingTitle: "Đặc điểm định dạng Kế toán:",
    accountingRule1: "Ký hiệu tiền tệ luôn căn sát lề trái ô tính.",
    accountingRule2: "Giá trị số luôn căn sát lề phải để thẳng hàng dấu thập phân.",
    accountingRule3: "Số 0 hiển thị thành dấu gạch ngang (-).",
    accountingRule4: "Số âm không dùng dấu trừ mà đặt trong dấu ngoặc đơn: (1,234.00).",
    dateType: "Kiểu hiển thị ngày tháng (Type):",
    dateLocale: "Vùng/Ngôn ngữ: Tiếng Việt (Việt Nam)",
    percentageDesc: "Định dạng Phần trăm nhân giá trị ô với 100 và hiển thị kết quả kèm ký hiệu %. Giá trị lưu trữ gốc không đổi (ví dụ: 0.5 hiển thị là 50%). Khi gõ số mới vào ô đã định dạng %, số đó tự động chia cho 100.",
    textDesc: "Các ô định dạng Văn bản được xử lý như chuỗi ký tự thô, ngay cả khi ô chứa số. Ô sẽ được căn lề trái tự nhiên và các hàm tính toán tổng số học như SUM sẽ bỏ qua ô này giống chuẩn Excel.",
    customType: "Mã định dạng (Type):"
  }
};
