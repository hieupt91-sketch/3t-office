/**
 * 3T Office Help Entries — Tính năng Nền tảng dùng chung (Retro Shared Platform)
 * Hướng dẫn chi tiết cho 9 tính năng nền tảng dùng chung trên toàn bộ 3T Office:
 * 1. Dán đặc biệt (Paste Special)
 * 2. In và Xuất PDF một chạm
 * 3. Tìm kiếm và Thay thế dùng chung (Ctrl+F, Ctrl+H, F3)
 * 4. Giao diện Sáng/Tối và Cỡ chữ hiển thị
 * 5. Khởi động nhanh và Lối tắt Windows
 * 6. Trợ giúp F1 theo ngữ cảnh tức thì
 * 7. Phím tắt Ribbon KeyTips (điều hướng phím Alt)
 * 8. Cập nhật một chạm an toàn và tự phục hồi
 * 9. Tự động lưu và Khôi phục tài liệu gặp sự cố
 *
 * Tuân thủ AGENTS.md §10: Tiếng Việt thật, chi tiết, không placeholder.
 * Naming quy chuẩn: Sản phẩm '3T Office', các ứng dụng viết ngắn gọn: Doc, Sheet, Slide (không tiền tố 3T).
 * Tuyệt đối không dùng tên sản phẩm độc quyền của Microsoft.
 */

export const RETRO_PLATFORM_HELP_ENTRIES = [
  {
    id: "common.platform.pasteSpecialHelp",
    app: "common",
    commandIds: [
      "writer.clipboard.pasteSpecial",
      "sheet.edit.pasteSpecial",
      "slides.edit.pasteSpecial",
      "common.edit.pasteSpecial"
    ],
    title: "Dán đặc biệt (Paste Special)",
    summary: "Tùy chọn dán thông minh: dán chỉ lấy giá trị, dán định dạng, dán công thức hoặc chuyển vị hàng cột trên Doc, Sheet và Slide.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["dán đặc biệt", "paste special", "ctrl+alt+v", "dán giá trị", "dán định dạng", "chuyển vị hàng cột"],
    steps: [
      "Sau khi sao chép (Ctrl+C) một đoạn văn bản hoặc vùng ô dữ liệu vào bộ nhớ tạm.",
      "Đặt con trỏ tại vị trí đích cần dán dữ liệu.",
      "Mở tab Trang đầu trên Ribbon, tìm nhóm Bảng nhớ tạm và bấm vào mũi tên nhỏ bên dưới nút Dán (hoặc nhấn Ctrl+Alt+V).",
      "Chọn kiểu dán mong muốn: 'Chỉ dán giá trị' (bỏ toàn bộ công thức và màu mè, chỉ lấy số liệu thuần); 'Chỉ dán định dạng' (áp dụng màu sắc và kẻ viền lên ô mới mà không đè mất số liệu cũ); hoặc 'Dán văn bản thuần' không định dạng.",
      "Trên Sheet: có thể chọn thêm tính năng 'Chuyển vị' (Transpose) để tự động xoay dữ liệu từ hàng ngang thành cột dọc và ngược lại.",
      "Lưu ý: Dán đặc biệt là công cụ đắc lực giúp bạn dọn sạch các định dạng mạng rác khi sao chép từ trình duyệt web vào tài liệu."
    ]
  },
  {
    id: "common.platform.printAndExportPdfHelp",
    app: "common",
    commandIds: [
      "common.file.print",
      "common.file.exportPdf",
      "writer.file.exportPdf",
      "sheet.file.exportPdf",
      "slides.file.exportPdf"
    ],
    title: "In ấn và Xuất bản tệp PDF một chạm",
    summary: "Xuất trực tiếp tài liệu ra định dạng PDF chuẩn quốc tế hiển thị sắc nét trên mọi thiết bị và in ấn chính xác mà không cần phần mềm phụ trợ.",
    ribbon: { tab: "Tệp", tabId: "file", group: "In & Xuất" },
    keywords: ["in", "xuất pdf", "export pdf", "print", "ctrl+p", "tệp pdf", "in ấn"],
    steps: [
      "Để xuất bản PDF nhanh: mở menu Tệp ở góc trên bên trái, chọn lệnh 'Xuất PDF' (hoặc bấm nút biểu tượng PDF trên thanh công cụ truy cập nhanh).",
      "Hệ thống sẽ chuyển đổi trực tiếp toàn bộ phông chữ tiếng Việt, bảng biểu, hình ảnh sang tệp PDF có chất lượng in ấn cao nhất.",
      "Chọn thư mục lưu tệp PDF trên máy tính rồi bấm 'Lưu'. Tệp PDF tạo ra có thể mở mượt mà trên điện thoại, máy tính bảng hoặc gửi email ngay lập tức.",
      "Để in ra giấy: nhấn tổ hợp phím tắt Ctrl+P hoặc vào Tệp > In.",
      "Xem trước trang in ở khung bên trái, chọn máy in vật lý, số lượng bản in rồi bấm nút 'In'.",
      "Lưu ý: Tính năng xuất PDF của 3T Office hoạt động hoàn toàn ngoại tuyến ngay trên máy tính, bảo mật tuyệt đối tài liệu cơ quan."
    ]
  },
  {
    id: "common.platform.findReplaceHelp",
    app: "common",
    commandIds: [
      "common.edit.find",
      "common.edit.replace"
    ],
    title: "Tìm kiếm và Thay thế chung (Ctrl+F, Ctrl+H, F3)",
    summary: "Công cụ tìm kiếm thông minh thống nhất trên cả ba ứng dụng Doc, Sheet và Slide, hỗ trợ gõ không dấu vẫn tìm thấy tiếng Việt có dấu.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm kiếm", "thay thế", "ctrl+f", "ctrl+h", "f3", "không dấu tiếng việt", "find and replace"],
    steps: [
      "Nhấn phím tắt Ctrl+F để mở thanh tìm kiếm nhanh, hoặc nhấn Ctrl+H để mở hộp thoại Thay thế.",
      "Nhập từ hoặc cụm từ cần tra cứu vào ô tìm kiếm: bạn có thể gõ tiếng Việt có dấu hoặc không dấu (ví dụ gõ 'ha noi' vẫn tìm thấy 'Hà Nội').",
      "Nhấn phím Enter hoặc phím F3 để duyệt lần lượt tới các kết quả tìm thấy; nhấn Shift+F3 để lùi lại kết quả trước đó.",
      "Khi cần sửa hàng loạt: nhập từ mới vào ô 'Thay thế bằng' rồi bấm 'Thay thế tất cả'.",
      "Hệ thống sẽ cập nhật ngay tức thì và thông báo chính xác số lượng vị trí đã được thay thế thành công.",
      "Lưu ý: Nếu thay thế nhầm, bạn chỉ cần nhấn Ctrl+Z một lần duy nhất là toàn bộ các vị trí sẽ được khôi phục nguyên vẹn."
    ]
  },
  {
    id: "common.platform.themeDarkLightHelp",
    app: "common",
    commandIds: [],
    title: "Chủ đề giao diện Sáng/Tối và Cỡ chữ hiển thị",
    summary: "Tùy biến không gian làm việc với chế độ nền Tối dịu mắt cho ban đêm và điều chỉnh độ phóng đại cỡ chữ giao diện đồng bộ.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tùy chọn" },
    keywords: ["giao diện tối", "chế độ tối", "dark mode", "giao diện sáng", "cỡ chữ", "tùy chọn", "theme"],
    steps: [
      "Chuyển đổi nhanh: bấm vào biểu tượng Mặt trời / Mặt trăng ở góc trên bên phải thanh tiêu đề cửa sổ ứng dụng.",
      "Chế độ nền Sáng (mặc định) mang lại cảm giác trang giấy quen thuộc; Chế độ nền Tối giúp giảm mỏi mắt và tiết kiệm pin khi làm việc buổi tối.",
      "Để chỉnh cỡ chữ giao diện: vào menu Tệp > chọn 'Tùy chọn' (Options).",
      "Tại mục Cỡ chữ giao diện: chọn Tiêu chuẩn (100%), Lớn (115%) hoặc Rất lớn (130%) để toàn bộ chữ trên thanh Ribbon, bảng chọn và thanh trạng thái to rõ hơn.",
      "Bấm nút 'Đồng ý': thiết lập giao diện sẽ được lưu trữ và áp dụng đồng bộ cho cả Doc, Sheet và Slide.",
      "Lưu ý: Thay đổi chủ đề chỉ ảnh hưởng đến màu sắc khung hiển thị của phần mềm, hoàn toàn không làm đổi màu nền trang giấy in của tài liệu."
    ]
  },
  {
    id: "common.platform.quickStartHelp",
    app: "common",
    commandIds: [],
    title: "Khởi động nhanh Doc, Sheet và Slide",
    summary: "Mở trực tiếp từng ứng dụng từ Start Menu, thanh tác vụ Windows hoặc biểu tượng lối tắt ngoài Màn hình nền (Desktop).",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Khởi động nhanh" },
    keywords: ["khởi động nhanh", "lối tắt", "start menu", "desktop", "thanh tác vụ", "mở ứng dụng"],
    steps: [
      "Cách 1: Mở Start Menu của Windows, gõ tên ứng dụng ngắn gọn: 'Doc', 'Sheet' hoặc 'Slide' rồi nhấn phím Enter.",
      "Cách 2: Trong thư mục '3T Office' tại Start Menu, nhấp chuột vào biểu tượng màu xanh dương cho Doc, màu xanh lá cho Sheet, hoặc màu cam cho Slide.",
      "Cách 3: Nhấp đúp chuột vào biểu tượng lối tắt tương ứng ngoài Màn hình nền (Desktop) đã được tạo sẵn khi cài đặt.",
      "Để truy cập siêu tốc mỗi ngày: nhấp chuột phải vào biểu tượng ứng dụng trên thanh tác vụ (Taskbar) và chọn 'Ghim vào thanh tác vụ' (Pin to taskbar).",
      "Lưu ý: Mỗi ứng dụng trong bộ 3T Office là một chương trình độc lập, tự khởi động nhanh chóng mà không cần chờ nạp các thành phần mạng rườm rà."
    ]
  },
  {
    id: "common.platform.headerThemeHelp",
    app: "common",
    commandIds: [],
    title: "Đổi màu hoặc hình nền khu vực tiêu đề",
    summary: "Tự chọn màu hoặc hình ảnh cho thanh tiêu đề và hàng thẻ ribbon (Trang đầu, Chèn, Bố cục…), không chỉ chế độ Sáng/Tối. Chữ tự đổi đen hoặc trắng để luôn dễ đọc. Áp dụng cho cả Doc, Sheet và Slide.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Tùy chọn" },
    keywords: ["màu thanh tiêu đề", "hình nền", "đổi màu giao diện", "tùy biến giao diện", "chủ đề", "theme", "màu ribbon", "hình ảnh tiêu đề", "tùy chọn"],
    steps: [
      "Bấm nút Tệp ở góc trái, chọn Tùy chọn để mở hộp thoại Tùy chọn 3T Office.",
      "Tìm mục Khu vực tiêu đề (thanh tiêu đề và thẻ ribbon). Có ba lựa chọn: Mặc định (theo Sáng/Tối), Một màu, Hình ảnh.",
      "Chọn Một màu: bấm một ô màu gợi ý (xanh Doc, xanh lá, cam, tím, đỏ mận, xanh ngọc, xám, đen, vàng kem, xanh nhạt) hoặc dùng ô Màu khác để chọn bất kỳ màu nào. Thanh tiêu đề đổi ngay để bạn xem trước.",
      "Chọn Hình ảnh: bấm Chọn hình… rồi chọn tệp PNG, JPG, WEBP, GIF hoặc BMP (tối đa 25 MB). Hình được thu nhỏ và cắt thành dải trải liền qua thanh tiêu đề và hàng thẻ; hình chỉ lưu trên máy bạn, không gửi đi đâu.",
      "Kéo thanh Vị trí cắt để chọn phần hình nào hiện ra (trên hoặc dưới). Kéo thanh Độ phủ tối để làm tối hình khi chữ khó đọc (0–70%).",
      "Bấm Đồng ý để lưu; bấm Hủy bỏ hoặc Esc để quay lại như cũ. Bấm Đặt lại mặc định để bỏ màu/hình đã chọn.",
      "Lưu ý: màu hoặc hình bạn chọn vẫn giữ khi đổi giữa chế độ Sáng/Tối và khi mở lại ứng dụng. Chữ trên thanh tiêu đề tự chuyển đen hoặc trắng theo độ sáng của nền."
    ]
  },
  {
    id: "common.platform.contextualF1Help",
    app: "common",
    commandIds: [
      "writer.help.open",
      "sheet.help.open",
      "slides.help.open"
    ],
    title: "Tra cứu Trợ giúp F1 tức thì theo ngữ cảnh",
    summary: "Nhấn phím F1 tại bất kỳ nút bấm hoặc hộp thoại nào để mở ngay bài hướng dẫn tiếng Việt tương ứng mà không mất công tìm kiếm.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["f1", "trợ giúp f1", "trợ giúp ngữ cảnh", "tra cứu trợ giúp", "hướng dẫn sử dụng", "bảng trợ giúp"],
    steps: [
      "Di chuyển chuột hoặc dùng bàn phím đưa tiêu điểm tới bất kỳ nút lệnh nào trên Ribbon (hoặc khi đang mở bất kỳ hộp thoại nào).",
      "Nhấn phím F1 trên bàn phím máy tính.",
      "Bảng Trợ giúp tiếng Việt sẽ lập tức mở ra ở cạnh phải màn hình và hiển thị chính xác bài viết hướng dẫn cho chức năng đó.",
      "Bài hướng dẫn cung cấp giải thích dễ hiểu, vị trí truy cập, các bước thực hiện từng bước và các lưu ý cần biết.",
      "Nếu cần tìm chủ đề khác: gõ từ khóa vào ô tìm kiếm ở đầu bảng Trợ giúp và nhấn Enter.",
      "Nhấn phím Esc hoặc bấm nút đóng để ẩn bảng Trợ giúp và quay lại làm việc bình thường.",
      "Lưu ý: 100% nội dung trợ giúp được lưu trữ ngoại tuyến ngay trên máy, bạn có thể tra cứu mọi lúc ngay cả khi không có mạng Internet."
    ]
  },
  {
    id: "common.platform.keyTipsHelp",
    app: "common",
    commandIds: [],
    title: "Phím tắt Ribbon KeyTips (điều hướng phím Alt)",
    summary: "Thao tác 100% mọi chức năng trên thanh Ribbon hoàn toàn bằng bàn phím mà không cần chạm tay vào chuột.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["keytips", "phím alt", "phím tắt ribbon", "điều hướng bàn phím", "huy hiệu phím tắt", "không cần chuột"],
    steps: [
      "Bấm và thả phím Alt trên bàn phím: các huy hiệu chữ cái tiếng Việt sẽ lập tức nổi lên trên từng tab Ribbon.",
      "Ví dụ: nhấn phím T cho Tệp, D cho Trang đầu, C cho Chèn, B cho Bố cục, M cho Công thức, L cho Dữ liệu, S cho Trình chiếu, V cho Xem, G cho Trợ giúp.",
      "Sau khi bấm phím chọn tab: thanh Ribbon chuyển tab và hiển thị tiếp các ký tự phím tắt cho từng nút bấm bên trong.",
      "Bấm tiếp ký tự trên nút lệnh để thực thi tính năng ngay tức thì (ví dụ 1 cho Đậm, 2 cho Nghiêng, V cho Dán...).",
      "Nhấn phím Esc để lùi lại một cấp, hoặc nhấn lại phím Alt để tắt hoàn toàn chế độ KeyTips.",
      "Lưu ý: KeyTips là phương thức làm việc tốc độ cao của dân văn phòng chuyên nghiệp, giúp tăng gấp đôi năng suất làm việc."
    ]
  },
  {
    id: "common.platform.oneClickUpdateHelp",
    app: "common",
    commandIds: [],
    title: "Cập nhật một chạm an toàn và tự phục hồi",
    summary: "Cơ chế kiểm tra bản vá, tải gói cập nhật nội bộ đã ký số và tự động khôi phục an toàn nếu có sự cố.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Cập nhật" },
    keywords: ["cập nhật", "update", "cập nhật một chạm", "tự phục hồi", "bản vá", "phiên bản mới"],
    steps: [
      "Mở tab Trợ giúp trên thanh công cụ Ribbon và bấm vào nút 'Trợ giúp' để mở bảng điều khiển.",
      "Tại mục Cập nhật 3T Office: bấm nút 'Kiểm tra cập nhật'.",
      "Hệ thống sẽ đối chiếu phiên bản hiện tại với kênh phát hành đã cấu hình. Nếu có bản cập nhật mới, thanh thông báo sẽ hiển thị kèm nút 'Xem thay đổi'.",
      "Bấm nút 'Khởi động lại ngay' khi bạn đã sẵn sàng cài đặt bản vá.",
      "Ứng dụng sẽ tự động lưu tài liệu đang mở, thoát an toàn, thay thế các tệp chương trình và mở lại đúng tài liệu bạn đang làm dở.",
      "Lưu ý: Nếu bản cập nhật mới gặp bất kỳ trục trặc nào khi khởi động, cơ chế an toàn sẽ tự động kích hoạt để đưa ứng dụng về phiên bản ổn định trước đó."
    ]
  },
  {
    id: "common.platform.autoRecoverHelp",
    app: "common",
    commandIds: [],
    title: "Tự động lưu và Khôi phục tài liệu gặp sự cố",
    summary: "Bảo vệ an toàn dữ liệu làm việc trước sự cố mất điện hoặc treo máy bất ngờ bằng cơ chế lưu tạm định kỳ.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Tự động khôi phục" },
    keywords: ["tự động khôi phục", "autorecover", "khôi phục tài liệu", "mất điện", "sự cố máy tính", "bản lưu tạm"],
    steps: [
      "Hệ thống tự động bật tính năng lưu khôi phục với chu kỳ mặc định là 5 phút một lần.",
      "Trong quá trình bạn làm việc, các thay đổi chưa kịp bấm Ctrl+S sẽ được lưu an toàn vào tệp tạm thời trên ổ đĩa máy tính.",
      "Nếu xảy ra mất điện hoặc máy tính tắt đột ngột: hãy mở lại Doc, Sheet hoặc Slide như bình thường.",
      "Một hộp thoại 'Khôi phục tài liệu' sẽ tự động xuất hiện liệt kê các tệp có bản lưu chưa hoàn tất.",
      "Chọn tài liệu cần lấy lại rồi bấm nút 'Mở bản khôi phục': tài liệu sẽ được mở ra với toàn bộ nội dung tính đến lần lưu tự động gần nhất.",
      "Nhấn phím Ctrl+S để lưu tệp chính thức vào thư mục làm việc của bạn.",
      "Lưu ý: Bạn có thể vào tab Trợ giúp để điều chỉnh chu kỳ lưu khôi phục từ 1 đến 60 phút tùy theo nhu cầu làm việc."
    ]
  },
  {
    id: "common.platform.keepFocusHelp",
    app: "common",
    commandIds: [],
    title: "Giữ bàn phím và Tiêu điểm trong vùng soạn thảo (Keep Focus)",
    summary: "Tự động trả tiêu điểm về vùng soạn thảo cho Doc, Sheet và Slide sau khi đóng hộp thoại, chạy lệnh Ribbon hoặc chuyển đổi cửa sổ.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Soạn thảo" },
    keywords: ["giữ tiêu điểm", "tiêu điểm bàn phím", "keep focus", "vùng soạn thảo", "enter không kích hoạt nút", "gõ ngay", "doc", "sheet", "slide"],
    steps: [
      "Khi làm việc với Doc (văn bản), Sheet (bảng tính), hoặc Slide (trình chiếu), bạn có thể mở các hộp thoại chức năng (như Tìm kiếm/Thay thế Ctrl+F, Định dạng ô, Phông chữ, In ấn Ctrl+P, Tùy chọn, v.v.).",
      "Sau khi đóng hộp thoại bằng phím Esc, nút 'Đóng', nút 'Hủy' hoặc nút 'Đồng ý / OK', tiêu điểm bàn phím sẽ ngay lập tức tự động quay trở lại vùng soạn thảo: con trỏ văn bản trong Doc, ô đang chọn trong Sheet, hoặc hộp chữ/khung vẽ trong Slide.",
      "Khi bạn bấm các nút trên dải Ribbon (như In đậm, Nghiêng, Căn giữa, Chèn bảng) hoặc đổi tab Ribbon, tiêu điểm cũng lập tức được trả về vùng soạn thảo mà không bị kẹt lại trên các nút bấm.",
      "Khi chuyển sang ứng dụng khác (Alt+Tab) rồi quay trở lại cửa sổ 3T Office, bàn phím luôn sẵn sàng để gõ tiếp ký tự mà không cần phải dùng chuột nhấp lại vào trang.",
      "Đặc biệt, phím Enter luôn an toàn: nhấn Enter trong Doc sẽ tạo đoạn văn mới, trong Sheet sẽ di chuyển xuống ô kế tiếp, tuyệt đối không bị kích hoạt nhầm vào bất kỳ nút bấm Ribbon hay nút hộp thoại vừa đóng."
    ]
  },
  {
    id: "common.platform.crossAppPasteHelp",
    app: "common",
    commandIds: [
      "common.edit.paste",
      "common.edit.pastePlain",
      "writer.clipboard.paste",
      "sheet.edit.paste",
      "slides.edit.paste"
    ],
    title: "Dán giữa Doc, Sheet và Slide",
    summary: "Sao chép và dán chéo nội dung linh hoạt giữa Doc, Sheet và Slide: tự động nhận diện bảng biểu, chuyển đổi số liệu, giữ định dạng phông chữ hoặc dán văn bản thuần.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["dán chéo", "sao chép giữa các ứng dụng", "dán giữa doc sheet slide", "copy paste doc sheet slide", "bảng biểu", "dán không định dạng"],
    steps: [
      "Sao chép dữ liệu từ ứng dụng gốc: Chọn đoạn văn bản trong Doc, vùng ô dữ liệu trong Sheet (ví dụ bảng tính A1:C3), hoặc hộp văn bản trong Slide, sau đó nhấn phím tắt Ctrl+C (hoặc nút Sao chép trên tab Trang đầu).",
      "Dán từ Sheet sang Doc: Chuyển sang Doc, đặt con trỏ tại vị trí muốn chèn rồi nhấn Ctrl+V. Dữ liệu bảng tính từ Sheet sẽ tự động chuyển hóa thành một bảng biểu hoàn chỉnh trong Doc, giữ nguyên kiểu chữ đậm ở hàng tiêu đề và các giá trị số, ngày tháng hiển thị chuẩn xác.",
      "Dán từ Doc sang Sheet: Chọn bảng biểu trong Doc, nhấn Ctrl+C, chuyển sang Sheet và chọn ô bắt đầu (ví dụ B2) rồi nhấn Ctrl+V. Dữ liệu tự động điền vào các ô tương ứng; các giá trị số tự động nhận diện thành kiểu số để tính toán công thức (như hàm SUM), chữ và định dạng đậm được giữ nguyên vẹn.",
      "Dán giữa Doc và Slide: Khi sao chép đoạn văn từ Doc sang hộp chữ trong Slide (hoặc từ Slide sang Doc), phím tắt Ctrl+V sẽ dán văn bản trực tiếp vào hộp chữ đang soạn thảo, giữ nguyên định dạng in đậm và in nghiêng. Nếu dán trực tiếp ngoài trang trình chiếu Slide, bảng tính từ Sheet sẽ tạo thành bảng đối tượng chuẩn trên slide, hoặc văn bản phân tách bằng tab dễ đọc.",
      "Dán chỉ giữ văn bản thuần: Nhấn Ctrl+Shift+V (hoặc chọn lệnh Dán văn bản thuần trong nhóm Bảng nhớ tạm) trên bất kỳ ứng dụng nào để dán chữ sạch không mang theo màu nền, kẻ viền hay kiểu chữ cũ.",
      "Hoàn tác một bước: Trong mọi thao tác dán chéo, bạn chỉ cần nhấn Ctrl+Z đúng 1 lần để hoàn tác toàn bộ dữ liệu vừa dán mà không để lại nội dung thừa."
    ]
  },
  {
    id: "common.platform.contextMenuHelp",
    app: "common",
    commandIds: [
      "common.edit.cut",
      "common.edit.copy",
      "common.edit.paste",
      "common.edit.pastePlain",
      "common.edit.find"
    ],
    title: "Menu ngữ cảnh chuột phải và Trình đơn con (Submenu)",
    summary: "Thao tác nhanh bằng chuột phải trong văn bản Doc và bảng tính Sheet với hệ thống menu phân cấp trực quan, điều hướng bàn phím đầy đủ và chống tràn màn hình.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["chuột phải", "menu ngữ cảnh", "context menu", "submenu", "menu con", "dán đặc biệt", "chèn", "xóa", "sắp xếp", "bàn phím", "doc", "sheet"],
    steps: [
      "Mở menu ngữ cảnh: Nhấp chuột phải (hoặc nhấn phím Menu / Shift+F10) tại bất kỳ vị trí văn bản trong Doc hoặc trên ô, hàng, cột trong Sheet.",
      "Truy cập trình đơn con (Submenu): Các mục có biểu tượng mũi tên (›) như Danh sách, Chèn, Tìm kiếm/Thay thế (trong Doc) hoặc Dán đặc biệt, Chèn, Xóa, Sắp xếp (trong Sheet) sẽ tự động mở rộng danh mục con khi rê chuột qua hoặc nhấn phím Mũi tên phải (ArrowRight).",
      "Đóng menu con: Rê chuột ra ngoài hoặc nhấn phím Mũi tên trái (ArrowLeft) để thu gọn submenu quay về menu chính.",
      "Điều hướng bàn phím chuẩn: Sử dụng phím Mũi tên lên/xuống (ArrowUp / ArrowDown) để di chuyển giữa các mục; Home / End để về mục đầu / cuối; Enter hoặc Phím cách (Space) để kích hoạt lệnh; phím Esc để đóng menu ngữ cảnh và tự động trả lại tiêu điểm bàn phím cho vùng soạn thảo.",
      "Tính năng thông minh chống tràn mép: Menu ngữ cảnh và các menu con tự động đảo hướng (lật sang trái hoặc lật lên trên) khi vị trí con trỏ chuột nằm sát góc phải hoặc mép dưới màn hình, đảm bảo mọi tùy chọn luôn hiển thị trọn vẹn trong tầm nhìn.",
      "Menu chuyên biệt trong Doc: Nhấp chuột phải vào từ bị đánh dấu gợn sóng đỏ sẽ ưu tiên hiển thị gợi ý sửa chính tả tiếng Việt ở đầu menu; nhấp vào mục danh sách sẽ có các tùy chọn đổi dạng gạch đầu dòng, đánh số lại từ 1 hoặc tiếp tục đánh số.",
      "Menu chuyên biệt trong Sheet: Khi nhấp chuột phải vào ô dữ liệu, các tùy chọn Dán đặc biệt (giá trị, công thức, định dạng, chuyển vị), Chèn/Xóa (hàng, cột, ô), Sắp xếp và Lọc được gom nhóm gọn gàng, giúp thao tác bảng tính thuận tiện và chuyên nghiệp."
    ]
  }
];
