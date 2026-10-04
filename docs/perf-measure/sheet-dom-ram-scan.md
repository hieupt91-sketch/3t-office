# Quét DOM/RAM khi chuyển qua từng sheet (04/10/2026)

Phương pháp: mở từng tệp LAN bằng ứng dụng Sheet thật (CDP), đợi nạp xong, rồi bấm lần lượt từng nhãn sheet (tối đa 30). Sau mỗi bước ghi số phần tử DOM (`document.getElementsByTagName('*').length`) và RAM lớn nhất của tiến trình WebView2. Công cụ: `_probe_scan.mjs` (Claude). Số liệu thô: `sheet-dom-ram-scan.raw.jsonl` (mỗi dòng một phép đo). Chạy lúc máy có tải do agent khác nên RAM mang tính chỉ báo.

Phạm vi: lan01–lan28 trừ lan06 và lan14 (đo riêng vì mở rất lâu).

Kết quả: **243 phép đo, 26 tệp, 0 lỗi, 0 ngoại lệ** (ngưỡng ngoại lệ: > 20.000 phần tử DOM hoặc RAM > 2,5 GB).

| Chỉ số | Giá trị lớn nhất |
|---|---|
| DOM | 4.054 (lan11, mở và sheet Reyee) |
| RAM tiến trình WebView2 | 1.100 MB (lan16, sheet Camera IP) |

Kết luận: lỗi bùng nổ DOM khi chuyển sheet (680.000 phần tử, RAM 4,8 GB) chỉ xảy ra ở lan14, do dùng lại cửa sổ dựng của sheet trước khi sheet trước có hàng chục nghìn dòng ẩn; đã sửa (`switchSheet`, có test hồi quy). Không thấy trường hợp tương tự ở 26 tệp còn lại.

Việc còn lại: đo lan06 theo cùng cách khi máy yên.
