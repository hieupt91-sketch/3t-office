# Agent Handoff

TASK: AI Cloud Providers BYOK

AGENT/ROLE: Codex / Platform AI

BRANCH: `feature/ai-cloud-provider-byok`

WORKTREE: `E:\VNOffice-codex-ai-cloud-providers`

OBJECTIVE: Kết nối Trợ lý VN AI trực tiếp tới OpenAI, Google Gemini và Anthropic Claude bằng API key của người dùng, không qua server VN Office.

FINDINGS: Kiến trúc provider/orchestrator và fallback RuleBased/Ollama đã có thể tái sử dụng. `localStorage` có pattern fallback bộ nhớ trong `AiConsentManager`. Ollama ban đầu chưa nhận cancellation signal từ UI.

IMPLEMENTATION SUMMARY:

- Thêm `ApiKeyManager`, tách key theo provider, lưu cục bộ và fallback bộ nhớ khi test Node.
- Thêm REST provider OpenAI Chat Completions, Gemini GenerateContent và Anthropic Messages.
- Timeout 30 giây, hủy qua `AbortController`, lỗi key/quota/network/HTTP rõ ràng, không log key.
- Orchestrator lưu lựa chọn provider; cloud đã chọn+có key, rồi Ollama có consent/available, cuối cùng RuleBased.
- Cloud/Ollama lỗi sẽ báo rõ và fallback RuleBased; cancellation không tạo fallback ngoài ý muốn.
- Sidebar có dropdown, trạng thái provider thực tế, disclosure dữ liệu, form password hiện/ẩn, consent bằng nút riêng, xóa key và nút Dừng.
- Non-streaming đã hoàn thành. Streaming SSE **chưa làm** và không được claim là đã có.
- Không tự động retry để tránh nhân đôi request/chi phí ngoài ý muốn; người dùng có thể chủ động gửi lại sau thông báo lỗi.

FILES CHANGED: `platform/ai/**`, phần AI Sidebar trong `platform/shell/app-shell.js`, `platform/i18n/strings-{vi,en}.js`, AI unit tests, `tests/run-tests.js`, file handoff này.

COMMANDS RUN: `node --check ...`; unit AI riêng; `node tests/run-tests.js` (mock fetch, không gọi cloud thật).

BUILD RESULT: NOT RUN — repository không khai báo build script trong `package.json`; syntax được kiểm tra bởi test suite.

TEST RESULTS: PASS — `node tests/run-tests.js`: 587/587 PASS, 0 FAIL, 15.95 giây; không gọi mạng cloud thật.

KNOWN FAILURES: Không có tại thời điểm handoff.

RISKS:

- API key lưu trong `localStorage` theo quyết định/phạm vi hiện tại, không phải OS credential vault.
- Tên model cloud thay đổi theo vòng đời hãng; có thể override qua `context.model`, UI chưa có model picker.
- Streaming SSE chưa triển khai.
- Chưa chạy live test tốn phí; tự động test chỉ dùng mock `fetch`.

DEPENDENCIES/BLOCKERS: Không có dependency mới. Live verification cần chủ dự án tự cung cấp key và chấp nhận chi phí/mạng.

CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.

NEXT ACTION: Tùy chọn triển khai SSE streaming và chuyển key sang secure credential storage của desktop host khi lớp native sẵn sàng.
