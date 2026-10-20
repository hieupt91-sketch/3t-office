# Q38 — Quét giao diện Sheet (21/10/2026)

## Kiểm kê

Đã đọc docs/UI-REVIEW-20-10.md, 21-10.md, 22-10.md, docs/RIBBON-BACKLOG.md, platform/ribbon/ribbon-host.js, apps/sheet/sheet-ribbon.js và command definitions Sheet. Không lặp lại tab ribbon, lưới, Help/backstage đã rà trước. CODEX-COMMON-RULES.md không có trong checkout; áp dụng quy tắc Q38 người dùng cung cấp.

Ribbon có 19 dropdown: Bố trí trang 13 (Chủ đề, Màu, Phông chữ, Căn lề, Hướng giấy, Khổ giấy, Chiều rộng, Chiều cao, Đưa lên trên, Đưa xuống dưới, Căn chỉnh, Nhóm, Xoay); Trang đầu 4 (Hướng chữ, Định dạng, Điền, Xóa); Dữ liệu (Phân tích What-If); Chế độ xem (Cố định ô). Mỗi menu được mở bằng CDP chuột, chụp và xem sáng/tối 1366×768. Các 38 ảnh: [Bố trí sáng](assets/q38-ui/dropdown-light-Btrtrang-0.png), [Bố trí tối](assets/q38-ui/dropdown-dark-Btrtrang-0.png), [Trang đầu sáng](assets/q38-ui/dropdown-light-Trangu-0.png), [Trang đầu tối](assets/q38-ui/dropdown-dark-Trangu-0.png), [What-If sáng](assets/q38-ui/dropdown-light-Dliu-0.png), [What-If tối](assets/q38-ui/dropdown-dark-Dliu-0.png), [Cố định sáng](assets/q38-ui/dropdown-light-Chxem-0.png), [Cố định tối](assets/q38-ui/dropdown-dark-Chxem-0.png); từng ảnh theo các liên kết dưới đây:

Bố trí sáng: [0](assets/q38-ui/dropdown-light-Btrtrang-0.png), [1](assets/q38-ui/dropdown-light-Btrtrang-1.png), [2](assets/q38-ui/dropdown-light-Btrtrang-2.png), [3](assets/q38-ui/dropdown-light-Btrtrang-3.png), [4](assets/q38-ui/dropdown-light-Btrtrang-4.png), [5](assets/q38-ui/dropdown-light-Btrtrang-5.png), [6](assets/q38-ui/dropdown-light-Btrtrang-6.png), [7](assets/q38-ui/dropdown-light-Btrtrang-7.png), [8](assets/q38-ui/dropdown-light-Btrtrang-8.png), [9](assets/q38-ui/dropdown-light-Btrtrang-9.png), [10](assets/q38-ui/dropdown-light-Btrtrang-10.png), [11](assets/q38-ui/dropdown-light-Btrtrang-11.png), [12](assets/q38-ui/dropdown-light-Btrtrang-12.png).

Bố trí tối: [0](assets/q38-ui/dropdown-dark-Btrtrang-0.png), [1](assets/q38-ui/dropdown-dark-Btrtrang-1.png), [2](assets/q38-ui/dropdown-dark-Btrtrang-2.png), [3](assets/q38-ui/dropdown-dark-Btrtrang-3.png), [4](assets/q38-ui/dropdown-dark-Btrtrang-4.png), [5](assets/q38-ui/dropdown-dark-Btrtrang-5.png), [6](assets/q38-ui/dropdown-dark-Btrtrang-6.png), [7](assets/q38-ui/dropdown-dark-Btrtrang-7.png), [8](assets/q38-ui/dropdown-dark-Btrtrang-8.png), [9](assets/q38-ui/dropdown-dark-Btrtrang-9.png), [10](assets/q38-ui/dropdown-dark-Btrtrang-10.png), [11](assets/q38-ui/dropdown-dark-Btrtrang-11.png), [12](assets/q38-ui/dropdown-dark-Btrtrang-12.png).

Trang đầu sáng: [0](assets/q38-ui/dropdown-light-Trangu-0.png), [1](assets/q38-ui/dropdown-light-Trangu-1.png), [2](assets/q38-ui/dropdown-light-Trangu-2.png), [3](assets/q38-ui/dropdown-light-Trangu-3.png).

Trang đầu tối: [0](assets/q38-ui/dropdown-dark-Trangu-0.png), [1](assets/q38-ui/dropdown-dark-Trangu-1.png), [2](assets/q38-ui/dropdown-dark-Trangu-2.png), [3](assets/q38-ui/dropdown-dark-Trangu-3.png).
 Kết luận: đạt, không thấy tràn/cắt/che.

Menu Tệp sáng/tối: [sáng](assets/q38-ui/file-light-1366.png), [tối](assets/q38-ui/file-dark-1366.png); đạt.

| Lệnh/loại UI | Kết quả và ảnh đã xem |
|---|---|
| sheet.format.cellsDialog — dialog Định dạng ô | Lỗi tương phản danh mục tối, trước 2.317:1, sau 8.554:1. [Trước](assets/q38-ui/dialog-format-cells-dark-1366.png), [sau 1366](assets/q38-ui/dialog-format-cells-dark-after-1366.png), [sau 1280](assets/q38-ui/dialog-format-cells-dark-after-1280.png). |
| sheet.format.conditional — dialog/quản lý quy tắc | Ban đầu manager 7 px và nội dung chồng/tràn; sau đổi grid/min-height 66 px, nội dung cuộn trong vùng. [Sáng 1366](assets/q38-ui/dialog-conditional-light-after-1366.png), [tối 1366](assets/q38-ui/dialog-conditional-dark-after-1366.png), [tối 1280](assets/q38-ui/dialog-conditional-dark-after-1280.png). |
| sheet.style.formatAsTable — gallery | Tiêu đề tối 1.083:1, sau sửa 15.046:1. [Trước](assets/q38-ui/open-dark-format-table-1366.png), [sau 1366](assets/q38-ui/dialog-format-table-dark-after-1366.png), [sau 1280](assets/q38-ui/dialog-format-table-dark-after-1280.png). |
| sheet.style.cellStyles — gallery | Tiêu đề tối 1.083:1, sau sửa 15.046:1. [Trước](assets/q38-ui/open-dark-cell-styles-1366.png), [sau 1366](assets/q38-ui/dialog-cell-styles-dark-after-1366.png), [sau 1280](assets/q38-ui/dialog-cell-styles-dark-after-1280.png). |
| sheet.data.customSort — thông báo thiếu vùng dữ liệu | Nói rõ cần ít nhất hai hàng; [sáng](assets/q38-ui/open-light-custom-sort-1366.png), [tối](assets/q38-ui/open-dark-custom-sort-1366.png). |
| sheet.data.advancedFilter — dialog | Đạt hiển thị; [sáng](assets/q38-ui/open-light-advanced-filter-1366.png), [tối](assets/q38-ui/open-dark-advanced-filter-1366.png). |
| sheet.data.removeDuplicates — dialog | Đạt hiển thị; [sáng](assets/q38-ui/open-light-remove-duplicates-1366.png), [tối](assets/q38-ui/open-dark-remove-duplicates-1366.png). |
| sheet.data.validation — dialog cao | Đạt 1366×768/1280×720, sáng/tối; vùng cuộn/chân dialog thấy được. [Sáng](assets/q38-ui/open-light-validation-1366.png), [tối](assets/q38-ui/open-dark-validation-1366.png), [tối 1280](assets/q38-ui/open-dark-validation-1280.png). |
| sheet.data.pivotTable — dialog | Trước nội dung 559 px > khung 459 px; sau bỏ min-width, vừa khung. [Sáng](assets/q38-ui/open-light-pivot-table-1366.png), [tối 1366](assets/q38-ui/dialog-pivot-dark-after-1366.png), [tối 1280](assets/q38-ui/dialog-pivot-dark-after-1280.png). |
| sheet.col.width / sheet.row.height — menu Định dạng | Độ rộng cột đạt [ảnh](assets/q38-ui/nested-light-col-width-1366.png); Chiều cao hàng chưa bắt được UI. |
| sheet.sheet.rename / moveOrCopy / unhide / protect — dialog | Đạt bố cục; trạng thái unhide trống rõ, lưu ý bảo vệ hiển thị. [Đổi tên](assets/q38-ui/nested-light-rename-sheet-1366.png), [di chuyển/sao chép](assets/q38-ui/nested-light-move-copy-sheet-1366.png), [hiện](assets/q38-ui/nested-light-unhide-sheet-1366.png), [bảo vệ](assets/q38-ui/nested-light-protect-sheet-1366.png). |
| sheet.data.goalSeek / dataTable / scenarioManager — dialog What-If | Dò tìm mục tiêu và bảng dữ liệu đạt: [goal](assets/q38-ui/nested-light-goal-seek-1366.png), [table](assets/q38-ui/nested-light-data-table-1366.png). Scenario ban đầu tràn ngang (460>458 px), nút như chữ thường; sau sửa đạt, 5 nút cao 15.3→27.3 px. [Trước](assets/q38-ui/nested-light-scenario-manager-1366.png), [sau 1366](assets/q38-ui/dialog-scenario-dark-after-1366.png), [sau 1280](assets/q38-ui/dialog-scenario-dark-after-1280.png). |

## Sửa và commits

- Dark category Định dạng ô: CDP trước FAIL 2.317:1, sau PASS 8.554:1 — ca90f64c.
- Pivot dialog overflow: trước FAIL 559>459 px, sau PASS 1366/1280 — df75c978.
- Conditional manager clip: trước FAIL 7 px, sau PASS ở 1366/1280 sáng/tối — 17fe7544.
- Hai gallery title contrast: trước FAIL 1.083:1, sau PASS 15.046:1 — 5343ea04, ee5f5d9f.
- Scenario dialog overflow/actions: trước FAIL 460>458 px; sau PASS 1366/1280 — 69b04fbc.
- CDP tests riêng: tests/live/cdp/q38-*-desktop.mjs; Scenario test mới q38-scenario-dialog-overflow.desktop.mjs. Không sửa Help, i18n hay command defs.

## Giao diện đã xem

19 dropdown (38 ảnh) và menu Tệp (2 ảnh): sáng/tối 1366×768, đạt. 9 luồng dialog/gallery chính: sáng/tối 1366×768; dialog cao có 1280×720; đã xem ảnh trước/sau cho các lỗi đã sửa. 8 luồng lồng: ảnh sáng 1366×768; Scenario thêm ảnh tối sau sửa 1366/1280. Không thấy chữ bị cắt, chồng lấn, nút khuất, icon thiếu hoặc tên sản phẩm cấm trong ảnh đã xem. Gallery tối trước sửa có lỗi tương phản nêu trên.

NOT RUN: Tab/Enter/Esc cho mọi luồng; 7 dialog lồng còn lại ở dark mode; Chiều cao hàng; launcher nhóm ribbon và nhánh tùy chỉnh lề/cỡ giấy; thử nhập sai cho từng dialog. Không kết luận đạt các mục này.

## Gate

Sẽ bổ sung số liệu sau khi chạy: npm test; node scripts/audit-0610/i18n_parity.mjs; python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix; python -m pytest tests -q -k "sheet or dialog or ribbon". Không chạy checklist generators vì không sửa command-definitions.js/strings-vi.js. Smoke 3 app không áp dụng (chỉ sửa apps/sheet).

Commits: ca90f64c, df75c978, 17fe7544, 5343ea04, ee5f5d9f, 69b04fbc.


## Kết quả gate cuối

- npm test: PASS — 3789/3789, 0 fail.
- node scripts/audit-0610/i18n_parity.mjs: PASS — VI=3148, EN=3148, missingVI=0, missingEN=0; 20 identical/empty values were reported by the existing audit heuristic.
- python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix: PASS — 0 dòng bị hạ; Word 279, Excel 217, PowerPoint 269 dòng.
- python -m pytest tests -q -k "sheet or dialog or ribbon": PASS — 338 passed, 781 deselected, 232.25s.
