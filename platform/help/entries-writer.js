/**
 * Hướng dẫn sử dụng VN Writer — nội dung tiếng Việt thật, khớp UI hiện có.
 * Task sau thêm entry mới vào mảng này (hoặc file catalog app tương ứng).
 */

export const WRITER_HELP_ENTRIES = [
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
  }
];
