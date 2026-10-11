# TASK BRIEF — Sheet S29 hiệu năng, vòng 2 (Codex): về ≤ 60 giây tổng (Python + JS) cho lan06/lan14

Worktree: `E:\VNOffice-codex-sheet-s29` (nhánh `perf/sheet-s29-codex`, tách từ `main` @ 8ed4e29). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập (đo lại thời gian + đối chiếu `vno:xlsx-layout`/`vno:xf` với `*.geom.json` đã cache bằng Excel COM + batch lưu 0 lệch) rồi merge. Chỉ ghi số đã đo thật.
Đọc trước: `docs/HANDOFF-SHEET-S29-PERF.md` (vòng 1, Grok — nguyên nhân gốc + chỗ đã sửa), `docs/QUY-UOC-DOI-CHIEU.md` (S8, S12, S13, S16, S30, S31 — các overlay KHÔNG được đổi kết quả), `tests/test_sheet_s29_overlay_speed.py` (khoá byte-for-byte đã có, đừng phá).

## Hiện trạng sau vòng 1 (Grok, đã merge vào main)
Ba overlay lớn (`_overlay_sheet_number_formats_from_xlsx`, `_overlay_sheet_original_strings_from_xlsx`, `_overlay_sheet_xf_indices_from_xlsx`) và `optimize_fods_streaming`/`reoverlay_sheet_xf_indices` đã hết phần O(n²) do quét thẻ bằng regex/`str.find` tới cuối hàng. Kết quả đo trên máy Claude (`_time_sheet_open_stages.py`, log gốc trong `docs/HANDOFF-SHEET-S29-PERF.md`):

| Giai đoạn | lan14 sau vòng 1 | lan06 sau vòng 1 |
|---|---:|---:|
| soffice convert | 15,66 s | 14,52 s |
| layout S30/S31 | 2,62 s | 14,27 s |
| number formats | 16,87 s | 33,16 s |
| original strings | 19,84 s | 21,28 s |
| xf indices | 23,07 s | 37,69 s |
| optimize_fods_streaming | 25,03 s | 32,23 s |
| reoverlay xf | 19,91 s | 0,69 s |
| **Tổng Python** | **132,38 s** | **155,67 s** |

Còn 3 vấn đề Grok đã chỉ rõ trong "Việc còn lại": (1) ba overlay lớn + optimize + reoverlay vẫn là **5 lượt duyệt riêng** trên cùng chuỗi FODS (mỗi lượt tự dựng lại chỉ mục XLSX/quét lại toàn bộ hàng); (2) `optimize_fods_streaming` trên lan14 chưa gộp được nhiều (FODS sau optimize vẫn ~311 MB) nên `reoverlay_sheet_xf_indices` sau đó vẫn tốn ~20 s; (3) **phần JS chưa đo** (`sheet-adapter.js` parse FODS + dựng lưới, `sheet-grid.js` render) — có thể là phần lớn thời gian còn lại khi mở trong app thật (không chỉ pipeline Python).

## Mục tiêu
1. Đo phần JS thật (mở lan14/lan06 trong app qua `main.py`, `performance.now()` quanh: parse FODS trong `sheet-adapter.js` (`loadFromFods`/tương đương), dựng DOM lưới trong `sheet-grid.js`, layout đầu tiên). Ghi bảng thời gian JS trước khi sửa gì.
2. Hợp nhất 3 overlay lớn (number formats / original strings / xf indices) thành **một lượt duyệt** dùng chung một chỉ mục XLSX đã dựng sẵn theo `(row, col)` — hiện mỗi overlay tự parse lại toàn bộ `xl/worksheets/sheetN.xml` bằng hàm `_xlsx_cells_with_*` riêng. Giữ đúng thứ tự áp dụng nếu có phụ thuộc giữa chúng (đọc kỹ code trước khi gộp — nếu một overlay đọc lại XML đã bị overlay trước sửa, không thể gộp ngây thơ).
3. Nếu `optimize_fods_streaming` vẫn là nút nghẽn sau (2), tối ưu tiếp theo cùng nguyên tắc (str.find/scan tuyến tính, không regex mỗi ô) — đo trước/sau bằng cProfile trên **lan14** (không lặp thử trên lan06 — quá chậm để lặp).
4. Sửa nút nghẽn JS lớn nhất nếu phần JS chiếm đáng kể sau bước 1.
5. Mục tiêu cuối: **lan06 và lan14 mở xong trong app ≤ 60 giây** trên máy này. Nếu không đạt, báo cáo trung thực số đạt được và vì sao — không có gian lận số đo.

## Ràng buộc "không đổi kết quả" — quan trọng nhất của brief này
- `vno:xlsx-layout`, `vno:xf`, chuỗi gốc, định dạng số phải giống hệt trước/sau khi hợp nhất overlay, trên MỌI file, không chỉ file test nhỏ. Cách kiểm nhanh: dựng FODS tay (đã có trong `tests/test_sheet_s29_overlay_speed.py`) VÀ so sánh trực tiếp trên `lan05`, `lan11`, `lan12`, `lan08` (chạy overlay cũ vs mới trên cùng FODS soffice, diff chuỗi kết quả — viết script so sánh, không chỉ "trông có vẻ giống").
- Bộ đo hình học (Excel COM) đã cache ở `E:\VNOffice-opencode-lan-audit\_geom_s31`, `_geom`, `_geom_batch`, `_geom_subpx` — dùng script kiểm tra hàng/cột này (tự viết lại tương tự cách Grok/Claude đã làm: nạp `*.geom.json`, gọi `_overlay_sheet_layout_from_xlsx` từ code MỚI, so `rows`/`columns` — phải vẫn 0 lệch, hiện đang là 0/6925). Không cần Excel COM cho bước này (dữ liệu Excel đã đo sẵn trong JSON).

## Công cụ
`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy app/soffice/python.
```
python scripts/layout-audit/_time_sheet_open_stages.py "file test\lan\lan14.xlsx"
python scripts/layout-audit/_time_sheet_open_stages.py "file test\lan\lan06.xlsx"
```
(chạy foreground, lan06 mất vài phút — đừng để tác vụ nền rồi ngồi chờ). Mở app thật để đo JS: `python main.py "file test\lan\lan14.xlsx"` (hoặc cơ chế tương tự trong `main.py`) với DevTools/console log để lấy `performance.now()` — nếu không có sẵn hook, thêm tạm thời rồi bỏ trước khi commit (hoặc giữ lại sau `if (window.__vnoPerfDebug)` có cờ tắt mặc định).
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).

## Luật cứng
- Không commit/copy tài liệu thật (`file test/` đã gitignore); docs chỉ mã lanNN.
- **Không chạy** `scripts/layout-audit/_excel_open_test.ps1` hay `_batch_audit.py` (dùng Excel COM — Claude sẽ chạy batch lưu để xác nhận cuối cùng, không cần Codex chạy).
- Không đụng code Writer (`adapters/libreoffice/writer/*`, `apps/writer/*`) — Grok đang làm Writer R23 song song trong worktree khác.
- Không đổi quy tắc S8–S32 (kết quả phải giữ nguyên bit-for-bit theo logic, chỉ đổi CÁCH tính).
- Commit tiền tố `perf(sheet): S29b …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-SHEET-S29-PERF-ROUND2.md`: bảng thời gian Python+JS trước/sau cho lan06, lan14, lan11, lan12; bằng chứng đầu ra không đổi (script so sánh + kết quả); chỗ sửa; việc còn lại nếu chưa đạt ≤60s.
