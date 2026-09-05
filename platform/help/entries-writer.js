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
    summary: "Gắn chú thích tự đánh số cho hình ảnh, bảng hoặc phương trình, rồi chèn / cập nhật danh mục hình ảnh từ các chú thích đó.",
    ribbon: { tab: "Tham chiếu", tabId: "references", group: "Chú thích ảnh" },
    keywords: ["chú thích ảnh", "caption", "danh mục hình", "table of figures", "hình", "bảng"],
    steps: [
      "Chọn hình ảnh, bảng hoặc phương trình trong trang soạn thảo.",
      "Mở tab Tham chiếu, nhóm Chú thích ảnh, nhấn Chèn chú thích ảnh.",
      "Chọn nhãn (Hình / Bảng / Phương trình), vị trí (dưới hoặc trên đối tượng), nhập nội dung chú thích rồi nhấn Chèn. Số thứ tự được gán tự động.",
      "Đặt con trỏ nơi muốn hiện danh mục, nhấn Danh mục hình ảnh, chọn loại rồi chèn.",
      "Khi thêm hoặc sửa chú thích, nhấn Cập nhật danh mục để làm mới số thứ tự và dòng trong danh mục."
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
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Nhận xét" },
    keywords: ["nhận xét", "ghi chú", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Đánh giá, nhóm Nhận xét.", "Nhấn Nhận xét trước hoặc Nhận xét sau để cuộn tới và tô sáng nhận xét; hết danh sách sẽ quay vòng.", "Nhấn Đã xử lý để làm mờ nhận xét nhưng vẫn giữ lại; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa nhận xét đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại Resolve hoặc Delete."]
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
  }
];
