"""Structural validation of OOXML packages, independent of OOXMLKit and of the G0 harness (ENGINE-MAC-2410).
Checks: unzip -t (CRC), duplicate ZIP entries, every .xml/.rels/.vml part parses (xml.etree),
[Content_Types].xml covers every part (Default by extension or Override), Overrides point to real parts,
every internal relationship target exists, duplicate rel Ids, and single-valued relationship types
(e.g. a slide with two notesSlide relationships).
usage: python3 -I -B tests/macos/oracle/ooxml_structural_check.py <dir>  -> per-file JSON lines + SUMMARY.
Exit code: 0 all files clean, 1 otherwise."""
import sys, os, zipfile, posixpath, json, subprocess, collections
import xml.etree.ElementTree as ET
CT="{http://schemas.openxmlformats.org/package/2006/content-types}"
RL="{http://schemas.openxmlformats.org/package/2006/relationships}"
UNIQUE_PER_SOURCE={"notesSlide","slideLayout","notesMaster","slideMaster","theme","officeDocument","styles","sharedStrings","settings"}
def check(path):
    r={"file":path,"errors":[],"warnings":[]}
    t=subprocess.run(["unzip","-tqq",path],capture_output=True,text=True)
    r["unzip_t"]="OK" if t.returncode==0 else "FAIL"
    if t.returncode: r["errors"].append("unzip -t: "+(t.stdout+t.stderr).strip()[:200])
    z=zipfile.ZipFile(path); names=[i.filename for i in z.infolist() if not i.filename.endswith("/")]
    dup=[n for n,c in collections.Counter(names).items() if c>1]
    if dup: r["errors"].append(f"duplicate zip entries {dup}")
    nset=set(names); xml_parts=[n for n in names if n.endswith((".xml",".rels",".vml"))]
    r["parts"]=len(names); r["xml_parts"]=len(xml_parts); bad=0
    for n in xml_parts:
        try: ET.fromstring(z.read(n))
        except ET.ParseError as e: bad+=1; r["errors"].append(f"XML parse {n}: {e}")
    r["xml_bad"]=bad
    # content types
    try:
        ct=ET.fromstring(z.read("[Content_Types].xml"))
        defaults={d.get("Extension","").lower() for d in ct.iter(CT+"Default")}
        overrides={o.get("PartName","").lstrip("/") for o in ct.iter(CT+"Override")}
        unc=[n for n in names if n!="[Content_Types].xml" and n not in overrides and posixpath.basename(n).rsplit(".",1)[-1].lower() not in defaults]
        dangling=[o for o in overrides if o not in nset]
        r["ct_uncovered"]=unc; r["ct_dangling_override"]=dangling
        if unc: r["errors"].append(f"parts without content type: {unc}")
        if dangling: r["warnings"].append(f"Override for missing part: {dangling}")
    except KeyError: r["errors"].append("missing [Content_Types].xml")
    # rels
    missing=0; total=0
    for n in names:
        if not n.endswith(".rels"): continue
        src_dir=posixpath.dirname(posixpath.dirname(n))
        src=posixpath.join(src_dir, posixpath.basename(n)[:-5]) if src_dir or posixpath.basename(n)!=".rels" else ""
        if posixpath.basename(n)!=".rels" and src not in nset: r["warnings"].append(f"rels for missing source part {src}")
        try: root=ET.fromstring(z.read(n))
        except ET.ParseError: continue
        types=collections.Counter(); ids=collections.Counter()
        for rel in root.iter(RL+"Relationship"):
            ids[rel.get("Id")]+=1; typ=rel.get("Type","").rsplit("/",1)[-1]; types[typ]+=1
            if rel.get("TargetMode")=="External": continue
            total+=1; tg=rel.get("Target","")
            tgt=tg.lstrip("/") if tg.startswith("/") else posixpath.normpath(posixpath.join(src_dir,tg))
            if tgt not in nset: missing+=1; r["errors"].append(f"{n}: {rel.get('Id')} -> {tgt} missing")
        for i,c in ids.items():
            if c>1: r["errors"].append(f"{n}: duplicate rel Id {i}")
        # single-valued relationship types per source part (PresentationML/WordprocessingML/SpreadsheetML)
        single={"slide":{"notesSlide","slideLayout"},"notesSlide":{"notesMaster","slide"},"slideLayout":{"slideMaster"},
                ".rels":{"officeDocument","core-properties","extended-properties"},"workbook":{"sharedStrings","styles","theme","calcChain"},
                "document":{"styles","settings","numbering","fontTable","footnotes","endnotes","comments","theme"}}
        key=posixpath.basename(n)[:-5]; key=".rels" if key=="" else key.split(".")[0].rstrip("0123456789")
        for typ,c in types.items():
            if c>1 and typ in single.get(key,()):
                r["errors"].append(f"{n}: {c} relationships of single-valued type '{typ}'")
    r["rels_internal"]=total; r["rels_missing"]=missing
    return r
def main(d):
    files=sorted(os.path.join(dp,f) for dp,_,fs in os.walk(d) for f in fs if f.endswith((".docx",".xlsx",".pptx")))
    res=[check(f) for f in files]
    for x in res: print(json.dumps(x,ensure_ascii=False))
    s={"files":len(res),"unzip_t_ok":sum(x["unzip_t"]=="OK" for x in res),
       "xml_parts":sum(x["xml_parts"] for x in res),"xml_bad":sum(x["xml_bad"] for x in res),
       "files_ct_complete":sum(not x.get("ct_uncovered") for x in res),
       "rels_internal":sum(x["rels_internal"] for x in res),"rels_missing":sum(x["rels_missing"] for x in res),
       "files_clean":sum(not x["errors"] for x in res),
       "files_with_errors":[(os.path.relpath(x["file"],d),x["errors"]) for x in res if x["errors"]],
       "files_with_warnings":[(os.path.relpath(x["file"],d),x["warnings"]) for x in res if x["warnings"]]}
    print("SUMMARY "+json.dumps(s,ensure_ascii=False,indent=1))
    return 0 if s["files_clean"]==s["files"] and s["files"] else 1
sys.exit(main(sys.argv[1]))
