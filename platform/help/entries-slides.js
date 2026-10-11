/**
 * Hướng dẫn sử dụng 3T Slide — nội dung tiếng Việt thật, khớp UI hiện có.
 * Tự đăng ký vào catalog dùng chung qua registerHelpEntries().
 */

import { registerHelpEntries } from "./help-catalog.js";

export const SLIDES_HELP_ENTRIES = [
  {
    id: "slides.file.basics",
    app: "slides",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.close", "common.file.print"],
    title: "Tạo, mở, lưu và in bản trình chiếu",
    summary: "Bản trình chiếu mới có một trang chiếu với chỗ gợi ý xám «Bấm để thêm tiêu đề» và «Bấm để thêm văn bản» nhưng chưa có chữ trong nội dung. Dùng Tệp để mở hoặc lưu PPTX, PPT, ODP; Ctrl+P xem trước bản in.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Bản trình chiếu" },
    keywords: ["tạo mới", "mở tệp", "lưu", "lưu thành", "in", "Ctrl+N", "Ctrl+O", "Ctrl+S", "F12", "Ctrl+P", "trang chiếu trống", "cửa sổ riêng", "mở nhiều cửa sổ", "Explorer"],
    steps: [
      "Tạo bản mới: nhấn Ctrl+N hoặc mở Tệp > Mới. Slide mở cửa sổ riêng tên Bản trình bày 2, Bản trình bày 3… với một trang chiếu trống. Chữ gợi ý xám trong khung tiêu đề và khung văn bản chỉ là hướng dẫn trên màn hình, không phải nội dung được lưu. Trong Desktop, khi Slide đang mở, nhấp đúp thêm tệp PPTX/PPT/ODP trong Explorer hoặc bấm lại shortcut Slide ở Start sẽ mở thêm cửa sổ trong cùng tiến trình. Mỗi cửa sổ có bản trình chiếu, trạng thái sửa, lệnh Lưu và lời nhắc Đóng riêng; cửa sổ cuối cùng mới kết thúc ứng dụng.",
      "Mở bản trình chiếu: nhấn Ctrl+O hoặc chọn Tệp > Mở, chọn PPTX, PPT hoặc ODP. Nếu bản đang mở có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi tiếp tục.",
      "Lưu: Ctrl+S mở hộp thoại Lưu thành cho bản mới; với tệp đã mở/lưu, lệnh này giữ nguyên định dạng. Nhấn F12 (hoặc Ctrl+Shift+S), nhập tên trong hộp thoại Lưu bản sao rồi chọn PPTX, PPT, ODP hoặc PDF ở danh sách Loại tệp. Cũng có thể chọn Tệp > Lưu bản sao. Khi lưu sang PPTX/PPT/ODP, tên tab và tiêu đề cửa sổ chuyển theo tệp mới; chọn PDF chỉ xuất bản sao và giữ nguyên bản trình chiếu đang mở. Khi ghi đè tệp đã có, xác nhận trong hộp thoại của Windows.",
      "In: nhấn Ctrl+P để xem trước từng trang chiếu. Chọn máy in, số bản và phạm vi trang rồi nhấn In; mỗi trang chiếu chiếm một trang in."
    ]
  },
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
      "Nhấn Chèn sơ đồ. Các hộp hiện trên vùng soạn thảo; nhấp vào chữ để sửa (Bước 1, Lãnh đạo, Bộ phận…). Kéo góc để đổi kích thước.",
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
      "Chọn trang trên dải thumbnail trái hoặc bấm chuột phải vào thumbnail. Trong menu, chọn Ẩn trang chiếu; hoặc mở tab Trình chiếu, nhóm Thiết lập, nhấn Ẩn trang chiếu.",
      "Thumbnail trang đó có dấu ⊘ và nhãn «Trang chiếu ẩn». Nút ribbon ở trạng thái đang bật.",
      "Khi chiếu Từ đầu (F5) hoặc Từ trang này (Shift+F5), trang ẩn bị nhảy qua. Nếu mọi trang đều ẩn, hộp thoại báo «Tất cả trang chiếu đang bị ẩn».",
      "Nhấn lại Ẩn trang chiếu để hiện. Có thể ẩn/hiện trong Bộ sắp xếp trang (tab Chế độ xem). Trang ẩn vẫn được lưu trong tệp."
    ]
  },
  {
    id: "slides.context.menu",
    app: "slides",
    commandIds: ["slides.slide.new", "slides.slide.duplicate", "slides.slide.delete", "slides.layout.apply"],
    title: "Thao tác nhanh trên trang chiếu",
    summary: "Dùng menu chuột phải trên thumbnail để tạo, nhân đôi, cắt, sao chép, dán, ẩn, đổi thứ tự hoặc mở bố cục của trang chiếu.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["chuột phải", "thumbnail", "cắt trang", "sao chép trang", "dán trang", "chuyển lên", "chuyển xuống", "bố cục", "sắp xếp"],
    steps: [
      "Bấm chuột phải vào thumbnail ở dải bên trái để mở menu thao tác. Dùng phím mũi tên lên/xuống để chọn mục, Enter để thực hiện hoặc Esc để đóng menu.",
      "Chọn Sao chép trang chiếu hoặc Cắt trang chiếu để giữ trang trong bộ nhớ tạm của ứng dụng; bấm chuột phải vào thumbnail đích rồi chọn Dán trang chiếu. Cắt không xóa trang cuối cùng của bản trình chiếu.",
      "Chọn Chuyển lên hoặc Chuyển xuống để đổi thứ tự một vị trí. Chọn Ẩn trang chiếu để bỏ qua trang khi trình chiếu; chọn lại mục hiện trang để khôi phục.",
      "Chọn Bộ sắp xếp trang chiếu để xem toàn bộ trang dạng lưới và kéo thả sắp xếp. Chọn Bố cục để mở bộ chọn bố cục cho trang đang chọn. Các thao tác chỉnh sửa có thể hoàn tác bằng Ctrl+Z."
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
    summary: "Trên tab Trang đầu: đổi phông, cỡ, đậm/nghiêng/gạch, màu chữ, màu nền chữ; và đoạn văn (đầu dòng, đánh số, căn lề, thụt lề, giãn dòng 1.0 / 1.5 / 2.0). Nút Màu chữ áp dụng màu đỏ RGB 255 mặc định.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Phông chữ" },
    keywords: ["phông chữ", "đoạn văn", "đậm", "căn lề", "dấu đầu dòng", "giãn dòng", "font", "paragraph", "bold"],
    steps: [
      "Nhấp vào tiêu đề, nội dung slide hoặc hộp văn bản, rồi bôi chữ cần đổi (hoặc đặt con trỏ trong đoạn).",
      "Nhóm Phông chữ: chọn Calibri / Arial / Times New Roman / Be Vietnam Pro / Roboto; chọn cỡ (10–48); nút Tăng/Giảm cỡ chữ; Đậm (Ctrl+B), Nghiêng (Ctrl+I), Gạch chân (Ctrl+U), Gạch ngang; Xóa định dạng; Màu chữ (đỏ RGB 255 mặc định) và Màu nền chữ.",
      "Nhóm Đoạn văn (ngay bên phải): Dấu đầu dòng, Đánh số, Giảm/Tăng thụt lề, hộp Giãn dòng 1.0 / 1.5 / 2.0; hàng dưới là Căn trái (Ctrl+L), Căn giữa (Ctrl+E), Căn phải (Ctrl+R), Căn đều (Ctrl+J). Trong khung nội dung slide, có thể dùng phím Tab để tăng thụt lề và nhấn giữ Shift cùng Tab để giảm thụt lề.",
      "Định dạng áp dụng cho vùng chữ đang chọn trên slide, không phải cho cả bài trừ khi bôi hết. Thay đổi nội dung tiêu đề và văn bản tự động ghi nhận vào lịch sử Hoàn tác (Ctrl+Z) và Làm lại (Ctrl+Y)."
    ]
  },
  {
    id: "slides.insert.wordart",
    app: "slides",
    commandIds: ["slides.insert.wordart"],
    title: "Chữ nghệ thuật (phần mềm văn phòng khácArt)",
    summary: "Chèn dòng tiêu đề có viền, đổ bóng hoặc gradient. Gõ nội dung, chọn một mẫu trong thư viện, rồi kéo thả / sửa chữ trên vùng soạn thảo.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Văn bản" },
    keywords: ["chữ nghệ thuật", "wordart", "word art", "tiêu đề", "gradient", "viền"],
    steps: [
      "Tab Chèn, nhóm Văn bản, nhấn Chữ nghệ thuật (nút lớn, cạnh Hộp văn bản).",
      "Hộp thoại Chèn chữ nghệ thuật: ô Nội dung chữ (mặc định «3T Office», tối đa 80 ký tự) và lưới mẫu (ví dụ Xanh đậm viền trắng, vàng viền, gradient…). Chọn mẫu để xem chữ «Aa».",
      "Nhấn Chèn. Khối chữ xuất hiện trên slide; kéo để đặt, nhấp vào chữ để sửa nội dung. Ctrl+Z gỡ khối vừa chèn.",
      "Cùng nhóm Văn bản còn Hộp văn bản thường (không hiệu ứng) và Đầu trang & Chân trang / Ngày & Giờ / Số trang chiếu."
    ]
  },
  {
    id: "slides.edit.formatPainter",
    app: "slides",
    commandIds: ["slides.edit.formatPainter"],
    title: "Sao chép định dạng",
    summary: "Copy kiểu chữ hoặc hình đang chọn sang đối tượng khác. Nhấp đúp để khóa và áp dụng nhiều lần; Esc hủy. Con trỏ vùng soạn thảo đổi thành cọ khi đang bật.",
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
      "Lưới hiện mọi trang. Kéo một trang thả vào vị trí mới để đổi thứ tự. Có thể dùng các phím mũi tên ← → ↑ ↓ để duyệt qua các trang, phím Delete hoặc Backspace để xóa trang đang chọn, phím Ctrl+D để nhân đôi trang, hoặc giữ phím Ctrl cùng mũi tên để di chuyển thứ tự trang. Trang ẩn vẫn hiện kèm dấu ⊘.",
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
      "Gắn hiệu ứng cho từng đối tượng bằng nút Hiệu ứng đối tượng (cùng nhóm). Tab Hoạt hình, nhóm Hiệu ứng đối tượng, nhấn Ngăn hoạt hình — bảng hiện bên phải vùng soạn thảo.",
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
    steps: ["Mở tab Đánh giá, nhóm Nhận xét.", "Khi bản trình bày chưa có nhận xét, các nút Nhận xét trước/sau, Đã xử lý và Xóa nhận xét tự vô hiệu hóa. Nhấn Nhận xét để thêm nhận xét trước.", "Nhấn Nhận xét trước hoặc Nhận xét sau; Slide chuyển tới đúng trang, mở bảng nhận xét, tô sáng mục và quay vòng ở cuối.", "Nhấn Đã xử lý để làm mờ và gạch nội dung nhưng vẫn giữ nhận xét; nhấn lại để mở lại.", "Nhấn Xóa nhận xét để xóa mục đang chọn. Dùng Ctrl+Z/Ctrl+Y để hoàn tác/làm lại."]
  },
  {
    id: "slides.show.setupShow",
    app: "slides",
    commandIds: ["slides.show.setupShow"],
    title: "Thiết lập trình chiếu (Set Up Slide Show)",
    summary: "Hộp thoại trên tab Trình chiếu, nhóm Thiết lập: lặp liên tục đến Esc, trình chiếu không thuyết minh, và màu con trỏ bút/laser. Trong chế độ trình chiếu F5, hỗ trợ Bút vẽ (Ctrl+P), Con trỏ laser (Ctrl+L), Xóa nét vẽ (E), Mũi tên (Ctrl+A), đổi màu bút, và hộp thoại Giữ nét vẽ khi kết thúc để lưu vào PPTX.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Thiết lập" },
    keywords: ["thiết lập trình chiếu", "set up slide show", "lặp liên tục", "loop", "thuyết minh", "narration", "bút", "laser", "màu con trỏ", "pptx", "showPr", "ctrl+p", "ctrl+l", "nét vẽ"],
    steps: [
      "Tab Trình chiếu, nhóm Thiết lập, nhấn Thiết lập trình chiếu (cạnh Ẩn trang chiếu).",
      "Đánh dấu Lặp lại liên tục cho đến khi nhấn Esc để sau trang cuối quay lại trang đầu không bị ẩn. Nếu bỏ chọn, trình chiếu kết thúc sau trang cuối. Nhấn Esc để thoát bất cứ lúc nào; tùy chọn lặp được giữ khi lưu .pptx.",
      "Trình chiếu không có thuyết minh: tùy chọn được lưu cùng bản trình chiếu. Slide hiện chưa phát thuyết minh trong chế độ trình chiếu nên chọn mục này chưa làm thay đổi âm thanh trên màn hình.",
      "Màu con trỏ bút / laser: chọn màu bằng ô màu hoặc các nút màu nhanh (Đỏ, Xanh lam, Vàng, Xanh lá, Đen). Màu này được làm mặc định khi bắt đầu trình chiếu F5. Trong lúc chiếu, dùng Ctrl+P để bật Bút vẽ trực tiếp bằng chuột, Ctrl+L để bật Con trỏ laser chấm sáng theo chuột, E để xóa toàn bộ nét vẽ trên trang, và Ctrl+A để trở lại con trỏ mũi tên. Nhấn chuột phải trong màn chiếu để mở menu đổi màu bút tức thì.",
      "Khi kết thúc trình chiếu (Esc hoặc hết slide cuối), nếu có nét vẽ, Slide hiển thị hộp thoại 'Giữ nét vẽ? (Giữ / Bỏ)'. Chọn Giữ sẽ chuyển các nét vẽ thành hình vẽ vĩnh viễn trên trang chiếu và lưu chuẩn ra tệp PPTX. Chọn Bỏ để xóa các nét vẽ tạm thời.",
      "Trình chiếu không có thuyết minh: tùy chọn được lưu cùng bản trình chiếu. Slide hiện chưa phát thuyết minh trong chế độ trình chiếu nên chọn mục này chưa làm thay đổi âm thanh trên màn hình."
    ]
  },
  {
    id: "slides.edit.findReplace",
    app: "slides",
    commandIds: ["common.edit.find", "common.edit.replace"],
    title: "Tìm kiếm và Thay thế trong Slide",
    summary: "Hộp thoại Tìm kiếm và Thay thế dùng chung phong cách phần mềm trình chiếu khác cho Slide. Tìm kiếm xuyên suốt tất cả các trang chiếu (tiêu đề, nội dung, hình vẽ, hộp văn bản), tự động chuyển slide và chọn hộp văn bản, cùng Hoàn tác một bước (Ctrl+Z).",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Chỉnh sửa" },
    keywords: ["tìm kiếm", "thay thế", "find", "replace", "ctrl+f", "ctrl+h", "Slide", "chỉnh sửa", "tìm chữ", "trang chiếu", "hộp văn bản"],
    steps: [
      "Truy cập: Mở tab Trang đầu trên thanh ribbon, nhìn sang nhóm Chỉnh sửa ở phía cuối bên phải, bấm nút Tìm kiếm (Ctrl+F) hoặc Thay thế (Ctrl+H) để mở hộp thoại Tìm kiếm và Thay thế gồm 2 tab.",
      "Tìm kiếm xuyên suốt bài trình chiếu: Trong tab «Tìm» (Ctrl+F), nhập từ hoặc cụm từ vào ô «Tìm gì:». Bấm nút «Tìm tiếp» hoặc «Tìm trước». Slide tự động quét qua toàn bộ các trang chiếu, tự động chuyển đến slide chứa kết quả và chọn đúng hộp văn bản hoặc hình vẽ khớp nội dung.",
      "Thay thế nội dung: Trong tab «Thay thế» (Ctrl+H), nhập nội dung cần thay đổi vào ô «Thay bằng:». Bấm nút «Thay thế» để đổi từng vị trí khớp, hoặc bấm «Thay thế tất cả» để thay thế toàn bộ từ khóa trên tất cả các trang chiếu của bài trình chiếu và xem thông báo số lượng vị trí đã thay thế thành công.",
      "Tùy chọn tìm kiếm: Hỗ trợ «Khớp chữ hoa/thường», «Chỉ toàn bộ từ», và «Bỏ qua dấu» tiếng Việt. Cả từ khóa tìm kiếm và văn bản trên trang chiếu đều được chuẩn hóa Unicode NFC tự động.",
      "Đóng và Hoàn tác: Bấm Esc để đóng hộp thoại. Sau khi đóng hộp thoại, hệ thống vẫn duy trì phiên tìm kiếm cho bài trình chiếu. Mọi thao tác «Thay thế tất cả» trên toàn bài thuyết trình đều được ghi nhận thành đúng 1 bước Hoàn tác (nhấn Ctrl+Z để hoàn tác toàn bộ các thay đổi cùng lúc)."
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
      "Chọn tất cả: đánh dấu mọi hình trên trang hiện tại (hộp văn bản, hình khối, ảnh, phần mềm văn phòng khácArt, sơ đồ, đường nối). Không chọn khung tiêu đề/nội dung của bố cục.",
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
      "Hoàn tác / Làm lại (Ctrl+Z / Ctrl+Y) dùng chung ngăn lịch sử của Slide: thêm, đổi tên, xóa phần và chuyển cả nhóm đều hoàn tác được. Thu gọn/mở rộng chỉ là trạng thái xem, không vào lịch sử.",
      "Lưu các phần: nhấn Ctrl+S hoặc chọn Tệp > Lưu bản sao để lưu .pptx. Tên phần và các trang thuộc mỗi phần được giữ trong tệp. Khi mở bằng phần mềm văn phòng khác, cách hiển thị các phần có thể khác. Mở lại trong Slide để kiểm tra tên và thứ tự các nhóm trang.",
      "Lưu các phần: nhấn Ctrl+S hoặc chọn Tệp > Lưu bản sao để lưu .pptx. Tên phần và các trang thuộc mỗi phần được giữ trong tệp. Khi mở bằng phần mềm văn phòng khác, cách hiển thị các phần có thể khác. Mở lại trong Slide để kiểm tra tên và thứ tự các nhóm trang."
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
    summary: "Trang mới (Ctrl+M) chèn trang Tiêu đề + Nội dung ngay sau trang đang chọn, khung chữ để trống. Nhân đôi (Ctrl+D) tạo bản sao y hệt ngay sau trang đang mở. Kéo thumbnail ở khung trái để đổi thứ tự. Xóa trang không xóa trang cuối cùng. Bố cục mở lưới 4 mẫu: Tiêu đề, Tiêu đề + Nội dung, Hai nội dung, Trống.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trang chiếu" },
    keywords: ["trang mới", "nhân đôi", "xóa trang", "bố cục", "layout", "ctrl+m", "ctrl+d", "hai cột", "trang trống", "sắp xếp trang", "kéo thả trang"],
    steps: [
      "Tab Trang đầu, nhóm Trang chiếu: Trang mới (Ctrl+M, nút lớn), Bố cục (nút lớn), cột Nhân đôi (Ctrl+D) / Xóa trang. Nút + trên dải thumbnail trái cũng thêm trang. Bố cục còn có trên tab Thiết kế, nhóm Bố cục trang.",
      "Trang mới (Ctrl+M) được chèn NGAY SAU trang đang chọn (giống các phần mềm trình chiếu khác), bố cục Tiêu đề + Nội dung, tiêu đề và nội dung để trống để bạn gõ. Khung để trống khi lưu vẫn là khung trống trong tệp PPTX — không tự sinh chữ. Nhân đôi copy y nguyên tiêu đề, nội dung, hình, ghi chú, hiệu ứng, nền — chèn ngay sau trang hiện tại và chuyển tới bản sao.",
      "Đổi thứ tự trang: trong dải thumbnail bên trái, nhấn giữ chuột trên một trang rồi kéo thả vào vị trí mới (hoặc dùng Bộ sắp xếp trang ở tab Chế độ xem). Có thể giữ phím Ctrl cùng mũi tên lên hoặc mũi tên xuống trên dải thumbnail để di chuyển đổi chỗ trang. Ctrl+Z hoàn tác việc di chuyển.",
      "Xóa trang: không xóa được nếu chỉ còn 1 trang. Nhấn nút Xóa trang trên ribbon, phím Delete trong dải thumbnail hoặc trong Bộ sắp xếp trang để xóa trang. Nếu đang chọn hình khối hoặc chữ trên slide, phím Delete sẽ xóa hình đó — nhấp chuột ra ngoài trang hoặc xóa từ thumbnail để xóa trang chiếu.",
      "Bố cục (và lệnh Chọn bố cục, cùng hộp thoại): lưới 4 thẻ — Tiêu đề (chữ lớn giữa trang), Tiêu đề + Nội dung (mặc định), Hai nội dung (cột trái/phải độc lập), Trống (vùng soạn thảo trắng). Nhấp đúp thẻ để áp dụng ngay, hoặc chọn rồi Áp dụng cho trang này / Áp dụng tất cả. Ctrl+Z hoàn tác."
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
      "Khi đang trình chiếu F5 / Shift+F5 / Alt+F5: phím mũi tên (→ ↓ sau, ← ↑ trước), Space, Enter, Page Up/Down cũng chuyển trang (F5 / Shift+F5 còn có Home/End về trang đầu/cuối); Esc thoát.",
      "Chuyển trang không sửa nội dung. Trang đang ẩn vẫn chọn được khi soạn, nhưng bị bỏ qua lúc chiếu."
    ]
  },
  {
    id: "slides.insert.drawing",
    app: "slides",
    commandIds: ["slides.text.insert", "slides.shape.insert", "slides.image.insert"],
    title: "Chèn hộp chữ, hình khối và hình ảnh",
    summary: "Ba nút trên nhóm Đối tượng vẽ (Trang đầu) và lặp lại trên tab Chèn. Hộp văn bản chèn một khung chữ riêng để gõ ngay. Hình khối chèn chữ nhật xanh kéo-thả được. Hình ảnh mở hộp chọn tệp.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đối tượng vẽ" },
    keywords: ["hộp văn bản", "hình khối", "hình ảnh", "shape", "chèn ảnh", "chữ nhật", "đối tượng vẽ"],
    steps: [
      "Tab Trang đầu, nhóm Đối tượng vẽ: Hộp văn bản, Hình khối, Hình ảnh (ba nút lớn). Cùng lệnh còn trên tab Chèn: Hộp văn bản ở nhóm Văn bản, Hình khối ở Minh họa, Hình ảnh ở nhóm Hình ảnh.",
      "Hình khối: chèn chữ nhật xanh (~200×120 px) lên vùng soạn thảo, lệch dần nếu chèn nhiều cái. Kéo để đặt, kéo góc để đổi cỡ, Delete khi đang chọn để xóa. Ctrl+Z gỡ hình vừa chèn.",
      "Hình ảnh: hộp chọn tệp trên máy, ảnh thành đối tượng trên slide. Khi kéo tay cầm ở 4 góc của ảnh, Slide tự động giữ nguyên tỷ lệ khung hình (rộng/cao) để hình không bị méo (kéo các cạnh bên nếu muốn đổi tỷ lệ tự do).",
      "Hộp văn bản: chèn một khung chữ riêng (không viền, nền trong suốt) lên trang và đặt con trỏ vào trong để gõ ngay. Nhấn Enter để xuống dòng mới trong khung chữ, nhấn phím Tab để tăng thụt lề hoặc giữ Shift cùng Tab để giảm thụt lề; nhấn Esc để hoàn tất và thoát chế độ sửa chữ. Kéo khung để di chuyển, kéo tay cầm góc để đổi cỡ, nhấp đúp để sửa lại chữ. Chọn chữ trong khung rồi dùng nhóm Phông chữ / Đoạn văn (đậm, cỡ, màu, gạch đầu dòng, đánh số, căn lề) như chữ trong tiêu đề."
    ]
  },
  {
    id: "slides.insert.table",
    app: "slides",
    commandIds: ["slides.insert.table"],
    title: "Chèn bảng trên trang chiếu",
    summary: "Hộp thoại nhập số hàng và số cột (1–12, mặc định 3×3). Bảng là đối tượng kéo-thả trên vùng soạn thảo; mọi ô để trống như các phần mềm trình chiếu khác.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Bảng" },
    keywords: ["bảng", "table", "chèn bảng", "hàng", "cột", "cột 1"],
    steps: [
      "Mở trang đích. Tab Chèn, nhóm Bảng, nhấn nút lớn Bảng.",
      "Hộp «Chèn bảng»: Số hàng và Số cột, mỗi ô 1–12, mặc định 3 và 3. Nhấn Chèn (hoặc Enter). Esc / Hủy bỏ.",
      "Bảng hiện trên vùng soạn thảo, kéo để đặt, kéo góc để đổi cỡ. Mọi ô ban đầu trống — nhấp vào ô để gõ.",
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
      "slides.arrange.distributeHorizontal", "slides.arrange.distributeVertical", "slides.arrange.alignToSlide",
      "slides.arrange.bringToFront", "slides.arrange.bringForward", "slides.arrange.sendBackward", "slides.arrange.sendToBack"
    ],
    title: "Sắp xếp: sắp lớp, căn chỉnh, phân phối đều, nhóm và bỏ nhóm đối tượng",
    summary: "Tab Trang đầu, nhóm Đối tượng vẽ, nút thả xuống Sắp xếp gồm Đưa lên trên cùng / Đưa lên trên một lớp / Đưa xuống dưới một lớp / Đưa xuống dưới cùng, Căn trái/giữa/phải/trên/giữa dọc/dưới, Phân phối đều ngang/dọc, Căn theo trang chiếu, và Nhóm/Bỏ nhóm (Ctrl+G / Ctrl+Shift+G) — đúng Arrange của phần mềm trình chiếu khác.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đối tượng vẽ" },
    keywords: ["nhóm", "bỏ nhóm", "group", "ungroup", "ctrl+g", "ctrl+shift+g", "khối hình", "căn chỉnh", "align", "phân phối đều", "distribute", "căn theo trang chiếu", "align to slide", "sắp xếp", "arrange", "sắp lớp", "đưa lên trên", "đưa xuống dưới", "bring to front", "send to back", "bring forward", "send backward", "thứ tự lớp"],
    steps: [
      "Sắp lớp (hình nào nằm trên hình nào): chọn một hình, mở Trang đầu → Đối tượng vẽ → Sắp xếp rồi chọn Đưa lên trên cùng, Đưa lên trên một lớp, Đưa xuống dưới một lớp hoặc Đưa xuống dưới cùng. Cũng có trong menu chuột phải của hình. Thứ tự lớp được lưu vào tệp PPTX; Ctrl+Z hoàn tác.",
      "Chọn từ hai hình trở lên: giữ Shift rồi nhấp từng hình, hoặc tab Trang đầu → nhóm Chỉnh sửa → Chọn → Chọn tất cả / Chọn đối tượng.",
      "Tab Trang đầu, nhóm Đối tượng vẽ, nút thả xuống Sắp xếp: Căn trái/Căn giữa (ngang)/Căn phải canh theo trục ngang; Căn trên/Căn giữa (dọc)/Căn dưới canh theo trục dọc. Mặc định canh theo đúng khung bao quanh các đối tượng đang chọn (giống các phần mềm trình chiếu khác khi tắt Align to Slide).",
      "Phân phối đều ngang/dọc chia đều khoảng TRỐNG giữa các đối tượng (giữ nguyên hình đầu và cuối theo trục đang phân phối) — cần ít nhất 3 đối tượng để thấy hiệu quả rõ ràng.",
      "Bật Căn theo trang chiếu để mọi lệnh Căn/Phân phối tiếp theo dùng toàn bộ khung trang chiếu làm mốc thay vì khung các đối tượng đang chọn — giống các phần mềm trình chiếu khác thật.",
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
      "Từ đầu / Từ trang này: toàn màn hình cho khán giả, không hiện ghi chú. Trang sau: →, ↓, Space, Enter, Page Down hoặc N; trang trước: ←, ↑, Backspace, Page Up hoặc P; Home về trang đầu, End tới trang cuối; Esc thoát. Khi đang chiếu, các phím tắt soạn thảo tạm tắt nên không vô tình sửa bài. Trang đã Ẩn trang chiếu bị nhảy qua. Mọi trang đều ẩn thì hộp thoại báo «Tất cả trang chiếu đang bị ẩn».",
      "Chế độ Presenter: overlay trong cùng cửa sổ (không tách màn hình 2). Cột trái: trang hiện tại, nút Trang trước / Trang tiếp, bộ đếm. Cột phải: ghi chú (A+/A− đổi cỡ chữ) và xem trước trang kế. Đồng hồ «ĐÃ THUYẾT TRÌNH» và đồng hồ máy. Esc hoặc ✕ Thoát.",
      "Cấu hình lặp liên tục / màu con trỏ: tab Trình chiếu → Thiết lập → Thiết lập trình chiếu (bài riêng)."
    ]
  },
  {
    id: "slides.view.normal",
    app: "slides",
    commandIds: ["slides.view.normal"],
    title: "Dạng xem bình thường",
    summary: "Quay về soạn từng trang: dải thumbnail trái và sân khấu vùng soạn thảo giữa. Dùng sau khi đóng Bộ sắp xếp trang hoặc Chế độ đọc.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["bình thường", "normal view", "soạn trang", "thumbnail", "vùng soạn thảo"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nhấn Bình thường (nút lớn đầu nhóm).",
      "Giao diện soạn thảo: thumbnail trái để chọn trang, vùng soạn thảo giữa để sửa tiêu đề, nội dung và hình. Thanh ghi chú dưới vùng soạn thảo nếu đang bật.",
      "Bộ sắp xếp trang và Chế độ đọc cũng nằm cùng nhóm — Bình thường là cách về màn hình soạn. Esc trong Bộ sắp xếp / Chế độ đọc cũng về Bình thường.",
      "Chế độ này không đổi nội dung trang, chỉ đổi cách nhìn."
    ]
  },
  {
    id: "slides.file.printPreview",
    app: "slides",
    commandIds: ["slides.file.printPreview", "common.file.print", "common.file.exportPdf"],
    title: "Xem trước khi in",
    summary: "Ctrl+P hoặc Ctrl+F2 mở hộp thoại In. Khi có phần mềm văn phòng khác, Slide dùng bộ dựng PDF đó để khớp trang chiếu; nếu không có hoặc gặp lỗi, bộ dựng tích hợp của 3T Office tự tiếp tục.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["xem trước khi in", "print preview", "in tài liệu", "ctrl+f2", "full page slides", "in trang chiếu"],
    steps: [
      "Nhấn Ctrl+P, nhấp biểu tượng máy in trên thanh truy cập nhanh, hoặc mở tab Chế độ xem → Xem trước khi in (Ctrl+F2).",
      "Nếu máy có phần mềm văn phòng khác, tùy chọn Dùng phần mềm văn phòng có sẵn trên máy để in được chọn sẵn. Khung Bộ dựng trang in cho biết ứng dụng nào đã tạo trang xem trước; bỏ chọn để dùng bộ dựng tích hợp của 3T Office.",
      "Chọn máy in, số bản và Tất cả, Trang hiện tại, hoặc Trang từ–đến. Mỗi trang PDF ứng với một trang chiếu được bộ máy dựng PDF đưa vào bản in.",
      "Nhấn In để gửi tài liệu. Khi chọn máy in PDF, chọn thư mục và tên tệp PDF; Esc hoặc nút × đóng hộp thoại.",
      "Xuất PDF riêng: mở Tệp → Xuất PDF và chọn nơi lưu. Slide dựng tệp qua cùng đường Lưu PPTX; nếu phần mềm văn phòng khác dùng được thì ứng dụng đó tạo PDF, nếu không bộ dựng tích hợp của 3T Office tiếp tục."
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
    summary: "Bật/tắt khung ghi chú dưới vùng soạn thảo. Mỗi trang có ghi chú riêng, không lẫn sang trang khác. F5 không hiện ghi chú cho khán giả — chỉ thấy trong khung này và trong Chế độ Presenter (Alt+F5).",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Dạng xem bản trình chiếu" },
    keywords: ["ghi chú", "speaker notes", "thuyết trình", "ghi chú trang", "notes"],
    steps: [
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu, nhấn Ghi chú thuyết trình — hoặc tab Trình chiếu, nhóm Người thuyết trình, cùng nút. Khung dưới vùng soạn thảo mở rộng; nút trên khung đổi thành «▼ Thu gọn ghi chú».",
      "Gõ ghi chú cho trang đang mở. Chuyển thumbnail thì khung nạp ghi chú của trang mới, không mang chữ trang cũ. Có bộ đếm ký tự trên khung.",
      "Nhấn lại nút (hoặc «▼ Thu gọn ghi chú») để đóng, lấy chỗ vùng soạn thảo. Ghi chú vẫn được lưu theo trang, kể cả khi thu gọn.",
      "Khi chiếu F5/Shift+F5 khán giả không thấy ghi chú. Muốn đọc ghi chú lúc nói chuyện: Alt+F5 (Chế độ Presenter). Ghi chú được lưu trong tệp trình chiếu."
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
      "Mỗi mục có nút Xóa. Đã xử lý nằm nút ribbon riêng (bài duyệt nhận xét). Esc đóng panel. Huy hiệu ◰ + số trên vùng soạn thảo; Bộ sắp xếp trang hiện 💬 N.",
      "Ctrl+Z hoàn tác lần thêm/xóa. Nhận xét theo trang, không theo vùng chữ hay hình như các phần mềm trình chiếu khác."
    ]
  },
  {
    id: "slides.review.spellCheckHelp",
    app: "slides",
    commandIds: ["slides.review.spellCheck", "slides.review.toggleSpellCheck"],
    title: "Kiểm tra chính tả tiếng Việt trên trang chiếu",
    summary: "F7 (khi đang ở Slide) hoặc nút Chính tả quét tiêu đề, nội dung, cột 2 và chữ trên hình của trang hiện tại; gạch đỏ sống và menu gợi ý chuột phải; hỗ trợ nút Bật/Tắt chính tả trên ribbon.",
    ribbon: { tab: "Đánh giá", tabId: "review", group: "Hiệu đính" },
    keywords: ["chính tả", "spell check", "f7", "từ điển", "tiếng việt", "gạch sóng", "chuột phải", "gợi ý", "Ctrl+Z", "bật tắt chính tả"],
    steps: [
      "Tab Đánh giá, nhóm Hiệu đính, nút lớn Chính tả — hoặc nhấn F7 khi cửa sổ Slide đang hoạt động (F7 Doc là Soát lỗi AI; F7 Sheet/Slide là chính tả).",
      "Hộp «Chính tả» quét trang đang mở: Tiêu đề, Nội dung, Nội dung cột 2, Hình. Hiện «Không có trong từ điển», vị trí, nội dung, gợi ý. Đầy đủ các nút Bỏ qua / Bỏ qua tất cả / Thêm vào từ điển / Thay thế / Thay thế tất cả / Đóng. Nhấn Esc để đóng.",
      "Khi soạn thảo, các từ nghi ngờ sai chính tả trên tiêu đề, nội dung hoặc chữ trong hình tự động được gạch sóng đỏ (độ trễ ~400 ms) mà không làm di chuyển con trỏ đang gõ.",
      "Tùy chọn Bật/Tắt kiểm tra chính tả: Mở tab Đánh giá, nhóm Hiệu đính, nhấn nút «Kiểm tra chính tả» để bật hoặc tắt. Khi tắt, các đường gạch chân đỏ biến mất ngay lập tức; khi bật lại, hệ thống quét và gạch đỏ trở lại. Trạng thái được ghi nhớ qua các lần mở sau.",
      "Nhấp chuột phải vào từ bị gạch sóng để mở menu gợi ý từ đúng tiếng Việt; nhấp vào từ gợi ý để thay thế trực tiếp.",
      "Nhấn phím Ctrl+Z ngay sau khi chọn gợi ý để hoàn tác thay thế trong đúng một bước duy nhất.",
      "Từ điển cá nhân được lưu vào bộ nhớ dùng chung cho cả ba ứng dụng Doc, Sheet và Slide (vno-spellcheck-vi-personal)."
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
      "Video chèn hình 320×200 px tại ~100+(số hình×24); âm thanh thanh 260×40 px. Cả hai có nút điều khiển phát. Nhiều lần chèn lệch vị trí 24 px. × khi đang chọn để xóa («Xóa đối tượng này»).",
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
      "Đầu trang & Chân trang mở hộp cùng tên: tick Ngày tháng, Số trang chiếu (mặc định bật), Chân trang (mặc định bật, chữ mẫu «Tài liệu trình chiếu tiêu chuẩn 3T Office»), Áp dụng cho mọi trang chiếu (mặc định bật). Áp dụng / Hủy bỏ. Thanh dưới sân khấu: ngày | chữ chân | «Trang n / N».",
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
    id: "slides.insert.hyperlink",
    app: "slides",
    commandIds: ["slides.insert.hyperlink", "common.edit.hyperlink"],
    title: "Chèn siêu liên kết trên trang chiếu",
    summary: "Gắn liên kết URL web vào hình vẽ, khung chữ hoặc tiêu đề đang chọn trên trang chiếu Slide bằng hộp thoại dùng chung hoặc phím tắt Ctrl+K.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Liên kết" },
    keywords: ["liên kết", "hyperlink", "url", "ctrl+k", "chèn link", "web", "liên kết trang chiếu"],
    steps: [
      "Chọn hình vẽ, hộp văn bản hoặc tiêu đề muốn gắn liên kết trên trang chiếu (nếu chưa chọn đối tượng nào, Slide tự động tạo một hộp văn bản mới chứa liên kết).",
      "Vào tab Chèn, nhóm Liên kết, nhấn nút Liên kết — hoặc nhấn tổ hợp phím tắt Ctrl+K.",
      "Trong hộp thoại «Chèn liên kết» dùng chung: nhập văn bản hiển thị và địa chỉ URL hợp lệ (bắt đầu bằng https://, http:// hoặc mailto:). Nhấn nút Chèn (hoặc ấn Enter).",
      "Nhấn phím Esc hoặc nút Hủy bỏ để đóng hộp thoại mà không chèn.",
      "Nhấn Ctrl+Z để hoàn tác việc chèn liên kết trong 1 bước."
    ]
  },
  {
    id: "slides.design.themeAndSize",
    app: "slides",
    commandIds: ["slides.design.themeGallery", "slides.design.slideSize", "slides.master.apply"],
    title: "Chủ đề, mẫu chủ đạo và cỡ trang chiếu",
    summary: "Sáu chủ đề màu/phông/logo áp cả bộ. Mẫu Slide Master cùng 6 bộ, thêm ô logo chữ. Cỡ: Màn hình rộng 16:9 (33,867 × 19,05 cm, mặc định) hoặc Tiêu chuẩn 4:3 (25,4 × 19,05 cm) — đúng hai khổ chuẩn của phần mềm trình chiếu khác; hình sẵn có bị co theo.",
    ribbon: { tab: "Thiết kế", tabId: "design", group: "Chủ đề" },
    keywords: ["chủ đề", "theme", "slide master", "cỡ trang chiếu", "16:9", "4:3", "960x540", "logo"],
    steps: [
      "Tab Thiết kế, nhóm Chủ đề: nút lớn Chủ đề. Hộp «Thư viện Chủ đề» — nhấp thẻ là áp ngay cả bộ (không nút Áp dụng). Sáu mẫu: Xanh Doanh Nghiệp (Inter, mặc định modern-blue), Terracotta Ấm Áp (Times New Roman), Xanh Lá Thiên Nhiên, Than Chì Hiện Đại, Đơn Sắc Tối Giản (Arial), Cam Năng Động (Verdana). Mỗi mẫu có logo chữ kiểu «3T OFFICE • DOANH NGHIỆP». Ctrl+Z hoàn tác lần chọn chủ đề.",
      "Nhóm Mẫu chủ đạo: Mẫu Slide Master. Hộp «Mẫu Slide Master» cùng 6 bộ, thêm ô «Tên đơn vị / Logo chữ góc trang» (mặc định «3T OFFICE» hoặc logo đang dùng). Chọn thẻ điền sẵn logo của mẫu. Hủy bỏ / Áp dụng mẫu. Khác thư viện Chủ đề: lần Áp dụng mẫu không đẩy Undo.",
      "Lưu bằng Ctrl+S hoặc chọn Tệp > Lưu bản sao và chọn .pptx. Chữ trong ô «Tên đơn vị / Logo chữ góc trang» được đặt trên trang mẫu và giữ khi lưu. Mở lại tệp để kiểm tra chữ, màu và phông; logo không che các khung tiêu đề và nội dung có sẵn.",
      "Mở lại: chọn Tệp > Mở và chọn tệp .pptx đã lưu logo chữ bằng Slide. Ô «Tên đơn vị / Logo chữ góc trang» hiện lại chữ, màu và phông đã đặt. Ứng dụng chỉ nhận logo chữ do Slide lưu; nếu dữ liệu logo không hợp lệ, hộp thoại Mở báo lỗi để bạn kiểm tra tệp gốc.",
      "Nhóm Tùy chỉnh: Cỡ trang chiếu. Hộp «Kích thước trang chiếu»: Màn hình rộng 16:9 · 33,867 × 19,05 cm, hoặc Tiêu chuẩn 4:3 · 25,4 × 19,05 cm. Nhấp thẻ áp ngay; mọi hình bị co x,y,w,h theo khung mới. Cùng preset thì không đổi. Ctrl+Z hoàn tác đổi cỡ.",
      "Khi lưu PPTX, hai khổ này ghi đúng khổ chuẩn của phần mềm trình chiếu khác nên phần mềm trình chiếu khác mở ra thấy Thiết kế → Kích thước trang chiếu là «Màn hình rộng» / «Chuẩn (4:3)», không phải «Tùy chỉnh». Tệp mở từ phần mềm trình chiếu khác giữ nguyên khổ gốc khi lưu lại, trừ khi bạn tự đổi cỡ.",
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
      "Tab Chế độ xem, nhóm Dạng xem bản trình chiếu: Chế độ đọc (nút lớn, cạnh Bình thường / Bộ sắp xếp / Ghi chú). Overlay «Dạng xem Đọc (Reading View)»: ‹ › đổi trang, «Trang n / N», ✕ Đóng. Esc thoát; ← / PageUp trước; → / PageDown / Space sau. Chỉ hiện tiêu đề và nội dung chữ — không hình, media, biểu đồ, cột 2, chân trang, hiệu ứng.",
      "Nhóm Hiển thị: Thước, Đường lưới, Đường hướng dẫn (ba nút bật/tắt, mặc định tắt). Thước SVG ngang+dọc, vạch 10 px, số 0 / 100 / 200… theo pixel (không phải cm). Lưới ô 20×20 px, không bắt dính hình.",
      "Đường hướng dẫn: đúng hai đường (dọc + ngang), mặc định tâm 480×270 trên khung 960×540. Kéo tay cầm «Kéo để chỉnh đường gióng dọc/ngang»; tooltip X/Y px, kẹp trong khổ trang. Không thêm/bớt đường, không tự căn lại khi đổi 4:3.",
      "Nhóm Cửa sổ: Cửa sổ mới mở tab cùng URL. Bị chặn pop-up: «Trình duyệt đã chặn cửa sổ mới. Hãy cho phép pop-up cho 3T Office.»"
    ]
  },
  {
    id: "slides.show.rehearseTimingsHelp",
    app: "slides",
    commandIds: ["slides.show.rehearseTimings"],
    title: "Tập dượt hẹn giờ",
    summary: "Chiếu từ trang đang mở, đồng hồ «Trang: MM:SS» và «Tổng: MM:SS». Esc (hoặc hết trang) hỏi có lưu thời gian từng trang không. Thời gian lưu chỉ để tham khảo — F5 không tự chuyển trang theo mốc này.",
    ribbon: { tab: "Trình chiếu", tabId: "slideshow", group: "Thiết lập" },
    keywords: ["tập dượt", "hẹn giờ", "rehearse timings", "đồng hồ", "thời gian trang"],
    steps: [
      "Mở trang muốn bắt đầu tập. Tab Trình chiếu, nhóm Thiết lập: Tập dượt hẹn giờ (nút lớn, cạnh Thiết lập trình chiếu và Ẩn trang).",
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
      "Nhấp chọn một hình khối hoặc hình ảnh trên trang chiếu vùng soạn thảo. Xung quanh đối tượng sẽ xuất hiện 8 tay cầm co giãn, nút xóa màu đỏ ở góc trên-trái và một tay cầm xoay hình tròn nhỏ màu xanh dương ở phía trên đỉnh (nối bằng cần mảnh).",
      "Rê chuột vào tay cầm xoay tròn: con trỏ chuyển thành hình bàn tay nắm (grab). Nhấn giữ chuột và kéo xoay quanh tâm đối tượng theo chiều kim đồng hồ hoặc ngược chiều kim đồng hồ.",
      "Xoay từng bước 15° chuẩn xác: nhấn giữ phím Shift trong lúc kéo chuột để góc xoay tự động bắt dính vào các bội số 15° (15°, 30°, 45°, 60°, 90°...), tương tự như trong phần mềm trình chiếu khác. Một huy hiệu tooltip nhỏ hiển thị số độ hiện tại ngay cạnh tay cầm khi đang kéo giúp theo dõi góc xoay trực quan.",
      "Con trỏ co giãn thông minh và nút xóa trực quan: Khi hình xoay ở bất kỳ góc nào, con trỏ chuột của 8 tay cầm tự động định hướng theo góc nhìn thực tế trên màn hình (ví dụ: tay cầm ở cạnh bên luôn hiển thị con trỏ kéo ngang ew-resize), và nút xóa tròn đỏ luôn giữ tư thế thẳng đứng dễ nhận biết.",
      "Kéo tay cầm về vị trí thẳng đứng ban đầu (hoặc gần 0°), góc xoay sẽ tự động đưa về mặc định không xoay.",
      "Đặt lại góc xoay về 0° nhanh chóng: nhấp chuột phải vào hình vẽ đã xoay để mở trình đơn ngữ cảnh, chọn «Đặt lại góc xoay (0°)».",
      "Hoàn tác thao tác xoay: nhấn phím Ctrl+Z để quay về góc xoay trước đó; nhấn Ctrl+Y để làm lại."
    ]
  },
  {
    id: "slides.accessibility.keyboardNav",
    app: "slides",
    commandIds: ["common.file.backstage"],
    title: "Điều hướng bằng bàn phím và trợ năng (Slide)",
    summary: "Thao tác hoàn toàn bằng bàn phím không cần dùng chuột trên trang chiếu: duyệt qua các đối tượng (tiêu đề, khối văn bản, hình vẽ) bằng phím Tab và Shift+Tab, dịch chuyển vị trí đối tượng bằng các phím mũi tên, mở menu Tệp bằng Alt+F và đóng bằng phím Escape.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Trợ năng" },
    keywords: ["bàn phím", "phím tắt", "trợ năng", "accessibility", "keyboard", "tiêu điểm", "tab", "shift+tab", "đối tượng", "slide", "mũi tên"],
    steps: [
      "Duyệt và chọn đối tượng trên slide: Nhấn phím Tab để lần lượt chọn các đối tượng trên trang trình chiếu hiện tại (hộp tiêu đề, nội dung văn bản, hình vẽ minh họa, biểu đồ...). Nhấn Shift+Tab để chọn lùi lại đối tượng trước. Đối tượng được chọn sẽ hiển thị viền chọn rõ ràng (is-selected).",
      "Dịch chuyển đối tượng: Khi một hình khối hoặc hộp chữ đang được chọn, nhấn các phím mũi tên Lên/Xuống/Trái/Phải để dịch chuyển đối tượng từng bước chính xác trên trang vùng soạn thảo.",
      "Chuyển đổi slide: Dùng Page Up để chuyển về trang slide trước và Page Down để chuyển sang trang slide kế tiếp. Nhấn Ctrl+Home để về trang slide đầu tiên và Ctrl+End để nhảy tới trang slide cuối cùng.",
      "Mở menu Tệp (Backstage) bằng Alt+F: Mở menu Tệp toàn màn hình với tiêu điểm đặt tại nút 'Quay lại'. Dùng mũi tên Lên/Xuống duyệt các lệnh Mới, Mở, Lưu, Xuất bản, mũi tên Phải để đi vào các mẫu trình chiếu và phím Escape để đóng menu.",
      "Duyệt Ribbon và hộp thoại: Dùng Tab và các phím mũi tên để chuyển tab và truy cập các nút lệnh; trong các hộp thoại chèn đối tượng, tiêu điểm luôn được bẫy an toàn và khôi phục khi nhấn Escape."
    ]
  },
  {
    id: "slides.macro.basics",
    app: "slides",
    commandIds: ["common.macro.recordToggle", "common.macro.manager"],
    title: "Ghi và quản lý Macro trong bản trình chiếu",
    summary: "Ghi lại chuỗi thao tác định dạng và xử lý slide trong Slide để phát lại nhanh chóng. Sử dụng Ctrl+Shift+R để bật/dừng ghi và Alt+F8 để mở hộp thoại Quản lý Macro.",
    ribbon: { tab: "Chế độ xem", tabId: "view", group: "Macro" },
    keywords: ["macro", "ghi macro", "dừng ghi", "quản lý macro", "xem macro", "tự động hóa", "record macro", "alt+f8", "ctrl+shift+r"],
    steps: [
      "Bắt đầu ghi: Mở tab Chế độ xem trên Ribbon, tìm nhóm Macro ở cuối dải băng và nhấn nút «Ghi Macro» (hoặc nhấn Ctrl+Shift+R). Nút đổi trạng thái thành «Dừng ghi» kèm chấm đỏ chỉ báo đang ghi.",
      "Thao tác trên slide: Thực hiện các lệnh trình chiếu muốn ghi lại (ví dụ: tạo slide mới, đổi bố cục slide, căn chỉnh hình vẽ, định dạng khối chữ...).",
      "Dừng ghi: Bấm nút «Dừng ghi» (hoặc Ctrl+Shift+R), nhập tên gợi nhớ cho Macro trong hộp thoại Lưu Macro và nhấn OK.",
      "Phát lại và chỉnh sửa: Bấm «Xem Macro» (hoặc Alt+F8) để mở hộp thoại Quản lý Macro. Nhấn «▶ Chạy» để thực thi lại chuỗi thao tác đã ghi trên trang chiếu hiện tại, hoặc chọn «Đổi tên», «Xóa» tùy ý.",
      "Giới hạn trung thực: Macro chỉ ghi lại các thao tác lệnh có trong lệnh định dạng và chỉnh sửa của Slide (bố cục, hình khối, định dạng). Macro không ghi lại văn bản gõ tay trực tiếp vào hộp chữ tự do. Macro được lưu riêng cho Slide và phân tách độc lập với Writer và Sheet."
    ]
  },
  {
    id: "slides.help.about",
    app: "slides",
    commandIds: ["slides.help.open", "common.help.about"],
    title: "Giới thiệu 3T Office và Giấy phép bản quyền",
    summary: "Xem thông tin phiên bản, bản quyền thương hiệu 3T Technology và danh sách các phần mềm nguồn mở bên thứ ba kèm giấy phép hợp pháp.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Trợ giúp" },
    keywords: ["giới thiệu", "about", "phiên bản", "bản quyền", "3t office", "giấy phép", "nguồn mở", "third-party", "license", "slide"],
    steps: [
      "Mở tab Trợ giúp trên thanh ribbon, nhóm Trợ giúp rồi nhấn nút Giới thiệu (hoặc vào menu Tệp rồi chọn Giới thiệu).",
      "Hộp thoại Giới thiệu 3T Office xuất hiện với logo nhận diện 3T và thông tin bộ ứng dụng 3T Office (Doc, Sheet, Slide).",
      "Quan sát số hiệu phiên bản hiện hành, nhà phát triển 3T Technology và các điều khoản bản quyền sở hữu.",
      "Tra cứu danh sách phần mềm nguồn mở bên thứ ba và nhấn nút Xem toàn văn giấy phép nếu muốn đọc thông báo giấy phép đầy đủ.",
      "Nhấn nút Đóng hoặc bấm phím Esc trên bàn phím để trở lại bài thuyết trình."
    ]
  },
{
    id: "slides.gettingStarted",
    app: "slides",
    commandIds: ["common.file.new", "common.file.open", "common.file.save", "common.file.saveAs", "common.file.print", "common.file.exportPdf"],
    title: "Bắt đầu nhanh: tạo, mở, lưu, in, xuất PDF",
    summary: "Bản trình chiếu mới có một trang chiếu với chỗ gợi ý xám «Bấm để thêm tiêu đề» và «Bấm để thêm văn bản». Dùng menu Tệp hoặc phím tắt để tạo mới, mở, lưu, lưu bản sao, in và xuất PDF.",
    ribbon: { tab: "Tệp", tabId: "file", group: "Bản trình chiếu" },
    keywords: ["bắt đầu nhanh", "tạo mới", "mở tệp", "lưu", "lưu bản sao", "in", "xuất pdf", "ctrl+n", "ctrl+o", "ctrl+s", "f12", "ctrl+p", "trang chiếu trống", "slide"],
    steps: [
      "Tạo bản mới: nhấn Ctrl+N hoặc menu Tệp > Mới. Slide mở cửa sổ riêng tên Bản trình bày 2, Bản trình bày 3… với một trang chiếu trống. Chữ gợi ý xám trong khung tiêu đề và khung văn bản chỉ là hướng dẫn trên màn hình, không phải nội dung được lưu.",
      "Mở bản trình chiếu: nhấn Ctrl+O hoặc menu Tệp > Mở, chọn PPTX, PPT hoặc ODP. Nếu bản đang mở có thay đổi, chọn Lưu, Không lưu hoặc Hủy trước khi tiếp tục.",
      "Lưu (Ctrl+S): mở hộp thoại Lưu thành cho bản mới; với tệp đã mở/lưu, lệnh này giữ nguyên định dạng. Nhấn F12 để Lưu bản sao — nhập tên, chọn PPTX, PPT, ODP hoặc PDF ở Loại tệp. Khi lưu sang PPTX/PPT/ODP, tên tab và tiêu đề cửa sổ chuyển theo tệp mới; chọn PDF chỉ xuất bản sao và giữ nguyên bản trình chiếu đang mở.",
      "In (Ctrl+P): xem trước từng trang chiếu. Chọn máy in, số bản và phạm vi trang rồi nhấn In; mỗi trang chiếu chiếm một trang in. Khi có phần mềm văn phòng khác, dùng bộ dựng PDF đó; ngược lại bộ dựng tích hợp của 3T Office.",
      "Xuất PDF: menu Tệp > Xuất PDF > chọn nơi lưu. Cùng đường dựng với In."
    ]
  },
  {
    id: "slides.shortcuts",
    app: "slides",
    commandIds: [
      "common.file.new", "common.file.open", "common.file.save", "common.file.print",
      "common.edit.undo", "common.edit.redo", "common.edit.cut", "common.edit.copy",
      "common.edit.paste", "common.edit.selectAll", "common.edit.find", "common.edit.replace",
      "slides.slide.new", "slides.slide.duplicate", "slides.show.startFromBegin",
      "slides.text.bold", "slides.text.italic", "slides.text.underline",
      "slides.para.alignCenter", "slides.para.alignLeft", "slides.para.alignRight", "slides.para.justify",
      "slides.shape.group", "slides.shape.ungroup"
    ],
    title: "Phím tắt thường dùng (15 phím tắt phổ biến nhất)",
    summary: "Các phím tắt thường dùng giúp thao tác nhanh trong 3T Office: tạo tài liệu, định dạng, tìm kiếm và in. Xem từng bước bên dưới để chọn tổ hợp phím phù hợp. Có thể hoàn tác các thao tác chỉnh sửa được hỗ trợ, rồi làm lại khi cần.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Bảng nhớ tạm" },
    keywords: ["phím tắt", "shortcut", "ctrl+n", "ctrl+o", "ctrl+s", "ctrl+p", "ctrl+z", "ctrl+y", "ctrl+x", "ctrl+c", "ctrl+v", "ctrl+a", "ctrl+f", "ctrl+h", "ctrl+m", "ctrl+d", "f5", "ctrl+b", "ctrl+i", "ctrl+u", "ctrl+e", "ctrl+l", "ctrl+r", "ctrl+j", "ctrl+g", "ctrl+shift+g", "slide"],
    steps: [
      "Tạo mới: Ctrl+N  |  Mở: Ctrl+O  |  Lưu: Ctrl+S  |  In: Ctrl+P",
      "Hoàn tác: Ctrl+Z  |  Làm lại: Ctrl+Y",
      "Cắt: Ctrl+X  |  Sao chép: Ctrl+C  |  Dán: Ctrl+V  |  Chọn tất cả: Ctrl+A",
      "Tìm kiếm: Ctrl+F  |  Thay thế: Ctrl+H",
      "Trang chiếu mới: Ctrl+M  |  Nhân đôi trang: Ctrl+D  |  Trình chiếu từ đầu: F5",
      "Chữ đậm: Ctrl+B  |  Chữ nghiêng: Ctrl+I  |  Gạch chân: Ctrl+U",
      "Căn giữa: Ctrl+E  |  Căn trái: Ctrl+L  |  Căn phải: Ctrl+R  |  Căn đều: Ctrl+J",
      "Nhóm: Ctrl+G  |  Bỏ nhóm: Ctrl+Shift+G",
      "Các phím tắt khác hữu ích: Shift+F5 (Trình chiếu từ trang này), Alt+F5 (Chế độ Presenter), Ctrl+Home/End (Trang đầu/cuối), Page Up/Down (Trang trước/sau)."
    ]
  },
  {
    id: "slides.differences",
    app: "slides",
    commandIds: ["slides.transition.apply", "slides.show.presenterMode", "slides.media.insertAudio"],
    title: "Giới hạn cần biết khi trình chiếu",
    summary: "Slide hỗ trợ chuyển tiếp, chế độ thuyết trình và chèn âm thanh có sẵn. Chuyển tiếp Morph áp dụng cho các hình phù hợp giữa hai trang. Chế độ thuyết trình hoạt động cục bộ; ứng dụng chưa phát bài qua mạng và chưa thu âm thuyết minh trực tiếp.",
    ribbon: { tab: "Chuyển tiếp", tabId: "transitions", group: "Hiệu ứng chuyển trang" },
    keywords: ["khác biệt", "không có", "chưa hỗ trợ", "morph", "broadcast", "ghi âm", "thuyết minh", "laser", "online", "slide"],
    steps: [
      "Mở tab Chuyển tiếp > nhóm Hiệu ứng chuyển trang > Chuyển tiếp, chọn Morph. Hiệu ứng nối chuyển động của các hình phù hợp giữa hai trang liên tiếp; các đối tượng khác dùng hiệu ứng mờ. Nhấn F5 để kiểm tra kết quả.",
      "Trình chiếu trực tuyến / Broadcast (tab Trình chiếu > nhóm Thiết lập > Chế độ Presenter): hiện có Presenter Mode 2 màn hình cục bộ (Alt+F5) — chưa hỗ trợ phát bài thuyết trình qua mạng nội bộ cho người xem qua trình duyệt.",
      "Ghi âm thuyết minh trực tiếp (tab Chèn > nhóm Đa phương tiện > Âm thanh): hiện chỉ chèn file âm thanh từ máy tính — chưa có thu âm microphone trực tiếp trên từng trang chiếu.",
      "Các nút này vẫn hiển thị trên ribbon đúng vị trí chuẩn phần mềm trình chiếu khác. Khi bấm vào, hệ thống sẽ hiển thị thông báo tiếng Việt rõ ràng thay vì thao tác câm. Ứng dụng này là Slide, một phần của bộ 3T Office."
    ]
  },
  {
    id: "slides.mouse.operations",
    app: "slides",
    commandIds: ["slides.shape.insert"],
    title: "Thao tác chuột trên trang chiếu và danh sách",
    summary: "Thao tác chuột trực quan: kéo di chuyển hình vẽ, kéo tay cầm đổi kích thước (giữ Shift giữ tỉ lệ), nhấp đúp hình nhập chữ, quét khung chuột chọn nhiều đối tượng (Marquee), kéo thả sắp xếp thứ tự trang chiếu ở danh sách bên trái.",
    ribbon: { tab: "Trang đầu", tabId: "home", group: "Đối tượng vẽ" },
    keywords: ["chuột", "kéo đối tượng", "tay cầm kích thước", "Shift giữ tỉ lệ", "nhấp đúp sửa chữ", "khung chọn", "marquee", "sắp xếp trang", "kéo thả slide", "filmstrip"],
    steps: [
      "Nhấp chọn một đối tượng (hình vẽ, khung chữ, hình ảnh) rồi kéo chuột để di chuyển đến vị trí mong muốn trên trang chiếu. Nhấn Ctrl+Z để hoàn tác.",
      "Kéo một trong 8 tay cầm tròn/vuông ở viền đối tượng để thay đổi kích thước. Giữ phím Shift trong khi kéo tay cầm góc để giữ nguyên tỉ lệ khung hình (chiều rộng / chiều cao).",
      "Nhấp đúp chuột vào giữa hình vẽ (shape) để kích hoạt ngay con trỏ soạn thảo văn bản bên trong hình.",
      "Nhấp giữ chuột trái ở vùng trống trên trang chiếu (hoặc vùng ngoài trang) rồi kéo chéo để vẽ khung bao chọn (Marquee / Rubber-band). Mọi đối tượng nằm trong khung sẽ được chọn đồng thời.",
      "Ở danh sách trang chiếu thu nhỏ (filmstrip) bên trái, nhấp giữ chuột vào một trang rồi kéo lên hoặc kéo xuống qua các trang khác để thay đổi thứ tự trình chiếu. Nhấn Ctrl+Z để khôi phục lại thứ tự ban đầu."
    ]
  }
  {
    id: "slides.shape.format",
    app: "slides",
    commandIds: ["slides.shape.insert"],
    title: "Đổi màu, viền, kích thước và góc xoay hình",
    summary: "Mở Định dạng hình từ menu chuột phải của hình để chọn màu nền, màu và độ dày viền, chiều rộng, chiều cao và góc xoay.",
    ribbon: { tab: "Chèn", tabId: "insert", group: "Minh họa" },
    keywords: ["định dạng hình", "màu nền hình", "màu viền", "kích thước hình", "xoay hình", "shape fill", "outline", "rotation"],
    steps: [
      "Mở tab Chèn, nhóm Minh họa, nhấn Hình khối và chọn hình cần dùng.",
      "Trên trang chiếu, nhấp phải hình rồi chọn Định dạng hình… trong menu.",
      "Chọn màu nền; chọn màu viền và độ dày viền, hoặc Không viền. Nhập chiều rộng, chiều cao (px) và góc xoay (độ).",
      "Nhấn Áp dụng định dạng. Dùng Ctrl+Z để hoàn tác; nhấn Ctrl+S để lưu bản trình chiếu."
    ]
  },
];

registerHelpEntries(SLIDES_HELP_ENTRIES);

