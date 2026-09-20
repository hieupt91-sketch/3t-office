# Brief S25 — Lỗi HIỂN THỊ của VN Sheet phát hiện bằng mắt (vòng 10, agy) — file lưu đã đúng, app vẽ sai

Nguồn: `docs/HANDOFF-VISUAL-INSPECTION-R10.md` (ảnh cắt trong `docs/screenshots/` của worktree agy — đã chép sang
`docs/screenshots/r10/` ở worktree này). Bộ đo file (`_batch_audit.py`) báo 0 lệch vì đây là lỗi RENDER trong app,
không phải lỗi file. Mẫu: `file test/lan/lan02.xlsx, lan03.xlsx, lan12.xlsx, lan26.xlsx, lan28.xlsx`.

| # | Lớp | File/vị trí | Triệu chứng | Hướng |
|---|---|---|---|---|
| L1 | **Crash render ảnh** | lan26 sheet 1, từ hàng 6 | `TypeError: Cannot read properties of undefined (reading 'c')` trong `SheetGridController.renderImages` → cả bảng dưới hàng 5 không vẽ | ảnh có `anchor` thiếu `c`/`r` (ảnh neo trang `table:shapes`? ảnh sau S16 mang `sourceId`?) — bảo vệ + tìm nguồn anchor thiếu, unit test với ảnh không anchor |
| L2 | **Header sheet khác chèn vào sheet 1** | lan12 sheet 1 hàng 1–3 | header danh mục của sheet 2 lặp `1,2,3,1,2,3` đè đầu sheet 1 | nghi print title / freeze rows theo tên sheet (`_sheet_name_equivalence_key`?) hoặc `rowHeightsBySheet`/`frozenRows` không reset khi đổi sheet; đo bằng `grid.sheetStates` sau khi mở |
| L3 | **Chữ không tràn sang ô trống bên phải** | lan02 A4/A7/A19/A20, lan28 F1 | Excel: text tràn (spill) qua ô trống kề; VN Sheet cắt cụt tại mép cột | `.vno-grid-cell.can-overflow` có sẵn — vì sao không áp: ô kề có style-only (S8 cell tồn tại với `val ""`) bị coi là "có nội dung"? Quy ước: ô kề coi là trống khi `val === ""` và không có công thức |
| L4 | **Placeholder ảnh hỏng đè chữ** | lan02 H10:H11 | checkbox (form control / WMF) thành `[Ảnh được chèn trong trang tính]` | ảnh WMF/EMF không decode được → không vẽ placeholder có chữ; ẩn hoặc vẽ khung trống đúng kích thước |
| L5 | **Sai màu nền trong app** | lan02 S2 A10:B13 (mất vàng), A1:F1 (thêm xanh lá), lan03 S1 hàng 1 (xanh → xám) | file lưu đúng (Excel bản lưu giống gốc) → app đọc `fo:background-color` sai (màu theme/indexed từ LibreOffice FODS? ô gộp lấy style ô khác? CSS `.has-content` đè?) | đo: `grid.cellsData.get("A10").style.backgroundColor` sau khi mở so với XLSX gốc (`_excel_cell_probe.ps1`) |
| L9 | **Nút AutoFilter tự bật** | lan28 sheet 1 hàng 1 | file gốc không có AutoFilter; app hiện `▼` mọi cột và cắt chữ | S22 đã sửa phía LƯU (không ghi database-range); phía MỞ `isFilterActive` vẫn true — tìm chỗ bật (dòng `visibility="filter"`/S3?) và chỉ bật khi FODS có `table:database-range` với `display-filter-buttons="true"` |

## Yêu cầu

- Mỗi lớp: sửa một chỗ trong `apps/sheet/` hoặc `adapters/libreoffice/sheet/`, unit test (`tests/unit/*.test.js`, đăng ký
  trong `tests/run-tests.js`), ghi quy ước S25a–f vào `docs/QUY-UOC-DOI-CHIEU.md`.
- Nghiệm thu: (1) mở lại 5 file trong app thật và chụp lại đúng vùng lỗi (script chụp `scripts/capture_visual_lan02.mjs`
  đã có) — dán ảnh trước/sau vào `docs/HANDOFF-SHEET-RENDER-R10.md`; (2) `python scripts/layout-audit/_batch_audit.py . lan02.xlsx lan03.xlsx lan12.xlsx lan26.xlsx lan28.xlsx`
  vẫn 0 lệch, Excel OK; (3) `node scripts/check-syntax.js`, `node tests/run-tests.js` (100%), `python -m unittest discover -s tests -p "test_sheet*.py"`.
- Không commit `file test`/ảnh tài liệu thật. Không bịa số. Commit `git commit -F` tiếng Việt không dấu.
