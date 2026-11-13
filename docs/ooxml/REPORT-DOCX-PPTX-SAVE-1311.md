# Báo cáo: lưu delta DOCX và PPTX trên tệp lớn (13/11)

Hai đường `docx.save` / `pptx.save` chưa từng được đo trên tệp lớn (mới tối ưu cho XLSX). Đo bằng tệp tổng hợp (Linux x86 4 lõi, qua `ooxml-engine`, 1 lần/ca; chưa lặp 3 lần).

## Phát hiện và sửa
| Ca | Trước | Sau |
|---|---|---|
| PPTX 400 slide (430 KB, 40 hình/slide), 1 thao tác | **36,1 s** | **2,06 s** |
| PPTX, 20 thao tác | 39,7 s | 2,02 s |
| DOCX 20.000 đoạn, 1 thao tác | 2,0 s / 129 MB | 1,29 s / 124 MB |
| DOCX 20.000 đoạn, 50 thao tác | 4,8 s | 1,21 s |
| DOCX 120.000 đoạn (28 MB XML), 1 thao tác | 11,3 s / 621 MB | 7,4 s / 621 MB |
| DOCX 120.000 đoạn, 50 thao tác | (chưa đo, ước tính > 20 s) | 8,1 s |

Nguyên nhân PPTX: `Presentation.slides` dựng lại mọi `Slide` mỗi lần gọi; bước kiểm lại sau lưu gọi `reopened.slides[index]` trong vòng lặp qua mọi slide ⇒ bình phương. Lấy danh sách một lần.

Nguyên nhân DOCX: (1) `document.paragraphs` dựng lại cả danh sách mỗi thao tác (O(số đoạn) × số thao tác); (2) văn bản thân tài liệu bị tính hai lần khi kiểm lại (`paragraphs` rồi `allStories` đã chứa thân); (3) lưu bằng kiểm chứng đầy đủ rồi mở lại parse lần nữa. Sửa: dùng lại danh sách đoạn giữa các thao tác không đổi cấu trúc (dựng lại sau insert/delete/append, chỉ số vẫn theo trạng thái hiện tại), bỏ thân khỏi so sánh `allStories`, lưu truyền phát với kiểm chứng nhẹ (phần `document.xml` đã sửa vẫn được parse đầy đủ ở bước mở lại và so văn bản từng đoạn).

## Kiểm chứng
- `swift test -c release` từ build sạch: 669/669; thêm `testDocxSaveDeltaSequentialStructuralOpsMatchDirectApplication` (chuỗi setText/insert/append/delete/setText so với việc áp trực tiếp bằng thư viện — chỉ số theo trạng thái hiện tại).
- Các test lưu DOCX/PPTX có sẵn đều đạt, kể cả giữ nguyên byte phần không đổi.

## Giới hạn / còn lại
- DOCX 120.000 đoạn (~2.400 trang) vẫn 7,4 s và 621 MB: còn mở (1,6 s) + mở lại (1,6 s) + trích văn bản hai lần + tuần tự hóa. Muốn xuống dưới 1 s cần đường vá byte cho `document.xml` như `SheetPatcher` (chưa làm). Tài liệu thông thường (≤ 20.000 đoạn) ~1,3 s.
- PPTX còn 2,0 s cho 400 slide × 40 hình: phần kiểm lại dựng toàn bộ hình mỗi slide.
- Chỉ đo Linux, tệp tổng hợp (không có hình/biểu đồ thật).
