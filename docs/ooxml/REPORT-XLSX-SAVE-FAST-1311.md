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

## Cập nhật E-1b (13/11): đường nhanh nhận cả công thức và định dạng
Ô công thức do người dùng sửa là loại sửa rất phổ biến, nên đường nhanh nay nhận thêm `formula` (+ `cached`) và `styleIndex`.
- `SheetPatcher` thêm `setFormula(_:cachedValue:at:)` và `setStyleIndex(_:at:)`; các lần ghi cho cùng một ô gộp tuần tự như gọi `Worksheet` lần lượt (nội dung lần sau thắng, định dạng lần sau thắng, ghi nội dung không đổi định dạng đã đặt).
- Ô đích đang có công thức **thường** nay ghi đè được (như `Worksheet`); ô thuộc công thức chia sẻ, mảng, bảng dữ liệu vẫn bị từ chối (cần hiểu cả nhóm). Ghi công thức hoặc ghi đè công thức thường hủy `calcChain`; chỉ đổi định dạng thì không.
- Bước kiểm lại sau khi lưu so thêm công thức và định dạng cuối cùng của từng ô.
- **Sửa lỗi có sẵn:** phép kiểm "style phải tồn tại" của `xlsx.save` dùng `info(styleIndex:) == nil`, nhưng hàm đó luôn trả giá trị mặc định cho chỉ số vượt phạm vi, nên chỉ số rác bị chấp nhận và ghi `s="9999"` vào ô (tệp mà Excel phải sửa lại). Nay so với `cellFormatCount`, ở cả hai đường.

Số đo (qua `ooxml-engine`, XLSX 9,7 MB, 3 lần chạy): delta có công thức và định dạng `patch` **2,1–2,2 s, 154 MB**; delta có `cleared_cells` vẫn `dom` 17,6–18,0 s, 1.033 MB. (Thời gian đường `dom` dao động 17,6–25,3 s giữa các lượt đo do tải máy; RAM đỉnh ổn định 1.033 MB.)

Kiểm thử thêm: `SheetPatcherTests` (công thức/định dạng so cấu trúc XML và ô với đường DOM trên 12 fixture; calcChain bị hủy đúng lúc; gộp ghi tuần tự; công thức chia sẻ và bảng dữ liệu bị từ chối), `XlsxSaveFastPathTests` (công thức/định dạng đi `patch` và bằng kết quả đường DOM; chỉ số định dạng vượt phạm vi bị từ chối ở cả hai đường; xóa ô và thao tác cấu trúc vẫn `dom`). `swift test -c release`: 654/654 (build sạch).

Còn lại ở đường `dom`: `cleared_cells`, `structural_ops`, công thức chia sẻ/mảng, sheet có công thức mảng. Hai việc có thể làm tiếp: hỗ trợ `cleared_cells` bằng đường vá, và bung công thức chia sẻ theo nhóm mà vẫn không dựng DOM cả sheet.

## Cập nhật E-1c (13/11): xóa ô (`cleared_cells`) đi đường vá
`SheetPatcher.clear(range:)` xóa nội dung trong vùng ngay trên các hàng bị chạm (chỉ hàng đã có trong tệp, tối đa 5.000 hàng; quá thì rơi về DOM). Ngữ nghĩa như `Worksheet.clear` từng ô: bỏ giá trị và công thức, giữ định dạng, ô trống không định dạng bị gỡ, hủy `calcChain` nếu có công thức, áp SAU mọi lần ghi. Ô thuộc công thức chia sẻ/mảng trong vùng xóa → từ chối, đường DOM xử lý.

**Sửa lỗi có sẵn ở đường DOM:** delta vừa ghi vừa xóa cùng một ô bị bước kiểm lại báo `reopen` ("giá trị … không khớp") và tệp lưu bị hủy dù kết quả đúng; bước kiểm nay tính thứ tự "xóa sau ghi".

Số đo (XLSX 9,7 MB qua `ooxml-engine`, 3 lần): delta ghi 1 ô + xóa 1 ô: **2,5–3,1 s, 167 MB, path=patch** (trước: path=dom 17,6–20 s, 1.033–1.045 MB). Chưa tính nén song song (#32); sau khi #32 gộp dự kiến ~1 s như delta giá trị.

Kiểm thử: `testClearedCellsUsePatchPathAndMatchDOMOnEveryFixture` (12 fixture, ép đường DOM bằng thao tác cấu trúc vô hại rồi so từng ô; ≥ 8 sheet đi đường vá), `testClearOnlyDeltaAndOversizedRangeFallback`, hai test mới ở `SheetPatcherTests`. Còn đường DOM: `structural_ops`, công thức chia sẻ/mảng, vùng xóa > 5.000 hàng.

## Cập nhật E-1d (13/11): công thức mảng chỉ chặn ô thuộc vùng của nó
Trước đây chỉ cần sheet có MỘT công thức mảng hoặc bảng dữ liệu ở đâu đó là cả sheet bị từ chối đường vá và rơi về DOM (~20 s). Thực tế chỉ ô nằm trong `ref` của công thức mảng mới cần hiểu cả nhóm. `SheetPatcher` nay quét thẻ `<f t="array"|"dataTable" ref="…">`, lấy vùng `ref` (thẻ không đọc được `ref` ⇒ từ chối, an toàn), và chỉ từ chối khi một ô ghi/vùng xóa chạm vùng đó. Hàng chứa công thức mảng ngoài vùng ghi giữ nguyên byte.

Kiểm thử: `testCellsOutsideArrayRangeArePatchedAndArrayRowsStayIdentical`, bản cập nhật `testUnsupportedCasesLeavePackageUntouched`, và hai test cầu nối mới (`testArrayRangeCellsAreRefusedAndOutsideCellsArePatched`; sheet có hàng ngầm định thay cho "sheet có mảng" trong test rơi-về-DOM-nguyên-delta). Ghi vào ô trong vùng mảng bị chính `Worksheet` từ chối ở đường DOM ("Ô C11 thuộc công thức mảng C10:C11") nên delta kiểu đó trả lỗi ở cả hai đường (hành vi cũ giữ nguyên). `swift test -c release` 660/660.
