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

## 3. Kiểm chéo `docx.save` / `pptx.save` (`scripts/crosscheck_docx_pptx_save.py`)
Sau khi đổi cách kiểm chứng của hai đường lưu này (lưu truyền phát + kiểm nhẹ, nhớ danh sách đoạn/slide — #43, #44), thêm kiểm chéo bằng bộ đọc ĐỘC LẬP. Mô hình mong đợi tính bằng Python (không dùng thư viện Swift để tự chấm); kết quả mở bằng python-docx / python-pptx, và LibreOffice chuyển PDF.
- DOCX: setText, replaceText, insert, delete, append (chỉ số theo trạng thái hiện tại như `docx.save`) → so toàn bộ văn bản các đoạn thân.
- PPTX: `slide.setTitle` (tiêu đề theo loại placeholder), `shape.rename`.
- Kết quả: **100 lần lưu, 0 lỗi** trên các fixture `docx/`, `pptx/` và `real/`, LibreOffice mở và chuyển PDF cả 100.
- Bỏ qua có lý do: `rich-word.docx`, `sample-writer(-tables).docx` (engine đếm cả đoạn trong bảng, python-docx chỉ đếm đoạn thân: khác cách đếm, không so được), `sample-slides-comments.pptx` (không sinh được thao tác hợp lệ).
- Ghi nhận ngữ nghĩa có sẵn (không đổi): `docx.save` kiểm mọi chỉ số theo số đoạn của tệp GỐC trước khi áp, trong khi từng thao tác áp theo trạng thái hiện tại; `pptx.save` gọi shape theo tên nên shape tên rỗng không nhắm tới được. Bên gọi cần biết hai điều này khi sinh delta.
- Giới hạn: chưa có tệp DOCX/PPTX thật của người dùng; chưa kiểm bằng Word/PowerPoint thật; PPTX chưa kiểm `slide.add/delete` và ghi chú (cần notes master).
