# Báo cáo: kiểm an toàn dữ liệu của các đường vá (14/11)

Các đường vá (`SheetPatcher`, `xlsx.save` nhanh) ghi thẳng byte của sheet nên lỗi ở đó là hỏng tệp của người dùng — nặng hơn chậm. Thêm hai lớp kiểm độc lập với tốc độ.

## 1. So sánh ngẫu nhiên đường vá với đường DOM (`SheetPatcherDifferentialTests`)
Cùng một chuỗi 1–6 thao tác ngẫu nhiên (ghi số/chuỗi/bool/lỗi/trống, ghi công thức, đặt định dạng, xóa vùng; ô lấy 70% từ ô có sẵn kể cả ô công thức, 30% ô mới ngoài vùng dùng) áp bằng `SheetPatcher` và bằng `Worksheet` (đường DOM), rồi so từng ô sau khi lưu và mở lại (địa chỉ, giá trị, công thức đã bung, định dạng). Hạt giống tất định (tái lập được). Đường DOM từ chối mà đường vá nhận ⇒ FAIL.
- CI: 25 vòng/sheet (~6 s). Chạy sâu ở máy dev: `OOXMLKIT_FUZZ_ITERATIONS=1500` → **~28.000 chuỗi trên 12 fixture, 0 lệch** (349 s). Lần chạy 200 vòng: 3.754 chuỗi được so, 246 bị đường vá từ chối (rơi về DOM đúng thiết kế), 0 lệch, 0 trường hợp DOM từ chối mà vá nhận.

## 2. Kiểm chéo bằng bộ đọc độc lập (`scripts/crosscheck_xlsx_save.py`)
Chạy `xlsx.save` thật qua `ooxml-engine` với delta ngẫu nhiên rồi mở kết quả bằng **openpyxl** (kiểm giá trị/công thức, vùng xóa trống), `zipfile.testzip()`, và **LibreOffice headless** (chuyển CSV).
- Kết quả: **63 lần lưu (12 fixture + XLSX tổng hợp 1 MB), 0 lỗi**; LibreOffice mở và chuyển được cả 63.
- Loại trừ có lý do: `strict.xlsx` (OOXML Strict — openpyxl đọc ô ra rỗng ngay cả ở tệp nguồn), `office-quirks.xlsx` (openpyxl không mở được nguồn); ô không phải ô đầu của vùng gộp (openpyxl không trả giá trị).

## Giới hạn
- Hai bộ kiểm chạy trên fixture của kho và tệp tổng hợp; chưa chạy trên tệp thật của người dùng (36 tệp, thứ Hai 16/11).
- Chưa kiểm bằng Microsoft Excel (cần #11). Bộ đọc độc lập là openpyxl và LibreOffice, không phải Excel.
- Bộ so sánh ngẫu nhiên kiểm SheetPatcher ở mức thư viện; đường `xlsx.save` thêm bước kiểm lại riêng (đã có test).
