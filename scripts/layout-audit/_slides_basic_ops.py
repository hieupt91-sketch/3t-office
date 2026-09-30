"""G8 VN Slides basics audit harness (D1, D3-D8 of docs/BASELINE-CHECKLIST.md).

Usage:
  python _slides_basic_ops.py <worktree> <out-dir> [--real <file.pptx> ...] [--only ops|real]

Drives the REAL app (main.py static server + VnOfficeApi + pywebview window, like
_batch_writer.py) through keyboard events / ribbon command bus / dialogs, saves .pptx /
.ppt / .pdf through the real Save As path (native dialog replaced by a fixed path), then
verifies every saved file with PowerPoint 2016 COM (_pptx_readback.ps1).
Real files: opens each in the app (Explorer-style launch), records slide count + titles,
saves back to .pptx, and compares both with PowerPoint.
Writes <out-dir>/_slides_basic_ops_report.md and _slides_basic_ops.json.
Set LOCALAPPDATA to an isolated profile dir before running (soffice / WebView2 profile).
"""
import os, sys, json, re, subprocess, time

ROOT = os.path.abspath(sys.argv[1])
OUTDIR = os.path.abspath(sys.argv[2])
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)
args = sys.argv[3:]
REAL = []
ONLY = None
i = 0
while i < len(args):
    if args[i] == "--real":
        i += 1
        while i < len(args) and not args[i].startswith("--"):
            REAL.append(os.path.abspath(args[i])); i += 1
        continue
    if args[i] == "--only":
        ONLY = args[i + 1]; i += 2; continue
    i += 1

# ---------------------------------------------------------------- probe (runs inside pywebview)
PROBE = r'''
import sys, time, os, json
ROOT, OUTDIR, MODE = sys.argv[1], sys.argv[2], sys.argv[3]
REALFILE = sys.argv[4] if len(sys.argv) > 4 else None
sys.path.insert(0, ROOT)
import webview, main as vnmain
server, port = vnmain._start_static_server()
if REALFILE:
    app_kind, initial_file = vnmain.parse_launch_args([REALFILE])
else:
    app_kind, initial_file = "slides", None
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Slides - G8 audit", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1500, height=950, js_api=api)
TARGET = [None]
HELPERS = open(os.environ["VNO_SLIDES_HELPERS"], encoding="utf-8").read()

def run_async(win, code, timeout=60):
    win.evaluate_js("window.__r = undefined; window.__rerr = undefined; (async () => {" + code + "})().then(v => { window.__r = JSON.stringify(v === undefined ? null : v); }).catch(e => { window.__rerr = String(e && e.stack || e); }); 1")
    end = time.time() + timeout
    while time.time() < end:
        time.sleep(0.3)
        r = win.evaluate_js("window.__r === undefined ? null : window.__r")
        if r is not None:
            return json.loads(r)
        err = win.evaluate_js("window.__rerr || null")
        if err:
            return {"error": err}
    return {"error": "timeout"}

def dismiss(win):
    win.evaluate_js("document.querySelectorAll('.vno-dialog-overlay button, [role=dialog] button').forEach(b => { if (/^(Đồng ý|OK|Đóng)$/i.test(b.textContent.trim())) b.click(); }); 1")

def save(win, path, command="common.file.saveAs", timeout=150):
    TARGET[0] = path
    if os.path.exists(path):
        os.remove(path)
    win.evaluate_js("window.__saveErr = ''; window.__saveRes = null; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('" + command + "')).then(r => { window.__saveRes = String(r); }).catch(e => { window.__saveErr = String(e && e.stack || e); }); 1")
    end = time.time() + timeout
    last = -1
    while time.time() < end:
        time.sleep(1)
        err = win.evaluate_js("window.__saveErr")
        if err:
            return {"ok": False, "error": err}
        if os.path.exists(path):
            size = os.path.getsize(path)
            if size > 0 and size == last:
                break
            last = size
    time.sleep(1)
    alert = win.evaluate_js("Array.from(document.querySelectorAll('.vno-dialog-overlay, [role=alertdialog], [role=dialog]')).map(e => e.textContent.replace(/\\s+/g,' ').trim().slice(0,160)).join(' | ')")
    dismiss(win)
    time.sleep(0.5)
    return {"ok": os.path.exists(path) and os.path.getsize(path) > 0, "path": path, "alert": alert}

def after_load(win):
    win.create_file_dialog = lambda *a, **k: TARGET[0]
    for _ in range(120):
        time.sleep(1)
        if win.evaluate_js("!!(window.__vnoAppInstance && window.__vnoAppInstance.canvasController && window.__vnoAppInstance.adapter)"):
            break
    win.evaluate_js(HELPERS + "; 1")
    out = {}
    if REALFILE:
        stem = os.path.splitext(os.path.basename(REALFILE))[0][:6]
        loaded = False
        for _ in range(240):
            time.sleep(1)
            name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
            if stem in name:
                loaded = True
                break
        time.sleep(2)
        out["loaded"] = loaded
        out["model"] = run_async(win, "return window.__t.modelSummary();")
        rt = os.path.join(OUTDIR, "_rt_" + os.path.splitext(os.path.basename(REALFILE))[0] + ".pptx")
        out["save"] = save(win, rt)
    else:
        scenarios = json.loads(MODE)
        for sc in scenarios:
            res = run_async(win, "return await window.__t.scenario(" + json.dumps(sc["name"]) + ");", timeout=180)
            saves = []
            for fmt in sc.get("formats", ["pptx"]):
                path = os.path.join(OUTDIR, sc["name"] + "." + fmt)
                cmd = "common.file.exportPdf" if fmt == "pdf" else "common.file.saveAs"
                saves.append(save(win, path, cmd))
            post = run_async(win, "return await window.__t.post(" + json.dumps(sc["name"]) + ");", timeout=120)
            out[sc["name"]] = {"obs": res, "saves": saves, "post": post}
    print("RESULT " + json.dumps(out, ensure_ascii=False), flush=True)
    time.sleep(0.5)
    win.destroy()

webview.start(after_load, window, debug=False)
'''

SCENARIOS = [
    {"name": "d1_deck", "formats": ["pptx", "pdf", "ppt"]},
    {"name": "d3_text", "formats": ["pptx"]},
    {"name": "d4_objects", "formats": ["pptx"]},
    {"name": "d5_design", "formats": ["pptx"]},
    {"name": "d6_show", "formats": ["pptx"]},
]


def run_probe(mode, real=None, timeout=1500):
    probe_path = os.path.join(OUTDIR, "_slides_ops_probe_run.py")
    with open(probe_path, "w", encoding="utf-8") as f:
        f.write(PROBE)
    cmd = [sys.executable, probe_path, ROOT, OUTDIR, mode] + ([real] if real else [])
    env = dict(os.environ, VNO_SLIDES_HELPERS=os.path.join(SP, "_slides_ops_helpers.js"))
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, timeout=timeout, encoding="utf-8", errors="replace", env=env)
    m = re.search(r"RESULT (\{.*\})", r.stdout or "")
    if not m:
        return {"error": ((r.stderr or "") + (r.stdout or ""))[-1500:]}
    return json.loads(m.group(1))


def pp_readback(paths):
    listfile = os.path.join(OUTDIR, "_pp_list.txt")
    out = os.path.join(OUTDIR, "_pp_readback.json")
    with open(listfile, "w", encoding="utf-8") as f:
        f.write("\n".join(paths))
    if os.path.exists(out):
        os.remove(out)
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", os.path.join(SP, "_pptx_readback.ps1"),
                    "-ListFile", listfile, "-Out", out], capture_output=True, text=True, timeout=900)
    if not os.path.exists(out):
        return {}
    data = json.load(open(out, encoding="utf-8-sig"))
    if isinstance(data, dict):
        data = [data]
    return {os.path.normcase(d["file"]): d for d in data}


def pdf_pages(path):
    try:
        raw = open(path, "rb").read().decode("latin-1")
        return len(re.findall(r"/Type\s*/Page[^s]", raw))
    except Exception:
        return None


def ppt_kind(path):
    try:
        head = open(path, "rb").read(8)
    except Exception:
        return "missing"
    if head.startswith(b"\xd0\xcf\x11\xe0"):
        return "ole2(ppt)"
    if head.startswith(b"PK"):
        return "zip(pptx)"
    return "unknown"


def title_of(slide):
    for s in slide.get("shapes", []):
        if s.get("placeholder") in (1, 3):
            return (s.get("text") or "").strip()
    return ""


def shape_texts(slide):
    return [(s.get("text") or "").strip() for s in slide.get("shapes", []) if (s.get("text") or "").strip()]


rows = []   # (item, check, powerpoint expectation, vn result, status)

def check(item, what, expected, actual, ok=None):
    if ok is None:
        ok = expected == actual
    rows.append((item, what, str(expected), str(actual), "PASS" if ok else "FAIL"))


def evaluate_ops(res, pp):
    def rb(name, fmt="pptx"):
        return pp.get(os.path.normcase(os.path.join(OUTDIR, name + "." + fmt)), {})

    # ---- D1 + D7 + D8
    d1 = res.get("d1_deck", {})
    o = d1.get("obs") or {}
    check("D1", "Ctrl+M adds a slide (count 1->2)", 2, o.get("afterCtrlM"))
    check("D1", "Ctrl+M on slide 1 of 4 inserts at position 2", 1, o.get("insertIndexFromFirst"))
    check("D1", "new slide placeholders are empty (no prompt text as content)", "''/''", o.get("newSlideText"))
    check("D1", "Delete slide (Delete key in thumbnail pane)", 4, o.get("afterDelete"))
    check("D1", "Duplicate slide keeps identical title", "Doanh thu", o.get("dupTitle"))
    check("D1", "drag thumbnail 5 -> 2 reorders", "Báo cáo quý 3|Trống|Doanh thu|Doanh thu|Hai cột", o.get("orderAfterDrag"))
    check("D1", "layout dialog applies Two Content", "two-content", o.get("layoutTwo"))
    check("D1", "Two Content right column is empty (no prompt text)", "", o.get("body2AfterLayout"))
    p = rb("d1_deck")
    titles = [title_of(s) for s in p.get("slides", [])]
    check("D8", "pptx: PowerPoint slide count", 5, p.get("slideCount"))
    check("D8", "pptx: PowerPoint title texts in order", ["Báo cáo quý 3", "", "Doanh thu", "Doanh thu", "Hai cột"], titles)
    notes = [(s.get("notes") or "").strip() for s in p.get("slides", [])]
    check("D7", "speaker notes saved (slide 3 and its duplicate)", ["", "", "Ghi chú dòng 1\nGhi chú dòng 2", "Ghi chú dòng 1\nGhi chú dòng 2", ""], notes)
    counts = [len(s.get("shapes", [])) for s in p.get("slides", [])]
    check("D8", "pptx: shape count per slide", [1, 2, 2, 2, 3], counts)
    # WYSIWYG: title/body text formatting PowerPoint shows == what the VN editor displays.
    tc, bc = o.get("titleCss") or {}, o.get("bodyCss") or {}
    s3 = (p.get("slides") or [{}] * 3)[2] if len(p.get("slides") or []) > 2 else {}
    t3 = next((s for s in s3.get("shapes", []) if s.get("placeholder") in (1, 3)), {})
    b3 = next((s for s in s3.get("shapes", []) if s.get("placeholder") not in (1, 3, None)), {})
    def css_rgb_hex(v):
        m = re.match(r"rgba?\((\d+),\s*(\d+),\s*(\d+)", v or "")
        return "#%02X%02X%02X" % tuple(int(x) for x in m.groups()) if m else v
    def first_family(v):
        return (v or "").split(",")[0].strip().strip("'\"")
    vn_t = f"{first_family(tc.get('family'))}/{round((tc.get('sizePx') or 0) * 0.75)}pt/{'bold' if int(tc.get('weight') or 400) >= 600 else 'normal'}/{css_rgb_hex(tc.get('color'))}/{tc.get('align')}"
    pp_t = f"{t3.get('font')}/{round(t3.get('size') or 0)}pt/{'bold' if t3.get('bold') == -1 else 'normal'}/{t3.get('color')}/{ {1: 'left', 2: 'center', 3: 'right'}.get(t3.get('align'), t3.get('align')) }"
    check("D3", "title formatting in PowerPoint == VN editor (font/size/bold/color/align)", vn_t.replace("start", "left"), pp_t)
    vn_b = f"{first_family(bc.get('family'))}/{round((bc.get('sizePx') or 0) * 0.75)}pt/{css_rgb_hex(bc.get('color'))}"
    pp_b = f"{b3.get('font')}/{round(b3.get('size') or 0)}pt/{b3.get('color')}"
    check("D3", "body formatting in PowerPoint == VN editor (font/size/color)", vn_b, pp_b)
    body_texts = [shape_texts(s) for s in p.get("slides", [])]
    check("D8", "pptx: slide 5 two-column texts", ["Hai cột", "Cột trái", "Cột phải"], body_texts[4] if len(body_texts) > 4 else None)
    check("D8", "pptx: blank slide has rectangle + text box 'Hộp chữ'", True,
          len(body_texts) > 1 and "Hộp chữ" in body_texts[1])
    pdf = os.path.join(OUTDIR, "d1_deck.pdf")
    check("D8", "pdf export: page count", 5, pdf_pages(pdf) if os.path.exists(pdf) else "no file")
    pptf = os.path.join(OUTDIR, "d1_deck.ppt")
    check("D8", "ppt save: real PowerPoint 97-2003 binary", "ole2(ppt)", ppt_kind(pptf))
    q = rb("d1_deck", "ppt")
    check("D8", "ppt: PowerPoint opens, slide count", 5, q.get("slideCount"))

    # ---- D3
    d3 = res.get("d3_text", {})
    o = d3.get("obs") or {}
    check("D3", "Text Box command inserts a text box object (not text in body)", True, o.get("textboxInserted"))
    p = rb("d3_text")
    sl = (p.get("slides") or [{}])[0]
    shapes = sl.get("shapes", [])
    def find(txt):
        for s in shapes:
            if txt in (s.get("text") or ""):
                return s
        return {}
    t = find("Tiêu đề định dạng")
    check("D3", "title font Arial", "Arial", t.get("font"))
    check("D3", "title size 32", 32.0, t.get("size"), ok=(t.get("size") is not None and abs(float(t.get("size")) - 32) < 0.6))
    check("D3", "title color red #FF0000", "#FF0000", t.get("color"))
    check("D3", "title centered (ppAlignCenter=2)", 2, t.get("align"))
    check("D3", "title has no stray highlight/background (no fill)", None, t.get("fill"))
    b = find("Mục một")
    paras = b.get("paragraphs") or []
    check("D3", "body bullets (ppBulletUnnumbered=1)", [1, 1], [x.get("bullet") for x in paras[:2]])
    check("D3", "body bold (Ctrl+B / Đậm) saved", (-1 if o.get("bodyBoldState") else 0), b.get("bold"))
    n = find("Bước một")
    paras = n.get("paragraphs") or []
    check("D3", "numbered list (ppBulletNumbered=2)", [2, 2], [x.get("bullet") for x in paras[:2]])
    tb = find("Hộp văn bản mới")
    check("D3", "text box saved as its own shape, right aligned (3)", 3, tb.get("align"))

    # ---- D4
    d4 = res.get("d4_objects", {})
    o = d4.get("obs") or {}
    p = rb("d4_objects")
    sl = (p.get("slides") or [{}])[0]
    shapes = sl.get("shapes", [])
    types = sorted(s.get("type") for s in shapes)
    check("D4", "image + shape + table saved (types picture 13, autoshape 1, table 19)", True,
          13 in types and 1 in types and (19 in types or any(s.get("table") for s in shapes)), ok=None)
    tbl = next((s for s in shapes if s.get("table")), {})
    check("D4", "table 2x3 with cell text", "2x3:A1", f"{(tbl.get('table') or {}).get('rows')}x{(tbl.get('table') or {}).get('cols')}:{((tbl.get('table') or {}).get('cells') or [''])[0]}")
    check("D4", "inserted table cells start empty (no 'Cột N' prompt text)", ["A1", "", "", "", "", ""], (tbl.get("table") or {}).get("cells"))
    rect = next((s for s in shapes if s.get("type") == 1), {})
    check("D4", "shape moved/resized: left=150pt top=120pt w=240pt h=90pt (±2)", "150/120/240/90",
          f"{rect.get('left')}/{rect.get('top')}/{rect.get('width')}/{rect.get('height')}",
          ok=all(abs((rect.get(k) or -999) - v) <= 2 for k, v in (("left", 150), ("top", 120), ("width", 240), ("height", 90))))
    check("D4", "shape rotated 30 deg", 30.0, rect.get("rotation"), ok=abs((rect.get("rotation") or 0) - 30) < 0.6)
    check("D4", "align left: image left == shape left (selection)", True, o.get("alignedLeft"))
    check("D4", "bring forward / send backward commands exist", True, o.get("zOrderCommands"))
    order = [s.get("type") for s in sorted(shapes, key=lambda s: s.get("z") or 0)]
    check("D4", "z-order after Send to Back on the shape: shape is bottom-most", 1, order[0] if order else None)

    # ---- D5
    d5 = res.get("d5_design", {})
    p = rb("d5_design")
    ratio = lambda d: round((d.get("slideWidth") or 0) / (d.get("slideHeight") or 1), 3)
    check("D5", "slide size 4:3 aspect ratio", 1.333, ratio(p))
    check("D5", "16:9 aspect ratio (d1_deck)", 1.778, ratio(rb("d1_deck")))
    check("D5", "physical size = PowerPoint 2016 presets (4:3 720x540pt, 16:9 960x540pt)", "720/540 + 960/540",
          f"{p.get('slideWidth')}/{p.get('slideHeight')} + {rb('d1_deck').get('slideWidth')}/{rb('d1_deck').get('slideHeight')}")
    sl = (p.get("slides") or [{}])[0]
    check("D5", "background color #FFF2CC on slide", "#FFF2CC", sl.get("bg"))
    s2 = (p.get("slides") or [{}, {}])[1] if len(p.get("slides") or []) > 1 else {}
    check("D1", "empty new slide saved with EMPTY title placeholder (no 'Trang chiếu N')", [], shape_texts(s2))

    # ---- D6
    d6 = res.get("d6_show", {})
    o = d6.get("obs") or {}
    check("D6", "F5 starts from slide 1 (while slide 3 selected)", 0, o.get("f5Index"))
    check("D6", "ArrowRight -> slide 2", 1, o.get("afterRight"))
    check("D6", "ArrowDown -> slide 3", 2, o.get("afterDown"))
    check("D6", "ArrowLeft -> slide 2", 1, o.get("afterLeft"))
    check("D6", "ArrowUp -> slide 1", 0, o.get("afterUp"))
    check("D6", "PageDown -> slide 2 (editor slide unchanged)", "1/2", o.get("afterPageDown"))
    check("D6", "Esc closes show", False, o.get("openAfterEsc"))
    check("D6", "Shift+F5 starts from current slide 3", 2, o.get("shiftF5Index"))
    check("D6", "no VN branding text on a user's slide show", "", o.get("brandingText"))
    p = rb("d6_show")
    tr = [s.get("transition") for s in p.get("slides", [])]
    check("D6", "fade transition saved on all slides (EntryEffect != 0)", True, bool(tr) and all(x for x in tr), ok=None)


def main():
    report = {"ops": None, "real": []}
    pp_paths = []
    if ONLY in (None, "ops"):
        res = run_probe(json.dumps(SCENARIOS))
        report["ops"] = res
        for sc in SCENARIOS:
            for fmt in sc["formats"]:
                if fmt in ("pptx", "ppt"):
                    pp_paths.append(os.path.join(OUTDIR, sc["name"] + "." + fmt))
    real_res = []
    if ONLY in (None, "real"):
        for f in REAL:
            r = run_probe("real", f)
            real_res.append((f, r))
            pp_paths.append(f)
            rt = os.path.join(OUTDIR, "_rt_" + os.path.splitext(os.path.basename(f))[0] + ".pptx")
            pp_paths.append(rt)
    pp = pp_readback([p for p in pp_paths if os.path.exists(p)])
    report["pp"] = pp
    if report["ops"] is not None:
        if "error" in report["ops"]:
            rows.append(("ALL", "probe", "runs", report["ops"]["error"][-300:], "FAIL"))
        else:
            evaluate_ops(report["ops"], pp)
    for f, r in real_res:
        name = os.path.basename(f)
        o = pp.get(os.path.normcase(f), {})
        rt = pp.get(os.path.normcase(os.path.join(OUTDIR, "_rt_" + os.path.splitext(name)[0] + ".pptx")), {})
        model = (r.get("model") or {}) if isinstance(r, dict) else {}
        pp_titles = [title_of(s) for s in o.get("slides", [])]
        vn_titles = model.get("titles") or []
        check("REAL " + name, "open: slide count", o.get("slideCount"), model.get("count"))
        norm = lambda xs: [re.sub(r"\s+", " ", x or "").strip() for x in xs]
        mism = [i + 1 for i, (a, b) in enumerate(zip(norm(pp_titles), norm(vn_titles))) if a != b]
        check("REAL " + name, "open: title text per slide (mismatching slides)", [], mism)
        check("REAL " + name, "save back pptx: PowerPoint slide count", o.get("slideCount"), rt.get("slideCount"))
        rt_titles = [title_of(s) for s in rt.get("slides", [])]
        rt_all = [" ".join(norm(shape_texts(s))) for s in rt.get("slides", [])]
        mism2 = [i + 1 for i, (a, b) in enumerate(zip(norm(pp_titles), rt_all)) if a and a not in b]
        check("REAL " + name, "save back pptx: every original title text still on its slide (mismatching slides)", [], mism2)
        mism3 = [i + 1 for i, (a, b) in enumerate(zip(norm(pp_titles), norm(rt_titles))) if a != b]
        check("REAL " + name, "save back pptx: title stays in a TITLE placeholder (mismatching slides)", [], mism3)
        o_notes = [(s.get("notes") or "").strip() for s in o.get("slides", [])]
        r_notes = [(s.get("notes") or "").strip() for s in rt.get("slides", [])]
        check("REAL " + name, "save back pptx: speaker notes per slide (mismatching slides)", [],
              [i + 1 for i, (a, b) in enumerate(zip(o_notes, r_notes)) if re.sub(r"\s+", " ", a) != re.sub(r"\s+", " ", b)])
        o_cnt = [len(s.get("shapes", [])) for s in o.get("slides", [])]
        r_cnt = [len(s.get("shapes", [])) for s in rt.get("slides", [])]
        check("REAL " + name, "save back pptx: shape count per slide (slide:orig->saved for differences)", [],
              [f"{i + 1}:{a}->{b}" for i, (a, b) in enumerate(zip(o_cnt, r_cnt)) if a != b])
        report["real"].append({"file": f, "probe": r, "pp_titles": pp_titles, "vn_titles": vn_titles, "rt_titles": rt_titles})
    with open(os.path.join(OUTDIR, "_slides_basic_ops.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(OUTDIR, "_slides_basic_ops_report.md"), "w", encoding="utf-8") as fh:
        fh.write("| item | check | PowerPoint / expected | VN | status |\n|---|---|---|---|---|\n")
        for row in rows:
            fh.write("| " + " | ".join(str(x).replace("|", "/").replace("\n", "\\n") for x in row) + " |\n")
    npass = sum(1 for r in rows if r[4] == "PASS")
    print(f"{npass}/{len(rows)} PASS")
    for row in rows:
        if row[4] != "PASS":
            print("FAIL", row[0], row[1], "| expected:", row[2][:120], "| got:", row[3][:200])
    print("report:", os.path.join(OUTDIR, "_slides_basic_ops_report.md"))


if __name__ == "__main__":
    main()
