# Báo cáo — SheetPatcher: sửa ô tệp lớn không dựng DOM cả sheet (11/11/2026)

Thuộc kế hoạch tốc độ #18 (P2: lưu nhanh, RAM thấp) và mục M2 của roadmap #14. Nối tiếp `SheetRowReader` (PR #21).

## Vấn đề
Sửa một ô rồi lưu tệp XLSX 9,7 MB (104.501 hàng) trên vn-main: 5,8–8,7 giây và 558–853 MB RAM, vì `Worksheet.setValue` cần cây XML của toàn bộ sheet. Ngưỡng của #18 là RAM lúc lưu dưới 300 MB.

## Thay đổi (API cộng thêm, mặc định không đổi)
- `SheetPatcher` (mới): xếp hàng các lần ghi giá trị, khi `commit()` chỉ parse những hàng bị sửa thành DOM nhỏ, ghi ô bằng chính các hàm của `Worksheet`, rồi ghép vào byte gốc. Hàng không bị đụng giữ nguyên từng byte. `<dimension>` được nới hoặc tạo như đường DOM; phần đầu sheet giữ nguyên byte khi không cần đổi.
- `Worksheet`: tách `insertNewCell`, `write`, `updateDimension`, `setAttributeAfterR` thành hàm tĩnh dùng chung. Hành vi đường DOM không đổi (toàn bộ test cũ vẫn đạt).
- `Workbook.patcher(forSheetAt:)`, `patcher(forSheetNamed:)`.
- Bridge: lệnh mới `sheet.setValues` (thử đường vá, tự rơi về đường DOM khi bị từ chối).
- `OPCPackage.isXMLLoaded`, `XElement.serializedFragment`, `ooxml-bench` chế độ `save-patch`.

## Khi nào đường vá từ chối
`SheetPatchError.unsupported`, ném trước khi sửa bất cứ gì:
- ô đích đang có công thức (kể cả công thức chia sẻ);
- sheet có công thức mảng hoặc bảng dữ liệu ở bất kỳ đâu;
- có hàng không ghi số hàng, hoặc hàng bị sửa có ô không ghi địa chỉ;
- hàng không tăng dần; `<sheetData/>` tự đóng; hàng có cấu trúc lạ;
- sheet đã được nạp ở dạng DOM trong phiên.

## Số đo (Linux x86, bản release, 3 lần chạy, không phải thiết bị)
| Mở + sửa 1 ô + lưu | Thời gian | RAM đỉnh |
|---|---|---|
| 9,7 MB, `save-lazy` (mặc định) | 7,9–8,7 s | 853 MB |
| 9,7 MB, `save-stream` (M2) | 5,8–6,0 s | 558 MB |
| 9,7 MB, `save-patch` (mới) | **3,7–3,9 s** | **184 MB** |
| 1,0 MB, `save-stream` | 0,74–0,88 s | 108 MB |
| 1,0 MB, `save-patch` (mới) | 0,62–0,74 s | 70 MB |

Ngưỡng RAM dưới 300 MB của #18 đạt trên tệp tổng hợp này. Chưa đo lại `lan01`/`lan06` (tệp thật nằm ở máy Windows).

Trong 3,7–3,9 giây của `save-patch`, bước vá chiếm khoảng 1,8 giây dù chỉ sửa một ô. Chưa đo tách, nhưng nhiều khả năng do tra chuỗi mới trong bảng chuỗi lười (quét tuyến tính cả `<sst>`) và bốn lượt quét tìm công thức mảng. Đây là chỗ tối ưu tiếp theo.

## Kiểm thử
- `SheetPatcherTests` (5 bài): với cùng loạt sửa (ghi đè ô, ô mới trong hàng cũ, hàng chen giữa, hàng mới ở cuối; số, chuỗi, bool, rỗng), XML của sheet sau đường vá khớp cấu trúc với đường DOM trên các fixture, và mọi ô bằng nhau sau khi lưu rồi mở lại; hàng không đụng giữ nguyên byte; các trường hợp từ chối không làm đổi gói; `sheetData` rỗng; vá hai lần liên tiếp.
- `OOXMLBridgeTests.testSheetSetValuesUsesPatchPathAndFallsBackToDOM`.
- `swift test -c release`: 630/630, 0 lỗi (build sạch, Linux Swift 6.0.3). macOS/iOS do CI chạy.

## Giới hạn
- Chỉ ghi giá trị. Công thức, định dạng, chèn/xóa hàng cột vẫn đi đường DOM.
- Giao diện chưa gọi `sheet.setValues`.
- Chưa đối chiếu Excel thật (#11).

## Cập nhật 12/11 — tách chi phí bước vá và tối ưu tra chuỗi (nhánh `claude/lazy-sst-lookup`)
Đo tách cho thấy 1,5–1,7 giây của bước vá là do `LazySharedStrings.index(for:)` quét tuyến tính và giải mã cả 313.503 chuỗi để tìm chuỗi mới; ghi SỐ thì `commit()` chỉ mất 0,02 giây (cả lượt 1,67 giây, 124 MB).

Đã thay bằng chỉ mục băm dựng ở lần tra trượt đầu tiên (không giữ chuỗi, chỉ giữ số), ngữ nghĩa không đổi. Cùng máy, cùng tệp 9,7 MB:

| Mở + ghi 1 ô chuỗi mới + lưu | Thời gian | RAM đỉnh |
|---|---|---|
| `save-patch` trước tối ưu | 3,7–3,9 s | 184 MB |
| `save-patch` sau tối ưu | **2,2–2,3 s** | **148 MB** |

Phần còn lại chủ yếu là lưu truyền phát (khoảng 1,8 giây: nén lại sheet và kiểm tra gói). `swift test -c release`: 632/632.
