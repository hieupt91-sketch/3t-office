# HANDOFF: VN Sheet Ribbon Parity Round 1

**Branch:** fix/sheet-ribbon-parity-round1
**Commit:** 76cb8d5
**Ngày:** 2026-09-06
**Files thay đổi:** apps/sheet/sheet-ribbon.js, platform/i18n/strings-vi.js, platform/i18n/strings-en.js

---

## Tổng kết công việc đã làm

Round 1 parity tập trung vào 4 tab đầu (Home, Insert, Page Layout, Formulas) của VN Sheet ribbon để khớp cấu trúc nhóm/lệnh với Microsoft Excel thật. Toàn bộ 1288/1288 unit tests đạt và 100% playwright ribbon audit 1280px đạt (0px tràn ngang trên 26 tab, 2 độ phân giải, 2 ngôn ngữ).

---

## Chi tiết thay đổi từng tab

### Tab HOME

Cấu trúc giữ nguyên ngoại trừ điều chỉnh nhỏ trong 2 nhóm:

**Alignment group** được sắp xếp lại theo chuẩn Excel:
- Row 1: alignTop, alignMiddle, alignBottom, wrapText (thêm wrapText lên row 1 như Excel)
- Row 2: alignLeft, alignCenter, alignRight, indentDecrease, indentIncrease
- Row 3: mergeCenter, mergeAcross, mergeCells, unmerge (giữ nguyên 4 button riêng lẻ vì test playwright yêu cầu chúng visible)

Trước đây wrapText nằm ở row 2 cùng align left/center/right. Excel thật đặt wrapText ở row 1 cùng vertical alignment buttons.

**Number group** bỏ button cellsDialog trùng (nhưng phải giữ lại sau khi phát hiện sheet-format-cells.test.js dòng 82 yêu cầu nút này nằm trong column.items).

Các nhóm khác (Clipboard, Font, Styles, Cells, Editing) giữ nguyên vì đã đúng chuẩn và test bắt buộc cấu trúc hiện tại.

### Tab INSERT

Thêm **Tables group** mới (id: tables, labelKey: sheetRibbon.group.tables) đứng đầu Insert tab, chứa nút pivotTable (large). Đây là thứ tự đúng theo Excel: Tables | Illustrations | Charts | Sparklines | Links | Text.

Nhóm **Text** bổ sung thêm sheet.page.headerFooter (Header & Footer) cạnh textbox. Excel thật đặt Header & Footer trong nhóm Text của tab Insert.

### Tab PAGE LAYOUT

Gộp 3 nhóm cũ (Thiết lập trang + Vùng in + Ngắt trang) thành 1 nhóm **Page Setup** (id: pageSetup, labelKey: sheetRibbon.group.pageSetup) với thứ tự: margins, orientation, size, setPrintArea/clearPrintArea (column), insertPageBreak/removePageBreak (column), printTitles.

Thêm nhóm **Scale to Fit** (id: scaleToFit, labelKey: sheetRibbon.group.scaleToFit) chứa sheet.page.scale.

Thêm nhóm **Sheet Options** (id: sheetOptions, labelKey: sheetRibbon.group.sheetOptions) chứa sheet.view.gridlines và sheet.view.headings.

Cũng thêm 3 labelKey mới vào cả strings-vi.js và strings-en.js: tables, pageSetup, scaleToFit, sheetOptions.

### Tab FORMULAS

Giữ nguyên hoàn toàn - cấu trúc đã đúng chuẩn Excel với các nhóm: Function Library, Defined Names, Formula Auditing, Calculation.

---

## Ràng buộc test quan trọng đã phát hiện

Playwright ribbon-audit-1280 (dòng 188-212) yêu cầu các button sau phải VISIBLE riêng lẻ trên ribbon (không được ẩn trong dropdown):
- sheet.cell.mergeCenter, mergeAcross, mergeCells, unmerge
- sheet.row.insert, sheet.col.insert, sheet.row.delete, sheet.col.delete
- sheet.formula.sum, sheet.data.sortAsc, sheet.data.sortDesc, sheet.data.filter

Vì lý do này, Merge buttons KHÔNG thể gộp thành dropdown (dù Excel thật dùng dropdown Merge & Center). Cells group KHÔNG thể gộp Insert/Delete thành dropdown. Đây là trade-off giữa parity và test compatibility.

sheet-format-cells.test.js dòng 82 yêu cầu sheet.format.cellsDialog phải nằm trong column.items của nhóm Number (thêm vào dưới row format buttons).

---

## Gaps cần logic bổ sung trong vòng sau

Các tính năng sau chưa có command handler và được ghi nhận để xử lý trong Round 2:

**sheet.cell.orientation** chưa có handler trong sheet-adapter.js. Excel thật có nút Orientation trong nhóm Alignment cho phép xoay chữ theo góc. Cần tạo handler mới.

**Sheet Options - Print Gridlines và Print Headings** chưa có logic in ấn thật. Hiện chỉ có sheet.view.gridlines và sheet.view.headings (hiển thị trên màn hình). Cần thêm command và handler để kiểm soát in lưới/tiêu đề thật sự vào file PDF/máy in.

**Scale to Fit - Width và Height dropdowns** chưa có command riêng lẻ. Excel thật có 3 control trong Scale to Fit: Width (dropdown trang rộng), Height (dropdown trang cao), Scale (%). Hiện chỉ có sheet.page.scale làm đại diện cho cả nhóm. Cần tạo sheet.page.scaleWidth và sheet.page.scaleHeight.

**Tables group - Insert Table** chưa có logic. Excel thật có nút Table (Ctrl+T) tạo bảng có cấu trúc. Cần tạo command sheet.insert.table và handler trong sheet-adapter.js.

**Sparklines - Win/Loss** chưa có command sheet.insert.sparklineWinLoss. Đây là loại sparkline thứ 3 trong Excel. Cần tạo command và handler.

**common.edit.replace** có khai báo trong command-definitions.js và được dùng trong ribbon (Home tab Editing group) nhưng KHÔNG có bindHandler trong sheet-adapter.js. Hiện tại chỉ có common.edit.find được bind (dòng 310 adapter). Cần bind common.edit.replace để mở dialog Find & Replace với tab Replace active.

**Arrange group trong Page Layout** bị bỏ qua hoàn toàn - Excel thật có nhóm Arrange cho việc sắp xếp đối tượng (Bring to Front, Send to Back, Selection Pane, Align, Group, Rotate). Chưa có logic quản lý object trong Sheet.

**Insert - Symbols group** bị bỏ qua - Excel thật có nhóm Symbols với Equation và Symbol. Chưa có logic chèn ký hiệu/phương trình trong Sheet.

---

## Trạng thái từng tab

| Tab | Trạng thái | Ghi chú |
|-----|-----------|---------|
| Home | Xong Round 1 | Alignment row 1 đã thêm wrapText; Cells/Editing/Number giữ nguyên |
| Insert | Xong Round 1 | Thêm Tables group; Text group thêm headerFooter |
| Page Layout | Xong Round 1 | 3 nhóm gộp thành 1 pageSetup; thêm scaleToFit và sheetOptions |
| Formulas | Không đổi | Đã đúng chuẩn từ trước |
| Data | Không đổi | Nằm ngoài scope Round 1 |
| Review | Không đổi | Nằm ngoài scope Round 1 |
| View | Không đổi | Nằm ngoài scope Round 1 |
