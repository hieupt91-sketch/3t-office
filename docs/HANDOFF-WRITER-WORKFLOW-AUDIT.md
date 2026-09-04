# Agent Handoff — VN Writer Continuous Workflow Audit

TASK: Audit một phiên soạn thảo văn bản hành chính liên tục bằng chuột và bàn phím thật  
AGENT/ROLE: Codex / implementation & verification  
BRANCH: `fix/writer-workflow-audit`  
WORKTREE: `E:\VNOffice-agy-writer-workflow-audit`  
OBJECTIVE: Bắt lỗi trạng thái tích lũy/focus trong luồng Writer từ File > Mới, nhập và định dạng nội dung, bảng, Track Changes, Comment đến deep Undo/Redo.

## Kết quả theo đúng trình tự kịch bản

| STT bước | Lỗi tìm được (nếu có) | Đã sửa | Cách xác minh |
|---|---|---|---|
| 1. File > Mới; gõ tiêu đề, Enter, đoạn mở đầu | Không có lỗi. Trang mới trắng nhận focus và nhận toàn bộ ký tự bàn phím thật. | Không cần sửa. | Playwright click tab **Tệp** > **Tạo mới**, click trang rồi `keyboard.type`; `activeElement` là `.vno-writer-body`, cả hai dòng xuất hiện đúng. |
| 2. Chọn đoạn, Ctrl+B, gõ tiếp sau vùng chọn | **Có lỗi:** Chromium giữ caret trong `<b>`, khiến chữ gõ tiếp bị in đậm ngoài ý muốn. | `WriterAdapter` ghi nhận Bold được áp trên selection và tắt Bold đúng một lần trước lần chèn chữ tiếp theo tại caret đã thu gọn. | DOM thực sau thao tác: `<b>Căn cứ ...</b>&nbsp;Nội dung nối tiếp bình thường.`; computed style xác nhận đoạn chọn đậm, phần nối tiếp không đậm. |
| 3. Áp “Tiêu đề 1”, Enter, gõ tiếp | **Có lỗi:** Enter sau `H1` tạo `<div>` thay vì đoạn Normal `<p>`; ở baseline còn cộng hưởng với lỗi Bold phía trên. | Theo dõi `beforeinput/input` của `insertParagraph`; nếu Enter xuất phát trong `H1/H2/H3`, block mới được chuẩn hóa thành `<p>`. | Playwright click Quick Style `data-style-id="h1"`; xác nhận dòng tiêu đề là `H1`, dòng mới là `P`, focus/selection vẫn trong editor. |
| 4. Chèn bảng, Tab qua nhiều ô, Enter trong ô | **Có lỗi:** Tab dùng điều hướng focus mặc định của trình duyệt, thoát khỏi bảng và cuối cùng kẹt ở footer; dữ liệu gõ sau đó không vào ô. | Bắt Tab/Shift+Tab khi selection nằm trong `td/th`, giữ focus ở body và chuyển selection sang ô kế/trước. Enter vẫn do contenteditable xử lý để tạo dòng trong cùng ô. | Gõ liên tục `STT` → Tab → `Nội dung` → Tab → `Đơn vị` → Tab → `Ghi chú` → Tab → `1` → Enter → `Chi tiết trong ô`; 5 ô đúng dữ liệu, selection ở ô thứ 5, `activeElement` vẫn là body. |
| 5. Bật/tắt Track Changes, chèn và xóa | Không có lỗi sau khi kiểm đúng semantics: Backspace trên ký tự cũ tạo `<del>`, phần chèn tạo `<ins>`; Backspace trên chính insertion mới chỉ hủy insertion là hành vi đúng. | Không cần sửa. | Ctrl+Shift+E thật; ghi nhận 22 `<ins>` và 1 `<del>` sau gõ/xóa. Tắt rồi gõ tiếp, tổng marker giữ nguyên `23 → 23`. |
| 6. Chọn đoạn, Ctrl+Alt+M, gõ Comment | Không có lỗi. Dialog nhận keyboard focus đúng, Enter lưu comment; sau khi quay lại editor không còn dialog cũ. | Không cần sửa. | Có đúng 1 `.vno-comment-anchor`, 1 `.vno-comment-card`; `.vno-comment-content` bằng `Ý kiến rà soát nghiệp vụ`. Sau click trở lại trang, `activeElement` là body. |
| 7. Ctrl+Z liên tục | Không tìm thấy lỗi trong luồng tích lũy đã sửa. | Không cần sửa. | 11 lần Undo có 11 DOM state khác nhau, không state lặp/vô hiệu; kết thúc đúng trang trắng. |
| 8. Ctrl+Y liên tục | Không tìm thấy lỗi. | Không cần sửa. | 11 lần Redo; `innerHTML` cuối khớp byte-for-byte với snapshot ngay trước Undo. |
| 9. Kiểm tra focus xen kẽ | **Có lỗi tại bước bảng, cùng nguyên nhân Tab thoát editor ở bước 4.** | Được sửa cùng handler Tab/Shift+Tab trong bảng. | Kiểm tra 9 mốc: sau File > Mới, nhập cơ bản, Bold, Heading, bảng, Track Changes, Comment, Undo và Redo; toàn bộ có `activeElement === .vno-writer-body` (hoặc nằm trong editor) và selection trong body. Không có `pageerror`. |

## Implementation summary

- `adapters/libreoffice/writer/writer-adapter.js`
  - Ngăn Bold rò sang chữ gõ sau một vùng selection đã định dạng.
  - Chuẩn hóa đoạn mới sau Heading về Normal `<p>`.
  - Điều hướng Tab/Shift+Tab nội bộ bảng và bảo toàn keyboard focus.
- `tests/live/writer-workflow-audit.playwright.mjs`
  - Một browser context, một page, không reload, chạy liên tục toàn bộ kịch bản.
  - Tự khởi động `python -m http.server` trên `127.0.0.1:8771`.
  - Chỉ dùng click/type/press của Playwright để tạo thao tác người dùng; `page.evaluate` chỉ đọc bằng chứng DOM/focus, không gọi hàm nội bộ để tạo trạng thái.

## Commands and test results

- `node tests/live/writer-workflow-audit.playwright.mjs`: **PASS**, toàn bộ bước 1–9; 11 Undo + 11 Redo; 9/9 mốc focus đúng; 0 pageerror.
- `node --check adapters/libreoffice/writer/writer-adapter.js`: **PASS**.
- `node tests/run-tests.js`: **491/491 PASS**, 0 FAIL, **11.14 giây** (< 60 giây).
- Build: **NOT RUN** — repo HTML/CSS/ES modules thuần, không có build step.

## Commits

- `8078131` — `fix(writer): stop bold leaking past formatted selection`
- `f523a0a` — `fix(writer): reset heading paragraphs to normal on enter`
- `4ce27c1` — `fix(writer): keep tab navigation inside inserted tables`
- `456d802` — `test(writer): audit continuous keyboard editing workflow`

KNOWN FAILURES: Không có.  
RISKS: Handler bảng chỉ giữ Tab trong các ô đã tồn tại; tại ô cuối cùng, Tab vẫn dùng hành vi mặc định (chưa tự sinh hàng mới vì kịch bản không yêu cầu và không mở rộng scope). Track Changes vẫn là metadata DOM theo phiên như handoff tính năng gốc.  
DEPENDENCIES/BLOCKERS: Không thêm dependency; dùng Playwright Core đã cài ngoài repo và Microsoft Edge hiện có.  
CORE PATCH ID: Không có — không sửa LibreOffice Core.  
ROLLBACK: Có thể revert độc lập từng commit fix ở trên; test live nằm trong commit riêng.  
NEXT ACTION: Claude review branch; không merge tự động vào `main`.
