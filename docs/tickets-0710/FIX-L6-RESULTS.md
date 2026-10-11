# FIX-L6 — Kết quả đối chiếu VN Slides / PowerPoint

Nhánh `audit/slides-l6-codex`; PowerPoint COM mở lại các PPTX đã lưu từ profile `E:\VNOffice-profiles\codex-fl6`. CDP chạy app từ worktree này; ảnh chụp nằm trong `evidence/fix-l6/`.

| Nhóm | Kết quả |
|---|---|
| Hình khối | PASS sau commit `9e38aad6`: đổi màu nền/viền, độ dày viền, kích thước và xoay 30°. COM đọc lại fill/line RGB, 260×150 px tương ứng 195×112.5 pt, xoay 30°. |
| Hộp chữ / bảng / ảnh / biểu đồ | PASS lưu-mở lại: COM thấy textbox type 17, table type 19 kích thước 3×3, ảnh type 13, chart type 3 / ChartType 51. |
| Sơ đồ cơ bản | PARTIAL: UI tạo sơ đồ bốn nút và ba đường nối; PowerPoint đọc thành bảy shape riêng, không có đối tượng SmartArt native. |
| Transition | PARTIAL: COM đọc thời gian 0.8 giây. Preset `zoom` đọc thành enum 3073; chưa khớp được enum native cùng thao tác để kết luận cùng loại. |
| Animation / thứ tự | FAIL: UI đổi thứ tự sang Bay rồi Mờ dần. Sau lưu, COM thấy năm effect con thay vì hai hiệu ứng, `EffectType` và `TriggerType` không đọc được; chưa bảo toàn được loại/trigger/thứ tự native. |
| Layout / Reset | PARTIAL: UI áp layout hai nội dung, PPTX giữ ba placeholder; COM trả `Slide.Layout=1`. Không tìm thấy command Reset trong ribbon/adapter. Chưa xác nhận tương đương PowerPoint. |
| Slide Master / theme | PARTIAL: COM thấy marker master `VNOfficeTheme:minimal-dark`; `Design.Name` vẫn là `Office`, nên chưa xác nhận theme native đã áp dụng hoàn toàn. |
| Ghi chú / trình chiếu | PASS ghi chú diễn giả được COM đọc lại. CDP bắt đầu từ slide 2/2, Ctrl+P bật chế độ bút, Ctrl+L hiện chấm laser; chưa xác minh nét mực được lưu. |
| Lưu PPTX / mở PowerPoint | PASS cho textbox, shape, ảnh, bảng, chart, ghi chú, transition; các giới hạn SmartArt/animation/layout/theme nêu trên vẫn còn. |

## Kiểm tra

- `npm test`: PASS 3068/3068 sau khi sửa dấu phẩy thiếu trong Help registry.
- `python -m unittest`: FAIL theo quy ước test truthfulness — 0 tests, exit 1 (`NO TESTS RAN`).
- `python -m unittest discover`: FAIL — 0 tests, exit 1 (`NO TESTS RAN`).
- Batch `features-audit.desktop.mjs` + PowerPoint COM: PASS thao tác shape, speaker notes, transition duration, animation model, hidden slide; COM đọc notes, transition 0.8 giây và Hidden=-1.
- UI CDP và COM riêng: PASS chèn ảnh/table/chart/sơ đồ, format hình, start-current và laser. Không dùng SendKeys/OS input; COM chỉ đóng PID mới được tạo.

## Commit

- `9e38aad6 fix(slides): format shape fill outline size and rotation`
- Commit audit/handoff tiếp theo chứa phần sửa dấu phẩy Help registry, comparator, kịch bản CDP và bằng chứng.
