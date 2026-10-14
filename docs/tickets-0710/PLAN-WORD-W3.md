# PLAN WORD-W3

- Objective: thêm So sánh/Gộp tài liệu và Hạn chế chỉnh sửa (chỉ đọc hoặc bắt buộc theo dõi thay đổi), có mật khẩu bỏ bảo vệ; không thêm mã hóa/mật khẩu mở tệp.
- Current capability: Writer đã nhập/xuất revision DOCX bằng review metadata; Python desktop bridge đã chuyển DOCX sang HTML offline và hậu xử lý OOXML khi lưu.
- Files/modules: `apps/writer` cho so sánh theo đoạn và dialog; `adapters/libreoffice/writer` cho command/state; `adapters/libreoffice/common` + `main.py` cho chọn tài liệu tham chiếu và `w:documentProtection`; `platform/commands`, `platform/i18n`, `platform/help`; test unit/CDP/DOCX và handoff ticket.
- Dependencies: chỉ dùng Web API/stdlib và LibreOffice hiện có; UI đi qua Command Bus → Writer Adapter → desktop bridge, không gọi LibreOffice implementation trực tiếp.
- Risks: ghép sai thứ tự đoạn, khóa nhập làm chặn thao tác duyệt hợp lệ, LibreOffice bỏ protection/revision khi convert; giảm thiểu bằng diff có test, allow-list thao tác, và hậu xử lý OOXML chuẩn.
- Test plan: unit cho diff/protection/command/i18n/help; CDP trên app desktop bằng profile riêng; tạo/lưu DOCX rồi đọc XML và Word COM `ProtectionType`/`Revisions`; `npm test` 100%; batch DOCX audit không hồi quy.
- Rollback: revert commit WORD-W3; không migration dữ liệu, không Core patch, không thay build system.
