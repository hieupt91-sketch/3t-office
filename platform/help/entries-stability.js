/** Vietnamese CH-9 stability guidance shared by 3T Doc, 3T Sheet, and 3T Slide. */

const APP_GUIDANCE = {
  writer: {
    name: "Doc",
    noun: "tài liệu",
    example: "mở hoặc xuất PDF một tệp DOCX"
  },
  sheet: {
    name: "Sheet",
    noun: "bảng tính",
    example: "mở, in hoặc xuất PDF một tệp XLSX"
  },
  slides: {
    name: "Slide",
    noun: "bản trình chiếu",
    example: "mở hoặc xuất PDF một tệp PPTX"
  }
};

export const PROCESS_CLEANUP_HELP_ENTRIES = Object.entries(APP_GUIDANCE).map(([app, info]) => ({
  id: `${app}.help.processCleanup`,
  app,
  commandIds: [],
  title: `Dọn tiến trình hỗ trợ của ${info.name}`,
  summary: `${info.name} tự đóng bộ xử lý tài liệu và tiến trình hỗ trợ do chính ứng dụng khởi tạo; ứng dụng không đóng các ứng dụng tài liệu do người dùng tự mở.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Ổn định và quyền riêng tư" },
  keywords: ["tiến trình treo", "bộ xử lý tài liệu", "tiến trình hỗ trợ", "đóng ứng dụng", "khởi động lại"],
  steps: [
    `Làm việc và đóng ${info.name} bằng nút Đóng hoặc Tệp → Đóng như bình thường. Không cần bật tùy chọn riêng.`,
    `${info.name} chỉ ghi nhận PID cùng thời điểm tạo của bộ xử lý tài liệu và tiến trình hỗ trợ mà chính phiên hiện tại đã mở khi bạn ${info.example}.`,
    "Khi cửa sổ 3T Office cuối cùng đóng, ứng dụng dừng các PID đã ghi nhận. Các ứng dụng tài liệu bạn tự mở trước đó không bị ảnh hưởng.",
    "Nếu máy hoặc 3T Office tắt đột ngột, hãy mở lại bất kỳ ứng dụng 3T Office nào. Lần khởi động này tự quét sổ PID cục bộ và chỉ dọn mục có tiến trình chủ cũ đã chết.",
    `Sau khi mở lại, tiếp tục dùng ${info.name} và kiểm tra ${info.noun}; bản khôi phục chưa lưu (nếu có) xuất hiện trong hộp thoại Khôi phục tài liệu chưa lưu.`
  ]
}));

export const PERFORMANCE_HELP_ENTRIES = Object.entries(APP_GUIDANCE).map(([app, info]) => ({
  id: `${app}.help.performanceLog`,
  app,
  commandIds: [],
  title: `Nhật ký hiệu năng của ${info.name}`,
  summary: `${info.name} có thể ghi thời gian mở, lưu, in/xuất PDF, thời gian khởi động bộ xử lý tài liệu và bộ nhớ vào JSONL cục bộ; nhật ký mặc định tắt và không được gửi đi.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Tùy chọn" },
  keywords: ["nhật ký hiệu năng", "performance log", "chậm", "jsonl", "bộ nhớ", "không gửi đi"],
  steps: [
    "Mở tab Trợ giúp trên ribbon hoặc nhấn F1. Trong phần Tùy chọn, đánh dấu Ghi nhật ký hiệu năng (không gửi đi).",
    `Thực hiện thao tác cần đo trong ${info.name}, chẳng hạn ${info.example}. Nhật ký chỉ ghi loại thao tác, thời gian, kết quả, ứng dụng và bộ nhớ; không ghi nội dung hay đường dẫn ${info.noun}.`,
    "Nhấn Mở thư mục nhật ký để xem performance.jsonl. Mỗi dòng là một bản ghi JSON; ứng dụng tự xoay tối đa 3 tệp, mỗi tệp 5 MB.",
    "Bỏ đánh dấu Ghi nhật ký hiệu năng (không gửi đi) để ngừng ghi. Các tệp đã có vẫn nằm trên thiết bị cho tới khi bạn tự quản lý chúng.",
    "Chỉ chia sẻ tệp nhật ký khi bạn chủ động chọn gửi cho bộ phận hỗ trợ; 3T Office không tự tải nhật ký lên mạng."
  ]
}));

export const STABILITY_HELP_ENTRIES = [
  ...PROCESS_CLEANUP_HELP_ENTRIES,
  ...PERFORMANCE_HELP_ENTRIES
];
