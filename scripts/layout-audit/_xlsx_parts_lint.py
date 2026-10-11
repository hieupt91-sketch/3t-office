"""Usage: _xlsx_parts_lint.py <xlsx>  -- [Content_Types] Override/Default vs parts, every Relationship Target exists, duplicate zip names."""
import sys, zipfile, re, posixpath, collections
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()
dups = [n for n, c in collections.Counter(names).items() if c > 1]
if dups: print("DUPLICATE ZIP ENTRIES:", dups)
ct = z.read("[Content_Types].xml").decode()
overrides = re.findall(r'<Override\b[^>]*PartName="([^"]+)"', ct)
defaults = re.findall(r'<Default\b[^>]*Extension="([^"]+)"', ct)
for part in overrides:
    if part.lstrip("/") not in names: print("Override without part:", part)
if len(set(overrides)) != len(overrides): print("DUPLICATE Override:", [p for p, c in collections.Counter(overrides).items() if c > 1])
exts = set(e.lower() for e in defaults)
for n in names:
    ext = n.rsplit(".", 1)[-1].lower() if "." in n else ""
    if "/" + n not in overrides and ext not in exts and n != "[Content_Types].xml":
        print("part without content type:", n)
for n in names:
    if not n.endswith(".rels"): continue
    base = posixpath.dirname(posixpath.dirname(n))
    for m in re.finditer(r'<Relationship\b([^>]*)/?>', z.read(n).decode()):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if a.get("TargetMode") == "External": continue
        t = a.get("Target", "")
        full = t.lstrip("/") if t.startswith("/") else posixpath.normpath(posixpath.join(base, t))
        if full not in names: print(n, "-> missing target", t, "(", full, ")")
    ids = re.findall(r'\bId="([^"]+)"', z.read(n).decode())
    if len(set(ids)) != len(ids): print(n, "DUPLICATE rel Id", [i for i, c in collections.Counter(ids).items() if c > 1])
print("parts lint done")
