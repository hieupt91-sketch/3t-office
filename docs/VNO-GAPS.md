# VNO-GAPS — Danh sách khoảng trống đã rà soát, chờ code

Quy ước: khi Claude rà soát phát hiện 1 khoảng trống (UI thiếu icon/layout sai, hoặc tính năng chưa có code xử lý), đánh dấu ngay tại vị trí liên quan trong code bằng comment:

```
// VNO-GAP-UI: <mô tả ngắn> — agy xử lý
// VNO-GAP-LOGIC: <mô tả ngắn> — Codex/Grok xử lý
```

Và thêm 1 dòng vào bảng dưới đây. Khi giao việc, chỉ cần nói agent: "grep VNO-GAP-UI (hoặc VNO-GAP-LOGIC) trong repo, xử lý từng mục, xoá marker sau khi xong" — không cần mô tả lại chi tiết.

Sau khi 1 agent xử lý xong 1 mục: xoá comment marker khỏi code, đánh dấu `[x]` ở bảng dưới, agent tự viết 1 dòng ngắn "đã xử lý: ..." thay vì cả handoff dài (trừ khi thay đổi lớn/rủi ro cao thì vẫn cần handoff đầy đủ như thường lệ).

## Trạng thái: `[ ]` chưa xử lý · `[x]` xong

| # | Loại | Vị trí | Mô tả | Trạng thái |
|---|---|---|---|---|
| 1 | UI | `apps/sheet/sheet-ribbon.js` nhóm "Chỉnh sửa" (Editing) trong tab Home | Sheet tab Home tràn ngang ở độ phân giải 1366px: agy đã gộp nhóm Fill Down + Fill Right thành 1 nút dropdown lớn "Điền" (`sheet.edit.fill`), và Clear All + Clear Formats + Clear Contents thành 1 nút dropdown lớn "Xóa" (`sheet.edit.clear`) chuẩn UX Excel. Giảm bề rộng nhóm Chỉnh sửa từ 414.81px xuống 300.42px (tiết kiệm ~114.39px), ribbon scrollWidth giảm từ 1745px xuống 1576px. Toàn bộ command ID cũ giữ nguyên 100%, 750/750 tests PASS. Chi tiết xem `docs/HANDOFF-SHEET-EDITING-DROPDOWN.md`. | [x] agy đã hoàn thành |
| 2 | UI | `apps/sheet/sheet-ribbon.js` tab `formulas` | Formulas tab tràn nhẹ ~22px ở 1366px | [x] Claude đã sửa xong qua CSS responsive trong `shell.css`, hết tràn hoàn toàn |
| 3 | UI | `apps/sheet/sheet-ribbon.js`, `platform/shell/shell.css` tab Home Sheet | Sheet tab Home tràn ngang còn lại ở 1366px (scrollWidth=1750px) và 1600px (scrollWidth=1792px): agy đã tối ưu cấu trúc cột Clipboard (Cut, Copy, Paste Special thành cột 3 hàng cạnh nút Dán lớn chuẩn Excel) và cơ chế responsive 2 cấp (thu gọn nhãn nhóm Styles ở <=1650px; thu gọn nhãn nhóm Cells và các nút merge phụ trong Alignment ở <=1400px). Kết quả: cả 1600px và 1366px đều đạt 0px tràn ngang (scrollWidth = clientWidth), 0 nhóm tràn, 100% nút lệnh bấm được, 761/761 test PASS. Chi tiết xem `docs/HANDOFF-SHEET-RIBBON-OVERFLOW-ROUND2.md`. | [x] agy đã hoàn thành |

## Cách rà soát tiếp (cho Claude ở phiên sau, hoặc tự chạy lại)

Script kiểm tra tràn ngang ribbon theo từng tab/độ phân giải: `C:\Users\3TCOMP~1\AppData\Local\Temp\claude\E--VN-OFice\a2708d1e-b20f-423b-b8da-63653881acf4\scratchpad\audit-ribbon-layout.mjs` (cần dev server đang chạy ở `http://127.0.0.1:8899/`, hỗ trợ `?app=writer|sheet|slides`). Mở rộng mảng `WIDTHS` để kiểm tra thêm độ phân giải khác nếu cần.
