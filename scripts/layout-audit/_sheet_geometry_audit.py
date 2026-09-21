"""So hinh hoc render VN Sheet voi Excel 2016 (S30 - render geometry).
Usage: python _sheet_geometry_audit.py <worktree> <xlsx> <outdir> [--max-sheets 4] [--lines] [--reuse-excel]
  1) _excel_geometry.ps1 -> <outdir>/<stem>.geom.json (Excel: cot px, hang px, gop, o chu, [so dong boc chu])
  2) mo app that (webview) tren <xlsx>, moi sheet: chieu rong <th> cot, chieu cao hang, o chu: so dong render/tran
  3) in bang lech theo lop: col (px), row (px), lines (so dong boc chu), fit (chu khong boc bi cat/tran khac Excel)
Sai so cho phep: cot/hang 1px (lam tron), so dong 0.
"""
import os, sys, json, time, subprocess, argparse
ap = argparse.ArgumentParser()
ap.add_argument("root"); ap.add_argument("xlsx"); ap.add_argument("outdir")
ap.add_argument("--max-sheets", type=int, default=4); ap.add_argument("--lines", action="store_true"); ap.add_argument("--reuse-excel", action="store_true")
ap.add_argument("--max-rows", type=int, default=400); ap.add_argument("--max-cols", type=int, default=40)
ap.add_argument("--textwidth", action="store_true", help="do be rong chu Excel (AutoFit cot) de so voi textW cua trinh duyet")
args = ap.parse_args()
ROOT = os.path.abspath(args.root); XLSX = os.path.abspath(args.xlsx); OUT = os.path.abspath(args.outdir)
os.makedirs(OUT, exist_ok=True)
stem = os.path.splitext(os.path.basename(XLSX))[0]
geom_path = os.path.join(OUT, stem + ".geom.json")
HERE = os.path.dirname(os.path.abspath(__file__))
if not (args.reuse_excel and os.path.exists(geom_path)):
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", os.path.join(HERE, "_excel_geometry.ps1"), "-File", XLSX, "-Out", geom_path,
           "-MaxSheets", str(args.max_sheets), "-MaxRows", str(args.max_rows), "-MaxCols", str(args.max_cols)]
    if args.lines: cmd.append("-Lines")
    if args.textwidth: cmd.append("-TextWidth")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1800)
    print("excel:", (r.stdout or "").strip()[-200:], (r.stderr or "").strip()[-400:], flush=True)
excel = json.load(open(geom_path, encoding="utf-8"))

# Thuoc tinh hang trong XLSX goc (ht/customHeight) de phan lop lech hang: custom (co ht + customHeight=1) / auto
import re as _re
sys.path.insert(0, ROOT)
from adapters.libreoffice.common.ooxml_zip_patch import _resolve_xlsx_sheet_entries, read_zip_entry
_xlsx_bytes = open(XLSX, "rb").read()
XLSX_ROWS = {}
for _name, _entry in _resolve_xlsx_sheet_entries(_xlsx_bytes).items():
    _xml = (read_zip_entry(_xlsx_bytes, _entry) or b"").decode("utf-8", "replace")
    _rows = {}
    for _m in _re.finditer(r"<row\b([^>]*)>", _xml):
        _a = _m.group(1); _r = _re.search(r'\br="(\d+)"', _a); _h = _re.search(r'\bht="([\d.]+)"', _a)
        if _r: _rows[int(_r.group(1))] = {"ht": float(_h.group(1)) if _h else None, "custom": bool(_re.search(r'customHeight="(1|true)"', _a))}
    _d = _re.search(r'defaultRowHeight="([\d.]+)"', _xml)
    XLSX_ROWS[_name] = {"rows": _rows, "default": float(_d.group(1)) if _d else None}

sys.path.insert(0, ROOT)
import webview
import main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([XLSX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Sheet - Geometry", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1600, height=1000, js_api=api)

JS_SHEET = r"""
(function(sheetName, maxRows, maxCols, coords){
  const app = window.__vnoAppInstance; if (!app || !app.grid) return JSON.stringify({error:'no-app'});
  const grid = app.grid;
  if (grid.activeSheet !== sheetName) { try { grid.switchSheet(sheetName); } catch (e) { return JSON.stringify({error:'switch:'+e}); } }
  return 'switched';
})
"""
JS_MEASURE = r"""
(function(maxRows, maxCols, coords){
  const app = window.__vnoAppInstance; const grid = app.grid;
  const colName = i => { let s=''; while (i>0) { const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=(i-m-1)/26; } return s; };
  const colPx = [], rowPx = [];
  const hiddenCols = grid._userHiddenCols ? grid._userHiddenCols() : new Set();
  for (let c=1;c<=maxCols;c++) { const w = grid.getColumnWidth ? grid.getColumnWidth(colName(c)) : null; const th = document.querySelector('th[data-col="'+colName(c)+'"]'); colPx.push(hiddenCols.has(colName(c)) ? 0 : (th ? Math.round(th.getBoundingClientRect().width*100)/100 : (w==null?null:w))); }
  const hiddenRows = grid._userHiddenRows ? grid._userHiddenRows() : new Set();
  for (let r=1;r<=maxRows;r++) { const h = grid.getRowHeight ? grid.getRowHeight(r) : null; rowPx.push(hiddenRows.has(r) ? 0 : (h==null?null:h)); }
  const cells = {};
  const parsed = coords.map(c => { const m = c.match(/^([A-Z]+)(\d+)$/); return m ? {coord:c, col:m[1], row:Number(m[2])} : null; }).filter(Boolean).sort((a,b)=>a.row-b.row);
  let winStart = grid.currentStartRow || 1, winEnd = grid.currentEndRow || 40;
  for (const p of parsed) {
    if (p.row < winStart || p.row > winEnd) { winStart = Math.max(1, p.row - 2); winEnd = winStart + 39; try { grid._renderVirtualRows(winStart, winEnd); } catch(e) {} }
    const coord = p.coord;
    let td = document.querySelector('.vno-grid-cell[data-col="'+p.col+'"][data-row="'+p.row+'"]');
    if (!td) { cells[coord] = {missing:true}; continue; }
    const cs = getComputedStyle(td); const r = td.getBoundingClientRect();
    const text = td.textContent || '';
    const span = document.createElement('span'); span.style.cssText = 'position:absolute;white-space:pre;visibility:hidden;font:'+cs.font+';letter-spacing:'+cs.letterSpacing; span.textContent = text; document.body.appendChild(span);
    const textW = span.getBoundingClientRect().width; span.remove();
    const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize)*1.2);
    // Chi lay rect cua text node (bo qua div tay cam di chuyen o dang chon .vno-cell-move-handle)
    const tops = [];
    const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
    let node; while ((node = walker.nextNode())) { if (!node.nodeValue || !node.nodeValue.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(node); for (const rc of rg.getClientRects()) { if (rc.width > 0) tops.push(rc.top); } }
    // Dem dong: gom cac rect co top gan nhau (span richText cung dong co top lech vai px)
    tops.sort((a,b)=>a-b); let nLines = 0, last = -1e9;
    for (const t of tops) { if (t - last > lh * 0.6) { nLines++; last = t; } }
    cells[coord] = { w: Math.round(r.width*100)/100, h: Math.round(r.height*100)/100, ws: cs.whiteSpace, font: cs.fontFamily, size: cs.fontSize, bold: cs.fontWeight, textW: Math.round(textW*100)/100,
      lines: nLines, lh: Math.round(lh*100)/100, padL: cs.paddingLeft, padR: cs.paddingRight, scrollH: td.scrollHeight, clientH: td.clientHeight, overflow: cs.overflow, cls: td.className, text: text.slice(0,60) };
  }
  return JSON.stringify({ active: grid.activeSheet, colPx, rowPx, cells });
})
"""

def after_load(win):
    for _ in range(300):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem[:6] in name: break
    time.sleep(6)
    result = {"file": excel["file"], "sheets": []}
    for sh in excel["sheets"]:
        coords = [c["coord"] for c in sh["cells"]]
        sw = win.evaluate_js("(%s)(%s)" % (JS_SHEET.strip(), json.dumps(sh["name"])))
        time.sleep(4)
        raw = win.evaluate_js("(%s)(%d,%d,%s)" % (JS_MEASURE.strip(), sh["rows"], sh["cols"], json.dumps(coords)))
        try: app = json.loads(raw) if isinstance(raw, str) else raw
        except Exception: app = {"error": str(raw)[:300]}
        result["sheets"].append({"excel": sh, "app": app, "switch": sw})
    json.dump(result, open(os.path.join(OUT, stem + ".geomcmp.json"), "w", encoding="utf-8"), ensure_ascii=False)
    report(result)
    win.destroy()

def report(result):
    lines = ["# Geometry %s" % result["file"]]
    tot = {"col": 0, "row": 0, "lines": 0, "fit": 0}
    for s in result["sheets"]:
        ex, ap_ = s["excel"], s["app"]
        if "error" in ap_ or ap_.get("active") != ex["name"]:
            lines.append("## s%d: app error %s / active=%s" % (ex["index"], ap_.get("error"), ap_.get("active"))); continue
        cd = [(i+1, e, a) for i, (e, a) in enumerate(zip(ex["colPx"], ap_["colPx"])) if a is None or abs(e - a) > 1]
        xr = XLSX_ROWS.get(ex["name"], {"rows": {}, "default": None})
        def rtag(i):
            info = xr["rows"].get(i)
            if info is None: return "norow(default %s)" % xr["default"]
            return ("custom" if info["custom"] else "auto") + " ht=%s" % info["ht"]
        rd = [(i+1, e, a, rtag(i+1)) for i, (e, a) in enumerate(zip(ex["rowPx"], ap_["rowPx"])) if a is None or abs(e - a) > 1]
        rcls = {}
        for x in rd: rcls[x[3].split(" ")[0]] = rcls.get(x[3].split(" ")[0], 0) + 1
        ld = []; fd = []
        for c in ex["cells"]:
            a = ap_["cells"].get(c["coord"]) or {}
            if a.get("missing"): continue
            if c.get("wrap") and "lines" in c and a.get("lines") is not None and abs(c["lines"] - a["lines"]) >= 1:
                ld.append((c["coord"], c["lines"], a["lines"], c["text"][:30]))
            if not c.get("wrap") and a.get("lines", 1) > 1:
                fd.append((c["coord"], "wrapped-but-nowrap", a["lines"], c["text"][:30]))
        # Be rong chu: Excel AutoFit px (co le) vs textW trinh duyet -> ti le, de tim lop "chu Excel rong hon"
        tw = []
        for c in ex["cells"]:
            a = ap_["cells"].get(c["coord"]) or {}
            if c.get("autoFitPx") and a.get("textW") and (a.get("text") or "")[:60] == c["text"][:60]:
                tw.append((c["coord"], c["autoFitPx"], a["textW"], c["font"], c["size"], c["bold"], c["text"][:25]))
        twl = []
        if tw:
            ratios = sorted((x[1] - 7) / x[2] for x in tw if x[2] > 20)
            if ratios:
                med = ratios[len(ratios) // 2]
                twl.append("  textwidth n=%d ratio(excel-7)/browser median %.3f min %.3f max %.3f" % (len(ratios), med, ratios[0], ratios[-1]))
                for x in sorted(tw, key=lambda x: -abs((x[1] - 7) / max(x[2], 1) - 1))[:6]:
                    twl.append("    %s excel %.1f browser %.1f %s %s b=%s | %r" % x)
                byfont = {}
                for x in tw:
                    if x[2] > 20: byfont.setdefault((x[3], x[4], x[5]), []).append((x[1] - 7) / x[2])
                for key, vals in sorted(byfont.items(), key=lambda kv: -len(kv[1])):
                    vals.sort(); twl.append("    font %s %s b=%s n=%d median %.3f" % (key[0], key[1], key[2], len(vals), vals[len(vals) // 2]))
        tot["col"] += len(cd); tot["row"] += len(rd); tot["lines"] += len(ld); tot["fit"] += len(fd)
        lines.append("## s%d: col %d/%d, row %d/%d %s, lines %d, fit %d" % (ex["index"], len(cd), len(ex["colPx"]), len(rd), len(ex["rowPx"]), rcls, len(ld), len(fd)))
        lines.extend(twl)
        for x in cd[:12]: lines.append("  col %s excel %.2f app %s" % x)
        for x in rd[:12]: lines.append("  row %s excel %.2f app %s [%s]" % x)
        for x in ld[:12]: lines.append("  lines %s excel %s app %s | %r" % x)
        for x in fd[:12]: lines.append("  fit %s %s app %s | %r" % x)
    lines.append("TOTAL col %(col)d row %(row)d lines %(lines)d fit %(fit)d" % tot)
    txt = "\n".join(lines)
    print(txt, flush=True)
    open(os.path.join(OUT, stem + ".geom.md"), "w", encoding="utf-8").write(txt)

webview.start(after_load, window, debug=False)
