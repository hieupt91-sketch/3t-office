/** Vietnamese guidance for shared consent and error-reporting controls. */

const appNames = { writer: "Doc", sheet: "Sheet", slides: "Slide" };
const HELP_ENTRIES = Object.entries(appNames).map(([app, name]) => ({
  id: `${app}.help.errorReporting`,
  app,
  commandIds: [],
  title: "Báo lỗi, góp ý và quyền riêng tư",
  summary: `Gửi mô tả lỗi do bạn chủ động viết, xem trạng thái đồng ý gửi lỗi tự động và chọn có đính kèm tài liệu hay không trong ${name}. Báo cáo tự động chỉ chứa thông tin kỹ thuật đã lọc; nội dung tệp chỉ được gửi khi bạn mở biểu mẫu và đánh dấu ô đính kèm.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
  keywords: ["báo lỗi", "góp ý", "error reporting", "quyền riêng tư", "đồng ý", "đính kèm", "offline"],
  steps: [
    "Mở tab Trợ giúp trên ribbon rồi nhấn Trợ giúp để mở bảng tra cứu dùng chung. Tìm bài “Báo lỗi, góp ý và quyền riêng tư” để xem lại hướng dẫn này.",
    "Trong phần Báo lỗi / Góp ý của bảng Trợ giúp, bật hoặc tắt ô “Cho phép gửi báo cáo lỗi kỹ thuật tự động”. Trạng thái bên dưới cho biết máy chủ đã cấu hình chưa và báo cáo đang gửi hay chỉ lưu cục bộ.",
    "Để gửi góp ý, nhấn “Báo lỗi / Góp ý”, nhập mô tả rồi nhấn “Gửi góp ý”. Khi chưa có mạng hoặc máy chủ, báo cáo được lưu trong hàng đợi cục bộ; bật gửi tự động để ứng dụng gửi hàng đợi sau khi có kết nối.",
    "Mặc định, biểu mẫu không đính kèm tài liệu. Chỉ đánh dấu “Đính kèm tệp đang mở” sau khi đọc cảnh báo: toàn bộ nội dung tệp sẽ được gửi riêng cho nhóm phát triển. Không đánh dấu nếu tệp có dữ liệu bạn không muốn chia sẻ.",
    "Khi đồng ý gửi lỗi tự động, 3T Office chỉ gửi loại lỗi, thông điệp và ngăn xếp đã lọc, ứng dụng/phiên bản, thao tác, thời gian, phần mở rộng và kích thước làm tròn, phiên bản Windows cùng mã cài đặt ngẫu nhiên. Không gửi nội dung tài liệu, tên/đường dẫn tệp, ô, đoạn văn, tên sheet, công thức, clipboard hoặc tên người dùng Windows."
  ]
}));

export { HELP_ENTRIES as ERROR_REPORTING_HELP_ENTRIES };
