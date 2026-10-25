"""MAC-12-RUNTIME: macOS runtime must ship hash-locked cryptography + pypdf."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from packaging.requirements import Requirement

ROOT = Path(__file__).resolve().parents[2]
MACOS = ROOT / "ports/macos"
LOCK = MACOS / "requirements-runtime-macos.lock"
CONSTRAINTS = MACOS / "requirements-xcode-run-constraints.txt"
INSTALLER = MACOS / "scripts/install-runtime-python-deps.sh"
PREPARE = MACOS / "scripts/prepare-xcode-run-payload.sh"
VALIDATOR = MACOS / "scripts/validate-encryption-runtime.py"


def _pins(text: str) -> dict[str, str]:
    return dict(re.findall(r"^([A-Za-z0-9_.-]+)==([^\s\\]+)", text, re.M))


def _lock_entries() -> list[str]:
    body = "\n".join(
        line for line in LOCK.read_text(encoding="utf-8").splitlines() if not line.startswith("#")
    )
    return [entry.strip() for entry in body.replace("\\\n", " ").split("\n") if entry.strip()]


def test_lock_pins_satisfy_root_requirements() -> None:
    pins = _pins(LOCK.read_text(encoding="utf-8"))
    for line in (ROOT / "requirements.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        requirement = Requirement(line)
        assert requirement.name in pins, f"lock thiếu {requirement.name}"
        assert requirement.specifier.contains(pins[requirement.name]), (
            requirement.name,
            pins[requirement.name],
        )


def test_every_lock_entry_is_exact_and_hashed() -> None:
    entries = _lock_entries()
    assert {entry.split("==")[0] for entry in entries} == {"cryptography", "cffi", "pycparser", "pypdf"}
    for entry in entries:
        assert re.match(r"^[A-Za-z0-9_.-]+==\S+ ", entry), entry
        assert re.search(r"--hash=sha256:[0-9a-f]{64}", entry), entry
    assert "/Users/" not in LOCK.read_text(encoding="utf-8")


def test_xcode_constraints_match_lock() -> None:
    lock = _pins(LOCK.read_text(encoding="utf-8"))
    constraints = _pins(CONSTRAINTS.read_text(encoding="utf-8"))
    assert constraints == {name: lock[name] for name in ("cryptography", "pypdf")}


def test_installer_is_offline_and_hash_checked() -> None:
    script = INSTALLER.read_text(encoding="utf-8")
    assert "--no-index" in script and "--find-links" in script
    assert "--require-hashes" in script and "--only-binary=:all:" in script
    assert "requirements-runtime-macos.lock" in script
    assert "validate-encryption-runtime.py" in script
    assert INSTALLER.stat().st_mode & 0o111
    prepare = PREPARE.read_text(encoding="utf-8")
    assert "install-runtime-python-deps.sh" in prepare
    assert "lock.sha256" in prepare


def test_validator_fails_clearly_when_runtime_lacks_both_modules() -> None:
    # -S -s: stdlib only, like a bundle that never got the packages installed.
    completed = subprocess.run(
        [sys.executable, "-S", "-s", str(VALIDATOR), "--app-root", str(ROOT)],
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode != 0
    output = completed.stdout + completed.stderr
    assert "FAIL: runtime Python thiếu mô-đun bắt buộc" in output
    assert "cryptography (" in output and "pypdf (" in output
    assert "install-runtime-python-deps.sh" in output
