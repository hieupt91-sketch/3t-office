"""_roundtrip_save_sheet.py: Real app round-trip save for Sheet.
Opens an XLSX via VnOfficeApi (LibreOffice + native import overlay),
loads it into SheetAdapter and re-serializes with serializeToFods() (via Node.js),
then saves it back to XLSX via save_document_dialog (LibreOffice + postprocess_sheet_xlsx).
"""
import os
import sys
import json
import tempfile
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import main

ROOT = Path(__file__).resolve().parent

def run_roundtrip(input_xlsx: str, output_xlsx: str = None) -> str:
    input_path = os.path.abspath(input_xlsx)
    if not output_xlsx:
        output_xlsx = os.path.join(tempfile.gettempdir(), f"saved_{Path(input_xlsx).name}")
    output_path = os.path.abspath(output_xlsx)

    print(f"[Roundtrip] 1. Opening {input_path} via VnOfficeApi...")
    api = main.VnOfficeApi("sheet", input_path)
    with patch.object(main, "_active_window", return_value=None):
        open_payload = api.open_document_dialog("sheet")
    
    if open_payload.get("status") != "ok":
        raise RuntimeError(f"Open failed: {open_payload}")

    fods_in = open_payload.get("content", "")
    wb_xml = open_payload.get("ooxmlWorkbookXml", "")
    print(f"  FODS size from open: {len(fods_in)} bytes")

    grid_url = (ROOT / "apps/sheet/sheet-grid.js").as_uri()
    adapter_url = (ROOT / "adapters/libreoffice/sheet/sheet-adapter.js").as_uri()
    with tempfile.TemporaryDirectory(prefix="vno_rt_") as tmp:
        fods_file = os.path.join(tmp, "in.fods")
        wb_file = os.path.join(tmp, "wb.xml")
        out_fods_file = os.path.join(tmp, "out.fods")
        
        with open(fods_file, "w", encoding="utf-8") as f:
            f.write(fods_in)
        if wb_xml:
            with open(wb_file, "w", encoding="utf-8") as f:
                f.write(wb_xml)
        
        js_code = f"""
import fs from "fs";
import {{ SheetAdapter }} from "{adapter_url}";
import {{ SheetGridController }} from "{grid_url}";

function container() {{
  return {{
    querySelector() {{ return null; }},
    querySelectorAll() {{ return []; }},
    addEventListener() {{}},
    classList: {{ add() {{}}, remove() {{}}, toggle() {{}} }}
  }};
}}

class FakeElement {{
  constructor(tagName) {{
    this.tagName = tagName;
    this.children = [];
    this.dataset = {{}};
    this.style = {{}};
    this.attributes = {{}};
    this._classes = new Set();
    this.classList = {{
      add: (...cls) => cls.forEach(c => this._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this._classes.delete(c)),
      contains: c => this._classes.has(c),
      toggle: (c, force) => {{
        const next = force !== undefined ? !!force : !this._classes.has(c);
        if (next) this._classes.add(c); else this._classes.delete(c);
        return next;
      }}
    }};
  }}
  get className() {{ return Array.from(this._classes).join(" "); }}
  set className(val) {{
    this._classes = new Set(String(val || "").split(/\\s+/).filter(Boolean));
  }}
  set innerHTML(_value) {{ this.children = []; }}
  append(...children) {{ this.children.push(...children); }}
  appendChild(child) {{ this.children.push(child); return child; }}
  setAttribute(name, value) {{ this.attributes[name] = value; }}
  addEventListener(_name, handler) {{ this.handler = handler; }}
  querySelector(sel) {{ return null; }}
}}

globalThis.document = {{
  createElement: tagName => new FakeElement(tagName),
  getElementById: () => null,
  body: new FakeElement("body")
}};
globalThis.window = globalThis;

const fods = fs.readFileSync({json.dumps(fods_file)}, "utf8");
let wbXml = "";
if (fs.existsSync({json.dumps(wb_file)})) {{
    wbXml = fs.readFileSync({json.dumps(wb_file)}, "utf8");
}}

const grid = new SheetGridController(container());
const adapter = new SheetAdapter(grid);
const success = adapter.loadFromFods(fods, wbXml);
if (!success) {{
    console.error("loadFromFods failed");
    process.exit(1);
}}
const serialized = adapter.serializeToFods();
fs.writeFileSync({json.dumps(out_fods_file)}, serialized, "utf8");
"""
        js_file = os.path.join(tmp, "serialize.mjs")
        with open(js_file, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        proc = subprocess.run(["node", js_file], cwd=str(ROOT), capture_output=True, text=True)
        if proc.returncode != 0:
            print("STDERR:", proc.stderr)
            raise RuntimeError(f"Node serialization failed: {proc.stderr}")
        
        with open(out_fods_file, "r", encoding="utf-8") as f:
            serialized_fods = f.read()

    print(f"  Serialized FODS size: {len(serialized_fods)} bytes")

    # 3. Save via save_document_dialog
    print(f"[Roundtrip] 3. Saving to {output_path} via save_document_dialog...")
    mock_window = MagicMock()
    mock_window.create_file_dialog.return_value = output_path
    with patch.object(main, "_active_window", return_value=mock_window):
        save_result = api.save_document_dialog(serialized_fods, "sheet", target_format="xlsx", source_path=input_path)
    
    if save_result.get("status") != "ok":
        raise RuntimeError(f"Save failed: {save_result}")

    print(f"  Saved successfully to {output_path}")
    
    # 4. Measure with _xlsx_tabs.py
    print("[Roundtrip] 4. Measuring with _xlsx_tabs.py:")
    proc = subprocess.run([sys.executable, "_xlsx_tabs.py", output_path], cwd=str(ROOT), capture_output=True, text=True)
    print(proc.stdout.strip())
    
    return output_path

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "file test/KHOACUA.xlsx"
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    run_roundtrip(src, dest)
