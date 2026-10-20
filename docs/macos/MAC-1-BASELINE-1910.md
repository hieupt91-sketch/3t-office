# MAC-1 — Baseline `vn-main` trên macOS (19/10/2026)

## Phạm vi

- Nhánh: `mac/baseline-1910`
- Commit kiểm chứng: `3e58e5b65fcc8d719e5a463f71dc60d4c9207829`
- Máy: macOS, Python 3.12.15 trong virtualenv tạm, Node 26.11.1, LibreOffice tại `/Applications/LibreOffice.app/Contents/MacOS/soffice`.
- Chỉ kiểm chứng; không sửa test, expected output hoặc mã ứng dụng.

## Kết quả

| Cổng | Trạng thái | Bằng chứng |
|---|---|---|
| `npm test` | **FAIL** | 3764/3765 PASS, 1 FAIL. `Sheet: parseFods workbook snapshots match pre-optimization results`: hash thực tế `6490dc31f4627743669263da9e197bf0ff13c6ced1943e2aa61ffb9d93dfef9f`, baseline `27d6a029634b9d23b3018034ec3ac3e31f2695dc336f60a081eac86a2de15129`. |
| `node scripts/audit-0610/i18n_parity.mjs` | **PASS** | VI=3091, EN=3091, missingVI=0, missingEN=0, placeholderMismatch=0. |
| `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` | **FAIL** | Python hệ thống 3.9 **BLOCKED** do cú pháp `Path | None`; chạy lại Python 3.12 hoàn tất nhưng hạ 2 dòng Excel: dòng 231 (V→A) và 344 (V→N). Word và PowerPoint hạ 0 dòng. |
| `python -m pytest tests -q` | **FAIL** | 1066 passed, 11 failed, 17 skipped, 177 subtests passed. |

## Phân loại lỗi Python

### BLOCKED trên macOS / phụ thuộc Windows

- `tests/test_desktop_launch.py::...no_port_available`: test vá `ctypes.windll.user32`, không tồn tại trên macOS.
- Ba ca `tests/test_ooxml_encryption_roundtrip.py::test_vn_save_password_open_roundtrip[...]`: gọi `ctypes.OleDLL("ole32")`; phần COM/OLE Windows bị BLOCKED. Phần mã hóa Python không được sửa để né kiểm thử.
- `tests/test_writer_create_new_readback.py::...word_com_values...`: gọi `powershell`/Word COM; BLOCKED trên macOS.
- Mọi `*.ps1`/Office COM khác: **BLOCKED / NOT RUN** theo quy tắc bàn giao.

### FAIL cần chủ sở hữu xem xét

- `tests/test_error_reporting.py`: sender nền không gửi lần đầu trong 1 giây; chữ ký `open_document_dialog` thực tế có thêm `source_path`, `password` so với expected.
- `tests/test_os_services_p2.py`: hai kỳ vọng Windows không khớp backend portable/macOS (`show_error` và `LOCALAPPDATA`).
- `tests/test_p1_pool_orphans.py`: `_p1_parent_alive(os.getpid())` trả `False` trên macOS.
- `tests/test_process_tracker.py`: tiến trình con bị dừng nhưng ledger vẫn còn một record.

## Log thô

- `/tmp/3t-mac-baseline-npm-final.log`
- `/tmp/3t-mac-baseline-i18n.log`
- `/tmp/3t-mac-baseline-checklist.log`
- `/tmp/3t-mac-baseline-pytest.log`

## Kết luận

MAC-1 chưa đạt cổng xanh: Node còn 1 snapshot FAIL, checklist hạ 2 dòng Excel, Python còn 11 FAIL (trong đó 5 ca rõ ràng Windows-only/COM). Không thay đổi baseline hay expected để làm xanh.
