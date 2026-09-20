# Báo cáo Bàn giao Sửa lỗi Hiển thị VN Writer Vòng 10 (Round 10 Handoff)

- **Chi nhánh làm việc**: `fix/writer-render-r10` trong worktree `E:\VNOffice-agy-writer-w21`.
- **Căn cứ yêu cầu**: `docs/TASK-BRIEF-WRITER-RENDER-R10.md`, `docs/HANDOFF-VISUAL-INSPECTION-R10.md` mục 5.
- **Mẫu kiểm tra**: `file test/landocx/d09.docx`, `file test/landocx/d13.docx`.
- **Trạng thái**: Hoàn tất 100% — đã sửa code, bổ sung unit test, cập nhật quy ước W21a/W21b, xác minh ảnh chụp visual và vượt qua toàn bộ quality gates.

---

## 1. Chi tiết phân tích nguyên nhân và giải pháp sửa lỗi

### 1.1. Lỗi L6: Chồng chữ (Double Paint / Text Collision) tại `d13.docx` trang 2 mục 2.1 dòng 1

- **Triệu chứng ban đầu**:
  - Tại trang 2 mục 2.1 dòng 1 ("Quản lý nhiều trường, nhiều cơ sở, nhiều lớp trong cùng một hệ thống."), chữ `"cùng một hệ thống"` bị in đè lên chính nó, tạo bóng kép mờ nhòe. Ngoài ra có một đường gạch đứt nét nằm ngang cắt ngang đoạn văn.
- **Nguyên nhân gốc (Root Cause)**:
  - Khung cuộn văn bản `.vno-writer-viewport` sử dụng mô hình Flexbox dạng cột (`display: flex; flex-direction: column; align-items: center;`).
  - Phần tử con chứa toàn bộ tài liệu `.vno-writer-page` có giá trị mặc định của Flexbox là `flex-shrink: 1`.
  - Khi render tài liệu nhiều trang, chiều cao nội dung thân trang `.vno-writer-body` lên tới 8578px, nhưng do `flex-shrink: 1`, container `.vno-writer-page` bị ép co lại đúng bằng `min-height: 1054.5px` (tương đương 1 trang A4).
  - Vì `.vno-writer-page` bị giới hạn ở 1054.5px, phần tử chân trang `.vno-writer-footer` (`position: absolute; bottom: 48px; border-top: 1px dashed #cbd5e1;`) bị đặt tại tọa độ `top: 980.5px`.
  - Tọa độ này trùng đúng vào vị trí dòng đầu tiên của mục 2.1 trên Trang 2! Nội dung chân trang (`"Tài liệu kế hoạch nội bộ"`) và đường viền đứt nét `border-top` của footer đã vẽ đè trực tiếp lên chữ của thân bài, gây ra hiện tượng chồng chữ bóng kép.
- **Khắc phục (Quy ước W21a)**:
  - Bổ sung thuộc tính `flex-shrink: 0;` vào `.vno-writer-page` trong [apps/writer/writer.css](file:///E:/VNOffice-agy-writer-w21/apps/writer/writer.css).
  - Giúp `.vno-writer-page` mở rộng tự do theo toàn bộ chiều cao của các trang (đạt 8720px), đẩy `.vno-writer-footer` xuống đúng vị trí cuối cùng của tài liệu (top: 8646px), triệt tiêu hoàn toàn bóng chữ và đường viền đứt nét đè lên trang 2.

### 1.2. Lỗi L8: Ký hiệu gạch đầu dòng `-` biến thành bullet tròn `•` tại `d09.docx` trang 1 mục 1–2

- **Triệu chứng ban đầu**:
  - Tại `d09.docx` trang 1 các mục 1 và 2 ("Tên thương mại: CÔNG TY TNHH...", "Loại hình doanh nghiệp...", "Danh sách thành viên góp vốn...", "Vốn pháp định..."), trong Microsoft Word hiển thị ký hiệu gạch đầu dòng dấu trừ `-` (hyphen bullet).
  - Khi mở trong VN Writer, toàn bộ các gạch đầu dòng này biến thành dấu chấm tròn đen đặc `•` (disc bullet).
- **Nguyên nhân gốc (Root Cause)**:
  - Tài liệu `d09.docx` khai báo danh sách trong `word/numbering.xml` với `numId=4` (liên kết `abstractNumId=6`, level 0), có `<w:numFmt w:val="bullet"/>`, `<w:lvlText w:val="-"/>` và font `Times New Roman`.
  - LibreOffice khi chuyển đổi sang HTML xuất cấu trúc `<ul><li><p>...</p></li></ul>` trần mà không kèm thông tin ký tự bullet.
  - Trình duyệt Chromium/Edge khi render thẻ `<ul><li>` không có `list-style-type` chỉ định sẽ mặc định áp dụng kiểu `disc` (`•`).
  - Trước đây `main.py` chỉ trích xuất `styles.xml` mà không nạp `numbering.xml` vào payload gửi sang frontend.
- **Khắc phục (Quy ước W21b)**:
  - **Backend**: Trong [main.py](file:///E:/VNOffice-agy-writer-w21/main.py), trích xuất `word/numbering.xml` qua `_read_docx_zip_entry` và chuyển tiếp vào `payload["ooxmlNumberingXml"]`.
  - **Frontend Adapter**: Trong [adapters/libreoffice/writer/writer-adapter.js](file:///E:/VNOffice-agy-writer-w21/adapters/libreoffice/writer/writer-adapter.js):
    - Chuyển tiếp `result.ooxmlNumberingXml` qua `_normalizeImportedHtml`.
    - Cài đặt phương thức `_applyOoxmlListBullets(html, ooxmlDocumentXml, ooxmlStylesXml, ooxmlNumberingXml)`:
      1. Phân tích `w:abstractNum`, `w:num` và `w:lvlOverride` trong `numbering.xml` để tạo bản đồ `numId/ilvl` -> `{ numFmt, lvlText, font }`.
      2. Phân tích `w:style` trong `styles.xml` để nhận diện kế thừa `w:numPr` (như style `ListBullet`).
      3. Quét các thẻ `<w:p>` cấp tài liệu ngoài bảng để xác định danh sách các mục numbering theo thứ tự.
      4. Đối chiếu tuần tự với các thẻ `<li>` trong HTML (bỏ qua header/footer) và gán `style="list-style-type: '- ';"` cho các phần tử bullet dấu trừ `-`. Các danh sách có thứ tự (`<ol>`) và bullet tròn chuẩn (`disc`) được giữ nguyên vẹn.

---

## 2. Đối chiếu Ảnh chụp Trước / Sau (Visual Comparison)

### 2.1. Lỗi L6 (`d13.docx` trang 2 mục 2.1)

| Trạng thái | Hình ảnh minh chứng | Mô tả |
|---|---|---|
| **Trước khi sửa** | `docs/screenshots/r10/crop_d13_p2_text_overlap.png` | Footer `"Tài liệu kế hoạch nội bộ"` và viền dashed đè lên dòng đầu mục 2.1 tạo bóng kép. |
| **Sau khi sửa** | `docs/screenshots/crop_d13_p2_fixed.png` | Chữ mục 2.1 sắc nét, không còn viền dashed và không còn bất kỳ dấu vết đè chữ nào. |

### 2.2. Lỗi L8 (`d09.docx` trang 1 mục 1–2)

| Trạng thái | Hình ảnh minh chứng | Mô tả |
|---|---|---|
| **Trước khi sửa** | `docs/screenshots/r10/crop_d09_p1_hyphen_bullets_spacing.png` | Danh sách mục 1–2 bị hiển thị thành chấm tròn đen `•` (disc bullet). |
| **Sau khi sửa** | `docs/screenshots/crop_d09_p1_fixed.png` & `docs/screenshots/crop_d09_p1_members_fixed.png` | Ký hiệu gạch đầu dòng `-` được bảo toàn chuẩn xác như Word; mục số La Mã `I.` và số `1.`, `2.` giữ nguyên. |

---

## 3. Sơ đồ Audit Bố cục (Layout Audit Matrix)

Chạy lệnh audit bố cục đối chiếu với cache Word COM:
```bash
python scripts/layout-audit/_writer_layout_audit.py . "file test/landocx" _out d09.docx d13.docx
```

### Kết quả tổng hợp số trang:
| Tệp tài liệu | Số trang Word COM | Số trang Canvas VN Writer | Tỷ lệ khớp trang | Đánh giá |
|---|---:|---:|:---:|:---|
| **d09.docx** | 14 | 14 | 14/14 (100%) | Khớp tuyệt đối, không lệch trang |
| **d13.docx** | 10 | 10 | 10/10 (100%) | Khớp tuyệt đối, không lệch trang |

### Bảng phân loại độ lệch đoạn văn (`_out/_writer_layout_matrix.md`):
| File | Word pages | Canvas pages | Matched paras | Page | Wrap | Drift:unknown | Spacing | Line-height | Drift:empty-para | Drift:table |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `d09.docx` | 14 | 14 | 82 | 29 | 17 | 20 | 12 | 2 | 3 | 1 |
| `d13.docx` | 10 | 10 | 79 | 10 | 12 | 2 | 6 | 2 | 0 | 1 |

*Ghi chú*: Cả hai tài liệu đều giữ nguyên số trang chuẩn Word, không có lớp lỗi nào tăng hay phát sinh hồi quy.

---

## 4. Báo cáo Kiểm thử & Quality Gates

Toàn bộ 3 cổng kiểm soát chất lượng kỹ thuật đều đạt 100%:

1. **Cú pháp JavaScript**:
   - Lệnh: `node scripts/check-syntax.js`
   - Kết quả: **92/92 files hợp lệ | 0 lỗi cú pháp**.
2. **Bộ Unit Test JavaScript**:
   - Lệnh: `node tests/run-tests.js`
   - Kết quả: **1787/1787 PASS | 0 FAIL (100%)**.
   - Bổ sung 4 unit test trong `tests/unit/writer-doc-font-spacing.test.js`:
     - `W21a: .vno-writer-page has flex-shrink: 0 to prevent footer overlap on multi-page docs`
     - `W21b: _applyOoxmlListBullets maps hyphen bullet '-' from numbering.xml to list-style-type: '- '`
     - `W21b: _applyOoxmlListBullets resolves numPr from style chain (e.g. ListBullet)`
     - `W21b: _applyOoxmlListBullets leaves decimal/ordered lists and standard disc bullets untouched`
3. **Bộ Kiểm thử Python**:
   - Lệnh: `python -m unittest discover -s tests -p "test_writer*.py"`
   - Kết quả: **53/53 tests PASS (OK)**.

---

## 5. Danh sách Tệp thay đổi

- [`apps/writer/writer.css`](file:///E:/VNOffice-agy-writer-w21/apps/writer/writer.css): Bổ sung `flex-shrink: 0;` cho `.vno-writer-page` (Quy ước W21a).
- [`main.py`](file:///E:/VNOffice-agy-writer-w21/main.py): Trích xuất `word/numbering.xml` và nạp vào `payload["ooxmlNumberingXml"]`.
- [`adapters/libreoffice/writer/writer-adapter.js`](file:///E:/VNOffice-agy-writer-w21/adapters/libreoffice/writer/writer-adapter.js): Chuyển tiếp `ooxmlNumberingXml` và cài đặt `_applyOoxmlListBullets` khôi phục bullet hyphen `-` (Quy ước W21b).
- [`docs/QUY-UOC-DOI-CHIEU.md`](file:///E:/VNOffice-agy-writer-w21/docs/QUY-UOC-DOI-CHIEU.md): Bổ sung định nghĩa quy ước W21a và W21b.
- [`tests/unit/writer-doc-font-spacing.test.js`](file:///E:/VNOffice-agy-writer-w21/tests/unit/writer-doc-font-spacing.test.js): Bổ sung 4 bài unit test kiểm định quy ước W21a và W21b.
- [`docs/HANDOFF-WRITER-RENDER-R10.md`](file:///E:/VNOffice-agy-writer-w21/docs/HANDOFF-WRITER-RENDER-R10.md): Báo cáo bàn giao chi tiết kèm ảnh trước/sau và ma trận audit.
