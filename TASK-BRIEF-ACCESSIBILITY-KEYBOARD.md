# Nhiệm vụ: Kiểm tra thật khả năng điều hướng bằng bàn phím (Accessibility) — Writer/Sheet/Slides

## Bối cảnh

Một nhiệm vụ song song (opencode, nhánh
`feature/accessibility-aria-contrast-audit`) đang bổ sung `aria-label`/
`role` còn thiếu. Nhiệm vụ CỦA BẠN khác: kiểm tra bằng THAO TÁC BÀN
PHÍM THẬT (không dùng chuột) xem người dùng có thể dùng toàn bộ ứng
dụng chỉ bằng bàn phím hay không — đây là yêu cầu cốt lõi của
accessibility, độc lập với việc có `aria-label` hay không.

## Việc cần làm — dùng Playwright, chỉ dùng phím (Tab/Shift+Tab/Enter/
Space/Arrow/Esc), KHÔNG click chuột trong lúc kiểm tra điều hướng

1. **Thứ tự Tab trên Ribbon**: từ khi trang tải xong, nhấn Tab liên
   tục — xác nhận focus di chuyển theo thứ tự hợp lý (không nhảy lung
   tung), mọi nút/dropdown/control đều nhận được focus (không có "hố
   đen" bị bỏ qua), có viền focus nhìn thấy được (focus ring — kiểm tra
   CSS `:focus-visible` có áp dụng không).
2. **Chuyển tab Ribbon bằng phím**: xác nhận có thể chuyển giữa các
   tab Ribbon (Trang đầu/Chèn/Bố cục...) bằng phím mũi tên hoặc Tab,
   không bắt buộc phải click chuột.
3. **Dialog bẫy focus (focus trap)**: mở TỪNG hộp thoại chính (Page
   Setup, Watermark, Format Cells, Mail Merge, Columns...) chỉ bằng
   phím, xác nhận: Tab bên trong dialog không thoát ra ngoài nền phía
   sau (focus trap đúng chuẩn), Esc đóng được dialog, focus quay lại
   đúng phần tử đã mở dialog trước đó (không bị "mất dấu" focus).
4. **Vùng soạn thảo chính**:
   - Writer: gõ chữ, định dạng (Ctrl+B/I/U) chỉ bằng phím — đã hoạt
     động tốt (đã audit trước đó), chỉ xác nhận lại nhanh không hồi
     quy.
   - Sheet: điều hướng ô bằng phím mũi tên/Tab/Enter, mở Format Cells
     bằng Ctrl+1, xác nhận focus có quay lại đúng ô sau khi đóng dialog.
   - Slides: chọn hình khối bằng Tab (nếu có hỗ trợ) hoặc ít nhất xác
     nhận panel/ribbon vẫn điều hướng được đầy đủ bằng phím khi đang ở
     chế độ soạn thảo slide.
5. **Menu Backstage (Tệp)**: mở bằng phím, điều hướng các mục (Mới, Mở,
   Lưu...) bằng phím mũi tên/Tab, Esc đóng lại.

## Nếu tìm thấy lỗi thật (focus bị mất, Tab nhảy sai thứ tự, dialog
không bẫy focus, không có focus ring nhìn thấy...)

Sửa an toàn trong phạm vi hẹp (thường chỉ cần thêm `tabindex` đúng chỗ,
sửa thứ tự DOM, thêm CSS `:focus-visible`, hoặc thêm xử lý Esc/focus-
trap bằng JS ngắn gọn). Nếu lỗi phức tạp/rủi ro cao, CHỈ báo cáo rõ,
không tự sửa liều.

## Kiểm thử bắt buộc

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: không giảm so với hiện tại (1511).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- Viết `tests/live/accessibility-keyboard-navigation.playwright.mjs`
  ghi lại TỪNG bước kiểm tra ở trên bằng Playwright thật (mô phỏng
  phím bấm thật qua `page.keyboard`), PASS/FAIL rõ ràng cho từng mục.
- Viết `docs/HANDOFF-ACCESSIBILITY-KEYBOARD-NAV.md` — liệt kê lỗi tìm
  thấy, đã sửa gì, còn gì chưa sửa (nếu có).
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- KHÔNG đụng vào phần `aria-label`/`role` (nhiệm vụ song song đang
  làm) — chỉ tập trung HÀNH VI điều hướng bàn phím.
- KHÔNG sửa `main.py`.
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
