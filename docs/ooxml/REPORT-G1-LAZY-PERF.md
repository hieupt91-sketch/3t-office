# G1 — Mở nhanh / đọc LƯỜI + benchmark (OOXMLKit)

Nhánh: `claude/ooxml-g1-lazy-perf` (từ `vn-main`). Chưa gộp, chưa mở PR — chờ chủ/Windows duyệt (lõi dùng chung).

## Đã làm
1. **ZIP đã lười sẵn** (đọc central directory, chỉ inflate khi `contents(of:)`, mục không sửa chép nguyên byte nén) → không cần đổi. Chỉ thêm `ZipArchive.sourceData` (đọc, bổ sung).
2. **Chi phí chính lúc mở nằm ở `OPCPackage.init`**: nó chạy `PackageValidator.validate` giải nén + parse MỌI phần chỉ để lấy "baseline lỗi sẵn có của nguồn". Thêm đường mới:
   - `OPCPackage(contentsOf:/data:/archive:, deferValidation: true)`; `Workbook` / `WordDocument` / `Presentation` có `init(contentsOf:/data:, deferValidation:)`.
   - Baseline chỉ tính muộn (từ byte nguồn) khi `save(to:verify:true)`; `loadedXMLPartCount` (mới, chỉ đọc) để kiểm chứng tính lười.
   - `PackageValidator.validate(Data)` nay mở gói bằng đường lười (kết quả không đổi, bớt 1 lần validate thừa).
3. **Benchmark**: target `ooxml-bench` + `scripts/bench.sh` (sinh XLSX tổng hợp ~1MB/~10MB, mỗi chế độ chạy tiến trình riêng, đo thời gian + VmHWM).
4. **Test mới** `Tests/OOXMLPackageTests/LazyOpenTests.swift` (7 test): với MỌI fixture docx/xlsx/pptx/real — đọc phần/contentType giống hệt; lưu không sửa và lưu có sửa cho **byte-identical** với đường cũ; phần không sửa vẫn giữ byte nén gốc; `save(to:)` chạy được; mở lười không parse phần không đụng tới; liệt kê ZIP không cần inflate.

## API cũ
**Không đổi hành vi API cũ.** `init(archive:)`/`init(contentsOf:)`/`init(data:)` mặc định vẫn eager như trước (chỉ thêm tham số/ init mới). Mặc định chưa chuyển sang lười — để chủ quyết định.

## Kết quả test (Linux, Swift 6.0.3, `swift test -c release -Xswiftc -enable-testing`)
PASS: 147 test, 0 lỗi (140 cũ + 7 mới). OfflineGuaranteeTests giữ nguyên, xanh.

## Benchmark Linux (Xeon 2.8GHz, 4 vCPU; trung vị 3 lần; KHÔNG phải số thiết bị)
| Chế độ | 1.01MB | 9.71MB |
|---|---|---|
| zip-list (đọc danh sách mục) | 0.001s / 21MB | 0.008s / 29MB |
| OPCPackage eager (cũ) | 0.220s / 57MB | 2.478s / 379MB |
| OPCPackage lười (mới) | 0.001s / 21MB | 0.005s / 29MB |
| Workbook mở, eager | 0.380s / 57MB | 3.860s / 379MB |
| Workbook mở, lười | 0.172s / 39MB | 1.893s / 194MB |
| Mở + sửa 1 ô + `save(to:)` eager | 1.093s / 107MB | 13.60s / 856MB |
| Mở + sửa 1 ô + `save(to:)` lười | 1.062s / 107MB | 12.63s / 853MB |

(Số liệu: peak RSS = VmHWM. Tệp tổng hợp là dữ liệu ngẫu nhiên, nén khó hơn tài liệu thật.)

Nhận xét trung thực:
- **Mở** nhanh hơn ~2× (Workbook) và bộ nhớ đỉnh giảm ~2×; phần còn lại là parse sheet/sharedStrings, vốn bắt buộc khi `Workbook.init` đọc chuỗi chia sẻ.
- **Lưu KHÔNG nhanh hơn đáng kể**: tổng cộng ~ngang (baseline dời sang lúc lưu, và `save(to:)` vẫn validate toàn gói đã lưu + Deflate lại phần sửa). Muốn giảm cần việc riêng (vd. validate chỉ phần đổi, nén song song) — chưa làm, ngoài phạm vi G1.
- Mở Workbook 10MB trên Linux vẫn ~1.9s trong khi tệp lớn nhất là 1 sheet ~28MB XML.

## BLOCKED
- Mục tiêu roadmap 1MB<1s / 10MB<3s **trên thiết bị thật**: BLOCKED (không có iPhone/iPad). Số trên chỉ là baseline Linux, không suy rộng ra thiết bị.
- Chưa đo bộ nhớ trên iOS/macOS (VmHWM chỉ Linux).

## Giới hạn
- Baseline lười dùng `archive.sourceData` (byte nguồn khi mở); nếu truyền vào `ZipArchive` đã bị sửa trước khi bọc OPCPackage thì baseline khác eager — ngoại lệ hiếm, đã ghi chú.
- Chưa chạy `scripts/run-tests.sh` (kiểm chéo Python): NOT RUN.
