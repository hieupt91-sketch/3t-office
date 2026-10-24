/**
 * 3T Office — Trợ giúp: phông chữ thay thế trên macOS (MAC-9).
 * Nội dung bám đúng hành vi đã cài đặt: phông hệ thống macOS + phông người dùng cài bằng Font Book được dùng
 * khi in/xem trước/xuất PDF; phông tài liệu mà máy không có được thay bằng phông cùng kích thước hoặc gần giống nhất.
 */

export const MACOS_FONT_HELP_ENTRIES = [
  {
    id: "common.macos.fontSubstitution",
    app: "common",
    commandIds: [],
    title: "Phông chữ thay thế trên macOS (giữ đúng số trang)",
    summary: "Trên macOS, Doc, Sheet và Slide của 3T Office dùng phông có sẵn của macOS và phông bạn tự cài. Nếu tài liệu (thường tạo bằng bộ văn phòng khác) dùng phông mà máy Mac không có, 3T Office tự dùng phông thay thế có cùng độ rộng chữ và chiều cao dòng để xuống dòng và ngắt trang giống bản gốc; tên phông gốc trong tệp vẫn được giữ nguyên khi lưu. Tra cứu mục này ở tab Trợ giúp hoặc nhấn F1.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phông chữ" },
    keywords: ["phông chữ", "phong chu", "font", "thiếu phông", "phông thay thế", "font book", "sổ phông", "số trang", "ngắt trang", "macos", "mac", "carlito", "caladea", "liberation", "cài phông"],
    steps: [
      "Bạn thấy gì: ô Phông chữ ở tab Trang chủ vẫn hiện tên phông gốc của tài liệu. Khi xem trước khi in, in hoặc xuất PDF, nếu máy Mac không có phông đó, 3T Office dùng phông thay thế; chữ tiếng Việt vẫn hiển thị đủ dấu. Khi lưu, tệp vẫn ghi tên phông gốc nên mở lại trên máy có phông gốc sẽ hiển thị như cũ.",
      "Phông thay thế giữ đúng số trang (cùng độ rộng chữ và chiều cao dòng, đi kèm 3T Office): Carlito thay cho phông mặc định không chân phổ biến của bộ văn phòng khác, Caladea thay cho phông có chân đi kèm với nó, Liberation Sans / Liberation Serif / Liberation Mono thay cho các phông Arial, Times New Roman, Courier New nếu máy thiếu (macOS thường đã có sẵn ba phông này).",
      "Phông thay thế gần giống (không bảo đảm cùng số trang): phông giao diện và phông mặc định đời mới của bộ văn phòng khác được thay bằng Helvetica Neue; Lucida Sans thay bằng Lucida Grande; phông chữ Hán của bộ văn phòng khác thay bằng Heiti SC (hoặc Songti SC) có sẵn trong macOS; phông chữ đều nét cho lập trình thay bằng Liberation Mono. Với các phông này, chỗ xuống dòng và số trang có thể lệch một chút so với máy gốc.",
      "Muốn hiển thị đúng phông gốc: lấy tệp phông (.ttf, .otf hoặc .ttc) từ nguồn có giấy phép hợp lệ, nhấp đúp tệp để mở ứng dụng Sổ phông (Font Book) của macOS rồi nhấn Cài đặt. Sổ phông cài cho riêng bạn vào thư mục Thư viện > Phông chữ (Library/Fonts) trong thư mục người dùng; chọn cài cho mọi người dùng nếu cần.",
      "Sau khi cài phông, thoát hẳn 3T Office (Cmd+Q) rồi mở lại tài liệu: 3T Office tự nhận phông mới và dùng phông thật thay cho phông thay thế. Không cần cấu hình thêm.",
      "Lưu ý: 3T Office không lấy phông nằm bên trong gói của ứng dụng khác vì giấy phép của các phông đó chỉ cho chính ứng dụng ấy dùng. Nếu cần phông đó, hãy cài bản có giấy phép bằng Sổ phông như bước trên."
    ]
  }
];
