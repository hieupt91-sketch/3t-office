# Báo cáo: Text UI hard-coded tiếng Anh còn lại

Tuân thủ `docs/BASELINE-CHECKLIST.md` mục A12 (UI 100% tiếng Việt mặc định).

## Cách phát hiện

Bài test `tests/unit/i18n-hardcoded-english.test.js` (đăng ký trong `tests/run-tests.js`
ở mục 5b) quét mọi file `.js` trong `apps/` và `platform/` (bỏ qua catalog i18n
`strings-en.js` / `strings-vi.js`, `tests/`, `node_modules/`), tìm chuỗi ký tự là
text UI hiển thị còn hard-coded tiếng Anh ở các vị trí:

- gán vào `textContent` / `innerText` / `innerHTML`
- gán vào `.title` / `.label` / `.placeholder` / `.alt`
- `setAttribute("title"|"aria-label"|"placeholder"|"alt", ...)`
- `setStatus(...)` / `alert(...)` / `confirm(...)` / `prompt(...)`
- thuộc tính HTML `title=` / `aria-label=` / `placeholder=` / `alt=`
- template literal sinh text hiển thị

Từ tiếng Anh trong UI Office được rà soát (`word, words, page, pages, sheet, sheets,
slide, slides, loading, cancel, close, save, open, print, error, ready, select, insert,
delete, format, font, paragraph, zoom, find, replace, ok, yes, no, sparkline`).

## Trạng thái xử lý (ĐÃ HOÀN TẤT 100%)

Toàn bộ 5 finding ban đầu cùng các vị trí liên quan (sparkline, Header/Footer dialog)
đã được chuyển qua `platform/i18n` (`t()`) với bản tiếng Việt chuẩn Office và bản tiếng Anh
trong `strings-en.js`:

| # | File:line | Text cũ hard-coded | Đã sửa qua `t()` (Tiếng Việt mặc định) | Khóa i18n & Bản Tiếng Anh (`strings-en.js`) |
|---|-----------|-------------------|---------------------------------------|---------------------------------------------|
| 1 | `apps/sheet/sheet-grid.js:9114` | `apply.textContent = "OK";` | `apply.textContent = t("sheetDialogs.apply", "Đồng ý");` | `sheetDialogs.apply`: `"Apply"` |
| 2 | `apps/sheet/sheet-grid.js:9113` | `Đã tìm thấy... Chọn OK để áp dụng.` | `resultBox.textContent = t("sheetDialogs.goalSeekResult", ...)` ("...Chọn Đồng ý để áp dụng.") | `sheetDialogs.goalSeekResult`: `"Found solution for {cell} = {value} (residual {residual}). Choose OK to apply."` |
| 3 | `apps/sheet/sheet-grid.js:4245` | `<th ...>Sheet</th>` | `<th ...>${t("sheetDialogs.watchWindowColSheet", "Trang tính")}</th>` | `sheetDialogs.watchWindowColSheet`: `"Sheet"` |
| 4 | `apps/slides/slides-canvas.js:396` | `this.canvasEl.setAttribute("aria-label", "Vùng trình chiếu slide");` | `this.canvasEl.setAttribute("aria-label", t("slidesDialogs.canvasRegion", "Vùng trình chiếu"));` | `slidesDialogs.canvasRegion`: `"Slide canvas region"` |
| 5 | `apps/slides/slides-canvas.js:3191` | `${totalPages} slide` | `${t("slidesDialogs.printPreview.slideCount", { count: totalPages })}` ("{count} trang chiếu") | `slidesDialogs.printPreview.slideCount`: `"{count} slides"` |
| + | `apps/sheet/sheet-grid.js:9596, 9599` | `aria-label="Sparkline column"`, `aria-label="Sparkline line"` | `aria-label="${t("sheetDialogs.sparklineColumn", "Biểu đồ mini dạng cột")}"`, `aria-label="${t("sheetDialogs.sparklineLine", "Biểu đồ mini dạng đường")}"` | `sparklineColumn`: `"Sparkline column"`, `sparklineLine`: `"Sparkline line"` |
| + | `apps/sheet/sheet-grid.js:8536-8543` | `Tên sheet`, `Mã động... tên sheet` | `${t("sheetDialogs.hfPresetSheet", "Tên trang tính")}`, `${t("sheetDialogs.hfDynamicCodesHint", ...)}` | `hfPresetSheet`: `"Sheet name"`, `hfDynamicCodesHint`: `"Dynamic codes: ..."` |
| + | `apps/slides/slides-canvas.js:5907` | `Xóa Phần (giữ slide)` | `${t("slidesDialogs.removeSectionKeepSlides", "Xóa Phần (giữ trang chiếu)")}` | `slidesDialogs.removeSectionKeepSlides`: `"Remove Section (keep slides)"` |
| + | `platform/shell/app-shell.js:1102, 1104` | `Kích thước slide`, `Tổng số slide in` | `${t("slidesDialogs.slideSizeTitle", "Kích thước trang chiếu")}`, `${t("slidesDialogs.totalPrintSlides", "Tổng số trang chiếu in")}` | `slidesDialogs.slideSizeTitle`: `"Slide Size"`, `slidesDialogs.totalPrintSlides`: `"Total slides to print"` |

## Chế độ kiểm thử hồi quy (Strict Guard)

Bài test `tests/unit/i18n-hardcoded-english.test.js` đã được tích hợp vào suite kiểm thử chính
`tests/run-tests.js` (Mục 5b) với điều kiện nghiêm ngặt:
- `pass: findings.length === 0`
- Kết quả chạy thực tế: **85 file JS quét, 0 finding thật, test PASS**.

## Allowlist (false positive đã biết)

| Pattern | Lý do |
|---------|-------|
| `\bVN (Office\|Writer\|Sheet\|Slides)\b` | Tên thương hiệu sản phẩm (proper noun) — không dịch, giữ nguyên trong mọi ngôn ngữ (vd: đoạn văn bản pháp lý mẫu trong `apps/writer/writer-app.js` và header trình chiếu trong `apps/slides/slides-canvas.js`). |
