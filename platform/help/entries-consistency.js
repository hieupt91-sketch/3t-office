/**
 * 3T Office Help Entries — Giao diện và Trợ giúp thống nhất (CH-8)
 * Hướng dẫn tiếng Việt chi tiết từng bước cho:
 * 1. Phím tắt Ribbon (KeyTips)
 * 2. Trợ giúp theo ngữ cảnh (F1)
 * 3. Có gì mới (Ghi chú phát hành)
 * 4. Giao diện Sáng/Tối và Cỡ chữ hiển thị
 * 5. Thu phóng tài liệu (Zoom)
 */

export const CONSISTENCY_HELP_ENTRIES = [
  {
    id: "common.help.keytips",
    app: "common",
    commandIds: [],
    title: "Sử dụng phím tắt Ribbon (KeyTips)",
    summary: "Bấm và thả phím Alt để hiển thị các huy hiệu ký tự phím tắt tiếng Việt trên thanh công cụ Ribbon, cho phép thao tác nhanh toàn bộ tính năng hoàn toàn bằng bàn phím mà không cần chuột.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["phím tắt", "keytips", "alt", "phím alt", "bàn phím", "huy hiệu", "truy cập nhanh"],
    steps: [
      "Bấm và thả phím Alt: các huy hiệu chữ cái tiếng Việt sẽ lập tức xuất hiện nổi trên từng tab ribbon (T cho Tệp, D cho Trang đầu, C cho Chèn, B cho Bố cục, M cho Công thức, L cho Dữ liệu, S cho Tham chiếu/Trình chiếu, U cho Gửi thư, P cho Chuyển tiếp, H cho Hoạt hình, X cho Xem lại, V cho Xem, G cho Trợ giúp, A cho 3T AI).",
      "Bấm ký tự tương ứng với tab muốn mở (ví dụ nhấn phím D để mở tab Trang đầu): tab tương ứng sẽ mở ra và các huy hiệu ký tự cấp 2 hiển thị trên toàn bộ nút lệnh trong tab đó.",
      "Bấm tiếp ký tự trên nút lệnh mong muốn (ví dụ 1 cho Đậm, 2 cho Nghiêng, V cho Dán, C cho Sao chép...) để thực thi lệnh ngay tức thì.",
      "Nhấn phím Esc bất cứ lúc nào để quay lại cấp trước đó (từ nút lệnh quay về tab, hoặc từ tab thoát hoàn toàn khỏi KeyTips)."
    ]
  },
  {
    id: "common.help.contextualF1",
    app: "common",
    commandIds: ["writer.help.open", "sheet.help.open", "slides.help.open"],
    title: "Trợ giúp theo ngữ cảnh (F1)",
    summary: "Nhấn phím F1 tại bất kỳ nút công cụ, mục bảng chọn hay hộp thoại nào để mở ngay bài hướng dẫn cụ thể cho thao tác đó.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["f1", "trợ giúp ngữ cảnh", "hướng dẫn f1", "tra cứu", "help"],
    steps: [
      "Di chuyển tiêu điểm phím (hoặc trỏ chuột) tới một nút lệnh trên thanh Ribbon hoặc mở một hộp thoại bất kỳ (như Hộp thoại Tùy chọn, Hộp thoại Giới thiệu, Tìm kiếm & Thay thế...).",
      "Nhấn phím F1 trên bàn phím: bảng Trợ giúp lập tức trượt ra ở cạnh phải màn hình và tự động chọn chính xác bài hướng dẫn cho lệnh hoặc hộp thoại đó.",
      "Nếu đang ở vùng soạn thảo tài liệu chung, nhấn F1 sẽ mở bảng Trợ giúp chung và đặt con trỏ vào ô tìm kiếm để bạn tra cứu nhanh.",
      "Nhấn phím Esc để đóng bảng Trợ giúp và tiếp tục làm việc."
    ]
  },
  {
    id: "common.help.whatsNew",
    app: "common",
    commandIds: [],
    title: "Có gì mới (Thông tin phát hành)",
    summary: "Tra cứu thông tin phiên bản, tính năng mới và các cải tiến trong bản cập nhật 3T Office đang cài đặt.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Thông tin" },
    keywords: ["có gì mới", "phiên bản", "cập nhật", "ghi chú phát hành", "release notes", "whats new", "bản vá"],
    steps: [
      "Nhấn F1 hoặc chọn tab Trợ giúp > Trợ giúp trên thanh Ribbon để mở bảng Trợ giúp.",
      "Bấm vào nút “Có gì mới” ở phần đầu bảng Trợ giúp hoặc chọn chủ đề “Có gì mới (Thông tin phát hành)” trong danh sách.",
      "Nội dung ghi chú phát hành của phiên bản hiện tại sẽ được tải tự động và hiển thị đầy đủ, chi tiết.",
      "Nếu tệp ghi chú chưa được phân phối kèm bản cài đặt, hệ thống sẽ hiển thị thông báo rõ ràng."
    ]
  },
  {
    id: "common.help.themeAndFontSize",
    app: "common",
    commandIds: [],
    title: "Giao diện Sáng/Tối và Cỡ chữ hiển thị",
    summary: "Tùy biến giao diện làm việc với chế độ Sáng hoặc Tối và điều chỉnh cỡ chữ giao diện (Tiêu chuẩn, Lớn, Rất lớn) đồng bộ trên cả Doc, Sheet và Slide.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tùy chọn" },
    keywords: ["giao diện", "chế độ tối", "chế độ sáng", "dark mode", "light mode", "cỡ chữ", "font size", "tùy chọn"],
    steps: [
      "Bấm vào menu Tệp > chọn 'Tùy chọn' (hoặc nhấn nút biểu tượng Mặt trăng / Mặt trời ở góc trên thanh tiêu đề để đổi nhanh nền sáng/tối).",
      "Trong hộp thoại Tùy chọn 3T Office: chọn Giao diện Sáng (mặc định) hoặc Giao diện Tối để bảo vệ mắt khi làm việc ban đêm.",
      "Tại mục Cỡ chữ giao diện: chọn Tiêu chuẩn (100%), Lớn (115%) hoặc Rất lớn (130%) phù hợp với độ phân giải màn hình của bạn.",
      "Nhấn phím Enter hoặc bấm 'Đồng ý' để lưu và áp dụng tức thì cho cả 3 ứng dụng Doc, Sheet và Slide."
    ]
  },
  {
    id: "common.help.zoomControls",
    app: "common",
    commandIds: ["common.view.zoomIn", "common.view.zoomOut", "common.view.zoomReset"],
    title: "Thu phóng tài liệu (Zoom)",
    summary: "Điều chỉnh tỷ lệ hiển thị tài liệu mượt mà từ 50% đến 200% bằng thanh trượt trạng thái, con lăn chuột hoặc phím tắt.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Thu phóng" },
    keywords: ["thu phóng", "zoom", "ctrl+0", "phóng to", "thu nhỏ", "con lăn chuột", "thanh trạng thái"],
    steps: [
      "Kéo thanh trượt thu phóng ở góc phải thanh trạng thái (hoặc bấm nút - và +) để phóng to / thu nhỏ với bước nhảy 10%.",
      "Giữ phím Ctrl và lăn con lăn chuột (Mouse Wheel) để phóng to / thu nhỏ nhanh và mượt mà trong vùng tài liệu ở cả Doc, Sheet và Slide.",
      "Nhấn tổ hợp phím Ctrl+0 hoặc nhấp chuột vào nút phần trăm trên thanh trạng thái để đặt lại tỷ lệ thu phóng về 100% chuẩn."
    ]
  },
  {
    id: "common.help.backstageRecent",
    app: "common",
    commandIds: ["common.file.backstage", "common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print", "common.file.exportPdf", "common.file.close"],
    title: "Menu Tệp và Quản lý tệp gần đây",
    summary: "Quản lý toàn bộ vòng đời tài liệu trong menu Tệp (Backstage) và truy cập nhanh danh sách tài liệu mở gần đây trên Doc, Sheet và Slide.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tệp" },
    keywords: ["menu tệp", "backstage", "tệp gần đây", "mở tệp", "lưu tệp", "alt+f", "in", "xuất pdf", "recent"],
    steps: [
      "Bấm vào nút 'Tệp' ở góc trên bên trái thanh Ribbon hoặc nhấn tổ hợp phím Alt+F để mở menu Tệp toàn màn hình.",
      "Xem danh mục các lệnh quản lý tài liệu ở thanh bên trái với thứ tự chuẩn: Quay lại, Trang chủ, Mới (Ctrl+N), Mở (Ctrl+O), Lưu (Ctrl+S), Lưu thành (F12), In (Ctrl+P), Xuất PDF, Tệp gần đây, Đóng (Ctrl+W), Giới thiệu và Tùy chọn.",
      "Chọn mục 'Tệp gần đây' để xem danh sách các tài liệu đã làm việc gần đây trên thiết bị với tên tệp, đường dẫn rút gọn, thời gian sửa đổi và định dạng tệp.",
      "Bấm trực tiếp vào hàng tệp để mở lại nhanh, hoặc bấm biểu tượng dấu nhân ở cuối dòng để gỡ tệp khỏi danh sách gần đây. Có thể bấm 'Xóa lịch sử' để làm sạch toàn bộ danh sách."
    ]
  },
  {
    id: "common.help.statusbarViewModes",
    app: "common",
    commandIds: ["writer.view.printLayout", "writer.view.readMode", "writer.view.webLayout", "sheet.view.normal", "sheet.view.pageLayout", "sheet.view.pageBreakPreview", "slides.view.normal", "slides.view.slideSorter", "slides.view.reading", "slides.slideshow.fromBeginning"],
    title: "Thanh trạng thái và Chế độ xem tài liệu",
    summary: "Thanh trạng thái cố định ở đáy màn hình hiển thị thông tin tài liệu, bộ gõ tiếng Việt và các chế độ xem chuyên biệt cho Doc, Sheet và Slide.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Chế độ xem tài liệu" },
    keywords: ["thanh trạng thái", "chế độ xem", "statusbar", "bố cục in", "chế độ đọc", "bình thường", "trình chiếu", "thu phóng"],
    steps: [
      "Thanh trạng thái nằm cố định ở đáy cửa sổ làm việc của cả 3 ứng dụng Doc, Sheet và Slide.",
      "Phía bên trái hiển thị trạng thái sẵn sàng, thông tin trang/ô tính/trang chiếu, ngôn ngữ Tiếng Việt và bảng mã Unicode NFC chuẩn.",
      "Phía bên phải gồm cụm nút chế độ xem nhanh: Trong Doc gồm Bố cục in, Chế độ đọc, Bố cục web; Trong Sheet gồm Bình thường, Bố cục trang, Xem trước ngắt trang; Trong Slide gồm Thông thường, Bộ sắp xếp trang chiếu, Chế độ xem đọc và Trình chiếu.",
      "Kế bên các nút chế độ xem là cụm thanh trượt thu phóng với nút - (thu nhỏ 10%), thanh kéo tỉ lệ 50%-200%, nút + (phóng to 10%) và nút phần trăm hiển thị (bấm vào để đặt lại nhanh về 100%)."
    ]
  },
  {
    id: "common.help.ribbonCollapseAndQat",
    app: "common",
    commandIds: ["common.view.ribbonToggle", "common.file.save", "common.edit.undo", "common.edit.redo", "common.file.print"],
    title: "Thu gọn thanh Ribbon và Thanh truy cập nhanh",
    summary: "Tối ưu không gian làm việc với thao tác thu gọn/mở rộng Ribbon và truy cập nhanh các thao tác thường dùng nhất trên cả 3 ứng dụng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Giao diện" },
    keywords: ["thu gọn ribbon", "mở rộng ribbon", "ctrl+f1", "quick access", "thanh truy cập nhanh", "hoàn tác", "làm lại"],
    steps: [
      "Nhấn tổ hợp phím Ctrl+F1 hoặc nhấp đúp chuột vào bất kỳ nhãn tab nào (như Trang đầu, Chèn, Chế độ xem...) để thu gọn thanh Ribbon, giúp mở rộng tối đa không gian soạn thảo.",
      "Khi Ribbon đang thu gọn, nhấp một lần vào một tab để mở tạm thời nội dung thanh công cụ; thanh công cụ sẽ tự động ẩn lại sau khi chọn xong lệnh.",
      "Nhấn Ctrl+F1 hoặc nhấp đúp vào tab một lần nữa để ghim cố định lại thanh Ribbon.",
      "Thanh công cụ truy cập nhanh nằm ở góc trên bên trái thanh tiêu đề luôn sẵn sàng các nút: Lưu tài liệu (Ctrl+S), Hoàn tác (Ctrl+Z), Làm lại (Ctrl+Y) và In tài liệu (Ctrl+P)."
    ]
  }
];
