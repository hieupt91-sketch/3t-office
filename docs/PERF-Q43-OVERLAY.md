# Q43 — Sheet: tối ưu metadata overlay XLSX

## Kết quả

Q43 đặt mục tiêu median editable ≤25 giây và giảm ít nhất 50% cho LAN01/LAN09, đồng thời giữ nguyên byte đầu ra, không làm chậm LAN28/LAN14 và không giảm chất lượng lưu. Thay đổi đã triển khai là đường chia sẻ chỉ mục quan hệ drawing của worksheet giữa các overlay chart, chart-anchor và pivot-chart. Q44 đặt `VNO_XLSX_SHARED_DRAWING_INDEX` mặc định bật; đặt `VNO_XLSX_SHARED_DRAWING_INDEX=0` để dùng fallback cũ. Không thay đổi model, định dạng lưu hay LibreOffice Core.

Kết quả hiệu năng chưa đạt ngưỡng chính: giảm thời gian chart overlay, nhưng cell metadata và các stage còn lại vẫn chiếm phần lớn thời gian mở.

| Workbook | Baseline warm min / median / max | Sau tối ưu (6 workers) min / median / max | Mức giảm median |
|---|---:|---:|---:|
| LAN01 | 50.248 / 50.523 / 50.750 s | 45.400 / 45.831 / 46.245 s | 9.3% |
| LAN09 | 41.533 / 41.785 / 41.918 s | 35.124 / 35.408 / 35.592 s | 15.3% |

Các lần benchmark app là tuần tự, profile CDP riêng. Thử nghiệm benchmark với 8 workers cho median LAN01 46.032 s và LAN09 35.082 s, không tốt hơn 6 workers; không đổi số worker mặc định. Ở số đo Q43, cell metadata mất khoảng 14.06 s ở LAN01 và 4.00 s ở LAN09; Q44 bổ sung tối ưu cho giai đoạn này và các stage liên quan, nhưng tổng thời gian vẫn chưa đạt ngưỡng. Chart helper giảm từ median khoảng 5.07 s xuống 0.6 ms ở LAN01 và từ 7.07 s xuống khoảng 574 ms ở LAN09.

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

Tệp implementation: `adapters/libreoffice/common/ooxml_zip_patch.py`; regression: `tests/test_sheet_chart_overlay_index.py`; kiểm tra mở lại LAN14 chụp screenshot qua CDP: `tests/live/cdp/lan14-reopen-verify.mjs`. Chỉ mục dùng dictionary cục bộ trong mỗi lần overlay, không cache dùng chung qua workbook/thread. Đặt `VNO_XLSX_SHARED_DRAWING_INDEX=0` để trở về đường cũ. Các tối ưu metadata Q44 có fallback `VNO_XLSX_CACHE_NATIVE_CELL_FORMAT_ATTR=0`, `VNO_XLSX_FAST_METADATA_ATTRIBUTES=0`, và `VNO_XLSX_LAZY_METADATA_CELL_BODY=0`.

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


## Q44 — Mặc định drawing index và cell metadata

Q44 bật drawing index mặc định. Regression `tests/test_sheet_chart_overlay_index.py` xác nhận mặc định parse worksheet một lần và `VNO_XLSX_SHARED_DRAWING_INDEX=0` vẫn đi được fallback. Metadata được tối ưu theo từng commit: cache serialization thuộc tính format native theo object cấu hình, chèn thuộc tính mới trực tiếp, bỏ regex xóa thuộc tính vốn không có, và trì hoãn tạo chuỗi body cho các ô không cần metadata giá trị. Không thay đổi semantics của workbook; mỗi nhánh mới có cờ fallback nêu trên.

| Workbook | Baseline Q44 warm min / median / max | Sau Q44 min / median / max | Mục tiêu median | Kết quả |
|---|---:|---:|---:|---|
| LAN01 | 45.404 / 45.534 / 46.102 s | 43.554 / 43.639 / 43.845 s | ≤30 s | Chưa đạt |
| LAN09 | 34.897 / 35.333 / 35.521 s | 34.195 / 34.266 / 34.381 s | ≤25 s | Chưa đạt |
| LAN28 | — | 3.411 / 3.418 / 3.425 s | ≤3.5 s | Đạt |
| LAN14 lưu | — | 203.784 s tổng probe; khoảng 33.8 s từ append đầu đến output | ≤180 s lưu | Probe tổng vượt ngưỡng; thời gian append→output dưới ngưỡng, không phải số đo save-only |
| LAN14 mở lại | — | 149.081 s | ≤93 s | Chưa đạt; 1,435,546 ô; hash 5,000 ô đầu `abc8c19984fc06c81a0f4066fcf1b8a675be855e9420bdd81bcd8a941dfebd09` khớp |

Profiling Q44 xác định metadata là phần đáng kể nhưng không phải toàn bộ độ trễ: LAN01 cProfile cho `_p1_apply_metadata_row` khoảng 23.3 s, `_p1_stamp_cell_metadata` 18.9 s, và `_set_native_cell_format_attr` 11.3 s cumulative (cProfile làm tổng chậm hơn); benchmark app sau sửa metadata còn khoảng 43.6 s. So sánh scanner với regex trên 2,767,390 ô gần như ngang nhau (8.761 s và 8.674 s), nên không đổi parser sang regex. Lazy body slicing giảm ít; tối ưu stage này chưa đủ để đạt mục tiêu.

| Kiểm tra parity / batch | Kết quả Q44 |
|---|---|
| Drawing index và metadata Q44 bật mặc định so với fallback toàn bộ cờ về 0 | PASS, 27/27 giống SHA-256 cho overlay FODS, FODS tối ưu, FODS cuối và compact payload; LAN01/LAN09 payload bao gồm dữ liệu đủ để đối chiếu 5,000 ô đầu |
| So sánh nhánh Q44 với baseline legacy trước Q44 | 25/27; LAN08 và LAN15 vốn khác ở cả khi tắt toàn bộ cờ Q44, nên không quy các khác biệt này cho Q44 |
| Batch round-trip LAN01..LAN28, bỏ LAN14 | PASS, 27/27 saved, diffs=0, lint clean; Excel COM BLOCKED, không khởi chạy |

### Gate Q44 và giao diện

- PASS — `npm test`: 3790/3790.
- PASS — `node tests/run-tests.js`: 3790/3790.
- PASS — `node scripts/audit-0610/i18n_parity.mjs`: VI=3153, EN=3153, thiếu 0; 20 khóa nghi ngờ giống nhau/chưa dịch.
- PASS — `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: 0 dòng bị hạ.
- FAIL — `python -m pytest tests -q -k "sheet or xlsx or ooxml or overlay"`: 407 passed, 1 failed, 723 deselected, 1271.71 s. Lỗi `test_vn_save_password_open_roundtrip[writer-sample-writer.docx-docx]`: chuyển đổi Writer hết thời gian; chạy riêng lần nữa cũng FAIL sau 120.83 s. Hai lần không chỉ ra lỗi XLSX/Sheet.
- PASS — batch round-trip LAN: 27/27 saved, diffs=0, lint clean; Excel COM BLOCKED theo quy tắc phiên, không được khởi chạy.
- PASS — so sánh parity Q44 mặc định với mọi cờ fallback tắt: 27/27 trùng hash ở overlay FODS, FODS sau optimize, FODS cuối và compact payload. So sánh legacy độc lập 25/27; LAN08/LAN15 lệch cả khi cờ Q44 tắt.
- PASS — hồi quy Q44: mỗi thay đổi metadata có bài test đỏ trước sửa và focused test xanh sau sửa; 4 flag mới có fallback.

Ảnh benchmark và ảnh batch CDP lưu tại `E:\VNOffice-briefs\runs\q44-baseline`, `q44-after-final`, `q44-lan28`, `q44-lan14`, `q44-byte-parity` và `q44-batch-roundtrip`.

- LAN01: ảnh benchmark warm trong `q44-baseline`/`q44-after-final` đã xem; chrome, lưới và thanh trạng thái đạt.
- LAN02: ảnh CDP `q44-batch-roundtrip/lan02.visual-recheck.cdp.png` đã xem sau khi chạy lại bằng profile riêng; ribbon, lưới, hai tab và thanh trạng thái đạt.
- LAN03–13, LAN15–16, LAN18–20, LAN22–28: ảnh CDP trễ theo workbook trong `q44-batch-roundtrip/lanNN.late.cdp.png` đã xem; ribbon, lưới và status không bị cắt/chồng. Một số nhãn tab dài bị rút gọn, thanh cuộn vẫn hiện.
- LAN04–06, LAN08–09, LAN11–12, LAN14, LAN17, LAN21: ảnh lúc nạp hoặc mở lại đã xem. Một số ảnh giữ thông báo tiến độ 12% dù nội dung ô đã vẽ; LAN06 có hộp “Đang mở tài liệu...” phủ vùng ribbon trong ảnh lúc mở. Không có hộp thoại tác vụ nào khác được mở trong lượt batch.
- LAN09: tab sheet dài và dải tab chật, nhãn cắt/đè ở cạnh dưới.
- LAN14: thanh tab nhiều sheet bị cắt ngang; nội dung lưới dày đặc.
- LAN17 và LAN21: thanh cuộn ngang che một phần hàng tab ở ảnh CDP.
- LAN28: ảnh benchmark riêng warm đạt; giao diện gọn, không thấy lỗi chrome.

Các vấn đề tab/tiến độ được ghi nhận để chuyển sang xử lý giao diện riêng; không thay đổi giao diện trong phạm vi tối ưu mở XLSX.
