# Q53 — Điều tra sâu lỗi nhập `.doc` cũ

Ngày chạy: 24/10/2026  
Nhánh/worktree: `codex/queue-19-10` — `E:\VNOffice-codex-queue`  
Nguồn: 9 tệp lỗi trong `E:\VN OFice\file test\lan-legacy` (`legacy06,07,10,13,14,15,17,18,20.doc`). Tệp gốc chỉ đọc; mọi bản chuyển đổi nằm trong `E:\VNOffice-briefs\logs\Q53-work`; không đưa mẫu LAN vào repo.

## Mục tiêu, kế hoạch và giới hạn

- Mục tiêu: đối chiếu Word COM, LibreOffice DOCX/FODT, đường mở hiện tại (A), FODT (B) và mở DOCX qua adapter tối ưu (C); xác định bước làm đổi chữ, hình, font, lề và số trang.
- Năng lực hiện hữu: `.doc` hiện chuyển sang DOCX rồi HTML; app tái dùng cùng bộ nhập/chuẩn hóa HTML và phân trang Writer. Không cần dependency/Core patch cho điều tra.
- Rủi ro chính: corpus chứa tài liệu thật; thao tác chỉ đọc và không lưu; Word COM ẩn chạy tuần tự, timeout 90 giây cho từng nguồn. PID Word có sẵn trước lượt chạy (8792) được giữ nguyên; mỗi lượt tạo/thoát PID riêng. Không chạy Excel COM.
- Kế hoạch tệp: chỉ bổ sung báo cáo này và handoff; không sửa mã vì chưa tìm được đường chuyển đổi an toàn hơn. Hoàn tác tài liệu bằng revert commit báo cáo/handoff.
- Tham chiếu đã đọc: `E:\VNOffice-briefs\CODEX-COMMON-RULES.md`, `docs/LEGACY-OFFICE-AUDIT-24-10.md`, `E:\VNOffice-briefs\BRIEF-CODEX-Q52-LEGACY-FIDELITY.md`, `E:\VNOffice-briefs\BRIEF-CODEX-Q53-DOC-IMPORT-DEEPDIVE.md`, log Q52 và `docs/PERF-OPEN-WARM-21-10.md`. Không tìm thấy memory entry tên “LAN usage profile” trong các thư mục nhớ được cung cấp; tỷ lệ 41% được lấy từ brief Q53.

## Cách đo

1. Word COM ẩn mở từng `.doc` nguồn `ReadOnly`, `ConfirmConversions=false`, `AddToRecentFiles=false`; đọc `ComputeStatistics(Pages)`, `Paragraphs`, `InlineShapes`, `Shapes` (type/vị trí), `Tables`, `Sections`, PageSetup và font/cỡ chữ ba đoạn đầu. Timeout 90 giây; không có tệp nào treo. PID Word có sẵn không bị chạm.
2. LibreOffice chuyển tuần tự cả 9 nguồn sang DOCX và FODT, profile riêng mỗi lần. Tất cả 18/18 chuyển đổi thành công. Đếm XML `w:p`, `w:drawing`, `w:pict`, `w:sectPr`, `w:tbl` và FODT `text:p`, `draw:frame`, `draw:image`.
3. CDP mở đường A trên `.doc` và đường C trên DOCX LibreOffice tạo; đọc `_livePageCount`, đoạn HTML ngữ nghĩa trong thân bài (`p`/heading), `adapter.shapes`, bảng/ảnh và chụp màn hình ở 1366×768. A và C đều được thử trong app mới; một phiên CDP tuần tự thứ hai xác nhận model và lưu thêm ảnh. Không sửa/lưu tài liệu.
4. App từ chối mở trực tiếp `.fodt` với thông báo “Định dạng tệp chưa được hỗ trợ: .fodt” (BLOCKED ở bộ nhận phần mở rộng). Để kiểm tra bộ xuất, chuyển DOCX và FODT thành HTML bằng cùng bộ lọc `HTML (StarWriter)` rồi dò các cụm chữ và ảnh.
5. `VNO_PERF_DEBUG=1` ghi stage chuyển đổi. Một app tại một thời điểm. Mỗi lần launch CDP dùng thư mục LOCALAPPDATA riêng.

## Word COM — số liệu nguồn

`PageSetup` dùng inch-point API của Word; lề hiển thị dưới đây là point. Word `Paragraphs.Count` bao gồm cấu trúc mà bộ đếm phần thân HTML của app không nhất thiết biểu diễn như cùng một đơn vị.

| Tệp | Trang | Đoạn Word | Hình nội dòng | Shape nổi (type; trái, trên, rộng, cao — pt) | Bảng | Section | Font/cỡ ba đoạn đầu | Giấy; lề trên/dưới (pt) |
|---|---:|---:|---:|---|---:|---:|---|---|
| legacy06 | 3 | 349 | 0 | 1 (đường, type 9; 178.80, 16.35, 147.15, 0) | 4 | 1 | Times New Roman 13 pt | A4; 42.55/42.55 |
| legacy07 | 4 | 90 | 0 | 0 | 1 | 1 | Times New Roman 13/13/14 pt | A4; 45/42.55 |
| legacy10 | 2 | 91 | 0 | 0 | 1 | 1 | Times New Roman 14/14/10 pt | A4; 7.10/9.05 |
| legacy13 | 1 | 31 | 0 | 1 (ảnh, type 13; −0.45, −2.15, 75.45, 58.70) | 0 | 1 | Times New Roman 9999999/9999999/10 pt (9999999 là COM trả về cho cỡ mixed) | A4; 72/72 |
| legacy14 | 15 | 1034 | 15 | 0 | 30 | 1 | VNI-Avo 6.5; VNI-Aptima 12; VNI-Helve 10 pt | Word paper code 2; 14.20/42.55 |
| legacy15 | 2 | 91 | 0 | 0 | 1 | 1 | Times New Roman 14/14/10 pt | A4; 7.10/9.05 |
| legacy17 | 3 | 78 | 0 | 1 (đường, type 9; 153.95, 0.15, 153, 0) | 1 | 1 | Times New Roman 13.5 pt | A4; 45.35/54 |
| legacy18 | 3 | 77 | 0 | 1 (đường, type 9; 153.95, 0.15, 153, 0) | 1 | 1 | Times New Roman 13.5 pt | A4; 45.35/54 |
| legacy20 | 1 | 47 | 0 | 2 (type 17; 220.80, 10.55, 299.20, 131.30; type 9 đường; 47.25, 19.45, 455.25, 0) | 1 | 1 | Times New Roman 18/14/14 pt | Word paper code 2; 67.50/49.50 |

## So sánh đường A/C và cấu trúc

A = mở `.doc` theo app hiện tại; C = mở DOCX do LibreOffice chuyển từ cùng `.doc`. “Đoạn app” là số `p`/heading trong thân HTML sau nhập, không phải COM `Paragraphs.Count`.

| Tệp | Word trang/đoạn | App A trang/đoạn | App C trang/đoạn | Shape app A/C | Ảnh app A/C | Bảng app A/C | Kết quả quan sát |
|---|---:|---:|---:|---:|---:|---:|---|
| legacy06 | 3/349 | 4/299 | 4/299 | 1/1 | 0/0 | 4/4 | “Độc lập” bị thành “Đ ộc lập”; +1 trang |
| legacy07 | 4/90 | 4/89 | 4/89 | 0/0 | 0/0 | 1/1 | Trang khớp; cụm “Độc lập” nguyên |
| legacy10 | 2/91 | 2/87 | 2/87 | 0/0 | 0/0 | 1/1 | Trang khớp; lề DOCX đổi như bảng dưới |
| legacy13 | 1/31 | 2/31 | 2/31 | 0/0 | 1/1 | 0/0 | Ảnh logo còn; dòng tên công ty gãy sau chữ “C”; +1 trang |
| legacy14 | 15/1034 | 16/897 | 16/897 | 0/0 | 15/15 | 30/30 | 15 ảnh nội dòng còn; app +1 trang |
| legacy15 | 2/91 | 2/87 | 2/87 | 0/0 | 0/0 | 1/1 | Trang khớp; lề DOCX đổi như bảng dưới |
| legacy17 | 3/78 | 3/75 | 3/75 | 1/1 | 0/0 | 1/1 | Trang khớp; đường nổi còn |
| legacy18 | 3/77 | 3/74 | 3/74 | 1/1 | 0/0 | 1/1 | Trang khớp khi mở chưa lưu; đường nổi còn |
| legacy20 | 1/47 | 2/52 | 2/52 | 2/2 | 2/2 | 1/1 | Hai ảnh/shape còn; “Tel” bị ngắt dòng thành “T”/“el”; +1 trang |

A và C khớp cùng số trang, đoạn thân HTML, shape, ảnh và bảng trên 9/9. Hash `innerText` bằng nhau ở 7/9; `legacy06` và `legacy10` có chênh một ký tự xuống dòng/khoảng trắng, không khác từ ngữ quan sát được. Các sai khác trang khi mở chưa chỉnh là 4/9 (06, 13, 14, 20), đều app nhiều hơn Word một trang. Với 14, báo cáo Q51 từng ghi Word nguồn 16 trang; lượt Word COM Q53 và log Q52 đều cho 15 trang. Số nguồn của tệp này vì vậy không ổn định giữa các lượt/môi trường; cần xem là dấu hiệu bố cục nhạy với font/môi trường, không coi chênh lệch cũ đã bị bác bỏ.

Số đoạn `w:p` của DOCX LibreOffice / số `text:p` của FODT lần lượt là: 06 299/300; 07 89/89; 10 87/91; 13 31/31; 14 943/777; 15 87/91; 17 75/76; 18 74/75; 20 62/47. Word COM đọc lại DOCX LibreOffice trong log Q52 giữ số trang, đoạn Word, hình nội dòng và shape nổi của nguồn trên cả 9 tệp. Không so trực tiếp các bộ đếm XML này với COM vì khác phạm vi story/header/footer và loại phần tử.

### Khác biệt DOCX/FODT đã xác nhận

- `legacy10` và `legacy15`: Word nguồn có lề trên/dưới 7.10/9.05 pt; Word đọc DOCX LibreOffice là 20.65/13.55 pt. Đây là thay đổi ở khâu nhập `.doc`/xuất DOCX của LibreOffice, dù số trang và đoạn Word vẫn khớp.
- Các ảnh nội dòng/shape đã được kiểm: DOCX XML giữ `w:drawing`/`w:pict`; app có ảnh/shape tương ứng ở cả A/C. `legacy13` có 1 ảnh app; `legacy14` 15; `legacy20` 2. Các shape type 9 của 06/17/18 vẫn được giữ trong `adapter.shapes`.
- Q52 Word COM lưu DOCX bằng `SaveAs2` bị treo ở `legacy10`; phép Q53 chỉ mở nguồn `ReadOnly` và đọc cả 9 tệp thành công. Không lặp lại thao tác lưu gây treo.

## Cô lập bước làm thay đổi chữ và bố cục

1. **Nhập `.doc` vào DOCX LibreOffice:** chín DOCX tạo thành công; Word COM đọc lại giữ số trang/đoạn Word, shape và hình nội dòng nguồn. DOCX XML của `legacy06` chứa “Độc lập”, `legacy13` chứa liền “CÔNG TY”, `legacy20` chứa liền “Tel”. Không có bằng chứng rằng bộ nhập `.doc` đã làm hỏng ba cụm này.
2. **Xuất DOCX/FODT sang HTML:** lỗi chữ đã có trong HTML thô do bộ lọc `HTML (StarWriter)`, trước JS `_normalizeImportedHtml`. Cùng lỗi lặp ở ít nhất ba tài liệu độc lập: `legacy06` → “Đ ộc lập”; `legacy13` → ngắt dòng sau “C”; `legacy20` → “T el”. Chuyển DOCX sang HTML và FODT sang HTML cho cùng kết quả ở cả ba. FODT HTML của `legacy20` còn giảm ảnh từ 2 xuống 1. Do đó đổi DOCX trung gian sang FODT không an toàn và không sửa lỗi chữ.
3. **Layout app:** A và C cho cùng số trang; app thêm một trang ở 06/13/14/20 trong lượt này dù Word đọc DOCX LibreOffice vẫn khớp nguồn. Sai khác trang nằm sau bộ lọc HTML, ở đầu ra HTML/chuẩn hóa hoặc layout phân trang app; ảnh hiện chưa cho bằng chứng đủ tách riêng hai tiểu bước. App lặp lại đúng lỗi chữ đã tồn tại trong HTML thô.

### Quyết định sửa mã

Lỗi chữ tái diễn ≥3 tệp, nhưng chưa có bộ lọc/đường thay thế an toàn: FODT không sửa chữ và còn mất một ảnh ở legacy20; DOCX A/C không khác đầu ra app. Không thêm bản vá đoán theo cụm từ hoặc sửa chung khoảng trắng, vì có thể ghép sai run hợp lệ trong các tài liệu khác. Không sửa mã trong Q53.

Đề xuất phiếu tiếp theo: tạo fixture tổng hợp nhỏ có các run tiếng Việt/shape như ba ca trên; đánh giá một importer có VNO flag và fallback, đối chiếu DOM/ảnh/đoạn/trang với nguồn OOXML. Chỉ bật nếu cải thiện ≥3 ca, giữ cả 20 `.doc`, 8 DOCX nhỏ, 27 XLSX LAN và vòng `.xls` 20/20. FODT không được chọn làm fallback theo bằng chứng Q53.

## Ảnh và kiểm tra giao diện

Ảnh CDP 1366×768 ở `E:\VNOffice-briefs\logs\Q53-work\screens\legacy06-A.png` … `legacy20-C.png` (18 màn hình); contact sheet `contact-A.png`, `contact-C.png`. Đã mở và xem cả hai contact sheet ở độ phân giải gốc, bao phủ từng ảnh.

- 9 màn hình đường A và 9 màn hình đường C: ribbon, thanh cảnh báo định dạng cũ, vùng tài liệu và thanh trạng thái hiển thị; nút “Lưu thành .docx” nằm trọn, không thấy nút bị che/cắt.
- **Lỗi nội dung nhìn thấy:** legacy06 hiển thị “Đ ộc lập”; legacy13 ngắt tên công ty ngay sau “C”; legacy14 dải đầu trang/logo đỏ chạm và đè sát phần chữ đầu trang; legacy20 chữ tiêu đề “HỌCTRƯỜNG TỒN” dính và dòng “Tel” ngắt. Ghi nhận vào báo cáo, chưa sửa vì là lỗi chuyển đổi tài liệu chứ không phải bố trí control của app.
- Cảnh báo và thông báo không mở hộp thoại riêng trong lượt này. Đường B bị chặn trước khi vào app UI do `.fodt` không được nhận dạng là loại tệp mở được.
- Bộ `.xls` bổ sung: đã xem ảnh CDP của `legacy01.xls`, `legacy02.xls`, `legacy03.xls`, `legacy04.xls`, `legacy05.xls`, `legacy06.xls`, `legacy07.xls`, `legacy08.xls`, `legacy09.xls`, `legacy10.xls`, `legacy11.xls`, `legacy12.xls`, `legacy13.xls`, `legacy14.xls`, `legacy15.xls`, `legacy16.xls`, `legacy17.xls`, `legacy18.xls`, `legacy19.xls`, `legacy20.xls` ở `E:\VNOffice-briefs\logs\Q53-work\xls-screens`; contact sheet `contact-1.png` và `contact-2.png` đã xem ở độ phân giải gốc. Thanh cảnh báo và nút `.xlsx` nằm trong viewport ở 20/20. Nội dung bảng/ô dài bị cắt theo độ rộng cột hoặc vùng nhìn; `legacy08.xls` hiển thị `#NAME?` (lỗi nội dung đã biết, không thay đổi bởi giao diện). Không thấy control/ribbon bị che hoặc tràn.

## Gate và trạng thái thực thi

| Gate | Kết quả |
|---|---|
| `git merge main` | PASS — Already up to date; `main` và HEAD cùng commit khi bắt đầu |
| Word COM nguồn 9 `.doc` | PASS — 9/9 ReadOnly; không treo; timeout 90 giây/tệp; PID Word cũ không bị chạm |
| LibreOffice DOCX/FODT | PASS — 18/18 chuyển đổi |
| CDP A/C + ảnh | PASS — 18/18 màn hình; B trực tiếp BLOCKED vì `.fodt` không hỗ trợ |
| `npm test` | PASS — 3793/3793 |
| i18n parity | PASS — VI=3174, EN=3174, thiếu=0 hai chiều |
| Checklist evidence | PASS — 3 checklist, 0 dòng bị hạ |
| `python -m pytest tests -q` | PASS — 1140 passed, 1 skipped |
| XLSX LAN (27) | PASS — 27/27 lưu được; LibreOffice diff=0, lint sạch; Excel COM BLOCKED; batch status BLOCKED do oracle bị chặn |
| DOCX nhỏ | PASS — 8/8; sửa thử PASS; số trang nguồn/bản lưu khớp |
| `.xls` 20 | PASS — CDP 20/20 lưu lại `.xls` CFB; cảnh báo và hình học 20/20 hợp lệ; Excel COM BLOCKED theo quy tắc |
| Build | NOT RUN — không thay đổi mã/build |

Test sửa lỗi trước/sau không áp dụng: không có sửa mã. Không đổi `command-definitions.js`/`strings-vi.js`, nên không chạy generator checklist.
