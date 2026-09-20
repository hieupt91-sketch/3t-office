"""Usage: python _create_new_sheet.py <worktree> <out.xlsx>
Chieu "tao moi trong VN Sheet -> luu XLSX": mo app that KHONG co file, dat gia tri/dinh dang qua API grid that
(window.__vnoAppInstance.grid), luu qua common.file.save (hop thoai native bi thay), ghi <out.xlsx> + <out>.expected.json
(gia tri mong doi cua tung o de _excel_readback.ps1 doi chieu bang Excel COM)."""
import sys, time, os, json
ROOT, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
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

def after_load(win):
    for _ in range(40):
        time.sleep(2)
        ready = win.evaluate_js("!!(window.__vnoAppInstance && window.__vnoAppInstance.grid && document.querySelector('.vno-grid-cell'))")
        if ready: break
    print("READY:", ready, flush=True)
    time.sleep(2)
    print("SCENARIO:", win.evaluate_js(SCENARIO), flush=True)
    time.sleep(2)
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).then(r => { window.__saveDone = 1; }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(100):
        time.sleep(2)
        if win.evaluate_js("window.__saveDone") == 1 or win.evaluate_js("window.__saveErr") or (os.path.exists(OUT) and os.path.getsize(OUT) > 0): break
    print("SAVED:", os.path.exists(OUT), "ERR:", win.evaluate_js("window.__saveErr"), flush=True)
    with open(OUT + ".expected.json", "w", encoding="utf-8") as f:
        json.dump(EXPECTED, f, ensure_ascii=False, indent=1)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()

webview.start(after_load, window, debug=False)
