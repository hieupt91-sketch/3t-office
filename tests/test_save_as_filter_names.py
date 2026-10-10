import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class SaveAsFilterNamesAreValidForPywebview(unittest.TestCase):
    """pywebview rejects filter names containing characters like '-' ("97-2003"): Save As then fails to open."""

    def test_all_file_type_filters_pass_pywebview_parser(self):
        import main
        from webview.util import parse_file_type

        groups = list(main.SAVE_FILE_TYPES.values()) + list(main.OPEN_FILE_TYPES.values())
        checked = 0
        for group in groups:
            for file_type in group:
                with self.subTest(file_type=file_type):
                    parse_file_type(file_type)
                checked += 1
        self.assertGreater(checked, 10)


if __name__ == "__main__":
    unittest.main()