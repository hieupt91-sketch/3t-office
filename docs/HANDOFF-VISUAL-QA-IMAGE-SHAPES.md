# Báo cáo: Đánh giá thiết kế trực quan (Visual QA) & Khắc phục giao diện ẢNH và HÌNH KHỐI

TASK: Đánh giá thiết kế trực quan (Visual QA) độc lập cho phần hiển thị ẢNH và HÌNH KHỐI (image/shape) trên cả 3 ứng dụng VN Office (Sheet, Writer, Slides)
AGENT/ROLE: Visual QA & UI/UX Design Specialist (agy)
BRANCH: chore/visual-qa-image-shapes
WORKTREE: E:\VNOffice-agy-visual-qa-images
OBJECTIVE: Rà soát toàn diện trải nghiệm thị giác, CSS, độ tương phản WCAG 2.1 AA, phản hồi hover/focus, dark mode, chồng lấn UI khi thao tác với ảnh và hình khối; khắc phục triệt để các vấn đề trực quan bằng CSS chuẩn token; xác minh và báo cáo chi tiết khoảng trống tính năng (feature gap) xoay hình trong VN Slides.

---

## 1. Tóm tắt kết quả thực hiện

- **Phạm vi an toàn**: Chỉ can thiệp các tệp kiểu dáng (`apps/sheet/sheet.css`, `apps/writer/writer.css`, `apps/slides/slides.css`). Tuyệt đối không thay đổi logic JavaScript, data-model hay parse/serialize của Core.
- **Kiểm thử chất lượng**:
  - `node scripts/check-syntax.js`: **89/89 PASS** (100%).
  - `node scripts/audit-contrast.js`: **100% PASS** đạt chuẩn WCAG 2.1 AA (toàn bộ tỷ lệ tương phản >= 4.5:1).
  - `node tests/run-tests.js`: **1444/1444 PASS | 0 FAIL** (100%).
  - `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS** (104/104 tab ở 2 độ phân giải 1280px/1920px và 2 ngôn ngữ VI/EN, 0px tràn ngang).
- **Tư liệu trực quan**: Đã chụp và lưu trữ toàn bộ 20 ảnh chụp màn hình kiểm thử tại `docs/screenshots/visual-qa-images/` trên trình duyệt Microsoft Edge headless ở cả 2 chủ đề Sáng (Light) và Tối (Dark).

---

## 2. Chi tiết đánh giá trực quan & Các vấn đề đã khắc phục

### 2.1. VN Sheet: Thẻ ảnh (Image Card) & Nút xóa ảnh

#### Các vấn đề trực quan phát hiện:
1. **Lỗi hiển thị Dark Mode nghiêm trọng**: Thẻ ảnh (`.vno-sheet-image`) được tạo động với kiểu nội dòng `background: #fff; border: 1px solid #94a3b8`. Khi bật Dark Mode, toàn bộ bảng tính có nền xám đen `#1e1e1e`, nhưng thẻ ảnh lại biến thành một khối hộp chữ nhật màu trắng chói mắt, phá vỡ hoàn toàn thẩm mỹ Fluent Dark Mode.
2. **Nút xóa ảnh ("×") quá nhỏ, vi phạm chuẩn tiếp cận (A11y)**: Nút xóa `button[data-image-delete]` không được gán kích thước cố định, chiều rộng tính toán chỉ có **11px** (bằng đúng độ rộng ký tự "×") và chiều cao 21px. Kích thước này vi phạm khuyến nghị kích thước vùng nhấp tối thiểu của WCAG 2.1 (ít nhất 24×24px), khiến người dùng rất khó nhấp trúng chuột. Ngoài ra nút có nền trắng và chữ đen cố định, không có trạng thái hover, focus hay phản hồi thị giác.
3. **Thiếu phản hồi chọn và hover (Feedback states)**: Thẻ ảnh không có viền báo sáng khi hover hoặc focus-within, khiến người dùng không rõ ảnh đang được tương tác.
4. **Kiểm tra cuộn và chồng lấn tiêu đề/thanh công thức**:
   - Khi bảng tính cuộn (ví dụ cuộn qua ô C3 hoặc cuộn đến ô xa H20), ảnh trượt mượt mà bên dưới các tiêu đề cố định: Tiêu đề cột (`z-index: 10`), Tiêu đề hàng (`z-index: 9`), Góc lưới (`z-index: 20`) đều nằm đè lên lớp ảnh `imageLayer` (`z-index: 7`). Ảnh bị che khuất đúng chuẩn bên dưới hàng/cột tiêu đề mà không bị tràn hay đè lên chữ tiêu đề.
   - Thanh công thức (Formula Bar) nằm hoàn toàn bên ngoài container cuộn của lưới (`.vno-grid-viewport`), do đó không xảy ra bất kỳ hiện tượng che lấp nào với thanh công thức.

#### Khắc phục trực tiếp bằng CSS (`apps/sheet/sheet.css`):
- Định kiểu lại `.vno-sheet-image`: Sử dụng biến nền `var(--vno-bg-window, #ffffff)` cho Light Mode và `var(--vno-bg-surface, #2d2d30)` cho Dark Mode; viền màu `var(--vno-border-strong, #52525b)` cùng đổ bóng đa lớp tự nhiên.
- Thêm trạng thái `:hover` và `:focus-within`: Viền chuyển sang màu xanh lá thương hiệu VN Sheet (`var(--vno-sheet-primary, #0f6d38)` trên Light, `#4ade80` trên Dark) kèm hiệu ứng viền phát sáng (glow) tinh tế.
- Tái cấu trúc nút xóa ảnh `button[data-image-delete]`:
  - Kích thước chuẩn **24×24px**, hiển thị `display: flex; align-items: center; justify-content: center;`.
  - Nền và chữ tự động thích ứng Dark Mode (`var(--vno-bg-subtle, #3e3e42)`, chữ `#f1f5f9`).
  - Hiệu ứng Hover: Đổi màu nền sang đỏ cảnh báo chuẩn `#dc2626` (đạt tỷ lệ tương phản 4.83:1 với chữ trắng, vượt chuẩn WCAG AA 4.5:1), viền `#b91c1c`, phóng to nhẹ `scale(1.1)` và đổ bóng đỏ mềm.
  - Hỗ trợ đầy đủ `:focus-visible` với vòng viền xanh 2px.

---

### 2.2. VN Writer: Bố cục ảnh văn bản, Tab Ribbon ngữ cảnh & Xem trước khi in

#### Các vấn đề trực quan phát hiện:
1. **Mất tương phản nghiêm trọng trên Ribbon Dark Mode**: Khi nhấp chọn ảnh trong Writer, tab ngữ cảnh "Định dạng Hình ảnh" (`pictureFormat`) xuất hiện cùng nhóm điều khiển sắp xếp (`.vno-writer-arrange-group`). Trong tệp CSS cũ:
   - Các nhãn `<label>` bị gán màu cố định `color: #334155` (xám đậm). Trên nền ribbon Dark Mode (`#2d2d30`), chữ gần như chìm hẳn vào nền với tỷ lệ tương phản chỉ xấp xỉ 1.3:1 (không thể đọc được).
   - Các ô chọn `<select>` và nút bấm `<button>` mang nền trắng `#fff` và chữ đen `#0f172a`, tạo thành các đốm trắng lạc lõng trên thanh công cụ ribbon tối.
   - Các nút "Đưa lên" / "Đưa xuống" thiếu hoàn toàn hiệu ứng hover/focus.
2. **Đường viền ảnh được chọn trong Dark Mode**: Viền chọn `.is-vno-image-selected` sử dụng màu xanh dương đậm `#2563eb`, khi xem tài liệu trên nền tối có độ tương phản chưa tối ưu.
3. **Bố cục văn bản bao quanh và Xem trước khi in (Print Preview)**:
   - Ảnh chèn giữa các đoạn văn dài duy trì tỷ lệ khung hình chính xác, không làm xô lệch hoặc gãy hàng các đoạn văn bản xung quanh.
   - Khi mở Xem trước khi in (`writer.file.printPreview` - Ctrl+F2), nội dung tài liệu và ảnh hiển thị nguyên vẹn. Tuy nhiên trong CSS của overlay in chưa có định nghĩa rõ ràng cho phần tử `img` bên trong `.vno-print-preview-body`.

#### Khắc phục trực tiếp bằng CSS (`apps/writer/writer.css`):
- Tinh chỉnh `.vno-writer-arrange-group` cho Ribbon ngữ cảnh:
  - Nhãn `<label>` dùng biến `var(--vno-text-secondary, #334155)`, ở Dark Mode chuyển sang `var(--vno-text-muted, #94a3b8)` đạt độ tương phản sắc nét.
  - Các ô chọn `<select>` và nút bấm `<button>` đồng bộ với hệ thống theme: nền xám tối `#2d2d30`, viền `#52525b`, chữ sáng `#f1f5f9` trên nền tối; hover đổi màu nền sang `#3e3e42` và viền xanh sáng `#60a5fa`.
  - Bổ sung chỉ báo `:focus-visible` chuẩn mực.
- Tăng cường viền chọn ảnh `.vno-writer-body img.is-vno-image-selected`: Bổ sung đổ bóng viền ngoài `box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.2)`; ở Dark Mode đường viền chuyển sang xanh sáng `#60a5fa` kèm quầng sáng nhẹ nhàng.
- Bổ sung quy tắc kiểu dáng in an toàn: `.vno-print-preview-body img { max-width: 100%; height: auto; object-fit: contain; }` đảm bảo ảnh không bao giờ tràn lề trang in.

---

### 2.3. VN Slides: Lớp phủ chọn hình khối, Nút xóa & Xung đột tay cầm

#### Các vấn đề trực quan phát hiện:
1. **Xung đột vị trí và z-index giữa Nút xóa và Tay cầm co giãn Tây Bắc (NW Handle)**:
   - Khi một hình khối (Rectangle, Ellipse) hoặc Ảnh được chọn trên canvas Slides, `_ensureShapeSelectionHandles` gắn 8 tay cầm co giãn (`.vno-shape-resize-handle`) và nút xóa (`.vno-shape-delete-btn`).
   - Trong CSS cũ: Nút xóa đặt tại `top: -10px; left: -10px; z-index: 11;`, trong khi tay cầm NW đặt tại `top: -4px; left: -4px; z-index: 25;`.
   - **Hậu quả thị giác và tương tác**: Tay cầm co giãn NW có `z-index: 25` cao hơn nút xóa (`z-index: 11`), nằm đè lên góc của nút xóa màu đỏ. Khi người dùng di chuột vào góc trên bên trái định bấm nút xóa, sự kiện con trỏ bị tay cầm NW chặn lại, khiến thao tác bấm xóa biến thành kéo co giãn kích thước hình khối.
2. **Đường viền nút xóa ở Dark Mode**: Nút xóa có viền trắng cố định `border: 2px solid #ffffff`, trông chói gắt trên nền tối.

#### Khắc phục trực tiếp bằng CSS (`apps/slides/slides.css`):
- Nâng `z-index` của `.vno-shape-delete-btn` từ `11` lên **`30`** (cao hơn `z-index: 25` của 8 tay cầm co giãn), đảm bảo nút xóa luôn nằm trên cùng và tiếp nhận chính xác sự kiện nhấp chuột.
- Sử dụng biến màu viền `border: 2px solid var(--vno-bg-surface, #ffffff)`, tự động chuyển sang viền tối `#1e1e1e` ở Dark Mode.
- Thêm hiệu ứng hover phóng to nhẹ `scale(1.15)` và đổ bóng đỏ cảnh báo `box-shadow: 0 3px 8px rgba(220, 38, 38, 0.4)`.

---

## 3. Xác minh khoảng trống tính năng (Feature Gap): Tính năng Xoay hình trong VN Slides

Theo yêu cầu kiểm tra đặc biệt tại mục 4 của chỉ dẫn:

| Tiêu chí kiểm tra | Kết quả kiểm tra thực tế | Chi tiết kỹ thuật |
|---|---|---|
| **(a) Có nút / tay cầm xoay trên canvas khi chọn hình khối?** | **HOÀN TOÀN KHÔNG CÓ** | `_ensureShapeSelectionHandles()` chỉ tạo 8 tay cầm co giãn (nw, n, ne, e, se, s, sw, w) và 1 nút xóa. Không có tay cầm xoay đỉnh (rotation stem / green circular handle) như PowerPoint hay Google Slides. |
| **(b) Có ô nhập góc xoay / nút xoay trên Ribbon hoặc Context Menu?** | **HOÀN TOÀN KHÔNG CÓ** | Thanh Ribbon chỉ có dropdown "Hướng văn bản" (`slides.text.direction`) để xoay chữ bên trong hình (90°, 270°, stacked). Menu ngữ cảnh chuột phải (`_openShapeContextMenu`) không có tùy chọn xoay hình. |
| **(c) Code dựng hình (`slides-canvas.js`) có hỗ trợ thuộc tính xoay không?** | **HOÀN TOÀN KHÔNG CÓ** | Trong `_renderShapesLayer()`, phần tử hình vẽ chỉ áp dụng tọa độ hình học phẳng: `left:${shape.x}px; top:${shape.y}px; width:${shape.w}px; height:${shape.h}px;`. Không có bất kỳ dòng lệnh nào đọc `shape.rotation` hay áp dụng CSS `transform: rotate(...)`. |

> [!IMPORTANT]
> **KẾT LUẬN KHOẢNG TRỐNG TÍNH NĂNG (FEATURE GAP)**:
> Tính năng xoay hình khối/ảnh trên UI của VN Slides hiện **hoàn toàn chưa tồn tại**.
> Đây là một tính năng phức tạp bao gồm:
> 1. Tay cầm xoay trực quan trên canvas kèm tính toán góc kéo chuột (`Math.atan2`).
> 2. Cơ chế render CSS `transform: rotate(Ndeg)` trên canvas và thumbnail.
> 3. Hệ thống chuyển đổi ma trận tọa độ bounding box khi di chuyển/co giãn hình đã xoay.
> 4. Logic đọc/ghi góc xoay vào chuẩn FODP/PPTX (`draw:transform="rotate(...) translate(...)"`).
> 
> Theo đúng ranh giới an toàn của nhiệm vụ, agent Visual QA **không tự ý viết tính năng này**, mà lập báo cáo rõ ràng để chuyển giao cho Claude lên kế hoạch thiết kế và hiện thực hóa ở phiên làm việc chuyên sâu.

---

## 4. Xác minh tính năng Di chuyển ảnh kéo-thả (Drag-and-drop) trong VN Sheet

- **Hiện trạng kiểm tra**: Các ảnh được chèn trong VN Sheet (`.vno-sheet-image`) là các phần tử overlay tĩnh được neo theo ô tọa độ cột/hàng (`image.anchor = { c, r }`). Trong `sheet-grid.js`, lớp ảnh không đăng ký bất kỳ trình lắng nghe sự kiện chuột nào cho thao tác kéo-thả di chuyển (`pointerdown` / `dragstart`).
- **Kết luận**: Tính năng kéo-thả di chuyển ảnh trên bảng tính chưa có trong logic SheetGrid. Đã ghi nhận khoảng trống tính năng này để đội ngũ phụ trách VN Sheet bổ sung cơ chế neo động (floating anchor dragging) khi người dùng yêu cầu.

---

## 5. Danh mục ảnh chụp màn hình kiểm thử (Screenshots)

Toàn bộ 20 ảnh chụp màn hình kiểm thử trực quan đã được tạo và lưu trữ tại `docs/screenshots/visual-qa-images/`:

1. `sheet-images-c3-light.png`: VN Sheet Sáng - Hiển thị ảnh chèn tại ô C3 với thẻ bo góc và nút xóa rõ nét.
2. `sheet-images-c3-dark.png`: VN Sheet Tối - Thẻ ảnh có nền tối đồng bộ, viền xám tinh tế, nút xóa đen-trắng tương phản cao.
3. `sheet-images-h20-scrolled-light.png`: VN Sheet Sáng - Cuộn đến ô xa H20 kiểm tra khả năng render ảnh khi cuộn.
4. `sheet-images-h20-scrolled-dark.png`: VN Sheet Tối - Cuộn đến ô H20 trên theme tối.
5. `sheet-images-header-overlap-light.png`: VN Sheet Sáng - Cuộn ảnh qua biên: Tiêu đề cột A-B-C và hàng 1-2-3 che phủ trên ảnh đúng thứ tự phân lớp z-index.
6. `sheet-images-header-overlap-dark.png`: VN Sheet Tối - Kiểm tra cuộn qua biên trên theme tối.
7. `writer-image-layout-light.png`: VN Writer Sáng - Bố cục ảnh chèn giữa các đoạn văn bản dài, giữ đúng tỷ lệ khung hình.
8. `writer-image-layout-dark.png`: VN Writer Tối - Bố cục ảnh trong văn bản trên nền giấy tối.
9. `writer-image-selected-light.png`: VN Writer Sáng - Ảnh đang chọn có viền xanh và quầng phát sáng; thanh Ribbon hiển thị tab Định dạng Hình ảnh.
10. `writer-image-selected-dark.png`: VN Writer Tối - Tab Định dạng Hình ảnh trên Ribbon tối với nhãn chữ xám sáng rõ ràng, các dropdown nền tối hài hòa.
11. `writer-print-preview-light.png`: VN Writer Sáng - Hộp thoại Xem trước khi in (Ctrl+F2) hiển thị ảnh nguyên vẹn trên trang in A4.
12. `writer-print-preview-dark.png`: VN Writer Tối - Xem trước khi in trên theme tối.
13. `slides-shapes-overview-light.png`: VN Slides Sáng - Tổng quan slide chứa Hình chữ nhật, Hình Elip và Ảnh minh họa.
14. `slides-shapes-overview-dark.png`: VN Slides Tối - Tổng quan các hình khối và ảnh trên theme tối.
15. `slides-rect-selected-light.png`: VN Slides Sáng - Hình chữ nhật đang chọn: 8 tay cầm co giãn cùng nút xóa đỏ nổi bật ở góc trên trái (z-index 30).
16. `slides-rect-selected-dark.png`: VN Slides Tối - Hình chữ nhật chọn trên theme tối với viền nút xóa sẫm màu tự nhiên.
17. `slides-ellipse-selected-light.png`: VN Slides Sáng - Hình Elip đang chọn với khung viền bao quanh hình học.
18. `slides-ellipse-selected-dark.png`: VN Slides Tối - Hình Elip chọn trên theme tối.
19. `slides-image-selected-light.png`: VN Slides Sáng - Ảnh minh họa đang chọn trên slide.
20. `slides-image-selected-dark.png`: VN Slides Tối - Ảnh minh họa chọn trên slide theme tối.

---

## 6. Danh sách tệp tin thay đổi (Files Changed)

- `apps/sheet/sheet.css`: Bổ sung kiểu dáng `.vno-sheet-image`, trạng thái `:hover`/`:focus-within`, nút xóa `button[data-image-delete]` đạt chuẩn 24×24px, màu hover `#dc2626` đạt chuẩn WCAG AA, và bộ quy tắc Dark Mode.
- `apps/writer/writer.css`: Bổ sung kiểu dáng Dark Mode cho nhóm ribbon `.vno-writer-arrange-group`, viền chọn ảnh `.is-vno-image-selected`, và quy tắc an toàn cho ảnh trong Xem trước khi in `.vno-print-preview-body img`.
- `apps/slides/slides.css`: Điều chỉnh `.vno-shape-delete-btn` nâng `z-index: 30`, viền thích ứng Dark Mode, và hiệu ứng hover/focus.
- `scripts/capture-visual-qa-images.mjs`: Script tự động hóa kiểm thử trực quan và chụp màn hình qua Playwright.
- `docs/screenshots/visual-qa-images/`: 20 ảnh chụp màn hình kiểm chứng.
- `docs/HANDOFF-VISUAL-QA-IMAGE-SHAPES.md`: Tài liệu báo cáo bàn giao chi tiết.

---

## 7. Bảng kết quả kiểm thử (Test Results)

| Bài kiểm tra | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| **Cú pháp JS toàn bộ dự án** | `node scripts/check-syntax.js` | **89/89 PASS** | 0 lỗi cú pháp |
| **Kiểm tra tương phản màu WCAG** | `node scripts/audit-contrast.js` | **100% PASS** | Tất cả màu nền/chữ đạt chuẩn >= 4.5:1 |
| **Bộ kiểm thử toàn hệ thống** | `node tests/run-tests.js` | **1444/1444 PASS** | 0 FAIL, không giảm bất kỳ test nào |
| **Kiểm thử tràn Ribbon 1280px** | `node tests/live/ribbon-audit-1280.playwright.mjs` | **100% PASS** | 104/104 tab đạt chuẩn, 0px tràn ngang |

---

## 8. Hành động tiếp theo (Next Action)

- Chuyển giao báo cáo này cho Claude để xem xét đưa tính năng Xoay hình trong VN Slides vào lộ trình phát triển tính năng (Roadmap).
