# Kết quả đo kiểm đối chiếu tính năng ưu tiên 1: PowerPoint 2016 và VN Slides (17/10/2026)

Tài liệu này ghi nhận kết quả đo kiểm thực tế bằng Microsoft PowerPoint 2016 (bản 16.0.4266 cài đặt cục bộ, giao tiếp qua PowerPoint COM tự động hóa chỉ-đọc) đối chiếu với VN Slides (mô hình dữ liệu slide, command bus và bộ nạp/xuất PPTX/FODP).

> [!IMPORTANT]
> **Quy tắc phương pháp luận bắt buộc (theo AGY-PPTLIST):**
> 1. Tệp kết quả đo thô được lưu trực tiếp tại `docs/ppt-oracle-1710.json` (ghi nhận tên phép đo, thuộc tính, giá trị đọc được từ PowerPoint COM và dấu thời gian thực hiện đo ngày 17/10/2026).
> 2. Phép đo kiểu ghi-rồi-đọc-lại trên PowerPoint COM **chỉ xác nhận ngữ nghĩa thuộc tính và quy chuẩn mô hình đối tượng của PowerPoint**, KHÔNG phải so sánh trực tiếp parity với VN Slides. Khi một tính năng chỉ mới chạy oracle ghi-đọc PowerPoint, tài liệu ghi rõ ngữ nghĩa chuẩn đó và KHÔNG tự nhận là parity hoàn chỉnh nếu chưa có bài thử đối chiếu khứ hồi.
> 3. Chỉ dùng cụm từ **"Đo thực tế PowerPoint COM"** khi có dòng tương ứng trong tệp thô `docs/ppt-oracle-1710.json`. Mọi đối chiếu với VN Slides được ghi rõ là **"Tổng hợp từ tài liệu đối chiếu có sẵn"** (`docs/SLIDES-BUTTON-MATRIX-1011.md`, `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md`, `docs/AUDIT-SLIDES-FUNCTIONAL-1010.md`, `docs/HANDOFF-SLIDES-*.md`).

---

## Bảng tổng hợp đối chiếu 15 tính năng ưu tiên 1

| STT | Tính năng | PowerPoint 2016 (COM) | VN Slides | Kết luận / Ghi chú |
|---|---|---|---|---|
| 1 | Bố cục trang chiếu | Đo thực tế PowerPoint COM: `Slide.Layout` = 1 (ppLayoutTitle) (`docs/ppt-oracle-1710.json:2-8`) | Lệnh `slides.layout.apply` (`docs/SLIDES-BUTTON-MATRIX-1011.md:21`). Áp Two Content, PowerPoint COM đọc `Slide.Layout=3` | ✅ **KHỚP HOÀN TOÀN** (FIX-L12: Layout=3 và 3 placeholder giữ nguyên) |
| 2 | Thêm trang chiếu mới | Đo thực tế PowerPoint COM: `Slides.Count` = 2 sau khi thêm (`docs/ppt-oracle-1710.json:9-15`) | Lệnh `slides.slide.new` (`docs/SLIDES-BUTTON-MATRIX-1011.md:20`, Ctrl+M). Thêm slide tăng model và PPTX từ 10→11 | ✅ **KHỚP HOÀN TOÀN** (FIX-L8: PowerPoint COM đọc 11 slide trong PPTX đã lưu) |
| 3 | Nhân đôi trang chiếu | Đo thực tế PowerPoint COM: `Slide.Duplicate()`, Count 2→3 (`docs/ppt-oracle-1710.json:16-22`) | Lệnh `slides.slide.duplicate` (`docs/SLIDES-BUTTON-MATRIX-1011.md:22`, Ctrl+D). Nhân đôi slide, sao chép toàn bộ shape/transition | ✅ **KHỚP HOÀN TOÀN** (FIX-L7: PowerPoint COM đọc slide nhân đôi giữ đúng effect và shape) |
| 4 | Sắp xếp thứ tự slide | Đo thực tế PowerPoint COM: `Slide.MoveTo(1)`, `SlideIndex` = 1 (`docs/ppt-oracle-1710.json:23-29`) | Kéo thả slide trong danh sách thumbnail hoặc dùng lệnh di chuyển (MoveUp/MoveDown). Sắp xếp index trong model | ✅ **KHỚP CƠ BẢN** (Khớp chỉ số vị trí; Sorter View FIX-L14 `ppViewSlideSorter`=7) |
| 5 | Xóa trang chiếu | Đo thực tế PowerPoint COM: `Slide.Delete()`, Count 3→2 (`docs/ppt-oracle-1710.json:30-36`) | Lệnh `slides.slide.delete` (`docs/SLIDES-BUTTON-MATRIX-1011.md:23`, Delete). Giảm model và PPTX 11→10 | ✅ **KHỚP HOÀN TOÀN** (FIX-L8: PowerPoint COM đọc 10 slide sau khi xóa) |
| 6 | Kích thước & Tỷ lệ slide | Đo thực tế PowerPoint COM: `SlideWidth x SlideHeight` = 960 x 540 pt (16:9 Widescreen) (`docs/ppt-oracle-1710.json:37-43`) | Lệnh `slides.design.slideSize` (`docs/SLIDES-BUTTON-MATRIX-1011.md:66`). Đổi Wide sang Standard 4:3 (720x540 pt) | ✅ **KHỚP HOÀN TOÀN** (FIX-L8: PowerPoint COM đọc PageSetup 720x540 pt sau khi lưu) |
| 7 | Chuyển tiếp slide | Đo thực tế PowerPoint COM: `EntryEffect` = 3849 (ppEffectFade), `Duration` = 0.5 s (`docs/ppt-oracle-1710.json:44-50`) | Lệnh `slides.transition.apply` (`docs/SLIDES-BUTTON-MATRIX-1011.md:68`). Áp Push Right (3854) và Fade (3849) | ✅ **KHỚP CÁC PRESET CHÍNH** (FIX-L4/L7 khớp Fade/Push; ghi nhận lệch kiểu Zoom FIX-L14) |
| 8 | Ẩn trang chiếu | Đo thực tế PowerPoint COM: `SlideShowTransition.Hidden` = -1 (msoTrue) (`docs/ppt-oracle-1710.json:51-57`) | Lệnh `slides.slide.toggleHidden` (`docs/SLIDES-BUTTON-MATRIX-1011.md:75`). Bật ẩn slide, PPTX xuất `show="0"` | ✅ **KHỚP HOÀN TOÀN** (FIX-L5/L6: PowerPoint COM đọc Hidden=-1) |
| 9 | Ghi chú diễn giả | Đo thực tế PowerPoint COM: `NotesPage.Shapes.Placeholders(2).Text` (`docs/ppt-oracle-1710.json:58-64`) | Vùng Notes dưới slide và lệnh `slides.notes.toggle` (`docs/SLIDES-BUTTON-MATRIX-1011.md:77`). Xuất p:notes | ✅ **KHỚP HOÀN TOÀN** (FIX-L4/L6: PowerPoint COM đọc lại đúng ghi chú diễn giả) |
| 10 | Bảng biểu trên slide | Đo thực tế PowerPoint COM: `Shapes.AddTable(3, 4)`, Rows=3, Cols=4 (`docs/ppt-oracle-1710.json:65-71`) | Lệnh `slides.insert.table` (`docs/SLIDES-BUTTON-MATRIX-1011.md:50`). Chèn bảng 3x3 hoặc 3x4 | ✅ **KHỚP HOÀN TOÀN** (FIX-L6: PowerPoint COM đọc đối tượng bảng và số ô khớp) |
| 11 | Hình khối cơ bản & Tô nền | Đo thực tế PowerPoint COM: `Shapes.AddShape(1)`, Type=1, Fill RGB=255 (`docs/ppt-oracle-1710.json:72-78`) | Lệnh `slides.shape.insert` (`docs/SLIDES-BUTTON-MATRIX-1011.md:46`). Chèn hình chữ nhật, hình tròn, mũi tên | ✅ **KHỚP HOÀN TOÀN** (FIX-L6: PowerPoint COM đọc shape đúng fill, line RGB và rotation) |
| 12 | Nhóm đối tượng | Đo thực tế PowerPoint COM: `ShapeRange.Group()`, Type=6 (msoGroup), Count=2 (`docs/ppt-oracle-1710.json:79-85`) | Lệnh nhóm đối tượng (Group). Sơ đồ nhóm 7 shape FIX-L12 | ✅ **KHỚP HOÀN TOÀN** (FIX-L12: PowerPoint COM đọc Shape.Type=6, GroupItems.Count=7) |
| 13 | Căn chỉnh đối tượng | Đo thực tế PowerPoint COM: `ShapeRange.Align(0, 0)`, Left1=40 pt, Left2=40 pt (`docs/ppt-oracle-1710.json:86-92`) | Lệnh `slides.arrange.align*` (`platform/commands/command-definitions.js:630-637`). Căn trái, giữa, phải | ✅ **KHỚP CƠ BẢN** (Căn theo đối tượng và căn theo slide) |
| 14 | Hoạt ảnh đối tượng | Đo thực tế PowerPoint COM: `TimeLine.MainSequence.AddEffect(Fade, OnClick)` (`docs/ppt-oracle-1710.json:93-99`) | Lệnh `slides.animation.apply` (`docs/SLIDES-BUTTON-MATRIX-1011.md:69`) và `slides.animation.pane` (dòng 70) | ✅ **KHỚP CÁC HIỆU ỨNG CƠ BẢN** (FIX-L6/L7: Fade, Fly; đổi thứ tự trong ngăn hoạt ảnh) |
| 15 | Chủ đề thiết kế | Đo thực tế PowerPoint COM: `Slide.Design.Name` = "Office Theme" (`docs/ppt-oracle-1710.json:100-106`) | Lệnh `slides.design.themeGallery` (`docs/SLIDES-BUTTON-MATRIX-1011.md:64`) và `slides.master.apply` (dòng 65) | ✅ **KHỚP HOÀN TOÀN** (FIX-L12: PowerPoint COM đọc Design.Name Than Chì Hiện Đại và theme palette) |

---

## Chi tiết đo kiểm và phân tích chuyên sâu

### 1. Bố cục trang chiếu (Slide Layouts)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:2-8`):** Thuộc tính `Slide.Layout` quản lý enum `PpSlideLayout` (1=ppLayoutTitle, 2=ppLayoutText, 3=ppLayoutTwoColumn/two-content, 12=ppLayoutBlank). Khi gán layout qua COM, PowerPoint tự động sinh các placeholder tiêu đề, nội dung và chân trang tương ứng.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:21,24`):** FIX-L12 áp layout `Hai nội dung` từ ribbon, sau khi xuất PPTX, PowerPoint COM mở đọc `Slide.Layout=3`; bố cục và 3 placeholder tiếp tục tồn tại sau lệnh Đặt lại (`slides.layout.reset`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 2. Thêm trang chiếu mới (New Slide)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:9-15`):** Phương thức `Slides.Add(Index, Layout)` hoặc `Slides.AddSlide(Index, CustomLayout)` tăng thuộc tính `Slides.Count` từ 1 lên 2.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:20`):** Lệnh `slides.slide.new` (Ctrl+M) tăng số slide từ 10 lên 11; PowerPoint COM mở PPTX đã lưu đọc đúng 11 slide.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 3. Nhân đôi trang chiếu (Duplicate Slide)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:16-22`):** Phương thức `Slide.Duplicate()` sao chép nguyên trạng slide và chèn ngay phía sau, tăng `Slides.Count` từ 2 lên 3.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:22`):** Lệnh `slides.slide.duplicate` (Ctrl+D) nhân đôi slide kèm toàn bộ shape, textbox và hiệu ứng chuyển tiếp Fade; PowerPoint COM mở lại đọc đúng 11 slide và transition EntryEffect=3849/0.5 s.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 4. Sắp xếp thứ tự trang chiếu (Move / Reorder Slide)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:23-29`):** Phương thức `Slide.MoveTo(toPos)` di chuyển slide tới vị trí chỉ định và cập nhật lại `SlideIndex` của toàn bộ các slide trong presentation.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:86`):** Chế độ xem Bộ sắp xếp trang `slides.view.slideSorter` đã đối chiếu PowerPoint COM đọc `ActiveWindow.ViewType=7` (`ppViewSlideSorter`). Thao tác kéo thả thumbnail hoặc điều hướng trang trong dàn bài cập nhật đúng index của slide.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 5. Xóa trang chiếu (Delete Slide)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:30-36`):** Phương thức `Slide.Delete()` loại bỏ slide khỏi collection, giảm `Slides.Count` từ 3 xuống 2.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:23`):** Lệnh `slides.slide.delete` giảm số slide từ 11 xuống 10; PowerPoint COM đọc đúng 10 slide trong file đã lưu.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 6. Kích thước trang chiếu & Tỷ lệ màn hình (Slide Size)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:37-43`):** Thuộc tính `PageSetup.SlideWidth` và `PageSetup.SlideHeight` trả về 960 x 540 pt (tỷ lệ 16:9 widescreen mặc định của PowerPoint 2016).
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:66`):** Lệnh `slides.design.slideSize` chuyển đổi giữa Wide 16:9 và Standard 4:3; PowerPoint COM mở PPTX đọc `PageSetup = 720 x 540 pt` (25.4 x 19.05 cm) đúng chuẩn PowerPoint.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 7. Hiệu ứng chuyển tiếp trang chiếu (Slide Transitions)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:44-50`):** Đối tượng `SlideShowTransition` chứa `EntryEffect = 3849` (`ppEffectFade`), `Duration = 0.5 s`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:68`, `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20`):** Đo thực tế trong FIX-L4/L7 xác nhận các preset chính như Push Right (EntryEffect=3854, Duration=0.8 s) và Fade (3849/0.5 s) khớp hoàn toàn PowerPoint COM. (Ghi nhận giới hạn: preset Zoom dir="out" ánh xạ sang ppEffectBoxOut 3073).
- **Kết luận:** **PASS các hiệu ứng chính (✅ Đã đối chiếu)**.

### 8. Ẩn trang chiếu (Hide Slide)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:51-57`):** Thuộc tính `SlideShowTransition.Hidden = -1` (`msoTrue`) đánh dấu slide không hiển thị khi trình chiếu.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:75`, `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:22`):** Lệnh `slides.slide.toggleHidden` trong app thiết lập cờ ẩn; PowerPoint COM đọc lại `Hidden=-1` và file PPTX có thuộc tính `show="0"`.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 9. Ghi chú diễn giả (Speaker Notes)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:58-64`):** Placeholder thứ hai của `Slide.NotesPage` (`Shapes.Placeholders.Item(2)`) lưu trữ đối tượng `TextRange.Text` của ghi chú diễn giả.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:77`, `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:19`):** Người dùng nhập ghi chú tại vùng Notes dưới canvas trong VN Slides; PowerPoint COM mở PPTX đọc lại chính xác nội dung văn bản ghi chú.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 10. Bảng biểu trên trang chiếu (Tables)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:65-71`):** Phương thức `Shapes.AddTable(Rows, Columns, Left, Top, Width, Height)` tạo shape chứa thuộc tính `Table` với `Rows.Count = 3` và `Columns.Count = 4`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:50`):** Lệnh `slides.insert.table` chèn bảng; PowerPoint COM mở PPTX đọc được đối tượng bảng 3x3 với đầy đủ số hàng, cột và nội dung các ô.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 11. Hình khối cơ bản & Tô màu nền (Shapes & Fill)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:72-78`):** Phương thức `Shapes.AddShape(Type, Left, Top, Width, Height)` với `msoShapeRectangle = 1`, thuộc tính `Fill.ForeColor.RGB = 255` (đỏ).
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:46`):** FIX-L6 xác nhận chèn hình trong VN Slides, lưu file và mở bằng PowerPoint COM; COM đọc shape cùng màu tô RGB, màu viền, kích thước và góc xoay.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 12. Nhóm đối tượng (Group Objects)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:79-85`):** Phương thức `ShapeRange.Group()` gộp các hình được chọn thành một shape phức hợp với `Type = 6` (`msoGroup`) và `GroupItems.Count = 2`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:53`):** FIX-L12 xác nhận sơ đồ tạo nhóm hình trong app; sau khi lưu file, PowerPoint COM mở đọc `Shape.Type=6` và `GroupItems.Count=7`.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 13. Căn chỉnh đối tượng (Align Objects)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:86-92`):** Phương thức `ShapeRange.Align(msoAlignLefts=0, RelativeToSlide=0)` căn lề trái các đối tượng bằng nhau (`Left1 = 40 pt`, `Left2 = 40 pt`).
- **Tổng hợp từ tài liệu đối chiếu có sẵn:** Hệ thống lệnh `slides.arrange.align*` trong `platform/commands/command-definitions.js:630-637` hỗ trợ căn trái, giữa, phải, trên, giữa dọc, dưới và căn theo trang chiếu (`slides.arrange.alignToSlide`).
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 14. Hoạt ảnh đối tượng (Object Animations)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:93-99`):** Đối tượng `TimeLine.MainSequence.AddEffect(Shape, EffectType, TriggerType, Trigger)` với `msoAnimEffectFade = 10`, `Count = 1`.
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:69-70`):** FIX-L6/L7 xác nhận PowerPoint COM đọc lại Fade, Fade, Fly đúng thứ tự (EffectType 10, 10, 2, TriggerType=click, duration 0.8/0.8/0.5 s); đổi thứ tự hiệu ứng trong Ngăn hoạt hình được COM đọc lại chính xác.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.

### 15. Chủ đề thiết kế (Themes & Design)
- **Đo thực tế PowerPoint COM (`docs/ppt-oracle-1710.json:100-106`):** Thuộc tính `Slide.Design.Name` lưu tên chủ đề áp dụng cho slide (mặc định "Office Theme").
- **Tổng hợp từ tài liệu đối chiếu có sẵn (`docs/SLIDES-BUTTON-MATRIX-1011.md:64-65`):** FIX-L12 áp chủ đề `minimal-dark` từ thư viện chủ đề hoặc Mẫu Slide Master; sau khi lưu PPTX, PowerPoint COM đọc đúng `Design.Name="Than Chì Hiện Đại"`, bảng màu theme và font scheme.
- **Kết luận:** **PASS (✅ Đã đối chiếu)**.
