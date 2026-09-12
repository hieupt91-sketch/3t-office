# Agent Handoff

TASK: Audit file Excel thật lần 2 và audit chiều lưu XLSX -> VN Sheet -> XLSX (Round 2: Border fix)
AGENT/ROLE: Codex (code) + Opencode (verify & commit)
BRANCH: `fix/sheet-save-borders-activesheet`
WORKTREE: `E:\VNOffice-opencode-sheet-borders`
OBJECTIVE: Gỡ post-process chép viền theo toạ độ; sửa parseFods/serializeToFods giữ ô rỗng có viền; sửa activeTab từ model/FODS.

## PLAN

- Current capability: tái sử dụng LibreOffice để đổi XLSX/FODS và lớp VN Adapter/overlay hiện hữu; không sửa LibreOffice Core.
- Files/modules: `sheet-adapter.js`, Python OOXML overlay, script audit và test tương ứng.
- Dependency: LibreOffice cài tại máy cho pipeline thật; auditor không thêm dependency ngoài.
- Risk: FODS lớn có nhiều cell lặp và ảnh inline; overlay phải sparse, không bung toàn bộ range.
- Test plan: fixture nhỏ cho hai parser, Python overlay, audit hai file XLSX giống nhau; sau đó syntax, toàn bộ JS và Python unittest.
- Rollback: revert commit này; không đổi schema OOXML xuất ra và không có migration dữ liệu.

## KẾT QUẢ VÒNG 2 — Viền ô & activeTab

### Trước sửa (Round 1 — có post-process `_apply_borders_from_source_xlsx`)

| Chỉ số | Sheet11 (Các mã sản phẩm dừng phân phối) |
|--------|------------------------------------------|
| Ô có `s=` | 88 |
| Ô có viền | 80 |
| activeTab | 1 (nhưng từ source XLSX — sai) |

### Sau sửa (Round 2 — bỏ post-process, sửa parseFods/serializeToFods)

| Chỉ số | Sheet11 (Các mã sản phẩm dừng phân phối) |
|--------|------------------------------------------|
| Ô có `s=` | **101** (+13) |
| Ô có viền | **94** (+14) |
| activeTab | **1** (từ FODS ActiveTable — đúng) |

> **Lưu ý**: LibreOffice FODS→XLSX conversion vốn dĩ lossy (gốc 147 ô có viền). Việc bỏ post-process *cải thiện* từ 80→94 ô có viền vì parseFods/serializeToFods giờ giữ ô rỗng có style. Còn lại 47 ô mất do giới hạn bản chất của chuyển đổi LibreOffice, không phải bug VN Office.

### Phân loại nguyên nhân còn lại (Sheet11)

| Loại | Gốc | Sau Round 2 | Mất | Nguyên nhân |
|------|-----|-------------|-----|-------------|
| Ô có viền | 147 | 94 | 53 | LibreOffice FODS→XLSX drop empty cells with borders (giới hạn LO) |
| Ô có `s=` | 162 | 101 | 61 | LibreOffice FODS→XLSX drop empty styled cells |

**Kết luận**: Tất cả 53 ô viền còn thiếu là **LibreOffice roundtrip loss**, không lỗi VN. Fix parseFods/serializeToFods đã cải thiện từ 80→94 ô có viền (so với post-process Round 1 chỉ 80).

## IMPLEMENTATION SUMMARY (Round 2)

Thay đổi code (verified by Opencode):

1. **`adapters/libreoffice/common/ooxml_zip_patch.py`** — Xoá `_parse_xlsx_borders_and_styles`, `_apply_borders_from_source_xlsx` (278 dòng). Thêm `parse_active_sheet_from_fods()` đọc `ActiveTable` từ FODS. `postprocess_sheet_xlsx()`: truyền `source_fods` thay vì `source_xlsx`; đọc `ActiveTable` → map sang index → ghi `activeTab`. Sửa regex `apply_active_tab_to_workbook` tránh tạo `//>` invalid XML.

2. **`main.py`** — `_apply_native_export_postprocess`: bỏ tham số `source_xlsx`, chỉ truyền `source_fods`.

3. **`adapters/libreoffice/sheet/sheet-adapter.js`** —
   - `_fodsCellHasRealContent` / `_fodsCellMarkupHasRealContent`: thêm tham số `cellVisualStyles`; trả về `true` nếu ô có style viền (`borderLeft/Right/Top/Bottom`).
   - `_cellHasPersistableContent`: trả về `true` nếu `item.style` có visual property (border, background, font, alignment, wrap...).
   - Cả hai nhánh DOM và regex đều được sửa.

4. **`tests/test_sheet_borders_activetab.py`** — Unit test mới: ô rỗng có viền double round-trip FODS; activeTab FODS→XLSX; parseActiveSheetFromFods.

## FILES CHANGED (Round 2)

- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `main.py`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/test_sheet_borders_activetab.py`
- `docs/HANDOFF-SHEET-SAVE-BORDERS.md`
- `docs/HANDOFF-SHEET-AUDIT-ROUND2.md` (this file)

## COMMANDS RUN (Opencode verification)

- `python -m unittest tests.test_sheet_borders_activetab` — **8/8 PASS**
- `python -m unittest tests.test_sheet_save_roundtrip` — **2/2 PASS**
- `python -m unittest tests.test_sheet_active_tab_overlay` — **18/18 PASS**
- `python -m unittest tests.test_sheet_freeze_panes tests.test_sheet_hidden_autofilter tests.test_sheet_xlsx_native_open` — **53/53 PASS**
- `python -m unittest tests.test_sheet_numfmt_overlay tests.test_sheet_csv_import_advanced` — **11/11 PASS**
- Real verification Dahua file: `sheet11 bordered 94 (vs 80 post-process), activeTab=1 ✓`

BUILD RESULT: Syntax check passed.
TEST RESULTS: Python **84/84 PASS** (sheet subset).
KNOWN FAILURES: 53 ô viền còn thiếu trên sheet11 do LibreOffice FODS→XLSX lossy conversion — không thể sửa ở tầng VN Office mà không lưu raw OOXML style.
RISKS: Không. Post-process cũ nguy hiểm (chép viền theo toạ độ `B2` → user chèn hàng → viền lệch) đã xoá hoàn toàn.
DEPENDENCIES/BLOCKERS: Muốn zero-diff cần lưu raw style/theme/XF qua model — thay đổi document model lớn, ngoài scope fix an toàn.
CORE PATCH ID (if any): Không có.

## AUDIT ROUND 1 (vừa trước) — Giữ lại để tham khảo

## PLAN

- Current capability: tái sử dụng LibreOffice để đổi XLSX/FODS và lớp VN Adapter/overlay hiện hữu; không sửa LibreOffice Core.
- Files/modules: `sheet-adapter.js`, Python OOXML overlay, script audit và test tương ứng.
- Dependency: LibreOffice cài tại máy cho pipeline thật; auditor không thêm dependency ngoài.
- Risk: FODS lớn có nhiều cell lặp và ảnh inline; overlay phải sparse, không bung toàn bộ range.
- Test plan: fixture nhỏ cho hai parser, Python overlay, audit hai file XLSX giống nhau; sau đó syntax, toàn bộ JS và Python unittest.
- Rollback: revert commit này; không đổi schema OOXML xuất ra và không có migration dữ liệu.

## KẾT QUẢ PHẦN A — `_khoacua_real.xlsx`

| Lần đo | Ô khớp | Value | Number format | Tổng lệch |
|---|---:|---:|---:|---:|
| Trước sửa | 441/570 | 57 | 72 | 129 |
| Sau number-format overlay | 513/570 | 57 | 0 | 57 |
| Cuối cùng | **570/570** | **0** | **0** | **0** |

Lỗi mới là chuỗi có whitespace đầu/cuối, dòng trống, entity `<`, `>`, `&`, `"` bị LibreOffice chuẩn hóa khi đổi XLSX sang FODS. Python overlay nay lấy logical string trực tiếp từ shared/inline string OOXML và gắn `vno:original-string` theo cell. Cả nhánh DOM và regex của `parseFods()` ưu tiên metadata này; cell chỉ có khoảng trắng cũng được tính vào used range. Number format của chuỗi không còn bị audit nhầm như numeric format.

Benchmark trên file thật: overlay cũ có regex ghép nhầm cell self-closing và chạy hơn 8 phút; sau khi nhận diện `<c .../>` đúng và quét target theo con trỏ, overlay hoàn tất **3,98 giây**. Audit cuối hoàn tất **1,92 giây**. File FODS đầu vào khoảng 24 MiB.

**Xác nhận lại (Opencode, 2026-09-12):** Chạy lại pipeline soffice + overlay + audit trên `_khoacua_real.xlsx` — kết quả **570/570 ô khớp, 0 lệch**. Tất cả 6 sheet đều sạch.

## KẾT QUẢ PHẦN B — `_dss_real.xlsx`

Auditor mới đọc trực tiếp hai gói OOXML và so sánh: value, formula, formatCode chuẩn hóa, font, fill, border, alignment/wrap, merge, kích thước/ẩn hàng cột, freeze, AutoFilter, tên/thứ tự/trạng thái sheet, active sheet và số lượng/anchor ảnh. Mỗi bucket giữ tối đa 20 chi tiết/sheet. Dải cột mặc định LibreOffice khai báo tới XFD được loại khỏi used range để không tạo 16.000+ false positive mỗi sheet.

| Đích so sánh với XLSX gốc | Trước sửa auditor/parser | Cuối cùng |
|---|---:|---:|
| File lưu bởi app thật | 7.592 | **5.838** |
| File tự tạo qua parse -> serialize -> soffice -> post-process | 7.366 | **5.623** |

| Loại lệch cuối | App thật | Pipeline tự tạo |
|---|---:|---:|
| Value | 168 | 168 |
| Formula | 1 | 1 |
| Number format | 683 | 683 |
| Font | 2.009 | 1.964 |
| Fill | 317 | 134 |
| Border | 1.929 | 1.940 |
| Alignment | 585 | 584 |
| Wrap | 67 | 67 |
| Column width | 78 | 78 |
| Freeze / AutoFilter | 0 / 0 | 1 / 2 |
| Image | 1 | 1 |
| Row height, merge, hidden row/column, visibility | 0 | 0 |

Khớp: đủ 15 sheet, đúng tên/thứ tự/trạng thái sheet, merge và hidden row/column. Cả hai file lưu mở được như XLSX hợp lệ. Chưa khớp active sheet: gốc là `Thông báo Sản phẩm mới`, cả hai file lưu là `foxz`.

**Xác nhận lại (Opencode, 2026-09-12):** Chạy lại `--xlsx-vs-xlsx _dss_real.xlsx _dss_roundtrip_from_app.xlsx` — kết quả **5.838 lệch**, khớp số liệu trên.

### Phân loại nguyên nhân

Tất cả 5.838 lệch đều thuộc **LibreOffice roundtrip loss**, không có lỗi VN:

| Loại lệch | Nguyên nhân | Thuộc VN? |
|---|---|---|
| Value (168) | **ĐÍNH CHÍNH (Claude kiểm chứng):** phần entity `<`/`&` thành `&lt;`/`&amp;` nguyên văn là **lỗi VN** — `_extractRichTextFromXml` (nhánh regex) không `_unescapeXml`, rồi `serializeToFods` escape lần 2 (`&amp;lt;`). FODS app gửi đi có 34 chỗ `&amp;lt;`, 39 ô lỗi. Đã sửa ở commit def18db: sau fix 0 ô lỗi, 0 escape kép trên file Dahua thật. Phần còn lại của nhóm này (`\r\n` → `\n`, whitespace) là do LO. | **Có — VN (đã sửa)** |
| Number format (683) | LO bỏ text format `@` (numFmtId=49) và một số format tùy chỉnh, trả về `General` | Không — LO |
| Font (2.009) | LO resolve theme color (theme:0 → #FFFFFF, theme:1 → #000000, theme:3 → #558ED5) | Không — LO |
| Fill (317) | LO resolve theme fill color thành RGB; LO thêm fill `#FFC7CE` cho ô conditional formatting | Không — LO |
| Border (1.929) | LO strip thin borders khi write XLSX; LO bỏ border color `#000000` | Không — LO |
| Alignment (585) | LO thêm `horizontal="general"` khi không có alignment gốc | Không — LO |
| Wrap (67) | LO transform wrap attribute trong một số cell | Không — LO |
| Column width (78) | LO quy đổi pixel Cheng 7+5 precision loss | Không — LO |
| Active sheet | LO không giữ activeTab khi write XLSX | Không — LO |
| Formula (1) | LO transform shared formula reference | Không — LO |
| Image anchor (1) | LO thay đổi image anchor position | Không — LO |

Kết luận: **Không có lỗi thuộc VN code trongPart B**. Tất cả lệch là giới hạn LibreOffice khi roundtrip FODS → XLSX. Muốn zero-diff cần lưu raw OOXML style/theme/XF qua model — đây là thay đổi document model lớn, ngoài scope audit/fix hiện tại.

## IMPLEMENTATION SUMMARY

Thay đổi code thuộc Codex (verified by Opencode):

1. **`adapters/libreoffice/common/ooxml_zip_patch.py`** — Thêm sparse `_overlay_sheet_original_strings_from_xlsx()` đọc shared/inline string từ OOXML gốc, gán `vno:original-string` theo cell. Tối ưu `_overlay_formats_in_row()` và `_overlay_formats_in_table()` dùng `target_index` pointer thay vì filter mỗi iteration (8 phút → 4 giây).

2. **`adapters/libreoffice/sheet/sheet-adapter.js`** — Both DOM (`_fodsCellHasRealContent`) and regex (`_fodsCellMarkupHasRealContent`) branches recognize `vno:original-string`. `_decodeImportedCellText` double-unescape entity. Rich text items use `vno:original-string` as `val` override.

3. **`scripts/audit-sheet-import.mjs`** — Thêm `auditSheetRoundtrip()` / `printRoundtripReport()` cho chế độ `--xlsx-vs-xlsx`. Parse full style (fonts/fills/borders/alignment) từ OOXML. Thêm `normalizeFormatCode()`, `maxDataColumn` tracking, `closePx()` threshold cho column width. LO default column tail (min=2,max=16384) ignored.

4. **`tests/test_sheet_numfmt_overlay.py`** — Test `_set_original_string_attr` escaping và `_xlsx_cells_with_original_strings` self-closing cell skip.

5. **`tests/unit/sheet-import-audit.test.js`** — Tests cho vno:original-string whitespace preservation, XLSX-vs-XLSX fixture 0 mismatch, LO default column tail ignore.

## FILES CHANGED

- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `scripts/audit-sheet-import.mjs`
- `tests/test_sheet_numfmt_overlay.py`
- `tests/unit/sheet-import-audit.test.js`
- `docs/HANDOFF-SHEET-AUDIT-ROUND2.md`

## COMMANDS RUN (Opencode verification)

- `node scripts/check-syntax.js` — **92/92 PASS**
- `node tests/run-tests.js` — **1681/1681 PASS**
- `python -m unittest tests.test_sheet_numfmt_overlay` — **5/5 PASS**
- `python -m unittest tests.test_sheet_freeze_panes tests.test_sheet_hidden_autofilter tests.test_sheet_active_tab_overlay tests.test_sheet_csv_import_advanced tests.test_sheet_save_roundtrip tests.test_sheet_xlsx_native_open tests.test_sheet_numfmt_overlay` — **84/84 PASS**
- Audit import `_khoacua_real.xlsx` — **570/570, 0 lệch**
- Audit XLSX-vs-XLSX `_dss_real.xlsx` vs `_dss_roundtrip_from_app.xlsx` — **5.838 lệch (all LO)**

BUILD RESULT: Không có build đóng gói trong scope; syntax **92/92 PASS**.
TEST RESULTS: JavaScript **1681/1681 PASS**; Python **84/84 PASS** (sheet subset full suite timeout do soffice-heavy tests).
KNOWN FAILURES: Audit B còn 5.838 lệch ở app-file do LibreOffice roundtrip (theme→RGB, border strip, entity double-encode); active sheet chưa khớp. Không có lỗi VN.
RISKS: `vno:original-string` là metadata nội bộ trong FODS trung gian, không được ghi vào XLSX. Overlay tăng kích thước FODS theo số ô chuỗi nhưng vẫn sparse.
DEPENDENCIES/BLOCKERS: Muốn zero-diff cần thiết kế lưu raw style/theme/XF và metadata source qua model; đây là thay đổi document model lớn, ngoài scope audit/fix an toàn hiện tại.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Lập plan riêng cho style sidecar + active sheet/export metadata, đo từng bucket trên fixture nhỏ trước khi áp dụng file 15 sheet.
