# Q43 — Sheet: tối ưu metadata overlay XLSX

## Kết quả

Q43 đặt mục tiêu median editable ≤25 giây và giảm ít nhất 50% cho LAN01/LAN09, đồng thời giữ nguyên byte đầu ra, không làm chậm LAN28/LAN14 và không giảm chất lượng lưu. Thay đổi đã triển khai là đường tùy chọn `VNO_XLSX_SHARED_DRAWING_INDEX=1`: chia sẻ chỉ mục quan hệ drawing của worksheet giữa các overlay chart, chart-anchor và pivot-chart. Mặc định cờ tắt; fallback hiện hữu vẫn chạy nguyên trạng. Không thay đổi model, định dạng lưu hay LibreOffice Core.

Kết quả hiệu năng chưa đạt ngưỡng chính: giảm thời gian chart overlay, nhưng cell metadata và các stage còn lại vẫn chiếm phần lớn thời gian mở.

| Workbook | Baseline warm min / median / max | Sau tối ưu (6 workers) min / median / max | Mức giảm median |
|---|---:|---:|---:|
| LAN01 | 50.248 / 50.523 / 50.750 s | 45.400 / 45.831 / 46.245 s | 9.3% |
| LAN09 | 41.533 / 41.785 / 41.918 s | 35.124 / 35.408 / 35.592 s | 15.3% |

Các lần benchmark app là tuần tự, profile CDP riêng. Thử nghiệm benchmark với 8 workers cho median LAN01 46.032 s và LAN09 35.082 s, không tốt hơn 6 workers; không đổi số worker mặc định. Trước/sau, cell metadata mất khoảng 14.06 s ở LAN01 và 4.00 s ở LAN09; phần này không được tối ưu trong thay đổi hiện tại. Chart helper giảm từ median khoảng 5.07 s xuống 0.6 ms ở LAN01 và từ 7.07 s xuống khoảng 574 ms ở LAN09.

| Kiểm tra không hồi quy | Kết quả |
|---|---|
| LAN28 warm, cờ bật | min/median/max 3.411 / 3.434 / 3.467 s; baseline Q42 median 3.499 s |
| LAN14 lưu | PASS, 134.035 s, dưới giới hạn 180 s; đầu ra 9,742,160 byte |
| LAN14 mở lại | PASS, 89.241 s, dưới giới hạn 93 s; 1,435,546 ô; hash 5,000 ô đầu `abc8c19984fc06c81a0f4066fcf1b8a675be855e9420bdd81bcd8a941dfebd09` |
| Overlay/FODS/payload | PASS, 27/27 workbook có SHA-256 overlay FODS, FODS cuối và compact payload giống hệt |
| JS model 5,000 ô đầu | PASS, LAN01 và LAN09 cùng hash trước/sau; LAN01 `17edb40881b858f0f0a2c81a7368c46c8e59afc70c1ad0a6406687c5d9b5a096`, LAN09 `237c170bcdad2ae3a53ecee1d817be668e32ec7ea50ff6dc8665235075972751` |
| Batch round-trip LAN | PASS cho phần lưu/so sánh: 27/27 saved, diffs=0, lint clean; Excel COM BLOCKED theo quy tắc phiên |

### Các gate

- PASS — `node tests/run-tests.js`: 3790/3790.
- PASS — `npm test`: 3790/3790.
- PASS — `node scripts/audit-0610/i18n_parity.mjs`: VI=3153, EN=3153, thiếu 0; script còn báo 20 khóa nghi ngờ giống nhau/ chưa dịch.
- PASS — `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: 0 dòng bị hạ.
- PASS — `python -m pytest tests -q -k "sheet or xlsx or ooxml or overlay"`: 401 passed, 723 deselected.
- PASS — hồi quy mới trước sửa: 1 failed (worksheet XML bị parse 4 lần); sau sửa: 15/15 focused overlay/chart/pivot tests.
- NOT RUN — build; task không đổi build system.
- BLOCKED — Excel COM bị cấm theo quy tắc chung. Runner batch đã bỏ qua riêng phép mở bằng Excel, không khởi chạy COM; phần audit LibreOffice/save/diff/lint vẫn hoàn tất.

## Thay đổi và khả năng rollback

Tệp implementation: `adapters/libreoffice/common/ooxml_zip_patch.py`; regression: `tests/test_sheet_chart_overlay_index.py`; kiểm tra mở lại LAN14 chụp screenshot qua CDP: `tests/live/cdp/lan14-reopen-verify.mjs`. Chỉ mục dùng dictionary cục bộ trong mỗi lần overlay, không cache dùng chung qua workbook/thread. Tắt `VNO_XLSX_SHARED_DRAWING_INDEX` để trở về đường cũ.

Các commit theo bước: `e8b27448` plan; `181d58cf` test đỏ; `7c014405` implementation; `cef7dd87` screenshot CDP cho verifier LAN14.

## Giao diện đã xem

Ảnh chụp qua CDP ở 1366×768; không mở menu/hộp thoại trong các lượt benchmark.

- LAN01 baseline và sau tối ưu: **đạt** — ribbon, lưới, tab và status trong viewport; không thấy chữ đè/cắt ở chrome app.
- LAN09 baseline và sau tối ưu: **có điểm chưa đạt** — nội dung tab sheet dài làm dải tab chật/cắt theo chiều ngang; nút cuộn tab hiện diện. Đây là hành vi theo workbook nhiều sheet, chưa sửa trong scope Q43.
- LAN28 sau tối ưu: **đạt** — ribbon, lưới, tab và status hiển thị gọn.
- LAN14 sau mở lại: **có điểm chưa đạt** — chrome và status vừa viewport; danh sách tab dài chỉ xem được theo chiều ngang, nút cuộn hiện diện.

Ảnh nằm trong các thư mục kết quả `E:\VNOffice-briefs\runs\q43-baseline`, `q43-after-1`, `q43-lan28` và `q43-lan14`. Trạng thái tab LAN09/LAN14 được ghi nhận, không chỉnh sửa giao diện vì đây là benchmark overlay và workbook có nhiều sheet.

## Tài liệu đầu vào

Đã đọc `CODEX-COMMON-RULES.md`, `docs/PERF-OPEN-WARM-21-10.md`, `docs/DIAG-LAN14.md` (tên thực có thay cho `docs/LAN14-DIAG.md`). Bộ nhớ yêu cầu “Open speed = survival rule” và “feedback_open_speed_bench_warm_profile” không có nguồn truy cập trong phiên.
