# Handoff — Writer Mail Merge Excel Support & Recipient Selection

- **Task**: Hoàn thiện tính năng Trộn thư (Mail Merge) của VN Writer: hỗ trợ nguồn dữ liệu từ Excel (.xlsx, .xls) và ODS/CSV/TSV, chọn sheet, nhận diện dòng tiêu đề, lọc/bỏ chọn người nhận, xem trước, chèn trường, hoàn tất ra tài liệu mới hoặc in trực tiếp.
- **Backlog**: `writer.mailMerge.open` (Backlog Medium, docs/RIBBON-BACKLOG.md).
- **Agent/Role**: Antigravity (agy).
- **Branch / Worktree**: `feat/writer-mailmerge-xlsx-agy` tại `E:\VNOffice-agy-mailmerge`.

---

## 1. Mục tiêu và giải pháp kỹ thuật

### A. Vấn đề ban đầu
- Trộn thư của VN Writer trước đây chỉ cho phép dán hoặc nhập dữ liệu văn bản thuần CSV thô sơ.
- Người dùng văn phòng chuyển từ Microsoft Word sang VN Writer cần trộn thư trực tiếp từ danh sách Excel (.xlsx, .xls) có sẵn, cần chọn trang tính (worksheet), xem trước danh sách người nhận, bỏ chọn/lọc người nhận không gửi, và in hoặc xuất tài liệu mới.

### B. Giải pháp kỹ thuật (Không thêm thư viện ngoài, tận dụng pipeline dự án)
1. **Chuyển đổi Excel qua LibreOffice (`main.py` + `soffice`)**:
   - Tận dụng hàm `_run_soffice_convert` có sẵn trong `main.py` để chuyển đổi tệp `.xlsx`, `.xls` hoặc `.ods` sang định dạng Flat XML FODS (`OpenDocument Spreadsheet Flat XML`) trong thư mục tạm.
   - Thêm API native bridge `open_mail_merge_data_dialog` mở hộp thoại chọn tệp hệ thống hỗ trợ `*.xlsx;*.xls;*.ods;*.csv;*.tsv;*.txt`.
   - Với CSV/TSV: đọc trực tiếp qua encoding UTF-8 / CP1258 tiếng Việt.
   - Với Excel: chuyển sang FODS và đọc chuỗi XML trả về cho frontend.
2. **Bộ phân tích FODS (`parseFodsData`) trong `apps/writer/mail-merge.js`**:
   - Phân tích Flat XML trích xuất danh sách tất cả các trang tính (sheets).
   - Tôn trọng thuộc tính lặp hàng/cột (`table:number-rows-repeated`, `table:number-columns-repeated`).
   - Giữ nguyên định dạng số, tiền tệ, ngày tháng hiển thị trong Excel bằng cách đọc nội dung văn bản trong thẻ `<text:p>` (ví dụ: `1.500.000`, `30/09/2026`).
   - Hỗ trợ tùy chọn `hasHeaders` (dòng đầu tiên là tiêu đề cột).
3. **Bộ phân tích văn bản phân tách (`parseDelimitedText`)**:
   - Tự động nhận diện dấu phẩy `,`, dấu tab `\t`, hoặc chấm phẩy `;`.
   - Hỗ trợ đầy đủ dữ liệu tiếng Việt UTF-8.
4. **Hộp thoại Nguồn dữ liệu người nhận (`showMailMergeDataSourceDialog`)**:
   - Hỗ trợ chọn tệp trực tiếp từ máy (thông qua UnoBridge desktopApi hoặc fallback `<input type="file">`).
   - Dropdown chọn trang tính (Worksheet selector) khi tệp Excel có nhiều sheet.
   - Checkbox "Dòng đầu tiên là tên trường" (`hasHeaders`).
   - Ô tìm kiếm / lọc nhanh người nhận theo từ khóa.
   - Bảng xem trước danh sách người nhận kèm checkbox chọn/bỏ chọn từng dòng (`_selected`) và nút Chọn tất cả / Bỏ chọn tất cả.
   - Tùy chọn chuyển đổi sang chế độ dán văn bản trực tiếp (CSV / TSV) nếu người dùng muốn.
5. **Xem trước bản ghi trong tài liệu (`WriterAdapter`)**:
   - `_getActiveMailMergeRecords()` chỉ trả về các bản ghi được chọn (`_selected !== false`).
   - Điều hướng `nextMailMergeRecord` / `prevMailMergeRecord` tự động bỏ qua các bản ghi đã bị bỏ chọn.
6. **Hoàn tất và Trộn thư (`showFinishMailMergeDialog` & `finishMailMerge`)**:
   - Cung cấp hộp thoại lựa chọn chế độ:
     + **Tạo tài liệu mới**: Trộn các bản ghi đã chọn vào tài liệu với ngắt trang phân cách từng bản ghi.
     + **In trực tiếp**: Trộn dữ liệu và tự động kích hoạt lệnh in (`this.print()`).
   - Lựa chọn phạm vi trộn: Toàn bộ bản ghi đã chọn, bản ghi đang xem trước, hoặc từ bản ghi X đến Y.
   - Tích hợp hoàn tác nguyên tử `Ctrl+Z` để khôi phục lại mẫu trộn ban đầu.
7. **Tài liệu Trợ giúp tiếng Việt & i18n**:
   - Cập nhật mục `writer.mailMerge` trong `platform/help/entries-writer.js` với hướng dẫn chi tiết từng bước bằng tiếng Việt.
   - Cập nhật bộ chuỗi ngôn ngữ `strings-vi.js` và `strings-en.js` cho `writer.mailMerge.open` và `writer.mailMerge.finish`.
   - Cập nhật `docs/RIBBON-BACKLOG.md` chuyển trạng thái `writer.mailMerge.open` thành Hoàn thành.

---

## 2. Danh sách tệp tin thay đổi

1. `main.py`:
   - Thêm phương thức `open_mail_merge_data_dialog` vào `VnOfficeApi` và `_default_operation`.
   - Cập nhật `OPEN_FILE_TYPES["sheet"]` bổ sung `*.xls;*.tsv`.
   - Cài đặt `_open_mail_merge_data_dialog_impl`: mở native file picker, tự động convert file Excel sang FODS qua LibreOffice headless, đọc UTF-8/CP1258 cho file văn bản, trả về object `{ success, format, content, fileName, path }`.
2. `adapters/libreoffice/common/uno-bridge.js`:
   - Bổ sung wrapper `openMailMergeDataSource()` gọi tới `desktopApi.open_mail_merge_data_dialog()`.
3. `apps/writer/mail-merge.js`:
   - Bổ sung hàm `parseFodsData(xmlText, options)`.
   - Bổ sung hàm `parseDelimitedText(text, options)`.
   - Nâng cấp giao diện `showMailMergeDataSourceDialog` (chọn file Excel, chọn sheet, lọc/bỏ chọn người nhận, xem trước bảng).
   - Bổ sung hộp thoại `showFinishMailMergeDialog` (chọn tài liệu mới hoặc in, chọn phạm vi trộn).
4. `adapters/libreoffice/writer/writer-adapter.js`:
   - Quản lý cấu trúc `mailMergeData` đa trang tính và danh sách bản ghi chọn lọc.
   - Cập nhật các lệnh: `setMailMergeData`, `openMailMergeDataSourceDialog`, `toggleMailMergePreview`, `prevMailMergeRecord`, `nextMailMergeRecord`, `finishMailMerge`, `newDocument`.
5. `platform/commands/command-definitions.js`:
   - Cập nhật tooltip và nhãn lệnh cho `writer.mailMerge.open` và `writer.mailMerge.finish`.
6. `platform/i18n/strings-vi.js`:
   - Cập nhật chuỗi giao diện và tooltip tiếng Việt cho Trộn thư từ Excel / CSV.
7. `platform/i18n/strings-en.js`:
   - Cập nhật chuỗi giao diện và tooltip tiếng Anh cho Mail Merge từ Excel / CSV.
8. `platform/help/entries-writer.js`:
   - Bổ sung hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng Trộn thư từ tệp Excel.
9. `docs/RIBBON-BACKLOG.md`:
   - Cập nhật tiến độ `writer.mailMerge.open` thành Đã hoàn thành.
10. `tests/unit/writer-mail-merge.test.js`:
    - Bổ sung 7 test case mới (tổng 22/22 PASS): parse FODS nhiều sheet, bảo toàn định dạng số/ngày Excel, tùy chọn hasHeaders, parse TSV/semicolon, bỏ chọn người nhận không hiển thị trong preview, chế độ hoàn tất In / Tài liệu mới, loại trừ người nhận bị bỏ chọn khi xuất kết quả.

---

## 3. Kết quả kiểm thử tự động

- **Unit Test riêng của tính năng** (`tests/unit/writer-mail-merge.test.js`):
  + **22/22 PASS | 0 FAIL**
- **Toàn bộ bộ kiểm thử hệ thống** (`node tests/run-tests.js`):
  + **2159/2159 PASS | 0 FAIL**
  + 100% các suite kiểm thử đều đạt chuẩn chất lượng.
