# SPEC — Đưa VN Writer (3T Doc) lên 100% rồi tới Sheet, Slides; kết hợp pháp lý liên tục

Lập: 06/10/2026 · Người phụ trách chốt thứ tự: **Doc 100% → Sheet 100% → Slides 100%**, pháp lý chạy xen kẽ liên tục. Nguyên tắc vận hành: agent nào hết việc thì tự nhận ticket kế tiếp trong hàng đợi; Claude làm cùng, không ngồi chờ.

## 1. Định nghĩa "Doc 100%" (nghiệm thu)
Doc đạt 100% khi **cả bốn nhóm** đạt:
| # | Nhóm | Tiêu chí đạt | Cách kiểm |
|---|---|---|---|
| A | Chức năng | 0 mục THIẾU/MỘT PHẦN mức quan trọng 1–2 trong `docs/GAP-DOC-VS-WORD-0610.md`; mọi nút ribbon có tác dụng hoặc có thông báo rõ | ma trận gap + `scripts/audit-0610/` + `tests/unit` |
| B | Trung thực chuyển đổi | Tài liệu mới: lưu DOCX khớp màn hình (căn lề, khoảng cách, phông, bảng, header/footer, ghi chú, theo dõi thay đổi). Tài liệu thật: 24 docx + 20 doc — mở, sửa, lưu, mở lại: số trang = bản Word = bản lưu, 0 mất dữ liệu | `batch_document_audit.py docx` (cần Word COM) + XML |
| C | Kịch bản hành chính | 30 kịch bản (công văn, quyết định, hợp đồng, biên bản, báo cáo có mục lục, bảng biểu, danh sách, chuẩn Nghị định 30/2020/NĐ-CP) chạy tự động, 30/30 PASS | `scripts/audit-0610/doc_admin_30.mjs` |
| D | Chất lượng | Giao diện 100% tiếng Việt, bàn phím dùng được mọi nút, 0 chồng/cắt chữ ở 1366×768 và 1920×1080 tại 100% và 125%, trợ giúp có bài cho mọi lệnh; node/Python/desktop xanh; Undo/Redo phủ mọi lệnh định dạng; mở/lưu tài liệu 200 trang không treo | node, Python, desktop 27, ma trận Undo, đo thời gian |
Ngoài phạm vi 1.0 (ghi trung thực): macro/script, đồng soạn thảo thời gian thực.

## 2. Gói việc Doc (D) — người làm, tệp, tiêu chí XONG
| Gói | Nội dung | Người làm | Tệp chính | XONG khi |
|---|---|---|---|---|
| D1 | Lưu DOCX tài liệu mới mất căn đều/khoảng cách mặc định | Codex (đang chạy) | `adapters/libreoffice/writer/writer-adapter.js` `_contentForExport` | `doc_recheck2.mjs` ALIGN_JUSTIFY, AFTER_6 PASS; đường mở từ DOCX gốc không đổi byte (3 mẫu) |
| D2 | Ma trận gap Doc vs Word + 10 kịch bản đầu | Codex (đang chạy) | `docs/GAP-DOC-VS-WORD-0610.md` | ≥ 150 dòng có bằng chứng; danh sách 25 mục ưu tiên |
| D3 | Đánh bóng giao diện Writer | agy (đang chạy) | `apps/writer/*.css`, `platform/ui-kit` | `docs/UI-WRITER-POLISH-0610.md`; node xanh; ảnh trước/sau |
| D4 | Hộp thoại Đoạn văn: tab "Ngắt dòng và ngắt trang" (giữ cùng trang kế tiếp, giữ dòng liền nhau, ngắt trang trước, kiểm soát dòng mồ côi/góa), mức đề mục (Outline), hộp Tab stops | Claude | `apps/writer/paragraph-dialog.js`, adapter `getParagraphDialogState/applyParagraphDialogValues` | áp dụng đúng + lưu DOCX có `w:keepNext`, `w:keepLines`, `w:pageBreakBefore`, `w:widowControl`, `w:outlineLvl`, `w:tabs`; 1 Áp dụng = 1 Hoàn tác; bài Hướng dẫn |
| D5 | Xác nhận ghi đè bằng hộp thoại tiếng Việt trong app (A5) và luồng Lưu thành | Codex | `main.py` save-as, `platform/ui-kit/dialogs.js` | ghi đè đường dẫn có sẵn luôn hỏi; Esc = hủy; test CDP |
| D6 | 30 kịch bản hành chính tự động | Codex | `scripts/audit-0610/doc_admin_30.mjs` | 30/30 PASS, mỗi kịch bản kiểm XML DOCX + hiển thị |
| D7 | Bộ tài liệu thật 24 docx + 20 doc | Claude chạy cổng; Codex sửa lỗi | `scripts/layout-audit/batch_document_audit.py` | số trang Word = VN = bản lưu; nếu Word COM không chạy: đối chiếu số trang bằng LibreOffice PDF trước/sau và ghi rõ là cổng thay thế |
| D8 | Ma trận Undo/Redo cho mọi lệnh `writer.*` | agy/Codex | `tests/live/cdp/` | mỗi lệnh định dạng: áp dụng → Ctrl+Z trả đúng → Ctrl+Y áp lại |
| D9 | Phím tắt chuẩn Word (đối chiếu `docs/SHORTCUT-COVERAGE.md`) kiểm trên app | Codex | `platform/commands/command-definitions.js` | 100% phím tắt trong danh sách hoạt động, 0 xung đột |
| D10 | Hướng dẫn tiếng Việt cho mọi lệnh Doc | agy | `platform/help/entries-*.js` | `tests/unit/help-coverage.test.js` xanh; bài có bước dùng cụ thể |
| D11 | Tốc độ Doc so với Word/LibreOffice (G3) | Claude | `docs/SPEC-PERF-OPEN.md` | VN ≤ LibreOffice và ≤ 1,5× Word trên d03, d12, d24, legacy .doc |
| D12 | Ổn định: tài liệu 200 trang, gõ liên tục, tự khôi phục sau tắt đột ngột | Codex | `scripts/audit-0610/` | độ trễ gõ < 100 ms ở trang 150; khôi phục nội dung sau kill PID |
| D13 | Mục từ gap D2 (25 mục ưu tiên) — nhận dần khi D2 xong | cả nhóm | theo D2 | từng mục đóng bằng test + hướng dẫn |

## 3. Hàng đợi và quy tắc nhận việc
1. Thứ tự ưu tiên: lỗi mất dữ liệu > lỗi lưu/mở sai → D2/D13 mục quan trọng 1 → kịch bản D6 → UI D3/D10 → còn lại.
2. Agent xong ticket → Claude (hoặc agent) lấy gói kế tiếp chưa có người trong bảng trên; **không để agent rảnh**. Tối đa 2 luồng Codex, 1–2 luồng agy; một nhánh + một worktree cho mỗi ticket.
3. Mỗi ticket theo mẫu: Mục tiêu · Phạm vi (tệp, điều cấm) · Hiện trạng (bằng chứng) · Tiêu chí XONG · Xác minh · Phản hồi tối đa 4 dòng.
4. Claude xác minh độc lập trước khi merge: chạy lại node, Python liên quan, hồi quy desktop, và đọc diff; không tin báo cáo của agent chưa có bằng chứng.
5. Cấm: SendKeys/OS input, kill theo tên tiến trình, Word COM trong test mới (chỉ làm đối chiếu), disable test, đổi expected để xanh.
6. Môi trường: cổng đối chiếu Word/Excel COM đang báo "đang bận"; **việc của chủ sở hữu**: mở Word và Excel bằng tay một lần để xóa hộp thoại đầu tiên. Trong lúc chờ dùng cổng thay thế (XML + LibreOffice PDF).

## 4. Đường pháp lý chạy xen kẽ (L)
| Gói | Nội dung | Người làm | Khi nào |
|---|---|---|---|
| L1 | Nháp EULA, chính sách bảo mật, điều khoản dùng thử (`docs/legal/`) | Claude | ngay, song song |
| L2 | Cập nhật `THIRD-PARTY-NOTICES` (WebView2, thư viện con LibreOffice, Common Voice CC0) + sinh SBOM | Codex | khi rảnh |
| L3 | Dọn bộ cài LibreOffice: bỏ 24 gói từ điển GPL và các gói không dùng, bỏ 2 tệp `.msi` trong thư mục `tools/libreoffice` (≈ 38 MB); kiểm chuyển đổi 3 app bằng bản mới qua `VNOFFICE_SOFFICE_PATH` | Claude | khi máy desktop rảnh |
| L4 | Gói gửi luật sư: nháp văn bản + SBOM + danh sách nhãn hiệu + dữ liệu thu thập (mã máy, báo lỗi) | Claude | sau L1–L3 |
| L5 | Quyết định của chủ sở hữu: nhà cung cấp thanh toán, chính sách đơn miễn phí, sau 30 ngày dùng thử, chứng thư ký số, đăng ký nhãn hiệu | chủ sở hữu | — |

## 5. Sau Doc
- **Sheet 100%:** ma trận gap tương tự; 12 mục UI chưa kiểm; nhận dạng số tiền VND (nhánh `fix/sheet-currency-input-codex` đã tạo, tạm dừng); bộ 28 xlsx + 20 xls; tốc độ lan14.
- **Slides 100%:** kiểm ở mức người dùng thật (nhánh `audit/slides-ui-agy` đã tạo, tạm dừng); mở rộng bộ pptx mẫu; mục backlog Morph đầy đủ, phát trực tuyến, ghi âm.
- Mỗi app kết thúc bằng một báo cáo nghiệm thu theo cùng 4 nhóm A–D.
