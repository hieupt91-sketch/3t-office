# TASK BRIEF — Sheet S29 hiệu năng, vòng 3 (Codex): tiếp tục về ≤60s + chẩn đoán lan14 không đo được JS

Worktree: `E:\VNOffice-codex-sheet-s29b` (nhánh `perf/sheet-s29-codex-r3`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge. Đọc trước `docs/HANDOFF-SHEET-S29-PERF-ROUND2.md` (vòng 2, việc bạn vừa làm xong) và `docs/HANDOFF-SHEET-S29-PERF.md` (vòng 1).

## Hiện trạng sau vòng 2
| File | Python trước vòng 2 | Python sau vòng 2 | Chi tiết (soffice/layout/metadata/optimize/reoverlay) |
|---|---:|---:|---|
| lan14 | 130,73 s | 115,48 s | 16,36 / 2,73 / 29,94 / 26,62 / 30,07 s |
| lan06 | 155,67 s | 136,45 s | 16,38 / 16,37 / 49,91 / 32,82 / 18,95 s |

Mục tiêu ≤60s (Python + JS) CHƯA đạt. lan06 JS đã đo được (parse/render/load/layout ≈ 1,5–2,1s, không phải nút nghẽn). **lan14 JS chưa đo được** — hai lần thử mở app thật đều treo >3 phút trước khi tới hook `performance.now()`, và vòng 2 dừng lại thay vì đoán số.

## Việc cần làm

### 1. Ưu tiên cao nhất: chẩn đoán vì sao lan14 không mở được / không tới hook JS trong app thật
Đây có thể là MỘT BUG THẬT (không chỉ là bất tiện đo lường) — nếu app thật cũng treo >3 phút khi người dùng mở file 33k dòng, đó là lỗi UX nghiêm trọng hơn cả tối ưu Python. Các bước:
- Mở lan14 bằng `python main.py "file test\lan\lan14.xlsx"` với `VNO_PERF_DEBUG=1`, theo dõi console/log app thật để xem app dừng ở giai đoạn nào (soffice convert xong chưa? Python trả FODS cho JS chưa? `loadFromFods` bắt đầu chưa? `parseFods` xong chưa? DOM dựng lưới ảo có đang render toàn bộ 33k hàng thay vì ảo hoá không?).
- Nếu nghi ngờ `_renderVirtualRows`/dựng lưới ảo trong `apps/sheet/sheet-grid.js` là nút nghẽn JS thật (không phải hook đo bị lỗi) — đo bằng DevTools Performance profile (nếu `webview.start(debug=True)` mở được DevTools) hoặc thêm log thô tạm thời (`console.time`/`console.timeEnd`) quanh các bước lớn, sau đó dọn log tạm trước khi commit (giữ lại `window.__vnoPerfDebug` hook đã có, không thêm log rác).
- Ghi rõ trong handoff: app có thực sự mở được lan14 trong thời gian hợp lý hay không, và nếu không, đó là nút nghẽn nào (Python trả FODS chậm hơn benchmark CLI vì lý do khác trong luồng thật, hay JS parse/render 33k hàng chậm).

### 2. Nếu còn thời gian: tiếp tục giảm chi phí Python
`_overlay_sheet_number_formats_from_xlsx`/`_overlay_sheet_original_strings_from_xlsx`/`_overlay_sheet_xf_indices_from_xlsx` đã gộp thành một chỉ mục + một lượt duyệt FODS (vòng 2) — chi phí "metadata" (49,91s lan06) vẫn là phần lớn nhất. Dùng `cProfile` để xem hàm nào trong lượt duyệt hợp nhất còn tốn nhất (rất có thể vẫn là `_flat_xml_blocks`/quét thẻ cho mỗi ô — kiểm tra có còn quét tuyến tính O(n) đúng nghĩa không, hay có chỗ nào vô tình quay lại O(n²) khi số ô rất lớn).
`optimize_fods_streaming` (32,82s lan06) và `reoverlay_sheet_xf_indices` (18,95s lan06) là hai bước còn lại chưa động tới ở vòng 2 — có thể gộp `reoverlay_sheet_xf_indices` VÀO ngay sau `optimize_fods_streaming` nếu logic cho phép (đọc kỹ trước, đừng gộp ngây thơ nếu có phụ thuộc thứ tự thật).

## Ràng buộc "không đổi kết quả" — vẫn quan trọng nhất
Dùng lại đúng phương pháp vòng 2: `scripts/layout-audit/_compare_sheet_s29_metadata.py` (so SHA-256 chuỗi FODS đầu ra cũ vs mới trên cùng bytes) và kiểm tra hàng/cột so với cache Excel COM (`E:\VNOffice-opencode-lan-audit\_geom_s31`, `_geom`, `_geom_batch`, `_geom_subpx` — dùng cách đối chiếu qua `_overlay_sheet_layout_from_xlsx` như đã làm, phải vẫn 0/6925 hàng lệch). Chạy trên lan05, lan08, lan11, lan12, lan06, lan14 như vòng 2.

## Công cụ
`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy app/soffice/python.
```
python scripts/layout-audit/_time_sheet_open_stages.py "file test\lan\lan14.xlsx"
python scripts/layout-audit/_time_sheet_open_stages.py "file test\lan\lan06.xlsx"
```
Test bắt buộc trước commit: `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"` (foreground).
**Lưu ý**: các agent khác đang chạy soffice/Excel COM song song trong worktree khác có thể làm vài test soffice-dependent flake ngẫu nhiên — chạy lại một lần trước khi kết luận hồi quy thật.

## Luật cứng
Không commit/copy tài liệu thật. Không chạy `_excel_open_test.ps1`/`_batch_audit.py`. Không đụng code Writer/UI ribbon (`apps/writer/*`, `platform/ribbon/*`, `platform/shell/*`, `platform/help/*`) — agent khác đang sửa UI cùng lúc. Không đổi kết quả các quy tắc S8–S32. Commit tiền tố `perf(sheet): S29c …`. Không rebase/force.

## Bàn giao
`docs/HANDOFF-SHEET-S29-PERF-ROUND3.md`: kết luận chẩn đoán lan14 (có bug UX thật hay không), số đo Python trước/sau nếu có tối ưu thêm, bằng chứng đầu ra không đổi, việc còn lại.
