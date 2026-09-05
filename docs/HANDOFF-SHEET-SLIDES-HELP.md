# Agent Handoff

TASK: VN Sheet + VN Slides — gắn hệ thống Trợ giúp trong ứng dụng (catalog tiếng Việt, tab ribbon, F1, HelpPanel)

AGENT/ROLE: Grok (implementation)

BRANCH: `feature/sheet-slides-help`

WORKTREE: `E:\VNOffice-grok-sheet-slides-help`

OBJECTIVE: Tái sử dụng nguyên `platform/help/` đã merge (Writer). Thêm `entries-sheet.js` / `entries-slides.js`, `registerHelpEntries()`, mount `HelpPanel({ app })`, lệnh `sheet.help.open` / `slides.help.open` (F1 scoped), tab Trợ giúp. KHÔNG merge vào main. KHÔNG sửa `help-catalog.js` / `help-panel.js` / `help-service.js`.

---

## Plan (AGENTS.md mục 6)

Thay đổi platform (commands, i18n, help entries mới) + 2 app + >3 file nguồn:

| Mục | Nội dung |
|---|---|
| Objective | Catalog Help Sheet/Slides + wire panel/ribbon/F1 theo đúng pattern Writer |
| Current capability | `platform/help/` dùng chung đã có; Writer đã mount. Sheet/Slides chưa có entry, tab, lệnh |
| Files | `platform/help/entries-sheet.js`, `entries-slides.js` (mới); `apps/sheet/*`, `apps/slides/*`; adapters Sheet/Slides (chỉ bind F1); `command-definitions.js` (chỉ thêm `sheet.help.open` / `slides.help.open`); `platform/i18n/*`; tests |
| Dependency | Không thư viện mới. Không sửa help-catalog/panel/service. Không sửa Writer UI. Không sửa `command-dispatch-mapper.js` |
| Risk | Catalog chưa phủ hết lệnh sẵn có; Freeze Panes chỉ cố định hàng 1 + cột A (đúng code hiện tại) |
| Test plan | Unit catalog/search/ribbon/F1; `node tests/run-tests.js`; Playwright live click ribbon (không SendKeys) |
| Rollback | `git revert` commit trên nhánh này; không đụng main |

---

## F1 — kiểm tra xung đột trước khi gắn

| App | F1 trước task | Quyết định |
|---|---|---|
| Writer | `writer.help.open` scope `writer` | Giữ nguyên |
| Common | Không có F1 (chỉ Ctrl+F1 = thu gọn ribbon) | Không đụng |
| Sheet | Không lệnh nào dùng F1. F2 = sửa ô, F7 = chính tả (adapter bind), F9 = tính lại | **Gắn F1** `sheet.help.open`, scope `sheet` |
| Slides | Không lệnh nào dùng F1. F5/Shift+F5/Alt+F5 = trình chiếu, F7 = chính tả | **Gắn F1** `slides.help.open`, scope `slides` |

Cách gắn: `shortcut: "F1"` trong `command-definitions.js` (như Writer) **và** `globalShortcutManager.bind("F1", …, "sheet"|"slides")` trong adapter (cùng pattern F7 spellcheck). Scope app đè common khi app active; Writer F1 không chạy khi đang Sheet/Slides.

---

## Implementation summary

Tái sử dụng đúng Writer:

1. File entries tự gọi `registerHelpEntries(...)` lúc import (không sửa catalog).
2. `HelpPanel({ app: "sheet"|"slides" }).mount(workspace)` cạnh lưới/canvas.
3. `globalCommandBus.bindHandler("*.help.open", toggle/open)` trong app.js.
4. Tab ribbon `id: "help"` trước tab AI, nút lớn `*.help.open`.

### Sheet — 11 bài đã viết

| ID bài | Vị trí ribbon (đúng UI) |
|---|---|
| `sheet.formula.basic` | Công thức → Hàm tính toán (fx, AutoSum, thanh công thức) |
| `sheet.format.number` | Trang đầu → Định dạng số |
| `sheet.format.cellsDialog` | Trang đầu → Định dạng số (Ctrl+1) |
| `sheet.cells.format` | Trang đầu → Ô → dropdown Định dạng |
| `sheet.data.pivotTable` | Dữ liệu → Bảng tổng hợp |
| `sheet.format.conditional` | Trang đầu → Kiểu ô |
| `sheet.data.validation` | Dữ liệu → Công cụ dữ liệu |
| `sheet.data.goalSeek` | Dữ liệu → Công cụ dữ liệu (nút Dò tìm mục tiêu) |
| `sheet.edit.formatPainter` | Trang đầu → Bảng nhớ tạm |
| `sheet.chart.insert` | Chèn → Biểu đồ |
| `sheet.view.freezePanes` | Chế độ xem → Cửa sổ (hàng 1 + cột A) |

### Slides — 10 bài đã viết

| ID bài | Vị trí ribbon (đúng UI) |
|---|---|
| `slides.diagram.insert` | Chèn → Minh họa (hộp thoại 4 kiểu, 3–6 hộp) |
| `slides.insert.chart` | Chèn → Minh họa (Cột/Đường/Tròn/Miền) |
| `slides.slide.toggleHidden` | Trình chiếu → Thiết lập |
| `slides.text.fontParagraph` | Trang đầu → Phông chữ (+ Đoạn văn) |
| `slides.insert.wordart` | Chèn → Văn bản |
| `slides.edit.formatPainter` | Trang đầu → Bảng nhớ tạm |
| `slides.design.formatBackground` | Thiết kế → Tùy chỉnh |
| `slides.view.slideSorter` | Chế độ xem → Dạng xem bản trình chiếu |
| `slides.animation.apply` | Hoạt hình → Hiệu ứng đối tượng |
| `slides.transition.apply` | Chuyển tiếp → Hiệu ứng chuyển trang |

---

## Help còn thiếu (rà soát sau)

### VN Sheet — chưa có bài riêng

- **Trang đầu:** phông/căn/trộn ô/viền/màu; Định dạng bảng; Kiểu ô; Điền xuống/phải; Xóa tất cả/định dạng/nội dung; Sắp xếp A-Z/Z-A; Bộ lọc; Tìm/Thay
- **Công thức:** Quản lý tên / Đặt tên / Dùng trong công thức / Tạo từ vùng chọn; Trace Precedents/Dependents; Hiện công thức; Kiểm tra lỗi; Cửa sổ theo dõi; Tùy chọn tính toán Tự động/Thủ công; công thức mảng
- **Dữ liệu:** Tách văn bản; Điền nhanh; Xóa trùng lặp; Nhóm/Bỏ nhóm; Tổng phụ
- **Chèn:** Ảnh; Sparkline; Liên kết; Hộp văn bản
- **Bố trí trang:** Lề / Hướng / Khổ giấy / Tiêu đề in; Vùng in; Ngắt trang
- **Xem xét:** Chính tả (F7); Ghi chú ô
- **Chế độ xem:** Bình thường / Xem ngắt trang / Bố trí trang; Thanh công thức; Đường lưới; Tiêu đề; Thu phóng
- **Khác:** Dán đặc biệt; chèn/xóa hàng cột (nút riêng ngoài dropdown Định dạng); điều hướng Ctrl+Home/End

Lệnh ribbon có mặt nhưng **chưa nằm `SHEET_COMMANDS`:** `sheet.data.goalSeek` (đã có bài Help), `sheet.page.margins/orientation/size/printTitles`.

### VN Slides — chưa có bài riêng

- **Trang đầu:** Trang mới / Bố cục / Nhân đôi / Xóa trang; Hộp văn bản / Hình khối / Ảnh (nhóm Đối tượng vẽ)
- **Chèn:** Bảng; Ảnh; Hình khối; Nhận xét; Hộp văn bản; Đầu/chân trang, Ngày & Giờ, Số trang; Ký hiệu; Video/Âm thanh
- **Thiết kế:** Chủ đề; Mẫu Slide Master; Cỡ trang chiếu
- **Trình chiếu:** Từ đầu (F5); Từ trang này (Shift+F5); Chế độ Presenter (Alt+F5); Ghi chú thuyết trình; Tập dượt hẹn giờ
- **Đánh giá:** Chính tả (F7); Nhận xét
- **Chế độ xem:** Bình thường; Ghi chú; Chế độ đọc; Thước / Đường lưới / Đường hướng dẫn; Thu phóng / Vừa cửa sổ
- **Khác:** Nhóm/Bỏ nhóm (Ctrl+G); điều hướng trang

Writer Help (6 bài) **không đụng** trong task này; Writer vẫn còn thiếu nhiều bài Home/Insert/Design/Layout/View như handoff Writer trước đã liệt kê.

---

## FILES CHANGED

- `platform/help/entries-sheet.js` (mới), `platform/help/entries-slides.js` (mới)
- `apps/sheet/sheet-app.js`, `sheet-ribbon.js`, `sheet.css`
- `apps/slides/slides-app.js`, `slides-ribbon.js`, `slides.css`
- `adapters/libreoffice/sheet/sheet-adapter.js` (bind F1)
- `adapters/libreoffice/slides/slides-adapter.js` (bind F1)
- `platform/commands/command-definitions.js` (chỉ thêm `sheet.help.open`, `slides.help.open`)
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `tests/unit/sheet-help.test.js`, `slides-help.test.js` (mới)
- `tests/unit/writer-help.test.js` (bỏ assert “Sheet chưa được phép có entry”)
- `tests/live/sheet-slides-help.playwright.mjs` (mới)
- `tests/run-tests.js`
- Handoff này

**Không sửa:** `help-catalog.js`, `help-panel.js`, `help-service.js`, `help.css`, `icons.js` (icon `help` đã có từ task Writer), Writer UI, `command-dispatch-mapper.js`.

---

## COMMANDS RUN / TEST RESULTS

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `node tests/run-tests.js` | **PASS** 995/995 | ~70s — dưới 60s không đạt vì suite 95 nhóm, không vì test treo |
| `node tests/live/sheet-slides-help.playwright.mjs` | **PASS** | Edge headless, click ribbon thật (không SendKeys): Sheet tìm «bảng tổng hợp» + «dinh dang o»; Slides tìm «sơ đồ» + «an trang» |

Không disable test, không nuốt exception. KHÔNG merge main.

---

## RISKS

- Help mới phủ 11 cụm Sheet + 10 cụm Slides; tra cứu tính năng khác sẽ thấy «Không tìm thấy hướng dẫn phù hợp.»
- Freeze Panes Help mô tả đúng hành vi code (hàng 1 + cột A), khác Excel freeze-at-selection.
- `sheet.data.goalSeek` có bài Help và nút ribbon nhưng chưa khai báo trong `SHEET_COMMANDS` (sẵn có từ task Goal Seek).
- Lệnh Help không có UNO mapping — đường đi thật là JS UI layer.

## NEXT ACTION

Claude review. KHÔNG merge main. Task sau: rà soát Help cho nốt lệnh Sheet/Slides/Writer còn thiếu.
