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
mark(MATCH, "sheet.cell.alignCenter", "FIX-S12 nhóm Trang đầu: CDP click căn giữa; Excel COM ReadOnly HAl=-4108 tại B2 (app_alignCenter.xlsx)")
mark(MATCH, "sheet.cell.alignRight", "FIX-S12 nhóm Trang đầu: CDP click căn phải; Excel COM ReadOnly HAl=-4152 tại B2 (app_alignRight.xlsx)")
mark(MATCH, "sheet.format.percent", "FIX-S12 nhóm Trang đầu: CDP click Phần trăm; Excel COM ReadOnly D2=0.075, NumberFormat=0% (app_percentBtn.xlsx)")
mark(MATCH, "sheet.format.increaseDecimal", "FIX-S12 nhóm Trang đầu: CDP click Tăng số thập phân; Excel COM ReadOnly C2=1234.5, NumberFormat=0.00 (app_decInc.xlsx)")
mark(MATCH, "sheet.data.sortDesc", "FIX-S12 tab Dữ liệu: CDP click Z-A; Excel COM ReadOnly xác nhận B2:B6 giảm dần: Trần, Phạm, Nguyễn, Lê, Hoàng (app_sortDesc.xlsx)")
mark(MATCH, "sheet.formula.average", "FIX-S12 tab Công thức: CDP click Trung bình; Excel COM ReadOnly xác nhận =AVERAGE(C2:C6), Value2=4123.02 (app_S12fix_averageBtn.xlsx)")
mark(MATCH, "sheet.formula.countNumbers", "FIX-S12 tab Công thức: CDP click Đếm số; Excel COM ReadOnly xác nhận =COUNT(C2:C6), Value2=5 (app_countNumbersBtn.xlsx)")
mark(MATCH, "sheet.font.grow", "FIX-S12 Trang đầu: CDP click Tăng cỡ chữ; Excel COM ReadOnly xác nhận B2=12 pt")
mark(MATCH, "sheet.font.shrink", "FIX-S12 Trang đầu: sửa làm tròn điểm cỡ chữ; CDP click Giảm cỡ chữ; Excel COM ReadOnly xác nhận B2=10 pt")
mark(MATCH, "sheet.cell.mergeAcross sheet.cell.mergeCells", "FIX-S12 Trang đầu: CDP chọn A8:B8 và bấm lệnh; Excel COM ReadOnly xác nhận A8.MergeCells=True")

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
