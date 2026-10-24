#!/usr/bin/env python3
"""ĐỘNG CƠ GIẢ CHỈ ĐỂ TỰ KIỂM harness (--selftest). KHÔNG phải OOXMLKit; kết quả qua mock KHÔNG BAO GIỜ
được tính là PASS của OOXMLKit. Giao thức giống ooxml-engine: mỗi dòng stdin = JSON {id,op,args}.
Chế độ lỗi qua env MOCK_FAULT: drop_part (làm rơi 1 phần khi lưu), corrupt_xml (làm hỏng XML).
"""
import base64, io, json, os, sys, zipfile

docs, n = {}, 0
FAULT = os.environ.get("MOCK_FAULT", "")

def kind(z):
    names = z.namelist()
    return "docx" if "word/document.xml" in names else "xlsx" if "xl/workbook.xml" in names else "pptx"

def save_bytes(d):
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        first = True
        for name, data in d["parts"]:
            if FAULT == "drop_part" and name.endswith("styles.xml"): continue
            if FAULT == "corrupt_xml" and name.endswith("document.xml"): data = data + b"<broken"
            z.writestr(name, data)
    return out.getvalue()

def handle(req):
    global n
    op, a = req["op"], req.get("args", {})
    if op == "open":
        raw = open(a["path"], "rb").read()
        z = zipfile.ZipFile(io.BytesIO(raw)); n += 1; h = f"h{n}"
        docs[h] = {"parts": [(i.filename, z.read(i.filename)) for i in z.infolist()], "kind": kind(z), "marker": []}
        return info(h)
    d = docs[a["handle"]]
    if op == "info": return info(a["handle"])
    if op == "doc.appendParagraph":
        parts = dict(d["parts"]); x = parts["word/document.xml"].decode("utf-8")
        i = x.rfind("<w:sectPr"); i = i if i >= 0 else x.rfind("</w:body>")
        x = x[:i] + f"<w:p><w:r><w:t>{a['text']}</w:t></w:r></w:p>" + x[i:]
        d["parts"] = [(k, x.encode("utf-8") if k == "word/document.xml" else v) for k, v in d["parts"]]; d["marker"].append(a["text"]); return {}
    if op == "doc.read":
        import re
        x = dict(d["parts"])["word/document.xml"].decode("utf-8", "replace")
        ts = [m.replace("&amp;", "&") for m in re.findall(r"<w:t[^>]*>([^<]*)</w:t>", x)]
        return {"paragraphs": [{"text": t} for t in ts], "total": len(ts)}
    if op == "save": open(a["path"], "wb").write(save_bytes(d)); return {}
    if op == "exportBytes": return {"base64": base64.b64encode(save_bytes(d)).decode()}
    if op == "close": docs.pop(a["handle"], None); return {}
    raise ValueError("mock không hỗ trợ " + op)

def info(h):
    d = docs[h]; return {"handle": h, "kind": d["kind"], "parts": len(d["parts"])}

for line in sys.stdin:
    r = json.loads(line)
    try: out = {"id": r["id"], "ok": True, "result": handle(r)}
    except Exception as e: out = {"id": r["id"], "ok": False, "error": {"code": "mock", "message": str(e)}}
    print(json.dumps(out), flush=True)
