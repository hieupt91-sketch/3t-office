# Chẩn đoán nguyên nhân mất đường kẻ (Line) khi mở và lưu .doc trong VN Writer

**Người thực hiện**: Antigravity (agy)  
**Nhánh**: `fix/writer-doc-lines-agy`  
**Worktree**: `E:\VNOffice-agy-doc-lines`  
**Ngày thực hiện**: 2026-09-29  

---

## 1. Hiện tượng & Vấn đề

Theo kết quả kiểm tra `_word_shape_pages.ps1 -Source <gốc .doc> -Saved <bản lưu .doc>` trên tập mẫu `E:\VN OFice\file test\lan-legacy\`:
- `legacy06.doc`: Gốc có 1 hình `Line 13` (trang 1, Type 9 - msoLine) → Bản lưu có 0 hình.
- `legacy17.doc`: Gốc có 1 hình `Line 115` (trang 1, Type 9 - msoLine) → Bản lưu có 0 hình.
- `legacy18.doc`: Gốc có 1 hình `Line 115` (trang 1, Type 9 - msoLine) → Bản lưu có 0 hình.

Các tệp còn lại trong 20 tệp legacy:
- `legacy01` đến `legacy05`, `legacy07` đến `legacy12`, `legacy14` đến `legacy16`, `legacy19`: Gốc 0 hình → Bản lưu 0 hình.
- `legacy13`: Gốc có 1 hình `Picture 3`, bản lưu có 1 hình (chỉ đổi tên).
- `legacy20`: Gốc có 2 hình (`Line 3`, `Text Box 2`), bản lưu có 2 hình (chỉ đổi tên).

Như vậy, `legacy06.doc`, `legacy17.doc`, `legacy18.doc` là 3 tệp duy nhất bị mất hoàn toàn đường kẻ (tỷ lệ mất hình: 100% trên các tệp này). Đường kẻ trong văn bản hành chính Việt Nam là gạch dưới quốc hiệu/tiêu ngữ hoặc chỗ ký tên — việc mất hình dẫn đến mất dữ liệu trực quan quan trọng của văn bản.

---

## 2. Truy vết chi tiết từng bước trong pipeline

### Bước 1: Mở `.doc` → Chuẩn hóa DOCX trung gian (`legacy-docx/*.docx`)
- **Cơ chế**: Trong `main.py` (`open_document_dialog`, dòng 1063–1072), khi người dùng mở tệp `.doc`:
  ```python
  if app_kind == "writer" and src_path.lower().endswith(".doc"):
      legacy_docx_dir = os.path.join(tmp, "legacy-docx")
      os.makedirs(legacy_docx_dir, exist_ok=True)
      convert_src_path = _run_soffice_convert(
          src_path, "docx", legacy_docx_dir, app_kind=app_kind
      )
  ```
- **Kết quả kiểm tra thực tế**:
  Trích xuất `word/document.xml` từ file DOCX trung gian (`legacy06.docx`):
  ```xml
  <mc:AlternateContent>
    <mc:Choice Requires="wps">
      <w:drawing>
        <wp:anchor ...>
          ...
          <wp:docPr id="1" name=""></wp:docPr>
          <a:graphic ...>
            <wps:wsp>
              ...
              <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
              ...
            </wps:wsp>
          </a:graphic>
        </wp:anchor>
      </w:drawing>
    </mc:Choice>
    <mc:Fallback>
      <w:pict>
        <v:line id="shape_0" from="178.8pt,16.35pt" to="325.9pt,16.35pt" stroked="t" .../>
      </w:pict>
    </mc:Fallback>
  </mc:AlternateContent>
  ```
  - **Đánh giá**: Bước 1 **KHÔNG LÀM MẤT ĐƯỜNG KẺ**. LibreOffice chuyển đổi binary `.doc` sang DOCX giữ nguyên vẹn đường kẻ dưới cả hai dạng: DrawingML `<wps:wsp>` (trong `mc:Choice`) và VML `<v:line>` (trong `mc:Fallback`).
  - **Điểm lưu ý cốt lõi**: Thuộc tính tên đối tượng trong `wp:docPr` là **chuỗi rỗng** (`name=""`).

---

### Bước 2: DOCX trung gian → StarWriter HTML
- **Cơ chế**: LibreOffice chuyển đổi `convert_src_path` sang HTML (`_run_soffice_convert(..., "html", ...)`).
- **Kết quả kiểm tra thực tế**:
  Trong HTML thô sinh ra:
  ```html
  <p ...><b>Đ<img src="legacy06_html_c08caa2c.gif" name="Shape1" alt="Shape1" align="left" vspace="1" width="196"/>...</b></p>
  ```
  LibreOffice sinh ra một tệp ảnh GIF đệm (kích thước 196x1 px) và đặt thẻ `<img src="...gif">` ngay giữa dòng văn bản.
  - **Đánh giá**: Bước 2 **KHÔNG LÀM MẤT**, LibreOffice ánh xạ đường kẻ thành ảnh GIF 1px.

---

### Bước 3: StarWriter HTML → Xử lý nội tuyến ảnh & Nạp lên Canvas
- **Cơ chế**: Trong `main.py` hàm `_inline_html_images` (dòng 707–773):
  ```python
  def _is_decorative_hairline_image(raw: bytes, ext: str) -> bool:
      ...
      return (height <= 2 and width >= 10) or (width <= 2 and height >= 10)
  ```
  ```python
  if _is_decorative_hairline_image(raw, ext):
      # Đường kẻ trang trí 1px thật sự ... bỏ qua hoàn toàn thay vì nhúng
      return ""
  ```
- **Kết quả kiểm tra thực tế**:
  Ảnh `legacy06_html_c08caa2c.gif` có kích thước 196x1 px, rơi trúng điều kiện `height <= 2 and width >= 10`. Thẻ `<img>` bị loại bỏ hoàn toàn khỏi HTML gửi lên Canvas.
  - **Đánh giá**:
    - Đây là **thiết kế có chủ đích** của VN Office nhằm tránh vỡ bố cục dòng chữ trên Canvas HTML (do LibreOffice chèn thẻ `img align="left"` vào giữa ký tự văn bản).
    - Nhưng do đó, trên DOM Canvas, đối tượng đường kẻ **không còn tồn tại**.

---

### Bước 4: Soạn thảo & Xuất Canvas HTML → DOCX trung gian khi lưu
- **Cơ chế**: Khi người dùng nhấn Lưu (Ctrl+S hoặc Lưu bản sao), Canvas HTML (không chứa thẻ ảnh đường kẻ) được gửi xuống backend.
- LibreOffice chuyển HTML này sang DOCX trung gian (`intermediate_docx`).
- **Kết quả**: DOCX trung gian xuất ra từ HTML không có bất kỳ `<w:drawing>` hay `<w:pict>` nào của đường kẻ.
- **Đánh giá**: Việc thiếu hình ở bước này là kết quả tự nhiên của Bước 3. Theo kiến trúc đã định, hình phải được khôi phục tại Bước 5.

---

### Bước 5: Hậu xử lý DOCX (`postprocess_writer_docx` / `_restore_missing_writer_drawings`)

Theo thiết kế hệ thống, hàm `_restore_missing_writer_drawings` trong `ooxml_zip_patch.py` có nhiệm vụ:
> *"Copy source anchors and inline groups that LibreOffice dropped on the way to DOCX. Hairline connector GIFs are removed before export, and inline groups are not anchor passthrough. Reinsert the original DrawingML at the source paragraph slot."*

Tuy nhiên, quá trình chẩn đoán phát hiện **2 lỗi chặn đứng (blockers)** khiến cơ chế khôi phục này không hoạt động:

#### Blocker 1: Lỗi lọc tên trong `_writer_should_restore_drawing`
Trong `adapters/libreoffice/common/ooxml_zip_patch.py`:
```python
def _writer_anchor_name(anchor: str) -> str | None:
    match = re.search(r'<wp:docPr\b[^>]*\bname=["\']([^"\']+)', anchor, re.IGNORECASE)
    return match.group(1) if match else None

def _writer_should_restore_drawing(
    block: str, present: set[str], converted_drawings: list[str],
) -> bool:
    name = _writer_anchor_name(block)
    if not name or name in present:
        return False
    kind = _writer_anchor_passthrough_kind(block)
    if kind in {"shape", "group", "picture"}:
        return True
    ...
```
- Khi LibreOffice chuyển `legacy06.doc`, `legacy17.doc`, `legacy18.doc` sang DOCX, nó sinh ra thẻ:
  `<wp:docPr id="1" name=""></wp:docPr>` (với `name=""` rỗng).
- Regex `name=["\']([^"\']+)` đòi hỏi ít nhất 1 ký tự, nên trả về `None`.
- Dòng kiểm tra `if not name:` lập tức trả về `False`!
- **Hậu quả**: Toàn bộ các shape/line không tên (`name=""`) bị từ chối khôi phục 100%, dù `_writer_anchor_passthrough_kind(block)` nhận diện chính xác đây là `'shape'`.

#### Blocker 2: Lỗi khi LƯU thành `.docx` từ tệp gốc `.doc`
Trong `main.py` (`_apply_native_export_postprocess`, dòng 507–510):
```python
if app_kind == "writer" and fmt == "docx":
    ...
    if source_path and os.path.isfile(source_path):
        with open(source_path, "rb") as handle:
            original_docx = handle.read()
        patched = patcher.postprocess_writer_docx(patched, source_docx=original_docx)
```
- Khi người dùng mở `legacy06.doc` và chọn Lưu thành `.docx`:
  - `source_path` trỏ tới `legacy06.doc` (tệp nhị phân OLE2 Word 97).
  - Biến `original_docx` đọc byte nhị phân của `.doc` thay vì DOCX.
  - Khi `postprocess_writer_docx` gọi `read_zip_entry(source_docx, "word/document.xml")`, nó thất bại (vì `.doc` không phải file zip).
  - `original_xml` là chuỗi rỗng `""` → Hàm trả về `docx_bytes` nguyên bản mà không khôi phục bất kỳ đối tượng nào (shape, header/footer, sections)!
- **Kiểm chứng thực nghiệm**: Mở `legacy06.doc` và lưu thành `legacy06_saved_as.docx`:
  `Target docx drawings: []` (0 drawing). **Đường kẻ bị MẤT trên cả đường lưu `.docx`!**

---

### Bước 6: Xuất `.doc` từ DOCX đã chuẩn bị (`prepare_writer_docx_for_legacy_doc_export` → `_run_soffice_convert(..., "doc", ...)`)

Đã tiến hành thử nghiệm độc lập (`test_line_cases.py`) xem bộ lọc `MS Word 97` của LibreOffice có hỗ trợ xuất đường kẻ không:
1. Trường hợp 1: DOCX chứa `<mc:AlternateContent>` với `<mc:Choice>` (DrawingML line) và `<mc:Fallback>` (VML `<v:line>`).
   - LibreOffice xuất sang `.doc`: Thành công! Word COM đọc được: `Shapes count: 1`, `Shape Name: Shape1 Type: 9 (msoLine)`, nằm đúng `Page 1`.
2. Trường hợp 2: DOCX được làm phẳng thành VML line thuần (`<w:pict><v:line ...>`).
   - LibreOffice xuất sang `.doc`: Thành công! Word COM đọc được: `Shapes count: 1`, `Shape Name: Line 2 Type: 9 (msoLine)`, nằm đúng `Page 1`.
3. Trường hợp 3: DOCX chứa naked DrawingML line (`<w:drawing><wp:anchor>...<a:prstGeom prst="line"/>...`).
   - LibreOffice xuất sang `.doc`: Thành công! Word COM đọc được: `Shapes count: 1`, `Shape Name: Shape1 Type: 9 (msoLine)`, nằm đúng `Page 1`.

**Kết luận quan trọng**: LibreOffice hoàn toàn có khả năng xuất đường kẻ sang định dạng Word 97 `.doc` nếu đối tượng đường kẻ có mặt trong file DOCX trước khi gọi chuyển đổi. Đường kẻ mất là do bước khôi phục DOCX (Bước 5) không khôi phục nó vào DOCX.

---

## 3. Tổng hợp bảng đối chiếu mất mát qua từng bước

| Bước trong quy trình | `legacy06.doc` (Line 13) | `legacy17.doc` (Line 115) | `legacy18.doc` (Line 115) | Ghi chú |
|---|:---:|:---:|:---:|---|
| Tệp gốc .doc | CÓ (Line 13) | CÓ (Line 115) | CÓ (Line 115) | Word COM xác nhận Type 9 (msoLine) |
| Mở: .doc → DOCX trung gian | CÓ (`wp:anchor`, `docPr name=""`) | CÓ (`wp:anchor`, `docPr name=""`) | CÓ (`wp:anchor`, `docPr name=""`) | LibreOffice chuyển DOCX chuẩn, `name=""` |
| Mở: DOCX → HTML | CÓ (`img` GIF 196x1) | CÓ (`img` GIF 204x1) | CÓ (`img` GIF 204x1) | LibreOffice render thành ảnh 1px |
| Mở: HTML → Canvas | **BỊ LỌC BỎ** | **BỊ LỌC BỎ** | **BỊ LỌC BỎ** | `_is_decorative_hairline_image` chủ động bỏ |
| Lưu: Canvas HTML → DOCX | KHÔNG CÓ | KHÔNG CÓ | KHÔNG CÓ | Xuất phát từ HTML không có ảnh |
| Lưu: Khôi phục qua `source_docx` | **THẤT BẠI** | **THẤT BẠI** | **THẤT BẠI** | Do `docPr name=""` bị chặn bởi `if not name:` |
| Lưu thành `.docx` | **MẤT (0 hình)** | **MẤT (0 hình)** | **MẤT (0 hình)** | `source_path` là `.doc`, không đọc được zip |
| Lưu thành `.doc` | **MẤT (0 hình)** | **MẤT (0 hình)** | **MẤT (0 hình)** | Hậu quả trực tiếp từ việc khôi phục DOCX thất bại |

---

## 4. Giải pháp nguyên nhân gốc (Root-Cause Fix Plan)

1. **Chuẩn hóa nhận diện và đặt tên shape không tên trong `adapters/libreoffice/common/ooxml_zip_patch.py`**:
   - Trong `_writer_anchor_name(anchor)`: Cho phép trả về tên định danh thay thế khi `name=""` (ví dụ dựa trên `id`: `f"__unnamed_docpr_{docpr_id}"` hoặc geometry type) thay vì trả về `None`.
   - Trong `_writer_should_restore_drawing`:
     - Khi `name` không rỗng: kiểm tra `name not in present`.
     - Khi shape là passthrough kind (`shape`, `group`, `picture`) và không có text box: không bỏ qua chỉ vì tên gốc bị rỗng; dùng fallback identifier (hoặc docPr id) để theo dõi `present`.
   - Đảm bảo các hàm phụ trợ (`_writer_restore_missing_writer_drawings`, `_writer_unique_docpr_ids`) xử lý trơn tru các shape này mà không tạo trùng ID hoặc vi phạm schema OOXML.

2. **Khôi phục nguồn khi lưu sang `.docx` từ file gốc `.doc` trong `main.py`**:
   - Trong `_apply_native_export_postprocess` (nhánh `writer` + `docx`):
     - Nếu `source_path` kết thúc bằng `.doc`, tự động chuẩn hóa sang DOCX tạm thời (tương tự như cách `_convert_writer_html_to_doc` đã làm) để lấy cấu trúc section, styles và drawings nguồn.

3. **Bảo toàn khả năng tương thích khi xuất sang `.doc`**:
   - Cơ chế `prepare_writer_docx_for_legacy_doc_export` đã làm phẳng `mc:AlternateContent` về `mc:Fallback` VML. Cần đảm bảo rằng các đường kẻ được khôi phục hoặc ở dạng DrawingML chuẩn hoặc ở dạng VML fallback chuẩn để bộ lọc MS Word 97 của LibreOffice ghi nhận đúng 100%.
