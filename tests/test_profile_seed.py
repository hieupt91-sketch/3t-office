"""First-launch LibreOffice profile seeding (saves ~12 s of the first document open)."""

import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import main


def _make_seed(root: Path, kind: str, deep: bool = False) -> None:
    profile = root / "seed" / f"lo-profile-{kind}" / "user"
    profile.mkdir(parents=True)
    (profile / "registrymodifications.xcu").write_text("<xcu/>", encoding="utf-8")
    (root / "seed" / f"lo-profile-{kind}" / ".vnoffice-open-filters-warm-v1").write_text("warm", encoding="utf-8")
    if deep:
        nested = profile
        for index in range(12):
            nested = nested / f"nested-directory-with-a-long-name-{index:02d}"
        # The fixture itself passes MAX_PATH, so create it through the extended-length prefix.
        extended = Path("\\\\?\\" + str(nested)) if os.name == "nt" else nested
        extended.mkdir(parents=True)
        (extended / "leaf.txt").write_text("deep", encoding="utf-8")


class ProfileSeedTests(unittest.TestCase):
    def test_first_launch_copies_seed_including_warm_marker(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
            _make_seed(Path(root), "sheet")
            with patch.object(main, "ROOT_DIR", root), patch.object(main, "_user_data_dir", return_value=Path(data)):
                uri = main._profile_uri("sheet")
            profile = Path(data) / "lo-profile-sheet"
            self.assertTrue(uri.endswith("lo-profile-sheet"))
            self.assertTrue((profile / "user" / "registrymodifications.xcu").is_file())
            self.assertTrue((profile / ".vnoffice-open-filters-warm-v1").is_file())
            self.assertFalse((Path(data) / "lo-profile-sheet.seeding").exists())

    def test_existing_profile_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
            _make_seed(Path(root), "sheet")
            existing = Path(data) / "lo-profile-sheet"
            existing.mkdir()
            (existing / "mine.txt").write_text("keep", encoding="utf-8")
            with patch.object(main, "ROOT_DIR", root), patch.object(main, "_user_data_dir", return_value=Path(data)):
                main._profile_uri("sheet")
            self.assertEqual((existing / "mine.txt").read_text(encoding="utf-8"), "keep")
            self.assertFalse((existing / "user").exists())

    def test_missing_seed_falls_back_to_empty_profile(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
            with patch.object(main, "ROOT_DIR", root), patch.object(main, "_user_data_dir", return_value=Path(data)):
                main._profile_uri("writer")
            profile = Path(data) / "lo-profile-writer"
            self.assertTrue(profile.is_dir())
            self.assertEqual(list(profile.iterdir()), [])

    def test_copy_failure_leaves_no_partial_profile_and_still_returns_uri(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as data:
            _make_seed(Path(root), "slides")
            with patch.object(main, "ROOT_DIR", root), patch.object(main, "_user_data_dir", return_value=Path(data)), \
                    patch.object(main.shutil, "copytree", side_effect=OSError("disk full")):
                uri = main._profile_uri("slides")
            self.assertTrue(uri.endswith("lo-profile-slides"))
            self.assertEqual(list((Path(data) / "lo-profile-slides").iterdir()), [])
            self.assertFalse((Path(data) / "lo-profile-slides.seeding").exists())

    def test_deeply_nested_seed_is_copied(self):
        root, data = tempfile.mkdtemp(), tempfile.mkdtemp()
        prefix = "\\\\?\\" if os.name == "nt" else ""
        try:
            _make_seed(Path(root), "writer", deep=True)
            with patch.object(main, "ROOT_DIR", root), patch.object(main, "_user_data_dir", return_value=Path(data)):
                main._profile_uri("writer")
            base = Path(prefix + str(Path(data) / "lo-profile-writer"))
            self.assertEqual(len(list(base.rglob("leaf.txt"))), 1)
        finally:
            # tempfile's own cleanup cannot remove paths beyond MAX_PATH.
            for folder in (root, data):
                shutil.rmtree(prefix + folder, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
