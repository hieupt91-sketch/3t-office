import os, sys, json

ROOT = os.path.abspath(".")
sys.path.insert(0, ROOT)
import main as vnmain

PAYLOAD_DIR = os.path.join(ROOT, "docs", "screenshots", "r11", "payloads")
os.makedirs(PAYLOAD_DIR, exist_ok=True)

# Verification files for L1-L5, L9 and 6 new workbooks
sheet_files = [
    # L1-L5, L9 verification:
    "lan02.xlsx", "lan03.xlsx", "lan12.xlsx", "lan26.xlsx", "lan28.xlsx",
    # 6 new workbooks:
    "lan04.xlsx", "lan07.xlsx", "lan08.xlsx", "lan10.xlsx", "lan13.xlsx", "lan16.xlsx"
]

for name in sheet_files:
    out_json = os.path.join(PAYLOAD_DIR, f"sheet_{name}.json")
    if os.path.exists(out_json) and os.path.getsize(out_json) > 100:
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

# Verification files for L6, L8 and 4 new docx
writer_files = [
    # L6, L8 verification:
    "d09.docx", "d13.docx",
    # 4 new docx:
    "d02.docx", "d11.docx", "d16.docx", "d20.docx"
]

for name in writer_files:
    out_json = os.path.join(PAYLOAD_DIR, f"writer_{name}.json")
    if os.path.exists(out_json) and os.path.getsize(out_json) > 100:
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

print("ALL R11 PAYLOADS PREPARED SUCCESSFULLY!")
