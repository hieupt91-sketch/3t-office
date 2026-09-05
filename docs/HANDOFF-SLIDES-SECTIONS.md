# Agent Handoff

TASK: VN Slides — PowerPoint-style Sections (nhóm trang chiếu liên tiếp)
AGENT/ROLE: Grok / Slides implementation and verification
BRANCH: `feature/slides-sections`
WORKTREE: `E:\VNOffice-grok-slides-sections`
BASE: `main` @ `94119c8` (Consolidate merged, 1081/1081 PASS)
OBJECTIVE: Thêm Sections kiểu PowerPoint — nhóm slide liên tiếp thành phần có tên, lệnh ribbon Home > Trang chiếu, thanh tiêu đề + thu gọn/mở rộng trên dải thumbnail và Slide Sorter, move cả nhóm, Undo/Redo. Không merge vào main.

## FINDINGS (đọc trước khi thiết kế — bắt buộc)

### Xác nhận: đây KHÔNG phải vấn đề vị trí/discoverability

`docs/PLAN-RIBBON-GAPS-ROUND3.md` ghi chú Low: “Sections were built in an earlier task per project history but may not be exposed at this specific location” — **phỏng đoán sai**.

Đã grep lại `platform/commands/command-definitions.js` trên `main` trước khi code:

- **Không có** lệnh `slides.section.*` nào.
- Chỉ có `writer.section.nextPage` / `continuous` / `evenPage` / `oddPage` — đó là ngắt mục trang của Writer, không liên quan.

Vậy từ góc command/ribbon/Help, **Sections của Slides hoàn toàn chưa có**, không phải “đã có nhưng đặt nhầm chỗ”.

### Cấu trúc render panel hiện có (đọc trước khi thêm nhóm)

- Model: `SlidesCanvasController.slides[]` — mỗi phần tử là một trang (title/body/layout/shapes/…).
- Dải thumbnail trái: `mount()` tạo `.vno-slide-navigator` + `slideListContainer`; `_renderThumbnails()` lặp `slides.forEach` và append `.vno-slide-thumb-item` (số thứ tự + thẻ xem trước). Kéo-thả gọi `moveSlide`. **Không có thanh nhóm.**
- Slide Sorter: overlay `.vno-slide-sorter-overlay` / grid `.vno-slide-sorter-grid`; `_renderSlideSorterGrid()` append `.vno-slide-sorter-item`.
- Undo: `undoStack` / `redoStack` trên canvas, `common.edit.undo`/`redo`.

Trên canvas còn **mảnh** từ task Codex trước (`this.sections = [{id, name}]` + `slide.sectionId`, `addSection`/`renameSection`/`removeSection`, divider Sorter, menu chuột phải). **Không** có: lệnh `slides.section.*`, ribbon Home, collapse/expand, move cả nhóm, header thumbnail, Undo cho add/rename/remove. Không rewrite model — reuse catalogue + `sectionId` (tương đương `{id, name, startSlideIndex}`) rồi bổ sung đủ phạm vi task.

## IMPLEMENTATION SUMMARY

- Model tương đương: `presentation.sections[] = [{id, name, startSlideIndex}]` + `slide.sectionId`. Mỗi phần là biên bắt đầu; phần kế (hoặc hết slide) là biên kết thúc. `startSlideIndex` được refresh sau mọi thay đổi.
- `slides.section.add` — Home > Trang chiếu > dropdown **Phần**, cạnh Trang mới / Bố cục / Nhân đôi / Xóa trang. Dialog tên mặc định `Phần 1`, `Phần 2`, … (EN: `Section N`). Phần bắt đầu từ slide đang chọn, chạy tới biên phần kế.
- `slides.section.rename` / `remove` (bỏ nhóm, **không** xóa slide) / `moveUp` / `moveDown` (đổi chỗ cả khối, giữ thứ tự trong nhóm).
- Thumbnail trái và Slide Sorter: thanh tiêu đề (tên + số trang) trước nhóm; nút ▾/▸ thu gọn/mở rộng — thu gọn ẩn thumbnail trong nhóm, giữ thanh tiêu đề.
- Undo/Redo: action `section-state` trên stack hiện có (không stack riêng). Collapse chỉ là trạng thái xem.
- Help mới `slides.section.groups` (tiếng Việt, khớp UI).
- FODP: giữ `vno:section-id` / `vno:section-name` trên `<draw:page>` như mảnh trước (round-trip adapter; soffice vẫn có thể strip — hạn chế đã đo ở task trước).

## FILES CHANGED

- `apps/slides/slides-canvas.js` — helper range/start, add/rename/remove/move, collapse, header thumbnail + sorter, undo `section-state`
- `apps/slides/slides-ribbon.js` — dropdown Phần trên Home > Trang chiếu
- `apps/slides/slides.css` — header thumbnail, nút thu gọn, focus-visible
- `adapters/libreoffice/slides/slides-adapter.js` — bindHandler + handleDispatch 5 lệnh
- `platform/commands/command-definitions.js` — chỉ thêm `slides.section.*`
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js` — `slideSection`, `slideSectionUp`, `slideSectionDown`
- `platform/help/entries-slides.js` — entry mới
- `tests/unit/slides-sections.test.js` (mới)
- `tests/unit/slides-sorter-view.test.js`, `tests/unit/slides-help.test.js`, `tests/unit/a11y-audit-new-features.test.js`
- `tests/live/slides-sections.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-SLIDES-SECTIONS.md` — tài liệu này

Không đụng Writer/Sheet source.

## COMMANDS RUN

- `node --check` các file JS mới/sửa
- `node tests/run-tests.js` — **1092/1092 PASS, 0 FAIL**, ~70.0s (< 90s)
- `node tests/live/slides-sections.playwright.mjs` — **PASS** (Edge, không SendKeys)

## TEST RESULTS

- PASS — `node tests/run-tests.js`: **1092/1092 PASS | 0 FAIL** (~70.02s)
- PASS — unit 6 slide: phần 1 = trang 1–3, phần 2 = trang 4–6; rename; remove giữ slide; moveDown đổi thành 4-5-6 rồi 1-2-3 (thứ tự trong nhóm nguyên); collapse ẩn đúng 3 thumbnail index 0–2, expand hiện lại; Undo/Redo rename/remove/move
- PASS — live Playwright: ribbon Home > Phần > Thêm phần (2 lần), DOM thumbnail collapse/expand bằng click thật, Sorter collapse/expand, ribbon Chuyển phần xuống đổi thứ tự slide thật. Zero pageerror

## KNOWN FAILURES

None in this task’s scope.

Hạn chế FODP/soffice (không đổi trong task này): LibreOffice re-serialize có thể strip `vno:section-*`. Save/Open nội bộ qua `serializeToFodp`/`parseFodp` vẫn giữ.

## RISKS

- Sections phẳng, không lồng nhau — giống PowerPoint.
- `addSection` giữa một phần sẽ tách phần tại slide đang chọn; phần cũ rỗng bị prune.
- Collapse không vào Undo (cố ý — trạng thái xem).

## DEPENDENCIES/BLOCKERS

None. Không thư viện trả phí, không Core patch.

## NEXT ACTION

Sẵn sàng review. **Không merge vào `main`.**
