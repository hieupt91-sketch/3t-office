/** Vietnamese instructions for the shared account and license dialog in all three apps. */

const apps = ["writer", "sheet", "slides"];
const names = { writer: "Doc", sheet: "Sheet", slides: "Slide" };

export const LICENSE_HELP_ENTRIES = apps.map((app) => ({
  id: `${app}.file.licenseAccount`,
  app,
  commandIds: ["common.file.backstage"],
  title: "Tài khoản và bản quyền: nhập mã kích hoạt",
  summary: `Xem tình trạng bản quyền của 3T Office, nhập mã kích hoạt, kích hoạt ngoại tuyến hoặc gỡ kích hoạt khỏi máy. ${names[app]} vẫn dùng đầy đủ trong thời gian dùng thử 30 ngày và không bao giờ tự tắt chỉ vì máy mất Internet.`,
  ribbon: { tab: "Tệp", tabId: "file", group: "Tài khoản và bản quyền" },
  keywords: ["bản quyền", "mã kích hoạt", "key", "kích hoạt", "dùng thử", "ngoại tuyến", "gỡ kích hoạt", "tài khoản", "license"],
  steps: [
    "Mở tab Tệp (hoặc nhấn Alt+F) rồi chọn Tài khoản và bản quyền ở cuối cột bên trái. Hộp hiện tình trạng: Dùng thử (còn bao nhiêu ngày), Đã kích hoạt hoặc Hết hạn dùng thử.",
    "Để kích hoạt, gõ hoặc dán mã vào ô Mã kích hoạt. Mã có dạng 3TO-XXXXX-XXXXX-XXXXX-XXXXX; ứng dụng tự chèn dấu gạch và tự kiểm tra lỗi gõ ngay trên máy, không cần Internet. Khi mã hợp lệ, nhấn Kích hoạt (hoặc Enter).",
    "Cần Internet đúng một lần để kích hoạt. Sau đó 3T Office chạy hoàn toàn ngoại tuyến; thỉnh thoảng ứng dụng tự xác nhận lại ở nền khi có mạng. Nếu quá hạn xác nhận mà không có mạng, bản quyền vẫn dùng bình thường và ứng dụng chỉ nhắc kết nối.",
    "Mỗi mã dùng được trên số máy ghi trong đơn mua (mặc định 2 máy). Nếu báo đã hết số máy, thông báo cho biết các máy đang dùng; hãy gỡ kích hoạt ở một máy cũ rồi kích hoạt lại ở máy này.",
    "Máy không có Internet: mở mục Kích hoạt ngoại tuyến trong cùng hộp, nhấn Sao chép để lấy mã thiết bị và gửi cùng mã kích hoạt cho bộ phận hỗ trợ 3T. Khi nhận lại mã kích hoạt ngoại tuyến, dán vào ô tương ứng và nhấn Áp dụng.",
    "Khi đã kích hoạt, nhấn Xác nhận lại bản quyền để làm mới ngay, hoặc Gỡ kích hoạt khỏi máy này (có hỏi xác nhận) để giải phóng chỗ cho máy khác. Gỡ kích hoạt cần Internet.",
    "Mã kích hoạt chỉ lưu dấu vân tay máy và chữ ký bản quyền trên máy bạn; nội dung tài liệu không bao giờ được gửi đi trong quá trình này."
  ]
}));
