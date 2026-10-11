# Bàn giao: VN Writer — Section/Header/Footer Fidelity khi Lưu file Word

## 1. Lỗi gốc (đã kiểm chứng bằng code, không suy đoán)

### Triệu chứng
- Mở file `.docx` có nhiều section, header/footer khác nhau → Lưu lại →只剩 1 section, header/footer **RỖNG HOÀN TOÀN**.
- Bảng và hình ảnh sống sót — lỗi **chỉ khoanh vùng** ở section/header/footer.

### Nguyên nhân kỹ thuật
`open_document_dialog()` (Writer) convert `.docx` → HTML qua `soffice --convert-to html`. HTML **không có khái niệm** section (`w:sectPr`) / header / footer riêng của Word — step này đã loại bỏ chúng ngay từ lúc Mở. Khi `save_document_dialog()` lưu lại, nó chỉ ghi `content` (HTML thuần) rồi convert ngược sang `.docx` — **không có bước vá lại**.

`_apply_native_export_postprocess()` (main.py:414) đã có nhánh xử lý cho `sheet`+`xlsx` và `slides`+`pptx`, nhưng **hoàn toàn không có nhánh** cho `writer`+`docx`.

### So sánh với Sheet/Slides (pattern đã thành công)
Sheet/Slides bảo toàn được cấu trúc native qua:
1. **Import overlay** (`_apply_native_import_overlay`): đọc dữ liệu gốc lúc Mở, patch vào intermediate format (FODS/FODP) trước khi UI render.
2. **Export postprocess** (`_apply_native_export_postprocess`): đọc intermediate format + file convert xong, vá lại các phần LibreOffice bỏ sót.
3. **`ooxml_zip_patch.py`**: chứa logic Python tương ứng (`postprocess_sheet_xlsx`, `postprocess_slides_pptx`, `overlay_sheet_xlsx_fods`, `overlay_slides_pptx_fodp`).

Writer cần làm **điều tương tự** cho `.docx`.

## 2. Vấn đề API — ĐIỀU KIỆN DỪNG LẠI

### Gap đã xác nhận qua code

**Lưu ý**: Trong `save_document_dialog()` (main.py:866-909), `src_path` là **file HTML tạm** (`draft.html`), **KHÔNG PHẢI** `.docx` gốc. Hàm này **không nhận** và **không có** đường dẫn file `.docx` gốc đang mở.

Chi tiết:
- `open_document_dialog()` (main.py:784) trả về `payload["sourcePath"]` = đường dẫn `.docx` gốc cho JS (main.py:838).
- JS Writer adapter (`writer-adapter.js:7195`) **chỉ lưu** `this.sourceFileName` (tên file không extension), **KHÔNG lưu** `result.sourcePath` hay `result.ooxmlDocumentXml`.
- `save()` (writer-adapter.js:7164) gọi `globalUnoBridge.saveRealFile("writer", content, "docx", suggestedName)` — **không gửi** `sourcePath`.
- Python `save_document_dialog()` signature: `(self, content, app_kind, target_format, suggested_name)` — **không có** tham số `source_path`.

### Kết luận
Để vá lại section/header/footer, Python cần đọc file `.docx` gốc lúc Lưu. Nhưng hiện tại **không có cách nào** lấy đường dẫn `.docx` gốc trong phiên làm việc hiện tại.

Đây là **thay đổi API lớn** (AGENTS.md §6):
- Đổi signature Python `save_document_dialog()` — thêm tham số mới.
- Đổi JS Writer adapter — lưu `sourcePath` từ open, truyền lại khi save.
- Đổi JS `uno-bridge.js` `saveRealFile()` — thêm tham số.
- Thêm logic mới trong `ooxml_zip_patch.py`.

→ **DỪNG LẠI theo TASK-BRIEF §3** — không tự ý code tiếp.

## 3. Phương án đề xuất (chờ duyệt)

### Phương án A: Thêm `source_path` parameter (đề xuất chính) ✅ ĐÃ DUYỆT & THỰC HIỆN

**Python side** (`main.py`):
```python
def save_document_dialog(self, content, app_kind="writer", target_format=None,
                         suggested_name="TaiLieu", source_path=None):
    # ...existing logic...
    # Trong nhánh writer+docx:
    if app_kind == "writer" and target_format == "docx":
        _apply_native_export_postprocess(src_path, out_path, app_kind, target_format,
                                         source_path=source_path)
```

**JS Writer adapter** (`writer-adapter.js`):
```javascript
// Trong open(): lưu sourcePath
this._sourcePath = result.sourcePath || null;

// Trong save(): truyền sourcePath
async save() {
    // ...
    const result = await globalUnoBridge.saveRealFile(
        "writer", this._contentForExport(), "docx", suggestedName,
        this._sourcePath  // tham số mới
    );
}
```

**JS Bridge** (`uno-bridge.js`):
```javascript
async saveRealFile(appKind, content, targetFormat, suggestedName, sourcePath) {
    return await this.desktopApi.save_document_dialog(
        content, appKind, targetFormat, suggestedName, sourcePath
    );
}
```

**Python postprocess** (`ooxml_zip_patch.py`):
- Thêm `postprocess_writer_docx(docx_bytes, *, source_docx=None)`:
  1. Đọc file `.docx` gốc tại `source_docx`.
  2. Extract: `word/header1.xml`, `word/header2.xml`, ..., `word/footer1.xml`, ..., và `w:headerReference`/`w:footerReference`/`w:sectPr` từ `word/document.xml` gốc.
  3. Đọc file `.docx` vừa convert xong (`docx_bytes`).
  4. Ghép lại: re-inject header/footer XML + section references vào đúng vị trí.
  5. Nếu file gốc không có header/footer, trả về nguyên bytes (safe no-op).

**`_apply_native_export_postprocess`** (main.py):
```python
if app_kind == "writer" and fmt == "docx":
    if not source_path or not os.path.isfile(source_path):
        return
    with open(source_path, "rb") as handle:
        original_docx = handle.read()
    with open(out_path, "rb") as handle:
        converted_docx = handle.read()
    patcher = _ooxml_zip_patch()
    patched = patcher.postprocess_writer_docx(converted_docx, source_docx=original_docx)
    if patched != converted_docx:
        with open(out_path, "wb") as handle:
            handle.write(patched)
```

### Phương án B: Lưu `ooxmlDocumentXml` trên JS, gửi lại lúc Save

Thay vì truyền đường dẫn file, truyền **nội dung XML** đã extract lúc Mở. Python sẽ dùng nó để reconstruct sections/headers/footers mà không cần đọc lại file gốc.

- Ưu điểm: không phụ thuộc file gốc còn tồn tại trên disk.
- Nhược điểm: payload lớn hơn, cần thêm logic reconstruct trong Python.

### Đánh giá
Phương án A **đơn giản hơn và match pattern** của Sheet/Slides (cũng truyền đường dẫn file gốc). Sheet dùng `src_path` (file gốc) trong cả import overlay và export postprocess. Writer nên làm tương tự.

## 4. Phạm vi thay đổi (ĐÃ THỰC HIỆN)

| File | Thay đổi |
|------|----------|
| `main.py` | Thêm param `source_path` vào `save_document_dialog()` và `export_pdf_dialog()`; thêm nhánh `writer`+`docx` trong `_apply_native_export_postprocess()` |
| `adapters/libreoffice/writer/writer-adapter.js` | Lưu `this._sourcePath` trong `open()`; truyền trong `save()`; clear trong `newDocument()` |
| `adapters/libreoffice/common/uno-bridge.js` | Thêm param `sourcePath` vào `saveRealFile()` |
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Thêm `postprocess_writer_docx()`, `_extract_docx_header_footer_refs()`, `_extract_docx_section_properties()`, `_resolve_docx_rels()`, `_extract_docx_section_parts()`, `_rebuild_docx_document_xml()` |
| `tests/test_writer_section_headerfooter_postprocess.py` | Test mới: 5 unit tests + 3 integration round-trip tests |
| `docs/HANDOFF-WRITER-SECTION-HEADER-FOOTER-FIDELITY.md` | Cập nhật kết quả sau khi hoàn thành |

## 5. Kết quả kiểm thử

### Python unittest (113 tests)
- 112/113 PASS (1 error pre-existing: `test_slides_pptx_setup_show_open` — lỗi LibreOffice convert FODP, không liên quan thay đổi này)
- Tất cả 8 test mới PASS:
  - `UnitPostprocessWriterDocxTests.test_noop_when_source_docx_is_none` ✅
  - `UnitPostprocessWriterDocxTests.test_noop_when_no_header_footer_refs` ✅
  - `UnitPostprocessWriterDocxTests.test_header_footer_entries_injected` ✅
  - `UnitPostprocessWriterDocxTests.test_sect_pr_and_refs_preserved` ✅
  - `UnitPostprocessWriterDocxTests.test_header_content_matches_original` ✅
  - `IntegrationSaveRoundtripTests.test_headerfooter_survives_roundtrip` ✅
  - `IntegrationSaveRoundtripTests.test_source_path_none_is_safe_noop` ✅
  - `IntegrationSaveRoundtripTests.test_nonexistent_source_path_is_safe_noop` ✅

### JavaScript syntax check
- 90/90 files PASS

### Chi tiết integration test round-trip
Mở `sample-writer-headerfooter.docx` (1 section, 1 header "Công ty TNHH Sao Việt / Phòng Kế hoạch", 1 footer "05/09/2026" + Page field) → Lưu lại qua `save_document_dialog` với `source_path` → Mở file vừa lưu:
- Header "Công ty TNHH Sao Việt" **sống sót** ✅
- Footer "05/09/2026" **sống sót** ✅
- `w:sectPr`, `w:headerReference`, `w:footerReference` **đầy đủ** ✅
- Header/footer XML content **khớp nguyên bản** ✅

### Safe no-op
- `source_path=None` → bỏ qua postprocess, không crash ✅
- `source_path` trỏ file không tồn tại → bỏ qua postprocess, không crash ✅

## 6. Rủi ro đã xử lý

- **Thay đổi API bridge**: Thêm param mới vào `saveRealFile()` nhưng backward-compatible (param mới có default `undefined`/`None`). Sheet/Slides dùng FODS/FODP, KHÔNG dùng `saveRealFile` cho native format → an toàn.
- **Backward compatibility**: Python `save_document_dialog()` có `source_path=None` mặc định. Nếu JS cũ chưa gửi → postprocess bị skip (an toàn).
- **File gốc bị xóa**: Nếu `source_path` trỏ file không tồn tại → `os.path.isfile()` return False → skip postprocess (an toàn).

## 7. Xác minh độc lập của Claude bằng file thật (bắt buộc trước khi merge)

Test tích hợp của opencode chỉ dùng fixture đơn giản (1 section/1 header/1 footer). Đã tự chạy lại đúng luồng thật (`open_document_dialog` → `save_document_dialog` với `source_path`) trên file thật `file test/aquara  final (1) (2).docx` (3 section, 9 footer, nội dung footer thật `"www.smartconnection.com.vn Catalog sản phẩm Aqara | [số trang]"`) — đây chính là file đã dùng để phát hiện lỗi gốc ban đầu.

**Kết quả:**
- Footer text **SỐNG SÓT ĐÚNG NGUYÊN VĂN**: `"www.smartconnection.com.vn Catalog sản phẩm Aqara | 2"`, `"| 1"`, `"| 1"` — trước khi vá, các dòng này bị xóa trắng hoàn toàn. Đây là lỗi nghiêm trọng nhất (mất thương hiệu công ty trên mọi trang) và đã được xác nhận sửa dứt điểm bằng dữ liệu thật.
- Toàn bộ 9 file `word/footerN.xml` gốc đều được ghi lại vào file kết quả (so với 1 file rỗng trước khi vá).

**Giới hạn còn lại (chưa xử lý, cần lưu ý cho agent sau):** `sectPr` trong file kết quả vẫn chỉ còn 1 (bản gốc có 3), và `footerReference` chỉ còn 3 (bản gốc có 9) — cơ chế hiện tại (`_rebuild_docx_document_xml`) chỉ thay thế ĐÚNG MỘT `w:sectPr` (section cuối/body-level) bằng bản gốc, chưa khôi phục đầy đủ cấu trúc NHIỀU section riêng biệt (ví dụ trang bìa dùng section khác trang nội dung, mỗi section có footer/khổ trang khác nhau). Với tài liệu chỉ có 1 section (trường hợp phổ biến nhất, đúng như fixture test của opencode), fix này khôi phục đầy đủ 100%. Với tài liệu nhiều section như Aquara, fix khôi phục được ĐÚNG NỘI DUNG footer (không còn mất trắng) nhưng chưa khôi phục đủ SỐ LƯỢNG section/footerReference gốc — đây là cải thiện lớn (từ mất trắng 100% sang giữ được nội dung thật) nhưng chưa phải giải pháp trọn vẹn 100% cho trường hợp nhiều section phức tạp. Nên coi là việc tiếp theo nếu cần độ trung thực tuyệt đối cho tài liệu nhiều section.

## 8. Git log

```
e241179 feat(writer): re-inject section/header/footer from original DOCX on save (Phuong an A)
```

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>

---
*Hoàn thành theo HANDOFF-WRITER-SECTION-HEADER-FOOTER-FIDELITY.md §4: Phương án A — thêm `source_path` parameter.*
