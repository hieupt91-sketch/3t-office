# Bàn giao: VN Office — Đóng khoảng trống Endnote & Footnote trong Backstage Print Live Preview (Writer)

## 1. Bối cảnh và Yêu cầu

Trong đợt hoàn thiện tính năng **Backstage Print Live Preview Thumbnail** (`docs/HANDOFF-BACKSTAGE-PRINT-THUMBNAIL.md`), AppShell đã triển khai phương thức `_getPrintPreviewProvider()` cho cả 3 ứng dụng Writer, Sheet và Slides nhằm dựng trước trang in đầu tiên trong màn hình Tệp (Backstage) > In.

Trong ứng dụng VN Writer, provider tái sử dụng quy trình phân trang và dựng trang của `openPrintPreview()` (hộp thoại Xem trước khi in độc lập Ctrl+F2):
- `adapter.getPageDimensions()`
- `adapter._extractNotesForPreview(rawBody)`
- `adapter._stripAutoPageGaps()`
- `adapter.paginateContent()`

Tuy nhiên, báo cáo kỹ thuật trước đó đã ghi nhận trung thực một khoảng trống (**GAP**):
- `openPrintPreview()` sau khi phân trang còn thực hiện gắn chú thích cuối tài liệu (Endnote) vào trang in cuối cùng qua hàm `_renderEndnotesForPreview(notesData.endnotes)`.
- Bước này đã bị bỏ sót trong `computePages()` của Backstage Print Provider.
- Kết quả: Khi tài liệu có Endnote, khung xem trước trong Backstage không hiển thị Endnote, trong khi overlay Ctrl+F2 thật lại hiển thị đầy đủ.

Đồng thời, nhiệm vụ yêu cầu rà soát kỹ lưỡng xem **Footnote-theo-từng-trang** có bị thiếu tương tự hay không để bổ sung dứt điểm, tránh sót lần thứ hai.

---

## 2. Xác nhận về Footnote-theo-từng-trang

Qua kiểm tra trực tiếp mã nguồn ban đầu của `_getPrintPreviewProvider()` (nhánh `this.appName === 'writer'`):
```javascript
const notesData = adapter._extractNotesForPreview ? adapter._extractNotesForPreview(rawBody) : { cleanHtml: rawBody, footnotes: new Map(), endnotes: new Map() };
const bodyForPagination = adapter._stripAutoPageGaps ? adapter._stripAutoPageGaps(notesData.cleanHtml) : notesData.cleanHtml;
const pageBodies = adapter.paginateContent(bodyForPagination, availableBodyHeightPx, dim.printableWidthPx, adapter.columns);
const totalPages = Math.max(1, pageBodies.length);
return { dim, headerHtml, footerHtml, pageBodies, totalPages };
```

**Kết luận xác nhận**:
- `notesData.footnotes` đã được bóc tách khỏi HTML thô cùng với `notesData.endnotes`.
- Tuy nhiên, sau khi `adapter.paginateContent()` trả về mảng `pageBodies`, mã nguồn hoàn toàn **không** chạy vòng lặp duyệt từng trang để gọi `adapter._renderPageFootnotesForPreview(pageBodies[i], notesData.footnotes)`.
- Do đó, **Footnote-theo-từng-trang THỰC SỰ ĐÃ BỊ THIẾU TỪ TRƯỚC** giống hệt như Endnote. Cả hai loại chú thích đều chưa được chèn vào `pageBodies` của Backstage Print Preview.

---

## 3. Chi tiết giải pháp kỹ thuật

### 3.1 Tệp sửa đổi duy nhất về logic ứng dụng: `platform/shell/app-shell.js`
Tại hàm `_getPrintPreviewProvider()`, trong khối xử lý cho Writer (`this.appName === 'writer'` -> `computePages()`), bổ sung tuần tự đúng 2 bước chuẩn xác từ `openPrintPreview()`:

```javascript
          const pageBodies = adapter.paginateContent(bodyForPagination, availableBodyHeightPx, dim.printableWidthPx, adapter.columns);

          // Gắn Footnote vào chân trang của đúng trang chứa số mũ tương ứng
          if (typeof adapter._renderPageFootnotesForPreview === "function" && notesData.footnotes) {
            for (let i = 0; i < pageBodies.length; i++) {
              const pageFootnotesHtml = adapter._renderPageFootnotesForPreview(pageBodies[i], notesData.footnotes);
              if (pageFootnotesHtml) {
                pageBodies[i] = `${pageBodies[i]}\n${pageFootnotesHtml}`;
              }
            }
          }

          // Gắn Endnote vào cuối trang cuối cùng của tài liệu
          if (typeof adapter._renderEndnotesForPreview === "function" && pageBodies.length > 0 && notesData.endnotes && notesData.endnotes.size > 0) {
            const endnotesHtml = adapter._renderEndnotesForPreview(notesData.endnotes);
            if (endnotesHtml) {
              pageBodies[pageBodies.length - 1] = `${pageBodies[pageBodies.length - 1]}\n${endnotesHtml}`;
            }
          }

          const totalPages = Math.max(1, pageBodies.length);
          return { dim, headerHtml, footerHtml, pageBodies, totalPages };
```

### 3.2 Tuân thủ ranh giới an toàn tuyệt đối
- Tái sử dụng 100% các hàm render đã có sẵn (`_renderPageFootnotesForPreview`, `_renderEndnotesForPreview`).
- TUYỆT ĐỐI KHÔNG sửa đổi các hàm lõi `openPrintPreview()`, `paginateContent()`, `_renderEndnotesForPreview()`, `_renderPageFootnotesForPreview()` trong `writer-adapter.js`.
- KHÔNG thay đổi bất kỳ hành vi nào của overlay Ctrl+F2.
- KHÔNG chạm vào provider của Sheet hay Slides trong cùng hàm `_getPrintPreviewProvider()`.

---

## 4. Hệ thống kiểm thử mở rộng

### 4.1 Unit Tests (`tests/unit/backstage-print-thumbnail.test.js`)
- Nâng cấp `FakeElement` trong mock test suite để phân tích và hỗ trợ đầy đủ các thuộc tính `data-*`, `style` và tuần tự hóa `outerHTML` chuẩn xác.
- Mở rộng Suite 125 từ 10 bài lên **13 bài kiểm thử**:
  1. `Writer Backstage In: hiển thị Endnote ở cuối trang cuối cùng khi tài liệu có Endnote`: xác nhận có khối `.vno-print-preview-endnotes`, tiêu đề "CHÚ THÍCH CUỐI TÀI LIỆU" và nội dung Endnote.
  2. `Writer Backstage In: hiển thị Footnote ở chân trang tương ứng khi tài liệu có Footnote`: xác nhận có khối `.vno-print-preview-footnotes` và nội dung Footnote ở chân trang.
  3. `Writer Backstage In: tài liệu có cả Footnote và Endnote — hiển thị đầy đủ cả hai loại chú thích`: xác nhận hiển thị đồng thời cả Footnote và Endnote đúng vị trí quy định.

### 4.2 Playwright Live Test (`tests/live/writer-backstage-print-thumbnail.playwright.mjs`)
- Bổ sung **Kịch bản 4**:
  - Chuyển sang tab Ribbon "Tham chiếu" (`#vno-ribbon-tab-references`).
  - Chèn Footnote thật qua nút `button[data-command-id="writer.reference.footnoteInsert"]`.
  - Chèn Endnote thật qua nút `button[data-command-id="writer.reference.endnoteInsert"]`.
  - Mở overlay Xem trước khi in THẬT (`Ctrl+F2`), trích xuất HTML của khối `.vno-print-preview-footnotes` và `.vno-print-preview-endnotes`.
  - Đóng overlay (`Escape`).
  - Mở Backstage > In ấn (`#vno-backstage-nav-print`), trích xuất HTML của các khối tương ứng trong khung xem trước Backstage.
  - So sánh đối chiếu: Khẳng định nội dung Footnote và Endnote trong Backstage Print Preview **khớp 100% (HTML exact match)** với Overlay Ctrl+F2 thật.

---

## 5. Kết quả kiểm tra toàn diện

| Cổng kiểm soát chất lượng | Lệnh thực thi | Kết quả |
|---|---|---|
| Kiểm tra cú pháp JavaScript | `node scripts/check-syntax.js` | **88/88 files hợp lệ (100% PASS, 0 lỗi)** |
| Bộ kiểm thử đơn vị toàn dự án | `node tests/run-tests.js` | **1389/1389 PASS | 0 FAIL (100% PASS)** |
| Kiểm thử Backstage Print Thumbnail | Suite 125 | **13/13 PASS (100% PASS)** |
| Ribbon Audit 1280px (Không tràn ngang) | `node tests/live/ribbon-audit-1280.playwright.mjs` | **104/104 lượt PASS (0px overflow tại 1280px)** |
| Trình duyệt thật: Writer Backstage Print | `node tests/live/writer-backstage-print-thumbnail.playwright.mjs` | **100% PASS (Cả 4 kịch bản, khớp 1:1 với Ctrl+F2)** |
| Trình duyệt thật: Sheet Backstage Print | `node tests/live/sheet-backstage-print-thumbnail.playwright.mjs` | **100% PASS** |
| Trình duyệt thật: Slides Backstage Print | `node tests/live/slides-backstage-print-thumbnail.playwright.mjs` | **100% PASS** |

---

## 6. Thông tin nhánh & Worktree
- **Worktree**: `E:\VNOffice-agy-backstage-writer-endnotes`
- **Branch**: `fix/backstage-writer-endnotes-gap` (tách từ `main`, KHÔNG merge vào `main`)
