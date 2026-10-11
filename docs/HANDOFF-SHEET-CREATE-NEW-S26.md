# Agent Handoff

TASK: S26 — Tạo mới trong VN Sheet → lưu XLSX → Excel 2016 đọc lại, kịch bản 2
AGENT/ROLE: Codex / Sheet owner + Integration owner trong phạm vi brief
BRANCH: `tools/sheet-create-new-s26`
WORKTREE: `E:\VNOffice-codex-sheet-s26`
OBJECTIVE: Mở rộng bộ đo kịch bản 2, đo bằng Excel 2016 COM, phân lớp và sửa đúng tầng; giữ kịch bản 1 và 5 file LAN không lệch.

FINDINGS:

- Baseline sạch đầu tiên sau khi sửa harness không tái dùng file XLSX cũ:

```text
Doanh thu.B4.value: expected [46096] Excel [46095]
Doanh thu.B5.value: expected [0.354166666666667] Excel [08:30]
Doanh thu.B5.numFmtContains: expected [hh:mm] Excel [0]
Doanh thu.B11.numFmtContains: expected [[Red]-#,##0] Excel [#,##0;[Red]#,##0]
Doanh thu.E7.value: expected [15/03/2026] Excel [14/03/2026]
Doanh thu.C1.orientation: expected [90] Excel [-4171]
Doanh thu.D2.indentLevel: expected [2] Excel [0]
Doanh thu.F2.value: expected [=abc] Excel ['=abc]
Doanh thu.B2:B10.formatConditionFormula1: expected [100] Excel [=100]
Doanh thu.autoFilter.range: expected [$A$1:$D$10] Excel [$A$1:$H$13]
Doanh thu.pageSetup.printTitleRows: expected [$1:$1] Excel []
CHECKS=63 DIFFS=11
lint done
parts lint done
```

- Phân lớp từng lệch:

| Lệch | Expected | Excel đọc baseline | Nguyên nhân từ FODS/XLSX | Trạng thái |
|---|---|---|---|---|
| Ngày B4 | 46096 | 46095 | App trừ `Date.getTime()` cục bộ cho epoch UTC; FODS đã gửi `office:date-value="2026-03-14"` | Đã sửa S26a |
| Giờ B5 (2 check) | 0.354166666666667, `hh:mm` | chuỗi `08:30`, format `0` | App chưa chuẩn hóa category `time`; FODS gửi string | Đã sửa S26a |
| Format âm | `[Red]-#,##0` | `#,##0;[Red]#,##0` | FODS number style có màu đỏ nhưng thiếu literal dấu trừ | Đã sửa S26a |
| TEXT E7 | `15/03/2026` | `14/03/2026` | Lệch dây chuyền từ B4 | Đã sửa S26a |
| Orientation | 90 | COM `-4171` | XLSX đã đúng `textRotation="90"`; Excel COM biểu diễn 90° bằng hằng `xlUpward=-4171` | Readback quy đổi ngữ nghĩa, không sửa expected |
| Indent D2 | 2 | 0 | App chỉ lưu CSS `paddingLeft`, serializer FODS bỏ thuộc tính | Đã sửa S26a |
| Text F2 | `=abc` | `'=abc` | App giữ dấu nháy ép text như nội dung thật trong FODS | Đã sửa S26a |
| Conditional formula | 100 | `=100` | XLSX đúng điều kiện 100; Excel COM tự thêm `=` cho `Formula1` | Readback bỏ tiền tố COM, không sửa expected |
| AutoFilter | `$A$1:$D$10` | `$A$1:$H$13` | App ban đầu không giữ selection; sau đó LibreOffice còn tự nới vùng liên tục. XLSX hậu xử lý nay ghi đúng `A1:D10`; dữ liệu phụ được tách bằng hàng trắng để Excel không tự nới khi mở | Đã sửa S26a + S26b |
| Print Titles | `$1:$1` | rỗng | FODS có `vno:print-title-rows="1"`, LibreOffice không xuất `_xlnm.Print_Titles` | Đã sửa S26b |

IMPLEMENTATION SUMMARY:

- `32741aa`: thêm `SCENARIO2`, expected JSON, 63 phép kiểm tra Excel COM, lint và bảo đảm file đo được tạo mới.
- `82b6f44` / S26a: sửa nhập ngày/giờ UTC-safe, dấu nháy ép text, vùng lọc đã chọn, indent, format số âm; readback quy đổi đúng hằng COM.
- `3e45082` / S26b: hậu xử lý AutoFilter và Print Titles bị LibreOffice đổi/rơi; thêm unit test Python.
- Không sửa LibreOffice Core, không đổi mặc định toàn cục, không đổi định nghĩa kịch bản 1.

FILES CHANGED:

- `scripts/layout-audit/_create_new_sheet.py`
- `scripts/layout-audit/_excel_readback.ps1`
- `apps/sheet/number-formatter.js`
- `apps/sheet/sheet-grid.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/unit/sheet-format-cells.test.js`
- `tests/unit/sheet-date-values.test.js`
- `tests/test_sheet_s26_ooxml.py`
- `docs/QUY-UOC-DOI-CHIEU.md`
- `docs/HANDOFF-SHEET-CREATE-NEW-S26.md`

COMMANDS RUN:

- `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'; python scripts/layout-audit/_create_new_sheet.py . _new2.xlsx --scenario 2`
- `powershell -NoProfile -File scripts/layout-audit/_excel_readback.ps1 -File _new2.xlsx`
- `python scripts/layout-audit/_xlsx_lint.py _new2.xlsx`
- `python scripts/layout-audit/_xlsx_parts_lint.py _new2.xlsx`
- `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'; python scripts/layout-audit/_create_new_sheet.py . _new1.xlsx --scenario 1`
- `$env:LOCALAPPDATA='E:\VNOffice-profiles\codex'; python scripts/layout-audit/_batch_audit.py . lan01.xlsx lan02.xlsx lan03.xlsx lan05.xlsx lan09.xlsx`
- `node scripts/check-syntax.js`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests -p "test_sheet*.py"`

BUILD RESULT: PASS — syntax gate `92/92 files hợp lệ | 0 lỗi cú pháp`.

TEST RESULTS:

- Kịch bản 2 sau sửa:

```text
CHECKS=63 DIFFS=0
lint done
parts lint done
```

- Kịch bản 1 sau sửa:

```text
CHECKS=40 DIFFS=0
```

- Batch LAN vừa chạy:

```text
lan01.xlsx saved total 0 excel _rt_lan01.xlsx OK sheets=3 lint clean
lan02.xlsx saved total 0 excel _rt_lan02.xlsx OK sheets=2 lint clean
lan03.xlsx saved total 0 excel _rt_lan03.xlsx OK sheets=12 lint clean
lan05.xlsx saved total 0 excel _rt_lan05.xlsx OK sheets=1 lint clean
lan09.xlsx saved total 0 excel _rt_lan09.xlsx OK sheets=15 lint clean
report: _batch_audit_report.md
```

- Node gate: `KẾT QUẢ KIỂM THỬ: 1792/1792 PASS | 0 FAIL` (main 1790 + 2 test S26a).
- Python gate: `Ran 165 tests in 119.532s` — `OK`.

KNOWN FAILURES: Không có.
RISKS: Hậu xử lý Print Titles tạo defined name chuẩn OOXML từ metadata FODS; đã khóa bằng unit test và kiểm chứng Excel COM, nhưng chưa có trường hợp S26 riêng kết hợp đồng thời title rows và title columns qua Excel COM.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): Không áp dụng — không sửa Core/upstream.
NEXT ACTION: Có thể merge ba commit code và commit handoff này theo thứ tự; không commit các artifact `_new*.xlsx`, `_rt_lan*.xlsx`, `_audit_*` hoặc nội dung `file test/`.
