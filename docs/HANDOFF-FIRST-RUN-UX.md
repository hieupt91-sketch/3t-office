# HANDOFF — Rà soát & Loại bỏ toàn bộ text UI hard-coded tiếng Anh (i18n 100% tiếng Việt)

- **Người thực hiện**: agy (Thiết kế UI)
- **Nhánh**: `fix/first-run-ux-agy` (tách từ `main`, đã `git merge main`)
- **Worktree**: `E:\VNOffice-agy-firstrun`
- **Mục tiêu**: Tuân thủ `docs/BASELINE-CHECKLIST.md` mục A12 (UI 100% tiếng Việt mặc định). Rà soát và loại bỏ toàn bộ chuỗi tiếng Anh viết cứng trong giao diện người dùng VN Office (Writer, Sheet, Slides, Shell), đưa mọi chuỗi qua `platform/i18n` (`t()`) với bản tiếng Việt theo thuật ngữ chuẩn Microsoft Office tiếng Việt và bản tiếng Anh tương ứng trong `strings-en.js`. Tích hợp bộ quét tự động kiểm thử hồi quy nghiêm ngặt (`findings === 0`).
- **Cam kết nguyên tắc**:
  - REUSE BEFORE REWRITE.
  - Không sửa LibreOffice Core.
  - Chạy trực tiếp (foreground), không tạo lệnh chạy nền.
  - Báo cáo trung thực kết quả kiểm thử PASS / FAIL / NOT RUN.
  - Commit trên nhánh `fix/first-run-ux-agy`, KHÔNG merge vào `main`.

---

## 1. Chi tiết các chuỗi đã xử lý qua i18n

| # | Vị trí (File & Line) | Text cũ (Hard-coded EN) | Đã sửa qua `t()` (Tiếng Việt mặc định) | Khóa i18n & Bản Tiếng Anh (`strings-en.js`) |
|---|----------------------|-------------------------|---------------------------------------|---------------------------------------------|
| 1 | `apps/sheet/sheet-grid.js:9114` | `apply.textContent = "OK";` | `apply.textContent = t("sheetDialogs.apply", "Đồng ý");` | `sheetDialogs.apply`: `"Apply"` |
| 2 | `apps/sheet/sheet-grid.js:9113` | `` resultBox.textContent = `... Chọn OK để áp dụng.` `` | `resultBox.textContent = t("sheetDialogs.goalSeekResult", ...)` ("...Chọn Đồng ý để áp dụng.") | `sheetDialogs.goalSeekResult`: `"Found solution for {cell} = {value} (residual {residual}). Choose OK to apply."` |
| 3 | `apps/sheet/sheet-grid.js:4245` | `<th ...>Sheet</th>` | `<th ...>${t("sheetDialogs.watchWindowColSheet", "Trang tính")}</th>` | `sheetDialogs.watchWindowColSheet`: `"Sheet"` |
| 4 | `apps/slides/slides-canvas.js:396` | `this.canvasEl.setAttribute("aria-label", "Vùng trình chiếu slide");` | `this.canvasEl.setAttribute("aria-label", t("slidesDialogs.canvasRegion", "Vùng trình chiếu"));` | `slidesDialogs.canvasRegion`: `"Slide canvas region"` |
| 5 | `apps/slides/slides-canvas.js:3191` | `${totalPages} slide` | `${t("slidesDialogs.printPreview.slideCount", { count: totalPages })}` ("{count} trang chiếu") | `slidesDialogs.printPreview.slideCount`: `"{count} slides"` |
| 6 | `apps/sheet/sheet-grid.js:9596` | `aria-label="Sparkline column"` | `aria-label="${t("sheetDialogs.sparklineColumn", "Biểu đồ mini dạng cột")}"` | `sheetDialogs.sparklineColumn`: `"Sparkline column"` |
| 7 | `apps/sheet/sheet-grid.js:9599` | `aria-label="Sparkline line"` | `aria-label="${t("sheetDialogs.sparklineLine", "Biểu đồ mini dạng đường")}"` | `sheetDialogs.sparklineLine`: `"Sparkline line"` |
| 8 | `apps/sheet/sheet-grid.js:8536-8543` | `Tên sheet`, `Mã động... tên sheet` | `${t("sheetDialogs.hfPresetSheet", "Tên trang tính")}`, `${t("sheetDialogs.hfDynamicCodesHint", ...)}` | `sheetDialogs.hfPresetSheet`: `"Sheet name"`, `sheetDialogs.hfDynamicCodesHint`: `"Dynamic codes: ..."` |
| 9 | `apps/slides/slides-canvas.js:5907` | `Xóa Phần (giữ slide)` | `${t("slidesDialogs.removeSectionKeepSlides", "Xóa Phần (giữ trang chiếu)")}` | `slidesDialogs.removeSectionKeepSlides`: `"Remove Section (keep slides)"` |
| 10 | `platform/shell/app-shell.js:1102` | `Kích thước slide` | `t("slidesDialogs.slideSizeTitle", "Kích thước trang chiếu")` | `slidesDialogs.slideSizeTitle`: `"Slide Size"` |
| 11 | `platform/shell/app-shell.js:1104` | `Tổng số slide in` | `t("slidesDialogs.totalPrintSlides", "Tổng số trang chiếu in")` | `slidesDialogs.totalPrintSlides`: `"Total slides to print"` |

---

## 2. Kiểm thử hồi quy tự động (Regression Guard)

- Đã đưa bài test `tests/unit/i18n-hardcoded-english.test.js` vào suite kiểm thử chính tại `tests/run-tests.js` (Mục 5b).
- Quét toàn bộ 85 file mã nguồn JavaScript trong `apps/` và `platform/`.
- Kiểm tra các sink gán DOM (`textContent`, `innerText`, `innerHTML`), thuộc tính HTML (`title`, `aria-label`, `placeholder`, `alt`), hàm hiển thị (`setStatus`, `alert`, `confirm`, `prompt`) và template literals.
- Quy chuẩn strict: `pass: findings.length === 0`.
- Kết quả chạy thực tế: **85 file JS quét, 0 finding thật, test PASS hoàn toàn**.

---

## 3. Báo cáo kết quả kiểm thử (Truthful Testing)

### 3.1. Node.js Test Suite (`node tests/run-tests.js`)
- **Kết quả tổng kết**: **2057/2060 PASS | 3 FAIL**
- **Chi tiết các bài test PASS**:
  - `5. Unit Tests — Vietnamese i18n Localization Layer`: PASS
  - `5b. Regression Guard — Hard-coded English UI Text Scan`: **PASS (0 finding thật)**
  - Tất cả các unit test khác của Writer, Sheet, Slides, UI Kit, AutoRecover, Updater, AI Service, v.v.: PASS.
- **Chi tiết 3 test FAIL (tồn tại từ trước do môi trường thiếu `soffice` conversion worker)**:
  - `[FAIL] Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS`: Không có tiến trình LibreOffice runtime trong môi trường chạy node cô lập.
  - `[FAIL] Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS`: Cần tiến trình soffice chuyển đổi FODS -> XLSX.
  - `[FAIL] FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility`: Cần tiến trình soffice chạy ngầm để đo đạc bảng tính thực.

### 3.2. Python Test Suite (`python -m unittest discover -s tests`)
- **Kết quả tổng kết**: **452/452 PASS (100% OK)**
- **Thời gian chạy**: 460.865s
- Tất cả các test adapter, updater, crypto, error_reporting, sheet_open_payload, writer_halfpoint đều PASS sạch sẽ.

### 3.3. Các hạng mục NOT RUN
- Playwright live browser E2E test với GUI tương tác thực tế (không có màn hình desktop GUI thực tế trong container CLI headless).
