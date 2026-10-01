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
    summary: "Tùy biến giao diện làm việc với chế độ Sáng hoặc Tối và điều chỉnh cỡ chữ giao diện (Tiêu chuẩn, Lớn, Rất lớn) đồng bộ trên cả 3T Doc, 3T Sheet và 3T Slide.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tùy chọn" },
    keywords: ["giao diện", "chế độ tối", "chế độ sáng", "dark mode", "light mode", "cỡ chữ", "font size", "tùy chọn"],
    steps: [
      "Bấm vào menu Tệp > chọn 'Tùy chọn' (hoặc nhấn nút biểu tượng Mặt trăng / Mặt trời ở góc trên thanh tiêu đề để đổi nhanh nền sáng/tối).",
      "Trong hộp thoại Tùy chọn 3T Office: chọn Giao diện Sáng (mặc định) hoặc Giao diện Tối để bảo vệ mắt khi làm việc ban đêm.",
      "Tại mục Cỡ chữ giao diện: chọn Tiêu chuẩn (100%), Lớn (115%) hoặc Rất lớn (130%) phù hợp với độ phân giải màn hình của bạn.",
      "Nhấn phím Enter hoặc bấm 'Đồng ý' để lưu và áp dụng tức thì cho cả 3 ứng dụng 3T Doc, 3T Sheet và 3T Slide."
    ]
  },
  {
    id: "common.help.zoomControls",
    app: "common",
    commandIds: ["common.view.zoomIn", "common.view.zoomOut", "common.view.zoomReset"],
    title: "Thu phóng tài liệu (Zoom)",
    summary: "Điều chỉnh tỷ lệ hiển thị tài liệu mượt mà từ 50% đến 200% bằng thanh trượt trạng thái, con lăn chuột hoặc phím tắt.",
    ribbon: { tab: "Xem", tabId: "view", group: "Thu phóng" },
    keywords: ["thu phóng", "zoom", "ctrl+0", "phóng to", "thu nhỏ", "con lăn chuột", "thanh trạng thái"],
    steps: [
      "Kéo thanh trượt thu phóng ở góc phải thanh trạng thái (hoặc bấm nút - và +) để phóng to / thu nhỏ.",
      "Giữ phím Ctrl và lăn con lăn chuột (Mouse Wheel) để phóng to / thu nhỏ nhanh và mượt mà trong vùng tài liệu.",
      "Nhấn tổ hợp phím Ctrl+0 bất cứ lúc nào để đặt lại tỷ lệ thu phóng về 100% chuẩn."
    ]
  }
];
