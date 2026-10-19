# Khám phá thao tác VN Sheet — 20/10/2026

## Kế hoạch trước khi kiểm thử

- **Mục tiêu:** kiểm tra luồng thao tác Sheet trên ứng dụng desktop thật theo Q15: sắp xếp nhiều cấp, lọc, định dạng có điều kiện, biểu đồ, cố định, định dạng, gộp/viền, chèn hàng/cột, dán đặc biệt, xem trước khi in và XLSX round-trip cho bảng 20 hàng × 6 cột có công thức.
- **Khả năng hiện có:** các lệnh đã có trong Sheet UI/grid; dùng lại implementation và adapter hiện có. XLSX sẽ được lưu từ desktop app, rồi mở trong phiên CDP mới. Tham chiếu flow Q5 và CDP round-trip hiện hữu.
- **Phạm vi tệp dự kiến:** tài liệu kiểm thử ngày này, ảnh chụp minh chứng, và một script CDP chuyên biệt nếu các script hiện tại không bao phủ đủ. Chỉ sửa source khi một thao tác có bằng chứng FAIL tái hiện được.
- **Phụ thuộc:** desktop WebView2, CDP qua `tests/live/cdp/session.mjs`, Python/openpyxl để tạo dữ liệu fixture và đọc XLSX; không dùng Excel COM. `CODEX-COMMON-RULES.md` không có ở gốc worktree.
- **Rủi ro:** một số định dạng/đối tượng có thể bị mất sau XLSX round-trip; in thật phụ thuộc máy in, vì vậy chỉ kiểm tra Print Preview. Hộp thoại native không điều khiển; lưu trên tệp XLSX có sẵn.
- **Kiểm thử:** chạy CDP trước sửa để ghi lỗi; mỗi lỗi source sẽ có bài CDP/unit FAIL trước và PASS sau. Chạy các gate Q15 được yêu cầu sau cùng.
- **Rollback:** mỗi sửa source là commit riêng; có thể revert commit sửa tương ứng mà giữ nguyên nhật ký và ảnh audit.


## Kế hoạch bổ sung trước khi sửa tiêu đề biểu đồ

- **Mục tiêu:** cho phép đổi tiêu đề biểu đồ ngay trong hộp thoại tiêu đề trục đang có, vì Q15 yêu cầu đổi cả tiêu đề lẫn tên trục và hiện UI chỉ sửa được hai tên trục.
- **Khả năng hiện tại:** model biểu đồ đã lưu `title`; `updateChartAxisTitles` và hộp thoại hiện hành chỉ nhận X/Y. Không cần thay format hoặc command.
- **Tệp dự kiến:** `apps/sheet/sheet-chart.js`, `apps/sheet/sheet-grid.js`, `platform/help/entries-sheet.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `tests/unit/sheet-charts.test.js`, và CDP Q15 để thao tác hộp thoại.
- **Phụ thuộc:** không thêm dependency; dùng modal, i18n, Help và serializer XLSX hiện có.
- **Rủi ro:** title phải giữ nguyên khi người dùng chỉ sửa trục và phải round-trip XLSX. Test sẽ kiểm cả hai trường hợp.
- **Kiểm thử:** unit/chart CDP FAIL trước sửa rồi PASS sau sửa; full Q15 desktop round-trip và các gate cuối.
- **Rollback:** commit riêng chỉ chứa title UI/Help/i18n/tests; có thể revert mà giữ fix công thức và nhật ký audit.

## Kết quả

Đang thực hiện.
