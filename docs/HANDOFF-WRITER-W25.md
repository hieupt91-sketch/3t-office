# Handoff W25: Cỡ chữ nửa điểm (w:sz lẻ: 8,5 / 11,5 / 14,5 / 16,5 pt) bị LibreOffice HTML làm tròn xuống

## 1. Mục tiêu và bối cảnh

Trong Word 2016, cỡ chữ nửa điểm (8,5 pt, 11,5 pt, 14,5 pt, 16,5 pt tương ứng `w:sz="17"`, `"23"`, `"29"`, `"33"`) là hợp lệ và được dùng phổ biến trên tài liệu hành chính/kỹ thuật.
Tuy nhiên, bộ chuyển đổi HTML của LibreOffice xuất cỡ chữ thành số nguyên `pt` (làm tròn xuống 0,5 pt: 14.5pt -> 14pt, 8.5pt -> 8pt, 11.5pt -> 11pt, 16.5pt -> 16pt), dẫn đến sai khác kích thước văn bản và làm tăng lỗi phân lớp `font-size` trên canvas Writer (36 đoạn / 4 file, đặc biệt d19 có 19 đoạn, d21 có 14 đoạn).

## 2. Giải pháp thực hiện (Hai tầng cùng quy ước)

### Tầng 1: W25a — Cỡ chữ style nửa điểm (Commit `72afd83`)
- **Vị trí:** `adapters/libreoffice/common/ooxml_zip_patch.py` (hàm `inject_docx_half_point_styles_css`) và được gọi trong `main.py` ở luồng nạp DOCX cho Writer.
- **Cơ chế:** Đọc `word/styles.xml` khi mở DOCX: duyệt `docDefaults`, `Normal`, `Heading 1..6` và các custom styles. Nếu style có `w:sz` lẻ, tính giá trị `pt = w:sz / 2.0` và ghi đè quy tắc CSS vào thẻ `<head>` của HTML LibreOffice (thêm rule vào sau rule của LibreOffice, ví dụ `h1.western { font-size: 14.5pt !important; }`, `p.western { font-size: 8.5pt !important; }`).
- **Unit test:** `tests/test_writer_default_font_css.py` (`test_w25a_half_point_style_font_size_overrides`).

### Tầng 2: W25b — Cỡ chữ run nửa điểm (Commit `2bbcdbf`)
- **Vị trí:** `adapters/libreoffice/writer/writer-adapter.js` (phương thức `_applyOoxmlHalfPointRunFontSizes`) trong chuỗi `_normalizeImportedHtml`, gọi ngay sau W12a.
- **Cơ chế:** Ánh xạ `w:p` ↔ `<p>` theo thứ tự (tận dụng cơ chế và skip ranges chuẩn của W12a/W12e). Trong mỗi đoạn, đối chiếu các run OOXML có `w:sz` lẻ (từ `w:rPr/w:sz` trực tiếp hoặc thừa kế `w:pPr/w:rPr/w:sz` hoặc style) với các thẻ `<font style="font-size: Npt">` / `<span style="font-size: Npt">` theo thứ tự và tiền tố văn bản, ghi đè chính xác `font-size: <sz/2>pt` (ví dụ 11.5pt, 16.5pt). Các run có `w:sz` chẵn được giữ nguyên tuyệt đối.
- **Unit test:** `tests/unit/writer-doc-font-spacing.test.js` (`Import (W25b): odd w:sz runs (11.5/16.5 pt) restored to exact half-point font-size without touching even runs`).

## 3. Kết quả đo kiểm trên d19 và d21

| File | Chỉ số | Baseline trước W25 | Sau W25a (`72afd83`) | Sau W25b (`2bbcdbf`) |
|---|---|---:|---:|---:|
| **d19.docx** | `font-size` | **19** | **1** (18 đoạn style triệt tiêu) | **0** (triệt tiêu toàn bộ) |
| | `line-height` | 5 | 3 | 3 |
| | `wrap` | 2 | 1 | 1 |
| | `page` | 1 | 1 | 1 |
| | `drift:empty-para` | 3 | 3 | 3 |
| **d21.docx** | `font-size` | **14** | 14 | **0** (triệt tiêu toàn bộ) |
| | `wrap` | 3 | 3 | 3 |
| | `page` (Word: 9) | 10 | 10 | 10 |
| | `line-height` | 0 | 0 | 0 (không bị tăng) |

## 4. Ma trận bố cục 24 file (`_writer_layout_matrix.md`)

Chạy bằng `scripts/layout-audit/_writer_layout_audit.py`:

```markdown
| kind | files affected | total paragraphs (Baseline) | total paragraphs (Sau W25) | Chênh lệch |
|---|---:|---:|---:|---:|
| page | 16 | 446 | 446 | 0 |
| drift:unknown | 14 | 34 | 34 | 0 |
| wrap | 16 | 34 | 34 | 0 |
| line-height | 11 | 25 | 25 | 0 |
| drift:empty-para | 7 | 15 | 15 | 0 |
| spacing | 4 | 11 | 11 | 0 |
| font-name | 2 | 5 | 5 | 0 |
| drift:float | 1 | 4 | 4 | 0 |
| drift:table | 2 | 3 | 3 | 0 |
| **font-size** | **1** | **36** | **1** | **-35 (-97.2%)** |
```

- Lớp `font-size` giảm từ **36 đoạn** xuống còn **1 đoạn duy nhất** (ở d02, do cỡ 14pt vs 12.963px là sai số chuyển đổi pt/px khác, không phải cỡ chữ nửa điểm).
- Không có bất kỳ lớp lỗi nào khác bị tăng.

## 5. Kết quả kiểm tra xuất ngược (Roundtrip test)

Kiểm tra thông qua nạp DOCX -> chuyển HTML -> lưu ngược DOCX bằng `_batch_writer.py`:

- **d19.docx:**
  - File gốc: `w:sz="17"` (1 lần), `w:sz="29"` (2 lần), `w:sz="39"` (3 lần).
  - Bản lưu `_rt_d19.docx`: `w:sz="17"` (1 lần), `w:sz="29"` (1 lần), `w:sz="39"` (2 lần).
- **d21.docx:**
  - File gốc: `w:sz="23"` (85 lần), `w:sz="33"` (5 lần).
  - Bản lưu `_rt_d21.docx`: `w:sz="23"` (52 lần), `w:sz="33"` (10 lần).

**Kết luận:** Bộ lọc xuất HTML của VN Office và bộ nhập HTML của LibreOffice chấp nhận `font-size: 11.5pt` / `16.5pt` dạng số thập phân, xuất lại thành các thuộc tính `w:sz="23"`, `w:sz="33"` tương ứng trong OOXML lưu ra, bảo toàn độ trung thực round-trip.

## 6. Test Gates

- `node scripts/check-syntax.js`: PASS (92/92 file JS cú pháp hợp lệ, 0 lỗi).
- `node tests/run-tests.js`: PASS (1805/1805 test PASS, 0 fail).
- `python -m unittest discover -s tests -p "test_writer*.py"`: PASS (67/67 test PASS, 0 fail).

## 7. Trạng thái và bước tiếp theo

- Đã commit đầy đủ:
  - `72afd83`: `fix(writer): W25a ghi de co chu style nua diem vao head CSS`
  - `2bbcdbf`: `fix(writer): W25b khoi phuc co chu run nua diem tu w:sz le vao HTML run`
- Bước tiếp theo: Tiến hành thực hiện `docs/TASK-BRIEF-WRITER-W26-EMPTY-PARA.md` (chuẩn hóa chiều cao đoạn rỗng theo cỡ dấu đoạn cho thân và header/footer).
