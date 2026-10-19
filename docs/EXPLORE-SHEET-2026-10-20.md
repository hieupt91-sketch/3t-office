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

## Kết quả thực tế

- **Môi trường:** `git merge main` báo đã cập nhật; `CODEX-COMMON-RULES.md` không tồn tại ở gốc worktree. Dùng CDP qua `launchApp`, profile riêng cho mỗi lượt. Không dùng Excel COM vì hàng đợi ghi rõ COM Excel bị chặn; không chạy batch audit có gọi COM.
- **Fixture:** 20 dòng × 6 cột doanh thu, công thức VLOOKUP, IF, SUM, SUMIF. Thao tác mở đầu xác nhận đủ công thức và giá trị tính.
- **Kết quả desktop + mở lại phiên mới:** 39/39 PASS, 0 FAIL. Chi tiết ở [q15-results.json](assets/q15-sheet-2026-10-20/q15-results.json); bài chạy [q15-sheet-roundtrip.desktop.mjs](../tests/live/cdp/q15-sheet-roundtrip.desktop.mjs).
- **Lỗi được tái hiện và sửa:** trước khi sửa, CDP kiểm tra XLSX cho thấy chuỗi điều kiện `"SP01"` trong SUMIF bị đổi thành tham chiếu ODF `[.SP01]`; sau sửa, XLSX thật giữ `=SUMIF(B2:B22,"SP01",G2:G22)` và kết quả 650.000. Bổ sung bài unit trước/sau; bản sửa là commit `9bf32df7`.
- **Bổ sung UI:** trước sửa, hộp thoại tiêu đề trục không có ô tiêu đề biểu đồ (CDP: `titleInput=false`, X/Y có). Đã thêm ô tiêu đề vào hộp thoại hiện có, hỗ trợ Undo, VI/EN và Help tiếng Việt; bài unit trước FAIL, sau PASS. Commit `08eb8842`.

### Nhật ký thao tác (39 kiểm tra)

| # | Thao tác và kết quả kiểm chứng | Trạng thái |
|---:|---|---|
| 1 | Mở bảng 20×6; VLOOKUP, IF, SUM, SUMIF có công thức và giá trị | PASS |
| 2 | Sắp xếp nhiều cấp: Sản phẩm A→Z, Doanh thu giảm dần | PASS |
| 3 | Bật AutoFilter cho A1:F21 | PASS |
| 4 | Lọc theo giá trị sản phẩm; 16 dòng ẩn | PASS |
| 5 | Lọc Doanh thu lớn hơn 300.000; 10 dòng ẩn | PASS |
| 6 | Lọc theo màu ô; 17 dòng ẩn | PASS |
| 7 | Định dạng có điều kiện: thang màu | PASS |
| 8 | Định dạng có điều kiện: thanh dữ liệu | PASS |
| 9 | Định dạng có điều kiện: tô màu dưới ngưỡng | PASS |
| 10 | Tạo biểu đồ cột | PASS |
| 11 | Tạo biểu đồ đường | PASS |
| 12 | Qua hộp thoại giao diện, sửa tiêu đề biểu đồ và tên trục X/Y | PASS |
| 13 | Cố định hàng tiêu đề | PASS |
| 14 | Cố định đồng thời hàng trên và cột bên trái B2 | PASS |
| 15 | Định dạng ngày | PASS |
| 16 | Định dạng số có 2 chữ số thập phân và dấu phân cách | PASS |
| 17 | Định dạng tiền tệ VND | PASS |
| 18 | Định dạng phần trăm | PASS |
| 19 | Gộp vùng A25:F25 | PASS |
| 20 | Kẻ viền ngoài và đường viền trong bảng | PASS |
| 21 | Chèn hàng giữa bảng; công thức hàng và SUM dịch đúng | PASS |
| 22 | Chèn hàng giữ định dạng KPI phần trăm | PASS |
| 23 | Chèn cột giữa bảng; công thức dịch tham chiếu đúng | PASS |
| 24 | Chèn cột giữ định dạng KPI phần trăm | PASS |
| 25 | Sao chép bằng Ctrl+C, mở Dán đặc biệt bằng Ctrl+Alt+V | PASS |
| 26 | Chọn chế độ chỉ dán giá trị; kiểm tra ô đích | PASS |
| 27 | Mở hộp In và tạo xem trước 2 trang | PASS |
| 28 | Đóng xem trước bằng Escape | PASS |
| 29 | Lưu XLSX qua adapter desktop | PASS |
| 30 | Kiểm tra tệp XLSX thật giữ chuỗi điều kiện SUMIF và định dạng phần trăm | PASS |
| 31 | Mở XLSX trong phiên CDP desktop mới; công thức/giá trị khớp | PASS |
| 32 | Mở lại giữ cả biểu đồ cột và đường | PASS |
| 33 | Mở lại giữ tiêu đề biểu đồ và tên trục | PASS |
| 34 | Mở lại giữ trạng thái cố định hàng và cột | PASS |
| 35 | Mở lại giữ đủ ba loại định dạng có điều kiện | PASS |
| 36 | Mở lại giữ vùng ô đã gộp | PASS |
| 37 | Mở lại giữ định dạng phần trăm và viền | PASS |
| 38 | Mở lại giữ giá trị đã Dán đặc biệt trong DOM hiển thị | PASS |
| 39 | Mở lại SUMIF sau khi chèn hàng/cột: công thức đúng, kết quả 650.000 | PASS |

### Ảnh chụp và round-trip 5 tệp LAN

- Ảnh: [bảng nguồn](assets/q15-sheet-2026-10-20/01-bang-doanh-thu.png), [sắp xếp](assets/q15-sheet-2026-10-20/02-sap-xep-nhieu-cap.png), [định dạng có điều kiện](assets/q15-sheet-2026-10-20/03-dinh-dang-co-dieu-kien.png), [biểu đồ/tiêu đề/trục](assets/q15-sheet-2026-10-20/04-bieu-do-va-truc.png), [cố định hàng+cột](assets/q15-sheet-2026-10-20/05-dong-bang-hang-cot.png), [xem trước in](assets/q15-sheet-2026-10-20/06-xem-truoc-in.png), [trước lưu](assets/q15-sheet-2026-10-20/06-truoc-luu-xlsx.png), [mở lại](assets/q15-sheet-2026-10-20/07-mo-lai-xlsx.png).
- 5 tệp LAN: `lan25.xlsx`, `lan20.xlsx`, `lan07.xlsx`, `lan13.xlsx`, `lan23.xlsx` đều nạp/lưu thành công bằng CDP; structural diff 0, XLSX lint sạch. Thời gian nạp 15,9–16,8 giây, lưu 5,2–5,9 giây. Excel COM: **BLOCKED theo quy tắc hàng đợi**, không chạy.

### Gate cuối

- `npm test`: PASS, 3771/3771; `node tests/run-tests.js`: PASS, 3771/3771.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS, VI=3110, EN=3110, missing=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS, 0 dòng bị hạ. Chạy generator Excel để cập nhật hai dòng tham chiếu bị cũ.
- `python -m pytest tests -q -k "sheet or xlsx or ooxml"`: PASS, 359 passed, 740 deselected, 251,95 giây.
