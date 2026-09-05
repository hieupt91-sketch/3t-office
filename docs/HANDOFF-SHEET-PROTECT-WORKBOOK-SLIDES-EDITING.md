# Agent Handoff

TASK: Sheet Protect Workbook + Slides Editing group (Find/Replace/Select)
AGENT/ROLE: Grok — Sheet + Slides implementation (2 phần độc lập, 1 task)
BRANCH: `feature/sheet-protect-workbook-slides-editing`
WORKTREE: `E:\VNOffice-grok-protect-workbook-slides-editing` (tách từ `main` `d9af788`, **KHÔNG merge vào main**)
OBJECTIVE: (1) Excel-parity Protect Workbook — khóa cấu trúc workbook, khác Protect Sheet vừa merge. (2) PowerPoint-parity nhóm Home > Chỉnh sửa trên VN Slides (Tìm kiếm / Thay thế / Chọn).

---

## 0. Vì sao gộp 1 task / 2 phần độc lập

Hai phần **không dùng chung logic, không dùng chung model, không đụng file app của nhau**. Gộp vì cả hai đều Medium trong `docs/PLAN-RIBBON-GAPS-ROUND3.md`, mỗi phần nhỏ, làm được trong một phiên, và cùng nằm trên một worktree/branch để tránh hai agent đụng `main`.

| | Phần 1 — Protect Workbook | Phần 2 — Slides Editing |
|---|---|---|
| App | VN Sheet | VN Slides |
| Model | `workbookProtection` trên `SheetGridController` | `slides[].title/body/shapes[].text` trên canvas |
| Lệnh mới | `sheet.workbook.protect` | `slides.edit.selectAll`, `slides.edit.selectObjects` (+ reuse `common.edit.find/replace`) |
| File app | `apps/sheet/*` | `apps/slides/*` |
| Adapter | `sheet-adapter.js` | `slides-adapter.js` |

Platform chỉ thêm dòng lệnh/i18n/icon/help mới. **Không sửa Writer source.**

Cả hai phần đều làm xong trong task này (không hoãn Slides).

---

## 1. Findings (đọc code trước khi thiết kế)

### Protect Sheet (đã merge, tái sử dụng pattern)

- `protectionBySheet[name] = { enabled, password }` — **theo từng trang**.
- Dialog `_createSheetDialog`, nút đổi nhãn qua `globalCommandBus.updateState`, mật khẩu **plain text phiên**, không Undo, không FODS.
- `_guardProtectedMutation()` chặn `setCellValue`, định dạng, chèn/xóa hàng cột.
- **Không** chặn rename/move/copy/add/delete — đúng Excel: Protect Sheet ≠ Protect Workbook.
- Nút Protect Sheet đang ở **Home > Ô > Định dạng** (không ở Review). Excel để cả hai trên Review > Changes.

### Protect Workbook (trước task: không có)

- Không có flag cấp workbook.
- Không có ẩn/hiện *trang tính* (`hideSheet`/`unhideSheet` không tồn tại) — chỉ ẩn hàng/cột.

### Slides Find/Replace (trước task)

- `common.edit.find` / `common.edit.replace` là lệnh **dùng chung** (`category: "edit"`), Writer và Sheet đã bind; Slides **chưa**.
- Writer: `showFindReplaceDialog` + `window.find` / thay `innerHTML`.
- Slides đã có `_spellcheckFields` / `_replaceInField` (title, body, body2, `shape.text`) — tái sử dụng hướng đó, mở rộng **mọi slide**.
- `common.edit.selectAll` trên Slides trước đây chỉ `document.execCommand("selectAll")` (chữ trong contenteditable).

---

## 2. Implementation summary

### Phần 1 — Protect Workbook

- `grid.workbookProtection = { enabled, password }` — **một flag cho cả sổ**, không theo sheet.
- `protectWorkbook` / `unprotectWorkbook` / `showProtectWorkbookDialog` / `isWorkbookProtected` — cùng pattern dialog + mật khẩu phiên + đổi nhãn **Bảo vệ workbook...** / **Bỏ bảo vệ workbook...**.
- `_guardWorkbookStructure()` chặn **thật** (trả `false`, không thực hiện): `renameSheet`, `moveSheet`, `copySheet`, `addSheet` (trang mới), `deleteSheet`, dialog đổi tên / move-copy, `createPivotTable` (vì tạo sheet mới).
- **Không** chặn sửa ô, định dạng, chèn/xóa hàng cột — khác Protect Sheet. Hai khóa độc lập.
- Undo lịch sử cấu trúc *trước khi khóa* vẫn chạy (`_applyingHistory` bỏ qua guard) để không kẹt stack.
- Review tab, nhóm mới **Bảo vệ**: nút Protect Sheet (cũng còn trong Home > Ô > Định dạng) + Protect Workbook. Nút `+` dưới lưới `disabled` khi khóa.
- Ẩn/hiện trang tính: **chưa có API** — không bịa; khi có sau này cần gọi `_guardWorkbookStructure()`.
- Không Undo, không ghi FODS, mật khẩu không mã hóa — cùng disclaimer Protect Sheet.

Lệnh: `sheet.workbook.protect`. UNO: `.uno:ToolProtectionDocument`.

### Phần 2 — Slides Editing group

- Cuối Home tab: nhóm **Chỉnh sửa** — Tìm kiếm (`common.edit.find`), Thay thế (`common.edit.replace`), dropdown **Chọn**.
- Adapter Slides bind 2 lệnh chung (dialog Writer-style) nhưng **tìm/thay trên model canvas**, mọi slide: title, body, body2, `shape.text`. Không tìm ghi chú thuyết trình.
- `replaceOne` / `replaceAll` đổi nội dung thật; Undo type `find-replace` trên stack canvas (`Ctrl+Z`).
- **Chọn tất cả** (`slides.edit.selectAll`): mọi shape trang hiện tại. **Chọn đối tượng** (`slides.edit.selectObjects`): shape không phải connector. `Ctrl+A`: nếu đang gõ contenteditable thì chọn chữ; không thì chọn tất cả hình.

---

## 3. Phạm vi đã làm / chưa làm

| Mục | Trạng thái |
|---|---|
| Protect Workbook khóa cấu trúc, ô vẫn sửa | Xong |
| Sai mật khẩu không mở; đúng mật khẩu mở | Xong |
| Review > Bảo vệ cạnh Protect Sheet | Xong |
| Help tiếng Việt Protect Workbook | Xong |
| Slides Home > Chỉnh sửa Find/Replace/Select | Xong |
| Find xuyên suốt nhiều slide; Replace + Undo | Xong |
| Help tiếng Việt Find/Replace và Chọn | Xong |
| Ẩn/hiện *trang tính* | **Chưa có sẵn** — không implement |
| Protect Workbook round-trip FODS | **Chưa** (cùng Protect Sheet: chỉ phiên) |
| Selection Pane đầy đủ như PowerPoint | **Không** — 2 mục dropdown thật là đủ |
| Tìm trong ghi chú thuyết trình | **Không** (ngoài scope title/body/shape) |

---

## 4. Files changed

**Phần 1 (commit `7109538`):**
- `apps/sheet/sheet-grid.js`, `sheet-ribbon.js`, `sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (1 dòng UNO)
- `platform/commands/command-definitions.js` (`sheet.workbook.protect`)
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `platform/ui-kit/icons.js` (`protectWorkbook`)
- `platform/help/entries-sheet.js`
- `tests/unit/sheet-protect-workbook.test.js`
- `tests/live/sheet-protect-workbook.playwright.mjs`
- `tests/run-tests.js`

**Phần 2 (commit `1586783`):**
- `apps/slides/slides-ribbon.js`, `slides-canvas.js`
- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (select UNO)
- `platform/commands/command-definitions.js` (`slides.edit.selectAll/selectObjects`)
- `platform/i18n/*`, `platform/ui-kit/icons.js` (`selectAll`, `selectObjects`)
- `platform/help/entries-slides.js`
- `tests/unit/slides-editing-group.test.js`
- `tests/live/slides-editing-group.playwright.mjs`
- `tests/run-tests.js`

Không đụng `apps/writer/**` hay `adapters/libreoffice/writer/**`.

---

## 5. Commands / tests run

- `node --check` các file JS đã sửa — PASS
- `node tests/run-tests.js` — **PASS 1046/1046**, 0 FAIL, **73,62 s** (< 90 s)
- `node tests/live/sheet-protect-workbook.playwright.mjs` — **PASS** (Edge headless, click thật, không SendKeys)
- `node tests/live/slides-editing-group.playwright.mjs` — **PASS** (Edge headless, click thật, không SendKeys)

---

## 6. Test results (truthful)

### Unit — Protect Workbook (`sheet-protect-workbook.test.js`) — PASS (6)

- Review > nhóm Bảo vệ có cả Protect Sheet và Protect Workbook; icon; i18n; UNO `.uno:ToolProtectionDocument`
- Help bài riêng, nhóm «Bảo vệ», nói rõ khóa cấu trúc / ô vẫn sửa
- `protectWorkbook` rồi `renameSheet` / `addSheet` / `deleteSheet` / `moveSheet` / `copySheet` đều `false`; `setCellValue` vẫn được; `isSheetProtected() === false`
- Sai mật khẩu không mở; đúng mật khẩu mở rồi rename/add được
- Hai khóa độc lập: workbook không chặn ô; bật Protect Sheet thì chặn ô; bỏ sheet lock thì workbook vẫn chặn addSheet
- `handleDispatch(".uno:ToolProtectionDocument")` bật/tắt

### Unit — Slides Editing (`slides-editing-group.test.js`) — PASS (6)

- Home nhóm cuối = Chỉnh sửa; Find/Replace/Select dropdown
- Help 2 bài nhóm Chỉnh sửa
- `findNext("chi phí")` lần lượt body slide 0 → shape slide 0 → body slide 1
- `replaceAll` đổi 3 chỗ trên 2 slide; Undo/Redo khôi phục
- `replaceOne` chỉ 1 chỗ; `selectAllShapes` 2 hình; `selectDrawingObjects` bỏ connector
- Adapter dispatch Find/Replace/Select

### Live Playwright — PASS

**Sheet** `http://127.0.0.1:8912/?app=sheet`:
- Tab Xem xét, nhóm Bảo vệ, click **Bảo vệ workbook...**, đặt mật khẩu `live-secret`
- `renameSheet`/`addSheet`/`deleteSheet`/`moveSheet`/`copySheet` trả `false`; Z1 vẫn sửa 42 → 99
- Nhãn đổi **Bỏ bảo vệ workbook...**; sai mật khẩu hiện lỗi; đúng mật khẩu mở; đổi tên `DaMoLive`
- Help tìm «bảo vệ workbook»

**Slides** `http://127.0.0.1:8796/?app=slides`:
- Nhóm Chỉnh sửa cuối Home; click Tìm kiếm / Thay thế mở đúng hộp thoại
- Find «chi phí» trên slide 0 và slide 1; Replace All → «ngân sách»; Undo trả «chi phí»
- Dropdown Chọn > Chọn tất cả chọn hình trang hiện tại
- Help tìm «tìm kiếm»

`pageErrors=[]` cả hai.

---

## 7. Known failures / limits

- Protect Workbook **không** phải bảo mật: mật khẩu plain, DevTools/`unprotectWorkbook({password})` nếu biết, không chống sửa file.
- Không Undo, không FODS.
- Chưa ẩn/hiện trang tính (feature chưa có).
- Slides Find phân biệt hoa/thường (giống Writer `indexOf`).
- Không tìm trong ghi chú thuyết trình.
- Selection Pane / chế độ con trỏ «Select Objects» đầy đủ của PowerPoint: không làm.

---

## 8. Risks

- Mọi chỗ tạo sheet mới (Pivot, import, …) phải qua `addSheet` hoặc `_guardWorkbookStructure`. Pivot đã chặn.
- `_syncEditableFieldsFromDom()` lúc Find sẽ ghi đè model slide đang mở bằng DOM — đúng khi user đang gõ; test/live phải `selectSlide` sau khi gán model.
- `common.edit.find` Help commandId trỏ bài Slides nếu tra cứu toàn cục (Writer chưa có bài Find riêng). Panel Help lọc theo app.

---

## 9. Dependencies / blockers

Không dependency mới, không thư viện trả phí. Không core patch.

CORE PATCH ID: không có.

---

## 10. Next action

- Review trên `feature/sheet-protect-workbook-slides-editing`. **Không merge main** trong task này.
- Task riêng nếu cần: FODS workbook protection, ẩn/hiện trang tính + guard, Selection Pane, Find không phân biệt hoa/thường / tìm trong notes.
