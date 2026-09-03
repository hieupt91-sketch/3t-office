# VN Office — Project State & Continuity Brief

Đọc file này TRƯỚC nếu bạn là một agent (Claude/Codex/Antigravity-agy) hoặc con người mới nhận việc tiếp — nó tóm tắt đầy đủ bối cảnh để làm tiếp mà không cần đọc lại toàn bộ lịch sử chat. File này được cập nhật ngày 2026-09-03.

## 0. Đọc theo thứ tự trước khi code

1. `AGENTS.md` (gốc repo) — luật tối thượng.
2. `VN-Office-AI-Engineering-Standard-V2/VN-Office-AI-Engineering-Standard-V2/00-governance/*.md`
3. `docs/ROADMAP.md` — milestone tổng thể (0-7).
4. `docs/FEATURE-PARITY-ROADMAP.md` — danh sách tính năng chi tiết so với Microsoft Office/LibreOffice, có ràng buộc bản quyền + chất lượng bắt buộc.
5. File này (`docs/PROJECT-STATE-AND-CONTINUITY.md`) — trạng thái thực tế, bài học kỹ thuật, quy trình phối hợp.

## 1. Repo là gì

Monorepo tại `E:\VN OFice` (Windows). Bộ ứng dụng văn phòng Việt: VN Writer/Sheet/Slides. UI = HTML/CSS/JS thuần (ES modules, không framework), phục vụ bởi `scripts/serve.js` (Node, cổng 8080). Chạy như desktop app qua `main.py` (Python + pywebview, mở cửa sổ WebView2 trỏ tới `http://localhost:8080`). Launcher: `VN-Office.bat`.

Không có build step (không React/Vite/webpack) — sửa file `.js`/`.css`/`.html` là thấy ngay khi reload.

## 2. Trạng thái thực tế (KHÔNG phải lý thuyết — đã tự kiểm chứng)

### Đã hoạt động thật (verified bằng test/screenshot/Playwright thật trong phiên này)
- UI render đầy đủ: ribbon, AI sidebar, backstage menu, ba app Writer/Sheet/Slides — xem `docs/HANDOFF-COMMERCIAL-FIDELITY.md` và các handoff gần đây trong `docs/`.
- Định dạng chữ Writer (đậm/nghiêng/...) — thao tác DOM thật qua `document.execCommand`.
- Công thức Sheet (SUM/AVERAGE/...) + gợi ý hàm (autocomplete) kiểu Excel — `apps/sheet/formula-engine.js`, `apps/sheet/formula-autocomplete.js`.
- **Mở/Lưu/Xuất PDF file THẬT cho Writer** qua LibreOffice headless (`main.py` + `adapters/libreoffice/common/uno-bridge.js`) — round-trip DOCX thật, giữ dấu tiếng Việt (đã test).
- Backstage: 4 mẫu văn bản thật (không còn giả), tài liệu gần đây lưu `localStorage` thật.
- i18n scaffold (`platform/i18n/`), undo/redo cho Sheet/Slides, Dialog framework thay `alert()`/`prompt()`.
- Test suite thật: `node tests/run-tests.js` — 56/56 PASS tại thời điểm viết file này (không tautological, có assertion hành vi thật).

### CHƯA làm / còn giả (đừng tưởng đã xong)
- **Mở/Lưu file thật cho Sheet và Slides** — chỉ Writer có. Sheet/Slides `common.file.save` vẫn là stub nội bộ (`sheet-adapter.js`, `slides-adapter.js`).
- **Milestone 6 AI Assistant thật** — `platform/ai/ai-service.js` mới xử lý cục bộ đơn giản (tóm tắt/soát lỗi cơ bản), chưa có provider abstraction/consent flow đầy đủ theo `07-security-ai/AI-ARCHITECTURE.md`.
- Toàn bộ danh sách Tier 1/2/3 còn `[ ]` trong `docs/FEATURE-PARITY-ROADMAP.md` (Header/Footer thật, Page Setup, Styles, Track Changes, multi-sheet tabs, Slide Master, Transitions thật, v.v.)
- `core-master/` (LibreOffice source đầy đủ) nằm trên đĩa, đã gitignore, CHƯA build — không cần build trừ khi phải Core-patch (ưu tiên cuối theo AGENTS.md).

## 3. Bài học kỹ thuật quan trọng (tránh lặp lại)

### 3.1. Document engine thật
- LibreOffice cài tại `~/tools/libreoffice` (Windows: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`) — cài bằng `msiexec /a <msi> TARGETDIR=<path>` (administrative extract, KHÔNG cần quyền admin) rồi copy DLL runtime VC++ từ `System64\` vào `program\` (thiếu bước này soffice.exe lỗi `STATUS_DLL_NOT_FOUND`).
- Gọi headless: `soffice --headless --invisible --nocrashreport --nodefault --nolockcheck --nologo --norestore -env:UserInstallation=<file-uri-riêng> --convert-to <ext>:<FilterName> --outdir <dir> <file>`. BẮT BUỘC dùng `-env:UserInstallation` trỏ tới profile riêng (dùng `Path.as_uri()` trong Python để tự động escape khoảng trắng đúng chuẩn URI) — nếu không sẽ lỗi "User installation could not be completed" hoặc tranh chấp profile giữa các process chạy song song. Dùng `threading.Lock()` để serialize các lệnh convert.
- Filter name chuẩn: xem `FORMAT_FILTERS` trong `main.py`.

### 3.2. pywebview — lỗi RecursionError nghiêm trọng
- KHÔNG BAO GIỜ lưu đối tượng `Window` (từ `webview.create_window()`) làm attribute plain trên class được truyền vào `js_api=`. pywebview tự động quét đệ quy (`webview/util.py:get_functions()`) mọi attribute non-callable của `js_api` object để build `window.pywebview.api` cho JS — nếu lưu `self.window = window`, nó lần sâu vào WinForms `AccessibilityObject.Bounds` → `System.Drawing.Rectangle.Empty.Empty...` vô hạn → RecursionError → cửa sổ hiện ra nhưng nội dung TRẮNG TRƠN (WebView2 không bao giờ load được).
- Fix: dùng hàm module-level `_active_window()` trả về `webview.windows[0]` thay vì lưu attribute. Xem `main.py` hiện tại.

### 3.3. Lỗi cú pháp JS âm thầm lọt qua test
- `apps/writer/writer-app.js` từng thiếu 1 dấu `}` đóng khối `else` trong `WriterApp.init()` — gây `SyntaxError` khi load thật (trắng trang), NHƯNG `node tests/run-tests.js` vẫn báo PASS 100% vì test chỉ import trực tiếp `WriterAdapter`, không bao giờ thực sự load `WriterApp`/`index.html` qua trình duyệt. **Bài học: luôn có ít nhất một bước `node --check` cho mọi file `.js`, hoặc smoke test load trang thật, trước khi tin bộ test.**
- Đã giao agy task bổ sung "lưới an toàn" cú pháp (`scripts/check-syntax.js`, branch `fix/syntax-safety-net`) — kiểm tra trạng thái task này trước khi merge.

### 3.4. Chạy/test app trong môi trường agent
- Tool PowerShell của agent chạy trong sandbox mặc định — dùng `dangerouslyDisableSandbox: true` khi cần cửa sổ GUI thật hiện lên màn hình người dùng.
- Để agent tự "nhìn thấy" UI: chụp màn hình bằng `System.Windows.Forms`/`System.Drawing` (.NET) qua PowerShell, HOẶC dùng Playwright (cài local trong thư mục tạm, KHÔNG thêm vào `package.json` của repo) để load `http://localhost:8080` headless, bắt `pageerror`/console error, chụp `page.screenshot()`. Đây là cách nhanh nhất để tự kiểm tra thay vì đoán.

### 3.5. Rủi ro working tree dùng chung
- Claude và agy (Antigravity CLI) đôi khi cùng thao tác trên MỘT working tree (`E:\VN OFice`) trong cùng khung giờ. Khi agy chạy `git checkout -b <branch>`, nó đổi branch cho CẢ working tree, kéo theo mọi thay đổi uncommitted của Claude sang branch đó. Không mất dữ liệu (nội dung file vẫn còn), nhưng dễ nhầm chỗ merge. **Luôn kiểm tra `git branch --show-current` và `git log --oneline` trước khi merge/commit quan trọng.** Về lâu dài nên dùng git worktree riêng cho mỗi agent (`02-development/GIT-WORKTREES.md`) nếu làm việc thật sự song song.

## 4. Cách giao việc cho agy / Codex (nếu bạn là Claude hoặc con người)

Hai CLI đã cài sẵn trên máy, đăng nhập sẵn:
- **agy** (Antigravity/Gemini): `C:\Users\3T Computer\AppData\Local\agy\bin\agy.exe`
- **codex** (OpenAI Codex): `codex` (PATH, qua `tools\nodejs\codex.cmd`)

Cách gọi headless đúng (đã test, tránh các lỗi encoding/quoting đã gặp):

```powershell
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Get-Content -Raw -Encoding UTF8 "<file-prompt.md>" | & "<path-to-agy.exe>" --dangerously-skip-permissions --print-timeout 25m --output-format text > out.log 2>&1
```

- KHÔNG truyền prompt tiếng Việt/nhiều dòng trực tiếp qua `-p "..."` làm argument — sẽ vỡ encoding (mojibake) hoặc lỗi tách argument khi path/prompt chứa dấu `"` hay khoảng trắng. LUÔN ghi prompt ra file rồi pipe qua stdin.
- Codex review (chỉ đọc, không sửa): `codex exec review --uncommitted` (KHÔNG kèm `-s`/`--sandbox`, KHÔNG kèm PROMPT dương cùng `--uncommitted` — 2 thứ đó xung đột trong bản CLI hiện tại). Prompt tùy chỉnh: pipe qua stdin, không dùng `--uncommitted` cùng lúc nếu muốn PROMPT tùy chỉnh (chọn 1).
- agy chạy nền lâu (có thể 10-25 phút) — chạy `run_in_background`, đừng block chờ.

## 5. Phân công chuẩn (giữ nguyên cho các wave tiếp theo)

- **agy**: UI/UX toàn bộ `apps/**`, `platform/**` (trừ phần Claude giữ dưới đây).
- **Claude**: `adapters/**`, `main.py`, document engine/data model thật, điều phối chung, review cuối, merge.
- **Codex**: review độc lập trước khi merge (`codex exec review --uncommitted`), có thể nhận thêm task code cụ thể nếu Claude giao.

## 6. Test & commit kỷ luật

- `node tests/run-tests.js` — PHẢI chạy thật trước khi merge bất kỳ nhánh nào, không tự nhận PASS.
- Không đủ tin cậy nếu chỉ dựa vào test — luôn kèm kiểm tra tải trang thật (Playwright hoặc `node --check` toàn bộ `.js`) sau các thay đổi lớn về app bootstrap.
- Commit prefix: `writer:`, `sheet:`, `slides:`, `platform:`, `adapter:`, `core:`, `build:`, `test:`, `docs:`.
- Không destructive git (không force push/reset) — repo hiện không có remote, chỉ local.

## 7. Việc đang dang dở tại thời điểm viết file này

Xem chi tiết trạng thái task trong task list của phiên Claude hiện tại, tóm tắt:
1. Formula autocomplete Sheet — ĐÃ XONG, đã merge.
2. Milestone 6 AI Assistant backend thật — CHƯA làm.
3. Mở rộng file I/O thật cho Sheet/Slides — CHƯA làm.
4. agy đang làm "lưới an toàn" kiểm tra cú pháp (branch `fix/syntax-safety-net`) — kiểm tra đã merge main chưa trước khi tiếp tục.
5. Wave 1 của `docs/FEATURE-PARITY-ROADMAP.md` — chuẩn bị giao agy (UI) + Claude (engine) song song.

Nếu bạn là agent/người tiếp nhận: chạy `git log --oneline -15` và `git status` trước tiên để biết chính xác đã tới đâu, vì file này có thể hơi lệch so với thời điểm bạn đọc.
