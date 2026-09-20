import os, sys, json
ROOT = os.path.abspath(".")
sys.path.insert(0, ROOT)
import main as vnmain

PAYLOAD_DIR = os.path.join(ROOT, "docs", "screenshots", "payloads")
os.makedirs(PAYLOAD_DIR, exist_ok=True)

sheet_files = ["lan02.xlsx", "lan03.xlsx", "lan09.xlsx", "lan12.xlsx", "lan26.xlsx", "lan28.xlsx"]
for name in sheet_files:
    out_json = os.path.join(PAYLOAD_DIR, f"sheet_{name}.json")
    if os.path.exists(out_json):
        print(f"Already prepared: {out_json}")
        continue
    src = os.path.join(ROOT, "file test", "lan", name)
    print(f"Preparing Sheet payload: {name} ...", flush=True)
    api = vnmain.VnOfficeApi(app_kind="sheet", initial_file=src)
    res = api.open_document_dialog("sheet")
    if res.get("status") != "ok":
        print(f"ERROR preparing {name}: {res.get('message')}")
        continue
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False)
    print(f"Saved: {out_json} ({os.path.getsize(out_json):,} bytes)", flush=True)

writer_files = ["d07.docx", "d09.docx", "d13.docx"]
for name in writer_files:
    out_json = os.path.join(PAYLOAD_DIR, f"writer_{name}.json")
    if os.path.exists(out_json):
        print(f"Already prepared: {out_json}")
        continue
    src = os.path.join(ROOT, "file test", "landocx", name)
    print(f"Preparing Writer payload: {name} ...", flush=True)
    api = vnmain.VnOfficeApi(app_kind="writer", initial_file=src)
    res = api.open_document_dialog("writer")
    if res.get("status") != "ok":
        print(f"ERROR preparing {name}: {res.get('message')}")
        continue
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False)
    print(f"Saved: {out_json} ({os.path.getsize(out_json):,} bytes)", flush=True)

print("ALL PAYLOADS PREPARED SUCCESSFULLY!")
