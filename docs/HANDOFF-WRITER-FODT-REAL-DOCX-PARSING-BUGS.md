# Bàn giao: Hai lỗi thật trong Writer parseFodt() phát hiện qua vòng chuyển đổi DOCX thật

## 1. Bối cảnh

Sau khi sửa lỗi Page Setup thật của Sheet (xem docs/HANDOFF-SHEET-PAGESETUP-REAL-FILE-PARSING.md), Claude tiếp tục áp dụng cùng phương pháp kiểm tra thực tế cho Writer: dựng một Page Setup cụ thể (Letter, Ngang, lề tùy chỉnh), lưu ra FODT, chuyển đổi bằng LibreOffice thật thành DOCX thật, rồi chuyển ngược DOCX đó về FODT để mô phỏng chính xác một file DOCX thật, và đưa qua `parseFodt()`.

Phát hiện: `parseFodt()` báo lỗi và TỪ CHỐI xử lý hoàn toàn, với hai lỗi khác nhau xuất hiện tuần tự sau khi sửa lỗi trước.

**Lưu ý quan trọng về mức độ ảnh hưởng thực tế**: `parseFodt()` hiện KHÔNG nằm trên luồng "Mở file .docx thật" của production — `main.py` dùng `target_ext = "html"` cho Writer (không phải "fodt"), nghĩa là mở file .docx/.doc thật hiện đi qua đường HTML, không chạm `parseFodt()`. Tuy nhiên `parseFodt()` là hạ tầng cốt lõi mà TOÀN BỘ các bài kiểm thử Phase A đến E4 (hàng trăm test) dựa vào để xác nhận `serializeToFodt()` ghi ra đúng — nếu `parseFodt()` không thể đọc đúng một FODT có cấu trúc mà LibreOffice thật thường ghi ra (không phải chỉ cấu trúc do chính VN Office tự viết), đây là một lỗ hổng thật trong nền tảng kiểm thử, và sẽ chặn bất kỳ tính năng tương lai nào thật sự dùng `parseFodt()` để mở file ODF/DOCX thật trực tiếp. Sửa lỗi này là công việc phòng ngừa có giá trị thật, không phải sửa một lỗi ảnh hưởng người dùng ngay lập tức.

## 2. Lỗi 1: `_fodtParsePageLayouts()` khớp nhầm `<style:page-layout-properties>` là `<style:page-layout>`

Regex gốc: `/<style:page-layout\b([^>]*)>([\s\S]*?)<\/style:page-layout>/gi`.

JavaScript coi dấu gạch ngang `-` là ký tự KHÔNG thuộc từ (non-word character), nên `\b` (ranh giới từ) sau "page-layout" VẪN ĐƯỢC THỎA MÃN ngay trước một dấu `-` tiếp theo. Điều này khiến regex khớp NHẦM với `<style:page-layout-properties ...>` — một thẻ hoàn toàn khác, thường xuất hiện ĐỨNG LẺ (là con của một `style:style` khác, ví dụ style đoạn văn "Standard" có `style:layout-grid-standard-mode`) TRƯỚC block `<style:page-layout style:name="pm1">...</style:page-layout>` thật trong FODT do LibreOffice thật ghi ra khi chuyển đổi DOCX.

Khi khớp nhầm thẻ đứng lẻ (thường tự đóng bằng `/>`) làm "thẻ mở", phần `([\s\S]*?)` (khớp lười) tiếp tục quét tới TAG ĐÓNG THẬT SỰ ĐẦU TIÊN nó tìm thấy — chính là `</style:page-layout>` của block `pm1` thật phía sau — nuốt trọn cả block `pm1` thật làm "nội dung" của một khớp sai, khiến `pm1` KHÔNG BAO GIỜ được thêm vào Map layouts. Khi `style:master-page` sau đó tham chiếu `pm1`, code báo "page-layout không biết" dù file hoàn toàn hợp lệ.

**Cách sửa**: đổi `\b` thành `(?=[\s>/])` (positive lookahead yêu cầu ký tự tiếp theo là khoảng trắng, `>`, hoặc `/`) — đúng quy ước đã có sẵn trong dự án (`sheet-adapter.js` dùng chính xác `(?=[\s>/])` cho `<table:table` để phân biệt với `<table:table-column>`/`<table:table-row>`). `_fodtParsePageLayouts()` là nơi DUY NHẤT trong writer-adapter.js dùng mẫu `\b` không an toàn này cho "page-layout"; các mẫu `\b` khác (`office:master-styles`, `style:master-page`) không có nguy cơ tương tự vì không có thẻ ODF thật nào nối dài tên bằng dấu gạch ngang.

## 3. Lỗi 2: `parseFodt()` báo "chưa hỗ trợ" với `text:sequence-decls`

`text:sequence-decls` là khai báo chuẩn ODF cho các nhóm đánh số chú thích (Illustration/Table/Text/Drawing/Figure) — LibreOffice LUÔN ghi phần tử này làm CON ĐẦU TIÊN của `<office:text>` khi chuyển đổi TỪ DOCX, kể cả khi tài liệu không hề dùng chú thích nào. Bộ lọc block-con của `parseFodt()` trước đây coi mọi phần tử lạ là lỗi cứng ("chưa hỗ trợ") theo đúng triết lý an toàn "thà báo lỗi còn hơn đoán sai" của Writer Phase A — nhưng chưa từng liệt `text:sequence-decls` vào danh sách phần tử ĐÃ BIẾT LÀ VÔ HẠI để bỏ qua.

**Cách sửa**: thêm một điều kiện bỏ qua (`continue`) rõ ràng cho `text:sequence-decls` ngay tại vòng lặp lọc children của `office:text`, cùng cấp với việc lọc `#text` rỗng và xử lý `text:tracked-changes` đã có — đây KHÔNG phải nới lỏng nguyên tắc an toàn (Writer vẫn báo lỗi cứng với MỌI phần tử lạ khác nó chưa từng thấy), chỉ là công nhận một phần tử THUẦN KHAI BÁO, không mang nội dung người dùng, là an toàn để bỏ qua.

## 4. Vì sao chưa từng bị phát hiện trước đây

Toàn bộ ~100+ bài test Phase A-E hiện có đều tự-round-trip nội dung DO CHÍNH `serializeToFodt()` VIẾT RA (không đi qua một vòng chuyển đổi DOCX thật nào), nên FODT test luôn có cấu trúc "sạch" y hệt những gì `serializeToFodt()` tự viết: không có `<style:page-layout-properties>` đứng lẻ trước layout thật, và không có `text:sequence-decls`. Cả hai lỗi CHỈ xuất hiện khi FODT đến từ một vòng chuyển đổi DOCX thật qua LibreOffice — chính lý do Claude phát hiện ra chúng lần này, vì lần đầu tiên trong phiên làm việc test thực hiện đúng vòng "FODT tự viết → DOCX thật → FODT thật → parseFodt()" thay vì tự-round-trip nội bộ.

## 5. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1364/1364 PASS (1359 nền + 5 test mới trong suite 124, gồm cả một test xác nhận parseFodt() VẪN báo lỗi đúng khi một page-layout THỰC SỰ không tồn tại — không nuốt lỗi thật cùng lúc sửa lỗi giả).
- `node tests/live/writer-fodt-docx-real-conversion.mjs` (mới): đi hết vòng FODT → DOCX thật (LibreOffice) → FODT thật → parseFodt() thật, xác nhận Page Setup (hướng trang/khổ giấy/lề) và nội dung văn bản đều sống sót qua vòng chuyển đổi THẬT.

## 6. Phạm vi thay đổi

Chỉ 2 thay đổi tối thiểu trong `adapters/libreoffice/writer/writer-adapter.js`:
- `_fodtParsePageLayouts()`: đổi `\b` thành `(?=[\s>/])`.
- Vòng lặp lọc `bodyNodes` trong `parseFodt()`: thêm nhánh bỏ qua `text:sequence-decls`.

Không đụng đến bất kỳ logic serialize (`serializeToFodt()`) nào, không thay đổi hành vi của bất kỳ tính năng Phase A-E nào khác — toàn bộ 1359 test nền trước đó vẫn PASS nguyên vẹn.
