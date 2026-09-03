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
- [ ] Track Changes (theo dõi thay đổi) — tối thiểu: bật/tắt, hiển thị insert/delete có màu
- [x] Comments (ghi chú lề trang) — Codex làm: bôi đen chọn text → `<mark data-comment-id>` anchor + panel bên phải điều hướng 2 chiều, xóa đồng bộ. Giới hạn đã biết: session-only, không ghi vào `word/comments.xml` khi xuất DOCX (đã strip metadata khỏi export, không giả vờ đã lưu).
- [ ] Print Preview thật trước khi in
- [x] Word/Character count đầy đủ (đã có đếm từ realtime — mở rộng: ký tự, đoạn, trang)
- [ ] Undo/Redo có lịch sử sâu (không chỉ execCommand undo của trình duyệt)

### Tier 2 — Quan trọng, kỳ vọng ở bản thương mại
- [ ] Table of Contents (Mục lục tự động)
- [ ] Footnotes/Endnotes (chú thích cuối trang/cuối bài)
- [ ] Mail Merge (trộn thư)
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
- [ ] Conditional Formatting (định dạng có điều kiện) — VẪN CÒN THIẾU
- [ ] Data Validation (kiểm tra dữ liệu nhập, dropdown list) — VẪN CÒN THIẾU
- [x] Mở/Lưu file XLSX/ODS thật qua LibreOffice headless (round-trip đã test thật)
- [x] Sort & Filter thật trên vùng dữ liệu (Sort A-Z, Z-A, Undo sort, AutoFilter popover lọc theo giá trị)
- [ ] Charts thật (đã có SVG chart — mở rộng loại: cột/đường/tròn/miền)
- [ ] Undo/Redo sâu hơn (đã có stack cơ bản — cần test edge case)

### Tier 2
- [ ] Pivot Table (Bảng tổng hợp)
- [ ] Named Ranges (đặt tên vùng)
- [ ] Thêm hàm: VLOOKUP/HLOOKUP/INDEX/MATCH/COUNTIF/SUMIF/TEXT/DATE functions
- [ ] Cell comments/notes
- [ ] Print area, page breaks cho bảng tính

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
- [ ] Animations cho object trong slide (entrance/exit/emphasis)
- [ ] Speaker Notes (ghi chú cho người thuyết trình, hiện khi trình chiếu chế độ Presenter)
- [x] Mở/Lưu file PPTX/ODP thật (qua định dạng trung gian FODP, round-trip đã test thật kể cả Open)
- [ ] Layout chọn sẵn (Title Slide, Title+Content, Two Content...)

### Tier 2
- [ ] Slide Sorter view (xem lưới toàn bộ slide, kéo thả sắp xếp)
- [ ] Rehearse Timings
- [ ] Embed video/audio
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
