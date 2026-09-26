# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Xem xét / Đánh giá" (Writer và Sheet)

- **Nhánh**: `design/writer-sheet-review-tab-agy` (tách từ `main` @ `2a625d7`)
- **Worktree**: `E:\VNOffice-agy-review-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Icon-mapping, i18n, Hướng dẫn sử dụng). Tuyệt đối không can thiệp logic đo lường, phân trang hay công thức của Writer/Sheet adapter; không sửa các tệp của agent khác đang làm song song.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 và Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với chuẩn giao diện **Microsoft Office 2016 Professional Plus**. Ảnh chụp thực tế Ribbon của VN Writer và VN Sheet được lưu giữ tại thư mục scratch kiểm thử (`scratch/review-tab-audit/`).

### 1.1. Tab "Đánh giá / Xem xét" của VN Writer vs Tab "Review" của Word 2016
- **Word 2016 Review tab**:
  1. *Proofing*: Spelling & Grammar (F7), Thesaurus (Shift+F7), Word Count.
  2. *Accessibility*: Check Accessibility.
  3. *Language*: Translate, Language.
  4. *Comments*: New Comment, Delete, Previous, Next, Show Comments.
  5. *Tracking*: Track Changes, Display for Review, Show Markup, Reviewing Pane.
  6. *Changes*: Accept, Reject, Previous, Next.
  7. *Compare*: Compare, Combine.
  8. *Protect*: Block Authors, Restrict Editing.
- **VN Writer tab Đánh giá (Review) hiện có**:
  - *Chính tả & Ngữ pháp (proofread)*:
    - Soát lỗi chính tả (`ai.assistant.grammarCheck` - nút lớn, F7): Tích hợp kiểm tra chính tả và ngữ pháp tiếng Việt.
    - Đếm từ (`writer.review.wordCount` - nút lớn): Mở hộp thoại thống kê chi tiết số từ, ký tự (có/không khoảng trắng), đoạn văn và dòng cho toàn tài liệu hoặc vùng chọn.
  - *Ghi chú (comments)*:
    - Thêm ghi chú (`writer.comment.insert` - nút lớn, Ctrl+Alt+M): Gắn ghi chú vào đoạn văn bản đã bôi đen.
    - Cột 1: Xóa nhận xét (`writer.review.commentDelete`), Đã xử lý (`writer.review.commentResolve` - chuyển trạng thái đã xử lý hoặc mở lại).
    - Cột 2: Nhận xét trước (`writer.review.commentPrevious`), Nhận xét sau (`writer.review.commentNext` - nhảy và tô sáng tuần tự).
  - *Theo dõi thay đổi (tracking)*:
    - Theo dõi thay đổi (`writer.trackChanges.toggle` - nút lớn, Ctrl+Shift+E): Bật/tắt chế độ ghi nhận thay đổi (chữ thêm gạch chân xanh, chữ xóa gạch ngang đỏ).
    - Cột 1: Chấp nhận một (`writer.trackChanges.acceptOne`), Chấp nhận thay đổi (`writer.trackChanges.acceptAll`).
    - Cột 2: Từ chối một (`writer.trackChanges.rejectOne`), Từ chối thay đổi (`writer.trackChanges.rejectAll`).
    - Cột 3: Thay đổi trước (`writer.trackChanges.previous`), Thay đổi sau (`writer.trackChanges.next`).
  - *Nhận xét so sánh*: VN Writer bao quát trọn vẹn các tính năng cốt lõi và thông dụng nhất của Word 2016 Review. Nhóm Theo dõi thay đổi kết hợp hài hòa cả công tắc ghi nhận lẫn các thao tác chấp nhận/từ chối và điều hướng; các nút duyệt và chấp nhận/từ chối tự động kích hoạt khi có thay đổi trong văn bản (`hasChanges`) và vô hiệu hóa khi không có thay đổi, hoàn toàn đúng chuẩn Word 2016.

### 1.2. Tab "Xem xét" của VN Sheet vs Tab "Review" của Excel 2016
- **Excel 2016 Review tab**:
  1. *Proofing*: Spelling (F7), Thesaurus, Research.
  2. *Accessibility*: Check Accessibility.
  3. *Insights*: Smart Lookup.
  4. *Language*: Translate.
  5. *Comments*: New Comment (Shift+F2), Delete, Previous, Next, Show/Hide Comment, Show All Comments.
  6. *Changes / Protect*: Protect Sheet, Protect Workbook, Share Workbook, Protect and Share Workbook, Allow Users to Edit Ranges, Track Changes.
- **VN Sheet tab Xem xét (Review) hiện có**:
  - *Chứng minh / Proofing (proofing)*:
    - Chính tả (`sheet.review.spellCheck` - nút lớn, F7): Quét kiểm tra chính tả tiếng Việt trên các ô văn bản của trang tính hiện tại, mở hộp thoại gợi ý và sửa từ.
  - *Ghi chú (comments)*:
    - Ghi chú mới (`sheet.review.commentInsert` - nút lớn, Shift+F2): Thêm hoặc sửa ghi chú cho ô đang chọn.
    - Cột 1: Xóa nhận xét (`sheet.review.commentDelete`), Đã xử lý (`sheet.review.commentResolve`).
    - Cột 2: Nhận xét trước (`sheet.review.commentPrevious`), Nhận xét sau (`sheet.review.commentNext` - tự động chuyển sheet khi duyệt ghi chú).
  - *Bảo vệ (protection)*:
    - Bảo vệ trang tính... (`sheet.sheet.protect` - nút lớn): Khóa sửa ô, định dạng và xóa hàng/cột trên trang tính hiện tại (khóa giao diện).
    - Bảo vệ workbook... (`sheet.workbook.protect` - nút lớn): Khóa cấu trúc sổ làm việc (chặn thêm, xóa, đổi tên, di chuyển hoặc sao chép trang tính, bảo lưu thuộc tính ODF và OOXML khi lưu).
  - *Nhận xét so sánh*: VN Sheet bao quát đủ 3 trụ cột thiết thực nhất của Excel 2016 Review: Soát lỗi chính tả tiếng Việt, Hệ thống ghi chú ô tương tác 2 chiều và Hệ thống bảo vệ 2 tầng (Bảo vệ trang tính + Bảo vệ cấu trúc sổ làm việc).

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Thiếu keyword auto-fallback cho các lệnh Review trong hàm `resolveIcon` (`components.js`)** | **ĐÃ SỬA** | **Hiện trạng**: Nếu một lệnh trên tab Review nhận bản tin cập nhật trạng thái động qua `globalCommandBus.subscribe` mà đối tượng cập nhật không gửi kèm `icon`, hàm `resolveIcon` không có keyword fallback phù hợp và sẽ rơi vào icon mặc định là dấu chấm tròn đen `●` (`cx="12" cy="12" r="4"`).<br>**Nguyên nhân**: Trong `platform/ui-kit/components.js`, hàm `resolveIcon` chưa có các nhánh nhận diện cho nhóm lệnh Review (`comment`, `commentInsert`, `commentDelete`, `commentResolve`, `commentPrevious`, `commentNext`, `wordCount`, `spellCheck`, `grammarCheck`, `trackChange*`, `protectSheet`, `protectWorkbook`).<br>**Giải pháp**: Bổ sung đầy đủ 17 keyword fallbacks trong `resolveIcon` (`components.js`), ánh xạ chính xác tới các SVG vector đa sắc trong `ICONS`. Đảm bảo mọi cập nhật trạng thái động đều hiển thị icon vector sắc nét 100%. |
| 2 | **Sai tên tab trong Hướng dẫn sử dụng `sheet.review.commentNavigation` (`platform/help/entries-sheet.js`)** | **ĐÃ SỬA** | **Hiện trạng**: Trong tệp `entries-sheet.js`, mục trợ giúp Duyệt và xử lý nhận xét ô (`sheet.review.commentNavigation`) ghi `ribbon: { tab: "Đánh giá", ... }` và các bước thực hiện ghi `"Mở tab Đánh giá, nhóm Ghi chú."`. Tuy nhiên, trên VN Sheet, tab này có tên chính thức là **"Xem xét"** (khớp với Excel tiếng Việt và đã được kiểm tra cứng bởi các unit test Sheet).<br>**Nguyên nhân**: Do sao chép nội dung từ Writer (nơi tab có tên "Đánh giá") sang Sheet mà chưa chuẩn hóa lại tên tab theo đúng ứng dụng Sheet.<br>**Giải pháp**: Cập nhật lại `ribbon: { tab: "Xem xét", tabId: "review", group: "Ghi chú" }` và bước hướng dẫn `"Mở tab Xem xét, nhóm Ghi chú."` trong `platform/help/entries-sheet.js`. |
| 3 | **Sai tên nhóm lệnh trong Hướng dẫn sử dụng `writer.review.commentNavigation` (`platform/help/entries-writer.js`)** | **ĐÃ SỬA** | **Hiện trạng**: Trong tệp `entries-writer.js`, mục trợ giúp `writer.review.commentNavigation` ghi `ribbon: { tab: "Đánh giá", tabId: "review", group: "Nhận xét" }` và bước 1 ghi `"Mở tab Đánh giá, nhóm Nhận xét."`. Nhưng trên thanh Ribbon của VN Writer, nhóm lệnh này có nhãn là **"Ghi chú"** (chứa cả nút Thêm ghi chú và 4 nút duyệt/xử lý nhận xét).<br>**Nguyên nhân**: Không đồng bộ giữa định nghĩa ribbon (`label: "Ghi chú"`) và tài liệu trợ giúp.<br>**Giải pháp**: Chuẩn hóa lại thành `ribbon: { tab: "Đánh giá", tabId: "review", group: "Ghi chú" }` và bước 1 `"Mở tab Đánh giá, nhóm Ghi chú."` trong `platform/help/entries-writer.js`. |
| 4 | **Tên nhóm "Chứng minh" trên Sheet Review tab** | **GIỮ NGUYÊN (Không sửa)** | **Lý do**: Unit test hồi quy `tests/unit/slides-spellcheck-ribbon.test.js` dòng 65 kiểm tra cứng: `assert(proofing.label === "Chứng minh", "Tên nhóm phải thống nhất với Sheet")` và `tests/unit/sheet-spellcheck-vi.test.js` dòng 40 kiểm tra nhóm `Chứng minh / Proofing`. Giữ nguyên để bảo toàn tính toàn vẹn của bộ kiểm thử tự động của monorepo. |
| 5 | **Rà soát thuộc tính `id` trên toàn bộ các nhóm lệnh của 2 tab** | **ĐÃ XÁC NHẬN TỐT** | 100% nhóm lệnh trên tab Review của cả Writer (`proofread`, `comments`, `tracking`) và Sheet (`proofing`, `comments`, `protection`) đều đã có thuộc tính `id` tường minh trong cấu hình Ribbon, bảo đảm truy vấn DOM selector và automation test an toàn tuyệt đối. |
| 6 | **Rà soát hiện tượng tràn ngang ở độ phân giải 1440px và 1024px** | **ĐÃ XÁC NHẬN TỐT** | Đã đo đạc thực tế qua Playwright tại cả 2 độ phân giải chuẩn:<br>- **1440px**: Writer `scrollWidth = 1440px`, Sheet `scrollWidth = 1440px` (tràn 0px).<br>- **1024px**: Writer `scrollWidth = 1024px`, Sheet `scrollWidth = 1024px` (tràn 0px).<br>Cả hai tab đều có lượng nút vừa phải, phân bổ khoa học theo dạng cột gọn gàng, hiển thị trọn vẹn 100% không bị co ép hay tràn khung. |
| 7 | **Rà soát nút Launcher mở rộng nhóm lệnh** | **ĐÃ XÁC NHẬN TỐT** | Đối chiếu với Microsoft Office 2016 thật: trên Excel 2016 Review tab, toàn bộ các nhóm lệnh (Proofing, Comments, Changes) đều không có nút launcher. Trên Word 2016 Review tab, chỉ có nhóm Tracking có launcher mở tùy chọn nâng cao (VN Office hiện chưa có hộp thoại cấu hình riêng này). Tuân thủ nghiêm ngặt quy định: không tự thêm nút giả cho tính năng chưa phát triển. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét kiểm tra thực tế trong runtime qua `globalCommandBus._handlers` trên môi trường ứng dụng thật:

- **VN Writer (Tab Đánh giá - 14 lệnh)**:
  - `ai.assistant.grammarCheck`: Mở bảng kiểm tra chính tả/ngữ pháp tiếng Việt VN AI (F7) [OK - handler thật].
  - `writer.review.wordCount`: Mở hộp thoại thống kê số từ, ký tự, đoạn, dòng [OK - handler thật].
  - `writer.comment.insert`: Thêm ghi chú cho đoạn văn bản đã bôi đen (Ctrl+Alt+M) [OK - handler thật].
  - `writer.review.commentDelete`: Xóa ghi chú đang chọn [OK - handler thật].
  - `writer.review.commentResolve`: Đánh dấu đã xử lý hoặc mở lại ghi chú đang chọn [OK - handler thật].
  - `writer.review.commentPrevious`: Nhảy tới ghi chú trước đó [OK - handler thật].
  - `writer.review.commentNext`: Nhảy tới ghi chú tiếp theo [OK - handler thật].
  - `writer.trackChanges.toggle`: Bật/tắt chế độ theo dõi thay đổi (Ctrl+Shift+E) [OK - handler thật].
  - `writer.trackChanges.acceptOne`: Chấp nhận thay đổi đang chọn [OK - handler thật].
  - `writer.trackChanges.acceptAll`: Chấp nhận toàn bộ thay đổi trong tài liệu [OK - handler thật].
  - `writer.trackChanges.rejectOne`: Từ chối thay đổi đang chọn [OK - handler thật].
  - `writer.trackChanges.rejectAll`: Từ chối toàn bộ thay đổi trong tài liệu [OK - handler thật].
  - `writer.trackChanges.previous`: Nhảy tới thay đổi trước đó [OK - handler thật].
  - `writer.trackChanges.next`: Nhảy tới thay đổi tiếp theo [OK - handler thật].
  - *Kết quả*: **14 / 14 lệnh (100%) đều có handler thực tế**, `Missing handlers: 0`.

- **VN Sheet (Tab Xem xét - 8 lệnh)**:
  - `sheet.review.spellCheck`: Mở hộp thoại kiểm tra chính tả tiếng Việt trên các ô của trang tính (F7) [OK - handler thật].
  - `sheet.review.commentInsert`: Mở hộp thoại thêm/sửa ghi chú tại ô đang chọn (Shift+F2) [OK - handler thật].
  - `sheet.review.commentDelete`: Xóa ghi chú tại ô đang chọn [OK - handler thật].
  - `sheet.review.commentResolve`: Đánh dấu đã xử lý hoặc mở lại ghi chú tại ô đang chọn [OK - handler thật].
  - `sheet.review.commentPrevious`: Nhảy tới ghi chú trước đó trong trang tính [OK - handler thật].
  - `sheet.review.commentNext`: Nhảy tới ghi chú tiếp theo trong trang tính [OK - handler thật].
  - `sheet.sheet.protect`: Mở hộp thoại bảo vệ trang tính (khóa nội dung ô, định dạng, hàng/cột) [OK - handler thật].
  - `sheet.workbook.protect`: Mở hộp thoại bảo vệ cấu trúc workbook (chặn thêm, xóa, đổi tên trang tính) [OK - handler thật].
  - *Kết quả*: **8 / 8 lệnh (100%) đều có handler thực tế**, `Missing handlers: 0`.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

- `platform/help/entries-writer.js`:
  - Mục `writer.review.wordCount` (dòng ~38): Hướng dẫn chi tiết cách mở và sử dụng hộp thoại Đếm từ (F1, ribbon, nhấp vào thanh trạng thái).
  - Mục `writer.trackChanges` (dòng ~54): Hướng dẫn bật/tắt (Ctrl+Shift+E), duyệt thay đổi trước/sau, chấp nhận và từ chối từng cái hoặc hàng loạt.
  - Mục `writer.comment.insertHelp` (dòng ~578): Hướng dẫn cách bôi đen văn bản và thêm ghi chú (Ctrl+Alt+M).
  - Mục `writer.review.commentNavigation` (dòng ~207): Đã chuẩn hóa nhóm lệnh thành `group: "Ghi chú"` khớp chuẩn với giao diện ribbon.
- `platform/help/entries-sheet.js`:
  - Mục `sheet.review.spellCheck` (dòng ~706): Hướng dẫn chi tiết kiểm tra chính tả tiếng Việt trên trang tính bằng nút Chính tả hoặc F7.
  - Mục `sheet.review.commentInsert` (dòng ~721): Hướng dẫn thêm và sửa ghi chú ô (Shift+F2).
  - Mục `sheet.review.commentNavigation` (dòng ~267): Đã chuẩn hóa tên tab thành `tab: "Xem xét"` khớp chuẩn với giao diện Sheet.
  - Mục `sheet.sheet.protect` (dòng ~308) & `sheet.workbook.protect` (dòng ~324): Mô tả rõ ràng sự khác biệt giữa bảo vệ trang tính (khóa nội dung ô) và bảo vệ workbook (khóa cấu trúc trang tính).
- *Kết luận*: Toàn bộ 100% tính năng trên tab Review của Writer và Sheet đều có tài liệu hướng dẫn sử dụng tiếng Việt chi tiết, rõ ràng, không dùng placeholder.

---

## 5. Danh mục file thay đổi

1. `platform/ui-kit/components.js`: Bổ sung 17 keyword fallbacks trong `resolveIcon` cho toàn bộ các lệnh của tab Review (ghi chú, kiểm tra chính tả, đếm từ, theo dõi thay đổi, bảo vệ trang tính/workbook).
2. `platform/help/entries-sheet.js`: Chuẩn hóa tên tab từ "Đánh giá" thành "Xem xét" trong mục trợ giúp `sheet.review.commentNavigation`.
3. `platform/help/entries-writer.js`: Chuẩn hóa tên nhóm lệnh từ "Nhận xét" thành "Ghi chú" trong mục trợ giúp `writer.review.commentNavigation`.
4. `docs/HANDOFF-REVIEW-TAB-DESIGN.md`: Báo cáo bàn giao chi tiết đợt rà soát tab Xem xét / Đánh giá.

*(Tuyệt đối không can thiệp các file logic hoặc file thuộc quyền agent khác: `writer-adapter.js`, `sheet-adapter.js`, `ooxml_zip_patch.py`, `sheet-grid.js`, `main.py`, `index.html`, `scripts/layout-audit/_time_sheet_open_stages.py`)*.

---

## 6. Kết quả kiểm thử

- `node tests/run-tests.js`: **1834 / 1834 PASS (100%)**, `0 FAIL`.
- Kiểm tra Playwright thực tế trên Microsoft Edge:
  - **Màn hình rộng (1440px)**:
    - Writer Review: `scrollWidth = 1440px`, `isOverflowing: false`.
    - Sheet Review: `scrollWidth = 1440px`, `isOverflowing: false`.
    - 100% nút có icon vector SVG rõ nét, nhãn chuẩn tiếng Việt.
  - **Màn hình hẹp (1024px)**:
    - Writer Review: `scrollWidth = 1024px`, `isOverflowing: false`.
    - Sheet Review: `scrollWidth = 1024px`, `isOverflowing: false`.
    - Toàn bộ nhóm lệnh hiển thị ngay ngắn, không bị tràn hay cuộn ngang.
