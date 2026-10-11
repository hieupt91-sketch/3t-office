# Brief W29 (opencode) — L13 placeholder header/footer chiếm chỗ & đè chữ; L12 đệm ô bảng làm d20 5 trang thay vì 3

Nguồn: `docs/HANDOFF-VISUAL-INSPECTION-R11.md` (agy V11): L13 — VN Writer vẽ chuỗi placeholder *"Nhấp để nhập tiêu đề
đầu trang (Header)…"* trong vùng header rỗng của tài liệu nhập: d02 chữ placeholder đè lên Quốc hiệu (trang 1),
d11/d16 placeholder chiếm chỗ đẩy trôi trang. L12 — d20 (Word 3 trang) canvas 5 trang: đệm trên/dưới ô bảng và chiều
cao hàng lớn hơn Word tích luỹ qua nhiều bảng.

Worktree `E:\VNOffice-opencode-writer-w29` (branch `fix/writer-w29`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu `E:\VN OFice\file test\landocx`. Cache Word `_out/*.word.jsonl` chép sẵn; đo bằng `_writer_layout_audit.py`.

## W29a — L13 placeholder (đo trước)

1. Tìm nơi vẽ placeholder (`apps/writer/writer.css` `::before`/`:empty`? hay JS chèn text) và điều kiện hiện.
2. Quy tắc Word: vùng header/footer rỗng KHÔNG chiếm chỗ (thân bắt đầu tại lề trên); gợi ý chỉ hiện khi người dùng
   đang sửa header (focus/hover) hoặc dạng chữ mờ tuyệt đối không ảnh hưởng layout. Sửa: placeholder là `::before` với
   `position: absolute` (không tạo chiều cao) và chỉ hiện khi `.vno-writer-header:focus-within`/hover; `min-height` của
   zone rỗng = 0 (W23a đã đặt `:empty { min-height: 26px }` — xem lại: 26px này có đẩy thân không? `_getUsablePageHeight`
   dùng `innerText.trim()` nên zone rỗng không tính; nhưng nếu zone chứa placeholder text thật (JS) thì bị tính là "có
   nội dung" → đẩy thân — đo `headerH`/`bodyTop` của d02/d11/d16 trước/sau).
3. Đo: d02/d11/d16 `bodyTop` = lề trên (Word: d02 bodyTop 70,5pt? — lấy từ cache Word `firstBodyY`), số trang canvas d11
   6 → 5, d16 9 → 8 (Word), ma trận 24 file `page` giảm, không lớp nào tăng. Unit test (writer.css rule hoặc JS).

## W29b — L12 đệm ô bảng (đo trước, có thể chỉ ra lớp cho codex)

1. d20: Word COM `Tables(i).Rows(j).Height`, `.HeightRule`, `Cell.TopPadding/BottomPadding` (`Table.TopPadding`),
   `Range.ParagraphFormat.SpaceBefore/After` của đoạn trong ô, vs canvas `td` padding/line-height/`p` margin (dump DOM
   qua `_canvas_para_metrics.py`-style eval). OOXML: `w:tblCellMar`, `w:tcMar`, `w:trHeight`, đoạn trong ô có
   `w:spacing` (docDefaults `after=160`? Word áp cả trong ô); LibreOffice HTML ghi `<td style="padding…">`, `<p style="margin…">`?
2. Xác định 1 nguyên nhân chung (vd: LibreOffice không ghi `margin-bottom: 0` cho đoạn trong ô có `contextualSpacing`
   hay `w:spacing after=0` → canvas thêm 8px/đoạn; hoặc `td { padding: 5px }` CSS mặc định của app) → sửa 1 chỗ + test +
   quy ước W29b. Nếu sửa vượt tầm (cần bộ phân trang), ghi số đo đầy đủ vào handoff để codex W24 tiếp.
3. Đo: d20 canvas 5 → 3 trang, `_writer_layout_audit.py` d20 `drift:table`/`page` giảm; 24 file không lớp nào tăng.

## Ràng buộc

Không đổi định nghĩa kind, không hằng số không có số đo, không bịa. Gate: `node scripts/check-syntax.js`,
`node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_writer*.py"`; harness tạo mới 36/0, 39/0 vẫn
sạch (header/footer tạo mới vẫn nhập được). Không commit `file test`/`_out`, không tên tài liệu thật. Handoff
`docs/HANDOFF-WRITER-W29.md`. Commit `git commit -F`, tiếng Việt không dấu.
