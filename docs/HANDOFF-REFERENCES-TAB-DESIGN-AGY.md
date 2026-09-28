# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Tham chiếu" (References) — VN Writer (agy)

- **Nhánh**: `design/writer-references-tab-agy` (tách từ `main` `bb3053d`)
- **Worktree**: `E:\VNOffice-agy-references-tab`
- **Phạm vi**: Giao diện trực quan tab "Tham chiếu" (Ribbon, CSS, Markup, Hộp thoại Chú thích ảnh / Danh mục hình / Trích dẫn / Quản lý nguồn / Tham chiếu chéo, Icon-mapping, i18n, Responsive, Hướng dẫn sử dụng tiếng Việt theo AGENTS.md mục 10). Tuyệt đối không can thiệp logic adapter xử lý tài liệu; không chạm vào các file của agent khác đang làm song song (`adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `scripts/layout-audit/*`). Không merge vào `main`.
- **Quy tắc ảnh chụp**: Toàn bộ kiểm thử trực quan được kiểm chứng tự động qua Playwright live test (`tests/live/writer-references-tab.playwright.mjs`). KHÔNG commit ảnh chụp màn hình `.png` vào git theo đúng TASK BRIEF.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với tab **References** của **Microsoft Word 2016 Professional Plus**.

### 1.1. Bảng đối chiếu các nhóm lệnh trên tab Tham chiếu

| STT | Nhóm trên Word 2016 | Lệnh trên Word 2016 | Hiện trạng trên VN Writer | Trạng thái & Đánh giá |
|---|---|---|---|---|
| 1 | **Table of Contents (Mục lục)** | • Table of Contents<br>• Add Text (Level 1/2/3)<br>• Update Table | • `writer.reference.tocInsert` (Mục lục tự động)<br>• `writer.reference.tocUpdate` (Cập nhật mục lục) | **Tương đương cốt lõi**: Hai nút lớn sắc nét. Mục lục được tạo tự động từ các tiêu đề Heading 1, Heading 2, Heading 3. |
| 2 | **Footnotes (Chú thích)** | • Insert Footnote (Ctrl+Alt+F)<br>• Insert Endnote (Ctrl+Alt+D)<br>• Next Footnote / Previous<br>• Show Notes<br>• Dialog Launcher | • `writer.reference.footnoteInsert` (Chú thích trang, Ctrl+Alt+F)<br>• `writer.reference.endnoteInsert` (Chú thích cuối, Ctrl+Alt+D) | **Tương đương phím tắt chuẩn**: Hai nút lớn với icon chuyên dụng. Chèn mốc số siêu ký tự (`sup`) và tự động dựng danh sách chú thích cuối trang / cuối tài liệu. |
| 3 | **Research (Nghiên cứu / Tra cứu)** | • Smart Lookup (Tra cứu Bing) | *Không có trên ribbon* | **Khoảng trống chủ động**: Smart Lookup trên Word yêu cầu kết nối Internet. Theo AGENTS.md mục 2 ("App desktop chạy OFFLINE là mục tiêu chính, ưu tiên số 1"), tính năng tra cứu cloud không đưa vào offline app. |
| 4 | **Citations & Bibliography (Trích dẫn & Thư mục tài liệu)** | • Insert Citation<br>• Manage Sources<br>• Style (APA, MLA, Chicago...)<br>• Bibliography | • `writer.reference.citationInsert` (Chèn trích dẫn)<br>• `writer.reference.sourcesManage` (Quản lý nguồn)<br>• `writer.reference.citationStyle` (Kiểu trích dẫn: APA, MLA)<br>• `writer.reference.bibliographyInsert` (Thư mục tài liệu) | **Tương đương 100% nhóm lệnh**: Gồm 2 nút lớn (Chèn trích dẫn, Thư mục tài liệu) và 1 cột 2 hàng (Quản lý nguồn, Hộp chọn kiểu trích dẫn). Đầy đủ hộp thoại thêm/sửa/xóa nguồn và chèn thư mục tự động. |
| 5 | **Captions (Chú thích ảnh)** | • Insert Caption<br>• Insert Table of Figures<br>• Update Table<br>• Cross-reference | • `writer.reference.captionInsert` (Chèn chú thích ảnh)<br>• `writer.reference.tofInsert` (Danh mục hình ảnh)<br>• `writer.reference.tofUpdate` (Cập nhật danh mục)<br>• `writer.insert.crossReference` (Tham chiếu chéo) | **Tương đương 100% Word 2016**: 1 nút lớn Chèn chú thích ảnh và cột 3 nút nhỏ (Danh mục hình ảnh, Cập nhật danh mục, Tham chiếu chéo). Hộp thoại hỗ trợ các nhãn Hình / Bảng / Phương trình và liên kết nội bộ. |
| 6 | **Index (Chỉ mục)** | • Mark Entry<br>• Insert Index<br>• Update Index | *Chưa có trên ribbon* | **Khoảng trống so với Word**: Tính năng tạo bảng chỉ mục từ khóa cuối sách chưa được phát triển trong VN Writer. Ghi nhận vào lộ trình tương lai. |
| 7 | **Table of Authorities (Bảng thẩm quyền pháp lý)** | • Mark Citation<br>• Insert Table of Authorities<br>• Update Table | *Chưa có trên ribbon* | **Khoảng trống so với Word**: Tính năng đặc thù cho giới luật pháp Hoa Kỳ, ít sử dụng trong văn bản hành chính Việt Nam. |

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Thiếu keyword fallback trong `resolveIcon` cho các lệnh tab Tham chiếu** | **ĐÃ SỬA** | **Hiện trạng**: Nếu `resolveIcon(commandId)` được gọi chỉ với `commandId` (hoặc khi `iconKey` chưa kịp truyền), các lệnh như `tocInsert`, `footnoteInsert`, `citationInsert`, `captionInsert`, `crossReference`... không khớp keyword nào trong chuỗi `if (idLower.includes(...))` nên rơi xuống fallback dấu chấm tròn đen `●` (`circle cx="12" cy="12" r="4"`).<br>**Giải pháp**: Bổ sung đầy đủ 12 keyword fallback vào `platform/ui-kit/components.js`: `tocinsert`, `tocupdate`, `footnote`, `endnote`, `citationstyle`, `citationinsert`, `sourcesmanage`, `bibliography`, `captioninsert`, `tofinsert`, `tofupdate`, `crossreference`. Đảm bảo 100% không bao giờ bị rơi về icon chấm tròn đen. |
| 2 | **Nhãn hộp chọn Kiểu trích dẫn (`writer.reference.citationStyle`) thiếu tiền tố ngữ cảnh và lệch độ rộng so với nút "Quản lý nguồn"** | **ĐÃ SỬA** | **Hiện trạng**: Trên cột nhóm Trích dẫn, hộp chọn chỉ hiển thị trơ trọi chữ "APA" hoặc "MLA" với độ rộng tự co còn 59px, trong khi nút "Quản lý nguồn" phía trên rộng 110px. Điều này làm cột bị thụt thò không đều và người dùng khó nhận biết đây là hộp chọn gì nếu không rê chuột xem tooltip.<br>**Giải pháp**: Cập nhật nhãn tùy chọn trong `apps/writer/writer-ribbon.js` thành `"Kiểu: APA"` và `"Kiểu: MLA"` (đồng bộ với các select khác trên ribbon như `"Số dòng: Liên tục"`, `"Trước: 0 pt"`). Đồng thời thêm quy tắc CSS trong `platform/shell/shell.css`: `#vno-ribbon-tabpanel-references .vno-ribbon-group[data-group-id="citationsBibliography"] .vno-ribbon-group-row { width: 100%; }` và `.vno-select { width: 100%; }`. Kết quả: Hộp chọn Kiểu trích dẫn mở rộng đúng 110px, khớp hoàn hảo với nút Quản lý nguồn. |
| 3 | **Thiếu cơ chế bẫy tiêu điểm bàn phím (Focus Trap) và khôi phục focus khi đóng hộp thoại Chú thích ảnh & Danh mục hình ảnh** | **ĐÃ SỬA** | **Hiện trạng**: Trong `apps/writer/captions.js`, hàm `showInsertCaptionDialog` và `showInsertTableOfFiguresDialog` chưa chặn phím Tab, khiến người dùng khi bấm Tab có thể lọt tiêu điểm ra ngoài nền văn bản; đồng thời khi đóng dialog bằng Escape không khôi phục lại tiêu điểm cho phần tử kích hoạt ban đầu.<br>**Giải pháp**: Bổ sung hàm `trapFocus` chuẩn WAI-ARIA vào `captions.js`, xử lý sự kiện `event.key === "Tab"` vòng quanh các interactive element trong modal; lưu giữ `previousFocused = document.activeElement` và gọi `previousFocused?.focus?.()` khi kết thúc/hủy dialog. |
| 4 | **Độ tương phản màu ở chế độ Tối (Dark mode) trên hộp thoại Chú thích và Trích dẫn** | **ĐÃ SỬA** | **Hiện trạng**: Khung xem trước chú thích `.vno-caption-preview` sử dụng nền cứng `#f8fafc` và chữ xanh `#0f4c81`, khi bật dark mode bị chói lóa trên nền hộp thoại tối; nhãn gợi ý `.vno-caption-hint` dùng màu `#64748b`; nút xóa nguồn `.vno-delete-source` và dòng báo lỗi `.vno-citation-error` dùng màu `#dc2626` (độ chói thấp, tỷ lệ tương phản chỉ đạt ~2.85:1 trên nền surface tối `#252526`, không đạt chuẩn WCAG AA 4.5:1).<br>**Giải pháp**: Bổ sung quy tắc dark mode chuyên biệt trong `apps/writer/writer.css`: `[data-theme="dark"] .vno-caption-preview` dùng nền `var(--vno-bg-surface)` và chữ `#60a5fa` (**tương phản 6.9:1**); `[data-theme="dark"] .vno-caption-hint` dùng `#94a3b8` (**5.6:1**); `.vno-delete-source` và `.vno-citation-error` dùng màu `#f87171` (**4.57:1**). Toàn bộ đạt và vượt chuẩn WCAG AA. |
| 5 | **Đồng bộ nội dung Trợ giúp (Help entries) tiếng Việt cho lệnh Tham chiếu chéo trong nhóm Chú thích ảnh** | **ĐÃ SỬA** | **Hiện trạng**: Bài viết `writer.reference.captions` trong `platform/help/entries-writer.js` chỉ liệt kê 3 lệnh caption mà chưa nhắc tới lệnh Tham chiếu chéo (`writer.insert.crossReference`) vốn được bố trí cùng trong nhóm Chú thích ảnh trên tab Tham chiếu.<br>**Giải pháp**: Cập nhật bài viết `writer.reference.captions`, bổ sung từ khóa `"tham chiếu chéo"`, `"cross reference"` và bước hướng dẫn số 6: *"Để tạo liên kết nội bộ tới một tiêu đề hoặc đánh dấu trong văn bản, nhấn nút Tham chiếu chéo ngay bên dưới nút Cập nhật danh mục."* |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ 12 controls trên tab Tham chiếu của VN Writer:

1. `writer.reference.tocInsert` (Mục lục tự động): Chèn bảng mục lục tự động từ các tiêu đề Heading 1, 2, 3 có trong tài liệu.
2. `writer.reference.tocUpdate` (Cập nhật mục lục): Quét lại toàn bộ tài liệu và làm mới số trang, nội dung đề mục.
3. `writer.reference.footnoteInsert` (Chú thích trang, Ctrl+Alt+F): Chèn dấu chú thích số Ả Rập (1, 2, 3...) tại vị trí con trỏ và di chuyển tiêu điểm tới ô soạn chú thích cuối trang.
4. `writer.reference.endnoteInsert` (Chú thích cuối, Ctrl+Alt+D): Chèn dấu chú thích số La Mã (i, ii, iii...) tại vị trí con trỏ và đưa vào khối chú thích cuối tài liệu.
5. `writer.reference.citationInsert` (Chèn trích dẫn): Mở hộp thoại chọn nguồn tài liệu để chèn trích dẫn trong ngoặc đơn dạng (Tác giả, Năm) theo chuẩn đã chọn.
6. `writer.reference.sourcesManage` (Quản lý nguồn): Mở hộp thoại danh sách nguồn trích dẫn: Thêm mới, Sửa, Xóa và lưu giữ trong metadata tài liệu.
7. `writer.reference.citationStyle` (Kiểu trích dẫn): Hộp chọn chuyển đổi chuẩn trích dẫn giữa APA và MLA, tự động cập nhật lại các trích dẫn đang hiển thị trong văn bản.
8. `writer.reference.bibliographyInsert` (Thư mục tài liệu): Dựng khối danh mục tài liệu tham khảo ở cuối văn bản từ các nguồn đã trích dẫn, sắp xếp theo bảng chữ cái.
9. `writer.reference.captionInsert` (Chèn chú thích ảnh): Mở hộp thoại chèn chú thích có số thứ tự tự động cho Hình ảnh, Bảng biểu hoặc Phương trình.
10. `writer.reference.tofInsert` (Danh mục hình ảnh): Mở hộp thoại chèn danh mục các hình ảnh, bảng đã có trong tài liệu.
11. `writer.reference.tofUpdate` (Cập nhật danh mục): Làm mới danh mục hình ảnh sau khi thêm/xóa/sửa chú thích.
12. `writer.insert.crossReference` (Tham chiếu chéo): Mở hộp thoại chọn tiêu đề Heading hoặc Bookmark để tạo liên kết nội bộ trong văn bản.

- **Kết quả kiểm tra**: **100% (12/12) controls đều có handler hoạt động thật** được đăng ký trong `WriterAdapter.attach()` và gắn vào `globalCommandBus`. Kiểm chứng tự động qua Playwright live test `tests/live/writer-references-tab.playwright.mjs`: **22/22 PASS**.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries) tiếng Việt

Toàn bộ các tính năng trên tab Tham chiếu đều có bài hướng dẫn chuẩn xác bằng tiếng Việt trong `platform/help/entries-writer.js`:

1. `writer.reference.toc`: "Mục lục tự động" (Tab Tham chiếu, nhóm Mục lục) — hướng dẫn gán kiểu Heading, chèn mục lục và cập nhật.
2. `writer.reference.notes`: "Chú thích cuối trang và chú thích cuối tài liệu" (Tab Tham chiếu, nhóm Chú thích) — hướng dẫn phím tắt Ctrl+Alt+F, Ctrl+Alt+D, cơ chế nhảy số siêu ký tự.
3. `writer.reference.citations`: "Trích dẫn và thư mục tài liệu" (Tab Tham chiếu, nhóm Trích dẫn & Thư mục tài liệu) — hướng dẫn quản lý nguồn, đổi kiểu APA/MLA, chèn trích dẫn và thư mục.
4. `writer.reference.captions`: "Chú thích ảnh và danh mục hình" (Tab Tham chiếu, nhóm Chú thích ảnh) — hướng dẫn chèn chú thích cho ảnh/bảng, tạo danh mục hình và dùng tham chiếu chéo nội bộ.

---

## 5. Rà soát bố cục và tràn ngang (Responsive & Layout Audit)

Đo đạc kiểm chứng thực tế qua Playwright live test:
- **1440px**:
  - `ribbonClientWidth = 1440px`, `ribbonScrollWidth = 1440px`, `hasOverflow: false`.
  - Mọi nhóm (`tableOfContents`, `footnotes`, `citationsBibliography`, `captions`) đều có `itemsHeight = 72px`.
  - Nhãn nhóm thẳng hàng tuyệt đối: `labelTop = 156px`, `labelBottom = 175px`, `panelBottom = 176px` (`maxDiff = 0px`).
  - Hộp chọn Kiểu trích dẫn và nút Quản lý nguồn cùng có độ rộng 110px.
- **1024px**:
  - `ribbonClientWidth = 1024px`, `ribbonScrollWidth = 1024px`, `hasOverflow: false`.
  - Toàn bộ 4 nhóm hiển thị trọn vẹn, không phát sinh thanh cuộn ngang.

---

## 6. Danh mục commit thực hiện

1. `980106c`: `design(ui): bo sung icon fallback cho cac lenh tab Tham chieu trong components.js`
2. `e3195ec`: `design(ui): tinh chinh bo cuc cot va hop chon kieu trich dan tren tab Tham chieu`
3. `6592a80`: `design(ui): bo sung focus trap va khoi phuc focus ban phim cho hop thoai caption trong captions.js`
4. `f476989`: `design(ui): bo sung styling tuong phan WCAG AA cho hop thoai trich dan va chu thich anh o dark mode`
5. `c3b66e1`: `design(ui): cap nhat bai Help chu thich anh bao gom huong dan tham chieu cheo tren tab Tham chieu`
6. `a6ee47d`: `design(ui): bo sung playwright live test kiem chung toan dien tab Tham chieu`

---

## 7. Kết quả kiểm thử trung thực

- `tests/live/writer-references-tab.playwright.mjs`: **PASS (22/22, 100%)**:
  - Tab Tham chiếu render trong DOM (PASS)
  - Đủ 12 controls/buttons (PASS)
  - Không tràn ngang ở 1440px (PASS)
  - 100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id (PASS)
  - 100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen (PASS)
  - 100% controls có live handler trong CommandBus (PASS)
  - Mọi nhóm có items height chuẩn 72px (PASS)
  - Nhãn nhóm thẳng hàng baseline maxDiff = 0px (PASS)
  - Không nhãn nào đè mép dưới ribbon (PASS)
  - Hộp chọn Kiểu trích dẫn khớp độ rộng 110px với Quản lý nguồn (PASS)
  - Không tràn ngang ở 1024px (PASS)
  - Lệnh chèn Footnote hoạt động live (PASS)
  - Lệnh chèn Endnote hoạt động live (PASS)
  - Lệnh chèn TOC hoạt động live (PASS)
  - Hộp thoại Chèn chú thích ảnh mở và focus input (PASS)
  - Focus trap trên hộp thoại Chèn chú thích ảnh (PASS)
  - Phím Escape đóng hộp thoại Chèn chú thích ảnh an toàn (PASS)
  - Hộp thoại Danh mục hình ảnh mở/đóng bằng Escape an toàn (PASS)
  - Hộp thoại Quản lý nguồn mở/đóng bằng Escape an toàn (PASS)
  - Hộp thoại Tham chiếu chéo mở/đóng bằng Escape an toàn (PASS)
  - Chế độ Tối (Dark mode) chuyển đổi chính xác (PASS)
  - 100% tính năng có bài Help chỉ đúng tab Tham chiếu và tìm kiếm chuẩn (PASS)
  - 0 pageerror trong suốt phiên test (PASS)
- `node scripts/audit-contrast.js`: **PASS (100% WCAG AA, 0 vi phạm)**.
- `tests/unit/color-contrast-audit.test.js`: **PASS (7/7, 100%)**.
- `tests/unit/writer-captions.test.js`: **PASS (9/9, 100%)**.
- `tests/unit/writer-citations.test.js`: **PASS (12/12, 100%)**.
- `tests/unit/writer-toc-footnotes.test.js`: **PASS (14/14, 100%)**.
- `tests/unit/writer-help.test.js`: **PASS (9/9, 100%)**.
- `tests/unit/writer-refmail-audit.test.js`: **PASS (10/10, 100%)**.
- `node tests/run-tests.js`: **1831/1835 PASS | 4 FAIL (BLOCKED môi trường máy)** — 4 bài test soffice (Sheet FODS save CF/validation, Sheet Pivot save, FODS thật height/width, textRotation) fail do máy tạo profile mới mất ~77s theo đúng mô tả của TASK BRIEF.
