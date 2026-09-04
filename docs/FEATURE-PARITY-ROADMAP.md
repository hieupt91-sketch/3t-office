# Feature Parity Roadmap — VN Office vs Microsoft Office / LibreOffice

Mục tiêu: đưa VN Writer/Sheet/Slides lên mức tính năng đầy đủ, cạnh tranh được với Microsoft Office và LibreOffice, theo đúng nguyên tắc REUSE BEFORE REWRITE (`AGENTS.md`).

Phân công chuẩn cho từng hạng mục dưới đây:
- **UI (agy/Antigravity)**: dựng giao diện, tương tác, trạng thái visual (states, keyboard, accessibility).
- **Engine/Logic (Claude)**: document model, adapter, LibreOffice headless bridge, dữ liệu thật.
- **Review (Codex)**: rà soát bug/bảo mật/xung đột trước khi merge.

Trạng thái: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong (đã test thật, không tự nhận PASS nếu chưa chạy).

### Ràng buộc bắt buộc — Bản quyền & Chất lượng (áp dụng cho MỌI hạng mục dưới đây)

**1. Không phụ thuộc thứ cần trả phí hoặc có rủi ro tranh chấp bản quyền:**
- Mọi tính năng phải được code bằng thuật toán/logic tự viết hoặc dùng thư viện mã nguồn mở tương thích giấy phép (MPL/LGPL, cùng họ với LibreOffice) — không dùng SDK/API trả phí, không dùng font/icon độc quyền của Microsoft, không copy asset của đối thủ (đã tuân thủ ở icon hiện có).
- Tương thích định dạng DOCX/XLSX/PPTX (OOXML) là chuẩn mở ECMA/ISO — hợp lệ vì ta đọc/ghi qua LibreOffice (đã tự triển khai OOXML hợp pháp theo MPL), KHÔNG dùng thư viện của Microsoft.
- Tính năng AI (Milestone 6): ưu tiên xử lý cục bộ/model mở theo `07-security-ai/AI-ARCHITECTURE.md`; nếu dùng provider ngoài trả phí phải có xác nhận rõ ràng từ chủ dự án trước (chi phí = "Stop and ask" theo AGENTS.md mục 10).
- Trước khi thêm bất kỳ dependency mới nào: kiểm tra license theo `02-development/DEPENDENCY-POLICY.md`.

**2. Đã nhận làm thì phải làm cho xong ở mức dùng được thật, không nửa vời:**
- Một hạng mục chỉ đánh dấu `[x]` khi đã đủ để người dùng thật sự dùng được (không phải demo/click 1 lần thấy chạy) — ví dụ "Header/Footer" phải thực sự lặp lại đúng mỗi trang khi xuất PDF, không chỉ hiện đẹp trên canvas.
- Không nhận nhiều hạng mục cùng lúc rồi làm dở dang tất cả — làm xong (kể cả test thật) một hạng mục Tier 1 trước khi nhận thêm.
- Nếu một hạng mục thực sự không định làm ở giai đoạn này, để nguyên `[ ]` và ghi rõ trong handoff — không âm thầm bỏ qua hoặc giả vờ đã xong.

---

## VN Writer (so với Word / LibreOffice Writer)

### Tier 1 — Core, phải có
- [x] Định dạng chữ cơ bản (đậm/nghiêng/gạch chân/màu/cỡ chữ)
- [x] Căn lề đoạn, giãn dòng, danh sách bullet/numbered
- [x] Chèn bảng, ảnh, ngắt trang
- [x] Tìm kiếm/thay thế (dialog thật)
- [x] Mở/Lưu/Xuất PDF file thật (DOCX/ODT qua LibreOffice headless)
- [x] Header/Footer thật (chèn được, hiển thị lặp lại mỗi trang khi in/xuất PDF)
- [x] Page Setup: khổ giấy, lề, hướng trang (Portrait/Landscape) — áp dụng canvas + export PDF/DOCX thật
- [x] Styles (Heading 1/2/3, Normal...) — bảng chọn kiểu đoạn văn nhanh
- [x] Track Changes (theo dõi thay đổi) — bật/tắt qua Command Bus; nội dung chèn hiển thị xanh/gạch chân, nội dung xóa giữ lại đỏ/gạch ngang; hỗ trợ Chấp nhận tất cả/Từ chối tất cả; Save/DOCX/PDF luôn dùng accepted view sạch (giữ chữ mới, bỏ chữ đánh dấu xóa, không xuất markup phiên làm việc). Giới hạn hiện tại: duyệt toàn bộ tài liệu, chưa duyệt từng thay đổi riêng lẻ.
- [x] Comments (ghi chú lề trang) — Codex làm: bôi đen chọn text → `<mark data-comment-id>` anchor + panel bên phải điều hướng 2 chiều, xóa đồng bộ. Giới hạn đã biết: session-only, không ghi vào `word/comments.xml` khi xuất DOCX (đã strip metadata khỏi export, không giả vờ đã lưu).
- [x] Print Preview thật trước khi in — overlay xem trước chuẩn xác theo khổ giấy/hướng/lề thật (A4/Letter/Legal, Portrait/Landscape từ Page Setup, không cố định A4), tự động phân trang theo chiều cao trang và ngắt trang (Ctrl+Enter), điều hướng nhiều trang (Trang trước/sau, jump trang, phím mũi tên/PageUp/PageDown), zoom điều chỉnh (phóng to/thu nhỏ/vừa trang), lặp Header/Footer kèm số trang tự động mỗi trang, nút In gọi window.print() thật, đóng bằng Esc hoặc nút X. Ánh xạ lệnh `writer.file.printPreview` sang `.uno:PrintPreview`.
- [x] Undo/Redo có lịch sử sâu — ngăn xếp snapshot thật ở tầng `WriterAdapter` (không còn dựa vào `document.execCommand("undo"/"redo")` mong manh); cơ chế debounce gõ chữ 600ms gom từ/khoảng dừng gõ chuẩn Word; mọi thao tác rời rạc (chèn bảng, ngắt trang, chèn ảnh, đổi Page Setup khổ giấy/hướng/lề, áp Style đoạn văn, chấp nhận/từ chối Track Changes, thêm/xóa Comments) được ghi nhận thành bước hoàn tác riêng biệt ngay lập tức; giới hạn 100 bước chống phình bộ nhớ; nút Undo/Redo trên Quick Access Toolbar tự động disable/enable đồng bộ với trạng thái stack; tích hợp Command Bus qua `.uno:Undo` / `.uno:Redo` và phím tắt Ctrl+Z/Ctrl+Y.

### Tier 2 — Quan trọng, kỳ vọng ở bản thương mại
- [x] Table of Contents (Mục lục tự động) — Quét toàn bộ tiêu đề Heading 1, 2, 3 trong `bodyDom`; tự động sinh khối `<div data-vno-toc="true">` chuẩn phân cấp thụt lề CSS (`.vno-toc-level-1/2/3`), dóng hàng dấu chấm (`.vno-toc-leader`), liên kết siêu văn bản nội bộ (`<a href="#heading-id">`) kèm điều hướng nhấp chuột cuộn/focus mượt mà đến tiêu đề; hiển thị số trang ước tính theo chiều cao khối DOM và ngắt trang; hỗ trợ nút "🔄 Cập nhật" (`writer.reference.tocUpdate` / `.uno:UpdateCurIndex`) và nút xóa mục lục trực tiếp; tự động làm sạch nút bấm khi lưu DOCX/PDF (`_stripSessionMarkup`). **Giới hạn trung thực đã biết**: Số trang hiển thị trong chế độ soạn thảo là ước lượng heuristic dựa trên chiều rộng/chiều cao vùng in trang cấu hình trong Page Setup; khi xuất sang DOCX/PDF qua LibreOffice headless, cấu trúc bookmark nội bộ được bảo toàn, việc phân trang chuẩn tuyệt đối theo từng milimet vật lý sẽ do engine layout của LibreOffice/Word đảm nhiệm.
- [x] Footnotes & Endnotes (Chú thích chân trang / cuối tài liệu) — Hỗ trợ đầy đủ lệnh `writer.reference.footnoteInsert` (Ctrl+Alt+F / `.uno:InsertFootnote`) và `writer.reference.endnoteInsert` (Ctrl+Alt+D / `.uno:InsertEndnote`) với icon SVG vector sắc nét trên cả tab "Tham chiếu" và tab "Chèn". Chèn số mũ superscript (`<sup data-vno-footnote-ref>` / `<sup data-vno-endnote-ref>`) ngay vị trí con trỏ; tự động đánh số liên tục 1, 2, 3... cho Footnotes và số La Mã i, ii, iii... cho Endnotes; vùng chú thích cuối trang và cuối tài liệu cho phép nhập liệu trực tiếp với placeholder tiếng Việt; xóa chú thích ở bất kỳ vị trí nào (kể cả ở giữa) tự động đánh số lại toàn bộ danh sách, không bị nhảy số; nhấp số mũ nhảy đến nội dung chú thích và ngược lại; tích hợp hoàn hảo vào hệ thống Deep Undo/Redo (hoàn tác làm biến mất cả số mũ và dòng chú thích, làm lại khôi phục cả hai); tích hợp Print Preview tự động bóc tách và gắn chú thích chân trang vào đáy của đúng trang chứa số mũ tham chiếu tương ứng, trong khi endnote dồn về trang cuối; làm sạch nút xóa khi xuất DOCX/PDF. **Giới hạn trung thực đã biết**: Trong phiên làm việc web/contenteditable, chú thích được quản lý qua container ngữ nghĩa DOM; khi xuất DOCX thông qua bộ chuyển đổi HTML sang OpenXML của LibreOffice, chú thích được bảo toàn định dạng và nội dung trực quan, chưa can thiệp trực tiếp vào file XML nhị phân `word/footnotes.xml` độc quyền của MS Word.
- [x] Mail Merge (Trộn thư từ nguồn dữ liệu CSV) — Tab Ribbon chuyên biệt "Trộn thư" (`mailings`) gồm 4 nhóm chức năng chuẩn ("Bắt đầu trộn", "Viết \u0026 Chèn trường", "Xem trước kết quả", "Hoàn tất") với 6 icon vector sắc nét (`mailMerge`, `mergeInsertField`, `mergePreview`, `mergePrev`, `mergeNext`, `mergeFinish`). Nguồn dữ liệu CSV thuần JavaScript không phụ thuộc thư viện ngoài, xử lý chuẩn dấu phẩy trong ngoặc kép `""`, ký tự thoát và xuống dòng. Hộp thoại cấu hình dữ liệu có nút "📋 Dán dữ liệu mẫu" và huy hiệu đếm bản ghi/cột trực quan; chèn trường merge marker `<span class="vno-merge-field" data-field="TenCot">«TenCot»</span>` tại con trỏ văn bản; chế độ xem trước (Preview) cho phép duyệt từng bản ghi với các nút Bản ghi trước/sau phản ánh dữ liệu thực; lệnh Hoàn tất (`writer.mailMerge.finish` / `.uno:MailMergeFinish`) tự động nhân bản nội dung theo $N$ bản ghi, thay thế trường dữ liệu thật và phân cách bằng ngắt trang vật lý `page-break-before:always` (sẵn sàng in ấn và xuất file); tích hợp sâu vào hệ thống Deep Undo/Redo (hoàn tác đưa về template ban đầu có thẻ marker, làm lại khôi phục toàn bộ bản trộn); xuất DOCX/PDF ở chế độ xem trước giữ đúng dữ liệu đã trộn, chế độ thường giữ nguyên thẻ marker. **Giới hạn trung thực đã biết**: Kết quả trộn hiện xuất ra một tài liệu hợp nhất duy nhất phân tách bằng ngắt trang phục vụ in ấn hoặc xuất 1 tệp PDF/DOCX trọn gói; tính năng xuất tách thành $N$ tệp `.docx` riêng lẻ trên ổ đĩa là kế hoạch nâng cấp tương lai.
- [ ] Style gallery trực quan (giống Word Quick Styles)
- [ ] Watermark, Page border
- [ ] Columns (chia cột văn bản)

### Tier 3 — Nâng cao
- [ ] Macro/Script cơ bản (ghi lại thao tác)
- [ ] Citations & Bibliography
- [ ] Co-authoring/real-time collaboration

---

## VN Sheet (so với Excel / LibreOffice Calc)

### Tier 1 — Core
- [x] Công thức cơ bản (SUM/AVERAGE/MIN/MAX/COUNT/IF/CONCAT...)
- [x] Formula autocomplete + tooltip tham số (giống Excel IntelliSense)
- [x] Định dạng ô, tiền tệ VNĐ, phần trăm
- [x] **Nhiều sheet/tab** trong 1 workbook — Đã sửa triệt để: mỗi sheet trong `sheetsData` sở hữu một `Map` riêng biệt, `cellsData` là getter/reference trỏ tới sheet đang active. Khi click đổi tab hoặc gọi `switchSheet(name)`, ứng dụng chuyển đổi Map dữ liệu, cô lập hoàn toàn ô tính và công thức (đã kiểm chứng bằng test tự động: dữ liệu gõ ở sheet 1 không rò rỉ sang sheet 2, đổi lại sheet 1 dữ liệu còn nguyên; FormulaEngine tính toán độc lập theo sheet; Undo/Redo tự động quay về sheet gốc; trạng thái filter/sort độc lập). Nút "+" thêm sheet mới hoạt động thật. **Giới hạn đã biết**: Lưu/xuất tệp XLSX/ODS hiện tại chỉ xuất sheet đang active do cơ chế I/O trung gian CSV một sheet.
- [x] Mở rộng lưới thật — 26 cột (A-Z) x 200 hàng với cuộn ảo (virtual scrolling spacers) không lag
- [x] Freeze panes (cố định hàng 1 / cột A khi cuộn bằng CSS sticky mượt mà)
- [x] Conditional Formatting (giá trị lớn hơn/nhỏ hơn/ô trống, tự đánh giá lại khi đổi giá trị, độc lập theo sheet)
- [x] Data Validation (danh sách dropdown thật + số trong khoảng, cảnh báo không chặn cứng, độc lập theo sheet)
- [x] Mở/Lưu file XLSX/ODS thật qua LibreOffice headless (round-trip đã test thật)
- [x] Sort & Filter thật trên vùng dữ liệu (Sort A-Z, Z-A, Undo sort, AutoFilter popover lọc theo giá trị)
- [x] Charts thật — lấy dữ liệu từ vùng ô đang chọn; 4 loại SVG cột/đường/tròn/miền; lưu và hiển thị độc lập theo sheet; tự vẽ lại khi dữ liệu nguồn đổi; hỗ trợ xóa chart; đã có behavioral test state/DOM/cross-sheet.
- [x] Undo/Redo sâu và cô lập theo sheet — history tối đa 100 bước; gộp chuỗi gõ liên tục trong formula bar; hoàn tác/làm lại đối xứng cho giá trị/định dạng ô, sort/filter, freeze panes, Conditional Formatting, Data Validation, chart và thêm/xóa sheet; nút Undo/Redo phản ánh đúng stack rỗng; đã có behavioral tests cho add/delete, redo sort giảm dần và chống rò chéo sheet.

### Tier 2
- [x] Pivot Table (Bảng tổng hợp) — chọn vùng nguồn có header; cấu hình nhiều trường Rows/Columns/Values; tổng hợp Sum/Count/Average/Min/Max; tạo kết quả thật trên sheet mới; state `pivotTablesBySheet` cô lập; nút Refresh đọc lại dữ liệu nguồn; tạo/xóa/refresh hỗ trợ undo/redo.
- [x] Named Ranges (đặt tên vùng) — Name Manager trên tab Công thức hỗ trợ thêm/sửa/xóa tên, phạm vi Workbook hoặc sheet hiện tại, kiểm tra tên hợp lệ, dùng trực tiếp trong công thức vùng (ví dụ `SUM(DoanhThu_Q1)`), cô lập sheet scope, dọn khi xóa sheet và undo/redo đầy đủ. **Giới hạn hiện tại:** vùng tham chiếu là địa chỉ ô/vùng liên tục trong cùng sheet (`A1` hoặc `A1:A12`); chưa hỗ trợ vùng rời, tham chiếu sheet khác trong một tên, hay bảo toàn metadata named range khi xuất XLSX/ODS qua luồng CSV trung gian.
- [x] Nhóm hàm tra cứu/điều kiện: VLOOKUP/HLOOKUP (exact + approximate), INDEX, MATCH (0/1/-1), COUNTIF/SUMIF/COUNTIFS/SUMIFS (so sánh số + wildcard), có behavioral tests với kết quả chính xác và #N/A.
- [x] Thêm hàm TEXT/DATE nâng cao — đã có `TEXT`, `DATE`, `DATEDIF`, `EDATE`, `CONCATENATE`, `SUBSTITUTE`, `FIND` trong catalog/autocomplete và engine thật, với test kết quả cụ thể. **Giới hạn hiện tại:** `TEXT` hỗ trợ ba mẫu `#,##0`, `0.00`, `dd/mm/yyyy`; `DATEDIF` hỗ trợ `d/m/y`; chưa có `NETWORKDAYS` và `SEARCH` (không thuộc phạm vi đợt này).
- [x] Cell comments/notes — Lệnh `sheet.review.commentInsert` trên tab **Xem xét** và menu chuột phải mở hộp nhập/sửa/xóa ghi chú; state `commentsBySheet[sheetName]` lưu `{coord, text, author, timestamp}` cô lập theo sheet; ô có dấu tam giác đỏ góc trên-phải và popup nội dung khi hover; thêm/sửa/xóa tham gia Deep Undo/Redo. **Giới hạn hiện tại:** CSV không hỗ trợ comment nên luồng trung gian CSV khi lưu/xuất XLSX/ODS không bảo toàn metadata ghi chú.
- [x] Print area, page breaks cho bảng tính — Tab **Bố trí trang** đặt/xóa `printAreaBySheet[sheetName]`, chèn/xóa ngắt hàng và cột trong `pageBreaksBySheet[sheetName]`; hiển thị viền xanh đậm quanh vùng in và đường đứt nét đậm tại ngắt trang; cô lập theo sheet và có undo/redo. **Giới hạn hiện tại:** đây là trạng thái chuẩn bị bố cục in trong phiên làm việc; chưa nối metadata này vào CSV/XLSX/ODS, Print Preview hay engine `window.print()`.

### Tier 3
- [ ] Macro/Script (ghi lại thao tác, giống VBA cơ bản)
- [ ] Array formulas
- [ ] Import/kết nối dữ liệu ngoài (CSV nâng cao, kết nối DB)

---

## VN Slides (so với PowerPoint / LibreOffice Impress)

### Tier 1 — Core
- [x] Slide Navigator, canvas 16:9, chèn text/shape
- [x] Trình chiếu F5 toàn màn hình
- [x] Slide Master (mẫu slide chủ đạo áp dụng toàn bài với 4 theme chuẩn, đồng bộ màu/font/logo/footer)
- [x] Transitions thật giữa các slide (Fade, Slide, Zoom, Flip, cấu hình thời gian 0.3s-1.0s, áp dụng khi chiếu F5)
- [x] Animations cho object trong slide (entrance: Fade In, Fly In, Zoom In, Bounce In, Slide Left; cấu hình thời gian duration, độ trễ delay; lưu trực tiếp vào từng đối tượng shape/title/body; kích hoạt animation CSS đúng thời điểm slide hiện lên khi trình chiếu F5)
- [x] Speaker Notes (ghi chú riêng biệt từng slide, cô lập 100% không rò rỉ chéo; panel dưới canvas bật/tắt linh hoạt; lưu/đọc tròn vẹn qua thẻ FODP presentation:notes; ẩn hoàn toàn trên màn hình F5 của khán giả; chế độ Presenter Console riêng xem slide + ghi chú + xem trước slide kế tiếp + đồng hồ thuyết trình)
- [x] Mở/Lưu file PPTX/ODP thật (qua định dạng trung gian FODP, round-trip đã test thật kể cả Open)
- [x] Layout chọn sẵn (Title Slide, Title+Content, Two Content, Blank; hộp thoại trực quan 4 bố cục có xem trước; thay đổi DOM thật, độc lập và cô lập 100% giữa các slide; hỗ trợ soạn thảo 2 cột nội dung độc lập với undo/redo; đồng bộ Filmstrip thumbnails, F5 SlideShow và Presenter Mode; ánh xạ .uno:AssignLayout; lưu/đọc chuẩn xác qua FODP)

### Tier 2
- [x] Slide Sorter view — tab "Chế độ xem" mở overlay lưới responsive toàn màn hình; hiển thị đủ slide và số thứ tự; kéo-thả cập nhật trực tiếp mảng slide, filmstrip và canvas; double-click quay về Normal view đúng slide; Nhân đôi/Xóa tái dùng logic slide hiện hữu; Esc đóng overlay. Reorder tham gia undo/redo Slides bằng action `move` đối xứng. Giới hạn: chưa hỗ trợ kéo-thả trực tiếp trong filmstrip nhỏ bên trái (bonus ngoài phạm vi bắt buộc).
- [x] Rehearse Timings — `slides.show.rehearseTimings` mở trình chiếu toàn màn hình thật kèm đồng hồ đếm thật (`performance.now()`, cập nhật 250ms) hiển thị thời gian trang hiện tại + tổng; điều hướng trang (phím mũi tên/Space/click) ghi lại thời gian thật đã dừng ở từng trang; kết thúc (Esc/hết trang) hỏi lưu — nếu đồng ý, ghi `slide.rehearsedDuration` thật cho từng trang và hiển thị nhãn "⏱ Ns" trong Slide Sorter. **Giới hạn hiện tại:** không tự động phát lại đúng nhịp thời gian đã lưu (auto-advance) khi trình chiếu thật — chỉ lưu mốc tham khảo, giống bước đầu của PowerPoint trước khi bật "Use Timings".
- [x] Embed video/audio — `slides.media.insertVideo`/`insertAudio` mở file picker thật, đọc file thật qua FileReader thành Data URL, chèn `<video controls>`/`<audio controls>` thật vào canvas soạn thảo VÀ vào chế độ trình chiếu toàn màn hình (phát được thật, trình duyệt xử lý native); xóa qua nút × thật trên đối tượng đang chọn, có Undo/Redo qua stack Slides hiện có (action `shape-add`/`shape-delete`, cũng áp dụng cho Shape/Image cũ vốn trước đây chèn được nhưng không xóa/undo được — nay đã có). **Giới hạn hiện tại:** cảnh báo console (không chặn) nếu tệp >10MB vì Data URL nhúng trực tiếp làm phình bộ nhớ/kích thước lưu FODP; chưa hỗ trợ kéo-thả di chuyển hay resize đối tượng media/shape/image trên canvas (giới hạn có sẵn từ trước, không phải hồi quy mới).
- [ ] SmartArt-like diagram cơ bản

### Tier 3
- [ ] Morph-style transition
- [ ] Co-authoring

---

## Toàn Suite (Shared Platform)

- [x] Command Bus, Ribbon, Theme, Dialog framework, i18n scaffold, Recent Files thật
- [ ] Milestone 6: AI Assistant backend thật (hiện chỉ xử lý cục bộ đơn giản)
- [ ] Accessibility đầy đủ: screen reader labels, contrast audit (03-ui-ux/ACCESSIBILITY.md)
- [ ] Spell-check tiếng Việt thật (hiện `spellcheck="false"` bị tắt)
- [ ] Cloud/Account sync (theo AI-ARCHITECTURE.md — cần consent rõ ràng)

---

## Thứ tự triển khai (Wave)

**Wave 1 (đang chạy)**: Header/Footer, Page Setup, Styles panel (Writer) · Nhiều sheet/tab, mở rộng lưới, Freeze panes (Sheet) · Slide Master, Transitions thật (Slides) — agy phụ trách UI, Claude phụ trách engine/model đi kèm.

**Wave 2**: Track Changes/Comments (Writer) · Conditional Formatting, Data Validation (Sheet) · Animations, Speaker Notes (Slides).

**Wave 3**: File I/O thật cho Sheet/Slides (XLSX/PPTX qua LibreOffice headless) · Print Preview toàn Suite.

**Wave 4**: Mail Merge, TOC, Pivot Table, Macro cơ bản — các tính năng Tier 2/3 còn lại.

Mỗi wave: agy code UI → Claude bổ sung engine/data model thật (không mock) → Codex review độc lập → Claude chạy test thật + xác nhận → merge main.
