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
      "Cuối menu còn Đổi tên trang tính..., Di chuyển hoặc Sao chép trang tính... và Bảo vệ trang tính... — xem các bài hướng dẫn riêng.",
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
    id: "sheet.data.whatIfAnalysis",
    app: "sheet",
    commandIds: ["sheet.data.goalSeek", "sheet.data.dataTable", "sheet.data.scenarioManager"],
    title: "Phân tích What-If: Bảng dữ liệu và Kịch bản",
    summary: "Thử nhiều giá trị đầu vào cho một công thức hoặc lưu các bộ giả định có tên để so sánh kết quả mà không phải nhập lại thủ công.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["what-if", "bảng dữ liệu", "data table", "kịch bản", "scenario manager", "giả định"],
    steps: [
      "Mở tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn Phân tích What-If rồi chọn Dò tìm mục tiêu, Bảng dữ liệu hoặc Trình quản lý kịch bản.",
      "Bảng dữ liệu: đặt công thức gốc ở ô góc trên-trái của vùng; đặt các giá trị thử ngang hàng trên và/hoặc dọc cột trái. Bôi toàn bộ vùng, mở Bảng dữ liệu và nhập Ô đầu vào theo hàng, theo cột, hoặc cả hai rồi nhấn Áp dụng.",
      "Với một biến, chỉ nhập đúng một ô đầu vào. Với hai biến, giá trị hàng thay cho Ô đầu vào theo hàng, giá trị cột thay cho Ô đầu vào theo cột; VN Sheet điền kết quả vào phần thân bảng nhưng giữ nguyên công thức gốc.",
      "Trình quản lý kịch bản: nhập Tên, danh sách Các ô thay đổi (ví dụ B2, B3) và cùng số Giá trị; nhấn Thêm. Chọn một kịch bản để Sửa/Xóa hoặc nhấn Hiển thị để ghi bộ giá trị vào các ô thật.",
      "Nhấn Ctrl+Z/Ctrl+Y để hoàn tác/làm lại kết quả Bảng dữ liệu, thao tác quản lý kịch bản hoặc bộ giá trị vừa Hiển thị."
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
    id: "sheet.chart.pivotChart",
    app: "sheet",
    commandIds: ["sheet.chart.pivotChart", "sheet.data.pivotRefresh"],
    title: "Biểu đồ Pivot (PivotChart)",
    summary: "Tạo biểu đồ Cột hoặc Tròn từ kết quả đã tổng hợp của Pivot Table và giữ liên kết để cập nhật khi làm mới Pivot.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Biểu đồ" },
    keywords: ["pivotchart", "biểu đồ pivot", "pivot table", "cột", "tròn", "làm mới"],
    steps: [
      "Tạo Pivot Table trước. Đứng trên trang Pivot; hoặc đứng ở trang dữ liệu nguồn đã có Pivot liên kết rồi mở tab Chèn, nhóm Biểu đồ, nhấn Biểu đồ Pivot cạnh nút Biểu đồ thường.",
      "Trong hộp xem trước, chọn Cột để so sánh các hạng mục hoặc Tròn để xem tỷ trọng, rồi nhấn Chèn vào bảng tính. PivotChart chỉ dùng bảng kết quả đã tổng hợp, không đọc trực tiếp dữ liệu thô.",
      "Khi dữ liệu nguồn thay đổi, mở trang Pivot và vào tab Dữ liệu, nhóm Bảng tổng hợp, nhấn Làm mới Pivot. Bảng và PivotChart liên kết được cập nhật cùng nhau.",
      "Dùng nút × trên góc biểu đồ để xóa. Chèn/xóa PivotChart và Làm mới Pivot đều dùng Ctrl+Z/Ctrl+Y của VN Sheet."
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
  },
  {
    id: "sheet.review.commentNavigation", app: "sheet",
    commandIds: ["sheet.review.commentPrevious", "sheet.review.commentNext", "sheet.review.commentDelete", "sheet.review.commentResolve"],
    title: "Duyệt và xử lý nhận xét ô",
    summary: "Duyệt nhận xét theo thứ tự ô và trang tính, đánh dấu đã xử lý, mở lại hoặc xóa.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Ghi chú" },
    keywords: ["nhận xét", "ghi chú ô", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Đánh giá, nhóm Ghi chú.", "Nhấn Nhận xét trước hoặc Nhận xét sau; VN Sheet chọn ô có ghi chú và tự chuyển sheet khi cần, rồi quay vòng ở cuối danh sách.", "Nhấn Đã xử lý để đổi dấu góc sang màu xám nhưng vẫn giữ ghi chú; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa ghi chú ở ô đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại."]
  },
  {
    id: "sheet.sheet.rename",
    app: "sheet",
    commandIds: ["sheet.sheet.rename"],
    title: "Đổi tên trang tính",
    summary: "Đặt tên mới cho trang tính hiện tại. Tên phải duy nhất trong workbook, tối đa 31 ký tự, không chứa / \\ ? * [ ] :. Công thức dạng 'TênSheet'!A1 được cập nhật theo tên mới.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["đổi tên", "rename sheet", "tên trang tính", "tab sheet", "nhấp đúp"],
    steps: [
      "Mở tab Trang đầu, nhóm Ô, nhấn nút lớn Định dạng, chọn Đổi tên trang tính...",
      "Hoặc nhấp đúp tab trang tính ở thanh dưới lưới, hoặc chuột phải tab rồi chọn Đổi tên trang tính...",
      "Hộp thoại điền sẵn tên hiện tại. Gõ tên mới rồi Đồng ý. Tên trống, trùng, quá 31 ký tự, hoặc chứa / \\ ? * [ ] : sẽ hiện lỗi ngay trong hộp thoại.",
      "VN Sheet đổi khóa mọi dữ liệu theo tên mới và sửa công thức tham chiếu 'TênCũ'!A1 thành 'TênMới'!A1, kể cả named range và nguồn Pivot. Chuỗi chữ trong dấu \"...\" không đổi.",
      "Hoàn tác bằng Ctrl+Z. Thanh tab dưới lưới hiện tên mới ngay."
    ]
  },
  {
    id: "sheet.sheet.moveOrCopy",
    app: "sheet",
    commandIds: ["sheet.sheet.moveOrCopy"],
    title: "Di chuyển hoặc Sao chép trang tính",
    summary: "Đổi thứ tự tab trang tính, hoặc tạo bản sao giống hệt (dữ liệu, định dạng, Page Setup, quy tắc) với tên dạng «Tên gốc (2)» rồi chèn vào vị trí đã chọn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["di chuyển", "sao chép", "move or copy", "duplicate sheet", "đổi thứ tự tab", "bản sao"],
    steps: [
      "Chọn trang tính cần xử lý (bấm tab dưới lưới). Mở tab Trang đầu, nhóm Ô, nhấn Định dạng, chọn Di chuyển hoặc Sao chép trang tính...",
      "Hoặc chuột phải tab trang tính rồi chọn cùng lệnh. Hộp thoại liệt kê các trang tính hiện có.",
      "Ở Chèn trước trang tính, chọn trang sẽ đứng sau vị trí mới, hoặc (chuyển đến cuối) để đặt tab ra sau cùng.",
      "Để nhân bản: đánh dấu Tạo một bản sao rồi Đồng ý. Trang mới tên «Tên gốc (2)» (rồi (3), (4)…) nhận đủ dữ liệu, định dạng, Page Setup, định dạng có điều kiện. Không đánh dấu thì chỉ đổi thứ tự tab.",
      "Hoàn tác thêm bản sao hoặc đổi thứ tự bằng Ctrl+Z."
    ]
  },
  {
    id: "sheet.sheet.protect",
    app: "sheet",
    commandIds: ["sheet.sheet.protect"],
    title: "Bảo vệ trang tính (khóa giao diện)",
    summary: "Khóa sửa nội dung ô, đổi định dạng, chèn/xóa hàng hoặc cột trên trang hiện tại. Có thể đặt mật khẩu tùy chọn lưu dạng chữ thường trong phiên — đây không phải bảo mật thật.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["bảo vệ", "protect sheet", "khóa sheet", "mật khẩu", "unprotect", "bỏ bảo vệ"],
    steps: [
      "Mở tab Trang đầu, nhóm Ô, nhấn Định dạng. Mục cuối là Bảo vệ trang tính... — khi trang đã khóa, cùng mục đổi thành Bỏ bảo vệ trang tính...",
      "Hoặc chuột phải tab trang tính. Hộp thoại có ô «Bảo vệ trang tính và nội dung các ô bị khóa». Có thể nhập mật khẩu rồi nhập lại để xác nhận (để trống nếu không cần).",
      "Khi đã bảo vệ: không gõ vào ô, không F2, không xóa nội dung, không đổi định dạng, không chèn/xóa hàng cột. Tab có ký hiệu khóa. Có thể đổi tên, di chuyển tab, sao chép và chọn ô.",
      "Bỏ bảo vệ: chọn lại cùng mục. Nếu đã đặt mật khẩu, nhập đúng mật khẩu. Sai mật khẩu hiện lỗi trong hộp thoại.",
      "Đây là khóa giao diện giống Excel/LibreOffice tự làm trên máy, mật khẩu không mã hóa, không chống người cố tình sửa file. Trạng thái khóa không đi vào Undo."
    ]
  },
  {
    id: "sheet.workbook.protect",
    app: "sheet",
    commandIds: ["sheet.workbook.protect"],
    title: "Bảo vệ workbook (khóa cấu trúc)",
    summary: "Khóa cấu trúc sổ làm việc: không thêm, xóa, đổi tên, di chuyển hay sao chép trang tính. Khác Bảo vệ trang tính — nội dung ô vẫn sửa được. Có thể đặt mật khẩu tùy chọn lưu dạng chữ thường trong phiên — không phải bảo mật thật.",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Bảo vệ" },
    keywords: ["bảo vệ workbook", "protect workbook", "khóa cấu trúc", "cấu trúc workbook", "unprotect workbook", "bỏ bảo vệ workbook"],
    steps: [
      "Mở tab Xem xét, nhóm Bảo vệ (cạnh Ghi chú). Nhấn Bảo vệ workbook... — khi đã khóa, cùng nút đổi thành Bỏ bảo vệ workbook... Cùng nhóm còn nút Bảo vệ trang tính... (cũng có trong Trang đầu > Ô > Định dạng).",
      "Hộp thoại có ô «Bảo vệ cấu trúc workbook (trang tính)». Có thể nhập mật khẩu rồi nhập lại để xác nhận (để trống nếu không cần).",
      "Khi đã bảo vệ workbook: không thêm trang (nút + dưới lưới bị tắt), không xóa, không đổi tên (kể cả nhấp đúp tab), không di chuyển hay sao chép trang tính. Sửa nội dung ô, định dạng và chèn/xóa hàng cột vẫn được — trừ khi trang đó còn đang Bảo vệ trang tính.",
      "Bỏ bảo vệ: nhấn lại Bỏ bảo vệ workbook... Nếu đã đặt mật khẩu, nhập đúng mật khẩu. Sai mật khẩu hiện lỗi trong hộp thoại.",
      "Đây là khóa giao diện giống Excel, mật khẩu không mã hóa, không chống người cố tình sửa file. Trạng thái khóa không đi vào Undo và không ghi vào FODS."
    ]
  },
  {
    id: "sheet.cell.font",
    app: "sheet",
    commandIds: [
      "sheet.font.family",
      "sheet.font.size",
      "sheet.font.grow",
      "sheet.font.shrink",
      "sheet.cell.bold",
      "sheet.cell.italic",
      "sheet.cell.underline",
      "sheet.cell.borders",
      "sheet.cell.fillColor",
      "sheet.cell.textColor"
    ],
    title: "Định dạng chữ và màu ô",
    summary: "Đổi phông, cỡ chữ, đậm/nghiêng/gạch chân cho ô đang chọn; kẻ viền đậm; tô vàng nền ô hoặc đổi chữ sang đỏ. Áp dụng cho một ô hoặc cả vùng bôi.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["đậm", "nghiêng", "gạch chân", "phông chữ", "cỡ chữ", "màu nền", "màu chữ", "viền ô", "bold", "font", "fill", "border", "ctrl+b"],
    steps: [
      "Chọn ô hoặc bôi vùng. Tab Trang đầu, nhóm Phông chữ: hàng trên là hộp Phông chữ / Cỡ chữ và Tăng/Giảm cỡ; hàng dưới là Đậm, Nghiêng, Gạch chân, Viền ô, Màu nền, Màu chữ.",
      "Phông: Times New Roman, Be Vietnam Pro, Arial, Calibri (mặc định), Roboto. Cỡ: 8, 9, 10, 11 (mặc định), 12, 14, 16, 18, 20, 24, 28, 36, 48, 72. Tăng/Giảm cỡ nhảy theo các nấc đó.",
      "Đậm Ctrl+B, Nghiêng Ctrl+I, Gạch chân Ctrl+U — nhấn lại để tắt. Viền ô kẻ khung 2px xám đậm (#0f172a) cho vùng chọn. Màu nền tô vàng (#FFF200). Màu chữ đổi sang đỏ (#DC2626).",
      "Muốn kiểu số (tiền, %, ngày): dùng nhóm Định dạng số bên phải, hoặc Ctrl+1. Ctrl+Z hoàn tác từng bước định dạng."
    ]
  },
  {
    id: "sheet.cell.alignment",
    app: "sheet",
    commandIds: [
      "sheet.cell.alignTop",
      "sheet.cell.alignMiddle",
      "sheet.cell.alignBottom",
      "sheet.cell.alignLeft",
      "sheet.cell.alignCenter",
      "sheet.cell.alignRight",
      "sheet.cell.wrapText",
      "sheet.cell.indentDecrease",
      "sheet.cell.indentIncrease",
      "sheet.cell.mergeCenter",
      "sheet.cell.mergeAcross",
      "sheet.cell.mergeCells",
      "sheet.cell.unmerge"
    ],
    title: "Căn chỉnh, ngắt dòng và trộn ô",
    summary: "Căn ngang/dọc nội dung trong ô, tự xuống dòng theo độ rộng cột, tăng/giảm thụt lề, và trộn vùng chọn (cả khối, theo hàng, hoặc tách lại). Trộn nhiều ô có dữ liệu sẽ hỏi xác nhận — chỉ giữ ô trên-trái.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Căn chỉnh" },
    keywords: ["căn giữa", "căn trái", "căn phải", "căn trên", "ngắt dòng", "wrap", "thụt lề", "trộn ô", "merge", "unmerge", "hợp nhất"],
    steps: [
      "Chọn ô hoặc vùng. Tab Trang đầu, nhóm Căn chỉnh: hàng trên Căn trên / Căn giữa dọc / Căn dưới; hàng giữa Căn trái / giữa / phải, Ngắt dòng tự động, Giảm/Tăng thụt lề; hàng dưới bốn nút trộn ô.",
      "Ngắt dòng tự động cho chữ dài xuống dòng trong ô và tăng chiều cao hàng. Tăng thụt lề thêm 12 px (tối đa 56 px); Giảm thụt lề hạ dần về 8 px.",
      "Bôi ít nhất 2 ô rồi: Trộn & căn giữa gộp thành một ô và căn giữa; Trộn ô gộp nhưng giữ căn đang có; Trộn theo hàng gộp riêng từng hàng trong vùng. Nếu nhiều ô có dữ liệu, hộp «Trộn ô» cảnh báo chỉ giữ ô trên cùng bên trái — chọn Tiếp tục gộp hoặc Hủy.",
      "Tách ô hoàn tác vùng đã trộn (dữ liệu đã mất khi gộp không tự hiện lại, trừ khi Ctrl+Z ngay). Không trộn đè lên vùng đã trộn sẵn."
    ]
  },
  {
    id: "sheet.data.sortFilter",
    app: "sheet",
    commandIds: ["sheet.data.sortAsc", "sheet.data.sortDesc", "sheet.data.filter"],
    title: "Sắp xếp và bộ lọc",
    summary: "Sắp xếp A–Z hoặc Z–A theo cột đang chọn (ưu tiên đúng vùng bôi). Bộ lọc (Ctrl+Shift+L) hiện nút trên tiêu đề cột để lọc theo giá trị hoặc sắp xếp từ menu cột.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Sắp xếp & Lọc" },
    keywords: ["sắp xếp", "a-z", "z-a", "bộ lọc", "autofilter", "lọc", "sort", "filter", "ctrl+shift+l"],
    steps: [
      "Bôi bảng (gồm hàng tiêu đề nếu có) hoặc đứng trên một ô trong cột khóa. Tab Dữ liệu, nhóm Sắp xếp & Lọc — ba nút lớn: Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc. Cùng lệnh cũng có trên tab Trang đầu, nhóm Chỉnh sửa.",
      "A–Z / Z–A sắp cả hàng theo cột đang chọn. Số so sánh như số; chữ theo locale vi-VN. Hàng «Tổng» (chữ Tổng hoặc công thức SUM) được bỏ qua khi không bôi vùng. Cần ít nhất 2 hàng dữ liệu.",
      "Bộ lọc (Ctrl+Shift+L) bật/tắt AutoFilter: nút lọc hiện trên tiêu đề cột. Nhấn nút cột để mở menu: ▲ Sắp xếp tăng dần, ▼ Sắp xếp giảm dần, rồi danh sách giá trị kèm Tất cả / Bỏ chọn / Áp dụng.",
      "Tắt Bộ lọc gỡ điều kiện và hiện lại mọi hàng đã ẩn vì lọc. Ctrl+Z hoàn tác lần sắp hoặc lần bật/tắt lọc."
    ]
  },
  {
    id: "sheet.data.toolsBasic",
    app: "sheet",
    commandIds: ["sheet.data.textToColumns", "sheet.data.flashFill", "sheet.data.removeDuplicates"],
    title: "Tách văn bản, Điền nhanh và Xóa trùng lặp",
    summary: "Tách một cột theo dấu phẩy/chấm phẩy/khoảng trắng/tab hoặc độ rộng cố định; điền cột kế bên theo mẫu nối/cắt đã gõ ví dụ; xóa hàng trùng theo cột đánh dấu.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["tách văn bản", "text to columns", "điền nhanh", "flash fill", "xóa trùng", "remove duplicates", "dấu phẩy"],
    steps: [
      "Bôi đúng một cột chữ dính nhau (ví dụ «Nam,Hà Nội»). Tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn Tách văn bản. Kiểu tách: Dấu phân cách (phẩy, chấm phẩy, khoảng trắng, Tab, hoặc ký tự tùy chọn) hoặc Độ rộng cố định (nhập các độ rộng cách nhau bằng phẩy, mặc định 5,5). Xem trước rồi Áp dụng. Chỉ chọn một cột — nhiều cột sẽ báo lỗi.",
      "Điền nhanh: cột trái là nguồn, cột đang chọn là kết quả. Gõ 1–2 ô ví dụ (nối hai cột bằng khoảng trắng / dấu - / không dấu, hoặc cắt 1–12 ký tự đầu/cuối), bôi cả cột kết quả rồi nhấn Điền nhanh. Không nhận diện được mẫu thì hộp Kết quả báo «Hãy nhập 1–2 ví dụ…» — không điền bừa.",
      "Xóa trùng lặp: bôi bảng, nhấn Xóa trùng lặp. Đánh dấu «Dữ liệu có hàng tiêu đề», chọn cột dùng để xét trùng, Áp dụng. Hộp Kết quả báo số hàng đã xóa và còn lại. Phải chọn ít nhất một cột.",
      "Cả ba lệnh hoàn tác bằng Ctrl+Z (một bước). Cùng nhóm còn Kiểm tra dữ liệu và Phân tích What-If — xem bài riêng."
    ]
  },
  {
    id: "sheet.data.outline",
    app: "sheet",
    commandIds: ["sheet.data.group", "sheet.data.ungroup", "sheet.data.subtotal"],
    title: "Nhóm hàng/cột và Tổng phụ",
    summary: "Nhóm các hàng hoặc cột liên tiếp đang chọn (nút − / + trên tiêu đề để thu/mở). Tổng phụ chèn hàng SUM/COUNT/AVERAGE mỗi khi khóa nhóm đổi, rồi hàng Grand Total — cần sắp xếp trước theo cột nhóm.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Dàn bài" },
    keywords: ["nhóm", "bỏ nhóm", "group", "ungroup", "tổng phụ", "subtotal", "dàn bài", "outline", "grand total"],
    steps: [
      "Chọn nguyên hàng (bấm số hàng rồi kéo) hoặc nguyên cột (bấm chữ cột). Tab Dữ liệu, nhóm Dàn bài, nhấn Nhóm. Nút − hiện trên tiêu đề nhóm; nhấn để thu (đổi thành +). Bỏ nhóm gỡ nhóm chồng lên vùng đang chọn.",
      "Không chọn trọn hàng hoặc trọn cột thì Nhóm không chạy. Không tạo trùng một nhóm cùng biên.",
      "Tổng phụ: bôi bảng đã có hàng tiêu đề, nên Sắp xếp A–Z theo cột nhóm trước. Nhấn Tổng phụ. «Mỗi khi thay đổi ở»: chọn cột khóa. Hàm: SUM, COUNT hoặc AVERAGE. «Cộng tổng vào»: đánh dấu các cột số. Áp dụng chèn hàng «… Total» mỗi nhóm và «Grand Total» cuối.",
      "Nếu chưa sắp xếp, mỗi đoạn khóa liên tiếp được coi là một nhóm riêng. Ctrl+Z gỡ cả lần nhóm hoặc cả khối tổng phụ vừa chèn."
    ]
  },
  {
    id: "sheet.view.workbookViews",
    app: "sheet",
    commandIds: ["sheet.view.normal", "sheet.view.pageBreakPreview", "sheet.view.pageLayout"],
    title: "Chế độ xem bảng tính",
    summary: "Bình thường là lưới soạn thảo. Xem ngắt trang hiện đường chia trang và làm mờ vùng ngoài khổ in. Bố trí trang xem như tờ giấy, có dải đầu trang 3 ngăn.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Chế độ xem bảng tính" },
    keywords: ["bình thường", "xem ngắt trang", "bố trí trang", "page break preview", "page layout", "normal view", "trang in"],
    steps: [
      "Tab Chế độ xem, nhóm Chế độ xem bảng tính — ba nút lớn: Bình thường, Xem ngắt trang, Bố trí trang.",
      "Bình thường: lưới ô tiêu chuẩn để nhập liệu. Đây là mặc định.",
      "Xem ngắt trang: đường chia trang xanh đậm, vùng ngoài khổ in bị phủ tối, số «Trang 1» mờ trên nền. Dùng để chỉnh chỗ ngắt trước khi in (tab Bố trí trang, nhóm Ngắt trang).",
      "Bố trí trang: xem như giấy in, có dải đầu trang 3 ngăn. Không đổi dữ liệu ô. Quay lại Bình thường bất cứ lúc nào."
    ]
  },
  {
    id: "sheet.view.show",
    app: "sheet",
    commandIds: ["sheet.view.formulaBar", "sheet.view.gridlines", "sheet.view.headings"],
    title: "Hiện thanh công thức, đường lưới và tiêu đề",
    summary: "Ba nút bật/tắt trên nhóm Hiển thị: ẩn thanh công thức để lấy chỗ lưới; ẩn đường kẻ ô; ẩn chữ cột A, B, C… và số hàng 1, 2, 3…",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["thanh công thức", "đường lưới", "tiêu đề hàng cột", "gridlines", "headings", "formula bar", "ẩn lưới"],
    steps: [
      "Tab Chế độ xem, nhóm Hiển thị. Thanh công thức, Đường lưới, Tiêu đề đều là nút bật/tắt (nhấn lại để hiện).",
      "Ẩn Thanh công thức thu gọn khoảng trên lưới — tiện màn hình thấp. Vẫn sửa ô bằng F2 hoặc nhấp đúp.",
      "Đường lưới ẩn kẻ ô trên màn hình (không đổi viền đã định dạng). Tiêu đề ẩn A, B, C và 1, 2, 3 — chọn ô bằng chuột trên lưới vẫn được.",
      "Ba tùy chọn chỉ đổi hiển thị, không đổi dữ liệu hay file."
    ]
  },
  {
    id: "sheet.view.zoom",
    app: "sheet",
    commandIds: ["sheet.view.zoomIn", "sheet.view.zoomOut", "sheet.view.zoomReset"],
    title: "Thu phóng bảng tính",
    summary: "Phóng to / thu nhỏ lưới theo bước 10% trong khoảng 50%–200%. Nút 100% đặt lại tỉ lệ gốc. Chỉ đổi hiển thị, không đổi kích thước ô khi in.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Thu phóng" },
    keywords: ["thu phóng", "phóng to", "thu nhỏ", "zoom", "100%", "tỉ lệ lưới"],
    steps: [
      "Tab Chế độ xem, nhóm Thu phóng. Phóng to (nút lớn) tăng 10%; Thu nhỏ giảm 10%; 100% về tỉ lệ 1:1. Giới hạn 50%–200%.",
      "Cùng nhóm còn Vừa vùng chọn — co giãn để vừa khung nhìn với ô/vùng đang bôi (cũng kẹp 50%–200%).",
      "Zoom dùng phóng CSS trên bảng, tọa độ ô logic không đổi. In và khổ giấy vẫn theo tab Bố trí trang."
    ]
  },
  {
    id: "sheet.cells.insertDelete",
    app: "sheet",
    commandIds: ["sheet.row.insert", "sheet.col.insert", "sheet.row.delete", "sheet.col.delete"],
    title: "Chèn và xóa hàng, cột",
    summary: "Chèn hàng tại hàng đang chọn (dữ liệu bên dưới dịch xuống); chèn cột tại cột đang chọn (dữ liệu bên phải dịch sang). Xóa hàng/cột chứa ô đang chọn. Công thức A1 trên cùng sheet được dịch theo.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["chèn hàng", "chèn cột", "xóa hàng", "xóa cột", "insert row", "insert column", "ctrl+shift+=", "dịch ô"],
    steps: [
      "Chọn một ô (hoặc bấm số hàng / chữ cột). Tab Trang đầu, nhóm Ô: cột trái Chèn hàng / Chèn cột; cột giữa Xóa hàng / Xóa cột. Chèn hàng còn phím Ctrl+Shift+=.",
      "Chèn hàng: hàng mới trống ngay tại vị trí chọn; hàng cũ và ghi chú / quy tắc định dạng / kiểm tra dữ liệu / vùng in / ngắt trang dịch xuống. Công thức cùng sheet dạng A1 được sửa theo.",
      "Chèn cột tương tự, dịch sang phải; tiêu đề cột cuối tăng (ví dụ Z → AA). Xóa hàng/cột làm ngược lại — mất dữ liệu trên hàng/cột đó.",
      "Chuột phải tiêu đề hàng/cột cũng có Xóa hàng. Ctrl+Z hoàn tác cả khối dịch chuyển. Named range, nguồn biểu đồ và nguồn Pivot chưa tự dịch khi chèn."
    ]
  },
  {
    id: "sheet.insert.image",
    app: "sheet",
    commandIds: ["sheet.insert.image"],
    title: "Chèn ảnh vào ô",
    summary: "Mở hộp chọn tệp ảnh trên máy rồi gắn ảnh vào ô đang chọn. Ảnh nằm trong ô, không phải lớp nổi độc lập.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["chèn ảnh", "hình ảnh", "image", "picture", "minh họa", "ảnh ô"],
    steps: [
      "Chọn ô đích. Tab Chèn, nhóm Minh họa, nhấn nút lớn Chèn ảnh.",
      "Chọn file ảnh trên máy rồi Mở. Ảnh được gắn vào ô đang chọn.",
      "Cùng tab Chèn còn Biểu đồ (biểu đồ lớn) và Biểu đồ thu nhỏ (sparkline trong ô) — khác với ảnh.",
      "Ctrl+Z gỡ ảnh vừa chèn."
    ]
  },
  {
    id: "sheet.insert.hyperlink",
    app: "sheet",
    commandIds: ["sheet.insert.hyperlink"],
    title: "Chèn liên kết vào ô",
    summary: "Gắn URL http(s) hoặc mailto: vào ô đang chọn. Ô trống sẽ hiện chính địa chỉ; ô đã có chữ giữ nguyên chữ và trở thành liên kết. Phím tắt chung Ctrl+K.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["liên kết", "hyperlink", "url", "ctrl+k", "mailto", "chèn link"],
    steps: [
      "Chọn ô. Tab Chèn, nhóm Liên kết, nhấn Liên kết — hoặc Ctrl+K (lệnh dùng chung common.edit.hyperlink, Sheet chuyển vào cùng hộp).",
      "Hộp «Chèn liên kết»: nhập địa chỉ bắt đầu bằng https://, http:// hoặc mailto:. Mặc định gợi ý https://. Xác nhận.",
      "Địa chỉ không hợp lệ (thiếu http/mailto) bị từ chối, không ghi vào ô. Ô trống nhận luôn URL làm chữ hiển thị.",
      "Ctrl+Z gỡ liên kết vừa gắn."
    ]
  },
  {
    id: "sheet.insert.textbox",
    app: "sheet",
    commandIds: ["sheet.insert.textbox"],
    title: "Chèn hộp văn bản nổi",
    summary: "Hộp chữ nổi neo theo ô đang chọn, gõ được, kéo góc trình duyệt để đổi cỡ. Không xoay, không kéo đổi vị trí độc lập — vị trí theo ô neo.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["hộp văn bản", "textbox", "chú thích nổi", "khung chữ", "ghi chú ô"],
    steps: [
      "Chọn ô neo (góc trên-trái hộp sẽ bám ô này). Tab Chèn, nhóm Văn bản, nhấn Hộp văn bản.",
      "Hộp «Chèn hộp văn bản» hỏi nội dung. Nhập chữ rồi xác nhận. Hộp trắng, viền xám, tối thiểu khoảng 180×54 px, hiện trên lớp nổi của sheet.",
      "Nhấp vào hộp để sửa chữ. Kéo góc (resize trình duyệt) để đổi cỡ. Xóa hộp bằng hoàn tác Ctrl+Z ngay sau khi chèn.",
      "Mỗi trang tính có danh sách hộp riêng. Hộp không đi cùng khi in như một đối tượng Excel đầy đủ — dùng cho chú thích trên màn hình."
    ]
  },
  {
    id: "sheet.insert.dateTime",
    app: "sheet",
    commandIds: ["sheet.insert.date", "sheet.insert.time"],
    title: "Chèn ngày và giờ hiện tại",
    summary: "Hai lệnh bàn phím, không có nút riêng trên ribbon: Ctrl+; ghi ngày hôm nay dạng dd/MM/yyyy vào ô đang chọn; Ctrl+Shift+; ghi giờ hiện tại dạng HH:mm:ss.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chèn ngày", "chèn giờ", "ctrl+;", "hôm nay", "today", "now", "dd/mm/yyyy", "giờ hiện tại"],
    steps: [
      "Chọn ô trống (hoặc ô muốn ghi đè). Không có nút Ngày/Giờ trên ribbon Sheet — dùng phím tắt.",
      "Ctrl+; (Ctrl và phím chấm phẩy) chèn ngày máy tính, ví dụ 06/09/2026. Đây là chữ/ngày tĩnh, không tự đổi ngày mai.",
      "Ctrl+Shift+; chèn giờ máy tính, ví dụ 14:05:09, đồng thời hiện trên thanh công thức.",
      "Muốn hiển thị kiểu Ngày trong Định dạng số: bôi ô rồi tab Trang đầu → Định dạng số → Ngày, hoặc Ctrl+1. Ctrl+Z xóa giá trị vừa chèn."
    ]
  }
];

registerHelpEntries(SHEET_HELP_ENTRIES);
