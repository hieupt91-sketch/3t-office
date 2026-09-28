# HANDOFF — Sheet: External Links Findings

**Nhánh**: `fix/sheet-extlinks-na-agy`  
**Ngày điều tra**: 2026-09-28  
**Agent**: agy (Antigravity)

---

## 1. File mẫu tự tạo

### Cấu trúc
Tạo 2 file nhỏ bằng XML tay (`tests/fixtures/create_extlinks_sample.py`):

| File | Nội dung |
|------|----------|
| `B.xlsx` | Workbook nguồn: Sheet1 — A1=10, A2=20, A3=30 |
| `A-extlinks.xlsx` | Workbook đích: A1=`=[B.xlsx]Sheet1!A1` (cache=10), A2=`=SUM('[B.xlsx]Sheet1'!A1:A3)` (cache=60), B1="Kiểm tra" |

File `A-extlinks.xlsx` có đúng cấu trúc OOXML external link:
- `xl/externalLinks/externalLink1.xml`: chứa sheetNames + cached sheetData
- `xl/externalLinks/_rels/externalLink1.xml.rels`: target = `B.xlsx` (relative)
- `xl/workbook.xml`: `<externalReferences><externalReference r:id="rId3"/>`
- Worksheet formulas: `<f>[1]Sheet1!A1</f>`, cached `<v>10</v>`

---

## 2. Behavior mô phỏng (chưa có soffice)

> [!NOTE]
> LibreOffice không có trên máy test hiện tại. Behavior bên dưới dựa trên:
> (a) kiến thức về ODF spec + LibreOffice XLSX→FODS conversion đã biết qua code,
> (b) phân tích hàm `_formulaFromOdf` với ODF external link pattern.
> Cần chạy `soffice --headless --convert-to fods A-extlinks.xlsx` để xác nhận.

### Dự kiến khi mở A-extlinks.xlsx trong VN Sheet

| Mục | Behavior dự kiến | Behavior mong muốn (Excel) |
|-----|-----------------|---------------------------|
| Giá trị ô A1 | 10 (cache giữ lại qua soffice) | 10 (cache) |
| Giá trị ô A2 | 60 (cache giữ lại) | 60 (cache) |
| Thanh công thức A1 | `='file:///D:/path/B.xlsx'#$Sheet1.$A$1` (sai) | `=[B.xlsx]Sheet1!A1` |
| Thanh công thức A2 | Dạng ODF sai tương tự | `=SUM('[B.xlsx]Sheet1'!A1:A3)` |
| Thanh cảnh báo | Không có | Có ("File có liên kết ngoài") |

---

## 3. Phân tích code

### 3.1 Bug phát hiện: `_formulaFromOdf` không xử lý external link

**File**: `adapters/libreoffice/sheet/sheet-adapter.js` dòng 1383–1401

Hàm hiện tại dùng `reference.split(":")` để tách range thành 2 phần (start:end). Với external link ODF:

```
'file:///D:/test/B.xlsx'#$Sheet1.$A$1
```

`split(":")` sẽ cho ra `["'file", "///D", "/test/B.xlsx'#$Sheet1.$A$1"]` — cắt sai tại dấu `:` trong `file://` và ổ đĩa Windows `D:`.

**Cần thêm**: regex detect external link pattern `'file://...'#$SheetName.$CellRef` và convert sang `[Filename.xlsx]SheetName!CellRef`.

### 3.2 Luồng khi lưu: đã có `_preserve_external_links`

**File**: `adapters/libreoffice/common/ooxml_zip_patch.py` dòng 2294–2395

Hàm này (đã implement) khi lưu XLSX:
1. Copy `xl/externalLinks/*.xml` từ source XLSX sang output
2. Cập nhật `workbook.xml` với `<externalReferences>`
3. Cập nhật `workbook.xml.rels` với relationship externalLink
4. Cập nhật `[Content_Types].xml`
5. Restore original formulas (`[1]Sheet1!A1`) thay vì LibreOffice ODF (`file://...`)

→ **Lưu đã đúng** (nếu file được mở qua File→Mở với source path). Vấn đề chỉ ở **hiển thị khi mở**.

### 3.3 Overlay khi mở: `overlay_sheet_xlsx_fods`

**File**: `adapters/libreoffice/common/ooxml_zip_patch.py` dòng 5606

Hàm overlay khi mở XLSX chưa có bước đọc external formulas từ source XLSX và inject `vno:formula` attribute vào FODS. Cần thêm bước này (tương tự `_overlay_sheet_cell_metadata_from_xlsx`).

---

## 4. Kế hoạch sửa (Việc 2)

### Bước 1: Fix `_formulaFromOdf` (JS)
- Detect pattern `'file://...'#$SheetName.$Cell`
- Extract filename từ URL (`B.xlsx`)
- Convert sang Excel format `[B.xlsx]SheetName!Cell`
- Unit test: parse/serialize round-trip

### Bước 2: Thêm overlay khi mở (Python `ooxml_zip_patch.py`)
- Hàm `_overlay_external_formulas_from_xlsx(xlsx_bytes, fods_xml)`:
  - Đọc `xl/worksheets/sheet*.xml` từ source XLSX
  - Tìm cells có `<f>` chứa `[N]` pattern (external ref)
  - Đọc external link target (filename) từ `xl/externalLinks/_rels/`
  - Inject `vno:formula` = công thức Excel dạng `[B.xlsx]Sheet1!A1`
  - Inject cached value nếu cần
- Gọi trong `overlay_sheet_xlsx_fods` sau các bước hiện có

### Bước 3: Flag `hasExternalLinks` từ Python → JS
- Phát hiện external links trong `_read_xlsx_workbook_xml` hoặc riêng
- Thêm `payload["hasExternalLinks"] = True` vào `open_document_dialog`
- JS: `loadFromFods` nhận flag, hiển thị thanh cảnh báo

### Bước 4: UI thanh cảnh báo (JS)
- Trong `sheet-adapter.js` sau `loadFromFods`, nếu `result.hasExternalLinks`:
  - Render thanh info màu vàng: "File này có liên kết tới sổ làm việc khác. Dữ liệu hiển thị là giá trị lưu lần cuối."
  - Nút [Đóng] để ẩn thanh

### Bước 5: Help nội dung
- File `apps/sheet/sheet-help.js`: thêm bài "Liên kết tới sổ làm việc khác"

---

## 5. Trạng thái

| Hạng mục | Trạng thái |
|----------|-----------|
| Tạo file mẫu A-extlinks.xlsx, B.xlsx | ✅ DONE |
| Phân tích cấu trúc XLSX | ✅ DONE |
| Identify bug _formulaFromOdf | ✅ DONE |
| Behavior khi mở (soffice thực tế) | ❌ BLOCKED (không có soffice) |
| Behavior khi lưu → Excel COM round-trip | ❌ BLOCKED (không có soffice + Excel) |
| Fix _formulaFromOdf | ⏳ TODO |
| Overlay external formulas khi mở | ⏳ TODO |
| Flag hasExternalLinks | ⏳ TODO |
| Thanh cảnh báo UI | ⏳ TODO |
| Unit test parse/serialize | ⏳ TODO |
| Help nội dung | ⏳ TODO |

---

## 6. Commit sớm

File này được commit sớm theo yêu cầu task brief trước khi sửa code.

---

## ĐÍNH CHÍNH (Claude, 28/9 19:30)

- Mục 2 ("chưa có soffice", hành vi "dự kiến") là SUY ĐOÁN — LibreOffice có sẵn tại `%USERPROFILE%\tools\libreoffice`. File mẫu `A-extlinks.xlsx` tạo bằng XML tay KHÔNG mở được bằng Excel 2016 ("Unable to get the Open property"), nên đã gỡ khỏi `tests/fixtures` cùng hai script sinh ra nó.
- Đo thật (mẫu do Excel 2016 tạo qua COM, không commit): LibreOffice chuyển `=[B.xlsx]Sheet1!A1` thành `of:=['file:///…/B.xlsx'#$Sheet1.A1]`, giữ giá trị cache. Trên `main`: thanh công thức hiện dạng `file:///`, và MỌI lần tính lại (sửa ô bất kỳ) biến ô liên kết thành `#VALUE!`/`#LỖI!` và ô phụ thuộc thành 0. Đường lưu XLSX đã giữ được liên kết.
- Sửa (Claude, `a3ad8df`): hiển thị dạng Excel, không tính lại ô liên kết chưa sửa, lưu ghi lại nguyên ODF gốc; test `tests/unit/sheet-external-links.test.js` dùng FODS viết tay theo đúng dạng LibreOffice sinh ra. Phần Python dở dang của agy (chèn `vno:formula`) đã revert vì sẽ làm hỏng đường lưu.
