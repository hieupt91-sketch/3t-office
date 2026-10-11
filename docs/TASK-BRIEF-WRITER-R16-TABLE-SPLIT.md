# Brief R16 (opencode) — Đo lớp "bảng trải nhiều trang" và "keepNext" cho W24 (cắt trang trong bảng / giữ với đoạn sau). CHỈ ĐO

Canvas coi bảng là một khối nguyên tử: bảng cao hơn phần còn lại của trang bị đẩy sang trang mới rồi tràn qua nhiều
trang mà không có ngắt (d01: bảng 10022px ≈ 9 trang, canvas đếm 1 trang → lệch 232 đoạn; d09 bảng 2208px; d04, d12,
d20). Word cắt bảng theo HÀNG (và lặp hàng tiêu đề `w:tblHeader`, không cắt hàng có `w:cantSplit`).

Worktree `E:\VNOffice-opencode-writer-r16` (branch `audit/writer-r16`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
`_out/` có sẵn `*.word.jsonl` (Word: mọi đoạn kể cả trong bảng `tbl=true`, có `page`, `y`) và `*.canvas.jsonl` (khối
`TABLE` có `top`, `h`, `page`).

## Script `scripts/layout-audit/_table_split_class.py <wt> <docdir> <outdir>`

1. OOXML: với mỗi `w:tbl` cấp 1 trong body: số hàng, số hàng có `w:tblHeader`, số hàng `w:cantSplit`, có bảng lồng
   không, `w:tblpPr` (bảng nổi) không.
2. Word cache: đoạn `tbl=true` theo thứ tự → gán vào bảng thứ k (theo thứ tự xuất hiện; đoạn của bảng lồng tính vào
   bảng cha); mỗi bảng: trang đầu → trang cuối (số trang Word bảng trải), y đầu/cuối.
3. Canvas cache: khối `TABLE` thứ k: `h` px, `page`; số trang canvas mà chiều cao đó tương đương (h / chiều cao thân
   trang, lấy thân trang từ `pageH`/`pagePad` trong dòng meta). Cột "khối sau bảng: trang canvas vs trang Word".
4. Bảng file × bảng: (hàng, tblHeader, cantSplit, lồng, nổi) × (Word trang đầu→cuối) × (canvas h, trang) × chênh
   trang sau bảng. Tổng: số bảng trải ≥ 2 trang Word; số file bị; số bảng có tblHeader (cần lặp tiêu đề).
5. keepNext/keepLines/widowControl: với mỗi điểm chuyển trang Word (đoạn cuối trang p, đoạn đầu trang p+1, thân):
   đoạn đầu trang p+1 có `keepNext` (đoạn hoặc style chain) hoặc đoạn cuối trang p có `keepNext`? Đếm số điểm chuyển
   trang mà Word đã đẩy đoạn "giữ với đoạn sau" (đoạn trước nó có keepNext và còn chỗ trống > 1 dòng ở đáy trang p:
   ước lượng từ y đoạn cuối trang p + lines × pitch so với đáy thân) → cột (file, số điểm, ví dụ 6 chữ đầu).
6. Handoff `docs/HANDOFF-WRITER-R16.md`: 2 bảng + tổng + kết luận cho W24 (bao nhiêu trang lệch do bảng, do keepNext).
   Không sửa code, không bịa số, không commit `file test`/`_out`, không tên tài liệu thật. Commit script + handoff.
