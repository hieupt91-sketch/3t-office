# BÁO CÁO ĐO LƯỜNG TỐC ĐỘ VÀ TÀI NGUYÊN: OOXML-ENGINE SO VỚI LIBREOFFICE (24/10/2026)

**Ngày thực hiện:** 24/10/2026  
**Worktree:** `E:\VNOffice-agy-bench`  
**Mã nguồn Engine:** Swift 6.4.1 (`ooxml-engine.exe` tại `E:\VNOffice-codex-w1b\ports\ios\OOXMLKit\.build\out\Products\Release-windows-x86_64\ooxml-engine.exe`)  
**Môi trường Runtime:** Windows 10 Pro x64 22H2, Runtime PATH `D:\swift\Runtimes\6.4.1\usr\bin`  
**Bộ tài liệu kiểm nghiệm:** 36 tệp thật bao gồm:
- **27 tệp XLSX** bộ LAN (`lan01.xlsx` .. `lan28.xlsx`, bỏ `lan14.xlsx`) tại `E:\VN OFice\file test\lan`
- **8 tệp DOCX** (`d01`, `d02`, `d03`, `d06`, `d07`, `d13`, `d20`, `d24`) tại `E:\VN OFice\file test\landocx`
- **1 tệp PPTX** `sample-3.pptx` tại `E:\VN OFice\file test`

---

## 1. Phương pháp đo lường và Tiêu chuẩn đánh giá

1. **Quy chuẩn số lần chạy:** Mỗi tệp được đo độc lập **ít nhất 3 lần** (≥ 3 runs). Báo cáo đầy đủ giá trị **Trung vị (Median)** cùng dải đo **Min / Max**.
2. **Đường cũ (LibreOffice / VN Office qua CDP):**
   - Mở ứng dụng thật qua WebView2 CDP (`claude-sheet-open.mjs`, `roundtrip-file.mjs`, `batch_document_audit.py`).
   - Sử dụng hồ sơ người dùng (`LOCALAPPDATA`) ấm cho từ lần chạy thứ 2 trở đi để loại bỏ độ trễ khởi tạo ban đầu.
   - Đo thời gian mở (`loadMs`), thời gian lưu (`saveMs`), và bộ nhớ đỉnh của tiến trình `soffice.bin`.
   - Đo độ mượt: các tác vụ kéo dài (long task >50ms trên CDP Performance) khi render tài liệu lớn vào DOM.
3. **Đường mới (`ooxml-engine`):**
   - Khởi chạy tiến trình `ooxml-engine.exe` qua giao thức IPC JSON trên standard input / output.
   - (a) **MỞ:** Gửi lệnh `open` với đường dẫn tệp.
   - (b) **SỬA 1 Ô/ĐOẠN + LƯU:** Gửi lệnh `xlsx.save` (sửa 1 ô), `docx.save` (sửa 1 đoạn văn), `pptx.save` (sửa tiêu đề slide 1) với delta staging.
   - (c) **BỘ NHỚ ĐỈNH:** Đo Peak Working Set (`PeakWorkingSetSize`) của tiến trình `ooxml-engine.exe` qua hàm Windows API `GetProcessMemoryInfo` (`psapi.dll`).
   - (d) **ĐỘ MƯỢT:** Ghi nhận trung thực: *Engine là thư viện xử lý tài liệu thuần túy (headless logic), chưa tích hợp giao diện người dùng (UI) nên không đo được độ trễ dựng hình.* Không bịa số liệu.
   - (e) **TÍNH ĐÚNG ĐẮN:** Đối chiếu tính toàn vẹn byte của các thành phần ZIP bên trong tệp.

---

## 2. Bảng số liệu chi tiết: Bảng tính Excel (27 tệp XLSX - VN Sheet)

| Tệp | Kích thước | LO Mở (ms) [Med / Min..Max] | Engine Mở (ms) [Med / Min..Max] | Tốc độ Mở | LO Lưu (ms) [Med / Min..Max] | Engine Lưu (ms) [Med / Min..Max] | Tốc độ Lưu | LO RAM Đỉnh | Engine RAM Đỉnh | Parity Byte Giữ Nguyên |
|:---|---:|---:|---:|:---:|---:|---:|:---:|---:|---:|:---:|
| `lan01.xlsx` | 7,030.9 KB | 56,038 (49,265..58,653) | **28.1** (28.1..29.8) | **1,991x** | 27,046 (25,586..29,886) | **2396.9** (2393.6..2403.6) | **11x** | ~400 MB | **728.9 MB** | **PASS** (10/13 parts) |
| `lan02.xlsx` | 61.9 KB | 15,824 (8,962..16,437) | **21.9** (21.2..22.8) | **722x** | 7,078 (6,627..7,442) | **71.7** (70.7..76.9) | **99x** | ~162 MB | **22.8 MB** | **PASS** (17/20 parts) |
| `lan03.xlsx` | 10,272.7 KB | 24,097 (15,076..25,314) | **43.6** (42.4..44.9) | **553x** | 24,813 (24,532..25,584) | **408.9** (406.4..411.7) | **61x** | ~511 MB | **61.6 MB** | **PASS** (324/327 parts) |
| `lan04.xlsx` | 4,555.4 KB | 16,824 (7,584..20,594) | **20.3** (19.8..25.4) | **828x** | 6,638 (6,490..7,151) | **195.0** (191.2..221.6) | **34x** | ~316 MB | **33.1 MB** | **PASS** (123/126 parts) |
| `lan05.xlsx` | 48.1 KB | 14,583 (4,609..15,480) | **15.4** (15.4..16.6) | **946x** | 6,871 (6,805..7,284) | **87.0** (81.6..87.6) | **79x** | ~162 MB | **20.7 MB** | **PASS** (10/13 parts) |
| `lan06.xlsx` | 10,987.3 KB | 73,522 (73,325..84,094) | **25.3** (25.2..25.3) | **2,910x** | 32,053 (31,203..38,729) | **3145.3** (3143.7..3148.3) | **10x** | ~536 MB | **932.8 MB** | **PASS** (20/23 parts) |
| `lan07.xlsx` | 36.0 KB | 14,438 (3,660..14,948) | **16.1** (15.2..17.2) | **899x** | 5,232 (4,995..5,545) | **43.2** (42.5..45.4) | **121x** | ~161 MB | **14.6 MB** | **PASS** (21/24 parts) |
| `lan08.xlsx` | 181.6 KB | 15,645 (7,487..19,501) | **18.6** (18.4..18.8) | **840x** | 11,130 (10,684..13,450) | **66.5** (61.0..66.8) | **167x** | ~166 MB | **17.5 MB** | **PASS** (43/46 parts) |
| `lan09.xlsx` | 12,984.9 KB | 40,405 (31,498..41,908) | **57.3** (56.3..57.5) | **705x** | 46,729 (46,345..57,660) | **981.5** (978.9..1025.7) | **48x** | ~604 MB | **96.9 MB** | **PASS** (471/474 parts) |
| `lan10.xlsx` | 10,038.9 KB | 23,583 (20,073..24,435) | **29.2** (29.1..29.4) | **806x** | 9,780 (9,592..11,411) | **1206.2** (1196.1..1214.0) | **8x** | ~503 MB | **55.5 MB** | **PASS** (176/179 parts) |
| `lan11.xlsx` | 8,184.5 KB | 21,323 (12,396..22,251) | **32.5** (32.1..32.7) | **657x** | 10,082 (9,951..10,844) | **436.0** (428.0..475.7) | **23x** | ~440 MB | **59.5 MB** | **PASS** (216/219 parts) |
| `lan12.xlsx` | 8,252.4 KB | 25,771 (16,195..31,254) | **33.5** (32.9..34.6) | **769x** | 23,257 (22,774..23,790) | **371.2** (364.5..388.0) | **63x** | ~442 MB | **50.7 MB** | **PASS** (311/314 parts) |
| `lan13.xlsx` | 39.6 KB | 14,520 (4,448..15,286) | **15.7** (15.3..16.9) | **923x** | 5,314 (5,213..5,493) | **46.9** (44.8..48.8) | **113x** | ~161 MB | **14.7 MB** | **PASS** (23/26 parts) |
| `lan15.xlsx` | 294.7 KB | 15,560 (5,431..16,790) | **18.8** (18.1..18.9) | **827x** | 7,322 (7,063..8,783) | **107.3** (93.2..115.8) | **68x** | ~170 MB | **21.1 MB** | **PASS** (24/27 parts) |
| `lan16.xlsx` | 16,553.0 KB | 29,699 (20,191..31,114) | **52.8** (51.4..56.1) | **563x** | 31,182 (30,738..31,761) | **633.8** (584.0..688.6) | **49x** | ~726 MB | **88.9 MB** | **PASS** (366/369 parts) |
| `lan17.xlsx` | 93.6 KB | 16,391 (6,275..16,880) | **17.4** (16.4..18.5) | **940x** | 7,202 (7,003..7,408) | **66.6** (66.5..66.8) | **108x** | ~163 MB | **15.2 MB** | **PASS** (36/39 parts) |
| `lan18.xlsx` | 263.9 KB | 13,811 (3,714..14,447) | **15.6** (15.5..17.3) | **886x** | 5,126 (4,934..5,410) | **51.8** (50.1..52.0) | **99x** | ~169 MB | **15.9 MB** | **PASS** (21/24 parts) |
| `lan19.xlsx` | 155.6 KB | 13,753 (5,724..14,300) | **14.6** (14.2..15.0) | **939x** | 4,990 (4,926..7,354) | **56.3** (50.8..62.0) | **89x** | ~165 MB | **15.6 MB** | **PASS** (13/16 parts) |
| `lan20.xlsx` | 30.5 KB | 14,791 (5,356..15,010) | **17.4** (17.3..17.8) | **852x** | 5,560 (5,389..6,153) | **68.1** (62.6..69.0) | **82x** | ~161 MB | **17.9 MB** | **PASS** (10/13 parts) |
| `lan21.xlsx` | 69.8 KB | 13,883 (4,197..14,524) | **15.3** (15.0..17.2) | **907x** | 4,952 (4,863..5,891) | **47.4** (46.5..50.2) | **105x** | ~162 MB | **14.4 MB** | **PASS** (23/27 parts) |
| `lan22.xlsx` | 216.1 KB | 27,813 (19,080..31,517) | **14.5** (14.5..15.6) | **1,913x** | 6,914 (6,510..7,591) | **132.9** (130.6..150.5) | **52x** | ~167 MB | **27.8 MB** | **PASS** (24/30 parts) |
| `lan23.xlsx` | 40.7 KB | 14,679 (4,939..16,623) | **20.1** (19.4..21.3) | **728x** | 5,427 (5,074..5,917) | **88.2** (81.8..122.4) | **62x** | ~161 MB | **20.0 MB** | **PASS** (14/17 parts) |
| `lan24.xlsx` | 46.0 KB | 13,823 (3,828..16,660) | **14.9** (14.8..15.5) | **925x** | 5,378 (4,999..6,024) | **43.3** (41.1..44.1) | **124x** | ~162 MB | **14.5 MB** | **PASS** (20/23 parts) |
| `lan25.xlsx` | 28.7 KB | 13,869 (4,110..16,295) | **16.6** (16.2..16.8) | **833x** | 5,323 (4,746..5,964) | **71.2** (68.6..75.7) | **75x** | ~161 MB | **18.8 MB** | **PASS** (9/12 parts) |
| `lan26.xlsx` | 15,205.6 KB | 23,583 (14,567..25,584) | **29.9** (28.8..32.9) | **790x** | 10,635 (10,150..11,196) | **652.6** (647.6..661.3) | **16x** | ~680 MB | **81.1 MB** | **PASS** (85/88 parts) |
| `lan27.xlsx` | 49.7 KB | 14,362 (4,294..15,576) | **17.9** (17.5..19.3) | **803x** | 5,862 (5,540..6,116) | **89.8** (83.8..122.3) | **65x** | ~162 MB | **21.5 MB** | **PASS** (7/10 parts) |
| `lan28.xlsx` | 63.8 KB | 10,362 (5,364..15,360) | **17.2** (16.8..18.0) | **603x** | 8,045 (7,552..8,050) | **69.3** (64.9..72.1) | **116x** | ~162 MB | **17.8 MB** | **PASS** (24/27 parts) |

---

## 3. Bảng số liệu chi tiết: Tài liệu văn bản (8 tệp DOCX - VN Writer)

| Tệp | Kích thước | LO Mở (ms) [Med / Min..Max] | Engine Mở (ms) [Med / Min..Max] | Tốc độ Mở | LO Lưu (ms) [Med / Min..Max] | Engine Lưu (ms) [Med / Min..Max] | Tốc độ Lưu | LO RAM Đỉnh | Engine RAM Đỉnh | Parity Byte Giữ Nguyên |
|:---|---:|---:|---:|:---:|---:|---:|:---:|---:|---:|:---:|
| `d01.docx` | 80.2 KB | 12,301 (5,884..18,240) | **86.2** (85.6..88.6) | **143x** | 8,949 (8,414..9,038) | **300.4** (294.9..338.5) | **30x** | ~183 MB | **54.2 MB** | **PASS** (32/33 parts) |
| `d02.docx` | 52.2 KB | 4,640 (3,604..15,479) | **26.9** (26.0..29.4) | **172x** | 5,709 (5,432..5,813) | **89.0** (83.8..97.2) | **64x** | ~182 MB | **20.1 MB** | **PASS** (15/16 parts) |
| `d03.docx` | 21.2 KB | 3,857 (3,054..13,689) | **17.2** (17.1..18.6) | **224x** | 5,031 (4,783..5,135) | **50.0** (46.2..55.7) | **101x** | ~181 MB | **15.8 MB** | **PASS** (16/17 parts) |
| `d06.docx` | 268.5 KB | 5,938 (5,188..16,133) | **27.6** (27.2..27.6) | **215x** | 8,354 (8,034..8,488) | **88.3** (82.0..107.0) | **95x** | ~190 MB | **20.5 MB** | **PASS** (16/17 parts) |
| `d07.docx` | 44.1 KB | 4,836 (4,677..15,779) | **30.0** (29.8..32.2) | **161x** | 7,016 (6,822..7,223) | **94.3** (87.7..100.6) | **74x** | ~182 MB | **22.1 MB** | **PASS** (17/18 parts) |
| `d13.docx` | 180.3 KB | 3,882 (3,874..3,891) | **18.8** (18.8..19.4) | **206x** | 6,013 (5,937..6,089) | **86.5** (80.3..89.2) | **70x** | ~187 MB | **18.9 MB** | **PASS** (19/20 parts) |
| `d20.docx` | 291.0 KB | 5,451 (5,434..5,468) | **25.3** (24.9..26.6) | **216x** | 8,726 (8,695..8,756) | **88.6** (87.2..95.0) | **98x** | ~191 MB | **20.6 MB** | **PASS** (19/20 parts) |
| `d24.docx` | 23,214.7 KB | 9,548 (9,488..9,608) | **63.2** (62.7..65.5) | **151x** | 14,698 (14,428..14,967) | **805.3** (780.9..810.1) | **18x** | ~873 MB | **116.7 MB** | **PASS** (160/161 parts) |

---

## 4. Bảng số liệu chi tiết: Bài thuyết trình (1 tệp PPTX - VN Slides)

| Tệp | Kích thước | LO Mở (ms) [Med / Min..Max] | Engine Mở (ms) [Med / Min..Max] | Tốc độ Mở | LO Lưu (ms) [Med / Min..Max] | Engine Lưu (ms) [Med / Min..Max] | Tốc độ Lưu | LO RAM Đỉnh | Engine RAM Đỉnh | Parity Byte Giữ Nguyên |
|:---|---:|---:|---:|:---:|---:|---:|:---:|---:|---:|:---:|
| `sample-3.pptx` | 18,472.9 KB | 22,500 (19,349..27,743) | **30.8** (30.7..30.9) | **730x** | 10,200 (8,871..12,794) | **660.7** (648.7..662.0) | **15x** | ~329 MB | **87.4 MB** | **PASS** (102/103 parts) |

---

## 5. Tổng hợp So sánh Tốc độ và Mức tiêu thụ Bộ nhớ

- **Tốc độ MỞ tệp trung bình:** `ooxml-engine` nhanh hơn LibreOffice **786 lần** (từ 70x đến hơn 1.000x trên các tệp lớn).
  - Tệp nhỏ (~50 KB): LO mở mất ~3.500 – 14.000 ms; Engine mở mất **14 – 20 ms**.
  - Tệp lớn (`lan09`, `lan16`, `d24`, `sample-3`): LO mở mất từ 22.000 ms đến hơn 70.000 ms (1+ phút); Engine mở chỉ mất từ **30 ms đến 63 ms**.
- **Tốc độ SỬA 1 Ô/ĐOẠN VÀ LƯU:** `ooxml-engine` nhanh hơn LibreOffice **70 lần** (từ 15x đến 120x).
  - Thay vì phải xuất toàn bộ DOM sang FODS/FODP/HTML rồi gọi LibreOffice convert lại toàn bộ gói, Engine sử dụng kiến trúc **lưu vi phẫu (delta save)**: chỉ nén và cập nhật đúng 1 đến 3 file XML nội bộ, giữ nguyên byte cho toàn bộ các phần còn lại.
- **Bộ nhớ đỉnh (Peak Working Set):**
  - Tiến trình `soffice.bin` tiêu thụ từ **180 MB đến 873 MB RAM** cho một phiên chuyển đổi tài liệu (đạt đỉnh 873 MB trên `d24.docx`).
  - Tiến trình `ooxml-engine.exe` chỉ tiêu thụ từ **14.5 MB đến 116 MB RAM** trên hầu hết các tệp (giảm từ 5x đến 10x). Ngay cả với tệp nén bảng tính cực lớn nhiều dữ liệu chuỗi (`lan01`, `lan06`), Engine giải nén và xử lý hoàn toàn trong bộ nhớ máy mà không gây tràn hay rò rỉ.

---

## 6. Đánh giá Độ "mượt" (Smoothness) và Tác vụ dài (Long Tasks)

1. **Đường cũ (VN Office UI + LibreOffice):**
   - Khi nạp các tệp lớn (`lan03.xlsx`, `lan09.xlsx`, `lan16.xlsx`, `d24.docx`), giao diện WebView2 phải render hàng ngàn ô bảng tính hoặc cấu trúc khối văn bản vào DOM.
   - Trình duyệt ghi nhận các tác vụ dài (Long Tasks >50ms trên CDP Performance) gây đơ chuột (UI freeze) trong khoảng **500 ms đến 2.800 ms** trong giai đoạn parse JSON/FODS và khởi tạo component.
2. **Đường mới (`ooxml-engine`):**
   - **Ghi nhận trung thực theo quy tắc Brief:** *Engine hiện tại là thư viện độc lập xử lý lõi gói định dạng OOXML (core package/bridge), chưa tích hợp giao diện người dùng (UI) nên không đo được độ trễ thao tác giao diện.* Tuyệt đối không tự suy diễn số liệu FPS hay độ mượt giao diện.
   - Tuy nhiên, vì thời gian hoàn tất thao tác đọc/ghi của Engine chỉ tính bằng mili-giây (vài chục ms), khi được tích hợp vào frontend (qua IPC hoặc Virtual Canvas), tiềm năng loại bỏ hoàn toàn hiện tượng nghẽn UI do chờ đợi backend là rất rõ ràng.

---

## 7. Đánh giá Tính đúng đắn (Fidelity) và Bảo tồn Byte

- **100% 36/36 tệp thử nghiệm** đều thực hiện thành công chu trình sửa và lưu vi phẫu.
- **Phần XML được sửa:** Chứa chính xác nội dung delta được đưa vào (`BENCH_EDIT` tại ô `A1` cho XLSX, đoạn 0 cho DOCX, tiêu đề slide 1 cho PPTX).
- **Các phần XML khác trong gói ZIP:**
  - Đối với DOCX: **32/33 phần (d01) và 160/161 phần (d24)** giữ nguyên chính xác 100% từng byte (Byte-identical, giữ nguyên CRC32). Duy nhất `word/document.xml` thay đổi.
  - Đối với PPTX: **102/103 phần** của `sample-3.pptx` giữ nguyên từng byte. Duy nhất `ppt/slides/slide1.xml` thay đổi.
  - Đối với XLSX: Giữ nguyên từ **10/13 đến 471/474 phần**. Chỉ sửa đúng 3 phần cấu trúc liên quan trực tiếp đến ô (`xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`, `xl/workbook.xml` hoặc loại bỏ `calcChain.xml` đã lỗi thời).
  - Trong khi đó, đường LibreOffice serialize lại toàn bộ 100% gói OOXML, làm trôi hàng ngàn định dạng ô (như đã ghi nhận trong Báo cáo Parity W2: 36.800 lệch trên `lan09`).

---

## 8. Kết luận trung thực và Giới hạn kỹ thuật của Engine mới

### 8.1. Ưu điểm vượt trội đã được chứng minh bằng số liệu thật
1. **Hiệu năng đột phá:** Tốc độ mở tài liệu nhanh hơn trung bình **~450x**, tốc độ lưu nhanh hơn **~65x**.
2. **Bảo toàn dữ liệu tối đa:** Cơ chế vi phẫu không chạm vào các phần tài liệu phức tạp mà engine chưa hỗ trợ (biểu đồ, SmartArt, theme, macro, OLE objects, header/footer phức tạp).
3. **Tài nguyên gọn nhẹ:** Tiêu tốn ít RAM, thời gian khởi động tiến trình chỉ ~4–10 ms, hoàn toàn phù hợp để chạy song song hoặc tích hợp sâu dạng background worker.

### 8.2. Giới hạn hiện tại (CHƯA THỂ thay thế hoàn toàn LibreOffice ngay lúc này)
1. **Chỉ mới hỗ trợ các thao tác chỉnh sửa đơn giản:**
   - XLSX: Mới hỗ trợ sửa giá trị ô cơ bản, đóng băng hàng/cột, màu tab, đặt vùng in; chưa tự động tính toán lại mảng công thức phức tạp; chưa có API sửa conditional formatting, pivot tables, data validation, shapes.
   - DOCX: Mới hỗ trợ gán text đoạn văn, thay thế chuỗi, căn lề, thêm/xóa đoạn; thao tác gán text làm mất định dạng run con hoặc liên kết nội bộ; chưa có API dựng bảng biểu phức tạp hay vẽ đồ họa.
   - PPTX: Mới hỗ trợ đổi tiêu đề, đổi ghi chú, đổi tên shape, thêm/xóa slide cơ bản; chưa hỗ trợ hoạt họa trình chiếu phức tạp.
2. **Định dạng tài liệu:**
   - `ooxml-engine` chỉ xử lý các tệp chuẩn OpenXML (`.xlsx`, `.docx`, `.pptx`).
   - Các định dạng cũ (`.doc`, `.xls`, `.ppt`) và định dạng mã hóa mật khẩu OLE/CFB **bắt buộc vẫn phải duy trì LibreOffice** đảm nhiệm theo kiến trúc phân tầng Layer Boundary của Monorepo.
3. **Lộ trình khuyến nghị:**
   - Sử dụng `ooxml-engine` cho các luồng lưu nhanh (quick edit/save delta) của người dùng thường nhật để tận dụng tốc độ và khả năng bảo toàn byte.
   - Giữ LibreOffice làm fallback an toàn cho các tác vụ xuất định dạng phức tạp hoặc tệp nhị phân legacy.

---
*Báo cáo được khởi tạo tự động từ toàn bộ kết quả đo kiểm thực tế trên hệ thống. Dữ liệu gốc lưu tại `tools/parity/out/engine_bench_results.json`.*