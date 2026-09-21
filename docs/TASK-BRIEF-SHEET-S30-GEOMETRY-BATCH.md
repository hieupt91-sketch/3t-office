# Brief S30-batch (opencode) — Đo hình học render Sheet toàn bộ mẫu lan sau S30a/S30b. CHỈ ĐO, không sửa code

S30a/S30b (`docs/QUY-UOC-DOI-CHIEU.md`) sửa chiều cao hàng tự động theo quy tắc Excel; mới đo lan02/03/05/10/12/16.
Cần ma trận cho TẤT CẢ workbook để tìm lớp lệch còn lại (row/lines/fit/textwidth) và bằng chứng cho S31.

Worktree `E:\VNOffice-opencode-sheet-s30` (branch `audit/sheet-s30-geometry`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu `E:\VN OFice\file test\lan\lanNN.xlsx` (bỏ lan06, lan14: mở > 15 phút). Kết quả ghi vào
`E:\VNOffice-opencode-lan-audit\_geom_batch\` (ngoài repo).

## Chạy

```
python scripts/layout-audit/_sheet_geometry_audit.py . "file test\lan\lanNN.xlsx" E:\VNOffice-opencode-lan-audit\_geom_batch --max-sheets 4 --max-rows 300 --textwidth
```
Mỗi file một lệnh, tuần tự (Excel COM + app thật). Đọc `lanNN.geom.md` (tóm tắt) và `lanNN.geomcmp.json` (chi tiết).

## Handoff `docs/HANDOFF-SHEET-S30-GEOMETRY.md`

1. Ma trận file × sheet: `col`, `row` (tách custom/auto/norow theo cột `[...]` của dòng `row`), `lines`, `fit`,
   `textwidth median`, giây chạy. Dòng TOTAL.
2. Mọi dòng `row … excel X app Y [auto|custom|norow ht=…]` còn lệch: liệt kê đủ (file, sheet, hàng, Excel px, app px,
   loại, ht). Nhóm theo LỚP: (a) auto có ô bọc chữ (số dòng khác — ghi cả số dòng app/Excel nếu có), (b) auto không
   bọc chữ (font nào — lấy `font/size/bold` trong geomcmp.json của các ô hàng đó), (c) custom, (d) norow, (e) hàng ẩn.
3. `textwidth`: bảng font/cỡ/đậm → median tỉ lệ (gộp mọi file, n ≥ 5), để lập bảng hệ số S31.
4. `fit` (ô không bọc chữ nhưng app xuống dòng): liệt kê coord + text 30 ký tự + có richText không.
5. Không bịa số; không sửa code sản phẩm; không commit `file test`/`_geom_batch`; không tên tài liệu thật (chỉ lanNN, sheet
   số thứ tự sN). Commit md (`git commit -F`, tiếng Việt không dấu). Nếu một file lỗi/treo > 10 phút: ghi "timeout" và
   chạy tiếp file sau.
