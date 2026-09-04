# Agent Handoff — VN Sheet Financial Functions

TASK: Bổ sung nhóm hàm tài chính cho FormulaEngine  
AGENT/ROLE: Codex / Sheet engine implementation  
BRANCH: `feature/sheet-finance-functions`  
WORKTREE: `E:\VNOffice-codex-sheet-finance`  
OBJECTIVE: Cung cấp PMT, FV, PV, NPV, IRR, RATE, SLN và DB theo quy ước dòng tiền và ngữ nghĩa Excel, không thêm thư viện ngoài.  
FINDINGS: FormulaEngine đã có parser, dispatcher, bộ phân giải ô/range và catalog autocomplete phù hợp để mở rộng trực tiếp. Không cần adapter hoặc Core patch.  
IMPLEMENTATION SUMMARY: Thêm 8 entry nhóm `Tài chính`, công thức niên kim/chiết khấu/khấu hao, solver Newton–Raphson có fallback chia đôi cho IRR/RATE, validation và lỗi `#VALUE!`/`#NUM!`.  
FILES CHANGED: `apps/sheet/formula-engine.js`; `tests/unit/formula-engine.test.js`; `tests/unit/formula-autocomplete.test.js`; `docs/HANDOFF-SHEET-FINANCE-FUNCTIONS.md`.  
COMMANDS RUN: `node --check apps/sheet/formula-engine.js`; `node tests/run-tests.js`; `git diff --check`.  
BUILD RESULT: PASS — dự án không có build step; kiểm tra cú pháp Node PASS.  
TEST RESULTS: PASS — 479/479, 0 FAIL; hoàn thành trong 11,051 giây.  
KNOWN FAILURES: Không có tại thời điểm handoff.  
RISKS: IRR có thể có nhiều nghiệm; như Excel, kết quả phụ thuộc `guess`. Solver ưu tiên nghiệm Newton gần guess và dùng khoảng đổi dấu gần guess khi fallback.  
DEPENDENCIES/BLOCKERS: Không có. Không thêm dependency.  
CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.  
NEXT ACTION: Claude review các commit trên branch; không tự merge vào `main`.

## Bảng xác minh chức năng

| STT | Hàm | Công thức/thuật toán dùng | Trạng thái thật | Cách xác minh (ví dụ số liệu đối chiếu Excel) |
|---:|---|---|---|---|
| 1 | PMT | `-(pv(1+r)^n+fv)r / ((1+r·type)((1+r)^n-1))`; khi `r=0`: `-(pv+fv)/n` | PASS | `PMT(1%,120,100000000)` = `-1.434.709,4840258735`; `PMT(0,10,1000)` = `-100` |
| 2 | FV | `-(pv(1+r)^n+pmt(1+r·type)((1+r)^n-1)/r)`; khi `r=0`: `-(pv+pmt·n)` | PASS | `FV(5%/12,120,-1000,-10000,0)` = `171.752,37442257005` |
| 3 | PV | `-(fv+pmt(1+r·type)((1+r)^n-1)/r)/(1+r)^n`; khi `r=0`: `-(fv+pmt·n)` | PASS | `PV(5%/12,120,-1000,0,0)` = `94.281,35032823475` |
| 4 | NPV | `Σ(value_t/(1+r)^t)`, với đối số đầu tiên ở `t=1` | PASS | `NPV(10%,-10000,3000,4200,6800)` = `1.188,4434123352207`; cùng kết quả khi dùng range |
| 5 | IRR | Giải `Σ(value_t/(1+r)^t)=0` bằng Newton–Raphson; fallback chia đôi trên `r>-1` | PASS | `IRR({-70000;12000;15000;18000;21000;26000})` = `0,08663094803653172`; chuỗi không có nghiệm trả `#NUM!` |
| 6 | RATE | Giải phương trình số dư niên kim `fv+pv(1+r)^n+pmt(1+r·type)((1+r)^n-1)/r=0` bằng cùng solver | PASS | `RATE(60,-200,10000)` = `0,006183413161253651` mỗi kỳ |
| 7 | SLN | `(cost-salvage)/life` | PASS | `SLN(1000000,100000,5)` = `180.000` |
| 8 | DB | Hệ số `1-(salvage/cost)^(1/life)` làm tròn 3 số; số dư giảm dần, prorate tháng đầu/kỳ cuối | PASS | `DB(1000000,100000,6,1,7)` = `186.083,3333`; kỳ 2 = `259.639,4167`; kỳ 7 = `15.845,0985` |

Quy tắc DB và bộ ví dụ được đối chiếu với [Microsoft Support — DB function](https://support.microsoft.com/en-us/excel/db-function).

## Kết quả kiểm thử cuối

- Trạng thái: PASS — 479/479, 0 FAIL.
- Thời gian: 11,051 giây, đạt yêu cầu dưới 60 giây.
