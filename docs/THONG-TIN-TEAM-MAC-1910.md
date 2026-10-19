# Thông tin cho team macOS — thay đổi từ 17/10 đến 19/10/2026 và danh sách việc giao

Đọc theo thứ tự: `docs/BAN-GIAO-MAC.md` → `docs/THONG-TIN-TEAM-MAC-0.9.11.md` → `docs/THONG-TIN-TEAM-MAC-1710.md` → **tài liệu này (mới nhất)**, kèm `docs/SPEC-MACOS-PORT.md` và `docs/MAC-LAM-TUNG-BUOC.md`.
Tài liệu này chỉ nói **thay đổi sau 17/10** (211 commit) và **việc team Mac cần làm tiếp**. Số liệu đo ngày 19/10/2026 trên máy Windows của người phụ trách.

## 0. Lấy mã ở đâu (ĐỔI so với trước)
- Kho GitHub duy nhất: `https://github.com/hieupt91-sketch/3t-office` (private). Kho cũ `hieupt91/3t-office` đã bỏ.
- **Nhánh `vn-main` = mã nguồn đầy đủ, mới nhất** (toàn bộ lịch sử dự án, gồm mọi thay đổi dưới đây). Hãy tạo nhánh làm việc từ `vn-main`.
- Nhánh `main` của kho này vẫn là **bản chụp công khai cũ** (0.9.11 + tài liệu), lịch sử khác hẳn. **Không đẩy mã dự án lên `main`** và không `--force`.
- Nhánh của team Mac giữ nguyên: `platform/macos`, `mac/*`, `codex/macos-pkg-installer`, `fix/macos-uno-socket`, `codex/clipboard-bridge`…. Làm việc mới: `git fetch origin && git switch -c mac/<chủ-đề> origin/vn-main`, đẩy nhánh `mac/<chủ-đề>` lên cùng kho; người phụ trách xem xét và gộp. Mã dùng chung sửa ở `vn-main` trước (xem mục 4), mã riêng macOS chỉ ở `platform/os_services/macos.py` và `ports/macos/`.
- Nhánh agent đang làm dở (để biết, không sửa): `feat/writer-tabs-tables-agy`, `feat/sheet-notes-agy`, `feat/slides-fidelity-agy`, `feat/sheet-pivotslicer-codex`, `perf/lan14-open-codex` và các nhánh `audit/*`, `test/*`.
- **Bảo mật:** không commit khóa ký, mật khẩu, token. Không dán token GitHub vào chat/tài liệu; dùng trình quản lý thông tin đăng nhập của hệ điều hành.

## 1. Mốc kiểm thử cần đạt sau khi lấy `vn-main`
- `npm test` **3765/3765** PASS (Node, độc lập hệ điều hành).
- `node scripts/audit-0610/i18n_parity.mjs`: VI = EN = **3091** khóa, thiếu 0, lệch placeholder 0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **0 dòng bị hạ** (ba checklist Word/Excel/PowerPoint 2016 trong `docs/*2016-FEATURE-CHECKLIST.md`).
- Python: `python -m pytest tests -q`. Ghi số bài và bài nào lỗi **vì môi trường macOS** (đừng sửa bài để cho xanh). Bài dùng Office COM (`tests/test_ooxml_encryption_roundtrip.py` phần Word/PowerPoint, mọi `*.ps1`) chỉ chạy trên Windows: ghi BLOCKED.

## 2. Thay đổi dùng chung đã vào `vn-main` (Mac nhận qua gộp, không viết lại)
**Mã hóa tệp bằng mật khẩu (MỚI, ảnh hưởng đóng gói):**
- Tệp > Thông tin > "Mã hóa bằng mật khẩu" cho DOCX/XLSX/PPTX (Agile AES-256, chuẩn ECMA-376). Mã: `platform/security/office_encryption.py`, lớp bọc `adapters/libreoffice/common/ooxml_encryption.py`, hộp thoại `platform/dialogs/document-password-dialog.js`, nối ở `main.py` và `platform/shell/app-shell.js`. Tệp mã hóa mở lại hỏi mật khẩu; sai mật khẩu báo rõ.
- **Gói macOS phải kèm thư viện Python `cryptography`** (đã ghi ở `requirements.txt`). Nhớ khi dựng `.app`.
- Word/PowerPoint thật mở được tệp do VN Office mã hóa (đo bằng COM trên Windows). Lưu ý đo: COM từ chối mật khẩu từ 16 ký tự trở lên, là giới hạn của COM, không phải lỗi mã hóa.
**Writer (sửa lỗi nhập liệu — phát hiện khi soạn thử như người dùng thật):**
- Bật danh sách đầu dòng/đánh số/Ctrl+Shift+L giữ con trỏ đúng chỗ; thoát danh sách rồi dừng gõ không còn nhảy con trỏ (`platform/text/spellcheck-dom-controller.js`: thêm `div` vào danh sách khối); hàng bảng thêm bằng Tab giống hàng trên; chân trang hiện số trang tổng thật; lưu DOCX được khi có thay đổi theo dõi trong chú thích cuối trang.
- **Kiểm tra chính tả tiếng Việt theo quy tắc âm tiết** (`platform/text/vi-syllable.js`, tự biên soạn, CC0): hết gạch đỏ nhầm "thuế, kênh, trực, mại, nhuận". Hoàn toàn bằng JS, không phụ thuộc hệ điều hành.
- Mới: chú thích tiếp theo/trước, Khối địa chỉ và Lời chào (trộn thư), tô sáng trường trộn, kiểu gạch chân, hộp thoại Thu phóng, tùy chọn cột bảng, điều hướng ghi chú.
**Sheet:** liên kết nội bộ `#Trang!A1`; kéo đổi thứ tự thẻ trang; khóa/mở khóa ô; mở rộng thanh công thức; xóa quy tắc định dạng có điều kiện; dán đặc biệt (độ rộng cột, xác thực); lọc/sắp xếp theo biểu tượng; GETPIVOTDATA; **hình dạng dựng sẵn (16 hình)**; sparkline thắng-thua; menu chuột phải thanh trạng thái; khoanh tròn dữ liệu sai.
**Slides:** Ngăn chọn đổi tên (nhấp đúp) và ẩn/hiện từng hình, **tên hình tách khỏi mã nhận dạng khi lưu PPTX** (`slides-adapter.js`: `vno:shape-id`, `ooxml_zip_patch.py`: `_apply_slides_hidden_shapes`); hộp thoại Thu phóng 50–200%; "Dùng thời gian đã đặt"; Hiện nhận xét; bút/laser khi chiếu và Giữ chú thích; hộp thoại Kích thước và vị trí hình.
**Quy trình/kiểm thử:** `scripts/audit-0610/app_session_server.mjs` mở app **sống** để soạn thử như người dùng thật (chuột/phím qua CDP, chụp màn hình, đổi cỡ cửa sổ); `docs/EXPLORE-WRITER-19-10.md` ghi lại các lỗi đã sửa và còn tồn.

## 3. Việc giao cho team Mac (làm theo thứ tự; mỗi việc có tiêu chí XONG)
Giữ nguyên danh sách **MAC-1…MAC-11** ở `docs/THONG-TIN-TEAM-MAC-1710.md` (chưa có báo cáo hoàn thành nào từ team Mac nên coi tất cả còn mở), làm trên `vn-main` mới. Bổ sung:
| Mã | Việc | Tệp liên quan | XONG khi |
|---|---|---|---|
| MAC-12 | Đưa `cryptography` vào gói macOS; chạy `python -m pytest tests/test_ooxml_encryption.py tests/test_ooxml_encryption_main.py -q` (bỏ phần COM, ghi BLOCKED); thử tay Tệp > Thông tin > Mã hóa bằng mật khẩu: lưu `.docx` → đóng → mở lại hỏi mật khẩu → sai mật khẩu báo rõ | `requirements.txt`, `adapters/updater/`, `main.py` | gói chạy được, test mã hóa đạt, ảnh chụp thao tác |
| MAC-13 | Chạy trên macOS (CDP, khi MAC-6 xong) các bài mới: `writer-list-caret`, `writer-table-tab-rows`, `writer-footer-numpages`, `writer-footnote-track-save`, `slides-zoom-dialog`, `slides-shape-names`, `document-password` (đều ở `tests/live/cdp/*.desktop.mjs`) | `tests/live/cdp/` | kết quả PASS/FAIL từng bài trên macOS; bài FAIL kèm nguyên nhân |
| MAC-14 | Phím tắt mới cần ánh xạ Cmd: Ctrl+Alt+1/2/3 (Tiêu đề 1/2/3), Ctrl+Shift+L (danh sách đầu dòng), Alt+F10 (Ngăn chọn), Ctrl+Shift+E (theo dõi thay đổi); ghi vào bảng phím macOS trong Trợ giúp | `platform/commands/shortcut-manager.js`, `platform/help/` | bảng phím macOS + test CDP |
| MAC-15 | Soạn thử trên macOS **như người dùng thật** theo `scripts/audit-0610/app_session_server.mjs` (cần nhánh khởi động macOS của `session.mjs`, trùng MAC-6): gõ một báo cáo có tiêu đề, danh sách, bảng, đầu/chân trang, chú thích, nhận xét; lưu `.docx`; mở bằng Word/Pages nếu có và so sánh; ghi mọi lỗi vào `docs/EXPLORE-MAC-<ngày>.md` theo mẫu `docs/EXPLORE-WRITER-19-10.md` | `scripts/audit-0610/` | tệp ghi lỗi có bước tái hiện và ảnh chụp |

**Không làm trên Mac:** bộ đối chiếu Office thật qua COM (`*.ps1`, `structural_oracle`, `function_oracle`, `batch_document_audit.py`). Dùng bộ chuẩn đã lưu `tests/functions/*golden*.json` và không sửa giá trị trong đó.

## 4. Quy tắc làm việc (tóm tắt từ `AGENTS.md`)
- **Reuse trước khi viết lại.** Ranh giới lớp: UI → Platform/Command → Adapter → LibreOffice Core; UI không gọi trực tiếp LibreOffice; Writer/Sheet/Slides không gọi nội bộ của nhau; thứ dùng chung nằm ở `platform/`.
- Mã dùng chung sửa ở `vn-main` trước; mã riêng hệ điều hành chỉ ở `platform/os_services/macos.py`, `ports/macos/`. Không rải điều kiện theo hệ điều hành vào `apps/` hay `platform/*.js`.
- Mỗi agent một nhánh `mac/<chủ-đề>` và một worktree riêng; không hai agent trong một working tree. Không refactor ngoài phạm vi. Không destructive Git (reset --hard, push --force…) khi chưa được cho phép.
- **Trung thực kết quả:** PASS / FAIL / NOT RUN / BLOCKED kèm số liệu thật. Cấm vô hiệu hóa test, nuốt ngoại lệ, đổi giá trị mong đợi để cho xanh.
- Kiểm giao diện chỉ qua CDP. **Không** dùng AppleScript, `cliclick`, hay điều khiển hệ điều hành để gõ phím. Không kill tiến trình theo tên, chỉ theo PID do chính mình tạo.
- Tính năng mới phải kèm **Hướng dẫn sử dụng tiếng Việt cụ thể** (`platform/help/entries-*.js`) và chuỗi i18n VI/EN; không dùng tên sản phẩm của hãng khác (Word, Excel, PowerPoint, LibreOffice) trong Trợ giúp/i18n/hộp thoại (có test chặn). Chạy `node scripts/audit-0610/i18n_parity.mjs` và `npm test` trước khi gộp.
- Ứng dụng chạy **offline là ưu tiên số 1**: `main.py` tự khởi động mọi dịch vụ cần thiết; không phụ thuộc Node.js. Không gửi nội dung tài liệu ra AI/đám mây khi chưa được duyệt.
- Báo cáo 3–5 dòng, nêu tệp đã đổi, số liệu thật và việc cần người phụ trách kiểm.

## 5. Lỗi đã biết còn tồn (đừng làm trùng; xem chi tiết `docs/EXPLORE-WRITER-19-10.md`)
Đầu/chân trang chỉ hiện ở trang 1 trong khung soạn thảo (xem trước khi in đúng); nhận xét kèm theo dõi thay đổi làm mục lục bị ghi như chèn/xóa theo dõi; mục lục chèn sau đoạn hiện tại thay vì tại con trỏ; kiểu "Tiêu đề 1" xem trước khác kết quả áp dụng; tệp lan14 mở chậm (~109 giây để sửa được; Codex đang tối ưu ở `perf/lan14-open-codex`).

## 6. Quyết định cần người phụ trách (agent Mac không tự chọn)
Giấy phép Qt/PySide6 (LGPL); tài khoản Apple Developer, ký và notarize; mọi dependency lớn mới; mọi dữ liệu gửi AI/đám mây; thời điểm phát hành 0.9.12 và cập nhật bản chụp công khai (`main` của kho); thu hồi hoặc cấp token GitHub.
