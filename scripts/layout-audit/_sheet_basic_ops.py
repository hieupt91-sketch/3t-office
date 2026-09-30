"""Excel 2016 COM ↔ VN Sheet basic-operation parity audit.

Usage:
  python scripts/layout-audit/_sheet_basic_ops.py --out-dir "file test/_sheet_basic_ops"
  python scripts/layout-audit/_sheet_basic_ops.py --out-dir "file test/_sheet_basic_ops-after" --baseline "file test/_sheet_basic_ops/_sheet_basic_ops.json"
  python scripts/layout-audit/_sheet_basic_ops.py --out-dir "file test/_sheet_basic_ops-after" --baseline "file test/_sheet_basic_ops-before/_vn_before.json"

Excel automation is hidden and object-model-only. VN operations use the real
SheetGridController and SheetAdapter modules. The runner waits when free RAM is
under 5 GB and closes only the Excel.Application instance it creates.
"""

from __future__ import annotations
import argparse
import ctypes
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent

N2 = {"category": "number", "decimals": 2, "useThousands": True, "negativeStyle": 0, "excel": "#,##0.00"}
N0 = {"category": "number", "decimals": 0, "useThousands": True, "negativeStyle": 0, "excel": "#,##0"}
PCT = {"category": "percentage", "decimals": 2, "excel": "0.00%"}
DATE = {"category": "date", "dateFormat": "dd/mm/yyyy", "excel": "dd/mm/yyyy"}
US_DATE = {"category": "date", "dateFormat": "mm/dd/yyyy", "excel": "mm/dd/yyyy"}
VND = {"category": "currency", "currencySymbol": "₫", "decimals": 0, "useThousands": True, "negativeStyle": 0, "excel": '#,##0 "₫"'}
VND2 = {"category": "currency", "currencySymbol": "₫", "decimals": 2, "useThousands": True, "negativeStyle": 0, "excel": '#,##0.00 "₫"'}
USD = {"category": "currency", "currencySymbol": "$", "symbolPosition": "before", "decimals": 2, "useThousands": True, "negativeStyle": 0, "excel": '"$"#,##0.00'}
SETUP_COLUMN_WIDTH_PX = 200
SETUP_COLUMN_WIDTH_EXCEL = 28

def mk(id, title, inputs=(), actions=(), watch=(), rows=(), columns=(), locale="vi-VN", saveXls=False, inputLocale="vi-VN"):
    return {"id": id, "title": title, "inputs": list(inputs), "actions": list(actions), "watch": list(watch),
            "rows": list(rows), "columns": list(columns), "locale": locale, "inputLocale": inputLocale, "saveXls": saveXls}

CASES = [
    mk("input-vi", "Nhập số/ngày/phần trăm/tiền theo dấu Việt Nam", [
        {"cell":"A1","value":"1.234,56","format":N2},{"cell":"A2","value":"31/12/2026","format":DATE},
        {"cell":"A3","value":"12,5%","format":PCT},{"cell":"A4","value":"1.234,50","format":VND2}],
       watch=["A1","A2","A3","A4"], rows=[1,2,3,4], columns=["A"]),
    mk("input-us", "Nhập số/ngày/phần trăm/tiền theo dấu Hoa Kỳ", [
        {"cell":"A1","value":"1,234.56","format":N2},{"cell":"A2","value":"12/31/2026","format":US_DATE},
        {"cell":"A3","value":"12.5%","format":PCT},{"cell":"A4","value":"$1,234.50","format":USD}],
       watch=["A1","A2","A3","A4"], rows=[1,2,3,4], columns=["A"], locale="en-US", inputLocale="en-US"),
    mk("formula-functions", "SUM/AVERAGE/IF/VLOOKUP/COUNTIF/ROUND/TEXT/DATE", [
        *[{"cell":"A"+str(i),"value":i*10} for i in range(1,5)],
        {"cell":"D1","value":"Mã"},{"cell":"E1","value":"Mức"},{"cell":"D2","value":"A"},{"cell":"E2","value":10},
        {"cell":"D3","value":"B"},{"cell":"E3","value":20},
        {"cell":"B1","value":"=SUM(A1:A4)"},{"cell":"B2","value":"=AVERAGE(A1:A4)"},
        {"cell":"B3","value":'=IF(A1>5,"Đạt","Chưa")'},
        {"cell":"G1","value":'=VLOOKUP("B",D2:E3,2,FALSE)'},{"cell":"G2","value":'=COUNTIF(D2:D3,"A")'},
        {"cell":"G3","value":"=ROUND(123.456,2)"},{"cell":"G4","value":'=TEXT(DATE(2026,9,30),"dd/mm/yyyy")'},
        {"cell":"G5","value":"=DATE(2026,9,30)","format":DATE}],
       watch=["B1","B2","B3","G1","G2","G3","G4","G5"], rows=[1,2,3,4,5], columns=["B","G"]),
    mk("formula-functions-extended", "SUMIF/TODAY/IFERROR/INDEX/MATCH", [
        *[{"cell":f"A{i}","value":i*10} for i in range(1,5)],
        {"cell":"B1","value":'=SUMIF(A1:A4,">=20",A1:A4)'},
        {"cell":"B2","value":'=IFERROR(1/0,"Thay thế")'},
        {"cell":"D1","value":"A"},{"cell":"E1","value":10},
        {"cell":"D2","value":"B"},{"cell":"E2","value":20},
        {"cell":"G1","value":'=INDEX(E1:E2,MATCH("B",D1:D2,0))'},
        {"cell":"G2","value":'=MATCH("B",D1:D2,0)'},
        {"cell":"G3","value":"=TODAY()","format":DATE},
        {"cell":"G4","value":"=YEAR(TODAY())"},
        {"cell":"G5","value":"=INDEX(D1:E2,2,2)"},
        {"cell":"G6","value":"=YEAR(DATE(2024,1,1))"}],
       watch=["B1","B2","G1","G2","G3","G4","G5","G6"], columns=["B","G"]),
    mk("copy-cut-references", "Sao chép/cắt/dán tham chiếu tương đối và tuyệt đối", [
        {"cell":"A1","value":10},{"cell":"B1","value":2},{"cell":"B2","value":"=A1*$B$1"}],
       [{"type":"copyPaste","from":"B2","to":"C2"},{"type":"copyPaste","from":"B2","to":"B3"},{"type":"cutPaste","from":"B2","to":"D2"}],
       ["B2","C2","B3","D2"], [2,3], ["B","C","D"]),
    mk("fill-number-series", "Tay cầm điền chuỗi số 1, 2, 3", [
        {"cell":"A1","value":1},{"cell":"A2","value":2},{"cell":"A3","value":3}],
       [{"type":"fill","source":"A1:A3","target":{"direction":"down","startRow":4,"endRow":6},"destination":"A1:A6"}],
       ["A1","A2","A3","A4","A5","A6"], [1,2,3,4,5,6], ["A"]),
    mk("fill-dates", "Tay cầm điền ngày liên tiếp", [
        {"cell":"A1","value":"01/09/2026","format":DATE},{"cell":"A2","value":"02/09/2026","format":DATE}],
       [{"type":"fill","source":"A1:A2","target":{"direction":"down","startRow":3,"endRow":5},"destination":"A1:A5"}],
       ["A1","A2","A3","A4","A5"], [1,2,3,4,5], ["A"]),
    mk("fill-weekdays-formulas", "Tay cầm điền thứ trong tuần và công thức", [
        {"cell":"A1","value":"Monday"},{"cell":"C1","value":10},{"cell":"D1","value":"=C1*2"}],
       [{"type":"fill","source":"A1","target":{"direction":"down","startRow":2,"endRow":5},"destination":"A1:A5"},
        {"type":"fill","source":"D1","target":{"direction":"down","startRow":2,"endRow":5},"destination":"D1:D5"}],
       ["A1","A2","A3","A4","A5","D1","D2","D3","D4","D5"], [1,2,3,4,5], ["A","D"]),
    mk("fill-formula-references", "Tay cầm điền công thức với tham chiếu tương đối và tuyệt đối", [
        {"cell":"C1","value":10},{"cell":"C2","value":20},{"cell":"C3","value":30},{"cell":"C4","value":40},
        {"cell":"H1","value":10},{"cell":"I1","value":"=C1*$H$1"}],
       [{"type":"fill","source":"I1","target":{"direction":"down","startRow":2,"endRow":4},"destination":"I1:I4"}],
       ["I1","I2","I3","I4"], [1,2,3,4], ["I"]),
    mk("paste-special", "Dán đặc biệt giá trị/công thức/định dạng", [
        {"cell":"A1","value":100,"format":VND},{"cell":"A2","value":"=A1/3","format":N2},
        {"cell":"B1","value":999},{"cell":"B2","value":42}],
       [{"type":"pasteSpecial","from":"A2","to":"C2","mode":"values"},
        {"type":"pasteSpecial","from":"A1","to":"B1","mode":"formats"},
        {"type":"pasteSpecial","from":"A2","to":"D2","mode":"formulas"}],
       ["A1","A2","B1","B2","C2","D2"], [1,2], ["A","B","C","D"]),
    mk("insert-delete-rows", "Chèn/xóa hàng và cập nhật tham chiếu", [
        {"cell":"A1","value":10},{"cell":"A2","value":20},{"cell":"A3","value":30},{"cell":"B1","value":"=SUM(A1:A3)"}],
       [{"type":"insertRow","row":2},{"type":"deleteRow","row":2}],
       ["A1","A2","A3","B1"], [1,2,3,4], ["A","B"]),
    mk("insert-delete-columns", "Chèn/xóa cột và cập nhật tham chiếu", [
        {"cell":"A1","value":10},{"cell":"B1","value":20},{"cell":"C1","value":"=SUM(A1:B1)"},{"cell":"D1","value":"=B1"}],
       [{"type":"insertColumn","column":"B"},{"type":"deleteColumn","column":"B"}],
       ["A1","B1","C1","D1"], [1], ["A","B","C","D"]),
    mk("sort-filter", "Sắp xếp bảng và lọc theo giá trị", [
        {"cell":"A1","value":"Mã"},{"cell":"B1","value":"Tên"},
        {"cell":"A2","value":3},{"cell":"B2","value":"C"},{"cell":"A3","value":1},{"cell":"B3","value":"A"},
        {"cell":"A4","value":2},{"cell":"B4","value":"B"}],
       [{"type":"sort","range":"A2:B4","key":"A","ascending":True,"header":False},
         {"type":"filter","range":"A1:B4","column":"B","field":2,"allowed":["A"]}],
       ["A1","B1","A2","B2","A3","B3","A4","B4"], [1,2,3,4], ["A","B"]),
    mk("merge-center", "Trộn ô và căn giữa", [{"cell":"A1","value":"Tiêu đề"}],
       [{"type":"mergeCenter","range":"A1:B2"}], ["A1","B1","A2","B2"], [1,2], ["A","B"]),
    mk("number-formats", "Hàng nghìn, số lẻ, ngày và tiền VND", [
        {"cell":"A1","value":1234567.5,"format":N2},{"cell":"A2","value":"30/09/2026","format":DATE},
        {"cell":"A3","value":1234567,"format":VND},{"cell":"A4","value":0.125,"format":PCT}],
       [{"type":"format","range":"A1","format":N2}], ["A1","A2","A3","A4"], [1,2,3,4], ["A"], saveXls=True),
    mk("freeze-panes", "Cố định hàng/cột theo ô đang chọn", [
        {"cell":"A1","value":"Mã"},{"cell":"B1","value":"Tên"},{"cell":"C3","value":"Giá trị"}],
       [{"type":"freeze","cell":"C3"}], ["A1","B1","C3"], [1,2,3], ["A","B","C"]),
    mk("find-replace", "Tìm và thay thế nội dung", [
        {"cell":"A1","value":"Hóa đơn tháng 9"},{"cell":"B1","value":"Tháng 9/2026"}],
       [{"type":"findReplace","find":"tháng 9","replace":"tháng 10"}], ["A1","B1"], [1], ["A","B"]),
    mk("autofit-wrap", "Tự vừa khít cột và ngắt dòng", [
        {"cell":"A1","value":"Mã đơn hàng dài 2026"},{"cell":"B1","value":"Nội dung dài cần ngắt dòng trong ô"}],
       [{"type":"autoFitColumn","column":"A"},{"type":"wrapText","range":"B1"}],
       ["A1","B1"], [1], ["A","B"]),
    mk("row-column-sizes", "Đặt chiều cao hàng và độ rộng cột", [{"cell":"A1","value":"Kích thước"}],
       [{"type":"setRowHeight","row":1,"heightPx":40},
        {"type":"setColumnWidth","column":"A","widthPx":120,"widthExcel":16.43}],
       ["A1"], [1], ["A"]),
]

class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [("dwLength",ctypes.c_ulong),("dwMemoryLoad",ctypes.c_ulong),("ullTotalPhys",ctypes.c_ulonglong),
        ("ullAvailPhys",ctypes.c_ulonglong),("ullTotalPageFile",ctypes.c_ulonglong),("ullAvailPageFile",ctypes.c_ulonglong),
        ("ullTotalVirtual",ctypes.c_ulonglong),("ullAvailVirtual",ctypes.c_ulonglong),("ullAvailExtendedVirtual",ctypes.c_ulonglong)]

def free_ram_gb() -> float:
    status = MEMORYSTATUSEX(); status.dwLength = ctypes.sizeof(status)
    return status.ullAvailPhys / 1024**3 if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)) else 99.0

def wait_for_ram(label: str) -> None:
    while free_ram_gb() < 5:
        print(f"RAM trống {free_ram_gb():.2f} GB; chờ trước {label}.", flush=True)
        time.sleep(30)

def run(command: list[str], cwd: Path, timeout: int = 900) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=str(cwd), capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout, check=False)

def vb(value: Any) -> str:
    return '"' + str(value).replace('"', '""') + '"'

def numeric_vb(value: Any) -> str:
    if isinstance(value, bool): return "True" if value else "False"
    if isinstance(value, int): return str(value)
    return repr(float(value))

def local_format(code: str, locale: str) -> str:
    if locale != "vi-VN": return code
    import re
    pieces = re.split(r'("[^"]*")', code)
    for index in range(0, len(pieces), 2):
        marker = "\uE000"
        pieces[index] = pieces[index].replace(",", marker).replace(".", ",").replace(marker, ".")
    return "".join(pieces)

def vbs_action(action: dict[str, Any], locale: str) -> list[str]:
    kind = action["type"]
    lines: list[str] = []
    if kind == "format":
        lines += [f'Set workRange = sheet.Range({vb(action["range"])})',
                  f'workRange.NumberFormatLocal = {vb(local_format(action["format"]["excel"], locale))}',
                  'CheckError "format"',
                  'Set workRange = Nothing']
    elif kind in ("copyPaste", "cutPaste"):
        lines += [f'Set source = sheet.Range({vb(action["from"])})',
                  'CheckError "select copy/cut source"',
                  f'Set destination = sheet.Range({vb(action["to"])})']
        lines += ['CheckError "select paste destination"']
        if kind == "copyPaste":
            lines += ['source.Copy destination', 'CheckError "copy source"']
        else:
            lines += ['source.Cut destination', 'CheckError "cut and paste cells"']
        lines += ['app.CutCopyMode = False', 'Set source = Nothing', 'Set destination = Nothing']
    elif kind == "pasteSpecial":
        paste_type = {"values": -4163, "formats": -4122, "formulas": -4123}.get(action["mode"])
        if paste_type is None: raise ValueError("Unsupported paste-special mode " + str(action["mode"]))
        lines += [f'Set source = sheet.Range({vb(action["from"])})',
                  f'Set destination = sheet.Range({vb(action["to"])})',
                  'source.Copy', 'CheckError "copy before paste special"',
                  f'destination.PasteSpecial {paste_type}', 'CheckError "paste special"',
                  'app.CutCopyMode = False', 'Set source = Nothing', 'Set destination = Nothing']
    elif kind == "fill":
        lines += [f'Set source = sheet.Range({vb(action["source"])})',
                  f'Set destination = sheet.Range({vb(action["destination"])})',
                  'source.AutoFill destination, 0', 'CheckError "fill handle"',
                  'Set source = Nothing', 'Set destination = Nothing']
    elif kind == "insertRow":
        lines += [f'sheet.Rows(CInt({int(action["row"])})).Insert', 'CheckError "insert row"']
    elif kind == "deleteRow":
        lines += [f'sheet.Rows(CInt({int(action["row"])})).Delete', 'CheckError "delete row"']
    elif kind == "insertColumn":
        lines += [f'sheet.Columns({vb(action["column"])}).Insert', 'CheckError "insert column"']
    elif kind == "deleteColumn":
        lines += [f'sheet.Columns({vb(action["column"])}).Delete', 'CheckError "delete column"']
    elif kind == "sort":
        order = 1 if action.get("ascending", True) else 2
        header = 1 if action.get("header", False) else 2
        lines += [f'Set workRange = sheet.Range({vb(action["range"])})',
                  'Set sortObject = sheet.Sort']
        if re.fullmatch(r"[A-Z]+", str(action["key"]), re.IGNORECASE):
            lines += [f'Set keyColumn = sheet.Columns({vb(action["key"])})',
                      'Set keyRange = app.Intersect(workRange, keyColumn)']
        else:
            lines += [f'Set keyRange = sheet.Range({vb(action["key"])})']
        lines += [
                  'sortObject.SortFields.Clear',
                  f'sortObject.SortFields.Add keyRange, 0, {order}',
                  'sortObject.SetRange workRange',
                  f'sortObject.Header = {header}',
                  'sortObject.MatchCase = False',
                  'sortObject.Orientation = 1',
                  'sortObject.SortMethod = 1',
                  'sortObject.Apply', 'CheckError "sort"',
                  'Set sortObject = Nothing', 'Set workRange = Nothing', 'Set keyRange = Nothing',
                  'Set keyColumn = Nothing']
    elif kind == "filter":
        criteria = "Array(" + ", ".join(vb(value) for value in action["allowed"]) + ")"
        lines += [f'Set workRange = sheet.Range({vb(action["range"])})',
                  f'workRange.AutoFilter {int(action["field"])}, {criteria}, 7',
                  'CheckError "filter"', 'Set workRange = Nothing']
    elif kind == "mergeCenter":
        lines += [f'Set workRange = sheet.Range({vb(action["range"])})',
                  'workRange.Merge', 'CheckError "merge"',
                  'workRange.HorizontalAlignment = -4108', 'workRange.VerticalAlignment = -4108',
                  'Set workRange = Nothing']
    elif kind == "freeze":
        cell = action["cell"]
        row = int("".join(c for c in cell if c.isdigit()))
        col = "".join(c for c in cell if c.isalpha())
        col_number = 0
        for char in col.upper(): col_number = col_number * 26 + ord(char) - 64
        lines += [f'sheet.Range({vb(cell)}).Select', 'CheckError "select freeze point"',
                  'app.ActiveWindow.FreezePanes = False',
                  f'app.ActiveWindow.SplitRow = {row - 1}',
                  f'app.ActiveWindow.SplitColumn = {col_number - 1}',
                  f'app.ActiveWindow.FreezePanes = {str(row > 1 or col_number > 1)}',
                  'CheckError "freeze panes"']
    elif kind == "findReplace":
        lines += [f'sheet.UsedRange.Replace {vb(action["find"])}, {vb(action["replace"])}, 2, 1, False, False, False, False',
                  'CheckError "find replace"']
    elif kind == "autoFitColumn":
        lines += [f'sheet.Columns({vb(action["column"])}).AutoFit', 'CheckError "autofit column"']
    elif kind == "wrapText":
        lines += [f'Set workRange = sheet.Range({vb(action["range"])})',
                  'workRange.WrapText = True', 'CheckError "wrap text"', 'Set workRange = Nothing']
    elif kind == "setRowHeight":
        px = float(action["heightPx"])
        lines += [f'sheet.Rows(CInt({int(action["row"])})).RowHeight = {numeric_vb(px * 72 / 96)}',
                  'CheckError "set row height"']
    elif kind == "setColumnWidth":
        lines += [f'sheet.Columns({vb(action["column"])}).ColumnWidth = {numeric_vb(action["widthExcel"])}',
                  'CheckError "set column width"']
    else:
        raise ValueError("Unknown Excel action " + kind)
    return lines

def vbs_snapshot(item: dict[str, Any], record_id: str) -> list[str]:
    lines: list[str] = []
    for address in item["watch"]:
        lines += [f'Set cell = sheet.Range({vb(address)})',
                  'rawValue = cell.Value2', 'CheckError "read value"',
                  'valueType = TypeName(rawValue)',
                  'formulaValue = CStr(cell.Formula)',
                  'If Left(formulaValue, 1) <> "=" Then formulaValue = ""',
                  'formatLocal = CStr(cell.NumberFormatLocal)',
                  'horizontalAlignment = CStr(cell.HorizontalAlignment)',
                  'verticalAlignment = CStr(cell.VerticalAlignment)',
                  'wrapTextValue = CStr(cell.WrapText)',
                  'If valueType = "Error" Then',
                  '  displayText = CStr(cell.Text)',
                  'ElseIf valueType = "Empty" Then',
                  '  displayText = ""',
                  'Else',
                  '  displayText = CStr(cell.Text)',
                  'End If',
                  'CheckError "format display text"',
                  f'output.WriteLine "CELL" & vbTab & {vb(record_id)} & vbTab & {vb(address)} & vbTab & valueType & vbTab & Clean(rawValue) & vbTab & Clean(formulaValue) & vbTab & Clean(displayText) & vbTab & Clean(formatLocal) & vbTab & Clean(horizontalAlignment) & vbTab & Clean(verticalAlignment) & vbTab & Clean(wrapTextValue)',
                  'Set cell = Nothing']
    for row in item.get("rows", []):
        lines += [f'rowSize = CDbl(sheet.Rows(CInt({int(row)})).RowHeight) * 96 / 72',
                  f'output.WriteLine "ROW" & vbTab & {vb(record_id)} & vbTab & {vb(str(row))} & vbTab & Clean(rowSize)']
    for column in item.get("columns", []):
        lines += [f'columnSize = CDbl(sheet.Columns({vb(column)}).Width) * 96 / 72',
                  f'output.WriteLine "COL" & vbTab & {vb(record_id)} & vbTab & {vb(column)} & vbTab & Clean(columnSize)']
    lines += ['Set merged = CreateObject("Scripting.Dictionary")']
    for address in item["watch"]:
        lines += [f'Set cell = sheet.Range({vb(address)})',
                  'If cell.MergeCells Then',
                  '  Set mergeArea = cell.MergeArea',
                  '  mergeAddress = CStr(mergeArea.Address(False, False))',
                  '  If Not merged.Exists(mergeAddress) Then merged.Add mergeAddress, True',
                  '  Set mergeArea = Nothing',
                  'End If',
                  'Set cell = Nothing']
    lines += [f'For Each mergeAddress In merged.Keys: output.WriteLine "MERGE" & vbTab & {vb(record_id)} & vbTab & Clean(mergeAddress): Next']
    lines += ['Set merged = Nothing']
    for row in item.get("rows", []):
        lines += [f'If sheet.Rows(CInt({int(row)})).Hidden Then output.WriteLine "HIDDEN" & vbTab & {vb(record_id)} & vbTab & {vb(str(row))}']
    lines += [f'output.WriteLine "STATE" & vbTab & {vb(record_id)} & vbTab & Clean(app.ActiveWindow.SplitRow) & vbTab & Clean(app.ActiveWindow.SplitColumn) & vbTab & Clean(sheet.AutoFilterMode)']
    return lines

def vbs_source(cases: list[dict[str, Any]], readbacks: list[dict[str, Any]], output_path: Path) -> str:
    startup_marker = Path(str(output_path) + ".startup")
    resume_marker = Path(str(output_path) + ".resume")
    lines = [
        'On Error Resume Next',
        'Set fso = CreateObject("Scripting.FileSystemObject")',
        f'Set output = fso.CreateTextFile({vb(output_path)}, True, True)',
        'CheckError "create output"',
        'Set app = CreateObject("Excel.Application")',
        'CheckError "create Excel.Application"',
        'app.Visible = False', 'app.DisplayAlerts = False', 'app.AskToUpdateLinks = False',
        'output.WriteLine "HWND" & vbTab & CStr(app.Hwnd)',
        f'Set startupFile = fso.CreateTextFile({vb(startup_marker)}, True, True)',
        'startupFile.WriteLine CStr(app.Hwnd)', 'startupFile.Close',
        f'Do While Not fso.FileExists({vb(resume_marker)})', '  WScript.Sleep 50', 'Loop',
    ]
    for item in cases:
        if item["locale"] == "vi-VN":
            lines += ['app.UseSystemSeparators = False', 'app.DecimalSeparator = ","', 'app.ThousandsSeparator = "."']
        else:
            lines += ['app.UseSystemSeparators = False', 'app.DecimalSeparator = "."', 'app.ThousandsSeparator = ","']
        lines += [f'Set book = app.Workbooks.Add(-4167)', 'CheckError "create workbook"']
        lines += ['Set sheet = FirstWorksheet(book)', 'CheckError "select worksheet"']
        for column in item.get("columns", []):
            lines += [f'sheet.Columns({vb(column)}).ColumnWidth = {SETUP_COLUMN_WIDTH_EXCEL}',
                      'CheckError "set fixture column width"']
        for input_item in item["inputs"]:
            address = input_item["cell"]
            lines += [f'Set cell = sheet.Range({vb(address)})']
            if input_item.get("format"):
                fmt = local_format(input_item["format"]["excel"], item["locale"])
                lines += [f'cell.NumberFormatLocal = {vb(fmt)}', 'CheckError "set input number format"']
            value = input_item["value"]
            if isinstance(value, str) and value.startswith("="):
                lines += [f'cell.Formula = {vb(value)}', 'CheckError "enter formula"']
            elif isinstance(value, str):
                lines += [f'cell.Value = {vb(value)}', 'CheckError "type text or value"']
            else:
                lines += [f'cell.Value2 = {numeric_vb(value)}', 'CheckError "set numeric input"']
            lines += ['Set cell = Nothing']
        lines += ['app.CalculateFull', 'CheckError "calculate inputs"']
        lines += vbs_snapshot(item, item["id"] + ".before")
        for action_index, action in enumerate(item["actions"], start=1):
            lines += vbs_action(action, item["locale"])
            lines += ['app.CalculateFull', 'CheckError "calculate after operation"']
            lines += vbs_snapshot(item, item["id"] + ".step" + str(action_index))
        lines += ['Set sheet = Nothing', 'book.Close False', 'CheckError "close measured workbook"', 'Set book = Nothing']
    for saved in readbacks:
        locale = saved["locale"]
        if locale == "vi-VN":
            lines += ['app.UseSystemSeparators = False', 'app.DecimalSeparator = ","', 'app.ThousandsSeparator = "."']
        else:
            lines += ['app.UseSystemSeparators = False', 'app.DecimalSeparator = "."', 'app.ThousandsSeparator = ","']
        record_id = saved["id"] + "." + Path(saved["path"]).suffix.lower().lstrip(".")
        lines += [f'Set book = app.Workbooks.Open({vb(saved["path"])}, 0, True)',
                  'CheckError "open saved workbook"',
                  f'output.WriteLine "OPENED" & vbTab & {vb(record_id)} & vbTab & TypeName(book) & vbTab & Clean(app.Workbooks.Count)',
                  'If TypeName(book) = "Empty" Or TypeName(book) = "Nothing" Then Err.Raise 1002, "sheet-basic-ops", "Excel returned no Workbook (type " & TypeName(book) & ")"',
                  'CheckError "validate opened workbook"',
                  'WScript.Sleep 1000',
                  'Set sheet = FirstWorksheet(book)', 'CheckError "select saved worksheet"']
        extension = Path(saved["path"]).suffix.lower().lstrip(".")
        lines += vbs_snapshot(saved, record_id)
        lines += ['Set sheet = Nothing', 'book.Close False', 'CheckError "close readback workbook"', 'Set book = Nothing']
    lines += [
        'app.Quit',
        'CheckError "quit Excel"',
        'Set app = Nothing',
        'Set fso = Nothing',
        'output.Close',
        'WScript.Sleep 500',
        'WScript.Quit 0',
        'Function Clean(v)',
        '  On Error Resume Next',
        '  Dim cleaned',
        '  cleaned = CStr(v)',
        '  If Err.Number <> 0 Then Err.Clear: cleaned = "#ERROR"',
        '  cleaned = Replace(cleaned, vbTab, " ")',
        '  cleaned = Replace(cleaned, vbCr, " ")',
        '  cleaned = Replace(cleaned, vbLf, " ")',
        '  Clean = cleaned',
        'End Function',
        'Function FirstWorksheet(workbook)',
        '  On Error Resume Next',
        '  Dim attempt, result',
        '  For attempt = 1 To 20',
        '    Err.Clear',
        '    Set result = workbook.Worksheets(1)',
        '    If Err.Number = 0 Then Set FirstWorksheet = result: Exit Function',
        '    Err.Clear',
        '    WScript.Sleep 100',
        '  Next',
        '  Err.Raise 1001, "sheet-basic-ops", "Could not access the first worksheet after retries"',
        'End Function',
        'Sub CheckError(stage)',
        '  If Err.Number <> 0 Then',
        '    Dim savedErrorNumber, savedErrorDescription, savedErrorStage',
        '    savedErrorNumber = CStr(Err.Number): savedErrorDescription = CStr(Err.Description): savedErrorStage = CStr(stage)',
        '    output.WriteLine "ERROR" & vbTab & savedErrorStage & vbTab & savedErrorNumber & vbTab & savedErrorDescription',
        '    Err.Clear',
        '    output.Close',
        '    WScript.Quit 9',
        '  End If',
        'End Sub',
    ]
    return "\r\n".join(lines) + "\r\n"

def parse_excel_output(path: Path, cases: list[dict[str, Any]], readbacks: list[dict[str, Any]]) -> dict[str, Any]:
    locales = {}
    for item in cases:
        locales[item["id"] + ".before"] = item["locale"]
        for index in range(1, len(item.get("actions", [])) + 1):
            locales[item["id"] + ".step" + str(index)] = item["locale"]
    locales.update({item["id"] + "." + Path(item["path"]).suffix.lower().lstrip("."): item["locale"] for item in readbacks})
    snapshots: dict[str, dict[str, Any]] = {}
    handles: list[int] = []

    def number(value: str, locale: str) -> float:
        raw = value.strip()
        comma, dot = raw.rfind(","), raw.rfind(".")
        if comma >= 0 and dot >= 0:
            decimal = "," if comma > dot else "."
            thousands = "." if decimal == "," else ","
            raw = raw.replace(thousands, "").replace(decimal, ".")
        elif comma >= 0:
            raw = raw.replace(",", ".")
        return float(raw)

    def alignment(value: str, value_type: str) -> str:
        explicit={"-4108":"center", "-4131":"left", "-4152":"right"}
        if value in explicit: return explicit[value]
        if value_type in {"Integer", "Long", "Double", "Single", "Currency", "Decimal", "Byte", "Boolean"}: return "right"
        return "left"

    def vertical_alignment(value: str) -> str:
        return {"-4108":"middle", "-4160":"top"}.get(value, "")

    for line in path.read_text(encoding="utf-16").splitlines():
        fields = line.split("\t")
        kind = fields[0]
        if kind == "HWND":
            handles.append(int(fields[1])); continue
        if kind == "ERROR":
            raise RuntimeError("Excel COM " + " — ".join(fields[1:]))
        if kind == "CELL":
            _, name, address, value_type, raw, formula, text, format_local, horizontal, vertical, wrap = fields
            locale = locales[name]
            if value_type in {"Integer", "Long", "Double", "Single", "Currency", "Decimal", "Byte"}:
                value: Any = number(raw, locale)
                if value.is_integer(): value = int(value)
            elif value_type == "Boolean":
                value = raw.lower() == "true"
            elif value_type == "Empty":
                value = ""
            else:
                value = raw
            snapshots.setdefault(name, {"cells": {}, "rows": {}, "columns": {}, "mergedRanges": [], "hiddenRows": [], "frozen": {"rows":0,"columns":0}, "filterActive":False})
            snapshots[name]["cells"][address] = {
                "value": value, "formula": formula, "text": text,
                "numberFormat": local_to_canonical(format_local, locale),
                "numberFormatLocal": format_local,
                "alignment": alignment(horizontal, value_type),
                "verticalAlignment": vertical_alignment(vertical),
                "wrapText": wrap.lower() == "true",
            }
        elif kind == "ROW":
            _, name, row, size = fields
            snapshots[name]["rows"][row] = number(size, locales[name])
        elif kind == "COL":
            _, name, column, size = fields
            snapshots[name]["columns"][column] = number(size, locales[name])
        elif kind == "MERGE":
            _, name, merge = fields
            snapshots[name]["mergedRanges"].append(merge)
        elif kind == "HIDDEN":
            _, name, row = fields
            snapshots[name]["hiddenRows"].append(int(row))
        elif kind == "STATE":
            _, name, frozen_rows, frozen_cols, active_filter = fields
            snapshots[name]["frozen"] = {"rows":int(frozen_rows),"columns":int(frozen_cols)}
            snapshots[name]["filterActive"] = active_filter.lower() == "true"
    for snapshot in snapshots.values():
        snapshot["mergedRanges"].sort()
        snapshot["hiddenRows"].sort()
    return {
        "results": [{"id": item["id"],
                     "before": snapshots[item["id"] + ".before"],
                     "steps": [snapshots[item["id"] + ".step" + str(index)]
                               for index in range(1, len(item.get("actions", [])) + 1)],
                     "snapshot": snapshots[item["id"] + ".step" + str(len(item.get("actions", [])))]
                                 if item.get("actions") else snapshots[item["id"] + ".before"],
                     "undoRedo": "NOT RUN in Excel: direct COM Range operations clear Excel's native undo stack"} for item in cases],
        "readbacks": [{"id": saved["id"], "extension": Path(saved["path"]).suffix,
                       "snapshot": snapshots[saved["id"] + "." + Path(saved["path"]).suffix.lower().lstrip(".")]}
                      for saved in readbacks],
        "handles": handles,
    }

def existing_excel_pids() -> set[int]:
    proc = run(["powershell", "-NoProfile", "-Command", "(Get-Process EXCEL -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id) -join ','"], ROOT, timeout=30)
    if proc.returncode or not proc.stdout.strip(): return set()
    return {int(part) for part in proc.stdout.strip().split(",") if part.strip().isdigit()}

def excel_pid_for_window(hwnd: int) -> int:
    if not hasattr(ctypes, "windll") or not hwnd: return 0
    pid = ctypes.c_ulong(0)
    ctypes.windll.user32.GetWindowThreadProcessId(ctypes.c_void_p(hwnd), ctypes.byref(pid))
    return int(pid.value)

def cleanup_own_hidden_excel(owned_pids: set[int]) -> None:
    for process_id in owned_pids:
        try:
            probe = run(["powershell", "-NoProfile", "-Command",
                         f"$p=Get-Process -Id {process_id} -ErrorAction SilentlyContinue; if ($p) {{ $p.MainWindowHandle }}"],
                        ROOT, timeout=10)
            if probe.returncode == 0 and probe.stdout.strip() == "0":
                subprocess.run(["powershell", "-NoProfile", "-Command",
                                f"Stop-Process -Id {process_id} -Force -ErrorAction SilentlyContinue"],
                               cwd=str(ROOT), capture_output=True, timeout=10, check=False)
        except Exception:
            pass

def run_excel(cases: list[dict[str, Any]], readbacks: list[dict[str, Any]], stem: Path, timeout: int = 120) -> dict[str, Any]:
    wait_for_ram("Excel COM")
    vbs_path = stem.with_suffix(".vbs")
    output_path = stem.with_suffix(".tsv")
    vbs_path.write_text(vbs_source(cases, readbacks, output_path), encoding="utf-16")
    before = existing_excel_pids()
    cscript = shutil.which("cscript.exe") or str(Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "cscript.exe")
    if output_path.exists(): output_path.unlink()
    startup_marker = Path(str(output_path) + ".startup")
    resume_marker = Path(str(output_path) + ".resume")
    for marker in (startup_marker, resume_marker):
        if marker.exists(): marker.unlink()
    proc = subprocess.Popen([cscript, "//NoLogo", str(vbs_path)], cwd=str(ROOT),
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace")
    handle = 0
    own_pids: set[int] = set()
    startup_deadline = time.monotonic() + 60
    while time.monotonic() < startup_deadline and not startup_marker.exists():
        if proc.poll() is not None: break
        time.sleep(0.05)
    if startup_marker.exists():
        handle = int(startup_marker.read_text(encoding="utf-16", errors="replace").strip())
        process_id = excel_pid_for_window(handle)
        if process_id and process_id not in before: own_pids.add(process_id)
        resume_marker.write_text("continue", encoding="ascii")
    elif proc.poll() is None:
        proc.kill()
    if proc.poll() is None and not handle:
        proc.kill()
    try:
        stdout, stderr = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill(); stdout, stderr = proc.communicate()
        cleanup_own_hidden_excel(own_pids)
        for marker in (startup_marker, resume_marker):
            if marker.exists(): marker.unlink()
        raise RuntimeError(f"Excel COM timed out after {timeout} seconds")
    for marker in (startup_marker, resume_marker):
        if marker.exists(): marker.unlink()
    if proc.returncode:
        if not handle and output_path.exists():
            for line in output_path.read_text(encoding="utf-16", errors="replace").splitlines():
                if line.startswith("HWND\t"):
                    handle = int(line.split("\t", 1)[1]); break
        process_id = excel_pid_for_window(handle)
        if process_id and process_id not in before: own_pids.add(process_id)
        cleanup_own_hidden_excel(own_pids)
        raise RuntimeError(f"Excel COM failed ({proc.returncode}):\n{stdout[-2000:]}\n{stderr[-2000:]}")
    try:
        result = parse_excel_output(output_path, cases, readbacks)
    except Exception:
        cleanup_own_hidden_excel(own_pids)
        raise
    if not handle and result["handles"]: handle = result["handles"][0]
    process_id = excel_pid_for_window(handle)
    if process_id and process_id not in before: own_pids.add(process_id)
    result["excelProcessIds"] = sorted(own_pids)
    cleanup_own_hidden_excel(own_pids)
    return result

def local_to_canonical(code: str, locale: str) -> str:
    if locale != "vi-VN": return code
    import re
    pieces = re.split(r'("[^"]*")', code)
    for index in range(0, len(pieces), 2):
        marker = "\uE000"
        pieces[index] = pieces[index].replace(".", marker).replace(",", ".").replace(marker, ",")
    return "".join(pieces)

def same_value(a: Any, b: Any) -> bool:
    if isinstance(a, bool) or isinstance(b, bool): return a is b
    if isinstance(a, (int,float)) and isinstance(b, (int,float)): return abs(float(a)-float(b)) <= 1e-8
    return str(a) == str(b)

def canonical_formula(value: Any) -> str:
    pieces = re.split(r'("(?:[^"]|"")*")', str(value or ""))
    for index in range(0, len(pieces), 2):
        pieces[index] = re.sub(r"(?<![A-Z0-9_.])(TRUE|FALSE)\(\)", r"\1", "".join(pieces[index].upper().split()))
    return "".join(pieces)

def canonical_number_format(value: Any) -> str:
    if isinstance(value, dict): value = value.get("excel", value)
    text = str(value or "").strip()
    text = re.sub(r"\[\$\$\]", '"$"', text)
    text = re.sub(r"\[\$([€£¥₫])(?:-[^\]]+)?\]", r'"\1"', text)
    return text.lower()

def _cell_position(address: str) -> tuple[int, int] | None:
    match=re.fullmatch(r"([A-Z]+)(\d+)",str(address).upper())
    if not match: return None
    column=0
    for char in match.group(1): column=column*26+ord(char)-64
    return column,int(match.group(2))

def _covered_by_merge(address: str, ranges: list[str]) -> bool:
    position=_cell_position(address)
    if not position: return False
    for merge in ranges:
        parts=str(merge).split(":",1)
        if len(parts)!=2 or address.upper()==parts[0].upper(): continue
        start,end=_cell_position(parts[0]),_cell_position(parts[1])
        if start and end and start[0]<=position[0]<=end[0] and start[1]<=position[1]<=end[1]: return True
    return False

def compare(expected: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    diffs = []
    hidden_rows = set(expected.get("hiddenRows", [])) | set(actual.get("hiddenRows", []))
    for address in sorted(set(expected.get("cells",{})) | set(actual.get("cells",{}))):
        left, right = expected.get("cells",{}).get(address,{}), actual.get("cells",{}).get(address,{})
        for field in ("value","formula","text","alignment","verticalAlignment","wrapText"):
            if field in {"alignment","verticalAlignment"} and _covered_by_merge(address, expected.get("mergedRanges",[])): continue
            a,b = left.get(field,""),right.get(field,"")
            if field == "formula": a,b = canonical_formula(a),canonical_formula(b)
            if field == "value" and same_value(a,b): continue
            if a != b: diffs.append(f"{address}.{field}: Excel={a!r}, VN={b!r}")
        ef, vf = left.get("numberFormat"), right.get("numberFormat")
        ef, vf = canonical_number_format(ef), canonical_number_format(vf)
        if ef and vf and ef != vf:
            diffs.append(f"{address}.numberFormat: Excel={ef!r}, VN={vf!r}")
    for dim in ("rows","columns"):
        for key in set(expected.get(dim,{})) | set(actual.get(dim,{})):
            if dim == "rows" and int(key) in hidden_rows: continue
            a,b=expected.get(dim,{}).get(key),actual.get(dim,{}).get(key)
            if a is not None and b is not None and abs(float(a)-float(b)) > 2.5:
                diffs.append(f"{dim}[{key}]: Excel={a}px, VN={b}px")
    for field in ("mergedRanges","hiddenRows","frozen","filterActive"):
        if expected.get(field) != actual.get(field): diffs.append(f"{field}: Excel={expected.get(field)!r}, VN={actual.get(field)!r}")
    return diffs

def summary(snapshot: dict[str, Any] | None) -> str:
    if not snapshot: return "—"
    items=[]
    for address, cell in snapshot.get("cells",{}).items():
        value=str(cell.get("value","")).replace("|","\\|").replace("\n"," ")
        shown=str(cell.get("text","")).replace("|","\\|").replace("\n"," ")
        formula=cell.get("formula","")
        items.append(f"{address}={value} [{shown}]" + (f" {formula}" if formula else ""))
    return "; ".join(items) or "(không có ô được theo dõi)"

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--out-dir",default=str(ROOT/"file test"/"_sheet_basic_ops"))
    parser.add_argument("--baseline")
    parser.add_argument("--case", action="append", help="Run only this scenario ID; may be repeated")
    parser.add_argument("--reuse-excel", action="store_true", help="Parse Excel COM TSVs and saved exports already in --out-dir")
    args=parser.parse_args(); out=Path(args.out_dir).resolve(); out.mkdir(parents=True,exist_ok=True)
    cases=[item for item in CASES if not args.case or item["id"] in args.case]
    missing=set(args.case or [])-{item["id"] for item in cases}
    if missing: parser.error("unknown scenario ID(s): " + ", ".join(sorted(missing)))
    if not cases: parser.error("no scenarios selected")
    if not args.reuse_excel:
        wait_for_ram("đợt đo Sheet cơ bản")
    cases_path=out/"_cases.json"; cases_path.write_text(json.dumps(cases,ensure_ascii=False,indent=2),encoding="utf-8")
    excel_results=[]
    excel_errors={}
    for item in cases:
        try:
            if args.reuse_excel:
                measurement=parse_excel_output(out/("_excel_measure_"+item["id"]+".tsv"),[item],[])
            else:
                measurement=run_excel([item],[],out/("_excel_measure_"+item["id"]))
            excel_results.extend(measurement["results"])
        except Exception as exc:
            excel_errors[item["id"]]=str(exc)
    excel_by_id={x["id"]:x for x in excel_results}
    for item in cases:
        if item["id"] not in excel_by_id:
            excel_by_id[item["id"]]={"id":item["id"],"snapshot":None,"before":None,"steps":[],"error":excel_errors.get(item["id"],"Excel COM returned no snapshot")}
    vnproc=run(["node",str(HERE/"_sheet_basic_ops_vn.mjs"),str(ROOT),str(cases_path),str(out)],ROOT)
    if vnproc.returncode: raise RuntimeError(f"VN model runner failed:\n{vnproc.stdout[-2000:]}\n{vnproc.stderr[-2000:]}")
    vnlist=json.loads(vnproc.stdout); vn_by_id={x["id"]:x for x in vnlist}

    readback_specs=[]
    save_errors={item["id"]:[] for item in cases}
    readbacks={}
    if args.reuse_excel:
        for item in cases:
            extensions=["xlsx","xls"] if item["saveXls"] else ["xlsx"]
            for extension in extensions:
                target=out/(item["id"]+"."+extension)
                if not target.is_file():
                    save_errors[item["id"]].append(f"{extension} reuse: saved workbook is missing")
                    continue
                saved={"id":item["id"],"path":str(target),"watch":item["watch"],"rows":item["rows"],
                       "columns":item["columns"],"locale":item["locale"]}
                readback_specs.append(saved)
                tsv=out/("_excel_readback_"+item["id"]+"_"+extension+".tsv")
                try:
                    readback=parse_excel_output(tsv,[],[saved])
                    for x in readback["readbacks"]: readbacks.setdefault(x["id"],[]).append(x)
                except Exception as exc:
                    save_errors[item["id"]].append(f"Excel .{extension} reused readback: {exc}")
    else:
        sys.path.insert(0,str(ROOT))
        import main as vnmain
        for item in cases:
            model=vn_by_id[item["id"]]; wait_for_ram("lưu "+item["id"])
            extensions=["xlsx","xls"] if item["saveXls"] else ["xlsx"]
            for extension in extensions:
                try:
                    with tempfile.TemporaryDirectory(prefix="vno_sheet_basic_ops_") as work:
                        converted=vnmain._run_soffice_convert(model["fodsPath"],extension,work,app_kind="sheet")
                        if extension=="xlsx":
                            vnmain._apply_native_export_postprocess(model["fodsPath"],converted,"sheet","xlsx")
                        target=out/(item["id"]+"."+extension); shutil.copy2(converted,target)
                    readback_specs.append({"id":item["id"],"path":str(target),"watch":item["watch"],"rows":item["rows"],"columns":item["columns"],"locale":item["locale"]})
                except Exception as exc:
                    save_errors[item["id"]].append(f"{extension} export: {exc}")
        for saved in readback_specs:
            try:
                readback=run_excel([], [saved], out/("_excel_readback_"+saved["id"]+"_"+Path(saved["path"]).suffix.lower().lstrip(".")))
                for x in readback["readbacks"]: readbacks.setdefault(x["id"],[]).append(x)
            except Exception as exc:
                save_errors[saved["id"]].append(f"Excel {Path(saved['path']).suffix.lower()} readback: {exc}")

    baseline={}
    baseline_case_by_id={}
    if args.baseline:
        baseline_path=Path(args.baseline)
        baseline=json.loads(baseline_path.read_text(encoding="utf-8"))
        if isinstance(baseline, list): baseline={"results":baseline}
        case_manifest=baseline_path.parent/"_cases.json"
        if case_manifest.exists():
            baseline_case_by_id={x["id"]:x for x in json.loads(case_manifest.read_text(encoding="utf-8"))}
    base_by_id={x["id"]:x for x in baseline.get("results",[])}
    def has_comparable_baseline(item: dict[str, Any]) -> bool:
        if item["id"] not in base_by_id: return False
        old=baseline_case_by_id.get(item["id"])
        if old is None: return True
        keys=("locale","inputLocale","inputs","actions","watch","rows","columns")
        return all(old.get(key)==item.get(key) for key in keys)
    rows=[]
    for item in cases:
        vn=vn_by_id[item["id"]]; excel_case=excel_by_id[item["id"]]; ex=excel_case.get("snapshot")
        diffs=compare(ex,vn["current"]) if ex else []
        initial_vn=vn["history"][0]["before"] if vn["history"] else vn["current"]
        initial_diffs=compare(excel_case["before"],initial_vn) if excel_case.get("before") else []
        step_differences=[]
        for index, excel_step in enumerate(excel_case.get("steps",[])):
            vn_step=vn["history"][index]["after"] if index < len(vn["history"]) else vn["current"]
            step_differences.append({"step":index+1,"operation":item["actions"][index]["type"],
                                     "differences":compare(excel_step,vn_step)})
        save_diffs=[]
        for saved in readbacks.get(item["id"],[]):
            save_diffs.extend([saved["extension"]+" readback: "+d for d in compare(vn["current"],saved["snapshot"])])
        history_fail=[h for h in vn["history"] if not h["undoResult"] or not h["redoResult"] or not h["undoMatchesBefore"] or not h["redoMatchesAfter"]]
        step_diffs=[f"step {step['step']} {step['operation']}: {difference}"
                    for step in step_differences for difference in step["differences"]]
        all_diffs=initial_diffs+step_diffs+diffs
        case_save_errors=save_errors[item["id"]]
        if excel_case.get("error"): case_save_errors=[f"Excel measurement: {excel_case['error']}"]+case_save_errors
        status="FAIL" if all_diffs or save_diffs or history_fail else "BLOCKED" if case_save_errors else "PASS"
        result={"id":item["id"],"title":item["title"],"current":vn["current"],"excel":ex,
            "excelBefore":excel_case["before"],"excelSteps":excel_case["steps"],
            "excelMatches":ex is not None and not all_diffs,"excelDifferences":all_diffs,"initialDifferences":initial_diffs,
            "stepDifferences":step_differences,"saveMatches":not save_diffs and not case_save_errors,
            "saveDifferences":save_diffs,"saveErrors":case_save_errors,"history":vn["history"],"historyMatches":not history_fail,
            "historyFailures":history_fail,"files":[x["path"] for x in readback_specs if x["id"]==item["id"]],"status":status}
        rows.append({"title":item["title"],"excel":summary(ex),
            "before":summary(base_by_id[item["id"]]["current"]) if has_comparable_baseline(item) else "chưa có baseline",
            "after":summary(vn["current"]),"status":status,"result":result})

    payload={"root":str(ROOT),"excelVersion":"Excel 2016 COM","results":[x["result"] for x in rows]}
    report_path=out/"_sheet_basic_ops_report.md"
    with report_path.open("w",encoding="utf-8") as report:
        report.write("# Sheet Basic Operations — Excel 2016 parity\n\n")
        report.write("| scenario | Excel result | VN before | VN after | status |\n|---|---|---|---|---|\n")
        for x in rows:
            fields=[x[k].replace("|","\\|").replace("\n"," ") for k in ("title","excel","before","after","status")]
            report.write("| "+" | ".join(fields)+" |\n")
        report.write("\nExcel COM records Value2, Formula, displayed Text, number format, row/column sizes, merge ranges, hidden rows, and freeze/filter state. VN runs SheetGridController and SheetAdapter. VN FODS is exported through main.py's LibreOffice path; Excel opens every XLSX and also the number-format case as XLS. Excel COM cannot report native Undo/Redo after automated Range writes, so the VN history checks compare each action's undo/redo snapshots with its measured before/after states.\n\n")
        for x in rows:
            r=x["result"]
            if r["excelDifferences"] or r["saveDifferences"] or r["historyFailures"] or r["saveErrors"]:
                report.write("## "+r["id"]+"\n\n")
                for d in r["excelDifferences"]+r["saveDifferences"]: report.write("- "+d+"\n")
                for error in r["saveErrors"]: report.write("- BLOCKED: "+error+"\n")
                for h in r["historyFailures"]: report.write(f"- Undo/Redo {h['type']}: undo={h['undoMatchesBefore']}, redo={h['redoMatchesAfter']}\n")
                report.write("\n")
    result_path=out/"_sheet_basic_ops.json"; result_path.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print("Report:",report_path); print("Results:",result_path)
    for x in rows:
        count=len(x["result"]["excelDifferences"])+len(x["result"]["saveDifferences"])+len(x["result"]["historyFailures"])+len(x["result"]["saveErrors"])
        print(f"{x['result']['id']}: {x['status']} ({count} mismatch(es))")
    return 1 if any(x["status"]!="PASS" for x in rows) else 0

if __name__=="__main__":
    raise SystemExit(main())
