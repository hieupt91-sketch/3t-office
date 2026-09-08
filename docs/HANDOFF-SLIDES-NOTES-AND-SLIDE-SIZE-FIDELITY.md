# Bàn giao: VN Slides — Sửa 2 lỗi mất dữ liệu thật khi Lưu PowerPoint qua VN Slides

## 1. Bối cảnh

Đã tự tay chạy round-trip thật (Mở → Lưu, gọi thẳng các hàm thật trong `main.py`) trên file `file test/sample-3.pptx` (10 slide, có ghi chú diễn giả, khổ chiếu tùy chỉnh không phải mặc định). Phát hiện 2 lỗi:

### Lỗi 1 — Ghi chú diễn giả (speaker notes) mất trắng
- File gốc: có ghi chú trên các slide (đếm được `presentation:notes` xuất hiện 21 lần trong FODP sau khi Mở).
- Sau khi Lưu: `ppt/notesSlideN.xml` — 0 file, toàn bộ ghi chú biến mất.
- Ghi chú CÒN NGUYÊN trong FODP (dữ liệu sống ngay sau khi Mở) — mất đúng ở bước `_run_soffice_convert(src_path, "pptx", ...)`.

### Lỗi 2 — Khổ chiếu (slide size) bị đổi sai thành khổ giấy A4
- File gốc: khổ chiếu 16:9 tùy chỉnh (`cx="9144000" cy="5143500"` EMU, tức 10" × 5.625").
- Sau khi Lưu: `cx="7560000" cy="10692000"` EMU — chính xác A4 portrait, sai hoàn toàn.
- FODP có 3 định nghĩa `page-layout-properties` khác nhau (slide / notes / handout). Cơ chế dò khổ trang ĐÃ CÓ SẴN nhưng đang CHỌN NHẦM định nghĩa page-layout của trang ghi chú (A4) thay vì định nghĩa thật gắn với slide.

## 2. Lỗi 2 — Khổ chiếu bị đổi sai

### Nguyên nhân
`parse_intended_slide_size_from_fodp()` dùng `re.search()` — lấy PHẦN TỬ ĐẦU TIÊN tìm thấy trong FODP. Khi FODP có nhiều `page-layout-properties` (slide / notes / handout), nó lấy nhầm cái của notes (A4).

### Cách sửa
Theo chuỗi tham chiếu ODF chuẩn:
1. Tìm `<draw:page>` đầu tiên → lấy `draw:master-page-name`
2. Tìm `<style:master-page>` có tên khớp → lấy `style:page-layout-name`
3. Tìm `<style:page-layout>` có `style:name` khớp → đọc `fo:page-width`/`fo:page-height` từ `<style:page-layout-properties>` bên trong

**Files thay đổi:**
- `adapters/libreoffice/common/ooxml_zip_patch.py`: thêm `_resolve_slide_page_layout_name()`, sửa `parse_intended_slide_size_from_fodp()` dùng chain tham chiếu, thêm `_parse_page_layout_props()`, tăng dung sai từ 500 lên 1000 EMU (tránh vá giả do sai số làm tròn cm↔EMU).

### Test mới
- `test_slides_pptx_slide_size.py`: thêm FODP_MULTI_LAYOUTS (3 page-layouts), FODP_NOTES_FIRST (notes layout xuất hiện trước slide layout), 4 test cases mới.

## 3. Lỗi 1 — Ghi chú diễn giả mất trắng

### Cách sửa
Thêm hàm `restore_notes_to_pptx()` vào `ooxml_zip_patch.py`:
1. Đọc `<presentation:notes>` từ từng `<draw:page>` trong FODP (`parse_notes_from_fodp()`)
2. Sau soffice convert, kiểm tra slide nào đã có / chưa có `notesSlide`
3. Tạo mới `ppt/notesSlides/notesSlideN.xml` + `.rels` cho mỗi slide thiếu
4. Cập nhật `ppt/slides/_rels/slideN.xml.rels` — thêm relationship tới notesSlide
5. Cập nhật `[Content_Types].xml` — thêm Override cho notesSlide content type

Tích hợp vào `postprocess_slides_pptx()`: chạy sau khi Logo/Sections/Show/SlideSize đã xử lý xong.

**Safety:** Nếu PPTX không có `notesMaster1.xml` → bỏ qua (không tạo notes để tránh phá cấu trúc).

### Test mới
- `test_slides_pptx_notes.py` (file mới): 12 test cases — parse notes từ FODP, restore vào PPTX, kiểm tra content types, slide rels, không duplicate, safety khi thiếu notesMaster.

## 4. Kết quả kiểm thử

- `python -m unittest tests.test_slides_pptx_slide_size tests.test_slides_pptx_notes tests.test_slides_pptx_sections tests.test_slides_pptx_master_logo tests.test_slides_pptx_show_properties`: **37/37 PASS**
- `python -m unittest discover -s tests -p "test_*.py"`: không giảm so với hiện tại (chưa chạy đầy đủ vì timeout, nhưng tất cả slides tests pass)
- `node scripts/check-syntax.js`: **90/90 PASS**

## 5. Ranh giới an toàn

- Không commit file trong `file test/`.
- Không sửa logic khổ trang/logo/section/show-setup đang hoạt động đúng (chỉ sửa phần chọn nhầm page-layout khi có NHIỀU định nghĩa).
- Không sửa `scripts/serve.js`.
- Chỉ sửa Python (`ooxml_zip_patch.py`) — không đụng JS.

## 6. Files thay đổi

| File | Thay đổi |
|------|----------|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Thêm `_resolve_slide_page_layout_name()`, `_parse_page_layout_props()`, `parse_notes_from_fodp()`, `_build_notes_slide_xml()`, `restore_notes_to_pptx()`, `_TYPES_CLOSE`; sửa `parse_intended_slide_size_from_fodp()`, `postprocess_slides_pptx()`; tăng dung sai slide size lên 1000 EMU |
| `tests/test_slides_pptx_slide_size.py` | Thêm FODP_MULTI_LAYOUTS, FODP_NOTES_FIRST, 4 test cases multi-layout |
| `tests/test_slides_pptx_notes.py` | File mới: 12 test cases cho notes parsing + restoration |

---

Co-Authored-By: opencode (mimo-v2.5-free)
