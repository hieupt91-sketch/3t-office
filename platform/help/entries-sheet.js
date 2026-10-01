/**
 * Hướng dẫn sử dụng 3T Sheet — nội dung tiếng Việt thật, khớp UI hiện có.
 * Tự đăng ký vào catalog dùng chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const SHEET_HELP_ENTRIES = [
  {
    id: "sheet.input.nativeValues",
    app: "sheet",
    commandIds: [],
    title: "Nhập số và ngày để công thức tính đúng",
    summary: "Số gõ hoặc dán vào ô được lưu dưới dạng số; ngày dd/mm/yyyy được lưu dưới dạng số ngày kèm định dạng ngày. Vì vậy SUM, COUNT, sắp xếp và chuỗi Điền tự động tiếp tục tính đúng sau khi lưu XLSX.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Số" },
    keywords: ["nhập số", "ngày", "date serial", "SUM", "COUNT", "dán số", "điền chuỗi", "apostrophe", "xlsx"],
    steps: [
      "Chọn một ô rồi gõ số, ví dụ 123 hoặc 12,5, và nhấn Enter. Có thể dán một cột số từ ứng dụng khác; Sheet tự nhận kiểu số để công thức SUM/COUNT dùng được.",
      "Để nhập ngày, gõ theo dạng dd/mm/yyyy, ví dụ 30/01/2026. Ô tự nhận định dạng ngày; kéo chốt Điền ở góc dưới phải để tiếp tục 31/01/2026, 01/02/2026…",
      "Để nhập phần trăm vào ô thường, gõ 25% rồi nhấn Enter. Ô hiển thị 25% và lưu số 0,25 để SUM tính đúng; Ctrl+Z hoàn tác cả giá trị lẫn định dạng phần trăm.",
      "Muốn giữ nguyên chữ số dưới dạng văn bản (ví dụ mã 00123), gõ dấu nháy đơn trước nội dung: '00123. Dấu nháy không hiển thị trong ô nhưng ngăn chuyển thành số.",
      "Dùng tab Trang đầu, nhóm Số để đổi định dạng hiển thị như Số, Tiền tệ, Phần trăm hoặc Ngày. Định dạng chỉ đổi cách hiển thị, không biến số thành văn bản.",
      "Khi lưu .xlsx rồi mở bằng phần mềm bảng tính khác, số vẫn là giá trị số và ngày vẫn là số ngày có định dạng; công thức SUM/COUNT không bỏ qua các ô vừa nhập hoặc dán."
    ]
  },
  {
    id: "sheet.file.basics",
    app: "sheet",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.close", "common.file.print"],
    title: "Tạo, mở, lưu và in sổ làm việc",
    summary: "Sổ mới bắt đầu với một trang tính Sheet1 trống tại ô A1. Dùng Tệp để mở hoặc lưu XLSX, XLS, ODS, CSV; Ctrl+P mở bản xem trước in.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Sổ làm việc" },
    keywords: ["tạo mới", "mở tệp", "lưu", "lưu thành", "in", "phạm vi sổ làm việc", "trang tính hiện hoạt", "toàn bộ sổ làm việc", "in vùng chọn", "Ctrl+N", "Ctrl+O", "Ctrl+S", "F12", "Ctrl+P", "Sheet1", "cửa sổ riêng", "mở nhiều cửa sổ", "Explorer"],
    steps: [
      "Tạo sổ trống: nhấn Ctrl+N hoặc mở Tệp > Mới. Một cửa sổ mới tên Bảng tính 2, Bảng tính 3… xuất hiện với duy nhất Sheet1, ô A1 đang chọn và chưa có dữ liệu. Trong Desktop, khi Sheet đang mở, nhấp đúp thêm tệp XLSX/XLS/ODS/CSV trong Explorer hoặc bấm lại shortcut Sheet ở Start sẽ mở thêm cửa sổ trong cùng tiến trình. Mỗi cửa sổ có sổ làm việc, trạng thái sửa, lệnh Lưu và lời nhắc Đóng riêng; cửa sổ cuối cùng mới kết thúc ứng dụng.",
      "Mở sổ: nhấn Ctrl+O hoặc chọn Tệp > Mở, chọn XLSX, XLS, ODS hoặc CSV. Nếu sổ hiện tại có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi chọn tệp; Hủy thao tác mở sẽ giữ sổ hiện tại.",
      "Lưu: Ctrl+S mở hộp thoại Lưu thành cho sổ mới. Với tệp đã mở/lưu, Ctrl+S giữ nguyên định dạng hiện tại. Dùng F12 hoặc Ctrl+Shift+S để lưu tên/định dạng khác; xác nhận ghi đè khi được hỏi. Chọn PDF trong Lưu thành chỉ xuất một bản PDF; tệp đang mở vẫn giữ tên và định dạng cũ.",
      "In: chọn Tệp > In hoặc nhấn Ctrl+P để mở bản xem trước. Trong Phạm vi sổ làm việc, chọn In các trang tính hiện hoạt (mặc định, theo trang tính đang hoạt động hoặc các tab đang được chọn), In toàn bộ sổ làm việc, hoặc In vùng chọn. Muốn in vùng chọn, bôi đen ô hoặc dải ô trên lưới trước khi mở hộp thoại; lựa chọn này chỉ khả dụng khi đã có vùng ô. Mỗi lần đổi phạm vi, 3T dựng lại PDF và cập nhật tổng số trang. Phạm vi trang ở bên dưới chọn trang trong PDF đó. Kiểm tra bản xem trước, chọn máy in và số bản rồi nhấn In. Khi phần mềm văn phòng khác có sẵn, Dùng phần mềm văn phòng có sẵn trên máy để in được chọn sẵn; nhãn Bộ dựng trang in cho biết bộ máy đã tạo bản xem trước. Bỏ chọn tùy chọn này để dùng bộ dựng tích hợp của 3T Office."
    ]
  },
  {
    id: "sheet.formula.vndphần mềm văn phòng khács",
    app: "sheet",
    commandIds: [],
    title: "Đọc số tiền thành chữ (hàm VND)",
    summary: "Hàm =VND(ô) viết số tiền bằng chữ tiếng Việt, ví dụ 3193080 → \"Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn.\" Tương thích hàm VND của add-in phần mềm bảng tính khác quen thuộc, không cần cài thêm gì.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["VND", "đọc số", "bằng chữ", "số tiền bằng chữ", "hóa đơn", "đồng chẵn", "add-in", "_xll.VND"],
    steps: [
      "Chọn ô cần hiện số tiền bằng chữ (thường là dòng \"Bằng chữ:\" trên hóa đơn, báo giá).",
      "Gõ =VND( rồi bấm vào ô chứa số tiền, đóng ngoặc và nhấn Enter, ví dụ =VND(H13).",
      "Số chẵn kết thúc bằng \"đồng chẵn.\"; số có phần lẻ đọc thêm \"… xu.\"; số âm bắt đầu bằng \"Âm\".",
      "Mở tệp bảng tính .xlsx đã dùng hàm VND của add-in: Sheet tự tính lại và hiện đúng chữ thay cho lỗi #ADDIN? hoặc #NAME?.",
      "Khi lưu .xlsx, ô vẫn giữ công thức VND và dòng chữ: máy có cài add-in VND tiếp tục tự cập nhật, máy khác vẫn thấy chữ đã lưu (phần mềm bảng tính khác không có add-in sẽ báo #NAME? khi tính lại).",
      "Khi lưu dạng cũ .xls (phần mềm bảng tính khác 97-2003), Sheet lưu dòng chữ thành giá trị cố định để không bị lỗi #N/A; nếu cần công thức tự cập nhật, hãy lưu .xlsx."
    ]
  },
  {
    id: "sheet.formula.externalLinks",
    app: "sheet",
    commandIds: [],
    title: "Liên kết tới sổ làm việc khác",
    summary: "Công thức như =[BaoCao.xlsx]Sheet1!A1 lấy số liệu từ một tệp bảng tính .xlsx khác. Sheet hiển thị giá trị đã lưu lần cuối trong tệp, giữ nguyên liên kết khi lưu và không tự mở tệp nguồn (ứng dụng chạy offline).",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Kiểm tra công thức" },
    keywords: ["liên kết ngoài", "external link", "sổ làm việc khác", "tệp khác", "[Book.xlsx]", "cập nhật liên kết", "NA", "#N/A"],
    steps: [
      "Khi mở bảng tính có liên kết tới tệp khác, một thanh cảnh báo màu vàng hiển thị ngay dưới ribbon: \"Tệp có N ô liên kết tới sổ làm việc khác. 3T Office hiển thị giá trị lưu lần cuối và không tự cập nhật (ứng dụng chạy ngoại tuyến).\", đồng thời thanh trạng thái phía dưới cũng báo số ô có liên kết.",
      "Nhấn nút \"Tìm hiểu thêm\" trên thanh cảnh báo để mở nhanh bài hướng dẫn này, hoặc nhấn nút đóng (×) hay phím Esc khi đang ở trong thanh để ẩn thông báo.",
      "Chọn ô để xem công thức trên thanh công thức, viết giống phần mềm bảng tính khác: =[BaoCao.xlsx]Sheet1!A1 hoặc ='[Bao cao.xlsx]So lieu'!B2 khi tên có khoảng trắng.",
      "Giá trị của các ô này không tự cập nhật khi bạn sửa bảng tính: Sheet giữ đúng số liệu đã lưu, giống phần mềm bảng tính khác khi tệp nguồn đang đóng. Các công thức khác dựa trên ô liên kết vẫn tính bình thường với giá trị đó.",
      "Nhấn Ctrl+S để lưu: liên kết được giữ nguyên, mở lại bằng phần mềm bảng tính khác vẫn cập nhật được từ tệp nguồn.",
      "Nếu gõ lại công thức khác vào ô liên kết, ô đó trở thành công thức thường và không còn liên kết tới tệp kia.",
      "Muốn đánh dấu ô chưa có dữ liệu, dùng =NA() để trả về lỗi #N/A; bắt lỗi này bằng =IFNA(ô; \"giá trị thay thế\") hoặc kiểm tra bằng =ISNA(ô)."
    ]
  },
  {
    id: "sheet.format.defaultWorkbook",
    app: "sheet",
    commandIds: ["sheet.font.family", "sheet.font.size", "sheet.font.grow", "sheet.font.shrink"],
    title: "Mặc định trang tính mới và cỡ chữ",
    summary: "Trang tính mới dùng Calibri 11 pt, hàng cao 20 px và cột rộng 64 px như phần mềm bảng tính khác 2016. Cỡ chữ trên ribbon được tính theo point (pt).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["mặc định", "Calibri 11", "cỡ chữ", "font size", "chiều cao hàng", "độ rộng cột", "point", "pt"],
    steps: [
      "Tạo bảng tính mới: các ô chưa định dạng dùng Calibri 11 pt; hàng mặc định cao 20 px và cột mặc định rộng 64 px.",
      "Để đổi cỡ chữ, chọn ô hoặc vùng rồi mở tab Trang đầu, nhóm Phông chữ và chọn số trong hộp Cỡ chữ. Số 14 nghĩa là 14 pt và khi lưu XLSX, phần mềm bảng tính khác đọc lại đúng 14 pt.",
      "Dùng nút Tăng cỡ chữ hoặc Giảm cỡ chữ cạnh hộp Cỡ chữ để chuyển theo các bậc 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48 và 72 pt.",
      "Muốn đổi kích thước hàng hoặc cột riêng: tab Trang đầu → nhóm Ô → Định dạng → Chiều cao hàng... hoặc Độ rộng cột...."
    ]
  },
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
      "Chọn ô kết quả. Trên Thanh công thức Sheet gõ dấu = rồi tên hàm, ví dụ =SUM(A1:A10) hoặc =AVERAGE(B2:B8). Danh sách gợi ý hiện khi gõ; nhấn Tab để chèn hàm, tiếp tục nhập đối số rồi nhấn Enter để tính.",
      "Cách khác: mở tab Công thức, nhóm Hàm tính toán, nhấn Chèn hàm (hoặc Shift+F3, hoặc nút fx trên thanh công thức). Chọn danh mục (Toán học, Logic, Văn bản, Ngày & Giờ, Tài chính, Tra cứu…), chọn hàm rồi nhấn Chèn hàm vào ô.",
      "Muốn tổng nhanh: chọn ô ngay dưới (hoặc bên phải) dải số, nhấn AutoSum trên tab Công thức hoặc tab Trang đầu nhóm Chỉnh sửa (Alt+=). AVERAGE / Đếm số / Lớn nhất / Nhỏ nhất nằm cạnh đó.",
      "Nhấn Enter hoặc nút ✓ trên thanh công thức để xác nhận. Esc hoặc nút ✕ hủy bản đang soạn. Ctrl+Shift+Enter nhập công thức mảng cho vùng đã chọn.",
      "Nút Chèn hàm trên tab Công thức còn các nhóm Tài chính, Logic, Văn bản, Ngày & Giờ, Tra cứu & Tham chiếu, Toán & Lượng giác — mỗi nút mở cùng hộp thoại fx đã lọc sẵn danh mục."
    ]
  },
  {
    id: "sheet.formula.excelEntry",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction", "sheet.formula.arrayEnter"],
    title: "Nhập công thức và chọn tham chiếu bằng chuột",
    summary: "Dùng gợi ý hàm, chú giải tham số và chế độ Trỏ để nhập công thức ngay trong lưới hoặc Thanh công thức Sheet mà không mất nội dung đang sửa.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["công thức", "gợi ý hàm", "autocomplete", "trỏ ô", "chọn vùng bằng chuột", "F2", "F4", "tham chiếu", "SUM", "formula bar"],
    steps: [
      "Chọn ô kết quả trong lưới Sheet hoặc bấm Thanh công thức ngay dưới ribbon. Gõ = rồi tên hàm, chẳng hạn =SU; danh sách chỉ hiện hàm mà công cụ tính Sheet hỗ trợ, kèm mô tả tiếng Việt ngắn.",
      "Dùng mũi tên Lên/Xuống để chọn hàm rồi nhấn Tab, hoặc nhấp đúp tên hàm. Sheet chèn tên hàm cùng dấu mở ngoặc, giữ nguyên chế độ sửa và hiện cú pháp tham số bên dưới; tham số đang nhập được in đậm và đổi khi bạn gõ dấu phẩy.",
      "Đặt con trỏ sau dấu =, dấu (, dấu phẩy hoặc toán tử rồi nhấp ô trên lưới để chèn địa chỉ. Kéo chuột để chèn cả vùng như A1:A5. Giữ Shift và nhấp ô để mở rộng tham chiếu vừa chèn; giữ Ctrl và nhấp ô để thêm một tham chiếu mới, phân cách bằng dấu phẩy.",
      "Trong khi công thức đang mở, nhấp tab trang tính khác rồi chọn/kéo vùng để thêm tham chiếu như Sheet2!A1. Nhấn Enter để hoàn tất; Sheet quay về trang tính chứa ô công thức. Tham chiếu được đánh dấu viền màu trên lưới và cùng màu trong công thức.",
      "Nhấn F2 để chuyển giữa Sửa và Trỏ; trạng thái Nhập/Sửa/Trỏ hiện ở thanh trạng thái phía dưới. Trong chế độ Trỏ, dùng phím mũi tên để di chuyển địa chỉ tham chiếu. Đặt con trỏ vào địa chỉ rồi nhấn F4 để lần lượt đổi $A$1, A$1, $A1 và A1.",
      "Nhấn Enter để lưu công thức; dấu ngoặc đóng còn thiếu sẽ được thêm tự động. Nhấn Esc để hủy toàn bộ lần sửa và khôi phục nội dung cũ. Nếu danh sách gợi ý đang mở, Esc lần đầu chỉ đóng danh sách. Dùng Ctrl+Shift+Enter để nhập công thức mảng như trước đây."
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
      "Nhấn Tạo Pivot Table. Sheet tạo trang mới tên dạng «TênSheet (2)» và ghi bảng tổng hợp bắt đầu từ A1.",
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
      "Cùng nhóm còn Tách văn bản, Điền nhanh, Xóa trùng lặp, Hợp nhất dữ liệu và menu Phân tích What-If."
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
      "Ô đặt phải chứa công thức phụ thuộc ô sẽ đổi (ví dụ B1 = A1*1.1). Chọn ô công thức rồi mở tab Dữ liệu, nhóm Công cụ dữ liệu, mở menu Phân tích What-If rồi chọn Dò tìm mục tiêu.",
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
    keywords: ["what-if", "bảng dữ liệu", "data table", "kịch bản", "scenario manager", "giả định", "tóm tắt kịch bản", "scenario summary", "gộp kịch bản"],
    steps: [
      "Mở tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn Phân tích What-If rồi chọn Dò tìm mục tiêu, Bảng dữ liệu hoặc Trình quản lý kịch bản.",
      "Bảng dữ liệu: đặt công thức gốc ở ô góc trên-trái của vùng; đặt các giá trị thử ngang hàng trên và/hoặc dọc cột trái. Bôi toàn bộ vùng, mở Bảng dữ liệu và nhập Ô đầu vào theo hàng, theo cột, hoặc cả hai rồi nhấn Áp dụng.",
      "Với một biến, chỉ nhập đúng một ô đầu vào (giá trị thử nằm ngang hàng trên, kết quả nằm ở hàng dưới). Với hai biến — ví dụ bảng PMT với lãi suất ngang hàng trên và số năm dọc cột trái — nhập cả Ô đầu vào theo hàng lẫn Ô đầu vào theo cột (hai ô phải khác nhau); Sheet điền kết quả vào phần thân bảng nhưng giữ nguyên công thức gốc.",
      "Kết quả Bảng dữ liệu tự tính lại khi bạn đổi ô đầu vào hoặc bất kỳ ô nào mà công thức gốc phụ thuộc (giống công thức mảng TABLE() của phần mềm bảng tính khác) — ví dụ đổi tiền vay trong bảng PMT là toàn bộ phần thân cập nhật ngay.",
      "Khi lưu tệp xlsx, Sheet ghi kết quả Bảng dữ liệu dạng giá trị tĩnh (chưa ghi được công thức mảng TABLE()); mở tệp bằng chương trình bảng tính khác vẫn hiển thị đúng các giá trị này nhưng phần thân bảng không tự tính lại ở đó.",
      "Trình quản lý kịch bản: Quản lý và chuyển đổi linh hoạt nhiều bộ giả định dữ liệu có tên trên trang tính:",
      "- Thêm kịch bản: Nhập Tên kịch bản, Các ô thay đổi (hỗ trợ ô đơn, danh sách phân tách bằng dấu phẩy như $B$1, $B$2 hoặc dải ô $B$1:$B$3), các Giá trị tương ứng và Ghi chú mô tả. Nhấn Thêm để lưu.",
      "- Hiển thị kịch bản: Chọn kịch bản trong danh sách rồi nhấn nút Hiển thị. Sheet lập tức ghi các giá trị giả định vào ô thật trên lưới và tự động tính toán lại mọi công thức phụ thuộc.",
      "- Sửa và Xóa: Chọn kịch bản cần chỉnh sửa để cập nhật giá trị hoặc ghi chú, hoặc nhấn Xóa khi không còn nhu cầu sử dụng.",
      "- Gộp kịch bản: Nhấn nút Gộp..., chọn trang tính nguồn để nạp kịch bản từ trang tính khác vào trang hiện tại; kịch bản trùng tên sẽ được tự động đổi tên kèm tên trang nguồn.",
      "- Báo cáo Tóm tắt kịch bản: Nhấn nút Tóm tắt..., chọn Kiểu báo cáo Tóm tắt kịch bản và nhập Các ô kết quả (ví dụ $B$4, $B$5). Ứng dụng sẽ tự động sinh một trang tính mới trình bày bảng so sánh toàn diện chuẩn phần mềm bảng tính khác gồm Giá trị hiện tại, giá trị từng kịch bản và kết quả tính toán tương ứng.",
      "Lưu trữ tương thích: Toàn bộ cấu hình kịch bản và trang báo cáo Tóm tắt được lưu trực tiếp vào tệp .xlsx và .fods, tương thích đầy đủ với phần mềm bảng tính khác.",
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
    id: "sheet.selection.range",
    app: "sheet",
    commandIds: [],
    title: "Chọn ô, vùng, hàng và cột",
    summary: "Dùng chuột hoặc bàn phím để chọn ô/vùng liên tiếp, thêm vùng rời, chọn trọn hàng/cột và xem Sum, Count, Average ở thanh trạng thái.",
    ribbon: { tab: "Lưới trang tính", tabId: "grid", group: "Hộp tên và thanh trạng thái" },
    keywords: ["chọn ô", "chọn vùng", "bôi đen", "kéo chuột", "Shift+click", "Ctrl+click", "phím hướng", "hàng", "cột", "name box", "thanh trạng thái"],
    steps: [
      "Trong lưới bên dưới thanh công thức, nhấn giữ nút chuột trái ở ô đầu rồi kéo tới ô cuối. Khung chọn cập nhật khi kéo; thả chuột để giữ nguyên vùng. Kéo ngược lên trên hoặc sang trái để chọn theo hướng ngược.",
      "Giữ Shift rồi nhấp ô cuối để mở rộng từ ô neo hiện tại. Sau khi chọn bằng chuột, giữ Shift và nhấn một phím hướng để tiếp tục mở rộng từ ô đang hoạt động; giữ Ctrl và nhấn phím hướng để đi tới ranh giới vùng dữ liệu liền kề.",
      "Nhấn Ctrl+A khi lưới được tiêu điểm để chọn trang tính; Ctrl+Space chọn cột hiện tại và Shift+Space chọn hàng hiện tại.",
      "Giữ Ctrl rồi nhấp hoặc kéo vùng thứ hai để thêm vùng rời; hộp tên hiển thị các địa chỉ cách nhau bằng dấu phẩy. Chọn lại một ô bình thường để bỏ các vùng rời và bắt đầu lựa chọn mới.",
      "Kéo từ số hàng bên trái để chọn nhiều hàng, hoặc kéo từ chữ cột phía trên để chọn nhiều cột. Có thể đưa con trỏ sát mép lưới trong lúc giữ chuột để tự cuộn và tiếp tục mở rộng vùng; các hàng/cột đã cố định vẫn giữ nguyên.",
      "Hộp tên phía trên lưới hiện địa chỉ vùng. Thanh trạng thái dưới cùng cập nhật số ô số (ĐẾM), TRUNG BÌNH và TỔNG CỘNG của các ô đang chọn.",
      "Khi Sao chép định dạng đang bật ở tab Trang đầu → nhóm Bảng nhớ tạm, kéo qua một vùng đích để áp dụng kiểu ô. Nếu đang sửa trên thanh công thức, kéo chọn ô khác sẽ xác nhận nội dung đang nhập trước khi chọn vùng mới."
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
      "Mở tab Chèn, nhóm Biểu đồ, nhấn nút lớn Biểu đồ (hoặc nhấn nút mũi tên mở rộng ở góc dưới phải nhóm Biểu đồ chuẩn phần mềm bảng tính khác).",
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
      "Dùng nút × trên góc biểu đồ để xóa. Chèn/xóa PivotChart và Làm mới Pivot đều dùng Ctrl+Z/Ctrl+Y của Sheet."
    ]
  },
  {
    id: "sheet.view.freezePanes",
    app: "sheet",
    commandIds: ["sheet.view.freezePanes", "sheet.view.freezeTopRow", "sheet.view.freezeFirstColumn"],
    title: "Cố định ô và tiêu đề hàng/cột (Freeze Panes)",
    summary: "Cố định các hàng phía trên và cột bên trái ô đang chọn, hoặc chỉ cố định hàng 1 / cột A khi cuộn bảng tính. Menu thả xuống trên tab Chế độ xem gồm 3 tùy chọn chuẩn phần mềm bảng tính khác; trạng thái được nhớ riêng theo từng sheet.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Cửa sổ" },
    keywords: ["cố định", "freeze panes", "đóng băng", "hàng trên cùng", "cột đầu tiên", "hàng 1", "cột A", "cuộn", "tiêu đề bảng"],
    steps: [
      "Mở tab Chế độ xem, nhóm Cửa sổ (cạnh Thu phóng), nhấn vào nút thả xuống «Cố định ô».",
      "Chọn «Cố định ô» (Freeze Panes): cố định toàn bộ các hàng phía trên và các cột bên trái ô đang được chọn (ví dụ: chọn B2 sẽ cố định hàng 1 và cột A; chọn C3 sẽ cố định hàng 1-2 và cột A-B).",
      "Chọn «Cố định hàng trên cùng» (Freeze Top Row): chỉ cố định hàng 1 khi cuộn dọc bảng tính, không phụ thuộc vị trí ô đang chọn.",
      "Chọn «Cố định cột đầu tiên» (Freeze First Column): chỉ cố định cột A khi cuộn ngang bảng tính, không phụ thuộc vị trí ô đang chọn.",
      "Để bỏ cố định: mở lại menu và chọn lệnh cố định đang kích hoạt để hủy. Có thể dùng Ctrl+Z / Ctrl+Y để hoàn tác hoặc làm lại thao tác."
    ]
  },
  {
    id: "sheet.page.setupRound2", app: "sheet",
    commandIds: ["sheet.page.scale", "sheet.page.headerFooter", "sheet.page.margins", "sheet.page.printTitles"],
    title: "Thiết lập trang in nâng cao",
    summary: "Thu bảng tính vừa số trang mong muốn, thêm đầu/cuối trang động, căn giữa nội dung, chọn in đường kẻ hoặc tiêu đề hàng/cột, và đặt hàng/cột lặp lại trên mỗi trang in (Print Titles).",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["tỷ lệ", "vừa trang", "scale", "đầu trang", "cuối trang", "đường kẻ", "tiêu đề hàng cột", "in", "print titles", "hàng lặp lại", "cột lặp lại"],
    steps: [
      "Mở tab Bố trí trang, nhóm Thiết lập trang.",
      "Nhấn Tỷ lệ vừa trang. Chọn Vừa theo tỷ lệ và nhập 10–400%, hoặc chọn Vừa trong rồi nhập số trang ngang và dọc; nhập 0 cho chiều muốn để tự động.",
      "Trong cùng hộp thoại, đánh dấu Theo chiều ngang hoặc Theo chiều dọc ở mục Căn giữa trang khi in.",
      "Đánh dấu In đường kẻ ô hoặc In tiêu đề hàng và cột nếu cần chúng xuất hiện trên giấy/PDF, rồi nhấn Áp dụng.",
      "Để tạo đầu/cuối trang, nhấn Tiêu đề Đầu/Cuối trang. Chọn mẫu Trang X, Tên sheet, Ngày hoặc nhập ba vùng Trái/Giữa/Phải.",
      "Trong ô tùy chỉnh có thể chèn &P (số trang), &N (tổng trang), &D (ngày), &T (giờ), &F (tệp), &A (tên sheet), rồi nhấn Áp dụng. Các thiết lập chỉ áp dụng cho sheet hiện tại và có thể hoàn tác bằng Ctrl+Z.",
      "Để đặt hàng lặp lại trên mỗi trang in, nhấn Tiêu đề in. Ở mục Hàng lặp lại trên mỗi trang, nhập tham chiếu kiểu phần mềm bảng tính khác như 1:2 hoặc $1:$2 (một hàng đơn gõ 1 hoặc $1).",
      "Cách khác: nhấn nút ⊞ bên cạnh ô Hàng lặp lại để thu gọn hộp thoại, rồi nhấp trực tiếp vào số hàng trên lưới; để mở rộng vùng, nhấn giữ phím Shift rồi nhấp hàng khác. Nhấn Esc hoặc nút Quay lại hộp thoại để trở về — ô tự điền giá trị đã chọn.",
      "Tương tự cho Cột lặp lại ở bên trái: nhập A:B hoặc $A:$B, hoặc nhấn nút ⊞ và nhấp vào chữ cái cột trên lưới (nhấn giữ Shift rồi nhấp cột khác để mở rộng). Giá trị lưu riêng theo từng sheet, nhấn Áp dụng để lưu.",
      "Print Titles được ghi vào tệp dưới dạng defined name _xlnm.Print_Titles của phần mềm bảng tính khác nên mở lại bằng phần mềm bảng tính khác vẫn giữ nguyên; mở lại trong Sheet cũng đọc đúng giá trị đã lưu."
    ]
  },
  {
    id: "sheet.page.saveRoundTrip",
    app: "sheet",
    commandIds: ["sheet.page.margins", "sheet.page.orientation", "sheet.page.size", "sheet.page.printTitles", "sheet.page.setPrintArea"],
    title: "Lưu và mở lại thiết lập trang in",
    summary: "Hướng giấy, khổ giấy, lề, vùng in, tiêu đề lặp, tỷ lệ vừa trang và đầu/chân trang được lưu theo từng trang tính trong XLSX và được khôi phục khi mở lại bằng Sheet hoặc phần mềm bảng tính khác.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["lưu thiết lập in", "mở lại", "hướng giấy", "khổ giấy", "lề", "vùng in", "tiêu đề in", "page setup", "xlsx"],
    steps: [
      "Mở tab Bố trí trang, nhóm Thiết lập trang. Dùng Lề, Hướng và Khổ để chọn lề trang, giấy Dọc/Ngang và A4/Letter/Legal cho trang tính hiện tại.",
      "Muốn chỉ in một khối, bôi vùng ô rồi chọn Đặt vùng in. Muốn lặp hàng/cột tiêu đề trên mỗi trang, chọn Tiêu đề in và nhập 1:2 hoặc A:B.",
      "Trong Tỷ lệ vừa trang, chọn Vừa trong rồi đặt số trang ngang/dọc; trong Tiêu đề Đầu/Cuối trang, nhập nội dung hoặc các mã &P, &N, &A.",
      "Nhấn Ctrl+S để lưu XLSX. Khi mở lại trong Sheet, vào lại các hộp trên để kiểm tra; các giá trị được khôi phục riêng cho từng tab. Phần mềm bảng tính khác cũng đọc đúng thiết lập trang, vùng in và tiêu đề in.",
      "Nếu cần bỏ giới hạn vùng in, chọn Xóa vùng in. Thao tác này không xóa dữ liệu và được lưu ở lần Ctrl+S tiếp theo."
    ]
  },
  {
    id: "sheet.review.commentNavigation", app: "sheet",
    commandIds: ["sheet.review.commentPrevious", "sheet.review.commentNext", "sheet.review.commentDelete", "sheet.review.commentResolve"],
    title: "Duyệt và xử lý nhận xét ô",
    summary: "Duyệt nhận xét theo thứ tự ô và trang tính, đánh dấu đã xử lý, mở lại hoặc xóa.",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Ghi chú" },
    keywords: ["nhận xét", "ghi chú ô", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Xem xét, nhóm Ghi chú.", "Nhấn Nhận xét trước hoặc Nhận xét sau; Sheet chọn ô có ghi chú và tự chuyển sheet khi cần, rồi quay vòng ở cuối danh sách.", "Nhấn Đã xử lý để đổi dấu góc sang màu xám nhưng vẫn giữ ghi chú; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa ghi chú ở ô đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại."]
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
      "Sheet đổi khóa mọi dữ liệu theo tên mới và sửa công thức tham chiếu 'TênCũ'!A1 thành 'TênMới'!A1, kể cả named range và nguồn Pivot. Chuỗi chữ trong dấu \"...\" không đổi.",
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
    id: "sheet.sheet.deleteAndTabColor", app: "sheet",
    commandIds: [],
    title: "Xóa trang tính và đổi màu tab",
    summary: "Quản lý tab trang tính bằng menu chuột phải, gồm xóa trang tính và đặt màu tab.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["xóa trang tính", "màu tab", "delete sheet", "tab color"],
    steps: [
      "Xóa trang tính: nhấp phải tab trang tính ở thanh dưới lưới rồi chọn Xóa trang tính.",
      "Sheet hỏi xác nhận trước khi xóa; không xóa được trang tính cuối cùng của sổ làm việc. Lỡ tay thì bấm Ctrl+Z để lấy lại.",
      "Đổi màu tab: nhấp phải tab, chọn Màu tab rồi chọn một màu, hoặc chọn Không màu để bỏ màu.",
      "Trong menu Màu tab, dùng phím mũi tên lên/xuống để chọn màu, Enter để áp dụng hoặc Esc để đóng menu. Ctrl+Z hoàn tác màu vừa chọn.",
      "Màu tab được lưu cùng tệp .xlsx và hiện lại đúng màu khi mở lại tệp."
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
      "Đây là khóa giao diện giống phần mềm bảng tính khác/bộ dựng tích hợp của 3T Office tự làm trên máy, mật khẩu không mã hóa, không chống người cố tình sửa file. Trạng thái khóa không đi vào Undo."
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
      "Lưu sổ bằng Ctrl+S hoặc Tệp > Lưu bản sao và chọn .xlsx hoặc .ods. Trạng thái bảo vệ cấu trúc được lưu để ngăn thêm, xóa hay đổi tên trang tính khi mở lại. Mật khẩu của phiên làm việc không được giữ trong tệp. Khóa cấu trúc không mã hóa dữ liệu; hãy dùng biện pháp bảo vệ riêng cho thông tin nhạy cảm.",
      "Mở lại: chọn Tệp > Mở và chọn tệp .xlsx đã bảo vệ cấu trúc. Tab Xem xét > nhóm Bảo vệ hiển thị Bỏ bảo vệ workbook khi sổ đang khóa. Khi khóa, bạn không thể thêm, xóa hay đổi tên trang tính. Mật khẩu của phiên làm việc không được lưu trong tệp; đây không phải mã hóa dữ liệu."
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
      "Chọn ô hoặc bôi vùng. Tab Trang đầu, nhóm Phông chữ: hàng trên là hộp Phông chữ / Cỡ chữ và Tăng/Giảm cỡ; hàng dưới là Đậm, Nghiêng, Gạch chân, Viền ô, Màu nền, Màu chữ. Mũi tên launcher góc dưới phải mở nhanh hộp thoại Định dạng ô (Ctrl+1).",
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
      "sheet.cell.orientation",
      "sheet.cell.indentDecrease",
      "sheet.cell.indentIncrease",
      "sheet.cell.mergeCenter",
      "sheet.cell.mergeAcross",
      "sheet.cell.mergeCells",
      "sheet.cell.unmerge",
      "sheet.format.alignmentDialog"
    ],
    title: "Căn chỉnh, ngắt dòng và trộn ô",
    summary: "Căn ngang/dọc nội dung trong ô, xoay chữ (0°/45°/-45°/90°/-90° hoặc dọc từ dưới lên), tự xuống dòng theo độ rộng cột, tăng/giảm thụt lề, và trộn vùng chọn (cả khối, theo hàng, hoặc tách lại). Trộn nhiều ô có dữ liệu sẽ hỏi xác nhận — chỉ giữ ô trên-trái. Hỗ trợ hộp thoại Định dạng ô thẻ Căn chỉnh chi tiết.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Căn chỉnh" },
    keywords: ["căn giữa", "căn trái", "căn phải", "căn trên", "ngắt dòng", "wrap", "thụt lề", "trộn ô", "merge", "unmerge", "hợp nhất", "xoay chữ", "orientation", "hướng chữ", "format cells", "định dạng ô", "căn chỉnh ô"],
    steps: [
      "Chọn ô hoặc vùng. Tab Trang đầu, nhóm Căn chỉnh: hàng trên Căn trên / Căn giữa dọc / Căn dưới / Ngắt dòng tự động / Hướng chữ (dropdown); hàng giữa Căn trái / giữa / phải, Giảm/Tăng thụt lề; hàng dưới bốn nút trộn ô. Nhấn mũi tên nhỏ ở góc phải nhóm để mở hộp thoại Căn chỉnh chi tiết (Format Cells - thẻ Căn chỉnh).",
      "Hướng chữ: mở dropdown chọn 0° (ngang), 45°, -45°, 90° (xoay lên), -90° (xoay xuống), hoặc «Dọc từ dưới lên» (chữ xếp dọc, phần mềm bảng tính khác chữ xếp dọc). Góc lưu trong kiểu ô và khi Lưu ra file thật (XLSX). Ngắt dòng tự động cho chữ dài xuống dòng trong ô và tăng chiều cao hàng. Tăng thụt lề thêm 12 px (tối đa 56 px); Giảm thụt lề hạ dần về 8 px.",
      "Bôi ít nhất 2 ô rồi: Trộn & căn giữa gộp thành một ô và căn giữa; Trộn ô gộp nhưng giữ căn đang có; Trộn theo hàng gộp riêng từng hàng trong vùng. Nếu nhiều ô có dữ liệu, hộp «Trộn ô» cảnh báo chỉ giữ ô trên cùng bên trái — chọn Tiếp tục gộp hoặc Hủy.",
      "Tách ô hoàn tác vùng đã trộn (dữ liệu đã mất khi gộp không tự hiện lại, trừ khi Ctrl+Z ngay). Không trộn đè lên vùng đã trộn sẵn.",
      "Hộp thoại Định dạng ô (thẻ Căn chỉnh): cho phép chọn căn ngang (Chung, Trái, Giữa, Phải, Đều), căn dọc (Trên, Giữa, Dưới), thụt lề từ 0 đến 4, ngắt dòng, hợp nhất ô, góc xoay độ chính xác kèm khung xem trước trực quan."
    ]
  },
  {
    id: "sheet.data.sortFilter",
    app: "sheet",
    commandIds: ["sheet.data.sortAsc", "sheet.data.sortDesc", "sheet.data.filter", "sheet.data.customSort"],
    title: "Sắp xếp và bộ lọc",
    summary: "Sắp xếp A–Z hoặc Z–A theo cột đang chọn (ưu tiên đúng vùng bôi), hoặc mở Sắp xếp tùy chỉnh để sắp theo nhiều cột cùng lúc. Bộ lọc (Ctrl+Shift+L) hiện nút trên tiêu đề cột để lọc theo giá trị hoặc sắp xếp từ menu cột.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Sắp xếp & Lọc" },
    keywords: ["sắp xếp", "a-z", "z-a", "bộ lọc", "autofilter", "lọc", "sort", "filter", "ctrl+shift+l", "sắp xếp tùy chỉnh", "custom sort", "nhiều cột", "multi-level sort"],
    steps: [
      "Bôi bảng (gồm hàng tiêu đề nếu có) hoặc đứng trên một ô trong cột khóa. Tab Dữ liệu, nhóm Sắp xếp & Lọc — ba nút lớn: Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc, và nút nhỏ Sắp xếp tùy chỉnh. Cùng lệnh cũng có trên tab Trang đầu, nhóm Chỉnh sửa.",
      "A–Z / Z–A sắp cả hàng theo cột đang chọn. Số so sánh như số; chữ theo locale vi-VN. Hàng «Tổng» (chữ Tổng hoặc công thức SUM) được bỏ qua khi không bôi vùng. Cần ít nhất 2 hàng dữ liệu.",
      "Sắp xếp tùy chỉnh mở hộp thoại nhiều cấp (như phần mềm bảng tính khác Data > Sort): đánh dấu Dữ liệu có hàng tiêu đề nếu có, chọn cột và thứ tự A→Z/Z→A cho từng cấp «Sắp xếp theo» / «Sau đó theo», bấm + Thêm cấp để thêm tối đa 4 cấp, dấu × để xóa một cấp. Hàng trùng ở cấp trước giữ nguyên thứ tự tương đối và được phân theo cấp sau.",
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
    commandIds: ["sheet.view.normal", "sheet.view.pageBreakPreview", "sheet.view.pageLayout", "sheet.file.printPreview"],
    title: "Chế độ xem bảng tính",
    summary: "Bình thường là lưới soạn thảo. Xem ngắt trang hiện đường chia trang và làm mờ vùng ngoài khổ in. Bố trí trang xem như tờ giấy. Ctrl+F2 mở hộp thoại In với ảnh các trang PDF thật theo Khổ giấy/Lề/Tỷ lệ/Tiêu đề lặp/Vùng in.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Chế độ xem bảng tính" },
    keywords: ["bình thường", "xem ngắt trang", "bố trí trang", "page break preview", "page layout", "normal view", "trang in", "xem trước khi in", "print preview", "in tài liệu", "ctrl+f2"],
    steps: [
      "Tab Chế độ xem, nhóm Chế độ xem bảng tính — bốn nút lớn: Bình thường, Xem ngắt trang, Bố trí trang, Xem trước khi in.",
      "Bình thường: lưới ô tiêu chuẩn để nhập liệu. Đây là mặc định.",
      "Xem ngắt trang: đường chia trang xanh đậm, vùng ngoài khổ in bị phủ tối, số «Trang 1» mờ trên nền. Dùng để chỉnh chỗ ngắt trước khi in (tab Bố trí trang, nhóm Ngắt trang).",
      "Bố trí trang: xem như giấy in, có dải đầu trang 3 ngăn. Không đổi dữ liệu ô. Quay lại Bình thường bất cứ lúc nào.",
      "Xem trước khi in (Ctrl+F2) hoặc Ctrl+P mở hộp thoại In. Trong Phạm vi sổ làm việc, chọn In các trang tính hiện hoạt (mặc định, theo tab đang hoạt động/được chọn), In toàn bộ sổ làm việc, hoặc In vùng chọn. Muốn in vùng chọn, bôi đen các ô trên lưới trước khi mở hộp thoại; vùng chọn có nhiều dải vẫn được giữ. Mỗi lần đổi phạm vi, 3T tạo lại PDF và cập nhật tổng trang xem trước. Khi có phần mềm văn phòng khác, Dùng phần mềm văn phòng có sẵn trên máy để in được chọn sẵn; nhãn Bộ dựng trang in cho biết bộ máy đã tạo PDF. Bỏ chọn để dùng bộ dựng tích hợp của 3T Office. Dùng Trang trước/sau, chọn máy in, số bản và phạm vi trang, rồi nhấn In."
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
    commandIds: ["sheet.view.zoomIn", "sheet.view.zoomOut", "sheet.view.zoomReset", "sheet.view.zoomToSelection"],
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
    commandIds: ["sheet.row.insert", "sheet.col.insert", "sheet.row.delete", "sheet.col.delete", "sheet.insert.cells", "sheet.sheet.insertBefore"],
    title: "Chèn và xóa hàng, cột, ô và trang tính",
    summary: "Chèn hàng tại hàng đang chọn (dữ liệu bên dưới dịch xuống); chèn cột tại cột đang chọn (dữ liệu bên phải dịch sang). Xóa hàng/cột chứa ô đang chọn. Hỗ trợ hộp thoại Chèn/Xóa ô và chèn trang tính mới trước trang hiện tại theo chuẩn phần mềm bảng tính khác.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["chèn hàng", "chèn cột", "xóa hàng", "xóa cột", "chèn ô", "xóa ô", "insert row", "insert column", "insert cells", "ctrl+shift+=", "ctrl+shift++", "ctrl+-", "shift+f11", "dịch ô"],
    steps: [
      "Chọn một ô (hoặc bấm số hàng / chữ cột). Tab Trang đầu, nhóm Ô: cột trái Chèn hàng / Chèn cột; cột giữa Xóa hàng / Xóa cột.",
      "Phím tắt Chèn Ctrl+Shift++ (hoặc Ctrl+Shift+=): Khi chọn cả hàng hoặc cả cột, lệnh sẽ chèn ngay hàng hoặc cột mới. Khi đang chọn ô hoặc dải ô, hệ thống mở hộp thoại Chèn chuẩn phần mềm bảng tính khác cho phép chọn: Chuyển ô sang phải, Chuyển ô xuống dưới (mặc định), Toàn bộ hàng hoặc Toàn bộ cột.",
      "Phím tắt Xóa Ctrl+-: Khi chọn cả hàng hoặc cột sẽ xóa ngay; khi chọn ô sẽ mở hộp thoại Xóa chuẩn phần mềm bảng tính khác để chuyển ô sang trái, chuyển ô lên trên, xóa cả hàng hoặc xóa cả cột. Phím Shift+F11 chèn ngay một trang tính mới trước trang tính hiện tại.",
      "Mọi thao tác chèn, xóa ô, hàng, cột hoặc chèn trang tính mới đều hỗ trợ hoàn tác nguyên tử qua Ctrl+Z và làm lại qua Ctrl+Y."
    ]
  },
  {
    id: "sheet.insert.image",
    app: "sheet",
    commandIds: ["sheet.insert.image"],
    title: "Chèn và di chuyển ảnh trên bảng tính",
    summary: "Chèn tệp ảnh từ máy tính neo vào ô bảng tính. Kéo-thả thẻ ảnh để di chuyển giữa các ô (tự động neo về góc ô gần nhất). Hỗ trợ xóa ảnh và hoàn tác Ctrl+Z.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["chèn ảnh", "hình ảnh", "image", "picture", "minh họa", "ảnh ô", "kéo thả ảnh", "di chuyển ảnh", "drag image"],
    steps: [
      "Chọn ô đích muốn đặt ảnh. Mở tab Chèn, nhóm Minh họa, nhấn nút lớn Chèn ảnh (hoặc dùng menu Chèn).",
      "Chọn file ảnh trên máy tính rồi nhấn Mở. Ảnh được chèn lên bảng tính với góc trên bên trái neo vào ô đã chọn.",
      "Di chuyển ảnh: Nhấp giữ chuột trái trên khung ảnh (con trỏ chuột đổi thành biểu tượng di chuyển) rồi kéo đến vị trí mong muốn. Trong lúc kéo, ô lưới đích gần nhất sẽ được viền sáng nét đứt (.is-drop-target) giúp người dùng xác định rõ vị trí thả. Khi thả chuột, ảnh tự động căn chỉnh và neo chuẩn xác về góc ô đích. Nếu bảng tính có Freeze Panes, ảnh nằm trong vùng đóng băng sẽ giữ nguyên vị trí hiển thị khi cuộn.",
      "Hoàn tác di chuyển: Nhấn Ctrl+Z để đưa ảnh về vị trí ô trước đó, hoặc Ctrl+Y để làm lại thao tác di chuyển.",
      "Xóa ảnh: Nhấp vào nút dấu nhân (×) màu đỏ ở góc trên bên phải của thẻ ảnh. Có thể nhấn Ctrl+Z để khôi phục ảnh vừa xóa.",
      "Cùng tab Chèn còn có Biểu đồ và Biểu đồ thu nhỏ (sparkline) phục vụ trực quan hóa dữ liệu số."
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
      "Mỗi trang tính có danh sách hộp riêng. Hộp không đi cùng khi in như một đối tượng phần mềm bảng tính khác đầy đủ — dùng cho chú thích trên màn hình."
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
  },
  {
    id: "sheet.formula.functionCategories",
    app: "sheet",
    commandIds: [
      "sheet.formula.categoryFinancial",
      "sheet.formula.categoryLogical",
      "sheet.formula.categoryText",
      "sheet.formula.categoryDateTime",
      "sheet.formula.categoryLookup",
      "sheet.formula.categoryMath",
      "sheet.formula.categoryMore"
    ],
    title: "Thư viện hàm theo danh mục",
    summary: "Bảy nút trên tab Công thức mở cùng hộp «Chèn Hàm (Insert Function fx)» đã lọc sẵn một nhóm: Tài chính, Logic, Văn bản, Ngày & Giờ, Tra cứu, Toán học, hoặc Thống kê (nút Thêm hàm). Catalog hiện có 96 hàm thật.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["thư viện hàm", "tài chính", "pmt", "if", "vlookup", "today", "round", "thống kê", "danh mục hàm", "fx", "category"],
    steps: [
      "Tab Công thức, nhóm Hàm tính toán: sau AutoSum là bốn cột nút nhỏ — Tài chính / Logic / Văn bản; Ngày & Giờ / Tra cứu & Tham chiếu / Toán & Lượng giác; Thêm hàm (cùng cột Lớn nhất / Nhỏ nhất). Mỗi nút mở hộp 620 px «Chèn Hàm (Insert Function fx)» với danh mục tương ứng đã chọn sẵn.",
      "Tài chính (11 hàm): PMT, FV, PV, NPV, IRR, RATE, NPER, IPMT, PPMT, SLN, DB. Logic (11): IF, AND, OR, NOT, IFERROR, IFNA, ISBLANK, ISNUMBER, ISTEXT, ISERROR, ISNA. Văn bản (18): CONCAT, CONCATENATE, LEFT/RIGHT/MID, LEN, UPPER/LOWER/PROPER, TRIM, TEXT, VALUE, SUBSTITUTE, REPLACE không có — dùng SUBSTITUTE; FIND (phân biệt hoa thường), SEARCH (không phân biệt), TEXTJOIN, REPT, EXACT.",
      "Ngày tháng (13): TODAY, NOW, DATE, YEAR/MONTH/DAY, DATEDIF, EDATE, EOMONTH, WEEKDAY, DAYS, NETWORKDAYS, WORKDAY. Tra cứu (9): VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP, LOOKUP, CHOOSE, INDIRECT, OFFSET. Toán học (15): SUM, PRODUCT, ABS, ROUND/ROUNDUP/ROUNDDOWN, INT, MOD, SQRT, POWER, CEILING, FLOOR, TRUNC, SIGN, SUMPRODUCT. Thêm hàm mở nhóm Thống kê (19): AVERAGE, COUNT/COUNTA/COUNTBLANK, MIN/MAX, COUNTIF(S), SUMIF(S), AVERAGEIF(S), MEDIAN, RANK, RANK.EQ, LARGE, SMALL, STDEV, VAR.",
      "Trong hộp: ô «Tìm kiếm hàm» lọc theo tên hoặc mô tả; khung phải hiện cú pháp (=VLOOKUP(...)) và mô tả tiếng Việt. Nhấp đúp hoặc «Chèn hàm vào ô» chèn =TÊN_HÀM(...) vào ô đang chọn. Hủy bỏ / Esc đóng. Cùng hộp cũng mở bằng Chèn hàm (Shift+F3) hoặc nút fx trên thanh công thức — bài «Công thức và hàm cơ bản»."
    ]
  },
  {
    id: "sheet.formula.namedRanges",
    app: "sheet",
    commandIds: [
      "sheet.formula.nameManager",
      "sheet.formula.defineName",
      "sheet.formula.useInFormula",
      "sheet.formula.createFromSelection"
    ],
    title: "Đặt tên vùng và dùng tên trong công thức",
    summary: "Đặt tên cho ô/vùng (ví dụ BangLuong) rồi dùng =SUM(BangLuong) thay cho A2:A100. Quản lý tên thêm/sửa/xóa; Tạo từ vùng chọn (Ctrl+Shift+F3) lấy tiêu đề hàng trên làm tên cột.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tên đã xác định" },
    keywords: ["quản lý tên", "name manager", "đặt tên vùng", "named range", "ctrl+shift+f3", "dùng trong công thức", "tạo từ vùng chọn"],
    steps: [
      "Tab Công thức, nhóm Tên đã xác định: nút lớn Quản lý tên; cột Đặt tên vùng / Dùng trong công thức / Tạo từ vùng chọn (Ctrl+Shift+F3). Quản lý tên không có phím tắt riêng trên ribbon này.",
      "Đặt tên vùng: hộp «Đặt tên vùng (Define Name)» — Tên (ví dụ BangLuong, DonGia), Phạm vi Workbook (toàn bảng) hoặc Sheet hiện tại, Tham chiếu đến (điền sẵn vùng đang bôi, dạng A1 hoặc A1:B10). Tên chỉ gồm chữ, số, gạch dưới, bắt đầu bằng chữ hoặc _; không được trùng địa chỉ ô kiểu A1; không dấu cách. Tên hoặc vùng không hợp lệ / trùng hiện «Tên không hợp lệ hoặc đã tồn tại.»",
      "Quản lý tên («Trình quản lý tên»): danh sách tên + vùng + phạm vi. Thêm mới / Sửa / Xóa. Form có Tên, Vùng tham chiếu, Phạm vi (không đổi phạm vi khi sửa). Lưu. Danh sách trống hiện «Chưa có vùng được đặt tên.»",
      "Dùng trong công thức: nếu chưa có tên nào thì mở luôn Trình quản lý tên. Có tên thì hộp «Dùng tên trong công thức (Paste Name)» — chọn tên rồi chèn vào thanh công thức (ô trống thành =TenVung). Tạo từ vùng chọn: bôi bảng gồm hàng tiêu đề trên; mỗi cột lấy chữ hàng đầu, bỏ ký tự lạ thành _, đặt tên Workbook cho dải dưới tiêu đề (B1 «Don gia» → Don_gia = B2:B10). Cần ít nhất 2 hàng. Dùng tên trong công thức: =SUM(Don_gia). Ctrl+Z hoàn tác lần lưu/xóa."
    ]
  },
  {
    id: "sheet.formula.auditing",
    app: "sheet",
    commandIds: [
      "sheet.formula.tracePrecedents",
      "sheet.formula.traceDependents",
      "sheet.formula.removeArrows",
      "sheet.formula.showFormulas",
      "sheet.formula.errorChecking",
      "sheet.formula.watchWindow",
      "sheet.view.toggleFormulas"
    ],
    title: "Kiểm tra công thức: mũi tên, lỗi và cửa sổ theo dõi",
    summary: "Vẽ mũi tên tới ô tiền lệ (xanh dương) hoặc ô phụ thuộc (xanh lá), hiện chuỗi công thức thay vì kết quả (Ctrl+`), quét lỗi #DIV/0! / #REF!…, và mở cửa sổ theo dõi giá trị ô nổi có thể kéo di chuyển.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Kiểm tra công thức" },
    keywords: ["trace", "tiền lệ", "phụ thuộc", "precedents", "dependents", "mũi tên", "hiện công thức", "ctrl+`", "kiểm tra lỗi", "watch window", "cửa sổ theo dõi", "ước lượng công thức"],
    steps: [
      "Chọn ô có công thức. Tab Công thức, nhóm Kiểm tra công thức: cột Tìm ô tiền lệ / Tìm ô phụ thuộc / Xóa mũi tên; cột Hiện công thức / Kiểm tra lỗi / Ước lượng công thức; nút lớn Cửa sổ theo dõi.",
      "Tìm ô tiền lệ phân tích công thức (ô đơn, dải A1:B10, named range) rồi vẽ mũi tên SVG xanh dương (#2563EB) từ ô nguồn tới ô đang chọn, viền nét đứt class precedent. Tìm ô phụ thuộc quét cả sheet, mũi tên xanh lá (#0F6D38) tới các ô công thức đang tham chiếu ô này. Ô không có công thức thì tiền lệ trả danh sách rỗng. Xóa mũi tên gỡ mọi đường và viền.",
      "Hiện công thức (cùng lệnh với phím Ctrl+` — sheet.view.toggleFormulas, không có nút riêng trên tab Chế độ xem) bật/tắt lớp is-formula-view-mode: ô hiện chuỗi =SUM(...) thay vì kết quả. Nhấn lại để về giá trị.",
      "Kiểm tra lỗi: hộp «Kiểm tra lỗi công thức (Error Checking)» quét mã #DIV/0! (chia 0/ô trống), #REF!, #VALUE! (sai kiểu), #N/A, #NAME?, #NUM!. Không lỗi thì báo «Không tìm thấy ô nào có giá trị lỗi». Có lỗi: bảng Ô / Mã lỗi / Công thức / Nguyên nhân — nhấp hàng để nhảy tới ô.",
      "Cửa sổ theo dõi (Watch Window): Mở cửa sổ nổi có thể kéo di chuyển bằng thanh tiêu đề. Bảng theo dõi chuẩn phần mềm bảng tính khác với 6 cột: Sổ làm việc, Trang tính, Tên (nếu ô thuộc vùng đặt tên), Ô, Giá trị, Công thức. Nhấn «+ Thêm ô theo dõi» để nhập tọa độ ô đơn (ví dụ B5), dải ô (A1:A5) hoặc ô ở trang tính khác (Sheet2!C10). Dùng phím mũi tên lên/xuống để duyệt, nhấn Enter hoặc nhấp đúp hàng để chuyển ngay tới ô đó, nhấn Delete hoặc nút Xóa để bỏ theo dõi ô đang chọn, và nhấn Esc để đóng cửa sổ."
    ]
  },
  {
    id: "sheet.formula.calculation",
    app: "sheet",
    commandIds: [
      "sheet.calc.calculationOptions",
      "sheet.calc.modeAutomatic",
      "sheet.calc.modeManual",
      "sheet.calc.calculateSheet",
      "sheet.formula.recalculate",
      "sheet.formula.arrayEnter"
    ],
    title: "Chế độ tính toán, F9 và công thức mảng",
    summary: "Mặc định Tự động: sửa ô nguồn là tính lại ngay. Thủ công giữ nguyên kết quả cũ cho tới F9 (toàn workbook) hoặc Shift+F9 (trang hiện tại). Ctrl+Shift+Enter nhập công thức mảng cho vùng đã bôi.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tính toán" },
    keywords: ["tính toán", "tự động", "thủ công", "manual", "f9", "shift+f9", "công thức mảng", "ctrl+shift+enter", "array formula", "tính lại"],
    steps: [
      "Tab Công thức, nhóm Tính toán: hộp chọn Tự động (Automatic) / Thủ công (Manual), nút Tính lại toàn bộ (F9), Tính trang hiện tại (Shift+F9). Hai lệnh modeAutomatic / modeManual không có nút riêng — chúng là giá trị của hộp Tùy chọn tính toán.",
      "Tự động (mặc định): mỗi lần setCellValue chạy tính lại phụ thuộc. Thủ công: sửa A1 không đổi ô =A1*2 cho tới khi nhấn F9 (mọi sheet) hoặc Shift+F9 (chỉ sheet đang mở). Chuyển từ Thủ công về Tự động sẽ tính lại toàn bộ ngay.",
      "Công thức mảng không có nút ribbon: bôi vùng kết quả, gõ công thức bắt đầu bằng = trên thanh công thức, nhấn Ctrl+Shift+Enter. Engine evaluateArray; số phần tử kết quả phải khớp số ô đã bôi — lệch thì lệnh không ghi. Mỗi ô mang cờ isArrayFormula và arrayRange chung.",
      "F9 / Shift+F9 dùng cả khi đang Tự động (ép tính lại). Ctrl+Z hoàn tác lần nhập mảng. Công thức thường (không mảng) xác nhận bằng Enter."
    ]
  },
  {
    id: "sheet.edit.pasteSpecialHelp",
    app: "sheet",
    commandIds: ["sheet.edit.pasteSpecial"],
    title: "Dán đặc biệt",
    summary: "Sau khi Copy, Ctrl+Alt+V (hoặc nút Dán đặc biệt trên nhóm Bảng nhớ tạm) mở hộp chọn: Tất cả, Chỉ giá trị, Chỉ công thức, Chỉ định dạng, hoặc Chuyển vị hàng/cột.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["dán đặc biệt", "paste special", "ctrl+alt+v", "chỉ giá trị", "công thức", "định dạng", "chuyển vị", "transpose"],
    steps: [
      "Bôi vùng nguồn, Copy (Ctrl+C) hoặc Cut. Chọn ô đích. Tab Trang đầu, nhóm Bảng nhớ tạm: nút Dán đặc biệt nằm hàng dưới Cut/Copy, cạnh Sao chép định dạng — hoặc Ctrl+Alt+V.",
      "Hộp «Dán đặc biệt», nhóm Dán: Tất cả (mặc định), Chỉ giá trị (bỏ công thức, giữ số/chữ đã tính), Chỉ công thức, Chỉ định dạng, Chuyển vị (đổi hàng/cột). Enter hoặc nút áp dụng để dán. Esc hủy.",
      "Chưa Copy thì hộp không mở (cần clipboard nội bộ có cells). Chuyển vị dán hàng thành cột và ngược lại.",
      "Ctrl+Z hoàn tác lần dán. Dán thường (Ctrl+V) vẫn dán tất cả, không hỏi."
    ]
  },
  {
    id: "sheet.nav.keyboardSelect",
    app: "sheet",
    commandIds: [
      "sheet.nav.home",
      "sheet.nav.end",
      "sheet.cell.edit",
      "sheet.select.column",
      "sheet.select.row"
    ],
    title: "Phím tắt: về A1, ô cuối, sửa ô, chọn hàng/cột",
    summary: "Năm lệnh không có nút ribbon: Ctrl+Home về A1, Ctrl+End tới ô cuối có dữ liệu, F2 sửa ô trên thanh công thức, Ctrl+Space chọn cả cột, Shift+Space chọn cả hàng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["ctrl+home", "ctrl+end", "f2", "ctrl+space", "shift+space", "chọn cột", "chọn hàng", "sửa ô", "ô a1"],
    steps: [
      "Không có năm nút này trên ribbon — chỉ phím tắt (và chuột: nhấp chữ cột / số hàng).",
      "Ctrl+Home chọn A1 và kéo thanh cuộn về trái. Ctrl+End nhảy tới ô xa nhất vừa có giá trị vừa có công thức trên sheet đang mở (không tính ô trống).",
      "F2 đưa con trỏ vào thanh công thức, đặt caret cuối chuỗi — sửa công thức/giá trị rồi Enter xác nhận, Esc hủy.",
      "Ctrl+Space chọn từ hàng 1 tới hàng cuối lưới của cột đang đứng. Shift+Space chọn từ cột A tới cột cuối của hàng đang đứng. Dùng trước Điền xuống / Xóa / định dạng cả hàng."
    ]
  },
  {
    id: "sheet.view.zoomWindowExtra",
    app: "sheet",
    commandIds: ["sheet.view.zoomToSelection", "sheet.view.newWindow"],
    title: "Thu phóng vừa vùng chọn và cửa sổ mới",
    summary: "Vừa vùng chọn co/giãn lưới 50%–200% để khối ô đang bôi khớp khung nhìn. Cửa sổ mới mở thêm tab/cửa sổ trình duyệt cùng URL; trình duyệt chặn pop-up thì báo trên thanh trạng thái.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Thu phóng" },
    keywords: ["vừa vùng chọn", "zoom to selection", "cửa sổ mới", "new window", "pop-up", "thu phóng vùng"],
    steps: [
      "Bôi một ô hoặc một khối. Tab Chế độ xem, nhóm Thu phóng, nhấn Thu phóng vùng chọn (cạnh 100%). Tỉ lệ = min(rộng khung, cao khung) so với khối (mỗi cột ~85 px + 40, mỗi hàng ~26 px + 30), kẹp 50%–200%, làm tròn 0.1.",
      "Cùng tab, nhóm Cửa sổ: Cửa sổ mới (nút lớn, cạnh Cố định hàng/cột) mở một cửa sổ Sheet mới. Nếu trình duyệt chặn: thanh trạng thái «Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho 3T Office.»",
      "Cửa sổ mới là phiên bản độc lập trên tab khác, không nhân bản undo của cửa sổ cũ.",
      "Phóng to / thu nhỏ / 100% nằm cùng nhóm Thu phóng — bài «Thu phóng bảng tính»."
    ]
  },
  {
    id: "sheet.review.spellCheck",
    app: "sheet",
    commandIds: ["sheet.review.spellCheck"],
    title: "Kiểm tra chính tả tiếng Việt trên trang tính",
    summary: "F7 (khi đang ở Sheet) hoặc nút Chính tả quét các ô chữ của sheet hiện tại — bỏ qua số, công thức, ô trống. Hộp thoại Bỏ qua / Thay thế / Thêm vào từ điển, dùng chung từ điển cá nhân với Doc và Slide.",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Chứng minh" },
    keywords: ["chính tả", "spell check", "f7", "từ điển", "tiếng việt", "bỏ qua", "thay thế", "ctrl+z"],
    steps: [
      "Tab Xem xét, nhóm Chứng minh, nhấn nút lớn Chính tả — hoặc nhấn phím F7 khi cửa sổ Sheet đang hoạt động.",
      "Hộp «Chính tả» (460 px) quét ô có chữ cái, bỏ qua công thức (=...), số và ô trống theo thứ tự bảng tính. Hiển thị từ chưa có trong từ điển, tọa độ ô, nội dung ô và danh sách các từ gợi ý tiếng Việt chuẩn.",
      "Hỗ trợ đầy đủ các thao tác: Bỏ qua, Bỏ qua tất cả (trong phiên làm việc), Thêm vào từ điển (lưu vào bộ nhớ dùng chung bộ ba Doc, Sheet, Slide: vno-spellcheck-vi-personal), Thay thế, Thay thế tất cả và Đóng (hoặc nhấn Esc).",
      "Thao tác thay thế từ trong ô đi qua hệ thống dữ liệu bảng tính nên bạn có thể nhấn Ctrl+Z để hoàn tác ngay lập tức.",
      "Sheet không gạch chân trực tiếp trên lưới để bảo vệ tốc độ cuộn và hiển thị hàng ngàn ô dữ liệu tương tự các ứng dụng bảng tính lớn."
    ]
  },
  {
    id: "sheet.review.commentInsert",
    app: "sheet",
    commandIds: ["sheet.review.commentInsert"],
    title: "Thêm hoặc sửa ghi chú ô",
    summary: "Gắn ghi chú (tối đa 2000 ký tự) vào ô đang chọn. Ô đã có ghi chú thì hộp mở ở chế độ sửa, có nút Xóa. Chuột phải ô → Thêm ghi chú (Shift+F2).",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Ghi chú" },
    keywords: ["ghi chú", "nhận xét", "comment", "shift+f2", "ghi chú ô", "tác giả"],
    steps: [
      "Chọn ô. Tab Xem xét, nhóm Ghi chú, nhấn nút lớn Ghi chú mới — cùng lệnh cũng có trên tab Chèn, nhóm Ghi chú. Chuột phải ô → Thêm ghi chú (Shift+F2).",
      "Ô trống: hộp «Ghi chú mới A1» — Nội dung ghi chú (bắt buộc, tối đa 2000 ký tự), Tác giả (mặc định «Người dùng 3T Office», tối đa 100). Thêm ghi chú. Để trống nội dung bị báo «Nội dung ghi chú không được để trống.»",
      "Ô đã có ghi chú: hộp «Sửa ghi chú A1», nút Lưu thay đổi và Xóa ghi chú. Ô có ghi chú hiện dấu góc; Đã xử lý đổi dấu xám — bài «Duyệt và xử lý nhận xét ô».",
      "Ctrl+Z hoàn tác thêm/sửa/xóa. Ghi chú theo từng sheet, lưu trong file."
    ]
  },
  {
    id: "sheet.page.printAreaBreaks",
    app: "sheet",
    commandIds: [
      "sheet.page.setPrintArea",
      "sheet.page.clearPrintArea",
      "sheet.page.insertPageBreak",
      "sheet.page.removePageBreak"
    ],
    title: "Vùng in và ngắt trang",
    summary: "Đặt khối đang bôi làm vùng in (chỉ phần đó ra giấy/PDF); xóa vùng in để in theo dữ liệu. Chèn ngắt trang ghi cả ngắt hàng và ngắt cột tại ô đang chọn — thấy rõ ở Xem ngắt trang.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["vùng in", "print area", "ngắt trang", "page break", "xóa vùng in", "in excel"],
    steps: [
      "Bôi vùng cần in. Tab Bố trí trang, nhóm Thiết lập trang: Đặt vùng in (nút lớn) ghi nhãn vùng (ví dụ A1:G40) theo sheet; Xóa vùng in gỡ vùng (không làm gì nếu chưa đặt).",
      "Cùng nhóm Thiết lập trang: Chèn ngắt trang (nút lớn) thêm ngắt tại hàng và cột của ô đang chọn (ví dụ đứng C15 → ngắt trước hàng 15 và trước cột C). Xóa ngắt trang gỡ đúng cặp hàng/cột đó. Trùng ngắt đã có thì lệnh không thêm lần nữa.",
      "Xem đường chia: tab Chế độ xem → Xem ngắt trang (đường xanh, vùng ngoài khổ in tối). Ctrl+Z hoàn tác lần đặt vùng / chèn ngắt.",
      "Lề, hướng, khổ giấy, tỷ lệ vừa trang: nhóm Thiết lập trang — bài «Thiết lập trang in nâng cao»."
    ]
  },
  {
    id: "sheet.insert.sparklines",
    app: "sheet",
    commandIds: ["sheet.insert.sparklineLine", "sheet.insert.sparklineColumn"],
    title: "Biểu đồ thu nhỏ trong ô (sparkline)",
    summary: "Bôi dải số rồi chèn sparkline Đường hoặc Cột vào ô đang active. Mini-chart nằm trong ô, lấy các giá trị số của vùng nguồn; vùng không có số thì không chèn.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Biểu đồ thu nhỏ" },
    keywords: ["sparkline", "biểu đồ thu nhỏ", "biểu đồ mini", "đường", "cột", "xu hướng"],
    steps: [
      "Bôi dải số (một hàng hoặc một cột, ví dụ B2:G2). Ô active (ô neo, thường là góc) là nơi vẽ sparkline — muốn sparkline ở H2 thì bôi B2:G2 rồi Shift-nhấp H2, hoặc chọn H2 sau khi copy vùng nguồn. Tab Chèn, nhóm Biểu đồ thu nhỏ: nút lớn Đường hoặc Cột.",
      "Đường vẽ sparkline type line; Cột type column. Chỉ lấy ô có số hữu hạn (bỏ ₫, %, khoảng trắng). Không có số → không chèn.",
      "Sparkline gắn vào ô neo, không phải đối tượng nổi. Khác Biểu đồ lớn ở nhóm Biểu đồ cùng tab Chèn.",
      "Ctrl+Z gỡ sparkline vừa chèn. Xóa nội dung ô cũng mất sparkline nếu dùng Xóa tất cả."
    ]
  },
  {
    id: "sheet.style.tableAndCells",
    app: "sheet",
    commandIds: ["sheet.style.formatAsTable", "sheet.style.cellStyles"],
    title: "Định dạng bảng và kiểu ô",
    summary: "Định dạng bảng tô hàng tiêu đề đậm + hàng xen kẽ (5 mẫu màu). Kiểu ô áp một preset lên vùng chọn: Tốt/Kém/Trung tính, Tiêu đề 1/2, Ô nhập liệu, Tiền tệ ₫, Tổng cộng, Điểm nhấn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
    keywords: ["định dạng bảng", "format as table", "kiểu ô", "cell styles", "tốt", "kém", "banded rows", "tiền tệ"],
    steps: [
      "Bôi vùng. Tab Trang đầu, nhóm Kiểu ô: Định dạng có điều kiện (nút lớn, bài riêng) rồi cột Định dạng bảng / Kiểu ô.",
      "Định dạng bảng — hộp «Định dạng theo bảng (Format as Table)» (650 px) hiện «Vùng áp dụng bảng: A1:D10» (nhãn vùng đang bôi) và 5 mẫu: Bảng Xanh Lam (#2563eb), Xanh Lá (#16a34a), Xám Đậm (#334155), Cam Ấm (#ea580c), Tím Hiện Đại (#7c3aed). Hàng đầu chữ trắng nền màu; hàng chẵn/lẻ xen kẽ. Nhấp mẫu để áp ngay. Esc / × đóng.",
      "Kiểu ô — hộp «Thư viện kiểu ô (Cell Styles)» (720 px), lưới 2 cột: Bình thường (xóa màu, chữ #0f172a 13px), Tốt (nền #c6efce chữ #006100), Kém / Xấu (#ffc7ce / #9c0006), Trung tính (#ffeb9c / #9c6500), Tiêu đề 1 (16px đậm #1e3a8a, gạch dưới 2px), Tiêu đề 2 (14px, gạch 1px), Ô nhập liệu (nền #fff2cc), Tiền tệ (căn phải, ký hiệu ₫ sau số, 0 thập phân), Tổng cộng (viền trên đơn, dưới đôi), Điểm nhấn (nền #dbeafe). Nhấp thẻ áp ngay cho vùng chọn.",
      "Đây là tô kiểu, không tạo đối tượng Table phần mềm bảng tính khác (không auto-filter riêng). Ctrl+Z hoàn tác. Xóa định dạng (menu Xóa) gỡ màu/kiểu, giữ số."
    ]
  },
  {
    id: "sheet.edit.fillAndClear",
    app: "sheet",
    commandIds: [
      "sheet.edit.fillDown",
      "sheet.edit.fillRight",
      "sheet.edit.clearAll",
      "sheet.edit.clearFormats",
      "sheet.edit.clearContents"
    ],
    title: "Điền xuống/phải và xóa nội dung hay định dạng",
    summary: "Ctrl+D sao chép ô trên xuống (công thức tự lệch hàng); Ctrl+R sao chép sang phải (lệch cột). Menu Xóa: Tất cả, chỉ định dạng, hoặc chỉ nội dung (giữ kiểu).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["điền xuống", "điền phải", "ctrl+d", "ctrl+r", "xóa tất cả", "xóa định dạng", "xóa nội dung", "fill down", "clear"],
    steps: [
      "Tab Trang đầu, nhóm Chỉnh sửa: menu Điền (nút lớn) gồm Điền xuống (Ctrl+D) và Điền phải (Ctrl+R); menu Xóa gồm Xóa tất cả / Xóa định dạng / Xóa nội dung. Chuột phải ô cũng có Xóa nội dung (Delete).",
      "Điền xuống: bôi từ ô nguồn xuống các ô đích — ô đầu là nguồn, các ô dưới nhận bản sao; công thức =A1 thành =A2, =A3… (lệch hàng). Nếu chỉ chọn 1 hàng, nguồn là hàng ngay phía trên (hàng 1 thì không điền được). Điền phải tương tự theo cột; chọn 1 cột thì lấy cột bên trái.",
      "Xóa tất cả: xóa giá trị, công thức và style. Xóa định dạng: giữ số/công thức, bỏ màu/viền/cỡ chữ. Xóa nội dung: xóa chữ và công thức, giữ style. Sheet đang bảo vệ thì Xóa tất cả / Xóa nội dung / Điền bị chặn.",
      "Ctrl+Z hoàn tác cả khối điền hoặc xóa. Delete mặc định gần với xóa nội dung, không xóa định dạng."
    ]
  },
  {
    id: "sheet.edit.findReplace",
    app: "sheet",
    commandIds: ["common.edit.find", "common.edit.replace"],
    title: "Tìm kiếm và Thay thế trong Sheet",
    summary: "Hộp thoại Tìm kiếm và Thay thế dùng chung phong cách phần mềm bảng tính khác cho Sheet. Hỗ trợ tìm trong Trang tính hoặc toàn bộ Sổ làm việc, tìm theo Hàng/Cột, tìm trong Công thức hoặc Giá trị, cùng Hoàn tác một bước (Ctrl+Z).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm", "thay thế", "find", "replace", "ctrl+f", "ctrl+h", "Sheet", "tìm kiếm", "công thức", "giá trị", "sổ làm việc"],
    steps: [
      "Truy cập: Mở tab Trang đầu trên thanh ribbon, vào nhóm Chỉnh sửa ở phía cuối bên phải và bấm Tìm kiếm (Ctrl+F) hoặc Thay thế (Ctrl+H) để mở hộp thoại Tìm kiếm và Thay thế gồm 2 tab.",
      "Tìm kiếm dữ liệu: Trong tab «Tìm» (Ctrl+F), nhập chuỗi vào ô «Tìm gì:». Bấm nút «Tìm tiếp» để nhảy tới ô khớp tiếp theo; bấm «Tìm trước» để lùi về ô khớp trước. Sheet tự động cuộn màn hình và kích hoạt ô được tìm thấy.",
      "Thay thế dữ liệu: Trong tab «Thay thế» (Ctrl+H), nhập nội dung cần thay đổi vào ô «Thay bằng:». Bấm «Thay thế» để đổi từng ô, hoặc bấm «Thay thế tất cả» để thay thế toàn bộ dữ liệu khớp và xem thông báo tổng số lượng thay thế đã thực hiện.",
      "Tùy chọn nâng cao trong Sheet: Thiết lập phạm vi trong phần mở rộng: «Tìm trong: Trang tính / Sổ làm việc» (tìm trên trang hiện hành hay quét qua tất cả các trang tính), «Tìm theo: Hàng / Cột» (thứ tự duyệt dữ liệu theo dòng hay theo cột), và «Tìm trong: Giá trị / Công thức» (tìm trong kết quả hiển thị hoặc trong chuỗi công thức tính toán).",
      "Tiếng Việt và bộ lọc từ: Hỗ trợ các tùy chọn «Khớp chữ hoa/thường», «Chỉ toàn bộ từ», và «Bỏ qua dấu» tiếng Việt. Cả chuỗi tìm và nội dung ô được chuẩn hóa Unicode NFC tự động, đảm bảo khớp chuẩn xác kể cả tổ hợp hay dựng sẵn.",
      "Đóng và Hoàn tác: Bấm Esc để đóng hộp thoại. Sau khi đóng, hệ thống vẫn lưu lại từ khóa tìm kiếm của phiên làm việc. Mọi thao tác «Thay thế tất cả» đều được ghi nhận thành đúng 1 bước Hoàn tác (nhấn Ctrl+Z để hoàn tác toàn bộ các ô đã thay đổi cùng lúc)."
    ]
  },
  {
    id: "sheet.formula.evaluateFormula",
    app: "sheet",
    commandIds: ["sheet.formula.evaluateFormula"],
    title: "Ước lượng công thức (Evaluate Formula)",
    summary: "Mở hộp thoại xem từng bước tính của công thức đang chọn: phần sắp được tính được gạch chân và in nghiêng; mỗi lần nhấn Ước lượng thay phần đó bằng giá trị trung gian thật do ứng dụng tính. Chỉ xem, không sửa ô.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Kiểm tra công thức" },
    keywords: ["ước lượng công thức", "evaluate formula", "debug công thức", "bước vào", "step in", "giá trị trung gian", "công thức lồng nhau"],
    steps: [
      "Chọn ô đang chứa công thức (ô bắt đầu bằng dấu =, ví dụ F1 =IF(SUM(A1:A3)>10,B1*C1,D1+E1)). Mở tab Công thức, nhóm Kiểm tra công thức — nút Ước lượng công thức nằm cột Hiện công thức / Kiểm tra lỗi, ngay trên Cửa sổ theo dõi.",
      "Hộp «Ước lượng công thức» hiện tham chiếu Sheet!Ô, khung công thức dùng phông có độ rộng ký tự đều, và phần sắp tính được gạch chân + in nghiêng. Ví dụ bước 1 gạch chân SUM(A1:A3). Nhấn Ước lượng (hoặc Enter): ứng dụng tính phần đó rồi thay bằng giá trị (SUM thành 12 nếu A1:A3 là 5,4,3). Bước tiếp gạch chân 12>10, rồi nhánh IF được chọn (B1*C1), rồi kết quả cuối. Nhánh không được chọn không bị tính.",
      "Nếu phần đang gạch chân là một ô khác có công thức riêng, nút Bước vào mở công thức của ô đó. Bước ra trở về công thức đang ước lượng. Khởi động lại đưa về công thức gốc. Đóng hoặc Esc tắt hộp — không ghi gì vào ô, không tạo Undo.",
      "Dòng «Giá trị hiện tại của ô» dùng để đối chiếu: khi ước lượng xong, kết quả cuối phải khớp giá trị đang hiện trên lưới. Ô không có công thức thì hộp báo «Ô đang chọn không chứa công thức» và chỉ còn nút Đóng. Độ chi tiết: bước theo nhóm hàm/so sánh/nhánh IF/phép toán, không thay từng token ô lẻ như phần mềm bảng tính khác đầy đủ."
    ]
  },
  {
    id: "sheet.data.consolidate",
    app: "sheet",
    commandIds: ["sheet.data.consolidate"],
    title: "Hợp nhất dữ liệu (Consolidate)",
    summary: "Gộp nhiều vùng số từ các trang tính khác nhau trong cùng workbook thành một bảng tổng hợp tại ô đang chọn, dùng SUM / AVERAGE / COUNT / MAX / MIN. Có thể gộp theo vị trí (cùng vị trí) hoặc theo nhãn hàng trên / cột trái.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["hợp nhất", "consolidate", "gộp dữ liệu", "tổng hợp nhiều sheet", "sum nhiều trang", "nhãn hàng trên", "cột trái", "dữ liệu"],
    steps: [
      "Chuẩn bị dữ liệu nguồn trên ít nhất hai trang tính (ví dụ «Dự toán chi phí» A1:B5 và «Kế hoạch Q3» A1:B5). Chuyển sang trang đích, chọn ô góc trên-trái nơi muốn đặt bảng tổng (ví dụ «Nhân sự»!A1).",
      "Mở tab Dữ liệu, nhóm Công cụ dữ liệu — nút Hợp nhất dữ liệu nằm cạnh Tách văn bản, Điền nhanh và Xóa trùng lặp. Hộp «Hợp nhất dữ liệu» hiện hàm (mặc định SUM), ô nhập Tham chiếu, danh sách Tất cả tham chiếu, và hai hộp nhãn.",
      "Nhập vùng dạng TênTrang!A1:B5 rồi nhấn Thêm (hoặc Enter). Có thể lấy từ trang khác: nhấn Duyệt, hộp thu nhỏ, bấm chọn ô thật trên lưới (được phép đổi tab trang tính), nhấn Chọn, rồi Thêm. Xóa bỏ tham chiếu đang chọn trong danh sách bằng nút Xóa. Lặp cho từng vùng nguồn.",
      "Không tick nhãn: gộp theo vị trí — mọi vùng phải cùng số hàng và số cột; ô cùng vị trí được đưa vào hàm. Tick «Nhãn ở hàng trên» và/hoặc «Nhãn ở cột trái»: gộp theo nhãn (không phân biệt hoa thường sau khi xóa khoảng trắng); trục không có nhãn vẫn theo vị trí và yêu cầu cùng kích thước. Nhấn Đồng ý: ứng dụng tính SUM/AVERAGE/COUNT/MAX/MIN thật rồi ghi giá trị tĩnh vào ô đích. Ctrl+Z / Ctrl+Y hoàn tác hoặc làm lại cả khối. Không gộp sổ làm việc trong tệp khác; không tạo liên kết công thức về nguồn."
    ]
  },
  {
    id: "sheet.accessibility.keyboardNav",
    app: "sheet",
    commandIds: ["common.file.backstage"],
    title: "Điều hướng bằng bàn phím và trợ năng (Sheet)",
    summary: "Thao tác hoàn toàn bằng bàn phím không cần dùng chuột trên bảng tính: di chuyển ô bằng phím mũi tên, Enter, Tab; mở hộp thoại Định dạng ô bằng phím tắt Ctrl+1; bẫy tiêu điểm bên trong hộp thoại (kể cả khi chuyển tab) và tự động khôi phục tiêu điểm về ô lưới sau khi nhấn Escape.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trợ năng" },
    keywords: ["bàn phím", "phím tắt", "trợ năng", "accessibility", "keyboard", "tiêu điểm", "ctrl+1", "esc", "tab", "lưới", "ô"],
    steps: [
      "Di chuyển trên lưới ô tính: Dùng các phím mũi tên Lên/Xuống/Trái/Phải để chuyển qua các ô lân cận. Phím Tab di chuyển sang ô bên phải, Shift+Tab sang ô bên trái. Phím Enter di chuyển xuống ô bên dưới, Shift+Enter lên ô bên trên. Dùng Ctrl+Home để nhảy về ô A1 và Ctrl+End về ô cuối cùng có dữ liệu.",
      "Nhập dữ liệu và công thức: Khi đang chọn một ô, chỉ cần gõ trực tiếp chữ số hoặc công thức (ví dụ: =SUM(A1:A10) hoặc =100+250) rồi nhấn Enter để xác nhận và tự động tính kết quả. Nhấn F2 để vào chế độ chỉnh sửa nội dung ô mà không làm mất dữ liệu hiện có.",
      "Mở hộp thoại Định dạng ô (Ctrl+1): Nhấn tổ hợp phím Ctrl+1 tại bất kỳ ô nào để mở hộp thoại Định dạng ô toàn diện. Tiêu điểm sẽ tự động bẫy trong hộp thoại. Phím Tab và Shift+Tab chuyển qua lại giữa các trường nhập số, kiểu canh lề, phông chữ và viền. Ngay cả khi các tab khác đang ẩn, phím Tab không bao giờ bị rơi ra ngoài lưới nền.",
      "Đóng hộp thoại và khôi phục tiêu điểm: Nhấn phím Escape để đóng hộp thoại Định dạng ô. Tiêu điểm lập tức được khôi phục chính xác về ô bạn đang chọn trước đó, cho phép bạn tiếp tục điều hướng bằng các phím mũi tên ngay mà không cần dùng chuột.",
      "Mở menu Tệp (Backstage) bằng Alt+F: Menu mở ra và tiêu điểm đặt vào nút 'Quay lại'. Dùng mũi tên Lên/Xuống để duyệt danh sách lệnh, phím Escape để đóng menu trở về lưới ô tính."
    ]
  },
  {
    id: "sheet.macro.basics",
    app: "sheet",
    commandIds: ["common.macro.recordToggle", "common.macro.manager"],
    title: "Ghi và quản lý Macro trong bảng tính",
    summary: "Tự động hóa các chuỗi thao tác thường dùng trong Sheet như tô màu, căn lề, sắp xếp, lọc dữ liệu. Bật/dừng ghi bằng Ctrl+Shift+R và quản lý danh sách macro bằng Alt+F8.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Macro" },
    keywords: ["macro", "ghi macro", "dừng ghi", "quản lý macro", "xem macro", "tự động hóa", "record macro", "alt+f8", "ctrl+shift+r"],
    steps: [
      "Bắt đầu ghi: Mở tab Chế độ xem trên thanh Ribbon, tại nhóm Macro nhấn nút «Ghi Macro» (hoặc bấm phím tắt Ctrl+Shift+R). Biểu tượng nút chuyển sang dừng ghi màu đỏ và nhãn đổi thành «Dừng ghi» kèm chỉ báo nhấp nháy trực quan.",
      "Thực hiện thao tác: Thực hiện các lệnh bảng tính cần tự động hóa (ví dụ: bôi đậm ô, căn giữa, đổi màu nền ô, sắp xếp tăng dần A-Z, chèn hàng/cột...).",
      "Dừng và lưu: Nhấn lại nút «Dừng ghi» trên Ribbon (hoặc Ctrl+Shift+R). Hộp thoại hiển thị yêu cầu nhập tên cho Macro, điền tên mong muốn và bấm OK.",
      "Quản lý và phát lại: Nhấn nút «Xem Macro» trong nhóm Macro (hoặc bấm Alt+F8) để mở danh sách Macro. Bấm «▶ Chạy» để thực thi ngay chuỗi lệnh trên vùng ô đang chọn, «Đổi tên» hoặc «Xóa» khi cần chỉnh lý.",
      "Giới hạn trung thực: Macro cơ bản chỉ ghi lại các lệnh đi qua lệnh định dạng và chỉnh sửa của Sheet (định dạng ô, sắp xếp, căn chỉnh, chèn cấu trúc). Macro không ghi nhận việc gõ nhập ký tự tự do từng phím vào ô tính nếu không qua lệnh xác nhận. Macro được lưu cục bộ theo Sheet và không chạy chéo sang Doc hoặc Slide."
    ]
  },
  {
    id: "sheet.ai.explainFormula",
    app: "sheet",
    commandIds: ["sheet.ai.explainFormula"],
    title: "Giải thích công thức (AI)",
    summary: "AI giải thích công thức trong ô đang chọn bằng tiếng Việt dễ hiểu: công thức đang làm gì, tham chiếu tới đâu, kết quả mang ý nghĩa gì.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "Phân tích dữ liệu AI" },
    keywords: ["giải thích công thức", "explain formula", "công thức", "formula", "giải thích AI", "AI formula", "ô công thức"],
    steps: [
      "Chọn ô đang chứa công thức (bắt đầu bằng dấu =). Nếu ô không có công thức, hệ thống sẽ thông báo.",
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm Phân tích dữ liệu AI nhấn nút «Giải thích công thức».",
      "AI sẽ phân tích công thức và giải thích bằng tiếng Việt trong bảng Trợ lý 3T AI bên phải: công thức đang làm gì, tham chiếu tới ô/vùng nào, kết quả mang ý nghĩa gì.",
      "Nếu công thức phức tạp, AI sẽ giải thích từng phần của công thức.",
      "Lưu ý: Kết quả phụ thuộc vào AI provider đang dùng. Chế độ quy tắc cục bộ chỉ đưa ra gợi ý chung."
    ]
  },
  {
    id: "sheet.ai.formulaFromDescription",
    app: "sheet",
    commandIds: ["sheet.ai.formulaFromDescription"],
    title: "Tạo công thức từ mô tả (AI)",
    summary: "AI tạo công thức phần mềm bảng tính khác tương thích Sheet từ mô tả bằng ngôn ngữ tự nhiên. Công thức được kiểm tra trước khi áp dụng — chỉ dùng hàm Sheet hỗ trợ.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "Phân tích dữ liệu AI" },
    keywords: ["tạo công thức", "formula from description", "công thức AI", "sinh công thức", "mô tả công thức", "tự động công thức"],
    steps: [
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm Phân tích dữ liệu AI nhấn nút «Tạo công thức».",
      "Hộp thoại «Tạo công thức từ mô tả» xuất hiện. Nhập mô tả công thức bạn muốn bằng ngôn ngữ tự nhiên, ví dụ: «tính tổng cột B khi cột A lớn hơn 100», «đếm số ô có giá trị > 50 trong vùng D1:D100».",
      "Nhấn «Tạo công thức». AI sẽ tạo công thức phần mềm bảng tính khác tương thích với Sheet.",
      "Kết quả hiển thị trong bảng Trợ lý 3T AI: công thức dạng chữ trên nền xám để xem trước. Nhấn «Áp dụng vào ô đang chọn» để ghi công thức vào ô.",
      "Công thức được kiểm tra trước khi áp dụng — nếu chứa hàm Sheet chưa hỗ trợ, hệ thống sẽ báo lỗi rõ ràng thay vì ghi công thức lỗi vào ô.",
      "Lưu ý: Kết quả phụ thuộc vào AI provider đang dùng. Chế độ quy tắc cục bộ chỉ đưa ra gợi ý chung."
    ]
  },
  {
    id: "sheet.file.backstage",
    app: "sheet",
    commandIds: ["common.file.backstage", "common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print", "common.file.exportPdf"],
    title: "Menu Tệp (Backstage) và quản lý bảng tính",
    summary: "Mở menu Tệp toàn màn hình (Alt+F hoặc nút Tệp màu xanh góc trên-trái) để tạo bảng tính trống hoặc mẫu dự toán, mở tệp XLSX gần đây, lưu bảng tính, xem trước trang in trực tiếp và xuất PDF.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Trang tính" },
    keywords: ["tệp", "file", "backstage", "alt+f", "mẫu bảng tính", "tệp gần đây", "lưu", "in", "xuất pdf", "dự toán", "menu tệp"],
    steps: [
      "Mở menu Tệp: Nhấp vào nút màu xanh lá «Tệp» ở góc trên cùng bên trái thanh Ribbon hoặc nhấn tổ hợp phím Alt+F. Giao diện Backstage toàn màn hình sẽ mở ra với thanh điều hướng màu xanh bên trái và tiêu điểm tự động đặt vào nút 'Quay lại'.",
      "Màn hình Trang chủ: Cung cấp danh sách mẫu bảng tính chuẩn (Bảng tính trống, Dự toán kinh phí 3T Office) cùng bảng danh sách 'Tài liệu mở gần đây'.",
      "Chọn mẫu bảng tính: Dùng phím mũi tên Phải để đi vào lưới mẫu, dùng mũi tên duyệt và nhấn Enter hoặc Space để khởi tạo bảng tính theo mẫu đang chọn.",
      "Mở và quản lý tệp gần đây: Dùng phím mũi tên Xuống để chuyển xuống bảng tệp gần đây. Nhấp chuột hoặc bấm Enter để mở lại bảng tính. Nhấp nút 'Gỡ khỏi danh sách' (biểu tượng ×) trên mỗi hàng để loại bỏ tệp đã bị xóa khỏi máy. Nhấp nút 'Xóa lịch sử' nếu muốn xóa toàn bộ danh sách tệp gần đây.",
      "In bảng tính: Chọn mục «In» trong Tệp hoặc nhấn Ctrl+P. Hộp thoại In xem PDF theo Vùng in, thiết lập trang, tỷ lệ, tiêu đề lặp và ngắt trang. Nếu có phần mềm văn phòng khác, tùy chọn Dùng phần mềm văn phòng có sẵn trên máy để in được chọn sẵn; nhãn Bộ dựng trang in cho biết ứng dụng tạo trang xem trước. Bỏ chọn để dùng bộ dựng tích hợp của 3T Office.",
      "Xuất PDF riêng: mở Tệp → Xuất PDF và chọn nơi lưu. Sheet tạo bản XLSX qua cùng đường Lưu; nếu phần mềm văn phòng khác dùng được thì ứng dụng đó tạo PDF, nếu không bộ dựng tích hợp của 3T Office tiếp tục.",
      "Các thao tác tệp khác: 'Tạo mới' (Ctrl+N), 'Mở' (Ctrl+O), 'Lưu' (Ctrl+S), 'Lưu bản sao' (F12) và 'Xuất PDF' đều được bố trí trực quan và hỗ trợ phím tắt chuẩn Office.",
      "Đóng menu Tệp: Nhấn phím Escape hoặc nhấp nút '← Quay lại' ở góc trên bên trái bất kỳ lúc nào để đóng Backstage và khôi phục tiêu điểm chính xác về ô bảng tính bạn đang chọn trước đó."
    ]
  },
  {
    id: "sheet.file.saveDocument",
    app: "sheet",
    commandIds: ["common.file.save", "common.file.saveAs"],
    title: "Lưu bảng tính (Ctrl+S) và Lưu bản sao (F12)",
    summary: "Lưu bảng tính sang tệp thật trên đĩa máy tính thông qua ứng dụng. Hỗ trợ Ctrl+S lưu thẳng vào tệp đang mở như phần mềm bảng tính khác, F12 lưu bản sao và tôn trọng định dạng gốc .xls (phần mềm bảng tính khác 97-2003).",
    ribbon: { tab: "Tệp", tabId: "file", group: "Trang tính" },
    keywords: ["lưu bảng tính", "lưu file", "save", "save as", "ctrl+s", "f12", "xlsx", "xls", "lưu bản sao", "lưu tại chỗ"],
    steps: [
      "Lưu nhanh vào tệp đang mở (Ctrl+S): Nhấn phím tắt Ctrl+S hoặc nhấp biểu tượng đĩa mềm trên thanh truy cập nhanh ở góc trên bên trái. Nếu bảng tính đã có đường dẫn trên đĩa (XLSX, XLS, ODS, CSV), hệ thống sẽ lưu thẳng trực tiếp vào tệp đó mà không mở hộp thoại, kèm thông báo 'Đã lưu' trên thanh trạng thái.",
      "Lưu bảng tính mới: Nếu bảng tính vừa tạo mới chưa lưu lần nào, thao tác Ctrl+S hoặc nút Lưu sẽ tự động mở hộp thoại Lưu bản sao để bạn chọn thư mục và đặt tên tệp.",
      "Lưu bản sao (F12 / Tệp → Lưu bản sao): Nhấn F12 hoặc vào Tệp → Lưu bản sao, nhập tên rồi chọn XLSX, XLS, ODS, CSV hoặc PDF trong danh sách Loại tệp. Lưu XLSX sang ODS đổi tên tab và tiêu đề cửa sổ theo tệp mới; chọn PDF chỉ xuất bản sao, không đổi sổ đang mở. CSV chỉ chứa trang tính đang hoạt động: trước khi lưu, bấm tab trang tính cần xuất. Nếu sổ có nhiều trang tính, xác nhận cảnh báo để tiếp tục; chọn Hủy sẽ giữ nguyên tệp đích.",
      "Chế độ tương thích định dạng cũ (.xls): Khi mở một tệp .xls từ cơ quan hoặc ổ LAN, thao tác Ctrl+S sẽ lưu lại đúng chuẩn nhị phân chuẩn định dạng (.xls), không âm thầm chuyển đổi sang .xlsx.",
      "Bảo vệ dữ liệu nguyên tử: Hệ thống luôn ghi ra tệp tạm và thay thế nguyên tử (atomic replace); nếu có sự cố hoặc lỗi chuyển đổi, tệp gốc trên đĩa hoàn toàn không bị hư hại. Nếu tệp đang ở chế độ chỉ đọc hoặc bị khóa bởi tiến trình khác, hệ thống sẽ thông báo rõ ràng để bạn chọn Lưu bản sao."
    ]
  },
{
    id: "sheet.clipboard.cutCopyPaste",
    app: "sheet",
    commandIds: ["common.edit.cut", "common.edit.copy", "common.edit.paste"],
    title: "Cắt, Sao chép và Dán ô dữ liệu",
    summary: "Thao tác sao chép hoặc di chuyển dữ liệu giữa các ô, dòng hoặc cột trong bảng tính bằng Cắt (Ctrl+X), Sao chép (Ctrl+C) và Dán (Ctrl+V).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["cắt", "sao chép", "dán", "cut", "copy", "paste", "clipboard", "Ctrl+X", "Ctrl+C", "Ctrl+V", "ô dữ liệu"],
    steps: [
      "Chọn một ô hoặc kéo chuột bôi đen vùng ô cần thao tác trên bảng tính Sheet.",
      "Ngay sau khi mở sổ, lưới ô đang nhận bàn phím. Gõ giá trị rồi nhấn Enter để xác nhận và chọn ô phía dưới; nhấn F2 để sửa nội dung hiện có.",
      "Dùng Tab để xác nhận ô và chuyển sang ô bên phải. Sau một chuỗi Tab, Enter chuyển xuống hàng kế tiếp tại cột nơi chuỗi Tab bắt đầu (ví dụ bắt đầu ở A2 thì Enter chọn A3).",
      "Mở tab Trang đầu, nhóm Bảng nhớ tạm hoặc dùng Ctrl+X/Ctrl+C để cắt/sao chép vùng chọn. Khi cắt, viền nét đứt báo vùng nguồn; chọn ô đích rồi Ctrl+V để di chuyển. Nhấn Esc trước khi dán để hủy Cắt.",
      "Chọn một ô đích rồi nhấn Ctrl+V để dán. Bảng có thể nhận văn bản nhiều ô từ ứng dụng khác; tab phân cột và xuống dòng phân hàng. Lệnh Xóa (Delete) xóa nội dung ô/vùng đang chọn mà giữ định dạng.",
      "Để dán giá trị hoặc định dạng theo lựa chọn, mở tab Trang đầu, nhóm Bảng nhớ tạm, chọn Dán đặc biệt rồi chọn Tất cả, Chỉ giá trị, Chỉ công thức, Chỉ định dạng hoặc Chuyển vị.",
      "Ctrl+Z hoàn tác mỗi lần nhập/dán; Ctrl+V làm lại dán. Nhấn F1 để mở Trợ giúp 3T Office và tìm 'Tab', 'Dán' hoặc 'bộ nhớ tạm'."
    ]
  },
{
    id: "sheet.keyboard.basicEditing",
    app: "sheet",
    commandIds: [],
    title: "Nhập dữ liệu và di chuyển ô bằng bàn phím",
    summary: "Dùng các phím Enter, Tab, F2, Delete và Ctrl+Z để nhập hoặc sửa dữ liệu trong lưới Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["Enter", "Tab", "Shift+Tab", "F2", "Delete", "Ctrl+Z", "nhập ô", "di chuyển ô", "F1"],
    steps: [
      "Mở Sheet hoặc đóng hộp thoại để lưới ô nhận lại tiêu điểm; có thể nhấp ô bất kỳ rồi gõ ngay. Gõ chữ/số để thay nội dung ô đang chọn, nhấn Enter để xác nhận và đi xuống.",
      "Nhấn F2 để sửa nội dung hiện có mà không xóa giá trị cũ.",
      "Nhấn Tab để xác nhận và đi sang phải, Shift+Tab để quay sang trái. Enter sau chuỗi Tab đi xuống hàng tiếp theo ở cột đầu chuỗi.",
      "Delete xóa nội dung ô hoặc vùng đang chọn. Nhấn Ctrl+Z để hoàn tác và Ctrl+Y để làm lại; nhấn F1 rồi tìm 'nhập ô' để xem lại hướng dẫn này."
    ]
  },
  {
    id: "sheet.page.orientationAndSize",
    app: "sheet",
    commandIds: ["sheet.page.orientation", "sheet.page.size"],
    title: "Hướng giấy và Khổ giấy trang in",
    summary: "Thiết lập hướng giấy đứng (Portrait) hoặc nằm ngang (Landscape) và chọn kích thước trang in (A4, Letter, A3) cho trang tính hiện tại trước khi in hoặc xuất PDF.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["hướng giấy", "khổ giấy", "orientation", "page size", "portrait", "landscape", "khổ a4", "trang in", "bố trí trang"],
    steps: [
      "Mở tab Bố trí trang trên thanh ribbon của Sheet.",
      "Trong nhóm Thiết lập trang, nhấn Hướng giấy để mở hộp thoại và chọn Giấy đứng (phù hợp bảng ít cột) hoặc Giấy ngang (phù hợp bảng nhiều cột).",
      "Nhấn nút Khổ giấy để chọn kích thước trang chuẩn như A4 (210 × 297 mm, chuẩn văn bản Việt Nam theo Nghị định 30) hoặc Letter, A3.",
      "Các đường ngắt trang ảo sẽ tự động điều chỉnh hiển thị ranh giới in theo khổ giấy và hướng giấy vừa chọn.",
      "Nhấn Áp dụng để lưu thiết lập cho sheet hiện tại. Có thể dùng Ctrl+Z để hoàn tác thay đổi."
    ]
  },
  {
    id: "sheet.help.guide",
    app: "sheet",
    commandIds: ["sheet.help.open"],
    title: "Tra cứu Trợ giúp và Hướng dẫn sử dụng Sheet",
    summary: "Mở bảng Hướng dẫn sử dụng Sheet tích hợp ngay trong ứng dụng bằng phím tắt F1, hỗ trợ tra cứu công thức, hàm tính toán, định dạng và thao tác bảng tính.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["trợ giúp", "hướng dẫn", "help", "F1", "tra cứu", "hướng dẫn sử dụng", "sử dụng sheet", "hàm excel"],
    steps: [
      "Nhấn phím F1 trên bàn phím tại bất kỳ lúc nào, hoặc mở tab Trợ giúp trên ribbon và nhấn nút Trợ giúp.",
      "Bảng Trợ giúp Sheet xuất hiện ở cạnh phải màn hình với danh sách các bài hướng dẫn chi tiết.",
      "Nhập tên chức năng hoặc từ khóa (ví dụ: «vlookup», «định dạng có điều kiện», «pivot table», «cố định hàng») vào ô tìm kiếm ở đầu bảng.",
      "Nhấp vào bài viết trong kết quả để xem tóm tắt, vị trí tab/nhóm ribbon và các bước thực hiện chi tiết kèm ví dụ.",
      "Nhấn phím F1 hoặc nút đóng (×) ở góc trên bảng trợ giúp để thu gọn bảng khi không dùng."
    ]
  },
  {
    id: "sheet.ai.analysis",
    app: "sheet",
    commandIds: ["ai.assistant.toggle", "ai.assistant.summarize"],
    title: "Trợ lý 3T AI: Bảng trợ lý và Tóm tắt dữ liệu bảng tính",
    summary: "Bật/tắt thanh bên Trợ lý 3T AI (Alt+J) và tự động tóm tắt, phân tích xu hướng hoặc chỉ số nổi bật từ dữ liệu vùng bảng tính đang chọn.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "Phân tích dữ liệu AI" },
    keywords: ["trợ lý ai", "tóm tắt nhanh", "phân tích dữ liệu", "ai", "Alt+J", "summarize", "bảng tính", "thống kê"],
    steps: [
      "Chọn vùng dữ liệu bảng tính cần phân tích hoặc tóm tắt.",
      "Mở tab Trợ lý 3T AI trên ribbon, nhóm Phân tích dữ liệu AI.",
      "Nhấn Trợ lý 3T AI (hoặc bấm Alt+J) để mở bảng điều khiển AI bên cạnh phải màn hình.",
      "Nhấn nút Tóm tắt nhanh để AI phân tích cấu trúc bảng, tổng hợp các con số nổi bật, giá trị lớn nhất/nhỏ nhất và xu hướng dữ liệu.",
      "Kết quả tóm tắt bằng tiếng Việt hiển thị trong bảng Trợ lý 3T AI; có thể xem trước hoặc sao chép để đưa vào báo cáo."
    ]
  },
  {
    id: "sheet.help.about",
    app: "sheet",
    commandIds: ["sheet.help.open", "common.help.about"],
    title: "Giới thiệu 3T Office và Giấy phép bản quyền",
    summary: "Xem thông tin phiên bản, bản quyền thương hiệu 3T Technology và danh sách các phần mềm nguồn mở bên thứ ba kèm giấy phép hợp pháp.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["giới thiệu", "about", "phiên bản", "bản quyền", "3t office", "giấy phép", "nguồn mở", "third-party", "license", "sheet"],
    steps: [
      "Mở tab Trợ giúp trên thanh ribbon, nhóm Trợ giúp rồi nhấn nút Giới thiệu (hoặc vào menu Tệp rồi chọn Giới thiệu).",
      "Hộp thoại Giới thiệu 3T Office xuất hiện với logo nhận diện 3T và thông tin bộ ứng dụng 3T Office (Doc, Sheet, Slide).",
      "Xem chi tiết số hiệu phiên bản hiện hành, nhà phát triển 3T Technology và các điều khoản bản quyền.",
      "Tra cứu danh sách phần mềm nguồn mở và nhấn nút Xem toàn văn giấy phép nếu cần kiểm tra chi tiết THIRD-PARTY-NOTICES.",
      "Nhấn nút Đóng hoặc bấm phím Esc trên bàn phím để trở về trang bảng tính đang làm việc."
    ]
  },
  {
    id: "sheet.gettingStarted",
    app: "sheet",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print", "common.file.exportPdf"],
    title: "Bắt đầu nhanh: tạo, mở, lưu, in, xuất PDF",
    summary: "Sổ mới bắt đầu với một trang tính Sheet1 trống tại ô A1 (Calibri 11 pt). Dùng menu Tệp hoặc phím tắt để tạo mới, mở, lưu, lưu bản sao, in và xuất PDF.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Sổ làm việc" },
    keywords: ["bắt đầu nhanh", "tạo mới", "mở tệp", "lưu", "lưu bản sao", "in", "xuất pdf", "ctrl+n", "ctrl+o", "ctrl+s", "f12", "ctrl+p", "sheet1", "sheet"],
    steps: [
      "Tạo sổ trống: nhấn Ctrl+N hoặc menu Tệp > Mới. Một cửa sổ mới tên Bảng tính 2, Bảng tính 3… xuất hiện với duy nhất Sheet1, ô A1 đang chọn và chưa có dữ liệu. Ứng dụng hiển thị tên Sheet trên thanh tiêu đề cửa sổ.",
      "Mở sổ: nhấn Ctrl+O hoặc menu Tệp > Mở, chọn XLSX, XLS, ODS hoặc CSV. Nếu sổ hiện tại có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi chọn tệp; Hủy thao tác mở sẽ giữ sổ hiện tại.",
      "Lưu (Ctrl+S): mở hộp thoại Lưu thành cho sổ mới. Với tệp đã mở/lưu, Ctrl+S giữ nguyên định dạng hiện tại. Nhấn F12 để Lưu bản sao — nhập tên, chọn XLSX, XLS, ODS, CSV hoặc PDF ở Loại tệp. Chọn PDF chỉ xuất một bản PDF; sổ đang mở vẫn giữ tên và định dạng cũ.",
      "In (Ctrl+P): mở Xem trước khi in. Chọn máy in, số bản và phạm vi trang. Các thiết lập Vùng in, ngắt trang và Vừa trang được áp dụng vào bản xem trước. Khi có phần mềm văn phòng khác, dùng bộ dựng PDF đó; ngược lại bộ dựng tích hợp của 3T Office.",
      "Xuất PDF: menu Tệp > Xuất PDF > chọn nơi lưu. Cùng đường dựng với In."
    ]
  },
  {
    id: "sheet.shortcuts",
    app: "sheet",
    commandIds: [
      "common.file.new", "common.file.open", "common.file.save", "common.file.print",
      "common.edit.undo", "common.edit.redo", "common.edit.cut", "common.edit.copy",
      "common.edit.paste", "common.edit.selectAll", "common.edit.find", "common.edit.replace",
      "sheet.cell.bold", "sheet.cell.edit", "sheet.format.cellsDialog",
      "sheet.formula.sum", "sheet.data.filter", "sheet.edit.fillDown", "sheet.edit.fillRight",
      "sheet.select.column", "sheet.select.row", "sheet.insert.cells"
    ],
    title: "Phím tắt thường dùng (15 phím tắt phổ biến nhất)",
    summary: "Các phím tắt thường dùng giúp thao tác nhanh trong 3T Office: tạo tài liệu, định dạng, tìm kiếm và in. Xem từng bước bên dưới để chọn tổ hợp phím phù hợp. Có thể hoàn tác các thao tác chỉnh sửa được hỗ trợ, rồi làm lại khi cần.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["phím tắt", "shortcut", "ctrl+n", "ctrl+o", "ctrl+s", "ctrl+p", "ctrl+z", "ctrl+y", "ctrl+x", "ctrl+c", "ctrl+v", "ctrl+a", "ctrl+f", "ctrl+h", "ctrl+b", "f2", "ctrl+1", "alt+=", "ctrl+shift+l", "ctrl+d", "ctrl+r", "ctrl+space", "shift+space", "ctrl+shift++", "sheet"],
    steps: [
      "Tạo mới: Ctrl+N  |  Mở: Ctrl+O  |  Lưu: Ctrl+S  |  In: Ctrl+P",
      "Hoàn tác: Ctrl+Z  |  Làm lại: Ctrl+Y",
      "Cắt: Ctrl+X  |  Sao chép: Ctrl+C  |  Dán: Ctrl+V  |  Chọn tất cả: Ctrl+A",
      "Tìm kiếm: Ctrl+F  |  Thay thế: Ctrl+H",
      "Chữ đậm: Ctrl+B  |  Chỉnh sửa ô: F2  |  Định dạng ô: Ctrl+1",
      "AutoSum: Alt+=  |  Bộ lọc: Ctrl+Shift+L  |  Điền xuống: Ctrl+D  |  Điền phải: Ctrl+R",
      "Chọn cột: Ctrl+Space  |  Chọn hàng: Shift+Space  |  Chèn ô/hàng/cột: Ctrl+Shift++",
      "Các phím tắt khác hữu ích: Ctrl+- (Xóa ô/hàng/cột), Ctrl+; (Chèn ngày), Ctrl+Shift+; (Chèn giờ), F11 (Chèn biểu đồ), Shift+F11 (Chèn trang tính mới)."
    ]
  },
{
    id: "sheet.differences",
    app: "sheet",
    commandIds: [
      "sheet.data.scenarioManager",
      "sheet.data.dataTable",
      "sheet.formula.watchWindow",
      "sheet.formula.evaluateFormula",
      "sheet.page.printTitles"
    ],
    title: "Khác biệt cần biết (so với bộ Office khác)",
    summary: "Sheet có các công cụ phân tích dữ liệu, theo dõi ô và kiểm tra công thức. Mở tab Dữ liệu để dùng kịch bản và bảng dữ liệu; mở tab Công thức để theo dõi hoặc ước lượng công thức. Thiết lập hàng và cột lặp khi in ở tab Bố trí trang.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["khác biệt", "không có", "chưa hỗ trợ", "pending", "scenario", "data table", "watch window", "evaluate formula", "print titles", "đã hoàn thành"],
    steps: [
      "Trình quản lý kịch bản (Scenario Manager): tab Dữ liệu > nhóm Công cụ dữ liệu > Phân tích What-If > Trình quản lý kịch bản (thêm/sửa/xóa kịch bản, Hiển thị, Gộp, Báo cáo Tóm tắt, lưu/đọc XLSX).",
      "Bảng dữ liệu hai biến: tab Dữ liệu > nhóm Công cụ dữ liệu > Phân tích What-If > Bảng dữ liệu (hỗ trợ 1 biến và 2 biến, tự tính lại khi đổi đầu vào, lưu XLSX dạng giá trị tĩnh).",
      "Cửa sổ theo dõi (Watch Window): tab Công thức > nhóm Kiểm tra công thức > Cửa sổ theo dõi (cửa sổ nổi 6 cột, thêm/xóa ô đa sheet, tự cập nhật).",
      "Ước lượng công thức: tab Công thức > nhóm Kiểm tra công thức > Ước lượng công thức (hộp thoại gạch chân phần sắp tính, nút Ước lượng/Bước vào/Bước ra/Khởi động lại/Đóng, hiển thị lỗi #DIV/0!/#N/A/#REF!).",
      "Tiêu đề in (Print Titles): tab Bố trí trang > nhóm Thiết lập trang > Tiêu đề in (nhập tham chiếu $1:$2/$A:$B, nút ⊞ chọn trực tiếp hàng/cột trên lưới, giữ khi lưu .xlsx).",
      "Liên kết ngoài: công thức như =[BaoCao.xlsx]Sheet1!A1 hiển thị giá trị lưu lần cuối, giữ liên kết khi lưu XLSX, không tự cập nhật (ứng dụng chạy offline). Thanh cảnh báo vàng dưới ribbon báo số ô có liên kết."
    ]
  }
];

registerHelpEntries(SHEET_HELP_ENTRIES);


