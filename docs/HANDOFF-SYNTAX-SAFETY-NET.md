# Agent Handoff — Syntax Safety Net & Runtime Smoke Test Suite

**TASK:** Bổ sung lớp kiểm tra tự động phát hiện SyntaxError toàn diện và Smoke Test nạp `index.html` trong VN Office Suite.  
**AGENT/ROLE:** Antigravity (Lead Architecture & QA Agent)  
**BRANCH:** `fix/syntax-safety-net`  
**WORKTREE:** `E:\VN OFice`  

---

## 1. Bối cảnh & Phân tích nguyên nhân gốc rễ (Root Cause)
- **Sự cố:** Trong lần chỉnh sửa trước, tệp `apps/writer/writer-app.js` bị thiếu dấu ngoặc nhọn `}` đóng khối `else` tại `WriterApp.init()`.
- **Hậu quả:** Trình duyệt / pywebview gặp `SyntaxError: Unexpected token '}'` ngay khi nạp module, dẫn đến trang trắng hoàn toàn (blank page).
- **Lý do bộ test cũ không phát hiện được:**
  1. Trước đây, bộ test chỉ thực hiện unit test và integration test trực tiếp đối với các Adapter (`WriterAdapter`, `SheetAdapter`, `SlidesAdapter`) và các module độc lập.
  2. Các entrypoint ứng dụng cấp cao (`WriterApp`, `SheetApp`, `SlidesApp`) và tệp `index.html` không bao giờ được `import` hoặc nạp qua trình duyệt trong test runner, khiến lỗi cú pháp ở tầng ứng dụng bị lọt qua âm thầm dù test báo PASS 100%.

---

## 2. Giải pháp kỹ thuật đã triển khai

### A. Lớp kiểm tra cú pháp nhanh độc lập (`scripts/check-syntax.js`)
- Xây dựng công cụ kiểm tra cú pháp toàn diện sử dụng trực tiếp parser V8 của Node.js qua cờ `--check` (`node --check <file>`).
- Tự động quét đệ quy toàn bộ các tệp `.js` trong các thư mục cốt lõi: `apps/`, `platform/`, `adapters/`, `scripts/`.
- Bỏ qua các thư mục không liên quan (`core-master`, `node_modules`, `.git`, `.claude`, `__pycache__`).
- Hỗ trợ thực thi trực tiếp từ CLI: `node scripts/check-syntax.js` hoặc `npm run check-syntax` (trả về exit code 0 nếu sạch lỗi, 1 nếu có lỗi).
- Báo lỗi tường minh: Nếu có SyntaxError, trích xuất chính xác tên tệp, dòng lỗi và token gây lỗi.

### B. Suite kiểm thử cú pháp & tính toàn vẹn mã nguồn (`tests/unit/syntax-check.test.js`)
- Tích hợp vào Master Test Runner (`tests/run-tests.js`) thành **Suite 7: Syntax & Codebase Integrity — node --check**.
- Kiểm tra 35 tệp JavaScript trong dự án.
- Xác nhận sự hiện diện của các entrypoint trọng yếu (`apps/writer/writer-app.js`, `apps/sheet/sheet-app.js`, `apps/slides/slides-app.js`, `platform/bootstrap.js`, `platform/shell/app-shell.js`...).
- **Negative Test (Kiểm thử âm bản):** Tạo mã lỗi thiếu ngoặc tương tự sự cố thực tế, kiểm chứng chắc chắn `checkFileSyntax` bắt chính xác `SyntaxError`.
- **Positive Test (Kiểm thử dương bản):** Kiểm chứng mã ES module hợp lệ vượt qua an toàn không có cảnh báo giả.

### C. Smoke Test nạp `index.html` & Module Import (`tests/smoke/html-smoke.test.js`)
- Tích hợp vào Master Test Runner thành **Suite 8: Smoke Tests — Application Entrypoints & index.html Runtime**.
- **Kiểm tra cấu trúc tĩnh:**
  - Xác nhận `index.html` tồn tại và chứa phần tử mount root `#vno-app-root`.
  - Quét và kiểm chứng toàn bộ 7 tệp stylesheet CSS được liên kết (`platform/theme/tokens.css`, `ui-kit.css`, `ribbon.css`, `shell.css`, `writer.css`, `sheet.css`, `slides.css`) đều tồn tại trên đĩa.
  - Trích xuất mã `<script type="module">` nội dòng của `index.html` và kiểm tra cú pháp với `node --check`.
- **Đánh giá Dynamic Import (Node.js runtime):**
  - Thực hiện `import()` động các module `WriterApp`, `SheetApp`, `SlidesApp`, `bootstrapPlatform`.
  - Bảo đảm toàn bộ cây phụ thuộc (dependency tree) được V8 phân giải và biên dịch sạch, không thiếu import specifier.
- **Kiểm thử Headless Browser (Edge / Chrome):**
  - Tự động dò tìm trình duyệt headless (`msedge.exe` hoặc `chrome.exe`).
  - Nạp thực tế `index.html` qua giao thức `file:///` với cờ `--allow-file-access-from-files` và `--dump-dom`.
  - Xác nhận DOM sau khi nạp đã được `WriterApp` mount thành công: chứa `vno-shell`, `data-app="writer"`, `.vno-topbar`, `.vno-ribbon` và trang soạn thảo `.vno-writer-page`.
  - Tự động fallback an toàn (skip) nếu môi trường không có sẵn trình duyệt GUI/headless.

---

## 3. Danh sách tệp thay đổi

1. `scripts/check-syntax.js` *(Mới)*: Module và CLI kiểm tra cú pháp V8 cho toàn bộ tệp JS.
2. `tests/unit/syntax-check.test.js` *(Mới)*: Suite 7 kiểm tra cú pháp và tính toàn vẹn.
3. `tests/smoke/html-smoke.test.js` *(Mới)*: Suite 8 smoke test nạp `index.html`, dynamic import và headless browser mount.
4. `package.json` *(Chỉnh sửa)*: Bổ sung lệnh `"check-syntax": "node scripts/check-syntax.js"`.
5. `tests/run-tests.js` *(Chỉnh sửa)*: Đăng ký Suite 7 và Suite 8 vào Master Runner, bổ sung in chi tiết lỗi nếu có test thất bại.
6. `docs/HANDOFF-SYNTAX-SAFETY-NET.md` *(Mới)*: Tài liệu bàn giao kỹ thuật.

*(Lưu ý: Tuyệt đối không chỉnh sửa `apps/writer/writer-app.js` theo đúng yêu cầu).*

---

## 4. Kết quả kiểm thử (Test Truthfulness)

- **Lệnh chạy:** `npm test` (`node tests/run-tests.js`)
- **Kết quả tổng thể:** **116/116 PASS | 0 FAIL | 0 NOT RUN | 0 BLOCKED**
  - Suite 1 (Command Bus): 4/4 PASS
  - Suite 2 (LibreOffice Adapter Mapping): 23/23 PASS
  - Suite 3 (Excel Formula Engine): 8/8 PASS
  - Suite 4 (Formula Autocomplete & Parameter IntelliSense): 14/14 PASS
  - Suite 5 (Vietnamese i18n Localization Layer): 4/4 PASS
  - Suite 6 (Suite Smoke & Vietnamese Unicode): 3/3 PASS
  - **Suite 7 (Syntax & Codebase Integrity — node --check): 45/45 PASS**
  - **Suite 8 (Smoke Tests — Application Entrypoints & index.html Runtime): 15/15 PASS**
- **Lệnh chạy:** `npm run check-syntax` (`node scripts/check-syntax.js`)
  - Quét 35/35 tệp JavaScript hợp lệ, 0 lỗi cú pháp.
