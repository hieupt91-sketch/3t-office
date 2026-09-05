# Agent Handoff

TASK: Bổ sung hướng dẫn sử dụng (Help) cho các tính năng còn thiếu sau Batch 1 — Batch 2 (Writer/Sheet/Slides)

AGENT/ROLE: Grok — Platform Help content (không sửa code tính năng)

BRANCH: `feature/retroactive-help-batch2`

WORKTREE: `E:\VNOffice-grok-retroactive-help-batch2`

OBJECTIVE: AGENTS.md mục 10 — tiếp nối Batch 1 (đã merge `main` @ `3e47b16`, 1053/1053 PASS). Phủ Help tiếng Việt cho 104 lệnh còn lại (38 Writer + 48 Sheet + 18 Slides, đã trừ `*.help.open`). Chỉ THÊM entry mới vào `platform/help/entries-*.js` và assertion mới trong `tests/unit/*-help.test.js`. Không sửa/xóa entry cũ (kể cả Batch 1). Không đụng `apps/*`, `adapters/*`, `command-definitions.js`, i18n, icons. Không merge vào `main`.

---

## Plan (AGENTS.md mục 6)

| Mục | Nội dung |
|---|---|
| Objective | Thêm bài Help thật cho lệnh còn trống sau Batch 1; ưu tiên Sheet nhóm Công thức, rồi Writer page setup, rồi phần còn lại |
| Current capability | Catalog sau Batch 1: Writer 19, Sheet 32, Slides 24 (75 bài). Còn 104 lệnh chưa nằm trong `commandIds` |
| Files | `platform/help/entries-writer.js`, `entries-sheet.js`, `entries-slides.js` (chỉ append); `tests/unit/writer-help.test.js`, `sheet-help.test.js`, `slides-help.test.js` (chỉ thêm test); `docs/HANDOFF-RETROACTIVE-HELP-BATCH2.md` |
| Dependency | Không thư viện mới. Ribbon/shortcut tra từ `*-ribbon.js` và `command-definitions.js` (chỉ đọc). Hành vi tra `sheet-grid.js`, `formula-engine.js`, `cell-styles.js`, `writer-app.js`, dialogs Writer/Slides |
| Risk | Một số lệnh chỉ phím tắt (không nút ribbon). Một số nút ribbon chèn mặc định, không mở dialog dù dialog tồn tại nhưng chưa nối — bài Help mô tả đúng code, không tô hồng |
| Test plan | `node tests/run-tests.js` dưới 90s, 100% PASS; recount coverage command-definitions ↔ commandIds |
| Rollback | `git revert` trên nhánh này; không đụng `main` |

---

## Findings

- Worktree `E:\VNOffice-grok-retroactive-help-batch2`, nhánh `feature/retroactive-help-batch2` tách từ `main` @ `3e47b16` (1053/1053 PASS lúc tách).
- Mọi lệnh trong danh sách Batch 1 còn lại đều còn tồn tại đúng tên. Ribbon tra đúng `*-ribbon.js`.
- **Chỉ phím tắt, không nút ribbon:** Writer `nav.docStart/docEnd` (Ctrl+Home/End), `style.normal` (Ctrl+Shift+N), `para.moveUp/moveDown` (Alt+Shift+↑/↓); Sheet `nav.home/end`, `cell.edit` (F2), `select.column/row`, `formula.arrayEnter` (Ctrl+Shift+Enter), `view.toggleFormulas` (Ctrl+`). `writer.style.apply` là lệnh nội bộ — dropdown ribbon đã gỡ (trùng Quick Styles).
- `sheet.calc.modeAutomatic` / `modeManual` không có nút riêng — là giá trị của hộp Tùy chọn tính toán.
- Writer Hình khối / Sơ đồ / Biểu đồ: dialog picker **tồn tại nhưng không được gọi** khi bấm ribbon; chèn mặc định (chữ nhật 140×80 #2563eb; sơ đồ Process 4 bước; biểu đồ cột «Không có dữ liệu»).
- `sheet.formula.nameManager` **không** có Ctrl+F3 trong `command-definitions.js` (HANDOFF Formulas Tab ghi Ctrl+F3 — không khớp code). `createFromSelection` mới có Ctrl+Shift+F3.
- F7 Chính tả Sheet/Slides bind runtime theo scope; không ghi `shortcut: "F7"` vì F7 common thuộc `ai.assistant.grammarCheck`.
- `writer.page.margins` / `orientation` / `size` mở **cùng** hộp «Thiết lập trang».
- Ba lệnh `*.help.open` cố ý **không** viết bài.

---

## Implementation summary

Thêm **36 bài Help mới** (Writer 15, Sheet 13, Slides 8). Gộp lệnh theo nhóm ribbon. Mỗi bài: `id` mới (không trùng Batch 1), `commandIds`, title/summary tiếng Việt, `ribbon` tra cứu thật, keywords có dấu/không dấu, `steps` cụ thể kèm phím tắt và hằng số từ code.

### Sheet — 13 bài mới (ưu tiên; 47 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `sheet.formula.functionCategories` | Công thức → Hàm tính toán | 7 nút danh mục; cùng hộp fx 620 px, 96 hàm |
| `sheet.formula.namedRanges` | Công thức → Tên đã xác định | nameManager, defineName, useInFormula, createFromSelection (Ctrl+Shift+F3) |
| `sheet.formula.auditing` | Công thức → Kiểm tra công thức | trace P/D, removeArrows, showFormulas, errorChecking, watchWindow, toggleFormulas (Ctrl+`) |
| `sheet.formula.calculation` | Công thức → Tính toán | calculationOptions, mode Auto/Manual, F9, Shift+F9, arrayEnter |
| `sheet.edit.pasteSpecialHelp` | Trang đầu → Bảng nhớ tạm | pasteSpecial (Ctrl+Alt+V) |
| `sheet.nav.keyboardSelect` | (phím tắt; bài gắn nhóm Ô) | Ctrl+Home/End, F2, Ctrl+Space, Shift+Space |
| `sheet.view.zoomWindowExtra` | Chế độ xem → Thu phóng / Cửa sổ | zoomToSelection (50–200%), newWindow |
| `sheet.review.spellCheck` | Xem xét → Chứng minh | spellCheck (F7 runtime) |
| `sheet.review.commentInsert` | Xem xét → Ghi chú | commentInsert (Shift+F2 chuột phải) |
| `sheet.page.printAreaBreaks` | Bố trí trang → Vùng in | set/clear print area, insert/remove page break |
| `sheet.insert.sparklines` | Chèn → Biểu đồ thu nhỏ | sparkline Line/Column |
| `sheet.style.tableAndCells` | Trang đầu → Kiểu ô | formatAsTable (5 mẫu), cellStyles (10 preset) |
| `sheet.edit.fillAndClear` | Trang đầu → Chỉnh sửa | fillDown/Right (Ctrl+D/R), clear All/Formats/Contents |

Hằng số ghi đúng code: Watch Window 440×250 px; mũi tên audit #2563EB / #0F6D38; named range `/^[A-Za-z_][A-Za-z0-9_]*$/` không trùng A1; zoom selection cột ~85 px + 40, hàng ~26 px + 30.

### Writer — 15 bài mới (38 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `writer.view.showAndWindow` | Chế độ xem → Hiển thị | ruler, gridlines (~5 mm), pageWidth, newWindow |
| `writer.nav.documentBounds` | (Ctrl+Home / Ctrl+End) | docStart, docEnd |
| `writer.style.galleryAndNormal` | Trang đầu → Kiểu dáng | gallery, normal (Ctrl+Shift+N), apply (nội bộ) |
| `writer.design.themes` | Thiết kế → Định dạng tài liệu | themeGallery (6 bộ, có NĐ 30) |
| `writer.text.changeCaseHelp` | Trang đầu → Phông chữ | changeCase (Shift+F3) |
| `writer.para.advanced` | Trang đầu → Đoạn văn | sort, formatting marks, shading #FFF2CC, borders, moveUp/Down |
| `writer.insert.illustrationsExtra` | Chèn → Minh họa | shape/diagram/chart — chèn mặc định, không mở picker |
| `writer.format.dropCapHelp` | Chèn → Văn bản | dropCap 3 dòng, TNR đậm #0f4c81 |
| `writer.insert.equationBookmark` | Chèn → Ký hiệu / Liên kết | equation, bookmark, crossReference |
| `writer.comment.insertHelp` | Đánh giá → Ghi chú | comment.insert (Ctrl+Alt+M, bắt buộc bôi chữ) |
| `writer.page.setup` | Bố cục → Thiết lập trang | margins/orientation/size — cùng hộp, lề 20/20/30/15 mm |
| `writer.page.columnsHelp` | Bố cục → Thiết lập trang | columns + 1/2/3; hộp 1–4 cột, khe 0–50 mm |
| `writer.page.watermarkBorder` | Thiết kế → Nền & Viền trang | watermark (5 chip), border (solid/dashed/double) |
| `writer.file.printPreviewHelp` | Bố cục → In ấn | printPreview (Ctrl+F2) |
| `writer.reference.notes` | Tham chiếu → Chú thích | footnote Ctrl+Alt+F (1,2,3), endnote Ctrl+Alt+D (i,ii,iii) |

### Slides — 8 bài mới (18 lệnh được phủ)

| ID bài | Ribbon (đúng UI) | Lệnh |
|---|---|---|
| `slides.review.commentInsertHelp` | Đánh giá → Nhận xét | commentInsert (mở panel, không chèn sẵn) |
| `slides.review.spellCheckHelp` | Đánh giá → Chứng minh | spellCheck (F7; trang hiện tại) |
| `slides.media.insert` | Chèn → Đa phương tiện | video 320×200, audio 260×40; >10 MB cảnh báo |
| `slides.insert.headerFooterHelp` | Chèn → Văn bản | headerFooter, dateTime, slideNumber (thanh chân trang) |
| `slides.insert.symbolHelp` | Chèn → Ký hiệu | symbol (nối vào khung, không caret) |
| `slides.design.themeAndSize` | Thiết kế → Chủ đề | themeGallery (6), master.apply, slideSize 960×540 / 720×540 |
| `slides.view.readingAndGuides` | Chế độ xem | reading (chỉ title+body), ruler px, grid 20 px, 2 guides, newWindow |
| `slides.show.rehearseTimingsHelp` | Trình chiếu → Người thuyết trình | rehearseTimings — lưu mốc, F5 không auto-advance |

---

## Coverage sau Batch 2

| App | Lệnh tổng | Entry trước → sau | Lệnh chưa có Help trước | **Còn lại** | Giảm |
|---|---|---|---|---|---|
| Writer | 111 | 19 → **34** | 38 | **1** (`writer.help.open`) | −38 |
| Sheet | 139 | 32 → **45** | 48 | **1** (`sheet.help.open`) | −48 |
| Slides | 78 | 24 → **32** | 18 | **1** (`slides.help.open`) | −18 |
| **Tổng** | 328 | 75 → **111** | **104** | **3** | **−104** |

Script đối chiếu `command-definitions.js` ↔ `commandIds` trên cả 3 file `entries-*.js`: chỉ còn `writer.help.open`, `sheet.help.open`, `slides.help.open`. Ba lệnh này cố ý không viết bài (mở Help không cần bài tự trỏ).

**Batch 3 không cần cho coverage lệnh.** Có thể làm đợt chất lượng (screenshot, F1 ngữ cảnh) sau này, không chặn merge Batch 2.

Hai lệnh `sheet.data.goalSeek` và `sheet.data.pivotRefresh` vốn đã xuất hiện ở nhiều bài cũ (trước Batch 1) — Batch 2 không thêm trùng mới.

---

## Files changed

- `platform/help/entries-sheet.js` — append 13 entry
- `platform/help/entries-writer.js` — append 15 entry
- `platform/help/entries-slides.js` — append 8 entry
- `tests/unit/sheet-help.test.js` — thêm 1 test Batch 2
- `tests/unit/writer-help.test.js` — thêm 1 test Batch 2
- `tests/unit/slides-help.test.js` — thêm 1 test Batch 2
- `docs/HANDOFF-RETROACTIVE-HELP-BATCH2.md` — file này

Không sửa entry cũ. Không sửa ribbon, command-definitions, i18n, icons, apps, adapters.

---

## Commands run

- `git worktree add -b feature/retroactive-help-batch2 E:\VNOffice-grok-retroactive-help-batch2 main`
- Script đối chiếu command-definitions ↔ help `commandIds` (trước: 38/48/18; sau: 1/1/1 = ba `*.help.open`)
- `node tests/run-tests.js`

BUILD RESULT: PASS — không có bước bundle; syntax nằm trong suite.

TEST RESULTS:

- **PASS** — `node tests/run-tests.js`: **1056/1056**, 0 FAIL, **70.16 giây** (< 90s). Baseline lúc tách `main` là 1053/1053; +3 test Batch 2 Help.
- Help Writer / Sheet / Slides (định dạng, không duplicate id, search, F1) vẫn PASS.
- Test mới xác nhận id bài Batch 2, `commandIds` thành viên, và `ribbon.tab`/`group` đúng UI.

KNOWN FAILURES: Không có.

---

## Risks

- Help mô tả hành vi **hiện có** (Writer shape/diagram/chart không mở picker; Slides «Hộp văn bản» Batch 1; sparkline cần ô số; tập dượt không auto-advance F5). Nếu tính năng nối dialog sau này, bài Help phải cập nhật.
- `sheet.formula.basic` (Batch 1) đã nhắc danh mục hàm và Ctrl+Shift+Enter trong `steps` nhưng **không** gắn `commandIds` — Batch 2 mới gắn vào bài riêng, không sửa bài cũ.
- Name Manager không có Ctrl+F3 dù một HANDOFF cũ ghi vậy.

DEPENDENCIES/BLOCKERS: Không có. Không Core patch.

CORE PATCH ID (if any): Không có.

---

## Next action

1. Reviewer đọc nhánh `feature/retroactive-help-batch2` — **không merge vào main** cho đến khi người phụ trách duyệt.
2. Batch 3: không bắt buộc cho coverage lệnh. Có thể rà soát chất lượng (F1 ngữ cảnh theo lệnh đang focus, ảnh minh họa) hoặc nối dialog Hình khối/Sơ đồ/Biểu đồ Writer (đó là task tính năng, không phải Help).
3. Có thể thêm assertion «mọi command trừ help.open phải thuộc 1 entry» vì coverage đã đủ — không làm trong batch này để giữ phạm vi chỉ thêm assertion bài mới.
