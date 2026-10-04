# Agent Handoff

TASK: Giảm thời gian Xem trước khi in cho VN Sheet và VN Slide theo đường worker đã áp dụng cho VN Doc.

AGENT/ROLE: Codex / coding agent

BRANCH: `perf/print-sheet-slide-codex`

WORKTREE: `E:\VNOffice-codex-print`

OBJECTIVE: Giữ các bước chuyển đổi riêng của Print Preview trên persistent LibreOffice worker, tránh CLI/worker ping-pong; không thay đổi đường Lưu/Xuất, UI hoặc định dạng tài liệu.

FINDINGS:

- Baseline `VNO_PRINT_LEGACY=1` cho thấy `FODS/FODP -> XLSX/PPTX` và `XLSX/PPTX -> PDF` chạy CLI; worker phải khởi động lại trước khi inspect/render PDF.
- Sheet chịu chi phí lớn nhất: `lan03.xlsx` khoảng 30,4 giây và `lan26.xlsx` khoảng 18,8 giây.
- `fast_pdf_page_count` đã loại inspect bằng engine ở đường mới; baseline legacy vẫn tốn 3,3–4,0 giây cho `print_inspect_pdf`.
- Sau thay đổi, `VNO_PRINT_VERIFY=1` xác nhận số trang và số byte PDF của worker bằng tuyệt đối với CLI trên cả bốn tệp.

## Plan gate

- Current capability: Doc đã dùng worker trong `_PRINT_CONTEXT` và đã có `VNO_PRINT_LEGACY`/`VNO_PRINT_VERIFY`; Sheet/Slide chưa cho các cặp native/PDF đi qua worker.
- Files/modules: `main.py`, test worker Python, probe CDP và handoff này.
- Dependency: persistent soffice manager và print pipeline hiện hữu; không thêm dependency.
- Risk: UNO và CLI có thể cho PDF khác nhau; Save/Export có thể vô tình đổi đường chạy; worker có thể restart khi render deck Slide lớn.
- Test plan: đo app desktop thật qua CDP; verify trang/byte PDF; kiểm ba scope Sheet; chạy suite JS, Python và desktop regression.
- Rollback: revert commit của branch hoặc đặt `VNO_PRINT_LEGACY=1` để dùng nguyên đường cũ ngay khi chạy.

IMPLEMENTATION SUMMARY:

- Thêm `_is_print_persistent_pair()` cho đúng năm cặp print-only (gồm cặp Writer đã có): HTML→DOCX, FODS→XLSX, XLSX→PDF, FODP→PPTX, PPTX→PDF.
- `_convert_print_source_to_pdf()` đặt và khôi phục `_PRINT_CONTEXT.active`, nên PDF Sheet/Slide được dùng worker chỉ trong Print Preview/Print.
- `VNO_PRINT_LEGACY=1` giữ nguyên CLI cũ. Save/Export không có `_PRINT_CONTEXT`, vì vậy không đổi hành vi.
- Thêm test guard cho phạm vi print-only, legacy rollback và khôi phục thread-local context.
- Thêm probe CDP gọi `common.file.print`, chờ `.vno-print-preview-stage img/canvas`, rồi thu timing từng stage.

## Số đo trước/sau

Điều kiện: app desktop thật qua `launchApp`, chỉ CDP; `VNO_PERF_DEBUG=1`; không dùng Office COM; mỗi lần chạy có LOCALAPPDATA riêng dưới `E:\VNOffice-profiles\codex-print-N`. Đơn vị: ms. Các stage là trung bình hai lần; Total giữ cả hai lần đo.

| App / tệp | Total trước (run 1 / run 2) | Total sau (run 1 / run 2) | Cải thiện TB | write interchange trước → sau | convert native trước → sau | convert PDF trước → sau | inspect PDF trước → sau | render page trước → sau |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Sheet `lan03.xlsx` | 30.277 / 30.603 | 18.477 / 18.636 | 30.440 → 18.557 (**39,0%**) | 57,4 → 57,1 | 19.330,8 → 14.399,0 | 4.339,2 → 962,8 | 3.377,2 → 0,6 | 450,3 → 518,4 |
| Sheet `lan26.xlsx` | 18.700 / 18.803 | 6.195 / 6.143 | 18.752 → 6.169 (**67,1%**) | 64,4 → 62,9 | 6.237,7 → 1.317,2 | 4.591,2 → 852,2 | 3.973,8 → 1,1 | 1.032,0 → 1.095,1 |
| Slide `sample-3.pptx` | 20.332 / 20.417 | 16.104 / 12.197 | 20.375 → 14.151 (**30,5%**) | 90,4 → 86,6 | 5.939,0 → 5.315,9 | 6.862,4 → 3.690,6 | 4.031,9 → 12,4 | 1.201,7 → 1.418,9 |
| Slide `BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx` | 13.695 / 13.817 | 5.903 / 6.023 | 13.756 → 5.963 (**56,7%**) | 1,1 → 0,8 | 4.072,8 → 3.400,5 | 4.279,3 → 498,5 | 3.437,4 → 0,5 | 483,1 → 493,8 |

Ghi chú: `sample-3.pptx` run sau thứ nhất có một lần UNO bridge restart an toàn trước render, nên `uno_render_pdf_page` trung bình tăng; run thứ hai không restart. Tổng thời gian cả hai lần vẫn nhanh hơn baseline.

## Đối chiếu PDF (`VNO_PRINT_VERIFY=1`)

| Tệp | Trang worker / CLI | Byte worker / CLI | Fast count / engine | Kết quả |
|---|---:|---:|---:|---|
| `lan03.xlsx` | 11 / 11 | 246.747 / 246.747 | 11 / 11 | PASS |
| `lan26.xlsx` | 12 / 12 | 669.882 / 669.882 | 12 / 12 | PASS |
| `sample-3.pptx` | 10 / 10 | 10.093.697 / 10.093.697 | 10 / 10 | PASS |
| `BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx` | 17 / 17 | 228.623 / 228.623 | 17 / 17 | PASS |

## Sheet print scope

| Scope | Tệp | Bằng chứng preview |
|---|---|---|
| `active` | `lan26.xlsx` | PASS; 12 trang, 669.882 byte trong lượt verify |
| `workbook` | `lan26.xlsx` | PASS; preview được dựng lại, PDF 1.794.057 byte |
| `selection` | `lan26.xlsx` | PASS; preview được dựng lại, PDF 111.079 byte |

FILES CHANGED:

- `main.py`
- `tests/test_persistent_soffice_operations.py`
- `tests/live/cdp/print-preview-perf.mjs`
- `docs/HANDOFF-PERF-PRINT-SHEET-SLIDE.md`

COMMANDS RUN:

- `node --experimental-websocket tests/live/cdp/print-preview-perf.mjs ...` cho 8 baseline, 8 after, 4 verify và scope workbook/selection.
- `python -m unittest tests.test_persistent_soffice_operations tests.test_print_pipeline tests.test_print_fast_page_count tests.test_print_save_pipeline`
- `node tests/run-tests.js`
- `python -m unittest tests.test_print_pipeline tests.test_print_fast_page_count tests.test_persistent_soffice_operations tests.test_g7_save_as_dialog`
- `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`

BUILD RESULT: PASS qua syntax checks trong `node tests/run-tests.js`; task không có bước build đóng gói riêng.

TEST RESULTS:

- PASS — targeted print/worker: 33 tests.
- PASS — `node tests/run-tests.js`: 2755/2755 PASS, 0 FAIL.
- PASS — Python theo task: 27 tests, OK.
- PASS — desktop regression rerun: 27 PASS, 0 FAIL, 0 BLOCKED, 6 N/A.
- PASS — PDF verify và ba Sheet scopes như hai bảng trên.

KNOWN FAILURES:

- Lượt desktop regression đầu tiên: 12 PASS, 3 FAIL, 6 N/A do đặt thẳng `VNO_CDP_LOCALAPPDATA`; `launchApp` khi đó trả `profileRoot=null` nhưng runner gọi `path.join(session.profileRoot, "documents")`. Rerun bằng `TEMP/TMP=E:\VNOffice-profiles\codex-print-24` tạo profile riêng hợp lệ và PASS 27/27. Không sửa harness ngoài scope.

RISKS:

- Deck Slide lớn đôi khi làm read-only render phải restart UNO bridge một lần; manager hiện có retry an toàn và run kế tiếp không lặp lại. Không thấy sai PDF hay lỗi preview.
- `VNO_PRINT_VERIFY=1` cố ý chạy thêm CLI/engine inspect nên chậm; đây chỉ là chế độ chẩn đoán.

DEPENDENCIES/BLOCKERS: Không có.

CORE PATCH ID (if any): N/A — không sửa LibreOffice Core/upstream.

NEXT ACTION: Claude review và merge/cherry-pick commit của branch `perf/print-sheet-slide-codex`; không merge trực tiếp vào `main` từ worktree này.
