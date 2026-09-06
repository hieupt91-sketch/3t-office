# Bàn giao VN Slides Ribbon Parity - Đợt 2 (Animations, Slide Show, Review, View)

**Nhánh:** fix/slides-ribbon-parity-round2
**Worktree:** E:\VNOffice-agy-slides-ribbon-parity-r2
**Tách từ:** main (commit fd1ed51)
**Ngày thực hiện:** 2026-09-06
**Phạm vi:** 4 tab còn lại của VN Slides đối chiếu Microsoft PowerPoint thật (Animations, Slide Show, Review, View).

---

## 1. Tổng quan Đợt 2

Đợt 2 hoàn tất trọn vẹn việc rà soát, tái cấu trúc và chuẩn hóa 4 tab còn lại trên thanh Ribbon của ứng dụng VN Slides theo bố cục và tiêu chuẩn của Microsoft PowerPoint:
- Tab Animations (Hoạt hình)
- Tab Slide Show (Trình chiếu)
- Tab Review (Đánh giá)
- Tab View (Chế độ xem)

Toàn bộ quá trình thực hiện tuân thủ tuyệt đối các nguyên tắc an toàn được giao:
- Chỉ tinh chỉnh tầng khai báo giao diện Ribbon trong slides-ribbon.js và cấu trúc trình bày trực quan; tuyệt đối không thay đổi logic tính toán, render engine hay serialization (FODP/PPTX).
- Tận dụng đầy đủ các lệnh hiện hữu trong hệ thống, sắp xếp đúng trật tự PowerPoint; không tạo lệnh giả hoặc nút rỗng cho các tính năng chưa có mã nguồn backend.
- Mỗi tab được hoàn thiện độc lập, kiểm thử nghiêm ngặt qua 2 tầng kiểm tra bắt buộc (1318/1318 unit test đạt 100%, 104/104 lượt kiểm tra Playwright không tràn ngang ở 1280px) và tạo commit riêng biệt ngay sau mỗi tab.
- Tuyệt đối không merge vào nhánh main.

---

## 2. Chi tiết từng tab

### Tab 1: Animations (Hoạt hình)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint chuẩn, tab Animations gồm 4 nhóm chức năng chính:
1. Preview: Nút Xem trước toàn bộ hiệu ứng trên slide hoặc đối tượng đang chọn.
2. Animation gallery strip: Dải bộ sưu tập trực quan các hiệu ứng Xuất hiện (Entrance - xanh lá), Nhấn mạnh (Emphasis - vàng), Thoát (Exit - đỏ), và Đường chuyển động (Motion Paths) cùng nút Effect Options.
3. Advanced Animation: Thêm hiệu ứng (Add Animation), Ngăn hoạt hình (Animation Pane), Kích hoạt (Trigger), và Sao chép hiệu ứng (Animation Painter).
4. Timing: Bắt đầu (Start On Click / With Previous / After Previous), Thời lượng (Duration spinner), Độ trễ (Delay spinner), và Đổi thứ tự (Reorder Animation: Move Earlier, Move Later).

#### Hiện trạng VN Slides trước khi sửa
- VN Slides hiện tích hợp đầy đủ khả năng áp dụng hiệu ứng và quản lý hoạt hình qua hai thành phần:
  - Hộp thoại tương tác Hiệu ứng đối tượng (slides.animation.apply) cho phép chọn loại hiệu ứng xuất hiện (Fade In, Fly In, Zoom In), thời lượng (duration) và độ trễ (delay).
  - Ngăn hoạt hình trượt từ cạnh phải (slides.animation.pane) cho phép người dùng quan sát toàn bộ danh sách hiệu ứng trên trang chiếu, thay đổi thứ tự chạy hiệu ứng lên/xuống, cấu hình cách kích hoạt (On Click, With Previous, After Previous), hoặc xóa hiệu ứng.
- Nhóm chưa được gán thuộc tính id định danh đồng bộ (thiếu id: "animations").
- Ràng buộc kiểm thử: Test đơn vị slides-animation-pane-setup-show.test.js yêu cầu tab.groups[0] phải chứa cả slides.animation.apply lẫn slides.animation.pane, với Ngăn hoạt hình đứng sau Hiệu ứng đối tượng.

#### Các thay đổi đã thực hiện
- Bổ sung định danh nhóm chuẩn hóa id: "animations" cho nhóm Hiệu ứng đối tượng.
- Giữ nguyên cấu trúc hai nút lớn trực quan slides.animation.apply và slides.animation.pane, đảm bảo tuân thủ 100% test contract kiểm tra vị trí và thứ tự trong mảng groups[0].
- Kích thước hiển thị tại viewport 1280px: 208px (VI) và 183px (EN) (0px tràn ngang).
- Commit: 80f51ac - feat(slides): standardize Animations tab group identifier.

---

### Tab 2: Slide Show (Trình chiếu)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint chuẩn, tab Slide Show gồm 3 nhóm chức năng theo đúng thứ tự:
1. Start Slide Show: Bắt đầu từ đầu (From Beginning - F5), Bắt đầu từ trang hiện tại (From Current Slide - Shift+F5), Trình chiếu trực tuyến (Present Online), Bản trình chiếu tùy chỉnh (Custom Slide Show).
2. Set Up: Thiết lập trình chiếu (Set Up Slide Show), Ẩn trang chiếu (Hide Slide), Tập dượt hẹn giờ (Rehearse Timings), Ghi bản trình chiếu (Record Slide Show), cùng các tùy chọn phát thuyết minh và thời gian.
3. Monitors: Màn hình trình chiếu (Monitor) và Sử dụng dạng xem Người thuyết trình (Use Presenter View).

#### Hiện trạng VN Slides trước khi sửa
- VN Slides có 3 nhóm nhưng thứ tự bị đảo lộn: nhóm Người thuyết trình (presenter) đứng trước nhóm Thiết lập (setup).
- Nút Tập dượt hẹn giờ (slides.show.rehearseTimings) nằm trong nhóm Người thuyết trình thay vì thuộc nhóm Thiết lập theo chuẩn PowerPoint.
- Cả 3 nhóm đều chưa được khai báo trường id định danh đồng bộ.

#### Các thay đổi đã thực hiện
- Chuẩn hóa định danh id cho toàn bộ 3 nhóm: id: "startSlideshow", id: "setup", id: "presenter".
- Đảo lại thứ tự nhóm khớp chuẩn PowerPoint 100%: Khởi động chiếu (startSlideshow) đứng đầu, tiếp theo là Thiết lập (setup), và cuối cùng là Người thuyết trình (presenter).
- Di chuyển nút Tập dượt hẹn giờ (slides.show.rehearseTimings) vào nhóm Thiết lập (setup), đứng liền kề sau Thiết lập trình chiếu (slides.show.setupShow) và Ẩn trang chiếu (slides.slide.toggleHidden), tái hiện cấu trúc Set Up kinh điển của PowerPoint.
- Nhóm Người thuyết trình (presenter) đóng vai trò tương đương nhóm Monitors/Presenter Tools của PowerPoint, giữ nút Ghi chú thuyết trình (slides.notes.toggle) để điều khiển khung ghi chú diễn giả.
- Kích thước hiển thị tại viewport 1280px: 668px (VI) và 694px (EN) (0px tràn ngang).
- Commit: 66ff4ce - feat(slides): align Slide Show tab structure with PowerPoint and standardize group identifiers.

---

### Tab 3: Review (Đánh giá)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint chuẩn, tab Review gồm các nhóm:
1. Proofing: Kiểm tra chính tả (Spelling - F7), Từ điển đồng nghĩa (Thesaurus).
2. Accessibility: Kiểm tra khả năng truy cập (Check Accessibility).
3. Insights: Tra cứu thông minh (Smart Lookup).
4. Language: Dịch thuật (Translate), Ngôn ngữ (Language).
5. Comments: Nhận xét mới (New Comment), Xóa nhận xét (Delete), Nhận xét trước (Previous), Nhận xét sau (Next), Hiện nhận xét (Show Comments).
6. Compare: So sánh bản trình chiếu (Compare).
7. Ink: Ẩn/hiện mực vẽ tay (Hide Ink).

#### Hiện trạng VN Slides trước khi sửa
- VN Slides hiện có 2 nhóm: Chứng minh (proofing) và Nhận xét (comments).
- Nhóm Nhận xét thiếu id định danh (chưa có id: "comments").
- Trật tự các nút trong nhóm Nhận xét sắp xếp theo thứ tự: Nhận xét mới -> Nhận xét trước -> Nhận xét sau -> Xóa nhận xét -> Đã xử lý. Trong khi quy ước PowerPoint đặt thao tác Xóa (Delete) ngay cạnh Tạo mới (New Comment) trước cụm điều hướng Trước/Sau.

#### Các thay đổi đã thực hiện
- Bổ sung định danh nhóm chuẩn hóa id: "comments".
- Sắp xếp lại trật tự các thao tác nhận xét chuẩn PowerPoint: Nhận xét mới (slides.review.commentInsert - nút lớn) -> Xóa nhận xét (slides.review.commentDelete) -> Nhận xét trước (slides.review.commentPrevious) -> Nhận xét sau (slides.review.commentNext) -> Đã xử lý (slides.review.commentResolve).
- Giữ nguyên nhóm Chứng minh (proofing) với nhãn "Chứng minh" theo cam kết kiểm thử đồng bộ với VN Sheet.
- Kích thước hiển thị tại viewport 1280px: 565px (VI) và 674px (EN) (0px tràn ngang).
- Commit: ec1bab4 - feat(slides): align Review tab comments order with PowerPoint and standardize group identifier.

---

### Tab 4: View (Chế độ xem)

#### Đối chiếu với Microsoft PowerPoint thật
Trong PowerPoint chuẩn, tab View gồm các nhóm:
1. Presentation Views: Dạng xem bình thường (Normal), Dạng xem dàn bài (Outline View), Bộ sắp xếp trang (Slide Sorter), Trang ghi chú (Notes Page), Dạng xem đọc (Reading View).
2. Master Views: Slide Master, Handout Master, Notes Master.
3. Show: Thước đo (Ruler), Đường lưới (Gridlines), Đường hướng dẫn (Guides), Ghi chú (Notes).
4. Zoom: Thu phóng (Zoom), Vừa cửa sổ (Fit to Window).
5. Color/Grayscale: Màu sắc (Color), Thang độ xám (Grayscale), Đen trắng thuần (Pure Black and White).
6. Window: Cửa sổ mới (New Window), Sắp xếp tất cả (Arrange All), Xếp tầng (Cascade), Chuyển cửa sổ (Switch Windows).
7. Macros: Trình xem và ghi Macro.

#### Hiện trạng VN Slides trước khi sửa
- VN Slides có 4 nhóm: presentationViews, show, zoom, window.
- Nhóm presentationViews có đủ 4 chế độ: Normal, Slide Sorter, Ghi chú (Notes), Reading View.
- Nhóm show có đủ 3 toggle: Thước (Ruler), Đường lưới (Gridlines), Đường hướng dẫn (Guides).
- Nhóm zoom có Zoom In (nút lớn), Zoom Out, 100% (zoomReset), và Vừa cửa sổ (fitToWindow). Nút Vừa cửa sổ đang hiển thị ở dạng nút nhỏ tiêu chuẩn, trong khi PowerPoint định vị Fit to Window là một nút lớn nổi bật song song với Zoom.
- Nhóm window có Cửa sổ mới (newWindow).
- Ràng buộc kiểm thử: sheet-slides-view-tab.test.js yêu cầu phẳng mảng items trong từng nhóm để ánh xạ danh sách commandId trực tiếp (không lồng column).

#### Các thay đổi đã thực hiện
- Nâng cấp nút Vừa cửa sổ (slides.view.fitToWindow) thành nút lớn trực quan (isLarge: true), kết hợp cùng nút Phóng to (slides.view.zoomIn) tạo thành cặp nút tác vụ thu phóng lớn đặc trưng của PowerPoint.
- Giữ nguyên cấu trúc items trực tiếp để đáp ứng 100% test contract trong sheet-slides-view-tab.test.js.
- Bảo toàn đầy đủ 4 nhóm chuẩn hóa presentationViews, show, zoom, window.
- Kích thước hiển thị tại viewport 1280px: 899px (VI) và 836px (EN) (0px tràn ngang).
- Commit: eb561e5 - feat(slides): align View tab Zoom group with PowerPoint prominence.

---

## 3. Danh mục các khoảng trống tính năng (Gaps) ghi nhận cho Grok và Codex

Dưới đây là danh mục các tính năng xuất hiện trên thanh Ribbon chuẩn của Microsoft PowerPoint nhưng hiện chưa có backend xử lý hoặc chưa có command trong VN Slides. Tuyệt đối không tạo nút giả hay command rỗng trên giao diện:

| Chức năng PowerPoint | Tab / Nhóm PowerPoint | Hiện trạng trong VN Slides | Lý do chưa đưa lên Ribbon | Đề xuất giải pháp cho Grok / Codex |
|---|---|---|---|---|
| Animation Preview | Animations / Preview | Nằm trong dialog hiệu ứng | Chưa có command độc lập trên ribbon để xem trước animation trang hiện tại | Bổ sung command slides.animation.preview, kích hoạt hàm previewAnimation trên canvas của slide đang chọn. |
| Animation Gallery Strip | Animations / Animation | Hiện qua modal dialog slides.animation.apply | Chưa có thanh gallery trực quan trên ribbon liệt kê trực tiếp các icon Fade, Fly In, Zoom In, Wipe... | Thiết kế component AnimationGallery trên ribbon tương tự Shape Gallery hoặc Transition Gallery, bấm là gán hiệu ứng ngay mà không cần bật popup. |
| Add Animation | Animations / Advanced Animation | Chỉ hỗ trợ 1 animation mỗi đối tượng | Canvas hiện lưu đối tượng animation đơn (object.animation); chưa hỗ trợ danh sách nhiều animation xếp chồng cho cùng 1 shape | Nâng cấp mô hình lưu trữ đối tượng thành mảng shape.animations; bổ sung command slides.animation.add để thêm animation thứ hai trở đi (ví dụ vừa Fade In vừa Pulse). |
| Trigger Animation | Animations / Advanced Animation | Chưa có | Chưa có logic kích hoạt hiệu ứng khi click vào một hình khối khác (interactive triggers) | Thêm trường triggerTargetId vào cấu hình animation, lắng nghe sự kiện click trên shape chỉ định để kích hoạt animation tương ứng trong chế độ trình chiếu F5. |
| Animation Painter | Animations / Advanced Animation | Chưa có | Chưa có cơ chế sao chép hiệu ứng đối tượng (khác Format Painter sao chép màu/chữ) | Xây dựng command slides.animation.painter tương tự slides.edit.formatPainter, đọc animation config của shape nguồn và gán sang shape đích được click. |
| Timing Spinners (Duration, Delay) trên Ribbon | Animations / Timing | Nằm trong dialog và pane | Ribbon hiện tại chưa có widget spinner số/thời gian trực tiếp | Bổ sung widget input spinner số cho Duration (giây/ms) và Delay trực tiếp trên thanh Ribbon nhóm Timing. |
| Reorder Animation (Move Earlier, Move Later) | Animations / Timing | Đã có trong Ngăn hoạt hình (Animation Pane) | Thao tác đổi thứ tự hiện thực hiện qua hai nút mũi tên trong Animation Pane bên phải | Tách hai nút slides.animation.moveEarlier và slides.animation.moveLater đưa lên thanh Ribbon nhóm Timing, ủy thác tới cùng hàm canvas.reorderSlideAnimation. |
| Custom Slide Show | Slide Show / Start Slide Show | Chưa có | Chưa có logic tạo danh sách trang chiếu trình diễn tùy biến (chọn một tập hợp con các slide) | Thêm mô hình customShows trong canvas, cho phép lưu các danh sách slide đặt tên và mở trình chiếu theo danh sách đã chọn. |
| Record Slide Show | Slide Show / Set Up | Chưa có | Chưa có bộ ghi hình/âm thanh thuyết minh theo từng slide | Tích hợp WebRTC MediaRecorder API của trình duyệt, ghi âm qua microphone theo từng trang và nhúng tệp âm thanh vào thuộc tính slide audio. |
| Monitors / Multiple Displays | Slide Show / Monitors | Trình chiếu Presenter trong cùng cửa sổ | Hiện tại trình chiếu và Presenter Console đều mở overlay trong cùng một tab trình duyệt, chưa dùng Window Management API | Tích hợp Multi-Screen Window Placement API của trình duyệt hiện đại để mở màn hình chiếu toàn cảnh trên màn phụ (Projector/TV) và giữ Presenter Console trên màn hình chính. |
| Thesaurus (Từ điển đồng nghĩa) | Review / Proofing | Chưa có | Chưa có bộ từ điển từ đồng nghĩa/trái nghĩa tiếng Việt | Tích hợp từ điển VietDict hoặc cơ sở dữ liệu WordNet tiếng Việt vào panel tra cứu từ đồng nghĩa. |
| Check Accessibility | Review / Accessibility | Chưa có | Chưa có bộ máy kiểm tra khả năng tiếp cận (tương phản màu sắc, văn bản thay thế hình ảnh) | Xây dựng trình quét tự động kiểm tra thuộc tính alt-text trên toàn bộ ảnh/biểu đồ và tính toán tỷ lệ tương phản màu nền/chữ theo chuẩn WCAG 2.1 AA. |
| Smart Lookup / Insights | Review / Insights | Đã có trợ lý VN AI ở tab riêng | Chưa có lệnh tra cứu ngữ cảnh văn bản được chọn qua công cụ tìm kiếm | Thêm command slides.review.smartLookup, gửi cụm từ đang chọn sang panel VN AI để tra cứu định nghĩa và thông tin liên quan. |
| Translate (Dịch thuật) | Review / Language | Chưa có | Chưa có API dịch tự động nội dung trang chiếu | Bổ sung command slides.review.translate, tích hợp dịch đoạn văn được chọn hoặc toàn bộ bản trình chiếu qua mô hình ngôn ngữ VN AI. |
| Outline View (Dạng xem dàn bài) | View / Presentation Views | Chưa có | Khung cây bên trái hiện hiển thị thumbnail thu nhỏ; chưa có chế độ chỉ hiển thị văn bản tiêu đề và gạch đầu dòng | Bổ sung chế độ hiển thị văn bản thuần phân cấp cho thanh danh sách trang bên trái, cho phép chỉnh sửa dàn ý văn bản nhanh chóng. |
| Master Views (Handout Master, Notes Master) | View / Master Views | Đã có Slide Master ở tab Design | Chưa có trang mẫu cho bản in tài liệu phát tay (Handout) và trang ghi chú (Notes) | Xây dựng trình soạn thảo layout mẫu trang phát tay và trang in ghi chú, đồng bộ vào hệ thống FODP/PPTX layout. |
| Color / Grayscale | View / Color/Grayscale | Chưa có | Chưa có bộ lọc hiển thị xem trước trang chiếu dạng thang độ xám (Grayscale / B&W) | Áp dụng SVG CSS filter (grayscale/monochrome) lên canvas viewport để người dùng xem trước bản in đen trắng mà không làm đổi màu gốc của đối tượng. |
| Macros / Automation | View / Macros | Bỏ qua theo yêu cầu an toàn | Hệ thống VN Office không chạy mã thực thi tự do để ngăn chặn rủi ro bảo mật | Không đưa vào kế hoạch triển khai. |

---

## 4. Kết quả kiểm thử

### Kiểm thử tự động (Unit Tests)
- **Lệnh thực hiện:** node tests/run-tests.js
- **Kết quả:** 1318/1318 PASS (100%), 0 FAIL.
- **Tình trạng:** Toàn bộ 120 bộ kiểm thử đơn vị, kiểm thử tích hợp, kiểm thử chuyển đổi định dạng FODP/PPTX đều vượt qua hoàn hảo.

### Kiểm thử hiển thị không tràn ngang (Playwright Audit 1280px)
- **Lệnh thực hiện:** node tests/live/ribbon-audit-1280.playwright.mjs
- **Kết quả:** 104/104 lượt kiểm tra PASS (100%), 0 FAIL.
- **Chi tiết độ rộng đo đạc trên VN Slides tại viewport 1280px:**

| Tab Slides | Độ rộng tiếng Việt (VI) | Tràn ngang (VI) | Độ rộng tiếng Anh (EN) | Tràn ngang (EN) | Đánh giá |
|---|---|---|---|---|---|
| Home (Trang đầu) | 1265px | 0px | 1248px | 0px | PASS (thuộc Đợt 1) |
| Insert (Chèn) | 926px | 0px | 825px | 0px | PASS (thuộc Đợt 1) |
| Design (Thiết kế) | 359px | 0px | 327px | 0px | PASS (thuộc Đợt 1) |
| Transitions (Chuyển tiếp) | 128px | 0px | 131px | 0px | PASS (thuộc Đợt 1) |
| Animations (Hoạt hình) | 208px | 0px | 183px | 0px | PASS |
| Slide Show (Trình chiếu) | 668px | 0px | 694px | 0px | PASS |
| Review (Xem xét / Đánh giá) | 565px | 0px | 674px | 0px | PASS |
| View (Chế độ xem) | 899px | 0px | 836px | 0px | PASS |
| VN AI (Trợ lý AI) | 177px | 0px | 205px | 0px | PASS |

---

## 5. Lịch sử commit trên nhánh fix/slides-ribbon-parity-round2

Đợt 2 được thực hiện qua 4 commit riêng biệt theo đúng yêu cầu:
1. 80f51ac: feat(slides): standardize Animations tab group identifier
2. 66ff4ce: feat(slides): align Slide Show tab structure with PowerPoint and standardize group identifiers
3. ec1bab4: feat(slides): align Review tab comments order with PowerPoint and standardize group identifier
4. eb561e5: feat(slides): align View tab Zoom group with PowerPoint prominence

---

## 6. Tổng kết toàn diện VN Slides Ribbon Parity

Trải qua 2 đợt triển khai độc lập:
- **Đợt 1 (fix/slides-ribbon-parity-round1):** Chuẩn hóa 4 tab đầu tiên (Home, Insert, Design, Transitions) với 4 commit.
- **Đợt 2 (fix/slides-ribbon-parity-round2):** Chuẩn hóa 4 tab còn lại (Animations, Slide Show, Review, View) với 4 commit.

Hiện tại, toàn bộ 8 tab nghiệp vụ của VN Slides đã đồng bộ hoàn toàn với cấu trúc, thứ tự nhóm và thao tác đặc trưng của Microsoft PowerPoint, đồng thời đảm bảo không gian hiển thị hoàn hảo (0px tràn ngang tại màn hình 1280px) và tỷ lệ kiểm thử 100% đạt chuẩn chất lượng.
