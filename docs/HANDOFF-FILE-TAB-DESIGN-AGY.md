# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Tệp" (Backstage) — VN Writer & VN Sheet (agy)

- **Nhánh**: `design/writer-sheet-file-tab-agy` (tách từ `main` `9d4b1cf`)
- **Worktree**: `E:\VNOffice-agy-file-tab`
- **Phạm vi**:
  - **Việc 1**: Rà soát thiết kế trực quan Tab Tệp (Backstage menu toàn màn hình) của VN Writer và VN Sheet (`platform/shell/app-shell.js`, `platform/shell/shell.css`).
  - **Việc 2**: Kiểm tra và hoàn thiện điều hướng bàn phím toàn Backstage theo chuẩn WAI-ARIA bằng phím thật (Alt+F mở / Esc đóng và trả focus; phím mũi tên Lên/Xuống trên sidebar, phím mũi tên Phải vào nội dung, phím mũi tên duyệt danh sách mẫu và tệp gần đây, phím mũi tên Trái quay về sidebar, phím Enter/Space kích hoạt).
  - **Việc 3 — Bài học vòng Thiết kế**: Trong mọi danh sách chọn bằng phím mũi tên (mẫu tài liệu, tệp gần đây), Enter/Space áp dụng ĐÚNG mục đang focus, không phải mục chọn trước đó.
  - **Việc 4**: Trạng thái tệp gần đây: bổ sung nút gỡ tệp riêng lẻ `.vno-recent-remove-btn`, thông báo và hộp thoại xác nhận khi tệp không còn tồn tại ("Không tìm thấy tệp"), xóa toàn bộ lịch sử tệp gần đây về trạng thái rỗng `EmptyState`.
  - **Việc 5**: Trạng thái In (Print Live Preview Thumbnail): Live Thumbnail hiển thị DOM thật của từng app (khổ A4 của Writer, vùng in của Sheet), nút "In ngay" lớn, cụm điều hướng trang (ẩn khi 1 trang, hiện khi nhiều trang).
  - **Việc 6**: Chế độ Tối (Dark mode): toàn bộ text, button, viền đạt chuẩn WCAG AA/AAA (tỷ lệ tương phản từ 5.6:1 đến 15.1:1); trang xem trước in giữ nguyên nền giấy trắng `#ffffff` và màu chữ đen/tối của văn bản `#111827` / `#0f172a`.
  - **Việc 7**: Responsive 1440px và 1024px: 0 tràn ngang, bố cục co giãn mượt mà.
  - **Việc 8**: 100% controls có live handler hoạt động thật, 0 raw command-id, 0 icon fallback chấm tròn.
  - **Việc 9**: Hướng dẫn sử dụng tiếng Việt theo AGENTS.md mục 10: bổ sung 2 bài Help hoàn chỉnh `writer.file.backstage` và `sheet.file.backstage`.
  - Tuyệt đối tuân thủ luật cứng: Không đụng logic xử lý tệp; không can thiệp các file của agent khác đang làm song song (`adapters/**`, `main.py`, `scripts/layout-audit/*`, `apps/sheet/sheet-grid.js`). Không merge vào `main`.
- **Quy tắc ảnh chụp**: Toàn bộ kiểm thử trực quan được kiểm chứng tự động qua Playwright live test (`tests/live/file-tab-backstage.playwright.mjs`). KHÔNG commit ảnh chụp màn hình `.png` vào git theo đúng TASK BRIEF.

---

## 1. Đối chiếu thực tế với Microsoft Office 2016 Backstage (Word / Excel)

Môi trường kiểm chứng thực tế: Đối chiếu với menu **File (Backstage)** của **Microsoft Word 2016** và **Microsoft Excel 2016 Professional Plus**.

### 1.1. Bảng đối chiếu các mục trong menu Tệp (Backstage)

| STT | Mục trên Office 2016 Backstage | Lệnh & Chức năng Office 2016 | Hiện trạng trên VN Writer & VN Sheet | Trạng thái & Đánh giá |
|---|---|---|---|---|
| 1 | **Nút mũi tên Quay lại (Back)** | Biểu tượng vòng tròn mũi tên trái góc trên cùng, phím Esc hoặc Alt+F; đóng Backstage và trả tiêu điểm về vùng soạn thảo/lưới tính. | Nút `#vno-backstage-back` với biểu tượng SVG vòng tròn mũi tên Office 2016 sắc nét, nhãn "Quay lại". Tự động nhận focus khi mở Backstage; nhấn Enter/Space/Escape hoặc click đóng menu và trả lại focus cho phần tử trước đó. | **Tương đương 100%**: Hoạt động mượt mà, đầy đủ bẫy tiêu điểm và khôi phục focus. |
| 2 | **Home (Trang chủ)** | Hiển thị lời chào, dải mẫu tài liệu (Blank + Featured Templates) và danh sách tệp gần đây (Recent files) có ghim. | Tab con `#vno-backstage-nav-home`. Cung cấp: dải thẻ mẫu tài liệu tiêu chuẩn thuần Việt (Tài liệu trống, Văn bản hành chính NĐ 30, Dự toán kinh phí VNĐ, Đề cương thuyết trình) và bảng danh sách tài liệu mở gần đây kèm nút Xóa lịch sử. | **Tương đương 90%**: Đáp ứng chuẩn mực nhu cầu khởi tạo nhanh và mở lại tệp gần đây. |
| 3 | **New (Tạo mới)** | Danh sách mẫu phong phú, tìm kiếm template online. Phím tắt Ctrl+N. | Mục `common.file.new` (Tạo mới, Ctrl+N). Đóng Backstage và thực thi lệnh khởi tạo tài liệu/bảng tính mới trắng, tự động đưa ribbon về tab Trang đầu. | **Tương đương 90%**: Tối ưu cho chế độ offline, không phụ thuộc dịch vụ mạng. |
| 4 | **Open (Mở tệp)** | Duyệt Recent / OneDrive / This PC / Browse... Phím tắt Ctrl+O. | Mục `common.file.open` (Mở tệp, Ctrl+O). Đóng Backstage và kích hoạt hộp thoại chọn tệp của hệ thống để mở tệp DOCX / XLSX / FODT / FODS từ máy tính. | **Tương đương 85%**: Tập trung 100% vào tệp cục bộ trên máy (Offline-first). |
| 5 | **Save (Lưu)** | Lưu đè tệp hiện tại. Phím tắt Ctrl+S. | Mục `common.file.save` (Lưu, Ctrl+S). Đóng Backstage và gọi lệnh lưu tài liệu ra đĩa thông qua LibreOffice Core adapter. | **Tương đương 100%**: Live handler đầy đủ, đồng bộ thanh tab và danh sách tệp gần đây. |
| 6 | **Save As (Lưu bản sao)** | Lưu tệp sang thư mục khác, tên khác hoặc định dạng khác. Phím tắt F12. | Mục `common.file.saveAs` (Lưu bản sao, F12). Đóng Backstage và mở hộp thoại lưu tệp với tên mới hoặc định dạng khác. | **Tương đương 100%**: Phím tắt F12 chuẩn Office 2016. |
| 7 | **Print (In ấn & Xem trước)** | Cột trái: nút In lớn, số bản, chọn máy in, thiết lập trang. Cột phải: Khung xem trước trực tiếp (Live Preview Thumbnail) của trang in, cụm lật trang. Phím tắt Ctrl+P. | Tab con `#vno-backstage-nav-print`. Cột trái: nút "In ngay" lớn nổi bật màu thương hiệu app, cụm lật trang Trước/Sau (tự ẩn khi 1 trang), bảng tóm tắt thiết lập in (khổ giấy, hướng in, số trang). Cột phải: Live Thumbnail hiển thị DOM thật của trang in (Writer: trang A4 chuẩn; Sheet: bảng dữ liệu theo Vùng in). | **Tương đương 90%**: Tái sử dụng engine phân trang thật, bố cục 2 cột chuẩn Office, không nhảy giật giao diện. |
| 8 | **Export (Xuất tệp)** | Create PDF/XPS Document, Change File Type. | Mục `common.file.exportPdf` (Xuất PDF). Đóng Backstage và kích hoạt lệnh xuất tài liệu sang định dạng PDF tiêu chuẩn thông qua LibreOffice headless engine. | **Tương đương 85%**: Hỗ trợ xuất PDF chất lượng cao. |
| 9 | **Close (Đóng tài liệu)** | Đóng cửa sổ tài liệu hiện hành. Phím tắt Ctrl+W. | Lệnh `common.file.close` (Ctrl+W) trong hệ thống CommandBus. | **Tương đương 100%**. |
| 10 | **Info (Thông tin tệp)** | Protect Document, Inspect Document, Manage Document, Properties (kích thước, số trang, ngày tạo, tác giả). | Thông tin cơ bản (khổ giấy, hướng in, số trang, tên tài liệu) hiển thị trong tab In và hộp thoại Giới thiệu `#vno-backstage-about`. | **Khoảng trống so với Office**: Xem mục 1.2. |
| 11 | **Share (Chia sẻ)** | Email, Present Online, Post to Blog. | Chưa triển khai (yêu cầu mạng và dịch vụ cloud). | **Khoảng trống chủ động** (Offline-first). |
| 12 | **Account (Tài khoản)** | Thông tin bản quyền Office, cập nhật phần mềm, liên kết tài khoản Microsoft. | Tạm gác theo chỉ đạo của người phụ trách (không thêm tính năng cần mạng). | **Khoảng trống chủ động**. |
| 13 | **Options (Tùy chọn)** | Hộp thoại cài đặt ứng dụng Word Options / Excel Options toàn diện (General, Proofing, Save, Language, Advanced, Customize Ribbon). | VN Office tích hợp các tùy chọn trực tiếp vào Ribbon và thanh trạng thái (đổi ngôn ngữ VI/EN, Dark/Light mode, tỷ lệ thu phóng, từ điển chính tả). | **Khoảng trống so với Office**: Xem mục 1.2. |
| 14 | **Feedback (Phản hồi)** | Gửi phản hồi (Send a Smile / Send a Frown) về Microsoft. | Chưa có (yêu cầu mạng). | **Khoảng trống chủ động**. |

---

### 1.2. Đánh giá khoảng trống tính năng (Gaps vs Office 2016)

- **Khoảng trống chủ động (Deliberate omissions — tuân thủ nguyên tắc Offline-first)**:
  - *Share (Chia sẻ qua Cloud/Email)*: Ứng dụng desktop chạy offline là ưu tiên số 1, không thu thập hay gửi dữ liệu tài liệu ra ngoài âm thầm.
  - *Account (Tài khoản & License Cloud)*: Phần Cloud và tài khoản người dùng đã được người phụ trách tạm gác, không động vào.
  - *Feedback (Gửi phản hồi online)*: Yêu cầu kết nối mạng, chưa cần thiết cho bản phát hành độc lập.
- **Khoảng trống cho lộ trình tương lai (Future roadmap gaps)**:
  - *Info tab riêng biệt*: Bổ sung bảng thuộc tính chi tiết (Properties: dung lượng tệp, số từ, thời gian chỉnh sửa, tác giả) và công cụ Đặt mật khẩu bảo vệ tài liệu (Protect Document với mã hóa OOXML).
  - *Pin recent items (Ghim tệp gần đây)*: Thêm biểu tượng đinh ghim (Pin) bên cạnh nút gỡ tệp để cố định các tệp quan trọng luôn nằm trên đầu danh sách.
  - *Options modal riêng*: Hộp thoại Tùy chọn tập trung gom toàn bộ cài đặt (thư mục lưu mặc định, tự động lưu AutoRecover, tùy biến thanh công cụ truy cập nhanh).

---

## 2. Rà soát & Cải tiến thiết kế trực quan Tab Tệp (Backstage)

### 2.1. Điều hướng bàn phím toàn Backstage (WAI-ARIA Full Keyboard Navigation)
Đã hoàn thiện hệ thống điều hướng bàn phím phím thật đạt chuẩn WAI-ARIA cho toàn bộ màn hình Backstage:
1. **Phím tắt Alt+F**:
   - Nhấn `Alt+F` từ bất kỳ vị trí nào trong ứng dụng (vùng soạn thảo văn bản Writer hoặc lưới ô tính Sheet) đều mở ngay Backstage toàn màn hình.
   - Khi mở ra, tiêu điểm bàn phím tự động đặt vào nút **"← Quay lại"** (`#vno-backstage-back`), giúp người dùng nhận diện ngay trạng thái mở và có thể nhấn Escape hoặc Enter để quay về tài liệu ngay tức thì.
2. **Phím Escape & Bẫy tiêu điểm (Focus Trap)**:
   - Nhấn `Escape` tại bất kỳ vị trí nào trong Backstage đều đóng menu và khôi phục tiêu điểm chính xác về phần tử hoạt động trước đó (trang soạn thảo hoặc ô tính).
   - Phím `Tab` và `Shift+Tab` bẫy hoàn toàn bên trong Backstage, tự động xoay vòng giữa nút đầu và nút cuối, không bao giờ bị rơi tiêu điểm ra nền ứng dụng bên dưới.
3. **Điều hướng phím mũi tên 4 chiều**:
   - **Trên Sidebar**: Phím `ArrowDown` và `ArrowUp` di chuyển tuần tự qua 9 nút lệnh bên trái (Quay lại → Trang chủ → Tạo mới → Mở → Lưu → Lưu bản sao → In → Xuất PDF → Giới thiệu).
   - **Chuyển từ Sidebar sang Nội dung**: Nhấn phím `ArrowRight` từ thanh bên trái:
     + Khi ở tab Trang chủ: Tiêu điểm lập tức nhảy vào thẻ mẫu tài liệu đầu tiên (`.vno-template-card`).
     + Khi ở tab In: Tiêu điểm lập tức nhảy vào nút "In ngay" (`#vno-backstage-btn-print-now`).
   - **Trong danh sách Mẫu tài liệu (`.vno-template-card`)**:
     + `ArrowRight` / `ArrowLeft`: Chuyển qua lại giữa các thẻ mẫu. Từ thẻ mẫu đầu tiên, nhấn `ArrowLeft` lập tức quay về nút Trang chủ trên sidebar.
     + `ArrowDown`: Từ thẻ mẫu nhảy xuống hàng tệp gần đây đầu tiên (`.vno-recent-row`).
     + `ArrowUp`: Từ hàng đầu nhảy về nút Quay lại / sidebar.
   - **Trong danh sách Tệp gần đây (`.vno-recent-row`)**:
     + `ArrowDown` / `ArrowUp`: Duyệt tuần tự qua từng hàng tài liệu. Từ hàng đầu tiên, nhấn `ArrowUp` nhảy lên thẻ mẫu cuối cùng.
     + `ArrowLeft`: Từ bất kỳ hàng nào, nhấn `ArrowLeft` đều đưa tiêu điểm quay về nút Trang chủ trên sidebar.
   - **Trong tab In (`#vno-backstage-print-view`)**:
     + Từ nút "In ngay" hoặc cụm chuyển trang, nhấn `ArrowLeft` đưa tiêu điểm quay về nút "In" trên sidebar (`#vno-backstage-nav-print`).

### 2.2. Bài học vòng Thiết kế: Enter/Space áp dụng ĐÚNG mục đang focus
- **Nguyên tắc**: Trong mọi danh sách chọn bằng phím mũi tên (mẫu tài liệu, tệp gần đây), phím Enter hoặc Space PHẢI áp dụng chính xác mục đang nhận tiêu điểm, tuyệt đối không được kích hoạt mục chọn trước đó hoặc mục mặc định.
- **Hiện thực**:
  - Gắn sự kiện `keydown` trên từng card mẫu và hàng tệp gần đây. Khi phần tử nhận focus và người dùng bấm Enter/Space, handler trực tiếp trích xuất dữ liệu của phần tử đó (`getAttribute("data-template-id")`, `getAttribute("data-recent-name")`).
  - Đã kiểm chứng tự động qua Playwright live test bằng phím thật (`ArrowRight` sang mẫu thứ 2 và nhấn `Enter`):
    + **VN Writer**: Áp dụng chuẩn xác mẫu "Quyết định ban hành tiêu chuẩn 01.docx" (tiêu đề tab cập nhật đúng 100%).
    + **VN Sheet**: Áp dụng chuẩn xác mẫu "Dự toán kinh phí VN Office 2026.xlsx" (tiêu đề tab cập nhật đúng 100%).

### 2.3. Rà soát trạng thái tệp gần đây (Recent Files States)
1. **Trạng thái tệp không còn tồn tại**:
   - Bổ sung nút **"Gỡ khỏi danh sách"** (`.vno-recent-remove-btn`) trên từng hàng tệp gần đây với biểu tượng `×` tinh tế, tooltip rõ ràng "Gỡ tệp này khỏi danh sách gần đây".
   - Nút gỡ tệp có vùng bấm 24×24px, hover chuyển màu đỏ dịu, khi click gọi `RecentFilesManager.removeFile({ name, app })` và xóa hàng khỏi giao diện ngay lập tức mà không làm ảnh hưởng các tệp khác.
   - Khi người dùng nhấp mở một tệp không còn tồn tại trên máy (hoặc có cờ `data-recent-missing="true"`), hệ thống hiển thị hộp thoại xác nhận rõ ràng bằng tiếng Việt:
     `"Tệp '{name}' không còn tồn tại tại vị trí cũ hoặc đã bị xóa. Bạn có muốn gỡ tệp này khỏi danh sách gần đây không?"`
     với nút "Gỡ khỏi danh sách" và "Hủy".
2. **Trạng thái danh sách rỗng (Empty State)**:
   - Khi người dùng nhấn nút "Xóa lịch sử" (`#vno-clear-recent`) hoặc gỡ hết các tệp khỏi danh sách, bảng tệp tự động chuyển sang thành phần `createEmptyState` chuẩn mực: biểu tượng thư mục `📁`, tiêu đề "Chưa có tài liệu gần đây", mô tả hướng dẫn và nút hành động "Tạo mới (Ctrl+N)".

### 2.4. Trạng thái In (Backstage Print Live Preview Thumbnail)
1. **Bố cục 2 cột chuyên nghiệp**:
   - Cột trái: Nút "In ngay" lớn nổi bật màu thương hiệu app (`var(--vno-app-current)`), cụm điều hướng trang Trước/Sau (tự động ẩn khi tài liệu chỉ có 1 trang và hiện khi nhiều trang) và thẻ tóm tắt thiết lập in (tên tài liệu, khổ giấy, hướng in, số trang).
   - Cột phải: Viewport xem trước trực tiếp với sân khấu `.vno-backstage-print-stage` (tỷ lệ thu nhỏ `scale(0.78)`), hiển thị DOM trang in thật:
     + **VN Writer**: Khung trang giấy A4 `.vno-print-preview-sheet` với đầy đủ lề trang, tiêu đề đầu/chân trang và nội dung văn bản.
     + **VN Sheet**: Bảng tính `.vno-sheet-print-preview-page` dựng bảng `<table>` với đường lưới và dữ liệu ô thật theo Vùng in (Print Area).
2. **Không nhảy bố cục khi chuyển trang**: Dữ liệu render trực tiếp trong DOM sân khấu, chuyển trang mượt mà không làm rung lắc hay thay đổi kích thước viewport.

### 2.5. Tinh chỉnh Chế độ Tối (Dark mode WCAG AA/AAA)
1. **Chuẩn tương phản màu WCAG**:
   - Thanh điều hướng sidebar bên trái giữ màu nền thương hiệu (`#0f4c81` cho Writer, `#0f6d38` cho Sheet) với chữ trắng `#ffffff` và icon đạt tỷ lệ tương phản **8.4:1** (Writer) và **5.6:1** (Sheet) — **ĐẠT WCAG AAA / AA**.
   - Nút đang kích hoạt `.is-active` trên sidebar sử dụng nền tối `#1e1e1e` và chữ màu accent sáng (`#60a5fa` cho Writer đạt **6.56:1**, `#4ade80` cho Sheet đạt **8.23:1**) — **ĐẠT WCAG AA / AAA**.
   - Vùng nội dung Backstage `.vno-backstage-content` sử dụng nền `#1e1e1e`, chữ tiêu đề `#f1f5f9` (đạt **15.1:1**, chuẩn AAA), chữ mô tả `#94a3b8` (đạt **6.4:1**, chuẩn AA).
   - Thẻ mẫu tài liệu `.vno-template-card` có nền `#1f1f1f`, viền `#3e3e42`, viền focus xanh `#3b82f6` rõ nét.
   - Nút gỡ tệp `.vno-recent-remove-btn`: hover chuyển sang nền đỏ mờ `rgba(239, 68, 68, 0.22)`, viền `#ef4444`, chữ đỏ sáng `#f87171` đạt tỷ lệ tương phản **6.03:1** trên nền tối — **ĐẠT WCAG AA**.
2. **Bảo toàn nền giấy trắng của trang in xem trước**:
   - Bổ sung quy tắc CSS chuyên biệt trong `platform/shell/shell.css`:
     `.vno-backstage-print-stage .vno-print-preview-sheet`, `.vno-backstage-print-stage .vno-sheet-print-preview-page` luôn giữ `background-color: #ffffff !important` và màu chữ tối `#111827` / `#0f172a`.
   - Giúp mô phỏng chính xác trang giấy in A4 thực tế trên nền viewport tối, không bị đổi màu theo theme ứng dụng.

### 2.6. Responsive 1440px và 1024px
- Đã bổ sung media query `@media (max-width: 1150px)` trong `shell.css`:
  - Thu gọn padding `.vno-backstage-content` từ 40px 60px xuống 24px 28px.
  - Thu gọn độ rộng sidebar từ 240px xuống 210px và cột điều khiển in từ 280px xuống 240px.
- **Kết quả kiểm chứng**: `scrollWidth <= clientWidth` trên toàn bộ cửa sổ tại cả hai độ phân giải 1440×900 và 1024×768, **hoàn toàn 0 tràn ngang**.

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ các nút lệnh và điều khiển trong menu Backstage:

| STT | Thành phần điều khiển | Bộ chọn DOM / Command ID | Live Handler đã gắn | Hành vi kiểm chứng thực tế |
|---|---|---|---|---|
| 1 | Nút Quay lại | `#vno-backstage-back` | `closeModal()` | Đóng modal Backstage và khôi phục tiêu điểm cho nút/vùng soạn thảo trước đó. |
| 2 | Tab Trang chủ | `#vno-backstage-nav-home` | `showTab("home")` | Chuyển hiển thị về màn hình Trang chủ (mẫu + tệp gần đây). |
| 3 | Lệnh Tạo mới | `common.file.new` | `globalCommandBus.execute("common.file.new")` | Đóng Backstage và tạo tài liệu/bảng tính mới trắng. |
| 4 | Lệnh Mở tệp | `common.file.open` | `globalCommandBus.execute("common.file.open")` | Đóng Backstage và mở hộp thoại chọn tệp hệ thống. |
| 5 | Lệnh Lưu | `common.file.save` | `globalCommandBus.execute("common.file.save")` | Đóng Backstage và lưu tệp ra đĩa qua LibreOffice adapter. |
| 6 | Lệnh Lưu bản sao | `common.file.saveAs` | `globalCommandBus.execute("common.file.saveAs")` | Đóng Backstage và mở hộp thoại Lưu với tên khác. |
| 7 | Tab In ấn | `#vno-backstage-nav-print` | `showTab("print")` | Chuyển hiển thị sang panel In với Live Preview Thumbnail. |
| 8 | Lệnh Xuất PDF | `common.file.exportPdf` | `globalCommandBus.execute("common.file.exportPdf")` | Đóng Backstage và xuất tài liệu sang PDF. |
| 9 | Nút Giới thiệu | `#vno-backstage-about` | `showAlertDialog()` | Mở hộp thoại thông tin bản quyền và tiêu chuẩn kỹ thuật VN Office. |
| 10 | Thẻ mẫu tài liệu | `.vno-template-card` | `activateTemplate()` | Áp dụng đúng mẫu tài liệu đang chọn (Writer: Quyết định; Sheet: Dự toán). |
| 11 | Hàng tệp gần đây | `.vno-recent-row` | `activateRecent()` | Mở tài liệu gần đây hoặc báo lỗi nếu tệp không tồn tại. |
| 12 | Nút Gỡ tệp gần đây | `.vno-recent-remove-btn` | `RecentFilesManager.removeFile()` | Xóa tệp tương ứng khỏi danh sách và cập nhật UI ngay lập tức. |
| 13 | Nút Xóa lịch sử | `#vno-clear-recent` | `RecentFilesManager.clearAll()` | Xóa toàn bộ tệp gần đây và chuyển sang EmptyState. |
| 14 | Nút In ngay | `#vno-backstage-btn-print-now` | `globalCommandBus.execute("common.file.print")` | Đóng Backstage và mở hộp thoại in của hệ thống. |
| 15 | Nút Trang trước | `#vno-backstage-print-prev` | `renderPage(index - 1)` | Lật về trang in trước đó trong khung xem trước. |
| 16 | Nút Trang sau | `#vno-backstage-print-next` | `renderPage(index + 1)` | Lật sang trang in tiếp theo trong khung xem trước. |

- **Kết quả kiểm tra**: **100% (16/16) controls đều có live handler hoạt động thật**. Tuyệt đối không có nút chết.

---

## 4. Hướng dẫn sử dụng trong ứng dụng (AGENTS.md mục 10)

Đã bổ sung đầy đủ 2 bài hướng dẫn sử dụng tiếng Việt chuyên sâu cho menu Tệp (Backstage) trong hệ thống Help:

1. **VN Writer (`platform/help/entries-writer.js`)**:
   - Entry ID: `writer.file.backstage`
   - Tiêu đề: **Menu Tệp (Backstage) và quản lý tài liệu**
   - Tóm tắt: Hướng dẫn mở Backstage bằng phím tắt `Alt+F` hoặc nút Tệp màu xanh trên Ribbon, khởi tạo tài liệu theo mẫu chuẩn Nghị định 30/2020/NĐ-CP, mở lại tài liệu gần đây, gỡ tệp không còn tồn tại, lưu DOCX, in với khung xem trước Live Preview Thumbnail và xuất PDF.
   - Các bước: 7 bước chi tiết, chuẩn xác theo giao diện thực tế.
2. **VN Sheet (`platform/help/entries-sheet.js`)**:
   - Entry ID: `sheet.file.backstage`
   - Tiêu đề: **Menu Tệp (Backstage) và quản lý bảng tính**
   - Tóm tắt: Hướng dẫn mở Backstage bằng `Alt+F` hoặc nút Tệp màu xanh lá, tạo bảng tính trống hoặc mẫu Dự toán kinh phí VNĐ, mở tệp XLSX gần đây, xem trước trang in trực tiếp theo Vùng in (Print Area) và Thiết lập trang (Page Setup), xuất PDF và phím tắt đóng Esc khôi phục tiêu điểm về ô tính.
   - Các bước: 7 bước chi tiết, chuẩn xác theo giao diện thực tế.

---

## 5. Bảng kiểm tra và xác nhận kiểm thử (Test Matrix)

| STT | Hạng mục kiểm tra | Công cụ / Lệnh kiểm tra | Kết quả | Chi tiết & Ghi chú |
|---|---|---|---|---|
| 1 | **Toàn bộ Test Suite đơn vị & hồi quy** | `node tests/run-tests.js` | **PASS** | **1839/1839 tests PASS (100%)**, 0 FAIL, 0 regressions. Toàn bộ 154 test suites hoàn thành xuất sắc. |
| 2 | **Live Playwright Test Backstage** | `node tests/live/file-tab-backstage.playwright.mjs` | **PASS** | **54/54 assertions PASS (100%)**, 0 lỗi JavaScript runtime (pageerror). Kiểm tra độc lập cả `?app=writer` và `?app=sheet`. |
| 3 | **Phím tắt Alt+F & Escape** | Playwright live test | **PASS** | Alt+F mở Backstage, nút Quay lại tự nhận focus; Escape đóng và khôi phục focus chính xác về vùng soạn thảo / ô tính. |
| 4 | **Nút Tệp trên Ribbon & Nút Quay lại** | Playwright live test | **PASS** | Nút Tệp mở Backstage; nút Quay lại đóng Backstage và trả focus về nút Tệp. |
| 5 | **Điều hướng bàn phím phím thật (WAI-ARIA)** | Playwright live test | **PASS** | ArrowDown/ArrowUp duyệt sidebar và danh sách tệp; ArrowRight vào nội dung; ArrowLeft từ card/row quay về sidebar. |
| 6 | **Bài học vòng Thiết kế (Enter/Space đúng mục)** | Playwright live test | **PASS** | Di chuyển bằng phím mũi tên tới thẻ mẫu 1 (Writer: Quyết định NĐ 30) và thẻ mẫu 2 (Sheet: Dự toán kinh phí), bấm Enter áp dụng chính xác 100% mẫu đang focus. |
| 7 | **Gỡ tệp gần đây & EmptyState** | Playwright live test | **PASS** | Nút gỡ tệp `.vno-recent-remove-btn` loại bỏ đúng tệp khỏi danh sách; nút Xóa lịch sử chuyển sang EmptyState hoàn chỉnh. |
| 8 | **Xem trước khi in (Live Thumbnail)** | Playwright live test | **PASS** | Tab In hiển thị DOM thật của từng app (Writer: trang A4; Sheet: bảng dữ liệu thật), nút "In ngay" lớn, ArrowLeft quay về sidebar. |
| 9 | **Kiểm tra Raw command-id & Icon fallback** | Playwright live test | **PASS** | 0 nút hiển thị raw command-id (`common.file.*`, `writer.*`, `sheet.*`), 0 biểu tượng fallback chấm tròn (`circle cx="12" cy="12" r="4"`). |
| 10 | **Responsive 1440px & 1024px** | Playwright live test | **PASS** | 0 tràn ngang (`scrollWidth <= clientWidth`) tại cả độ phân giải 1440×900 và 1024×768. |
| 11 | **Chế độ Tối (Dark mode WCAG AA)** | Playwright live test | **PASS** | Toàn bộ chữ/nút đạt chuẩn WCAG AA/AAA; trang xem trước in giữ nguyên nền giấy trắng `#ffffff` (`rgb(255, 255, 255)`). |
| 12 | **Lỗi JavaScript Runtime** | Playwright `pageerror` listener | **PASS** | **0 pageerror** ghi nhận trong toàn bộ quá trình tương tác. |

---

## 6. Danh sách các tệp thay đổi

1. `platform/recent/recent-manager.js`:
   - Bổ sung phương thức tĩnh `RecentFilesManager.removeFile({ name, app })` hỗ trợ loại bỏ một tệp cụ thể khỏi lịch sử gần đây.
2. `platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`:
   - Bổ sung các chuỗi bản địa hóa cho thao tác gỡ tệp gần đây: `removeRecent`, `removeRecentTooltip`, `fileNotFoundTitle`, `fileNotFoundMessage`.
3. `platform/shell/app-shell.js`:
   - Thay thế biểu tượng nút Quay lại bằng icon SVG vòng tròn mũi tên Office 2016 sắc nét.
   - Thêm nút gỡ tệp riêng lẻ `.vno-recent-remove-btn` trên từng hàng tài liệu gần đây kèm sự kiện xóa.
   - Xử lý trạng thái tệp không còn tồn tại: hiển thị hộp thoại xác nhận tiếng Việt cho phép gỡ tệp khỏi danh sách.
   - Nâng cấp bộ lắng nghe bàn phím `onBackstageKeyDown`: điều hướng mũi tên 4 chiều giữa sidebar, thẻ mẫu, tệp gần đây và tab In; Enter/Space áp dụng đúng mục đang focus; Escape đóng và khôi phục focus.
4. `platform/shell/shell.css`:
   - Bổ sung quy tắc định kiểu cho nút gỡ tệp `.vno-recent-remove-btn` (kích thước, hiệu ứng hover đỏ dịu, dark mode tương phản cao).
   - Bảo toàn màu nền giấy trắng `#ffffff` và màu chữ tối cho trang xem trước in `.vno-print-preview-sheet`, `.vno-sheet-print-preview-page` trong Dark mode.
   - Bổ sung quy tắc responsive `@media (max-width: 1150px)` co gọn padding và độ rộng controls trên màn hình 1024px, đảm bảo 0 tràn ngang.
5. `platform/help/entries-writer.js`:
   - Bổ sung bài hướng dẫn sử dụng tiếng Việt `writer.file.backstage` ("Menu Tệp (Backstage) và quản lý tài liệu").
6. `platform/help/entries-sheet.js`:
   - Bổ sung bài hướng dẫn sử dụng tiếng Việt `sheet.file.backstage` ("Menu Tệp (Backstage) và quản lý bảng tính").
7. `tests/live/file-tab-backstage.playwright.mjs` (Mới):
   - 54 kịch bản kiểm thử trình duyệt thật Playwright kiểm chứng toàn diện cho cả VN Writer và VN Sheet.
