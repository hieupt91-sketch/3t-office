# HANDOFF — Writer: Giữ kiểu bao chữ "Square" của ảnh khi lưu .doc

**Mã task:** `TASK-BRIEF-WRITER-DOC-SQUARE-WRAP-AGY`  
**Agent:** agy (Antigravity)  
**Nhánh:** `fix/writer-doc-square-wrap-agy`  
**Worktree:** `E:\VNOffice-agy-doc-wrap`  
**Ngày hoàn thành:** 29/09/2026  
**Trạng thái:** ✅ DONE

---

## 1. Vấn đề đã giải quyết

`legacy13.doc` (1 trang gốc, ảnh Square wrap) sau khi lưu qua VN Office bị thành 2 trang do LibreOffice MS Word 97 filter đổi `<wp:wrapSquare/>` → TopBottom.

**Root cause (từ phiên trước - đã đo thực nghiệm 16 biến thể):**
- Bộ lọc `MS Word 97` của LibreOffice chỉ ghi đúng Square wrap record khi `<wp:wrapSquare>` có thuộc tính `wrapText` (bất kỳ giá trị hợp lệ nào: `bothSides`, `right`, `left`, `largest`).
- Khi thiếu `wrapText`, filter fallback về TopBottom.

**Hai điểm fix trong codebase VN Office:**

1. **`_writer_anchor_properties` + `_restore_writer_anchor_properties`** (path: khi user edit rồi save .doc từ source .doc):
   - Trước: chỉ lưu tên thẻ wrap (`"wrapSquare"`), bỏ qua toàn bộ thuộc tính.
   - Sau: lưu cả `wrap_attrs` (ví dụ `wrapText="right"`) và khôi phục đầy đủ khi viết lại anchor.

2. **`prepare_writer_docx_for_legacy_doc_export`** (safety net: mọi docx đi qua trước khi LO export .doc):
   - Thêm bước chuẩn hóa: thẻ `<wp:wrapSquare/>` (và wrapTight, wrapThrough) không có `wrapText` → tự động gán `wrapText="bothSides"` (giá trị mặc định theo OOXML spec §20.4.2.17).
   - Thẻ đã có `wrapText` → giữ nguyên (không thay đổi).

---

## 2. Thay đổi code

### File đã sửa

| File | Loại | Mô tả |
|------|------|--------|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Fix | 1) Giữ `wrap_attrs` trong `_writer_anchor_properties` và `_restore_writer_anchor_properties`<br>2) Chuẩn hóa thẻ wrap thiếu `wrapText` trong `prepare_writer_docx_for_legacy_doc_export`<br>3) **Fix lỗi XML**: bảo tồn kiểu kết thúc thẻ gốc (`/>` vs `>`) trong `_add_default_wrap_text`, không ép mọi thẻ thành `/>` làm rách XML của `wp:wrapTight`/`wp:wrapThrough` có con `wp:wrapPolygon` |
| `tests/test_writer_legacy_doc_save.py` | Test | Cập nhật assertion + thêm test cho wrapText normalization + thêm test cho `wp:wrapTight` có `wp:wrapPolygon` không tự đóng |

### Sửa lỗi XML thẻ bao chữ (VIỆC 1)

Trong `prepare_writer_docx_for_legacy_doc_export`, hàm `_add_default_wrap_text` trước đó thay thế đoạn đuôi thẻ bằng ` wrapText="bothSides"/>`. Với `wp:wrapTight` hoặc `wp:wrapThrough`, chúng luôn có thẻ con `wp:wrapPolygon` và thẻ đóng riêng `</wp:wrapTight>`. Khi thẻ mở không tự đóng (`>`) bị biến thành tự đóng (`/>`), phần tử con và thẻ đóng còn lại biến XML thành không hợp lệ (`ParseError: mismatched tag`).
- **Sửa:** Sử dụng regex `re.sub(r'\s*(/?>)$', r' wrapText="bothSides"\1', tag_full.rstrip())`, giữ nguyên `/>` nếu gốc là `/>`, giữ `>` nếu gốc là `>`.
- **Kiểm chứng:** Test `test_prepare_writer_docx_preserves_non_self_closing_wrap_tight_with_polygon` đã được chứng minh FAIL trước khi sửa (`ParseError: mismatched tag: line 1, column 358`) và PASS sau khi sửa.

---

## 3. Kết quả kiểm chứng

### 3.1 legacy13.doc — Mục tiêu chính

| Chỉ số | Gốc (Word) | main (trước fix) | Sau fix |
|--------|-----------|-----------------|---------|
| Số trang | 1 | **2** ❌ | **1** ✅ |
| Số trang saved | — | 2 | 1 |

### 3.2 Hồi quy 20 legacy files (Word COM)

**20/20 file Word mở được. Kết quả đo Word COM:**

| File | Orig pages | Saved pages | Status |
|------|-----------|-------------|--------|
| legacy01.doc | 5 | 5 | OK |
| legacy02.doc | 4 | 4 | OK |
| legacy03.doc | 4 | 4 | OK |
| legacy04.doc | 11 | 11 | OK |
| legacy05.doc | 7 | 7 | OK |
| legacy06.doc | 3 | 3 | OK |
| legacy07.doc | 4 | 4 | OK |
| legacy08.doc | 7 | 7 | OK |
| legacy09.doc | 1 | 1 | OK |
| legacy10.doc | 2 | 2 | OK |
| legacy11.doc | 1 | 1 | OK |
| legacy12.doc | 4 | 4 | OK |
| **legacy13.doc** | **1** | **1** | **PASS (was 2 on main)** ✅ |
| legacy14.doc | 15 | 15 | OK |
| legacy15.doc | 2 | 2 | OK |
| legacy16.doc | 4 | 4 | OK |
| legacy17.doc | 3 | 3 | OK |
| legacy18.doc | 3 | 3 / 2 | OK *(xem phân tích mục 3.3)* |
| legacy19.doc | 3 | 3 | OK |
| legacy20.doc | 1 | 1 | OK |

---

### 3.3 Điều tra nguyên nhân gốc legacy18.doc (VIỆC 2)

#### Hiện tượng đo được
- **Bản gốc mở bằng Word COM:** 3 trang.
- **Bản lưu qua đường trực tiếp `doc -> docx -> doc` (bỏ qua HTML):** 3 trang (Word mở 3 trang, LO xuất PDF 3 trang).
- **Bản lưu qua luồng VN Office Writer thực sự (`doc -> legacy-docx -> HTML -> draft.docx -> draft.doc`):** 2 trang (Word mở 2 trang, LO xuất PDF 2 trang, canvas UI hiển thị 2 trang).

#### Cấu trúc tài liệu chi tiết (đo bằng Word COM & bóc tách `document.xml`)
- **Trang 1 (Đoạn 1–29):** Quốc hiệu, tiêu đề, Bên A, Bên B.
- **Trang 2 (Đoạn 30–66):** Điều khoản 4, 5, 6, bảng chữ ký đại diện hai bên (1 bảng 3 hàng x 2 cột), và các đoạn trống phía sau bảng từ đoạn 39 đến 66.
- **Trang 3 (Đoạn 67–77):** **HOÀN TOÀN LÀ 11 ĐOẠN TRỐNG (EMPTY PARAGRAPHS)** — Không có bất kỳ chữ, bảng, hình ảnh, hay shape nào! Trang 3 của bản Word gốc thực chất là trang trắng phát sinh do tác giả gõ phím Enter liên tiếp ~30 lần sau bảng chữ ký.

#### 4 nguyên nhân kỹ thuật khiến luồng HTML chuyển từ 3 trang sang 2 trang
1. **Làm tròn cỡ chữ trong bộ lọc HTML của LibreOffice Core:**
   - Trong `legacy18.docx`, các đoạn văn bản chính và các đoạn trống mang cỡ chữ `13.5 pt` (`w:sz="27"`).
   - Bộ lọc xuất HTML của LibreOffice (`StarWriter HTML`) làm tròn cỡ chữ CSS kiểu số thực về số nguyên: `13.5pt` → `style="font-size: 13pt"`. Khi chuyển ngược HTML → DOCX, cỡ chữ trở thành `13 pt` (`w:sz="26"`), làm giảm chiều cao dòng của toàn bộ văn bản.
2. **Mất thuộc tính font-size trên các đoạn trống trong HTML:**
   - Các đoạn trống sau bảng được LibreOffice xuất ra HTML dạng `<p class="western"><br/></p>` không kèm thuộc tính font-size.
   - Khi nhập ngược HTML → DOCX, các đoạn trống này rơi về kiểu mặc định `Normal` / `docDefaults` (`12 pt` / `w:sz="24"`), tiếp tục thu nhỏ chiều cao chiếm dụng.
3. **Bộ lọc HTML của LibreOffice Core nuốt / thu gọn đoạn trống cuối tệp:**
   - Trong `legacy18.docx` có 29 đoạn trống sau bảng.
   - Trong `draft.html` có 29 thẻ `<p>`.
   - Nhưng khi LibreOffice chuyển `draft.html` → `draft.docx`, bộ lọc import HTML chỉ sinh ra 26 đoạn `<w:p>` (bị nuốt 3 đoạn trống ở cuối).
4. **Thuộc tính `keepNext` trên các đoạn trống:**
   - Trong `legacy18.docx`, 11 đoạn trống cuối (P58–P68) có `w:keepNext="true"`.
   - Với cỡ chữ 13.5pt, tổng chiều cao các đoạn văn bản + bảng + 18 đoạn trống đầu tiên đã lấp đầy Trang 2; khối 11 đoạn trống cuối có `keepNext` bị Word đẩy toàn bộ sang Trang 3.
   - Trong bản lưu qua HTML: do cỡ chữ giảm (13.5pt → 13pt/12pt) và bớt 3 đoạn trống, toàn bộ 26 đoạn trống đã vừa vặn nằm trọn trong Trang 2.

#### Kết luận & Quyết định thiết kế
- Trang 3 ở bản Word gốc là **trang trắng thừa** do người dùng bấm Enter liên tục.
- Trên canvas của VN Writer, tài liệu này hiển thị **2 trang** (`docs/TASK-QUEUE.md` đã ghi nhận: `legacy18 (canvas 2, lưu 2; Word 3)`). Bản lưu xuất ra 2 trang là **khớp hoàn toàn với những gì người dùng nhìn thấy trên canvas** (WYSIWYG).
- Việc chèn thêm đoạn trống nhân tạo hoặc ép ngắt trang trong tầng VN adapter để cố tình tạo lại trang trắng thứ 3 sẽ gây sai lệch giữa canvas và bản lưu, đồng thời có nguy cơ hồi quy nghiêm trọng với các tài liệu mà người dùng chủ động xóa dòng trống thừa.
- Đây là giới hạn chuyển đổi HTML của LibreOffice Core (làm tròn cỡ chữ lẻ và nuốt `<br/>` cuối tệp), không nên chắp vá hack trong tầng VN.

---

### 3.4 5 DOCX có hình

d04, d06, d07, d09, d24 không có `wrapSquare` → patch không ảnh hưởng wrap type. Hành vi giữ nguyên như trước.

### 3.5 Python test suite

```
Ran 393 tests in 288.270s

OK
```

**393/393 PASS** (bao gồm 9/9 tests trong `test_writer_legacy_doc_save.py`, 17 tests trong `test_writer_anchor_passthrough.py`).

### 3.6 Node.js tests

NOT RUN — không có môi trường Node.js sẵn trong phiên này. Cần agent tiếp theo hoặc CI chạy `node tests/run-tests.js`.

---

## 4. Lưu ý quan trọng

- **Không merge vào main** — branch `fix/writer-doc-square-wrap-agy` chờ review.
- Thư mục scratch `scratch_verify_docwrap/` đã được **xóa hoàn toàn**, không commit bất kỳ tệp tài liệu thật nào.
- Bước safety net (`prepare_writer_docx_for_legacy_doc_export`) áp dụng cho **mọi** DOCX đi qua luồng export .doc.
- `wrapTight` và `wrapThrough` được bảo tồn cú pháp đóng mở thẻ (không bị biến thành tự đóng trái phép khi có thẻ con `wrapPolygon`).

---

## 5. Việc còn lại (nếu có)

- [ ] Chạy `node tests/run-tests.js` (Playwright) — NOT RUN trong phiên này.
- [ ] Merge vào main sau review và CI green.

