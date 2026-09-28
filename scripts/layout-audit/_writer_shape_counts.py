"""Usage: python _writer_shape_counts.py <source-dir> <batch-out-dir>
Per saved _rt_*.docx: wsp/txbx/anchor/txbxContent/pic/media vs source, plus duplicate wp:docPr ids."""
import glob
import os
import re
import zipfile

import sys
SRC = sys.argv[1]
OUT = sys.argv[2]

PATTERNS = {
    "wsp": r"<wps:wsp\b",
    "txbx": r"<wps:txbx\b",
    "anchor": r"<wp:anchor\b",
    "txc": r"<w:txbxContent\b",
    "pic": r"<pic:pic\b",
}


def counts(path):
    z = zipfile.ZipFile(path)
    doc = z.read("word/document.xml").decode("utf-8", "replace")
    c = {k: len(re.findall(p, doc)) for k, p in PATTERNS.items()}
    c["media"] = sum(1 for n in z.namelist() if n.startswith("word/media/"))
    return c


bad = 0
for saved in sorted(glob.glob(os.path.join(OUT, "_rt_d*.docx"))):
    name = os.path.basename(saved)[4:]
    src = os.path.join(SRC, name)
    if not os.path.exists(src):
        continue
    s, o = counts(src), counts(saved)
    over = [k for k in ("wsp", "txbx", "txc", "media") if o[k] > s[k]]
    flag = "OVER " + ",".join(over) if over else "ok"
    if over:
        bad += 1
    doc = zipfile.ZipFile(saved).read("word/document.xml").decode("utf-8", "replace")
    ids = re.findall(r'<wp:docPr\b[^>]*\bid="(\d+)"', doc)
    if len(ids) != len(set(ids)):
        flag += " DUPLICATE-DOCPR-IDS"
        bad += 1
    print(f"{name}: src {s} | saved {o} | {flag}")
print("files with more wsp/txbx/txc/media than source:", bad)
