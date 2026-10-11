# Bàn giao: VN Writer — Placeholder gợi ý đầu/chân trang bị rò rỉ vào bản in thật

## 1. Bối cảnh & lỗi thật

Người dùng phản ánh trực tiếp: khi bấm "In tài liệu" với đầu trang/chân trang còn để trống, dòng chữ gợi ý ("Nhấp để nhập tiêu đề đầu trang (Header)...") — vốn chỉ để hỗ trợ khi đang soạn thảo — lại bị in ra như nội dung thật.

## 2. Nguyên nhân xác nhận

- `apps/writer/writer.css`: `.vno-writer-header:empty::before` / `.vno-writer-footer:empty::before` / `.vno-note-text:empty::before` hiển thị placeholder qua CSS `content: attr(data-placeholder)` — kỹ thuật đúng chuẩn (pseudo-element, không phải nội dung DOM thật, nên `innerHTML`/`textContent` không bao giờ chứa nó).
- `adapters/libreoffice/writer/writer-adapter.js`'s `print()` (dòng ~7191): lệnh "In tài liệu" (`common.file.print`) gọi THẲNG `window.print()` trên DOM sống, hoàn toàn dựa vào CSS `@media print` — KHÔNG đi qua bước kiểm tra `hasHeader`/`hasFooter` (dựa trên `innerText?.trim()`) như `openPrintPreview()` (Ctrl+F2) hay Backstage In (`_getPrintPreviewProvider()`) đã làm đúng từ trước.
- `@media print` block trong `writer.css` (trước đây) không có quy tắc ẩn 3 pseudo-element trên — nên khi trình duyệt áp dụng CSS in ấn thật, placeholder vẫn render như nội dung thấy được, bị in/xuất PDF nhầm thành nội dung thật.

**Xác nhận qua Playwright thật** (không đoán mò): dùng `page.emulateMedia({media:"print"})` (chính xác engine CSS mà `window.print()` áp dụng) để đo `getComputedStyle(el, "::before").content` trước và sau khi sửa — trước khi sửa, giá trị này VẪN chứa chuỗi placeholder khi ở chế độ in; sau khi sửa, giá trị chuyển thành `none`.

## 3. Giải pháp

Thêm 3 selector vào `@media print` block đã có sẵn trong `writer.css`, đặt `content: none !important;` — chỉ ẩn TUYỆT ĐỐI khi in thật, KHÔNG ảnh hưởng gì đến màn hình soạn thảo (placeholder vẫn hiện đúng như thiết kế khi đang gõ):

```css
@media print {
  ...
  .vno-writer-header:empty::before,
  .vno-writer-footer:empty::before,
  .vno-note-text:empty::before {
    content: none !important;
  }
}
```

Đã rà soát toàn bộ codebase (`grep :empty::before`): CHỈ Writer có kỹ thuật placeholder này (Sheet/Slides không dùng pattern tương tự) — phạm vi sửa đúng đủ, không sót nơi nào khác. Cả 3 app đều gọi `window.print()` cho lệnh In tài liệu, nhưng chỉ Writer có placeholder CSS nên chỉ Writer bị ảnh hưởng bởi lớp lỗi này.

## 4. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: 1403/1403 PASS (không có test mới ở tầng unit vì đây là hành vi CSS media-query thật, môi trường DOM mock của bộ test unit không có CSS engine để kiểm tra).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/writer-print-placeholder-leak.playwright.mjs` (mới — trình duyệt thật): xác nhận placeholder HIỆN đúng ở chế độ màn hình (`screen`, đúng thiết kế hỗ trợ soạn thảo) và ẨN TUYỆT ĐỐI ở chế độ in (`page.emulateMedia({media:"print"})`, đúng engine CSS mà `window.print()` áp dụng thật).

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQAtxPSqMH9cVDTLUuckNw


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
