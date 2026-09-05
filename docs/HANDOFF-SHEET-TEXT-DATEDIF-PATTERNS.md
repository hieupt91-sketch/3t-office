# Agent Handoff — VN Sheet TEXT / DATEDIF Patterns

| Mục | Nội dung |
|---|---|
| TASK | Mở rộng mẫu định dạng `TEXT()` và đơn vị phần dư `DATEDIF()` |
| AGENT/ROLE | Codex / Sheet formula engine implementation |
| BRANCH | `feature/sheet-text-datedif-patterns` |
| WORKTREE | `E:\VNOffice-codex-text-datedif-patterns` |
| OBJECTIVE | Bổ sung các mẫu số, phần trăm, ngày, tiền tệ VNĐ và các đơn vị `md`/`ym`/`yd` mà không đổi đầu ra cũ |
| CURRENT CAPABILITY | Trước thay đổi, `TEXT` chỉ hỗ trợ `#,##0`, `0.00`, `dd/mm/yyyy`; `DATEDIF` chỉ hỗ trợ `d`, `m`, `y`. |
| IMPLEMENTATION SUMMARY | `TEXT` tái sử dụng `NumberFormatter` cho số, phần trăm, ngày đã hỗ trợ và tiền tệ; bổ sung tên tháng tiếng Việt và parse ngày ISO. `DATEDIF` tính phần dư từ mốc số tháng/năm trọn vẹn, kẹp ngày neo theo ngày cuối tháng. |
| FILES CHANGED | `apps/sheet/formula-engine.js`; `tests/unit/formula-engine.test.js`; `docs/HANDOFF-SHEET-TEXT-DATEDIF-PATTERNS.md` |
| DEPENDENCIES | Tái sử dụng `apps/sheet/number-formatter.js`; không thêm dependency ngoài hoặc thư viện trả phí. |
| RISKS | Microsoft ghi nhận `DATEDIF(...,"md")` có giới hạn lịch sử. Implementation dùng phần dư không âm sau tháng trọn vẹn để nhất quán cho bài toán tuổi/thâm niên, kể cả cuối tháng. |
| TEST PLAN | Test từng mẫu/đơn vị mới bằng đầu ra cụ thể; test hồi quy 3 mẫu `TEXT`, 3 đơn vị `DATEDIF` cũ và validation ngày đảo ngược; chạy toàn bộ suite dưới 60 giây. |
| TEST RESULTS | PASS — `node tests/run-tests.js`: 700/700, 0 FAIL, 13,626 giây. |
| BUILD RESULT | PASS — syntax check nằm trong full suite và đã đạt; dự án không có build step riêng cho thay đổi logic này. |
| CORE PATCH ID | Không có — không sửa LibreOffice Core. |
| BLOCKERS | Không có. |
| MERGE STATUS | Chưa merge và không merge vào `main`. |

## Ma trận TEXT

| Nhóm | Mẫu | Ví dụ | Đầu ra |
|---|---|---|---|
| Số | `0` | `TEXT(1234.5,"0")` | `1235` |
| Số | `0.0` | `TEXT(1234.5,"0.0")` | `1234.5` |
| Số | `0.000` | `TEXT(1234.5,"0.000")` | `1234.500` |
| Số | `#,##0.00` | `TEXT(1234.5,"#,##0.00")` | `1,234.50` |
| Phần trăm | `0%` | `TEXT(0.125,"0%")` | `13%` |
| Phần trăm | `0.00%` | `TEXT(0.125,"0.00%")` | `12.50%` |
| Ngày | `mm/dd/yyyy` | `TEXT("2024-03-10","mm/dd/yyyy")` | `03/10/2024` |
| Ngày | `dd-mm-yyyy` | `TEXT("2024-03-10","dd-mm-yyyy")` | `10-03-2024` |
| Ngày | `yyyy-mm-dd` | `TEXT("2024-03-10","yyyy-mm-dd")` | `2024-03-10` |
| Ngày | `dd mmmm yyyy` | `TEXT("2024-03-10","dd mmmm yyyy")` | `10 tháng Ba 2024` |
| Tiền tệ | `#,##0.00 ₫` | `TEXT(1234.5,"#,##0.00 ₫")` | `1,234.50 ₫` |

Mẫu tiền tệ chấp nhận ký hiệu `₫` sau các mẫu số được hỗ trợ, phù hợp `NumberFormatter`/Format Cells hiện tại: ký hiệu VNĐ đặt sau số và cách bởi một khoảng trắng.

## Ma trận DATEDIF

| Đơn vị | Ý nghĩa | Ví dụ | Đầu ra |
|---|---|---|---|
| `md` | Số ngày dư sau các tháng trọn vẹn | `DATEDIF("2020-01-15","2024-03-10","md")` | `24` |
| `ym` | Số tháng dư sau các năm trọn vẹn | `DATEDIF("2020-01-15","2024-03-10","ym")` | `1` |
| `yd` | Số ngày dư sau các năm trọn vẹn | `DATEDIF("2020-01-15","2024-03-10","yd")` | `55` |
| `yd` | Ví dụ chính thức của Microsoft | `DATEDIF("2001-06-01","2002-08-15","yd")` | `75` |
| `md` | Neo cuối tháng | `DATEDIF("2024-01-31","2024-03-01","md")` | `1` |

Ngữ nghĩa các đơn vị được đối chiếu với [tài liệu DATEDIF chính thức của Microsoft](https://support.microsoft.com/en-us/excel/datedif-function). Microsoft cũng cảnh báo riêng rằng `md` trong Excel có một số kết quả lịch sử không chính xác; VN Sheet chọn phép tính phần dư ổn định, không âm.

## Hồi quy đã khóa

| Hàm | Ví dụ | Đầu ra giữ nguyên |
|---|---|---|
| `TEXT` | `TEXT(1234.5,"#,##0")` | `1,235` |
| `TEXT` | `TEXT(1234.5,"0.00")` | `1234.50` |
| `TEXT` | `TEXT("2024-03-10","dd/mm/yyyy")` | `10/03/2024` |
| `DATEDIF` | `DATEDIF("2020-01-15","2024-03-10","d")` | `1516` |
| `DATEDIF` | `DATEDIF("2020-01-15","2024-03-10","m")` | `49` |
| `DATEDIF` | `DATEDIF("2020-01-15","2024-03-10","y")` | `4` |

## Commit và rollback

| Commit | Nội dung |
|---|---|
| `a4be412` | Logic `TEXT`/`DATEDIF`, parse ISO và unit tests |

Rollback khi được người phụ trách cho phép: revert commit chức năng và commit handoff; không cần gỡ dependency hay migrate dữ liệu.
