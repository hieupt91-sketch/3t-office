"""Local-only sample selection and copying for CH-5 LAN audits."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

DEFAULT_SHARE_ROOT = r"\\192.168.1.252\company1"


def find_share_files(share_root: str | os.PathLike[str], suffix: str, limit: int | None = None) -> list[Path]:
    suffix = suffix.lower()
    found: list[Path] = []
    for current, directories, files in os.walk(share_root, topdown=True, followlinks=False):
        directories[:] = sorted(
            directory for directory in directories
            if directory.lower() not in {"system volume information", "$recycle.bin"}
        )
        for name in sorted(files, key=str.casefold):
            if name.startswith("~$") or Path(name).suffix.lower() != suffix:
                continue
            found.append(Path(current) / name)
            if limit is not None and len(found) >= limit:
                return found
    return found


def copy_share_samples(
    share_root: str | os.PathLike[str],
    suffix: str,
    destination: str | os.PathLike[str],
    limit: int,
    *,
    prefix: str | None = None,
) -> list[tuple[Path, Path]]:
    """Copy at most ``limit`` files to generated names; original names stay local."""
    output_dir = Path(destination)
    output_dir.mkdir(parents=True, exist_ok=True)
    sources = find_share_files(share_root, suffix, limit)
    copied: list[tuple[Path, Path]] = []
    stem = prefix or suffix.lower().lstrip(".")
    for index, source in enumerate(sources, 1):
        target = output_dir / f"{stem}-{index:03d}{suffix.lower()}"
        if target.exists():
            raise FileExistsError(f"Refusing to overwrite an existing local audit sample: {target}")
        shutil.copy2(source, target)
        copied.append((source, target))
    return copied
