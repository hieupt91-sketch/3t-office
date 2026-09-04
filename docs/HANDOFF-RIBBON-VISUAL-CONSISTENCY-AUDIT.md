# Agent Handoff

TASK: Audit trực quan tổng thể ribbon 3 app sau nhiều lần merge trong ngày; chụp Playwright; sửa spacing/trùng nhóm/icon/nhãn; không merge main.
AGENT/ROLE: Grok — ribbon visual consistency audit (Writer + Sheet + Slides + shared platform visuals).
BRANCH: `fix/ribbon-visual-consistency-audit`
WORKTREE: `E:\VNOffice-grok-ribbon-audit`
OBJECTIVE: Nhìn tổng thể ribbon sau khi mọi nhóm/nút đã gộp; tìm nhóm quá chật, icon trùng, one-feature-one-display, nhãn dài/cắt chữ; sửa thật mà không phá command đang chạy.

FINDINGS:

## Cách xác nhận (bước 1 trước khi kết luận)

- Cwd: `E:\VNOffice-grok-ribbon-audit`. Branch: `fix/ribbon-visual-consistency-audit`. Không merge `main`.
- Playwright-core: `C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core`.
- Edge: `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, headless, viewport **1600×1000**.
- Chỉ thao tác trong trình duyệt qua Playwright API. Không SendKeys / không điều khiển Office thật.
- Script tái chạy: `scripts/ribbon-visual-audit.mjs` (chụp `.vno-ribbon`, ghi `docs/ribbon-audit-screenshots/_metrics.json`).
- Ảnh chụp (sau sửa) nằm tại `docs/ribbon-audit-screenshots/`.

Tab thực tế (tiếng Việt):

| App | Tab có trên ribbon |
|---|---|
| Writer | Trang đầu, Chèn, Thiết kế, **Bố cục**, Tham chiếu, **Trộn thư**, **Đánh giá**, Trợ lý VN AI |
| Sheet | Trang đầu, Công thức, Dữ liệu, Chèn, Bố trí trang, Xem xét, Chế độ xem, Trợ lý VN AI |
| Slides | Trang đầu, Chèn, Thiết kế, Chuyển tiếp, Hoạt hình, Trình chiếu, **Đánh giá**, Chế độ xem, Trợ lý VN AI |

Khác tên so với danh sách nhiệm vụ (không phải lỗi layout): Writer không có tab tên “Bố trí trang / Thư tín / Xem xét / Chế độ xem” — dùng “Bố cục / Trộn thư / Đánh giá”, **không có tab Chế độ xem**. Slides Review = “Đánh giá”, Sheet Review = “Xem xét”.

**Trước sửa, overflow ngang tại 1600px:** Writer Chèn `scrollWidth=1694`; Sheet Trang đầu `scrollWidth=1751`. **Sau sửa: mọi tab `overflowsX=false`.**

---

## Writer — từng tab

### Trang đầu — `docs/ribbon-audit-screenshots/writer-trang-dau.png`
**Trước:** nhóm “Chèn nhanh” (Bảng biểu / Hình ảnh / Ngắt trang) trùng 1:1 tab Chèn.
**Sửa:** gỡ nhóm Chèn nhanh khỏi Home. Lệnh vẫn trên tab Chèn.
**Sau kiểm:** Clipboard → Font → Paragraph → Styles (+ dải Quick Style). Không overflow, không cắt chữ. Indent tăng/giảm khác hướng mũi tên (hash markup gần giống vì cùng 3 đường kẻ).

### Chèn — `docs/ribbon-audit-screenshots/writer-chen.png`
**Trước:** 9 nhóm, tràn phải (~1694px); nhóm “Mục lục & Chú thích” cắt chữ; Header/Footer cùng một icon; Comment dùng icon Hộp văn bản; “Sơ đồ SmartArt”, “Chèn liên kết”, “Chữ cái đầu đoạn” quá dài.
**Sửa:** gỡ TOC/Footnote khỏi Chèn (giữ trên Tham chiếu); icon Header ≠ Footer; Comment = bong bóng; rút nhãn Sơ đồ / Liên kết / Chữ đầu đoạn.
**Thứ tự sau sửa (khớp audit Word):** Pages → Tables → Illustrations → Links → Comments → Header&Footer → Text → Symbols.
**Sau kiểm:** 8 nhóm, không overflow.

### Thiết kế — `docs/ribbon-audit-screenshots/writer-thiet-ke.png`
Đã kiểm kỹ. Chủ đề + Hình mờ + Viền trang. Không chật, icon phân biệt. **Không có vấn đề nghiêm trọng.**

### Bố cục — `docs/ribbon-audit-screenshots/writer-bo-cuc.png`
**Trước:** In và Xem trước khi in cùng icon máy in; Khổ giấy dùng icon Ngắt trang.
**Sửa:** icon Print Preview (trang + kính lúp), Khổ giấy (A4 + mũi tên).
**Giữ nguyên (cố ý):** Hình mờ / Viền trang vẫn trên cả Thiết kế và Bố cục vì test tương thích ngược `writer-i18n-shortcuts` yêu cầu cả hai. Không gây overflow.
**Sau kiểm:** không overflow, nhãn “Khổ giấy” rõ.

### Tham chiếu — `docs/ribbon-audit-screenshots/writer-tham-chieu.png`
Đã kiểm kỹ. Mục lục + Cập nhật; Chú thích trang / cuối. Đây là chỗ **duy nhất** hiển thị TOC/footnote sau audit. **Không có vấn đề nghiêm trọng.**

### Trộn thư — `docs/ribbon-audit-screenshots/writer-tron-thu.png`
Đã kiểm kỹ. Disabled state đúng khi chưa có nguồn. Nhãn “Hoàn tất trộn” không còn vỡ 2 dòng dài. **Không có vấn đề nghiêm trọng.**

### Đánh giá — `docs/ribbon-audit-screenshots/writer-danh-gia.png`
**Trước:** Theo dõi thay đổi dùng icon Format Painter; Ghi chú trùng Hộp văn bản; Soát lỗi dùng chung sparkle AI.
**Sửa:** icon track-changes / comment / grammar riêng.
Ghi chú vẫn có trên Chèn **và** Đánh giá — đúng kiểu Word (Insert Comments + Review). Không gộp.

### Trợ lý VN AI — `docs/ribbon-audit-screenshots/writer-tro-ly-vn-ai.png`
**Trước:** 3 nút cùng ngôi sao.
**Sửa:** sparkle / tóm tắt (trang+sao) / viết lại (bút). Nhãn “Viết lại”.

### Chế độ xem (Writer)
**Không có tab này.** Không thêm tab mới trong audit visual (tính năng View chưa được implement trên Writer). Ghi nhận để backlog.

---

## Sheet — từng tab

### Trang đầu — `docs/ribbon-audit-screenshots/sheet-trang-dau.png`
**Trước:** overflow 1751px; Sort/Filter/Find bị cắt; “Căn chỉnh & Trộn ô” dài; “Điền sang phải” dài; 4 nút Ô cùng icon bảng; CF/fill cùng highlight; ₫ và % cùng icon; Find/Replace cùng kính lúp; dropdown số tiếng Anh (General/Number/…).
**Thứ tự (đã đúng, giữ):** Clipboard → Font → Alignment → **Number → Styles → Cells → Editing**.
**Sửa:** CSS wrap nút lớn + padding nhóm chặt hơn; nhóm “Căn chỉnh”; “Điền phải”; dropdown Chung/Số/Tiền tệ/Kế toán/Ngày/Phần trăm/Khoa học/Văn bản; icon hàng/cột chèn-xóa riêng; CF color-scale; % riêng; Find/Replace icon-only (kính lúp vs kính lúp+dấu cộng) để nhường chỗ, tooltip/aria vẫn đủ tiếng Việt.
**Sau kiểm:** cả Editing (AutoSum, Điền, Xóa, Sort, Lọc, Tìm) nằm trong 1600px, không overflow.

AutoSum / Sort / Filter vẫn còn trên Công thức và Dữ liệu — **đúng Excel** (Home Editing + tab chuyên). Không gộp.

### Công thức — `docs/ribbon-audit-screenshots/sheet-cong-thuc.png`
**Trước:** AutoSum và Trung bình cùng chữ Σ.
**Sửa:** Trung bình = x̄. **Sau kiểm:** phân biệt rõ.

### Dữ liệu — `docs/ribbon-audit-screenshots/sheet-du-lieu.png`
Đã kiểm kỹ. A-Z xanh / Z-A đỏ / phễu / validation / Pivot. **Không có vấn đề nghiêm trọng.**

### Chèn — `docs/ribbon-audit-screenshots/sheet-chen.png`
**Trước:** Biểu đồ dùng icon máy in; sparkline Đường/Cột cùng icon chart.
**Sửa:** chart cột; sparkline đường vs cột riêng. **Sau kiểm:** rõ ràng.

### Bố trí trang — `docs/ribbon-audit-screenshots/sheet-bo-tri-trang.png`
Đã kiểm kỹ. Vùng in / Ngắt trang, icon đặt vs xóa khác nhau. **Không có vấn đề nghiêm trọng.**

### Xem xét — `docs/ribbon-audit-screenshots/sheet-xem-xet.png`
Đã kiểm kỹ. Một nút Ghi chú mới. **Không có vấn đề nghiêm trọng.**

### Chế độ xem — `docs/ribbon-audit-screenshots/sheet-che-do-xem.png`
**Trước:** Cố định hàng/cột dùng icon bảng.
**Sửa:** icon freeze riêng. **Sau kiểm:** Đường lưới / Tiêu đề / Zoom / Freeze rõ.

### Trợ lý VN AI — `docs/ribbon-audit-screenshots/sheet-tro-ly-vn-ai.png`
Cùng bộ icon AI mới (sparkle ≠ tóm tắt). **Không còn 2 ngôi sao ident.**

---

## Slides — từng tab

### Trang đầu — `docs/ribbon-audit-screenshots/slides-trang-dau.png`
Đã kiểm kỹ. Trang chiếu / Clipboard / Đối tượng vẽ. Text/Shape/Image trên Home **và** Chèn là kiểu PowerPoint Drawing + Insert. Không overflow. **Không có vấn đề nghiêm trọng cần gộp.**

### Chèn — `docs/ribbon-audit-screenshots/slides-chen.png`
**Thứ tự (đã đúng, giữ):** Tables → Images → Illustrations → Comments → Text → Symbols → Media.
Đã kiểm kỹ. “Đầu trang & Chân trang” dài nhưng không cắt, không overflow. Comments cũng có trên Đánh giá (kiểu PowerPoint). **Không có vấn đề nghiêm trọng.**

### Thiết kế — `docs/ribbon-audit-screenshots/slides-thiet-ke.png`
Nhãn “Cỡ trang chiếu” (trước: “Kích thước trang chiếu”). **Không overflow.**

### Chuyển tiếp — `docs/ribbon-audit-screenshots/slides-chuyen-tiep.png`
**Trước:** cùng icon play với Trình chiếu.
**Sửa:** hai khung chồng (transition). **Sau kiểm:** không nhầm với Start Show.

### Hoạt hình — `docs/ribbon-audit-screenshots/slides-hoat-hinh.png`
**Trước:** icon sparkle AI — nhầm tab AI.
**Sửa:** icon chuyển động đối tượng. **Sau kiểm:** không còn giống Trợ lý VN AI.

### Trình chiếu — `docs/ribbon-audit-screenshots/slides-trinh-chieu.png`
**Trước:** Từ đầu / Từ trang này / Presenter cùng một nút play.
**Sửa:** play+mốc đầu / play+mốc giữa / hai màn hình presenter. Ghi chú thuyết trình dùng icon ghi chú, không còn Hộp văn bản.

### Đánh giá — `docs/ribbon-audit-screenshots/slides-danh-gia.png`
Đã kiểm kỹ. Một nút Nhận xét mới. **Không có vấn đề nghiêm trọng.**

### Chế độ xem — `docs/ribbon-audit-screenshots/slides-che-do-xem.png`
Sorter + Ghi chú (icon notepad, không còn text box). Notes vẫn có trên Trình chiếu (bối cảnh presenter) — giữ.

### Trợ lý VN AI — `docs/ribbon-audit-screenshots/slides-tro-ly-vn-ai.png`
Icon AI đã tách như Writer/Sheet.

---

## Việc cố ý không sửa

| Hiện tượng | Lý do |
|---|---|
| Ghi chú trên Insert + Review (Writer/Slides) | Khớp Word/PowerPoint |
| AutoSum, Sort, Filter trên Home + tab chuyên (Sheet) | Khớp Excel |
| Hình mờ/Viền trang trên Design + Layout (Writer) | Test tương thích ngược hiện hữu; không overflow |
| Drawing objects trên Home + Insert (Slides) | Khớp PowerPoint |
| Writer không có tab Chế độ xem | Feature gap, ngoài scope visual compaction |
| Tên tab Đánh giá vs Xem xét | i18n hiện hữu; test Writer khóa nhãn “Đánh giá” |

IMPLEMENTATION SUMMARY:
- CSS: nút lớn `white-space: normal` + `max-width: 86px` (trước đó `.vno-btn { nowrap }` khiến nhãn 2 dòng không wrap, nút phình ngang); padding/gap nhóm chặt hơn; token height ribbon.css trỏ đúng `--vno-ribbon-tabs-height` / `--vno-ribbon-body-height`.
- Writer: bỏ nhóm trùng Home “Chèn nhanh” và Insert “Mục lục & Chú thích”; icon/nhãn Header, Footer, Comment, Track Changes, Print Preview, Khổ giấy, AI.
- Sheet: compact Home Editing; nhãn số tiếng Việt; icon hàng/cột/chart/sparkline/percent/CF/freeze/average/replace.
- Slides: icon transition / animation / 3 kiểu start show / presenter / notes — không đụng `slides-ribbon.js` (cấu trúc nhóm đã đúng).
- Không xóa command; chỉ đổi chỗ hiển thị / icon / nhãn.

FILES CHANGED:
- `platform/ui-kit/ui-kit.css`, `platform/shell/shell.css`, `platform/ribbon/ribbon.css`
- `platform/ui-kit/icons.js`, `platform/ui-kit/components.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `apps/writer/writer-ribbon.js`
- `apps/sheet/sheet-ribbon.js`
- `tests/unit/writer-print-preview.test.js` (icon Print Preview)
- `tests/unit/writer-toc-footnotes.test.js` (TOC chỉ trên Tham chiếu)
- `scripts/ribbon-visual-audit.mjs`
- `docs/ribbon-audit-screenshots/*`, file này

COMMANDS RUN:
- `git status` / `git branch --show-current` — worktree `E:\VNOffice-grok-ribbon-audit`, branch `fix/ribbon-visual-consistency-audit`
- `node scripts/ribbon-visual-audit.mjs` (trước và sau sửa) — Edge headless, viewport 1600
- `node --check` trên module JS đã sửa
- `node tests/run-tests.js`

BUILD RESULT: PASS — không có compile build; syntax suite trong runner PASS.

TEST RESULTS: PASS — `627/627`, `0 FAIL`, elapsed **~12.0s** (< 60s). Không disable test, không nuốt exception.

KNOWN FAILURES: None.

RISKS:
- Find/Replace trên Sheet Home là icon-only; tooltip/aria vẫn tiếng Việt. Nếu QA muốn nhãn chữ, cần viewport rộng hơn hoặc split-button.
- Hình mờ/Viền trang vẫn dual-display Design+Layout.
- Writer chưa có View tab.

DEPENDENCIES/BLOCKERS: Không thêm thư viện. Playwright-core + Edge máy local như các live test sẵn có. Không blocker.

CORE PATCH ID (if any): N/A — không đụng LibreOffice Core.

NEXT ACTION: Claude/người phụ trách review các commit trên branch `fix/ribbon-visual-consistency-audit`; **không tự merge `main`.**

## Rollback

Revert các commit audit theo thứ tự ngược. Không migration, không đổi semantics file format, không Core patch.
