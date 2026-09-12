# Agent Handoff

TASK: Audit fidelity XLSX -> FODS -> VN Sheet cho file `_dss_real.xlsx` (15 sheet)
AGENT/ROLE: Codex / Sheet import audit
BRANCH: `fix/sheet-import-audit-vs-xlsx`
WORKTREE: `E:\VNOffice-codex-sheet-audit`
OBJECTIVE: Đo trực tiếp OOXML gốc với `SheetAdapter.parseFods()`, sửa lỗi parser/overlay có thể khôi phục hợp lý, và lưu auditor tái sử dụng.

## Kết quả trước / sau

“Trước” là lần chạy auditor đã loại nhiễu do ô style-only và cột mặc định. “Sau” dùng FODS được chạy lại qua Python overlay mới. `Ô khớp` chỉ tính value + formula + number format; tổng `lệch` còn bao gồm layout và metadata.

| Sheet | Ô dữ liệu | Ô khớp trước | Lệch trước | Ô khớp sau | Lệch sau |
|---|---:|---:|---:|---:|---:|
| foxz | 0 | 0 | 0 | 0 | 0 |
| Thông báo Sản phẩm mới | 11 | 9 | 6 | 9 | 2 |
| Các mã sản phẩm dừng phân phối | 483 | 336 | 152 | 336 | 147 |
| Các mã điều chỉnh giá | 10 | 6 | 9 | 6 | 4 |
| Camera IP | 490 | 210 | 294 | 210 | 283 |
| Camera HDCVI | 447 | 345 | 112 | 345 | 104 |
| Đầu XVR | 85 | 73 | 18 | 73 | 12 |
| Đầu NVR | 137 | 68 | 77 | 68 | 69 |
| Camera quay quét | 109 | 87 | 28 | 87 | 22 |
| Thiết bị hành trình | 26 | 25 | 8 | 25 | 1 |
| Access Control | 75 | 62 | 20 | 62 | 13 |
| Chuông hình | 111 | 90 | 29 | 90 | 21 |
| Vật tư phụ | 153 | 141 | 21 | 141 | 12 |
| Thẻ nhớ, ổ cứng | 90 | 90 | 5 | 90 | 0 |
| Màn hình | 63 | 44 | 24 | 44 | 19 |
| **Tổng** | **2.290** | **1.586** | **803** | **1.586** | **709** |

## Findings

- Khớp hoàn toàn: tên/thứ tự 15 sheet, active sheet, trạng thái visible/hidden/veryHidden, merge, hidden row/column, freeze panes và AutoFilter.
- Đã sửa (overlay, nhóm c): 78 độ rộng cột và 16 chiều cao hàng. LibreOffice đã đổi các kích thước này trong FODS; overlay nay lưu trực tiếp chuẩn Excel `width*7+5` px và `ht*96/72` px ở metadata table-level, parser DOM và regex đều ưu tiên dữ liệu đó. Sau overlay, layout lệch 0.
- Đã sửa (parser, nhóm a): text bị soffice escape hai lớp (`&amp;amp;`, `&amp;quot;`, `&amp;lt;`) được giải mã đúng ở cả DOM và regex, kể cả `office:string-value`.
- Đã sửa (auditor): bỏ ô OOXML self-closing chỉ có style, bỏ default `<col>` tới XFD, dịch shared-formula theo tọa độ và phân biệt dấu phẩy grouping với dấu chấm decimal. 94 false positive number-format của lần đo sơ bộ đã bị loại.
- Còn 542 lệch number format: kiểm tra FODS cho thấy nhiều ô đã bị soffice đổi/mất `numFmt` gốc (General/Text thay cho accounting/currency/`#,##0`). Chưa overlay vì cần ánh xạ từng XF/formatCode đầy đủ và metadata theo từng ô; làm vội sẽ làm FODS 38 MB phình lớn và có nguy cơ sai locale. Đây là nhóm c, chưa đạt 100%.
- Còn 166 lệch value: chủ yếu tab, khoảng trắng cuối, dòng trống và newline cuối đã không còn trong FODS; một số rich text entity được sửa nhưng các ký tự whitespace bị LibreOffice loại không thể suy ra từ FODS. Đây là nhóm c; cần cell-level OOXML overlay để khôi phục tuyệt đối.
- Còn 1 lệch formula tại `Camera IP!F45`: XLSX gốc không có công thức nhưng FODS có `=#REF!`; LibreOffice tạo thêm thông tin sai. Đây là nhóm c.
- Không phát hiện lỗi overlay hiện hữu ở sheet state/active/freeze/filter. Không sửa `serializeToFods()` và không sửa LibreOffice Core.

IMPLEMENTATION SUMMARY: Thêm CLI audit không dependency; sửa decode text import; thêm exact-layout overlay Python và parser twin; thêm fixture nhỏ kiểm toàn bộ loại so sánh và chạy CLI.

FILES CHANGED:
- `scripts/audit-sheet-import.mjs`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/unit/sheet-import-audit.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-IMPORT-AUDIT.md`

COMMANDS RUN:
- `node scripts/check-syntax.js`
- `node tests/run-tests.js`
- `node scripts/audit-sheet-import.mjs _dss_real.xlsx _dss_real.fods`
- `python adapters/libreoffice/common/ooxml_zip_patch.py --xlsx _dss_real.xlsx --overlay-fods _dss_real.fods --out _audit_overlay.fods`
- `node scripts/audit-sheet-import.mjs _dss_real.xlsx _audit_overlay.fods`

BUILD RESULT: Không có build riêng; syntax check cuối PASS 92/92.
TEST RESULTS: Baseline PASS 1637/1637; cuối PASS 1641/1641. Python overlay regression: 71/71 PASS (6 native-open + 12 freeze + 35 hidden/filter + 18 active-tab).
KNOWN FAILURES: Audit thật còn 709 sai lệch: 542 number format, 166 value, 1 formula; chi tiết tối đa 20 lỗi/loại/sheet nằm trong output CLI.
RISKS: Metadata layout dùng namespace `vno` chỉ trong pipeline nội bộ trước parse; không thay đổi semantics file XLSX và không gửi dữ liệu ra mạng.
DEPENDENCIES/BLOCKERS: Muốn đạt 100% cần phase cell-level overlay cho raw value/formula/numFmt, có giới hạn kích thước và mapping shared/array formula rõ ràng.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Thiết kế overlay cell-level dạng sparse cho 709 lệch còn lại, ưu tiên number format, kèm benchmark dung lượng/thời gian trên file 38 MB.
