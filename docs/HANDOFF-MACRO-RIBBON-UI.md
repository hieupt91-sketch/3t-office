# AGENT HANDOFF: Giao diện Ribbon và Hoàn thiện UI cho Tính năng Macro

**TASK:** Đặt tính năng Macro vào Ribbon + hoàn thiện UI & Accessibility  
**AGENT/ROLE:** Antigravity UI/UX & Accessibility Engineer  
**BRANCH:** feature/macro-ribbon-ui  
**WORKTREE:** E:\VNOffice-agy-macro-ribbon-ui  
**DATE:** 2026-09-08  

---

## 1. Bối cảnh & Mục tiêu

Tầng engine nền tảng của Macro cơ bản (ghi và phát lại thao tác qua Command Bus) đã được hoàn thành trước đó (ghi nhận tại `docs/HANDOFF-MACRO-ENGINE-BASIC.md`). Nhiệm vụ này phụ trách đưa toàn bộ tính năng lên giao diện Ribbon chuẩn mực, mượt mà và trực quan trên cả 3 ứng dụng: **VN Writer**, **VN Sheet** và **VN Slides**:
1. Đặt nhóm "Macro" vào tab "Xem" (View) ở vị trí chuẩn tương đồng với Microsoft Office thật trên cả 3 app.
2. Hiển thị động nhãn ("Ghi Macro" ↔ "Dừng ghi") và icon (`macroRecordStart` ↔ `macroRecordStop`) theo trạng thái ghi thực tế.
3. Chỉ báo trực quan nổi bật: chấm đỏ nhấp nháy trên nút Ribbon và huy hiệu chỉ báo đang ghi trên thanh trạng thái (status bar), tự động kích hoạt khi ghi và dọn dẹp sạch sẽ khi dừng, tuyệt đối không gây tràn ngang Ribbon ở 1280px.
4. Kiểm thử bàn phím và chuẩn Accessibility WAI-ARIA (Focus Trap, Tab/Shift+Tab, Escape đóng và khôi phục focus) cho hộp thoại Quản lý Macro (`showMacroManagerDialog`).
5. Bổ sung bài Hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng Macro theo quy định AGENTS.md §10.

---

## 2. Các công việc đã thực hiện

### 2.1. Đặt nhóm Macro vào tab "Xem" (View) trên cả 3 ứng dụng
- **`apps/writer/writer-ribbon.js`**: Bổ sung nhóm `{ id: "macro", label: "Macro", labelKey: "writerRibbon.group.macro", items: [...] }` ở cuối mảng `groups` của tab `id: "view"`. Gồm 2 nút lớn (`isLarge: true`): `common.macro.recordToggle` và `common.macro.manager`.
- **`apps/sheet/sheet-ribbon.js`**: Bổ sung nhóm tương tự vào cuối tab `id: "view"` của Sheet Ribbon.
- **`apps/slides/slides-ribbon.js`**: Bổ sung nhóm tương tự vào cuối tab `id: "view"` của Slides Ribbon.

### 2.2. Icon & Label đổi động khi đang ghi (Record Toggle)
- Trong `platform/ui-kit/components.js`:
  - Nâng cấp `createCommandButton` lắng nghe `globalCommandBus.subscribe`: khi `newState.icon` được cung cấp, tự động cập nhật lại `.vno-btn-icon` thông qua `resolveIcon(commandId, newState.icon)`.
  - Bổ sung fallback tự động cho `macroRecordStart`, `macroRecordStop`, `macroManager` trong `resolveIcon`.
- Trong `platform/shell/app-shell.js`:
  - Khi bắt đầu ghi: phát `globalCommandBus.updateState("common.macro.recordToggle", { checked: true, label: t("macro.stop", "Dừng ghi"), icon: "macroRecordStop" })`.
  - Khi kết thúc ghi: phát `globalCommandBus.updateState("common.macro.recordToggle", { checked: false, label: t("macro.record", "Ghi Macro"), icon: "macroRecordStart" })`.
  - Tích hợp đa ngữ VI/EN thông qua hàm `t()`.

### 2.3. Chỉ báo thị giác đang ghi (Recording Visual Indicators)
- **Trên nút Ribbon**:
  - CSS animation `@keyframes vno-macro-pulse` tạo hiệu ứng nhịp thở / xung đỏ nổi bật.
  - Khi nút có class `is-checked`, pseudo-element `::after` hiển thị chấm đỏ nhấp nháy ở góc trên-phải của nút (dùng `position: absolute`, hoàn toàn không chiếm diện tích layout).
- **Trên thanh trạng thái (Status Bar)**:
  - Bổ sung `#vno-macro-status-indicator` trong `vno-statusbar-left` với chấm đỏ nhấp nháy và văn bản "Đang ghi Macro...".
  - Màu sắc được tinh chỉnh chuẩn WCAG AA: chữ `#991b1b` trên nền `#fee2e2` đạt độ tương phản vượt ngưỡng yêu cầu (>= 4.5:1).
- **Trên tab Chế độ xem**:
  - Khi `document.body` có class `vno-macro-is-recording`, tab `#vno-ribbon-tab-view` hiển thị chấm đỏ nhỏ tinh tế, giúp người dùng nhận biết hệ thống đang ghi macro ngay cả khi đang thao tác trên các tab khác (Trang đầu, Chèn, Bố cục...).
  - Toàn bộ chỉ báo tự động ẩn khi dừng ghi.

### 2.4. Xác nhận Accessibility cho Hộp thoại Quản lý Macro
- Hộp thoại `showMacroManagerDialog` sử dụng `trapFocus` có sẵn:
  - Đã kiểm tra bẫy tiêu điểm bằng Playwright: bấm phím Tab liên tục 8 lần, tiêu điểm luôn xoay vòng an toàn bên trong dialog (nút đóng header → ▶ Chạy → Đổi tên → Xóa → Đóng footer) mà không bị rơi ra ngoài trang nền.
  - Phím Escape đóng dialog tức thì và khôi phục tiêu điểm chính xác về nút kích hoạt ban đầu (`button[data-command-id="common.macro.manager"]`).
  - Phím tắt Alt+F8 mở dialog trực tiếp từ bàn phím.

### 2.5. Hướng dẫn sử dụng tiếng Việt trong ứng dụng (AGENTS.md §10)
Đã bổ sung 3 bài hướng dẫn sử dụng tiếng Việt chi tiết vào hệ thống trợ giúp:
- **`platform/help/entries-writer.js`**: `writer.macro.basics` — Hướng dẫn ghi macro định dạng, chèn bảng, căn chỉnh văn bản trong VN Writer, phím tắt Ctrl+Shift+R và Alt+F8, cùng phần giới hạn trung thực (chỉ ghi lệnh Command Bus, không ghi gõ chữ tự do).
- **`platform/help/entries-sheet.js`**: `sheet.macro.basics` — Hướng dẫn tự động hóa các thao tác tô màu, sắp xếp, lọc dữ liệu trên bảng tính VN Sheet.
- **`platform/help/entries-slides.js`**: `slides.macro.basics` — Hướng dẫn ghi lại chuỗi định dạng trang chiếu, đổi bố cục và xử lý hình khối trong VN Slides.

---

## 3. Danh sách các tệp đã chỉnh sửa & tạo mới

| Tệp | Thay đổi chính |
|-----|----------------|
| `apps/writer/writer-ribbon.js` | Thêm nhóm Ribbon `macro` (2 nút lớn) vào cuối tab `view` |
| `apps/sheet/sheet-ribbon.js` | Thêm nhóm Ribbon `macro` (2 nút lớn) vào cuối tab `view` |
| `apps/slides/slides-ribbon.js` | Thêm nhóm Ribbon `macro` (2 nút lớn) vào cuối tab `view` |
| `platform/ui-kit/components.js` | Cập nhật icon động trong `createCommandButton` & thêm fallback `resolveIcon` |
| `platform/ui-kit/ui-kit.css` | Thêm styles chỉ báo ghi, chấm đỏ nhấp nháy, đạt chuẩn WCAG AA tương phản màu |
| `platform/shell/app-shell.js` | Gắn nhãn/icon động cho recordToggle, chỉ báo status bar, hàm `_setMacroRecordingState` |
| `platform/i18n/strings-vi.js` | Bổ sung chuỗi song ngữ lệnh `common.macro.*`, nhóm ribbon và thông báo macro |
| `platform/i18n/strings-en.js` | Bổ sung chuỗi tiếng Anh tương ứng |
| `platform/help/entries-writer.js` | Thêm bài trợ giúp `writer.macro.basics` (tiếng Việt thật) |
| `platform/help/entries-sheet.js` | Thêm bài trợ giúp `sheet.macro.basics` (tiếng Việt thật) |
| `platform/help/entries-slides.js` | Thêm bài trợ giúp `slides.macro.basics` (tiếng Việt thật) |
| `docs/PLAN-MACRO-RIBBON-UI.md` | Tài liệu kế hoạch theo AGENTS.md §6 |
| `tests/live/macro-ribbon-ui.playwright.mjs` | Bộ kiểm thử Playwright tự động hóa toàn diện cho Macro UI & Accessibility |
| `docs/HANDOFF-MACRO-RIBBON-UI.md` | Tài liệu bàn giao hoàn thành nhiệm vụ |

---

## 4. Kết quả kiểm thử thực tế (Gates Verification)

1. **Cú pháp JavaScript:**
   - Lệnh: `node scripts/check-syntax.js`
   - Kết quả: **PASS (90/90 files hợp lệ, 0 lỗi cú pháp)**
2. **Kiểm tra tương phản màu WCAG 2.1 AA:**
   - Lệnh: `node scripts/audit-contrast.js`
   - Kết quả: **PASS (100% các cặp màu đạt chuẩn WCAG 2.1 AA)**
3. **Bộ kiểm thử tự động toàn diện:**
   - Lệnh: `node tests/run-tests.js`
   - Kết quả: **1521/1521 PASS | 0 FAIL (137 suites)**
4. **Kiểm tra tràn ngang Ribbon ở 1280px:**
   - Lệnh: `node tests/live/ribbon-audit-1280.playwright.mjs`
   - Kết quả: **100% PASS (104/104 lượt kiểm tra tab đạt 0px tràn ngang tại 1280px ở cả VI và EN)**
5. **Kiểm thử trực tiếp giao diện Macro & Accessibility (Playwright):**
   - Lệnh: `node tests/live/macro-ribbon-ui.playwright.mjs`
   - Kết quả: **100% PASS (28/28 assertions PASS)**
     - Nhóm Macro hiển thị đầy đủ 2 nút lớn trên cả 3 ứng dụng (Writer, Sheet, Slides).
     - Nhãn đổi sang "Dừng ghi" và icon đổi sang hình vuông Stop đỏ khi bắt đầu ghi.
     - Chỉ báo đang ghi hiển thị trên status bar và nhấp nháy trên nút Ribbon.
     - Thực thi lệnh định dạng, dừng ghi, đặt tên qua prompt dialog thật.
     - Nhãn quay lại "Ghi Macro" và icon quay lại hình tròn bắt đầu ghi sau khi lưu.
     - Mở hộp thoại Quản lý Macro bằng click và bằng phím tắt Alt+F8.
     - Tiêu điểm bàn phím ban đầu nằm trong dialog, phím Tab bẫy tiêu điểm 100% không thoát ra ngoài.
     - Phím Escape đóng dialog và khôi phục tiêu điểm về nút trigger.
     - Chạy lại macro và xóa macro thành công qua giao diện đồ họa thật.
