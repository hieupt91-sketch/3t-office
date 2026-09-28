/**
 * Hướng dẫn sử dụng VN Writer — nội dung tiếng Việt thật, khớp UI hiện có.
 * Task sau thêm entry mới vào mảng này (hoặc file catalog app tương ứng).
 */

export const WRITER_HELP_ENTRIES = [
  {
    id: "writer.section.breaks",
    app: "writer",
    commandIds: ["writer.page.break", "writer.break.column", "writer.section.nextPage", "writer.section.continuous", "writer.section.evenPage", "writer.section.oddPage"],
    title: "Ngắt trang, ngắt cột và ngắt mục",
    summary: "Chia tài liệu thành các mục có khổ giấy, hướng giấy và lề riêng. Trang kế tiếp/chẵn/lẻ bắt đầu ở trang phù hợp; Liên tục đặt mốc ngay tại con trỏ.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["ngắt mục", "section break", "ngắt trang", "ngắt cột", "trang ngang", "trang chẵn", "trang lẻ"],
    steps: [
      "Đặt con trỏ tại vị trí cần bắt đầu vùng định dạng mới.",
      "Mở tab Bố cục, nhóm Thiết lập trang, mở Ngắt trang rồi chọn Trang kế tiếp, Liên tục, Trang chẵn hoặc Trang lẻ trong nhóm Ngắt mục.",
      "Sau mốc ngắt, chọn Căn lề, Hướng giấy hoặc Khổ giấy trên cùng nhóm. Thay đổi chỉ được lưu cho mục đang hoạt động; mục trước giữ nguyên.",
      "Ngắt cột chỉ có hiệu lực rõ khi tài liệu đang dùng từ hai cột trở lên. Dùng Ctrl+Z/Ctrl+Y để hoàn tác hoặc làm lại mốc ngắt cùng thiết lập trang."
    ]
  },
  {
    id: "writer.page.color",
    app: "writer",
    commandIds: ["writer.page.color"],
    title: "Màu trang",
    summary: "Đặt một màu nền đặc cho toàn bộ trang soạn thảo và trang in. Phiên bản này hỗ trợ màu đặc; chưa hỗ trợ nền chuyển sắc hoặc ảnh nền.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Nền & Viền trang" },
    keywords: ["màu trang", "page color", "màu nền", "nền trang"],
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
    summary: "Đếm số từ, ký tự, đoạn văn và dòng trong thân tài liệu VN Writer. Từ tiếng Việt được tách theo khoảng trắng, không đếm token rỗng. Đầu trang và chân trang không được tính.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Chính tả & Ngữ pháp" },
    keywords: ["đếm từ", "word count", "số từ", "ký tự", "thống kê", "status bar"],
    steps: [
      "Mở tab Đánh giá trên ribbon.",
      "Trong nhóm Chính tả & Ngữ pháp, nhấn nút Đếm từ (cạnh Soát lỗi chính tả).",
      "Hộp thoại hiện số Từ, Ký tự (không khoảng trắng), Ký tự (có khoảng trắng), Đoạn văn và Dòng. Nếu đang bôi đen một vùng chữ thì thống kê chỉ tính vùng chọn.",
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
      "Chấp nhận thay đổi và Từ chối thay đổi áp dụng cho toàn bộ tài liệu. Xuất DOCX/PDF luôn dùng bản đã chấp nhận, không còn màu đánh dấu."
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
      "Đặt con trỏ ở cuối tài liệu (hoặc vị trí muốn in danh mục), nhấn Thư mục tài liệu để chèn danh sách đã định dạng."
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
      "Nhấn Thêm vào tài liệu. Trang phong bì là mục riêng: canvas đổi khổ giấy theo phong bì. Ctrl+Z hoàn tác, Ctrl+Y làm lại. Xuất DOCX/PDF vẫn dùng một khổ giấy chung (giới hạn bộ lọc HTML của LibreOffice, giống Ngắt mục)."
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
      "Ctrl+Z hoàn tác, Ctrl+Y làm lại. Tờ nhãn dùng khổ A4 nên xuất in/PDF giữ đúng lưới trên canvas."
    ]
  },
  {
    id: "writer.mailMerge",
    app: "writer",
    commandIds: [
      "writer.mailMerge.open",
      "writer.mailMerge.insertField",
      "writer.mailMerge.preview",
      "writer.mailMerge.prevRecord",
      "writer.mailMerge.nextRecord",
      "writer.mailMerge.finish"
    ],
    title: "Trộn thư",
    summary: "Lấy danh sách người nhận từ CSV, chèn trường trộn vào văn bản, xem từng bản ghi rồi tạo tài liệu kết quả cho toàn bộ danh sách.",
    ribbon: { tab: "Trộn thư", tabId: "mailings", group: "Bắt đầu trộn" },
    keywords: ["trộn thư", "mail merge", "csv", "trường", "người nhận", "bản ghi"],
    steps: [
      "Mở tab Trộn thư. Nhấn Nguồn dữ liệu (nhóm Bắt đầu trộn) rồi dán hoặc mở tệp CSV; dòng đầu là tên cột.",
      "Đặt con trỏ trong thư, nhấn Chèn trường (nhóm Viết & Chèn trường) và chọn cột cần đưa vào văn bản.",
      "Nhấn Xem trước bản ghi (nhóm Xem trước kết quả) để thấy dữ liệu thật thay cho tên trường.",
      "Dùng Bản ghi trước / Bản ghi sau để duyệt từng người nhận.",
      "Nhấn Hoàn tất trộn (nhóm Hoàn tất) để tạo tài liệu kết quả cho mọi bản ghi."
    ]
  },
  {
    id: "writer.reference.toc",
    app: "writer",
    commandIds: ["writer.reference.tocInsert", "writer.reference.tocUpdate"],
    title: "Mục lục tự động",
    summary: "Dựng mục lục từ các đoạn đã gán kiểu Heading 1, Heading 2, Heading 3. Có thể cập nhật lại sau khi sửa tiêu đề.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Mục lục" },
    keywords: ["mục lục", "table of contents", "toc", "tiêu đề", "heading"],
    steps: [
      "Gán kiểu tiêu đề cho các đề mục: trên tab Trang đầu, nhóm Kiểu dáng, chọn Heading 1 / Heading 2 / Heading 3 (hoặc Thư viện kiểu).",
      "Đặt con trỏ ở đầu tài liệu (hoặc chỗ muốn hiện mục lục).",
      "Mở tab Tham chiếu, nhóm Mục lục, nhấn Mục lục tự động.",
      "Sau khi thêm hoặc đổi tiêu đề, nhấn Cập nhật mục lục để làm mới số trang và dòng đề mục.",
      "Nhấp một dòng trong mục lục để nhảy tới tiêu đề tương ứng trong tài liệu."
    ]
  },
  {
    id: "writer.insert.wordart",
    app: "writer",
    commandIds: ["writer.insert.wordart"],
    title: "Chữ nghệ thuật (WordArt)",
    summary: "Chèn một dòng chữ trang trí (viền, đổ bóng hoặc gradient) ngay tại vị trí con trỏ trong đoạn văn. Khác Hộp văn bản: WordArt nằm trong dòng chữ, không phải khung kéo thả đè lên trang.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chữ nghệ thuật", "wordart", "word art", "tiêu đề", "gradient", "viền", "đổ bóng"],
    steps: [
      "Đặt con trỏ vào đoạn văn, chỗ muốn chèn chữ nghệ thuật.",
      "Mở tab Chèn, nhóm Văn bản, nhấn nút lớn Chữ nghệ thuật (cạnh Hộp văn bản).",
      "Hộp thoại Chèn chữ nghệ thuật: gõ nội dung (mặc định «VN Office», tối đa 80 ký tự) rồi chọn một mẫu trong lưới (ví dụ Xanh đậm viền trắng, Gradient đại dương, Viền đậm trắng).",
      "Nhấn Chèn. Khối chữ xuất hiện ngay tại con trỏ. Nhấp một lần để chọn (viền xanh); nhấp đúp để sửa chữ; Delete hoặc Backspace khi đang chọn sẽ xóa cả khối. Ctrl+Z hoàn tác, Ctrl+Y làm lại.",
      "Cùng nhóm Văn bản còn Hộp văn bản (khung kéo-thả độc lập), Chữ đầu đoạn và Ngày & Giờ."
    ]
  },
  {
    id: "writer.review.commentNavigation", app: "writer",
    commandIds: ["writer.review.commentPrevious", "writer.review.commentNext", "writer.review.commentDelete", "writer.review.commentResolve"],
    title: "Duyệt và xử lý nhận xét",
    summary: "Duyệt lần lượt các nhận xét, đánh dấu đã xử lý mà vẫn giữ nội dung, mở lại hoặc xóa nhận xét.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Ghi chú" },
    keywords: ["nhận xét", "ghi chú", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Đánh giá, nhóm Ghi chú.", "Nhấn Nhận xét trước hoặc Nhận xét sau để cuộn tới và tô sáng nhận xét; hết danh sách sẽ quay vòng.", "Nhấn Đã xử lý để làm mờ nhận xét nhưng vẫn giữ lại; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa nhận xét đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại Resolve hoặc Delete."]
  },
  {
    id: "writer.text.basicFormat",
    app: "writer",
    commandIds: [
      "writer.font.family",
      "writer.font.size",
      "writer.font.grow",
      "writer.font.shrink",
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
    keywords: ["đậm", "nghiêng", "gạch chân", "gạch ngang", "phông chữ", "cỡ chữ", "màu chữ", "tô vàng", "chỉ số", "xóa định dạng", "bold", "italic", "font", "highlight", "ctrl+b"],
    steps: [
      "Bôi chữ cần đổi (hoặc đặt con trỏ trong từ). Mở tab Trang đầu, nhóm Phông chữ — hàng trên là hộp Phông chữ và Cỡ chữ, hàng dưới là các nút kiểu chữ.",
      "Phông chữ: Times New Roman (mặc định), Be Vietnam Pro, Arial, Calibri, Roboto. Cỡ chữ: 10 pt, 12 pt, 14 pt (NĐ 30 — mặc định văn bản hành chính), 16 pt, 18 pt, 24 pt. Nút Tăng cỡ chữ (Ctrl+Shift+>) / Giảm cỡ chữ (Ctrl+Shift+<) nhảy nhanh theo các nấc đó.",
      "Đậm Ctrl+B, Nghiêng Ctrl+I, Gạch chân Ctrl+U, Gạch ngang (không có phím tắt). Chỉ số dưới Ctrl+= (ví dụ H₂O), Chỉ số trên Ctrl+Shift++ (ví dụ m²). Nhấn lại cùng nút để tắt.",
      "Màu chữ đổi vùng chọn sang đỏ (#dc2626). Màu nền chữ tô vàng (#ffcd00) giống bút highlight. Xóa định dạng (Ctrl+Space) bỏ hết kiểu, giữ nguyên chữ. Ctrl+Z hoàn tác."
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
    summary: "Đánh số nhiều cấp giống Word: 1. / 1.1. / 1.1.1., 1. / a. / i., hoặc Điều / Khoản / Điểm theo văn bản hành chính (NĐ 30/2020/NĐ-CP). Khác nút Đánh số — Đánh số chỉ ra 1. 2. 3. một cấp.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["danh sách đa cấp", "multilevel list", "1.1.1", "điều khoản điểm", "nghị định 30", "outline numbering", "tab", "thụt cấp"],
    steps: [
      "Đặt con trỏ trong đoạn (hoặc bôi vài đoạn). Tab Trang đầu, nhóm Đoạn văn, hàng trên: sau Dấu đầu dòng và Đánh số là nút Danh sách đa cấp (biểu tượng 1. / 1.1 / a.). Nhấn mũi tên để mở gallery.",
      "Chọn một kiểu: 1. / 1.1. / 1.1.1. (đề mục pháp lý, mục lục); 1. / a. / i. (kiểu Word cổ điển); Điều 1. / 1. / a) (Điều — Khoản — Điểm, văn bản hành chính Việt Nam). Các đoạn đang chọn thành một danh sách cùng kiểu.",
      "Tăng cấp: đặt con trỏ trong mục danh sách rồi nhấn Tab (hoặc Thụt lề Ctrl+M). Mục đó thành cấp con của mục ngay trên — ví dụ 2. thành 1.1. Giảm cấp: Shift+Tab (hoặc Giảm thụt lề Ctrl+Shift+M). Ở cấp 1, Shift+Tab đưa mục về đoạn thường.",
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
      "writer.para.spacing2"
    ],
    title: "Căn lề đoạn văn và khoảng cách dòng",
    summary: "Căn lề văn bản (trái, giữa, phải, đều hai bên) và chọn khoảng cách giữa các dòng (1.0, 1.5, 2.0). Các điều khiển bố trí trực tiếp trên ribbon Trang đầu và Bố cục giúp thao tác nhanh và an toàn tuyệt đối cho định dạng ODF chuẩn.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đoạn văn" },
    keywords: ["căn lề", "căn đoạn", "căn trái", "căn giữa", "căn phải", "căn đều", "giãn dòng", "line spacing", "paragraph alignment"],
    steps: [
      "Bôi đen một hoặc nhiều đoạn văn bản cần định dạng, hoặc đặt con trỏ chuột bên trong đoạn văn đó.",
      "Tại tab Trang đầu, nhóm Đoạn văn: nhấn Căn trái (Ctrl+L), Căn giữa (Ctrl+E), Căn phải (Ctrl+R), hoặc Căn đều (Ctrl+J) để đổi lề đoạn văn ngay tức thì.",
      "Nhấp vào menu Giãn dòng để chọn các tỷ lệ dòng chuẩn: 1.0 (chuẩn đơn), 1.5 (chuẩn phổ biến cho văn bản hành chính theo NĐ 30/2020), hoặc 2.0 (chuẩn dòng đôi). Thao tác tương tự có thể thực hiện tại tab Bố cục.",
      "Tất cả thuộc tính căn lề và giãn dòng được lưu trữ trực tiếp vào ODF fo:text-align và fo:line-height, tương thích hoàn toàn khi mở lại trên LibreOffice và Microsoft Word."
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
      "Hộp Trước đặt margin phía trên đoạn; hộp Sau đặt margin phía dưới đoạn. Năm nấc: 0 pt, 6 pt, 8 pt, 12 pt, 18 pt. 0 pt khít đoạn kề; 6 pt khớp khoảng mặc định đang thấy trên trang soạn thảo; 8 pt giống kiểu Normal của Word; 12/18 pt dùng khi cần tách đoạn rõ hơn trước khi in.",
      "Chọn một nấc — khoảng cách áp ngay lên đoạn đang chọn trên canvas. Muốn vừa trước vừa sau thì chọn lần lượt hai hộp. Không nhầm với menu Giãn dòng 1.0/1.5/2.0 trên cùng nhóm (và trên tab Trang đầu): menu đó đổi chiều cao dòng, không đổi khoảng giữa các đoạn.",
      "Lưu tài liệu để khoảng trước/sau đi theo file (FODT/DOCX). Ctrl+Z hoàn tác lần chọn vừa rồi."
    ]
  },
  {
    id: "writer.table.insert",
    app: "writer",
    commandIds: ["writer.table.insert"],
    title: "Chèn bảng",
    summary: "Chèn ngay một bảng 3 hàng × 4 cột tại vị trí con trỏ: hàng đầu là «Tiêu đề» in đậm, các ô dưới là «Dữ liệu», có viền xám, rộng bằng trang. Gõ đè chữ mẫu để điền nội dung.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng biểu" },
    keywords: ["bảng", "table", "chèn bảng", "hàng", "cột", "ô bảng", "tiêu đề"],
    steps: [
      "Đặt con trỏ vào đoạn văn, chỗ muốn đặt bảng. Mở tab Chèn, nhóm Bảng biểu, nhấn nút lớn Bảng biểu.",
      "VN Writer chèn ngay bảng 3 hàng × 4 cột (không mở hộp thoại chọn kích thước). Hàng 1 mỗi ô ghi «Tiêu đề» đậm; hàng 2–3 ghi «Dữ liệu». Viền 1px xám, đệm 6–10 pt, rộng 100% trang.",
      "Nhấp vào ô rồi gõ đè chữ mẫu. Tab nhảy ô tiếp theo như bảng HTML. Có thể thêm hàng/cột bằng cách sao chép hàng trong bảng hoặc hoàn tác bằng Ctrl+Z nếu chèn nhầm.",
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
      "Khi mở DOCX có ảnh neo hoặc hộp văn bản nổi, VN Writer giữ vị trí và kiểu bọc chữ từ tệp gốc. Các khung nhập hiện chưa hỗ trợ kéo để đổi vị trí; hãy chỉnh vị trí trong ứng dụng nguồn nếu cần.",
      "Nhấp ảnh để chọn (có tabindex). Delete khi đang chọn sẽ xóa ảnh. Ctrl+Z hoàn tác lần chèn.",
      "Muốn chú thích và đánh số hình: sau khi chèn, dùng tab Tham chiếu → nhóm Chú thích ảnh (bài «Chú thích ảnh và danh mục hình»)."
    ]
  },
  {
    id: "writer.headerFooter",
    app: "writer",
    commandIds: ["writer.header.insert", "writer.footer.insert"],
    title: "Đầu trang và chân trang",
    summary: "Nhảy vào vùng đầu trang hoặc chân trang của bố cục in để gõ tiêu đề, số trang. Nếu vùng còn trống, Writer điền sẵn «Tiêu đề đầu trang» hoặc «Trang 1 / 1» căn giữa cỡ 10 pt.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Đầu trang / Chân trang" },
    keywords: ["đầu trang", "chân trang", "header", "footer", "số trang", "tiêu đề trang"],
    steps: [
      "Mở tab Chèn, nhóm Đầu trang / Chân trang. Nhấn Đầu trang hoặc Chân trang (hai nút lớn).",
      "Con trỏ nhảy vào vùng tương ứng trên trang giấy (chỉ thấy rõ ở Bố trí in). Nếu vùng trống, Writer chèn sẵn một dòng căn giữa 10 pt: «Tiêu đề đầu trang» hoặc «Trang 1 / 1». Gõ đè chữ mẫu.",
      "Đầu trang / chân trang lặp trên mọi trang khi xem Bố trí in và khi in. Chế độ Bố trí Web ẩn hai vùng này.",
      "Nhấp lại thân tài liệu để thoát vùng đầu/chân trang. Ctrl+Z hoàn tác lần chèn chữ mẫu nếu vùng vốn trống."
    ]
  },
  {
    id: "writer.insert.textObjects",
    app: "writer",
    commandIds: ["writer.insert.textbox", "writer.insert.dateTime"],
    title: "Hộp văn bản và Ngày & Giờ",
    summary: "Hộp văn bản là khung chữ độc lập, kéo-thả và đổi kích thước được, nằm đè lên trang — khác WordArt (chữ trong dòng). Ngày & Giờ mở hộp chọn định dạng rồi chèn chuỗi ngày giờ hiện tại tại con trỏ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["hộp văn bản", "textbox", "khung chữ", "ngày giờ", "date time", "dd/mm/yyyy", "chèn ngày"],
    steps: [
      "Tab Chèn, nhóm Văn bản. Hộp văn bản (nút lớn, cạnh Chữ nghệ thuật) chèn khung mặc định «Nhập văn bản», viền xanh, khoảng 220×80 px. Kéo khung để đặt; kéo góc để đổi cỡ; nhấp vào chữ để sửa.",
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
      "Ba chế độ chỉ đổi cách nhìn, không sửa chữ. Cùng tab còn nhóm Hiển thị (Thước kẻ, Đường lưới) và Thu phóng."
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
    title: "Thước, đường lưới, vừa khổ trang và cửa sổ mới",
    summary: "Thước ngang mặc định bật, đánh dấu lề 30 mm trái / 15 mm phải (NĐ 30). Đường lưới 5 mm chỉ để căn, không in. Vừa khổ trang co 50%–200% theo chiều rộng cửa sổ. Cửa sổ mới mở tab trình duyệt cùng URL.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Hiển thị" },
    keywords: ["thước", "đường lưới", "vừa khổ trang", "chiều rộng trang", "cửa sổ mới", "nđ 30", "lề 30mm"],
    steps: [
      "Tab Chế độ xem, nhóm Hiển thị: Thước và Đường lưới (nút bật/tắt). Nhóm Thu phóng cạnh đó có Chiều rộng trang (cùng cột với 100%). Nhóm Cửa sổ có nút lớn Cửa sổ mới.",
      "Thước là thanh ngang 22 px trên trang, mặc định hiện. Nhấn để ẩn. Vạch trái ghi «Lề trái: 30mm (NĐ 30/2020/NĐ-CP)», vạch phải «Lề phải: 15mm». Không kéo được để đổi lề — đổi lề ở tab Bố cục → Căn lề. Chế độ đọc cũng ẩn thước.",
      "Đường lưới mặc định tắt. Bật thì phủ lưới 18.8976 px (~5 mm), màu xanh rất nhạt — chỉ trên màn hình, không in, không xuất file. Chiều rộng trang tính (viewport − 40) / bề rộng giấy (A4 ~794 px), kẹp 50%–200%, tự chỉnh khi đổi cỡ cửa sổ.",
      "Cửa sổ mới gọi window.open cùng địa chỉ. Trình duyệt chặn pop-up thì thanh trạng thái: «Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho VN Office.» Tab mới là phiên độc lập, không chia undo."
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
    commandIds: ["writer.style.gallery", "writer.style.normal", "writer.style.apply"],
    title: "Thư viện kiểu và kiểu Thường",
    summary: "Dải Quick Styles trên tab Trang đầu và nút Thư viện kiểu áp Normal, Tiêu đề 1/2/3, Trích dẫn, Nhấn mạnh. Ctrl+Shift+N luôn về Normal. writer.style.apply không còn dropdown trên ribbon (tránh trùng dải thẻ).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu dáng" },
    keywords: ["thư viện kiểu", "styles gallery", "normal", "tiêu đề 1", "heading", "ctrl+shift+n", "trích dẫn", "nhấn mạnh"],
    steps: [
      "Tab Trang đầu, nhóm Kiểu dáng: nút lớn Thư viện kiểu, kèm dải thẻ nhanh (Normal, Tiêu đề 1/2/3…) ngay trên ribbon. Không còn hộp chọn Kiểu dáng riêng — lệnh apply vẫn chạy nội bộ khi nhấp thẻ.",
      "Thư viện kiểu mở hộp «Thư viện Kiểu dáng (Styles Gallery)», gợi ý «Nhấp để áp dụng ngay». Sáu thẻ: Normal (văn bản thường, 14 pt Times New Roman), Tiêu đề 1 (chữ hoa, căn giữa), Tiêu đề 2 (14 pt đậm), Tiêu đề 3 (13 pt đậm nghiêng), Trích dẫn (blockquote, viền trái), Nhấn mạnh (đậm nghiêng màu #b45309). Esc hoặc nhấp ra ngoài đóng.",
      "Ctrl+Shift+N (Kiểu Thường) — không có nút riêng — đặt đoạn đang đứng về Normal, gỡ lớp trích dẫn/nhấn mạnh. Đặt con trỏ trong đoạn rồi chọn thẻ, không cần bôi cả đoạn.",
      "Chỉ có sáu kiểu sẵn, không tạo/sửa kiểu tùy chỉnh như Word. Ctrl+Z hoàn tác lần áp kiểu."
    ]
  },
  {
    id: "writer.design.themes",
    app: "writer",
    commandIds: ["writer.design.themeGallery"],
    title: "Chủ đề văn bản",
    summary: "Sáu bộ chủ đề đổi đồng loạt phông, màu tiêu đề và giãn dòng cho cả tài liệu. Mặc định Tiêu chuẩn (Office) — Times New Roman. Có bộ Hành chính Việt Nam (NĐ 30).",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Định dạng tài liệu" },
    keywords: ["chủ đề", "theme", "nđ 30", "hành chính", "office", "be vietnam pro", "georgia"],
    steps: [
      "Tab Thiết kế, nhóm Định dạng tài liệu, nhấn nút lớn Chủ đề văn bản.",
      "Hộp «Thư viện Kiểu & Chủ đề tài liệu»: chọn bộ rồi Áp dụng kiểu. Sáu mẫu — Tiêu chuẩn (Office, Times New Roman), Hành chính Việt Nam (NĐ 30, TNR chữ đen), Hiện đại (Be Vietnam Pro), Trang nhã (Georgia), Tối giản (Arial), Sáng tạo Emerald (Calibri).",
      "Áp dụng gán phông/màu/giãn dòng lên toàn bộ tài liệu (thuộc tính data-vno-theme). Không phải file theme XML của Word — không có Variants.",
      "Esc / Hủy bỏ đóng không đổi. Ctrl+Z hoàn tác lần áp chủ đề."
    ]
  },
  {
    id: "writer.text.changeCaseHelp",
    app: "writer",
    commandIds: ["writer.text.changeCase"],
    title: "Đổi chữ hoa / thường",
    summary: "Shift+F3 (hoặc nút trên nhóm Phông chữ) xoay vòng hoa/thường/tiêu đề cho vùng đang bôi; nếu chưa bôi thì lấy cả từ tại con trỏ.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["đổi chữ hoa", "chữ thường", "title case", "shift+f3", "change case", "in hoa"],
    steps: [
      "Bôi chữ (hoặc đặt con trỏ trong một từ). Tab Trang đầu, nhóm Phông chữ, nút Đổi chữ hoa/thường (hàng icon, cạnh Gạch ngang) — hoặc Shift+F3.",
      "Chu kỳ: đang viết HOA TOÀN BỘ → Title Case (Hoa Chữ Đầu); đang thường hết → HOA TOÀN BỘ; hỗn hợp hoặc Title Case → chữ thường.",
      "Không có menu Sentence case / tOGGLE CASE như Word. Nhấn lại Shift+F3 để vòng tiếp.",
      "Ctrl+Z hoàn tác lần đổi."
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
      "Sắp xếp cần ít nhất 2 khối kề nhau; so sánh chữ đã cắt khoảng trắng, locale số thông minh, không phân biệt hoa thường. Con trỏ trong danh sách thì sắp mọi mục li. Chỉ A–Z, không hộp chọn cột/thứ tự.",
      "Hiện dấu định dạng: ¶ cuối đoạn, ↵ xuống dòng, · khoảng trắng. Chỉ trên màn hình. Tô nền đoạn luôn vàng kem #FFF2CC (không bảng màu) — nhấn không tự tắt, muốn bỏ thì Xóa định dạng (Ctrl+Space) hoặc tô lại bằng cách khác.",
      "Hộp Viền đoạn: Viền dưới (mặc định, 1px #334155), Tất cả viền, Không viền. Alt+Shift+↑/↓ hoán đổi khối hiện tại với khối trước/sau trong thân tài liệu. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.insert.illustrationsExtra",
    app: "writer",
    commandIds: ["writer.shape.insert", "writer.diagram.insert", "writer.chart.insert"],
    title: "Chèn hình khối, sơ đồ và biểu đồ",
    summary: "Ba nút lớn nhóm Minh họa mở hộp thoại chọn kiểu rồi mới chèn. Hình khối: chữ nhật / bo tròn / tròn / tam giác / hình thoi / mũi tên / đường thẳng. Sơ đồ: quy trình, chu trình, phân cấp, danh sách (3–6 phần tử). Biểu đồ: cột, đường, tròn, miền — nhập nhãn, giá trị và xem trước SVG.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["hình khối", "sơ đồ", "biểu đồ", "shape", "smartart", "chart", "hộp thoại", "hình tròn", "tam giác", "hình thoi", "triangle", "diamond", "quy trình"],
    steps: [
      "Tab Chèn, nhóm Minh họa: Hình khối, Sơ đồ, Biểu đồ (ba nút lớn, cạnh Hình ảnh). Mỗi nút mở hộp thoại chọn kiểu; Hủy, nút ×, Esc hoặc bấm ra ngoài thì không chèn gì.",
      "Hình khối: hộp «Chèn hình khối» — bảy thẻ radio: Hình chữ nhật (140×80, nền #2563eb), Chữ nhật bo tròn, Hình tròn / Elip (110×110, #0ea5e9), Hình tam giác (120×100, #16a34a), Hình thoi (120×100, #9333ea), Mũi tên sang phải (140×70, #f59e0b), Đường thẳng ngang. Chọn thẻ rồi Chèn. Lớp nổi tại x=100, y lệch dần 160+(n×25); kéo để đặt, nút × xóa khi đang chọn.",
      "Sơ đồ: hộp «Chèn sơ đồ SmartArt» — Quy trình / Chu trình / Phân cấp / Danh sách, ô số bước 3–6 (mặc định 4). Chèn sơ đồ tạo khối HTML tiêu đề theo kiểu đã chọn, nút «Bước 1»… sửa được chữ, nút Xóa sơ đồ. Không phải SmartArt Word.",
      "Biểu đồ: hộp «Chèn biểu đồ minh họa» — tiêu đề, kiểu Cột/Đường/Tròn/Miền, hàng nhãn & giá trị (mẫu Quý 1–4: 120, 190, 300, 250) và khung Xem trước trực quan. Chèn biểu đồ đưa SVG đã chọn vào trang. Ctrl+Z gỡ đối tượng vừa chèn. Hình ảnh cùng nhóm là bài riêng."
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
      "Không có hộp Dropped / In margin như Word. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.insert.equationBookmark",
    app: "writer",
    commandIds: ["writer.insert.equation", "writer.insert.bookmark", "writer.insert.crossReference"],
    title: "Công thức chữ, đánh dấu và tham chiếu chéo",
    summary: "Công thức là hộp chữ toán (mặc định E = mc²), không phải trình soạn phương trình. Đánh dấu tạo mỏ neo nội bộ; Tham chiếu chéo chèn liên kết tới tiêu đề hoặc đánh dấu đã có.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["công thức", "equation", "đánh dấu", "bookmark", "tham chiếu chéo", "cross reference", "e = mc"],
    steps: [
      "Công thức: tab Chèn, nhóm Ký hiệu, nút lớn Công thức (cạnh Ký hiệu). Hộp «Công thức» ghi rõ bản rút gọn — dạng chữ, không soạn đồ họa. Ô Biểu thức mặc định E = mc²; mẫu sẵn a² + b² = c², nghiệm phương trình bậc hai, trung bình ∑. Chèn → span phông Cambria Math, khung nét đứt xanh.",
      "Đánh dấu: cùng tab, nhóm Liên kết, nút Đánh dấu. Hộp «Đánh dấu», Tên đánh dấu mặc định bookmark1. Tên được bỏ dấu, ký tự lạ thành -, trùng thì thêm -2, -3… Tạo thẻ neo ẩn tại con trỏ.",
      "Tham chiếu chéo: nút ngay dưới Đánh dấu. Hộp «Tham chiếu chéo» — nếu chưa có tiêu đề (Heading) hay đánh dấu thì báo «Chưa có tiêu đề hoặc đánh dấu nào.» và khóa Chèn. Có rồi: chọn H tiêu đề hoặc ⚑ đánh dấu, chèn liên kết nội bộ hiện tên đó.",
      "Không có số trang / «phía trên» như Word. Ctrl+Z gỡ hộp hoặc liên kết vừa chèn. Ký hiệu đặc biệt là bài riêng cùng nhóm Ký hiệu."
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
      "Chữ được bọc mark vàng (neo ghi chú). Panel bên «Ghi chú tài liệu» liệt kê các ghi chú. Không thêm được khi con trỏ chỉ nhấp, khác Word.",
      "Ctrl+Z gỡ ghi chú vừa thêm. Nhận xét trước/sau, xóa, đã xử lý: bài «Duyệt nhận xét»."
    ]
  },
  {
    id: "writer.page.setup",
    app: "writer",
    commandIds: ["writer.page.margins", "writer.page.orientation", "writer.page.size"],
    title: "Lề, hướng giấy và khổ giấy",
    summary: "Ba nút mở cùng hộp «Thiết lập trang». Mặc định A4 dọc, lề trên/dưới 20 mm, trái 30 mm, phải 15 mm (NĐ 30). Khổ: A4, Letter, Legal. Hướng: Dọc / Ngang. Lề 0–100 mm.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["căn lề", "lề trang", "hướng giấy", "khổ giấy", "a4", "nđ 30", "portrait", "landscape", "thiết lập trang"],
    steps: [
      "Tab Bố cục, nhóm Thiết lập trang: Căn lề, Hướng giấy, Khổ giấy (ba nút lớn). Cả ba mở hộp «Thiết lập trang» — Hướng giấy đặt focus vào hướng; Căn lề và Khổ giấy đặt focus vào khổ.",
      "Khổ giấy: A4 (210 × 297 mm, mặc định), Letter (215.9 × 279.4 mm), Legal (216 × 356 mm). Khi mở DOCX có khổ không chuẩn, hộp hiển thị Tùy chỉnh kèm kích thước gốc và VN Writer giữ nguyên kích thước đó khi lưu. Hướng: Dọc (Portrait) hoặc Ngang (Landscape).",
      "Lề trên / dưới / trái / phải (mm), mỗi ô 0–100. Mặc định trên 20, dưới 20, trái 30, phải 15 — đúng lề văn bản hành chính NĐ 30. Áp dụng / Hủy bỏ.",
      "Không có gallery Narrow/Wide như Word — chỉ số mm. Thước trên tab Chế độ xem phản ánh lề trái/phải sau khi áp dụng. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.layout.lineNumbers",
    app: "writer",
    commandIds: ["writer.layout.lineNumbers"],
    title: "Danh số dòng",
    summary: "Bật cấu hình danh số dòng (Không có / Liên tục / Mỗi trang / Mỗi mục) để file FODT/DOCX mở bằng Word hoặc LibreOffice tự vẽ số ở lề trái. Canvas VN Writer không vẽ số trên từng dòng — chỉ hiện trạng thái bật.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "Thiết lập trang" },
    keywords: ["danh số dòng", "line numbers", "số dòng", "lề trái", "trích dẫn dòng", "continuous", "restart each page"],
    steps: [
      "Mở tab Bố cục, nhóm Thiết lập trang. Hộp «Danh số dòng» nằm ngay sau menu Ngắt trang (đúng chỗ Line Numbers trên Word).",
      "Chọn Liên tục để đánh số 1, 2, 3… suốt tài liệu; Mỗi trang để số bắt đầu lại từ 1 ở mỗi trang; Mỗi mục để canvas VN Writer ghi nhận restart theo ngắt mục; Không có để tắt.",
      "Canvas VN Writer hiện khung chữ ở lề trái: «Danh số dòng: … Số hiện ở lề trái khi mở bằng Word hoặc LibreOffice — canvas VN Writer không vẽ số.» Đây là cấu hình xuất file, không phải số đã in trên trang soạn thảo (engine trình duyệt không tách dòng visual như Word).",
      "Lưu FODT: bật thì ghi text:linenumbering-configuration (increment=1). Mở file bằng Microsoft Word hoặc LibreOffice Writer sẽ thấy số ở lề trái. «Mỗi mục» chỉ giữ trên VN Writer/FODT; DOCX qua LibreOffice thành Liên tục vì ODF không có restart-each-section. Ctrl+Z hoàn tác."
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
      "Nút Cột mở hộp «Chia cột văn bản (Columns)»: mẫu Một cột / Hai cột / Ba cột; Số cột 1–4; Khoảng cách giữa các cột 0–50 mm; tick Đường kẻ phân cách cột; khung Xem trước. Đang chia nhiều cột thì có Bỏ chia cột (1 cột). Áp dụng.",
      "Chia cột CSS trên toàn bộ thân, không theo vùng bôi hay từng section. Ngắt cột (menu Ngắt trang cùng nhóm) đẩy chữ sau con trỏ sang cột kế. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.page.watermarkBorder",
    app: "writer",
    commandIds: ["writer.page.watermark", "writer.page.border"],
    title: "Hình mờ và viền trang",
    summary: "Hình mờ chữ chéo (mặc định DỰ THẢO, đỏ #dc2626, 45°, mờ 0.2, cỡ 72). Viền trang nét liền/đứt/đôi, dày 1–6 pt, mặc định 2 pt xanh #0f4c81. Cả hai hiện khi in và xem trước.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Nền & Viền trang" },
    keywords: ["hình mờ", "watermark", "dự thảo", "mật", "khẩn", "viền trang", "page border", "nét đôi"],
    steps: [
      "Tab Thiết kế, nhóm Nền & Viền trang: Hình mờ, Màu trang (bài riêng), Viền trang — ba nút lớn. Cùng Hình mờ / Viền trang còn trên tab Bố cục, nhóm Nền & Viền trang.",
      "Hình mờ (440 px): chip DỰ THẢO, MẬT, TUYỆT MẬT, KHẨN, BẢN SAO; hoặc gõ chữ. Màu: Đỏ nhạt #dc2626 (mặc định), Xám, Xanh dương, Vàng hổ phách. Góc: Chéo 45° (chuẩn), −45°, Nằm ngang 0°. Độ mờ 0.05–0.60 (bước 0.05), mặc định 0.2. Cỡ chữ cố định 72. Áp dụng. Đã có hình mờ thì thêm Xóa hình mờ.",
      "Viền trang: nét Liền / Đứt / Đôi / Không có viền; dày 1, 1.5, 2 (mặc định), 3, 4.5, 6 pt; màu Xanh VN Office #0f4c81, Đen than, Xám, Đỏ hành chính, Xanh lá. Xem trước khung. Đang có viền thì Xóa viền trang.",
      "Hình mờ và viền phủ overlay soạn thảo và mỗi tờ khi Xem trước khi in. Không có hình mờ ảnh. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "writer.file.printPreviewHelp",
    app: "writer",
    commandIds: ["writer.file.printPreview"],
    title: "Xem trước khi in",
    summary: "Ctrl+F2 mở overlay phân trang thật: khổ/hướng/lề trên thanh công cụ, lật trang, thu phóng 30%–200%. In tài liệu gọi hộp in trình duyệt (Ctrl+P). Esc đóng.",
    ribbon: { tab: "Bố cục", tabId: "layout", group: "In ấn" },
    keywords: ["xem trước khi in", "print preview", "ctrl+f2", "phân trang", "in tài liệu"],
    steps: [
      "Tab Bố cục, nhóm In ấn: Xem trước khi in (nút lớn, cạnh In tài liệu) — hoặc Ctrl+F2.",
      "Thanh công cụ: In tài liệu (Ctrl+P → window.print), huy hiệu «Khổ: A4 · Dọc (Portrait) · Lề: T20 D20 T30 P15 mm» (số theo thiết lập trang), ◀ Trang trước / Trang sau ▶, ô số trang / tổng, − Thu nhỏ / + Phóng to (bước 0.15, kẹp 0.3–2.0), Vừa trang (0.35–1.2 theo chiều cao).",
      "Mỗi tờ lặp đầu trang / chân trang, hình mờ, viền trang. Chú thích cuối trang theo tờ có mốc; chú thích cuối tài liệu nằm tờ cuối. Phím: Esc đóng, ← / PageUp tờ trước, → / PageDown tờ sau, Ctrl+P in.",
      "Đây là xem HTML đã chia trang, không phải Backstage Word. Đóng bằng × hoặc Esc về soạn thảo."
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
      "Nhấp số trên chữ để nhảy xuống ghi chú. Không có hộp đổi kiểu đánh số / chuyển footnote↔endnote như Word. Ctrl+Z gỡ mốc vừa chèn."
    ]
  },
  {
    id: "writer.file.openDocument",
    app: "writer",
    commandIds: ["common.file.open"],
    title: "Mở tài liệu có sẵn (Word DOCX / ODT)",
    summary: "Mở tệp tài liệu Word (.docx, .doc) hoặc OpenDocument (.odt) có sẵn trên máy tính qua phím tắt Ctrl+O hoặc menu Tệp. Tự động nạp định dạng, căn lề, bảng biểu và cập nhật nhãn tài liệu.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["mở tệp", "mở file", "open", "ctrl+o", "docx", "word", "odt", "mở tài liệu"],
    steps: [
      "Cách 1: Nhấn tổ hợp phím tắt Ctrl+O trên bàn phím tại bất kỳ màn hình nào trong VN Writer.",
      "Cách 2: Nhấn vào tab màu xanh «Tệp» ở góc trên cùng bên trái thanh công cụ để mở Backstage Menu, sau đó chọn mục «Mở tệp».",
      "Hộp thoại chọn tệp của hệ điều hành sẽ xuất hiện. Duyệt đến thư mục chứa tệp Word (.docx, .doc, .odt, .rtf) cần mở, chọn tệp rồi nhấn Open.",
      "Hệ thống tự động chuyển đổi và hiển thị văn bản lên khổ giấy A4 chuẩn Nghị định 30/2020/NĐ-CP (lề trái 30 mm, lề phải 15 mm). Toàn bộ bảng biểu, tiêu đề căn giữa, định dạng phông chữ Times New Roman và tiêu đề tệp trên thanh tab được cập nhật tự động."
    ]
  },
  {
    id: "writer.file.saveDocument",
    app: "writer",
    commandIds: ["common.file.save", "common.file.saveAs"],
    title: "Lưu tài liệu và Lưu bản sao (DOCX)",
    summary: "Lưu văn bản đang soạn thảo sang tệp DOCX thật trên đĩa máy tính thông qua công cụ xử lý LibreOffice Core headless. Hỗ trợ phím tắt Ctrl+S, biểu tượng đĩa mềm trên thanh truy cập nhanh và menu Tệp.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["lưu tệp", "lưu file", "save", "save as", "ctrl+s", "docx", "lưu bản sao", "lưu tài liệu"],
    steps: [
      "Cách 1: Nhấn biểu tượng đĩa mềm trên thanh công cụ truy cập nhanh ở góc trên bên trái màn hình (hoặc nhấn tổ hợp phím Ctrl+S).",
      "Cách 2: Nhấn vào nút màu xanh «Tệp» ở góc trên cùng bên trái để mở menu Backstage, sau đó nhấn chọn mục «Lưu» hoặc «Lưu bản sao».",
      "Hộp thoại lưu tệp của hệ điều hành sẽ xuất hiện. Chọn thư mục trên máy tính, đặt tên tệp mong muốn (định dạng mặc định .docx) và nhấn Save.",
      "Sau khi lưu thành công, thông báo xác nhận sẽ hiển thị, tên tệp trên thanh tab tiêu đề sẽ được cập nhật đồng bộ và tài liệu được ghi vào danh sách Tệp gần đây.",
      "Lưu ý: Chức năng Lưu tệp thật yêu cầu ứng dụng VN Office Desktop có kết nối công cụ LibreOffice Core; khi chạy trên trình duyệt dev, hệ thống sẽ hiện hộp thoại thông báo hướng dẫn rõ ràng."
    ]
  },
  {
    id: "writer.file.saveFloatingContent",
    app: "writer",
    commandIds: ["common.file.save", "common.file.saveAs"],
    title: "Lưu DOCX có ảnh neo và khung nổi",
    summary: "Giữ nguyên ảnh neo trang, nhóm hình và vị trí khung nổi chưa chỉnh sửa khi lưu lại tài liệu Word.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tài liệu" },
    keywords: ["ảnh neo", "khung nổi", "nhóm hình", "anchor", "floating", "lưu docx"],
    steps: [
      "Mở tài liệu DOCX bằng Tệp → Mở. VN Writer hiển thị ảnh neo và khung nổi từ tài liệu gốc trên vùng soạn thảo.",
      "Ảnh neo theo Trang được tính từ mép giấy; ảnh neo theo Lề hoặc Cột được tính từ vùng văn bản. Kiểu bọc Trên và dưới chừa chỗ cho nội dung kế tiếp, còn Không bọc cho phép chữ chồng theo thiết kế gốc.",
      "Soạn sửa phần văn bản cần thiết. Các nhóm hình và ảnh neo chưa hỗ trợ kéo hoặc đổi kích thước trực tiếp; VN Writer giữ dữ liệu gốc của các đối tượng này khi lưu.",
      "Nhấn Ctrl+S hoặc chọn Tệp → Lưu/Lưu bản sao, chọn định dạng DOCX rồi xác nhận vị trí lưu.",
      "Mở lại tệp bằng Microsoft Word hoặc LibreOffice Writer để kiểm tra bố cục. Nếu cần chỉnh vị trí hay thành phần bên trong nhóm hình, hãy chỉnh trong ứng dụng nguồn rồi mở lại trong VN Writer."
    ]
  },
  {
    id: "writer.accessibility.keyboardNav",
    app: "writer",
    commandIds: ["common.file.backstage", "writer.format.bold", "writer.format.italic", "writer.format.underline"],
    title: "Điều hướng bằng bàn phím và trợ năng (VN Writer)",
    summary: "Thao tác hoàn toàn bằng bàn phím không cần dùng chuột: mở menu Tệp (Alt+F), chuyển tab Ribbon bằng phím mũi tên Trái/Phải, di chuyển giữa các nút bằng Tab, bẫy tiêu điểm trong các hộp thoại (Tab/Shift+Tab) và đóng bằng Escape khôi phục tiêu điểm.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trợ năng" },
    keywords: ["bàn phím", "phím tắt", "trợ năng", "accessibility", "keyboard", "focus", "alt+f", "esc", "tab", "mũi tên"],
    steps: [
      "Mở menu Tệp (Backstage) bằng phím tắt Alt+F: Menu toàn màn hình mở ra với tiêu điểm tự động đặt vào nút 'Quay lại'. Dùng mũi tên Lên/Xuống để duyệt danh sách lệnh (Mới, Mở, Lưu, In...), dùng mũi tên Phải để đi vào các thẻ mẫu văn bản, và nhấn Escape để đóng menu trở về vùng soạn thảo.",
      "Chuyển tab trên thanh Ribbon: Nhấn Tab cho đến khi tiêu điểm nằm trên dải tab Ribbon, sau đó dùng phím mũi tên Trái (ArrowLeft) hoặc Phải (ArrowRight) để chuyển tab qua lại. Phím Home nhảy về tab Trang đầu, phím End nhảy tới tab cuối cùng. Dùng phím mũi tên Trái từ tab đầu tiên để đi sang nút 'Tệp'.",
      "Duyệt các nút lệnh trên Ribbon: Nhấn phím Tab để di chuyển tiêu điểm tuần tự qua từng nhóm và nút lệnh trên thanh Ribbon. Mọi nút lệnh nhận tiêu điểm đều hiển thị viền focus rõ ràng (chuẩn tương phản WCAG 2.1 AA). Nhấn Enter hoặc Space để kích hoạt lệnh.",
      "Thao tác trong hộp thoại và bẫy tiêu điểm (Focus Trap): Khi mở các hộp thoại như Thiết lập trang, Chèn cột, Thủy ấn hoặc Trộn thư, tiêu điểm bàn phím được bẫy hoàn toàn bên trong hộp thoại (phím Tab và Shift+Tab chỉ xoay vòng giữa các điều khiển hợp lệ của hộp thoại, không bị rơi ra ngoài nền). Nhấn Escape để đóng hộp thoại bất kỳ lúc nào và tự động khôi phục tiêu điểm về nút đã mở.",
      "Soạn thảo văn bản và phím tắt định dạng: Nhập văn bản trực tiếp trong vùng soạn thảo trang giấy. Sử dụng các tổ hợp phím tắt chuẩn như Ctrl+B (chữ đậm), Ctrl+I (chữ nghiêng), Ctrl+U (gạch chân), Ctrl+Z (hoàn tác), Ctrl+Y (làm lại)."
    ]
  },
  {
    id: "writer.macro.basics",
    app: "writer",
    commandIds: ["common.macro.recordToggle", "common.macro.manager"],
    title: "Ghi và quản lý Macro (Tự động hóa thao tác)",
    summary: "Ghi lại chuỗi thao tác lệnh trong VN Writer để phát lại tự động. Giúp tiết kiệm thời gian cho các chuỗi định dạng lặp đi lặp lại. Hỗ trợ phím tắt Ctrl+Shift+R để bật/dừng ghi và Alt+F8 để mở hộp thoại Quản lý Macro.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Macro" },
    keywords: ["macro", "ghi macro", "dừng ghi", "quản lý macro", "xem macro", "tự động hóa", "record macro", "alt+f8", "ctrl+shift+r"],
    steps: [
      "Bắt đầu ghi: Mở tab Chế độ xem trên Ribbon, trong nhóm Macro nhấn nút «Ghi Macro» (hoặc nhấn tổ hợp phím Ctrl+Shift+R). Nút sẽ chuyển sang biểu tượng hình vuông dừng ghi màu đỏ với nhãn «Dừng ghi», đồng thời chỉ báo chấm đỏ nhấp nháy trên thanh trạng thái và nút Ribbon sẽ kích hoạt.",
      "Thực hiện các thao tác: Tiến hành các thao tác lệnh bạn muốn ghi lại (ví dụ: bôi đậm, đổi màu chữ, căn giữa đoạn văn, chèn bảng, đổi hướng giấy...).",
      "Dừng ghi và đặt tên: Nhấn lại nút «Dừng ghi» trên Ribbon (hoặc nhấn Ctrl+Shift+R). Nhập tên cho Macro trong hộp thoại Lưu Macro và nhấn OK. Nếu không thực hiện thao tác nào trong lúc ghi, hệ thống sẽ thông báo và không lưu Macro rỗng.",
      "Xem và chạy Macro: Mở tab Chế độ xem, nhấn «Xem Macro» (hoặc nhấn Alt+F8) để mở hộp thoại Quản lý Macro. Tại đây bạn có thể nhấn nút «▶ Chạy» để phát lại các thao tác đã ghi, «Đổi tên» để cập nhật tên gọi, hoặc «Xóa» để gỡ bỏ Macro không dùng nữa.",
      "Giới hạn trung thực: Macro cơ bản chỉ ghi lại các thao tác đi qua hệ thống lệnh (Command Bus) như định dạng, chèn bảng, đổi bố cục... Macro KHÔNG ghi lại nội dung gõ chữ tự do từ bàn phím vào trang soạn thảo (do đây là nhập liệu trực tiếp của trình duyệt). Nếu trong chuỗi ghi có bước mở hộp thoại cần người dùng tương tác, Macro sẽ tạm dừng tại hộp thoại đó chờ bạn thao tác. Macro được lưu trữ riêng biệt theo từng ứng dụng (Writer, Sheet, Slides) và không dùng chéo giữa các ứng dụng."
    ]
  },
  {
    id: "writer.ai.voiceInput",
    app: "writer",
    commandIds: ["ai.voice.input"],
    title: "Nhập liệu bằng giọng nói (Voice Input)",
    summary: "Nhập văn bản vào tài liệu bằng giọng nói tiếng Việt qua microphone. Dùng Web Speech API tích hợp sẵn trong trình duyệt — không cần cài thêm phần mềm. Nhận dạng giọng nói được xử lý cục bộ trong WebView2, không gửi dữ liệu ra ngoài.",
    ribbon: { tab: "Trợ lý VN AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["giọng nói", "voice input", "speech to text", "nhập liệu", "microphone", "micro", "nhận dạng giọng", "nói", "vi-VN"],
    steps: [
      "Mở tab Trợ lý VN AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Nhập liệu bằng giọng nói».",
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
    ribbon: { tab: "Trợ lý VN AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["tóm tắt cuộc họp", "meeting summary", "ghi chép", "transcript", "điểm chính", "quyết định", "việc cần làm", "action items"],
    steps: [
      "Mở tab Trợ lý VN AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Tóm tắt cuộc họp».",
      "Hộp thoại «Tóm tắt cuộc họp» xuất hiện. Dán hoặc nhập nội dung ghi chép/transcript cuộc họp vào ô văn bản.",
      "Nhấn nút «Tóm tắt» để bắt đầu xử lý. AI sẽ phân tích nội dung và tạo bản tóm tắt có cấu trúc với 3 phần: Điểm chính, Quyết định, Việc cần làm.",
      "Kết quả tóm tắt hiển thị trong bảng Trợ lý VN AI bên phải. Nhấn «Chèn vào tài liệu» để thêm nội dung tóm tắt vào vị trí con trỏ trong tài liệu.",
      "Nếu chưa kết nối AI cloud nào (chỉ dùng chế độ quy tắc cục bộ), tính năng sẽ hoạt động ở mức cơ bản. Để có kết quả tóm tắt chính xác hơn, vui lòng kết nối OpenAI, Gemini hoặc Claude trong phần cài đặt AI trên thanh Trợ lý VN AI."
    ]
  },
  {
    id: "writer.ai.smartSearch",
    app: "writer",
    commandIds: ["ai.assistant.smartSearch"],
    title: "Tìm kiếm thông minh (Smart Search)",
    summary: "Tìm kiếm nội dung trong tài liệu bằng ngôn ngữ tự nhiên thay vì chỉ tìm chuỗi chính xác như Ctrl+F. AI sẽ phân tích câu hỏi và tìm các đoạn văn bản liên quan nhất trong tài liệu.",
    ribbon: { tab: "Trợ lý VN AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["tìm kiếm thông minh", "smart search", "tìm kiếm AI", "ngôn ngữ tự nhiên", "natural language search", "tìm đoạn"],
    steps: [
      "Mở tab Trợ lý VN AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Tìm kiếm thông minh».",
      "Hộp thoại «Tìm kiếm thông minh» xuất hiện. Nhập câu hỏi tìm kiếm bằng ngôn ngữ tự nhiên, ví dụ: «tìm đoạn nói về ngân sách quý 2» hoặc «tìm phần thảo luận về nhân sự».",
      "Nhấn nút «Tìm kiếm» để bắt đầu. AI sẽ phân tích nội dung tài liệu và tìm các đoạn liên quan đến câu hỏi.",
      "Kết quả hiển thị trong bảng Trợ lý VN AI bên phải, bao gồm các đoạn văn bản tìm thấy và vị trí trong tài liệu.",
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
    ribbon: { tab: "Trợ lý VN AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["dịch thuật", "translate", "dịch", "tiếng anh", "tiếng trung", "tiếng nhật", "tiếng hàn", "tiếng pháp", "dịch văn bản", "translation"],
    steps: [
      "Bôi đen đoạn văn bản cần dịch. Nếu không chọn gì, toàn bộ nội dung tài liệu sẽ được dịch.",
      "Mở tab Trợ lý VN AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Dịch thuật».",
      "Hộp thoại «Dịch thuật» xuất hiện với 6 ngôn ngữ đích để chọn: Tiếng Anh, Tiếng Việt, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp. Chọn ngôn ngữ cần dịch rồi nhấn «Dịch».",
      "Kết quả hiển thị trong bảng Trợ lý VN AI bên phải. Nếu đã bôi đen văn bản, có 2 nút: «Thay thế vùng chọn» (thay nội dung gốc bằng bản dịch) và «Chèn bên dưới» (giữ bản gốc, thêm bản dịch phía dưới).",
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
    ribbon: { tab: "Trợ lý VN AI", tabId: "ai", group: "AI Thông minh" },
    keywords: ["viết nháp", "draft", "soạn thảo", "soạn thư", "soạn hợp đồng", "văn bản hành chính", "AI viết", "tạo văn bản"],
    steps: [
      "Mở tab Trợ lý VN AI trên ribbon, trong nhóm AI Thông minh nhấn nút «Viết nháp».",
      "Hộp thoại «AI Viết nháp» xuất hiện. Nhập mô tả nội dung bạn muốn AI soạn, ví dụ: «soạn thư mời họp giao ban tuần», «soạn hợp đồng thuê nhà cơ bản», «soạn công văn đề nghị».",
      "Nhấn «Tạo nháp» để bắt đầu. AI sẽ tạo bản nháp có cấu trúc phù hợp loại văn bản (tiêu đề, kính gửi, nội dung, ký tên nếu là thư/công văn).",
      "Kết quả hiển thị trong bảng Trợ lý VN AI với cảnh báo: đây là bản nháp do AI tạo, cần tự kiểm tra lại nội dung trước khi sử dụng, đặc biệt với hợp đồng/văn bản có giá trị pháp lý.",
      "Nhấn «Chèn vào tài liệu» để thêm bản nháp vào vị trí con trỏ. Ctrl+Z hoàn tác nếu chèn nhầm.",
      "Lưu ý: Chế độ quy tắc cục bộ chỉ đưa ra gợi ý chung. Để có bản nháp tốt, nên kết nối AI cloud (OpenAI/Gemini/Claude) hoặc cài Ollama."
    ]
  }
];


