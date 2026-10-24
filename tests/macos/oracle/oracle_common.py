"""Shared helpers for the Office-for-Mac oracle (ORACLE-1).

Only pure parsing helpers live at module level so unit tests run without Office.
`run_osascript` is the single place that talks to Office: it only ever targets
"Microsoft Word", "Microsoft Excel" or "Microsoft PowerPoint" (checked below).
No System Events, no keystrokes, no UI scripting, no control of 3T.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path

OFFICE_APPS = ("Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint")
FORBIDDEN_TARGETS = ("System Events", "cliclick", "keystroke", "key code", "3T Office", "VN Office")

# Office for Mac is sandboxed. Its own container (~/Library/Containers/com.microsoft.*/Data)
# is protected by macOS "App Data" privacy: writing there from a terminal raises a
# permission prompt (observed 24/10/2026: `mkdir` hung until killed). Office declares
# the `com.apple.security.assets.pictures.read-only` entitlement, so a read-only copy
# under ~/Pictures can be opened by Word/Excel/PowerPoint without "Grant File Access".
DEFAULT_STAGING = Path.home() / "Pictures" / "3t-oracle-staging"

ERROR_TYPE_CODES = {
    1: "#NULL!", 2: "#DIV/0!", 3: "#VALUE!", 4: "#REF!", 5: "#NAME?", 6: "#NUM!", 7: "#N/A",
    8: "#GETTING_DATA", 9: "#SPILL!", 10: "#CONNECT!", 11: "#BLOCKED!", 12: "#UNKNOWN!",
    13: "#FIELD!", 14: "#CALC!",
}
# Same table as scripts/audit-0610/function_oracle.ps1 (COM CVErr values).
CVERR_CODES = {
    -2146826281: "#DIV/0!", -2146826246: "#N/A", -2146826259: "#NAME?", -2146826288: "#NULL!",
    -2146826252: "#NUM!", -2146826265: "#REF!", -2146826273: "#VALUE!",
}


class OfficeBlocked(RuntimeError):
    """Office could not be driven (permission, timeout, app not answering)."""

    def __init__(self, message: str, code: int | None = None):
        super().__init__(message)
        self.code = code


# ---------------------------------------------------------------------------
# AppleScript source-form ("osascript -s s") parser
# ---------------------------------------------------------------------------

class _Missing:
    def __repr__(self) -> str:  # pragma: no cover - debug only
        return "missing value"


MISSING = _Missing()


def parse_applescript(text: str):
    """Parse the `osascript -s s` rendering of a result.

    Supports lists {..}, strings "..." (with backslash escapes), integers, reals
    (incl. 1.0E+20; `-s s` always prints a dot), true/false, missing value. Records are not
    produced by the oracle scripts and are rejected; unknown bare words become strings.
    """
    pos = 0
    s = text.strip()

    def ws():
        nonlocal pos
        while pos < len(s) and s[pos] in " \t\r\n":
            pos += 1

    def value():
        nonlocal pos
        ws()
        if pos >= len(s):
            raise ValueError("unexpected end of AppleScript value")
        ch = s[pos]
        if ch == "{":
            pos += 1
            items: list = []
            ws()
            if pos < len(s) and s[pos] == "}":
                pos += 1
                return items
            while True:
                items.append(value())
                ws()
                if pos < len(s) and s[pos] == ",":
                    pos += 1
                    continue
                if pos < len(s) and s[pos] == "}":
                    pos += 1
                    return items
                raise ValueError(f"bad list near {s[pos:pos + 20]!r}")
        if ch == '"':
            pos += 1
            out = []
            while pos < len(s):
                c = s[pos]
                if c == "\\" and pos + 1 < len(s):
                    nxt = s[pos + 1]
                    out.append({"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\"}.get(nxt, nxt))
                    pos += 2
                    continue
                if c == '"':
                    pos += 1
                    return "".join(out)
                out.append(c)
                pos += 1
            raise ValueError("unterminated string")
        for word, val in (("true", True), ("false", False), ("missing value", MISSING)):
            if s.startswith(word, pos):
                pos += len(word)
                return val
        m = re.match(r"-?\d+(?:\.\d+)?(?:E[+-]?\d+)?", s[pos:])
        if m:
            tok = m.group(0)
            pos += len(tok)
            if re.fullmatch(r"-?\d+", tok):
                return int(tok)
            return float(tok)
        m = re.match(r"[^,}]+", s[pos:])
        tok = m.group(0) if m else s[pos:]
        pos += len(tok)
        return tok.strip()

    result = value()
    ws()
    if pos != len(s):
        raise ValueError(f"trailing data: {s[pos:pos + 30]!r}")
    return result


def recombine_real(hi, residual) -> float:
    """AppleScript prints reals with 12 significant digits only.

    The scripts return each real r as {hi, r - hi} where hi = (r as text) as real; hi is
    exactly representable by its 12-digit print, and r - hi is exact (Sterbenz), so the
    sum restores r to full double precision.
    """
    return float(hi) + float(residual)


def decode_cell(item) -> dict:
    """Decode one evaluated item produced by excel_eval's AppleScript.

    Item shapes: {"n", hi, res} number · {"s", text} · {"b", bool} · {"e", code} (ERROR.TYPE
    code) · {"v", cverr} (raw COM-style error int) · {"a", [items...]} array ·
    {"x", message} exception · {"m"} missing value.
    Returns {"type": ..., "value": ...} with the same vocabulary as golden-*.json.
    """
    tag = item[0]
    if tag == "n":
        return {"type": "number", "value": recombine_real(item[1], item[2])}
    if tag == "s":
        return {"type": "string", "value": item[1]}
    if tag == "b":
        return {"type": "boolean", "value": bool(item[1])}
    if tag == "e":
        code = int(item[1])
        return {"type": "error", "value": ERROR_TYPE_CODES.get(code, f"#ERR{code}")}
    if tag == "v":
        code = int(item[1])
        return {"type": "error", "value": CVERR_CODES.get(code, f"#ERR{code}")}
    if tag == "a":
        flat = []
        for sub in item[1]:
            d = decode_cell(sub)
            flat.append(d["value"])
        return {"type": "array", "value": flat}
    if tag == "x":
        return {"type": "exception", "value": str(item[1])}
    if tag == "m":
        return {"type": "other", "value": "missing value"}
    return {"type": "other", "value": repr(item)}


def as_string_literal(text: str) -> str:
    """Quote a Python string as an AppleScript string literal."""
    return '"' + str(text).replace("\\", "\\\\").replace('"', '\\"') + '"'


def classify_osascript_error(stderr: str) -> tuple[str, int | None]:
    m = re.search(r"\((-?\d+)\)\s*$", stderr.strip())
    code = int(m.group(1)) if m else None
    if code == -1743:
        return "not-authorized", code
    if code == -1712:
        return "timeout", code
    if code in (-600, -609):
        return "app-not-running", code
    return "error", code


def assert_office_only(script: str) -> None:
    targets = re.findall(r'tell application "([^"]+)"', script)
    if not targets or any(t not in OFFICE_APPS for t in targets):
        raise ValueError(f"osascript may only target {OFFICE_APPS}; got {targets}")
    lowered = script.lower()
    for bad in FORBIDDEN_TARGETS:
        if bad.lower() in lowered:
            raise ValueError(f"forbidden automation token in script: {bad}")


def run_osascript(script: str, timeout: float = 600.0) -> str:
    """Run an AppleScript that only targets an Office app; return stdout (-s s form)."""
    assert_office_only(script)
    try:
        proc = subprocess.run(["osascript", "-s", "s", "-"], input=script, capture_output=True,
                              text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise OfficeBlocked(f"osascript timed out after {timeout:.0f}s") from exc
    if proc.returncode != 0:
        kind, code = classify_osascript_error(proc.stderr)
        raise OfficeBlocked(f"{kind}: {proc.stderr.strip()}", code)
    return proc.stdout


def app_is_running(app: str) -> bool:
    exe = f"/Applications/{app}.app/Contents/MacOS/{app}"
    out = subprocess.run(["pgrep", "-f", exe], capture_output=True, text=True)
    return bool(out.stdout.strip())


def quit_if_launched(app: str, was_running: bool) -> None:
    """Quit an Office app only when this run launched it (never the user's session)."""
    if was_running or not app_is_running(app):
        return
    try:
        run_osascript(f'tell application "{app}" to quit saving no', timeout=60)
    except OfficeBlocked:
        pass  # reported by caller through the per-file results; never kill by name


def stage_copy(src: Path, staging: Path = DEFAULT_STAGING) -> Path:
    """Copy a source file into the read-only-accessible staging dir (never the original)."""
    staging.mkdir(parents=True, exist_ok=True)
    dest = staging / f"{uuid.uuid4().hex[:8]}-{src.name}"
    shutil.copy2(src, dest)
    os.chmod(dest, 0o444)
    return dest


def unstage(path: Path) -> None:
    try:
        os.chmod(path, 0o644)
        path.unlink()
    except OSError:
        pass


def office_version(app: str) -> str:
    plist = Path(f"/Applications/{app}.app/Contents/Info.plist")
    try:
        import plistlib
        return plistlib.loads(plist.read_bytes()).get("CFBundleShortVersionString", "?")
    except Exception:
        return "?"


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")
