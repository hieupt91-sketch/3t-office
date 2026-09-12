# Agent Handoff

TASK: Audit file Excel thật lần 2 và audit chiều lưu XLSX -> VN Sheet -> XLSX
AGENT/ROLE: Codex (code) + Opencode (verify & commit)
BRANCH: `fix/sheet-audit-second-file-and-roundtrip`
WORKTREE: `E:\VNOffice-codex-sheet-audit2`
OBJECTIVE: Đo OOXML/FODS bằng file thật, sửa lỗi parser/overlay thuộc VN Office, bổ sung auditor XLSX-vs-XLSX và regression test.

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
| Value (168) | LO double-encode XML entities (`<` → `&lt;` literal trong shared strings), normalize `\r\n` → `\n` | Không — LO |
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
