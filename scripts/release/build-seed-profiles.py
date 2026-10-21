"""Build the pre-warmed LibreOffice profiles shipped in app\\seed (one per app kind).

A LibreOffice profile created from nothing costs ~12 s on the first document open
(measured 15 s fresh vs 3.3 s with an existing profile). main._seed_profile_dir copies
these ~1 MB profiles on the first launch so new installs skip that penalty.

Usage: python build-seed-profiles.py <output_dir>
The profiles are produced in a throw-away LOCALAPPDATA, so no user data is involved.
"""
from __future__ import annotations

import importlib
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import unquote

REPO = Path(__file__).resolve().parents[2]
APP_KINDS = ("writer", "sheet", "slides")
COPY_ATTEMPTS = 5
COPY_RETRY_DELAY_SECONDS = 1
PROFILE_PROCESS_WAIT_SECONDS = 30


def _seed_copy_ignore(_directory: str, names: list[str]) -> set[str]:
    """Skip transient lock, scratch and backup data while copying a profile."""
    ignored = set()
    for name in names:
        folded = name.casefold()
        if (
            folded.endswith((".tmp", ".lock", ".bak", ".old"))
            or folded.startswith(".~lock.")
            or folded in {"backup", "temp", "temporary", "cache"}
        ):
            ignored.add(name)
    return ignored


def _profile_path_tokens(profile: Path) -> set[str]:
    resolved = str(profile.resolve())
    return {
        resolved.replace("\\", "/").casefold(),
        unquote(resolved).replace("\\", "/").casefold(),
    }


def _processes_using_profile(profile: Path) -> list[tuple[int, str]]:
    """Return PIDs whose command line names this exact profile path."""
    if os.name == "nt":
        script = (
            "Get-CimInstance Win32_Process | "
            "Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
        )
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        rows = json.loads(result.stdout or "[]")
        if isinstance(rows, dict):
            rows = [rows]
    else:
        result = subprocess.run(
            ["ps", "-eo", "pid=,args="],
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        rows = []
        for line in result.stdout.splitlines():
            parts = line.strip().split(None, 1)
            if len(parts) == 2 and parts[0].isdigit():
                rows.append({"ProcessId": int(parts[0]), "CommandLine": parts[1]})

    tokens = _profile_path_tokens(profile)
    matches = []
    for row in rows:
        command_line = str(row.get("CommandLine") or "")
        normalized = unquote(command_line).replace("\\", "/").casefold()
        if any(token and token in normalized for token in tokens):
            try:
                matches.append((int(row["ProcessId"]), command_line))
            except (KeyError, TypeError, ValueError):
                continue
    return matches


def _stop_profile_processes(profile: Path, *, wait_seconds: float = PROFILE_PROCESS_WAIT_SECONDS) -> None:
    """Stop only processes whose command line uses profile, then wait for release."""
    deadline = time.monotonic() + wait_seconds
    stopped: set[int] = set()
    while True:
        processes = _processes_using_profile(profile)
        if not processes:
            return
        for pid, command_line in processes:
            if pid == os.getpid() or pid in stopped:
                continue
            if os.name == "nt":
                subprocess.run(
                    ["taskkill.exe", "/PID", str(pid), "/F"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            else:
                try:
                    os.kill(pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            stopped.add(pid)
        if time.monotonic() >= deadline:
            active = "; ".join(f"PID {pid}: {command}" for pid, command in processes)
            raise TimeoutError(
                f"Timed out waiting {wait_seconds:g}s for processes using {profile}: {active}"
            )
        time.sleep(min(0.25, max(0.01, deadline - time.monotonic())))


def _copy_profile(source: Path, destination: Path, *, copytree=None, sleep=None) -> None:
    """Copy one profile with transient-file filtering and bounded fresh retries."""
    copytree = copytree or shutil.copytree
    sleep = sleep or time.sleep
    failures = []
    for attempt in range(1, COPY_ATTEMPTS + 1):
        shutil.rmtree(destination, ignore_errors=True)
        try:
            copytree(source, destination, ignore=_seed_copy_ignore)
            return
        except OSError as error:
            details = []
            if isinstance(error, shutil.Error) and error.args and isinstance(error.args[0], list):
                details.extend(
                    f"source={source_path}; destination={target_path}; error={message}"
                    for source_path, target_path, message in error.args[0]
                )
            else:
                failed_path = getattr(error, "filename", None) or "unknown path"
                details.append(f"path={failed_path}; error={error}")
            failures.append(f"attempt {attempt}: {type(error).__name__}: {' | '.join(details)}")
            if attempt < COPY_ATTEMPTS:
                sleep(COPY_RETRY_DELAY_SECONDS)
    raise RuntimeError(
        f"Could not copy seed profile {source} to {destination} after {COPY_ATTEMPTS} attempts. "
        f"Failing paths: {' | '.join(failures)}"
    )


def _build_profile(app_main, kind: str, out_dir: Path) -> int:
    app_main._warmup_persistent_filter(kind)
    profile = app_main._user_data_dir() / f"lo-profile-{kind}"
    _stop_profile_processes(profile)
    _copy_profile(profile, out_dir / f"lo-profile-{kind}")
    output = out_dir / f"lo-profile-{kind}"
    size = sum(file.stat().st_size for file in output.rglob("*") if file.is_file())
    count = sum(1 for file in output.rglob("*") if file.is_file())
    print(f"seed lo-profile-{kind}: {size / 1024:.0f} KB ({count} files)")
    return count


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    out_dir = Path(argv[1]).resolve()
    with tempfile.TemporaryDirectory(prefix="vno-seed-") as temp:
        os.environ["LOCALAPPDATA"] = temp
        sys.path.insert(0, str(REPO))
        app_main = importlib.import_module("main")
        if not app_main.SOFFICE_PATH:
            print("LibreOffice engine not found; cannot build seed profiles.", file=sys.stderr)
            return 1
        shutil.rmtree(out_dir, ignore_errors=True)
        out_dir.mkdir(parents=True)
        try:
            for kind in APP_KINDS:
                _build_profile(app_main, kind, out_dir)
        except (OSError, RuntimeError, TimeoutError, subprocess.SubprocessError) as error:
            print(f"Seed profile build failed: {error}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
