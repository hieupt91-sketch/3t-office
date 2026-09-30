/** Vietnamese instructions for the shared signed updater in all three apps. */

const apps = ["writer", "sheet", "slides"];
const names = { writer: "VN Writer", sheet: "VN Sheet", slides: "VN Slides" };

export const UPDATER_HELP_ENTRIES = apps.map((app) => ({
  id: `${app}.help.updates`,
  app,
  commandIds: [],
  title: "Kiểm tra và cài bản cập nhật",
  summary: `Kiểm tra kênh phát hành nội bộ, tải các tệp đã thay đổi và áp dụng bản cập nhật ${names[app]} sau khi khởi động lại. Ứng dụng vẫn hoạt động nếu nguồn cập nhật ngoại tuyến.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Cập nhật VN Office" },
  keywords: ["cập nhật", "update", "phiên bản", "khởi động lại", "bản mới", "ghi chú phát hành"],
  steps: [
    "Mở tab Trợ giúp trên ribbon, nhấn Trợ giúp để mở bảng tra cứu; phần Cập nhật VN Office hiển thị phiên bản đang cài.",
    "Nhấn Kiểm tra cập nhật để kiểm tra nguồn phát hành đã cấu hình cho máy. Khi có bản mới, VN Office tải nền các tệp thay đổi và hiện thông báo bên dưới ribbon.",
    "Chọn Xem thay đổi để đọc ghi chú phát hành tiếng Việt. Chọn Để sau nếu đang làm việc; thông báo sẽ xuất hiện lại khi mở VN Office lần sau.",
    "Khi sẵn sàng, nhấn Khởi động lại ngay. Nếu tài liệu có thay đổi chưa lưu, chọn Lưu tài liệu và chờ lưu xong; chọn Hủy khởi động lại để tiếp tục làm việc.",
    "Đóng mọi cửa sổ VN Office nếu được yêu cầu. Bộ cập nhật thay tệp sau khi ứng dụng và LibreOffice thoát, rồi mở lại đúng Writer, Sheet hoặc Slides đang dùng.",
    "Nếu bản mới không khởi động khỏe mạnh, VN Office tự phục hồi phiên bản trước. Không cần cài lại gói đầy đủ; nếu nguồn nội bộ không truy cập được, ứng dụng tiếp tục chạy ở phiên bản hiện tại."
  ]
}));
