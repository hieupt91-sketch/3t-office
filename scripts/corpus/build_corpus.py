#!/usr/bin/env python3
"""Dựng corpus G0 (synthetic) + MANIFEST.json. Chỉ thư viện chuẩn.

  python3 -I scripts/corpus/build_corpus.py            # ghi docs/ooxml-corpus/synthetic + MANIFEST.json
  python3 -I scripts/corpus/build_corpus.py --check    # chỉ kiểm: MANIFEST khớp tệp & hash, không ghi

Nguồn: tái dùng ports/ios/OOXMLKit/scripts/fixtures/*.py (viết tay XML, KHÔNG phải Microsoft Office tạo)
+ scripts/corpus/make_gap_fixtures.py (lấp ô trống chart/Unicode). Tệp trong ports/ios/.../Fixtures/real
do LibreOffice tạo — được THAM CHIẾU (không chép) với origin="libreoffice".
Thuộc tính tính năng được DÒ từ nội dung tệp, không khai tay.
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile, zipfile
import xml.parsers.expat as expat

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KIT = os.path.join(ROOT, "ports", "ios", "OOXMLKit")
REAL = os.path.join(KIT, "Tests", "OOXMLTestSupport", "Fixtures", "real")
CORPUS = os.path.join(ROOT, "docs", "ooxml-corpus")
SYN = os.path.join(CORPUS, "synthetic")
CATS = ["table", "image", "chart", "formula", "style", "comment", "notes", "unicode"]
SYN_LABEL = "synthetic — KHÔNG phải do Microsoft Office thật tạo; viết tay theo mẫu đầu ra Office, chỉ để kiểm cấu trúc"
LO_LABEL = "libreoffice-generated (tệp sẵn có của repo) — KHÔNG phải do Microsoft Office thật tạo"

def sha(b): return hashlib.sha256(b).hexdigest()

def xml_scan(data):
    """Trả (tên phần tử cục bộ -> số lượng, có text phi-ASCII, text phi-ASCII Việt có dấu?)."""
    counts, state = {}, {"nonascii": False, "buf": []}
    p = expat.ParserCreate(namespace_separator=" ")
    def start(n, a):
        l = n.split(" ")[-1]; counts[l] = counts.get(l, 0) + 1
    def chars(t):
        if any(ord(c) > 127 for c in t): state["nonascii"] = True
    p.StartElementHandler, p.CharacterDataHandler = start, chars
    try: p.Parse(data, True)
    except expat.ExpatError: pass
    return counts, state["nonascii"]

def detect(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    fmt = {"docx": "docx", "xlsx": "xlsx", "pptx": "pptx"}[path.rsplit(".", 1)[1]]
    f = {c: False for c in CATS}
    agg, nonascii = {}, False
    for n in names:
        if n.endswith(".xml") and not n.startswith("customXml") and "/theme/" not in n:
            c, na = xml_scan(z.read(n)); nonascii |= na
            for k, v in c.items(): agg[k] = agg.get(k, 0) + v
    has = lambda *p: any(any(x in n for x in p) for n in names)
    f["unicode"] = nonascii
    f["image"] = has("/media/")
    f["chart"] = has("/charts/chart")
    f["comment"] = has("comments")
    f["style"] = (has("slideMaster") and has("theme/")) if fmt == "pptx" else (has("styles.xml") and (agg.get("style", 0) + agg.get("xf", 0) > 0))
    if fmt == "docx":
        f["table"] = agg.get("tbl", 0) > 0
        f["formula"] = agg.get("oMath", 0) > 0  # công thức toán OMML; trường (PAGE...) KHÔNG tính
        f["notes"] = agg.get("footnote", 0) + agg.get("endnote", 0) > 2  # 2 mục separator mặc định
    elif fmt == "xlsx":
        f["table"] = has("/tables/table")
        f["formula"] = agg.get("f", 0) > 0
        f["notes"] = False  # XLSX không có "notes" riêng; ghi chú ô = comment
    else:
        f["table"] = agg.get("tbl", 0) > 0
        f["formula"] = False  # PPTX không có công thức; chỉ chart nhúng workbook
        f["notes"] = has("notesSlide")
    return fmt, f, {"parts": len(names)}

def run_gens(tmp):
    shutil.copytree(REAL, os.path.join(tmp, "real"))
    for s in ("zip", "xlsx", "docx", "pptx"):
        subprocess.run([sys.executable, "-I", os.path.join(KIT, "scripts", "fixtures", f"make_{s}_fixtures.py"), tmp],
                       check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, "-I", os.path.join(ROOT, "scripts", "corpus", "make_gap_fixtures.py"), tmp], check=True)

# Lỗi CÓ SẴN trong tệp nguồn (không phải do OOXMLKit); runner báo "KNOWN" thay vì FAIL. Phát hiện bởi parity_runner.source_integrity.
KNOWN_SOURCE_ISSUES = {
    "sample-slides-smartart.pptx": ["ppt/slideMasters/_rels/slideMaster1.xml.rels: quan hệ rId3 → ppt/slideLayouts/slideLayout2.xml không tồn tại"],
}

def entry(rel, abspath, origin, label, notes=""):
    fmt, feats, extra = detect(abspath)
    data = open(abspath, "rb").read()
    edit = {"docx": {"op": "doc.appendParagraph", "expect_changed": ["word/document.xml"]},
            "xlsx": {"op": "sheet.setValue", "expect_changed": ["xl/worksheets/*.xml", "xl/sharedStrings.xml", "xl/calcChain.xml", "xl/workbook.xml", "[Content_Types].xml", "xl/_rels/workbook.xml.rels"]},
            "pptx": {"op": "slide.setNotes", "expect_changed": ["ppt/notesSlides/*.xml", "ppt/slides/*.xml", "ppt/slides/_rels/*.rels", "ppt/notesSlides/_rels/*.rels", "[Content_Types].xml",
                     "ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "ppt/notesMasters/*.xml", "ppt/notesMasters/_rels/*.rels"]}}[fmt]
    return {"path": rel, "format": fmt, "origin": origin, "label": label, "sha256": sha(data), "bytes": len(data),
            "known_source_issues": KNOWN_SOURCE_ISSUES.get(os.path.basename(abspath), []), "features": feats, "parts": extra["parts"], "edit": edit, "notes": notes,
            "oracle": {"microsoft_office": "BLOCKED: chưa có kết quả mở bằng Office thật",
                       "libreoffice": "BLOCKED: LibreOffice không có trong môi trường tạo corpus"}}

def build(check):
    with tempfile.TemporaryDirectory() as tmp:
        run_gens(tmp)
        items = []
        for fmt in ("docx", "xlsx", "pptx"):
            d = os.path.join(tmp, fmt)
            for fn in sorted(os.listdir(d)):
                if not fn.endswith("." + fmt): continue
                src = os.path.join(d, fn)
                rel = f"docs/ooxml-corpus/synthetic/{fmt}/{fn}"
                if not check:
                    os.makedirs(os.path.join(SYN, fmt), exist_ok=True); shutil.copyfile(src, os.path.join(ROOT, rel))
                items.append(entry(rel, src, "synthetic", SYN_LABEL))
        for fn in sorted(os.listdir(REAL)):
            if fn.endswith((".docx", ".xlsx", ".pptx")):
                a = os.path.join(REAL, fn)
                items.append(entry(os.path.relpath(a, ROOT), a, "libreoffice", LO_LABEL, "tham chiếu tại chỗ, không chép"))
        man = {"schema": "ooxml-corpus-manifest/1", "categories": CATS,
               "honesty": "Không tệp nào trong corpus này do Microsoft Office thật tạo. 'baseline Office thật' còn BLOCKED (xem README).",
               "files": items}
        text = json.dumps(man, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
        mp = os.path.join(CORPUS, "MANIFEST.json")
        if check:
            ok = os.path.exists(mp) and open(mp, encoding="utf-8").read() == text
            for it in items:
                p = os.path.join(ROOT, it["path"])
                ok &= os.path.exists(p) and sha(open(p, "rb").read()) == it["sha256"]
            print("MANIFEST", "KHỚP" if ok else "LỆCH (chạy lại build_corpus.py)"); return 0 if ok else 1
        open(mp, "w", encoding="utf-8").write(text)
        print(f"ghi {len(items)} mục vào {mp}")
        cov(items); return 0

def cov(items):
    print("Ma trận phủ (số tệp có tính năng) — theo định dạng:")
    for fmt in ("docx", "xlsx", "pptx"):
        row = {c: sum(1 for i in items if i["format"] == fmt and i["features"][c]) for c in CATS}
        print(" ", fmt, row)

if __name__ == "__main__":
    sys.exit(build("--check" in sys.argv))
