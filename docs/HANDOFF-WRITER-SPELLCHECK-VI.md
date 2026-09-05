# Agent Handoff

TASK: Kiểm tra chính tả tiếng Việt thật cho VN Writer

AGENT/ROLE: Codex / Writer + Shared Platform

BRANCH: `feature/writer-spellcheck-vi`

WORKTREE: `E:\VNOffice-codex-spellcheck-vi`

OBJECTIVE: Kiểm tra chính tả tiếng Việt hoàn toàn cục bộ trong Writer, chạy realtime, gạch chân từ chưa chắc chắn và cung cấp menu sửa/bỏ qua/thêm từ cá nhân.

FINDINGS:

- Writer dùng ba vùng `contenteditable` độc lập (header/body/footer) trong `apps/writer/writer-app.js`; browser spellcheck bị tắt chủ động.
- Không có spellchecker dùng chung trong Platform trước thay đổi này.
- Từ điển Hunspell tiếng Việt do LibreOffice phân phối phù hợp thứ tự reuse-before-rewrite và không cần API/runtime package.

IMPLEMENTATION SUMMARY:

- Thêm tokenizer Unicode NFC, kiểm tra membership theo âm tiết, Levenshtein có ngưỡng, danh sách bỏ qua theo phiên và từ điển cá nhân qua `localStorage`.
- Thêm DOM controller dùng debounce 400 ms, giữ caret theo text offset, bọc riêng token chưa chắc chắn bằng `.vno-spelling-uncertain`, và dọn listener/menu theo lifecycle Writer.
- Menu chuột phải có tối đa 5 gợi ý gần, “Bỏ qua”, “Thêm vào từ điển”; các nút có role menu/menuitem và focus keyboard.
- Token viết hoa kiểu tên riêng và chữ viết tắt chưa biết không bị đánh dấu để giảm false positive. Đây là lựa chọn bảo thủ: feature chỉ khẳng định “chưa chắc chắn”, không cố bắt mọi lỗi.
- Dữ liệu được đóng gói thành ES module tĩnh để chạy cả HTTP và `file://`; file `.dic` nguyên bản được giữ để audit provenance.
- Chưa áp dụng cho Slides; Writer được ưu tiên và hoàn thiện/test đầy đủ trước.

## Nguồn từ điển và giấy phép

- Nguồn: LibreOffice Dictionaries, `dictionaries/vi/vi_VN.dic`, bản lấy từ nhánh `master` ngày 2026-09-05.
- Upstream: https://github.com/LibreOffice/dictionaries/tree/master/vi
- Tác giả ghi trong upstream: Ivan Garcia và Nguyễn Xuân Minh; dựa trên danh sách Từ Điển Tiếng Việt của Hồ Ngọc Đức.
- Giấy phép dữ liệu: GNU GPL phiên bản 2, giữ nguyên tại `platform/text/dictionaries/LICENSES-vi.txt`.
- Kích thước: header upstream khai báo 6.631 mục; 6.631 dòng dữ liệu được đóng gói, trong đó engine chuẩn hóa thành 6.630 mục phân biệt sau lowercase/NFC.
- Không dùng dịch vụ trả phí, không gọi cloud, không gửi nội dung tài liệu ra ngoài và không thêm dependency.

### Đánh giá theo Dependency Policy

- Purpose: danh sách âm tiết hợp lệ và nền gợi ý cho spellcheck tiếng Việt.
- Alternatives: VNTK/Viet74K bị loại vì provenance/license dữ liệu không đủ rõ dù repo code ghi MIT; tự viết vài nghìn từ bị loại vì chất lượng thấp hơn nguồn LibreOffice hiện hữu.
- License: GPL-2.0, được phân phối như data file tách biệt với attribution nguyên bản theo yêu cầu GPL-compatible của task.
- Maintenance: nằm trong kho dictionaries chính thức của LibreOffice; dữ liệu tiếng Việt cũ và ít thay đổi.
- Security: plain text tĩnh, được parse thành Set; không binary, không code bên thứ ba thực thi, không network runtime.
- Build/platform impact: khoảng 40 KB `.dic` và module dữ liệu tương ứng; chạy trong trình duyệt/WebView trên mọi platform hỗ trợ ES modules và Unicode property escapes.
- Update strategy: cập nhật thủ công từ upstream LibreOffice, giữ license và chạy lại unit/live tests; không tự động tải dữ liệu.

## False-positive và giới hạn

- Corpus acceptance hiện có 86 token trong 5 câu văn phòng/giáo dục có dấu: 0 false positive (0%). Đây là corpus kiểm thử có chủ đích, không phải ước lượng thống kê cho toàn bộ tiếng Việt.
- Ước tính thực tế: thấp với văn bản phổ thông vì dictionary bao phủ hơn 6.600 âm tiết và bỏ qua tên riêng/chữ viết tắt viết hoa; từ vay mượn viết thường, tiếng lóng và tên riêng viết thường vẫn có thể bị đánh dấu.
- Kiểm tra theo âm tiết tách bằng khoảng trắng, không kiểm tra ngữ pháp/ngữ cảnh và không bắt lỗi “từ thật nhưng dùng sai” (ví dụ hai âm tiết đều hợp lệ nhưng ghép sai nghĩa).
- Heuristic tên riêng làm giảm phiền nhưng có thể bỏ sót lỗi ở token viết hoa.
- Gợi ý dùng Levenshtein ngắn trên dictionary âm tiết; chưa xếp hạng theo tần suất/ngữ cảnh.
- Marker là span hiển thị trong DOM editor; controller giữ caret khi refresh, nhưng các tổ hợp selection phức tạp qua nhiều node vẫn cần kiểm thử mở rộng khi tích hợp sâu với document model.

FILES CHANGED:

- `platform/text/dictionaries/vi_VN.dic`
- `platform/text/dictionaries/vi-dictionary.js`
- `platform/text/dictionaries/LICENSES-vi.txt`
- `platform/text/vi-spellchecker.js`
- `platform/text/spellcheck-dom-controller.js`
- `apps/writer/writer-app.js`
- `apps/writer/writer.css`
- `tests/unit/vi-spellchecker.test.js`
- `tests/live/writer-spellcheck-vi.playwright.mjs`
- `tests/run-tests.js`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-SPELLCHECK-VI.md`

COMMANDS RUN:

- `node tests/live/writer-spellcheck-vi.playwright.mjs`
- `node tests/run-tests.js`
- Targeted unit, syntax and HTML smoke commands during implementation.

BUILD RESULT: NOT RUN — repository không có build script; syntax check nằm trong master test suite.

TEST RESULTS: PASS — `node tests/run-tests.js`: 667/667 PASS, 0 FAIL, 12.7 giây. PASS — live Playwright: 10/10 assertion, gồm marker/CSS/layout/menu/gợi ý/localStorage và không có pageerror. Ảnh kiểm chứng runtime: `%TEMP%\writer-spellcheck-vi.png`.

KNOWN FAILURES: Không có trong các test đã chạy.

RISKS: Xem mục False-positive và giới hạn; dữ liệu GPL-2.0 phải tiếp tục được phân phối cùng attribution/license.

DEPENDENCIES/BLOCKERS: Không có dependency runtime; không có blocker hiện tại.

CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.

NEXT ACTION: Người phụ trách review các commit trên branch này và tự merge nếu chấp thuận. Có thể mở task riêng để reuse controller cho Slides text box.
