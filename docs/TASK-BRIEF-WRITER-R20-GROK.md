# TASK BRIEF — Writer R20 (Grok): hồi quy d09 (mở) và d20 (lưu) sau commit e451972

Worktree: `E:\VNOffice-grok-writer-r20` (nhánh `fix/writer-r20-grok`, tách từ `main` @ e451972). Làm việc **chỉ trong worktree này**.
Người điều phối (Claude) sẽ kiểm chứng độc lập bằng Word 2016 COM và merge. Báo cáo sai sự thật sẽ bị phát hiện — chỉ ghi số đã đo.

## Bối cảnh
Commit e451972 (W44 viền ô chỉ tô, W44b hàng = nội dung + viền thật, W45 tắt kerning, W46 tỉ lệ chữ `w:w` → letter-spacing,
W24c hàng bảng tràn trang, W30c `table-layout: fixed`) làm giảm lệch chung (d01 page 155 → 21, d20 canvas 3 = Word) nhưng
gây **2 hồi quy** khi chạy lại toàn bộ 23 file (`E:\VNOffice-opencode-lan-audit\_writer_out_w46i` và `_writer_out_w46s`):

| File | Lớp | Trước (w43) | Sau (w46) | Word |
|---|---|---:|---:|---:|
| d09.docx | mở: số đoạn lệch trang (`page`) | 17 | **54** | 14 trang (canvas 14 = Word cả hai lần) |
| d20.docx | lưu: số trang Word của file đã lưu | 3 | **4** | 3 |

Nhiệm vụ: tìm **nguyên nhân gốc theo lớp** (không vá theo file), sửa **một chỗ**, chứng minh bằng số đo trước/sau, không làm xấu file khác.

## Tài liệu bắt buộc đọc trước
- `docs/QUY-UOC-DOI-CHIEU.md` — các quy ước W01…W46 đã khóa (đặc biệt W24c, W30c, W44, W44b, W45, W46). Không được phá quy ước cũ; nếu phải sửa một quy ước thì ghi rõ lý do + số đo.
- `docs/HANDOFF-WRITER-R19.md` — phương pháp đo và các bẫy đã gặp.
- `docs/TASK-QUEUE.md` — trạng thái chung.

## Công cụ đo (chạy từ gốc worktree, PowerShell 5.1)
Luôn cô lập profile trước khi chạy app/soffice để không đụng phiên khác:
```
$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"
```
1. **Ma trận mở (import)** — so từng đoạn giữa Word COM và canvas app:
   ```
   $out = "E:\VNOffice-opencode-lan-audit\_writer_out_r20_<tag>"
   New-Item -ItemType Directory -Force $out | Out-Null
   Copy-Item "E:\VNOffice-opencode-lan-audit\_writer_out_r20_base\*.word.jsonl" $out -Force   # cache Word, không đo lại
   python scripts/layout-audit/_writer_layout_audit.py . "file test\landocx" $out d09.docx
   ```
   Kết quả: `$out\_writer_layout_matrix.md` (cột `page`, `wrap`, `line-height`, …) và `$out\d09.pairs.jsonl`.
   Muốn đo lại canvas sau khi sửa code: xóa `$out\d09.canvas.jsonl` rồi chạy lại.
   Tìm điểm lệch trang đầu tiên: `python scripts/layout-audit/_page_divergence.py $out d09 --drift`.
   Baseline để so: `E:\VNOffice-opencode-lan-audit\_writer_out_r20_base\d09.canvas.w43i.jsonl` (trước e451972) và `d09.canvas.jsonl` (sau).
2. **Lưu rồi mở bằng Word** — mở app, sửa (đậm + "ZZ"), lưu, đếm trang Word của file đã lưu:
   ```
   python scripts/layout-audit/_batch_writer.py . "file test\landocx" $out d20.docx
   ```
   Kết quả: `$out\_batch_writer_report.md`, file đã lưu `$out\_rt_d20.docx`. Đếm trang Word trực tiếp:
   `powershell -NoProfile -File scripts/layout-audit/_word_oracle3.ps1 -File <docx>` (in `pages=N`).
   Baseline: `_writer_out_r20_base\_rt_d20.w43.docx` (3 trang, trước) và `_rt_d20.w46.docx` (4 trang, sau) — **so sánh XML hai file này**
   (`word/document.xml`, `styles.xml`, `settings.xml`) để thấy khác biệt do W44/W46 sinh ra khi xuất; đó là điểm bắt đầu nhanh nhất.
3. Kiểm tra XML docx: `python scripts/layout-audit/_xlsx_parts_lint.py` không dùng cho Writer; dùng `python -c "import zipfile..."` tự viết trong scratch.
4. Test đơn vị (bắt buộc pass trước khi commit): `node tests/run-tests.js` và `python -m unittest discover -s tests -p "test_*.py"`.

## Gợi ý điểm nghi ngờ (kiểm chứng, đừng tin)
- d20 lưu 4 trang: W44 khôi phục viền bảng khi xuất (`_restoreTableBordersForExport`, `_restoreLibreOfficeTableWidthsForExport` trong
  `adapters/libreoffice/writer/writer-adapter.js`) hoặc W46 `_stripCharacterScaleForExport` để sót `letter-spacing`/`--vno-char-scale`
  hoặc W30c inline `style="width: Npx"` làm LibreOffice xuất `w:tblW`/`w:tcW` khác nguồn. So `_rt_d20.w43.docx` với `_rt_d20.w46.docx` để chốt.
- d09 mở: W24c (`_recomputeLivePagination` tràn hàng bảng, `_rowLineHeightPx`, `pendingSpillGap`) hoặc W44b (padding ô = viền thật) thay đổi
  chiều cao bảng → đoạn sau bảng trượt trang. Dùng `_page_divergence.py --drift` để xem đoạn đầu tiên lệch và lệch bao nhiêu px.

## Luật cứng
- **Không** commit/copy tài liệu thật (`file test/` đã gitignore; đừng thêm file đuôi .docx/.pdf/.htm vào repo). Không ghi tên tài liệu thật hay tên sheet vào docs — chỉ mã `dNN`.
- **Không** đổi định nghĩa lớp lỗi trong `_writer_layout_audit.py` / `_page_divergence.py` (để số trước/sau so được).
- **Không** đụng code Sheet (`adapters/libreoffice/sheet/*`, phần S30/S31 trong `ooxml_zip_patch.py`) — người khác đang sửa.
- Không chạy `scripts/layout-audit/_excel_open_test.ps1` (giết Excel của phiên khác). Word COM dùng thoải mái.
- Mỗi lần sửa phải chạy lại **cả** d09 (mở) và d20 (lưu) + ít nhất d01, d13, d16, d21 (mở) để chắc không hồi quy; ghi số vào handoff.
- Commit trên nhánh `fix/writer-r20-grok`, tiền tố `fix(writer): W47 …` (mô tả quy tắc đã đo, số trước → sau). Không rebase/force.

## Bàn giao (bắt buộc)
Viết `docs/HANDOFF-WRITER-R20.md` gồm: nguyên nhân gốc từng hồi quy (kèm bằng chứng: đoạn/px/XML), chỗ sửa, bảng số trước/sau
(d09 page, d20 saved pages, các file kiểm tra chéo), dòng quy ước mới đề xuất cho `docs/QUY-UOC-DOI-CHIEU.md` (mã W47/W48…), việc còn lại.
Nếu không sửa được trong ~90 phút, vẫn viết handoff với những gì đã đo được (đoạn lệch đầu tiên, diff XML) — đó vẫn là kết quả có ích.
