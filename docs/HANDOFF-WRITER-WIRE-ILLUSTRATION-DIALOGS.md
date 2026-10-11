# Handoff: Wire Writer illustration dialogs (Hình khối / Sơ đồ / Biểu đồ)

## Scope and branch

- Worktree: `E:\VNOffice-grok-writer-illustration-dialogs`
- Branch: `fix/writer-wire-illustration-dialogs`, created from `main` at `92ec9c2` (1056/1056 PASS at branch point)
- **Not merged into `main`**
- Changed only Writer adapter, Writer illustrations module (small), Writer Help, related tests, and this handoff. No Sheet/Slides source was changed.

The repository does not contain `/09-templates/AGENT-HANDOFF.md`; this handoff follows the structure used by existing Writer handoff documents.

## Objective

Nối lệnh ribbon Chèn → Minh họa với hộp thoại chọn đã có sẵn. Trước đây `showShapeDialog` / `showDiagramDialog` / `showChartDialog` được import trong `writer-adapter.js` nhưng không bao giờ được gọi; bấm nút luôn chèn mặc định (chữ nhật 140×80 #2563eb; sơ đồ Process 4 bước; biểu đồ cột «Không có dữ liệu»).

## Current capability (after this task)

- `writer.shape.insert` mở hộp «Chèn hình khối», người dùng chọn một trong `SHAPE_TYPES` (chữ nhật, bo tròn, tròn, mũi tên, đường thẳng), rồi `insertShape(kết quả)`.
- `writer.diagram.insert` mở hộp «Chèn sơ đồ SmartArt» (`DIAGRAM_TYPES` + số bước 3–6), rồi `insertDiagram(kết quả)`.
- `writer.chart.insert` mở hộp «Chèn biểu đồ minh họa» (kiểu, tiêu đề, nhãn/giá trị, xem trước SVG), rồi `insertChart(kết quả)`.
- Hủy / × / Esc / bấm ra ngoài: Promise `null` → **không chèn**.
- API trực tiếp `insertShape` / `insertDiagram` / `insertChart` (và command có `type`/`shapeType`/`diagramType`/`chartType` tường minh) vẫn chèn không mở dialog — dùng cho test và chèn lập trình.
- Undo/Redo vẫn dùng snapshot Writer hiện có (`shapes` + HTML body).
- Help `writer.insert.illustrationsExtra` mô tả hành vi mới (có hộp thoại), không còn câu «chèn ngay, không mở dialog».

## Architecture

Pattern tham khảo (không import code Slides — AGENTS.md mục 4):

- Slides: `insertChart` gọi `showSlidesChartDialog()` khi chưa có lựa chọn; `showDiagramDialog()` gọi `insertDiagram(selectedType, count)` khi bấm Chèn.
- Writer WordArt đã làm tương tự: `insertWordArt` mở dialog trừ khi `text`/`presetId` đã có.

Writer giữ dialog riêng trong `apps/writer/writer-illustrations.js`. Adapter bọc command:

```
ribbon / CommandBus / handleDispatch
  → insertShapeFromCommand / insertDiagramFromCommand / insertChartFromCommand
      → show*Dialog() nếu chưa có type tường minh
      → null nếu hủy
      → insertShape / insertDiagram / insertChart (ghi snapshot)
```

UI không gọi LibreOffice internals. Không Core patch, không dependency mới, không thư viện trả phí.

## Files / modules

| File | Change |
|---|---|
| `adapters/libreoffice/writer/writer-adapter.js` | `bindHandler` + `handleDispatch` gọi `insert*FromCommand`; `insertShape` lấy `defaultW/H` từ `SHAPE_TYPES` |
| `apps/writer/writer-illustrations.js` | Dialog không chạy trên DOM giả thiếu `querySelector`; `generateDiagramHtml` tôn trọng `count` 3–6 |
| `platform/help/entries-writer.js` | Cập nhật bài `writer.insert.illustrationsExtra` |
| `tests/unit/writer-help.test.js` | Từ chối nội dung Help cũ «không mở hộp thoại» |
| `tests/unit/writer-illustration-dialogs.test.js` | Unit: hủy không chèn; circle / cycle 5 / pie; Undo/Redo |
| `tests/live/writer-illustration-dialogs.playwright.mjs` | Live click ribbon → dialog → canvas |
| `tests/run-tests.js` | Suite 101 |
| `docs/HANDOFF-WRITER-WIRE-ILLUSTRATION-DIALOGS.md` | Handoff này |

## Dependency

Không dependency mới. Playwright live dùng `playwright-core` local sẵn có (`VNO_PLAYWRIGHT_ROOT` hoặc `C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools`) và Microsoft Edge.

## Risk

- Command có `args.type` tường minh bỏ qua dialog — đúng cho test/API; ribbon click truyền `null` nên luôn mở hộp.
- `generateDiagramHtml` trước đây chỉ có 4 nhãn mặc định dù dialog cho 3–6 bước; đã sinh `Bước N` theo `count`. Test ribbon-breadth vẫn truyền `nodes` tường minh.
- Dialog guard từ chối mock DOM thiếu `querySelectorAll` (leak từ suite trước) để không ném / không treo unit test.

## Test plan / evidence

- `node tests/run-tests.js`: **PASS — 1064/1064**, 0 FAIL. Wall time **69.94 s** (dưới 90 s).
- Suite 101: 8/8 PASS (hủy không chèn; circle không phải rectangle; cycle 5 bước; pie có dữ liệu; Undo/Redo).
- Help Batch 2: bài `writer.insert.illustrationsExtra` PASS với nội dung dialog mới; test từ chối câu «Nhấn là chèn ngay, không hộp thoại».
- `node tests/live/writer-illustration-dialogs.playwright.mjs`: **PASS**. Click thật (không SendKeys): Hủy Hình khối không chèn; chọn circle → `data-shape-type="circle"` + SVG ellipse; chọn Chu trình 5 bước; chọn pie tiêu đề «Doanh thu»; Ctrl+Z/Ctrl+Y biểu đồ.

Không claim PASS cho mục chưa chạy.

## Rollback

Trên branch này: `git revert` các commit feat/test/docs, hoặc bỏ worktree:

```
git worktree remove "E:\VNOffice-grok-writer-illustration-dialogs"
git branch -D fix/writer-wire-illustration-dialogs
```

Không đụng `main`.

## Commits

- `ad9575b` — `feat(writer): open illustration dialogs before insert`
- `cd66a00` — `test(writer): verify illustration dialogs insert the chosen type`
- (this file) — `docs(writer): handoff wire illustration dialogs`

## Review notes

- Xác nhận live: tab Chèn → Minh họa → từng nút mở đúng hộp Writer (không hộp Slides).
- Nếu sau này cần gallery Word-like (kéo thả shape từ dải), đó là task UI riêng; task này chỉ nối dialog đã có.
- Help Batch 2 từng ghi đúng bug «dialog tồn tại nhưng không gọi»; sau task này Help đã cập nhật theo nguyên tắc «code đổi thì Help đổi».
