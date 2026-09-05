/**
 * Hướng dẫn sử dụng VN Slides — nội dung tiếng Việt thật, khớp UI hiện có.
 * Tự đăng ký vào catalog dùng chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const SLIDES_HELP_ENTRIES = [
  {
    id: "slides.diagram.insert",
    app: "slides",
    commandIds: ["slides.diagram.insert"],
    title: "Chèn sơ đồ (SmartArt)",
    summary: "Chèn sơ đồ Danh sách theo bước, Quy trình theo chu kỳ, Phân cấp tổ chức hoặc Danh sách phân cấp. Chọn số hộp từ 3 đến 6, rồi sửa chữ trực tiếp trên slide.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["sơ đồ", "smartart", "diagram", "quy trình", "chu kỳ", "phân cấp", "process", "hierarchy"],
    steps: [
      "Mở trang chiếu đích. Tab Chèn, nhóm Minh họa, nhấn Sơ đồ (nút lớn, cạnh Hình khối và Biểu đồ).",
      "Hộp thoại Chèn sơ đồ: chọn một trong bốn kiểu — Danh sách theo bước (1 → 2 → 3), Quy trình theo chu kỳ (↻), Phân cấp tổ chức, Danh sách phân cấp. Số lượng hộp: 3–6 (mặc định 4).",
      "Nhấn Chèn sơ đồ. Các hộp hiện trên canvas; nhấp vào chữ để sửa (Bước 1, Lãnh đạo, Bộ phận…). Kéo góc để đổi kích thước.",
      "Hoàn tác bằng Ctrl+Z (gỡ cả cụm sơ đồ vừa chèn). Có thể nhóm/bỏ nhóm đối tượng bằng Ctrl+G / Ctrl+Shift+G sau khi chọn nhiều hình."
    ]
  },
  {
    id: "slides.insert.chart",
    app: "slides",
    commandIds: ["slides.insert.chart"],
    title: "Chèn biểu đồ",
    summary: "Chèn biểu đồ Cột, Đường, Tròn hoặc Miền vào trang đang mở. Nhập tiêu đề, nhãn và giá trị ngay trong hộp thoại; xem trước rồi Chèn. Nhấp đúp biểu đồ để sửa.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["biểu đồ", "chart", "cột", "đường", "tròn", "miền", "chèn biểu đồ"],
    steps: [
      "Tab Chèn, nhóm Minh họa, nhấn Biểu đồ.",
      "Hộp thoại Chèn biểu đồ: nhập Tiêu đề; chọn kiểu Cột / Đường / Tròn / Miền. Bảng Nhãn | Giá trị cho phép sửa từng dòng, + Thêm dòng, hoặc × xóa dòng. Cần ít nhất một nhãn.",
      "Xem trước bên phải cập nhật khi gõ. Nhấn Chèn. Biểu đồ xuất hiện trên slide; kéo để đặt vị trí.",
      "Nhấp đúp biểu đồ để mở lại hộp Sửa biểu đồ (cùng các trường, nút Cập nhật). Ctrl+Z gỡ biểu đồ vừa chèn."
    ]
  },
  {
    id: "slides.slide.toggleHidden",
    app: "slides",
    commandIds: ["slides.slide.toggleHidden"],
    title: "Ẩn trang chiếu",
    summary: "Trang bị ẩn vẫn nằm trong tệp và Bộ sắp xếp trang nhưng bị bỏ qua khi trình chiếu F5 / Shift+F5. Thumbnail hiện dấu ⊘. Nhấn lại nút để hiện.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Thiết lập" },
    keywords: ["ẩn trang", "hide slide", "bỏ qua", "f5", "trình chiếu", "ẩn"],
    steps: [
      "Chọn trang trên dải thumbnail trái hoặc trên canvas. Tab Trình chiếu, nhóm Thiết lập, nhấn Ẩn trang chiếu.",
      "Thumbnail trang đó có dấu ⊘ và nhãn «Trang chiếu ẩn». Nút ribbon ở trạng thái đang bật.",
      "Khi chiếu Từ đầu (F5) hoặc Từ trang này (Shift+F5), trang ẩn bị nhảy qua. Nếu mọi trang đều ẩn, hộp thoại báo «Tất cả trang chiếu đang bị ẩn».",
      "Nhấn lại Ẩn trang chiếu để hiện. Có thể ẩn/hiện trong Bộ sắp xếp trang (tab Chế độ xem). Trang ẩn vẫn được lưu trong tệp."
    ]
  },
  {
    id: "slides.text.fontParagraph",
    app: "slides",
    commandIds: [
      "slides.font.family",
      "slides.font.size",
      "slides.font.grow",
      "slides.font.shrink",
      "slides.text.bold",
      "slides.text.italic",
      "slides.text.underline",
      "slides.text.strike",
      "slides.text.clearFormat",
      "slides.color.text",
      "slides.color.highlight",
      "slides.list.bullet",
      "slides.list.numbered",
      "slides.para.alignLeft",
      "slides.para.alignCenter",
      "slides.para.alignRight",
      "slides.para.justify",
      "slides.para.indentInc",
      "slides.para.indentDec",
      "slides.para.lineSpacing"
    ],
    title: "Định dạng chữ và đoạn văn",
    summary: "Trên tab Trang đầu: đổi phông, cỡ, đậm/nghiêng/gạch, màu chữ, màu nền chữ; và đoạn văn (đầu dòng, đánh số, căn lề, thụt lề, giãn dòng 1.0 / 1.5 / 2.0). Áp dụng cho chữ đang bôi trong tiêu đề, nội dung hoặc hộp văn bản.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["phông chữ", "đoạn văn", "đậm", "căn lề", "dấu đầu dòng", "giãn dòng", "font", "paragraph", "bold"],
    steps: [
      "Nhấp vào tiêu đề, nội dung slide hoặc hộp văn bản, rồi bôi chữ cần đổi (hoặc đặt con trỏ trong đoạn).",
      "Nhóm Phông chữ: chọn Calibri / Arial / Times New Roman / Be Vietnam Pro / Roboto; chọn cỡ (10–48); nút Tăng/Giảm cỡ chữ; Đậm (Ctrl+B), Nghiêng (Ctrl+I), Gạch chân (Ctrl+U), Gạch ngang; Xóa định dạng; Màu chữ và Màu nền chữ.",
      "Nhóm Đoạn văn (ngay bên phải): Dấu đầu dòng, Đánh số, Giảm/Tăng thụt lề, hộp Giãn dòng 1.0 / 1.5 / 2.0; hàng dưới là Căn trái (Ctrl+L), Căn giữa (Ctrl+E), Căn phải (Ctrl+R), Căn đều (Ctrl+J).",
      "Định dạng áp dụng cho vùng chữ đang chọn trên slide, không phải cho cả bài trừ khi bôi hết. Xóa định dạng giữ nguyên nội dung, bỏ kiểu chữ."
    ]
  },
  {
    id: "slides.insert.wordart",
    app: "slides",
    commandIds: ["slides.insert.wordart"],
    title: "Chữ nghệ thuật (WordArt)",
    summary: "Chèn dòng tiêu đề có viền, đổ bóng hoặc gradient. Gõ nội dung, chọn một mẫu trong thư viện, rồi kéo thả / sửa chữ trên canvas.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chữ nghệ thuật", "wordart", "word art", "tiêu đề", "gradient", "viền"],
    steps: [
      "Tab Chèn, nhóm Văn bản, nhấn Chữ nghệ thuật (nút lớn, cạnh Hộp văn bản).",
      "Hộp thoại Chèn chữ nghệ thuật: ô Nội dung chữ (mặc định «VN Office», tối đa 80 ký tự) và lưới mẫu (ví dụ Xanh đậm viền trắng, vàng viền, gradient…). Chọn mẫu để xem chữ «Aa».",
      "Nhấn Chèn. Khối chữ xuất hiện trên slide; kéo để đặt, nhấp vào chữ để sửa nội dung. Ctrl+Z gỡ khối vừa chèn.",
      "Cùng nhóm Văn bản còn Hộp văn bản thường (không hiệu ứng) và Đầu trang & Chân trang / Ngày & Giờ / Số trang chiếu."
    ]
  },
  {
    id: "slides.edit.formatPainter",
    app: "slides",
    commandIds: ["slides.edit.formatPainter"],
    title: "Sao chép định dạng",
    summary: "Copy kiểu chữ hoặc hình đang chọn sang đối tượng khác. Nhấp đúp để khóa và áp dụng nhiều lần; Esc hủy. Con trỏ canvas đổi thành cọ khi đang bật.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["sao chép định dạng", "format painter", "cọ vẽ", "copy format"],
    steps: [
      "Chọn chữ đã định dạng trong hộp văn bản, hoặc chọn một hình/chữ nghệ thuật nguồn. Tab Trang đầu, nhóm Bảng nhớ tạm, nhấn Sao chép định dạng (dưới Cắt / Sao chép).",
      "Bấm đối tượng đích trên slide để dán kiểu (phông, cỡ, màu, đậm…). Không copy nội dung chữ.",
      "Nhấp đúp nút để khóa: tiếp tục bấm nhiều đối tượng. Esc hoặc nhấn lại nút để tắt.",
      "Đây là lệnh slides.edit.formatPainter riêng của Slides, khác nút cùng tên trên Sheet."
    ]
  },
  {
    id: "slides.design.formatBackground",
    app: "slides",
    commandIds: ["slides.design.formatBackground"],
    title: "Định dạng nền",
    summary: "Đổi nền trang hiện tại (hoặc tất cả trang): màu đơn, gradient 2 màu (ngang/dọc), hoặc ảnh. Không thay chủ đề toàn bài. Có nút xóa nền tùy chỉnh.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Tùy chỉnh" },
    keywords: ["định dạng nền", "format background", "màu nền", "gradient", "ảnh nền", "nền trang"],
    steps: [
      "Mở trang cần đổi nền. Tab Thiết kế, nhóm Tùy chỉnh, nhấn Định dạng nền (cạnh Cỡ trang chiếu).",
      "Chọn Màu đơn (bảng màu), Gradient 2 màu (Màu 1, Màu 2, hướng Ngang hoặc Dọc), hoặc Ảnh nền (Chọn ảnh… từ máy).",
      "Áp dụng trang này chỉ đổi trang đang mở. Đánh dấu Áp dụng tất cả trang rồi xác nhận để phủ cả bài. Xóa nền tùy chỉnh gỡ nền tự chọn, trả về nền chủ đề.",
      "Định dạng nền khác Chủ đề (nhóm Chủ đề) và Mẫu Slide Master — hai lệnh kia đổi font/màu/logo toàn bài, không chỉ một lớp nền."
    ]
  },
  {
    id: "slides.view.slideSorter",
    app: "slides",
    commandIds: ["slides.view.slideSorter"],
    title: "Bộ sắp xếp trang (Slide Sorter)",
    summary: "Xem toàn bộ trang dạng lưới, kéo-thả đổi thứ tự, thấy trang ẩn (dấu ⊘). Esc hoặc nút Đóng để về dạng xem bình thường.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["bộ sắp xếp", "slide sorter", "kéo thả", "thứ tự", "lưới trang"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nhấn Bộ sắp xếp trang (cạnh Bình thường, Ghi chú thuyết trình, Chế độ đọc).",
      "Lưới hiện mọi trang. Kéo một trang thả vào vị trí mới để đổi thứ tự. Trang ẩn vẫn hiện kèm dấu ⊘.",
      "Nhấn × trên thanh tiêu đề hoặc Esc để đóng và trở về dạng xem Bình thường. Có thể mở lại bất cứ lúc nào; thứ tự mới được giữ.",
      "Muốn ẩn/hiện trang: chọn trang rồi dùng Ẩn trang chiếu trên tab Trình chiếu, kể cả khi đang mở sorter."
    ]
  },
  {
    id: "slides.animation.apply",
    app: "slides",
    commandIds: ["slides.animation.apply"],
    title: "Hiệu ứng đối tượng (Animations)",
    summary: "Gắn hiệu ứng xuất hiện cho tiêu đề, nội dung, hình hoặc đối tượng đang chọn: Fade In, Fly In, Zoom In, Bounce In, Slide Left. Chọn thời gian và độ trễ, xem thử rồi áp dụng.",
    ribbon: { tab: "Hoạt hình", tabId: "animations", group: "Hiệu ứng đối tượng" },
    keywords: ["hoạt hình", "animation", "fade in", "fly in", "hiệu ứng xuất hiện", "độ trễ"],
    steps: [
      "Chọn đối tượng trên slide (tiêu đề, nội dung, hình) hoặc để trống — hộp thoại vẫn cho chọn đối tượng. Tab Hoạt hình, nhóm Hiệu ứng đối tượng, nhấn Hiệu ứng đối tượng.",
      "Đối tượng áp dụng: Tiêu đề, Nội dung (hoặc cột 1/cột 2 nếu bố cục hai cột), hoặc từng hình. Kiểu: Không có hiệu ứng, Mờ dần xuất hiện, Bay từ dưới lên, Thu phóng xuất hiện, Nảy nhẹ, Trượt từ trái sang.",
      "Chọn Thời gian hiệu ứng (0.3s–1.0s) và Độ trễ xuất hiện (ngay, 0.2s, 0.5s, 1.0s). Nhấn ▶ Xem thử hiệu ứng nếu muốn, rồi Áp dụng hiệu ứng.",
      "Xóa hiệu ứng: mở lại hộp thoại, chọn Không có hiệu ứng hoặc nút Xóa hiệu ứng. Khi trình chiếu, hiệu ứng chạy theo thứ tự đối tượng trên trang."
    ]
  },
  {
    id: "slides.transition.apply",
    app: "slides",
    commandIds: ["slides.transition.apply"],
    title: "Hiệu ứng chuyển trang (Transitions)",
    summary: "Chọn cách trang này xuất hiện từ trang trước: Mờ dần, Trượt ngang, Thu phóng, Lật 3D hoặc Morph. Đặt thời gian, xem thử, áp dụng trang hiện tại hoặc tất cả.",
    ribbon: { tab: "Chuyển tiếp", tabId: "transitions", group: "Hiệu ứng chuyển trang" },
    keywords: ["chuyển tiếp", "transition", "fade", "slide", "zoom", "flip", "morph", "chuyển trang"],
    steps: [
      "Mở trang đích. Tab Chuyển tiếp, nhóm Hiệu ứng chuyển trang, nhấn Chuyển tiếp.",
      "Kiểu chuyển trang: Mờ dần (Fade), Trượt ngang (Slide), Thu phóng (Zoom), Lật trang 3D (Flip), Morph. Thời gian: Nhanh 0.3s, Tiêu chuẩn 0.5s, Chậm 0.8s, Rất chậm 1.0s.",
      "Nhấn ▶ Xem thử chuyển tiếp để xem hộp mẫu. Áp dụng chỉ gán cho trang đang mở; Áp dụng cho tất cả gán cùng hiệu ứng mọi trang.",
      "Xóa chuyển tiếp: mở lại hộp thoại và dùng Xóa chuyển tiếp. Morph làm mượt đối tượng trùng nhau giữa hai trang liên tiếp khi trình chiếu."
    ]
  },
  {
    id: "slides.review.commentNavigation", app: "slides",
    commandIds: ["slides.review.commentPrevious", "slides.review.commentNext", "slides.review.commentDelete", "slides.review.commentResolve"],
    title: "Duyệt và xử lý nhận xét trang chiếu",
    summary: "Duyệt nhận xét xuyên suốt các trang chiếu, đánh dấu đã xử lý, mở lại hoặc xóa.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Nhận xét" },
    keywords: ["nhận xét", "trang chiếu", "trước", "sau", "xử lý", "resolve", "xóa"],
    steps: ["Mở tab Đánh giá, nhóm Nhận xét.", "Nhấn Nhận xét trước hoặc Nhận xét sau; VN Slides chuyển tới đúng trang, mở bảng nhận xét, tô sáng mục và quay vòng ở cuối.", "Nhấn Đã xử lý để làm mờ và gạch nội dung nhưng vẫn giữ nhận xét; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa mục đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại."]
  }
];

registerHelpEntries(SLIDES_HELP_ENTRIES);
