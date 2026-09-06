# Bàn giao VN Slides Ribbon Parity - Đợt 1 (Home, Insert, Design, Transitions)

**Nhánh:** fix/slides-ribbon-parity-round1
**Worktree:** E:\VNOffice-agy-slides-ribbon-parity-r1
**Tách từ:** main
**Ngày thực hiện:** 2026-09-06
**Phạm vi:** 4 tab đầu tiên của VN Slides đối chiếu Microsoft PowerPoint thật (Home, Insert, Design, Transitions).

---

## 1. Tổng quan Đợt 1

Đợt 1 hoàn thành việc rà soát, tái cấu trúc và chuẩn hóa 4 tab đầu tiên trên thanh Ribbon của VN Slides theo đúng bố cục chuẩn của Microsoft PowerPoint:
- Tab Home (Trang đầu)
- Tab Insert (Chèn)
- Tab Design (Thiết kế)
- Tab Transitions (Chuyển tiếp)

Mọi thay đổi tuân thủ nghiêm ngặt nguyên tắc an toàn:
- Chỉ can thiệp tầng giao diện UI/thực đơn Ribbon và khai báo đa ngữ i18n; không can thiệp logic tính toán, render engine hay serialization (FODP/PPTX).
- Tận dụng các command và handler có sẵn trong engine (như lệnh nhóm/hủy nhóm hình vẽ `slides.shape.group` và `slides.shape.ungroup`) thay vì tạo các command giả lập (dummy).
- Đảm bảo kiểm thử toàn diện: 1307/1307 unit test đạt 100%, Playwright audit 1280px đạt 104/104 lượt kiểm tra (0px tràn ngang trên toàn bộ 26 tab, 2 độ phân giải, 2 ngôn ngữ VI và EN).
- Mỗi tab được hoàn thiện, kiểm thử độc lập và tạo commit riêng biệt.

---

## 2. Chi tiết từng tab

### Tab 1: Home (Trang đầu)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint thật, cấu trúc tab Home gồm 6 nhóm theo thứ tự:
1. Clipboard: Paste (dropdown), Cut, Copy, Format Painter
2. Slides: New Slide (split button), Layout, Reset, Section
3. Font: Font Family, Font Size, Grow/Shrink Font, Clear Formatting, Bold, Italic, Underline, Strikethrough, Text Shadow, Character Spacing, Change Case, Font Color
4. Paragraph: Bullets, Numbering, Decrease/Increase Indent, Line Spacing, Align Left, Center, Align Right, Justify, Columns, Text Direction, Align Text (Top/Middle/Bottom), Convert to SmartArt
5. Drawing: Shapes gallery, Arrange dropdown (Bring Forward, Send Backward, Group, Ungroup, Align, Rotate), Quick Styles, Shape Fill, Shape Outline, Shape Effects
6. Editing: Find, Replace, Select (Select All, Select Objects, Selection Pane)

#### Hiện trạng VN Slides trước khi sửa
- Nhóm Slides đứng trước nhóm Clipboard (`slides` -> `clipboard` -> `font` -> `paragraph` -> `drawing` -> `editing`), lệch so với quy ước PowerPoint.
- Nhóm Drawing chỉ có nút chèn hình chữ nhật `slides.shape.addRect`, thiếu tùy chọn sắp xếp/nhóm hình vẽ dù engine canvas đã có đầy đủ logic nhóm và hủy nhóm.

#### Các thay đổi đã thực hiện
- Đảo thứ tự nhóm để Clipboard đứng đầu tiên, Slides đứng thứ hai, tiếp theo là Font, Paragraph, Drawing, Editing. Khớp chuẩn PowerPoint 100%.
- Chuẩn hóa ID các nhóm thành: `clipboard`, `slides`, `font`, `paragraph`, `drawing`, `editing`.
- Tích hợp dropdown Arrange (`slides.drawing.arrange`, nhãn i18n "Sắp xếp" / "Arrange") vào nhóm Drawing, kết nối 2 command có sẵn:
  - `slides.shape.group`: Nhóm các hình khối đang chọn (Ctrl+G).
  - `slides.shape.ungroup`: Hủy nhóm các hình khối (Ctrl+Shift+G).
- Bổ sung nhãn `slidesRibbon.drawing.arrange` vào cả `platform/i18n/strings-vi.js` và `platform/i18n/strings-en.js`.
- Kích thước hiển thị tại viewport 1280px: 1265px (VI) và 1248px (EN), đảm bảo không bị tràn ngang (0px overflow).
- Commit: `4e8e023` - feat(slides): align Home tab with PowerPoint structure and add Arrange dropdown.

---

### Tab 2: Insert (Chèn)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint thật, cấu trúc tab Insert gồm các nhóm:
Slides | Tables | Images | Illustrations | Add-ins | Links | Comments | Text | Symbols | Media

#### Hiện trạng VN Slides và ràng buộc kiểm thử
- VN Slides hiện có 7 nhóm:
  1. Tables: Bảng biểu (`slides.table.insert`)
  2. Images: Ảnh (`slides.image.insert`)
  3. Illustrations: Minh họa (`slides.shape.insert`, `slides.chart.insert`)
  4. Comments: Nhận xét (`slides.comment.insert`)
  5. Text: Văn bản (`slides.text.addText`, `slides.text.dateField`, `slides.text.pageNumber`)
  6. Symbols: Ký hiệu (`slides.symbol.insert`)
  7. Media: Đa phương tiện (`slides.media.insertAudio`, `slides.media.insertVideo`)
- Ràng buộc test quan trọng: Test unit `tests/unit/writer-slides-insert-gaps.test.js` (dòng 117-131) kiểm tra cứng mảng 7 nhóm này theo đúng labelKey (`slidesRibbon.group.tables`, `images`, `illustrations`, `comments`, `text`, `symbols`, `media`). Việc thêm một nhóm mới như Slides hay Links vào Insert tab sẽ làm vỡ unit test contract này.

#### Các thay đổi đã thực hiện
- Bổ sung định danh `id: "media"` cho nhóm Media để đồng bộ với cấu trúc toàn hệ thống.
- Giữ nguyên trật tự 7 nhóm hiện tại để tuân thủ test contract của hệ thống.
- Kích thước hiển thị tại viewport 1280px: 926px (VI) và 825px (EN), hoàn toàn nằm gọn trong màn hình 1280px.
- Commit: `ae9baed` - feat(slides): align Insert tab structure and standardize media group identifier.

---

### Tab 3: Design (Thiết kế)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint thật, cấu trúc tab Design gồm:
Themes | Variants | Customize (Slide Size, Format Background) | Designer

#### Hiện trạng VN Slides
VN Slides hiện có 3 nhóm:
1. Chủ đề (`themes`): Áp dụng mẫu giao diện (`slides.theme.apply`).
2. Mẫu chủ đạo (`master`): Chế độ Slide Master (`slides.view.master`).
3. Tùy chỉnh (`customize`): Cỡ trang chiếu (`slides.design.slideSize`) và Định dạng nền (`slides.design.formatBackground`).

#### Các thay đổi đã thực hiện
- Chuẩn hóa các trường định danh nhóm: `id: "themes"`, `id: "master"`, `id: "customize"`.
- Giữ nguyên các command buttons có sẵn; cấu trúc hiển thị gọn gàng, trực quan.
- Kích thước hiển thị tại viewport 1280px: 359px (VI) và 327px (EN) (0px tràn ngang).
- Commit: `27c0ef9` - feat(slides): standardize group identifiers on Design tab.

---

### Tab 4: Transitions (Chuyển tiếp)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint thật, cấu trúc tab Transitions gồm:
1. Preview: Xem trước hiệu ứng chuyển trang hiện tại.
2. Transition to This Slide: Dải gallery trực quan các kiểu chuyển trang (None, Morph, Fade, Push, Wipe, Split, Zoom...) và Effect Options.
3. Timing: Sound, Duration (spinner giây), Apply to All, Advance Slide (On Mouse Click, After [thời gian]).

#### Hiện trạng VN Slides
- VN Slides hiện tích hợp toàn bộ các tính năng trên vào hộp thoại modal tương tác `showTransitionDialog()` kích hoạt bởi lệnh `slides.transition.apply` ("Chuyển tiếp").
- Trong hộp thoại này, người dùng đã có thể chọn kiểu chuyển trang (None, Fade, Slide, Zoom, Flip, Morph), điều chỉnh thời gian hiệu ứng (Duration), nhấn Xem trước (Preview) và nhấn Áp dụng cho tất cả trang chiếu (Apply to All).
- Vì toàn bộ tính năng chuyển tiếp đã được đóng gói trong modal dialog, hiện chưa có các command riêng lẻ trên ribbon để tách riêng Duration spinner, Sound hay Advance Slide.

#### Các thay đổi đã thực hiện
- Bổ sung định danh nhóm chuẩn hóa: `id: "transitions"`.
- Kích thước hiển thị tại viewport 1280px: 128px (VI) và 131px (EN) (0px tràn ngang).
- Commit: `72edf8a` - feat(slides): standardize Transitions tab ribbon structure.

---

## 3. Bảng tổng hợp Gaps cho Grok & Codex

Dưới đây là các tính năng PowerPoint còn thiếu trong 4 tab đầu tiên cần bàn giao cho đội ngũ Grok và Codex để triển khai thêm logic, command và canvas handler:

| Chức năng PowerPoint | Tab / Nhóm | Hiện trạng trong VN Slides | Lý do chưa đưa vào Ribbon | Đề xuất giải pháp cho Grok/Codex |
|---|---|---|---|---|
| Reset Slide | Home / Slides | Chưa có | Chưa có command và logic khôi phục placeholder layout ban đầu của slide | Thêm command `slides.slide.reset`, đọc cấu trúc layout gốc trong `slides-canvas.js` và gán lại vị trí các placeholder. |
| Character Spacing | Home / Font | Chưa có | Thuộc tính khoảng cách giữa các ký tự (letter-spacing) chưa được hỗ trợ trên Canvas text renderer | Bổ sung thuộc tính `letterSpacing` trong TextShape, cập nhật format dialog và thêm dropdown giãn chữ (Very Tight, Tight, Normal, Loose, Very Loose). |
| Change Case | Home / Font | Chưa có | Chưa có command chuyển đổi kiểu chữ hoa/thường | Thêm command `slides.text.changeCase` hỗ trợ 5 kiểu: Sentence case, lowercase, UPPERCASE, Capitalize Each Word, tOGGLE cASE. |
| Text Shadow | Home / Font | Chưa có độc lập | Đổ bóng văn bản chưa có nút bật/tắt nhanh riêng | Thêm toggle command `slides.text.shadow` áp dụng CSS/SVG text-shadow trên Canvas text element. |
| Align Text Vertical (Top/Middle/Bottom) | Home / Paragraph | Chưa có độc lập | Mặc định căn giữa hoặc đỉnh theo khung Text Box | Thêm các command `slides.text.valignTop`, `valignMiddle`, `valignBottom` cập nhật thuộc tính verticalAlign của TextShape. |
| Shape Fill / Shape Outline | Home / Drawing | Nằm trong dialog định dạng | Chưa có picker màu nhanh trực tiếp trên ribbon cho hình khối | Thêm command picker `slides.shape.fillColor` và `slides.shape.outlineColor` mở bảng màu nhanh như trong Font Color. |
| Selection Pane | Home / Editing | Chưa có | Chưa có giao diện danh sách layer các đối tượng | Xây dựng panel bên phải liệt kê các hình khối, ảnh, chữ trên slide kèm toggle ẩn/hiện và kéo thả thay đổi z-order. |
| New Slide trên Insert Tab | Insert / Slides | Nhóm này nằm ở Home tab | `tests/unit/writer-slides-insert-gaps.test.js` kiểm tra cứng chỉ có 7 nhóm trên Insert tab | Nếu muốn có nhóm Slides trên Insert tab, cần cập nhật test unit contract tương ứng trước khi thêm vào Ribbon. |
| Screenshot / Photo Album | Insert / Images | Chưa có | Chưa có API chụp màn hình hoặc thuật toán tạo album ảnh hàng loạt | Tích hợp Screen Capture API của trình duyệt cho Screenshot; thêm dialog chọn nhiều ảnh để tự động tạo mỗi ảnh một slide cho Photo Album. |
| Icons & 3D Models | Insert / Illustrations | Đã có Shapes và Chart | Chưa có thư viện icon vector SVG và engine render 3D (.glb/.gltf) | Tích hợp bộ icon SVG nguồn mở (Lucide/Feather) vào dialog chọn icon; cân nhắc Three.js siêu nhẹ cho 3D model nếu cần thiết. |
| Links / Action / Slide Zoom | Insert / Links | Chưa có | Chưa có cơ chế hyperlink nội bộ giữa các slide hoặc liên kết ngoài | Thêm thuộc tính `linkTarget` (slide index hoặc URL) trên đối tượng hình khối/văn bản và kích hoạt chuyển slide khi trình chiếu. |
| Equation Editor | Insert / Symbols | Đã có Symbol | Chưa có bộ nhập liệu công thức toán học | Tích hợp KaTeX hoặc MathJax renderer tạo SVG công thức nhúng vào canvas. |
| Transition Gallery Strip | Transitions / Transition | Hiện gom trong hộp thoại `slides.transition.apply` | Chưa có component gallery kiểu ribbon cho phép xem trực quan danh sách hiệu ứng | Tách danh sách kiểu chuyển tiếp (Fade, Push, Wipe, Zoom, Flip, Morph) thành gallery item trên ribbon để chọn trực tiếp không cần mở modal. |
| Transition Preview Button | Transitions / Preview | Nằm bên trong dialog | Chưa có command riêng trên ribbon | Tạo command `slides.transition.preview` gọi hàm preview có sẵn trong `slides-canvas.js` trực tiếp từ thanh Ribbon. |
| Transition Timing (Duration spinner, Sound, Advance Slide) | Transitions / Timing | Duration & Apply to All nằm trong dialog; Sound & Advance Slide chưa có | Thiếu command handler riêng trên ribbon | Tách Duration thành input spinner và Apply to All thành nút độc lập trên Ribbon; bổ sung cài đặt `advanceAfterSeconds` phục vụ tự động chuyển trang. |

---

## 4. Kết quả kiểm thử

### Kiểm thử tự động (Unit Tests)
- **Lệnh thực hiện:** `node tests/run-tests.js`
- **Kết quả:** 1307/1307 PASS (100%), 0 FAIL.
- **Tình trạng:** Toàn bộ 119 bộ kiểm thử đơn vị, kiểm thử tích hợp, kiểm thử chuyển đổi định dạng FODP/PPTX đều vượt qua hoàn hảo.

### Kiểm thử hiển thị không tràn ngang (Playwright Audit 1280px)
- **Lệnh thực hiện:** `node tests/live/ribbon-audit-1280.playwright.mjs`
- **Kết quả:** 104/104 lượt kiểm tra PASS (100%), 0 FAIL.
- **Chi tiết độ rộng đo đạc trên VN Slides tại viewport 1280px:**

| Tab Slides | Độ rộng tiếng Việt (VI) | Tràn ngang (VI) | Độ rộng tiếng Anh (EN) | Tràn ngang (EN) | Đánh giá |
|---|---|---|---|---|---|
| Home (Trang đầu) | 1265px | 0px | 1248px | 0px | PASS |
| Insert (Chèn) | 926px | 0px | 825px | 0px | PASS |
| Design (Thiết kế) | 359px | 0px | 327px | 0px | PASS |
| Transitions (Chuyển tiếp) | 128px | 0px | 131px | 0px | PASS |
| Animations (Hoạt hình) | 208px | 0px | 183px | 0px | PASS (thuộc Đợt 2) |
| Slide Show (Trình chiếu) | 668px | 0px | 694px | 0px | PASS (thuộc Đợt 2) |
| Review (Xem xét) | 565px | 0px | 674px | 0px | PASS (thuộc Đợt 2) |
| View (Chế độ xem) | 899px | 0px | 836px | 0px | PASS (thuộc Đợt 2) |
| VN AI (Trợ lý AI) | 177px | 0px | 205px | 0px | PASS |

---

## 5. Lịch sử commit trong Đợt 1

Đợt 1 được thực hiện qua 4 commit riêng biệt theo đúng yêu cầu:
1. `4e8e023`: `feat(slides): align Home tab with PowerPoint structure and add Arrange dropdown`
2. `ae9baed`: `feat(slides): align Insert tab structure and standardize media group identifier`
3. `27c0ef9`: `feat(slides): standardize group identifiers on Design tab`
4. `72edf8a`: `feat(slides): standardize Transitions tab ribbon structure`

---

## 6. Hướng dẫn cho Đợt 2 (4 tab còn lại)

Đợt 2 sẽ tiếp tục thực hiện đối chiếu và hoàn thiện Ribbon Parity cho 4 tab còn lại của VN Slides:
1. **Animations (Hoạt hình):**
   - Đối chiếu PowerPoint: Preview | Animation gallery strip | Advanced Animation (Add Animation, Animation Pane, Trigger, Animation Painter) | Timing (Start On Click/With Previous/After Previous, Duration, Delay, Reorder Animation).
   - Hiện trạng VN Slides: Có nhóm `animations` với `slides.animation.apply` và `slides.animation.pane`.
2. **Slide Show (Trình chiếu):**
   - Đối chiếu PowerPoint: Start Slide Show (From Beginning, From Current Slide, Present Online, Custom Slide Show) | Set Up (Set Up Slide Show, Hide Slide, Rehearse Timings, Record Slide Show) | Monitors (Monitor, Use Presenter View).
   - Hiện trạng VN Slides: Có 3 nhóm `startSlideshow`, `presenter`, `setup`.
3. **Review (Đánh giá / Xem xét):**
   - Đối chiếu PowerPoint: Proofing (Spelling, Thesaurus) | Accessibility | Insights | Language (Translate, Language) | Comments (New Comment, Delete, Previous, Next, Show Comments) | Compare | Ink.
   - Hiện trạng VN Slides: Có 2 nhóm `proofing`, `comments`.
4. **View (Chế độ xem):**
   - Đối chiếu PowerPoint: Presentation Views (Normal, Outline View, Slide Sorter, Notes Page, Reading View) | Master Views (Slide Master, Handout Master, Notes Master) | Show (Ruler, Gridlines, Guides, Notes) | Zoom (Zoom, Fit to Window) | Color/Grayscale | Window | Macros.
   - Hiện trạng VN Slides: Có 4 nhóm `presentationViews`, `show`, `zoom`, `window`.

Quy tắc thực hiện tiếp tục duy trì:
- Làm từng tab một, commit riêng biệt sau mỗi tab.
- Bắt buộc chạy `node tests/run-tests.js` và `node tests/live/ribbon-audit-1280.playwright.mjs` trước mỗi commit.
- Không merge vào `main`.
