from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNTIME_REQUIREMENTS = ROOT / "ports/macos/requirements-runtime.txt"
VALIDATOR = ROOT / "ports/macos/scripts/validate-encryption-runtime.py"


def test_macos_runtime_reuses_root_requirements() -> None:
    lines = [
        line.strip()
        for line in RUNTIME_REQUIREMENTS.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    assert lines == ["-r ../../requirements.txt"]
    root_requirements = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    assert "cryptography>=" in root_requirements


def test_encryption_validator_runs_with_packaged_dependency_contract() -> None:
    completed = subprocess.run(
        [sys.executable, str(VALIDATOR), "--app-root", str(ROOT)],
        text=True,
        capture_output=True,
        check=False,
    )
    combined = completed.stdout + completed.stderr
    assert completed.returncode == 0, combined
    assert "OOXML Agile AES-256 encrypt/decrypt runtime round-trip" in combined
