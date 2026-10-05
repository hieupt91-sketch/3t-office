# Báo Cáo Kiểm Tra Hồi Quy Mở 28 Tệp VN Sheet & 7 Tệp VN Writer (Sau Đợt Tối Ưu 05/10/2026)

- **Ngày thực hiện**: 05/10/2026
- **Nhánh Git**: `docs/open-regression-28-agy` (worktree `E:\VNOffice-agy-reg28`)
- **Mục tiêu**: Kiểm tra hồi quy khả năng mở tệp, tính chính xác dữ liệu (số sheet, ô A1) và đo thời gian mở (tới sự kiện `document_open_complete`) trên 28 tệp Sheet (`lan01.xlsx` – `lan28.xlsx`) và 7 tệp Word (`d01.docx`, `d04.docx`, `d06.docx`, `d09.docx`, `d12.docx`, `d24.docx`, `MYTIME.docx`) sau các đợt tối ưu mạnh ngày 05/10 (quét chuỗi, prefetch, pool 6 worker, nhường luồng JS bằng MessageChannel).
- **Cấu hình & Phương pháp**:
  - Chạy ứng dụng thật qua Chrome DevTools Protocol (CDP) sử dụng `tests/live/cdp/session.mjs launchApp`.
  - Cấu hình **mặc định hoàn toàn** (KHÔNG đặt bất kỳ biến môi trường nào như `VNO_OPEN_VIEWFIRST`).
  - Mỗi lượt thử dùng một thư mục `LOCALAPPDATA` riêng biệt (`E:\VNOffice-profiles\agy-reg28-*`).
  - Đợi sự kiện `document_open_complete` trong `window.__vnoStartupEvents`.
  - Đọc dữ liệu mô hình từ `window.__vnoAppInstance.adapter` và kiểm tra output/console xem có lỗi hay crash không.

---

## 1. Kết Luận Tổng Quan

1. **Tính an toàn tuyệt đối (Safety & Reliability)**: **100% PASS (35/35 tệp)**.
   - 28/28 tệp Sheet và 7/7 tệp Word mở thành công 100%.
   - Không có bất kỳ tệp nào bị crash, treo app hay sinh lỗi Python traceback / Javascript exception nào trong output console/stdout/stderr.

2. **Khớp dữ liệu mô hình VN Sheet (Parity Check với `viewfirst-default-28.md`)**: **100% MATCH**.
   - **Số lượng Sheet (Sheet Count)**: Trùng khớp **28/28 tệp (100%)**.
   - **Giá trị ô A1 của Sheet đầu tiên**: Trùng khớp **28/28 tệp (100%)**. (Lưu ý: tệp `lan18.xlsx` chuỗi hiển thị đầy đủ là toàn bộ văn bản nhiều dòng của ô A1; bảng cũ chỉ ghi dạng rút gọn hiển thị `" CÔNG TY TNHH VIỄN THÔNG MẮT THẦN..."`).

3. **Tệp nào có vấn đề hay lỗi**: **KHÔNG CÓ TỆP NÀO BỊ LỖI HOẶC BỊ HỒI QUY**.
   - Các tệp rất lớn như `lan14.xlsx` (9.29 MiB, 10 sheets) nạp hoàn tất đầy đủ mô hình trong **89.1 giây** (nằm trong ngưỡng an toàn < 10 phút).
   - Tệp `lan22.xlsx` có tới **197 sheets** mở mượt mà trong **30.8 giây**.
   - Tất cả 7 tệp Word mở nhanh chóng từ **17.9s đến 37.5s** (tệp lớn nhất `MYTIME.docx` 78 trang mở trong 37.5s).

---

## 2. Bảng Dữ Liệu Thực Tế: 28 Tệp VN Sheet (`lan01.xlsx` – `lan28.xlsx`)

| STT | Tệp Mẫu | Kích Thước (MiB) | Thời Gian Nạp Đầy Đủ (ms) | Số Sheet (Thực Tế) | Số Sheet (Bảng Cũ) | Match Sheet? | Giá Trị Ô A1 (Thực Tế) | Giá Trị Ô A1 (Bảng Cũ) | Match A1? | Lỗi Stderr/Console? | Kết Quả |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | `lan01.xlsx` | 6.87 MiB | 58.601 ms | 3 | 3 | True | `"TT"` | `"TT"` | True | Không | **PASS** |
| 2 | `lan02.xlsx` | 0.06 MiB | 22.954 ms | 2 | 2 | True | `" "` | `" "` | True | Không | **PASS** |
| 3 | `lan03.xlsx` | 10.03 MiB | 38.941 ms | 12 | 12 | True | `"SẢN PHẨM MỚI "` | `"SẢN PHẨM MỚI "` | True | Không | **PASS** |
| 4 | `lan04.xlsx` | 4.45 MiB | 25.240 ms | 2 | 2 | True | `""` | `""` | True | Không | **PASS** |
| 5 | `lan05.xlsx` | 0.05 MiB | 21.917 ms | 1 | 1 | True | `""` | `""` | True | Không | **PASS** |
| 6 | `lan06.xlsx` | 10.73 MiB | 82.160 ms | 4 | 4 | True | `"Kiểm Tra Tồn VAT"` | `"Kiểm Tra Tồn VAT"` | True | Không | **PASS** |
| 7 | `lan07.xlsx` | 0.04 MiB | 19.371 ms | 10 | 10 | True | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1-2-3"` | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1-2-3"` | True | Không | **PASS** |
| 8 | `lan08.xlsx` | 0.18 MiB | 19.084 ms | 7 | 7 | True | `""` | `""` | True | Không | **PASS** |
| 9 | `lan09.xlsx` | 12.68 MiB | 46.107 ms | 48 | 48 | True | `""` | `""` | True | Không | **PASS** |
| 10 | `lan10.xlsx` | 9.80 MiB | 28.645 ms | 9 | 9 | True | `""` | `""` | True | Không | **PASS** |
| 11 | `lan11.xlsx` | 7.99 MiB | 28.933 ms | 3 | 3 | True | `"NHÀ AN TOÀN TRỞ THÀNH NHÀ PHÂN PHỐI CHÍNH THỨC SẢN PHẨM THƯƠNG HIỆU RUIJIE NETWORKS TẠI VIỆT NAM"` | `"NHÀ AN TOÀN TRỞ THÀNH NHÀ PHÂN PHỐI CHÍNH THỨC SẢN PHẨM THƯƠNG HIỆU RUIJIE NETWORKS TẠI VIỆT NAM"` | True | Không | **PASS** |
| 12 | `lan12.xlsx` | 8.06 MiB | 30.235 ms | 11 | 11 | True | `"BÁO GIÁ BÁN LẺ CAMERA HÀNH TRÌNH HIKVISION"` | `"BÁO GIÁ BÁN LẺ CAMERA HÀNH TRÌNH HIKVISION"` | True | Không | **PASS** |
| 13 | `lan13.xlsx` | 0.04 MiB | 17.976 ms | 12 | 12 | True | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | True | Không | **PASS** |
| 14 | `lan14.xlsx` | 9.29 MiB | 89.135 ms | 10 | 10 | True | `""` | `""` | True | Không | **PASS** |
| 15 | `lan15.xlsx` | 0.29 MiB | 18.071 ms | 5 | 5 | True | `"Mã hàng"` | `"Mã hàng"` | True | Không | **PASS** |
| 16 | `lan16.xlsx` | 16.16 MiB | 34.170 ms | 14 | 14 | True | `""` | `""` | True | Không | **PASS** |
| 17 | `lan17.xlsx` | 0.09 MiB | 18.190 ms | 23 | 23 | True | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | `"BẢNG TÍNH DỰ KIẾN GÓP VỐN ĐƠN HÀNG CHO THUÊ MÁY TÍNH ĐỢT 1"` | True | Không | **PASS** |
| 18 | `lan18.xlsx` | 0.26 MiB | 16.851 ms | 1 | 1 | True | `"              CÔNG TY TNHH VIỄN THÔNG MẮT THẦN..."` *(chuỗi đầy đủ)* | `" CÔNG TY TNHH VIỄN THÔNG MẮT THẦN..."` | True | Không | **PASS** |
| 19 | `lan19.xlsx` | 0.15 MiB | 16.556 ms | 1 | 1 | True | `""` | `""` | True | Không | **PASS** |
| 20 | `lan20.xlsx` | 0.03 MiB | 17.487 ms | 1 | 1 | True | `""` | `""` | True | Không | **PASS** |
| 21 | `lan21.xlsx` | 0.07 MiB | 16.844 ms | 18 | 18 | True | `"Col1"` | `"Col1"` | True | Không | **PASS** |
| 22 | `lan22.xlsx` | 0.21 MiB | 30.886 ms | 197 | 197 | True | `"VII"` | `"VII"` | True | Không | **PASS** |
| 23 | `lan23.xlsx` | 0.04 MiB | 20.810 ms | 1 | 1 | True | `""` | `""` | True | Không | **PASS** |
| 24 | `lan24.xlsx` | 0.04 MiB | 19.154 ms | 4 | 4 | True | `""` | `""` | True | Không | **PASS** |
| 25 | `lan25.xlsx` | 0.03 MiB | 16.641 ms | 1 | 1 | True | `"Loại hàng"` | `"Loại hàng"` | True | Không | **PASS** |
| 26 | `lan26.xlsx` | 14.85 MiB | 27.897 ms | 6 | 6 | True | `""` | `""` | True | Không | **PASS** |
| 27 | `lan27.xlsx` | 0.05 MiB | 16.480 ms | 1 | 1 | True | `"CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T"` | `"CÔNG TY TNHH CÔNG NGHỆ THÔNG MINH 3T"` | True | Không | **PASS** |
| 28 | `lan28.xlsx` | 0.06 MiB | 18.156 ms | 12 | 12 | True | `"Số phiếu"` | `"Số phiếu"` | True | Không | **PASS** |

---

## 3. Bảng Dữ Liệu Thực Tế: 7 Tệp VN Writer (`.docx`)

| STT | Tệp Mẫu Word / Writer | Đường Dẫn Tệp | Thời Gian Nạp Đầy Đủ (ms) | Số Trang (`_livePageCount`) | Độ Dài Body (Ký tự) | Đầu Nội Dung Body (Sample) | Lỗi Stderr/Console? | Kết Quả |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | `d01.docx` | `E:\VN OFice\file test\landocx\d01.docx` | 18.643 ms | 19 trang | 39.010 | `"CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM..."` | Không | **PASS** |
| 2 | `d04.docx` | `E:\VN OFice\file test\landocx\d04.docx` | 17.917 ms | 5 trang | 10.803 | `"Hà Nội, ngày 24 tháng 09 năm 2023..."` | Không | **PASS** |
| 3 | `d06.docx` | `E:\VN OFice\file test\landocx\d06.docx` | 23.236 ms | 3 trang | 2.372 | `"BẢN VẼ HOÀN CÔNG GÓI LẮP ĐẶT HỆ THỐNG..."` | Không | **PASS** |
| 4 | `d09.docx` | `E:\VN OFice\file test\landocx\d09.docx` | 23.342 ms | 14 trang | 20.143 | `"ĐỀ CƯƠNG THỰC TẬP TỐT NGHIỆP..."` | Không | **PASS** |
| 5 | `d12.docx` | `E:\VN OFice\file test\landocx\d12.docx` | 18.730 ms | 3 trang | 3.326 | `"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM..."` | Không | **PASS** |
| 6 | `d24.docx` | `E:\VN OFice\file test\landocx\d24.docx` | 26.696 ms | 18 trang | 8.286 | `"GIỚI THIỆU SẢN PHẨM CATALOG..."` | Không | **PASS** |
| 7 | `MYTIME.docx` | `E:\VN OFice\file test\MYTIME.docx` | 37.551 ms | 78 trang | 20.224 | `"HƯỚNG DẪN SỬ DỤNG PHẦN MỀM CHẤM CÔNG MYTIME..."` | Không | **PASS** |

---

## 4. Đánh Giá & Tổng Kết Sau Tối Ưu

- **Không xảy ra sai lệch hay lỗi hồi quy**: Sau các nâng cấp tối ưu ngày 05/10 (quét chuỗi, prefetch, pool 6 worker, MessageChannel), toàn bộ 28 tệp Sheet và 7 tệp Word mở thành công 100%, bảo toàn hoàn toàn cấu trúc sheet và nội dung ô dữ liệu.
- **Thời gian phản hồi**: Thời gian đo bao gồm toàn bộ quá trình mở app thật qua CDP, khởi tạo giao diện và nạp mô hình đầy đủ đến khi phát sự kiện `document_open_complete`. Mọi tệp đều đạt trạng thái sẵn sàng ổn định.
