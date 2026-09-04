# Handoff — Writer References, Mailings & Review Audit (04/09/2026)

TASK: Audit sâu và khắc phục tab Tham chiếu (References), Trộn thư (Mailings) và Đánh giá (Review) của VN Writer bằng thao tác trình duyệt thật (Playwright) và unit test tự động.
AGENT/ROLE: Antigravity (agy)
BRANCH: `fix/writer-refmail-audit` (tạo từ `main` mới nhất trên worktree `E:\VNOffice-agy-writer-refmail`)

---

## 1. Findings và Fixes

| STT | Command ID / Tính năng | Loại lỗi | Đã sửa | Cách xác minh |
|---:|---|---|---|---|
| 1 | `writer.reference.tocInsert`, `writer.reference.tocUpdate` | TOC text hardcode tiếng Việt ("MỤC LỤC", "Chưa có tiêu đề...", "🔄 Cập nhật") không đổi khi chuyển ngôn ngữ `en-US` | Đã bổ sung bộ chuỗi `writerDialogs.toc.*` vào cả `strings-vi.js` và `strings-en.js`, cập nhật `updateTableOfContents()` và `_buildTableOfContentsElement()` gọi `t()` | Playwright live test & Suite 39 test 9 kiểm tra chuyển đổi `vi` / `en` |
| 2 | `writer.reference.footnoteInsert`, `writer.reference.endnoteInsert` | Tooltip & placeholder của Footnote và Endnote ("Nhấp để chuyển đến chú thích", "Nhập nội dung chú thích...") hardcode tiếng Việt | Bổ sung bộ chuỗi `writerDialogs.notes.*` vào cả `strings-vi.js` và `strings-en.js`, tích hợp `t()` vào `insertFootnote()` và `insertEndnote()` | Playwright live test & Suite 39 test 9 kiểm tra song ngữ `vi` và `en` |
| 3 | `writer.comment.insert`, `writer.trackChanges.toggle`, `acceptAll`, `rejectAll` | Thiếu direct handler binding trong `WriterAdapter.attach()` cho các lệnh Review (dẫn đến cảnh báo CommandBus hoặc phụ thuộc hoàn toàn vào UNO bridge fallback) | Đã gắn `globalCommandBus.bindHandler` tường minh trong `attach()` của `WriterAdapter` | Suite 39 test 8 & Playwright live test xác nhận kích hoạt trực tiếp từ Ribbon |
| 4 | `insertFootnote`, `insertEndnote` fallback mock | Trong môi trường Node/headless thiếu DOM `document`, các đối tượng fallback element tạo ra thiếu `getAttribute` và `setAttribute`, gây lỗi khi duyệt cây phần tử | Bổ sung `getAttribute` và `setAttribute` đầy đủ cho các object fallback element trong `writer-adapter.js` | Suite 39 test 7 & `node tests/run-tests.js` 423/423 PASS |
| 5 | `SafeFakeElement.querySelectorAll` | Gọi trực tiếp `child.getAttribute(attrName)` không có type guard an toàn `typeof === "function"`, gây crash khi phần tử con là object tùy biến | Bổ sung kiểm tra `typeof child.getAttribute === "function"` kèm fallback `child.attributes[attrName]` | Suite 39 test 7 chạy độc lập và trong master runner không crash |
| 6 | `writer.mailMerge.open`, `writer.mailMerge.insertField` | Cần xác minh phím Escape thật đóng các hộp thoại trộn thư (Lesson 5) | Xác nhận cơ chế `closeDialog` và phím Escape đóng hộp thoại CSV và chèn trường | Playwright live test nhấn phím `Escape` thật trên trình duyệt Edge |
| 7 | `writer.mailMerge.finish` | Ngắt trang vật lý khi trộn thư (`page-break-before: always`) cần đảm bảo tạo đúng số trang tương ứng | Đã kiểm chứng thuật toán sinh khối tách trang vật lý và cơ chế hoàn tác `Ctrl+Z` nguyên tử | Playwright live test kiểm tra 3 bản ghi kèm 2 phần tử ngắt trang |

---

## 2. Kết quả kiểm thử

### A. Kiểm thử trình duyệt thật (Playwright Live Browser Test)
- File test: `tests/live/writer-refmail-audit.live.mjs`
- Trình duyệt: Microsoft Edge (Chromium) thật qua cổng HTTP 8766.
- Đã chạy qua 2 locale: `vi-VN` và `en-US`.
- **Kết quả: 48/48 PASS (24 tests cho locale `vi`, 24 tests cho locale `en`)**.
  - TOC: Chèn 3 mục, click link TOC cuộn/focus đến Heading, cập nhật TOC nhận diện heading mới, xóa khối TOC.
  - Footnote: Chèn qua nút ribbon, chèn qua phím tắt `Ctrl+Alt+F`, nhảy 2 chiều giữa số mũ và chú thích, xóa và tự động đánh số lại (`1, 2, ...`).
  - Endnote: Chèn qua nút ribbon, chèn qua phím tắt `Ctrl+Alt+D`, nhảy 2 chiều, xóa và tự động đánh số lại La Mã (`i, ii, ...`).
  - Mail Merge: Đóng dialog bằng Escape thật (Lesson 5), lưu nguồn dữ liệu CSV phức tạp (chứa dấu phẩy trong ngoặc kép), chèn trường marker, bật/tắt xem trước bản ghi, điều hướng trước/sau (`prevRecord`, `nextRecord`), hoàn tất tạo tài liệu gồm 3 bản ghi kèm ngắt trang vật lý, hoàn tác `Ctrl+Z` khôi phục template.
  - Review: Thêm comment hiển thị card panel, bật/tắt Track Changes cập nhật class `.is-checked`, mở bảng soát lỗi chính tả AI.

### B. Master Automated Test Runner
- Lệnh: `node tests/run-tests.js`
- Thời gian chạy: ~10 giây (< 60 giây theo quy định).
- **Kết quả: 423/423 PASS | 0 FAIL**.
  - Đã tích hợp Suite 39: `Behavioral & Unit Tests — VN Writer References & Mailings Audit` (10/10 PASS).

---

## 3. Danh sách tệp tin thay đổi
- `adapters/libreoffice/writer/writer-adapter.js`: Tích hợp đa ngôn ngữ `t()` cho TOC và Footnotes/Endnotes, bổ sung direct handler binding cho nhóm lệnh Review (`writer.comment.insert`, `writer.trackChanges.*`), bổ sung `getAttribute`/`setAttribute` an toàn cho fallback mock elements.
- `platform/i18n/strings-vi.js`: Bổ sung catalog `writerDialogs.toc` và `writerDialogs.notes` tiếng Việt.
- `platform/i18n/strings-en.js`: Bổ sung catalog `writerDialogs.toc` và `writerDialogs.notes` tiếng Anh.
- `tests/unit/writer-refmail-audit.test.js`: Bộ 10 bài kiểm thử unit & behavioral cho References, Mailings, Review.
- `tests/live/writer-refmail-audit.live.mjs`: Bộ kiểm thử trình duyệt thật Playwright (48 tests).
- `tests/run-tests.js`: Đăng ký suite 39 vào master runner.
- `docs/HANDOFF-WRITER-REFMAIL-AUDIT-FIXES.md`: Báo cáo bàn giao chi tiết.
