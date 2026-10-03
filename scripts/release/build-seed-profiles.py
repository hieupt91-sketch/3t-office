"""Build the pre-warmed LibreOffice profiles shipped in app\\seed (one per app kind).

A LibreOffice profile created from nothing costs ~12 s on the first document open
(measured 15 s fresh vs 3.3 s with an existing profile). main._seed_profile_dir copies
these ~1 MB profiles on the first launch so new installs skip that penalty.

Usage: python build-seed-profiles.py <output_dir>
The profiles are produced in a throw-away LOCALAPPDATA, so no user data is involved.
"""
from __future__ import annotations

import importlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
APP_KINDS = ("writer", "sheet", "slides")


def _drop_locks(profile: Path) -> None:
    for lock in list(profile.rglob(".lock")) + list(profile.rglob("*.lock")):
        lock.unlink(missing_ok=True)


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
        for kind in APP_KINDS:
            profile_uri = app_main._profile_uri(kind)
            if kind in ("writer", "sheet"):
                app_main._warmup_persistent_filter(kind)
            else:
                subprocess.run(
                    [app_main.SOFFICE_PATH, "--headless", "--invisible", "--nologo", "--norestore",
                     "--nolockcheck", "--terminate_after_init", f"-env:UserInstallation={profile_uri}"],
                    check=True, timeout=180, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            profile = app_main._user_data_dir() / f"lo-profile-{kind}"
            _drop_locks(profile)
            shutil.copytree(profile, out_dir / f"lo-profile-{kind}")
            size = sum(f.stat().st_size for f in (out_dir / f"lo-profile-{kind}").rglob("*") if f.is_file())
            print(f"seed lo-profile-{kind}: {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
