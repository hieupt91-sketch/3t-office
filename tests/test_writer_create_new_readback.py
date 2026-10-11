import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
READBACK = ROOT / "scripts" / "layout-audit" / "_word_readback.ps1"
CREATE_HARNESS = ROOT / "scripts" / "layout-audit" / "_create_new_writer.py"


class WriterCreateNewReadbackTests(unittest.TestCase):
    def test_browser_scenario_defines_its_inline_image_payload(self):
        source = CREATE_HARNESS.read_text(encoding="utf-8")
        scenario = source.split('SCENARIO = r"""', 1)[1].split('"""', 1)[0]
        self.assertIn("const PNG_1X1_RED =", scenario)

    @unittest.skipUnless(sys.platform == "win32", "requires PowerShell and Microsoft Word COM automation")
    def test_word_com_values_are_normalized_before_comparison(self):
        completed = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(READBACK),
                "-SelfTest",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("SELFTEST=PASS", completed.stdout)


if __name__ == "__main__":
    unittest.main()
