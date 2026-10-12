/**
 * Hướng dẫn tiếng Việt cho các lệnh còn thiếu bài trợ giúp (đo bằng scripts/perf-proto/help-coverage-report.mjs, 04/10/2026).
 * Vị trí trên ribbon chỉ ghi khi đã xác minh từ cấu hình ribbon thật; phím tắt khớp command-definitions.js.
 */

const apps = ["writer", "sheet", "slides"];
const names = { writer: "Doc", sheet: "Sheet", slides: "Slide" };

const common = apps.flatMap((app) => [
  {
    id: `${app}.view.fullScreen`,
    app,
    commandIds: ["common.view.fullScreen"],
    title: "Toàn màn hình (F11)",
    summary: `Ẩn thanh tiêu đề của hệ điều hành để ${names[app]} chiếm trọn màn hình, giúp tập trung vào nội dung. Bật hoặc tắt bằng cùng một phím.`,
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt và thao tác nhanh" },
    keywords: ["toàn màn hình", "F11", "full screen", "tập trung", "ẩn thanh tiêu đề"],
    steps: [
      "Nhấn F11 để bật chế độ toàn màn hình. Cửa sổ giãn kín màn hình và ribbon vẫn dùng bình thường.",
      "Nhấn F11 lần nữa để thoát về cửa sổ thường.",
      "Chế độ này không thay đổi nội dung hay bố cục tài liệu, chỉ thay đổi cách cửa sổ hiển thị."
    ]
  },
  {
    id: `${app}.view.toggleTheme`,
    app,
    commandIds: ["common.view.toggleTheme"],
    title: "Chuyển giao diện Tối / Sáng",
    summary: `Đổi giao diện ${names[app]} giữa nền sáng và nền tối để dễ nhìn trong môi trường thiếu sáng. Lựa chọn được ghi nhớ cho lần mở sau.`,
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt và thao tác nhanh" },
    keywords: ["giao diện tối", "giao diện sáng", "dark mode", "chủ đề", "nền tối", "đổi màu giao diện"],
    steps: [
      "Nhấn nút Tối (hoặc Sáng) ở thanh trên cùng, bên phải ô tìm kiếm, để đổi giao diện ngay lập tức.",
      "Nhấn lần nữa để quay lại giao diện trước đó. Nhãn của nút cho biết giao diện bạn sẽ chuyển sang.",
      "Giao diện chỉ đổi màu của ứng dụng, không đổi màu chữ hay màu nền trong tài liệu của bạn."
    ]
  },
  {
    id: `${app}.edit.repeat`,
    app,
    commandIds: ["common.edit.repeat"],
    title: "Lặp lại thao tác cuối (F4)",
    summary: `Làm lại đúng thao tác vừa thực hiện trên vùng đang chọn mới, ví dụ định dạng hoặc chèn, mà không phải bấm lại từng nút. Dùng được trong ${names[app]}.`,
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt và thao tác nhanh" },
    keywords: ["lặp lại", "F4", "repeat", "làm lại thao tác", "thao tác cuối"],
    steps: [
      "Thực hiện một thao tác, ví dụ tô đậm hoặc đổi màu một đoạn hay một ô.",
      "Chọn vùng khác rồi nhấn F4 để áp dụng lại đúng thao tác đó.",
      "Nếu chưa có thao tác nào để lặp, F4 không làm gì. F4 khác với Ctrl+Y (làm lại thao tác đã hoàn tác)."
    ]
  },
]);

const sheetOnly = [
  {
    id: "sheet.cell.insertLineBreak",
    app: "sheet",
    commandIds: ["sheet.cell.insertLineBreak"],
    title: "Xuống dòng trong cùng một ô (Alt+Enter)",
    summary: "Ngắt dòng ngay trong ô để viết nhiều dòng trong một ô, ví dụ địa chỉ hoặc ghi chú dài.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Căn chỉnh" },
    keywords: ["xuống dòng trong ô", "Alt+Enter", "ngắt dòng", "nhiều dòng trong một ô", "ngắt dòng trong ô"],
    steps: [
      "Bấm đúp vào ô (hoặc chọn ô rồi nhấn F2) để vào chế độ sửa.",
      "Đặt con trỏ đúng chỗ muốn ngắt và nhấn Alt+Enter. Một dòng mới bắt đầu trong cùng ô; Enter thường vẫn xác nhận ô.",
      "Nhấn Enter để xác nhận. Nếu chữ chưa hiện đủ các dòng, tăng chiều cao hàng hoặc bật Ngắt dòng tự động trong nhóm Căn chỉnh."
    ]
  },
  {
    id: "sheet.calc.calculateNow",
    app: "sheet",
    commandIds: ["sheet.calc.calculateNow"],
    title: "Tính lại ngay (F9)",
    summary: "Buộc Sheet tính lại toàn bộ công thức của sổ làm việc ngay lập tức, dùng khi nghi ngờ kết quả chưa cập nhật.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tính toán" },
    keywords: ["tính lại", "F9", "calculate now", "tính toán lại công thức", "cập nhật công thức"],
    steps: [
      "Nhấn F9 để tính lại mọi công thức trong sổ làm việc.",
      "Sau khi tính xong, các ô công thức hiển thị giá trị mới theo dữ liệu hiện tại.",
      "Với sổ làm việc rất lớn, việc tính lại có thể mất vài giây; ứng dụng vẫn phản hồi và bạn có thể tiếp tục làm việc."
    ]
  },
  {
    id: "sheet.edit.hyperlink",
    app: "sheet",
    commandIds: ["common.edit.hyperlink"],
    title: "Chèn liên kết vào ô (Ctrl+K)",
    summary: "Gắn liên kết tới trang web, tệp hoặc vị trí khác trong sổ làm việc vào ô đang chọn.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["liên kết", "siêu liên kết", "hyperlink", "Ctrl+K", "chèn liên kết"],
    steps: [
      "Chọn ô cần gắn liên kết rồi nhấn Ctrl+K (hoặc dùng nhóm Liên kết trong tab Chèn).",
      "Nhập địa chỉ đích và nội dung hiển thị, rồi xác nhận.",
      "Ô hiển thị như liên kết; nhấn giữ Ctrl rồi bấm vào ô để mở. Dữ liệu của bạn không được gửi đi đâu khi chèn liên kết."
    ]
  },
  {
    id: "sheet.open.quickView",
    app: "sheet",
    commandIds: [],
    title: "Mở và sửa bảng tính lớn khi đang nạp",
    summary: "Khi mở tệp .xlsx, Sheet hiển thị vùng đầu để bạn đọc và sửa ô trong khi nạp phần còn lại ở nền. Điều này hữu ích nhất với bảng tính lớn. Sau khi nạp đầy đủ, các chỉnh sửa và lịch sử hoàn tác được chuyển sang lưới bình thường; trang tính, ô chọn và vị trí cuộn được giữ lại.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt và thao tác nhanh" },
    keywords: ["tệp xlsx", "tệp lớn", "mở chậm", "xem nhanh", "sửa khi đang nạp", "đang nạp đầy đủ", "quick view", "bảng tính lớn", "nạp", "hoàn tác"],
    steps: [
      "Mở bảng tính bằng Tệp ▸ Mở hoặc bấm đúp tệp. Khi vùng dữ liệu đầu hiện và trạng thái báo Đang nạp đầy đủ, bấm ô rồi gõ để sửa; nhấn Enter để ghi nhận và chuyển xuống ô kế tiếp. F2 sửa nội dung hiện có; Delete hoặc Backspace xóa ô; Escape hủy lần sửa đang nhập.",
      "Để dán vùng ô, chọn ô góc trên bên trái rồi nhấn Ctrl+V; dữ liệu tab/newline từ clipboard được dán thành một nhóm. Ctrl+Z hoàn tác và Ctrl+Y làm lại thao tác gõ, xóa hoặc dán ngay trong lúc nạp.",
      "Định dạng nhanh ô đang chọn bằng Ctrl+B (đậm), Ctrl+I (nghiêng) hoặc Ctrl+U (gạch chân); cũng có thể dùng các nút Đậm, Nghiêng, Gạch chân trên ribbon. Các thao tác này có thể hoàn tác bằng Ctrl+Z/Ctrl+Y.",
      "Trong lúc nạp, bạn có thể cuộn, chọn ô và chuyển trang tính. Lưu, In, tìm kiếm/thay thế và lệnh áp dụng cho cả sổ làm việc khả dụng sau khi trạng thái báo Đã nạp đầy đủ; khi đó Sheet giữ lại chỉnh sửa, trang tính, ô chọn và vị trí cuộn.",
      "Nếu nạp đầy đủ thất bại, thông báo đỏ giữ nguyên nội dung xem nhanh và các chỉnh sửa tạm. Thử lại mở bản gốc trong cửa sổ mới; hãy chép lại nội dung sửa tạm trước khi đóng cửa sổ đang lỗi.",
      "Muốn tắt tính năng này (luôn chờ nạp đầy đủ như trước), đặt biến môi trường VNO_OPEN_VIEWFIRST=0 trước khi chạy ứng dụng."
    ]
  }
];

const slidesOnly = [
  {
    id: "slides.edit.select",
    app: "slides",
    commandIds: ["slides.edit.select"],
    title: "Chọn đối tượng hoặc tất cả trên trang chiếu",
    summary: "Chọn nhanh tất cả hoặc chỉ các đối tượng trên trang chiếu để di chuyển, định dạng hoặc xóa cùng lúc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chọn tất cả", "chọn đối tượng", "chọn", "select", "chọn nhiều đối tượng"],
    steps: [
      "Mở tab Trang đầu, nhóm Chỉnh sửa, nhấn Chọn để mở danh sách.",
      "Chọn Chọn tất cả để chọn mọi thứ trên trang chiếu, hoặc Chọn đối tượng để chọn chỉ hình, ảnh, hộp văn bản.",
      "Sau khi chọn, kéo để di chuyển, dùng các nút định dạng, hoặc nhấn Delete để xóa các mục đã chọn."
    ]
  }
];

const writerOnly = [
  {
    id: "writer.format.tabStops",
    app: "writer",
    commandIds: ["writer.format.tabStops", "writer.paragraph.tabStops"],
    title: "Dừng tab: căn cột bằng phím Tab, ký tự dẫn chấm hoặc gạch",
    summary: "Đặt vị trí tab riêng (đơn vị cm) cho đoạn văn, căn chữ tại dừng tab theo trái, giữa hoặc phải, và thêm ký tự dẫn (dấu chấm, gạch ngang, gạch dưới). Dùng cho dòng Kính gửi, khối ký tên, danh sách có dấu chấm dẫn đến số liệu.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["dừng tab", "tab stop", "tab stops", "tab", "ký tự dẫn", "dấu chấm dẫn", "căn cột", "leader", "vị trí tab"],
    steps: [
      "Đặt con trỏ trong đoạn (hoặc bôi đen nhiều đoạn) cần đặt dừng tab.",
      "Mở hộp thoại Đoạn văn (nút mũi tên nhỏ ở góc nhóm Đoạn văn, hoặc chuột phải ▸ Đoạn văn…) rồi bấm nút Dừng tab… ở góc dưới bên trái. Các thiết lập đoạn văn bạn vừa chỉnh được áp dụng trước, rồi hộp thoại Dừng tab mở ra.",
      "Nhập Vị trí dừng tab theo cm tính từ lề trái vùng chữ (ví dụ 8), chọn Căn chữ tại dừng tab (Trái, Giữa hoặc Phải) và Ký tự dẫn (Không có, Dấu chấm, Gạch ngang hoặc Gạch dưới), rồi bấm Đặt hoặc Enter. Lặp lại để thêm nhiều dừng tab.",
      "Để sửa: chọn dừng tab trong danh sách Các dừng tab hiện có, đổi giá trị rồi bấm Đặt. Để bỏ: chọn rồi bấm Xóa, hoặc bấm Xóa tất cả. Bấm Đồng ý để áp dụng, Hủy hoặc Esc để thoát mà không đổi.",
      "Trong đoạn, nhấn phím Tab để nhảy tới dừng tab kế tiếp. Dừng tab Phải hay dùng để căn số liệu về mép phải; ký tự dẫn chấm nối nội dung với số liệu như mục lục. Khi lưu .docx, các dừng tab được ghi lại cho tài liệu mở ở phần mềm khác.",
      "Ctrl+Z hoàn tác toàn bộ thay đổi dừng tab chỉ bằng một lần bấm."
    ]
  },  {
    id: "writer.format.paragraphDialog",
    app: "writer",
    commandIds: ["writer.format.paragraphDialog"],
    title: "Hộp thoại Đoạn văn: căn lề, thụt lề, khoảng cách, giãn dòng, ngắt dòng và ngắt trang",
    summary: "Đặt cùng lúc căn lề, thụt lề trái/phải, thụt dòng đầu hoặc treo, khoảng cách trước/sau đoạn, giãn dòng, và các tùy chọn ngắt dòng/ngắt trang (kiểm soát dòng mồ côi/góa, giữ cùng trang với đoạn kế tiếp, giữ các dòng liền nhau, ngắt trang trước) cho các đoạn đang chọn. Một lần Áp dụng là một bước Hoàn tác.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Đoạn văn" },
    keywords: ["đoạn văn", "paragraph", "thụt lề", "thụt dòng đầu", "thụt treo", "giãn dòng", "khoảng cách đoạn", "căn lề", "hộp thoại đoạn văn", "ngắt trang", "giữ cùng trang", "giữ các dòng liền nhau", "dòng mồ côi", "dòng góa", "keep with next", "mức đại cương", "outline level"],
    steps: [
      "Đặt con trỏ trong đoạn (hoặc bôi đen nhiều đoạn) cần chỉnh.",
      "Mở hộp thoại bằng một trong hai cách: bấm nút mũi tên nhỏ ở góc nhóm Đoạn văn (tab Trang đầu hoặc tab Bố cục), hoặc nhấp chuột phải vào đoạn rồi chọn Đoạn văn…",
      "Chọn Căn lề (Trái, Giữa, Phải, Đều hai bên). Nhập Thụt lề trái/phải theo cm. Ở mục Đặc biệt chọn Dòng đầu (thụt riêng dòng đầu) hoặc Treo (các dòng sau thụt vào), rồi nhập Giá trị.",
      "Ở thẻ đầu, chọn Mức đại cương: Mức 1–9 để đoạn xuất hiện trong Khung điều hướng và Mục lục như một tiêu đề (lưu vào tệp DOCX dạng mức đại cương), hoặc Nội dung văn bản cho đoạn thường. Tiêu đề 1–6 tự có mức tương ứng.",
      "Nhập Cách đoạn trước/sau theo pt. Chọn Giãn dòng: Đơn, 1,5 dòng, Kép, Nhiều dòng (nhập hệ số, ví dụ 1,15) hoặc Chính xác (nhập chiều cao dòng theo pt).",
      "Chuyển sang thẻ Ngắt dòng và ngắt trang (bấm vào thẻ hoặc dùng phím mũi tên trái/phải khi đang chọn thẻ). Tích Giữ cùng trang với đoạn kế tiếp cho tiêu đề không bị tách khỏi nội dung; Giữ các dòng liền nhau để đoạn không bị cắt giữa hai trang; Ngắt trang trước để đoạn bắt đầu ở trang mới; Kiểm soát dòng mồ côi/góa (mặc định bật) để không còn một dòng đơn lẻ ở đầu hoặc cuối trang.",
      "Xem khung Xem trước ở dưới, rồi bấm Áp dụng (hoặc Enter). Bấm Hủy hoặc Esc để đóng mà không đổi gì. Nếu giá trị không hợp lệ, hộp thoại báo lý do màu đỏ và chưa áp dụng.",
      "Muốn quay lại: Ctrl+Z hoàn tác toàn bộ thay đổi vừa áp dụng chỉ bằng một lần bấm."
    ]
  }
];

export const GAP_HELP_ENTRIES = [...common, ...sheetOnly, ...slidesOnly, ...writerOnly];
