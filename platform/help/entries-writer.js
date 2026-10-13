/**
 * Hướng dẫn sử dụng 3T Doc — nội dung tiếng Việt thật, khớp UI hiện có.
 * Task sau thêm entry mới vào mảng này (hoặc file catalog app tương ứng).
 */

export const WRITER_HELP_ENTRIES = [
  {
    id: "writer.view.outline.help",
    app: "writer",
    commandIds: [
      "writer.view.outline",
      "writer.outline.promote",
      "writer.outline.demote",
      "writer.outline.moveUp",
      "writer.outline.moveDown",
      "writer.outline.expand",
      "writer.outline.collapse",
      "writer.outline.showLevel",
      "writer.outline.close"
    ],
    title: "Chế độ xem Dàn bài và tổ chức cây tiêu đề",
    summary: "Chế độ Dàn bài (Outline) cho phép xem toàn bộ cấu trúc văn bản theo cấp tiêu đề, nâng hoặc hạ cấp bậc tiêu đề, di chuyển vị trí phần tài liệu lên hoặc xuống, và thu gọn/mở rộng từng nhánh nội dung.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dàn bài" },
    keywords: ["dàn bài", "outline", "nâng cấp", "hạ cấp", "thu gọn", "mở rộng", "cấp tiêu đề", "di chuyển lên", "di chuyển xuống", "Alt Shift"],
    steps: [
      "Mở tab Chế độ xem trên thanh công cụ, chọn Dàn bài để chuyển sang giao diện tổ chức tài liệu theo cây phân cấp.",
      "Thanh công cụ Dàn bài cung cấp các nút thao tác nhanh: Nâng cấp (Alt+Shift+Left) để tăng bậc tiêu đề, Hạ cấp (Alt+Shift+Right) để giảm bậc tiêu đề.",
      "Bấm Di chuyển lên hoặc Di chuyển xuống để hoán đổi thứ tự toàn bộ phân đoạn tiêu đề cùng nội dung thuộc về nó.",
      "Sử dụng nút Mở rộng (Alt+Shift++) hoặc Thu gọn (Alt+Shift+-) để ẩn hoặc hiện nội dung thân dưới tiêu đề đang chọn.",
      "Hộp chọn 'Hiển thị cấp' cho phép lọc nhanh hiển thị: chỉ xem Tiêu đề Cấp 1, Cấp 2, Cấp 3 hoặc xem Tất cả các cấp.",
      "Bấm nút Đóng Dàn bài trên thanh công cụ để quay lại chế độ Bố cục in bình thường. Toàn bộ cấu trúc phân cấp được lưu giữ nguyên vẹn vào tệp DOCX."
    ]
  },
  {
    id: "writer.view.draft.help",
    app: "writer",
    commandIds: ["writer.view.draft"],
    title: "Chế độ xem Bản nháp và soạn thảo văn bản nhanh",
    summary: "Chế độ Bản nháp (Draft) loại bỏ các đường viền trang, khoảng cách lề và bố cục trang phức tạp để người dùng tập trung hoàn toàn vào việc nhập và chỉnh sửa văn bản với tốc độ cao.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem" },
    keywords: ["bản nháp", "draft", "soạn thảo nhanh", "không phân trang", "chế độ xem"],
    steps: [
      "Mở tab Chế độ xem, chọn Bản nháp trong nhóm Dạng xem.",
      "Trang tài liệu sẽ hiển thị văn bản liền mạch không bị ngắt trang hoặc khoảng cách lề, giúp tăng tốc độ gõ chữ và chỉnh sửa văn bản dài.",
      "Để quay lại chế độ xem có ranh giới trang đầy đủ, bấm Bố cục in trên tab Chế độ xem.",
      "Khi lưu tài liệu sang định dạng DOCX, chế độ xem Bản nháp được lưu vào thiết lập tệp để các bộ ứng dụng văn phòng mở đúng giao diện tương ứng."
    ]
  },
  {
    id: "writer.view.collapsibleHeadings.help",
    app: "writer",
    commandIds: ["writer.view.toggleHeadingCollapse"],
    title: "Thu gọn và mở rộng nội dung dưới tiêu đề trong Bố cục in",
    summary: "Trong chế độ Bố cục in, mỗi tiêu đề đều có biểu tượng mũi tên để thu gọn hoặc mở rộng nhanh phần nội dung bên dưới, giúp dễ theo dõi tài liệu dài mà không làm mất dữ liệu khi lưu.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dàn bài" },
    keywords: ["thu gọn tiêu đề", "mở rộng tiêu đề", "ẩn nội dung tiêu đề", "collapsible headings", "bố cục in"],
    steps: [
      "Di chuột lên bất kỳ tiêu đề nào (Cấp 1–6) trong trang tài liệu, một nút mũi tên nhỏ sẽ xuất hiện ở đầu tiêu đề.",
      "Bấm vào mũi tên (hoặc nhấn chuột vào tiêu đề rồi chọn Thu/Mở nội dung tiêu đề) để ẩn toàn bộ nội dung nằm dưới tiêu đề đó cho đến tiêu đề tiếp theo cùng cấp hoặc cao hơn.",
      "Bấm lại vào mũi tên để mở rộng và hiển thị lại toàn bộ nội dung đã thu gọn.",
      "Khi thu gọn nội dung và bấm Lưu tệp (DOCX), toàn bộ văn bản vẫn được bảo toàn 100% không bị mất hay thiếu hụt, đồng thời trạng thái thu gọn được lưu theo chuẩn mở rộng tài liệu."
    ]
  },
  {
    id: "writer.view.navigationPane.help",
    app: "writer",
    commandIds: ["writer.view.navigationPane"],
    title: "Dùng Ngăn dẫn hướng để tìm và nhảy tới tiêu đề",
    summary: "Mở ngăn bên trái để xem cây Tiêu đề 1–6 và các đoạn đã đặt Mức đại cương, lọc nhanh theo chữ rồi nhảy tới đúng vị trí trong tài liệu dài.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["ngăn dẫn hướng", "khung điều hướng", "navigation pane", "tiêu đề", "heading", "mức đại cương", "tìm tiêu đề", "ctrl alt n"],
    steps: [
      "Mở tab Chế độ xem trên thanh ribbon, tới nhóm Hiển thị rồi bấm Ngăn dẫn hướng; có thể nhấn Ctrl+Alt+N để bật hoặc tắt nhanh.",
      "Danh sách bên trái hiển thị các đoạn dùng kiểu Tiêu đề 1–6 hoặc đã đặt Mức đại cương trong hộp thoại Đoạn văn. Số bên phải mỗi dòng là trang ước lượng theo bố cục hiện tại.",
      "Nhập chữ vào ô Tìm trong tài liệu để lọc tiêu đề; tìm kiếm không phân biệt chữ hoa, chữ thường và vẫn khớp khi nhập tiếng Việt không dấu.",
      "Bấm một tiêu đề hoặc chọn bằng phím Mũi tên lên/xuống, Home, End rồi nhấn Enter để cuộn tới tiêu đề và đặt con trỏ ở đầu tiêu đề đó.",
      "Dùng mũi tên cạnh tiêu đề để thu/mở một nhánh, hoặc bấm Thu gọn tất cả / Mở rộng tất cả. Nhấn Esc trong ngăn để đưa tiêu điểm trở lại tài liệu.",
      "Nếu ngăn trống, hãy chọn đoạn cần làm tiêu đề rồi áp dụng kiểu Tiêu đề 1–6 ở tab Trang đầu; hoặc mở hộp thoại Đoạn văn và chọn Mức đại cương phù hợp."
    ]
  },
  {
    id: "writer.mailMerge.ifRule.docx",
    app: "writer",
    commandIds: ["writer.mailMerge.ifRule"],
    title: "Lưu quy tắc trộn thư và tham chiếu chéo vào tệp DOCX",
    summary: "Quy tắc Nếu...Thì...Ngược lại được lưu thành trường IF của tệp DOCX; tham chiếu chéo tới dấu trang được lưu thành trường REF, để các phần mềm soạn thảo văn bản khác cập nhật được.",
    ribbon: { tab: "Trộn thư", tabId: "mailings", group: "Viết & Chèn trường" },
    keywords: ["IF", "REF", "DOCX", "trộn thư", "quy tắc", "tham chiếu chéo", "dấu trang"],
    steps: [
      "Mở tab Trộn thư, nhóm Viết & Chèn trường, bấm nút Quy tắc để mở hộp thoại Quy tắc Nếu...Thì...Ngược lại.",
      "Chọn trường dữ liệu từ danh sách tại mục Trường. Nếu trường bị bỏ trống khi bấm Chèn, hộp thoại hiển thị cảnh báo lỗi «Vui lòng chọn trường dữ liệu.» và giữ hộp thoại mở để chọn lại.",
      "Chọn phép so sánh tại mục Toán tử (bằng, khác, chứa, lớn hơn, nhỏ hơn, rỗng, không rỗng), sau đó nhập Giá trị so sánh, nội dung chèn khi đúng điều kiện tại mục Thì và nội dung chèn khi sai tại mục Ngược lại.",
      "Dùng phím Tab để di chuyển giữa các trường nhập và nút bấm; nhấn Chèn (hoặc phím Enter khi nút Chèn nhận tiêu điểm) để hoàn tất. Nhấn phím Esc hoặc nút Hủy để đóng hộp thoại mà không thay đổi.",
      "Khi lưu tệp dạng DOCX (Tệp > Lưu thành), quy tắc được ghi thành trường IF chuẩn; mở bằng các phần mềm soạn thảo khác có thể chọn trường và cập nhật bình thường.",
      "Để tham chiếu tới tiêu đề hoặc dấu trang, mở tab Tham chiếu > nhóm Chú thích ảnh > Tham chiếu chéo; khi lưu DOCX, tham chiếu chéo trở thành trường REF trỏ tới dấu trang nội bộ."
    ]
  },
  {
    id: "writer.view.ruler.interactive",
    app: "writer",
    commandIds: ["writer.view.ruler", "writer.ruler.setParagraphIndents", "writer.ruler.setPageMargins"],
    title: "Dùng thước để đặt lề và thụt lề",
    summary: "Thước ngang hiển thị theo cm và cho phép kéo lề trang, thụt dòng đầu, thụt lề treo, lề trái và lề phải của đoạn đang chọn.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["thước", "ruler", "lề", "thụt dòng đầu", "thụt lề treo", "Alt", "cm", "mm"],
    steps: [
      "Mở tab Chế độ xem, nhóm Hiển thị và bật Thước. Vùng xám là lề trang; vùng trắng là vùng nhập văn bản. Các số 1, 2, 3… biểu thị centimet tính từ lề trái.",
      "Để đổi lề trang, kéo tay nắm dọc ở ranh giới vùng xám bên trái hoặc bên phải. Đường xanh trên trang cho biết vị trí mới; thả chuột để áp dụng. Nhấn Ctrl+Z để hoàn tác một lần kéo.",
      "Đặt con trỏ trong một đoạn hoặc bôi chọn nhiều đoạn. Tam giác trên đặt thụt dòng đầu; tam giác dưới bên trái đặt thụt lề treo; hình chữ nhật bên trái kéo cả thụt dòng đầu và thụt lề treo; tam giác bên phải đặt thụt lề phải.",
      "Khi kéo, giữ Alt để chỉnh chính xác đến 0,1 mm. Có thể nhấn Tab để đưa tiêu điểm tới từng dấu, rồi dùng Mũi tên trái/phải để đổi 1 mm; giữ Shift để đổi 5 mm. Tooltip và trình đọc màn hình thông báo giá trị thật."
    ]
  },
  {
    id: "writer.file.basics",
    app: "writer",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.close"],
    title: "Tạo, mở và lưu tài liệu",
    summary: "Tài liệu mới mở ra trang A4 trống. Dùng Tệp để mở hoặc lưu DOCX, DOC, ODT, RTF, TXT.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["tạo mới", "mở tệp", "lưu", "lưu thành", "in", "Ctrl+N", "Ctrl+O", "Ctrl+S", "F12", "Ctrl+P", "tài liệu trống", "cửa sổ riêng", "mở nhiều cửa sổ", "Explorer"],
    steps: [
      "Tạo tài liệu trống: nhấn Ctrl+N hoặc mở Tệp > Mới. Doc mở một cửa sổ riêng tên Tài liệu 2, Tài liệu 3…; trang A4 có con trỏ ở đoạn đầu và chưa được đánh dấu là đã sửa. Trong Desktop, khi Doc đang mở, nhấp đúp thêm một tệp DOCX/DOC/ODT/RTF/TXT trong Explorer hoặc bấm lại shortcut Doc ở Start sẽ mở thêm cửa sổ trong cùng tiến trình đang chạy. Mỗi cửa sổ có tên tệp, trạng thái sửa, lệnh Lưu và lời nhắc Đóng riêng; cửa sổ cuối cùng mới kết thúc ứng dụng.",
      "Mở tài liệu: nhấn Ctrl+O hoặc chọn Tệp > Mở, chọn DOCX, DOC, ODT, RTF hoặc TXT. Nếu tài liệu hiện tại có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi tiếp tục; Hủy hoặc đóng hộp chọn tệp sẽ giữ tài liệu hiện tại.",
      "Lưu: Ctrl+S mở hộp thoại Lưu thành cho tài liệu mới. Với tệp đã mở/lưu, Ctrl+S ghi đúng định dạng hiện tại. Nhấn F12 (hoặc Ctrl+Shift+S), nhập tên trong hộp thoại Lưu bản sao rồi chọn DOCX, DOC, ODT, RTF, TXT hoặc PDF ở danh sách Loại tệp. Cũng có thể chọn Tệp > Lưu bản sao. Chọn PDF chỉ xuất một bản PDF; tài liệu đang mở giữ tên, định dạng và đường dẫn cũ. Khi ghi đè tệp đã có, xác nhận trong hộp thoại của Windows; sau khi lưu định dạng văn bản khác, tên tab và tiêu đề cửa sổ chuyển sang tệp mới."
    ]
  },
  {
    id: "writer.file.print",
    app: "writer",
    commandIds: ["common.file.print"],
    title: "Xem trước và in tài liệu",
    summary: "Xem các trang A4 trước khi in, chọn máy in, số bản và phạm vi trang.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "In ấn" },
    keywords: ["in", "Ctrl+P", "xem trước khi in", "máy in", "số bản", "phạm vi trang"],
    steps: [
      "Nhấn Ctrl+P hoặc chọn Bố cục > In ấn > In để mở Xem trước khi in.",
      "Kiểm tra số trang và nội dung tài liệu trước khi in; nhấn Esc bất kỳ lúc nào để quay lại cửa sổ soạn thảo.",
      "Chọn máy in, số bản và phạm vi trang trong hộp thoại in của Windows rồi nhấn In để in tài liệu."
    ]
  },
  {
    id: "writer.page.blank",
    app: "writer",
    commandIds: ["writer.page.blank"],
    title: "Chèn trang trắng",
    summary: "Thêm một trang hoàn toàn trống ngay tại vị trí con trỏ, ví dụ để chừa trang cho phụ lục hoặc chữ ký. Con trỏ nằm ở trang mới phía sau trang trắng.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Trang văn bản" },
    keywords: ["trang trắng", "blank page", "trang trống", "chèn trang", "ngắt trang"],
    steps: [
      "Đặt con trỏ ở vị trí muốn có trang trắng (cuối đoạn văn hoặc đầu trang).",
      "Mở tab Chèn, nhóm Trang văn bản, bấm nút Trang trắng.",
      "Doc chèn hai ngắt trang liên tiếp: nội dung phía sau con trỏ chuyển xuống trang kế tiếp và giữa hai ngắt là một trang trống. Số trang trên thanh trạng thái tăng thêm 1 hoặc 2 tùy vị trí con trỏ.",
      "Muốn bỏ trang trắng: đặt con trỏ trên đường gạch đứt (ngắt trang) rồi xóa, hoặc bấm Ctrl+Z ngay sau khi chèn để hoàn tác cả hai ngắt trang chỉ bằng một lần."
    ]
  },
  {
    id: "writer.table.fromText",
    app: "writer",
    commandIds: ["writer.table.fromText"],
    title: "Chuyển văn bản thành bảng",
    summary: "Biến các đoạn đang chọn thành bảng: mỗi đoạn là một hàng, các ô được tách theo dấu Tab, dấu phẩy, dấu chấm phẩy, khoảng trắng hoặc ký tự do bạn chọn.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng biểu" },
    keywords: ["văn bản thành bảng", "text to table", "chuyển thành bảng", "tách ô", "dấu phân cách", "danh sách thành bảng"],
    steps: [
      "Gõ hoặc dán dữ liệu, mỗi dòng một đoạn, các cột cách nhau bằng cùng một dấu (ví dụ: Họ tên; Chức vụ; Phòng).",
      "Bôi đen tất cả các đoạn đó, rồi mở tab Chèn, nhóm Bảng biểu, bấm Văn bản thành bảng.",
      "Trong hộp thoại, chọn Tách văn bản tại: Tab, Dấu phẩy, Dấu chấm phẩy, Khoảng trắng hoặc Ký tự khác (nhập ký tự vào ô hiện ra). Dòng chữ bên dưới cho biết số hàng và số cột sẽ tạo.",
      "Bấm Tạo bảng (hoặc Enter). Bảng thay thế đoạn đã chọn; dòng nào ít ô hơn được bù ô trống. Bấm Hủy hoặc Esc để thoát mà không đổi gì.",
      "Bấm Ctrl+Z để hoàn tác: các đoạn văn bản gốc được khôi phục nguyên vẹn."
    ]
  },
  {
    id: "writer.section.breaks",
    app: "writer",
    commandIds: ["writer.page.break", "writer.break.column", "writer.section.nextPage", "writer.section.continuous", "writer.section.evenPage", "writer.section.oddPage"],
    title: "Ngắt, ngắt cột và ngắt mục",
    summary: "Chia tài liệu thành các mục có khổ giấy, hướng giấy và lề riêng. Trang kế tiếp/chẵn/lẻ bắt đầu ở trang phù hợp; Liên tục đặt mốc ngay tại con trỏ.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["ngắt mục", "section break", "ngắt trang", "ngắt cột", "trang ngang", "trang chẵn", "trang lẻ"],
    steps: [
      "Đặt con trỏ tại vị trí cần bắt đầu vùng định dạng mới.",
      "Mở tab Bố cục, nhóm Thiết lập trang, mở Ngắt rồi chọn Trang kế tiếp, Liên tục, Trang chẵn hoặc Trang lẻ trong nhóm Ngắt mục.",
      "Sau mốc ngắt, chọn Căn lề, Hướng giấy hoặc Khổ giấy trên cùng nhóm. Thay đổi chỉ được lưu cho mục đang hoạt động; mục trước giữ nguyên.",
      "Để chuyển phần chữ sau con trỏ sang cột kế, mở Bố cục > Ngắt > Ngắt cột; tài liệu cần có từ hai cột trở lên. Dùng Ctrl+Z/Ctrl+Y để hoàn tác hoặc làm lại mốc ngắt."
    ]
  },
  {
    id: "writer.section.headers-footers",
    app: "writer",
    commandIds: ["writer.section.options", "writer.section.linkToPrevious", "writer.section.differentFirstPage", "writer.section.differentOddEven", "writer.pageNumber.format", "writer.section.delete", "writer.layout.sectionOptions"],
    title: "Đầu trang, chân trang và số trang theo mục",
    summary: "Tách đầu trang, chân trang và cách đánh số trang giữa các mục; có thể kế thừa từ mục trước.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["đầu trang theo mục", "chân trang theo mục", "liên kết với phần trước", "trang đầu khác biệt", "trang chẵn lẻ", "đánh số trang", "bắt đầu tại"],
    steps: [
      "Đặt con trỏ trong mục cần chỉnh. Nếu chưa có mục riêng, mở Bố cục > Thiết lập trang > Ngắt và chèn một trong bốn kiểu Ngắt mục.",
      "Mở Bố cục > Thiết lập trang > Tùy chọn mục. Bỏ chọn Liên kết với phần trước để sửa đầu trang hoặc chân trang của mục này riêng; chọn lại để dùng nội dung từ mục ngay trước đó.",
      "Trong cùng hộp thoại, bật Trang đầu khác biệt hoặc Trang chẵn và lẻ khác nhau khi cần. Chỉnh nội dung trong vùng Đầu trang hoặc Chân trang khi con trỏ đang ở đúng mục.",
      "Chọn Định dạng số trang để tiếp tục cách đánh số hiện tại hoặc chọn Bắt đầu tại và nhập số đầu tiên của mục. Nhấn Áp dụng; Ctrl+Z/Ctrl+Y hoàn tác hoặc làm lại thay đổi."
    ]
  },
  {
    id: "writer.page.color",
    app: "writer",
    commandIds: ["writer.page.color"],
    title: "Màu trang",
    summary: "Đặt một màu nền đặc cho toàn bộ trang soạn thảo và trang in. Phiên bản này hỗ trợ màu đặc; chưa hỗ trợ nền chuyển sắc hoặc ảnh nền.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Nền & Viền trang" },
    keywords: ["màu trang", "page color", "màu nền", "nền trang", "thiết kế", "design", "background color"],
    steps: [
      "Mở tab Thiết kế, trong nhóm Nền & Viền trang nhấn Màu trang.",
      "Chọn một ô màu có sẵn, hoặc chọn Màu tùy chỉnh để lấy màu khác.",
      "Nhấn Áp dụng. Màu xuất hiện trên vùng trang soạn thảo và trong Xem trước khi in.",
      "Chọn ô Không màu để bỏ nền. Dùng Ctrl+Z/Ctrl+Y để hoàn tác hoặc làm lại."
    ]
  },
  {
    id: "writer.review.wordCount",
    app: "writer",
    commandIds: ["writer.review.wordCount"],
    title: "Đếm từ",
    summary: "Đếm từ, ký tự, đoạn văn và dòng trong thân tài liệu Doc. Từ tiếng Việt được tách theo khoảng trắng; nhãn danh sách cũng được tính. Đầu trang, chân trang và hộp văn bản nổi không được tính.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Chính tả & Ngữ pháp" },
    keywords: ["đếm từ", "word count", "số từ", "ký tự", "thống kê", "status bar"],
    steps: [
      "Mở tab Đánh giá trên ribbon.",
      "Trong nhóm Chính tả & Ngữ pháp, nhấn nút Đếm từ (cạnh Soát lỗi chính tả).",
      "Hộp thoại hiện số Từ, Ký tự (không khoảng trắng), Ký tự (có khoảng trắng), Đoạn văn và Dòng. Nếu đang bôi đen một vùng chữ thì thống kê chỉ tính vùng chọn.",
      "Dòng của toàn tài liệu được đo theo các dòng chữ đang hiển thị; kết quả thay đổi theo độ rộng trang, phông và bố cục. Khi bôi đen, số dòng tính trong vùng chọn.",
      "Nhấn Đóng hoặc Esc để tắt hộp thoại.",
      "Muốn xem nhanh: nhìn góc trái thanh trạng thái dưới cùng, dòng “X từ” cập nhật khi gõ. Nhấp vào dòng đó cũng mở cùng hộp thoại Đếm từ."
    ]
  },
  {
    id: "writer.trackChanges",
    app: "writer",
    commandIds: [
      "writer.trackChanges.toggle",
      "writer.trackChanges.previous",
      "writer.trackChanges.next",
      "writer.trackChanges.acceptOne",
      "writer.trackChanges.rejectOne",
      "writer.trackChanges.acceptAll",
      "writer.trackChanges.rejectAll"
    ],
    title: "Theo dõi thay đổi",
    summary: "Đánh dấu chữ thêm bằng gạch chân xanh và chữ xóa bằng gạch ngang đỏ. Có thể duyệt từng thay đổi, chấp nhận/từ chối từng cái, hoặc xử lý hàng loạt. Hoàn tác bằng Ctrl+Z (cùng ngăn xếp snapshot của Writer).",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Theo dõi thay đổi" },
    keywords: ["theo dõi thay đổi", "track changes", "chấp nhận", "từ chối", "soát xét", "revision"],
    steps: [
      "Mở tab Đánh giá, nhóm Theo dõi thay đổi.",
      "Nhấn Theo dõi thay đổi (hoặc Ctrl+Shift+E) để bật. Gõ thêm sẽ bọc trong thẻ chèn màu xanh; xóa sẽ giữ lại đoạn bị xóa màu đỏ.",
      "Nhấn Thay đổi sau hoặc Thay đổi trước để nhảy tới từng mốc, cuộn tới vị trí đó và viền xanh nổi bật thay đổi đang xét.",
      "Nhấn Chấp nhận một để giữ phần chèn / bỏ phần xóa của thay đổi đang chọn, rồi tự chuyển tới thay đổi kế tiếp.",
      "Nhấn Từ chối một để bỏ phần chèn / khôi phục phần xóa của thay đổi đang chọn.",
      "Chấp nhận thay đổi và Từ chối thay đổi áp dụng cho toàn bộ tài liệu. Nhấn Ctrl+S để lưu DOCX: các thay đổi chưa duyệt giữ tác giả và thời gian, mở lại trong Doc hoặc ứng dụng đọc DOCX khác vẫn duyệt được. PDF dùng bản đã chấp nhận, không còn màu đánh dấu."
    ]
  },
  {
    id: "writer.trackChanges.displayModeHelp",
    app: "writer",
    commandIds: [
      "writer.trackChanges.displayMode",
      "writer.trackChanges.displaySimple",
      "writer.trackChanges.displayAll",
      "writer.trackChanges.displayNone",
      "writer.trackChanges.displayOriginal"
    ],
    title: "Chế độ hiển thị theo dõi thay đổi",
    summary: "Hộp chọn chế độ hiển thị bản sửa đổi trên thanh công cụ: Đánh dấu đơn giản (Simple Markup), Tất cả đánh dấu (All Markup), Không đánh dấu (No Markup) và Bản gốc (Original).",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Theo dõi thay đổi" },
    keywords: ["chế độ hiển thị", "theo dõi thay đổi", "simple markup", "all markup", "no markup", "original", "đánh dấu đơn giản", "tất cả đánh dấu", "không đánh dấu", "bản gốc", "vạch đỏ lề"],
    steps: [
      "Mở tab Xem lại (hoặc Đánh giá), nhóm Theo dõi thay đổi.",
      "Nhấp vào hộp chọn Chế độ hiển thị thay đổi để chọn 1 trong 4 chế độ: Đánh dấu đơn giản, Tất cả đánh dấu, Không đánh dấu hoặc Bản gốc.",
      "Chế độ Đánh dấu đơn giản (Simple Markup): Ẩn các đoạn chữ bị xóa và hiển thị chữ mới như bình thường, đồng thời vẽ đường vạch dọc màu đỏ ở lề bên trái của từng đoạn văn có sửa đổi. Nhấp chuột vào vạch đỏ ở lề để chuyển đổi nhanh giữa Đánh dấu đơn giản và Tất cả đánh dấu.",
      "Chế độ Tất cả đánh dấu (All Markup): Hiển thị chi tiết toàn bộ các thao tác thêm mới bằng chữ gạch chân màu xanh và các thao tác xóa bằng chữ gạch ngang màu đỏ.",
      "Chế độ Không đánh dấu (No Markup): Hiển thị diện mạo cuối cùng của tài liệu khi đã áp dụng đầy đủ mọi thay đổi mà không còn vạch đỏ hay dấu gạch màu.",
      "Chế độ Bản gốc (Original): Hiển thị nội dung ban đầu của tài liệu trước khi có bất kỳ thao tác chỉnh sửa nào."
    ]
  },
  {
    id: "writer.file.inspectDocumentHelp",
    app: "writer",
    commandIds: ["writer.file.inspectDocument"],
    title: "Kiểm tra tài liệu (Document Inspector)",
    summary: "Quét và loại bỏ nhận xét, bản sửa đổi theo dõi, văn bản ẩn và thông tin cá nhân hoặc thuộc tính tài liệu trước khi chia sẻ.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Kiểm tra tài liệu" },
    keywords: ["kiểm tra tài liệu", "document inspector", "xóa nhận xét", "xóa bản sửa đổi", "xóa văn bản ẩn", "thông tin cá nhân", "bảo vệ tài liệu", "thuộc tính tài liệu"],
    steps: [
      "Mở tab Xem lại (hoặc Đánh giá), nhóm Kiểm tra tài liệu, nhấn nút Kiểm tra tài liệu để mở hộp thoại.",
      "Trong hộp thoại Kiểm tra tài liệu, đánh dấu các nhóm nội dung cần rà soát: Nhận xét và chú thích, Theo dõi thay đổi và bản sửa đổi, Văn bản ẩn, Thuộc tính tài liệu và thông tin cá nhân.",
      "Nhấn nút Kiểm tra để bắt đầu quét toàn bộ nội dung tài liệu. Hộp thoại sẽ chuyển sang giao diện kết quả hiển thị tình trạng từng nhóm kèm biểu tượng cảnh báo nếu phát hiện dữ liệu nhạy cảm.",
      "Đối với mỗi nhóm tìm thấy dữ liệu, bạn có thể nhấn nút Xóa tất cả tương ứng để loại bỏ độc lập nhóm đó (ví dụ: chỉ xóa nhận xét hoặc chỉ chấp nhận toàn bộ thay đổi theo dõi).",
      "Nhấn Kiểm tra lại để quét lại tài liệu và xác nhận toàn bộ các nhóm đã ở trạng thái an toàn trước khi gửi hoặc lưu tệp."
    ]
  },
  {
    id: "writer.reference.citations",
    app: "writer",
    commandIds: [
      "writer.reference.citationStyle",
      "writer.reference.sourcesManage",
      "writer.reference.citationInsert",
      "writer.reference.bibliographyInsert"
    ],
    title: "Trích dẫn và thư mục tài liệu",
    summary: "Quản lý nguồn (sách, bài báo, website), chèn trích dẫn trong văn bản theo APA hoặc MLA, rồi dựng thư mục tài liệu tự động từ các nguồn đã dùng.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Trích dẫn & Thư mục tài liệu" },
    keywords: ["trích dẫn", "thư mục", "bibliography", "citation", "APA", "MLA", "nguồn"],
    steps: [
      "Mở tab Tham chiếu, nhóm Trích dẫn & Thư mục tài liệu.",
      "Chọn kiểu APA hoặc MLA trên hộp Kiểu trích dẫn.",
      "Nhấn Quản lý nguồn để thêm nguồn mới (tác giả, tiêu đề, năm, nhà xuất bản, URL), sửa hoặc xóa, rồi Áp dụng.",
      "Đặt con trỏ tại chỗ cần chú thích, nhấn Chèn trích dẫn, chọn nguồn rồi Chèn. Nếu chưa có nguồn, dùng Thêm nguồn mới ngay trong hộp thoại.",
      "Đặt con trỏ ở cuối tài liệu (hoặc vị trí muốn in danh mục), nhấn Thư mục tài liệu để chèn danh sách đã định dạng.",
      "Thư mục chỉ được tạo khi tài liệu có ít nhất một trích dẫn. Nếu chưa có, dùng Quản lý nguồn để thêm nguồn, chèn trích dẫn vào văn bản rồi thử lại; ứng dụng sẽ báo rõ khi chưa đủ nguồn thay vì chèn danh mục rỗng."
    ]
  },
  {
    id: "writer.reference.captions",
    app: "writer",
    commandIds: [
      "writer.reference.captionInsert",
      "writer.reference.tofInsert",
      "writer.reference.tofUpdate"
    ],
    title: "Chú thích ảnh và danh mục hình",
    summary: "Gắn chú thích tự đánh số cho hình ảnh, bảng hoặc phương trình, rồi chèn / cập nhật danh mục hình ảnh từ các chú thích đó. Nhóm này cũng bao gồm lệnh Tham chiếu chéo.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Chú thích ảnh" },
    keywords: ["chú thích ảnh", "caption", "danh mục hình", "table of figures", "hình", "bảng", "tham chiếu chéo", "cross reference"],
    steps: [
      "Chọn hình ảnh, bảng hoặc phương trình trong trang soạn thảo.",
      "Mở tab Tham chiếu, nhóm Chú thích ảnh, nhấn Chèn chú thích ảnh.",
      "Chọn nhãn (Hình / Bảng / Phương trình), vị trí (dưới hoặc trên đối tượng), nhập nội dung chú thích rồi nhấn Chèn. Số thứ tự được gán tự động.",
      "Đặt con trỏ nơi muốn hiện danh mục, nhấn Danh mục hình ảnh, chọn loại rồi chèn.",
      "Khi thêm hoặc sửa chú thích, nhấn Cập nhật danh mục để làm mới số thứ tự và dòng trong danh mục.",
      "Để tạo liên kết nội bộ tới một tiêu đề hoặc đánh dấu trong văn bản, nhấn nút Tham chiếu chéo ngay bên dưới nút Cập nhật danh mục."
    ]
  },
  {
    id: "writer.mailings.envelopes",
    app: "writer",
    commandIds: ["writer.mailings.envelopes"],
    title: "Phong bì",
    summary: "Thêm một trang phong bì riêng vào tài liệu: địa chỉ người nhận ở giữa-dưới, địa chỉ người gửi góc trên-trái, khổ giấy đúng kích thước phong bì (DL, C5 hoặc Number 10).",
    ribbon: { tab: "Trộn thư", tabId: "mailings", group: "Tạo" },
    keywords: ["phong bì", "envelope", "địa chỉ", "người nhận", "người gửi", "mailings", "trộn thư"],
    steps: [
      "Mở tab Trộn thư, nhóm Tạo, nhấn Phong bì.",
      "Trong hộp thoại Phong bì, gõ Địa chỉ người nhận (nhiều dòng được). Địa chỉ người gửi có thể để trống hoặc chọn Ẩn địa chỉ người gửi.",
      "Chọn khổ: DL 220×110 mm, C5 229×162 mm, hoặc Number 10 / Danh thiếp 241,3×104,8 mm. Chọn thêm vào Đầu tài liệu hoặc Cuối tài liệu.",
      "Nếu đã dán nguồn Trộn thư (nhóm Bắt đầu trộn), có thể bật Dùng nguồn Trộn thư hiện có để tạo một trang phong bì cho mỗi bản ghi — địa chỉ người nhận lấy từ các cột CSV.",
      "Nhấn Thêm vào tài liệu. Trang phong bì là mục riêng: vùng soạn thảo đổi khổ giấy theo phong bì. Ctrl+Z hoàn tác, Ctrl+Y làm lại. Xuất DOCX/PDF vẫn dùng một khổ giấy chung (giới hạn hiện tại khi lưu, giống Ngắt mục)."
    ]
  },
  {
    id: "writer.mailings.labels",
    app: "writer",
    commandIds: ["writer.mailings.labels"],
    title: "Nhãn",
    summary: "Tạo tờ nhãn khổ A4 theo lưới Avery (3×7 ô 63,5×38,1 mm hoặc 3×8 ô ~66×34 mm). Cùng một nội dung cho mọi ô, hoặc mỗi ô một bản ghi từ nguồn Trộn thư.",
    ribbon: { tab: "Trộn thư", tabId: "mailings", group: "Tạo" },
    keywords: ["nhãn", "labels", "avery", "lưới", "địa chỉ", "trộn thư", "mail merge"],
    steps: [
      "Mở tab Trộn thư, nhóm Tạo, nhấn Nhãn.",
      "Gõ Nội dung nhãn (nhiều dòng). Chọn kiểu lưới: Avery L7160 (3 cột × 7 hàng, 63,5×38,1 mm) hoặc 3 cột × 8 hàng trên A4.",
      "Nhấn Tạo trang nhãn mới. Mọi ô trên tờ có cùng nội dung. Trang nhãn được chèn sau nội dung hiện tại (ngắt trang/ngắt mục).",
      "Để in hàng loạt: trước hết dán CSV ở Nguồn dữ liệu (cùng tab Trộn thư), rồi trong hộp thoại Nhãn bật Điền hàng loạt từ nguồn Trộn thư. Mỗi ô nhận một bản ghi khác nhau; dư bản ghi thì sang tờ mới.",
      "Ctrl+Z hoàn tác, Ctrl+Y làm lại. Tờ nhãn dùng khổ A4 nên xuất in/PDF giữ đúng lưới trên vùng soạn thảo."
    ]
  },
  {
    id: "writer.mailMerge",
    app: "writer",
    commandIds: [
      "writer.mailMerge.open",
      "writer.mailMerge.insertField",
      "writer.mailMerge.ifRule",
      "writer.mailMerge.preview",
      "writer.mailMerge.prevRecord",
      "writer.mailMerge.nextRecord",
      "writer.mailMerge.finish"
    ],
    title: "Trộn thư và Danh sách người nhận từ bảng tính",
    summary: "Lấy danh sách người nhận từ tệp bảng tính .xlsx (.xlsx, .xls, .ods) hoặc CSV/TSV, hỗ trợ chọn trang tính, dòng đầu là tên trường, xem trước từng bản ghi, lọc/bỏ chọn người nhận, chèn trường trộn vào văn bản và hoàn tất ra tài liệu mới hoặc in ấn.",
    ribbon: { tab: "Trộn thư", tabId: "mailings", group: "Bắt đầu trộn" },
    keywords: ["trộn thư", "mail merge", "bảng tính", "xlsx", "xls", "csv", "tsv", "trường", "người nhận", "bản ghi", "nguồn dữ liệu", "chèn trường", "xem trước kết quả", "hoàn tất trộn", "in ấn", "lọc người nhận"],
    steps: [
      "Mở tab Trộn thư, nhóm Bắt đầu trộn, nhấn Nguồn dữ liệu. Trong hộp thoại, nhấn 'Chọn tệp bảng tính .xlsx / CSV...' để mở tệp bảng tính (.xlsx, .xls, .ods, .csv, .tsv) hoặc dán dữ liệu thủ công.",
      "Nếu tệp bảng tính .xlsx có nhiều trang tính, chọn trang tính mong muốn tại mục 'Trang tính'. Đánh dấu tùy chọn 'Dòng đầu tiên là tên trường' nếu hàng đầu của bảng chứa tiêu đề cột.",
      "Xem trước danh sách người nhận trong bảng. Có thể nhập từ khóa vào ô tìm kiếm để lọc, và bỏ dấu tích ở các dòng không muốn gửi để loại trừ người nhận đó khỏi danh sách.",
      "Nhấn 'Lưu nguồn dữ liệu' để áp dụng danh sách người nhận vào tài liệu.",
      "Đặt con trỏ tại vị trí muốn đưa thông tin người nhận vào văn bản, mở nhóm Viết & Chèn trường, nhấn Chèn trường và chọn trường dữ liệu tương ứng (ví dụ: Họ tên, Lương thưởng, Ngày ký).",
      "Để chèn nội dung có điều kiện, đặt con trỏ trong văn bản, mở tab Trộn thư > nhóm Viết & Chèn trường > Quy tắc. Chọn trường, toán tử, giá trị so sánh và nhập nội dung cho Thì/Nếu không; quy tắc sẽ được đánh giá theo từng người nhận khi xem trước hoặc hoàn tất trộn.",
      "Nhấn Xem trước kết quả (nhóm Xem trước kết quả) để bật chế độ xem trước văn bản sau khi ghép dữ liệu của từng bản ghi. Dùng nút Bản ghi trước hoặc Bản ghi sau để duyệt qua từng người nhận được chọn.",
      "Mở nhóm Hoàn tất, nhấn Hoàn tất trộn để chọn hình thức xuất: 'Tạo tài liệu mới' (hợp nhất toàn bộ bản ghi nối tiếp nhau bằng ngắt trang) hoặc 'In tài liệu trực tiếp'."
    ]
  },
  {
    id: "writer.reference.toc",
    app: "writer",
    commandIds: ["writer.reference.tocInsert", "writer.reference.tocUpdate"],
    title: "Mục lục tự động",
    summary: "Dựng mục lục từ các đoạn đã gán kiểu Heading 1, Heading 2, Heading 3. Khi lưu DOCX, tiêu đề và mục lục vẫn là cấu trúc có thể cập nhật, không bị đổi thành văn bản tĩnh.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Mục lục" },
    keywords: ["mục lục", "table of contents", "toc", "tiêu đề", "heading"],
    steps: [
      "Gán kiểu tiêu đề cho các đề mục: trên tab Trang đầu, nhóm Kiểu dáng, chọn Heading 1 / Heading 2 / Heading 3 (hoặc Thư viện kiểu).",
      "Đặt con trỏ ở đầu tài liệu (hoặc chỗ muốn hiện mục lục).",
      "Mở tab Tham chiếu, nhóm Mục lục, nhấn Mục lục tự động.",
      "Sau khi thêm hoặc đổi tiêu đề, nhấn Cập nhật mục lục để làm mới số trang và dòng đề mục.",
      "Nhấp một dòng trong mục lục để nhảy tới tiêu đề tương ứng trong tài liệu.",
      "Khi lưu thành DOCX và mở bằng phần mềm văn phòng tương thích, dùng Cập nhật bảng để tính lại mục lục; các Heading vẫn xuất hiện trong Ngăn Dẫn hướng."
    ]
  },
  {
    id: "writer.insert.wordart",
    app: "writer",
    commandIds: ["writer.insert.wordart"],
    title: "Chữ nghệ thuật",
    summary: "Chèn một đối tượng chữ trang trí có viền, đổ bóng hoặc màu tô ngay tại vị trí con trỏ trong đoạn văn. Đối tượng nằm trong dòng như ký tự, không phải khung kéo thả đè lên trang.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chữ nghệ thuật", "wordart", "word art", "tiêu đề", "gradient", "viền", "đổ bóng"],
    steps: [
      "Đặt con trỏ vào đoạn văn, chỗ muốn chèn chữ nghệ thuật.",
      "Mở tab Chèn, nhóm Văn bản, nhấn nút lớn Chữ nghệ thuật (cạnh Hộp văn bản).",
      "Hộp thoại Chèn chữ nghệ thuật: gõ nội dung (mặc định «3T Office», tối đa 80 ký tự) rồi chọn một mẫu trong lưới (ví dụ Xanh đậm viền trắng, Gradient đại dương, Viền đậm trắng).",
      "Nhấn Chèn. Khối chữ xuất hiện ngay tại con trỏ. Nhấp một lần để chọn (viền xanh); nhấp đúp để sửa chữ; Delete hoặc Backspace khi đang chọn sẽ xóa cả khối. Ctrl+Z hoàn tác, Ctrl+Y làm lại.",
      "Khi lưu DOCX, chữ nghệ thuật được lưu thành đối tượng hiệu ứng chữ có thể chọn và sửa tiếp trong tài liệu.",
      "Cùng nhóm Văn bản còn Hộp văn bản (khung kéo-thả độc lập), Chữ đầu đoạn và Ngày & Giờ."
    ]
  },
  {
    id: "writer.review.commentNavigation", app: "writer",
    commandIds: ["writer.review.commentPrevious", "writer.review.commentNext", "writer.review.commentDelete", "writer.review.commentResolve", "writer.review.commentReply"],
    title: "Duyệt, trả lời và xử lý nhận xét",
    summary: "Duyệt nhận xét, trả lời trong cùng luồng, đánh dấu đã xử lý, mở lại hoặc xóa nhận xét. Câu trả lời được lưu trong DOCX dưới dạng reply thuộc nhận xét gốc.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Ghi chú" },
    keywords: ["nhận xét", "ghi chú", "trả lời", "reply", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Đánh giá, nhóm Ghi chú. Nhấp vào thẻ nhận xét trong bảng bên cạnh trang hoặc dùng Nhận xét trước/Nhận xét sau để chọn nhận xét.", "Chọn nhận xét đang mở, nhấn Trả lời nhận xét, nhập nội dung rồi chọn Gửi trả lời. Reply xuất hiện lùi vào dưới nhận xét gốc.", "Nhấn Đã xử lý để đánh dấu hoàn tất; nhấn lại để mở lại. Trạng thái được lưu trong DOCX.", "Nhấn Xóa nhận xét để xóa nhận xét đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại thay đổi."]
  },
  {
    id: "writer.text.basicFormat",
    app: "writer",
    commandIds: [
      "writer.font.family",
      "writer.font.size",
      "writer.font.grow",
      "writer.font.shrink",
      "writer.font.grow1pt",
      "writer.font.shrink1pt",
      "writer.text.bold",
      "writer.text.italic",
      "writer.text.underline",
      "writer.text.strike",
      "writer.text.subscript",
      "writer.text.superscript",
      "writer.text.clearFormat",
      "writer.color.text",
      "writer.color.highlight"
    ],
    title: "Định dạng chữ cơ bản",
    summary: "Đổi phông, cỡ chữ, đậm/nghiêng/gạch, chỉ số trên/dưới, màu chữ và màu nền chữ cho vùng đang bôi. Xóa định dạng trả chữ về kiểu mặc định mà không xóa nội dung.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["đậm", "nghiêng", "gạch chân", "gạch ngang", "phông chữ", "cỡ chữ", "màu chữ", "tô vàng", "chỉ số", "xóa định dạng", "bold", "italic", "font", "highlight", "ctrl+b", "ctrl+]", "ctrl+["],
    steps: [
      "Bôi chữ cần đổi (hoặc đặt con trỏ trong từ). Mở tab Trang đầu, nhóm Phông chữ — hàng trên là hộp Phông chữ và Cỡ chữ, hàng dưới là các nút kiểu chữ.",
      "Phông chữ: Times New Roman (mặc định), Be Vietnam Pro, Arial, Calibri, Roboto. Dùng phím tắt Ctrl+Shift+F để chuyển tiêu điểm vào hộp chọn Phông chữ bằng bàn phím, dùng phím Mũi tên Lên/Xuống để duyệt danh sách phông và nhấn Enter để áp dụng. Cỡ chữ: danh sách đủ từ 8 pt đến 72 pt (8, 9, 10, 10,5, 11, 12, 13, 13,5, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72); 14 pt (NĐ 30) là cỡ mặc định văn bản hành chính. Hai hộp này tự hiện phông và cỡ của chữ dưới con trỏ. Nút Tăng cỡ chữ (Ctrl+Shift+>) / Giảm cỡ chữ (Ctrl+Shift+<) nhảy nhanh theo các nấc đó. Dùng phím tắt Ctrl+] để tăng cỡ chữ 1 điểm (1 pt) và Ctrl+[ để giảm cỡ chữ 1 điểm (1 pt) từng bước chuẩn phần mềm soạn thảo văn bản khác.",
      "Đậm Ctrl+B, Nghiêng Ctrl+I, Gạch chân Ctrl+U, Gạch ngang (không có phím tắt). Chỉ số dưới Ctrl+= (ví dụ H₂O), Chỉ số trên Ctrl+Shift++ (ví dụ m²). Nhấn lại cùng nút để tắt.",
      "Màu chữ đổi vùng chọn sang đỏ (#dc2626). Màu nền chữ tô vàng (#ffcd00) giống bút highlight. Xóa định dạng (Ctrl+Space) bỏ kiểu trên chữ đã bôi mà vẫn giữ nội dung; nếu chỉ đặt con trỏ, lệnh cũng đưa kiểu đậm/nghiêng/gạch chân và màu đang chờ gõ về mặc định. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.para.alignAndList",
    app: "writer",
    commandIds: [
      "writer.para.alignLeft",
      "writer.para.alignCenter",
      "writer.para.alignRight",
      "writer.para.justify",
      "writer.para.spacing1",
      "writer.para.spacing15",
      "writer.para.spacing2",
      "writer.list.bullet",
      "writer.list.numbered",
      "writer.para.indentInc",
      "writer.para.indentDec"
    ],
    title: "Căn lề, danh sách và giãn dòng",
    summary: "Căn trái/giữa/phải/đều cho đoạn đang chọn, tạo danh sách dấu chấm hoặc đánh số, tăng/giảm thụt lề, và chọn giãn dòng 1.0 / 1.5 / 2.0 từ menu Giãn dòng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["căn lề", "căn giữa", "căn đều", "danh sách", "đầu dòng", "đánh số", "thụt lề", "giãn dòng", "align", "bullet", "numbered", "indent", "line spacing"],
    steps: [
      "Đặt con trỏ trong đoạn (hoặc bôi nhiều đoạn). Tab Trang đầu, nhóm Đoạn văn — hàng trên là danh sách và thụt lề, hàng dưới là căn lề và Giãn dòng.",
      "Căn trái Ctrl+L, Căn giữa Ctrl+E, Căn phải Ctrl+R, Căn đều hai bên Ctrl+J. Căn đều dãn khoảng trắng để mép trái và phải thẳng — dùng cho văn bản hành chính.",
      "Dấu đầu dòng tạo danh sách chấm tròn; Đánh số tạo 1. 2. 3. Nhấn lại nút để bỏ danh sách. Thụt lề Ctrl+M tăng khoảng cách từ lề trái; Giảm thụt lề Ctrl+Shift+M.",
      "Mở menu Giãn dòng (biểu tượng khoảng cách dòng) rồi chọn Giãn dòng 1.0 (Ctrl+1), 1.5 (Ctrl+5) hoặc 2.0 (Ctrl+2). Cùng nhóm còn Sắp xếp đoạn, Hiện dấu định dạng, tô nền đoạn và viền đoạn — xem khi cần, không nằm trong bài này."
    ]
  },
  {
    id: "writer.para.multilevelList",
    app: "writer",
    commandIds: ["writer.para.multilevelList", "writer.para.indentInc", "writer.para.indentDec"],
    title: "Danh sách đa cấp",
    summary: "Đánh số nhiều cấp giống các phần mềm soạn thảo văn bản khác: 1. / 1.1. / 1.1.1., 1. / a. / i., hoặc Điều / Khoản / Điểm theo văn bản hành chính (NĐ 30/2020/NĐ-CP). Khác nút Đánh số — Đánh số chỉ ra 1. 2. 3. một cấp.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["danh sách đa cấp", "multilevel list", "1.1.1", "điều khoản điểm", "nghị định 30", "outline numbering", "tab", "thụt cấp"],
    steps: [
      "Đặt con trỏ trong đoạn (hoặc bôi vài đoạn). Tab Trang đầu, nhóm Đoạn văn, hàng trên: sau Dấu đầu dòng và Đánh số là nút Danh sách đa cấp (biểu tượng 1. / 1.1 / a.). Nhấn mũi tên để mở gallery.",
      "Chọn một kiểu: 1. / 1.1. / 1.1.1. (đề mục pháp lý, mục lục); 1. / a. / i. (kiểu soạn thảo cổ điển); Điều 1. / 1. / a) (Điều — Khoản — Điểm, văn bản hành chính Việt Nam). Các đoạn đang chọn thành một danh sách cùng kiểu.",
      "Tăng cấp: đặt con trỏ trong mục danh sách rồi nhấn Thụt lề (Ctrl+M). Mục đó thành cấp con của mục ngay trên — ví dụ 2. thành 1.1. Giảm cấp: nhấn Giảm thụt lề (Ctrl+Shift+M). Ở cấp 1, thao tác này đưa mục về đoạn thường. Lưu ý: giảm cấp không phải phím Shift+Tab như các phần mềm soạn thảo văn bản khác.",
      "Phiên bản này hỗ trợ tối đa 3 cấp. Tab khi đang ở cấp 3 không lồng thêm. Nút Đánh số / Dấu đầu dòng vẫn tạo list một cấp như trước; chọn lại một kiểu trong gallery để đổi cả cây danh sách đang chọn."
    ]
  },
  {
    id: "writer.para.alignmentSpacing",
    app: "writer",
    commandIds: [
      "writer.para.alignLeft",
      "writer.para.alignCenter",
      "writer.para.alignRight",
      "writer.para.justify",
      "writer.para.spacing1",
      "writer.para.spacing15",
      "writer.para.spacing2",
      "writer.para.lineSpacing"
    ],
    title: "Căn lề đoạn văn và khoảng cách dòng",
    summary: "Căn lề văn bản (trái, giữa, phải, đều hai bên) và chọn khoảng cách giữa các dòng (1.0, 1.15, 1.5, 2.0 hoặc nhập chiều cao chính xác bằng pt). Các điều khiển bố trí trực tiếp trên ribbon Trang đầu và Bố cục giúp thao tác nhanh và an toàn tuyệt đối cho tài liệu.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["căn lề", "căn đoạn", "căn trái", "căn giữa", "căn phải", "căn đều", "giãn dòng", "line spacing", "paragraph alignment"],
    steps: [
      "Bôi đen một hoặc nhiều đoạn văn bản cần định dạng, hoặc đặt con trỏ chuột bên trong đoạn văn đó.",
      "Tại tab Trang đầu, nhóm Đoạn văn: nhấn Căn trái (Ctrl+L), Căn giữa (Ctrl+E), Căn phải (Ctrl+R), hoặc Căn đều (Ctrl+J) để đổi lề đoạn văn ngay tức thì.",
      "Nhấp Giãn dòng để chọn các tỷ lệ dòng chuẩn: 1.0, 1.15, 1.5 (chuẩn NĐ 30/2020), 2.0 hoặc chọn Chính xác… để nhập chiều cao dòng tính bằng pt. Menu có trên tab Trang đầu và tab Bố cục.",
      "Chọn Chính xác… rồi nhập số lớn hơn 0, chẳng hạn 18 pt. Nhấn Ctrl+S để lưu cách căn lề và giãn dòng cùng tài liệu; Ctrl+Z hoàn tác thao tác vừa thực hiện."
    ]
  },
  {
    id: "writer.para.firstLineIndent",
    app: "writer",
    commandIds: ["writer.para.firstLineIndent"],
    title: "Thụt đầu dòng đoạn văn",
    summary: "Đặt dòng đầu tiên của đoạn văn lùi vào so với các dòng còn lại.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Đoạn văn" },
    keywords: ["thụt đầu dòng", "first line indent", "đầu đoạn", "thụt lề"],
    steps: [
      "Đặt con trỏ trong đoạn văn cần chỉnh hoặc chọn nhiều đoạn.",
      "Mở tab Bố cục, nhóm Đoạn văn, hộp Thụt đầu dòng.",
      "Chọn Không, 0,5 cm hoặc 1,27 cm. Dòng đầu tiên được thụt vào; các dòng tiếp theo giữ nguyên lề trái.",
      "Chọn lại một giá trị khác để đổi hoặc chọn Không để xóa; Ctrl+Z hoàn tác thao tác."
    ]
  },
  {
    id: "writer.para.spacingBeforeAfter",
    app: "writer",
    commandIds: ["writer.para.spacingBefore", "writer.para.spacingAfter"],
    title: "Khoảng cách trước và sau đoạn văn",
    summary: "Đặt khoảng trống phía trước và phía sau mỗi đoạn, tính bằng point (pt). Khác giãn dòng 1.0/1.5/2.0 — giãn dòng là khoảng cách giữa các dòng trong một đoạn; khoảng trước/sau là lề dọc giữa các đoạn, ảnh hưởng in ấn.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Đoạn văn" },
    keywords: ["khoảng trước đoạn", "khoảng sau đoạn", "spacing before", "spacing after", "giãn đoạn", "paragraph spacing", "pt", "point"],
    steps: [
      "Đặt con trỏ trong đoạn cần chỉnh (hoặc bôi nhiều đoạn). Mở tab Bố cục, nhóm Đoạn văn — bên cạnh nút thụt lề và menu Giãn dòng có hai hộp chọn «Trước: … pt» và «Sau: … pt».",
      "Hộp Trước đặt margin phía trên đoạn; hộp Sau đặt margin phía dưới đoạn. Năm nấc: 0 pt, 6 pt, 8 pt, 12 pt, 18 pt. 0 pt khít đoạn kề; 6 pt khớp khoảng mặc định đang thấy trên trang soạn thảo; 8 pt giống kiểu Normal của phần mềm soạn thảo văn bản khác; 12/18 pt dùng khi cần tách đoạn rõ hơn trước khi in.",
      "Chọn một nấc — khoảng cách áp ngay lên đoạn đang chọn trên vùng soạn thảo. Muốn vừa trước vừa sau thì chọn lần lượt hai hộp. Không nhầm với menu Giãn dòng 1.0/1.5/2.0 trên cùng nhóm (và trên tab Trang đầu): menu đó đổi chiều cao dòng, không đổi khoảng giữa các đoạn.",
      "Lưu tài liệu để khoảng trước/sau đi theo file (DOCX). Ctrl+Z hoàn tác lần chọn vừa rồi."
    ]
  },
  {
    id: "writer.table.insert",
    app: "writer",
    commandIds: ["writer.table.insert"],
    title: "Chèn bảng",
    summary: "Chèn ngay một bảng trống 3 hàng × 4 cột tại vị trí con trỏ, có viền xám và rộng bằng trang. Hàng đầu là hàng đầu tiên của bảng; các ô không có chữ mẫu.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng biểu" },
    keywords: ["bảng", "table", "chèn bảng", "hàng", "cột", "ô bảng", "tiêu đề"],
    steps: [
      "Đặt con trỏ vào đoạn văn, chỗ muốn đặt bảng. Mở tab Chèn, nhóm Bảng biểu, nhấn nút lớn Bảng biểu.",
      "Doc chèn ngay bảng trống 3 hàng × 4 cột (không mở hộp thoại chọn kích thước). Hàng đầu là hàng đầu tiên của bảng để bạn nhập tiêu đề; các ô đều không có chữ mẫu, nên nội dung gõ vào không bị dính với chữ có sẵn. Viền 1px xám, đệm 6–10 pt, rộng 100% trang.",
      "Nhấp vào ô cần điền rồi gõ nội dung. Nhấn Tab để chuyển tới ô tiếp theo. Nhấn Ctrl+Z nếu cần hoàn tác việc chèn bảng.",
      "Cùng tab Chèn, nhóm Minh họa có Hình ảnh nếu cần đặt ảnh cạnh bảng."
    ]
  },
  {
    id: "writer.image.insert",
    app: "writer",
    commandIds: ["writer.image.insert"],
    title: "Chèn hình ảnh",
    summary: "Mở hộp chọn tệp ảnh trên máy (mọi kiểu image/*), rồi chèn ảnh vào vị trí con trỏ, co theo chiều rộng trang, giữ tỉ lệ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["hình ảnh", "ảnh", "chèn ảnh", "image", "picture", "minh họa", "jpg", "png"],
    steps: [
      "Đặt con trỏ tại chỗ cần ảnh. Tab Chèn, nhóm Minh họa, nhấn nút lớn Hình ảnh (cạnh Hình khối, Sơ đồ, Biểu đồ).",
      "Hộp chọn tệp của hệ thống hiện ra, lọc sẵn các file ảnh. Chọn một file rồi Mở. Ảnh được nhúng dạng data URL, rộng tối đa 100% trang, chiều cao tự giữ tỉ lệ, có đổ bóng nhẹ.",
      "Khi mở DOCX có ảnh neo hoặc hộp văn bản nổi, Doc giữ vị trí và kiểu bọc chữ từ tệp gốc. Các khung nhập hiện chưa hỗ trợ kéo để đổi vị trí; hãy chỉnh vị trí trong ứng dụng nguồn nếu cần.",
      "Nhấp ảnh để chọn (có tabindex). Delete khi đang chọn sẽ xóa ảnh. Ctrl+Z hoàn tác lần chèn.",
      "Muốn chú thích và đánh số hình: sau khi chèn, dùng tab Tham chiếu → nhóm Chú thích ảnh (bài «Chú thích ảnh và danh mục hình»)."
    ]
  },
  {
    id: "writer.headerFooter",
    app: "writer",
    commandIds: ["writer.header.insert", "writer.footer.insert"],
    title: "Đầu trang và chân trang",
    summary: "Nhảy vào vùng đầu trang hoặc chân trang của bố cục in để gõ tiêu đề, số trang. Nếu vùng còn trống, Writer điền sẵn «Tiêu đề đầu trang» hoặc «Trang 1 / 1» căn giữa cỡ 10 pt; số trang là trường PAGE / NUMPAGES và tự cập nhật theo từng trang.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Đầu trang / Chân trang" },
    keywords: ["đầu trang", "chân trang", "header", "footer", "số trang", "tiêu đề trang"],
    steps: [
      "Mở tab Chèn, nhóm Đầu trang / Chân trang. Nhấn Đầu trang hoặc Chân trang (hai nút lớn).",
      "Con trỏ nhảy vào vùng tương ứng trên trang giấy (chỉ thấy rõ ở Bố trí in). Nếu vùng trống, Writer chèn sẵn một dòng căn giữa 10 pt: «Tiêu đề đầu trang» hoặc «Trang 1 / 1». Hai số trong chân trang là trường sống, tự đổi theo trang hiện tại và tổng số trang; có thể gõ thêm nhãn như «Trang».",
      "Đầu trang / chân trang lặp trên mọi trang khi xem Bố trí in, Print Preview và khi in; số trang hiển thị theo từng tờ. Chế độ Bố trí Web ẩn hai vùng này.",
      "Nhấp lại thân tài liệu để thoát vùng đầu/chân trang. Ctrl+Z hoàn tác lần chèn chữ mẫu nếu vùng vốn trống. Nhấn Ctrl+S để lưu DOCX: đầu/chân trang, trường PAGE / NUMPAGES và thiết lập Trang đầu khác biệt được giữ khi mở lại trong ứng dụng đọc DOCX khác."
    ]
  },
  {
    id: "writer.insert.textObjects",
    app: "writer",
    commandIds: ["writer.insert.textbox", "writer.insert.dateTime"],
    title: "Hộp văn bản và Ngày & Giờ",
    summary: "Hộp văn bản là khung chữ độc lập, kéo-thả và đổi kích thước được, nằm đè lên trang — khác phần mềm văn phòng khácArt (chữ trong dòng). Ngày & Giờ mở hộp chọn định dạng rồi chèn chuỗi ngày giờ hiện tại tại con trỏ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["hộp văn bản", "textbox", "khung chữ", "ngày giờ", "date time", "dd/mm/yyyy", "chèn ngày"],
    steps: [
      "Đặt con trỏ tại đoạn cần neo khung, rồi mở tab Chèn > nhóm Văn bản > Hộp văn bản. Khung viền xanh có kích thước khởi tạo chuẩn xuất hiện tại vị trí con trỏ; chữ mẫu «Nhập văn bản» được chọn sẵn, nên có thể gõ ngay để thay thế. Kéo khung để đặt lại hoặc kéo góc để đổi cỡ; kích thước sau lưu giữ nguyên.",
      "Ngày & Giờ (cột nhỏ, dưới Chữ đầu đoạn): hộp thoại liệt kê 5 mẫu với giá trị lúc bấm — dd/MM/yyyy, dd/MM/yyyy HH:mm, dạng dài «12 tháng 9 năm 2026», yyyy-MM-dd, HH:mm. Chọn mẫu rồi Chèn.",
      "Chuỗi ngày giờ nằm tại con trỏ dạng span, không tự cập nhật sau khi chèn. Esc hoặc Hủy đóng hộp thoại.",
      "Cùng nhóm còn Chữ nghệ thuật (bài riêng) và Chữ đầu đoạn. Ctrl+Z gỡ khung hoặc chuỗi vừa chèn."
    ]
  },
  {
    id: "writer.insert.symbol",
    app: "writer",
    commandIds: ["writer.insert.symbol"],
    title: "Chèn ký hiệu",
    summary: "Hộp chọn ký tự đặc biệt dùng chung: Thường dùng (© ® ™ ° ± § ₫ …), Toán học (× ÷ ≈ ≠ ≤ ≥ √ ∑ π) và Mũi tên. Chèn tại vị trí con trỏ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["ký hiệu", "ký tự đặc biệt", "symbol", "copyright", "đồng", "mũi tên", "toán học", "©", "₫"],
    steps: [
      "Đặt con trỏ chỗ cần ký tự. Tab Chèn, nhóm Ký hiệu, nhấn nút lớn Ký hiệu (cạnh Công thức).",
      "Hộp thoại chia 3 nhóm: Thường dùng (© ® ™ ° ± § ¶ • … – — € £ ¥ ₫), Toán học (× ÷ ≈ ≠ ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ π µ), Mũi tên (← → ↑ ↓ ↔ ⇒ ⇐ ⇔).",
      "Nhấp một ký tự để chèn ngay tại con trỏ rồi đóng hộp. Esc hoặc Đóng để hủy. Ctrl+Z xóa ký tự vừa chèn.",
      "Công thức cạnh đó là hộp chữ toán rút gọn (E = mc²…), không phải trình soạn phương trình đồ họa — khác với bộ ký tự này."
    ]
  },
  {
    id: "writer.view.layouts",
    app: "writer",
    commandIds: ["writer.view.printLayout", "writer.view.webLayout", "writer.view.readMode"],
    title: "Dạng xem trang: Bố trí in, Web và Đọc",
    summary: "Bố trí in hiện ranh giới giấy, đầu trang và chân trang. Bố trí Web chảy nội dung theo chiều rộng cửa sổ, ẩn ngắt trang. Chế độ đọc ẩn ribbon để đọc; Esc trở về Bố trí in.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem" },
    keywords: ["bố trí in", "bố trí web", "chế độ đọc", "print layout", "web layout", "read mode", "dạng xem", "trang giấy"],
    steps: [
      "Mở tab Chế độ xem, nhóm Dạng xem (ba nút lớn). Mặc định khi mở tài liệu là Bố trí in: thấy khổ giấy, lề, đầu trang, chân trang và đường ngắt trang.",
      "Bố trí Web: nội dung chảy liên tục 100% chiều rộng cửa sổ, ẩn ranh giới trang / ngắt trang / đầu-chân trang — tiện soạn trên màn hình hẹp, không đổi nội dung khi in.",
      "Chế độ đọc: ẩn thanh trên, ribbon và thanh trạng thái, mở rộng vùng chữ. Có thanh thoát tối giản. Nhấn Esc (hoặc nút thoát) để về Bố trí in.",
      "Ba chế độ chỉ đổi cách nhìn, không sửa chữ. Cùng tab còn nhóm Hiển thị (Thước kẻ, Đường lưới) và Thu phóng.",
      "Ở Bố trí in, góc trái thanh trạng thái hiển thị «Trang X / Y»: X tự đổi theo vị trí con trỏ, Y là tổng số trang sau khi phân trang. Nhấp vào nội dung ở trang khác để kiểm tra nhanh vị trí hiện tại."
    ]
  },
  {
    id: "writer.view.zoom",
    app: "writer",
    commandIds: ["writer.view.zoomIn", "writer.view.zoomOut", "writer.view.zoomReset", "writer.view.zoom100"],
    title: "Thu phóng tài liệu",
    summary: "Phóng to / thu nhỏ trang soạn thảo theo bước 10%, trong khoảng 50%–200%. Đặt lại và 100% đều đưa về tỉ lệ gốc. Chỉ đổi hiển thị, không đổi cỡ chữ khi in.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Thu phóng" },
    keywords: ["thu phóng", "phóng to", "thu nhỏ", "zoom", "100%", "đặt lại", "tỉ lệ"],
    steps: [
      "Tab Chế độ xem, nhóm Thu phóng. Phóng to (nút lớn) tăng 10%; Thu nhỏ giảm 10%. Giới hạn 50%–200%.",
      "Đặt lại và 100% đều đưa về tỉ lệ 1:1 (100%). Khác nhau chỉ là nhãn nút; cả hai không đổi nội dung.",
      "Cùng nhóm còn Vừa khổ trang (tính theo chiều rộng cửa sổ). Thanh trạng thái có thể hiện tỉ lệ đang dùng.",
      "Zoom dùng phóng CSS trên trang, không đổi cỡ chữ khi in hay khi xuất file."
    ]
  },
  {
    id: "writer.view.showAndWindow",
    app: "writer",
    commandIds: [
      "writer.view.ruler",
      "writer.view.gridlines",
      "writer.view.pageWidth",
      "writer.view.newWindow"
    ],
    title: "Thước ngang và thước dọc, đường lưới, vừa khổ trang và cửa sổ mới",
    summary: "Thước đo ngang và thước đo dọc mặc định bật, đánh dấu lề 30 mm trái / 15 mm phải, lề trên 20 mm / lề dưới 20 mm (NĐ 30/2020/NĐ-CP). Đường lưới 5 mm chỉ để căn, không in. Vừa khổ trang co 50%–200% theo chiều rộng cửa sổ. Cửa sổ mới mở thêm một tài liệu Writer độc lập.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["thước", "thước ngang", "thước dọc", "ruler", "vertical ruler", "đường lưới", "vừa khổ trang", "chiều rộng trang", "cửa sổ mới", "nđ 30", "lề 30mm"],
    steps: [
      "Mở tab Chế độ xem, tại nhóm Hiển thị: nhấp vào nút «Thước» để bật hoặc tắt đồng thời thước đo ngang và thước đo dọc của trang tài liệu.",
      "Thước ngang hiển thị trên đầu trang văn bản (đánh dấu lề trái 30 mm, lề phải 15 mm theo chuẩn hành chính). Thước dọc hiển thị dọc mép trái vùng soạn thảo (đánh dấu lề trên 20 mm, lề dưới 20 mm) và tự động đồng bộ vị trí khi cuộn trang hoặc thay đổi tỉ lệ thu phóng (zoom).",
      "Nút «Đường lưới» phủ lưới 18.8976 px (~5 mm) màu xanh nhạt giúp căn lề hình ảnh và bảng biểu; đường lưới chỉ hiển thị trên màn hình, không xuất hiện khi in ấn hoặc xuất tệp.",
      "Nhóm Thu phóng cung cấp tùy chọn «Chiều rộng trang» giúp tự động co giãn khổ giấy vừa khít chiều rộng cửa sổ (kẹp trong phạm vi 50%–200%). Nhóm Cửa sổ cung cấp nút «Cửa sổ mới» để mở một tài liệu Writer trắng, độc lập trong cửa sổ desktop mới."
    ]
  },
  {
    id: "writer.nav.documentBounds",
    app: "writer",
    commandIds: ["writer.nav.docStart", "writer.nav.docEnd"],
    title: "Nhảy tới đầu hoặc cuối tài liệu",
    summary: "Hai lệnh bàn phím, không có nút ribbon: Ctrl+Home đưa con trỏ về đầu thân tài liệu, Ctrl+End xuống cuối. Vùng đầu trang / chân trang không nằm trên đường đi này.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem" },
    keywords: ["đầu tài liệu", "cuối tài liệu", "ctrl+home", "ctrl+end", "điều hướng"],
    steps: [
      "Không có nút Đầu / Cuối tài liệu trên ribbon — dùng phím tắt.",
      "Ctrl+Home đặt con trỏ vào đầu nội dung thân (body) và cuộn vào tầm nhìn. Ctrl+End đặt con trỏ sau khối cuối cùng của thân.",
      "Đầu trang và chân trang không được lệnh này chọn. Muốn vào đó: tab Chèn → Đầu trang / Chân trang.",
      "Hai lệnh không sửa chữ, chỉ di chuyển con trỏ."
    ]
  },
  {
    id: "writer.style.galleryAndNormal",
    app: "writer",
    commandIds: ["writer.style.gallery", "writer.style.normal", "writer.style.apply", "writer.style.heading1", "writer.style.heading2", "writer.style.heading3"],
    title: "Thư viện kiểu và kiểu Thường",
    summary: "Tab Trang đầu > Kiểu dáng > Thư viện kiểu cung cấp Normal, Title, Subtitle, Heading 1–3, Quote, List Paragraph và Emphasis. Đoạn văn mới dùng các kiểu tiêu đề theo chuẩn kiểu dáng tài liệu; các kiểu dựng sẵn được lưu thành tên style tương ứng trong DOCX. Tài liệu DOCX mở sẵn giữ nguyên định dạng nguồn. Hỗ trợ Ctrl+Alt+1/2/3 cho Heading 1/2/3 và Ctrl+Shift+N để về Normal.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu dáng" },
    keywords: ["thư viện kiểu", "styles gallery", "tiêu đề", "normal", "tiêu đề 1", "tiêu đề 2", "tiêu đề 3", "heading", "ctrl+alt+1", "ctrl+alt+2", "ctrl+alt+3", "ctrl+shift+n", "trích dẫn", "nhấn mạnh"],
    steps: [
      "Mở tab Trang đầu, nhóm Kiểu dáng: nhấp nút lớn Thư viện kiểu (hoặc chọn nhanh từ dải thẻ Normal, Tiêu đề 1/2/3 hiển thị trực tiếp trên ribbon).",
      "Hộp thoại Thư viện Kiểu dáng mở ra với 7 kiểu định dạng. Tiêu đề 1/2/3 tạo cấp mục để điều hướng và lập mục lục; trong tài liệu mới, DOCX dùng cỡ 16/13/12 pt cùng phông và màu theme theo chuẩn kiểu dáng. Khi mở DOCX có sẵn, kiểu nguồn được giữ nguyên.",
      "Điều hướng bằng bàn phím: nhấn phím Tab để di chuyển xoay vòng giữa các thẻ kiểu dáng trong danh sách (giữ phím Shift khi nhấn Tab để di chuyển ngược lại); dùng các phím mũi tên Lên/Xuống/Trái/Phải để chuyển chọn thẻ; nhấn phím Enter để áp dụng ngay kiểu đang chọn; nhấn Esc hoặc nhấp ra ngoài để đóng hộp thoại mà không thay đổi.",
      "Phím tắt nhanh quen thuộc: nhấn Ctrl+Alt+1 để chuyển đoạn văn thành Tiêu đề 1 (Heading 1 / thẻ H1); nhấn Ctrl+Alt+2 cho Tiêu đề 2 (Heading 2 / thẻ H2); nhấn Ctrl+Alt+3 cho Tiêu đề 3 (Heading 3 / thẻ H3).",
      "Nhấn Ctrl+Shift+N (Kiểu Thường) để đưa đoạn văn bản đang đứng về kiểu Normal, gỡ bỏ nhanh lớp tiêu đề, trích dẫn hoặc nhấn mạnh mà không cần bôi đen toàn bộ đoạn.",
      "Bấm Ctrl+Z bất kỳ lúc nào để hoàn tác thao tác áp dụng kiểu dáng vừa thực hiện."
    ]
  },
  {
    id: "writer.design.themes",
    app: "writer",
    commandIds: ["writer.design.themeGallery"],
    title: "Chủ đề văn bản",
    summary: "Sáu bộ chủ đề đổi đồng loạt phông, màu tiêu đề và giãn dòng cho cả tài liệu. Mặc định Tiêu chuẩn (Office) — Times New Roman. Có bộ Hành chính Việt Nam (NĐ 30).",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Định dạng tài liệu" },
    keywords: ["chủ đề", "theme", "nđ 30", "hành chính", "office", "be vietnam pro", "georgia", "thiết kế", "design", "kiểu dáng", "style set", "document formatting"],
    steps: [
      "Tab Thiết kế, nhóm Định dạng tài liệu, nhấn nút lớn Chủ đề văn bản.",
      "Hộp «Thư viện Kiểu & Chủ đề tài liệu»: chọn bộ rồi Áp dụng kiểu. Sáu mẫu — Tiêu chuẩn (Office, Times New Roman), Hành chính Việt Nam (NĐ 30, TNR chữ đen), Hiện đại (Be Vietnam Pro), Trang nhã (Georgia), Tối giản (Arial), Sáng tạo Emerald (Calibri).",
      "Nhấn Áp dụng để đổi phông, màu và giãn dòng trên toàn bộ tài liệu. Tùy chọn này không có các biến thể chủ đề. Kiểm tra bố cục sau khi áp dụng; nhấn Ctrl+Z nếu muốn trở về cách trình bày trước đó.",
      "Esc / Hủy bỏ đóng không đổi. Ctrl+Z hoàn tác lần áp chủ đề."
    ]
  },
  {
    id: "writer.text.changeCaseHelp",
    app: "writer",
    commandIds: ["writer.text.changeCase", "writer.text.changeCaseDialog"],
    title: "Đổi chữ hoa / thường",
    summary: "Hộp thoại đổi chữ hoa/thường (Sentence case, chữ thường, CHỮ HOA, Viết Hoa Mỗi Từ, bẬT/tẮT) và phím tắt Shift+F3 xoay vòng nhanh.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["đổi chữ hoa", "chữ thường", "title case", "sentence case", "shift+f3", "change case", "in hoa"],
    steps: [
      "Bôi đen đoạn văn bản cần đổi (hoặc đặt con trỏ trong một từ). Mở tab Trang đầu, nhóm Phông chữ, nút Đổi chữ hoa/thường (icon Aa) hoặc phím tắt Shift+F3.",
      "Nhấn Shift+F3 để xoay vòng nhanh giữa: chữ thường, CHỮ HOA và Viết Hoa Đầu Từ.",
      "Hoặc mở Hộp thoại Đổi chữ hoa/thường (nhấp chuột phải vào văn bản chọn 'Đổi chữ hoa/thường…' hoặc chạy lệnh) để chọn chính xác 5 kiểu: Chữ hoa đầu câu (Sentence case), chữ thường (lowercase), CHỮ HOA (UPPERCASE), Viết Hoa Mỗi Từ (Title case), hoặc bẬT/tẮT hOA tHƯỜNG (tOGGLE cASE).",
      "Hỗ trợ đầy đủ tiếng Việt có dấu (kể cả các ký tự Đ, Ă, Â, Ê, Ô, Ơ, Ư). Nhấn Áp dụng để hoàn tất.",
      "Nhấn Ctrl+Z để hoàn tác lần đổi nếu muốn quay lại ban đầu."
    ]
  },
  {
    id: "writer.format.fontDialogHelp",
    app: "writer",
    commandIds: ["writer.format.fontDialog"],
    title: "Hộp thoại Phông chữ",
    summary: "Ctrl+D mở hộp thoại để đặt phông, cỡ chữ, màu chữ, đậm, nghiêng và gạch chân cho vùng đang chọn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["phông chữ", "font dialog", "ctrl+d", "cỡ chữ", "đậm", "nghiêng", "gạch chân"],
    steps: [
      "Bôi đen đoạn cần định dạng trong nội dung tài liệu, rồi nhấn Ctrl+D. Có thể mở tab Trang đầu > nhóm Phông chữ và dùng các nút chọn phông/cỡ chữ riêng.",
      "Trong hộp thoại Phông chữ, chọn tên phông, nhập cỡ chữ từ 1 đến 400 pt, chọn màu và đánh dấu Đậm, Nghiêng hoặc Gạch chân theo nhu cầu.",
      "Nhấn Áp dụng để định dạng vùng đã bôi; nhấn Hủy hoặc Esc để đóng mà không áp dụng. Ctrl+Z hoàn tác lần áp dụng gần nhất."
    ]
  },
  {
    id: "writer.para.advanced",
    app: "writer",
    commandIds: [
      "writer.para.moveUp",
      "writer.para.moveDown",
      "writer.para.sort",
      "writer.para.showFormattingMarks",
      "writer.para.shading",
      "writer.para.borders"
    ],
    title: "Sắp xếp đoạn, dấu định dạng, tô nền và viền",
    summary: "Alt+Shift+↑/↓ đổi chỗ đoạn với đoạn kề. Sắp xếp A–Z không hộp thoại. Hiện dấu ¶ · ↵. Tô nền vàng #FFF2CC. Viền: dưới / tất cả / không.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["sắp xếp đoạn", "dấu định dạng", "tô nền", "viền đoạn", "alt+shift", "move paragraph", "formatting marks"],
    steps: [
      "Tab Trang đầu, nhóm Đoạn văn: Sắp xếp và Hiện/ẩn ký tự định dạng trên hàng danh sách; Tô nền đoạn và hộp Viền đoạn trên hàng căn lề. Di chuyển đoạn lên/xuống không có nút — Alt+Shift+↑ / Alt+Shift+↓.",
      "Sắp xếp cần ít nhất 2 khối kề nhau; nếu chưa đủ, ứng dụng sẽ báo cần chọn thêm đoạn. So sánh chữ đã cắt khoảng trắng, locale số thông minh, không phân biệt hoa thường. Con trỏ trong danh sách thì sắp mọi mục li. Chỉ A–Z, không hộp chọn cột/thứ tự.",
      "Hiện dấu định dạng: ¶ cuối đoạn, ↵ xuống dòng, · khoảng trắng. Chỉ trên màn hình. Tô nền đoạn luôn vàng kem #FFF2CC (không bảng màu) — nhấn không tự tắt, muốn bỏ thì Xóa định dạng (Ctrl+Space) hoặc tô lại bằng cách khác.",
      "Hộp Viền đoạn: Viền dưới (mặc định, 1px #334155), Tất cả viền, Không viền. Alt+Shift+↑/↓ hoán đổi khối hiện tại với khối trước/sau trong thân tài liệu. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.insert.illustrationsExtra",
    app: "writer",
    commandIds: ["writer.shape.insert", "writer.diagram.insert", "writer.chart.insert"],
    title: "Chèn hình khối, sơ đồ và biểu đồ",
    summary: "Ba nút lớn nhóm Minh họa mở hộp thoại chọn kiểu rồi mới chèn. Hình khối: chữ nhật / bo tròn / tròn / tam giác / hình thoi / mũi tên / đường thẳng. Sơ đồ: quy trình, chu trình, phân cấp, danh sách (3–6 phần tử). Biểu đồ: cột, đường, tròn, miền — nhập nhãn, giá trị và xem trước.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["hình khối", "sơ đồ", "biểu đồ", "shape", "smartart", "chart", "hộp thoại", "hình tròn", "tam giác", "hình thoi", "triangle", "diamond", "quy trình"],
    steps: [
      "Tab Chèn, nhóm Minh họa: Hình khối, Sơ đồ, Biểu đồ (ba nút lớn, cạnh Hình ảnh). Mỗi nút mở hộp thoại chọn kiểu; Hủy, nút ×, Esc hoặc bấm ra ngoài thì không chèn gì.",
      "Hình khối: hộp «Chèn hình khối» — bảy thẻ radio: Hình chữ nhật (140×80, nền #2563eb), Chữ nhật bo tròn, Hình tròn / Elip (110×110, #0ea5e9), Hình tam giác (120×100, #16a34a), Hình thoi (120×100, #9333ea), Mũi tên sang phải (140×70, #f59e0b), Đường thẳng ngang. Chọn thẻ rồi Chèn. Lớp nổi tại x=100, y lệch dần 160+(n×25); kéo để đặt, nút × xóa khi đang chọn.",
      "Sơ đồ: hộp «Chèn sơ đồ SmartArt» — Quy trình / Chu trình / Phân cấp / Danh sách, ô số bước 3–6 (mặc định 4). Nếu nhập số bước ngoài khoảng 3 đến 6, hộp thoại báo lỗi «Vui lòng nhập số nguyên từ 3 đến 6.» và giữ hộp thoại mở để sửa lại. Chèn sơ đồ tạo khối tiêu đề theo kiểu đã chọn, nút «Bước 1»… sửa được chữ, nút Xóa sơ đồ.",
      "Biểu đồ: hộp «Chèn biểu đồ minh họa» — tiêu đề, kiểu Cột/Đường/Tròn/Miền, hàng nhãn & giá trị (mẫu Quý 1–4: 120, 190, 300, 250) và khung Xem trước trực quan. Nếu giá trị của một mục không phải là số hợp lệ, hộp thoại báo lỗi «Vui lòng nhập giá trị số hợp lệ cho mục...» và giữ hộp thoại mở để sửa lại. Chèn biểu đồ, rồi nhấn Ctrl+Z nếu muốn gỡ đối tượng vừa chèn. Khi lưu thành DOCX, biểu đồ được lưu cùng workbook nhúng; mở tệp trong ứng dụng văn phòng có hỗ trợ biểu đồ native rồi nhấp đúp biểu đồ để sửa dữ liệu. Hình ảnh cùng nhóm là bài riêng."
    ]
  },
  {
    id: "writer.format.dropCapHelp",
    app: "writer",
    commandIds: ["writer.format.dropCap"],
    title: "Chữ đầu đoạn (Drop Cap)",
    summary: "Phóng chữ cái đầu đoạn đang đứng thành khối nổi 3 dòng, phông Times New Roman đậm xanh #0f4c81. Nhấn lại để gỡ. Không có hộp chọn số dòng hay vị trí lề.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chữ đầu đoạn", "drop cap", "chữ cái lớn", "đầu đoạn"],
    steps: [
      "Đặt con trỏ trong đoạn có chữ. Tab Chèn, nhóm Văn bản, cột nhỏ Chữ đầu đoạn (cạnh Ngày & Giờ, dưới Hộp văn bản / Chữ nghệ thuật).",
      "Chữ cái đầu tiên (A–Z, có dấu tiếng Việt, hoặc số) được bọc class vno-drop-cap, nổi trái, cỡ 3.1 em, Times New Roman đậm màu #0f4c81, cao 3 dòng.",
      "Nhấn lại cùng nút trên đoạn đó để gỡ chữ đầu đoạn. Đoạn trống hoặc không có ký tự chữ/số thì không đổi.",
      "Không có hộp Dropped / In margin như các phần mềm soạn thảo văn bản khác. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.insert.equationHelp",
    app: "writer",
    commandIds: ["writer.insert.equation"],
    title: "Chèn và sửa phương trình trong Doc",
    summary: "Tab Chèn > nhóm Ký hiệu > Phương trình mở bộ soạn dạng tuyến tính, cấu trúc toán học và xem trước kết quả. Phương trình được lưu thành công thức toán học có thể sửa.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["phương trình", "công thức", "equation", "Alt+=", "phân số", "căn", "ma trận", "công thức toán học"],
    steps: [
      "Trong Doc, đặt con trỏ tại vị trí cần chèn. Mở tab Chèn, nhóm Ký hiệu, chọn Phương trình; có thể nhấn Alt+= để mở cùng hộp thoại.",
      "Nhập dạng tuyến tính ở ô Dạng tuyến tính, ví dụ a/b, x^2, x_1 hoặc \\sqrt(x). Gõ \\alpha rồi nhấn phím cách để đổi thành α. Các nút Phân số, chỉ số, căn, tích phân, tổng, tích, ngoặc và ma trận chèn mẫu tại vị trí con trỏ trong ô nhập; nhóm Ký hiệu thêm các chữ Hy Lạp và dấu toán học. Xem kết quả trong vùng Xem trước.",
      "Chọn Chèn vào tài liệu. Dùng bàn phím thì nhấn Tab tới nút này rồi nhấn Enter. Phương trình nằm ngay tại con trỏ; nếu dòng đang trống thì phương trình hiển thị giữa dòng riêng. Nhấn Esc hoặc Hủy để đóng mà không chèn.",
      "Bấm phương trình để chọn; nhấp đúp để mở lại và sửa tại chỗ. Khi đã chọn, nhấn Delete hoặc Backspace để xóa. Ctrl+Z hoàn tác và Ctrl+Y làm lại. Lưu tài liệu thành .docx để mở và tiếp tục sửa công thức trong phần mềm soạn thảo văn bản khác."
    ]
  },
  {
    id: "writer.insert.equationBookmark",
    app: "writer",
    commandIds: ["writer.insert.bookmark", "writer.insert.crossReference"],
    title: "Đánh dấu và tham chiếu chéo",
    summary: "Đánh dấu tạo mỏ neo nội bộ; Tham chiếu chéo chèn liên kết tới tiêu đề hoặc đánh dấu đã có.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["đánh dấu", "bookmark", "tham chiếu chéo", "cross reference"],
    steps: [
      "Mở tab Chèn trên thanh ribbon, vào nhóm Liên kết và bấm nút Đánh dấu.",
      "Trong hộp thoại Đánh dấu, nhập tên vào ô Tên đánh dấu (mặc định gợi ý bookmark1). Nếu để trống ô tên và bấm Thêm, hộp thoại sẽ hiển thị cảnh báo lỗi «Vui lòng nhập tên đánh dấu.» và giữ hộp thoại mở để bạn nhập lại.",
      "Tên đánh dấu hợp lệ được tự động chuẩn hóa (loại bỏ dấu tiếng Việt và ký tự đặc biệt, nếu trùng tên sẽ tự thêm hậu tố -2, -3). Bấm nút Thêm (hoặc Enter) để tạo thẻ neo ẩn tại vị trí con trỏ; nhấn phím Esc để đóng hộp thoại mà không thêm.",
      "Để tạo liên kết tới đánh dấu hoặc tiêu đề đã có, mở tab Chèn > nhóm Liên kết > bấm nút Tham chiếu chéo.",
      "Trong hộp thoại Tham chiếu chéo: nếu tài liệu chưa có tiêu đề hoặc đánh dấu nào, hộp thoại sẽ thông báo «Chưa có tiêu đề hoặc đánh dấu nào.» và nút Chèn bị vô hiệu hóa. Khi đã có, chọn Tiêu đề hoặc Đánh dấu, chọn mục tiêu từ danh sách rồi bấm Chèn để tạo liên kết nội bộ.",
      "Bấm Ctrl+Z để gỡ đánh dấu hoặc liên kết tham chiếu vừa chèn."
    ]
  },
  {
    id: "writer.comment.insertHelp",
    app: "writer",
    commandIds: ["writer.comment.insert"],
    title: "Thêm ghi chú vào đoạn đã bôi",
    summary: "Ctrl+Alt+M yêu cầu đã bôi chữ trong thân tài liệu. Hộp nhập ghi chú, neo vàng trên chữ đã chọn. Duyệt / xóa / đánh dấu xử lý nằm bài «Duyệt nhận xét».",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Ghi chú" },
    keywords: ["ghi chú", "nhận xét", "comment", "ctrl+alt+m", "bôi đen"],
    steps: [
      "Bôi đoạn chữ trong thân tài liệu (không phải đầu/chân trang). Tab Đánh giá, nhóm Ghi chú, nút lớn Thêm ghi chú — hoặc tab Chèn, nhóm Ghi chú — hoặc Ctrl+Alt+M.",
      "Chưa bôi: cảnh báo «Chưa chọn văn bản» / «Hãy bôi đen đoạn văn bản trong nội dung tài liệu trước khi thêm ghi chú.» Đã bôi: hộp «Thêm ghi chú» hiện đoạn trích (tối đa 80 ký tự), ô nhập, nút Thêm ghi chú.",
      "Chữ được bọc mark vàng (neo ghi chú). Panel bên «Ghi chú tài liệu» liệt kê các ghi chú. Không thêm được khi con trỏ chỉ nhấp, khác các phần mềm soạn thảo văn bản khác.",
      "Ctrl+Z gỡ ghi chú vừa thêm. Nhận xét trước/sau, xóa, đã xử lý: bài «Duyệt nhận xét». Nhấn Ctrl+S để lưu DOCX; nội dung, tác giả, thời gian, đoạn chữ được neo và trạng thái đã xử lý được khôi phục khi mở lại trong ứng dụng hoặc trình đọc DOCX khác."
    ]
  },
  {
    id: "writer.page.setup",
    app: "writer",
    commandIds: ["writer.page.margins", "writer.page.orientation", "writer.page.size", "writer.page.setupDialog"],
    title: "Lề, hướng giấy và khổ giấy",
    summary: "Ba nút mở cùng hộp «Thiết lập trang». Có preset lề Normal, Narrow, Moderate, Wide hoặc nhập mm; khổ A4, A5, Letter, Legal; hướng Dọc/Ngang.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["căn lề", "lề trang", "hướng giấy", "khổ giấy", "a4", "nđ 30", "portrait", "landscape", "thiết lập trang"],
    steps: [
      "Tab Bố cục, nhóm Thiết lập trang: Căn lề, Hướng giấy, Khổ giấy (ba nút lớn). Cả ba mở hộp «Thiết lập trang» — Hướng giấy đặt tiêu điểm vào hướng; Căn lề và Khổ giấy đặt tiêu điểm vào khổ.",
      "Khổ giấy: A4 (210 × 297 mm), A5 (148 × 210 mm), Letter (215.9 × 279.4 mm), Legal (216 × 356 mm). Khi mở DOCX có khổ không chuẩn, hộp hiển thị Tùy chỉnh kèm kích thước gốc và Doc giữ nguyên kích thước đó khi lưu. Hướng: Dọc (Portrait) hoặc Ngang (Landscape).",
      "Mở Đặt sẵn lề và chọn Normal (25,4 mm bốn phía), Narrow (12,7 mm), Moderate (trên/dưới 25,4; trái/phải 19,05), hoặc Wide (trên/dưới 25,4; trái/phải 50,8). Chọn Tùy chỉnh để nhập từng lề 0–100 mm. Mặc định tài liệu mới vẫn theo NĐ 30.",
      "Sau khi chọn khổ, hướng và preset hoặc nhập lề, nhấn Áp dụng cho Mục này hoặc Toàn bộ tài liệu. Thước trên tab Chế độ xem phản ánh lề trái/phải sau khi áp dụng. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.layout.lineNumbers",
    app: "writer",
    commandIds: ["writer.layout.lineNumbers"],
    title: "Danh số dòng",
    summary: "Chọn danh số dòng: Không có, Liên tục, Mỗi trang hoặc Mỗi mục. Doc chỉ hiển thị trạng thái đã chọn, chưa vẽ số cạnh từng dòng trên vùng soạn thảo. Khi lưu .docx, có thể xem số dòng bằng phần mềm văn phòng khác hỗ trợ tính năng này.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["danh số dòng", "line numbers", "số dòng", "lề trái", "trích dẫn dòng", "continuous", "restart each page"],
    steps: [
      "Mở tab Bố cục, nhóm Thiết lập trang. Hộp «Danh số dòng» nằm ngay sau menu Ngắt (đúng chỗ Line Numbers trên thanh công cụ).",
      "Chọn Liên tục để đánh số 1, 2, 3… suốt tài liệu; Mỗi trang để số bắt đầu lại từ 1 ở mỗi trang; Mỗi mục để vùng soạn thảo Doc ghi nhận restart theo ngắt mục; Không có để tắt.",
      "Vùng soạn thảo chỉ hiện trạng thái danh số dòng ở lề trái, không vẽ số cạnh từng dòng. Để kiểm tra kết quả, lưu tài liệu rồi xem bằng phần mềm văn phòng khác có hỗ trợ số dòng. Bản xem trước khi in giúp kiểm tra bố cục trước khi in.",
      "Lưu bằng Ctrl+S để giữ lựa chọn danh số dòng. Khi lưu .docx, lựa chọn Mỗi mục chuyển thành Liên tục; không bắt đầu lại số ở từng mục. Có thể dùng Mỗi trang để bắt đầu lại ở từng trang hoặc Không có để tắt. Ctrl+Z hoàn tác thay đổi vừa thực hiện."
    ]
  },
  {
    id: "writer.page.columnsHelp",
    app: "writer",
    commandIds: [
      "writer.page.columns",
      "writer.page.columns1",
      "writer.page.columns2",
      "writer.page.columns3"
    ],
    title: "Chia cột văn bản",
    summary: "Nút Cột mở hộp 1–4 cột, khe 0–50 mm, tùy chọn đường kẻ giữa. Ba nút tắt 1 / 2 / 3 cột (khe 10 mm, không kẻ). Áp dụng cho cả thân tài liệu.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["chia cột", "columns", "hai cột", "ba cột", "đường kẻ cột", "khe cột"],
    steps: [
      "Tab Bố cục, nhóm Thiết lập trang: nút lớn Cột, rồi cột 1 cột / 2 cột / 3 cột.",
      "1 cột: một luồng, khe 0, không kẻ. 2 cột / 3 cột: count 2 hoặc 3, khe 10 mm, không kẻ. Áp ngay, không hỏi.",
      "Nút Cột mở hộp «Chia cột văn bản (Columns)»: mẫu Một cột / Hai cột / Ba cột; Số cột 1–4; Khoảng cách giữa các cột 0–50 mm; tick Đường kẻ phân cách cột; khung Xem trước trực quan. Nếu nhập số cột ngoài khoảng 1 đến 4 hoặc khoảng cách ngoài khoảng 0 đến 50 mm, hộp thoại sẽ báo lỗi «Số cột phải là số nguyên từ 1 đến 4.» hoặc «Khoảng cách cột phải là số từ 0 đến 50 mm.» và giữ hộp thoại mở để nhập lại. Đang chia nhiều cột thì có nút Bỏ chia cột (1 cột). Bấm Áp dụng để hoàn tất.",
      "Chia cột CSS trên toàn bộ thân, không theo vùng bôi hay từng section. Ngắt cột (menu Ngắt cùng nhóm) đẩy chữ sau con trỏ sang cột kế. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.page.watermarkBorder",
    app: "writer",
    commandIds: ["writer.page.watermark", "writer.page.border"],
    title: "Hình mờ và viền trang",
    summary: "Hình mờ chữ chéo (mặc định DỰ THẢO, đỏ #dc2626, 45°, mờ 0.2, cỡ 72). Viền trang nét liền/đứt/đôi, dày 1–6 pt, mặc định 2 pt xanh #0f4c81. Cả hai hiện khi in và xem trước.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Nền & Viền trang" },
    keywords: ["hình mờ", "watermark", "dự thảo", "mật", "khẩn", "viền trang", "page border", "nét đôi", "thiết kế", "design", "page background"],
    steps: [
      "Tab Thiết kế, nhóm Nền & Viền trang: Hình mờ, Màu trang (bài riêng), Viền trang — ba nút lớn. Cùng Hình mờ / Viền trang còn trên tab Bố cục, nhóm Nền & Viền trang.",
      "Hình mờ (440 px): chọn một trong các mẫu sẵn (DỰ THẢO, MẬT, TUYỆT MẬT, KHẨN, BẢN SAO) hoặc gõ chữ tùy chọn vào ô Nội dung. Nếu để trống ô nội dung và bấm Áp dụng, hộp thoại sẽ báo lỗi «Vui lòng nhập nội dung hình mờ; để xóa, hãy dùng nút Xóa hình mờ.» và giữ nguyên tiêu điểm ở ô nhập. Chọn màu sắc (Đỏ nhạt #dc2626, Xám, Xanh dương, Vàng hổ phách), góc xoay (Chéo 45°, −45°, Nằm ngang 0°) và độ mờ 0.05–0.60 (mặc định 0.2). Bấm Áp dụng để chèn; nếu muốn gỡ bỏ hình mờ hiện có, bấm nút Xóa hình mờ.",
      "Viền trang: nét Liền / Đứt / Đôi / Không có viền; dày 1, 1.5, 2 (mặc định), 3, 4.5, 6 pt; màu Xanh 3T Office #0f4c81, Đen than, Xám, Đỏ hành chính, Xanh lá. Xem trước khung. Đang có viền thì Xóa viền trang.",
      "Hình mờ và viền phủ overlay soạn thảo và mỗi tờ khi Xem trước khi in. Không có hình mờ ảnh. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.file.printPreviewHelp",
    app: "writer",
    commandIds: ["writer.file.printPreview", "common.file.print", "common.file.exportPdf"],
    title: "Xem trước khi in",
    summary: "Ctrl+P hoặc Ctrl+F2 mở hộp thoại In. Khi có phần mềm văn phòng khác, Doc dùng bộ dựng PDF đó để giữ phân trang sát bản gốc; nếu không có hoặc gặp lỗi, bộ dựng tích hợp của 3T Office tự tiếp tục.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "In ấn" },
    keywords: ["xem trước khi in", "print preview", "ctrl+f2", "phân trang", "in tài liệu"],
    steps: [
      "Nhấn Ctrl+P, nhấp biểu tượng máy in trên thanh truy cập nhanh, hoặc vào Tệp → In. Ctrl+F2 cũng mở cùng hộp thoại.",
      "Nếu máy có phần mềm văn phòng khác, tùy chọn Dùng phần mềm văn phòng có sẵn trên máy để in được chọn sẵn. Khung Bộ dựng trang in cho biết ứng dụng nào đã tạo trang xem trước; bỏ chọn để dùng bộ dựng tích hợp của 3T Office.",
      "Chọn máy in, nhập số bản. Chọn Tất cả, Trang hiện tại theo vị trí con trỏ, hoặc Trang từ–đến; phạm vi nhiều đoạn dùng dấu phẩy, ví dụ 1-3,5.",
      "Xuất PDF riêng: mở Tệp → Xuất PDF và chọn nơi lưu. Doc dựng tệp qua cùng đường Lưu DOCX; nếu phần mềm văn phòng khác dùng được thì ứng dụng đó tạo PDF, nếu không bộ dựng tích hợp của 3T Office tiếp tục.",
      "Khổ giấy và hướng in được lấy từ Thiết lập trang hiện tại. Nhấn In để gửi tài liệu; nếu chọn máy in PDF, chọn nơi lưu tệp PDF. Esc hoặc nút × đóng hộp thoại."
    ]
  },
  {
    id: "writer.reference.notes",
    app: "writer",
    commandIds: ["writer.reference.footnoteInsert", "writer.reference.endnoteInsert"],
    title: "Chú thích cuối trang và chú thích cuối tài liệu",
    summary: "Ctrl+Alt+F chèn footnote đánh số 1, 2, 3… Ctrl+Alt+D chèn endnote số la mã i, ii, iii… Nhấp số siêu ký tự để nhảy tới nội dung chú thích.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Chú thích" },
    keywords: ["chú thích cuối trang", "footnote", "endnote", "chú thích cuối", "ctrl+alt+f", "ctrl+alt+d"],
    steps: [
      "Đặt con trỏ chỗ cần mốc. Tab Tham chiếu, nhóm Chú thích: Chú thích trang (Ctrl+Alt+F) và Chú thích cuối (Ctrl+Alt+D) — hai nút lớn. Không còn trên tab Chèn.",
      "Chú thích trang: số Ả Rập trên chữ (sup), danh sách cuối thân với ô «Nhập nội dung chú thích...», nút Xóa chú thích và Chuyển tới vị trí tham chiếu. Đánh lại số tự động khi xóa. Khi xem trước/in, ghi chú nằm cuối tờ chứa mốc.",
      "Chú thích cuối: số la mã thường i, ii, iii…, tiêu đề mục «CHÚ THÍCH CUỐI TÀI LIỆU», ô «Nhập nội dung chú thích cuối...». Khi in, cả khối nằm trang cuối.",
      "Nhấp số trên chữ để nhảy xuống ghi chú. Không có hộp đổi kiểu đánh số / chuyển footnote↔endnote như các phần mềm soạn thảo văn bản khác. Ctrl+Z gỡ mốc vừa chèn."
    ]
  },
  {
    id: "writer.file.openDocument",
    app: "writer",
    commandIds: ["common.file.open"],
    title: "Mở tài liệu có sẵn (DOCX / ODT)",
    summary: "Mở tệp tài liệu định dạng (.docx, .doc) hoặc OpenDocument (.odt) có sẵn trên máy tính qua phím tắt Ctrl+O hoặc menu Tệp. Tự động nạp định dạng, căn lề, bảng biểu và cập nhật nhãn tài liệu.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["mở tệp", "mở file", "open", "ctrl+o", "docx", "word", "odt", "mở tài liệu"],
    steps: [
      "Cách 1: Nhấn tổ hợp phím tắt Ctrl+O trên bàn phím tại bất kỳ màn hình nào trong Doc.",
      "Cách 2: Nhấn vào tab màu xanh «Tệp» ở góc trên cùng bên trái thanh công cụ để mở Backstage Menu, sau đó chọn mục «Mở tệp».",
      "Hộp thoại chọn tệp của hệ điều hành sẽ xuất hiện. Duyệt đến thư mục chứa tệp văn bản .docx (.docx, .doc, .odt, .rtf) cần mở, chọn tệp rồi nhấn Open.",
      "Hệ thống tự động chuyển đổi và hiển thị văn bản lên khổ giấy A4 chuẩn Nghị định 30/2020/NĐ-CP (lề trái 30 mm, lề phải 15 mm). Toàn bộ bảng biểu, tiêu đề căn giữa, định dạng phông chữ Times New Roman và tiêu đề tệp trên thanh tab được cập nhật tự động."
    ]
  },
  {
    id: "writer.file.saveDocument",
    app: "writer",
    commandIds: ["common.file.save", "common.file.saveAs"],
    title: "Lưu tài liệu (Ctrl+S) và Lưu bản sao (F12)",
    summary: "Lưu văn bản đang soạn thảo sang tệp thật trên đĩa máy tính thông qua ứng dụng. Hỗ trợ Ctrl+S lưu thẳng vào tệp đang mở như phần mềm soạn thảo văn bản khác, F12 lưu bản sao và tôn trọng định dạng gốc .doc (định dạng cũ (.doc)).",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["lưu tệp", "lưu file", "save", "save as", "ctrl+s", "f12", "docx", "doc", "lưu bản sao", "lưu tài liệu", "lưu tại chỗ"],
    steps: [
      "Lưu nhanh vào tệp đang mở (Ctrl+S): Nhấn phím tắt Ctrl+S hoặc nhấp biểu tượng đĩa mềm trên thanh truy cập nhanh ở góc trên bên trái. Nếu tài liệu đã có đường dẫn trên đĩa (DOCX, DOC, ODT, RTF), hệ thống sẽ lưu thẳng trực tiếp vào tệp đó mà không mở hộp thoại, kèm thông báo 'Đã lưu' trên thanh trạng thái.",
      "Lưu tài liệu mới: Nếu tài liệu vừa tạo mới chưa lưu lần nào, thao tác Ctrl+S hoặc nút Lưu sẽ tự động mở hộp thoại Lưu bản sao để bạn chọn thư mục và đặt tên tệp.",
      "Lưu bản sao (F12 / Tệp → Lưu bản sao): Nhấn phím F12 hoặc vào menu Tệp → chọn «Lưu bản sao» để mở hộp thoại lưu tệp native. Bạn có thể lưu thành tệp mới với các định dạng: .docx (.docx XML chuẩn), .doc (định dạng cũ (.doc) OLE2), .odt (OpenDocument Text) hoặc .rtf (Rich Text Format).",
      "Chế độ tương thích định dạng cũ (.doc): Khi mở một tệp .doc từ cơ quan hoặc ổ LAN, thao tác Ctrl+S sẽ lưu lại đúng chuẩn nhị phân định dạng cũ (.doc) (.doc), không âm thầm chuyển đổi sang .docx.",
      "Bảo vệ dữ liệu nguyên tử: Hệ thống luôn ghi ra tệp tạm và thay thế nguyên tử (atomic replace); nếu có sự cố ngắt nguồn hoặc lỗi chuyển đổi, tệp gốc trên đĩa hoàn toàn không bị hư hại. Nếu tệp đang ở chế độ chỉ đọc hoặc bị ứng dụng khác khóa, hệ thống sẽ thông báo rõ ràng để bạn chọn Lưu bản sao."
    ]
  },
  {
    id: "writer.file.saveFloatingContent",
    app: "writer",
    commandIds: ["common.file.save", "common.file.saveAs"],
    title: "Lưu DOCX có ảnh neo và khung nổi",
    summary: "Giữ nguyên ảnh neo trang, nhóm hình và vị trí khung nổi chưa chỉnh sửa khi lưu lại tài liệu văn bản.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["ảnh neo", "khung nổi", "nhóm hình", "anchor", "floating", "lưu docx"],
    steps: [
      "Mở tài liệu DOCX bằng Tệp → Mở. Doc hiển thị ảnh neo và khung nổi từ tài liệu gốc trên vùng soạn thảo.",
      "Ảnh neo theo Trang được tính từ mép giấy; ảnh neo theo Lề hoặc Cột được tính từ vùng văn bản. Kiểu bọc Trên và dưới chừa chỗ cho nội dung kế tiếp, còn Không bọc cho phép chữ chồng theo thiết kế gốc.",
      "Soạn sửa phần văn bản cần thiết. Các nhóm hình và ảnh neo chưa hỗ trợ kéo hoặc đổi kích thước trực tiếp; Doc giữ dữ liệu gốc của các đối tượng này khi lưu.",
      "Nhấn Ctrl+S hoặc chọn Tệp → Lưu/Lưu bản sao, chọn định dạng DOCX rồi xác nhận vị trí lưu.",
      "Mở lại tệp bằng phần mềm soạn thảo văn bản khác hoặc phần mềm văn phòng khác để kiểm tra bố cục. Nếu cần chỉnh vị trí hay thành phần bên trong nhóm hình, hãy chỉnh trong ứng dụng nguồn rồi mở lại trong Doc."
    ]
  },
  {
    id: "writer.accessibility.keyboardNav",
    app: "writer",
    commandIds: ["common.file.backstage"],
    title: "Điều hướng bằng bàn phím và trợ năng (Doc)",
    summary: "Thao tác hoàn toàn bằng bàn phím không cần dùng chuột: mở menu Tệp (Alt+F), chuyển tab Ribbon bằng phím mũi tên Trái/Phải, di chuyển giữa các nút bằng Tab, bẫy tiêu điểm trong các hộp thoại (Tab/Shift+Tab) và đóng bằng Escape khôi phục tiêu điểm.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trợ năng" },
    keywords: ["bàn phím", "phím tắt", "trợ năng", "accessibility", "keyboard", "tiêu điểm", "alt+f", "esc", "tab", "mũi tên"],
    steps: [
      "Mở menu Tệp (Backstage) bằng phím tắt Alt+F: Menu toàn màn hình mở ra với tiêu điểm tự động đặt vào nút 'Quay lại'. Dùng mũi tên Lên/Xuống để duyệt danh sách lệnh (Mới, Mở, Lưu, In...), dùng mũi tên Phải để đi vào các thẻ mẫu văn bản, và nhấn Escape để đóng menu trở về vùng soạn thảo.",
      "Chuyển tab trên thanh Ribbon: Nhấn Tab cho đến khi tiêu điểm nằm trên dải tab Ribbon, sau đó dùng phím mũi tên Trái (ArrowLeft) hoặc Phải (ArrowRight) để chuyển tab qua lại. Phím Home nhảy về tab Trang đầu, phím End nhảy tới tab cuối cùng. Dùng phím mũi tên Trái từ tab đầu tiên để đi sang nút 'Tệp'.",
      "Duyệt các nút lệnh trên Ribbon: Nhấn phím Tab để di chuyển tiêu điểm tuần tự qua từng nhóm và nút lệnh trên thanh Ribbon. Mọi nút lệnh nhận tiêu điểm đều hiển thị viền tiêu điểm rõ ràng (chuẩn tương phản WCAG 2.1 AA). Nhấn Enter hoặc Space để kích hoạt lệnh.",
      "Thao tác trong hộp thoại và bẫy tiêu điểm (Focus Trap): Khi mở các hộp thoại như Thiết lập trang, Chèn cột, Thủy ấn hoặc Trộn thư, tiêu điểm bàn phím được bẫy hoàn toàn bên trong hộp thoại (phím Tab và Shift+Tab chỉ xoay vòng giữa các điều khiển hợp lệ của hộp thoại, không bị rơi ra ngoài nền). Nhấn Escape để đóng hộp thoại bất kỳ lúc nào và tự động khôi phục tiêu điểm về nút đã mở.",
      "Soạn thảo văn bản và phím tắt định dạng: Nhập văn bản trực tiếp trong vùng soạn thảo trang giấy. Sử dụng các tổ hợp phím tắt chuẩn như Ctrl+B (chữ đậm), Ctrl+I (chữ nghiêng), Ctrl+U (gạch chân), Ctrl+Z (hoàn tác), Ctrl+Y (làm lại)."
    ]
  },
  {
    id: "writer.macro.basics",
    app: "writer",
    commandIds: ["common.macro.recordToggle", "common.macro.manager"],
    title: "Ghi và quản lý Macro (Tự động hóa thao tác)",
    summary: "Ghi lại chuỗi thao tác lệnh trong Doc để phát lại tự động. Giúp tiết kiệm thời gian cho các chuỗi định dạng lặp đi lặp lại. Hỗ trợ phím tắt Ctrl+Shift+R để bật/dừng ghi và Alt+F8 để mở hộp thoại Quản lý Macro.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Macro" },
    keywords: ["macro", "ghi macro", "dừng ghi", "quản lý macro", "xem macro", "tự động hóa", "record macro", "alt+f8", "ctrl+shift+r"],
    steps: [
      "Bắt đầu ghi: Mở tab Chế độ xem trên Ribbon, trong nhóm Macro nhấn nút «Ghi Macro» (hoặc nhấn tổ hợp phím Ctrl+Shift+R). Nút sẽ chuyển sang biểu tượng hình vuông dừng ghi màu đỏ với nhãn «Dừng ghi», đồng thời chỉ báo chấm đỏ nhấp nháy trên thanh trạng thái và nút Ribbon sẽ kích hoạt.",
      "Thực hiện các thao tác: Tiến hành các thao tác lệnh bạn muốn ghi lại (ví dụ: bôi đậm, đổi màu chữ, căn giữa đoạn văn, chèn bảng, đổi hướng giấy...).",
      "Dừng ghi và đặt tên: Nhấn lại nút «Dừng ghi» trên Ribbon (hoặc nhấn Ctrl+Shift+R). Nhập tên cho Macro trong hộp thoại Lưu Macro và nhấn OK. Nếu không thực hiện thao tác nào trong lúc ghi, hệ thống sẽ thông báo và không lưu Macro rỗng.",
      "Xem và chạy Macro: Mở tab Chế độ xem, nhấn «Xem Macro» (hoặc nhấn Alt+F8) để mở hộp thoại Quản lý Macro. Tại đây bạn có thể nhấn nút «▶ Chạy» để phát lại các thao tác đã ghi, «Đổi tên» để cập nhật tên gọi, hoặc «Xóa» để gỡ bỏ Macro không dùng nữa.",
      "Giới hạn trung thực: Macro cơ bản chỉ ghi lại các thao tác đi qua hệ thống lệnh (lệnh định dạng và chỉnh sửa) như định dạng, chèn bảng, đổi bố cục... Macro KHÔNG ghi lại nội dung gõ chữ tự do từ bàn phím vào trang soạn thảo (do đây là nhập liệu trực tiếp của trình duyệt). Nếu trong chuỗi ghi có bước mở hộp thoại cần người dùng tương tác, Macro sẽ tạm dừng tại hộp thoại đó chờ bạn thao tác. Macro được lưu trữ riêng biệt theo từng ứng dụng (Writer, Sheet, Slides) và không dùng chéo giữa các ứng dụng."
    ]
  },
  {
    id: "writer.ai.voiceInput",
    app: "writer",
    commandIds: ["ai.voice.input"],
    title: "Nhập liệu bằng giọng nói (Voice Input)",
    summary: "Nhập văn bản vào tài liệu bằng giọng nói tiếng Việt qua microphone. Dùng Web Speech API tích hợp sẵn trong trình duyệt — không cần cài thêm phần mềm. Nhận dạng giọng nói được xử lý cục bộ trong WebView2, không gửi dữ liệu ra ngoài.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["giọng nói", "voice input", "speech to text", "nhập liệu", "microphone", "micro", "nhận dạng giọng", "nói", "vi-VN"],
    steps: [
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Nhập liệu bằng giọng nói».",
      "Nếu đây là lần đầu tiên sử dụng, trình duyệt sẽ hỏi quyền truy cập microphone — nhấn Cho phép.",
      "Trạng thái «Đang lắng nghe — hãy nói vào microphone...» sẽ hiển thị trên thanh trạng thái dưới cùng màn hình.",
      "Nói rõ ràng nội dung cần nhập. Văn bản nhận dạng được sẽ tự động chèn vào vị trí con trỏ hiện tại trong tài liệu.",
      "Để dừng nhập liệu, nhấn lại nút «Nhập liệu bằng giọng nói» trên ribbon. Trạng thái sẽ chuyển thành «Đã dừng lắng nghe».",
      "Lưu ý: Tính năng này yêu cầu microphone và kết nối internet (do Web Speech API sử dụng dịch vụ nhận dạng của Google/Chromium). Nếu không có quyền truy cập microphone hoặc trình duyệt không hỗ trợ, sẽ hiển thị thông báo lỗi rõ ràng bằng tiếng Việt."
    ]
  },
  {
    id: "writer.ai.meetingSummary",
    app: "writer",
    commandIds: ["ai.assistant.summarizeMeeting"],
    title: "Tóm tắt cuộc họp (Meeting Summary)",
    summary: "Tóm tắt nội dung ghi chép/transcript cuộc họp thành cấu trúc rõ ràng: Điểm chính, Quyết định, Việc cần làm (kèm người phụ trách). Khác với Tóm tắt nhanh (tóm tắt tài liệu hiện tại), tính năng này cho phép dán nội dung ghi chép từ nguồn bên ngoài vào hộp thoại để AI xử lý.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["tóm tắt cuộc họp", "meeting summary", "ghi chép", "transcript", "điểm chính", "quyết định", "việc cần làm", "action items"],
    steps: [
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Tóm tắt cuộc họp».",
      "Hộp thoại «Tóm tắt cuộc họp» xuất hiện. Dán hoặc nhập nội dung ghi chép/transcript cuộc họp vào ô văn bản.",
      "Nhấn nút «Tóm tắt» để bắt đầu xử lý. AI sẽ phân tích nội dung và tạo bản tóm tắt có cấu trúc với 3 phần: Điểm chính, Quyết định, Việc cần làm.",
      "Kết quả tóm tắt hiển thị trong bảng Trợ lý 3T AI bên phải. Nhấn «Chèn vào tài liệu» để thêm nội dung tóm tắt vào vị trí con trỏ trong tài liệu.",
      "Nếu chưa kết nối AI cloud nào (chỉ dùng chế độ quy tắc cục bộ), tính năng sẽ hoạt động ở mức cơ bản. Để có kết quả tóm tắt chính xác hơn, vui lòng kết nối OpenAI, Gemini hoặc Claude trong phần cài đặt AI trên thanh Trợ lý 3T AI."
    ]
  },
  {
    id: "writer.ai.smartSearch",
    app: "writer",
    commandIds: ["ai.assistant.smartSearch"],
    title: "Tìm kiếm thông minh (Smart Search)",
    summary: "Tìm kiếm nội dung trong tài liệu bằng ngôn ngữ tự nhiên thay vì chỉ tìm chuỗi chính xác như Ctrl+F. AI sẽ phân tích câu hỏi và tìm các đoạn văn bản liên quan nhất trong tài liệu.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["tìm kiếm thông minh", "smart search", "tìm kiếm AI", "ngôn ngữ tự nhiên", "natural language search", "tìm đoạn"],
    steps: [
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Tìm kiếm thông minh».",
      "Hộp thoại «Tìm kiếm thông minh» xuất hiện. Nhập câu hỏi tìm kiếm bằng ngôn ngữ tự nhiên, ví dụ: «tìm đoạn nói về ngân sách quý 2» hoặc «tìm phần thảo luận về nhân sự».",
      "Nhấn nút «Tìm kiếm» để bắt đầu. AI sẽ phân tích nội dung tài liệu và tìm các đoạn liên quan đến câu hỏi.",
      "Kết quả hiển thị trong bảng Trợ lý 3T AI bên phải, bao gồm các đoạn văn bản tìm thấy và vị trí trong tài liệu.",
      "Nếu tài liệu trống hoặc không tìm thấy nội dung phù hợp, hệ thống sẽ thông báo rõ ràng.",
      "Lưu ý: Tính năng này hoạt động tốt nhất với tài liệu có nội dung dài. Kết quả phụ thuộc vào AI provider đang dùng — kết nối AI cloud (OpenAI/Gemini/Claude) sẽ cho kết quả chính xác hơn chế độ quy tắc cục bộ."
    ]
  },
  {
    id: "writer.ai.translate",
    app: "writer",
    commandIds: ["ai.assistant.translate"],
    title: "Dịch thuật",
    summary: "Dịch đoạn văn bản được chọn (hoặc toàn bộ tài liệu nếu không chọn gì) sang ngôn ngữ đích bằng AI. Hỗ trợ 6 ngôn ngữ: Tiếng Anh, Tiếng Việt, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Français.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["dịch thuật", "translate", "dịch", "tiếng anh", "tiếng trung", "tiếng nhật", "tiếng hàn", "tiếng pháp", "dịch văn bản", "translation"],
    steps: [
      "Bôi đen đoạn văn bản cần dịch. Nếu không chọn gì, toàn bộ nội dung tài liệu sẽ được dịch.",
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Dịch thuật».",
      "Hộp thoại «Dịch thuật» xuất hiện với 6 ngôn ngữ đích để chọn: Tiếng Anh, Tiếng Việt, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp. Chọn ngôn ngữ cần dịch rồi nhấn «Dịch».",
      "Kết quả hiển thị trong bảng Trợ lý 3T AI bên phải. Nếu đã bôi đen văn bản, có 2 nút: «Thay thế vùng chọn» (thay nội dung gốc bằng bản dịch) và «Chèn bên dưới» (giữ bản gốc, thêm bản dịch phía dưới).",
      "Nếu không bôi đen, chỉ có nút «Chèn bên dưới» để thêm bản dịch vào tài liệu.",
      "Lưu ý: Bản dịch có thể cần chỉnh sửa lại cho phù hợp ngữ cảnh. Ctrl+Z hoàn tác nếu chèn nhầm."
    ]
  },
  {
    id: "writer.ai.draftDocument",
    app: "writer",
    commandIds: ["ai.assistant.draftDocument"],
    title: "AI Viết nháp",
    summary: "AI tạo bản nháp văn bản hành chính tiếng Việt theo yêu cầu bằng ngôn ngữ tự nhiên. Phù hợp cho thư mời, công văn, hợp đồng, báo cáo và các loại văn bản hành chính khác.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["viết nháp", "draft", "soạn thảo", "soạn thư", "soạn hợp đồng", "văn bản hành chính", "AI viết", "tạo văn bản"],
    steps: [
      "Mở tab Trợ lý 3T AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Viết nháp».",
      "Hộp thoại «AI Viết nháp» xuất hiện. Nhập mô tả nội dung bạn muốn AI soạn, ví dụ: «soạn thư mời họp giao ban tuần», «soạn hợp đồng thuê nhà cơ bản», «soạn công văn đề nghị».",
      "Nhấn «Tạo nháp» để bắt đầu. AI sẽ tạo bản nháp có cấu trúc phù hợp loại văn bản (tiêu đề, kính gửi, nội dung, ký tên nếu là thư/công văn).",
      "Kết quả hiển thị trong bảng Trợ lý 3T AI với cảnh báo: đây là bản nháp do AI tạo, cần tự kiểm tra lại nội dung trước khi sử dụng, đặc biệt với hợp đồng/văn bản có giá trị pháp lý.",
      "Nhấn «Chèn vào tài liệu» để thêm bản nháp vào vị trí con trỏ. Ctrl+Z hoàn tác nếu chèn nhầm.",
      "Lưu ý: Chế độ quy tắc cục bộ chỉ đưa ra gợi ý chung. Để có bản nháp tốt, nên kết nối AI cloud (OpenAI/Gemini/Claude) hoặc cài Ollama."
    ]
  },
  {
    id: "writer.file.backstage",
    app: "writer",
    commandIds: ["common.file.backstage", "common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.exportPdf"],
    title: "Menu Tệp (Backstage) và quản lý tài liệu",
    summary: "Mở menu Tệp toàn màn hình (Alt+F hoặc nút Tệp màu xanh góc trên-trái) để khởi tạo văn bản theo mẫu chuẩn, mở lại tài liệu gần đây, lưu DOCX, in với khung xem trước trực tiếp, hoặc xuất PDF.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["tệp", "file", "backstage", "alt+f", "mẫu tài liệu", "tệp gần đây", "lưu", "in", "xuất pdf", "trang chủ", "menu tệp"],
    steps: [
      "Mở menu Tệp: Nhấp vào nút màu xanh «Tệp» ở góc trên cùng bên trái thanh Ribbon hoặc nhấn tổ hợp phím Alt+F. Giao diện Backstage toàn màn hình sẽ mở ra với thanh điều hướng màu xanh bên trái và tiêu điểm tự động đặt vào nút 'Quay lại'.",
      "Màn hình Trang chủ: Hiển thị danh sách mẫu tài liệu chuẩn Việt Nam (Văn bản trống, Văn bản hành chính theo NĐ 30/2020/NĐ-CP) và bảng 'Tài liệu mở gần đây'.",
      "Chọn mẫu Văn bản hành chính: dùng phím mũi tên Phải để vào lưới mẫu, chọn thẻ «Văn bản hành chính» rồi nhấn Enter/Space (hoặc nhấp chuột). Doc tạo nội dung Quyết định có quốc hiệu, số văn bản, căn cứ, các điều, nơi nhận và phần ký; sửa trực tiếp các dòng mẫu rồi nhấn Ctrl+S để chọn nơi lưu DOCX.",
      "Mở và quản lý tệp gần đây: Dùng phím mũi tên Xuống để chuyển tới danh sách tệp gần đây. Nhấp chuột hoặc bấm Enter để mở lại tệp. Mỗi hàng tệp có nút 'Gỡ khỏi danh sách' (biểu tượng ×) giúp bạn chủ động loại bỏ tệp đã bị xóa hoặc đổi tên. Nút 'Xóa lịch sử' phía trên cho phép dọn sạch toàn bộ danh sách khi cần.",
      "In tài liệu: Chọn mục «In» trong Tệp hoặc nhấn Ctrl+P. Hộp thoại In tạo PDF tạm từ nội dung hiện tại, hiển thị ảnh từng trang, cho chọn máy in, số bản và phạm vi trang; nhấn In để gửi tài liệu.",
      "Các lệnh tài liệu khác: Các mục 'Tạo mới' (Ctrl+N), 'Mở' (Ctrl+O), 'Lưu' (Ctrl+S), 'Lưu bản sao' (F12) và 'Xuất PDF' đều có thể kích hoạt trực tiếp từ thanh bên trái.",
      "Đóng menu Tệp: Nhấn phím Escape hoặc nhấp nút '← Quay lại' ở góc trên bên trái bất kỳ lúc nào để đóng Backstage và khôi phục tiêu điểm chính xác về vị trí soạn thảo trước đó."
    ]
  },
{
    id: "writer.clipboard.cutCopyPaste",
    app: "writer",
    commandIds: ["common.edit.cut", "common.edit.copy", "common.edit.paste", "common.edit.formatPainter"],
    title: "Cắt, Sao chép, Dán và Sao chép định dạng",
    summary: "Thao tác đưa văn bản hoặc đối tượng vào bộ nhớ tạm bằng Cắt (Ctrl+X) hoặc Sao chép (Ctrl+C), sau đó Dán (Ctrl+V) tại vị trí mới; Sao chép định dạng (Ctrl+Shift+C) áp dụng nhanh phông chữ và kiểu đoạn cho văn bản khác.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["cắt", "sao chép", "dán", "sao chép định dạng", "clipboard", "cut", "copy", "paste", "format painter", "Ctrl+X", "Ctrl+C", "Ctrl+V", "Ctrl+Shift+C"],
    steps: [
      "Bôi đen đoạn văn bản hoặc chọn đối tượng (bảng, hình ảnh) cần thao tác.",
      "Mở tab Trang đầu, nhóm Bảng nhớ tạm: nhấn Cắt (Ctrl+X) để di chuyển hoặc Sao chép (Ctrl+C) để nhân bản. Các phím Ctrl+X, Ctrl+C và Ctrl+V cũng dùng trực tiếp trong vùng soạn thảo.",
      "Đặt con trỏ tại vị trí đích trong tài liệu rồi nhấn Dán (Ctrl+V). Khi sao chép nội dung từ phần mềm soạn thảo khác (định dạng .docx), tiêu đề, chữ đậm, danh sách và bảng được giữ theo định dạng nguồn; nếu clipboard chỉ có văn bản, nội dung được dán dưới dạng chữ thuần.",
      "Để sao chép kiểu dáng chữ: bôi đen đoạn mẫu có định dạng ưng ý, nhấn Sao chép định dạng (Ctrl+Shift+C), sau đó quét chuột qua vùng văn bản cần áp dụng kiểu dáng. Chổi tự tắt sau một lần áp dụng.",
      "Nhấn Esc để hủy chổi định dạng khi chưa áp dụng; nút Sao chép định dạng sáng khi chổi đang bật và tắt khi hủy hoặc áp dụng xong.",
      "Có thể dùng Ctrl+Z để hoàn tác hoặc Ctrl+Y để làm lại mọi thao tác trên."
    ]
  },
  {
    id: "writer.clipboard.pasteSpecial",
    app: "writer",
    commandIds: ["writer.edit.pasteSpecial"],
    title: "Dán đặc biệt (Paste Special)",
    summary: "Dán nội dung từ bộ nhớ tạm với các tùy chọn nâng cao: Giữ định dạng nguồn (Ctrl+V) hoặc Chỉ giữ văn bản (Ctrl+Shift+V) để dán nội dung thuần túy bỏ qua mọi định dạng HTML.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["dán đặc biệt", "paste special", "giữ định dạng", "chỉ giữ văn bản", "plain text", "Ctrl+Alt+V", "Ctrl+Shift+V", "bảng nhớ tạm"],
    steps: [
      "Trong phần mềm soạn thảo khác, bôi đen tiêu đề, đoạn chữ, danh sách hoặc bảng cần chuyển rồi nhấn Ctrl+C.",
      "Đặt con trỏ trong tài liệu Doc tại vị trí muốn dán.",
      "Mở tab Trang đầu, nhóm Bảng nhớ tạm: nhấn mũi tên nhỏ bên dưới nút Dán (hoặc Ctrl+Alt+V) để mở hộp thoại Dán đặc biệt.",
      "Chọn Giữ định dạng nguồn để dán theo định dạng nguồn, gồm tiêu đề, chữ đậm/nghiêng, danh sách và bảng.",
      "Chọn Chỉ giữ văn bản để dán nội dung thuần túy, loại bỏ mọi định dạng, kiểu chữ và cấu trúc.",
      "Nhấn Đồng ý hoặc Enter để dán. Mỗi lần dán là một bước Undo (Ctrl+Z) duy nhất."
    ]
  },
{
    id: "writer.keyboard.basicEditing",
    app: "writer",
    commandIds: [],
    title: "Enter, Tab và xuống dòng trong Doc — bàn phím điều hướng",
    summary: "Enter tạo đoạn mới; Shift+Enter xuống dòng trong cùng đoạn. Tab nhập ký tự tab ở văn bản thường, đổi cấp ở đầu mục danh sách và chuyển ô trong bảng.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["Enter", "Shift+Enter", "Tab", "Shift+Tab", "đoạn mới", "xuống dòng", "danh sách", "ô bảng", "phím bàn phím", "F1"],
    steps: [
      "Nhấp vào vùng soạn thảo rồi gõ văn bản. Nhấn Enter để tạo đoạn mới và tiếp tục gõ; con trỏ ở đoạn mới sẽ được giữ nguyên khi kiểm tra chính tả tiếng Việt cập nhật dấu gạch dưới.",
      "Nhấn Shift+Enter để xuống dòng nhưng vẫn ở cùng đoạn. Khi bộ gõ tiếng Việt thay ký tự vừa nhập bằng insertText, tiếp tục gõ tại vị trí con trỏ hiện tại.",
      "Trong đoạn văn thường, nhấn Tab để chèn ký tự tab; ký tự được giữ trong nội dung tài liệu và hiển thị theo điểm dừng 1,27 cm. Shift+Tab ở ngoài danh sách hoặc bảng không chuyển tiêu điểm khỏi trang.",
      "Ở đầu một mục danh sách, nhấn Tab để tăng cấp thụt lề hoặc Shift+Tab để giảm cấp. Trong bảng, Tab chuyển sang ô kế tiếp, Shift+Tab quay về ô trước; Tab ở ô cuối tạo thêm một hàng.",
      "Nhấn F1 để mở Trợ giúp Doc và tìm 'Tab', 'Enter' hoặc 'bảng nhớ tạm' khi cần tra lại."
    ]
  },
  {
    id: "writer.edit.findReplaceSelect",
    app: "writer",
    commandIds: ["common.edit.find", "common.edit.replace", "common.edit.selectAll"],
    title: "Tìm kiếm và Thay thế trong Doc",
    summary: "Hộp thoại Tìm kiếm và Thay thế dùng chung cho Doc với hai tab: Tìm (Ctrl+F) và Thay thế (Ctrl+H). Hỗ trợ ký tự đặc biệt (^p, ^t, ^?), ký tự đại diện, tìm theo định dạng (font, đậm, nghiêng, màu), báo số lần thay thế và Hoàn tác một bước (Ctrl+Z).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm kiếm", "thay thế", "chọn tất cả", "find", "replace", "select all", "Ctrl+F", "Ctrl+H", "Ctrl+A", "Doc", "ký tự đặc biệt", "wildcard", "định dạng"],
    steps: [
      "Truy cập: Mở tab Trang đầu trên thanh ribbon, tại nhóm Chỉnh sửa nhấn nút Tìm kiếm (Ctrl+F) hoặc Thay thế (Ctrl+H) để mở hộp thoại Tìm kiếm và Thay thế.",
      "Tìm kiếm cơ bản: Nhập nội dung vào «Tìm gì:», nhấn «Tìm tiếp» hoặc «Tìm trước». Hộp thoại báo trạng thái tìm thấy và tự động cuộn trang bôi đen kết quả.",
      "Ký tự đặc biệt (^p, ^t, ^?): Nhấn nút «Đặc biệt ▼» để chèn nhanh ký tự đặc biệt: ^p (dấu ngắt đoạn), ^t (ký tự Tab), ^? (bất kỳ ký tự nào), ^w (khoảng trắng), ^^ (dấu mũ), hoặc ^& (chèn lại nội dung tìm được vào ô Thay bằng).",
      "Ký tự đại diện: Đánh dấu «Dùng ký tự đại diện (*, ?)» để tìm theo mẫu: dấu * đại diện cho chuỗi ký tự bất kỳ, dấu ? đại diện cho đúng một ký tự.",
      "Tìm theo định dạng: Nhấn nút «Định dạng…» để lọc theo phông chữ, chữ đậm, chữ nghiêng hoặc màu chữ cụ thể. Nhấn «Xóa định dạng» khi muốn quay lại tìm văn bản thông thường.",
      "Thay thế và báo số lần: Nhấn «Thay thế» để đổi từng vị trí, hoặc nhấn «Thay thế tất cả» để thay thế toàn bộ và xem thông báo tổng số lần đã thay thế thành công.",
      "Đóng và Hoàn tác: Phím Esc đóng hộp thoại. Mọi thao tác thay thế đều có thể hoàn tác ngay bằng Ctrl+Z."
    ]
  },
  {
    id: "writer.insert.hyperlink",
    app: "writer",
    commandIds: ["common.edit.hyperlink"],
    title: "Chèn siêu liên kết (Hyperlink)",
    summary: "Gắn liên kết website, địa chỉ email hoặc liên kết nội bộ vào đoạn văn bản đã chọn bằng hộp thoại Liên kết hoặc phím tắt Ctrl+K.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["liên kết", "siêu liên kết", "hyperlink", "link", "chèn liên kết", "Ctrl+K", "url", "địa chỉ web"],
    steps: [
      "Bôi đen từ hoặc đoạn văn bản muốn gắn liên kết trong tài liệu.",
      "Mở tab Chèn trên thanh ribbon, trong nhóm Liên kết nhấn nút Liên kết (hoặc bấm tổ hợp phím Ctrl+K).",
      "Hộp thoại «Chèn liên kết» dùng chung xuất hiện. Kiểm tra hoặc nhập văn bản hiển thị và địa chỉ web đích (URL đầy đủ, ví dụ: https://example.com) vào ô địa chỉ. Nếu để trống địa chỉ liên kết và bấm Chèn, hộp thoại sẽ hiển thị cảnh báo lỗi «Vui lòng nhập địa chỉ liên kết hợp lệ.» và giữ hộp thoại mở để bạn nhập lại.",
      "Nhấn Chèn hoặc bấm Enter để hoàn tất. Đoạn văn bản sẽ chuyển sang màu xanh dương có gạch chân biểu thị liên kết.",
      "Muốn chỉnh sửa hoặc hủy liên kết: đặt con trỏ tại vị trí liên kết, nhấn lại nút Liên kết (Ctrl+K) hoặc dùng Ctrl+Z để hoàn tác trong đúng một bước."
    ]
  },
  {
    id: "writer.review.spellCheck",
    app: "writer",
    commandIds: ["ai.assistant.grammarCheck", "writer.review.toggleSpellCheck"],
    title: "Soát lỗi chính tả và gợi ý sửa từ tiếng Việt",
    summary: "Kiểm tra toàn diện lỗi chính tả dấu thanh, phụ âm đầu và ngữ pháp văn bản tiếng Việt; gợi ý sửa lỗi trực tiếp qua menu chuột phải hoặc phím tắt F7; hỗ trợ bật/tắt kiểm tra chính tả trên ribbon.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Chính tả & Ngữ pháp" },
    keywords: ["soát lỗi chính tả", "chính tả", "ngữ pháp", "kiểm tra chính tả", "spell check", "grammar", "F7", "tiếng việt", "nghị định 30", "gợi ý chính tả", "chuột phải", "hoàn tác", "Ctrl+Z", "bật tắt chính tả"],
    steps: [
      "Khi soạn thảo văn bản trong Doc, các từ nghi ngờ sai chính tả tiếng Việt sẽ tự động được đánh dấu bằng đường gạch dưới lượn sóng màu đỏ khi bạn tạm dừng gõ (độ trễ ~400 ms) mà không làm nhảy con trỏ. Từ điển tiếng Việt nhận các từ phổ biến như «đạt», «tỷ»; có thể bổ sung tên riêng còn thiếu bằng mục «Thêm vào từ điển».",
      "Tùy chọn Bật/Tắt kiểm tra chính tả: Mở tab Đánh giá, nhóm Chính tả & Ngữ pháp, nhấn nút «Kiểm tra chính tả» để bật hoặc tắt gạch sóng đỏ. Khi tắt, các đường gạch chân đỏ biến mất ngay lập tức; khi bật lại, hệ thống quét và gạch đỏ trở lại. Thiết lập được tự động ghi nhớ cho các phiên làm việc tiếp theo.",
      "Nhấp chuột phải trực tiếp vào từ bị gạch chân để mở menu ngữ cảnh gợi ý: hệ thống tự động ưu tiên các từ đúng dấu thanh và ngữ cảnh liên kết (ví dụ: gợi ý chuẩn «định» khi gõ «quyết đinh»).",
      "Nhấp vào từ gợi ý mong muốn để thay thế ngay lập tức trong văn bản, hoặc nhấp «Bỏ qua» để bỏ qua từ đó trong phiên hiện tại, hoặc «Thêm vào từ điển» để lưu vào từ điển cá nhân dùng chung cả bộ Doc, Sheet, Slide.",
      "Sau khi chọn từ gợi ý để thay thế, bạn có thể nhấn Ctrl+Z để hoàn tác thay thế ngay trong đúng một bước duy nhất và khôi phục lại từ ban đầu.",
      "Để soát lỗi toàn diện, mở tab Đánh giá trên thanh ribbon, tại nhóm Chính tả & Ngữ pháp nhấn nút «Soát lỗi chính tả» (hoặc nhấn phím F7) để quét toàn bộ tài liệu."
    ]
  },
  {
    id: "writer.help.guide",
    app: "writer",
    commandIds: ["writer.help.open"],
    title: "Tra cứu Trợ giúp và Hướng dẫn sử dụng",
    summary: "Mở bảng Hướng dẫn sử dụng tích hợp ngay trong ứng dụng với phím tắt F1, cho phép tra cứu nhanh mọi tính năng theo tên tiếng Việt, từ khóa hoặc vị trí tab ribbon.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["trợ giúp", "hướng dẫn", "help", "F1", "tra cứu", "hướng dẫn sử dụng", "tìm tính năng", "sử dụng writer"],
    steps: [
      "Nhấn phím F1 trên bàn phím tại bất kỳ màn hình nào, hoặc mở tab Trợ giúp trên ribbon rồi nhấn nút Trợ giúp.",
      "Bảng Hướng dẫn sử dụng Doc xuất hiện ở cạnh phải màn hình với danh mục các bài hướng dẫn chi tiết.",
      "Nhập tên tính năng hoặc từ khóa tiếng Việt (có dấu hoặc không dấu, ví dụ: «ngắt trang», «đếm từ», «màu trang») vào ô tìm kiếm ở đầu bảng.",
      "Nhấp vào bài viết trong danh sách kết quả để xem chi tiết: tóm tắt tính năng, vị trí tab/nhóm ribbon và các bước thao tác cụ thể.",
      "Nhấn nút đóng ở góc trên bảng trợ giúp hoặc nhấn lại F1 để thu gọn bảng khi không dùng."
    ]
  },
  {
    id: "writer.ai.core",
    app: "writer",
    commandIds: ["ai.assistant.toggle", "ai.assistant.summarize", "ai.assistant.rewrite"],
    title: "Trợ lý 3T AI: Tóm tắt nhanh và Viết lại văn phong",
    summary: "Bật/tắt thanh bên Trợ lý 3T AI (Alt+J), tự động tóm tắt ý chính của văn bản hoặc trau chuốt lại câu từ theo văn phong hành chính tiếng Việt chuẩn mực.",
    ribbon: { tab: "Trợ lý 3T AI", tabId: "ai", group: "Tính năng AI thuần Việt" },
    keywords: ["trợ lý ai", "tóm tắt nhanh", "viết lại", "ai", "trau chuốt", "văn phong", "Alt+J", "summarize", "rewrite"],
    steps: [
      "Bôi đen đoạn văn bản cần xử lý trong tài liệu (hoặc để trống để xử lý toàn bộ tài liệu).",
      "Mở tab Trợ lý 3T AI trên ribbon, nhóm Tính năng AI thuần Việt.",
      "Nhấn nút Trợ lý 3T AI (hoặc bấm Alt+J) để mở bảng điều khiển AI bên phải màn hình.",
      "Nhấn Tóm tắt nhanh để AI cô đọng nội dung chính thành các điểm gạch đầu dòng rõ ràng, súc tích.",
      "Nhấn Viết lại để AI trau chuốt lại câu từ, sửa câu cụt, chuẩn hóa ngữ pháp và nâng cao độ trang trọng theo phong cách văn bản hành chính Việt Nam.",
      "Xem kết quả hiển thị trên bảng Trợ lý 3T AI và nhấn Chèn vào tài liệu nếu đồng ý với nội dung mới."
    ]
  },
  {
    id: "writer.help.about",
    app: "writer",
    commandIds: ["writer.help.open", "common.help.about"],
    title: "Giới thiệu 3T Office và Giấy phép bản quyền",
    summary: "Xem thông tin phiên bản, bản quyền thương hiệu 3T Technology và danh sách các phần mềm nguồn mở bên thứ ba kèm giấy phép hợp pháp.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["giới thiệu", "about", "phiên bản", "bản quyền", "3t office", "giấy phép", "nguồn mở", "third-party", "license", "doc"],
    steps: [
      "Mở tab Trợ giúp trên thanh ribbon, nhóm Trợ giúp rồi nhấn nút Giới thiệu (hoặc vào menu Tệp rồi chọn Giới thiệu).",
      "Hộp thoại Giới thiệu 3T Office xuất hiện với logo nhận diện 3T và tiêu đề 3T Office — Bộ ứng dụng văn phòng Việt.",
      "Quan sát số hiệu phiên bản hiện hành được lấy trực tiếp từ hệ thống, nhà phát triển 3T Technology và bản quyền sở hữu.",
      "Kiểm tra danh sách các thành phần nguồn mở bên thứ ba và nhấn nút Xem toàn văn giấy phép nếu muốn đọc thông báo giấy phép đầy đủ.",
      "Nhấn nút Đóng hoặc bấm phím Esc trên bàn phím để quay lại làm việc."
    ]
  },
  {
    id: "writer.gettingStarted",
    app: "writer",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print", "common.file.exportPdf"],
    title: "Bắt đầu nhanh: tạo, mở, lưu, in, xuất PDF",
    summary: "Tài liệu mới mở ra trang A4 trống (lề trái 30 mm, phải 15 mm theo NĐ 30). Dùng menu Tệp hoặc phím tắt để tạo mới, mở, lưu, lưu bản sao, in và xuất PDF.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "In ấn" },
    keywords: ["bắt đầu nhanh", "tạo mới", "mở tệp", "lưu", "lưu bản sao", "in", "xuất pdf", "ctrl+n", "ctrl+o", "ctrl+s", "f12", "ctrl+p", "tài liệu trống", "doc"],
    steps: [
      "Tạo tài liệu trống: nhấn Ctrl+N hoặc menu Tệp > Mới. Doc mở một cửa sổ riêng tên Tài liệu 2, Tài liệu 3…; trang A4 có con trỏ ở đoạn đầu và chưa được đánh dấu là đã sửa.",
      "Mở tài liệu: nhấn Ctrl+O hoặc menu Tệp > Mở, chọn DOCX, DOC, ODT, RTF hoặc TXT. Nếu tài liệu hiện tại có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi tiếp tục; Hủy hoặc đóng hộp chọn tệp sẽ giữ tài liệu hiện tại.",
      "Lưu (Ctrl+S): mở hộp thoại Lưu thành cho tài liệu mới. Với tệp đã mở/lưu, Ctrl+S ghi đúng định dạng hiện tại. Nhấn F12 để Lưu bản sao — nhập tên, chọn DOCX, DOC, ODT, RTF, TXT hoặc PDF ở Loại tệp. Chọn PDF chỉ xuất một bản PDF; tài liệu đang mở giữ tên, định dạng và đường dẫn cũ.",
      "In (Ctrl+P): mở Xem trước khi in. Chọn máy in, số bản và phạm vi trang rồi nhấn In. Khi có phần mềm văn phòng khác, Doc dùng bộ dựng PDF đó để giữ phân trang sát bản gốc; nếu không có, bộ dựng tích hợp của 3T Office tự tiếp tục.",
      "Xuất PDF: menu Tệp > Xuất PDF > chọn nơi lưu. Cùng đường dựng với In: phần mềm văn phòng khác nếu có, ngược lại bộ dựng tích hợp của 3T Office."
    ]
  },
  {
    id: "writer.shortcuts",
    app: "writer",
    commandIds: [
      "common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print",
      "common.edit.undo", "common.edit.redo", "common.edit.cut", "common.edit.copy",
      "common.edit.paste", "common.edit.selectAll", "common.edit.find", "common.edit.replace",
      "writer.text.bold", "writer.text.italic", "writer.text.underline"
    ],
    title: "Phím tắt thường dùng (15 phím tắt phổ biến nhất)",
    summary: "Các phím tắt thường dùng giúp thao tác nhanh trong 3T Office: tạo tài liệu, định dạng, tìm kiếm và in. Xem từng bước bên dưới để chọn tổ hợp phím phù hợp. Có thể hoàn tác các thao tác chỉnh sửa được hỗ trợ, rồi làm lại khi cần.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["phím tắt", "shortcut", "ctrl+n", "ctrl+o", "ctrl+s", "f12", "ctrl+p", "ctrl+z", "ctrl+y", "ctrl+x", "ctrl+c", "ctrl+v", "ctrl+a", "ctrl+f", "ctrl+h", "ctrl+b", "ctrl+i", "ctrl+u", "định dạng", "doc"],
    steps: [
      "Tạo mới: Ctrl+N  |  Mở: Ctrl+O  |  Lưu: Ctrl+S  |  Lưu bản sao: F12  |  In: Ctrl+P",
      "Hoàn tác: Ctrl+Z  |  Làm lại: Ctrl+Y",
      "Cắt: Ctrl+X  |  Sao chép: Ctrl+C  |  Dán: Ctrl+V  |  Chọn tất cả: Ctrl+A",
      "Tìm kiếm: Ctrl+F  |  Thay thế: Ctrl+H",
      "Chữ đậm: Ctrl+B  |  Chữ nghiêng: Ctrl+I  |  Gạch chân: Ctrl+U",
      "Các phím tắt khác hữu ích: Ctrl+D (hộp thoại Phông chữ), Ctrl+L/E/R/J (căn trái/giữa/phải/đều), Ctrl+Shift+P (chọn cỡ chữ), Ctrl+Shift+>/< (tăng/giảm cỡ chữ), Ctrl+Shift+L (dấu đầu dòng), Ctrl+* (hiện/ẩn ký tự định dạng), Ctrl+Alt+H (màu nền chữ), Ctrl+Enter (ngắt trang), Ctrl+M (thụt lề), Ctrl+Shift+M (giảm thụt), Ctrl+1/2/5 (giãn dòng 1.0/2.0/1.5), Shift+F3 (đổi chữ hoa/thường), Ctrl+K (liên kết), Ctrl+Home/End (đầu/cuối tài liệu), Ctrl+]/[ (tăng/giảm cỡ 1 pt)."
    ]
  },
  {
    id: "writer.differences",
    app: "writer",
    commandIds: ["writer.insert.equation", "writer.section.continuous"],
    title: "Giới hạn cần biết khi soạn tài liệu",
    summary: "Phương trình và Ngắt mục trong Doc giúp soạn nội dung toán học và chia bố cục tài liệu. Mở Chèn > Ký hiệu > Phương trình để nhập biểu thức. Mở Bố cục > Thiết lập trang > Ngắt trang để chia mục; khi lưu .docx hoặc PDF, mỗi mục giữ khổ giấy và hướng giấy riêng.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["khác biệt", "công thức", "equation", "ngắt mục", "section break", "header", "footer", "khổ giấy", "hướng giấy"],
    steps: [
      "Phương trình: mở Chèn > Ký hiệu > Phương trình hoặc nhấn Alt+=. Nhập biểu thức như a/b hoặc x^2, dùng các nút cấu trúc để thêm phân số, căn và ma trận. Kiểm tra vùng Xem trước rồi nhấn Chèn vào tài liệu. Nhấp đúp phương trình để sửa lại.",
      "Ngắt mục: mở Bố cục > Thiết lập trang > Ngắt trang, chọn Trang kế tiếp, Liên tục, Trang chẵn hoặc Trang lẻ. Mục mới có thiết lập trang riêng trên vùng soạn thảo. Khi lưu .docx hoặc PDF, mỗi mục giữ khổ giấy và hướng giấy riêng (ví dụ phần chính để dọc, phụ lục để ngang). Ngắt cột chỉ có tác dụng khi tài liệu có từ hai cột trở lên.",
      "Các nút này vẫn hiển thị trên ribbon đúng vị trí chuẩn phần mềm soạn thảo văn bản khác. Khi bấm vào, hộp thoại/hành động chạy ngay thay vì chỉ hiện thông báo đang hoàn thiện."
    ]
  },
  {
    id: "writer.table.designHelp",
    app: "writer",
    commandIds: [
      "writer.table.toggleHeaderRow",
      "writer.table.toggleBandedRows",
      "writer.table.cellBg",
      "writer.table.borders"
    ],
    title: "Thiết kế bảng: kiểu hàng, tô màu và viền ô",
    summary: "Tùy biến hiển thị bảng biểu với hàng tiêu đề nổi bật, màu nền xen kẽ, màu tô ô và viền bảng trên tab ngữ cảnh Thiết kế Bảng.",
    ribbon: { tab: "Thiết kế Bảng", tabId: "tableDesign", group: "Tùy chọn kiểu bảng" },
    keywords: ["thiết kế bảng", "table design", "hàng tiêu đề", "hàng xen kẽ", "tô màu ô", "viền bảng", "borders", "shading"],
    steps: [
      "Đặt con trỏ soạn thảo vào bên trong bảng bất kỳ để thanh công cụ tự động hiển thị thêm tab ngữ cảnh Thiết kế Bảng.",
      "Trong nhóm Tùy chọn kiểu bảng, nhấp «Hàng tiêu đề» để bật hoặc tắt chữ đậm và nền sáng cho hàng đầu (khi lưu .docx hoặc in, hàng này tự lặp lại ở đầu mỗi trang nếu bảng dài nhiều trang); nhấp «Hàng xen kẽ» để bật dải màu nền so le giúp bảng nhiều dòng dễ đọc hơn.",
      "Trong nhóm Màu & Viền, nhấp «Tô màu ô» để đổi màu nền cho ô hiện tại hoặc các ô đang chọn; nhấp «Đường viền bảng» để chuyển đổi nhanh giữa có viền đầy đủ hoặc xóa viền bảng.",
      "Mọi thay đổi định dạng bảng đều có thể hoàn tác ngay bằng tổ hợp phím Ctrl+Z hoặc làm lại bằng Ctrl+Y."
    ]
  },
  {
    id: "writer.table.layoutSelectionHelp",
    app: "writer",
    commandIds: [
      "writer.table.selectCell",
      "writer.table.selectRow",
      "writer.table.selectCol",
      "writer.table.selectTable",
      "writer.table.deleteTable"
    ],
    title: "Bố cục bảng: chọn vùng và xóa bảng",
    summary: "Chọn ô, hàng, cột hoặc toàn bộ bảng thành vùng văn bản để sao chép và định dạng; cũng có thể xóa toàn bộ bảng qua tab ngữ cảnh Bố cục Bảng.",
    ribbon: { tab: "Bố cục Bảng", tabId: "tableLayout", group: "Bảng" },
    keywords: ["bố cục bảng", "table layout", "chọn ô", "chọn hàng", "chọn cột", "chọn bảng", "xóa bảng", "tay cầm di chuyển bảng"],
    steps: [
      "Nhấp chuột vào một ô bất kỳ trong bảng để kích hoạt tab ngữ cảnh Bố cục Bảng trên thanh công cụ ribbon.",
      "Trong nhóm Bảng, nhấp «Chọn ô» để chọn nội dung ô; nhấp «Chọn hàng» hoặc «Chọn cột» để bôi chọn vùng tương ứng. Khi con trỏ đang ở trong ô, nhấn Shift+Space để chọn nhanh hàng hiện tại.",
      "Nhấp «Chọn bảng» hoặc bấm tay cầm 4 chiều ở góc trên bên trái bảng để chọn toàn bộ bảng. Vùng chọn có thể dùng với Sao chép và các lệnh định dạng trên ribbon.",
      "Nhấp «Xóa bảng» khi cần gỡ bỏ hoàn toàn bảng biểu khỏi tài liệu mà không để lại ô trống thừa. Nhấn Ctrl+Z nếu muốn khôi phục lại bảng."
    ]
  },
  {
    id: "writer.table.layoutRowsColsHelp",
    app: "writer",
    commandIds: [
      "writer.table.insertRowAbove",
      "writer.table.insertRowBelow",
      "writer.table.deleteRow",
      "writer.table.insertColLeft",
      "writer.table.insertColRight",
      "writer.table.deleteCol"
    ],
    title: "Chèn và xóa hàng, cột trong bảng",
    summary: "Thêm hàng trên/dưới hoặc cột trái/phải, xóa hàng hoặc cột hiện tại một cách trực quan trên tab Bố cục Bảng.",
    ribbon: { tab: "Bố cục Bảng", tabId: "tableLayout", group: "Hàng & Cột" },
    keywords: ["chèn hàng", "chèn cột", "xóa hàng", "xóa cột", "insert row", "insert column", "delete row", "delete column", "hàng và cột"],
    steps: [
      "Đặt con trỏ vào ô tại vị trí cần thêm hoặc bớt dữ liệu, sau đó chuyển sang tab Bố cục Bảng.",
      "Để thêm hàng: trong nhóm Hàng & Cột, nhấp «Chèn hàng phía trên» hoặc «Chèn hàng phía dưới». Một hàng mới nguyên vẹn sẽ được tạo ngay sát vị trí con trỏ.",
      "Để thêm cột: trong cùng nhóm, nhấp «Chèn cột bên trái» hoặc «Chèn cột bên phải». Tất cả các hàng trong bảng sẽ tự động nhận thêm một ô cột mới tương ứng.",
      "Để xóa: nhấp «Xóa hàng» để bỏ hàng đang chứa con trỏ, hoặc «Xóa cột» để bỏ cột hiện tại. Nếu xóa hàng hoặc cột duy nhất còn lại, bảng sẽ tự động được xóa an toàn."
    ]
  },
  {
    id: "writer.table.layoutMergeDistributeHelp",
    app: "writer",
    commandIds: [
      "writer.table.mergeCells",
      "writer.table.splitCells",
      "writer.table.autoFitContents",
      "writer.table.autoFitWindow",
      "writer.table.distributeRows",
      "writer.table.distributeCols",
      "writer.table.alignTop",
      "writer.table.alignMiddle",
      "writer.table.alignBottom"
    ],
    title: "Gộp, tách ô, phân bố kích thước và căn lề ô",
    summary: "Gộp/tách ô, tự động vừa bảng theo nội dung hoặc chiều rộng trang, phân bố hàng cột và căn chỉnh chữ trong ô.",
    ribbon: { tab: "Bố cục Bảng", tabId: "tableLayout", group: "Hợp nhất" },
    keywords: ["gộp ô", "tách ô", "merge cells", "split cells", "phân bố đều", "distribute rows", "distribute columns", "căn lề ô", "căn đỉnh", "căn giữa dọc", "căn đáy"],
    steps: [
      "Kéo chuột quét chọn ít nhất hai ô liền kề trong bảng, sau đó tại nhóm Hợp nhất trên tab Bố cục Bảng, nhấp «Gộp ô» để hợp nhất thành một ô lớn. Nếu chưa chọn đủ hai ô, ứng dụng sẽ báo cách khắc phục; nội dung chữ giữa các ô được nối lại tự động.",
      "Để tách ô đã gộp, đặt con trỏ vào ô đó rồi nhấp «Tách ô». Các ô trống được tạo lại theo số hàng và cột của vùng đã gộp; một lần Ctrl+Z hoàn tác lần tách vừa thực hiện.",
      "Trong nhóm Kích cỡ ô, nhấp «Phân bố đều hàng» để cân bằng chiều cao các dòng, hoặc «Phân bố đều cột» để chia lại chiều rộng các cột đều nhau 100%. Bạn cũng có thể rê chuột vào vạch ngăn giữa hai cột để kéo chuột chỉnh độ rộng từng cột tùy ý.",
      "Để bảng co theo nội dung, đặt con trỏ trong bảng, mở Bố cục Bảng > Kích cỡ ô và nhấp «Vừa nội dung». Để bảng phủ hết vùng soạn thảo giữa hai lề trang, nhấp «Vừa cửa sổ». Hai lệnh tự bỏ độ rộng cột đã đặt trước đó; dùng Ctrl+Z để hoàn tác.",
      "Trong nhóm Căn lề ô, nhấp «Căn đỉnh ô», «Căn giữa dọc ô» hoặc «Căn đáy ô» để bố trí vị trí chữ theo chiều dọc bên trong ô theo đúng ý muốn."
    ]
  },
  {
    id: "writer.image.resizeWrap",
    app: "writer",
    commandIds: ["writer.image.resize", "writer.image.wrap"],
    title: "Thay đổi kích thước và ngắt dòng ảnh",
    summary: "Thay đổi kích thước hình ảnh bằng 8 tay cầm co giãn hoặc nhập số đo trực tiếp; tùy chỉnh ngắt dòng văn bản quanh ảnh.",
    ribbon: { tab: "Định dạng ảnh", tabId: "pictureFormat", group: "Sắp xếp & Kích thước" },
    keywords: ["thay đổi kích thước ảnh", "resize", "ngắt dòng ảnh", "wrap text", "tay cầm", "tỷ lệ khung hình", "aspect ratio", "hình ảnh", "kích thước"],
    steps: [
      "Nhấp chuột vào hình ảnh trong tài liệu để chọn ảnh. Thanh công cụ sẽ xuất hiện tab ngữ cảnh Định dạng Hình ảnh và trên ảnh hiển thị khung viền cùng 8 tay cầm co giãn.",
      "Kéo một trong 4 tay cầm ở các góc để thay đổi kích thước ảnh mà vẫn giữ nguyên tỷ lệ khung hình; hoặc kéo các tay cầm ở 4 cạnh để kéo giãn theo một chiều.",
      "Nhập trực tiếp số đo chiều Cao (px) và chiều Rộng (px) tại nhóm Sắp xếp & Kích thước trên tab Định dạng Hình ảnh để đặt kích thước chính xác.",
      "Chọn kiểu trong danh sách Ngắt dòng văn bản trên tab Định dạng ảnh để chọn kiểu bọc chữ (Vuông, Khít, Phía sau văn bản, Phía trước văn bản, Trên và dưới, Cùng dòng với văn bản). Chọn Vị trí để đặt ảnh theo lưới; dùng các ô Cao/Rộng để nhập kích thước chính xác. Các lựa chọn này được lưu vào DOCX."
    ]
  },
  {
    id: "writer.list.restartContinue",
    app: "writer",
    commandIds: ["writer.list.restartNumbering", "writer.list.continueNumbering"],
    title: "Đánh số lại từ 1 và tiếp tục đánh số danh sách",
    summary: "Bắt đầu lại việc đánh số thứ tự từ 1 cho danh sách hoặc tiếp tục đánh số liền mạch từ danh sách trước đó.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["đánh số lại từ 1", "restart numbering", "tiếp tục đánh số", "continue numbering", "danh sách số", "đánh số", "thứ tự", "chuột phải danh sách"],
    steps: [
      "Đặt con trỏ vào mục danh sách số cần thay đổi đánh số trong tài liệu.",
      "Mở menu tùy chọn bằng một trong hai cách: (1) Nhấp chuột phải trực tiếp vào mục danh sách số để mở menu ngữ cảnh; hoặc (2) Trên tab Trang đầu, nhóm Đoạn văn, nhấp vào mũi tên Tùy chọn đánh số cạnh nút Đánh số.",
      "Chọn «Đánh số lại từ 1» để bắt đầu đánh số lại thứ tự từ 1 cho danh sách hiện tại. Các mục kế tiếp sẽ tự động tăng số theo thứ tự 2, 3…",
      "Chọn «Tiếp tục đánh số» để liên kết số thứ tự nối tiếp với danh sách số phía trước trong tài liệu. Bạn có thể nhấn Ctrl+Z để hoàn tác bất kỳ lúc nào."
    ]
  },
  {
    id: "writer.mouse.operations",
    app: "writer",
    commandIds: ["common.edit.selectAll"],
    title: "Thao tác chuột tương tác văn bản và bảng",
    summary: "Sử dụng chuột tự nhiên và trực quan: nhấp đúp chọn từ, nhấp ba chọn đoạn, kéo thả di chuyển/sao chép văn bản, nhấp đúp và kéo viền bảng để đổi kích thước.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chuột", "nhấp đúp", "nhấp ba", "kéo thả", "chọn từ", "chọn đoạn", "viền bảng", "tự vừa cột", "auto-fit", "Ctrl+kéo", "Ctrl+cuộn"],
    steps: [
      "Nhấp đúp chuột vào một từ để chọn nhanh toàn bộ từ đó. Nhấp chuột 3 lần liên tiếp (triple-click) vào bất kỳ vị trí nào trong đoạn để bôi đen trọn vẹn cả đoạn văn bản.",
      "Kéo chuột để bôi đen một vùng văn bản bất kỳ. Sau khi bôi đen, nhấp giữ chuột trái trên vùng chữ đã chọn rồi kéo sang vị trí khác để di chuyển (Move). Giữ phím Ctrl trong lúc kéo để sao chép (Copy) sang vị trí đích. Nhấn Ctrl+Z để hoàn tác.",
      "Trong bảng, di chuột tới đường viền giữa hai cột (hoặc hai hàng) đến khi con trỏ chuột đổi dạng mũi tên hai chiều. Kéo chuột để thay đổi độ rộng cột hoặc chiều cao hàng. Nhấp đúp chuột vào viền phải cột để tự động vừa khít độ rộng theo nội dung (Auto-fit).",
      "Giữ phím Ctrl và cuộn bánh xe chuột để phóng to hoặc thu nhỏ trang hiển thị."
    ]
  },
  {
    id: "writer.insert.coverPage",
    app: "writer",
    commandIds: ["writer.insert.coverPage", "writer.insert.removeCoverPage"],
    title: "Chèn và quản lý trang bìa",
    summary: "Thêm trang bìa hành chính hoặc báo cáo được thiết kế sẵn vào đầu tài liệu với các trường Tiêu đề, Phụ đề, Tác giả, Đơn vị và Ngày có thể sửa trực tiếp.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Trang văn bản" },
    keywords: ["trang bìa", "cover page", "bìa báo cáo", "mẫu trang bìa", "tiêu đề trang bìa", "gỡ trang bìa"],
    steps: [
      "Mở tab Chèn, nhóm Trang văn bản và bấm nút Trang bìa.",
      "Trong hộp thoại Thư viện trang bìa, dùng các phím mũi tên hoặc nhấp chuột để chọn một trong 4 mẫu thiết kế hành chính và báo cáo (Công văn - Quyết định, Báo cáo có khung viền, Hiện đại dải màu, Hợp đồng tiêu đề lớn).",
      "Nhập nội dung các trường Tiêu đề, Phụ đề, Đơn vị, Tác giả và Ngày (hoặc giữ nguyên để sửa sau), rồi bấm nút Chèn trang bìa.",
      "Doc sẽ tự động chèn trang bìa vào đầu tài liệu kèm một ngắt trang ngay sau trang bìa. Nhấp chuột trực tiếp vào từng ô văn bản trên trang bìa để chỉnh sửa.",
      "Để đổi sang mẫu khác hoặc gỡ bỏ: bấm lại Trang bìa trên ribbon, chọn mẫu mới để thay thế hoặc bấm nút Gỡ trang bìa (hoặc gọi lệnh Gỡ trang bìa) để xóa trang bìa cùng ngắt trang kèm theo. Bấm Ctrl+Z ngay sau khi chèn để hoàn tác chỉ trong một bước."
    ]
  }
,
{
  "id": "writer.table.colorAndBordersHelp",
  "app": "writer",
  "commandIds": [
    "writer.table.cellBg",
    "writer.table.borders",
    "writer.table.bordersAll",
    "writer.table.bordersOutside",
    "writer.table.bordersInside",
    "writer.table.bordersNone"
  ],
  "title": "Tô màu ô và đường viền bảng",
  "summary": "Tô nền ô và chọn viền ngoài, viền trong, tất cả đường viền hoặc ẩn viền trên tab ngữ cảnh Thiết kế Bảng.",
  "ribbon": {
    "tab": "Thiết kế Bảng",
    "tabId": "tableDesign",
    "group": "Màu & Viền"
  },
  "keywords": [
    "tô màu ô",
    "đường viền bảng",
    "cell bg",
    "borders",
    "màu nền ô",
    "viền bảng"
  ],
  "steps": [
    "Đặt con trỏ vào ô hoặc bôi đen khối ô cần tô màu / tạo viền trong bảng.",
    "Chuyển sang tab ngữ cảnh Thiết kế Bảng, nhìn tới nhóm Màu & Viền.",
    "Bấm nút «Tô màu ô» để tô ô đang chọn bằng màu nền hiện tại.",
    "Mở mũi tên «Đường viền bảng», rồi chọn «Tất cả đường viền», «Viền ngoài», «Viền trong» hoặc «Không viền». Khi đã chọn một vùng ô, các lệnh áp dụng quanh hoặc bên trong vùng đó. Bấm Ctrl+Z để hoàn tác."
  ]
},
{
  "id": "writer.table.distributeSizeHelp",
  "app": "writer",
  "commandIds": [
    "writer.table.distributeRows",
    "writer.table.distributeCols"
  ],
  "title": "Phân bố đều hàng và cột trong bảng",
  "summary": "Cân bằng kích thước hàng và cột trong bảng đều nhau 100% qua nhóm Kích cỡ ô thuộc tab Bố cục Bảng.",
  "ribbon": {
    "tab": "Bố cục Bảng",
    "tabId": "tableLayout",
    "group": "Kích cỡ ô"
  },
  "keywords": [
    "phân bố đều hàng",
    "phân bố đều cột",
    "distribute rows",
    "distribute cols",
    "kích cỡ ô"
  ],
  "steps": [
    "Bôi đen các hàng hoặc cột trong bảng cần phân bố lại kích thước.",
    "Mở tab Bố cục Bảng, nhìn sang nhóm Kích cỡ ô.",
    "Nhấp nút «Phân bố đều hàng» để dàn đều chiều cao các hàng, hoặc «Phân bố đều cột» để chia lại độ rộng các cột bằng nhau.",
    "Có thể rê vạch phân cách giữa hai cột để tùy chỉnh chiều rộng theo ý muốn. Bấm Ctrl+Z nếu muốn quay lại."
  ]
},
{
  "id": "writer.table.cellAlignmentHelp",
  "app": "writer",
  "commandIds": [
    "writer.table.alignTop",
    "writer.table.alignMiddle",
    "writer.table.alignBottom"
  ],
  "title": "Căn lề ô theo chiều dọc trong bảng",
  "summary": "Định vị vị trí văn bản theo chiều dọc trong ô bảng: căn đỉnh, căn giữa hoặc căn đáy từ nhóm Căn lề ô trên tab Bố cục Bảng.",
  "ribbon": {
    "tab": "Bố cục Bảng",
    "tabId": "tableLayout",
    "group": "Căn lề ô"
  },
  "keywords": [
    "căn lề ô",
    "căn đỉnh",
    "căn giữa dọc",
    "căn đáy",
    "align top",
    "align middle",
    "align bottom"
  ],
  "steps": [
    "Chọn các ô trong bảng cần căn chỉnh vị trí dọc.",
    "Chuyển sang tab Bố cục Bảng, tới nhóm Căn lề ô.",
    "Nhấp «Căn đỉnh ô» để chữ áp sát mép trên, «Căn giữa dọc ô» để chữ lơ chửng ở giữa ô, hoặc «Căn đáy ô» để chữ sát mép dưới.",
    "Kết hợp với căn lề trái/giữa/phải ở tab Trang đầu để có vị trí căn ô mong muốn."
  ]
},
{
  "id": "writer.insert.crossReferenceHelp",
  "app": "writer",
  "commandIds": [
    "writer.insert.crossReference"
  ],
  "title": "Chèn tham chiếu chéo (Cross Reference)",
  "summary": "Tạo liên kết tham chiếu đến tiêu đề, hình ảnh, bảng biểu hoặc đánh dấu Bookmark trong tài liệu qua nhóm Chú thích ảnh trên tab Tham chiếu.",
  "ribbon": {
    "tab": "Tham chiếu",
    "tabId": "references",
    "group": "Chú thích ảnh"
  },
  "keywords": [
    "tham chiếu chéo",
    "cross reference",
    "liên kết tiêu đề",
    "tham chiếu hình",
    "bookmark"
  ],
  "steps": [
    "Đặt con trỏ tại vị trí muốn chèn tham chiếu chéo trong văn bản.",
    "Mở tab Tham chiếu, tại nhóm Chú thích ảnh, nhấn nút «Tham chiếu chéo».",
    "Trong hộp thoại xuất hiện, chọn Loại tham chiếu (Tiêu đề, Hình, Bảng hoặc Bookmark) và chọn vị trí đích cần tham chiếu tới.",
    "Nhấn Chèn để chèn văn bản liên kết nhảy trực tiếp tới vị trí đã chọn. Bấm Esc để đóng hộp thoại."
  ]
},
{
  "id": "writer.mailMerge.insertFieldHelp",
  "app": "writer",
  "commandIds": [
    "writer.mailMerge.insertField"
  ],
  "title": "Chèn trường trộn thư",
  "summary": "Chèn các trường dữ liệu động như Họ tên, Địa chỉ từ danh sách người nhận vào mẫu thư qua nhóm Viết & Chèn trường trên tab Trộn thư.",
  "ribbon": {
    "tab": "Trộn thư",
    "tabId": "mailings",
    "group": "Viết & Chèn trường"
  },
  "keywords": [
    "chèn trường",
    "insert merge field",
    "trường trộn thư",
    "họ tên",
    "địa chỉ"
  ],
  "steps": [
    "Đặt con trỏ tại vị trí cần chèn thông tin động trong mẫu thư.",
    "Mở tab Trộn thư, nhóm Viết & Chèn trường, bấm nút «Chèn trường trộn».",
    "Chọn tên trường (ví dụ: Họ_và_Tên, Chức_vụ, Công_ty) từ danh sách.",
    "Trường được chèn vào văn bản dưới dạng mã chèn «Họ_và_Tên». Khi trộn thư, mã này sẽ tự động thay bằng dữ liệu thật."
  ]
},
{
  "id": "writer.mailMerge.previewHelp",
  "app": "writer",
  "commandIds": [
    "writer.mailMerge.preview",
    "writer.mailMerge.prevRecord",
    "writer.mailMerge.nextRecord"
  ],
  "title": "Xem trước kết quả trộn thư và chuyển bản ghi",
  "summary": "Xem trước dữ liệu thật thay thế cho mã trường và duyệt qua lại giữa các người nhận qua nhóm Xem trước kết quả trên tab Trộn thư.",
  "ribbon": {
    "tab": "Trộn thư",
    "tabId": "mailings",
    "group": "Xem trước kết quả"
  },
  "keywords": [
    "xem trước kết quả",
    "preview results",
    "chuyển bản ghi",
    "bản ghi tiếp",
    "bản ghi trước"
  ],
  "steps": [
    "Mở tab Trộn thư, tại nhóm Xem trước kết quả, nhấp nút «Xem trước kết quả».",
    "Các mã trường trong tài liệu lập tức chuyển thành dữ liệu thực tế của người nhận đầu tiên.",
    "Bấm nút «Bản ghi trước» hoặc «Bản ghi tiếp» để xem thư của các người nhận khác trong danh sách.",
    "Bấm lại nút «Xem trước kết quả» để trở về dạng mã trường ban đầu."
  ]
},
{
  "id": "writer.mailMerge.finishHelp",
  "app": "writer",
  "commandIds": [
    "writer.mailMerge.finish"
  ],
  "title": "Hoàn tất và xuất kết quả trộn thư",
  "summary": "Tạo tài liệu mới chứa toàn bộ thư đã trộn hoặc in trực tiếp ra máy in từ nhóm Hoàn tất trên tab Trộn thư.",
  "ribbon": {
    "tab": "Trộn thư",
    "tabId": "mailings",
    "group": "Hoàn tất"
  },
  "keywords": [
    "hoàn tất trộn thư",
    "finish merge",
    "xuất thư",
    "in thư hàng loạt"
  ],
  "steps": [
    "Sau khi kiểm tra mẫu thư và dữ liệu, mở tab Trộn thư, nhóm Hoàn tất.",
    "Nhấp nút «Hoàn tất & Trộn» để mở danh sách tùy chọn.",
    "Chọn «Chỉnh sửa tài liệu riêng lẻ» để tạo một tệp Doc mới chứa tất cả các thư đã thay dữ liệu, hoặc chọn «In tài liệu» để gửi trực tiếp tới máy in.",
    "Xác nhận phạm vi bản ghi cần trộn (Tất cả, Bản ghi hiện tại hoặc Từ... đến...). Nhấn OK để thực thi."
  ]
},
{
  "id": "writer.view.pageWidthHelp",
  "app": "writer",
  "commandIds": [
    "writer.view.pageWidth"
  ],
  "title": "Thu phóng vừa chiều rộng khổ trang",
  "summary": "Tự động co giãn kích thước trang soạn thảo vừa khít chiều rộng cửa sổ ứng dụng từ nhóm Thu phóng trên tab Chế độ xem.",
  "ribbon": {
    "tab": "Chế độ xem",
    "tabId": "view",
    "group": "Thu phóng"
  },
  "keywords": [
    "vừa chiều rộng",
    "page width",
    "vừa khổ trang",
    "thu phóng chiều rộng"
  ],
  "steps": [
    "Mở tab Chế độ xem trên thanh ribbon.",
    "Tại nhóm Thu phóng, nhấp chọn tùy chọn «Chiều rộng trang».",
    "Tỉ lệ hiển thị tài liệu tự động điều chỉnh sao cho mép trái và mép phải trang giấy vừa khít khung nhìn cửa sổ (trong khoảng 50%–200%).",
    "Nhấn 100% hoặc Đặt lại nếu muốn đưa tỉ lệ về kích thước 1:1 mặc định."
  ]
},
{
  "id": "writer.view.newWindowHelp",
  "app": "writer",
  "commandIds": [
    "writer.view.newWindow"
  ],
  "title": "Mở cửa sổ Writer mới",
  "summary": "Mở một tài liệu Writer trắng, độc lập từ nhóm Cửa sổ trên tab Chế độ xem.",
  "ribbon": {
    "tab": "Chế độ xem",
    "tabId": "view",
    "group": "Cửa sổ"
  },
  "keywords": [
    "cửa sổ mới",
    "new window",
    "tài liệu mới",
    "cửa sổ desktop"
  ],
  "steps": [
    "Mở tab Chế độ xem trên thanh ribbon.",
    "Tại nhóm Cửa sổ, nhấp nút «Cửa sổ mới».",
    "Ứng dụng desktop mở thêm một cửa sổ Writer với tài liệu trắng và tên Tài liệu N.docx; cửa sổ đang soạn vẫn giữ nguyên.",
    "Hai cửa sổ là hai tài liệu độc lập. Lưu từng tài liệu bằng Ctrl+S; đóng một cửa sổ không đóng cửa sổ còn lại."
  ]
},
{
  "id": "writer.comment.insertRibbonHelp",
  "app": "writer",
  "commandIds": [
    "writer.comment.insert"
  ],
  "title": "Chèn ghi chú vào văn bản từ tab Chèn",
  "summary": "Thêm ý kiến nhận xét hoặc ghi chú thảo luận tại vị trí con trỏ qua nhóm Ghi chú trên tab Chèn hoặc tab Đánh giá.",
  "ribbon": {
    "tab": "Chèn",
    "tabId": "insert",
    "group": "Ghi chú"
  },
  "keywords": [
    "chèn ghi chú",
    "insert comment",
    "ghi chú văn bản",
    "thảo luận"
  ],
  "steps": [
    "Đặt con trỏ hoặc bôi đen cụm từ cần ghi chú trong văn bản.",
    "Mở tab Chèn (hoặc tab Đánh giá), nhóm Ghi chú, nhấp nút «Ghi chú» (hoặc nhấn Ctrl+Alt+M).",
    "Khung ghi chú xuất hiện ở lề phải văn bản kèm tên người dùng và thời gian.",
    "Nhập nội dung ghi chú. Nhấp ra ngoài hoặc bấm Esc để hoàn tất. Bấm nút Xóa ghi chú trên tab Đánh giá để gỡ bỏ."
  ]
},
{
  "id": "writer.para.layoutParagraphHelp",
  "app": "writer",
  "commandIds": [
    "writer.para.indentDec",
    "writer.para.indentInc",
    "writer.para.spacing1",
    "writer.para.spacing15",
    "writer.para.spacing2",
    "writer.para.lineSpacing"
  ],
  "title": "Định dạng thụt lề và giãn dòng đoạn văn trên tab Bố cục",
  "summary": "Điều chỉnh thụt lề trái/phải và các mức giãn khoảng cách dòng/đoạn văn trực quan từ nhóm Đoạn văn trên tab Bố cục.",
  "ribbon": {
    "tab": "Bố cục",
    "tabId": "layout",
    "group": "Đoạn văn"
  },
  "keywords": [
    "thụt lề bố cục",
    "giãn dòng bố cục",
    "khoảng cách đoạn bố cục",
    "indent layout",
    "line spacing layout"
  ],
  "steps": [
    "Đặt con trỏ trong đoạn (hoặc chọn nhiều đoạn văn) cần định dạng.",
    "Mở tab Bố cục, tìm đến nhóm Đoạn văn.",
    "Dùng các nút Tăng/Giảm thụt lề để đẩy đoạn sang phải hoặc lùi sang trái.",
    "Dùng danh sách Giãn dòng (Đơn 1.0, 1.5 dòng, Kép 2.0) để đổi khoảng cách giữa các dòng trong đoạn. Nhấn Ctrl+Z để hoàn tác."
  ]
},
{
  "id": "writer.page.insertPageBreakHelp",
  "app": "writer",
  "commandIds": [
    "writer.page.break"
  ],
  "title": "Chèn ngắt trang từ tab Chèn",
  "summary": "Ngắt dòng và bắt đầu một trang mới ngay tại vị trí con trỏ qua nhóm Trang văn bản trên tab Chèn hoặc nhấn phím tắt Ctrl+Enter.",
  "ribbon": {
    "tab": "Chèn",
    "tabId": "insert",
    "group": "Trang văn bản"
  },
  "keywords": [
    "chèn ngắt trang",
    "page break insert",
    "ngắt trang tab chèn",
    "ctrl+enter"
  ],
  "steps": [
    "Đặt con trỏ tại vị trí muốn kết thúc trang hiện tại và bắt đầu trang mới.",
    "Mở tab Chèn, nhóm Trang văn bản, nhấp nút «Ngắt trang» (hoặc nhấn tổ hợp phím Ctrl+Enter).",
    "Nội dung phía sau con trỏ ngay lập tức chuyển sang đầu trang kế tiếp.",
    "Muốn xóa ngắt trang: đặt con trỏ tại vị trí đầu trang mới rồi nhấn phím Backspace hoặc Delete."
  ]
}
,
{
  "id": "writer.page.watermarkBorderLayout",
  "app": "writer",
  "commandIds": [
    "writer.page.watermark",
    "writer.page.border"
  ],
  "title": "Hình mờ và viền trang trên tab Bố cục",
  "summary": "Chèn hình mờ (watermark) mờ bảo vệ bản quyền và tạo viền bao xung quanh trang tài liệu từ nhóm Nền & Viền trang trên tab Bố cục.",
  "ribbon": {
    "tab": "Bố cục",
    "tabId": "layout",
    "group": "Nền & Viền trang"
  },
  "keywords": [
    "hình mờ bố cục",
    "viền trang bố cục",
    "watermark layout",
    "page border layout"
  ],
  "steps": [
    "Mở tab Bố cục trên thanh ribbon, tới nhóm Nền & Viền trang.",
    "Bấm nút «Hình mờ» để mở hộp thoại thiết lập hình mờ văn bản (Watermark).",
    "Chọn từ các mẫu chữ chèn mờ có sẵn (DỰ THẢO, MẬT, TUYỆT MẬT, KHẨN, BẢN SAO) hoặc nhập nội dung tùy ý. Ô nội dung bắt buộc phải có chữ; nếu để trống và bấm Áp dụng, hệ thống sẽ báo lỗi «Vui lòng nhập nội dung hình mờ; để xóa, hãy dùng nút Xóa hình mờ.» và giữ hộp thoại mở.",
    "Tùy chỉnh góc nghiêng (chéo 45°, −45°, ngang 0°), màu chữ và độ mờ theo ý muốn rồi nhấn Áp dụng.",
    "Bấm nút «Viền trang» trong cùng nhóm để chọn kiểu nét liền, nét đứt hoặc nét đôi bao quanh các trang giấy.",
    "Bấm Ctrl+Z để hoàn tác hoặc dùng nút gỡ bỏ trong từng hộp thoại bất kỳ lúc nào."
  ]
},
{
  "id": "writer.format.paragraphHomeHelp",
  "app": "writer",
  "commandIds": [
    "writer.format.paragraphDialog"
  ],
  "title": "Hộp thoại Đoạn văn từ tab Trang đầu",
  "summary": "Mở hộp thoại Đoạn văn để thiết lập đầy đủ thụt lề, khoảng cách dòng và đoạn văn từ nút mở rộng nhóm Đoạn văn trên tab Trang đầu hoặc Bố cục.",
  "ribbon": {
    "tab": "Trang đầu",
    "tabId": "home",
    "group": "Đoạn văn"
  },
  "keywords": [
    "hộp thoại đoạn văn trang đầu",
    "paragraph dialog home",
    "thụt lề trang đầu",
    "khoảng cách dòng",
    "line spacing"
  ],
  "steps": [
    "Đặt con trỏ trong đoạn văn cần chỉnh sửa hoặc bôi đen nhiều đoạn văn bản.",
    "Mở tab Trang đầu (hoặc tab Bố cục) trên thanh ribbon.",
    "Nhấp vào nút mũi tên nhỏ ở góc dưới bên phải nhóm Đoạn văn (launcher) hoặc nhấp chuột phải vào văn bản và chọn Đoạn văn...",
    "Trong tab «Thụt lề và khoảng cách»: chọn Căn lề, chỉnh Thụt lề trái/phải (mm), Thụt dòng đặc biệt (Dòng đầu tiên hoặc Thụt lề treo) và Khoảng cách trước/sau (pt), Giãn dòng. Nếu nhập giá trị không hợp lệ (ngoài khoảng -100 đến 100 mm cho thụt lề, 0 đến 500 pt cho khoảng cách, hoặc tổng thụt lề vượt quá bề rộng trang), hộp thoại sẽ hiển thị cảnh báo lỗi bằng tiếng Việt và giữ nguyên để sửa lại.",
    "Chuyển sang tab «Dòng và ngắt trang» để thiết lập các tùy chọn phân trang như Ngắt trang trước đoạn, Giữ với đoạn kế tiếp hoặc Kiểm soát dòng đầu/cuối mồ côi.",
    "Bấm Áp dụng (hoặc nhấn Enter) để thực hiện định dạng; bấm Đặt lại để quay về thông số ban đầu, hoặc bấm Hủy / nhấn Esc để đóng hộp thoại mà không thay đổi."
  ]
},
{
  id: "writer.file.documentProperties",
  app: "writer",
  commandIds: ["writer.file.properties"],
  title: "Thuộc tính tài liệu",
  summary: "Khai báo tiêu đề, tác giả, chủ đề, từ khóa và ghi chú để người nhận dễ nhận biết, tìm kiếm và quản lý tài liệu DOCX.",
  ribbon: { tab: "Tệp", tabId: "file", group: "Thông tin" },
  keywords: ["thuộc tính tài liệu", "tiêu đề", "tác giả", "chủ đề", "từ khóa", "ghi chú", "thông tin docx"],
  steps: [
    "Mở Tệp, chọn Thông tin để mở hộp Thuộc tính tài liệu.",
    "Nhập Tiêu đề, Tác giả và Chủ đề. Ở ô Từ khóa, có thể phân tách nhiều từ bằng dấu phẩy hoặc dấu chấm phẩy; ô Ghi chú dùng cho mô tả dài hơn.",
    "Bấm Đồng ý để áp dụng. Thanh trạng thái nhắc rằng tài liệu cần được lưu; nếu bấm Hủy bỏ hoặc nhấn Esc, các giá trị cũ được giữ nguyên.",
    "Nhấn Ctrl+S hoặc chọn Tệp > Lưu. Với DOCX, năm trường được ghi vào thuộc tính lõi của tệp và được nạp lại khi mở tài liệu lần sau."
  ]
},
{
  id: "writer.options.autoCorrect",
  app: "writer",
  commandIds: ["writer.file.options"],
  title: "Tự sửa lỗi gõ và ký tự thông minh",
  summary: "Tự thay lỗi gõ theo bảng riêng, viết hoa đầu câu và đổi ngoặc, gạch ngang, phân số sau khi từ đã được bộ gõ tiếng Việt hoàn tất.",
  ribbon: { tab: "Tệp", tabId: "file", group: "Tùy chọn" },
  keywords: ["tự sửa", "autocorrect", "ngoặc thông minh", "nháy đơn", "gạch ngang", "phân số", "viết hoa đầu câu", "unikey", "evkey", "telex"],
  steps: [
    "Mở Tệp > Tùy chọn, tìm nhóm Tự sửa lỗi gõ. Chọn hoặc bỏ chọn Bật Tự sửa lỗi gõ trong Doc để bật hoặc tắt toàn bộ tính năng.",
    "Dùng các ô riêng để bật Thay văn bản khi gõ, viết hoa chữ đầu câu, ngoặc thông minh, đổi -- thành – và đổi 1/2 thành ½.",
    "Trong bảng Thay/Bằng, bấm Thêm dòng để khai báo cặp mới, ví dụ «teh» thành «the»; bấm nút × ở cuối dòng để xóa. Mỗi dòng phải có đủ hai giá trị, nếu không hộp thoại sẽ báo lỗi và không đóng.",
    "Bấm Đồng ý để lưu lựa chọn trên máy. Khi soạn thảo, cặp thay thế và viết hoa được áp dụng lúc gõ dấu cách hoặc dấu câu; ©, ½, – và ngoặc thông minh được đổi ngay khi mẫu hoàn tất.",
    "Với Unikey, EVKey hoặc kiểu gõ Telex, hãy gõ bình thường. Doc bỏ qua sự kiện khi bộ gõ còn đang ghép chữ/đặt dấu và chỉ sửa từ đã chốt, vì vậy chuỗi tiếng Việt đang gõ dở không bị can thiệp."
  ]
}
];
