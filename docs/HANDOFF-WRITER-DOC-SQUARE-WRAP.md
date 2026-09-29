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
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Fix | Hai điểm sửa như trên |
| `tests/test_writer_legacy_doc_save.py` | Test | Cập nhật + thêm 2 test mới |

### Commits

```
4e9ae7e fix(writer): W-docwrap preserve wrapSquare wrapText attrs on .doc export
022d9f6 fix(writer): W-docwrap update tests for wrapText normalization
```

---

## 3. Kết quả kiểm chứng

### 3.1 legacy13.doc — Mục tiêu chính

| Chỉ số | Gốc (Word) | main (trước fix) | Sau fix |
|--------|-----------|-----------------|---------|
| Số trang | 1 | **2** ❌ | **1** ✅ |
| Số trang saved | — | 2 | 1 |

### 3.2 Hồi quy 20 legacy files (Word COM)

**20/20 file Word mở được. Kết quả:**

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
| legacy18.doc | 3 | 3 | OK *(main: 3→2, nay giữ 3)* |
| legacy19.doc | 3 | 3 | OK |
| legacy20.doc | 1 | 1 | OK |

### 3.3 5 DOCX có hình

d04, d06, d07, d09, d24 không có `wrapSquare` → patch không ảnh hưởng wrap type. Hành vi giữ nguyên như trước.

### 3.4 Python test suite

```
Ran 392 tests in 281.044s
OK
```

**392/392 PASS** (bao gồm 8 tests trong `test_writer_legacy_doc_save.py`, 17 tests trong `test_writer_anchor_passthrough.py`).

### 3.5 Node.js tests

NOT RUN — không có môi trường Node.js sẵn trong phiên này. Cần agent tiếp theo hoặc CI chạy `node tests/run-tests.js`.

---

## 4. Lưu ý quan trọng

- **Không merge vào main** — branch `fix/writer-doc-square-wrap-agy` chờ review.
- Scratch files (không commit, gitignored): `scratch_verify_docwrap/` trong worktree.
- Bước safety net (`prepare_writer_docx_for_legacy_doc_export`) áp dụng cho **mọi** DOCX đi qua luồng export .doc — không chỉ riêng legacy13.
- `wrapTight` và `wrapThrough` cũng được normalize (cùng cơ chế, cùng yêu cầu wrapText từ LO filter).

---

## 5. Việc còn lại (nếu có)

- [ ] Chạy `node tests/run-tests.js` (Playwright) — NOT RUN trong phiên này.
- [ ] Merge vào main sau review và CI green.
