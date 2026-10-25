/**
 * 3T Office — Trợ giúp: phông chữ thay thế trên macOS (MAC-9).
 * Nội dung bám đúng hành vi đã cài đặt: phông hệ thống macOS + phông người dùng cài bằng Font Book được dùng
 * khi in/xem trước/xuất PDF; phông tài liệu mà máy không có được thay bằng phông cùng kích thước hoặc gần giống nhất.
 * VN-FONTS-1: bộ phông thay thế tự dựng của 3T Office (VN Sans UI, VN Sans, VN Mono, VN Song — SIL OFL 1.1).
 * FIX-D6-2510: hiển thị trên màn hình dùng Carlito đi kèm (platform/fonts/substitutes) + chuỗi phông có họ chung.
 */

export const MACOS_FONT_HELP_ENTRIES = [
  {
    id: "common.macos.fontSubstitution",
    app: "common",
    commandIds: [],
    title: "Phông chữ thay thế trên macOS (giữ đúng số trang)",
    summary: "Trên macOS, Doc, Sheet và Slide của 3T Office dùng phông có sẵn của macOS, phông bạn tự cài và bộ phông VN đi kèm (VN Sans UI, VN Sans, VN Mono, VN Song). Nếu tài liệu (thường tạo bằng bộ văn phòng khác) dùng phông mà máy Mac không có, 3T Office tự dùng phông thay thế cùng độ rộng chữ hoặc gần giống nhất, đủ dấu tiếng Việt, để xuống dòng và ngắt trang gần với bản gốc; tên phông gốc trong tệp vẫn được giữ nguyên khi lưu. Tra cứu mục này ở tab Trợ giúp hoặc nhấn F1.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phông chữ" },
    keywords: ["phông chữ", "phong chu", "font", "thiếu phông", "phông thay thế", "font book", "sổ phông", "số trang", "ngắt trang", "macos", "mac", "carlito", "caladea", "liberation", "cài phông", "vn sans", "vn sans ui", "vn mono", "vn song", "phông đi kèm", "chữ hán", "chữ có chân", "serif", "nét mảnh", "light", "mở lại tệp", "hiển thị phông"],
    steps: [
      "Bạn thấy gì: ô Phông chữ ở tab Trang chủ vẫn hiện tên phông gốc của tài liệu. Khi xem trước khi in, in hoặc xuất PDF, nếu máy Mac không có phông đó, 3T Office dùng phông thay thế; chữ tiếng Việt vẫn hiển thị đủ dấu. Khi lưu, tệp vẫn ghi tên phông gốc nên mở lại trên máy có phông gốc sẽ hiển thị như cũ.",
      "Phông thay thế giữ đúng số trang (cùng độ rộng chữ và chiều cao dòng, đi kèm 3T Office): Carlito thay cho phông mặc định không chân phổ biến của bộ văn phòng khác, Caladea thay cho phông có chân đi kèm với nó, Liberation Sans / Liberation Serif / Liberation Mono thay cho các phông Arial, Times New Roman, Courier New nếu máy thiếu (macOS thường đã có sẵn ba phông này).",
      "Trên màn hình (Doc và Sheet, cả khi mở lại tệp đã lưu): chữ dùng phông mặc định không chân phổ biến của bộ văn phòng khác — kể cả bản nét mảnh (Light) dùng cho tiêu đề — được vẽ bằng Carlito đi kèm 3T Office, cùng độ rộng chữ, đủ dấu tiếng Việt, không còn bị đổi thành chữ có chân. Carlito không có nét mảnh nên tiêu đề nét mảnh hiện nét thường, đậm hơn bản gốc một chút nhưng xuống dòng như cũ. Phông có chân đi kèm với nó hiện bằng phông có chân của máy (thường là Times New Roman) vì Caladea chưa đủ dấu tiếng Việt. Trong Sheet, phông mà máy không có và không có phông thay thế được vẽ bằng phông không chân của máy (phông có chân/đều nét nếu phông gốc thuộc loại đó). Máy đã cài phông gốc thì phông gốc luôn được dùng.",
      "Bộ phông VN đi kèm 3T Office (giấy phép mở SIL OFL 1.1, đủ dấu tiếng Việt, dùng được khi không có mạng): VN Sans UI thay cho phông giao diện phổ biến của bộ văn phòng khác — giữ đúng độ rộng chữ của bản phông mở được công bố làm phông thay thế cho phông đó, nên xuống dòng rất gần bản gốc; VN Mono thay cho phông chữ đều nét dùng cho mã lệnh — mỗi ký tự rộng đúng bằng ô chữ của phông gốc nên số ký tự trên một dòng giống bản gốc; VN Song thay cho phông chữ Hán kiểu Tống (Song) của bộ văn phòng khác — chữ Hán rộng 1 ô vuông, chữ Latin và tiếng Việt rộng nửa ô như phông gốc; VN Sans thay cho phông mặc định đời mới của bộ văn phòng khác — chỉ gần giống về dáng chữ, không cùng độ rộng.",
      "Mức độ giữ số trang: VN Sans UI và VN Mono giữ độ rộng chữ, VN Song giữ quy tắc ô vuông/nửa ô, nhưng chiều cao dòng và khoảng cách chữ có thể khác đôi chút nên đôi khi một dòng hoặc một trang có thể lệch; VN Sans có thể lệch nhiều hơn. Nếu cần khớp tuyệt đối, hãy cài phông gốc có giấy phép (bước dưới) — phông gốc luôn được ưu tiên trước phông VN.",
      "Phông thay thế gần giống khác (không bảo đảm cùng số trang): Lucida Sans thay bằng Lucida Grande; khi thiếu bộ phông VN, phông giao diện và phông mặc định đời mới thay bằng Helvetica Neue, phông chữ Hán thay bằng Heiti SC (hoặc Songti SC) có sẵn trong macOS, phông chữ đều nét thay bằng Liberation Mono.",
      "Bộ phông VN được dùng tự động, bạn không cần chọn hay cài thêm: ô Phông chữ vẫn hiện tên phông gốc của tài liệu, cả khi xem trên màn hình lẫn khi in hoặc xuất PDF. Tệp PDF xuất ra nhúng sẵn phông VN nên mở trên máy khác vẫn đúng dấu.",
      "Muốn hiển thị đúng phông gốc: lấy tệp phông (.ttf, .otf hoặc .ttc) từ nguồn có giấy phép hợp lệ, nhấp đúp tệp để mở ứng dụng Sổ phông (Font Book) của macOS rồi nhấn Cài đặt. Sổ phông cài cho riêng bạn vào thư mục Thư viện > Phông chữ (Library/Fonts) trong thư mục người dùng; chọn cài cho mọi người dùng nếu cần.",
      "Sau khi cài phông, thoát hẳn 3T Office (Cmd+Q) rồi mở lại tài liệu: 3T Office tự nhận phông mới và dùng phông thật thay cho phông thay thế. Không cần cấu hình thêm.",
      "Lưu ý: 3T Office không lấy phông nằm bên trong gói của ứng dụng khác vì giấy phép của các phông đó chỉ cho chính ứng dụng ấy dùng. Nếu cần phông đó, hãy cài bản có giấy phép bằng Sổ phông như bước trên."
    ]
  }
];
