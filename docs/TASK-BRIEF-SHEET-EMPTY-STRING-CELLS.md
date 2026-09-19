# Brief S13 — Ô chuỗi rỗng ("") của XLSX gốc bị mất khi lưu

## Số đo (batch LAN vòng 5, 19/9/2026, `docs/MA-TRAN-SHEET-2026-09-19.md`)

| File | Lệch | Lớp |
|---|---|---|
| lan25 | 686 font + 686 alignment | ô U2, V2, Y2, Z2… : gốc `<c r="U2" t="s"><v>29</v></c>` với `<si><t/></si>` (chuỗi rỗng), file lưu KHÔNG có ô |
| lan20 | 20 font (Trebuchet MS 9 → {}) + 20 alignment | cùng lớp |
| lan15 | 2 font | cùng lớp |

Auditor coi ô chuỗi rỗng là ô thật (Excel: `ISBLANK` = FALSE, `COUNTA` đếm, Ctrl+End tới ô đó) — xem
`scripts/audit-sheet-import.mjs` dòng "A cell whose string resolves to "" IS kept".

## Nguyên nhân đã đo (không phải suy đoán)

1. soffice XLSX→FODS **bỏ** ô chuỗi rỗng khi nhập: `_cell_probe.py lan25 1 U2` cho
   `LO FODS: <table:table-cell table:number-columns-repeated="7"/>` (ô trống gộp), nên app không bao giờ thấy ô.
2. soffice FODS→XLSX **giữ** ô chuỗi rỗng khi xuất (đo `scratchpad/empty.fods`: `<table:table-cell office:value-type="string"><text:p/></table:table-cell>`
   → `<c r="B1" s="0" t="s"><v>1</v></c>` với `<si><t xml:space="preserve"></t></si>`). Vậy chỉ cần khôi phục ở
   phía nhập HOẶC hậu xử lý.

## Yêu cầu

Chọn **hậu xử lý** (như S9, `_restore_hidden_columns_and_rows_step` trong
`adapters/libreoffice/common/ooxml_zip_patch.py`), vì không đụng model JS:

1. Trong `postprocess_sheet_xlsx`, thêm bước `_restore_empty_string_cells_step(xlsx_bytes, source_xlsx_bytes, replacements)`
   chạy SAU S8 (`_restore_original_xf_for_vno_cells`) và S9.
2. Với từng sheet có trong cả hai file: liệt kê ô gốc có `t="s"` trỏ tới shared string rỗng (`<si><t/></si>`,
   `<si><t xml:space="preserve"></t></si>`, hoặc `<si><r>…</r></si>` mà mọi `<t>` rỗng) hoặc `t="inlineStr"` rỗng.
3. Nếu ô đó **không có** trong `<sheetData>` của file lưu (hoặc có nhưng tự đóng `<c r=".." s=".."/>` không giá trị):
   chèn/thay bằng `<c r="U2" s="<idx>" t="s"><v>N</v></c>`, trong đó
   - `N` = chỉ số một `<si><t xml:space="preserve"></t></si>` trong `xl/sharedStrings.xml` của file lưu (thêm mới nếu chưa có;
     cập nhật `count`/`uniqueCount`);
   - `<idx>` = xf tương ứng: nếu ô gốc có `s=`, dùng cùng cơ chế chép xf gốc của S8 (tách phần "chép xf src_idx → new_idx"
     của `_restore_original_xf_for_vno_cells` thành hàm dùng chung, KHÔNG copy-paste); nếu không có `s=` thì bỏ `s`.
   - Dòng chưa có `<row r="N">` thì tạo dòng, giữ thứ tự tăng dần của `r` (dòng và ô), như S9 đã làm với dòng ẩn.
4. Ô đã có giá trị trong file lưu (người dùng gõ vào) thì KHÔNG đụng.
5. Không được làm chậm: một lượt quét `re.sub`/`finditer` cho cả sheet, KHÔNG `re.sub` từng ô trên toàn bộ sheet XML
   (lan09 từng mất >20 phút vì lỗi này, sửa ở 5db873f).

## Nghiệm thu (tôi sẽ đo lại, không nhận báo cáo suông)

- `python -m unittest discover -s tests -p "test_sheet*.py"` PASS, thêm `tests/test_sheet_empty_string_cells.py`
  (fixture nhỏ: sharedStrings có `<si><t/></si>`, ô gốc `U2`, file LibreOffice không có ô; kiểm tra chèn đúng vị trí,
  đúng `t="s"`, sharedStrings count; ô đã có giá trị không bị ghi đè; xf được chép khi có `s=`).
- `node tests/run-tests.js` không hồi quy (1775/1775).
- `python scripts/layout-audit/_batch_audit.py . lan25.xlsx lan20.xlsx lan15.xlsx` trong worktree:
  lan25 font/alignment 686 → 0, lan20 font 56 → ≤ 36, Excel mở OK (`_excel_open_test.ps1`).
- Ghi quy ước S13 vào `docs/QUY-UOC-DOI-CHIEU.md` (bảng Sheet), không ghi tên file thật.
