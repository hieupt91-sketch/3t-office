# Agent Handoff

TASK: Kiểm tra chính tả tiếng Việt thật cho VN Writer

AGENT/ROLE: Codex / Writer + Shared Platform

BRANCH: `feature/writer-spellcheck-vi`

WORKTREE: `E:\VNOffice-codex-spellcheck-vi`

OBJECTIVE: Kiểm tra chính tả tiếng Việt hoàn toàn cục bộ trong Writer, chạy realtime, gạch chân từ chưa chắc chắn và cung cấp menu sửa/bỏ qua/thêm từ cá nhân.

FINDINGS:

- Writer dùng ba vùng `contenteditable` độc lập (header/body/footer) trong `apps/writer/writer-app.js`; browser spellcheck bị tắt chủ động.
- Không có spellchecker dùng chung trong Platform trước thay đổi này.
- Bản đầu dùng từ điển Hunspell do LibreOffice phân phối, nhưng dữ liệu đó là GPL-2.0 và không đạt policy MIT/CC0/public-domain của dự án; follow-up này đã loại bỏ hoàn toàn nguồn đó.

IMPLEMENTATION SUMMARY:

- Thêm tokenizer Unicode NFC, kiểm tra membership theo âm tiết, Levenshtein có ngưỡng, danh sách bỏ qua theo phiên và từ điển cá nhân qua `localStorage`.
- Thêm DOM controller dùng debounce 400 ms, giữ caret theo text offset, bọc riêng token chưa chắc chắn bằng `.vno-spelling-uncertain`, và dọn listener/menu theo lifecycle Writer.
- Menu chuột phải có tối đa 5 gợi ý gần, “Bỏ qua”, “Thêm vào từ điển”; các nút có role menu/menuitem và focus keyboard.
- Token viết hoa kiểu tên riêng và chữ viết tắt chưa biết không bị đánh dấu để giảm false positive. Đây là lựa chọn bảo thủ: feature chỉ khẳng định “chưa chắc chắn”, không cố bắt mọi lỗi.
- Dữ liệu CC0 được đóng gói thành ES module tĩnh để chạy cả HTTP và `file://`; không còn file `.dic` hay dữ liệu GPL trong feature.
- Chưa áp dụng cho Slides; Writer được ưu tiên và hoàn thiện/test đầy đủ trước.

## Nguồn từ điển và giấy phép

- Nguồn dữ liệu: 5.711 câu tiếng Việt trong Mozilla Common Voice, file `server/data/vi/sentence-collector.txt` tại snapshot commit `154dda177b3c45db8423b4f970bd131490b224b1` (2022-12-14), SHA-256 `6E6B9D0C3DB850237CC916811951C6536809EECCC15786BB8BDFA5D6B63C2552`: https://github.com/common-voice/common-voice/blob/154dda177b3c45db8423b4f970bd131490b224b1/server/data/vi/sentence-collector.txt
- File giấy phép thật được đọc trực tiếp trong chính thư mục dữ liệu: https://github.com/common-voice/common-voice/blob/154dda177b3c45db8423b4f970bd131490b224b1/server/data/LICENSE
- Nội dung giấy phép là **CC0 1.0 Universal** (SPDX `CC0-1.0`). Phần “Statement of Purpose” nói rõ phạm vi gồm cả original work và database; legal code cho phép từ bỏ quyền ở mức tối đa để mọi người có thể build upon, modify, incorporate, reuse và redistribute tự do cho mọi mục đích, kể cả thương mại. Bản ghi provenance và link legal code nằm tại `platform/text/dictionaries/LICENSES-vi.txt`.
- Quy trình biên soạn: đọc snapshot CC0; chuẩn hóa toàn corpus sang Unicode NFC; trích token chỉ gồm chữ cái; lowercase; loại trùng chính xác; sort theo locale `vi`; đóng gói 2.798 token phân biệt vào ES module. Không trộn dữ liệu LibreOffice/Hunspell/Hồ Ngọc Đức/Wiktionary/OpenSubtitles.
- Kiểm tra chéo nguồn bị loại: `duyet/vietnamese-wordlist` có file `LICENSE` GPL-2.0 thật; `vntk/dictionary` dù có file MIT nhưng chứa nguyên các file `Viet11K/Viet22K/Viet39K/Viet74K` cùng họ dữ liệu Hồ Ngọc Đức nên provenance dữ liệu không sạch; `hermitdave/FrequencyWords` có LICENSE MIT cho code nhưng README chỉ định content là CC-BY-SA-4.0. Không dùng dữ liệu từ các nguồn này.
- Không dùng dịch vụ trả phí, không gọi cloud, không gửi nội dung tài liệu ra ngoài và không thêm dependency.

### Đánh giá theo Dependency Policy

- Purpose: danh sách token tiếng Việt phổ biến và nền gợi ý cho spellcheck tiếng Việt.
- Alternatives: các wordlist GPL và các repo chỉ cấp MIT cho code nhưng không chứng minh license/provenance của data đều bị loại; Common Voice được chọn vì dữ liệu tiếng Việt hiện diện ngay dưới `server/data` cùng file CC0 thật.
- License: CC0-1.0, thuộc đúng nhóm giấy phép nhẹ được chủ dự án chấp thuận; không có nghĩa vụ copyleft/share-alike.
- Maintenance: cập nhật thủ công từ snapshot Common Voice đã ghim; mọi lần cập nhật phải đọc lại file license cạnh data, ghi commit nguồn và tái tạo deterministically.
- Security: plain text tĩnh, được parse thành Set; không binary, không code bên thứ ba thực thi, không network runtime.
- Build/platform impact: chỉ còn module dữ liệu tĩnh khoảng 36 KB; chạy trong trình duyệt/WebView trên mọi platform hỗ trợ ES modules và Unicode property escapes.
- Update strategy: tải thủ công snapshot câu CC0 đã xác minh, áp lại pipeline NFC/tokenize/lowercase/deduplicate/sort và chạy unit/live tests; không tự động tải dữ liệu lúc runtime.

## False-positive và giới hạn

- Corpus acceptance hiện có 78 token trong 5 câu văn phòng/giáo dục có dấu: 0 false positive (0%). Đây là corpus kiểm thử có chủ đích, không phải ước lượng thống kê cho toàn bộ tiếng Việt.
- Dictionary mới nhỏ hơn nguồn cũ và dựa trên corpus lời nói, nên false positive với thuật ngữ chuyên ngành/từ hiếm có thể tăng; tên riêng/chữ viết tắt viết hoa vẫn được heuristic bỏ qua.
- Kiểm tra theo âm tiết tách bằng khoảng trắng, không kiểm tra ngữ pháp/ngữ cảnh và không bắt lỗi “từ thật nhưng dùng sai” (ví dụ hai âm tiết đều hợp lệ nhưng ghép sai nghĩa).
- Heuristic tên riêng làm giảm phiền nhưng có thể bỏ sót lỗi ở token viết hoa.
- Gợi ý dùng Levenshtein ngắn trên dictionary âm tiết; chưa xếp hạng theo tần suất/ngữ cảnh.
- Marker là span hiển thị trong DOM editor; controller giữ caret khi refresh, nhưng các tổ hợp selection phức tạp qua nhiều node vẫn cần kiểm thử mở rộng khi tích hợp sâu với document model.

FILES CHANGED:

- `platform/text/dictionaries/vi_VN.dic` (đã xóa vì GPL-2.0)
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

RISKS: Xem mục False-positive và giới hạn; corpus Common Voice có thể chứa biến thể khẩu ngữ hoặc lỗi do người đóng góp, dù dữ liệu có giấy phép CC0 rõ ràng.

DEPENDENCIES/BLOCKERS: Không có dependency runtime; không có blocker hiện tại.

CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.

NEXT ACTION: Người phụ trách review các commit trên branch này và tự merge nếu chấp thuận. Có thể mở task riêng để reuse controller cho Slides text box.
