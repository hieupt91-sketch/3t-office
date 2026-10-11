"""So chieu cao hang Python (vno:xlsx-layout) voi Excel cho moi geom.json co san. Usage: _rows_all.py <geomdir...>"""
import sys, json, re, os, glob
sys.path.insert(0, r"E:\VN OFice")
from adapters.libreoffice.common import ooxml_zip_patch as z
total_mis = 0; total_rows = 0
seen = set()
for gdir in sys.argv[1:]:
    for gp in sorted(glob.glob(os.path.join(gdir, "*.geom.json"))):
        stem = os.path.basename(gp).split(".")[0]
        if stem in seen: continue
        seen.add(stem)
        xlsx = os.path.join(r"E:\VN OFice\file test\lan", stem + ".xlsx")
        if not os.path.exists(xlsx): continue
        data = open(xlsx, "rb").read()
        names = list(z._resolve_xlsx_sheet_entries(data).keys())
        fods_xml = "".join('<table:table table:name="%s"/>' % z._escape_xml(n) for n in names)
        out = z._overlay_sheet_layout_from_xlsx(data, fods_xml)
        layouts = {}
        for m in re.finditer(r'table:name="([^"]*)"[^>]*vno:xlsx-layout="([^"]*)"', out):
            layouts[z._unescape_xml(m.group(1))] = json.loads(z._unescape_xml(m.group(2)))
        geom = json.load(open(gp, encoding="utf-8"))
        for sheet in geom["sheets"]:
            name = sheet["name"]
            lay = layouts.get(name) or next((v for k, v in layouts.items() if z._sheet_name_equivalence_key(k) == z._sheet_name_equivalence_key(name)), {})
            rows = lay.get("rows", {}); wrap = lay.get("wrap", {})
            ex = sheet["rowPx"]; mis = []
            for r in range(1, len(ex) + 1):
                app = rows.get(str(r), lay.get("defaultRow"))
                if ex[r - 1] == 0: continue  # hang an
                if app is None or abs(app - ex[r - 1]) > 0.5:
                    mis.append((r, ex[r - 1], app))
            total_mis += len(mis); total_rows += len(ex)
            print(f"{stem} s{sheet['index']}: rows {len(ex)} mismatch {len(mis)} wrapLeft {len(wrap)} " + " ".join(f"r{r}:{e}/{a}" for r, e, a in mis[:8]))
print("TOTAL mismatch", total_mis, "of", total_rows)
