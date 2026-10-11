# Agent Handoff

TASK: Sửa bug `common.edit.replace` trên VN Sheet + thêm `sheet.cell.orientation` (xoay chữ trong ô)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Writer/Slides source, không merge main.
BRANCH: `feature/sheet-replace-orientation`
WORKTREE: `E:\VNOffice-grok-sheet-replace-orientation`
BASE: `main` @ `cdfcae6` — đo thật `node tests/run-tests.js` **1300/1300 PASS** trước khi làm.
**KHÔNG merge tự động vào main** — người phụ trách đọc lại trước.

Đo engine + dialog + ODF/XLSX trước khi viết code: `docs/HANDOFF-SHEET-REPLACE-ORIENTATION-FINDINGS.md` (commit `4049ebb`).

---

## Tổng kết

Cả hai nhiệm vụ đã xong, commit tách:

| Commit | Việc |
|---|---|
| `4049ebb` | Findings + probe soffice (trước mọi code runtime) |
| `2f82937` | Nhiệm vụ 1 — bind Replace, dialog dùng chung, thay thật trên ô |
| `2df9782` | Nhiệm vụ 2 — dropdown Hướng chữ, FODS `style:rotation-angle`, soffice `textRotation` |

HEAD: `2df9782`

---

## Nhiệm vụ 1 — `common.edit.replace`

**Nguyên nhân đo được:** ribbon và `command-definitions.js` đã có lệnh; `sheet-adapter.js` chỉ `bindHandler("common.edit.find")`. `CommandBus.execute` không handler → `false`. Dialog `showFindDialog` trên grid là Find-only.

**Cách làm:** không tạo dialog thứ 3. Adapter `_showFindReplaceDialog(isReplace)` (cùng pattern Slides) mở `showFindReplaceDialog` từ `platform/ui-kit/dialogs.js`. Grid có `findNext` / `replaceOne` / `replaceAll` trên `cellsData` (giá trị + công thức, không phân biệt hoa/thường). Ô công thức chỉ sửa chuỗi công thức (không phá `val` tính ra). Sparkline / array formula bỏ qua. `replaceAll` một bước Undo (`batch-cells`). Sheet bảo vệ thì chặn.

Live: `tests/live/sheet-find-replace.playwright.mjs` (cổng 8917, không đụng ribbon-audit 8893) — click nút Thay thế, dialog Replace-active, Thay thế tất cả đổi thật A1/B1.

Help: bài `sheet.edit.findReplace` tiếng Việt, nhóm Chỉnh sửa.

---

## Nhiệm vụ 2 — `sheet.cell.orientation`

**Model:** `item.style.textRotation` ∈ `{0, 45, -45, 90, -90, 255}`. Không phải CSS property — `_applyStylesToDom` bỏ qua, `_renderCellVisual` áp `transform: rotate(-Ndeg)` (CSS dương theo chiều kim; Excel dương ngược chiều) hoặc stacked `writing-mode: vertical-rl` khi 255.

**Ribbon:** dropdown Hướng chữ hàng 1 nhóm Căn chỉnh, sau wrapText. Sáu mục, một command + `args` (một dòng `createDropdownButton` truyền `subItem.args`).

**FODS (canonical LO, đã đo probe):**

| Nội bộ | ODF ghi | XLSX `textRotation` (soffice) |
|---|---|---|
| 45 | `style:rotation-angle="45"` | 45 |
| −45 | `style:rotation-angle="315"` | 135 |
| 90 | `style:rotation-angle="90"` | 90 |
| −90 | `style:rotation-angle="270"` | 180 |
| 255 | `style:direction="ttb"` + `rotation-angle="0"` | 255 |
| 0 / thiếu | không emit | 0 |

Registry deterministic `ceRot1`…; ô vừa numberFormat vừa xoay gộp style (`ce1_ceRot1`). Parse: `ttb` → 255; góc `> 180` → `angle - 360`.

Help: bổ sung vào bài `sheet.cell.alignment` (vị trí dropdown, 6 lựa chọn, lưu FODS/XLSX).

---

## Verification (đã chạy, không đoán)

```
node tests/run-tests.js
  → 1307/1307 PASS | 0 FAIL   (baseline 1300; +2 Find/Replace, +5 orientation)

node tests/live/sheet-find-replace.playwright.mjs
  → PASS: Sheet Replace mở dialog đúng chế độ và thay thật trên ô

node tests/live/ribbon-audit-1280.playwright.mjs
  → 104/104 tab 0px overflow; 0 failure; "100% PASS"
  Sheet Home sum 1247px / 1280px (VI). Cổng 8893, không xung đột Round 2 lúc chạy.

Suite 119: LibreOffice FODS → XLSX XML thật có textRotation 45, 135, 90, 180, 255
  rồi XLSX → FODS parse lại đúng 45 / −45 / 90 / −90 / 255.
```

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

---

## FILES CHANGED

**Nhiệm vụ 1:** `adapters/libreoffice/sheet/sheet-adapter.js`, `apps/sheet/sheet-grid.js`, `platform/help/entries-sheet.js`, `tests/unit/sheet-editing-styles.test.js`, `tests/unit/sheet-help.test.js`, `tests/live/sheet-find-replace.playwright.mjs`

**Nhiệm vụ 2:** thêm `apps/sheet/sheet-ribbon.js`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/icons.js`, `platform/ui-kit/components.js` (truyền `args` dropdown), `adapters/libreoffice/common/command-dispatch-mapper.js`, `tests/unit/sheet-cell-orientation.test.js`, `tests/unit/ribbon-gaps-real-office.test.js`, `tests/run-tests.js`

Không đụng `apps/writer/**`, `apps/slides/**`, Core, build system.

---

## Giới hạn (thật)

- `setCellOrientation` / `setStyle` chỉ ô đang chọn — cùng hạn chế align/wrap hiện tại, không áp cả vùng bôi.
- Ô trống chỉ có xoay được persist vì `_cellHasPersistableContent` nhận `textRotation`; Find/Replace không đụng sparkline / công thức mảng.
- Dropdown mục góc vẫn nhãn tiếng Việt khi locale EN (cùng kiểu select Định dạng số trên ribbon Sheet).
- Round 2 ribbon (`fix/sheet-ribbon-parity-round2`) chạy song song trên worktree khác; nhánh này **không merge**.

## Next action

Người phụ trách đọc findings + handoff, review 3 commit trên `feature/sheet-replace-orientation`, rồi merge main khi sẵn sàng.
