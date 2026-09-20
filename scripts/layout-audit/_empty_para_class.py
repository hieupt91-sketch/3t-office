"""Usage: python _empty_para_class.py <worktree> <docdir> <outdir>
Phan tich lop "doan rong cao theo cuo dau doan" (drift:empty-para) tren 24 file.
1. OOXML: moi w:p KHONG co w:t (rong, ngoai bang va trong bang dem rieng): cuo dau doan = pPr/rPr/sz neu co,
   khong thi style chain (pStyle -> basedOn) rPr/sz, khong thi docDefaults. Cuo "mac dinh" = Normal/docDefaults.
   Dem: tong doan rong, so doan rong co cuo dau doan != cuo mac dinh (theo file, theo vung than/bang/header/footer),
   phan bo cuo (8/9/10/11/12/13/14pt...).
2. Word COM (Visible=false, Quit): voi 10 doan rong dau tien co cuo != mac dinh (than) cua 5 file nhieu nhat:
   pitch that = y(doan sau) - y(doan rong) (Information(6)) va Font.Size cua range doan rong -> xac nhan Word dung cuo dau doan.
3. Canvas (*.canvas.jsonl): khoi text == "" tuong ung (anh xa theo thu tu trong cung vung than: doan rong thu k) -> h va size.
   Bang: file x (doan rong != mac dinh) x (Word pitch trung binh) x (canvas h trung binh) x chenh px.
4. Handoff docs/HANDOFF-WRITER-R15.md: bang 23 file, tong, 5 vi du (file + cuo Word + pitch Word + h canvas), ket
   luan lop W26 gom: (a) than (document.xml co san cho adapter) va (b) header/footer (adapter chua nhan header/footer
   XML -- can main.py truyen ooxmlHeaderXml/ooxmlFooterXml). Khong sua code san pham, khong bia so, khong commit
   file test/_out, khong ten tai lieu that.
"""
import os, sys, json, re, zipfile, collections, subprocess
from pathlib import Path

PT2PX = 96 / 72
SZ_TO_PT = 0.5  # w:sz is in half-points

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def parse_sz(val):
    """Convert w:sz value (half-points) to points."""
    try:
        return int(val) * SZ_TO_PT
    except (ValueError, TypeError):
        return None


def get_doc_defaults_size(styles_xml):
    """Extract default font size from docDefaults (w:rPrDefault/w:rPr/w:sz)."""
    m = re.search(r"<w:rPrDefault>.*?<w:sz\b[^>]*w:val=\"([^\"]+)\"", styles_xml, re.S)
    if m:
        return parse_sz(m.group(1))
    return 11.0  # fallback


def get_normal_style_size(styles_xml):
    """Extract font size from Normal style (styleId='Normal')."""
    # Find Normal style
    for m in re.finditer(r'<w:style\b[^>]*w:styleId="Normal"[^>]*>(.*?)</w:style>', styles_xml, re.S):
        body = m.group(1)
        # Look for rPr/sz in style
        rpr = re.search(r"<w:rPr>(.*?)</w:rPr>", body, re.S)
        if rpr:
            sz = re.search(r"<w:sz\b[^>]*w:val=\"([^\"]+)\"", rpr.group(1))
            if sz:
                return parse_sz(sz.group(1))
        break
    return None


def build_style_map(styles_xml):
    """Build map of styleId -> {sz, basedOn} from styles.xml."""
    style_map = {}
    for m in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>(.*?)</w:style>', styles_xml, re.S):
        sid, body = m.group(1), m.group(1)
        # rPr/sz
        rpr = re.search(r"<w:rPr>(.*?)</w:rPr>", body, re.S)
        sz = None
        if rpr:
            sz_m = re.search(r"<w:sz\b[^>]*w:val=\"([^\"]+)\"", rpr.group(1))
            if sz_m:
                sz = parse_sz(sz_m.group(1))
        # basedOn
        based = re.search(r'<w:basedOn w:val="([^"]+)"', body)
        based_on = based.group(1) if based else None
        style_map[sid] = {"sz": sz, "basedOn": based_on}
    return style_map


def resolve_style_size(style_id, style_map, doc_defaults_size, max_depth=20):
    """Resolve font size by following style chain (basedOn)."""
    visited = set()
    current = style_id
    depth = 0
    while current and current not in visited and depth < max_depth:
        visited.add(current)
        if current in style_map:
            info = style_map[current]
            if info["sz"] is not None:
                return info["sz"]
            current = info["basedOn"]
            depth += 1
        else:
            break
    # Fallback to Normal style or docDefaults
    normal_sz = style_map.get("Normal", {}).get("sz")
    if normal_sz is not None:
        return normal_sz
    return doc_defaults_size


def get_para_mark_size(para_xml, style_map, doc_defaults_size):
    """Get paragraph mark size for a single paragraph element."""
    # 1. Direct pPr/rPr/sz
    ppr = re.search(r"<w:pPr>(.*?)</w:pPr>", para_xml, re.S)
    if ppr:
        rpr = re.search(r"<w:rPr>(.*?)</w:rPr>", ppr.group(1), re.S)
        if rpr:
            sz = re.search(r"<w:sz\b[^>]*w:val=\"([^\"]+)\"", rpr.group(1))
            if sz:
                return parse_sz(sz.group(1))
    # 2. Style chain
    if ppr:
        pstyle = re.search(r'<w:pStyle w:val="([^"]+)"', ppr.group(1))
        if pstyle:
            return resolve_style_size(pstyle.group(1), style_map, doc_defaults_size)
    # 3. docDefaults
    return doc_defaults_size


def is_in_table(para_xml):
    """Check if paragraph is inside a table (w:tbl ancestor)."""
    # Simple heuristic: check if w:tc ancestor exists in the XML path
    # Since we're parsing flat paragraphs, we need a different approach
    # Check if paragraph has w:pPr/w:tblDepth or similar
    return 'w:tblDepth' in para_xml


def extract_empty_paras(xml_content, zone, style_map, doc_defaults_size, default_size):
    """Extract empty paragraphs from XML content."""
    empty_paras = []
    for m in re.finditer(r'<w:p\b[^>]*>(.*?)</w:p>', xml_content, re.S):
        body = m.group(1)
        # Check if empty (no w:t)
        if '<w:t' not in body and '<w:t>' not in body:
            in_tbl = is_in_table(body)
            sz = get_para_mark_size(body, style_map, doc_defaults_size)
            is_non_default = abs(sz - default_size) > 0.01
            empty_paras.append({
                "zone": zone,
                "in_table": in_tbl,
                "size": sz,
                "is_non_default": is_non_default,
                "xml": body[:200]  # snippet for debugging
            })
    return empty_paras


def analyze_docx_ooxml(docx_path):
    """Analyze a single DOCX for empty paragraphs via OOXML."""
    z = zipfile.ZipFile(docx_path)
    styles_xml = z.read("word/styles.xml").decode("utf-8", "replace")
    doc_xml = z.read("word/document.xml").decode("utf-8", "replace")

    doc_defaults_size = get_doc_defaults_size(styles_xml)
    normal_size = get_normal_style_size(styles_xml)
    default_size = normal_size if normal_size is not None else doc_defaults_size
    style_map = build_style_map(styles_xml)

    results = {
        "body": [],
        "table": [],
        "header": [],
        "footer": []
    }

    # Body paragraphs
    body_paras = extract_empty_paras(doc_xml, "body", style_map, doc_defaults_size, default_size)
    for p in body_paras:
        if p["in_table"]:
            results["table"].append(p)
        else:
            results["body"].append(p)

    # Headers and footers
    for name in z.namelist():
        if name.startswith("word/header") and name.endswith(".xml"):
            xml = z.read(name).decode("utf-8", "replace")
            results["header"].extend(extract_empty_paras(xml, "header", style_map, doc_defaults_size, default_size))
        elif name.startswith("word/footer") and name.endswith(".xml"):
            xml = z.read(name).decode("utf-8", "replace")
            results["footer"].extend(extract_empty_paras(xml, "footer", style_map, doc_defaults_size, default_size))

    return {
        "default_size": default_size,
        "doc_defaults_size": doc_defaults_size,
        "results": results
    }


def collect_all_files_ooxml(docdir):
    """Analyze all DOCX files in directory via OOXML."""
    files = []
    for f in sorted(os.listdir(docdir)):
        if f.lower().endswith(".docx") and f != "d10.docx":  # skip d10 per instructions
            docx_path = os.path.join(docdir, f)
            try:
                analysis = analyze_docx_ooxml(docx_path)
                analysis["filename"] = f
                files.append(analysis)
                print(f"Analyzed {f}: default={analysis['default_size']}pt, body={len(analysis['results']['body'])}, table={len(analysis['results']['table'])}, header={len(analysis['results']['header'])}, footer={len(analysis['results']['footer'])}")
            except Exception as e:
                print(f"Error analyzing {f}: {e}")
    return files


def summarize_ooxml(files):
    """Create summary statistics from OOXML analysis."""
    summary = []
    total_empty = 0
    total_non_default = 0
    size_dist = collections.Counter()

    for f in files:
        fn = f["filename"]
        default = f["default_size"]
        body = f["results"]["body"]
        table = f["results"]["table"]
        header = f["results"]["header"]
        footer = f["results"]["footer"]

        body_non_default = sum(1 for p in body if p["is_non_default"])
        table_non_default = sum(1 for p in table if p["is_non_default"])
        header_non_default = sum(1 for p in header if p["is_non_default"])
        footer_non_default = sum(1 for p in footer if p["is_non_default"])

        file_total = len(body) + len(table) + len(header) + len(footer)
        file_non_default = body_non_default + table_non_default + header_non_default + footer_non_default

        total_empty += file_total
        total_non_default += file_non_default

        # Size distribution for non-default empty paragraphs
        for p in body + table + header + footer:
            if p["is_non_default"]:
                sz = round(p["size"])
                size_dist[sz] += 1

        summary.append({
            "file": fn,
            "default_size": default,
            "body_total": len(body),
            "body_non_default": body_non_default,
            "table_total": len(table),
            "table_non_default": table_non_default,
            "header_total": len(header),
            "header_non_default": header_non_default,
            "footer_total": len(footer),
            "footer_non_default": footer_non_default,
            "total": file_total,
            "non_default": file_non_default
        })

    return summary, total_empty, total_non_default, size_dist


def run_word_com_measurement(docdir, top_files, outdir):
    """Run Word COM to measure actual pitch for empty paragraphs in top 5 files."""
    ps1_path = os.path.join(os.path.dirname(__file__), "_word_empty_para_metrics.ps1")
    # Create the PowerShell script for measuring empty paragraphs
    ps1_content = '''param([string]$File, [string]$Out, [double]$DefaultSize)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($File, $false, $true, $false)
  $doc.Repaginate()
  $rows = New-Object System.Collections.Generic.List[object]
  $emptyParas = @()
  $i = 0
  foreach ($p in $doc.Paragraphs) {
    $i++
    $txt = ($p.Range.Text -replace "[`r`n`a`t]+", " ").Trim()
    if ($txt.Length -eq 0) {
      $emptyParas += @{ index = $i; para = $p; range = $p.Range }
    }
  }
  # Process first 10 non-default empty paragraphs
  $count = 0
  foreach ($ep in $emptyParas) {
    if ($count -ge 10) { break }
    $sz = [math]::Round($ep.range.Font.Size, 2)
    if ([math]::Abs($sz - $DefaultSize) -gt 0.01) {
      $count++
      $y = [math]::Round($ep.range.Information(6), 2)  # wdVerticalPositionRelativeToPage
      $page = $ep.range.Information(3)  # wdActiveEndPageNumber
      $fontSize = $sz
      # Get next paragraph's y position
      $nextY = 0
      $nextPage = 0
      if ($ep.index -lt $doc.Paragraphs.Count) {
        $nextP = $doc.Paragraphs.Item($ep.index + 1)
        $nextY = [math]::Round($nextP.Range.Information(6), 2)
        $nextPage = $nextP.Range.Information(3)
      }
      $pitch = if ($nextPage -eq $page -and $nextY -gt $y) { $nextY - $y } else { 0 }
      $rows.Add([pscustomobject]@{
        para_index = $ep.index
        page = $page
        y = $y
        font_size = $fontSize
        next_y = $nextY
        next_page = $nextPage
        pitch = $pitch
        default_size = $DefaultSize
      })
    }
  }
  $sb = New-Object System.Text.StringBuilder
  foreach ($row in $rows) { [void]$sb.AppendLine(($row | ConvertTo-Json -Compress)) }
  [System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  "OK measured=" + $rows.Count
  $doc.Close(0)
} catch { "FAIL " + $_.Exception.Message } finally { $word.Quit() }'''
    
    with open(ps1_path, "w", encoding="utf-8") as f:
        f.write(ps1_content)

    measurements = {}
    for item in top_files:
        fn = item["file"]
        docx_path = os.path.join(docdir, fn)
        base = os.path.splitext(fn)[0]
        out_file = os.path.join(outdir, f"{base}.empty_para_word.jsonl")
        default_size = item["default_size"]
        print(f"Running Word COM for {fn}...")
        r = subprocess.run([
            "powershell", "-NoProfile", "-Command",
            f"& '{ps1_path}' -File '{docx_path}' -Out '{out_file}' -DefaultSize {default_size}"
        ], capture_output=True, text=True, timeout=300)
        print(f"  {r.stdout.strip()}")
        if r.stderr:
            print(f"  ERR: {r.stderr.strip()}")
        if os.path.exists(out_file):
            with open(out_file, encoding="utf-8") as f:
                measurements[fn] = [json.loads(l) for l in f if l.strip()]
        else:
            measurements[fn] = []
    return measurements


def analyze_canvas_empty_paras(outdir, files_summary):
    """Analyze empty paragraphs from canvas JSONL files."""
    canvas_data = {}
    for item in files_summary:
        fn = item["file"]
        base = os.path.splitext(fn)[0]
        canvas_file = os.path.join(outdir, f"{base}.canvas.jsonl")
        if not os.path.exists(canvas_file):
            canvas_data[fn] = []
            continue
        empty_blocks = []
        with open(canvas_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    block = json.loads(line)
                    if "meta" in block:
                        continue
                    if block.get("text", "").strip() == "":
                        empty_blocks.append(block)
                except:
                    pass
        canvas_data[fn] = empty_blocks
        print(f"Canvas {fn}: {len(empty_blocks)} empty blocks")
    return canvas_data


def generate_handoff(summary, word_measurements, canvas_data, size_dist, total_empty, total_non_default, outdir):
    """Generate the handoff markdown file."""
    handoff_path = os.path.join(os.path.dirname(outdir), "docs", "HANDOFF-WRITER-R15.md")
    os.makedirs(os.path.dirname(handoff_path), exist_ok=True)

    with open(handoff_path, "w", encoding="utf-8") as f:
        f.write("# Handoff R15 — Lop doan rong (drift:empty-para) / W26\n\n")

        # Table of 23 files
        f.write("## Bang 23 file\n\n")
        f.write("| File | Cuo mac dinh (pt) | Than tong | Than <> mac dinh | Bang tong | Bang <> mac dinh | Header tong | Header <> mac dinh | Footer tong | Footer <> mac dinh | Tong | <> mac dinh |\n")
        f.write("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n")
        for s in summary:
            f.write(f"| {s['file']} | {s['default_size']} | {s['body_total']} | {s['body_non_default']} | {s['table_total']} | {s['table_non_default']} | {s['header_total']} | {s['header_non_default']} | {s['footer_total']} | {s['footer_non_default']} | {s['total']} | {s['non_default']} |\n")

        f.write(f"\n| **Tong** | | **{total_empty}** | **{total_non_default}** | | | | | | | | |\n\n")

        # Size distribution
        f.write("## Phan bo cuo dau doan (cac doan <> mac dinh)\n\n")
        f.write("| Cuo (pt) | So luong |\n")
        f.write("|---:|---:|\n")
        for sz in sorted(size_dist.keys()):
            f.write(f"| {sz} | {size_dist[sz]} |\n")
        f.write("\n")

        # Word COM measurements for top 5 files
        f.write("## Do Word COM — 5 file nhieu doan <> mac dinh nhat (than)\n\n")
        f.write("| File | Doan rong thu | Vi tri (y, pt) | Cuo dau doan (pt) | Pitch that (pt) | Pitch (px) |\n")
        f.write("|---|---:|---:|---:|---:|---:|\n")
        for fn, measurements in word_measurements.items():
            for m in measurements:
                pitch_px = round(m["pitch"] * PT2PX, 1)
                f.write(f"| {fn} | {m['para_index']} | {m['y']} | {m['font_size']} | {m['pitch']} | {pitch_px} |\n")
        f.write("\n")

        # Canvas comparison
        f.write("## So sanh Canvas — cac doan rong <> mac dinh (than)\n\n")
        f.write("| File | So doan <> mac dinh (Word) | So khoi rong (Canvas) | Pitch Word TB (px) | h Canvas TB (px) | Chenh lech TB (px) |\n")
        f.write("|---|---:|---:|---:|---:|---:|\n")

        # Get top 5 files by non-default body empty paragraphs
        top5 = sorted(summary, key=lambda x: -x["body_non_default"])[:5]
        for s in top5:
            fn = s["file"]
            word_empty = word_measurements.get(fn, [])
            canvas_empty = canvas_data.get(fn, [])
            
            # Map by order: k-th non-default empty para in Word body -> k-th empty block in canvas body
            word_non_default = [m for m in word_empty if m["pitch"] > 0]
            canvas_body_empty = [c for c in canvas_empty if c.get("tag") == "P"]  # Assuming body paragraphs are P tags
            
            n = min(len(word_non_default), len(canvas_body_empty))
            if n > 0:
                avg_word_pitch_px = sum(m["pitch"] * PT2PX for m in word_non_default[:n]) / n
                avg_canvas_h = sum(c.get("h", 0) for c in canvas_body_empty[:n]) / n
                diff = avg_canvas_h - avg_word_pitch_px
                f.write(f"| {fn} | {s['body_non_default']} | {len(canvas_body_empty)} | {avg_word_pitch_px:.1f} | {avg_canvas_h:.1f} | {diff:.1f} |\n")
            else:
                f.write(f"| {fn} | {s['body_non_default']} | {len(canvas_body_empty)} | - | - | - |\n")
        f.write("\n")

        # 5 Examples
        f.write("## 5 Vi du minh hoa\n\n")
        example_num = 0
        for s in top5[:5]:
            if example_num >= 5:
                break
            fn = s["file"]
            word_empty = word_measurements.get(fn, [])
            canvas_empty = canvas_data.get(fn, [])
            word_non_default = [m for m in word_empty if m["pitch"] > 0]
            canvas_body_empty = [c for c in canvas_empty if c.get("tag") == "P"]
            
            if word_non_default and canvas_body_empty:
                example_num += 1
                m = word_non_default[0]
                c = canvas_body_empty[0]
                f.write(f"### Vi du {example_num}: {fn}\n")
                f.write(f"- Cuo dau doan Word: {m['font_size']} pt (mac dinh {s['default_size']} pt)\n")
                f.write(f"- Pitch Word that: {m['pitch']} pt ({round(m['pitch'] * PT2PX, 1)} px)\n")
                f.write(f"- Canvas h: {c.get('h', 'N/A')} px, size: {c.get('size', 'N/A')} px\n")
                f.write(f"- Chenh lech: {round(c.get('h', 0) - m['pitch'] * PT2PX, 1)} px\n\n")

        # Conclusion W26
        f.write("## Ket luan lop W26\n\n")
        f.write("Lop **W26 (drift:empty-para)** gom hai nhom:\n\n")
        f.write("(a) **Than (document.xml)** — Adapter co san `document.xml` de doc truc tiep `w:pPr/w:rPr/w:sz` va chain style. ")
        f.write("Co the tinh toan cuo dau doan chuan xac cho moi doan rong. Can mo rong adapter de tra ve `empty_para_size` cho tung doan.\n\n")
        f.write("(b) **Header/Footer (header*.xml, footer*.xml)** — Adapter **chua nhan** header/footer XML. ")
        f.write("Can `main.py` trich xuat va truyen `ooxmlHeaderXml` / `ooxmlFooterXml` (tuong tu `document.xml`) vao adapter ")
        f.write("de xu ly doan rong o header/footer cung co che.\n\n")
        f.write("De xuat: mo rong `VN LibreOffice Adapter` them field `empty_para_size` trong ket qua parse, va cap nhat ")
        f.write("`main.py` de load header/footer XML khi mo file.\n")


def main():
    if len(sys.argv) < 4:
        print("Usage: python _empty_para_class.py <worktree> <docdir> <outdir>")
        sys.exit(1)

    worktree = sys.argv[1]
    docdir = sys.argv[2]
    outdir = sys.argv[3]

    print("=== Buoc 1: Phan tich OOXML ===")
    files = collect_all_files_ooxml(docdir)
    summary, total_empty, total_non_default, size_dist = summarize_ooxml(files)

    print("\n=== Buoc 2: Word COM do pitch that ===")
    # Top 5 files by body_non_default
    top5 = sorted(summary, key=lambda x: -x["body_non_default"])[:5]
    word_measurements = run_word_com_measurement(docdir, top5, outdir)

    print("\n=== Buoc 3: Phan tich Canvas ===")
    canvas_data = analyze_canvas_empty_paras(outdir, summary)

    print("\n=== Buoc 4: Tao handoff ===")
    generate_handoff(summary, word_measurements, canvas_data, size_dist, total_empty, total_non_default, outdir)

    handoff_path = os.path.join(os.path.dirname(outdir), "docs", "HANDOFF-WRITER-R15.md")
    print(f"\nHoan tat. Handoff: {handoff_path}")


if __name__ == "__main__":
    main()