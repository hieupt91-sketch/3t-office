# Handoff — VN Sheet Named Ranges & TEXT/DATE

## Kết quả

- Branch/worktree: `feature/sheet-named-ranges` tại `E:\VNOffice-codex-named-ranges`.
- Thêm Name Manager thật trên tab **Công thức**, command `sheet.formula.nameManager` có icon SVG và mapping `.uno:DefineName`; handler bảo vệ `args = null`.
- Model có `namedRangesWorkbook` và `namedRangesBySheet`; CRUD, validation, sheet precedence, cleanup khi xóa sheet, snapshot và undo/redo.
- FormulaEngine resolve tên vùng thật; thêm `TEXT`, `DATE`, `DATEDIF`, `EDATE`, `CONCATENATE`, `SUBSTITUTE`, `FIND`.

## Kiểm thử

- PASS: `node tests/run-tests.js` — **291/291**, 26 suite.
- PASS trình duyệt thật: phục vụ `index.html` bằng `python -m http.server 8127`, chạy Microsoft Edge qua Playwright, thao tác click app switcher → VN Sheet → tab Công thức → nút Quản lý tên; nhập A1=10, A2=20, tạo `DoanhThu_Q1=A1:A2`, nhập bằng bàn phím `=SUM(DoanhThu_Q1)` vào B1. DOM hiển thị **`30 ₫`**, không có `pageerror`.

## Giới hạn / review

- Named range chỉ hỗ trợ vùng liên tục cùng sheet; luồng CSV hiện chưa lưu metadata named range vào XLSX/ODS.
- `TEXT` chỉ có ba format bắt buộc; `DATEDIF` chỉ `d/m/y`; `NETWORKDAYS` và `SEARCH` chưa triển khai vì ngoài danh sách nhiệm vụ cụ thể.
- Chưa merge vào `main`; chờ Claude review.
