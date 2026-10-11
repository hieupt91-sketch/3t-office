"""Audit test files for:
1. Odd w:sz values (half-point font size)
2. Empty paragraphs with non-default font size
"""
import os
import sys
import glob
import re
import io
import zipfile
import subprocess
import tempfile
import xml.etree.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

def analyze_docx_bytes(docx_bytes):
    try:
        z = zipfile.ZipFile(io.BytesIO(docx_bytes))
    except Exception as e:
        return {"error": str(e)}

    styles_xml = ""
    if "word/styles.xml" in z.namelist():
        styles_xml = z.read("word/styles.xml").decode("utf-8", errors="replace")

    # docDefaults sz
    doc_default_sz = 20  # default 10pt (w:sz=20) in Word if not specified
    m_dd = re.search(r"<w:docDefaults>[\s\S]*?</w:docDefaults>", styles_xml)
    if m_dd:
        m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', m_dd.group(0))
        if m:
            doc_default_sz = int(m.group(1))

    # Also check Normal style sz if any
    normal_sz = doc_default_sz
    for sm in re.finditer(r'<w:style\b([^>]*)>([\s\S]*?)</w:style>', styles_xml):
        if 'w:styleId="Normal"' in sm.group(1) or 'w:styleId="normal"' in sm.group(1):
            m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', sm.group(2))
            if m:
                normal_sz = int(m.group(1))

    odd_sz_styles = set(re.findall(r'<w:sz\b[^>]*w:val="(\d*[13579])"', styles_xml))

    doc_xml = ""
    if "word/document.xml" in z.namelist():
        doc_xml = z.read("word/document.xml").decode("utf-8", errors="replace")

    odd_sz_doc = set(re.findall(r'<w:sz\b[^>]*w:val="(\d*[13579])"', doc_xml))
    all_odd_sz = sorted(list(odd_sz_styles | odd_sz_doc), key=int)

    empty_paras_non_default = []
    total_empty_paras = 0
    total_paras = 0

    try:
        root = ET.fromstring(doc_xml)
        for p_idx, p in enumerate(root.iter(f"{{{W_NS}}}p")):
            total_paras += 1
            texts = [t.text for t in p.iter(f"{{{W_NS}}}t") if t.text]
            full_text = "".join(texts).strip()
            has_drawing = (p.find(f".//{{{W_NS}}}drawing") is not None or
                           p.find(".//{urn:schemas-microsoft-com:vml}shape") is not None)
            if not full_text and not has_drawing:
                total_empty_paras += 1
                # Check font size
                p_sz = None
                pPr = p.find(f"{{{W_NS}}}pPr")
                if pPr is not None:
                    rPr = pPr.find(f"{{{W_NS}}}rPr")
                    if rPr is not None:
                        sz_el = rPr.find(f"{{{W_NS}}}sz")
                        if sz_el is not None:
                            val = sz_el.get(f"{{{W_NS}}}val")
                            if val and val.isdigit():
                                p_sz = int(val)
                if p_sz is None:
                    for r in p.findall(f"{{{W_NS}}}r"):
                        rPr = r.find(f"{{{W_NS}}}rPr")
                        if rPr is not None:
                            sz_el = rPr.find(f"{{{W_NS}}}sz")
                            if sz_el is not None:
                                val = sz_el.get(f"{{{W_NS}}}val")
                                if val and val.isdigit():
                                    p_sz = int(val)
                                    break
                # Non-default means it has an explicit size different from normal_sz / doc_default_sz
                if p_sz is not None and p_sz != normal_sz:
                    empty_paras_non_default.append((p_idx, p_sz, normal_sz))
    except Exception as e:
        return {
            "error": str(e),
            "has_odd_sz": bool(all_odd_sz),
            "odd_sz_values": all_odd_sz,
        }

    return {
        "doc_default_sz": doc_default_sz,
        "normal_sz": normal_sz,
        "has_odd_sz": bool(all_odd_sz),
        "odd_sz_values": all_odd_sz,
        "total_paras": total_paras,
        "total_empty_paras": total_empty_paras,
        "empty_paras_non_default_count": len(empty_paras_non_default),
        "sample_empty_paras": empty_paras_non_default[:3],
    }

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import find_soffice, SOFFICE_PATH

def convert_doc_to_docx(doc_path, soffice_cmd=None):
    if soffice_cmd is None:
        soffice_cmd = SOFFICE_PATH or find_soffice()
    if not soffice_cmd or not os.path.exists(soffice_cmd):
        return None
    with tempfile.TemporaryDirectory() as tmpdir:
        res = subprocess.run([soffice_cmd, "--headless", "--convert-to", "docx", doc_path, "--outdir", tmpdir],
                             capture_output=True, text=True, timeout=60)
        base = os.path.splitext(os.path.basename(doc_path))[0]
        out_docx = os.path.join(tmpdir, base + ".docx")
        if os.path.exists(out_docx):
            with open(out_docx, "rb") as f:
                return f.read()
    return None

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    folders = [
        os.path.join(root, "file test", "lan"),
        os.path.join(root, "file test", "landocx"),
        os.path.join(root, "file test", "lan-legacy"),
    ]

    all_files = []
    for fld in folders:
        if os.path.isdir(fld):
            docx_files = sorted(glob.glob(os.path.join(fld, "*.docx")))
            doc_files = sorted(glob.glob(os.path.join(fld, "*.doc")))
            all_files.extend([(p, "docx") for p in docx_files])
            all_files.extend([(p, "doc") for p in doc_files])

    print(f"Total files found in target folders: {len(all_files)}")

    results = []
    odd_sz_count = 0
    empty_para_non_default_count = 0

    for idx, (fpath, ftype) in enumerate(all_files, 1):
        rel_path = os.path.relpath(fpath, root)
        if ftype == "docx":
            with open(fpath, "rb") as f:
                data = f.read()
        else:
            data = convert_doc_to_docx(fpath)
            if data is None:
                print(f"[{idx}/{len(all_files)}] {rel_path}: FAILED to convert .doc")
                results.append((rel_path, ftype, {"error": "soffice convert failed"}))
                continue

        stats = analyze_docx_bytes(data)
        has_odd = stats.get("has_odd_sz", False)
        has_empty_nd = stats.get("empty_paras_non_default_count", 0) > 0

        if has_odd:
            odd_sz_count += 1
        if has_empty_nd:
            empty_para_non_default_count += 1

        results.append((rel_path, ftype, stats))
        print(f"[{idx}/{len(all_files)}] {rel_path} ({ftype}): "
              f"odd_sz={stats.get('odd_sz_values', [])} "
              f"empty_nd={stats.get('empty_paras_non_default_count', 0)}/{stats.get('total_empty_paras', 0)}")

    print("\n" + "=" * 60)
    print("SUMMARY AUDIT:")
    print(f"Total files audited: {len(results)}")
    print(f"Files with odd w:sz (half-point): {odd_sz_count} / {len(results)}")
    print(f"Files with empty paragraphs having non-default font size: {empty_para_non_default_count} / {len(results)}")
    print("=" * 60)

    # Detailed list of odd sz files
    print("\nFiles with odd w:sz:")
    for rel_path, ftype, stats in results:
        if stats.get("has_odd_sz"):
            print(f"  - {rel_path}: sz values={stats.get('odd_sz_values')}")

    # Detailed list of empty para non default files
    print("\nFiles with empty paras with non-default sz:")
    for rel_path, ftype, stats in results:
        if stats.get("empty_paras_non_default_count", 0) > 0:
            print(f"  - {rel_path}: {stats['empty_paras_non_default_count']} empty paras, sample={stats.get('sample_empty_paras')}")

if __name__ == "__main__":
    main()
