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
| 1 | UI | `platform/ribbon/ribbon.css` `.vno-ribbon-group-items`/`.vno-ribbon-group` | Sheet tab Home (nhóm "Chỉnh sửa") tràn ngang ~189px ở độ phân giải 1366px (laptop phổ biến VN) — ribbon có `overflow-x:auto` nên không vỡ layout nhưng phải cuộn ngang mới thấy hết nút Sort/Find. Cần giảm gap/padding responsive ở `<=1400px` hoặc đổi 1 phần nhóm Editing (Fill/Clear) sang dropdown gọn hơn giống Excel thật. | [ ] |
| 2 | UI | `apps/sheet/sheet-ribbon.js` tab `formulas` | Formulas tab tràn nhẹ ~22px ở 1366px — mức độ nhỏ, ưu tiên thấp hơn #1. | [ ] |

## Cách rà soát tiếp (cho Claude ở phiên sau, hoặc tự chạy lại)

Script kiểm tra tràn ngang ribbon theo từng tab/độ phân giải: `C:\Users\3TCOMP~1\AppData\Local\Temp\claude\E--VN-OFice\a2708d1e-b20f-423b-b8da-63653881acf4\scratchpad\audit-ribbon-layout.mjs` (cần dev server đang chạy ở `http://127.0.0.1:8899/`, hỗ trợ `?app=writer|sheet|slides`). Mở rộng mảng `WIDTHS` để kiểm tra thêm độ phân giải khác nếu cần.
