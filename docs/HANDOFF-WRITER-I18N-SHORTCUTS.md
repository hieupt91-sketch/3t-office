# TÀI LIỆU BÀN GIAO: VN WRITER — ĐA NGÔN NGỮ (I18N VI/EN) & PHÍM TẮT CHUẨN MICROSOFT WORD

## 1. Thông tin tổng quan & Phạm vi công việc

- **Worktree thực hiện**: `E:\VNOffice-agy-i18n-writer`
- **Nhánh (Branch)**: `feature/writer-i18n-shortcuts` (tách từ `main` mới nhất — bao gồm Columns, khung i18n mới, Chèn hàng/cột)
- **Tác giả triển khai**: Antigravity (agy)
- **Người review & nghiệm thu**: Claude / Codex (trước khi merge vào `main`)
- **Tuân thủ quy định phạm vi nghiêm ngặt**:
  - Tuyệt đối KHÔNG can thiệp vào `apps/sheet/**`, `apps/slides/**`, `platform/shell/**`, `platform/ribbon/**`, `shortcut-manager.js`, hay `command-bus.js`.
  - Không ghi đè hay xóa key hiện hữu trong `platform/i18n/strings-vi.js` và `platform/i18n/strings-en.js` (do Codex đang chỉnh sửa song song cho Sheet/Slides ở worktree khác).
  - Không tự gán `addEventListener("keydown")` hay đăng ký shortcut trùng lặp ngoài `command-definitions.js`.
  - Giữ nhánh sạch sẽ, không tự ý merge vào `main`.

---

## 2. Toàn văn các hạng mục đã hoàn thành

### 2.1. Bản địa hóa Toàn diện VN Writer (i18n VI / EN)

1. **Catalog Lệnh Writer (`commands`)**:
   - Khai báo đầy đủ 54 lệnh của `WRITER_COMMANDS` vào `commands: { ... }` trong cả hai tệp:
     - `platform/i18n/strings-vi.js`: Giữ nguyên 100% nhãn tiếng Việt chuẩn hành chính ban đầu.
     - `platform/i18n/strings-en.js`: Ánh xạ chuẩn theo thuật ngữ chính thống Microsoft Word 365 (Bold, Italic, Columns, Watermark, Page Borders, Select Recipients, Finish & Merge, Print Preview, Table of Contents, Insert Footnote, v.v.).

2. **Ribbon Tab & Nhóm Writer (`writerRibbon`)**:
   - Khai báo namespace `writerRibbon: { tab: { ... }, group: { ... } }` song ngữ.
   - Thêm trường `labelKey` cho toàn bộ các tab và nhóm trong `apps/writer/writer-ribbon.js`.
   - Hàm `applyLocaleToWriterRibbon(tabs)` tự động dịch động toàn bộ tab và nhóm ribbon dựa trên locale đang chọn.
   - Sắp xếp lại các nhóm tab **Trang đầu** (`home`) theo chuẩn giao diện Microsoft Word 365:
     `Bảng nhớ tạm (Clipboard)` → `Phông chữ (Font)` → `Đoạn văn (Paragraph)` → `Kiểu dáng (Styles)` → `Chèn nhanh (Quick Insert)`.
   - Bổ sung tab **Thiết kế** (`design` / `Design`) chuyên biệt chứa nhóm "Nền & Viền trang" (`pageBackground` gồm Watermark và Page Border) theo cấu trúc chuẩn Word 365, đồng thời vẫn giữ nhóm này trên tab **Bố cục** (`layout`) nhằm duy trì tương thích ngược 100% với các test suite hiện hữu (Suite 30).

3. **Bản địa hóa 9 Hộp thoại & Thành phần Giao diện Writer (`writerDialogs`)**:
   - `writerDialogs.pageSetup`: Tiêu đề, Khổ giấy, Hướng giấy (Dọc/Ngang), các lề Trên/Dưới/Trái/Phải, nút Áp dụng, Hủy bỏ, Đóng.
   - `writerDialogs.columns`: Tiêu đề, Mẫu chia cột (Một/Hai/Ba cột), Số cột, Khoảng cách (mm), Đường kẻ phân cách, Xem trước, Bỏ chia cột.
   - `writerDialogs.watermark`: Tiêu đề, Gợi ý văn bản hành chính Việt Nam ("DỰ THẢO", "MẬT", "TUYỆT MẬT", "KHẨN", "BẢN SAO"), Góc xoay, Độ mờ, Màu sắc, Xóa hình mờ.
   - `writerDialogs.pageBorder`: Tiêu đề, Kiểu đường viền, Độ dày, Màu sắc, Xem trước, Xóa viền trang.
   - `writerDialogs.mailMerge`: Nguồn dữ liệu CSV, Dán dữ liệu mẫu, Đếm bản ghi/cột, Chèn trường, Xem trước, Thông báo hoàn tất.
   - `writerDialogs.printPreview`: Tiêu đề, In tài liệu, Trang trước/sau, Số trang, Vừa trang, Thu nhỏ/Phóng to, Đóng xem trước, Khổ giấy, Lề.
   - `writerDialogs.styleGallery`: Tiêu đề, Gợi ý nhấp áp dụng, và toàn bộ 6 presets typography (Normal, Heading 1, Heading 2, Heading 3, Quote, Emphasis).
   - `writerDialogs.comments`: Cảnh báo bôi đen văn bản, Tiêu đề thêm ghi chú, Placeholder, Nút thêm, Nhãn panel bên phải, Nhãn aria thẻ mark, Placeholder Header/Footer.
   - `writerDialogs.hyperlink`: Tiêu đề và thông điệp hộp thoại nhập URL.

### 2.2. Chuẩn hóa Phím tắt Microsoft Word 365 Chuyên biệt

Tất cả phím tắt được định nghĩa tập trung trong `platform/commands/command-definitions.js`:
- `writer.font.grow`: Đổi từ `Ctrl+]` thành `Ctrl+Shift+>` (chuẩn Word toàn cầu).
- `writer.font.shrink`: Đổi từ `Ctrl+[` thành `Ctrl+Shift+<` (chuẩn Word toàn cầu).
- `writer.comment.insert`: Bổ sung `Ctrl+Alt+M` (chuẩn Word).
- `writer.trackChanges.toggle`: Bổ sung `Ctrl+Shift+E` (chuẩn Word).
- `writer.page.break`: Duy trì `Ctrl+Enter` (chuẩn Word).
- `writer.file.printPreview`: Duy trì `Ctrl+F2` (chuẩn Word).
- `writer.reference.footnoteInsert`: Duy trì `Ctrl+Alt+F`.
- `writer.reference.endnoteInsert`: Duy trì `Ctrl+Alt+D`.
- Định dạng cơ bản: `Ctrl+B` (Đậm), `Ctrl+I` (Nghiêng), `Ctrl+U` (Gạch chân), `Ctrl+E` (Căn giữa), `Ctrl+L` (Căn trái), `Ctrl+R` (Căn phải), `Ctrl+J` (Căn đều), `Ctrl+Space` (Xóa định dạng).

**Kiểm soát xung đột tuyệt đối**:
- Không đăng ký `Ctrl+Shift+L` cho bullet list ở cấp toàn cục vì lệnh `sheet.data.filter` trong Sheet đang sử dụng phím này.
- 100% trong số 23 phím tắt Writer là duy nhất nội bộ và không đè lên bất kỳ phím tắt nào trong `COMMON_COMMANDS`.

---

## 3. Danh sách Tệp thay đổi & Bổ sung

| Tệp tin | Trạng thái | Nội dung chỉnh sửa |
| :--- | :--- | :--- |
| `platform/i18n/strings-vi.js` | Sửa đổi | Bổ sung 54 lệnh Writer vào `commands`, thêm `writerRibbon` và `writerDialogs` |
| `platform/i18n/strings-en.js` | Sửa đổi | Bổ sung 54 lệnh Writer vào `commands`, thêm `writerRibbon` và `writerDialogs` (tiếng Anh Word) |
| `platform/commands/command-definitions.js` | Sửa đổi | Cập nhật phím tắt `Ctrl+Shift+>`, `Ctrl+Shift+<`, `Ctrl+Alt+M`, `Ctrl+Shift+E`; null-safe check cho `bus` trong `applyLocaleToCommandDefinitions` |
| `apps/writer/writer-ribbon.js` | Sửa đổi | Thêm `labelKey`, reorder nhóm Home, thêm tab Design, export `applyLocaleToWriterRibbon` |
| `apps/writer/writer-app.js` | Sửa đổi | Gọi `applyLocaleToWriterRibbon` khi khởi tạo; bản địa hóa comments panel & header/footer placeholders; nhận diện linh hoạt nhóm Styles |
| `apps/writer/columns-dialog.js` | Sửa đổi | Nhập `t` và chuyển ngữ 100% nhãn giao diện, presets, mô tả và nút bấm |
| `apps/writer/page-decorations.js` | Sửa đổi | Nhập `t`, `getLocale` và chuyển ngữ hộp thoại Watermark & Page Border |
| `apps/writer/mail-merge.js` | Sửa đổi | Nhập `t` và chuyển ngữ hộp thoại Data Source (CSV) & Insert Merge Field |
| `apps/writer/style-gallery.js` | Sửa đổi | Nhập `t` và chuyển ngữ trực tiếp dropdown card gallery và ribbon strip |
| `adapters/libreoffice/writer/writer-adapter.js` | Sửa đổi | Nhập `t` và chuyển ngữ Page Setup modal, Print Preview toolbar, alerts & prompts |
| `tests/unit/writer-i18n-shortcuts.test.js` | Tạo mới | Suite 34 gồm 8 bài kiểm thử toàn diện về i18n VI/EN và phím tắt chuẩn Word |
| `tests/run-tests.js` | Sửa đổi | Đăng ký chạy Suite 34 trong runner |
| `docs/FEATURE-PARITY-ROADMAP.md` | Sửa đổi | Cập nhật trạng thái hoàn thành cho Đa ngôn ngữ Writer và Phím tắt Word |

---

## 4. Kết quả Kiểm thử & Nghiệm thu (Verification)

### 4.1. Kiểm tra Cú pháp (Syntax Check)
```bash
node scripts/check-syntax.js
```
- **Kết quả**: `44/44 files hợp lệ | 0 lỗi cú pháp`.

### 4.2. Toàn bộ Test Suite Tự động (Automated Test Suites)
```bash
node tests/run-tests.js
```
- **Kết quả**: **387/387 PASS | 0 FAIL** (Toàn bộ 34 suites đạt chuẩn 100%).
- Suite 34 (`34. Behavioral & Unit Tests — VN Writer i18n & Word Shortcuts`):
  1. `[PASS]` Writer i18n: Toàn bộ 54 WRITER_COMMANDS có bản dịch đầy đủ trong catalog VI và EN
  2. `[PASS]` Writer Shortcuts: Phím tắt chuẩn Word duy nhất, không trùng lặp nội bộ và không xung đột với COMMON_COMMANDS
  3. `[PASS]` Writer Shortcuts: Tích hợp đầy đủ phím tắt chuẩn Word (Ctrl+Shift+>, Ctrl+Shift+<, Ctrl+Alt+M, Ctrl+Shift+E, Ctrl+F2)
  4. `[PASS]` Writer i18n Switch: Khi setLocale('en'), toàn bộ Command Definitions và Ribbon Tabs cập nhật sang tiếng Anh chuẩn
  5. `[PASS]` Writer i18n Switch: Khi setLocale('vi'), toàn bộ Command Definitions và Ribbon Tabs khôi phục chính xác tiếng Việt
  6. `[PASS]` Writer Ribbon: Tab Thiết kế (Design) riêng biệt chứa Hình mờ & Viền trang, đồng thời duy trì tương thích ngược trên Bố cục
  7. `[PASS]` Writer Dialogs i18n: Khung bản dịch hộp thoại (pageSetup, columns, watermark, pageBorder, mailMerge, printPreview, styleGallery, comments, hyperlink) đầy đủ song ngữ
  8. `[PASS]` Writer i18n Lookup: Hàm t(key) trả về chính xác chuỗi đa ngôn ngữ cho ribbon và hộp thoại khi đổi locale

---

## 5. Lưu ý Hợp nhất cho Claude / Codex

1. `platform/i18n/strings-vi.js` & `strings-en.js`: Các khóa được bổ sung vào cuối tệp theo đúng cấu trúc module mở rộng; không có bất kỳ xung đột nào với công việc đang thực hiện của Codex trên Sheet/Slides.
2. Branch `feature/writer-i18n-shortcuts` đã sẵn sàng để merge vào `main` khi có chỉ định từ trưởng dự án.

