# Brief W24 (codex, sau S27) — Cắt trang TRONG bảng theo hàng (và giữ-với-đoạn-sau) trong bộ phân trang canvas — lớp `page` lớn nhất (445 đoạn / 15 file)

Đọc: `docs/HANDOFF-WRITER-R14.md`, `-R16.md` (opencode đo), `docs/QUY-UOC-DOI-CHIEU.md` (W3, W21a, W23a–c),
`_recomputeLivePagination` + `_alignPageRelativeFloats` + `_getUsablePageHeight` (`writer-adapter.js`), CSS
`.vno-page-auto-gap` (`writer.css`), Print Preview `paginateContent` (dùng chung chiều cao thân).

## Số đo (Word 2016 COM + canvas, 21/9)

- Bộ phân trang coi mỗi khối cấp 1 của `.vno-writer-body` là NGUYÊN TỬ: khối cao hơn phần còn lại → chèn
  `.vno-page-auto-gap` trước khối và `pageCount++` một lần; khối cao hơn cả trang thì tràn qua nhiều trang mà không có
  gap/số trang → mọi khối sau lệch trang. R16: **20 bảng trải ≥ 2 trang Word trong 10 file** (d01 bảng 64 hàng
  10022px ≈ 9 trang Word 1→7; d09 bảng 64 hàng 2208px Word 2→11; d04 4985px 1→5; d20 bảng 24 hàng có 23 `w:cantSplit`),
  0 bảng có `w:tblHeader`; đoạn thường bị Word cắt giữa trang hiếm (2/121 điểm chuyển trang) → **chỉ cần cắt bảng**.
- Word cắt bảng giữa hai HÀNG (hàng có `w:cantSplit` không bị cắt giữa chừng — đẩy cả hàng; hàng cao hơn trang thì
  vẫn cắt trong hàng); `w:tblHeader` lặp hàng tiêu đề đầu mỗi trang (0 file mẫu, làm sau).
- keepNext/keepLines: Word đẩy đoạn "giữ với đoạn sau" xuống trang sau khi đoạn sau không vừa (R14/R16: d13 Heading2,
  d19/d20 Heading1, d01 2 điểm). Lớp nhỏ, làm ở bước 3.

## Việc (mỗi bước 1 commit + unit test + quy ước W24a/b/c)

**W24a — cắt bảng theo hàng:** trong `_recomputeLivePagination`, khi khối là `<table>` (cấp 1, kể cả bảng có bảng
lồng: chỉ cắt theo hàng cấp 1) và `top + h − pageStartTop > availableHeightPx`: duyệt `tbody > tr` (offsetTop tương đối),
tìm hàng đầu tiên vượt đáy trang → chèn một hàng gap `<tr class="vno-page-auto-gap" data-vno-auto-page-gap="true"
contenteditable="false"><td colspan="{số cột}"></td></tr>` trước hàng đó (cao = cùng gap thân; CSS không viền/không
nền), `pageCount++`, `pageStartTop = top hàng đó`, lặp cho tới hết bảng. Hàng có `w:cantSplit` (LibreOffice HTML →
`<tr style="page-break-inside: avoid">`? — đo bằng `_writer_html_probe.py` d20) không cắt trong hàng; hàng cao hơn cả
trang: tạm chấp nhận tràn (ghi rõ). Gap hàng phải bị bỏ khi xuất (`_contentForExport` đã bỏ `[data-vno-auto-page-gap]`
— kiểm tra selector bắt cả `tr`), Undo/Redo/serialize không thấy gap (như gap thân). Print Preview dùng cùng logic.
`_canvas_para_metrics.py` (bộ đo): trang của khối sau bảng = số gap TRƯỚC nó kể cả gap trong bảng (`querySelectorAll`
toàn thân, không chỉ `body.children`) — chỉ SỬA CÁCH ĐẾM TRANG, không đổi định nghĩa kind.
Đo: d01 (Word 19 / canvas 17 → 19), d09, d04, d12, d20: `page` giảm mạnh; 24 file không lớp nào tăng.

**W24b — đoạn dài hơn phần còn lại của trang:** hiện đẩy cả đoạn. Word cắt đoạn giữa dòng (widow/orphan 2 dòng).
R14 cho thấy hiếm (2/121) → CHƯA làm; chỉ ghi số vào handoff sau W24a để quyết định.

**W24c — keepNext/keepLines:** khi đoạn P có `keepNext` (OOXML, ánh xạ thứ tự W12e → đặt `data-vno-keep-next="1"`
lúc nhập) và đoạn sau nó bị đẩy sang trang mới → đẩy P theo (lặp cho chuỗi heading). `keepLines` → không cắt trong đoạn
(đã vậy). Đo d13/d19/d20.

## Ràng buộc

`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"`. Cache Word `_out/*.word.jsonl` chép từ
`E:\VNOffice-opencode-lan-audit\_writer_out_w12a\`; xoá canvas cache trước khi đo. Không hằng số không có số đo; không
đổi định nghĩa kind; không commit `file test`/`_out`, không tên tài liệu thật, không bịa số. Gate: `node scripts/check-syntax.js`,
`node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_writer*.py"`; harness tạo mới `_new.docx`
36/0, `_new2.docx` 39/0 vẫn sạch (bảng trong kịch bản). Hết hạn mức: commit phần xong + ghi rõ.
