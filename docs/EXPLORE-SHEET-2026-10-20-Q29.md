# Q29 — Rà soát bảng lương và sổ cái trong VN Sheet

## Kế hoạch trước khi sửa

- **Mục tiêu:** kiểm thử hai workbook Sheet theo kịch bản bảng lương 30 dòng và sổ cái 200 dòng, gồm công thức, tổng hợp, Pivot, định dạng, biểu đồ, xác thực, bảo vệ, in, lưu và mở lại.
- **Khả năng hiện có:** VN Sheet có IF, VLOOKUP, SUMIF, PivotTable, biểu đồ cột/tròn/kết hợp, xác thực dữ liệu, định dạng có điều kiện, bảng, bảo vệ trang và sparkline. Adapter đã serialize/parse sparkline qua FODS; có bài kiểm thử lưu/mở lại sparkline thắng-thua.
- **Phát hiện trước sửa:** chèn sparkline qua `sheet.insert.sparklineColumn` trả thành công nhưng không đặt cờ tài liệu cần lưu. Lượt CDP đầu lưu XLSX nhưng không có `x14:sparklineGroup`; mở lại trả `cellsData[ô đích].sparkline = null` (FAIL). Đường lưu XLSX có thể giữ tệp nguồn nguyên trạng khi tài liệu chưa được đánh dấu thay đổi.
- **Tệp:** `adapters/libreoffice/sheet/sheet-adapter.js` đánh dấu tài liệu cần lưu sau lệnh chèn thành công; unit và CDP regression; Help tiếng Việt cùng chuỗi VI/EN.
- **Phụ thuộc/rủi ro:** không thêm dependency. Giữ tuyến FODS/LibreOffice hiện có. Excel COM BLOCKED theo quy tắc hàng đợi. Chỉ đổi cờ khi thao tác chèn thành công.
- **Kiểm thử:** regression unit và CDP trước sửa phải FAIL; sau sửa phải PASS. Sau đó chạy các gate Node/i18n/checklist/pytest và round-trip XLSX.
- **Rollback:** commit riêng Q29 gồm sửa, regression và audit; có thể revert commit đó.

## Dữ liệu và cách chạy

Hai workbook là fixture tổng hợp, ẩn danh, dùng tên tiếng Việt và giá trị đại diện; không được cung cấp dữ liệu nhân sự/kế toán thật để đưa vào repo. Chạy app VN Sheet qua CDP với `VNO_CDP_LOCALAPPDATA` mới cho từng phiên. Lưu XLSX, đóng phiên, mở lại bằng phiên CDP và kiểm XML gói XLSX. Không mở Excel COM; BLOCKED theo chỉ dẫn ticket. Bộ LAN 27 tệp không áp dụng vì không đổi mã mở/lưu Sheet.

## Nhật ký thao tác CDP (42 thao tác)

1. Tạo fixture bảng lương với 30 mã NV.
2. Nhập 30 họ tên tiếng Việt có dấu.
3. Gán năm phòng ban.
4. Nhập lương cơ bản, phụ cấp, ngày công và thưởng.
5. Tạo bảng ngưỡng thuế cùng thuế suất và giảm trừ nhanh.
6. Tính thu nhập chịu thuế bằng IF lồng.
7. Tính TNCN lũy tiến bằng VLOOKUP gần đúng.
8. Tính BHXH bằng 10,5% lương cơ bản.
9. Tính thực lĩnh sau thuế và BHXH.
10. Tính tổng thực lĩnh theo phòng ban bằng SUMIF.
11. Định dạng tiền tệ VND không có chữ số thập phân.
12. Cố định hàng tiêu đề và hai cột mã/tên.
13. Thiết lập giấy A4 ngang và vùng in bảng lương.
14. Lặp tiêu đề in ở các trang và đánh số trang.
15. Mở tệp bảng lương trong phiên Sheet mới.
16. Kiểm 30 dòng, tên đầu/cuối và công thức trong mô hình.
17. Đối chiếu giá trị tính thuế công thức IF với VLOOKUP.
18. Kiểm định dạng tiền VND và freeze sau mở.
19. Sắp xếp họ tên theo `vi-VN` và so thứ tự locale.
20. Tìm “Nguyễn An” qua chuỗi không dấu.
21. Mở lệnh PivotTable ở tab Dữ liệu.
22. Chọn `Phòng ban` làm trường hàng.
23. Chọn `Thực lĩnh` làm trường giá trị SUM.
24. Tạo PivotTable tổng theo năm phòng ban.
25. Lưu bảng lương thành XLSX.
26. Đóng phiên rồi mở lại XLSX trong phiên mới.
27. Kiểm PivotTable còn trong mô hình sau mở lại.
28. Tạo 200 dòng giao dịch sổ cái có ngày tháng, diễn giải, tài khoản Nợ/Có, số tiền, nhóm và lũy kế.
29. Áp dụng ngày `dd/mm/yyyy` và danh sách tài khoản hợp lệ.
30. Tô đỏ có điều kiện số tiền lớn hơn 100 triệu.
31. Tạo bảng dữ liệu có tiêu đề cho vùng A1:G201 trong Sheet.
32. Khóa trang tính nhưng mở khóa cột diễn giải.
33. Cố định hàng tiêu đề của sổ cái.
34. Tạo biểu đồ cột ghép và đường trên trục phụ.
35. Tạo biểu đồ tròn có nhãn phần trăm.
36. Đặt tiêu đề, chú giải và màu biểu đồ.
37. Chèn sparkline cột cho chuỗi 12 kỳ.
38. Lưu sổ cái thành XLSX rồi đóng phiên.
39. Mở lại sổ cái ở phiên mới và kiểm bảng dữ liệu, biểu đồ, validation, conditional formatting, bảo vệ và sparkline trong mô hình.
40. Nhập `1.250` bằng bàn phím trong phiên mới và ghi lại giá trị hiển thị.
41. Nhập `1.250,75` bằng bàn phím và ghi lại giá trị hiển thị.
42. Lưu, mở lại tệp nhập thử và kiểm XML XLSX cùng giá trị đọc được.

## Kết quả

- Regression trước sửa: **FAIL** — unit `3/4`, test mới “chèn sparkline qua lệnh đánh dấu bảng tính cần lưu” fail; CDP `26/27`, sparkline mất sau XLSX reopen.
- Sau sửa: adapter đặt `isDirty` khi lệnh chèn sparkline thành công; unit focused **PASS 4/4**. CDP cuối **PASS 29/29**; XLSX ledger có 1 table, 2 chart parts, 2 validation rules, 1 conditional formatting rule, freeze pane, protection và 4 sparkline records. Workbook payroll có PivotTable, print titles, số trang và freeze pane.
- **Phát hiện chart cần phiếu sửa riêng:** kiểm XML đầu ra ledger cho thấy biểu đồ đầu chỉ có `barChart` với một trục giá trị (không còn chuỗi đường/trục phụ); biểu đồ tròn có `showPercent=0`. Cả hai khác với cấu hình fixture combo + secondary axis và phần trăm. Không sửa trong Q29 để giữ scope; ghi nhận là FAIL về độ trung thực chart nâng cao, cần regression CDP riêng trước/sau khi sửa.
- `npm test`: **PASS 3,781/3,781**. `node tests/run-tests.js`: **PASS 3,781/3,781**. `node scripts/audit-0610/i18n_parity.mjs`: **PASS 0 missing** (VI 3,122 / EN 3,122). `verify_checklist_evidence.py --all --no-fix`: **PASS 0 lowered** (279 / 217 / 269 dòng); cả ba generator chạy, không đổi checklist sinh ra.
- `pytest tests -q -k "sheet or xlsx or ooxml or formula"`: **PASS 367, 746 deselected**.
- Excel COM: **BLOCKED** theo chỉ dẫn hàng đợi. LAN batch audit: **BLOCKED** — script `batch_document_audit.py` không có trong worktree; bản lưu trữ được tìm thấy tự gọi `_excel_open_test.ps1`, nên không chạy để tránh gọi Excel COM. Đối chiếu thay thế có CDP/LibreOffice round-trip cho hai workbook Q29; không chạy batch 27 tệp.
- Đầu vào `1.250` được đọc thành `1.25`; `1.250,75` vẫn là chuỗi trên máy `en-GB`. Chỉ ghi nhận hành vi quan sát được, không đổi logic nhập.
- Quan sát locale trong CDP: `1.250` được đọc là `1.25`; `1.250,75` vẫn là chuỗi. Đây là quan sát trên máy `en-GB`, không thay đổi hành vi nhập.
- Dữ liệu thuế trong workbook là minh họa tổng hợp, không phải tư vấn hay hồ sơ lương thật.
