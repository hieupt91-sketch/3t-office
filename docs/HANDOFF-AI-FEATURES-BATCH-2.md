# HANDOFF — AI Features Batch 2

## Tổng quan

Đợt 2 thêm 4 tính năng AI mới vào VN Office, tận dụng đúng `LocalAiService`/provider system đã có.

## 4 Tính năng mới

### 1. Dịch thuật (Writer) — `ai.assistant.translate`

- **Vị trí:** Tab Trợ lý VN AI → nhóm AI Thông minh
- **Hành vi:** Bôi đen văn bản (hoặc dùng toàn bộ tài liệu nếu không chọn gì) → mở hộp thoại chọn 1 trong 6 ngôn ngữ đích (Anh, Việt, Trung, Nhật, Hàn, Pháp) → gọi AI dịch → hiển thị trong sidebar với 2 nút: "Thay thế vùng chọn" hoặc "Chèn bên dưới"
- **Files:** `platform/shell/app-shell.js` (handler `_handleTranslate` + dialog `_showTranslateLangDialog`)
- **RuleBasedProvider:** Phản hồi rõ giới hạn chế độ cục bộ, khuyến nghị kết nối AI cloud

### 2. AI Viết nháp (Writer) — `ai.assistant.draftDocument`

- **Vị trí:** Tab Trợ lý VN AI → nhóm AI Thông minh
- **Hành vi:** Hộp thoại nhập mô tả bằng ngôn ngữ tự nhiên → AI tạo bản nháp có cấu trúc hành chính → cảnh báo đây là bản nháp, cần tự kiểm tra → nút "Chèn vào tài liệu"
- **Files:** `platform/shell/app-shell.js` (handler `_handleDraftDocument`)
- **Cảnh báo UI:** Luôn hiển thị warning "Đây là bản NHÁP do AI tạo — người dùng PHẢI tự kiểm tra lại"

### 3. Giải thích công thức (Sheet) — `sheet.ai.explainFormula`

- **Vị trí:** Tab Trợ lý VN AI → nhóm Phân tích dữ liệu AI
- **Hành vi:** Chọn ô có công thức → gọi AI giải thích bằng tiếng Việt (công thức làm gì, tham chiếu đâu, ý nghĩa gì). Ô không có công thức → báo rõ
- **Files:** `apps/sheet/sheet-app.js` (handler `_handleExplainFormula`)

### 4. Tạo công thức từ mô tả (Sheet) — `sheet.ai.formulaFromDescription`

- **Vị trí:** Tab Trợ lý VN AI → nhóm Phân tích dữ liệu AI
- **Hành vi:** Hộp thoại nhập mô tả → AI trả về công thức → **validate trước qua FUNCTION_CATALOG** (chỉ cho áp dụng hàm engine hỗ trợ) → hiển thị preview → nút "Áp dụng vào ô đang chọn"
- **Files:** `apps/sheet/sheet-app.js` (handler `_handleFormulaFromDescription`)
- **Validation:** Kiểm tra `FUNCTION_CATALOG` trước khi áp dụng, phát hiện hàm không hỗ trợ và báo lỗi rõ ràng

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `platform/commands/command-definitions.js` | Thêm 4 command definitions mới |
| `platform/i18n/strings-vi.js` | Thêm i18n strings tiếng Việt |
| `platform/i18n/strings-en.js` | Thêm i18n strings tiếng Anh |
| `platform/ai/providers/rule-based-provider.js` | Thêm 5 keyword branches mới |
| `platform/shell/app-shell.js` | Bind + implement `_handleTranslate`, `_handleDraftDocument`, `_showTranslateLangDialog` |
| `apps/sheet/sheet-app.js` | Bind + implement `_handleExplainFormula`, `_handleFormulaFromDescription` |
| `apps/writer/writer-ribbon.js` | Thêm 2 nút vào nhóm AI Thông minh |
| `apps/sheet/sheet-ribbon.js` | Thêm 2 nút vào nhóm Phân tích dữ liệu AI |
| `platform/help/entries-writer.js` | Thêm 2 help entries tiếng Việt |
| `platform/help/entries-sheet.js` | Thêm 2 help entries tiếng Việt |
| `tests/unit/ai-features-batch2.test.js` | File test mới — 21 test cases |
| `tests/run-tests.js` | Đăng ký test suite mới |

## Bằng chứng test

```
node scripts/check-syntax.js    → 91/91 files hợp lệ | 0 lỗi cú pháp
node tests/run-tests.js         → 1543/1543 PASS | 0 FAIL
```

- 21 test cases mới cho Batch 2, bao gồm:
  - Command definitions đầy đủ (label, icon, tooltip)
  - Ribbon buttons có mặt đúng vị trí
  - RuleBasedProvider xử lý đúng từ khóa mới + backward compat
  - Help entries đầy đủ trường bắt buộc (id, app, commandIds, title, summary, ribbon, keywords, steps)
  - FUNCTION_CATALOG >= 90 hàm, mỗi hàm có name/category/syntax/desc
  - FormulaEngine validate được SUMIF, COUNTIF, IF lồng
  - Kiểm tra hàm không hỗ trợ bị phát hiện trước khi áp dụng

## Giới hạn

- Chỉ áp dụng cho Writer (dịch thuật, viết nháp) và Sheet (giải thích CT, tạo CT). Chưa mở rộng cho Slides.
- `RuleBasedProvider` (chế độ offline) chỉ đưa ra gợi ý/giới hạn, không giả vờ làm được.
- Dịch thuật hỗ trợ 6 ngôn ngữ phổ biến, không cần danh sách dài.
- Viết nháp tạo bản nháp hành chính tiếng Việt, cần AI cloud để có kết quả tốt.
- Tạo công thức validate qua FUNCTION_CATALOG trước khi cho áp dụng.
