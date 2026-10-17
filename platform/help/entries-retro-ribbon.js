/**
 * 3T Office Help Entries — Bổ sung các lệnh Ribbon còn thiếu (Retro Ribbon)
 * Đảm bảo 100% lệnh trên Ribbon của Doc, Sheet và Slide đều có bài hướng dẫn cụ thể.
 * Tuân thủ quy định AGENTS.md §10: Tiếng Việt thật, chi tiết, không placeholder.
 * Naming quy chuẩn: Sản phẩm '3T Office', các ứng dụng viết ngắn gọn: Doc, Sheet, Slide (không tiền tố 3T).
 * Tuyệt đối không dùng tên sản phẩm độc quyền của Microsoft.
 */

export const RETRO_RIBBON_HELP_ENTRIES = [
  {
    id: "writer.para.lineSpacingHelp",
    app: "writer",
    commandIds: ["writer.para.lineSpacing", "writer.para.lineSpacingLayout"],
    title: "Giãn khoảng cách dòng và đoạn văn",
    summary: "Thiết lập khoảng cách giữa các dòng trong đoạn văn bản và khoảng cách trước, sau đoạn văn bản trên Doc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["giãn dòng", "line spacing", "khoảng cách dòng", "khoảng cách đoạn", "đoạn văn", "1.15", "1.5"],
    steps: [
      "Bôi đen đoạn văn bản cần thay đổi hoặc đặt con trỏ chuột vào vị trí bất kỳ trong đoạn văn.",
      "Trên thanh Ribbon, chọn tab Trang đầu (hoặc tab Bố cục), tìm nhóm Đoạn văn và bấm vào nút Giãn dòng.",
      "Chọn tỷ lệ khoảng cách dòng mong muốn trong danh sách thả xuống như 1.0 (dòng đơn), 1.15, 1.5, hoặc 2.0 (dòng đôi).",
      "Chọn 'Thêm khoảng trống trước đoạn' hoặc 'Xóa khoảng trống sau đoạn' để tinh chỉnh bố cục trang in chuẩn quy chế soạn thảo văn bản.",
      "Lưu ý: Khoảng cách dòng chuẩn theo thể thức văn bản hành chính Việt Nam là 1.0 đến 1.15 dòng, khoảng cách trước và sau đoạn là 6 pt."
    ]
  },
  {
    id: "writer.edit.selectHelp",
    app: "writer",
    commandIds: ["writer.edit.select"],
    title: "Chọn văn bản và đối tượng hình ảnh",
    summary: "Công cụ chọn nhanh toàn bộ nội dung tài liệu hoặc chuyển sang chế độ chọn riêng các hình ảnh và khung nổi trên Doc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chọn", "select", "chọn tất cả", "ctrl+a", "chọn đối tượng", "select all"],
    steps: [
      "Trên thanh Ribbon, chọn tab Trang đầu rồi nhìn sang góc phải tại nhóm Chỉnh sửa.",
      "Bấm vào nút Chọn để mở danh sách tùy chọn các chế độ chọn lựa văn bản.",
      "Bấm Chọn tất cả (hoặc nhấn tổ hợp phím tắt Ctrl+A) để bôi đen toàn bộ văn bản, bảng biểu và hình ảnh trong toàn bộ tài liệu.",
      "Bấm 'Chọn đối tượng' khi cần nhấp chọn các khung ảnh, sơ đồ hoặc hình vẽ nổi mà không vô tình bôi đen văn bản xung quanh.",
      "Lưu ý: Nhấn chuột ra vùng văn bản trống hoặc nhấn phím Esc để bỏ vùng đang chọn nhanh chóng."
    ]
  },
  {
    id: "writer.layout.breaksHelp",
    app: "writer",
    commandIds: ["writer.layout.breaks"],
    title: "Ngắt trang và ngắt phân đoạn tài liệu",
    summary: "Chèn dấu ngắt trang hoặc ngắt phân đoạn để chia tài liệu thành nhiều phần có bố cục độc lập trên Doc.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["ngắt", "breaks", "ngắt trang", "ngắt mục", "ngắt phân đoạn", "section break", "page break"],
    steps: [
      "Đặt con trỏ soạn thảo tại vị trí muốn kết thúc trang hoặc bắt đầu một phân đoạn mới.",
      "Mở tab Bố cục trên thanh Ribbon, tại nhóm Thiết lập trang, bấm vào nút Ngắt.",
      "Chọn 'Ngắt trang' (hoặc nhấn phím tắt Ctrl+Enter) để đẩy toàn bộ nội dung phía sau sang đầu trang tiếp theo ngay lập tức.",
      "Chọn 'Ngắt mục liên tục' hoặc 'Ngắt mục trang tiếp theo' để tạo phân đoạn tài liệu mới cho phép áp dụng hướng giấy dọc hoặc ngang riêng biệt.",
      "Lưu ý: Dấu ngắt phân đoạn được lưu chuẩn vào định dạng .docx và OpenDocument, hiển thị rõ ràng khi bật các ký hiệu ẩn trên tab Trang đầu."
    ]
  },
  {
    id: "sheet.edit.fillHelp",
    app: "sheet",
    commandIds: ["sheet.edit.fill"],
    title: "Điền tự động hàng và cột",
    summary: "Sao chép nhanh công thức hoặc giá trị từ ô nguồn sang các ô liền kề theo chiều dọc hoặc ngang trên Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["điền", "fill", "điền xuống", "điền sang phải", "ctrl+d", "ctrl+r", "sao chép công thức"],
    steps: [
      "Chọn ô có chứa dữ liệu hoặc công thức nguồn, đồng thời kéo bôi đen thêm các ô trống cần điền theo cùng hàng hoặc cột.",
      "Trên thanh Ribbon, chọn tab Trang đầu, tìm nhóm Chỉnh sửa và bấm vào nút thả xuống Điền.",
      "Chọn 'Điền xuống dưới' (phím tắt Ctrl+D) để sao chép ô trên xuống dưới, hoặc chọn 'Điền sang phải' (phím tắt Ctrl+R) để sao chép từ trái sang phải.",
      "Có thể chọn Điền lên trên hoặc Điền sang trái để sao chép theo hướng ngược lại tương ứng.",
      "Lưu ý: Khi điền công thức có chứa tham chiếu tương đối (như A1, B2), tọa độ ô sẽ tự động tịnh tiến chính xác theo từng hàng và cột."
    ]
  },
  {
    id: "sheet.edit.clearHelp",
    app: "sheet",
    commandIds: ["sheet.edit.clear"],
    title: "Xóa nội dung, định dạng và ghi chú ô",
    summary: "Tùy chọn xóa sạch toàn bộ, chỉ xóa định dạng kiểu dáng, hoặc chỉ xóa giá trị văn bản trong ô đã chọn trên Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["xóa", "clear", "xóa định dạng", "xóa nội dung", "xóa tất cả", "delete", "xóa ghi chú"],
    steps: [
      "Bôi đen vùng ô hoặc toàn bộ hàng, cột cần thao tác dọn dẹp dữ liệu.",
      "Tại tab Trang đầu trên thanh Ribbon, nhóm Chỉnh sửa, bấm vào biểu tượng nút Xóa.",
      "Chọn 'Xóa tất cả' để xóa bỏ cả giá trị, công thức, màu nền, đường viền và nhận xét gắn với ô.",
      "Chọn 'Xóa định dạng' để trả ô về phông chữ mặc định, xóa màu nền và viền nhưng vẫn giữ nguyên số liệu hoặc công thức đã nhập.",
      "Chọn 'Xóa nội dung' (phím Delete) để làm rỗng ô mà vẫn bảo lưu nguyên vẹn thiết lập màu sắc và kẻ viền.",
      "Lưu ý: Có thể nhấn tổ hợp phím Ctrl+Z bất cứ lúc nào để phục hồi lại dữ liệu vừa xóa nhầm."
    ]
  },
  {
    id: "sheet.whatIf.menuHelp",
    app: "sheet",
    commandIds: ["sheet-what-if-analysis"],
    title: "Công cụ phân tích giả định What-If",
    summary: "Menu tích hợp bộ ba công cụ phân tích kịch bản tài chính: Trình quản lý kịch bản, Tìm mục tiêu và Bảng dữ liệu trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["what if", "phân tích giả định", "quản lý kịch bản", "tìm mục tiêu", "bảng dữ liệu", "kịch bản", "dự báo"],
    steps: [
      "Mở tab Dữ liệu trên thanh Ribbon và tìm đến nhóm Công cụ dữ liệu.",
      "Bấm vào nút 'Phân tích What-If' để mở danh sách ba công cụ dự báo chuyên sâu.",
      "Chọn 'Trình quản lý kịch bản' để định nghĩa và so sánh nhiều phương án kinh doanh khác nhau như kịch bản tốt, trung bình và xấu.",
      "Chọn 'Tìm mục tiêu' (Goal Seek) khi bạn đã có kết quả mong muốn và cần hệ thống tự động suy ngược ra giá trị đầu vào cần thiết.",
      "Chọn 'Bảng dữ liệu' (Data Table) để tính toán ma trận độ nhạy khi thay đổi đồng thời một hoặc hai biến số như giá bán và sản lượng.",
      "Lưu ý: Toàn bộ kịch bản và bảng dữ liệu được lưu chuẩn tương thích với các định dạng bảng tính .xlsx và .ods."
    ]
  },
  {
    id: "sheet.view.freezePanesMenuHelp",
    app: "sheet",
    commandIds: ["sheet.view.freezePanesMenu"],
    title: "Cố định ô và tiêu đề hàng cột",
    summary: "Khóa cố định hàng tiêu đề hoặc cột mã số trên màn hình khi cuộn bảng tính dài, giúp theo dõi số liệu luôn rõ ràng trên Sheet.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Cửa sổ" },
    keywords: ["cố định ô", "freeze panes", "cố định hàng", "cố định cột", "tiêu đề bảng", "cuộn trang"],
    steps: [
      "Chuyển sang tab Chế độ xem trên thanh công cụ Ribbon, tìm đến nhóm Cửa sổ.",
      "Bấm vào nút thả xuống 'Cố định ô' để xem các chế độ khóa dòng và cột.",
      "Chọn 'Cố định hàng đầu' để giữ luôn hiển thị hàng số 1 khi cuộn chuột xuống các hàng dữ liệu phía dưới.",
      "Chọn 'Cố định cột đầu' để giữ cột A luôn hiển thị khi cuộn màn hình sang các cột bên phải.",
      "Chọn 'Cố định ô' để khóa toàn bộ các hàng phía trên và các cột bên trái ô đang chọn hiện tại.",
      "Lưu ý: Để mở khóa, bấm lại vào menu này và chọn 'Hủy cố định ô'."
    ]
  },
  {
    id: "slides.section.menuHelp",
    app: "slides",
    commandIds: ["slides.section.menu"],
    title: "Quản lý phần và nhóm phân đoạn bài trình chiếu",
    summary: "Tạo các phần để phân chia bài thuyết trình thành các chương mục rõ ràng, dễ quản lý và trình bày trên Slide.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["phần", "section", "phân đoạn", "thêm phần", "đổi tên phần", "xóa phần", "nhóm slide"],
    steps: [
      "Trong danh sách trang chiếu thu nhỏ ở khung bên trái, nhấp chuột vào khoảng giữa hai slide nơi muốn bắt đầu chương mới.",
      "Trên thanh Ribbon, chọn tab Trang đầu, tại nhóm Trang chiếu, bấm vào nút 'Phần'.",
      "Bấm 'Thêm phần' để tạo một tiêu đề phân đoạn mới (mặc định đặt tên là Phần chưa có tiêu đề).",
      "Chọn tiếp 'Đổi tên phần' trong menu để đặt tên phù hợp như Mở đầu, Nội dung chính hoặc Kết luận.",
      "Sử dụng 'Di chuyển phần lên' hoặc 'Di chuyển phần xuống' để thay đổi thứ tự toàn bộ nhóm slide trong nháy mắt.",
      "Lưu ý: Cấu trúc phần được lưu chuẩn vào tệp .pptx và giữ nguyên danh mục khi mở bằng các phần mềm trình chiếu khác."
    ]
  },
  {
    id: "slides.text.vAlignHelp",
    app: "slides",
    commandIds: ["slides.text.vAlign", "slides.text.vAlignTop", "slides.text.vAlignMiddle", "slides.text.vAlignBottom"],
    title: "Căn lề văn bản theo chiều dọc",
    summary: "Điều chỉnh vị trí chữ nằm ở mép trên, chính giữa hoặc mép dưới bên trong hộp văn bản hoặc hình khối trên Slide.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["căn lề văn bản", "căn dọc", "valign", "căn giữa dọc", "căn lề trên", "căn lề dưới", "hộp chữ"],
    steps: [
      "Bấm chuột vào khung viền của hộp văn bản hoặc hình vẽ có chứa chữ cần căn chỉnh.",
      "Trên thanh Ribbon, chọn tab Trang đầu, nhóm Đoạn văn, tìm biểu tượng nút 'Căn lề văn bản'.",
      "Bấm vào nút để mở danh sách tùy chọn căn chỉnh dọc.",
      "Chọn 'Căn lề trên' để đặt toàn bộ đoạn chữ bám sát vào cạnh trên của khung chứa.",
      "Chọn 'Căn giữa (dọc)' để chữ nằm cân đối hoàn hảo ở giữa tâm khung hình.",
      "Chọn 'Căn lề dưới' để đưa nội dung chữ xuống đáy khung chứa.",
      "Lưu ý: Căn lề dọc đặc biệt hữu ích khi thiết kế các ô thẻ bài trình bày, nút bấm đồ họa hoặc bảng số liệu thống kê."
    ]
  },
  {
    id: "slides.text.columnsHelp",
    app: "slides",
    commandIds: ["slides.text.columns", "slides.text.columnsOne", "slides.text.columnsTwo", "slides.text.columnsThree"],
    title: "Chia văn bản trong hộp chữ thành nhiều cột",
    summary: "Chia chữ trong một hộp văn bản thành một, hai hoặc ba cột, như cột báo. Chữ tự chảy từ cột này sang cột kế khi hết chiều cao hộp.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["cột", "chia cột", "hai cột", "ba cột", "cột báo", "columns", "hộp chữ", "numCol"],
    steps: [
      "Chọn một hộp văn bản trên trang chiếu (nhấp vào khung viền của hộp). Chia cột áp dụng cho hộp văn bản; khung tiêu đề và nội dung mặc định của bố cục không đổi cột.",
      "Trên tab Trang đầu, nhóm Đoạn văn, bấm nút Cột để mở danh sách rồi chọn Một cột, Hai cột hoặc Ba cột.",
      "Chữ được cân đều giữa các cột; khoảng cách giữa hai cột là 18 px (khoảng 0,5 cm). Muốn các cột dài hơn, kéo cao hộp văn bản.",
      "Chọn Một cột để trả hộp về dạng thông thường. Ctrl+Z hoàn tác mỗi lần đổi số cột trong một bước, Ctrl+Y làm lại.",
      "Số cột được lưu cùng bản trình chiếu và giữ nguyên khi lưu thành tệp PPTX rồi mở lại; các phần mềm trình chiếu khác cũng nhận ra hộp chữ nhiều cột."
    ]
  },  {
    id: "slides.text.directionHelp",
    app: "slides",
    commandIds: ["slides.text.direction", "slides.text.directionHorizontal", "slides.text.directionVertical", "slides.text.directionVertical270", "slides.text.directionStacked"],
    title: "Đổi hướng văn bản trong hộp chữ",
    summary: "Xoay chiều hiển thị văn bản theo chiều ngang, xoay đứng 90 độ, xoay 270 độ hoặc xếp chồng từng ký tự trên Slide.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["hướng văn bản", "text direction", "xoay chữ", "xoay 90 độ", "xoay 270 độ", "xếp chồng", "chữ dọc"],
    steps: [
      "Chọn hộp văn bản hoặc hình khối chứa văn bản cần đổi hướng hiển thị.",
      "Mở tab Trang đầu trên thanh công cụ Ribbon, tìm đến nhóm Đoạn văn.",
      "Bấm vào biểu tượng nút thả xuống 'Hướng văn bản'.",
      "Chọn 'Ngang' để hiển thị chữ theo chiều đọc bình thường từ trái sang phải.",
      "Chọn 'Xoay chữ 90°' hoặc 'Xoay chữ 270°' để quay thẳng chữ theo hướng đọc từ trên xuống hoặc từ dưới lên.",
      "Chọn 'Xếp chồng' để các ký tự chữ cái xếp chồng thẳng đứng lên nhau từ đỉnh xuống đáy.",
      "Lưu ý: Tính năng xoay hướng chữ rất hữu dụng khi trang trí thanh tiêu đề dọc bên mép trang chiếu hoặc làm nhãn trục bảng biểu."
    ]
  },
  {
    id: "slides.drawing.arrangeHelp",
    app: "slides",
    commandIds: ["slides.drawing.arrange"],
    title: "Sắp xếp lớp và căn chỉnh đối tượng vẽ",
    summary: "Thay đổi thứ tự hiển thị trước sau, căn hàng, phân phối đều và nhóm các hình khối, ảnh minh họa trên Slide.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Vẽ" },
    keywords: ["sắp xếp", "arrange", "lớp đối tượng", "đưa lên trên", "đưa xuống dưới", "căn hàng", "nhóm hình", "ctrl+g"],
    steps: [
      "Chọn một hoặc nhiều đối tượng hình ảnh, hình khối trên trang chiếu (giữ phím Shift để nhấp chọn nhiều đối tượng).",
      "Trên thanh Ribbon, chọn tab Trang đầu, nhóm Vẽ và bấm vào nút thả xuống 'Sắp xếp'.",
      "Tại mục Thứ tự: chọn 'Đưa lên trên cùng' hoặc 'Đưa xuống dưới cùng' để kiểm soát đối tượng nào đè lên đối tượng nào.",
      "Tại mục Căn chỉnh: chọn Căn trái, Căn giữa, Căn phải, Căn trên, Căn giữa dọc hoặc Căn dưới để các đối tượng thẳng hàng tăm tắp.",
      "Tại mục Phân phối: chọn 'Phân phối đều ngang' hoặc 'Phân phối đều dọc' để khoảng cách giữa các hình bằng nhau tuyệt đối.",
      "Chọn 'Nhóm' (phím tắt Ctrl+G) để gắn kết các hình thành một thể thống nhất, hoặc 'Bỏ nhóm' (Ctrl+Shift+G) để tách rời.",
      "Lưu ý: Có thể đánh dấu tùy chọn 'Căn theo trang chiếu' nếu muốn căn chỉnh đối tượng dựa theo mép viền của cả slide thay vì khung nhóm đối tượng."
    ]
  },
  {
    id: "slides.ai.assistantHelp",
    app: "slides",
    commandIds: ["ai.assistant.toggle", "ai.assistant.summarize"],
    title: "Trợ lý 3T AI và Tóm tắt nội dung bản trình chiếu",
    summary: "Khởi động trợ lý thông minh hỗ trợ gợi ý ý tưởng thuyết trình, tạo dàn bài và tóm tắt súc tích nội dung các slide trên Slide.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "Tạo nội dung thuyết trình" },
    keywords: ["trợ lý 3t ai", "ai", "tóm tắt nhanh", "thuyết trình", "tạo slide", "dàn ý", "trí tuệ nhân tạo"],
    steps: [
      "Bấm vào tab 'Trợ lý 3T AI' ở phía cuối bên phải trên thanh Ribbon.",
      "Bấm vào nút 'Trợ lý 3T AI' để mở bảng trò chuyện tương tác ở cạnh phải màn hình.",
      "Gõ yêu cầu vào khung hội thoại, ví dụ: 'Gợi ý 5 ý tưởng thuyết trình về chuyển đổi số' hoặc 'Tạo dàn ý 4 trang chiếu giới thiệu công ty'.",
      "Bấm nút 'Tóm tắt nhanh' trên nhóm Tạo nội dung thuyết trình để trợ lý đọc lướt toàn bộ các trang chiếu và trích xuất điểm nhấn chính.",
      "Sao chép kết quả gợi ý từ khung trợ lý và dán trực tiếp vào các hộp văn bản trên slide.",
      "Lưu ý: Trợ lý hoạt động an toàn bảo vệ tối đa dữ liệu tài liệu cá nhân, không gửi nội dung bí mật ra ngoài mà không có sự đồng ý của bạn."
    ]
  }
];
