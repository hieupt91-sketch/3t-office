/** Vietnamese guidance for shared consent and error-reporting controls. */

const appNames = { writer: "Doc", sheet: "Sheet", slides: "Slide" };
const HELP_ENTRIES = Object.entries(appNames).map(([app, name]) => ({
  id: `${app}.help.errorReporting`,
  app,
  commandIds: [],
  title: "Báo lỗi, góp ý và quyền riêng tư",
  summary: `Xem trạng thái đồng ý gửi lỗi tự động và quyền riêng tư trong ${name}. Báo cáo chỉ chứa thông tin kỹ thuật đã lọc; 3T Office không gửi tệp đính kèm hoặc nội dung tài liệu tới máy chủ báo lỗi.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
  keywords: ["báo lỗi", "góp ý", "error reporting", "quyền riêng tư", "đồng ý", "không đính kèm", "offline"],
  steps: [
    "Mở tab Trợ giúp trên ribbon rồi nhấn Trợ giúp để mở bảng tra cứu dùng chung. Tìm bài “Báo lỗi, góp ý và quyền riêng tư” để xem lại hướng dẫn này.",
    "Trong phần Báo lỗi / Góp ý của bảng Trợ giúp, bật hoặc tắt ô “Cho phép gửi báo cáo lỗi kỹ thuật tự động”. Trạng thái bên dưới cho biết máy chủ đã cấu hình chưa và báo cáo đang gửi hay chỉ lưu cục bộ.",
    "Để gửi góp ý, nhấn “Báo lỗi / Góp ý”, nhập mô tả rồi nhấn “Gửi góp ý”. Khi chưa có mạng hoặc máy chủ, báo cáo được lưu trong hàng đợi cục bộ; bật gửi tự động để ứng dụng thử lại có giãn cách sau khi có kết nối.",
    "Biểu mẫu không có chức năng đính kèm tài liệu. 3T Office không tải tệp đang mở, bản khôi phục hoặc nội dung tài liệu lên máy chủ báo lỗi, kể cả khi báo cáo đang nằm trong hàng đợi ngoại tuyến.",
    "Khi đồng ý gửi lỗi tự động, 3T Office chỉ gửi mã sự kiện, ứng dụng, phiên bản, hệ điều hành, loại lỗi, thông điệp và ngăn xếp đã lọc cùng mã cài đặt UUID ngẫu nhiên. Không gửi nội dung tài liệu, tên/đường dẫn tệp, ô, đoạn văn, tên sheet, công thức, clipboard hoặc tên người dùng Windows."
  ]
}));

export { HELP_ENTRIES as ERROR_REPORTING_HELP_ENTRIES };
