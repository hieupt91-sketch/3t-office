"""Usage: python _create_new_sheet.py <worktree> <out.xlsx> [--scenario 1|2]
Chieu "tao moi trong VN Sheet -> luu XLSX": mo app that KHONG co file, dat gia tri/dinh dang qua API grid that
(window.__vnoAppInstance.grid), luu qua common.file.save (hop thoai native bi thay), ghi <out.xlsx> + <out>.expected.json
(gia tri mong doi cua tung o de _excel_readback.ps1 doi chieu bang Excel COM)."""
import argparse, sys, time, os, json

parser = argparse.ArgumentParser()
parser.add_argument("worktree")
parser.add_argument("out")
parser.add_argument("--scenario", choices=("1", "2"), default="1")
args = parser.parse_args()
ROOT, OUT, SCENARIO_NUMBER = os.path.abspath(args.worktree), os.path.abspath(args.out), args.scenario
if os.path.exists(OUT):
    os.remove(OUT)
sys.path.insert(0, ROOT)
import webview
import main as vnmain

server, port = vnmain._start_static_server()
api = vnmain.VnOfficeApi(app_kind="sheet", initial_file=None)
_orig_save = api.save_document_dialog
def _dump_save(content, *a, **k):
    with open(OUT + ".sent.fods", "w", encoding="utf-8") as f:
        f.write(content)
    return _orig_save(content, *a, **k)
api.save_document_dialog = _dump_save
window = webview.create_window(title="VN Sheet - Create New", url=vnmain.build_launch_url("sheet", None, port=port), width=1400, height=900, js_api=api)

# Kich ban: (coord, value, style props, numberFormat config) — gia tri mong doi doc bang Excel COM
SCENARIO = r"""
(async function(){
  const app = window.__vnoAppInstance; if (!app || !app.grid) return 'no-app';
  const g = app.grid;
  const put = (c, r, v) => g.setCellValue(c, r, v);
  const sel = (c, r) => { g.selectCell(c, r); };
  const st = (c, r, props) => { sel(c, r); for (const [k, v] of Object.entries(props)) g.setStyle(k, v); };
  put("A", 1, "Tiêu đề báo cáo"); st("A", 1, { fontWeight: "bold", fontSize: "18.67px", fontFamily: "Times New Roman", color: "#FF0000", textAlign: "center" });
  put("A", 2, "Nghiêng"); st("A", 2, { fontStyle: "italic", fontFamily: "Arial", fontSize: "13.33px" });
  put("A", 3, "Gạch chân"); st("A", 3, { textDecoration: "underline" });
  put("B", 1, 1234567.891); g.applyNumberFormat({ category: "number", decimals: 2, useThousands: true }, { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } });
  put("B", 2, 0.256); g.applyNumberFormat({ category: "percentage", decimals: 1 }, { start: { c: "B", r: 2 }, end: { c: "B", r: 2 } });
  put("B", 3, 1500000); g.applyNumberFormat({ category: "currency", decimals: 0, currencySymbol: "₫" }, { start: { c: "B", r: 3 }, end: { c: "B", r: 3 } });
  put("B", 4, 45900); g.applyNumberFormat({ category: "date", dateFormat: "dd/mm/yyyy" }, { start: { c: "B", r: 4 }, end: { c: "B", r: 4 } });
  put("C", 1, "=B1*2"); put("C", 2, "=SUM(B1:B3)");
  put("D", 1, "Nền vàng"); st("D", 1, { backgroundColor: "#FFFF00" });
  put("D", 2, "Viền"); st("D", 2, { borderTop: "1px solid #000000", borderBottom: "1px solid #000000", borderLeft: "1px solid #000000", borderRight: "1px solid #000000" });
  put("D", 3, "Xuống dòng dài để thử wrap text trong ô"); st("D", 3, { whiteSpace: "pre-wrap", verticalAlign: "top" });
  put("E", 1, "Gộp E1:G1"); g.selectCell("E", 1); g.selectionRange = { start: { c: "E", r: 1 }, end: { c: "G", r: 1 } }; g.mergeCells("mergeCenter", g.selectionRange, { confirmDataLoss: false });
  g.setColumnWidths(160, ["A"]); g.setColumnWidths(48, ["C"]);
  g.setRowHeights(40, [5]); put("A", 5, "Dòng cao 40px");
  put("B", 5, "Ô mặc định");
  put("H", 1, "Cỡ chữ 14 pt"); sel("H", 1);
  const { globalCommandBus } = await import('/platform/commands/command-bus.js');
  await globalCommandBus.execute("sheet.font.size", "14");
  return 'ok';
})()
"""
EXPECTED = {
    "A1": {"value": "Tiêu đề báo cáo", "bold": True, "size": 14, "font": "Times New Roman", "color": "#FF0000", "halign": "center"},
    "A2": {"value": "Nghiêng", "italic": True, "font": "Arial", "size": 10},
    "A3": {"value": "Gạch chân", "underline": True},
    "B1": {"value": 1234567.891, "numFmtContains": "#,##0.00"},
    "B2": {"value": 0.256, "numFmtContains": "0.0%"},
    "B3": {"value": 1500000, "numFmtContains": "₫"},
    "B4": {"value": 45900, "numFmtContains": "dd/mm/yyyy"},
    "C1": {"formula": "=B1*2", "value": 2469135.782},
    "C2": {"formula": "=SUM(B1:B3)"},
    "D1": {"fill": "#FFFF00"},
    "D2": {"borders": True},
    "D3": {"wrap": True, "valign": "top"},
    "E1": {"value": "Gộp E1:G1", "mergeArea": "$E$1:$G$1", "halign": "center"},
    "B5": {"value": "Ô mặc định", "font": "Calibri", "size": 11},
    "H1": {"value": "Cỡ chữ 14 pt", "size": 14},
    "A": {"colWidthPx": 160}, "B": {"colWidthPx": 64}, "C": {"colWidthPx": 48},
    "5": {"rowHeightPx": 40}, "6": {"rowHeightPx": 20},
}

SCENARIO2 = r"""
(async function(){
  const app = window.__vnoAppInstance; if (!app || !app.grid) return 'no-app';
  const g = app.grid;
  const { globalCommandBus } = await import('/platform/commands/command-bus.js');
  await globalCommandBus.execute('common.file.new');
  const put = (c, r, v) => g.setCellValue(c, r, v);
  const sel = (c, r) => g.selectCell(c, r);
  const range = (c1, r1, c2, r2) => ({ start: { c: c1, r: r1 }, end: { c: c2, r: r2 } });
  const st = (c, r, props) => { sel(c, r); for (const [k, v] of Object.entries(props)) g.setStyle(k, v); };

  await globalCommandBus.execute('sheet.sheet.rename', { oldName: g.activeSheet, newName: 'Doanh thu' });
  put('A', 1, 'Mã'); put('B', 1, 'Doanh thu'); put('C', 1, 'Trạng thái'); put('D', 1, 'Lựa chọn');
  put('A', 2, 'SP1'); put('B', 2, 150); put('A', 3, 'SP2'); put('B', 3, 50);
  g.applyNumberFormat({ category: 'date', dateFormat: 'dd/mm/yyyy' }, range('B', 4, 'B', 4));
  put('B', 4, '15/03/2026');
  g.applyNumberFormat({ category: 'time', timeFormat: 'hh:mm' }, range('B', 5, 'B', 5));
  put('B', 5, '08:30');
  put('B', 6, 1.5e10); g.applyNumberFormat({ category: 'scientific', decimals: 1 }, range('B', 6, 'B', 6));
  put('B', 7, 0); put('B', 8, 200); put('B', 9, 75); put('B', 10, 125);
  put('B', 11, -1234); g.applyNumberFormat({ category: 'number', decimals: 0, useThousands: true, negativeStyle: 1 }, range('B', 11, 'B', 11));
  put('B', 12, 0); g.applyNumberFormat({ category: 'number', decimals: 2, useThousands: true }, range('B', 12, 'B', 12));

  put('G', 2, 'SP1'); put('H', 2, 10); put('G', 3, 'SP2'); put('H', 3, 20);
  put('E', 2, '=IF(B2>100,"Đạt","Chưa")');
  put('E', 3, '=VLOOKUP(A3,G2:H3,2,0)');
  put('E', 4, '=SUMIF(C2:C3,"Đạt",B2:B3)');
  put('E', 5, '=AVERAGE(B2:B3)');
  put('E', 6, '=ROUND(B9,0)');
  put('E', 7, '=TEXT(B4,"dd/mm/yyyy")');
  put('E', 8, '=CONCATENATE(A2,"-",A3)');
  put('E', 9, '=COUNTA(A2:A3)');

  for (let row = 2; row <= 10; row++) {
    const width = row === 5 ? '3px' : '1px';
    for (const col of ['A','B','C','D']) st(col, row, {
      borderTop: `${row === 2 ? '3' : '1'}px solid #000000`,
      borderBottom: `${row === 10 ? '3' : width.slice(0,1)}px solid #000000`,
      borderLeft: `${col === 'A' ? '3' : '1'}px solid #000000`,
      borderRight: `${col === 'D' ? '3' : '1'}px solid #000000`
    });
  }
  st('A', 5, { borderBottom: '3px double #000000' });
  st('A', 1, { backgroundColor: '#DDEBF7' });
  st('B', 1, { backgroundColor: '#1F4E78', color: '#FFFFFF' });
  st('C', 1, { textAlign: 'center', verticalAlign: 'middle' });
  sel('C', 1); await globalCommandBus.execute('sheet.cell.orientation', 90);
  sel('D', 2); await globalCommandBus.execute('sheet.cell.indentIncrease'); await globalCommandBus.execute('sheet.cell.indentIncrease');

  put('A', 13, 'Chuỗi rất dài để kiểm tra AutoFit độ rộng cột');
  sel('A', 13); await globalCommandBus.execute('sheet.col.autoFit');
  await globalCommandBus.execute('sheet.col.hide', { cols: ['C'] });
  await globalCommandBus.execute('sheet.row.hide', { rows: [7] });
  g.addConditionalFormattingRule(range('B', 2, 'B', 10), { type: 'greaterThan', value: 100, color: '#70AD47' });
  g.addDataValidation(range('D', 2, 'D', 10), { type: 'list', values: ['Có', 'Không'] });
  sel('A', 1); g.selectionRange = range('A', 1, 'D', 10); await globalCommandBus.execute('sheet.data.filter');
  g.setPageSetup({ orientation: 'landscape', size: 'a4', margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 }, printTitles: { rows: '1', cols: '' } });
  sel('A', 1); g.selectionRange = range('A', 1, 'D', 20); await globalCommandBus.execute('sheet.page.setPrintArea');
  g.saveComment({ coord: 'A1', text: 'Ghi chú kiểm tra', author: 'VN Office' });
  put('F', 2, "'=abc"); g.applyNumberFormat({ category: 'text' }, range('F', 2, 'F', 2));
  g.applyNumberFormat({ category: 'text' }, range('F', 3, 'F', 3)); put('F', 3, '0912345678');
  sel('B', 2); await globalCommandBus.execute('sheet.view.freezePanes');

  g.addSheet('Chi phí');
  put('A', 1, "='Doanh thu'!B2*2");
  g.switchSheet('Doanh thu');
  window.__scenarioDone = 1;
  return 'ok';
})()
"""

EXPECTED2 = {
    "scenario": 2,
    "workbook": {"sheetCount": 2, "sheetNames": ["Doanh thu", "Chi phí"]},
    "sheets": {
        "Doanh thu": {
            "window": {"splitRow": 1, "splitColumn": 1, "freezePanes": True},
            "cells": {
                "B4": {"value": 46096, "numFmtContains": "dd/mm/yyyy"},
                "B5": {"value": 0.354166666666667, "numFmtContains": "hh:mm"},
                "B6": {"value": 15000000000, "numFmtContains": "E+"},
                "B11": {"value": -1234, "numFmtContains": "[Red]-#,##0"},
                "B12": {"value": 0, "numFmtContains": "#,##0.00"},
                "E2": {"formula": "=IF(B2>100,\"Đạt\",\"Chưa\")", "value": "Đạt"},
                "E3": {"formula": "=VLOOKUP(A3,G2:H3,2,0)", "value": 20},
                "E4": {"formula": "=SUMIF(C2:C3,\"Đạt\",B2:B3)"},
                "E5": {"formula": "=AVERAGE(B2:B3)", "value": 100},
                "E6": {"formula": "=ROUND(B9,0)", "value": 75},
                "E7": {"formula": "=TEXT(B4,\"dd/mm/yyyy\")", "value": "15/03/2026"},
                "E8": {"formula": "=CONCATENATE(A2,\"-\",A3)", "value": "SP1-SP2"},
                "E9": {"formula": "=COUNTA(A2:A3)", "value": 2},
                "A5": {"bottomBorderStyle": -4119},
                "A1": {"fill": "#DDEBF7", "comment": "Ghi chú kiểm tra"},
                "B1": {"fill": "#1F4E78", "color": "#FFFFFF"},
                "C1": {"halign": "center", "valign": "center", "orientation": 90},
                "D2": {"indentLevel": 2},
                "F2": {"value": "=abc"},
                "F3": {"value": "0912345678", "numberFormat": "@"}
            },
            "ranges": {
                "A2:D10": {"outsideBorderWeight": -4138, "insideHorizontalWeight": 2},
                "B2:B10": {"formatConditionCount": 1, "formatConditionType": 1, "formatConditionFormula1": "100", "formatConditionFill": "#70AD47"},
                "D2:D10": {"validationType": 3, "validationFormula1Contains": "Có"}
            },
            "columns": {"A": {"widthGreaterThan": 8.43}, "C": {"hidden": True}},
            "rows": {"7": {"hidden": True}},
            "autoFilter": {"enabled": True, "range": "$A$1:$D$10"},
            "pageSetup": {"orientation": 2, "paperSize": 9, "marginCm": 1.5, "printTitleRows": "$1:$1", "printArea": "$A$1:$D$20"}
        },
        "Chi phí": {"cells": {"A1": {"formula": "='Doanh thu'!B2*2", "value": 300}}}
    }
}

def after_load(win):
    for _ in range(40):
        time.sleep(2)
        ready = win.evaluate_js("!!(window.__vnoAppInstance && window.__vnoAppInstance.grid && document.querySelector('.vno-grid-cell'))")
        if ready: break
    print("READY:", ready, flush=True)
    time.sleep(2)
    script = SCENARIO2 if SCENARIO_NUMBER == "2" else SCENARIO
    expected = EXPECTED2 if SCENARIO_NUMBER == "2" else EXPECTED
    win.evaluate_js("window.__scenarioDone=0")
    print("SCENARIO:", win.evaluate_js(script), flush=True)
    for _ in range(40):
        time.sleep(0.5)
        if SCENARIO_NUMBER == "1" or win.evaluate_js("window.__scenarioDone") == 1:
            break
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).then(r => { window.__saveDone = 1; }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(100):
        time.sleep(2)
        if win.evaluate_js("window.__saveDone") == 1 or win.evaluate_js("window.__saveErr") or (os.path.exists(OUT) and os.path.getsize(OUT) > 0): break
    print("SAVED:", os.path.exists(OUT), "ERR:", win.evaluate_js("window.__saveErr"), flush=True)
    with open(OUT + ".expected.json", "w", encoding="utf-8") as f:
        json.dump(expected, f, ensure_ascii=False, indent=1)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()

webview.start(after_load, window, debug=False)
