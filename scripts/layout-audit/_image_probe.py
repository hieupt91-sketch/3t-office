"""Usage: _image_probe.py <lanNN>  -- per sheet: drawing anchors (from/to cells, pic/shape kinds) in source vs saved."""
import zipfile, re, sys, posixpath
lan = sys.argv[1]
def sheets(z):
    wb = z.read("xl/workbook.xml").decode(); rels = z.read("xl/_rels/workbook.xml.rels").decode()
    relmap = {}
    for m in re.finditer(r"<Relationship\b([^>]*)/?>", rels):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1))); relmap[a.get("Id")] = a.get("Target")
    out = []
    for m in re.finditer(r"<sheet\b([^>]*)/?>", wb):
        a = dict(re.findall(r'([\w:]+)="([^"]*)"', m.group(1)))
        t = relmap.get(a.get("r:id"), "").lstrip("/"); t = t if t.startswith("xl/") else "xl/" + t
        out.append((a.get("name"), t))
    return out
def anchors(z, sheet_path):
    x = z.read(sheet_path).decode(errors="replace")
    rid = re.search(r'<drawing\b[^>]*r:id="([^"]+)"', x)
    if not rid: return []
    rels_path = posixpath.join(posixpath.dirname(sheet_path), "_rels", posixpath.basename(sheet_path) + ".rels")
    rels = z.read(rels_path).decode()
    m = re.search(r'<Relationship\b[^>]*Id="%s"[^>]*Target="([^"]+)"' % rid.group(1), rels) or re.search(r'<Relationship\b[^>]*Target="([^"]+)"[^>]*Id="%s"' % rid.group(1), rels)
    target = posixpath.normpath(posixpath.join(posixpath.dirname(sheet_path), m.group(1)))
    d = z.read(target).decode(errors="replace")
    res = []
    for am in re.finditer(r"<(?:xdr:)?(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>([\s\S]*?)</(?:xdr:)?\1>", d):
        body = am.group(2)
        fr = re.search(r"<(?:xdr:)?from>\s*<(?:xdr:)?col>(\d+)</(?:xdr:)?col>.*?<(?:xdr:)?row>(\d+)</(?:xdr:)?row>", body, re.S)
        kind = "pic" if "<xdr:pic" in body or "<pic" in body else ("sp" if "<xdr:sp" in body or "<sp" in body else ("grp" if "grpSp" in body else ("cxn" if "cxnSp" in body else ("frame" if "graphicFrame" in body else "?"))))
        cell = None
        if fr:
            c = int(fr.group(1)) + 1; s = ""
            while c: c, r = divmod(c - 1, 26); s = chr(65 + r) + s
            cell = f"{s}{int(fr.group(2)) + 1}"
        res.append((cell, kind, am.group(1)))
    return res
for label, p in [("SRC", r'E:\VNOffice-opencode-lan-audit\file test\lan\%s.xlsx' % lan), ("SAVED", r'E:\VNOffice-opencode-lan-audit\_rt_%s.xlsx' % lan)]:
    z = zipfile.ZipFile(p)
    print(label)
    for name, path in sheets(z):
        a = anchors(z, path)
        if a: print("  ", repr(name)[:30], a[:12], "..." if len(a) > 12 else "", "total", len(a))
