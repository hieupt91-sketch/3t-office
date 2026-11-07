/** Hướng dẫn an toàn khi lưu (S1), dùng chung cho 3T Doc, 3T Sheet và 3T Slide. */

const APP_GUIDANCE = {
  writer: { name: "Doc", noun: "tài liệu", extension: "DOCX" },
  sheet: { name: "Sheet", noun: "bảng tính", extension: "XLSX" },
  slides: { name: "Slide", noun: "bản trình chiếu", extension: "PPTX" }
};

export const SAVE_SAFETY_HELP_ENTRIES = Object.entries(APP_GUIDANCE).flatMap(([app, info]) => [
  {
    id: `${app}.file.externalChange`,
    app,
    commandIds: [],
    title: `Hộp thoại «Tệp đã bị thay đổi» trong ${info.name}`,
    summary: `Khi bạn lưu, ${info.name} so sánh tệp trên đĩa với phiên bản bạn đã mở hoặc lưu gần nhất. Nếu người khác hay chương trình khác đã sửa tệp, ứng dụng hỏi bạn trước và không ghi đè âm thầm.`,
    ribbon: { tab: "Tệp", tabId: "file", group: "Lưu" },
    keywords: ["tệp đã bị thay đổi", "ghi đè", "lưu bản sao", "xung đột khi lưu", "thư mục mạng", "người khác sửa tệp", "lan", "file has changed"],
    steps: [
      `Nhấn Ctrl+S hoặc chọn Tệp → Lưu như bình thường. Hộp thoại Tệp đã bị thay đổi chỉ hiện khi tệp ${info.extension} trên đĩa khác với phiên bản ${info.name} đã đọc hoặc ghi lần trước, thường gặp khi tệp nằm trên thư mục mạng dùng chung.`,
      `Chọn Lưu bản sao (lựa chọn mặc định, nhấn Enter) nếu chưa chắc. Bạn đặt tên mới trong hộp thoại lưu, tệp của người kia giữ nguyên và ${info.noun} đang mở chuyển sang bản sao. Sau đó bạn có thể mở cả hai để so sánh.`,
      `Chọn Ghi đè nếu bạn chắc chắn muốn thay tệp trên đĩa bằng ${info.noun} đang mở. Phiên bản bị thay thế được giữ lại một bản trong thư mục sao lưu (xem mục Bản sao lưu trước khi lưu).`,
      `Chọn Hủy hoặc nhấn Esc để không ghi gì. ${info.noun.charAt(0).toUpperCase()}${info.noun.slice(1)} vẫn mở với các thay đổi chưa lưu.`,
      "Dùng phím Tab và Shift+Tab để chuyển giữa các nút, Enter để chọn nút đang sáng. Lưu thành một tên mới bằng F12 thì không qua bước kiểm tra này."
    ]
  },
  {
    id: `${app}.file.saveBackup`,
    app,
    commandIds: [],
    title: `Bản sao lưu trước khi lưu trong ${info.name}`,
    summary: `Mỗi lần lưu đè một tệp đã có, ${info.name} giữ lại đúng một phiên bản ngay trước đó trên máy của bạn, không tạo thêm tệp trong thư mục chứa ${info.noun}. Tính năng luôn bật và không gửi gì ra mạng.`,
    ribbon: { tab: "Tệp", tabId: "file", group: "Lưu" },
    keywords: ["sao lưu", "bản sao lưu", "phiên bản trước", "backup", "lấy lại bản cũ", "lưu nhầm", "save-backups"],
    steps: [
      `Bạn không cần bật gì: nhấn Ctrl+S hoặc chọn Lưu bản sao đè lên một tệp đã có là ${info.name} tự giữ phiên bản vừa bị thay thế.`,
      "Khi cần lấy lại, nhấn Windows+R, nhập %LOCALAPPDATA%\\VNOffice\\save-backups rồi nhấn Enter. Trên macOS, thư mục nằm tại ~/Library/Application Support/VNOffice/save-backups.",
      `Mỗi ${info.noun} có một thư mục con. Tìm thư mục có tệp cùng tên, kiểm tra thời gian sửa đổi; tệp backup.json trong đó ghi đường dẫn gốc.`,
      `Sao chép tệp đó ra nơi khác rồi mở bằng ${info.name} để kiểm tra. Đừng mở trực tiếp trong thư mục sao lưu vì lần lưu sau có thể thay thế nó.`,
      "Giới hạn: chỉ giữ một phiên bản cho mỗi tệp, tối đa 20 tệp gần nhất và tổng 1 GB; tệp lớn hơn 256 MB không được sao lưu. Khi bạn đặt mật khẩu cho tệp, bản sao lưu không có mật khẩu trước đó được xóa. Bản sao lưu không thay thế việc sao lưu định kỳ của bạn."
    ]
  }
]);
