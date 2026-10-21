"""Regression coverage for stable, clean seed-profile packaging."""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "release" / "build-seed-profiles.py"
SPEC = importlib.util.spec_from_file_location("build_seed_profiles", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def test_seed_copy_ignore_filters_transient_and_backup_paths():
    names = [
        "registrymodifications.xcu.tmp",
        ".~lock.settings#",
        "profile.lock",
        "prefs.bak",
        "prefs.old",
        "backup",
        "temp",
        "cache",
        "keep.xcu",
    ]

    assert builder._seed_copy_ignore("profile/user", names) == set(names[:8])


def test_profile_copy_retries_and_cleans_destination(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    (source / "settings.xcu").write_text("valid", encoding="utf-8")
    destination = tmp_path / "destination"
    delays = []
    calls = 0

    def flaky_copy(src, dst, *, ignore):
        nonlocal calls
        calls += 1
        if calls < 3:
            Path(dst).mkdir(parents=True, exist_ok=True)
            (Path(dst) / "partial").write_text("partial", encoding="utf-8")
            raise FileNotFoundError(3, "profile entry disappeared", str(Path(src) / "user" / "registrymodifications.xcu.tmp"))
        return __import__("shutil").copytree(src, dst, ignore=ignore)

    builder._copy_profile(source, destination, copytree=flaky_copy, sleep=delays.append)

    assert calls == 3
    assert delays == [1, 1]
    assert (destination / "settings.xcu").read_text(encoding="utf-8") == "valid"
    assert not (destination / "partial").exists()


def test_profile_copy_reports_all_failed_paths_after_five_attempts(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    destination = tmp_path / "destination"
    calls = []

    def always_missing(src, dst, *, ignore):
        calls.append(src)
        raise FileNotFoundError(3, "path disappeared", str(Path(src) / "user" / "missing.tmp"))

    with pytest.raises(RuntimeError, match="after 5 attempts") as error:
        builder._copy_profile(source, destination, copytree=always_missing, sleep=lambda _: None)

    assert len(calls) == 5
    assert str(source / "user" / "missing.tmp") in str(error.value)
    assert "attempt 5" in str(error.value)


def test_profile_copy_reports_shutil_error_source_and_destination(tmp_path):
    source = tmp_path / "source"
    destination = tmp_path / "destination"
    source.mkdir()
    missing_source = source / "cache" / "transient.bin"
    missing_destination = destination / "cache" / "transient.bin"

    def copy_with_disappearing_file(src, dst, *, ignore):
        raise __import__("shutil").Error([
            (str(missing_source), str(missing_destination), "[WinError 3] path disappeared")
        ])

    with pytest.raises(RuntimeError) as error:
        builder._copy_profile(source, destination, copytree=copy_with_disappearing_file, sleep=lambda _: None)

    message = str(error.value)
    assert str(missing_source) in message
    assert str(missing_destination) in message
    assert "WinError 3" in message


def test_process_lookup_matches_only_the_requested_profile(monkeypatch, tmp_path):
    profile = tmp_path / "lo-profile-writer"
    matching = f'"soffice.exe" -env:UserInstallation="{profile.as_uri()}"'
    monkeypatch.setattr(builder.os, "name", "nt")
    monkeypatch.setattr(
        builder.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args[0], 0,
            stdout=(
                '[{"ProcessId":42,"CommandLine":' + __import__("json").dumps(matching) + '},'
                '{"ProcessId":43,"CommandLine":"soffice.exe -env:UserInstallation=file:///C:/other"}]'
            ),
            stderr="",
        ),
    )

    assert builder._processes_using_profile(profile) == [(42, matching)]


def test_profile_cleanup_terminates_only_matching_pid(monkeypatch, tmp_path):
    profile = tmp_path / "lo-profile-sheet"
    command = f"soffice.exe -env:UserInstallation={profile.as_uri()}"
    scans = iter([[(4242, command)], []])
    commands = []
    monkeypatch.setattr(builder, "_processes_using_profile", lambda _: next(scans))
    monkeypatch.setattr(
        builder.subprocess,
        "run",
        lambda args, **kwargs: commands.append(args) or subprocess.CompletedProcess(args, 0),
    )
    monkeypatch.setattr(builder.os, "name", "nt")

    builder._stop_profile_processes(profile, wait_seconds=1)

    assert commands == [["taskkill.exe", "/PID", "4242", "/F"]]


@pytest.mark.slow
def test_seed_profile_builds_with_installed_libreoffice(tmp_path):
    import main

    if not main.SOFFICE_PATH:
        pytest.skip("LibreOffice is not installed")
    output = tmp_path / "seed"
    completed = subprocess.run(
        [sys.executable, str(SCRIPT), str(output)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=240,
    )

    assert completed.returncode == 0, completed.stdout + "\n" + completed.stderr
    for kind in builder.APP_KINDS:
        profile = output / f"lo-profile-{kind}"
        assert profile.is_dir()
        assert any(path.is_file() for path in profile.rglob("*"))
        assert not any(
            path.name.casefold().endswith((".tmp", ".lock", ".bak", ".old"))
            or path.name.casefold() in {"backup", "temp", "temporary", "cache"}
            for path in profile.rglob("*")
        )
