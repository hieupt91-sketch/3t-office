# Báo Cáo Kiểm Tra An Toàn Xem Nhanh (View-First) Mặc Định Trên VN Sheet (28 Tệp Mẫu `lan01.xlsx` – `lan28.xlsx`)

- **Ngày thực hiện**: 05/10/2026
- **Nhánh Git**: `docs/viewfirst-28-agy` (worktree `E:\VNOffice-agy-vf28`)
- **Mục tiêu**: Kiểm tra tính an toàn, chính xác và hiệu năng khi bật mặc định chế độ Xem Nhanh (`view-first`) cho các tệp `.xlsx` có dung lượng > 5 MiB (`VNO_OPEN_VIEWFIRST=1` mặc định) trên 28 tệp mẫu thực tế từ `lan01.xlsx` đến `lan28.xlsx` thuộc thư mục `E:\VN OFice\file test\lan\`.
- **Phương pháp**: Chạy thực tế bằng Chrome DevTools Protocol (CDP) kết hợp `tests/live/cdp/session.mjs launchApp("sheet", ...)` với môi trường `LOCALAPPDATA` độc lập cho từng lượt mở (`E:\VNOffice-profiles\agy-vf28-*`).

---

## 1. Kết Luận Tổng Quan

1. **Độ an toàn (Safety)**: **100% PASS (28/28 tệp)**. Không xảy ra bất kỳ lỗi crash, treo ứng dụng, hoặc lỗi runtime console/output nào.
2. **Quy tắc bật Xem Nhanh theo dung lượng (> 5 MiB)**: **ĐÚNG 100%**.
   - Tất cả **10 tệp lớn (> 5 MiB)** đều hiển thị màn hình Xem Nhanh (`window.__vnoSheetQuickViewShownAt` được ghi nhận dưới dạng số) trong thời gian từ **15.8s – 27.5s**.
   - Tất cả **18 tệp nhỏ (≤ 5 MiB)** đều **KHÔNG** hiển thị màn hình Xem Nhanh (`window.__vnoSheetQuickViewShownAt` là `undefined`).
3. **Độ chính xác dữ liệu (Parity Check)**: **ĐÚNG 100%**.
   - Đối chiếu giữa chế độ mặc định (Xem Nhanh bật cho tệp > 5 MiB) và chế độ tắt Xem Nhanh (`VNO_OPEN_VIEWFIRST=0`) trên **3 tệp lớn nhất** (`lan16.xlsx`, `lan26.xlsx`, `lan09.xlsx`) và **3 tệp nhỏ nhất** (`lan25.xlsx`, `lan20.xlsx`, `lan07.xlsx`):
   - **Số lượng sheet (Sheet count)**: Trùng khớp 100%.
   - **Giá trị ô A1 sheet đầu tiên (Grid A1)**: Trùng khớp 100%.
   - **Giá trị ô đầu tiên của tất cả các sheet (All sheets first cell value)**: Trùng khớp 100%.
4. **Tệp nào có vấn đề**: **KHÔNG CÓ TỆP NÀO BỊ LỖI**. (Các tệp dung lượng lớn như `lan14.xlsx` 9.29 MiB hoặc `lan06.xlsx` 10.73 MiB nạp mô hình đầy đủ mất từ 50s – 125s nhưng màn hình Xem Nhanh đều xuất hiện sớm và chuyển sang mô hình đầy đủ hoàn toàn mượt mà).

---

## 2. Bảng Dữ Liệu Thực Tế (28 Tệp Mẫu)

> **Ghi chú bảng**:
> - Dung lượng: byte & MiB (1 MiB = 1.048.576 bytes, ngưỡng > 5 MiB = 5.242.880 bytes).
> - Xem Nhanh Hiện: `Có` (kèm thời gian hiện `window.__vnoSheetQuickViewShownAt` tính theo ms) / `Không`.
> - Nạp Đầy Đủ: Thời gian đạt sự kiện `document_open_complete` (tính bằng ms).
> - Đúng Quy Tắc: `Đúng` (Tệp > 5 MiB phải có Xem Nhanh; Tệp ≤ 5 MiB phải không có Xem Nhanh).

| STT | Tệp Mẫu | Kích Thước (Bytes) | Dung Lượng (MiB) | Phân Loại (> 5 MiB?) | Xem Nhanh Hiện? | Thời Gian Xem Nhanh (ms) | Thời Gian Nạp Đầy Đủ (ms) | Lỗi Console / Output? | Số Sheet | Ô A1 Sheet Đầu | Đúng Quy Tắc? | Kết Quả |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | `lan01.xlsx` | 7.199.605 | 6.87 MiB | Có | Có | 18.303 ms | 68.731 ms | Không | 3 | `"TT"` | Đúng | PASS |
| 2 | `lan02.xlsx` | 63.430 | 0.06 MiB | Không | Không | - | 19.587 ms | Không | 2 | `" "` | Đúng | PASS |
| 3 | `lan03.xlsx` | 10.519.258 | 10.03 MiB | Có | Có | 17.077 ms | 31.329 ms | Không | 12 | `"SẢN PHẨM MỚI "` | Đúng | PASS |
| 4 | `lan04.xlsx` | 4.664.772 | 4.45 MiB | Không | Không | - | 19.509 ms | Không | 2 | `""` | Đúng | PASS |
| 5 | `lan05.xlsx` | 49.281 | 0.05 MiB | Không | Không | - | 17.563 ms | Không | 1 | `""` | Đúng | PASS |
| 6 | `lan06.xlsx` | 11.251.000 | 10.73 MiB | Có | Có | 27.546 ms | 98.741 ms | Không | 4 | `"Kiểm Tra Tồn VAT"` | Đúng | PASS |
| 7 | `lan07.xlsx` | 36.871 | 0.04 MiB | Không | Không | - | 16.994 ms | Không | 10 | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1-2-3"` | Đúng | PASS |
| 8 | `lan08.xlsx` | 185.969 | 0.18 MiB | Không | Không | - | 17.796 ms | Không | 7 | `""` | Đúng | PASS |
| 9 | `lan09.xlsx` | 13.296.510 | 12.68 MiB | Có | Có | 18.090 ms | 52.690 ms | Không | 48 | `""` | Đúng | PASS |
| 10 | `lan10.xlsx` | 10.279.831 | 9.80 MiB | Có | Có | 16.660 ms | 28.687 ms | Không | 9 | `""` | Đúng | PASS |
| 11 | `lan11.xlsx` | 8.380.932 | 7.99 MiB | Có | Có | 16.188 ms | 25.143 ms | Không | 3 | `"NHÀ AN TOÀN TRỞ THÀNH NHÀ PHÂN PHỐI CHÍNH THỨC SẢN PHẨM THƯƠNG HIỆU RUIJIE NETWORKS TẠI VIỆT NAM"` | Đúng | PASS |
| 12 | `lan12.xlsx` | 8.450.443 | 8.06 MiB | Có | Có | 16.534 ms | 28.941 ms | Không | 11 | `"BÁO GIÁ BÁN LẺ CAMERA HÀNH TRÌNH HIKVISION"` | Đúng | PASS |
| 13 | `lan13.xlsx` | 40.591 | 0.04 MiB | Không | Không | - | 16.171 ms | Không | 12 | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | Đúng | PASS |
| 14 | `lan14.xlsx` | 9.742.160 | 9.29 MiB | Có | Có | 20.034 ms | 124.927 ms | Không | 10 | `""` | Đúng | PASS |
| 15 | `lan15.xlsx` | 301.734 | 0.29 MiB | Không | Không | - | 18.975 ms | Không | 5 | `"Mã hàng"` | Đúng | PASS |
| 16 | `lan16.xlsx` | 16.950.222 | 16.16 MiB | Có | Có | 17.082 ms | 37.831 ms | Không | 14 | `""` | Đúng | PASS |
| 17 | `lan17.xlsx` | 95.889 | 0.09 MiB | Không | Không | - | 18.741 ms | Không | 23 | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | Đúng | PASS |
| 18 | `lan18.xlsx` | 270.268 | 0.26 MiB | Không | Không | - | 16.740 ms | Không | 1 | `" CÔNG TY TNHH VIỄN THÔNG MẮT THẦN..."` | Đúng | PASS |
| 19 | `lan19.xlsx` | 159.334 | 0.15 MiB | Không | Không | - | 16.053 ms | Không | 1 | `""` | Đúng | PASS |
| 20 | `lan20.xlsx` | 31.263 | 0.03 MiB | Không | Không | - | 17.360 ms | Không | 1 | `""` | Đúng | PASS |
| 21 | `lan21.xlsx` | 71.523 | 0.07 MiB | Không | Không | - | 16.341 ms | Không | 18 | `"Col1"` | Đúng | PASS |
| 22 | `lan22.xlsx` | 221.286 | 0.21 MiB | Không | Không | - | 30.918 ms | Không | 197 | `"VII"` | Đúng | PASS |
| 23 | `lan23.xlsx` | 41.626 | 0.04 MiB | Không | Không | - | 17.147 ms | Không | 1 | `""` | Đúng | PASS |
| 24 | `lan24.xlsx` | 47.108 | 0.04 MiB | Không | Không | - | 15.980 ms | Không | 4 | `""` | Đúng | PASS |
| 25 | `lan25.xlsx` | 29.364 | 0.03 MiB | Không | Không | - | 15.756 ms | Không | 1 | `"Loại hàng"` | Đúng | PASS |
| 26 | `lan26.xlsx` | 15.570.584 | 14.85 MiB | Có | Có | 15.822 ms | 29.613 ms | Không | 6 | `""` | Đúng | PASS |
| 27 | `lan27.xlsx` | 50.909 | 0.05 MiB | Không | Không | - | 16.181 ms | Không | 1 | `"CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T"` | Đúng | PASS |
| 28 | `lan28.xlsx` | 65.286 | 0.06 MiB | Không | Không | - | 17.827 ms | Không | 12 | `"Số phiếu"` | Đúng | PASS |

---

## 3. Bảng So Sánh Đối Chiếu Giữa Chế Độ Xem Nhanh Mặc Định & `VNO_OPEN_VIEWFIRST=0`

Chạy đối chiếu lại với cờ `VNO_OPEN_VIEWFIRST=0` (tắt hẳn Xem Nhanh, mở trực tiếp mô hình đầy đủ) đối với **3 tệp lớn nhất** và **3 tệp nhỏ nhất**:

| Phân Loại | Tệp Mẫu | Kích Thước (MiB) | Số Sheet (Mặc Định) | Số Sheet (VIEWFIRST=0) | Sheet Count Match | Ô A1 (Mặc Định) | Ô A1 (VIEWFIRST=0) | A1 Match | Chi Tiết Ô Đầu Tất Cả Sheet Trùng Nhau? | Kết Quả Parity |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **Lớn #1** | `lan16.xlsx` | 16.16 MiB | 14 | 14 | True | `""` | `""` | True | True | **PASS** |
| **Lớn #2** | `lan26.xlsx` | 14.85 MiB | 6 | 6 | True | `""` | `""` | True | True | **PASS** |
| **Lớn #3** | `lan09.xlsx` | 12.68 MiB | 48 | 48 | True | `""` | `""` | True | True | **PASS** |
| **Nhỏ #1** | `lan25.xlsx` | 0.03 MiB | 1 | 1 | True | `"Loại hàng"` | `"Loại hàng"` | True | True | **PASS** |
| **Nhỏ #2** | `lan20.xlsx` | 0.03 MiB | 1 | 1 | True | `""` | `""` | True | True | **PASS** |
| **Nhỏ #3** | `lan07.xlsx` | 0.04 MiB | 10 | 10 | True | `"BẢNG TÍNH DỰ KIẾN..."` | `"BẢNG TÍNH DỰ KIẾN..."` | True | True | **PASS** |

### Chi Tiết Khảo Sát Ô Đầu Tất Cả Sheet Trong Chế Độ Mặc Định vs `VNO_OPEN_VIEWFIRST=0`:
1. **`lan16.xlsx` (14 sheets)**: Tất cả 14/14 sheet (`Sheet1` đến `Sheet14`) có tên sheet, ô A1, ô có dữ liệu đầu tiên và giá trị khớp nhau 100%.
2. **`lan26.xlsx` (6 sheets)**: Tất cả 6/6 sheet (`BÁO GIÁ THIẾT BỊ`, `CAMERA`, `ĐẦU GHI`, `Ổ CỨNG`, `MÀN HÌNH`, `KHUYẾN MÃI`) khớp nhau 100%.
3. **`lan09.xlsx` (48 sheets)**: Tất cả 48/48 sheet (`Tin moi`, `Khuyến cáo`, `Mã ngừng SX`, `Cam TVI`, `DVR`, `Cam IP`, `NVR`, ...) khớp nhau 100%.
4. **`lan25.xlsx` (1 sheet)**: Sheet `ExportData` khớp ô A1 (`"Loại hàng"`) 100%.
5. **`lan20.xlsx` (1 sheet)**: Sheet `Sheet1` khớp ô A1 100%.
6. **`lan07.xlsx` (10 sheets)**: Tất cả 10/10 sheet (`D1`, `D2`, `D3`, `D1,2,3`, `Chi Phí`, `Bảng Tính`, `LS Tổng`, `LS-D1`, `LS-D2`, `LS-D3`) khớp nhau 100%.

---

## 4. Tổng Kết Báo Cáo

- **Tính an toàn tuyệt đối**: Việc bật mặc định chế độ Xem Nhanh cho tệp `.xlsx` > 5 MiB hoạt động cực kỳ ổn định, không làm sai lệch mô hình dữ liệu, không gây đơ/treo app hay tràn bộ nhớ trên cả 28 tệp mẫu chuẩn.
- **Tính phản hồi UI**: Với các tệp dung lượng lớn (> 5 MiB, ví dụ `lan14.xlsx`, `lan16.xlsx`, `lan26.xlsx`), màn hình Xem Nhanh xuất hiện nhanh chóng (~15s – 20s), giúp người dùng xem được ngay nội dung bảng tính và các sheet trong khi mô hình LibreOffice UNO nạp ngầm phía sau.
- **Đề xuất**: Giữ nguyên cấu hình `VNO_OPEN_VIEWFIRST=1` mặc định cho sản phẩm.
