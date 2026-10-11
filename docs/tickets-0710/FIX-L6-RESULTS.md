# FIX-L6 — Kết quả đối chiếu VN Slides / PowerPoint

Nhánh `audit/slides-l6-codex`; PowerPoint COM mở lại các PPTX đã lưu từ profile `E:\VNOffice-profiles\codex-fl6`. CDP chạy app từ worktree này; ảnh chụp nằm trong `evidence/fix-l6/`.

| Nhóm | Kết quả |
|---|---|
| Hình khối | PASS sau commit `9e38aad6`: đổi màu nền/viền, độ dày viền, kích thước và xoay 30°. COM đọc lại fill/line RGB, 260×150 px tương ứng 195×112.5 pt, xoay 30°. |
| Hộp chữ / bảng / ảnh / biểu đồ | PASS lưu-mở lại: COM thấy textbox type 17, table type 19 kích thước 3×3, ảnh type 13, chart type 3 / ChartType 51. |
| Sơ đồ cơ bản | PARTIAL: UI tạo sơ đồ bốn nút và ba đường nối; PowerPoint đọc thành bảy shape riêng, không có đối tượng SmartArt native. |
| Transition | PARTIAL: COM đọc thời gian 0.8 giây. Preset `zoom` đọc thành `EntryEffect=3073` (`ppEffectBoxOut`), thời gian khớp 0.8 giây. PowerPoint COM từ chối `3347` (`ppEffectZoomOut`) khi đặt transition; chưa kết luận được nhãn Zoom của UI Office tương ứng enum nào. [Microsoft enum](https://learn.microsoft.com/pt-br/OFFICE/VBA/api/powerpoint.ppentryeffect). |
| Animation / thứ tự | PASS sau commit sửa adapter: COM đọc lại đúng thứ tự Fade, Fade, Fly; `EffectType=10,10,2`, `TriggerType=1` (click), thời lượng 0.8/0.8/0.5 giây; COM đọc `TriggerDelayTime` qua comparator. Lỗi ban đầu do thiếu group timing wrapper trong PPTX đã được tái hiện và sửa. |
| Layout / Reset | FAIL về native layout: PowerPoint COM fixture tạo bằng `Slides.Add(1, 3)` đọc `Slide.Layout=3` (Two-Column Text); VN Slides lưu Hai nội dung nhưng COM đọc `1`. Reset UI dựng lại placeholder, giữ nguyên chữ/shape và được CDP chụp. Sửa layout ID cần đổi quan hệ/layout semantics trong PPTX; dừng trước thay đổi này theo AGENTS.md §11. |
| Slide Master / theme | PARTIAL: COM thấy marker master `VNOfficeTheme:minimal-dark`; `Design.Name` vẫn là `Office`, nên chưa xác nhận theme native đã áp dụng hoàn toàn. |
| Ghi chú / trình chiếu | PASS ghi chú diễn giả được COM đọc lại. CDP bắt đầu từ slide 2/2, Ctrl+P bật chế độ bút, Ctrl+L hiện chấm laser; chưa xác minh nét mực được lưu. |
| Lưu PPTX / mở PowerPoint | PASS cho textbox, shape, ảnh, bảng, chart, ghi chú, transition; các giới hạn SmartArt/layout/theme nêu trên vẫn còn. |

## Kiểm tra

- `npm test`: PASS 3070/3070 sau khi thêm Help/i18n và Reset.
- `python -m unittest`: FAIL theo quy ước test truthfulness — 0 tests, exit 1 (`NO TESTS RAN`).
- `python -m unittest discover`: FAIL — 0 tests, exit 1 (`NO TESTS RAN`).
- `python -m unittest discover -s tests -p test_slides_pptx_animation_timing.py`: PASS 2/2.
- Batch `features-audit.desktop.mjs` + PowerPoint COM: PASS shape, speaker notes, transition duration, animation native type/order/trigger, hidden slide; COM đọc notes, transition 0.8 giây, Hidden=-1 và effect types/timing.
- UI CDP và COM riêng: PASS chèn ảnh/table/chart/sơ đồ, format hình, reset layout, start-current và laser. Không dùng SendKeys/OS input; COM chỉ đóng PID mới được tạo.

## Commit

- `9e38aad6 fix(slides): format shape fill outline size and rotation`
- `0176ba2c test(slides): record fix-l6 powerpoint parity audit`
- `60c0077d fix(slides): preserve PowerPoint animation timeline types`
- Commit riêng thêm lệnh Đặt lại bố cục, Help/i18n và hồi quy UI/model.
