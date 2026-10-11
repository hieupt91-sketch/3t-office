# TÀI LIỆU BÀN GIAO: VN WRITER — STYLE GALLERY & WATERMARK / PAGE BORDER

## 1. Thông tin tổng quan & Phạm vi công việc

- **Worktree thực hiện**: `E:\VNOffice-agy-style-gallery`
- **Nhánh (Branch)**: `feature/writer-style-gallery-watermark` (tách từ `main` mới nhất — đã tích hợp Mail Merge, TOC, Footnotes/Endnotes, Deep Undo/Redo)
- **Tác giả triển khai**: Antigravity (agy)
- **Người review & nghiệm thu**: Claude / Codex (trước khi merge vào `main`)
- **Nguyên tắc phạm vi tuyệt đối**:
  - KHÔNG can thiệp vào `apps/sheet/**`, `apps/slides/**`, `platform/shell/app-shell.js`, `platform/ai/**`.
  - Không đụng chạm hay gây ảnh hưởng tới worktree song song của Codex (`E:\VNOffice-codex-sheet-printarea`).
  - Không đăng ký đè (`register()` lần 2) cho các command đã tồn tại trong Command Bus.
  - Xử lý phòng thủ `options = options || {};` ở đầu tất cả các command handler được bind (BÀI HỌC BẮT BUỘC 3).
  - Không sử dụng thư viện bên ngoài hay SDK trả phí — 100% JavaScript thuần (Vanilla JS) và CSS native.

---

## 2. Danh mục Command mới & Ánh xạ UNO

Toàn bộ 3 lệnh được khai báo chuẩn trong `platform/commands/command-definitions.js` và ánh xạ 2 chiều sang lệnh UNO của LibreOffice trong `adapters/libreoffice/common/command-dispatch-mapper.js` (`VN_TO_UNO_MAP` & `UNO_TO_VN_MAP`):

| Command ID | Nhãn tiếng Việt | Icon ID | Ánh xạ LibreOffice UNO | Vị trí trên Ribbon |
| :--- | :--- | :--- | :--- | :--- |
| `writer.style.gallery` | Thư viện kiểu | `styleGallery` | `.uno:DesignerDialog` | Tab **Trang đầu** (Nhóm *Kiểu dáng*) |
| `writer.page.watermark` | Hình mờ | `pageWatermark` | `.uno:Watermark` | Tab **Bố cục** (Nhóm *Nền & Viền trang*) |
| `writer.page.border` | Viền trang | `pageBorder` | `.uno:BorderDialog` | Tab **Bố cục** (Nhóm *Nền & Viền trang*) |

Tất cả 3 icon SVG được thiết kế vector sắc nét (viewBox 0 0 24 24), chuẩn nhận diện Office thương mại, đa tầng màu (dual-tone `#0f4c81`, `#2563eb`, `#10b981`, `#f59e0b`, `#dc2626`), được bổ sung trực tiếp vào `platform/ui-kit/icons.js`. Tuyệt đối không dùng icon fallback hay hình tròn generic.

---

## 3. Kiến trúc & Thiết kế kỹ thuật

### 3.1. Thư viện kiểu trực quan — Visual Style Gallery (`apps/writer/style-gallery.js`)
1. **Danh mục 6 Preset chuẩn Office**:
   - `normal`: Văn bản thường — phông chữ chuẩn 14pt căn đều hai bên theo Nghị định 30/2020/NĐ-CP.
   - `h1`: Tiêu đề 1 — chữ in hoa, in đậm, căn giữa, cỡ 16pt (QUYẾT ĐỊNH, CHỈ THỊ...).
   - `h2`: Tiêu đề 2 — chữ in đậm, cỡ 14pt (Điều 1, Mục I...).
   - `h3`: Tiêu đề 3 — chữ in đậm nghiêng, cỡ 13pt (Khoản 1, Điểm a...).
   - `quote`: Trích dẫn — khối trích dẫn thẻ `<blockquote>`, in nghiêng, thụt lề 24pt, viền xanh `#0f4c81` bên trái.
   - `emphasis`: Nhấn mạnh — in đậm, in nghiêng, màu chữ hổ phách `#b45309`.
2. **Dải chọn nhanh trên Ribbon (Quick Styles Strip)**:
   - Hiển thị trực quan dạng dải cuộn ngang (`.vno-style-gallery-strip`) ngay trong nhóm "Kiểu dáng" của tab Trang đầu.
   - Mỗi ô kiểu dáng hiển thị mẫu typography trực tiếp (`AaBbCc`, `TIÊU ĐỀ 1`, `“Trích dẫn…”`...) giúp người dùng nhận diện ngay định dạng trước khi bấm.
   - Tự động highlight ô active theo kiểu dáng thực tế của đoạn văn tại vị trí con trỏ bàn phím.
3. **Bảng điều khiển Dropdown trôi (Style Gallery Panel)**:
   - Mở khi người dùng nhấn nút "Thư viện kiểu" (`writer.style.gallery`).
   - Hiển thị dạng lưới thẻ card 3 cột với khung xem trước typography lớn, nhãn kiểu dáng và mô tả tiêu chuẩn văn thư.
   - Tự động định vị ngay dưới nút ribbon, hỗ trợ đóng nhanh khi bấm ra ngoài hoặc nhấn phím `Escape`.
4. **Nhận diện kiểu dáng động tại con trỏ (`getCurrentParagraphStyle`)**:
   - Quét cấu trúc DOM từ `anchorNode` của con trỏ đi ngược lên thẻ đoạn văn gần nhất (`h1`, `h2`, `h3`, `blockquote`, `p`).
   - Bắt sự kiện `selectionchange`, `keyup`, `mouseup` để đồng bộ real-time trạng thái active trên cả dải strip lẫn thẻ `<select>` kiểu dáng.
5. **Chuyển đổi khối văn bản an toàn (`_applyParagraphStyle`)**:
   - Thử nghiệm lệnh chuẩn `document.execCommand("formatBlock")`.
   - Kết hợp chuyển đổi khối ngữ nghĩa DOM (`_updateCurrentBlockStyle`) hỗ trợ tạo mới thẻ tương ứng (`H1`, `H2`, `H3`, `BLOCKQUOTE`, `P`) và đồng bộ các class hỗ trợ (`vno-style-quote`, `vno-style-emphasis`).
   - Cơ chế kiểm tra an toàn: tự động phát hiện node con trỏ bị tách rời khỏi DOM để fallback về khối đầu tiên của `bodyDom`, tránh lỗi treo hoặc mất liên kết.

### 3.2. Hình mờ & Viền trang in — Watermark & Page Border (`apps/writer/page-decorations.js`)
1. **Hộp thoại Cấu hình Hình mờ (`showWatermarkDialog`)**:
   - Cung cấp danh mục 6 văn bản mẫu chuẩn cơ quan nhà nước / doanh nghiệp Việt Nam: `"DỰ THẢO"`, `"MẬT"`, `"TUYỆT MẬT"`, `"KHẨN"`, `"BẢN SAO"`, `"LƯU HÀNH NỘI BỘ"`.
   - Cho phép nhập văn bản tùy biến bất kỳ.
   - Tùy chỉnh góc xoay chéo 45° hoặc nằm ngang 0°.
   - Tùy chỉnh độ trong suốt Opacity (10%, 20%, 30%, 40%) để không làm chìm chữ của văn bản.
   - Tùy chỉnh kích thước chữ (48pt, 60pt, 72pt, 96pt) và bảng màu chuẩn (`#dc2626`, `#b91c1c`, `#475569`, `#0f4c81`, `#059669`).
   - Nút "Xóa hình mờ" gỡ bỏ ngay lập tức watermark.
2. **Hiển thị Hình mờ trên Editor & Xuất file**:
   - Trên canvas soạn thảo: Render layer `.vno-page-watermark` xoay chéo, `pointer-events: none`, `z-index: 0` đặt sau văn bản để người dùng vẫn gõ chữ và chọn văn bản bình thường.
   - Trong **Print Preview**: Lặp lại chính xác trên **MỌI** trang in xem trước (`.vno-print-preview-watermark`).
   - Khi xuất PDF/DOCX: Phương thức `_contentForExport()` tự động nhúng khối fixed layer với CSS in ấn chuẩn:
     ```html
     <div class="vno-export-watermark" style="position:fixed;top:35%;left:10%;width:80%;text-align:center;transform:rotate(-45deg);opacity:0.2;font-size:72pt;color:#dc2626;font-weight:900;font-family:sans-serif;pointer-events:none;z-index:-10;">DỰ THẢO</div>
     ```
3. **Hộp thoại Cấu hình Viền trang in (`showPageBorderDialog`)**:
   - Cho phép bật/tắt viền khung trang.
   - Hỗ trợ 5 kiểu đường nét viền: nét đơn (`solid`), nét đôi (`double`), nét đứt (`dashed`), nét chấm (`dotted`), rãnh nổi (`groove`).
   - Độ dày viền linh hoạt từ 1pt đến 6pt.
   - Bảng màu viền phong phú (`#0f4c81`, `#1e293b`, `#dc2626`, `#047857`, `#b45309`, `#6b21a8`).
4. **Hiển thị Viền trang trên Editor & Xuất file**:
   - Trên canvas soạn thảo: Khung viền `.vno-page-border-frame` bám sát mép trang in với khoảng cách `top: 16px; left: 16px; right: 16px; bottom: 16px;`.
   - Trong **Print Preview**: Tạo khung viền `.vno-print-preview-page-border` lặp lại đồng nhất trên **MỌI** sheet trang in.
   - Khi xuất PDF/DOCX: Nhúng cấu hình viền trực tiếp vào quy tắc CSS in ấn `@page`:
     ```css
     @page {
       size: A4 portrait;
       margin: 20mm 15mm 20mm 30mm;
       border: 2pt solid #0f4c81;
     }
     ```
5. **Dọn dẹp phiên làm việc (`_stripSessionMarkup`)**:
   - Tự động bóc tách các container giao diện phiên làm việc (`.vno-page-watermark`, `.vno-page-border-frame`, `data-vno-watermark`, `data-vno-page-border`) trước khi lưu trữ hoặc xuất dữ liệu thô, đảm bảo HTML hoàn toàn sạch sẽ.

### 3.3. Tích hợp sâu vào Hệ thống Deep Undo/Redo
- Cấu trúc snapshot tài liệu (`_createSnapshot`) được mở rộng thêm hai trường trạng thái:
  ```javascript
  {
    watermark: this.watermark ? JSON.parse(JSON.stringify(this.watermark)) : null,
    pageBorder: this.pageBorder ? JSON.parse(JSON.stringify(this.pageBorder)) : null,
    ...
  }
  ```
- Hàm so sánh snapshot (`_isSnapshotEqual`) kiểm tra tính tương đồng của watermark và pageBorder.
- Hàm khôi phục (`_restoreSnapshot`) tự động tái hiện lại đối tượng cấu hình và gọi `_applyDecorations()` để vẽ lại watermark và viền trang tương ứng.
- **Hoàn tác Áp dụng Style (Ctrl+Z)**: Đưa khối văn bản trở lại thẻ ban đầu (ví dụ: H2 quay về P).
- **Hoàn tác Đặt Watermark / Viền trang (Ctrl+Z)**: Làm biến mất hoàn toàn layer trên DOM và chuyển trạng thái về ban đầu; Redo (Ctrl+Y) khôi phục lại trọn vẹn.

---

## 4. Kết quả kiểm thử tự động (Unit & Behavioral Tests)

Tạo mới bộ kiểm thử toàn diện **Suite 28** trong `tests/unit/writer-style-gallery-watermark.test.js` gồm **26 test cases** chi tiết:
- Kiểm tra khai báo 3 lệnh mới trong `WRITER_COMMANDS`.
- Kiểm tra ánh xạ 2 chiều chuẩn xác sang UNO của LibreOffice.
- Kiểm tra 3 icon SVG vector chuẩn trong `ICONS`.
- Kiểm tra sự hiện diện trên cấu trúc Ribbon tabs (Trang đầu & Bố cục).
- Kiểm tra định nghĩa và xem trước của 6 preset trong `STYLE_PRESETS`.
- Kiểm tra áp dụng tuần tự các kiểu dáng (Heading 2, Quote, Emphasis, Normal) và biến đổi DOM.
- Kiểm tra tự động nhận diện kiểu dáng đoạn văn tại con trỏ.
- Kiểm tra Undo/Redo chuyển đổi kiểu dáng đối xứng.
- Kiểm tra thiết lập và hiển thị Watermark `"DỰ THẢO"`, `"MẬT"`, `"KHẨN"`.
- Kiểm tra xóa Watermark và hoàn tác khôi phục.
- Kiểm tra Watermark lặp lại chính xác trên **MỌI** trang trong Print Preview nhiều trang.
- Kiểm tra áp dụng Page Border (viền đôi 3pt màu xanh).
- Kiểm tra Undo/Redo Page Border đối xứng.
- Kiểm tra Page Border lặp lại chính xác trên **MỌI** trang trong Print Preview.
- Kiểm tra an toàn tuyệt đối khi Command Bus hoặc handleDispatch nhận `args = null` (Lesson 3).
- Kiểm tra cấu trúc HTML xuất ra chứa đúng `@page border` và fixed layer watermark cho DOCX/PDF.

### Kết quả chạy toàn bộ test runner của hệ thống:
```text
node tests/run-tests.js
==================================================
KẾT QUẢ KIỂM THỬ: 334/334 PASS | 0 FAIL
==================================================
Toàn bộ 28 bộ kiểm tra đều đạt chuẩn chất lượng.
```

---

## 5. Xác minh môi trường trình duyệt thật (Real Browser Verification)

1. **Khởi chạy HTTP Server**:
   - Sử dụng máy chủ tĩnh Python: `python -m http.server 8088 --bind 127.0.0.1`.
   - Kiểm tra mã trạng thái HTTP: `200 OK`.
2. **Khởi chạy Chrome thật (Headless mode)**:
   - Truy cập URL thực tế: `http://127.0.0.1:8088/index.html?app=writer`.
   - Trích xuất toàn bộ DOM runtime đang render trong trình duyệt thật:
     - Dải chọn kiểu nhanh (`.vno-style-gallery-strip`) được khởi tạo và gắn thành công vào nhóm "Kiểu dáng" trên Ribbon.
     - Đầy đủ 6 nút kiểu dáng hiển thị mẫu xem trước typography thực tế:
       - Normal: `AaBbCc`
       - Tiêu đề 1: `TIÊU ĐỀ 1`
       - Tiêu đề 2: `Tiêu đề 2`
       - Tiêu đề 3: `Tiêu đề 3`
       - Trích dẫn: `“Trích dẫn…”`
       - Nhấn mạnh: `Nhấn mạnh`
     - Nút "Thư viện kiểu" mang icon SVG `styleGallery` đa tầng màu sắc hiển thị đúng vị trí.
     - Khi chuyển sang tab "Bố cục", nhóm "Nền & Viền trang" xuất hiện đầy đủ 2 nút "Hình mờ" (`pageWatermark`) và "Viền trang" (`pageBorder`).

---

## 6. Giới hạn trung thực đã biết (Known Limitations)

1. **Phạm vi kiểu dáng**: Hệ thống hiện tập trung vào 6 preset đoạn văn cốt lõi theo thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP). Các kiểu dáng danh sách tùy biến phức tạp hoặc style ký tự (character styles) riêng biệt sẽ được phát triển ở các phiên bản tiếp theo.
2. **Cơ chế chuyển đổi sang LibreOffice / Word**:
   - Watermark được biểu diễn bằng lớp fixed layer có xoay góc và độ trong suốt trong HTML xuất ra. Khi LibreOffice chuyển đổi sang PDF, watermark xuất hiện cố định trên các trang in.
   - Page Border được định nghĩa thông qua thuộc tính `border` trong `@page` CSS. Các trình đọc hiện đại và LibreOffice hỗ trợ xuất định dạng này ra PDF/DOCX; đối với các phiên bản MS Word cổ điển không hỗ trợ CSS `@page`, khung viền trang in có thể cần được áp dụng lại qua menu Page Borders của Word.


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
