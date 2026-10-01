/**
 * 3T Office Platform — Vietnamese Strings Catalog (ESM)
 */

export const viStrings = {
  app: {
    suiteName: "3T Office",
    writer: "3T Doc (Soạn thảo)",
    sheet: "3T Sheet (Bảng tính)",
    slides: "3T Slide (Trình chiếu)"
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
    switchLanguage: "Ngôn ngữ",
    toggleTheme: "Chế độ Tối / Sáng",
    themeDark: "Giao diện Tối",
    themeLight: "Giao diện Sáng",
    notice: "Thông báo",
    confirm: "Đồng ý",
    featurePendingNotice: "Tính năng này đang được hoàn thiện và sẽ có trong bản cập nhật tới."
  },
  help: {
    panelTitle: "Trợ giúp",
    searchPlaceholder: "Tìm tính năng, ví dụ: Đếm từ",
    topicList: "Danh sách chủ đề",
    noResults: "Không tìm thấy hướng dẫn phù hợp.",
    pickTopic: "Chọn một tính năng ở danh sách trên để xem hướng dẫn.",
    location: "Vị trí",
    stepsHeading: "Cách dùng"
  },
  aiAssistant: {
    title: "Trợ lý 3T AI", provider: "Nhà cung cấp AI", local: "Cục bộ (mặc định)",
    activeProvider: "Đang dùng thực tế", configureKey: "Cấu hình API key", apiKey: "API key",
    showKey: "Hiện key", hideKey: "Ẩn key", saveConsent: "Đồng ý & Lưu key", removeKey: "Xóa key",
    send: "Gửi", stop: "Dừng", analyzing: "Đang phân tích...", stopped: "Đã dừng yêu cầu.",
    keySaved: "Đã lưu key trên máy này.", keyRemoved: "Đã xóa key khỏi máy này.",
    disclosureOpenai: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ OpenAI. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác.",
    disclosureGemini: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ Google. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác.",
    disclosureClaude: "Khi dùng chế độ này, dữ liệu tài liệu sẽ được gửi tới máy chủ Anthropic. Key chỉ lưu trên máy này và không được gửi tới nơi nào khác.",
    translateTitle: "Dịch thuật",
    translateMessage: "Chọn ngôn ngữ đích để dịch đoạn văn bản được chọn (hoặc toàn bộ tài liệu nếu không chọn gì).",
    translateResult: "Kết quả dịch thuật",
    translateReplace: "Thay thế vùng chọn",
    translateInsertBelow: "Chèn bên dưới",
    draftTitle: "AI Viết nháp",
    draftMessage: "Mô tả nội dung bạn muốn AI soạn thảo (ví dụ: \"soạn thư mời họp giao ban tuần\", \"soạn hợp đồng thuê nhà cơ bản\").",
    draftPlaceholder: "Mô tả yêu cầu viết nháp...",
    draftWarning: "Bản nháp do AI tạo — vui lòng tự kiểm tra lại nội dung trước khi sử dụng, đặc biệt với hợp đồng/văn bản có giá trị pháp lý.",
    explainFormulaTitle: "Giải thích công thức",
    explainFormulaNoFormula: "Ô đang chọn không chứa công thức.",
    formulaFromDescTitle: "Tạo công thức từ mô tả",
    formulaFromDescMessage: "Mô tả công thức bạn muốn tạo bằng ngôn ngữ tự nhiên (ví dụ: \"tính tổng cột B khi cột A lớn hơn 100\").",
    formulaFromDescPlaceholder: "Mô tả công thức cần tạo...",
    formulaFromDescPreview: "Xem trước công thức",
    formulaFromDescApply: "Áp dụng vào ô đang chọn",
    formulaFromDescInvalid: "Công thức tạo ra không tương thích với 3T Sheet. Vui lòng thử lại với mô tả khác.",
    formulaFromDescUnsupported: "Công thức chứa hàm 3T Sheet chưa hỗ trợ:"
  },
  backstage: {
    home: "Trang chủ",
    new: "Tạo mới (Ctrl+N)",
    open: "Mở tệp (Ctrl+O)",
    save: "Lưu tài liệu (Ctrl+S)",
    saveAs: "Lưu bản sao (F12)",
    print: "In ấn (Ctrl+P)",
    printNow: "In ngay",
    exportPdf: "Xuất tệp PDF",
    about: "Giới thiệu 3T Office",
    templateTitle: "Mẫu văn bản tiêu chuẩn Việt Nam",
    templateSubtitle: "Khởi tạo tài liệu mới nhanh chóng theo mẫu quy chuẩn hành chính và doanh nghiệp",
    recentTitle: "Tài liệu mở gần đây",
    recentColName: "TÊN TÀI LIỆU",
    recentColFormat: "VỊ TRÍ / ĐỊNH DẠNG",
    clearRecent: "Xóa lịch sử",
    removeRecent: "Gỡ khỏi danh sách",
    removeRecentTooltip: "Gỡ tệp này khỏi danh sách gần đây",
    fileNotFoundTitle: "Không tìm thấy tệp",
    fileNotFoundMessage: "Tệp \"{name}\" không còn tồn tại tại vị trí cũ hoặc đã bị xóa. Bạn có muốn gỡ tệp này khỏi danh sách gần đây không?",
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
    whatIfAnalysis: "Phân tích What-If",
    tab: { home: "Trang đầu", formulas: "Công thức", data: "Dữ liệu", insert: "Chèn", pageLayout: "Bố trí trang", review: "Xem xét", view: "Chế độ xem", help: "Trợ giúp", ai: "Trợ lý 3T AI" },
    group: { clipboard: "Bảng nhớ tạm", font: "Phông chữ", alignment: "Căn chỉnh", number: "Định dạng số", styles: "Kiểu ô", cells: "Ô", quickAnalysis: "Tính toán & Dữ liệu", editing: "Chỉnh sửa", functionLibrary: "Hàm tính toán", definedNames: "Tên đã xác định", formulaAuditing: "Kiểm tra công thức", calculation: "Tính toán", sortFilter: "Sắp xếp & Lọc", dataTools: "Công cụ dữ liệu", outline: "Dàn bài", pivotTable: "Bảng tổng hợp", tables: "Bảng", illustrations: "Minh họa", charts: "Biểu đồ", sparklines: "Biểu đồ thu nhỏ", links: "Liên kết", text: "Văn bản", printArea: "Vùng in", pageBreaks: "Ngắt trang", pageSetup: "Thiết lập trang", scaleToFit: "Vừa trang", sheetOptions: "Tùy chọn trang tính", proofing: "Chứng minh", comments: "Ghi chú", protection: "Bảo vệ", workbookViews: "Chế độ xem bảng tính", show: "Hiển thị", zoom: "Thu phóng", window: "Cửa sổ", macro: "Macro", help: "Trợ giúp", aiAnalysis: "Phân tích dữ liệu AI" },
    editing: { fill: "Điền", clear: "Xóa" },
    cells: { format: "Định dạng" },
    alignment: { orientation: "Hướng chữ" },
    window: { freezePanes: "Cố định ô" }
  },
  sheetFormulaEntry: {
    status: { enter: "Nhập", edit: "Sửa", point: "Trỏ" },
    referenceHint: "Chọn hoặc kéo qua ô để chèn tham chiếu; F2 chuyển giữa Sửa và Trỏ.",
    formulaBarLabel: "Thanh công thức 3T Sheet"
  },
  slidesRibbon: {
    tab: { home: "Trang đầu", insert: "Chèn", design: "Thiết kế", transitions: "Chuyển tiếp", animations: "Hoạt hình", slideshow: "Trình chiếu", review: "Đánh giá", view: "Chế độ xem", help: "Trợ giúp", ai: "Trợ lý 3T AI" },
    group: { slides: "Trang chiếu", clipboard: "Bảng nhớ tạm", font: "Phông chữ", paragraph: "Đoạn văn", drawing: "Đối tượng vẽ", editing: "Chỉnh sửa", imagesObjects: "Hình ảnh & Đối tượng", images: "Hình ảnh", illustrations: "Minh họa", tables: "Bảng", text: "Văn bản", symbols: "Ký hiệu", media: "Đa phương tiện", themes: "Chủ đề", master: "Mẫu chủ đạo", customize: "Tùy chỉnh", transitions: "Hiệu ứng chuyển trang", animations: "Hiệu ứng đối tượng", startSlideshow: "Khởi động chiếu", presenter: "Người thuyết trình", setup: "Thiết lập", comments: "Nhận xét", proofing: "Chứng minh", presentationViews: "Dạng xem bản trình chiếu", show: "Hiển thị", zoom: "Thu phóng", window: "Cửa sổ", macro: "Macro", help: "Trợ giúp", aiContent: "Tạo nội dung thuyết trình" },
    editing: { select: "Chọn" },
    drawing: { arrange: "Sắp xếp" },
    section: "Phần"
  },
  sheetDialogs: {
    close: "Đóng", cancel: "Hủy", cancelLong: "Hủy bỏ", apply: "Áp dụng", range: "Phạm vi", rangeLabel: "Vùng:", value: "Giá trị", save: "Lưu",
    pasteSpecialTitle: "Dán đặc biệt", pasteSpecialGroup: "Dán", pasteSpecialAll: "Tất cả", pasteSpecialValues: "Chỉ giá trị", pasteSpecialFormulas: "Chỉ công thức", pasteSpecialFormats: "Chỉ định dạng", pasteSpecialTranspose: "Chuyển vị (đổi hàng/cột)",
    mergeConfirmTitle: "Trộn ô", mergeConfirmMessage: "Vùng chọn có nhiều ô chứa dữ liệu. Chỉ dữ liệu ở ô trên cùng bên trái của mỗi vùng gộp được giữ lại.", mergeConfirmOk: "Tiếp tục gộp",
    functionTitle: "Chèn Hàm (Insert Function fx)", functionCategory: "Danh mục hàm:", allCategory: "Tất cả", allFunctions: "Tất cả các hàm", mathFunctions: "Toán học & Lượng giác", statsFunctions: "Thống kê (AVERAGE, COUNT...)", logicFunctions: "Logic (IF, AND, OR...)", textFunctions: "Văn bản (CONCAT, LEN...)", dateFunctions: "Ngày & Giờ (TODAY, NOW...)", financialFunctions: "Tài chính (PMT, FV, PV...)", lookupFunctions: "Tra cứu & Tham chiếu (VLOOKUP, INDEX...)", searchFunction: "Tìm kiếm hàm:", searchPlaceholder: "Gõ tên hàm hoặc mô tả để tìm kiếm...", insertFunction: "Chèn hàm vào ô",
    errorCheckingTitle: "Kiểm tra lỗi công thức (Error Checking)", noErrorsFound: "Kiểm tra hoàn tất. Không tìm thấy ô nào có giá trị lỗi trong trang tính.", errorsFoundPrompt: "Phát hiện <strong>{count}</strong> ô có lỗi công thức trong trang tính hiện tại:", errorColCell: "Ô", errorColCode: "Mã lỗi", errorColFormula: "Công thức", errorColReason: "Nguyên nhân", calcError: "Lỗi tính toán", divZero: "Chia cho số 0 hoặc ô trống", invalidRef: "Tham chiếu ô không hợp lệ", wrongType: "Sai kiểu dữ liệu (số vs chữ)", naError: "Giá trị không tồn tại", nameError: "Tên hàm/vùng không xác định", numError: "Giá trị số ngoài phạm vi",
    watchWindowTitle: "Cửa sổ theo dõi (Watch Window)", addWatch: "Thêm ô theo dõi", deleteWatch: "Xóa theo dõi", watchWindowColBook: "Sổ làm việc", watchWindowColSheet: "Trang tính", watchWindowColName: "Tên", watchWindowColCell: "Ô", watchWindowColValue: "Giá trị", watchWindowColFormula: "Công thức", watchWindowEmpty: "Chưa có ô theo dõi nào.", addWatchTitle: "Thêm ô theo dõi", addWatchPrompt: "Chọn ô bạn muốn theo dõi giá trị:", addWatchBtn: "Thêm", deleteWatchConfirm: "Hãy chọn một hàng trong bảng để xóa theo dõi.", watchWindowCountSuffix: "ô theo dõi", watchWindowKeyboardHint: "Phím tắt: Delete để xóa, Enter để chuyển đến ô, Esc để đóng", watchWindowInvalidCoord: "Địa chỉ ô không hợp lệ.", defineNameTitle: "Đặt tên vùng (Define Name)", nameLabel: "Tên:", refersTo: "Tham chiếu đến:", useInFormulaTitle: "Dùng tên trong công thức", namePlaceholder: "Ví dụ: BangLuong, DonGia", scopeLabel: "Phạm vi:", scopeWorkbook: "Workbook (Toàn bảng tính)", invalidName: "Tên không hợp lệ hoặc đã tồn tại.", useInFormulaPrompt: "Chọn một tên để chèn vào công thức:",
    nameManagerTitle: "Trình quản lý tên", nameNew: "Thêm mới", nameEdit: "Sửa", nameDelete: "Xóa", noNamedRanges: "Chưa có vùng được đặt tên.", invalidNameOrRef: "Tên hoặc vùng tham chiếu không hợp lệ/trùng lặp.",
    newComment: "Ghi chú mới {coord}", editComment: "Sửa ghi chú {coord}", commentContent: "Nội dung ghi chú", commentPlaceholder: "Nhập ghi chú cho {coord}", author: "Tác giả", defaultAuthor: "Người dùng 3T Office", saveChanges: "Lưu thay đổi", addComment: "Thêm ghi chú", deleteComment: "Xóa ghi chú", emptyComment: "Nội dung ghi chú không được để trống.",
    spellcheckTitle: "Chính tả", spellcheckNotInDictionary: "Không có trong từ điển:", spellcheckCell: "Ô", spellcheckContext: "Nội dung ô", spellcheckSuggestions: "Gợi ý:", spellcheckNoSuggestions: "(Không có gợi ý gần)", spellcheckIgnore: "Bỏ qua", spellcheckIgnoreAll: "Bỏ qua tất cả", spellcheckAdd: "Thêm vào từ điển", spellcheckReplace: "Thay thế", spellcheckReplaceAll: "Thay thế tất cả", spellcheckClose: "Đóng", spellcheckStatus: "Lỗi {current} / {total}", spellcheckComplete: "Đã kiểm tra xong toàn bộ trang tính. Không tìm thấy lỗi chính tả.", spellcheckCompleteRemaining: "Đã kiểm tra xong. Không còn lỗi chính tả.",
    conditionalFormatting: "Định dạng có điều kiện", rule: "Quy tắc", greaterThan: "Giá trị lớn hơn", lessThan: "Giá trị nhỏ hơn", blankCell: "Ô trống", fillColor: "Màu nền", invalidNumber: "Vui lòng nhập một giá trị số hợp lệ.",
    dataValidation: "Kiểm tra dữ liệu", allow: "Cho phép", list: "Danh sách lựa chọn", numberRange: "Số trong khoảng", listValues: "Các giá trị (cách nhau bằng dấu phẩy)", listPlaceholder: "Đạt, Chưa đạt, Đang xử lý", minimum: "Tối thiểu", maximum: "Tối đa", invalidValidation: "Thông tin kiểm tra dữ liệu chưa hợp lệ.", chooseOption: "-- Chọn --", selectCellValue: "Chọn giá trị cho ô {col}{row}",
    removeDuplicatesTitle: "Xóa trùng lặp", myHeaderRow: "Dữ liệu có hàng tiêu đề", columnsToCompare: "Cột dùng để xét trùng", selectAtLeastOneColumn: "Hãy chọn ít nhất một cột.", duplicatesRemovedResult: "Đã xóa {removed} hàng trùng lặp; còn {remaining} hàng dữ liệu.",
    customSortTitle: "Sắp xếp", addLevel: "Thêm cấp", removeLevel: "Xóa cấp", sortBy: "Sắp xếp theo", thenBy: "Sau đó theo", sortByColumn: "Cột sắp xếp", sortOrder: "Thứ tự", sortAtoZ: "A → Z", sortZtoA: "Z → A",
    printPreview: {
      title: "Xem trước khi in",
      printBtn: "In tài liệu",
      prevPage: "◀ Trang trước",
      nextPage: "Trang sau ▶",
      pagePrefix: "Trang ",
      closeTooltip: "Đóng xem trước (Esc)"
    },
    subtotalTitle: "Tổng phụ", subtotalHint: "Vùng đã chọn phải có tiêu đề và được sắp xếp theo cột nhóm.", atEachChangeIn: "Mỗi khi thay đổi ở", useFunction: "Hàm", addToSubtotal: "Cộng tổng vào", selectRangeAndCol: "Hãy chọn vùng và ít nhất một cột giá trị.", subtotalResult: "Đã chèn {groups} nhóm tổng phụ và hàng tổng cộng.",
    textToColumnsTitle: "Tách văn bản thành cột", ttcMode: "Kiểu tách", ttcDelimited: "Dấu phân cách", ttcFixedWidth: "Độ rộng cố định", ttcComma: "Dấu phẩy", ttcSemicolon: "Dấu chấm phẩy", ttcSpace: "Khoảng trắng", ttcCustom: "Tùy chọn", ttcCustomChar: "Ký tự tùy chọn", ttcWidths: "Độ rộng (cách nhau bằng dấu phẩy)", ttcPreview: "Xem trước: ", selectSingleCol: "Chỉ chọn dữ liệu trong một cột.",
    resultTitle: "Kết quả", flashFillSuccess: "Flash Fill đã điền {filled} ô ({pattern}).", flashFillFailure: "Không nhận diện được mẫu. Hãy nhập 1–2 ví dụ ở cột kết quả kế bên dữ liệu nguồn.",
    pivotChartTitle: "Biểu đồ Pivot", pivotChartNeedsPivot: "Hãy chọn một trang Pivot hoặc tạo Pivot Table trước.",
    dataTableTitle: "Bảng dữ liệu", dataTableRange: "Vùng đã chọn", dataTableHint: "Đặt công thức gốc ở ô góc trên-trái; giá trị thay thế ở hàng trên và/hoặc cột trái.", rowInputCell: "Ô đầu vào theo hàng", columnInputCell: "Ô đầu vào theo cột", dataTableNeedsInput: "Hãy chọn ô đầu vào theo hàng hoặc theo cột.", dataTableDistinctInputs: "Hai ô đầu vào phải khác nhau.", dataTableRangeSize: "Vùng Bảng dữ liệu phải có ít nhất 2 hàng và 2 cột.", dataTableFormulaCorner: "Ô góc trên bên trái phải chứa công thức gốc.", scenarioManagerTitle: "Trình quản lý kịch bản", scenarios: "Kịch bản", scenarioName: "Tên kịch bản", changingCells: "Các ô thay đổi", scenarioValues: "Các giá trị (cách nhau bằng dấu phẩy)", scenarioNameExists: "Tên kịch bản đã tồn tại.", showScenario: "Hiển thị", selectScenario: "Hãy chọn một kịch bản.", add: "Thêm", edit: "Sửa", delete: "Xóa", scenarioComment: "Ghi chú", scenarioCommentPlaceholder: "Nhập ghi chú cho kịch bản...", scenarioMerge: "Gộp...", scenarioMergeTitle: "Gộp kịch bản", selectSourceSheet: "Chọn trang tính nguồn chứa kịch bản cần gộp:", merge: "Gộp", mergedCountSuccess: "Đã gộp thành công {count} kịch bản.", noScenariosFoundOnSheet: "Trang tính này không có kịch bản nào.", noOtherSheetsForMerge: "Không có trang tính khác để gộp kịch bản.", scenarioSummary: "Tóm tắt...", scenarioSummaryTitle: "Tóm tắt kịch bản", scenarioSummaryDialogTitle: "Tóm tắt kịch bản", reportType: "Kiểu báo cáo", scenarioSummaryType: "Tóm tắt kịch bản (Scenario summary)", resultCells: "Các ô kết quả", createdDate: "Thời gian tạo", currentValues: "Giá trị hiện tại", changingCellsHeader: "Các ô thay đổi:", resultCellsHeader: "Các ô kết quả:", summaryNotes: "Ghi chú: Cột Giá trị hiện tại thể hiện giá trị của các ô thay đổi tại thời điểm báo cáo Tóm tắt kịch bản được tạo. Các ô thay đổi cho mỗi kịch bản được tô đậm.", noScenariosForSummary: "Không có kịch bản nào để tạo tóm tắt.", scenarioUpdated: "Đã cập nhật kịch bản thành công.", scenarioAdded: "Đã thêm kịch bản mới thành công.", scenarioDeleted: "Đã xóa kịch bản.", scenarioApplied: "Đã hiển thị kịch bản «{name}» lên trang tính.", mergedFrom: "Gộp từ", sheetNotFound: "Trang tính nguồn không tồn tại.",
    goalSeekTitle: "Dò tìm mục tiêu", goalSeekSetCell: "Ô đặt", goalSeekToValue: "Đến giá trị", goalSeekByChangingCell: "Bằng cách đổi ô", goalSeekFind: "Tìm kết quả", goalSeekResult: "Đã tìm thấy {cell} = {value} (sai số {residual}). Chọn Đồng ý để áp dụng.",
    sparklineColumn: "Biểu đồ mini dạng cột", sparklineLine: "Biểu đồ mini dạng đường",
    hfPresetLabel: "Mẫu dùng sẵn", hfPresetCustom: "Tùy chỉnh", hfPresetPage: "Trang X", hfPresetSheet: "Tên trang tính", hfPresetDate: "Ngày", hfPresetNone: "Không có", hfPresetPageVal: "Trang &P", hfPresetSheetVal: "Tên trang tính: &A", hfPresetDateVal: "Ngày: &D", hfLeft: "Trái", hfCenter: "Giữa", hfRight: "Phải", headerFooterTitle: "Tiêu đề Đầu/Cuối trang", headerTitle: "Đầu trang", footerTitle: "Cuối trang", hfDynamicCodesHint: "Mã động: &P số trang, &N tổng số trang, &D ngày, &T giờ, &F tên tệp, &A tên trang tính.",
    pivotTitle: "Tạo Bảng tổng hợp", pivotSource: "Vùng dữ liệu nguồn (hàng đầu là tiêu đề)", loadFields: "Đọc tên cột", chooseFields: "Chọn trường cho từng vùng:", aggregateFor: "Phép tổng hợp cho {field}", sourceRangeFormat: "Vùng nguồn phải có dạng A1:D20.", sourceNeedsHeaders: "Hàng đầu tiên của vùng nguồn phải có tiêu đề.", uniqueHeaders: "Tiêu đề cột trong vùng nguồn phải là duy nhất.", selectValue: "Hãy chọn ít nhất một trường Values.", columnNotFound: "Không tìm thấy cột {field}.", sourceSheetNotFound: "Không tìm thấy sheet dữ liệu nguồn.", createPivotBtn: "Tạo Pivot Table",
    chartDefaultTitle: "Biểu đồ dữ liệu", chartUnsupported: "Kiểu biểu đồ không được hỗ trợ: {type}", chartItem: "Mục {number}", chartNoNumericData: "Vùng đã chọn không có dữ liệu số", chartPiePositive: "Biểu đồ tròn cần giá trị dương", chartInsertFrom: "Chèn biểu đồ từ {range}", selectedRange: "vùng đã chọn", chartType: "Kiểu biểu đồ", chartColumn: "Cột", chartLine: "Đường", chartPie: "Tròn", chartArea: "Miền", insertIntoSheet: "Chèn vào bảng tính", insertedImageAlt: "Ảnh được chèn trong trang tính", deleteImage: "Xóa ảnh", imageFormatUnsupported: "Định dạng ảnh không được hỗ trợ",
    cellStylesTitle: "Thư viện kiểu ô (Cell Styles)", cellStylesHint: "Chọn một kiểu để áp dụng ngay lập tức cho các ô đang chọn:",
    formatAsTableTitle: "Định dạng theo bảng (Format as Table)", formatAsTableHint: "Chọn kiểu bảng để áp dụng màu tiêu đề và hàng xen kẽ (banded rows):",
    rowHeightTitle: "Chiều cao hàng", rowHeightMessage: "Chiều cao hàng (pixel):",
    colWidthTitle: "Độ rộng cột", colWidthMessage: "Độ rộng cột (pixel):",
    invalidRowColSize: "Vui lòng nhập một số hợp lệ trong khoảng cho phép.",
    renameSheetTitle: "Đổi tên trang tính", renameSheetMenu: "Đổi tên trang tính...", renameSheetMessage: "Tên trang tính:",
    renameSheetHint: "Tối đa 31 ký tự. Không trùng tên trang khác và không chứa / \\ ? * [ ] :",
    sheetNameEmpty: "Tên trang tính không được để trống.",
    sheetNameTooLong: "Tên trang tính tối đa {max} ký tự.",
    sheetNameInvalidChars: "Tên không được chứa các ký tự / \\ ? * [ ] : hoặc dấu nháy đơn.",
    sheetNameDuplicate: "Đã có trang tính cùng tên trong workbook này.",
    moveCopyTitle: "Di chuyển hoặc Sao chép", moveCopyMenu: "Di chuyển hoặc Sao chép trang tính...",
    moveCopyIntro: "Chọn vị trí chèn cho trang tính «{name}».",
    moveCopyBefore: "Chèn trước trang tính:",
    moveCopyToEnd: "(chuyển đến cuối)",
    moveCopyCreateCopy: "Tạo một bản sao",
    protectSheet: "Bảo vệ trang tính...", unprotectSheet: "Bỏ bảo vệ trang tính...",
    protectSheetTitle: "Bảo vệ trang tính",
    protectSheetCheckbox: "Bảo vệ trang tính và nội dung các ô bị khóa",
    protectSheetHint: "Khi bật: không sửa nội dung ô, không đổi định dạng, không chèn/xóa hàng hoặc cột. Đây là khóa giao diện, mật khẩu lưu dạng chữ thường trong phiên làm việc — không phải bảo mật thật.",
    protectSheetTooltip: "Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện, không phải bảo mật thật)",
    unprotectSheetTooltip: "Tắt khóa giao diện của trang tính hiện tại",
    protectPassword: "Mật khẩu (tùy chọn)",
    protectPasswordConfirm: "Nhập lại mật khẩu",
    protectPasswordMismatch: "Hai mật khẩu không khớp.",
    unprotectPasswordMessage: "Nhập mật khẩu để bỏ bảo vệ trang tính (khóa giao diện, không phải bảo mật thật).",
    unprotectPasswordWrong: "Mật khẩu không đúng.",
    sheetProtectedEdit: "Trang tính đang được bảo vệ. Không thể sửa nội dung ô, định dạng, hay xóa hàng/cột. Chọn Bỏ bảo vệ trang tính để mở khóa (chỉ là khóa giao diện, không phải bảo mật thật).",
    sheetTabProtectedTitle: "{name} (đã bảo vệ)",
    sheetTabProtectedAria: "{name}, đã bảo vệ",
    addSheet: "Thêm trang tính mới",
    protectWorkbook: "Bảo vệ workbook...", unprotectWorkbook: "Bỏ bảo vệ workbook...",
    protectWorkbookTitle: "Bảo vệ workbook",
    protectWorkbookCheckbox: "Bảo vệ cấu trúc workbook (trang tính)",
    protectWorkbookHint: "Khi bật: không thêm, xóa, đổi tên, di chuyển hay sao chép trang tính. Nội dung ô vẫn sửa được — khác Bảo vệ trang tính. Đây là khóa giao diện, mật khẩu lưu dạng chữ thường trong phiên làm việc — không phải bảo mật thật.",
    protectWorkbookTooltip: "Khóa cấu trúc workbook: không thêm, xóa, đổi tên, di chuyển hay sao chép trang tính. Không khóa nội dung ô (khóa giao diện, không phải bảo mật thật)",
    unprotectWorkbookTooltip: "Tắt khóa cấu trúc workbook (thêm/xóa/đổi tên/di chuyển/sao chép trang tính)",
    unprotectWorkbookPasswordMessage: "Nhập mật khẩu để bỏ bảo vệ cấu trúc workbook (khóa giao diện, không phải bảo mật thật).",
    workbookProtectedStructure: "Workbook đang được bảo vệ cấu trúc. Không thể thêm, xóa, đổi tên, di chuyển hoặc sao chép trang tính. Nội dung ô vẫn sửa được. Chọn Bỏ bảo vệ workbook để mở khóa (chỉ là khóa giao diện, không phải bảo mật thật).",
    evaluateFormulaTitle: "Ước lượng công thức",
    evaluateFormulaRef: "Tham chiếu: {sheet}!{coord}",
    evaluateFormulaHint: "Phần được gạch chân và in nghiêng sẽ được tính ở bước tiếp theo.",
    evaluateFormulaEvaluate: "Ước lượng",
    evaluateFormulaStepIn: "Bước vào",
    evaluateFormulaStepOut: "Bước ra",
    evaluateFormulaRestart: "Khởi động lại",
    evaluateFormulaClose: "Đóng",
    evaluateFormulaNoFormula: "Ô đang chọn không chứa công thức. Hãy chọn một ô bắt đầu bằng dấu = rồi mở lại Ước lượng công thức.",
    evaluateFormulaStepResult: "Giá trị vừa tính: {value}",
    evaluateFormulaCellValue: "Giá trị hiện tại của ô: {value}",
    evaluateFormulaDone: "Đã ước lượng xong. Kết quả cuối: {value}",
    evaluateFormulaDoneMatch: "Kết quả khớp giá trị ô.",
    evaluateFormulaDoneMismatch: "Kết quả bước ước lượng khác giá trị ô hiện tại ({value}).",
    consolidateTitle: "Hợp nhất dữ liệu",
    consolidateHint: "Gộp nhiều vùng (có thể từ các trang tính khác nhau) thành một bảng tại ô đang chọn. Kết quả là giá trị tĩnh; hoàn tác bằng Ctrl+Z.",
    consolidateDest: "Ô đích: {sheet}!{coord}",
    consolidateFunction: "Hàm",
    consolidateReference: "Tham chiếu",
    consolidateAllRefs: "Tất cả tham chiếu",
    consolidateAdd: "Thêm",
    consolidateDelete: "Xóa",
    consolidateBrowse: "Duyệt",
    consolidateTopRow: "Nhãn ở hàng trên",
    consolidateLeftCol: "Nhãn ở cột trái",
    consolidatePickLabel: "Chọn vùng trên lưới",
    consolidatePickOk: "Chọn",
    consolidateNeedRefs: "Hãy thêm ít nhất một tham chiếu nguồn.",
    consolidateBadRef: "Tham chiếu không hợp lệ. Dùng dạng TênTrang!A1:B10 và bảo đảm trang tính tồn tại.",
    consolidateDuplicateRef: "Tham chiếu này đã có trong danh sách.",
    consolidateSizeMismatch: "Khi gộp theo vị trí, mọi vùng nguồn phải cùng số hàng và số cột.",
    consolidateSizeMismatchRows: "Khi chỉ dùng nhãn hàng trên, các vùng phải có cùng số hàng dữ liệu.",
    consolidateSizeMismatchCols: "Khi chỉ dùng nhãn cột trái, các vùng phải có cùng số cột dữ liệu.",
    consolidateNoData: "Không đọc được dữ liệu số sau hàng/cột nhãn. Kiểm tra vùng nguồn.",
    consolidateBadFunction: "Chọn hàm SUM, AVERAGE, COUNT, MAX hoặc MIN.",
    consolidateNoOutput: "Không ghi được kết quả vào lưới. Chọn ô đích còn chỗ trống trong trang.",
    consolidateFailed: "Không hợp nhất được dữ liệu."
  },
  slidesDialogs: {
    close: "Đóng", cancel: "Hủy bỏ", apply: "Áp dụng", preview: "Xem thử", delete: "Xóa",
    canvasRegion: "Vùng trình chiếu",
    removeSectionKeepSlides: "Xóa Phần (giữ trang chiếu)",
    totalPrintSlides: "Tổng số trang chiếu in",
    printPreview: {
      title: "Xem trước khi in",
      printBtn: "In tài liệu",
      prevPage: "◀ Trang trước",
      nextPage: "Trang sau ▶",
      pagePrefix: "Trang ",
      closeTooltip: "Đóng xem trước (Esc)",
      slideUnit: "trang chiếu",
      slideCount: "{count} trang chiếu"
    },
    masterTitle: "Mẫu Slide Master", themeGalleryTitle: "Thư viện Chủ đề", themeGalleryHint: "Chọn một chủ đề để áp dụng ngay cho toàn bộ bản trình chiếu.", themePreviewTitle: "Tiêu đề bản trình chiếu", themeCorporateBlue: "Xanh Doanh Nghiệp", themeWarmTerracotta: "Terracotta Ấm Áp", themeMinimalMonochrome: "Đơn Sắc Tối Giản", themeNaturalGreen: "Xanh Lá Thiên Nhiên", themeModernCharcoal: "Than Chì Hiện Đại", themeEnergeticOrange: "Cam Năng Động", slideSizeTitle: "Kích thước trang chiếu", slideSizeHint: "Chọn tỷ lệ mới. Mọi hình và đối tượng hiện có sẽ được co giãn theo khung.", slideSizeWide: "Màn hình rộng", slideSizeStandard: "Tiêu chuẩn", layoutTitle: "Chọn Bố Cục Trang Chiếu", transitionTitle: "Hiệu Ứng Chuyển Trang", animationTitle: "Hiệu Ứng Đối Tượng (Object Animations)",
    applyMaster: "Áp dụng mẫu", applyLayout: "Áp dụng bố cục", applyTransition: "Áp dụng chuyển tiếp", applyAnimation: "Áp dụng hiệu ứng", removeTransition: "Xóa chuyển tiếp", removeAnimation: "Xóa hiệu ứng", previewTransition: "▶ Xem thử chuyển tiếp", previewAnimation: "▶ Xem thử hiệu ứng", previewObject: "Đối tượng xem thử",
    layoutHint: "Chọn một bố cục chuẩn để định hình lại cấu trúc nội dung trang chiếu hiện tại:", applyLayoutAll: "Áp dụng cho tất cả", applyLayoutCurrent: "Áp dụng",
    masterHint: "Chọn một mẫu phong cách để đồng bộ màu sắc, phông chữ và logo cho tất cả các trang chiếu:", masterLogoLabel: "Tên đơn vị / Logo chữ góc trang:", masterLogoAria: "Tên đơn vị hoặc logo chữ góc trang",
    transitionTypeLabel: "Kiểu chuyển trang:", transFade: "Mờ dần (Fade)", transSlide: "Trượt ngang (Slide)", transZoom: "Thu phóng (Zoom)", transFlip: "Lật trang 3D (Flip)", durationFast: "Nhanh (0.3 giây)", durationNormal: "Tiêu chuẩn (0.5 giây)", durationSlow: "Chậm (0.8 giây)", durationVerySlow: "Rất chậm (1.0 giây)", sampleSlide: "Trang Chiếu Mẫu", applyTransitionCurrent: "Áp dụng", applyTransitionAll: "Áp dụng cho tất cả",
    animationTarget: "Đối tượng áp dụng:", animationType: "Kiểu hiệu ứng xuất hiện (Entrance):", animationDuration: "Thời gian hiệu ứng:", animationDelay: "Độ trễ xuất hiện:", noAnimation: "Không có hiệu ứng", immediate: "Ngay lập tức (0s)",
    targetTitle: "Tiêu đề", targetCol1: "Nội dung cột 1", targetCol2: "Nội dung cột 2", targetBody: "Nội dung", shapeImage: "Hình ảnh", shapeEllipse: "Hình elip", shapeRectangle: "Hình chữ nhật", animFadeIn: "Mờ dần xuất hiện (Fade In)", animFlyIn: "Bay từ dưới lên (Fly In)", animZoomIn: "Thu phóng xuất hiện (Zoom In)", animBounceIn: "Nảy nhẹ xuất hiện (Bounce In)", animSlideLeft: "Trượt từ trái sang (Slide Left)", durationVeryFast: "Rất nhanh (0.3s)", duration1s: "1.0 giây", delay200: "Sau 0.2s", delay500: "Sau 0.5s", delay1000: "Sau 1.0s",
    presenterTitle: "Chế độ người thuyết trình", presenterHeader: "CHẾ ĐỘ NGƯỜI THUYẾT TRÌNH (PRESENTER VIEW)", elapsedTime: "Thời gian thuyết trình", elapsedLabel: "ĐÃ THUYẾT TRÌNH:", actualClock: "Đồng hồ thực tế", clockLabel: "ĐỒNG HỒ:", presenterExit: "✕ Thoát (Esc)", prevSlide: "◄ Trang trước", nextSlide: "Trang tiếp ►", slideCounter: "Trang {current} / {total}", speakerNotesTitle: "📝 Ghi chú người thuyết trình", notesFontDec: "Thu nhỏ cỡ chữ ghi chú", notesFontInc: "Phóng to cỡ chữ ghi chú", nextSlideTitle: "⏭ Trang tiếp theo", noNotes: "(Chưa có ghi chú cho trang chiếu này. Bạn có thể nhập ghi chú ở bảng Ghi chú dưới canvas khi biên tập).", endOfShow: "Đây là trang chiếu cuối cùng.",
    readingViewTitle: "Dạng xem Đọc (Reading View)", readingToolbar: "Thanh điều hướng Đọc", prevSlideShort: "Trang trước", nextSlideShort: "Trang tiếp", readingClose: "Thoát chế độ đọc",
    rehearseTitle: "Tập dượt thời gian trình chiếu", slideshowTitle: "Trình chiếu trang chiếu", rehearseClockAria: "Đồng hồ tập dượt thời gian", slideshowHint: "Phím Space hoặc Click để tiếp tục | Esc để thoát",
    allHiddenTitle: "Không có trang chiếu để trình chiếu", allHiddenMessage: "Tất cả trang chiếu đang bị ẩn. Hiện ít nhất một trang trong Slide Sorter hoặc tab Trình chiếu rồi thử lại.", hiddenSlideAria: "Trang chiếu ẩn", hiddenSlideBadge: "Ẩn",
    sectionAddTitle: "Thêm phần", sectionAddMessage: "Tên phần", sectionAddConfirm: "Thêm",
    sectionRenameTitle: "Đổi tên phần", sectionRenameMessage: "Tên mới", sectionRenameConfirm: "Đổi tên",
    sectionCollapse: "Thu gọn phần", sectionExpand: "Mở rộng phần",
    slideElapsed: "Trang", totalElapsed: "Tổng", footerDoc: "Tài liệu thuyết trình 3T Office",
    prevSlideTitle: "Trang trước (←)", nextSlideTitle: "Trang tiếp (Space hoặc →)",
    prevSlideReadingTitle: "Trang trước (Mũi tên trái)", nextSlideReadingTitle: "Trang tiếp (Mũi tên phải)",
    exitReadingTitle: "Thoát chế độ đọc (Esc)", notesFontDecTitle: "Thu nhỏ chữ", notesFontIncTitle: "Phóng to chữ",
    exitPresenterAria: "Thoát chế độ người thuyết trình (Esc)",
    commentsLabel: "Nhận xét trang chiếu", newComment: "Nhận xét mới", commentPlaceholder: "Nhập nội dung nhận xét...", addComment: "Thêm nhận xét", rehearsalConfirm: "Tổng thời gian trình chiếu: {time}.\nLưu thời gian tập dượt cho từng trang?",
    diagramTitle: "Chèn sơ đồ", diagramHint: "Chọn kiểu sơ đồ và số lượng hộp. Bạn có thể sửa chữ trực tiếp sau khi chèn.", diagramNodeCount: "Số lượng hộp", diagramInsert: "Chèn sơ đồ", diagramProcess: "Danh sách theo bước", diagramCycle: "Quy trình theo chu kỳ", diagramHierarchy: "Phân cấp tổ chức", diagramList: "Danh sách phân cấp", diagramStep: "Bước {number}", diagramItem: "Mục {number}", diagramRoot: "Lãnh đạo", diagramChild: "Bộ phận {number}",
    formatBackgroundTitle: "Định dạng nền", formatBackgroundHint: "Đổi nền trang chiếu hiện tại. Không thay chủ đề toàn bài.", formatBackgroundSolid: "Màu đơn", formatBackgroundGradient: "Gradient 2 màu", formatBackgroundPicture: "Ảnh nền", formatBackgroundColor: "Màu nền", formatBackgroundFrom: "Màu 1", formatBackgroundTo: "Màu 2", formatBackgroundDirection: "Hướng", formatBackgroundHorizontal: "Ngang", formatBackgroundVertical: "Dọc", formatBackgroundChoosePicture: "Chọn ảnh…", formatBackgroundApplyCurrent: "Áp dụng trang này", formatBackgroundApplyAll: "Áp dụng tất cả trang", formatBackgroundClear: "Xóa nền tùy chỉnh",
    spellcheckTitle: "Chính tả", spellcheckNotInDictionary: "Không có trong từ điển:", spellcheckLocation: "Vị trí", spellcheckContext: "Nội dung", spellcheckSuggestions: "Gợi ý:", spellcheckNoSuggestions: "(Không có gợi ý gần)", spellcheckIgnore: "Bỏ qua", spellcheckIgnoreAll: "Bỏ qua tất cả", spellcheckAdd: "Thêm vào từ điển", spellcheckReplace: "Thay thế", spellcheckReplaceAll: "Thay thế tất cả", spellcheckClose: "Đóng", spellcheckStatus: "Lỗi {current} / {total}", spellcheckComplete: "Đã kiểm tra xong trang chiếu hiện tại. Không tìm thấy lỗi chính tả.", spellcheckCompleteRemaining: "Đã kiểm tra xong. Không còn lỗi chính tả.", spellcheckFieldTitle: "Tiêu đề", spellcheckFieldBody: "Nội dung", spellcheckFieldBody2: "Nội dung cột 2", spellcheckFieldShape: "Hình",
    animationPaneTitle: "Ngăn hoạt hình", animationPaneHint: "Danh sách hiệu ứng trên trang đang chọn. Đổi thứ tự bằng nút lên/xuống, chọn cách bắt đầu, hoặc xóa hiệu ứng (không xóa đối tượng).", animationPaneEmpty: "Trang này chưa có hiệu ứng. Dùng Hiệu ứng đối tượng trên tab Hoạt hình để gắn hiệu ứng, rồi mở lại ngăn này để sắp xếp.", animStartLabel: "Bắt đầu", animStartOnClick: "Khi click", animStartWithPrevious: "Cùng với trước đó", animStartAfterPrevious: "Sau trước đó", animMoveUp: "Đưa lên", animMoveDown: "Đưa xuống", animMoveUpShort: "↑", animMoveDownShort: "↓", animRemove: "Xóa hiệu ứng", animRemoveShort: "Xóa", shapeWordArt: "Chữ nghệ thuật", shapeChart: "Biểu đồ", shapeTable: "Bảng", shapeTextBox: "Hộp văn bản",
    setupShowTitle: "Thiết lập trình chiếu", setupShowHint: "Tùy chọn trình chiếu cho bản này. Lặp liên tục áp dụng ngay khi F5. Màu bút vẽ và con trỏ laser mặc định khi trình chiếu (bật bằng Ctrl+P, Ctrl+L).", setupShowLoop: "Lặp lại liên tục cho đến khi nhấn Esc", setupShowNoNarration: "Trình chiếu không có thuyết minh", setupShowNoNarrationHint: "Chưa có thuyết minh/audio narration trong 3T Slide — tùy chọn này chỉ lưu cờ, chưa ẩn hay tắt âm thanh nào.", setupShowPointerColor: "Màu con trỏ bút / laser",
    keepInkTitle: "3T Slide", keepInkPrompt: "Bạn có muốn giữ lại các chú thích bằng nét vẽ không?", keepInkKeep: "Giữ", keepInkDiscard: "Bỏ",
    slideshowNext: "Tiếp theo", slideshowPrev: "Quay lại", slideshowPointerOptions: "Tùy chọn con trỏ", slideshowArrow: "Mũi tên", slideshowPen: "Bút vẽ", slideshowLaser: "Con trỏ laser", slideshowPenColor: "Màu bút", slideshowEraseInk: "Xóa nét vẽ trên trang", slideshowEndShow: "Thoát trình chiếu",
    colorRed: "Đỏ", colorBlue: "Xanh lam", colorYellow: "Vàng", colorGreen: "Xanh lá", colorBlack: "Đen"
  },
  commands: {
    "writer.edit.select": { label: "Chọn", tooltip: "Chọn văn bản hoặc đối tượng" },
    "writer.para.lineSpacing": { label: "Giãn dòng", tooltip: "Khoảng cách giữa các dòng trong đoạn văn" },
    "writer.layout.breaks": { label: "Ngắt", tooltip: "Chèn ngắt trang hoặc ngắt mục" },
    "writer.layout.sectionOptions": { label: "Tùy chọn mục", tooltip: "Sửa đầu trang, chân trang và số trang cho mục này" },
    "writer.para.lineSpacingLayout": { label: "Giãn dòng", tooltip: "Khoảng cách dòng và đoạn văn" },
    "sheet-what-if-analysis": { label: "Phân tích What-If", tooltip: "Dò tìm mục tiêu, bảng dữ liệu và quản lý kịch bản" },
    "sheet.view.freezePanesMenu": { label: "Cố định ô", tooltip: "Cố định hàng hoặc cột khi cuộn trang tính" },
    "sheet.cells.format": { label: "Định dạng ô", tooltip: "Đổi kích thước hàng cột, ẩn hiện và bảo vệ trang tính" },
    "sheet.edit.fill": { label: "Điền", tooltip: "Điền dữ liệu theo hướng xuống, sang phải" },
    "sheet.edit.clear": { label: "Xóa", tooltip: "Xóa toàn bộ, xóa định dạng hoặc xóa nội dung ô" },
    "slides.edit.select": { label: "Chọn", tooltip: "Chọn đối tượng hoặc văn bản trên trang chiếu" },
    "slides.section.menu": { label: "Phần", tooltip: "Quản lý các phần trong bài trình chiếu" },
    "slides.drawing.arrange": { label: "Sắp xếp", tooltip: "Sắp xếp thứ tự hiển thị và căn lề các đối tượng vẽ" },
    "slides.text.vAlign": { label: "Căn lề dọc", tooltip: "Căn văn bản lên trên, ở giữa hoặc xuống dưới khung chữ" },
    "slides.text.direction": { label: "Hướng chữ", tooltip: "Đổi hướng văn bản trong khung chữ" },
    "sheet.page.margins": { label: "Căn lề", tooltip: "Thiết lập khoảng cách lề trang tính" },
    "sheet.page.orientation": { label: "Hướng giấy", tooltip: "Chọn hướng trang tính dọc hoặc ngang" },
    "sheet.page.size": { label: "Khổ giấy", tooltip: "Chọn kích thước trang in (A4, Letter, Legal)" },
    "sheet.page.printTitles": { label: "Tiêu đề in", tooltip: "Chọn hàng và cột lặp lại trên mỗi trang in" },
    "sheet.page.scale": { label: "Tỷ lệ vừa trang", tooltip: "Thu phóng nội dung in theo phần trăm hoặc số trang" },
    "sheet.page.headerFooter": { label: "Tiêu đề Đầu/Cuối trang", tooltip: "Đặt đầu trang và cuối trang khi in" },
    "sheet.help.open": { label: "Trợ giúp", tooltip: "Mở hướng dẫn sử dụng (F1)" },
    "writer.nav.docStart": { label: "Đầu tài liệu", tooltip: "Đến đầu tài liệu (Ctrl+Home)" },
    "writer.nav.docEnd": { label: "Cuối tài liệu", tooltip: "Đến cuối tài liệu (Ctrl+End)" },
    "sheet.nav.home": { label: "Ô đầu tiên", tooltip: "Đến ô A1 (Ctrl+Home)" },
    "sheet.nav.end": { label: "Ô cuối có dữ liệu", tooltip: "Đến ô cuối cùng có dữ liệu (Ctrl+End)" },
    "sheet.insert.sparklineLine": { label: "Đường", tooltip: "Chèn biểu đồ mini dạng đường từ vùng đã chọn" },
    "sheet.insert.sparklineColumn": { label: "Cột", tooltip: "Chèn biểu đồ mini dạng cột từ vùng đã chọn" },
    "sheet.insert.hyperlink": { label: "Liên kết", tooltip: "Chèn liên kết vào ô hiện tại (Ctrl+K)" },
    "sheet.insert.textbox": { label: "Hộp văn bản", tooltip: "Chèn hộp văn bản nổi" },
    "common.file.new": { label: "Tạo mới", tooltip: "Tạo tài liệu mới (Ctrl+N)" },
    "common.file.open": { label: "Mở tệp", tooltip: "Mở tài liệu có sẵn (Ctrl+O)" },
    "common.file.save": { label: "Lưu", tooltip: "Lưu tài liệu hiện tại (Ctrl+S)" },
    "common.file.saveAs": { label: "Lưu bản sao", tooltip: "Lưu tài liệu dưới tên khác (F12)" },
    "common.file.exportPdf": { label: "Xuất PDF", tooltip: "Xuất nội dung sang định dạng PDF tiêu chuẩn" },
    "common.file.print": { label: "In tài liệu", tooltip: "In tài liệu (Ctrl+P)" },
    "common.file.close": { label: "Đóng", tooltip: "Đóng tài liệu (Ctrl+W)" },
    "common.help.about": { label: "Giới thiệu 3T Office", tooltip: "Xem thông tin phiên bản, bản quyền và giấy phép nguồn mở 3T Office" },
    "common.macro.recordToggle": { label: "Ghi Macro", tooltip: "Bắt đầu/Dừng ghi lại thao tác thành Macro (Ctrl+Shift+R)" },
    "common.macro.manager": { label: "Xem Macro", tooltip: "Xem, chạy, đổi tên hoặc xóa các Macro đã ghi (Alt+F8)" },
    "common.edit.undo": { label: "Hoàn tác", tooltip: "Hoàn tác thao tác vừa thực hiện (Ctrl+Z)" },
    "common.edit.redo": { label: "Làm lại", tooltip: "Làm lại thao tác vừa hoàn tác (Ctrl+Y)" },
    "common.edit.repeat": { label: "Lặp lại", tooltip: "Lặp lại thao tác cuối (F4)" },
    "common.edit.cut": { label: "Cắt", tooltip: "Cắt vùng chọn vào bộ nhớ tạm (Ctrl+X)" },
    "common.edit.copy": { label: "Sao chép", tooltip: "Sao chép vùng chọn (Ctrl+C)" },
    "common.edit.paste": { label: "Dán", tooltip: "Dán nội dung từ bộ nhớ tạm (Ctrl+V)" },
    "common.edit.pastePlain": { label: "Dán văn bản thuần", tooltip: "Dán văn bản không giữ định dạng (Ctrl+Shift+V)" },
    "sheet.edit.pasteSpecial": { label: "Dán đặc biệt", tooltip: "Chọn cách dán giá trị, công thức, định dạng hoặc chuyển vị (Ctrl+Alt+V)" },
    "sheet.edit.formatPainter": { label: "Sao chép định dạng", tooltip: "Sao chép định dạng ô nguồn sang ô hoặc vùng đích. Nhấp đúp để khóa và áp dụng nhiều lần. Esc để hủy." },
    "common.edit.formatPainter": { label: "Sao chép định dạng", tooltip: "Sao chép định dạng (Ctrl+Shift+C)" },
    "common.edit.selectAll": { label: "Chọn tất cả", tooltip: "Chọn toàn bộ nội dung (Ctrl+A)" },
    "common.edit.find": { label: "Tìm kiếm", tooltip: "Tìm kiếm văn bản (Ctrl+F)" },
    "common.edit.replace": { label: "Thay thế", tooltip: "Tìm và thay thế văn bản (Ctrl+H)" },
    "common.edit.hyperlink": { label: "Liên kết", tooltip: "Chèn siêu liên kết (Ctrl+K)" },
    "common.view.ribbonToggle": { label: "Thu gọn Ribbon", tooltip: "Thu gọn hoặc mở rộng thanh Ribbon (Ctrl+F1)" },
    "common.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị (Ctrl++)" },
    "common.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị (Ctrl+-)" },
    "common.view.fullScreen": { label: "Toàn màn hình", tooltip: "Bật/tắt chế độ toàn màn hình (F11)" },
    "ai.assistant.toggle": { label: "Trợ lý 3T AI", tooltip: "Mở bảng trợ lý 3T AI (Alt+J)" },
    "ai.assistant.summarize": { label: "Tóm tắt nhanh", tooltip: "Tóm tắt nội dung vùng chọn bằng AI" },
    "ai.assistant.rewrite": { label: "Viết lại", tooltip: "Viết lại câu từ chuẩn văn phong tiếng Việt" },
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
    ,"sheet.cell.orientation": { label: "Hướng chữ", tooltip: "Xoay chữ trong ô: 0°, 45°, -45°, 90°, -90° hoặc dọc từ dưới lên" }
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
    ,"sheet.cell.mergeCenter": { label: "Trộn & căn giữa", tooltip: "Trộn vùng chọn thành một ô và căn giữa" }
    ,"sheet.cell.mergeAcross": { label: "Trộn theo hàng", tooltip: "Trộn riêng từng hàng trong vùng chọn" }
    ,"sheet.cell.mergeCells": { label: "Trộn ô", tooltip: "Trộn vùng chọn và giữ căn chỉnh hiện tại" }
    ,"sheet.cell.unmerge": { label: "Tách ô", tooltip: "Tách các ô đã trộn" }
    ,"sheet.cell.borders": { label: "Viền ô", tooltip: "Kẻ đường viền khung ô" }
    ,"sheet.cell.fillColor": { label: "Màu nền", tooltip: "Tô màu nền ô tính" }
    ,"sheet.cell.textColor": { label: "Màu chữ", tooltip: "Đổi màu chữ trong ô" }
    ,"sheet.format.cellsDialog": { label: "Định dạng ô...", tooltip: "Mở hộp thoại định dạng ô (Ctrl+1)" }
    ,"sheet.format.alignmentDialog": { label: "Căn chỉnh ô...", tooltip: "Mở hộp thoại Định dạng ô - thẻ Căn chỉnh" }
    ,"sheet.format.currencyVND": { label: "Tiền tệ VNĐ", tooltip: "Định dạng tiền tệ VNĐ (Ctrl+Shift+4 hoặc Ctrl+Shift+$)" }
    ,"sheet.format.percent": { label: "Phần trăm", tooltip: "Định dạng phần trăm % (Ctrl+Shift+5)" }
    ,"sheet.format.standard": { label: "Phân cách hàng nghìn", tooltip: "Dấu phẩy phân cách hàng nghìn (Ctrl+Shift+1)" }
    ,"sheet.insert.date": { label: "Chèn ngày hiện tại", tooltip: "Chèn ngày hôm nay (Ctrl+;)" }
    ,"sheet.insert.time": { label: "Chèn giờ hiện tại", tooltip: "Chèn giờ hiện tại (Ctrl+Shift+;)" }
    ,"sheet.formula.insertFunction": { label: "Chèn hàm", tooltip: "Mở hộp thoại Chèn hàm fx (Shift+F3)" }
    ,"sheet.formula.sum": { label: "AutoSum", tooltip: "Hàm tính tổng tự động AutoSum (Alt+=)" }
    ,"sheet.formula.average": { label: "Trung bình", tooltip: "Hàm tính trung bình cộng (AVERAGE)" }
    ,"sheet.formula.countNumbers": { label: "Đếm số", tooltip: "Hàm đếm các ô chứa số (COUNT)" }
    ,"sheet.formula.max": { label: "Lớn nhất", tooltip: "Hàm tìm giá trị lớn nhất (MAX)" }
    ,"sheet.formula.min": { label: "Nhỏ nhất", tooltip: "Hàm tìm giá trị nhỏ nhất (MIN)" }
    ,"sheet.formula.categoryFinancial": { label: "Tài chính", tooltip: "Duyệt các hàm tài chính (PMT, FV, PV, NPV, IRR...)" }
    ,"sheet.formula.categoryLogical": { label: "Logic", tooltip: "Duyệt các hàm logic (IF, AND, OR...)" }
    ,"sheet.formula.categoryText": { label: "Văn bản", tooltip: "Duyệt các hàm xử lý văn bản (CONCAT, LEN, MID...)" }
    ,"sheet.formula.categoryDateTime": { label: "Ngày & Giờ", tooltip: "Duyệt các hàm ngày tháng (TODAY, NOW, DATE...)" }
    ,"sheet.formula.categoryLookup": { label: "Tra cứu & Tham chiếu", tooltip: "Duyệt các hàm tra cứu (VLOOKUP, INDEX, MATCH...)" }
    ,"sheet.formula.categoryMath": { label: "Toán & Lượng giác", tooltip: "Duyệt các hàm toán học (ROUND, SUMPRODUCT...)" }
    ,"sheet.formula.categoryMore": { label: "Thêm hàm", tooltip: "Duyệt các hàm thống kê và nâng cao khác" }
    ,"sheet.formula.nameManager": { label: "Quản lý tên", tooltip: "Tạo, sửa và xóa vùng được đặt tên" }
    ,"sheet.formula.defineName": { label: "Đặt tên vùng", tooltip: "Đặt tên cho ô hoặc vùng ô đang chọn" }
    ,"sheet.formula.useInFormula": { label: "Dùng trong công thức", tooltip: "Chèn tên đã đặt vào công thức đang soạn" }
    ,"sheet.formula.createFromSelection": { label: "Tạo từ vùng chọn", tooltip: "Tự động tạo tên từ tiêu đề hàng hoặc cột (Ctrl+Shift+F3)" }
    ,"sheet.formula.tracePrecedents": { label: "Tìm ô tiền lệ", tooltip: "Vẽ mũi tên chỉ đến các ô cung cấp giá trị cho công thức này" }
    ,"sheet.formula.traceDependents": { label: "Tìm ô phụ thuộc", tooltip: "Vẽ mũi tên chỉ đến các ô phụ thuộc vào giá trị ô này" }
    ,"sheet.formula.removeArrows": { label: "Xóa mũi tên", tooltip: "Xóa toàn bộ mũi tên kiểm tra công thức" }
    ,"sheet.formula.showFormulas": { label: "Hiện công thức", tooltip: "Hiển thị công thức thay vì kết quả trong toàn bộ sheet (Ctrl+`)" }
    ,"sheet.formula.errorChecking": { label: "Kiểm tra lỗi", tooltip: "Quét và kiểm tra các ô có công thức bị lỗi trong bảng tính" }
    ,"sheet.formula.watchWindow": { label: "Cửa sổ theo dõi", tooltip: "Mở cửa sổ theo dõi giá trị các ô quan trọng khi cuộn bảng tính" }
    ,"sheet.formula.evaluateFormula": { label: "Ước lượng công thức", tooltip: "Ước lượng từng phần của công thức đang chọn để xem giá trị trung gian" }
    ,"sheet.calc.calculationOptions": { label: "Tùy chọn tính toán", tooltip: "Chọn chế độ tính toán tự động hoặc thủ công" }
    ,"sheet.calc.modeAutomatic": { label: "Tự động", tooltip: "Tự động tính lại công thức khi dữ liệu thay đổi" }
    ,"sheet.calc.modeManual": { label: "Thủ công", tooltip: "Chỉ tính lại công thức khi nhấn Tính lại (F9)" }
    ,"sheet.calc.calculateSheet": { label: "Tính trang hiện tại", tooltip: "Tính lại công thức trong trang tính hiện tại (Shift+F9)" }
    ,"sheet.calc.calculateNow": { label: "Tính lại ngay", tooltip: "Tính lại toàn bộ sổ làm việc ngay lập tức (F9)" }
    ,"sheet.formula.arrayEnter": { label: "Nhập công thức mảng", tooltip: "Nhập công thức mảng cho vùng đã chọn (Ctrl+Shift+Enter)" }
    ,"sheet.formula.recalculate": { label: "Tính lại toàn bộ", tooltip: "Tính lại toàn bộ công thức bảng tính (F9)" }
    ,"sheet.data.sortAsc": { label: "Sắp xếp A-Z", tooltip: "Sắp xếp dữ liệu tăng dần" }
    ,"sheet.data.sortDesc": { label: "Sắp xếp Z-A", tooltip: "Sắp xếp dữ liệu giảm dần" }
    ,"sheet.data.filter": { label: "Bộ lọc", tooltip: "Bật/tắt chế độ lọc AutoFilter (Ctrl+Shift+L)" }
    ,"sheet.data.customSort": { label: "Sắp xếp tùy chỉnh", tooltip: "Sắp xếp theo nhiều cột (Sort by Column, Then by Column...)" }
    ,"sheet.format.conditional": { label: "Định dạng có điều kiện", tooltip: "Tô nổi bật các ô theo giá trị hoặc trạng thái trống" }
    ,"sheet.data.validation": { label: "Kiểm tra dữ liệu", tooltip: "Tạo danh sách lựa chọn hoặc giới hạn số trong khoảng" }
    ,"sheet.data.textToColumns": { label: "Tách văn bản", tooltip: "Tách một cột theo dấu phân cách hoặc độ rộng cố định" }
    ,"sheet.data.flashFill": { label: "Điền nhanh", tooltip: "Điền theo mẫu từ ví dụ ở cột kế bên" }
    ,"sheet.data.removeDuplicates": { label: "Xóa trùng lặp", tooltip: "Xóa hàng trùng theo các cột được chọn" }
    ,"sheet.data.consolidate": { label: "Hợp nhất dữ liệu", tooltip: "Gộp dữ liệu từ nhiều vùng hoặc trang tính thành một bảng tổng hợp" }
    ,"sheet.data.group": { label: "Nhóm", tooltip: "Nhóm các hàng hoặc cột liên tiếp đang chọn" }
    ,"sheet.data.ungroup": { label: "Bỏ nhóm", tooltip: "Bỏ nhóm hàng hoặc cột đang chọn" }
    ,"sheet.data.subtotal": { label: "Tổng phụ", tooltip: "Chèn tổng phụ theo nhóm và tổng cộng cuối bảng" }
    ,"sheet.data.goalSeek": { label: "Dò tìm mục tiêu", tooltip: "Tìm giá trị đầu vào để công thức đạt kết quả mong muốn (Goal Seek)" }
    ,"sheet.data.dataTable": { label: "Bảng dữ liệu", tooltip: "Tính công thức với một hoặc hai dãy giá trị đầu vào thay thế" }
    ,"sheet.data.scenarioManager": { label: "Trình quản lý kịch bản", tooltip: "Lưu và chuyển đổi nhiều bộ giá trị giả định có tên" }
    ,"sheet.data.pivotTable": { label: "Bảng tổng hợp", tooltip: "Tạo Pivot Table từ vùng dữ liệu đang chọn" }
    ,"sheet.data.pivotRefresh": { label: "Làm mới Pivot", tooltip: "Tính lại Pivot Table từ dữ liệu nguồn" }
    ,"sheet.view.normal": { label: "Bình thường", tooltip: "Xem bảng tính ở chế độ bình thường" }
    ,"sheet.view.pageBreakPreview": { label: "Xem ngắt trang", tooltip: "Hiển thị vị trí các ngắt trang và vùng in" }
    ,"sheet.view.pageLayout": { label: "Bố trí trang", tooltip: "Xem bảng tính như khi in ra giấy kèm đầu/chân trang" }
    ,"sheet.view.formulaBar": { label: "Thanh công thức", tooltip: "Ẩn hoặc hiện thanh công thức" }
    ,"sheet.view.toggleFormulas": { label: "Hiện công thức", tooltip: "Hiển thị công thức thay vì kết quả (Ctrl+`)" }
    ,"sheet.view.freezePanes": { label: "Cố định ô", tooltip: "Cố định các hàng phía trên và cột bên trái Ô đang chọn khi cuộn (Freeze Panes)" }
    ,"sheet.view.freezeTopRow": { label: "Cố định hàng trên cùng", tooltip: "Chỉ cố định hàng 1 khi cuộn dọc (Freeze Top Row)" }
    ,"sheet.view.freezeFirstColumn": { label: "Cố định cột đầu tiên", tooltip: "Chỉ cố định cột A khi cuộn ngang (Freeze First Column)" }
    ,"sheet.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị bảng tính" }
    ,"sheet.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị bảng tính" }
    ,"sheet.view.zoomReset": { label: "100%", tooltip: "Đặt lại tỉ lệ hiển thị 100%" }
    ,"sheet.view.zoomToSelection": { label: "Thu phóng vùng chọn", tooltip: "Thu phóng bảng tính để vừa khít vùng ô đang chọn" }
    ,"sheet.view.newWindow": { label: "Cửa sổ mới", tooltip: "Mở tài liệu bảng tính trong một cửa sổ trình duyệt mới" }
    ,"sheet.view.gridlines": { label: "Đường lưới", tooltip: "Ẩn hoặc hiện đường viền ô" }
    ,"sheet.view.headings": { label: "Tiêu đề", tooltip: "Ẩn hoặc hiện tiêu đề hàng và cột" }
    ,"sheet.review.spellCheck": { label: "Chính tả", tooltip: "Kiểm tra chính tả tiếng Việt trên các ô văn bản của trang tính hiện tại (F7)" }
    ,"sheet.review.commentInsert": { label: "Ghi chú mới", tooltip: "Thêm, sửa hoặc xóa ghi chú của ô đang chọn" }
    ,"sheet.review.commentPrevious": { label: "Nhận xét trước", tooltip: "Nhảy tới nhận xét trước đó" }
    ,"sheet.review.commentNext": { label: "Nhận xét sau", tooltip: "Nhảy tới nhận xét tiếp theo" }
    ,"sheet.review.commentDelete": { label: "Xóa nhận xét", tooltip: "Xóa nhận xét đang chọn" }
    ,"sheet.review.commentResolve": { label: "Đã xử lý", tooltip: "Đánh dấu hoặc mở lại nhận xét đang chọn" }
    ,"sheet.file.printPreview": { label: "Xem trước khi in", tooltip: "Xem trước khi in (Ctrl+F2)" }
    ,"sheet.page.setPrintArea": { label: "Đặt vùng in", tooltip: "Đặt vùng đang chọn làm vùng in" }
    ,"sheet.page.clearPrintArea": { label: "Xóa vùng in", tooltip: "Xóa vùng in của trang tính hiện tại" }
    ,"sheet.page.insertPageBreak": { label: "Chèn ngắt trang", tooltip: "Chèn ngắt hàng và cột tại ô đang chọn" }
    ,"sheet.page.removePageBreak": { label: "Xóa ngắt trang", tooltip: "Xóa ngắt hàng và cột tại ô đang chọn" }
    ,"sheet.insert.cells": { label: "Chèn ô/hàng/cột...", tooltip: "Chèn ô, hàng hoặc cột (Ctrl+Shift++)" }
    ,"sheet.sheet.insertBefore": { label: "Chèn trang tính mới", tooltip: "Chèn trang tính mới trước trang hiện tại (Shift+F11)" }
    ,"sheet.row.insert": { label: "Chèn hàng", tooltip: "Chèn thêm hàng mới (Ctrl+Shift+=)" }
    ,"sheet.col.insert": { label: "Chèn cột", tooltip: "Chèn thêm cột mới" }
    ,"sheet.row.delete": { label: "Xóa hàng", tooltip: "Xóa hàng chứa ô đang chọn" }
    ,"sheet.col.delete": { label: "Xóa cột", tooltip: "Xóa cột chứa ô đang chọn" }
    ,"sheet.row.height": { label: "Chiều cao hàng...", tooltip: "Đặt chiều cao (pixel) cho các hàng đang chọn" }
    ,"sheet.row.autoFit": { label: "Tự động vừa chiều cao hàng", tooltip: "Tự động vừa chiều cao theo nội dung các hàng đang chọn" }
    ,"sheet.col.width": { label: "Độ rộng cột...", tooltip: "Đặt độ rộng (pixel) cho các cột đang chọn" }
    ,"sheet.col.autoFit": { label: "Tự động vừa độ rộng cột", tooltip: "Tự động vừa độ rộng theo nội dung các cột đang chọn" }
    ,"sheet.row.hide": { label: "Ẩn hàng", tooltip: "Ẩn các hàng đang chọn" }
    ,"sheet.row.unhide": { label: "Hiện hàng", tooltip: "Hiện các hàng đã ẩn trong vùng chọn" }
    ,"sheet.col.hide": { label: "Ẩn cột", tooltip: "Ẩn các cột đang chọn" }
    ,"sheet.col.unhide": { label: "Hiện cột", tooltip: "Hiện các cột đã ẩn trong vùng chọn" }
    ,"sheet.sheet.rename": { label: "Đổi tên trang tính...", tooltip: "Đổi tên trang tính hiện tại (cùng hộp thoại với nhấp đúp tab dưới lưới)" }
    ,"sheet.sheet.moveOrCopy": { label: "Di chuyển hoặc Sao chép trang tính...", tooltip: "Đổi thứ tự tab hoặc tạo bản sao trang tính (dữ liệu, định dạng, Page Setup)" }
    ,"sheet.sheet.protect": { label: "Bảo vệ trang tính...", tooltip: "Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện, không phải bảo mật thật)" }
    ,"sheet.workbook.protect": { label: "Bảo vệ workbook...", tooltip: "Khóa cấu trúc workbook: không thêm, xóa, đổi tên, di chuyển hay sao chép trang tính. Không khóa nội dung ô (khóa giao diện, không phải bảo mật thật)" }
    ,"sheet.chart.insert": { label: "Biểu đồ", tooltip: "Chèn biểu đồ phân tích dữ liệu" }
    ,"sheet.chart.pivotChart": { label: "Biểu đồ Pivot", tooltip: "Chèn biểu đồ Cột hoặc Tròn liên kết với dữ liệu Pivot đã tổng hợp" }
    ,"sheet.insert.image": { label: "Chèn ảnh", tooltip: "Chèn ảnh vào ô đang chọn" }
    ,"sheet.style.formatAsTable": { label: "Định dạng bảng", tooltip: "Định dạng vùng chọn theo kiểu bảng có màu xen kẽ" }
    ,"sheet.style.cellStyles": { label: "Kiểu ô", tooltip: "Mở thư viện kiểu ô định sẵn (Normal, Good, Bad, Neutral...)" }
    ,"sheet.edit.fillDown": { label: "Điền xuống", tooltip: "Sao chép giá trị và công thức ô trên xuống các ô dưới (Ctrl+D)" }
    ,"sheet.edit.fillRight": { label: "Điền phải", tooltip: "Sao chép giá trị và công thức ô bên trái sang phải (Ctrl+R)" }
    ,"sheet.edit.clearAll": { label: "Xóa tất cả", tooltip: "Xóa toàn bộ nội dung, công thức và định dạng của các ô đã chọn" }
    ,"sheet.edit.clearFormats": { label: "Xóa định dạng", tooltip: "Xóa định dạng ô và đưa về mặc định nhưng giữ nguyên nội dung" }
    ,"sheet.edit.clearContents": { label: "Xóa nội dung", tooltip: "Xóa nội dung và công thức của ô nhưng giữ nguyên định dạng" }
    ,"slides.review.commentInsert": { label: "Nhận xét mới", tooltip: "Thêm nhận xét cho trang chiếu hiện tại" }
    ,"slides.review.commentPrevious": { label: "Nhận xét trước", tooltip: "Nhảy tới nhận xét trước đó" }
    ,"slides.review.commentNext": { label: "Nhận xét sau", tooltip: "Nhảy tới nhận xét tiếp theo" }
    ,"slides.review.commentDelete": { label: "Xóa nhận xét", tooltip: "Xóa nhận xét đang chọn" }
    ,"slides.review.commentResolve": { label: "Đã xử lý", tooltip: "Đánh dấu hoặc mở lại nhận xét đang chọn" }
    ,"slides.review.spellCheck": { label: "Chính tả", tooltip: "Kiểm tra chính tả tiếng Việt trên trang chiếu hiện tại (F7)" }
    ,"slides.edit.formatPainter": { label: "Sao chép định dạng", tooltip: "Sao chép định dạng chữ hoặc hình đang chọn sang đối tượng khác. Nhấp đúp để khóa và áp dụng nhiều lần. Esc để hủy." }
    ,"slides.edit.selectAll": { label: "Chọn tất cả", tooltip: "Chọn tất cả hình trên trang chiếu hiện tại" }
    ,"slides.edit.selectObjects": { label: "Chọn đối tượng", tooltip: "Chọn các đối tượng vẽ trên trang chiếu hiện tại (không gồm đường nối)" }
    ,"slides.slide.new": { label: "Trang mới", tooltip: "Chèn trang chiếu mới (Ctrl+M)" }
    ,"slides.layout.apply": { label: "Bố cục", tooltip: "Thay đổi bố cục trang chiếu (Tiêu đề, Nội dung, Hai cột, Trống)" }
    ,"slides.layout.select": { label: "Chọn bố cục", tooltip: "Mở hộp thoại chọn bố cục trang chiếu" }
    ,"slides.slide.duplicate": { label: "Nhân đôi", tooltip: "Nhân đôi trang chiếu đang chọn (Ctrl+D)" }
    ,"slides.slide.delete": { label: "Xóa trang", tooltip: "Xóa trang chiếu đang chọn (Delete)" }
    ,"slides.slide.toggleHidden": { label: "Ẩn trang chiếu", tooltip: "Ẩn hoặc hiện trang chiếu đang chọn khi trình chiếu F5. Trang vẫn còn trong tệp và Slide Sorter." }
    ,"slides.section.add": { label: "Thêm phần", tooltip: "Thêm phần bắt đầu từ trang đang chọn để nhóm các trang chiếu liên tiếp" }
    ,"slides.section.rename": { label: "Đổi tên phần", tooltip: "Đổi tên phần chứa trang chiếu đang chọn" }
    ,"slides.section.remove": { label: "Xóa phần", tooltip: "Bỏ nhóm phần — không xóa các trang chiếu bên trong" }
    ,"slides.section.moveUp": { label: "Chuyển phần lên", tooltip: "Di chuyển cả nhóm trang của phần lên trên phần kề trước, giữ thứ tự trang bên trong" }
    ,"slides.section.moveDown": { label: "Chuyển phần xuống", tooltip: "Di chuyển cả nhóm trang của phần xuống dưới phần kề sau, giữ thứ tự trang bên trong" }
    ,"slides.text.insert": { label: "Hộp văn bản", tooltip: "Chèn khung văn bản mới" }
    ,"slides.shape.insert": { label: "Hình khối", tooltip: "Chèn hình chữ nhật, tròn, mũi tên" }
    ,"slides.diagram.insert": { label: "Sơ đồ", tooltip: "Chèn sơ đồ quy trình, chu kỳ hoặc phân cấp" }
    ,"slides.image.insert": { label: "Hình ảnh", tooltip: "Chèn ảnh minh họa từ máy tính" }
    ,"slides.media.insertVideo": { label: "Video", tooltip: "Chèn video từ máy tính" }
    ,"slides.media.insertAudio": { label: "Âm thanh", tooltip: "Chèn âm thanh từ máy tính" }
    ,"slides.insert.table": { label: "Bảng", tooltip: "Chèn bảng vào trang chiếu, kéo-thả và đổi kích thước được" }
    ,"slides.insert.chart": { label: "Biểu đồ", tooltip: "Chèn biểu đồ vào trang chiếu" }
    ,"slides.insert.headerFooter": { label: "Đầu trang & Chân trang", tooltip: "Bật/tắt ngày tháng, số trang và chân trang" }
    ,"slides.insert.dateTime": { label: "Ngày & Giờ", tooltip: "Chèn placeholder ngày giờ tự cập nhật" }
    ,"slides.insert.slideNumber": { label: "Số trang chiếu", tooltip: "Chèn placeholder số trang chiếu tự cập nhật" }
    ,"slides.insert.symbol": { label: "Ký hiệu", tooltip: "Chèn ký tự đặc biệt vào khung văn bản đang chọn" }
    ,"slides.insert.wordart": { label: "Chữ nghệ thuật", tooltip: "Chèn chữ nghệ thuật với viền, đổ bóng hoặc gradient" }
    ,"slides.master.apply": { label: "Mẫu Slide Master", tooltip: "Áp dụng mẫu Slide Master đồng bộ font, màu, logo cho toàn bộ trang chiếu" }
    ,"slides.design.themeGallery": { label: "Chủ đề", tooltip: "Chọn chủ đề thiết kế cho toàn bộ bản trình chiếu" }
    ,"slides.design.slideSize": { label: "Cỡ trang chiếu", tooltip: "Chọn tỷ lệ trang chiếu 16:9 hoặc 4:3" }
    ,"slides.design.formatBackground": { label: "Định dạng nền", tooltip: "Đổi nền trang chiếu hiện tại hoặc tất cả trang: màu đơn, gradient 2 màu, hoặc ảnh" }
    ,"slides.transition.apply": { label: "Chuyển tiếp", tooltip: "Hiệu ứng chuyển trang chiếu (Fade, Slide, Zoom, Flip)" }
    ,"slides.animation.apply": { label: "Hiệu ứng đối tượng", tooltip: "Thiết lập hiệu ứng xuất hiện (Fade In, Fly In, Zoom In) cho đối tượng" }
    ,"slides.animation.pane": { label: "Ngăn hoạt hình", tooltip: "Hiện danh sách mọi hiệu ứng trên trang đang chọn, đổi thứ tự, cách bắt đầu hoặc xóa hiệu ứng" }
    ,"slides.view.normal": { label: "Bình thường", tooltip: "Dạng xem bình thường để chỉnh sửa từng trang chiếu" }
    ,"slides.view.slideSorter": { label: "Bộ sắp xếp trang", tooltip: "Xem toàn bộ trang chiếu dạng lưới và kéo thả để sắp xếp" }
    ,"slides.notes.toggle": { label: "Ghi chú thuyết trình", tooltip: "Bật/tắt khung ghi chú người thuyết trình dưới trang chiếu" }
    ,"slides.view.reading": { label: "Chế độ đọc", tooltip: "Xem toàn bộ trang chiếu để đọc thuận tiện; nhấn Esc để thoát" }
    ,"slides.view.ruler": { label: "Thước", tooltip: "Ẩn hoặc hiện thước căn chỉnh trang chiếu" }
    ,"slides.view.gridlines": { label: "Đường lưới", tooltip: "Ẩn hoặc hiện đường lưới căn chỉnh" }
    ,"slides.view.guides": { label: "Đường hướng dẫn", tooltip: "Ẩn hoặc hiện các đường hướng dẫn căn chỉnh shape kéo được" }
    ,"slides.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị trang chiếu" }
    ,"slides.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị trang chiếu" }
    ,"slides.view.zoomReset": { label: "100%", tooltip: "Đặt lại tỉ lệ hiển thị 100%" }
    ,"slides.view.fitToWindow": { label: "Vừa cửa sổ", tooltip: "Thu phóng trang chiếu vừa khít cửa sổ làm việc" }
    ,"slides.view.newWindow": { label: "Cửa sổ mới", tooltip: "Mở tài liệu trình chiếu trong cửa sổ mới" }
    ,"slides.show.startFromBegin": { label: "Từ đầu", tooltip: "Bắt đầu trình chiếu từ trang đầu tiên (F5)" }
    ,"slides.show.startFromCurrent": { label: "Từ trang này", tooltip: "Trình chiếu từ trang hiện tại (Shift+F5)" }
    ,"slides.show.presenterMode": { label: "Chế độ Presenter", tooltip: "Trình chiếu chế độ Người thuyết trình kèm ghi chú và đồng hồ (Alt+F5)" }
    ,"slides.show.rehearseTimings": { label: "Tập dượt hẹn giờ", tooltip: "Trình chiếu và đo thời gian thật ở mỗi trang, có thể lưu lại làm mốc thời gian" }
    ,"slides.show.setupShow": { label: "Thiết lập trình chiếu", tooltip: "Lặp liên tục đến Esc, trình chiếu không thuyết minh, màu bút/laser" }
    ,"slides.file.printPreview": { label: "Xem trước khi in", tooltip: "Xem trước khi in (Ctrl+F2)" }
    ,"slides.shape.group": { label: "Nhóm đối tượng", tooltip: "Nhóm các đối tượng đang chọn thành một khối (Ctrl+G)" }
    ,"slides.shape.ungroup": { label: "Bỏ nhóm", tooltip: "Tách nhóm đối tượng đang chọn (Ctrl+Shift+G)" }
    ,"slides.arrange.bringToFront": { label: "Đưa lên trên cùng", tooltip: "Đưa đối tượng đang chọn lên trên tất cả đối tượng khác" }
    ,"slides.arrange.bringForward": { label: "Đưa lên trên một lớp", tooltip: "Đưa đối tượng đang chọn lên trên một lớp" }
    ,"slides.arrange.sendBackward": { label: "Đưa xuống dưới một lớp", tooltip: "Đưa đối tượng đang chọn xuống dưới một lớp" }
    ,"slides.arrange.sendToBack": { label: "Đưa xuống dưới cùng", tooltip: "Đưa đối tượng đang chọn xuống dưới tất cả đối tượng khác" }
    ,"slides.arrange.alignLeft": { label: "Căn trái", tooltip: "Căn các đối tượng đang chọn theo mép trái" }
    ,"slides.arrange.alignCenter": { label: "Căn giữa (ngang)", tooltip: "Căn các đối tượng đang chọn giữa theo chiều ngang" }
    ,"slides.arrange.alignRight": { label: "Căn phải", tooltip: "Căn các đối tượng đang chọn theo mép phải" }
    ,"slides.arrange.alignTop": { label: "Căn trên", tooltip: "Căn các đối tượng đang chọn theo mép trên" }
    ,"slides.arrange.alignMiddle": { label: "Căn giữa (dọc)", tooltip: "Căn các đối tượng đang chọn giữa theo chiều dọc" }
    ,"slides.arrange.alignBottom": { label: "Căn dưới", tooltip: "Căn các đối tượng đang chọn theo mép dưới" }
    ,"slides.arrange.distributeHorizontal": { label: "Phân phối đều ngang", tooltip: "Chia đều khoảng cách ngang giữa các đối tượng (từ 3 đối tượng trở lên)" }
    ,"slides.arrange.distributeVertical": { label: "Phân phối đều dọc", tooltip: "Chia đều khoảng cách dọc giữa các đối tượng (từ 3 đối tượng trở lên)" }
    ,"slides.arrange.alignToSlide": { label: "Căn theo trang chiếu", tooltip: "Bật: căn theo toàn bộ khung trang chiếu. Tắt: căn theo khung các đối tượng đang chọn" }
    ,"slides.text.vAlignTop": { label: "Căn lề trên", tooltip: "Căn văn bản lên đầu khung chữ" }
    ,"slides.text.vAlignMiddle": { label: "Căn giữa (dọc)", tooltip: "Căn văn bản giữa khung chữ theo chiều dọc" }
    ,"slides.text.vAlignBottom": { label: "Căn lề dưới", tooltip: "Căn văn bản xuống đáy khung chữ" }
    ,"slides.text.directionHorizontal": { label: "Ngang", tooltip: "Văn bản nằm ngang (mặc định)" }
    ,"slides.text.directionVertical": { label: "Xoay chữ 90°", tooltip: "Xoay toàn bộ văn bản 90°" }
    ,"slides.text.directionVertical270": { label: "Xoay chữ 270°", tooltip: "Xoay toàn bộ văn bản 270°" }
    ,"slides.text.directionStacked": { label: "Xếp chồng", tooltip: "Xếp chồng từng ký tự theo chiều dọc, không xoay" }
    ,"slides.nav.firstSlide": { label: "Trang đầu tiên", tooltip: "Về trang chiếu đầu tiên (Ctrl+Home)" }
    ,"slides.nav.lastSlide": { label: "Trang cuối cùng", tooltip: "Đến trang chiếu cuối cùng (Ctrl+End)" }
    ,"slides.nav.prevSlide": { label: "Trang trước", tooltip: "Về trang chiếu trước (Page Up)" }
    ,"slides.nav.nextSlide": { label: "Trang sau", tooltip: "Đến trang chiếu sau (Page Down)" }
    ,"slides.text.bold": { label: "Đậm", tooltip: "Chữ đậm (Ctrl+B)" }
    ,"slides.text.italic": { label: "Nghiêng", tooltip: "Chữ nghiêng (Ctrl+I)" }
    ,"slides.text.underline": { label: "Gạch chân", tooltip: "Gạch chân chữ (Ctrl+U)" }
    ,"slides.text.strike": { label: "Gạch ngang", tooltip: "Gạch ngang chữ" }
    ,"slides.text.clearFormat": { label: "Xóa định dạng", tooltip: "Xóa định dạng chữ, giữ nguyên nội dung" }
    ,"slides.font.family": { label: "Phông chữ", tooltip: "Chọn phông chữ" }
    ,"slides.font.size": { label: "Cỡ chữ", tooltip: "Chọn cỡ chữ" }
    ,"slides.font.grow": { label: "Tăng cỡ chữ", tooltip: "Tăng cỡ chữ" }
    ,"slides.font.shrink": { label: "Giảm cỡ chữ", tooltip: "Giảm cỡ chữ" }
    ,"slides.color.text": { label: "Màu chữ", tooltip: "Đổi màu chữ" }
    ,"slides.color.highlight": { label: "Màu nền chữ", tooltip: "Tô màu nền văn bản" }
    ,"slides.list.bullet": { label: "Dấu đầu dòng", tooltip: "Tạo danh sách dấu đầu dòng" }
    ,"slides.list.numbered": { label: "Đánh số", tooltip: "Tạo danh sách đánh số thứ tự" }
    ,"slides.para.alignLeft": { label: "Căn trái", tooltip: "Căn lề trái (Ctrl+L)" }
    ,"slides.para.alignCenter": { label: "Căn giữa", tooltip: "Căn lề giữa (Ctrl+E)" }
    ,"slides.para.alignRight": { label: "Căn phải", tooltip: "Căn lề phải (Ctrl+R)" }
    ,"slides.para.justify": { label: "Căn đều", tooltip: "Căn đều hai bên (Ctrl+J)" }
    ,"slides.para.indentInc": { label: "Thụt lề", tooltip: "Tăng thụt lề đoạn văn" }
    ,"slides.para.indentDec": { label: "Giảm thụt lề", tooltip: "Giảm thụt lề đoạn văn" }
    ,"slides.para.lineSpacing": { label: "Giãn dòng", tooltip: "Chọn khoảng cách dòng 1.0 / 1.5 / 2.0" }
    ,"slides.help.open": { label: "Trợ giúp", tooltip: "Mở hướng dẫn sử dụng (F1)" }

    ,// 3T Doc Commands
    "writer.text.bold": { label: "Đậm", tooltip: "Chữ đậm (Ctrl+B)" },
    "writer.text.italic": { label: "Nghiêng", tooltip: "Chữ nghiêng (Ctrl+I)" },
    "writer.text.underline": { label: "Gạch chân", tooltip: "Gạch chân chữ (Ctrl+U)" },
    "writer.text.strike": { label: "Gạch ngang", tooltip: "Gạch ngang chữ" },
    "writer.font.grow": { label: "Tăng cỡ chữ", tooltip: "Tăng cỡ chữ nhanh (Ctrl+Shift+>)" },
    "writer.font.shrink": { label: "Giảm cỡ chữ", tooltip: "Giảm cỡ chữ nhanh (Ctrl+Shift+<)" },
    "writer.font.grow1pt": { label: "Tăng cỡ chữ 1 điểm", tooltip: "Tăng cỡ chữ thêm 1 điểm (Ctrl+])" },
    "writer.font.shrink1pt": { label: "Giảm cỡ chữ 1 điểm", tooltip: "Giảm cỡ chữ đi 1 điểm (Ctrl+[)" },
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
    "writer.para.spacingBefore": { label: "Khoảng trước đoạn", tooltip: "Khoảng cách trước đoạn văn (đơn vị pt)" },
    "writer.para.spacingAfter": { label: "Khoảng sau đoạn", tooltip: "Khoảng cách sau đoạn văn (đơn vị pt)" },
    "writer.list.bullet": { label: "Dấu đầu dòng", tooltip: "Tạo danh sách dấu chấm tròn" },
    "writer.list.numbered": { label: "Đánh số", tooltip: "Tạo danh sách đánh số thứ tự" },
    "writer.para.multilevelList": { label: "Danh sách đa cấp", tooltip: "Danh sách nhiều cấp: 1. / 1.1. / 1.1.1., 1. / a. / i., hoặc Điều / Khoản / Điểm (NĐ 30)" },
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
    "writer.diagram.insert": { label: "Sơ đồ", tooltip: "Chèn sơ đồ quy trình, chu trình hoặc phân cấp" },
    "writer.chart.insert": { label: "Biểu đồ", tooltip: "Chèn biểu đồ minh họa dữ liệu" },
    "writer.page.break": { label: "Ngắt trang", tooltip: "Ngắt sang trang mới (Ctrl+Enter)" },
    "writer.header.insert": { label: "Đầu trang", tooltip: "Chèn tiêu đề đầu trang (Header)" },
    "writer.footer.insert": { label: "Chân trang", tooltip: "Chèn tiêu đề chân trang (Footer)" },
    "writer.insert.textbox": { label: "Hộp văn bản", tooltip: "Chèn khung văn bản độc lập, kéo-thả được" },
    "writer.insert.wordart": { label: "Chữ nghệ thuật", tooltip: "Chèn chữ nghệ thuật với viền, đổ bóng hoặc gradient tại vị trí con trỏ" },
    "writer.format.dropCap": { label: "Chữ đầu đoạn", tooltip: "Phóng to chữ cái đầu đoạn văn (Drop Cap)" },
    "writer.insert.dateTime": { label: "Ngày & Giờ", tooltip: "Chèn ngày giờ hiện tại tại vị trí con trỏ" },
    "writer.insert.equation": { label: "Công thức", tooltip: "Chèn hộp công thức toán học dạng chữ (bản rút gọn)" },
    "writer.insert.symbol": { label: "Ký hiệu", tooltip: "Chèn ký tự đặc biệt tại vị trí con trỏ" },
    "writer.insert.bookmark": { label: "Đánh dấu", tooltip: "Đánh dấu vị trí trong tài liệu để nhảy tới sau" },
    "writer.insert.crossReference": { label: "Tham chiếu chéo", tooltip: "Chèn liên kết nội bộ tới tiêu đề hoặc đánh dấu" },
    "writer.comment.insert": { label: "Thêm ghi chú", tooltip: "Thêm ghi chú vào đoạn văn bản đang chọn (Ctrl+Alt+M)" },
    "writer.review.commentPrevious": { label: "Nhận xét trước", tooltip: "Nhảy tới nhận xét trước đó" },
    "writer.review.commentNext": { label: "Nhận xét sau", tooltip: "Nhảy tới nhận xét tiếp theo" },
    "writer.review.commentDelete": { label: "Xóa nhận xét", tooltip: "Xóa nhận xét đang chọn" },
    "writer.review.commentResolve": { label: "Đã xử lý", tooltip: "Đánh dấu hoặc mở lại nhận xét đang chọn" },
    "writer.trackChanges.toggle": { label: "Theo dõi thay đổi", tooltip: "Bật/tắt đánh dấu nội dung thêm và xóa (Ctrl+Shift+E)" },
    "writer.trackChanges.previous": { label: "Thay đổi trước", tooltip: "Nhảy tới thay đổi trước đó" },
    "writer.trackChanges.next": { label: "Thay đổi sau", tooltip: "Nhảy tới thay đổi tiếp theo" },
    "writer.trackChanges.acceptOne": { label: "Chấp nhận một", tooltip: "Chấp nhận thay đổi đang chọn" },
    "writer.trackChanges.rejectOne": { label: "Từ chối một", tooltip: "Từ chối thay đổi đang chọn" },
    "writer.trackChanges.acceptAll": { label: "Chấp nhận thay đổi", tooltip: "Chấp nhận toàn bộ thay đổi trong tài liệu" },
    "writer.trackChanges.rejectAll": { label: "Từ chối thay đổi", tooltip: "Từ chối toàn bộ thay đổi trong tài liệu" },
    "writer.review.wordCount": { label: "Đếm từ", tooltip: "Xem số từ, ký tự, đoạn văn và dòng của tài liệu" },
    "writer.help.open": { label: "Trợ giúp", tooltip: "Mở hướng dẫn sử dụng (F1)" },
    "writer.page.margins": { label: "Căn lề", tooltip: "Thiết lập lề tiêu chuẩn văn bản Việt Nam" },
    "writer.page.orientation": { label: "Hướng giấy", tooltip: "Khổ giấy dọc hoặc ngang" },
    "writer.page.size": { label: "Khổ giấy", tooltip: "Chọn khổ A4, Letter, v.v." },
    "writer.page.columns": { label: "Cột", tooltip: "Chia văn bản thành nhiều cột (1, 2, 3 cột hoặc tùy chỉnh)" },
    "writer.page.columns1": { label: "1 cột", tooltip: "Định dạng toàn bộ văn bản 1 cột (Normal mặc định)" },
    "writer.page.columns2": { label: "2 cột", tooltip: "Chia nội dung văn bản thành 2 cột đều nhau" },
    "writer.page.columns3": { label: "3 cột", tooltip: "Chia nội dung văn bản thành 3 cột đều nhau" },
    "writer.break.column": { label: "Ngắt cột", tooltip: "Chuyển nội dung sau con trỏ sang cột kế tiếp" },
    "writer.section.nextPage": { label: "Ngắt mục — Trang kế tiếp", tooltip: "Bắt đầu mục mới trên trang kế tiếp với thiết lập trang riêng" },
    "writer.section.continuous": { label: "Ngắt mục — Liên tục", tooltip: "Bắt đầu mục mới tại vị trí hiện tại với thiết lập trang riêng" },
    "writer.section.evenPage": { label: "Ngắt mục — Trang chẵn", tooltip: "Bắt đầu mục mới trên trang chẵn kế tiếp" },
    "writer.section.oddPage": { label: "Ngắt mục — Trang lẻ", tooltip: "Bắt đầu mục mới trên trang lẻ kế tiếp" },
    "writer.section.options": { label: "Đầu trang và chân trang theo mục", tooltip: "Thiết lập liên kết đầu trang, chân trang và trang đầu cho mục hiện tại" },
    "writer.section.linkToPrevious": { label: "Liên kết với mục trước", tooltip: "Dùng đầu trang và chân trang của mục trước" },
    "writer.section.differentFirstPage": { label: "Trang đầu khác biệt", tooltip: "Dùng đầu trang và chân trang riêng cho trang đầu" },
    "writer.section.differentOddEven": { label: "Trang chẵn và lẻ khác nhau", tooltip: "Dùng đầu trang và chân trang riêng cho trang chẵn và trang lẻ" },
    "writer.pageNumber.format": { label: "Định dạng số trang", tooltip: "Tiếp tục hoặc đặt lại số trang trong mục hiện tại" },
    "writer.section.delete": { label: "Xóa ngắt mục", tooltip: "Xóa ngắt mục đang chọn" },
    "writer.layout.sectionOptions": { label: "Tùy chọn mục", tooltip: "Thiết lập đầu trang, chân trang và số trang cho mục hiện tại" },
    "writer.layout.lineNumbers": { label: "Danh số dòng", tooltip: "Bật danh số dòng xuất ra Word/LibreOffice: Không có, Liên tục, Mỗi trang, Mỗi mục" },
    "writer.page.watermark": { label: "Hình mờ", tooltip: "Thiết lập hoặc xóa hình mờ văn bản (Dự thảo, Mật, Khẩn...)" },
    "writer.page.color": { label: "Màu trang", tooltip: "Đặt màu nền đặc cho trang tài liệu" },
    "writer.page.border": { label: "Viền trang", tooltip: "Thiết lập viền bao quanh trang tài liệu" },
    "writer.file.printPreview": { label: "Xem trước khi in", tooltip: "Xem trước khi in (Ctrl+F2)" },
    "writer.view.printLayout": { label: "Bố trí in", tooltip: "Hiển thị ranh giới trang, đầu trang và chân trang" },
    "writer.view.webLayout": { label: "Bố trí Web", tooltip: "Hiển thị nội dung liên tục theo chiều rộng cửa sổ" },
    "writer.view.readMode": { label: "Chế độ đọc", tooltip: "Ẩn ribbon và mở rộng vùng đọc; nhấn Esc để thoát" },
    "writer.view.ruler": { label: "Thước", tooltip: "Ẩn hoặc hiện thước ngang theo thiết lập trang" },
    "writer.view.gridlines": { label: "Đường lưới", tooltip: "Ẩn hoặc hiện lưới căn chỉnh không in" },
    "writer.view.zoomIn": { label: "Phóng to", tooltip: "Tăng tỉ lệ hiển thị tài liệu" },
    "writer.view.zoomOut": { label: "Thu nhỏ", tooltip: "Giảm tỉ lệ hiển thị tài liệu" },
    "writer.view.zoomReset": { label: "Đặt lại", tooltip: "Đặt lại tỉ lệ hiển thị 100%" },
    "writer.view.zoom100": { label: "100%", tooltip: "Hiển thị tài liệu ở tỉ lệ 100%" },
    "writer.view.pageWidth": { label: "Chiều rộng trang", tooltip: "Thu phóng để trang vừa chiều rộng vùng làm việc" },
    "writer.view.newWindow": { label: "Cửa sổ mới", tooltip: "Mở tài liệu trong một cửa sổ trình duyệt mới" },
    "writer.reference.tocInsert": { label: "Mục lục tự động", tooltip: "Chèn mục lục tự động từ các tiêu đề Heading" },
    "writer.reference.tocUpdate": { label: "Cập nhật mục lục", tooltip: "Cập nhật lại mục lục tài liệu" },
    "writer.reference.footnoteInsert": { label: "Chú thích trang", tooltip: "Chèn chú thích cuối trang (Footnote) (Ctrl+Alt+F)" },
    "writer.reference.endnoteInsert": { label: "Chú thích cuối", tooltip: "Chèn chú thích cuối tài liệu (Endnote) (Ctrl+Alt+D)" },
    "writer.reference.citationStyle": { label: "Kiểu trích dẫn", tooltip: "Chọn kiểu trích dẫn APA hoặc MLA" },
    "writer.reference.citationInsert": { label: "Chèn trích dẫn", tooltip: "Chèn trích dẫn từ danh sách nguồn" },
    "writer.reference.sourcesManage": { label: "Quản lý nguồn", tooltip: "Thêm, sửa hoặc xóa nguồn tài liệu" },
    "writer.reference.bibliographyInsert": { label: "Thư mục tài liệu", tooltip: "Chèn danh mục từ các nguồn đã dùng" },
    "writer.reference.captionInsert": { label: "Chèn chú thích ảnh", tooltip: "Chèn chú thích tự đánh số cho hình ảnh, bảng hoặc phương trình" },
    "writer.reference.tofInsert": { label: "Danh mục hình ảnh", tooltip: "Chèn danh mục hình ảnh/bảng tự động từ các chú thích đã chèn" },
    "writer.reference.tofUpdate": { label: "Cập nhật danh mục", tooltip: "Cập nhật lại danh mục hình ảnh/bảng từ các chú thích hiện có" },
    "writer.mailMerge.open": { label: "Nguồn dữ liệu", tooltip: "Mở danh sách người nhận trộn thư từ tệp Excel (.xlsx, .xls) hoặc CSV/TSV" },
    "writer.mailMerge.insertField": { label: "Chèn trường", tooltip: "Chèn trường trộn thư tại vị trí con trỏ" },
    "writer.mailMerge.preview": { label: "Xem trước kết quả", tooltip: "Bật/tắt xem trước bản ghi trộn thư" },
    "writer.mailMerge.prevRecord": { label: "Bản ghi trước", tooltip: "Chuyển tới bản ghi trước" },
    "writer.mailMerge.nextRecord": { label: "Bản ghi sau", tooltip: "Chuyển tới bản ghi tiếp theo" },
    "writer.mailMerge.finish": { label: "Hoàn tất & Trộn", tooltip: "Hoàn tất trộn: xuất ra tài liệu mới hoặc in trực tiếp" },
    "writer.mailings.envelopes": { label: "Phong bì", tooltip: "Tạo trang phong bì với địa chỉ người nhận và người gửi" },
    "writer.mailings.labels": { label: "Nhãn", tooltip: "Tạo trang nhãn — một nội dung hoặc hàng loạt từ Trộn thư" }
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
      view: "Chế độ xem",
      help: "Trợ giúp",
      ai: "Trợ lý 3T AI"
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
      text: "Văn bản",
      symbols: "Ký hiệu",
      tocNotes: "Mục lục & Chú thích",
      pageSetup: "Thiết lập trang",
      pageBackground: "Nền & Viền trang",
      print: "In ấn",
      tableOfContents: "Mục lục",
      footnotes: "Chú thích",
      citationsBibliography: "Trích dẫn & Thư mục tài liệu",
      captions: "Chú thích ảnh",
      createMailings: "Tạo",
      startMerge: "Bắt đầu trộn",
      writeInsert: "Viết & Chèn trường",
      previewResults: "Xem trước kết quả",
      finishMerge: "Hoàn tất",
      proofread: "Chính tả & Ngữ pháp",
      comments: "Ghi chú",
      tracking: "Theo dõi thay đổi",
      views: "Dạng xem",
      show: "Hiển thị",
      zoom: "Thu phóng",
      window: "Cửa sổ",
      macro: "Macro",
      help: "Trợ giúp",
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
      applyTo: "Áp dụng cho",
      thisSection: "Mục này",
      wholeDocument: "Toàn bộ tài liệu",
      apply: "Áp dụng",
      cancel: "Hủy bỏ",
      close: "Đóng"
    },
    sections: {
      nextPage: "Ngắt mục (Trang tiếp theo)",
      continuous: "Ngắt mục (Liên tục)",
      evenPage: "Ngắt mục (Trang chẵn)",
      oddPage: "Ngắt mục (Trang lẻ)",
      linkToPrevious: "Liên kết với phần trước",
      differentFirstPage: "Trang đầu khác biệt",
      differentOddEven: "Trang chẵn và lẻ khác nhau",
      pageNumbers: "Định dạng số trang",
      continueFromPrevious: "Tiếp tục từ phần trước",
      startAt: "Bắt đầu tại:",
      deleteSection: "Xóa ngắt mục",
      numbering: "Đánh số trang",
      optionsTitle: "Đầu trang và chân trang theo mục",
      defaultHeader: "Đầu trang mặc định",
      firstHeader: "Đầu trang trang đầu",
      evenHeader: "Đầu trang trang chẵn",
      defaultFooter: "Chân trang mặc định",
      firstFooter: "Chân trang trang đầu",
      evenFooter: "Chân trang trang chẵn",
      optionsDescription: "Các tùy chọn này chỉ áp dụng cho mục hiện tại.",
      firstSection: "Mục đầu tiên không thể liên kết với mục trước."
    },
    wordCount: {
      title: "Đếm từ",
      scopeDocument: "Thống kê cho toàn bộ tài liệu",
      scopeSelection: "Thống kê cho vùng đang chọn",
      words: "Từ",
      charsNoSpaces: "Ký tự (không khoảng trắng)",
      charsWithSpaces: "Ký tự (có khoảng trắng)",
      paragraphs: "Đoạn văn",
      lines: "Dòng",
      statusLabel: "{count} từ"
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
    pageColor: {
      title: "Màu trang",
      hint: "Chọn màu nền đặc áp dụng cho toàn bộ trang in và vùng soạn thảo.",
      palette: "Bảng màu trang",
      noColor: "Không màu",
      custom: "Màu tùy chỉnh:",
      cancel: "Hủy",
      apply: "Áp dụng"
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
        blueOffice: "Xanh 3T Office",
        charcoal: "Đen than",
        gray: "Xám trung tính",
        adminRed: "Đỏ hành chính",
        green: "Xanh lá cây"
      }
    },
    caption: {
      title: "Chèn chú thích ảnh",
      label: "Nhãn",
      position: "Vị trí",
      text: "Nội dung chú thích",
      insert: "Chèn",
      deleteTooltip: "Xóa chú thích ảnh"
    },
    tof: {
      title: "Chèn danh mục hình ảnh",
      captionLabel: "Nhãn chú thích",
      updateBtn: "Cập nhật",
      updateTooltip: "Cập nhật danh mục hình ảnh",
      deleteTooltip: "Xóa danh mục hình ảnh",
      empty: "Chưa có chú thích nào trong tài liệu. Hãy chèn chú thích ảnh hoặc bảng rồi cập nhật lại danh mục."
    },
    envelopes: {
      title: "Phong bì",
      hint: "Nhập địa chỉ người nhận và (tuỳ chọn) người gửi, chọn khổ phong bì, rồi thêm một trang riêng vào tài liệu.",
      delivery: "Địa chỉ người nhận",
      returnAddr: "Địa chỉ người gửi",
      omitReturn: "Ẩn địa chỉ người gửi",
      size: "Khổ phong bì",
      position: "Vị trí trang",
      positionStart: "Đầu tài liệu",
      positionEnd: "Cuối tài liệu",
      addToDocument: "Thêm vào tài liệu",
      useMailMerge: "Dùng nguồn Trộn thư hiện có",
      records: "bản ghi",
      deliveryRequired: "Hãy nhập địa chỉ người nhận, hoặc bật nguồn Trộn thư."
    },
    labels: {
      title: "Nhãn",
      hint: "Nhập nội dung một nhãn (mọi ô giống nhau) hoặc dùng nguồn Trộn thư để mỗi ô một bản ghi. Nhiều hơn một tờ thì tự thêm trang.",
      content: "Nội dung nhãn",
      layout: "Kiểu lưới nhãn",
      createPage: "Tạo trang nhãn mới",
      useMailMerge: "Điền hàng loạt từ nguồn Trộn thư",
      records: "bản ghi",
      contentRequired: "Hãy nhập nội dung nhãn, hoặc bật nguồn Trộn thư."
    },
    mailMerge: {
      dataSourceTitle: "Trộn thư — Nguồn dữ liệu người nhận (Excel / CSV)",
      pastePrompt: "Chọn tệp Excel (.xlsx, .xls) / CSV, hoặc dán dữ liệu vào khung bên dưới:",
      pasteSampleBtn: "📋 Dán dữ liệu mẫu",
      noData: "Chưa có dữ liệu",
      invalidCsv: "Dữ liệu chưa hợp lệ (thiếu tiêu đề cột)",
      foundData: "Đã tìm thấy: {count} cột | {records} bản ghi",
      saveDataSource: "Lưu nguồn dữ liệu",
      insertFieldTitle: "Chèn trường trộn thư",
      selectFieldPrompt: "Chọn trường dữ liệu muốn chèn vào tài liệu:",
      insertBtn: "Chèn trường",
      noDataWarningTitle: "Xem trước trộn thư",
      noDataWarningMsg: "Chưa có nguồn dữ liệu trộn thư. Vui lòng mở 'Nguồn dữ liệu' để chọn tệp Excel hoặc dán dữ liệu trước.",
      finishTitle: "Hoàn tất và Trộn thư",
      finishNoData: "Chưa có nguồn dữ liệu trộn thư để tạo tài liệu. Vui lòng mở 'Nguồn dữ liệu' để chọn tệp Excel hoặc dán bảng dữ liệu.",
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
    customType: "Mã định dạng (Type):",
    textAlignment: "Căn chỉnh văn bản",
    horizontal: "Chiều ngang:",
    vertical: "Chiều dọc:",
    indent: "Thụt lề (Indent):",
    textControl: "Điều khiển văn bản",
    wrapText: "Ngắt dòng tự động (Wrap text)",
    shrinkToFit: "Thu nhỏ vừa ô (Shrink to fit)",
    mergeCells: "Hợp nhất ô (Merge cells)",
    rightToLeft: "Hướng văn bản (Right-to-left)",
    textDirection: "Hướng văn bản:",
    directionContext: "Theo ngữ cảnh (Context) - GAP",
    directionLtr: "Trái sang phải (Left-to-Right)",
    directionRtl: "Phải sang trái (Right-to-Left)",
    orientation: "Hướng xoay (Orientation)",
    orientationDegrees: "Độ xoay:",
    alignGeneral: "Chung (General)",
    alignLeft: "Căn trái (Thụt lề)",
    alignCenter: "Căn giữa (Center)",
    alignRight: "Căn phải (Thụt lề)",
    alignJustify: "Căn đều (Justify)",
    alignFillGap: "Lấp đầy / Fill (GAP)",
    alignCenterContinuousGap: "Giữa qua vùng chọn (GAP)",
    alignDistributedGap: "Phân phối đều / Distributed (GAP)",
    alignTop: "Căn trên (Top)",
    alignMiddle: "Căn giữa (Center)",
    alignBottom: "Căn dưới (Bottom)",
    alignJustifyVGap: "Căn đều dọc / Justify (GAP)",
    alignDistributedVGap: "Phân phối đều / Distributed (GAP)",
    gapNotSupported: "Tính năng chưa được hỗ trợ (GAP)"
  },
  macro: {
    record: "Ghi Macro",
    stop: "Dừng ghi",
    manager: "Xem Macro",
    statusRecording: "Đang ghi Macro...",
    statusHint: "Đang ghi Macro... Bấm Ctrl+Shift+R để dừng.",
    saveTitle: "Lưu Macro",
    savePrompt: "Đặt tên cho Macro vừa ghi:",
    savedNotice: "Đã lưu Macro",
    noActionsNotice: "Không có thao tác nào được ghi lại — Macro không được lưu.",
    emptyCancelled: "Đã hủy — Macro không được lưu."
  }
};
