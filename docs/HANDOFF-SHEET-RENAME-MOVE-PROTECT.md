# Agent Handoff

TASK: Đổi tên / Di chuyển hoặc Sao chép / Bảo vệ trang tính (VN Sheet)
AGENT/ROLE: Grok — Sheet implementation
BRANCH: `feature/sheet-rename-move-protect`
WORKTREE: `E:\VNOffice-grok-sheet-rename-protect` (HEAD trùng `main` lúc tách `139fd95`, **KHÔNG merge vào main**)
OBJECTIVE: Bổ sung 3 mục còn thiếu trên dropdown Định dạng (Home > Ô) đối chiếu Excel: Rename Sheet, Move or Copy Sheet, Protect Sheet (khóa giao diện).

---

## 1. Findings (đọc code trước khi thiết kế)

Quản lý nhiều trang tính **đã có**:

- Mảng `grid.sheets` + `sheetsData[name]` (Map ô) và hàng loạt `*BySheet[name]`.
- Thanh tab dưới lưới: click đổi trang, mũi tên/Home/End, nút `+` gọi `addSheet()`.
- `addSheet` / `deleteSheet` có Undo type `sheet-add` / `sheet-delete` + `_snapshotSheet` / `_restoreSheet`.
- Pivot tạo sheet mới tên `Tên nguồn (2)` — **không** phải nhân bản trang tính.

**Chưa có** (xác nhận bằng đọc `sheet-grid.js`, không đoán):

- Đổi tên: không có hàm rename, không double-click tab, không mục menu.
- Kéo-thả đổi thứ tự tab: không có drag handler.
- Dialog Move or Copy / nhân bản trang: không có.
- Protect Sheet: không có.

Tên sheet **là KEY** của: `sheetsData`, `sheetStates`, `namedRangesBySheet`, `commentsBySheet`, `printAreaBySheet`, `pageBreaksBySheet`, `pageSetupBySheet`, `mergedRangesBySheet`, `conditionalFormattingBySheet`, `dataValidationsBySheet`, `chartsBySheet`, `imagesBySheet`, `textBoxesBySheet`, `pivotTablesBySheet`, `outlineGroupsBySheet`, `rowHeightsBySheet`, `colWidthsBySheet`, `userHiddenRowsBySheet`, `userHiddenColsBySheet`, cộng `activeSheet` và `tab.dataset.sheet`.

Công thức liên-sheet parse trong `formula-engine.js` (`'Tên'!A1` và 3D `'A:B'!A1`).

---

## 2. Implementation summary

Cùng một `_renderSheetTabs()` cho mọi thay đổi tab (tránh selector `[data-sheet="..."]` gãy với tên có ký tự đặc biệt).

### Đổi tên

- `validateSheetName`: không trống, ≤ 31 ký tự, không trùng (không phân biệt hoa thường), cấm `/ \ ? * [ ] :` và dấu nháy đơn.
- `renameSheet` đổi key mọi `*BySheet`, rewrite công thức / named range / Pivot `sourceSheet|targetSheet`.
- UI: Home > Ô > Định dạng > **Đổi tên trang tính...**; nhấp đúp tab; chuột phải tab. Cùng `showRenameSheetDialog`.
- Undo type `sheet-rename` trên stack hiện có (đổi tên ngược lại, rewriter chạy hai chiều).

### Di chuyển / Sao chép

- Dialog: danh sách trang + `(chuyển đến cuối)` + checkbox **Tạo một bản sao**.
- Không tick: `moveSheet` đổi thứ tự tab, Undo `sheet-move`.
- Tick: `copySheet` nhân bản Map ô, style, CF, validation, charts, images, text boxes, named ranges sheet, comments, print area, page breaks, Page Setup, merged cells, outline, row/col layout, protection. Tên Excel-like `Tên gốc (2)`. Undo tái sử dụng `sheet-add` (xóa bản sao).

Không có kéo-thả tab (vẫn chưa có trước task). Dialog là đường chính.

### Bảo vệ (UI lock, không phải bảo mật thật)

- `protectionBySheet[name] = { enabled, password }` — mật khẩu **plain text trong phiên**, không mã hóa, không ghi FODS.
- Bật: chặn sửa nội dung ô (`setCellValue` user), F2 / gõ / Delete / thanh công thức, đổi định dạng (`setStyle`, chiều cao/độ rộng, ẩn hàng cột, AutoFit), chèn/xóa hàng cột, merge, fill, clear.
- Không chặn: chọn ô, copy, đổi tab, đổi tên, move/copy, cuộn, tính lại công thức nội bộ.
- Nút đổi nhãn **Bảo vệ trang tính...** / **Bỏ bảo vệ trang tính...** (state CommandBus). Tab có dấu khóa CSS.
- **Không Undo** — toggle trạng thái, ghi rõ theo yêu cầu task.

---

## 3. Phạm vi đã làm / chưa làm

| Mục | Trạng thái |
|---|---|
| Đổi tên qua dialog Format + double-click tab + context menu | Xong |
| Validate trùng / ký tự cấm / độ dài 31 | Xong |
| Cập nhật công thức `'Tên'!A1` và 3D | Xong |
| Named range `.sheet` / `.ref`, Pivot `sourceSheet` | Xong |
| Move or Copy dialog + bản sao đầy đủ | Xong |
| Protect UI lock + mật khẩu phiên + đổi nhãn | Xong |
| Help tiếng Việt 3 bài | Xong |
| Kéo-thả tab | **Chưa** (không có sẵn; dialog thay thế) |
| Protect round-trip FODS/`table:protected` | **Chưa** (chỉ phiên làm việc) |
| Unlock từng ô (locked/unlocked cells Excel) | **Chưa** — khóa cả trang |
| Sửa chuỗi `"Tên cũ"` trong công thức / ghi chú / đầu trang | **Không** (Excel cũng không sửa string literal) |

---

## 4. Files changed

- `apps/sheet/sheet-grid.js`, `sheet-ribbon.js`, `sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (chỉ 3 map `sheet.sheet.*`)
- `platform/commands/command-definitions.js` (3 lệnh `sheet.*`)
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `platform/ui-kit/icons.js`
- `platform/help/entries-sheet.js` (3 entry mới)
- `tests/unit/sheet-rename-move-protect.test.js`, `tests/unit/sheet-format-dropdown.test.js` (dropdown 11 mục)
- `tests/live/sheet-rename-move-protect.playwright.mjs`
- `tests/run-tests.js`
- file này

Không đụng Writer/Slides source.

Lệnh: `sheet.sheet.rename`, `sheet.sheet.moveOrCopy`, `sheet.sheet.protect`.

UNO: `.uno:RenameTable`, `.uno:Move`, `.uno:Protect`.

---

## 5. Commands / tests run

- `node --check` các file JS đã sửa — PASS
- `node tests/run-tests.js` — **PASS 1010/1010**, 0 FAIL, **71,59 s**
- `node tests/live/sheet-rename-move-protect.playwright.mjs` — **PASS** (Edge headless, click thật, không SendKeys)

Suite vượt mốc 60s vì các test soffice **đã có sẵn**; test mới đơn vị chạy nhanh.

---

## 6. Test results (truthful)

### Unit (`tests/unit/sheet-rename-move-protect.test.js`) — PASS (10)

- Ribbon 3 lệnh + icon + i18n + UNO map
- Help 3 bài nhóm Ô
- validateSheetName từ chối trống / trùng / quá dài / `/ \ ? * [ ] :` / nháy đơn
- Đổi tên `Dự toán chi phí` → `NganSach` cập nhật `='NganSach'!A1` và giá trị 25
- Named range + Pivot sourceSheet đổi; `="Dự toán chi phí"` (chuỗi) không đổi
- Undo/Redo rename trên stack chung
- moveSheet trước sheet khác và ra cuối; Undo trả thứ tự
- copySheet giữ giá trị, style, Page Setup, CF; sửa bản sao không đụng gốc; Undo xóa `(2)`
- Protect chặn `setCellValue` và `deleteRow`; sai mật khẩu không mở; đúng mật khẩu cho sửa lại
- `handleDispatch` RenameTable / Move / Protect

### Live Playwright — PASS

Server `http://127.0.0.1:8911/?app=sheet`, viewport 1440×900:

- Dropdown Định dạng → Đổi tên → `NganSachLive`; tab đổi; công thức `'NganSachLive'!Z1` = 77
- Tạo bản sao, tick, chuyển đến cuối → `NganSachLive (2)`, Z1=77
- Move `NganSachLive` đến cuối
- Protect → `setCellValue` trả `false`, Z1 còn 77; nhãn thành **Bỏ bảo vệ**; bấm lại thì mở khóa
- Help tìm «đổi tên trang tính»
- `pageErrors=[]`

---

## 7. Known failures / limits

- Cấm dấu nháy đơn trong tên (chặt hơn Excel, tránh quoting `'O''Brien'`).
- Protect **không** phải bảo mật: mật khẩu plain, tắt trong DevTools/`unprotectSheet({password})` nếu biết, không chống sửa file.
- Protect không Undo, không lưu FODS.
- Công thức text trong `"..."` , nội dung ghi chú, Header/Footer gõ tay chứa tên cũ: không rewrite.
- Chưa kéo-thả tab.

---

## 8. Risks

- Mọi `*BySheet` phụ thuộc tên: nếu module mới thêm map theo tên mà quên `_sheetKeyedCollections()`, rename sẽ rơi key.
- Virtual tab re-render mỗi rename/move/copy; double-click bắt `showRenameSheetDialog` sau click chuyển sheet.

---

## 9. Dependencies / blockers

Không dependency mới, không thư viện trả phí. Không core patch.

CORE PATCH ID: không có.

---

## 10. Next action

- Review trên `feature/sheet-rename-move-protect`. **Không merge main** trong task này.
- Task riêng nếu cần: FODS `table:protected`, unlock từng ô, kéo-thả tab.