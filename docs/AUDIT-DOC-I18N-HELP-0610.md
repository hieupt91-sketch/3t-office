# Báo cáo Audit i18n VI/EN và Trợ giúp trong ứng dụng (TICKET D31)

- Ngày audit: 06/10/2026.
- Nhánh công việc: `docs/doc-i18n-help-parity-agy` trên worktree `E:\VNOffice-agy-d31`.
- Mục tiêu: Chuyển toàn bộ chuỗi người dùng nhìn thấy mới thêm trong ngày (D27/D28) sang `t()` với đầy đủ bản dịch VI và EN; rà soát và siết nội dung Hướng dẫn sử dụng tiếng Việt trong ứng dụng cho toàn bộ 38 hộp thoại Writer theo `docs/AUDIT-DOC-DIALOGS-KEYBOARD-0610.md`.

---

## 1. Chuỗi mới đã chuyển sang `t()` và chuẩn hóa Catalog i18n

Tất cả các chuỗi thông báo lỗi nhập liệu, nhãn trường và tiêu đề hộp thoại được thêm cứng trong các commit D27/D28 đã được chuyển sang `t()` và bổ sung vào `platform/i18n/strings-vi.js` cùng bản dịch tiếng Anh thực tế trong `platform/i18n/strings-en.js`:

| Tệp mã nguồn | Khóa i18n | Bản tiếng Việt (VI) | Bản tiếng Anh (EN) |
|---|---|---|---|
| `platform/ui-kit/dialogs.js` | `common.promptRequired` | Vui lòng nhập nội dung trước khi tiếp tục. | Please enter text before continuing. |
| `platform/ui-kit/hyperlink-dialog.js` | `writerDialogs.hyperlink.invalidUrl` | Vui lòng nhập địa chỉ liên kết hợp lệ. | Please enter a valid link URL. |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.leftIndent` | Thụt lề trái | Left indent |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.rightIndent` | Thụt lề phải | Right indent |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.specialIndent` | Giá trị thụt dòng | Special indent value |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.beforeSpacing` | Khoảng cách trước | Spacing before |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.afterSpacing` | Khoảng cách sau | Spacing after |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.lineSpacing` | Khoảng cách dòng | Line spacing |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.fieldRequired` | Vui lòng nhập {label}. | {label} is required. |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.invalidNumber` | {label} phải là một số hợp lệ. | {label} must be a valid number. |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.rangeError` | {label} phải nằm trong khoảng từ {min} đến {max}. | {label} must be between {min} and {max}. |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.indentTotalTooLarge` | Tổng thụt lề trái và phải không được vượt quá bề rộng trang. | Total left and right indents cannot exceed page width. |
| `apps/writer/paragraph-dialog.js` | `writerDialogs.paragraph.hangingIndentTooLarge` | Thụt lề treo không được lớn hơn thụt lề trái. | Hanging indent cannot be greater than left indent. |
| `apps/writer/columns-dialog.js` | `writerDialogs.columns.countError` | Số cột phải là số nguyên từ 1 đến 4. | Number of columns must be an integer from 1 to 4. |
| `apps/writer/columns-dialog.js` | `writerDialogs.columns.gapError` | Khoảng cách cột phải là số từ 0 đến 50 mm. | Column spacing must be between 0 and 50 mm. |
| `apps/writer/writer-illustrations.js` | `writerDialogs.diagram.countError` | Vui lòng nhập số nguyên từ 3 đến 6. | Please enter an integer between 3 and 6. |
| `apps/writer/writer-illustrations.js` | `writerDialogs.chart.itemValueError` | Vui lòng nhập giá trị số hợp lệ cho mục {index}. | Please enter a valid numeric value for item {index}. |
| `apps/writer/insert-dialogs.js` | `writerDialogs.bookmark.title` | Đánh dấu | Bookmark |
| `apps/writer/insert-dialogs.js` | `writerDialogs.bookmark.nameLabel` | Tên đánh dấu | Bookmark name |
| `apps/writer/insert-dialogs.js` | `writerDialogs.bookmark.nameRequired` | Vui lòng nhập tên đánh dấu. | Bookmark name is required. |

Các tệp `apps/writer/mail-merge.js` và `apps/writer/page-decorations.js` cũng đã được rà soát và xác nhận đồng bộ hoàn chỉnh các khóa `writerDialogs.watermark.textRequired` và `writerDialogs.mailMerge.if*` ở cả hai danh mục ngôn ngữ.

---

## 2. Rà soát và siết nội dung Hướng dẫn trong ứng dụng (`entries-writer.js`)

Đã kiểm tra độ phủ Trợ giúp đối với 38 hộp thoại từ báo cáo audit ngày 06/10 (`docs/AUDIT-DOC-DIALOGS-KEYBOARD-0610.md`). Kết quả: 38/38 lệnh mở hộp thoại đều có bài Trợ giúp tương ứng.

Các bài Hướng dẫn trọng điểm liên quan đến các hộp thoại vừa được siết validation và điều hướng bàn phím đã được cập nhật nội dung tiếng Việt cụ thể, khớp với UI hiện hành:

1. **`writer.format.paragraphHomeHelp` (Hộp thoại Đoạn văn từ tab Trang đầu & Bố cục)**:
   - Mở rộng thành 6 bước cụ thể: đặt con trỏ, mở tab Trang đầu/Bố cục, bấm nút mở rộng nhóm Đoạn văn (launcher) hoặc chuột phải chọn Đoạn văn.
   - Hướng dẫn cả 2 tab của hộp thoại: Tab "Thụt lề và khoảng cách" và Tab "Dòng và ngắt trang" (kiểm soát ngắt trang trước, giữ với đoạn kế tiếp, dòng mồ côi).
   - Mô tả chi tiết các thông báo lỗi tiếng Việt hiển thị khi nhập giá trị ngoài giới hạn cho phép (-100 đến 100 mm cho thụt lề, 0 đến 500 pt cho khoảng cách, hoặc tổng thụt lề vượt quá bề rộng trang).

2. **`writer.insert.equationBookmark` (Đánh dấu và tham chiếu chéo)**:
   - Nêu rõ vị trí trên ribbon: Tab Chèn > nhóm Liên kết > nút Đánh dấu.
   - Bổ sung thông tin kiểm tra tên đánh dấu: cảnh báo lỗi "Vui lòng nhập tên đánh dấu." khi để trống và giữ hộp thoại mở.
   - Hướng dẫn quy tắc chuẩn hóa tên đánh dấu và các bước chèn Tham chiếu chéo tới Tiêu đề / Đánh dấu đã tạo.

3. **`writer.style.galleryAndNormal` (Thư viện Kiểu dáng)**:
   - Cập nhật đủ 7 kiểu dáng định dạng sẵn (bổ sung kiểu Tiêu đề - Title 18 pt bên cạnh Normal, Tiêu đề 1-3, Trích dẫn, Nhấn mạnh).
   - Mô tả điều hướng bằng bàn phím: phím Tab xoay vòng qua các thẻ kiểu dáng (giữ Shift để đi lùi), các phím mũi tên duyệt chọn, Enter áp dụng và Esc đóng.

4. **`writer.insert.illustrationsExtra` (Chèn hình khối, sơ đồ và biểu đồ)**:
   - Thêm mô tả thông báo lỗi tiếng Việt cho hộp thoại Sơ đồ khi số bước ngoài khoảng 3 đến 6 ("Vui lòng nhập số nguyên từ 3 đến 6.").
   - Thêm mô tả thông báo lỗi tiếng Việt cho hộp thoại Biểu đồ khi giá trị không phải là số hợp lệ.

5. **`writer.page.columnsHelp` (Chia cột văn bản)**:
   - Bổ sung chi tiết lỗi kiểm tra số cột (1–4) và khoảng cách cột (0–50 mm) vào bước hướng dẫn hộp thoại Chia cột.

6. **`writer.page.watermarkBorder` & `writer.page.watermarkBorderLayout` (Hình mờ và viền trang)**:
   - Thêm hướng dẫn rõ ràng về trường nội dung bắt buộc: nếu để trống ô chữ và bấm Áp dụng, hệ thống báo lỗi "Vui lòng nhập nội dung hình mờ; để xóa, hãy dùng nút Xóa hình mờ." và giữ tiêu điểm tại ô nhập.

7. **`writer.insert.hyperlink` (Chèn siêu liên kết)**:
   - Bổ sung mô tả thông báo lỗi khi để trống địa chỉ liên kết ("Vui lòng nhập địa chỉ liên kết hợp lệ.").

8. **`writer.mailMerge.ifRule.docx` (Quy tắc Nếu...Thì...Ngược lại)**:
   - Chi tiết hóa từng trường nhập trong hộp thoại (Trường dữ liệu, Toán tử so sánh, Giá trị so sánh, nội dung Thì, nội dung Ngược lại).
   - Hướng dẫn điều hướng bằng Tab/Enter/Esc và cảnh báo lỗi "Vui lòng chọn trường dữ liệu." khi chưa chọn trường.

9. **Tuân thủ quy định tên sản phẩm độc quyền**:
   - Thay thế từ khóa `"excel"` trong bài `writer.mailMerge` thành `"bảng tính"` để đảm bảo tuyệt đối không chứa tên sản phẩm độc quyền của bên thứ ba trong toàn bộ nội dung Trợ giúp.

---

## 3. Kết quả kiểm thử và xác minh

- **Tổng thể test suite**: Chạy `node tests/run-tests.js` đạt **2832/2832 PASS, 0 FAIL** (100% xanh, không hồi quy).
- **Kiểm thử Trợ giúp (`help-coverage.test.js`)**: 12/12 PASS (phủ 100% lệnh, chuẩn cấu trúc, không placeholder, không vi phạm tên bị cấm).
- **Kiểm thử chuỗi hiển thị (`ui-user-visible-strings.test.js`)**: 15/15 PASS (quét sạch mọi token cấm trong Help và i18n catalogs).
- **Kiểm thử i18n (`i18n.test.js` & `i18n-hardcoded-english.test.js`)**: 6/6 PASS, 0 finding chuỗi cứng tiếng Anh trong các app và platform.
- **Kiểm thử phím tắt trong Trợ giúp (`help-shortcut-consistency.test.js`)**: 3/3 PASS (mọi phím tắt nêu trong Trợ giúp đều khớp định nghĩa lệnh thật).
