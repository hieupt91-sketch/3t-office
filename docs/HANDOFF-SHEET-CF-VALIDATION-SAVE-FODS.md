# Agent Handoff

TASK: `serializeToFods()` ghi Conditional Formatting và Data Validation ra FODS — hết mất khi Lưu
AGENT/ROLE: Codex (phần lớn logic serialize) + Claude (hoàn tất sau khi Codex hết hạn mức giữa chừng — tìm và sửa 1 lỗi thật trong parseFods(), viết handoff, verify độc lập)
BRANCH: `feature/sheet-cf-validation-save-fods`
WORKTREE: `E:\VNOffice-codex-cf-validation-save`

## Bối cảnh

Task `fix/real-office-file-import-fidelity-round2` (đã merge main) dạy `parseFods()` đọc `calcext:conditional-formats` và `table:content-validations` từ file XLSX/FODS thật, nhưng `serializeToFods()` (hàm Lưu) chưa bao giờ ghi 2 loại rule này ra XML. Nghĩa là: người dùng mở 1 file Excel thật có sẵn Conditional Formatting/Data Validation, sửa/xem trong VN Office, bấm Lưu — rule sẽ mất sạch khỏi file lưu ra.

## Việc đã làm (Codex, trước khi hết hạn mức)

`serializeToFods()` bổ sung:
- `<office:styles>`/`<office:automatic-styles>`: 1 style riêng cho mỗi màu CF duy nhất, và 1 base style có `style:map` cho mỗi nhóm rule (greaterThan/lessThan/blank), tham chiếu qua `calcext:apply-style-name`.
- `<calcext:conditional-formats>` mỗi sheet, `calcext:target-range-address` + `calcext:condition` đúng cú pháp mà `parseFods()` đã đọc được (đối chiếu ngược, không đoán).
- `<table:content-validations>` ở gốc spreadsheet, `table:condition` dùng `cell-content-is-in-list(...)` (list) / `cell-content-is-between(...)` (numberRange), và `table:content-validation-name` gắn lên MỌI ô trong range của rule (kể cả ô rỗng chỉ tồn tại để mang validation).

## Lỗi thật phát hiện + sửa (Claude, sau khi Codex hết hạn mức)

Test round-trip qua soffice thật (`node tests/run-tests.js`) FAIL: "list range sai" — range đọc lại chỉ còn `B2:B2` thay vì `B2:B4`.

Nguyên nhân: `parseFods()` (ở CẢ 2 nhánh — DOM-based và regex-fallback) có biến gác cổng `hasValue` chỉ xử lý 1 ô (bao gồm cả việc ghi nhận `validationHits`) nếu ô đó có giá trị/formula/annotation. Các ô B3/B4 (tự đóng, rỗng, chỉ mang `table:content-validation-name`) bị gác cổng chặn hoàn toàn, không bao giờ chạm tới đoạn code push vào `validationHits` — dẫn tới range bị co lại chỉ còn ô B2 (ô duy nhất có giá trị "Đạt").

Sửa: thêm `|| attributes["table:content-validation-name"]` vào điều kiện `hasValue` ở cả 2 nhánh (dòng ~970 và ~1056 của `sheet-adapter.js`). Chạy lại test round-trip qua soffice thật: PASS.

## FILES CHANGED

- `adapters/libreoffice/sheet/sheet-adapter.js` — serialize CF/validation (Codex); sửa `hasValue` gate ở `parseFods()` (Claude)
- `tests/unit/sheet-cf-validation-fods-roundtrip.test.js` — 2 test: round-trip nội bộ (serialize→parse, không qua soffice), round-trip qua soffice thật (serialize→soffice FODS→XLSX→soffice XLSX→FODS→parse)
- `tests/run-tests.js` — đăng ký suite 64
- `docs/HANDOFF-SHEET-CF-VALIDATION-SAVE-FODS.md`

## COMMANDS RUN

```
node tests/run-tests.js
```

## TEST RESULTS

- `node tests/run-tests.js`: **725/725 PASS** (bao gồm cả các suite từ main đã merge lên gần đây — Desktop 3-app, main.py sidecar ảnh, Slides transition/animation, title/body animation, Writer Track Changes import), ~18s.
- Suite 64 (CF/Validation FODS round-trip): 2/2 PASS — cả round-trip nội bộ lẫn round-trip qua soffice thật (LibreOffice giữ đúng type/value/màu/range cho CF; type/values/min/max/range cho validation).

## KNOWN FAILURES / LIMITATIONS

1. **Color scale / data bar / icon set CF không serialize.** UI hiện chưa có cách tạo các loại CF này, nên không có gì để round-trip — chỉ `greaterThan`/`lessThan`/`blank` (đúng những gì `parseFods()` đã đọc được).
2. **Không tối ưu số lượng style sinh ra** khi nhiều ô dùng chung cả number-format lẫn conditional style (ghép tên style `${baseName}_${cellStyle}`) — đúng nhưng có thể sinh style trùng lặp nếu nhiều tổ hợp giống nhau qua nhiều sheet; không phải lỗi mất dữ liệu, chỉ là chưa tối ưu kích thước file.
3. Không kiểm tra qua Playwright/UI thật (chỉ test ở tầng adapter + soffice trực tiếp) — phù hợp vì đây là logic serialize thuần túy, không có phần UI mới nào cần xác nhận trực quan.

## RISKS

Thấp sau khi sửa lỗi `hasValue` gate. Đã xác nhận round-trip qua soffice thật giữ đúng dữ liệu, không chỉ test nội bộ JS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn (dùng trong test). Không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

Review xong, đã verify độc lập bởi Claude (chạy lại test suite, đọc code, xác nhận `hasValue` fix hợp lý ở cả 2 nhánh). Sẵn sàng merge vào `main`.
