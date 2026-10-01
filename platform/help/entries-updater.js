/** Vietnamese instructions for the shared signed updater in all three apps. */

const apps = ["writer", "sheet", "slides"];
const names = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };

export const UPDATER_HELP_ENTRIES = apps.map((app) => ({
  id: `${app}.help.updates`,
  app,
  commandIds: [],
  title: "Kiểm tra và cài bản cập nhật",
  summary: `Kiểm tra nguồn cập nhật Internet đã cấu hình trước rồi thử kho LAN nếu nguồn đó không dùng được; xác minh chữ ký trước khi áp dụng ${names[app]}. Ứng dụng vẫn hoạt động ngoại tuyến.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Cập nhật 3T Office" },
  keywords: ["cập nhật", "update", "phiên bản", "khởi động lại", "bản mới", "ghi chú phát hành"],
  steps: [
    "Mở tab Trợ giúp trên ribbon, nhấn Trợ giúp để mở bảng tra cứu; phần Cập nhật 3T Office hiển thị phiên bản đang cài.",
    "Nhấn Kiểm tra cập nhật. 3T Office thử nguồn Internet đã cấu hình trước, rồi chuyển sang kho LAN nếu nguồn trước không đọc được. Manifest luôn được xác minh bằng khóa phát hành tích hợp trước khi tải tệp.",
    "Chọn Xem thay đổi để đọc ghi chú phát hành tiếng Việt. Chọn Để sau nếu đang làm việc; thông báo sẽ xuất hiện lại khi mở 3T Office lần sau.",
    "Khi sẵn sàng, nhấn Khởi động lại ngay. Nếu tài liệu có thay đổi chưa lưu, chọn Lưu tài liệu và chờ lưu xong; chọn Hủy khởi động lại để tiếp tục làm việc.",
    "Đóng mọi cửa sổ 3T Office nếu được yêu cầu. Bộ cập nhật thay tệp sau khi ứng dụng và LibreOffice thoát, rồi mở lại đúng Writer, Sheet hoặc Slides đang dùng.",
    "Nếu bản mới không khởi động khỏe mạnh, 3T Office tự phục hồi phiên bản trước. Không cần cài lại gói đầy đủ; nếu nguồn nội bộ không truy cập được, ứng dụng tiếp tục chạy ở phiên bản hiện tại."
  ]
}));
