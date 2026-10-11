"""Generate the per-button VN Sheet vs Excel evidence matrix from the ribbon scan."""
from __future__ import annotations
import json
import sys
from collections import Counter
from pathlib import Path

MATCH = "KHỚP EXCEL"
INTENTIONAL = "KHÁC CÓ CHỦ Ý"
KNOWN_GAP = "LỆCH ĐÃ BIẾT"
UNCHECKED = "CHƯA ĐỐI CHIẾU"

# Evidence is intentionally keyed by command ID and cites the prior audit that
# actually read the saved XLSX through Excel COM. No DOM-only result is mapped.
EVIDENCE: dict[str, tuple[str, str]] = {}
def mark(status: str, ids: str, source: str) -> None:
    for command_id in ids.split():
        EVIDENCE[command_id] = (status, source)

mark(MATCH, "sheet.cell.bold sheet.cell.italic sheet.cell.underline sheet.format.standard sheet.cell.indentIncrease sheet.cell.mergeCenter sheet.formula.sum sheet.data.sortAsc sheet.data.filter", "FIX-S7: CDP thao tác và Excel COM đọc lại định dạng, merge, AutoSum, sort, AutoFilter")
mark(MATCH, "sheet.row.insert sheet.row.delete sheet.col.insert sheet.col.delete sheet.data.validation sheet.view.freezePanes sheet.page.setPrintArea sheet.page.margins sheet.page.orientation sheet.chart.insert sheet.format.conditional sheet.style.cellStyles", "FIX-S7: CDP + Excel COM; insert/delete, validation, freeze, print area, page setup, chart, conditional format, cell style")
mark(MATCH, "sheet.data.removeDuplicates sheet.data.customSort sheet.edit.pasteSpecial common.edit.find common.edit.replace", "FIX-S10: UI/CDP + Excel COM read-only; remove duplicates, custom sort, paste special, find/replace")
mark(MATCH, "sheet.formula.nameManager sheet.cell.orientation sheet.row.height sheet.col.width sheet.row.hide sheet.col.hide sheet.row.unhide sheet.col.unhide sheet.page.setPrintArea sheet.page.orientation", "FIX-S8/FIX-S7: CDP và Excel COM read-only xác nhận name, rotation, dimensions, visibility, print area/orientation")
mark(MATCH, "sheet.style.formatAsTable", "FIX-S11: CDP + Excel COM read-only xác nhận ListObjects, tên/vùng/style/filter và XLSX round-trip")
mark(MATCH, "sheet.chart.insert", "FIX-S9: Excel COM read-only xác nhận loại biểu đồ, tiêu đề, series và trục")
mark(MATCH, "sheet.cell.alignLeft", "FIX-S12 Trang dau: CDP click Can trai; Excel COM ReadOnly xac nhan B2 HorizontalAlignment=-4131 (app_S12_alignLeft.xlsx)")
mark(MATCH, "sheet.cell.alignCenter", "FIX-S12 nhóm Trang đầu: CDP click căn giữa; Excel COM ReadOnly HAl=-4108 tại B2 (app_alignCenter.xlsx)")
mark(MATCH, "sheet.cell.alignRight", "FIX-S12 nhóm Trang đầu: CDP click căn phải; Excel COM ReadOnly HAl=-4152 tại B2 (app_alignRight.xlsx)")
mark(MATCH, "sheet.cell.alignTop", "FIX-S14: Nút Trộn & căn giữa cao 72px làm cột 3 hàng tràn lên che vùng tab; chuyển nó về icon nhỏ có tooltip. CDP bấm Căn trên, Excel COM ReadOnly xác nhận VerticalAlignment(B2)=-4160 (app_S14_fixed_alignTop.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-alignTop.png.")
mark(MATCH, "sheet.cell.alignMiddle", "FIX-S14: sau khi sửa bố cục nhóm Căn chỉnh, CDP bấm Căn giữa dọc; Excel COM ReadOnly xác nhận VerticalAlignment(B2)=-4108 (app_S14_fixed_alignMiddle.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-alignMiddle.png.")
mark(MATCH, "sheet.cell.alignBottom", "FIX-S14: sau khi sửa bố cục nhóm Căn chỉnh, CDP bấm Căn dưới; Excel COM ReadOnly xác nhận VerticalAlignment(B2)=-4107 (app_S14_fixed_alignBottom.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-alignBottom.png.")
mark(MATCH, "sheet.cell.wrapText", "FIX-S14: sau khi sửa bố cục nhóm Căn chỉnh, CDP bấm Ngắt dòng tự động; Excel COM ReadOnly xác nhận WrapText=1, RowHeight=30 cho B2 (app_S14_fixed_wrap.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-wrap.png.")
mark(MATCH, "sheet.format.currencyVND", "FIX-S12 Trang dau: CDP click Tien te VNĐ; Excel COM ReadOnly doc lai C2=1234.5, NumberFormat=#,##0 [$₫], hien thi 1,235 ₫ (app_S12_currencyBtn.xlsx)")
mark(MATCH, "sheet.format.percent", "FIX-S12 nhóm Trang đầu: CDP click Phần trăm; Excel COM ReadOnly D2=0.075, NumberFormat=0% (app_percentBtn.xlsx)")
mark(MATCH, "sheet.format.increaseDecimal", "FIX-S12 nhóm Trang đầu: CDP click Tăng số thập phân; Excel COM ReadOnly C2=1234.5, NumberFormat=0.00 (app_decInc.xlsx)")
mark(MATCH, "sheet.data.subtotal", "FIX-S12 Du lieu: CDP chon A1:C6, tao hai ten trung lien nhau, tong phu theo Ho ten/SUM So tien; Excel COM ReadOnly xac nhan Nguyen Van A=6913.4 va Grand Total=20615.1 (app_S12_subtotal.xlsx)")
mark(MATCH, "sheet.data.consolidate", "FIX-S12 Du lieu: CDP chon M1, SUM hai vung cung kich thuoc A2:C3/A4:C5; Excel COM ReadOnly xac nhan M1:O2=4|0|3702.5 va 6|0|7036.1 (app_S12_consolidate.xlsx)")
mark(MATCH, "sheet.data.group sheet.data.ungroup", "FIX-S12 Du lieu: CDP chon hang 2:6 va bam Nhom/Bỏ nhóm tren tung XLSX; Excel COM ReadOnly OutlineLevel=2 sau Nhom va =1 sau Bỏ nhóm (app_S12_groupRows.xlsx, app_S12_ungroupRows.xlsx)")
mark(MATCH, "sheet.data.pivotTable", "FIX-S12 Du lieu: CDP chon A1:C6, tao Pivot theo Ho ten va SUM So tien; Excel COM ReadOnly xac nhan Sheet1 (2) PivotTables.Count=1, cot nhan va gia tri (app_S12_pivotTable.xlsx)")
mark(MATCH, "sheet.data.flashFill", "FIX-S12 Du lieu: CDP nhap mau A/B, chay Dien nhanh tren K2:K6; Excel COM ReadOnly doc K2:K6=A/B/C/D/E tu ten nguon J2:J6 (app_S12_flashFill.xlsx)")
mark(MATCH, "sheet.data.textToColumns", "FIX-S12 Du lieu: CDP chon B2:B6, Tách văn bản bằng dấu cách; Excel COM ReadOnly xác nhận B2:D6 lần lượt Nguyễn|Văn|A ... Hoàng|Văn|E (app_S12_textToColumns.xlsx)")
mark(MATCH, "sheet.data.sortDesc", "FIX-S12 tab Dữ liệu: CDP click Z-A; Excel COM ReadOnly xác nhận B2:B6 giảm dần: Trần, Phạm, Nguyễn, Lê, Hoàng (app_sortDesc.xlsx)")
mark(MATCH, "sheet.formula.average", "FIX-S12 tab Công thức: CDP click Trung bình; Excel COM ReadOnly xác nhận =AVERAGE(C2:C6), Value2=4123.02 (app_S12fix_averageBtn.xlsx)")
mark(MATCH, "sheet.formula.countNumbers", "FIX-S12 tab Công thức: CDP click Đếm số; Excel COM ReadOnly xác nhận =COUNT(C2:C6), Value2=5 (app_countNumbersBtn.xlsx)")
mark(MATCH, "sheet.font.grow", "FIX-S12 Trang đầu: CDP click Tăng cỡ chữ; Excel COM ReadOnly xác nhận B2=12 pt")
mark(MATCH, "sheet.font.shrink", "FIX-S12 Trang đầu: sửa làm tròn điểm cỡ chữ; CDP click Giảm cỡ chữ; Excel COM ReadOnly xác nhận B2=10 pt")
mark(MATCH, "sheet.format.decreaseDecimal", "FIX-S12 Trang đầu: CDP click Giảm số thập phân; Excel COM ReadOnly xác nhận C2=1234.5, NumberFormat=0, hiển thị 1235")
mark(MATCH, "sheet.cell.unmerge", "FIX-S12: CDP mở XLSX đã merge A8:B8 rồi bấm Tách ô; Excel COM ReadOnly xác nhận A8.MergeCells=False")
mark(MATCH, "sheet.cell.fillColor sheet.cell.textColor sheet.cell.borders", "FIX-S12 Trang đầu: CDP bấm màu nền/màu chữ/viền; Excel COM ReadOnly xác nhận Fill=65535, Font.Color=255 và bốn Border.LineStyle=1")
mark(MATCH, "sheet.formula.max sheet.formula.min", "FIX-S12 Công thức: CDP bấm MAX/MIN; Excel COM ReadOnly xác nhận =MAX(C2:C6)=9876.5 và =MIN(C2:C6)=1234.5")
mark(MATCH, "sheet.cell.mergeAcross sheet.cell.mergeCells", "FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True")
mark(MATCH, "sheet.page.clearPrintArea", "FIX-S13: CDP xóa vùng in; Excel COM ReadOnly xác nhận PageSetup.PrintArea rỗng (app_s13_clearArea.xlsx)")
mark(MATCH, "sheet.page.size", "FIX-S12 Bố trí trang: CDP chọn Khổ giấy Legal; Excel COM ReadOnly xác nhận PageSetup.PaperSize=5 (app_pageSize.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-pageSize.png")
mark(MATCH, "sheet.page.scale", "FIX-S12 Bố trí trang: CDP đặt tỷ lệ in 80%; Excel COM ReadOnly xác nhận PageSetup.Zoom=80 (app_pageScale.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-pageScale.png")
mark(MATCH, "sheet.page.printTitles", "FIX-S12 Bố trí trang: CDP đặt Hàng tiêu đề in 1:1; Excel COM ReadOnly xác nhận PageSetup.PrintTitleRows=$1:$1 (app_printTitles.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-printTitles.png")
mark(MATCH, "sheet.page.headerFooter", "FIX-S12 Bố trí trang: CDP mở Chèn > Tiêu đề Đầu/Cuối trang, nhập ô Phải = 'VN Office S12'; Excel COM ReadOnly xác nhận PageSetup.RightHeader='VN Office S12' (app_S14_fixed_headerFooter.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-headerFooter.png. Help VI và i18n VI/EN hiện có.")
mark(MATCH, "sheet.page.insertPageBreak", "FIX-S12 Bố trí trang: CDP chèn ngắt tại C5; Excel COM ReadOnly xác nhận HBreaks=5, VBreaks=3 (app_insertPageBreak.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-insertPageBreak.png")
mark(MATCH, "sheet.page.removePageBreak", "FIX-S12 Bố trí trang: CDP xóa ngắt C5 từ workbook đã có ngắt; Excel COM ReadOnly xác nhận không còn HBreak/VBreak (app_removePageBreak.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-removePageBreak.png")
mark(MATCH, "sheet.review.commentInsert", "FIX-S12 Xem xét: CDP tạo ghi chú tại C2; Excel COM ReadOnly xác nhận Comment='Ghi chú kiểm thử S12', Author='Người dùng 3T Office' (app_commentInsert.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-commentInsert.png")
mark(MATCH, "sheet.review.commentDelete", "FIX-S12 Xem xét: CDP xóa ghi chú C2 trên workbook đã có ghi chú; Excel COM ReadOnly xác nhận C2.Comment rỗng sau lưu (app_commentDelete.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-commentDelete.png")
mark(MATCH, "sheet.formula.defineName", "FIX-S12 Công thức: CDP đặt tên workbook S12Cell cho B2; Excel COM ReadOnly xác nhận Names.Count=1, RefersTo==Sheet1!$B$2 (app_defineName.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-defineName.png")
mark(MATCH, "sheet.formula.useInFormula", "FIX-S12 Công thức: mở workbook có tên S12Cell, CDP dùng Dùng trong công thức tại H2; Excel COM ReadOnly xác nhận H2 Formula='=S12Cell', Value2='Nguyễn Văn A', Names.Count=1 (app_S14_useInFormula.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-useInFormula.png. Help VI và i18n VI/EN hiện có.")
mark(UNCHECKED, "sheet.formula.createFromSelection", "FIX-S12 probe: CDP chọn A1:C6 rồi tạo 3 tên; Excel COM ReadOnly xác nhận Names.Count=3 và RefersTo B2:B6/C2:C6, nhưng tên từ tiêu đề tiếng Việt bị chuẩn hóa thành H__t_n/S__ti_n. Chưa đối chiếu chính xác quy tắc tên Excel; giữ CHƯA ĐỐI CHIẾU.")
mark(MATCH, "sheet.formula.errorChecking", "FIX-S12 Công thức: CDP mở Kiểm tra lỗi trên H2=#DIV/0!; app liệt kê H2, =1/0, nguyên nhân chia cho 0; Excel COM ReadOnly xác nhận H2 Formula='=1/0', Text='#DIV/0!' (app_errorChecking.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-errorChecking.png")
mark(MATCH, "sheet.formula.recalculate", "FIX-S12 Công thức: CDP bấm Tính lại toàn bộ; Excel COM ReadOnly xác nhận F2 =C2*D2, Value2=92.5875 (app_formulaRecalculate.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-formulaRecalculate.png")
mark(MATCH, "sheet.formula.insertFunction", "FIX-S12 Công thức: CDP mở Chèn hàm, tìm TODAY, chọn hàm và chèn vào H2; Excel COM ReadOnly xác nhận H2 Formula='=TODAY()', Value2=46307, NumberFormat=dd/mm/yyyy (app_S14_final_insertFunction.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-insertFunction.png. Hướng dẫn VI/EN hiện có trong Help và i18n.")
mark(MATCH, "sheet.calc.calculateSheet", "FIX-S12 Công thức: CDP bấm Tính trang hiện tại; Excel COM ReadOnly xác nhận F2 =C2*D2, Value2=92.5875 (app_calculateSheet.xlsx); ảnh docs/tickets-0710/evidence/fix-s12-calculateSheet.png")
mark(MATCH, "sheet.insert.hyperlink", "FIX-S12 Chèn: CDP nhập https://vnoffice.vn vào G2; Adapter ghi text:a/xlink:href và nạp lại URL; Excel COM ReadOnly xác nhận Hyperlinks.Count=1, Address=https://vnoffice.vn/, Text='Trang chủ VN Office' (app_hyperlink.xlsx); hướng dẫn platform/help/entries-sheet.js; VI/EN i18n có sẵn; ảnh docs/tickets-0710/evidence/fix-s12-hyperlink.png")
mark(MATCH, "sheet.insert.image", "FIX-S12 Chèn: CDP chọn ảnh PNG qua file chooser và đặt tại B2; Excel COM ReadOnly xác nhận Shapes.Count=1, Type=13, TopLeft=B2 (app_image.xlsx); hướng dẫn Chèn > Minh họa trong Help; VI/EN i18n có sẵn; ảnh docs/tickets-0710/evidence/fix-s12-image.png")
mark(MATCH, "sheet.insert.sparklineLine sheet.insert.sparklineColumn", "FIX-S12 Chèn > Biểu đồ thu nhỏ: CDP chọn dải số C2:C6, chèn tại ô active C6; Excel COM ReadOnly xác nhận SparklineGroups.Count=1, Type=1 (Line) / Type=2 (Column) trong XLSX. Help tiếng Việt và i18n VI/EN có sẵn; ảnh docs/tickets-0710/evidence/fix-s12-sparklineLine.png, fix-s12-sparklineColumn.png")
mark(KNOWN_GAP, "sheet.chart.pivotChart", "FIX-S12: CDP tạo PivotTable rồi bấm Chèn > Biểu đồ Pivot > Cột. Excel COM ReadOnly: PivotTables=1, Charts=1, ChartType=51 nhưng Chart.PivotLayout.PivotTable.Name rỗng, PivotFields=0; XLSX có biểu đồ thường, không liên kết Pivot. Ảnh docs/tickets-0710/evidence/fix-s12-pivotChart.png. Cần quyết định trước khi đổi OOXML/file-format semantics; Help hiện tuyên bố biểu đồ được liên kết Pivot.")
mark(UNCHECKED, "sheet.review.commentPrevious sheet.review.commentNext", "FIX-S12 probe: với workbook có nhận xét C2/D2, CDP Previous từ D2 chọn C2 và Next từ C2 chọn D2; ảnh docs/tickets-0710/evidence/fix-s12-commentPrevious.png và fix-s12-commentNext.png. Excel COM ReadOnly xác nhận cả hai nhận xét còn trong XLSX nhưng khi mở lại ActiveCell=A1 nên không lưu được trạng thái điều hướng; giữ CHƯA ĐỐI CHIẾU.")
mark(MATCH, "sheet.cell.indentDecrease", "FIX-S13: CDP giảm thụt lề về 0; Excel COM ReadOnly xác nhận Indent=0 (app_s13_indentDecrease.xlsx)")
mark(MATCH, "sheet.formula.showFormulas", "FIX-S13: CDP nhấn Ctrl+` thật; Excel COM ReadOnly xác nhận ActiveWindow.DisplayFormulas=1 (app_s13_showFormulas.xlsx)")
mark(MATCH, "sheet.data.pivotRefresh", "FIX-S13: CDP sửa nguồn C2=2222 rồi làm mới; Excel COM ReadOnly xác nhận PivotTables.Count=1, tổng 2222 và không lặp hàng (app_s13_pivotRefresh.xlsx)")
mark(MATCH, "sheet.view.pageBreakPreview", "FIX-S13: CDP chọn Xem ngắt trang; Excel COM ReadOnly xác nhận ActiveWindow.View=2 (app_s13_pageBreakPreview.xlsx)")
mark(MATCH, "sheet.view.pageLayout", "FIX-S13: CDP chọn Bố trí trang; Excel COM ReadOnly xác nhận ActiveWindow.View=3 (app_s13_pageLayoutView.xlsx)")
mark(MATCH, "sheet.view.formulaBar", "FIX-S13: CDP ẩn thanh công thức; Excel COM ReadOnly xác nhận ActiveWindow.DisplayFormulaBar=0 (app_s13_formulaBar.xlsx)")
mark(MATCH, "sheet.view.zoomIn", "FIX-S13: CDP tăng zoom; Excel COM ReadOnly xác nhận ActiveWindow.Zoom=110 (app_s13_zoomIn.xlsx)")
mark(MATCH, "sheet.view.zoomOut", "FIX-S13: CDP giảm zoom; Excel COM ReadOnly xác nhận ActiveWindow.Zoom=90 (app_s13_zoomOut.xlsx)")
mark(MATCH, "sheet.view.gridlines sheet.view.headings", "FIX-S13: CDP ẩn đường lưới và tiêu đề; Excel COM ReadOnly xác nhận DisplayGridlines=0 và DisplayHeadings=0 (app_s13_gridlines.xlsx, app_s13_headings.xlsx)")

# FIX-S7 recorded an unsuccessful name-manager probe before FIX-S8 corrected
# and verified the manager flow. The separate Define Name command has no such
# evidence and deliberately stays unchecked.


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python -X utf8 gen_sheet_button_matrix.py <scan.json> <out.md>")
    rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    lines = [
        "# Sheet: bảng đối chiếu từng nút ribbon với Excel (11/10/2026)", "",
        "Nguồn nút: `docs/ribbon-scan-sheet-1011.json`. Chỉ đánh dấu **KHỚP EXCEL** khi thao tác UI và Excel COM đọc lại XLSX đã có bằng chứng; phản ứng DOM không đủ.",
        f"- **{MATCH}**: thao tác tương đương và thuộc tính/giá trị từ XLSX được Excel đọc lại khớp.",
        f"- **{INTENTIONAL}**: khác biệt được thiết kế có chủ ý và có giải thích.",
        f"- **{KNOWN_GAP}**: sai khác đã được tái hiện và còn tồn tại.",
        f"- **{UNCHECKED}**: chưa có đối chiếu Excel đủ chứng cứ.", "",
        "Các nút nguy hiểm/ngoại tuyến hoặc nút AI không được chạy trong lượt này sẽ giữ **CHƯA ĐỐI CHIẾU** cho tới khi có phép thử an toàn và xác định rõ luồng dữ liệu.", "",
        "| Tab | Lệnh | Nút | Trạng thái | Ghi chú / chứng cứ | Phản ứng scan |",
        "|---|---|---|---|---|---|",
    ]
    counts = Counter()
    for row in rows:
        command_id = row["id"]
        status, note = EVIDENCE.get(command_id, (UNCHECKED, "Chưa có chứng cứ Excel COM gắn với command ID này."))
        counts[status] += 1
        cells = [row["tab"], f"`{command_id}`", row["label"], status, note, row.get("reaction", "")]
        lines.append("| " + " | ".join(str(x).replace("|", "\\|").replace("\n", " ") for x in cells) + " |")
    counts_line = " · ".join(f"{key}: {counts[key]}" for key in (MATCH, INTENTIONAL, KNOWN_GAP, UNCHECKED) if counts[key])
    header = lines[:8]
    table = lines[8:]
    header.insert(7, f"Tổng {len(rows)} nút — {counts_line}.")
    Path(sys.argv[2]).write_text("\n".join(header + table) + "\n", encoding="utf-8", newline="\n")
    print(f"{counts_line}; total={len(rows)}")

if __name__ == "__main__":
    main()
