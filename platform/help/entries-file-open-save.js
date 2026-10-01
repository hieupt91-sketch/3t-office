/** Vietnamese guidance for opening, converting, and saving supported Office files. */

const appNames = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };
const HELP_ENTRIES = Object.entries(appNames).map(([app, name]) => ({
  id: `${app}.help.openSaveFiles`,
  app,
  commandIds: [],
  title: "Mở, chuyển đổi và lưu tệp",
  summary: `Mở tệp Office và định dạng cũ trong ${name}, lưu bản sao sang định dạng mới, và xử lý thông báo khi tệp bị khóa, mã hóa hoặc hỏng.`,
  ribbon: { tab: "Tệp", tabId: "file", group: "Mở và lưu" },
  keywords: ["mở tệp", "lưu", "lưu bản sao", "doc", "xls", "ppt", "mật khẩu", "bị khóa", "bị hỏng"],
  steps: [
    `Chọn Tệp → Mở trong ${name}, chọn tệp cần làm việc rồi chờ nội dung xuất hiện. ${name} nhận các định dạng Office mới và một số định dạng cũ như DOC, XLS và PPT.`,
    "Để đổi tệp cũ sang định dạng mới, chọn Tệp → Lưu bản sao, chọn DOCX, XLSX hoặc PPTX trong danh sách định dạng, đặt tên cho bản mới rồi chọn Lưu.",
    "Nếu tệp báo đang bị khóa, hãy đóng tệp trong chương trình khác hoặc nhờ người đang giữ tệp đóng nó, rồi thử mở lại. Bản đang mở trong 3T Office vẫn được giữ nguyên.",
    "Nếu tệp được bảo vệ bằng mật khẩu, hãy mở tệp bằng chương trình đã tạo, nhập mật khẩu và lưu một bản không mã hóa trước khi mở bản đó trong 3T Office.",
    "Nếu tệp bị hỏng hoặc sai định dạng, hãy thử bản sao lưu hoặc mở lại bằng chương trình đã tạo. Không lưu đè lên bản gốc khi đang khôi phục dữ liệu."
  ]
}));

export { HELP_ENTRIES as FILE_OPEN_SAVE_HELP_ENTRIES };
