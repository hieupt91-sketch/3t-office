/**
 * Hướng dẫn sử dụng VN Sheet — nội dung tiếng Việt thật, khớp UI hiện có.
 * Tự đăng ký vào catalog dùng chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const SHEET_HELP_ENTRIES = [
  {
    id: "sheet.formula.basic",
    app: "sheet",
    commandIds: [
      "sheet.formula.insertFunction",
      "sheet.formula.sum",
      "sheet.formula.average",
      "sheet.formula.countNumbers",
      "sheet.formula.max",
      "sheet.formula.min"
    ],
    title: "Công thức và hàm cơ bản",
    summary: "Nhập công thức bắt đầu bằng dấu = trên thanh công thức, chèn hàm từ hộp thoại fx, hoặc dùng AutoSum cho SUM/AVERAGE/COUNT/MAX/MIN. Gợi ý hàm hiện khi gõ tên hàm sau dấu =.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["công thức", "formula", "hàm", "fx", "autosum", "sum", "average", "thanh công thức", "chèn hàm"],
    steps: [
      "Chọn ô kết quả. Trên thanh công thức (dưới ribbon) gõ dấu = rồi tên hàm, ví dụ =SUM(A1:A10) hoặc =AVERAGE(B2:B8). Danh sách gợi ý hiện khi gõ; chọn hàm rồi Enter.",
      "Cách khác: mở tab Công thức, nhóm Hàm tính toán, nhấn Chèn hàm (hoặc Shift+F3, hoặc nút fx trên thanh công thức). Chọn danh mục (Toán học, Logic, Văn bản, Ngày & Giờ, Tài chính, Tra cứu…), chọn hàm rồi nhấn Chèn hàm vào ô.",
      "Muốn tổng nhanh: chọn ô ngay dưới (hoặc bên phải) dải số, nhấn AutoSum trên tab Công thức hoặc tab Trang đầu nhóm Chỉnh sửa (Alt+=). AVERAGE / Đếm số / Lớn nhất / Nhỏ nhất nằm cạnh đó.",
      "Nhấn Enter hoặc nút ✓ trên thanh công thức để xác nhận. Esc hoặc nút ✕ hủy bản đang soạn. Ctrl+Shift+Enter nhập công thức mảng cho vùng đã chọn.",
      "Nút Chèn hàm trên tab Công thức còn các nhóm Tài chính, Logic, Văn bản, Ngày & Giờ, Tra cứu & Tham chiếu, Toán & Lượng giác — mỗi nút mở cùng hộp thoại fx đã lọc sẵn danh mục."
    ]
  },
  {
    id: "sheet.format.number",
    app: "sheet",
    commandIds: [
      "sheet.format.quickCategory",
      "sheet.format.currencyVND",
      "sheet.format.percent",
      "sheet.format.standard",
      "sheet.format.increaseDecimal",
      "sheet.format.decreaseDecimal"
    ],
    title: "Định dạng số",
    summary: "Đổi cách hiển thị số trên ô đang chọn: Chung, Số, Tiền tệ, Kế toán, Ngày, Phần trăm, Khoa học hoặc Văn bản. Có nút tắt VNĐ, phần trăm, phân cách hàng nghìn và tăng/giảm số thập phân.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Định dạng số" },
    keywords: ["định dạng số", "number format", "vnđ", "phần trăm", "phần trăm", "hàng nghìn", "thập phân", "tiền tệ"],
    steps: [
      "Chọn một hoặc nhiều ô số. Mở tab Trang đầu, nhóm Định dạng số (bên phải nhóm Căn chỉnh).",
      "Dùng hộp chọn nhanh: Chung, Số, Tiền tệ, Kế toán, Ngày, Phần trăm, Khoa học, Văn bản. Ngày dùng dạng dd/mm/yyyy; Văn bản căn trái và không tính toán.",
      "Nút tắt trên hàng dưới: Tiền tệ VNĐ (Ctrl+Shift+4), Phần trăm (Ctrl+Shift+5), Phân cách hàng nghìn (Ctrl+Shift+1), Tăng/Giảm số thập phân.",
      "Muốn chỉnh số chữ số thập phân, ký hiệu tiền, kiểu số âm hoặc mẫu tùy chỉnh: nhấn nút Định dạng ô... trong cùng nhóm, hoặc Ctrl+1, hoặc mũi tên nhỏ góc nhóm (launcher)."
    ]
  },
  {
    id: "sheet.format.cellsDialog",
    app: "sheet",
    commandIds: ["sheet.format.cellsDialog"],
    title: "Định dạng ô (Format Cells)",
    summary: "Hộp thoại đầy đủ để chọn loại số, số thập phân, dấu phân cách hàng nghìn, ký hiệu tiền (₫), kiểu ngày, khoa học, văn bản hoặc mẫu tùy chỉnh. Áp dụng cho vùng đang chọn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Định dạng số" },
    keywords: ["định dạng ô", "format cells", "ctrl+1", "số thập phân", "tiền tệ", "ngày tháng", "tùy chỉnh"],
    steps: [
      "Chọn ô hoặc vùng cần đổi. Nhấn Ctrl+1, hoặc tab Trang đầu → nhóm Định dạng số → nút Định dạng ô..., hoặc mũi tên nhỏ góc phải nhóm.",
      "Hộp thoại liệt kê danh mục bên trái: Chung (General), Số (Number), Tiền tệ (Currency), Kế toán (Accounting), Ngày tháng (Date), Phần trăm (Percentage), Khoa học (Scientific), Văn bản (Text), Tùy chỉnh (Custom).",
      "Với Số/Tiền tệ: chỉnh số chữ số thập phân, bật dấu phân cách hàng nghìn, chọn kiểu số âm. Tiền tệ có ký hiệu ₫. Ngày có mẫu dd/mm/yyyy. Tùy chỉnh cho phép nhập pattern như 0.00.",
      "Xem trước giá trị mẫu ở hộp thoại, rồi nhấn OK để áp dụng cho vùng chọn. Esc hoặc Đóng để hủy. Hoàn tác bằng Ctrl+Z."
    ]
  },
  {
    id: "sheet.cells.format",
    app: "sheet",
    commandIds: [
      "sheet.row.height",
      "sheet.row.autoFit",
      "sheet.col.width",
      "sheet.col.autoFit",
      "sheet.row.hide",
      "sheet.row.unhide",
      "sheet.col.hide",
      "sheet.col.unhide"
    ],
    title: "Định dạng hàng và cột",
    summary: "Menu Định dạng trên nhóm Ô đặt chiều cao hàng / độ rộng cột theo pixel, tự vừa nội dung, hoặc ẩn/hiện hàng và cột đang chọn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["định dạng", "chiều cao hàng", "độ rộng cột", "ẩn hàng", "ẩn cột", "unhide", "row height", "column width", "format dropdown"],
    steps: [
      "Chọn các hàng (bấm số hàng) hoặc cột (bấm chữ cột), hoặc chọn ô trong hàng/cột cần chỉnh.",
      "Mở tab Trang đầu, nhóm Ô (bên phải Kiểu ô). Nhấn nút lớn Định dạng để mở menu.",
      "Chiều cao hàng... / Độ rộng cột... hiện hộp thoại nhập số pixel rồi OK. Tự động vừa chiều cao hàng / Tự động vừa độ rộng cột co giãn theo nội dung.",
      "Ẩn hàng / Ẩn cột giấu các hàng hoặc cột đang chọn. Để hiện lại: bôi vùng gồm cả hàng/cột đã ẩn rồi chọn Hiện hàng hoặc Hiện cột trong cùng menu.",
      "Cùng nhóm Ô còn Chèn hàng, Chèn cột, Xóa hàng, Xóa cột — không nằm trong menu Định dạng."
    ]
  },
  {
    id: "sheet.data.pivotTable",
    app: "sheet",
    commandIds: ["sheet.data.pivotTable", "sheet.data.pivotRefresh"],
    title: "Bảng tổng hợp (Pivot Table)",
    summary: "Tạo trang tính mới chứa bảng tổng hợp từ vùng dữ liệu có hàng tiêu đề. Kéo trường vào Rows / Columns / Values với SUM, COUNT, AVERAGE, MIN hoặc MAX. Làm mới khi nguồn đổi.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Bảng tổng hợp" },
    keywords: ["pivot", "bảng tổng hợp", "pivot table", "tổng hợp", "rows", "values", "làm mới"],
    steps: [
      "Chuẩn bị bảng nguồn: hàng đầu là tiêu đề cột duy nhất, các hàng dưới là dữ liệu. Bôi vùng (ví dụ A1:D20).",
      "Mở tab Dữ liệu, nhóm Bảng tổng hợp, nhấn Bảng tổng hợp.",
      "Hộp thoại Tạo Bảng tổng hợp điền sẵn vùng nguồn. Nhấn Đọc tên cột, rồi với mỗi trường đánh dấu Rows, Columns và/hoặc Values. Cột Values chọn phép SUM / COUNT / AVERAGE / MIN / MAX.",
      "Nhấn Tạo Pivot Table. VN Sheet tạo trang mới tên dạng «TênSheet (2)» và ghi bảng tổng hợp bắt đầu từ A1.",
      "Khi sửa dữ liệu nguồn, mở trang Pivot rồi nhấn Làm mới Pivot trên cùng nhóm để tính lại. Hoàn tác bằng Ctrl+Z."
    ]
  },
  {
    id: "sheet.format.conditional",
    app: "sheet",
    commandIds: ["sheet.format.conditional"],
    title: "Định dạng có điều kiện",
    summary: "Tô màu nền các ô trong vùng chọn khi giá trị lớn hơn một số, nhỏ hơn một số, hoặc ô trống. Màu chọn bằng bảng màu trong hộp thoại.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
    keywords: ["định dạng có điều kiện", "conditional formatting", "tô màu", "quy tắc", "ô trống", "lớn hơn"],
    steps: [
      "Bôi vùng cần tô nổi (ví dụ cột điểm). Tab Trang đầu, nhóm Kiểu ô, nhấn nút lớn Định dạng có điều kiện.",
      "Hộp thoại hiện Phạm vi đang chọn. Chọn Quy tắc: Giá trị lớn hơn, Giá trị nhỏ hơn, hoặc Ô trống.",
      "Với lớn hơn / nhỏ hơn: nhập ngưỡng ở ô Giá trị. Chọn Màu nền bằng bảng màu (mặc định vàng nhạt).",
      "Nhấn Áp dụng. Các ô khớp quy tắc được tô ngay. Ô trống chỉ cần chọn quy tắc Ô trống, không nhập số.",
      "Cùng nhóm Kiểu ô còn Định dạng bảng (màu xen kẽ) và Kiểu ô (Normal, Good, Bad, Neutral…) — khác với quy tắc có điều kiện."
    ]
  },
  {
    id: "sheet.data.validation",
    app: "sheet",
    commandIds: ["sheet.data.validation"],
    title: "Kiểm tra dữ liệu",
    summary: "Giới hạn giá trị nhập: danh sách xổ xuống (các mục cách nhau bằng dấu phẩy) hoặc số trong khoảng tối thiểu–tối đa. Ô có danh sách hiện mũi tên chọn.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["kiểm tra dữ liệu", "data validation", "danh sách", "dropdown", "khoảng số", "chọn giá trị"],
    steps: [
      "Bôi các ô cần giới hạn. Mở tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn Kiểm tra dữ liệu (cột giữa, dưới Điền nhanh / Xóa trùng lặp).",
      "Cho phép: chọn Danh sách lựa chọn hoặc Số trong khoảng.",
      "Danh sách: nhập các giá trị cách nhau bằng dấu phẩy, ví dụ Đạt, Chưa đạt, Đang xử lý. Số trong khoảng: điền Tối thiểu và Tối đa.",
      "Nhấn Áp dụng. Ô danh sách có mũi tên; bấm để chọn. Ô số ngoài khoảng sẽ bị từ chối khi nhập.",
      "Cùng nhóm còn Tách văn bản, Điền nhanh, Xóa trùng lặp và Dò tìm mục tiêu."
    ]
  },
  {
    id: "sheet.data.goalSeek",
    app: "sheet",
    commandIds: ["sheet.data.goalSeek"],
    title: "Dò tìm mục tiêu (Goal Seek)",
    summary: "Tìm giá trị của một ô đầu vào để công thức ở ô khác đạt đúng số đích. Hữu ích cho bài toán «cần bao nhiêu thì tổng/PMT bằng X».",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["dò tìm mục tiêu", "goal seek", "đặt ô", "giá trị đích", "what-if", "đổi ô"],
    steps: [
      "Ô đặt phải chứa công thức phụ thuộc ô sẽ đổi (ví dụ B1 = A1*1.1). Chọn ô công thức rồi mở tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn nút lớn Dò tìm mục tiêu.",
      "Ô đặt: địa chỉ ô công thức (điền sẵn ô đang chọn). Đến giá trị: số đích cần đạt. Bằng cách đổi ô: ô đầu vào không chứa công thức, ví dụ A1.",
      "Nhấn Tìm kết quả. Nếu tìm được, hộp thoại hiện giá trị đề xuất và sai số; các ô nhập bị khóa. Nhấn OK để ghi giá trị vào ô đổi.",
      "Nếu không tìm được (công thức không phụ thuộc ô đổi, hoặc không hội tụ), dòng lỗi hiện ngay trong hộp thoại — sửa địa chỉ rồi thử lại. Ctrl+Z hoàn tác giá trị đã áp dụng."
    ]
  },
  {
    id: "sheet.edit.formatPainter",
    app: "sheet",
    commandIds: ["sheet.edit.formatPainter"],
    title: "Sao chép định dạng",
    summary: "Copy kiểu ô (phông, màu, căn, định dạng số, viền…) từ ô nguồn sang ô hoặc vùng đích. Nhấp đúp để khóa và quét nhiều lần; Esc hủy.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["sao chép định dạng", "format painter", "cọ vẽ", "copy format", "kiểu ô"],
    steps: [
      "Chọn ô đã có định dạng nguồn. Tab Trang đầu, nhóm Bảng nhớ tạm, nhấn Sao chép định dạng (nút cọ nhỏ cạnh Dán đặc biệt). Con trỏ lưới đổi thành cọ.",
      "Bấm một ô đích, hoặc kéo bôi một vùng, để dán đúng kiểu nguồn (không copy giá trị hay công thức).",
      "Nhấp đúp nút Sao chép định dạng để khóa: tiếp tục bấm nhiều vùng. Esc hoặc nhấn lại nút để tắt.",
      "Nút này là lệnh riêng của Sheet (sheet.edit.formatPainter), không dùng chung nút Format Painter của Writer."
    ]
  },
  {
    id: "sheet.chart.insert",
    app: "sheet",
    commandIds: ["sheet.chart.insert"],
    title: "Chèn biểu đồ",
    summary: "Vẽ biểu đồ Cột, Đường, Tròn hoặc Miền từ vùng đang chọn. Cột nhãn + cột số; hộp thoại xem trước SVG rồi chèn vào trang tính.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Biểu đồ" },
    keywords: ["biểu đồ", "chart", "cột", "đường", "tròn", "miền", "pie", "bar"],
    steps: [
      "Bôi vùng dữ liệu: thường cột nhãn (chữ) kèm cột số, có thể gồm hàng tiêu đề. Vùng không có số sẽ báo lỗi.",
      "Mở tab Chèn, nhóm Biểu đồ, nhấn nút lớn Biểu đồ.",
      "Hộp thoại Chèn biểu đồ từ «vùng» có bốn kiểu: Cột, Đường, Tròn, Miền. Chọn kiểu để xem trước. Biểu đồ tròn cần giá trị dương.",
      "Nhấn Chèn vào bảng tính. Biểu đồ nằm trên lưới, dùng dữ liệu của vùng đã chọn. Đổi số trong vùng nguồn rồi biểu đồ cập nhật theo dữ liệu sheet.",
      "Cùng tab Chèn còn Biểu đồ thu nhỏ (Đường / Cột sparkline) — đó là mini-chart trong ô, khác biểu đồ lớn này."
    ]
  },
  {
    id: "sheet.view.freezePanes",
    app: "sheet",
    commandIds: ["sheet.view.freezePanes"],
    title: "Cố định hàng/cột (Freeze Panes)",
    summary: "Giữ hàng 1 và cột A luôn nhìn thấy khi cuộn trang tính. Bật/tắt bằng một nút trên tab Chế độ xem; trạng thái được nhớ theo từng sheet.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Cửa sổ" },
    keywords: ["cố định", "freeze panes", "đóng băng", "hàng 1", "cột A", "cuộn"],
    steps: [
      "Mở tab Chế độ xem, nhóm Cửa sổ (cạnh Thu phóng).",
      "Nhấn Cố định hàng/cột. Hàng tiêu đề (hàng 1) và cột A được giữ khi cuộn ngang/dọc. Nút ở trạng thái đang bật.",
      "Nhấn lại cùng nút để bỏ cố định. Ctrl+Z / Ctrl+Y hoàn tác hoặc làm lại thao tác freeze.",
      "Mỗi trang tính nhớ riêng trạng thái cố định. Lệnh này cố định đúng hàng 1 và cột A — không freeze theo ô đang chọn như một số bản Excel."
    ]
  },
  {
    id: "sheet.page.setupRound2", app: "sheet",
    commandIds: ["sheet.page.scale", "sheet.page.headerFooter", "sheet.page.margins", "sheet.page.printTitles"],
    title: "Thiết lập trang in nâng cao",
    summary: "Thu bảng tính vừa số trang mong muốn, thêm đầu/cuối trang động, căn giữa nội dung và chọn in đường kẻ hoặc tiêu đề hàng/cột.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["tỷ lệ", "vừa trang", "scale", "đầu trang", "cuối trang", "đường kẻ", "tiêu đề hàng cột", "in"],
    steps: [
      "Mở tab Bố trí trang, nhóm Thiết lập trang.",
      "Nhấn Tỷ lệ vừa trang. Chọn Vừa theo tỷ lệ và nhập 10–400%, hoặc chọn Vừa trong rồi nhập số trang ngang và dọc; nhập 0 cho chiều muốn để tự động.",
      "Trong cùng hộp thoại, đánh dấu Theo chiều ngang hoặc Theo chiều dọc ở mục Căn giữa trang khi in.",
      "Đánh dấu In đường kẻ ô hoặc In tiêu đề hàng và cột nếu cần chúng xuất hiện trên giấy/PDF, rồi nhấn Áp dụng.",
      "Để tạo đầu/cuối trang, nhấn Tiêu đề Đầu/Cuối trang. Chọn mẫu Trang X, Tên sheet, Ngày hoặc nhập ba vùng Trái/Giữa/Phải.",
      "Trong ô tùy chỉnh có thể chèn &P (số trang), &N (tổng trang), &D (ngày), &T (giờ), &F (tên file), &A (tên sheet), rồi nhấn Áp dụng. Các thiết lập chỉ áp dụng cho sheet hiện tại và có thể hoàn tác bằng Ctrl+Z."
    ]
  }
];

registerHelpEntries(SHEET_HELP_ENTRIES);
