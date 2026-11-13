# Báo cáo: engine công thức tính lại theo cấp bình phương → gần tuyến tính (13/11)

## Phát hiện
Đo bằng chế độ mới `ooxml-bench formula-scale <số dòng> window|chain` (cột A hằng, B = A*2, C = SUM trượt 10 dòng hoặc cộng dồn, D1 = SUM(B1:BN)). Thời gian tính lại **tăng theo bình phương** số công thức:

| Số dòng (công thức ≈ 2–3 × số dòng) | Trước | Sau |
|---|---|---|
| 1.000 | 0,04 s | — |
| 5.000 | 1,09 s | 0,11 s |
| 20.000 | **18,3 s** | **0,59 s** |
| 100.000 | **~270 s** (4,5 phút) | **3,1 s**, RAM đỉnh 355 MB |
| 50.000 (chuỗi cộng dồn) | — | 1,0 s |

Sửa một ô rồi tính lại cũng mất đúng bằng một lần tính đầy đủ (engine chưa có tính lại tăng dần), nên mọi lần sửa ô trên sheet công thức lớn đều chịu độ trễ này nếu dùng engine để tính.

## Nguyên nhân (hai chỗ cùng một kiểu lỗi)
1. Dựng cạnh phụ thuộc: với mỗi công thức, quét **mọi** ô công thức của sheet để xem ô nào nằm trong vùng tham chiếu.
2. Đọc giá trị vùng (`nonEmptyValues`, dùng bởi SUM/COUNT/…): với mỗi lần đọc, quét **mọi** ô của sheet.

## Sửa
Chỉ mục (sheet → cột → danh sách hàng đã sắp xếp), tìm nhị phân đầu vùng, duyệt tới cuối vùng. Chỉ mục đầu vào dựng lười, hủy mỗi khi đầu vào đổi (`didSet`). Thứ tự kết quả giữ như cũ (sắp theo ô). Không đổi API.

## Kiểm chứng
- `swift test -c release` từ build sạch: 656/656 (có 2 test mới `FormulaEngineScaleTests`: so với giá trị tính tay trên ô thưa/nhiều cột/liên sheet/phụ thuộc vào ô công thức, theo dõi sửa-xóa-thêm đầu vào, vòng tham chiếu vẫn phát hiện).
- `run_oracle.py --strict`: 478/478 ca so được vẫn khớp, 0 lệch (cùng kết quả trước và sau).
- Kết quả D1 của `formula-scale` trước và sau giống hệt.

## Giới hạn và việc tiếp
- Chỉ đo Linux x86, dữ liệu tổng hợp. Sheet thật có công thức tham chiếu cả cột (`A:A`) hoặc nhiều sheet chưa đo.
- Vẫn tính lại toàn bộ sau mỗi sửa (100.000 dòng ≈ 3 s). Bước tiếp: tính lại tăng dần (chỉ các ô phụ thuộc bắc cầu vào ô vừa đổi) để sửa một ô còn mili-giây.
- **Hiện chưa có nơi nào dùng `recalculate()` ngoài bench và test:** bridge/`ooxml-engine` chưa có lệnh tính công thức (giá trị đệm của công thức do phía giao diện cung cấp qua `cached` khi lưu). Sửa này là nền cho lúc app chuyển phần tính công thức sang engine; không làm app nhanh hơn ngay hôm nay. Vì vậy chưa làm tính lại tăng dần (chưa có người dùng để xác nhận cách gọi).
