# Brief: lưu XLSX — (1) màu tab sheet KHÔNG được ghi ra file, (2) không sheet nào tabSelected → Excel hiện "[Group]", (3) còn thiếu 1 ảnh/sheet

Cùng worktree, nhánh mới `fix/sheet-save-tabs` (tạo từ main 0920002: `git checkout -b fix/sheet-save-tabs main`). Quy tắc
như trước; đo bằng app thật `_roundtrip_save_sheet.py`, `python _xlsx_tabs.py <xlsx>` (đếm tabColor/tabSelected).

## Claude đo (KHÓA CỬA, bản lưu ra từ main)
```
gốc:      sheets 6  tabColor 6  tabSelected 1
lưu ra:   sheets 6  tabColor 0  tabSelected 0   ← Excel mở lên tiêu đề "[Group]" (không sheet nào được chọn)
```
Handoff KHÓA CỬA hiển thị từng ghi "round-trip giữ tab color" — sai: app ghi `vno:tab-color` (namespace riêng) nên
LibreOffice bỏ qua khi FODS→XLSX. Sửa:
1. serializeToFods ghi thêm thuộc tính LibreOffice hiểu: `<style:table-properties … tableooo:tab-color="#ffff00"/>`
   (namespace `xmlns:tableooo="http://openoffice.org/2009/table"` — kiểm tra FODS soffice tạo từ gốc dùng đúng tên gì,
   grep `tab-color`) trong style `ta*` của từng sheet → LibreOffice tự xuất `<sheetPr><tabColor rgb="FFFFFF00"/>`. Nếu
   LibreOffice vẫn không xuất → post-process XLSX chèn `<sheetPr><tabColor rgb=…/>` (đúng thứ tự schema: sheetPr đứng
   đầu worksheet) từ `vno:tab-color`/`tableooo:tab-color` trong FODS gửi đi.
2. tabSelected: worksheet của sheet active (ActiveTable/vno:active-sheet) phải có `<sheetView tabSelected="1">`, các sheet
   khác không. Kiểm tra `_apply_active_tab`/post-process hiện có: activeTab đúng nhưng sheetView thiếu.
3. Ảnh còn thiếu: FODS soffice vs app gửi đi: BIỆT THỰ 8→7, THÔNG MINH 19→18, NHÔM KÍNH 10→9, KÍNH 3→2 — mỗi sheet mất
   đúng 1 (có lẽ ảnh đầu tiên/ảnh ở ô gộp C2, hoặc frame không có `office:binary-data`). Liệt kê frame thiếu (draw:name +
   ô) bằng cách diff hai FODS, sửa, đạt bằng nhau 6/6 sheet; XLSX lưu ra 60 `xdr:pic` như gốc.
Kết quả cần: `_xlsx_tabs.py` → tabColor 6, tabSelected 1; Excel mở không "[Group]", tab có màu; auditor nhóm image = 0.
Unit test cho (1)(2). `docs/HANDOFF-SHEET-SAVE-TABS.md`.
