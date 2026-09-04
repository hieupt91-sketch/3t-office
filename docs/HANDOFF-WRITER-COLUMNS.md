# TÀI LIỆU BÀN GIAO: VN WRITER — COLUMNS (CHIA CỘT VĂN BẢN)

## 1. Thông tin tổng quan & Phạm vi công việc

- **Worktree thực hiện**: `E:\VNOffice-agy-writer-columns`
- **Nhánh (Branch)**: `feature/writer-columns` (tách từ `main` mới nhất — đã bao gồm Style Gallery, Watermark/Page Border, Mail Merge, TOC/Footnotes, Deep Undo/Redo)
- **Tác giả triển khai**: Antigravity (agy)
- **Người review & nghiệm thu**: Claude / Codex (trước khi merge vào `main`)
- **Nguyên tắc phạm vi tuyệt đối**:
  - KHÔNG can thiệp vào `apps/sheet/**`, `apps/slides/**`, `platform/shell/app-shell.js`, `platform/commands/command-bus.js`.
  - Không đụng chạm hay gây ảnh hưởng tới worktree khác đang chạy song song.
  - Không đăng ký đè (`register()` lần 2) cho các command đã tồn tại trong Command Bus.
  - Xử lý phòng thủ `options = options || {};` ở đầu tất cả các command handler được bind (BÀI HỌC BẮT BUỘC 3: CommandBus.execute truyền `args = null`).
  - Không sử dụng thư viện bên ngoài hay SDK trả phí — 100% JavaScript thuần (Vanilla JS) và CSS native.
  - Không tự ý merge vào `main` — giữ nhánh `feature/writer-columns` sạch sẽ để Claude review.

---

## 2. Danh mục Command mới & Ánh xạ UNO

Toàn bộ 4 lệnh được khai báo chuẩn trong `platform/commands/command-definitions.js` và ánh xạ 2 chiều sang lệnh UNO của LibreOffice trong `adapters/libreoffice/common/command-dispatch-mapper.js` (`VN_TO_UNO_MAP` & `UNO_TO_VN_MAP`):

| Command ID | Nhãn tiếng Việt | Icon ID | Ánh xạ LibreOffice UNO | Vị trí trên Ribbon |
| :--- | :--- | :--- | :--- | :--- |
| `writer.page.columns` | Cột | `pageColumns` | `.uno:FormatColumns` | Tab **Bố cục** (Nhóm *Thiết lập trang* — Nút lớn) |
| `writer.page.columns1` | Một cột | `columnsOne` | `.uno:FormatColumns` | Tab **Bố cục** (Nhóm *Thiết lập trang* — Nút chọn nhanh) |
| `writer.page.columns2` | Hai cột | `columnsTwo` | `.uno:FormatColumns` | Tab **Bố cục** (Nhóm *Thiết lập trang* — Nút chọn nhanh) |
| `writer.page.columns3` | Ba cột | `columnsThree` | `.uno:FormatColumns` | Tab **Bố cục** (Nhóm *Thiết lập trang* — Nút chọn nhanh) |

*Ghi chú về thứ tự ánh xạ ngược (Reverse Mapping)*: Trong `VN_TO_UNO_MAP`, cả 4 lệnh đều ánh xạ tới `.uno:FormatColumns`. Lệnh chính `writer.page.columns` được đặt ở cuối danh sách định nghĩa để thuật toán tạo bảng tra ngược (`getVnCommand(".uno:FormatColumns")`) trả về chính xác lệnh chính `writer.page.columns`.

### Bộ 4 Icon SVG Vector Đa sắc Chuẩn Hóa
Được bổ sung trực tiếp vào `platform/ui-kit/icons.js` (viewBox 0 0 24 24), chuẩn thương mại, đa tầng màu (dual-tone `#0f4c81`, `#2563eb`, `#10b981`, `#94a3b8`):
- `pageColumns`: Biểu tượng văn bản chia đôi với đường phân cách xanh thương hiệu và dòng text mô phỏng.
- `columnsOne`: Biểu tượng văn bản một cột truyền thống.
- `columnsTwo`: Biểu tượng văn bản 2 cột cân đối.
- `columnsThree`: Biểu tượng văn bản 3 cột với màu ngọc bích hiện đại.
Tuyệt đối không dùng fallback generic circle hay ký tự thô sơ.

---

## 3. Kiến trúc & Thiết kế kỹ thuật

### 3.1. Hộp thoại Cấu hình Chia cột Trực quan (`apps/writer/columns-dialog.js`)
Hộp thoại modal được thiết kế tương đương hộp thoại **Columns** trong Microsoft Word:
1. **3 Thẻ mẫu Preset chọn nhanh**:
   - `one` (Một cột): `count: 1`, `gap: 0`, `rule: false`.
   - `two` (Hai cột): `count: 2`, `gap: 10` (mm), `rule: false`.
   - `three` (Ba cột): `count: 3`, `gap: 10` (mm), `rule: false`.
   Mỗi thẻ có icon SVG trực quan 40x40 và hiệu ứng active viền xanh `#0f4c81` nền `#eff6ff`.
2. **Tùy chỉnh số liệu linh hoạt**:
   - Trường nhập số cột (`#vno-col-count-input`): Giới hạn từ 1 đến 4 cột.
   - Trường nhập khoảng cách (`#vno-col-gap-input`): Tính bằng mm (0 – 50mm, mặc định 10mm).
   - Checkbox đường kẻ phân cách (`#vno-col-rule-input`): Bật/tắt thuộc tính `column-rule`.
3. **Khung xem trước trực quan động (Live Preview Sheet)**:
   - Thẻ `#vno-col-preview-sheet` hiển thị mô phỏng một trang giấy A4 thu nhỏ.
   - Tự động cập nhật số cột, độ rộng khoảng cách cột theo tỉ lệ thu nhỏ và vẽ đường kẻ dọc phân cách khi checkbox thay đổi real-time.
4. **Hành vi tương tác**:
   - Nút "Bỏ chia cột (1 cột)" hiển thị khi đang ở chế độ nhiều cột, cho phép reset nhanh về 1 cột.
   - Nút "Áp dụng" (`.vno-dialog-ok-btn`) và nút "Hủy bỏ" (`.vno-dialog-cancel-btn`).
   - Lắng nghe bàn phím: Phím `Escape` đóng hộp thoại không lưu, phím `Enter` áp dụng cấu hình.

### 3.2. Động cơ CSS Multi-column & Typography (`apps/writer/writer.css`)
Ứng dụng các thuộc tính CSS Multi-column tiêu chuẩn W3C:
```css
.vno-writer-body.vno-columns-active {
  column-fill: balance;
  -webkit-column-fill: balance;
}
.vno-writer-body.vno-columns-2 {
  column-count: 2;
  -webkit-column-count: 2;
}
.vno-writer-body.vno-columns-3 {
  column-count: 3;
  -webkit-column-count: 3;
}
.vno-writer-body.vno-columns-4 {
  column-count: 4;
  -webkit-column-count: 4;
}

/* Ngăn ngừa bẻ gãy khối tiêu đề, bảng, ảnh, trích dẫn, mục lục */
.vno-writer-body.vno-columns-active table,
.vno-writer-body.vno-columns-active img,
.vno-writer-body.vno-columns-active figure,
.vno-writer-body.vno-columns-active blockquote,
.vno-writer-body.vno-columns-active .vno-toc-container,
.vno-writer-body.vno-columns-active h1,
.vno-writer-body.vno-columns-active h2 {
  break-inside: avoid;
  page-break-inside: avoid;
}
```
Khi áp dụng thông qua `_applyColumns()` trong `WriterAdapter`:
- Đặt các thuộc tính trực tiếp trên `bodyDom.style.columnCount`, `bodyDom.style.columnGap = "${gap}mm"`, và `bodyDom.style.columnRule = rule ? "1px solid #cbd5e1" : "none"`.
- Thêm lớp tương ứng `.vno-columns-active` và `.vno-columns-${count}`.
- Khi reset về 1 cột (`clearColumns()` hoặc `count === 1`), toàn bộ style inline được xóa bỏ và các lớp class được gỡ sạch tuần tự.

### 3.3. Đồng bộ Trực quan trên Chế độ Xem trước In ấn (Print Preview)
Trong `WriterAdapter.openPrintPreview()` và `paginateContent()`:
- Đọc cấu hình `this.columns` hiện tại của tài liệu.
- Khi chia trang in xem trước, mỗi sheet (`.vno-print-preview-page`) chứa một thẻ `.vno-print-preview-body`.
- Tự động áp dụng `columnCount`, `columnGap`, `columnRule`, và class `.vno-columns-active` lên **MỌI** trang in xem trước, bảo đảm tài liệu 1 trang hay 10 trang đều giữ nguyên cách chia cột trung thực như khi in thực tế.

### 3.4. Cầu nối Xuất Tệp Headless LibreOffice (HTML-to-DOCX / PDF Bridge)
Trong `WriterAdapter._contentForExport()`:
- Nội dung thân bài được bao bọc trong thẻ `<div>` có các style inline:
  ```html
  <div class="vno-columns-wrapper" style="column-count:2;-webkit-column-count:2;column-gap:10mm;-webkit-column-gap:10mm;column-fill:balance;">
    <!-- Nội dung văn bản -->
  </div>
  ```
- Đồng thời bổ sung khối CSS tương thích vào `<head><style>` của tệp HTML xuất tạm:
  ```css
  .vno-columns-wrapper, .vno-writer-body {
    column-count: 2 !important;
    -webkit-column-count: 2 !important;
    column-gap: 10mm !important;
    -webkit-column-gap: 10mm !important;
  }
  ```
- **Kiểm chứng thực tế với LibreOffice**: Đã kiểm tra thực thi bộ chuyển đổi LibreOffice (`soffice.exe --headless --convert-to docx`). File `word/document.xml` sinh ra chứa thẻ OpenXML chuẩn của Microsoft Word:
  ```xml
  <w:cols w:num="2" w:space="150" w:equalWidth="true" w:sep="false"/>
  ```

### 3.5. Tích hợp Hoàn chỉnh với Hệ thống Deep Undo / Redo
- Mở rộng snapshot tài liệu trong `_createSnapshot`:
  ```javascript
  columns: this.columns ? {
    count: this.columns.count || 1,
    gap: typeof this.columns.gap === "number" ? this.columns.gap : 10,
    rule: Boolean(this.columns.rule)
  } : { count: 1, gap: 10, rule: false }
  ```
- Mở rộng so sánh snapshot trong `_isSnapshotEqual`: So sánh `count`, `gap`, `rule` để ghi nhận sự thay đổi cấu hình cột.
- Phục hồi snapshot trong `_restoreSnapshot`: Khôi phục `this.columns = snapshot.columns` và gọi lại `this._applyColumns()`.
- Ghi lại snapshot mỗi khi thay đổi cột: `this.recordSnapshot(count > 1 ? `writer.page.columns.${count}` : "writer.page.columns.reset")`.
- Đảm bảo tính đối xứng hoàn hảo: Áp dụng 2 cột -> Áp dụng 3 cột -> Undo (về 2 cột) -> Undo (về 1 cột) -> Redo (lên 2 cột).

---

## 4. Kết quả Kiểm thử Toàn diện

### 4.1. Suite 31 Unit & Behavioral Tests (`tests/unit/writer-columns.test.js`)
Đã triển khai 13 ca kiểm thử hành vi chuyên sâu:
1. Khai báo chuẩn 4 commands trong `WRITER_COMMANDS`.
2. Ánh xạ 2 chiều chuẩn xác sang lệnh UNO `.uno:FormatColumns`.
3. Khởi tạo và hiển thị đúng 4 icon SVG vector đa sắc trong `ICONS`.
4. Hiện diện đầy đủ trên Ribbon tab "Bố cục" với nút lớn và 3 nút chọn nhanh.
5. 3 Presets chuẩn trong Columns Dialog với icon minh họa.
6. Áp dụng 2 cột thiết lập đúng `column-count: 2`, `column-gap: 10mm` và class trên `bodyDom`.
7. Áp dụng 3 cột với khoảng cách 15mm và đường kẻ phân cách `column-rule`.
8. Về 1 cột gỡ bỏ triệt để CSS `column-count`, `column-gap` và class khỏi `bodyDom`.
9. Hoàn tác (Undo) và Làm lại (Redo) phục hồi chính xác số cột và định dạng CSS.
10. Multi-column xuất hiện trung thực trên **MỌI** trang in xem trước (Print Preview).
11. Command Bus và `handleDispatch` xử lý an toàn tuyệt đối khi `args` là null (BÀI HỌC BẮT BUỘC 3).
12. Xuất `_contentForExport` giữ nguyên cấu hình CSS columns và wrapper cho LibreOffice bridge.
13. Hộp thoại Columns Dialog trả về đầy đủ tham số khi tương tác và nhấn Áp dụng.

**Tổng kết Test Runner (`node tests/run-tests.js`)**:
```text
==================================================
KẾT QUẢ KIỂM THỬ: 364/364 PASS | 0 FAIL
==================================================
Toàn bộ 31 test suites đều đạt chuẩn chất lượng.
```

### 4.2. Kiểm thử Tương tác Trực tiếp trên Trình duyệt Thực tế (Live Browser CDP Verification)
Đã chạy kịch bản kiểm thử tự động trên Chrome thật thông qua Chrome DevTools Protocol (CDP) kết nối tới `http://localhost:8089/index.html?app=writer`:
- Tải ứng dụng VN Writer thành công.
- Click chuyển sang tab "Bố cục" trên Ribbon.
- Click nút chọn nhanh 2 cột -> Thân bài nhận ngay `columnCount: 2`, `columnGap: 37.7953px` (10mm).
- Click nút lớn "Cột" -> Mở hộp thoại `vno-columns-dialog` với 3 preset cards, hiển thị đúng cấu hình hiện tại và khung xem trước.
- Chọn mẫu 3 cột và nhấn "Áp dụng" -> Hộp thoại đóng lại, thân bài nhận ngay `columnCount: 3`.
- Click nút Quick Access Toolbar Undo (`common.edit.undo`) -> Revert về đúng 2 cột.
- Click Undo lần nữa -> Revert về 1 cột (layout bình thường `columnCount: auto`).
- Click Redo (`common.edit.redo`) -> Khôi phục chính xác về 2 cột.
- **Kết quả: 100% SUCCESS**.

### 4.3. Kiểm thử Chuyển đổi DOCX Thực tế với LibreOffice Core Headless
- File HTML mẫu kèm cấu hình chia cột được chuyển đổi trực tiếp bằng `soffice.exe --headless --convert-to docx`.
- Giải nén tệp `.docx` kết quả và kiểm tra `word/document.xml`: Thuộc tính `<w:cols w:num="2" w:space="150" w:equalWidth="true" w:sep="false"/>` hiện diện chính xác, bảo toàn trọn vẹn cấu trúc chia cột khi mở trong Microsoft Word hoặc LibreOffice Writer.

---

## 5. Giới hạn trung thực đã biết (Honest Limitations)

1. **Phạm vi chia cột cấp tài liệu (Document Body-Level)**:
   - Hiện tại, định dạng chia cột được áp dụng cho toàn bộ thân văn bản của tài liệu (`bodyDom`).
   - Việc ngắt phần liên tục (Section Break - Continuous) để chỉ chia cột cho một đoạn văn bản được chọn riêng biệt ở giữa trang (phần trên 1 cột, đoạn giữa 2 cột, phần dưới 1 cột) là hạng mục nâng cấp kiến trúc phức tạp thuộc lộ trình Advanced Layout Tier 3.
2. **Cân đối chiều cao cột (Column Balance)**:
   - Trình duyệt hiện đại xử lý cân đối cột bằng `column-fill: balance`. Đối với các văn bản có bảng biểu hoặc hình ảnh kích thước lớn, chiều cao các cột có thể không hoàn toàn bằng nhau tuyệt đối do quy tắc tránh bẻ gãy khối (`break-inside: avoid`).

---

## 6. Danh sách tệp đã chỉnh sửa & Tạo mới

- `platform/ui-kit/icons.js`: Bổ sung 4 SVG icons (`pageColumns`, `columnsOne`, `columnsTwo`, `columnsThree`).
- `platform/commands/command-definitions.js`: Khai báo 4 lệnh `writer.page.columns`, `writer.page.columns1/2/3`.
- `adapters/libreoffice/common/command-dispatch-mapper.js`: Ánh xạ 4 lệnh sang `.uno:FormatColumns`.
- `apps/writer/writer-ribbon.js`: Thêm nút chính và nhóm 3 nút chọn nhanh trên Ribbon tab Bố cục.
- `apps/writer/columns-dialog.js`: Tạo mới module hộp thoại cấu hình chia cột với live preview.
- `apps/writer/writer.css`: Bổ sung CSS Multi-column và giao diện modal Columns Dialog.
- `adapters/libreoffice/writer/writer-adapter.js`: Quản lý state, handlers, snapshot undo/redo, print preview và export bridge.
- `tests/unit/writer-columns.test.js`: Suite 31 gồm 13 bài test toàn diện.
- `tests/run-tests.js`: Đăng ký Suite 31.
- `docs/FEATURE-PARITY-ROADMAP.md`: Cập nhật trạng thái mục Columns từ `[ ]` sang `[x]`.
- `docs/HANDOFF-WRITER-COLUMNS.md`: Tài liệu bàn giao chi tiết này.

---

## 7. Hướng dẫn Review cho Claude

1. Kiểm tra trạng thái Git:
   ```bash
   git status
   git log -n 3
   ```
2. Chạy toàn bộ bộ kiểm thử tự động:
   ```bash
   node tests/run-tests.js
   ```
   Xác nhận: 31 suites, **364/364 PASS | 0 FAIL**.
3. Chạy kiểm thử đơn vị cho tính năng Columns:
   ```bash
   node tests/unit/writer-columns.test.js
   ```
4. Kiểm tra mã nguồn các tệp liên quan:
   - `apps/writer/columns-dialog.js`
   - `adapters/libreoffice/writer/writer-adapter.js` (tìm kiếm `columns`)
   - `apps/writer/writer-ribbon.js` (tab `layout`)
5. Sau khi review đạt yêu cầu, tiến hành merge nhánh `feature/writer-columns` vào `main`.
