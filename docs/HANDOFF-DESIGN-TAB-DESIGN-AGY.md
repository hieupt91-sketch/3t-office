# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Thiết kế" (Design) & Kiểm tra chế độ Tối — VN Writer (agy)

- **Nhánh**: `design/writer-design-tab-agy` (tách từ `main` `c8f53af`)
- **Worktree**: `E:\VNOffice-agy-design-tab`
- **Phạm vi**:
  - **Việc 1**: Rà soát trực quan tab "Thiết kế" của VN Writer (Ribbon, 2 nhóm lệnh: "Định dạng tài liệu" và "Nền & Viền trang", 4 hộp thoại: Thư viện Chủ đề tài liệu / Hình mờ / Màu trang / Viền trang, Bẫy tiêu điểm bàn phím Focus Trap & Escape, Roving tabindex, Live preview, Responsive 1440px/1024px, 0 tràn ngang, 0 raw command-id, 0 fallback chấm tròn đen, 100% controls có live handler đăng ký trong CommandBus, Hướng dẫn sử dụng tiếng Việt theo AGENTS.md mục 10).
  - **Việc 2**: Kiểm tra và tinh chỉnh độ tương phản chế độ Tối (Dark mode) trên tab Thiết kế: Thẻ chủ đề trong Thư viện chủ đề (thay thế `filter: brightness(1.4)` làm chìm chữ màu tối bằng các mã màu tương phản cao 6.56:1 - 15.93:1 đạt chuẩn WCAG AA/AAA); viền ô màu trang rõ nét trên nền tối; chip gợi ý hình mờ và nút xóa hình mờ/viền trang đạt chuẩn WCAG AA; đảm bảo màu trang của TÀI LIỆU không bị đổi theo giao diện Tối (bảo toàn nội dung người dùng).
  - Tuyệt đối không can thiệp logic adapter xử lý tài liệu; không chạm vào các file của agent khác đang làm song song (`adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `scripts/layout-audit/*`). Không merge vào `main`.
- **Quy tắc ảnh chụp**: Toàn bộ kiểm thử trực quan được kiểm chứng tự động qua Playwright live test (`tests/live/writer-design-tab.playwright.mjs`). KHÔNG commit ảnh chụp màn hình `.png` vào git theo đúng TASK BRIEF.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 thật

Môi trường kiểm chứng thực tế: Đối chiếu với tab **Design** của **Microsoft Word 2016 Professional Plus**.

### 1.1. Bảng đối chiếu các nhóm lệnh trên tab Thiết kế

| STT | Nhóm trên Word 2016 | Lệnh trên Word 2016 | Hiện trạng trên VN Writer | Trạng thái & Đánh giá |
|---|---|---|---|---|
| 1 | **Document Formatting (Định dạng tài liệu)** | • Themes (Chủ đề)<br>• Style Set gallery (Dải bộ kiểu mẫu)<br>• Colors (Bảng màu)<br>• Fonts (Bộ phông)<br>• Paragraph Spacing (Giãn dòng đoạn)<br>• Effects (Hiệu ứng)<br>• Set as Default (Đặt làm mặc định) | • `writer.design.themeGallery` (Chủ đề văn bản) | **Tinh gọn thực tế**: Nút lớn mở hộp thoại Thư viện Kiểu & Chủ đề tài liệu (`showThemeGalleryDialog`). Cung cấp 6 bộ kiểu hoàn chỉnh (Tiêu chuẩn Office, Hành chính Việt Nam NĐ 30, Hiện đại, Trang nhã, Tối giản, Sáng tạo Emerald) thay đổi đồng bộ phông chữ, bảng màu tiêu đề h1/h2/h3 và dãn dòng toàn văn bản. Áp dụng ngay lập tức khi bấm và hỗ trợ hoàn tác qua Ctrl+Z. |
| 2 | **Page Background (Nền trang)** | • Watermark (Hình mờ)<br>• Page Color (Màu trang)<br>• Page Borders (Viền trang) | • `writer.page.watermark` (Hình mờ)<br>• `writer.page.color` (Màu trang)<br>• `writer.page.border` (Viền trang) | **Tương đương 100%**: Đủ cả 3 nút lớn với icon vector sắc nét, đại diện cho 3 tính năng trang trí trang của Word 2016.<br>- **Hình mờ**: Hộp thoại cấu hình chữ mờ (Dự thảo, Mật, Tuyệt mật, Khẩn, Bản sao), chọn màu, góc nghiêng 45°/0°/-45°, thanh trượt độ mờ và nút xóa hình mờ.<br>- **Màu trang**: Hộp thoại lưới 12 ô màu chuẩn và bảng chọn màu tùy biến (HTML5 color picker), hỗ trợ phím mũi tên điều hướng ô màu.<br>- **Viền trang**: Hộp thoại chọn kiểu nét (Liền, Đứt, Đôi), độ dày (1 - 6 pt), màu viền và khung xem trước trực quan (Live Preview) mô phỏng trang in. |

### 1.2. Đánh giá khoảng trống tính năng (Gaps vs Word 2016)

- **Khoảng trống chủ động (Deliberate omissions)**:
  - *Tách riêng Colors / Fonts / Paragraph Spacing / Effects*: Word chia nhỏ các thành phần theme thành 4 menu con độc lập. VN Writer tinh gọn hợp nhất thành các Theme hoàn chỉnh (Typography + Color Palette + Spacing) theo triết lý định dạng tài liệu một chạm (One-click document formatting), đặc biệt có sẵn mẫu chuẩn thể thức hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).
  - *Set as Default (Lưu làm mặc định cho mọi tài liệu mới)*: Cần hệ thống lưu trữ template `.dotx` phức tạp trên máy, chưa cần thiết cho bản phát hành hiện tại.
  - *Hình mờ bằng hình ảnh (Picture Watermark)*: Hiện tại VN Writer tập trung đáp ứng hoàn hảo nhu cầu đóng dấu văn bản hành chính Việt Nam (chữ in chéo DỰ THẢO, MẬT, KHẨN...).
- **Khoảng trống cho lộ trình tương lai**:
  - Dải thanh cuộn Quick Style Sets trực tiếp trên Ribbon (giống strip Quick Styles trên tab Home).
  - Tùy chọn nền chuyển sắc (Gradient fill) hoặc hoa văn (Pattern/Texture) cho Màu trang.
  - Viền trang hoa văn nghệ thuật (Art borders).

---

## 2. Việc 2 — Tinh chỉnh và kiểm chứng chế độ Tối (Dark mode) trên tab Thiết kế

### 2.1. Vấn đề phát hiện
1. **Thẻ chủ đề trong Thư viện Chủ đề bị chìm chữ**:
   - Trước đây trong `apps/writer/writer.css`, chế độ Tối chỉ áp dụng bộ lọc `filter: brightness(1.4)` cho thẻ chủ đề `.vno-theme-card strong`.
   - Vì chủ đề **Hành chính Việt Nam (NĐ 30)** có `h1Color: #000000` (màu đen), phép nhân `0 * 1.4 = 0` khiến tiêu đề giữ nguyên màu đen `#000000` trên nền tối `#1e1e1e` -> Tương phản chỉ **1.1:1** (hoàn toàn không đọc được!).
   - Các chủ đề khác như **Tối giản (Minimalist)** (`#3f3f46` -> tương phản ~1.8:1), **Tiêu chuẩn (Office)** (`#0f4c81` -> tương phản ~2.4:1), **Trang nhã (Elegant)** (`#854d0e` -> tương phản ~3.1:1) đều vi phạm nghiêm trọng chuẩn WCAG AA (yêu cầu ≥ 4.5:1).
   - Ba chấm màu đại diện cho bảng màu (palette dots) của chủ đề Hành chính là màu đen `#000000` cũng bị chìm hoàn toàn vào nền thẻ tối.
2. **Viền ô màu trang (Page Color Swatches) thiếu rõ nét trên nền tối**:
   - Các ô màu trong hộp thoại Màu trang không có class CSS chuyên biệt và sử dụng viền mặc định `var(--vno-border-default)` (`#3e3e42` trong Dark mode).
   - Khi hiển thị các ô màu tối như đen than `#1e293b`, viền ô màu bị chìm vào nền dialog `#252526`, khó phân biệt ranh giới ô màu.
3. **Độ tương phản của nút xóa nguy hiểm và chip gợi ý**:
   - Nút "Xóa hình mờ" và "Xóa viền trang" dùng màu chữ đỏ `#dc2626` trực tiếp trong inline style, khi mở dialog ở Dark mode chỉ đạt tương phản **~2.85:1** trên nền tối.

### 2.2. Giải pháp thực hiện
1. **Thiết lập bảng màu tiêu đề chủ đề đạt chuẩn WCAG AA/AAA trong Dark mode**:
   - Khai báo selector chuyên biệt theo `data-theme-id` cho từng thẻ chủ đề trong `apps/writer/writer.css`:
     - **Tiêu chuẩn (Office)**: Chuyển sang `#60a5fa` -> Tương phản **6.56:1** (**ĐẠT WCAG AA**).
     - **Hành chính Việt Nam (NĐ 30)**: Chuyển sang `#f8fafc` -> Tương phản **15.93:1** (**ĐẠT WCAG AAA**).
     - **Hiện đại (Modern)**: Chuyển sang `#38bdf8` -> Tương phản **6.86:1** (**ĐẠT WCAG AA**).
     - **Trang nhã (Elegant)**: Chuyển sang `#fbbf24` -> Tương phản **9.99:1** (**ĐẠT WCAG AAA**).
     - **Tối giản (Minimalist)**: Chuyển sang `#e2e8f0` -> Tương phản **13.52:1** (**ĐẠT WCAG AAA**).
     - **Sáng tạo (Emerald)**: Chuyển sang `#34d399` -> Tương phản **8.67:1** (**ĐẠT WCAG AAA**).
   - Bổ sung viền sáng `box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35)` cho lớp `.vno-theme-palette-dot` để 3 chấm màu bảng màu hiển thị rõ ràng trên nền tối.
   - Thẻ đang chọn (`.vno-theme-card.is-selected`) sử dụng nền `var(--vno-writer-light, #172554)` và viền `var(--vno-writer-primary-fg, #60a5fa)` nổi bật.
2. **Chuẩn hóa lớp `.vno-page-color-swatch` cho ô màu trang**:
   - Định dạng viền ô màu `#64748b` ở chế độ Tối, giúp 100% (12/12) ô màu (kể cả ô đen than `#1e293b` và trong suốt) hiển thị sắc nét ranh giới trên nền tối.
   - Hiệu ứng hover phóng to nhẹ `scale(1.08)` và viền sáng hơn `#94a3b8`.
   - Ô đang chọn (`aria-selected="true"`) có viền xanh `#60a5fa` kèm vòng hào quang `box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.5)`.
3. **Màu trang của TÀI LIỆU không bị đổi theo giao diện Tối**:
   - Kiểm chứng và xác nhận màu trang do người dùng thiết lập (`this.pageColor` được gắn inline qua `style.backgroundColor` trên `.vno-writer-page`) hoàn toàn độc lập với CSS giao diện Tối `[data-theme="dark"]`.
   - Khi người dùng chọn màu trang `#dbeafe` (xanh nhạt), việc bật/tắt nút "Tối" chỉ đổi màu theme ứng dụng (ribbon, header, toolbar, sidebar), trang tài liệu vẫn giữ nguyên màu nền `#dbeafe` của người dùng.
4. **Chuẩn hóa nút xóa nguy hiểm và chip gợi ý trong Dark mode**:
   - Chip gợi ý hình mờ `.vno-watermark-chip`: Chuyển sang nền `#262f3d`, viền `#475569`, chữ `#cbd5e1` -> Tương phản **9.09:1** (**ĐẠT WCAG AAA**). Khi hover, chuyển sang nền `#334155`, chữ `#93c5fd` -> Tương phản **5.74:1** (**ĐẠT WCAG AA**).
   - Nút xóa nguy hiểm `.vno-wm-btn-remove` và `.vno-border-btn-remove`: Chuyển sang chữ đỏ dịu `#f87171` và viền `#7f1d1d` -> Tương phản **6.03:1** (**ĐẠT WCAG AA**).

---

## 3. Danh sách vấn đề phát hiện và xử lý trên tab Thiết kế

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Thiếu từ khóa fallback cho các lệnh tab Thiết kế trong `resolveIcon` (components.js)** | **ĐÃ SỬA** | **Hiện trạng**: Nếu `resolveIcon` được gọi trực tiếp bằng `commandId` mà không kèm `iconName`, các lệnh `writer.design.themeGallery`, `writer.page.watermark`, `writer.page.color`, `writer.page.border` không khớp từ khóa nào và bị rơi xuống biểu tượng chấm tròn fallback `circle cx="12" cy="12" r="4"`!<br>**Giải pháp**: Bổ sung các matcher chuyên biệt trong `platform/ui-kit/components.js`: `themegallery` / `design.theme` -> `ICONS.themeGallery`, `watermark` -> `ICONS.pageWatermark`, `page.color` / `pagecolor` -> `ICONS.pageColor`, `page.border` / `pageborder` -> `ICONS.pageBorder`. |
| 2 | **Độ tương phản chữ trong Thư viện Chủ đề tài liệu ở chế độ Tối vi phạm WCAG AA** | **ĐÃ SỬA** | **Hiện trạng**: `filter: brightness(1.4)` không có tác dụng với màu đen `#000000` của chủ đề Hành chính NĐ 30 (tương phản 1.1:1) và không đủ nâng độ tương phản của các chủ đề Minimalist (1.8:1), Office (2.4:1), Elegant (3.1:1) lên chuẩn 4.5:1.<br>**Giải pháp**: Gán class `vno-theme-card-title` và định nghĩa màu chữ chuyên biệt theo `data-theme-id` trong `apps/writer/writer.css`, đạt tỷ lệ tương phản từ 6.56:1 đến 15.93:1 trên nền thẻ tối. |
| 3 | **Hộp thoại Màu trang thiếu đóng khi bấm ra ngoài overlay và thiếu phím mũi tên điều hướng** | **ĐÃ SỬA** | **Hiện trạng**: Trong `apps/writer/page-decorations.js`, `showPageColorDialog` thiếu sự kiện `click` trên `overlay` để đóng khi nhấn ra ngoài; các ô màu chưa có phím mũi tên (ArrowLeft/Right/Up/Down/Home/End) để duyệt bằng bàn phím theo WAI-ARIA listbox pattern.<br>**Giải pháp**: Bổ sung bẫy click đóng overlay, gán class `.vno-page-color-swatch`, cài đặt roving tabindex và sự kiện `keydown` điều hướng 4 chiều linh hoạt giữa 12 ô màu. |
| 4 | **Độ tương phản chữ mẫu trong khung xem trước Viền trang (Live Preview)** | **ĐÃ SỬA** | **Hiện trạng**: Chữ mẫu tài liệu trong khung xem trước viền `#vno-border-preview-sheet` dùng màu `#94a3b8` trên nền giấy trắng `#fff`, tỷ lệ tương phản chỉ đạt ~2.7:1.<br>**Giải pháp**: Đổi màu chữ sang `#64748b`, nâng tỷ lệ tương phản lên **4.76:1** (đạt chuẩn WCAG AA). |
| 5 | **Nội dung Hướng dẫn sử dụng (Help entries) tiếng Việt cho tab Thiết kế** | **ĐÃ HOÀN THIỆN** | **Hiện trạng & Giải pháp**: Rà soát cả 3 bài Help (`writer.design.themes`, `writer.page.color`, `writer.page.watermarkBorder`) trong `platform/help/entries-writer.js`: 100% khớp đúng tên tab "Thiết kế" và tên 2 nhóm "Định dạng tài liệu" và "Nền & Viền trang". Bổ sung từ khóa tìm kiếm tiếng Việt và tiếng Anh ("thiết kế", "design", "kiểu dáng", "style set", "document formatting", "page background"). |

---

## 4. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ 4 controls trên tab Thiết kế của VN Writer:

1. `writer.design.themeGallery` (Chủ đề văn bản): Mở hộp thoại Thư viện Chủ đề tài liệu, chọn giữa 6 bộ định dạng (Office, NĐ 30, Modern, Elegant, Minimalist, Emerald) và áp dụng ngay lập tức cho toàn văn bản.
2. `writer.page.watermark` (Hình mờ): Mở hộp thoại cấu hình hình mờ với 5 từ khóa chuẩn (Dự thảo, Mật, Tuyệt mật, Khẩn, Bản sao), góc nghiêng và độ mờ.
3. `writer.page.color` (Màu trang): Mở hộp thoại cấu hình màu nền đặc cho tài liệu từ bảng 12 màu chuẩn hoặc bộ chọn màu tùy ý.
4. `writer.page.border` (Viền trang): Mở hộp thoại cấu hình khung viền trang với 3 kiểu nét (Liền, Đứt, Đôi), 6 mức độ dày và khung xem trước trực quan.

- **Kết quả kiểm tra**: **100% (4/4) controls đều có live handler hoạt động thật** được đăng ký trong `WriterAdapter.attach()` và gắn vào `globalCommandBus`. Đã kiểm chứng tự động qua Playwright live test: **30/30 assertions PASS**.

---

## 5. Rà soát bố cục và tràn ngang (Responsive & Layout Audit)

Đo đạc kiểm chứng thực tế qua Playwright live test:
- **Độ phân giải 1440px**:
  - `ribbonClientWidth = 1440px`, `ribbonScrollWidth = 1440px`, `hasOverflow: false` (0 tràn ngang).
  - Chiều cao các khối items trong nhóm đạt chuẩn 72px.
  - Nhãn các nhóm (`Định dạng tài liệu`, `Nền & Viền trang`) thẳng hàng tuyệt đối trên cùng một đường cơ sở (`labelTop = 156px`, `labelBottom = 175px`, `panelBottom = 176px`, sai lệch `maxDiff = 0px`).
  - Không nhãn nào đè hoặc chạm mép dưới ribbon.
- **Độ phân giải 1024px**:
  - `ribbonClientWidth = 1024px`, `ribbonScrollWidth = 1024px`, `hasOverflow: false` (0 tràn ngang).
  - Cả 2 nhóm lệnh hiển thị sắc nét, thoáng đãng, chiếm ~360px/1024px, hoàn toàn không phát sinh thanh cuộn ngang.

---

## 6. Danh mục commit thực hiện

1. `656387e`: `design(ui): bo sung icon fallback cho cac lenh tab Thiet ke trong components.js`
2. `865c47f`: `design(ui): tinh chinh kha nang tiep can va focus ban phim cho cac hop thoai tab Thiet ke`
3. `99c9106`: `design(ui): tinh chinh tuong phan WCAG AA che do Toi cho gallery chu de, o mau va hop thoai tab Thiet ke`
4. `acc7618`: `design(ui): ra soat va hoan thien noi dung Help tieng Viet cho tab Thiet ke`
5. `400e60b`: `design(ui): bo sung playwright live test kiem chung toan dien tab Thiet ke va che do Toi`
6. `docs(handoff): ban giao ra soat thiet ke truc quan tab Thiet ke Writer va che do Toi (agy)`

---

## 7. Kết quả kiểm thử trung thực

- `tests/live/writer-design-tab.playwright.mjs`: **PASS (30/30 assertions, 100%)**:
  - Tab Thiết kế render chuẩn trong DOM (PASS)
  - Đủ 4 controls/buttons theo đúng thiết kế (PASS)
  - Không tràn ngang ở 1440px (PASS)
  - 100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id (PASS)
  - 100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen (PASS)
  - 100% controls có live handler trong CommandBus (PASS)
  - Mọi nhóm có items height chuẩn 72px (PASS)
  - Nhãn nhóm thẳng hàng baseline maxDiff = 0px (PASS)
  - Không nhãn nào đè mép dưới ribbon (PASS)
  - Không tràn ngang ở 1024px (PASS)
  - Hộp thoại Thư viện Chủ đề mở thành công với đủ 6 thẻ theme (PASS)
  - Phím Tab được giữ trong phạm vi hộp thoại Chủ đề (Focus Trap) (PASS)
  - Phím Escape đóng hộp thoại Chủ đề an toàn và khôi phục focus (PASS)
  - Áp dụng chủ đề 'modern' cập nhật thuộc tính data-vno-theme trên trang (PASS)
  - Hộp thoại Hình mờ mở, tự động focus ô text và hiển thị 5 chip gợi ý (PASS)
  - Nhấn chip gợi ý cập nhật giá trị ô chữ hình mờ thành 'TUYỆT MẬT' (PASS)
  - Phím Tab được giữ trong phạm vi hộp thoại Hình mờ (Focus Trap) (PASS)
  - Áp dụng hình mờ hiển thị đúng lớp chữ phủ 'TUYỆT MẬT' trên trang (PASS)
  - Hộp thoại Màu trang mở thành công với 12 ô màu bảng chuẩn (PASS)
  - Phím Tab được giữ trong phạm vi hộp thoại Màu trang (Focus Trap) (PASS)
  - Áp dụng màu trang cập nhật màu nền tài liệu thành #dbeafe (rgb 219, 234, 254) (PASS)
  - Hộp thoại Viền trang mở và hiển thị khung xem trước trực quan (Live Preview) (PASS)
  - Thay đổi kiểu viền cập nhật trực tiếp khung xem trước (PASS)
  - Phím Tab được giữ trong phạm vi hộp thoại Viền trang (Focus Trap) (PASS)
  - Áp dụng viền trang tạo khung viền .vno-page-border-frame trên trang tài liệu (PASS)
  - Chế độ Tối: Màu trang của TÀI LIỆU không bị đổi theo giao diện Tối (giữ nguyên #dbeafe của người dùng) (PASS)
  - Chế độ Tối: 100% (6/6) thẻ chủ đề tài liệu đạt chuẩn tương phản WCAG AA (>= 4.5:1) (PASS)
  - Chế độ Tối: 100% (12/12) ô màu trang có viền sắc nét nhìn rõ trên nền tối (PASS)
  - Chế độ Tối: Chip gợi ý hình mờ và nút xóa hình mờ đạt chuẩn tương phản WCAG AA (PASS)
  - 100% tính năng tab Thiết kế có bài Help tiếng Việt chỉ đúng tab 'Thiết kế' và tìm kiếm chuẩn (PASS)
  - 0 pageerror trong suốt phiên kiểm thử Playwright (PASS)
- `node scripts/audit-contrast.js`: **PASS (17/17 token pairs, 0 vi phạm CSS)**.
- `tests/unit/color-contrast-audit.test.js`: **PASS (7/7, 100%)**.
- `tests/unit/writer-style-gallery-watermark.test.js`: **PASS (100%)**.
- `tests/unit/writer-help.test.js`: **PASS (9/9, 100%)**.
- `node tests/run-tests.js`: **PASS 1835/1835 (0 FAIL, 100%)**.

---

## 8. Vòng 2 — Sửa lỗi bàn phím: Phím mũi tên & Enter áp dụng đúng ô đang focus

### 8.1. Hiện trạng & Nguyên nhân
1. **Lỗi trong `showPageColorDialog` (`apps/writer/page-decorations.js`)**:
   - Khi người dùng dùng phím mũi tên di chuyển focus tới một ô màu khác rồi bấm `Enter`, hộp thoại lại áp dụng màu đã chọn trước đó.
   - **Nguyên nhân**: Sự kiện `keydown` phím mũi tên chỉ thay đổi `tabIndex` và gọi `button.focus()`, hoàn toàn không cập nhật biến trạng thái `selected`. Khi bấm `Enter`, listener `keydown` trên `document` bắt sự kiện trước khi sự kiện `click` của button kịp phát sinh, và gọi `finish(selected)` với giá trị màu cũ ban đầu.
2. **Lỗi tương tự trong `showThemeGalleryDialog` (`apps/writer/theme-gallery.js`)**:
   - Phím mũi tên giữa các thẻ theme cũng chỉ đổi roving `tabIndex` và focus (kèm ghi chú cũ `// Di chuyển focus (không chọn - chỉ focus)`), không cập nhật `selectedThemeId`. Khi bấm `Enter`, `onKeyDown` gọi `cleanup(selectedThemeId)` với theme cũ.
   - Hộp thoại cũng thiếu focus tự động vào thẻ đang chọn khi vừa mở ra.
3. **Lỗi Enter khi focus nút Hủy / Đóng / Xóa trong các hộp thoại**:
   - Trong `showPageColorDialog`, `showWatermarkDialog`, `showPageBorderDialog`, và `showThemeGalleryDialog`, nếu người dùng tab tới nút "Hủy", "Đóng" hoặc "Xóa", bấm `Enter` lại bị `onKeyDown` bắt và kích hoạt nút OK / Apply thay vì hủy/xóa.

### 8.2. Giải pháp thực hiện (theo chuẩn Microsoft Word)
1. **Chuẩn hóa `showPageColorDialog`**:
   - Tạo hàm `selectSwatch(targetIdx, shouldFocus)` đồng bộ toàn bộ: cập nhật `selected = swatches[targetIdx].dataset.pageColor`, cập nhật thuộc tính ARIA `aria-selected="true/false"`, gán `tabIndex = 0 / -1` và chuyển focus.
   - Phím mũi tên (ArrowLeft/Right/Up/Down/Home/End) và phím Space khi bấm đều gọi `selectSwatch`, giúp việc di chuyển focus **đồng thời chọn** ô màu đó theo đúng trải nghiệm Word.
   - Trong `onKey` của document:
     - Nếu `document.activeElement` là nút Hủy hoặc Đóng: bấm `Enter` gọi `finish(null)`.
     - Nếu `document.activeElement` là ô màu: cập nhật `selected = active.dataset.pageColor` trước khi gọi `finish(selected)`.
2. **Chuẩn hóa `showThemeGalleryDialog`**:
   - Tạo hàm `selectThemeCard(targetIdx, shouldFocus)` đồng bộ: cập nhật `selectedThemeId = cards[targetIdx].dataset.themeId`, cập nhật class `.is-selected`, cập nhật `aria-checked="true/false"`, gán `tabIndex = 0 / -1` và chuyển focus.
   - Phím mũi tên và Space đồng thời di chuyển và chọn.
   - Tự động focus vào thẻ theme đang chọn khi mở hộp thoại (`activeCard?.focus()`).
   - Xử lý an toàn cho phím `Enter` khi focus vào thẻ theme hoặc nút Hủy/Đóng.
3. **Chuẩn hóa `showPageBorderDialog` và `showWatermarkDialog`**:
   - Xử lý trong `onKeyDown`: khi focus vào nút Hủy, nút Đóng hoặc nút Xóa (Xóa viền / Xóa hình mờ), phím `Enter` thực hiện đúng hành động hủy hoặc xóa, không tự ý bấm nút OK.

### 8.3. Bổ sung kiểm thử tự động Playwright (`tests/live/writer-design-tab.playwright.mjs`)
- **Kiểm thử bàn phím Thư viện Chủ đề**:
  - Mở hộp thoại Chủ đề, bấm `ArrowRight` 2 lần (từ "office" tới "modern").
  - Bấm `Enter`.
  - Xác nhận thuộc tính `data-vno-theme` trên trang tài liệu được cập nhật đúng bằng theme của thẻ đang focus (`modern`).
- **Kiểm thử bàn phím Màu trang**:
  - Mở hộp thoại Màu trang, bấm `ArrowRight` 2 lần (từ "transparent" tới `#f8fafc`).
  - Bấm `Enter`.
  - Xác nhận màu nền tài liệu trên trang đúng bằng màu của ô đang focus (`#f8fafc` / `rgb(248, 250, 252)`).
  - Mở lại hộp thoại chọn `#dbeafe` để đảm bảo chuỗi kiểm thử chế độ Tối (Dark mode) phía sau tiếp tục chạy chuẩn xác.

### 8.4. Kết quả kiểm thử trung thực Vòng 2
- `tests/live/writer-design-tab.playwright.mjs`: **PASS (32/32 assertions, 100%)**:
  - `Bàn phím hộp thoại Chủ đề: ArrowRight 2 lần rồi Enter áp dụng đúng thẻ theme đang focus ('modern')` -> **PASS**
  - `Bàn phím hộp thoại Màu trang: ArrowRight 2 lần rồi Enter áp dụng đúng màu của ô đang focus (#f8fafc)` -> **PASS**
  - 100% các assertion kiểm thử Ribbon, Focus trap, Dark mode WCAG AA, Help entries đều tiếp tục **PASS**.
- `node tests/run-tests.js`: **PASS 1835/1835 (0 FAIL, 100%)**.

