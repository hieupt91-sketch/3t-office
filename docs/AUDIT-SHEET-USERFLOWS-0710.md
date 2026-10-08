# Audit Sheet — ma trận cắt/sao chép/dán trên app desktop (SC2)

## Phạm vi và kế hoạch

- Objective: nghiệm thu cắt/sao chép/dán của Sheet trên app desktop thật qua WebView2 CDP, gồm dữ liệu nội bộ, Excel HTML, bảng web, Doc, Slide và dán chỉ giá trị.
- Current capability: tái sử dụng `SheetAdapter`, `SheetGridController`, lớp clipboard Office dùng chung và bridge clipboard desktop; không gọi implementation LibreOffice trực tiếp từ UI.
- Files/modules: harness `tests/live/sheet-user-flows.desktop.mjs`; helper CDP `tests/live/cdp/actions.mjs`; sửa nhỏ đường truyền `colWidths` trong Sheet adapter/grid; unit regression trong `tests/unit/sheet-copy-paste-format.test.js`.
- Dependency: không thêm dependency; `main.py` tự khởi động server/app; `scripts/serve.js` không được dùng.
- Risk: clipboard HTML của Windows chuẩn hóa màu CSS; layout cột nằm ngoài cell model; Excel COM là tài nguyên dùng chung giữa các worktree.
- Test plan: từng dòng desktop phải PASS và có một bước Ctrl+Z/Ctrl+Y; sau đó full Node, full Python. Theo quy tắc cập nhật ngày 2026-10-08, không chạy batch 28 XLSX trong worktree SC2; chỉ chạy từng tệp nếu phát sinh nhu cầu chẩn đoán cụ thể.
- Rollback: revert commit sửa lỗi `22076d50`; harness/audit là commit độc lập, không sửa Core/upstream.

## Môi trường

- Worktree: `E:\VNOffice-codex-sc2`
- Branch: `fix/sheet-paste-matrix-codex`
- Điều khiển: WebView2 CDP (`Input.dispatchKeyEvent`), không SendKeys, không `pywebview.evaluate_js`.
- Mỗi phiên dùng `LOCALAPPDATA` tạm riêng; Doc/Slide/Sheet cho cross-app được chạy tuần tự, đóng đúng PID trước khi mở app kế tiếp.

## Kết quả ma trận desktop

| Dòng | Nội dung đo trực tiếp | Undo/Redo | Kết quả |
|---|---|---|---|
| Copy trong Sheet | Giá trị; công thức `=A1*2` dịch thành `=E1*2` và tính lại 24; number/date/VND; đậm; nền; viền; ô gộp; cột 111/144/177 px | Ctrl+Z xóa toàn ma trận trong 1 bước; Ctrl+Y khôi phục cả dữ liệu, merge và độ rộng | PASS |
| Cut trong Sheet | Nguồn được xóa cả giá trị/công thức/style; đích nhận toàn ma trận; công thức dịch thành `=E6*2`; merge được chuyển | Ctrl+Z khôi phục nguồn và xóa đích trong 1 bước; Ctrl+Y chuyển lại | PASS |
| Dán chỉ giá trị | Ctrl+Shift+V nhận ma trận giá trị, loại công thức, style nguồn và merge | Ctrl+Z/Ctrl+Y đúng 1 bước | PASS |
| Dán từ Excel | HTML clipboard có `x:num`, `x:f`, `mso-number-format`, CSS, colspan và colgroup; nhận đúng số/công thức/ngày/VND/đậm/nền/viền/merge/cột 123/156/189 px | Ctrl+Z/Ctrl+Y đúng 1 bước | PASS |
| Dán từ trang web | Bảng 1x2 nhận `Web`, số 42, chữ đậm, nền và viền | Ctrl+Z/Ctrl+Y đúng 1 bước | PASS |
| Doc → Sheet | Doc thật ghi bảng 2x2 vào clipboard hệ thống; Sheet nhận chữ/số/ngày và định dạng đậm/nền/viền | Đóng Doc theo PID trước khi mở Sheet; Ctrl+Z/Ctrl+Y đúng 1 bước | PASS |
| Slide → Sheet | Slide thật ghi bảng 1x2 vào clipboard hệ thống; Sheet nhận chữ/số và định dạng đậm/nền/viền (màu do Chromium chuẩn hóa sang `rgb`) | Đóng Slide theo PID trước khi mở Sheet; Ctrl+Z/Ctrl+Y đúng 1 bước | PASS |

Lệnh: `node --experimental-websocket tests/live/sheet-user-flows.desktop.mjs` — **PASS 7/7**.

Kết quả trên đã được chạy lại sau khi merge `main` tại commit `cae2bcef`; toàn bộ PID app do harness mở đều được đóng thành công trước khi chuyển app.

## Lỗi tìm thấy và sửa

### SC2-01 — Dán không giữ độ rộng cột

- Bằng chứng trước sửa: nguồn A:C rộng 111/144/177 px nhưng đích E:G đều 64 px; các giá trị, công thức, style và merge vẫn đúng.
- Nguyên nhân: serializer đã tạo `model.colWidths`, nhưng `SheetAdapter._captureSelectedClipboard()` làm rơi trường này; `SheetGridController.applyPasteSpecial()` cũng chưa áp layout và chưa đưa layout vào cùng history action.
- Sửa: truyền `colWidths` qua clipboard model; khi dán source/all thì áp độ rộng cho cột đích; lưu `beforeLayout/afterLayout` trong chính action `batch-cells` để Undo/Redo vẫn đúng một bước.
- Unit regression: `Copy/paste carries source column widths in the same Undo/Redo history step`.
- Commit: `22076d50 fix(sheet): preserve pasted column widths`.

## Cổng kiểm thử

| Cổng | Kết quả |
|---|---|
| Desktop CDP matrix | PASS 7/7 |
| Unit riêng Sheet copy/paste | PASS 6/6 |
| `node tests/run-tests.js` | PASS 2957/2957, 0 FAIL |
| `python -m unittest discover -s tests` | PASS 793/793 sau khi merge main; lần chạy cũ trước merge có race cleanup của updater, test lỗi chạy riêng PASS rồi full suite PASS |
| `batch_document_audit.py xlsx` | NOT RUN — không chạy lại theo quy tắc mới; lần thử trước đó đã bị hủy khi phát hiện worktree khác đang giữ Excel COM/chạy Sheet đồng thời |

## Tích hợp main

- Đã merge `main` để lấy SB10–SB13 (và SB14 đã có trên đầu main) tại commit `cae2bcef`.
- Xung đột duy nhất ở `scripts/layout-audit/batch_document_audit.py`: giữ API `reuse_saved`, đánh dấu dirty mặc định và cơ chế dọn PID Office theo ownership từ main; phần SC2 trùng chức năng được loại bỏ.
- `xmlns:loext` trong root `office:document` chỉ còn một khai báo sau merge.
