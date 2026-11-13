# Báo cáo: tăng tốc lưu tệp lớn (nén song song + CRC32 nhanh) — 13/11

## Vấn đề
Sửa một ô trên XLSX lớn rồi lưu vẫn chậm. Đo từng pha (XLSX tổng hợp 9,7 MB, sheet 23,3 MB giải nén, Linux x86 4 lõi, đường `save-patch`): mở 0,22 s, vá 0,40 s, **lưu truyền phát 1,34 s**. Trong lưu truyền phát, ~0,67 s là nén lại sheet đã sửa (nén `fast` tuần tự 0,32 s + CRC32 tra bảng từng byte + sao chép), kiểm lại ~0,18 s.

## Thay đổi (OOXMLZip, không ảnh hưởng API)
1. **Nén song song kiểu pigz** (`Deflate.compressParallel`, dùng cho phần ≥ 4 MiB): chia khối cố định 1 MiB (không phụ thuộc số lõi nên kết quả tất định), nén độc lập, nối bằng khối stored rỗng để căn byte; chỉ khối cuối đánh dấu BFINAL. Luồng DEFLATE hợp lệ, mọi bộ giải nén đọc được. Đổi lại kích thước nén lớn hơn nhẹ (test chặn ≤ 10%).
2. **CRC32 slicing-by-8**: 8 byte mỗi vòng, kết quả giống hệt bảng tra từng byte (test so với bản tham chiếu ở nhiều độ dài/độ lệch và cộng dồn nhiều lần gọi).

## Số đo (qua `ooxml-bench` và `ooxml-engine`, 3 lần chạy, cùng máy, cùng tệp)
| Pha | Trước | Sau |
|---|---|---|
| lưu truyền phát (`saveStream`) | 1,34 s | **0,48–0,50 s** |
| `save-patch` tổng (mở+vá+lưu) | 1,97 s | **0,88–0,93 s** |
| `xlsx.save` delta giá trị qua engine (đường `patch`) | 2,1–2,8 s | **1,03–1,11 s**, RAM đỉnh 165 MB |

Kiểm chéo: tệp kết quả mở bằng `zipfile` của Python (zlib độc lập), `testzip()` không lỗi; 649/649 test đạt từ build sạch.

## Giới hạn trung thực
- Chỉ đo trên Linux 4 lõi, tệp tổng hợp. Máy ít lõi (điện thoại cũ) được lợi ít hơn; không đo trên thiết bị thật.
- Đường DOM (xóa ô, thao tác cấu trúc, công thức chia sẻ) vẫn ~20 s/1 GB RAM, chưa được cải thiện bởi thay đổi này (nó nén nhiều nhưng thời gian chủ yếu là dựng DOM).
- Sau thay đổi, ~0,3 s còn lại là vá, ~0,1 s mở, ~0,5 s lưu (nén sheet là phần chính). Bước tiếp theo khả dĩ: chỉ nén lại các khối chứa hàng đã sửa (cần giữ ranh giới khối), chưa làm.
