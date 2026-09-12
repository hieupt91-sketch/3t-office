import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

src = sys.argv[1]
out_dir = sys.argv[2]
out = main._run_soffice_convert(src, "fods", out_dir, app_kind="sheet")
with open(out, encoding="utf-8", errors="replace") as f:
    content = f.read()
content = main._apply_native_import_overlay(src, content, "sheet")
with open(out, "w", encoding="utf-8") as f:
    f.write(content)
print(out)
