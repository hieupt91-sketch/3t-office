# Báo cáo: Text UI hard-coded tiếng Anh còn lại

Tuân thủ `docs/BASELINE-CHECKLIST.md` mục A12 (UI 100% tiếng Việt mặc định).

## Cách phát hiện

Bài test `tests/unit/i18n-hardcoded-english.test.js` (đăng ký trong `tests/run-tests.js`
như một **report test — luôn PASS**, chưa strict) quét mọi file `.js` trong `apps/` và
`platform/` (bỏ qua catalog i18n `strings-en.js` / `strings-vi.js`, `tests/`, `node_modules/`),
tìm chuỗi ký tự là text UI hiển thị còn hard-coded tiếng Anh ở các vị trí:

- gán vào `textContent` / `innerText` / `innerHTML`
- gán vào `.title` / `.label` / `.placeholder` / `.alt`
- `setAttribute("title"|"aria-label"|"placeholder"|"alt", ...)`
- `setStatus(...)` / `alert(...)` / `confirm(...)` / `prompt(...)`
- thuộc tính HTML `title=` / `aria-label=` / `placeholder=` / `alt=`
- template literal sinh text hiển thị

Chỉ cờ các chuỗi chứa các từ tiếng Anh phổ biến trong UI Office (`words, page, sheet,
slide, loading, cancel, close, save, open, print, error, ready, select, insert, delete,
format, font, paragraph, zoom, find, replace, OK, Yes, No` — biên từ `\b`, không phân biệt
hoa/thường). Bỏ qua identifier, CSS class, command id, console message, comment, URL
(bằng máy trạng thái xóa comment + xóa nội dung biểu thức `${...}` trong template).

Kết quả quét lần chạy gần nhất: **85 file JS, 5 finding thật** (2 hit allowlist bỏ qua —
xem mục Allowlist). Khi nâng test sang strict, chỉ cần đổi `pass: true` thành
`pass: findings.length === 0` trong `runI18nHardcodedEnglishTests()`.

## Danh sách finding (5)

| # | File:line | Text hiện tại | Gợi ý sang tiếng Việt (chuẩn Office VN) |
|---|-----------|---------------|------------------------------------------|
| 1 | `apps/sheet/sheet-grid.js:9114` | `apply.textContent = "OK";` (nút OK trong hộp thoại Dò tìm mục tiêu) | `apply.textContent = "Đồng ý";` |
| 2 | `apps/sheet/sheet-grid.js:9113` | `` resultBox.textContent = `Đã tìm thấy ${...} = ${...} (sai số ${...}). Chọn OK để áp dụng.`; `` | `... Chọn Đồng ý để áp dụng.` |
| 3 | `apps/sheet/sheet-grid.js:4245` | `<th ...>Sheet</th>` (tiêu đề cột bảng "Theo dõi" — các cột kề là `Ô`, `Giá trị`, `Công thức`) | `<th ...>Trang tính</th>` |
| 4 | `apps/slides/slides-canvas.js:396` | `this.canvasEl.setAttribute("aria-label", "Vùng trình chiếu slide");` | `"Vùng trình chiếu"` (bỏ từ `slide` thừa) |
| 5 | `apps/slides/slides-canvas.js:3191` | `<div class="vno-slides-pp-info">${this.slideSize.width}x${this.slideSize.height} · ${totalPages} slide</div>` (thanh thông tin Xem trước khi in) | `${totalPages} trang chiếu` |

## Allowlist (false positive đã biết)

| Pattern | Lý do |
|---------|-------|
| `\bVN (Office\|Writer\|Sheet\|Slides)\b` | Tên thương hiệu sản phẩm (proper noun) — không dịch, giữ nguyên trong mọi ngôn ngữ. Ví dụ: đoạn văn bản pháp lý mẫu trong `apps/writer/writer-app.js` (template Văn bản hành chính) và header trình chiếu trong `apps/slides/slides-canvas.js`. |

## Ghi chú chất lượng

- Các chuỗi 2 ngôn ngữ dạng `isEn ? "English" : "Tiếng Việt"` (có ở nhiều dialog) là bản
  dịch EN thủ công **có chủ đích** — chúng nằm trong biểu thức `${...}` nên scanner đã
  bỏ qua; không phải finding.
- Các chuỗi `t("key", "Tiếng Việt")` / `localize("key", "Tiếng Việt")` là fallback đúng
  chuẩn (mặc định tiếng Việt) — không phải finding.
- Thanh trạng thái Writer (`apps/writer/writer-app.js:359`) đã dùng
  `t("writerDialogs.wordCount.statusLabel", { count })` với fallback `{count} từ` — đã
  đúng chuẩn, không phải finding.
