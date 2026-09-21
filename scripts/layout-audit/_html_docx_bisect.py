#!/usr/bin/env python3
"""
Usage: python _html_docx_bisect.py <worktree> <html_file> <outdir>
Bisect HTML to find what causes LibreOffice to duplicate nested tables when converting HTML -> DOCX.
Counts <w:tbl> (exact opening tags) in word/document.xml.
"""
import os
import sys
import tempfile
import shutil
import zipfile
import re
from pathlib import Path

ROOT, HTML_FILE, OUTDIR = [os.path.abspath(a) for a in sys.argv[1:4]]
sys.path.insert(0, ROOT)
import main as vnmain

def count_w_tbl(docx_path: str) -> int:
    """Count <w:tbl opening tags in word/document.xml."""
    try:
        z = zipfile.ZipFile(docx_path)
        x = z.read("word/document.xml").decode("utf-8", "replace")
    except Exception as e:
        print(f"  Error reading {docx_path}: {e}")
        return -1
    # Remove txbxContent to avoid counting tables in text boxes
    body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", x)
    # Count actual <w:tbl> opening tags (with word boundary to avoid matching w:tblW, w:tblPr, etc.)
    return len(re.findall(r"<w:tbl\b", body))

def html_to_docx(html_path: str, tmp: str) -> str:
    """Convert HTML to DOCX using the app's conversion path."""
    out_docx = vnmain._run_soffice_convert(html_path, "docx", tmp, app_kind="writer")
    return out_docx

def save_variant(html: str, name: str, outdir: str) -> str:
    """Save HTML variant to file."""
    path = os.path.join(outdir, f"{name}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path

def run_bisect(base_html: str, name: str, tmp: str, outdir: str) -> int:
    """Convert a single HTML variant and return table count."""
    html_path = save_variant(base_html, name, outdir)
    try:
        docx_path = html_to_docx(html_path, tmp)
        count = count_w_tbl(docx_path)
        print(f"  {name}: {count} tables")
        # Copy docx for inspection
        shutil.copy2(docx_path, os.path.join(outdir, f"{name}.docx"))
        return count
    except Exception as e:
        print(f"  {name}: ERROR - {e}")
        return -1

def strip_attrs_from_tag(html: str, tag: str, attrs_to_remove: list) -> str:
    """Remove specific attributes from all occurrences of a tag."""
    pattern = rf"(<{tag}\b)([^>]*?)(>)"
    def repl(m):
        prefix, attrs, suffix = m.groups()
        for attr in attrs_to_remove:
            attrs = re.sub(rf'\s+{attr}\s*=\s*["\'][^"\']*["\']', '', attrs, flags=re.IGNORECASE)
        return prefix + attrs + suffix
    return re.sub(pattern, repl, html, flags=re.IGNORECASE)

def strip_all_attrs_except(html: str, tag: str, keep_attrs: list) -> str:
    """Keep only specified attributes on a tag, remove all others."""
    pattern = rf"(<{tag}\b)([^>]*?)(>)"
    def repl(m):
        prefix, attrs, suffix = m.groups()
        # Extract all attributes
        attr_pattern = r'(\w+(?:-\w+)?)\s*=\s*["\'][^"\']*["\']'
        matches = list(re.finditer(attr_pattern, attrs, re.IGNORECASE))
        new_attrs = ""
        for match in matches:
            attr_name = match.group(1).lower()
            if attr_name in [a.lower() for a in keep_attrs]:
                new_attrs += " " + match.group(0)
        return prefix + new_attrs + suffix
    return re.sub(pattern, repl, html, flags=re.IGNORECASE)

def remove_tag_wrapping(html: str, outer_tag: str, inner_tag: str) -> str:
    """Remove outer_tag but keep inner_tag content (unwrap)."""
    pattern = rf"<{outer_tag}\b[^>]*>([\s\S]*?)</{outer_tag}\s*>"
    def repl(m):
        content = m.group(1)
        # Only unwrap if inner_tag is directly inside
        if re.search(rf"^\s*<{inner_tag}\b", content, re.IGNORECASE):
            return content
        return m.group(0)
    return re.sub(pattern, repl, html, flags=re.IGNORECASE)

def main():
    if len(sys.argv) < 4:
        print("Usage: python _html_docx_bisect.py <worktree> <html_file> <outdir>")
        sys.exit(1)

    os.makedirs(OUTDIR, exist_ok=True)

    # Read base HTML
    with open(HTML_FILE, "r", encoding="utf-8", errors="replace") as f:
        base_html = f.read()

    print(f"Base HTML: {HTML_FILE}")
    print(f"Output dir: {OUTDIR}")

    tmp = tempfile.mkdtemp(prefix="bisect_")
    print(f"Temp dir: {tmp}")

    results = {}

    try:
        # Step 0: Baseline - full stage2_export.html
        print("\n=== BASELINE ===")
        results["00_baseline"] = run_bisect(base_html, "00_baseline", tmp, OUTDIR)

        # Step 1: Keep only the layout table that contains the nested table
        # Find the two tables and surrounding context
        tables = list(re.finditer(r"<table\b[\s\S]*?</table\s*>", base_html, re.IGNORECASE))
        if len(tables) >= 2:
            # Get the layout table (table 0) and the paragraph + financial table after it
            layout_table = tables[0].group(0)
            # Find content between table 0 and table 1
            between = base_html[tables[0].end():tables[1].start()]
            financial_table = tables[1].group(0)

            # Variant 1: Only layout table + financial table (no other content)
            html_v1 = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
{layout_table}
{between}
{financial_table}
</body></html>"""
            print("\n=== STEP 1: Only layout + financial table ===")
            results["01_layout_only"] = run_bisect(html_v1, "01_layout_only", tmp, OUTDIR)

            # Step 2: Remove attributes from layout table
            print("\n=== STEP 2: Remove layout table attributes ===")
            layout_attrs = ["width", "style", "cellpadding", "border", "cellspacing", "class", "data-*"]
            html_v2 = strip_all_attrs_except(html_v1, "table", [])  # Remove all table attrs
            results["02_no_layout_table_attrs"] = run_bisect(html_v2, "02_no_layout_table_attrs", tmp, OUTDIR)

            # Try removing specific attrs one by one
            for attr in ["width", "cellpadding", "cellspacing", "border"]:
                html_v = strip_attrs_from_tag(html_v1, "table", [attr])
                results[f"02_no_{attr}"] = run_bisect(html_v, f"02_no_{attr}", tmp, OUTDIR)

            # Step 3: Remove attributes from layout table's td that contains financial table
            print("\n=== STEP 3: Remove td attributes ===")
            # Find the td containing the financial table
            td_attrs = ["width", "style", "bgcolor", "valign", "align", "height", "class", "data-*"]
            for attr in ["width", "style", "bgcolor", "valign"]:
                html_v = strip_attrs_from_tag(html_v1, "td", [attr])
                results[f"03_td_no_{attr}"] = run_bisect(html_v, f"03_td_no_{attr}", tmp, OUTDIR)

            # Step 4: Remove attributes from financial table
            print("\n=== STEP 4: Remove financial table attributes ===")
            fin_attrs = ["dir", "align", "hspace", "cellpadding", "cellspacing", "width", "style", "border", "class", "data-*"]
            for attr in ["dir", "align", "hspace", "cellpadding", "cellspacing", "width"]:
                html_v = strip_attrs_from_tag(html_v1, "table", [attr])  # affects both tables
                results[f"04_fin_no_{attr}"] = run_bisect(html_v, f"04_fin_no_{attr}", tmp, OUTDIR)

            # Step 5: Replace financial table with simple paragraph
            print("\n=== STEP 5: Replace financial table with <p> ===")
            html_v5 = html_v1.replace(financial_table, "<p>Financial table placeholder</p>")
            results["05_fin_replaced_with_p"] = run_bisect(html_v5, "05_fin_replaced_with_p", tmp, OUTDIR)

            # Step 6: Minimal nested table test - simple 2x1 layout table with 2x2 nested table
            print("\n=== STEP 6: Minimal nested table test ===")
            minimal_nested = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>
<table><tr><td>Nested A</td><td>Nested B</td></tr><tr><td>Nested C</td><td>Nested D</td></tr></table>
</body></html>"""
            results["06_minimal_two_separate"] = run_bisect(minimal_nested, "06_minimal_two_separate", tmp, OUTDIR)

            # Actually nested
            minimal_truly_nested = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<table><tr><td>Outer 1</td><td>Outer 2<table><tr><td>Inner A</td><td>Inner B</td></tr><tr><td>Inner C</td><td>Inner D</td></tr></table></td></tr></table>
</body></html>"""
            results["06b_minimal_truly_nested"] = run_bisect(minimal_truly_nested, "06b_minimal_truly_nested", tmp, OUTDIR)

            # Step 7: Test with the actual financial table nested inside a minimal layout td
            print("\n=== STEP 7: Minimal layout td with actual financial table ===")
            minimal_with_real_fin = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<table><tr><td>Label</td><td>{financial_table}</td></tr></table>
</body></html>"""
            results["07_minimal_layout_real_fin"] = run_bisect(minimal_with_real_fin, "07_minimal_layout_real_fin", tmp, OUTDIR)

            # Step 8: Test HTML -> ODT -> DOCX (two-step conversion)
            print("\n=== STEP 8: HTML -> ODT -> DOCX ===")
            try:
                odt_path = vnmain._run_soffice_convert(os.path.join(OUTDIR, "00_baseline.html"), "odt", tmp, app_kind="writer")
                docx_from_odt = vnmain._run_soffice_convert(odt_path, "docx", tmp, app_kind="writer")
                count = count_w_tbl(docx_from_odt)
                print(f"  08_html_odt_docx: {count} tables")
                results["08_html_odt_docx"] = count
                shutil.copy2(docx_from_odt, os.path.join(OUTDIR, "08_html_odt_docx.docx"))
            except Exception as e:
                print(f"  08_html_odt_docx: ERROR - {e}")
                results["08_html_odt_docx"] = -1

        # Summary
        print("\n=== SUMMARY ===")
        for k, v in results.items():
            print(f"  {k}: {v} tables")

        # Write results JSON
        import json
        with open(os.path.join(OUTDIR, "bisect_results.json"), "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    main()