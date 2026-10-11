# Agent Handoff

TASK: VN Sheet Evaluate Formula (`sheet.formula.evaluateFormula`)
AGENT/ROLE: Grok / Sheet implementation and verification
BRANCH: `feature/sheet-evaluate-formula`
WORKTREE: `E:\VNOffice-grok-sheet-evaluate-formula`
BASE: `main` @ `a8d258b` (wire illustration dialogs, 1064/1064 PASS)
OBJECTIVE: Thêm hộp thoại Ước lượng công thức trên tab Công thức — bước qua công thức lồng nhau bằng giá trị trung gian thật từ FormulaEngine, view-only, không merge vào main.

## FINDINGS (formula-engine.js trước khi thiết kế)

`FormulaEngine.evaluate()` không có AST để “bước từng token”:

1. Nếu cả biểu thức khớp `FUNC(...)`, tách đối số bằng `_splitArgs` rồi `_executeFunction`.
2. Hàm lồng trong đối số được `_resolveSingleValue` gọi `evaluate()` đệ quy — chỉ trả **kết quả cuối**.
3. So sánh (`12>10`) đi qua `_evaluateCondition`, không qua `_evaluateArithmetic` (charset không có `>` → `#VALUE!` nếu gọi `evaluate("=12>10")`).
4. Số học `B1*C1` đi `_evaluateArithmetic` (thay tọa độ ô rồi `Function()`).

Không viết lại engine. Stepper mới quét chuỗi đang hiển thị, chọn nhóm trong-ra-ngoài, rồi gọi `evaluate` / `_evaluateCondition` trên đúng đoạn đó.

## Mức độ chi tiết so với Excel thật — RÕ RÀNG

| Excel 365 Evaluate Formula | VN Sheet (phiên bản này) |
|---|---|
| Có thể thay **từng tham chiếu ô** trước (A1 rồi A2 rồi A3 trong SUM) | **Không.** `SUM(A1:A3)` là **một bước nhóm** → giá trị tổng |
| Bước toán tử lẻ sau khi đã thay từng toán hạng | Phép toán còn lại (`B1*C1`, `D1+E1`) là **một bước nhóm** |
| IF: tính điều kiện, rồi chỉ nhánh được chọn | **Có.** Không tính nhánh không dùng |
| Gạch chân / in nghiêng phần sắp tính | **Có** (`.vno-eval-underline`) |
| Evaluate / Step In / Step Out / Restart / Close | **Có** |
| Kết quả cuối khớp giá trị ô | **Có** (dòng đối chiếu trên dialog) |

**Vì sao rút gọn theo nhóm, không theo từng token:** engine không xuất cây cú pháp trung gian. Tách từng ô trong `A1:A3` đòi hỏi parser/AST mới, trái với “reuse FormulaEngine, không viết lại”. Nhóm hàm / so sánh / nhánh IF / phép toán vẫn cho giá trị trung gian **thật** (so khớp `engine.evaluate` của cùng đoạn và tính tay 5+4+3=12, 12>10, 2*3=6).

Ví dụ `=IF(SUM(A1:A3)>10,B1*C1,D1+E1)` với A1=5,A2=4,A3=3,B1=2,C1=3,D1=1,E1=1:

1. `SUM(A1:A3)` → **12** (engine SUM, tính tay 12)
2. `12>10` → **TRUE** (`_evaluateCondition`)
3. `B1*C1` (nhánh TRUE) → **6** — `D1+E1` không bị tính
4. `IF(TRUE,6,D1+E1)` → **6**, khớp giá trị ô

## IMPLEMENTATION SUMMARY

- Module thuần `apps/sheet/evaluate-formula.js`: `EvaluateFormulaSession`, `findNextEvaluationSpan`, format TRUE/FALSE.
- Dialog `showEvaluateFormulaDialog()` trên grid: gạch chân + in nghiêng, Ước lượng / Bước vào / Bước ra / Khởi động lại / Đóng. Enter = Ước lượng (trừ khi focus Đóng). Esc đóng. **Không ghi ô, không Undo.**
- Ribbon tab Công thức → nhóm Kiểm tra công thức, cột Hiện công thức / Kiểm tra lỗi.
- Help entry mới `sheet.formula.evaluateFormula` (tiếng Việt, khớp UI).

## FILES CHANGED

- `apps/sheet/evaluate-formula.js` (mới)
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet-ribbon.js`
- `apps/sheet/sheet.css`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (một dòng `.uno:EvaluateFormula`)
- `platform/commands/command-definitions.js` (một lệnh `sheet.formula.evaluateFormula`)
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `platform/help/entries-sheet.js` (entry mới)
- `tests/unit/sheet-evaluate-formula.test.js` (mới)
- `tests/live/sheet-evaluate-formula.playwright.mjs` (mới)
- `tests/unit/sheet-formulas-tab.test.js`
- `tests/unit/sheet-help.test.js`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-EVALUATE-FORMULA.md`

Không đụng Writer/Slides source.

## COMMANDS RUN

- `node --check` các file JS đã sửa
- `node tests/run-tests.js` — **1072/1072 PASS**, ~70s (< 90s)
- `node tests/live/sheet-evaluate-formula.playwright.mjs` — **PASS** (Edge, không SendKeys): ribbon → dialog → Ước lượng nhiều lần, SUM=12, 12>10=TRUE, B1*C1=6, khớp ô F1=6, Restart, F1 không đổi

## TEST RESULTS

- PASS — full runner `1072/1072 PASS | 0 FAIL` (~70.14s)
- PASS — live Playwright Evaluate Formula
- Unit: giá trị từng bước so với `engine.evaluate` **và** tính tay; nhánh FALSE không chạy khi TRUE; Step In/Out/Restart; view-only (Map ô + undo không đổi)

## KNOWN FAILURES

None.

## RISKS / LIMITS

- Không thay từng ô trong range (`SUM(A1:A3)` một bước).
- `_evaluateArithmetic` không hiểu hàm trộn với toán tử ở top-level (`=SUM(A1)+1` vốn đã là giới hạn engine).
- Bước vào chỉ khi phần đang gạch chân là **một tham chiếu ô** có công thức riêng (ví dụ `=G1`).
- `.uno:EvaluateFormula` là ánh xạ VN; LibreOffice không có dialog Evaluate Formula 1:1 Excel.

## DEPENDENCIES/BLOCKERS

None. Không thư viện trả phí.

## CORE PATCH ID

N/A — không sửa LibreOffice Core/upstream.

## NEXT ACTION

Review/cherry-pick các commit trên `feature/sheet-evaluate-formula` từ worktree `E:\VNOffice-grok-sheet-evaluate-formula`. **KHÔNG merge tự động vào main.**

Commits:

- `733366a` feat(sheet): add Evaluate Formula stepper dialog on Formulas tab
- `79e7270` test(sheet): cover Evaluate Formula stepper, ribbon, and help
- `c8a5bb5` test(sheet): pin Evaluate Formula live test to vi locale and dialog class
- (commit handoff này)
