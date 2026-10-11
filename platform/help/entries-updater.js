/** Vietnamese instructions for the shared signed updater in all three apps. */

const apps = ["writer", "sheet", "slides"];
const names = { writer: "Doc", sheet: "Sheet", slides: "Slide" };

export const UPDATER_HELP_ENTRIES = apps.map((app) => ({
  id: `${app}.help.updates`,
  app,
  commandIds: [],
  title: "Kiểm tra và cài bản cập nhật",
  summary: `Kiểm tra lần lượt kho nội bộ rồi kho Internet, tải các tệp đã thay đổi và áp dụng bản cập nhật ${names[app]} sau khi khởi động lại. Ứng dụng vẫn hoạt động khi mọi nguồn cập nhật ngoại tuyến.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Cập nhật 3T Office" },
  keywords: ["cập nhật", "update", "phiên bản", "khởi động lại", "bản mới", "ghi chú phát hành"],
  steps: [
    "Mở tab Trợ giúp trên ribbon, nhấn Trợ giúp để mở bảng tra cứu; phần Cập nhật 3T Office hiển thị phiên bản đang cài.",
    "Nhấn Kiểm tra cập nhật. 3T Office thử kho nội bộ trước; nếu không kết nối được, ứng dụng thử kho Internet đã cấu hình. Nguồn đầu tiên có kênh phát hành đọc được và manifest có chữ ký hợp lệ sẽ được dùng cho toàn bộ lần tải.",
    "Chọn Xem thay đổi để đọc ghi chú phát hành tiếng Việt. Chọn Để sau nếu đang làm việc; thông báo sẽ xuất hiện lại khi mở 3T Office lần sau.",
    "Khi sẵn sàng, nhấn Khởi động lại ngay. Nếu tài liệu có thay đổi chưa lưu, chọn Lưu tài liệu và chờ lưu xong; chọn Hủy khởi động lại để tiếp tục làm việc.",
    "Đóng mọi cửa sổ 3T Office nếu được yêu cầu. Bộ cập nhật thay tệp sau khi ứng dụng và bộ dựng tích hợp của 3T Office thoát, rồi mở lại đúng Doc, Sheet hoặc Slide đang dùng.",
    "Nếu chữ ký manifest không hợp lệ, 3T Office từ chối nguồn đó và không tải blob của nguồn ấy. Blob luôn được kiểm tra SHA-256; ứng dụng không nới lỏng xác thực khi chuyển từ mạng nội bộ sang Internet.",
    "Nếu bản mới không khởi động khỏe mạnh, 3T Office tự phục hồi phiên bản trước. Không cần cài lại gói đầy đủ; nếu cả kho nội bộ và Internet đều không truy cập được, ứng dụng báo chưa thể cập nhật nhưng vẫn tiếp tục chạy ở phiên bản hiện tại."
  ]
}));
