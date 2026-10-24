# REVIEW-AGY-24-10 — Rà soát độc lập đường LƯU/MỞ tệp (19→24/10)

- Phiếu việc: `E:\VNOffice-briefs\BRIEF-AGY-REVIEW-1.md` (AGY-REVIEW-1)
- Worktree: `E:\VNOffice-agy-review`, nhánh `review/agy-24-10`, HEAD `49e8c8d8`, base so sánh `ffdc4de8` (18/10)
- Phạm vi: chỉ đọc mã + viết báo cáo + thêm bài test tái hiện. Mọi số PASS/FAIL dưới đây là đã chạy thật.
- Trên máy có sẵn bộ đối chiếu COM Office thật: cuộc rà soát KHÔNG dùng COM, chỉ dùng `soffice.exe` CLI/persistent xuất hiện trong đường code.

## 1. Phạm vi diff (ffdc4de8..49e8c8d8)

| Tệp | Delta | Đã rà |
|---|---|---|
| `adapters/libreoffice/common/ooxml_zip_patch.py` | +1377/−168 | đầy đủ phần liên quan open/save overlay (pivot, chart, slides fonts, P1 metadata) |
| `main.py` | +357 | đầy đủ đường open_document_dialog / save / prewarm / mã hóa |
| `platform/print/print_pipeline.py` | +57 | `build_slides_handout_pdf` (3/6/9 per page, A4 landscape 841.89×595.28, margin 22, gap 12) |
| `adapters/libreoffice/{sheet,writer,slides}/*-adapter.js` | +678/−77 | vùng listener/tải tài liệu |
| `platform/security/office_encryption.py` | 0 (không đổi 17→24/10) | rà toàn 515 dòng vì nằm trên đường mở; Agile + Standard 2007 đều chuẩn theo MS-OFFCRYPTO; WrongPasswordError khi verifier khớp sai; HMAC toàn vẹn được kiểm |

Các commit dải 21→24/10 gồm `9210743e`, `ed508461`, `9f174d9b`, `7c8b4a7a`, `7c014405`, `e2b93842`, `976f72a1`, `c15da763`, `53245e5b`, `a4f3c5fe`, `6df7e416`, `635cd19f`, `49f4aff7`, `1956ebb8`, `fd1f190b`, `51a810ea` — đã khảo sát theo chủ đề; phần lớn thay đổi tập trung ở `ooxml_zip_patch.py`.

## 2. Kết luận tổng thể

Đường save/open mới nhìn chung **ổn** — P1 metadata, prewarm 3 vị trí, mã hóa OOXML, handout 3/6/9 đều có bài kiểm rất mạnh. Tìm thấy **2 lỗi CONFIRMED** (XML hỏng khi gặp thẻ pivot tự đóng — chi tiết mục 3) và một điểm **BLOCKED** cần theo dõi (pytest roundtrip chập chờn — chi tiết mục 6). Không tìm thấy lỗi độ bảo mật mới trong `office_encryption.py`.

## 3. Phát hiện CONFIRMED (đã chạy bằng chứng thật)

### C1. `_apply_refreshed_pivot_locations_from_fods` hỏng XML khi `pivotTableDefinition` tự đóng
- Tệp/Đoạn: `adapters/libreoffice/common/ooxml_zip_patch.py:6033-6037`
- Trạng thái: **CONFIRMED** (test mới chạy thật qua `ET.fromstring`)
- Hành vi: cắm ` xmlns:vno="...">` bằng `tag[:-1]` không phân biệt thẻ tự đóng (`/>`).
- Thực chứng chạy (nội bộ) — đầu vào `<pivotTableDefinition ... name="abc"/>`:
  `<pivotTableDefinition ... name="abc"/ xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" vno:filters="{}">` → `ET.fromstring` → `ParseError: not well-formed: line 1, column 99`
- Có thể xảy ra khi bảng pivot không còn trường nào (LibreOffice ghi thẻ tự đóng). Độ ưu tiên: vừa; không phá file bình thường hiện tại.
- Khắc phục đề xuất: rẽ `xml.sax.saxutils`/parser thay cho string surgery; hoặc đơn giản chèn namespace vào thẻ root `<pivotTableDefinition ...>` với kiểm tra `tag.endswith('/>')` để xử lý riêng.
- Tái hiện trong test: `tests/test_review_agy_24_10_repro.py` → `test_locations_from_fods_keeps_self_closing_definition_well_formed` (hiện `expectedFailure`).

### C2. `overlay_pivot_filter_metadata_to_fods.add_filters` hỏng XML khi `table:data-pilot-table` tự đóng
- Tệp/Đoạn: `adapters/libreoffice/common/ooxml_zip_patch.py:6067-6072`
- Trạng thái: **CONFIRMED** (test mới chạy thật qua `ET.fromstring`)
- Thực chứng: đầu ra `<table:data-pilot-table table:name="abc"/ vno:filters="{}">` → `ParseError: column 197`
- Trường hợp xảy ra trùng khớp C1 (bảng pivot rỗng).
- Tái hiện trong test: `tests/test_review_agy_24_10_repro.py` → `test_overlay_to_fods_keeps_self_closing_data_pilot_table_well_formed` (hiện `expectedFailure`).

## 4. Phát hiện PLAUSIBLE (mã cho thấy rủi ro, chưa tái hiện được trong điều kiện kiểm tại chỗ)

- **PP1 — `metadata_rows_native` cache key không phân biệt `include_xf`** (tệp `ooxml_zip_patch.py` — hàm `_xlsx_metadata_row_maps`): key `"metadata_rows_native"` dùng chung cho cả 2 giá trị `include_xf`; cờ này là biến môi trường đọc một lần nên một phiên thực tế không nhảy giá trị → chưa thấy va chạm trong use-case thật. Ghi nhớ nếu sau này có 2 đường gọi khác flag cùng phiên.
- **PP2 — `_restore_slides_embedded_fonts` chèn `embeddedFontLst` ngay trước `</p:presentation>`** (`ooxml_zip_patch.py:14307-14312`): đo thực nghiệm đầu ra LibreOffice thật từ `sample-slides.pptx` cho thấy sau `<p:notesSz .../>` kết thúc bằng `</p:presentation>` (không có `defaultTextStyle`/`extLst`) — hiện tại hợp lệ schema theo ECMA-376 CT_Presentation, trong đó `embeddedFontLst` phải đứng TRƯỚC `defaultTextStyle`/`extLst`. Để an toàn lâu dài, nên chèn trước `defaultTextStyle` khi phần tử đó tồn tại.
- **PP3 — `main._encrypt_ooxml_output`** (`main.py`): `os.remove(source_path)` chạy TRƯỚC replace nguyên tử → nếu `_atomic_replace_file` thất bại sau đó chỉ còn tệp tạm đã mã hóa; `tempfile.mkstemp` nằm ngoài khối `try/except` không được bọc thành `DocumentEngineError`. Không tái hiện được vì cần lỗi đĩa/đường dẫn thật.
- **PP4 — pytest roundtrip flaky**: chi tiết mục 6.
- **PP5 — Writer `insertTable` focus có thể trúng bảng không mong muốn** (`adapters/libreoffice/writer/writer-adapter.js` vùng focus sau `execCommand insertHTML`): chỉ thấy trên code path với nhánh `document.activeElement`; chưa kiểm UI thật.

## 5. Ghi chú cờ môi trường và bước tiếp theo

- `VNO_XLSX_FAST_METADATA_ATTRIBUTES` (mặc định ON, tắt bằng "=0") và các cờ `VNO_WRITER_SKIP_UNSAFE_PREWARM` / `VNO_SLIDES_SKIP_UNUSED_PREWARM` (đều mặc định 1) đều được code và test tương ứng quản lý — không cần can thiệp.
- Nếu muốn biến 2 test `expectedFailure` trong `tests/test_review_agy_24_10_repro.py` thành PASS thật: sửa 2 hàm C1/C2 trong `ooxml_zip_patch.py` rồi bỏ decorator.

## 6. Điểm BLOCKED cần ghi nhận

`python -m pytest tests/test_sheet_save_roundtrip.py::SheetSaveRoundtripTests::test_all_fixtures_roundtrip` FAIL 1 lần trong pytest đầy đủ đầu (SofficeExitError "Không chuyển đổi được tài liệu." — fixture `sample-sheet-hidden-autofilter.xlsx`). Ba lần chạy lại sau (pytest đầy đủ, file riêng, probe gọi `_run_soffice_convert` độc lập) đều PASS. Nghi ngờ race giữa persistent soffice worker và CLI conversion dùng chung profile (do commit sau `369f9cad`), nhưng CHƯA xác định nguyên nhân chính xác. **BLOCKED xác định nguyên nhân gốc** — không tái hiện được sau 3 lần thử; đề xuất thêm log timing vào `SofficeExitError` để lần sau có dữ liệu.

## 7. Kết quả kiểm cuối (nếu mọi commit giữ nguyên, full run cuối 24/10)

| Bộ kiểm | Kết quả | Chi tiết |
|---|---|---|
| `pytest tests` (đầy đủ, 24/10) | **PASS** | 1140 passed, 1 skipped, 2 xfailed (673.57s) |
| `pytest tests/test_review_agy_24_10_repro.py` | PASS (2 xfailed) | 2 test tái hiện CONFIRMED, đang expectedFailure |
| `pytest tests/test_sheet_save_roundtrip.py` (file riêng lần cuối) | PASS | 2 passed (81.19s) — phiên đầy đủ đầu FAIL 1 lần như mục 6 |
| `npm test` | **PASS** | 3793/3793 (đã chạy 24/10) |
| `node scripts/audit-0610/i18n_parity.mjs` | **PASS** | VI=3174 EN=3174, missingVI=0 missingEN=0, placeholderMismatch=0, emptyOrIdentical=21 (tồn tại từ trước) |

## 8. Không rà (ngoài phạm vi)

- COM automation Excel/Word/PowerPoint thật (phiếu việc chỉ dùng `soffice.exe`).
- UI runtime bằng Playwright/khả năng hiển thị — chỉ đọc code.
- Chuỗi Writer export FODS/ODS — phần này đã có unit test rõ ràng; khuyến nghị thêm golden fixture nếu tương lai có thay đổi thêm.
