# Agent Handoff

TASK: Bổ sung hướng dẫn sử dụng (Help) cho các tính năng cơ bản đã có sẵn — Batch 1 (Writer/Sheet/Slides)

AGENT/ROLE: Grok — Platform Help content (không sửa code tính năng)

BRANCH: `feature/retroactive-help-batch1`

WORKTREE: `E:\VNOffice-grok-retroactive-help-batch1`

OBJECTIVE: AGENTS.md mục 10 — rà soát bổ sung Help tiếng Việt cho tính năng sẵn có. Task 1/nhiều: ưu tiên lệnh dùng hàng ngày chưa có bài Help nào. Chỉ THÊM entry mới vào `platform/help/entries-*.js` và assertion mới trong `tests/unit/*-help.test.js`. Không sửa/xóa entry cũ. Không đụng `apps/*`, `adapters/*`, `command-definitions.js`, i18n, icons. Không merge vào `main`.

---

## Plan (AGENTS.md mục 6)

| Mục | Nội dung |
|---|---|
| Objective | Thêm bài Help thật (không placeholder) cho lệnh cơ bản Writer/Sheet/Slides còn trống |
| Current capability | Catalog Help đã có (~10 Writer, 19 Sheet, 15 Slides). Script đối chiếu: **76 Writer + 98 Sheet + 42 Slides = 216 lệnh** chưa nằm trong `commandIds` của bất kỳ entry nào |
| Files | `platform/help/entries-writer.js`, `entries-sheet.js`, `entries-slides.js` (chỉ append); `tests/unit/writer-help.test.js`, `sheet-help.test.js`, `slides-help.test.js` (chỉ thêm test); `docs/HANDOFF-RETROACTIVE-HELP-BATCH1.md` |
| Dependency | Không thư viện mới. Ribbon/shortcut tra cứu từ `writer-ribbon.js` / `sheet-ribbon.js` / `slides-ribbon.js` và `command-definitions.js` (chỉ đọc) |
| Risk | Một số lệnh không có nút ribbon (chỉ phím tắt) — bài Help ghi rõ. Một số hành vi rút gọn so với Word/Excel/PowerPoint được mô tả đúng code, không tô hồng |
| Test plan | `node tests/run-tests.js` dưới 90s, 100% PASS; recount coverage |
| Rollback | `git revert` trên nhánh này; không đụng `main` |

---

## Findings

- Worktree `E:\VNOffice-grok-retroactive-help-batch1`, nhánh `feature/retroactive-help-batch1` tách từ `main` @ `a286752` (1050/1050 PASS lúc tách).
- Mọi lệnh trong danh sách ưu tiên đều còn tồn tại trên ribbon hoặc phím tắt (không đổi tên / không bỏ).
- `slides.layout.apply` và `slides.layout.select` mở **cùng** hộp thoại bố cục — gộp một bài.
- `sheet.insert.date` / `sheet.insert.time`, `slides.nav.*`, `slides.shape.group` / `ungroup`: **không có nút ribbon**, chỉ phím tắt — bài Help nói rõ.
- `slides.text.insert` (nhãn «Hộp văn bản») thực tế thêm dòng «• Khung văn bản mới bổ sung» vào body, không tạo khung kéo-thả — mô tả đúng hành vi.
- `writer.help.open` / `sheet.help.open` / `slides.help.open` cố ý **không** viết bài (mở Help không cần bài tự trỏ).

---

## Implementation summary

Thêm **31 bài Help mới** (Writer 9, Sheet 13, Slides 9). Gộp lệnh theo nhóm ribbon giống `sheet.format.number`. Mỗi bài: `id` mới, `commandIds`, `title`/`summary` tiếng Việt, `ribbon` tra cứu thật, `keywords` có dấu/không dấu, `steps` cụ thể kèm phím tắt từ `command-definitions.js`.

### Writer — 9 bài mới (38 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `writer.text.basicFormat` | Trang đầu → Phông chữ | bold/italic/underline/strike, font family/size/grow/shrink, sub/super, clearFormat, color text/highlight |
| `writer.para.alignAndList` | Trang đầu → Đoạn văn | align L/C/R/justify, spacing 1/1.5/2, bullet/numbered, indent Inc/Dec |
| `writer.table.insert` | Chèn → Bảng biểu | table.insert (3×4, không dialog) |
| `writer.image.insert` | Chèn → Minh họa | image.insert (file picker) |
| `writer.headerFooter` | Chèn → Đầu trang / Chân trang | header.insert, footer.insert |
| `writer.insert.textObjects` | Chèn → Văn bản | textbox, dateTime |
| `writer.insert.symbol` | Chèn → Ký hiệu | symbol (picker dùng chung) |
| `writer.view.layouts` | Chế độ xem → Dạng xem | printLayout, webLayout, readMode |
| `writer.view.zoom` | Chế độ xem → Thu phóng | zoomIn/Out/Reset/100 (50–200%) |

### Sheet — 13 bài mới (50 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `sheet.cell.font` | Trang đầu → Phông chữ | bold/italic/underline, font, borders, fillColor, textColor |
| `sheet.cell.alignment` | Trang đầu → Căn chỉnh | align 6 hướng, wrapText, indent, mergeCenter/Across/Cells, unmerge |
| `sheet.data.sortFilter` | Dữ liệu → Sắp xếp & Lọc | sortAsc/Desc, filter (Ctrl+Shift+L) |
| `sheet.data.toolsBasic` | Dữ liệu → Công cụ dữ liệu | textToColumns, flashFill, removeDuplicates |
| `sheet.data.outline` | Dữ liệu → Dàn bài | group, ungroup, subtotal |
| `sheet.view.workbookViews` | Chế độ xem → Chế độ xem bảng tính | normal, pageBreakPreview, pageLayout |
| `sheet.view.show` | Chế độ xem → Hiển thị | formulaBar, gridlines, headings |
| `sheet.view.zoom` | Chế độ xem → Thu phóng | zoomIn/Out/Reset |
| `sheet.cells.insertDelete` | Trang đầu → Ô | row/col insert/delete |
| `sheet.insert.image` | Chèn → Minh họa | insert.image |
| `sheet.insert.hyperlink` | Chèn → Liên kết | insert.hyperlink (Ctrl+K) |
| `sheet.insert.textbox` | Chèn → Văn bản | insert.textbox |
| `sheet.insert.dateTime` | (phím tắt; bài gắn tab Chèn) | insert.date Ctrl+; , insert.time Ctrl+Shift+; |

### Slides — 9 bài mới (24 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `slides.slide.manage` | Trang đầu → Trang chiếu | new, duplicate, delete, layout.apply/select |
| `slides.nav.slides` | (phím tắt; bài gắn nhóm Trang chiếu) | first/last/prev/next |
| `slides.insert.drawing` | Trang đầu → Đối tượng vẽ | text.insert, shape.insert, image.insert |
| `slides.insert.table` | Chèn → Bảng | insert.table (1–12 hàng/cột) |
| `slides.shape.groupUngroup` | (Ctrl+G / Ctrl+Shift+G) | group, ungroup |
| `slides.show.start` | Trình chiếu → Khởi động chiếu | F5, Shift+F5, Alt+F5 presenter |
| `slides.view.normal` | Chế độ xem → Dạng xem bản trình chiếu | view.normal |
| `slides.view.zoom` | Chế độ xem → Thu phóng | zoomIn/Out/Reset, fitToWindow |
| `slides.notes.toggle` | Chế độ xem → Dạng xem bản trình chiếu | notes.toggle (cũng có trên tab Trình chiếu) |

---

## Coverage sau Batch 1

| App | Lệnh tổng | Entry trước → sau | Lệnh chưa có Help trước | **Còn lại** | Giảm |
|---|---|---|---|---|---|
| Writer | 111 | 10 → **19** | 76 | **38** | −38 |
| Sheet | 139 | 19 → **32** | 98 | **48** | −50 |
| Slides | 78 | 15 → **24** | 42 | **18** | −24 |
| **Tổng** | 328 | 44 → **75** | **216** | **104** | **−112** |

Không về 0 — đúng phạm vi Batch 1. Batch 2 lấy danh sách còn lại bên dưới.

### Writer còn 38 lệnh — gợi ý Batch 2

`writer.view.ruler`, `gridlines`, `pageWidth`, `newWindow`; `writer.nav.docStart/docEnd`; `writer.style.normal/apply/gallery`; `writer.design.themeGallery`; `writer.text.changeCase`; `writer.para.moveUp/Down/sort/showFormattingMarks/shading/borders`; `writer.shape.insert`, `diagram.insert`, `chart.insert`; `writer.format.dropCap`; `writer.insert.equation/bookmark/crossReference`; `writer.comment.insert`; `writer.page.margins/orientation/size/columns/columns1/2/3/watermark/border`; `writer.file.printPreview`; `writer.reference.footnoteInsert/endnoteInsert`. (Bỏ `writer.help.open`.)

### Sheet còn 48 lệnh — gợi ý Batch 2

`sheet.edit.pasteSpecial`; `sheet.nav.home/end`; `sheet.cell.edit`; `sheet.select.column/row`; nhóm Công thức (category*, nameManager, defineName, useInFormula, createFromSelection, trace*, showFormulas, errorChecking, watchWindow, arrayEnter, recalculate); `sheet.calc.*`; `sheet.view.toggleFormulas/zoomToSelection/newWindow`; `sheet.review.spellCheck/commentInsert`; `sheet.page.setPrintArea/clearPrintArea/insertPageBreak/removePageBreak`; sparkline Line/Column; `sheet.style.formatAsTable/cellStyles`; Fill Down/Right; Clear All/Formats/Contents. (Bỏ `sheet.help.open`.)

### Slides còn 18 lệnh — gợi ý Batch 2

`slides.review.commentInsert/spellCheck`; `slides.media.insertVideo/insertAudio`; `slides.insert.headerFooter/dateTime/slideNumber/symbol`; `slides.design.themeGallery/slideSize`; `slides.master.apply`; `slides.view.reading/ruler/gridlines/guides/newWindow`; `slides.show.rehearseTimings`. (Bỏ `slides.help.open`.)

---

## Files changed

- `platform/help/entries-writer.js` — append 9 entry
- `platform/help/entries-sheet.js` — append 13 entry
- `platform/help/entries-slides.js` — append 9 entry
- `tests/unit/writer-help.test.js` — thêm 1 test Batch 1
- `tests/unit/sheet-help.test.js` — thêm 1 test Batch 1
- `tests/unit/slides-help.test.js` — thêm 1 test Batch 1
- `docs/HANDOFF-RETROACTIVE-HELP-BATCH1.md` — file này

Không sửa entry cũ. Không sửa ribbon, command-definitions, i18n, icons, apps, adapters.

---

## Commands run

- `git worktree add -b feature/retroactive-help-batch1 E:\VNOffice-grok-retroactive-help-batch1 main`
- Script đối chiếu command-definitions ↔ help `commandIds` (trước: 76/98/42; sau: 38/48/18)
- `node tests/run-tests.js`

BUILD RESULT: PASS — không có bước bundle; syntax nằm trong suite.

TEST RESULTS:

- **PASS** — `node tests/run-tests.js`: **1053/1053**, 0 FAIL, **69.88 giây** (< 90s). Baseline lúc tách `main` là 1050/1050; +3 test Batch 1 Help.
- Help Writer / Sheet / Slides (định dạng, không duplicate id, search, F1) vẫn PASS.
- Test mới xác nhận id bài, `commandIds` thành viên, và `ribbon.tab`/`group` đúng UI.

KNOWN FAILURES: Không có.

---

## Risks

- Help mô tả hành vi **hiện có** (ví dụ Writer bảng cố định 3×4; Sheet merge cảnh báo mất dữ liệu; Slides «Hộp văn bản» không phải khung kéo-thả). Nếu tính năng đổi sau này, bài Help phải cập nhật theo.
- Ba lệnh `*.help.open` còn trong số 104 — không cần bài.
- `sheet.data.goalSeek` / `sheet.data.pivotRefresh` vốn đã xuất hiện ở nhiều bài cũ — Batch 1 không thêm trùng mới.

DEPENDENCIES/BLOCKERS: Không có. Không Core patch.

CORE PATCH ID (if any): Không có.

---

## Next action

1. Reviewer đọc nhánh `feature/retroactive-help-batch1` — **không merge vào main** cho đến khi người phụ trách duyệt.
2. Batch 2: lấy 104 lệnh còn lại (trừ `*.help.open`), ưu tiên Writer page setup / footnotes / print preview, Sheet công thức & named range, Slides header-footer / media / theme.
3. Có thể thêm assertion coverage tự động (mọi command trừ help.open phải thuộc 1 entry) khi coverage gần đủ, không làm trong batch này.
