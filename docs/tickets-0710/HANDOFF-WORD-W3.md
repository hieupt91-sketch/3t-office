# HANDOFF WORD-W3

Đã làm: Thêm So sánh/Gộp theo đoạn, tạo tài liệu kết quả chưa lưu với dấu chèn/xóa để duyệt; UI đi qua Command Bus → Writer Adapter → desktop bridge cục bộ.
PASS: Unit so sánh và CDP desktop xác nhận cả `writer.review.compare` lẫn `writer.review.combine` tạo đúng 1 đoạn chèn + 1 đoạn xóa.
File đổi: `apps/writer/document-review.js`; `adapters/libreoffice/writer/writer-adapter.js`; `adapters/libreoffice/common/uno-bridge.js`; `main.py`; `apps/writer/writer-ribbon.js`; `platform/commands/command-bus.js`; `platform/commands/command-definitions.js`.

Đã làm: Thêm hạn chế chỉ đọc/bắt buộc theo dõi thay đổi, mật khẩu bỏ bảo vệ, nhập/xuất `w:documentProtection`; verifier dùng salt + UTF-16LE theo OOXML và hỗ trợ SHA-1/256/384/512. Không thêm mã hóa hay mật khẩu mở tệp.
PASS: Python 3/3; unit Writer Review 5/5; CDP báo sai mật khẩu rõ ràng; ứng dụng desktop thật đọc `ProtectionType=0`, `Revisions=2` và mở khóa đúng mật khẩu thành `ProtectionType=-1`.
File đổi: `apps/writer/document-review.js`; `adapters/libreoffice/writer/writer-adapter.js`; `adapters/libreoffice/common/ooxml_zip_patch.py`; `main.py`; `tests/test_writer_document_protection.py`; `tests/unit/writer-document-review.test.js`; `tests/live/cdp/writer-word-w3.desktop.mjs`.

Đã làm: Thêm nhãn/tooltip VI-EN và hướng dẫn tiếng Việt cụ thể tại tab Đánh giá, nhóm So sánh & Bảo vệ; nêu rõ mật khẩu bỏ bảo vệ không mã hóa tệp.
PASS: `npm test` gồm guard command/ribbon/Help/i18n và hard-coded English UI đều đạt; không dùng tên sản phẩm khác trong Help/dialog/i18n mới.
File đổi: `platform/i18n/strings-vi.js`; `platform/i18n/strings-en.js`; `platform/help/entries-writer.js`; `apps/writer/writer-ribbon.js`.

Đã làm: Audit lại toàn bộ gate cuối trên HEAD bằng các profile riêng WORD-W3; tài liệu thật và kết quả audit đều ở ngoài Git.
PASS: `npm test` 3197/3197; CDP desktop So sánh/Gộp/Bảo vệ PASS, `ProtectionType=0→-1`, `Revisions=2`; DOCX audit 7/7 (`d01,d02,d06,d07,d13,d20,d24`) edit PASS và page delta 0.
File đổi: `tests/run-tests.js`; báo cáo tái nghiệm thu ngoài repo tại `E:\VNOffice-profiles\word-w3-codex-final-docx\batch\batch_document_audit_report.md`.
