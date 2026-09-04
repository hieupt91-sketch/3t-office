# TÀI LIỆU BÀN GIAO: VN WRITER — TÍNH NĂNG TRỘN THƯ (MAIL MERGE TỪ NGUỒN CSV)

## 1. Thông tin tổng quan & Phạm vi công việc

- **Worktree thực hiện**: `E:\VNOffice-agy-mail-merge`
- **Nhánh (Branch)**: `feature/writer-mail-merge` (tách từ `main` mới nhất đã bao gồm TOC, Footnotes/Endnotes và Deep Undo/Redo)
- **Tác giả triển khai**: Antigravity (agy)
- **Người review & nghiệm thu**: Claude (trước khi merge vào `main`)
- **Nguyên tắc phạm vi tuyệt đối**:
  - KHÔNG can thiệp vào `apps/sheet/**`, `apps/slides/**`, `platform/shell/**`, `platform/ai/**`.
  - Không vi phạm hoặc đụng độ với worktree song song của Codex (`E:\VNOffice-codex-named-ranges`).
  - Không đăng ký đè (`register()` lần 2) cho các command đã tồn tại.
  - Không sử dụng thư viện bên ngoài hay SDK trả phí — 100% JavaScript thuần (Vanilla JS) và DOM chuẩn.

---

## 2. Danh mục Command mới & Ánh xạ UNO

Toàn bộ 6 lệnh được khai báo chuẩn trong `platform/commands/command-definitions.js` (danh mục `mailmerge`) và ánh xạ sang UNO trong `adapters/libreoffice/common/command-dispatch-mapper.js` (`VN_TO_UNO_MAP`):

| Command ID | Nhãn tiếng Việt | Icon ID | Ánh xạ LibreOffice UNO | Vị trí trên Ribbon |
| :--- | :--- | :--- | :--- | :--- |
| `writer.mailMerge.open` | Nguồn dữ liệu | `mailMerge` | `.uno:MailMergeWizard` | Tab **Trộn thư** (Nhóm *Bắt đầu trộn*) |
| `writer.mailMerge.insertField` | Chèn trường | `mergeInsertField` | `.uno:InsertField` | Tab **Trộn thư** (Nhóm *Viết & Chèn trường*) |
| `writer.mailMerge.preview` | Xem trước kết quả | `mergePreview` | `.uno:MailMergePreview` | Tab **Trộn thư** (Nhóm *Xem trước kết quả*) |
| `writer.mailMerge.prevRecord` | Bản ghi trước | `mergePrev` | `.uno:MailMergePrev` | Tab **Trộn thư** (Nhóm *Xem trước kết quả*) |
| `writer.mailMerge.nextRecord` | Bản ghi sau | `mergeNext` | `.uno:MailMergeNext` | Tab **Trộn thư** (Nhóm *Xem trước kết quả*) |
| `writer.mailMerge.finish` | Hoàn tất & Tạo tài liệu | `mergeFinish` | `.uno:MailMergeFinish` | Tab **Trộn thư** (Nhóm *Hoàn tất*) |

Tất cả 6 icon SVG được thiết kế vector sắc nét (viewBox 0 0 24 24), chuẩn nhận diện Office, đa tầng màu (dual-tone `#0f4c81` và `#2563eb`), được thêm vào `platform/ui-kit/icons.js`. Không dùng icon fallback hay hình tròn generic.

---

## 3. Kiến trúc & Thiết kế kỹ thuật

### 3.1. Module phân tích CSV & Hộp thoại giao diện (`apps/writer/mail-merge.js`)
1. **Bộ phân tích CSV thuần (`parseCsv`)**:
   - Tự viết 100% bằng JavaScript, không có bất kỳ dependency bên ngoài nào.
   - Xử lý hoàn hảo các trường hợp phức tạp theo chuẩn RFC 4180:
     - Dấu phẩy nằm bên trong chuỗi dấu ngoặc kép (ví dụ: `"Sở Kế hoạch, Đầu tư"`).
     - Dấu ngoặc kép kép thoát (`""`).
     - Tương thích định dạng kết thúc dòng cả CRLF (`\r\n`) và LF (`\n`).
     - Tự động cắt tỉa khoảng trắng (whitespace trim) và bỏ qua các dòng trắng rỗng.
     - Dòng đầu tiên được trích xuất làm danh sách tên cột (`fields`), các dòng kế tiếp tạo thành mảng các bản ghi (`records: Record<string, string>[]`).
2. **Hộp thoại Cấu hình Nguồn dữ liệu (`showMailMergeDataSourceDialog`)**:
   - Cung cấp ô nhập liệu đa dòng (textarea) để người dùng dán dữ liệu CSV từ clipboard (hoặc từ Excel/Calc sao chép dạng CSV).
   - Nút **"📋 Dán dữ liệu mẫu"** điền nhanh 4 cột thực tế (`HoTen,ChucVu,DonVi,NgayKy`) với 3 bản ghi cán bộ mẫu.
   - Huy hiệu trạng thái động (`.vno-merge-status-badge`) cập nhật trực tiếp theo thời gian thực (realtime validation): báo đỏ nếu thiếu tiêu đề, báo xanh hiển thị rõ số lượng cột tìm thấy và số lượng bản ghi.
3. **Hộp thoại Chèn trường trộn (`showInsertMergeFieldDialog`)**:
   - Liệt kê các trường có sẵn trong nguồn dữ liệu CSV qua dropdown selector.
   - Chèn thẻ đánh dấu trường trộn thư tại vị trí con trỏ văn bản hiện tại.

### 3.2. Cấu trúc DOM & Marker trường trộn thư
- **Thẻ đánh dấu (Merge Field Marker)**:
  ```html
  <span class="vno-merge-field" data-field="HoTen" contenteditable="false">«HoTen»</span>
  ```
- **Định kiểu CSS (`apps/writer/writer.css`)**:
  - `.vno-merge-field`: màu tím-xanh thương mại `#4f46e5`, nền tím nhạt `#eef2ff`, viền chấm `#c7d2fe`, `user-select: none`, `contenteditable: false` để bảo vệ trường không bị người dùng vô tình gõ đè làm biến dạng thẻ.
  - `.vno-merge-field.vno-merge-preview`: khi bật xem trước, chuyển sang nền vàng nhạt `#fef3c7`, viền nét đứt màu hổ phách `#f59e0b`, chữ màu `#92400e`.

### 3.3. Tầng Adapter & Xử lý Trạng thái (`WriterAdapter`)
1. **Khởi tạo & Quản lý State**:
   - `this.mailMergeData`: `{ rawCsv: "", fields: [], records: [] }`.
   - `this.mailMergePreview`: `{ active: false, recordIndex: 0 }`.
2. **Đồng bộ trạng thái nút lệnh (`_updateMailMergeCommandStates`)**:
   - Khi chưa có dữ liệu CSV: các nút Preview, Prev, Next, Finish tự động vô hiệu hóa (`enabled: false`).
   - Khi đã có dữ liệu:
     - Nút Preview và Finish được kích hoạt.
     - Nút `prevRecord` bị vô hiệu hóa khi đang ở bản ghi đầu tiên (`recordIndex === 0`).
     - Nút `nextRecord` bị vô hiệu hóa khi đang ở bản ghi cuối cùng (`recordIndex === records.length - 1`).
     - Cập nhật nhãn nút Xem trước hiển thị rõ chỉ số bản ghi hiện hành (ví dụ: `Xem trước (1/3)`).
3. **Xem trước bản ghi (`toggleMailMergePreview`, `prevMailMergeRecord`, `nextMailMergeRecord`)**:
   - Khi bật Preview: duyệt toàn bộ thẻ `.vno-merge-field` trong `bodyDom`, hiển thị giá trị thật của bản ghi hiện tại và gắn class `vno-merge-preview`.
   - Điều hướng Prev/Next: cập nhật trực tiếp nội dung `textContent` của các thẻ trường theo bản ghi được chọn mà không phá hủy cấu trúc DOM hay thẻ marker.
   - Khi tắt Preview: khôi phục `textContent` về dạng `«FieldName»` ban đầu.
4. **Hoàn tất trộn thư (`finishMailMerge`)**:
   - Kiểm tra an toàn: báo thông báo nếu chưa nạp nguồn dữ liệu hoặc tài liệu không chứa thẻ trường trộn nào.
   - Nhân bản tài liệu: tạo ra $N$ bản sao văn bản tương ứng với $N$ bản ghi.
   - Thay thế trường dữ liệu thật trên từng bản sao:
     ```javascript
     const copies = records.map((record) => replaceMergeFields(templateHtml, record));
     ```
   - Nối các bản sao bằng khối ngắt trang vật lý:
     ```html
     <div style="page-break-before:always; border-top:2px dashed #94a3b8; margin:24px 0; text-align:center; color:#94a3b8; font-size:11px; user-select:none;">--- Phân tách trang (Page Break) ---</div>
     ```
   - Cập nhật vào `bodyDom.innerHTML`, đánh dấu `isDirty = true`.
   - Lưu vết lịch sử `recordSnapshot("writer.mailMerge.finish")`.
   - Hiển thị hộp thoại `showAlertDialog` thông báo hoàn tất thành công.

### 3.4. Tích hợp Deep Undo/Redo
- Cả hai thao tác `insertMergeField` và `finishMailMerge` đều kích hoạt `recordSnapshot()`.
- **Hoàn tác Hoàn tất trộn (Ctrl+Z)**: Đưa toàn bộ tài liệu từ trạng thái $N$ trang bản ghi đã trộn quay trở lại trạng thái tài liệu mẫu ban đầu còn nguyên các thẻ marker `«FieldName»`.
- **Làm lại (Ctrl+Y)**: Phục hồi lại toàn bộ $N$ bản ghi đã trộn chuẩn xác.
- **Hoàn tác chèn trường (Ctrl+Z)**: Làm biến mất thẻ merge field tại vị trí con trỏ; Redo khôi phục lại thẻ.

### 3.5. Xuất tệp DOCX / PDF
- Phương thức `_stripSessionMarkup(html)` được cập nhật:
  - Loại bỏ class phiên làm việc `vno-merge-preview` để đảm bảo định dạng xuất ra sạch sẽ.
  - Nếu tài liệu đang ở chế độ xem trước một bản ghi cụ thể, nội dung xuất PDF/DOCX chứa đúng dữ liệu đã trộn của bản ghi đó.
  - Nếu ở chế độ soạn thảo mẫu chưa bật xem trước, giữ nguyên nhãn `«FieldName»`.
  - Sau khi Hoàn tất trộn, tệp xuất DOCX/PDF chứa trọn vẹn toàn bộ các bản sao được phân trang ngắt trang chuẩn xác qua LibreOffice.

---

## 4. Các lỗi & bài học quan trọng đã phòng tránh

1. **Lỗi tham số mặc định khi CommandBus dispatch (Lesson #3)**:
   - Khi Ribbon click, `globalCommandBus.execute(commandId)` truyền tham số `args` là `null`.
   - Trong JavaScript, cú pháp tham số mặc định ES6 `function (options = {})` **chỉ áp dụng khi giá trị truyền vào là `undefined`**, hoàn toàn KHÔNG áp dụng khi giá trị là `null`. Việc truy cập `options.csv` sẽ gây ra ngoại lệ `TypeError: Cannot read properties of null`.
   - **Giải pháp**: Tất cả các phương thức handler trong `WriterAdapter` đều được phòng vệ ngay dòng đầu tiên bằng: `options = options || {};`.
2. **Phương thức cập nhật trạng thái CommandBus**:
   - `CommandBus` sử dụng phương thức `updateState(commandId, newState)`, không có `setCommandState`.
   - Gọi an toàn có bảo vệ: `if (typeof globalCommandBus?.updateState === "function")`.
3. **Tránh trùng lặp thuộc tính trong FakeElement (Mock Test)**:
   - Trong môi trường kiểm thử Node.js, `FakeElement.outerHTML` đã được tinh chỉnh để không lặp lại thuộc tính `style` và `class` hai lần khi kết xuất HTML.
4. **Selector Ribbon Tab**:
   - Nút tab Ribbon trong `ribbon-host.js` sử dụng class `.vno-ribbon-tab` (không phải `.vno-ribbon-tab-btn`). Script kiểm thử trình duyệt thực tế đã được chuẩn hóa theo đúng cấu trúc của platform.

---

## 5. Báo cáo Kết quả Kiểm thử

### 5.1. Kiểm tra Cú pháp (Syntax Check)
```bash
node scripts/check-syntax.js
```
- **Kết quả**: **40/40 files hợp lệ | 0 lỗi cú pháp**.

### 5.2. Bộ kiểm thử tự động toàn Suite (Automated Test Suite)
```bash
node tests/run-tests.js
```
- **Tổng số Suite**: **26 suites**
- **Tổng số bài kiểm tra**: **293/293 PASS | 0 FAIL**
- **Chi tiết Suite 26 (`tests/unit/writer-mail-merge.test.js`) — 14 bài kiểm tra**:
  1. `[PASS] Writer Mail Merge: 6 command mới được khai báo chuẩn trong WRITER_COMMANDS`
  2. `[PASS] Writer Mail Merge: Ánh xạ đúng chuẩn UNO trong command-dispatch-mapper.js`
  3. `[PASS] Writer Mail Merge: 6 icon SVG vector chuẩn sắc nét hiện diện trong ICONS, không dùng fallback hay generic circle`
  4. `[PASS] Writer Mail Merge: Tab 'Trộn thư' (mailings) hiện diện trong WRITER_RIBBON_TABS với đầy đủ 4 nhóm chức năng`
  5. `[PASS] Writer Mail Merge CSV Parser: Phân tích chuẩn xác tiêu đề cột, nhiều dòng dữ liệu, chuỗi chứa dấu phẩy trong ngoặc kép và dấu ngoặc kép thoát`
  6. `[PASS] Writer Mail Merge: Dán CSV 3 dòng dữ liệu, chèn field, assert field marker đúng định dạng trong DOM («FieldName»)`
  7. `[PASS] Writer Mail Merge: Xem trước dòng 2 hiển thị đúng dữ liệu dòng 2 (không phải dòng 1) và khôi phục khi tắt xem trước`
  8. `[PASS] Writer Mail Merge: Điều hướng bản ghi trước / sau cập nhật chính xác dữ liệu hiển thị`
  9. `[PASS] Writer Mail Merge: Hoàn tất trộn sinh ra đúng 3 bản sao nội dung thật với ngắt trang page-break-before giữa các bản`
  10. `[PASS] Writer Mail Merge: Hoàn tác sau khi trộn đưa tài liệu quay về trạng thái có field marker và làm lại khôi phục bản trộn`
  11. `[PASS] Writer Mail Merge: Hoàn tác làm biến mất thẻ merge field, làm lại khôi phục thẻ trọn vẹn`
  12. `[PASS] Writer Mail Merge: Export DOCX/PDF ở chế độ xem trước xuất đúng nội dung đã trộn của dòng đó; khi chưa trộn giữ nguyên field marker`
  13. `[PASS] Writer Mail Merge: Command Bus & handleDispatch tích hợp đầy đủ và xử lý an toàn khi args là null`
  14. `[PASS] Writer Mail Merge: Báo lỗi an toàn và từ chối trộn khi chưa có dữ liệu hoặc tài liệu không có merge field`

### 5.3. Kiểm thử Trình duyệt Thực tế (Real Browser E2E Test qua Edge CDP)
- **Phương thức**: Khởi chạy static server thật (`http://localhost:8089`), kết nối Microsoft Edge qua Chrome DevTools Protocol (CDP), tương tác trực tiếp bằng sự kiện chuột và phím trên giao diện người dùng thật.
- **Tiến trình thực hiện 13 bước**:
  1. Khởi động static server tại cổng 8089.
  2. Khởi động Microsoft Edge headless với cổng debug 9222.
  3. Kết nối WebSocket CDP phiên duyệt.
  4. Điều hướng tới `http://localhost:8089/index.html`, chờ VN Writer mount hoàn tất trên DOM.
  5. Click chuyển tab **"Trộn thư"** trên thanh Ribbon.
  6. Click nút **"Nguồn dữ liệu"** (`writer.mailMerge.open`), hiển thị hộp thoại modal CSV.
  7. Click **"📋 Dán dữ liệu mẫu"** và **"Lưu nguồn dữ liệu"**.
  8. Click **"Chèn trường"** (`writer.mailMerge.insertField`), chọn trường `HoTen`, chèn thẻ marker `«HoTen»` vào DOM.
  9. Click **"Xem trước kết quả"** (`writer.mailMerge.preview`), kiểm tra giá trị hiển thị thực tế: `'Nguyễn Văn A'`.
  10. Click **"Bản ghi sau"** (`writer.mailMerge.nextRecord`), kiểm tra giá trị chuyển đổi chính xác sang `'Trần Thị B'`. Tắt xem trước.
  11. Click **"Hoàn tất & Tạo tài liệu"** (`writer.mailMerge.finish`), kiểm tra DOM sinh đủ 3 bản ghi với 2 ngắt trang `page-break-before:always`.
  12. Kích hoạt Undo (`common.edit.undo`), xác nhận tài liệu mẫu cùng thẻ marker `«HoTen»` được khôi phục nguyên vẹn.
  13. Chụp ảnh màn hình bằng chứng lưu trữ tại: `scratch/writer-mail-merge-verified.png`.
- **Kết quả E2E**: **100% THÀNH CÔNG**.

---

## 6. Giới hạn trung thực đã biết (Known Limitations)

1. **Tài liệu đầu ra sau khi trộn**:
   - Hiện tại, lệnh Hoàn tất trộn thư xuất ra một tài liệu hợp nhất duy nhất trong trình soạn thảo VN Writer. Các bản ghi được phân cách bằng ngắt trang vật lý chuẩn in ấn (`page-break-before: always`). Người dùng có thể in ấn hàng loạt hoặc xuất thành một file PDF/DOCX duy nhất chứa toàn bộ các bức thư/quyết định.
   - Việc tự động tách và xuất thành $N$ file `.docx` riêng lẻ độc lập (ví dụ `thu_1.docx`, `thu_2.docx`) lưu trực tiếp xuống ổ đĩa cục bộ là tính năng mở rộng dự kiến trong phiên bản tiếp theo.
2. **Nguồn dữ liệu hiện tại**:
   - Hỗ trợ nhập trực tiếp dữ liệu dạng bảng tính CSV qua hộp thoại dán (hỗ trợ đầy đủ dấu phẩy, dấu ngoặc kép, xuống dòng). Chưa tích hợp mở trực tiếp file SQLite/MDB bên ngoài.

---

## 7. Danh sách tệp tin đã tạo & chỉnh sửa

- `apps/writer/mail-merge.js` *(Mới)*: Parser CSV thuần JS, thay thế trường, 2 hộp thoại Nguồn dữ liệu & Chèn trường.
- `apps/writer/writer-ribbon.js`: Thêm tab Ribbon `mailings` ("Trộn thư") với 4 nhóm chức năng.
- `apps/writer/writer.css`: Bổ sung styles cho `.vno-merge-field` và `.vno-merge-field.vno-merge-preview`.
- `platform/ui-kit/icons.js`: Bổ sung 6 icon SVG vector sắc nét (`mailMerge`, `mergeInsertField`, `mergePreview`, `mergePrev`, `mergeNext`, `mergeFinish`).
- `platform/commands/command-definitions.js`: Khai báo 6 commands thuộc category `mailmerge`.
- `adapters/libreoffice/common/command-dispatch-mapper.js`: Ánh xạ 6 commands sang `.uno:MailMerge*`.
- `adapters/libreoffice/writer/writer-adapter.js`: Tích hợp toàn bộ logic Mail Merge, Command handlers, Deep Undo/Redo, làm sạch export.
- `tests/unit/writer-mail-merge.test.js` *(Mới)*: Suite 26 với 14 bài unit & behavioral tests.
- `tests/run-tests.js`: Đăng ký Suite 26 vào runner.
- `docs/FEATURE-PARITY-ROADMAP.md`: Đánh dấu `[x]` cho Mail Merge trong VN Writer Tier 2 kèm ghi chú giới hạn.
- `docs/HANDOFF-WRITER-MAIL-MERGE.md` *(Mới)*: Tài liệu bàn giao chi tiết.
