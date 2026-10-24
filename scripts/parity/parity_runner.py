#!/usr/bin/env python3
"""Harness parity G0 (phần chạy OFFLINE): Open → Edit → Save → Reopen → Export qua `ooxml-engine`,
rồi structural diff (ZIP + XML chuẩn hóa bằng expat) và ghi kết quả JSON.

  python3 -I scripts/parity/parity_runner.py <tệp.docx|xlsx|pptx> [--engine PATH] [--manifest PATH] [--out DIR] [--json FILE]
  python3 -I scripts/parity/parity_runner.py --selftest      # tự kiểm harness bằng động cơ GIẢ (KHÔNG phải OOXMLKit)

Trạng thái (AGENTS.md §8): PASS / FAIL / NOT RUN / BLOCKED. Không có engine → các bước engine = BLOCKED
(KHÔNG bịa PASS). Các plugin oracle cần Office/LibreOffice/thiết bị: xem parity_plugins.py (luôn BLOCKED/NOT RUN).
Mã thoát: 0 = không có FAIL và không BLOCKED ở phần tự động; 1 = có FAIL; 2 = có BLOCKED (vd. thiếu engine).
"""
import base64, fnmatch, glob, hashlib, io, json, os, posixpath, subprocess, sys, tempfile, zipfile
import xml.parsers.expat as expat

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MARKER = "Parity edit — Tiếng Việt ✓ ắếơưđ"

# ---------------------------------------------------------------- ZIP / XML
def is_xmlish(name): return name.endswith((".xml", ".rels", ".vml"))

def canon_xml(data):
    """Chuỗi chuẩn hóa: tên phần tử theo namespace URI, thuộc tính sắp xếp, bỏ khai báo xmlns/prefix,
    bỏ text chỉ-khoảng-trắng giữa phần tử. Ném expat.ExpatError nếu không well-formed."""
    out = []
    p = expat.ParserCreate(namespace_separator="|")
    p.buffer_text = True
    def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")
    p.StartElementHandler = lambda n, a: out.append("<" + n + "".join(f' {k}="{esc(v)}"' for k, v in sorted(a.items())) + ">")
    p.EndElementHandler = lambda n: out.append("</" + n + ">")
    p.CharacterDataHandler = lambda t: out.append(esc(t)) if t.strip() else None
    p.Parse(data, True)
    return "".join(out)

def read_zip(path_or_bytes):
    zf = zipfile.ZipFile(io.BytesIO(path_or_bytes) if isinstance(path_or_bytes, bytes) else path_or_bytes)
    bad = zf.testzip()  # kiểm CRC
    parts = {i.filename: zf.read(i.filename) for i in zf.infolist() if not i.filename.endswith("/")}
    return parts, bad

def integrity(parts, crc_bad):
    """Kiểm cấu trúc độc lập OOXMLKit: CRC, XML well-formed, quan hệ nội bộ trỏ tới phần có thật, Content_Types."""
    errs = []
    if crc_bad: errs.append(f"CRC hỏng ở {crc_bad}")
    if "[Content_Types].xml" not in parts: errs.append("thiếu [Content_Types].xml")
    for n, d in parts.items():
        if is_xmlish(n):
            try: canon_xml(d)
            except expat.ExpatError as e: errs.append(f"XML hỏng {n}: {e}")
    for n, d in parts.items():
        if not n.endswith(".rels"): continue
        base = posixpath.dirname(posixpath.dirname(n))
        try:
            rels = []
            p = expat.ParserCreate()
            p.StartElementHandler = lambda t, a: rels.append(a) if t.endswith("Relationship") else None
            p.Parse(d, True)
        except expat.ExpatError: continue
        for a in rels:
            if a.get("TargetMode") == "External": continue
            t = a.get("Target", "")
            tgt = t.lstrip("/") if t.startswith("/") else posixpath.normpath(posixpath.join(base, t))
            if tgt not in parts: errs.append(f"{n}: quan hệ {a.get('Id')} → {tgt} không tồn tại")
    return errs

def diff_parts(a, b, expect_changed=()):
    """So bản a (gốc) với b. Trả dict các nhóm + đánh giá theo expect_changed (glob)."""
    res = {"removed": sorted(set(a) - set(b)), "added": sorted(set(b) - set(a)),
           "byte_identical": 0, "canonical_equal_only": [], "changed": []}
    for n in sorted(set(a) & set(b)):
        if a[n] == b[n]: res["byte_identical"] += 1; continue
        try: same = is_xmlish(n) and canon_xml(a[n]) == canon_xml(b[n])
        except expat.ExpatError: same = False
        (res["canonical_equal_only"] if same else res["changed"]).append(n)
    # Khớp CHÍNH XÁC trước (vd. "[Content_Types].xml" có dấu [] là char-class của fnmatch → phải so literal),
    # rồi mới tới glob ("xl/worksheets/*.xml").
    res["unexpected_changed"] = [n for n in res["changed"] if not any(n == g or fnmatch.fnmatch(n, g) for g in expect_changed)]
    return res

def diff_ok(d): return not d["removed"] and not d["unexpected_changed"]

# ---------------------------------------------------------------- Engine
class EngineError(Exception): pass

class Engine:
    def __init__(self, exe, env=None):
        self.p = subprocess.Popen([exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8",
                                  env=env, stderr=subprocess.DEVNULL)
        self.n = 0
    def call(self, op, **args):
        self.n += 1
        self.p.stdin.write(json.dumps({"id": self.n, "op": op, "args": args}) + "\n"); self.p.stdin.flush()
        line = self.p.stdout.readline()
        if not line: raise EngineError(f"engine đóng đột ngột ở op={op}")
        r = json.loads(line)
        if not r.get("ok"): raise EngineError(f"{op}: {r.get('error')}")
        return r["result"]
    def close(self):
        try: self.p.stdin.close(); self.p.wait(timeout=10)
        except Exception: self.p.kill()

def find_engine(cli):
    for c in [cli, os.environ.get("OOXML_ENGINE")]:
        if c: return c if os.path.isfile(c) else None
    for pat in ("debug", "release"):
        for g in glob.glob(os.path.join(ROOT, "ports/ios/OOXMLKit/.build", "*", pat, "ooxml-engine")): return g
    return None

# ---------------------------------------------------------------- Chuỗi bước
def stage(name, fn):
    try:
        r = fn(); r = r if isinstance(r, dict) else {"detail": r}
        return {"name": name, "status": r.pop("status", "PASS"), **r}
    except EngineError as e: return {"name": name, "status": "FAIL", "error": str(e)}
    except Exception as e: return {"name": name, "status": "FAIL", "error": f"{type(e).__name__}: {e}"}

def edit_and_verify(eng, h, fmt):
    """Thực hiện 1 sửa đổi rồi ĐỌC LẠI qua engine để chắc nó có hiệu lực trước khi lưu."""
    if fmt == "docx":
        eng.call("doc.appendParagraph", handle=h, text=MARKER)
        return lambda e, hh: any(p["text"] == MARKER for p in e.call("doc.read", handle=hh)["paragraphs"])
    if fmt == "xlsx":
        eng.call("sheet.setValue", handle=h, ref="Z99", value={"t": "s", "v": MARKER})
        return lambda e, hh: any(c["value"].get("v") == MARKER for c in e.call("sheet.read", handle=hh, range="Z99:Z99")["cells"])
    eng.call("slide.setNotes", handle=h, index=0, text=MARKER)
    return lambda e, hh: e.call("slide.read", handle=hh, index=0).get("notes") == MARKER

def run_file(path, fmt, engine_exe, outdir, expect_changed, label="", known_issues=()):
    os.makedirs(outdir, exist_ok=True)
    src = open(path, "rb").read()
    rec = {"file": path, "format": fmt, "sha256": hashlib.sha256(src).hexdigest(), "engine": label or engine_exe,
           "scope": "automatic-offline-stages", "stages": []}
    st = rec["stages"]
    src_parts, crc = read_zip(src)
    errs = integrity(src_parts, crc)
    new = [e for e in errs if e not in known_issues]
    st.append({"name": "source_integrity", "status": "FAIL" if new else "PASS", "errors": errs, "known_source_issues": [e for e in errs if e in known_issues],
               "note": "Nếu FAIL ở tệp nguồn: lỗi CÓ SẴN, không phải do OOXMLKit (AGENTS.md OOXMLKit §3.2)."})
    if not engine_exe:
        for n in ("open", "noop_roundtrip", "edit_save", "reopen", "export"):
            st.append({"name": n, "status": "BLOCKED", "reason": "không tìm thấy binary ooxml-engine (cần `swift build` — Swift 6 không có trong môi trường này)."})
        return rec
    ctx = {}
    eng = Engine(engine_exe)
    try:
        def s_open():
            ctx["info0"] = eng.call("open", path=path); ctx["h0"] = ctx["info0"]["handle"]; return {"info": ctx["info0"]}
        st.append(stage("open", s_open))
        if st[-1]["status"] != "PASS":
            for n in ("noop_roundtrip", "edit_save", "reopen", "export"): st.append({"name": n, "status": "NOT RUN", "reason": "open thất bại"})
            return rec
        def s_noop():
            p = os.path.join(outdir, "noop-" + os.path.basename(path)); eng.call("save", handle=ctx["h0"], path=p)
            out, crc_ = read_zip(p); d = diff_parts(src_parts, out, ())
            e = integrity(out, crc_)
            return {"status": "PASS" if diff_ok(d) and not e else "FAIL", "diff": d, "output_integrity": e, "output": p}
        st.append(stage("noop_roundtrip", s_noop))
        def s_edit():
            h = eng.call("open", path=path)["handle"]; ctx["h1"] = h
            verify = edit_and_verify(eng, h, fmt); ctx["verify"] = verify
            if not verify(eng, h): return {"status": "FAIL", "error": "sửa đổi không đọc lại được trong cùng phiên"}
            p = os.path.join(outdir, "edit-" + os.path.basename(path)); eng.call("save", handle=h, path=p); ctx["saved"] = p
            out, crc_ = read_zip(p); d = diff_parts(src_parts, out, expect_changed); e = integrity(out, crc_)
            ctx["saved_parts"] = out
            return {"status": "PASS" if diff_ok(d) and not e else "FAIL", "diff": d, "output_integrity": e, "output": p, "expect_changed": list(expect_changed)}
        st.append(stage("edit_save", s_edit))
        def s_reopen():
            if "saved" not in ctx: return {"status": "NOT RUN", "reason": "chưa có tệp đã lưu"}
            i = eng.call("open", path=ctx["saved"]); ctx["h2"] = i["handle"]
            same = {k: v for k, v in i.items() if k != "handle"} == {k: v for k, v in ctx["info0"].items() if k != "handle"}
            vis = ctx["verify"](eng, i["handle"])
            # Khác biệt info trước/sau CHỈ chấp nhận được nếu do chính sửa đổi (docx thêm 1 đoạn) → báo, không tự nhận PASS cho phần khác.
            return {"status": "PASS" if vis else "FAIL", "info_equal_to_original": same, "info": i, "edit_visible_after_reopen": vis}
        st.append(stage("reopen", s_reopen))
        def s_export():
            if "h2" not in ctx: return {"status": "NOT RUN", "reason": "chưa mở lại được"}
            b = base64.b64decode(eng.call("exportBytes", handle=ctx["h2"])["base64"])
            p = os.path.join(outdir, "export-" + os.path.basename(path)); open(p, "wb").write(b)
            out, crc_ = read_zip(b); d = diff_parts(ctx["saved_parts"], out, ())
            e = integrity(out, crc_)
            return {"status": "PASS" if diff_ok(d) and not e else "FAIL", "diff_vs_saved": d, "output_integrity": e, "output": p}
        st.append(stage("export", s_export))
    finally:
        eng.close()
    return rec

def attach_plugins(rec, entry):
    import parity_plugins
    outs = {}
    for st in rec["stages"]:
        if st["name"] == "edit_save" and st.get("output") and st["status"] == "PASS": outs["edit"] = st["output"]
    ctx = {"file": rec["file"], "format": rec["format"], "entry": entry, "outputs": outs, "marker": MARKER}
    rec["plugins"] = [{"name": n, **fn(ctx)} for n, fn in parity_plugins.PLUGINS]

def overall(rec):
    s = [x["status"] for x in rec["stages"]]
    return "FAIL" if "FAIL" in s else "BLOCKED" if "BLOCKED" in s else "PASS"

def manifest_entry(path, mpath):
    rel = os.path.relpath(os.path.abspath(path), ROOT)
    try: m = json.load(open(mpath, encoding="utf-8"))
    except OSError: return None
    return next((f for f in m["files"] if f["path"] == rel), None)

# Phần OPC "đương nhiên đổi" khi engine TẠO MỚI một part do sửa (vd. đặt chuỗi vào ô mà tệp nguồn chưa có
# sharedStrings.xml → phải thêm part đó, khai báo trong [Content_Types].xml và nối quan hệ trong workbook.xml.rels).
# Đây không phải nới lỏng để "làm xanh": byte-identity phần không đổi, integrity (XML well-formed, rels trỏ part
# có thật, CRC) và "sửa đổi còn thấy sau khi mở lại" vẫn kiểm nghiêm; expect_changed chỉ quyết cổng unexpected_changed.
def default_expect(fmt):
    return {"docx": ["word/document.xml", "[Content_Types].xml", "word/_rels/document.xml.rels"],
            "xlsx": ["xl/worksheets/*.xml", "xl/sharedStrings.xml", "xl/calcChain.xml", "xl/workbook.xml", "docProps/*.xml",
                     "[Content_Types].xml", "xl/_rels/workbook.xml.rels"],
            "pptx": ["ppt/notesSlides/*.xml", "ppt/notesSlides/_rels/*.rels", "ppt/slides/*.xml", "ppt/slides/_rels/*.rels",
                     "ppt/_rels/presentation.xml.rels", "ppt/presentation.xml", "[Content_Types].xml"]}[fmt]

def selftest():
    """Chứng minh harness BẮT được lỗi: mock đúng → PASS; mock làm rơi phần / hỏng XML → FAIL. Chỉ docx."""
    src = os.path.join(ROOT, "docs/ooxml-corpus/synthetic/docx/rich-word.docx")
    mock = os.path.join(HERE, "mock_engine.py")
    wrapper = os.path.join(tempfile.mkdtemp(), "mock-engine")
    open(wrapper, "w").write(f"#!/bin/sh\nexec {sys.executable} -I {mock}\n"); os.chmod(wrapper, 0o755)
    res = {}
    for fault in ("", "drop_part", "corrupt_xml"):
        os.environ["MOCK_FAULT"] = fault
        r = run_file(src, "docx", wrapper, tempfile.mkdtemp(), default_expect("docx"), label="MOCK (không phải OOXMLKit)")
        res[fault or "no_fault"] = overall(r)
    want = {"no_fault": "PASS", "drop_part": "FAIL", "corrupt_xml": "FAIL"}
    ok = res == want
    print(json.dumps({"selftest": "PASS" if ok else "FAIL", "got": res, "want": want,
                      "note": "Chỉ kiểm harness bằng động cơ GIẢ; KHÔNG phải kết quả của OOXMLKit."}, ensure_ascii=False, indent=1))
    return 0 if ok else 1

def main(argv):
    if "--selftest" in argv: return selftest()
    args = [a for a in argv if not a.startswith("--")]
    opt = lambda k: argv[argv.index(k) + 1] if k in argv else None
    skip = {opt("--engine"), opt("--manifest"), opt("--out"), opt("--json")}
    files = [a for a in args if a not in skip]
    if not files: print(__doc__); return 64
    path = files[0]; fmt = path.rsplit(".", 1)[-1].lower()
    if fmt not in ("docx", "xlsx", "pptx"): print("định dạng không hỗ trợ:", fmt); return 64
    mpath = opt("--manifest") or os.path.join(ROOT, "docs/ooxml-corpus/MANIFEST.json")
    entry = manifest_entry(path, mpath)
    expect = (entry or {}).get("edit", {}).get("expect_changed") or default_expect(fmt)
    out = opt("--out") or tempfile.mkdtemp(prefix="parity-")
    rec = run_file(path, fmt, find_engine(opt("--engine")), out, expect, known_issues=(entry or {}).get("known_source_issues", []))
    attach_plugins(rec, entry)
    rec["manifest_entry"] = bool(entry); rec["overall"] = overall(rec)
    text = json.dumps(rec, ensure_ascii=False, indent=1)
    if opt("--json"): open(opt("--json"), "w", encoding="utf-8").write(text + "\n")
    else: print(text)
    return {"PASS": 0, "FAIL": 1, "BLOCKED": 2}[rec["overall"]]

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
