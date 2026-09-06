# Bàn giao: Sửa lỗi thật — Page Setup của file thật bị âm thầm reset khi mở qua VN Office

## 1. Cách phát hiện

Trong lúc kiểm tra thực tế tính năng Print Preview vừa hoàn thành (theo yêu cầu "kiểm tra file xuất ra mở trên Microsoft Office rồi đối chiếu"), Claude viết một kịch bản kiểm thử thật: tạo một trang tính có Page Setup đầy đủ (Lề, Hướng trang Ngang, Tỷ lệ 85%, Căn giữa trang, Tiêu đề in, In đường lưới/tiêu đề), lưu ra FODS, chuyển đổi bằng LibreOffice thật thành XLSX thật, rồi chuyển ngược XLSX đó về FODS để mô phỏng chính xác việc "mở một file thật" — và đưa file đó qua `parseFods()` của VN Office.

Kết quả: Hướng trang, Lề, Tỷ lệ, Căn giữa trang đều bị **reset hoàn toàn về giá trị mặc định** (Dọc, lề NĐ 30/2020, 100%, không căn giữa) dù dữ liệu đúng vẫn còn nguyên trong file. Xác nhận bằng cách đọc trực tiếp XML: dữ liệu Page Setup THẬT VẪN CÒN trong FODS được đưa vào — vấn đề nằm ở chính `parseFods()` của VN Office không đọc được nó.

## 2. Nguyên nhân gốc

`parseFods()` (cả hai nhánh: DOM-based khi có `DOMParser`, và regex-based khi không có — VD trong Node test/probe scripts) chỉ đọc Page Setup từ các thuộc tính **riêng, không chuẩn ODF** mà chính VN Office tự đặt ra: `vno:page-margins`, `vno:page-scale`, `vno:page-orientation`, `vno:page-size`, `vno:page-centering`, `vno:page-print-options` (mỗi cái là một chuỗi JSON gắn trực tiếp lên phần tử `<table:table>`).

Các thuộc tính `vno:*` này CHỈ tồn tại khi CHÍNH VN Office ghi ra file VÀ file đó CHƯA từng đi qua bất kỳ vòng chuyển đổi thật nào — vì LibreOffice/Excel không giữ lại thuộc tính lạ (không thuộc chuẩn ODF) khi convert. Điều này có nghĩa:

- Người dùng mở một file XLSX/ODS bất kỳ từ Excel thật, từ đồng nghiệp, từ Internet: KHÔNG có thuộc tính `vno:*` → Page Setup của họ bị mất trắng.
- Người dùng lưu file bằng VN Office rồi mở lại bằng LibreOffice thật để chỉnh sửa gì đó, sau đó mở lại bằng VN Office: thuộc tính `vno:*` đã bị LibreOffice loại bỏ trong vòng chuyển đổi → mất trắng.
- Chỉ trường hợp lưu rồi mở lại NGAY BẰNG CHÍNH VN Office, không qua công cụ nào khác, mới giữ được Page Setup — một trường hợp hẹp, không đại diện cho cách người dùng thực tế làm việc.

Đây chính xác là loại lỗi người dùng đã cảnh báo trước: "tránh các file người dùng đang sử dụng mở qua ứng dụng của mình bị lỗi."

## 3. Cách sửa

Thêm `_parseStandardOdfPageLayout(xml, tableStyleName)` (và 3 hàm phụ trợ `_parseTagAttrs`, `_findTagAttrsByAttr`, `_odfLengthToCm`) trong `adapters/libreoffice/sheet/sheet-adapter.js`: đọc Page Setup theo đúng chuẩn ODF thật mà MỌI file ODF/FODS hợp lệ đều có, đi theo đúng chuỗi liên kết chuẩn:

```
table:style-name (trên <table:table>)
  -> style:style[style:name][style:master-page-name]
    -> style:master-page[style:name][style:page-layout-name]
      -> style:page-layout[style:name] > style:page-layout-properties
```

Từ `style:page-layout-properties` đọc được: `style:print-orientation`, `fo:margin-top/bottom/left/right` (quy đổi cm/mm/in/pt/px về cm — không giả định luôn là cm dù LibreOffice thường ghi cm), `style:scale-to` (phần trăm), `style:table-centering` (horizontal/vertical/both/none), `style:print` (chuỗi token cách nhau bởi dấu cách — đọc "grid"/"headers" cho In đường lưới/tiêu đề), và ước lượng khổ giấy (A4/Letter/Legal) từ `fo:page-width`/`fo:page-height` thật bằng cách so khớp gần đúng với kích thước mm chuẩn của từng khổ.

Cả hai nhánh `parseFods()` (DOM và regex) đều được sửa để **xếp lớp ưu tiên**: `vno:page-*` (nếu có, giữ độ chính xác tuyệt đối cho trường hợp tự-round-trip nội bộ) → `_parseStandardOdfPageLayout()` (chuẩn ODF thật, áp dụng cho MỌI file) → giá trị mặc định của app. Nhờ vậy file tự ghi ra vẫn giữ được độ chính xác tuyệt đối (kể cả phân biệt chế độ scale "percent" và "pages" mà ODF chuẩn không biểu diễn tách bạch), còn file thật từ bên ngoài giờ đọc đúng theo chuẩn ODF thay vì bị bỏ qua hoàn toàn.

## 4. Giới hạn còn lại (GAP thật, không che giấu)

- **Print Titles (Tiêu đề in) vẫn CHƯA khôi phục được từ file thật.** ODF chuẩn không biểu diễn Tiêu đề in bằng một thuộc tính đơn giản như VN Office đang làm (`vno:print-title-rows/cols`) — nó dùng phần tử cấu trúc `<table:table-header-rows>`/`<table:table-header-columns>` bọc quanh chính các `<table:table-row>`/cột cần lặp lại, đòi hỏi thay đổi cách phân tích cấu trúc bảng (không chỉ đọc thuộc tính). Phạm vi sửa lỗi này tập trung vào Lề/Hướng trang/Tỷ lệ/Căn giữa trang — nhóm ảnh hưởng rộng nhất; Tiêu đề in cần một đợt sửa riêng, đã ghi nhận rõ ràng cho vòng sau, không tự bịa cách đọc.
- **In đường lưới/tiêu đề (gridlines/headings) vẫn có thể mất khi đi qua vòng chuyển đổi XLSX thật** — nhưng đây KHÔNG PHẢI lỗi của VN Office: đã xác nhận trực tiếp bằng cách đọc FODS do chính VN Office ghi ra (có đủ token "grid headers" trong `style:print`), sau đó theo dõi qua vòng chuyển đổi thật sang XLSX — chính LibreOffice tự làm mất hai token này khi convert (XLSX kết quả có `<printOptions headings="false" gridLines="false".../>` dù nguồn có đủ), một giới hạn của bản thân công cụ chuyển đổi LibreOffice, nằm ngoài khả năng kiểm soát của VN Office.
- Lề có sai số nhỏ (khoảng 0.1-0.25cm) so với giá trị gốc sau một vòng chuyển đổi XLSX thật, do LibreOffice tự điều chỉnh khoảng trống dành cho header/footer khi convert — không phải lỗi đọc sai, xác nhận bằng cách đọc trực tiếp giá trị `fo:margin-top` thật trong FODS trung gian và thấy `_parseStandardOdfPageLayout()` đọc đúng CHÍNH XÁC giá trị đó.

## 5. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1359/1359 PASS (1352 nền + 7 test mới trong suite 123, gồm cả một test xác nhận file tự-round-trip của chính VN Office vẫn giữ độ chính xác tuyệt đối, không bị fallback ODF chuẩn ghi đè).
- `node tests/live/sheet-fods-pagesetup-real-conversion.mjs` (mới): đi hết vòng FODS → XLSX thật (LibreOffice) → FODS thật, xác nhận Hướng trang/Lề/Tỷ lệ/Căn giữa trang sống sót qua vòng chuyển đổi THẬT, không phải tự-round-trip nội bộ.
- Đã mở file XLSX thật (kết quả chuyển đổi) bằng chính Microsoft Excel thật đã cài trên máy (`C:\Program Files\Microsoft Office\Office16\EXCEL.EXE`) qua `Start-Process` thụ động: mở sạch, cửa sổ phản hồi bình thường, không có hộp thoại sửa lỗi/khôi phục — xác nhận file không bị hỏng cấu trúc.
