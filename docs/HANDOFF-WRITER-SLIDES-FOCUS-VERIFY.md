# Handoff — Writer/Slides keyboard focus verification

## Objective

Xác minh bằng Microsoft Edge/Playwright thật rằng các vùng soạn thảo của VN Writer và VN Slides nhận keyboard focus sau thao tác chuột, rồi kiểm tra nhập chữ, số, phím mũi tên và các shortcut được yêu cầu. Không thay đổi VN Sheet hay shared command infrastructure.

## Current capability and decision

- Writer body, header và footer đã dùng `contenteditable="true"`; Chromium tự focus đúng khi click. Không cần thêm `tabindex` hoặc `.focus()`.
- Slides title và body đã dùng `contenteditable="true"`; Chromium tự focus đúng khi click. Không cần sửa.
- Slides SmartArt node dùng cơ chế riêng: shape có `tabIndex = 0`; double-click hoặc gõ khi shape đang focus sẽ chuyển text node sang `contenteditable="true"`.
- Generic rectangle/ellipse hiện không có thuộc tính text hoặc text-box editor, nên không có vùng nhập text bổ sung để kiểm tra ngoài SmartArt node.

## Results by editing region

| Vùng | Tương tác Playwright thật | Kết quả |
|---|---|---|
| Writer `.vno-writer-body[contenteditable="true"]` | Click; kiểm tra `document.activeElement`; gõ chữ/số; ArrowLeft; Ctrl+B; Ctrl+Z | Không có lỗi focus. `activeElement` là `.vno-writer-body`; `AC1` + ArrowLeft + `B` thành `ACB1`; `BOLD` có markup đậm; Ctrl+Z khôi phục nội dung trước khi gõ. |
| Writer `.vno-writer-header` | Click; Ctrl+A; Backspace; gõ `HEADER-123` | Không có lỗi. Header là `activeElement` và nhận đủ nội dung. |
| Writer `.vno-writer-footer` | Click; Ctrl+A; Backspace; gõ `FOOTER-456` | Không có lỗi. Footer là `activeElement` và nhận đủ nội dung. |
| Slides `.vno-slide-title` | Click; Ctrl+A; Backspace; gõ chữ/số; ArrowLeft | Không có lỗi. Title là `activeElement`; `TL1` + ArrowLeft + `X` thành `TLX1`. |
| Slides `.vno-slide-body` | Click; Ctrl+A; Backspace; gõ chữ/số; ArrowLeft | Không có lỗi. Body là `activeElement`; `BD2` + ArrowLeft + `X` thành `BDX2`. |
| Slides SmartArt text — double-click | Chèn diagram từ ribbon/dialog; double-click node; kiểm tra focus; Ctrl+A; gõ `NODE-DOUBLE-1`; Enter | Không có lỗi. Text node chuyển sang edit mode, nhận focus và lưu đúng nội dung. |
| Slides SmartArt text — click-rồi-gõ | Click shape rồi gõ `Q7` bằng keyboard | **Có lỗi trước sửa:** kết quả `7Q`. **Sau sửa:** shape nhận focus, text node nhận focus/edit mode và kết quả đúng `Q7`. |

## Defect and fix

Trong `apps/slides/slides-canvas.js`, `startEditing(initialText)` trước đây gọi `focus()` rồi mới thay `textContent` bằng ký tự mở đầu. Trên Chromium, thao tác thay `textContent` sau focus đặt caret về đầu node. Vì vậy ký tự thứ hai bị chèn trước ký tự đầu (`Q7` thành `7Q`).

Fix: gán ký tự mở đầu trước khi focus, sau đó tạo collapsed Range ở cuối nội dung. Cách này giữ đúng ký tự đầu và thứ tự gõ, không bôi đen/chọn ký tự vừa tạo.

## Files/modules changed

- `apps/slides/slides-canvas.js`: sửa vị trí caret khi bắt đầu nhập text trực tiếp vào shape.
- `tests/live/writer-slides-focus.playwright.mjs`: bài kiểm tra trình duyệt thật cho tất cả vùng nêu trên.
- `docs/HANDOFF-WRITER-SLIDES-FOCUS-VERIFY.md`: handoff này.

Không sửa `apps/sheet/**`, `adapters/libreoffice/sheet/**`, `platform/commands/shortcut-manager.js` hoặc `platform/commands/command-bus.js`.

## Dependencies and risk

- Không thêm dependency.
- Test live dùng `python -m http.server` tại `http://127.0.0.1:8765/`, `playwright-core` sẵn có và Microsoft Edge cài trên máy.
- Rủi ro thấp, giới hạn trong lúc bắt đầu edit text của Slides shape. Luồng double-click và luồng click-rồi-gõ đều đã được xác minh.

## Test evidence

- `node tests/live/writer-slides-focus.playwright.mjs` với `VNO_PLAYWRIGHT_PATH` trỏ tới `playwright-core`: **PASS 10/10**, Microsoft Edge headless, HTTP thật.
- `node tests/run-tests.js`: **PASS 479/479, 0 FAIL**, thời gian đo **11.213 giây** (dưới 60 giây).

## Rollback

Hoàn tác thay đổi nhỏ trong `startEditing(initialText)` tại `apps/slides/slides-canvas.js` và xóa bài test/handoff mới. Không có migration hoặc thay đổi dữ liệu.

## Review notes

- Không merge vào `main`; branch để Claude review.
- Template được AGENTS.md nhắc tới tại `/09-templates/AGENT-HANDOFF.md` không tồn tại trong worktree, nên tài liệu này giữ đủ các mục objective, current capability, files/modules, dependency, risk, test plan/evidence và rollback.
