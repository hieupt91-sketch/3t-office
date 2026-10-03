# CH-5.6 — Bảo toàn đầu/chân trang, thay đổi và nhận xét khi lưu DOCX

TASK: CH-5.6 DATA LOSS ON SAVE, tiếp tục từ các commit WIP sau khi phiên trước hết hạn mức.
AGENT/ROLE: Codex / Doc persistence và kiểm thử tích hợp.
BRANCH: `fix/ch5-doc-save-data-loss-codex`.
WORKTREE: `E:\VNOffice-codex-ch56`.
OBJECTIVE: DOCX mở lại trong Doc/Word giữ đầu/chân trang, PAGE/NUMPAGES, trang đầu khác biệt, revisions có tác giả/thời gian và comments có neo.

CURRENT CAPABILITY / FINDINGS:
- LibreOffice HTML làm phẳng revisions/comments; giải pháp tái sử dụng LibreOffice conversion rồi phủ metadata nguồn thành OOXML chuẩn ở Adapter, không sửa Core.
- Tài liệu không sửa dùng nguyên bytes package gốc. Body-only edit giữ header/footer, revisions, comments và OMML chưa sửa.
- Header/footer được tạo thành parts + relationships + references theo từng section; section dùng chung không bị ghi đè chéo.
- Review ranges dùng bookmark tạm, sau conversion được tạo thành `w:ins`/`w:del`, `comments.xml`, comment range/reference với author/date. PDF dùng accepted view.
- Import section giữ đoạn có nội dung; phương trình ở đầu section không làm lệch mapping header; PAGE và NUMPAGES được đọc riêng.

FILES/MODULES:
- Product: `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/writer/writer-adapter.js`, `main.py`, `platform/help/entries-writer.js`.
- Tests: `tests/test_writer_review_roundtrip.py`, `tests/live/writer-review-save.desktop.mjs`, `tests/unit/writer-review-export.test.js`, các regression Writer liên quan và `tests/run-tests.js`.
- Help: ba bài tiếng Việt hiện có cho Đầu/chân trang, Theo dõi thay đổi và Thêm ghi chú đã mô tả đường dẫn ribbon và lưu DOCX/PDF.

IMPLEMENTATION SUMMARY:
- Source-aware OOXML overlay bảo toàn package Word và tạo markup native cho nội dung mới từ Doc.
- Save pipeline nhận review metadata và section metadata qua boundary `UI -> Writer Adapter -> Python API -> OOXML patch`.
- Không thêm dependency, không đổi build system, không sửa LibreOffice Core/upstream.

TEST RESULTS (lượt cuối 03/10/2026):

| Gate | Trạng thái | Bằng chứng |
|---|---|---|
| Target Python review pipeline | PASS | `E:\tmp\ch56-final\writer-review-python.log`: 8/8, gồm package pristine, body-only, header/footer edit, cross-paragraph ranges, equation/section. |
| Target Node review metadata | PASS | `E:\tmp\ch56-final\writer-review-export.log`: 1/1. |
| Desktop new Doc, CDP save/reopen | PASS | `E:\tmp\ch56-final\desktop-new-cdp.log`: header, tracking, comment, Ctrl+S, OOXML parts và reopen đều đạt. Mỗi app run dùng `LOCALAPPDATA` riêng. |
| Desktop Word-authored package, CDP-only từ phiên trước | PASS | `E:\tmp\ch56-resume\desktop-fixed-equation-cdp.log`: body/header/review edit, save và reopen trong Doc đạt; Word phase khi đó deferred. |
| Hidden Word COM readback | BLOCKED | Word COM trả `RPC_E_CALL_REJECTED` kéo dài cả với tài liệu trống do Word tự tạo và khi khởi động `/a`; package CH-5.6 chưa được app mở ở lượt lỗi. Chỉ dừng các PID do lượt này tạo. |
| Full Node gate | PASS | `E:\tmp\ch56-final\node-full.log`: 2574/2574, 0 FAIL. Không có FODS failure nên không cần rerun riêng. |
| Full Python gate | FAIL | `E:\tmp\ch56-final\python-full.log`: 575 tests, 1 error. Test equation Word COM bị cùng `RPC_E_CALL_REJECTED`, sau đó file tạm còn bị Word giữ; 574 test khác đạt. |
| Legacy layout gate | BLOCKED | Không khởi chạy batch cuối vì Word oracle bị blocker COM nói trên; chạy sẽ chờ 400 giây mỗi file mà không sinh số trang tin cậy. Script CDP-only giữ untracked. |
| `git diff --check` | PASS | Không có whitespace/error marker. |
| Build/package | NOT RUN | Không đổi build/package; runtime/import đã đi qua full Node và Python gates. |

KNOWN FAILURES / BLOCKERS:
- Office local đang có modal/trạng thái bận khiến mọi Word automation từ chối RPC. Full Python chỉ lỗi test `test_new_document_saves_one_word_editable_equation` vì blocker này.
- Legacy report dở dang cũ ở `E:\tmp\ch56-resume\legacy-layout\_batch_writer_report.md` chỉ có d01–d09; d03/d06 load fail khi tải đồng thời nên không dùng làm acceptance cuối.
- Chưa hỗ trợ UI tạo/trả lời threaded comment; review range qua ranh giới bảng báo lỗi để tránh ghi đè nguồn. Không claim hỗ trợ mọi revision phi văn bản.

DEPENDENCIES/RISK:
- Cần LibreOffice, WebView2 và Word COM cục bộ. Rủi ro còn lại tập trung ở Word readback và page-count gate chưa đo được trong trạng thái Office hiện tại.
- Baseline layout: `E:\VNOffice-dist\audit-sections-fixed\_batch_writer_report.md`; main comparison: `E:\VNOffice-dist\audit-docmain\_batch_writer_report.md`.

ROLLBACK: Revert các commit CH-5.6 trên nhánh này; không cần rollback Core hay dependency.
CORE PATCH ID: None.
NEXT ACTION: Owner chạy lại hidden Word COM + legacy layout khi Word hết modal/busy; saved pages phải bằng Word cho mọi file và canvas phải bằng main ở các hàng có baseline main. Sau đó review/merge nhánh; không tự merge vào main.

SAFETY NOTES:
- Không dùng SendKeys/SendInput/keybd_event/mouse_event/pyautogui; desktop chỉ dùng WebView2 CDP, Word chỉ qua COM ẩn.
- Không dừng tiến trình theo tên. Các PID Word do lượt này tạo và được xác minh theo thời điểm đã dừng: 16140, 33052, 8684, 14032, 18200, 15376, 4356.
- `scripts/layout-audit/_batch_writer_legacy.py` là bản copy cục bộ đã đổi transport sang CDP, giữ UNTRACKED và không commit. Không sửa/commit tài liệu công ty.
