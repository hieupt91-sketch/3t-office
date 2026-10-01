/**
 * 3T Office Help Entries — Hướng dẫn các Hộp thoại (Retro Dialogs)
 * Đảm bảo mọi hộp thoại quan trọng trong Doc, Sheet, Slide và Platform đều có hướng dẫn chi tiết.
 * Tuân thủ quy định AGENTS.md §10: Tiếng Việt thật, chi tiết, không placeholder.
 * Naming quy chuẩn: Sản phẩm '3T Office', các ứng dụng viết ngắn gọn: Doc, Sheet, Slide (không tiền tố 3T).
 * Tuyệt đối không dùng tên sản phẩm độc quyền của Microsoft.
 */

export const RETRO_DIALOGS_HELP_ENTRIES = [
  // --- DOC DIALOGS ---
  {
    id: "writer.dialog.pageSetupHelp",
    app: "writer",
    commandIds: ["writer.page.setupDialog"],
    title: "Hộp thoại Thiết lập trang (Page Setup)",
    summary: "Cấu hình lề giấy, hướng in dọc hay ngang, khổ giấy A4 và bố cục phân đoạn chi tiết trên Doc.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["hộp thoại thiết lập trang", "page setup", "lề giấy", "khổ giấy a4", "hướng giấy", "bố cục trang"],
    steps: [
      "Mở tab Bố cục trên thanh Ribbon, nhìn xuống góc dưới bên phải của nhóm Thiết lập trang và bấm nút mũi tên nhỏ để mở hộp thoại.",
      "Tại thẻ Lề giấy: nhập số liệu căn lề Trên (Top), Dưới (Bottom), Trái (Left), Phải (Right) theo milimét chuẩn công văn hành chính (20mm, 20mm, 30mm, 15mm).",
      "Tại thẻ Hướng giấy: chọn Chiều dọc (Portrait) cho văn bản thông thường hoặc Chiều ngang (Landscape) cho tài liệu bảng biểu rộng.",
      "Tại thẻ Khổ giấy: chọn kích cỡ A4 (210 x 297 mm), Letter hoặc Legal từ danh sách thả xuống.",
      "Bấm 'Đồng ý' để áp dụng các thiết lập cho toàn bộ tài liệu hoặc phân đoạn hiện tại.",
      "Lưu ý: Bạn có thể chọn áp dụng cho 'Toàn bộ tài liệu' hoặc 'Từ điểm này trở đi' để có trang giấy nằm ngang xen kẽ các trang giấy đứng."
    ]
  },
  {
    id: "writer.dialog.paragraphHelp",
    app: "writer",
    commandIds: ["writer.paragraph.dialog"],
    title: "Hộp thoại Đoạn văn (Paragraph)",
    summary: "Thiết lập nâng cao về thụt lề dòng đầu, khoảng cách trước và sau đoạn văn, căn lề và kiểm soát ngắt dòng trên Doc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["hộp thoại đoạn văn", "paragraph dialog", "thụt lề", "khoảng cách đoạn", "spacing", "first line indent"],
    steps: [
      "Đặt con trỏ soạn thảo vào đoạn văn cần định dạng hoặc bôi đen nhiều đoạn văn.",
      "Trên tab Trang đầu (hoặc tab Bố cục), tại nhóm Đoạn văn, bấm nút mũi tên mở hộp thoại ở góc dưới bên phải.",
      "Tại mục Căn lề: chọn Căn trái, Căn giữa, Căn phải hoặc Căn đều hai bên (Justify).",
      "Tại mục Thụt lề: chỉnh Thụt dòng đầu tiên (First line indent) lên 10 mm đến 12.7 mm để tự động thụt đầu dòng mỗi khi xuống đoạn mới.",
      "Tại mục Khoảng cách: đặt khoảng trống Trước đoạn (Before) và Sau đoạn (After) tính theo đơn vị pt (thường dùng 6 pt).",
      "Bấm nút 'Đồng ý' để lưu lại các thông số vừa đặt.",
      "Lưu ý: Thiết lập thụt đầu dòng tại đây giúp trình bày văn bản khoa học hơn nhiều so với việc bấm phím Space nhiều lần thủ công."
    ]
  },
  {
    id: "writer.dialog.fontHelp",
    app: "writer",
    commandIds: ["writer.font.dialog"],
    title: "Hộp thoại Phông chữ (Font)",
    summary: "Lựa chọn họ phông chữ, kiểu dáng in đậm nghiêng, kích cỡ chữ, màu sắc và các hiệu ứng chữ nghệ thuật trên Doc.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["hộp thoại phông chữ", "font dialog", "cỡ chữ", "màu chữ", "gạch chân", "chỉ số trên"],
    steps: [
      "Bôi đen đoạn văn bản cần thay đổi kiểu chữ.",
      "Mở tab Trang đầu trên Ribbon, tìm nhóm Phông chữ và bấm nút mũi tên ở góc nhóm để kích hoạt hộp thoại Phông chữ.",
      "Trong danh sách Phông chữ: chọn phông chữ tiếng Việt đẹp mắt như Times New Roman, Calibri, Arial hoặc Be Vietnam Pro.",
      "Tại mục Kiểu phông: chọn Thường (Regular), In đậm (Bold), In nghiêng (Italic) hoặc Đậm nghiêng kết hợp.",
      "Tại mục Cỡ chữ: nhập số hoặc chọn kích cỡ điểm phông từ 8 pt đến 72 pt.",
      "Bật các hiệu ứng đặc biệt nếu cần như Gạch ngang chữ, Chỉ số trên (x²) hoặc Chỉ số dưới (H₂O) rồi bấm 'Đồng ý'.",
      "Lưu ý: Nhấn Ctrl+D hoặc Ctrl+Shift+F để mở nhanh hộp thoại Phông chữ mà không cần nhấp chuột."
    ]
  },
  {
    id: "writer.dialog.crossRefHelp",
    app: "writer",
    commandIds: ["writer.insert.crossRef"],
    title: "Hộp thoại Tham chiếu chéo (Cross-reference)",
    summary: "Tạo liên kết tự động tới các tiêu đề mục, dấu trang, bảng biểu hoặc hình ảnh trong cùng tài liệu trên Doc.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["tham chiếu chéo", "cross reference", "liên kết tiêu đề", "số trang", "chú thích chéo"],
    steps: [
      "Đặt con trỏ văn bản tại vị trí muốn xuất hiện câu tham chiếu (ví dụ: 'Xem chi tiết tại...').",
      "Mở tab Chèn trên thanh Ribbon, nhóm Liên kết, bấm vào nút 'Tham chiếu chéo'.",
      "Trong hộp thoại Tham chiếu chéo: chọn Loại tham chiếu ở cột bên trái (như Tiêu đề, Dấu trang, Bảng hoặc Hình ảnh).",
      "Tại mục Chèn tham chiếu tới: chọn muốn lấy 'Văn bản tiêu đề', 'Số trang' hoặc 'Số thứ tự đoạn'.",
      "Chọn mục tiêu cụ thể trong danh sách tài liệu bên dưới rồi bấm nút 'Chèn'.",
      "Lưu ý: Khi tài liệu có sự thay đổi vị trí trang, số trang tham chiếu sẽ tự động cập nhật đồng bộ khi in hoặc xuất tệp."
    ]
  },
  {
    id: "writer.dialog.captionsHelp",
    app: "writer",
    commandIds: ["writer.caption.insert", "writer.caption.insertTableOfFigures"],
    title: "Hộp thoại Chú thích và Bảng hình ảnh",
    summary: "Gán nhãn Hình, Bảng, Biểu đồ kèm số thứ tự tự động và lập danh mục bảng hình ảnh chuyên nghiệp trên Doc.",
    ribbon: { tab: "Tham khảo", tabId: "references", group: "Chú thích" },
    keywords: ["chú thích", "caption", "danh mục hình", "bảng hình", "table of figures", "đánh số hình"],
    steps: [
      "Bấm chọn vào bức ảnh hoặc bảng số liệu cần thêm lời chú thích trong tài liệu.",
      "Mở tab Tham khảo trên thanh Ribbon, nhóm Chú thích, bấm nút 'Chèn chú thích'.",
      "Trong hộp thoại Chú thích: chọn Nhãn phù hợp (Hình, Bảng, Phương trình) và gõ phần mô tả nội dung.",
      "Chọn vị trí đặt chú thích: 'Bên dưới mục đã chọn' hoặc 'Bên trên mục đã chọn' rồi bấm 'Đồng ý'.",
      "Để tạo danh mục bảng hình: đặt con trỏ tại trang mục lục, bấm nút 'Chèn bảng hình ảnh' trong cùng nhóm Chú thích.",
      "Lưu ý: Số thứ tự hình ảnh được hệ thống tự động tăng dần (Hình 1, Hình 2...), không cần lo gõ sai số thứ tự."
    ]
  },
  {
    id: "writer.dialog.citationsHelp",
    app: "writer",
    commandIds: ["writer.citations.insert", "writer.citations.manage"],
    title: "Hộp thoại Trích dẫn và Quản lý nguồn tài liệu",
    summary: "Thêm thông tin tác giả, sách báo tham khảo theo chuẩn quốc tế APA hoặc MLA và chèn trích dẫn trong văn bản Doc.",
    ribbon: { tab: "Tham khảo", tabId: "references", group: "Trích dẫn & Thư mục" },
    keywords: ["trích dẫn", "citation", "quản lý nguồn", "nguồn tài liệu", "apa", "mla", "danh mục tài liệu tham khảo"],
    steps: [
      "Đặt con trỏ tại cuối câu văn hoặc đoạn văn cần dẫn nguồn tài liệu tham khảo.",
      "Mở tab Tham khảo trên thanh Ribbon, nhóm Trích dẫn & Thư mục, bấm nút 'Chèn trích dẫn'.",
      "Chọn 'Thêm nguồn mới' để mở hộp thoại Tạo nguồn tài liệu.",
      "Chọn Loại nguồn (Sách, Tạp chí, Báo cáo, Trang web) và điền tên Tác giả, Tiêu đề, Năm xuất bản, Nhà xuất bản.",
      "Bấm 'Đồng ý' để chèn dấu trích dẫn dạng chuẩn (ví dụ: (Nguyễn Văn A, 2026)) vào ngay vị trí con trỏ.",
      "Sử dụng nút 'Quản lý nguồn' để xem lại toàn bộ kho tư liệu đã trích dẫn trong toàn bộ tập tài liệu.",
      "Lưu ý: Có thể chuyển đổi tức thì giữa định dạng APA và MLA bằng menu thả xuống Kiểu trích dẫn trên Ribbon."
    ]
  },
  {
    id: "writer.dialog.envelopesLabelsHelp",
    app: "writer",
    commandIds: ["writer.mailMerge.envelopes", "writer.mailMerge.labels"],
    title: "Hộp thoại Phong bì và Nhãn thư",
    summary: "Cấu hình in ấn địa chỉ người nhận và người gửi lên phong bì bưu điện hoặc tem nhãn dán bưu phẩm trên Doc.",
    ribbon: { tab: "Gửi thư", tabId: "mailings", group: "Tạo" },
    keywords: ["phong bì", "nhãn thư", "envelopes", "labels", "in tem", "in phong bì", "địa chỉ gửi thư"],
    steps: [
      "Mở tab Gửi thư trên thanh công cụ Ribbon, tìm đến nhóm Tạo ở phía đầu bên trái.",
      "Bấm nút 'Phong bì' (Envelopes) hoặc nút 'Nhãn' (Labels) để mở hộp thoại tương ứng.",
      "Trong ô Địa chỉ người nhận: nhập thông tin người nhận hàng hoặc bưu phẩm.",
      "Trong ô Địa chỉ người gửi: nhập thông tin cơ quan, doanh nghiệp gửi đi (hoặc đánh dấu Bỏ qua nếu phong bì đã in sẵn logo).",
      "Bấm 'Tùy chọn' để chọn kích thước khổ phong bì tiêu chuẩn (như C5, DL, B5) hoặc mã tem nhãn bưu điện.",
      "Bấm 'In' để gửi trực tiếp ra máy in hoặc bấm 'Thêm vào tài liệu' để gắn một trang phong bì vào đầu tập văn bản.",
      "Lưu ý: Đặt đúng chiều nạp phong bì vào khay nạp giấy thủ công của máy in theo hướng dẫn hình vẽ trong hộp thoại."
    ]
  },

  // --- SHEET DIALOGS ---
  {
    id: "sheet.dialog.formatCellsHelp",
    app: "sheet",
    commandIds: ["sheet.format.cellsDialog", "sheet.format.alignmentDialog"],
    title: "Hộp thoại Định dạng ô (Format Cells)",
    summary: "Trung tâm điều khiển định dạng chuyên sâu gồm 6 thẻ: Số, Căn chỉnh, Phông chữ, Viền, Tô màu và Bảo vệ trên Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["định dạng ô", "format cells", "ctrl+1", "viền bảng", "định dạng số", "wrap text", "khóa ô"],
    steps: [
      "Chọn các ô cần định dạng rồi nhấn tổ hợp phím tắt Ctrl+1 (hoặc bấm nút mũi tên ở góc nhóm Số / Phông chữ trên tab Trang đầu).",
      "Thẻ Số: định dạng kiểu hiển thị số thập phân, tiền tệ VNĐ (hỗ trợ đọc số thành chữ), ngày tháng năm hoặc tỷ lệ phần trăm.",
      "Thẻ Căn chỉnh: chọn căn ngang, căn dọc, đánh dấu 'Ngắt dòng tự động' (Wrap text) hoặc 'Gộp các ô' (Merge cells).",
      "Thẻ Phông chữ: tùy chỉnh tên phông, cỡ chữ, màu sắc chữ và kiểu gạch dưới.",
      "Thẻ Viền: chọn kiểu đường kẻ (nét đơn, nét đôi, nét đứt), màu đường viền và bấm áp dụng cho Viền ngoài hay Lưới trong.",
      "Thẻ Tô màu: chọn màu nền cho ô để phân biệt các vùng dữ liệu nhập liệu và tổng hợp.",
      "Thẻ Bảo vệ: đánh dấu 'Đã khóa' (Locked) hoặc 'Ẩn công thức' khi cần khóa trang tính để bảo vệ công thức tính toán.",
      "Lưu ý: Bấm phím Enter hoặc nút 'Đồng ý' để lưu toàn bộ các thay đổi định dạng cùng lúc."
    ]
  },
  {
    id: "sheet.dialog.cellStylesHelp",
    app: "sheet",
    commandIds: ["sheet.format.cellStyles"],
    title: "Hộp thoại Kiểu ô (Cell Styles)",
    summary: "Áp dụng các mẫu định dạng ô dựng sẵn như Tốt, Xấu, Cảnh báo, Tiêu đề cột, và Số liệu tài chính trên Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu" },
    keywords: ["kiểu ô", "cell styles", "mẫu định dạng", "màu ô", "tốt xấu", "tiêu đề bảng"],
    steps: [
      "Bôi đen vùng ô hoặc tiêu đề bảng tính cần áp dụng phong cách hiển thị chuẩn mực.",
      "Mở tab Trang đầu trên Ribbon, tìm đến nhóm Kiểu và bấm vào nút 'Kiểu ô'.",
      "Hộp thoại mở ra bảng danh mục các nhóm kiểu định dạng được phối màu chuyên nghiệp.",
      "Chọn một kiểu phù hợp: nhóm Dữ liệu & Mô hình (Tốt - xanh lá, Xấu - đỏ, Trung bình - vàng); nhóm Tiêu đề (Tiêu đề 1, 2, 3, Tổng số); hoặc nhóm Định dạng số (Tiền tệ, Phần trăm).",
      "Bấm chọn kiểu mong muốn để bảng tính lập tức khoác lên giao diện đẹp mắt và đồng bộ.",
      "Lưu ý: Việc sử dụng kiểu ô mẫu giúp toàn bộ sổ làm việc có giao diện đồng nhất và dễ đọc cho người xem báo cáo."
    ]
  },
  {
    id: "sheet.dialog.formatAsTableHelp",
    app: "sheet",
    commandIds: ["sheet.format.asTable"],
    title: "Hộp thoại Định dạng thành Bảng (Format as Table)",
    summary: "Chuyển vùng ô dữ liệu thô thành bảng thông minh có màu sắc xen kẽ, tự động có bộ lọc cột và hàng tổng số trên Sheet.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu" },
    keywords: ["định dạng thành bảng", "format as table", "tạo bảng", "bảng thông minh", "bộ lọc tự động"],
    steps: [
      "Đặt con trỏ vào ô bất kỳ trong khối dữ liệu bảng tính cần định dạng.",
      "Tại tab Trang đầu trên thanh Ribbon, nhóm Kiểu, bấm vào nút 'Định dạng thành Bảng'.",
      "Chọn một kiểu bảng trong bộ sưu tập (Sáng, Trung bình hoặc Tối) với màu sắc ưng ý.",
      "Hộp thoại xuất hiện xác nhận phạm vi dữ liệu: kiểm tra xem địa chỉ dải ô đã chính xác chưa.",
      "Đánh dấu vào ô 'Bảng của tôi có tiêu đề' nếu hàng đầu tiên là tên các cột dữ liệu.",
      "Bấm 'Đồng ý': khối dữ liệu sẽ tự động được kẻ viền, tô màu xen kẽ từng dòng và gắn mũi tên lọc dữ liệu ở mỗi cột.",
      "Lưu ý: Bảng định dạng thông minh tự động mở rộng định dạng khi bạn gõ thêm dòng dữ liệu mới ở đáy bảng."
    ]
  },
  {
    id: "sheet.dialog.pageSetupHelp",
    app: "sheet",
    commandIds: ["sheet.page.pageSetupDialog"],
    title: "Hộp thoại Thiết lập trang in bảng tính",
    summary: "Căn lề trang in, hướng giấy dọc ngang, thu phóng vừa khít trang giấy và lặp lại dòng tiêu đề khi in trên Sheet.",
    ribbon: { tab: "Bố cục trang", tabId: "pageLayout", group: "Thiết lập trang" },
    keywords: ["thiết lập trang in", "page setup sheet", "vừa trang in", "fit to page", "lặp lại dòng tiêu đề", "hướng in"],
    steps: [
      "Mở tab Bố cục trang trên thanh Ribbon, bấm nút mũi tên ở góc nhóm Thiết lập trang để mở hộp thoại.",
      "Tại thẻ Trang: chọn Hướng in Dọc hoặc Ngang; tại mục Thu phóng, chọn 'Vừa khít' (Fit to) 1 trang rộng và 1 trang cao để tránh bảng tính bị tràn sang trang thứ hai.",
      "Tại thẻ Lề: điều chỉnh lề Trên, Dưới, Trái, Phải và đánh dấu 'Căn giữa trang' theo chiều ngang để bảng in nằm ngay ngắn chính giữa trang giấy.",
      "Tại thẻ Đầu trang/Chân trang: thêm số trang dạng 'Trang 1 trên N' hoặc chèn tên tệp, ngày in tự động.",
      "Tại thẻ Trang tính: nhập địa chỉ hàng tiêu đề vào ô 'Lặp lại hàng ở đầu' (ví dụ $1:$1) để trang in nào cũng có dòng tiêu đề cột.",
      "Bấm 'Xem trước khi in' để kiểm tra bản in trước khi xuất xưởng ra giấy.",
      "Lưu ý: Thiết lập này đặc biệt quan trọng để báo cáo kế toán nhiều trang luôn dễ đọc và chuyên nghiệp."
    ]
  },
  {
    id: "sheet.dialog.dataValidationHelp",
    app: "sheet",
    commandIds: ["sheet.data.validation"],
    title: "Hộp thoại Xác thực dữ liệu (Data Validation)",
    summary: "Thiết lập điều kiện nhập liệu chuẩn xác, tạo danh sách chọn thả xuống và thông báo cảnh báo khi nhập sai trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["xác thực dữ liệu", "data validation", "danh sách thả xuống", "dropdown list", "chặn nhập sai", "kiểm tra dữ liệu"],
    steps: [
      "Chọn cột hoặc dải ô cần áp dụng quy tắc kiểm soát nhập liệu.",
      "Mở tab Dữ liệu trên thanh Ribbon, nhóm Công cụ dữ liệu, bấm vào nút 'Xác thực dữ liệu'.",
      "Thẻ Cài đặt: tại mục Cho phép, chọn loại dữ liệu như 'Số nguyên', 'Thập phân', 'Danh sách' (List), hoặc 'Ngày'.",
      "Nếu chọn Danh sách: nhập các giá trị ngăn cách nhau bởi dấu phẩy vào ô Nguồn (ví dụ: Đạt, Không đạt, Chờ duyệt).",
      "Thẻ Cảnh báo lỗi: nhập Tiêu đề và Nội dung tin nhắn báo lỗi để nhắc nhở người dùng khi họ gõ giá trị không hợp lệ.",
      "Bấm 'Đồng ý' để kích hoạt: khi nhấp vào ô, một mũi tên chọn thả xuống sẽ xuất hiện ngay bên cạnh ô.",
      "Lưu ý: Tính năng này giúp loại bỏ 100% các lỗi chính tả gõ sai lệch khi nhiều người cùng nhập liệu vào một bảng tính."
    ]
  },
  {
    id: "sheet.dialog.textToColumnsHelp",
    app: "sheet",
    commandIds: ["sheet.data.textToColumns"],
    title: "Hộp thoại Phân tách văn bản thành cột (Text to Columns)",
    summary: "Chia nội dung một ô chứa chuỗi ký tự dài thành nhiều cột riêng rẽ dựa trên dấu phẩy, tab hoặc khoảng trắng trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["phân tách cột", "text to columns", "tách họ tên", "tách chuỗi", "dấu phân tách", "tách cột"],
    steps: [
      "Chọn cột chứa dữ liệu dạng chuỗi văn bản cần phân tách (lưu ý để trống các cột bên cạnh để chứa dữ liệu mới).",
      "Mở tab Dữ liệu trên thanh Ribbon, nhóm Công cụ dữ liệu, bấm vào nút 'Phân tách cột'.",
      "Chọn kiểu phân tách: 'Phân cách bằng ký tự' (Delimited) cho các chuỗi có dấu phẩy, dấu chấm phẩy, khoảng trắng.",
      "Đánh dấu ký tự phân cách tương ứng trong danh sách (dấu phẩy, dấu tab, khoảng trắng hoặc ký tự tùy chọn khác).",
      "Xem trước kết quả phân chia trong khung bảng bên dưới để chắc chắn các trường thông tin được tách đúng vị trí.",
      "Bấm nút 'Hoàn tất' để ghi dữ liệu đã tách thành các cột riêng biệt.",
      "Lưu ý: Rất tiện lợi khi cần tách cột 'Họ và tên' thành hai cột 'Họ' và 'Tên' riêng biệt để phục vụ việc sắp xếp danh sách."
    ]
  },
  {
    id: "sheet.dialog.removeDuplicatesHelp",
    app: "sheet",
    commandIds: ["sheet.data.removeDuplicates"],
    title: "Hộp thoại Xóa dữ liệu trùng lặp (Remove Duplicates)",
    summary: "Quét và loại bỏ nhanh các hàng dữ liệu bị trùng lặp thông tin, giữ lại danh sách duy nhất và chuẩn xác trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["xóa bản trùng", "remove duplicates", "dữ liệu trùng", "lọc trùng", "danh sách duy nhất"],
    steps: [
      "Bôi đen bảng số liệu cần lọc bỏ các dòng thông tin trùng lặp.",
      "Mở tab Dữ liệu trên Ribbon, tìm đến nhóm Công cụ dữ liệu và bấm nút 'Xóa bản trùng'.",
      "Hộp thoại Xóa bản trùng hiện ra: đánh dấu chọn 'Dữ liệu có tiêu đề' nếu bảng có hàng tên cột.",
      "Chọn các cột làm căn cứ xác định trùng lặp: đánh dấu tất cả các cột nếu muốn xóa dòng trùng tuyệt đối, hoặc chỉ đánh dấu cột Số điện thoại / Mã số thuế nếu muốn xóa trùng theo mã khóa.",
      "Bấm nút 'Đồng ý': hệ thống sẽ tự động lọc xóa các hàng trùng lặp và thông báo số bản ghi đã xóa kèm số bản ghi duy nhất được giữ lại.",
      "Lưu ý: Thao tác này xóa dòng thật, do đó nên lưu tệp hoặc kiểm tra kỹ trước khi chạy để tránh mất dữ liệu quan trọng."
    ]
  },
  {
    id: "sheet.dialog.goalSeekHelp",
    app: "sheet",
    commandIds: ["sheet.data.goalSeek"],
    title: "Hộp thoại Tìm mục tiêu What-If (Goal Seek)",
    summary: "Tự động tính ngược giá trị biến số đầu vào cần thiết để một ô công thức đạt được kết quả đích mong đợi trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["tìm mục tiêu", "goal seek", "what if", "tính ngược", "giải bài toán", "mô phỏng"],
    steps: [
      "Mở tab Dữ liệu trên thanh Ribbon, nhóm Công cụ dữ liệu, bấm 'Phân tích What-If' rồi chọn 'Tìm mục tiêu'.",
      "Ô đặt (Set cell): nhập địa chỉ ô chứa công thức cần đạt kết quả mục tiêu (ví dụ ô Lợi nhuận B10).",
      "Đến giá trị (To value): gõ con số kết quả mong muốn đạt được (ví dụ 1000000000).",
      "Bằng cách thay đổi ô (By changing cell): chọn ô biến số đầu vào được phép điều chỉnh (ví dụ ô Sản lượng bán B2).",
      "Bấm nút 'Đồng ý': hệ thống sẽ thực hiện hàng ngàn phép lặp trong tích tắc và hiển thị giá trị nghiệm tìm thấy.",
      "Bấm 'Đồng ý' để ghi nhận giá trị mới vào ô bảng tính hoặc bấm 'Hủy' để quay về số liệu ban đầu.",
      "Lưu ý: Ô đặt bắt buộc phải là ô chứa công thức có tham chiếu trực tiếp hoặc gián tiếp tới ô biến số được chọn thay đổi."
    ]
  },
  {
    id: "sheet.dialog.customSortHelp",
    app: "sheet",
    commandIds: ["sheet.data.customSort"],
    title: "Hộp thoại Sắp xếp tùy chỉnh nhiều cấp (Custom Sort)",
    summary: "Tổ chức sắp xếp dữ liệu theo nhiều điều kiện cột liên tiếp nhau theo thứ tự tăng dần hoặc giảm dần trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Sắp xếp & Lọc" },
    keywords: ["sắp xếp tùy chỉnh", "custom sort", "sắp xếp nhiều cấp", "thứ tự tăng dần", "thứ tự giảm dần", "sort dialog"],
    steps: [
      "Chọn bảng số liệu cần sắp xếp thứ tự các hàng dữ liệu.",
      "Mở tab Dữ liệu trên thanh công cụ Ribbon, nhóm Sắp xếp & Lọc, bấm nút 'Sắp xếp' (hoặc nhấn Ctrl+Shift+S).",
      "Trong hộp thoại Sắp xếp: đánh dấu chọn 'Dữ liệu của tôi có tiêu đề'.",
      "Tại cấp độ đầu tiên: chọn Cột cần sắp xếp (ví dụ Cột Phòng ban), sắp xếp theo Giá trị của ô, thứ tự Từ A đến Z.",
      "Bấm nút '+ Thêm cấp độ' để bổ sung điều kiện thứ hai: chọn Cột Họ và tên, thứ tự Từ A đến Z.",
      "Có thể thêm nhiều cấp độ tiếp theo theo nhu cầu rồi bấm 'Đồng ý' để bảng tính sắp xếp ngay lập tức.",
      "Lưu ý: Tiêu chuẩn sắp xếp tiếng Việt của 3T Office hiểu đúng bảng chữ cái tiếng Việt có dấu, sắp xếp chuẩn xác tên người và địa danh."
    ]
  },
  {
    id: "sheet.dialog.nameManagerHelp",
    app: "sheet",
    commandIds: ["sheet.formula.nameManager"],
    title: "Hộp thoại Trình quản lý tên vùng (Name Manager)",
    summary: "Đặt tên gợi nhớ cho các ô hoặc dải ô dữ liệu để viết công thức rõ ràng, dễ bảo trì thay vì dùng tọa độ ô thô trên Sheet.",
    ribbon: { tab: "Công thức", tabId: "formulas", group: "Tên xác định" },
    keywords: ["quản lý tên", "name manager", "ctrl+f3", "đặt tên vùng", "named range", "vùng xác định"],
    steps: [
      "Mở tab Công thức trên thanh Ribbon, nhóm Tên xác định, bấm nút 'Trình quản lý tên' (hoặc nhấn phím tắt Ctrl+F3).",
      "Bấm nút 'Mới' để tạo tên vùng dữ liệu mới: nhập Tên ngắn gọn không chứa khoảng trắng (ví dụ BangThue, DoanhThu).",
      "Tại ô 'Tham chiếu tới': chọn dải ô trên trang tính bằng chuột hoặc gõ tọa độ (ví dụ =Sheet1!$A$2:$D$50).",
      "Bấm 'Đồng ý' để ghi nhận tên vào danh bạ sổ làm việc.",
      "Khi viết công thức ở bất kỳ đâu, bạn chỉ cần gõ tên vùng đó (ví dụ =SUM(DoanhThu)) thay vì phải nhớ tọa độ vùng ô.",
      "Chọn tên trong danh sách rồi bấm 'Chỉnh sửa' để đổi dải ô hoặc bấm 'Xóa' khi không còn nhu cầu sử dụng.",
      "Lưu ý: Tên vùng được lưu chuẩn vào tệp .xlsx và hiển thị trong hộp Tọa độ ô (Name Box) ở góc trái thanh công thức."
    ]
  },
  {
    id: "sheet.dialog.dataTableHelp",
    app: "sheet",
    commandIds: ["sheet.data.dataTable"],
    title: "Hộp thoại Bảng dữ liệu What-If (Data Table)",
    summary: "Xây dựng ma trận độ nhạy dự báo kết quả tài chính khi thay đổi đồng thời một hoặc hai tham số biến số trên Sheet.",
    ribbon: { tab: "Dữ liệu", tabId: "data", group: "Công cụ dữ liệu" },
    keywords: ["bảng dữ liệu", "data table", "what if", "bảng một biến", "bảng hai biến", "ma trận nhạy cảm"],
    steps: [
      "Thiết lập bảng ma trận gồm công thức gốc ở góc, dãy giá trị biến số theo hàng và dãy giá trị biến số theo cột.",
      "Bôi đen toàn bộ khối ma trận bảng tính bao gồm cả công thức gốc và các giá trị giả định.",
      "Mở tab Dữ liệu trên thanh Ribbon, nhóm Công cụ dữ liệu, bấm 'Phân tích What-If' rồi chọn 'Bảng dữ liệu'.",
      "Nếu là bảng 2 biến: tại 'Ô đầu vào theo hàng', chọn ô tham số tương ứng trên mô hình; tại 'Ô đầu vào theo cột', chọn ô tham số thứ hai.",
      "Bấm 'Đồng ý': hệ thống sẽ tự động điền đầy đủ kết quả tính toán cho từng giao điểm của ma trận bằng hàm TABLE().",
      "Lưu ý: Khi bạn thay đổi bất kỳ con số nào trong hàng hoặc cột giả định, toàn bộ bảng kết quả sẽ tự động tính lại ngay tức thì."
    ]
  },

  // --- SLIDES DIALOGS ---
  {
    id: "slides.dialog.insertTableHelp",
    app: "slides",
    commandIds: ["slides.insert.table"],
    title: "Hộp thoại Chèn bảng trên trang chiếu",
    summary: "Tạo bảng dữ liệu trên slide bằng cách nhập số lượng cột và hàng mong muốn kèm tùy chỉnh bố cục trên Slide.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng" },
    keywords: ["chèn bảng slide", "insert table", "số cột", "số hàng", "bảng trang chiếu"],
    steps: [
      "Chuyển tới trang chiếu cần chèn thêm bảng thông tin số liệu.",
      "Mở tab Chèn trên thanh công cụ Ribbon, tìm nhóm Bảng và bấm nút 'Bảng'.",
      "Trong hộp thoại Chèn Bảng: nhập 'Số cột' (từ 1 đến 12) và 'Số hàng' (từ 1 đến 12) phù hợp với nội dung trình bày.",
      "Bấm nút 'Đồng ý': một bảng dữ liệu sạch đẹp với các ô để trống sẽ xuất hiện ngay chính giữa trang chiếu.",
      "Nhấp chuột vào từng ô để nhập dữ liệu văn bản; dùng chuột kéo các đường viền cột để căn chỉnh độ rộng theo ý muốn.",
      "Lưu ý: Bảng trên Slide là đối tượng đồ họa tự do, bạn có thể kéo di chuyển toàn bộ bảng đến bất kỳ vị trí nào trên slide."
    ]
  },
  {
    id: "slides.dialog.headerFooterHelp",
    app: "slides",
    commandIds: ["slides.insert.headerFooter"],
    title: "Hộp thoại Đầu trang và Chân trang bản trình chiếu",
    summary: "Cấu hình tự động hiển thị ngày tháng năm, số thứ tự trang chiếu và thông điệp chân trang bản quyền trên Slide.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["đầu trang", "chân trang", "header footer", "số trang slide", "ngày tháng", "bản quyền slide"],
    steps: [
      "Mở tab Chèn trên thanh Ribbon, nhóm Văn bản, bấm nút 'Đầu trang và Chân trang'.",
      "Trong hộp thoại: đánh dấu 'Ngày và giờ' nếu muốn hiển thị ngày thuyết trình (chọn Tự động cập nhật hoặc Cố định).",
      "Đánh dấu 'Số trang chiếu' để tự động đánh số thứ tự 1, 2, 3... ở góc dưới mỗi slide.",
      "Đánh dấu 'Chân trang' và gõ nội dung muốn hiển thị ở đáy trang (ví dụ tên đề tài hoặc khẩu hiệu công ty).",
      "Đánh dấu 'Không hiện trên trang tiêu đề' để trang bìa đầu tiên giữ được vẻ đẹp trang trọng sạch sẽ.",
      "Bấm 'Áp dụng cho tất cả' để toàn bộ bài trình chiếu có giao diện đồng bộ.",
      "Lưu ý: Thông tin chân trang được lưu chuẩn theo định dạng .pptx và xuất hiện đầy đủ khi trình chiếu F5."
    ]
  },
  {
    id: "slides.dialog.setupShowHelp",
    app: "slides",
    commandIds: ["slides.show.setupShow"],
    title: "Hộp thoại Cài đặt trình chiếu (Set Up Show)",
    summary: "Tùy biến chế độ chiếu toàn màn hình hoặc chiếu trong cửa sổ, cài đặt lặp vô tận cho quầy thông tin và màu bút vẽ trên Slide.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Thiết lập" },
    keywords: ["cài đặt trình chiếu", "setup show", "chiếu toàn màn hình", "lặp lại liên tục", "màu bút vẽ", "f5"],
    steps: [
      "Mở tab Trình chiếu trên thanh công cụ Ribbon, tìm nhóm Thiết lập và bấm nút 'Thiết lập trình chiếu'.",
      "Tại mục Kiểu trình chiếu: chọn 'Người thuyết trình trình bày (Toàn màn hình)' cho các buổi hội thảo, hoặc chọn 'Cá nhân xem (Cửa sổ)' khi cần chia sẻ màn hình qua ứng dụng họp trực tuyến.",
      "Tại mục Tùy chọn trình chiếu: đánh dấu 'Lặp lại liên tục cho đến khi nhấn Esc' nếu dùng máy tính trình chiếu tự động tại triển lãm hoặc quầy lễ tân.",
      "Tại mục Bút vẽ: lựa chọn màu mặc định cho bút vẽ ghi chú (màu đỏ, xanh, vàng) và màu con trỏ laser.",
      "Bấm nút 'Đồng ý' để lưu lại toàn bộ cấu hình.",
      "Lưu ý: Trong khi đang chiếu F5, bạn có thể nhấn Ctrl+P để bật bút vẽ và nhấn Ctrl+L để bật con trỏ laser bất kỳ lúc nào."
    ]
  },

  // --- SHARED & PLATFORM DIALOGS ---
  {
    id: "common.dialog.findReplaceHelp",
    app: "common",
    commandIds: ["common.edit.find", "common.edit.replace"],
    title: "Hộp thoại Tìm kiếm và Thay thế (Find & Replace)",
    summary: "Hộp thoại tìm kiếm và thay thế mạnh mẽ dùng chung cho Doc, Sheet và Slide, hỗ trợ tìm tiếng Việt không dấu.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm kiếm", "thay thế", "find", "replace", "ctrl+f", "ctrl+h", "f3", "không dấu"],
    steps: [
      "Nhấn phím tắt Ctrl+F để mở hộp thoại Tìm kiếm, hoặc nhấn Ctrl+H để mở thẻ Thay thế.",
      "Nhập từ khóa cần tra cứu vào ô 'Tìm kiếm'.",
      "Nếu thay thế: nhập từ mới vào ô 'Thay thế bằng'.",
      "Tùy chọn mở rộng: đánh dấu 'Khớp chữ hoa/thường' (Match case), 'Khớp nguyên từ' (Match whole words), hoặc 'Bỏ qua dấu tiếng Việt' (cho phép gõ không dấu vẫn tìm thấy chữ có dấu).",
      "Bấm nút 'Tìm tiếp' (hoặc nhấn phím F3) để nhảy tới kết quả kế tiếp; nhấn Shift+F3 để tìm ngược lại.",
      "Bấm 'Thay thế' để sửa từng vị trí hoặc bấm 'Thay thế tất cả' để thay đổi toàn bộ tài liệu trong nháy mắt.",
      "Lưu ý: Mọi thao tác Thay thế tất cả đều có thể hoàn tác an toàn chỉ với một lần nhấn Ctrl+Z."
    ]
  },
  {
    id: "common.dialog.macroManagerHelp",
    app: "common",
    commandIds: ["common.macro.manager", "common.macro.recordToggle"],
    title: "Hộp thoại Trình quản lý Macro (Macro Manager)",
    summary: "Xem danh mục các đoạn mã tự động hóa đã ghi, chạy thử nghiệm, đổi tên và quản lý macro trên Doc, Sheet, Slide.",
    ribbon: { tab: "Xem", tabId: "view", group: "Macro" },
    keywords: ["macro", "quản lý macro", "ghi macro", "tự động hóa", "chạy macro", "macro manager"],
    steps: [
      "Mở tab Xem trên thanh Ribbon, nhóm Macro, bấm vào nút 'Macro' (hoặc nhấn Alt+F8).",
      "Trong hộp thoại Trình quản lý Macro: xem danh sách các macro đang có trong tài liệu.",
      "Chọn tên một macro trong danh sách rồi bấm nút 'Chạy' (Run) để thực thi chuỗi thao tác tự động.",
      "Bấm nút 'Đổi tên' để gán tên mới có ý nghĩa hơn cho macro.",
      "Bấm nút 'Xóa' để dọn dẹp các đoạn macro thử nghiệm không còn cần dùng.",
      "Lưu ý: Để ghi một macro mới, bấm nút 'Ghi Macro' trên thanh Ribbon, thực hiện các thao tác trên tài liệu rồi bấm 'Dừng ghi'."
    ]
  },
  {
    id: "common.dialog.dateTimeHelp",
    app: "common",
    commandIds: ["common.insert.dateTime", "slides.insert.dateTime"],
    title: "Hộp thoại Chèn ngày và giờ",
    summary: "Chèn nhanh thời gian hiện tại theo các chuẩn định dạng ngày tháng tiếng Việt vào tài liệu Doc, Sheet hoặc Slide.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["ngày giờ", "date time", "chèn ngày", "chèn giờ", "hôm nay", "định dạng ngày"],
    steps: [
      "Đặt con trỏ tại nơi muốn chèn thông tin thời gian trong tài liệu.",
      "Mở tab Chèn trên thanh Ribbon, nhóm Văn bản, bấm nút 'Ngày & Giờ'.",
      "Trong danh sách: chọn định dạng ngày phù hợp như DD/MM/YYYY (ví dụ: 01/10/2026), ngày viết hoa đầy đủ (Thứ Năm, ngày 01 tháng 10 năm 2026), hoặc kèm giờ phút giây.",
      "Đánh dấu 'Tự động cập nhật' nếu muốn ngày tháng luôn hiển thị ngày hiện tại mỗi khi mở tài liệu.",
      "Bấm nút 'Đồng ý' để chèn chuỗi ngày giờ vào văn bản.",
      "Lưu ý: Giúp việc đóng dấu ngày ban hành công văn, biên bản họp được chính xác tuyệt đối mà không cần tra cứu lịch."
    ]
  },
  {
    id: "common.dialog.symbolPickerHelp",
    app: "common",
    commandIds: ["writer.insert.symbol", "sheet.insert.symbol", "slides.insert.symbol"],
    title: "Hộp thoại Bảng ký hiệu đặc biệt (Symbol Picker)",
    summary: "Tra cứu và chèn các ký tự toán học, tiền tệ, mũi tên và chữ cái Hy Lạp không có sẵn trên bàn phím vật lý.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["ký hiệu", "symbol", "ký tự đặc biệt", "toán học", "tiền tệ", "mũi tên", "hy lạp", "bản quyền"],
    steps: [
      "Đặt con trỏ soạn thảo tại vị trí cần chèn ký tự đặc biệt.",
      "Mở tab Chèn trên thanh Ribbon, tìm đến nhóm Ký hiệu và bấm nút 'Ký hiệu' (Symbol).",
      "Bảng chọn ký hiệu sẽ xuất hiện gồm các nhóm danh mục: Ký hiệu toán học (±, ≤, ≥, ≠, ∑, √, ∞); Tiền tệ (€, ¥, £, ₫); Bản quyền (©, ®, ™); Mũi tên (←, →, ↑, ↓); và Chữ cái Hy Lạp (α, β, π).",
      "Nhấp chuột vào ký tự mong muốn để chèn ngay vào tài liệu.",
      "Các ký tự vừa dùng gần đây sẽ được lưu ở hàng đầu để bạn tiện bấm chèn lại trong các lần tiếp theo.",
      "Bấm phím Esc hoặc nhấp chuột ra ngoài để đóng bảng ký hiệu.",
      "Lưu ý: Ký hiệu được chèn dưới dạng mã Unicode chuẩn, tương thích hiển thị tuyệt đối trên mọi hệ điều hành và thiết bị."
    ]
  },
  {
    id: "common.dialog.printHelp",
    app: "common",
    commandIds: ["common.file.print", "writer.file.print", "sheet.file.print", "slides.file.print"],
    title: "Hộp thoại In ấn tài liệu trực quan (Print Dialog)",
    summary: "Xem trước trang in thời gian thực, lựa chọn máy in, số lượng bản sao, phạm vi trang in và chất lượng in trên 3T Office.",
    ribbon: { tab: "Tệp", tabId: "file", group: "In" },
    keywords: ["in", "print", "hộp thoại in", "ctrl+p", "máy in", "số bản sao", "xem trước khi in"],
    steps: [
      "Nhấn tổ hợp phím tắt Ctrl+P (hoặc vào menu Tệp rồi chọn mục 'In').",
      "Hộp thoại In ấn hiển thị khung xem trước trang in trực quan ở nửa bên trái để bạn kiểm tra bố cục thực tế.",
      "Tại mục Máy in: chọn máy in vật lý đang kết nối hoặc chọn máy in ảo PDF của hệ điều hành.",
      "Tại mục Bản sao: nhập số lượng bản in cần nhân bản.",
      "Tại mục Phạm vi trang: chọn 'Tất cả các trang', 'Trang hiện tại', hoặc gõ số trang cụ thể (ví dụ: 1-3, 5).",
      "Tùy chỉnh in một mặt hoặc in hai mặt (nếu máy in hỗ trợ) rồi bấm nút 'In' để bắt đầu in ấn.",
      "Lưu ý: Kiểm tra kỹ khung xem trước để phát hiện sớm các lỗi tràn trang hay dòng biểu mẫu bị cắt trước khi ấn lệnh in ra giấy."
    ]
  }
];
