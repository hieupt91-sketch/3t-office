# Q36 — Sửa ba lỗi giao diện Q35 (22/10/2026)

## Phạm vi và thay đổi

1. **Ngăn Trợ giúp dùng chung:** danh sách kết quả giữ ở đầu vùng nội dung, giới hạn 35%; bài hướng dẫn, cụm báo lỗi/cập nhật và các tùy chọn phụ nằm trong cùng vùng cuộn của bài. Panel không còn tự cuộn bên ngoài.
2. **Ribbon:** phép thu gọn thích ứng đo tràn cả nội dung từng nhóm, không chỉ chiều rộng panel. Nhóm vừa được giữ nguyên; nhóm quá rộng thu gọn bằng nút mở menu. Giữ danh sách phông tối thiểu 135 px khi thu gọn để không cụt tên phông.
3. **Writer:** mini toolbar ẩn khi mở menu ngữ cảnh.

Không đổi command definitions, i18n, build system, dependency hay LibreOffice Core.

## Số đo CDP trước/sau

| Mục | Trước | Sau |
|---|---|---|
| Help Writer | 1366×768: panel 890/563 px; 1280×720: 870/515 px; 1024×600: 820/395 px. Ngoài cuộn panel còn cuộn riêng bài và danh sách; cụm nút ở ngoài vùng bài. Bài riêng 703/147 px ở 1366×768. CDP layout probe thất bại ở các cấu hình này. | Writer layout + thao tác: 28/28 PASS. Sheet: 18/18 PASS. Slides: 18/18 PASS. Panel 563/563, 515/515, 395/395 px; kết quả 34.5–34.8% chiều cao body; bài còn 305, 274, 196 px. Cụm thao tác nằm trong vùng cuộn bài. |
| Ribbon Writer/Sheet/Slides | Q35 ghi nhận cắt nhóm Writer/Slides tại 1024×600. Đo trước ở Writer: nhóm “Kiểu” 141 px nội dung / 94 px vùng chứa. Bài probe baseline tái hiện trạng thái chưa thu gọn: 14 FAIL; ví dụ Slides panel 1262/1024 px, Sheet 1779/1366 px. | 68/68 PASS trên ba app, 1920/1366/1280/1024 px, sáng/tối. Không tràn nội dung nhóm, không có cuộn ngang ribbon; ở 1366/1920 không nhóm nào tự thu gọn. Menu nhóm Sheet/Slides mở trong cửa sổ. |
| Mini toolbar Writer | CDP right-click: 6/6 FAIL; mini toolbar vẫn hiện cùng menu ngữ cảnh ở 1366×768, 1280×720 và 1024×600, sáng/tối. | 18/18 PASS; menu hiện, mini toolbar ẩn, menu nằm trong cửa sổ ở cả sáu cấu hình. Kích thước menu 197.6×344.8 px; ở 1024×600 tọa độ dọc 247–591.8 px. |

Help catalog hiện không có liên kết nội bộ (href/data-help-link) để thao tác thử; kiểm tra liên kết nội bộ: **NOT RUN**. Đã kiểm tra tìm “đếm từ”, chọn kết quả, mở bài dài, Esc đóng và F1 mở lại.

## Giao diện đã xem

| Màn hình | Kích thước/giao diện | Kết luận | Ảnh |
|---|---|---|---|
| Writer — Trợ giúp F1, kết quả, bài dài và cụm tùy chọn | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; danh sách ở đầu, bài cuộn riêng, nút/tùy chọn theo sau nội dung bài; panel không tràn. | [trước](assets/q36-ui/help-before/help-1366x768-light.png), [sau](assets/q36-ui/help-after/help-1366x768-light.png), [1024 tối](assets/q36-ui/help-after/help-1024x600-dark.png) |
| Sheet — Trợ giúp F1, danh sách và bài | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; bố cục chung hoạt động, không cuộn ngoài panel. | [1366 sáng](assets/q36-ui/help-after/help-sheet-1366x768-light.png), [1024 tối](assets/q36-ui/help-after/help-sheet-1024x600-dark.png) |
| Slides — Trợ giúp F1, danh sách và bài | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; bố cục chung hoạt động, không cuộn ngoài panel. | [1366 sáng](assets/q36-ui/help-after/help-slides-1366x768-light.png), [1024 tối](assets/q36-ui/help-after/help-slides-1024x600-dark.png) |
| Ribbon Writer — tab Trang đầu và vùng soạn thảo | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; không cắt nhóm/lệnh; tên phông đầy đủ. Không tự thu gọn ở 1366/1920. | [trước 1024 tối](assets/q36-ui/ribbon-before/writer-1024x600-dark.png), [sau 1024 tối](assets/q36-ui/ribbon-after/writer-1024x600-dark.png) |
| Ribbon Sheet — tab Trang đầu và lưới | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; nhóm thu gọn vẫn truy cập qua menu; lưới còn thanh cuộn ngang riêng cho nội dung bảng tính. | [trước 1024 tối](assets/q36-ui/ribbon-before/sheet-1024x600-dark.png), [sau 1024 tối](assets/q36-ui/ribbon-after/sheet-1024x600-dark.png), [menu nhóm](assets/q36-ui/ribbon-after/sheet-1024x600-group-menu.png) |
| Ribbon Slides — tab Trang đầu và trang chiếu | 1366×768, 1280×720, 1024×600; sáng/tối | Đạt; nhóm thu gọn truy cập qua menu. Thanh cuộn ngang bên dưới thuộc vùng trang chiếu, không phải ribbon. | [trước 1024 tối](assets/q36-ui/ribbon-before/slides-1024x600-dark.png), [sau 1024 tối](assets/q36-ui/ribbon-after/slides-1024x600-dark.png), [menu nhóm](assets/q36-ui/ribbon-after/slides-1024x600-group-menu.png) |
| Writer — menu ngữ cảnh trên vùng chữ đã chọn | 1366×768, 1280×720, 1024×600; sáng/tối | Trước: mini toolbar nằm sát/chồng lên menu. Sau: menu đọc được, mini toolbar ẩn; menu nằm trong cửa sổ. | [trước 1024 sáng](assets/q36-ui/mini-before/writer-context-1024x600-light.png), [sau 1024 sáng](assets/q36-ui/mini-after/writer-context-1024x600-light.png) |

Ảnh trước/sau đầy đủ của từng kích thước và giao diện nằm trong `docs/assets/q36-ui/{help,ribbon,mini}-{before,after}/`. Ribbon có thêm CDP kiểm tra 1920 px (ảnh không chụp vì yêu cầu ảnh tập trung vào ba kích thước Q36).

## Kiểm thử

- `npm test`: **PASS 3789/3789**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS**, VI=3148, EN=3148, missingVI=0, missingEN=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS**, 0 dòng bị hạ ở cả ba checklist.
- `python -m pytest tests -q -k "help or ribbon or writer or sheet or slides"`: **PASS 777 passed, 342 deselected, 560.43s**.
- CDP: Help Writer 28/28; Help Sheet 18/18; Help Slides 18/18; ribbon 68/68 sau sửa (14 FAIL ở lượt baseline trước sửa); mini toolbar 18/18 sau sửa (6 FAIL trước sửa).
- Build: **NOT RUN** — không đổi build system.
- Không đổi `command-definitions.js`/`strings-vi.js`; không chạy generator checklist.

## Commit

- `8f21fa5d` — `fix(help): keep Help content within one scroll region`
- `42389f33` — `fix(ribbon): collapse overflowing group contents`
- `89b76460` — `fix(writer): hide mini toolbar for context menu`
- `a50feab9` — `test(help): cover shared panel in Sheet and Slides`
