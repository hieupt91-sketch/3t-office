import importlib.util
import plistlib
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "ports/macos/scripts/validate-release-pkg.py"
SPEC = importlib.util.spec_from_file_location("validate_release_pkg", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class ReleasePkgPayloadTests(unittest.TestCase):
    def make_payload(self, applications: Path) -> None:
        product = applications / "3T Office"
        for relative in (
            "Runtime/bin/python3",
            "LibreOffice.app/Contents/MacOS/soffice",
            "Versions/app-0.9.11/app/main.py",
            "Legal/COMPONENTS.txt",
            "PILOT-README.txt",
        ):
            path = product / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.touch()
        (product / "Versions/current").symlink_to("app-0.9.11")
        for name, (kind, bundle_id) in MODULE.EXPECTED_APPS.items():
            contents = product / name / "Contents"
            (contents / "MacOS").mkdir(parents=True)
            (contents / "MacOS" / name.removesuffix(".app")).touch()
            with (contents / "Info.plist").open("wb") as handle:
                plistlib.dump({"VNOfficeAppKind": kind, "CFBundleIdentifier": bundle_id}, handle)

    def test_valid_payload(self):
        with tempfile.TemporaryDirectory() as temp:
            applications = Path(temp)
            self.make_payload(applications)
            self.assertEqual([], MODULE.validate_payload(applications))

    def test_rejects_symlink_escaping_product(self):
        with tempfile.TemporaryDirectory() as temp:
            applications = Path(temp)
            self.make_payload(applications)
            (applications / "3T Office/Runtime/escape").symlink_to("/tmp")
            errors = MODULE.validate_payload(applications)
            self.assertTrue(any("symlink thoát product root" in error for error in errors), errors)

    def test_rejects_unexpected_application(self):
        with tempfile.TemporaryDirectory() as temp:
            applications = Path(temp)
            self.make_payload(applications)
            (applications / "Other.app").mkdir()
            errors = MODULE.validate_payload(applications)
            self.assertTrue(any("allowlist" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
