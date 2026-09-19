"""Usage: _xlsx_lint.py <xlsx>  -- well-formedness + common schema traps (cols, sheetFormatPr, sst counts, cell order)."""
import sys, zipfile, re
from xml.dom import minidom
z = zipfile.ZipFile(sys.argv[1])
for name in z.namelist():
    if not name.endswith(".xml") and not name.endswith(".rels"):
        continue
    data = z.read(name)
    try:
        minidom.parseString(data)
    except Exception as exc:
        print("NOT WELL-FORMED:", name, exc)
x = z.read("xl/styles.xml").decode()
for tag, child in [("fonts", "font"), ("fills", "fill"), ("borders", "border"), ("cellXfs", "xf"), ("numFmts", "numFmt"), ("cellStyleXfs", "xf"), ("cellStyles", "cellStyle"), ("dxfs", "dxf")]:
    m = re.search(rf'<{tag}\b[^>]*count="(\d+)"[^>]*>(.*?)</{tag}>', x, re.S)
    if m:
        n = len(re.findall(rf"<{child}\b[^>]*/>|<{child}\b[^>]*>.*?</{child}>", m.group(2), re.S))
        if n != int(m.group(1)):
            print(f"COUNT MISMATCH {tag}: count={m.group(1)} actual={n}")
xfs = re.search(r"<cellXfs[^>]*>(.*?)</cellXfs>", x, re.S)
nxf = len(re.findall(r"<xf\b[^>]*/>|<xf\b[^>]*>.*?</xf>", xfs.group(1), re.S)) if xfs else 0
nfonts = len(re.findall(r"<font\b[^>]*/>|<font\b[^>]*>.*?</font>", re.search(r"<fonts[^>]*>(.*?)</fonts>", x, re.S).group(1), re.S))
nfills = len(re.findall(r"<fill\b[^>]*/>|<fill\b[^>]*>.*?</fill>", re.search(r"<fills[^>]*>(.*?)</fills>", x, re.S).group(1), re.S))
nborders = len(re.findall(r"<border\b[^>]*/>|<border\b[^>]*>.*?</border>", re.search(r"<borders[^>]*>(.*?)</borders>", x, re.S).group(1), re.S))
ncsx = len(re.findall(r"<xf\b", re.search(r"<cellStyleXfs[^>]*>(.*?)</cellStyleXfs>", x, re.S).group(1))) if "<cellStyleXfs" in x else 0
numfmt_ids = set(int(v) for v in re.findall(r'<numFmt numFmtId="(\d+)"', x))
for i, xf in enumerate(re.findall(r"<xf\b[^>]*/>|<xf\b[^>]*>.*?</xf>", xfs.group(1), re.S) if xfs else []):
    a = dict(re.findall(r'(\w+)="([^"]*)"', xf.split(">")[0]))
    if int(a.get("fontId", 0)) >= nfonts: print(f"xf {i}: fontId {a.get('fontId')} >= {nfonts}")
    if int(a.get("fillId", 0)) >= nfills: print(f"xf {i}: fillId {a.get('fillId')} >= {nfills}")
    if int(a.get("borderId", 0)) >= nborders: print(f"xf {i}: borderId {a.get('borderId')} >= {nborders}")
    if int(a.get("xfId", 0)) >= max(ncsx, 1): print(f"xf {i}: xfId {a.get('xfId')} >= {ncsx}")
    nf = int(a.get("numFmtId", 0))
    if nf >= 164 and nf not in numfmt_ids: print(f"xf {i}: numFmtId {nf} undeclared")
sst = z.read("xl/sharedStrings.xml").decode() if "xl/sharedStrings.xml" in z.namelist() else ""
nsi = len(re.findall(r"<si\b", sst))
uc = re.search(r'uniqueCount="(\d+)"', sst)
if uc and int(uc.group(1)) != nsi: print(f"SST uniqueCount={uc.group(1)} actual si={nsi}")
for name in z.namelist():
    if not name.startswith("xl/worksheets/sheet"): continue
    s = z.read(name).decode()
    if "<cols></cols>" in s or "<cols/>" in s: print(name, "EMPTY <cols>")
    for m in re.finditer(r'<c r="([A-Z]+)(\d+)"[^>]*t="s"[^>]*>\s*<v>(\d+)</v>', s):
        if int(m.group(3)) >= nsi: print(name, m.group(1) + m.group(2), "sst index", m.group(3), ">=", nsi); break
    for m in re.finditer(r'<c r="([A-Z]+\d+)"[^>]*\bs="(\d+)"', s):
        if int(m.group(2)) >= nxf: print(name, m.group(1), "xf", m.group(2), ">=", nxf); break
    # row order / cell order
    prev_r = 0
    for rm in re.finditer(r'<row\b[^>]*\br="(\d+)"[^>]*>(.*?)</row>', s, re.S):
        r = int(rm.group(1))
        if r <= prev_r: print(name, "row order broken at", r); break
        prev_r = r
        prev_c = 0
        for cm in re.finditer(r'<c r="([A-Z]+)(\d+)"', rm.group(2)):
            c = 0
            for ch in cm.group(1): c = c * 26 + ord(ch) - 64
            if int(cm.group(2)) != r: print(name, "cell row mismatch", cm.group(0), "in row", r); break
            if c <= prev_c: print(name, "cell order broken at", cm.group(0)); break
            prev_c = c
    cols = re.search(r"<cols>(.*?)</cols>", s, re.S)
    if cols:
        prev = 0
        for m in re.finditer(r"<col\b([^>]*)/>", cols.group(1)):
            a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
            mn, mx = int(a["min"]), int(a["max"])
            if mn <= prev or mx < mn: print(name, "col range broken", m.group(0)); break
            prev = mx
        if re.search(r"<col\b[^>]*>(?<!/>)", cols.group(1)) and "</col>" in cols.group(1): print(name, "col not self-closing")
    m = re.search(r"<sheetFormatPr\b[^>]*>", s)
    if m and "defaultRowHeight" not in m.group(0): print(name, "sheetFormatPr without defaultRowHeight:", m.group(0))
print("lint done")
