# Báo cáo — Đường nhanh cho `xlsx.save` (13/11/2026)

Thuộc kế hoạch tốc độ #18 (P2) và mục 3 của tuần áp dụng #27 (việc E-1).

## Phát hiện
Các cải tiến RAM của tuần trước (`SheetRowReader`, `SheetPatcher`, tra chuỗi bằng chỉ mục băm, nén nhanh) nằm ở API thư viện, chưa tới được đường lưu mà ứng dụng thực sự gọi. Lệnh `xlsx.save` của `ooxml-engine` đang: đọc cả tệp vào RAM, mở bằng đường eager, sửa bằng DOM cả sheet, lưu không truyền phát, rồi mở lại toàn bộ tệp đích để kiểm, và tính danh sách phần đổi bằng cách giải nén mọi phần của cả hai tệp.

Đo qua chính tiến trình `ooxml-engine` (gửi đúng lệnh `xlsx.save`), XLSX tổng hợp 9,7 MB / 104.501 hàng, Linux x86, bản release: **24 s và 1.033 MB** (ba lần chạy), cao hơn nhiều so với 7,9–8,7 s / 853 MB của đường thư viện `save-lazy` đã đo trước đó.

## Thay đổi
- `xlsx.save`: nếu delta chỉ gồm ghi giá trị ô (không `formula`, không `styleIndex`, `cleared_cells` và `structural_ops` rỗng) thì đi **đường nhanh**: mở lười, `SheetPatcher`, `saveStreaming`, kiểm lại bằng `SheetRowReader` trên tệp đích mở lười.
- `changedParts` của đường nhanh tính từ thư mục trung tâm ZIP (CRC, cỡ, byte nén), chỉ giải nén khi byte nén khác mà CRC và cỡ trùng. Kết quả đúng như so nội dung.
- Đường vá từ chối (`SheetPatchError.unsupported`) thì rơi về đường DOM cũ; lúc đó chưa có gì được ghi ra đĩa, nên không để lại trạng thái nửa chừng.
- Kết quả thêm khóa `path` (`"patch"` hoặc `"dom"`); các khóa cũ không đổi, không test hiện có nào so cả khối kết quả.
- Sửa lỗi có sẵn ở đường DOM: bước kiểm lại so cả những lần ghi cũ khi delta ghi cùng một ô nhiều lần, báo "không khớp" sai. Nay chỉ kiểm lần ghi cuối, ở cả hai đường.

## Số đo (qua tiến trình `ooxml-engine`, 3 lần chạy mỗi ca)
| Tệp | Đường | Thời gian | RAM đỉnh |
|---|---|---|---|
| 9,7 MB, 104.501 hàng | `dom` (cũ) | 24,8–25,3 s | 1.033 MB |
| 9,7 MB, 104.501 hàng | `patch` (mới) | 2,1–2,8 s | 154 MB |
| 1,0 MB | `dom` (cũ) | 2,3–2,5 s | 127 MB |
| 1,0 MB | `patch` (mới) | 0,64–0,85 s | 65 MB |

Ngưỡng RAM dưới 300 MB của #10 và #18 đạt trên đường mà ứng dụng gọi, với tệp tổng hợp này. Số đo là máy Linux, không phải thiết bị. Tái lập: `ports/ios/OOXMLKit/scripts/measure_xlsx_save.py` (cách tạo tệp thử và delta ghi trong đầu tệp).

## Kiểm thử
`XlsxSaveFastPathTests` (6 bài), ở mức giao thức JSON như WebView gọi:
- 12 fixture, mỗi sheet một delta phủ (ghi đè, ô mới trong hàng cũ, cột mới, hàng mới ở cuối; chuỗi, số, bool, rỗng, lỗi): mọi ô của mọi sheet bằng với kết quả đường DOM làm trực tiếp trong thư viện; không thêm lỗi gói so với nguồn; `changedParts` của đường nhanh bằng tập phần đổi tính theo nội dung và bằng của đường DOM; ít nhất 8 sheet thật sự đi đường nhanh.
- Phần không đổi giữ nguyên byte nén; tệp nguồn không bị sửa.
- Ghi cùng một ô nhiều lần: lần cuối thắng ở cả hai đường.
- Các delta không đủ điều kiện (công thức, `styleIndex`, xóa ô, thao tác cấu trúc) đi đường DOM và cho đúng kết quả.
- Delta nhiều sheet mà một sheet có ô đích là công thức: cả delta rơi về DOM, không nửa chừng.
- Sheet lạ, địa chỉ sai, số sai, chuỗi quá dài: lỗi, không để lại tệp đích, nguồn nguyên vẹn.

`swift test -c release`: 649/649, 0 lỗi (build sạch, Linux Swift 6.0.3).

## Giới hạn
- **Chỉ ghi giá trị mới đi đường nhanh.** Delta có công thức, định dạng, xóa ô, hoặc thao tác cấu trúc vẫn đi đường DOM (24,8–25,3 s, 1.033 MB với tệp 9,7 MB). Ô công thức do người dùng sửa là loại sửa rất phổ biến, nên phần lớn lợi ích thực tế chỉ có khi mở rộng đường vá sang công thức và định dạng. Đó là việc tiếp theo.
- Sheet có công thức mảng hoặc bảng dữ liệu, hoặc ô đích đang là công thức, cũng đi đường DOM. Ví dụ sheet đầu của `rich-excel.xlsx`.
- Đường nhanh kiểm tệp đích nhẹ hơn đường DOM: không parse DOM các phần lớn (ngưỡng 4 MiB) khi kiểm gói, thay bằng kiểm cấu trúc quan hệ cùng giá trị các ô đã ghi. Phần byte do bộ vá tạo ra đã được so cấu trúc với đường DOM trên 12 fixture; chưa có kiểm tra tính hợp lệ XML toàn phần của sheet lớn.
- Chưa mở bằng Excel thật để kiểm "repair" (#11).
- Chưa đo trên Windows, macOS, iPhone, iPad thật.
