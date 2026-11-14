# Báo cáo: độ co giãn tới tệp 38 MB và bớt một lần kiểm gói thừa (14/11)

## Đo độ co giãn (Linux x86 4 lõi, XLSX tổng hợp, qua `ooxml-engine` và `ooxml-bench`)
Tệp tổng hợp 37,8 MB nén (sheet 89 MB XML, 104.501×4 hàng) so với tệp 9,7 MB (sheet 22 MB XML), gấp ~4 lần dữ liệu:
| | 9,7 MB | 37,8 MB | Tỉ lệ |
|---|---|---|---|
| màn hình đầu (open lazy + 100 hàng) | 0,31 s | 1,10 s | 3,5× |
| cuộn tới giữa tệp | 0,32 s | 1,15 s | 3,6× |
| lưu 1 ô (`xlsx.save`, `path=patch`) | 1,8 s (lần đo này; 1,0–1,3 s lần trước) | 7,8 s | ~4× |
| RAM đỉnh khi lưu | 173 MB | 557 MB | 3,2× |
Tăng gần tuyến tính, không có điểm gãy. (Tệp thật lớn nhất trong bộ 36 tệp là `lan06` 11 MB nén; chưa biết cỡ XML của nó.)

## Phân rã `save-patch` ở 38 MB (trước khi sửa)
mở 0,6 s; vá 2,1 s (dựng chỉ mục hàng 0,68 + quét công thức mảng 0,42 + ghép byte ~1,0); lưu truyền phát 3,35 s = baseline lỗi nguồn 0,92 + nén/CRC 1,37 + kiểm kết quả 0,96.

## Sửa
Baseline lỗi sẵn có của NGUỒN (kiểm gói nguồn, giải nén mọi phần) nay tính LƯỜI: chỉ khi kết quả có lỗi cần lọc. Trường hợp thường gặp (kết quả sạch) bỏ qua hẳn. Kết quả kiểm giữ nguyên: nguồn có lỗi sẵn vẫn lưu được, lỗi mới vẫn chặn ghi.

| `save-patch` | Trước | Sau |
|---|---|---|
| lưu truyền phát, 38 MB | 3,35 s | 2,25 s |
| tổng, 38 MB | 6,1 s | 5,1 s |
| 9,7 MB | ~1,12 s | ~1,12 s (không đổi đáng kể) |

## Kiểm chứng
`swift test -c release` từ build sạch: 675/675; thêm `testStreamingSaveFiltersSourceIssuesLazilyAndStillRejectsNewOnes` (gói mở lười với nguồn có lỗi sẵn: lưu được và giữ nguyên lỗi; thêm lỗi mới: bị chặn, tệp đích giữ nguyên).

## Còn lại / giới hạn
- 38 MB vẫn ~5 s và 557 MB: vá 2,1 s (chỉ mục hàng + quét mảng + ghép), nén+CRC 1,4 s, kiểm kết quả ~1,0 s (giải nén lại phần đã ghi để bắt lỗi ghi — giữ vì đường nén song song mới).
- Số đo Linux, tệp tổng hợp. Tệp thật khác (chuỗi dùng chung nhiều, nhiều sheet) — đo thứ Hai 16/11.

## Cập nhật: quét byte bằng `memchr`/`memmem`
Dựng chỉ mục hàng (`SheetRowReader`) và quét công thức mảng dùng vòng lặp từng byte, dừng ở mọi ký tự `<` (XML dày thẻ): ~140 MB/s. Thay `indexOf`/`find` bằng `memchr`/`memmem` của thư viện C (Darwin/Glibc); nền tảng khác (ví dụ Windows) giữ vòng lặp cũ. Kết quả giống hệt (676/676 test từ build sạch; so sánh ngẫu nhiên 150 vòng/sheet: 2.815 chuỗi, 0 lệch).
| | Trước | Sau |
|---|---|---|
| dựng chỉ mục hàng, 38 MB | 0,68 s | 0,47 s |
| dựng chỉ mục hàng, 9,7 MB | ~0,12 s | ~0,12 s |
| `save-patch` tổng, 38 MB | 5,1 s | 4,2 s |
| `xlsx.save` qua engine, 38 MB | ~7,8 s (lần đo trước) | 6,5 s |
Phần còn lại của chỉ mục là vòng lặp theo hàng (tìm hết thẻ, đọc số hàng, thêm vào mảng; 407.365 hàng ở 38 MB). Chưa chạy Windows (dùng vòng lặp dự phòng, chưa đo).
