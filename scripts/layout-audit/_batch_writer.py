"""Usage: python _batch_writer.py <worktree> <docx-dir> <out-dir> [names...]

For each DOCX, count Word pages, open/edit/save in the real desktop via CDP, and
count saved pages with hidden Word COM. COM work is sequential and the local
test corpus remains outside the repository index.
"""
import glob
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT, DOCDIR, OUTDIR = (os.path.abspath(arg) for arg in sys.argv[1:4])
names = sys.argv[4:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(DOCDIR, "*.docx")))
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)


def word_pages(path):
    result = subprocess.run(
        ["powershell", "-NoProfile", "-File", os.path.join(SP, "_word_oracle3.ps1"), "-File", path],
        capture_output=True, text=True, timeout=400,
    )
    match = re.search(r"pages=(\d+)", result.stdout or "")
    return int(match.group(1)) if match else (result.stdout or result.stderr).strip()[:100]


def docx_stats(path):
    try:
        with zipfile.ZipFile(path) as package:
            xml = package.read("word/document.xml").decode("utf-8", "replace")
            names = package.namelist()
    except Exception as error:
        return {"err": str(error)[:60]}
    body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", xml)
    return {
        "paras": len(re.findall(r"<w:p[ >]", body)),
        "sect": len(re.findall(r"<w:pPr>(?:(?!</w:pPr>)[\s\S])*?<w:sectPr", body)),
        "br": len(re.findall(r'<w:br\b[^>]*w:type="page"', body)),
        "pbb": len(re.findall(r"<w:pageBreakBefore\b", body)),
        "hdr": sum(name.startswith("word/header") and name.endswith(".xml") for name in names),
        "ftr": sum(name.startswith("word/footer") and name.endswith(".xml") for name in names),
        "media": sum(name.startswith("word/media/") for name in names),
        "anchors": xml.count("<wp:anchor"),
        "tables": xml.count("<w:tbl>"),
        "zz": "ZZ" in xml,
    }


rows = []
probe = os.path.join(ROOT, "scripts", "layout-audit", "_cdp_roundtrip.mjs")
for name in names:
    source = os.path.join(DOCDIR, name)
    target = os.path.join(OUTDIR, "_rt_" + name)
    if os.path.exists(target):
        os.remove(target)
    original_pages = word_pages(source)
    completed = subprocess.run(
        ["node", probe, "writer", source, target, "--marker=ZZ", "--bold-marker"],
        capture_output=True, text=True, cwd=ROOT, timeout=1500, encoding="utf-8", errors="replace",
    )
    result_match = re.search(r"^CH5_RESULT (\{.*\})$", completed.stdout or "", re.M)
    probe_result = json.loads(result_match.group(1)) if result_match else {}
    saved = os.path.isfile(target) and os.path.getsize(target) > 0
    saved_pages = word_pages(target) if saved else "-"
    source_stats = docx_stats(source)
    saved_stats = docx_stats(target) if saved else {}
    canvas_status = probe_result.get("canvasStatus", "")
    canvas_match = re.search(r"Trang\s+1\s*/\s*(\d+)", canvas_status)
    canvas_pages = int(canvas_match.group(1)) if canvas_match else "?"
    edit = probe_result.get("edit", "")
    error = probe_result.get("error", "") or (completed.stderr or "")[-180:].replace("\n", " ")
    rows.append((
        name, original_pages, canvas_pages, saved_pages, "yes" if saved else "NO",
        "yes" if probe_result.get("loaded") else "NO",
        f"{source_stats.get('paras')}/{saved_stats.get('paras', '-')}" if saved else "-",
        f"{source_stats.get('sect')}/{saved_stats.get('sect', '-')}" if saved else "-",
        f"{source_stats.get('br')}/{saved_stats.get('br', '-')}" if saved else "-",
        f"{source_stats.get('pbb')}/{saved_stats.get('pbb', '-')}" if saved else "-",
        f"{source_stats.get('hdr')}/{saved_stats.get('hdr', '-')}" if saved else "-",
        f"{source_stats.get('ftr')}/{saved_stats.get('ftr', '-')}" if saved else "-",
        f"{source_stats.get('media')}/{saved_stats.get('media', '-')}" if saved else "-",
        saved_stats.get("zz", "-"), edit, error[:80],
    ))
    print(name, "Word pages", original_pages, "saved pages", saved_pages, "loaded", probe_result.get("loaded"), flush=True)

report = os.path.join(OUTDIR, "_batch_writer_report.md")
with open(report, "w", encoding="utf-8") as handle:
    handle.write("| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | pbb o/s | hdr o/s | ftr o/s | media o/s | ZZ | edit | error |\n")
    handle.write("|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|\n")
    for row in rows:
        handle.write("| " + " | ".join(str(value) for value in row) + " |\n")
print("report:", report)
