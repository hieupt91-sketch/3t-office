/** Vietnamese guidance for shared consent and error-reporting controls. */

const appNames = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };
const HELP_ENTRIES = Object.entries(appNames).map(([app, name]) => ({
  id: `${app}.help.errorReporting`,
  app,
  commandIds: [],
  title: "Báo lỗi, góp ý và quyền riêng tư",
  summary: `Trong ${name}, bạn có thể bật gửi báo cáo lỗi kỹ thuật đã lọc sau khi đồng ý; mô tả góp ý và tài liệu luôn được lưu cục bộ, không gửi qua mạng.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
  keywords: ["báo lỗi", "góp ý", "error reporting", "quyền riêng tư", "đồng ý", "offline", "hàng đợi"],
  steps: [
    "Mở tab Trợ giúp trên ribbon rồi nhấn Trợ giúp để mở bảng tra cứu dùng chung. Tìm bài “Báo lỗi, góp ý và quyền riêng tư” để xem lại hướng dẫn này.",
    "Trong phần Báo lỗi / Góp ý của bảng Trợ giúp, bật hoặc tắt ô “Cho phép gửi báo cáo lỗi kỹ thuật tự động”. Khi chưa đồng ý, báo cáo chỉ nằm trong hàng đợi cục bộ. Sau khi đồng ý, báo cáo kỹ thuật được gửi nền khi có kết nối.",
    "Để lưu góp ý riêng, nhấn “Báo lỗi / Góp ý”, nhập mô tả rồi nhấn “Lưu góp ý”. Mô tả được giữ trên máy và không được gửi lên máy chủ.",
    "Khi đồng ý gửi lỗi tự động, 3T Office chỉ gửi ứng dụng, phiên bản, hệ điều hành, loại lỗi, thông điệp và ngăn xếp đã lọc cùng mã cài đặt ngẫu nhiên. Không gửi tài liệu, tệp đính kèm, mô tả góp ý, tên/đường dẫn tệp, ô, đoạn văn, tên sheet, công thức, clipboard hoặc tên người dùng Windows."
  ]
}));

export { HELP_ENTRIES as ERROR_REPORTING_HELP_ENTRIES };
