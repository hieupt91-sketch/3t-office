# Kế hoạch E3: bàn phím và chuột VN Sheet

## Mục tiêu
Đưa thao tác lưới VN Sheet gần hành vi Excel 2016 cho điều hướng/chọn vùng, sửa ô, điền, chọn bằng chuột, clipboard, hoàn tác/làm lại và menu ngữ cảnh; ghi lại phạm vi hỗ trợ/giới hạn trong ma trận; xác minh bằng CDP trên app desktop với input thật.

## Năng lực hiện có
`apps/sheet/sheet-grid.js` đã xử lý một phần phím điều hướng, Shift+chọn, F2, Enter/Tab, xóa, Ctrl+D/R, clipboard nội bộ, kéo chọn, fill handle, undo/redo, và menu chuột phải. Các hành vi rải trong lớp grid; hiện chưa có tài liệu `docs/EXCEL2016-INPUT-MATRIX.md` và chưa có bài CDP chuyên biệt cho E3.

## Phạm vi tệp/module
- `apps/sheet/sheet-grid.js`: chỉ sửa các handler lưới cần thiết sau khi tái hiện được sai lệch.
- `tests/live/cdp/e3-input.desktop.mjs`: bài kiểm app desktop qua `tests/live/cdp/session.mjs` và `actions.mjs`; không sửa test/expected hiện hữu.
- `docs/EXCEL2016-INPUT-MATRIX.md`: ma trận thao tác, trạng thái và cách xác minh.
- `platform/help/entries-sheet.js` và i18n VI/EN chỉ khi UI/hành vi thay đổi cần bổ sung hướng dẫn dùng cụ thể.
- `/09-templates/AGENT-HANDOFF.md`: handoff cuối công việc.

## Phụ thuộc và ranh giới
Tận dụng CommandBus/undo hiện có; không gọi trực tiếp LibreOffice từ UI; không sửa adapter, Core, server hoặc test fixture. App desktop khởi động qua `main.py`, `VNO_APP_ROOT` trỏ worktree, `VNO_CDP_LOCALAPPDATA=E:\\VNOffice-profiles\\codex-fe3`. Excel COM chỉ mở workbook chỉ đọc, từng tệp một, không lưu.

## Rủi ro
Input đang sửa trong formula bar/editor có thể xung đột với phím điều hướng lưới; vùng chọn nhiều ô và virtual scrolling có thể lệch active cell; clipboard hệ điều hành và clipboard nội bộ có semantics khác; thay đổi undo sai có thể ảnh hưởng sửa ô và XLSX đã lưu. Chỉ sửa sau khi ca CDP tái hiện được.

## Kế hoạch kiểm tra
Chạy bài CDP desktop riêng với `Input.dispatchKeyEvent`/`Input.dispatchMouseEvent` qua client/actions, kiểm các kết quả lưới và giá trị sau commit. Cuối đợt chạy `npm test`, `python -m unittest discover -s tests`, batch audit 8 XLSX, `sheet_formulas_vs_cache.mjs` đủ 28 XLSX, rà BOM/mojibake và báo mức từng tệp so mốc 0.9.9. Không sửa expected/fixture để đạt xanh.

## Rollback
Mỗi nhóm thay đổi được commit độc lập. Revert commit E3 tương ứng để quay lại hành vi trước đó; nhóm tài liệu/CDP có thể revert độc lập. Không có thay đổi schema hay đường lưu/mở XLSX trong kế hoạch này.
