/** Vietnamese AutoRecover guidance shared by 3T Doc, 3T Sheet, and 3T Slide. */
export const AUTORECOVER_HELP_ENTRIES = [
  {
    id: "writer.file.autoRecover",
    app: "writer",
    commandIds: [],
    title: "Tự động khôi phục tài liệu 3T Doc",
    summary: "AutoRecover lưu bản HTML tạm trên thiết bị khi tài liệu đã thay đổi. Sau khi ứng dụng đóng bất thường, bạn có thể mở bản khôi phục dưới dạng tài liệu mới chưa lưu.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Tự động khôi phục" },
    keywords: ["autorecover", "tự động khôi phục", "phục hồi tài liệu", "mất điện", "ứng dụng bị lỗi", "khôi phục bản lưu"],
    steps: [
      "Mở tab Trợ giúp trên ribbon hoặc nhấn F1. Trong bảng Trợ giúp, tìm phần Tự động khôi phục.",
      "Đánh dấu Bật lưu khôi phục tự động. Nhập số phút ở mục Lưu mỗi; mặc định là 5 phút, cho phép từ 1 đến 60 phút.",
      "Nếu 3T Office đóng bất thường, mở lại ứng dụng. Trong hộp thoại Khôi phục tài liệu, kiểm tra tên tài liệu, tệp gốc và thời gian rồi nhấn Mở bản khôi phục.",
      "Bản mở ra có nhãn «đã khôi phục» và chưa ghi đè lên tệp gốc. Nhấn Ctrl+S hoặc chọn Tệp → Lưu để mở hộp thoại chọn nơi lưu bản này.",
      "Trong bảng Trợ giúp, nhấn Xem bản khôi phục để mở lại danh sách; chọn Xóa để bỏ một bản hoặc Để sau để giữ nguyên và đóng hộp thoại."
    ]
  },
  {
    id: "sheet.file.autoRecover",
    app: "sheet",
    commandIds: [],
    title: "Tự động khôi phục bảng tính 3T Sheet",
    summary: "AutoRecover lưu bản FODS cục bộ theo chu kỳ khi bảng tính đã thay đổi. Bản tìm được sau khi ứng dụng đóng bất thường được mở như một bảng tính mới chưa lưu.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Tự động khôi phục" },
    keywords: ["autorecover", "tự động khôi phục", "phục hồi bảng tính", "mất điện", "ứng dụng bị lỗi", "khôi phục bản lưu"],
    steps: [
      "Mở tab Trợ giúp trên ribbon hoặc nhấn F1. Trong bảng Trợ giúp, tìm phần Tự động khôi phục.",
      "Bật Bật lưu khôi phục tự động và chọn khoảng thời gian ở mục Lưu mỗi. Mặc định là 5 phút; có thể đặt từ 1 đến 60 phút.",
      "Sau khi khởi động lại 3T Office, chọn bảng tính cần lấy lại trong hộp thoại Khôi phục tài liệu rồi nhấn Mở bản khôi phục.",
      "Bảng tính có nhãn «đã khôi phục» và vẫn chưa lưu vào đường dẫn gốc. Nhấn Ctrl+S hoặc Tệp → Lưu để chọn tên và thư mục lưu bản riêng.",
      "Dùng Xem bản khôi phục trong phần Tự động khôi phục của bảng Trợ giúp để xem danh sách lần nữa; nút Xóa bỏ riêng mục đã chọn, còn Để sau giữ nguyên tất cả."
    ]
  },
  {
    id: "slides.file.autoRecover",
    app: "slides",
    commandIds: [],
    title: "Tự động khôi phục bản trình chiếu 3T Slide",
    summary: "AutoRecover giữ bản FODP cục bộ của bản trình chiếu đang thay đổi. Khi ứng dụng khởi động lại sau sự cố, bạn có thể mở bản đó mà không ghi đè tệp ban đầu.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Tự động khôi phục" },
    keywords: ["autorecover", "tự động khôi phục", "phục hồi slide", "bản trình chiếu", "mất điện", "ứng dụng bị lỗi"],
    steps: [
      "Mở tab Trợ giúp trên ribbon hoặc nhấn F1 để mở bảng Trợ giúp. Kéo tới phần Tự động khôi phục.",
      "Bật lưu khôi phục tự động và nhập số phút muốn lưu ở mục Lưu mỗi. Thiết lập ban đầu là 5 phút; giới hạn là 1–60 phút.",
      "Mở lại 3T Office sau sự cố, chọn đúng bản trình chiếu trong hộp thoại Khôi phục tài liệu và nhấn Mở bản khôi phục.",
      "Bản được mở với nhãn «đã khôi phục», không có đường dẫn lưu gốc. Nhấn Ctrl+S hoặc Tệp → Lưu để chọn nơi ghi tệp PPTX mới.",
      "Xem bản khôi phục trong bảng Trợ giúp để duyệt danh sách bất cứ lúc nào. Chọn Xóa để loại bỏ bản đã chọn hoặc Để sau để đóng hộp thoại mà vẫn giữ bản đó."
    ]
  }
];
