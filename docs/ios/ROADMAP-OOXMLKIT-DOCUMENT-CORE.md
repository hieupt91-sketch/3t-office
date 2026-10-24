# Roadmap — OOXMLKit làm lõi tài liệu VN Office đa nền tảng

Cập nhật: 24/10/2026

## 1. Mục tiêu

Xây một lõi tài liệu của VN Office dùng chung cho Writer, Sheet và Slides trên Windows, Linux, macOS, iOS, iPadOS và Android. Lõi phải chạy offline, giữ dữ liệu khi round-trip và xuất ra file mở được bằng Microsoft Word, Excel và PowerPoint.

OOXMLKit là nền tảng ban đầu cho lớp đọc/sửa/ghi DOCX, XLSX và PPTX. Việc gỡ LibreOffice phải diễn ra theo parity gate, không gỡ ngay sau khi package build được.

## 1.1 Chiến lược song song

Trong giai đoạn chuyển tiếp, VN Office được phép dùng LibreOffice làm nền tham khảo, bộ xử lý đối chiếu và fallback cho phần chưa hoàn thiện. LibreOffice không phải sản phẩm đích và không được trở thành ràng buộc kiến trúc của UI hoặc document service.

- **LibreOffice:** baseline mở để đọc mã, hiểu hành vi, tạo dữ liệu đối chiếu và phát hiện khác biệt.
- **Microsoft Office:** oracle tương thích cuối cùng cho DOCX/XLSX/PPTX, công thức, bố cục và cảnh báo Repair.
- **VN Office/OOXMLKit:** implementation độc lập, có command model, test, renderer và hành vi riêng; không copy UI, tài sản hoặc mã độc quyền.

Mỗi tính năng mới phải chạy theo chuỗi: `VN implementation → test với LibreOffice → test với Microsoft Office → visual/structural diff → ghi parity report`. Khi VN implementation đạt gate, tính năng được chuyển khỏi fallback LibreOffice. Không coi kết quả giống LibreOffice là đủ nếu khác Microsoft Office ở phần người dùng nhìn thấy hoặc dữ liệu lưu ra.

## 2. Phân ranh giới

### Có thể tái sử dụng theo tiêu chuẩn/API

- OOXML, OPC, ZIP, XML, Unicode và quy tắc locale công khai.
- API file picker, font, accessibility, PDF và print của từng hệ điều hành.
- Các hành vi người dùng phổ biến: undo/redo, save, find/replace, shortcut, ribbon, context menu.

### Không copy trực tiếp

- Mã Microsoft Office, tài sản thương hiệu, icon, artwork hoặc template độc quyền.
- Mã LibreOffice nếu chưa kiểm tra license từng file và nghĩa vụ phân phối.
- Font, dictionary, media hoặc test fixture có license không rõ.

LibreOffice hiện có MPL 2.0, LGPL và nhiều license của bên thứ ba. Nếu lấy mã, phải tạo SBOM, giữ copyright/license notice và được duyệt pháp lý trước. Mặc định dùng LibreOffice làm oracle/fallback, không lấy mã trực tiếp.

## 3. Kiến trúc đích

```text
VN Writer / VN Sheet / VN Slides UI
        ↓
Shared Command + Undo/Redo + Recovery
        ↓
Shared Document Model
        ↓
OOXMLKit: ZIP / OPC / XML / DOCX / XLSX / PPTX
        ↓
Platform Adapters: Windows / Linux / macOS / iOS / iPadOS / Android
```

UI không gọi LibreOffice implementation trực tiếp. Mọi thao tác đi qua command/document service. Các nền tảng dùng chung contract, nhưng được phép có renderer và file service riêng.

## 4. Lộ trình triển khai

### G0 — Baseline và corpus

- Tạo corpus nội dung giả do Word, Excel và PowerPoint thật tạo.
- Ghi baseline Office thật và LibreOffice.
- Chạy `Open → Edit → Undo → Redo → Save → Close → Reopen → Export`.
- Lưu expected result, structural diff và visual diff.
- Không dùng openpyxl làm oracle duy nhất.

**Gate:** corpus có đủ DOCX/XLSX/PPTX với bảng, ảnh, chart, formula, style, comment, notes và dữ liệu Unicode.

### G1 — OOXML I/O nhanh và không mất dữ liệu

- Lazy ZIP central-directory reader.
- Manifest/relationship index.
- Lazy XML parsing theo part/range/slide.
- Giữ compressed bytes cho part không sửa.
- Chỉ serialize node đã sửa.
- Giữ namespace, thứ tự schema, ảnh, chart, VML, SmartArt, custom XML và macro binary.
- Atomic save → reopen → validate → replace.

**Gate:** 100% file không sửa giữ nguyên part; không có lỗi Repair trên corpus Office thật.

### G2 — Sheet engine

- Dependency graph và incremental recalculation.
- Hàm phổ biến, cross-sheet reference, error values, array formula và dynamic array.
- Cached value, `calcChain`, named range.
- Conditional formatting, data validation, table, chart, pivot.
- So sánh kết quả với Excel thật.

**Gate:** kết quả công thức khớp Excel trong corpus, không làm sai dữ liệu khi Save/Reopen.

### G3 — Writer engine

- Paragraph/run/style/heading/numbering.
- Table, section, header/footer, page break.
- Footnote/endnote/comment/field/bookmark.
- Track changes và accept/reject.
- Image wrapping, page layout, PDF/print.

**Gate:** nội dung và bố cục giữ được sau Save → Close → Reopen → Export PDF.

### G4 — Slides engine

- Theme, master, layout và placeholder.
- Shape/group/layer, image, table, chart.
- Notes, slide reorder/duplicate/delete.
- Slideshow và export PDF.

**Gate:** không lệch vị trí, kích thước, font hoặc layer trên corpus nhiều slide.

### G5 — Render, hiệu năng và offline

- Hiện UI trước, tải part phụ sau.
- Text shaping, font fallback, line break và page break.
- Background loading và cancellation.
- Đo file 1 MB, 10 MB và file lớn trên thiết bị thật.
- Giới hạn bộ nhớ và cảnh báo rõ ràng.
- Không gọi mạng, server, Python, Node hoặc LibreOffice trong runtime offline.

**Mục tiêu ban đầu:** file 1 MB mở dưới 1 giây; file 10 MB mở dưới 3 giây trên thiết bị chuẩn đã thống nhất. Đây là mục tiêu đo lường, không được ghi PASS nếu chưa đo.

### G6 — Bridge và app host

- Command API ổn định cho Writer/Sheet/Slides.
- Undo/Redo, autosave, recovery và clipboard.
- Document picker, security-scoped bookmark và file sharing.
- UI cảm ứng iPhone/iPad.
- App host để test trực quan trước TestFlight.

**Gate:** ứng dụng host mở/sửa/lưu offline trên iPhone và iPad thật.

### G7 — Port đa nền tảng

- macOS/iOS/iPadOS: Swift + Foundation/WebKit/native APIs.
- Windows/Linux: chọn toolchain sau spike build/performance; giữ cùng document contract.
- Android: thực hiện spike trước khi cam kết dùng Swift package trực tiếp; có thể cần cổng native riêng hoặc lõi portable với ABI ổn định.
- Không tuyên bố “một binary dùng mọi nền tảng” trước khi có build/test thật.

### G8 — Chuyển đổi khỏi LibreOffice

1. Chạy OOXMLKit và LibreOffice song song.
2. So sánh cấu trúc, nội dung, công thức và PDF.
3. Chuyển từng nhóm tính năng sang OOXMLKit.
4. Giữ fallback cho tính năng chưa hỗ trợ.
5. Chỉ gỡ LibreOffice khi parity gate đạt trên tất cả nền tảng mục tiêu.

## 5. Workstream giao team

| Team | Phạm vi | Kết quả bắt buộc |
|---|---|---|
| OOXML Core | ZIP/OPC/XML/round-trip/lazy load | package nhanh, không mất part |
| Sheet | formula/dependency/chart/validation | kết quả khớp Excel |
| Writer | style/table/section/revision/layout | giữ bố cục và nội dung |
| Slides | theme/master/layout/object | giữ vị trí và layer |
| Render | font/text/page/slide/PDF | visual diff đạt ngưỡng |
| Bridge | command/undo/recovery/clipboard | API dùng chung mọi app |
| Platform | Windows/Linux/macOS/iOS/iPadOS/Android | build/test offline thật |
| QA | Office corpus/stress/fuzz/compatibility | report PASS/FAIL có số liệu |
| Packaging | app host/signing/TestFlight/installer | artifact phát hành |
| License | SBOM/notice/dependency audit | không vi phạm license |

## 6. Điều kiện phát hành

- Không có Repair trên bộ file Office thật nội dung giả.
- Không mất ảnh, chart, style, formula, notes hoặc metadata trong phạm vi hỗ trợ.
- Save/Reopen lặp lại không làm file suy giảm.
- Formula khớp Excel trong tolerance đã quy định.
- PDF/print đạt visual parity đã thống nhất.
- Có benchmark mở/lưu/memory trên từng nền tảng.
- Có fallback và thông báo rõ khi gặp tính năng chưa hỗ trợ.
- Có SBOM, license notice và không commit secret/tài liệu thật.

## 7. Trạng thái hiện tại

- OOXMLKit: đọc/sửa/ghi DOCX/XLSX/PPTX offline; 111/111 test trên Mac, iPhone Simulator và iPad Simulator.
- Office smoke test: các mẫu đã mở trên Word/Excel/PowerPoint Mac không Repair.
- Chưa có app host iOS/iPadOS để đưa TestFlight.
- Chưa đo thiết bị iPhone/iPad thật.
- Công thức đầy đủ, renderer, PDF/print và parity đa nền tảng vẫn là các workstream tiếp theo.

## 8. Nguyên tắc quyết định

- REUSE BEFORE REWRITE, nhưng chỉ reuse code sau license audit.
- Không gỡ LibreOffice trước parity gate.
- Không gọi PASS nếu chưa chạy test/build thật.
- Không sửa expected để làm xanh.
- Mọi tính năng mới phải có hướng dẫn tiếng Việt trong ứng dụng.
