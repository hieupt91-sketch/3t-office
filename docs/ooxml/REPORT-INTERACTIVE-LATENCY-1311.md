# Báo cáo: độ trễ thao tác tương tác trên tài liệu lớn (Writer, Slides) — 13/11

Sau khi tối ưu lưu, đo các lệnh tương tác (đọc cửa sổ, sửa một đoạn/slide) qua `ooxml-engine` trên tệp tổng hợp (Linux x86 4 lõi, 1 lần/ca).

## Phát hiện
Mỗi lệnh dựng lại danh sách đối tượng của cả tài liệu rồi mới lấy phần tử cần dùng: `Document.paragraphs` (DOCX), `Document.tables` (qua `doc.read`), `Presentation.slides` (PPTX). Chi phí O(số đoạn/slide) cho MỖI lệnh, dù chỉ đọc 100 đoạn hay sửa 1 đoạn.

## Sửa (bridge, không đổi giao thức)
Nhớ danh sách theo handle và chỉ bỏ khi một lệnh có thể đổi cấu trúc:
- `doc.*`: giữ qua `doc.read`, `doc.setText`, `doc.setStyle`, `doc.setSpacing`, `doc.setRunEffect`, `doc.setNumbering`, `doc.removeNumbering`, `doc.setRunTextEffects`, `doc.watermark`, `doc.sections`; MỌI lệnh khác (insert, append, delete, replace, ảnh, revisions… và lệnh mới thêm sau này) xóa bộ nhớ đệm — mặc định an toàn.
- `slide.*`: giữ qua các lệnh sửa/đọc trong một slide; `slide.delete/duplicate/move/replace…` và lệnh mới xóa.
- Lệnh không thuộc `doc.`/`slide.`, `close`, và lệnh mở xóa/không dùng bộ nhớ đệm của handle.

## Số đo
| Ca | Trước | Sau |
|---|---|---|
| DOCX 120.000 đoạn: `doc.read` cửa sổ 100 đoạn | ~293 ms | **19 ms** |
| DOCX 120.000 đoạn: `doc.setText` | 166 ms | **~0–1 ms** |
| DOCX 120.000 đoạn: đọc sau sửa | 293 ms | 2 ms |
| DOCX: lần đọc đầu (dựng bộ nhớ đệm) và đọc sau insert/delete | — | ~270–300 ms |
| PPTX 400 slide: `slide.read` | ~85 ms | **2 ms** (lần đầu ~77 ms) |
| PPTX 400 slide: `slide.setText` | — | 1 ms |

Mở tệp không đổi: DOCX 120.000 đoạn ~3,5 s (eager, DOM), PPTX 400 slide ~0,9 s.

## Kiểm chứng
`swift test -c release` từ build sạch: 671/671. Thêm `testDocReadCacheStaysCoherentAfterEdits` (cửa sổ khớp cắt từ toàn bộ kể cả cửa sổ chạm biên và `from` âm; đọc lại đúng sau setText/insert/append/replace; sửa theo chỉ số mới sau chèn) và `testSlideListCacheStaysCoherentAfterStructuralOps` (setTitle, duplicate, move, delete).

## Giới hạn
- Chỉ đo Linux, tệp tổng hợp; số liệu 1 lần/ca.
- Sau thao tác đổi cấu trúc (insert/delete) lệnh đọc kế tiếp tốn lại ~270–300 ms với tài liệu 120.000 đoạn (tài liệu thông thường ít hơn nhiều).
- Mở DOCX lớn vẫn eager (3,5 s ở 120.000 đoạn); chưa có đường mở lười cho Word như Sheet.
