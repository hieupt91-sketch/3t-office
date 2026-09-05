# Agent Handoff

TASK: Dropdown Định dạng (Format) cho nhóm Home > Ô của VN Sheet
AGENT/ROLE: Grok — Sheet implementation
BRANCH: `feature/sheet-format-dropdown`
WORKTREE: `E:\VNOffice-grok-sheet-format-dropdown` (tách từ `main` tại `fa6a00b`, **KHÔNG merge vào main**)
OBJECTIVE: Thêm dropdown Excel-like “Định dạng” vào nhóm Cells: chiều cao hàng, AutoFit hàng, độ rộng cột, AutoFit cột, ẩn/hiện hàng, ẩn/hiện cột. Lưu vào model Sheet, Undo/Redo dùng stack hiện có, round-trip FODS chuẩn ODF.

---

## 1. Findings (đọc trước khi code)

- Nhóm Cells trên `apps/sheet/sheet-ribbon.js` chỉ có Insert/Delete hàng & cột. Dropdown mẫu đã có: Điền / Xóa (`type: "dropdown"`).
- `autoFitRow` / `autoFitColumn` đã tồn tại nhưng **chỉ sửa DOM**, mất sau re-render; không có model `rowHeights` / `colWidths`.
- `hiddenRows` đang phục vụ **AutoFilter**, không phải ẩn tay. Không được dùng chung.
- FODS chưa ghi `style:row-height`, `style:column-width`, `table:visibility`.
- Đổi tên tab trang tính (double-click) **chưa có**. Move/Copy Sheet và Protect Sheet chưa có.

## 2. Implementation summary

Model per-sheet (tách khỏi filter):

- `rowHeightsBySheet` / `colWidthsBySheet` (Map, pixel)
- `userHiddenRowsBySheet` / `userHiddenColsBySheet` (Set)
- Mặc định: hàng 26px, cột 100px. Clamp hàng 1–409, cột 8–500.

UI: dropdown lớn “Định dạng” trên tab Trang đầu / nhóm Ô, 8 lệnh. Dialog số dùng `showPromptDialog` có sẵn.

Undo/Redo: history type `row-col-layout` trên stack hiện có. Insert/Delete hàng-cột dịch luôn height/width/hidden.

FODS (tên thuộc tính ODF thật, đo qua serialize + soffice):

- `style:family="table-column"` + `style:column-width="N.NNNcm"`
- `style:family="table-row"` + `style:row-height="N.NNNcm"`
- `table:visibility="collapse"` trên `table:table-column` / `table:table-row`

Parser: regex `style:style` phải tách tag tự đóng (`<style:style .../>` của page style) kẻo nuốt style cột kế bên.

## 3. Phạm vi đã làm / chưa làm

| Mục | Trạng thái |
|---|---|
| Chiều cao hàng (dialog nhập số, pixel) | Xong |
| Tự động vừa chiều cao hàng | Xong (persist + undo) |
| Độ rộng cột (dialog nhập số, pixel) | Xong |
| Tự động vừa độ rộng cột | Xong (persist + undo) |
| Ẩn / Hiện hàng | Xong (tách khỏi filter) |
| Ẩn / Hiện cột | Xong |
| Đổi tên trang tính qua dialog Format | **Chưa** — chưa có double-click tab; cần task riêng (đổi key mọi `*BySheet` + công thức `'Tên'!A1`) |
| Di chuyển hoặc Sao chép trang tính | **Chưa** — task riêng |
| Bảo vệ trang tính (UI lock) | **Chưa** — task riêng, không phải bảo mật thật |

## 4. Files changed

- `apps/sheet/sheet-ribbon.js`, `sheet-grid.js`, `sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (chỉ thêm map `sheet.*` mới)
- `platform/commands/command-definitions.js` (8 lệnh `sheet.*`)
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `platform/ui-kit/icons.js`
- `tests/unit/sheet-format-dropdown.test.js`, `tests/live/sheet-format-dropdown.playwright.mjs`, `tests/run-tests.js`
- file này

Không đụng Writer/Slides source.

## 5. Commands / tests run

- `node --check` trên các file JS đã sửa — PASS
- `node tests/run-tests.js` — **PASS 926/926**, 0 FAIL, ~73s
- `node tests/live/sheet-format-dropdown.playwright.mjs` — **PASS** (Edge headless, click thật, không SendKeys)

Thời gian suite ~73s (vượt 60s) vì các test soffice **đã có sẵn** trong repo (Pivot/CF/Charts/import fidelity); test Format dropdown đơn vị chạy nhanh, thêm một hop FODS→XLSX→FODS.

## 6. Test results (truthful)

### Unit (`tests/unit/sheet-format-dropdown.test.js`) — PASS

- Ribbon dropdown 8 lệnh + icon SVG
- Đặt hàng 3 = 48px, cột B = 160px
- Ẩn/hiện hàng 5 và cột C
- AutoFit cột chữ dài > 120px; AutoFit hàng 3 dòng ≥ 70px
- Undo/Redo 4 bước trên stack chung
- Ẩn tay không đụng `hiddenRows` của filter
- Insert row/col dịch height/width/hidden
- parseFods nội bộ đọc `style:row-height` / `style:column-width` / `table:visibility="collapse"`
- `loadFromFods` khôi phục model
- handleDispatch `.uno:RowHeight` / `ColumnWidth` / `HideRow` / `ShowRow` / `SetOptimalColumnWidth`

### Live Playwright — PASS

Server `http://127.0.0.1:8898/?app=sheet`, viewport 1440×900:

- Dropdown “Định dạng” visible
- Click Chiều cao hàng… → dialog → 48 → hàng 2 DOM = 48.0px
- Click Độ rộng cột… trên D1 → 150 → model 150, header DOM = 150.0px
- Gõ chuỗi dài + AutoFit cột B → model 453, DOM 453.0px
- Ẩn hàng 4: `tr[data-row="4"]` biến khỏi DOM; Hiện hàng: trở lại
- Ẩn cột C (`hidden`/display:none); Hiện cột C
- AutoFit hàng 6 = 26px (hàng trống)
- Ctrl+Z / Ctrl+Y không pageerror
- `pageErrors=[]`

### FODS soffice — PASS

`serializeToFods` → soffice FODS→XLSX→FODS → `parseFods`:

- Chiều cao hàng 2: 52px, dung sai ≤ 3px
- Độ rộng cột B: 170px, dung sai ≤ 4px
- Hàng 4 ẩn và cột C ẩn còn `table:visibility="collapse"` sau hop XLSX

Đơn vị nội bộ: px ↔ cm (`px / 37.79527559055118`). LibreOffice giữ visibility collapse qua XLSX trong lần đo này.

## 7. Known failures / limits

- Đơn vị UI là **pixel** (khớp grid 26/100), không phải point Excel hay “ký tự cột”.
- AutoFit hàng đếm số dòng `\n`, chưa đo wrap-text theo độ rộng cột.
- Ẩn hàng filter và ẩn tay độc lập: Hiện hàng không bỏ điều kiện AutoFilter.
- Rename / Move-Copy / Protect: chưa làm (xem bảng mục 3).
- `command-dispatch-mapper.js` được thêm map sheet (cùng pattern các lệnh Sheet khác); không sửa Writer/Slides.

## 8. Risks

- Virtual scroll vẫn ước lượng theo `rowHeight` đều 26px; hàng rất cao có thể lệch spacer khi cuộn xa.
- Công thức `'Tên sheet'!A1` chưa đổi theo rename vì rename chưa làm.

## 9. Dependencies / blockers

Không dependency mới, không thư viện trả phí. Không core patch.

CORE PATCH ID: không có.

## 10. Next action

- Review trên `feature/sheet-format-dropdown`. **Không merge main** trong task này.
- Task tiếp: Rename Sheet (dialog + double-click tab, một logic), Move/Copy Sheet, Protect Sheet (UI lock).
