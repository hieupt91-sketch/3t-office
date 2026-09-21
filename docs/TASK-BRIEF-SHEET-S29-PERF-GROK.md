# TASK BRIEF — Sheet S29 hiệu năng mở file lớn (Grok): lan06 Python 1721 s, lan14 346 s

Worktree: `E:\VNOffice-grok-sheet-s29` (nhánh `perf/sheet-s29-grok`, tách từ `main` @ 7943de1). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập (thời gian + batch lưu 0 lệch bằng Excel COM + bộ đo hình học S30/S31) rồi merge. Chỉ ghi số đã đo thật.
Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (S8, S12, S13, S16, S30, S31 — các overlay KHÔNG được đổi kết quả), `docs/HANDOFF-WRITER-R20.md` (cách làm/bàn giao).

## Số đo đã có (Claude, 22/9 00:30, `scripts/layout-audit/_time_sheet_open_stages.py`, log `E:\VNOffice-opencode-lan-audit\_time_open_lan06.log` / `_time_open_lan14.log`)
Đường mở Python (chưa kể JS): XLSX → soffice FODS → các overlay `ooxml_zip_patch` trên chuỗi FODS → `optimize_fods_streaming` → `reoverlay_sheet_xf_indices`.

| Giai đoạn | lan06 (11,3 MB, ~3,5 triệu ô, FODS 146 MB) | lan14 (9,7 MB, 33k dòng, FODS 257 MB) |
|---|---:|---:|
| soffice convert | 15 s | 16 s |
| `_overlay_sheet_layout_from_xlsx` (S30/S31) | 72 s → ~15 s sau 8dcb20b (cache metrics theo xf) | 3 s |
| `_overlay_sheet_number_formats_from_xlsx` | **262 s** | 49 s |
| `_overlay_sheet_original_strings_from_xlsx` | **595 s** | 60 s |
| `_overlay_sheet_xf_indices_from_xlsx` (S8) | **662 s** | 72 s |
| `optimize_fods_streaming` | 86 s (334 MB → **4,4 MB**) | 59 s (326 → 311 MB) |
| `reoverlay_sheet_xf_indices` | 27 s | 77 s |
| **Tổng Python** | **1721 s** | **346 s** |

Nhận xét để bắt đầu (kiểm chứng, đừng tin): ba overlay lớn chạy trên FODS CHƯA tối ưu (lan06: 334 MB gồm hàng triệu ô rỗng/lặp mà `optimize` gộp
còn 4,4 MB) và mỗi overlay quét lại toàn bộ chuỗi (regex/`find` lặp → O(n²) theo số ô). Hướng gốc: (1) chuyển các overlay sang chạy SAU
`optimize_fods_streaming` (cần giữ đúng chỉ số ô/số cột lặp) hoặc (2) hợp nhất các overlay thành MỘT lượt duyệt tuyến tính theo `<table:table-row>`
với chỉ mục ô XLSX dựng sẵn (dict theo (row, col)), thay vì `re.finditer` lồng nhau trên toàn chuỗi. Sau Python còn phần JS (parse FODS,
dựng lưới) — đo bằng `performance.now()` trong `sheet-adapter.js`/`sheet-grid.js` khi mở app với profile riêng.

Mục tiêu: lan06 và lan14 mở trong app ≤ 60 s (Python + JS) trên máy này, KHÔNG đổi kết quả: FODS/overlay đầu ra phải giống byte (hoặc
tương đương sau chuẩn hoá) với trước khi sửa cho 5 file nhỏ (lan05, lan11, lan12, lan03, lan08) — so `vno:xlsx-layout`, `vno:xf`, chuỗi gốc,
định dạng số; bộ đo hình học `_sheet_geometry_audit.py --reuse-excel` (cache Excel ở `E:\VNOffice-opencode-lan-audit\_geom_s31`) phải vẫn
`col 0 row 0 lines 0 fit 0`.

## Cách làm
1. Chạy `python scripts/layout-audit/_time_sheet_open_stages.py "file test\lan\lan11.xlsx"` (nhỏ, nhanh) để quen công cụ; thêm `cProfile` cho
   từng overlay lớn trên lan14 (đừng dùng lan06 để lặp thử — 30 phút/lượt; chỉ đo lan06 trước và sau cùng).
2. Ghi `docs/HANDOFF-SHEET-S29-PERF.md` phần "Nguyên nhân" (hàm/regex nào O(n²), số lần gọi) và commit NGAY trước khi sửa.
3. Sửa gốc theo lớp, giữ nguyên hành vi. Viết test đơn vị so đầu ra trước/sau trên một FODS nhỏ dựng tay.
4. Đo lại lan11/lan12/lan14/lan06, chạy `node tests/run-tests.js` và `python -m unittest discover -s tests -p "test_*.py"` (foreground).

## Luật cứng
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok2"` trước khi chạy app/soffice/python.
- Không commit/copy tài liệu thật; docs chỉ mã lanNN. Không chạy `_excel_open_test.ps1` / `_batch_audit.py` (Excel COM do Claude chạy).
- Không đụng code Writer; không đổi quy tắc S30/S31 (chỉ được tối ưu cách tính, kết quả `vno:xlsx-layout` phải giống hệt).
- Commit tiền tố `perf(sheet): S29 …` kèm số trước → sau. Không rebase/force.

## Bàn giao
`docs/HANDOFF-SHEET-S29-PERF.md`: bảng thời gian từng giai đoạn trước/sau cho lan06, lan14, lan11, lan12; bằng chứng đầu ra không đổi;
chỗ sửa; việc còn lại (kể cả phần JS nếu chưa tới).
