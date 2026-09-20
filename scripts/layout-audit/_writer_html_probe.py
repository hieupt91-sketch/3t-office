"""Usage: python _writer_html_probe.py <worktree> <docx> <text snippet> [more snippets...]
In HTML LibreOffice xuat (dung cung duong mo file cua app: _run_soffice_convert + overlay) cho cac doan chua chuoi cho
truoc, kem OOXML pPr/rPr cua doan do va style/docDefaults — de xac dinh font/co/gian dong bi mat o buoc nao."""
import os, sys, re, tempfile, zipfile
ROOT, DOCX = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
sys.path.insert(0, ROOT)
import main as vnmain
tmp = tempfile.mkdtemp(prefix="vno_probe_")
html_path = vnmain._run_soffice_convert(DOCX, "html", tmp, app_kind="writer")
html = open(html_path, encoding="utf-8", errors="replace").read()
z = zipfile.ZipFile(DOCX)
doc = z.read("word/document.xml").decode("utf-8", "replace"); styles = z.read("word/styles.xml").decode("utf-8", "replace")
head = re.search(r"<style[^>]*>([\s\S]*?)</style>", html, re.I)
print("== HEAD CSS (p.western / body / default):")
for line in (head.group(1) if head else "").splitlines():
    if re.search(r"^\s*(p|body|p\.western|h[1-6]|\.western)\b", line) or "font-family" in line and len(line) < 200:
        print("  ", line.strip()[:160])
dd = re.search(r"<w:docDefaults>[\s\S]*?</w:docDefaults>", styles); print("== docDefaults:", dd.group(0)[:400] if dd else None)
th = z.read("word/theme/theme1.xml").decode("utf-8", "replace") if "word/theme/theme1.xml" in z.namelist() else ""
print("== theme major/minor:", re.search(r'<a:majorFont>\s*<a:latin[^>]*typeface="([^"]*)"', th).group(1) if th else None, "/", re.search(r'<a:minorFont>\s*<a:latin[^>]*typeface="([^"]*)"', th).group(1) if th else None)
for snippet in sys.argv[3:]:
    print("\n==== ", snippet)
    i = html.find(snippet)
    if i < 0:
        print("  HTML: not found");
    else:
        start = max(html.rfind("<p", 0, i), html.rfind("<h", 0, i), html.rfind("<li", 0, i)); end = html.find("</p>", i)
        print("  HTML:", re.sub(r"\s+", " ", html[start:end + 4])[:700])
    j = doc.find(snippet[:12])
    if j < 0:
        print("  OOXML: not found")
    else:
        ps = doc.rfind("<w:p ", 0, j); ps2 = doc.rfind("<w:p>", 0, j); ps = max(ps, ps2); pe = doc.find("</w:p>", j)
        p = doc[ps:pe]
        ppr = re.search(r"<w:pPr>[\s\S]*?</w:pPr>", p); print("  pPr:", (ppr.group(0) if ppr else "none")[:400])
        runs = re.findall(r"<w:r\b[^>]*>([\s\S]*?)</w:r>", p)
        for r in runs[:3]:
            rpr = re.search(r"<w:rPr>[\s\S]*?</w:rPr>", r); t = re.search(r"<w:t[^>]*>([^<]*)</w:t>", r)
            print("  run:", (t.group(1) if t else "")[:30], "|", (rpr.group(0) if rpr else "no rPr")[:250])
        sid = re.search(r'<w:pStyle w:val="([^"]+)"', p)
        if sid:
            st = re.search(r'<w:style\b[^>]*w:styleId="%s".*?</w:style>' % re.escape(sid.group(1)), styles, re.S)
            print("  style:", (st.group(0) if st else "?")[:400])
print("\nHTML file:", html_path)
