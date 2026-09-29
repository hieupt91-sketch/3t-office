# Báo cáo chẩn đoán: Giữ kiểu bao chữ "Square" của ảnh khi lưu .doc (Writer)

**Mã task:** `TASK-BRIEF-WRITER-DOC-SQUARE-WRAP-AGY`  
**Nhánh:** `fix/writer-doc-square-wrap-agy`  
**Worktree:** `E:\VNOffice-agy-doc-wrap`  
**Ngày thực hiện:** 29/09/2026  

---

## 1. Hiện tượng & Vấn đề

Tệp `legacy13.doc` (`E:\VN OFice\file test\lan-legacy\legacy13.doc`, gitignored):
- **Tệp Word gốc:**
  - Số trang: **1 trang** (Word COM `doc.Content.Information(4) = 1`).
  - Hình ảnh duy nhất: `Picture 3`, loại hình `Type = 13` (`msoPicture`).
  - Kiểu bao chữ: `WrapFormat.Type = 0` (`wdWrapSquare`), `WrapFormat.Side = 2` (`wdWrapRight`), neo trang `Page = 1`.
- **Bản lưu .doc qua luồng xuất hiện tại (main):**
  - Số trang: **2 trang** (Word COM `doc.Content.Information(4) = 2`).
  - Hình ảnh: `Picture 2`, loại hình `Type = 13`.
  - Kiểu bao chữ: `WrapFormat.Type = 4` (`wdWrapTopBottom`), `WrapFormat.Side = 0`, neo trang `Page = 1`.
  - **Hậu quả:** Kiểu bao chữ Square bị đổi thành TopBottom, toàn bộ khối văn bản phía sau bị đẩy xuống dưới ảnh làm tài liệu tràn sang trang 2.

---

## 2. Tái hiện bằng DOCX tối thiểu & Đo đạc thực nghiệm (16 biến thể)

Để chẩn đoán chính xác nguyên nhân bộ lọc `MS Word 97` của LibreOffice đổi Square sang TopBottom, một bộ sinh DOCX tối thiểu hợp lệ (`scratch_minimal_docx.py`) chứa 1 ảnh PNG 1×1 và đoạn văn bản đã được xây dựng và xuất sang `.doc` bằng lệnh `soffice --headless --convert-to doc:"MS Word 97"`.

Kết quả đo bằng Word COM thực tế trên 16 biến thể (`scratch_variants/*.doc`):

| STT | Biến thể | Cấu trúc neo & wrap trong DOCX | Word COM WrapFormat.Type | Word COM WrapFormat.Side | Kết quả giữ Square? |
|-----|----------|--------------------------------|--------------------------|--------------------------|----------------------|
| 01 | `01_square_bare_in_text_p` | `<wp:wrapSquare/>` (trần, không thuộc tính) cùng đoạn chữ | **4 (TopBottom)** | 0 | ❌ **Mất Square** (Tái hiện lỗi) |
| 02 | `02_square_bothSides_in_text_p` | `<wp:wrapSquare wrapText="bothSides"/>` cùng đoạn chữ | **0 (Square)** | 0 (Both) |  **GIỮ SQUARE** |
| 03 | `03_square_largest_in_text_p` | `<wp:wrapSquare wrapText="largest"/>` cùng đoạn chữ | **0 (Square)** | 3 (Largest) |  **GIỮ SQUARE** |
| 04 | `04_square_right_in_text_p` | `<wp:wrapSquare wrapText="right"/>` cùng đoạn chữ | **0 (Square)** | 2 (Right) |  **GIỮ SQUARE** |
| 05 | `05_square_left_in_text_p` | `<wp:wrapSquare wrapText="left"/>` cùng đoạn chữ | **0 (Square)** | 1 (Left) |  **GIỮ SQUARE** |
| 06 | `06_separate_p_bare_square` | `<wp:wrapSquare/>` trần tách đoạn riêng | **4 (TopBottom)** | 0 | ❌ **Mất Square** |
| 07 | `07_separate_p_wrap_right` | `<wp:wrapSquare wrapText="right"/>` tách đoạn riêng | **0 (Square)** | 2 (Right) |  **GIỮ SQUARE** |
| 08 | `08_separate_p_wrap_bothSides`| `<wp:wrapSquare wrapText="bothSides"/>` tách đoạn riêng | **0 (Square)** | 0 (Both) |  **GIỮ SQUARE** |
| 09 | `09_layoutInCell_1` | `layoutInCell="1"` với `<wp:wrapSquare/>` trần | **4 (TopBottom)** | 0 | ❌ Mất Square |
| 10 | `10_behindDoc_1` | `behindDoc="1"` với `<wp:wrapSquare/>` trần | **4 (TopBottom)** | 0 | ❌ Mất Square |
| 11 | `11_relativeFrom_page` | `relativeFrom="page"` với `<wp:wrapSquare/>` trần | **4 (TopBottom)** | 0 | ❌ Mất Square |
| 12 | `12_relativeFrom_margin` | `relativeFrom="margin"` với `<wp:wrapSquare/>` trần | **4 (TopBottom)** | 0 | ❌ Mất Square |
| 13 | `13_vml_square_in_text_p` | VML `<w10:wrap type="square"/>` cùng đoạn chữ | **0 (Square)** | 0 (Both) |  **GIỮ SQUARE** |
| 14 | `14_vml_square_separate_p` | VML `<w10:wrap type="square"/>` tách đoạn riêng | **0 (Square)** | 0 (Both) |  **GIỮ SQUARE** |
| 15 | `15_vml_square_side_largest` | VML `<w10:wrap type="square" side="largest"/>` | **0 (Square)** | 0 (Both) |  **GIỮ SQUARE** |
| 16 | `16_vml_square_side_right` | VML `<w10:wrap type="square" side="right"/>` | **0 (Square)** | 2 (Right) |  **GIỮ SQUARE** |

### Phát hiện cốt lõi (Root Cause):
1. **Bộ lọc `MS Word 97` của LibreOffice:**
   - Khi gặp thẻ `<wp:wrapSquare/>` **không có thuộc tính `wrapText`**, bộ lọc không nhận diện được phía bao chữ hợp lệ nên tự động fallback về TopBottom (`WrapFormat.Type = 4`).
   - Khi có thuộc tính `wrapText` (ví dụ `wrapText="bothSides"`, `wrapText="right"`, `wrapText="largest"`, `wrapText="left"`), bộ lọc `MS Word 97` ghi đúng record Escher/WW8 cho Square wrap (`WrapFormat.Type = 0`) với đúng side tương ứng!
   - Định dạng VML (`<w10:wrap type="square"/>`) cũng giữ Square wrap (`WrapFormat.Type = 0`).

2. **Nguyên nhân trong codebase của VN Office:**
   - Khi LibreOffice chuyển `legacy13.doc` sang `source_docx`, thẻ neo có:
     `<wp:wrapSquare wrapText="right"/>`.
   - Trong `adapters/libreoffice/common/ooxml_zip_patch.py`, hàm `_restore_writer_anchor_properties`:
     - Dòng 8418: Chỉ trích xuất tên thẻ bao chữ (`props["wrap"] = "wrapSquare"`), bỏ qua toàn bộ thuộc tính `wrapText`.
     - Dòng 8449: Thay thế thẻ wrap cũ bằng `f'<wp:{props["wrap"]}/>'`, biến `<wp:wrapSquare wrapText="right"/>` thành `<wp:wrapSquare/>` trần.
   - Do thẻ `wrapSquare` bị mất `wrapText`, khi đi qua bộ lọc `MS Word 97` để xuất `.doc`, LibreOffice đã biến nó thành TopBottom.

---

## 3. Kiểm chứng thực tế trên `legacy13.doc`

Đã thử nghiệm bổ sung/giữ thuộc tính `wrapText="right"` trên file trung gian của `legacy13.doc` trước khi gọi `MS Word 97`:
- **File kết quả:** `scratch_legacy13_wrap_test.doc`
- **Kết quả đo Word COM:**
  - Số trang: **1 trang** (khớp hoàn toàn bản gốc!).
  - Shape: `Picture 2`, `Type = 13`, `WrapFormat.Type = 0` (`wdWrapSquare`), `WrapFormat.Side = 2` (`wdWrapRight`), neo trang 1.
  - Văn bản bao quanh ảnh đúng như Word gốc.

---

## 4. Kế hoạch sửa đổi (Action Plan)

1. **Trong `adapters/libreoffice/common/ooxml_zip_patch.py`:**
   - Trong `_writer_anchor_properties` và `_restore_writer_anchor_properties`: lưu và khôi phục toàn bộ thuộc tính của thẻ wrap (bao gồm `wrapText="..."` và các thuộc tính liên quan) thay vì chỉ thay thế thẻ rỗng `f'<wp:{props["wrap"]}/>'`.
   - Trong `prepare_writer_docx_for_legacy_doc_export`: bổ sung bước chuẩn hóa: bất kỳ thẻ `<wp:wrapSquare>` nào chưa có thuộc tính `wrapText` sẽ được gán giá trị chuẩn OOXML mặc định là `wrapText="bothSides"` (hoặc giữ nguyên nếu đã có `wrapText`).
2. **Kiểm chứng và hồi quy:**
   - Đo lại `legacy13.doc`: đảm bảo `WrapFormat.Type = 0` và số trang = 1.
   - Chạy 20 tệp legacy (`legacy01` - `legacy20`): đảm bảo Word mở được 20/20, số trang không tệ hơn `main`.
   - Chạy `_word_shape_pages.ps1`: đảm bảo số hình $\ge$ gốc.
   - Chạy 5 tệp DOCX có hình (`d04`, `d06`, `d07`, `d09`, `d24`): đảm bảo 0 lệch.
   - Chạy test suites: `node tests/run-tests.js` và `python -m unittest discover -s tests`.
