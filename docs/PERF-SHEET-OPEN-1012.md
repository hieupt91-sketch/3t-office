# VN Sheet P1 — đo mở, sửa và hoàn tác (12/10/2026)

Phiếu: [FIX-P1](tickets-0710/FIX-P1.md) · Kế hoạch: [PLAN-SHEET-P1](PLAN-SHEET-P1.md)

## Kết quả tóm tắt

- Mở để xem dữ liệu và cuộn: **PASS** trên các tệp CDP đã đo sau fast preview. LAN14 first paint 108–142 ms; scroll thật trước khi UNO attach tải thêm vùng trong 348 ms.
- Lần sửa đầu (gõ + Enter): **PASS**, 0.76–0.82 s trên LAN01/02/04/06/09/14/16.
- Undo/redo qua hydration: **PASS** trên LAN14 bằng chuột/phím CDP thật.
- `npm test`: **PASS 3116/3116**.
- Python suite: **912 tests, 1 FAIL chập chờn** do WinError 32 khi Writer sample thay file tạm đang bị khóa; chạy riêng đúng test đó thêm 3 lượt đều PASS. Không ghi suite tổng là PASS.
- Batch LAN28: **25 PASS, 2 FAIL, 1 BLOCKED**. Không ghi PASS tổng thể: LAN14 round-trip save vượt timeout, LAN25 có diff đã tái hiện cả ở legacy path, LAN04 Excel COM bị chặn.

## Baseline trước sửa

### Desktop đã cài 0.9.10 — số liệu trong phiếu

| Tệp | Kích thước | Mở | Gõ + Enter | Ctrl+Z |
|---|---:|---:|---:|---|
| lan02 | 0.06 MB | 9 s | OK | OK |
| lan04 | 4.5 MB | 9.6 s | OK | Hỏng, không hoàn tác |
| lan01 | 6.9 MB | 46 s | 100 s | Hỏng, không hoàn tác |
| lan06 | 10.7 MB | 60 s | 3.5 s | Hỏng, không hoàn tác |

### Worktree trước sửa — desktop CDP

Đo trên app desktop thật, profile `E:\VNOffice-profiles\codex-fp1`, root `E:\VNOffice-codex-fp1`. Mốc mở lấy từ `__vnoSheetOpenStartedAt` đến `vno:sheet-quick-view-ready`, trước khi chờ full model.

| Tệp | Quick view trước | Full grid trước |
|---|---:|---:|
| lan01 | 5.08–6.40 s | 42.67–45.53 s |

Trace LAN01 trước sửa: worker 3.65–3.78 s; `view_open` ~2.00 s; `view_window` đầu 0.80 s. Đường full model mất 42.67–45.53 s tới grid đầu tiên.

Phép đo pipeline Python riêng trên LAN01 trước sửa: XLSX→FODS 22.90 s; layout overlay 13.50 s; cell metadata overlay 26.21 s; optimize 6.50 s; XF overlay 1.07 s; tổng 71.50 s. Không cộng phép đo pipeline riêng này với CDP.

## Sau sửa — desktop CDP

Fast preview đọc một viewport OOXML cục bộ trước khi chờ UNO. Parser LAN14 đo độc lập 32.7 ms; log trong desktop đo 53.7 ms. UNO vẫn mở workbook ở nền và cung cấp full model, định dạng/cửa sổ tiếp theo sau khi attach.

### First paint và lần sửa đầu

| Tệp | Kích thước xấp xỉ | First paint | Gõ + Enter | Pending edit |
|---|---:|---:|---:|---|
| lan01 | 7.20 MB | 109 ms | 792 ms | Có |
| lan02 | 0.063 MB | 127 ms | 762 ms | Có |
| lan04 | 4.66 MB | 113 ms | 766 ms | Có |
| lan06 | 11.25 MB | 1.536 s | 801 ms | Có |
| lan09 | 13.3 MB | 171 ms | 799 ms | Có |
| lan14 | 9.74 MB | 108–142 ms | 404–824 ms | Có |
| lan16 | 16.95 MB | 119 ms | 787 ms | Có |

First paint ở bảng đo từ `__vnoSheetOpenStartedAt`, tức thời điểm mở workbook trong app đang chạy; không tính thời gian khởi động app. CDP matrix từng tệp không bao gồm phép gõ thứ hai qua hydration trên LAN14; phép đo đó được chạy riêng bên dưới.

### Cuộn trước khi UNO sẵn sàng

Trên LAN14, CDP gửi mouse-wheel thật 2000 px ngay sau first paint, khi `docId` còn là `xlsx-preview-*`. Viewport mới tới hàng 41–80 và hiển thị giá trị thật sau **348 ms**. UNO attach sau khoảng **5.4 s**, sau đó quick view chuyển sang `sheet_view_window` mà không đóng journal.

### Undo/redo và hydration LAN14

- First paint: 108 ms.
- Gõ `P1FAST` + Enter vào C77: 404 ms; journal có 1 action.
- Ctrl+Z trước hydration khôi phục `Ngô Thị Thu`; Ctrl+Y trả lại `P1FAST`.
- Full model hoàn tất sau 71.1 s. C77 trong grid đầy đủ là `P1FAST`, undo stack có 1 action.
- Ctrl+Z sau hydration khôi phục `Ngô Thị Thu`; Ctrl+Y trả lại `P1FAST`.

Lệnh phím được gửi qua WebView2 CDP (`Input.dispatchKeyEvent`), không dùng SendKeys hoặc OS input.

### In

LAN01: sau khi full model nạp xong, mở tab **Chế độ xem** và chạy **Xem trước khi in**; trang PDF preview hiện và trạng thái báo sẵn sàng. Không gửi lệnh in tới máy in vật lý. Khi quick view còn hoạt động, Ctrl+P và lệnh `print()` bị chặn cho tới khi hydrate; thao tác in thực tế vì vậy là **NOT RUN**.

## Fidelity — batch 28 workbook LAN

Lệnh desktop batch đặt `VNO_AUDIT_MARK_DIRTY=1`, `VNO_APP_ROOT=E:\VNOffice-codex-fp1`, profile `E:\VNOffice-profiles\codex-fp1`. Báo cáo đầy đủ được tạo cục bộ tại `%TEMP%\vno-sheet-p1-batch28\batch_document_audit_report.md`.

| Kết quả | Tệp | Chi tiết |
|---|---|---|
| PASS (25) | lan01–03, lan05–13, lan15–24, lan26–28 | `saved=yes`, `diffs=0`, lint sạch, Excel mở được |
| BLOCKED (1) | lan04 | `saved=yes`, `diffs=0`, lint sạch; Excel COM không khởi tạo được (`CO_E_SERVER_EXEC_FAILURE`) |
| FAIL do timeout (1) | lan14 | Round-trip mất 1754.2 s; CDP `Runtime.evaluate` timeout ở save pipeline. Tệp output vẫn có, `diffs=0`, lint sạch, Excel mở được |
| FAIL fidelity (1) | lan25 | `saved=yes`, `diffs=9419`, lint sạch, Excel mở được |

LAN25 được chạy lại với `VNO_OPEN_VIEWFIRST=0`; vẫn đúng **9419 diffs**, nên lỗi này có trên đường legacy XLSX→FODS và không do fast preview P1. Diff report nhóm 910 number formats, 2771 font, 2771 fill, 2967 border. Source và output đều giữ metadata `TableStyleMedium2` cho bảng. Không sửa kỳ vọng audit hoặc fixture.

Tệp trong nhóm ưu tiên của ticket: lan01/02/06/09/11/22/26 đều PASS (`diffs=0`, Excel PASS); lan04 có `diffs=0` nhưng Excel reference bị BLOCKED, nên chưa được tính PASS.

## Kiểm tra repo

| Lệnh | Kết quả |
|---|---|
| `npm test` | PASS 3116/3116 sau code local-scroll |
| `python -m unittest tests.test_xlsx_preview` | PASS 5 tests |
| Sheet quick-view unit | PASS 18 tests |
| `python -m unittest discover -s tests` | FAIL: 912 tests, 1 WinError 32 chập chờn ở `test_writer_save_roundtrip.WriterSaveRoundtripTests.test_all_fixtures_roundtrip` khi replace file tạm bị khóa; chạy riêng test này 3 lần liên tiếp đều PASS |
| `python -m py_compile main.py apps/sheet/xlsx_preview.py tests/test_xlsx_preview.py` | PASS |
| `git diff --check` | PASS trước các commit code cuối |

CDP kiểm tra khi quick view còn hoạt động: `adapter.save()` và `adapter.print()` trả `false`, quick view vẫn mở và status báo chờ hydrate. Save/print thực tế khi quick view còn hoạt động là NOT RUN; sau hydration, LAN01 mở được PDF print preview. Không gửi lệnh tới máy in vật lý.

Python suite cũng từng ghi ResourceWarning về stream subprocess chưa đóng. Lỗi duy nhất trong lượt 912 tests là WinError 32 nói trên; đã chạy test Writer đó riêng 3 lần và đều PASS.

## Fallback và trạng thái

- `VNO_OPEN_VIEWFIRST=0` trở về luồng mở full model legacy.
- Fast parser chỉ đọc viewport cục bộ, giới hạn 40×20; không thêm dependency và không sửa file nguồn. UNO vẫn là nguồn authoritative cho workbook đầy đủ, save và print.
- Mục tiêu first paint/scroll/lần sửa đầu/undo-redo qua hydration đã đạt ở các CDP case đã đo. Fidelity gate 28-file chưa PASS tổng thể vì LAN25 legacy diff, lan04 Excel COM blocked và LAN14 full save timeout; các trạng thái này được giữ nguyên trong handoff.
