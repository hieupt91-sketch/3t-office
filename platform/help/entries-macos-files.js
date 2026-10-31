/**
 * 3T Office — Trợ giúp: mở, lưu và lưu thành tệp trên macOS (MAC-3-2610).
 * Nội dung bám đúng hành vi đã cài đặt ở platform/os_services/file_dialogs.py + macos.py: hộp thoại Finder của
 * macOS, bộ lọc theo ứng dụng, tên mặc định, thư mục Tài liệu, tự thêm phần mở rộng, chọn nhiều tệp, tên tiếng Việt.
 */

export const MACOS_FILE_HELP_ENTRIES = [
  {
    id: "common.macos.openSaveFiles",
    app: "common",
    commandIds: ["common.file.open", "common.file.save", "common.file.saveAs"],
    title: "Mở, Lưu và Lưu thành tệp trên macOS",
    summary: "Trên máy Mac, Doc, Sheet và Slide dùng hộp thoại chọn tệp của macOS (giống Finder) để mở và lưu tài liệu. Mở bằng Cmd+O, lưu bằng Cmd+S, lưu bản sao dưới tên khác bằng Cmd+Shift+S, hoặc vào tab Tệp rồi chọn Mở, Lưu, Lưu thành. Tra cứu mục này ở tab Trợ giúp hoặc nhấn F1.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Mở / Lưu" },
    keywords: [
      "mở tệp", "mo tep", "lưu tệp", "luu tep", "lưu thành", "luu thanh", "lưu bản sao", "save as", "open", "save",
      "macos", "mac", "finder", "hộp thoại", "phần mở rộng", "đuôi tệp", "định dạng", "docx", "xlsx", "pptx",
      "dotx", "potx", "xltx", "csv", "chọn nhiều tệp", "tên tiếng việt", "thư mục tài liệu", "documents", "ghi đè", "thay thế"
    ],
    steps: [
      "Mở tài liệu: nhấn Cmd+O hoặc vào tab Tệp > Mở. Hộp thoại của macOS hiện ra và chỉ liệt kê các tệp ứng dụng đang dùng mở được (mục «Tất cả tệp được hỗ trợ» được chọn sẵn). Muốn lọc một loại, bấm nút loại tệp ở cuối hộp thoại rồi chọn, ví dụ loại «(*.docx)» hoặc «(*.odt)»; chọn «Tất cả tệp (*.*)» để thấy mọi tệp.",
      "Loại tệp mở được: Doc — .docx, .doc, .dotx (mẫu văn bản), .odt, .rtf, .txt, .htm/.html; Sheet — .xlsx, .xls, .xltx và .xlt (mẫu bảng tính), .ods, .csv, .tsv; Slide — .pptx, .ppt, .potx (mẫu bản trình chiếu), .odp. Mở một tệp mẫu (.dotx, .xltx, .potx) là sửa chính tệp mẫu đó; nhấn Cmd+S sẽ lưu lại vẫn ở dạng mẫu.",
      "Mở nhiều tệp một lần: giữ Cmd và bấm từng tệp (hoặc Shift để chọn một dải) rồi bấm Mở. Tệp đầu tiên mở trong cửa sổ hiện tại, mỗi tệp còn lại mở trong một cửa sổ riêng, giống các bộ văn phòng quen thuộc trên Mac.",
      "Lưu tài liệu mới: nhấn Cmd+S hoặc tab Tệp > Lưu. Hộp thoại đề xuất sẵn tên «Tài liệu 1.docx» (Doc), «Bảng tính 1.xlsx» (Sheet) hoặc «Bản trình bày 1.pptx» (Slide) trong thư mục Tài liệu (Documents) của bạn. Gõ tên mới, chọn thư mục rồi bấm Lưu.",
      "Lưu thành (lưu bản sao): nhấn Cmd+Shift+S hoặc tab Tệp > Lưu thành. Hộp thoại mở đúng thư mục của tệp đang sửa, với tên và định dạng hiện tại của tệp (ví dụ «Báo cáo.odt» vẫn đề xuất .odt).",
      "Phần mở rộng tự động: nếu bạn xóa phần đuôi (ví dụ chỉ gõ «Báo cáo quý»), 3T Office tự thêm đuôi của định dạng đang lưu, thành «Báo cáo quý.docx». Tên có dấu chấm như «Báo cáo v1.2» được giữ nguyên và thêm đuôi phía sau («Báo cáo v1.2.docx»).",
      "Đổi định dạng khi lưu: gõ đúng đuôi của định dạng muốn lưu, ví dụ «Báo cáo.odt», «Báo cáo.rtf», «Báo cáo.pdf» trong Doc; «Sổ.xls», «Sổ.csv» trong Sheet; «Bài.odp» trong Slide. Đuôi không thuộc ứng dụng (ví dụ gõ .xlsx trong Doc) không đổi định dạng — đuôi đúng được thêm vào sau tên.",
      "Thay thế tệp đã có: nếu tên trùng một tệp trong thư mục, macOS hỏi «Thay thế» một lần. Chỉ khi 3T Office vừa tự thêm đuôi và tên mới trùng tệp có sẵn, ứng dụng mới hỏi thêm «Thay thế tệp đã có?» — chọn Không để giữ nguyên tệp cũ.",
      "Hủy: bấm Hủy hoặc nhấn Esc trong hộp thoại; tài liệu đang mở giữ nguyên, không có thông báo lỗi.",
      "Tên tệp tiếng Việt: tên có dấu (ví dụ «Báo cáo quý.docx») hiển thị đúng trên thanh tiêu đề và trong Tệp > Tệp gần đây; mở lại từ danh sách gần đây vẫn đúng tệp đó, không bị lặp hai mục cho cùng một tệp."
    ]
  }
];
