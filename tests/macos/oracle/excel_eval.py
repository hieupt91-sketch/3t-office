"""Excel for Mac oracle for tests/functions/cases-*.json (ORACLE-1).

For each cases file: build a NEW unsaved workbook inside Excel (no file is opened, so no
sandbox "Grant File Access" prompt), type the input cells (`cells` on Sheet1, `sheets`
on extra sheets), evaluate every formula with Excel's `evaluate` on Sheet1 (the Mac
equivalent of Worksheet.Evaluate used by scripts/audit-0610/function_oracle.ps1), then
close the workbook without saving. Writes golden-mac/<golden-name>.json with the same
structure as tests/functions/golden-*.json.

Usage (from the repo root, through the heavy lock):
  /Volumes/Data/Worktrees/_lead/heavy-lock.sh <agent> -- \
    /Volumes/Data/Worktrees/_lead/venv-dev/bin/python tests/macos/oracle/excel_eval.py \
    tests/functions/cases-batch1-math.json [...] [--out-dir tests/macos/oracle/golden-mac]
  --dry-run prints the AppleScript instead of running it.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import oracle_common as oc  # noqa: E402

HERE = Path(__file__).resolve().parent
APP = "Microsoft Excel"

_ENCODER = r'''
on encScalar(r)
	set c to class of r
	if c is real then
		set hi to (r as text) as real
		return {"n", hi, r - hi}
	else if c is integer then
		return {"n", r, 0}
	else if c is boolean then
		return {"b", r}
	else if c is text or c is string or c is Unicode text then
		return {"s", r}
	else if r is missing value then
		return {"m"}
	end if
	return {"x", "unsupported class " & (c as text)}
end encScalar

on enc(r)
	tell application "Microsoft Excel"
		try
			if class of r is range then set r to value of r
		end try
	end tell
	if class of r is list then
		set out to {}
		repeat with rowItem in r
			set rowVal to contents of rowItem
			if class of rowVal is list then
				repeat with cellItem in rowVal
					set end of out to my encScalar(contents of cellItem)
				end repeat
			else
				set end of out to my encScalar(rowVal)
			end if
		end repeat
		return {"a", out}
	end if
	return my encScalar(r)
end enc

on evalOne(f, errProbe)
	tell application "Microsoft Excel"
		try
			with timeout of 60 seconds
				set r to evaluate name f
			end timeout
		on error msg number n
			return {"x", msg & " (" & n & ")"}
		end try
		try
			with timeout of 60 seconds
				set et to evaluate name errProbe
			end timeout
			if class of et is integer or class of et is real then return {"e", et as integer}
		end try
	end tell
	return my enc(r)
end evalOne
'''


def golden_name(cases_path: Path) -> str:
    return cases_path.name.replace("cases-", "golden-", 1)


def formula_text(item) -> str:
    return item if isinstance(item, str) else item["f"]


def error_probe(formula: str) -> str:
    body = formula.strip()
    if body.startswith("="):
        body = body[1:]
    return f"=ERROR.TYPE({body})"


def _cell_lines(var: str, cells: dict) -> list[str]:
    lines = []
    for ref, value in cells.items():
        if not re.fullmatch(r"[A-Z]{1,3}\d+", ref):
            raise ValueError(f"bad cell ref {ref!r}")
        rng = f'range "{ref}" of {var}'
        if isinstance(value, bool):
            lines.append(f"set value of {rng} to {'true' if value else 'false'}")
        elif isinstance(value, (int, float)):
            lines.append(f"set value of {rng} to {repr(float(value)) if isinstance(value, float) else value}")
        elif value is None or value == "":
            continue
        else:
            lines.append(f'set number format of {rng} to "@"')
            lines.append(f"set value of {rng} to {oc.as_string_literal(value)}")
    return lines


def build_script(spec: dict) -> str:
    formulas = [formula_text(item) for item in spec.get("formulas", [])]
    lines = [_ENCODER, 'tell application "Microsoft Excel"', "set wb to make new workbook",
             "set ws to worksheet 1 of wb", 'set name of ws to "Sheet1"']
    lines += _cell_lines("ws", spec.get("cells") or {})
    for index, (name, cells) in enumerate((spec.get("sheets") or {}).items()):
        var = f"ws{index + 2}"
        # A new workbook may already hold several default sheets: reuse them in order.
        lines.append(f"if (count of worksheets of wb) ≥ {index + 2} then")
        lines.append(f"set {var} to worksheet {index + 2} of wb")
        lines.append("else")
        lines.append(f"set {var} to make new worksheet at end of wb")
        lines.append("end if")
        lines.append(f"set name of {var} to {oc.as_string_literal(name)}")
        lines += _cell_lines(var, cells)
    lines.append("activate object ws")
    lines.append("end tell")
    lines.append("set results to {}")
    for f in formulas:
        lines.append(f"set end of results to my evalOne({oc.as_string_literal(f)}, {oc.as_string_literal(error_probe(f))})")
    lines.append('tell application "Microsoft Excel" to close wb saving no')
    lines.append("return results")
    return "\n".join(lines)


def decode_results(raw: list, spec: dict) -> list[dict]:
    items = spec.get("formulas", [])
    if len(raw) != len(items):
        raise ValueError(f"Excel returned {len(raw)} results for {len(items)} formulas")
    cases = []
    for item, encoded in zip(items, raw):
        decoded = oc.decode_cell(encoded)
        decoded = _cverr_to_error(decoded)
        case = {"formula": formula_text(item), "excel": decoded["value"], "type": decoded["type"]}
        if isinstance(item, dict) and item.get("tol"):
            case["tol"] = item["tol"]
        if isinstance(item, dict) and item.get("array"):
            case["array"] = True
        cases.append(case)
    return cases


def _cverr_to_error(decoded: dict) -> dict:
    """Some Excel builds hand error values back as COM CVErr integers."""
    if decoded["type"] == "number" and decoded["value"] in oc.CVERR_CODES:
        return {"type": "error", "value": oc.CVERR_CODES[int(decoded["value"])]}
    if decoded["type"] == "array":
        decoded = dict(decoded)
        decoded["value"] = [oc.CVERR_CODES.get(v, v) if isinstance(v, (int, float)) and not isinstance(v, bool) else v
                            for v in decoded["value"]]
    return decoded


def make_golden(spec: dict, cases: list[dict], version: str, seconds: float) -> dict:
    golden = {"generatedFrom": f"Excel for Mac {version} evaluate (tests/macos/oracle/excel_eval.py)",
              "measuredAt": oc.now_iso(), "seconds": round(seconds, 2), "cells": spec.get("cells") or {}}
    if spec.get("sheets"):
        golden["sheets"] = spec["sheets"]
    golden["cases"] = cases
    return golden


def run_file(cases_path: Path, out_dir: Path, timeout: float) -> dict:
    spec = json.loads(cases_path.read_text(encoding="utf-8"))
    script = build_script(spec)
    started = time.monotonic()
    stdout = oc.run_osascript(script, timeout=timeout)
    raw = oc.parse_applescript(stdout)
    cases = decode_results(raw, spec)
    seconds = time.monotonic() - started
    golden = make_golden(spec, cases, oc.office_version(APP), seconds)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / golden_name(cases_path)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return {"file": cases_path.name, "cases": len(cases), "seconds": round(seconds, 2), "out": str(out)}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("cases", nargs="+", type=Path)
    ap.add_argument("--out-dir", type=Path, default=HERE / "golden-mac")
    ap.add_argument("--timeout", type=float, default=900.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    if args.dry_run:
        for path in args.cases:
            print(build_script(json.loads(path.read_text(encoding="utf-8"))))
        return 0
    was_running = oc.app_is_running(APP)
    status = 0
    try:
        for path in args.cases:
            try:
                info = run_file(path, args.out_dir, args.timeout)
                print(f"OK {info['file']}: {info['cases']} cases in {info['seconds']}s -> {info['out']}", flush=True)
            except oc.OfficeBlocked as exc:
                print(f"BLOCKED {path.name}: {exc}", flush=True)
                status = 3
                if exc.code in (-1743, -1712):
                    break  # permission or app not answering: stop the Office part
            except (ValueError, json.JSONDecodeError) as exc:
                print(f"FAIL {path.name}: {exc}", flush=True)
                status = status or 1
    finally:
        oc.quit_if_launched(APP, was_running)
    return status


if __name__ == "__main__":
    sys.exit(main())
