/**
 * Hướng dẫn sử dụng 3T Sheet — nội dung tiếng Việt thật, khớp UI hiện có.
 * Tự đăng ký vào catalog dùng chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const SHEET_HELP_ENTRIES = [
  {
    id: "sheet.goTo.special",
    app: "sheet",
    commandIds: ["sheet.edit.goTo"],
    title: "Đến (Go To) và Đến đặc biệt: nhảy tới ô và chọn nhanh theo loại",
    summary: "Nhấn Ctrl+G để nhập một ô, vùng hay tên đã xác định rồi nhảy tới đó; nút Đặc biệt chọn cùng lúc mọi ô thuộc một loại như ô trống, công thức, ghi chú.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["đến", "go to", "nhảy tới ô", "đến đặc biệt", "go to special", "chọn ô trống", "chọn công thức", "chọn ghi chú", "vùng hiện tại", "ô cuối cùng", "tên đã xác định"],
    steps: [
      "Nhấn Ctrl+G hoặc bấm nút Đến... ở tab Trang đầu, nhóm Chỉnh sửa. Hộp thoại Đến mở ra.",
      "Gõ tham chiếu cần tới: một ô (B5), một vùng (A1:C10), ô ở trang khác (Sheet2!D3) hoặc tên đã xác định; hoặc bấm một tên trong danh sách Tên đã xác định. Nhấn Enter hoặc Đồng ý: Sheet nhảy tới và chọn đúng vùng đó. Tham chiếu sai sẽ báo lỗi và giữ hộp thoại để bạn sửa.",
      "Bấm nút Đặc biệt... để chọn nhiều ô cùng lúc theo loại: Ghi chú, Hằng số, Công thức, Ô trống, Vùng hiện tại, Ô cuối cùng, Khác biệt theo hàng, Khác biệt theo cột, Chỉ ô nhìn thấy, Định dạng có điều kiện, Kiểm tra dữ liệu.",
      "Nếu đang chọn một vùng nhiều ô thì Đặc biệt chỉ tìm trong vùng đó; nếu chỉ chọn một ô thì tìm trong toàn bộ vùng có dữ liệu của trang. Khác biệt theo hàng/cột so sánh với ô đang hoạt động và cần chọn vùng từ hai cột (hoặc hai hàng) trở lên.",
      "Sau khi chọn xong có thể nhấn Delete để xóa, hoặc đặt màu nền ngay cho tất cả ô vừa chọn (ví dụ tô màu mọi ô trống). Không tìm thấy ô nào thì hộp thoại báo Không tìm thấy ô nào."
    ]
  },
  {
    id: "sheet.contextMenu.rightClick",
    app: "sheet",
    commandIds: [],
    title: "Menu chuột phải: ô, hàng, cột và tab trang tính",
    summary: "Bấm chuột phải để dùng nhanh các lệnh thường gặp, sắp xếp theo thói quen của phần mềm bảng tính văn phòng: Cắt/Sao chép/Dán, Chèn, Xóa, Lọc, Sắp xếp, Ghi chú, Định dạng ô, Siêu liên kết; riêng hàng, cột, tab trang tính, biểu đồ, hình ảnh và hộp văn bản có menu riêng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["chuột phải", "menu ngữ cảnh", "context menu", "chèn ô", "xóa ô", "lọc theo giá trị", "ghi chú", "siêu liên kết", "chiều cao hàng", "độ rộng cột", "tab trang tính", "phím Menu", "đối tượng", "hình ảnh", "hộp văn bản", "đưa lên trên", "đưa xuống dưới", "định dạng đối tượng"],
    steps: [
      "Chuột phải vào một ô: chọn Cắt, Sao chép, Dán hoặc Dán đặc biệt (chỉ giá trị, công thức, định dạng, chuyển vị). Chèn... và Xóa... mở hộp thoại hỏi dịch ô sang phải/xuống hoặc chèn/xóa cả hàng/cột; Xóa nội dung chỉ xóa dữ liệu, giữ định dạng.",
      "Mục Lọc: Lọc theo giá trị của ô đã chọn chỉ giữ các hàng có cùng giá trị với ô bạn bấm; Xóa bộ lọc hiện lại mọi hàng; Áp dụng lại lọc lại sau khi dữ liệu đổi. Mục Sắp xếp: A đến Z, Z đến A hoặc Sắp xếp tùy chỉnh theo nhiều cột.",
      "Chèn ghi chú thêm ghi chú cho ô; nếu ô đã có ghi chú, menu đổi thành Sửa ghi chú và Xóa ghi chú. Định dạng ô... (Ctrl+1) mở hộp thoại định dạng; Xác định tên... đặt tên cho vùng chọn; Siêu liên kết... (Ctrl+K) chèn liên kết, và khi ô đã có liên kết sẽ có thêm Mở siêu liên kết và Xóa siêu liên kết.",
      "Chuột phải vào một ô nằm trong bảng: ngoài các mục trên có Chèn (cột bảng bên trái/phải, hàng bảng phía trên/dưới), Xóa (cột bảng, hàng bảng), Chọn (dữ liệu cột, toàn bộ cột, hàng) và Bảng (Dòng tổng, Chuyển thành phạm vi). Mỗi thao tác chèn/xóa hoàn tác được bằng một lần Ctrl+Z; Dòng tổng thêm hàng cuối bảng với nhãn Tổng và công thức cộng cột cuối, lưu XLSX rồi mở lại vẫn giữ.",
      "Chuột phải vào biểu đồ: Đổi loại biểu đồ..., Chọn dữ liệu... (nhập lại vùng dữ liệu, ví dụ A1:B10), Di chuyển biểu đồ... (sang trang tính khác) và Xóa. Có thể mở menu bằng bàn phím: chọn biểu đồ rồi nhấn phím Menu (phím ngữ cảnh) trên bàn phím.",
      "Chuột phải vào đối tượng hình ảnh hoặc hộp văn bản: có Cắt, Sao chép, Dán; Đưa lên trên (Lên trên cùng, Lên một mức), Đưa xuống dưới (Xuống dưới cùng, Xuống một mức); Xóa; và Định dạng đối tượng... Có thể mở menu bằng chuột phải hoặc chọn đối tượng rồi nhấn phím Menu (ngữ cảnh) trên bàn phím.",
      "Chuột phải vào tiêu đề hàng (số 1, 2, 3…) hoặc tiêu đề cột (A, B, C…): có Chèn, Xóa, Xóa nội dung, Định dạng ô..., Chiều cao hàng... hoặc Độ rộng cột..., Tự vừa khít, Ẩn và Hiện.",
      "Chuột phải vào tab trang tính ở cuối cửa sổ: Chèn trang tính, Xóa trang tính, Đổi tên, Di chuyển hoặc Sao chép, Bảo vệ trang tính, Màu tab, Ẩn trang tính và Hiện trang tính. Nhấn Esc để đóng menu; dùng phím mũi tên để chọn mục."
    ]
  },
  {
    id: "sheet.contextMenu.objects",
    app: "sheet",
    commandIds: [],
    title: "Menu chuột phải cho hình, ảnh, hộp văn bản",
    summary: "Nhấp chuột phải hoặc nhấn phím Menu ngữ cảnh trên hình dạng, hình ảnh hoặc hộp văn bản để thao tác nhanh các lệnh sao chép, thứ tự lớp, căn chỉnh, xoay lật, thay ảnh, chữ thay thế, định dạng và bảo vệ trang tính.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Sắp xếp" },
    keywords: ["menu chuột phải cho hình, ảnh, hộp văn bản", "chuột phải hình dạng", "chuột phải hình ảnh", "chuột phải hộp văn bản", "thay ảnh", "chữ thay thế", "nhóm", "thứ tự lớp", "căn chỉnh", "xoay", "định dạng đối tượng", "bảo vệ trang tính", "phím menu", "ngữ cảnh"],
    steps: [
      "Nhấp chuột phải trực tiếp vào một hình dạng (Shape), hình ảnh (Picture) hoặc hộp văn bản (TextBox) trên trang tính. Hoặc dùng chuột để chọn đối tượng rồi nhấn phím Menu (ngữ cảnh) trên bàn phím để mở menu. Nhấn phím Esc để đóng menu bất cứ lúc nào.",
      "Nhóm lệnh Chỉnh sửa cơ bản: Cắt (Ctrl+X), Sao chép (Ctrl+C) và Dán (Ctrl+V). Thao tác dán đối tượng giữ nguyên kích thước và định dạng, bám sát ô neo hiện hành trên trang tính.",
      "Lệnh chuyên biệt theo loại đối tượng: Đối với hình ảnh, chọn Thay đổi hình ảnh... để chọn tệp ảnh mới thay thế ảnh hiện tại mà vẫn giữ nguyên kích thước và vị trí neo. Đối với hình dạng và hộp văn bản, chọn Chỉnh sửa văn bản để kích hoạt con trỏ nhập văn bản bên trong đối tượng.",
      "Nhóm lệnh Sắp xếp và Thứ tự lớp: Menu Nhóm (Nhóm, Bỏ nhóm, Nhóm lại); Đưa lên trên (Đưa lên trên cùng, Đưa lên trên một lớp); Đưa xuống dưới (Đưa xuống dưới cùng, Đưa xuống dưới một lớp); Căn chỉnh (Căn trái, Căn giữa, Căn phải, Căn trên, Căn giữa dọc, Căn dưới, Phân bố đều ngang, Phân bố đều dọc); và Xoay (Xoay phải 90°, Xoay trái 90°, Lật ngang, Lật dọc).",
      "Thông tin bổ sung và Thiết lập: Chọn Chữ thay thế... để nhập nội dung mô tả cho người khiếm thị sử dụng trình đọc màn hình; Gán macro... hiển thị thông báo tiến trình tích hợp tự động hóa; Đặt làm hình dạng mặc định / Đặt làm hộp văn bản mặc định lưu lại kiểu dáng cho các đối tượng mới tiếp theo; Liên kết... (Ctrl+K) gắn siêu liên kết cho đối tượng.",
      "Quản lý và Xóa: Mục Xóa (phím Delete) xóa đối tượng khỏi trang tính kèm đầy đủ khả năng Hoàn tác (Ctrl+Z) và Làm lại (Ctrl+Y); Chọn tất cả đối tượng chọn toàn bộ hình ảnh và hộp văn bản đang có trên trang tính; Ngăn chọn... mở pa-nen quản lý thứ tự lớp và ẩn/hiện từng đối tượng.",
      "Định dạng chuyên sâu: Mục Định dạng hình dạng... / Định dạng ảnh... / Định dạng hộp văn bản... mở hộp thoại tinh chỉnh chi tiết kích thước (cm/px), tọa độ ô neo, khoảng cách lệch ngang/dọc và nội dung chữ.",
      "Trạng thái khi trang tính được bảo vệ: Khi bật tính năng Bảo vệ trang tính hoặc Sổ làm việc đã đánh dấu là cuối cùng, các lệnh chỉnh sửa làm thay đổi đối tượng (Cắt, Dán, Xóa, Nhóm, Thứ tự lớp, Căn chỉnh, Xoay, Định dạng...) tự động bị khóa mờ; lệnh Sao chép (Ctrl+C) và Xem chữ thay thế vẫn cho phép sử dụng bình thường."
    ]
  },
  {
    id: "sheet.input.nativeValues",
    app: "sheet",
    commandIds: [],
    title: "Nhập số và ngày để công thức tính đúng",
    summary: "Số gõ hoặc dán vào ô được lưu dưới dạng số; ngày dd/mm/yyyy và giờ 13:45 được lưu dưới dạng số ngày kèm định dạng ngày hoặc giờ. Vì vậy SUM, COUNT, sắp xếp và chuỗi Điền tự động tiếp tục tính đúng sau khi lưu XLSX.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Số" },
    keywords: ["nhập số", "ngày", "giờ", "date serial", "time", "SUM", "COUNT", "dán số", "điền chuỗi", "apostrophe", "xlsx"],
    steps: [
      "Chọn một ô rồi gõ số, ví dụ 123 hoặc 12,5, và nhấn Enter. Có thể dán một cột số từ ứng dụng khác; Sheet tự nhận kiểu số để công thức SUM/COUNT dùng được.",
      "Để nhập ngày, gõ theo dạng dd/mm/yyyy, ví dụ 30/01/2026, hoặc dùng công thức như =DATE(2026,12,31) hay =TODAY(). Ô lưu số serial ngày chuẩn và tự nhận định dạng ngày dd/mm/yyyy; bạn có thể cộng trừ ngày như =A1+1 hay =DATE(2026,12,31)+1, kéo chốt Điền ở góc dưới phải để tiếp tục 31/01/2026, 01/02/2026…",
      "Để nhập giờ, gõ 13:45 hoặc 9:05 rồi nhấn Enter (có thể kèm giây, ví dụ 13:45:30). Ô nhận định dạng giờ và giữ ô là số, nên SUM và sắp xếp vẫn tính đúng; giờ không hợp lệ như 25:00 hoặc 13:60 được giữ nguyên dạng văn bản. Nhấn Ctrl+Shift+; để chèn giờ hiện tại vào ô đang chọn.",
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
    keywords: ["tạo mới", "mở tệp", "lưu", "lưu thành", "lưu thành mẫu", "xltx", "mẫu bảng tính", "in", "phạm vi sổ làm việc", "trang tính hiện hoạt", "toàn bộ sổ làm việc", "in vùng chọn", "Ctrl+N", "Ctrl+O", "Ctrl+S", "F12", "Ctrl+P", "Sheet1", "cửa sổ riêng", "mở nhiều cửa sổ", "Explorer"],
    steps: [
      "Tạo sổ trống: nhấn Ctrl+N hoặc mở Tệp > Mới. Một cửa sổ mới tên Bảng tính 2, Bảng tính 3… xuất hiện với duy nhất Sheet1, ô A1 đang chọn và chưa có dữ liệu. Trong Desktop, khi Sheet đang mở, nhấp đúp thêm tệp XLSX/XLS/ODS/CSV trong Explorer hoặc bấm lại shortcut Sheet ở Start sẽ mở thêm cửa sổ trong cùng tiến trình. Mỗi cửa sổ có sổ làm việc, trạng thái sửa, lệnh Lưu và lời nhắc Đóng riêng; cửa sổ cuối cùng mới kết thúc ứng dụng.",
      "Mở sổ: nhấn Ctrl+O hoặc chọn Tệp > Mở, chọn XLSX, XLS, ODS hoặc CSV. Nếu sổ hiện tại có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi chọn tệp; Hủy thao tác mở sẽ giữ sổ hiện tại. Với XLSX lớn, theo dõi dòng “Đang mở bảng tính lớn… N%” ở thanh trạng thái; bạn vẫn có thể di chuyển hoặc thu nhỏ cửa sổ trong lúc Sheet đọc dữ liệu. Chỉ bắt đầu sửa khi thanh trạng thái trở về trạng thái sẵn sàng.",
      "Lưu: Ctrl+S mở hộp thoại Lưu thành cho sổ mới. Với tệp đã mở/lưu, Ctrl+S giữ nguyên định dạng hiện tại. Dùng F12 hoặc Ctrl+Shift+S để lưu tên/định dạng khác; xác nhận ghi đè khi được hỏi. Chọn PDF trong Lưu thành chỉ xuất một bản PDF; tệp đang mở vẫn giữ tên và định dạng cũ.",
      "Lưu thành mẫu: nhấn F12, ở ô Lưu dạng chọn “Mẫu bảng tính (*.xltx)” rồi Lưu. Tệp mẫu giữ nguyên dữ liệu, định dạng, công thức và cài đặt trang; khi nhấp đúp để mở bằng trình quản lý tệp, ứng dụng bảng tính sẽ tạo một sổ mới từ mẫu thay vì sửa trực tiếp tệp mẫu. Dùng cách này cho báo cáo, biểu mẫu hoặc hóa đơn lặp lại. Sau khi lưu, sổ đang mở chuyển sang tên tệp mẫu; muốn giữ bản thường, hãy lưu lại thành XLSX với tên khác trước đó.",
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
    id: "sheet.file.largeExcelQuickView",
    app: "sheet",
    commandIds: ["common.file.open"],
    title: "Mở tệp bảng tính lớn: màn hình xem nhanh và nạp đầy đủ",
    summary: "Khi mở tệp XLSX lớn, Sheet có thể hiện sớm một màn hình xem nhanh chỉ đọc lấy trực tiếp từ tài liệu trên máy. Bạn xem, cuộn và đổi trang tính trong khi mô hình đầy đủ tiếp tục nạp ngoại tuyến ở nền.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Mở" },
    keywords: ["xlsx lớn", "xem nhanh", "nạp đầy đủ", "chỉ đọc", "đang tải", "cuộn", "đổi sheet", "mở bảng tính lớn"],
    steps: [
      "Nhấn Ctrl+O hoặc mở Tệp > Mở rồi chọn tệp XLSX lớn. Khi chế độ tăng tốc được bật, lưới xem nhanh xuất hiện cùng dòng «Đang nạp đầy đủ… N%». Dữ liệu vẫn chỉ được xử lý trên máy và không gửi ra dịch vụ mạng.",
      "Trong màn hình xem nhanh, bạn có thể cuộn đến vùng khác, bấm một ô để chọn và dùng các tab ở cuối lưới để đổi trang tính. Giá trị đã định dạng, phông chữ, chữ đậm/nghiêng, màu, nền và căn lề của vùng đang xem được hiển thị đúng như trong tệp gốc.",
      "Màn hình xem nhanh là chỉ đọc. Nếu gõ, dán, cắt hoặc lưu trước khi nạp xong, Sheet sẽ chặn thao tác và báo rõ trên thanh trạng thái; thao tác không được ghi đệm nên không có nguy cơ sửa nhầm hoặc mất nội dung.",
      "Chờ đến khi dòng trạng thái báo đã nạp đầy đủ. Sheet tự chuyển sang lưới chỉnh sửa thật và giữ trang tính, ô đã chọn cùng vùng đang cuộn; lúc đó bạn có thể soạn, dán và lưu bình thường bằng các lệnh quen thuộc."
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
    id: "sheet.formula.commonFunctions",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Hàm điều kiện, tra cứu, văn bản và ngày tháng",
    summary: "Nhập các hàm SUMIF(S), COUNTIF(S), IFERROR, VLOOKUP/HLOOKUP, MATCH, OFFSET/INDIRECT, SUMPRODUCT, LEFT/MID/RIGHT, TEXT và hàm ngày tháng từ tab Công thức hoặc thanh công thức.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["SUMIF", "SUMIFS", "COUNTIF", "COUNTIFS", "IFERROR", "ROUND", "VLOOKUP", "HLOOKUP", "MATCH", "OFFSET", "INDIRECT", "SUMPRODUCT", "LEFT", "MID", "RIGHT", "TEXT", "NA", "DATE", "EDATE", "EOMONTH", "YEAR", "MONTH", "DAY", "WEEKDAY", "NETWORKDAYS", "WORKDAY", "DAYS", "hàm điều kiện", "hàm tra cứu", "hàm ngày tháng"],
    steps: [
      "Chọn ô cần hiện kết quả. Gõ dấu = trên ô hoặc thanh công thức, rồi nhập tên hàm và đối số; nhấn Enter để xác nhận. Có thể mở tab Công thức → nhóm Hàm tính toán → Chèn hàm để tìm hàm theo danh mục.",
      "Tính tổng hoặc đếm theo điều kiện bằng =SUMIF(A2:A20,\"Đã giao\",C2:C20), =SUMIFS(C2:C20,A2:A20,\"Đã giao\",B2:B20,\">=1/1/2026\"), =COUNTIF(B2:B20,\"*Văn*\") hoặc =COUNTIFS(A2:A20,\"Đã giao\",C2:C20,\">0\"). Dùng dấu * để khớp nhiều ký tự và ? để khớp một ký tự.",
      "Bọc phép tính có thể lỗi bằng =IFERROR(A2/B2,0); làm tròn bằng =ROUND(C2,2). Tra cứu theo cột với =VLOOKUP(E2,A2:C20,3,FALSE), theo hàng với =HLOOKUP(B1,A1:H3,3,FALSE), hoặc lấy vị trí bằng =MATCH(E2,A2:A20,0).",
      "Lấy ký tự bằng =LEFT(B2,3), =MID(B2,2,4), =RIGHT(B2,3). Định dạng số thành chữ bằng =TEXT(C2,\"#,##0.00\"); định dạng ngày bằng =TEXT(D2,\"dd/mm/yyyy\"). TEXT trả về văn bản, nên chỉ dùng kết quả đó để hiển thị hoặc ghép chuỗi.",
      "Tạo ngày với =DATE(2026,10,11); tách năm/tháng/ngày bằng YEAR, MONTH, DAY. EDATE cộng tháng, EOMONTH tìm ngày cuối tháng, WEEKDAY lấy thứ, NETWORKDAYS đếm ngày làm việc, WORKDAY tìm ngày làm việc kế tiếp và DAYS tính khoảng cách ngày. TODAY() và NOW() thay đổi theo thời điểm tính lại.",
      "INDIRECT nhận địa chỉ ô dưới dạng văn bản, ví dụ =INDIRECT(\"C2\") trả nội dung ô C2. OFFSET trả ô/vùng dịch từ một tham chiếu, ví dụ =OFFSET(C2,1,0) lấy ô phía dưới. SUMPRODUCT nhân các phần tử tương ứng rồi cộng; NA() tạo lỗi #N/A để đánh dấu dữ liệu chưa có, có thể bọc bằng IFERROR.",
      "Sau khi nhập, chọn lại ô để xem công thức trên thanh công thức và kết quả trong lưới. Khi lưu XLSX, mở bằng ứng dụng bảng tính khác để xác nhận kết quả hiển thị; công thức TODAY/NOW sẽ lấy thời điểm hiện tại khi ứng dụng tính lại."
    ]
  },
  {
    id: "sheet.formula.excel2016Functions",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Hàm thống kê, tham chiếu và cơ sở ngày nâng cao",
    summary: "Dùng MODE/PERCENTILE cho thống kê; TRUE, FALSE, XOR và IF cho logic; ADDRESS/FORMULATEXT cho tham chiếu; YEARFRAC cho ngày và HYPERLINK cho liên kết.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["MODE", "PERCENTILE", "TRUE", "FALSE", "XOR", "IF", "ADDRESS", "FORMULATEXT", "YEARFRAC", "HYPERLINK", "phân vị", "logic", "địa chỉ ô", "công thức dạng chữ", "phần năm", "siêu liên kết"],
    steps: [
      "Chọn ô kết quả rồi gõ công thức trên lưới hoặc Thanh công thức Sheet; nhấn Enter để tính. Cũng có thể mở tab Công thức → nhóm Hàm tính toán → Chèn hàm, tìm tên hàm rồi chèn cú pháp vào ô.",
      "Dùng =MODE(A2:A20) để tìm số xuất hiện thường xuyên nhất; nếu nhiều số đồng hạng, kết quả là số nhỏ nhất. Nếu không có số lặp, hàm trả lỗi #N/A.",
      "Dùng =PERCENTILE(A2:A20,0.9) để lấy phân vị 90%; đối số thứ hai phải từ 0 đến 1. Hàm bỏ qua văn bản trong vùng và nội suy theo phương pháp inclusive.",
      "Dùng =ADDRESS(3,2) để tạo địa chỉ tuyệt đối $B$3. Đối số thứ ba chọn kiểu khóa hàng/cột: 1 khóa cả hai, 2 khóa hàng, 3 khóa cột, 4 không khóa. Có thể thêm tên trang tính ở đối số thứ năm.",
      "Dùng =FORMULATEXT(C5) để hiện công thức đang lưu trong C5 dưới dạng văn bản. Nếu C5 không chứa công thức, kết quả là #N/A.",
      "Dùng =TRUE() và =FALSE() khi cần hằng logic. Dùng =XOR(A2>0,B2>0) khi chỉ một trong hai điều kiện cần đúng; với nhiều điều kiện, XOR trả TRUE khi có số lẻ điều kiện đúng. Văn bản nhập trực tiếp vào IF/AND/OR/NOT/XOR không được coi là TRUE và trả #VALUE!; ô trống hoặc văn bản nằm trong vùng tham chiếu của AND/OR/XOR được bỏ qua.",
      "Dùng =YEARFRAC(A2,B2,1) để tính khoảng thời gian giữa hai ngày theo cơ sở Actual/Actual. Đối số cơ sở tùy chọn nhận 0 đến 4; bỏ trống sẽ dùng cơ sở 0 (30/360).",
      "Dùng =HYPERLINK(\"#B2\",\"Xem dữ liệu\") để tạo liên kết trong workbook và đặt nhãn dễ hiểu trong ô. Có thể thay #B2 bằng địa chỉ web; nhấp vào nhãn để mở đích liên kết."
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
    summary: "Đổi cách hiển thị số trên ô đang chọn: Chung, Số, Tiền tệ, Kế toán, Ngày, Phần trăm, Phân số, Khoa học, Văn bản hoặc Đặc biệt. Có nút tắt VNĐ, phần trăm, phân cách hàng nghìn và tăng/giảm số thập phân.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Định dạng số" },
    keywords: ["định dạng số", "number format", "vnđ", "phần trăm", "phân số", "đặc biệt", "hàng nghìn", "thập phân", "tiền tệ"],
    steps: [
      "Chọn một hoặc nhiều ô số. Mở tab Trang đầu, nhóm Định dạng số (bên phải nhóm Căn chỉnh).",
      "Dùng hộp chọn nhanh: Chung, Số, Tiền tệ, Kế toán, Ngày, Phần trăm, Phân số, Khoa học, Văn bản, Đặc biệt. Phân số chuyển số thực thành phân số tối giản (vd: 0.5 thành 1/2); Đặc biệt hỗ trợ mã bưu chính (00000) đệm số 0 ở đầu.",
      "Nút tắt trên hàng dưới: Tiền tệ VNĐ (Ctrl+Shift+4), Phần trăm (Ctrl+Shift+5), Phân cách hàng nghìn (Ctrl+Shift+1), Tăng/Giảm số thập phân.",
      "Muốn chỉnh số chữ số thập phân, ký hiệu tiền, kiểu số âm, các kiểu phân số chi tiết hoặc mẫu tùy chỉnh: nhấn nút Định dạng ô... trong cùng nhóm, hoặc Ctrl+1, hoặc mũi tên nhỏ góc nhóm (launcher)."
    ]
  },
  {
    id: "sheet.format.cellsDialog",
    app: "sheet",
    commandIds: ["sheet.format.cellsDialog"],
    title: "Định dạng ô",
    summary: "Hộp thoại sáu thẻ để định dạng số, căn chỉnh, phông chữ, đường viền, màu nền và trạng thái bảo vệ cho ô hoặc vùng đang chọn; mọi thay đổi được lưu cùng tệp XLSX.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Định dạng số" },
    keywords: ["định dạng ô", "ctrl+1", "số thập phân", "tiền tệ", "ngày tháng", "phân số", "đặc biệt", "phông chữ", "viền", "tô màu", "bảo vệ", "tùy chỉnh"],
    steps: [
      "Chọn ô hoặc vùng cần đổi. Nhấn Ctrl+1, hoặc tab Trang đầu → nhóm Định dạng số → nút Định dạng ô..., hoặc mũi tên nhỏ góc phải nhóm.",
      "Thẻ Số: chọn Chung, Số, Tiền tệ, Kế toán, Ngày, Giờ, Phần trăm, Phân số, Khoa học, Văn bản, Đặc biệt hoặc Tùy chỉnh. Nhóm Phân số hỗ trợ đủ 9 kiểu: Tối đa một chữ số (# ?/?), hai chữ số (# ??/??), ba chữ số (# ???/???), theo phần hai (# ?/2), phần tư (# ?/4), phần tám (# ?/8), phần mười sáu (# ??/16), phần mười (# ?/10) và phần trăm (# ??/100). Nhóm Đặc biệt hỗ trợ Mã bưu chính 5 chữ số (00000), Mã bưu chính mở rộng (00000-0000), Số điện thoại ([<=9999999]###-####;(###) ###-####) và Số an sinh xã hội (000-00-0000). Hộp Mẫu cập nhật trực quan trước khi nhấn Đồng ý.",
      "Với Tùy chỉnh, nhập mã vào ô Mã định dạng rồi nhấn Đồng ý để áp dụng và thêm mã vào danh sách dùng lại trong phiên. Muốn bỏ một mã đã tạo, chọn mã trong danh sách rồi bấm Xóa mã; các mã dựng sẵn không thể xóa và ứng dụng sẽ báo rõ lý do.",
      "Thẻ Căn chỉnh: đặt căn ngang/dọc, thụt lề, ngắt dòng, thu nhỏ vừa ô, hướng đọc, góc xoay hoặc xếp chữ dọc. Chọn một vùng trước khi bật Hợp nhất ô; khi tắt tùy chọn, vùng gộp hiện tại được tách.",
      "Thẻ Phông chữ: chọn họ font, kiểu thường/đậm/nghiêng, cỡ, gạch chân, màu, gạch ngang, chỉ số trên hoặc dưới. Phông mặc định đưa các giá trị này về cấu hình mặc định của bảng tính.",
      "Thẻ Viền: chọn kiểu và màu đường trước, rồi bấm Ngoài/Bên trong hoặc từng cạnh Trái/Phải/Trên/Dưới/Ngang trong/Dọc trong/Chéo. Thẻ Tô màu đặt màu nền, màu và kiểu mẫu; Hiệu ứng tô tạo chuyển màu hai màu theo hướng đã chọn.",
      "Thẻ Bảo vệ: Đã khóa ngăn sửa ô và Ẩn công thức che công thức sau khi trang tính được bảo vệ. Bấm Bảo vệ trang tính... ngay trong thẻ để mở thiết lập bảo vệ; hai cờ không tự khóa trang nếu chưa bật bảo vệ.",
      "Nhấn Đồng ý để áp dụng cho toàn vùng đang chọn. Hủy bỏ, nút Đóng hoặc Esc không thay đổi tài liệu. Ctrl+Z hoàn tác toàn bộ lần định dạng trong một bước."
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
    id: "sheet.data.pivotChangeDataSource",
    app: "sheet",
    commandIds: ["sheet.data.pivotChangeDataSource"],
    title: "Đổi nguồn dữ liệu Bảng tổng hợp (Change Data Source)",
    summary: "Thay đổi vùng ô nguồn hoặc bảng dữ liệu cho Bảng tổng hợp hiện có, tự động loại bỏ các trường bị xóa khỏi bố cục và cập nhật lại kết quả tính toán.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Bảng tổng hợp" },
    keywords: ["đổi nguồn", "change data source", "nguồn dữ liệu", "bảng tổng hợp", "pivot", "vùng nguồn", "cập nhật nguồn"],
    steps: [
      "Chọn trang tính chứa Bảng tổng hợp cần đổi vùng dữ liệu nguồn.",
      "Mở tab Dữ liệu trên thanh dải lệnh, tìm đến nhóm Bảng tổng hợp và nhấn nút Đổi nguồn.",
      "Hộp thoại Đổi nguồn dữ liệu hiển thị vùng nguồn hiện tại. Nhập tham chiếu vùng mới (ví dụ Sheet1!A1:E30) hoặc chỉnh sửa tọa độ vùng ô.",
      "Nhấn nút Đồng ý. Ứng dụng đọc lại dữ liệu từ nguồn mới và tính toán lại bảng tổng hợp; nếu vùng mới bị bớt cột, các trường không còn tồn tại sẽ tự động bị loại khỏi hàng, cột và giá trị.",
      "Mọi thay đổi nguồn dữ liệu đều có thể hoàn tác ngay bằng tổ hợp phím Ctrl+Z."
    ]
  },
  {
    id: "sheet.data.pivotGroup",
    app: "sheet",
    commandIds: ["sheet.data.pivotGroup", "sheet.data.pivotUngroup"],
    title: "Nhóm và Bỏ nhóm trong Bảng tổng hợp (Group & Ungroup)",
    summary: "Gom nhóm các giá trị số thành từng khoảng (bắt đầu, kết thúc, bước nhảy) hoặc nhóm ngày tháng theo Ngày, Tháng, Quý, Năm trong Bảng tổng hợp; nhấn Bỏ nhóm để phục hồi dữ liệu gốc.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Bảng tổng hợp" },
    keywords: ["nhóm", "group", "bỏ nhóm", "ungroup", "nhóm số", "nhóm ngày", "tháng", "quý", "năm", "bảng tổng hợp"],
    steps: [
      "Chọn một ô nhãn hàng hoặc cột cần nhóm trong Bảng tổng hợp trên trang tính.",
      "Mở tab Dữ liệu, nhóm Bảng tổng hợp, nhấn nút Nhóm để mở hộp thoại cấu hình nhóm.",
      "Chọn trường cần nhóm và thiết lập kiểu nhóm: với dữ liệu số, nhập Bắt đầu, Kết thúc và Bước nhảy (ví dụ bắt đầu 10, kết thúc 40, bước 10 sinh các nhãn <10, 10-19, 20-29, 30-40, >40); với ngày tháng, đánh dấu các ô Ngày, Tháng, Quý, Năm hoặc kết hợp.",
      "Nhấn nút Áp dụng: Bảng tổng hợp gom các bản ghi theo nhóm và tính lại tổng số liệu tương ứng.",
      "Khi muốn trở về danh sách chi tiết ban đầu, chọn trường đã nhóm rồi nhấn nút Bỏ nhóm trên nhóm Bảng tổng hợp hoặc trong hộp thoại."
    ]
  },
  {
    id: "sheet.data.pivotCalculatedField",
    app: "sheet",
    commandIds: ["sheet.data.pivotCalculatedField"],
    title: "Trường tính toán trong Bảng tổng hợp (Calculated Field)",
    summary: "Thêm, sửa hoặc xóa trường tính toán tùy biến trong Bảng tổng hợp bằng công thức toán học tham chiếu tới các trường dữ liệu khác theo đúng chuẩn tính tổng.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Bảng tổng hợp" },
    keywords: ["trường tính toán", "calculated field", "công thức bảng tổng hợp", "thêm trường", "tính toán", "bảng tổng hợp"],
    steps: [
      "Chọn trang tính có Bảng tổng hợp cần tạo trường tính toán mới.",
      "Mở tab Dữ liệu, nhóm Bảng tổng hợp, nhấn nút Trường tính toán để mở hộp thoại thiết lập.",
      "Nhập Tên trường (ví dụ Thue_VAT) và Công thức bắt đầu bằng dấu bằng (ví dụ =Doanh_so*0.1 hoặc ='Đơn giá'*'Số lượng'). Nhấp đúp vào tên trường trong danh mục để chèn nhanh vào công thức.",
      "Nhấn Thêm / Sửa: trường mới được thêm vào danh sách và tự động tính toán giá trị dựa trên tổng của các trường thành phần.",
      "Để sửa công thức hoặc xóa trường tính toán đã tạo, chọn trường đó trong danh mục bên phải rồi bấm Sửa hoặc Xóa; nhấn Đóng khi hoàn tất. Cấu hình được lưu và bảo toàn khi xuất tệp."
    ]
  },
  {
    id: "sheet.format.conditional",
    app: "sheet",
    commandIds: ["sheet.format.conditional", "sheet.format.clearRulesSelection", "sheet.format.clearRulesSheet"],
    title: "Định dạng có điều kiện",
    summary: "Tô nổi ô theo điều kiện: so sánh giá trị, văn bản chứa, ngày, trùng lặp, trên/dưới N hoặc phần trăm, trên/dưới trung bình, thanh dữ liệu, thang màu, bộ biểu tượng hoặc công thức. Mỗi quy tắc lưu cùng sổ tính; mở bằng phần mềm bảng tính khác vẫn là quy tắc định dạng có điều kiện gốc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
    keywords: ["định dạng có điều kiện", "conditional formatting", "tô màu", "quy tắc", "ô trống", "lớn hơn", "thanh dữ liệu", "thang màu", "bộ biểu tượng", "trùng lặp", "trên dưới", "trung bình", "ngày xảy ra", "công thức"],
    steps: [
      "Bôi vùng cần tô nổi (ví dụ cột điểm). Tab Trang đầu, nhóm Kiểu ô, nhấn nút lớn Định dạng có điều kiện. Hộp thoại có danh sách Quy tắc hiện có ở trên và khung Quy tắc ở dưới.",
      "Chọn loại quy tắc. Tô sáng ô: Lớn hơn, Nhỏ hơn, Giữa hai giá trị, Bằng, Chứa văn bản, Ngày xảy ra (hôm qua, hôm nay, tuần này, tháng này…), Giá trị trùng lặp, Ô trống. Trên/Dưới: N giá trị hoặc tỷ lệ phần trăm cao nhất/thấp nhất, trên hoặc dưới mức trung bình. Hiển thị trực quan: Thanh dữ liệu, Thang màu 2 màu hoặc 3 màu, Bộ biểu tượng (mũi tên, đèn tín hiệu, ký hiệu, xếp hạng; có tùy chọn đảo thứ tự biểu tượng). Nâng cao: Công thức, ví dụ =$B2>100 tô cả hàng theo cột B.",
      "Nhập ngưỡng, văn bản, số N, tỷ lệ từ 1 đến 100 hoặc công thức nếu loại quy tắc yêu cầu; chọn Màu nền (hoặc các màu của thang/thanh). Thang 3 màu dùng phân vị 50 (trung vị) làm màu giữa. Có thể sửa Vùng áp dụng ngay trong hộp thoại. Nhấn Áp dụng: các ô khớp được tô ngay.",
      "Trong danh sách Quy tắc hiện có: bấm một dòng để sửa, bấm mũi tên lên/xuống để đổi thứ tự ưu tiên (quy tắc ở trên được xét trước), bấm Xóa quy tắc để bỏ. Mọi thay đổi hoàn tác được bằng Ctrl+Z.",
      "Xóa nhanh quy tắc: ngay cạnh nút lớn có hai nút nhỏ. «Xóa quy tắc ở ô đã chọn» chỉ gỡ quy tắc khỏi các ô đang bôi đen — nếu quy tắc phủ rộng hơn vùng chọn, phần ngoài vùng chọn vẫn giữ quy tắc (quy tắc được tách thành các vùng còn lại). «Xóa quy tắc cả trang tính» gỡ hết mọi quy tắc của trang hiện tại. Cả hai hoàn tác được bằng Ctrl+Z.",
      "Khi lưu .xlsx, các quy tắc được ghi thành quy tắc định dạng có điều kiện chuẩn; mở lại trong Sheet hoặc bảng tính khác đều thấy đúng loại, vùng và màu.",
      "Cùng nhóm Kiểu ô còn Định dạng bảng (màu xen kẽ) và Kiểu ô (Normal, Good, Bad, Neutral…) — khác với quy tắc có điều kiện."
    ]
  },
  {
    id: "sheet.data.validation",
    app: "sheet",
    commandIds: ["sheet.data.validation"],
    title: "Kiểm tra dữ liệu",
    summary: "Giới hạn dữ liệu nhập theo số nguyên, số thập phân, danh sách, ngày, giờ, độ dài văn bản hoặc công thức; kèm thông báo nhập và ba mức cảnh báo lỗi.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["kiểm tra dữ liệu", "data validation", "danh sách", "số nguyên", "số thập phân", "ngày", "giờ", "độ dài văn bản", "công thức tùy chỉnh", "thông báo nhập", "cảnh báo lỗi", "khoanh dữ liệu sai"],
    steps: [
      "Bôi các ô cần giới hạn. Mở tab Dữ liệu, nhóm Công cụ dữ liệu, nhấn Kiểm tra dữ liệu (cột giữa, dưới Điền nhanh / Xóa trùng lặp).",
      "Trong Thiết đặt, chọn loại: Số nguyên, Số thập phân, Danh sách lựa chọn, Ngày, Giờ, Độ dài văn bản hoặc Tùy chỉnh (công thức). Với số/ngày/giờ/độ dài, chọn toán tử giữa, không giữa, bằng, khác, lớn hơn, nhỏ hơn… rồi nhập một hoặc hai giới hạn. Danh sách nhận các mục cách nhau bằng dấu phẩy; công thức tùy chỉnh bắt đầu bằng dấu =.",
      "Mở phần Thông báo nhập, đánh dấu Hiện thông báo khi chọn ô rồi nhập Tiêu đề và Nội dung. Thông báo này hiện khi trỏ vào ô đã kiểm tra.",
      "Trong Cảnh báo lỗi, chọn Dừng để từ chối dữ liệu sai; Cảnh báo hoặc Thông tin để báo nhưng vẫn cho giữ giá trị. Có thể tự đặt tiêu đề và nội dung lỗi. Nhấn Đồng ý để áp dụng.",
      "Nhấn Khoanh vòng dữ liệu sai để đánh dấu các ô hiện có đang vi phạm. Nút Xóa tất cả gỡ quy tắc khỏi đúng vùng đang chọn, không xóa dữ liệu trong ô.",
      "Ô danh sách có mũi tên chọn. Khi lưu tệp bảng tính hiện đại rồi mở lại, loại, toán tử, công thức và nội dung cảnh báo được giữ cùng tài liệu.",
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
    summary: "Vẽ biểu đồ Cột, Thanh ngang, Cột chồng, Phân tán, Kết hợp, Radar, Bong bóng và các loại thông dụng khác; có nhãn dữ liệu, chuyển hàng/cột và đường xu hướng.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Biểu đồ" },
    keywords: ["biểu đồ", "chart", "cột", "thanh ngang", "cột chồng", "100%", "phân tán", "kết hợp", "radar", "bong bóng", "nhãn dữ liệu", "chuyển hàng cột", "đường xu hướng"],
    steps: [
      "Bôi vùng dữ liệu: thường cột nhãn (chữ) kèm cột số, có thể gồm hàng tiêu đề. Vùng không có số sẽ báo lỗi.",
      "Mở tab Chèn, nhóm Biểu đồ, nhấn nút lớn Biểu đồ (hoặc nhấn nút mũi tên mở rộng ở góc dưới phải nhóm Biểu đồ chuẩn phần mềm bảng tính khác).",
      "Trong hộp thoại Chèn biểu đồ từ «vùng», chọn Cột, Thanh ngang, Cột chồng, Cột chồng 100%, Đường, Tròn, Miền, Phân tán, Kết hợp, Radar hoặc Bong bóng để xem trước. Phân tán cần ít nhất hai cột số (X, Y); Bong bóng nên có ba cột số (X, Y, kích thước); Kết hợp cần từ hai chuỗi số.",
      "Nhấn Chèn vào bảng tính. Biểu đồ nằm trên lưới, dùng dữ liệu của vùng đã chọn. Đổi số trong vùng nguồn rồi biểu đồ cập nhật theo dữ liệu sheet.",
      "Trên biểu đồ, nhấn Nhãn để hiện/ẩn giá trị tại từng điểm; nhấn Hàng/cột để đổi cách mỗi hàng hoặc cột trở thành một chuỗi; nhấn Xu hướng để thêm/bỏ đường xu hướng tuyến tính. Các nút đổi trạng thái ngay, có thể hoàn tác bằng Ctrl+Z. Cũng có thể dùng các lệnh tương ứng trong menu chuột phải của biểu đồ.",
      "Với biểu đồ có trục, nhấn «Tiêu đề trục» ở góc trên biểu đồ. Nhập riêng «Trục ngang (X)» và «Trục dọc (Y)», rồi nhấn Áp dụng; để trống một ô nếu không muốn hiện tiêu đề trục đó. Khi lưu XLSX rồi mở lại, loại biểu đồ, các chuỗi, nhãn dữ liệu, hướng hàng/cột và đường xu hướng vẫn được giữ.",
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
    id: "sheet.view.split",
    app: "sheet",
    commandIds: ["sheet.view.split"],
    title: "Chia cửa sổ trang tính (Split)",
    summary: "Chia cửa sổ tại ô hiện tại thành các ngăn xem nhưng không đóng băng hàng/cột; trạng thái Split được giữ khi lưu và mở lại XLSX.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Cửa sổ" },
    keywords: ["chia", "split", "chia cửa sổ", "ngăn xem", "không đóng băng", "pane"],
    steps: [
      "Chọn ô nằm ngay bên dưới và bên phải vị trí muốn chia. Ví dụ chọn C4 để đặt vạch chia sau cột B và sau hàng 3.",
      "Mở tab Chế độ xem, nhóm Cửa sổ, nhấn «Chia». Vạch ngang, vạch dọc hoặc cả hai xuất hiện tùy vị trí ô; đây là Split, không phải Cố định ô.",
      "Cuộn trang tính để xem vùng dữ liệu ở hai phía vạch chia. Hàng và cột không bị ghim cố định như Freeze Panes.",
      "Nhấn «Chia» lần nữa để bỏ chia. Bật Cố định ô sẽ thay thế Split và ngược lại; có thể dùng Ctrl+Z/Ctrl+Y để hoàn tác hoặc làm lại.",
      "Khi lưu XLSX, Sheet ghi pane ở trạng thái split. Mở lại trong Sheet hoặc ứng dụng bảng tính tương thích vẫn giữ Split, không chuyển thành Freeze Panes."
    ]
  },
  {
    id: "sheet.page.setupRound2", app: "sheet",
    commandIds: ["sheet.page.scale", "sheet.page.fitWidth", "sheet.page.fitHeight", "sheet.page.headerFooter", "sheet.page.margins", "sheet.page.printTitles"],
    title: "Thiết lập trang in nâng cao",
    summary: "Thu bảng tính vừa số trang mong muốn, thêm đầu/cuối trang động, căn giữa nội dung, chọn in đường kẻ hoặc tiêu đề hàng/cột, thiết lập in ghi chú, lỗi ô, thứ tự trang và đặt hàng/cột lặp lại trên mỗi trang in (Print Titles).",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["tỷ lệ", "vừa trang", "scale", "đầu trang", "cuối trang", "đường kẻ", "tiêu đề hàng cột", "in", "print titles", "hàng lặp lại", "cột lặp lại", "in đường lưới", "in ghi chú", "lỗi ô", "thứ tự trang", "trang tính"],
    steps: [
      "Mở tab Bố trí trang, nhóm Thiết lập trang.",
      "Cách nhanh: nhóm Vừa trang có hai danh sách Chiều rộng và Chiều cao — chọn Tự động, 1 đến 5 trang hoặc Thêm trang… để thu bản in vừa số trang mong muốn (đặt cả hai về Tự động thì trở lại thu phóng theo phần trăm). Cách chi tiết: nhấn Tỷ lệ vừa trang. Chọn Vừa theo tỷ lệ và nhập 10–400%, hoặc chọn Vừa trong rồi nhập số trang ngang và dọc; nhập 0 cho chiều muốn để tự động.",
      "Trong cùng hộp thoại, đánh dấu Theo chiều ngang hoặc Theo chiều dọc ở mục Căn giữa trang khi in.",
      "Đánh dấu In đường kẻ ô hoặc In tiêu đề hàng và cột nếu cần chúng xuất hiện trên giấy/PDF, rồi nhấn Áp dụng.",
      "Tab Trang tính trong hộp thoại Thiết lập trang: Tùy chỉnh chi tiết các lựa chọn in gồm In đường lưới, In tiêu đề hàng và cột; In ghi chú (Không, Ở cuối trang tính, Như hiển thị trên trang tính); Lỗi ô hiển thị (Như hiển thị, <trống>, --, hoặc #N/A); và Thứ tự trang khi bảng tính chia nhiều trang in (Xuống dưới, rồi sang hoặc Sang ngang, rồi xuống). Mọi thiết lập được lưu theo trang tính hiện tại.",
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
      "Mở tab Bố trí trang, nhóm Thiết lập trang. Nhấn mũi tên của Căn lề để chọn nhanh Thường, Rộng, Hẹp (hoặc Căn lề tùy chỉnh… để nhập số), Hướng giấy để chọn Dọc/Ngang và Khổ giấy để chọn Letter/Legal/A3/A4/A5 cho trang tính hiện tại.",
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
    steps: ["Mở tab Xem xét, nhóm Ghi chú.", "Nhấn Nhận xét trước hoặc Nhận xét sau; Sheet chọn ô có ghi chú và tự chuyển sheet khi cần, rồi quay vòng ở cuối danh sách.", "Nhấn Đã xử lý để đổi dấu góc sang màu xám nhưng vẫn giữ ghi chú; nhấn lại để mở lại. Nhấn Ctrl+S rồi mở lại tệp trong Sheet để kiểm tra trạng thái đã lưu.", "XLSX hiện giữ ghi chú theo định dạng legacy và lưu trạng thái Đã xử lý trong phần mở rộng riêng của Sheet. Ứng dụng bảng tính khác vẫn hiển thị ghi chú nhưng không hiển thị trạng thái Đã xử lý; trạng thái này chưa theo định dạng threaded comment.", "Nhấn Xóa nhận xét để xóa ghi chú ở ô đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại."]
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
      "Cách nhanh hơn để đổi thứ tự: giữ chuột trái trên tab trang tính rồi kéo sang trái hoặc phải. Vạch xanh cho biết nơi tab sẽ rơi; thả chuột để đặt, nhấn Esc khi đang kéo để hủy. Kéo ngắn dưới vài điểm ảnh vẫn là nhấp chọn tab bình thường.",
      "Hoàn tác thêm bản sao hoặc đổi thứ tự bằng Ctrl+Z."
    ]
  },
  {
    id: "sheet.sheet.visibility",
    app: "sheet",
    commandIds: ["sheet.sheet.hide", "sheet.sheet.unhide", "sheet.sheet.rename", "sheet.sheet.moveOrCopy"],
    title: "Ẩn, hiện, đổi tên và sắp xếp trang tính",
    summary: "Ẩn trang tính khỏi dải tab, hiện lại trang tính đã ẩn, đổi tên hoặc di chuyển trang tính trong workbook.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Ô" },
    keywords: ["ẩn trang tính", "hiện trang tính", "hide sheet", "unhide sheet", "đổi tên sheet", "di chuyển sheet", "tab trang tính"],
    steps: [
      "Chọn tab trang tính cần thao tác. Mở Trang đầu → nhóm Ô → Định dạng; các lệnh Ẩn trang tính và Hiện trang tính nằm ở cuối danh sách. Hoặc nhấp phải trực tiếp lên tab để mở menu thao tác.",
      "Chọn Ẩn trang tính để bỏ tab khỏi thanh dưới lưới. Sheet giữ dữ liệu và tự chuyển sang một trang tính đang hiện; không thể ẩn trang tính cuối cùng còn hiển thị.",
      "Để khôi phục, chọn Hiện trang tính, chọn tên trong danh sách rồi nhấn Hiện. Trang tính xuất hiện lại trên thanh tab.",
      "Đổi tên bằng Đổi tên trang tính hoặc nhấp đúp tab, nhập tên mới rồi xác nhận. Di chuyển hoặc sao chép bằng lệnh Di chuyển hoặc Sao chép trang tính, chọn vị trí chèn và đánh dấu Tạo một bản sao nếu muốn giữ trang gốc.",
      "Xóa trang tính bằng menu nhấp phải tab → Xóa trang tính rồi xác nhận. Ctrl+Z hoàn tác thao tác ẩn/hiện, đổi tên và di chuyển; việc xóa cũng có thể hoàn tác ngay sau khi thực hiện."
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
      "Muốn chừa vài ô cho người khác nhập: TRƯỚC khi bảo vệ, chọn các ô đó, mở Định dạng ô, tab Bảo vệ, bỏ chọn Khóa (Locked) rồi Đồng ý. Sau khi bảo vệ trang, chỉ các ô đã mở khóa mới sửa được; ô chưa mở khóa (mặc định mọi ô đều khóa) bị chặn.",
      "Nếu vùng chọn có dù chỉ một ô khóa (ví dụ chọn cả ô khóa lẫn ô mở khóa rồi nhấn Delete), thao tác bị chặn toàn bộ và hiện thông báo; hãy chọn riêng các ô đã mở khóa.",
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
      "Chọn ô hoặc vùng. Tab Trang đầu, nhóm Căn chỉnh: hàng trên Căn trên / Căn giữa dọc / Căn dưới / Ngắt dòng tự động / Hướng chữ; hàng giữa Căn trái / giữa / phải, Giảm/Tăng thụt lề; hàng dưới bốn nút trộn ô. Nhấn mũi tên nhỏ ở góc phải nhóm để mở hộp thoại Định dạng ô tại thẻ Căn chỉnh.",
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
    summary: "Sắp xếp theo giá trị hoặc màu; lọc theo danh sách, điều kiện văn bản, số, ngày, màu ô và màu chữ từ nút ở tiêu đề cột.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Sắp xếp & Lọc" },
    keywords: ["sắp xếp", "a-z", "z-a", "bộ lọc", "autofilter", "lọc", "sort", "filter", "ctrl+shift+l", "sắp xếp tùy chỉnh", "custom sort", "nhiều cột", "multi-level sort"],
    steps: [
      "Bôi bảng (gồm hàng tiêu đề nếu có) hoặc đứng trên một ô trong cột khóa. Tab Dữ liệu, nhóm Sắp xếp & Lọc — ba nút lớn: Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc, và nút nhỏ Sắp xếp tùy chỉnh. Cùng lệnh cũng có trên tab Trang đầu, nhóm Chỉnh sửa.",
      "A–Z / Z–A sắp cả hàng theo cột đang chọn. Số so sánh như số; chữ theo locale vi-VN. Hàng «Tổng» (chữ Tổng hoặc công thức SUM) được bỏ qua khi không bôi vùng. Cần ít nhất 2 hàng dữ liệu.",
      "Sắp xếp tùy chỉnh mở hộp thoại nhiều cấp (như phần mềm bảng tính khác Data > Sort): đánh dấu Dữ liệu có hàng tiêu đề nếu có, chọn cột và thứ tự A→Z/Z→A cho từng cấp «Sắp xếp theo» / «Sau đó theo», bấm + Thêm cấp để thêm tối đa 4 cấp, dấu × để xóa một cấp. Hàng trùng ở cấp trước giữ nguyên thứ tự tương đối và được phân theo cấp sau.",
      "Bộ lọc (Ctrl+Shift+L) bật/tắt nút lọc trên hàng tiêu đề. Nhấn nút của một cột: phía trên có sắp tăng/giảm; nếu cột có màu, các ô màu cho phép đưa màu ô hoặc màu chữ đã chọn lên đầu, hoặc chỉ giữ các hàng có màu đó.",
      "Cột đang dùng định dạng có điều kiện kiểu bộ biểu tượng (đèn giao thông, mũi tên…) có thêm hàng nút biểu tượng ngay dưới các nút màu: bấm một biểu tượng để đưa các hàng mang biểu tượng đó lên đầu, giữ nguyên thứ tự cũ trong từng nhóm. Ctrl+Z hoàn tác.",
      "Lọc theo điều kiện: chọn Văn bản để dùng chứa, không chứa, bắt đầu bằng, kết thúc bằng, bằng hoặc khác; chọn Số để dùng lớn hơn/nhỏ hơn, giữa hoặc các giá trị lớn nhất; chọn Ngày để dùng hôm nay, tháng này, năm nay, trước/sau hoặc giữa hai ngày. Nhập giá trị rồi bấm Lọc.",
      "Lọc theo giá trị vẫn cho phép đánh dấu từng mục; mục (Trống) điều khiển riêng các hàng có ô trống. Nhiều cột có thể cùng mang điều kiện và một hàng chỉ hiện khi thỏa tất cả điều kiện.",
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
    summary: "Chèn tệp ảnh từ máy tính neo vào ô bảng tính. Kéo-thả thẻ ảnh để di chuyển giữa các ô (tự động neo về góc ô gần nhất). Hỗ trợ menu chuột phải (hoặc phím Menu ngữ cảnh) để Cắt, Sao chép, Dán, Đưa lên trên/xuống dưới, Xóa ảnh và Định dạng đối tượng.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["chèn ảnh", "hình ảnh", "image", "picture", "minh họa", "ảnh ô", "kéo thả ảnh", "di chuyển ảnh", "drag image", "menu chuột phải ảnh", "định dạng ảnh"],
    steps: [
      "Chọn ô đích muốn đặt ảnh. Mở tab Chèn, nhóm Minh họa, nhấn nút lớn Chèn ảnh (hoặc dùng menu Chèn).",
      "Chọn file ảnh trên máy tính rồi nhấn Mở. Ảnh được chèn lên bảng tính với góc trên bên trái neo vào ô đã chọn.",
      "Di chuyển ảnh: Nhấp giữ chuột trái trên khung ảnh (con trỏ chuột đổi thành biểu tượng di chuyển) rồi kéo đến vị trí mong muốn. Trong lúc kéo, ô lưới đích gần nhất sẽ được viền sáng nét đứt (.is-drop-target) giúp người dùng xác định rõ vị trí thả. Khi thả chuột, ảnh tự động căn chỉnh và neo chuẩn xác về góc ô đích. Nếu bảng tính có Freeze Panes, ảnh nằm trong vùng đóng băng sẽ giữ nguyên vị trí hiển thị khi cuộn.",
      "Hoàn tác di chuyển: Nhấn Ctrl+Z để đưa ảnh về vị trí ô trước đó, hoặc Ctrl+Y để làm lại thao tác di chuyển.",
      "Thao tác qua menu chuột phải hoặc bàn phím: Nhấp chuột phải vào ảnh (hoặc chọn ảnh rồi nhấn phím Menu (ngữ cảnh) trên bàn phím) để mở menu ngữ cảnh đối tượng. Menu bao gồm: Cắt (Ctrl+X), Sao chép (Ctrl+C), Dán (Ctrl+V); Đưa lên trên (Lên trên cùng, Lên một mức); Đưa xuống dưới (Xuống dưới cùng, Xuống một mức); Xóa (hoặc nhấn Delete / Backspace); và Định dạng đối tượng để xem kích thước, vị trí ô neo và khoảng cách lệch.",
      "Xóa ảnh: Nhấp vào nút dấu nhân (×) màu đỏ ở góc trên bên phải của thẻ ảnh, hoặc chọn ảnh rồi nhấn Delete/Backspace, hoặc dùng lệnh Xóa trong menu chuột phải. Có thể nhấn Ctrl+Z để khôi phục ảnh vừa xóa.",
      "Cùng tab Chèn còn có Biểu đồ và Biểu đồ thu nhỏ (sparkline) phục vụ trực quan hóa dữ liệu số."
    ]
  },
  {
    id: "sheet.insert.hyperlink",
    app: "sheet",
    commandIds: ["sheet.insert.hyperlink"],
    title: "Chèn liên kết vào ô",
    summary: "Gắn địa chỉ web (http/https), email (mailto:) hoặc vị trí trong sổ làm việc (trang tính + ô) vào ô đang chọn. Ô trống sẽ hiện chính địa chỉ; ô đã có chữ giữ nguyên chữ và trở thành liên kết. Phím tắt chung Ctrl+K.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["liên kết", "hyperlink", "url", "ctrl+k", "mailto", "chèn link"],
    steps: [
      "Chọn ô. Tab Chèn, nhóm Liên kết, nhấn Liên kết — hoặc Ctrl+K (lệnh dùng chung common.edit.hyperlink, Sheet chuyển vào cùng hộp).",
      "Hộp «Chèn liên kết»: nhập địa chỉ bắt đầu bằng https://, http:// hoặc mailto:. Mặc định gợi ý https://. Xác nhận.",
      "Muốn nhảy tới một ô trong chính sổ này: trong hộp «Chèn liên kết», ở mục «Liên kết tới» chọn «Vị trí trong sổ làm việc này», chọn Trang tính, gõ Tham chiếu ô (ví dụ B5 hoặc A1:C3) rồi xác nhận.",
      "Bấm vào chữ liên kết (hoặc chuột phải > Mở siêu liên kết) để đi tới đúng trang và ô đích. Nếu trang tính đích đã bị xóa hoặc đổi tên, hộp báo không tìm thấy.",
      "Địa chỉ không hợp lệ (thiếu http/mailto) bị từ chối, không ghi vào ô. Ô trống nhận luôn URL làm chữ hiển thị.",
      "Ctrl+Z gỡ liên kết vừa gắn."
    ]
  },
  {
    id: "sheet.view.expandFormulaBar",
    app: "sheet",
    commandIds: ["sheet.view.expandFormulaBar"],
    title: "Mở rộng thanh công thức",
    summary: "Làm thanh công thức cao hơn (từ 5 đến 12 dòng) để đọc và sửa công thức dài nhiều dòng; thu gọn lại khi không cần.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["mở rộng thanh công thức", "expand formula bar", "ctrl+shift+u", "công thức dài", "nhiều dòng"],
    steps: [
      "Mở tab Chế độ xem, nhóm Hiển thị, nhấn «Mở rộng thanh công thức» — hoặc nhấn Ctrl+Shift+U, hoặc bấm mũi tên ▾ ở đầu bên phải thanh công thức.",
      "Thanh công thức cao ít nhất 5 dòng và dài thêm theo nội dung đến tối đa 12 dòng. Nhấn Alt+Enter trong ô để xuống dòng; công thức nhiều dòng đọc dễ hơn nhiều.",
      "Nhấn lại cùng nút hoặc Ctrl+Shift+U (hoặc mũi tên ▴) để thu gọn về một dòng. Chỉ đổi cách hiển thị, không đổi nội dung ô và không đi vào tệp lưu."
    ]
  },
  {
    id: "sheet.insert.symbol",
    app: "sheet",
    commandIds: ["sheet.insert.symbol"],
    title: "Chèn ký hiệu đặc biệt vào ô",
    summary: "Chèn các ký tự đặc biệt, biểu tượng toán học, tiền tệ (₫, €, £, ¥) hoặc mũi tên vào ô bảng tính đang chọn bằng bảng ký hiệu dùng chung.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["ký hiệu", "symbol", "ký tự đặc biệt", "đồng", "toán học", "mũi tên", "chèn ký hiệu"],
    steps: [
      "Chọn ô cần chèn ký hiệu trên lưới Sheet.",
      "Vào tab Chèn, nhóm Ký hiệu, nhấn nút Ký hiệu.",
      "Trong bảng chọn ký hiệu dùng chung: nhấp vào ký tự mong muốn (ví dụ ₫, ©, ™, ∑, →). Ký tự sẽ được chèn ngay vào ô.",
      "Nhấn phím Esc hoặc nút Hủy bỏ để đóng hộp thoại mà không chèn.",
      "Nhấn Ctrl+Z để hoàn tác việc chèn ký hiệu trong 1 bước."
    ]
  },
  {
    id: "sheet.insert.textbox",
    app: "sheet",
    commandIds: ["sheet.insert.textbox"],
    title: "Chèn hộp văn bản nổi",
    summary: "Hộp chữ nổi neo theo ô đang chọn, gõ được, kéo góc để đổi cỡ hoặc tinh chỉnh vị trí/kích thước trong hộp thoại Định dạng đối tượng. Hỗ trợ menu chuột phải (hoặc phím Menu ngữ cảnh) để Cắt, Sao chép, Dán, Đưa lên trên/xuống dưới và Xóa.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["hộp văn bản", "textbox", "chú thích nổi", "khung chữ", "ghi chú ô", "menu chuột phải hộp văn bản", "định dạng hộp văn bản"],
    steps: [
      "Chọn ô neo (góc trên-trái hộp sẽ bám ô này). Tab Chèn, nhóm Văn bản, nhấn Hộp văn bản.",
      "Hộp «Chèn hộp văn bản» hỏi nội dung. Nhập chữ rồi xác nhận. Hộp trắng, viền xám, kích thước ban đầu khoảng 180×54 px, hiện trên lớp nổi của sheet.",
      "Nhấp vào hộp để sửa chữ hoặc nhấp chọn hộp (viền nét đứt màu xanh xuất hiện). Khi đang chọn, nhấn phím Delete hoặc Backspace để xóa hộp.",
      "Menu chuột phải và phím tắt: Chuột phải vào hộp văn bản (hoặc nhấn phím Menu (ngữ cảnh) khi đang chọn) để mở menu ngữ cảnh đối tượng. Menu bao gồm: Cắt (Ctrl+X), Sao chép (Ctrl+C), Dán (Ctrl+V); Đưa lên trên (Lên trên cùng, Lên một mức); Đưa xuống dưới (Xuống dưới cùng, Xuống một mức); Xóa; và Định dạng đối tượng... Trong hộp thoại Định dạng đối tượng, bạn có thể chỉnh sửa trực tiếp độ rộng, chiều cao, ô neo, độ lệch và nội dung chữ của hộp.",
      "Kéo góc dưới bên phải để đổi cỡ nhanh. Nhấn Ctrl+S để lưu XLSX; khi mở lại trong Sheet hoặc ứng dụng bảng tính khác, nội dung, ô neo và kích thước được giữ nguyên.",
      "Mỗi trang tính có danh sách hộp riêng. Hộp được xuất thành đối tượng DrawingML trong XLSX để các ứng dụng hỗ trợ định dạng này hiển thị và in cùng trang tính."
    ]
  },
  {
    id: "sheet.insert.dateTime",
    app: "sheet",
    commandIds: ["sheet.insert.date", "sheet.insert.time"],
    title: "Chèn ngày và giờ hiện tại",
    summary: "Hai lệnh bàn phím, không có nút riêng trên ribbon: Ctrl+; ghi ngày hôm nay vào ô đang chọn; Ctrl+Shift+; ghi giờ hiện tại dưới dạng giá trị số có định dạng giờ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chèn ngày", "chèn giờ", "ctrl+;", "hôm nay", "today", "now", "dd/mm/yyyy", "giờ hiện tại"],
    steps: [
      "Chọn ô trống (hoặc ô muốn ghi đè). Không có nút Ngày/Giờ trên ribbon Sheet — dùng phím tắt.",
      "Ctrl+; (Ctrl và phím chấm phẩy) chèn ngày máy tính, ví dụ 06/09/2026. Đây là chữ/ngày tĩnh, không tự đổi ngày mai.",
      "Ctrl+Shift+; chèn giờ máy tính, ví dụ 14:05. Ô được lưu dưới dạng số có định dạng giờ nên có thể cộng, trừ hoặc dùng trong công thức; đây là giá trị tĩnh và không tự chạy theo đồng hồ.",
      "Muốn đổi cách hiển thị, chọn ô rồi nhấn Ctrl+1 để mở Định dạng ô và chọn kiểu Ngày hoặc Giờ phù hợp. Ctrl+Z xóa giá trị vừa chèn; Ctrl+Y khôi phục cả giá trị lẫn định dạng."
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
      "Tài chính (11 hàm): PMT, FV, PV, NPV, IRR, RATE, NPER, IPMT, PPMT, SLN, DB. Logic (11): IF, AND, OR, NOT, IFERROR (bắt mọi lỗi gồm chia 0, hàm lồng nhau), IFNA, ISBLANK, ISNUMBER, ISTEXT, ISERROR, ISNA. Văn bản (18): CONCAT, CONCATENATE, LEFT/RIGHT/MID, LEN, UPPER/LOWER/PROPER, TRIM, TEXT, VALUE, SUBSTITUTE, REPLACE không có — dùng SUBSTITUTE; FIND (phân biệt hoa thường), SEARCH (không phân biệt), TEXTJOIN, REPT, EXACT.",
      "Ngày tháng (13): TODAY, NOW, DATE, YEAR/MONTH/DAY, DATEDIF, EDATE, EOMONTH, WEEKDAY, DAYS, NETWORKDAYS, WORKDAY. Các hàm DATE, TODAY, EDATE, EOMONTH, WORKDAY trả về số serial ngày chuẩn (NOW kèm phần thập phân giờ phút) và tự áp dụng định dạng dd/mm/yyyy; các hàm YEAR/MONTH/DAY/WEEKDAY nhận số serial hoặc chuỗi ngày để trích xuất thành phần. Bạn có thể cộng trừ số học trực tiếp trên ngày như =A1+1 hoặc =DATE(2026,12,31)+1. Tra cứu (9): VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP, LOOKUP, CHOOSE, INDIRECT, OFFSET. Toán học (15): SUM, PRODUCT, ABS, ROUND/ROUNDUP/ROUNDDOWN (ROUND làm tròn nửa ra xa 0 cho cả số âm), INT, MOD, SQRT, POWER, CEILING, FLOOR, TRUNC, SIGN, SUMPRODUCT. Thêm hàm mở nhóm Thống kê (19): AVERAGE, COUNT/COUNTA/COUNTBLANK, MIN/MAX, COUNTIF(S), SUMIF(S) (vùng tổng và vùng điều kiện phải cùng kích thước), AVERAGEIF(S), MEDIAN, RANK, RANK.EQ, LARGE, SMALL, STDEV, VAR.",
      "Trong hộp: ô «Tìm kiếm hàm» lọc theo tên hoặc mô tả; khung phải hiện cú pháp (=VLOOKUP(...)) và mô tả tiếng Việt. Nhấp đúp hoặc «Chèn hàm vào ô» chèn =TÊN_HÀM(...) vào ô đang chọn. Hủy bỏ / Esc đóng. Cùng hộp cũng mở bằng Chèn hàm (Shift+F3) hoặc nút fx trên thanh công thức — bài «Công thức và hàm cơ bản»."
    ]
  },
  {
    id: "sheet.formula.hypothesisTests",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Hàm kiểm định thống kê: T.TEST, F.TEST, CHISQ.TEST và GAMMA",
    summary: "Bốn hàm thống kê gõ trực tiếp vào ô: T.TEST (kiểm định t, trả xác suất p), F.TEST (so sánh phương sai hai mẫu), CHISQ.TEST (kiểm định khi bình phương cho bảng quan sát và bảng kỳ vọng) và GAMMA (hàm Gamma Γ(x)). Tên cũ TTEST, FTEST, CHITEST cũng dùng được.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["t.test", "ttest", "f.test", "ftest", "chisq.test", "chitest", "gamma", "kiểm định", "xác suất p", "thống kê"],
    steps: [
      "Chọn ô kết quả và gõ công thức, ví dụ =T.TEST(A1:A6,C1:C3,2,3): hai vùng số liệu, số đuôi (1 hoặc 2) và loại kiểm định (1 = ghép cặp, 2 = hai mẫu phương sai bằng nhau, 3 = hai mẫu phương sai khác nhau). Kết quả là xác suất p. Loại 1 cần hai vùng cùng số phần tử, nếu lệch hàm trả #N/A.",
      "=F.TEST(A1:A6,C1:C3) trả xác suất hai phía rằng phương sai của hai vùng không khác nhau; mỗi vùng cần ít nhất 2 số. =CHISQ.TEST(thực_tế, kỳ_vọng) so sánh hai vùng cùng kích thước (ví dụ E1:F2 với G1:H2); ô kỳ vọng bằng 0 trả #DIV/0!, kích thước lệch trả #N/A.",
      "=GAMMA(4.5) tính Γ(x); số nguyên không dương như 0, -1, -2 trả #NUM!. Các hàm cũng có trong hộp Chèn hàm (Shift+F3). Kết quả đã đối chiếu với một bộ tính toán độc lập tới 9 chữ số thập phân."
    ]
  },
  {
    id: "sheet.formula.cellInfo",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Hàm thông tin ô và hệ thống: CELL và INFO",
    summary: "CELL cho biết địa chỉ, cột, hàng, nội dung, loại dữ liệu, định dạng số và căn lề của một ô; INFO cho biết số trang tính, phiên bản và môi trường. Gõ trực tiếp vào ô hoặc chọn trong hộp Chèn hàm.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["cell", "info", "địa chỉ ô", "định dạng ô", "loại dữ liệu", "numfile", "thông tin ô"],
    steps: [
      "=CELL(\"address\",B2) trả $B$2; \"col\" và \"row\" trả số cột, số hàng; \"contents\" trả giá trị; \"type\" trả b (ô trống), l (chữ), v (giá trị khác). Bỏ đối số thứ hai thì lấy chính ô đang tính.",
      "=CELL(\"format\",B2) trả mã định dạng số: G (chung), F2 (số 2 lẻ), ,2 (số có dấu phân cách nghìn), C2 (tiền tệ), P1 (phần trăm), S2 (khoa học), D4 (ngày), D9 (giờ). \"prefix\" trả ' cho chữ căn trái, \" căn phải, ^ căn giữa. Loại thông tin lạ trả #VALUE!.",
      "=INFO(\"numfile\") trả số trang tính, =INFO(\"release\") trả 16.0, =INFO(\"system\") trả pcdos, =INFO(\"recalc\") trả Automatic. memavail, memused và totmem trả #N/A. Tên tệp (\"filename\") hiện trả chuỗi rỗng."
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
      "Dùng trong công thức: nếu chưa có tên nào thì mở luôn Trình quản lý tên. Có tên thì hộp «Dùng tên trong công thức (Paste Name)» — chọn tên rồi chèn vào thanh công thức (ô trống thành =TenVung). Tạo từ vùng chọn: bôi bảng gồm hàng tiêu đề trên và ít nhất một hàng dữ liệu; mỗi cột lấy chữ hàng đầu, bỏ ký tự lạ thành _, đặt tên Workbook cho dải dưới tiêu đề (B1 «Don gia» → Don_gia = B2:B10). Nhấn Ctrl+Shift+F3 hoặc chọn Công thức > Tên đã xác định > Tạo từ vùng chọn. Nếu chỉ chọn một ô hoặc thiếu hàng dữ liệu, ứng dụng hiện hướng dẫn chọn lại vùng gồm tiêu đề và dữ liệu. Dùng tên trong công thức: =SUM(Don_gia). Ctrl+Z hoàn tác lần lưu/xóa."
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
    summary: "Mặc định Tự động: sửa ô nguồn là tính lại ngay. Thủ công giữ nguyên kết quả cũ cho tới F9 (toàn sổ) hoặc Shift+F9 (trang hiện tại). Ctrl+Shift+Enter nhập công thức mảng cho vùng đã bôi.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tính toán" },
    keywords: ["tính toán", "tự động", "thủ công", "manual", "f9", "shift+f9", "công thức mảng", "ctrl+shift+enter", "array formula", "TRANSPOSE", "MMULT", "MINVERSE", "MUNIT", "FREQUENCY", "LINEST", "TREND", "GROWTH", "LOGEST", "chuyển vị", "tính lại"],
    steps: [
      "Tab Công thức, nhóm Tính toán: hộp chọn Tự động (Automatic) / Thủ công (Manual), nút Tính lại toàn bộ (F9), Tính trang hiện tại (Shift+F9). Chọn Thủ công rồi nhấn Ctrl+S để lưu; XLSX ghi chế độ manual, các ứng dụng hỗ trợ thiết lập này sẽ mở tệp ở chế độ tính thủ công. Hai lệnh modeAutomatic / modeManual không có nút riêng — chúng là giá trị của hộp Tùy chọn tính toán.",
      "Tự động (mặc định): mỗi lần setCellValue chạy tính lại phụ thuộc. Thủ công: sửa A1 không đổi ô =A1*2 cho tới khi nhấn F9 (mọi sheet) hoặc Shift+F9 (chỉ sheet đang mở). Chuyển từ Thủ công về Tự động sẽ tính lại toàn bộ ngay.",
      "Công thức mảng không có nút ribbon: bôi đúng vùng kết quả, gõ công thức bắt đầu bằng = trên thanh công thức, rồi nhấn Ctrl+Shift+Enter. Ví dụ, dữ liệu A1:C2 có 2 hàng × 3 cột thì bôi D1:E3, nhập =TRANSPOSE(A1:C2) và nhấn Ctrl+Shift+Enter. Thanh công thức hiện {=TRANSPOSE(A1:C2)} để nhận biết cả vùng là một khối mảng; dấu ngoặc nhọn do ứng dụng quản lý, không cần tự gõ.",
      "Các hàm trả nhiều ô gồm MMULT (nhân ma trận), MINVERSE (ma trận nghịch đảo), MUNIT (ma trận đơn vị), TRANSPOSE, FREQUENCY, LINEST, TREND, GROWTH và LOGEST. Vùng đích phải có đúng số hàng và cột của kết quả. Có thể lấy một phần tử trong ô thường bằng INDEX(hàm_mảng; hàng; cột), hoặc gom kết quả bằng SUM hay SUMPRODUCT.",
      "Để dùng điều kiện theo từng ô, bôi một ô kết quả, nhập ví dụ =SUM(IF(A1:B2>1;1;0)) rồi nhấn Ctrl+Shift+Enter. Nếu chỉ nhấn Enter, công thức thường không chạy theo ngữ cảnh mảng và có thể trả #VALUE!.",
      "Không thể sửa hoặc xóa riêng một ô thuộc khối mảng. Hãy chọn toàn bộ vùng mảng, nhập lại công thức và nhấn Ctrl+Shift+Enter; muốn xóa thì chọn cả vùng rồi nhấn Delete. Ctrl+Z hoàn tác toàn bộ lần nhập hoặc xóa mảng trong một bước. F9 / Shift+F9 vẫn dùng để ép tính lại."
    ]
  },
  {
    id: "sheet.edit.pasteSpecialHelp",
    app: "sheet",
    commandIds: ["sheet.edit.pasteSpecial"],
    title: "Dán đặc biệt",
    summary: "Sau khi Sao chép, nhấn Ctrl+Alt+V (hoặc mở Trang đầu > Dán > Dán đặc biệt) để dán linh hoạt: Tất cả, Chỉ giá trị, Chỉ công thức, Chỉ định dạng, Tất cả trừ đường viền, hoặc Chuyển vị kèm phép toán cộng/trừ/nhân/chia.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["dán đặc biệt", "paste special", "ctrl+alt+v", "chỉ giá trị", "công thức", "định dạng", "chuyển vị", "transpose", "cộng", "trừ", "nhân", "chia", "bỏ qua ô trống"],
    steps: [
      "Bôi đen vùng nguồn cần sao chép rồi nhấn Ctrl+C hoặc nút Sao chép. Chọn ô đích (hoặc vùng đích) cần dán.",
      "Mở hộp thoại: vào tab Trang đầu, nhóm Bảng nhớ tạm, bấm vào mũi tên nút Dán rồi chọn Dán đặc biệt... (hoặc nhấn tổ hợp phím Ctrl+Alt+V, hay bấm chuột phải vào ô đích chọn Dán đặc biệt).",
      "Nhóm Dán gồm các lựa chọn: Tất cả (dán đầy đủ dữ liệu, công thức và định dạng), Chỉ giá trị (loại bỏ công thức, chỉ giữ số hoặc văn bản đã tính toán, không ảnh hưởng định dạng đích), Chỉ công thức (dán công thức kèm tịnh tiến tham chiếu tương đối, giữ nguyên định dạng ô đích), Chỉ định dạng (dán màu sắc, kiểu chữ, kiểu số mà không làm đổi dữ liệu đích), Tất cả trừ đường viền (dán toàn bộ nhưng giữ nguyên đường viền sẵn có của ô đích), Chuyển vị (đổi hàng thành cột và cột thành hàng, các công thức tự động xoay trục tham chiếu tương ứng).",
      "Hai lựa chọn nữa trong nhóm Dán: Quy tắc nhập liệu (chỉ chép các quy tắc kiểm tra dữ liệu như danh sách thả xuống, giới hạn số — dán sang vùng đích tương ứng, không đổi giá trị ô) và Độ rộng cột (chỉ áp độ rộng các cột nguồn lên các cột đích, không đổi dữ liệu). Nếu vùng nguồn chưa có quy tắc nhập liệu nào, hộp báo không có gì để dán.",
      "Nhóm Thao tác cho phép tính toán trực tiếp lên ô đích: Không (mặc định), Cộng (cộng thêm giá trị nguồn vào ô đích), Trừ (lấy ô đích trừ đi giá trị nguồn), Nhân (nhân ô đích với giá trị nguồn), Chia (chia ô đích cho giá trị nguồn). Nếu ô đích có công thức, phép tính được ghép nối an toàn vào biểu thức.",
      "Tùy chọn Bỏ qua ô trống: khi bật, những ô trống ở vùng nguồn sẽ không ghi đè hay làm mất dữ liệu hiện có tại các ô tương ứng ở vùng đích.",
      "Nhấn Enter hoặc nút Áp dụng để dán; nhấn Esc hoặc nút Hủy bỏ để đóng hộp thoại mà không thay đổi dữ liệu. Nhấn Ctrl+Z để hoàn tác toàn bộ thao tác dán trong đúng một bước."
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
    commandIds: ["sheet.review.spellCheck", "sheet.review.toggleSpellCheck"],
    title: "Kiểm tra chính tả tiếng Việt trên trang tính",
    summary: "Gạch đỏ sống khi đang sửa ô (F2 hoặc gõ trực tiếp) và thanh công thức (không gạch công thức =). Chuột phải mở menu gợi ý tiếng Việt, Ctrl+Z hoàn tác 1 bước. Nút Bật/Tắt trên tab Xem xét lưu trạng thái qua lần sau. Phím F7 quét toàn bộ trang tính.",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Kiểm lỗi" },
    keywords: ["chính tả", "spell check", "f7", "từ điển", "tiếng việt", "bỏ qua", "thay thế", "ctrl+z", "gạch đỏ", "bật tắt chính tả", "gợi ý", "chuột phải"],
    steps: [
      "Khi đang chỉnh sửa ô (nhấn F2 hoặc gõ trực tiếp) hoặc soạn thảo tại thanh công thức, các từ sai chính tả tiếng Việt tự động được gạch sóng đỏ trực tiếp trong nội dung đang sửa (không áp dụng với công thức bắt đầu bằng dấu '=').",
      "Nhấp chuột phải vào từ bị gạch sóng đỏ để mở danh sách từ gợi ý tiếng Việt chuẩn xác. Chọn một từ gợi ý để thay thế ngay vào nội dung ô.",
      "Nhấn Ctrl+Z để hoàn tác việc thay thế trong đúng 1 bước duy nhất, khôi phục lại từ sai ban đầu.",
      "Tùy chọn Bật/Tắt kiểm tra chính tả: Mở tab Xem xét, nhóm Kiểm lỗi, nhấn nút «Kiểm tra chính tả» để bật hoặc tắt. Khi tắt, toàn bộ gạch đỏ biến mất ngay lập tức; khi bật lại, gạch đỏ xuất hiện trở lại. Lựa chọn được lưu tự động cho các lần mở ứng dụng tiếp theo.",
      "Quét toàn diện: Nhấn F7 hoặc nút lớn «Chính tả» trên nhóm Kiểm lỗi để mở hộp thoại quét lần lượt các ô có chữ trên toàn bộ sheet hiện tại, hỗ trợ Bỏ qua, Bỏ qua tất cả, Thêm vào từ điển và Thay thế.",
      "Sau khi rời ô (Enter), để bảo vệ tốc độ cuộn mượt mà của hàng ngàn ô bảng tính và giữ độ trễ gõ phím cực thấp (< 10 ms), đường gạch đỏ tập trung hiển thị trực quan trong chế độ chỉnh sửa."
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
    id: "sheet.review.commentVisibility",
    app: "sheet",
    commandIds: ["sheet.review.commentToggleVisible", "sheet.review.commentShowAll"],
    title: "Hiện hoặc ẩn ghi chú trên trang tính",
    summary: "Hiển thị cố định khung ghi chú của ô đang chọn hoặc bật/tắt hiển thị toàn bộ ghi chú trên trang tính kèm đường nối mũi tên neo vào ô.",
    ribbon: { tab: "Xem xét", tabId: "review", group: "Ghi chú" },
    keywords: ["hiện ghi chú", "ẩn ghi chú", "hiện tất cả", "show comment", "hide comment", "show all comments", "khung ghi chú"],
    steps: [
      "Mở tab Xem xét, nhóm Ghi chú.",
      "Hiện/Ẩn ghi chú ô chọn: Chọn ô có ghi chú và nhấn nút Hiện/Ẩn ghi chú. Khung ghi chú sẽ cố định trên lưới kèm mũi tên nối về ô neo thay vì chỉ hiện khi rê chuột. Nhấn lại nút để ẩn khung.",
      "Hiện tất cả ghi chú: Nhấn nút Hiện tất cả ghi chú để hiển thị đồng thời mọi khung ghi chú trên trang tính hiện tại. Nhấn lại nút để quay về chế độ chỉ hiển thị dấu góc tam giác đỏ.",
      "Tương tác với khung: Nhấp vào khung ghi chú đang hiện để sửa nhanh văn bản. Kéo viền để di chuyển vị trí khung hoặc kéo nút góc dưới bên phải để đổi kích thước.",
      "Lưu và tương thích: Trạng thái hiện/ẩn và vị trí khung được lưu đầy đủ vào tệp bảng tính và giữ nguyên khi mở lại trên các ứng dụng bảng tính tương thích.",
      "Hoàn tác bằng phím tắt Ctrl+Z hoặc làm lại bằng Ctrl+Y."
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
    title: "Tạo bảng có bộ lọc và kiểu ô",
    summary: "Định dạng thành Bảng tạo cấu trúc bảng có tên, vùng dữ liệu, hàng tiêu đề tùy chọn, nút lọc, kiểu hàng xen kẽ và tự mở rộng khi nhập liền dưới hoặc bên phải. Kiểu ô áp một preset riêng lên vùng chọn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
    keywords: ["định dạng thành bảng", "format as table", "bảng có cấu trúc", "tên bảng", "bộ lọc bảng", "chuyển thành vùng", "đổi tên bảng", "hàng xen kẽ", "kiểu ô", "cell styles", "tốt", "kém", "banded rows", "tiền tệ"],
    steps: [
      "Bôi vùng dữ liệu có ít nhất một hàng. Tab Trang đầu, nhóm Kiểu ô, chọn Định dạng thành Bảng. Hộp thoại hiển thị Vùng dữ liệu; sửa tham chiếu nếu cần, ví dụ A1:D10. Bật Bảng có tiêu đề nếu hàng đầu đã chứa tên cột. Khi tắt, hàng đầu được giữ làm dữ liệu và Sheet tạo tên cột như Column1, Column2.",
      "Chọn một trong năm mẫu Bảng Xanh Lam, Xanh Lá, Xám Đậm, Cam Ấm hoặc Tím Hiện Đại rồi nhấn Tạo bảng. Sheet đặt tên mặc định Table1, Table2…; có thể nhập tên khác trong Tên bảng. Tiêu đề trống được điền tên cột và tiêu đề trùng được thêm hậu tố để tạo tên duy nhất. Nút lọc xuất hiện ở hàng tiêu đề; dùng nút đó để lọc như các cột lọc của Sheet.",
      "Nhập thêm bản ghi ở hàng ngay dưới bảng hoặc nhập vào cột liền bên phải để bảng tự mở rộng. Nhấn Ctrl+Z để hoàn tác lần nhập cùng phần mở rộng; Ctrl+Y để khôi phục.",
      "Đổi tên hoặc bỏ cấu trúc bảng: chọn một ô trong bảng, mở lại Trang đầu > Kiểu ô > Định dạng thành Bảng. Trong phần thao tác bảng, nhập tên mới rồi chọn Đổi tên bảng, hoặc chọn Chuyển thành vùng để giữ nội dung và màu nhưng bỏ tên bảng, tự mở rộng và cấu trúc bộ lọc. Ctrl+Z hoàn tác thao tác chuyển vùng.",
      "Kiểu ô — hộp «Thư viện kiểu ô (Cell Styles)» (720 px), lưới 2 cột: Bình thường (xóa màu, chữ #0f172a 13px), Tốt (nền #c6efce chữ #006100), Kém / Xấu (#ffc7ce / #9c0006), Trung tính (#ffeb9c / #9c6500), Tiêu đề 1 (16px đậm #1e3a8a, gạch dưới 2px), Tiêu đề 2 (14px, gạch 1px), Ô nhập liệu (nền #fff2cc), Tiền tệ (căn phải, ký hiệu ₫ sau số, 0 thập phân), Tổng cộng (viền trên đơn, dưới đôi), Điểm nhấn (nền #dbeafe). Nhấp thẻ áp ngay cho vùng chọn.",
      "Kiểu ô là preset định dạng riêng. Định dạng thành Bảng tạo đối tượng bảng thật khi lưu XLSX; mở lại tệp sẽ khôi phục vùng, tên và kiểu bảng. Xóa định dạng trong menu Xóa gỡ màu ô nhưng không đổi vùng hay tên bảng."
    ]
  },
  {
    id: "sheet.formula.structuredRefs",
    app: "sheet",
    commandIds: ["sheet.style.formatAsTable"],
    title: "Công thức theo tên bảng và tên cột",
    summary: "Sau khi Định dạng thành Bảng, viết công thức bằng tên bảng và tên cột thay cho địa chỉ ô: =SUM(Table1[Số lượng]). Công thức tự theo kịp khi bảng thêm hoặc bớt dòng, và lưu vào tệp XLSX đúng dạng Table1[Cột].",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
    keywords: ["tham chiếu bảng", "tham chiếu có cấu trúc", "structured reference", "Table1[Cột]", "[@Cột]", "#All", "#Headers", "#Totals", "#This Row", "tên cột", "tên bảng", "cột tính toán", "Định dạng thành Bảng"],
    steps: [
      "Tạo bảng: bôi vùng dữ liệu có hàng tiêu đề, tab Trang đầu, nhóm Kiểu ô, chọn Định dạng thành Bảng. Ghi nhớ Tên bảng (mặc định Table1, có thể đổi) và tên các cột ở hàng tiêu đề.",
      "Tổng một cột: nhập =SUM(Table1[Số lượng]) vào ô bất kỳ. Tên cột đặt trong ngoặc vuông; tên bảng không phân biệt chữ hoa, chữ thường. Cũng dùng được trong AVERAGE, COUNT, MAX, MIN, VLOOKUP và mọi hàm nhận vùng ô.",
      "Công thức theo từng dòng: trong cột của bảng nhập =[@Số lượng]*[@Đơn giá]. Ký hiệu @ nghĩa là dòng đang tính, nên mỗi dòng tự lấy số liệu của chính dòng đó. Khi lưu tệp, dạng này được ghi là Table1[[#This Row],[Số lượng]] và vẫn tính đúng khi mở lại.",
      "Các vùng đặc biệt: Table1[#All] là cả bảng gồm tiêu đề và dòng tổng; Table1[#Headers] là hàng tiêu đề; Table1[#Data] là phần dữ liệu; Table1[#Totals] là dòng tổng. Kết hợp với cột: Table1[[#All],[Số lượng]] hoặc Table1[[#Headers],[Đơn giá]].",
      "Nhiều cột liền nhau: Table1[[Số lượng]:[Đơn giá]]. Bảng nằm ở trang tính khác vẫn dùng được: =SUM(Table1[Số lượng]) ở bất kỳ trang nào, Sheet tự tìm bảng theo tên.",
      "Tên cột có ký tự đặc biệt: đặt dấu nháy đơn trước ký tự [ ] # '. Nếu gõ sai tên cột, ô báo #REF!; nếu dùng [@Cột] ở ô nằm ngoài các dòng dữ liệu của bảng, ô báo #VALUE!.",
      "Lưu và mở lại: công thức dạng Table1[Cột] được ghi đúng vào XLSX kèm đối tượng bảng nên các phần mềm bảng tính khác mở ra vẫn thấy đúng công thức. Khi đổi tên cột tiêu đề, hãy cập nhật lại các công thức đang dùng tên cũ."
    ]
  },
  {
    id: "sheet.table.slicer",
    app: "sheet",
    commandIds: ["sheet.table.insertSlicer"],
    title: "Lọc Bảng bằng bộ lọc trực quan",
    summary: "Bộ lọc trực quan tạo một khung nút nổi cho từng giá trị của cột Bảng. Khi chọn mục, Sheet chỉ hiện những dòng thỏa đồng thời mọi khung lọc và bộ lọc tự động đang dùng; các công thức SUBTOTAL cũng cập nhật theo những dòng còn hiện.",
    ribbon: { tab: "Thiết kế Bảng", tabId: "tableDesign", group: "Bộ lọc" },
    keywords: ["bộ lọc trực quan", "lọc bảng", "chọn nhiều", "xóa bộ lọc", "khung lọc nổi", "SUBTOTAL", "Thiết kế Bảng"],
    steps: [
      "Nhấp một ô trong Bảng để mở tab theo ngữ cảnh Thiết kế Bảng, vào nhóm Bộ lọc và bấm Chèn bộ lọc trực quan. Trong hộp thoại, đánh dấu một hoặc nhiều cột rồi bấm Đồng ý; mỗi cột tạo một khung lọc nổi riêng.",
      "Bấm một mục để chỉ giữ các dòng có giá trị đó. Giữ Ctrl để thêm hoặc bỏ từng mục, giữ Shift để chọn một dải mục, hoặc bật nút Chọn nhiều trên đầu khung rồi bấm liên tiếp các mục. Nhiều khung trên các cột khác nhau kết hợp theo điều kiện VÀ.",
      "Mục có chữ và nền nhạt kèm viền đứt là mục hiện không còn dữ liệu do các bộ lọc khác, nhưng vẫn có thể được chọn. Nút Xóa bộ lọc ở đầu khung chọn lại toàn bộ mục mà không xóa khung.",
      "Kéo phần tiêu đề để di chuyển khung; kéo góc dưới bên phải để đổi kích cỡ. Các thao tác chọn, xóa, di chuyển và đổi cỡ đều có thể Hoàn tác hoặc Làm lại.",
      "Bấm dấu × để xóa hẳn khung lọc. Khi lưu dạng XLSX, thông tin khung, vị trí và trạng thái chọn được ghi cùng Bảng để mở lại vẫn tiếp tục lọc đúng."
    ],
    note: "Bộ lọc chạy hoàn toàn trên máy. Nếu đồng thời lọc bằng mũi tên ở hàng tiêu đề Bảng, một dòng chỉ hiện khi thỏa cả bộ lọc tự động và mọi khung lọc trực quan."
  },
  {
    id: "sheet.table.tools",
    app: "sheet",
    commandIds: [
      "sheet.table.resize",
      "sheet.table.toggleTotalRow",
      "sheet.table.convertToRange"
    ],
    title: "Công cụ Bảng: Đổi kích cỡ, Dòng tổng cộng và Chuyển thành vùng",
    summary: "Quản lý bảng tính nâng cao: thay đổi kích thước vùng dữ liệu bảng, bật tắt dòng tổng cộng tự động tính theo hàm SUBTOTAL, và chuyển đổi bảng về vùng ô bình thường.",
    ribbon: { tab: "Thiết kế Bảng", tabId: "tableDesign", group: "Công cụ" },
    keywords: ["đổi kích cỡ bảng", "resize table", "dòng tổng cộng", "total row", "chuyển thành vùng", "convert to range", "thiết kế bảng", "công cụ bảng", "subtotal", "thuộc tính bảng"],
    steps: [
      "Kích hoạt tab Thiết kế Bảng: nhấp chuột vào bất kỳ ô nào thuộc bảng, tab theo ngữ cảnh «Thiết kế Bảng» sẽ tự động xuất hiện trên thanh ruy-băng.",
      "Đổi kích cỡ bảng: trên tab Thiết kế Bảng > nhóm Thuộc tính bảng, bấm «Đổi kích cỡ bảng». Hộp thoại mở ra cho phép chọn hoặc nhập vùng tọa độ mới (ví dụ A1:E20). Vùng mới phải giữ nguyên hàng tiêu đề ban đầu và chồng lấp với bảng hiện tại. Bấm «Đồng ý» để áp dụng.",
      "Bật/tắt dòng tổng cộng: trên tab Thiết kế Bảng > nhóm Tùy chọn kiểu bảng, nhấp nút «Dòng tổng cộng» (hoặc nhấp chuột phải trong bảng > chọn Bảng > Dòng tổng cộng). Dòng tổng sẽ tự động chèn ở cuối bảng với nhãn 'Total' ở cột đầu và công thức =SUBTOTAL(...) ở cột số cuối cùng; bấm lại nút để xóa dòng tổng và đưa dữ liệu bên dưới về vị trí cũ.",
      "Chuyển bảng thành vùng ô thường: trên tab Thiết kế Bảng > nhóm Công cụ, bấm «Chuyển thành vùng» (hoặc chuột phải trong bảng > chọn Bảng > Chuyển thành vùng). Bảng sẽ được gỡ bỏ nhưng vẫn giữ nguyên toàn bộ giá trị, định dạng màu sắc và tự động chuyển các công thức tham chiếu bảng Table1[Cột] thành địa chỉ ô chuẩn A1.",
      "Thao tác chuột phải: nhấp chuột phải vào ô trong bảng > menu Bảng cung cấp nhanh các lệnh Chèn cột/hàng, Xóa cột/hàng của bảng, bật tắt Dòng tổng cộng và Chuyển thành vùng."
    ]
  },
  {
    id: "sheet.table.styleOptions",
    app: "sheet",
    commandIds: [
      "sheet.table.toggleHeaderRow",
      "sheet.table.toggleBandedRows",
      "sheet.table.toggleFirstColumn",
      "sheet.table.toggleLastColumn",
      "sheet.table.toggleBandedColumns",
      "sheet.table.toggleFilterButton"
    ],
    title: "Tùy chọn kiểu bảng: Hàng tiêu đề, Hàng sọc, Cột đầu, Cột cuối, Cột sọc và Nút lọc",
    summary: "Tùy chỉnh linh hoạt hiển thị các thành phần trực quan của bảng tính: hàng tiêu đề, hàng sọc xen kẽ, định dạng nổi bật cột đầu hoặc cột cuối, cột sọc xen kẽ và ẩn/hiện nút lọc tự động.",
    ribbon: { tab: "Thiết kế Bảng", tabId: "tableDesign", group: "Tùy chọn kiểu bảng" },
    keywords: ["tùy chọn kiểu bảng", "table style options", "hàng tiêu đề", "header row", "hàng sọc", "banded rows", "cột đầu", "first column", "cột cuối", "last column", "cột sọc", "banded columns", "nút lọc", "filter button"],
    steps: [
      "Kích hoạt tab Thiết kế Bảng: chọn một ô bất kỳ bên trong bảng, tab ngữ cảnh «Thiết kế Bảng» sẽ hiển thị trên thanh ruy-băng.",
      "Hàng tiêu đề: tích chọn ô «Hàng tiêu đề» trong nhóm Tùy chọn kiểu bảng để hiển thị hàng đầu tiên với tên cột phân biệt. Bỏ tích để ẩn hàng tiêu đề mà không làm mất dữ liệu.",
      "Hàng sọc (Banded Rows): tích chọn ô «Hàng sọc» để tô màu nền xen kẽ giữa các hàng, giúp việc đối chiếu dữ liệu theo chiều ngang dễ nhìn hơn.",
      "Cột đầu (First Column): tích chọn ô «Cột đầu» để áp dụng định dạng nổi bật (chữ đậm và màu nền nhấn) cho cột đầu tiên của bảng tính.",
      "Cột cuối (Last Column): tích chọn ô «Cột cuối» để tạo điểm nhấn trực quan cho cột số liệu hoặc kết quả cuối cùng bên phải.",
      "Cột sọc (Banded Columns): tích chọn ô «Cột sọc» để tô màu nền xen kẽ cho các cột theo chiều dọc.",
      "Nút lọc: tích hoặc bỏ tích ô «Nút lọc» để hiển thị hoặc ẩn các nút mũi tên lọc tự động ở hàng tiêu đề của bảng."
    ]
  },
  {
    id: "sheet.table.stylesGallery",
    app: "sheet",
    commandIds: [
      "sheet.table.styles"
    ],
    title: "Kiểu Bảng: Thư viện định dạng bảng mẫu phong phú",
    summary: "Áp dụng và thay đổi kiểu dáng bảng trực tiếp với thư viện 21 mẫu màu sắc theo ba cấp độ Sáng, Trung bình và Tối, kết hợp hài hòa màu nền, màu chữ và đường viền chuẩn mực.",
    ribbon: { tab: "Thiết kế Bảng", tabId: "tableDesign", group: "Kiểu Bảng" },
    keywords: ["kiểu bảng", "table styles", "thư viện kiểu bảng", "style gallery", "thiết kế bảng", "màu bảng"],
    steps: [
      "Kích hoạt tab Thiết kế Bảng: bấm chuột vào bảng cần đổi kiểu dáng.",
      "Mở thư viện kiểu bảng: trên tab Thiết kế Bảng > nhóm Kiểu Bảng, bấm nút «Kiểu Bảng».",
      "Chọn kiểu yêu thích: hộp thoại mở ra danh sách 21 kiểu bảng được phân loại theo ba nhóm Sáng, Trung bình và Tối.",
      "Áp dụng kiểu: nhấp chuột vào mẫu kiểu mong muốn để bảng lập tức chuyển sang màu sắc, đường viền và phông chữ mới theo thời gian thực mà không làm mất dữ liệu đã nhập."
    ]
  },
  {
    id: "sheet.edit.fillAndClear",
    app: "sheet",
    commandIds: [
      "sheet.edit.fillDown",
      "sheet.edit.fillRight",
      "sheet.edit.fillUp",
      "sheet.edit.fillLeft",
      "sheet.edit.fillSeries",
      "sheet.edit.clearAll",
      "sheet.edit.clearFormats",
      "sheet.edit.clearContents",
      "sheet.edit.clearComments",
      "sheet.edit.clearHyperlinks"
    ],
    title: "Điền xuống/phải/lên/trái, điền chuỗi và xóa nội dung hay định dạng",
    summary: "Ctrl+D sao chép ô trên xuống (công thức tự lệch hàng); Ctrl+R sao chép sang phải (lệch cột); menu Điền còn có Điền lên, Điền trái và Chuỗi (tuyến tính, tăng trưởng, ngày). Menu Xóa: Tất cả, chỉ định dạng, hoặc chỉ nội dung (giữ kiểu).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["điền xuống", "điền phải", "điền lên", "điền trái", "chuỗi", "series", "tuyến tính", "tăng trưởng", "ngày làm việc", "ctrl+d", "ctrl+r", "xóa tất cả", "xóa định dạng", "xóa nội dung", "xóa ghi chú", "xóa siêu liên kết", "clear comments", "clear hyperlinks", "fill down", "fill series", "clear"],
    steps: [
      "Tab Trang đầu, nhóm Chỉnh sửa: menu Điền (nút lớn) gồm Điền xuống (Ctrl+D) và Điền phải (Ctrl+R); menu Xóa gồm Xóa tất cả / Xóa định dạng / Xóa nội dung. Chuột phải ô cũng có Xóa nội dung (Delete).",
      "Điền xuống: bôi từ ô nguồn xuống các ô đích — ô đầu là nguồn, các ô dưới nhận bản sao; công thức =A1 thành =A2, =A3… (lệch hàng). Nếu chỉ chọn 1 hàng, nguồn là hàng ngay phía trên (hàng 1 thì không điền được). Điền phải tương tự theo cột; chọn 1 cột thì lấy cột bên trái.",
      "Điền lên và Điền trái (cũng nằm trong menu Điền): bôi vùng gồm ô nguồn và các ô cần điền; với Điền lên, ô dưới cùng là nguồn và các ô phía trên nhận bản sao; với Điền trái, cột phải nhất là nguồn. Chọn một ô thì lấy ô ngay bên dưới (Điền lên) hoặc ngay bên phải (Điền trái). Công thức tự lệch địa chỉ như khi điền xuống.",
      "Chuỗi... (menu Điền): bôi vùng bắt đầu từ ô chứa giá trị đầu, mở Chuỗi rồi chọn Chuỗi theo Hàng hoặc Cột, Loại Tuyến tính (cộng thêm Bước nhảy), Tăng trưởng (nhân với Bước nhảy) hoặc Ngày. Với loại Ngày chọn đơn vị Ngày, Ngày làm việc (bỏ thứ bảy và chủ nhật), Tháng hoặc Năm; ô đầu phải là ngày dạng dd/mm/yyyy hoặc yyyy-mm-dd. Giá trị dừng là tùy chọn: chỉ chọn một ô và nhập Giá trị dừng để Sheet tự điền tới khi đạt giá trị đó.",
      "Xóa tất cả: xóa giá trị, công thức và style. Xóa định dạng: giữ số/công thức, bỏ màu/viền/cỡ chữ. Xóa nội dung: xóa chữ và công thức, giữ style. Sheet đang bảo vệ thì Xóa tất cả / Xóa nội dung / Điền bị chặn.",
      "Xóa ghi chú: bôi vùng ô rồi mở menu Xóa và chọn Xóa ghi chú — mọi ghi chú (comment) trong vùng bị gỡ, nội dung ô giữ nguyên. Xóa siêu liên kết: chọn các ô có liên kết rồi chọn Xóa siêu liên kết — văn bản vẫn còn nhưng không còn bấm mở được. Nếu vùng không có ghi chú/siêu liên kết thì lệnh không làm gì. Cả hai đều hoàn tác được bằng Ctrl+Z.",
      "Ctrl+Z hoàn tác cả khối điền hoặc xóa. Delete mặc định gần với xóa nội dung, không xóa định dạng."
    ]
  },
  {
    id: "sheet.data.advancedFilter",
    app: "sheet",
    commandIds: ["sheet.data.advancedFilter", "sheet.data.clearFilter", "sheet.data.reapplyFilter"],
    title: "Bộ lọc nâng cao: lọc bằng vùng điều kiện, Xóa và Áp dụng lại",
    summary: "Tab Dữ liệu, nhóm Sắp xếp & Lọc có thêm ba nút: Xóa (bỏ mọi bộ lọc), Áp dụng lại (lọc lại khi dữ liệu đã đổi) và Nâng cao (lọc bằng một vùng điều kiện riêng, nhiều điều kiện VÀ/HOẶC, có thể sao chép kết quả sang nơi khác).",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Sắp xếp & Lọc" },
    keywords: ["lọc nâng cao", "advanced filter", "vùng điều kiện", "criteria", "bản ghi duy nhất", "xóa bộ lọc", "áp dụng lại", "reapply", "lọc hoặc", "lọc và"],
    steps: [
      "Chuẩn bị vùng điều kiện ở chỗ trống (ví dụ F1:G3): dòng đầu ghi ĐÚNG tiêu đề cột cần lọc (giống tiêu đề của danh sách), các dòng dưới ghi điều kiện. Điều kiện nằm cùng một dòng là VÀ; điều kiện ở các dòng khác nhau là HOẶC. Ô để trống nghĩa là không lọc theo cột đó.",
      "Cách ghi điều kiện: chữ trần như Cam khớp mọi ô bắt đầu bằng 'cam' (không phân biệt hoa thường); >15, <=20, <>x so sánh; * và ? là ký tự đại diện; một số như 10 khớp đúng bằng 10.",
      "Chọn một ô trong danh sách rồi mở Dữ liệu > Sắp xếp & Lọc > Nâng cao. Ô Vùng danh sách tự điền vùng dữ liệu hiện tại (gồm dòng tiêu đề); nhập Vùng điều kiện (ví dụ F1:G3).",
      "Chọn Lọc danh sách tại chỗ (các dòng không khớp bị ẩn) hoặc Sao chép sang vị trí khác rồi nhập ô đích (ví dụ J1): tiêu đề và các dòng khớp được chép sang, danh sách gốc giữ nguyên. Tích Chỉ lấy các bản ghi duy nhất để bỏ dòng trùng hoàn toàn.",
      "Nhấn Đồng ý. Nếu vùng nhập sai, hộp thoại báo rõ vùng nào sai và không thay đổi gì. Hàm SUBTOTAL trong sổ tự tính lại theo các dòng còn hiện.",
      "Xóa: bỏ mọi bộ lọc của trang tính và hiện lại tất cả các dòng. Áp dụng lại: lọc lại theo điều kiện hiện có sau khi bạn sửa dữ liệu hoặc điều kiện. Ctrl+Z hoàn tác bộ lọc."
    ]
  },  {
    id: "sheet.sheets.group",
    app: "sheet",
    commandIds: ["sheet.edit.fillAcrossSheets"],
    title: "Nhóm nhiều trang tính và Điền trên các trang",
    summary: "Giữ Ctrl và nhấp vào các thẻ trang tính để gom thành một nhóm: mọi thao tác nhập, xóa, định dạng ở trang hiện tại áp dụng luôn cho cả nhóm. Lệnh Điền > Trên các trang chép vùng đang chọn sang cùng vị trí ở các trang trong nhóm.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["nhóm trang tính", "group sheets", "chọn nhiều trang", "điền trên các trang", "across worksheets", "ctrl nhấp thẻ trang", "shift nhấp thẻ", "bỏ nhóm"],
    steps: [
      "Nhóm trang: giữ Ctrl và nhấp từng thẻ trang tính cần nhóm (thẻ đổi màu nền và có vạch xanh bên dưới). Giữ Shift và nhấp để chọn cả dải thẻ liền nhau. Chuột phải một thẻ rồi chọn Chọn tất cả các trang tính để nhóm mọi trang.",
      "Khi đang nhóm, nhập hoặc xóa giá trị/công thức hay đổi định dạng ô ở trang hiện tại sẽ được áp dụng cùng lúc cho mọi trang trong nhóm (cùng địa chỉ ô). Một lần Ctrl+Z hoàn tác cho cả nhóm.",
      "Điền trên các trang: giữ nhóm, chọn vùng ô ở trang hiện tại, mở Trang đầu > Chỉnh sửa > Điền > Trên các trang... rồi chọn Tất cả, Nội dung hoặc Định dạng và nhấn Đồng ý. Vùng được chép sang cùng vị trí ở các trang khác trong nhóm; nếu chưa nhóm thì chương trình nhắc bạn nhóm trang trước.",
      "Bỏ nhóm: nhấp vào một thẻ trang tính nằm ngoài nhóm, hoặc chuột phải một thẻ rồi chọn Bỏ nhóm trang tính. Thao tác chèn/xóa hàng cột và dán hiện chỉ áp dụng cho trang đang xem — hãy bỏ nhóm trước khi sửa cấu trúc để tránh nhầm."
    ]
  },  {
    id: "sheet.edit.fillJustify",
    app: "sheet",
    commandIds: ["sheet.edit.fillJustify"],
    title: "Điền và Căn đều văn bản trong ô (Justify)",
    summary: "Xếp lại và phân bổ lại các dòng văn bản trong vùng ô đã chọn để vừa khít với độ rộng cột hiện tại. Các dòng chữ dài được ngắt tự nhiên xuống các ô phía dưới, hoặc gom các đoạn ngắn liền kề thành dòng dài hơn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["căn đều", "điền căn đều", "fill justify", "ngắt dòng văn bản", "xếp chữ vừa cột", "reflow text", "tràn chữ xuống dưới"],
    steps: [
      "Vị trí lệnh: Trên thanh ribbon, chọn tab Trang đầu > nhóm Chỉnh sửa > nút Điền > chọn Căn đều.",
      "Cách sử dụng cơ bản: Chọn một hoặc nhiều ô chứa văn bản theo chiều dọc trong cùng một cột (hoặc chọn vùng nhiều cột để tính tổng độ rộng). Nhấn Điền > Căn đều. Văn bản sẽ được đo theo phông chữ hiện tại và ngắt thành các dòng vừa vặn với độ rộng cột.",
      "Vùng chọn nhiều cột: Khi chọn dải ô gồm nhiều cột (ví dụ A1:C5), độ rộng để ngắt dòng được tính bằng tổng độ rộng của các cột đã chọn cộng khoảng đệm giữa các cột. Nội dung kết quả sẽ được ghi vào cột bên trái nhất (cột A).",
      "Xử lý ô trống và đoạn văn: Các ô trống nằm xen giữa đóng vai trò phân tách đoạn. Các đoạn văn bản liên tục được căn đều riêng biệt và khoảng cách ô trống giữa các đoạn được giữ nguyên.",
      "Cảnh báo tràn vùng chọn: Nếu số dòng chữ sau khi căn đều vượt quá số hàng của vùng đã chọn, hệ thống sẽ hiển thị hộp thoại cảnh báo: «Chữ sẽ tràn xuống dưới vùng chọn». Nhấn Đồng ý để cho phép ghi đè nội dung xuống các hàng bên dưới, hoặc nhấn Hủy bỏ để giữ nguyên.",
      "Quy tắc ô hợp lệ và Hoàn tác: Lệnh chỉ áp dụng cho văn bản thuần túy hoặc số được định dạng văn bản (@). Nếu vùng chọn chứa công thức, số thông thường hoặc giá trị logic, hệ thống sẽ thông báo không thể căn đều. Thao tác căn đều có thể hoàn tác ngay bằng một bước nhấn phím tắt Ctrl+Z."
    ]
  },  {
    id: "sheet.edit.findReplace",
    app: "sheet",
    commandIds: ["common.edit.find", "common.edit.replace"],
    title: "Tìm kiếm và Thay thế trong Sheet",
    summary: "Hộp thoại Tìm kiếm và Thay thế trong Sheet hỗ trợ tìm trong Trang tính hoặc toàn bộ Sổ làm việc, tìm theo Hàng/Cột, tìm trong Công thức hoặc Giá trị, khớp toàn bộ nội dung ô và Hoàn tác một bước (Ctrl+Z).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm", "thay thế", "find", "replace", "ctrl+f", "ctrl+h", "Sheet", "tìm kiếm", "công thức", "giá trị", "sổ làm việc"],
    steps: [
      "Truy cập: Mở tab Trang đầu trên thanh ribbon, vào nhóm Chỉnh sửa ở phía cuối bên phải và bấm Tìm kiếm (Ctrl+F) hoặc Thay thế (Ctrl+H) để mở hộp thoại Tìm kiếm và Thay thế gồm 2 tab.",
      "Tìm kiếm dữ liệu: Trong tab «Tìm» (Ctrl+F), nhập chuỗi vào ô «Tìm gì:». Bấm nút «Tìm tiếp» để nhảy tới ô khớp tiếp theo; bấm «Tìm trước» để lùi về ô khớp trước. Sheet tự động cuộn màn hình và kích hoạt ô được tìm thấy.",
      "Thay thế dữ liệu: Trong tab «Thay thế» (Ctrl+H), nhập nội dung cần thay đổi vào ô «Thay bằng:». Bấm «Thay thế» để đổi từng ô, hoặc bấm «Thay thế tất cả» để thay thế toàn bộ dữ liệu khớp và xem thông báo tổng số lượng thay thế đã thực hiện.",
      "Tùy chọn nâng cao trong Sheet: Thiết lập phạm vi «Tìm trong: Trang tính / Sổ làm việc», thứ tự «Tìm theo: Hàng / Cột», và nội dung «Giá trị / Công thức». Bật «Khớp toàn bộ nội dung ô» để chỉ chọn ô có nội dung bằng đúng chuỗi cần tìm; tắt tùy chọn này để tìm chuỗi nằm bên trong ô.",
      "Tiếng Việt và bộ lọc từ: Hỗ trợ «Khớp chữ hoa/thường», «Chỉ toàn bộ từ», «Khớp toàn bộ nội dung ô» và «Bỏ qua dấu». Chuỗi được chuẩn hóa Unicode NFC tự động.",
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
    summary: "Thao tác hoàn toàn bằng bàn phím trên bảng tính; nhập dữ liệu với nhận dạng số, ngày, giờ, phần trăm và tiền VND; dùng Alt+Enter để xuống dòng; mở Định dạng ô bằng Ctrl+1 và khôi phục tiêu điểm về lưới bằng Escape.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trợ năng" },
    keywords: ["bàn phím", "phím tắt", "trợ năng", "accessibility", "keyboard", "focus", "tiêu điểm", "ctrl+1", "esc", "tab", "lưới", "ô", "nhập dữ liệu", "tự nhận dạng", "Alt+Enter", "ngắt dòng", "số", "ngày", "giờ", "phần trăm", "VND"],
    steps: [
      "Di chuyển trên lưới ô tính: Dùng các phím mũi tên Lên/Xuống/Trái/Phải để chuyển qua các ô lân cận. Phím Tab di chuyển sang ô bên phải, Shift+Tab sang ô bên trái. Phím Enter di chuyển xuống ô bên dưới, Shift+Enter lên ô bên trên. Dùng Ctrl+Home để nhảy về ô A1 và Ctrl+End về ô cuối cùng có dữ liệu.",
      "Nhập dữ liệu: Chọn ô rồi gõ giá trị và nhấn Enter. Lưới tự nhận dạng số, ngày dạng dd/mm/yyyy, giờ hh:mm, phần trăm (25% thành 0,25) và tiền VND có ký hiệu ₫ theo dấu thập phân/dấu phân nhóm Windows. Số bắt đầu bằng 0 như 0123 trở thành 123 ở định dạng General; định dạng Text giữ nguyên 0123. Gõ dấu nháy đơn trước giá trị, ví dụ '0123, để giữ nội dung dạng văn bản.",
      "Nhập công thức: Khi đang chọn một ô, gõ trực tiếp công thức (ví dụ: =SUM(A1:A10) hoặc =100+250) rồi nhấn Enter để xác nhận và tự động tính kết quả. Nhấn F2 để sửa nội dung ô đang có.",
      "Xuống dòng trong cùng một ô: Khi đang nhập hoặc sửa nội dung tại ô hoặc thanh công thức, đặt con trỏ ở vị trí cần ngắt rồi nhấn Alt+Enter. Lưới chèn ký tự xuống dòng, bật Ngắt dòng tự động cho ô và tăng chiều cao hàng để hiện các dòng.",
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
      "Chế độ tương thích định dạng cũ (.xls): Khi mở một tệp .xls từ cơ quan hoặc ổ LAN, thao tác Ctrl+S sẽ lưu lại đúng chuẩn nhị phân chuẩn định dạng (.xls), không âm thầm chuyển đổi sang .xlsx. Lưu ý: Định dạng cũ .xls (chuẩn nhị phân cũ) có giới hạn kỹ thuật của bộ lọc đối với một số công thức đặc biệt (như biểu thức chứa lỗi #REF! phức hợp hoặc tên Macro cũ #NAME!()); khi lưu .xls các công thức này có thể bị bộ lọc chuyển thành #N/A. Nếu tài liệu cần duy trì trọn vẹn các công thức phức tạp, bạn nên lưu bản sao sang định dạng hiện đại .xlsx.",
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
      "Chọn một ô đích rồi nhấn Ctrl+V để dán. Khi sao chép một vùng từ phần mềm bảng tính khác, Sheet giữ giá trị số, ngày tháng, phần trăm và định dạng ô như chữ đậm, màu nền, đường viền; văn bản nhiều ô cũng được tách theo tab và xuống dòng. Lệnh Xóa (Delete) xóa nội dung ô/vùng đang chọn mà giữ định dạng.",
      "Để dán theo lựa chọn, mở tab Trang đầu, nhóm Bảng nhớ tạm, chọn Dán đặc biệt hoặc nhấn Ctrl+Alt+V; chọn Giữ định dạng nguồn, Chỉ giá trị, Chỉ định dạng hoặc Chuyển vị (đổi hàng/cột), rồi nhấn Áp dụng.",
      "Ctrl+Z hoàn tác mỗi thao tác bằng một bước; Ctrl+Y làm lại.",
      "Nhấn F1 để mở Trợ giúp 3T Office và tìm 'Tab', 'Dán' hoặc 'bộ nhớ tạm'."
    ]
  },
  {
    id: "sheet.input.navigationFillClipboard",
    app: "sheet",
    commandIds: [],
    title: "Di chuyển, chọn, điền và sao chép ô bằng phím hoặc chuột",
    summary: "Dùng lưới trang tính để chọn ô/vùng, nhập hoặc sửa nội dung, điền chuỗi, sao chép dữ liệu và hoàn tác. Nhấn F1 rồi tìm ‘chọn ô’ để mở lại hướng dẫn này.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chọn ô", "di chuyển ô", "Ctrl+G", "F5", "F2", "điền xuống", "kéo tay nắm", "sao chép", "dán", "menu chuột phải", "hoàn tác"],
    steps: [
      "Nhấp vào ô trong lưới để chọn. Dùng các phím mũi tên để đi từng ô; giữ Shift khi nhấn mũi tên để mở rộng vùng. Nhấn End rồi một phím mũi tên để đi tới ô cuối theo hướng đó.",
      "Đặt con trỏ vào Hộp tên bên trái thanh công thức. Gõ địa chỉ như D7, vùng như B2:D10, hoặc tên vùng rồi nhấn Enter để đi tới đó.",
      "Khi một ô đang được chọn, gõ chữ hoặc số để thay nội dung rồi nhấn Enter. Sửa nội dung hiện có trực tiếp trong ô; Enter xác nhận, Esc hủy phần sửa và khôi phục giá trị cũ. Tab xác nhận rồi chuyển sang ô bên phải. Khi đã chọn nhiều ô, nhập giá trị hoặc công thức rồi dùng lệnh điền vùng. Delete xóa nội dung của cả vùng đang chọn.",
      "Kéo chuột từ ô đầu đến ô cuối để chọn một khối. Nhấp chữ cái đầu cột hoặc số đầu hàng để chọn cả cột/hàng. Để điền, chọn vùng có ô nguồn ở cạnh trên hoặc bên trái rồi dùng lệnh Điền xuống/Điền sang phải trên tab Trang đầu; hoặc kéo tay nắm nhỏ ở góc dưới phải vùng chọn tới ô đích để tiếp tục chuỗi số/ngày.",
      "Chọn ô/vùng nguồn rồi nhấn Ctrl+C để sao chép hoặc Ctrl+X để cắt; chọn ô đích và nhấn Ctrl+V để dán. Ctrl+Alt+V mở Dán đặc biệt để chọn giá trị, công thức, định dạng hoặc chuyển vị. Nhấp chuột phải lên ô để mở cùng các lệnh theo ngữ cảnh. Ctrl+Z hoàn tác một thao tác; Ctrl+Y làm lại.",
      "Nội dung hướng dẫn không thay thế thao tác lưu tệp; hãy lưu bằng nút Lưu hoặc Ctrl+S sau khi sửa dữ liệu."
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
      "Trong nhóm Thiết lập trang, nhấn Hướng giấy rồi chọn Dọc (phù hợp bảng ít cột) hoặc Ngang (phù hợp bảng nhiều cột); áp dụng ngay, không cần mở hộp thoại.",
      "Nhấn Khổ giấy rồi chọn kích thước trang chuẩn như A4 (210 × 297 mm, chuẩn văn bản Việt Nam theo Nghị định 30), Letter, Legal, A3 hoặc A5; chọn Thêm khổ giấy… để mở hộp thoại Thiết lập trang.",
      "Các đường ngắt trang ảo sẽ tự động điều chỉnh hiển thị ranh giới in theo khổ giấy và hướng giấy vừa chọn.",
      "Thiết lập áp dụng cho trang tính hiện tại và có thể hoàn tác bằng Ctrl+Z. Nếu mở hộp thoại Thiết lập trang, nhấn Áp dụng để lưu."
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
  },
  {
    id: "sheet.navigation.gridExtent",
    app: "sheet",
    commandIds: ["common.edit.find"],
    title: "Điều hướng trên bảng tính lớn",
    summary: "Sheet hỗ trợ bảng tính lên tới 1.048.576 hàng và 16.384 cột (từ cột A đến XFD). Dùng phím Ctrl cùng các phím mũi tên, Ctrl+Home, Ctrl+End và Hộp tên ô để di chuyển nhanh chóng mà không làm chậm ứng dụng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["điều hướng", "bảng tính lớn", "mũi tên", "Ctrl+Home", "Ctrl+End", "Hộp tên ô", "Name Box", "1048576 hàng", "16384 cột", "XFD"],
    steps: [
      "Dùng phím Ctrl kết hợp phím mũi tên (Lên, Xuống, Trái, Phải) để nhảy nhanh đến ranh giới của khối dữ liệu hoặc mép bảng tính. Nếu cột đang trống, giữ Ctrl và nhấn phím mũi tên Xuống sẽ nhảy ngay đến hàng 1.048.576; giữ Ctrl và nhấn phím mũi tên Phải sẽ nhảy đến cột XFD.",
      "Nhấn Ctrl+Home để quay trở về ô A1 bất cứ lúc nào. Nhấn Ctrl+End để nhảy đến ô chứa dữ liệu cuối cùng của trang tính.",
      "Nhập địa chỉ vào Hộp tên ô (ở bên trái Thanh công thức) rồi nhấn Enter để nhảy trực tiếp tới ô hoặc dải ô, ví dụ A1, XFD1048576, hoặc B2:D10.",
      "Để chọn nhanh toàn bộ hàng hoặc cột trên bảng tính lớn, nhấn Shift+Space để chọn cả hàng, hoặc Ctrl+Space để chọn cả cột.",
      "Nhấn Ctrl+A lần thứ nhất để chọn vùng dữ liệu liền kề hiện tại, nhấn Ctrl+A lần thứ hai để chọn toàn bộ bảng tính (A1:XFD1048576). Bộ hiển thị ảo chỉ kết xuất các ô đang nhìn thấy trên màn hình nên thao tác luôn mượt mà."
    ]
  },
  {
    id: "sheet.formula.autocompleteAndHints",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Nhập hàm và gợi ý công thức",
    summary: "Khi gõ dấu bằng (=) cùng các chữ cái đầu của hàm, danh mục gợi ý tự động xuất hiện với cú pháp và giải nghĩa tiếng Việt. Chú giải cú pháp hiển thị đối số đang nhập được tô đậm, kèm dòng mô tả chi tiết và ví dụ thực tế. Ô đang soạn giữ nguyên chuỗi đang gõ, không hiện lỗi #VALUE! trước khi xác nhận.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["nhập hàm", "gợi ý công thức", "autocomplete", "cú pháp", "tooltip", "IntelliSense", "VLOOKUP", "SUM", "tiếng Việt", "đối số", "tham số", "Enter", "Tab", "Esc", "dấu phân cách"],
    steps: [
      "Bắt đầu nhập công thức: Chọn ô bất kỳ trên bảng tính và gõ dấu bằng (=) kèm chữ cái đầu của hàm muốn dùng, ví dụ =SU hoặc =V. Hộp gợi ý tự động hiện ra với biểu tượng fx, phân loại hàm, cú pháp rút gọn và mô tả tiếng Việt.",
      "Vị trí thông minh: Hộp gợi ý luôn hiển thị ngay sát dưới ô đang soạn thảo; nếu ô nằm sát mép dưới màn hình, hộp sẽ tự động lật lên phía trên ô; nếu ô ở cột cuối sát mép phải, hộp tự động căn lùi sang trái để không bị tràn viền hoặc che khuất dữ liệu.",
      "Phím tắt điều hướng gợi ý: Dùng phím Mũi tên Lên / Xuống để chuyển giữa các hàm gợi ý. Nhấn phím Tab hoặc Enter để chèn nhanh tên hàm đã chọn kèm dấu mở ngoặc (, hoặc nhấn phím Esc để đóng hộp gợi ý.",
      "Chú giải cú pháp (Syntax Tooltip) bằng tiếng Việt: Ngay khi dấu mở ngoặc ( xuất hiện, chú giải cú pháp hiển thị rõ ràng. Đối số đang nhập được tô đậm nổi bật; dòng bên dưới giải thích rõ đối số đó là gì; dòng dưới cùng gợi ý ví dụ thực tế (ví dụ: =VLOOKUP(A2; Bảng!A:C; 3; 0)).",
      "Chuyển đối số linh hoạt: Khi bạn gõ dấu phân cách (dấu phẩy , hoặc chấm phẩy ; tùy theo vùng máy), chú giải cú pháp tự động chuyển điểm tô đậm và dòng giải thích sang đối số tiếp theo. Tính năng nhận diện chuẩn xác ngay cả khi lồng nhiều hàm hoặc có dấu phẩy trong chuỗi nháy kép.",
      "Hiển thị ô trực quan: Trong suốt quá trình đang gõ dở công thức, ô trên bảng tính hiển thị chính xác chuỗi ký tự bạn đang soạn (hoặc thanh công thức), tuyệt đối không tính trước gây hiện lỗi #VALUE! hay #NAME?. Chỉ khi bạn nhấn Enter hoặc Tab để xác nhận, công thức mới được tính toán hoàn chỉnh."
    ]
  },
  {
    id: "sheet.mouse.operations",
    app: "sheet",
    commandIds: ["sheet.edit.fillDown"],
    title: "Thao tác chuột và tràn chữ khi soạn ô",
    summary: "Thao tác chuột trực quan và tiện lợi: nhấp đúp ô để sửa, kéo chọn vùng, Shift/Ctrl chọn vùng, kéo tay cầm điền AutoFill, kéo-thả di chuyển/sao chép ô, nhấp đúp và kéo viền cột/hàng để đổi kích thước, nội dung soạn ô tự động tràn sang phải.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chuột", "nhấp đúp ô", "kéo chọn vùng", "Shift+click", "Ctrl+click", "tay cầm điền", "AutoFill", "di chuyển ô", "sao chép ô", "viền cột", "viền hàng", "tự vừa cột", "tràn chữ", "overflow"],
    steps: [
      "Nhấp đúp chuột trái vào một ô để vào chế độ chỉnh sửa trực tiếp nội dung trong ô (tương đương phím F2).",
      "Kéo chuột qua các ô để chọn một dải ô. Nhấp vào ô đầu, giữ phím Shift và nhấp vào ô cuối để mở rộng vùng chọn (ví dụ B2:E6). Giữ phím Ctrl và nhấp chuột vào các ô khác nhau để chọn đồng thời nhiều vùng rời rạc.",
      "Kéo tay cầm điền (hình vuông nhỏ màu xanh ở góc dưới bên phải ô đang chọn) để tự động điền dãy số, ngày tháng hoặc sao chép công thức (AutoFill).",
      "Di chuột tới viền bao quanh ô/vùng chọn đến khi con trỏ đổi sang hình bàn tay / mũi tên bốn hướng; kéo chuột để di chuyển dữ liệu sang vị trí mới. Giữ phím Ctrl trong lúc kéo để sao chép ô mà không làm mất dữ liệu gốc. Nhấn Ctrl+Z để hoàn tác.",
      "Nhấp vào tiêu đề cột (A, B, C...) hoặc hàng (1, 2, 3...) để chọn trọn vẹn cả cột hoặc hàng; kéo chuột qua các tiêu đề để chọn nhiều cột/hàng liên tiếp.",
      "Di chuột tới vạch phân cách giữa hai tiêu đề cột/hàng để kéo thay đổi độ rộng/chiều cao. Nhấp đúp vào vạch phân cách cột để tự động vừa khít độ rộng theo nội dung dài nhất (Auto-fit).",
      "Khi đang soạn thảo văn bản hoặc gõ công thức dài trong ô, nếu các ô bên phải còn trống, nội dung đang gõ sẽ tự động hiển thị tràn sang các ô bên phải một cách tự nhiên, không bị cắt ngắn."
    ]
  },
  {
    id: "sheet.file.markAsFinalHelp",
    app: "sheet",
    commandIds: ["sheet.file.markAsFinal", "sheet.file.properties"],
    title: "Thông tin sổ làm việc và Đánh dấu là cuối cùng (Mark as Final)",
    summary: "Xem và chỉnh sửa thuộc tính sổ làm việc (tiêu đề, chủ đề, tác giả, quản lý, công ty, thẻ, ghi chú) và đặt cờ Đánh dấu là cuối cùng để bảo vệ sổ làm việc ở chế độ chỉ đọc mềm.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Thông tin" },
    keywords: ["thông tin", "thuộc tính", "sổ làm việc", "bảng tính", "đánh dấu là cuối cùng", "mark as final", "chỉ đọc", "tiêu đề", "tác giả", "quản lý", "công ty", "thẻ", "ghi chú", "vẫn chỉnh sửa", "bảo vệ"],
    steps: [
      "Bấm vào mục Tệp ở góc trên bên trái cửa sổ và chọn mục Thông tin trên bảng điều hướng để mở trang quản lý thuộc tính sổ làm việc.",
      "Xem chi tiết các thuộc tính: Tiêu đề, Chủ đề, Tác giả, Quản lý, Công ty, Thẻ, Ghi chú, Kích thước tệp và Số trang tính.",
      "Bấm nút Chỉnh sửa... trong phần Thuộc tính để mở hộp thoại và cập nhật các trường thông tin mong muốn, sau đó bấm Đồng ý.",
      "Trong phần Bảo vệ sổ làm việc, bấm nút Đánh dấu là cuối cùng để thông báo cho người nhận biết đây là bản sổ làm việc hoàn chỉnh.",
      "Khi đã đánh dấu là cuối cùng, ứng dụng hiển thị thanh thông báo màu vàng và đặt toàn bộ ô cùng thanh công thức ở chế độ chỉ đọc mềm để ngăn chặn chỉnh sửa ngoài ý muốn.",
      "Nếu cần tiếp tục chỉnh sửa, người dùng chỉ cần bấm nút Vẫn chỉnh sửa trên thanh thông báo màu vàng hoặc bấm lại Đánh dấu là cuối cùng trong mục Thông tin."
    ]
  },
  {
    id: "sheet.arrange.help",
    app: "sheet",
    commandIds: [
      "sheet.arrange.bringToFront",
      "sheet.arrange.bringForward",
      "sheet.arrange.sendBackward",
      "sheet.arrange.sendToBack",
      "sheet.arrange.alignLeft",
      "sheet.arrange.alignCenter",
      "sheet.arrange.alignRight",
      "sheet.arrange.alignTop",
      "sheet.arrange.alignMiddle",
      "sheet.arrange.alignBottom",
      "sheet.arrange.distributeHorizontal",
      "sheet.arrange.distributeVertical",
      "sheet.arrange.group",
      "sheet.arrange.ungroup",
      "sheet.arrange.rotateRight90",
      "sheet.arrange.rotateLeft90",
      "sheet.arrange.flipHorizontal",
      "sheet.arrange.flipVertical",
      "sheet.view.selectionPane"
    ],
    title: "Sắp xếp đối tượng: Thứ tự lớp, Căn lề, Phân bố đều, Nhóm, Xoay lật và Ngăn chọn",
    summary: "Quản lý và bố trí các đối tượng hình vẽ, ảnh, hộp văn bản trên trang tính: thay đổi thứ tự lớp xếp chồng (Đưa lên trên/xuống dưới), căn chỉnh và phân bố đều nhiều hình, nhóm/bỏ nhóm đối tượng, xoay lật góc 90 độ, cùng thanh Ngăn chọn trực quan giúp liệt kê, ẩn hiện và đổi tên đối tượng.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Sắp xếp" },
    keywords: ["sắp xếp", "thứ tự lớp", "đưa lên trên", "đưa xuống dưới", "bring to front", "send to back", "căn lề", "căn trái", "căn giữa", "căn phải", "căn trên", "căn dưới", "phân bố đều", "nhóm", "bỏ nhóm", "group", "ungroup", "xoay", "lật", "rotate", "flip", "ngăn chọn", "selection pane", "ẩn hiện", "đối tượng"],
    steps: [
      "Truy cập công cụ: Chọn tab Bố trí trang trên thanh công cụ, tìm nhóm Sắp xếp ở góc phải của thanh ruy-băng.",
      "Thứ tự lớp hiển thị: Khi các hình hoặc ảnh nằm đè lên nhau, chọn đối tượng cần điều chỉnh, mở menu Đưa lên trên (Đưa lên một lớp hoặc Đưa lên trên cùng) hoặc Đưa xuống dưới (Lùi một lớp hoặc Xuống dưới cùng) để sắp đặt thứ tự hiển thị.",
      "Căn chỉnh nhiều đối tượng: Giữ phím Ctrl hoặc Shift và nhấp chuột vào từ hai đối tượng trở lên để chọn cùng lúc; mở menu Căn chỉnh và chọn kiểu căn mong muốn (Căn trái, Căn giữa ngang, Căn phải, Căn trên, Căn giữa dọc, Căn dưới) theo khung bao quanh của các đối tượng đang chọn.",
      "Phân bố đều khoảng cách: Chọn từ ba đối tượng trở lên, mở menu Căn chỉnh > chọn Phân bố đều ngang hoặc Phân bố đều dọc để khoảng cách trống giữa các hình được chia đều nhau một cách tự động và chuẩn xác.",
      "Nhóm và Bỏ nhóm đối tượng: Chọn nhiều đối tượng, mở menu Nhóm > chọn Nhóm để kết hợp các hình thành một khối duy nhất giúp di chuyển, đổi cỡ hoặc xóa thuận tiện. Khi cần tách riêng, mở menu Nhóm > chọn Bỏ nhóm.",
      "Xoay và Lật hình: Chọn đối tượng, mở menu Xoay để xoay góc 90 độ sang phải, xoay 90 độ sang trái, hoặc chọn Lật ngang, Lật dọc để tạo hình phản chiếu đối xứng.",
      "Sử dụng Ngăn chọn (Selection Pane): Bấm nút Ngăn chọn trong nhóm Sắp xếp để mở thanh danh sách bên phải màn hình. Danh sách liệt kê mọi đối tượng theo đúng thứ tự lớp từ trên xuống dưới. Nhấp vào biểu tượng con mắt để ẩn hoặc hiện nhanh đối tượng; nhấp đúp vào tên để sửa tên trực tiếp; dùng nút Đưa lên / Hạ xuống ở đầu ngăn để đổi thứ tự lớp."
    ]
  },
  {
    id: "sheet.calc.optionsHelp",
    app: "sheet",
    commandIds: ["sheet.calc.optionsDialog"],
    title: "Tùy chọn công thức và tính toán",
    summary: "Thiết lập toàn diện các tùy chọn tính toán của bảng tính: chế độ tính toán tự động hoặc thủ công, tính toán lại trước khi lưu, tính toán lặp cho các công thức vòng lặp, kiểu tham chiếu R1C1, làm tròn độ chính xác như hiển thị, và hệ thống ngày 1904.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tính toán" },
    keywords: ["tùy chọn tính toán", "công thức", "tính toán lặp", "iterative calculation", "vòng lặp", "tham chiếu vòng", "circular reference", "độ chính xác như hiển thị", "precision as displayed", "hệ ngày 1904", "1904 date system", "R1C1", "tự động", "thủ công", "F9", "Shift+F9", "bảng dữ liệu"],
    steps: [
      "Mở hộp thoại tùy chọn: Trên thanh ruy-băng, chuyển sang thẻ Công thức, nhìn sang nhóm Tính toán và bấm vào nút mở hộp thoại nhỏ ở góc dưới bên phải nhóm Tính toán.",
      "Chế độ tính toán sổ làm việc: Chọn Tự động để tính lại mọi công thức mỗi khi dữ liệu thay đổi; chọn Tự động ngoại trừ bảng dữ liệu để bỏ qua việc cập nhật bảng dữ liệu khi nhập liệu thường; hoặc chọn Thủ công để chỉ tính toán lại khi bạn nhấn phím F9 (Tính lại toàn bộ) hoặc Shift+F9 (Tính trang hiện tại).",
      "Tính toán lại trước khi lưu: Khi ở chế độ Thủ công, đánh dấu chọn ô Tính toán lại sổ làm việc trước khi lưu để tự động cập nhật kết quả các công thức mới nhất mỗi khi lưu tệp.",
      "Bật tính toán lặp (Iterative Calculation): Đánh dấu chọn Bật tính toán lặp khi sổ làm việc chứa các công thức tham chiếu vòng (ô phụ thuộc trực tiếp hoặc gián tiếp vào chính nó). Bạn có thể chỉ định Số lần lặp tối đa (mặc định 100 lần) và Độ lệch tối đa (mặc định 0,001) để dừng vòng lặp khi giá trị đã hội tụ.",
      "Kiểu tham chiếu R1C1: Đánh dấu chọn Kiểu tham chiếu R1C1 để chuyển cả tiêu đề hàng và cột sang dạng số (R1C1). Các công thức và hộp Tên ô sẽ hiển thị theo tọa độ hàng-cột số tương đối hoặc tuyệt đối.",
      "Độ chính xác như hiển thị (Precision as displayed): Đánh dấu chọn tùy chọn này để làm tròn vĩnh viễn giá trị số và kết quả công thức theo định dạng hiển thị của ô (ví dụ ô hiển thị 2 chữ số thập phân sẽ làm tròn số thực tế về 2 chữ số). Cần cân nhắc kỹ trước khi bật vì độ chính xác nguyên bản sẽ không khôi phục lại được.",
      "Hệ thống ngày 1904: Đánh dấu chọn Sử dụng hệ thống ngày 1904 để tính ngày bắt đầu từ mốc 01/01/1904 thay vì 01/01/1900, phù hợp khi trao đổi tệp với một số hệ thống bảng tính đặc thù."
    ]
  },
  {
    id: "sheet.edit.autofill",
    app: "sheet",
    commandIds: [],
    title: "Chốt điền và Tùy chọn Tự điền: điền chuỗi, sao chép ô và nhấp đúp",
    summary: "Sử dụng chốt điền hình vuông nhỏ ở góc dưới bên phải ô đang chọn để sao chép dữ liệu, điền chuỗi số, ngày tháng, công thức hoặc nhấp đúp để tự động điền xuống theo cột dữ liệu liền kề.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chốt điền", "tự điền", "autofill", "nhấp đúp chốt điền", "tùy chọn tự điền", "auto fill options", "sao chép ô", "điền chuỗi", "chỉ điền định dạng", "điền không định dạng", "điền ngày", "điền ngày làm việc", "điền tháng", "điền năm", "flash fill", "điền nhanh", "Ctrl kéo"],
    steps: [
      "Chọn một hoặc nhiều ô chứa dữ liệu mẫu hoặc công thức. Đưa con trỏ chuột vào góc dưới bên phải vùng chọn, con trỏ sẽ đổi thành hình dấu cộng mảnh màu đen (chốt điền).",
      "Kéo chốt điền theo hướng cần điền: kéo bình thường sẽ tiếp nối chuỗi số hoặc ngày tháng; nếu giữ phím Ctrl trong khi kéo, con trỏ hiện thêm dấu cộng nhỏ để chuyển đổi giữa Sao chép ô và Điền chuỗi.",
      "Nhấp đúp chuột trái vào chốt điền để điền nhanh xuống phía dưới cho đến hết vùng dữ liệu của cột bên cạnh (ưu tiên cột bên trái rồi tới cột bên phải; nếu nằm trong bảng dữ liệu, sẽ điền đến hết hàng cuối của bảng).",
      "Sau khi kéo hoặc nhấp đúp chốt điền, nút nổi Tùy chọn Tự điền xuất hiện ở góc dưới bên phải vùng điền. Bấm vào nút (hoặc nhấn phím Ctrl) để mở bảng menu lựa chọn.",
      "Dùng phím mũi tên Lên/Xuống và Enter (hoặc nhấp chuột) để chọn chế độ mong muốn: Sao chép ô, Điền chuỗi, Chỉ điền định dạng, Điền không định dạng, Điền ngày, Điền ngày làm việc (bỏ qua Thứ Bảy và Chủ Nhật), Điền tháng, Điền năm, hoặc Điền nhanh. Nhấn phím Esc để đóng menu; thao tác tự điền có thể hoàn tác ngay bằng tổ hợp phím Ctrl+Z."
    ]
  },
  {
    id: "sheet.edit.dragDrop",
    app: "sheet",
    commandIds: [],
    title: "Kéo-thả ô: di chuyển, sao chép và chèn ô bằng chuột",
    summary: "Đưa con trỏ chuột vào đường viền của ô hoặc vùng chọn để di chuyển ô đến vị trí mới, giữ Ctrl để sao chép, giữ Shift để chèn đẩy ô, hoặc giữ Alt để di chuyển sang trang tính khác.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["kéo thả ô", "di chuyển ô", "drag drop", "sao chép ô bằng chuột", "Ctrl kéo viền", "Shift chèn ô", "Alt chuyển trang tính", "viền ô", "chuột kéo ô", "cập nhật công thức"],
    steps: [
      "Chọn ô hoặc vùng ô cần thao tác. Rà con trỏ chuột lên bất kỳ cạnh viền nào của vùng chọn (trên, dưới, trái hoặc phải, tránh góc dưới bên phải của chốt điền). Con trỏ chuột sẽ đổi thành biểu tượng di chuyển bốn hướng.",
      "Di chuyển ô: Nhấn giữ chuột trái và kéo đến vị trí đích, đường viền nét đứt sẽ chạy theo vị trí con trỏ; khi thả chuột, ô sẽ được chuyển tới vùng mới, toàn bộ công thức tham chiếu đến các ô này trong sổ làm việc sẽ tự động cập nhật chính xác.",
      "Sao chép ô: Trong khi kéo viền, nhấn và giữ phím Ctrl (con trỏ chuột sẽ hiện biểu tượng sao chép kèm dấu cộng). Khi thả chuột, dữ liệu và công thức được sao chép đến vị trí mới và các tham chiếu tương đối sẽ tịnh tiến tương ứng.",
      "Chèn ô: Trong khi kéo viền, nhấn và giữ phím Shift. Một thanh chỉ thị vị trí chèn nằm ngang hoặc nằm dọc sẽ xuất hiện; khi thả chuột, các ô lân cận sẽ được tự động đẩy xuống dưới hoặc đẩy sang phải để chèn vùng ô vào mà không ghi đè dữ liệu cũ.",
      "Chuyển sang trang tính khác: Trong khi kéo viền, giữ phím Alt và rê chuột qua tên tab trang tính ở cạnh dưới cửa sổ để chuyển trang tính đích, sau đó thả chuột vào vị trí ô mong muốn. Mọi thao tác kéo-thả đều có thể hoàn tác bằng một lần nhấn phím Ctrl+Z."
    ]
  },
  {
    id: "sheet.data.refreshAllHelp",
    app: "sheet",
    commandIds: ["sheet.data.refreshAll"],
    title: "Làm mới tất cả: cập nhật liên kết và bảng tổng hợp",
    summary: "Nhấn Ctrl+Alt+F5 hoặc bấm Làm mới tất cả trên thanh ruy-băng để đồng bộ lại dữ liệu từ tất cả sổ làm việc liên kết bên ngoài và tính toán lại các bảng tổng hợp trong toàn bộ sổ làm việc.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Kết nối" },
    keywords: ["làm mới tất cả", "refresh all", "cập nhật liên kết", "liên kết ngoài", "bảng tổng hợp", "pivot table", "Ctrl+Alt+F5", "đồng bộ dữ liệu", "kết nối"],
    steps: [
      "Mở thẻ Dữ liệu trên thanh ruy-băng, tìm tới nhóm Kết nối ở phía bên trái thanh công cụ.",
      "Bấm nút Làm mới tất cả (hoặc nhấn tổ hợp phím tắt Ctrl+Alt+F5 trên bàn phím của bạn).",
      "Ứng dụng sẽ duyệt qua toàn bộ các liên kết ngoài trong các trang tính để cập nhật lại giá trị mới nhất từ tệp nguồn nếu tệp khả dụng trên hệ thống.",
      "Đồng thời, mọi bảng tổng hợp dữ liệu hiện diện trong toàn bộ sổ làm việc cũng sẽ được tính toán và làm mới lại cấu trúc dữ liệu tương ứng.",
      "Thanh trạng thái ở góc dưới cửa sổ sẽ hiển thị thông báo kết quả làm mới dữ liệu."
    ]
  },
  {
    id: "sheet.data.editLinksHelp",
    app: "sheet",
    commandIds: ["sheet.data.editLinks"],
    title: "Chỉnh sửa liên kết: quản lý, đổi nguồn và ngắt liên kết ngoài",
    summary: "Mở hộp thoại Chỉnh sửa liên kết trong nhóm Kết nối của thẻ Dữ liệu để xem danh sách các sổ làm việc bên ngoài được tham chiếu, cập nhật giá trị hiển thị, chuyển đổi đường dẫn nguồn hoặc ngắt liên kết vĩnh viễn thành giá trị tĩnh.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Kết nối" },
    keywords: ["chỉnh sửa liên kết", "edit links", "ngắt liên kết", "break link", "đổi nguồn", "change source", "mở nguồn", "open source", "cập nhật giá trị", "kiểm tra trạng thái", "liên kết ngoài", "sổ làm việc ngoài"],
    steps: [
      "Chuyển sang thẻ Dữ liệu trên thanh ruy-băng, bấm nút Chỉnh sửa liên kết trong nhóm Kết nối để mở hộp thoại quản lý liên kết.",
      "Xem danh sách các nguồn liên kết trong bảng: cột Nguồn hiển thị tên tệp, cột Loại hiển thị Bảng tính, cột Cập nhật và cột Trạng thái hiển thị tính khả dụng của tệp nguồn.",
      "Bấm Cập nhật giá trị để nạp lại dữ liệu mới nhất từ tệp nguồn được chọn; bấm Đổi nguồn... khi tệp nguồn đã chuyển sang thư mục khác hoặc đổi tên tệp mới.",
      "Bấm Mở nguồn để trực tiếp mở tệp nguồn bên ngoài; bấm Kiểm tra trạng thái để xác định tệp nguồn có tồn tại và truy cập được hay không.",
      "Bấm Ngắt liên kết khi bạn muốn chuyển toàn bộ công thức tham chiếu nguồn đó thành các giá trị tĩnh hiện tại, đồng thời loại bỏ hoàn toàn liên kết ngoài khỏi sổ làm việc.",
      "Ứng dụng chạy hoàn toàn ngoại tuyến và mặc định không tự động đọc tệp bên ngoài khi mở để đảm bảo an toàn bảo mật dữ liệu của bạn."
    ]
  }
,
  {
    id: "sheet.formula.arrayConstants",
    app: "sheet",
    commandIds: ["sheet.formula.insertFunction"],
    title: "Hằng mảng trong công thức ({1,2,3})",
    summary: "Gõ trực tiếp một dãy giá trị trong công thức bằng dấu ngoặc nhọn, ví dụ =SUM({1,2,3}*2) hoặc =VLOOKUP(2,{1,\"a\";2,\"b\"},2,FALSE), không cần ghi các số vào ô.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Hàm tính toán" },
    keywords: ["hằng mảng", "mảng", "dấu ngoặc nhọn", "array constant", "{1,2,3}", "tra cứu", "danh sách cố định"],
    steps: [
      "Cú pháp: đặt các giá trị trong dấu { }. Dấu phẩy ngăn cách các cột trong cùng một hàng, dấu chấm phẩy ngăn cách các hàng. Ví dụ {1,2,3} là một hàng ba ô, {1;2;3} là một cột ba ô, {1,2;3,4} là ma trận 2 hàng 2 cột.",
      "Phần tử có thể là số, chữ trong ngoặc kép (\"Hà Nội\"), TRUE/FALSE hoặc mã lỗi như #N/A. Mọi hàng phải có cùng số phần tử.",
      "Dùng trong hàm: =SUM({1,2,3}) cho 6; =SUMPRODUCT({1,2,3},{4,5,6}) cho 32; =INDEX({10,20,30},2) cho 20; =MATCH(\"b\",{\"a\",\"b\",\"c\"},0) cho 2; =LARGE({5,9,1},2) cho 5; =VLOOKUP(2,{1,\"a\";2,\"b\"},2,FALSE) cho b.",
      "Phép tính theo từng phần tử: =SUM({1,2,3}*2) cho 12; =SUMPRODUCT(({1,2,3}>1)*1) cho 2 (đếm các phần tử lớn hơn 1).",
      "Lưu ý: các hàm đòi hỏi vùng ô thật (COUNTIF, SUMIF, SUMIFS, AVERAGEIF, MAXIFS, MINIFS, RANK) sẽ báo #VALUE! khi truyền hằng mảng vào đối số vùng, giống hành vi chuẩn của bảng tính; hãy ghi các giá trị ra ô rồi tham chiếu vùng ô đó."
    ]
  },
  {
    id: "sheet.page.themesHelp",
    app: "sheet",
    commandIds: ["sheet.page.themes", "sheet.page.themeColors", "sheet.page.themeFonts"],
    title: "Chủ đề (Themes), Bảng màu (Colors) và Bộ phông chữ (Fonts)",
    summary: "Thay đổi giao diện tổng thể của toàn bộ sổ làm việc bằng các chủ đề, bảng màu và bộ phông chữ dựng sẵn theo chuẩn OpenXML quốc tế.",
    ribbon: { tab: "Bố trí trang", tabId: "pageLayout", group: "Chủ đề" },
    keywords: ["chủ đề", "themes", "bảng màu", "colors", "phông chữ", "fonts", "theme1.xml", "office", "facet", "integral", "ion", "organic", "retrospect", "slice", "wisp"],
    steps: [
      "Chuyển sang tab Bố trí trang (Page Layout) trên thanh ruy-băng để tìm nhóm Chủ đề (Themes) nằm ở vị trí đầu tiên.",
      "Bấm nút Chủ đề (Themes) để mở danh sách các chủ đề hoàn chỉnh: Office (mặc định), Góc cạnh (Facet), Tích phân (Integral), Ion, Hữu cơ (Organic), Hồi tưởng (Retrospect), Lát cắt (Slice), Thoang thoảng (Wisp). Chọn một chủ đề sẽ áp dụng đồng thời cả bảng màu và bộ phông tương ứng vào toàn bộ sổ làm việc.",
      "Bấm nút Màu (Colors) để tùy biến riêng bảng màu với hơn 15 bảng màu phối sẵn (Office, Office 2007-2010, Thang xám, Facet, Integral, Ion, Organic, Retrospect, Slice, Wisp, Xanh dương, Xanh lá, Đỏ, Tím, Cam). Khi đổi bảng màu, các ô chọn màu trong Định dạng ô (Format Cells) và biểu đồ sẽ tự động chuyển sang các dải màu theo chủ đề đã chọn.",
      "Bấm nút Phông chữ (Fonts) để tùy biến bộ phông tiêu đề và nội dung (Office Calibri Light/Calibri, Calibri, Century Gothic, Garamond, Bookman Old Style, Arial, Times New Roman, Georgia, Trebuchet MS, Corbel, Candara).",
      "Khi lưu tệp sang định dạng XLSX, các thiết lập chủ đề được đóng gói nguyên bản vào tệp OpenXML xl/theme/theme1.xml chuẩn, đảm bảo khi trao đổi tệp sang các ứng dụng bảng tính khác, hệ thống sẽ nhận diện chính xác ThemeColorScheme và ThemeFontScheme."
    ]
  }
];

registerHelpEntries(SHEET_HELP_ENTRIES);


