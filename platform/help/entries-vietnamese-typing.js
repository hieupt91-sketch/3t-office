/**
 * VN Office — Hướng dẫn gõ tiếng Việt (Vietnamese Typing Guidance)
 * Dành cho Doc, Sheet, Slide theo chuẩn CH-4.7 & AGENTS.md
 */

export const VIETNAMESE_TYPING_HELP_ENTRIES = [
  {
    id: "doc.vietnamese.typing",
    app: "writer",
    commandIds: [],
    title: "Hướng dẫn gõ tiếng Việt trong Doc",
    summary: "Cách gõ tiếng Việt có dấu chuẩn xác trong văn bản, tiêu đề, chân trang và bảng biểu của Doc bằng bộ gõ Unikey hoặc EVKey.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Gõ tiếng Việt" },
    keywords: ["gõ tiếng việt", "tiếng việt", "unikey", "evkey", "telex", "vni", "bộ gõ", "dấu tiếng việt", "font tiếng việt", "doc"],
    steps: [
      "Khởi động bộ gõ tiếng Việt (Unikey hoặc EVKey). Khuyến nghị thiết lập: Bảng mã «Unicode dựng sẵn» (NFC) và Kiểu gõ «Telex» hoặc «VNI».",
      "Đặt con trỏ soạn thảo vào nội dung văn bản Doc, vùng tiêu đề trang (Header), chân trang (Footer), hoặc ô bảng biểu.",
      "Gõ tiếng Việt theo kiểu gõ đã chọn (ví dụ Telex: gõ 's' dấu sắc, 'f' dấu huyền, 'r' dấu hỏi, 'x' dấu ngã, 'j' dấu nặng, 'w' dấu ơ/ư, 'aa' thành â, 'ee' thành ê, 'oo' thành ô, 'dd' thành đ).",
      "Nếu phát hiện sai từ, nhấn phím Hoàn tác (Ctrl+Z) để xóa nguyên từ vừa gõ mà không làm hỏng cấu trúc đoạn văn bản.",
      "Xử lý khi dấu hiển thị sai hoặc bị mất: Kiểm tra bộ gõ đang ở chế độ tiếng Việt (biểu tượng chữ V ở khay hệ thống, nhấn Ctrl+Shift hoặc Alt+Z để chuyển đổi). Đảm bảo chọn đúng Bảng mã Unicode dựng sẵn. Nếu gõ bị lặp từ, tắt tính năng gõ nhanh/sửa lỗi tự động trùng lặp trên bộ gõ bên ngoài."
    ]
  },
  {
    id: "sheet.vietnamese.typing",
    app: "sheet",
    commandIds: [],
    title: "Hướng dẫn gõ tiếng Việt trong Sheet",
    summary: "Cách nhập văn bản tiếng Việt có dấu trong ô bảng tính và thanh công thức (Formula Bar) của Sheet mà không bị xung đột gợi ý công thức.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Gõ tiếng Việt" },
    keywords: ["gõ tiếng việt", "tiếng việt", "unikey", "evkey", "telex", "vni", "thanh công thức", "bảng tính", "sheet", "formula bar"],
    steps: [
      "Khởi động Unikey hoặc EVKey với thiết lập chuẩn: Bảng mã «Unicode dựng sẵn», Kiểu gõ «Telex» hoặc «VNI».",
      "Nhập trực tiếp vào ô: Chọn một ô trên bảng tính và bắt đầu gõ tiếng Việt ngay (không bắt buộc nhấn F2) hoặc nhấn F2/nhấp đúp chuột để vào chế độ chỉnh sửa ô chi tiết.",
      "Nhập trên thanh công thức: Nhấp chuột vào khung nhập công thức (thanh fx). Gõ tiếng Việt tự nhiên; hệ thống tự động nhận diện chữ tiếng Việt và không mở nhầm danh sách gợi ý hàm khi đang gõ văn bản thuần túy.",
      "Nhấn Enter để xác nhận dữ liệu ô, hoặc phím Escape (Esc) để hủy bỏ nội dung đang chỉnh sửa.",
      "Xử lý sự cố gõ tiếng Việt: Đảm bảo bảng mã của Unikey/EVKey là Unicode dựng sẵn thay vì VNI-Windows hay TCVN3. Khi nhập công thức có dấu bằng (=), các chuỗi văn bản tiếng Việt cần được đặt trong cặp dấu ngoặc kép (ví dụ: =IF(A1>0, \"Đạt\", \"Chưa đạt\"))."
    ]
  },
  {
    id: "slide.vietnamese.typing",
    app: "slides",
    commandIds: [],
    title: "Hướng dẫn gõ tiếng Việt trong Slide",
    summary: "Cách nhập nội dung tiếng Việt trong khung tiêu đề, hộp văn bản, hình vẽ và khung ghi chú thuyết trình của Slide.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Gõ tiếng Việt" },
    keywords: ["gõ tiếng việt", "tiếng việt", "unikey", "evkey", "telex", "vni", "slide", "hộp văn bản", "ghi chú", "thuyết trình"],
    steps: [
      "Khởi động Unikey hoặc EVKey với cấu hình khuyến nghị: Bảng mã «Unicode dựng sẵn», Kiểu gõ «Telex» hoặc «VNI».",
      "Gõ tiêu đề và nội dung trang chiếu: Nhấp chuột vào khung tiêu đề hoặc khung nội dung trên trang chiếu để gõ tiếng Việt. Nhấn phím Tab để chuyển nhanh sang vùng văn bản tiếp theo.",
      "Gõ tiếng Việt trong hình vẽ và hộp văn bản: Chọn hình hoặc vẽ khung văn bản mới, nhấp đúp hoặc nhấn phím Enter để gõ chữ tiếng Việt trực tiếp vào hình.",
      "Gõ tiếng Việt trong khung ghi chú thuyết trình: Mở bảng «Ghi chú người thuyết trình» ở phía dưới màn hình và gõ nội dung ghi chú diễn giải. Hệ thống tự động chuẩn hóa văn bản Unicode khi lưu.",
      "Xử lý khi dấu bị mất hoặc nhảy con trỏ: Xác nhận biểu tượng bộ gõ ở khay hệ thống đang hiển thị chữ V (tiếng Việt). Đảm bảo tùy chọn «Sử dụng clipboard cho unicode» trên EVKey/Unikey ở trạng thái tự động hoặc tắt nếu xuất hiện hiện tượng dán thừa ký tự. Nhấn Ctrl+Z để hoàn tác từng từ vừa gõ một cách nhanh chóng."
    ]
  },
  {
    id: "common.vietnamese.typing",
    app: "common",
    commandIds: [],
    title: "Cấu hình bộ gõ tiếng Việt chuẩn cho bộ ứng dụng",
    summary: "Khuyến nghị cấu hình tối ưu cho Unikey, EVKey và bàn phím tiếng Việt tích hợp trên Windows khi sử dụng Doc, Sheet và Slide.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Gõ tiếng Việt" },
    keywords: ["cấu hình bộ gõ", "unikey", "evkey", "telex", "vni", "unicode", "lỗi dấu", "windows ime"],
    steps: [
      "Bảng mã khuyến nghị: Luôn chọn «Unicode» (Unicode dựng sẵn - NFC). Bộ ứng dụng hỗ trợ cả Unicode tổ hợp nhưng sẽ tự động chuẩn hóa về Unicode dựng sẵn để đảm bảo tính tương thích cao nhất khi chia sẻ tệp.",
      "Kiểu gõ: Chọn kiểu gõ quen thuộc là «Telex» hoặc «VNI».",
      "Cấu hình Unikey khuyến nghị: Bật «Bật kiểm tra chính tả» nếu muốn kiểm tra từ điển, hoặc tắt nếu gõ lẫn tiếng Anh; tích chọn «Tự động khôi phục phím với từ sai».",
      "Cấu hình EVKey khuyến nghị: Khởi động với quyền quản trị viên (Run as administrator) để đảm bảo phím gửi tới mọi ứng dụng ổn định; chọn Bảng mã Unicode.",
      "Bàn phím tiếng Việt tích hợp Windows (Windows Built-in Vietnamese IME): Có thể sử dụng trực tiếp thông qua tổ hợp phím Win+Space để chọn «Vietnamese Telex» hoặc «Vietnamese Number Key-based (VNI)», hoạt động mượt mà với cơ chế gửi vùng đệm ký tự chuẩn.",
      "Xử lý lỗi gõ dấu: Nếu thấy dấu bị nhảy hoặc ký tự biến dạng, chuyển bộ gõ sang chữ E rồi quay lại chữ V; kiểm tra font chữ đang dùng hỗ trợ đầy đủ bộ ký tự tiếng Việt (như Arial, Times New Roman, Calibri, Segoe UI, Roboto)."
    ]
  }
];
