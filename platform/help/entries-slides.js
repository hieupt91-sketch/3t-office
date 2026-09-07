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
      "Xóa hiệu ứng: mở lại hộp thoại, chọn Không có hiệu ứng hoặc nút Xóa hiệu ứng. Khi trình chiếu, hiệu ứng chạy theo thứ tự đối tượng trên trang. Để xem và sắp xếp nhiều hiệu ứng cùng lúc, dùng Ngăn hoạt hình cạnh nút này."
    ]
  },
  {
    id: "slides.animation.pane",
    app: "slides",
    commandIds: ["slides.animation.pane"],
    title: "Ngăn hoạt hình (Animation Pane)",
    summary: "Liệt kê mọi hiệu ứng trên trang đang chọn theo thứ tự chạy: tên đối tượng, kiểu hiệu ứng, số thứ tự. Đổi thứ tự bằng nút lên/xuống, chọn Bắt đầu (Khi click / Cùng với trước đó / Sau trước đó), hoặc xóa hiệu ứng khỏi đối tượng mà không xóa đối tượng.",
    ribbon: { tab: "Hoạt hình", tabId: "animations", group: "Hiệu ứng đối tượng" },
    keywords: ["ngăn hoạt hình", "animation pane", "thứ tự hiệu ứng", "bắt đầu", "khi click", "cùng với trước đó", "sau trước đó", "xóa hiệu ứng"],
    steps: [
      "Gắn hiệu ứng cho từng đối tượng bằng nút Hiệu ứng đối tượng (cùng nhóm). Tab Hoạt hình, nhóm Hiệu ứng đối tượng, nhấn Ngăn hoạt hình — bảng hiện bên phải canvas.",
      "Mỗi dòng: số thứ tự, tên đối tượng (hoặc đoạn chữ nếu là hộp văn bản), kiểu hiệu ứng (Fade In, Fly In…). Chọn dòng rồi nhấn ↑ hoặc ↓ để đổi thứ tự chạy thật khi F5, không chỉ thứ tự trên danh sách.",
      "Cột Bắt đầu: Khi click (chạy sau hiệu ứng trước), Cùng với trước đó (cùng lúc), Sau trước đó (chờ hiệu ứng trước kết thúc rồi mới chạy). Xóa: nút Xóa trên dòng — đối tượng vẫn còn, chỉ bỏ hiệu ứng.",
      "Ctrl+Z / Ctrl+Y hoàn tác hoặc làm lại đổi thứ tự, đổi Bắt đầu và xóa hiệu ứng. Esc hoặc nút × đóng ngăn. Trang khác có danh sách riêng; chuyển trang thì ngăn cập nhật theo trang đang chọn."
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
  },
  {
    id: "slides.show.setupShow",
    app: "slides",
    commandIds: ["slides.show.setupShow"],
    title: "Thiết lập trình chiếu (Set Up Slide Show)",
    summary: "Hộp thoại trên tab Trình chiếu, nhóm Thiết lập: lặp liên tục đến Esc, trình chiếu không thuyết minh, và màu con trỏ bút/laser. Lặp liên tục quay về trang 1 sau trang cuối thay vì thoát. Lưu PPTX ghi p:showPr chuẩn (showNarration / penClr) vào file PowerPoint.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Thiết lập" },
    keywords: ["thiết lập trình chiếu", "set up slide show", "lặp liên tục", "loop", "thuyết minh", "narration", "bút", "laser", "màu con trỏ", "pptx", "showPr"],
    steps: [
      "Tab Trình chiếu, nhóm Thiết lập, nhấn Thiết lập trình chiếu (cạnh Ẩn trang chiếu).",
      "Đánh dấu Lặp lại liên tục cho đến khi nhấn Esc nếu muốn hết trang cuối thì quay lại trang đầu (trang không ẩn đầu tiên). Không đánh dấu thì hết trang cuối F5 thoát như trước. Esc luôn thoát. Lưu PPTX: LibreOffice đã ghi p:showPr loop trên ppt/presProps.xml — VN không vá thêm cờ này.",
      "Trình chiếu không có thuyết minh: lưu cờ cho bản trình chiếu (FODP: vno:without-narration). VN Slides chưa có audio thuyết minh trên màn hình chiếu. Khi Lưu PPTX, VN ghi showNarration=\"0\" vào p:showPr (LibreOffice luôn để \"1\" nếu không vá).",
      "Màu con trỏ bút / laser: chọn màu bằng ô màu. VN Slides chưa vẽ bút hay laser trên màn hình chiếu; màu được lưu FODP (vno:pointer-color) và khi Lưu PPTX được ghi p:penClr/a:srgbClr chuẩn PowerPoint. Nhấn Áp dụng để giữ, Hủy hoặc Esc để bỏ.",
      "File → Mở một .pptx đã có Thiết lập trình chiếu (file vừa Lưu, hoặc file PowerPoint có p:showPr showNarration=\"0\" / p:penClr trên ppt/presProps.xml): LibreOffice chuyển PPTX→FODP giữ Lặp lại liên tục (presentation:endless) nhưng bỏ cờ không thuyết minh và màu bút. VN Office đọc ppt/presProps.xml của file gốc rồi gắn lại vno:without-narration / vno:pointer-color lên presentation:settings trước khi mở canvas — hộp thoại Thiết lập trình chiếu hiện lại đúng hai giá trị đó. Lặp liên tục không cần overlay (LibreOffice đã map). File không có p:showPr, hoặc giá trị không hợp lệ, thì không bịa cờ. File ZIP hỏng thì hộp thoại Mở báo lỗi rõ. File .odp/.fodp không đi overlay này — chúng giữ vno:* sẵn có."
    ]
  },
  {
    id: "slides.edit.findReplace",
    app: "slides",
    commandIds: ["common.edit.find", "common.edit.replace"],
    title: "Tìm kiếm và Thay thế trên trang chiếu",
    summary: "Tìm chữ trong tiêu đề, nội dung và hình trên TẤT CẢ các trang chiếu (không chỉ trang đang mở), rồi thay thế từng chỗ hoặc tất cả. Giống PowerPoint: tìm xuyên suốt bài. Hoàn tác bằng Ctrl+Z.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm kiếm", "thay thế", "find", "replace", "ctrl+f", "ctrl+h", "chỉnh sửa", "tìm chữ"],
    steps: [
      "Tab Trang đầu, nhóm Chỉnh sửa (cuối ribbon Home), nhấn Tìm kiếm (Ctrl+F) hoặc Thay thế (Ctrl+H). Cùng hộp thoại; Thay thế hiện thêm ô «Thay thế bằng» và nút Thay thế / Thay thế tất cả.",
      "Gõ cụm cần tìm. Tìm tiếp nhảy lần lượt mọi chỗ khớp trong tiêu đề, nội dung (cả cột 2 nếu bố cục hai cột) và chữ trên hình của mọi trang — tự chuyển trang khi khớp ở trang khác.",
      "Thay thế: đổi chỗ đang khớp rồi tìm chỗ tiếp. Thay thế tất cả: đổi mọi chỗ khớp trên toàn bài. Nội dung trang đổi thật; Ctrl+Z hoàn tác cả lượt thay (kể cả Thay thế tất cả).",
      "Không tìm trong ghi chú người thuyết trình. Phân biệt hoa/thường đúng như chuỗi đã gõ."
    ]
  },
  {
    id: "slides.edit.select",
    app: "slides",
    commandIds: ["slides.edit.selectAll", "slides.edit.selectObjects"],
    title: "Chọn đối tượng trên trang chiếu",
    summary: "Dropdown Chọn ở nhóm Chỉnh sửa (cuối Home): Chọn tất cả hình trên trang hiện tại, hoặc Chọn đối tượng (hình vẽ, không gồm đường nối).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["chọn", "select", "chọn tất cả", "chọn đối tượng", "hình", "shape"],
    steps: [
      "Mở trang cần chọn đối tượng. Tab Trang đầu, nhóm Chỉnh sửa (cuối Home), nhấn dropdown Chọn.",
      "Chọn tất cả: đánh dấu mọi hình trên trang hiện tại (hộp văn bản, hình khối, ảnh, WordArt, sơ đồ, đường nối). Không chọn khung tiêu đề/nội dung của bố cục.",
      "Chọn đối tượng: chỉ các hình vẽ, bỏ đường nối (connector). Dùng khi cần kéo/xóa nhóm hình mà không kéo đường nối kèm theo.",
      "Khi đang gõ trong tiêu đề hoặc nội dung, Ctrl+A vẫn chọn hết chữ trong khung đó; ngoài khung chữ, Ctrl+A chọn tất cả hình trên trang."
    ]
  },
  {
    id: "slides.section.groups",
    app: "slides",
    commandIds: [
      "slides.section.add",
      "slides.section.rename",
      "slides.section.remove",
      "slides.section.moveUp",
      "slides.section.moveDown"
    ],
    title: "Phần (Sections) — nhóm trang chiếu",
    summary: "Nhóm các trang chiếu liên tiếp thành một phần có tên (ví dụ Giới thiệu, Nội dung chính, Kết luận). Thanh tiêu đề hiện trên dải thumbnail trái và Bộ sắp xếp trang; thu gọn để ẩn thumbnail trong nhóm; xóa phần chỉ bỏ nhóm, không xóa trang.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["phần", "section", "nhóm trang", "thu gọn", "mở rộng", "đổi tên phần", "xóa phần", "sắp xếp phần", "slide sorter"],
    steps: [
      "Chọn trang sẽ là trang đầu của nhóm. Tab Trang đầu, nhóm Trang chiếu, mở dropdown Phần (cạnh Trang mới / Bố cục / Nhân đôi / Xóa trang), chọn Thêm phần. Hộp thoại điền tên — mặc định Phần 1, Phần 2, … — rồi Thêm. Phần bắt đầu từ trang đang chọn và chạy tới phần kế tiếp (hoặc hết bài).",
      "Dải thumbnail trái và Bộ sắp xếp trang (tab Chế độ xem) hiện thanh tiêu đề trước nhóm: tên phần + số trang trong ngoặc. Nút ▾/▸ thu gọn hoặc mở rộng cả nhóm — khi thu gọn chỉ còn thanh tiêu đề, các thumbnail bên trong bị ẩn. Nhấp thanh tiêu đề để nhảy tới trang đầu nhóm. Chuột phải thumbnail hoặc thanh tiêu đề cũng mở menu Thêm / Đổi tên / Xóa phần.",
      "Đổi tên phần / Xóa phần / Chuyển phần lên / Chuyển phần xuống nằm cùng dropdown Phần. Xóa phần chỉ bỏ nhóm (trang vẫn còn, đúng thứ tự). Chuyển lên/xuống đổi chỗ cả khối trang của phần với phần kề, giữ thứ tự trang bên trong nhóm.",
      "Hoàn tác / Làm lại (Ctrl+Z / Ctrl+Y) dùng chung ngăn lịch sử của VN Slides: thêm, đổi tên, xóa phần và chuyển cả nhóm đều hoàn tác được. Thu gọn/mở rộng chỉ là trạng thái xem, không vào lịch sử.",
      "File → Lưu dạng PowerPoint (*.pptx): sau khi LibreOffice chuyển FODP, VN Office gắn các phần vào ppt/presentation.xml bằng p14:sectionLst (chuẩn PowerPoint 2010, URI {521415D9-36F7-43E2-AB2F-B90AF26B5E84} — không dùng namespace vno:). Mỗi phần giữ đúng tên đã đặt và đúng danh sách id trang thật trong file (256, 257, … theo thứ tự trang, không đoán). Mở PPTX bằng Microsoft PowerPoint sẽ thấy nhóm phần trên dải thumbnail. LibreOffice Impress có thể không hiện phần khi mở lại PPTX (filter convert không đọc extension này) — file không hỏng. Lưu FODP/ODP giữ vno:section-id / vno:section-name như trước; bài không có phần thì File → Lưu PPTX không vá thêm.",
      "File → Mở một .pptx đã có phần (file vừa Lưu, hoặc file PowerPoint 2010+ có sẵn p14:sectionLst): LibreOffice chuyển PPTX→FODP không map ngược extension này, nên VN Office đọc ppt/presentation.xml của file gốc rồi gắn vno:section-id / vno:section-name lên đúng draw:page — theo thứ tự p:sldIdLst khớp thứ tự trang, không đoán. Thanh phần hiện lại trên dải thumbnail trái và Bộ sắp xếp trang, đúng tên và đúng nhóm trang. Nếu số trang FODP lệch số id trong PPTX (file sửa tay, hỏng), hộp thoại Mở báo lỗi rõ, không gán bừa phần vào sai trang. File .odp/.fodp không đi overlay này — chúng giữ vno:section-* sẵn có."
    ]
  },
  {
    id: "slides.slide.manage",
    app: "slides",
    commandIds: [
      "slides.slide.new",
      "slides.slide.duplicate",
      "slides.slide.delete",
      "slides.layout.apply",
      "slides.layout.select"
    ],
    title: "Thêm, nhân đôi, xóa trang và đổi bố cục",
    summary: "Trang mới (Ctrl+M) chèn trang kiểu Tiêu đề + Nội dung. Nhân đôi (Ctrl+D) tạo bản sao ngay sau trang đang mở. Xóa trang không xóa trang cuối cùng. Bố cục mở lưới 4 mẫu: Tiêu đề, Tiêu đề + Nội dung, Hai nội dung, Trống.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["trang mới", "nhân đôi", "xóa trang", "bố cục", "layout", "ctrl+m", "ctrl+d", "hai cột", "trang trống"],
    steps: [
      "Tab Trang đầu, nhóm Trang chiếu: Trang mới (Ctrl+M, nút lớn), Bố cục (nút lớn), cột Nhân đôi (Ctrl+D) / Xóa trang. Nút + trên dải thumbnail trái cũng thêm trang. Bố cục còn có trên tab Thiết kế, nhóm Bố cục trang.",
      "Trang mới dùng bố cục Tiêu đề + Nội dung: tiêu đề «Tiêu đề trang chiếu mới», hai dòng đầu dòng mẫu. Nhân đôi copy tiêu đề (thêm « (Bản sao)»), nội dung, hình, ghi chú, hiệu ứng, nền — chèn ngay sau trang hiện tại và chuyển tới bản sao.",
      "Xóa trang: không xóa được nếu chỉ còn 1 trang. Nếu đang chọn hình trên canvas, lệnh Xóa trang / phím Delete sẽ xóa hình chứ không xóa trang — bấm ra ngoài hình, hoặc xóa từ dải thumbnail / Bộ sắp xếp trang.",
      "Bố cục (và lệnh Chọn bố cục, cùng hộp thoại): lưới 4 thẻ — Tiêu đề (chữ lớn giữa trang), Tiêu đề + Nội dung (mặc định), Hai nội dung (cột trái/phải độc lập), Trống (canvas trắng). Nhấp đúp thẻ để áp dụng ngay, hoặc chọn rồi Áp dụng cho trang này / Áp dụng tất cả. Ctrl+Z hoàn tác."
    ]
  },
  {
    id: "slides.nav.slides",
    app: "slides",
    commandIds: [
      "slides.nav.firstSlide",
      "slides.nav.lastSlide",
      "slides.nav.prevSlide",
      "slides.nav.nextSlide"
    ],
    title: "Di chuyển giữa các trang chiếu",
    summary: "Bốn lệnh bàn phím, không có nút riêng trên ribbon: Ctrl+Home trang đầu, Ctrl+End trang cuối, Page Up trang trước, Page Down trang sau. Dải thumbnail trái và Bộ sắp xếp trang cũng chuyển trang bằng chuột.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["trang trước", "trang sau", "trang đầu", "trang cuối", "page up", "page down", "ctrl+home", "ctrl+end", "điều hướng"],
    steps: [
      "Không có bốn nút này trên ribbon. Dùng phím: Page Down trang sau, Page Up trang trước, Ctrl+Home trang đầu tiên, Ctrl+End trang cuối cùng.",
      "Cách khác: nhấp thumbnail trên dải trái, hoặc mở Bộ sắp xếp trang (tab Chế độ xem) rồi nhấp trang.",
      "Khi đang trình chiếu F5 / Shift+F5 / Alt+F5: phím mũi tên, Space, Page Up/Down cũng chuyển trang; Esc thoát.",
      "Chuyển trang không sửa nội dung. Trang đang ẩn vẫn chọn được khi soạn, nhưng bị bỏ qua lúc chiếu."
    ]
  },
  {
    id: "slides.insert.drawing",
    app: "slides",
    commandIds: ["slides.text.insert", "slides.shape.insert", "slides.image.insert"],
    title: "Chèn hộp chữ, hình khối và hình ảnh",
    summary: "Ba nút trên nhóm Đối tượng vẽ (Trang đầu) và lặp lại trên tab Chèn. Hình khối chèn chữ nhật xanh kéo-thả được. Hình ảnh mở hộp chọn tệp. Hộp văn bản thêm một dòng đầu dòng vào nội dung trang.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đối tượng vẽ" },
    keywords: ["hộp văn bản", "hình khối", "hình ảnh", "shape", "chèn ảnh", "chữ nhật", "đối tượng vẽ"],
    steps: [
      "Tab Trang đầu, nhóm Đối tượng vẽ: Hộp văn bản, Hình khối, Hình ảnh (ba nút lớn). Cùng lệnh còn trên tab Chèn: Hộp văn bản ở nhóm Văn bản, Hình khối ở Minh họa, Hình ảnh ở nhóm Hình ảnh.",
      "Hình khối: chèn chữ nhật xanh (~200×120 px) lên canvas, lệch dần nếu chèn nhiều cái. Kéo để đặt, kéo góc để đổi cỡ, Delete khi đang chọn để xóa. Ctrl+Z gỡ hình vừa chèn.",
      "Hình ảnh: hộp chọn tệp trên máy, ảnh thành đối tượng trên slide (kéo/đổi cỡ như hình khối).",
      "Hộp văn bản: thêm dòng «• Khung văn bản mới bổ sung» vào nội dung (body) của trang đang mở — không tạo khung kéo-thả riêng. Muốn khung độc lập, chèn Hình khối rồi gõ chữ trên hình, hoặc dùng Chữ nghệ thuật (tab Chèn, nhóm Văn bản)."
    ]
  },
  {
    id: "slides.insert.table",
    app: "slides",
    commandIds: ["slides.insert.table"],
    title: "Chèn bảng trên trang chiếu",
    summary: "Hộp thoại nhập số hàng và số cột (1–12, mặc định 3×3). Bảng là đối tượng kéo-thả trên canvas; hàng đầu điền sẵn «Cột 1», «Cột 2»…",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng" },
    keywords: ["bảng", "table", "chèn bảng", "hàng", "cột", "cột 1"],
    steps: [
      "Mở trang đích. Tab Chèn, nhóm Bảng, nhấn nút lớn Bảng.",
      "Hộp «Chèn bảng»: Số hàng và Số cột, mỗi ô 1–12, mặc định 3 và 3. Nhấn Chèn (hoặc Enter). Esc / Hủy bỏ.",
      "Bảng hiện trên canvas, kéo để đặt, kéo góc để đổi cỡ. Hàng đầu là «Cột 1», «Cột 2»…; ô dưới trống — nhấp để gõ.",
      "Ctrl+Z gỡ cả bảng vừa chèn. Delete khi đang chọn bảng cũng xóa."
    ]
  },
  {
    id: "slides.shape.groupUngroup",
    app: "slides",
    commandIds: [
      "slides.shape.group", "slides.shape.ungroup",
      "slides.arrange.alignLeft", "slides.arrange.alignCenter", "slides.arrange.alignRight",
      "slides.arrange.alignTop", "slides.arrange.alignMiddle", "slides.arrange.alignBottom",
      "slides.arrange.distributeHorizontal", "slides.arrange.distributeVertical", "slides.arrange.alignToSlide"
    ],
    title: "Sắp xếp: căn chỉnh, phân phối đều, nhóm và bỏ nhóm đối tượng",
    summary: "Tab Trang đầu, nhóm Đối tượng vẽ, nút thả xuống Sắp xếp gồm đầy đủ Căn trái/giữa/phải/trên/giữa dọc/dưới, Phân phối đều ngang/dọc, Căn theo trang chiếu, và Nhóm/Bỏ nhóm (Ctrl+G / Ctrl+Shift+G) — đúng bố cục Arrange > Align của PowerPoint thật.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đối tượng vẽ" },
    keywords: ["nhóm", "bỏ nhóm", "group", "ungroup", "ctrl+g", "ctrl+shift+g", "khối hình", "căn chỉnh", "align", "phân phối đều", "distribute", "căn theo trang chiếu", "align to slide", "sắp xếp", "arrange"],
    steps: [
      "Chọn từ hai hình trở lên: giữ Shift rồi nhấp từng hình, hoặc tab Trang đầu → nhóm Chỉnh sửa → Chọn → Chọn tất cả / Chọn đối tượng.",
      "Tab Trang đầu, nhóm Đối tượng vẽ, nút thả xuống Sắp xếp: Căn trái/Căn giữa (ngang)/Căn phải canh theo trục ngang; Căn trên/Căn giữa (dọc)/Căn dưới canh theo trục dọc. Mặc định canh theo đúng khung bao quanh các đối tượng đang chọn (giống PowerPoint khi tắt Align to Slide).",
      "Phân phối đều ngang/dọc chia đều khoảng TRỐNG giữa các đối tượng (giữ nguyên hình đầu và cuối theo trục đang phân phối) — cần ít nhất 3 đối tượng để thấy hiệu quả rõ ràng.",
      "Bật Căn theo trang chiếu để mọi lệnh Căn/Phân phối tiếp theo dùng toàn bộ khung trang chiếu làm mốc thay vì khung các đối tượng đang chọn — giống PowerPoint thật.",
      "Ctrl+G nhóm (cần ít nhất hai hình, không tính đường nối); Ctrl+Shift+G bỏ nhóm. Mọi thao tác Căn/Phân phối/Nhóm/Bỏ nhóm đều hoàn tác được bằng Ctrl+Z."
    ]
  },
  {
    id: "slides.show.start",
    app: "slides",
    commandIds: [
      "slides.show.startFromBegin",
      "slides.show.startFromCurrent",
      "slides.show.presenterMode"
    ],
    title: "Bắt đầu trình chiếu và chế độ Người thuyết trình",
    summary: "F5 chiếu từ trang không ẩn đầu tiên; Shift+F5 từ trang đang mở; Alt+F5 mở màn Người thuyết trình (ghi chú, trang kế, đồng hồ) trong cùng cửa sổ. Esc thoát. Trang ẩn bị bỏ qua.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Khởi động chiếu" },
    keywords: ["trình chiếu", "f5", "shift+f5", "alt+f5", "presenter", "người thuyết trình", "chiếu từ đầu", "slideshow"],
    steps: [
      "Tab Trình chiếu, nhóm Khởi động chiếu: Từ đầu (F5), Từ trang này (Shift+F5), Chế độ Presenter (Alt+F5).",
      "Từ đầu / Từ trang này: toàn màn hình cho khán giả, không hiện ghi chú. Space hoặc → trang sau; ← trang trước; Esc thoát. Trang đã Ẩn trang chiếu bị nhảy qua. Mọi trang đều ẩn thì hộp thoại báo «Tất cả trang chiếu đang bị ẩn».",
      "Chế độ Presenter: overlay trong cùng cửa sổ (không tách màn hình 2). Cột trái: trang hiện tại, nút Trang trước / Trang tiếp, bộ đếm. Cột phải: ghi chú (A+/A− đổi cỡ chữ) và xem trước trang kế. Đồng hồ «ĐÃ THUYẾT TRÌNH» và đồng hồ máy. Esc hoặc ✕ Thoát.",
      "Cấu hình lặp liên tục / màu con trỏ: tab Trình chiếu → Thiết lập → Thiết lập trình chiếu (bài riêng)."
    ]
  },
  {
    id: "slides.view.normal",
    app: "slides",
    commandIds: ["slides.view.normal"],
    title: "Dạng xem bình thường",
    summary: "Quay về soạn từng trang: dải thumbnail trái và sân khấu canvas giữa. Dùng sau khi đóng Bộ sắp xếp trang hoặc Chế độ đọc.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["bình thường", "normal view", "soạn trang", "thumbnail", "canvas"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nhấn Bình thường (nút lớn đầu nhóm).",
      "Giao diện soạn thảo: thumbnail trái để chọn trang, canvas giữa để sửa tiêu đề, nội dung và hình. Thanh ghi chú dưới canvas nếu đang bật.",
      "Bộ sắp xếp trang và Chế độ đọc cũng nằm cùng nhóm — Bình thường là cách về màn hình soạn. Esc trong Bộ sắp xếp / Chế độ đọc cũng về Bình thường.",
      "Chế độ này không đổi nội dung trang, chỉ đổi cách nhìn."
    ]
  },
  {
    id: "slides.file.printPreview",
    app: "slides",
    commandIds: ["slides.file.printPreview"],
    title: "Xem trước khi in",
    summary: "Ctrl+F2 mở bản xem trước THẬT của toàn bộ bản trình chiếu theo kiểu Full Page Slides của PowerPoint — mỗi trang chiếu không bị ẩn là một trang in, có điều hướng Trang trước/sau và nút In ngay trong overlay.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["xem trước khi in", "print preview", "in tài liệu", "ctrl+f2", "full page slides", "in trang chiếu"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nút nhỏ Xem trước khi in (hoặc Ctrl+F2 từ bất cứ đâu trong Slides).",
      "Overlay hiển thị từng trang chiếu như bản in thật: tiêu đề, nội dung, hình khối và chân trang (ngày/footer/số trang) nếu đã bật ở Chèn → Đầu trang & Chân trang.",
      "Trang chiếu đang Ẩn (Hide Slide) không xuất hiện trong bản in, đúng mặc định của PowerPoint thật.",
      "Nút In tài liệu trong overlay in ngay (Ctrl+P); Trang trước/sau điều hướng khi có nhiều trang chiếu. Đóng bằng Esc hoặc nút ×."
    ]
  },
  {
    id: "slides.view.zoom",
    app: "slides",
    commandIds: [
      "slides.view.zoomIn",
      "slides.view.zoomOut",
      "slides.view.zoomReset",
      "slides.view.fitToWindow"
    ],
    title: "Thu phóng sân khấu trang chiếu",
    summary: "Phóng to / thu nhỏ sân khấu theo bước 10%. Đặt lại về 100%. Vừa cửa sổ co sân khấu khớp khung làm việc (khoảng 30%–200%), trừ chỗ ghi chú nếu đang mở.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Thu phóng" },
    keywords: ["thu phóng", "phóng to", "thu nhỏ", "vừa cửa sổ", "fit to window", "zoom", "100%", "sân khấu"],
    steps: [
      "Tab Chế độ xem, nhóm Thu phóng: Phóng to (nút lớn) tăng 10%, Thu nhỏ giảm 10%, Đặt lại về 100%, Vừa cửa sổ.",
      "Vừa cửa sổ lấy chiều rộng/cao khung stage so với cỡ trang (mặc định 960×540), kẹp khoảng 30%–200%. Nếu khung ghi chú đang mở, chiều cao tính trừ phần ghi chú.",
      "Zoom chỉ đổi hiển thị lúc soạn, không đổi cỡ trang khi chiếu F5. Cỡ trang thật: tab Thiết kế → Cỡ trang chiếu.",
      "Nhóm Cửa sổ cạnh đó có Cửa sổ mới (mở tab/cửa sổ trình duyệt khác)."
    ]
  },
  {
    id: "slides.notes.toggle",
    app: "slides",
    commandIds: ["slides.notes.toggle"],
    title: "Ghi chú người thuyết trình",
    summary: "Bật/tắt khung ghi chú dưới canvas. Mỗi trang có ghi chú riêng, không lẫn sang trang khác. F5 không hiện ghi chú cho khán giả — chỉ thấy trong khung này và trong Chế độ Presenter (Alt+F5).",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["ghi chú", "speaker notes", "thuyết trình", "ghi chú trang", "notes"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nhấn Ghi chú thuyết trình — hoặc tab Trình chiếu, nhóm Người thuyết trình, cùng nút. Khung dưới canvas mở rộng; nút trên khung đổi thành «▼ Thu gọn ghi chú».",
      "Gõ ghi chú cho trang đang mở. Chuyển thumbnail thì khung nạp ghi chú của trang mới, không mang chữ trang cũ. Có bộ đếm ký tự trên khung.",
      "Nhấn lại nút (hoặc «▼ Thu gọn ghi chú») để đóng, lấy chỗ canvas. Ghi chú vẫn được lưu theo trang, kể cả khi thu gọn.",
      "Khi chiếu F5/Shift+F5 khán giả không thấy ghi chú. Muốn đọc ghi chú lúc nói chuyện: Alt+F5 (Chế độ Presenter). Ghi chú được lưu trong file FODP."
    ]
  },
  {
    id: "slides.review.commentInsertHelp",
    app: "slides",
    commandIds: ["slides.review.commentInsert"],
    title: "Thêm nhận xét cho trang chiếu",
    summary: "Mở panel nhận xét của trang đang mở — lệnh không chèn sẵn một nhận xét. Gõ rồi Thêm nhận xét hoặc Ctrl+Enter. Nhận xét gắn theo trang, không neo vào hình.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Nhận xét" },
    keywords: ["nhận xét", "ghi chú trang", "comment", "thêm nhận xét", "ctrl+enter"],
    steps: [
      "Tab Đánh giá, nhóm Nhận xét, nút lớn Nhận xét mới — cùng nút trên tab Chèn, nhóm Nhận xét. Không có Ctrl+Alt+M như Writer.",
      "Panel «Nhận xét trang chiếu» mở bên cạnh. Ô «Nhận xét mới», gợi ý «Nhập nội dung nhận xét...», nút Thêm nhận xét. Trang chưa có nhận xét hiện «Trang chiếu này chưa có nhận xét.» Gửi bằng nút hoặc Ctrl+Enter (Cmd+Enter). Tác giả mặc định «Người dùng», kèm giờ vi-VN.",
      "Mỗi mục có nút Xóa. Đã xử lý nằm nút ribbon riêng (bài duyệt nhận xét). Esc đóng panel. Huy hiệu ◰ + số trên canvas; Bộ sắp xếp trang hiện 💬 N.",
      "Ctrl+Z hoàn tác lần thêm/xóa. Nhận xét theo trang, không theo vùng chữ hay hình như PowerPoint."
    ]
  },
  {
    id: "slides.review.spellCheckHelp",
    app: "slides",
    commandIds: ["slides.review.spellCheck"],
    title: "Kiểm tra chính tả tiếng Việt trên trang chiếu",
    summary: "F7 (khi đang Slides) hoặc nút Chính tả quét tiêu đề, nội dung, cột 2 và chữ trên hình của trang hiện tại — không quét ghi chú thuyết trình. Có gạch sóng khi gõ.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Chứng minh" },
    keywords: ["chính tả", "spell check", "f7", "từ điển", "tiếng việt", "gạch sóng"],
    steps: [
      "Tab Đánh giá, nhóm Chứng minh, nút lớn Chính tả — hoặc F7 khi Slides đang active (F7 Writer vẫn là Soát lỗi AI; F7 Sheet/Slides là chính tả).",
      "Hộp «Chính tả» quét trang đang mở: Tiêu đề, Nội dung, Nội dung cột 2, Hình. Hiện «Không có trong từ điển», vị trí, nội dung, gợi ý. Nút Bỏ qua / Bỏ qua tất cả / Thêm vào từ điển / Thay thế / Thay thế tất cả / Đóng. Esc đóng.",
      "Hết lỗi: «Đã kiểm tra xong trang chiếu hiện tại. Không tìm thấy lỗi chính tả.» Từ điển cá nhân dùng chung Writer/Sheet (vno-spellcheck-vi-personal). Không quét khung ghi chú thuyết trình.",
      "Khi soạn, chữ sai trên tiêu đề/nội dung/hình được gạch sóng (trễ ~400 ms). Chỉ từ điển tiếng Việt."
    ]
  },
  {
    id: "slides.media.insert",
    app: "slides",
    commandIds: ["slides.media.insertVideo", "slides.media.insertAudio"],
    title: "Chèn video và âm thanh từ máy tính",
    summary: "Chọn tệp video/* hoặc audio/* trên máy, nhúng Data URL thành đối tượng trên trang. Video mặc định 320×200 px, âm thanh 260×40 px, có nút điều khiển. Tệp >10 MB chỉ cảnh báo, không chặn.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Đa phương tiện" },
    keywords: ["video", "âm thanh", "audio", "chèn video", "media", "mp4", "mp3"],
    steps: [
      "Mở trang đích. Tab Chèn, nhóm Đa phương tiện: Video và Âm thanh (hai nút lớn). Hộp chọn tệp hệ thống, lọc video/* hoặc audio/*.",
      "Video chèn hình 320×200 px tại ~100+(số hình×24); âm thanh thanh 260×40 px. Cả hai có controls HTML. Nhiều lần chèn lệch vị trí 24 px. × khi đang chọn để xóa («Xóa đối tượng này»).",
      "Tệp lớn hơn 10 MB vẫn chèn, console cảnh báo có thể làm chậm lưu/mở vì nhúng Data URL. Không có video YouTube, cắt đoạn, hay phát xuyên trang.",
      "Khi chiếu F5, bấm vào video/audio không sang trang (để xem/nghe). Ctrl+Z gỡ đối tượng vừa chèn."
    ]
  },
  {
    id: "slides.insert.headerFooterHelp",
    app: "slides",
    commandIds: [
      "slides.insert.headerFooter",
      "slides.insert.dateTime",
      "slides.insert.slideNumber"
    ],
    title: "Ngày tháng, số trang và chân trang",
    summary: "Ba nút nhóm Văn bản điều khiển một thanh chân trang (không có đầu trang riêng): ngày, chữ chân trang, «Trang n / N». Ngày & Giờ chọn định dạng; Số trang chiếu bật ngay cho mọi trang.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["đầu trang", "chân trang", "số trang chiếu", "ngày giờ", "header footer", "trang n / n"],
    steps: [
      "Tab Chèn, nhóm Văn bản, cột nhỏ: Đầu trang & Chân trang, Ngày & Giờ, Số trang chiếu (dưới Hộp văn bản / Chữ nghệ thuật).",
      "Đầu trang & Chân trang mở hộp cùng tên: tick Ngày tháng, Số trang chiếu (mặc định bật), Chân trang (mặc định bật, chữ mẫu «Tài liệu trình chiếu tiêu chuẩn VN Office»), Áp dụng cho mọi trang chiếu (mặc định bật). Áp dụng / Hủy bỏ. Thanh dưới sân khấu: ngày | chữ chân | «Trang n / N».",
      "Ngày & Giờ mở hộp «Ngày & Giờ»: 5 mẫu dd/MM/yyyy (mặc định), dd/MM/yyyy HH:mm, «6 tháng 9 năm 2026», yyyy-MM-dd, HH:mm — giá trị lúc bấm, tự lấy Date mới mỗi lần vẽ. Chèn bật ngày cho mọi trang (trừ khi tắt Áp dụng cho mọi trang). Số trang chiếu không hỏi, bật «Trang n / N» cho mọi trang ngay.",
      "Không có vùng đầu trang riêng, không «ẩn trên trang tiêu đề». Khi chiếu F5, overlay dùng chữ chân mẫu chủ đạo + bộ đếm riêng, không đọc hết tùy chọn hộp này."
    ]
  },
  {
    id: "slides.insert.symbolHelp",
    app: "slides",
    commandIds: ["slides.insert.symbol"],
    title: "Chèn ký hiệu trên trang chiếu",
    summary: "Cùng bộ ký tự Writer: Thường dùng, Toán học, Mũi tên. Nhấp ký tự là chèn rồi đóng. Ký tự được nối vào hình đang chọn, hoặc tiêu đề, hoặc nội dung — không cắm đúng vị trí con trỏ.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Ký hiệu" },
    keywords: ["ký hiệu", "symbol", "copyright", "đồng", "mũi tên", "©", "₫"],
    steps: [
      "Chọn khung chữ (tiêu đề, nội dung, hoặc hình có chữ). Tab Chèn, nhóm Ký hiệu, nút lớn Ký hiệu.",
      "Hộp «Ký hiệu»: Thường dùng (© ® ™ ° ± § ¶ • … – — € £ ¥ ₫), Toán học (× ÷ ≈ ≠ ≤ ≥ ∞ √ ∑ ∏ ∫ ∂ ∆ π µ), Mũi tên (← → ↑ ↓ ↔ ⇒ ⇐ ⇔). Nhấp một ký tự để chèn và đóng. Hủy bỏ đóng không chèn.",
      "Nếu đang chọn hình có thuộc tính chữ: ký tự nối cuối chữ hình. Đang chọn tiêu đề: nối vào tiêu đề. Còn lại: nối vào nội dung trang. Không chèn giữa từ dù gợi ý nói «tại vị trí con trỏ».",
      "Ctrl+Z xóa ký tự vừa thêm."
    ]
  },
  {
    id: "slides.design.themeAndSize",
    app: "slides",
    commandIds: ["slides.design.themeGallery", "slides.design.slideSize", "slides.master.apply"],
    title: "Chủ đề, mẫu chủ đạo và cỡ trang chiếu",
    summary: "Sáu chủ đề màu/phông/logo áp cả bộ. Mẫu Slide Master cùng 6 bộ, thêm ô logo chữ. Cỡ: Màn hình rộng 16:9 (960×540, mặc định) hoặc Tiêu chuẩn 4:3 (720×540) — hình sẵn có bị co theo.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Chủ đề" },
    keywords: ["chủ đề", "theme", "slide master", "cỡ trang chiếu", "16:9", "4:3", "960x540", "logo"],
    steps: [
      "Tab Thiết kế, nhóm Chủ đề: nút lớn Chủ đề. Hộp «Thư viện Chủ đề» — nhấp thẻ là áp ngay cả bộ (không nút Áp dụng). Sáu mẫu: Xanh Doanh Nghiệp (Inter, mặc định modern-blue), Terracotta Ấm Áp (Times New Roman), Xanh Lá Thiên Nhiên, Than Chì Hiện Đại, Đơn Sắc Tối Giản (Arial), Cam Năng Động (Verdana). Mỗi mẫu có logo chữ kiểu «VN OFFICE • DOANH NGHIỆP». Ctrl+Z hoàn tác lần chọn chủ đề.",
      "Nhóm Mẫu chủ đạo: Mẫu Slide Master. Hộp «Mẫu Slide Master» cùng 6 bộ, thêm ô «Tên đơn vị / Logo chữ góc trang» (mặc định «VN OFFICE» hoặc logo đang dùng). Chọn thẻ điền sẵn logo của mẫu. Hủy bỏ / Áp dụng mẫu. Khác thư viện Chủ đề: lần Áp dụng mẫu không đẩy Undo.",
      "File → Lưu dạng PowerPoint (*.pptx): sau khi LibreOffice chuyển FODP, VN Office gắn logo chữ vào Slide Master bằng một hình DrawingML chuẩn (p:sp không phải ô kế thừa title/body/chân trang). Logo lấy đúng ô «Tên đơn vị / Logo chữ góc trang», đặt ở dải trên của master, không đè khung chữ sẵn. Mở PPTX bằng PowerPoint hoặc LibreOffice vẫn thấy chữ logo. Lưu FODP/ODP giữ master-page ODF như trước; không có logo thì File → Lưu PPTX không vá thêm hình.",
      "File → Mở một .pptx đã có logo master (file vừa Lưu, hoặc file PowerPoint có hình tên VNOfficeMasterLogo trên Slide Master): LibreOffice chuyển PPTX→FODP giữ chữ trên master-page nhưng không phát vno:master-theme, nên ô logo trên canvas VN Slides sẽ trống nếu không overlay. VN Office đọc p:sp tên VNOfficeMasterLogo từ file PPTX gốc (không đoán hình khác trên master), lấy lại chữ / màu / phông, rồi gắn vno:master-theme lên FODP trước khi mở canvas. Ô «Tên đơn vị / Logo chữ góc trang» hiện lại đúng chữ, màu accent và phông. Nhiều hình trùng tên hoặc hình tên đó lại là ô kế thừa (p:ph) thì hộp thoại Mở báo lỗi rõ, không đoán. File .odp/.fodp không đi overlay này — chúng giữ vno:master-theme sẵn có.",
      "Nhóm Tùy chỉnh: Cỡ trang chiếu. Hộp «Kích thước trang chiếu»: Màn hình rộng 16:9 · 960 × 540, hoặc Tiêu chuẩn 4:3 · 720 × 540. Nhấp thẻ áp ngay; mọi hình bị co x,y,w,h theo khung mới. Cùng preset thì không đổi. Ctrl+Z hoàn tác đổi cỡ.",
      "Không có dạng xem Master (không sửa khung chữ sẵn của từng bố cục). Không có cỡ tùy chỉnh / 16:10."
    ]
  },
  {
    id: "slides.view.readingAndGuides",
    app: "slides",
    commandIds: [
      "slides.view.reading",
      "slides.view.ruler",
      "slides.view.gridlines",
      "slides.view.guides",
      "slides.view.newWindow"
    ],
    title: "Chế độ đọc, thước, lưới, đường gióng và cửa sổ mới",
    summary: "Chế độ đọc overlay toàn cửa sổ, chỉ hiện tiêu đề + nội dung chữ. Thước px (vạch 10 px). Lưới 20×20 px không hút. Hai đường gióng kéo được, mặc định giữa 480×270. Cửa sổ mới mở tab trình duyệt.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["chế độ đọc", "reading view", "thước", "đường lưới", "đường hướng dẫn", "guides", "cửa sổ mới"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu: Chế độ đọc (nút lớn, cạnh Bình thường / Bộ sắp xếp / Ghi chú). Overlay «Dạng xem Đọc (Reading View)»: ‹ › đổi trang, «Trang n / N», ✕ Đóng. Esc thoát; ← / PageUp trước; → / PageDown / Space sau. Chỉ hiện tiêu đề và nội dung chữ đã thoát HTML — không hình, media, biểu đồ, cột 2, chân trang, hiệu ứng.",
      "Nhóm Hiển thị: Thước, Đường lưới, Đường hướng dẫn (ba nút bật/tắt, mặc định tắt). Thước SVG ngang+dọc, vạch 10 px, số 0 / 100 / 200… theo pixel (không phải cm). Lưới ô 20×20 px, không bắt dính hình.",
      "Đường hướng dẫn: đúng hai đường (dọc + ngang), mặc định tâm 480×270 trên khung 960×540. Kéo tay cầm «Kéo để chỉnh đường gióng dọc/ngang»; tooltip X/Y px, kẹp trong khổ trang. Không thêm/bớt đường, không tự căn lại khi đổi 4:3.",
      "Nhóm Cửa sổ: Cửa sổ mới mở tab cùng URL. Bị chặn pop-up: «Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho VN Office.»"
    ]
  },
  {
    id: "slides.show.rehearseTimingsHelp",
    app: "slides",
    commandIds: ["slides.show.rehearseTimings"],
    title: "Tập dượt hẹn giờ",
    summary: "Chiếu từ trang đang mở, đồng hồ «Trang: MM:SS» và «Tổng: MM:SS». Esc (hoặc hết trang) hỏi có lưu thời gian từng trang không. Thời gian lưu chỉ để tham khảo — F5 không tự chuyển trang theo mốc này.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Người thuyết trình" },
    keywords: ["tập dượt", "hẹn giờ", "rehearse timings", "đồng hồ", "thời gian trang"],
    steps: [
      "Mở trang muốn bắt đầu tập. Tab Trình chiếu, nhóm Người thuyết trình: Tập dượt hẹn giờ (nút lớn, cạnh Ghi chú thuyết trình).",
      "Overlay «Tập dượt thời gian trình chiếu» với đồng hồ «Trang: MM:SS» và «Tổng: MM:SS» (cập nhật 250 ms). Space / → / PageDown / click (trừ video/audio/đồng hồ) sang trang; ← / PageUp lùi; Esc kết thúc. Trang ẩn bị bỏ qua. Bắt đầu từ trang đang mở, không phải trang 1.",
      "Hết (Esc hoặc trang cuối, trừ khi đang lặp liên tục): hộp xác nhận «Tổng thời gian trình chiếu: {time}. Lưu thời gian tập dượt cho từng trang?» Đồng ý ghi rehearsedDuration (1 chữ số thập phân); Bộ sắp xếp trang hiện ⏱ Ns.",
      "Mốc đã lưu không tự chạy khi F5 — chỉ để xem lại. Muốn lặp không dừng: tab Trình chiếu → Thiết lập trình chiếu."
    ]
  },
  {
    id: "slides.shape.rotationHandle",
    app: "slides",
    commandIds: ["slides.shape.insert"],
    title: "Xoay hình khối và hình ảnh",
    summary: "Xoay đối tượng trực quan quanh tâm bằng tay cầm tròn phía trên đỉnh hình. Giữ Shift để xoay từng bước 15° chuẩn xác. Hoàn tác bằng Ctrl+Z hoặc nhấp chuột phải chọn Đặt lại góc xoay (0°).",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["xoay", "xoay hình", "rotate", "tay cầm xoay", "rotation handle", "góc xoay", "đặt lại góc xoay"],
    steps: [
      "Nhấp chọn một hình khối hoặc hình ảnh trên trang chiếu canvas. Xung quanh đối tượng sẽ xuất hiện 8 tay cầm co giãn, nút xóa màu đỏ ở góc trên-trái và một tay cầm xoay hình tròn nhỏ màu xanh dương ở phía trên đỉnh (nối bằng cần mảnh).",
      "Rê chuột vào tay cầm xoay tròn: con trỏ chuyển thành hình bàn tay nắm (grab). Nhấn giữ chuột và kéo xoay quanh tâm đối tượng theo chiều kim đồng hồ hoặc ngược chiều kim đồng hồ.",
      "Xoay từng bước 15° chuẩn xác: nhấn giữ phím Shift trong lúc kéo chuột để góc xoay tự động bắt dính vào các bội số 15° (15°, 30°, 45°, 60°, 90°...), tương tự như trong Microsoft PowerPoint. Một huy hiệu tooltip nhỏ hiển thị số độ hiện tại ngay cạnh tay cầm khi đang kéo giúp theo dõi góc xoay trực quan.",
      "Con trỏ co giãn thông minh và nút xóa trực quan: Khi hình xoay ở bất kỳ góc nào, con trỏ chuột của 8 tay cầm tự động định hướng theo góc nhìn thực tế trên màn hình (ví dụ: tay cầm ở cạnh bên luôn hiển thị con trỏ kéo ngang ew-resize), và nút xóa tròn đỏ luôn giữ tư thế thẳng đứng dễ nhận biết.",
      "Kéo tay cầm về vị trí thẳng đứng ban đầu (hoặc gần 0°), góc xoay sẽ tự động đưa về mặc định không xoay.",
      "Đặt lại góc xoay về 0° nhanh chóng: nhấp chuột phải vào hình vẽ đã xoay để mở trình đơn ngữ cảnh, chọn «Đặt lại góc xoay (0°)».",
      "Hoàn tác thao tác xoay: nhấn phím Ctrl+Z để quay về góc xoay trước đó; nhấn Ctrl+Y để làm lại."
    ]
  }
];

registerHelpEntries(SLIDES_HELP_ENTRIES);
