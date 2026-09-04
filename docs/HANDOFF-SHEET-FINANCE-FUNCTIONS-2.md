# Agent Handoff — VN Sheet Financial Functions 2

| Mục | Nội dung |
|---|---|
| TASK | Bổ sung `NPER`, `IPMT`, `PPMT` cho lịch trả nợ |
| AGENT/ROLE | Codex / Sheet formula engine implementation |
| BRANCH | `feature/sheet-finance-functions-2` |
| WORKTREE | `E:\VNOffice-codex-sheet-finance2` |
| OBJECTIVE | Hoàn thiện nhóm hàm lập lịch trả nợ theo cú pháp, quy ước dấu và thời điểm thanh toán của Excel |
| FINDINGS | FormulaEngine hiện có PMT/FV/PV và dispatcher phù hợp để mở rộng trực tiếp. Không cần adapter, dependency hay Core patch. |
| IMPLEMENTATION SUMMARY | Thêm catalog tiếng Việt, xử lý `rate=0`, validation tham số và phép tính cho ba hàm. `PPMT` dùng trực tiếp đẳng thức `PMT - IPMT`. |
| FILES CHANGED | `apps/sheet/formula-engine.js`; `tests/unit/formula-engine.test.js`; `tests/unit/formula-autocomplete.test.js`; `docs/HANDOFF-SHEET-FINANCE-FUNCTIONS-2.md` |
| COMMANDS RUN | `node --check apps/sheet/formula-engine.js`; `node tests/run-tests.js`; `git diff --check` |
| BUILD RESULT | PASS — dự án không có build step riêng; kiểm tra cú pháp Node đạt. |
| TEST RESULTS | PASS — 486/486, 0 FAIL; 11,009 giây, dưới giới hạn 60 giây. |
| KNOWN FAILURES | Không có tại thời điểm handoff. |
| RISKS | Số thực JavaScript có sai số dấu phẩy động rất nhỏ; unit test dùng tolerance chặt. IPMT/PPMT yêu cầu `per` nằm trong `[1, nper]`. |
| DEPENDENCIES/BLOCKERS | Không có; không thêm dependency hoặc dịch vụ trả phí. |
| CORE PATCH ID (if any) | Không có — không sửa LibreOffice Core. |
| NEXT ACTION | Claude review ba commit chức năng và commit handoff; không tự merge vào `main`. |

## Bảng xác minh chức năng

| Hàm | Công thức/nhánh xử lý | Đối chiếu Excel trong test | Kết quả |
|---|---|---|---|
| NPER | Khi `rate=0`: `-(pv+fv)/pmt`; trường hợp chung giải phương trình niên kim bằng logarithm và hiệu chỉnh `type` | `=NPER(12%/12,-100,-1000,10000,1)` → `59,67386567429457` | PASS |
| IPMT | Lãi bằng lãi suất nhân số dư trước kỳ; `type=1` hiệu chỉnh số dư và kỳ 1 có lãi bằng 0; `rate=0` trả 0 | `=IPMT(10%/12,1,2*12,2000)` → `-16,666666666666668` | PASS |
| PPMT | `PPMT = PMT - IPMT`; kế thừa validation và nhánh `rate=0` từ hai hàm thành phần | `=PPMT(10%/12,1,2*12,2000)` → `-75,62318600836664`; kiểm tra trực tiếp `PPMT = PMT - IPMT` | PASS |

Ngữ nghĩa tham số và giới hạn `per` được đối chiếu với tài liệu chính thức của Microsoft cho [NPER](https://support.microsoft.com/en-US/Excel/functions/nper-function), [IPMT](https://support.microsoft.com/en-us/excel/functions/ipmt-function) và [PPMT](https://support.microsoft.com/en-us/excel/functions/ppmt-function).

## Lịch sử commit chức năng

| Commit | Nội dung | Test tại commit |
|---|---|---|
| `c852904` | NPER + catalog + test | PASS, 11,167 giây |
| `461994f` | IPMT + catalog + test | PASS, 11,059 giây |
| `274521e` | PPMT + catalog + test | PASS, 11,125 giây |

## Rollback

| Phạm vi | Cách hoàn tác khi được người phụ trách cho phép |
|---|---|
| Từng hàm | Revert commit tương ứng trong bảng lịch sử; các commit độc lập theo thứ tự NPER → IPMT → PPMT. |
| Toàn bộ task | Revert ba commit chức năng và commit handoff; không cần gỡ dependency hay thay đổi dữ liệu. |
