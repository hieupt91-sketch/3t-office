# Agent Handoff

TASK: VN Writer — Word Count, Track Changes Previous/Next + Accept/Reject one, và hệ thống Trợ giúp trong ứng dụng

AGENT/ROLE: Grok (implementation)

BRANCH: `feature/writer-wordcount-trackchanges-help`

WORKTREE: `E:\VNOffice-grok-writer-wordcount-help`

OBJECTIVE: Bổ sung Đếm từ (dialog + status bar), duyệt Track Changes từng cái (Previous/Next/Accept one/Reject one), và thiết kế/triển khai cơ chế Trợ giúp dùng chung (chỉ gắn Writer trong task này). KHÔNG merge vào main.

---

## Plan (AGENTS.md mục 6)

Thay đổi shared platform (`platform/help/**`, `platform/commands`, `platform/i18n`, `platform/ui-kit/icons.js`) và >3 file nguồn, nên plan trước:

| Mục | Nội dung |
|---|---|
| Objective | Word Count + Track Changes nav + Help dùng chung 3 app, chỉ wire Writer |
| Current capability | Status bar Writer đã ghép “X từ” thô từ cả trang (kể header/footer), không có lệnh/dialog/nút Review. Track Changes chỉ toggle + Accept All/Reject All. Không có Help trong app |
| Files | `apps/writer/*`, `adapters/libreoffice/writer/writer-adapter.js`, `platform/commands/command-definitions.js` (chỉ thêm `writer.*`), `platform/i18n/*`, `platform/ui-kit/icons.js`, **mới** `platform/help/**`, tests |
| Dependency | Không thư viện mới, không sửa Sheet/Slides, không sửa AppShell, không sửa `command-dispatch-mapper.js` |
| Risk | Help catalog chưa phủ hết tính năng sẵn có; Track Changes vẫn là marker DOM phiên, không phải OOXML revision |
| Test plan | Unit Word Count / Track Changes nav / Help catalog+search+ribbon; `node tests/run-tests.js`; Playwright live 3 phần |
| Rollback | `git revert` 3 commit feat trên nhánh này; không đụng main |

---

## Cơ chế Help đã chọn và lý do

Chọn **panel Trợ giúp neo bên phải workspace**, mở bằng:

1. Tab ribbon **Trợ giúp** (nút lớn “Trợ giúp”)
2. Phím **F1** (`writer.help.open`, isToggle)

**Không** làm tab Help chứa hàng chục nút, **không** hardcode HTML bài viết rải trong app.

Kiến trúc (dùng chung 3 app, đặt ở `platform/help/`):

| Tệp | Vai trò |
|---|---|
| `platform/help/help-catalog.js` | Registry `HELP_ENTRIES` + `registerHelpEntries()` / `getHelpEntriesForApp()` |
| `platform/help/entries-writer.js` | Dữ liệu hướng dẫn Writer (JS object có cấu trúc) |
| `platform/help/help-service.js` | Tìm kiếm (bỏ dấu tiếng Việt) theo title/summary/keywords/tab/commandId |
| `platform/help/help-panel.js` + `help.css` | UI panel dùng chung: ô tìm, danh sách theo tab ribbon, bài (tiêu đề + vị trí + mô tả + bước) |
| `platform/help/index.js` | API public |

Vì sao panel phải chứ không phải dialog một lần: người dùng tra cứu liên tục khi chuyển từ Word thật; panel để mở khi soạn, tìm lại, đọc bước. CSS được `help-panel.js` tự gắn (`<link>` tới `help.css`) nên không sửa `index.html` / Sheet / Slides.

**Sheet/Slides (task sau):** thêm `entries-sheet.js` / `entries-slides.js` rồi `registerHelpEntries()`, mount `HelpPanel({ app: "sheet"|"slides" })`, thêm lệnh `sheet.help.open` / `slides.help.open` và tab Trợ giúp. Không cần viết lại panel.

Lệnh Help là `writer.help.open` (không thêm `common.help.*`) vì phạm vi task chỉ cho phép thêm dòng `writer.*` vào `command-definitions.js`.

---

## Implementation summary

### A. Word Count

- Lệnh `writer.review.wordCount`, nút lớn trên tab **Đánh giá**, nhóm **Chính tả & Ngữ pháp** (cạnh Soát lỗi chính tả — đúng Proofing của Word).
- Dialog: Từ; Ký tự không khoảng trắng; Ký tự có khoảng trắng; Đoạn văn; Dòng. Nếu đang bôi đen trong body thì đếm vùng chọn.
- Đếm trên `innerText` của `.vno-writer-body` (không gồm đầu/chân trang). Từ tiếng Việt: `split(/\s+/)`, bỏ rỗng.
- Thanh trạng thái: nút bấm `#vno-status-wordcount` (“X từ”) chèn từ WriterApp vào `.vno-statusbar-left` (không sửa `app-shell.js`), cập nhật khi `input` / pagination. Nhấp mở dialog.

### B. Track Changes từng cái

Cấu trúc DOM giữ nguyên: `<ins data-vno-change="insert">`, `<del data-vno-change="delete">`.

Lệnh mới trên nhóm **Theo dõi thay đổi**, cạnh Accept All / Reject All:

| Command | Hành vi |
|---|---|
| `writer.trackChanges.previous` | Nhảy thay đổi trước, cuộn + class `is-vno-change-active` |
| `writer.trackChanges.next` | Nhảy thay đổi sau (quay vòng) |
| `writer.trackChanges.acceptOne` | Chấp nhận thay đổi đang chọn/highlight, rồi chọn cái kế |
| `writer.trackChanges.rejectOne` | Từ chối thay đổi đang chọn/highlight, rồi chọn cái kế |

Undo/Redo dùng `recordSnapshot` sẵn có. Không sửa mapper UNO (ngoài phạm vi); handler JS trong `WriterAdapter` là đường đi thật.

### C. Help — nội dung đã viết (tiếng Việt thật)

| ID bài | Phạm vi |
|---|---|
| `writer.review.wordCount` | Đếm từ (tính năng mới) |
| `writer.trackChanges` | Cả nhóm Track Changes, gồm toggle + All + nav + one |
| `writer.reference.citations` | Trích dẫn & Thư mục tài liệu |
| `writer.reference.captions` | Chú thích ảnh & danh mục hình |
| `writer.mailMerge` | Trộn thư |
| `writer.reference.toc` | Mục lục tự động |

### Help còn thiếu (task rà soát sau — không làm hết trong 1 task)

Toàn bộ lệnh Writer ngoài 6 bài trên, gồm nhưng không giới hạn: Home (font/paragraph/styles), Insert (bảng, ảnh, shape, header/footer, symbol, bookmark, …), Design (theme, watermark, page border), Layout (margins/orientation/columns), View (read/print/web/zoom), Ghi chú, Print Preview, Spellcheck/AI, Cross-reference. Sheet và Slides: **chưa có bài nào**.

---

## FILES CHANGED

- `apps/writer/word-count.js` (mới), `writer-app.js`, `writer-ribbon.js`, `writer.css`
- `adapters/libreoffice/writer/writer-adapter.js`
- `platform/commands/command-definitions.js` (chỉ thêm writer.*)
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `platform/ui-kit/icons.js`
- `platform/help/**` (mới)
- `tests/unit/writer-word-count.test.js`, `writer-track-changes.test.js`, `writer-help.test.js`
- `tests/live/writer-wordcount-trackchanges-help.playwright.mjs`
- `tests/run-tests.js`
- Handoff này

Không sửa `apps/sheet/**`, `apps/slides/**`. Không sửa `command-dispatch-mapper.js` (các lệnh mới là VN-layer DOM/UI).

---

## COMMANDS RUN / TEST RESULTS

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `node tests/run-tests.js` | **PASS** 979/979 | ~74s — vượt 60s vì suite 93 nhóm, không vì test treo |
| `node tests/live/writer-wordcount-trackchanges-help.playwright.mjs` | **PASS** | Edge headless, click ribbon thật (không SendKeys): Word Count dialog + status “8 từ”; Track Changes Next/Previous/Accept One/Reject One; Help tìm “đếm từ”, “trích dẫn”, “theo dõi” ra đúng bài |

Không disable test, không nuốt exception. KHÔNG merge main.

---

## RISKS

- Track Changes vẫn là marker DOM theo phiên, không phải revision OOXML native.
- Help mới phủ 6 cụm Writer; người dùng tra tính năng khác sẽ thấy “Không tìm thấy”.
- `command-dispatch-mapper.js` chưa có UNO cho wordCount / trackChanges nav / help — LibreOffice bridge không map các lệnh này.

## NEXT ACTION

Claude review. KHÔNG merge main. Task sau: catalog Sheet/Slides + rà soát Help cho nốt lệnh Writer còn thiếu.
