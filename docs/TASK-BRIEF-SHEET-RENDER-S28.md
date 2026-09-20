# Brief S28 (agy) — Render VN Sheet vòng 12: L2 header sheet khác chèn vào sheet, L5 màu nền do định dạng có điều kiện/theme, L3 chữ bị cắt, L10 ảnh tràn cột, L11 khuyết banner

Nguồn: `docs/HANDOFF-VISUAL-INSPECTION-R11.md` (agy V11, có ảnh cắt ngoài git ở `docs/screenshots/r11/`),
`docs/HANDOFF-SHEET-RENDER-R10.md` (opencode S25: L2 "skipSave", L3 "ô có công thức chặn tràn", L5 kết luận "nguồn không có
vàng" — SAI vì Excel vẽ vàng qua định dạng có điều kiện). Quy ước: `docs/QUY-UOC-DOI-CHIEU.md` S8–S27.

Worktree `E:\VNOffice-agy-sheet-s28` (branch `fix/sheet-render-s28`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"`.
Mẫu `file test/lan/lanNN.xlsx` (chép sẵn). Trọng tài màu: `powershell -File scripts/layout-audit/_excel_cell_probe.ps1 -File x.xlsx -Sheet N -Cells A10,B13`
— mở rộng script để in thêm `DisplayFormat.Interior.Color` và `DisplayFormat.Font.Color` (màu SAU định dạng có điều kiện,
Excel 2010+), cạnh `Interior.Color` (màu tĩnh). Chụp VN Sheet như R11 (`scripts/visual/capture_r11.mjs`).

## Lớp và cách đo (mỗi lớp: đo → 1 chỗ sửa → unit test → quy ước S28a… → đo lại → commit riêng)

| # | Lớp | Đo trước khi sửa | Nghi vấn tầng | Nghiệm thu |
|---|---|---|---|---|
| S28a | **L5 nền/chữ theo định dạng có điều kiện** (lan02 s2 A10:B13 vàng; lan03 s1 hàng 1 xanh `#2563eb`?) | `_excel_cell_probe` mở rộng: `Interior.Color` vs `DisplayFormat.Interior.Color`; `FormatConditions.Count` của vùng, `.Type`, `.Formula1`, `.Interior.Color`; FODS: `<calcext:conditional-formats>`/`<table:conditional-format>` có được Calc xuất không, app có parse (`sheet-adapter.js` conditional) và render không | FODS→app: CF rule parse/evaluate/render | ảnh VN Sheet vùng đó = màu `DisplayFormat`; auditor 0 lệch; lan02/lan03 0 lệch |
| S28b | **L2 header sheet khác chèn vào hàng 1–3** (lan12 s1 nhận header s2; lan16 s4 nhận header s2) | mở app lan12, dump `grid.cellsData` sheet 1 hàng 1–3 vs FODS sheet 1 hàng 1–3 vs Excel `Range("A1:F3").Value2` → tầng nào sinh dư: FODS (Calc ghi?) / `loadFromFods` (trộn `sheetsData`?) / `switchSheet` (S25f chưa đủ) / `_restore…` overlay theo tên sheet trùng? (kiểm tra tên sheet lặp/khoảng trắng — S22 "sheet-name equivalence") | app | hàng 1–3 sheet 1 đúng Excel; lan12/lan16 mọi sheet đúng; auditor 0 lệch |
| S28c | **L3 chữ cột A bị cắt** (lan02 s1 A4/A7/A19: ô kề B trống nhưng không tràn) | dump ô A4 và B4: `val`, `formula`, style `whiteSpace`/`overflow`, class `can-overflow`; kiểm tra S25c có nhầm ô kề "trống" (chuỗi rỗng `""` sau S13?) | render `_renderCellVisual` | chữ tràn sang B như Excel; ô B có chữ thì cắt |
| S28d | **L10 ảnh tràn cột đè chữ** (lan10 s2 A10:A30) | so `xdr:from/to` + `ext cx/cy` (drawing1.xml) với khung `.vno-sheet-image` (left/top/width/height px) và bề rộng cột A px (MDW S11); Excel: `Shapes(i).Left/Top/Width/Height` pt | `renderImages` (S25a anchor/offset) hoặc bề rộng cột | khung ảnh = Excel ±2px |
| S28e | **L11 khuyết banner sheet 2 lan16** (s1/s3 có, s2 không) | drawing2.xml: `xdr:pic`/`xdr:sp`/nhóm/`r:link`? FODS s2 có `draw:frame`? `imagesBySheet` s2 | Calc không nhập (S16 passthrough chỉ lo lưu) hay app bỏ | banner hiện như Excel (nếu là ảnh nhúng); nếu là shape/WordArt: ghi rõ loại, không bịa |

## Ràng buộc

Không đổi định nghĩa auditor, không đổi mặc định toàn cục, không bịa số (mọi màu/toạ độ từ Excel COM và dump app).
Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_sheet*.py"`;
`_batch_audit.py` lan02 lan03 lan10 lan12 lan16 lan28 → 0 lệch, Excel OK, lint sạch; kịch bản tạo mới 1/2 vẫn 40/0, 63/0.
Không commit `file test`/ảnh/`_rt_*`, không tên tài liệu thật. Handoff `docs/HANDOFF-SHEET-RENDER-S28.md` (ảnh trước/sau
ngoài git, số đo COM). Commit `git commit -F`, tiếng Việt không dấu.
