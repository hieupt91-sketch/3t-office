import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
import main


output_dir = Path(sys.argv[1]).resolve()
output_dir.mkdir(parents=True, exist_ok=True)
main._PERSISTENT_SOFFICE_ENABLED = True

try:
    for index, raw_path in enumerate(sys.argv[2:]):
        source = Path(raw_path).resolve()
        target = output_dir / f"{index:02d}-{source.stem}.json"
        if target.is_file():
            print(f"EXTRACT_CACHED {source.name}", flush=True)
            continue
        api = main.VnOfficeApi(app_kind="writer", initial_file=str(source))
        result = api._open_document_dialog_impl("writer")
        if result.get("status") != "ok":
            print(f"EXTRACT_FAIL {source.name} status={result.get('status')} message={result.get('message')}", flush=True)
            continue
        target.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        print(f"EXTRACT_OK {source.name} chars={len(result.get('content') or '')}", flush=True)
finally:
    main._PERSISTENT_SOFFICE.shutdown()
